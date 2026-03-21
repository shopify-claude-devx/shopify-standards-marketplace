---
description: Fetch a Figma design and prepare structured Design Context for theme development. Use as the first step before /clarify when building from a Figma design. Does not write code.
allowed-tools: Read, Write, Bash, Grep, Glob, AskUserQuestion, mcp__claude_ai_Figma__get_design_context, mcp__claude_ai_Figma__get_screenshot, mcp__claude_ai_Figma__get_metadata, mcp__claude_ai_Figma__get_variable_defs
---

# Figma — Design Fetching

You are entering the Figma phase. Your job is to fetch a Figma design and produce a structured Design Context that the rest of the workflow will use. Do NOT write any code. Do NOT plan implementation. Only fetch and present design information.

## Input
The Figma URL or instructions: `$ARGUMENTS`

If no Figma URL is provided, ask the user for one before proceeding.

## Artifact Setup
1. Derive a short, kebab-case feature name from the design (e.g., "hero-banner", "product-carousel")
2. Create `.buildspace/artifacts/{feature-name}/` if it doesn't exist

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

### Step 6: Save Design Context to Artifact
Write the structured Design Context to `.buildspace/artifacts/{feature-name}/design-context.md`:

```markdown
# Design Context: {Feature Name}

## Screenshots
- **Desktop:** [screenshot from Step 2]
- **Mobile:** [screenshot from Step 5]

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

### Step 7: Process Assets

After writing design-context.md, process the Figma assets for Shopify upload. The asset URLs from Steps 2 and 5 are already in your context — this step costs minimal extra tokens.

#### 7a. Generate asset-input.json

Create `.buildspace/assets/{feature-name}/asset-input.json` from the Asset URLs you identified. For each asset, determine:

- **name**: Kebab-case, prefixed with section name + block/role. Examples:
  - `hero-banner-hero-background-desktop`
  - `hero-banner-hero-background-mobile`
  - `hero-banner-google-find-hub-badge`
  - `hero-banner-cta-background`
- **type**: `IMAGE` or `VIDEO` — infer from design context (e.g., "video placeholder with play button" = VIDEO, image fills = IMAGE)
- **upload**: `true` for assets the theme needs. `false` for screenshots of existing UI, SVG icons that should be inline, or placeholder elements.
- **skipReason**: If `upload: false`, explain why (e.g., "Existing theme header — not rebuilt")

Deduplicate assets that appear in both desktop and mobile — if the same conceptual asset has different URLs for each viewport, include both with `-desktop` / `-mobile` suffix.

```json
{
  "section": "{feature-name}",
  "assets": [
    {
      "url": "https://www.figma.com/api/mcp/asset/...",
      "name": "{section}-{block}-{descriptor}",
      "type": "IMAGE",
      "upload": true,
      "alt": "Descriptive alt text for the image"
    },
    {
      "url": "https://www.figma.com/api/mcp/asset/...",
      "name": "nav-screenshot",
      "type": "IMAGE",
      "upload": false,
      "skipReason": "Existing theme header — not rebuilt"
    }
  ]
}
```

#### 7b. Check for Shopify credentials

Run via `Bash`: `echo "${SHOPIFY_ACCESS_TOKEN:+set}" "${SHOPIFY_STORE_URL:+set}"`

- If **both set**: proceed to upload.
- If **missing**: use `AskUserQuestion` to inform the user:
  > "No Shopify Admin API token found. Assets will be downloaded and saved locally but not uploaded to Shopify. You can set `SHOPIFY_ACCESS_TOKEN` and `SHOPIFY_STORE_URL` environment variables to enable automatic upload. Continue without uploading?"
  - If user says yes → proceed (script handles LOCAL_ONLY mode)
  - If user says no → stop and show setup instructions

#### 7c. Run the asset processing script

Run via `Bash`:
```
node "${CLAUDE_SKILL_DIR}/scripts/process-assets.js" --input ".buildspace/assets/{feature-name}/asset-input.json"
```

The script:
1. Downloads all assets from Figma URLs to `.buildspace/assets/{feature-name}/`
2. Renames them with the meaningful names from asset-input.json
3. If Shopify credentials exist: uploads via staged uploads (stagedUploadsCreate → presigned URL → fileCreate)
4. Writes `asset-manifest.json` with `shopify://` URLs (or LOCAL_ONLY status)
5. Returns a small JSON summary to stdout

#### 7d. Update design-context.md

Read `.buildspace/assets/{feature-name}/asset-manifest.json`. Update the `## Asset URLs` section in design-context.md to replace Figma URLs with `shopify://` URLs:

```markdown
## Asset URLs
- Hero background (desktop): `shopify://shop_images/hero-banner-hero-background-desktop.png`
- Hero background (mobile): `shopify://shop_images/hero-banner-hero-background-mobile.png`
- Google Find Hub badge: `shopify://shop_images/hero-banner-google-find-hub-badge.png`
```

If assets were not uploaded (LOCAL_ONLY), note the local paths instead and add a reminder:
```markdown
## Asset URLs (NOT UPLOADED — upload manually or set SHOPIFY_ACCESS_TOKEN)
- Hero background (desktop): `.buildspace/assets/hero-banner/hero-banner-hero-background-desktop.png`
```

### Step 8: Hand Off to Next Step

> Design Context saved to `.buildspace/artifacts/{feature-name}/design-context.md`.
> Assets: [uploaded count] uploaded to Shopify, [local count] saved locally, [skipped count] skipped.
> Manifest: `.buildspace/assets/{feature-name}/asset-manifest.json`
>
> Run `/clarify` to define requirements and begin the development workflow.

## Rules
- Never write implementation code — this command only fetches and presents design information
- Never make assumptions about implementation approach — that's for `/plan`
- Always fetch both desktop and mobile frames when available
- Always present the raw reference code — the user and future commands need it for context
- If a Figma API call fails, report the error clearly and suggest the user check the URL or permissions
- If the design uses Code Connect, highlight the mapped components prominently — they indicate existing codebase components that should be reused
- When naming assets, always use kebab-case with section name prefix — never use Figma's auto-generated names (e.g., `imgRectangle3` or `imgHf20260226...`)
- Distinguish between assets to upload (theme images/videos) and assets to skip (screenshots of existing UI, inline SVG icons, placeholder elements)
