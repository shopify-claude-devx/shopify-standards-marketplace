#!/usr/bin/env node
/**
 * capture-sections.js
 *
 * Usage:
 *   node capture-sections.js \
 *     --url "<preview-url>" --feature "<feature-name>" \
 *     --selectors "<path-to-selectors.json>" [--password "<storefront-password>"]
 *
 * Selectors file format:
 *   [{ "name": "hero", "selector": ".hero-banner" }]
 *
 * Output (.buildspace/artifacts/{feature}/screenshots/):
 *   code-{name}-desktop.png, code-{name}-mobile.png, capture-manifest.json
 */

'use strict';

const { execSync } = require('node:child_process');
const { mkdir, readFile, writeFile } = require('node:fs/promises');
const path = require('node:path');

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const NAV_OPTIONS = { waitUntil: 'networkidle', timeout: 30000 };

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
  };

  const url = get('--url');
  const feature = get('--feature');
  const selectorsFile = get('--selectors');
  const password = get('--password');

  if (!url || !feature || !selectorsFile) {
    console.error(
      'Usage: capture-sections.js --url <url> --feature <name> --selectors <file> [--password <pass>]\n' +
      '  --url        (required) Shopify preview URL\n' +
      '  --feature    (required) Feature name\n' +
      '  --selectors  (required) Path to selectors.json\n' +
      '  --password   (optional) Storefront password'
    );
    process.exit(1);
  }

  return { url, feature, selectorsFile, password };
}

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
    // No password page
  }
}

async function waitForImages(page) {
  await page.evaluate(() =>
    Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map((img) => new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        }))
    )
  );
}

async function waitForAnimations(page) {
  await page.evaluate(() =>
    new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );
}

async function captureSection(page, section, viewport, outputDir) {
  const { name, selector } = section;
  const { name: vpName, width, height } = viewport;

  await page.setViewportSize({ width, height });
  await waitForAnimations(page);

  const locator = page.locator(selector).first();

  const count = await locator.count();
  if (count === 0) {
    return {
      section: name,
      viewport: vpName,
      status: 'NOT_FOUND',
      error: `Selector "${selector}" not found on page`,
    };
  }

  const visible = await locator.isVisible();
  if (!visible) {
    return {
      section: name,
      viewport: vpName,
      status: 'NOT_VISIBLE',
      error: `Selector "${selector}" exists but is not visible`,
    };
  }

  await locator.scrollIntoViewIfNeeded();
  await waitForAnimations(page);

  const filename = `code-${name}-${vpName}.png`;
  const filepath = path.join(outputDir, filename);

  await locator.screenshot({
    path: filepath,
    animations: 'disabled',
  });

  return {
    section: name,
    viewport: vpName,
    status: 'CAPTURED',
    filename,
    path: path.relative('.', filepath),
  };
}

async function main() {
  const { url, feature, selectorsFile, password } = parseArgs();

  let selectors;
  try {
    const raw = await readFile(selectorsFile, 'utf-8');
    selectors = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Could not read selectors file: ${err.message}`);
  }

  if (!Array.isArray(selectors) || selectors.length === 0) {
    throw new Error('Selectors file is empty or not an array');
  }

  for (const s of selectors) {
    if (!s.name || !s.selector) {
      throw new Error(`Invalid selector entry: ${JSON.stringify(s)} — needs "name" and "selector"`);
    }
  }

  ensurePlaywright();

  const outputDir = path.resolve(`.buildspace/artifacts/${feature}/screenshots`);
  await mkdir(outputDir, { recursive: true });

  console.error(`[capture] URL: ${url}`);
  console.error(`[capture] Feature: ${feature}`);
  console.error(`[capture] Sections: ${selectors.map((s) => s.name).join(', ')}`);
  console.error(`[capture] Viewports: ${VIEWPORTS.map((v) => `${v.name} (${v.width}px)`).join(', ')}`);

  const { chromium } = require('playwright');
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    throw new Error(
      `Failed to launch Chromium: ${err.message}\nRun: npx playwright install chromium`
    );
  }

  const results = [];

  try {
    const context = await browser.newContext({
      viewport: VIEWPORTS[0],
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    await page.goto(url, NAV_OPTIONS);
    await handlePassword(page, password);
    await waitForImages(page);

    for (const viewport of VIEWPORTS) {
      for (const section of selectors) {
        console.error(`[capture] ${viewport.name}/${section.name}...`);
        const result = await captureSection(page, section, viewport, outputDir);
        results.push(result);

        if (result.status === 'CAPTURED') {
          console.error(`[capture]   saved: ${result.filename}`);
        } else {
          console.error(`[capture]   ${result.status}: ${result.error}`);
        }
      }
    }
  } finally {
    await browser.close();
  }

  const manifest = {
    feature,
    url,
    timestamp: new Date().toISOString(),
    viewports: VIEWPORTS,
    selectors,
    results,
  };

  await writeFile(
    path.join(outputDir, 'capture-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  const captured = results.filter((r) => r.status === 'CAPTURED').length;
  const notFound = results.filter((r) => r.status === 'NOT_FOUND').length;
  const notVisible = results.filter((r) => r.status === 'NOT_VISIBLE').length;

  console.error(`[capture] Done: ${captured} captured, ${notFound} not found, ${notVisible} not visible`);
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((err) => {
  console.error(`[capture] Fatal: ${err.message}`);
  process.exit(1);
});
