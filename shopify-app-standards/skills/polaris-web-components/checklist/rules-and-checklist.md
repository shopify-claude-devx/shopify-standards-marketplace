# Polaris Web Components — Checklist

### Component Usage
- [ ] No imports from `@shopify/polaris` — components loaded via CDN
- [ ] `@shopify/polaris-types` in `tsconfig.json` types array
- [ ] All Polaris components use `s-` prefix
- [ ] All App Bridge components use `ui-` prefix
- [ ] `<s-section>` used for content groups (not `<Card>` or `<s-card>`)

### HTML & Styling
- [ ] No bare HTML text (`<p>`, `<h1>`, `<span>`) — use `<s-text>`, `<s-heading>`, `<s-paragraph>`
- [ ] No content outside `<s-section>` wrappers
- [ ] No custom CSS for layout — only Polaris components
- [ ] No Tailwind classes on Polaris pages
- [ ] No inline styles on Polaris components
- [ ] No custom fonts or colors

### Iframe Safety
- [ ] No `<a>` tags — use `<s-link>` or React Router `<Link>`
- [ ] No `window.location`, `window.open`, `window.reload`, `window.scrollTo`
- [ ] No `window.alert()`, `window.confirm()`
- [ ] Modals use `<s-modal>` with `shopify.modal.show(id)` / `shopify.modal.hide(id)`

### Page Structure
- [ ] Every page uses `<s-page heading="...">` as root
- [ ] Detail pages have back navigation
- [ ] Max one `slot="primary-action"` per page
- [ ] Slots used correctly: `primary-action`, `secondary-actions`, `aside`

### Forms
- [ ] Every input has visible `label` attribute
- [ ] Every field shows validation errors via `error` attribute
- [ ] Form-level errors shown in `<s-banner tone="critical">` above form
- [ ] Submit button shows loading state during submission
- [ ] Success feedback via `shopify.toast.show()` or `<s-banner>`

### Modals
- [ ] Uses `<s-modal>` with unique `id`
- [ ] Footer buttons use `slot="footer-primary"` and `slot="footer-secondary"`
- [ ] Has cancel/close action — don't trap the merchant
- [ ] Opened via `shopify.modal.show(id)`, closed via `shopify.modal.hide(id)`

### App Bridge Components
- [ ] `<ui-title-bar>` buttons are plain `<button>` not `<s-button>`
- [ ] `<ui-save-bar>` buttons are plain `<button>` not `<s-button>`
- [ ] `<ui-nav-menu>` uses `<a>` tags with `rel="home"` on home link

### Toasts
- [ ] Uses `shopify.toast.show()` — no custom implementation
- [ ] Error toasts use `{ isError: true }`
- [ ] Validation errors shown inline, not as toast
- [ ] Critical info uses `<s-banner>`, not toast

### Completeness
- [ ] Every list/table has empty state for zero items
- [ ] Every loading state visible (`<s-spinner>`, button loading, skeleton)
- [ ] Every error boundary renders meaningful UI with `<s-banner>`
- [ ] Every `<s-button>` has handler or is in form
- [ ] Every `<s-select>` has options
- [ ] Every `<s-banner>` has content and `tone`
