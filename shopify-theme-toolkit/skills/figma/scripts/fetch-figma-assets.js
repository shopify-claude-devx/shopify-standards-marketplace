#!/usr/bin/env node
/**
 * fetch-figma-assets.js
 *
 * Usage:
 *   node fetch-figma-assets.js \
 *     --desktop "<figma-url>" --mobile "<figma-url>" \
 *     --feature "<feature-name>" --token "<figma-token>"
 *
 * Output:
 *   .buildspace/figmaAssets/                          — downloaded assets
 *   .buildspace/artifacts/{feature}/screenshots/      — section screenshots
 *   .buildspace/artifacts/{feature}/asset-manifest.json
 *   .buildspace/artifacts/{feature}/design-context.md
 */

'use strict';

const https = require('node:https');
const http = require('node:http');
const fs = require('node:fs');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');

const FIGMA_API = 'https://api.figma.com/v1';
const EXPORT_SCALE = 2;
const EXPORT_FORMAT = 'png';
const SVG_FORMAT = 'svg';
const ICON_MAX_SIZE = 128;

const VECTOR_TYPES = new Set([
  'VECTOR', 'BOOLEAN_OPERATION', 'LINE', 'STAR',
  'ELLIPSE', 'REGULAR_POLYGON',
]);

const SECTION_CONTAINER_TYPES = new Set([
  'SECTION', 'FRAME', 'GROUP', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE',
]);

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
  };

  const desktop = get('--desktop');
  const mobile = get('--mobile');
  const feature = get('--feature');
  const token = get('--token');

  if (!desktop || !feature || !token) {
    console.error(
      'Usage: fetch-figma-assets.js --desktop <url> --mobile <url> --feature <name> --token <token>\n' +
      '  --desktop  (required) Figma frame URL for desktop design\n' +
      '  --mobile   (optional) Figma frame URL for mobile design\n' +
      '  --feature  (required) Kebab-case feature name\n' +
      '  --token    (required) Figma personal access token'
    );
    process.exit(1);
  }

  return { desktop, mobile, feature, token };
}

/**
 * Supported URL formats:
 *   figma.com/design/:fileKey/:fileName?node-id=:nodeId
 *   figma.com/design/:fileKey/branch/:branchKey/:fileName?node-id=:nodeId
 *   figma.com/file/:fileKey/:fileName?node-id=:nodeId
 */
function parseFigmaUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  const pathParts = parsed.pathname.split('/').filter(Boolean);

  let fileKey = null;
  if (pathParts[0] === 'design' || pathParts[0] === 'file') {
    if (pathParts[2] === 'branch' && pathParts[3]) {
      fileKey = pathParts[3]; // branch identifier used as fileKey in API calls
    } else {
      fileKey = pathParts[1];
    }
  }

  if (!fileKey) {
    throw new Error(`Could not extract file key from URL: ${url}`);
  }

  // node-id uses '-' in URL but ':' in API
  const rawNodeId = parsed.searchParams.get('node-id');
  if (!rawNodeId) {
    throw new Error(`No node-id query parameter found in URL: ${url}`);
  }
  const nodeId = rawNodeId.replace(/-/g, ':');

  return { fileKey, nodeId };
}

