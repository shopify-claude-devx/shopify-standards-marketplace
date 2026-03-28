'use strict';

const { readFile, writeFile, stat } = require('node:fs/promises');
const path = require('node:path');

const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_API_VERSION = '2025-01';
const BATCH_LIMIT = 250;

function log(msg) {
  console.error(`[process-assets] ${msg}`);
}

function parseArgs() {
  const feature = process.argv[2];
  if (!feature) {
    console.error('Usage: process-assets.js <feature>');
    process.exit(1);
  }
  return feature;
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function mimeFromExt(ext) {
  const map = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
  };
  return map[ext] || 'application/octet-stream';
}


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


const FILES_QUERY = `
  query checkFile($query: String!) {
    files(first: 1, query: $query) {
      edges {
        node {
          id
          alt
          fileStatus
        }
      }
    }
  }
`;

async function fileExistsInShopify(filename) {
  try {
    const result = await shopifyGraphQL(FILES_QUERY, { query: `filename:'${filename}'` });
    const edges = result?.data?.files?.edges || [];
    return edges.length > 0;
  } catch (err) {
    log(`  ⚠ Dedup check failed for "${filename}": ${err.message} — will upload anyway`);
    return false;
  }
}


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
      resource: 'IMAGE',
      httpMethod: 'PUT',
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

      log(`Uploading (PUT): ${asset.filename}`);

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
      contentType: 'IMAGE',
      originalSource: asset.resourceUrl,
      alt: asset.alt || '',
    }));

    const result = await shopifyGraphQL(FILE_CREATE_MUTATION, { files });
    const { userErrors } = result.data.fileCreate;

    if (userErrors && userErrors.length > 0) {
      log(`  ⚠ File create errors: ${JSON.stringify(userErrors)}`);
      for (const err of userErrors) {
        log(`    - ${err.field}: ${err.message}`);
      }
      for (const asset of batch) {
        asset.status = 'FAILED';
        asset.error = `Shopify fileCreate error: ${userErrors.map((e) => e.message).join('; ')}`;
      }
    } else {
      for (const asset of batch) {
        asset.status = 'REGISTERED';
      }
      log(`  → Registered ${batch.length} files in Shopify`);
    }
  }
}


function buildShopifyUrl(asset) {
  return `shopify://shop_images/${asset.filename}`;
}


async function writeManifest(section, assets, outputDir, uploaded) {
  const manifest = {
    status: uploaded ? 'UPLOADED' : 'LOCAL_ONLY',
    section,
    assets: assets.map((a) => ({
      name: a.name,
      localPath: a.localPath || null,
      shopifyUrl: (a.status === 'REGISTERED' || a.status === 'ALREADY_EXISTS') ? buildShopifyUrl(a) : null,
      type: 'IMAGE',
      alt: a.alt || a.layerName || '',
      viewport: a.viewport || 'desktop',
      status: a.status,
      ...(a.status === 'FAILED' ? { error: a.error } : {}),
    })),
  };

  const manifestPath = path.join(outputDir, 'asset-manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  log(`Manifest written: ${manifestPath}`);
  return manifestPath;
}

async function main() {
  try {
    const feature = parseArgs();
    const base = path.resolve(`.buildspace/artifacts/${feature}`);

    const assetsRaw = await readFile(path.join(base, 'figma-assets.json'), 'utf-8').catch(() => {
      throw new Error('figma-assets.json not found. Run parse-figma.js and export-assets.js first.');
    });
    let assets;
    try {
      assets = JSON.parse(assetsRaw);
    } catch (err) {
      throw new Error(`figma-assets.json is not valid JSON: ${err.message}`);
    }

    const section = assets.sectionName || assets.feature || feature;
    const images = (assets.images || []).filter((a) => a.status === 'EXPORTED' && a.localPath);

    log(`Section: ${section}`);
    log(`Uploadable images: ${images.length}`);

    if (images.length === 0) {
      log('No exported images to upload');
      await writeManifest(section, [], base, false);
      console.log(JSON.stringify({ status: 'NO_IMAGES', total: 0, uploaded: 0, failed: 0, dedup: 0 }));
      return;
    }

    // Resolve local paths and add metadata needed for upload
    for (const img of images) {
      const absPath = path.resolve(img.localPath);
      img.localPath = absPath;
      const ext = path.extname(absPath).slice(1).toLowerCase() || 'png';
      img.filename = `${img.name}.${ext}`;
      img.mimeType = mimeFromExt(ext);

      try {
        const fileStat = await stat(absPath);
        img.fileSize = String(fileStat.size);
      } catch {
        log(`  ⚠ Local file not found: ${img.localPath} — marking as FAILED`);
        img.status = 'FAILED';
        img.error = 'Local file not found. Re-run export-assets.js.';
      }
    }

    const validImages = images.filter((a) => a.status !== 'FAILED');
    const hasCredentials = SHOPIFY_ACCESS_TOKEN && SHOPIFY_STORE_URL;

    if (!hasCredentials) {
      log('No Shopify credentials — running in LOCAL_ONLY mode');
      await writeManifest(section, images, base, false);
      console.log(JSON.stringify({ status: 'LOCAL_ONLY', total: images.length, uploaded: 0, failed: 0, dedup: 0 }));
      return;
    }

    log(`Uploading to Shopify (${SHOPIFY_STORE_URL})...`);

    // Dedup check — skip images that already exist in Shopify Files
    const toUpload = [];
    let dedupCount = 0;
    for (const img of validImages) {
      const exists = await fileExistsInShopify(img.filename);
      if (exists) {
        log(`  ↩ Already exists in Shopify: ${img.filename}`);
        img.status = 'ALREADY_EXISTS';
        dedupCount++;
      } else {
        toUpload.push(img);
      }
    }

    if (dedupCount > 0) {
      log(`${dedupCount} image(s) already in Shopify — skipped`);
    }

    if (toUpload.length > 0) {
      const targets = await batchStagedUploads(toUpload);
      await uploadToPresignedUrls(toUpload, targets);
      await batchFileCreate(toUpload);
    }

    const manifestPath = await writeManifest(section, images, base, true);

    const uploaded = images.filter((a) => a.status === 'REGISTERED').length;
    const alreadyExists = images.filter((a) => a.status === 'ALREADY_EXISTS').length;
    const failed = images.filter((a) => a.status === 'FAILED').length;

    const summary = {
      status: 'UPLOADED',
      total: images.length,
      uploaded,
      dedup: alreadyExists,
      failed,
      manifestPath,
    };

    console.log(JSON.stringify(summary));

    if (images.length > 0 && uploaded === 0 && alreadyExists === 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error(`[process-assets] Fatal error: ${err.message}`);
    process.exit(1);
  }
}

main();
