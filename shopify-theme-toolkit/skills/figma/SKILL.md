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

Check that `FIGMA_TOKEN` environment variable is set (needed to save screenshots to disk):
```bash
echo "${FIGMA_TOKEN:+set}" || echo "not set"
```

If not set, tell the user:
```
FIGMA_TOKEN is required to save Figma screenshots to disk.
1. Go to: https://www.figma.com/developers/api#access-tokens
2. Create a Personal Access Token
3. Set it: export FIGMA_TOKEN="your-token-here"
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

## Step 4: Capture & Save Screenshots (Section by Section)

> **Why a script?** The MCP `get_screenshot` returns images inline in conversation —
> Claude can *view* them but cannot write the raw bytes to disk. This script uses
> the Figma REST API to export and download node images as PNG files.

> **Always capture section-by-section, not full-page.** Section-level screenshots are
> what the `/compare` step needs to match against code screenshots. Full-page captures
> also hit Figma's render timeout at 2x scale.

### 4a: Identify section node IDs

Call `get_metadata(fileKey, nodeId)` on the top-level frame to get the node tree. Identify the **direct child nodes** — these are the sections.

Skip Header and Footer nodes (unless the user explicitly asks for them).

### 4b: Build the nodes list

Build a JSON array with one entry per section. Each entry needs:
- `id` — the Figma node ID (e.g., `"49:376"`)
- `name` — kebab-case section name + viewport suffix (e.g., `"banner-desktop"`, `"tiers-desktop"`)

Example for desktop sections:
```json
[
  {"id": "49:376", "name": "banner-desktop"},
  {"id": "49:392", "name": "quote-desktop"},
  {"id": "49:394", "name": "how-it-works-desktop"}
]
```

If a mobile URL was provided, create a separate list with mobile node IDs:
```json
[
  {"id": "50:100", "name": "banner-mobile"},
  {"id": "50:110", "name": "quote-mobile"}
]
```

**Do NOT include a full-page entry.** Only individual sections.

### 4c: Run the save script

The script auto-batches nodes (3 per API call) to avoid Figma render timeouts.

For desktop sections:
```bash
node ${CLAUDE_SKILL_DIR}/scripts/save-figma-screenshots.js \
  --file-key "{desktop-fileKey}" \
  --feature "{feature}" \
  --scale 2 \
  --nodes '{desktop-nodes-json}'
```

If mobile uses a different file key, run a second call:
```bash
node ${CLAUDE_SKILL_DIR}/scripts/save-figma-screenshots.js \
  --file-key "{mobile-fileKey}" \
  --feature "{feature}" \
  --scale 2 \
  --nodes '{mobile-nodes-json}'
```

Output in `.buildspace/artifacts/{feature}/screenshots/`:
- `figma-{section}-desktop.png` — one per desktop section
- `figma-{section}-mobile.png` — one per mobile section (if provided)

### 4d: Write sections.json

After screenshots are saved, write `.buildspace/artifacts/{feature}/sections.json` — this is the **single source of truth** for section naming across the entire pipeline (`/plan`, `/execute`, `/compare`).

```json
[
  {
    "name": "banner",
    "figmaNodeId": "49:376",
    "figmaName": "BANNER",
    "screenshots": {
      "desktop": "screenshots/figma-banner-desktop.png",
      "mobile": "screenshots/figma-banner-mobile.png"
    }
  }
]
```

- `name` — kebab-case canonical name. This is what `/execute` uses in `selectors.json` and `/compare` uses for matching.
- `figmaNodeId` — the Figma node ID for this section
- `figmaName` — original name from the Figma layer tree
- `screenshots.desktop` — path to saved desktop screenshot (always present)
- `screenshots.mobile` — path to saved mobile screenshot (present only if mobile URL was provided, otherwise omit)

**Omit Header and Footer** from sections.json — they are not built or compared.

### 4e: Verify & display

After the script runs, use the `Read` tool to open each saved screenshot and present them to the user for visual review. If any node failed to export, report the error and try `get_screenshot(fileKey, nodeId)` via MCP as a fallback (inline-only, won't save to disk).

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
- .buildspace/artifacts/{feature}/sections.json — canonical section names (used by /execute and /compare)
- .buildspace/artifacts/{feature}/screenshots/ — visual references (section-by-section)

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
