#!/usr/bin/env node
// capture-screenshots.js — Capture page screenshots for visual validation
// Requires: playwright (auto-installed if missing)

const { execSync } = require('node:child_process');
const { mkdir, rm, readFile, writeFile } = require('node:fs/promises');
const path = require('node:path');

// ─── Config ────────────────────────────────────────────────────
const VIEWPORTS = {
  mobile: { width: 360, height: 800 },
  desktop: { width: 1280, height: 900 },
};

const WAIT_OPTIONS = { waitUntil: 'networkidle', timeout: 30000 };

// ─── CLI Argument Parsing ──────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const urlIdx = args.indexOf('--url');
  const outputIdx = args.indexOf('--output');
  const selectorsIdx = args.indexOf('--selectors');
  const passwordIdx = args.indexOf('--password');

  if (urlIdx === -1 || !args[urlIdx + 1]) {
    console.error('Usage: capture-screenshots.js --url <preview-url> --output <dir> [--selectors <file>] [--password <storefront-password>]');
    process.exit(1);
  }

  return {
    url: args[urlIdx + 1],
    outputDir: args[outputIdx + 1] || './screenshots',
    selectorsFile: args[selectorsIdx + 1] || null,
    password: args[passwordIdx + 1] || null,
  };
}

// ─── Ensure Playwright Installed ───────────────────────────────
function ensurePlaywright() {
  try {
    require.resolve('playwright');
  } catch {
    console.error('[capture] Playwright not found. Installing...');
    execSync('npm install playwright', { stdio: 'inherit' });
    console.error('[capture] Installing Chromium browser...');
    execSync('npx playwright install chromium', { stdio: 'inherit' });
    console.error('[capture] Playwright installed successfully.');
  }
}

// ─── Handle Storefront Password ────────────────────────────────
async function handlePassword(page, password) {
  if (!password) return;

  try {
    // Check if password page is shown
    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      console.error('[capture] Storefront password page detected. Entering password...');
      await passwordInput.fill(password);
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForLoadState('networkidle');
      }
    }
  } catch {
    // No password page, continue
  }
}

// ─── Capture Full Page Screenshots ─────────────────────────────
async function captureFullPage(page, url, outputDir, password) {
  const results = [];

  for (const [viewport, size] of Object.entries(VIEWPORTS)) {
    await page.setViewportSize(size);
    await page.goto(url, WAIT_OPTIONS);
    await handlePassword(page, password);

    // Wait for images to load
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map((img) => new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          }))
      );
    });

    const filename = `rendered-${viewport}.png`;
    const filepath = path.join(outputDir, filename);
    await page.screenshot({ path: filepath, fullPage: true });

    results.push({ viewport, filename, filepath, width: size.width, height: size.height });
    console.error(`[capture] ${viewport}: saved ${filename}`);
  }

  return results;
}

// ─── Capture Section Screenshots ───────────────────────────────
async function captureSections(page, url, selectors, outputDir, password) {
  const results = [];

  for (const [viewport, size] of Object.entries(VIEWPORTS)) {
    await page.setViewportSize(size);
    await page.goto(url, WAIT_OPTIONS);
    await handlePassword(page, password);

    // Wait for images
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map((img) => new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          }))
      );
    });

    for (const { name, selector } of selectors) {
      try {
        const element = await page.locator(selector);
        const isVisible = await element.isVisible();

        if (!isVisible) {
          console.error(`[capture] ${viewport}/${name}: element not visible, skipping`);
          results.push({ viewport, name, selector, status: 'NOT_VISIBLE' });
          continue;
        }

        const filename = `rendered-${name}-${viewport}.png`;
        const filepath = path.join(outputDir, filename);
        await element.screenshot({ path: filepath });

        results.push({ viewport, name, selector, filename, filepath, status: 'CAPTURED' });
        console.error(`[capture] ${viewport}/${name}: saved ${filename}`);
      } catch (err) {
        console.error(`[capture] ${viewport}/${name}: FAILED — ${err.message}`);
        results.push({ viewport, name, selector, status: 'FAILED', error: err.message });
      }
    }
  }

  return results;
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  const { url, outputDir, selectorsFile, password } = parseArgs();

  ensurePlaywright();

  const { chromium } = require('playwright');

  await mkdir(outputDir, { recursive: true });

  // Read selectors file if provided
  let selectors = null;
  if (selectorsFile) {
    const raw = await readFile(selectorsFile, 'utf-8');
    selectors = JSON.parse(raw);
  }

  console.error(`[capture] URL: ${url}`);
  console.error(`[capture] Output: ${outputDir}`);
  console.error(`[capture] Mode: ${selectors ? 'section-level' : 'full-page'}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    let results;

    if (selectors && selectors.length > 0) {
      results = await captureSections(page, url, selectors, outputDir, password);
    } else {
      results = await captureFullPage(page, url, outputDir, password);
    }

    // Write results manifest
    const manifest = {
      url,
      timestamp: new Date().toISOString(),
      mode: selectors ? 'section-level' : 'full-page',
      results,
    };

    const manifestPath = path.join(outputDir, 'capture-manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    // Output manifest to stdout
    console.log(JSON.stringify(manifest));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(`[capture] Fatal error: ${err.message}`);
  process.exit(1);
});
