---
description: Generate a client-facing report covering Performance, Accessibility, Best Practices, and SEO improvements. Summarizes what was fixed, what improved, and what the client needs to handle. Use after /verify.
allowed-tools: Read, Write, Bash, Glob, Grep
---

# Report — Client-Facing Optimization Report

You are entering the Report phase. Your job is to generate a professional, client-ready markdown report summarizing the optimization work across all 4 categories. This report covers what was done, what improved, and what the client needs to handle on their end.

## Targets
| Category | Mobile | Desktop |
|----------|--------|---------|
| Performance | 70+ | 85+ |
| Best Practices | 90+ | 90+ |
| Accessibility | 90+ | 90+ |
| SEO | 90+ | 90+ |

## Input
Report context: `$ARGUMENTS`

If no context, review the conversation for audit, diagnosis, optimization, and verification data.

## Process

### Step 1: Gather All Data
Review the conversation for:
1. **Audit data** — original scores across all 4 categories (from `/audit`)
2. **Verification data** — final scores across all 4 categories (from `/verify`)
3. **Diagnosis** — the Category A/B/C breakdown (from `/diagnose`)
4. **Optimization log** — what files were changed and what fixes were applied (from `/optimize`)
5. **Iteration count** — how many rounds of optimization were performed

If any data is missing, note it in the report as "Not available — test was not run."

### Step 2: Generate the Report
Write the report to the project directory:

**File path:** `performance-report.md` (in the project root)

**Report template:**

```markdown
# Optimization Report

**Store:** [Store name or URL]
**Date:** [Today's date]
**Pages Optimized:** [List of pages audited and optimized]
**Optimization Rounds:** [X]
**Prepared by:** [Author name if available, otherwise omit]

---

## Executive Summary

[2-3 sentences: What was the starting state, what was done, and what's the outcome. Write for a non-technical client.]

### Target Status
| Category | Mobile Target | Mobile Score | Status | Desktop Target | Desktop Score | Status |
|----------|---------------|-------------|--------|----------------|--------------|--------|
| Performance | 70+ | [X]/100 | [Met/Not met] | 85+ | [X]/100 | [Met/Not met] |
| Best Practices | 90+ | [X]/100 | [Met/Not met] | 90+ | [X]/100 | [Met/Not met] |
| Accessibility | 90+ | [X]/100 | [Met/Not met] | 90+ | [X]/100 | [Met/Not met] |
| SEO | 90+ | [X]/100 | [Met/Not met] | 90+ | [X]/100 | [Met/Not met] |

---

## Score Improvements

### [Page Name]

| Category | Mobile Before | Mobile After | Change | Desktop Before | Desktop After | Change |
|----------|-------------|-------------|--------|---------------|--------------|--------|
| Performance | [X]/100 | [X]/100 | [+/-X] | [X]/100 | [X]/100 | [+/-X] |
| Best Practices | [X]/100 | [X]/100 | [+/-X] | [X]/100 | [X]/100 | [+/-X] |
| Accessibility | [X]/100 | [X]/100 | [+/-X] | [X]/100 | [X]/100 | [+/-X] |
| SEO | [X]/100 | [X]/100 | [+/-X] | [X]/100 | [X]/100 | [+/-X] |

### Core Web Vitals
| Metric | What It Measures | Mobile Before | Mobile After | Desktop Before | Desktop After |
|--------|-----------------|-------------|-------------|---------------|--------------|
| LCP (Loading Speed) | How fast the main content loads | [X]s | [X]s | [X]s | [X]s |
| CLS (Visual Stability) | How much the page layout shifts | [X] | [X] | [X] | [X] |
| TBT (Interactivity) | How quickly the page responds to taps | [X]ms | [X]ms | [X]ms | [X]ms |

[Repeat for each page optimized]

---

## What We Fixed

### Performance
[List performance optimizations in plain language:]
- Added lazy loading to below-fold images to reduce initial page weight
- Added responsive image sizes so mobile devices download smaller images
- Deferred non-critical scripts to improve page interactivity
- [etc.]

### Accessibility
[List accessibility fixes in plain language:]
- Added descriptive alt text to all images for screen reader users
- Fixed heading hierarchy for better navigation
- Added labels to all form inputs
- [etc.]

### Best Practices
[List best practices fixes:]
- Fixed image aspect ratios to prevent visual distortion
- [etc.]

### SEO
[List SEO fixes:]
- Added meta descriptions to improve search result snippets
- Added structured data for better search engine understanding
- Fixed link text to be more descriptive
- [etc.]

---

## What Requires Your Action

The following items affect your store's scores but cannot be fixed in the theme code. They are caused by third-party apps or services installed on your store.

| App/Service | Impact | Category | Our Recommendation |
|-------------|--------|----------|-------------------|
| [App name] | Adds [X]ms to page load | Performance | [Remove if unused / Contact vendor / Accept trade-off] |
| [App name] | [Accessibility issue] | Accessibility | [Action needed] |

**Why these matter:** Third-party apps inject their own code into every page of your store. Even if you don't see the app on a particular page, its code may still load. Each app adds to the total time customers wait for your page to become interactive.

**What you can do:**
1. Review each app listed above and determine if it's still needed
2. For apps you want to keep, contact the app developer and ask about performance-optimized versions
3. For apps with significant impact that are rarely used, consider alternatives or removal

---

## Technical Details

### Files Modified
- `[file path]` — [brief description of change]

### Standards Applied
- Image Performance — responsive images, lazy loading, LCP optimization
- CSS Performance — critical CSS, async loading
- JavaScript Performance — defer, code splitting
- Accessibility — alt text, headings, ARIA, labels
- SEO — meta tags, structured data, crawlability
- [etc.]

---

## Remaining Opportunities

These are items that were not addressed in this round:

[List any Category A items that weren't implemented and why]
[List any targets not met and likely reasons]

---

## Notes

- Performance scores can vary 5-10 points between tests due to network conditions and server load
- Scores reflect the state of the store at the time of testing — installing new apps or making significant content changes may affect scores
- Mobile performance scores are typically lower than desktop due to simulated slower network conditions
- Accessibility and SEO scores are more stable between test runs than Performance

---

*Report generated with Shopify Performance Standards plugin*
```

### Step 3: Confirm Report Location
Tell the user:

```
Performance report saved to `performance-report.md`.

This report is ready to share with the client. It covers:
- Before/after comparisons across all 4 categories
- What was fixed (in plain language)
- What the client needs to handle (third-party apps)
- Technical details of files changed

Run `/capture` to extract learnings from this optimization for future reference.
```

## Rules
- Write for a non-technical audience — explain LCP, CLS, TBT in parentheses
- Be honest about results — don't exaggerate improvements
- Clearly separate what we fixed from what the client needs to handle
- Include ALL 4 categories — not just Performance
- Include specific app/script names in the client action section
- Always save the report as a markdown file in the project root
- If before/after data is incomplete, still generate the report with available data and note what's missing
- Keep the technical details section brief
