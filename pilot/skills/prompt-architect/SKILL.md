---
name: prompt-architect
description: Convert rough, unstructured prompts into well-structured, actionable prompts. Use this skill when the user provides a messy, brain-dump style prompt and wants it converted into a clear, organized prompt with proper sections, criteria, and specificity. Triggers on phrases like "structure this prompt", "make this a proper prompt", "convert this to a prompt", "clean up this prompt", "create a prompt for this", "generate a prompt", or when the user shares a rough idea and asks for a structured prompt output.
---

# Prompt Architect

Transform rough, unstructured user inputs into well-structured, actionable prompts. Zero assumptions. Zero hallucinations. Only what the user provides gets structured.

## Core Principles

### 1. No Assumptions
- NEVER infer intent beyond what is explicitly stated
- NEVER add requirements, criteria, or context the user did not provide
- NEVER fill gaps with plausible-sounding content
- If information is missing and needed for structuring, ASK the user

### 2. No Hallucinations
- Every section in the output prompt must trace back to something the user said
- Do not invent tool names, documentation URLs, feature names, or technical details
- If the user references a tool/doc/concept, preserve it exactly as stated
- Do not expand acronyms or rename things unless the user explicitly clarifies

### 3. Preserve the User's Voice
- Keep the user's terminology, project names, and phrasing
- Do not replace their words with synonyms or "better" alternatives
- The structured prompt should feel like THEIR prompt, just organized

## Process

### Step 1: Extract Raw Ingredients
Read the user's rough prompt and identify these elements (only those that exist):

- **Who**: Who is the user? What is their role/context?
- **What**: What are they trying to do? What is the deliverable?
- **Where**: What tools, platforms, frameworks, or systems are involved?
- **References**: Any URLs, docs, files, or external resources mentioned
- **Criteria**: Any evaluation dimensions, quality bars, or success metrics mentioned
- **Constraints**: Any limitations, preferences, or boundaries stated
- **Goal**: The end outcome they want to achieve
- **Workflow/Pipeline**: Any sequence of steps or stages mentioned

If a category has nothing from the user's input, OMIT it entirely. Do not create placeholder sections.

### Step 2: Identify Gaps (Do Not Fill Them)
After extraction, determine:

- Are there ambiguities that would cause the prompt recipient to guess?
- Are there missing pieces that are critical for execution?
- Did the user reference something without explaining it?

If gaps exist and they are critical, ASK the user before structuring. Format questions as a concise list. Do not proceed with assumptions.

If gaps are minor (the prompt is usable without them), proceed and note them as optional clarifications at the end.

### Step 3: Structure the Prompt
Organize extracted ingredients into a clean markdown prompt using this template structure. USE ONLY THE SECTIONS THAT APPLY — not every prompt needs every section.

```markdown
# [Title derived from user's stated task]

---

## Context
[Who the user is, what they're working with, what exists already]
[Only include if the user provided this context]

---

## What I Need
[The core task/request, stated clearly]
[If the user listed specific references/docs/URLs, organize them here]

---

## [Criteria / Requirements / Assessment Dimensions]
[Only if the user specified evaluation criteria, quality dimensions, or specific aspects to cover]
[Use the user's own categories — do not invent new ones]
[Structure as numbered or headed sub-sections for clarity]

---

## Expected Output
[What the deliverable should look like — format, structure, length]
[Only include if the user stated or implied output expectations]

---

## Goal
[The end outcome — why they need this]
[Only include if stated by the user]

---

## Constraints
[Any boundaries, preferences, or limitations]
[Only include if stated by the user]

---

## Before You Start
[Any prerequisites, files to request, context to gather first]
[Include this section if the prompt requires input the user hasn't yet provided]
```

### Step 4: Validate
Before presenting the structured prompt, verify:

- [ ] Every section traces back to something the user said
- [ ] No invented content, criteria, or context exists
- [ ] URLs, names, and references are preserved exactly
- [ ] The prompt is self-contained and actionable for the recipient
- [ ] Empty/placeholder sections are removed
- [ ] The structure matches the complexity of the request (simple requests get simple prompts)

## Formatting Rules

- Use `---` horizontal rules to separate major sections for visual clarity
- Use headings (`##`, `###`) to create scannable hierarchy
- Use bold for key terms the recipient must not miss
- Use code blocks for file structures, commands, or config examples ONLY if the user provided them
- Use bullet lists for criteria and requirements — but prefer prose for context sections
- Keep the prompt in the same language the user used
- If the user's input is short and simple, the structured prompt should also be short and simple — do not over-engineer

## Anti-Patterns to Avoid

- **Inflation**: Turning a 3-line request into a 200-line prompt with invented sections
- **Synonym Substitution**: Replacing user's words with "better" alternatives
- **Template Stuffing**: Including empty sections just because the template has them
- **Assumed Expertise**: Adding technical criteria the user never mentioned
- **Over-Structuring**: Not every rough prompt needs 8 sections — sometimes 2-3 is correct
- **Meta-Commentary**: Do not explain what you did or why you structured it this way unless asked

## Output

Deliver the structured prompt as a clean markdown file. No preamble. No explanation. Just the prompt ready to be used.

If the prompt is complex (multiple dimensions, external references, multi-stage workflows), save it as a `.md` file.

If the prompt is simple (single task, few criteria), present it inline in chat.