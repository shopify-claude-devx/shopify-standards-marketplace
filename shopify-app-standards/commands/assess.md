---
description: Assess what was built — validates output against requirements and reviews code quality. Use after /build to ensure correctness and code standards. Dispatches specialized subagents for thorough review.
allowed-tools: Read, Grep, Glob, Task
---

# Assess — Output Validation & Code Review

You are entering the Assess phase. Your job is to thoroughly validate what was built — both that it works correctly AND that the code meets project standards. Do not fix anything yet. Only identify issues.

## Input
What to assess: `$ARGUMENTS`

If no context about what was built exists, ask the user what files or features to assess.

## Pre-Assessment Setup

1. Read `CLAUDE.md` for project overview
2. Read ALL skill files in `.claude/skills/` — these define the standards to assess against
3. Read `.claude/project-context.md` if it exists
4. Locate the execution plan from the conversation (if available)

## Assessment Process

### Assessment 1: Output Validation
Use the Task tool to dispatch the **output-validator** agent:

> **Mission: Output Validation**
>
> Review the recently built/modified files and validate against the task requirements.
>
> **Task Requirements:** [paste the Task Spec or plan requirements]
>
> **Files to review:** [list files that were created/modified]
>
> Check:
> 1. Are ALL requirements from the plan implemented? List each requirement and whether it's met.
> 2. Are there any missing edge cases or error states not handled?
> 3. Are there any obvious bugs or broken functionality?
> 4. Does the implementation actually achieve the stated goal?
>
> Return a structured report of findings — what passes, what fails, what's missing.

### Assessment 2: Code Review
Use the Task tool to dispatch the **code-reviewer** agent:

> **Mission: Code Review**
>
> Review the recently built/modified files against project coding standards.
>
> **Project Standards to check against:**
> [Paste relevant content from project skill files]
>
> **Files to review:** [list files that were created/modified]
>
> Review for:
> 1. **Structure** — Is the code organized following project patterns?
> 2. **Readability** — Can another developer understand this code easily?
> 3. **Maintainability** — Is this easy to modify later? No tight coupling, no magic values?
> 4. **Reusability** — Are there patterns that could be extracted? Or existing patterns that should have been reused?
> 5. **Standards Compliance** — Does every file follow the project skill standards?
>
> For each issue found, report:
> - File and location
> - What the issue is
> - Why it matters
> - Severity: Critical / Should Fix / Nice to Have
>
> Return a structured code review report.

### Compile Assessment Report
After both agents return, compile the results:

```
## Assessment Report

### Output Validation
**Status:** [All Requirements Met / Issues Found]

**Requirements Check:**
- ✅ [Requirement] — Implemented correctly
- ❌ [Requirement] — [What's wrong]

**Bugs or Missing Functionality:**
- [Issue description, or "None found"]

---

### Code Review
**Status:** [Passes Standards / Issues Found]

**Critical Issues (must fix):**
- [Issue with file, location, and impact]

**Should Fix:**
- [Issue with file, location, and impact]

**Nice to Have:**
- [Suggestion with explanation]

---

### Verdict
[One of:]
- ✅ **Ready** — All requirements met, code passes standards.
- ⚠️ **Needs Work** — Issues found. Fix them, then run `/assess` again.
- ❌ **Needs Rework** — Significant issues. Reiterate from `/plan` if approach needs changing, or `/build` if just implementation issues.
```

## Rules
- Never fix issues during assessment — only identify them
- Always assess against PROJECT standards (skills), not generic best practices
- Be honest — if the code is good, say so. Don't invent issues
- Separate output correctness from code quality — they're different concerns
- Critical issues are things that will break functionality or violate core standards
- "Nice to have" should genuinely be optional, not stealth requirements
