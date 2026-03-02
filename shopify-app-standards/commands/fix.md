---
description: Debug and fix a bug. Investigates the codebase, performs root cause analysis, proposes the fix for user approval, then executes. Use when something is broken and needs diagnosing.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Fix — Debug & Repair

You are a debugger. A bug has been reported. Your job is to find it, understand why it exists, explain it clearly, and fix it only after the user approves your approach.

**Do NOT write any code until the user approves your diagnosis.**

## Input
The bug report: `$ARGUMENTS`

---

## Step 1: Understand the Bug

Read the user's description carefully. Identify:
- **What's broken** — the symptom (crash, wrong data, UI glitch, error message, 500 response)
- **Where it happens** — which route, action, loader, or component triggers it
- **Files mentioned** — if the user pointed to specific files, start there

If the bug description is too vague to investigate, ask one clarifying question. Only one. Then proceed.

## Step 2: Investigate the Code

Find and read all relevant code:

1. **Start from the symptom** — if it's a page bug, find the route file. If it's a data bug, find the loader/action/service. If it's a UI bug, find the component. If it's an API bug, find the GraphQL call.
2. **Trace the data flow** — follow the full chain: route → loader/action → service → Prisma/Shopify API → back to component. Read every file in the chain.
3. **Check related files** — grep for shared functions, types, utilities, and services that the broken code depends on.

```bash
# Find files related to the bug
grep -rn "[keyword from bug]" app/ --include="*.ts" --include="*.tsx"

# Find all callers of a broken function
grep -rn "functionName" app/ --include="*.ts" --include="*.tsx"

# Find the route file for a specific page
find app/routes -name "*[feature]*"

# Check Prisma schema for model shape
grep -A 20 "model ModelName" prisma/schema.prisma
```

Read the project skill files to understand what the code SHOULD look like:
- `typescript-standards` — Strict typing, naming, imports, no any/unknown, no empty blocks, pre-commit quality gate
- `remix-patterns` — Loader/action structure, authenticate.admin first, ErrorBoundary, embedded app rules
- `shopify-api` — GraphQL only, userErrors checking, pagination, rate limits, webhook handlers
- `prisma-standards` — db.server.ts singleton, schema design, query patterns, error handling
- `polaris-appbridge` — Page/Card/BlockStack layout, App Bridge Modal/Toast, embedded UI rules

## Step 3: Root Cause Analysis

Now that you've read the code, answer these three questions:

1. **What is happening?** — describe the actual behavior
2. **What should happen?** — describe the expected behavior
3. **Why is it wrong?** — the root cause, not the symptom

Common root causes in Shopify Remix apps:
- **Iframe violation** — `window.location`, `<a>` tags, `window.alert` breaking the embedded app
- **Missing null check** — `findFirst`/`findUnique` returns null, code assumes it exists
- **Unhandled userErrors** — GraphQL mutation fails silently because userErrors aren't checked
- **Wrong redirect** — using `redirect` from `@remix-run/node` instead of from `authenticate.admin`
- **Stale UI** — using `useState` for server data instead of `useLoaderData`, so it doesn't revalidate
- **Type mismatch** — loader returns different shape than component expects
- **Missing auth** — `authenticate.admin(request)` not called, session lost
- **Timezone bug** — manual UTC math that breaks during DST
- **Unbounded query** — `findMany` without `take` limit causing timeout on large datasets

Then grep for other places where the same root cause might exist:

```bash
# If the bug is a wrong pattern, search for that pattern everywhere
grep -rn "[the wrong pattern]" app/ --include="*.ts" --include="*.tsx"
```

## Step 4: Present Diagnosis — STOP HERE

Present your findings and **wait for approval**:

```
## Bug Diagnosis

**Symptom:** [What the user sees]

**Root Cause:** [Why it's happening — one clear sentence]

**Where:** [file:line — the exact location]

**What's wrong:**
[Show the broken code snippet — just the relevant lines]

**Why it's wrong:**
[Explain in plain language why this code produces the bug]

**Proposed Fix:**
[Show what the code should look like instead — just the relevant lines]

**Other instances of same issue:**
[List any other files with the same problem found by grep, or "None"]

**Impact of this fix:**
[What changes — will it affect other features? Any risks?]

⏸️ Approve this fix? Say "go" to proceed or tell me what to adjust.
```

**Do NOT write any code until the user says to proceed.**

---

## Step 5: Apply the Fix (AFTER APPROVAL)

1. **Re-read the relevant skill checklist** before writing
2. **Search docs** if the fix involves a Shopify API, Prisma feature, Vercel config, or any API you're not 100% certain about
3. **Make the fix** across all affected files
4. **Verify no breakage:**
   - Did you change a function signature? Update all callers
   - Did you change a component's props? Update all usages
   - Did you change a loader's return shape? Update the component that reads it
   - Did you change a Prisma model or query? Check all services that use it

5. **Run checks:**
```bash
npm run lint
npx tsc --noEmit
```

If either fails, fix the errors before reporting.

## Step 6: Report

```
## Fix Applied

**What was wrong:** [one sentence]
**What was changed:**
- `file` — [what changed]

**Verified:**
- Lint: ✅ Passed
- Type Check: ✅ Passed
- No breakage: ✅ All callers/usages verified

**Skill that should have prevented this:** [skill name → which rule]
```

## After Fix
Once the fix is verified, run `/assess` again to ensure no new issues were introduced.

## Rules
- Never guess. If you're not sure about the cause, read more code before diagnosing
- Never fix code during diagnosis. Step 4 is a hard stop
- Never fix only the symptom. Find the root cause
- If grep reveals the same bug in other files, fix them all — not just the reported one
- Keep the diagnosis short and clear. The user needs to understand it to approve it
- Always run lint and type check after fixing. A fix that introduces new errors is not a fix
