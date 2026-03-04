---
description: Fetch a full Google PageSpeed Insights report for a Shopify page URL. Tests both mobile and desktop. Use as the first step in the performance optimization workflow.
allowed-tools: Read, Glob, Grep, mcp__psi__analyze_page_speed, mcp__psi__get_performance_summary
---

# Audit — PageSpeed Insights Data Fetching

You are entering the Audit phase. Your job is to fetch comprehensive performance data from Google PageSpeed Insights for a single page URL. Do NOT fix anything. Do NOT diagnose. Only fetch and present the data.

## Input
The URL to audit: `$ARGUMENTS`

If no URL is provided, ask the user for the page URL before proceeding.

## Process

### Step 1: Validate the URL
- Must start with `http://` or `https://`
- Must be publicly accessible (`.myshopify.com`, custom domain, or preview link)
- If password-protected, warn the user: PSI cannot access password-protected pages

### Step 2: Fetch Both Reports
Call `analyze_page_speed` twice — once for each strategy:

1. `analyze_page_speed` with `url` and `strategy: "mobile"`
2. `analyze_page_speed` with `url` and `strategy: "desktop"`

Each call returns:
- Performance score
- Core Web Vitals (LCP, CLS, TBT, FCP, SI) with values and targets
- Failed audits with specific flagged resources
- Optimization opportunities

**Note:** Each API call takes 15-30 seconds.

### Step 3: Present Combined Results
After both calls return, combine the results into a single summary:

```
## Audit Results

**URL:** [the URL tested]

### Score Summary
| | Mobile | Desktop |
|--|--------|---------|
| Performance | [X]/100 | [X]/100 |

### Core Web Vitals
| Metric | Mobile | Desktop | Target |
|--------|--------|---------|--------|
| LCP | [X]s | [X]s | < 2.5s |
| CLS | [X] | [X] | < 0.1 |
| TBT | [X]ms | [X]ms | < 200ms |
| FCP | [X]s | [X]s | < 1.8s |
| SI | [X]s | [X]s | < 3.4s |

### Failed Audits
[List from both reports, grouped by impact]
```

### Step 4: Hand Off
After presenting the results:

> Review the audit results above. When ready, run `/diagnose` to map these findings to specific Shopify theme fixes.

## Alternative: Single Strategy
If the user only wants one strategy (e.g., just mobile), call `analyze_page_speed` once with the requested strategy.

## Rules
- Never diagnose or suggest fixes during audit — only present data
- Always test both mobile AND desktop
- If the tool returns an error about rate limits, tell the user to wait 60 seconds or check their API key
- If the tool returns an error about the URL not being accessible, tell the user to check the URL
- Present numbers clearly — seconds for time metrics, scores out of 100
- Note the scores in conversation — they'll be needed for `/verify` before/after comparison
