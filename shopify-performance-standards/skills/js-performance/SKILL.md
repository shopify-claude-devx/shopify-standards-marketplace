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

### What We Can Do in Theme Code

**1. Defer/async:**
```liquid
{%- comment -%} Add defer to any third-party script {%- endcomment -%}
<script src="https://app.example.com/widget.js" defer></script>
```

**2. Conditional loading (page-type specific):**
```liquid
{%- comment -%} Reviews widget only on product pages {%- endcomment -%}
{%- if template == 'product' -%}
  <script src="https://app.example.com/reviews.js" defer></script>
{%- endif -%}
```

**3. Lazy load with IntersectionObserver:**
```liquid
{%- comment -%} Load script only when its section scrolls into view {%- endcomment -%}
<div id="reviews-container" data-lazy-script="https://app.example.com/reviews.js">
  <div class="reviews-placeholder" style="min-height: 200px;">
    Loading reviews...
  </div>
</div>
<script defer>
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const script = document.createElement('script');
        script.src = entry.target.dataset.lazyScript;
        document.head.appendChild(script);
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '200px' });
  document.querySelectorAll('[data-lazy-script]').forEach(el => observer.observe(el));
</script>
```

**4. Facade pattern for heavy embeds:**

YouTube facade — loads a static thumbnail, real iframe only on click:
```liquid
<div class="video-facade" data-video-id="{{ section.settings.video_id }}">
  <img
    src="https://img.youtube.com/vi/{{ section.settings.video_id }}/hqdefault.jpg"
    alt="{{ section.settings.video_title }}"
    loading="lazy"
    width="640"
    height="360"
  >
  <button class="video-facade__play" aria-label="Play video {{ section.settings.video_title }}">
    <svg width="68" height="48" viewBox="0 0 68 48" aria-hidden="true">
      <path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55C3.97 2.33 2.27 4.81 1.48 7.74.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="red"/>
      <path d="M45 24L27 14v20" fill="white"/>
    </svg>
  </button>
</div>
```
```javascript
// In section JS file (deferred)
document.querySelectorAll('.video-facade').forEach(facade => {
  facade.addEventListener('click', () => {
    const videoId = facade.dataset.videoId;
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    iframe.width = 640;
    iframe.height = 360;
    iframe.allow = 'autoplay; encrypted-media';
    iframe.allowFullscreen = true;
    facade.replaceWith(iframe);
  }, { once: true });
});
```

Google Maps facade — static image until click:
```liquid
<div class="map-facade" data-map-embed="{{ section.settings.map_embed_url }}">
  <img
    src="https://maps.googleapis.com/maps/api/staticmap?center={{ section.settings.map_address | url_encode }}&zoom=14&size=640x360&key={{ section.settings.google_maps_key }}"
    alt="Map showing {{ section.settings.map_address }}"
    loading="lazy"
    width="640"
    height="360"
  >
  <button class="map-facade__interact" aria-label="Load interactive map">
    View interactive map
  </button>
</div>
```

**5. Preconnect for scripts that must load:**
```liquid
{%- comment -%} In <head> — reduces connection time for critical third-party domains {%- endcomment -%}
<link rel="preconnect" href="https://app.example.com" crossorigin>
<link rel="dns-prefetch" href="https://app.example.com">
```

### What Requires Client Action
- Removing unused apps entirely
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
