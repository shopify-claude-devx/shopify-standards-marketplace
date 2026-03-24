# Prompt Generation Methodology

This document is the complete methodology for generating implementation-ready prompts. Read this fully before writing any prompt. No exceptions.

---

## Phase 1: Requirement Extraction

Before writing a single line of the output prompt, you must extract and catalog every requirement from the user's input.

### How to Extract

1. **Read the entire user input first.** Do not start writing mid-read.

2. **Line-by-line extraction.** Go through the user's input and pull out every distinct requirement. A "requirement" is anything that describes:
   - What should exist (a button, a page, a feature)
   - How something should behave (click this → see that)
   - What something should look like (placement, layout, animation)
   - What data should be shown (fields, formats, lists)
   - When something should happen (triggers, conditions, timing)
   - What should NOT happen (constraints, restrictions, exclusions)
   - What is optional vs. required

3. **Preserve user language.** If the user says "Bubble," your extracted requirement says "Bubble" — not "notification badge" or "floating indicator." The user's terminology is the source of truth.

4. **Capture implicit requirements.** If the user says "show time frames from 12:00 AM to 11:45 PM in 15-minute gaps," the implicit requirement is that there are exactly 96 time slots per day. Calculate and verify this, then include both the user's statement AND the derived fact.

5. **Separate conditional logic.** If the user says "for today's date, don't show past times" — that's a conditional rule. Extract it as its own requirement with the condition clearly stated.

### Extraction Output

Before structuring the prompt, create a mental checklist of:
- [ ] All UI components mentioned
- [ ] All user flows described
- [ ] All data rules and formats
- [ ] All conditional behaviors
- [ ] All optional vs. required features
- [ ] All pages/screens mentioned
- [ ] All CRUD operations (create, read, update, delete) mentioned

---

## Phase 2: Gap Analysis

After extraction, determine what's missing vs. what's ambiguous.

### Gaps (User didn't mention it at all)

**Rule: Do NOT fill gaps with assumptions.**

If the user never mentioned error handling, don't add an error handling section. If the user never mentioned responsive design, don't add responsive design requirements. If the user never mentioned authentication, don't add authentication.

The only exception: If a gap would make the prompt fundamentally incomplete or contradictory, you may note it in a "Clarification Needed" section — but still do NOT guess the answer.

Examples of when to flag a gap:
- User describes editing a schedule but never mentions what happens to in-progress executions
- User describes two features that could conflict but doesn't say which takes priority
- User describes a flow that references data they never defined

Examples of when to NOT flag a gap (just leave it out):
- User doesn't mention error messages → don't add error message specs
- User doesn't mention loading states → don't add loading state specs
- User doesn't mention mobile responsiveness → don't add mobile specs

### Ambiguities (User mentioned it but it's unclear)

**Rule: Ask for clarification OR note it as "To Be Clarified."**

Never resolve ambiguity by guessing. If you can't ask (e.g., you're writing the prompt in one shot), add a clearly marked "Clarification Needed" note inline or at the end.

---

## Phase 3: Structuring the Prompt

Use the template at `templates/PROMPT_TEMPLATE.md` as your base structure. Adapt it to fit the specific requirements.

### Structuring Rules

1. **One requirement per section (when possible).** Don't lump unrelated things together.

2. **Use numbered sub-requirements within sections.** This makes it easy for a developer to check off items during implementation.

3. **Group related requirements.** If the user described a "Schedule Selector" with both a Date Picker and Time Picker, they belong in the same section with clear sub-sections.

4. **Order by user flow.** Structure the prompt in the order a user would experience the feature. Trigger → Action → Result → Edge Cases.

5. **Tables for component summaries.** End with a table that lists every component, what it does, and key details.

6. **Constraints section at the end.** Capture all "do not assume" boundaries.

### Section Depth Rules

