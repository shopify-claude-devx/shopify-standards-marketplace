---
name: css-standards
description: >
  CSS and styling standards for Shopify themes. Apply when writing, editing, or generating any CSS
  file, Tailwind classes in Liquid templates, inline style attributes, or any style-related code.
  Use whenever the user is working on visual appearance, layout, responsive design, or theming —
  even if they frame it as a "Liquid" or "section" task, if styling is involved, these standards
  apply. Covers BEM naming, section scoping, property ordering, responsive breakpoints, CSS
  variables, dynamic schema values, and CSS loading strategy.
user-invocable: true
globs: ["assets/**/*.css"]
---

# CSS Standards

This skill covers two approaches depending on the project:
- **Tailwind CSS** — for custom scratch themes
- **Pure CSS** — for Dawn-based or traditional themes

Both approaches share the same core conventions below. Tailwind-specific and pure CSS-specific sections are marked.

---

## CSS File Convention

### Always Use Asset Files
CSS lives in asset files (`assets/` directory), not inline `<style>` tags. The only exception is CSS that is dynamically generated from Liquid values — that can live directly in the Liquid file.

Keeping CSS in asset files enables browser caching — the stylesheet is downloaded once and reused across page navigations. Inline `<style>` tags are re-parsed on every page load and cannot be cached independently.

### File Naming
Section-specific CSS files follow this format:
```
section-name-stylesheet.css
```

### CSS Loading Strategy
Use the `css.liquid` snippet for all CSS loading. Two modes based on fold position:

**First fold sections (above the fold) — preload:**
```liquid
{% render 'css', filename: 'hero-banner-stylesheet.css', loading: 'preload' %}
```

**Below fold sections — lazy load:**
```liquid
{% render 'css', filename: 'testimonials-stylesheet.css', loading: 'low' %}
```

The following is a reference implementation for CSS loading. If your theme uses a different CSS loading approach, adapt the pattern while maintaining the preload/lazy distinction for performance.

**The `css.liquid` snippet:**
```liquid
{% doc %}
  @param {String} filename - The CSS asset filename
  @param {String} loading - Loading strategy: 'preload' for first fold, 'low' for below fold
{% enddoc %}

{% assign css_url = filename | asset_url %}
{%- if loading == 'preload' -%}
  {{ filename | asset_url | stylesheet_tag: preload: true }}
{%- elsif loading == 'low' -%}
  <link
    rel="stylesheet"
    href="{{ css_url }}"
    media="print"
    onload="this.onload=null;this.media='all';"
  >
  <noscript><link rel="stylesheet" href="{{ css_url }}"></noscript>
{%- endif -%}
```

---

## Class Naming — BEM Model
Use BEM (Block Element Modifier) for all class names:

BEM gives every class a predictable, collision-resistant name. When multiple sections share a page, generic class names like `.container` or `.title` will conflict. BEM's `section-name__element--modifier` pattern is self-documenting — you can immediately tell which section a class belongs to.

```
.section-name                     — Block
.section-name__element            — Element
.section-name__element--modifier  — Modifier
```

Keep names semantic and descriptive. The block name should match the section name.

---

## Section-Specific CSS Scoping

CSS must be section-specific, not page-specific. Every selector for a section must include the section's parent class.

Shopify sections can appear on any page in any order. Unscoped CSS breaks when a section moves to a different template or when multiple sections with similar class names share the same page.

```css
/* ✅ Correct — scoped to section */
.home-stress {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}
.home-stress .home-stress-container {
    display: flex;
    gap: 3rem;
    width: 100%;
}
.home-stress .home-stress-header .section-heading,
.home-stress .home-stress-header .section-details {
    text-align: center;
    margin-bottom: 3rem;
}

/* ❌ Wrong — unscoped, will leak across pages */
.section-heading {
    text-align: center;
}
```

**Exception:** Truly generic page-level CSS that is shared across sections can exist without a parent scope. But default to scoped — only go generic when intentional.

---

## CSS Property Ordering
Follow a strict property order in declarations. This matches the Tailwind class ordering convention:

Ordering properties from outside-in mirrors the browser's box model: layout and position first (how the element sits in the page), then sizing, then spacing, then visual details. This makes it easy to scan a rule and understand what an element does at a glance — structural decisions at the top, decorative details at the bottom.

1. **Layout** — display, position, top/right/bottom/left, z-index, float, clear
2. **Flexbox/Grid** — flex, flex-direction, align-items, justify-content, grid-template, gap
3. **Sizing** — width, height, min-width, max-width, min-height, max-height
4. **Spacing** — margin, padding
5. **Typography** — font-family, font-size, font-weight, line-height, letter-spacing, text-align, color
6. **Visual** — background, border, border-radius, box-shadow, opacity
7. **Effects** — transform, transition, animation
8. **Responsive** — media queries at the bottom

