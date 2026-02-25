---
name: polaris-appbridge
description: Shopify Polaris components and App Bridge APIs for embedded admin apps. MUST be followed when writing, editing, or generating any UI code, React component, or route component in a Shopify app. Covers Page/Card/BlockStack layout, Text component usage, Banner feedback, Button rules, Form patterns, App Bridge Modal/Toast/TitleBar/NavMenu, and embedded app UI rules (no bare HTML, no custom CSS, no deprecated components).
user-invocable: false
---

# Polaris & App Bridge for Shopify Apps

## Before Writing UI Code

**Always check official sources first** — Polaris React is in maintenance mode and Shopify is transitioning to web components. APIs change frequently.

Search these before using components or App Bridge features:
- `polaris-react.shopify.com/components` — current Polaris React component API, props, best practices
- `shopify.dev/docs/api/app-bridge-library/react-components` — App Bridge React components (Modal, TitleBar, NavMenu)
- `shopify.dev/docs/api/app-bridge/reference` — shopify global API (toast, resourcePicker, saveBar)
- `shopify.dev/docs/api/app-home/using-polaris-components` — Polaris web components (new direction)

If you're unsure whether a component, prop, or pattern is current — search before using it.

## Component Imports

- Import Polaris components from `@shopify/polaris` — `Page`, `Card`, `BlockStack`, `Text`, `Banner`, `Button`, `TextField`, etc.
- Import App Bridge React components from `@shopify/app-bridge-react` — `Modal`, `TitleBar`, `NavMenu`, `useAppBridge`
- Import icons from `@shopify/polaris-icons` — `DeleteIcon`, `EditIcon`, `PlusIcon`, etc.
- Never import deprecated components — `LegacyCard` → use `Card`, `LegacyStack` → use `BlockStack`/`InlineStack`, Polaris `Modal` → use App Bridge `Modal`
- Keep imports clean — if you're not rendering a component, don't import it

## Page Layout Patterns

### Standard Page Structure
Every route component should follow this hierarchy:
```
<Page>                          ← Top-level wrapper, always
  <BlockStack gap="500">        ← Vertical spacing between sections
    <Card>                      ← Group related content
      <BlockStack gap="400">    ← Space within card
        {content}
      </BlockStack>
    </Card>
  </BlockStack>
</Page>
```

### Page Component Rules
- Every page must have `title` prop — no titleless pages
- Use `backAction` for detail/edit pages — `backAction={{ content: "Products", url: "/app/products" }}`
- Use `primaryAction` for the main CTA — one per page maximum
- Use `secondaryActions` sparingly — don't overload the header
- Use `fullWidth` only for data-heavy pages (tables, dashboards) — most pages should be default width

### Layout Patterns by Use Case
- **List page** — `Page` > `Card` > `IndexTable` or `ResourceList`
- **Detail/edit page** — `Page` with `backAction` > `InlineGrid columns={{ xs: 1, md: "2fr 1fr" }}` > `Card` sections
- **Settings page** — `Page` > `InlineGrid columns={{ xs: "1fr", md: "2fr 5fr" }}` > description + `Card` pairs
- **Empty state** — `Page` > `Card` > `EmptyState` with `image`, `heading`, and `action`

## Key Components

### Card
- Use `Card` for every content group — never render raw content outside cards
- Don't nest cards — cards are top-level content containers
- Use `BlockStack gap="400"` inside cards for spacing — not manual margins/padding

### Text
- Always use `Text` component for text — never bare `<p>`, `<h1>`, `<span>` tags
- Use `as` prop for semantic HTML — `as="h2"`, `as="p"`, `as="span"`
- Use `variant` for visual style — `headingLg`, `headingMd`, `headingSm`, `bodyMd`, `bodySm`
- Use `tone` for color meaning — `"critical"` for errors, `"caution"` for warnings, `"success"` for confirmations

### Banner
- Use for page-level feedback — errors, warnings, success, info
- Always set `tone` — `"critical"`, `"warning"`, `"success"`, `"info"`
- Always provide actionable content — tell the merchant what to do, not just what happened
- Place at top of page content, inside `BlockStack`, before cards
- Dismissible banners must have `onDismiss` handler — don't leave it unimplemented

