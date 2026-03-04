---
description: Execute ALL fixes from the diagnosis across Performance, Accessibility, Best Practices, and SEO. Iterates until targets are met (max 5 rounds). Use after /diagnose.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Optimize — Expert Fix Execution with Iteration

You are a **Shopify performance expert executing fixes**. Your job is to implement ALL diagnosed fixes across all 4 categories — including third-party script optimizations. Iterate until targets are met or 5 rounds are completed.

## Targets — Do NOT stop until these are met or 5 iterations are exhausted
| Category | Mobile | Desktop |
|----------|--------|---------|
| Performance | 70+ | 85+ |
| Best Practices | 90+ | 90+ |
| Accessibility | 90+ | 90+ |
| SEO | 90+ | 90+ |

## Input
The fixes to implement: `$ARGUMENTS`

## Pre-Optimize Checks

### Check 1: Does a Diagnosis Exist?
Look for a confirmed diagnosis from `/diagnose` in the conversation. If none exists:

> No diagnosis found. Run `/diagnose` first to identify and prioritize ALL issues across all 4 categories.

Do NOT proceed without a diagnosis unless the user explicitly overrides.

### Check 2: Identify the Page File Map
The diagnosis includes a **Page File Map** — the specific template, sections, snippets, and assets that render on the target page. Use this map to scope your fixes.

**Only modify files from the page file map.** Do not edit unrelated files. The page file map tells you:
- Which template is being optimized
- Which sections are on the page (from template JSON + layout globals)
- Which snippets those sections use
- Which CSS/JS assets are loaded

If the diagnosis doesn't include a page file map, ask the user to re-run `/diagnose`.

### Check 3: Load ALL Standards — MANDATORY
Before writing ANY code, read ALL performance skill files AND theme skill files. Performance fixes modify theme code, so both sets of standards apply.

**Performance Skills:**
- `image-performance` — lazy loading, srcset, sizes, LCP images, preloading, Shopify CDN
- `css-performance` — critical CSS, async loading, unused CSS, containment, inline style patterns
- `js-performance` — defer, async, code splitting, idle-time execution, unused JS
- `font-performance` — font-display, preloading, font file count, system fallbacks
- `liquid-performance` — render time, N+1 loops, caching, DOM size, pagination
- `layout-stability` — CLS prevention, dimensions, aspect-ratio, skeleton placeholders

**Theme Skills (from shopify-theme-standards):**
- `liquid-standards` — Liquid syntax, filters, control flow, object access patterns
- `css-standards` — CSS methodology, naming conventions, responsive patterns
- `js-standards` — JavaScript patterns, DOM interaction, event handling
- `section-standards` — Section file structure, rendering patterns
- `section-schema-standards` — Schema definitions, settings, blocks
- `theme-architecture` — File organization, layout structure, asset management

Also read `.claude/patterns-learned.md` if it exists.

**If you cannot find or read a skill file, STOP and tell the user.**

## Optimize Process — Iteration Loop

### Round 1: Execute ALL Diagnosed Fixes

Work through ALL Category A fixes from the diagnosis, grouped by category:

#### Phase 1: Performance Fixes (Theme Code)
Execute in priority order (LCP → TBT → CLS → FCP → all remaining). For each fix:

1. **Announce the fix** — one line stating what you're about to do
2. **Write the fix** — following the diagnosis approach and skill standards
3. **Validate against checklist** (see checklists below)
4. **Move to next fix**

#### Phase 2: Third-Party Script Optimizations
For every third-party script identified in the diagnosis, apply the appropriate loading strategy:

**Defer/Async:**
```liquid
<!-- Before: blocking -->
<script src="https://app.example.com/widget.js"></script>
<!-- After: deferred -->
<script src="https://app.example.com/widget.js" defer></script>
```

**Lazy Load with IntersectionObserver:**
```liquid
<!-- Load script only when its container is near the viewport -->
<div id="reviews-container" data-script-src="https://app.example.com/reviews.js">
  <!-- Placeholder content -->
</div>
<script defer>
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const script = document.createElement('script');
        script.src = entry.target.dataset.scriptSrc;
        document.head.appendChild(script);
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '200px' });
  document.querySelectorAll('[data-script-src]').forEach(el => observer.observe(el));
</script>
```

**Facade Pattern (for heavy embeds):**
```liquid
<!-- Instead of loading YouTube iframe immediately -->
<div class="video-facade" data-video-id="{{ section.settings.video_id }}">
  <img src="https://img.youtube.com/vi/{{ section.settings.video_id }}/hqdefault.jpg"
       alt="{{ section.settings.video_title }}" loading="lazy" width="640" height="360">
  <button class="video-facade__play" aria-label="Play video">▶</button>
</div>
<!-- Real iframe loads only on click -->
```

**Conditional Loading (page-type specific):**
```liquid
{% if template == 'product' %}
  <script src="https://app.example.com/reviews.js" defer></script>
{% endif %}
```

