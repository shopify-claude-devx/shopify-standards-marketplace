---
name: figma
description: >
  Fetch Figma design context, section screenshots, and assets for theme
  development. Accepts desktop and mobile frame URLs, downloads assets with
  meaningful names, and prepares an asset manifest for the pipeline.
  Use as the first step when building from a Figma design.
disable-model-invocation: true
model: sonnet
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

# Figma — Design Fetching & Asset Download

You are entering the Figma phase. Your job is to fetch a Figma design, download section screenshots and assets, and prepare structured artifacts for the rest of the pipeline. Do NOT write implementation code. Do NOT plan implementation.

## Input
The Figma URLs: `$ARGUMENTS`

Expected format:
```
Desktop: <figma-url>
Mobile: <figma-url>
```

If both URLs are not provided, ask the user for both before proceeding. Both desktop and mobile URLs must be collected upfront — do not ask for them separately.

If the user says there is no mobile frame, proceed with desktop only.

---

## Step 1: Validate Environment

Read the `.env` file in the project root and verify these values exist and are non-empty:
- `FIGMA_TOKEN`

If `FIGMA_TOKEN` is missing or empty, stop and tell the user:
```
Missing FIGMA_TOKEN in .env file.
Create a Figma personal access token at https://www.figma.com/developers/api#access-tokens
Add it to your .env: FIGMA_TOKEN=your-token-here
```

## Step 2: Derive Feature Name

Derive a short kebab-case feature name from the design (e.g., `hero-banner`, `product-carousel`).

Use `Glob('.buildspace/artifacts/*/asset-manifest.json')` to check for existing features. If one exists with the same name, confirm with the user that they want to overwrite it.

## Step 3: Run Fetch Script

Execute the fetch script:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/fetch-figma-assets.js \
  --desktop "<desktop-url>" \
  --mobile "<mobile-url>" \
  --feature "<feature-name>" \
  --token "<figma-token-from-env>"
