---
description: Analyze PageSpeed Insights data AND independently audit the theme codebase for ALL performance, accessibility, best practices, and SEO issues. Works like a human performance expert — PSI is one input, not the only input. Use after /audit.
allowed-tools: Read, Grep, Glob, mcp__psi__get_recommendations, mcp__psi__get_third_party_impact, mcp__psi__get_image_optimization_details, mcp__psi__get_render_blocking_details, mcp__psi__get_javascript_analysis, mcp__psi__get_element_analysis
---

# Diagnose — Expert Performance Analysis

You are a **Shopify performance expert**, not a PSI-to-fix mapper. Your job is to find EVERY possible improvement — using PSI data as one input, then independently auditing the codebase to find issues PSI might miss. Do NOT write code. Do NOT fix anything yet.

## Targets
| Category | Mobile | Desktop |
|----------|--------|---------|
| Performance | 70+ | 85+ |
| Best Practices | 90+ | 90+ |
| Accessibility | 90+ | 90+ |
| SEO | 90+ | 90+ |

## Input
What to diagnose: `$ARGUMENTS`

If no context, look for audit results from a previous `/audit` step in the conversation. If none exist, ask the user to run `/audit` first.

## Process

### Step 1: Read ALL Standards — MANDATORY
Before diagnosing, read ALL performance skill files AND theme skill files.

**Performance Skills:**
- `image-performance` — lazy loading, srcset, sizes, LCP images, Shopify CDN
- `css-performance` — critical CSS, async loading, unused CSS, containment
- `js-performance` — defer, async, code splitting, unused JS, third-party scripts
- `font-performance` — font-display, preloading, font file count, fallbacks
- `liquid-performance` — render time, N+1 loops, caching, DOM size
- `layout-stability` — CLS prevention, dimensions, aspect-ratio, placeholders

**Theme Skills (from shopify-theme-standards):**
- `liquid-standards` — Liquid syntax, filters, control flow, object access patterns
- `css-standards` — CSS methodology, naming conventions, responsive patterns
- `js-standards` — JavaScript patterns, DOM interaction, event handling
- `section-standards` — Section file structure, rendering patterns
- `section-schema-standards` — Schema definitions, settings, blocks
- `theme-architecture` — File organization, layout structure, asset management

Also read `.claude/patterns-learned.md` if it exists.

**If you cannot find or read a skill file, STOP and tell the user.**

### Step 2: PSI Data (Pass 1 — What Google Flags)
Call these tools for **both mobile and desktop**:

1. `get_recommendations` with `url`, `strategy`, and `category: ["performance", "accessibility", "best-practices", "seo"]`
2. `get_third_party_impact` with `url` and `strategy`
3. `get_image_optimization_details` with `url` and `strategy`
4. `get_render_blocking_details` with `url` and `strategy`
5. `get_javascript_analysis` with `url` and `strategy`
6. `get_element_analysis` with `url` and `strategy`

Record every failing audit and flagged resource.

### Step 3: Map the Page — Identify ALL Files to Audit

PSI only tests the rendered page. A performance expert also reads the source code. But **do NOT scan the entire codebase** — only audit files that are actually rendered on the target page.

#### 3a. Confirm the Page Template
Ask the user:

> Which page/template are you optimizing? For example:
> - Homepage → `templates/index.json`
> - Product page → `templates/product.json`
> - Collection page → `templates/collection.json`
> - Cart → `templates/cart.json`
> - A specific alternate template → e.g., `templates/product.landing.json`
>
> Please confirm the template file.

**Wait for the user to confirm before proceeding.** Do not assume the template.

#### 3b. Build the Page File Map
Once the template is confirmed, build a complete map of every file that renders on that page:

**1. Read the template JSON** (e.g., `templates/index.json`):
- Extract every section listed in `"sections"` → each has a `"type"` that maps to `sections/{type}.liquid`
- Note the `"order"` array — this is the rendering order

