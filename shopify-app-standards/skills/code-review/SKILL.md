---
name: code-review
description: >
  Review code quality against project standards — compliance with TypeScript,
  Remix, Prisma, Shopify API, and Polaris standards. Dispatches code-reviewer
  agent for thorough review. Use after /test or standalone.
disable-model-invocation: true
model: sonnet
context: fork
agent: general-purpose
allowed-tools: Read, Write, Grep, Glob, Agent
---

# Code Review — Standards Compliance

You are entering the Code Review phase. Your job is to review code quality against project standards. Do not fix anything — only identify issues.

## Input
Context or overrides: `$ARGUMENTS`

## Mode Detection

### Pipeline Mode (after /test)

Check `.buildspace/artifacts/` for feature folders containing `execution-log.md`.
If found, read `.buildspace/artifacts/{feature-name}/execution-log.md` for the list of files to review.

### Standalone Mode

If no `execution-log.md` found:
1. Ask the user what to review (file paths, feature name, or recent changes)
2. Use `Glob` and `Grep` to find the relevant files

---

## Step 1 — Dispatch Code Reviewer

Use the Agent tool to dispatch the **code-reviewer** agent:

> **Mission: Code Review**
>
> Read the execution log at: `.buildspace/artifacts/{feature-name}/execution-log.md`
>
> Review the files listed in the execution log against project coding standards.
> For each file, the relevant skills are pre-loaded. Use the checklist in each skill's `checklist/rules-and-checklist.md` for validation:
> - `.ts` / `.tsx` files → `typescript-standards` checklist
> - Route files (`app/routes/**`) → also `remix-patterns` checklist
> - Files with Polaris/AppBridge → also `polaris-appbridge` checklist
> - Files with `admin.graphql()` → also `shopify-api` checklist
> - Files with Prisma calls → also `prisma-standards` checklist
>
> Review for:
> 1. **Standards Compliance** — Does every file follow the relevant skill's rules and checklist?
> 2. **Readability** — Can another developer understand this code easily?
> 3. **Maintainability** — Is this easy to modify later? No tight coupling, no magic values?
> 4. **Reusability** — Are there patterns that could be extracted? Or existing patterns that should have been reused?
>
> For each issue found, report: file, location, what's wrong, which standard it violates, severity (Critical / Should Fix / Nice to Have).

---

## Step 2 — Generate Report

Write the code review report to `.buildspace/artifacts/{feature-name}/code-review-report.md`.

Read the template structure from `${CLAUDE_SKILL_DIR}/templates/code-review-report-template.md` and fill it in with the review results.

Tell the user:
- Where the report was saved
- Overall status (Passes Standards / Issues Found)
- Count of issues by severity

**Do NOT output the full report in conversation. The artifact file is the source of truth.**

### Next Step
If code passes standards:
```
→ Run /capture to extract learnings from this task.
```
If issues found:
```
→ Run /fix to resolve issues, then re-run /code-review.
```

---

## Rules
- Never fix issues during review — only identify them
- Always review against PROJECT standards (skills), not generic best practices
- Be honest — if the code is good, say so. Don't invent issues
- Separate severity levels: Critical (must fix) vs Should Fix vs Nice to Have
- "Nice to have" should genuinely be optional, not stealth requirements
