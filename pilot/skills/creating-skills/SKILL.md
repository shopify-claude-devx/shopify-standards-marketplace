---
name: creating-skills
description: Creates, updates, and iterates on Claude Agent Skills for Claude Code. Saves Skills to .claude/skills/ in the project. Triggers on "create a skill," "build a skill," "make a skill," "update this skill," "edit my skill," or "modify this skill." Uses AskUserQuestion, EnterPlanMode, TaskCreate, and TodoWrite to gather requirements, plan, track, and validate. Asks as many questions as needed before generating.
---

# Creating Skills

You create Claude Agent Skills for Claude Code — complete, well-structured, ready-to-use Skill packages. You also update and iterate on existing Skills.

**Before doing anything**, read the reference files:
- `references/OFFICIAL_SPEC.md` — Official constraints, field requirements, file structure, naming conventions, progressive disclosure patterns, and best practices from Anthropic's documentation. Every Skill you produce must comply.
- `references/INTERVIEW_GUIDE.md` — Question framework for gathering requirements using the `AskUserQuestion` tool. No fixed limit on questions — ask as many as needed until you have full clarity.

---

## Claude Code Tools — Required Usage

This Skill runs exclusively in Claude Code. You MUST use the following native tools at the specified points in the workflow:

### AskUserQuestion
- Use during the **interview phase** to gather requirements via structured multiple-choice questions.
- Each call supports 1-4 questions with 2-4 options each.
- Users can always select "Other" to provide custom text input.
- Use `multiSelect: true` when the user might pick multiple options.
- There is **no limit on the number of AskUserQuestion calls**. Keep calling it until you have full clarity. Do not stop after one round if gaps remain.
- After receiving answers, evaluate them. If new ambiguities emerge, call AskUserQuestion again.

### EnterPlanMode
- Use **after the interview is complete** and before generating any files.
- In plan mode: explore the project's existing `.claude/skills/` directory (if any), understand existing patterns, and design the Skill's file structure.
- Write a plan that includes: the Skill name, description, file structure, what each file will contain, and why.
- Use AskUserQuestion within plan mode if you need to clarify implementation choices.
- Exit plan mode with ExitPlanMode only after the plan is approved by the user.

### TaskCreate / TaskList / TaskUpdate
- Use to **track the Skill creation workflow** as tasks.
- Create tasks for each major phase:
  1. Interview / gather requirements
  2. Plan Skill structure
  3. Generate SKILL.md
  4. Generate reference files (if needed)
  5. Generate templates (if needed)
  6. Generate scripts (if needed)
  7. Validate all constraints
  8. Save to `.claude/skills/[skill-name]/`
- Update task status as you progress: `pending` → `in_progress` → `completed`.
- Use `addBlockedBy` for sequential dependencies (e.g., "Generate SKILL.md" is blocked by "Plan Skill structure").
- Skip tasks that don't apply (e.g., skip "Generate scripts" if the Skill doesn't need scripts).

### TodoWrite
- Use as a **validation checklist** after generating all files.
- Write todos for every constraint from OFFICIAL_SPEC.md:
  - `name` ≤64 chars, lowercase + numbers + hyphens only, no "anthropic"/"claude"
  - `description` ≤1024 chars, third person, states what + when
  - Valid YAML frontmatter
  - SKILL.md body under 500 lines
  - All referenced files exist
  - No empty folders
  - References one level deep only
  - No hardcoded secrets
  - Folder name matches `name` field
- Mark each todo as `completed` or `pending` as you verify.
- Do NOT deliver the Skill until all todos are `completed`.

---

## How This Skill Works

### Mode 1: Creating a New Skill

1. **Read both reference files.** Every time. No exceptions.

2. **Interview the user with AskUserQuestion.** Ask as many rounds of questions as needed. The questions must be specific to what the user described — not generic boilerplate. Keep calling AskUserQuestion until you have enough clarity to build the Skill without making any assumptions. Refer to `references/INTERVIEW_GUIDE.md` for question categories and patterns.

3. **Create tasks with TaskCreate.** Set up tasks for each phase of Skill creation. Mark dependencies between them.

4. **Enter plan mode with EnterPlanMode.** Design the Skill structure: decide which files are needed, what goes in each file, and why. Present the plan. Use AskUserQuestion if choices need clarification. Exit plan mode only after the user approves.

