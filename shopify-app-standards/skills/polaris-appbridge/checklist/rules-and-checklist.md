# Polaris & App Bridge — Checklist

### HTML & Styling
- [ ] No bare HTML text elements (`<p>`, `<h1>`, `<span>`, `<strong>`) — use `Text`
- [ ] No content outside `Card` wrappers
- [ ] No custom CSS for layout — only Polaris components
- [ ] No Tailwind classes on Polaris pages
- [ ] No custom fonts or colors — use Polaris tokens
- [ ] No inline styles

### Deprecated Components
- [ ] No `LegacyCard` — use `Card`
- [ ] No `LegacyStack` — use `BlockStack` or `InlineStack`
- [ ] No Polaris `Modal` — use App Bridge `Modal`
- [ ] No `Layout` + `Layout.Section` — use `InlineGrid`
- [ ] No `TextStyle` — use `Text` with `tone`

### Iframe Safety
- [ ] No `<a>` tags — only `<Link>` from Remix or Polaris
- [ ] No `window.location`, `window.open`, `window.reload`, `window.scrollTo`
- [ ] No `window.alert()`, `window.confirm()`
- [ ] Modals use App Bridge, not browser dialogs

### Page
- [ ] Every `Page` has `title` prop
- [ ] Detail pages have `backAction`
- [ ] Max one `primaryAction` per page
- [ ] Content in `BlockStack gap="500"` > `Card` > `BlockStack gap="400"`

### Forms
- [ ] Every `TextField` has visible `label`
- [ ] Every field shows validation errors via `error` prop
- [ ] Form-level errors shown in `Banner tone="critical"` above form
- [ ] Submit button uses `loading` prop during submission
- [ ] Success feedback via toast or banner after save

### Modals
- [ ] Imported from `@shopify/app-bridge-react` not `@shopify/polaris`
- [ ] Has unique `id` prop
- [ ] TitleBar buttons are plain `<button>` not Polaris `<Button>`
- [ ] Has cancel/close action — don't trap the merchant
- [ ] Open/close via `shopify.modal.show(id)` / `shopify.modal.hide(id)`

### Toasts
- [ ] Uses `shopify.toast.show()` not custom implementation
- [ ] Error toasts use `{ isError: true }`
- [ ] Not used for validation errors (show inline instead)
- [ ] Not used for critical info (use Banner instead)

### Completeness
- [ ] Every list/table has `EmptyState` for zero items
- [ ] Every loading state visible (button `loading`, `Spinner`, skeleton)
- [ ] Every error boundary renders meaningful UI with `Banner`
- [ ] Every `Button` has handler or is in `<Form>`
- [ ] Every `Select` has `options` and `onChange`
- [ ] Every `Banner` has content and `tone`
