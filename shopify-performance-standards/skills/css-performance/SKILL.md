---
name: css-performance
description: CSS performance standards for Shopify themes. Covers critical CSS extraction, async stylesheet loading, unused CSS removal, selector complexity, CSS containment, and reducing render-blocking stylesheets.
user-invocable: false
globs: ["assets/**/*.css", "**/*.liquid"]
---

# CSS Performance Standards

CSS is render-blocking by default. Every stylesheet delays First Contentful Paint until it's downloaded and parsed. These standards minimize CSS impact on performance.

## Critical vs Non-Critical CSS

### What Is Critical CSS?
Critical CSS is the minimum CSS needed to render the above-fold content — what the user sees before scrolling. Everything else is non-critical and should load async.

**Critical CSS typically includes:**
- Layout framework (grid/flex containers for the visible page structure)
- Header/navigation styles (always visible on load)
- Hero/banner section styles (first visible content block)
- Typography for visible text (body font, heading sizes)
- Base resets and variables used above the fold

**Non-critical CSS includes:**
- Footer styles (below fold)
- Product grid styles (usually below hero)
- Testimonials, FAQs, blog sections
- Modal/popup styles (not visible on load)
- Cart drawer styles (hidden until opened)

### Above-Fold CSS — Preload
CSS needed to render the visible viewport on load must be preloaded:
```liquid
{%- comment -%} Critical: header, hero, base layout {%- endcomment -%}
{{ 'base-stylesheet.css' | asset_url | stylesheet_tag: preload: true }}
{{ 'header-stylesheet.css' | asset_url | stylesheet_tag: preload: true }}
{{ 'hero-banner-stylesheet.css' | asset_url | stylesheet_tag: preload: true }}
```

Or with the `css.liquid` snippet pattern:
```liquid
{% render 'css', filename: 'hero-banner-stylesheet.css', loading: 'preload' %}
```

**Rule of thumb:** If the section is visible without scrolling on mobile, its CSS is critical.

### Below-Fold CSS — Async Load
CSS for sections below the fold should not block rendering:
```liquid
<link
  rel="stylesheet"
  href="{{ 'testimonials-stylesheet.css' | asset_url }}"
  media="print"
  onload="this.onload=null;this.media='all';"
>
<noscript>
  <link rel="stylesheet" href="{{ 'testimonials-stylesheet.css' | asset_url }}">
</noscript>
```

Or with the snippet:
```liquid
{% render 'css', filename: 'testimonials-stylesheet.css', loading: 'low' %}
```

## Reduce Unused CSS

### Section-Scoped Stylesheets
Every section should have its own CSS file. Don't dump all styles into one monolithic stylesheet.

```
assets/
  base-stylesheet.css          ← global resets, typography, utilities
  hero-banner-stylesheet.css   ← only hero section styles
  product-grid-stylesheet.css  ← only product grid styles
  footer-stylesheet.css        ← only footer styles
```

### Conditional CSS Loading
Only load a section's CSS when the section is present on the page:
```liquid
{%- comment -%} Inside the section file {%- endcomment -%}
{% render 'css', filename: 'product-tabs-stylesheet.css', loading: 'low' %}
```

This naturally ensures CSS is only loaded when the section exists on the page.

## Selector Complexity

### Keep Selectors Shallow
```css
/* Good — 1-2 levels */
.product-card__title { }
.product-card__price--sale { }

/* Bad — deep nesting increases specificity and parse time */
.main-content .product-grid .product-card .product-card__title span { }
```

### Avoid Universal and Attribute Selectors in Hot Paths
```css
/* Avoid in section CSS */
* { box-sizing: border-box; }  /* OK in base reset only */
[data-section] .item { }       /* Attribute selectors are slower */

/* Use class selectors */
.product-card__item { }
```

## CSS Containment

Use `contain` to help the browser optimize rendering for independent sections:
```css
.section-wrapper {
  contain: layout style;
}
```

- `contain: layout` — section layout changes don't trigger reflow of the whole page
- `contain: style` — counters and animations don't leak out
- `contain: content` — shorthand for layout + style + paint (use for fully independent sections)
- **Don't use** `contain: size` on sections with dynamic height — it forces you to set explicit dimensions

## CSS Custom Properties Performance

### Define Variables at the Root or Section Level
```css
:root {
  --color-primary: #000;
  --font-body: "Helvetica Neue", sans-serif;
  --spacing-unit: 0.5rem;
}
```

### Use Variables for Dynamic Schema Values
Instead of inline `<style>` blocks per-section:
```liquid
<div
  class="hero-banner"
  style="
    --hero-bg: {{ section.settings.background_color }};
    --hero-padding: {{ section.settings.padding }}px;
  "
>
```
```css
.hero-banner {
  background-color: var(--hero-bg);
  padding: var(--hero-padding);
}
```

This avoids generating unique CSS per section instance and keeps styles cacheable.

## Minimize Inline Styles

### Avoid `<style>` Tags in Sections
Inline `<style>` blocks are re-parsed on every page load and can't be cached separately.

**Exception:** Dynamic CSS from Liquid values (colors, spacing from schema settings) can use inline `<style>` or the `style` attribute pattern above.

### Never Generate CSS with Liquid Loops
```liquid
{%- comment -%} Never do this — generates N style blocks {%- endcomment -%}
{% for block in section.blocks %}
  <style>
    #block-{{ block.id }} { color: {{ block.settings.color }}; }
  </style>
{% endfor %}

{%- comment -%} Do this instead — CSS custom properties {%- endcomment -%}
{% for block in section.blocks %}
  <div class="block-item" style="--block-color: {{ block.settings.color }};">
{% endfor %}
```

## Font-Related CSS

See `font-performance` skill for comprehensive font optimization. Key CSS rules:
- Always declare `font-display: swap` (or `optional` for non-critical fonts)
- Don't load fonts via `@import` in CSS — use `<link>` in HTML
- Preconnect to font origins