### Button
- Primary buttons — one per page/card maximum. Use `variant="primary"`
- Destructive actions — use `tone="critical"` (not `variant="destructive"`, that's deprecated)
- Loading state — set `loading={true}` during async operations. Never leave buttons clickable during submission
- Disabled state — use `disabled` with clear reason visible to merchant
- Always have `onClick` or be inside `<Form>` — no buttons without handlers

### Forms
- Use `TextField` with `label` — every input must have a visible label. No placeholder-only inputs
- Use `Select` for predefined options — not text fields with validation
- Show validation errors with `error` prop on the field — `<TextField error="Title is required" />`
- Show form-level errors with `Banner tone="critical"` at top of form
- Disable submit button during submission — use `useNavigation().state === "submitting"`

## App Bridge APIs

### Toast — Feedback Messages
```typescript
const shopify = useAppBridge();
shopify.toast.show("Product saved");
shopify.toast.show("Failed to save", { isError: true });
```
- Use for transient feedback after actions — saved, deleted, updated
- Use `isError: true` for error toasts — red styling
- Don't use toast for validation errors — show those inline on the form
- Don't use toast for critical information — it disappears. Use Banner instead

### Modal — App Bridge, Not Polaris
```typescript
import { Modal, TitleBar, useAppBridge } from "@shopify/app-bridge-react";

const shopify = useAppBridge();
// Open: shopify.modal.show("my-modal");
// Close: shopify.modal.hide("my-modal");

<Modal id="my-modal">
  <Text as="p">Are you sure?</Text>
  <TitleBar title="Confirm Delete">
    <button variant="primary" tone="critical" onClick={handleDelete}>Delete</button>
    <button onClick={() => shopify.modal.hide("my-modal")}>Cancel</button>
  </TitleBar>
</Modal>
```
- **Never use Polaris Modal** — it's deprecated. Use App Bridge Modal
- TitleBar buttons inside Modal are plain `<button>` elements, NOT Polaris `<Button>`
- Modal content can use Polaris components (`Text`, `BlockStack`, etc.)
- Can't use toast inside modals directly — communicate with parent frame
- Always provide a cancel/close action — don't trap the merchant

### Resource Picker
```typescript
const shopify = useAppBridge();
const selected = await shopify.resourcePicker({ type: "product" });
if (selected) { /* handle selection */ }
```
- Returns `null` if user cancels — always check before accessing
- Types: `"product"`, `"collection"`, `"variant"`
- Use `filter` for initial query, `selectionIds` for pre-selected items

### TitleBar — Route-Level
```typescript
import { TitleBar } from "@shopify/app-bridge-react";

<TitleBar title="Products">
  <button variant="primary" onClick={handleCreate}>Create Product</button>
</TitleBar>
```
- Use in route components for page-level title bar in the Shopify admin
- Buttons are plain `<button>`, not Polaris `<Button>`
- Breadcrumb: `<button variant="breadcrumb" onClick={handleBack}>Products</button>`

### NavMenu — App Navigation
- Defined in `app.tsx` layout, not in individual routes
- Use `NavMenu` from `@shopify/app-bridge-react`
- Links must use Remix `<Link>` — never `<a>` tags (breaks embedded session)

## Embedded App UI Rules — CRITICAL

- **No `<a>` tags** — use Remix `<Link>` or Polaris `<Link>`. Raw `<a>` breaks the iframe session
- **No `window.location`** — use Remix `useNavigate()` or `redirect` from authenticate
- **No browser `alert()` / `confirm()`** — use App Bridge Modal and Toast
- **No custom CSS for layout** — use Polaris layout components (`BlockStack`, `InlineStack`, `InlineGrid`, `Box`)
- **No custom fonts or colors** — use Polaris tokens and `Text` component. The app must look like Shopify admin
- **No Tailwind for Polaris pages** — Polaris handles all styling. Tailwind is for non-embedded pages only

## Completeness Rules

### No Empty UI States
- Every list/table must show `EmptyState` when data is empty — never a blank page
- Every form must show validation errors — check `actionData?.errors` and display with `error` prop or `Banner`
- Every form must show success feedback — toast after save, banner for important confirmations
- Every loading state must be visible — button `loading` prop, `Spinner`, or skeleton content
- Every error boundary must render meaningful UI — Polaris `Banner` with `tone="critical"`, not blank page

### No Unfinished Components
- Every `Button` must have `onClick` or be inside a `<Form>` — no buttons that do nothing
- Every `TextField` must have `label` — accessibility requirement, no exceptions
- Every `Select` must have `options` and `onChange` — no empty dropdowns
- Every `Banner` must have `title` or children content — no empty banners
- Every `Modal` must have a way to close — cancel button or `onHide` handler

### No Incorrect Component Usage
- Don't use `LegacyCard` — use `Card`
- Don't use `LegacyStack` — use `BlockStack` or `InlineStack`
- Don't use Polaris `Modal` — use App Bridge `Modal`
- Don't use `Layout` + `Layout.Section` for new code — use `InlineGrid` for column layouts
- Don't use `TextStyle` — use `Text` with `tone` prop
- Don't use bare HTML elements for text — use `Text` component

## Common Mistakes

- Don't use `<a>` tags in embedded apps — breaks iframe session. Use Remix `<Link>` or Polaris `<Link>`
- Don't use `window.alert()` or `window.confirm()` — use App Bridge Modal
- Don't mix Tailwind and Polaris — Polaris handles layout/styling in admin pages
- Don't forget loading states on buttons — use `loading` prop during form submission
- Don't put more than one primary action per page — confuses merchants
- Don't use Polaris Modal — it's deprecated, use App Bridge Modal with TitleBar
- Don't use plain `<button>` outside Modal TitleBar — use Polaris `<Button>` in your app UI
- Don't render content without `Card` wrapper — all content sections go in cards
- Don't use bare `<p>` or `<h2>` — use Polaris `Text` component with proper `as` and `variant`
- Don't forget `EmptyState` for lists — blank pages are bad UX

## Pre-Commit Checklist

1. Every page has `Page` with `title` prop
2. Every form field has visible `label` and `error` handling
3. Every list handles empty state with `EmptyState` component
4. Every button has `onClick` handler or is in `<Form>`
5. Every loading state is visible (button `loading`, spinners)
6. No deprecated components (`LegacyCard`, `LegacyStack`, Polaris `Modal`, `TextStyle`)
7. No `<a>` tags, `window.location`, `alert()`, or `confirm()`
8. No custom CSS for layout — only Polaris layout components
9. Toasts use App Bridge `shopify.toast.show()` — not custom implementations
10. Modals use App Bridge `Modal` with `TitleBar` — not Polaris Modal

## Reference Files
Check `references/patterns-learned.md` for project-specific patterns.
