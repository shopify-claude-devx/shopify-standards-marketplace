# Font Performance Checklist

## @font-face Declarations
- [ ] Every `@font-face` has `font-display: swap` (or `optional` for non-critical)
- [ ] Never uses `font-display: block`
- [ ] Uses WOFF2 format (universally supported, best compression)

## Preloading
- [ ] Maximum 2 font files preloaded
- [ ] Preloaded fonts use `as="font"` and `type="font/woff2"`
- [ ] Preloaded fonts have `crossorigin` attribute (required even for same-origin)
- [ ] Only the most critical weights are preloaded (e.g., body regular, heading bold)

## Font File Count
- [ ] Maximum 4-5 font files total
- [ ] Consider variable fonts to reduce file count (one file, all weights)
- [ ] Unused font weights/styles removed

## System Font Fallbacks
- [ ] System font fallback defined with `size-adjust` to minimize CLS
- [ ] Fallback stack includes appropriate system fonts (sans-serif, serif, or monospace)
- [ ] `ascent-override`, `descent-override`, `line-gap-override` set on fallback

## Loading Strategy
- [ ] No `@import` for fonts in CSS files (use `<link>` in HTML)
- [ ] `<link rel="preconnect">` added for external font origins (Google Fonts, etc.)
- [ ] `<link rel="dns-prefetch">` as fallback for preconnect
