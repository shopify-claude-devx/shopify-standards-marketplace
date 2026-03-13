# Compound Engineering: How I Ship Shopify Stores Without Writing Code — and Stay in Complete Control

**Aditya Pasikanti** · Mar 12, 2026 · 12 min read

**Tags:** shopify, claude code, ai workflow, compound engineering, theme development

---

Three client projects running simultaneously. Sections built from Figma designs in hours, not days. Every codebase following identical standards — same naming, same file structure, same patterns — across all three. Code reviewed by two AI agents before I even look at it.

I haven't written a line of Shopify theme code in months. I've shipped more, faster, and with fewer bugs than when I wrote every line myself.

Not because I handed control to AI. Because I built a system where I have *more* control than I ever did writing code manually.

---

## TL;DR

Built a structured AI development workflow I call **Compound Engineering** — six phases where each output feeds the next, standards are enforced automatically, and learnings accumulate across projects. Packaged it as a Claude Code plugin for Shopify theme development. The result: consistent, quality-controlled code across multiple simultaneous projects without writing implementation code. The developer stays in control at the decision layer — requirements, plans, approvals — while AI handles execution within defined standards.

---

## The Loop Everyone's Stuck In

Here's how most developers use AI for coding:

"Build me a wishlist feature."

AI writes some code. It doesn't work. "Fix this error." AI fixes it, breaks something else. "Now fix this." Maybe it works now, maybe it introduced a new issue. The developer has no idea what actually went wrong or if the fix is solid.

Feature eventually ships. The code is messy, the approach was improvised, half the edge cases are missing.

Next week, same developer, different feature: "Build me an add-to-cart drawer."

AI starts fresh. Different structure. Different naming conventions. Different patterns. The codebase is becoming a patchwork of AI's random decisions.

**This loop repeats for every single feature.** Every page. Every component. The developer re-explains context every time. AI doesn't learn from its mistakes. AI doesn't assess what it's delivering. AI doesn't get full clarity before it starts writing.

I lived in this loop for months before I realized: the problem isn't AI's capability. It's that there's no engineering process around it.

---

## What Is Compound Engineering?

Think about how a great engineering team works. A senior developer doesn't just start typing code when someone says "we need a wishlist." They ask questions. They understand the full picture. They look at the existing codebase. They make a plan. They execute methodically. They review their own work. They learn from what went wrong.

**Compound Engineering** is building that same discipline into AI-assisted development.

Instead of a flat loop of "prompt → code → fix → fix → fix," you create a structured pipeline where each phase produces a specific output that becomes the input for the next phase. Clarity compounds into better plans. Plans compound into disciplined builds. Builds compound into meaningful assessments. Assessments compound into targeted fixes. Fixes compound into captured learnings that make the next project better.

Nothing is thrown away. Nothing is improvised. Every phase compounds on what came before.

The name is intentional. In finance, compound interest means your gains generate more gains. In Compound Engineering, your process generates better process. The learnings from Project A make Project B faster. The patterns discovered in Feature 1 prevent mistakes in Feature 10. Quality doesn't degrade with scale — it improves.

---

## What I Was Actually Building

I build Shopify themes — custom storefronts for e-commerce brands. Each theme is a collection of sections (hero banners, product grids, testimonial carousels, FAQ accordions), each built from Liquid templates, CSS, JavaScript, and JSON schemas that power the merchant-facing theme editor.

A typical project involves 15-30 custom sections, each with its own responsive design, multiple content blocks, and schema settings. Multiply that by three concurrent client projects and you're looking at 60-90 sections that all need to follow the same code quality standards.

The problem wasn't building one section well. AI can do that. The problem was building the 47th section with the same discipline as the first — across three different projects, weeks apart, with no drift in quality or structure.

That's the problem Compound Engineering solves.

---

## The Pipeline: Six Phases, One System

I packaged Compound Engineering into a Claude Code plugin called **Shopify Theme Standards**. Six commands form the pipeline. Here's exactly what each one does — nothing more, nothing less.

### Clarify — Build the Foundation

Say I tell AI: "I want to build a wishlist feature."

In the normal workflow, AI starts writing code immediately. Maybe it uses local storage. Maybe it uses customer metafields. Maybe it handles logged-out users, maybe it doesn't. I don't know what assumptions it made until I see the output — and by then, we've already wasted time on the wrong implementation.

The Clarify command changes that. AI doesn't write code. Doesn't plan. It does one thing: builds a complete understanding of what needs to be built.

