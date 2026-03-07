# CSS File Checklist

Validate every CSS file against these before committing.

## File Convention
- [ ] CSS lives in `assets/` directory, not inline `<style>` tags
- [ ] File named `section-name-stylesheet.css`
- [ ] CSS loaded via `css.liquid` snippet (or equivalent loader)
- [ ] Above-fold sections use `preload`, below-fold use lazy loading

## Class Naming
- [ ] All classes follow BEM: `.block__element--modifier`
- [ ] Block name matches the section name
- [ ] Names are semantic and descriptive

## Scoping
- [ ] All selectors scoped to the section's parent class
- [ ] No unscoped generic selectors (`.title`, `.container`)
- [ ] Only intentionally shared styles are unscoped

## Property Ordering
- [ ] Layout properties first (display, position, z-index)
- [ ] Flexbox/Grid second (flex, align, justify, gap)
- [ ] Sizing third (width, height, min/max)
- [ ] Spacing fourth (margin, padding)
- [ ] Typography fifth (font, text, color)
- [ ] Visual sixth (background, border, shadow, opacity)
- [ ] Effects seventh (transform, transition, animation)
- [ ] Responsive last (media queries at the bottom)

## Variables
- [ ] Theme-wide values use CSS custom properties from `:root`
- [ ] No hard-coded colors/fonts that should come from theme settings
- [ ] Schema-driven values use `style` attribute with custom properties

## Responsive
- [ ] Mobile-first: base styles are mobile, breakpoints enhance
- [ ] Standard breakpoints used (320, 360, 475, 768, 1024, 1280, 1536)
- [ ] No arbitrary breakpoint values

## Tailwind (if applicable)
- [ ] Class ordering matches property ordering convention
- [ ] No mixing of Tailwind utilities and custom CSS on same element
- [ ] Tailwind config extended for project-specific tokens
