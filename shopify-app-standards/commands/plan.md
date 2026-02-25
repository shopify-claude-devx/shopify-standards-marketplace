---
description: Create a detailed execution plan for a task. Use after /clarify when requirements are confirmed. Researches codebase, reads project skills, and produces a step-by-step TODO plan.
allowed-tools: Read, Grep, Glob, Task
---

# Plan — Execution Planning

You are entering the Plan phase. Your job is to create a detailed, directionally correct execution plan. Do not write code yet. Plan thoroughly so that building becomes straightforward execution.

## Input
The task to plan: `$ARGUMENTS`

If no Task Spec exists from a previous `/clarify` step, ask the user to run `/clarify` first or provide clear requirements before proceeding.

## Process

### Step 1: Read Project Standards — MANDATORY
Before any planning, you MUST read the following files. Do NOT skip this step:

1. Read `CLAUDE.md` for project overview
2. Read `.claude/project-context.md` if it exists for project-specific learnings
3. Read EVERY skill file listed below — these define the standards your plan MUST reference:
   - `typescript-standards` — Strict typing, naming, imports, no any/unknown, no empty blocks, pre-commit quality gate
   - `remix-patterns` — Loader/action structure, authenticate.admin first, ErrorBoundary, embedded app rules
   - `shopify-api` — GraphQL only, userErrors checking, pagination, rate limits, webhook handlers
   - `prisma-standards` — db.server.ts singleton, schema design, query patterns, error handling
   - `polaris-appbridge` — Page/Card/BlockStack layout, App Bridge Modal/Toast, embedded UI rules

**If you cannot find or read a skill file, STOP and tell the user.**

Plans that ignore project standards produce directionally wrong code. Every TODO in the plan must reference which skill standards apply.

### Step 2: Research the Codebase
Use the Task tool to dispatch an **Explore** subagent with this mission:

> Research the codebase to understand how to implement: [task description]
>
> Find:
> 1. Existing files that will need to be modified or that relate to this task
> 2. Existing patterns in the codebase that this task should follow
> 3. Any dependencies, imports, or utilities already available that should be reused
> 4. Potential conflicts or areas that might break
>
> Return a structured summary of your findings.

### Step 3: Draft the Execution Plan
Based on the Task Spec, project standards, and codebase research, create the plan:

```
## Execution Plan

**Task:** [One-line summary]
**Estimated Complexity:** [Low / Medium / High]

### Approach
[2-3 sentences explaining the overall approach and WHY this approach was chosen over alternatives. Reference specific project patterns or skill standards that informed this decision.]

### Files to Create/Modify
- `path/to/file.liquid` — [what changes and why]
- `path/to/file.css` — [what changes and why]

### TODO Steps
Each TODO must be specific enough to execute without ambiguity.

- [ ] **TODO 1:** [Specific action]
  - Details: [What exactly to do]
  - Standards: [Which skill/convention applies]

- [ ] **TODO 2:** [Specific action]
  - Details: [What exactly to do]
  - Standards: [Which skill/convention applies]

[Continue for all steps...]

### Risks & Considerations
- [Anything that could go wrong or needs careful attention]

### Validation Checks
- [How to verify each part works correctly after building]
```

### Step 4: Validate the Plan
Before presenting to the user, self-check:
- Does every TODO follow the project's skill standards?
- Are the steps in the right order (dependencies handled)?
- Is anything missing between current state and desired state?
- Is this plan specific enough that building is just execution?

### Step 5: Present and Confirm
Present the plan to the user. Wait for confirmation or adjustments before suggesting they proceed to `/build`.

## Rules
- Never write implementation code during planning — pseudocode or brief snippets for clarity are acceptable
- Always reference project skills and standards in the plan
- Every TODO must be actionable and specific — "implement the feature" is not a TODO
- If you find the existing codebase contradicts the project standards, flag it to the user
- If the task is too large, suggest breaking it into smaller plans
- Include the WHY behind approach decisions, not just the WHAT