It breaks my request into categories:

- **What's Clear** — requirements I explicitly stated
- **What I'm Assuming** — inferences it's making that I need to confirm or correct
- **What I Need to Know** — specific questions about ambiguous or missing details

For the wishlist: "I understand you want a wishlist feature. I'm assuming users should be able to add and remove products, and there should be a dedicated wishlist page. What I need to know: where should wishlist data be stored — local storage or customer metafields? What happens when a wishlisted product goes out of stock? Should there be a 'move to cart' option?"

I answer. It asks follow-ups if anything is still unclear. Then it produces a **Task Spec** — a structured document with a one-sentence goal, concrete requirements, what's explicitly out of scope, and acceptance criteria.

There's a hard rule in this command: **it never suggests implementation details during clarify.** No code. No architecture decisions. Pure requirements. The how comes later.

This is where compounding begins. The Task Spec becomes the foundation that every subsequent phase references. Without it, everything downstream is built on assumptions.

### Plan — Compound Understanding

This is where Compound Engineering starts showing its power. Plan doesn't generate a generic implementation outline. It does something fundamentally different.

**First, it loads every coding standard I've defined.** This is a hard gate — the command reads every skill file before writing a word of the plan. Liquid standards, CSS standards, JavaScript standards, section structure, schema conventions, theme architecture. All of them. If it can't find even one, it stops completely. No planning with incomplete context.

**Then it researches the actual codebase.** It dispatches an Explore agent to investigate — existing files, current patterns, dependencies, potential conflicts. It reads the project's `CLAUDE.md`. It checks for a `patterns-learned.md` file to see if previous work captured any learnings relevant to this task.

Only then does it create the plan. Every TODO specifies:

| Plan Element | What It Contains |
|---|---|
| Action | What exactly will be done |
| Files | Which files will be created or modified |
| Standards | Which specific coding skills apply to this step |
| Approach | Why this approach, not alternatives |

So instead of "create wishlist section," the plan says: "Create `wishlist-grid.liquid` section following section-standards (CSS → HTML → JS → Schema file order, wrapper class matching filename, blocks rendered via snippets). Schema follows section-schema-standards (setting IDs in `snake_case` with `wishlist_grid` prefix, labels in Title Case, at least one preset). CSS follows css-standards (BEM naming with `.wishlist-grid__element` pattern, mobile-first breakpoints at standard values)."

There's another rule: **every TODO must be actionable and specific.** "Implement the feature" is not a valid TODO. The plan has to be specific enough that building becomes pure execution, not decision-making.

I review the plan. Adjust if needed. Confirm. Now the compound effect is two layers deep — clarity from Clarify has compounded into a codebase-aware, standards-referenced execution plan.

### Build — Disciplined Execution

This is the phase most people start at — and that's why they run into problems. Without clarity and a plan, building is improvisation. With them, it's execution.

Build doesn't trust that it remembers standards from planning. **It re-reads every skill file before writing the first line of code.** If it can't find one, it stops. No building with partial standards.

Then it works through the plan TODO by TODO. For each one:

1. **States what it's about to do** — one line announcing the current TODO
2. **Identifies which skills apply** — names the specific standards before writing any code
3. **Writes the code** — following the plan's approach and applicable standards
4. **Validates every file against a per-file checklist** — concrete yes/no checks

These checklists are the muscle of the system. They aren't guidelines. They're specific, binary validations:

**Liquid files** — variables in `snake_case`, logic blocks use `{% liquid %}` tag, `{% render %}` not `{% include %}`, `{% doc %}` tags on every snippet with parameter types, null/blank checks before output, whitespace control on logic tags only, `| escape` on user content, Liquid comments only.

**Section files** — file order CSS → HTML → JS → Schema, wrapper `<div>` class matches filename, blocks via `{% render %}` snippets (never inline), `case/when` for multiple block types, schema order name → class → settings → blocks → presets, setting IDs `snake_case` with full context prefix (`hero_banner_slide_desktop_image`, never just `image`), setting labels Title Case and section-specific, at least one preset.

**CSS files** — BEM naming `.section-name__element--modifier`, all selectors scoped to section parent class, property order Layout → Flex/Grid → Sizing → Spacing → Typography → Visual → Effects → Responsive, mobile-first with standard breakpoints only (320, 360, 475, 768, 1024, 1280, 1536 — never arbitrary values), schema values via `style` attribute with CSS custom properties.

