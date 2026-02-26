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

## Reference Files

- `references/patterns-learned.md` — project-specific UI patterns
- `references/component-checklist.md` — expanded checklist for UI review
- `references/component-examples.md` — Modal, Toast, ResourcePicker, TitleBar code examples