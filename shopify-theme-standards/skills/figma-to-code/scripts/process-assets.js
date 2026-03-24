#!/usr/bin/env node
// process-assets.js — Download Figma assets and upload to Shopify
// Zero dependencies — Node 18+ built-ins only

const { readFile, writeFile, copyFile, mkdir, stat } = require('node:fs/promises');
const path = require('node:path');

// ─── Config ────────────────────────────────────────────────────
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_API_VERSION = '2025-01';
const BATCH_LIMIT = 250;

// ─── MIME / Extension Mapping ──────────────────────────────────
const CONTENT_TYPE_TO_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

const EXT_TO_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};

function extFromContentType(contentType) {
  if (!contentType) return 'png';
  const base = contentType.split(';')[0].trim().toLowerCase();
  return CONTENT_TYPE_TO_EXT[base] || 'png';
}

function mimeFromExt(ext) {
  return EXT_TO_MIME[ext] || 'application/octet-stream';
}

// ─── Helpers ───────────────────────────────────────────────────
function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function log(msg) {
  console.error(`[process-assets] ${msg}`);
}

// ─── CLI Argument Parsing ──────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const inputIdx = args.indexOf('--input');
  if (inputIdx === -1 || !args[inputIdx + 1]) {
    console.error('Usage: process-assets.js --input <path-to-asset-input.json>');
    process.exit(1);
  }
  return path.resolve(args[inputIdx + 1]);
}

// ─── Input Validation ──────────────────────────────────────────
async function readInput(inputPath) {
  const raw = await readFile(inputPath, 'utf-8');
  const input = JSON.parse(raw);

  if (!input.section || typeof input.section !== 'string') {
    throw new Error('asset-input.json must have a "section" string field');
  }
  if (!Array.isArray(input.assets)) {
    throw new Error('asset-input.json must have an "assets" array');
  }

  for (const asset of input.assets) {
    if (!asset.name) throw new Error(`Asset missing "name" field`);
    if (!['IMAGE', 'VIDEO'].includes(asset.type)) {
      throw new Error(`Asset "${asset.name}" has invalid type "${asset.type}" — must be IMAGE or VIDEO`);
    }
    if (asset.upload && !asset.url && !asset.localPath) {
      throw new Error(`Asset "${asset.name}" has upload:true but no "url" or "localPath"`);
    }
  }

  return input;
}

