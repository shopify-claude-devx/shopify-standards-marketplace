---
name: remix-patterns
description: Remix route patterns for Shopify embedded apps — authenticate.admin first, no <a> tags, no window.location, no bare <form>, Shopify boundary exports, action error handling. Use when writing, editing, or reviewing route files in app/routes/, or when the user mentions loaders, actions, forms, or navigation in their Shopify app.
user-invocable: false
globs: ["app/routes/**/*.ts", "app/routes/**/*.tsx"]
---

# Remix Patterns — Shopify Embedded Apps

**Search docs first.** Remix is migrating to React Router v7 and Shopify packages update often. Search `remix.run/docs` and `shopify.dev/docs/api/shopify-app-remix` before assuming any import path or hook is current.

## Iframe Rules — CRITICAL

These break the embedded app if violated. The iframe loses session:

**No `<a>` tags.** Use `<Link>` from `@remix-run/react` or `@shopify/polaris`.

**No `redirect` from `@remix-run/node`.** Use `redirect` from `authenticate.admin(request)`.

**No lowercase `<form>`.** Use `<Form>` from `@remix-run/react` or `useSubmit`.

**No `window.location`, `window.alert`, `window.confirm`.** These break the iframe. Use App Bridge or Remix navigation.

## Authentication — Always First

Every loader and action in an app route must call `authenticate.admin(request)` before any other logic. No exceptions.

Webhook routes use `authenticate.webhook(request)` instead.

## Route Naming

```
app/routes/
├── app.tsx                       → Layout (must export Shopify boundaries)
├── app._index.tsx                → /app home
├── app.products.$id.tsx          → /app/products/:id
├── auth.$.tsx                    → OAuth splat
└── webhooks.app.uninstalled.tsx  → Webhook (action-only)
```

## Layout Route (app.tsx) — Required Exports

Without these, OAuth redirects fail inside the iframe:

```typescript
import { boundary } from "@shopify/shopify-app-remix/server";

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
```

## Action Errors — Return, Don't Throw

Throwing in an action unmounts the component and loses form state. Return errors instead:

```typescript
// Wrong — user loses form data
throw new Error("Invalid input");

// Right — form stays mounted, show inline errors
return { errors: { name: "Name is required" } };
```

Use `throw new Response("Not found", { status: 404 })` only for expected HTTP errors (not found, forbidden), not validation.

## Key Rules

- **Check `userErrors` from every GraphQL mutation** — `response.data` can exist alongside errors. Always check the array first.
- **Every route with a loader or action needs an ErrorBoundary** — don't rely only on root.
- **Don't import `.server.ts` files in components** — breaks the client bundle.
- **Don't use `useState` for server data** — use `useLoaderData`. Let Remix handle revalidation.
- **Don't use `useEffect` for data fetching** — that's what loaders are for.
- **Disable submit buttons during `navigation.state === "submitting"`** — prevents double-submits.
- **Every form shows validation errors** — check `actionData?.errors` and display inline.
- **Every list handles empty state** — never show a blank page.

## Checklist

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
