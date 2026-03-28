#!/usr/bin/env node
/**
 * generate-report.js — Auto-generate final build report from artifacts
 *
 * Script auto-fills: files created, asset summary.
 * Claude adds: 1-line verdict + 2-3 lines of next steps.
 *
 * Usage:
 *   node generate-report.js <feature>
 *
 * Reads from .buildspace/artifacts/{feature}/:
 *   execution-log.md       — files built
 *
 * Writes:
 *   .buildspace/artifacts/{feature}/report.md
 */

'use strict';

const { readFile, writeFile } = require('node:fs/promises');
const path = require('node:path');

function log(msg) {
  console.error(`[generate-report] ${msg}`);
}

async function tryReadFile(p) {
  try { return await readFile(p, 'utf-8'); } catch { return null; }
}

function extractFilesFromLog(execLog) {
  if (!execLog) return [];
  const matches = execLog.match(/^[\s]*[-*]\s+(\S+\.(liquid|css|js|json))/gm) || [];
  return matches.map((m) => m.replace(/^[\s*-]+/, '').trim());
}

async function main() {
  const feature = process.argv[2];
  if (!feature) {
    console.error('Usage: node generate-report.js <feature>');
    process.exit(1);
  }

  const base = path.resolve(`.buildspace/artifacts/${feature}`);
  const execLog = await tryReadFile(path.join(base, 'execution-log.md'));
  const files = extractFilesFromLog(execLog);

  const report = `# Build Report: ${feature}
_Generated: ${new Date().toISOString()}_

---

## Overview

| Field | Value |
|-------|-------|
| Feature | \`${feature}\` |
| Files built | ${files.length || '—'} |

---

## Files Built

${files.length > 0 ? files.map((f) => `- \`${f}\``).join('\n') : '_See execution-log.md_'}

---

## Verdict

_Claude: replace this line with a 1-line verdict (DELIVERED / NEEDS REVISION) and 2-3 lines of next steps_
`;

  await writeFile(path.join(base, 'report.md'), report);
  log('Saved report.md');

  const summary = {
    feature,
    filesBuilt: files.length,
  };

  console.log(JSON.stringify(summary));
}

main().catch((err) => {
  console.error(`[generate-report] Fatal: ${err.message}`);
  process.exit(1);
});
