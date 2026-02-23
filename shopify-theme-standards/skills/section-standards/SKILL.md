---
name: section-standards
description: Defines section file structure, wrapper patterns, block rendering, and section architecture for Shopify theme sections. Use when creating, modifying, or reviewing section .liquid files.
---

# Section Patterns

## Section File Structure
Every section file follows this order from top to bottom:

1. **CSS** — Asset file call
2. **HTML** — Section markup
3. **JS** — Asset file call
4. **Schema** — `{% schema %}` block

```liquid
{%- comment -%} 1. CSS {%- endcomment -%}
{% render 'css', filename: 'hero-banner-stylesheet.css', loading: 'preload' %}

{%- comment -%} 2. HTML {%- endcomment -%}
<div class="hero-banner">
  {%- for block in section.blocks -%}
    {%- case block.type -%}
      {%- when 'hero-banner-slide' -%}
        {% render 'hero-banner-slide', block: block %}
    {%- endcase -%}
  {%- endfor -%}
</div>

{%- comment -%} 3. JS {%- endcomment -%}
<script src="{{ 'hero-banner.js' | asset_url }}" defer="defer"></script>

{%- comment -%} 4. Schema {%- endcomment -%}
{% schema %}
{
  "name": "Hero Banner",
  "class": "hero-banner-section",
  "settings": [],
  "blocks": [],
  "presets": [
    {
      "name": "Hero Banner"
    }
  ]
}
{% endschema %}
```

Never mix this order. CSS at top, schema at bottom, always.

## Section Wrapper
Every section has a `<div>` wrapper. The wrapper class name matches the section filename exactly.

```
Section file: hero-banner.liquid     → class="hero-banner"
Section file: product-carousel.liquid → class="product-carousel"
Section file: testimonials.liquid     → class="testimonials"
```

```liquid
<div class="hero-banner">
  <!-- section content -->
</div>
```

No extra `id`, `data-` attributes, or additional tags on the wrapper unless the section's functionality specifically requires them.

## Block Rendering
Always extract blocks into snippets using `{% render %}`. Never write block HTML inline in the section file.

```liquid
{%- comment -%} ✅ GOOD — block rendered via snippet {%- endcomment -%}
{%- for block in section.blocks -%}
  {%- case block.type -%}
    {%- when 'hero-banner-slide' -%}
      {% render 'hero-banner-slide', block: block %}
  {%- endcase -%}
{%- endfor -%}

{%- comment -%} ❌ BAD — block HTML inline in section {%- endcomment -%}
{%- for block in section.blocks -%}
  {%- case block.type -%}
    {%- when 'hero-banner-slide' -%}
      <div class="hero-banner-slide">
        <img src="{{ block.settings.hero_banner_slide_desktop_image | image_url }}">
        <div>{{ block.settings.hero_banner_slide_content }}</div>
      </div>
  {%- endcase -%}
{%- endfor -%}
```

The snippet name should match the block type: block type `hero-banner-slide` → snippet `hero-banner-slide.liquid`.

## Section Settings vs Block Settings
- **Section settings** — single, non-repeatable things that affect the entire section (background color, section heading, layout style)
- **Block settings** — repeatable content units (slides, cards, testimonials, FAQ items)

If a merchant might want more than one of it, it's a block. If there's only ever one, it's a section setting.

## Multiple Block Types
When a section has multiple block types, use `case/when` to render each:

```liquid
{%- for block in section.blocks -%}
  {%- case block.type -%}
    {%- when 'hero-banner-slide' -%}
      {% render 'hero-banner-slide', block: block %}
    {%- when 'hero-banner-video' -%}
      {% render 'hero-banner-video', block: block %}
  {%- endcase -%}
{%- endfor -%}
```

## Section Independence
Each section must be fully self-contained:
- No section should depend on another section's CSS or JS
- Sections should work regardless of page template or position
- Shared code goes in snippets, not duplicated across sections

## Reference Files
Check `references/patterns-learned.md` for section patterns discovered during development.