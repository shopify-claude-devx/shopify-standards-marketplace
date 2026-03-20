---
description: Assess what was built — validates output against requirements and reviews code quality. Use after /build to ensure correctness and code standards. Dispatches specialized subagents for thorough review.
allowed-tools: Read, Write, Grep, Glob, Agent, Bash
---

# Assess — Output Validation & Code Review

You are entering the Assess phase. Your job is to thoroughly validate what was built — both that it works correctly AND that the code meets project standards. Do not fix anything yet. Only identify issues.

## Input
Context or overrides: `$ARGUMENTS`

## Artifact Resolution
1. Look in `.buildspace/artifacts/` for feature folders containing `execution-log.md`
2. If one folder exists → use it
3. If multiple folders exist → ask the user which feature to assess
4. If no execution-log.md found → ask the user what files or features to assess

Read from `.buildspace/artifacts/{feature-name}/`:
- `task-spec.md` — the requirements to validate against
- `plan.md` — the approach that was planned
- `execution-log.md` — what was built and which files were created/modified

## Assessment Process

### Pre-Assessment: Automated Checks
Before dispatching agents, run automated validation:
- If `shopify theme check` is available, run it via `Bash`: `shopify theme check --path . --fail-level error` to catch linting violations
- Use `Grep` to verify basic integration — e.g., `Grep('section-name', glob='templates/*.json')` to confirm new sections are registered in templates

Include any automated check results in the context passed to both agents below.

### Assessment 1: Output Validation
Use the Agent tool to dispatch the **output-validator** agent:

> **Mission: Output Validation**
>
> Read the task spec at: `.buildspace/artifacts/{feature-name}/task-spec.md`
> Read the plan at: `.buildspace/artifacts/{feature-name}/plan.md`
> Read the execution log at: `.buildspace/artifacts/{feature-name}/execution-log.md`
>
> The plan contains a **Test Cases** section with specific verification criteria. Run through every test case.
>
> Check:
> 1. Go through each test case in the plan's Test Cases section. For each one, read the relevant code and verify whether it passes or fails.
> 2. Are ALL requirements from the task spec implemented? List each requirement and whether it's met.
> 3. Are there any edge cases not covered by the test cases that you can identify?
> 4. Does the implementation actually achieve the stated goal?
>
> Return a structured report: each test case with pass/fail status, then requirements check, then any additional findings.

### Assessment 2: Code Review
Use the Agent tool to dispatch the **code-reviewer** agent:

> **Mission: Code Review**
>
> Read the execution log at: `.buildspace/artifacts/{feature-name}/execution-log.md`
>
> Review the files listed in the execution log against project coding standards.
> For each file, load the relevant skill to know what standards apply:
> - `.liquid` files → read `liquid-standards` skill
> - Section `.liquid` files → also read `section-standards` + `section-schema-standards` skills
> - `.css` files → read `css-standards` skill
> - `.js` files → read `js-standards` skill
> - If built from Figma → also read `figma-to-code` skill
>
> Use the checklist at the bottom of each skill file for validation.
>
> Review for:
> 1. **Standards Compliance** — Does every file follow the relevant skill's rules and checklist?
> 2. **Readability** — Can another developer understand this code easily?
> 3. **Maintainability** — Is this easy to modify later? No tight coupling, no magic values?
> 4. **Reusability** — Are there patterns that could be extracted? Or existing patterns that should have been reused?
>
> For each issue found, report: file, location, what's wrong, which standard it violates, severity (Critical / Should Fix / Nice to Have).

### Compile Assessment Report
After both agents return, compile the results and write to `.buildspace/artifacts/{feature-name}/assessment.md`:

```markdown
# Assessment: {Feature Name}

## Output Validation
**Status:** [All Tests Pass / Failures Found]

**Test Cases (from plan):**
- [ ] [Test case] — Pass / Fail [reason if fail]
- [ ] [Test case] — Pass / Fail [reason if fail]

**Requirements Check:**
- [Requirement] — Met / Partially met / Not implemented

**Additional Issues:**
- [Anything not covered by test cases, or "None found"]

---

## Code Review
**Status:** [Passes Standards / Issues Found]

**Critical Issues (must fix):**
- [Issue with file, location, standard violated, and impact]

**Should Fix:**
- [Issue with file, location, and impact]

**Nice to Have:**
- [Suggestion with explanation]

---

## Verdict
[One of:]
- **Ready** — All requirements met, code passes standards. Run `/capture` to extract learnings.
- **Needs Work** — Issues found. Run `/fix` to address them, then `/assess` again.
- **Needs Rework** — Significant issues. Run `/plan` again if approach needs changing, or `/build` if just implementation issues.
```

Write the assessment to the artifact file first. Then tell the user:
- Where the assessment was saved
- The **Verdict** only (Ready / Needs Work / Needs Rework)
- If issues were found, a one-line count (e.g., "2 critical, 1 should fix")
- Ask them to review the full assessment at `.buildspace/artifacts/{feature-name}/assessment.md`

Do NOT output the full assessment report in the conversation. The artifact file is the source of truth.

## Rules
- Never fix issues during assessment — only identify them
- Always assess against PROJECT standards (skills), not generic best practices
- Be honest — if the code is good, say so. Don't invent issues
- Separate output correctness from code quality — they're different concerns
- Critical issues are things that will break functionality or violate core standards
- "Nice to have" should genuinely be optional, not stealth requirements
