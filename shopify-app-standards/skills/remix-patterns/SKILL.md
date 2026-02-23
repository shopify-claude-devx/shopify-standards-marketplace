---
name: remix-patterns
description: Remix framework patterns for Shopify embedded apps — loaders, actions, routing, error handling, and Shopify-specific requirements. Use when creating or modifying route files.
globs: ["app/routes/**/*.tsx", "app/routes/**/*.ts"]
---

# Remix Patterns for Shopify Apps

## Before Writing Route Code

**Always check official sources first** — Remix is migrating to React Router v7, and Shopify packages update frequently.

Search these before writing loaders, actions, or route patterns:
- `remix.run/docs` — current loader/action API, hooks, data flow
- `shopify.dev/docs/api/shopify-app-remix` — Shopify's Remix package, authentication, boundaries
- `github.com/Shopify/shopify-app-template-remix` — current template structure, embedded app rules
- `polaris.shopify.com` — current component APIs for UI patterns

If you're unsure whether an import path, hook, or pattern is current — search before using it.

## Route File Export Order

```typescript
// 1. Imports
// 2. loader (GET — data fetching)
// 3. action (POST/PUT/DELETE — mutations)
// 4. default export (React component)
// 5. ErrorBoundary
// 6. headers (if Shopify boundary needed)
```

## Loaders

- **Always `authenticate.admin(request)` first** — before any other logic
- **Validate URL params** — `params.id` is always `string | undefined`, check before using
- **Return serializable data only** — no functions, class instances, or Date objects (use `.toISOString()`)
- Remix v2 allows plain object returns; `json()` when you need custom status/headers
- **Every loader must handle failure** — if a DB query or API call can fail, handle it (throw Response with status, or return error state). Never let errors silently disappear
- **No empty loaders** — if a route has a loader, it must return meaningful data. Don't leave `return null` or `return {}` as placeholder
- **Type the return** — use `typeof loader` with `useLoaderData` for end-to-end type safety

## Actions

- **Always `authenticate.admin(request)` first**
- **Always validate `formData`** — `formData.get()` returns `FormDataEntryValue | null`, narrow to string before using
- **Always check GraphQL `userErrors`** — never assume a mutation succeeded. Check the array and return errors to the UI
- **Multiple actions per route** — use hidden `_action` field with `switch` statement
- Return errors with appropriate status codes (`400` for validation, `422` for mutation errors)
- **Every action must return on all code paths** — no path should fall through without a return (success, error, or redirect)
- **Never swallow action errors** — if a try/catch wraps the action body, the catch must return error data to the component or rethrow. Never `catch () {}`
- **Return validation errors to the component** — don't throw to ErrorBoundary for user input errors. Return `{ errors }` so the form stays mounted with user's data intact

## Shopify Embedded App Rules — CRITICAL

These three rules break the app if violated. The embedded iframe loses session:

1. **Navigation** — use `<Link>` from `@remix-run/react` or `@shopify/polaris`. NEVER use `<a>` tags.
2. **Redirects** — use `redirect` from `authenticate.admin(request)`. NEVER use `redirect` from `@remix-run/node`.
3. **Forms** — use `<Form>` from `@remix-run/react` or `useSubmit`. NEVER use lowercase `<form>`.

## Routing

```
app/routes/
├── app.tsx                       → Layout (Polaris + AppBridge + Shopify boundary)
├── app._index.tsx                → /app (home page)
├── app.products.$id.tsx          → /app/products/:id
├── auth.$.tsx                    → OAuth splat route
└── webhooks.app.uninstalled.tsx  → Webhook (action-only, no component)
```

## Layout Route (app.tsx)

The `app.tsx` layout **MUST** export Shopify's boundary handlers. Without them, OAuth redirects fail inside the iframe:

```typescript
import { boundary } from "@shopify/shopify-app-remix/server";

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
```

Child routes can have their own `ErrorBoundary` without affecting this.

## Error Handling

- **Expected errors** (not found, forbidden) → `throw new Response("message", { status: 404 })`
- **Unexpected errors** (bugs) → `throw new Error("message")`
- **ErrorBoundary** — use `isRouteErrorResponse(error)` to distinguish between the two
- Show errors using Polaris `Banner` with `tone="critical"`
- Errors bubble up to parent routes until an `ErrorBoundary` catches them
- **Every route that has a loader or action should have an ErrorBoundary** — don't rely solely on the root boundary for all routes
- **Never leave ErrorBoundary as empty placeholder** — it must render meaningful error UI
- **Root ErrorBoundary must never throw** — nothing catches errors above root. Keep it simple and safe
- **Action errors → return data, don't throw** — throwing in an action unmounts the component and loses form state. Return `{ errors }` instead and show inline

## Webhooks

Action-only routes — no loader, no component:

```typescript
export async function action({ request }: ActionFunctionArgs) {
  const { shop, session, topic } = await authenticate.webhook(request);
  // handle webhook...
  return new Response();
}
```

## Data Flow

- **Read**: `loader()` → `useLoaderData<typeof loader>()`
- **Write**: `<Form method="post">` → `action()` → `useActionData<typeof action>()` → loader auto-revalidates
- **Non-navigation mutation**: `useFetcher()` — submits without navigating away
- **Loading states**: `useNavigation().state` — `"idle"`, `"loading"`, `"submitting"`

## Common Mistakes

- **Don't `useEffect` for data fetching** — use loaders instead
- **Don't import `.server.ts` files in components** — they're server-only, will break the client bundle
- **Don't return non-serializable data from loaders** — data goes over the network as JSON
- **Don't use `useState` for server data** — use `useLoaderData`, let Remix manage revalidation
- **Don't leave loading states unhandled** — always check `useNavigation().state` and show loading UI (spinner, disabled button). Never leave the user guessing
- **Don't leave `useFetcher` results unchecked** — `fetcher.data` can be undefined, error, or success. Handle all three states
- **Don't forget optimistic UI** — disable submit buttons during `navigation.state === "submitting"` to prevent double-submits
- **Don't silently ignore GraphQL errors** — `response.data` can exist alongside `userErrors`. Always check `userErrors` array first
- **Don't leave empty `onClick` or `onSubmit` handlers** — wire them up or remove them
- **Don't use `console.log` in loaders/actions** — use `console.error` only in catch blocks for real errors. Remove all debug logs before completing
- **Don't leave TODO comments in route files** — implement the feature or don't create the route

## Component Completeness

- **Every form must show validation errors** — check `actionData?.errors` and display next to relevant fields
- **Every form must show success feedback** — banner, toast, or redirect after successful mutation
- **Every loading state must be visible** — button loading, page skeleton, or spinner
- **Every list must handle empty state** — "No products found" is better than a blank page
- **Every destructured hook must handle undefined** — `useActionData()` returns `undefined` on first render, always check before accessing properties

## Reference Files
Check `references/patterns-learned.md` for project-specific patterns.