```

If no mobile URL, omit the `--mobile` flag.

The script will:
1. Parse both Figma URLs to extract file keys and node IDs
2. Fetch the node tree for both frames (with component metadata for icon naming)
3. Identify sections (top-level children of each frame)
4. Export and download section-level screenshots to `.buildspace/artifacts/{feature-name}/screenshots/`
5. Walk the tree to find all image fills, icon components, and videos
6. Download raster images to `.buildspace/figmaAssets/` with temp names `{section}-{index}.jpg` (naming deferred to Step 3b)
7. Export SVGs and save to `.buildspace/figmaAssets/svg-temp/` with temp names (naming deferred to Step 3b)
8. Enrich manifest with metadata: ancestors, nearby text labels, bounds, component info (used in Step 3b for AI naming)
9. Save `asset-manifest.json` and `design-context.md` to `.buildspace/artifacts/{feature-name}/`

If the script fails, report the error clearly. Common issues:
- Invalid Figma URL format → ask user to check the URL
- 403 error → token doesn't have access to this file
- 429 error → rate limited, wait and retry
- No sections found → the frame might be flat (no child layers)

## Step 3b: AI Asset Naming

Read the generated `asset-manifest.json`. For each image and SVG, determine meaningful names using the provided metadata context.

### Image Naming

**Format:** `{section}-{container-title}-{image-identity}.jpg`
- If no useful container-title: `{section}-{image-identity}.jpg`

For each entry in `assets`:
1. Read the image file visually at `entry.path`
2. Determine `{image-identity}` from this vocabulary ONLY:
   - `background` | `thumbnail` | `headshot` | `avatar` | `screenshot` | `illustration` | `logo` | `banner` | `product-shot` | `lifestyle` | `photo`
3. Determine `{container-title}` from `entry.nearbyTexts` and `entry.ancestors` — pick the most specific, meaningful label (person's name, feature heading, product name, etc.)
   - Skip generic labels: Card, Block, Frame, Group, Image, Container, Wrapper, Section, etc.
4. **Anti-duplicate rule:** If `{container-title}` equals the section name or is a substring of it, omit the `{container-title}` part entirely.
5. Build the kebab-case name, then apply the consecutive word deduplication rule (below)
6. Handle collisions by appending `-2`, `-3`, etc.

### SVG / Icon Naming

**Format:** `icon-{meaning}.liquid` — maximum 2 words in the meaning (2 kebab segments max)

For each entry in `snippets`:
1. Read the SVG file content at `entry.tempFile`
2. From the SVG structure + `entry.figmaNodeName` + `entry.componentName`, determine what the icon represents
3. Use directional and functional icon terms where applicable:
   - Directional: `arrow-right`, `arrow-left`, `chevron-down`, `chevron-up`
   - Action: `check`, `close`, `menu`, `hamburger`, `plus`, `minus`, `search`
   - Object: `cart`, `heart`, `star`, `user`, `user-profile`, `share`
   - Social: `social-instagram`, `social-facebook`, `social-twitter`
   - Media: `play`, `pause`, `volume`, `mute`
   - Other: identify the icon's purpose in 1-2 words
4. Never exceed 2 kebab segments (e.g., `icon-arrow-right` OK, `icon-chevron-down-double` NOT OK)
5. Apply consecutive word deduplication rule (below)
6. Handle collisions by appending `-2`, `-3`, etc.

### Anti-Consecutive-Duplicate Word Rule (applies to ALL asset names)

After building any name, collapse consecutive repeated words (token deduplication):

Examples:
- `hero-banner-banner-background` → `hero-banner-background` (remove second "banner")
- `icon-check-check` → `icon-check` (remove second "check")
- `team-card-card-headshot` → `team-card-headshot` (remove second "card")

Algorithm: Split the final name by `-`, iterate through tokens, and skip any token that equals the previous token. Rejoin with `-`.

### Execution

After determining all final names in a single pass:

1. **Rename images:** Use Bash `mv` command to rename each file from `{tempFile}` to the final name
2. **Write SVG snippets:** For each icon in `snippets`, read `entry.tempFile`, write the SVG content to `snippets/icon-{final-name}.liquid`
3. **Update manifest:** For each asset entry, set `file` and `path` to the final values; for snippets also set `renderTag` to `{% render 'icon-{final-name}' %}`; clear `tempFile` field
4. **Write manifest:** Update `.buildspace/artifacts/{feature-name}/asset-manifest.json` with the final manifest
5. **Present summary:** Confirm to the user that naming is complete

## Step 4: Present Results

After Step 3b completes, read the updated `asset-manifest.json` and present a summary:

```
## Asset Naming Complete: {feature-name}

### Images Renamed
- [count] images renamed with semantic names
[List each: final-filename — context in {section}]

### Icon Snippets Created
- [count] snippets created in snippets/
[List each: icon-{name}.liquid — render with {% render 'icon-{name}' %}]

### Videos (Manual Upload Required)
[List each video with its suggested filename, or "None found"]

### Artifacts Ready
- `.buildspace/artifacts/{feature-name}/asset-manifest.json` — updated with final names
- `.buildspace/artifacts/{feature-name}/design-context.md` — ready for reference
- `.buildspace/artifacts/{feature-name}/screenshots/` — [count] section screenshots
- `.buildspace/figmaAssets/` — [count] semantic-named images
- `snippets/` — [count] icon snippets ready to use
```

## Step 5: Review Section Screenshots

Read each section screenshot from `.buildspace/artifacts/{feature-name}/screenshots/` and present them to the user for both desktop and mobile. For each section, briefly note:
- What the section contains (key elements visible)
- Any notable layout differences between desktop and mobile

## Step 6: Hand Off

Tell the user:
```
Design fetching and naming complete.
- Raster images are renamed and ready in .buildspace/figmaAssets/ (names follow the {section}-{container}-{type} pattern)
- Icon snippets are created and ready in snippets/ (no upload needed)
- Run /upload-assets to upload raster images to Shopify Files
- Then run /prd to define requirements
```

**Context tip:** You can `/clear` before the next step — all data is in artifacts and files, not conversation.

---

## Rules
- Never write implementation code — this skill only fetches and presents design information
- Never make assumptions about implementation approach — that's for `/plan`
- Always validate `.env` before calling any API
- If a Figma API call fails, report the error clearly with suggested fix
- Present all section screenshots to the user for visual review
- Overwrite existing artifacts if re-running for the same feature
