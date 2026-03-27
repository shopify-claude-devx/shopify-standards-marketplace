#!/usr/bin/env node
/**
 * fetch-svgs.js — Fetch SVG code from Figma and write icon snippets
 *
 * Reads figma-assets.json → batch-fetches SVG export URLs from Figma API
 * → downloads SVG content → writes snippets/icon-*.liquid
 *
 * Usage:
 *   FIGMA_TOKEN=figd_... node fetch-svgs.js <fileKey> <feature> [--theme-path <path>]
 *
 * Default theme path: current working directory (.)
 * Snippet output: {themePath}/snippets/icon-{name}.liquid
 *
 * Also updates figma-assets.json with snippetPath and status per SVG.
 */

'use strict';

const { readFile, writeFile, mkdir, access } = require('node:fs/promises');
const path = require('node:path');

const FIGMA_API = 'https://api.figma.com';
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;

const TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function log(msg) {
  console.error(`[fetch-svgs] ${msg}`);
}

// ── Args ─────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const [fileKey, feature] = args;

  if (!fileKey || !feature) {
    console.error(
      'Usage: FIGMA_TOKEN=figd_... node fetch-svgs.js <fileKey> <feature> [--theme-path <path>]'
    );
    process.exit(1);
  }

  const themePathIdx = args.indexOf('--theme-path');
  const themePath = themePathIdx !== -1 ? args[themePathIdx + 1] : '.';

  return { fileKey, feature, themePath };
}

// ── HTTP ─────────────────────────────────────────────────────────

