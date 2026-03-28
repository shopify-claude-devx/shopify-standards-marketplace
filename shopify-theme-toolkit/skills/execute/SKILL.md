---
name: execute
description: >
  Execute a plan by dispatching a builder agent per TODO. Orchestrates
  sequential file building, each in an isolated context with relevant
  standards. Use after /plan when the specification is confirmed.
disable-model-invocation: true
model: sonnet
context: fork
allowed-tools: Read, Write, Glob, Grep, Agent, Bash
---

# Execute — Orchestrated Plan Implementation

You are the Execute orchestrator. Your job is to dispatch a **builder agent per TODO** from the plan. Each builder writes exactly one file in its own isolated context with the relevant standards skill loaded. You do NOT write code yourself.

## Input
Context or overrides: `$ARGUMENTS`

## Artifact Resolution
1. Look in `.buildspace/artifacts/` for feature folders containing `plan.md`
2. If one folder exists → use it
3. If multiple folders exist → ask the user which feature to build
4. If no plan.md found → ask the user to run `/plan` first

Read `.buildspace/artifacts/{feature-name}/plan.md` as your primary input.

Also read if they exist in the same folder:
- `asset-manifest.json` — for shopify:// URLs
- `design-tokens.json` — for reference on available tokens

---

## Orchestration Process

### Step 1: Parse the Plan
Read `plan.md` and extract:
- The list of TODOs in order
- The File Spec for each TODO
- Any context from the Codebase Context section

### Step 2: Determine File Type per TODO
For each TODO, identify the file type so the builder knows which preloaded standards to apply:

| File Type | Standards to Apply |
|---|---|
| `.liquid` file | liquid-standards |
| Section `.liquid` file | section-standards + liquid-standards |
| `.css` file | css-standards |
| `.js` file | js-standards |
| Template `.json` file | theme-architecture |

### Step 3: Dispatch Builders Sequentially
For each TODO in order, dispatch the **builder** agent with a prompt containing:

1. **The File Spec** — copy the full File Spec section for this TODO from the plan
2. **File type** — tell the builder which of its preloaded standards to apply
3. **Additional context** — asset-manifest.json path and design-tokens.json path if they exist
4. **Codebase patterns** — relevant findings from the plan's Codebase Context section

Example dispatch prompt:
```
Build the following file from this File Spec.

## File Spec
[paste the File Spec for this TODO from plan.md]

## File Type
Section .liquid file — apply section-standards and liquid-standards checklists.

## Additional Context
- Asset manifest: .buildspace/artifacts/{feature-name}/asset-manifest.json
- Design tokens: .buildspace/artifacts/{feature-name}/design-tokens.json
- Codebase patterns: [relevant patterns from plan's Codebase Context]
```

**Wait for each builder to complete before dispatching the next.** TODOs may have dependencies (template JSON references section files).

### Step 4: Collect Results
After each builder returns, record:
- File path created/modified
- Whether checklist passed
- Any conflicts or issues reported

If a builder reports a conflict or ambiguity:
- **Plan vs. skill conflict:** Stop and ask the user which to follow
- **Naming conflict with existing files:** Stop and ask the user how to proceed
- **Minor issue:** Note it and continue to the next TODO

If a builder fails or produces an error, do NOT retry automatically. Report the failure to the user.

---

## Post-Build

After all builders complete:

1. **Run `shopify theme check`** if available:
   ```bash
   shopify theme check --path . --fail-level error
   ```
   Fix any errors before proceeding.

2. **Validate schema JSON** for any section with a `{% schema %}` block — confirm JSON is well-formed.

3. **Write execution log** to `.buildspace/artifacts/{feature-name}/execution-log.md`.

Read the template from `${CLAUDE_SKILL_DIR}/templates/execution-log-template.md` and fill it in with the build results from all builders.

4. **Report to user:**
   - Where the execution log was saved
   - Count of files created/modified
   - Builder results summary (all passed / issues found)
   - Suggest running `/test`

**Do NOT output file contents in conversation. The code files and execution log are the source of truth.**

**Context tip:** If your conversation is getting long, you can `/clear` before running `/test` — it reads from artifacts, not conversation history.

---

## Rules
- You are an orchestrator — do NOT write code yourself, dispatch builders
- Follow the plan's TODO order — builders run sequentially
- Pass complete File Specs to builders — do not summarize or truncate
- If a builder reports a conflict, stop and ask the user before continuing
- Never skip a TODO — every TODO gets a builder dispatch
