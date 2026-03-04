# Layout Stability (CLS) Checklist

## Media Elements
- [ ] Every `<img>` has `width` and `height` attributes
- [ ] Every `<video>` has `width` and `height` attributes
- [ ] Every `<iframe>` has `width` and `height` attributes
- [ ] Responsive media uses `aspect-ratio` CSS with `width: 100%` and `height: auto`

## Dynamic Content
- [ ] Containers with lazy-loaded content have `min-height` or `aspect-ratio`
- [ ] Ad/banner slots have reserved dimensions
- [ ] Review widget containers have `min-height`
- [ ] Announcement bars have fixed height
- [ ] Skeleton placeholders used for content that loads after page render

## Font Loading
- [ ] System font fallback has `size-adjust` to match web font metrics
- [ ] `font-display: swap` (or `optional`) declared on all `@font-face`
- [ ] Fallback includes `ascent-override`, `descent-override`, `line-gap-override`

## Animations
- [ ] Animations use `transform` and `opacity` only (not `margin`, `padding`, `width`, `height`, `top`, `left`)
- [ ] No layout-triggering property changes in transitions

## Above-Fold Stability
- [ ] No dynamically injected content above the fold (popups, banners pushed from JS)
- [ ] Cookie consent banners use `position: fixed` (don't push content down)
- [ ] Slideshow/carousel has explicit height set before JS initializes