**2. Read `layout/theme.liquid`** (or whichever layout the template specifies):
- This contains global elements: `<head>` tags, header, footer, global scripts, global styles
- Find which sections are rendered globally (header, footer, announcement bar, etc.)
- Identify all `{% section %}` and `{% render %}` calls

**3. For each section file**, read it and find:
- `{% render 'snippet-name' %}` calls → maps to `snippets/{snippet-name}.liquid`
- `{{ 'file.css' | asset_url | stylesheet_tag }}` → maps to `assets/file.css`
- `{{ 'file.js' | asset_url }}` → maps to `assets/file.js`
- Inline `{% style %}` blocks
- `{% schema %}` block (for settings that affect rendering)

**4. For each snippet**, read it and find further nested renders and asset references.

**5. Compile the complete file list:**
```
## Page File Map — [Page Name]

**Template:** templates/[name].json
**Layout:** layout/theme.liquid

**Sections on this page:**
- sections/[name].liquid (from template)
- sections/header.liquid (from layout)
- sections/footer.liquid (from layout)
- [etc.]

**Snippets used:**
- snippets/[name].liquid (used by sections/[x].liquid)
- [etc.]

**Assets loaded:**
- assets/[name].css (loaded by sections/[x].liquid)
- assets/[name].js (loaded by sections/[x].liquid)
- [etc.]

**Global assets (from layout):**
- assets/base.css
- assets/global.js
- [etc.]

**Total files to audit: [X]**
```

Present this file map to the user before proceeding with the audit.

### Step 4: Audit the Mapped Files (Pass 2 — What a Human Expert Finds)

Now audit ONLY the files from the page file map. Go through each file systematically.

#### 4a. Image Audit
Scan `<img>` tags in the mapped section and snippet files:
- Missing `loading="lazy"` on below-fold images
- Missing `width` and `height` attributes
- Missing `srcset` and `sizes` for responsive images
- Not using `image_url` filter (hardcoded CDN URLs)
- Oversized images (requesting larger than rendered size)
- Missing `alt` attributes (accessibility + SEO)
- LCP image missing `fetchpriority="high"` and `loading="eager"`
- `<picture>` element not used where art direction needed
- Icons using raster images instead of SVG

#### 4b. Script Audit
Scan `<script>` tags in the mapped files (layout, sections, snippets):
- Scripts without `defer` or `async`
- Inline `<script>` blocks (should use `data-` attributes)
- Scripts loaded globally in `layout/theme.liquid` that are only used in specific sections
- Scripts loaded on every page but only needed on this page type
- Duplicate script loading across sections
- Large script files that could be split

#### 4c. Third-Party Script Optimization Audit
For EVERY third-party script found in the mapped files, determine what we CAN do in theme code:
- **Defer/async load** — add `defer` or `async` attribute
- **Lazy load** — use IntersectionObserver to load only when user scrolls to the relevant section
- **Facade pattern** — replace heavy embeds (YouTube, maps, chat widgets) with a lightweight placeholder that loads the real widget on click/interaction
- **Move below fold** — relocate script tags lower in the DOM
- **Conditional loading** — only load on pages where the feature is actually used (e.g., review widget only on PDP)
- **Preconnect** — add `<link rel="preconnect">` to the script's domain to reduce connection time

**Decision tree for each third-party script:**
```
1. Can we add defer/async?          → Yes → Category A: defer it
2. Is it only needed on one page?   → Yes → Category A: conditional load by template
3. Is it below the fold?            → Yes → Category A: lazy load with IntersectionObserver
4. Is it a heavy embed (video/map)? → Yes → Category A: facade pattern
5. Can we preconnect to its domain? → Yes → Category A: add preconnect
6. None of the above apply?         → Category B: recommend removal/replacement to client
```

**Category B should be the LAST resort.** Most third-party scripts can be at least deferred or conditionally loaded.

#### 4d. Stylesheet Audit
Scan `<link rel="stylesheet">` and `<style>` tags in the mapped files:
- Render-blocking stylesheets that could be async
- Stylesheets loaded globally in layout but only used in specific sections
- Inline styles that should be CSS custom properties
- `@import` rules in CSS files (render-blocking chain)
- CSS loaded on this page but not used by any section on this page
- Large CSS files that could be split by section

