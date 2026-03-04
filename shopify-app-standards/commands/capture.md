---
description: Capture learnings from a completed task and write them into project skill files. Use after /assess when a task is complete. Grows project knowledge organically over time.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Capture — Knowledge Extraction

You are entering the Capture phase. Your job is to extract meaningful learnings from the task just completed and store them in the right place so future tasks benefit from this experience. Do not invent learnings. Only capture what genuinely matters.

## Input
What to capture from: `$ARGUMENTS`

If no context, review the current conversation for the task that was just completed.

## Process

### Step 1: Review What Happened
Look back through the conversation at:
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
A Shopify or tooling limitation/behavior that isn't obvious.

### Step 3: Write to Project Directory
All learnings go to a single file in the user's project: `.claude/patterns-learned.md`

This file lives in the project directory (not inside the plugin), so learnings persist across plugin updates and are specific to this project.

**Before writing**, read the existing file (if it exists) to:
- Avoid duplicates
- Merge with existing related patterns
- Maintain consistent formatting

**If the file doesn't exist**, create it with a header:
```markdown
# Patterns Learned

Project-specific learnings captured from development work.
```

Tag each entry with a category so learnings are searchable:
- TypeScript patterns → **Category: TypeScript**
- Remix route patterns → **Category: Remix**
- Shopify API patterns → **Category: Shopify API**
- Prisma/database patterns → **Category: Prisma**
- Polaris/App Bridge UI patterns → **Category: Polaris**

### Step 4: Write the Learning
Format for each entry:

```markdown
### [Brief Title]
**Type:** [Pattern | Mistake & Fix | Convention | Codebase Context | Platform Gotcha]
**Category:** [TypeScript | Remix | Shopify API | Prisma | Polaris]
**Date:** [Today's date]

[2-4 sentences explaining the learning. Include WHAT, WHY, and an example if helpful.]
```

### Step 5: Report What Was Captured

```
## Capture Complete

**Learnings Found:** [count]

**Saved to:**
- `[file path]` — [learning title]
- `[file path]` — [learning title]
```

If no meaningful learnings were found, say so honestly:

```
## Capture Complete

**No new learnings to capture.** This task followed existing patterns correctly. The knowledge base is sufficient for this type of work.
```

## Rules
- Never force learnings — if there's nothing new, that's fine
- Never duplicate existing knowledge — check before writing
- Keep learnings concise — 2-4 sentences max
- Always include the WHY, not just the WHAT
- Write learnings as guidance for future tasks, not a diary of what happened
- If conflicting with an existing learning, update the existing one rather than adding a contradiction
