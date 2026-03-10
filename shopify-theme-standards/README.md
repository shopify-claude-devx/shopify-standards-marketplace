# Shopify Theme Standards

A Claude Code plugin that enforces Shopify theme development standards through skills, commands, and agents. Version 1.0.6.

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

## Commands

| Command | Description |
|---|---|
| `/figma <url>` | Fetch a Figma design and produce a structured Design Context. Does not write code. |
| `/clarify` | Extract and confirm requirements. Produces a Task Spec. |
| `/plan` | Research codebase, read all skills, produce a TODO-by-TODO execution plan. |
| `/build` | Execute plan TODO-by-TODO. Validates each file against skill checklists. |
| `/assess` | Dispatch two subagents to validate output and review code quality. |
| `/fix` | Debug workflow: investigate, diagnose, get approval, then fix. |
| `/capture` | Extract learnings into `patterns-learned.md` for future reference. |
| `/research "topic"` | Look up any Shopify theme topic using web search. No prerequisites. |

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
| `output-validator` | Checks if built features match requirements. Does not review code quality. |
| `code-reviewer` | Reviews code quality against project standards. Does not validate functionality. |

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
