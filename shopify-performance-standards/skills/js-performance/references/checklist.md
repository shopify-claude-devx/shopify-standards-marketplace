# JavaScript Performance Checklist

## Script Loading
- [ ] Every `<script>` tag has `defer` (or `async` for non-DOM third-party)
- [ ] No bare `<script>` tags without `defer` or `async`
- [ ] Section-specific JS loads only inside its section file
- [ ] Feature-gated JS loads only when the feature is enabled (`if section.settings.enable_x`)

## No Inline Scripts
- [ ] No inline `<script>` blocks in Liquid templates
- [ ] Data passed to JS via `data-` attributes, not Liquid-in-JS
- [ ] JSON data passed via `data-x='{{ object | json }}'`

## Deferred Initialization
- [ ] Non-critical JS (analytics, popups, tracking) uses `requestIdleCallback`
- [ ] Below-fold section JS uses `IntersectionObserver` to initialize on scroll
- [ ] `requestIdleCallback` has `setTimeout` fallback for Safari

## Third-Party Scripts
- [ ] Every third-party script has `defer` or `async`
- [ ] Page-specific scripts are conditionally loaded (`if template == 'product'`)
- [ ] Below-fold widgets use lazy loading (IntersectionObserver)
- [ ] Heavy embeds (YouTube, maps) use facade pattern (static image → real embed on click)
- [ ] Critical third-party domains have `<link rel="preconnect">` in `<head>`
- [ ] No third-party script loads synchronously in `<head>`

## Event Handling
- [ ] Event delegation used for repeated elements (one listener on parent, not N on children)
- [ ] No listeners attached in loops without delegation

## Unused JS
- [ ] No vendor libraries loaded globally that are only used in one section
- [ ] No JS for removed/disabled features
- [ ] Every script in `theme.liquid` is justified for global loading
