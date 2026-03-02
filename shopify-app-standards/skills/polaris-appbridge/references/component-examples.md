# Component Examples

Code examples for App Bridge and Polaris patterns. Read when building specific UI features.

## App Bridge Modal with Confirmation

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

## Toast After Action

```typescript
const shopify = useAppBridge();

// Success
shopify.toast.show("Product saved");

// Error
shopify.toast.show("Failed to save product", { isError: true });
```

## Resource Picker

```typescript
const shopify = useAppBridge();

async function handlePickProduct() {
  const selected = await shopify.resourcePicker({ type: "product" });
  if (!selected) return; // User cancelled — always check
  // Handle selected products
}
```

Types: `"product"`, `"collection"`, `"variant"`.

## TitleBar in Route

```typescript
import { TitleBar } from "@shopify/app-bridge-react";

// In route component:
<TitleBar title="Products">
  <button onClick={handleCreate}>Create Product</button>
  <button onClick={handleBack}>Back</button>
</TitleBar>
```

Buttons are plain `<button>`, not Polaris `<Button>`.

## Standard Page Layout

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

## Detail Page Layout

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

## Empty State

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

## NavMenu in app.tsx

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