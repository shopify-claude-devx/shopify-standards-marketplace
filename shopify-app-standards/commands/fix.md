---
description: Debug and fix a bug. Investigates the codebase, performs root cause analysis, proposes the fix for user approval, then executes. Use when something is broken and needs diagnosing.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Skill, WebSearch, WebFetch
---

# Fix — Debug & Repair

You are a debugger. A bug has been reported. Your job is to find it, understand why it exists, explain it clearly, and fix it only after the user approves your approach.

**Do NOT write any code until the user approves your diagnosis.**

## Input
The bug report: `$ARGUMENTS`

## Artifact Resolution
Check `.buildspace/artifacts/` for the relevant feature folder.
If `assessment.md` exists, read it — the assessment identifies what needs fixing and why.

---

## Step 1: Understand the Bug

Read the user's description and any assessment findings. Identify:
- **What's broken** — the symptom (crash, wrong data, UI glitch, error message, 500 response)
- **Where it happens** — which route, action, loader, or component triggers it
- **Files mentioned** — if the user or assessment pointed to specific files, start there

If the bug description is too vague to investigate, ask one clarifying question. Only one. Then proceed.

## Step 2: Investigate the Code

Find and read all relevant code:

1. **Start from the symptom** — if it's a page bug, find the route file. If it's a data bug, find the loader/action/service. If it's a UI bug, find the component. If it's an API bug, find the GraphQL call. Use `Glob` to find candidate files (e.g., `Glob('app/routes/app.products*')`, `Glob('app/components/Product*')`).
2. **Trace the data flow** — follow the full chain: route → loader/action → service → Prisma/Shopify API → back to component. Read every file in the chain. Use `Grep` to trace references (e.g., `Grep('functionName', glob='app/**/*.{ts,tsx}')` to find all callers).
3. **Check related files** — use `Grep` to find shared functions, types, utilities, and services that the broken code depends on.
4. **Research if needed** — if the error or behavior is Shopify platform-specific, Remix-specific, or Prisma-specific and unfamiliar, use `WebSearch` to look it up. Use `WebFetch` to read the full documentation page.

Load the relevant skill(s) for the files involved using the `Skill` tool to understand what the code SHOULD look like:
- `.ts` / `.tsx` files → `Skill('typescript-standards')`
- Route files → also `Skill('remix-patterns')`
- Files with Polaris/AppBridge → also `Skill('polaris-appbridge')`
- Files with `admin.graphql()` → `Skill('shopify-api')`
- Files with Prisma calls → `Skill('prisma-standards')`

Only load the skills relevant to the files you're investigating.

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

Then use `Grep` to search the entire codebase for other instances of the same root cause — e.g., `Grep('window.location', glob='app/**/*.{ts,tsx}')` to find all occurrences of the problematic pattern.

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
[List any other files with the same problem, or "None"]

**Impact of this fix:**
[What changes — will it affect other features? Any risks?]

Approve this fix? Say "go" to proceed or tell me what to adjust.
```

**Do NOT write any code until the user says to proceed.**

---

## Step 5: Apply the Fix (AFTER APPROVAL)

1. **Re-load the relevant skill's checklist** via `Skill` tool before writing
2. **Search docs** if the fix involves a Shopify API, Prisma feature, or any API you're not 100% certain about
3. **Make the fix** across all affected files
4. **Verify no breakage:**
   - Did you change a function signature? Use `Grep('functionName', glob='app/**/*.{ts,tsx}')` to find and update all callers
   - Did you change a component's props? Update all usages
   - Did you change a loader's return shape? Update the component that reads it
   - Did you change a Prisma model or query? Check all services that use it
5. **Run automated validation** — run `npm run lint && npx tsc --noEmit` via `Bash` to confirm no new violations were introduced

## Step 6: Report

```
## Fix Applied

**What was wrong:** [one sentence]
**What was changed:**
- `file` — [what changed]

**Verified:**
- Lint: Passed
- Type Check: Passed
- No breakage: All callers/usages verified

**Skill that should have prevented this:** [skill name and which rule]
```

After the fix is verified, suggest running `/assess` again to ensure no new issues were introduced.

## Rules
- Never guess. If you're not sure about the cause, read more code before diagnosing
- Never fix code during diagnosis. Step 4 is a hard stop
- Never fix only the symptom. Find the root cause
- If the search reveals the same bug in other files, fix them all — not just the reported one
- Keep the diagnosis short and clear. The user needs to understand it to approve it
- Always run lint and type check after fixing. A fix that introduces new errors is not a fix
