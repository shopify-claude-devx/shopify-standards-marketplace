# Prompt Template

Use this as the starting structure for every generated prompt. Adapt sections as needed — remove sections that don't apply, add sections if the user's requirements demand it. The goal is clarity and completeness, not rigid adherence to a template.

---

## Template Structure

```markdown
# Prompt: [Action Verb] [Feature Name] for [Context]

---

## Overview

[1-3 sentences summarizing what is being built/implemented. Derived entirely from the user's description. No embellishments.]

---

## [Section Number]. [Component/Feature Name]

[Description of this component exactly as the user described it.]

### [Sub-feature or Behavior]

- [Specific requirement 1]
- [Specific requirement 2]
- [Conditional rule, if any]

### [Another Sub-feature or Behavior]

- [Specific requirement]

---

## [Section Number]. [Next Component/Feature Name]

[Continue for each distinct component or feature the user described.]

---

## [Section Number]. [UI/UX Behaviors] (if applicable)

[Describe any specific visual behaviors, animations, transitions, or layout details the user mentioned.]

---

## [Section Number]. [User Flows] (if applicable)

[Describe the step-by-step user journey if the user described a multi-step process.]

Step 1: [User does X]
Step 2: [System shows Y]
Step 3: [User selects Z]
→ Result: [What happens]

---

## [Section Number]. [Data Rules / Formats] (if applicable)

[If the user specified data formats, enumerated lists, value ranges, time intervals, or similar — capture them here in full.]

---

## [Section Number]. [CRUD Operations] (if applicable)

[If the user described Create, Read, Update, Delete capabilities — detail each one.]

### Create
- [What can be created, with what fields]

### Read / View
- [What can be viewed, where, and how]

### Edit / Update
- [What can be edited, which fields, with what rules]

### Delete
- [What can be deleted, any confirmation rules]

---

## Summary of All Components

| # | Component | Description |
|---|-----------|-------------|
| 1 | [Name] | [Brief description] |
| 2 | [Name] | [Brief description] |
| ... | ... | ... |

---

## Constraints

- [List every constraint the user mentioned]
- [List every "do not assume" boundary]
- [State: No assumptions about tech stack — implement based on the existing app's current setup (unless user specified a stack)]
- [State: No hallucinated features — only implement exactly what is described above]
- [Include any timezone, locale, or platform constraints the user mentioned]

---

## Clarification Needed (if any)

- [List any ambiguities or gaps that could not be resolved from the user's input]
- [Remove this section entirely if there are no clarifications needed]
```

---

## Template Usage Rules

1. **The title** should be a clear action phrase: "Implement X Feature for Y" or "Build X System with Y Capabilities."

2. **The overview** is 1-3 sentences MAX. It's a summary, not a sales pitch.

3. **Section numbers** should be sequential. They help developers track progress.

4. **Section names** should use the user's terminology, not your own abstractions.

5. **The summary table** is mandatory. It serves as a quick-reference checklist.

6. **The constraints section** is mandatory. At minimum it should state "no assumptions" and "no hallucinations" if the user requested those.

7. **The clarification section** is only included when there are actual ambiguities. Never pad it with hypothetical questions.

8. **Remove unused sections.** If the user didn't describe animations, don't include an empty "UI/UX Behaviors" section. If there are no CRUD operations, remove that section.

---

## Adapting the Template

The template is a starting point. Real-world prompts vary:

- **Simple feature**: May only need Overview + 3-4 sections + Summary + Constraints
- **Complex system**: May need 10+ sections with deep sub-sections
- **UI-heavy feature**: May need detailed wireframe-like descriptions in text
- **Data-heavy feature**: May need enumerated data formats, sample values, or formula definitions
- **Workflow-heavy feature**: May need flowchart-style step descriptions

Match the structure to what the user described. The template serves you — you don't serve the template.
