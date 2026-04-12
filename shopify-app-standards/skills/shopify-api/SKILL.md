---
name: shopify-api
description: Shopify Admin GraphQL API standards — userErrors handling, authentication, rate limits, webhooks, API versioning. Use when writing, editing, or reviewing code that calls admin.graphql() or handles webhooks.
user-invocable: false
paths: ["app/**/*.server.ts", "app/**/*.server.tsx", "app/routes/**/*.ts", "app/routes/**/*.tsx"]
---

# Shopify API Standards

**Search docs first.** Shopify APIs are versioned quarterly (YYYY-MM). Search `shopify.dev/docs/api/admin-graphql` before using any mutation, query, or webhook. Training data can be outdated — always verify field names, input types, and required scopes.

## GraphQL Only

**No REST API.** REST is legacy since October 2024 and blocked for new public apps since April 2025. Use `admin.graphql()` for all Shopify API calls.

```typescript
const response = await admin.graphql(`#graphql
  query GetProducts($first: Int!) {
    products(first: $first) {
      nodes { id title status }
      pageInfo { hasNextPage endCursor }
    }
  }
`, { variables: { first: 25 } });

const { data } = await response.json();
```

## userErrors — CRITICAL

Every GraphQL mutation can return `200 OK` with errors inside `userErrors`. **Always check.**

```typescript
const response = await admin.graphql(`#graphql
  mutation CreateProduct($input: ProductInput!) {
    productCreate(input: $input) {
      product { id title }
      userErrors { field message }
    }
  }
`, { variables: { input: { title } } });

const { data } = await response.json();

// ALWAYS check userErrors before using the result
if (data?.productCreate?.userErrors?.length) {
  return { errors: { form: data.productCreate.userErrors[0].message } };
}

const product = data?.productCreate?.product;
```

**Two types of GraphQL errors:**
- `errors` (top-level) — bugs in your query (wrong field names, bad syntax). Fix your code.
- `userErrors` (inside mutation response) — validation failures (duplicate title, invalid input). Show to user.

## Authentication

Always go through the Shopify auth layer:

```typescript
// App routes
const { admin, redirect } = await authenticate.admin(request);

// Webhook routes
const { shop, session, topic, payload } = await authenticate.webhook(request);
```

**Never make raw fetch calls to Shopify.** Use `admin.graphql()` which handles tokens and versioning.

## API Versioning

- Format: `YYYY-MM` (e.g., `2026-04`)
- Quarterly releases: January, April, July, October
- Each version supported for 12 months
- Set in `shopify.server.ts` via `ApiVersion.April26`
- Never use `unstable` in production

## Rate Limits

Shopify uses a point-based bucket system:
- **Standard plans:** 50 points/second, 1000 point bucket
- **Shopify Plus:** 100 points/second, 2000 point bucket
- Each query costs based on complexity

**Rules:**
- For 1000+ items, use bulk operations instead of paginated loops
- Only select fields you actually use
- Check `extensions.cost` in response for expensive operations
- Implement retry with backoff for `429 Too Many Requests`

## Query Standards

```typescript
// DO: Select only needed fields, paginate with cursor
const response = await admin.graphql(`#graphql
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      nodes { id title status }
      pageInfo { hasNextPage endCursor }
    }
  }
`, { variables: { first: 25, after: cursor } });

// DON'T: Select everything, no pagination
// products(first: 250) { nodes { id title description body vendor ... } }
```

- Max `first: 250` per page
- Always include `pageInfo { hasNextPage endCursor }` on connections
- Use `nodes` over `edges` (simpler unless you need cursor per-item)
- Fetch GIDs dynamically — never hardcode Shopify IDs
- Handle empty results — `nodes: []` must not crash

## Webhook Standards

Register webhooks in `shopify.app.toml`:
```toml
[webhooks]
api_version = "2026-04"

  [[webhooks.subscriptions]]
  topics = ["app/uninstalled"]
  uri = "/webhooks/app/uninstalled"
```

Webhook route pattern:
```typescript
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic, payload } = await authenticate.webhook(request);

  // Process webhook — respond within 5 seconds
  // For heavy work, queue async and respond immediately

  return new Response();
};
```

**Mandatory webhooks for public apps:**
- `APP_UNINSTALLED` — clean up shop data
- `CUSTOMERS_DATA_REQUEST` — respond with customer data
- `CUSTOMERS_REDACT` — delete customer data
- `SHOP_REDACT` — delete shop data

**Webhook rules:**
- Action-only routes (no loader, no default export)
- Return 200 within 5 seconds or Shopify retries
- Handle duplicate deliveries — use `webhookId` for idempotency
- Heavy processing done async (queue/background job)

## Error Handling Pattern

```typescript
try {
  const response = await admin.graphql(`#graphql ...`, { variables });
  const { data } = await response.json();

  // Check for userErrors (mutation validation failures)
  if (data?.myMutation?.userErrors?.length) {
    return { errors: { form: data.myMutation.userErrors[0].message } };
  }

  return { success: true, result: data?.myMutation?.result };
} catch (error) {
  // Network or authentication errors
  console.error("GraphQL request failed:", error instanceof Error ? error.message : "Unknown error");
  return { errors: { form: "Failed to communicate with Shopify. Please try again." } };
}
```

## Checklist

See `checklist/rules-and-checklist.md` for the validation checklist.