- **Top-level sections** = Major features or areas (e.g., "Schedule Button," "Date Picker," "Schedule Page")
- **Sub-sections** = Specific behaviors within a feature (e.g., "Today's Date Rule," "Future Date Rule")
- **Bullet points / numbered lists** = Individual requirements or specifications
- **Code blocks or literal values** = Exact data (time slots, formats, enumerations)

---

## Phase 4: Writing the Requirements

### Writing Rules

1. **Be specific, not general.**
   - BAD: "Show available time slots"
   - GOOD: "Show time slots in 15-minute intervals from 12:00 AM to 11:45 PM (96 total slots per day)"

2. **State the rule AND the behavior.**
   - BAD: "Handle today's date differently"
   - GOOD: "If the user selects today's date, only show time slots that are in the future from the current time. All past time slots for today must be hidden/removed."

3. **Make optional things explicitly optional.**
   - BAD: "The user can also schedule a restore"
   - GOOD: "The Restore Scheduler is OPTIONAL. If the user skips it, only the Price Change gets scheduled."

4. **Enumerate when the user enumerates.**
   - If the user listed out specific time slots, list them in the prompt.
   - If the user described exactly which actions are available (Edit, Delete), list exactly those — don't add "Archive" or "Duplicate" because they seem useful.

5. **Use the user's exact terminology.**
   - If they said "Bubble," write "Bubble"
   - If they said "Schedule Selector," write "Schedule Selector"
   - If they said "Prompt," write "Prompt"

6. **Describe animations/interactions exactly as the user described them.**
   - BAD: "Notifications should animate"
   - GOOD: "Schedules slide in and slide out one by one (rotating/cycling through them)"

7. **State post-action behavior.**
   - If the user said "after scheduling, the prompt should get submitted and the app should work the same," capture that exactly.

---

## Phase 5: Self-Check (Anti-Hallucination Checklist)

Before delivering the prompt, run through this checklist:

### Traceability Check
- [ ] Every section in my prompt maps to something the user said
- [ ] I can point to the user's exact words for every requirement I wrote
- [ ] I did not add any feature, behavior, or screen the user didn't describe

### Accuracy Check
- [ ] All numbers match (time intervals, counts, ranges)
- [ ] All conditional logic is correctly captured (today vs. future dates, optional vs. required)
- [ ] The user's terminology is preserved throughout

### Completeness Check
- [ ] Every requirement from Phase 1 extraction appears in the prompt
- [ ] No requirement was accidentally merged into another
- [ ] Optional features are clearly marked as optional
- [ ] The summary table covers all components

### Omission Check
- [ ] I did NOT add error handling the user didn't describe
- [ ] I did NOT add tech stack assumptions
- [ ] I did NOT add "nice to have" features
- [ ] I did NOT add architecture recommendations
- [ ] I did NOT add UX suggestions beyond what the user described

### Contradiction Check
- [ ] Nothing in my prompt contradicts anything the user said
- [ ] The flow is logically consistent from start to end
- [ ] Conditional rules don't conflict with each other

---

## Handling Edge Cases

### When the user's input is very brief
- Extract what you can, structure it clearly, and either:
  - Ask clarifying questions before generating (preferred), OR
  - Generate the prompt with clearly marked "[Clarification Needed]" tags for the gaps

### When the user's input is very detailed
- Follow it to the letter. Don't simplify. Don't summarize. Every detail they gave you is a requirement.

### When the user references their existing app
- Do NOT assume what the existing app looks like or how it works. Only describe what the user told you. Use phrases like "integrates with the existing [X]" without specifying implementation.

### When the user asks to update a previously generated prompt
- Re-read the original prompt, apply the changes the user described, and regenerate. Do not lose any original requirements that the user didn't ask to remove.

### When the user specifies a tech stack
- Then and ONLY then include tech-specific details. Match the stack they named. Don't add adjacent tools they didn't mention.

### When the user gives conflicting requirements
- Flag the conflict explicitly. Do not silently resolve it. Present both requirements and note the contradiction for clarification.
