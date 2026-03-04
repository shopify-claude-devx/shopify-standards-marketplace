---
description: Re-run PageSpeed Insights after optimization and compare before/after scores. Use after /optimize to validate improvements.
allowed-tools: Read, Bash, Glob, Grep
---

# Verify — Before/After Comparison

You are entering the Verify phase. Your job is to re-run PageSpeed Insights on the same URL and compare the results against the pre-optimization baseline. Present a clear before/after comparison.

## Input
What to verify: `$ARGUMENTS`

If no URL is provided, look for the URL from the previous `/audit` step in the conversation or in `.claude/performance/audit-mobile.json`.

## Process

### Step 1: Confirm the Page is Updated
Ask the user:

> Before re-testing, confirm that the optimized theme is deployed to the preview URL. PageSpeed Insights tests the live URL — local changes won't be reflected.
>
> Is the preview URL ready to test?

Wait for confirmation before proceeding.

### Step 2: Read Baseline Data
Read the original audit data:
```bash
cat .claude/performance/audit-mobile.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
lr = data['lighthouseResult']
score = lr['categories']['performance']['score'] * 100
lcp = lr['audits']['largest-contentful-paint']['displayValue']
cls = lr['audits']['cumulative-layout-shift']['displayValue']
tbt = lr['audits']['total-blocking-time']['displayValue']
fcp = lr['audits']['first-contentful-paint']['displayValue']
si = lr['audits']['speed-index']['displayValue']
print(f'Mobile - Score: {score}, LCP: {lcp}, CLS: {cls}, TBT: {tbt}, FCP: {fcp}, SI: {si}')
"
```

Do the same for desktop.

### Step 3: Run New Audit
Fetch fresh PSI data for both mobile and desktop (same process as `/audit`):

```bash
curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$URL', safe=''))")&strategy=mobile&category=performance" -o /tmp/psi-mobile-after.json
```

```bash
curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$URL', safe=''))")&strategy=desktop&category=performance" -o /tmp/psi-desktop-after.json
```

### Step 4: Parse New Results
Extract the same metrics from the new data.

### Step 5: Save Post-Optimization Data
```bash
cp /tmp/psi-mobile-after.json .claude/performance/verify-mobile.json
cp /tmp/psi-desktop-after.json .claude/performance/verify-desktop.json
```

### Step 6: Present Comparison

```
## Verification Results

**URL:** [the URL tested]
**Tested:** [timestamp]

### Score Comparison
| Metric | Mobile Before | Mobile After | Change | Desktop Before | Desktop After | Change |
|--------|---------------|--------------|--------|----------------|---------------|--------|
| Performance | [X] | [X] | [+/-X] | [X] | [X] | [+/-X] |

### Core Web Vitals Comparison
| Metric | Mobile Before | Mobile After | Change | Desktop Before | Desktop After | Change | Target |
|--------|---------------|--------------|--------|----------------|---------------|--------|--------|
| LCP | [X]s | [X]s | [+/-] | [X]s | [X]s | [+/-] | < 2.5s |
| CLS | [X] | [X] | [+/-] | [X] | [X] | [+/-] | < 0.1 |
| TBT | [X]ms | [X]ms | [+/-] | [X]ms | [X]ms | [+/-] | < 200ms |
| FCP | [X]s | [X]s | [+/-] | [X]s | [X]s | [+/-] | < 1.8s |
| SI | [X]s | [X]s | [+/-] | [X]s | [X]s | [+/-] | < 3.4s |

### Audits Fixed
- [audit name] — was [before], now [after] ✅

### Audits Still Failing
- [audit name] — [current value] — [reason: Category B/C or needs more work]

### Summary
[2-3 sentences: What improved, what's still an issue, and whether the optimization was successful]
```

### Step 7: Recommend Next Steps

Based on the results:

**If significant improvement:**
> Optimization successful. Run `/report` to generate a client-facing report with before/after comparisons.

**If minimal improvement:**
> Results are modest. This could be due to:
> - Third-party scripts dominating the performance budget (Category B issues)
> - PageSpeed variability (scores can fluctuate 5-10 points between runs)
> - Changes not yet reflected on the preview URL
>
> Consider running `/verify` again to confirm, or review the Category B items from `/diagnose`.

**If scores went down:**
> Scores decreased. Possible causes:
> - The preview URL doesn't reflect the latest changes
> - A fix introduced a regression (check: did CSS async loading break above-fold rendering?)
> - PageSpeed test variability
>
> Recommend re-running the test, or investigating specific regressions.

## Important Notes
- PageSpeed scores can vary 5-10 points between runs. A single test is not definitive.
- If scores look unexpected, suggest running the test 2-3 times and averaging.
- Focus on Core Web Vitals improvements (LCP, CLS, TBT) more than the overall score — the score is derived from these metrics.

## Rules
- Always confirm the preview is updated before testing
- Always compare against the baseline from `/audit` — never from memory
- Present both mobile and desktop
- Be honest about variability — don't oversell small changes
- Save post-optimization data for the `/report` command
