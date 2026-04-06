---
name: test
description: >
  Validate built features — requirements coverage, edge cases, integration,
  and automated checks. Works after /execute (pipeline) or standalone on
  existing code. Dispatches output-validator agent for thorough review.
disable-model-invocation: true
model: sonnet
context: fork
agent: general-purpose
allowed-tools: Read, Write, Grep, Glob, Agent, Bash
---

# Test — Output Validation

You are entering the Test phase. Your job is to validate that the built code works correctly and meets requirements. Do not fix anything — only identify issues.

## Input
Context or overrides: `$ARGUMENTS`

## Mode Detection

### Pipeline Mode (after /execute)

Check `.buildspace/artifacts/` for feature folders containing `execution-log.md`.
If found, read from `.buildspace/artifacts/{feature}/`:
- `clarify.md` — requirements to validate against
- `plan.md` — test cases
- `execution-log.md` — files created/modified

### Standalone Mode

If no `execution-log.md` found:
1. Ask the user what to test (feature name, file paths, description)
2. Use `Glob` and `Grep` to find the relevant files
3. Skip requirements validation (no requirements document)

---

## Step 1 — Automated Checks

### Lint & Type Check
```bash
npm run lint && npx tsc --noEmit
```
If errors found, include them in the report.

### Integration Checks
- Auth present in all routes: `Grep('authenticate.admin', glob='app/routes/**/*.{ts,tsx}')`
- New routes accessible: Check route file exists and exports loader/action as needed
- Prisma schema consistent: Check if migration is needed
- Components properly imported: `Grep` for import references

---

## Step 2 — Functional Validation

Dispatch the **output-validator** agent:

> **Mission: Output Validation**
>
> Read the requirements at: `.buildspace/artifacts/{feature-name}/clarify.md`
> Read the plan at: `.buildspace/artifacts/{feature-name}/plan.md`
> Read the execution log at: `.buildspace/artifacts/{feature-name}/execution-log.md`
>
> The plan contains a **Test Cases** section with specific verification criteria. Run through every test case.
>
> Check:
> 1. Go through each test case in the plan's Test Cases section. For each one, read the relevant code and verify whether it passes or fails.
> 2. Are ALL requirements from the requirements document implemented? List each requirement and whether it's met.
> 3. Are there any edge cases not covered by the test cases that you can identify?
> 4. Does the implementation actually achieve the stated goal?
>
> Return a structured report: each test case with pass/fail status, then requirements check, then any additional findings.

---

## Step 3 — Generate Report

Write the test report to `.buildspace/artifacts/{feature-name}/test-report.md`.

Read the template structure from `${CLAUDE_SKILL_DIR}/templates/test-report-template.md` and fill it in with the validation results.

Tell the user:
- Where the report was saved
- Overall status (All Pass / Failures Found)
- Count of issues if any

**Do NOT output the full report in conversation. The artifact file is the source of truth.**

### Next Step
If all tests pass:
```
→ Run /code-review for code quality assessment.
  Remaining: /code-review → /capture
```
If issues found:
```
→ Run /fix to resolve issues, then re-run /test.
```

---

## Rules
- Never fix issues during testing — only identify them
- Always test against PROJECT requirements (from clarify.md), not generic expectations
- Be honest — if the code works, say so. Don't invent issues
- Critical issues are things that will break functionality
