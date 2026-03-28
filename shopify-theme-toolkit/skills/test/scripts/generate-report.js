#!/usr/bin/env node
/**
 * generate-report.js — Auto-generate final build report from artifacts
 *
 * Script auto-fills: files created, diff results, asset summary.
 * Claude adds: 1-line verdict + 2–3 lines of next steps.
 *
 * Usage:
 *   node generate-report.js <feature>
 *
 * Reads from .buildspace/artifacts/{feature}/:
 *   execution-log.md       — files built
 *   diff-results-desktop.json
 *   diff-results-mobile.json  (optional)
 *   figma-assets.json
 *   figma-sections.json
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

async function tryReadJSON(p) {
  const raw = await tryReadFile(p);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// ── Diff summary helpers ──────────────────────────────────────────

function diffSummaryLine(diff) {
  if (!diff) return '_not run_';
  const { passed, failed, total } = diff;
  const icon = failed === 0 ? '✅' : '⚠';
  return `${icon} ${passed}/${total} passed${failed > 0 ? ` — **${failed} need fixing**` : ''}`;
}

function diffFailureBlock(diff) {
  if (!diff) return '';
  const failures = (diff.results || []).filter((r) => r.status === 'FAIL');
  if (failures.length === 0) return '';
  const lines = failures.map((r) => {
    const failLines = (r.failures || []).map((f) => `      → ${f}`).join('\n');
    return `  ✗ [${r.nodeId}] ${r.selector}\n${failLines}`;
  });
  return `\`\`\`\n${lines.join('\n')}\n\`\`\``;
}

// ── Files list from execution log ─────────────────────────────────

function extractFilesFromLog(execLog) {
  if (!execLog) return [];
  // Match lines like "- sections/hero-banner.liquid" or "* assets/hero-banner-stylesheet.css"
  const matches = execLog.match(/^[\s]*[-*]\s+(\S+\.(liquid|css|js|json))/gm) || [];
  return matches.map((m) => m.replace(/^[\s*-]+/, '').trim());
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  const feature = process.argv[2];
  if (!feature) {
    console.error('Usage: node generate-report.js <feature>');
    process.exit(1);
  }

  const base = path.resolve(`.buildspace/artifacts/${feature}`);

  const execLog = await tryReadFile(path.join(base, 'execution-log.md'));
  const desktopDiff = await tryReadJSON(path.join(base, 'diff-results-desktop.json'));
  const mobileDiff = await tryReadJSON(path.join(base, 'diff-results-mobile.json'));
  const assets = await tryReadJSON(path.join(base, 'figma-assets.json'));
  const sections = await tryReadJSON(path.join(base, 'figma-sections.json'));

  const files = extractFilesFromLog(execLog);
  const imageCount = assets?.images?.length || 0;
  const svgCount = assets?.svgs?.length || 0;
  const desktopSummary = diffSummaryLine(desktopDiff);
  const mobileSummary = diffSummaryLine(mobileDiff);
  const desktopFailures = diffFailureBlock(desktopDiff);
  const mobileFailures = diffFailureBlock(mobileDiff);

  const totalFailed = (desktopDiff?.failed || 0) + (mobileDiff?.failed || 0);
  const overallStatus = totalFailed === 0 ? 'PASS' : 'NEEDS FIX';

  const report = `# Build Report: ${feature}
_Generated: ${new Date().toISOString()}_

---

## Overview

| Field | Value |
|-------|-------|
| Feature | \`${feature}\` |
| Section | \`${assets?.sectionName || feature}\` |
| Files built | ${files.length || '—'} |
| Images uploaded | ${imageCount} |
| SVG snippets | ${svgCount} |
| Desktop diff | ${desktopSummary} |
| Mobile diff | ${mobileSummary} |
| **Overall** | **${overallStatus}** |

---

## Position Diff — Desktop

${desktopSummary}

${desktopFailures || (desktopDiff ? '✅ All elements within tolerance' : '_Diff not run_')}

---

## Position Diff — Mobile (${sections?.mobileWidth || '?'}px)

${mobileSummary}

${mobileFailures || (mobileDiff ? '✅ All elements within tolerance' : '_Diff not run_')}

---

## Files Built

${files.length > 0 ? files.map((f) => `- \`${f}\``).join('\n') : '_See execution-log.md_'}

---

## Assets

### Images (Shopify Files)
${(assets?.images || []).map((a) => `- \`${a.name}\` — ${a.status === 'DOWNLOADED' || a.status === 'REGISTERED' || a.status === 'ALREADY_EXISTS' ? '✅' : '⚠ ' + (a.status || 'unknown')}`).join('\n') || '_none_'}

### SVG Snippets
${(assets?.svgs || []).map((a) => `- \`${a.snippetPath || a.snippetName + '.liquid'}\` — ${a.status === 'SNIPPET_CREATED' ? '✅' : '⚠ ' + (a.status || 'unknown')}`).join('\n') || '_none_'}

---

## Verdict

_Claude: replace this line with a 1-line verdict (DELIVERED / NEEDS REVISION) and 2–3 lines of next steps_
`;

  await writeFile(path.join(base, 'report.md'), report);
  log('Saved report.md');

  const summary = {
    feature,
    overallStatus,
    filesBuilt: files.length,
    desktopDiff: desktopDiff ? `${desktopDiff.passed}/${desktopDiff.total}` : null,
    mobileDiff: mobileDiff ? `${mobileDiff.passed}/${mobileDiff.total}` : null,
  };

  console.log(JSON.stringify(summary));
}

main().catch((err) => {
  console.error(`[generate-report] Fatal: ${err.message}`);
  process.exit(1);
});
