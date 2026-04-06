# TypeScript Standards — Checklist

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
