---
name: plan
description: >
  Create a detailed execution plan for a task. Use after /clarify when
  requirements are confirmed. Researches codebase, references project skills,
  and produces a step-by-step TODO plan.
disable-model-invocation: true
allowed-tools: Read Write Grep Glob Agent WebSearch WebFetch
---

# Plan — Execution Planning

You are entering the Plan phase. Your job is to create a detailed, directionally correct execution plan. Do not write code yet. Plan thoroughly so that building becomes straightforward execution.

## Input
The task to plan: `$ARGUMENTS`

## Artifact Resolution
1. Read `.buildspace/current-feature` for the active feature name
2. If the file doesn't exist, look in `.buildspace/artifacts/` for feature folders containing `clarify.md`
3. If one folder exists → use it and write the feature name to `.buildspace/current-feature`
4. If multiple folders exist → ask the user which feature to plan
5. If no clarify.md found → ask the user to run `/clarify` first

Read `.buildspace/artifacts/{feature-name}/clarify.md` as your primary input.

## Process

### Step 1: Read Project Context
1. Read `CLAUDE.md` if it exists for project overview
2. Read `.claude/patterns-learned.md` if it exists — it contains project-specific learnings from previous tasks

Do NOT read skill files during planning. Skills are loaded contextually during execution. Planning only needs project context and codebase analysis.

### Step 2: Research the Codebase
Use the Agent tool to dispatch the **codebase-analyzer** agent:

> **Mission: Codebase Analysis**
>
> Analyze the codebase to understand how to implement: [task description from clarify.md]
>
> Find:
> 1. Existing files that will need to be modified or that relate to this task
> 2. Existing patterns in the codebase that this task should follow (route structure, component patterns, service layer, Prisma queries)
> 3. Any dependencies, imports, or utilities already available that should be reused
> 4. Potential conflicts or areas that might break
>
> Return a structured analysis following your report format.

### Step 3: Assess Knowledge Gaps
If the feature involves Shopify APIs, React Router patterns, or Prisma features you're not 100% certain about, use `WebSearch` and `WebFetch` to research:
- Search `shopify.dev` for API details
- Search `reactrouter.com/docs` for routing or data patterns
- Search `prisma.io/docs` for schema or query patterns
- Search `shopify.dev/docs/api/app-home/polaris-web-components` for component usage

### Step 4: Draft the Execution Plan
Based on the requirements, codebase analysis, and any research, create the plan.

**The plan must define TODOs as logical groups, not individual files.** Group related files that depend on each other:

Example grouping:
- **TODO 1: Database layer** — Prisma schema changes + migration + service file
- **TODO 2: API route** — Route file with loader/action + GraphQL queries
- **TODO 3: UI page** — Route component with Polaris Web Components

Each TODO group should contain:
- Files to create or modify (with full paths)
- What each file should do
- Which standards apply (typescript-standards, react-router-patterns, shopify-api, prisma-standards, polaris-web-components)
- Dependencies on other TODOs
- Key decisions and WHY

Read the template structure from `${CLAUDE_SKILL_DIR}/templates/plan-template.md` and fill it in.

### Step 5: Validate the Plan
Before presenting, self-check:
- Are the TODOs in dependency order?
- Is every file accounted for?
- Does every TODO specify which standards apply?
- Is this plan specific enough that building is just execution?
- Are there any assumptions that need the user's input?

### Step 6: Save and Present
Write the plan to `.buildspace/artifacts/{feature-name}/plan.md`.

Then tell the user:
- Where the plan was saved
- A brief summary of the approach
- Ask for confirmation or adjustments before proceeding to `/execute`

**Do NOT output the full plan in conversation. The artifact file is the source of truth.**

### Next Step
Once the user confirms the plan, tell them:
```
→ Run /execute to build the feature.
  Pipeline: /execute → /assess
```

**Context tip:** If your conversation is getting long, you can `/clear` before running `/execute` — it reads from artifacts, not conversation history.

## Rules
- Never write implementation code during planning — pseudocode or brief snippets for clarity are acceptable
- Every TODO must reference which standards apply
- Every TODO must be actionable and specific — "implement the feature" is not a TODO
- Group related files into logical TODOs — don't plan one-file-per-TODO
- If you find the existing codebase contradicts best practices, flag it to the user
- If the task is too large, suggest breaking it into smaller plans
- Include the WHY behind approach decisions, not just the WHAT
- Do NOT read skill files during planning — they're loaded contextually during execution
