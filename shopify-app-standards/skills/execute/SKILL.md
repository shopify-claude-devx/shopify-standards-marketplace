---
name: execute
description: >
  Execute a plan by building all files in-context. Reads the plan,
  loads relevant standards, and builds everything with full visibility
  across files. Use after /plan when the execution plan is confirmed.
disable-model-invocation: true
allowed-tools: Read Write Edit Bash Glob Grep Skill WebSearch WebFetch
---

# Execute — Build the Feature

You are the builder. Your job is to read the plan and build every file yourself, in order, with full context of what you've already created. You build directly — no agent dispatch, no isolated contexts.

## Input
Context or overrides: `$ARGUMENTS`

## Artifact Resolution
1. Read `.buildspace/current-feature` for the active feature name
2. If the file doesn't exist, look in `.buildspace/artifacts/` for feature folders containing `plan.md`
3. If one folder exists → use it
4. If multiple folders exist → ask the user which feature to build
5. If no plan.md found → ask the user to run `/plan` first

Read `.buildspace/artifacts/{feature-name}/plan.md` as your primary input.

---

## Build Process

### Step 1: Parse the Plan
Read `plan.md` and extract:
- The list of TODOs in order
- The files to create/modify per TODO
- Which standards apply per TODO
- Dependencies between TODOs
- Key context from the Approach and Risks sections

### Step 2: Load Standards
For each TODO group, read the relevant standard skill's checklist BEFORE building:

| File Type | Read These Checklists |
|---|---|
| Any `.ts` / `.tsx` file | `typescript-standards/checklist/rules-and-checklist.md` |
| Route file (`app/routes/**`) | + `react-router-patterns/checklist/rules-and-checklist.md` |
| Route with UI components | + `polaris-web-components/checklist/rules-and-checklist.md` |
| Code with `admin.graphql()` | + `shopify-api/checklist/rules-and-checklist.md` |
| Prisma schema or `.server.ts` with DB | + `prisma-standards/checklist/rules-and-checklist.md` |

Read the checklist files from the skill directories within this plugin. You have access to them via Glob and Read.

### Step 3: Build TODO by TODO

For each TODO in order:

1. **Read existing files** that will be modified — understand what's there before changing it
2. **Search docs if needed** — if the TODO involves a Shopify API, Prisma feature, or React Router pattern you're not 100% certain about, use `WebSearch` and `WebFetch` to verify. Don't rely on training data for API-specific details.
3. **Build all files in the TODO group** — you have full visibility into everything you've already created. Use the actual exports, types, and function signatures from previous files — don't guess.
4. **Validate against checklists** — after building each file, mentally check every item in the relevant checklist. Fix violations before moving on.
5. **Record what you built** — keep a running list of files created/modified and any deviations from the plan.

**You build in the main context.** This means:
- You can see every file you've already created
- You can reference actual exports and types from files you just wrote
- Import paths and function signatures will be consistent across files
- If you realize the plan needs adjustment mid-build, note the deviation

### Step 4: Post-Build Validation

After all TODOs are complete:

1. **Run type check and lint:**
   ```bash
   npx tsc --noEmit 2>&1 | head -50
   ```
   ```bash
   npm run lint 2>&1 | head -50
   ```

2. **Fix any errors** — these are YOUR errors from code YOU just wrote. Fix them directly.

3. **Verify integration** — use `Grep` to confirm:
   - New routes exist and follow naming conventions
   - New models/services are properly imported where used
   - All imports resolve to actual files
   - `authenticate.admin(request)` present in all app routes

### Step 5: Write Execution Log

Write the execution log to `.buildspace/artifacts/{feature-name}/execution-log.md`.

Read the template from `${CLAUDE_SKILL_DIR}/templates/execution-log-template.md` and fill it in with results.

### Step 6: Report to User

Tell the user:
- Where the execution log was saved
- Count of files created/modified
- Whether lint and type check passed
- Any deviations from the plan and why

**Do NOT output file contents in conversation. The code files and execution log are the source of truth.**

### Next Step
Tell the user:
```
→ Run /validate to verify the build meets requirements.
  Pipeline: /validate
```

**Context tip:** If your conversation is getting long, you can `/clear` before the next step — it reads from artifacts, not conversation history.

---

## Rules
- You build directly — do NOT dispatch builder agents
- Follow the plan's TODO order — dependencies matter
- If the plan is ambiguous about something, make the best decision and note it as a deviation
- If a TODO requires an API or pattern you're not certain about, search docs BEFORE writing code
- Every file must pass its relevant checklist before you move on
- Run `tsc --noEmit` ONCE at the end, not per file
- If lint/type errors exist after building, fix them before reporting
- Never skip a TODO — every TODO gets built
