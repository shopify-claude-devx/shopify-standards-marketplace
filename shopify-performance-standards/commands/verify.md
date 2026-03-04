---
description: Re-run PageSpeed Insights after optimization and compare before/after scores. Use after /optimize to validate improvements.
allowed-tools: Read, Glob, Grep, mcp__psi__analyze_page_speed, mcp__psi__get_performance_summary
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

### Step 2: Note the Before Scores
Look back in the conversation for the scores from the `/audit` step. Record:
- Mobile score, LCP, CLS, TBT, FCP, SI
- Desktop score, LCP, CLS, TBT, FCP, SI
- List of failed audits

If no previous audit data exists in the conversation, tell the user:
> No baseline scores found. I'll run a fresh audit, but I won't be able to show a before/after comparison. Consider running `/audit` first next time.

### Step 3: Run New Audit
Call `analyze_page_speed` twice with the same URL:

1. `analyze_page_speed` with `url` and `strategy: "mobile"`
2. `analyze_page_speed` with `url` and `strategy: "desktop"`

### Step 4: Present Before/After Comparison
Combine the before (from conversation) and after (from new audit) into a comparison:

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
| Metric | Before (M) | After (M) | Change | Before (D) | After (D) | Change |
|--------|------------|-----------|--------|------------|-----------|--------|
| LCP | [X]s | [X]s | [+/-] | [X]s | [X]s | [+/-] |
| CLS | [X] | [X] | [+/-] | [X] | [X] | [+/-] |
| TBT | [X]ms | [X]ms | [+/-] | [X]ms | [X]ms | [+/-] |
| FCP | [X]s | [X]s | [+/-] | [X]s | [X]s | [+/-] |
| SI | [X]s | [X]s | [+/-] | [X]s | [X]s | [+/-] |

### Audits Fixed
[Audits that were failing before but pass now]

### Audits Still Failing
[Audits that still fail]

### Regressions
[Any new failures, or "None"]

### Target Assessment
| | Mobile | Desktop |
|--|--------|---------|
| Target | 70+ | 85+ |
| Achieved | [Yes/No] | [Yes/No] |

### Summary
[2-3 sentences: What improved, what's still an issue, whether targets were met]
```

### Step 5: Recommend Next Steps

**If targets met (Mobile 70+ and Desktop 85+):**
> Targets achieved! Run `/report` to generate a client-facing report with before/after comparisons.

**If significant improvement (score +10 or more) but targets not met:**
> Good progress but targets not yet met (Mobile 70+ / Desktop 85+). Review remaining Category A items from `/diagnose` or consider another `/optimize` pass.

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
> - A fix introduced a regression (check the "Regressions" section)
> - PageSpeed test variability
>
> Recommend re-running the test or investigating specific regressions.

## Important Notes
- PageSpeed scores can vary 5-10 points between runs. A single test is not definitive.
- If scores look unexpected, suggest running `/verify` again and averaging.
- Focus on Core Web Vitals improvements (LCP, CLS, TBT) more than the overall score.

## Rules
- Always confirm the preview is updated before testing
- Compare using the before scores from the `/audit` step in conversation
- Present both mobile and desktop
- Be honest about variability — don't oversell small changes
- Mark each metric as "improved", "same", or "regressed" for clarity
