---
name: upload-assets
description: >
  Upload downloaded Figma assets to Shopify Files via the GraphQL Admin API.
  Reads asset-manifest.json, uploads each asset, and updates the manifest
  with CDN URLs. Use after /figma and before /prd.
disable-model-invocation: true
model: sonnet
allowed-tools: Read, Write, Bash, Glob, AskUserQuestion
---

# Upload Assets — Shopify Files Upload

You are entering the Upload Assets phase. Your job is to upload all downloaded Figma assets to Shopify Files and update the asset manifest with CDN URLs. Do NOT write implementation code.

## Input
Context or overrides: `$ARGUMENTS`

---

## Step 1: Validate Environment

Read the `.env` file in the project root and verify these values exist and are non-empty:
- `SHOPIFY_STORE_URL`
- `SHOPIFY_ACCESS_TOKEN`

If either is missing or empty, stop and tell the user:
```
Missing Shopify credentials in .env file.
Required:
  SHOPIFY_STORE_URL=your-store.myshopify.com
  SHOPIFY_ACCESS_TOKEN=shpat_xxxxx

The access token needs the "write_files" scope.
```

## Step 2: Find Asset Manifest

Check `.buildspace/artifacts/` for feature folders containing `asset-manifest.json`.

- If one folder exists → use it
- If multiple folders exist → ask the user which feature to upload
- If no manifest found → tell the user to run `/figma` first

Read the manifest and count how many assets need uploading (where `shopifyUrl` is null).

If all assets already have Shopify URLs, report that and stop.

## Step 3: Confirm with User

Before uploading, present a summary and confirm:

```
## Ready to Upload

**Store:** {store-url}
**Assets to upload:** {count}

| File | Type | Section |
|------|------|---------|
| {filename} | {image/icon} | {section} |
...

Proceed with upload?
```

Wait for confirmation. This prevents accidental uploads to the wrong store.

## Step 4: Run Upload Script

```bash
node ${CLAUDE_SKILL_DIR}/scripts/upload-to-shopify.js \
  --feature "<feature-name>" \
  --store "<store-url-from-env>" \
  --token "<access-token-from-env>"
```

The script will:
1. Read `asset-manifest.json`
2. For each asset without a Shopify URL:
   - Create a staged upload via `stagedUploadsCreate`
   - Upload the file to the staged URL
   - Register it in Shopify Files via `fileCreate`
   - Poll until the CDN URL is available
3. Update `asset-manifest.json` with CDN URLs

## Step 5: Present Results

After the script completes, read the updated `asset-manifest.json` and present:

```
## Upload Complete

**Uploaded:** {count}
**Failed:** {count}
**Already uploaded:** {count}

### Uploaded Assets
| File | Shopify CDN URL |
|------|----------------|
| {filename} | {cdn-url} |
...

### Failed (if any)
| File | Error |
|------|-------|
| {filename} | {error-message} |
```

If there are failures, suggest the user check:
- That the access token has `write_files` scope
- That the store URL is correct
- That the file isn't too large (Shopify has file size limits)

## Step 6: Video Reminder

If the asset manifest contains videos, remind the user:

```
### Videos — Manual Upload Required
The following videos need to be uploaded manually via Shopify admin (Settings → Files):
- {video-name} — from "{figma-layer}" in {section} section
```

## Step 7: Update Design Context

Read `.buildspace/artifacts/{feature-name}/design-context.md`. Find the Assets tables (each section has a table with a "Shopify URL" column). For each asset that was uploaded, replace `pending upload` with the actual Shopify CDN URL from the updated `asset-manifest.json`. Write the updated file back.

## Step 8: Hand Off

Tell the user:
```
Assets uploaded to Shopify Files.
asset-manifest.json updated with CDN URLs.
Run /prd to define requirements for this feature.
```

---

## Rules
- Always confirm with the user before uploading — never auto-upload
- Never expose the access token in conversation output
- If uploads fail, do not retry automatically — report and let the user decide
- Update asset-manifest.json even for partial success (some uploaded, some failed)
- Update design-context.md to reflect uploaded URLs
