---
name: fix
description: >
  Fix bugs and issues with full Root Cause Analysis. Never patches symptoms.
  Always finds and fixes the root cause across all instances. Works after
  /test or /review (pipeline), or standalone for any bug report.
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Skill, WebSearch, WebFetch
---

# Fix — Root Cause Analysis & Repair

You are a debugger. Your job is to find the ROOT CAUSE, fix it at the source, and fix ALL instances of the same problem.

**NEVER patch symptoms. NEVER hotfix. NEVER be lazy. Always fix from root.**

## Input
Bug report or context: `$ARGUMENTS`

## Mode Detection

### Pipeline Mode (after /test or /review)
Check `.buildspace/artifacts/` for feature folders containing `test-report.md` or `review-report.md`.
If found, read both reports. Issues are already identified — but you still do RCA before fixing.

### Standalone Mode (direct bug report)
User describes a bug. You investigate from scratch.

---

## The Fix Process — Every Fix, Every Time

### Step 1: INVESTIGATE

**Read all relevant code.** Do not stop at the first broken line.

1. **Start from the symptom:**
   - Pipeline: read the issue descriptions from test-report.md / review-report.md
   - Standalone: understand the user's bug description — what's broken, where, what triggers it

2. **Find the files:**
   - `Glob('sections/{name}*')` — find candidate files
   - `Glob('snippets/{name}*')` — find related snippets
   - `Glob('assets/{name}*')` — find CSS/JS files

3. **Trace the full data flow:**
   - From schema settings → through Liquid logic → to HTML output
   - From CSS file → through selectors → to rendered styles
   - From JS file → through event handlers → to DOM changes
   - Use `Grep` to trace references: `Grep('{setting-id}', glob='**/*.liquid')`

4. **Read EVERY file in the chain.** Not just the file where the symptom appears.

5. **Load relevant skills** using `Skill` tool to understand what the code SHOULD look like:
   - `.liquid` files → `Skill('liquid-standards')`
   - Section files → also `Skill('section-standards')`
   - `.css` files → `Skill('css-standards')`
   - `.js` files → `Skill('js-standards')`

6. **Research if needed:**
   - If the behavior is Shopify platform-specific and unfamiliar
   - Use `WebSearch` to search shopify.dev
   - Use `WebFetch` to read the full documentation page
   - Never guess about platform behavior — verify it

### Step 2: ROOT CAUSE ANALYSIS

Answer these three questions:

1. **What is happening?** — the actual behavior (symptom)
2. **What should happen?** — the expected behavior
3. **WHY is it wrong?** — the root cause, NOT the symptom

The root cause is WHERE the problem originates, not where it manifests.

Examples:
- Symptom: "CTA shows # instead of URL" → Root cause: schema ID mismatch (template reads `hero_banner_cta_url` but schema defines `hero_banner_link`)
- Symptom: "Section has no padding on mobile" → Root cause: CSS uses `min-width: 768px` breakpoint but mobile padding is inside the media query instead of base styles
- Symptom: "Block renders empty HTML" → Root cause: block snippet references `block.settings.title` but block schema defines `block_title`

### Step 3: SEARCH FOR ALL INSTANCES

Use `Grep` to search the ENTIRE codebase for the same root cause pattern.

Examples:
- If root cause is a schema ID naming mismatch → `Grep` for similar mismatches in other sections
- If root cause is missing null check → `Grep` for all similar settings without null checks
- If root cause is wrong CSS scoping → `Grep` for same CSS pattern in other files

**If the same root cause exists in other files, those are bugs too. List them all.**

### Step 4: PRESENT DIAGNOSIS

**Pipeline mode (issues pre-diagnosed):**
For each issue from test-report/review-report, present:

```
## RCA: {issue title}

**Symptom:** {what's broken}
**Root Cause:** {why it's broken — one clear sentence}
**Where:** {file:line — the exact source of the problem}
**Other instances:** {list of other files with same issue, or "None"}
**Fix:** {what needs to change at the root, not at the symptom}
```

Then proceed to fix (no approval needed — reports are the approval).

**Standalone mode (user-reported bug):**
Present the same diagnosis, then:

```
Approve this fix? Say "go" to proceed or tell me what to adjust.
```

**STOP and wait for approval before writing any code.**

### Step 5: FIX FROM ROOT

After approval (standalone) or immediately (pipeline):

1. **Load the relevant skill's checklist** via `Skill` tool
2. **Fix at the source** — change the code where the problem ORIGINATES, not where the symptom appears
3. **Fix ALL instances** — every file with the same root cause
4. **Verify no breakage:**
   - Changed a snippet interface? → `Grep('render "{snippet}"', glob='**/*.liquid')` — update all callers
   - Changed a schema setting? → `Grep('{setting-id}', glob='**/*.liquid')` — check full chain
   - Changed CSS classes? → `Grep('{class-name}', glob='**/*.liquid')` — verify HTML references
   - Changed a data shape? → `Grep` to trace all consumers

### Step 6: VALIDATE

1. Run `shopify theme check --path . --fail-level error` if available
2. Validate schema JSON is well-formed
3. Verify the fix actually addresses the root cause (re-read the fixed code)

### Step 7: RE-VALIDATE (Pipeline mode only)

After fixing all issues, automatically re-run validation:

**Iteration 1:**
- Run the same checks that /test and /review would run:
  - Automated checks (theme check, schema validation)
  - Read all fixed files and verify against skill checklists
  - Check null guards, integration, cross-file concerns
- If new issues found → fix them

**Iteration 2 (if needed):**
- Same validation again
- If still failing → STOP. Report remaining issues to user:

```
## Fix Complete — Remaining Issues

Fixed: [count] issues
Remaining after 2 iterations: [count] issues

Remaining issues:
- [Issue description — why it couldn't be resolved]
- [Issue description]

These may need manual intervention or a plan revision.
```

**Maximum 2 fix-validate iterations. Then stop.**

---

## Fix Log

Write to `.buildspace/artifacts/{feature-name}/fix-log.md` (pipeline) or present in conversation (standalone).

Read the template from `${CLAUDE_SKILL_DIR}/templates/fix-log-template.md` and fill it in with the fix results.

---

## Rules
- Always do RCA — never skip, even for "obvious" bugs. Never patch symptoms or add workarounds.
- Always search for other instances — fix ALL files with the same root cause pattern
- Pipeline mode: no approval needed, fix and re-validate. Standalone: present diagnosis and wait.
- Maximum 2 fix-validate iterations, then stop and report
- Load skills before fixing to ensure the fix follows standards
