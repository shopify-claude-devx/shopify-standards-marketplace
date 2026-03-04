---
description: Fetch a Figma design and prepare structured Design Context for theme development. Use as the first step before /clarify when building from a Figma design. Does not write code.
allowed-tools: Read, Grep, Glob, mcp__figma__get_design_context, mcp__figma__get_screenshot, mcp__figma__get_metadata, mcp__figma__get_variable_defs
---

# Figma — Design Fetching

You are entering the Figma phase. Your job is to fetch a Figma design and produce a structured Design Context that the rest of the workflow (`/clarify` → `/plan` → `/build`) will use. Do NOT write any code. Do NOT plan implementation. Only fetch and present design information.

## Input
The Figma URL or instructions: `$ARGUMENTS`

If no Figma URL is provided, ask the user for one before proceeding.

## Process

### Step 1: Parse the Figma URL
Extract `fileKey` and `nodeId` from the URL:
- `figma.com/design/:fileKey/:fileName?node-id=:nodeId` → convert `-` to `:` in nodeId
- `figma.com/design/:fileKey/branch/:branchKey/:fileName` → use branchKey as fileKey
- `figma.com/make/:makeFileKey/:makeFileName` → use makeFileKey

If the URL format is unclear, ask the user to confirm the file key and node ID.

### Step 2: Fetch Desktop Design Context
Call `get_design_context` with the extracted fileKey and nodeId. This returns:
- Reference code (React+Tailwind) — use as a structural guide, NOT final code
- Screenshot of the design
- Asset URLs and contextual hints

Review the response for:
- **Code Connect snippets** — if present, note which codebase components are already mapped
- **Component documentation links** — follow them for usage context
- **Design annotations** — capture any notes from the designer
- **Design tokens as CSS variables** — note for mapping to the project's token system

### Step 3: Fetch Design Tokens
Call `get_variable_defs` with the fileKey to retrieve design tokens (colors, spacing, typography). These inform the CSS custom properties and theme settings.

If no tokens are returned, that's fine — the design may not use Figma variables.

### Step 4: Present Desktop Frame and Ask for Mobile
Present the desktop screenshot and a summary of what was found:

```
## Desktop Frame

[Screenshot displayed above]

**Layers found:** [count of top-level layers]
**Key elements:** [list major sections/components visible]
**Design tokens:** [summary of tokens found, or "None defined"]

---

Please provide the **mobile frame URL** for this design so I can fetch the responsive layout.
Paste the Figma URL for the mobile version of this same section/page.
```

Wait for the user to provide the mobile frame URL. If the user says there is no mobile frame, note that responsive styles will be inferred from the desktop frame only.

### Step 5: Fetch Mobile Design Context
Parse the mobile frame URL and call `get_design_context` with its fileKey and nodeId. Review the mobile reference code and screenshot for responsive differences.

### Step 6: Output Structured Design Context
Compile everything into a single **Design Context** document:

```
## Design Context

### Screenshots
- **Desktop:** [screenshot from Step 2]
- **Mobile:** [screenshot from Step 5]

### Reference Code — Desktop
[React+Tailwind code from desktop frame — this is reference only, NOT final output]

### Reference Code — Mobile
[React+Tailwind code from mobile frame — shows layout differences]

### Design Tokens
[List of design tokens from get_variable_defs, or "No design tokens defined — colors and spacing will be extracted from the reference code"]

### Asset URLs
[List any image/icon asset URLs found in the design context]

### Layer Structure Summary
[Brief summary of the design's component hierarchy:
- Top-level container
  - Header area (heading, subheading, badge)
  - Content area (image, text block, CTA)
  - Footer area (links, secondary actions)
]

### Responsive Differences
[Key differences between desktop and mobile frames:
- Layout: [e.g., "horizontal → vertical stack"]
- Visibility: [e.g., "sidebar hidden on mobile"]
- Typography: [e.g., "heading 48px → 32px"]
- Spacing: [e.g., "section padding 80px → 40px"]
]

### Notes for Implementation
[Any Code Connect mappings, designer annotations, or gotchas observed]
```

### Step 7: Hand Off to Next Step
After presenting the Design Context:

> Design Context is ready. Run `/clarify` with your additional requirements to begin the development workflow.
>
> The workflow from here: `/clarify` → `/plan` → `/build` → `/assess` → `/capture`

## Rules
- Never write implementation code — this command only fetches and presents design information
- Never make assumptions about implementation approach — that's for `/plan`
- Always fetch both desktop and mobile frames when available
- Always present the raw reference code — the user and future commands need it for context
- If a Figma API call fails, report the error clearly and suggest the user check the URL or permissions
- If the design uses Code Connect, highlight the mapped components prominently — they indicate existing codebase components that should be reused
