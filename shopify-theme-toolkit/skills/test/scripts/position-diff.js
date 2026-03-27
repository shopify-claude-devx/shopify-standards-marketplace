#!/usr/bin/env node
/**
 * position-diff.js — Compare rendered page elements against Figma reference values
 *
 * Uses Playwright to:
 *   1. Find every [data-figma-id] element
 *   2. Measure getBoundingClientRect() for position/size
 *   3. Measure getComputedStyle() for typography (TEXT nodes)
 *   4. Compare against figma-diff-reference.json
 *
 * Usage:
 *   node position-diff.js --url <preview-url> --feature <feature> [--mobile] [--password <pass>]
 *
 * Tolerances:
 *   Position (x/y): ±4px
 *   Size (w/h):     ±2px
 *   Font-size:      exact
 *   Font-weight:    exact
 *   Color:          ±5 per RGB channel
 *
 * Output:
 *   stdout → JSON summary
 *   .buildspace/artifacts/{feature}/diff-results-desktop.json (or -mobile.json)
 */

'use strict';

const { execSync } = require('node:child_process');
const { readFile, writeFile } = require('node:fs/promises');
const path = require('node:path');

const POSITION_TOLERANCE = 4; // px
const SIZE_TOLERANCE = 2;     // px
const COLOR_TOLERANCE = 5;    // per RGB channel

function log(msg) {
  console.error(`[position-diff] ${msg}`);
}

// ── Args ─────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };
  const url = get('--url');
  const feature = get('--feature');
  const password = get('--password');
  const mobile = args.includes('--mobile');

  if (!url || !feature) {
    console.error(
      'Usage: node position-diff.js --url <preview-url> --feature <feature> [--mobile] [--password <pass>]'
    );
    process.exit(1);
  }
  return { url, feature, mobile, password };
}

// ── Playwright install ────────────────────────────────────────────

function ensurePlaywright() {
  try {
    require.resolve('playwright');
    return;
  } catch {
    log('Playwright not found — installing...');
  }
  try {
    execSync('npm install playwright', { stdio: 'inherit' });
    execSync('npx playwright install chromium', { stdio: 'inherit' });
    log('Playwright installed');
  } catch (err) {
    throw new Error(`Failed to install Playwright: ${err.message}`);
  }
}

// ── Color helpers ─────────────────────────────────────────────────

function parseRGB(cssColor) {
  const m = cssColor.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]) };
}

function colorsClose(a, b) {
  const ca = parseRGB(a);
  const cb = parseRGB(b);
  if (!ca || !cb) return true; // can't compare — skip
  return (
    Math.abs(ca.r - cb.r) <= COLOR_TOLERANCE &&
    Math.abs(ca.g - cb.g) <= COLOR_TOLERANCE &&
    Math.abs(ca.b - cb.b) <= COLOR_TOLERANCE
  );
}

// ── Storefront password ───────────────────────────────────────────

