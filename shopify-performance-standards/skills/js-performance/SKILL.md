---
name: js-performance
description: JavaScript performance standards for Shopify themes. Covers defer/async loading, removing render-blocking scripts, code splitting by section, idle-time execution, and identifying/removing unused JavaScript.
user-invocable: false
globs: ["assets/**/*.js", "**/*.liquid"]
---

# JavaScript Performance Standards

JavaScript blocks the main thread. Every script that loads synchronously delays interactivity (Total Blocking Time). These standards minimize JS impact on performance.

## Script Loading

### Always Use `defer`
```liquid
<script src="{{ 'section-tabs.js' | asset_url }}" defer></script>
```

- `defer` downloads in parallel and executes after HTML parsing
- **Never use bare `<script>` tags** without `defer` or `async`
- **Never use `async`** for scripts that depend on DOM — `async` executes as soon as downloaded, which may be before DOM is ready

### Section-Specific Scripts
Load JS only when the section that needs it is on the page:
```liquid
{%- comment -%} Inside the section file {%- endcomment -%}
<script src="{{ 'product-tabs.js' | asset_url }}" defer></script>
```

Don't bundle all section JS into one monolithic file.

### Conditional Script Loading
If a feature is behind a setting, don't load the JS at all when disabled:
```liquid
{%- if section.settings.enable_slider -%}
  <script src="{{ 'slider.js' | asset_url }}" defer></script>
{%- endif -%}
```

## No Inline Scripts

### Never Write Inline `<script>` Tags
```liquid
{%- comment -%} Wrong — render-blocking, can't be cached {%- endcomment -%}
<script>
  const price = {{ product.price }};
  document.querySelector('.price').textContent = price;
</script>

{%- comment -%} Correct — data via attributes, logic in asset file {%- endcomment -%}
<div class="price" data-price="{{ product.price | money }}">
  {{ product.price | money }}
</div>
```

### Pass Data via `data-` Attributes
```liquid
<div
  class="product-gallery"
  data-product-id="{{ product.id }}"
  data-images='{{ product.images | json }}'
  data-selected-variant="{{ product.selected_or_first_available_variant.id }}"
>
```

```javascript
const gallery = document.querySelector('.product-gallery');
const productId = gallery.dataset.productId;
const images = JSON.parse(gallery.dataset.images);
```

## Defer Non-Critical Work

### Use `requestIdleCallback` for Non-Essential JS
```javascript
// Analytics, tracking, non-visible UI enhancements
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    initAnalytics();
    initNewsletterPopup();
  });
} else {
  setTimeout(() => {
    initAnalytics();
    initNewsletterPopup();
  }, 2000);
}
```

### Use Intersection Observer for Below-Fold Interactivity
Don't initialize JS for sections the user hasn't scrolled to:
```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      initSection(entry.target);
      observer.unobserve(entry.target);
    }
  });
}, { rootMargin: '200px' });

document.querySelectorAll('[data-deferred-init]').forEach(el => {
  observer.observe(el);
});
```

## Identify and Remove Unused JS

### Common Sources of Unused JS in Shopify Themes
1. **Vendor libraries loaded globally** — jQuery, Swiper, etc. loaded on every page even when only one section uses them
2. **Feature JS for disabled features** — slider JS loaded even when slider is off
3. **App scripts** — third-party apps inject JS on every page (this is flagged to client, not fixable in theme)

### Audit Checklist
- Is every `<script>` tag in `theme.liquid` or `base.liquid` actually needed on every page?
- Can any global script be moved to the specific section that needs it?
- Are vendor libraries loaded conditionally or always?
- Are there `<script>` tags for features that have been removed?

## Third-Party Scripts

### Identify Impact
Third-party scripts (apps, analytics, chat widgets) are the #1 cause of poor TBT on Shopify stores. The `/diagnose` command flags these for the client report.

### What We Can Do
- Add `async` to third-party scripts that don't need DOM access
- Defer third-party initialization to `requestIdleCallback`
- Use facade patterns for heavy embeds (e.g., YouTube lite embed)

### What Requires Client Action
- Removing unused apps
- Contacting app vendors for lighter script options
- Choosing between app functionality and performance score

## Event Delegation

Instead of attaching listeners to many elements:
```javascript
// Bad — N listeners for N items
document.querySelectorAll('.product-card').forEach(card => {
  card.addEventListener('click', handleClick);
});

// Good — 1 listener on parent
document.querySelector('.product-grid').addEventListener('click', (e) => {
  const card = e.target.closest('.product-card');
  if (card) handleClick(card);
});
```
