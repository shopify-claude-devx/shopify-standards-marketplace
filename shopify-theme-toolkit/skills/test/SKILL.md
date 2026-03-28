---
name: test
description: >
  Validate built features — requirements coverage, edge cases, integration,
  and visual review via screenshots. Works after /execute (pipeline) or
  standalone on existing code.
disable-model-invocation: true
model: sonnet
context: fork
agent: general-purpose
allowed-tools: Read, Write, Grep, Glob, Agent, Bash, AskUserQuestion
---

# Test — Validation and Visual Review

You are entering the Test phase. Your job is to validate the built code and deliver a clean build.

---

## Input

Context or overrides: `$ARGUMENTS`

---

## Mode Detection

### Pipeline Mode (after /execute)

Check `.buildspace/artifacts/` for feature folders containing `execution-log.md`.
If found, read from `.buildspace/artifacts/{feature}/`:
- `prd.md` — requirements to validate against
- `plan.md` — test cases
- `execution-log.md` — files created/modified

### Standalone Mode

If no `execution-log.md` found:
1. Ask the user what to test (section name, file paths, feature description)
2. Use `Glob` and `Grep` to find the relevant files
3. Skip requirements validation (no PRD)

---

## Step 1 — Automated Checks

### Shopify Theme Check
```bash
shopify theme check --path . --fail-level error
```
If not available, skip and note it.

### Schema JSON Validation
For each section file from execution-log:
```bash
node -e "
const fs = require('fs');
const content = fs.readFileSync('{file-path}', 'utf-8');
const match = content.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
if (match) { JSON.parse(match[1]); console.log('Valid'); }
else { console.log('No schema found'); }
"
```

### Integration Checks
- New sections registered in templates: `Grep('{section-name}', glob='templates/*.json')`
- CSS loaded: `Grep('{css-filename}', glob='sections/*.liquid')`
- Snippets rendered correctly: `Grep('render "{snippet-name}"', glob='sections/*.liquid')`
- SVG snippets exist: `Glob('snippets/icon-*.liquid')`

---

## Step 2 — Functional Validation

Dispatch the **output-validator** agent:

```
Validate feature: {feature-name}

Files: [list from execution-log or user-specified]
PRD: .buildspace/artifacts/{feature-name}/prd.md (if exists)
Plan: .buildspace/artifacts/{feature-name}/plan.md (if exists)

Check every file for:
1. Null/blank guards on every setting that outputs HTML
2. Empty collection handling in loops
3. Block rendering covers all block types declared in schema
4. Images have alt text, width, height attributes
5. Links have valid href
6. Conditional display works (blank settings hide elements)
7. Schema settings correctly wired to Liquid output

If PRD exists: verify each requirement — Met / Partially met / Not implemented
If plan exists: run each test case — Pass / Fail with reason
```

---

## Step 3 — Screenshot Capture (optional)

If the user provides a Shopify preview URL, capture screenshots for visual review.

### Ask for preview URL

Ask the user for the Shopify preview URL (e.g. `http://127.0.0.1:9292`) and storefront password if any.

### Run capture

```bash
node ${CLAUDE_SKILL_DIR}/scripts/capture-screenshots.js \
  --url "{preview-url}" \
  --feature "{feature}" \
  --password "{password-if-any}"
```

Saves to `.buildspace/artifacts/{feature}/screenshots/`:
- `code-desktop.png` — rendered at 1440px viewport
- `code-mobile.png` — rendered at mobile viewport width

---

## Step 4 — Visual Review

If screenshots were captured, read and compare desktop and mobile screenshots.

Review across:

| Dimension | What to check |
|-----------|--------------|
| Layout & Structure | Positions, proportions, column counts, content order |
| Spacing | Margins, padding, gaps |
| Typography | Font rendering, line heights, alignment |
| Colors | Background, text, borders, accents |
| Images & Media | Sizing, cropping, positioning |
| Interactive Elements | Button, link styling |

Rate each: **MATCH** / **MINOR DEVIATION** / **SIGNIFICANT DEVIATION**

Font rendering differences between browsers are expected. Do not flag them.

---

## Step 5 — Generate Report

```bash
node ${CLAUDE_SKILL_DIR}/scripts/generate-report.js {feature}
```

This auto-fills `report.md` with files built and asset summary.

Read the generated `.buildspace/artifacts/{feature}/report.md` and add:
- **Verdict** (1 line): `DELIVERED` or `NEEDS REVISION — {reason}`
- **Next steps** (2–3 lines): what the merchant or developer should do next

Do NOT output the full report to conversation. Tell the user:
- Where the report was saved
- Overall verdict
- Count of visual deviations (if any)

---

## Step 6 — Remove Playwright npm Package

Keep the Chromium browser cache (avoids re-downloading ~170MB next time).
Remove only the npm package from the project:

```bash
npm uninstall playwright 2>/dev/null || true
```

Do NOT run `rm -rf ~/Library/Caches/ms-playwright` or `rm -rf ~/.cache/ms-playwright`.
The browser cache must persist for future test runs.

---

## Rules

- If screenshots are available, do visual review — design intent, not pixel perfection
- Never fix issues that require changing the design. Report as "design conflict" for human resolution.
- Keep Playwright browser cache. Only remove npm package after each run.
