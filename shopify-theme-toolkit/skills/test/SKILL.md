---
name: test
description: >
  Validate built features — requirements coverage, edge cases, integration,
  and visual fidelity against Figma. Works after /execute (pipeline) or
  standalone on any existing code. Includes Playwright visual validation.
disable-model-invocation: true
context: fork
agent: general-purpose
allowed-tools: Read, Write, Grep, Glob, Agent, Bash, AskUserQuestion
---

# Test — Functional Validation

You are entering the Test phase. Your job is to verify that the code works correctly — does it meet requirements, handle edge cases, integrate properly, and match the design?

**Do NOT fix anything. Only identify issues. Fixing happens in /fix.**

## Input
Context or overrides: `$ARGUMENTS`

## Mode Detection

### Pipeline Mode (after /execute)
Check `.buildspace/artifacts/` for feature folders containing `execution-log.md`.
If found, read from `.buildspace/artifacts/{feature-name}/`:
- `prd.md` — requirements to validate against
- `plan.md` — test cases and file specs
- `execution-log.md` — files created/modified
- `design-context.md` — if exists, visual validation is needed
- `screenshots/figma-desktop.png` + `figma-mobile.png` — Figma reference screenshots

### Standalone Mode (direct invocation)
If no execution-log.md exists:
1. Ask the user what to test (section name, file paths, or feature description)
2. Use `Glob` and `Grep` to find the relevant files
3. Skip requirements validation (no PRD)
4. Visual validation available if user provides Figma URLs

---

## Test Process

### 1. Automated Checks

**Shopify Theme Check:**
```bash
shopify theme check --path . --fail-level error
```
If `shopify theme check` is not available, skip and note it.

**Schema JSON Validation:**
For each section file found in execution-log (or user-specified files), verify:
- `{% schema %}` block contains valid JSON
- Setting IDs are non-empty strings
- Setting types are valid Shopify types
- Block types are non-empty strings

```bash
node -e "
const fs = require('fs');
const content = fs.readFileSync('{file-path}', 'utf-8');
const match = content.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
if (match) { JSON.parse(match[1]); console.log('Valid'); }
else { console.log('No schema found'); }
"
```

**Integration Checks (via Grep):**
- New sections registered in templates: `Grep('{section-name}', glob='templates/*.json')`
- Snippets referenced correctly: `Grep('render "{snippet-name}"', glob='sections/*.liquid')`
- CSS files loaded: `Grep('{css-filename}', glob='sections/*.liquid')`
- JS files loaded: `Grep('{js-filename}', glob='sections/*.liquid')`
- Schema setting IDs unique: `Grep('{setting-id}', glob='sections/*.liquid')` — check for collisions

### 2. Functional Validation

Dispatch the **output-validator** agent:

> Validate feature: {feature-name}
>
> Files to validate: [list from execution-log or user-specified]
>
> PRD: .buildspace/artifacts/{feature-name}/prd.md (if exists)
> Plan: .buildspace/artifacts/{feature-name}/plan.md (if exists)
>
> Check every file for:
> 1. Null/blank guards on every setting that outputs HTML
> 2. Empty collection handling in loops
> 3. Block rendering covers all declared block types in schema
> 4. Image tags have alt text and width parameters
> 5. Links have valid href (not empty anchors)
> 6. Conditional display works (elements hidden when settings are blank)
> 7. Schema settings wired correctly to Liquid output
>
> If PRD exists: check each requirement — Met / Partially met / Not implemented
> If plan exists: run each test case — Pass / Fail with reason

### 3. Visual Validation (when applicable)

Visual validation runs when:
- **Pipeline mode:** `design-context.md` and `screenshots/figma-desktop.png` exist
- **Standalone mode:** User provides Figma URLs (fetch screenshots first using Figma MCP tools)

#### Step 1: Get Figma Screenshots
- Pipeline: Read from `.buildspace/artifacts/{feature-name}/screenshots/`
- Standalone: Ask user to provide Figma screenshot files (desktop + mobile). Save them to `.buildspace/artifacts/{feature-name}/screenshots/figma-desktop.png` and `figma-mobile.png`. If user wants to fetch from Figma directly, suggest running `/figma` first.

#### Step 2: Check Playwright
```bash
node -e "try { require.resolve('playwright'); console.log('installed'); } catch { console.log('not-installed'); }"
```

If not installed:
```bash
npm install playwright && npx playwright install chromium
```

#### Step 3: Get Preview URL
Ask the user for the preview URL where the built feature can be viewed.

If the store has a storefront password, ask for that too.

#### Step 4: Capture Rendered Screenshots
Determine the CSS selectors for the sections to capture. Create a selectors file:
```json
[
  {"name": "hero-banner", "selector": ".hero-banner"},
  {"name": "product-grid", "selector": ".product-grid"}
]
```

Save to `.buildspace/artifacts/{feature-name}/screenshots/selectors.json`.

Run the capture script:
```bash
node ${CLAUDE_SKILL_DIR}/scripts/capture-screenshots.js \
  --url "{preview-url}" \
  --output ".buildspace/artifacts/{feature-name}/screenshots" \
  --selectors ".buildspace/artifacts/{feature-name}/screenshots/selectors.json" \
  --password "{storefront-password-if-any}"
```

#### Step 5: Compare with Claude Vision
Read both image files:
- Figma screenshot: `.buildspace/artifacts/{feature-name}/screenshots/figma-desktop.png`
- Rendered screenshot: `.buildspace/artifacts/{feature-name}/screenshots/rendered-desktop.png`

Compare them visually. Evaluate across these dimensions:

| Dimension | What to check |
|-----------|--------------|
| Layout & Structure | Positions, proportions, columns, content block order |
| Spacing | Margins, padding, gaps between elements |
| Typography | Font sizes, weights, line heights, alignment |
| Colors | Background, text, accent, border colors |
| Images & Media | Sizing, positioning, cropping |
| Interactive Elements | Button, link, form styling |

Rate each dimension: **MATCH** / **MINOR DEVIATION** / **SIGNIFICANT DEVIATION**

For each deviation, identify:
- Which element is affected
- What the design shows vs. what the build shows
- Suggested CSS property or Liquid change to fix

Repeat for mobile (figma-mobile.png vs rendered-mobile.png).

#### Step 6: Cleanup Playwright Files
After screenshots are captured and compared, remove Playwright entirely:
```bash
# Remove Playwright browser binaries (macOS + Linux paths)
rm -rf ~/Library/Caches/ms-playwright 2>/dev/null || true
rm -rf ~/.cache/ms-playwright 2>/dev/null || true
# Remove Playwright npm package from project
npm uninstall playwright 2>/dev/null || true
```

Note: Keep the screenshot images in artifacts for reference. Only clean up Playwright package and browser binaries.

---

## Test Report

Write to `.buildspace/artifacts/{feature-name}/test-report.md`.

Read the template from `${CLAUDE_SKILL_DIR}/templates/test-report-template.md` and fill it in with the test results.

Save the report. Tell the user:
- Where the report was saved
- Verdict only (PASS / NEEDS FIX)
- If issues: one-line count (e.g., "2 functional issues, 1 visual deviation")

**Do NOT output the full report in conversation.**

---

## Rules
- Be thorough — check every requirement, every test case, every edge case
- Be honest — if the code is good, say PASS. Don't invent issues
- Visual validation: design intent, not pixel perfection. Font rendering differences are expected
- Always cleanup Playwright binaries after capture. If install fails, fall back to manual screenshots
