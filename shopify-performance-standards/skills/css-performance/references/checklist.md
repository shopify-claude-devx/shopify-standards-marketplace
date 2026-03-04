# CSS Performance Checklist

## Critical vs Non-Critical
- [ ] Above-fold section CSS is preloaded (`preload: true` or `loading: 'preload'`)
- [ ] Below-fold section CSS uses async loading (`media="print"` + `onload` pattern)
- [ ] Header and hero CSS always load as critical

## Section-Scoped CSS
- [ ] Each section has its own CSS file (not one monolithic stylesheet)
- [ ] Section CSS loads only when the section is on the page
- [ ] No unused CSS shipped to pages that don't need it

## Anti-Patterns
- [ ] No `@import` rules in CSS files (creates render-blocking chain)
- [ ] No `<style>` tags generated inside Liquid loops
- [ ] Dynamic values use CSS custom properties via `style` attribute, not inline `<style>` blocks

## Selectors
- [ ] Selectors are 1-2 levels deep (BEM-style)
- [ ] No deep nesting (`.a .b .c .d .e`)
- [ ] Universal selectors (`*`) only in base reset

## CSS Containment
- [ ] Independent sections use `contain: layout style`
- [ ] No `contain: size` on sections with dynamic height

## CSS Custom Properties
- [ ] Global design tokens defined on `:root`
- [ ] Schema-driven values passed via `style="--var: {{ value }}"`