```css
.hero-banner {
    /* Layout */
    display: flex;
    position: relative;

    /* Flexbox */
    align-items: center;
    justify-content: center;

    /* Sizing */
    width: 100%;
    min-height: 500px;

    /* Spacing */
    padding: 3rem 1.5rem;

    /* Typography */
    text-align: center;
    color: #1a1a1a;

    /* Visual */
    background-color: #ffffff;
    border-radius: 8px;
}
```

---

## Common Variables

CSS custom properties defined at `:root` create a single source of truth for theme-wide values. When a client changes their brand color, updating one variable propagates everywhere — no find-and-replace across dozens of files.

Create CSS custom properties for theme-wide values:

```css
:root {
    /* Spacing */
    --section-spacing-sm: 2rem;
    --section-spacing-md: 4rem;
    --section-spacing-lg: 6rem;

    /* Fonts */
    --font-heading: var(--font-heading-family);
    --font-body: var(--font-body-family);

    /* Colors */
    --color-primary: /* from theme settings */;
    --color-secondary: /* from theme settings */;
    --color-text: /* from theme settings */;
    --color-background: /* from theme settings */;
}
```

Use these variables in section CSS rather than hard-coding values.

---

## Dynamic Values from Schema
When section settings need to affect styles (e.g., colors, spacing), use the `style` attribute with CSS custom properties:

This pattern keeps CSS purely declarative while letting schema settings control values. The alternative — constructing class names dynamically — breaks Tailwind's purge step and makes pure CSS fragile because the class must exist in the stylesheet for every possible value.

```liquid
<section
  class="hero-banner"
  style="--hero-bg: {{ section.settings.background_color }}; --hero-padding: {{ section.settings.padding }}px;"
>
```

```css
.hero-banner {
    background-color: var(--hero-bg);
    padding: var(--hero-padding);
}
```

Never construct class names dynamically — they won't be purged in Tailwind and are fragile in pure CSS.

---

## Responsive Approach
Mobile-first always. Base styles are mobile, add breakpoints for larger screens.

Mobile-first means base styles handle the smallest screens (which are also the most constrained), and breakpoints progressively enhance for larger screens. This produces smaller CSS because mobile styles don't need to be wrapped in media queries, and it ensures the mobile experience works even if a breakpoint is missed.

### Breakpoints
```
xxs:  320px
xs:   360px
sm:   475px
md:   768px
lg:   1024px
xl:   1280px
2xl:  1536px
```

In Tailwind, these are configured in `tailwind.config.js` under `screens`. In pure CSS, use the same values in media queries:

```css
.hero-banner {
    padding: 1.5rem;
    font-size: 1.25rem;
}

@media (min-width: 768px) {
    .hero-banner {
        padding: 3rem;
        font-size: 2rem;
    }
}

@media (min-width: 1024px) {
    .hero-banner {
        padding: 4rem;
        font-size: 2.5rem;
    }
}
```

Always use these exact breakpoint values — never use arbitrary values like `750px` or `990px`. Consistency across all sections.

Consistent breakpoints across all sections prevent layout jumps where one section reflows at 768px but another at 750px. Using standard values also aligns with Tailwind defaults and common device widths.

---

## Tailwind-Specific (Scratch Themes Only)

### Class Ordering
Follow strict order matching the CSS property order above:
1. Layout (`flex`, `grid`, `block`, `hidden`, `relative`, `absolute`)
2. Sizing (`w-`, `h-`, `min-w-`, `max-w-`)
3. Spacing (`p-`, `m-`, `gap-`)
4. Typography (`text-`, `font-`, `leading-`, `tracking-`)
5. Colors (`bg-`, `text-`, `border-`)
6. Borders & Rounded (`border-`, `rounded-`)
7. Effects (`shadow-`, `opacity-`, `transition-`)
8. Responsive variants (`sm:`, `md:`, `lg:`) — always last

### Tailwind Config
Extend the default config per project with custom colors, spacing, and fonts to match the design system. Don't fight the defaults — extend them.

### Don't Mix Approaches Per Element
Within a single element, don't mix Tailwind classes with custom CSS classes for styling. Pick one. Tailwind for utility-driven elements, custom CSS for complex components.

Mixing Tailwind utilities and custom CSS on the same element makes specificity unpredictable and splits styling logic across two systems, making debugging harder.

---

## Reference Files
Check `references/patterns-learned.md` for CSS patterns and issues discovered during development.