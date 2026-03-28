---
name: review
description: >
  Review code quality against project standards. Checks standards compliance,
  design token usage, cross-file concerns. Works after /execute (pipeline) or
  standalone on any existing code. Auto-captures learnings on pass.
disable-model-invocation: true
model: sonnet
context: fork
agent: general-purpose
allowed-tools: Read, Write, Grep, Glob, Agent
---

# Review — Code Quality Assessment

You are entering the Review phase. Your job is to check if the code is written well — does it follow project standards, is it readable, maintainable, and consistent?

**This is NOT functional validation (that's /test). You don't check if features work. You check if the code is CLEAN.**

**Do NOT fix anything. Only identify issues. Fixing happens in /fix.**

## Input
Context or overrides: `$ARGUMENTS`

## Mode Detection

### Pipeline Mode (after /execute)
Check `.buildspace/artifacts/` for feature folders containing `execution-log.md`.
If found, read `execution-log.md` to identify files to review.

### Standalone Mode (direct invocation)
If no execution-log.md:
1. Determine scope from user input:
   - Specific files: "review sections/hero-banner.liquid"
   - Section name: "review hero-banner"
   - Recent changes: "review my changes" → use `git diff --name-only` to find changed files
   - Whole theme: "review the theme" → review all sections, snippets, CSS, JS
2. Use `Glob` and `Grep` to find the relevant files

---

## Review Process

### 1. Dispatch Code Reviewer Agent

Identify all files to review (from execution-log or user input). Then dispatch the **code-reviewer** agent:

> Review these files: [list of file paths]
>
> Execution log: .buildspace/artifacts/{feature-name}/execution-log.md (if exists)
>
> For each file, validate against the relevant skill checklist.
> Check standards compliance, readability, maintainability.
> Report issues with severity: Critical / Should Fix / Nice to Have.

The agent has all coding skills preloaded — it knows the project standards.

### 2. Design Token Check

After the agent returns, check for design token usage yourself:

Read `assets/design-system.css` (if it exists) to get the list of available tokens.

For each CSS file in the review scope, use `Grep` to find hardcoded values that should use tokens:
- Hardcoded font sizes → should use `var(--fs-*)`
- Hardcoded colors → should use `var(--color-*)`
- Hardcoded spacing that matches token values → should use `var(--gap-*)` or `var(--section-py-*)`

This is only a finding if `design-system.css` exists AND the hardcoded value matches an available token.

### 3. Cross-File Concerns

Check with `Grep` and `Glob`:
- **Unused snippets:** For each snippet created, verify it's actually rendered somewhere
- **CSS conflicts:** Check if new CSS classes conflict with existing ones in other files
- **Schema ID collisions:** Check if setting IDs are unique across all sections
- **Orphaned assets:** Check if new CSS/JS files are actually loaded in a section

---

## Review Report

Write to `.buildspace/artifacts/{feature-name}/review-report.md` (pipeline mode) or present in conversation (standalone mode).

Read the template from `${CLAUDE_SKILL_DIR}/templates/review-report-template.md` and fill it in with the review findings.

---

## Auto-Capture Learnings

When /review verdict is CLEAN, check if `test-report.md` exists in the same artifact folder. If it exists and contains a "PASS" verdict, then both /test and /review have passed — trigger auto-capture.

If test-report.md doesn't exist (standalone review), skip auto-capture.

**Only capture if something non-obvious was learned.** Apply the filter: "If I knew this before starting, would it have made the task faster or avoided a mistake?"

If nothing non-obvious → skip capture. Don't force it.

If learnings exist, append to `.claude/patterns-learned.md` in the project directory:

```markdown
### {Brief Title}
**Type:** Pattern / Mistake & Fix / Convention / Codebase Context / Platform Gotcha
**Category:** Liquid / Sections / Schema / CSS / JavaScript / Architecture
**Date:** {YYYY-MM-DD}

[2-4 sentences: what was learned, why it matters, when to apply it.]
```

Before writing:
- Read existing file to avoid duplicates
- If a new learning conflicts with an existing one, update the existing entry
- Maximum 3 learnings per feature — keep it focused

---

## Rules
- PROJECT standards (skills) override generic best practices
- Be specific about location and explain WHY for every Critical and Should Fix
- If the code is well-written, say CLEAN. Don't invent issues
- Maximum 3 Nice to Have per file. Don't suggest rewrites — that's /fix
- Auto-capture only non-obvious learnings
