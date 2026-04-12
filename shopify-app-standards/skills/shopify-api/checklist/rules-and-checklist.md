# Shopify API Standards — Checklist

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
- [ ] `nodes` used over `edges` unless per-item cursor needed

### Authentication
- [ ] `authenticate.admin(request)` called before any API call
- [ ] `admin.graphql()` used — no raw fetch to Shopify
- [ ] `redirect` from `authenticate.admin`, not from `react-router`
- [ ] Webhook routes use `authenticate.webhook(request)`

### Error Handling
- [ ] Every `admin.graphql()` wrapped in try/catch
- [ ] Network errors return meaningful error to component
- [ ] Query errors (top-level `errors`) treated as bugs to fix
- [ ] User errors (`userErrors`) shown to user in UI
- [ ] No raw error messages exposed to merchant — use friendly text

### Webhooks
- [ ] Registered in `shopify.app.toml` webhooks config
- [ ] Action-only route (no loader, no component)
- [ ] Returns `new Response()` (200) within 5 seconds
- [ ] Heavy processing done async
- [ ] Idempotent — handles duplicate deliveries via `webhookId`
- [ ] Mandatory webhooks implemented: `APP_UNINSTALLED`, `CUSTOMERS_DATA_REQUEST`, `CUSTOMERS_REDACT`, `SHOP_REDACT`

### Versioning
- [ ] `apiVersion` in `shopify.server.ts` is a current supported version
- [ ] Not using `unstable` in production
- [ ] Webhook API version in `shopify.app.toml` matches app version

### Performance
- [ ] No paginated loops for 1000+ items — use bulk operations
- [ ] No unnecessary fields selected
- [ ] No API calls inside React components — only in loaders/actions
- [ ] Rate limit `extensions.cost` monitored for expensive operations
