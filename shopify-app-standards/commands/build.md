---
description: Execute a plan by building TODO by TODO. Use after /plan when the execution plan is confirmed. Follows project standards strictly.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Build — Plan Execution

You are entering the Build phase. Your job is to execute the confirmed plan, TODO by TODO, following project standards precisely. Building is disciplined execution, not creative improvisation.

## Input
The task or plan to build: `$ARGUMENTS`

## Pre-Build Checks

### Check 1: Does a Plan Exist?
Look for a confirmed execution plan in the current conversation. If no plan exists:

> ⚠️ No execution plan found. Building without a plan leads to directionally incorrect code.
> Please run `/plan` first to create an execution plan, then return to `/build`.

Do NOT proceed without a plan unless the user explicitly overrides this.

### Check 2: Load Project Standards — MANDATORY
Before writing ANY code, you MUST re-read the following files — even if you read them during `/plan`. Planning discussion may have pushed details out of focus. You need these rules fresh before writing code. Do NOT skip this step:

1. Read `CLAUDE.md` for project overview
2. Read EVERY skill file listed below — these are your MANDATORY coding standards:
   - `typescript-standards` — Strict typing, naming, imports, no any/unknown, no empty blocks, no dead code, pre-commit quality gate
   - `remix-patterns` — Loader/action structure, authenticate.admin first, ErrorBoundary, embedded app rules, data flow, component completeness
   - `shopify-api` — GraphQL only, API versioning, userErrors checking, pagination, rate limits, webhook handlers
   - `prisma-standards` — db.server.ts singleton, schema design, query patterns, N+1 prevention, transactions, error handling
   - `polaris-appbridge` — Page/Card/BlockStack layout, Text component, Banner feedback, App Bridge Modal/Toast/TitleBar, embedded UI rules

**If you cannot find or read a skill file, STOP and tell the user.** Do not proceed with partial standards.

3. Read `.claude/patterns-learned.md` if it exists — it contains project-specific learnings from previous tasks.

Every line of code you write must align with these standards. Violations are build failures.

## Build Process

### Execute TODO by TODO
Work through the plan's TODOs in order. For each TODO:

1. **State what you're about to do** — one line announcing the current TODO

2. **Identify which skills apply to this TODO's files:**
   - `.ts` / `.tsx` files → re-read `typescript-standards` checklist
   - `app/routes/**` files → re-read `remix-patterns` checklist
   - Files calling `admin.graphql()` → re-read `shopify-api` checklist
   - `prisma/schema.prisma` or `*.server.ts` with Prisma calls → re-read `prisma-standards` checklist
   - Files with Polaris/AppBridge components → re-read `polaris-appbridge` checklist

3. **Search docs for any unfamiliar API before using it:**
   - Using a third-party API (Vercel, Stripe, etc.)? Search their docs for the exact endpoint/header/config
   - Using a Shopify API you haven't used in this session? Search `shopify.dev`
   - Using a Prisma feature you're not 100% sure about? Search `prisma.io/docs`
   - Using a date/time/timezone operation? Search for the correct approach — never do manual UTC offset math
   - **If you're not certain it's correct, search before writing. Training data can be outdated.**

4. **Write the code** — following the plan's approach and project standards

5. **Per-file validation before moving on** — run the relevant skill's Pre-Commit Checklist against the file you just wrote:
   - For `.tsx` route file, check ALL of: typescript checklist + remix checklist + polaris checklist
   - For `.server.ts` file, check ALL of: typescript checklist + prisma checklist (if DB calls) + shopify-api checklist (if API calls)
   - For `schema.prisma`, check prisma checklist
   - **If the file fails any checklist item, fix it NOW — not later**

6. **Move to the next TODO**

### Per-File Validation — What to Check

After writing EACH file, verify against these (from the skill checklists):

**Every `.ts`/`.tsx` file:**
- No unused imports or variables
- No `any` types — proper types defined
- No empty catch/else/if blocks
- No `console.log` — only `console.error` in catch blocks
- No `!` non-null assertions or `as` type assertions
- All exported functions have explicit return types

**Every route file (`app/routes/**`):**
- `authenticate.admin(request)` called first in loader/action
- Every loader/action handles failure with try/catch
- Every action returns on all code paths
- ErrorBoundary present if route has loader or action
- No `<a>` tags — use Remix `<Link>`
- No `window.location` — use `useNavigate()` or Remix `redirect`
- Loading states handled (`useNavigation().state`)
- Empty states handled for lists

**Every file with Polaris/AppBridge:**
- No deprecated components (`LegacyCard`, `LegacyStack`, Polaris `Modal`)
- No bare HTML (`<div>`, `<p>`, `<button>`) — use Polaris components
- No custom CSS for layout — use Polaris layout components
- No `window.alert()` or `window.confirm()` — use AppBridge Modal
- Every Button has onClick handler
- Every TextField has label
- Every form shows validation errors

**Every file with Prisma calls:**
- `findUnique`/`findFirst` handles null return
- `findMany` has `where` or `take` limit
- Wrapped in try/catch
- Unique constraint violations return user-friendly errors
- Imports from `~/db.server` — not `new PrismaClient()`

**Every file with Shopify API calls:**
- Every mutation checks `userErrors`
- Every query response is typed
- Variables used (not string interpolation)
- `admin.graphql()` wrapped in try/catch

### If You Encounter a Problem During Building
Things the plan didn't anticipate will come up. Handle them based on severity:

**Minor (doesn't change the approach):**
Solve it inline, note what you did and why. Continue building.

**Medium (changes a TODO but not the overall approach):**
Pause, explain the issue to the user, propose the adjustment, get confirmation, then continue.

**Major (invalidates the plan's approach):**
Stop building. Explain what you found and why the plan needs revision. Suggest the user run `/plan` again with this new information.

## Code Quality During Build

While building, always:

- **Follow the project skills** — not generic best practices, YOUR project's conventions
- **Search docs before using unfamiliar APIs** — don't guess headers, configs, or library methods
- **Write code as if someone else will maintain it** — clear naming, logical structure, helpful comments only where intent isn't obvious
- **Reuse existing patterns** — if the codebase already has a way of doing something, follow it
- **Don't over-engineer** — build exactly what the plan calls for, nothing more
- **Don't leave TODOs in code** — if something needs future work, note it separately
- **Don't use bare HTML in Polaris apps** — every element must be a Polaris component
- **Don't use window APIs in embedded apps** — no alert, confirm, location.reload, location.href

## Post-Build

After completing all TODOs, provide a brief summary:

```
## Build Complete

**TODOs Completed:** [X/X]

**Files Created/Modified:**
- `path/to/file` — [what was done]

**Per-File Validation:** [All passed / Issues found and fixed during build]

**Any Deviations from Plan:**
- [What changed and why, or "None"]

**APIs/Docs Searched During Build:**
- [List any external docs checked to verify correctness]

**Ready for Assessment:**
Run `/assess` to validate the output and review code quality.
```

## Rules
- Never deviate from the plan's approach without user approval
- Never add features or enhancements not in the plan
- Always follow project skill standards over generic conventions
- Always search docs before using unfamiliar APIs — never rely on training data alone
- Always validate each file against skill checklists before moving to the next TODO
- If a TODO is unclear, ask — don't guess
- Build incrementally — complete one TODO fully before starting the next


**Once complete, suggest the user run `/assess` to validate the output and review code quality.**
