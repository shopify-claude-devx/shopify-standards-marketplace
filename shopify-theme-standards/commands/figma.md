---
description: Fetch a Figma design and prepare structured Design Context for theme development. Use as the first step before /clarify when building from a Figma design. Does not write code.
allowed-tools: Read, Write, Bash, Grep, Glob, AskUserQuestion, mcp__figma__get_design_context, mcp__figma__get_screenshot, mcp__figma__get_metadata, mcp__figma__get_variable_defs
disable-model-invocation: true
---

# Figma — Design Fetching

You are entering the Figma phase. Your job is to fetch a Figma design and produce a structured Design Context that the rest of the workflow will use. Do NOT write any code. Do NOT plan implementation. Only fetch and present design information.

## Input
The Figma URLs: `$ARGUMENTS`

Expected format:
```
Desktop: <figma-url>
Mobile: <figma-url>
```

If both URLs are not provided, ask the user for both before proceeding. Both desktop and mobile URLs must be collected upfront — do not ask for them separately across steps.

If the user says there is no mobile frame, note that responsive styles will be inferred from the desktop frame only, and proceed with the desktop URL alone.

## Artifact Setup
1. Derive a short, kebab-case feature name from the design (e.g., "hero-banner", "product-carousel")
2. Create `.buildspace/artifacts/{feature-name}/` if it doesn't exist

## Process

### Step 1: Parse Both Figma URLs
Extract `fileKey` and `nodeId` from BOTH the desktop and mobile URLs:
- `figma.com/design/:fileKey/:fileName?node-id=:nodeId` → convert `-` to `:` in nodeId
- `figma.com/design/:fileKey/branch/:branchKey/:fileName` → use branchKey as fileKey
- `figma.com/make/:makeFileKey/:makeFileName` → use makeFileKey

Store as `desktopFileKey`, `desktopNodeId`, `mobileFileKey`, `mobileNodeId`.

If either URL format is unclear, ask the user to confirm the file key and node ID for that URL.

### Step 2: Fetch Desktop Design Context
Call `get_design_context` with the desktop fileKey and nodeId. This returns:
- Reference code (React+Tailwind) — use as a structural guide, NOT final code
- Screenshot of the design
- Asset URLs and contextual hints

Review the response for:
- **Code Connect snippets** — if present, note which codebase components are already mapped
- **Component documentation links** — follow them for usage context
- **Design annotations** — capture any notes from the designer
- **Design tokens as CSS variables** — note for mapping to the project's token system

Collect ALL asset URLs returned in the response — images, SVGs, and any other downloadable assets. These are served via the MCP's localhost proxy and are only available during this session.

### Step 3: Fetch Mobile Design Context
Call `get_design_context` with the mobile fileKey and nodeId. Review the mobile reference code and screenshot for responsive differences.

Collect ALL asset URLs from the mobile response as well.

If no mobile URL was provided, skip this step.

### Step 4: Fetch Design Tokens
Call `get_variable_defs` with the fileKey to retrieve design tokens (colors, spacing, typography). These inform the CSS custom properties and theme settings.

If no tokens are returned, that's fine — the design may not use Figma variables.

### Step 5: Present Both Frames and Summary
Present both screenshots and a unified summary:

```
## Desktop Frame

[Desktop screenshot displayed above]

**Layers found:** [count of top-level layers]
**Key elements:** [list major sections/components visible]

## Mobile Frame

[Mobile screenshot displayed above, or "No mobile frame provided — responsive styles will be inferred from desktop"]

**Key differences from desktop:** [layout changes, visibility changes, size changes]

## Design Tokens
[Summary of tokens found, or "None defined"]

## Assets Found
[Count of unique asset URLs found across both frames]
```

### Step 6: Save Design Context to Artifact
Write the structured Design Context to `.buildspace/artifacts/{feature-name}/design-context.md`:

```markdown
# Design Context: {Feature Name}

## Screenshots
- **Desktop:** [screenshot from Step 2]
- **Mobile:** [screenshot from Step 3]

## Reference Code — Desktop
[React+Tailwind code from desktop frame — this is reference only, NOT final output]

## Reference Code — Mobile
[React+Tailwind code from mobile frame — shows layout differences]

## Design Tokens
[List of design tokens from get_variable_defs, or "No design tokens defined — colors and spacing will be extracted from the reference code"]

## Asset URLs
[List any image/icon asset URLs found in the design context]

## Layer Structure Summary
[Brief summary of the design's component hierarchy:
- Top-level container
  - Header area (heading, subheading, badge)
  - Content area (image, text block, CTA)
  - Footer area (links, secondary actions)
]

## Responsive Differences
[Key differences between desktop and mobile frames:
- Layout: [e.g., "horizontal to vertical stack"]
- Visibility: [e.g., "sidebar hidden on mobile"]
- Typography: [e.g., "heading 48px to 32px"]
- Spacing: [e.g., "section padding 80px to 40px"]
]

## Notes for Implementation
[Any Code Connect mappings, designer annotations, or gotchas observed]
```

### Step 7: Hand Off to Next Step


### Step 8: Hand Off to Next Step

> Design Context saved to `.buildspace/artifacts/{feature-name}/design-context.md`.
> Run `/clarify` to define requirements and begin the development workflow.

## Rules
- Never write implementation code — this command only fetches and presents design information
- Never make assumptions about implementation approach — that's for `/plan`
- Always fetch both desktop and mobile frames when both URLs are provided
- Always present the raw reference code — the user and future commands need it for context
- If a Figma API call fails, report the error clearly and suggest the user check the URL or permissions
- If the design uses Code Connect, highlight the mapped components prominently — they indicate existing codebase components that should be reused
- Collect ALL asset URLs from BOTH desktop and mobile frames — do not miss any image visible in the screenshots
- MCP asset URLs are ephemeral (localhost proxy) — download them in the same session, do not defer
