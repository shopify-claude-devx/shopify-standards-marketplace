---
name: image-performance
description: Image optimization standards for Shopify themes. Covers lazy loading, responsive images with srcset/sizes, picture element usage, image_url filter parameters, eager loading for LCP images, width/height attributes, and Shopify CDN format optimization.
user-invocable: false
globs: ["**/*.liquid"]
---

# Image Performance Standards

Images are typically the largest contributor to page weight and LCP on Shopify stores. Every image in the theme must follow these standards.

## Lazy Loading

### Below-Fold Images — Always Lazy Load
```liquid
<img
  src="{{ image | image_url: width: 600 }}"
  alt="{{ image.alt | escape }}"
  width="{{ image.width }}"
  height="{{ image.height }}"
  loading="lazy"
  decoding="async"
>
```

### Above-Fold / LCP Images — Eager Load with Priority
The hero image, first product image, or first visible image on any page must NOT be lazy loaded:
```liquid
<img
  src="{{ image | image_url: width: 1200 }}"
  alt="{{ image.alt | escape }}"
  width="{{ image.width }}"
  height="{{ image.height }}"
  loading="eager"
  fetchpriority="high"
>
```

**Rule:** Only ONE image per page should have `fetchpriority="high"` — the LCP candidate.

## Responsive Images

### Use `srcset` and `sizes` for Every Content Image
```liquid
<img
  src="{{ image | image_url: width: 800 }}"
  srcset="
    {{ image | image_url: width: 375 }} 375w,
    {{ image | image_url: width: 750 }} 750w,
    {{ image | image_url: width: 1100 }} 1100w,
    {{ image | image_url: width: 1500 }} 1500w
  "
  sizes="(min-width: 1024px) 50vw, 100vw"
  alt="{{ image.alt | escape }}"
  width="{{ image.width }}"
  height="{{ image.height }}"
  loading="lazy"
>
```

### `sizes` Attribute Guidelines
- `sizes` must reflect the actual rendered size at each breakpoint
- `100vw` for full-width images on mobile
- `50vw` for half-width images on desktop (two-column layouts)
- `33vw` for third-width (three-column grids)
- Use `calc()` for images with padding: `calc(100vw - 2rem)`
- **Never omit `sizes`** — without it, the browser assumes `100vw` and downloads oversized images

### `<picture>` Element for Art Direction
Use `<picture>` when different crops/aspect ratios are needed at different breakpoints:
```liquid
<picture>
  <source
    media="(min-width: 768px)"
    srcset="{{ section.settings.desktop_image | image_url: width: 1400 }}"
  >
  <img
    src="{{ section.settings.mobile_image | image_url: width: 750 }}"
    alt="{{ section.settings.image_alt | escape }}"
    width="{{ section.settings.mobile_image.width }}"
    height="{{ section.settings.mobile_image.height }}"
    loading="lazy"
  >
</picture>
```

## Width and Height Attributes

**Every `<img>` tag MUST have `width` and `height` attributes.** This prevents Cumulative Layout Shift (CLS).

```liquid
{%- comment -%} Correct — uses intrinsic dimensions {%- endcomment -%}
<img
  src="{{ product.featured_image | image_url: width: 600 }}"
  width="{{ product.featured_image.width }}"
  height="{{ product.featured_image.height }}"
>

{%- comment -%} Also correct — for fixed-size containers, use the rendered size {%- endcomment -%}
<img
  src="{{ image | image_url: width: 300 }}"
  width="300"
  height="300"
>
```

## Shopify CDN Optimization

### Use `image_url` Filter — Never Hardcode CDN URLs
```liquid
{%- comment -%} Correct {%- endcomment -%}
{{ product.featured_image | image_url: width: 600 }}

{%- comment -%} Wrong — hardcoded CDN path {%- endcomment -%}
https://cdn.shopify.com/s/files/1/store/products/image.jpg
```

### Request Only the Size You Need
- Product cards in grid: `width: 400` to `width: 600`
- Product gallery main: `width: 800` to `width: 1200`
- Hero banners: `width: 1400` to `width: 1920`
- Thumbnails: `width: 100` to `width: 200`

**Never request full-size images** — Shopify's CDN automatically resizes and serves WebP/AVIF when the browser supports it.

## Preloading the LCP Image

For hero sections or above-fold images, preload the LCP candidate:
```liquid
{%- if section.settings.image != blank -%}
  <link
    rel="preload"
    as="image"
    href="{{ section.settings.image | image_url: width: 1400 }}"
    imagesrcset="
      {{ section.settings.image | image_url: width: 375 }} 375w,
      {{ section.settings.image | image_url: width: 750 }} 750w,
      {{ section.settings.image | image_url: width: 1400 }} 1400w
    "
    imagesizes="100vw"
  >
{%- endif -%}
```

Place this in the section's `{% schema %}` `presets` or render it conditionally for first-fold sections.

## Background Images

Avoid CSS background images for content images. Use `<img>` with `object-fit` instead:
```css
.hero-banner__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}
```

If a CSS background image is truly needed (rare), use `image-set()`:
```css
.section__bg {
  background-image: image-set(
    url("image.webp") type("image/webp"),
    url("image.jpg") type("image/jpeg")
  );
}
```

## SVG and Icon Optimization

- Small UI icons (< 2KB): inline as SVG snippets
- Decorative/complex SVGs: serve as asset files
- Never use icon fonts — they block rendering and load unused glyphs
- SVGs should have `width`, `height`, and `viewBox` attributes
- Decorative SVGs: `aria-hidden="true"`, no alt
- Meaningful SVGs: `role="img"` + `aria-label`
