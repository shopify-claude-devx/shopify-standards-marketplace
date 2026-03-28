---
name: figma
description: >
  Fetch Figma design via REST API, parse exact design values, export assets,
  upload images to Shopify. Use before /prd for the Figma-to-code workflow.
  Requires FIGMA_TOKEN, SHOPIFY_STORE_URL, SHOPIFY_ACCESS_TOKEN in .env.
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
---

# Figma — Design Fetch, Parse, Export, Upload

You are entering the Figma phase. Your job:
1. Pre-flight the project (package.json, .gitignore, .env)
2. Fetch the raw Figma design via REST API (2 API calls, 0 AI tokens)
3. Parse the JSON into a clean `design-context.md` (0 AI tokens, auto-cleans raw JSON)
4. Review and fix asset names — make them meaningful
5. Export SVG snippets and image assets from Figma
6. Upload image assets to Shopify Files (with dedup)

**Do NOT write any implementation code. Do NOT plan. Only fetch, parse, export, and upload.**

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

Note: Figma Personal Access Tokens expire after 90 days maximum. If the token is expired, the user needs to generate a new one at figma.com/developers.

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

Run `fetch-figma.js` (3 REST API calls — node tree, screenshots, image fill sources):

```bash
source .env && FIGMA_TOKEN="$FIGMA_TOKEN" node ${CLAUDE_SKILL_DIR}/scripts/fetch-figma.js \
  {desktopFileKey} \
  {feature} \
  {desktopNodeId} \
  {mobileNodeId or -}
```

This saves to `.buildspace/artifacts/{feature}/`:
- `figma-full.json` — desktop node tree (scripts only, deleted after parse)
- `figma-full-mobile.json` — mobile node tree (if mobile provided, deleted after parse)
- `figma-sections.json` — section index with `mobileWidth` from actual Figma frame
- `figma-images.json` — image fill source URLs (deleted after parse)
- `screenshots/{section-name}-desktop.png` — section screenshot from Figma
- `screenshots/{section-name}-mobile.png` — section mobile screenshot (if provided)

Screenshots are named after the section (e.g., `hero-banner-desktop.png`), not generic names.

If the script fails, check: correct node ID? Token has read access to the file? Token not expired (90-day max)?

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
- Asset lists: images (with viewport) and SVGs (with snippet name)
- Responsive differences between desktop and mobile frames

**`figma-assets.json`** — Structured IMAGE and SVG asset lists with node IDs.

**`figma-diff-reference.json`** — Expected positions + typography per node ID (used by position-diff.js in /test).

After parsing, the script **auto-deletes** `figma-full.json` and `figma-full-mobile.json` to save disk space. If you need to re-parse, run Phase 1 again first.

---

## Phase 2b — Review Asset Names

Read `figma-assets.json` and `design-context.md` (the Layer Structure section).

For each asset, check if the name is meaningful. Figma layers often have generic names like "Frame 47" or "Rectangle 12" — the parse script handles most of these, but review the results.

**Naming conventions:**
- **Images:** `{section-name}-{purpose}` — e.g., `hero-banner-background`, `hero-banner-product-photo`, `hero-banner-mobile-background`
- **SVGs:** `icon-{descriptive-name}` — e.g., `icon-star`, `icon-arrow-right`, `icon-close`

If any asset has a generic or unclear name:
1. Look at the Layer Structure in `design-context.md` to understand what the asset represents
2. Edit `figma-assets.json` to update the `name` field (and `snippetName` for SVGs)
3. For images, always use the section name as prefix

**Do NOT rename assets that already have meaningful names from the designer's layer names.**

---

## Phase 3 — Export Assets [SCRIPT]

**Tokens used: 0. Script handles Figma API export and file downloads.**

```bash
source .env && FIGMA_TOKEN="$FIGMA_TOKEN" node ${CLAUDE_SKILL_DIR}/scripts/export-assets.js \
  {desktopFileKey} \
  {feature} \
  --theme-path .
```

This handles two types of assets:
- **SVGs** → exported via Figma `/v1/images/{key}?format=svg` endpoint, saved as `snippets/icon-{name}.liquid` (cleaned: XML declaration stripped)
- **Images** → downloaded from source CDN URLs (the raw uploaded images, not rendered exports), saved to `.buildspace/artifacts/{feature}/assets/{name}.png`

The script updates `figma-assets.json` with local paths and download status.

If a snippet already exists with the same name, it is **skipped** — not overwritten.

---

## Phase 4 — Upload to Shopify [SCRIPT]

**Tokens used: 0. Script handles all Shopify API calls.**

```bash
source .env && SHOPIFY_STORE_URL="$SHOPIFY_STORE_URL" SHOPIFY_ACCESS_TOKEN="$SHOPIFY_ACCESS_TOKEN" \
  node ${CLAUDE_SKILL_DIR}/scripts/process-assets.js {feature}
```

This reads `figma-assets.json` directly (no manual JSON construction needed) and:
1. **Dedup check** — queries Shopify Files to see if each image already exists. Skips duplicates.
2. **Upload** — for new images: `stagedUploadsCreate` → presigned URL upload → `fileCreate`
3. **Writes `asset-manifest.json`** with `shopifyUrl` values for each asset

Asset statuses in the manifest:
- `REGISTERED` — newly uploaded to Shopify, `shopifyUrl` is set
- `ALREADY_EXISTS` — already in Shopify Files, skipped (shopifyUrl still set)
- `FAILED` — upload failed, report to user which assets and why

---

## Phase 5 — Report & Hand-off

Print a summary — do NOT dump file contents to conversation:

```
Design context saved → .buildspace/artifacts/{feature}/design-context.md

Fetch complete:
  ✅ screenshots/{section-name}-desktop.png + {section-name}-mobile.png
  ✅ Parsed → design-context.md (raw JSON auto-cleaned)

SVG snippets:
  ✅ snippets/icon-{name}.liquid (×N)

Images uploaded to Shopify:
  ✅ {asset-name} → shopify://shop_images/{file}
  ↩ {asset-name} → already exists (skipped)
  ⚠  {failed-asset} → FAILED (manual upload needed)

Next step: run /prd to define requirements.
```

---

## Rules

- Never read `figma-full.json` directly — it is for scripts only and is auto-deleted after parse
- Never write implementation code (Liquid, CSS, JS) — that is for /execute
- Always run `fetch-figma.js` before `parse-figma.js` — order matters
- Always review asset names in Phase 2b before exporting — meaningful names matter for Shopify Files
- MCP Figma tools are NOT used in this workflow — REST API only
- Images are downloaded from source CDN URLs (raw uploads) — NOT rendered via the export endpoint. The export endpoint renders nodes with all their children, producing screenshots instead of usable images.
- Image source URLs expire after 14 days — run export-assets.js promptly after fetch+parse
- If Shopify upload fails for an asset, continue with the rest and report all failures at the end
- SVGs go to snippets, not Shopify Files — never reverse this
- Screenshots are section-wise, stored in `screenshots/` with section name prefix
