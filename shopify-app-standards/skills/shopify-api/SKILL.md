---
name: shopify-api
description: Shopify Admin GraphQL API standards — queries, mutations, error handling, pagination, versioning, webhooks, rate limits, and billing. Use when writing any code that calls Shopify APIs.
globs: ["app/**/*.server.ts", "app/**/*.server.tsx", "app/routes/**/*.ts", "app/routes/**/*.tsx"]
---

# Shopify API Standards

## Before Writing Any Shopify API Code

**Always check official sources first** — Shopify APIs change quarterly. Training data may be outdated.

Search these before writing queries, mutations, or webhook handlers:
- `shopify.dev/docs/api/admin-graphql` — current API reference, field names, types
- `shopify.dev/docs/api/usage/versioning` — which versions are supported right now
- `shopify.dev/changelog` — recent breaking changes, deprecations, new fields
- `shopify.dev/docs/api/usage/limits` — current rate limit numbers by plan
- `shopify.dev/docs/apps/build/graphql/basics/mutations` — mutation patterns

If you're unsure whether a field, mutation, or type still exists — search before using it.

## GraphQL Only — No REST

REST Admin API is legacy as of October 2024. All new code must use GraphQL Admin API. Never use REST endpoints.

## API Versioning

- Shopify releases new API versions quarterly: `YYYY-MM` (e.g., `2025-01`, `2025-04`, `2025-07`, `2025-10`)
- Each version is supported for minimum 12 months
- **Always pin to a specific stable version** — never use `unstable` or old version in production
- **Update quarterly** — check the developer changelog before each version expires
- Version is set in `shopify.server.ts` via `apiVersion` — keep this current
- Using an expired version causes Shopify to fall-forward to oldest supported version, which may break your app
- **Public apps using unsupported versions get delisted from the App Store**

## Authentication Pattern

Every loader/action that calls Shopify API must authenticate first:

```typescript
const { admin } = await authenticate.admin(request);
```

The `admin` object provides `admin.graphql()` — the only way to call the API. Never construct raw fetch calls to Shopify endpoints.

## GraphQL Queries

- **Request only the fields you need** — don't select `*`. Every extra field costs rate limit points
- **Always include `pageInfo` on connections** — you'll need it for pagination
- **Max 250 items per page** — use `first: 250` max. For larger datasets, use bulk operations
- **Use variables, not string interpolation** — prevents injection and improves readability
- **Type your responses** — define interfaces for every query response shape

## GraphQL Mutations

- **Always select `userErrors { field message }` on every mutation** — this is mandatory, not optional
- **Check `userErrors` before accessing the result** — a mutation can return `200 OK` with `userErrors` populated. This is NOT a success
- **Never assume a mutation succeeded** — always: run mutation → check `userErrors.length > 0` → handle errors OR use result
- **Select the created/updated object in the response** — verify the data after mutation
- **Return mutation errors to the UI** — don't silently swallow them

Pattern for every mutation call:

```typescript
const response = await admin.graphql(MUTATION, { variables: { input } });
const { productUpdate } = await response.json();

if (productUpdate.userErrors.length > 0) {
  // Return errors to the component — NEVER ignore these
  return { errors: productUpdate.userErrors };
}

// Only access the result after confirming no errors
return { product: productUpdate.product };
```

## Pagination

Shopify uses cursor-based pagination (Relay spec):

- **Always use `nodes` over `edges`** unless you specifically need edge metadata
- **Always check `pageInfo.hasNextPage`** before requesting the next page
- **Use `endCursor` / `startCursor`** for forward/backward pagination
- **Never hardcode cursors** — they are opaque and can change
- **For large datasets (1000+)** — use bulk operations (`bulkOperationRunQuery`), not paginated loops
- **Handle empty results** — a connection can return `nodes: []`. Don't crash on empty arrays

## Rate Limits

GraphQL Admin API uses calculated query cost (point-based bucket):

- Standard plan: 50 points/second, 1000-point bucket
- Advanced plan: 100 points/second, 2000-point bucket  
- Plus plan: 500 points/second, 20000-point bucket
- Mutations cost more than queries (~10 points base)
- **Check `extensions.cost` in responses** to monitor your usage
- **If throttled (429)** — implement exponential backoff, don't retry immediately in a loop
- **Never make API calls in a tight loop without checking remaining points**
- **Use bulk operations for large data processing** — they bypass rate limits

## Webhooks

- **Register webhooks in `shopify.server.ts`** — use the `webhooks` config, not manual registration
- **Always verify webhook authenticity** — `authenticate.webhook(request)` handles this
- **Webhooks are action-only routes** — no loader, no component
- **Return `200` quickly** — do heavy processing async. Shopify retries on timeout (within 5 seconds)
- **Handle duplicate deliveries** — webhooks can fire more than once. Make handlers idempotent
- **Don't ignore mandatory webhooks** — `APP_UNINSTALLED`, `CUSTOMERS_DATA_REQUEST`, `CUSTOMERS_REDACT`, `SHOP_REDACT` are required for app store approval

## Error Handling

- **GraphQL can return `200 OK` with errors** — always check the response body, not just HTTP status
- **Distinguish between query errors and user errors**:
  - Query errors (wrong field, syntax) → top-level `errors` array → these are bugs, fix your query
  - User errors (validation, business logic) → `userErrors` on mutation payload → show to user
- **Never leave GraphQL error handling empty** — every `admin.graphql()` call must have its response checked
- **Network failures** — wrap `admin.graphql()` calls in try/catch. Return meaningful error to the component, don't let it crash silently
- **Log GraphQL errors with context** — include the operation name and variables (scrub sensitive data)

## Common Mistakes

- **Don't ignore `userErrors`** — this is the #1 Shopify API mistake. A mutation can "succeed" (200 OK) but fail (userErrors populated)
- **Don't use string concatenation for GraphQL** — use parameterized variables: `$input: ProductInput!`
- **Don't fetch all fields "just in case"** — every field costs rate limit points. Query only what you render
- **Don't paginate when you need bulk operations** — looping through 10,000 products with `first: 250` is slow and wasteful. Use `bulkOperationRunQuery`
- **Don't hardcode GIDs** — Shopify Global IDs (`gid://shopify/Product/123`) can change format. Always fetch them dynamically
- **Don't call the API on every render** — use Remix loaders, which cache via Remix's data flow. Never call `admin.graphql()` inside React components
- **Don't leave API calls without error handling** — every `admin.graphql()` must have try/catch and `userErrors` check
- **Don't use deprecated API versions** — check `shopify.server.ts` quarterly and bump the version
- **Don't forget webhook idempotency** — the same webhook can arrive twice. Use the `X-Shopify-Webhook-Id` header to deduplicate
- **Don't mix REST and GraphQL** — use GraphQL for everything. REST is legacy

## Completeness Checklist

Before any Shopify API code is considered done:

1. Every mutation checks `userErrors` and handles them
2. Every query response is typed with an interface
3. Every paginated query checks `hasNextPage`
4. Every `admin.graphql()` call is wrapped in try/catch
5. API version in `shopify.server.ts` is current
6. No raw fetch calls to Shopify — only `admin.graphql()`
7. No fields queried that aren't rendered or used
8. Webhook handlers return quickly and handle duplicates

## Reference Files
Check `references/patterns-learned.md` for project-specific patterns.
