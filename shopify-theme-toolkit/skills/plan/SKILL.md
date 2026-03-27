---
name: plan
description: >
  Create a detailed technical specification for a feature. Produces per-file
  decisions (settings, classes, tokens, structure) so /execute has zero
  creative decisions. Use after /prd when requirements are confirmed.
disable-model-invocation: true
allowed-tools: Read, Write, Grep, Glob, Agent
---

# Plan — Technical Specification

You are entering the Plan phase. Your job is to produce a specification so detailed that `/execute` is pure implementation — zero decisions, zero guessing.

**Plan produces DECISIONS, not CODE.** The plan specifies what settings, what classes, what tokens, what structure. /execute writes the actual code using those decisions + skill standards.

**Do NOT write implementation code. Pseudocode or brief snippets ONLY when referencing existing codebase patterns that must be followed.**

## Input
Context or overrides: `$ARGUMENTS`

## Artifact Resolution
1. Look in `.buildspace/artifacts/` for feature folders containing `prd.md`
2. If one folder exists → use it
3. If multiple folders exist → ask the user which feature to plan
4. If no prd.md found → ask the user to run `/prd` first

Read from `.buildspace/artifacts/{feature-name}/`:
- `prd.md` — the requirements (REQUIRED)
- `design-context.md` — visual context from Figma (if exists)
- `design-tokens.json` — available design tokens (if exists)
- `asset-manifest.json` — uploaded assets with shopify:// URLs (if exists)

---

## Process

### Step 1: Read All Inputs
Read the PRD and all available artifacts. Understand the full picture before analyzing the codebase.

### Step 2: Analyze the Codebase
Use `Glob` and `Grep` for quick context:
- `Glob('sections/*.liquid')` — existing sections
- `Glob('snippets/*.liquid')` — reusable snippets
- `Glob('assets/*.css')` + `Glob('assets/*.js')` — asset files
- `Glob('templates/*.json')` — templates
- `Grep('design-system', glob='assets/*.css')` — check if design-system.css exists

Then dispatch the **codebase-analyzer** agent:

> Analyze this Shopify theme codebase to inform planning for: [one-line task description from PRD]
>
> Read `.buildspace/artifacts/{feature-name}/prd.md` for requirements.
> If `.buildspace/artifacts/{feature-name}/design-context.md` exists, read it for design context.
>
> Return: naming conventions, existing patterns to reuse, schema patterns, CSS architecture, potential conflicts.

The agent has ALL skills preloaded — its analysis already accounts for project standards. Trust its findings for naming conventions and patterns.

### Step 3: Research (if needed)
If the PRD requirements involve Shopify features you're not confident about after reading the codebase analysis:
- Dispatch a research subagent to search shopify.dev
- Only for genuine knowledge gaps
- Skip if the codebase analysis + PRD provide enough context

### Step 4: Design the Solution
Using the PRD requirements + codebase analysis + design context (if Figma), make every decision:

**For each file to create/modify, decide:**

1. **File path** — following codebase naming conventions discovered by agent
2. **Schema settings** — exact IDs, types, labels, groups (following agent's reported schema patterns)
3. **CSS classes** — exact BEM class names (following agent's reported CSS conventions)
4. **Design tokens** — which `var(--token)` to use from design-system.css (never hardcode values that exist as tokens)
5. **Block types** — if section has repeatable content, exact block type names and their settings
6. **Null checks** — which settings need blank/empty guards
7. **Asset references** — exact `shopify://` URLs from asset-manifest.json
8. **CSS loading strategy** — preload (above fold) or lazy load (below fold)
9. **JS approach** — none, DOMContentLoaded, or Web Component (and why)
10. **Existing code to reuse** — snippets, patterns, utilities found by agent

**When the plan references an existing codebase pattern:** Include a brief note like "Follow wrapper pattern from testimonials.liquid — uses `data-section-id` attribute." This is pointing to a reference, not writing code.

### Step 5: Write the Specification

Write the plan to `.buildspace/artifacts/{feature-name}/plan.md`.

Read the template structure from `${CLAUDE_SKILL_DIR}/templates/plan-template.md` and fill it in with the feature's specification. Every file must have a complete File Spec — no file is just a "TODO" without details.

### Step 6: Present and Confirm
Save the plan to the artifact file. Then tell the user:
- Where the plan was saved
- A 2-3 line summary of the approach
- Ask them to review and confirm or request changes

**Do NOT output the full plan in conversation. The artifact file is the source of truth.**

**Context tip:** If your conversation is getting long, you can `/clear` before running `/execute` — it reads from artifacts, not conversation history.

---

## Rules
- Zero creative decisions for /execute — if /execute has to decide, the plan failed
- Reference design tokens and asset-manifest — never hardcode values or use placeholder URLs
- Follow codebase conventions discovered by the agent, not generic standards
- If the task is too large (>8 files), suggest breaking into smaller plans
- Test cases must be specific and verifiable — "works correctly" is not a test case
