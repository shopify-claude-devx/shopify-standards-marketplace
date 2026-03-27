---
name: test
description: >
  Validate built features — requirements coverage, edge cases, integration,
  visual fidelity against Figma, and pixel-accurate position diff with automated
  fix loop. Works after /execute (pipeline) or standalone on existing code.
disable-model-invocation: true
context: fork
agent: general-purpose
allowed-tools: Read, Write, Grep, Glob, Agent, Bash, AskUserQuestion
---

# Test — Validation, Position Diff, and Fix Loop

You are entering the Test phase. Your job is to validate the built code, run a pixel-accurate
position diff against the Figma design, fix any failures, and deliver a clean build.

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
- `design-context.md` — if present, position diff is available
- `figma-diff-reference.json` — if present, position diff will run
- `screenshots/figma-desktop.png` + `figma-mobile.png` — Figma reference screenshots

### Standalone Mode

If no `execution-log.md` found:
1. Ask the user what to test (section name, file paths, feature description)
2. Use `Glob` and `Grep` to find the relevant files
3. Skip requirements validation (no PRD)
4. Position diff available if `figma-diff-reference.json` exists

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

## Step 3 — Screenshot Capture

Run only if `figma-diff-reference.json` exists in the feature folder.
If it does not exist, skip to Step 4 (visual-only mode).

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
- `code-mobile.png` — rendered at mobileWidth from figma-sections.json

---

## Step 4 — Position Diff + Fix Loop

**This is the accuracy engine. Run for every build from Figma.**

Skip if `figma-diff-reference.json` does not exist (no Figma source for this feature).

### Run desktop diff

```bash
node ${CLAUDE_SKILL_DIR}/scripts/position-diff.js \
  --url "{preview-url}" \
  --feature "{feature}"
```

### Run mobile diff (if mobile frame exists)

```bash
node ${CLAUDE_SKILL_DIR}/scripts/position-diff.js \
  --url "{preview-url}" \
  --feature "{feature}" \
  --mobile
```

### Read results

Read `diff-results-desktop.json` and `diff-results-mobile.json`.

Each result entry:
```json
{ "nodeId": "111:493", "selector": ".hero-banner__body", "status": "FAIL",
  "failures": ["y: browser=300px figma=272px (off by 28px)"] }
```

### Fix loop (max 5 iterations)

**Do NOT ask permission to fix. Fix automatically until all pass or 5 iterations are reached.**

```
Iteration 1:
  1. Read all FAIL entries from diff results
  2. For each failure: identify which CSS property/value needs changing
     - Position offset → padding, margin, gap on parent or sibling
     - Size mismatch → width, height, min-height on the element
     - Font-size mismatch → check rem conversion (base 16px)
     - Font-weight mismatch → check if CSS variable resolves correctly
     - Color mismatch → check CSS custom property resolution
  3. Apply targeted fixes to the CSS file
  4. Re-run capture-screenshots.js
  5. Re-run position-diff.js (desktop + mobile)
  6. If all PASS → done
  7. If still failures → proceed to next iteration

After 5 iterations: stop. Report remaining failures in the test report.
Do NOT continue iterating. Remaining issues require human inspection.
```

**Common root causes:**

| Symptom | Likely cause |
|---------|-------------|
| All elements offset by same amount | `overflow: hidden` on section wrapper — use `clip-path` instead |
| Element y off but x correct | Wrong `padding-top` on parent, or missing `margin-top` |
| Width wrong on text element | Missing `max-width` or `width: 100%` on parent |
| Font-size mismatch | rem calculation wrong — 32px = 2rem, 14px = 0.875rem |
| `0 elements found` error | `data-figma-id` missing from Liquid — check execution |
| Font-weight mismatch | CSS variable not resolving, or wrong fallback |

---

## Step 5 — Visual Comparison

After position diff passes (or max iterations reached), run visual comparison.

Read both pairs of screenshots:
- `screenshots/figma-desktop.png` vs `screenshots/code-desktop.png`
- `screenshots/figma-mobile.png` vs `screenshots/code-mobile.png`

Compare across:

| Dimension | What to check |
|-----------|--------------|
| Layout & Structure | Positions, proportions, column counts, content order |
| Spacing | Margins, padding, gaps |
| Typography | Font rendering, line heights, alignment |
| Colors | Background, text, borders, accents |
| Images & Media | Sizing, cropping, positioning |
| Interactive Elements | Button, link styling |

Rate each: **MATCH** / **MINOR DEVIATION** / **SIGNIFICANT DEVIATION**

For significant deviations not caught by position-diff (e.g. image cropping, overall composition):
note in the test report but do not attempt to auto-fix — these require human judgment.

Font rendering differences between Figma and browsers are expected and not fixable. Do not flag them.

---

## Step 6 — Cleanup

Remove build-time scaffolding before delivery.

```bash
node ${CLAUDE_SKILL_DIR}/scripts/cleanup-figma-ids.js --theme-path .
```

This strips all `data-figma-id` and `data-figma-section` attributes from every `.liquid` file.

Verify the attributes are gone:
```bash
grep -r "data-figma-id" sections/ snippets/ 2>/dev/null | head -5
```

If any remain, the regex missed them — report to user.

---

## Step 7 — Generate Report

```bash
node ${CLAUDE_SKILL_DIR}/scripts/generate-report.js {feature}
```

This auto-fills `report.md` with files built, diff results, and asset summary.

Read the generated `.buildspace/artifacts/{feature}/report.md` and add:
- **Verdict** (1 line): `DELIVERED` or `NEEDS REVISION — {reason}`
- **Next steps** (2–3 lines): what the merchant or developer should do next

Do NOT output the full report to conversation. Tell the user:
- Where the report was saved
- Overall verdict
- Count of remaining diff failures (if any)
- Count of visual deviations (if any)

---

## Step 8 — Remove Playwright npm Package

Keep the Chromium browser cache (avoids re-downloading ~170MB next time).
Remove only the npm package from the project:

```bash
npm uninstall playwright 2>/dev/null || true
```

Do NOT run `rm -rf ~/Library/Caches/ms-playwright` or `rm -rf ~/.cache/ms-playwright`.
The browser cache must persist for future test runs.

---

## Rules

- Run position-diff before visual comparison — it catches more with less AI effort
- Fix loop runs automatically, no permission needed, max 5 iterations
- Cleanup (remove data-figma-id) always runs before report — never skip
- Visual comparison: design intent, not pixel perfection. Font rendering ≠ bug.
- If position-diff reports `0 elements found`, stop immediately — data-figma-id is missing.
  Check with the developer before continuing.
- Never fix issues that require changing the design (layout fundamentally different between
  Figma and what was planned). Report as "design conflict" for human resolution.
- Keep Playwright browser cache. Only remove npm package after each run.
