# Figma-Specific Gotchas

## Auto Layout → Flexbox/Grid
- Figma auto-layout maps to CSS flexbox in most cases
- `direction: horizontal` → `flex-direction: row`
- `direction: vertical` → `flex-direction: column`
- Auto-layout `gap` → CSS `gap`
- `padding` in auto-layout → CSS `padding`
- **Gotcha:** "space between" mode → `justify-content: space-between`
- **Gotcha:** "hug contents" → don't set explicit width/height (use `fit-content` or auto)
- **Gotcha:** "fill container" → `flex: 1` or `width: 100%`

## Constraints and Positioning
- Figma absolute positioning does NOT mean CSS `position: absolute` — evaluate if flexbox/grid achieves the same layout first
- "pin to top-left" is often just normal document flow
- Only use `position: absolute` when the element truly overlays another
- Figma uses absolute positioning as its default layout mechanism, but CSS flexbox/grid handles most of the same layouts more robustly

## Effects
- Drop shadow → CSS `box-shadow`
- Inner shadow → CSS `box-shadow: inset`
- Background blur → CSS `backdrop-filter: blur()`
- Layer blur → CSS `filter: blur()`
- **Gotcha:** Effects stack — translate each one, check combined result

## Text Styles
- Map font-size, line-height, letter-spacing, font-weight directly to CSS
- Use `rem` for font-size, not `px` — convert from Figma's px values (base 16px)
- "auto" line-height → CSS `line-height: normal`
- **Gotcha:** Text decoration and text-transform are separate properties — check both

## Variants and Component Sets
- Component variants often map to block types or setting-controlled states
- "State: hover" → CSS `:hover` pseudo-class
- "Size: small/medium/large" → `select` setting or CSS modifier classes
- "Type: primary/secondary" → block types or `select` setting

## Colors and Tokens
- If Figma design tokens are returned, map them to CSS custom properties
- Check if theme already has matching CSS variables before creating new ones
- Opacity on a layer → CSS `opacity` (whole layer) or alpha channel in color
- **Gotcha:** Color styles may include opacity — always check alpha value

## Spacing and Sizing
- Convert px to rem where appropriate (font-size, padding, margin, gap)
- Keep px for borders, box-shadow offsets, small decorative values
- **Gotcha:** Figma measurements are between frames — verify actual padding vs gap vs margin intent
