---
name: compare
description: >
  Visual comparison of developed page against Figma design. Captures
  section-level screenshots via Playwright, then compares each section
  against the Figma screenshots. Auto-triggers /fix on mismatch.
  Use after /execute when building from a Figma design.
disable-model-invocation: true
model: opus
context: fork
allowed-tools: Read, Write, Bash, Glob, Grep, Agent, AskUserQuestion, Skill
---

# Compare — Visual Design Comparison

You are entering the Compare phase. Your job is to capture screenshots of the developed page section-by-section and compare them against the original Figma screenshots. If mismatches are found, trigger /fix and re-compare. Maximum 2 comparison-fix iterations.

---

## Input

Context or overrides: `$ARGUMENTS`

---

## Artifact Resolution

1. Check `.buildspace/artifacts/` for feature folders containing both `design-context.md` (from /figma) and `selectors.json` (from /execute)
2. If one folder exists → use it
3. If multiple → ask the user which feature to compare
4. If `design-context.md` is missing → tell user to run `/figma` first
5. If `selectors.json` is missing → tell user to run `/execute` first (it generates the selector mapping)

Read from `.buildspace/artifacts/{feature-name}/`:
- `sections.json` — canonical section names from `/figma` (the naming authority)
- `selectors.json` — section-to-CSS-selector mapping (names must match sections.json)
- `design-context.md` — for design specifications
- `execution-log.md` — for list of files built (context for /fix)

---

## Step 1: Determine Comparison Scope

Read `sections.json`, `selectors.json`, and `design-context.md` to determine which sections to compare.

**Matching logic:** For each entry in `selectors.json`, find the matching entry in `sections.json` by `name`. This gives you:
- The CSS selector (from selectors.json) → used to capture the code screenshot
- The Figma screenshot paths (from sections.json) → the reference to compare against

If a name in selectors.json has no match in sections.json, flag it as a naming mismatch and skip.

**Full page build:** Compare all sections listed in selectors.json that have matching Figma screenshots.

**Single section build:** If only one section was built (one entry in selectors.json), compare only that section.

For each matched section, verify that Figma screenshots exist on disk:
- `.buildspace/artifacts/{feature-name}/screenshots/figma-{name}-desktop.png`
- `.buildspace/artifacts/{feature-name}/screenshots/figma-{name}-mobile.png` (if mobile was captured)

If a Figma screenshot file is missing for a section, skip that section and note it.

---

## Step 2: Get Preview URL

Ask the user for the Shopify preview URL (e.g., `http://127.0.0.1:9292`) and storefront password if any.

If the user provided a preview URL in `$ARGUMENTS`, use that instead of asking.

---

## Step 3: Ensure Playwright is Available

Before capturing screenshots, verify Playwright and Chromium are installed. Run this check:

```bash
node -e "try { require('playwright').chromium; console.log('READY'); } catch(e) { console.log('NOT_READY'); process.exit(1); }" 2>/dev/null
```

If the output is `NOT_READY` (or the command fails), install Playwright:

```bash
npm install playwright && npx playwright install chromium
```

**Wait for installation to complete before proceeding.** Do NOT run the capture script until Playwright is confirmed `READY`. If the install fails, report the error to the user — do NOT retry in a loop.

---

## Step 4: Capture Developed Page Screenshots

Run the capture script:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/capture-sections.js \
  --url "<preview-url>" \
  --feature "<feature-name>" \
  --selectors ".buildspace/artifacts/{feature-name}/selectors.json" \
  --password "<password-if-any>"
