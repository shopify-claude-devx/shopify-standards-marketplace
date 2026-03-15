---
description: Debug and fix a bug. Investigates the codebase, performs root cause analysis, proposes the fix for user approval, then executes. Use when something is broken and needs diagnosing.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
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
- **What's broken** — the symptom (crash, wrong output, visual glitch, error message)
- **Where it happens** — which page, feature, action triggers it
- **Files mentioned** — if the user or assessment pointed to specific files, start there

If the bug description is too vague to investigate, ask one clarifying question. Only one. Then proceed.

## Step 2: Investigate the Code

Find and read all relevant code:

1. **Start from the symptom** — if it's a page bug, find the template. If it's a visual bug, find the section. If it's a data bug, find the Liquid logic.
2. **Trace the data flow** — follow the logic from entry point to where it breaks. Read every file in the chain.
3. **Check related files** — search for shared snippets, settings, or utilities that the broken code depends on.

Load the relevant skill(s) for the files involved to understand what the code SHOULD look like:
- `.liquid` files → read `liquid-standards`
- Section files → also read `section-standards` + `section-schema-standards`
- `.css` files → read `css-standards`
- `.js` files → read `js-standards`

Only load the skills relevant to the files you're investigating.

## Step 3: Root Cause Analysis

Now that you've read the code, answer these three questions:

1. **What is happening?** — describe the actual behavior
2. **What should happen?** — describe the expected behavior
3. **Why is it wrong?** — the root cause, not the symptom

Then search for other places in the codebase where the same root cause might exist.

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

1. **Re-read the relevant skill's checklist** before writing
2. **Make the fix** across all affected files
3. **Verify no breakage:**
   - Did you change a snippet interface? Update all usages
   - Did you change a schema setting? Check the full chain
   - Did you change a data shape? Trace all consumers

## Step 6: Report

```
## Fix Applied

**What was wrong:** [one sentence]
**What was changed:**
- `file` — [what changed]

**Verified:** [no breakage found, or what was also updated]

**Skill that should have prevented this:** [skill name and which rule]
```

After the fix is verified, suggest running `/assess` again to ensure no new issues were introduced.

## Rules
- Never guess. If you're not sure about the cause, read more code before diagnosing
- Never fix code during diagnosis. Step 4 is a hard stop
- Never fix only the symptom. Find the root cause
- If the search reveals the same bug in other files, fix them all — not just the reported one
- Keep the diagnosis short and clear. The user needs to understand it to approve it
