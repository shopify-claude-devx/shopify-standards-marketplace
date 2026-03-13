# CSS File Checklist

Validate every CSS file against these before committing.

## File Convention
- [ ] CSS lives in `assets/` directory, not inline `<style>` tags
- [ ] File named `section-name-stylesheet.css`
- [ ] No bare `{{ file | asset_url | stylesheet_tag }}` — use performance-aware loading
- [ ] Above-fold sections use `preload` (`stylesheet_tag: preload: true`)
- [ ] Below-fold sections use lazy loading (`media="print"` + `onload` pattern)

## Comments
- [ ] No decorative header banners or separator comments
- [ ] No property group labels (`/* Block */`, `/* Desktop */`)
- [ ] No element description comments

## Class Naming
- [ ] All classes follow BEM: `.block__element--modifier`
- [ ] Block name matches the section name
- [ ] Names are semantic and descriptive

## Scoping
- [ ] Every child selector starts with the parent wrapper class (`.parent .child`)
- [ ] Only the root block selector (`.section-name`) stands alone
- [ ] Same parent wrapper rule applies inside media queries
- [ ] No standalone child selectors, even with BEM names
- [ ] No unscoped generic selectors (`.title`, `.container`)

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
