# Shopify Standards Marketplace

Two plugins for Shopify development with Claude Code.

## What's Inside

**shopify-theme-standards** — 7 skills, 6 commands, 2 agents for theme development
**shopify-app-standards** — 5 skills, 6 commands, 2 agents for Remix app development

## Install in Any Project

### 1. Install the plugin

For a theme project:
```
/plugin install shopify-theme-standards@shopify-standards-marketplace --scope project
```

For an app project:
```
/plugin install shopify-app-standards@shopify-standards-marketplace --scope project
```

`--scope project` saves the reference in `.claude/settings.json` so teammates get it too.

### 2. Add enforcement to your project's CLAUDE.md

Plugin skills provide coding standards, but Claude needs explicit instructions to actively invoke them before writing code. Add the relevant section below to your project's `CLAUDE.md`:

**For theme projects:**

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

**For app projects:**

```markdown
## Project Standards — MANDATORY

Coding standards are provided as **plugin skills** from the `shopify-app-standards` plugin.
They must be invoked using the **Skill tool** before writing any code.

**Before writing or modifying any file, invoke the relevant skill(s):**
- **`.ts` / `.tsx` files** → invoke `shopify-app-standards:typescript-standards`
- **Remix routes / loaders / actions** → invoke `shopify-app-standards:remix-patterns`
- **Shopify API calls** → invoke `shopify-app-standards:shopify-api`
- **Prisma models / queries** → invoke `shopify-app-standards:prisma-standards`
- **Polaris UI / App Bridge** → invoke `shopify-app-standards:polaris-appbridge`

Do not skip this step. The plugin skills have detailed rules and checklists that must be followed.
```

**Why is this needed?** Skills have `globs` that auto-load content into Claude's context, but this is passive — Claude sees it but may not strictly follow it. The CLAUDE.md instructions create an active enforcement loop where Claude must explicitly invoke each skill before writing code.

## Usage

Commands (you type these):
- `/shopify-theme-standards:clarify` — confirm requirements
- `/shopify-theme-standards:plan` — create execution plan
- `/shopify-theme-standards:build` — build the plan
- `/shopify-theme-standards:assess` — validate output + code review
- `/shopify-theme-standards:fix` — debug and fix bugs
- `/shopify-theme-standards:capture` — save learnings

Same for app, just swap the prefix to `shopify-app-standards:`.

## Update a Plugin

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
│   ├── skills/        (7 skills)
│   ├── commands/      (6 commands)
│   └── agents/        (2 agents)
└── shopify-app-standards/
    ├── .claude-plugin/plugin.json
    ├── skills/        (5 skills)
    ├── commands/      (6 commands)
    └── agents/        (2 agents)
```