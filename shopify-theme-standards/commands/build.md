---
description: Execute a plan by building TODO by TODO. Use after /plan when the execution plan is confirmed. Loads relevant skills per file and follows them precisely.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Skill
disable-model-invocation: true
---

# Build — Plan Execution

You are entering the Build phase. Your job is to execute the confirmed plan, TODO by TODO. Building is disciplined execution, not creative improvisation.

## Input
Context or overrides: `$ARGUMENTS`

## Artifact Resolution
1. Look in `.buildspace/artifacts/` for feature folders containing `plan.md`
2. If one folder exists → use it
3. If multiple folders exist → ask the user which feature to build
4. If no plan.md found → ask the user to run `/plan` first

Read `.buildspace/artifacts/{feature-name}/plan.md` as your primary input.

## Build Process

### Execute TODO by TODO
Work through the plan's TODOs in order. For each TODO:

1. **State what you're about to do** — one line announcing the current TODO

2. **Load the relevant skill(s) for this TODO's files** using the `Skill` tool. Only load what this TODO needs — not all skills:
   - Writing a `.liquid` file? → `Skill('liquid-standards')`
   - Writing a section `.liquid` file? → `Skill('section-standards')` + `Skill('section-schema-standards')` + `Skill('liquid-standards')`
   - Writing a `.css` file? → `Skill('css-standards')`
   - Writing a `.js` file? → `Skill('js-standards')`
   - Creating new files or organizing code? → `Skill('theme-architecture')`
   - Building from a Figma design? → `Skill('figma-to-code')` (in addition to the above)

   **Load skill(s) before writing any code for this TODO. If a skill cannot be loaded, STOP and tell the user.**

3. **Check for conflicts** — before creating a new file, use `Glob` to check for naming conflicts (e.g., `Glob('sections/hero-banner*')` to see if a similarly-named section exists). Use `Grep` to check if patterns you're about to create already exist elsewhere in the theme.

4. **Write the code** — following the plan's approach and the loaded skill's standards

5. **Per-file validation** — run the loaded skill's checklist (found at the bottom of each skill file) against EACH file you just wrote.

   **If ANY file fails a checklist item, fix it NOW before moving to the next TODO.**

6. **Move to the next TODO**

### If You Encounter a Problem During Building

**Minor (doesn't change the approach):**
Solve it inline, note what you did and why. Continue building.

**Medium (changes a TODO but not the overall approach):**
Pause, explain the issue to the user, propose the adjustment, get confirmation, then continue.

**Major (invalidates the plan's approach):**
Stop building. Explain what you found and why the plan needs revision. Suggest the user run `/plan` again with this new information.

## Code Quality During Build

While building, always:

- **Follow the loaded skills** — not generic best practices, YOUR project's conventions
- **Write code as if someone else will maintain it** — clear naming, logical structure
- **Reuse existing patterns** — if the codebase already has a way of doing something, follow it
- **Don't over-engineer** — build exactly what the plan calls for, nothing more
- **Don't leave TODOs in code** — if something needs future work, note it separately

## Post-Build

After completing all TODOs:

1. **Run automated validation** — if `shopify theme check` is available, run it via `Bash` to catch linting violations: `shopify theme check --path . --fail-level error`. Fix any errors before proceeding.
2. **Validate schema JSON** — for any section with a `{% schema %}` block, validate the JSON is well-formed via `Bash`: `node -e "JSON.parse(require('fs').readFileSync('path/to/file'))"` or equivalent.

Then write the execution log to `.buildspace/artifacts/{feature-name}/execution-log.md`:

```markdown
# Execution Log: {Feature Name}

**TODOs Completed:** [X/X]

**Files Created/Modified:**
- `path/to/file` — [what was done]

**Per-File Validation:** [All passed / Issues found and fixed during build]

**Deviations from Plan:**
- [What changed and why, or "None"]
```

Present the summary and suggest running `/assess`.

## Rules
- Never deviate from the plan's approach without user approval
- Never add features or enhancements not in the plan
- Load only the skills relevant to the current TODO's files
- Always validate each file against the skill's checklist before moving to the next TODO
- If a TODO is unclear, ask — don't guess
- Build incrementally — complete one TODO fully before starting the next
