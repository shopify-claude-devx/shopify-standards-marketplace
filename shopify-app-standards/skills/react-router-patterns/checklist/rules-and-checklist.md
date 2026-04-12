# React Router Patterns — Checklist

### Imports
- [ ] No `@remix-run/*` imports — use `react-router`
- [ ] Types from `react-router`: `LoaderFunctionArgs`, `ActionFunctionArgs`, `HeadersFunction`
- [ ] Hooks from `react-router`: `useLoaderData`, `useActionData`, `useNavigation`, `useSubmit`
- [ ] Components from `react-router`: `Form`, `Link`, `Outlet`
- [ ] Shopify auth from `../shopify.server`: `authenticate`
- [ ] Boundaries from `@shopify/shopify-app-react-router/server`: `boundary`

### Loader
- [ ] `authenticate.admin(request)` called first
- [ ] URL params validated (`params.id` is `string | undefined`)
- [ ] Returns serializable data only (no Date objects — use `.toISOString()`)
- [ ] Failure handled — DB/API errors caught, returns error state or throws Response
- [ ] No empty loaders — must return meaningful data
- [ ] Return typed with `typeof loader` at component level

### Action
- [ ] `authenticate.admin(request)` called first
- [ ] `redirect` destructured from `authenticate.admin(request)`, not imported from `react-router`
- [ ] `formData.get()` narrowed to string before using
- [ ] GraphQL `userErrors` checked — never assume mutation succeeded
- [ ] Multiple actions use hidden `_action` field with switch
- [ ] Returns on ALL code paths (success, error, redirect)
- [ ] Validation errors returned to component, not thrown
- [ ] Catch blocks return error data or rethrow — never empty

### Iframe Safety
- [ ] No `<a>` tags — only `<Link>` from `react-router` or `<s-link>`
- [ ] No `redirect` from `react-router` — only from `authenticate.admin`
- [ ] No lowercase `<form>` — only `<Form>` from `react-router` or `useSubmit`
- [ ] No `window.location`, `window.alert`, `window.confirm`, `window.open`
- [ ] No `window.scrollTo`, `window.reload`

### Layout Route (app.tsx)
- [ ] Exports `ErrorBoundary` using `boundary.error(useRouteError())`
- [ ] Exports `headers` using `boundary.headers(headersArgs)`
- [ ] Default export renders `<Outlet />`
- [ ] `boundary` imported from `@shopify/shopify-app-react-router/server`

### Error Handling
- [ ] ErrorBoundary exported (every route with loader/action)
- [ ] `isRouteErrorResponse(error)` used to distinguish expected vs unexpected
- [ ] Errors shown in `<s-banner tone="critical">`
- [ ] Root ErrorBoundary never throws
- [ ] ErrorBoundary renders meaningful UI, not empty

### Component Completeness
- [ ] Forms show validation errors inline (check `actionData?.errors`)
- [ ] Forms show success feedback (banner, toast, or redirect)
- [ ] Loading states visible (button loading state, `<s-spinner>`, disabled state)
- [ ] Lists handle empty state ("No items found")
- [ ] `useActionData()` checked for undefined before accessing properties
- [ ] Submit buttons disabled during `navigation.state === "submitting"`

### Webhook Routes
- [ ] Action-only — no loader, no default export
- [ ] Uses `authenticate.webhook(request)`
- [ ] Returns `new Response()` (200)
- [ ] Heavy processing done async — respond within 5 seconds