// ─── Download Phase ────────────────────────────────────────────
async function downloadAll(assets, outputDir) {
  await mkdir(outputDir, { recursive: true });
  const results = [];

  for (const asset of assets) {
    try {
      if (asset.url) {
        // Download from URL (Figma MCP localhost proxy or any HTTP URL)
        log(`Downloading: ${asset.name} from ${asset.url}`);
        const response = await fetch(asset.url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        const ext = extFromContentType(contentType);
        const filename = `${asset.name}.${ext}`;
        const localPath = path.join(outputDir, filename);

        const buffer = Buffer.from(await response.arrayBuffer());
        await writeFile(localPath, buffer);

        const fileStat = await stat(localPath);

        results.push({
          ...asset,
          ext,
          filename,
          localPath,
          mimeType: mimeFromExt(ext),
          fileSize: asset.fileSize || String(fileStat.size),
          status: 'DOWNLOADED',
        });

        log(`  → Saved: ${filename} (${fileStat.size} bytes)`);
      } else if (asset.localPath) {
        // Copy user-provided local file
        const sourceExt = path.extname(asset.localPath).slice(1).toLowerCase() || 'mp4';
        const filename = `${asset.name}.${sourceExt}`;
        const destPath = path.join(outputDir, filename);

        log(`Copying: ${asset.name} from ${asset.localPath}`);
        await copyFile(asset.localPath, destPath);

        const fileStat = await stat(destPath);

        results.push({
          ...asset,
          ext: sourceExt,
          filename,
          localPath: destPath,
          mimeType: mimeFromExt(sourceExt),
          fileSize: asset.fileSize || String(fileStat.size),
          status: 'DOWNLOADED',
        });

        log(`  → Copied: ${filename} (${fileStat.size} bytes)`);
      }
    } catch (err) {
      log(`  ✗ FAILED to download "${asset.name}": ${err.message}`);
      results.push({
        ...asset,
        status: 'FAILED',
        error: `Download failed: ${err.message}`,
      });
    }
  }

  return results;
}

// ─── Shopify GraphQL Helper ────────────────────────────────────
async function shopifyGraphQL(query, variables) {
  const url = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify API ${response.status}: ${text}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return data;
}

// ─── Step 1: Batch Staged Uploads ──────────────────────────────
const STAGED_UPLOADS_MUTATION = `
  mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        url
        resourceUrl
        parameters {
          name
          value
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

async function batchStagedUploads(assets) {
  const allTargets = [];
  const batches = chunk(assets, BATCH_LIMIT);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    log(`Staged uploads batch ${i + 1}/${batches.length} (${batch.length} assets)`);

    const input = batch.map((asset) => ({
      filename: asset.filename,
      mimeType: asset.mimeType,
      resource: asset.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      httpMethod: asset.type === 'VIDEO' ? 'POST' : 'PUT',
      ...(asset.type === 'VIDEO' ? { fileSize: asset.fileSize } : {}),
    }));

    const result = await shopifyGraphQL(STAGED_UPLOADS_MUTATION, { input });
    const { stagedTargets, userErrors } = result.data.stagedUploadsCreate;

    if (userErrors && userErrors.length > 0) {
      log(`  ⚠ Staged upload errors: ${JSON.stringify(userErrors)}`);
    }

    allTargets.push(...stagedTargets);
  }

  return allTargets;
}

// ─── Step 2: Upload Files to Presigned URLs ────────────────────
async function uploadToPresignedUrls(assets, targets) {
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const target = targets[i];

    if (!target) {
      asset.status = 'FAILED';
      asset.error = 'No staged upload target returned';
      continue;
    }

    try {
      const fileBuffer = await readFile(asset.localPath);

      if (asset.type === 'VIDEO') {
        // Videos use POST with multipart form — parameters as fields, file LAST
        log(`Uploading (POST multipart): ${asset.filename}`);
        const formData = new FormData();
        for (const param of target.parameters) {
          formData.append(param.name, param.value);
        }
        formData.append('file', new Blob([fileBuffer]), asset.filename);

        const response = await fetch(target.url, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Upload POST ${response.status}: ${text}`);
        }
      } else {
        // Images use PUT with headers
        log(`Uploading (PUT): ${asset.filename}`);

        // Build headers from parameters
        const headers = { 'Content-Type': asset.mimeType };
        for (const param of target.parameters) {
          if (param.name.toLowerCase() !== 'content-type') {
            headers[param.name] = param.value;
          }
        }

        const response = await fetch(target.url, {
          method: 'PUT',
          headers,
          body: fileBuffer,
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Upload PUT ${response.status}: ${text}`);
        }
      }

      asset.resourceUrl = target.resourceUrl;
      asset.status = 'UPLOADED_TO_STAGING';
      log(`  → Staged: ${asset.filename}`);
    } catch (err) {
      log(`  ✗ FAILED to upload "${asset.filename}": ${err.message}`);
      asset.status = 'FAILED';
      asset.error = `Presigned upload failed: ${err.message}`;
    }
  }
}

// ─── Step 3: Batch File Create ─────────────────────────────────
const FILE_CREATE_MUTATION = `
  mutation fileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files {
        id
        alt
        createdAt
        fileStatus
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

async function batchFileCreate(assets) {
  // Only create files for successfully staged assets
  const staged = assets.filter((a) => a.resourceUrl && a.status !== 'FAILED');
  if (staged.length === 0) {
    log('No assets to register in Shopify — all failed or skipped');
    return;
  }

  const batches = chunk(staged, BATCH_LIMIT);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    log(`File create batch ${i + 1}/${batches.length} (${batch.length} assets)`);

    const files = batch.map((asset) => ({
      contentType: asset.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      originalSource: asset.resourceUrl,
      alt: asset.alt || '',
    }));

    const result = await shopifyGraphQL(FILE_CREATE_MUTATION, { files });
    const { userErrors } = result.data.fileCreate;

    if (userErrors && userErrors.length > 0) {
      log(`  ⚠ File create errors: ${JSON.stringify(userErrors)}`);
      // Mark affected assets
      for (const err of userErrors) {
        log(`    - ${err.field}: ${err.message}`);
      }
    } else {
      for (const asset of batch) {
        asset.status = 'REGISTERED';
      }
      log(`  → Registered ${batch.length} files in Shopify`);
    }
  }
}

// ─── Build Shopify URL ─────────────────────────────────────────
function buildShopifyUrl(asset) {
  if (asset.type === 'VIDEO') {
    return `shopify://files/videos/${asset.filename}`;
  }
  return `shopify://shop_images/${asset.filename}`;
}

// ─── Write Manifest ────────────────────────────────────────────
async function writeManifest(section, assets, skippedAssets, outputDir, uploaded) {
  const manifest = {
    status: uploaded ? 'UPLOADED' : 'LOCAL_ONLY',
    section,
    assets: assets.map((a) => ({
      name: a.name,
      originalUrl: a.url || null,
      localPath: path.relative(process.cwd(), a.localPath || ''),
      shopifyUrl: uploaded && a.status !== 'FAILED' ? buildShopifyUrl(a) : null,
      type: a.type,
      alt: a.alt || '',
      viewport: a.viewport || 'both',
      ...(a.status === 'FAILED' ? { status: 'FAILED', error: a.error } : {}),
    })),
    skipped: skippedAssets.map((a) => ({
      name: a.name,
      reason: a.skipReason || 'Not marked for upload',
    })),
  };

  const manifestPath = path.join(outputDir, 'asset-manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  log(`Manifest written: ${manifestPath}`);
  return manifestPath;
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  try {
    // 1. Parse args and read input
    const inputPath = parseArgs();
    const input = await readInput(inputPath);
    const outputDir = path.dirname(inputPath);

    log(`Section: ${input.section}`);
    log(`Total assets: ${input.assets.length}`);

    // 2. Separate uploadable vs skipped
    const toUpload = input.assets.filter((a) => a.upload);
    const skipped = input.assets.filter((a) => !a.upload);

    log(`To upload: ${toUpload.length}, Skipped: ${skipped.length}`);

    if (toUpload.length === 0) {
      log('No assets to process');
      await writeManifest(input.section, [], skipped, outputDir, false);
      console.log(JSON.stringify({ status: 'LOCAL_ONLY', total: 0, uploaded: 0, failed: 0, skipped: skipped.length }));
      return;
    }

    // 3. Download all assets
    const downloaded = await downloadAll(toUpload, outputDir);
    const successfulDownloads = downloaded.filter((a) => a.status !== 'FAILED');

    log(`Downloaded: ${successfulDownloads.length}/${toUpload.length}`);

    // 4. Upload to Shopify if credentials are present
    const hasCredentials = SHOPIFY_ACCESS_TOKEN && SHOPIFY_STORE_URL;

    if (hasCredentials && successfulDownloads.length > 0) {
      log(`Uploading to Shopify (${SHOPIFY_STORE_URL})...`);

      // 4a. Batch staged uploads
      const targets = await batchStagedUploads(successfulDownloads);

      // 4b. Upload files to presigned URLs
      await uploadToPresignedUrls(successfulDownloads, targets);

      // 4c. Batch file create
      await batchFileCreate(successfulDownloads);
    } else if (!hasCredentials) {
      log('No Shopify credentials — running in LOCAL_ONLY mode');
    }

    // 5. Write manifest
    const manifestPath = await writeManifest(input.section, downloaded, skipped, outputDir, hasCredentials);

    // 6. Print summary to stdout
    const uploaded = downloaded.filter((a) => a.status === 'REGISTERED').length;
    const failed = downloaded.filter((a) => a.status === 'FAILED').length;
    const localOnly = downloaded.filter((a) => a.status === 'DOWNLOADED').length;

    const summary = {
      status: hasCredentials ? 'UPLOADED' : 'LOCAL_ONLY',
      total: input.assets.length,
      uploaded,
      local: localOnly,
      failed,
      skipped: skipped.length,
      manifestPath,
    };

    console.log(JSON.stringify(summary));

    // Exit with error only if ALL uploads failed
    if (toUpload.length > 0 && successfulDownloads.length === 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error(`[process-assets] Fatal error: ${err.message}`);
    process.exit(1);
  }
}

main();
