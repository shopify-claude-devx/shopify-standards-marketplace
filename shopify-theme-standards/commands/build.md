---
description: Execute a plan by building TODO by TODO. Use after /plan when the execution plan is confirmed. Follows project standards strictly.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Build — Plan Execution

You are entering the Build phase. Your job is to execute the confirmed plan, TODO by TODO, following project standards precisely. Building is disciplined execution, not creative improvisation.

## Input
The task or plan to build: `$ARGUMENTS`

## Pre-Build Checks

### Check 1: Does a Plan Exist?
Look for a confirmed execution plan in the current conversation. If no plan exists:

> ⚠️ No execution plan found. Building without a plan leads to directionally incorrect code.
> Please run `/plan` first to create an execution plan, then return to `/build`.

Do NOT proceed without a plan unless the user explicitly overrides this.

### Check 2: Load Project Standards
Before writing any code:
1. Read `CLAUDE.md` for project overview
2. Read ALL relevant skill files in `.claude/skills/` — these are your coding standards
3. Read `.claude/project-context.md` if it exists

Every line of code you write must align with these standards.

## Build Process

### Execute TODO by TODO
Work through the plan's TODOs in order. For each TODO:

1. **State what you're about to do** — one line announcing the current TODO
2. **Write the code** — following the plan's approach and project standards
3. **Self-check before moving on:**
   - Does this code follow the patterns defined in the project skills?
   - Does it match the plan's specified approach?
   - Will it integrate cleanly with the next TODO?
4. **Move to the next TODO**

### If You Encounter a Problem During Building
Things the plan didn't anticipate will come up. Handle them based on severity:

**Minor (doesn't change the approach):**
Solve it inline, note what you did and why. Continue building.

**Medium (changes a TODO but not the overall approach):**
Pause, explain the issue to the user, propose the adjustment, get confirmation, then continue.

**Major (invalidates the plan's approach):**
Stop building. Explain what you found and why the plan needs revision. Suggest the user run `/plan` again with this new information.

## Code Quality During Build

While building, always:

- **Follow the project skills** — not generic best practices, YOUR project's conventions
- **Write code as if someone else will maintain it** — clear naming, logical structure, helpful comments only where intent isn't obvious
- **Reuse existing patterns** — if the codebase already has a way of doing something, follow it
- **Don't over-engineer** — build exactly what the plan calls for, nothing more
- **Don't leave TODOs in code** — if something needs future work, note it separately

## Post-Build

After completing all TODOs, provide a brief summary:

```
## Build Complete

**TODOs Completed:** [X/X]

**Files Created/Modified:**
- `path/to/file` — [what was done]

**Any Deviations from Plan:**
- [What changed and why, or "None"]

**Ready for Assessment:**
Run `/assess` to validate the output and review code quality.
```

## Rules
- Never deviate from the plan's approach without user approval
- Never add features or enhancements not in the plan
- Always follow project skill standards over generic conventions
- If a TODO is unclear, ask — don't guess
- Build incrementally — complete one TODO fully before starting the next