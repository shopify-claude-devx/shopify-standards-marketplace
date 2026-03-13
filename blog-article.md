# Compound Engineering: Stop Prompting AI. Start Engineering With It.

I'm a Gen-Z developer. I started my career when ChatGPT was about a year old. By the time I began coding professionally, I already knew what AI could do. It was my best friend for coding from day one. I'd prompt it, it would write code, I'd learn from the output, tweak it, ship it. That's how I used to build. That's how I grew as a developer. AI and I figured things out together.

But I was making a mistake I didn't even recognize.

As a junior, I was focused on one thing: finishing the task. Close the ticket. Ship the feature. Move on. And AI was perfect for that mindset. I'd prompt it, it would write code, I'd commit. Fast. Efficient. Done.

I wasn't thinking about whether AI understood the requirement properly. I wasn't reviewing the plan it was working from (it didn't have one — it just started coding). I wasn't checking the code structure or assessing quality. I was just delegating my work and accepting the output.

It worked. Until it didn't.

Now I'm a senior on my team. I work with juniors every day. And I watch them do exactly what I used to do. Prompt. Get code. Ship. Repeat. They're fast. But the codebases they produce look like five different developers wrote them without ever talking to each other. Because in a way, that's what happened: five different AI conversations, each one starting from zero, each one making different structural decisions.

For small tasks, this is fine. AI is nearly perfect when the scope is clear. "Add a checkbox setting to this section." "Fix this typo in the schema." The task is contained, there's no ambiguity, AI knows what to do.

For bigger tasks, it falls apart.

We tell AI "build a wishlist feature." It creates a plan in its own head (unreviewed, often hallucinated) and starts executing. If the output doesn't work, we say "this is broken, fix it." Two paths from here: it either fixes it and breaks something else, or it doesn't fix it and we're going back and forth in a loop. Sometimes we catch the breakage during development. Sometimes QA catches it a week later. Either way, we're spending time fixing what AI broke while fixing what we asked it to fix.

No governance. No self-assessment. No structure. Just execution and hope.

That's Gen-Z coding culture, if I'm being honest. Execution first, foundation later. And I was part of it.

I realized it won't scale. Not for me, not for the juniors I work with, not for any team that's serious about what they build and ship.

---

## The Question That Changed How I Think

I asked myself something simple: why does AI nail small tasks but struggle with big ones?

Small tasks work because AI already knows what needs to be done. "Add a checkbox." Clear scope. No interpretation needed. No assumptions. It executes exactly what you asked.

Big tasks break because AI fills in the gaps. You say "build a wishlist feature" and AI decides the data model, the UI approach, the file structure, the naming conventions, the edge case handling. It picks an approach without telling you, deviates halfway through when it runs into complexity, and at no point does it stop to check: does my plan make sense? Does my code match what was asked? Is the quality consistent with the rest of the codebase?

There's no self-check. No moment of "wait, this approach might be wrong." No governance.

The insight was simple. If AI fully understands what needs to be done, without filling in gaps on its own, it does dramatically better. The problem was never AI's capability. It was that we skip the steps that give AI clarity and structure. We jump straight to "build this" and wonder why the output is inconsistent.

What if we didn't skip those steps?

---

## Claude Code Changed Everything

Around the time I was wrestling with this, tons of AI coding tools were launching. I tried several. Then I came across Claude Code.

It had something the others didn't: the architecture to build exactly the kind of governance I needed. A way to define coding standards that AI loads automatically when working on specific file types. Structured workflows that AI follows step by step. Specialized reviewers that check AI's own work. I could build the discipline directly into the tool.

That's where **Compound Engineering** was born.

The idea: instead of one big prompt that AI interprets however it wants, break work into phases. Each phase produces something specific. That output becomes the input for the next phase. Nothing is improvised. Everything compounds.

I built it as a plugin called **Shopify Theme Standards** on Claude Code. Here's the pipeline:

**Clarify.** Before AI writes anything, it must fully understand what's needed. It breaks your request into what's clear, what it's assuming, and what it still needs to know. Asks you questions. Produces a Task Spec: goal, requirements, out of scope, acceptance criteria. No code. No architecture suggestions. Just requirements.

**Plan.** AI loads every coding standard I've defined, explores the actual codebase, and creates a TODO-by-TODO execution plan where every step references which standards apply. If a single standard file is missing, the command stops. No planning with incomplete context.

**Build.** Executes the plan step by step. Re-reads all standards before writing the first line (doesn't trust what it remembers from planning). After every file, runs a validation checklist. If a check fails, it fixes the issue before moving to the next TODO. Never deviates from the plan.

**Assess.** Dispatches two independent reviewers in parallel. One checks: did we build what we said we'd build? (requirement by requirement, including edge cases). The other checks: is the code well-written according to our standards? (structure, readability, maintainability). Each issue gets a severity. The verdict: Ready, Needs Work, or Needs Rework.

**Fix.** When something's wrong, AI doesn't just start changing code. It investigates. Traces the data flow. Performs root cause analysis. Presents a diagnosis. Then stops. Waits for your approval. Only after you say "go" does it apply the fix. And it reports which standard should have prevented the issue.

**Capture.** After the cycle completes, AI reviews everything and asks: "If I'd known this before starting, would it have saved time or prevented a mistake?" If yes, it documents the learning. Next time Plan runs, it reads those learnings first.

Each phase feeds the next. The Task Spec from Clarify is what Assess validates against. The standards loaded in Plan are what the Code Reviewer checks against. The learnings from Capture are what Plan reads next time. Nothing starts from zero. Quality compounds.

Behind the pipeline: eight coding standards defining exactly how Liquid, CSS, JavaScript, sections, schemas, theme architecture, and Figma-to-code translation should be written for Shopify themes. Plus a Research skill that looks up Shopify documentation so AI doesn't hallucinate API methods. These standards aren't optional. Every command loads them before acting. If one is missing, the command won't proceed.

That's the governance layer. Same standards, every project, every feature, every file.

---

## The Week That Proved It

A few weeks ago, three Shopify projects landed in the same week. One had production bugs on a live store. One needed new sections built from Figma designs. One was my own project needing go-live enhancements.

Three codebases. Three clients. One week.

**Production bugs.** Live store, wrong variant pricing when switching color options. Not my codebase. Ran `/fix`. It traced the data flow, found the root cause (a timing issue where the snippet read `variant.price` before JS state had updated), found two other files with the same pattern. Presented the diagnosis. Stopped. Waited for my approval. I confirmed, it fixed all three files. Report told me which standard should have prevented the bug. Three bugs, about two hours. On unfamiliar code, that would have been a full day.

**Figma to code.** Pasted the Figma URL into `/figma`, it compiled a Design Context from both desktop and mobile frames. Ran `/clarify` with requirements, got a Task Spec. Ran `/plan`, it loaded all eight standards and built a TODO plan. Ran `/build`, it validated every file as it went. Flagged a snippet that needed documentation I'd assumed was unnecessary. Two sections built, matching the design, following every standard.

**Go-live enhancements.** Full pipeline through `/assess`. Two reviewers in parallel. Came back "Needs Work" on a CSS specificity issue. Fixed it, re-assessed. Ready. Ran `/capture`, it documented a responsive grid pattern. Next time Plan runs on this project, it reads that first.

All three shipped by Friday. Same standards across all three codebases. Not because I enforced consistency while context-switching. Because the standards are in the workflow, and the workflow doesn't skip them.

---

## What It Adds Up To

We're already letting AI do the work. That ship sailed. The question now is whether we have governance over how it does it.

Small tasks, AI nails. Big tasks need structure. Clarity before planning. Planning before building. Assessment before shipping. Learning before the next task.

That's Compound Engineering. Each phase produces something specific that feeds the next. Nothing is improvised. Nothing starts from scratch. Quality compounds with every completed task.

I built it on Claude Code as the **Shopify Theme Standards Plugin**. It's open-source, available on Claude Code's plugin marketplace. Six commands (Clarify, Plan, Build, Assess, Fix, Capture), eight coding standards, a Figma command for design-to-code context, and a Research skill for Shopify doc lookups.

But the principle isn't about Shopify or Claude Code. It's about the gap between how we use AI today and how we should be using it. We skip the foundation and jump to execution. We delegate without governance. We let AI decide things we should be deciding.

Stop prompting. Start engineering.

---

*Aditya Pasikanti builds Shopify themes and apps with AI-native development workflows. The Shopify Theme Standards Plugin is available through Claude Code's plugin marketplace.*
