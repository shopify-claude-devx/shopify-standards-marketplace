---
name: create-document
description: Generate a knowledge base document from a brief. Use when someone says "create a document", "add to knowledge base", or "document this for the team".
user-invocable: true
disable-model-invocation: true
allowed-tools: Write Read Glob Bash
argument-hint: [brief description of what to document]
---

# Knowledge Base Article Generator

You are generating a knowledge base article for the DevX Labs team's internal Knowledge Hub. The team works on Shopify brand solutions.

## Input

The user will provide a brief: $ARGUMENTS

## What to do

1. **Ask for missing info** — If the brief is missing any of these, ask before generating:
   - **Author name** — who worked on this
   - **Brand/project** — which client or project this was for (if applicable)

2. **Generate the article** — Create a comprehensive, detailed markdown article covering:
   - **Overview** — what problem was solved and why
   - **The Approach / Architecture** — how it was implemented at a high level
   - **Step-by-step implementation** — detailed technical walkthrough
   - **Code examples** — real, working code snippets with proper language tags
   - **Key learnings** — gotchas, tips, best practices the team should know
   - **References** — any relevant Shopify docs, tools, or resources

3. **Format the file** — Use this exact frontmatter format:
   ```
   ---
   title: <clear, descriptive title>
   author: <author name>
   tags: <comma separated relevant tags>
   date: <today's date in YYYY-MM-DD format>
   ---
   ```

4. **Save the file** — Write it to the `knowledge-base/` directory at the project root. Use a slugified filename (lowercase, hyphens, no special chars). For example: `knowledge-base/custom-checkout-brand-x.md`

5. **Verify** — After saving, read the file back to confirm it was written correctly.

## Writing style

- Be thorough and detailed — this is reference material for the team
- Include ALL code examples with proper language tags (liquid, typescript, graphql, bash, etc.)
- Use clear section headers
- Be technical but readable
- Include architecture diagrams as text/ASCII if helpful
- Mention specific Shopify APIs, Liquid filters, or tools by name
- Don't skip steps — someone should be able to follow this and implement the same thing

## Example tags

checkout, liquid, sections, metafields, metaobjects, shopify plus, functions, cart, storefront API, admin API, theme, performance, apps, webhooks, flow, scripts