5. **Generate the Skill.** Write all files:
   - `SKILL.md` — Always required. Keep the body under 500 lines.
   - `references/` folder — Only if the Skill needs deep methodology, specifications, style guides, or lookup data that would push SKILL.md beyond a reasonable size. References must be one level deep from SKILL.md.
   - `templates/` folder — Only if the Skill produces structured output that benefits from a reusable template.
   - `scripts/` folder — Only if the Skill requires executable code.
   - **Do NOT create extra folders if SKILL.md alone is sufficient.**
   - Update tasks as you complete each file.

6. **Validate with TodoWrite.** Write the full constraint checklist as todos. Verify every item. Fix any failures before delivering.

7. **Save to `.claude/skills/[skill-name]/`.** This is the Claude Code standard location where Skills are automatically discovered. Update final tasks as completed.

8. **Present the result** to the user with a summary of:
   - What the Skill does
   - What files were created and why each exists
   - The full path where the Skill was saved
   - The trigger conditions (description)
   - Validation results (all todos)

### Mode 2: Updating an Existing Skill

1. **Read the existing Skill files** from `.claude/skills/[skill-name]/`.
2. **Understand the change request.** Use AskUserQuestion if the request is ambiguous.
3. **Create tasks with TaskCreate** for the update phases.
4. **Apply the changes.** Modify only what the user asked. Do NOT rewrite sections the user didn't mention. Do NOT remove existing functionality unless explicitly asked.
5. **Validate with TodoWrite.** Re-check all constraints.
6. **Save** the updated Skill to `.claude/skills/[skill-name]/`.

### Mode 3: Iterating After Feedback

1. **Apply the feedback precisely.** Don't rewrite the whole Skill for a small tweak.
2. **Validate with TodoWrite.**
3. **Save** to `.claude/skills/[skill-name]/`.

---

## What Makes a Good Skill

- **Triggers reliably.** The description must clearly tell Claude WHAT the Skill does AND WHEN to use it. Write in third person. Vague descriptions = Skill never fires.
- **Self-contained.** Understandable by reading its files alone — no external context needed.
- **Uses progressive disclosure.** Level 1: frontmatter (~100 tokens, always loaded). Level 2: SKILL.md body (<5k tokens, loaded when triggered). Level 3: references/scripts (loaded only as needed).
- **Concise.** Only include context Claude doesn't already know. Don't over-explain.
- **Appropriately sized.** Simple Skills stay simple. Complex Skills use references/scripts. Match complexity to the task.
- **Follows the user's language.** If the user calls it a "widget," the Skill calls it a "widget."

---

## Constraint Enforcement — Automatic

Every Skill must satisfy (from OFFICIAL_SPEC.md):

- `name`: ≤64 characters, lowercase letters + numbers + hyphens only. Cannot contain "anthropic" or "claude". Must match folder name. Gerund form preferred.
- `description`: ≤1024 characters, non-empty, no XML tags. Third person. States what + when to trigger.
- YAML frontmatter: Valid `---` delimiters.
- SKILL.md body: Under 500 lines.
- Output location: `.claude/skills/[skill-name]/`.
- References: One level deep from SKILL.md.
- No hardcoded API keys, passwords, or secrets.
- All referenced files must exist.
- No empty folders.

Fix violations before delivering. Never deliver a non-compliant Skill.

---

## What to Avoid — Hard Rules

- Never generate a Skill without interviewing the user first (Mode 1)
- Never cap AskUserQuestion calls at an arbitrary number — ask as many rounds as needed
- Never skip EnterPlanMode for new Skill creation
- Never skip TodoWrite validation before delivering
- Never add files the Skill doesn't actually need
- Never use a description that doesn't explain WHEN to trigger
- Never write descriptions in first or second person — always third person
- Never produce a SKILL.md without valid YAML frontmatter
- Never assume what the user wants — ask with AskUserQuestion
- Never remove existing functionality during an update unless explicitly asked
- Never save a Skill outside of `.claude/skills/[skill-name]/`
- Never exceed the name (64 chars) or description (1024 chars) limits
- Never use reserved words "anthropic" or "claude" in the name field
- Never hardcode sensitive information
- Never nest references more than one level deep from SKILL.md
- Never include time-sensitive information
- Never over-explain things Claude already knows