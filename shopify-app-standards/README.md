# Shopify App Standards

A Claude Code plugin for Shopify React Router app development. Enforces TypeScript, React Router, Prisma, Shopify API, and Polaris Web Components standards through an artifact-based workflow. Version 4.0.0.

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

### Pipeline (Feature Development)

```
/clarify → /plan → /execute → /validate
```

### Standalone Commands

```
/fix         — First-principles debugging and repair
/research    — Shopify app topic research
```

### Use Cases

| Use Case | Entry Point | Flow |
|----------|-------------|------|
| Feature Development | `/clarify` | /clarify → /plan → /execute → /validate |
| Bug Fixing | `/fix` | Standalone — root cause analysis, user approval, then fix |
| Research | `/research` | Standalone — web search and synthesis |

## Skills

### Workflow Skills (user-invoked)

| Skill | Purpose | Input Artifact | Output Artifact |
|-------|---------|----------------|-----------------|
| `/clarify` | Define requirements, ask clarifying questions | User request | `clarify.md` |
| `/plan` | Execution plan with grouped TODOs | `clarify.md` | `plan.md` |
| `/execute` | Build all files in-context with full visibility | `plan.md` | `execution-log.md` |
| `/validate` | First-principles verification — report and stop | `execution-log.md` + `clarify.md` | `validation-report.md` |
| `/fix` | First-principles root cause analysis + repair | `validation-report.md` or user report | `fix-log.md` |
| `/research` | Shopify app topic research | Topic query | Conversation output |

### Standard Skills (loaded contextually during execution)

| Skill | Applies To | Key Standards |
|-------|------------|---------------|
| `typescript-standards` | All `.ts`/`.tsx` files | No any/unknown, no as casts, no empty blocks, no console.log |
| `react-router-patterns` | Route files | React Router v7, authenticate.admin first, no `<a>` tags, ErrorBoundary |
| `shopify-api` | API calls | GraphQL only, userErrors checking, rate limits, webhooks |
| `prisma-standards` | Schema + queries | db.server.ts singleton, findMany limits, null handling, error codes |
| `polaris-web-components` | UI components | `s-*` prefix, CDN delivery, no `@shopify/polaris`, `<s-section>` replaces `<Card>` |

## Agents

| Agent | Dispatched By | Role |
|-------|--------------|------|
| `codebase-analyzer` | `/plan` | Discovers existing patterns, conventions, framework stack, conflicts |
| `output-validator` | Available for standalone use | Validates requirements coverage, edge cases, integration |
| `code-reviewer` | Available for standalone use | Reviews code quality against standard checklists |

Note: `/validate` does its work inline (no agent dispatch) to maintain full context visibility. The output-validator and code-reviewer agents exist for standalone use or future extensibility.

## Artifact Structure

```
.buildspace/
  current-feature              ← Active feature name (auto-tracked)
  artifacts/
    {feature-name}/
      clarify.md               ← /clarify output
      plan.md                  ← /plan output
      execution-log.md         ← /execute output
      validation-report.md     ← /validate output
      fix-log.md               ← /fix output
```

Add `.buildspace/` to your project's `.gitignore` — artifacts are working files, not source code.

## Key Design Decisions (v4.0.0)

### What Changed from v3

1. **Execute builds directly** — no more one-file-per-builder agents in isolation. Execute reads the plan and builds all files itself, with full visibility across everything created. This eliminates cross-file integration issues.

2. **Simplified pipeline** — clarify → plan → execute → validate. No more test → fix → test loops. Validate reports and stops. Fix is standalone with first-principles thinking.

3. **Updated standards** — Polaris Web Components (`<s-*>`) replace deprecated Polaris React. React Router v7 replaces Remix. All checklists updated for 2026 patterns.

4. **Feature tracking** — `.buildspace/current-feature` tracks the active feature. No more "which feature?" prompts mid-pipeline.

5. **No model overrides** — skills don't force `model: sonnet`. Your chosen model handles all phases.

6. **No per-file tsc hook** — type checking runs once at the end of execute, not on every file write.

### Token Optimization
- **Artifacts replace conversation.** Each stage reads a small, structured artifact file. You can `/clear` between stages.
- **Context fork on /research.** Verbose WebFetch results stay in forked context.
- **disable-model-invocation on workflow skills.** Prevents accidental auto-triggering.
- **allowed-tools restriction.** Each skill has only the tools it needs.

## Skills & Enforcement

To ensure skills are invoked during ad-hoc coding (outside the pipeline), add this to your project's `CLAUDE.md`:

```markdown
## Project Standards — MANDATORY

Coding standards are provided as **plugin skills** from the `shopify-app-standards` plugin.

**Before writing or modifying any file, read the relevant checklist:**
- **`.ts` / `.tsx` files** → `typescript-standards/checklist/rules-and-checklist.md`
- **Route files** → + `react-router-patterns/checklist/rules-and-checklist.md`
- **Polaris UI** → + `polaris-web-components/checklist/rules-and-checklist.md`
- **Shopify API calls** → + `shopify-api/checklist/rules-and-checklist.md`
- **Prisma schema/queries** → + `prisma-standards/checklist/rules-and-checklist.md`
```

## Prerequisites

| What | Required? | Install |
|---|---|---|
| Claude Code | Yes | `npm install -g @anthropic-ai/claude-code` |
| Node.js 18+ | Yes | nodejs.org |
| Shopify CLI | For app development | `npm install -g @shopify/cli` |
| TypeScript | For type checking | `npm install -D typescript` |
