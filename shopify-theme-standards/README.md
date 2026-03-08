# Shopify Theme Standards

A Claude Code plugin that enforces Shopify theme development standards through skills, commands, and agents. Version 1.0.6.

**Author:** Aditya Pasikanti

## Installation

```
claude plugin add shopify-theme-standards --marketplace github:shopify-claude-devx/shopify-standards-marketplace
```

## Workflow

```
/figma (optional) → /clarify → /plan → /build → /assess → /fix (if needed) → /capture
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

## Skills

Skills auto-load based on file globs. They can also be invoked manually.

| Skill | Auto-loads on | What it enforces |
|---|---|---|
| `liquid-standards` | `**/*.liquid` | Variable naming, tag style, render vs include, whitespace control, filters, null checks |
| `css-standards` | `assets/**/*.css` | BEM naming, section scoping, property ordering, responsive breakpoints, CSS variables |
| `js-standards` | `assets/**/*.js` | Vanilla JS only, defer loading, Web Components, no inline styles/DOM creation |
| `section-standards` | `sections/**/*.liquid` | File structure (CSS/HTML/JS/Schema), wrapper patterns, block rendering via snippets |
| `section-schema-standards` | `sections/**/*.liquid` | Schema structure, setting IDs/labels, block conventions, presets |
| `theme-architecture` | `templates/**/*.json`, `layout/**/*.liquid`, `config/*.json` | File structure, naming conventions, snippet extraction, section independence |
| `figma-to-code` | Manual only | React+Tailwind to Liquid+CSS translation, Figma layer to schema mapping, responsive patterns |

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
