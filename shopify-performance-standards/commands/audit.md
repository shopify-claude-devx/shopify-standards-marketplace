---
description: Fetch a full Google PageSpeed Insights report for a Shopify page URL. Tests all 4 categories (Performance, Accessibility, Best Practices, SEO) on both mobile and desktop. Use as the first step in the performance optimization workflow.
allowed-tools: Read, Glob, Grep, mcp__psi__get_full_audit
---

# Audit — PageSpeed Insights Data Fetching

You are entering the Audit phase. Your job is to fetch comprehensive performance data from Google PageSpeed Insights for a single page URL across ALL 4 categories. Do NOT fix anything. Do NOT diagnose. Only fetch and present the data.

## Targets
| Category | Mobile | Desktop |
|----------|--------|---------|
| Performance | 70+ | 85+ |
| Best Practices | 90+ | 90+ |
| Accessibility | 90+ | 90+ |
| SEO | 90+ | 90+ |

## Input
The URL to audit: `$ARGUMENTS`

If no URL is provided, ask the user for the page URL before proceeding.

## Process

### Step 1: Validate the URL
- Must start with `http://` or `https://`
- Must be publicly accessible (`.myshopify.com`, custom domain, or preview link)
- If password-protected, warn the user: **PSI cannot access password-protected pages** — the store password must be removed first

**Preview theme URLs:** Users often work on unpublished themes. Preview URLs look like:
```
https://store-name.myshopify.com/?preview_theme_id=123456789
```
These work with PSI as long as the storefront is not password-protected. Accept these URLs as valid.

### Step 2: Fetch Both Reports
Call `get_full_audit` twice — once for each strategy. This tool defaults to all 4 categories (performance, accessibility, best-practices, seo).

1. `get_full_audit` with `url` and `strategy: "mobile"`
2. `get_full_audit` with `url` and `strategy: "desktop"`

Each call returns:
- Scores for all 4 categories
- Core Web Vitals (LCP, CLS, TBT, FCP, SI)
- ALL failing audits per category with specific details
- Third-party script breakdown

**Note:** Each API call takes 15-30 seconds.

### Step 3: Present Combined Results
Combine both reports into a single summary:

```
## Audit Results

**URL:** [the URL tested]

### Category Scores
| Category | Mobile | Target | Status | Desktop | Target | Status |
|----------|--------|--------|--------|---------|--------|--------|
| Performance | [X]/100 | 70+ | [Met/Gap: X] | [X]/100 | 85+ | [Met/Gap: X] |
| Best Practices | [X]/100 | 90+ | [Met/Gap: X] | [X]/100 | 90+ | [Met/Gap: X] |
| Accessibility | [X]/100 | 90+ | [Met/Gap: X] | [X]/100 | 90+ | [Met/Gap: X] |
| SEO | [X]/100 | 90+ | [Met/Gap: X] | [X]/100 | 90+ | [Met/Gap: X] |

### Core Web Vitals
| Metric | Mobile | Desktop | Target |
|--------|--------|---------|--------|
| LCP | [X]s | [X]s | < 2.5s |
| CLS | [X] | [X] | < 0.1 |
| TBT | [X]ms | [X]ms | < 200ms |
| FCP | [X]s | [X]s | < 1.8s |
| SI | [X]s | [X]s | < 3.4s |

### ALL Failing Audits — Performance
[List EVERY failing audit, not just high-impact ones]

### ALL Failing Audits — Best Practices
[List every failing audit]

### ALL Failing Audits — Accessibility
[List every failing audit]

### ALL Failing Audits — SEO
[List every failing audit]

### Target Assessment
[X of 8 targets met. List which are met and which need work.]
```

### Step 4: Hand Off
After presenting the results:

> Review the audit results above. When ready, run `/diagnose` to map ALL failing audits to specific Shopify theme fixes.

## Rules
- Never diagnose or suggest fixes during audit — only present data
- Always test both mobile AND desktop
- Always fetch ALL 4 categories — not just performance
- List EVERY failing audit — not just high-impact ones. Every single insight matters.
- If the tool returns an error about rate limits, tell the user to wait 60 seconds or check their API key
- If the tool returns an error about the URL not being accessible, tell the user to check the URL
- Note ALL scores in conversation — they're the baseline for `/verify`
