---
name: skill-creator
description: Interactively create a new Claude Code skill through a guided Q&A flow. Writes the finished skill directly to .claude/skills/ in the current project.
disable-model-invocation: true
allowed-tools: Bash(mkdir *), Write, Read, Glob, AskUserQuestion
---

# Skill Creator

You are building a new Claude Code skill interactively. Walk the user through each decision one at a time using the `AskUserQuestion` tool. Do NOT skip steps or assume answers.

## Step 1: Gather core info

Ask these questions one at a time (not all at once):

1. **Skill name**: What should the skill be called? (lowercase, hyphens only, max 64 chars). Validate the input — reject names with spaces, uppercase, or special characters.
2. **Purpose**: What should this skill do? Get a clear, specific answer. This will drive the description and content.
3. **Skill type**: Is this reference content (conventions, patterns, knowledge Claude applies to work) or task content (step-by-step instructions for a specific action)?

## Step 2: Determine invocation behavior

Ask:

4. **Who invokes it?**
   - Both user and Claude (default)
   - User only (`disable-model-invocation: true`) — for workflows with side effects like deploy, commit, send
   - Claude only (`user-invocable: false`) — for background knowledge

## Step 3: Execution context

Ask:

5. **Where should it run?**
   - Inline in the main conversation (default) — good for reference content and simple tasks
   - In a forked subagent (`context: fork`) — good for isolated tasks that don't need conversation history

6. If they chose `context: fork`, ask which agent type:
   - `Explore` — read-only codebase exploration
   - `Plan` — design an approach before coding
   - `general-purpose` — full tool access (default)

## Step 4: Tool restrictions

Ask:

7. **Should Claude have restricted tool access when this skill is active?** If yes, ask which tools to allow. Valid tool names from Claude Code: `Agent`, `AskUserQuestion`, `Bash`, `Edit`, `Glob`, `Grep`, `LSP`, `NotebookEdit`, `Read`, `Skill`, `WebFetch`, `WebSearch`, `Write`. Bash can be scoped with patterns like `Bash(npm *)`, `Bash(python *)`, `Bash(gh *)`.

## Step 5: Arguments

Ask:

8. **Does this skill accept arguments?** If yes, ask:
   - How many arguments?
   - What does each argument represent?
   - Provide an `argument-hint` value (e.g., `[filename]`, `[issue-number] [priority]`)

## Step 6: Dynamic context

Ask:

9. **Does this skill need live data injected before running?** (e.g., git status, current branch, PR diff). If yes, ask what shell commands to run. These become `` !`command` `` blocks in the skill content.

## Step 7: Supporting files

Ask:

10. **Does this skill need supporting files?** (templates, example outputs, scripts, reference docs). If yes, ask for each file:
    - Filename and purpose
    - Content (or ask the user to describe what it should contain, then generate it)

## Step 8: Write the description

Based on everything gathered, write a clear, specific description. The description must:
- Explain what the skill does
- Include keywords users would naturally say when they want this skill
- Be specific enough that Claude doesn't trigger it incorrectly
- State when to use it (e.g., "Use when deploying to production" or "Use when explaining how code works")

Show the description to the user and ask for approval before proceeding.

## Step 9: Write the skill content

Based on the skill type:

**For reference content**: Write clear guidelines, conventions, or patterns. Keep it direct and actionable.

**For task content**: Write numbered steps Claude should follow. Be specific about:
- What to check first
- What to do at each step
- How to handle errors
- What success looks like

Include `$ARGUMENTS` or `$ARGUMENTS[N]` / `$N` placeholders if the skill accepts arguments.

Include `` !`command` `` blocks if dynamic context was requested.

## Step 10: Assemble and write to disk

1. Build the complete `SKILL.md` with valid YAML frontmatter and markdown content.
2. Create the skill directory:
   ```
   mkdir -p .claude/skills/<skill-name>
   ```
3. Write `SKILL.md` to `.claude/skills/<skill-name>/SKILL.md`.
4. Write any supporting files to `.claude/skills/<skill-name>/`.
5. Show the user the final file tree and full `SKILL.md` content.
6. Tell the user they can now invoke it with `/<skill-name>` or let Claude auto-invoke it (depending on their invocation choice).

## Rules

- NEVER skip a step. Ask each question and wait for the answer.
- NEVER assume defaults without confirming with the user.
- Validate the skill name format before proceeding past Step 1.
- Keep SKILL.md under 500 lines as recommended by Claude Code documentation.
- If the user gives vague answers, ask follow-up questions to get specifics.
- Use `AskUserQuestion` for every question — do not ask in prose.