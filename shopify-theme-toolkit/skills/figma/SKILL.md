---
name: figma
description: >
  Fetch Figma design, download and rename assets, upload to Shopify,
  extract design tokens. Use before /prd for Figma-to-code workflow.
disable-model-invocation: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion, mcp__figma__get_design_context, mcp__figma__get_screenshot, mcp__figma__get_metadata, mcp__figma__get_variable_defs, mcp__claude_ai_Figma__get_design_context, mcp__claude_ai_Figma__get_screenshot, mcp__claude_ai_Figma__get_metadata, mcp__claude_ai_Figma__get_variable_defs
---

# Figma — Design Fetching, Asset Processing & Token Extraction

You are entering the Figma phase. Your job is to:
1. Fetch the Figma design (desktop + mobile)
2. Download all assets, rename them meaningfully, upload to Shopify
3. Extract design tokens and create/update the shared design system CSS
4. Save everything as structured artifacts for downstream commands

**Do NOT write any implementation code. Do NOT plan. Only fetch, process, and organize.**

## Input
Figma URLs: `$ARGUMENTS`

Expected format:
```
Desktop: <figma-url>
Mobile: <figma-url>
```

If both URLs are not provided, ask the user for both before proceeding. If the user says there is no mobile frame, note that responsive styles will be inferred from the desktop frame only.

## Artifact Setup
1. Derive a short kebab-case feature name from the design (e.g., `hero-banner`, `product-carousel`)
2. Create `.buildspace/artifacts/{feature-name}/` and `.buildspace/artifacts/{feature-name}/screenshots/` if they don't exist

---

## Phase 1: Fetch Design Context

### Step 1: Parse Figma URLs
Extract `fileKey` and `nodeId` from both URLs:
- `figma.com/design/:fileKey/:fileName?node-id=:nodeId` → convert `-` to `:` in nodeId
- `figma.com/design/:fileKey/branch/:branchKey/:fileName` → use branchKey as fileKey
- `figma.com/make/:makeFileKey/:makeFileName` → use makeFileKey

Store as `desktopFileKey`, `desktopNodeId`, `mobileFileKey`, `mobileNodeId`.

If either URL format is unclear, ask the user to confirm.

### Step 2: Fetch Desktop Design Context
Call `get_design_context` with the desktop fileKey and nodeId. This returns:
- Reference code (React+Tailwind) — structural guide only, NOT final code
- Screenshot of the design
- Asset URLs and contextual hints

Review the response for:
- **Code Connect snippets** — note which codebase components are already mapped
- **Design annotations** — capture any notes from the designer
- **Design tokens as CSS variables** — note for token extraction

Collect ALL asset URLs from the response.

### Step 3: Fetch Mobile Design Context
Call `get_design_context` with the mobile fileKey and nodeId.

Collect ALL asset URLs from the mobile response.

If no mobile URL was provided, skip this step.

### Step 4: Fetch Design Tokens
Call `get_variable_defs` with the fileKey to retrieve design tokens (colors, spacing, typography).

### Step 5: Capture Screenshots for Visual Validation
Call `get_screenshot` for desktop and mobile frames.

Save screenshots to:
- `.buildspace/artifacts/{feature-name}/screenshots/figma-desktop.png`
- `.buildspace/artifacts/{feature-name}/screenshots/figma-mobile.png`

These are used later by `/test` for visual validation. Do not skip this step.

---

## Phase 2: Asset Extraction & Meaningful Naming

### Step 1: Collect All Assets
From both desktop and mobile design context responses, collect every asset URL (images, SVGs, icons).

### Step 2: Rename Assets Meaningfully
Figma assets have random names like `Frame 47`, `Rectangle 12`, `Group 8`. Rename each based on:
- **What it represents** in the design (analyze the layer hierarchy and context)
- **Section name as prefix** for scoping

Naming convention: `{section-name}-{element-purpose}.{ext}`

Examples:
- `Frame 47` (background image in hero) → `hero-banner-background.png`
- `Rectangle 12` (product thumbnail) → `product-card-thumbnail.png`
- `Group 8` (arrow icon in CTA) → `hero-banner-cta-arrow.svg`
- `image 3` (slide 1 in carousel) → `hero-carousel-slide-1.jpg`

