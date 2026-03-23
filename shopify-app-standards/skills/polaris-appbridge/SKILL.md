---
name: polaris-appbridge
description: Shopify Polaris components and App Bridge APIs for embedded admin apps — no bare HTML, no custom CSS, no Tailwind, App Bridge Modal not Polaris Modal, TitleBar buttons are plain <button>, deprecated components list. Use when writing, editing, or reviewing any UI component, route component, or React code in a Shopify app.
user-invocable: false
globs: ["app/routes/**/*.tsx", "app/components/**/*.tsx"]
---

# Polaris & App Bridge — Shopify Embedded Apps

**Search docs first.** Polaris React is in maintenance mode, transitioning to web components. Search `polaris.shopify.com` and `shopify.dev/docs/api/app-bridge-library` before using any component.

## No Bare HTML — Ever

**Use `Text` component for all text.** Never use `<p>`, `<h1>`, `<h2>`, `<span>`, `<strong>`. Use `Text` with `as` and `variant` props.

**Use `Card` for all content groups.** Never render content outside a Card.

**Use Polaris layout components.** `BlockStack`, `InlineStack`, `InlineGrid`, `Box` — never custom CSS for layout.

## Layout Patterns by Page Type

- **List page** — `Page` > `Card` > `IndexTable` or `ResourceList`
- **Detail/edit page** — `Page` with `backAction` > `InlineGrid columns={{ xs: 1, md: "2fr 1fr" }}` > `Card` sections
- **Settings page** — `Page` > `InlineGrid columns={{ xs: "1fr", md: "2fr 5fr" }}` > description + `Card` pairs

## No Custom Styling in Polaris Pages

**No Tailwind.** Polaris handles all styling in admin pages. Tailwind is only for non-embedded pages.

**No custom CSS for layout.** No custom fonts or colors. The app must look like Shopify admin.

## Deprecated Components — Never Use

| Deprecated | Use Instead |
|---|---|
| `LegacyCard` | `Card` |
| `LegacyStack` | `BlockStack` or `InlineStack` |
| Polaris `Modal` | App Bridge `Modal` |
| `Layout` + `Layout.Section` | `InlineGrid` |
| `TextStyle` | `Text` with `tone` prop |

## App Bridge Modal — Not Polaris Modal

This is the #1 UI mistake. **Never import Modal from `@shopify/polaris`.** Use App Bridge:

```typescript
import { Modal, TitleBar, useAppBridge } from "@shopify/app-bridge-react";
const shopify = useAppBridge();

// Open/close
shopify.modal.show("my-modal");
shopify.modal.hide("my-modal");
```

**TitleBar buttons inside Modal are plain `<button>` elements, NOT Polaris `<Button>`.** This is a common gotcha.

## Toast — App Bridge Only

```typescript
const shopify = useAppBridge();
shopify.toast.show("Saved");
shopify.toast.show("Failed to save", { isError: true });
```

Use for transient feedback after actions. Don't use for validation errors (show inline) or critical info (use Banner — toast disappears).

## Embedded App Rules — CRITICAL

**No `<a>` tags.** Use `<Link>` from Remix or Polaris. Raw `<a>` breaks iframe session.

**No `window.location`, `window.alert()`, `window.confirm()`.** Use Remix navigation, App Bridge Modal, App Bridge Toast.

**No browser APIs that break the iframe.** No `window.open`, `window.scrollTo`, `window.reload`.

## Page Structure

Every page follows this hierarchy:
```
<Page title="...">
  <BlockStack gap="500">
    <Card>
      <BlockStack gap="400">
        {content}
      </BlockStack>
    </Card>
  </BlockStack>
</Page>
```

- Every `Page` must have `title`
- Detail pages use `backAction`
- One `primaryAction` per page maximum

## NavMenu

Defined in `app.tsx` layout only, not in individual routes. Links must use Remix `<Link>` — never `<a>`.

## Key Rules

- **Resource Picker** returns `null` on cancel — always check before accessing. Use `selectionIds` for pre-selected items
- **Plain `<button>`** — ONLY inside Modal `TitleBar`. Everywhere else use Polaris `<Button>`
- **Banner** — set `tone` (`critical`, `warning`, `success`, `info`). Place before cards in BlockStack
- **Button** — one primary per page. Use `tone="critical"` for destructive (not `variant="destructive"`)
- **Empty states** — every list/table must show `EmptyState` component, never blank page
- **Loading states** — use Button's `loading` prop during submission

## Code Examples

### App Bridge Modal with Confirmation

```typescript
import { Modal, TitleBar, useAppBridge } from "@shopify/app-bridge-react";

function DeleteConfirmation({ onDelete }: { onDelete: () => void }) {
  const shopify = useAppBridge();

  return (
    <Modal id="delete-confirm">
      <Box padding="400">
        <Text as="p">Are you sure you want to delete this? This cannot be undone.</Text>
      </Box>
      <TitleBar title="Confirm Delete">
        <button onClick={onDelete}>Delete</button>
        <button onClick={() => shopify.modal.hide("delete-confirm")}>Cancel</button>
      </TitleBar>
    </Modal>
  );
}

// Open from anywhere:
// shopify.modal.show("delete-confirm");
```

Note: TitleBar buttons are plain `<button>`, NOT Polaris `<Button>`.

### Toast After Action

```typescript
const shopify = useAppBridge();

// Success
shopify.toast.show("Product saved");

// Error
shopify.toast.show("Failed to save product", { isError: true });
```

### Resource Picker

```typescript
const shopify = useAppBridge();

async function handlePickProduct() {
  const selected = await shopify.resourcePicker({ type: "product" });
  if (!selected) return; // User cancelled — always check
  // Handle selected products
}
```

### Standard Page Layout

```typescript
<Page title="Products" primaryAction={{ content: "Create", onAction: handleCreate }}>
  <BlockStack gap="500">
    <Banner tone="warning" title="API limit approaching" onDismiss={handleDismiss}>
      <Text as="p">You've used 80% of your daily API calls.</Text>
    </Banner>
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">Product List</Text>
        {/* content */}
      </BlockStack>
    </Card>
  </BlockStack>
</Page>
```

### Detail Page Layout

```typescript
<Page
  title="Edit Product"
  backAction={{ content: "Products", url: "/app/products" }}
>
  <InlineGrid columns={{ xs: 1, md: "2fr 1fr" }} gap="400">
    <Card>
      <BlockStack gap="400">
        <TextField label="Title" value={title} onChange={setTitle} error={errors?.title} />
        <TextField label="Description" value={desc} onChange={setDesc} multiline={4} />
      </BlockStack>
    </Card>
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">Status</Text>
        <Select label="Status" options={statusOptions} value={status} onChange={setStatus} />
      </BlockStack>
    </Card>
  </InlineGrid>
</Page>
```

### Empty State

```typescript
<Card>
  <EmptyState
    heading="No products yet"
    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    action={{ content: "Create product", onAction: handleCreate }}
  >
    <Text as="p">Get started by creating your first product.</Text>
  </EmptyState>
</Card>
```

### NavMenu in app.tsx

```typescript
import { NavMenu } from "@shopify/app-bridge-react";
import { Link } from "@remix-run/react";

// In app.tsx layout:
<NavMenu>
  <Link to="/app" rel="home">Home</Link>
  <Link to="/app/products">Products</Link>
  <Link to="/app/settings">Settings</Link>
</NavMenu>
```

Links must use Remix `<Link>`, never `<a>`.

## Checklist

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