**JavaScript files** — vanilla JS only (no frameworks, no jQuery), separate asset file (no inline `<script>`), `defer` on script tag, `DOMContentLoaded` for one-off scripts, Web Components for reusable interactive components, Liquid values via `data-` attributes. Four absolute rules: no `element.style` (CSS class toggling only), no `innerHTML` for creating elements (Liquid handles markup), no price formatting in JS (Liquid money filters handle currency), no inline scripts.

**If any checklist item fails, Build fixes it immediately** — before moving to the next TODO. Not at the end. Not in a review pass. Right there.

**Build never deviates from the plan.** Minor issues get solved inline with a note. Medium issues pause for confirmation. Major issues stop building entirely and suggest re-running Plan.

### Assess — The Compound Review

Here's where most AI workflows end. Feature built. Ship it.

In Compound Engineering, building is not shipping. The Assess command dispatches **two independent AI agents** that work in parallel, each checking a completely different dimension:

| Agent | Checks | Doesn't Check |
|---|---|---|
| **Output Validator** | Does the output match every requirement from the Task Spec? Missing edge cases? Empty value handling? Theme editor compatibility? | Code quality, naming, file structure |
| **Code Reviewer** | Does the code follow project standards? Readable? Maintainable? Reusable? | Whether features work or requirements are met |

The Output Validator goes requirement by requirement — Met, Partially Met, or Not Implemented. It checks functional completeness (what happens with empty collections, missing metafields, no product images?), integration (do sections work in the theme editor? assets referenced correctly?), and Shopify-specific concerns (Online Store 2.0 compatibility, section limits).

The Code Reviewer goes file by file against the skill standards. Each issue gets a severity: **Critical** (must fix), **Should Fix** (improves quality), **Nice to Have** (optional, capped at three per file). One rule: **project standards win over generic best practices.** If the code follows the skill files but differs from some external convention, the project standard is correct.

Combined verdict:

- **Ready** — all requirements met, code passes standards
- **Needs Work** — issues found, fixable with the Fix command
- **Needs Rework** — significant problems, go back to Plan or Build

This is the compounding effect in action. The Task Spec from Clarify is what the Output Validator checks against. The coding standards loaded in Plan and Build are what the Code Reviewer checks against. Assessment doesn't exist in isolation — it compounds the output of every previous phase into a structured quality check.

### Fix — Root Cause, Not Band-Aids

When assessment finds issues — or when a bug surfaces independently on any project — Fix handles it. But it fundamentally changes how debugging works with AI.

Normal AI debugging: "This is broken." AI changes something. Still broken. "Still broken." AI changes something else. Maybe works now, maybe introduced a new issue.

Fix works in a strict sequence:

**Understand** — identify the symptom, where it happens, which files are involved. If the report is too vague, ask one clarifying question — just one — then proceed.

**Investigate** — start from the symptom, trace the data flow through every file in the chain. Read the relevant skill files to understand what the code *should* look like.

**Root Cause Analysis** — answer three questions: What is actually happening? What should be happening? Why is it wrong? Then grep the codebase for other places where the same root cause might exist.

**Present diagnosis and stop.** The diagnosis includes: the symptom, root cause in one sentence, exact file and location, the broken code snippet, plain-language explanation of why it's wrong, the proposed fix, other instances found by grep, and impact assessment.

**It does not write any code until I say "go."** This is a hard rule. Diagnosis presented, then it waits.

Why this matters: AI diagnosis isn't always right. Sometimes the root cause is different. Sometimes the proposed fix would break something else. That pause gives me control without slowing things down significantly.

After approval, it re-reads the relevant skill checklist, fixes across all affected files, verifies no breakage, and runs lint/typecheck if applicable. The fix report includes **which skill standard should have prevented this issue** — feeding awareness back into the system.

### Capture — Where Compounding Gets Literal

After a feature is complete and assessed, the Capture command reviews the entire cycle — requirements, plan, code built, assessment results, issues fixed — and extracts specific learnings.

It doesn't capture everything. It applies a filter: **"If I knew this before starting, would it have made the task faster, better, or avoided a mistake?"** If no, it's not worth documenting.

It looks for five types:

1. **Pattern Discovered** — a reusable approach that worked well
2. **Mistake Made & Root Cause Found** — something went wrong, was fixed, with clear root cause
3. **Convention Decided** — a choice between valid approaches, what was chosen and why
4. **Codebase-Specific Context** — something about this project that affects future work
5. **Platform Gotcha** — a Shopify behavior that isn't obvious

