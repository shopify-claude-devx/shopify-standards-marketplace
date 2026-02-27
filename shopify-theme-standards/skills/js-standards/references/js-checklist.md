# JavaScript File Checklist

Validate every `.js` file against these before committing.

## Modern ES Syntax
- [ ] `const` used by default — `let` only when reassignment needed
- [ ] No `var` anywhere
- [ ] Arrow functions used as default
- [ ] Function declarations only for Web Component methods or named hoisting
- [ ] Destructuring used for object/array access
- [ ] Template literals over string concatenation
- [ ] Optional chaining (`?.`) and nullish coalescing (`??`) over manual null checks

## File & Loading
- [ ] JS lives in `assets/` directory — not inline in Liquid
- [ ] Script tag uses `defer`
- [ ] Liquid values passed via `data-` attributes — no inline `<script>` for data

## Initialization
- [ ] One-off sections use `DOMContentLoaded`
- [ ] Reusable components use Web Components with `connectedCallback`/`disconnectedCallback`
- [ ] Custom element registration guarded: `if (!customElements.get('name'))`

## Strict Rules
- [ ] No `element.style.*` — CSS classes toggled instead
- [ ] No Tailwind classes used as query selectors
- [ ] No `innerHTML` with template strings for component rendering
- [ ] No price formatting in JS — Liquid `| money` handles prices
- [ ] No inline `<script>` tags in Liquid files

## Naming
- [ ] Files: `kebab-case.js`
- [ ] Variables/functions: `camelCase`
- [ ] Constants: `UPPER_SNAKE_CASE`
- [ ] Web Component classes: `PascalCase`
- [ ] Custom element tags: `kebab-case`