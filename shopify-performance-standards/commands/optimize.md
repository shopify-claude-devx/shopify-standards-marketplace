---
description: Execute performance fixes from the diagnosis, TODO by TODO. Use after /diagnose when the fix list is confirmed. Follows performance skill standards strictly.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Optimize — Performance Fix Execution

You are entering the Optimize phase. Your job is to execute the diagnosed performance fixes, one by one, following performance skill standards precisely. Only fix what was diagnosed. Do not add unrelated improvements.

## Input
The fixes to implement: `$ARGUMENTS`

## Pre-Optimize Checks

### Check 1: Does a Diagnosis Exist?
Look for a confirmed diagnosis from `/diagnose` in the conversation. If none exists:

> No diagnosis found. Run `/diagnose` first to identify and prioritize performance issues.

Do NOT proceed without a diagnosis unless the user explicitly overrides.

### Check 2: Load Performance Standards — MANDATORY
Before writing ANY code, read ALL skill files:
- `image-performance` — lazy loading, srcset, sizes, LCP images, preloading, Shopify CDN
- `css-performance` — critical CSS, async loading, unused CSS, containment, inline style patterns
- `js-performance` — defer, async, code splitting, idle-time execution, unused JS
- `font-performance` — font-display, preloading, font file count, system fallbacks
- `liquid-performance` — render time, N+1 loops, caching, DOM size, pagination
- `layout-stability` — CLS prevention, dimensions, aspect-ratio, skeleton placeholders

Also read `.claude/patterns-learned.md` if it exists.

**If you cannot find or read a skill file, STOP and tell the user.**

## Optimize Process

### Execute Fix by Fix
Work through the diagnosed Category A fixes in priority order. For each fix:

1. **Announce the fix** — one line stating what you're about to do

2. **Identify which skills apply:**
   - Image changes → apply `image-performance` standards
   - CSS loading changes → apply `css-performance` standards
   - JS loading changes → apply `js-performance` standards
   - Font changes → apply `font-performance` standards
   - Liquid template changes → apply `liquid-performance` standards
   - Layout/dimension changes → apply `layout-stability` standards

3. **Write the fix** — following the diagnosis approach and skill standards

4. **Per-fix validation** — verify the fix against the relevant checklist:

#### Image Fix Checklist:
- [ ] `loading="lazy"` on all below-fold images
- [ ] `loading="eager"` + `fetchpriority="high"` on LCP image only
- [ ] `width` and `height` attributes on every `<img>`
- [ ] `srcset` with appropriate widths for responsive images
- [ ] `sizes` attribute reflects actual rendered size
- [ ] Using `image_url` filter — not hardcoded CDN URLs
- [ ] Requested image size matches rendered size (not oversized)

#### CSS Fix Checklist:
- [ ] Above-fold CSS preloaded
- [ ] Below-fold CSS loaded async (media="print" + onload pattern)
- [ ] Section CSS loaded only when section is present
- [ ] No unnecessary `<style>` tags (dynamic schema values use CSS custom properties)
- [ ] No `@import` in CSS files

#### JS Fix Checklist:
- [ ] All `<script>` tags have `defer` (or `async` for third-party)
- [ ] No inline `<script>` blocks — data passed via `data-` attributes
- [ ] Section-specific JS loaded only in that section
- [ ] Conditional feature JS loaded only when feature is enabled
- [ ] Non-critical JS deferred to `requestIdleCallback`

#### Font Fix Checklist:
- [ ] All `@font-face` declarations have `font-display: swap` (or `optional`)
- [ ] Maximum 2 font files preloaded
- [ ] `crossorigin` on font preload links
- [ ] Unused font weights/styles removed
- [ ] Preconnect to font origins in `<head>`

#### Liquid Fix Checklist:
- [ ] Expensive lookups assigned once, not repeated
- [ ] Assigns moved outside loops
- [ ] Collections paginated
- [ ] Conditional rendering prevents unused DOM nodes

#### CLS Fix Checklist:
- [ ] Every `<img>` has width/height
- [ ] Every `<video>` and `<iframe>` has width/height
- [ ] Containers with dynamic content have `min-height` or `aspect-ratio`
- [ ] Animations use `transform` not layout properties
- [ ] Font fallbacks have `size-adjust`

**If a fix fails a checklist item, correct it NOW before moving to the next fix.**

5. **Move to the next fix**

### If You Encounter a Problem
**Minor:** Solve inline, note what you did. Continue.
**Medium:** Pause, explain, get user confirmation, continue.
**Major:** Stop. Suggest re-running `/diagnose` with new information.

## Post-Optimize

After all fixes are applied:

```
## Optimization Complete

**Fixes Applied:** [X/X]

**Files Modified:**
- `path/to/file` — [what was changed]

**Per-Fix Validation:** [All passed / Issues found and fixed]

**Any Deviations from Diagnosis:**
- [What changed and why, or "None"]

**Ready for Verification:**
Run `/verify` to re-test PageSpeed and compare before/after scores.
```

## Rules
- Only fix what was diagnosed — no bonus optimizations
- Follow performance skill standards for every change
- Validate each fix against the relevant checklist before moving on
- Don't break existing functionality for performance gains
- If a fix requires changing a shared file (theme.liquid, base styles), be extra careful about side effects
- If a fix conflicts with another (e.g., preloading a font AND removing it), resolve the conflict before proceeding
- Keep the user informed of progress — announce each fix before starting it
