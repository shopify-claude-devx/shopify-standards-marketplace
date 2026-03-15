---
name: figma-to-code
description: >
  Standards for translating Figma designs into Shopify theme code. Apply whenever building sections
  or components from Figma designs, converting React+Tailwind reference code to Liquid+CSS, mapping
  Figma layers to section schemas, implementing responsive layouts from desktop+mobile frames, or
  handling images and assets from design files. Also use when reviewing code that was generated from
  a Figma source to verify translation fidelity.
user-invocable: true
---

# Figma-to-Code Translation Standards

These standards apply when building Shopify theme code from a Figma design. The Figma MCP tools return React+Tailwind reference code and screenshots — this skill defines how to translate that into production Shopify theme code following all project standards.

## Core Principle

Figma reference code is a **starting point**, not final output. Every translation must produce code that follows `liquid-standards`, `css-standards`, `section-standards`, `section-schema-standards`, `js-standards`, and `theme-architecture` exactly as if the code were written from scratch.

---

## React+Tailwind to Liquid+CSS Translation

### Component Structure Mapping
| Figma Reference (React+Tailwind) | Shopify Theme Output |
|---|---|
| React component | Section `.liquid` file |
| Nested component | Snippet via `{% render %}` |
| Component props | Section schema settings |
| `className="..."` (Tailwind) | BEM classes in CSS asset file |
| `{children}` / slots | Block rendering via `{% render %}` snippets |
| Conditional rendering (`&&`, ternary) | `{% if %}` / `{% unless %}` |
| `.map()` loops | `{% for %}` loops |
| State / useState | Not applicable — use Liquid logic or JS with `data-` attributes |
| Event handlers | Vanilla JS in asset file with `defer` |

### Tailwind to CSS Translation
- Convert Tailwind utility classes to semantic BEM classes: `flex items-center gap-4` → `.section-name__container` with equivalent CSS properties
- Follow the CSS property ordering from `css-standards`: Layout → Flex/Grid → Sizing → Spacing → Typography → Visual → Effects → Responsive
- Use CSS custom properties for values that come from schema settings
- Never output Tailwind classes in Liquid templates

### JSX to Liquid Translation
```
// React JSX                          → Liquid equivalent
<div className="...">                 → <div class="section-name__element">
{title && <h2>{title}</h2>}           → {% if section.settings.title != blank %}<h2>{{ section.settings.title }}</h2>{% endif %}
{items.map(item => ...)}              → {% for item in section.settings.items %} ... {% endfor %}
<Component prop={value} />            → {% render 'snippet-name', prop: value %}
```

---

## Figma Layer to Section Schema Mapping

### Layer Types to Settings
| Figma Layer / Property | Schema Setting Type |
|---|---|
| Text layer | `text` or `richtext` (use `richtext` if formatting visible) |
| Image layer | `image_picker` |
| Color fill | `color` or `color_scheme` |
| Boolean visibility | `checkbox` |
| Text with number | `range` or `number` |
| Link / button | `url` (pair with `text` for label) |
| Dropdown / variant | `select` with options |
| Video layer | `video_url` |

### Repeating Elements to Blocks
- Figma layers that repeat with the same structure → section blocks. Blocks are the right mapping because Figma's repeated instances correspond to content a merchant will want to add, remove, and reorder — exactly what Shopify blocks enable in the theme editor.
- Each unique variant of a repeating element → a block type
- Block type: `kebab-case`, block name: `Title Case`
- Block settings follow the same layer-to-setting mapping above
- Setting IDs follow the same convention as section-schema-standards: snake_case with full section and block context prefix. For example, a heading inside a 'hero-banner-slide' block becomes `hero_banner_slide_heading`, not just `block_heading`.

### Naming Conventions
- Section setting IDs: `snake_case` with section context prefix
- Derive setting IDs from the Figma layer name when descriptive: layer "Hero Title" → `hero_title`
- Setting labels: Title Case, section-specific (never generic like "Text" — use "Hero Title")

---

## Image and Asset Handling

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

### Auto Layout → Flexbox/Grid
- Figma auto-layout maps to CSS flexbox in most cases
- `direction: horizontal` → `flex-direction: row`
- `direction: vertical` → `flex-direction: column`
- Auto-layout `gap` → CSS `gap`
- `padding` in auto-layout → CSS `padding`
- **Gotcha:** Figma auto-layout "space between" mode → `justify-content: space-between`
- **Gotcha:** Figma "hug contents" → don't set explicit width/height (use `fit-content` or auto)
- **Gotcha:** Figma "fill container" → `flex: 1` or `width: 100%`

### Constraints and Positioning
- Figma absolute positioning does NOT mean CSS `position: absolute` — evaluate if flexbox/grid achieves the same layout first
- Figma "pin to top-left" is often just normal document flow
- Only use `position: absolute` when the element truly overlays another element
- Figma uses absolute positioning as its default layout mechanism, but CSS flexbox and grid handle most of the same layouts more robustly. Absolute positioning in CSS breaks document flow and makes responsive behavior harder to manage.

### Effects
- Figma drop shadow → CSS `box-shadow`
- Figma inner shadow → CSS `box-shadow: inset`
- Figma background blur → CSS `backdrop-filter: blur()`
- Figma layer blur → CSS `filter: blur()`
- **Gotcha:** Figma effects stack — translate each one, check combined result

### Text Styles
- Map Figma font-size, line-height, letter-spacing, and font-weight directly to CSS
- Use `rem` for font-size, not `px` — convert from Figma's px values (base 16px)
- Figma "auto" line-height → CSS `line-height: normal`
- **Gotcha:** Figma text decoration and text-transform are separate properties — check both

### Variants and Component Sets
- Figma component variants often map to block types or setting-controlled states
- Variant property "State: hover" → CSS `:hover` pseudo-class
- Variant property "Size: small/medium/large" → `select` setting or CSS modifier classes
- Variant property "Type: primary/secondary" → block types or `select` setting

### Colors and Tokens
- If Figma design tokens are returned, map them to CSS custom properties
- Check if the theme already has matching CSS variables before creating new ones
- Figma opacity on a layer → CSS `opacity` (if the whole layer) or alpha channel in color
- **Gotcha:** Figma color styles may include opacity — always check the alpha value

### Spacing and Sizing
- Convert Figma px values to rem where appropriate (font-size, padding, margin, gap)
- Keep px for borders, box-shadow offsets, and small decorative values
- **Gotcha:** Figma measurements are between frames — verify actual padding vs gap vs margin intent

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
- [ ] Icons: small UI icons as inline SVG snippets, complex SVGs as asset files
- [ ] No icon fonts used
- [ ] Hero/above-fold images: `loading="eager"` + `fetchpriority="high"`
- [ ] Below-fold images: `loading="lazy"`
- [ ] All images have `width` and `height` attributes

### Code Standards Compliance
- [ ] All other skill checklists still pass (liquid, css, section, schema, js, architecture)
- [ ] No Tailwind classes in output — all converted to BEM CSS
- [ ] No React patterns in output — all converted to Liquid
- [ ] No `useState` or event handlers — use Liquid logic or vanilla JS with `data-` attributes
