---
name: typescript-standards
description: Strict TypeScript rules for Shopify apps — no any, no unknown, no as casts, no non-null assertions, no empty blocks, no console.log, no dead code. Use when writing, editing, reviewing, or generating any .ts or .tsx file, or when the user mentions TypeScript, type errors, linting, or code quality.
user-invocable: false
paths: ["**/*.ts", "**/*.tsx"]
---

# TypeScript Standards — Shopify Apps

**Search docs first.** If unsure about a tsconfig flag, ESLint rule, or type pattern — search `typescriptlang.org` or `typescript-eslint.io` before using it.

## TypeScript Setup for Polaris Web Components

Polaris Web Components are loaded via CDN. TypeScript needs type declarations:

```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["@shopify/polaris-types", "@shopify/app-bridge-types"]
  }
}
```

Without these, `<s-button>`, `<s-page>`, etc. will error with "does not exist on type 'JSX.IntrinsicElements'".

## Rules That Override Defaults

These are stricter than standard TypeScript. Follow them exactly.

**No `any`. No `unknown`.** Always define proper types — use unions, generics, or interfaces. This is non-negotiable.

**No `as` type assertions.** Use type guards or narrowing. `as` hides bugs.

**No `!` non-null assertions.** Handle null with checks, optional chaining, or defaults.

**No empty blocks — ever.** Catch, else, if, finally, callbacks, switch default — every block must do something or be removed.

**No `console.log`.** Remove all debugging logs. Only `console.error` inside catch blocks for real error handling.

**No dead code.** No commented-out code, no TODOs, no unreachable code, no unused functions, no placeholder implementations.

**No floating promises.** Every async call must be `await`ed, `.then()`'d, or explicitly `void`'d.

**No nested ternaries.** Use if/else or early returns.

## Naming

- Booleans: prefix with `is`, `has`, `can`, `should` (e.g., `isLoading`, `hasProducts`)
- Prefer union types over enums for simple strings
- Unused variables: prefix with `_`

## Imports

Order (separated by blank lines): Node built-ins → third-party → internal (`~/`).

Always use `import type` for type-only imports:
```typescript
import type { LoaderFunctionArgs } from "react-router";
```

Never leave unused imports.

## Types

- `interface` for object shapes, `type` for unions/intersections
- Explicit return types on all exported functions
- Exhaustive switches with `never` in default
- Discriminated unions for state (idle/loading/success/error)
- Validate external data (API responses, form inputs) with Zod or manual checks before using

## Pre-Commit Quality Gate

Before any file is complete, run:
```bash
npm run lint        # zero errors
npx tsc --noEmit    # zero type errors
```

Then verify: no `any`, no `unknown`, no empty blocks, no `console.log`, no `!`, no `as`, no floating promises, no dead code.

**A build that passes logic but fails lint or type check is NOT complete.**

## Checklist

See `checklist/rules-and-checklist.md` for the validation checklist.
