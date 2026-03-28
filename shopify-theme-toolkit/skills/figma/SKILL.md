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
2. Fetch the node tree for both frames
3. Identify sections (top-level children of each frame)
4. Export and download section-level screenshots to `.buildspace/artifacts/{feature-name}/screenshots/`
5. Walk the tree to find all image fills and vector icons
6. Download and rename assets to `.buildspace/figmaAssets/` with `{section}-{purpose}.{ext}` names
7. Save `asset-manifest.json` and `design-context.md` to `.buildspace/artifacts/{feature-name}/`

If the script fails, report the error clearly. Common issues:
- Invalid Figma URL format → ask user to check the URL
- 403 error → token doesn't have access to this file
- 429 error → rate limited, wait and retry
- No sections found → the frame might be flat (no child layers)

## Step 4: Present Results

After the script completes, read the generated `asset-manifest.json` and present a summary:

```
## Figma Design Fetched: {feature-name}

### Sections Found
[List each section with desktop/mobile screenshot status]

### Assets Downloaded
- Images: [count] downloaded to .buildspace/figmaAssets/
- Icons (SVG): [count] downloaded to .buildspace/figmaAssets/
[List each asset: filename — from "{figma layer name}" in {section}]

### Videos (Manual Upload Required)
[List each video with its suggested filename, or "None found"]

### Artifacts Saved
- `.buildspace/artifacts/{feature-name}/asset-manifest.json`
- `.buildspace/artifacts/{feature-name}/design-context.md`
- `.buildspace/artifacts/{feature-name}/screenshots/` — [count] section screenshots
```

## Step 5: Review Section Screenshots

Read each section screenshot from `.buildspace/artifacts/{feature-name}/screenshots/` and present them to the user for both desktop and mobile. For each section, briefly note:
- What the section contains (key elements visible)
- Any notable layout differences between desktop and mobile

## Step 6: Hand Off

Tell the user:
```
Design context and assets saved.
Run /upload-assets to upload assets to Shopify Files before starting development.
Then run /prd to define requirements.
```

**Context tip:** You can `/clear` before the next step — all data is in artifacts, not conversation.

---

## Rules
- Never write implementation code — this skill only fetches and presents design information
- Never make assumptions about implementation approach — that's for `/plan`
- Always validate `.env` before calling any API
- If a Figma API call fails, report the error clearly with suggested fix
- Present all section screenshots to the user for visual review
- Overwrite existing artifacts if re-running for the same feature