#### 4e. Font Audit
Scan `@font-face` declarations and font `<link>` tags in the mapped CSS files and layout:
- Missing `font-display: swap` (or `optional`)
- More than 2 font files preloaded
- Missing `crossorigin` on font preload
- Unused font weights/styles loaded
- Missing preconnect to font origins
- `@import` used for font loading (should be `<link>`)
- No system font fallback with `size-adjust`

#### 4f. Liquid Rendering Audit
Scan the mapped section and snippet files for:
- N+1 patterns: accessing `product.metafields` or `product.variants` inside loops without caching
- Repeated expensive lookups (same object accessed multiple times without assign)
- Assigns inside loops that could be moved outside
- Unpaginated collections
- Large `for` loops without limits
- Unnecessary `render`/`include` calls in loops
- Excessive DOM nodes from redundant wrappers

#### 4g. Layout & CLS Audit
Scan the mapped files for CLS-causing patterns:
- Images/videos/iframes without dimensions
- Dynamically injected content above the fold (banners, popups)
- Font loading causing layout shift (no `size-adjust`)
- CSS animations using layout properties instead of `transform`
- Containers without reserved space (`min-height` or `aspect-ratio`)

#### 4h. Head Tag Audit
Scan `layout/theme.liquid` `<head>` section:
- Missing or incorrect `<meta>` tags (description, viewport, charset)
- Missing canonical URL
- Missing or incorrect structured data (JSON-LD)
- Preload/preconnect hints that are missing or unnecessary
- Resource hints order (preconnect before preload)
- Missing `<title>` tag or incorrect format

#### 4i. Accessibility Audit
Scan the mapped section, snippet, and layout files for:
- Missing `alt` on images
- Heading hierarchy violations (h1 → h3 skip)
- Form inputs without labels
- Interactive elements not keyboard accessible
- Missing ARIA landmarks
- Missing or incorrect ARIA attributes
- Links/buttons without descriptive text
- Color-only information (no text alternative)
- Missing `lang` attribute on `<html>`
- Missing skip-to-content link

#### 4j. SEO Audit
Scan the mapped files for:
- Missing or duplicate meta descriptions
- Missing or duplicate title tags
- Non-crawlable links (`href="#"`, `href="javascript:"`)
- Vague link text ("click here", "read more", "learn more")
- Missing hreflang for multi-language stores
- Missing robots meta
- Images without alt text (SEO context)
- Missing breadcrumb structured data
- Missing product/organization structured data

### Step 5: Merge Both Passes
Combine PSI findings (Pass 1 — Step 2) with page-specific codebase findings (Pass 2 — Step 4). Remove duplicates. This gives you the COMPLETE list of issues for this specific page.

### Step 6: Classify Each Issue

**Category A: We Fix in Theme Code**
Everything we can resolve by modifying theme files:
- ALL performance fixes (images, CSS, JS, fonts, Liquid, CLS)
- ALL third-party script loading optimizations (defer, lazy load, facade, conditional load)
- ALL accessibility fixes (alt text, ARIA, headings, labels)
- ALL best practices fixes (doctype, charset, aspect ratios)
- ALL SEO fixes (meta tags, canonical, structured data, link text)

**Category B: Client Action Required**
ONLY things that genuinely cannot be fixed in theme code:
- An app needs to be uninstalled entirely (not just loading-optimized)
- Content changes needed (e.g., writing better product descriptions for SEO)
- External service configuration (e.g., DNS-level redirects)
- Business decisions (e.g., "do you need this chat widget?")

**Category B should be SMALL. If you can optimize how something loads, it's Category A, not B.**

**Category C: Platform (Shopify Infrastructure)**
Inherent to Shopify — cannot be changed:
- Shopify's base JS (`analytics.js`, `web-pixels-manager.js`)
- Shopify CDN response times
- Checkout performance

### Step 7: Prioritize Category A Fixes

