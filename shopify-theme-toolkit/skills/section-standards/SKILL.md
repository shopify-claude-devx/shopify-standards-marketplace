---
name: section-standards
description: >
  Shopify section file structure and block rendering patterns. Apply whenever creating, editing,
  reviewing, or generating any section .liquid file, including when converting designs into sections
  or refactoring existing section code. Covers file ordering (CSS/HTML/JS/Schema), section wrappers,
  block rendering via snippets, case/when patterns, and section independence.
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
{{ 'hero-banner-stylesheet.css' | asset_url | stylesheet_tag: preload: true }}

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
<script src="{{ 'hero-banner.js' | asset_url }}" defer></script>

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

Keep this order consistently. CSS loads first so the section renders styled before JS executes — preventing flash of unstyled content (FOUC). Schema at the bottom keeps the data contract separate from the rendering logic, making both easier to scan and edit independently. JS loads after HTML so the DOM elements it targets already exist.

## Section Wrapper
Every section has a `<div>` wrapper. The wrapper class name matches the section filename exactly.

A consistent wrapper class matching the filename makes CSS scoping predictable — when you see `hero-banner.liquid`, you know the root class is `.hero-banner` without opening the file.

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

Keeping the wrapper minimal prevents attribute bloat. Add `data-` attributes only when JS needs to read configuration from the DOM.

## Block Rendering
Extract blocks into snippets using `{% render %}`. Liquid's `{% render %}` tag creates an isolated scope, preventing variable name collisions between blocks and the parent section. It also keeps the section file scannable — a section with 5 block types stays under 30 lines of Liquid instead of ballooning to hundreds.

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
This distinction matters because blocks are repeatable — merchants can add, remove, and reorder them in the theme editor. Section settings are fixed — one instance per section.

- **Section settings** — single, non-repeatable things that affect the entire section (background color, section heading, layout style)
- **Block settings** — repeatable content units (slides, cards, testimonials, FAQ items)

If a merchant might want more than one of it, it's a block. If there's only ever one, it's a section setting.

## Multiple Block Types
When a section has multiple block types, use `case/when` to render each:

The `case/when` pattern maps each block type to its snippet cleanly. It's more readable than chained `if/elsif` when there are 3+ block types, and it makes adding a new block type a one-line addition.

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
Independence means a section works correctly regardless of which page template it appears on, what other sections surround it, or what position it occupies. This is the foundation of Shopify's drag-and-drop section reordering.

Each section must be fully self-contained:
- No section should depend on another section's CSS or JS
- Sections should work regardless of page template or position
- Shared code goes in snippets, not duplicated across sections

## Checklist

Validate every section `.liquid` file against these.

### File Structure
- [ ] File order: CSS → HTML → JS → Schema
- [ ] Wrapper `<div>` class matches section filename
- [ ] No extra attributes on wrapper unless JS functionality requires them

### Block Rendering
- [ ] Blocks rendered via `{% render %}` snippets — NEVER inline HTML
- [ ] Snippet name matches block type
- [ ] `case/when` used for multiple block types (not if/elsif)

### Section Independence
- [ ] Section has its own CSS file
- [ ] Section has its own JS file (if interactive)
- [ ] No dependency on another section's assets
- [ ] Works regardless of page template or position

### Settings
- [ ] Repeatable content uses blocks, not section settings
- [ ] Non-repeatable content uses section settings, not blocks