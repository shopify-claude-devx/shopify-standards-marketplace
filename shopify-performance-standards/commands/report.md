---
description: Generate a client-facing performance optimization report as a markdown file. Summarizes what was fixed, what improved, and what the client needs to handle. Use after /verify.
allowed-tools: Read, Write, Bash, Glob, Grep
---

# Report — Client-Facing Performance Report

You are entering the Report phase. Your job is to generate a professional, client-ready markdown report summarizing the performance optimization work. This report covers what was done, what improved, and what the client needs to handle on their end.

## Input
Report context: `$ARGUMENTS`

If no context, review the conversation for audit, diagnosis, optimization, and verification data.

## Process

### Step 1: Gather All Data
Read from the conversation and saved files:

1. **Audit data** — `.claude/performance/audit-mobile.json` and `audit-desktop.json` for before scores
2. **Verification data** — `.claude/performance/verify-mobile.json` and `verify-desktop.json` for after scores
3. **Diagnosis** — the Category A/B/C breakdown from `/diagnose`
4. **Optimization log** — what files were changed and what fixes were applied

If any data is missing, note it in the report as "Not available — test was not run."

### Step 2: Generate the Report
Write the report to the project directory:

**File path:** `performance-report.md` (in the project root)

**Report template:**

```markdown
# Performance Optimization Report

**Store:** [Store name or URL]
**Date:** [Today's date]
**Pages Optimized:** [List of pages audited and optimized]
**Prepared by:** [Author name if available, otherwise omit]

---

## Executive Summary

[2-3 sentences: What was the starting state, what was done, and what's the outcome. Write for a non-technical client.]

**Performance Targets:** Mobile 70+ / Desktop 85+
**Status:** [Targets met / Partially met / In progress]

---

## Score Improvements

### [Page Name 1]

| Metric | Mobile Before | Mobile After | Desktop Before | Desktop After |
|--------|---------------|--------------|----------------|---------------|
| Performance Score | [X]/100 | [X]/100 | [X]/100 | [X]/100 |
| LCP (Loading Speed) | [X]s | [X]s | [X]s | [X]s |
| CLS (Visual Stability) | [X] | [X] | [X] | [X] |
| TBT (Interactivity) | [X]ms | [X]ms | [X]ms | [X]ms |

[Repeat table for each page optimized]

---

## What We Fixed

### Images
[List image optimizations made, in plain language:]
- Added lazy loading to below-fold images to reduce initial page weight
- Added responsive image sizes so mobile devices download smaller images
- Added explicit dimensions to all images to prevent layout shifts
- [etc.]

### CSS (Stylesheets)
- Deferred non-critical stylesheets so they don't block page rendering
- [etc.]

### JavaScript
- Deferred non-critical scripts to improve interactivity time
- [etc.]

### Fonts
- [Font optimizations if any]

### Other
- [Any other optimizations]

---

## What Requires Your Action

The following items affect your store's performance but cannot be fixed in the theme code. They are caused by third-party apps or services installed on your store.

| App/Service | Impact | Our Recommendation |
|-------------|--------|--------------------|
| [App name] | Adds [X]ms to page load | [Remove if unused / Contact vendor for lighter option / Accept trade-off] |

**Why these matter:** Third-party apps inject their own code into every page of your store. Even if you don't see the app on a particular page, its code may still load. Each app adds to the total time customers wait for your page to become interactive.

**What you can do:**
1. Review each app listed above and determine if it's still needed
2. For apps you want to keep, contact the app developer and ask about performance-optimized versions
3. For apps with significant impact that are rarely used, consider alternatives or removal

---

## Technical Details

### Files Modified
- `[file path]` — [brief description of change]

### Performance Skills Applied
- Image Performance — responsive images, lazy loading, LCP optimization
- CSS Performance — critical CSS, async loading
- [etc.]

---

## Remaining Opportunities

These are lower-impact items that were not addressed in this round but could be considered for future optimization:

- [Item and brief explanation]

---

## Notes

- Performance scores can vary 5-10 points between tests due to network conditions and server load
- Scores reflect the state of the store at the time of testing — installing new apps or making significant content changes may affect performance
- Mobile scores are typically lower than desktop due to simulated slower network conditions in the test

---

*Report generated with Shopify Performance Standards plugin*
```

### Step 3: Confirm Report Location
Tell the user:

```
Performance report saved to `performance-report.md`.

This report is ready to share with the client. It covers:
- Before/after score comparisons
- What was fixed (in plain language)
- What the client needs to handle (third-party apps)
- Technical details of files changed

Run `/capture` to extract learnings from this optimization for future reference.
```

## Rules
- Write for a non-technical audience — the client may not know what LCP or CLS means, so include plain-language labels
- Be honest about results — don't exaggerate improvements
- Clearly separate what we fixed from what the client needs to handle
- Include specific app/script names in the client action section — vague "third-party scripts" isn't helpful
- Always save the report as a markdown file in the project root
- If before/after data is incomplete (e.g., verify wasn't run), still generate the report with available data and note what's missing
- Keep the technical details section brief — the client doesn't need to read code
