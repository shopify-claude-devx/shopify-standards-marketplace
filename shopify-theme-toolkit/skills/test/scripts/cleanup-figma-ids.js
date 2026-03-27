#!/usr/bin/env node
/**
 * cleanup-figma-ids.js — Strip data-figma-id and data-figma-section from all .liquid files
 *
 * Run once before client delivery. These attributes are build-time scaffolding
 * used by position-diff.js — they must not ship to production.
 *
 * Usage:
 *   node cleanup-figma-ids.js [--theme-path <path>]
 *
 * Default theme path: current working directory (.)
 */

'use strict';

const { readFile, writeFile, readdir } = require('node:fs/promises');
const path = require('node:path');

function log(msg) {
  console.error(`[cleanup] ${msg}`);
}

// ── Args ─────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--theme-path');
  return idx !== -1 ? args[idx + 1] : '.';
}

// ── File discovery ────────────────────────────────────────────────

const SKIP_DIRS = new Set(['node_modules', '.git', '.buildspace', '.claude']);

async function findLiquidFiles(dir) {
  const files = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findLiquidFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith('.liquid')) {
      files.push(full);
    }
  }
  return files;
}

// ── Cleanup ───────────────────────────────────────────────────────

// Matches data-figma-id="..." or data-figma-section="..." with single or double quotes
const FIGMA_ATTR_RE = /\s+data-figma-(id|section)=["'][^"']*["']/g;

async function cleanFile(filePath) {
  const original = await readFile(filePath, 'utf-8');
  const cleaned = original.replace(FIGMA_ATTR_RE, '');
  if (cleaned === original) return false;
  await writeFile(filePath, cleaned);
  return true;
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  const themePath = path.resolve(parseArgs());
  log(`Theme path: ${themePath}`);

  const files = await findLiquidFiles(themePath);
  log(`Found ${files.length} .liquid file(s)`);

  let cleaned = 0;
  let unchanged = 0;

  for (const file of files) {
    try {
      const wasChanged = await cleanFile(file);
      if (wasChanged) {
        log(`Cleaned: ${path.relative(themePath, file)}`);
        cleaned++;
      } else {
        unchanged++;
      }
    } catch (err) {
      log(`Error on ${path.relative(themePath, file)}: ${err.message}`);
    }
  }

  log(`Done. Cleaned: ${cleaned} file(s), unchanged: ${unchanged}`);
  console.log(JSON.stringify({ cleaned, unchanged, total: files.length }));
}

main().catch((err) => {
  console.error(`[cleanup] Fatal: ${err.message}`);
  process.exit(1);
});
