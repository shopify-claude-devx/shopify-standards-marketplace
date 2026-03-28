---
name: figma-to-code
description: >
  Standards for translating Figma designs into Shopify theme code. Apply whenever building sections
  or components from Figma designs — converting design values to Liquid+CSS, mapping layers to
  schema settings, implementing responsive layouts, referencing uploaded assets. Also use when
  reviewing code built from Figma to verify translation fidelity.
---

# Figma-to-Code Translation Standards

These standards apply when building Shopify theme code from a Figma design. They define exactly
how to translate `design-context.md` values into production Liquid, CSS, and schema.

---

## The Single Source of Truth

**`design-context.md` is the only Figma file you read. Never open `figma-full.json`.**

`design-context.md` contains:
- Exact typography values (family, px, rem, weight, line-height, letter-spacing, color, node ID)
- Exact layout values (flex-direction, gap, padding, background)
- Layer structure with node IDs and BEM class suggestions
- Asset manifest references (images → Shopify URL, SVGs → snippet name)
- Responsive differences between desktop and mobile frames

Every value in your CSS must come directly from `design-context.md`. **Never guess or approximate.**

---

## Mandatory: `data-figma-id` on Every Element

Every rendered HTML element must carry a `data-figma-id` attribute matching its Figma node ID.
Without this, `position-diff.js` cannot verify the build — the entire accuracy loop breaks.

**Section wrapper** uses `data-figma-section`:
```liquid
<section class="hero-banner" data-figma-section="{{ section.id }}">
```

Wait — the `data-figma-section` value should be the Figma node ID, not `section.id`. Use the
literal node ID from `design-context.md`:

```liquid
<section class="hero-banner" data-figma-section="110:363">
  <div class="hero-banner__content" data-figma-id="111:380">
    <h1 class="hero-banner__title" data-figma-id="111:412">
      {{ section.settings.title }}
    </h1>
    <p class="hero-banner__body" data-figma-id="111:493">
      {{ section.settings.body }}
    </p>
    <div class="hero-banner__cta" data-figma-id="111:702">
      <a class="hero-banner__cta-link" href="{{ section.settings.cta_url }}" data-figma-id="111:703">
        {{ section.settings.cta_label }}
        {% render 'icon-cta-arrow' %}
      </a>
    </div>
  </div>
</section>
```

Rules:
- Every element that has a corresponding node in `design-context.md` Layer Structure → gets `data-figma-id`
- The section root element → gets `data-figma-section` (not `data-figma-id`)
- SVG snippets rendered via `{% render %}` → no attribute (the snippet itself is not a diffable element)
- Liquid `{% if %}` / `{% for %}` wrappers that produce no DOM element → no attribute

---

## Mandatory: CSS Typography Comment Block

The first thing written in every CSS file built from Figma must be the typography comment block.
Copy it verbatim from `design-context.md` → "CSS Typography Comment Block" section.

```css
/*
  Typography from Figma:
  headline      : Noto Serif, 32px (2rem), weight 300, lh 1.2, #f4f3f1
  body          : system-ui, 16px (1rem), weight 300, lh 1.19, #f4f3f1
  label         : system-ui, 20px (1.25rem), weight 300, ls 0.05em, uppercase, #f4f3f1
  background    : #040404
*/

/* === Hero Banner === */
.hero-banner { ... }
```

This block must appear before any rules. It is the living record of what the design specifies —
if a value in the CSS ever drifts from the comment block, that is a bug.

---

## Translation Reference

For detailed matrices (React→Liquid, Tailwind→CSS, JSX→Liquid, layer→schema), read:
`${CLAUDE_SKILL_DIR}/reference/translation-matrix.md`

For layout gotchas (auto-layout, constraints, effects, text styles), read:
`${CLAUDE_SKILL_DIR}/reference/figma-gotchas.md`

Key translation principles:
- React component → Section `.liquid` file
- Nested component → snippet via `{% render %}`
- Component props → schema settings
- Tailwind utilities → BEM classes in CSS asset file. **Never output Tailwind in Liquid.**
- Repeating Figma layers → section blocks (not hardcoded)

---

## Image and Asset Handling

### Images → Shopify Files (from asset-manifest.json)

Check `.buildspace/artifacts/{feature}/asset-manifest.json`. Use `shopifyUrl` values directly in template JSON for `image_picker` settings.

```json
{
  "sections": {
    "hero-banner": {
      "type": "hero-banner",
      "settings": {
        "hero_image": "shopify://shop_images/hero-banner-background.png",
        "hero_image_mobile": "shopify://shop_images/hero-banner-background-mobile.png"
      },
      "blocks": {}
    }
  }
}
```

