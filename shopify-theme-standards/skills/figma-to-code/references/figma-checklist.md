# Figma-to-Code Translation Checklist

Validate every file built from a Figma design against these before moving to the next TODO.

## Design Fidelity
- [ ] All visible text layers have corresponding schema settings or hardcoded content
- [ ] All image layers use `image_picker` settings with alt text settings
- [ ] Colors match Figma values — mapped to CSS custom properties or theme tokens
- [ ] Typography matches Figma: font-size (rem), line-height, font-weight, letter-spacing
- [ ] Spacing matches Figma: padding, margin, gap converted appropriately (rem for large, px for small)
- [ ] All Figma effects translated: shadows, blurs, border-radius

## Layout Translation
- [ ] Auto-layout converted to flexbox/grid — not absolute positioning
- [ ] "Hug contents" layers do NOT have explicit width/height
- [ ] "Fill container" layers use `flex: 1` or `width: 100%`
- [ ] Absolute positioning used ONLY for true overlays
- [ ] Figma constraints evaluated — most are normal flow, not CSS `position`

## Responsive Implementation
- [ ] Base CSS matches the **mobile** Figma frame
- [ ] Breakpoint CSS matches the **desktop** Figma frame
- [ ] Only changed properties appear in breakpoint media queries
- [ ] Elements hidden on one frame use appropriate responsive visibility
- [ ] Images use responsive `<picture>` or `image_url` with width parameters

## Schema Mapping
- [ ] Every editable text → `text` or `richtext` setting
- [ ] Every image → `image_picker` setting + alt text setting
- [ ] Every color → `color` or `color_scheme` setting
- [ ] Repeating elements → section blocks (not hardcoded repetitions)
- [ ] Variant properties → `select` settings or block types
- [ ] Setting IDs derived from Figma layer names, using `snake_case` with context prefix
- [ ] Setting labels are Title Case and section-specific

## Asset Handling
- [ ] Icons: small UI icons as inline SVG snippets, complex SVGs as asset files
- [ ] No icon fonts used
- [ ] Hero/above-fold images: `loading="eager"` + `fetchpriority="high"`
- [ ] Below-fold images: `loading="lazy"`
- [ ] All images have `width` and `height` attributes

## Code Standards Compliance
- [ ] All other skill checklists still pass (liquid, css, section, schema, js, architecture)
- [ ] No Tailwind classes in output — all converted to BEM CSS
- [ ] No React patterns in output — all converted to Liquid
- [ ] No `useState` or event handlers — use Liquid logic or vanilla JS with `data-` attributes
