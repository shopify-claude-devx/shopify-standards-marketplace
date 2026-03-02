# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Claude Code plugin marketplace containing two plugins for Shopify development. No build tools, no tests, no dependencies — this is a pure content repo of markdown files that define skills, commands, and agents for Claude Code's plugin system.

- **shopify-theme-standards** (v1.0.3) — 6 skills, 6 commands, 2 agents for Shopify theme development (Liquid, CSS, JS, sections, schemas, architecture)
- **shopify-app-standards** (v1.0.2) — 5 skills, 6 commands, 2 agents for Shopify Remix app development (TypeScript, Remix, Prisma, Shopify API, Polaris/App Bridge)

## Repository Structure

```
.claude-plugin/marketplace.json          ← marketplace manifest listing both plugins
shopify-theme-standards/
  .claude-plugin/plugin.json             ← plugin manifest (name, version, description)
  skills/{skill-name}/SKILL.md           ← auto-loaded coding standards (globs-triggered)
  skills/{skill-name}/references/*.md    ← checklists, examples, patterns-learned
  commands/{command}.md                  ← user-invocable slash commands
  agents/{agent}.md                      ← subagents dispatched by commands
shopify-app-standards/
  (same structure)
```

## Plugin Architecture

### Commands (shared workflow across both plugins)
Both plugins implement the same 6-command workflow. Commands are invoked by end users as `/plugin-name:command`:

1. **clarify** — Extract and confirm requirements (no code, no planning). Produces a Task Spec.
2. **plan** — Research codebase + read all skill files, produce TODO-by-TODO execution plan referencing which standards apply.
3. **build** — Execute plan TODO-by-TODO. Must read all skill files before writing any code. Validates each file against skill checklists. Auto-runs `/assess` after completion.
4. **assess** — Dispatches two subagents (output-validator + code-reviewer) in parallel, compiles assessment report with verdict.
5. **fix** — Debug workflow: investigate → root cause analysis → present diagnosis → wait for approval → apply fix → run lint/typecheck.
6. **capture** — Extract learnings from completed tasks into `references/patterns-learned.md` files in the appropriate skill directory.

### Skills
Skills auto-load based on file globs (defined in SKILL.md frontmatter). They are NOT user-invocable. Each skill defines strict coding standards that commands reference during plan/build/assess.

**Theme skills:** liquid-standards, css-standards, js-standards, section-standards, section-schema-standards, theme-architecture
**App skills:** typescript-standards, remix-patterns, shopify-api, prisma-standards, polaris-appbridge

### Agents
Each plugin has two agents (defined with `model: sonnet`):
- **output-validator** — Checks if built features match requirements. Does not review code quality.
- **code-reviewer** — Reviews code quality against project standards. Does not validate functionality.

## File Format Conventions

### Command files (`commands/*.md`)
Frontmatter fields: `description`, `allowed-tools`. Body uses `$ARGUMENTS` placeholder for user input.

### Skill files (`skills/*/SKILL.md`)
Frontmatter fields: `name`, `description`, `user-invocable: false`, `globs` (array of file patterns that trigger auto-loading).

### Agent files (`agents/*.md`)
Frontmatter fields: `name`, `description`, `tools`, `model`.

### Reference files (`references/*.md`)
Plain markdown. `patterns-learned.md` files are append-only knowledge bases updated by the `/capture` command. Checklists and examples are static reference material.

## Key Design Decisions

- Commands enforce a hard gate: `/plan` requires reading ALL skill files before planning. `/build` requires reading ALL skill files before writing any code. If a skill file can't be found, the command stops.
- The theme and app plugins have parallel structure but completely independent content. Theme commands reference theme skills; app commands reference app skills.
- The `/build` command auto-chains into `/assess` after completion.
- The `/fix` command has a mandatory approval gate — diagnosis is presented, code is only written after user says "go".
- Versioning is in each plugin's `plugin.json`, not in the marketplace manifest.

## When Editing

- Keep command/skill/agent markdown self-contained — each file must work independently when loaded by Claude Code's plugin system.
- Commands reference skills by name (e.g., "read `typescript-standards`"), not by file path. The plugin system resolves skill names.
- When adding a new skill, update the corresponding `/plan` and `/build` commands to include it in their mandatory read lists.
- Both plugins' commands are intentionally kept in sync structurally. If you change the workflow pattern in one, apply the same change to the other.
