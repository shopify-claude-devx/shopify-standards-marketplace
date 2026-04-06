# Shopify Theme Toolkit

A Claude Code plugin for orchestrated Shopify theme development. Supports feature development, bug fixing, code review, testing, and code understanding through an artifact-based workflow. Version 2.1.0.

**Author:** Aditya Pasikanti

## Installation

### Step 1: Add the Marketplace

Inside Claude Code, run:

```
/plugin marketplace add shopify-claude-devx/shopify-standards-marketplace
```

### Step 2: Install the Plugin

```
/plugin install shopify-theme-toolkit@shopify-standards
```

### Step 3: Verify

Restart Claude Code and type `/shopify-theme-toolkit:clarify` — if it responds, the plugin is working.

## Workflow

### Full Pipeline (Feature Development)

```
/figma → /clarify → /plan → /execute → /compare → /test → /code-review → /fix (if needed)
```

Start with `/figma` when building from a Figma design. Skip it if working from text requirements only.

### Standalone Commands

```
/figma       — Extract design context from Figma (via MCP)
/fix         — Bug fixing with Root Cause Analysis
/code-review — Code review against project standards
/test        — Code validation + optional visual review
/compare     — Visual comparison of code vs Figma screenshots
/research    — Shopify topic research
/understand  — Deep code explanation
```

### Use Cases

| Use Case | Entry Point | Flow |
|----------|-------------|------|
| Figma → Feature | `/figma` | /figma → /clarify → /plan → /execute → /compare → /fix |
| Feature Development | `/clarify` | /clarify → /plan → /execute → /test → /code-review → /fix |
| Bug Fixing | `/fix` | standalone with RCA |
| Code Review | `/code-review` | standalone against skill checklists |
| Testing | `/test` | standalone with optional visual review |
| Visual Comparison | `/compare` | standalone after /execute when Figma screenshots exist |
| Research | `/research` | standalone web search |
| Understand Code | `/understand` | standalone deep trace |

## Skills

### Workflow Skills (user-invoked)

| Skill | Purpose | Input Artifact | Output Artifact |
|-------|---------|----------------|-----------------|
| `/figma` | Extract design context from Figma via MCP | Figma URL(s) | `design-context.md` + screenshots |
| `/clarify` | Define requirements, research, challenge user | User request | `clarify.md` |
| `/plan` | Technical specification with per-file decisions | `clarify.md` | `plan.md` |
| `/execute` | Implement plan TODO by TODO | `plan.md` | code files + `execution-log.md` |
| `/test` | Functional validation + visual review | `execution-log.md` + `clarify.md` | `test-report.md` |
| `/code-review` | Code quality review + auto-capture learnings | `execution-log.md` | `code-review-report.md` |
| `/fix` | Root cause analysis + fix all instances | `test-report.md` + `code-review-report.md` | `fix-log.md` |
| `/understand` | Deep code explanation | file/section/feature name | conversation output |
| `/research` | Shopify topic research | topic query | conversation output |

### Standard Skills (auto-triggered by Claude)

| Skill | Triggers On |
|-------|------------|
| `liquid-standards` | Any `.liquid` file |
| `section-standards` | Section `.liquid` files and `{% schema %}` blocks |
| `css-standards` | Any `.css` file |
| `js-standards` | Any `.js` file |
| `theme-architecture` | File creation and organization |

## Agents

| Agent | Dispatched By | Model | Role |
|-------|--------------|-------|------|
| `builder` | `/execute` | opus | Builds one file per TODO from plan's File Spec |
| `codebase-analyzer` | `/plan` | sonnet | Discovers existing patterns, conventions, conflicts |
| `output-validator` | `/test` | sonnet | Validates requirements coverage, edge cases, integration |
| `code-reviewer` | `/code-review` | sonnet | Reviews code quality against skill checklists |

**Orchestrator-Worker pattern:** `/execute` is a lightweight orchestrator that dispatches one `builder` agent per TODO. Each builder runs in its own isolated context (File Spec + one skill), writes exactly one file, validates against the skill checklist, and returns. No context accumulation across TODOs.

## Artifact Structure

```
.buildspace/
  artifacts/
    {feature-name}/
      design-context.md      ← /figma output (structured design specs)
      clarify.md             ← /clarify output
      plan.md                ← /plan output
      execution-log.md       ← /execute output
      selectors.json         ← /execute output (section→CSS selector map)
      screenshots/           ← /figma + /compare + /test output
        figma-{section}-desktop.png
        figma-{section}-mobile.png
        code-{section}-desktop.png
        code-{section}-mobile.png
      comparison-report.md   ← /compare output
      code-review-report.md  ← /code-review output
      fix-log.md             ← /fix output
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
- **Context fork on /test, /code-review, /research.** Verbose agent output and WebFetch results stay in forked context. Only summaries return to main thread.
- **disable-model-invocation on workflow skills.** Skill descriptions not loaded for auto-trigger, saving context budget.
- **allowed-tools restriction.** Each skill has only the tools it needs, preventing off-track tool calls.
- **Session boundary guidance.** Each pipeline stage reminds users they can `/clear` between stages since artifacts are the handoff mechanism.

## Skills & Enforcement

Plugin skill descriptions are loaded into Claude's context, and Claude auto-invokes skills it deems relevant. To guarantee skills are invoked every time, add the following to your project's `CLAUDE.md`:

```markdown
## Project Standards — MANDATORY

Coding standards are provided as **plugin skills** from the `shopify-theme-toolkit` plugin.
They must be invoked using the **Skill tool** before writing any code.

**Before writing or modifying any file, invoke the relevant skill(s):**
- **`.liquid` files** → invoke `shopify-theme-toolkit:liquid-standards`
- **`.js` files** → invoke `shopify-theme-toolkit:js-standards`
- **CSS / styling** → invoke `shopify-theme-toolkit:css-standards`
- **Section files** → invoke `shopify-theme-toolkit:section-standards`
- **New files / architecture decisions** → invoke `shopify-theme-toolkit:theme-architecture`

Do not skip this step. The plugin skills have detailed rules and checklists that must be followed.
```

## Theme Check Hook

The plugin includes a PostToolUse hook that auto-runs `shopify theme check` on `.liquid` files after Write/Edit operations. Copy `hooks/hooks.json` into your theme project's `.claude/settings.json` to enable it.

Requires Shopify CLI installed (`npm install -g @shopify/cli`).

## Prerequisites

| What | Required? | Install |
|---|---|---|
| Claude Code | Yes | `npm install -g @anthropic-ai/claude-code` |
| Figma MCP Server | For /figma skill | `claude mcp add --transport http figma https://mcp.figma.com/mcp` |
| Figma Pro+ plan | For /figma skill | Free plan = 6 calls/month; Pro = 200/day |
| Shopify CLI | For theme check hook | `npm install -g @shopify/cli` |
| Node.js 18+ | For test screenshot capture | nodejs.org |