**Performance fixes** (by CWV impact):
- LCP improvement → highest
- TBT reduction → high
- CLS reduction → high
- FCP improvement → medium
- All remaining performance items → include everything

**Accessibility fixes:**
- Critical: missing alt text, missing labels, keyboard traps
- High: color contrast, heading order, ARIA
- Medium: link names, focus management

**Best Practices + SEO fixes:**
- All ranked by severity

### Step 8: Present Diagnosis

```
## Expert Diagnosis — All Categories

**Page:** [URL]
**Template:** [template file, e.g., templates/index.json]
**Current Scores:** Performance M:[X] D:[X] | BP M:[X] D:[X] | A11y M:[X] D:[X] | SEO M:[X] D:[X]

**Diagnosis method:** PSI data + page-specific codebase audit
**Files audited:** [X] files ([Y] sections, [Z] snippets, [W] assets + layout)

---

### Category A: Fixes We'll Implement

#### Performance Fixes ([X] issues found — [Y] from PSI, [Z] from codebase audit)

##### 1. [Issue Title] — [Impact Level]
**Source:** [PSI flagged / Codebase audit / Both]
**Current:** [specific files/lines found in codebase]
**Fix:** [what we'll change — specific and actionable]
**Skill:** [which skill applies]
**Files:** [specific files to modify]
**Expected Impact:** [which metric improves]

[Continue for ALL issues — every single one]

##### Third-Party Script Optimizations
For each third-party script, what we'll do in theme code:

| Script | Current Loading | Our Fix | Expected Saving |
|--------|----------------|---------|-----------------|
| [Chat widget] | Sync in head | Lazy load on scroll + facade | ~[X]ms TBT |
| [Reviews app] | Global load | Conditional: PDP only | ~[X]KB saved on non-PDP |
| [Analytics] | Render-blocking | Defer + preconnect | ~[X]ms FCP |

#### Accessibility Fixes ([X] issues)
[Every issue with file, fix, and checklist reference]

#### Best Practices Fixes ([X] issues)
[Every issue]

#### SEO Fixes ([X] issues)
[Every issue]

---

### Category B: Client Action Required
**Only items we genuinely cannot fix in code:**

| Item | Why We Can't Fix It | Recommendation |
|------|---------------------|----------------|
| [Item] | [Reason] | [Action for client] |

---

### Category C: Platform (No Action)
- [Shopify platform items — brief explanation]

---

### Fix Count Summary
| Category | Total Found | PSI Flagged | Codebase Audit Found | Category A | Category B | Category C |
|----------|-------------|-------------|---------------------|------------|------------|------------|
| Performance | [X] | [X] | [X] | [X] | [X] | [X] |
| Accessibility | [X] | [X] | [X] | [X] | [X] | [X] |
| Best Practices | [X] | [X] | [X] | [X] | [X] | [X] |
| SEO | [X] | [X] | [X] | [X] | [X] | [X] |

### Estimated Outcome
**Targets:** Performance (M:70+/D:85+) | BP (90+) | A11y (90+) | SEO (90+)

If all Category A fixes are implemented:
- **Performance:** M:[current]→[est] D:[current]→[est]
- **Best Practices:** M:[current]→[est] D:[current]→[est]
- **Accessibility:** M:[current]→[est] D:[current]→[est]
- **SEO:** M:[current]→[est] D:[current]→[est]

---

Ready to proceed? Run `/optimize` to execute ALL fixes.
```

## Rules
- **Page-specific only** — audit ONLY files that render on the target page. Do NOT scan the whole codebase.
- **Always confirm the template** with the user before building the file map.
- EVERY issue must be listed — PSI-flagged AND codebase-found. No skipping.
- Do TWO passes — PSI data alone is not enough. Always audit the codebase independently.
- Third-party scripts: optimize loading FIRST. Only flag as "client action" if there is genuinely nothing we can do in theme code.
- Never suggest fixes you can't verify in the codebase — always search for the actual code
- Always reference which skill standard applies to each fix
- Always identify specific files and code causing each issue
- Be honest about impact estimates
- Category B should be small — push hard to optimize everything in code
