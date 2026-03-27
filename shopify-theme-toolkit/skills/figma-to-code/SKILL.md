---
name: figma-to-code
description: >
  Standards for translating Figma designs into Shopify theme code. Apply whenever building sections
  or components from Figma designs, converting React+Tailwind reference code to Liquid+CSS, mapping
  Figma layers to section schemas, implementing responsive layouts from desktop+mobile frames, or
  handling images and assets from design files. Also use when reviewing code that was generated from
  a Figma source to verify translation fidelity.
---

# Figma-to-Code Translation Standards

These standards apply when building Shopify theme code from a Figma design. The Figma MCP tools return React+Tailwind reference code and screenshots — this skill defines how to translate that into production Shopify theme code following all project standards.

## Core Principle

Figma reference code is a **starting point**, not final output. Every translation must produce code that follows `liquid-standards`, `css-standards`, `section-standards`, `section-schema-standards`, `js-standards`, and `theme-architecture` exactly as if the code were written from scratch.

---

## Translation Reference

For detailed translation matrices (React→Liquid, Tailwind→CSS, JSX→Liquid, layer→schema mappings), read `${CLAUDE_SKILL_DIR}/reference/translation-matrix.md`.

Key principles:
- React component → Section, nested component → snippet, props → schema settings
- Tailwind utilities → BEM classes in CSS asset file. Never output Tailwind in Liquid.
- Repeating Figma layers → section blocks (not hardcoded repetitions)
- Setting IDs: `snake_case` with section/block context prefix, derived from Figma layer names

---

## Image and Asset Handling

### Asset Manifest Integration

When building from a Figma design, check for an asset manifest at `.buildspace/assets/{feature-name}/asset-manifest.json`. If it exists, use the `shopifyUrl` values from the manifest to reference uploaded assets in template JSON files.

Each asset in the manifest includes a `viewport` field (`desktop`, `mobile`, or `both`) indicating which breakpoint(s) the asset is intended for. Use this to map assets to the correct responsive image settings (e.g., `hero_image` for desktop, `hero_image_mobile` for mobile).

### Referencing Uploaded Assets in Template JSON

Assets uploaded to Shopify via the `/figma` command are referenced using Shopify's internal URL format:

- **Images:** `shopify://shop_images/{filename}.png`
- **Videos:** `shopify://files/videos/{filename}.mp4`

When writing template JSON files during `/build`, use these URLs as setting values for `image_picker` and `video_url` settings:

```json
{
  "sections": {
    "hero-banner": {
      "type": "hero-banner",
      "settings": {
        "hero_image": "shopify://shop_images/hero-banner-hero-background-desktop.png",
        "hero_image_mobile": "shopify://shop_images/hero-banner-hero-background-mobile.png",
        "hero_video": "shopify://files/videos/hero-banner-compatibility-video.mp4"
      },
      "blocks": {}
    }
  }
}
```

If the manifest shows `"status": "LOCAL_ONLY"` (no Shopify upload), leave image/video settings empty in the template JSON — the merchant will upload manually via the theme editor.

If an individual asset has `"status": "FAILED"` in the manifest, treat it the same as LOCAL_ONLY for that specific asset — leave the setting empty and add a code comment noting the failed upload needs manual resolution.

### Image Layers
- Every image layer maps to an `image_picker` setting in the schema
- Output responsive images using the `<picture>` element or `{{ image | image_url }}` with width parameters
- Always include `alt` text — add a corresponding `text` setting for alt: `hero_image_alt`
- Use `loading="lazy"` for below-fold images, `loading="eager"` + `fetchpriority="high"` for hero images

### Responsive Image Pattern
```liquid
{%- if section.settings.image != blank -%}
  <picture>
    <source
      media="(min-width: 768px)"
      srcset="{{ section.settings.image | image_url: width: 1200 }}"
    >
    <img
      src="{{ section.settings.image | image_url: width: 600 }}"
      alt="{{ section.settings.image_alt | escape }}"
      width="{{ section.settings.image.width }}"
      height="{{ section.settings.image.height }}"
      loading="lazy"
    >
  </picture>
{%- endif -%}
```

### Icons and SVGs
- Small UI icons: inline SVG in a snippet, rendered via `{% render 'icon-name' %}`
- Decorative/complex SVGs from Figma: save as asset file, reference via `{{ 'icon.svg' | asset_url }}`
- Never use icon fonts

---

## Responsive Design from Desktop + Mobile Frames

### Mobile-First Approach
- Base CSS = mobile frame layout (this is mandatory per `css-standards`)
- Add breakpoints for tablet (768px) and desktop (1024px+) layouts
- Use the desktop Figma frame for breakpoint-up styles
- Use the mobile Figma frame for base styles
- Starting from the mobile frame ensures the constrained layout works first. Desktop enhancements are additive — if a breakpoint is missed, the mobile layout still functions. The reverse (desktop-first) can leave mobile layouts broken.

