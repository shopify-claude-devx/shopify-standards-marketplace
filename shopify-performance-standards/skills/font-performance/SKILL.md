---
name: font-performance
description: Font loading and optimization standards for Shopify themes. Covers font-display strategies, preloading critical fonts, reducing font file count, subsetting, system font fallbacks, and avoiding FOIT/FOUT.
user-invocable: false
globs: ["assets/**/*.css", "**/*.liquid", "layout/**/*.liquid"]
---

# Font Performance Standards

Web fonts are a common source of render-blocking behavior and layout shift. Fonts must be loaded strategically to minimize impact on LCP and CLS.

## Font Display Strategy

### Always Declare `font-display`
```css
@font-face {
  font-family: 'CustomFont';
  src: url('custom-font.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

### Choosing the Right Value
| Value | Behavior | Use When |
|---|---|---|
| `swap` | Shows fallback immediately, swaps when font loads | Body text, headings — most common choice |
| `optional` | Shows fallback, may never swap if font loads slowly | Non-critical decorative text, captions |
| `fallback` | Brief invisible period (100ms), then fallback, then swap | Good balance for important text |

**Never use `font-display: block`** — it hides text until the font loads (FOIT).

## Preload Critical Fonts

Preload only the fonts needed for above-fold text (usually 1-2 files max):
```liquid
<link
  rel="preload"
  as="font"
  type="font/woff2"
  href="{{ 'heading-font.woff2' | asset_url }}"
  crossorigin
>
```

**Rules:**
- Preload a maximum of 2 font files — more defeats the purpose
- Only preload WOFF2 format — it's universally supported
- Always include `crossorigin` — fonts require CORS even from same origin
- Only preload fonts used above the fold

## Reduce Font File Count

### Audit Current Font Loading
Common problem: themes load 8-12 font files (regular, bold, italic, bold-italic for two families). Each file is a separate HTTP request.

### Target: Maximum 4 Font Files
1. One heading font (1 weight)
2. One body font (2 weights: regular + bold)
3. One body font italic (if used frequently)

### Use Variable Fonts When Available
Variable fonts contain all weights in one file:
```css
@font-face {
  font-family: 'Inter';
  src: url('Inter-Variable.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: swap;
}
```

One file instead of 4-6 separate weight files.

## Preconnect to Font Origins

If using Google Fonts or external font services:
```liquid
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

If using Shopify CDN fonts (most themes):
```liquid
<link rel="preconnect" href="https://fonts.shopifycdn.com" crossorigin>
```

Place preconnect hints in `<head>` before any stylesheet references.

## System Font Fallbacks

### Define Fallback Stacks That Match Metrics
Use `size-adjust`, `ascent-override`, and `descent-override` to minimize layout shift when swapping:
```css
@font-face {
  font-family: 'CustomFont-Fallback';
  src: local('Arial');
  size-adjust: 105%;
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
}

body {
  font-family: 'CustomFont', 'CustomFont-Fallback', sans-serif;
}
```

### Common System Font Stacks
```css
/* Sans-serif (general purpose) */
font-family: 'CustomFont', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Serif */
font-family: 'CustomSerif', Georgia, 'Times New Roman', serif;

/* Monospace */
font-family: 'CustomMono', 'SF Mono', 'Fira Code', monospace;
```

## Avoid Common Font Mistakes

### Don't Load Fonts via CSS `@import`
```css
/* Wrong — blocks CSS parsing to fetch another file */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700');

/* Correct — use <link> in HTML */
```
```liquid
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap">
```

### Don't Load Unused Weights or Styles
Check if the theme actually uses bold italic, light, extra-bold, etc. Remove any `@font-face` declarations for unused variants.

### Shopify Theme Font Settings
When using Shopify's font picker (`font_picker` setting type), Shopify handles font loading. Check:
- Is the theme loading custom fonts ON TOP of the font picker fonts?
- Are font picker fonts being loaded for elements that have been restyled with custom fonts?
- Remove any redundant font loading