### Step 3: Determine Asset Viewport
For each asset, identify whether it's:
- `desktop` — only in desktop frame
- `mobile` — only in mobile frame
- `both` — in both frames

### Step 4: Identify Video Elements
Scan the design for elements that appear to be video placeholders (large rectangular frames with play button overlays, or layers named with "video" keywords).

If video elements are found:
1. List each video with its layer name and position in the design
2. Tell the user: "Figma MCP cannot export videos. Please download these videos and place them in `.buildspace/assets/{feature-name}/`"
3. List each video file needed with a suggested meaningful name
4. Wait for user confirmation that videos are placed before proceeding to Phase 3

---

## Phase 3: Upload to Shopify

### Step 1: Check Credentials
Read `.env` in the project root for:
- `SHOPIFY_STORE_URL` (e.g., `mystore.myshopify.com`)
- `SHOPIFY_ACCESS_TOKEN` (Admin API token with `read_files`, `write_files` scopes)

If `.env` doesn't exist or credentials are missing, inform the user:
```
Shopify credentials not found in .env. Assets will be downloaded locally
but not uploaded to Shopify.

To enable upload, create a .env file with:
SHOPIFY_STORE_URL=yourstore.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxx

The token needs read_files and write_files access scopes.
```

Proceed in LOCAL_ONLY mode — download assets but skip upload.

### Step 2: Prepare Asset Input
Generate `.buildspace/artifacts/{feature-name}/asset-input.json`:

```json
{
  "section": "{feature-name}",
  "assets": [
    {
      "name": "hero-banner-background",
      "type": "IMAGE",
      "upload": true,
      "url": "http://localhost:.../asset-url",
      "alt": "Hero banner background image",
      "viewport": "both"
    }
  ]
}
```

For user-provided videos, use `localPath` instead of `url`:
```json
{
  "name": "hero-banner-video",
  "type": "VIDEO",
  "upload": true,
  "localPath": ".buildspace/assets/{feature-name}/video-filename.mp4",
  "alt": "Hero banner background video",
  "viewport": "both",
  "fileSize": "12345678"
}
```

### Step 3: Run Asset Processing
Read the `.env` file values and pass them as environment variables when running the script:
```bash
source .env 2>/dev/null; SHOPIFY_STORE_URL="$SHOPIFY_STORE_URL" SHOPIFY_ACCESS_TOKEN="$SHOPIFY_ACCESS_TOKEN" node ${CLAUDE_SKILL_DIR}/scripts/process-assets.js --input .buildspace/artifacts/{feature-name}/asset-input.json
```

This script:
1. Downloads all assets from Figma MCP URLs (ephemeral — must download in same session)
2. Copies user-provided local files
3. If Shopify credentials present: uploads via `stagedUploadsCreate` → presigned URL → `fileCreate`
4. Writes `asset-manifest.json` with final URLs

### Step 4: Verify Manifest
Read the generated `.buildspace/artifacts/{feature-name}/asset-manifest.json` and verify:
- All assets have status `REGISTERED` (uploaded) or `DOWNLOADED` (local only)
- Note any `FAILED` assets and report to user

The manifest provides `shopifyUrl` for each asset:
- Images: `shopify://shop_images/{filename}.png`
- Videos: `shopify://files/videos/{filename}.mp4`

---

## Phase 4: Design Token Extraction

### Step 1: Collect Raw Values
From the design context responses and `get_variable_defs` results, extract:

**Typography:**
- All unique font sizes used (desktop and mobile separately)
- Font families
- Font weights
- Line heights

**Colors:**
- Text colors
- Background colors
- Accent/highlight colors
- Border colors

**Spacing:**
- Section padding (top/bottom) for desktop and mobile
- Element gaps (between items in a row/column)
- Container max-widths

### Step 2: Normalize Values
Figma designs often have inconsistent values. Normalize:
- Font sizes: Round similar values to a standard set (e.g., 13px and 14px → 14px)
- Spacing: Round to a consistent scale (e.g., 8px increments)
- Colors: Deduplicate near-identical colors

### Step 3: Save Design Tokens JSON
Save raw extracted tokens to `.buildspace/artifacts/{feature-name}/design-tokens.json`:

