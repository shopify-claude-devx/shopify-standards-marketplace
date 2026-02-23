---
name: typescript-standards
description: TypeScript code quality, strict typing, naming, imports, and linting rules for Shopify Remix apps. Use when writing, reviewing, or refactoring any TypeScript code.
globs: ["**/*.ts", "**/*.tsx"]
---

# TypeScript Standards

## Before Writing or Reviewing Code

**Always check official sources first** — TypeScript and ESLint rules evolve across versions.

Search these when unsure about a rule, config flag, or pattern:
- `typescriptlang.org/tsconfig` — current compiler options and their effects
- `typescript-eslint.io/rules` — current ESLint rules for TypeScript
- `ts.dev/style` — Google TypeScript Style Guide (naming, conventions)

If you're unsure whether a tsconfig flag, ESLint rule, or type pattern is current — search before using it.

## Strict Configuration

Required `tsconfig.json` flags beyond `strict: true`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "isolatedModules": true
  }
}
```

## Naming Conventions

- Variables and functions: `camelCase`
- Booleans: prefix with `is`, `has`, `can`, `should`, `will`, `did` (e.g., `isLoading`, `hasProducts`)
- Constants (compile-time immutable): `UPPER_SNAKE_CASE`
- Types and interfaces: `PascalCase`
- Enums: `PascalCase` name and members — but **prefer union types** over enums for simple strings
- Files: `camelCase` for utilities, Remix convention for routes
- Intentionally unused variables: prefix with `_` (e.g., `_unused`)

## Import Rules

**Order** (separated by blank lines):
1. Node/built-in modules
2. Third-party packages (`@remix-run`, `@shopify`, etc.)
3. Internal modules (`~/`)

**Type imports** — always use `import type` for type-only imports:
```typescript
import type { LoaderFunctionArgs } from "@remix-run/node";
import type { Product } from "~/types/product";
```

**Import hygiene** — NEVER leave unused imports. After every refactor, verify all imports are still used.

## Type Safety Rules

- **No `any` or `unknown`** — always define proper types. If the shape is known, type it. If it varies, use a union or generic.
- **Catch blocks** — define custom error classes or narrow with `instanceof Error`. Never leave errors untyped.
- **Null handling** — use optional chaining (`?.`) and nullish coalescing (`??`), never ignore possible null
- **interface** for object shapes, **type** for unions/intersections/mapped types
- **Explicit return types** on all exported functions
- **Exhaustive switches** — use `never` in default case for union types
- **Discriminated unions** for state with multiple forms (idle/loading/success/error)

## Code Quality Rules

- `const` by default, `let` only when reassignment is needed
- Early returns to reduce nesting
- No magic numbers — extract to named constants (e.g., `const MAX_RETRIES = 3`, not bare `3`)
- Every code path must return explicitly (no implicit undefined)
- Strict equality only — always `===` and `!==`, never `==` or `!=`

## No Empty Blocks — Ever

Every block must do something meaningful. No exceptions.

- **catch blocks** — must handle the error: log it, rethrow it, return a fallback, or show user feedback. Never `catch (error) {}`
- **else blocks** — if there's an else, it must have logic. If nothing to do, remove the else entirely
- **if blocks** — never `if (condition) {}` as a placeholder. Implement it or remove it
- **finally blocks** — only add if cleanup is actually needed. Don't add empty finally
- **callbacks / event handlers** — no empty `onClick={() => {}}` or `onSubmit={() => {}}`. Wire it up or remove it
- **switch default** — must handle the case: throw, return, or log. Not empty

## Console & Logging

- **No `console.log` in production code** — remove all debugging logs before marking work complete
- **Use proper error reporting** — `console.error` only inside catch blocks for genuine error handling, never `console.log`
- **No `console.warn` as TODO markers** — if something needs fixing, fix it now
- **Server-side logging** — use a structured logger if available, not console methods

## No Dead Code

- **No commented-out code** — delete it, git has history
- **No TODO/FIXME left behind** — either implement it now or create an issue. Never commit TODOs
- **No unreachable code** — no code after `return`, `throw`, or `break`
- **No unused functions or variables** — if it's not called, remove it
- **No placeholder implementations** — don't leave `// TODO: implement this` with an empty function body

## No Unsafe Shortcuts

- **No non-null assertions (`!`)** — handle null properly with checks, optional chaining, or defaults
- **No `as` type assertions** — use type guards or proper narrowing. `as` hides bugs
- **No nested ternaries** — use if/else or early returns for readability
- **No floating promises** — every async call must be `await`ed, `.then()`'d, or explicitly voided with `void`
- **No unvalidated external data** — API responses, form inputs, URL params: validate/parse before using (use Zod or manual checks)
- **Array callbacks must return** — `.map()`, `.filter()`, `.reduce()` must have explicit returns, never implicit undefined

## Pre-Commit Quality Gate

Before ANY file is considered complete:

1. `npm run lint` — zero errors
2. `npx tsc --noEmit` — zero type errors
3. No unused imports or variables
4. No `any` or `unknown` — proper types defined for everything
5. All exported functions have explicit return types
6. No empty catch, else, if, or callback blocks
7. No `console.log` — only `console.error` in catch blocks
8. No commented-out code, TODOs, or placeholder functions
9. No `!` non-null assertions or `as` type assertions
10. No floating (unhandled) promises

**A build that passes logic but fails lint or type check is NOT complete.**

## ESLint Key Rules

```javascript
{
  "@typescript-eslint/no-unused-vars": ["error", {
    "argsIgnorePattern": "^_",
    "varsIgnorePattern": "^_",
    "caughtErrorsIgnorePattern": "^_"
  }],
  "@typescript-eslint/consistent-type-imports": "error",
  "react-hooks/rules-of-hooks": "error",
  "react-hooks/exhaustive-deps": "warn"
}
```

## Reference Files
Check `references/patterns-learned.md` for project-specific patterns.
