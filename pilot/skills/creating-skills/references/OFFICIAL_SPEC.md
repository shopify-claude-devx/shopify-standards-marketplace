# Official Agent Skills Specification

This document contains constraints, rules, and best practices sourced directly from Anthropic's official documentation:
- https://code.claude.com/docs/en/skills
- https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
- https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- https://support.claude.com/en/articles/12512198-how-to-create-custom-skills
- https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills

Every Skill you create or update must comply with everything in this file.

---

## Required File: SKILL.md

Every Skill must contain a `SKILL.md` file at the root of the Skill folder. This is the only mandatory file.

### YAML Frontmatter (Required)

The SKILL.md must start with valid YAML frontmatter:

```yaml
---
name: my-skill-name
description: A clear third-person description of what this skill does and when to use it.
---
```

### Field Rules

**name** (required)
- Maximum: 64 characters
- Must contain only lowercase letters, numbers, and hyphens
- Cannot contain XML tags
- Cannot contain reserved words: "anthropic", "claude"
- Must match the Skill folder name
- Gerund form preferred (e.g., `processing-pdfs`, `analyzing-spreadsheets`, `writing-documentation`)
- Acceptable alternatives: noun phrases (`pdf-processing`), action-oriented (`process-pdfs`)
- Avoid vague names: `helper`, `utils`, `tools`, `documents`, `data`, `files`

**description** (required)
- Maximum: 1024 characters
- Must be non-empty
- Cannot contain XML tags
- Must be written in **third person** (not first or second person)
  - Good: "Processes Excel files and generates reports"
  - Bad: "I can help you process Excel files"
  - Bad: "You can use this to process Excel files"
- Must clearly state WHAT the Skill does AND WHEN to use it
- Should include specific trigger phrases or contexts
- This is the single most important field — Claude uses it to decide when to invoke the Skill from potentially 100+ available Skills

**dependencies** (optional)
- Software packages required by the Skill
- Format: comma-separated with version constraints
- Example: `python>=3.8, pandas>=1.5.0`

### Description Formula

`[What the Skill does in third person] + [When to trigger it / trigger phrases / contexts]`

Good examples:

```
Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
```

```
Analyze Excel spreadsheets, create pivot tables, generate charts. Use when analyzing Excel files, spreadsheets, tabular data, or .xlsx files.
```

```
Generate descriptive commit messages by analyzing git diffs. Use when the user asks for help writing commit messages or reviewing staged changes.
```

Bad examples:

```
Helps with documents
```

```
Processes data
```

```
Does stuff with files
```

---

## SKILL.md Body

The markdown body after the frontmatter is the second level of progressive disclosure. Claude reads this after deciding the Skill is relevant based on the frontmatter.

Rules:
- Keep the body under **500 lines** for optimal performance
- Only include context Claude doesn't already have — Claude is already very smart
- Split content into separate files when approaching the 500-line limit
- The body should include:
  - Clear explanation of what the Skill does
  - Step-by-step instructions Claude should follow
  - Rules and constraints
  - Output format specifications
  - What to avoid / hard rules

### Conciseness Principle

For every piece of information, ask:
- "Does Claude really need this explanation?"
- "Can I assume Claude knows this?"
- "Does this paragraph justify its token cost?"

---

## Progressive Disclosure — Three Levels

| Level | When Loaded | Token Cost | Content |
|-------|-------------|------------|---------|
| Level 1: Metadata | Always (at startup) | ~100 tokens per Skill | `name` and `description` from YAML frontmatter |
| Level 2: Instructions | When Skill is triggered | Under 5k tokens | SKILL.md body with instructions and guidance |
| Level 3: Resources | As needed during execution | Effectively unlimited | Bundled files — read via bash only when referenced |

Structure content so Claude loads only what it needs at each level.

---

## Optional Files and Folders

### references/ Folder

**When to include:** Only when the Skill needs deep documentation, methodology guides, style references, data lookups, or specifications that would push SKILL.md beyond 500 lines.

**When NOT to include:** If SKILL.md alone can contain all necessary instructions clearly and concisely.

**Critical rule: References must be ONE LEVEL DEEP from SKILL.md.** All reference files must link directly from SKILL.md. Do not reference files from within other reference files — Claude may only partially read nested references.

Bad (too deep):
```
SKILL.md → advanced.md → details.md → actual-info.md
```

Good (one level deep):
```
SKILL.md → advanced.md
SKILL.md → reference.md
SKILL.md → examples.md
```