### Mapping Two Frames to CSS
1. **Start with the mobile frame** — write base CSS matching mobile layout
2. **Compare desktop frame** — identify what changes at larger viewports
3. **Add breakpoints** — only for properties that differ between mobile and desktop
4. Common differences: flex-direction, grid columns, font-size, padding, visibility

### Responsive Pattern
```css
/* Base = mobile frame */
.hero-banner__content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
}

/* Desktop frame */
@media (min-width: 1024px) {
  .hero-banner__content {
    flex-direction: row;
    gap: 2rem;
    padding: 3rem;
  }
}
```

### When Frames Conflict
- If mobile frame shows elements hidden on desktop (or vice versa), use a `checkbox` setting or CSS `display: none` at the appropriate breakpoint
- If layout is fundamentally different (not just reflow), consider separate markup blocks with responsive visibility classes

---

## Figma-Specific Gotchas

For the full gotchas reference (auto-layout, constraints, effects, text styles, variants, colors, spacing), read `${CLAUDE_SKILL_DIR}/reference/figma-gotchas.md`.

Critical gotchas to always remember:
- Figma absolute positioning does NOT mean CSS `position: absolute` — use flexbox/grid first
- "Hug contents" → no explicit width/height. "Fill container" → `flex: 1` or `width: 100%`
- Use `rem` for font-size (convert from Figma px, base 16px), keep `px` for borders/shadows
- Figma color styles may include opacity — always check the alpha value
- Figma measurements are between frames — verify padding vs gap vs margin intent

---

## Checklist

Validate every file built from a Figma design against these before moving to the next TODO.

### Design Fidelity
- [ ] All visible text layers have corresponding schema settings or hardcoded content
- [ ] All image layers use `image_picker` settings with alt text settings
- [ ] Colors match Figma values — mapped to CSS custom properties or theme tokens
- [ ] Typography matches Figma: font-size (rem), line-height, font-weight, letter-spacing
- [ ] Spacing matches Figma: padding, margin, gap converted appropriately (rem for large, px for small)
- [ ] All Figma effects translated: shadows, blurs, border-radius

### Layout Translation
- [ ] Auto-layout converted to flexbox/grid — not absolute positioning
- [ ] "Hug contents" layers do NOT have explicit width/height
- [ ] "Fill container" layers use `flex: 1` or `width: 100%`
- [ ] Absolute positioning used ONLY for true overlays
- [ ] Figma constraints evaluated — most are normal flow, not CSS `position`

### Responsive Implementation
- [ ] Base CSS matches the **mobile** Figma frame
- [ ] Breakpoint CSS matches the **desktop** Figma frame
- [ ] Only changed properties appear in breakpoint media queries
- [ ] Elements hidden on one frame use appropriate responsive visibility
- [ ] Images use responsive `<picture>` or `image_url` with width parameters

### Schema Mapping
- [ ] Every editable text → `text` or `richtext` setting
- [ ] Every image → `image_picker` setting + alt text setting
- [ ] Every color → `color` or `color_scheme` setting
- [ ] Repeating elements → section blocks (not hardcoded repetitions)
- [ ] Variant properties → `select` settings or block types
- [ ] Setting IDs derived from Figma layer names, using `snake_case` with context prefix
- [ ] Setting labels are Title Case and section-specific

### Asset Handling
- [ ] Asset manifest checked at `.buildspace/assets/{feature-name}/asset-manifest.json`
- [ ] Template JSON uses `shopify://` URLs from manifest for uploaded assets
- [ ] Assets with `LOCAL_ONLY` status: image/video settings left empty for manual upload
- [ ] Icons: small UI icons as inline SVG snippets, complex SVGs as asset files
- [ ] No icon fonts used
- [ ] Hero/above-fold images: `loading="eager"` + `fetchpriority="high"`
- [ ] Below-fold images: `loading="lazy"`
- [ ] All images have `width` and `height` attributes
- [ ] Video assets use `video_url` settings, not `image_picker`
- [ ] Video assets from manifest use `shopify://files/videos/` URLs (not `shopify://shop_images/`)
- [ ] Failed assets (`"status": "FAILED"`) have settings left empty with a comment for manual upload

### Code Standards Compliance
- [ ] All other skill checklists still pass (liquid, css, section, schema, js, architecture)
- [ ] No Tailwind classes in output — all converted to BEM CSS
- [ ] No React patterns in output — all converted to Liquid
- [ ] No `useState` or event handlers — use Liquid logic or vanilla JS with `data-` attributes
