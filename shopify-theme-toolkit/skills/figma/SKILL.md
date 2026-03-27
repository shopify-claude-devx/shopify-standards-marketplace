---
name: figma
description: >
  Fetch Figma design via REST API, parse exact design values, create SVG snippets,
  upload images to Shopify. Use before /prd for the Figma-to-code workflow.
  Requires FIGMA_TOKEN, SHOPIFY_STORE_URL, SHOPIFY_ACCESS_TOKEN in .env.
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
---

# Figma — Design Fetch, Parse, Assets

You are entering the Figma phase. Your job:
1. Pre-flight the project (package.json, .gitignore, .env)
2. Fetch the raw Figma design via REST API (3 API calls, 0 AI tokens)
3. Parse the JSON into a clean `design-context.md` (0 AI tokens)
4. Create SVG icon snippets from the design
5. Upload image assets to Shopify Files
6. Extract design tokens → `assets/design-system.css`

**Do NOT write any implementation code. Do NOT plan. Only fetch, parse, and organize.**

---

## Input

Figma URL(s): `$ARGUMENTS`

Expected formats (pass both if the design has a mobile frame):
```
Desktop: https://www.figma.com/design/{fileKey}/{name}?node-id={nodeId}
Mobile:  https://www.figma.com/design/{fileKey}/{name}?node-id={nodeId}
```

---

## Phase 0 — Pre-flight

Before running any scripts:

### Step 1: Load .env credentials

Read `.env` in the project root and verify these three keys exist:
```
FIGMA_TOKEN=figd_...
SHOPIFY_STORE_URL=yourstore.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_...
```

If any are missing, tell the user exactly which ones and stop.

### Step 2: Ensure package.json exists

```bash
# Use the current directory name as the project name
test -f package.json || echo "{\"name\":\"$(basename "$PWD")\",\"version\":\"1.0.0\",\"private\":true}" > package.json
```

### Step 3: Ensure .gitignore covers generated files

Read `.gitignore` (create if missing). Add any of these entries that are absent:
```
node_modules/
.env
.env.local
.buildspace/
```

Do not overwrite existing content — only append what is missing.

### Step 4: Parse Figma URL(s)

If URLs were not provided in `$ARGUMENTS`, ask the user:
1. Desktop Figma URL
2. Mobile Figma URL (or "none" if no mobile frame)

From each URL extract:
- `fileKey` — from `figma.com/design/:fileKey/`
- `nodeId` — from `?node-id=` — **convert `-` to `:`**

Store as `desktopFileKey`, `desktopNodeId`, `mobileFileKey` (usually same), `mobileNodeId`.

### Step 5: Confirm feature name

Derive a short kebab-case feature name from the URL file name or design name
(e.g., `hero-banner`, `product-carousel`). Confirm with the user.

---

## Phase 1 — Fetch [SCRIPT]

**Tokens used: 0. Scripts handle all API calls.**

Run `fetch-figma.js` (3 REST API calls upfront, then fully offline):

```bash
source .env && FIGMA_TOKEN="$FIGMA_TOKEN" node ${CLAUDE_SKILL_DIR}/scripts/fetch-figma.js \
  {desktopFileKey} \
  {feature} \
  {desktopNodeId} \
  {mobileNodeId or -}
```

This saves to `.buildspace/artifacts/{feature}/`:
- `figma-full.json` — desktop node tree (AI never reads this)
- `figma-full-mobile.json` — mobile node tree (if mobile provided)
- `figma-sections.json` — section index with `mobileWidth` from actual Figma frame
- `figma-images.json` — CDN URL map for all image fills
- `screenshots/figma-desktop.png` — Figma design screenshot
- `screenshots/figma-mobile.png` — Figma mobile screenshot (if provided)

If the script fails, check: correct node ID? Token has read access to the file?

---

## Phase 2 — Parse [SCRIPT]

**Tokens used: 0. Parse extracts exact values without AI.**

```bash
node ${CLAUDE_SKILL_DIR}/scripts/parse-figma.js {feature}
```

This reads `figma-full.json` locally (zero API calls) and writes:

**`design-context.md`** — The only Figma file AI will ever read. Contains:
- CSS typography comment block (copy-paste ready for the CSS file)
- Typography table with exact values: family, px, rem, weight, line-height, letter-spacing, color, node ID
- Layout: flex-direction, gap, padding, background per frame
- Layer structure with every node ID and BEM class suggestion
- Asset lists: images (with CDN URL) and SVGs (with snippet name)
- Responsive differences between desktop and mobile frames

**`figma-assets.json`** — Structured IMAGE and SVG asset lists with node IDs.

**`figma-diff-reference.json`** — Expected positions + typography per node ID (used by position-diff.js in /test).

After running, read `design-context.md` and confirm the layer structure looks correct.

---

## Phase 3 — SVG Snippets [SCRIPT]

