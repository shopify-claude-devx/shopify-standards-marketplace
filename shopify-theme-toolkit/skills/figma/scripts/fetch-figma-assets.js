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
 *   .buildspace/figmaAssets/                          — downloaded raster images
 *   .buildspace/artifacts/{feature}/screenshots/      — section screenshots
 *   .buildspace/artifacts/{feature}/asset-manifest.json
 *   .buildspace/artifacts/{feature}/design-context.md
 *   snippets/icon-{name}.liquid                       — SVG icon snippets
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
const TEXT_PROXIMITY_MAX = 200;
const TEXT_MAX_LENGTH = 30;

const VECTOR_TYPES = new Set([
  'VECTOR', 'BOOLEAN_OPERATION', 'LINE', 'STAR',
  'ELLIPSE', 'REGULAR_POLYGON',
]);

const SECTION_CONTAINER_TYPES = new Set([
  'SECTION', 'FRAME', 'GROUP', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE',
]);

// --- Argument Parsing ---

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

// --- URL Parsing ---

/**
 * Supported formats:
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

// --- HTTP Helpers ---

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

function downloadText(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadText(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed (${res.statusCode}): ${url.slice(0, 120)}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error(`Download timeout: ${url.slice(0, 120)}`));
    });
  });
}

// --- Naming Helpers ---

function toKebab(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function isGenericNodeName(kebabName) {
  if (!kebabName || kebabName.length <= 2) return true;

  if (/^(vector|boolean|boolean-operation|line|ellipse|polygon|star|frame|group|rectangle|component|instance|union|subtract|intersect|exclude|auto-layout|slice|mask|image)(-\d+)?$/.test(kebabName)) {
    return true;
  }

  if (/^[a-z]+-\d+$/.test(kebabName)) return true;
  if (/screen-?shot/.test(kebabName)) return true;
  if (/\d{5,}/.test(kebabName)) return true;
  if (/[a-f0-9]{8,}/.test(kebabName) && /[a-f][0-9]|[0-9][a-f]/.test(kebabName)) return true;
  if (/[a-f0-9]{8}-[a-f0-9]{4}/.test(kebabName)) return true;
  if (/^(i-?stock|shutterstock|pexels|unsplash|adobe-stock|getty|dreamstime|deposit-?photos|123-?rf)/.test(kebabName)) return true;
  if (/^(dsc|dcim|dscn|p\d{3,}|img|pic|photo|bitmap|paste|clipboard|untitled|layer)(-|$)/.test(kebabName)) return true;
  if (/^copy-of-/.test(kebabName) || /-copy(-\d+)?$/.test(kebabName)) return true;
  if (/^[\d-]+$/.test(kebabName)) return true;

  return false;
}

function isVariantSyntax(name) {
  return /=/.test(name) && /,/.test(name);
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

// --- Icon Naming ---

function resolveIconName(icon, componentsMap, componentSetsMap, textNodes) {
  // Strategy 1: INSTANCE → resolve source component via components map
  if (icon.componentId && componentsMap[icon.componentId]) {
    const comp = componentsMap[icon.componentId];

    if (comp.componentSetId && componentSetsMap[comp.componentSetId]) {
      const setName = toKebab(componentSetsMap[comp.componentSetId].name);
      if (!isGenericNodeName(setName)) return cleanIconName(setName);
    }

    if (!isVariantSyntax(comp.name)) {
      const compName = toKebab(comp.name);
      if (!isGenericNodeName(compName)) return cleanIconName(compName);
    }

    if (comp.description) {
      const desc = toKebab(comp.description.split(/[.\n]/)[0]);
      if (!isGenericNodeName(desc) && desc.length > 2) return cleanIconName(desc);
    }
  }

  // Strategy 2: COMPONENT node → look up in components map by node ID
  if (icon.nodeType === 'COMPONENT' && componentsMap[icon.nodeId]) {
    const comp = componentsMap[icon.nodeId];

    if (comp.componentSetId && componentSetsMap[comp.componentSetId]) {
      const setName = toKebab(componentSetsMap[comp.componentSetId].name);
      if (!isGenericNodeName(setName)) return cleanIconName(setName);
    }

    const compName = toKebab(comp.name);
    if (!isGenericNodeName(compName)) return cleanIconName(compName);
  }

  // Strategy 3: The collected node's own name
  const ownName = toKebab(icon.nodeName);
  if (!isGenericNodeName(ownName)) return cleanIconName(ownName);

  // Strategy 4: Walk ancestors (bottom-up) for nearest meaningful name
  for (let i = icon.ancestors.length - 1; i >= 0; i--) {
    const anc = icon.ancestors[i];
    if (anc.type === 'SECTION' || anc.type === 'CANVAS' || anc.type === 'DOCUMENT') continue;
    const ancName = toKebab(anc.name);
    if (!isGenericNodeName(ancName)) return cleanIconName(ancName);
  }

  // Strategy 5: Find nearest TEXT sibling by spatial proximity
  if (icon.bounds && textNodes.length > 0) {
    const sectionTexts = textNodes.filter((t) => t.sectionName === icon.sectionName);
    const nearest = findNearestText(icon.bounds, sectionTexts);
    if (nearest) return cleanIconName(nearest);
  }

  // Strategy 6: Section context (last resort)
  return toKebab(icon.sectionName);
}

function cleanIconName(name) {
  let kebab = typeof name === 'string' ? toKebab(name) : name;
  // Strip "icon" prefix/suffix — we add icon- in the snippet filename
  kebab = kebab.replace(/^icon-/, '').replace(/-icon$/, '');
  if (!kebab || kebab.length <= 1) return null;
  return kebab;
}

function findNearestText(iconBounds, textNodes) {
  let closest = null;
  let minDist = TEXT_PROXIMITY_MAX;

  const cx = iconBounds.x + iconBounds.width / 2;
  const cy = iconBounds.y + iconBounds.height / 2;

  for (const text of textNodes) {
    if (!text.bounds || !text.characters) continue;
    const tx = text.bounds.x + text.bounds.width / 2;
    const ty = text.bounds.y + text.bounds.height / 2;
    const dist = Math.hypot(tx - cx, ty - cy);
    if (dist < minDist && text.characters.length <= TEXT_MAX_LENGTH) {
      minDist = dist;
      closest = text.characters;
    }
  }

  return closest;
}

function deduplicateIconName(name, usedNames, sectionName) {
  if (!usedNames.has(name)) {
    usedNames.add(name);
    return name;
  }
  // Differentiate with section name
  const withSection = `${toKebab(sectionName)}-${name}`;
  if (!usedNames.has(withSection)) {
    usedNames.add(withSection);
    return withSection;
  }
  // Extremely rare: same icon name, same section — add more context
  let counter = 2;
  while (usedNames.has(`${withSection}-v${counter}`)) counter++;
  const unique = `${withSection}-v${counter}`;
  usedNames.add(unique);
  return unique;
}

// --- Image Naming ---

function resolveImageSuffix(fill, textNodes) {
  // Strategy 1: The node's own name
  const ownName = toKebab(fill.nodeName);
  if (!isGenericNodeName(ownName)) return ownName;

  // Strategy 2: Walk ancestors (bottom-up, skip the section itself)
  if (fill.ancestors) {
    for (let i = fill.ancestors.length - 1; i >= 0; i--) {
      const anc = fill.ancestors[i];
      if (anc.type === 'SECTION' || anc.type === 'CANVAS' || anc.type === 'DOCUMENT') continue;
      const ancName = toKebab(anc.name);
      if (!isGenericNodeName(ancName)) return ancName;
    }
  }

  // Strategy 3: Nearest TEXT sibling
  if (fill.bounds && textNodes.length > 0) {
    const sectionTexts = textNodes.filter((t) => t.sectionName === fill.sectionName);
    const nearest = findNearestText(fill.bounds, sectionTexts);
    if (nearest) return toKebab(nearest);
  }

  // No meaningful suffix found
  return null;
}

// --- Tree Walking ---

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

function hasVectorDescendant(node) {
  if (VECTOR_TYPES.has(node.type)) return true;
  if (node.children) {
    return node.children.some((child) => hasVectorDescendant(child));
  }
  return false;
}

function walkForAssets(node, sectionName, ancestors, results) {
  if (!node || node.visible === false) return;

  const currentAncestors = [...ancestors, { id: node.id, name: node.name, type: node.type }];

  // Collect image fills and videos
  const fills = node.fills || [];
  for (const fill of fills) {
    if (fill.type === 'IMAGE' && fill.imageRef && fill.visible !== false) {
      results.imageFills.push({
        imageRef: fill.imageRef,
        nodeId: node.id,
        nodeName: node.name,
        sectionName,
        ancestors: currentAncestors,
        bounds: node.absoluteBoundingBox,
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

  // Check if this node is an icon container
  const bounds = node.absoluteBoundingBox;
  const isIconSized = bounds && bounds.width <= ICON_MAX_SIZE && bounds.height <= ICON_MAX_SIZE;

  if (isIconSized) {
    // COMPONENT/INSTANCE that's icon-sized → collect as icon, stop recursing
    if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      results.icons.push({
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        sectionName,
        ancestors: currentAncestors,
        componentId: node.componentId || null,
        bounds,
      });
      return;
    }

    // FRAME/GROUP that's icon-sized and contains vectors → collect as icon
    if ((node.type === 'FRAME' || node.type === 'GROUP') && hasVectorDescendant(node)) {
      results.icons.push({
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        sectionName,
        ancestors: currentAncestors,
        componentId: null,
        bounds,
      });
      return;
    }

    // Standalone vector node → collect as icon
    if (VECTOR_TYPES.has(node.type)) {
      results.icons.push({
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        sectionName,
        ancestors: currentAncestors,
        componentId: null,
        bounds,
      });
      return;
    }
  }

  // Collect TEXT nodes for nearby-label resolution
  if (node.type === 'TEXT' && node.characters) {
    results.textNodes.push({
      characters: node.characters,
      bounds: node.absoluteBoundingBox,
      sectionName,
    });
  }

  if (node.children) {
    for (const child of node.children) {
      walkForAssets(child, sectionName, currentAncestors, results);
    }
  }
}

function collectAssets(frameNode) {
  const results = { imageFills: [], icons: [], videos: [], textNodes: [] };
  const sections = identifySections(frameNode);

  for (const section of sections) {
    const sectionNode = frameNode.children.find((c) => c.id === section.id);
    if (sectionNode) {
      walkForAssets(sectionNode, section.name, [], results);
    }
  }

  return results;
}

// --- Figma API Operations ---

async function fetchNodeTree(fileKey, nodeId, token) {
  const encodedId = encodeURIComponent(nodeId);
  const data = await figmaGet(`/files/${fileKey}/nodes?ids=${encodedId}`, token);

  const nodeData = data.nodes[nodeId];
  if (!nodeData || !nodeData.document) {
    throw new Error(`Node ${nodeId} not found in file ${fileKey}. Check the URL and permissions.`);
  }

  return {
    document: nodeData.document,
    components: nodeData.components || {},
    componentSets: nodeData.componentSets || {},
  };
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

// --- Main ---

async function main() {
  const { desktop, mobile, feature, token } = parseArgs();

  const artifactDir = path.resolve(`.buildspace/artifacts/${feature}`);
  const screenshotDir = path.join(artifactDir, 'screenshots');
  const assetDir = path.resolve('.buildspace/figmaAssets');
  const snippetDir = path.resolve('snippets');

  await mkdir(screenshotDir, { recursive: true });
  await mkdir(assetDir, { recursive: true });
  await mkdir(snippetDir, { recursive: true });

  const desktopParsed = parseFigmaUrl(desktop);
  const mobileParsed = mobile ? parseFigmaUrl(mobile) : null;

  console.error(`[figma] Desktop: file=${desktopParsed.fileKey} node=${desktopParsed.nodeId}`);
  if (mobileParsed) {
    console.error(`[figma] Mobile:  file=${mobileParsed.fileKey} node=${mobileParsed.nodeId}`);
  } else {
    console.error('[figma] Mobile:  not provided — responsive inferred from desktop only');
  }

  // --- Fetch Node Trees (with component metadata) ---

  console.error('[figma] Fetching desktop node tree...');
  const desktopResult = await fetchNodeTree(desktopParsed.fileKey, desktopParsed.nodeId, token);
  const desktopTree = desktopResult.document;
  let componentsMap = { ...desktopResult.components };
  let componentSetsMap = { ...desktopResult.componentSets };

  let mobileTree = null;
  if (mobileParsed) {
    console.error('[figma] Fetching mobile node tree...');
    const mobileResult = await fetchNodeTree(mobileParsed.fileKey, mobileParsed.nodeId, token);
    mobileTree = mobileResult.document;
    componentsMap = { ...componentsMap, ...mobileResult.components };
    componentSetsMap = { ...componentSetsMap, ...mobileResult.componentSets };
  }

  // --- Identify Sections ---

  const desktopSections = identifySections(desktopTree);
  const mobileSections = mobileTree ? identifySections(mobileTree) : [];

  console.error(`[figma] Desktop sections: ${desktopSections.map((s) => s.name).join(', ')}`);
  if (mobileSections.length > 0) {
    console.error(`[figma] Mobile sections:  ${mobileSections.map((s) => s.name).join(', ')}`);
  }

  if (desktopSections.length === 0) {
    throw new Error('No sections found in desktop frame. Ensure the frame has child layers.');
  }

  // --- Export Section Screenshots ---

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

  // --- Collect Assets From Tree ---

  console.error('[figma] Scanning desktop tree for assets...');
  const desktopAssets = collectAssets(desktopTree);

  let mobileAssets = { imageFills: [], icons: [], videos: [], textNodes: [] };
  if (mobileTree) {
    console.error('[figma] Scanning mobile tree for assets...');
    mobileAssets = collectAssets(mobileTree);
  }

  // Deduplicate image fills by imageRef
  const seenImageRefs = new Map();
  const allImageFills = [...desktopAssets.imageFills, ...mobileAssets.imageFills];
  const uniqueImageFills = [];
  for (const fill of allImageFills) {
    if (!seenImageRefs.has(fill.imageRef)) {
      seenImageRefs.set(fill.imageRef, fill);
      uniqueImageFills.push(fill);
    }
  }

  // Deduplicate icons by nodeId
  const seenIconIds = new Set();
  const allIcons = [...desktopAssets.icons, ...mobileAssets.icons];
  const uniqueIcons = [];
  for (const icon of allIcons) {
    if (!seenIconIds.has(icon.nodeId)) {
      seenIconIds.add(icon.nodeId);
      uniqueIcons.push(icon);
    }
  }

  // Merge text nodes for nearby-label resolution
  const allTextNodes = [...desktopAssets.textNodes, ...mobileAssets.textNodes];

  // Deduplicate videos
  const seenVideoIds = new Set();
  const allVideos = [...desktopAssets.videos, ...mobileAssets.videos];
  const uniqueVideos = [];
  for (const vid of allVideos) {
    if (!seenVideoIds.has(vid.nodeId)) {
      seenVideoIds.add(vid.nodeId);
      uniqueVideos.push(vid);
    }
  }

  console.error(`[figma] Found: ${uniqueImageFills.length} images, ${uniqueIcons.length} icons, ${uniqueVideos.length} videos`);

  // --- Download Images ---
  // Named {section}-{suffix}.jpg where suffix comes from ancestor/context resolution
  // Falls back to {section}-image.jpg (numbered when multiple unnamed per section)

  const assetManifest = [];
  const usedImageNames = new Set();

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

    // Count unresolvable images per section for fallback numbering
    const fallbackCountBySection = {};
    const fallbackIndexBySection = {};
    for (const fill of uniqueImageFills) {
      const suffix = resolveImageSuffix(fill, allTextNodes);
      if (!suffix) {
        const key = toKebab(fill.sectionName);
        fallbackCountBySection[key] = (fallbackCountBySection[key] || 0) + 1;
      }
    }

    for (const fill of uniqueImageFills) {
      const downloadUrl = fillUrlMap[fill.imageRef];
      if (!downloadUrl) {
        console.error(`[figma] Warning: no URL for imageRef "${fill.imageRef}" in "${fill.nodeName}"`);
        continue;
      }

      const sectionKey = toKebab(fill.sectionName);
      const suffix = resolveImageSuffix(fill, allTextNodes);

      let baseName;
      if (suffix) {
        baseName = `${sectionKey}-${suffix}`;
      } else {
        const idx = fallbackIndexBySection[sectionKey] || 0;
        fallbackIndexBySection[sectionKey] = idx + 1;
        const num = fallbackCountBySection[sectionKey] > 1 ? `-${idx + 1}` : '';
        baseName = `${sectionKey}-image${num}`;
      }

      const name = deduplicateName(baseName, usedImageNames);
      const filename = `${name}.jpg`;
      const filepath = path.join(assetDir, filename);

      console.error(`[figma] Downloading image: ${filename}`);
      try {
        await downloadFile(downloadUrl, filepath);
        assetManifest.push({
          file: filename,
          path: path.relative('.', filepath),
          type: 'image',
          section: sectionKey,
          figmaNodeName: fill.nodeName,
          shopifyUrl: null,
        });
      } catch (err) {
        console.error(`[figma] Failed to download "${filename}": ${err.message}`);
      }
    }
  }

  // --- Create Icon Snippets ---
  // SVG icons become snippets/icon-{name}.liquid

  const snippetManifest = [];

  if (uniqueIcons.length > 0) {
    console.error('[figma] Exporting icons as SVG...');

    // Group icons by source file key
    const desktopIconIds = uniqueIcons
      .filter((ic) => desktopAssets.icons.some((di) => di.nodeId === ic.nodeId))
      .map((ic) => ic.nodeId);
    const mobileOnlyIconIds = uniqueIcons
      .filter((ic) => !desktopAssets.icons.some((di) => di.nodeId === ic.nodeId))
      .map((ic) => ic.nodeId);

    let svgUrls = {};
    if (desktopIconIds.length > 0) {
      const urls = await exportNodes(desktopParsed.fileKey, desktopIconIds, SVG_FORMAT, 1, token);
      svgUrls = { ...svgUrls, ...urls };
    }
    if (mobileParsed && mobileOnlyIconIds.length > 0) {
      const urls = await exportNodes(mobileParsed.fileKey, mobileOnlyIconIds, SVG_FORMAT, 1, token);
      svgUrls = { ...svgUrls, ...urls };
    }

    const usedIconNames = new Set();

    for (const icon of uniqueIcons) {
      const svgUrl = svgUrls[icon.nodeId];
      if (!svgUrl) {
        console.error(`[figma] Warning: no SVG URL for icon "${icon.nodeName}"`);
        continue;
      }

      let resolvedName = resolveIconName(icon, componentsMap, componentSetsMap, allTextNodes);
      if (!resolvedName) resolvedName = toKebab(icon.sectionName);

      const uniqueName = deduplicateIconName(resolvedName, usedIconNames, icon.sectionName);
      const snippetFilename = `icon-${uniqueName}.liquid`;
      const snippetPath = path.join(snippetDir, snippetFilename);

      console.error(`[figma] Creating snippet: ${snippetFilename}`);
      try {
        const svgContent = await downloadText(svgUrl);
        await writeFile(snippetPath, svgContent);

        snippetManifest.push({
          file: snippetFilename,
          path: path.relative('.', snippetPath),
          type: 'snippet',
          section: toKebab(icon.sectionName),
          figmaNodeName: icon.nodeName,
          renderTag: `{% render '${snippetFilename.replace('.liquid', '')}' %}`,
        });
      } catch (err) {
        console.error(`[figma] Failed to create snippet "${snippetFilename}": ${err.message}`);
      }
    }
  }

  // --- Build Video List ---

  const videoList = uniqueVideos.map((vid) => ({
    name: `${toKebab(vid.sectionName)}-${toKebab(vid.nodeName)}.mp4`,
    figmaNodeName: vid.nodeName,
    section: toKebab(vid.sectionName),
    note: 'Upload manually to Shopify Files',
  }));

  // --- Build Section Info ---

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

  // --- Write Outputs ---

  const manifest = {
    feature,
    timestamp: new Date().toISOString(),
    desktopUrl: desktop,
    mobileUrl: mobile || null,
    sections: sectionInfo,
    screenshots: screenshotManifest,
    assets: assetManifest,
    snippets: snippetManifest,
    videos: videoList,
  };

  const manifestPath = path.join(artifactDir, 'asset-manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.error(`[figma] Saved asset-manifest.json (${assetManifest.length} images, ${snippetManifest.length} snippets, ${videoList.length} videos)`);

  const designContext = buildDesignContext(manifest, sectionInfo, screenshotManifest);
  const contextPath = path.join(artifactDir, 'design-context.md');
  await writeFile(contextPath, designContext);
  console.error(`[figma] Saved design-context.md`);

  console.log(JSON.stringify(manifest, null, 2));
}

// --- Design Context Builder ---

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

  lines.push('## Images');
  lines.push('');

  if (manifest.assets.length === 0) {
    lines.push('No raster images found in the design.');
  } else {
    const bySection = {};
    for (const asset of manifest.assets) {
      if (!bySection[asset.section]) bySection[asset.section] = [];
      bySection[asset.section].push(asset);
    }

    for (const [section, assets] of Object.entries(bySection)) {
      lines.push(`### ${section}`);
      lines.push('');
      lines.push('| File | Shopify URL |');
      lines.push('|------|-------------|');
      for (const a of assets) {
        lines.push(`| \`${a.file}\` | ${a.shopifyUrl || 'pending upload'} |`);
      }
      lines.push('');
    }
  }

  lines.push('## Icon Snippets');
  lines.push('');

  if (manifest.snippets.length === 0) {
    lines.push('No SVG icons found in the design.');
  } else {
    lines.push('| Snippet | Section | Render Tag |');
    lines.push('|---------|---------|------------|');
    for (const s of manifest.snippets) {
      lines.push(`| \`${s.file}\` | ${s.section} | \`${s.renderTag}\` |`);
    }
    lines.push('');
  }

  if (manifest.videos.length > 0) {
    lines.push('## Videos (Manual Upload Required)');
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
