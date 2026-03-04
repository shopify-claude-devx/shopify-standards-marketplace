# Image Performance Checklist

## Every `<img>` Tag
- [ ] Has `width` and `height` attributes
- [ ] Has `alt` attribute (descriptive text or `alt=""` for decorative)
- [ ] Uses `{{ image | image_url }}` filter — not hardcoded CDN URLs
- [ ] Requested size matches rendered size (not oversized)

## Below-Fold Images
- [ ] Has `loading="lazy"`
- [ ] Has `decoding="async"`

## Above-Fold / LCP Image
- [ ] Has `loading="eager"` (NOT lazy)
- [ ] Has `fetchpriority="high"` (only ONE image per page)
- [ ] Preloaded in `<head>` with `<link rel="preload" as="image">`

## Responsive Images
- [ ] Has `srcset` with appropriate width descriptors (375w, 750w, 1100w, 1500w)
- [ ] Has `sizes` attribute that reflects actual rendered size
- [ ] Uses `<picture>` element when art direction is needed (different crops per breakpoint)

## Icons
- [ ] Small icons use inline SVG (not raster images)
- [ ] SVG icons have `aria-hidden="true"` if decorative
- [ ] SVG icons have `role="img"` and `aria-label` if meaningful

## Background Images
- [ ] Prefer `<img>` with `object-fit: cover` over CSS `background-image`
- [ ] If CSS background is necessary, use `image-set()` for format selection
