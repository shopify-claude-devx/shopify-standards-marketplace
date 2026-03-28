#!/usr/bin/env node
/**
 * upload-to-shopify.js
 *
 * Usage:
 *   node upload-to-shopify.js \
 *     --feature "<feature-name>" --store "<store-url>" --token "<access-token>"
 *
 * Reads:  .buildspace/artifacts/{feature}/asset-manifest.json
 * Writes: Updates asset-manifest.json with shopifyUrl for each uploaded asset
 */

'use strict';

const https = require('node:https');
const fs = require('node:fs');
const { readFile, writeFile, stat } = require('node:fs/promises');
const path = require('node:path');

const API_VERSION = '2024-10';
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 30;

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
};

const SHOPIFY_CONTENT_TYPES = {
  '.jpg': 'IMAGE',
  '.jpeg': 'IMAGE',
  '.png': 'IMAGE',
  '.gif': 'IMAGE',
  '.webp': 'IMAGE',
  '.svg': 'IMAGE',
  '.mp4': 'VIDEO',
  '.webm': 'VIDEO',
  '.pdf': 'FILE',
};

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
  };

  const feature = get('--feature');
  const store = get('--store');
  const token = get('--token');

  if (!feature || !store || !token) {
    console.error(
      'Usage: upload-to-shopify.js --feature <name> --store <url> --token <token>\n' +
      '  --feature  (required) Feature name matching asset-manifest.json\n' +
      '  --store    (required) Shopify store URL (e.g., my-store.myshopify.com)\n' +
      '  --token    (required) Shopify Admin API access token'
    );
    process.exit(1);
  }

  const storeHost = store
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');

  return { feature, storeHost, token };
}

function shopifyGraphQL(storeHost, token, query, variables = {}) {
  const payload = JSON.stringify({ query, variables });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: storeHost,
      path: `/admin/api/${API_VERSION}/graphql.json`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Shopify API ${res.statusCode}: ${data.slice(0, 500)}`));
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.errors) {
            reject(new Error(`Shopify GraphQL errors: ${JSON.stringify(parsed.errors)}`));
            return;
          }
          resolve(parsed.data);
        } catch (e) {
          reject(new Error(`Failed to parse Shopify response: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Shopify API request timeout'));
    });
    req.write(payload);
    req.end();
  });
}

function uploadToStaged(url, parameters, filePath, mimeType) {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const boundary = `----FormBoundary${Date.now()}`;

    const parts = [];
    for (const param of parameters) {
      parts.push(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${param.name}"\r\n\r\n` +
        `${param.value}\r\n`
      );
    }
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
    );

    const preamble = Buffer.from(parts.join(''));
    const epilogue = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([preamble, fileContent, epilogue]);

    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : require('node:http');

    const req = client.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body: data });
        } else {
          reject(new Error(`Staged upload failed (${res.statusCode}): ${data.slice(0, 300)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error('Staged upload timeout'));
    });
    req.write(body);
    req.end();
  });
}

// SVG uses PUT with parameters as headers instead of multipart form
function uploadSvgPut(url, parameters, filePath, mimeType) {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath);
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : require('node:http');

    const headers = {
      'Content-Type': mimeType,
      'Content-Length': fileContent.length,
    };
    for (const param of parameters) {
      headers[param.name] = param.value;
    }

    const req = client.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'PUT',
      headers,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body: data });
        } else {
          reject(new Error(`SVG PUT upload failed (${res.statusCode}): ${data.slice(0, 300)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('SVG upload timeout'));
    });
    req.write(fileContent);
    req.end();
  });
}

