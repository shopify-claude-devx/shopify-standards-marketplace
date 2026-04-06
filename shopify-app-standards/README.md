# Shopify App Standards

A Claude Code plugin for orchestrated Shopify Remix app development. Enforces TypeScript, Remix, Prisma, Shopify API, and Polaris standards through an artifact-based workflow. Version 3.0.0.

**Author:** Aditya Pasikanti

## Installation

### Step 1: Add the Marketplace

Inside Claude Code, run:

```
/plugin marketplace add shopify-claude-devx/shopify-standards-marketplace
```

### Step 2: Install the Plugin

```
/plugin install shopify-app-standards@shopify-standards
```

### Step 3: Verify

Restart Claude Code and type `/shopify-app-standards:clarify` — if it responds, the plugin is working.

## Workflow

### Full Pipeline (Feature Development)

```
/clarify → /plan → /execute → /test → /code-review → /fix (if needed) → /capture
```

### Standalone Commands

```
/fix         — Bug fixing with Root Cause Analysis
/test        — Output validation against requirements
/code-review — Code review against project standards
/research    — Shopify app topic research
```

### Use Cases

| Use Case | Entry Point | Flow |
|----------|-------------|------|
| Feature Development | `/clarify` | /clarify → /plan → /execute → /test → /code-review → /capture |
| Bug Fixing | `/fix` | standalone with RCA |
| Code Review | `/code-review` | standalone against skill checklists |
| Testing | `/test` | standalone output validation |
| Research | `/research` | standalone web search |

## Skills

### Workflow Skills (user-invoked)

| Skill | Purpose | Input Artifact | Output Artifact |
|-------|---------|----------------|-----------------|
| `/clarify` | Define requirements, research, challenge user | User request | `clarify.md` |
| `/plan` | Execution plan with per-TODO skill references | `clarify.md` | `plan.md` |
| `/execute` | Execute plan TODO by TODO with per-file skills | `plan.md` | `execution-log.md` |
| `/test` | Output validation + automated checks | `execution-log.md` + `clarify.md` | `test-report.md` |
| `/code-review` | Code quality review against standards | `execution-log.md` | `code-review-report.md` |
| `/fix` | Root cause analysis + fix all instances | `test-report.md` + `code-review-report.md` | `fix-log.md` |
| `/capture` | Extract learnings to project-level file | All artifacts | `capture.md` + `.claude/patterns-learned.md` |
| `/research` | Shopify app topic research | Topic query | Conversation output |

### Standard Skills (auto-triggered by Claude)

| Skill | Applies To | Key Standards |
|-------|------------|---------------|
| `typescript-standards` | All `.ts`/`.tsx` files | No any/unknown, no as casts, no empty blocks, no console.log |
| `remix-patterns` | Route files | authenticate.admin first, no `<a>` tags, ErrorBoundary, action errors |
| `shopify-api` | API calls | GraphQL only, userErrors checking, rate limits, webhooks |
| `prisma-standards` | Schema + queries | db.server.ts singleton, findMany limits, null handling, error codes |
| `polaris-appbridge` | UI components | No bare HTML, App Bridge Modal, no custom CSS, deprecated components |

## Agents

| Agent | Dispatched By | Model | Role |
|-------|--------------|-------|------|
| `codebase-analyzer` | `/plan` | sonnet | Discovers existing patterns, conventions, conflicts |
| `output-validator` | `/test` | sonnet | Validates requirements coverage, edge cases, integration |
| `code-reviewer` | `/code-review` | sonnet | Reviews code quality against skill checklists |

## Artifact Structure

```
.buildspace/
  artifacts/
    {feature-name}/
      clarify.md             ← /clarify output
      plan.md                ← /plan output
      execution-log.md       ← /execute output
      test-report.md         ← /test output
      code-review-report.md  ← /code-review output
      fix-log.md             ← /fix output
      capture.md             ← /capture output
```

Add `.buildspace/` to your project's `.gitignore` — artifacts are working files, not source code.

## Context & Cost Efficiency

This plugin is designed to minimize token usage and API costs:

### Token Optimization
- **Per-file-type checklists.** Agents load only the relevant checklist file for each file type on demand, not all standards at once.
- **Externalized artifact templates.** Markdown output templates live in `skills/{name}/templates/` and are loaded via Read on demand, not baked into skill system prompts.
- **Per-file skill loading in /execute.** Only loads the skill relevant to the current file type, never all skills at once.
- **Artifacts replace conversation.** Each stage reads a small, structured artifact file. You can `/clear` between stages.

### Cost Optimization
- **Context fork on /research.** Verbose WebFetch results stay in forked context. Only summaries return to main thread.
- **disable-model-invocation on workflow skills.** Skill descriptions not loaded for auto-trigger, saving context budget.
- **allowed-tools restriction.** Each skill has only the tools it needs, preventing off-track tool calls.
- **Session boundary guidance.** Each pipeline stage reminds users they can `/clear` between stages since artifacts are the handoff mechanism.

## Skills & Enforcement

Plugin skill descriptions are loaded into Claude's context, and Claude auto-invokes skills it deems relevant. To guarantee skills are invoked every time, add the following to your project's `CLAUDE.md`:

```markdown
## Project Standards — MANDATORY

Coding standards are provided as **plugin skills** from the `shopify-app-standards` plugin.
They must be invoked using the **Skill tool** before writing any code.

**Before writing or modifying any file, invoke the relevant skill(s):**
- **`.ts` / `.tsx` files** → invoke `shopify-app-standards:typescript-standards`
- **Route files** → invoke `shopify-app-standards:remix-patterns`
- **Polaris UI components** → invoke `shopify-app-standards:polaris-appbridge`
- **Shopify API calls** → invoke `shopify-app-standards:shopify-api`
- **Prisma schema/queries** → invoke `shopify-app-standards:prisma-standards`

Do not skip this step. The plugin skills have detailed rules and checklists that must be followed.
```

## TypeScript Check Hook

The plugin includes a PostToolUse hook that auto-runs `tsc --noEmit` on TypeScript files after Write/Edit operations. Copy `hooks/hooks.json` into your theme project's `.claude/settings.json` to enable it.

Requires Node.js and TypeScript installed.

## Prerequisites

| What | Required? | Install |
|---|---|---|
| Claude Code | Yes | `npm install -g @anthropic-ai/claude-code` |
| Node.js 18+ | Yes | nodejs.org |
| Shopify CLI | For app development | `npm install -g @shopify/cli` |
| TypeScript | For type checking hook | `npm install -D typescript` |
