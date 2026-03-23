---
name: typescript-standards
description: Enforces strict TypeScript rules for Shopify Remix apps — no any, no unknown, no as casts, no non-null assertions, no empty blocks, no console.log, no dead code. Use when writing, editing, reviewing, or generating any .ts or .tsx file, or when the user mentions TypeScript, type errors, linting, or code quality.
user-invocable: false
globs: ["**/*.ts", "**/*.tsx"]
---

# TypeScript Standards — Shopify Remix Apps

**Search docs first.** If unsure about a tsconfig flag, ESLint rule, or type pattern — search `typescriptlang.org` or `typescript-eslint.io` before using it.

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
import type { LoaderFunctionArgs } from "@remix-run/node";
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

### Empty Blocks

| Block | Rule |
|---|---|
| `catch` | Must handle: log, rethrow, return fallback, or show user feedback |
| `else` | Must have logic. If nothing to do, remove the else |
| `if` | Never use as placeholder. Implement or remove |
| `finally` | Only add if cleanup is needed |
| `callbacks` | No empty `onClick={() => {}}`. Wire it up or remove |
| `switch default` | Must throw, return, or log |

### Console Rules

| Allowed | Not Allowed |
|---|---|
| `console.error` inside catch blocks | `console.log` anywhere |
| Structured logger on server | `console.warn` as TODO marker |

### Dead Code
- [ ] No commented-out code (git has history)
- [ ] No TODO/FIXME comments (implement now or create issue)
- [ ] No code after return/throw/break
- [ ] No unused functions or variables
- [ ] No empty function bodies with placeholder comments

### Unsafe Shortcuts
- [ ] No `any` types
- [ ] No `unknown` types (define proper types instead)
- [ ] No `as` type assertions (use type guards)
- [ ] No `!` non-null assertions (use proper null handling)
- [ ] No nested ternaries
- [ ] No floating promises (all awaited or voided)
- [ ] No unvalidated external data
- [ ] All `.map()`, `.filter()`, `.reduce()` have explicit returns

### Import Validation
- [ ] Order: Node → third-party → internal
- [ ] Blank line between each group
- [ ] `import type` used for all type-only imports
- [ ] No unused imports

### Type Safety
- [ ] All exported functions have explicit return types
- [ ] Catch blocks narrow with `instanceof Error` or custom error classes
- [ ] Switch statements on unions have `never` exhaustive default
- [ ] Null handled with `?.` and `??`, never ignored
