---
name: liquid-performance
description: Liquid rendering performance standards for Shopify themes. Covers reducing server render time, avoiding N+1 loops, caching assigns, render tag isolation, pagination, and reducing DOM node count.
user-invocable: false
globs: ["**/*.liquid"]
---

# Liquid Performance Standards

Liquid executes server-side before the page reaches the browser. Slow Liquid = slow Time to First Byte (TTFB). These standards reduce Liquid render time and the resulting DOM size.

## Reduce Liquid Render Time

### Cache Repeated Access with `assign`
```liquid
{%- comment -%} Bad — accesses product.featured_image 4 times {%- endcomment -%}
<img
  src="{{ product.featured_image | image_url: width: 600 }}"
  srcset="{{ product.featured_image | image_url: width: 375 }} 375w, {{ product.featured_image | image_url: width: 750 }} 750w"
  alt="{{ product.featured_image.alt }}"
>

{%- comment -%} Good — assign once, use many {%- endcomment -%}
{%- assign featured_image = product.featured_image -%}
<img
  src="{{ featured_image | image_url: width: 600 }}"
  srcset="{{ featured_image | image_url: width: 375 }} 375w, {{ featured_image | image_url: width: 750 }} 750w"
  alt="{{ featured_image.alt | escape }}"
>
```

### Assign Outside Loops
```liquid
{%- comment -%} Bad — assigns on every iteration {%- endcomment -%}
{% for product in collection.products %}
  {% assign show_badge = settings.show_badges %}
  {% if show_badge %}...{% endif %}
{% endfor %}

{%- comment -%} Good — assign once before the loop {%- endcomment -%}
{%- assign show_badge = settings.show_badges -%}
{% for product in collection.products %}
  {% if show_badge %}...{% endif %}
{% endfor %}
```

## Avoid N+1 Patterns

### Don't Nest Collection Lookups
```liquid
{%- comment -%} Bad — fetches a collection inside a product loop {%- endcomment -%}
{% for product in collection.products %}
  {% for related in collections['related'].products %}
    {% if related.id == product.id %}...{% endif %}
  {% endfor %}
{% endfor %}

{%- comment -%} Better — use product tags or metafields for relationships {%- endcomment -%}
{% for product in collection.products %}
  {% if product.tags contains 'featured' %}...{% endif %}
{% endfor %}
```

### Limit Loop Iterations
```liquid
{%- comment -%} Bad — iterates ALL products {%- endcomment -%}
{% for product in collection.products %}

{%- comment -%} Good — limit to what's displayed {%- endcomment -%}
{% for product in collection.products limit: 12 %}
```

## Use `{% render %}` for Isolation

`{% render %}` creates an isolated scope, which is more efficient than `{% include %}` (deprecated) because the Liquid engine doesn't need to copy the parent scope:

```liquid
{%- comment -%} Each render call gets only what it needs {%- endcomment -%}
{% render 'product-card', product: product, show_price: true %}
```

## Pagination

### Always Paginate Collections
```liquid
{%- comment -%} Bad — loads all products at once {%- endcomment -%}
{% for product in collection.products %}

{%- comment -%} Good — paginate with a reasonable limit {%- endcomment -%}
{% paginate collection.products by 24 %}
  {% for product in collection.products %}
    {% render 'product-card', product: product %}
  {% endfor %}
  {% render 'pagination', paginate: paginate %}
{% endpaginate %}
```

### Pagination Size Guidelines
- Product grids: 12-24 per page
- Blog posts: 6-12 per page
- Search results: 12-20 per page

More items = more DOM nodes = more render time on both server and client.

## Reduce DOM Size

### Target: Under 1,500 DOM Nodes
Lighthouse flags pages with 1,500+ nodes. Common causes in Shopify themes:

1. **Mega menus rendered in HTML even when hidden** — use Liquid conditions to not render unused menus
2. **Product variant options rendered for all variants** — render only the visible variant, update via JS
3. **Excessive wrapper divs** — audit and remove unnecessary nesting
4. **Inline SVG icons repeated many times** — render SVG snippets, don't copy/paste SVG markup

### Conditional Rendering
```liquid
{%- comment -%} Don't render markup for disabled features {%- endcomment -%}
{%- if section.settings.show_reviews -%}
  {% render 'review-widget', product: product %}
{%- endif -%}

{%- comment -%} Don't render desktop-only elements on templates that might be mobile-heavy {%- endcomment -%}
{%- comment -%} Use CSS display:none only if the HTML is minimal; otherwise skip rendering {%- endcomment -%}
```

## Shopify Object Access Optimization

### Expensive Objects
Some Liquid objects are more expensive to access:
- `all_products['handle']` — triggers a database query each time
- `collections['handle'].products` — fetches the collection each time
- `product.metafields.namespace.key` — database query per metafield

### Mitigation
```liquid
{%- comment -%} Assign expensive lookups once {%- endcomment -%}
{%- assign featured_collection = collections['featured'] -%}
{%- assign featured_products = featured_collection.products -%}

{%- comment -%} Use sparingly — each all_products call is expensive {%- endcomment -%}
{%- assign special_product = all_products['special-handle'] -%}
```

## Preload / Prefetch Hints in Liquid

Generate resource hints for critical assets:
```liquid
{%- comment -%} In layout/theme.liquid <head> {%- endcomment -%}

{%- comment -%} Preconnect to Shopify CDN {%- endcomment -%}
<link rel="preconnect" href="https://cdn.shopify.com" crossorigin>

{%- comment -%} DNS prefetch for third-party domains {%- endcomment -%}
<link rel="dns-prefetch" href="https://www.google-analytics.com">
```
