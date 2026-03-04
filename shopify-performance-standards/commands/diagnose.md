---
description: Map PageSpeed Insights audit results to specific Shopify theme fixes. Separates what we can fix from what requires client action. Use after /audit.
allowed-tools: Read, Grep, Glob
---

# Diagnose — Performance Issue Mapping

You are entering the Diagnose phase. Your job is to take the raw PageSpeed Insights data and map every failed audit to a specific, actionable Shopify theme fix. Separate what we can fix in code from what the client needs to handle. Do NOT write code. Do NOT fix anything yet.

## Input
What to diagnose: `$ARGUMENTS`

If no context, look for:
1. Audit results from a previous `/audit` step in the conversation
2. Raw JSON files at `.claude/performance/audit-mobile.json` and `.claude/performance/audit-desktop.json`

If neither exists, ask the user to run `/audit` first.

## Process

### Step 1: Read Performance Skills — MANDATORY
Before diagnosing, read ALL skill files:
- `image-performance` — lazy loading, srcset, sizes, LCP images, Shopify CDN
- `css-performance` — critical CSS, async loading, unused CSS, containment
- `js-performance` — defer, async, code splitting, unused JS, third-party scripts
- `font-performance` — font-display, preloading, font file count, fallbacks
- `liquid-performance` — render time, N+1 loops, caching, DOM size
- `layout-stability` — CLS prevention, dimensions, aspect-ratio, placeholders

Also read `.claude/patterns-learned.md` if it exists — it contains project-specific learnings from previous optimizations.

**If you cannot find or read a skill file, STOP and tell the user.**

### Step 2: Read the Raw Audit Data
Read the saved JSON files and parse every failed audit:

```bash
# Read the detailed audit items
cat .claude/performance/audit-mobile.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
audits = data['lighthouseResult']['audits']
for key, audit in audits.items():
    if audit.get('score') is not None and audit['score'] < 1:
        print(f\"--- {key} (score: {audit['score']}) ---\")
        print(f\"Title: {audit['title']}\")
        print(f\"Value: {audit.get('displayValue', 'N/A')}\")
        if 'details' in audit and 'items' in audit['details']:
            for item in audit['details']['items'][:5]:
                print(f\"  Resource: {item}\")
        print()
"
```

### Step 3: Research the Codebase
For each failed audit, search the codebase to find the specific files and code patterns causing the issue:

- **Render-blocking resources** → find `<link>` and `<script>` tags in `layout/theme.liquid` and sections
- **Unused CSS/JS** → find all asset references, check which sections actually use them
- **Image issues** → find `<img>` tags missing dimensions, lazy loading, or srcset
- **Font issues** → find `@font-face` declarations and font loading patterns
- **CLS issues** → find images without dimensions, dynamic content injections
- **Third-party scripts** → identify `<script>` tags from domains other than `cdn.shopify.com`

### Step 4: Classify Each Issue

For every failed audit, classify it:

**Category A: We Fix (Theme Code)**
Issues we can resolve by modifying theme files:
- Missing lazy loading on images
- Missing width/height attributes
- Missing srcset/sizes
- Render-blocking CSS (can be made async)
- Render-blocking JS (can be deferred)
- Unused CSS loaded globally
- Font loading improvements
- CLS-causing patterns
- Liquid render optimizations
- Missing preconnect/preload hints

**Category B: Client Action (Third-Party)**
Issues that require the client to make decisions:
- Third-party app scripts causing TBT
- App-injected CSS/JS
- Marketing/analytics scripts
- Chat widgets
- External font services

**Category C: Platform (Shopify Infrastructure)**
Issues inherent to the Shopify platform:
- Shopify's base JS (`analytics.js`, `web-pixels-manager.js`)
- Shopify CDN response times
- Checkout performance

### Step 5: Prioritize Fixes

Rank Category A fixes by estimated impact:

**Impact Scoring:**
- LCP improvement → highest priority
- TBT reduction → high priority
- CLS reduction → high priority
- FCP improvement → medium priority
- File size reduction → medium priority
- Minor optimizations → low priority

### Step 6: Present Diagnosis

```
## Performance Diagnosis

**Page:** [URL]
**Current Scores:** Mobile [X] / Desktop [X]

---

### Category A: Fixes We'll Implement

Ordered by estimated impact (highest first):

#### 1. [Issue Title] — High Impact
**PSI Audit:** [audit name]
**Current:** [what's happening now — specific files/lines]
**Fix:** [what we'll change — specific and actionable]
**Skill:** [which performance skill applies]
**Files:** [specific files to modify]
**Expected Impact:** [which CWV metric this improves and rough estimate]

#### 2. [Issue Title] — High Impact
...

#### 3. [Issue Title] — Medium Impact
...

[Continue for all Category A fixes...]

---

### Category B: Client Action Required

These issues are caused by third-party apps/scripts. We cannot fix them in the theme code. Include in the client report.

| Source | Impact | Recommendation |
|--------|--------|----------------|
| [App/script name] | [TBT: +Xms] | [Remove, replace, or contact vendor] |

---

### Category C: Platform (No Action)

These are inherent to Shopify and cannot be changed:
- [Item and brief explanation]

---

### Estimated Outcome
If all Category A fixes are implemented:
- **Mobile Score:** [current] → [estimated] (rough estimate)
- **Desktop Score:** [current] → [estimated]
- **LCP:** [current] → [estimated improvement]

---

Ready to proceed? Run `/optimize` to execute these fixes.
```

## Rules
- Never suggest fixes you can't verify in the codebase — always check the actual code
- Never propose fixing third-party scripts — classify them as Category B
- Always reference which performance skill standard applies to each fix
- Always identify the specific files and code causing each issue
- Be honest about impact estimates — they're rough, not guaranteed
- If the audit data is incomplete or the codebase doesn't match expectations, say so
- Prioritize by impact, not by ease of implementation
