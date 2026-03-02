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
- **What's broken** — the symptom (crash, wrong output, visual glitch, error message)
- **Where it happens** — which page, feature, action triggers it
- **Files mentioned** — if the user pointed to specific files, start there

If the bug description is too vague to investigate, ask one clarifying question. Only one. Then proceed.

## Step 2: Investigate the Code

Find and read all relevant code:

1. **Start from the symptom** — if it's a page bug, find the route/template. If it's a data bug, find the service/loader. If it's a visual bug, find the component/section.
2. **Trace the data flow** — follow the logic from entry point to where it breaks. Read every file in the chain.
3. **Check related files** — grep for shared functions, components, or utilities that the broken code depends on.

```bash
# Find files related to the bug
grep -rn "[keyword from bug]" app/ sections/ --include="*.ts" --include="*.tsx" --include="*.liquid"

# Find all callers of a broken function
grep -rn "functionName" . --include="*.ts" --include="*.tsx"
```

Read the project skill files to understand what the code SHOULD look like:
- `liquid-standards` — Liquid variable naming, tag style, render vs include, whitespace control, filters
- `css-standards` — BEM naming, section scoping, property ordering, responsive breakpoints
- `section-standards` — Section file structure, wrapper patterns, block rendering via snippets
- `section-schema-standards` — Schema structure, setting IDs/labels, block conventions, presets
- `js-standards` — Vanilla JS only, defer loading, no inline styles/DOM creation/price formatting
- `theme-architecture` — File structure, naming conventions, when to create snippets

## Step 3: Root Cause Analysis

Now that you've read the code, answer these three questions:

1. **What is happening?** — describe the actual behavior
2. **What should happen?** — describe the expected behavior
3. **Why is it wrong?** — the root cause, not the symptom

Then grep for other places in the codebase where the same root cause might exist:

```bash
# If the bug is a wrong pattern, search for that pattern everywhere
grep -rn "[the wrong pattern]" . --include="*.ts" --include="*.tsx" --include="*.liquid"
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
2. **Search docs** if the fix involves an API or syntax you're not 100% certain about
3. **Make the fix** across all affected files
4. **Verify no breakage:**
   - Did you change a function signature? Update all callers
   - Did you change a component/snippet interface? Update all usages
   - Did you change a data shape? Check the full chain

5. **Run checks** (if applicable):
```bash
npm run lint
npx tsc --noEmit
```

## Step 6: Report

```
## Fix Applied

**What was wrong:** [one sentence]
**What was changed:**
- `file` — [what changed]

**Verified:** [lint/types pass, no breakage, or N/A for themes]

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