---
name: conventions-reference
description: >
  Condensed naming conventions, patterns, and key constraints from all theme standards.
  Used by codebase-analyzer agent to know what patterns to discover. Not for enforcement.
user-invocable: false
---

# Theme Conventions Reference

This is a condensed reference of all naming conventions, patterns, and constraints from the project's standards. Use this to know **what to look for** when analyzing a codebase — not to enforce rules.

---

## Liquid Conventions
- Variables: `snake_case`, descriptive, prefixed with context (`hero_title`, not `title`)
- Tags: `{% liquid %}` for 3+ lines of logic, individual tags for simple conditions
- Snippets: always `{% render %}`, never `{% include %}`
- Every snippet has `{% doc %}` with typed params
- Null checks: `!= blank` for strings/objects, `.size > 0` for collections
- Whitespace: `{%-` `-%}` on logic tags, NOT on output `{{ }}`
- Filters: `| escape` on user content, `| image_url` for images, `| money_with_currency` for prices
- Comments: `{% comment %}` only, never HTML `<!-- -->`
- Performance: limit/offset on loops, pass only needed variables to snippets

## Section File Conventions
- File order: CSS asset call → HTML → JS asset call → Schema
- Wrapper: `<div class="{section-name}">` — class matches filename exactly
- Blocks: always rendered via `{% render %}` snippets, never inline HTML
- Snippet name matches block type: `hero-banner-slide` block → `hero-banner-slide.liquid`
- Multiple block types: `case/when` pattern
- Section settings = non-repeatable; blocks = repeatable content

## Schema Conventions
- Structure order: name → class → settings → blocks → presets
- **All identifiers under 25 characters** (name, class, IDs, labels, block types)
- Section name: Title Case (`"Hero Banner"`)
- Section class: kebab-case + `-section` suffix (`"hero-banner-section"`)
- Setting IDs: `snake_case` with section/block context prefix (`banner_desk_image`, not `image`)
- Setting labels: Title Case, section-specific (never generic)
- Block type: kebab-case (`"banner-slide"`)
- Block name: Title Case, matches type (`"Banner Slide"`)
- Setting types: text (short), textarea (multi-line), richtext (formatted), image_picker (images), url (links), select (3-7 options), checkbox (boolean), range (numeric), color/color_scheme
- Groups order: Content → Style → Advanced
- Presets: always at least one, name matches section name

## CSS Conventions
- Files: `assets/section-name-stylesheet.css`
- **Strict: every child selector starts with parent wrapper** (`.section-name .child`)
- Loading: `preload: true` above fold, `media="print" onload` below fold
- No decorative comments
- Class naming: BEM (`.section-name__element--modifier`)
- Property order: Layout → Flex/Grid → Sizing → Spacing → Typography → Visual → Effects
- Variables: `:root` custom properties for theme-wide values
- Schema-driven values: `style` attribute with CSS custom properties
- Responsive: mobile-first, `min-width` breakpoints (320, 360, 475, 768, 1024, 1280, 1536)

## JavaScript Conventions
- Files: `assets/section-name-javascript.js`
- Vanilla JS only — no frameworks, no jQuery
- Modern ES: `const`/`let` (never `var`), arrow functions, destructuring, optional chaining
- Loading: always `defer`
- Data passing: Liquid → JS via `data-` attributes, never inline scripts
- Init: `DOMContentLoaded` for one-off, Web Components for reusable
- **Strict: NO inline styles** (toggle classes), **NO DOM creation** (Liquid handles markup), **NO price formatting** (use Liquid money filters), **NO inline scripts**
- Naming: files `kebab-case.js`, variables `camelCase`, constants `UPPER_SNAKE_CASE`, classes `PascalCase`

## Architecture Conventions
- All files: `kebab-case`
- Sections: `kebab-case.liquid`
- Snippets: section-prefixed for section-specific (`hero-banner-slide.liquid`), purpose-named for shared (`product-card.liquid`)
- CSS: `section-name-stylesheet.css`
- JS: `section-name-javascript.js`
- Templates: JSON (Online Store 2.0), `kebab-case.json`
- Section independence: own CSS, own JS, no cross-section dependencies
- Snippet extraction: blocks always, SVGs always, long functional areas yes, tiny 2-3 line pieces no

## Figma-to-Code Conventions
- React+Tailwind reference → Liquid+CSS production code
- Component → section, nested component → snippet, props → schema settings
- Tailwind utilities → BEM classes in CSS asset file
- Figma layers → schema settings (text→text, image→image_picker, repeating→blocks)
- Auto-layout → flexbox (not absolute positioning)
- Mobile frame → base CSS, desktop frame → breakpoint overrides
- Assets: check `asset-manifest.json` for `shopify://` URLs
- Images: `<picture>` with responsive sources, alt text, width/height, lazy/eager loading
