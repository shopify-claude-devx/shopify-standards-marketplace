---
description: Execute a plan by building TODO by TODO. Use after /plan when the execution plan is confirmed. Follows project standards strictly.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Build — Plan Execution

You are entering the Build phase. Your job is to execute the confirmed plan, TODO by TODO, following project standards precisely. Building is disciplined execution, not creative improvisation.

## Input
The task or plan to build: `$ARGUMENTS`

## Pre-Build Checks

### Check 1: Does a Plan Exist?
Look for a confirmed execution plan in the current conversation. If no plan exists:

> ⚠️ No execution plan found. Building without a plan leads to directionally incorrect code.
> Please run `/plan` first to create an execution plan, then return to `/build`.

Do NOT proceed without a plan unless the user explicitly overrides this.

### Check 2: Load Project Standards — MANDATORY
Before writing ANY code, you MUST re-read the following files — even if you read them during `/plan`. Planning discussion may have pushed details out of focus. You need these rules fresh before writing code. Do NOT skip this step:

1. Read `CLAUDE.md` for project overview
2. Read EVERY skill file listed below — these are your MANDATORY coding standards:
   - `liquid-standards` — Liquid variable naming, tag style, render vs include, whitespace control, filters, null checks
   - `css-standards` — BEM naming, section scoping, property ordering, responsive breakpoints, CSS variables
   - `section-standards` — Section file structure (CSS → HTML → JS → Schema), wrapper class, block rendering via snippets
   - `section-schema-standards` — Schema structure order, setting IDs (snake_case with context prefix), labels (Title Case), block type/name conventions
   - `js-standards` — Vanilla JS only, defer loading, DOMContentLoaded, Web Components, NO inline styles/DOM creation/price formatting/inline scripts
   - `theme-architecture` — File structure, kebab-case naming, when to create snippets, section independence

**Conditional — if this task involves a Figma design:**
   - `figma-to-code` — React+Tailwind to Liquid+CSS translation, Figma layer to schema mapping, responsive patterns, asset handling, Figma gotchas

**If you cannot find or read a skill file, STOP and tell the user.** Do not proceed with partial standards.

Every line of code you write must align with these standards. Violations are build failures.

## Build Process

### Execute TODO by TODO
Work through the plan's TODOs in order. For each TODO:

1. **State what you're about to do** — one line announcing the current TODO

2. **Identify which skills apply to this TODO's files:**
   - `.liquid` files → apply `liquid-standards` rules
   - Section `.liquid` files → apply `section-standards` + `section-schema-standards` + `liquid-standards`
   - `.css` files or files with class names → apply `css-standards` rules
   - `.js` files → apply `js-standards` rules
   - Creating/organizing files → apply `theme-architecture` rules
   - **You MUST name the skills that apply before writing code for each TODO**

3. **Write the code** — following the plan's approach and the applicable skill standards

4. **Per-file validation before moving on** — run the relevant checklist against EACH file you just wrote:

#### Liquid File Checklist (EVERY .liquid file):
- [ ] Variables use `snake_case`
- [ ] Logic blocks use `{% liquid %}` tag (3+ lines of logic)
- [ ] Uses `{% render %}` not `{% include %}`
- [ ] Snippets have `{% doc %}` tags
- [ ] Null/blank checks on all variables before output
- [ ] Whitespace control `{%-` `-%}` on logic tags
- [ ] `| escape` on user-generated content
- [ ] Liquid comments, not HTML comments

#### Section File Checklist (EVERY section .liquid file):
- [ ] File order: CSS → HTML → JS → Schema
- [ ] Wrapper `<div>` class matches section filename
- [ ] Blocks rendered via `{% render %}` snippets (NEVER inline HTML)
- [ ] `case/when` for multiple block types
- [ ] Schema has: name, class, settings, blocks, presets (in that order)
- [ ] Setting IDs: `snake_case` with section/block context prefix
- [ ] Setting labels: Title Case, section-specific (never generic)
- [ ] Block type: kebab-case, block name: Title Case
- [ ] At least one preset defined

#### CSS File Checklist (EVERY .css file):
- [ ] BEM naming: `.section-name__element--modifier`
- [ ] All selectors scoped to section parent class
- [ ] Property order: Layout → Flex/Grid → Sizing → Spacing → Typography → Visual → Effects → Responsive
- [ ] Mobile-first (base = mobile, breakpoints for larger)
- [ ] Standard breakpoints only (320/360/475/768/1024/1280/1536)
- [ ] CSS custom properties for theme-wide values
- [ ] Dynamic schema values via `style` attribute + CSS custom properties

#### JS File Checklist (EVERY .js file):
- [ ] Vanilla JS only — no frameworks, no jQuery
- [ ] Separate asset file — no inline `<script>` tags
- [ ] Uses `defer` on script tag
- [ ] `DOMContentLoaded` initialization (or Web Component if reusable)
- [ ] Liquid values passed via `data-` attributes, not inline
- [ ] NO `element.style` — use `classList.add/remove` instead
- [ ] NO `innerHTML` for creating elements — Liquid handles markup
- [ ] NO price formatting in JS — use Liquid `| money` filter

#### Figma Translation Checklist (EVERY file built from a Figma design — only when task involves a Figma design):
- [ ] All Tailwind classes converted to BEM CSS — no Tailwind in output
- [ ] All React patterns converted to Liquid — no JSX in output
- [ ] Auto-layout translated to flexbox/grid — not absolute positioning
- [ ] Base CSS matches the mobile Figma frame (mobile-first)
- [ ] Breakpoint CSS matches the desktop Figma frame
- [ ] Image layers use `image_picker` settings with alt text
- [ ] Responsive images use `<picture>` or `image_url` with width parameters
- [ ] Repeating elements use section blocks — not hardcoded repetitions
- [ ] Design tokens mapped to CSS custom properties
- [ ] Typography uses rem (converted from Figma px)

**If ANY file fails a checklist item, fix it NOW before moving to the next TODO.**

5. **Move to the next TODO**

### If You Encounter a Problem During Building
Things the plan didn't anticipate will come up. Handle them based on severity:

**Minor (doesn't change the approach):**
Solve it inline, note what you did and why. Continue building.

**Medium (changes a TODO but not the overall approach):**
Pause, explain the issue to the user, propose the adjustment, get confirmation, then continue.

**Major (invalidates the plan's approach):**
Stop building. Explain what you found and why the plan needs revision. Suggest the user run `/plan` again with this new information.

## Code Quality During Build

While building, always:

- **Follow the project skills** — not generic best practices, YOUR project's conventions
- **Write code as if someone else will maintain it** — clear naming, logical structure, helpful comments only where intent isn't obvious
- **Reuse existing patterns** — if the codebase already has a way of doing something, follow it
- **Don't over-engineer** — build exactly what the plan calls for, nothing more
- **Don't leave TODOs in code** — if something needs future work, note it separately

## Post-Build

After completing all TODOs, provide a brief summary:

```
## Build Complete

**TODOs Completed:** [X/X]

**Files Created/Modified:**
- `path/to/file` — [what was done]

**Per-File Validation:** [All passed / Issues found and fixed during build]

**Any Deviations from Plan:**
- [What changed and why, or "None"]

**Ready for Assessment:**
Run `/assess` to validate the output and review code quality.
```

## Rules
- Never deviate from the plan's approach without user approval
- Never add features or enhancements not in the plan
- Always follow project skill standards over generic conventions
- Always validate each file against skill checklists before moving to the next TODO
- If a TODO is unclear, ask — don't guess
- Build incrementally — complete one TODO fully before starting the next