async function createStagedUpload(storeHost, token, filename, mimeType, fileSize) {
  const query = `
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

  const httpMethod = mimeType === 'image/svg+xml' ? 'PUT' : 'POST';

  const variables = {
    input: [{
      filename,
      mimeType,
      fileSize: String(fileSize),
      httpMethod,
      resource: 'FILE',
    }],
  };

  const data = await shopifyGraphQL(storeHost, token, query, variables);
  const result = data.stagedUploadsCreate;

  if (result.userErrors.length > 0) {
    throw new Error(`Staged upload error: ${JSON.stringify(result.userErrors)}`);
  }

  if (!result.stagedTargets || result.stagedTargets.length === 0) {
    throw new Error('No staged upload target returned');
  }

  return result.stagedTargets[0];
}

async function createFile(storeHost, token, filename, resourceUrl, contentType) {
  const query = `
    mutation fileCreate($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files {
          id
          alt
          createdAt
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    files: [{
      alt: filename.replace(/\.[^.]+$/, '').replace(/-/g, ' '),
      contentType,
      originalSource: resourceUrl,
    }],
  };

  const data = await shopifyGraphQL(storeHost, token, query, variables);
  const result = data.fileCreate;

  if (result.userErrors.length > 0) {
    throw new Error(`File create error: ${JSON.stringify(result.userErrors)}`);
  }

  if (!result.files || result.files.length === 0) {
    throw new Error('No file record returned from fileCreate');
  }

  return result.files[0];
}

async function pollFileUrl(storeHost, token, fileId) {
  const query = `
    query getFile($id: ID!) {
      node(id: $id) {
        ... on GenericFile {
          url
        }
        ... on MediaImage {
          image {
            url
          }
        }
        ... on Video {
          sources {
            url
          }
        }
      }
    }
  `;

  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    const data = await shopifyGraphQL(storeHost, token, query, { id: fileId });
    const node = data.node;

    if (node) {
      const url = node.url || node.image?.url || node.sources?.[0]?.url;
      if (url) return url;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { feature, storeHost, token } = parseArgs();

  const manifestPath = path.resolve(`.buildspace/artifacts/${feature}/asset-manifest.json`);
  let manifest;
  try {
    const raw = await readFile(manifestPath, 'utf-8');
    manifest = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Could not read asset-manifest.json at ${manifestPath}\n` +
      `Run /figma first to fetch assets. Error: ${err.message}`
    );
  }

  const pending = manifest.assets.filter((a) => !a.shopifyUrl);
  if (pending.length === 0) {
    console.error('[upload] All assets already have Shopify URLs. Nothing to upload.');
    console.log(JSON.stringify({ uploaded: 0, failed: 0, skipped: manifest.assets.length }));
    return;
  }

  console.error(`[upload] ${pending.length} assets to upload to ${storeHost}`);

  const results = [];
  let uploaded = 0;
  let failed = 0;

  for (const asset of pending) {
    const filePath = path.resolve(asset.path);
    const ext = path.extname(asset.file).toLowerCase();
    const mimeType = MIME_TYPES[ext];
    const contentType = SHOPIFY_CONTENT_TYPES[ext];

    if (!mimeType || !contentType) {
      console.error(`[upload] Skipping "${asset.file}" — unsupported file type: ${ext}`);
      results.push({ file: asset.file, status: 'SKIPPED', reason: `Unsupported type: ${ext}` });
      continue;
    }

    try {
      await stat(filePath);
    } catch {
      console.error(`[upload] Skipping "${asset.file}" — file not found at ${filePath}`);
      results.push({ file: asset.file, status: 'SKIPPED', reason: 'File not found' });
      continue;
    }

    const fileSize = (await stat(filePath)).size;

    try {
      console.error(`[upload] [1/3] Creating staged upload for "${asset.file}"...`);
      const staged = await createStagedUpload(storeHost, token, asset.file, mimeType, fileSize);

      console.error(`[upload] [2/3] Uploading "${asset.file}" (${(fileSize / 1024).toFixed(1)}KB)...`);
      if (mimeType === 'image/svg+xml') {
        await uploadSvgPut(staged.url, staged.parameters, filePath, mimeType);
      } else {
        await uploadToStaged(staged.url, staged.parameters, filePath, mimeType);
      }

      console.error(`[upload] [3/3] Registering "${asset.file}" in Shopify Files...`);
      const fileRecord = await createFile(storeHost, token, asset.file, staged.resourceUrl, contentType);

      console.error(`[upload] Waiting for CDN URL...`);
      const cdnUrl = await pollFileUrl(storeHost, token, fileRecord.id);

      if (cdnUrl) {
        asset.shopifyUrl = cdnUrl;
        console.error(`[upload] Done: ${asset.file} → ${cdnUrl}`);
        results.push({ file: asset.file, status: 'UPLOADED', shopifyUrl: cdnUrl });
        uploaded++;
      } else {
        console.error(`[upload] Warning: "${asset.file}" uploaded but CDN URL not ready. Check Shopify Files admin.`);
        asset.shopifyUrl = staged.resourceUrl;
        results.push({ file: asset.file, status: 'UPLOADED_PENDING', resourceUrl: staged.resourceUrl });
        uploaded++;
      }
    } catch (err) {
      console.error(`[upload] Failed: "${asset.file}" — ${err.message}`);
      results.push({ file: asset.file, status: 'FAILED', error: err.message });
      failed++;
    }
  }

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.error(`[upload] Updated asset-manifest.json`);

  const skipped = results.filter((r) => r.status === 'SKIPPED').length;
  const alreadyUploaded = manifest.assets.length - pending.length;

  const report = {
    feature,
    store: storeHost,
    uploaded,
    failed,
    skipped,
    alreadyUploaded,
    results,
  };

  console.error(`[upload] Complete: ${uploaded} uploaded, ${failed} failed, ${skipped} skipped`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(`[upload] Fatal: ${err.message}`);
  process.exit(1);
});
