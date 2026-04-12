---
name: polaris-web-components
description: Polaris Web Components (s-* prefix) and App Bridge web components (ui-* prefix) for Shopify embedded apps. CDN-delivered, framework-agnostic. Use when writing, editing, or reviewing UI in route components.
user-invocable: false
paths: ["app/routes/**/*.tsx", "app/components/**/*.tsx"]
---

# Polaris Web Components — Shopify Embedded Apps

**Search docs first.** Polaris Web Components are actively evolving. Search `shopify.dev/docs/api/app-home/polaris-web-components` before assuming any component, attribute, or slot exists.

## Setup

Polaris Web Components are loaded via CDN — **no npm import for components**.

In `root.tsx` (or HTML head):
```html
<head>
  <meta name="shopify-api-key" content="%SHOPIFY_API_KEY%" />
  <script src="https://cdn.shopify.com/shopifycloud/polaris.js"></script>
</head>
```

TypeScript types (npm — types only, not components):
```bash
npm install @shopify/polaris-types@latest
npm install @shopify/app-bridge-types@latest
```

In `tsconfig.json`:
```json
{
  "compilerOptions": {
    "types": ["@shopify/polaris-types", "@shopify/app-bridge-types"]
  }
}
```

## Component Naming — CRITICAL

All Polaris components use the **`s-` prefix**. All App Bridge components use the **`ui-` prefix**.

| System | Prefix | Example | Purpose |
|---|---|---|---|
| Polaris | `s-` | `<s-page>`, `<s-button>`, `<s-section>` | UI inside your app iframe |
| App Bridge | `ui-` | `<ui-title-bar>`, `<ui-nav-menu>`, `<ui-save-bar>` | Shopify admin chrome outside your iframe |

**Never import components from `@shopify/polaris`.** That package is deprecated.

## Core Components

### Layout & Structure
- `<s-page heading="Title">` — main page container (replaces `Page`)
- `<s-section heading="Title">` — content group (replaces `Card`)
- `<s-box>` — generic container
- `<s-stack>` — horizontal/vertical flex layout
- `<s-grid>` — responsive grid
- `<s-divider>` — visual separator

### Actions
- `<s-button>` — primary interaction
- `<s-button-group>` — grouped buttons
- `<s-link>` — text navigation
- `<s-clickable>` — custom interactive element

### Forms
- `<s-text-field>` — text input
- `<s-select>` — dropdown
- `<s-checkbox>` — toggle checkbox
- `<s-switch>` — toggle switch
- `<s-choice-list>` — single/multi selection
- `<s-text-area>` — multiline text
- `<s-number-field>`, `<s-email-field>`, `<s-url-field>`, `<s-money-field>`, `<s-password-field>`
- `<s-date-field>`, `<s-date-picker>`, `<s-color-field>`, `<s-color-picker>`
- `<s-drop-zone>` — file upload
- `<s-search-field>` — search input

### Feedback & Status
- `<s-badge>` — status indicator
- `<s-banner>` — prominent messages
- `<s-spinner>` — loading indicator

### Typography & Content
- `<s-heading>` — titles
- `<s-paragraph>` — text blocks
- `<s-text>` — inline text
- `<s-chip>` — keyword labels
- `<s-tooltip>` — hover hints

### Overlays
- `<s-modal>` — dialog overlay
- `<s-popover>` — anchored overlay

### Media
- `<s-avatar>`, `<s-icon>`, `<s-image>`, `<s-thumbnail>`

### Data
- `<s-table>` — data tables

## Slots — How Structure Works

Polaris Web Components use **slots** for positioning content in specific areas.

```tsx
<s-page heading="Products">
  {/* Primary action button — appears top-right */}
  <s-button slot="primary-action" variant="primary">Add product</s-button>

  {/* Secondary actions — appear in header area */}
  <s-button slot="secondary-actions">Import</s-button>
  <s-button slot="secondary-actions">Export</s-button>

  {/* Main content — default slot */}
  <s-section heading="Active products">
    <s-table>{/* table rows */}</s-table>
  </s-section>

  {/* Aside content — right sidebar on detail pages */}
  <s-box slot="aside">
    <s-section heading="Status">
      <s-badge>Active</s-badge>
    </s-section>
  </s-box>
</s-page>
```

