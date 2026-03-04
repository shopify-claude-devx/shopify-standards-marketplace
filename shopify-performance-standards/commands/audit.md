---
description: Fetch a full Google PageSpeed Insights report for a Shopify page URL. Tests both mobile and desktop. Use as the first step in the performance optimization workflow.
allowed-tools: Read, Glob, Grep, mcp__psi__psi_audit, mcp__psi__psi_audit_full
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
Call `psi_audit_full` with the URL. This fetches both mobile and desktop reports in one call, parses the results, and saves the raw data to `.claude/performance/`.

The tool returns:
- Performance scores (mobile + desktop)
- Core Web Vitals (LCP, CLS, TBT, FCP, SI) with values and targets
- Failed audits grouped by impact (High / Medium / Low) with specific flagged resources
- Third-party script breakdown with blocking time and transfer size
- Combined summary table

**Note:** Each API call takes 15-30 seconds. The tool runs both sequentially.

### Step 3: Review the Results
After the tool returns, review the output and verify:
- Both mobile and desktop reports were fetched successfully
- If either failed, report the error to the user
- Note the save location for the raw data files

### Step 4: Present and Hand Off
The tool output is already formatted. Present it to the user, then:

> Review the audit results above. When ready, run `/diagnose` to map these findings to specific Shopify theme fixes.

## Alternative: Single Strategy
If the user only wants one strategy (e.g., just mobile), use `psi_audit` with `strategy: "mobile"` or `strategy: "desktop"` instead of `psi_audit_full`.

## Rules
- Never diagnose or suggest fixes during audit — only present data
- Always test both mobile AND desktop (use `psi_audit_full`)
- If the tool returns an error about rate limits, tell the user to wait 60 seconds
- If the tool returns an error about the URL not being accessible, tell the user to check the URL
- Present numbers clearly — seconds for time metrics, scores out of 100
