---
description: Fetch a Figma design and prepare structured Design Context for theme development. Use as the first step before /clarify when building from a Figma design. Does not write code.
allowed-tools: Read, Write, Bash, Grep, Glob, AskUserQuestion, mcp__claude_ai_Figma__get_design_context, mcp__claude_ai_Figma__get_screenshot, mcp__claude_ai_Figma__get_metadata, mcp__claude_ai_Figma__get_variable_defs
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

### Step 7: Process Assets

After writing design-context.md, process the Figma assets for Shopify upload. The asset URLs from Steps 2 and 3 are already in your context — this step costs minimal extra tokens.

#### 7a. Merge and Deduplicate Assets from Both Frames

Create `.buildspace/assets/{feature-name}/asset-input.json` from the Asset URLs found in BOTH the desktop (Step 2) and mobile (Step 3) frames. For each asset, determine:

- **name**: Kebab-case, prefixed with section name + block/role. Examples:
  - `hero-banner-hero-background-desktop`
  - `hero-banner-hero-background-mobile`
  - `hero-banner-google-find-hub-badge`
  - `hero-banner-cta-background`
- **type**: `IMAGE` or `VIDEO` — infer from design context (e.g., "video placeholder with play button" = VIDEO, image fills = IMAGE)
- **upload**: `true` for assets the theme needs. `false` for screenshots of existing UI, SVG icons that should be inline, or placeholder elements.
- **skipReason**: If `upload: false`, explain why (e.g., "Existing theme header — not rebuilt")
- **alt**: Descriptive alt text for the image/video
- **viewport**: `desktop`, `mobile`, or `both` — which frame(s) this asset appears in

**Deduplication rules:**
- If the SAME conceptual asset appears in both desktop and mobile with DIFFERENT URLs, include both with `-desktop` / `-mobile` suffix and appropriate viewport values
- If the SAME conceptual asset has the SAME URL in both frames, include it ONCE with `viewport: "both"`
- If an asset appears only in one frame, include it once with the appropriate viewport value

**Completeness check:** Compare the list of collected asset URLs against the design screenshots. Every distinct image visible in the screenshots should have a corresponding entry in the asset list. If you see an image in the screenshot that has no matching asset URL, flag it in the summary.

```json
{
  "section": "{feature-name}",
  "assets": [
    {
      "url": "http://localhost:PORT/asset/...",
      "name": "{section}-{block}-{descriptor}",
      "type": "IMAGE",
      "upload": true,
      "alt": "Descriptive alt text for the image",
      "viewport": "desktop"
    },
    {
      "url": "http://localhost:PORT/asset/...",
      "name": "{section}-{block}-{descriptor}",
      "type": "IMAGE",
      "upload": true,
      "alt": "Descriptive alt text",
      "viewport": "both"
    },
    {
      "url": "http://localhost:PORT/asset/...",
      "name": "nav-screenshot",
      "type": "IMAGE",
      "upload": false,
      "skipReason": "Existing theme header — not rebuilt"
    }
  ]
}
```

#### 7b. Detect Videos and Prompt for Manual Download

Figma's API cannot export video content. Scan the asset list for any items with `"type": "VIDEO"`.

For each video asset:
1. Mark it with `"needsManualDownload": true` in asset-input.json
2. Use `AskUserQuestion` to ask the user:
   > "I detected a video element in the design: **{asset-name}** ({description}).
   > Figma cannot export videos via its API.
   >
   > Please download it manually:
   > 1. Open the Figma file in your browser
   > 2. Select the video layer
   > 3. Press Shift+D to enter Dev Mode
   > 4. In the Assets panel on the right sidebar, click Download
   > 5. Provide the local file path here
   >
   > Or type 'skip' to skip this video (you can upload it manually later)."

3. If the user provides a file path:
   - Verify the file exists via `Bash`: `test -f "{path}" && echo "exists" || echo "missing"`
   - Get file size via `Bash`: `stat -f%z "{path}"` (macOS) or `stat -c%s "{path}"` (Linux)
   - Update the asset entry: remove `needsManualDownload`, set `"url"` to `null`, add `"localPath": "{user-provided-path}"` and `"fileSize": "{size-in-bytes}"`
4. If the user types 'skip':
   - Set `"upload": false` and `"skipReason": "Video skipped — manual upload required"`

If no video assets are detected, skip this step entirely.

#### 7c. Check for Shopify credentials

Run via `Bash`: `echo "${SHOPIFY_ACCESS_TOKEN:+set}" "${SHOPIFY_STORE_URL:+set}"`