```json
{
  "typography": {
    "families": {
      "primary": "'DM Sans', sans-serif",
      "secondary": "'Playfair Display', serif"
    },
    "sizes": {
      "xs": "12px",
      "sm": "14px",
      "base": "16px",
      "md": "18px",
      "lg": "24px",
      "xl": "32px",
      "2xl": "48px"
    },
    "weights": {
      "regular": "400",
      "medium": "500",
      "semibold": "600",
      "bold": "700"
    }
  },
  "colors": {
    "primary": "#1a1a1a",
    "secondary": "#666666",
    "accent": "#4A90D9",
    "background": "#ffffff",
    "background-alt": "#f5f5f5",
    "border": "#e0e0e0"
  },
  "spacing": {
    "section-py": {
      "sm": { "mobile": "40px", "desktop": "60px" },
      "md": { "mobile": "60px", "desktop": "80px" },
      "lg": { "mobile": "80px", "desktop": "120px" }
    },
    "gap": {
      "xs": "4px",
      "sm": "8px",
      "md": "16px",
      "lg": "24px",
      "xl": "32px",
      "2xl": "48px"
    }
  }
}
```

### Step 4: Create/Update design-system.css
Check if `assets/design-system.css` exists in the project.

**If it doesn't exist:** Create it with all extracted tokens as CSS custom properties.

**If it exists:** Read it, merge new tokens (add new ones, don't remove existing ones). If a token value conflicts, keep the existing value and note the conflict for the user.

The file format:
```css
/* Design System — Auto-generated from Figma, updated incrementally */
/* Do not add section-specific styles here. Only shared tokens. */

:root {
  /* Typography */
  --ff-primary: 'DM Sans', sans-serif;
  --ff-secondary: 'Playfair Display', serif;

  --fs-xs: 12px;
  --fs-sm: 14px;
  --fs-base: 16px;
  --fs-md: 18px;
  --fs-lg: 24px;
  --fs-xl: 32px;
  --fs-2xl: 48px;

  --fw-regular: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
  --fw-bold: 700;

  /* Colors */
  --color-primary: #1a1a1a;
  --color-secondary: #666666;
  --color-accent: #4A90D9;
  --color-bg: #ffffff;
  --color-bg-alt: #f5f5f5;
  --color-border: #e0e0e0;

  /* Spacing — Mobile (base) */
  --section-py-sm: 40px;
  --section-py-md: 60px;
  --section-py-lg: 80px;
  --gap-xs: 4px;
  --gap-sm: 8px;
  --gap-md: 16px;
  --gap-lg: 24px;
  --gap-xl: 32px;
  --gap-2xl: 48px;
}

@media (min-width: 768px) {
  :root {
    /* Spacing — Desktop overrides */
    --section-py-sm: 60px;
    --section-py-md: 80px;
    --section-py-lg: 120px;
  }
}
```

---

## Phase 5: Save Design Context Artifact

Write `.buildspace/artifacts/{feature-name}/design-context.md`.

Read the template from `${CLAUDE_SKILL_DIR}/templates/design-context-template.md` and fill it in with the design context extracted from Figma.

---

## Phase 6: Report and Hand Off

Present a summary to the user:

```
Design context saved to .buildspace/artifacts/{feature-name}/

Assets: X images, X videos processed
  - Uploaded to Shopify: X  (or "Local only — no credentials")
  - Failed: X (if any)
Design tokens: X values extracted → assets/design-system.css updated
Screenshots: saved for visual validation in /test

Run /prd to define requirements.
```

**Do NOT output full artifact contents in conversation. The files are the source of truth.**

---

## Rules
- Never write implementation code — only fetch, process, and organize
- Never make assumptions about implementation approach — that's for /plan
- Always fetch both desktop and mobile frames when both URLs are provided
- MCP asset URLs are ephemeral (localhost proxy) — download them immediately, do not defer
- Always rename assets meaningfully — never keep Figma's random names
- If a Figma API call fails, report the error clearly and suggest the user check the URL or permissions
- If Shopify upload fails for some assets, continue with others and report failures
- If design-system.css already exists, merge — never overwrite
- Save screenshots for /test visual validation — do not skip this step
