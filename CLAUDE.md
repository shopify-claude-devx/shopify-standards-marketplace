# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Claude Code **plugin marketplace** — a collection of installable plugins that enforce Shopify development standards through skills, commands, and agents. This is not a runnable application; there are no build steps, tests, or dependencies to install.

Installed via:
```
/plugin marketplace add shopify-claude-devx/shopify-standards-marketplace
/plugin install <plugin-name>@shopify-standards
```

## Repository Structure

```
.claude-plugin/marketplace.json    ← Plugin registry (name, source path, description for each plugin)
shopify-theme-standards/           ← Liquid, CSS, JS, schema, section standards for themes
shopify-app-standards/             ← TypeScript, Remix, Prisma, Shopify API, Polaris standards
shopify-performance-standards/     ← PageSpeed auditing, optimization, client reporting
pilot/                             ← Experimental features
```

Each plugin follows the same internal structure:
```
plugin-name/
├── .claude-plugin/plugin.json     ← Name, version, description, author
├── skills/{skill-name}/SKILL.md   ← Standards + embedded checklists
├── commands/{command-name}.md      ← Workflow stage definitions
├── agents/{agent-name}.md          ← Specialized subagent roles
├── hooks/hooks.json                ← Optional auto-linting hooks
└── README.md
```

## Architecture: Artifact-Based Workflow

The theme and app plugins share a core pipeline: `/clarify` → `/plan` → `/build` → `/assess` → `/fix` → `/capture` (theme also has `/figma` as an optional first step). Each command reads the previous stage's artifact and writes its own to `.buildspace/artifacts/{feature-name}/`:

- `design-context.md` ← `/figma`
- `task-spec.md` ← `/clarify`
- `plan.md` ← `/plan`
- `execution-log.md` ← `/build`
- `assessment.md` ← `/assess`
- `capture.md` ← `/capture`

The performance plugin uses a different action-focused pipeline: `/setup` → `/audit` → `/diagnose` → `/optimize` → `/verify` → `/report`.

**Two key efficiency patterns:**
1. **Artifact handshaking** — stages pass small structured files, not full conversation history
2. **Per-file skill loading** — `/build` loads only the skill relevant to the current file type (e.g., `liquid-standards` for `.liquid` files), never all skills at once

## File Format Conventions

### SKILL.md
```yaml
---
name: skill-id
description: >
  When/why this skill triggers. Paths optional.
paths: ["**/*.liquid"]        # optional, for auto-triggering
user-invocable: false         # optional, default true
---
```
Content: rules organized by topic, code examples, then a **Checklist** section at the bottom with `[ ]` items for validation. The checklist is critical — `/build` validates every file against it.

### Command .md
```yaml
---
description: One-line purpose
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent, Skill
model: sonnet                 # optional override
disable-model-invocation: true  # optional, prevents Claude from auto-triggering
---
```
Content: input (`$ARGUMENTS`), step-by-step process, output specification, rules/constraints.

### Agent .md
```yaml
---
name: agent-id
description: Agent role
tools: Read, Grep, Glob
model: sonnet
skills: skill-id, skill-id   # optional, pre-loaded into agent context
maxTurns: 15
---
```
Content: role description, what to check/analyze, reporting format, rules.

### plugin.json
```json
{
  "name": "plugin-id",
  "description": "What this plugin does",
  "version": "1.0.0",
  "author": { "name": "Author Name" }
}
```

### marketplace.json
The root `.claude-plugin/marketplace.json` registers all plugins. Every new plugin needs an entry in the `plugins` array with `name`, `source` (relative path), and `description`.

## Adding a New Plugin

1. Create `new-plugin/.claude-plugin/plugin.json`
2. Add skills under `new-plugin/skills/{name}/SKILL.md`
3. Add commands under `new-plugin/commands/{name}.md`
4. Add agents under `new-plugin/agents/{name}.md` (optional)
5. Add entry to `.claude-plugin/marketplace.json` `plugins` array
6. Commit and push — the marketplace fetches from GitHub

## Agent Pattern Across Plugins

All three main plugins share the same three agent roles:
- **codebase-analyzer** — discovers existing patterns/conventions before planning
- **output-validator** — checks built features against requirements
- **code-reviewer** — reviews code quality against skill checklists

Agents run on `sonnet` model with 15-20 max turns. The code-reviewer pre-loads relevant skills so it has checklist access.

## Key Differences Between Plugins

| | Theme | App | Performance |
|---|---|---|---|
| **Workflow** | figma→clarify→plan→build→assess→fix→capture | clarify→plan→build→assess→fix→capture | setup→audit→diagnose→optimize→verify→report |
| **Standards focus** | Liquid, CSS, JS, sections, schema | TypeScript, Remix, Prisma, GraphQL, Polaris | Core Web Vitals, fonts, images, CSS/JS loading |
| **Auto-lint hook** | `shopify theme check` on `.liquid` | `npx tsc --noEmit` on `.ts`/`.tsx` | None |
| **Figma integration** | Yes (design-to-code) | No | No |


Don't make any assumptions or hallucination