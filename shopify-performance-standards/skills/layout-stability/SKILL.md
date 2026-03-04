---
name: layout-stability
description: Layout stability and CLS prevention standards for Shopify themes. Covers explicit dimensions on media, aspect-ratio usage, skeleton placeholders, reserving space for dynamic content, and preventing layout-shifting injections.
user-invocable: false
globs: ["**/*.liquid", "assets/**/*.css"]
---

# Layout Stability Standards (CLS Prevention)

Cumulative Layout Shift (CLS) measures visual stability. Every unexpected layout movement during page load degrades user experience and hurts the performance score. Target: CLS < 0.1.

## Explicit Dimensions on All Media

### Images Must Have width and height
```liquid
{%- comment -%} Every img tag needs explicit dimensions {%- endcomment -%}
<img
  src="{{ image | image_url: width: 600 }}"
  alt="{{ image.alt | escape }}"
  width="{{ image.width }}"
  height="{{ image.height }}"
  loading="lazy"
>
```

The browser uses width/height to calculate aspect ratio and reserve space before the image loads.

### Videos Must Have Dimensions
```liquid
<video
  width="1280"
  height="720"
  poster="{{ section.settings.video_poster | image_url: width: 1280 }}"
  loading="lazy"
>
```

### Iframes Must Have Dimensions
```liquid
<iframe
  src="{{ section.settings.video_url }}"
  width="560"
  height="315"
  loading="lazy"
  title="{{ section.settings.video_title | escape }}"
></iframe>
```

## Use `aspect-ratio` for Responsive Containers

```css
/* Reserve space for images in responsive containers */
.product-card__image-wrapper {
  aspect-ratio: 1 / 1;
  overflow: hidden;
}

.product-card__image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Hero banner with known aspect ratio */
.hero-banner__media {
  aspect-ratio: 16 / 9;
}

@media (max-width: 767px) {
  .hero-banner__media {
    aspect-ratio: 4 / 3;
  }
}
```

## Prevent Common CLS Sources

### 1. Web Fonts Causing Layout Shift
Use `font-display: swap` with size-adjusted fallbacks (see `font-performance` skill).

### 2. Dynamic Content Injection
Content loaded after initial render (reviews, recommendations, app widgets) shifts layout:

```css
/* Reserve space for known dynamic content */
.reviews-widget-placeholder {
  min-height: 300px;
}

/* After content loads, remove the minimum */
.reviews-widget-placeholder--loaded {
  min-height: auto;
}
```

### 3. Ads and Banners
```css
/* Reserve exact space for announcement bars */
.announcement-bar {
  min-height: 40px;
}
```

### 4. Images Without Dimensions (Most Common)
Already covered above. This is the #1 CLS cause — audit every `<img>` tag.

### 5. Top-Injected Elements
Elements inserted at the top of the page (cookie banners, promo bars) push everything down:
```css
/* Use transform instead of pushing content */
.cookie-banner {
  position: fixed;
  bottom: 0;
  /* NOT position: relative at the top of the page */
}
```

## Skeleton Placeholders

For sections with heavy content that loads progressively:
```liquid
<div class="product-recommendations">
  {%- if recommendations.performed? -%}
    {%- for product in recommendations.products -%}
      {% render 'product-card', product: product %}
    {%- endfor -%}
  {%- else -%}
    {%- comment -%} Placeholder with reserved space {%- endcomment -%}
    <div class="product-recommendations__placeholder" aria-hidden="true">
      {%- for i in (1..4) -%}
        <div class="product-card-skeleton">
          <div class="product-card-skeleton__image"></div>
          <div class="product-card-skeleton__text"></div>
          <div class="product-card-skeleton__price"></div>
        </div>
      {%- endfor -%}
    </div>
  {%- endif -%}
</div>
```

```css
.product-card-skeleton__image {
  aspect-ratio: 1 / 1;
  background-color: #f0f0f0;
  border-radius: 4px;
}

.product-card-skeleton__text {
  height: 1rem;
  width: 80%;
  margin-top: 0.75rem;
  background-color: #f0f0f0;
  border-radius: 2px;
}
```

## Avoiding Layout Shifts from JavaScript

### Don't Modify Layout After Load
```javascript
// Bad — causes layout shift
element.style.height = calculatedHeight + 'px';
element.style.marginTop = '20px';

// Better — use CSS classes
element.classList.add('expanded');
// CSS handles the height change with proper space reservation
```

### Use `transform` for Animations, Not Layout Properties
```css
/* Bad — triggers layout recalculation */
.slide-in {
  margin-left: -100%;
  transition: margin-left 0.3s;
}

/* Good — only composites, no layout shift */
.slide-in {
  transform: translateX(-100%);
  transition: transform 0.3s;
}
```

## Testing CLS

### Key Pages to Test
1. **Homepage** — hero images, announcement bars, above-fold content
2. **PDP** — product images, variant selectors, reviews widget
3. **PLP** — product grid images, filter UI
4. **Cart** — cart items, upsell widgets

### Common CLS Triggers by Page Type
| Page | Common CLS Source | Fix |
|---|---|---|
| Homepage | Hero image without dimensions | Add width/height + aspect-ratio |
| Homepage | Late-loading announcement bar | Reserve space with min-height |
| PDP | Product image gallery | Set aspect-ratio on container |
| PDP | Reviews widget loading | Reserve min-height placeholder |
| PLP | Product card images | width/height + aspect-ratio wrapper |
| All | Font swap | size-adjusted fallback font |
| All | App-injected banners | Flag for client — can't fix in theme |
