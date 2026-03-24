# Prompt Elaboration Methodology

This document is the complete methodology for elaborating prompts. Read this fully before writing any output. No exceptions.

---

## Phase 1: Input Analysis

Before writing anything, fully understand what the user provided.

### How to Analyze

1. **Read the entire input first.** Do not start writing mid-read.

2. **Extract every distinct requirement.** Go through the user's text and pull out everything that describes:
   - What should exist (a component, feature, system)
   - How something should behave (actions, triggers, flows)
   - What something should look like (layout, format, structure)
   - What data is involved (fields, formats, values)
   - When something should happen (conditions, timing, triggers)
   - What should NOT happen (constraints, restrictions)
   - What is optional vs. required

3. **Preserve user language.** If the user says "widget," your output says "widget" — not your own synonym.

4. **Capture implicit requirements.** If the user says "15-minute intervals from 12:00 AM to 11:45 PM," the implicit requirement is 96 time slots. Include both the user's statement AND any derived facts.

5. **Separate conditional logic.** Extract conditional rules as their own requirements with conditions clearly stated.

### Mental Checklist Before Structuring

- [ ] All components/features mentioned
- [ ] All behaviors and flows described
- [ ] All data rules and formats
- [ ] All conditional behaviors
- [ ] All optional vs. required distinctions
- [ ] All constraints and boundaries

---

## Phase 2: Gap & Ambiguity Assessment

After analysis, determine what's missing vs. what's unclear.

### Gaps (User didn't mention it)

**Rule: Do NOT fill gaps with assumptions.**

If the user didn't mention error handling, don't add it. If they didn't mention responsiveness, don't add it. The only exception: if a gap makes the prompt fundamentally incomplete or contradictory, note it in a "Clarification Needed" section — but still don't guess the answer.

**When to flag a gap:**
- Two described features could conflict with no stated priority
- A flow references data that was never defined
- A critical path has a missing step

**When to leave it out (don't flag):**
- User didn't mention error handling → don't add it
- User didn't mention loading states → don't add it
- User didn't mention edge cases → don't add them

### Ambiguities (User mentioned it but it's unclear)

**Rule: Note it as "To Be Clarified."**

Never resolve ambiguity by guessing. Add a clearly marked note for anything unclear.

---

## Phase 3: Elaboration

This is the core of what this skill does — taking terse or rough input and expanding it into detailed, structured requirements.

### Elaboration Rules

1. **Expand, don't invent.** Take what the user said and make it more detailed and specific. Do NOT add new scope, features, or behaviors.

2. **One requirement per point.** Don't lump unrelated things together.

3. **Use numbered sub-requirements.** Makes it easy to reference and check off items.

4. **Group related requirements.** Related items belong in the same section with clear sub-sections.

5. **Order by logical flow.** Structure the output in a natural sequence: context → components → behaviors → data → constraints.

6. **Tables for summaries.** End with a table listing every component and key details.

7. **Constraints at the end.** Capture all boundaries and "do not assume" items.

### How to Elaborate Without Inventing

The difference between elaboration and invention:

- **Elaboration**: User says "a date picker" → You write "A date picker component that allows the user to select a date" (same scope, more explicit)
- **Invention**: User says "a date picker" → You write "A date picker with min/max date validation, disabled dates, and keyboard navigation" (added features the user never mentioned)

- **Elaboration**: User says "show available times" → You write "Display available time slots to the user for selection"
- **Invention**: User says "show available times" → You write "Show available times with color-coded availability levels and conflict warnings"

**The test**: Can you trace every word back to the user's input? If not, you invented it.

### Writing Rules

1. **Be specific, not general.**
   - BAD: "Show available time slots"
   - GOOD: "Show time slots in 15-minute intervals from 12:00 AM to 11:45 PM (96 total slots per day)"

2. **State the rule AND the behavior.**
   - BAD: "Handle today's date differently"
   - GOOD: "If the user selects today's date, only show time slots that are in the future from the current time."

3. **Make optional things explicitly optional.**
   - BAD: "The user can also schedule a restore"
   - GOOD: "The Restore Scheduler is OPTIONAL. If the user skips it, only the Price Change gets scheduled."

4. **Enumerate when the user enumerates.** Don't add to their lists. Don't remove from their lists.

5. **Use the user's exact terminology.** Always.

6. **State post-action behavior.** If the user described what happens after an action, capture it explicitly.

---

## Phase 4: Self-Check (Anti-Hallucination Checklist)

Before delivering, run through this checklist:

### Traceability Check
- [ ] Every section maps to something the user said
- [ ] I can point to the user's exact words for every requirement
- [ ] I did not add any feature or behavior the user didn't describe

### Accuracy Check
- [ ] All numbers match (intervals, counts, ranges)
- [ ] All conditional logic is correctly captured
- [ ] The user's terminology is preserved throughout

### Completeness Check
- [ ] Every requirement from the input appears in the output
- [ ] No requirement was accidentally merged into another
- [ ] Optional features are clearly marked as optional
- [ ] The summary table covers all components

### Omission Check
- [ ] I did NOT add error handling the user didn't describe
- [ ] I did NOT add tech stack assumptions
- [ ] I did NOT add "nice to have" features
- [ ] I did NOT add architecture recommendations
- [ ] I did NOT add suggestions beyond what the user described

### Contradiction Check
- [ ] Nothing contradicts the user's input
- [ ] The flow is logically consistent
- [ ] Conditional rules don't conflict with each other

---

## Handling Different Input Types

### When the input is very brief
Extract what you can, structure it clearly, and add "[Clarification Needed]" tags for significant gaps.

### When the input is very detailed
Follow it to the letter. Don't simplify or summarize. Every detail is a requirement.

### When the user asks to improve an existing prompt
Re-read the original, apply the elaboration methodology, and restructure. Don't lose any original requirements.

### When the user specifies a tech stack
Then and only then include tech-specific details. Don't add adjacent tools they didn't mention.

### When the input has conflicting statements
Flag the conflict explicitly. Do not silently resolve it. Present both and note the contradiction.
