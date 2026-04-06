# Remix Patterns — Checklist

### Loader
- [ ] `authenticate.admin(request)` called first
- [ ] URL params validated (`params.id` is `string | undefined`)
- [ ] Returns serializable data only (no Date objects — use `.toISOString()`)
- [ ] Failure handled — DB/API errors caught, returns error state or throws Response
- [ ] No empty loaders — must return meaningful data
- [ ] Return typed with `typeof loader` at component level

### Action
- [ ] `authenticate.admin(request)` called first
- [ ] `formData.get()` narrowed to string before using
- [ ] GraphQL `userErrors` checked — never assume mutation succeeded
- [ ] Multiple actions use hidden `_action` field with switch
- [ ] Returns on ALL code paths (success, error, redirect)
- [ ] Validation errors returned to component, not thrown
- [ ] Catch blocks return error data or rethrow — never empty

### Iframe Safety
- [ ] No `<a>` tags — only `<Link>` from Remix or Polaris
- [ ] No `redirect` from `@remix-run/node` — only from `authenticate.admin`
- [ ] No lowercase `<form>` — only `<Form>` from Remix or `useSubmit`
- [ ] No `window.location`, `window.alert`, `window.confirm`, `window.open`
- [ ] No `window.scrollTo`, `window.reload`

### Error Handling
- [ ] ErrorBoundary exported (every route with loader/action)
- [ ] `isRouteErrorResponse(error)` used to distinguish expected vs unexpected
- [ ] Errors shown in Polaris `Banner` with `tone="critical"`
- [ ] Root ErrorBoundary never throws
- [ ] ErrorBoundary renders meaningful UI, not empty

### Component Completeness
- [ ] Forms show validation errors inline (check `actionData?.errors`)
- [ ] Forms show success feedback (banner, toast, or redirect)
- [ ] Loading states visible (button spinner, skeleton, disabled state)
- [ ] Lists handle empty state ("No items found")
- [ ] `useActionData()` checked for undefined before accessing properties
- [ ] `useFetcher.data` handles undefined, error, and success states
- [ ] Submit buttons disabled during `navigation.state === "submitting"`
