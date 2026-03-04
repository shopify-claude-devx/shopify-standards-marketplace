---
description: Map PageSpeed Insights audit results to specific Shopify theme fixes. Separates what we can fix from what requires client action. Use after /audit.
allowed-tools: Read, Grep, Glob, mcp__psi__psi_opportunities
---

# Diagnose — Performance Issue Mapping

You are entering the Diagnose phase. Your job is to take the PageSpeed Insights data and map every failed audit to a specific, actionable Shopify theme fix. Separate what we can fix in code from what the client needs to handle. Do NOT write code. Do NOT fix anything yet.

## Input
What to diagnose: `$ARGUMENTS`

If no context, look for audit results from a previous `/audit` step in the conversation. If none exist, ask the user to run `/audit` first.

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

### Step 2: Get Opportunities Data
Call `psi_opportunities` for both mobile and desktop to get the detailed failed audits with specific flagged resources.

The tool returns:
- All failed audits sorted by severity (worst first)
- Audit IDs (needed for mapping to skill standards)
- Specific flagged resources (URLs, DOM elements, wasted bytes/ms)
- Third-party script breakdown

If no stored audit exists, the tool will fetch a fresh one.

### Step 3: Research the Codebase
For each failed audit, search the codebase to find the specific files and code patterns causing the issue:

- **render-blocking-resources** → find `<link>` and `<script>` tags in `layout/theme.liquid` and sections
- **unused-javascript / unused-css-rules** → find all asset references, check which sections use them
- **offscreen-images / uses-optimized-images / unsized-images** → find `<img>` tags missing dimensions, lazy loading, or srcset
- **font-display** → find `@font-face` declarations and font loading patterns
- **cumulative-layout-shift** → find images without dimensions, dynamic content injections
- **third-party-summary** → identify `<script>` tags from domains other than `cdn.shopify.com`

### Step 4: Classify Each Issue

**Category A: We Fix (Theme Code)**
Issues we can resolve by modifying theme files:
- Missing lazy loading on images (`offscreen-images`)
- Missing width/height attributes (`unsized-images`)
- Missing srcset/sizes (`uses-responsive-images`)
- Render-blocking CSS (`render-blocking-resources`) — can be made async
- Render-blocking JS — can be deferred
- Unused CSS/JS loaded globally (`unused-css-rules`, `unused-javascript`)
- Font loading improvements (`font-display`)
- CLS-causing patterns (`cumulative-layout-shift`)
- Liquid render optimizations
- Missing preconnect/preload hints (`uses-rel-preconnect`)

**Category B: Client Action (Third-Party)**
Issues from third-party apps/scripts — we flag these for the client report:
- App scripts causing TBT
- App-injected CSS/JS
- Marketing/analytics scripts
- Chat widgets, review widgets

**Category C: Platform (Shopify Infrastructure)**
Inherent to Shopify — cannot be changed:
- Shopify's base JS (`analytics.js`, `web-pixels-manager.js`)
- Shopify CDN response times

### Step 5: Prioritize Category A Fixes
Rank by estimated impact:
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
**PSI Audit:** [audit ID]
**Current:** [what's happening now — specific files/lines found in codebase]
**Fix:** [what we'll change — specific and actionable]
**Skill:** [which performance skill applies]
**Files:** [specific files to modify]
**Expected Impact:** [which CWV metric this improves]

#### 2. [Next Issue] — High Impact
...

[Continue for all Category A fixes...]

---

### Category B: Client Action Required

These issues are caused by third-party apps/scripts. Include in the client report.

| Source | Blocking Time | Transfer Size | Recommendation |
|--------|---------------|---------------|----------------|
| [App/script name] | [X]ms | [X]KB | [Remove / Contact vendor / Accept trade-off] |

---

### Category C: Platform (No Action)

These are inherent to Shopify and cannot be changed:
- [Item and brief explanation]

---

### Estimated Outcome
If all Category A fixes are implemented:
- **Mobile Score:** [current] → [estimated]
- **Desktop Score:** [current] → [estimated]

---

Ready to proceed? Run `/optimize` to execute these fixes.
```

## Rules
- Never suggest fixes you can't verify in the codebase — always search for the actual code
- Never propose fixing third-party scripts — classify them as Category B
- Always reference which performance skill standard applies to each fix
- Always identify the specific files and code causing each issue
- Be honest about impact estimates — they're rough, not guaranteed
- Prioritize by impact, not by ease of implementation