```

This captures:
- `code-{section}-desktop.png` at 1440px viewport
- `code-{section}-mobile.png` at 390px viewport

for each section in selectors.json.

If a section selector is not found or not visible, note it as a potential issue.

---

## Step 5: Visual Comparison — Section by Section

For each section that has both Figma and code screenshots:

### Desktop Comparison
1. Read the Figma screenshot: `.buildspace/artifacts/{feature-name}/screenshots/figma-{section}-desktop.png`
2. Read the code screenshot: `.buildspace/artifacts/{feature-name}/screenshots/code-{section}-desktop.png`
3. Compare visually across these dimensions:

| Dimension | What to check |
|-----------|--------------|
| Layout | Element positions, proportions, column counts, content stacking order |
| Spacing | Margins, padding, gaps between elements — relative proportions matter more than exact pixels |
| Typography | Font sizes (relative), weights, alignment, line spacing |
| Colors | Background colors, text colors, border colors, accent colors |
| Images & Media | Sizing, aspect ratio, positioning, cropping |
| Interactive Elements | Button styles, link appearance, form elements |
| Content Structure | Does the section contain all the elements shown in the Figma design? |

### Mobile Comparison
Repeat the same comparison for mobile screenshots (if they exist).

Additionally check:
- Does the layout properly reflow for mobile (e.g., horizontal → vertical stacking)?
- Are elements appropriately resized for the mobile viewport?
- Are any elements correctly hidden/shown for mobile?

### Verdicts per Section

Rate each section × viewport combination:

- **MATCH** — The implementation faithfully represents the Figma design. Minor rendering differences (font smoothing, anti-aliasing, sub-pixel rounding) are expected and do NOT count as mismatches.
- **MINOR** — Small deviations that don't affect the overall look (e.g., slightly different spacing, minor color shade difference). Note what's different but do not trigger a fix.
- **MISMATCH** — Significant visual difference that a user would notice (e.g., wrong layout, missing element, wrong colors, broken spacing). Describe exactly what's wrong.

**Important:** Be realistic about what browser rendering can match. Figma and browsers render differently. Focus on structural accuracy, not pixel perfection. Things that are NOT mismatches:
- Font rendering differences (anti-aliasing, hinting)
- Sub-pixel rounding (1-2px differences in spacing)
- Scrollbar presence/absence
- Browser-specific form element styling
- Hover/focus states not visible in Figma

---

## Step 6: Generate Comparison Report

Read the template from `${CLAUDE_SKILL_DIR}/templates/comparison-report-template.md` and fill it in.

Write the report to `.buildspace/artifacts/{feature-name}/comparison-report.md`:

```markdown
# Comparison Report: {Feature Name}

**Iteration:** {1 or 2}
**Date:** {timestamp}
**Preview URL:** {url}

## Summary
- Sections compared: {count}
- Desktop: {pass}/{total} MATCH, {minor}/{total} MINOR, {mismatch}/{total} MISMATCH
- Mobile: {pass}/{total} MATCH, {minor}/{total} MINOR, {mismatch}/{total} MISMATCH
- **Overall Verdict:** PASS / NEEDS FIX

## Section: {Section Name}

### Desktop
- **Verdict:** MATCH / MINOR / MISMATCH
- **Figma:** `screenshots/figma-{section}-desktop.png`
- **Code:** `screenshots/code-{section}-desktop.png`
- **Notes:** {What matches well, what deviates}

### Mobile
- **Verdict:** MATCH / MINOR / MISMATCH
- **Figma:** `screenshots/figma-{section}-mobile.png`
- **Code:** `screenshots/code-{section}-mobile.png`
- **Notes:** {What matches well, what deviates}

### Issues (if MISMATCH)
1. {Specific issue: what's wrong, where in the section, what it should look like}
2. {Specific issue}

[Repeat for each section]
```

---

## Step 7: Handle Results

### All MATCH or MINOR → Done
Tell the user:
```
Visual comparison passed. All sections match the Figma design.
Report saved to .buildspace/artifacts/{feature-name}/comparison-report.md

→ Run /test for functional validation.
  Remaining: /test → /code-review
```

### Any MISMATCH found → Trigger Fix (auto)

If this is **iteration 1**:

1. Tell the user what mismatches were found (brief summary, not the full report)
2. Automatically invoke `/fix` with the comparison report as context:

Use the Skill tool to invoke `fix` with arguments:
```
Visual comparison found mismatches. Fix the following issues from comparison-report.md:
{list each MISMATCH issue with section name and description}
Feature: {feature-name}
```

3. After `/fix` completes, **automatically re-run this comparison** (iteration 2):
   - Re-capture screenshots (the code has changed)
   - Re-compare against the same Figma screenshots
   - Generate updated comparison report with `Iteration: 2`

If this is **iteration 2**:
- If mismatches remain, report them to the user and stop. Do NOT trigger a third fix cycle.
- Tell the user what still doesn't match and suggest they review manually.
- Still suggest the next step:
  ```
  → Run /test for functional validation (even with remaining visual issues).
    Remaining: /test → /code-review
  ```

---

## Step 8: Cleanup

After all comparisons are complete (pass or max iterations reached):

```bash
npm uninstall playwright 2>/dev/null || true
```

Keep the Chromium browser cache. Only remove the npm package.

---

## Rules
- Maximum 2 compare-fix iterations. Never run a third.
- Focus on structural fidelity, not pixel perfection. Browser rendering differs from Figma — that's normal.
- Font rendering, anti-aliasing, and sub-pixel differences are NOT mismatches.
- If a selector is not found, flag it as an issue — the section wasn't built or the selector is wrong.
- Always read both Figma and code screenshots before making a verdict — never guess from code alone.
- Do NOT fix issues yourself. Invoke /fix through the Skill tool and let it handle repairs.
- Present the comparison report path to the user, not the full report content.
