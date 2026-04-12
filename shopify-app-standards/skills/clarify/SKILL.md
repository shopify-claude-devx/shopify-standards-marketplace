---
name: clarify
description: >
  Clarify requirements before starting any task. Use this as the first step
  before planning or building anything. Extracts what needs to be done,
  asks clarifying questions, and saves a requirements document.
disable-model-invocation: true
allowed-tools: Read Write Glob AskUserQuestion
---

# Clarify — Requirement Extraction

You are entering the Clarify phase. Your job is to fully understand WHAT needs to be done before any planning or building begins. Do not write code. Do not plan implementation. Only extract and confirm requirements.

## Input
The request: `$ARGUMENTS`

## Artifact Setup

1. Derive a short, kebab-case feature name from the request (e.g., "ga4-onboarding", "event-pixel-setup", "custom-events")
2. Use `Glob('.buildspace/artifacts/*/clarify.md')` to check if artifacts already exist for this or a similar feature
3. If no folder exists, create `.buildspace/artifacts/{feature-name}/`
4. **Write the feature name to `.buildspace/current-feature`** — this tracks the active feature across the pipeline

## Process

### Step 1: Understand the Request
Read the user's input carefully.

### Step 2: Identify What You Know and Don't Know
Break the request into:
- **Clear requirements** — things explicitly stated
- **Implied requirements** — things not said but obviously needed
- **Ambiguous areas** — things that could go multiple ways
- **Missing information** — things you need answered to proceed

### Step 3: Check Existing Context
- Read `CLAUDE.md` if it exists for project context
- Scan the codebase briefly to understand what already exists that relates to this request

### Step 4: Ask Clarifying Questions

When ambiguity has a small set of clear options (e.g., page type, data source, UI pattern), use `AskUserQuestion` to present structured choices rather than open-ended questions. This speeds up requirement gathering. For open-ended questions (e.g., "describe the desired behavior"), use regular conversation.

Present your understanding back to the user:

```
## Here's What I Understand

[Restate the task in your own words — what is the end goal?]

**Feature name:** `{feature-name}` (artifacts will be saved to `.buildspace/artifacts/{feature-name}/`)

## What's Clear
- [Requirement 1]
- [Requirement 2]

## What I'm Assuming (confirm or correct)
- [Assumption 1]
- [Assumption 2]

## What I Need to Know
- [Question 1]
- [Question 2]
```

If the request is already crystal clear, say so and produce the requirements document directly — don't manufacture ambiguity.

### Step 5: Save the Requirements
Once the user confirms, write the requirements to `.buildspace/artifacts/{feature-name}/clarify.md`.

Read the template structure from `${CLAUDE_SKILL_DIR}/templates/clarify-template.md` and fill it in with the feature's requirements.

### Step 6: Hand Off
Tell the user:
- Where the requirements were saved
- Suggest running `/plan`

**Do NOT output the full requirements in conversation. The artifact file is the source of truth.**

### Next Step
Tell the user:
```
→ Run /plan to create the execution plan.
  Pipeline: /plan → /execute → /validate
```

**Context tip:** If your conversation is getting long, you can `/clear` before running `/plan` — it reads from artifacts, not conversation history.

## Rules
- Never suggest implementation details during clarify
- Never write code during clarify
- Always surface ambiguity — don't make silent assumptions
- Keep questions focused — ask only what you genuinely need to know