## Page Layout Patterns

**List page:**
```tsx
<s-page heading="Products">
  <s-button slot="primary-action" variant="primary">Add product</s-button>
  <s-section>
    <s-table>{/* ... */}</s-table>
  </s-section>
</s-page>
```

**Detail page:**
```tsx
<s-page heading="Product details">
  <s-button slot="primary-action" variant="primary">Save</s-button>
  <s-section heading="General">
    <s-text-field label="Title" name="title" />
    <s-text-area label="Description" name="description" />
  </s-section>
  <s-box slot="aside">
    <s-section heading="Status">
      <s-select label="Status" name="status">
        <option value="active">Active</option>
        <option value="draft">Draft</option>
      </s-select>
    </s-section>
  </s-box>
</s-page>
```

**Settings page:**
```tsx
<s-page heading="Settings">
  <s-section heading="General settings" description="Configure your app preferences">
    <s-text-field label="App name" name="appName" />
    <s-switch label="Enable notifications" name="notifications" />
  </s-section>
</s-page>
```

## App Bridge Web Components

These control Shopify admin elements **outside** your iframe:

```tsx
{/* Navigation menu in admin sidebar */}
<ui-nav-menu>
  <a href="/app" rel="home">Home</a>
  <a href="/app/settings">Settings</a>
</ui-nav-menu>

{/* Title bar with breadcrumbs and actions */}
<ui-title-bar title="Product details">
  <button variant="breadcrumb">{/* back nav */}</button>
  <button variant="primary">Save</button>
</ui-title-bar>

{/* Contextual save bar for dirty forms */}
<ui-save-bar id="save-bar">
  <button variant="primary">Save</button>
  <button>Discard</button>
</ui-save-bar>
```

**Important:** `<ui-title-bar>` and `<ui-save-bar>` buttons are plain `<button>` elements, NOT `<s-button>`.

## Modal Pattern

```tsx
{/* Trigger */}
<s-button onClick={() => shopify.modal.show('confirm-modal')}>Delete</s-button>

{/* Modal — declared in component JSX */}
<s-modal id="confirm-modal" heading="Confirm deletion">
  <s-paragraph>Are you sure you want to delete this item?</s-paragraph>
  <s-button slot="footer-primary" variant="primary" tone="critical"
    onClick={handleDelete}>Delete</s-button>
  <s-button slot="footer-secondary"
    onClick={() => shopify.modal.hide('confirm-modal')}>Cancel</s-button>
</s-modal>
```

## Toast Pattern

```ts
// Success
shopify.toast.show("Product created");

// Error
shopify.toast.show("Failed to save", { isError: true });

// With undo action
shopify.toast.show("Item deleted", {
  action: "Undo",
  onAction: () => { /* undo logic */ },
});
```

**Never use toast for validation errors** — show inline with field `error` attribute.
**Never use toast for critical information** — use `<s-banner>`.

## Event Handling

Standard DOM events work in JSX:
```tsx
<s-button onClick={() => handleSave()}>Save</s-button>
<s-text-field label="Name" onInput={(e) => setName(e.currentTarget.value)} />
<s-select label="Type" onChange={(e) => setType(e.currentTarget.value)}>
  <option value="a">A</option>
</s-select>
```

## Rules — No Exceptions

- **No `@shopify/polaris` imports.** The React library is deprecated.
- **No bare HTML text.** Use `<s-text>`, `<s-heading>`, `<s-paragraph>` for all text.
- **No custom CSS for layout.** No Tailwind on embedded pages. Only Polaris components.
- **No inline styles** on Polaris components.
- **No `<a>` tags.** Use `<s-link>` or React Router `<Link>`.
- **No `window.location`, `window.alert`, `window.confirm`.** Breaks the iframe.
- **`<s-section>` is the new `<Card>`.** There is no `<s-card>`.

## Checklist

See `checklist/rules-and-checklist.md` for the validation checklist.
