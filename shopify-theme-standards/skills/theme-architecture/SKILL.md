---
name: theme-architecture
description: Shopify theme file structure, naming conventions, and architecture. MUST be followed when creating new files, organizing code, deciding where to place sections/snippets/assets/templates, or reviewing overall theme structure. Covers directory layout, kebab-case naming, when to create snippets, section independence, and Online Store 2.0 JSON templates.
user-invocable: false
---

# Theme Architecture

## Shopify Theme File Structure
```
theme/
├── assets/          # CSS, JS, images, fonts
├── config/          # settings_schema.json, settings_data.json
├── layout/          # theme.liquid, password.liquid
├── locales/         # Translation files
├── sections/        # All sections
├── snippets/        # Reusable Liquid partials
├── templates/       # JSON templates (Online Store 2.0)
└── templates/customers/  # Customer account templates
```

---

## Naming Conventions

### Sections
- Always `kebab-case.liquid`
- Name should describe the section's purpose

```
hero-banner.liquid
product-carousel.liquid
testimonials.liquid
featured-collections.liquid
```

### Templates (JSON)
- Always JSON templates (Online Store 2.0)
- `kebab-case.json`
- Alternate templates: `product.kebab-case-name.json`

```
product.json
collection.json
index.json
product.with-video.json
```

### Snippets
- Always `kebab-case.liquid`
- Two naming approaches based on purpose:

**Section-specific snippets** — prefix with section name:
```
hero-banner-slide.liquid
hero-banner-video.liquid
search-modal-loader.liquid
search-modal-recent-searches.liquid
search-modal-trending-collections.liquid
```

**Purpose-based snippets** — name by function:
```
product-card.liquid
css.liquid
icon.liquid
responsive-image.liquid
price-display.liquid
```

### Assets
- CSS files: `section-name-stylesheet.css`
- JS files: `section-name-javascript.js`
- All `kebab-case`

```
hero-banner-stylesheet.css
hero-banner-javascript.js
product-carousel-stylesheet.css
product-carousel-javascript.js
```

---

## When to Create a Snippet

### 1. Data Rendering from Single Source of Truth
When rendering data from one object and the code is long, extract to a snippet. The classic example is a product card — it renders from a product object and is used in many places.

```liquid
{% render 'product-card', card_product: product %}
```

### 2. SVGs and Icons
Never render SVG markup directly in sections or templates. Always use snippets for icons.

```liquid
{%- comment -%} ✅ GOOD {%- endcomment -%}
{% render 'icon', icon: 'cart' %}

{%- comment -%} ❌ BAD — SVG inline in section {%- endcomment -%}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>
```

### 3. Code Organization and Readability
When a section has distinct functional areas, extract each into a snippet to make the section file readable and maintainable.

```liquid
{%- comment -%} ✅ GOOD — clear, readable, each part is self-contained {%- endcomment -%}
{% render 'search-modal-loader' %}
{% render 'search-modal-recent-searches' %}
{% render 'search-modal-recently-viewed-products' %}
{% render 'search-modal-trending-collections' %}
{% render 'search-modal-categories' %}
{% render 'search-modal-best-sellers-products' %}

{%- comment -%} ❌ BAD — 300 lines of mixed HTML in one section file {%- endcomment -%}
```

### 4. Block Rendering
All blocks are rendered via snippets. Snippet name matches block type.

```liquid
{%- comment -%} Block type: hero-banner-slide → snippet: hero-banner-slide.liquid {%- endcomment -%}
{% render 'hero-banner-slide', block: block %}
```

### When NOT to Create a Snippet
- Don't extract tiny pieces (2-3 lines) into snippets — that adds overhead without readability benefit
- Don't create snippets that are only used once AND are short — keep them inline if under ~15 lines

---

## Architectural Principles

### Section Independence
Each section must be fully self-contained:
- Its own CSS file
- Its own JS file (if interactive)
- No dependency on another section's assets
- Works regardless of page template or position

### Template Structure (JSON)
Templates define which sections appear and in what order. Keep them thin — all customization happens at the section level through schema settings.

### Settings Schema (config/settings_schema.json)
Theme-level settings go here for values used across the entire theme. Section-specific settings always go in the section's schema, not here.

---

## Reference Files
Check `references/patterns-learned.md` for architecture decisions and patterns specific to this project.