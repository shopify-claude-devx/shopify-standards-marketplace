---
name: shopify-api
description: Shopify Admin GraphQL API rules — userErrors checking, admin.graphql() only, no REST, API versioning, rate limits, bulk operations, mandatory webhooks. Use when writing, editing, or reviewing any code that calls Shopify APIs, handles webhooks, or uses admin.graphql().
user-invocable: false
globs: ["**/*.ts", "**/*.tsx"]
---

# Shopify API Standards

**Search docs first.** Shopify APIs change quarterly. Search `shopify.dev/docs/api/admin-graphql` and `shopify.dev/changelog` before writing any query, mutation, or webhook handler.

## GraphQL Only

No REST. REST Admin API is legacy since October 2024. Use `admin.graphql()` for everything. Never construct raw fetch calls to Shopify endpoints.

## userErrors — Check Every Mutation

This is the #1 Shopify API mistake. A mutation returns `200 OK` even when it fails. The errors are in `userErrors`, not the HTTP status.

```typescript
const response = await admin.graphql(MUTATION, { variables: { input } });
const { productUpdate } = await response.json();

if (productUpdate.userErrors.length > 0) {
  return { errors: productUpdate.userErrors };
}
return { product: productUpdate.product };
```

**Every mutation. No exceptions.** Never access the result without checking `userErrors` first.

## Authentication

Every API call must go through:
```typescript
const { admin } = await authenticate.admin(request);
```
Webhooks use `authenticate.webhook(request)`. Never call Shopify APIs without authenticating first.

## API Versioning

- Quarterly releases: `YYYY-MM` (e.g., `2025-01`, `2025-04`)
- Each version supported 12 months minimum
- Set in `shopify.server.ts` via `apiVersion` — keep this current
- Expired versions fall-forward and may break your app
- Public apps on unsupported versions get delisted

## Rate Limits

Point-based bucket system — mutations cost more than queries (~10 points base):

| Plan | Points/sec | Bucket |
|---|---|---|
| Standard | 50 | 1,000 |
| Advanced | 100 | 2,000 |
| Plus | 500 | 20,000 |

**For 1000+ items, use bulk operations** (`bulkOperationRunQuery`) — don't paginate in loops.

## Queries — Key Rules

- **Only select fields you use** — every extra field costs rate limit points
- **Max 250 items per page** — use `first: 250` max
- **Always include `pageInfo`** on connections
- **Use `nodes` over `edges`** unless you need edge metadata
- **Never hardcode GIDs** — `gid://shopify/Product/123` can change format. Always fetch dynamically

## Webhooks

- Register in `shopify.server.ts` via `webhooks` config
- Action-only routes — no loader, no component
- Return `200` within 5 seconds — process heavy work async
- Handle duplicates — use `X-Shopify-Webhook-Id` to deduplicate
- **Mandatory for app store:** `APP_UNINSTALLED`, `CUSTOMERS_DATA_REQUEST`, `CUSTOMERS_REDACT`, `SHOP_REDACT`

## Error Handling

Two types of errors — don't confuse them:

| Type | Where | Meaning | Action |
|---|---|---|---|
| Query errors | Top-level `errors` array | Your query is wrong | Fix the query (this is a bug) |
| User errors | `userErrors` on mutation | Validation/business logic failed | Return to UI, show to user |

Wrap every `admin.graphql()` in try/catch for network failures.

## Checklist

See `checklist/rules-and-checklist.md` for the validation checklist.
