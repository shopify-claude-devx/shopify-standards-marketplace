---
name: react-router-patterns
description: React Router v7 route patterns for Shopify embedded apps — authenticate.admin first, no <a> tags, no window.location, Shopify boundary exports, action error handling. Use when writing, editing, or reviewing route files in app/routes/.
user-invocable: false
paths: ["app/routes/**/*.ts", "app/routes/**/*.tsx"]
---

# React Router Patterns — Shopify Embedded Apps

**Search docs first.** Shopify's React Router integration (`@shopify/shopify-app-react-router`) is actively evolving. Search `shopify.dev/docs/api/shopify-app-react-router` and `reactrouter.com/docs` before assuming any import path or hook is current.

## Framework — React Router v7

Shopify apps use React Router v7 (the Remix → React Router merge). Key imports:

```typescript
// Route types
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";

// Navigation and data
import { Form, Link, useLoaderData, useActionData, useNavigation, useSubmit } from "react-router";

// Shopify authentication
import { authenticate } from "../shopify.server";
```

**Never import from `@remix-run/*`.** Those packages are legacy.

## Iframe Rules — CRITICAL

These break the embedded app if violated. The iframe loses session:

**No `<a>` tags.** Use `<Link>` from `react-router` or `<s-link>` from Polaris.

**No `redirect` from `react-router`.** Use `redirect` from `authenticate.admin(request)`.

**No lowercase `<form>`.** Use `<Form>` from `react-router` or `useSubmit`.

**No `window.location`, `window.alert`, `window.confirm`.** These break the iframe. Use App Bridge or React Router navigation.

## Authentication — Always First

Every loader and action in an app route must call `authenticate.admin(request)` before any other logic. No exceptions.

```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);
  // ... rest of loader
}

export async function action({ request }: ActionFunctionArgs) {
  const { admin, redirect } = await authenticate.admin(request);
  // ... rest of action
  return redirect("/app");
}
```

Webhook routes use `authenticate.webhook(request)` instead.

## Route Naming

```
app/routes/
├── app.tsx                       → Layout (must export Shopify boundaries)
├── app._index.tsx                → /app home
├── app.products.tsx              → /app/products (list)
├── app.products.$id.tsx          → /app/products/:id (detail)
├── auth.$.tsx                    → OAuth splat
├── auth.login/                   → Login (directory route)
├── webhooks.app.uninstalled.tsx  → Webhook (action-only)
└── webhooks.app.scopes_update.tsx → Webhook (action-only)
```

## Layout Route (app.tsx) — Required Exports

Without these, OAuth redirects fail inside the iframe:

```typescript
import type { HeadersFunction } from "react-router";
import { Outlet, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

export default function AppLayout() {
  return <Outlet />;
}
```

## shopify.server.ts Setup

```typescript
import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.April26,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    expiringOfflineAccessTokens: true,
  },
});

export default shopify;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const sessionStorage = shopify.sessionStorage;
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

## Loader Pattern

```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`#graphql
    query GetProducts {
      products(first: 25) {
        nodes { id title status }
        pageInfo { hasNextPage endCursor }
      }
    }
  `);
  const { data } = await response.json();

  return { products: data?.products?.nodes ?? [] };
}
```

## Action Pattern

```typescript
export async function action({ request }: ActionFunctionArgs) {
  const { admin, redirect } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = String(formData.get("_action") ?? "");

  switch (actionType) {
    case "create": {
      const title = String(formData.get("title") ?? "");
      if (!title) return { errors: { title: "Title is required" } };

      const response = await admin.graphql(`#graphql
        mutation CreateProduct($input: ProductInput!) {
          productCreate(input: { title: $input.title }) {
            product { id }
            userErrors { field message }
          }
        }
      `, { variables: { input: { title } } });

      const { data } = await response.json();
      if (data?.productCreate?.userErrors?.length) {
        return { errors: { form: data.productCreate.userErrors[0].message } };
      }

      return redirect("/app/products");
    }
    default:
      return { errors: { form: "Unknown action" } };
  }
}
```

## Component Pattern

```tsx
export default function Products() {
  const { products } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <s-page heading="Products">
      <s-button slot="primary-action" variant="primary">Add product</s-button>

      {actionData?.errors?.form && (
        <s-banner tone="critical">{actionData.errors.form}</s-banner>
      )}

      {products.length === 0 ? (
        <s-section>
          <s-paragraph>No products found.</s-paragraph>
        </s-section>
      ) : (
        <s-section>
          <s-table>{/* product rows */}</s-table>
        </s-section>
      )}
    </s-page>
  );
}
```

## Webhook Route Pattern

Webhook routes are action-only — no loader, no default export:

```typescript
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        await db.session.deleteMany({ where: { shop } });
      }
      break;
  }

  return new Response();
};
```

## Key Rules

- **Check `userErrors` from every GraphQL mutation** — `response.data` can exist alongside errors. Always check the array first.
- **Every route with a loader or action needs an ErrorBoundary** — don't rely only on root.
- **Don't import `.server.ts` files in components** — breaks the client bundle.
- **Don't use `useState` for server data** — use `useLoaderData`. Let React Router handle revalidation.
- **Don't use `useEffect` for data fetching** — that's what loaders are for.
- **Disable submit buttons during `navigation.state === "submitting"`** — prevents double-submits.
- **Every form shows validation errors** — check `actionData?.errors` and display inline.
- **Every list handles empty state** — never show a blank page.
- **Multiple actions in one route** — use hidden `_action` field with switch.

## Checklist

See `checklist/rules-and-checklist.md` for the validation checklist.
