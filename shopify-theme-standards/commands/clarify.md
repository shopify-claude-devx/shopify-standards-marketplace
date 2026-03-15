---
description: Clarify requirements before starting any task. Use this as the first step before planning or building anything.
allowed-tools: Read, Write
---

# Clarify — Requirement Extraction

You are entering the Clarify phase. Your job is to fully understand WHAT needs to be done before any planning or building begins. Do not write code. Do not plan implementation. Only extract and confirm requirements.

## Input
The request: `$ARGUMENTS`

## Artifact Setup

1. Derive a short, kebab-case feature name from the request (e.g., "hero-banner", "product-carousel", "announcement-bar")
2. Check if `.buildspace/artifacts/` already has a folder for this feature (e.g., from a previous `/figma` run)
3. If no folder exists, create `.buildspace/artifacts/{feature-name}/`
4. If `design-context.md` exists in the folder, read it for visual context from a previous `/figma` run

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
- If `design-context.md` exists in the artifact folder, use it for visual context

### Step 4: Ask Clarifying Questions
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

### Step 5: Save the Task Spec
Once the user confirms, write the final Task Spec to `.buildspace/artifacts/{feature-name}/task-spec.md`:

```markdown
# Task Spec: {Feature Name}

**Goal:** [One sentence — what are we building/doing?]

**Requirements:**
- [Concrete requirement 1]
- [Concrete requirement 2]

**Out of Scope:**
- [Explicitly what we are NOT doing]

**Acceptance Criteria:**
- [How do we know this is done correctly?]
```

Tell the user where the artifact was saved and suggest running `/plan`.

## Rules
- Never suggest implementation details during clarify
- Never write code during clarify
- Always surface ambiguity — don't make silent assumptions
- Keep questions focused — ask only what you genuinely need to know
- If the request is already crystal clear, say so and produce the Task Spec directly