async function figmaGet(endpoint) {
  log(`GET ${endpoint}`);
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(`${FIGMA_API}${endpoint}`, {
        headers: { 'X-Figma-Token': FIGMA_TOKEN },
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error(`Figma API request timed out after ${TIMEOUT_MS / 1000}s`);
      }
      if (attempt < MAX_RETRIES) {
        log(`Network error (attempt ${attempt}/${MAX_RETRIES}) — retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw new Error(`Network error after ${MAX_RETRIES} attempts: ${err.message}`);
    }
    clearTimeout(timer);

    if (res.status === 429) {
      if (attempt < MAX_RETRIES) {
        const wait = parseInt(res.headers.get('retry-after') || '10', 10);
        log(`Rate limited (429) — waiting ${wait}s before retry ${attempt + 1}/${MAX_RETRIES}...`);
        await new Promise((r) => setTimeout(r, wait * 1000));
        continue;
      }
      throw new Error('Figma API rate limit exceeded (429). Wait a few minutes and try again.');
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (res.status === 403) {
        throw new Error(
          'Figma API 403 — access denied. Verify FIGMA_TOKEN has read access to this file.'
        );
      }
      throw new Error(`Figma API ${res.status}: ${body}`);
    }
    return res.json();
  }
}

async function downloadText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, { signal: controller.signal });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error(`SVG download timed out after ${TIMEOUT_MS / 1000}s`);
    throw err;
  }
  clearTimeout(timer);
  if (!res.ok) throw new Error(`SVG download failed ${res.status}: ${url}`);
  return res.text();
}

// ── SVG cleanup ───────────────────────────────────────────────────

function cleanSvg(raw) {
  return raw
    .replace(/<\?xml[^>]*\?>\s*/g, '')          // remove XML declaration
    .replace(/<!DOCTYPE[^>]*>\s*/g, '')          // remove DOCTYPE
    .replace(/\s+id="[^"]*figma[^"]*"/gi, '')   // remove Figma internal IDs
    .trim();
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  if (!FIGMA_TOKEN) {
    console.error('[fetch-svgs] FIGMA_TOKEN not set');
    process.exit(1);
  }

  const { fileKey, feature, themePath } = parseArgs();
  const base = path.resolve(`.buildspace/artifacts/${feature}`);
  const snippetsDir = path.resolve(path.join(themePath, 'snippets'));

  // Read figma-assets.json
  const assetsRaw = await readFile(path.join(base, 'figma-assets.json'), 'utf-8').catch(() => {
    throw new Error('figma-assets.json not found. Run parse-figma.js first.');
  });
  let assets;
  try {
    assets = JSON.parse(assetsRaw);
  } catch (err) {
    throw new Error(`figma-assets.json is not valid JSON: ${err.message}. Re-run parse-figma.js.`);
  }

  if (!assets.svgs || assets.svgs.length === 0) {
    log('No SVG assets in figma-assets.json — nothing to do');
    console.log(JSON.stringify({ created: [], failed: [] }));
    return;
  }

  log(`${assets.svgs.length} SVG(s) to fetch`);
  await mkdir(snippetsDir, { recursive: true });

  // Batch fetch SVG export URLs (one Figma API call)
  const nodeIds = assets.svgs.map((s) => s.nodeId).join(',');
  const svgResponse = await figmaGet(
    `/v1/images/${fileKey}?ids=${encodeURIComponent(nodeIds)}&format=svg`
  );
  if (!svgResponse || typeof svgResponse.images !== 'object' || svgResponse.images === null) {
    throw new Error(
      'Figma API returned unexpected structure for SVG images endpoint (missing "images" object). ' +
      'Check FIGMA_TOKEN permissions and try again.'
    );
  }
  const svgUrls = svgResponse.images;

  const created = [];
  const failed = [];

  for (const svgAsset of assets.svgs) {
    const exportUrl = svgUrls?.[svgAsset.nodeId];

    if (!exportUrl) {
      log(`✗ No export URL returned for "${svgAsset.name}" (${svgAsset.nodeId})`);
      svgAsset.status = 'FAILED';
      svgAsset.error = 'No export URL returned by Figma';
      failed.push(svgAsset.name);
      continue;
    }

    try {
      log(`Downloading ${svgAsset.name}...`);
      const rawSvg = await downloadText(exportUrl);
      const cleanedSvg = cleanSvg(rawSvg);

      // Ensure snippet name always starts with icon-
      const snippetName = svgAsset.snippetName.startsWith('icon-')
        ? svgAsset.snippetName
        : `icon-${svgAsset.snippetName}`;

      const snippetFile = path.join(snippetsDir, `${snippetName}.liquid`);

      // Bug fix: do not overwrite existing snippets — report conflict to user
      const alreadyExists = await access(snippetFile).then(() => true).catch(() => false);
      if (alreadyExists) {
        log(`⚠ Snippet already exists — skipping ${snippetName}.liquid (delete it manually to regenerate)`);
        svgAsset.status = 'SKIPPED_EXISTS';
        svgAsset.snippetPath = `snippets/${snippetName}.liquid`;
        created.push({ name: svgAsset.name, snippetName, path: svgAsset.snippetPath, skipped: true });
        continue;
      }

      // Validate downloaded content is SVG
      if (!cleanedSvg.includes('<svg')) {
        throw new Error(
          `Downloaded content for "${svgAsset.name}" is not valid SVG (no <svg> tag found). ` +
          `The node may not be exportable as SVG.`
        );
      }

      await writeFile(snippetFile, cleanedSvg);

      svgAsset.snippetPath = `snippets/${snippetName}.liquid`;
      svgAsset.status = 'SNIPPET_CREATED';
      created.push({ name: svgAsset.name, snippetName, path: svgAsset.snippetPath });
      log(`✅ snippets/${snippetName}.liquid`);
    } catch (err) {
      log(`✗ Failed "${svgAsset.name}": ${err.message}`);
      svgAsset.status = 'FAILED';
      svgAsset.error = err.message;
      failed.push(svgAsset.name);
    }
  }

  // Save updated figma-assets.json with status + snippetPath
  await writeFile(path.join(base, 'figma-assets.json'), JSON.stringify(assets, null, 2));
  log('Updated figma-assets.json with snippet paths');

  log(`Done. Created: ${created.length}, Failed: ${failed.length}`);
  console.log(JSON.stringify({ created, failed }));
}

main().catch((err) => {
  console.error(`[fetch-svgs] Fatal: ${err.message}`);
  process.exit(1);
});