function figmaGet(endpoint, token) {
  const url = `${FIGMA_API}${endpoint}`;
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'X-FIGMA-TOKEN': token },
    }, (res) => {
      if (res.statusCode === 429) {
        reject(new Error('Figma API rate limit exceeded. Wait a moment and retry.'));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Figma API ${res.statusCode}: ${data.slice(0, 300)}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse Figma API response: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error(`Figma API timeout: ${endpoint}`));
    });
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed (${res.statusCode}): ${url.slice(0, 120)}`));
        return;
      }
      const stream = fs.createWriteStream(destPath);
      res.pipe(stream);
      stream.on('finish', () => { stream.close(); resolve(); });
      stream.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error(`Download timeout: ${url.slice(0, 120)}`));
    });
  });
}

function toKebab(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function buildAssetName(sectionName, nodeName, nodeType, index) {
  const genericNames = new Set([
    'image', 'frame', 'group', 'rectangle', 'vector', 'ellipse',
    'component', 'instance', 'mask', 'background',
  ]);

  const section = toKebab(sectionName);
  let purpose = toKebab(nodeName);

  if (!purpose || genericNames.has(purpose)) {
    purpose = VECTOR_TYPES.has(nodeType) ? `icon-${index + 1}` : `image-${index + 1}`;
  }

  return `${section}-${purpose}`;
}

function deduplicateName(name, existingNames) {
  if (!existingNames.has(name)) {
    existingNames.add(name);
    return name;
  }
  let counter = 2;
  while (existingNames.has(`${name}-${counter}`)) {
    counter++;
  }
  const unique = `${name}-${counter}`;
  existingNames.add(unique);
  return unique;
}

function identifySections(frameNode) {
  if (!frameNode.children || frameNode.children.length === 0) {
    return [];
  }

  return frameNode.children
    .filter((child) => SECTION_CONTAINER_TYPES.has(child.type) && child.visible !== false)
    .map((child) => ({
      id: child.id,
      name: child.name,
      type: child.type,
      bounds: child.absoluteBoundingBox || null,
    }));
}

function walkForAssets(node, sectionName, results) {
  if (!node || node.visible === false) return;

  const fills = node.fills || [];
  for (const fill of fills) {
    if (fill.type === 'IMAGE' && fill.imageRef && fill.visible !== false) {
      results.imageFills.push({
        imageRef: fill.imageRef,
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        sectionName,
      });
    }
    if (fill.type === 'VIDEO') {
      results.videos.push({
        nodeId: node.id,
        nodeName: node.name,
        sectionName,
      });
    }
  }

  if (VECTOR_TYPES.has(node.type)) {
    const bounds = node.absoluteBoundingBox;
    if (bounds && bounds.width <= ICON_MAX_SIZE && bounds.height <= ICON_MAX_SIZE) {
      results.vectors.push({
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        sectionName,
        width: bounds.width,
        height: bounds.height,
      });
    }
  }

  if (node.children) {
    for (const child of node.children) {
      walkForAssets(child, sectionName, results);
    }
  }
}

function collectAssets(frameNode) {
  const results = { imageFills: [], vectors: [], videos: [] };
  const sections = identifySections(frameNode);

  for (const section of sections) {
    const sectionNode = frameNode.children.find((c) => c.id === section.id);
    if (sectionNode) {
      walkForAssets(sectionNode, section.name, results);
    }
  }

  return results;
}

async function fetchNodeTree(fileKey, nodeId, token) {
  const encodedId = encodeURIComponent(nodeId);
  const data = await figmaGet(`/files/${fileKey}/nodes?ids=${encodedId}`, token);

  const nodeData = data.nodes[nodeId];
  if (!nodeData || !nodeData.document) {
    throw new Error(`Node ${nodeId} not found in file ${fileKey}. Check the URL and permissions.`);
  }

  return nodeData.document;
}

async function exportNodes(fileKey, nodeIds, format, scale, token) {
  if (nodeIds.length === 0) return {};

  const ids = nodeIds.join(',');
  const data = await figmaGet(
    `/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=${format}&scale=${scale}`,
    token
  );

  if (data.err) {
    throw new Error(`Figma image export error: ${data.err}`);
  }

  return data.images || {};
}

async function fetchImageFills(fileKey, token) {
  const data = await figmaGet(`/files/${fileKey}/images`, token);
  if (data.error) {
    console.error(`[figma] Warning: could not fetch image fills: ${data.status}`);
    return {};
  }
  return data.meta?.images || {};
}

async function main() {
  const { desktop, mobile, feature, token } = parseArgs();

  const artifactDir = path.resolve(`.buildspace/artifacts/${feature}`);
  const screenshotDir = path.join(artifactDir, 'screenshots');
  const assetDir = path.resolve('.buildspace/figmaAssets');

  await mkdir(screenshotDir, { recursive: true });
  await mkdir(assetDir, { recursive: true });

  const desktopParsed = parseFigmaUrl(desktop);
  const mobileParsed = mobile ? parseFigmaUrl(mobile) : null;

  console.error(`[figma] Desktop: file=${desktopParsed.fileKey} node=${desktopParsed.nodeId}`);
  if (mobileParsed) {
    console.error(`[figma] Mobile:  file=${mobileParsed.fileKey} node=${mobileParsed.nodeId}`);
  } else {
    console.error('[figma] Mobile:  not provided — responsive inferred from desktop only');
  }

  console.error('[figma] Fetching desktop node tree...');
  const desktopTree = await fetchNodeTree(desktopParsed.fileKey, desktopParsed.nodeId, token);

  let mobileTree = null;
  if (mobileParsed) {
    console.error('[figma] Fetching mobile node tree...');
    mobileTree = await fetchNodeTree(mobileParsed.fileKey, mobileParsed.nodeId, token);
  }

  const desktopSections = identifySections(desktopTree);
  const mobileSections = mobileTree ? identifySections(mobileTree) : [];

  console.error(`[figma] Desktop sections: ${desktopSections.map((s) => s.name).join(', ')}`);
  if (mobileSections.length > 0) {
    console.error(`[figma] Mobile sections:  ${mobileSections.map((s) => s.name).join(', ')}`);
  }

  if (desktopSections.length === 0) {
    throw new Error('No sections found in desktop frame. Ensure the frame has child layers.');
  }

  console.error('[figma] Exporting desktop section screenshots...');
  const desktopSectionIds = desktopSections.map((s) => s.id);
  const desktopScreenshots = await exportNodes(
    desktopParsed.fileKey, desktopSectionIds, EXPORT_FORMAT, EXPORT_SCALE, token
  );

  let mobileScreenshots = {};
  if (mobileParsed && mobileSections.length > 0) {
    console.error('[figma] Exporting mobile section screenshots...');
    const mobileSectionIds = mobileSections.map((s) => s.id);
    mobileScreenshots = await exportNodes(
      mobileParsed.fileKey, mobileSectionIds, EXPORT_FORMAT, EXPORT_SCALE, token
    );
  }

  const screenshotManifest = [];

  for (const section of desktopSections) {
    const url = desktopScreenshots[section.id];
    if (!url) {
      console.error(`[figma] Warning: no screenshot for desktop section "${section.name}"`);
      continue;
    }
    const filename = `figma-${toKebab(section.name)}-desktop.png`;
    const filepath = path.join(screenshotDir, filename);
    console.error(`[figma] Downloading: ${filename}`);
    await downloadFile(url, filepath);
    screenshotManifest.push({
      section: section.name,
      viewport: 'desktop',
      filename,
      path: path.relative('.', filepath),
    });
  }

  for (const section of mobileSections) {
    const url = mobileScreenshots[section.id];
    if (!url) {
      console.error(`[figma] Warning: no screenshot for mobile section "${section.name}"`);
      continue;
    }
    const filename = `figma-${toKebab(section.name)}-mobile.png`;
    const filepath = path.join(screenshotDir, filename);
    console.error(`[figma] Downloading: ${filename}`);
    await downloadFile(url, filepath);
    screenshotManifest.push({
      section: section.name,
      viewport: 'mobile',
      filename,
      path: path.relative('.', filepath),
    });
  }

  console.error('[figma] Scanning desktop tree for assets...');
  const desktopAssets = collectAssets(desktopTree);

  let mobileAssets = { imageFills: [], vectors: [], videos: [] };
  if (mobileTree) {
    console.error('[figma] Scanning mobile tree for assets...');
    mobileAssets = collectAssets(mobileTree);
  }

  // Deduplicate image fills by imageRef across desktop and mobile
  const seenImageRefs = new Map();
  const allImageFills = [...desktopAssets.imageFills, ...mobileAssets.imageFills];
  const uniqueImageFills = [];
  for (const fill of allImageFills) {
    if (!seenImageRefs.has(fill.imageRef)) {
      seenImageRefs.set(fill.imageRef, fill);
      uniqueImageFills.push(fill);
    }
  }

  const seenVectorIds = new Set();
  const allVectors = [...desktopAssets.vectors, ...mobileAssets.vectors];
  const uniqueVectors = [];
  for (const vec of allVectors) {
    if (!seenVectorIds.has(vec.nodeId)) {
      seenVectorIds.add(vec.nodeId);
      uniqueVectors.push(vec);
    }
  }

  const seenVideoIds = new Set();
  const allVideos = [...desktopAssets.videos, ...mobileAssets.videos];
  const uniqueVideos = [];
  for (const vid of allVideos) {
    if (!seenVideoIds.has(vid.nodeId)) {
      seenVideoIds.add(vid.nodeId);
      uniqueVideos.push(vid);
    }
  }

  console.error(`[figma] Found: ${uniqueImageFills.length} images, ${uniqueVectors.length} icons, ${uniqueVideos.length} videos`);

  const assetManifest = [];
  const usedNames = new Set();

  if (uniqueImageFills.length > 0) {
    console.error('[figma] Fetching image fill URLs...');
    const fileKeys = new Set();
    fileKeys.add(desktopParsed.fileKey);
    if (mobileParsed) fileKeys.add(mobileParsed.fileKey);

    let fillUrlMap = {};
    for (const fk of fileKeys) {
      const fills = await fetchImageFills(fk, token);
      fillUrlMap = { ...fillUrlMap, ...fills };
    }

    for (let i = 0; i < uniqueImageFills.length; i++) {
      const fill = uniqueImageFills[i];
      const downloadUrl = fillUrlMap[fill.imageRef];
      if (!downloadUrl) {
        console.error(`[figma] Warning: no URL for imageRef "${fill.imageRef}" in "${fill.nodeName}"`);
        continue;
      }

      const baseName = buildAssetName(fill.sectionName, fill.nodeName, fill.nodeType, i);
      const name = deduplicateName(baseName, usedNames);
      const ext = 'jpg'; // Figma image fills are raster
      const filename = `${name}.${ext}`;
      const filepath = path.join(assetDir, filename);

      console.error(`[figma] Downloading image: ${filename}`);
      try {
        await downloadFile(downloadUrl, filepath);
        assetManifest.push({
          file: filename,
          path: path.relative('.', filepath),
          type: 'image',
          section: toKebab(fill.sectionName),
          figmaNodeName: fill.nodeName,
          shopifyUrl: null,
        });
      } catch (err) {
        console.error(`[figma] Failed to download "${filename}": ${err.message}`);
      }
    }
  }

  if (uniqueVectors.length > 0) {
    console.error('[figma] Exporting vector icons as SVG...');

    // Group vectors by source file key for correct API calls
    const desktopVectorIds = uniqueVectors
      .filter((v) => desktopAssets.vectors.some((dv) => dv.nodeId === v.nodeId))
      .map((v) => v.nodeId);
    const mobileOnlyVectorIds = uniqueVectors
      .filter((v) => !desktopAssets.vectors.some((dv) => dv.nodeId === v.nodeId))
      .map((v) => v.nodeId);

    let svgUrls = {};
    if (desktopVectorIds.length > 0) {
      const urls = await exportNodes(desktopParsed.fileKey, desktopVectorIds, SVG_FORMAT, 1, token);
      svgUrls = { ...svgUrls, ...urls };
    }
    if (mobileParsed && mobileOnlyVectorIds.length > 0) {
      const urls = await exportNodes(mobileParsed.fileKey, mobileOnlyVectorIds, SVG_FORMAT, 1, token);
      svgUrls = { ...svgUrls, ...urls };
    }

    for (let i = 0; i < uniqueVectors.length; i++) {
      const vec = uniqueVectors[i];
      const downloadUrl = svgUrls[vec.nodeId];
      if (!downloadUrl) {
        console.error(`[figma] Warning: no SVG URL for vector "${vec.nodeName}"`);
        continue;
      }

      const baseName = buildAssetName(vec.sectionName, vec.nodeName, vec.nodeType, i);
      const name = deduplicateName(baseName, usedNames);
      const filename = `${name}.svg`;
      const filepath = path.join(assetDir, filename);

      console.error(`[figma] Downloading icon: ${filename}`);
      try {
        await downloadFile(downloadUrl, filepath);
        assetManifest.push({
          file: filename,
          path: path.relative('.', filepath),
          type: 'icon',
          section: toKebab(vec.sectionName),
          figmaNodeName: vec.nodeName,
          shopifyUrl: null,
        });
      } catch (err) {
        console.error(`[figma] Failed to download "${filename}": ${err.message}`);
      }
    }
  }

  const videoList = uniqueVideos.map((vid) => ({
    name: `${toKebab(vid.sectionName)}-${toKebab(vid.nodeName)}.mp4`,
    figmaNodeName: vid.nodeName,
    section: toKebab(vid.sectionName),
    note: 'Upload manually to Shopify Files',
  }));

  const sectionInfo = desktopSections.map((ds) => {
    const mobileMatch = mobileSections.find(
      (ms) => toKebab(ms.name) === toKebab(ds.name)
    );
    return {
      name: ds.name,
      kebabName: toKebab(ds.name),
      type: ds.type,
      desktopBounds: ds.bounds,
      mobileBounds: mobileMatch?.bounds || null,
      hasMobileVariant: !!mobileMatch,
    };
  });

  const manifest = {
    feature,
    timestamp: new Date().toISOString(),
    desktopUrl: desktop,
    mobileUrl: mobile || null,
    sections: sectionInfo,
    screenshots: screenshotManifest,
    assets: assetManifest,
    videos: videoList,
  };

  const manifestPath = path.join(artifactDir, 'asset-manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.error(`[figma] Saved asset-manifest.json (${assetManifest.length} assets, ${videoList.length} videos)`);

  const designContext = buildDesignContext(manifest, sectionInfo, screenshotManifest);
  const contextPath = path.join(artifactDir, 'design-context.md');
  await writeFile(contextPath, designContext);
  console.error(`[figma] Saved design-context.md`);

  console.log(JSON.stringify(manifest, null, 2));
}

function buildDesignContext(manifest, sections, screenshots) {
  const lines = [];

  lines.push(`# Design Context: ${manifest.feature}`);
  lines.push('');
  lines.push('## Sections');
  lines.push('');

  for (const section of sections) {
    lines.push(`### ${section.name}`);
    lines.push('');

    const desktopShot = screenshots.find(
      (s) => s.viewport === 'desktop' && toKebab(s.section) === section.kebabName
    );
    if (desktopShot) {
      lines.push(`**Desktop:** \`${desktopShot.path}\``);
    }

    const mobileShot = screenshots.find(
      (s) => s.viewport === 'mobile' && toKebab(s.section) === section.kebabName
    );
    if (mobileShot) {
      lines.push(`**Mobile:** \`${mobileShot.path}\``);
    } else if (!section.hasMobileVariant) {
      lines.push('**Mobile:** No mobile frame provided — responsive styles inferred from desktop');
    }

    if (section.desktopBounds) {
      const db = section.desktopBounds;
      lines.push(`**Desktop size:** ${db.width}x${db.height}px`);
    }
    if (section.mobileBounds) {
      const mb = section.mobileBounds;
      lines.push(`**Mobile size:** ${mb.width}x${mb.height}px`);
    }

    lines.push('');
  }

  lines.push('## Assets');
  lines.push('');

  if (manifest.assets.length === 0) {
    lines.push('No image or icon assets found in the design.');
  } else {
    const bySection = {};
    for (const asset of manifest.assets) {
      if (!bySection[asset.section]) bySection[asset.section] = [];
      bySection[asset.section].push(asset);
    }

    for (const [section, assets] of Object.entries(bySection)) {
      lines.push(`### ${section}`);
      lines.push('');
      lines.push('| File | Type | Figma Layer | Shopify URL |');
      lines.push('|------|------|-------------|-------------|');
      for (const a of assets) {
        lines.push(`| \`${a.file}\` | ${a.type} | ${a.figmaNodeName} | ${a.shopifyUrl || 'pending upload'} |`);
      }
      lines.push('');
    }
  }

  if (manifest.videos.length > 0) {
    lines.push('## Videos (Manual Upload Required)');
    lines.push('');
    lines.push('The following videos were found in the design. Upload them manually to Shopify Files:');
    lines.push('');
    for (const vid of manifest.videos) {
      lines.push(`- **${vid.name}** — from "${vid.figmaNodeName}" in ${vid.section} section`);
    }
    lines.push('');
  }

  lines.push('## Source');
  lines.push('');
  lines.push(`- **Desktop:** ${manifest.desktopUrl}`);
  if (manifest.mobileUrl) {
    lines.push(`- **Mobile:** ${manifest.mobileUrl}`);
  }
  lines.push(`- **Fetched:** ${manifest.timestamp}`);
  lines.push('');

  return lines.join('\n');
}

main().catch((err) => {
  console.error(`[figma] Fatal: ${err.message}`);
  process.exit(1);
});