- `REGISTERED` status → use `shopifyUrl`
- `FAILED` status → leave setting empty, add a `{# TODO: upload {name} manually #}` comment
- Every image layer → `image_picker` setting + `text` setting for alt text

### SVGs → inline snippets (from asset-manifest.json)

SVG icons were already written to `snippets/icon-{name}.liquid` by `export-assets.js`.
Reference them with `{% render %}`:

```liquid
{% render 'icon-cta-arrow' %}
{% render 'icon-close' %}
```

Never upload SVGs to Shopify Files. Never use `<img>` for SVG icons.

### Responsive images

```liquid
{%- if section.settings.image != blank -%}
  <picture>
    <source media="(min-width: 768px)"
            srcset="{{ section.settings.image | image_url: width: 1200 }}">
    <img src="{{ section.settings.image | image_url: width: 600 }}"
         alt="{{ section.settings.image_alt | escape }}"
         width="{{ section.settings.image.width }}"
         height="{{ section.settings.image.height }}"
         loading="lazy">
  </picture>
{%- endif -%}
```

---

## Responsive Design

- **Base CSS = mobile frame values** (mandatory per css-standards)
- **Breakpoint CSS = desktop frame values**
- Use `design-context.md` → "Responsive Differences" section for what changes

```css
/* Base = mobile frame */
.hero-banner__content {
  flex-direction: column;
  gap: 1rem;
  padding: 2.5rem 1.25rem;
}

/* Desktop frame */
@media (min-width: 1024px) {
  .hero-banner__content {
    flex-direction: row;
    gap: 3rem;
    padding: 5rem 3.75rem;
  }
}
```

Only properties that **differ** between frames belong in the media query.

---

## Hard Rules

- **Never guess style values.** Font sizes, weights, line-heights, letter-spacing, colors —
  every value must come from `design-context.md`. If a value is not there, re-read the file.
- **Never read `figma-full.json`.** Only `design-context.md`.
- **Never use Tailwind in output.** All converted to BEM CSS.
- **Never write inline `<style>` or `<script>` in Liquid.**
- **Never use absolute CSS positioning** unless the Figma element truly overlays another element.
  Figma absolute position ≠ CSS `position: absolute`. Use flexbox/grid first.
- **Font sizes in `rem`, converted from Figma px at base 16px.**
  Keep `px` for borders, box-shadow offsets, and values < 4px.
- **data-figma-id on every rendered element** — no exceptions.

---

## Checklist

Validate every file before marking the TODO complete.

### Design Fidelity (from design-context.md)
- [ ] CSS starts with the typography comment block from design-context.md
- [ ] All font families, sizes, weights, line-heights match design-context.md exactly
- [ ] All colors match design-context.md exactly — use CSS custom properties or exact values
- [ ] All spacing (padding, gap, margin) derived from design-context.md layout section
- [ ] All Figma effects translated: box-shadow, filter, backdrop-filter

### data-figma-id (Required for position-diff)
- [ ] Section root has `data-figma-section="{nodeId}"`
- [ ] Every child element from the Layer Structure has `data-figma-id="{nodeId}"`
- [ ] Node IDs match the exact values in design-context.md Layer Structure

### Layout Translation
- [ ] Auto-layout → flexbox/grid (not absolute positioning)
- [ ] "Hug contents" → no explicit width/height
- [ ] "Fill container" → `flex: 1` or `width: 100%`

### Responsive
- [ ] Base CSS = mobile frame values
- [ ] Media query CSS = desktop frame values
- [ ] Only changed properties in breakpoints
- [ ] Images use `<picture>` or `image_url` with width params

### Assets
- [ ] `asset-manifest.json` checked for `shopifyUrl` values
- [ ] Template JSON uses `shopify://shop_images/` URLs from manifest
- [ ] FAILED assets have empty settings with comment
- [ ] SVG icons use `{% render 'icon-{name}' %}` — not `<img>` or Shopify Files
- [ ] Hero/LCP images: `loading="eager"` + `fetchpriority="high"`
- [ ] Below-fold images: `loading="lazy"`
- [ ] All `<img>` tags have `width` and `height` attributes

### Schema Mapping
- [ ] Every editable text → `text` or `richtext` setting
- [ ] Every image → `image_picker` + alt text setting
- [ ] Repeating Figma layers → section blocks
- [ ] Setting IDs: `snake_case` with section context prefix
- [ ] Setting labels: Title Case, descriptive

### Code Standards
- [ ] All liquid-standards, css-standards, section-standards checks pass
- [ ] No Tailwind classes in output
- [ ] No React patterns in output
