---
description: Re-run PageSpeed Insights after optimization across all 4 categories (Performance, Accessibility, Best Practices, SEO). Compare before/after. Triggers next optimization round if targets not met.
allowed-tools: Read, Glob, Grep, mcp__psi__get_full_audit
---

# Verify — Before/After Comparison (All Categories)

You are entering the Verify phase. Your job is to re-run PageSpeed Insights on the same URL, compare against the baseline across ALL 4 categories, and determine whether targets are met.

## Targets
| Category | Mobile | Desktop |
|----------|--------|---------|
| Performance | 70+ | 85+ |
| Best Practices | 90+ | 90+ |
| Accessibility | 90+ | 90+ |
| SEO | 90+ | 90+ |

## Input
What to verify: `$ARGUMENTS`

If no URL is provided, look for the URL from the previous `/audit` step in the conversation.

## Process

### Step 1: Confirm Changes Are Live
Tell the user:

> Running verification. Make sure your latest changes have been pushed — PSI tests the live/preview URL, not local code.
>
> **Preview URL note:** If testing a preview theme, use the full URL with `?preview_theme_id=XXXX`. Password-protected storefronts will fail — the store password must be removed for PSI to access the page.

Proceed immediately — do not wait for confirmation (code auto-pushes).

### Step 2: Note the Before Scores
Look back in the conversation for ALL category scores from the `/audit` step:
- Performance: Mobile [X], Desktop [X]
- Best Practices: Mobile [X], Desktop [X]
- Accessibility: Mobile [X], Desktop [X]
- SEO: Mobile [X], Desktop [X]
- Core Web Vitals: LCP, CLS, TBT, FCP, SI

If no previous audit data exists, tell the user and proceed without comparison.

### Step 3: Run New Audit
Call `get_full_audit` twice (all 4 categories by default):

1. `get_full_audit` with `url` and `strategy: "mobile"`
2. `get_full_audit` with `url` and `strategy: "desktop"`

### Step 4: Present Full Comparison

```
## Verification Results — Round [X]

**URL:** [the URL tested]

### Score Comparison — All Categories
| Category | Mobile Before | Mobile After | Change | Target | Met? | Desktop Before | Desktop After | Change | Target | Met? |
|----------|-------------|-------------|--------|--------|------|---------------|--------------|--------|--------|------|
| Performance | [X] | [X] | [+/-] | 70+ | [Y/N] | [X] | [X] | [+/-] | 85+ | [Y/N] |
| Best Practices | [X] | [X] | [+/-] | 90+ | [Y/N] | [X] | [X] | [+/-] | 90+ | [Y/N] |
| Accessibility | [X] | [X] | [+/-] | 90+ | [Y/N] | [X] | [X] | [+/-] | 90+ | [Y/N] |
| SEO | [X] | [X] | [+/-] | 90+ | [Y/N] | [X] | [X] | [+/-] | 90+ | [Y/N] |

### Core Web Vitals
| Metric | Before (M) | After (M) | Change | Before (D) | After (D) | Change | Target |
|--------|------------|-----------|--------|------------|-----------|--------|--------|
| LCP | [X]s | [X]s | [+/-] | [X]s | [X]s | [+/-] | < 2.5s |
| CLS | [X] | [X] | [+/-] | [X] | [X] | [+/-] | < 0.1 |
| TBT | [X]ms | [X]ms | [+/-] | [X]ms | [X]ms | [+/-] | < 200ms |
| FCP | [X]s | [X]s | [+/-] | [X]s | [X]s | [+/-] | < 1.8s |
| SI | [X]s | [X]s | [+/-] | [X]s | [X]s | [+/-] | < 3.4s |

### Audits Fixed
[List all audits that were failing before and pass now — across all categories]

### Audits Still Failing
[List all audits that still fail — across all categories]

### Regressions
[Any new failures, or "None"]

### Target Assessment
**[X] of 8 targets met.**
- Performance Mobile: [Met/Not met — gap of X]
- Performance Desktop: [Met/Not met — gap of X]
- Best Practices Mobile: [Met/Not met]
- Best Practices Desktop: [Met/Not met]
- Accessibility Mobile: [Met/Not met]
- Accessibility Desktop: [Met/Not met]
- SEO Mobile: [Met/Not met]
- SEO Desktop: [Met/Not met]
```

### Step 5: Determine Next Action

**If ALL 8 targets met:**
> All targets achieved! Run `/report` to generate a client-facing report.

**If some targets NOT met AND this is round 1-4:**
> [X] of 8 targets not yet met. Starting optimization round [X+1].
>
> Unmet targets:
> [list with current scores and gaps]
>
> I'll re-diagnose the remaining failures and apply additional fixes.

Then immediately proceed:
1. Call the PSI tools to get updated failing audits for the unmet categories
2. Map new failures to codebase fixes
3. Execute the next round of fixes (same process as `/optimize`)
4. Run `/verify` again after fixes are applied

**If round 5 AND targets still not met:**
> After 5 optimization rounds, the following targets are still not met:
> [list unmet targets]
>
> This is likely due to:
> - Third-party apps/scripts (Category B) — these need client action
> - PSI score variability (5-10 points between runs)
> - Shopify platform limitations (Category C)
>
> Options:
> 1. Continue optimizing (diminishing returns likely)
> 2. Run `/report` with current results and flag unmet targets
> 3. Review Category B items — removing problematic third-party apps may be the biggest remaining lever

**If scores went DOWN:**
> Scores decreased in [categories]. Possible causes:
> - Preview URL doesn't reflect latest changes
> - A fix introduced a regression (check "Regressions" above)
> - PSI test variability
>
> Recommend re-running `/verify` before rolling back changes. PSI scores can vary 5-10 points between runs.

## Important Notes
- PageSpeed scores can vary 5-10 points between runs. A single test is not definitive.
- If scores look unexpected, suggest running `/verify` again.
- Focus on Core Web Vitals improvements (LCP, CLS, TBT) more than the overall Performance score.
- Best Practices, Accessibility, and SEO are usually easier to hit 90+ than Performance.

## Rules
- Do NOT block on deployment confirmation — code auto-pushes. Just remind the user and proceed.
- Always check ALL 4 categories, not just Performance
- Compare against the original baseline from `/audit`, not the previous round
- Mark each target as met or not met — be explicit
- If targets are not met and round < 5, DO NOT suggest stopping — continue iterating
- Be honest about variability — don't oversell small changes
