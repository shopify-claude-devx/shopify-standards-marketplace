---
name: assess
description: >
  Assess built features with first-principles thinking. Checks requirements
  coverage, code quality against standards, and integration correctness.
  Reports findings and stops — no auto-fix loop. Use after /execute.
disable-model-invocation: true
allowed-tools: Read Write Grep Glob Bash
---

# Assess — First-Principles Verification

You are entering the Assess phase. Your job is to verify that what was built is correct, complete, and follows standards. Think from first principles — don't just pattern-match against checklists. Understand WHY each requirement exists and whether the implementation actually satisfies it.

**Report findings and stop. Do not fix anything. Do not loop.**

## Input
Context or overrides: `$ARGUMENTS`

## Artifact Resolution
1. Read `.buildspace/current-feature` for the active feature name
2. If the file doesn't exist, look in `.buildspace/artifacts/` for feature folders containing `execution-log.md`
3. If one folder exists → use it
4. If multiple folders exist → ask the user which feature to assess
5. If no execution-log.md found → ask the user to run `/execute` first

Read from `.buildspace/artifacts/{feature-name}/`:
- `clarify.md` — requirements to assess against
- `plan.md` — planned approach and test cases
- `execution-log.md` — files created/modified

---

## Assessment Process

### Step 1 — Automated Checks

Run lint and type check:
```bash
npx tsc --noEmit 2>&1 | head -50
```
```bash
npm run lint 2>&1 | head -50
```

If errors found, include them in the report.

### Step 2 — Requirements Assessment

Read `clarify.md` requirements one by one. For EACH requirement:

1. **Find the code** — use `Grep` and `Read` to locate where this requirement is implemented
2. **Think from first principles** — does this code actually achieve what the requirement asks? Not "does it look right" but "would this work in production?"
3. **Check edge cases** — what happens with empty data, null values, unauthorized access, network failures?
4. **Verify the chain** — trace the full flow: route → loader/action → service → database → back to UI. Is every link solid?

Report per requirement: **Met**, **Partially Met** (with what's missing), or **Not Implemented**.

### Step 3 — Standards Assessment

Read the files listed in `execution-log.md`. For each file, identify which standards apply and read the relevant checklist:

| File Type | Checklist to Read |
|---|---|
| Any `.ts` / `.tsx` | `typescript-standards/checklist/rules-and-checklist.md` |
| Route files | + `react-router-patterns/checklist/rules-and-checklist.md` |
| Route with UI | + `polaris-web-components/checklist/rules-and-checklist.md` |
| `admin.graphql()` calls | + `shopify-api/checklist/rules-and-checklist.md` |
| Prisma schema/queries | + `prisma-standards/checklist/rules-and-checklist.md` |

Read checklist files from the skill directories within this plugin.

For each checklist item: check it. If it fails, note the file, location, what's wrong, and which standard it violates.

### Step 4 — Integration Assessment

Check cross-file concerns:
- `Grep('authenticate.admin', glob='app/routes/app*.{ts,tsx}')` — auth in all app routes
- `Grep('userErrors', glob='app/**/*.{ts,tsx}')` — mutations check userErrors
- Verify new routes follow naming conventions
- Verify imports resolve to actual files
- Verify Prisma schema changes have corresponding migration
- Verify new components are imported where used

### Step 5 — First-Principles Questions

For each significant piece of code, ask yourself:
- **Would this break in an iframe?** Check for `<a>`, `window.location`, `redirect` from wrong source
- **Would this handle a real merchant's data?** Empty stores, stores with 10k products, slow connections
- **Would this survive a Shopify API version update?** Hardcoded GIDs, deprecated fields
- **Is this actually solving the user's stated goal?** Not just "does it compile" but "does it do the thing"

---

## Report

Write the assessment report to `.buildspace/artifacts/{feature-name}/assessment-report.md`.

Structure:

```markdown
# Assessment Report: {feature-name}

## Automated Checks
- **Lint:** PASS / FAIL (details)
- **Type Check:** PASS / FAIL (details)

## Requirements Coverage
For each requirement from clarify.md:
- [Requirement] — **Met** / **Partially Met** / **Not Implemented**
  [Brief explanation of how/what's missing]

## Standards Compliance
### Critical Issues (must fix)
- **File:** [path]
  **Issue:** [what's wrong]
  **Standard:** [which rule it violates]
  **Why it matters:** [impact if not fixed]

### Should Fix
- [Same format]

### Observations (optional, non-blocking)
- [Same format]

## Integration
- [Any cross-file issues found]

## Verdict
**PASS** — Ready to ship (zero critical issues, all requirements met)
**NEEDS WORK** — [count] critical issues, [count] requirements partially/not met

## If NEEDS WORK — Root Cause Summary
[For each critical issue, explain the ROOT CAUSE from first principles.
Not "line 42 has a bug" but "the authentication flow doesn't account for X because Y."
This is what /fix needs to understand to make a proper repair, not a patch.]
```

Tell the user:
- Where the report was saved
- Overall verdict
- Count of issues by severity

**Do NOT output the full report in conversation. The artifact file is the source of truth.**

### Next Step
If PASS:
```
→ Feature is ready. Review the code and test in browser.
```
If NEEDS WORK:
```
→ Run /fix with the assessment report to resolve issues.
  The report includes root cause analysis for each issue.
```

---

## Rules
- **Never fix issues during assessment** — only identify and report them
- **Think from first principles** — don't just check boxes. Ask "would this actually work?"
- **Be honest** — if the code works, say PASS. Don't invent issues. Don't soften real issues.
- **Root causes, not symptoms** — in the report, explain WHY something is wrong, not just WHAT
- **One pass only** — assess once, report, stop. No loops, no retries.
