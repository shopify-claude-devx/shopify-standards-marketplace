# Interview Guide

Before generating any new Skill, you must interview the user. There is **no fixed limit** on the number of questions. Ask as many as needed until you have full clarity on what the Skill should do, when it should trigger, what it should produce, what rules it should follow, and what it should avoid. The goal is to gather enough information to build the Skill without making a single assumption.

---

## Interview Principles

1. **Ask until clear.** There is no cap on questions. If the user's request is simple and clear, you might need 3 questions. If it's complex and ambiguous, you might need 15. The number is determined by what you don't yet know — not by an arbitrary limit.

2. **Questions must be specific to the user's request.** If someone says "build me a skill for writing API docs," your questions should be about API doc writing — not generic skill-building questions.

3. **Never ask what you already know.** If the user already told you the trigger, don't ask about the trigger. If they described the output format, don't ask about the output format.

4. **Ask about what's missing, not what's present.** Your questions fill gaps — they don't confirm what the user already said.

5. **Each question should unlock a design decision.** If the answer wouldn't change how you build the Skill, don't ask it.

6. **Group related questions together.** Don't scatter questions across many back-and-forth exchanges when you can group related ones in a single turn to respect the user's time.

7. **It's okay to ask follow-up questions.** If the user's answer to a question opens up new ambiguities, ask about those too. This is not "interviewing indefinitely" — it's doing the job right.

---

## Question Categories

Scan ALL categories below against the user's input. For any category the user hasn't already addressed, ask about it. Skip categories the user already covered.

### Category 1: Trigger & Scope

Use when: The user described WHAT the skill does but not clearly WHEN it should activate or what its boundaries are.

Question patterns:
- "What phrases or situations should trigger this skill?"
- "Should this Skill handle [edge case A] or is that out of scope?"
- "Are there similar tasks this Skill should NOT handle?"
- "Should it trigger automatically when Claude detects relevance, or only when you explicitly invoke it?"

### Category 2: Output Format & Delivery

Use when: The user hasn't specified what the Skill should produce or how it should be delivered.

Question patterns:
- "What should the Skill produce — a Markdown file, Word doc, code files, ZIP package, or something else?"
- "Should the output follow a specific structure or template, or adapt based on the input?"
- "How detailed should the output be — brief and scannable, or comprehensive and thorough?"
- "Where should the output be saved?"

### Category 3: Process & Behavior

Use when: The user described the goal but not HOW Claude should approach it.

Question patterns:
- "Should Claude follow a specific step-by-step process, or just aim for the end result?"
- "Are there specific rules or constraints Claude must follow every time?"
- "Should Claude ask clarifying questions during execution, or just generate and let you iterate?"
- "Are there any intermediate steps or checkpoints that should happen before the final output?"

### Category 4: Quality Standards & Anti-Patterns

Use when: The user cares about quality but hasn't defined what "good" and "bad" look like.

Question patterns:
- "What does a GOOD output from this Skill look like? Any examples or characteristics?"
- "What should the Skill NEVER do? Any specific anti-patterns or mistakes to avoid?"
- "Are there specific words, phrases, styles, or approaches the Skill should avoid?"
- "How should the Skill handle edge cases or errors?"

### Category 5: Reference Material & Context

Use when: The Skill might need supporting documentation, examples, or data.

Question patterns:
- "Does this Skill need any reference material — style guides, specs, example outputs, data files?"
- "Should Claude reference any external documentation or standards while executing this Skill?"
- "Do you have examples of good/bad outputs you could share for calibration?"
- "Are there any existing documents, templates, or resources the Skill should use?"

### Category 6: Complexity & Structure

Use when: You need to decide how to structure the Skill package.

Question patterns:
- "Is this a simple, focused Skill (one SKILL.md would cover it), or does it involve multiple complex workflows that might need reference files?"
- "Should the Skill include any executable scripts, or is it purely instruction-based?"
- "Are there different modes or scenarios the Skill should handle differently?"

### Category 7: Target Environment

Use when: The user hasn't specified where they'll use the Skill.

Question patterns:
- "Where will you primarily use this Skill — Claude.ai, Claude Code, the API, or multiple places?"
- "Does the Skill need network access to function?"
- "Are there specific packages or tools the Skill depends on?"

### Category 8: Iteration & Maintenance

Use when: Relevant for complex or evolving Skills.

Question patterns:
- "Should the Skill handle updates or revisions to its own output?"
- "Will this Skill evolve over time, or is it a one-time setup?"
- "Should the Skill work alongside other Skills you have?"

---

## Interview Flow

1. **Acknowledge what the user described.** Briefly restate what you understood from their initial input (2-3 sentences max). This confirms alignment before asking questions.

2. **Scan all categories.** Identify which categories the user hasn't covered.

3. **Ask your questions.** Group related ones together. Use a structured format so the user can answer efficiently. There is no cap — ask everything you need.

4. **Evaluate the answers.** If answers introduce new ambiguities or reveal more complexity than initially apparent, ask follow-up questions. This is expected and correct.

5. **Confirm when you have enough.** When you're confident you can build the Skill without any assumptions, say so and proceed to generation.

---

## When You Naturally Need Fewer Questions

- The user's initial description is already very detailed and covers most categories.
- The Skill is simple and focused (e.g., "a skill that applies my brand colors to documents — here are the colors...").
- The user provided an example of an existing Skill they want replicated or adapted.

In these cases, you'll naturally have fewer gaps to fill — so you'll ask fewer questions. This is not a "limit" — it's just the result of the user already giving you what you need.

## When You Naturally Need More Questions

- The user's description is brief or vague.
- The Skill involves complex logic, multiple modes, or conditional workflows.
- The Skill could mean very different things depending on interpretation.
- The Skill interacts with other systems, tools, or Skills.
- The domain is specialized and you need to understand the user's specific context.

In these cases, ask everything you need. The user asked for thoroughness — give it to them.

---

## Anti-Patterns in Interviewing

- **Don't ask leading questions.** "Wouldn't it be great if the Skill also did X?" → This is a suggestion, not a question. You're adding something the user didn't ask for.
- **Don't ask yes/no questions when open-ended is better.** "Should it handle errors?" → Better: "How should it handle edge cases — flag them, skip them, or ask you?"
- **Don't ask about implementation details the user doesn't care about.** "Should it use Python or JavaScript?" → This is the Skill author's concern, not the user's (unless the user brought it up).
- **Don't repeat the user's words back as a question.** "You said it should write prompts — should it write prompts?" → Waste of a question.
- **Don't ask hypothetical questions.** "What if someone tries to use this for X?" → Only ask about real scenarios the user described or implied.
- **Don't ask the same question in different words.** Each question must seek genuinely new information.
- **Don't ask questions you can answer from the user's input.** Re-read their description before asking — the answer might already be there.