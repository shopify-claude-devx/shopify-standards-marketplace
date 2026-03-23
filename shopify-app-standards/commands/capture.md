---
description: Capture learnings from a completed task. Use after /assess when a task passes. Extracts patterns and writes them to the feature artifact and a persistent project-level file.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Capture — Knowledge Extraction

You are entering the Capture phase. Your job is to extract meaningful learnings from the task just completed and store them so future tasks benefit from this experience. Do not invent learnings. Only capture what genuinely matters.

## Input
Context or overrides: `$ARGUMENTS`

## Artifact Resolution
1. Use `Glob('.buildspace/artifacts/*/execution-log.md')` to discover feature folders with completed builds
2. Read the artifacts from the relevant feature to review what happened:
   - `task-spec.md` — what was planned
   - `plan.md` — the approach taken
   - `execution-log.md` — what was built
   - `assessment.md` — what issues were found (if any)

If no artifacts found, ask the user which feature to capture learnings from. Do not fall back to conversation context — artifacts are the source of truth.

## Process

### Step 1: Review What Happened
Look at:
- The original task requirements
- The plan and approach chosen
- The code that was built
- The assessment results
- Any issues found and how they were fixed
- Any deviations from the original plan

### Step 2: Apply the Learning Filter
For each potential learning, ask: **"If I knew this before starting, would it have made the task faster, better, or avoided a mistake?"**

If NO → skip it. Not everything is a learning.

Check for these 5 types:

**1. Pattern Discovered**
A reusable approach that worked well and should be repeated.

**2. Mistake Made & Root Cause Found**
Something went wrong, was fixed, and has a clear root cause.

**3. Convention Decided**
A choice between multiple valid approaches — what was chosen and why.

**4. Codebase-Specific Context**
Something about THIS project's codebase that affects future work.

**5. Platform Gotcha**
A Shopify, Remix, Prisma, or tooling limitation/behavior that isn't obvious.

### Step 3: Write Learnings to Both Locations

**Location 1: Feature-scoped artifact**
Write to `.buildspace/artifacts/{feature-name}/capture.md`:

```markdown
# Capture: {Feature Name}

### [Brief Title]
**Type:** [Pattern | Mistake & Fix | Convention | Codebase Context | Platform Gotcha]
**Category:** [TypeScript | Remix | Shopify API | Prisma | Polaris]

[2-4 sentences explaining the learning. Include WHAT, WHY, and an example if helpful.]
```

**Location 2: Persistent project-level file**
Append to `.claude/patterns-learned.md` in the user's project directory:

- If the file doesn't exist, create it with a header:
  ```markdown
  # Patterns Learned

  Project-specific learnings captured from development tasks.
  ```

- Before writing, read the existing file to avoid duplicates and merge related patterns
- Tag each entry with category, type, and date
- Use the same format as above, adding a `**Date:**` field

### Step 4: Report What Was Captured

```
## Capture Complete

**Learnings Found:** [count]

**Saved to:**
- `.buildspace/artifacts/{feature-name}/capture.md` — feature-scoped
- `.claude/patterns-learned.md` — persistent, survives artifact cleanup

**Entries:**
- [Learning title] — [type, category]
```

If no meaningful learnings were found, say so honestly:

```
## Capture Complete

**No new learnings to capture.** This task followed existing patterns correctly.
```

## Rules
- Never force learnings — if there's nothing new, that's fine
- Never duplicate existing knowledge — check before writing
- Keep learnings concise — 2-4 sentences max
- Always include the WHY, not just the WHAT
- Write learnings as guidance for future tasks, not a diary of what happened
- If conflicting with an existing learning, update the existing one rather than adding a contradiction
