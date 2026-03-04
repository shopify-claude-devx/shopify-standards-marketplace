---
description: Fetch a full Google PageSpeed Insights report for a Shopify page URL. Tests both mobile and desktop. Use as the first step in the performance optimization workflow.
allowed-tools: Read, Bash, Glob, Grep
---

# Audit — PageSpeed Insights Data Fetching

You are entering the Audit phase. Your job is to fetch comprehensive performance data from Google PageSpeed Insights for a single page URL. Do NOT fix anything. Do NOT diagnose. Only fetch and present the data.

## Input
The URL to audit: `$ARGUMENTS`

If no URL is provided, ask the user for the page URL before proceeding.

## Process

### Step 1: Validate the URL
Check that the URL is accessible:
- Must be a publicly accessible URL (preview links, `.myshopify.com`, or custom domain)
- If it's a password-protected preview, warn the user that PSI cannot access it

### Step 2: Fetch Mobile Report
Run the PageSpeed Insights API for mobile:

```bash
curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$URL', safe=''))")&strategy=mobile&category=performance" -o /tmp/psi-mobile.json
```

If the response contains an error, report it and suggest the user check the URL or try again.

**Note:** This API call can take 15-30 seconds. Let the user know it's running.

### Step 3: Fetch Desktop Report
Run the same for desktop:

```bash
curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$URL', safe=''))")&strategy=desktop&category=performance" -o /tmp/psi-desktop.json
```

### Step 4: Parse and Present Results

Extract the key data from both JSON responses and present:

```
## PageSpeed Audit Results

**URL:** [the URL tested]
**Tested:** [timestamp]

### Scores
| Metric | Mobile | Desktop |
|--------|--------|---------|
| Performance Score | [0-100] | [0-100] |

### Core Web Vitals
| Metric | Mobile | Desktop | Target |
|--------|--------|---------|--------|
| LCP (Largest Contentful Paint) | [value] | [value] | < 2.5s |
| CLS (Cumulative Layout Shift) | [value] | [value] | < 0.1 |
| TBT (Total Blocking Time) | [value] | [value] | < 200ms |
| FCP (First Contentful Paint) | [value] | [value] | < 1.8s |
| SI (Speed Index) | [value] | [value] | < 3.4s |

### Failed Audits (Opportunities)
List every audit with a score < 1 (not passing), grouped by impact:

**High Impact:**
- [audit title] — [displayValue] — [description summary]

**Medium Impact:**
- [audit title] — [displayValue] — [description summary]

**Low Impact:**
- [audit title] — [displayValue] — [description summary]

### Passed Audits
- [List audits that passed — brief titles only]

### Diagnostics
List diagnostic audits (informational, no score):
- [diagnostic title] — [displayValue]
```

### Step 5: Save Raw Data
Save the raw JSON responses for `/diagnose` to use:

```bash
# Save to project directory for diagnose command
mkdir -p .claude/performance
cp /tmp/psi-mobile.json .claude/performance/audit-mobile.json
cp /tmp/psi-desktop.json .claude/performance/audit-desktop.json
```

Tell the user:
```
Raw audit data saved to `.claude/performance/` for the diagnose step.
```

### Step 6: Hand Off
After presenting the results:

> Review the audit results above. When ready, run `/diagnose` to map these findings to specific Shopify theme fixes.

## Parsing Guide

### Where to Find Key Data in PSI JSON

```
Performance Score:
  .lighthouseResult.categories.performance.score (multiply by 100)

Core Web Vitals:
  .lighthouseResult.audits["largest-contentful-paint"].displayValue
  .lighthouseResult.audits["cumulative-layout-shift"].displayValue
  .lighthouseResult.audits["total-blocking-time"].displayValue
  .lighthouseResult.audits["first-contentful-paint"].displayValue
  .lighthouseResult.audits["speed-index"].displayValue

Failed Audits (opportunities + diagnostics):
  .lighthouseResult.audits[*] where .score < 1 and .score != null

Audit Details:
  .lighthouseResult.audits[audit-id].title
  .lighthouseResult.audits[audit-id].displayValue
  .lighthouseResult.audits[audit-id].description
  .lighthouseResult.audits[audit-id].details.items[] (specific resources/elements flagged)
```

### Impact Classification
- **High:** LCP, render-blocking resources, unused JS/CSS, image optimization
- **Medium:** Font display, preconnect, efficient cache, image dimensions
- **Low:** Minor diagnostics, informational audits

## Rules
- Never diagnose or suggest fixes during audit — only present data
- Always test both mobile AND desktop
- Always save the raw JSON for `/diagnose`
- If the API returns a rate limit error, tell the user to wait 60 seconds and try again
- If the API returns an error about the URL not being accessible, tell the user to check the URL is publicly accessible
- Present numbers clearly — seconds for time metrics, scores out of 100
