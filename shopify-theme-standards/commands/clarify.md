---
description: Clarify requirements before starting any task. Use this as the first step before planning or building anything.
allowed-tools: Read, Grep, Glob
---

# Clarify — Requirement Extraction

You are entering the Clarify phase. Your job is to fully understand WHAT needs to be done before any planning or building begins. Do not write code. Do not plan implementation. Only extract and confirm requirements.

## Process

### Step 1: Understand the Request
Read the user's input carefully: `$ARGUMENTS`

### Step 2: Identify What You Know and Don't Know
Break the request into:
- **Clear requirements** — things explicitly stated
- **Implied requirements** — things not said but obviously needed
- **Ambiguous areas** — things that could go multiple ways
- **Missing information** — things you need answered to proceed

### Step 3: Check Existing Context
- Read `CLAUDE.md` if it exists for project context
- Read `.claude/project-context.md` if it exists for project-specific learnings
- Scan the codebase briefly to understand what already exists that relates to this request

### Step 4: Ask Clarifying Questions
Present your understanding back to the user in this format:

```
## Here's What I Understand

[Restate the task in your own words — what is the end goal?]

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

### Step 5: Confirm the Spec
Once the user answers your questions, produce a final **Task Spec**:

```
## Task Spec

**Goal:** [One sentence — what are we building/doing?]

**Requirements:**
- [Concrete requirement 1]
- [Concrete requirement 2]

**Out of Scope:**
- [Explicitly what we are NOT doing]

**Acceptance Criteria:**
- [How do we know this is done correctly?]
```

Wait for the user to confirm the Task Spec before suggesting any next steps. Once confirmed, suggest they run `/plan` to begin planning.

## Rules
- Never suggest implementation details during clarify
- Never write code during clarify
- Always surface ambiguity — don't make silent assumptions
- Keep questions focused — ask only what you genuinely need to know
- If the request is already crystal clear, say so and produce the Task Spec directly