---
name: skill-validator
description: Validate a Claude Code skill for correctness. Checks frontmatter syntax, field values, file size, description quality, and missing supporting files.
disable-model-invocation: true
allowed-tools: Bash(bash *), Read, Glob, Grep
argument-hint: [skill-directory-path]
---

# Skill Validator

Validate a Claude Code skill directory for correctness and quality.

**Input**: `$ARGUMENTS` should be the path to a skill directory (the directory containing `SKILL.md`). If no argument is given, ask the user for the path.

## Phase 1: Mechanical Checks (Script)

Run the bundled validation script:

```bash
bash ${CLAUDE_SKILL_DIR}/scripts/validate.sh $ARGUMENTS
```

This script checks:
- `SKILL.md` exists
- Frontmatter is present and correctly delimited with `---`
- All frontmatter fields are valid (only: `name`, `description`, `argument-hint`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `model`, `effort`, `context`, `agent`, `hooks`)
- Field values are correct types (`name` is lowercase/hyphens/numbers max 64 chars, booleans are `true`/`false`, `effort` is `low`/`medium`/`high`/`max`, `context` is `fork`)
- File is under 500 lines
- Referenced supporting files exist on disk

Report the script output to the user.

## Phase 2: Description Quality (LLM Judgment)

Read the `SKILL.md` file with the `Read` tool. Then evaluate the `description` field against these criteria:

### 2a. Keyword Coverage
- Does the description include words a user would naturally say when they want this skill?
- Would Claude's skill-matching logic find this skill for relevant requests?
- **Bad example**: `description: Does stuff with deployments` — too vague, no actionable keywords.
- **Good example**: `description: Deploy the application to production. Use when pushing a release, deploying to prod, or shipping to production servers.` — includes action verbs and synonyms.

### 2b. Specificity
- Is the description specific enough to avoid false triggers?
- Does it clearly state WHEN to use the skill?
- **Bad example**: `description: Helps with code` — matches everything, triggers on anything.
- **Good example**: `description: Generates unit tests for React components using Jest and React Testing Library. Use when writing tests for .tsx files.` — scoped to a clear use case.

### 2c. Length and Clarity
- Is it concise but informative? (1-3 sentences is ideal)
- Does it avoid jargon that wouldn't appear in natural requests?

Rate the description: **Good**, **Needs Improvement**, or **Poor**. If not Good, provide a specific rewrite suggestion.

## Phase 3: Content Quality (LLM Judgment)

Evaluate the markdown content (below the frontmatter):

### 3a. Consistency Check
- If `context: fork` is set, does the content include a concrete task? (A forked subagent with only guidelines and no task will return without meaningful output.)
- If `allowed-tools` is set, does the content reference actions that require those tools?
- If `$ARGUMENTS` or `$N` placeholders are used, is `argument-hint` set in frontmatter?
- If `disable-model-invocation: true` is set, does the content make sense as a user-triggered action?
- If `user-invocable: false` is set, does the content make sense as background knowledge rather than an action?

### 3b. Instruction Clarity
- For task-type skills: Are there clear numbered steps? Is the success criteria defined?
- For reference-type skills: Are the conventions actionable and specific?

### 3c. Supporting Files
- If the skill directory contains supporting files, are they referenced from `SKILL.md`?
- If `SKILL.md` references supporting files, do they exist? (already checked in Phase 1, but cross-reference here)

## Phase 4: Summary Report

Present a clear summary:

```
══════════════════════════════════════════════════════
  Skill Validation Report: <skill-name>
══════════════════════════════════════════════════════

MECHANICAL CHECKS:  ✅ Passed / ❌ N errors, M warnings
DESCRIPTION:        ✅ Good / ⚠️ Needs Improvement / ❌ Poor
CONTENT QUALITY:    ✅ Good / ⚠️ Needs Improvement / ❌ Issues Found
CONSISTENCY:        ✅ Consistent / ❌ N inconsistencies

ISSUES:
  1. [severity] description of issue
  2. [severity] description of issue

SUGGESTIONS:
  1. specific actionable suggestion
  2. specific actionable suggestion
```

If there are zero issues, say so clearly and confirm the skill is ready to use.

## Rules

- Always run Phase 1 (script) first. If the script fails fatally (no SKILL.md), stop and report.
- Always read the full SKILL.md for Phases 2-4 — do not skip LLM judgment.
- Be specific in suggestions. Don't say "improve the description" — provide an actual rewrite.
- Do not modify the skill files. This is read-only validation.