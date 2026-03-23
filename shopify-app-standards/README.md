# Shopify App Standards

Skills, commands, and agents for Shopify Remix app development. Enforces TypeScript, Remix, Prisma, Shopify API, and Polaris standards through a structured workflow.

## Installation

Install via Claude Code marketplace:
```
/install-plugin shopify-app-standards
```

## Workflow

```
/clarify → /plan → /build → /assess → /fix → /capture
```

**Plus standalone:** `/research` (anytime, for any Shopify app topic)

### Command Reference

| Command | Purpose | Input | Output Artifact |
|---|---|---|---|
| `/clarify` | Extract requirements | User request | `task-spec.md` |
| `/plan` | Create execution plan | `task-spec.md` | `plan.md` |
| `/build` | Execute plan TODO by TODO | `plan.md` | `execution-log.md` |
| `/assess` | Validate output + code review | All artifacts | `assessment.md` |
| `/fix` | Debug and repair | `assessment.md` or bug report | Fixed code |
| `/capture` | Extract learnings | All artifacts | `capture.md` + `.claude/patterns-learned.md` |
| `/research` | Look up Shopify topics | Topic query | Inline output |

### Artifact Structure

All artifacts are saved to `.buildspace/artifacts/{feature-name}/`:

```
.buildspace/artifacts/product-sync/
├── task-spec.md        ← /clarify output
├── plan.md             ← /plan output
├── execution-log.md    ← /build output
├── assessment.md       ← /assess output
└── capture.md          ← /capture output
```

Artifacts persist across sessions, allowing work to be picked up later. Each command reads from the previous command's artifact and writes its own.

## Context Efficiency

This plugin minimizes token usage through:

1. **Artifact-based handshaking** — each stage reads a small, structured artifact file instead of re-reading conversation history
2. **Per-file skill loading** — during `/build`, only the skills relevant to the current TODO's files are loaded via `Skill()`, not all upfront
3. **Agent delegation** — `/plan` dispatches codebase-analyzer and `/assess` dispatches output-validator + code-reviewer as focused subagents

## Agents

| Agent | Used By | Purpose |
|---|---|---|
| `codebase-analyzer` | `/plan` | Analyzes existing codebase patterns before planning |
| `output-validator` | `/assess` | Validates features match requirements |
| `code-reviewer` | `/assess` | Reviews code quality against skill standards |

## Skills

| Skill | Applies To | Key Standards |
|---|---|---|
| `typescript-standards` | All `.ts`/`.tsx` files | No any/unknown, no as casts, no empty blocks, no console.log |
| `remix-patterns` | Route files | authenticate.admin first, no `<a>` tags, ErrorBoundary, action errors |
| `shopify-api` | API calls | GraphQL only, userErrors checking, rate limits, webhooks |
| `prisma-standards` | Schema + queries | db.server.ts singleton, findMany limits, null handling, error codes |
| `polaris-appbridge` | UI components | No bare HTML, App Bridge Modal, no custom CSS, deprecated components |
| `research` | Standalone | Web search for Shopify app topics |

Each skill contains both rules AND a checklist for validation — loaded per-file during build, used by agents during assessment.

## Setup (Optional)

### Auto-Linting Hook

Copy `setup/hooks.json` to your project's `.claude/settings.json` to auto-run TypeScript type checking after every file write/edit:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "file=$(echo \"$CLAUDE_TOOL_INPUT\" | jq -r '.file_path // empty') && [[ \"$file\" == *.ts || \"$file\" == *.tsx ]] && npx tsc --noEmit 2>&1 | tail -30 || true"
          }
        ]
      }
    ]
  }
}
```
