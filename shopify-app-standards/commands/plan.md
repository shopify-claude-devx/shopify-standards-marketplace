---
description: Create a detailed execution plan for a task. Use after /clarify when requirements are confirmed. Researches codebase, references project skills, and produces a step-by-step TODO plan.
allowed-tools: Read, Write, Grep, Glob, Agent, WebSearch, WebFetch
---

# Plan — Execution Planning

You are entering the Plan phase. Your job is to create a detailed, directionally correct execution plan. Do not write code yet. Plan thoroughly so that building becomes straightforward execution.

## Input
The task to plan: `$ARGUMENTS`

## Artifact Resolution
1. Look in `.buildspace/artifacts/` for feature folders containing `task-spec.md`
2. If one folder exists → use it
3. If multiple folders exist → ask the user which feature to plan
4. If no task-spec.md found → ask the user to run `/clarify` first

Read `.buildspace/artifacts/{feature-name}/task-spec.md` as your primary input.

## Process

### Step 1: Read Project Context
1. Read `CLAUDE.md` if it exists for project overview
2. Read `.claude/patterns-learned.md` if it exists — it contains project-specific learnings from previous tasks that may inform your plan

Do NOT read skill files during planning. Skills are loaded per-file during the build phase via the `Skill` tool. Planning only needs project context and codebase analysis.

### Step 2: Research the Codebase
Use the Agent tool to dispatch the **codebase-analyzer** agent:

> **Mission: Codebase Analysis**
>
> Analyze the codebase to understand how to implement: [task description from task-spec.md]
>
> Find:
> 1. Existing files that will need to be modified or that relate to this task
> 2. Existing patterns in the codebase that this task should follow (route structure, component patterns, service layer, Prisma queries)
> 3. Any dependencies, imports, or utilities already available that should be reused
> 4. Potential conflicts or areas that might break
>
> Return a structured analysis following your report format.

### Step 3: Assess Knowledge Gaps
If the feature involves Shopify APIs, Remix patterns, or Prisma features you're not 100% certain about, use `WebSearch` and `WebFetch` to research:
- Search `shopify.dev` for API details
- Search `remix.run/docs` for routing or data patterns
- Search `prisma.io/docs` for schema or query patterns
- Search `polaris.shopify.com` for component usage

### Step 4: Draft the Execution Plan
Based on the Task Spec, codebase analysis, and any research, create the plan:

```markdown
## Execution Plan

**Task:** [One-line summary]
**Estimated Complexity:** [Low / Medium / High]

### Approach
[2-3 sentences explaining the overall approach and WHY this approach was chosen over alternatives. Reference specific existing codebase patterns that informed this decision.]

### Files to Create/Modify
- `path/to/file.tsx` — [what changes and why]
- `prisma/schema.prisma` — [what changes and why]

### TODO Steps
Each TODO must be specific enough to execute without ambiguity.

- [ ] **TODO 1:** [Specific action]
  - Details: [What exactly to do]
  - Skills: [Which skill standards apply — e.g., typescript-standards, remix-patterns]

- [ ] **TODO 2:** [Specific action]
  - Details: [What exactly to do]
  - Skills: [Which skill standards apply]

[Continue for all steps...]

### Risks & Considerations
- [Anything that could go wrong or needs careful attention]

### Test Cases
- [Specific verification criteria to check after building]
- [Edge case to verify]
- [Integration check]
```

### Step 5: Validate the Plan
Before presenting, self-check:
- Does every TODO reference which skill standards apply?
- Are the steps in the right order (dependencies handled)?
- Is anything missing between current state and desired state?
- Is this plan specific enough that building is just execution?

### Step 6: Save and Present
Write the plan to `.buildspace/artifacts/{feature-name}/plan.md`.

Then tell the user:
- Where the plan was saved
- A brief summary of the approach
- Ask for confirmation or adjustments before proceeding to `/build`

Do NOT output the full plan in the conversation. The artifact file is the source of truth. Present only the approach summary and ask for confirmation.

## Rules
- Never write implementation code during planning — pseudocode or brief snippets for clarity are acceptable
- Every TODO must reference which skill standards apply
- Every TODO must be actionable and specific — "implement the feature" is not a TODO
- If you find the existing codebase contradicts best practices, flag it to the user
- If the task is too large, suggest breaking it into smaller plans
- Include the WHY behind approach decisions, not just the WHAT
- Do NOT read skill files during planning — they're loaded per-file during build
