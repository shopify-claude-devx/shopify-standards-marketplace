---
name: figma
description: >
  Extract structured design context from Figma via the official MCP server.
  Captures layout, typography, colors, spacing, and screenshots.
  Use as the first step when building from a Figma design.
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep, Bash, AskUserQuestion, mcp__figma__get_design_context, mcp__figma__get_screenshot, mcp__figma__get_metadata, mcp__figma__get_variable_defs
---

# Figma — Design Context Extraction

You are entering the Figma phase. Your job is to extract structured design context from a Figma frame using the official Figma MCP server, save it as artifacts, and hand off to the pipeline. Do NOT write implementation code. Do NOT plan implementation.

## Input
The Figma URLs: `$ARGUMENTS`

Expected format:
```
Desktop: <figma-url>
Mobile: <figma-url>
```

If both URLs are not provided, ask the user for both before proceeding. If the user says there is no mobile frame, proceed with desktop only.

---

## Step 1: Validate MCP & Parse URLs

Check that Figma MCP tools are available by calling `get_design_context` or `get_metadata`.

If the MCP tools are not available, stop and tell the user:
```
Figma MCP server not connected.
Run this command to add it:
  claude mcp add --transport http figma https://mcp.figma.com/mcp
Then restart Claude Code and authenticate via the browser when prompted.
Requires Figma Pro plan or higher for practical use (free plan = 6 calls/month).
```

Parse each Figma URL to extract:
- `fileKey` — from the URL path (e.g., `figma.com/design/{fileKey}/...`)
- `nodeId` — from the `node-id` query parameter (replace `-` with `:`)

---

## Step 2: Derive Feature Name

Derive a short kebab-case feature name from the design (e.g., `hero-banner`, `product-carousel`).

Use `Glob('.buildspace/artifacts/*/design-context.md')` to check for existing features. If one exists with the same name, confirm with the user that they want to overwrite it.

Create the artifacts directory:
```bash
mkdir -p .buildspace/artifacts/{feature-name}/screenshots
```

---

## Step 3: Fetch Design Context (MCP)

Call `get_design_context(fileKey, nodeId)` for the desktop frame. This returns structured design data including:
- Layout hierarchy (flex/grid direction, alignment, gap, padding)
- Typography (font family, size, weight, line-height, color)
- Colors (exact hex/rgba values for backgrounds, text, borders, accents)
- Spacing (padding, margin, gap values)
- Component structure and nesting

If the response is truncated (large/complex design), use `get_metadata(fileKey, nodeId)` to get the node tree, then call `get_design_context` on individual child nodes.

If a mobile URL was provided, repeat for the mobile frame.

Optionally call `get_variable_defs()` to capture design tokens/variables defined in the Figma file.

---

## Step 4: Capture Screenshots (MCP)

Call `get_screenshot(fileKey, nodeId)` for the desktop frame. Save to:
`.buildspace/artifacts/{feature}/screenshots/figma-full-desktop.png`

If the design has identifiable top-level sections (from Step 3), capture each section individually:
`.buildspace/artifacts/{feature}/screenshots/figma-{section-kebab}-desktop.png`

If mobile URL was provided, repeat for mobile:
`.buildspace/artifacts/{feature}/screenshots/figma-{section-kebab}-mobile.png`

---

## Step 5: Write design-context.md

Assemble all MCP data into `.buildspace/artifacts/{feature}/design-context.md`:

```markdown
# Design Context: {feature-name}

## Source
- Desktop: {figma-url}
- Mobile: {figma-url or "None"}
- Extracted: {timestamp}

## Design Tokens
| Token | Value | Usage |
|-------|-------|-------|
| {name} | {value} | {where it's used} |

## Sections

### {Section Name}

**Screenshots:**
- Desktop: `screenshots/figma-{section}-desktop.png`
- Mobile: `screenshots/figma-{section}-mobile.png`

**Layout:**
- Direction: {row/column}
- Alignment: {start/center/end}
- Gap: {value}
- Padding: {values}
- Max width: {value}

**Typography:**
| Element | Font | Size | Weight | Line Height | Color |
|---------|------|------|--------|-------------|-------|

**Colors:**
| Role | Value |
|------|-------|

**Spacing:**
| Property | Desktop | Mobile |
|----------|---------|--------|

**Elements:**
{Structured hierarchy of components in this section with key visual properties}
```

Fill every table with the actual values from the MCP response. Do not leave placeholders. If a value was not available from the MCP, omit the row rather than guessing.

---

## Step 6: Present & Hand Off

Show the user:
1. Number of sections found
2. Each section screenshot for visual review
3. Key design values discovered (primary colors, fonts, notable spacing)

Then tell the user:
```
Design context extracted and saved.
- .buildspace/artifacts/{feature}/design-context.md — structured design specs
- .buildspace/artifacts/{feature}/screenshots/ — visual references

Run /prd to define requirements for this feature.
```

**Context tip:** You can `/clear` before the next step — all data is in artifacts, not conversation.

---

## Rules
- Never write implementation code — this skill only extracts design context
- Never guess design values — only record what the MCP returns
- If an MCP call fails, report the error clearly with the suggested fix
- Present all section screenshots to the user for visual review
- Overwrite existing artifacts if re-running for the same feature