async function handlePassword(page, password) {
  if (!password) return;
  try {
    const input = await page.$('input[type="password"]');
    if (input) {
      await input.fill(password);
      const btn = await page.$('button[type="submit"]');
      if (btn) {
        await btn.click();
        await page.waitForLoadState('networkidle');
      }
    }
  } catch {
    // No password page — continue
  }
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  const { url, feature, mobile, password } = parseArgs();

  ensurePlaywright();

  const base = path.resolve(`.buildspace/artifacts/${feature}`);

  // Read diff reference
  const refRaw = await readFile(path.join(base, 'figma-diff-reference.json'), 'utf-8').catch(() => {
    throw new Error('figma-diff-reference.json not found. Run parse-figma.js first.');
  });
  let diffRef;
  try {
    diffRef = JSON.parse(refRaw);
  } catch (err) {
    throw new Error(`figma-diff-reference.json is not valid JSON: ${err.message}. Re-run parse-figma.js.`);
  }
  if (!diffRef || typeof diffRef.nodes !== 'object') {
    throw new Error(
      'figma-diff-reference.json has unexpected structure (missing "nodes" object). ' +
      'Re-run parse-figma.js to regenerate it.'
    );
  }

  // Read viewport config
  const sectionsRaw = await readFile(path.join(base, 'figma-sections.json'), 'utf-8').catch(() => {
    throw new Error('figma-sections.json not found. Run fetch-figma.js first.');
  });
  let sections;
  try {
    sections = JSON.parse(sectionsRaw);
  } catch (err) {
    throw new Error(`figma-sections.json is not valid JSON: ${err.message}. Re-run fetch-figma.js.`);
  }

  const viewport = mobile
    ? { width: sections.mobileWidth || 390, height: 900 }
    : { width: 1440, height: 900 };

  log(`Mode: ${mobile ? 'mobile' : 'desktop'} — viewport ${viewport.width}x${viewport.height}`);

  const { chromium } = require('playwright');
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    throw new Error(
      `Failed to launch Chromium: ${err.message}\n` +
      `Run: npx playwright install chromium`
    );
  }

  const results = [];

  try {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    log(`Loading ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    } catch (err) {
      if (err.message.includes('net::ERR_CONNECTION_REFUSED') || err.message.includes('ECONNREFUSED')) {
        throw new Error(
          `Cannot connect to ${url}.\n` +
          `Ensure the Shopify dev server is running: shopify theme dev`
        );
      }
      throw new Error(`Page navigation failed: ${err.message}`);
    }
    await handlePassword(page, password);

    // Wait for images
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map((img) => new Promise((r) => { img.onload = r; img.onerror = r; }))
      )
    );

    // Find section wrapper
    const sectionHandle = page.locator('[data-figma-section]').first();
    const sectionBox = await sectionHandle.boundingBox().catch(() => null);

    if (!sectionBox) {
      throw new Error(
        'No [data-figma-section] element found on the page. ' +
        'Ensure the section wrapper has data-figma-section="{nodeId}" in Liquid.'
      );
    }
    log(`Section found: x=${Math.round(sectionBox.x)} y=${Math.round(sectionBox.y)} w=${Math.round(sectionBox.width)} h=${Math.round(sectionBox.height)}`);

    // Collect all data-figma-id elements
    const elements = await page.locator('[data-figma-id]').all();
    log(`Found ${elements.length} [data-figma-id] element(s)`);

    if (elements.length === 0) {
      throw new Error(
        'No [data-figma-id] elements found. ' +
        'Every rendered element must have data-figma-id="{nodeId}" in Liquid.'
      );
    }

    for (const el of elements) {
      const nodeId = await el.getAttribute('data-figma-id');
      const ref = diffRef.nodes[nodeId];

      if (!ref) {
        results.push({ nodeId, status: 'SKIP', reason: 'No reference entry for this node ID in figma-diff-reference.json' });
        continue;
      }

      const box = await el.boundingBox().catch(() => null);
      const failures = [];

      // ── Position / size diff ───────────────────────────────────
      if (box && ref.relativeBounds) {
        const rX = Math.round(box.x - sectionBox.x);
        const rY = Math.round(box.y - sectionBox.y);
        const rW = Math.round(box.width);
        const rH = Math.round(box.height);

        const { x: fX, y: fY, width: fW, height: fH } = ref.relativeBounds;

        const xOff = Math.abs(rX - fX);
        const yOff = Math.abs(rY - fY);
        const wOff = Math.abs(rW - fW);
        const hOff = Math.abs(rH - fH);

        if (xOff > POSITION_TOLERANCE) failures.push(`x: browser=${rX}px figma=${fX}px (off by ${xOff}px)`);
        if (yOff > POSITION_TOLERANCE) failures.push(`y: browser=${rY}px figma=${fY}px (off by ${yOff}px)`);
        if (wOff > SIZE_TOLERANCE) failures.push(`width: browser=${rW}px figma=${fW}px (off by ${wOff}px)`);
        if (hOff > SIZE_TOLERANCE) failures.push(`height: browser=${rH}px figma=${fH}px (off by ${hOff}px)`);
      }

      // ── Typography diff (TEXT nodes only) ─────────────────────
      if (ref.type === 'TEXT' && ref.typography) {
        const computed = await el.evaluate((el) => {
          const s = window.getComputedStyle(el);
          return { fontSize: s.fontSize, fontWeight: s.fontWeight, color: s.color };
        }).catch(() => null);

        if (computed) {
          if (computed.fontSize !== ref.typography.fontSize) {
            failures.push(`font-size: browser=${computed.fontSize} figma=${ref.typography.fontSize}`);
          }
          if (computed.fontWeight !== ref.typography.fontWeight) {
            failures.push(`font-weight: browser=${computed.fontWeight} figma=${ref.typography.fontWeight}`);
          }
          if (!colorsClose(computed.color, ref.typography.color)) {
            failures.push(`color: browser=${computed.color} figma=${ref.typography.color}`);
          }
        }
      }

      const selector = ref.selector || `[data-figma-id="${nodeId}"]`;

      if (failures.length === 0) {
        results.push({ nodeId, selector, status: 'PASS' });
        log(`✅ [${nodeId}] ${selector}`);
      } else {
        results.push({ nodeId, selector, status: 'FAIL', failures });
        log(`✗  [${nodeId}] ${selector}`);
        for (const f of failures) log(`      → ${f}`);
      }
    }
  } finally {
    await browser.close();
  }

  // ── Write results ─────────────────────────────────────────────
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;

  const output = {
    feature,
    mode: mobile ? 'mobile' : 'desktop',
    viewport,
    url,
    timestamp: new Date().toISOString(),
    total: results.length,
    passed,
    failed,
    skipped,
    results,
  };

  const suffix = mobile ? 'mobile' : 'desktop';
  const outFile = path.join(base, `diff-results-${suffix}.json`);
  await writeFile(outFile, JSON.stringify(output, null, 2));

  log(`\nResult: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  log(`Saved: diff-results-${suffix}.json`);

  console.log(JSON.stringify(output));

  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`[position-diff] Fatal: ${err.message}`);
  process.exit(1);
});