### templates/ Folder

**When to include:** Only when the Skill produces structured output that follows a consistent format, and that format is complex enough to warrant its own file.

**When NOT to include:** If the output format can be described in a few lines within SKILL.md.

### scripts/ Folder

**When to include:** Only when the Skill requires executable code (data processing, file manipulation, validation, etc.). Scripts execute without loading into context — only their output enters the context window.

**When NOT to include:** If the Skill is purely instruction-based.

Rules for scripts:
- Never hardcode API keys, passwords, or secrets
- Use standard packages available in Claude's environment
- Python and JavaScript/Node.js are the primary supported languages
- Scripts provide deterministic reliability that token-based generation cannot

---

## Packaging Rules

### ZIP Structure

The ZIP must contain the Skill folder as its root — NOT loose files.

Correct:
```
my-skill.zip
└── my-skill/
    ├── SKILL.md
    ├── references/
    │   └── METHODOLOGY.md
    └── templates/
        └── OUTPUT_TEMPLATE.md
```

Incorrect:
```
my-skill.zip
├── SKILL.md          ← files directly at ZIP root = WRONG
├── references/
└── templates/
```

### Folder Name
- Must match the `name` field in the frontmatter
- Lowercase letters, numbers, hyphens only

### File Naming
- SKILL.md — always uppercase, always this exact name
- Reference files — UPPERCASE.md (e.g., METHODOLOGY.md, STYLE_GUIDE.md)
- Template files — UPPERCASE_NAME.md (e.g., PROMPT_TEMPLATE.md)
- Script files — lowercase with appropriate extension (e.g., process.py, validate.js)

---

## Validation Checklist

Before packaging any Skill, verify every item:

### Frontmatter
- [ ] YAML frontmatter starts with `---` and ends with `---`
- [ ] `name` field exists and is ≤64 characters
- [ ] `name` contains only lowercase letters, numbers, and hyphens
- [ ] `name` does not contain "anthropic" or "claude"
- [ ] `name` matches the Skill folder name
- [ ] `description` field exists and is ≤1024 characters
- [ ] `description` is non-empty
- [ ] `description` does not contain XML tags
- [ ] `description` is written in third person
- [ ] `description` clearly states what the Skill does AND when to trigger it

### Files & Structure
- [ ] SKILL.md exists at the Skill folder root
- [ ] SKILL.md body is under 500 lines
- [ ] Every file referenced in SKILL.md actually exists in the package
- [ ] No hardcoded API keys, passwords, or secrets in any file
- [ ] No empty folders
- [ ] References are one level deep from SKILL.md (no nesting)

### Packaging
- [ ] ZIP contains the Skill folder at root (not loose files)
- [ ] Folder name matches the `name` field in frontmatter
- [ ] ZIP file is named `[skill-name].zip`

### Quality
- [ ] Description includes trigger phrases or conditions
- [ ] Instructions are clear enough for Claude to follow without external context
- [ ] Hard rules / constraints are explicitly listed
- [ ] Output format is specified
- [ ] Content is concise — no over-explaining what Claude already knows
- [ ] No time-sensitive information that will become outdated

---

## Degrees of Freedom

Match instruction specificity to the task's fragility:

**High freedom** (text-based, flexible): When multiple approaches are valid and decisions depend on context. Give general direction.

**Medium freedom** (pseudocode, parameterized): When a preferred pattern exists but some variation is acceptable.

**Low freedom** (exact scripts, no parameters): When operations are fragile, consistency is critical, or a specific sequence must be followed. Provide exact commands.

---

## Where Skills Work

Skills are available across multiple surfaces with different capabilities:

- **Claude.ai**: Upload ZIP via Settings > Customize > Skills. Individual user only. Network access varies by settings.
- **Claude API**: Specify `skill_id` in `container` parameter. Workspace-wide. No network access. No runtime package installation.
- **Claude Code**: Place in `.claude/skills/` directory. Filesystem-based. Full network access.
- **Claude Agent SDK**: Place in `.claude/skills/`. Filesystem-based.

Skills do NOT sync across surfaces — must be uploaded separately to each.

---

## Security

- Never hardcode sensitive information (API keys, passwords, tokens)
- Review all bundled files before publishing
- Be cautious with Skills that fetch data from external URLs
- Skills that access tools (file ops, bash, code execution) can be misused if malicious
- Treat installing a Skill like installing software — only from trusted sources