Each learning is tagged by category (Liquid, Sections, Schema, CSS, JavaScript, Architecture, Figma) and written to a `patterns-learned.md` file in the project directory — not inside the plugin, so learnings persist across plugin updates and are specific to each project.

Before writing, it reads the existing file to avoid duplicates and merge with related patterns. Each entry includes a brief title, type, category, date, and a 2-4 sentence explanation.

**These learnings compound.** Plan and Build read `patterns-learned.md` before they start. So the next time I work on a similar feature — or the next developer on this project does — the system already knows the gotchas, conventions, and platform quirks. The knowledge base grows with every completed feature.

---

## Beyond the Core: Figma and Research

### Figma: Design Context, Not Code Generation

When I receive a Figma design, the `/figma` command handles the translation gap — but it does not write implementation code.

It takes a Figma URL, fetches the design context — reference code, screenshots, design tokens, asset URLs. It presents the desktop frame, asks for the mobile frame URL, fetches that too. Then it compiles a structured **Design Context** document: screenshots of both frames, reference code, tokens, layer structure, and a comparison of responsive differences between desktop and mobile.

That's it. Figma hands off to Clarify: "Design Context is ready. Run `/clarify` with your additional requirements."

The actual code translation happens during Build, governed by a `figma-to-code` skill that defines exactly how to convert. React components become Liquid sections. Tailwind classes become BEM CSS. Props become schema settings. Repeating elements become section blocks. Auto-layout becomes flexbox/grid — not absolute positioning. Base CSS matches the mobile frame, breakpoints match the desktop frame.

Its own checklist enforces: no Tailwind in the output, no React patterns in the output, every image uses `image_picker` with alt text, responsive `<picture>` elements for images, and all other skill checklists still pass.

### Research: Look It Up, Don't Guess

When I — or the system — need to verify how something works in Shopify, the Research skill provides structured lookup.

It classifies the topic first (API reference, implementation pattern, changelog, troubleshooting, best practice) to pick the right sources. Searches in priority order: shopify.dev first, then Dawn theme repo, Shopify Community, partner blog, Stack Overflow. For important claims, it reads the full page — doesn't rely on search snippets. Cross-references with the project codebase. Synthesizes into a summary with key findings, code examples with source annotations, and cited URLs.

