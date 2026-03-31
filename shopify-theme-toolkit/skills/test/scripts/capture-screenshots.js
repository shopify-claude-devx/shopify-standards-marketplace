#!/usr/bin/env node
/**
 * capture-screenshots.js — Capture page screenshots for visual validation
 *
 * Uses Playwright to screenshot the live Shopify preview.
 * Mobile viewport defaults to 390px.
 *
 * Usage:
 *   node capture-screenshots.js --url <preview-url> --feature <feature> [--selectors <file>] [--password <pass>]
 *
 * Output (.buildspace/artifacts/{feature}/screenshots/):
 *   code-desktop.png        — full-page desktop screenshot
 *   code-mobile.png         — full-page mobile screenshot
 *   code-{name}-desktop.png — section screenshot (if --selectors provided)
 *   code-{name}-mobile.png
 */

'use strict';

const { execSync } = require('node:child_process');
const { mkdir, readFile, writeFile } = require('node:fs/promises');
const path = require('node:path');

const WAIT_OPTIONS = { waitUntil: 'domcontentloaded', timeout: 60000 };

// ── Args ─────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };
  const url = get('--url');
  const feature = get('--feature');
  if (!url || !feature) {
    console.error(
      'Usage: capture-screenshots.js --url <preview-url> --feature <feature> [--selectors <file>] [--password <pass>]'
    );
    process.exit(1);
  }
  return {
    url,
    feature,
    selectorsFile: get('--selectors'),
    password: get('--password'),
  };
}

// ── Playwright install ────────────────────────────────────────────

function ensurePlaywright() {
  try {
    require.resolve('playwright');
    return;
  } catch {
    console.error('[capture] Playwright not found — installing...');
  }
  execSync('npm install playwright', { stdio: 'inherit' });
  execSync('npx playwright install chromium', { stdio: 'inherit' });
  console.error('[capture] Playwright installed');
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
        await page.waitForLoadState('domcontentloaded');
      }
    }
  } catch {
    // No password page — continue
  }
}

// ── Wait for images ───────────────────────────────────────────────

async function waitForImages(page) {
  await page.evaluate(() =>
    Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map((img) => new Promise((r) => { img.onload = r; img.onerror = r; }))
    )
  );
}

// ── Full-page screenshots ─────────────────────────────────────────

async function captureFullPage(page, url, outputDir, viewports, password) {
  const results = [];
  for (const { name, width, height } of viewports) {
    await page.setViewportSize({ width, height });
    await page.goto(url, WAIT_OPTIONS);
    await handlePassword(page, password);
    await waitForImages(page);

    const filename = `code-${name}.png`;
    const filepath = path.join(outputDir, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    results.push({ viewport: name, filename, status: 'CAPTURED' });
    console.error(`[capture] ${name}: saved ${filename}`);
  }
  return results;
}

// ── Section screenshots ───────────────────────────────────────────

async function captureSections(page, url, selectors, outputDir, viewports, password) {
  const results = [];
  for (const { name: vpName, width, height } of viewports) {
    await page.setViewportSize({ width, height });
    await page.goto(url, WAIT_OPTIONS);
    await handlePassword(page, password);
    await waitForImages(page);

    for (const { name, selector } of selectors) {
      try {
        const el = page.locator(selector);
        const visible = await el.isVisible();
        if (!visible) {
          console.error(`[capture] ${vpName}/${name}: not visible — skipped`);
          results.push({ viewport: vpName, name, status: 'NOT_VISIBLE' });
          continue;
        }
        const filename = `code-${name}-${vpName}.png`;
        const filepath = path.join(outputDir, filename);
        await el.screenshot({ path: filepath });
        results.push({ viewport: vpName, name, filename, status: 'CAPTURED' });
        console.error(`[capture] ${vpName}/${name}: saved ${filename}`);
      } catch (err) {
        console.error(`[capture] ${vpName}/${name}: FAILED — ${err.message}`);
        results.push({ viewport: vpName, name, status: 'FAILED', error: err.message });
      }
    }
  }
  return results;
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  const { url, feature, selectorsFile, password } = parseArgs();

  ensurePlaywright();

  const base = path.resolve(`.buildspace/artifacts/${feature}`);
  const outputDir = path.join(base, 'screenshots');
  await mkdir(outputDir, { recursive: true });

  const mobileWidth = 390;

  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: mobileWidth, height: 900 },
  ];

  let selectors = null;
  if (selectorsFile) {
    const raw = await readFile(selectorsFile, 'utf-8');
    selectors = JSON.parse(raw);
  }

  console.error(`[capture] URL: ${url}`);
  console.error(`[capture] Feature: ${feature}`);
  console.error(`[capture] Mobile width: ${mobileWidth}px`);
  console.error(`[capture] Mode: ${selectors ? 'section-level' : 'full-page'}`);

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

  let results;
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    if (selectors && selectors.length > 0) {
      results = await captureSections(page, url, selectors, outputDir, viewports, password);
    } else {
      results = await captureFullPage(page, url, outputDir, viewports, password);
    }
  } finally {
    await browser.close();
  }

  const manifest = {
    feature,
    url,
    mobileWidth,
    timestamp: new Date().toISOString(),
    mode: selectors ? 'section-level' : 'full-page',
    results,
  };

  await writeFile(path.join(outputDir, 'capture-manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest));
}

main().catch((err) => {
  console.error(`[capture] Fatal: ${err.message}`);
  process.exit(1);
});