- If **both set**: proceed to upload.
- If **missing**: use `AskUserQuestion` to inform the user:
  > "No Shopify Admin API credentials found. Assets will be downloaded and saved locally but not uploaded to Shopify.
  >
  > To enable automatic upload, set these environment variables in your project:
  >
  > **Option 1: `.env` file** (recommended for projects)
  > ```
  > SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
  > SHOPIFY_STORE_URL=your-store.myshopify.com
  > ```
  >
  > **Option 2: Claude Code settings** (in `.claude/settings.json`)
  > ```json
  > {
  >   "env": {
  >     "SHOPIFY_ACCESS_TOKEN": "shpat_xxxxxxxxxxxxx",
  >     "SHOPIFY_STORE_URL": "your-store.myshopify.com"
  >   }
  > }
  > ```
  >
  > The access token needs the **`write_files`** scope. You can create one in Shopify Admin → Settings → Apps and sales channels → Develop apps.
  >
  > Continue without uploading? (assets will be saved locally)"
  - If user says yes → proceed (script handles LOCAL_ONLY mode)
  - If user says no → stop and let the user set up credentials first

#### 7d. Run the asset processing script

Run via `Bash`:
```
node "${CLAUDE_SKILL_DIR}/scripts/process-assets.js" --input ".buildspace/assets/{feature-name}/asset-input.json"
```

The script:
1. Downloads all assets from MCP localhost URLs to `.buildspace/assets/{feature-name}/`
2. Copies any user-provided local files (videos) to the same directory with meaningful names
3. If Shopify credentials exist: uploads via batch staged uploads (stagedUploadsCreate → presigned URL → fileCreate)
4. Writes `asset-manifest.json` with `shopify://` URLs (or LOCAL_ONLY status)
5. Returns a JSON summary to stdout

**Important:** MCP asset URLs are ephemeral — they are only available during this active session. The script must run immediately after asset-input.json is generated. Do not defer this step.

#### 7e. Update design-context.md

Read `.buildspace/assets/{feature-name}/asset-manifest.json`. Update the `## Asset URLs` section in design-context.md to replace Figma/MCP URLs with `shopify://` URLs:

```markdown
## Asset URLs
- Hero background (desktop): `shopify://shop_images/hero-banner-hero-background-desktop.png`
- Hero background (mobile): `shopify://shop_images/hero-banner-hero-background-mobile.png`
- Google Find Hub badge: `shopify://shop_images/hero-banner-google-find-hub-badge.png`
- Promo video: `shopify://files/videos/hero-banner-promo-video.mp4`
```

If assets were not uploaded (LOCAL_ONLY), note the local paths instead and add a reminder:
```markdown
## Asset URLs (NOT UPLOADED — upload manually or set SHOPIFY_ACCESS_TOKEN)
- Hero background (desktop): `.buildspace/assets/hero-banner/hero-banner-hero-background-desktop.png`
```

If any assets have `"status": "FAILED"` in the manifest, list them with their error:
```markdown
## Failed Assets
- {asset-name}: {error message} — upload manually via Shopify Admin > Settings > Files
```

### Step 8: Hand Off to Next Step

> Design Context saved to `.buildspace/artifacts/{feature-name}/design-context.md`.
> Assets: [uploaded count] uploaded to Shopify, [local count] saved locally, [skipped count] skipped, [failed count] failed.
> Manifest: `.buildspace/assets/{feature-name}/asset-manifest.json`
>
> Run `/clarify` to define requirements and begin the development workflow.

## Rules
- Never write implementation code — this command only fetches and presents design information
- Never make assumptions about implementation approach — that's for `/plan`
- Always fetch both desktop and mobile frames when both URLs are provided
- Always present the raw reference code — the user and future commands need it for context
- If a Figma API call fails, report the error clearly and suggest the user check the URL or permissions
- If the design uses Code Connect, highlight the mapped components prominently — they indicate existing codebase components that should be reused
- When naming assets, always use kebab-case with section name prefix — never use Figma's auto-generated names (e.g., `imgRectangle3` or `imgHf20260226...`)
- Distinguish between assets to upload (theme images/videos) and assets to skip (screenshots of existing UI, inline SVG icons, placeholder elements)
- Collect ALL asset URLs from BOTH desktop and mobile frames — do not miss any image visible in the screenshots
- MCP asset URLs are ephemeral (localhost proxy) — download them in the same session, do not defer