Hard rules: never fabricate information (if it can't find a reliable source, it says so), always cite sources, flag anything older than twelve months, present conflicting sources rather than picking one silently.

---

## The Standards That Make It All Work

The workflow is the skeleton. The standards are the muscle. Without them, the pipeline would just be a process around improvised code. Here's what's actually defined — six coding skills and two utility skills:

| Skill | Scope | Key Rules |
|---|---|---|
| **liquid-standards** | All `.liquid` files | `snake_case` variables with context prefix, `{% render %}` never `{% include %}`, `{% doc %}` on every snippet, null checks before output, whitespace control on logic tags only, `| escape` on user content, max 3 nesting levels |
| **css-standards** | All CSS + styling | CSS in asset files (not inline `<style>`), loaded via `css.liquid` snippet with preload/lazy strategy, BEM naming scoped to section, strict property ordering, mobile-first with 7 standard breakpoints, schema values via `style` attribute with CSS custom properties |
| **js-standards** | All JavaScript | Vanilla JS only, `const` default / `let` for reassignment / never `var`, all JS in asset files with `defer`, `DOMContentLoaded` or Web Components, no `element.style`, no `innerHTML`, no price formatting in JS, no inline scripts |
| **section-standards** | Section `.liquid` files | File order CSS → HTML → JS → Schema, wrapper class matches filename, blocks via `{% render %}` snippets, `case/when` for block types, section independence (own CSS, own JS, no dependencies) |
| **section-schema-standards** | `{% schema %}` blocks | Structure order name → class → settings → blocks → presets, Title Case names, kebab-case class with `-section` suffix, `snake_case` IDs with full context prefix, Title Case labels, at least one preset |
| **theme-architecture** | File structure + organization | All `kebab-case`, JSON templates only (Online Store 2.0), section-specific snippets prefixed with section name, SVGs always in snippets, snippets for single source of truth / blocks / readability — not for tiny one-off pieces |
| **figma-to-code** | Design translation | React → Liquid, Tailwind → BEM CSS, props → schema settings, repeating elements → blocks, auto-layout → flexbox/grid, mobile frame → base CSS, desktop frame → breakpoint CSS |
| **research** | Shopify knowledge | shopify.dev priority, full page reads, codebase cross-reference, source citations, no fabrication |

Every skill file is loaded before Plan writes a word. Re-loaded before Build writes a line. Referenced by Assess during review. The standards aren't optional — they're embedded in the pipeline as hard requirements.

---

## What Actually Changed

### I Stopped Writing Code and Started Leading the Build

My role shifted. I'm not debugging CSS specificity or tracing null reference errors. I'm defining requirements in Clarify. Approving plans in Plan. Reviewing assessment reports in Assess. Confirming root cause diagnoses in Fix.

I'm operating at the product and architecture level — deciding **what** gets built and **whether** it meets the bar. The implementation quality is handled by the standards embedded in the workflow.

I'm in control not because I'm writing every line, but because I understand every decision. I see AI's reasoning at each phase. I confirm before it proceeds. I'm steering, not typing.

### AI Stopped Improvising

Without this framework, AI makes different decisions every time. Different naming. Different file structure. Different approaches to the same problem.

With Compound Engineering, AI operates within defined boundaries. It asks questions instead of assuming. It follows plans instead of inventing approaches. It validates against checklists instead of guessing. It presents diagnoses instead of silently applying fixes.

AI becomes predictable — not in a limiting way, in a trustworthy way. The process is the same every time. The creativity goes into the requirements and the plan. The execution is disciplined.

### Multitasking Across Projects Became Real

Three concurrent Shopify projects. Before this system, context-switching was expensive. Each project drifted in its own direction — slightly different naming, different patterns, accumulated AI decisions that varied per project.

Now every project follows identical standards. The workflow is the same. The quality bar is consistent. When I switch projects, the code feels familiar because it was all built with the same discipline. I focus on what's unique — business requirements, design, customer experience — not on remembering which naming convention this project uses.

### Quality Compounds Instead of Degrading

In traditional AI coding, quality degrades over time. Each feature introduces slightly different patterns. Technical debt accumulates silently. The codebase gets harder to maintain with every addition.

With Compound Engineering, each feature is built to standards, assessed against those standards, and learnings are captured for the next feature. The `patterns-learned.md` file grows. The system knows more gotchas, more edge cases, more platform quirks.

Project B benefits from Project A's learnings. Feature 10 benefits from the patterns discovered in Feature 1. That's the compound effect.

---

## What AI Can't Do

Let me be specific about where the human work is irreplaceable.

AI doesn't hold product vision across weeks of sessions. It doesn't know when a technically correct answer is the wrong choice for this specific brand. It can't feel when a section's editor experience is confusing even though the code is valid. It doesn't decide when "good enough" isn't good enough.

The hardest work is translating "this doesn't feel right" into specific requirements AI can act on. Knowing when to push back on AI's proposed approach. Holding the quality bar when close enough is tempting. Re-injecting context at the start of sessions because AI doesn't carry long-term intent automatically.

Compound Engineering doesn't replace that judgment. It structures everything *around* it — so the judgment is applied at the right moments (requirements, plans, approvals) and execution happens within defined standards.

AI provides depth and speed. Direction is the human's job.

---

## The One Thing That Transfers

Compound Engineering isn't specific to Shopify themes. The principle transfers to any domain:

1. **Define your standards explicitly.** Not as a wiki page nobody reads. As structured skill files that get loaded into the workflow automatically.
2. **Build a pipeline where each phase produces specific output.** Clarify → Task Spec. Plan → Execution Plan. Build → Validated Code. Assess → Assessment Report. Fix → Targeted Repair. Capture → Documented Learning.
3. **Make standards non-optional.** The pipeline stops if standards can't be loaded. Not "best effort." Hard stop.
4. **Separate assessment into two dimensions.** "Does it work?" and "Is it well-built?" are different questions requiring different reviewers.
5. **Capture learnings structurally.** Not "we should remember this." A documented pattern with type, category, date, and explanation — read automatically by future tasks.

The specific standards will be different for your stack. The pipeline structure works regardless.

---

The era of "prompt and pray" is over. It's time to engineer with AI, not just type with it.

---

*Aditya Pasikanti builds Shopify themes and apps using AI-native development workflows. The Shopify Theme Standards Plugin is open-source and available through Claude Code's plugin marketplace.*
