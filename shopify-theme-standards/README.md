# Shopify Theme Standards

A Claude Code plugin that enforces Shopify theme development standards through skills, commands, and agents. Uses artifact-based handshaking for efficient context management across stages. Version 2.0.0.

**Author:** Aditya Pasikanti

## Installation

### Step 1: Add the Marketplace

Inside Claude Code, run:

```
/plugin marketplace add shopify-claude-devx/shopify-standards-marketplace
```

### Step 2: Install the Plugin

```
/plugin install shopify-theme-standards@shopify-standards
```

### Step 3: Verify

Restart Claude Code and type `/shopify-theme-standards:clarify` — if it responds, the plugin is working.

## Workflow

```
/figma (optional) → /clarify → /plan → /build → /assess → /fix (if needed) → /capture
/research — standalone, use anytime
```

Each command writes its output to `.buildspace/artifacts/{feature-name}/`. The next command reads from there. This means:
- Each stage gets exactly the context it needs from one known place
- You can pick up work across sessions (artifacts persist on disk)
- You can review what each stage understood by reading the artifact file
- You can hand-edit any artifact before the next stage runs

## Commands

| Command | Input Artifact | Output Artifact |
|---|---|---|
| `/figma <url>` | — | `design-context.md` |
| `/clarify` | `design-context.md` (optional) | `task-spec.md` |
| `/plan` | `task-spec.md` | `plan.md` |
| `/build` | `plan.md` | code + `execution-log.md` |
| `/assess` | `task-spec.md` + `plan.md` + `execution-log.md` | `assessment.md` |
| `/fix` | `assessment.md` | fixed code |
| `/capture` | all artifacts | `capture.md` + `.claude/patterns-learned.md` |
| `/research "topic"` | — | inline results |

## Artifact Structure

```
.buildspace/
  artifacts/
    {feature-name}/
      design-context.md    ← /figma output
      task-spec.md         ← /clarify output
      plan.md              ← /plan output
      execution-log.md     ← /build output
      assessment.md        ← /assess output
      capture.md           ← /capture output
```

Add `.buildspace/` to your project's `.gitignore` — artifacts are working files, not source code.

## Context Efficiency

This plugin is designed to minimize token usage:

- **Skills are loaded per-file, not per-stage.** `/build` only loads the skill relevant to the file it's currently writing (e.g., `css-standards` when writing a `.css` file), not all 7 skills upfront.
- **`/plan` does not read skills.** Planning focuses on architecture and file changes. Skills are for the build phase when code is being written.
- **Artifacts replace conversation history.** Each stage reads a small, structured artifact file instead of re-reading the entire conversation or re-loading all context.
- **Checklists are in skill files.** Each skill has its checklist at the bottom, so loading a skill gives you both the rules and the validation criteria in one read.

## Skills & Enforcement

Plugin skill descriptions are loaded into Claude's context, and Claude may auto-invoke skills it deems relevant — but this is unreliable for mandatory standards enforcement. Add the following to your project's `CLAUDE.md` to guarantee skills are invoked every time:

```markdown
## Project Standards — MANDATORY

Coding standards are provided as **plugin skills** from the `shopify-theme-standards` plugin.
They must be invoked using the **Skill tool** before writing any code.

**Before writing or modifying any file, invoke the relevant skill(s):**
- **`.liquid` files** → invoke `shopify-theme-standards:liquid-standards`
- **`.js` files** → invoke `shopify-theme-standards:js-standards`
- **CSS / Tailwind / styling** → invoke `shopify-theme-standards:css-standards`
- **Section files** → invoke `shopify-theme-standards:section-standards` and `shopify-theme-standards:section-schema-standards`
- **New files / architecture decisions** → invoke `shopify-theme-standards:theme-architecture`
- **Building from Figma designs** → invoke `shopify-theme-standards:figma-to-code`

Do not skip this step. The plugin skills have detailed rules and checklists that must be followed.
```

## Agents

| Agent | Role |
|---|---|
| `output-validator` | Reads task-spec artifact. Checks if built features match requirements. Does not review code quality. |
| `code-reviewer` | Reads execution-log artifact. Loads relevant skills per file. Reviews code quality against standards. Does not validate functionality. |

Both agents are dispatched automatically by the `/assess` command.

## Optional Setup

### Figma MCP (for `/figma` command)

```
claude mcp add --transport http figma https://mcp.figma.com/mcp
```

Free. Uses OAuth — no access token needed. Requires a Figma account.

### Theme Check Hook (for auto-linting)

Copy the contents of `setup/hooks.json` into your theme project's `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "file=$(echo \"$CLAUDE_TOOL_INPUT\" | jq -r '.file_path // empty') && [[ \"$file\" == *.liquid ]] && shopify theme check \"$file\" --fail-level error 2>&1 | tail -30 || true"
          }
        ]
      }
    ]
  }
}
```

Requires Shopify CLI installed (`npm install -g @shopify/cli`).

## Prerequisites

| What | Required? | Install |
|---|---|---|
| Claude Code | Yes | `npm install -g @anthropic-ai/claude-code` |
| Shopify CLI | For hook only | `npm install -g @shopify/cli` |
| Figma account | For `/figma` only | Free at figma.com |