**Preconnect (for scripts that must load):**
```liquid
<link rel="preconnect" href="https://app.example.com" crossorigin>
```

#### Phase 3: Accessibility Fixes
Execute all accessibility fixes:
- Add missing `alt` attributes to images
- Fix heading hierarchy
- Add missing form labels
- Fix ARIA attributes
- Improve color contrast references
- Fix keyboard navigation issues
- Add missing link names / button names

#### Phase 4: Best Practices Fixes
Execute all best practices fixes:
- Fix HTML doctype/charset issues
- Fix image aspect ratios
- Remove deprecated API usage
- Fix console error sources
- Fix HTTPS/mixed content issues

#### Phase 5: SEO Fixes
Execute all SEO fixes:
- Add/fix meta descriptions
- Fix title tags
- Add canonical URLs
- Add/fix structured data (JSON-LD)
- Fix crawlable anchor issues
- Improve link text
- Add hreflang if multi-language

### Per-Fix Validation Checklists

#### Image Fix Checklist:
- [ ] `loading="lazy"` on all below-fold images
- [ ] `loading="eager"` + `fetchpriority="high"` on LCP image only
- [ ] `width` and `height` attributes on every `<img>`
- [ ] `alt` attribute on every `<img>` (descriptive, not empty unless decorative)
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

#### Third-Party Script Checklist:
- [ ] Every third-party script has `defer` or `async`
- [ ] Scripts only needed on specific pages are conditionally loaded
- [ ] Below-fold widgets use IntersectionObserver lazy loading
- [ ] Heavy embeds (YouTube, maps) use facade pattern
- [ ] `<link rel="preconnect">` added for critical third-party domains
- [ ] No third-party script loads synchronously in `<head>`

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

#### Accessibility Fix Checklist:
- [ ] Every `<img>` has meaningful `alt` (or `alt=""` for decorative)
- [ ] Heading levels don't skip (h1 → h2 → h3, no h1 → h3)
- [ ] All form inputs have associated `<label>`
- [ ] Interactive elements are keyboard-accessible
- [ ] ARIA roles and properties are valid
- [ ] Color is not the only means of conveying information
- [ ] Links and buttons have descriptive text

#### SEO Fix Checklist:
- [ ] Every page has a unique `<title>` tag
- [ ] Every page has a `<meta name="description">`
- [ ] Canonical URL is present and correct
- [ ] Structured data (JSON-LD) is valid
- [ ] All `<a>` tags have crawlable `href` attributes
- [ ] Link text is descriptive (no "click here")
- [ ] Images have `alt` text (for SEO context)

**If a fix fails a checklist item, correct it NOW before moving to the next fix.**

### If You Encounter a Problem
**Minor:** Solve inline, note what you did. Continue.
**Medium:** Pause, explain, get user confirmation, continue.
**Major:** Stop. Suggest re-running `/diagnose` with new information.

## Post-Round Summary

After completing all fixes in a round:

```
## Round [X] Complete

**Fixes Applied:** [X/X]

**By Category:**
- Performance: [X] fixes applied
- Accessibility: [X] fixes applied
- Best Practices: [X] fixes applied
- SEO: [X] fixes applied

**Files Modified:**
- `path/to/file` — [what was changed]

**Per-Fix Validation:** [All passed / Issues found and fixed]

**Any Deviations from Diagnosis:**
- [What changed and why, or "None"]
```

Then tell the user:

> Round [X] complete. Run `/verify` to check if targets are met.
>
> **Note:** PSI scores can vary 5-10 points between runs. Focus on trends across rounds, not exact numbers. If targets are not met after `/verify`, I will run another optimization round (up to 5 total).

## Iteration Rules

After `/verify` reports back:
- **All targets met** → Done. Proceed to `/report`.
- **Some targets not met AND round < 5** → Run `/diagnose` again on the failing categories, then start another round.
- **Round 5 reached AND targets not met** → Stop and ask the user:

> After 5 optimization rounds, the following targets are still not met:
> [list unmet targets with current scores]
>
> Possible reasons:
> - Third-party apps/scripts consuming the performance budget (Category B)
> - PSI score variability (5-10 point fluctuation between runs)
> - Platform-level limitations (Category C)
>
> Options:
> 1. Continue optimizing (may yield diminishing returns)
> 2. Run `/report` with current results
> 3. Review Category B items with the client

## Rules
- Fix EVERY diagnosed item — not just high-impact ones
- **Only modify files from the page file map** — do not edit unrelated sections, snippets, or assets
- Follow ALL skill standards (performance + theme) for every change
- Validate each fix against the relevant checklist before moving on
- Don't break existing functionality for performance gains
- If a fix requires changing a shared file (theme.liquid, base styles), be extra careful about side effects — these affect ALL pages
- Keep the user informed of progress — announce each fix before starting it
- Cover all 4 categories in every round
- Do NOT stop at round 1 if targets are not met — iterate
