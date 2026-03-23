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

### Mutations
- [ ] `userErrors { field message }` selected in every mutation
- [ ] `userErrors.length > 0` checked before accessing result
- [ ] Errors returned to component (not swallowed)
- [ ] Created/updated object selected in mutation response
- [ ] Variables used (no string interpolation in GraphQL)

### Queries
- [ ] Only fields that are rendered/used are selected
- [ ] `pageInfo { hasNextPage endCursor }` included on connections
- [ ] Max `first: 250` per page
- [ ] Empty results handled (`nodes: []` doesn't crash)
- [ ] GIDs fetched dynamically, never hardcoded
- [ ] Response typed with an interface

### Authentication
- [ ] `authenticate.admin(request)` called before any API call
- [ ] `admin.graphql()` used — no raw fetch to Shopify
- [ ] Webhook routes use `authenticate.webhook(request)`

### Error Handling
- [ ] Every `admin.graphql()` wrapped in try/catch
- [ ] Network errors return meaningful error to component
- [ ] Query errors (top-level `errors`) treated as bugs to fix
- [ ] User errors (`userErrors`) shown to user in UI
- [ ] GraphQL errors logged with operation name (sensitive data scrubbed)

### Webhooks
- [ ] Registered in `shopify.server.ts` webhooks config
- [ ] Action-only route (no loader, no component)
- [ ] Returns 200 within 5 seconds
- [ ] Heavy processing done async
- [ ] Idempotent — handles duplicate deliveries via `X-Shopify-Webhook-Id`
- [ ] Mandatory webhooks implemented: `APP_UNINSTALLED`, `CUSTOMERS_DATA_REQUEST`, `CUSTOMERS_REDACT`, `SHOP_REDACT`

### Versioning
- [ ] `apiVersion` in `shopify.server.ts` is a current supported version
- [ ] Not using `unstable` in production
- [ ] Checked `shopify.dev/changelog` for breaking changes in current version

### Performance
- [ ] No paginated loops for 1000+ items — use bulk operations
- [ ] No unnecessary fields selected
- [ ] No API calls inside React components — only in loaders/actions
- [ ] Rate limit `extensions.cost` monitored for expensive operations
