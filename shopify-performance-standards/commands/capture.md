---
description: Capture learnings from a completed performance optimization and write them into the project's patterns file. Use after /verify or /report when an optimization is complete.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Capture — Performance Knowledge Extraction

You are entering the Capture phase. Your job is to extract meaningful learnings from the optimization just completed and store them in the project directory so future optimizations benefit from this experience. Do not invent learnings. Only capture what genuinely matters.

## Input
What to capture from: `$ARGUMENTS`

If no context, review the current conversation for the optimization that was just completed.

## Process

### Step 1: Review What Happened
Look back through the conversation at:
- The audit results (before scores)
- The diagnosis and prioritization
- The fixes that were applied
- The verification results (after scores)
- Any unexpected issues or deviations
- Which fixes had the most impact

### Step 2: Apply the Learning Filter
For each potential learning, ask: **"If I knew this before starting, would it have made the optimization faster, better, or avoided a mistake?"**

If NO → skip it.

Check for these 5 types:

**1. Pattern Discovered**
A reusable optimization approach that worked well and should be repeated.

**2. Mistake Made & Root Cause Found**
Something went wrong during optimization, was fixed, and has a clear root cause.

**3. Convention Decided**
A choice between multiple valid optimization approaches — what was chosen and why.

**4. Codebase-Specific Context**
Something about THIS project's theme that affects future optimization work.

**5. Platform Gotcha**
A Shopify or PageSpeed limitation/behavior that isn't obvious.

### Step 3: Write to Project Directory
All learnings go to a single file in the project: `.claude/patterns-learned.md`

**Before writing**, read the existing file (if it exists) to:
- Avoid duplicates
- Merge with existing related patterns
- Maintain consistent formatting

**If the file doesn't exist**, create it with a header:
```markdown
# Patterns Learned

Project-specific learnings captured from development and optimization work.
```

### Step 4: Write the Learning
Append each learning to `.claude/patterns-learned.md`:

```markdown
### [Brief Title]
**Type:** [Pattern | Mistake & Fix | Convention | Codebase Context | Platform Gotcha]
**Category:** Performance
**Date:** [Today's date]

[2-4 sentences explaining the learning. Include WHAT, WHY, and an example if helpful.]
```

### Step 5: Report What Was Captured

```
## Capture Complete

**Learnings Found:** [count]

**Saved to:**
- `.claude/patterns-learned.md` — [learning title]
- `.claude/patterns-learned.md` — [learning title]
```

If no meaningful learnings were found:

```
## Capture Complete

**No new learnings to capture.** This optimization followed established patterns. The knowledge base is sufficient for this type of work.
```

## Rules
- Never force learnings — if there's nothing new, that's fine
- Never duplicate existing knowledge — check before writing
- Keep learnings concise — 2-4 sentences max
- Always include the WHY, not just the WHAT
- Write learnings as guidance for future optimizations, not a diary of what happened
- If conflicting with an existing learning, update the existing one rather than adding a contradiction
- Always include **Category: Performance** tag so learnings from different plugins are distinguishable
