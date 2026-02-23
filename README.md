# Shopify Standards Marketplace

Two plugins for Shopify development with Claude Code.

## What's Inside

**shopify-theme-standards** — 6 skills, 6 commands, 2 agents for theme development
**shopify-app-standards** — 5 skills, 6 commands, 2 agents for Remix app development

## Install in Any Project

For a theme project:
```
/plugin install shopify-theme-standards@shopify-standards-marketplace --scope project
```

For an app project:
```
/plugin install shopify-app-standards@shopify-standards-marketplace --scope project
```

`--scope project` saves the reference in `.claude/settings.json` so teammates get it too.

## Usage After Install

Commands (you type these):
- `/shopify-theme-standards:clarify` — confirm requirements
- `/shopify-theme-standards:plan` — create execution plan
- `/shopify-theme-standards:build` — build the plan
- `/shopify-theme-standards:assess` — validate output + code review
- `/shopify-theme-standards:fix` — debug and fix bugs
- `/shopify-theme-standards:capture` — save learnings

Same for app, just swap the prefix to `shopify-app-standards:`.

Skills auto-load when Claude sees relevant files (e.g., `.liquid`, `.tsx`).

## Update a Project

```
/plugin uninstall shopify-theme-standards@shopify-standards-marketplace
/plugin install shopify-theme-standards@shopify-standards-marketplace --scope project
```

## Structure

```
shopify-standards-marketplace/
├── .claude-plugin/
│   └── marketplace.json
├── shopify-theme-standards/
│   ├── .claude-plugin/plugin.json
│   ├── skills/        (6 skills)
│   ├── commands/      (6 commands)
│   └── agents/        (2 agents)
└── shopify-app-standards/
    ├── .claude-plugin/plugin.json
    ├── skills/        (5 skills)
    ├── commands/      (6 commands)
    └── agents/        (2 agents)
```