**Tokens used: 0 for fetching. SVG code goes straight to snippets.**

If `figma-assets.json` contains SVG entries:

```bash
source .env && FIGMA_TOKEN="$FIGMA_TOKEN" node ${CLAUDE_SKILL_DIR}/scripts/fetch-svgs.js \
  {desktopFileKey} \
  {feature} \
  --theme-path .
```

This fetches SVG export code from Figma for each SVG node and writes:
- `snippets/icon-{name}.liquid` — clean SVG code (XML declaration stripped)

After running, verify the snippet files exist and contain valid SVG.

If a snippet already exists with the same name, **do not overwrite** — report the conflict to the user.

---

## Phase 4 — Image Upload [SCRIPT]

**Tokens used: 0 for download/upload. Scripts handle all file I/O.**

Read `figma-assets.json`. For each IMAGE asset, build `asset-input.json`:

```bash
# Read the CDN URL from figma-assets.json images[n].cdnUrl
# Write to .buildspace/artifacts/{feature}/asset-input.json
```

Write `.buildspace/artifacts/{feature}/asset-input.json`:

```json
{
  "section": "{feature}",
  "assets": [
    {
      "name": "{asset.name}",
      "type": "IMAGE",
      "upload": true,
      "url": "{asset.cdnUrl}",
      "alt": "{human-readable description from layer name}",
      "viewport": "{asset.viewport}"
    }
  ]
}
```

Then run:

```bash
source .env && SHOPIFY_STORE_URL="$SHOPIFY_STORE_URL" SHOPIFY_ACCESS_TOKEN="$SHOPIFY_ACCESS_TOKEN" \
  node ${CLAUDE_SKILL_DIR}/scripts/process-assets.js \
  --input .buildspace/artifacts/{feature}/asset-input.json
```

This downloads images from Figma CDN and uploads them to Shopify Files via `stagedUploadsCreate` → presigned URL → `fileCreate`.

Read the generated `asset-manifest.json`:
- `REGISTERED` — uploaded to Shopify, `shopifyUrl` is set
- `DOWNLOADED` — local only (no Shopify credentials, won't happen since credentials are always present)
- `FAILED` — report to user, do not silently skip

If an asset CDN URL is null (not found in `figma-images.json`), skip it and tell the user which layer it was.

---

## Phase 5 — Design Tokens

Read `design-context.md` (already written by parse-figma.js). Extract:

**Typography:** all unique font sizes, families, weights, line-heights
**Colors:** background, text, accent, border colors
**Spacing:** section padding (desktop + mobile), gap values

Normalize values:
- Round font sizes to nearest 0.5px if within 1px of each other
- Deduplicate near-identical colors (within 5 RGB units)
- Round spacing to 4px increments where values are near-identical

### Create or update `assets/design-system.css`

**If it doesn't exist:** create it.
**If it exists:** read it first, then merge — add new tokens only. Never remove existing tokens. If a token name conflicts, keep the existing value and report the conflict.

```css
/* Design System — auto-generated from Figma, merged incrementally */
/* Do not add section-specific styles here. Shared tokens only. */

:root {
  /* Typography */
  --ff-primary: '{fontFamily}', sans-serif;
  --fs-{size-name}: {value}px;
  --fw-{weight-name}: {value};

  /* Colors */
  --color-{name}: {hex};

  /* Spacing — Mobile (base) */
  --section-py-{size}: {mobile-value}px;
  --gap-{size}: {value}px;
}

@media (min-width: 768px) {
  :root {
    /* Spacing — Desktop overrides */
    --section-py-{size}: {desktop-value}px;
  }
}
```

---

## Phase 6 — Report & Hand-off

Print a summary — do NOT dump file contents to conversation:

```
Design context saved → .buildspace/artifacts/{feature}/design-context.md

Fetch complete:
  ✅ figma-desktop.png + figma-mobile.png
  ✅ figma-full.json parsed → design-context.md

SVG snippets:
  ✅ snippets/icon-{name}.liquid (×N)

Images uploaded to Shopify:
  ✅ {asset-name} → shopify://shop_images/{file}
  ⚠  {failed-asset} → FAILED (manual upload needed)

Design tokens → assets/design-system.css (updated)

Next step: run /prd to define requirements.
```

---

## Rules

- Never read `figma-full.json` or `figma-full-mobile.json` directly — they are for scripts only
- Never write implementation code (Liquid, CSS, JS) — that is for /execute
- Always run `fetch-figma.js` before `parse-figma.js` — order matters
- MCP Figma tools are NOT used in this workflow — REST API only
- If an image asset has no CDN URL in `figma-images.json`, skip and report — never guess
- If Shopify upload fails for an asset, continue with the rest and report all failures at the end
- If `design-system.css` exists, always merge — never overwrite
- SVGs go to snippets, not Shopify Files — never reverse this
