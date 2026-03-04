---
description: Re-run PageSpeed Insights after optimization and compare before/after scores. Use after /optimize to validate improvements.
allowed-tools: Read, Glob, Grep, mcp__psi__psi_audit_full, mcp__psi__psi_compare
---

# Verify — Before/After Comparison

You are entering the Verify phase. Your job is to re-run PageSpeed Insights on the same URL and compare the results against the pre-optimization baseline. Present a clear before/after comparison.

## Input
What to verify: `$ARGUMENTS`

If no URL is provided, look for the URL from the previous `/audit` step in the conversation.

## Process

### Step 1: Confirm the Page is Updated
Ask the user:

> Before re-testing, confirm that the optimized theme is deployed to the preview URL. PageSpeed Insights tests the live URL — local changes won't be reflected.
>
> Is the preview URL ready to test?

Wait for confirmation before proceeding.

### Step 2: Run New Audit
Call `psi_audit_full` with the same URL that was originally audited. This fetches fresh mobile + desktop reports and saves them to `.claude/performance/`.

The MCP server automatically saves each audit with a timestamp, so both the old (before) and new (after) audits coexist in storage.

### Step 3: Compare Results
Call `psi_compare` for **both** strategies:

1. `psi_compare` with `url` and `strategy: "mobile"` — compares the two most recent mobile audits
2. `psi_compare` with `url` and `strategy: "desktop"` — compares the two most recent desktop audits

The tool returns:
- Score delta (before → after)
- Core Web Vitals delta for each metric (with improved/regressed/same status)
- Audits that were fixed (previously failing, now passing)
- Audits that regressed (new failures)
- Audits still failing

### Step 4: Present Combined Comparison
Combine the mobile and desktop comparisons into a single view:

```
## Verification Results

**URL:** [the URL tested]

### Score Comparison
| | Mobile | Desktop |
|--|--------|---------|
| Before | [X]/100 | [X]/100 |
| After | [X]/100 | [X]/100 |
| Change | [+/-X] | [+/-X] |

### Core Web Vitals
[Include the detailed tables from both psi_compare results]

### Audits Fixed
[Combined list from both strategies]

### Audits Still Failing
[Combined list]

### Regressions
[Any new failures, or "None"]

### Summary
[2-3 sentences: What improved, what's still an issue, whether the optimization was successful]
```

### Step 5: Recommend Next Steps

**If significant improvement (score +10 or more):**
> Optimization successful. Run `/report` to generate a client-facing report with before/after comparisons.

**If minimal improvement (score +1 to +9):**
> Results are modest. This could be due to:
> - Third-party scripts dominating the performance budget (Category B issues)
> - PageSpeed variability (scores can fluctuate 5-10 points between runs)
> - Changes not yet reflected on the preview URL
>
> Consider running `/verify` again to confirm, or review the Category B items from `/diagnose`.

**If scores went down:**
> Scores decreased. Possible causes:
> - The preview URL doesn't reflect the latest changes
> - A fix introduced a regression (check the "Audits Regressed" section)
> - PageSpeed test variability
>
> Recommend re-running the test or investigating specific regressions.

## Important Notes
- PageSpeed scores can vary 5-10 points between runs. A single test is not definitive.
- If scores look unexpected, suggest running `/verify` again and averaging.
- Focus on Core Web Vitals improvements (LCP, CLS, TBT) more than the overall score.

## Rules
- Always confirm the preview is updated before testing
- Always use `psi_compare` to compute deltas — never compare from memory
- Present both mobile and desktop
- Be honest about variability — don't oversell small changes
- If `psi_compare` returns an error about needing 2 audits, the before-audit may be missing — tell the user to check `.claude/performance/`
