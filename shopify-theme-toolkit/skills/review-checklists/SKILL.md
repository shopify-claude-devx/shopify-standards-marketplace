---
name: review-checklists
description: >
  Condensed rules and checklists from all coding standards for code review.
  Contains only enforcement rules and validation items — no examples or explanations.
  Used by code-reviewer agent.
user-invocable: false
---

# Review Checklists

This skill contains the condensed rules and checklist items from all coding standards. Use the checklist section for each file type to validate code during review.

## Per-File-Type Validation

When reviewing a file, load ONLY the relevant checklist:

- `.liquid` files → Read `${CLAUDE_SKILL_DIR}/../liquid-standards/checklist/rules-and-checklist.md`
- Section `.liquid` files → Also read `${CLAUDE_SKILL_DIR}/../section-standards/checklist/rules-and-checklist.md` and `${CLAUDE_SKILL_DIR}/../section-schema-standards/checklist/rules-and-checklist.md`
- `.css` files → Read `${CLAUDE_SKILL_DIR}/../css-standards/checklist/rules-and-checklist.md`
- `.js` files → Read `${CLAUDE_SKILL_DIR}/../js-standards/checklist/rules-and-checklist.md`

Check every item in the relevant checklist against the file being reviewed.
