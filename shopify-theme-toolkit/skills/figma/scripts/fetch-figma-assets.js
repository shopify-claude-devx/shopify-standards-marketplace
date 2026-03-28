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
 *   .buildspace/figmaAssets/                          — raster images
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
const ICON_MAX_SIZE = 128;

const VECTOR_TYPES = new Set([
  'VECTOR', 'BOOLEAN_OPERATION', 'LINE', 'STAR', 'ELLIPSE', 'REGULAR_POLYGON',
]);

const SECTION_TYPES = new Set([
  'SECTION', 'FRAME', 'GROUP', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE',
]);

const SKIP_TYPES = new Set(['SECTION', 'CANVAS', 'DOCUMENT']);

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];

// ============================================================
// CLI
// ============================================================

function parseArgs() {
  const a = process.argv.slice(2);
  const get = (f) => { const i = a.indexOf(f); return i !== -1 && i + 1 < a.length ? a[i + 1] : null; };
  const desktop = get('--desktop'), mobile = get('--mobile'),
        feature = get('--feature'), token = get('--token');
  if (!desktop || !feature || !token) {
    console.error('Usage: fetch-figma-assets.js --desktop <url> [--mobile <url>] --feature <name> --token <token>');
    process.exit(1);
  }
  return { desktop, mobile, feature, token };
}

// ============================================================
// Figma URL parsing
// ============================================================

function parseFigmaUrl(url) {
  const parsed = new URL(url);
  const parts = parsed.pathname.split('/').filter(Boolean);
  let fileKey = null;
  if (['design', 'file'].includes(parts[0])) {
    fileKey = parts[2] === 'branch' && parts[3] ? parts[3] : parts[1];
  }
  if (!fileKey) throw new Error(`Cannot extract file key: ${url}`);
  const raw = parsed.searchParams.get('node-id');
  if (!raw) throw new Error(`No node-id in URL: ${url}`);
  return { fileKey, nodeId: raw.replace(/-/g, ':') };
}

// ============================================================
// HTTP
// ============================================================

function figmaGet(endpoint, token) {
  return new Promise((resolve, reject) => {
    const req = https.get(`${FIGMA_API}${endpoint}`, { headers: { 'X-FIGMA-TOKEN': token } }, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => {
        if (res.statusCode === 429) return reject(new Error('Figma rate limit. Wait and retry.'));
        if (res.statusCode !== 200) return reject(new Error(`Figma ${res.statusCode}: ${d.slice(0, 300)}`));
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Figma timeout')); });
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const c = url.startsWith('https') ? https : http;
    c.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`Download ${res.statusCode}`));
      const s = fs.createWriteStream(dest);
      res.pipe(s);
      s.on('finish', () => { s.close(); resolve(); });
      s.on('error', reject);
    }).on('error', reject);
  });
}

function downloadText(url) {
  return new Promise((resolve, reject) => {
    const c = url.startsWith('https') ? https : http;
    c.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadText(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`Download ${res.statusCode}`));
      let d = '';
      res.on('data', (chunk) => { d += chunk; });
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

// ============================================================
// Naming — single source of truth
// ============================================================

function toKebab(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function isGeneric(name) {
  if (!name || name.length <= 2) return true;
  if (/^(vector|boolean|boolean-operation|line|ellipse|polygon|star|frame|group|rectangle|component|instance|union|subtract|intersect|exclude|auto-layout|slice|mask|image)(-\d+)?$/.test(name)) return true;
  if (/^[a-z]+-\d+$/.test(name)) return true;
  if (/screen-?shot/.test(name)) return true;
  if (/\d{5,}/.test(name)) return true;
  if (/[a-f0-9]{8,}/.test(name) && /[a-f]\d|\d[a-f]/.test(name)) return true;
  if (/[a-f0-9]{8}-[a-f0-9]{4}/.test(name)) return true;
  if (/^(i-?stock|shutterstock|pexels|unsplash|adobe-stock|getty|dreamstime|deposit-?photos|123-?rf)/.test(name)) return true;
  if (/^(dsc|dcim|dscn|p\d{3,}|img|pic|photo|bitmap|paste|clipboard|untitled|layer)(-|$)/.test(name)) return true;
  if (/^copy-of-/.test(name) || /-copy(-\d+)?$/.test(name)) return true;
  if (/^[\d-]+$/.test(name)) return true;
  return false;
}

/** A name is usable as a suffix if it's not generic AND not redundant with the section prefix. */
function isUsable(name, sectionKey) {
  if (!name || isGeneric(name)) return false;
  if (name === sectionKey) return false;
  if (name.startsWith(sectionKey + '-')) return false;
  if (sectionKey.startsWith(name + '-')) return false;
  return true;
}

function isVariantSyntax(name) { return /=/.test(name) && /,/.test(name); }

function stripIconAffix(name) {
  if (!name) return null;
  const k = toKebab(name).replace(/^icon-/, '').replace(/-icon$/, '');
  return k && k.length > 1 ? k : null;
}

/**
 * Walk a candidate list and return the first usable name.
 * Candidates are raw strings (will be kebab-cased).
 */
function firstUsable(candidates, sectionKey) {
  for (const raw of candidates) {
    if (!raw) continue;
    const k = toKebab(raw);
    if (isUsable(k, sectionKey)) return k;
  }
  return null;
}

// ============================================================
// Asset name resolution
// ============================================================

/**
 * Resolve a meaningful name for an image fill.
 * Returns a usable suffix string or null.
 */
function resolveImageName(fill, textNodes) {
  const sec = toKebab(fill.sectionName);

  // 1. Node name, then ancestors bottom-up
  const candidates = [fill.nodeName];
  if (fill.ancestors) {
    for (let i = fill.ancestors.length - 1; i >= 0; i--) {
      const a = fill.ancestors[i];
      if (SKIP_TYPES.has(a.type)) continue;
      candidates.push(a.name);
    }
  }
  const fromTree = firstUsable(candidates, sec);
  if (fromTree) return fromTree;

  // 2. Nearest text label
  return nearestText(fill.bounds, sec, textNodes);
}

/**
 * Resolve a meaningful name for an icon.
 * Uses component metadata, ancestors, then exclusive text claiming.
 * Returns a usable name string or null.
 */
function resolveIconName(icon, comps, compSets, textNodes, claimed) {
  const sec = toKebab(icon.sectionName);

  // 1. Component metadata (highest confidence)
  const compCandidates = componentCandidates(icon, comps, compSets);
  for (const raw of compCandidates) {
    const k = stripIconAffix(raw);
    if (k && isUsable(k, sec)) return k;
  }

  // 2. Node name + ancestors
  const treeCandidates = [icon.nodeName];
  if (icon.ancestors) {
    for (let i = icon.ancestors.length - 1; i >= 0; i--) {
      const a = icon.ancestors[i];
      if (SKIP_TYPES.has(a.type)) continue;
      treeCandidates.push(a.name);
    }
  }
  for (const raw of treeCandidates) {
    const k = stripIconAffix(raw);
    if (k && isUsable(k, sec)) return k;
  }

  // 3. Nearest unclaimed text
  return nearestUnclaimedText(icon.bounds, sec, textNodes, claimed);
}

function componentCandidates(icon, comps, compSets) {
  const out = [];
  const ids = [icon.componentId, icon.nodeType === 'COMPONENT' ? icon.nodeId : null].filter(Boolean);
  for (const id of ids) {
    const comp = comps[id];
    if (!comp) continue;
    if (comp.componentSetId && compSets[comp.componentSetId]) {
      out.push(compSets[comp.componentSetId].name);
    }
    if (!isVariantSyntax(comp.name)) out.push(comp.name);
    if (comp.description) out.push(comp.description.split(/[.\n]/)[0]);
  }
  return out;
}

function nearestText(bounds, sectionKey, textNodes) {
  if (!bounds || !textNodes.length) return null;
  const cx = bounds.x + bounds.width / 2, cy = bounds.y + bounds.height / 2;
  let best = null, bestDist = 500;
  for (const t of textNodes) {
    if (!t.bounds || !t.characters || t.characters.length > 40) continue;
    if (t.sectionName && toKebab(t.sectionName) !== sectionKey) continue;
    const dist = Math.hypot(t.bounds.x + t.bounds.width / 2 - cx, t.bounds.y + t.bounds.height / 2 - cy);
    if (dist < bestDist) { bestDist = dist; best = t.characters; }
  }
  if (!best) return null;
  const k = toKebab(best);
  return isUsable(k, sectionKey) ? k : null;
}

function nearestUnclaimedText(bounds, sectionKey, textNodes, claimed) {
  if (!bounds || !textNodes.length) return null;
  const cx = bounds.x + bounds.width / 2, cy = bounds.y + bounds.height / 2;
  let best = null, bestDist = 500;
  for (const t of textNodes) {
    if (!t.bounds || !t.characters || t.characters.length > 40) continue;
    if (t.sectionName && toKebab(t.sectionName) !== sectionKey) continue;
    if (claimed.has(t.characters)) continue;
    const dist = Math.hypot(t.bounds.x + t.bounds.width / 2 - cx, t.bounds.y + t.bounds.height / 2 - cy);
    if (dist < bestDist) { bestDist = dist; best = t.characters; }
  }
  if (!best) return null;
  const k = toKebab(best);
  if (isUsable(k, sectionKey)) { claimed.add(best); return k; }
  return null;
}

// ============================================================
// Deduplication
// ============================================================

function dedupSimple(name, used) {
  if (!used.has(name)) { used.add(name); return name; }
  let i = 2;
  while (used.has(`${name}-${i}`)) i++;
  const u = `${name}-${i}`;
  used.add(u);
  return u;
}

function dedupIcon(name, used, sectionKey) {
  if (!used.has(name)) { used.add(name); return name; }
  // Try section prefix only if it adds info
  if (name !== sectionKey && !name.startsWith(sectionKey + '-')) {
    const with_sec = `${sectionKey}-${name}`;
    if (!used.has(with_sec)) { used.add(with_sec); return with_sec; }
  }
  return null; // caller uses position fallback
}

// ============================================================
// Tree walking
// ============================================================

function identifySections(frame) {
  return (frame.children || [])
    .filter((c) => SECTION_TYPES.has(c.type) && c.visible !== false)
    .map((c) => ({ id: c.id, name: c.name, type: c.type, bounds: c.absoluteBoundingBox }));
}

function hasVectors(node) {
  if (VECTOR_TYPES.has(node.type)) return true;
  return (node.children || []).some(hasVectors);
}

function walk(node, section, ancestors, out) {
  if (!node || node.visible === false) return;
  const path = [...ancestors, { id: node.id, name: node.name, type: node.type }];

  // Image fills + videos
  for (const fill of node.fills || []) {
    if (fill.type === 'IMAGE' && fill.imageRef && fill.visible !== false) {
      out.images.push({ imageRef: fill.imageRef, nodeName: node.name, sectionName: section, ancestors: path, bounds: node.absoluteBoundingBox });
    }
    if (fill.type === 'VIDEO') {
      out.videos.push({ nodeName: node.name, sectionName: section });
    }
  }

  // Icon detection
  const b = node.absoluteBoundingBox;
  if (b && b.width <= ICON_MAX_SIZE && b.height <= ICON_MAX_SIZE) {
    if (['COMPONENT', 'INSTANCE'].includes(node.type)) {
      out.icons.push({ nodeId: node.id, nodeName: node.name, nodeType: node.type, sectionName: section, ancestors: path, componentId: node.componentId || null, bounds: b });
      return; // complete icon — don't recurse
    }
    if (['FRAME', 'GROUP'].includes(node.type) && hasVectors(node)) {
      out.icons.push({ nodeId: node.id, nodeName: node.name, nodeType: node.type, sectionName: section, ancestors: path, componentId: null, bounds: b });
      return;
    }
    if (VECTOR_TYPES.has(node.type)) {
      out.icons.push({ nodeId: node.id, nodeName: node.name, nodeType: node.type, sectionName: section, ancestors: path, componentId: null, bounds: b });
      return;
    }
  }

  // Text nodes (for nearby-label resolution)
  if (node.type === 'TEXT' && node.characters) {
    out.texts.push({ characters: node.characters, bounds: node.absoluteBoundingBox, sectionName: section });
  }

  for (const child of node.children || []) walk(child, section, path, out);
}

function collectAll(frame) {
  const out = { images: [], icons: [], videos: [], texts: [] };
  for (const sec of identifySections(frame)) {
    const node = frame.children.find((c) => c.id === sec.id);
    if (node) walk(node, sec.name, [], out);
  }
  return out;
}

// ============================================================
// Figma API
// ============================================================

async function fetchTree(fileKey, nodeId, token) {
  const data = await figmaGet(`/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`, token);
  const n = data.nodes[nodeId];
  if (!n?.document) throw new Error(`Node ${nodeId} not found in ${fileKey}`);
  return { document: n.document, components: n.components || {}, componentSets: n.componentSets || {} };
}

async function exportNodes(fileKey, ids, format, scale, token) {
  if (!ids.length) return {};
  const data = await figmaGet(`/images/${fileKey}?ids=${encodeURIComponent(ids.join(','))}&format=${format}&scale=${scale}`, token);
  if (data.err) throw new Error(`Export error: ${data.err}`);
  return data.images || {};
}

async function fetchFills(fileKey, token) {
  const data = await figmaGet(`/files/${fileKey}/images`, token);
  return data.meta?.images || {};
}

// ============================================================
// Dedup helpers for merging desktop + mobile
// ============================================================

function dedup(arr, key) {
  const seen = new Set();
  return arr.filter((item) => {
    const k = item[key];
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ============================================================
// Main
// ============================================================

async function main() {
  const { desktop, mobile, feature, token } = parseArgs();
  const artDir = path.resolve(`.buildspace/artifacts/${feature}`);
  const shotDir = path.join(artDir, 'screenshots');
  const imgDir = path.resolve('.buildspace/figmaAssets');
  const snipDir = path.resolve('snippets');
  await mkdir(shotDir, { recursive: true });
  await mkdir(imgDir, { recursive: true });
  await mkdir(snipDir, { recursive: true });

  const dp = parseFigmaUrl(desktop);
  const mp = mobile ? parseFigmaUrl(mobile) : null;
  console.error(`[figma] Desktop: ${dp.fileKey} / ${dp.nodeId}`);
  if (mp) console.error(`[figma] Mobile:  ${mp.fileKey} / ${mp.nodeId}`);

  // Fetch trees
  console.error('[figma] Fetching desktop tree...');
  const dr = await fetchTree(dp.fileKey, dp.nodeId, token);
  let comps = { ...dr.components }, sets = { ...dr.componentSets };
  let mobileTree = null;
  if (mp) {
    console.error('[figma] Fetching mobile tree...');
    const mr = await fetchTree(mp.fileKey, mp.nodeId, token);
    mobileTree = mr.document;
    Object.assign(comps, mr.components);
    Object.assign(sets, mr.componentSets);
  }

  // Sections
  const dSections = identifySections(dr.document);
  const mSections = mobileTree ? identifySections(mobileTree) : [];
  console.error(`[figma] Sections: ${dSections.map((s) => s.name).join(', ')}`);
  if (!dSections.length) throw new Error('No sections found in desktop frame.');

  // Section screenshots
  console.error('[figma] Exporting section screenshots...');
  const dShots = await exportNodes(dp.fileKey, dSections.map((s) => s.id), 'png', 2, token);
  const mShots = mp && mSections.length ? await exportNodes(mp.fileKey, mSections.map((s) => s.id), 'png', 2, token) : {};

  const shotManifest = [];
  for (const [sections, shots, vp, fk] of [[dSections, dShots, 'desktop'], [mSections, mShots, 'mobile']]) {
    for (const sec of sections) {
      const url = shots[sec.id];
      if (!url) continue;
      const fname = `figma-${toKebab(sec.name)}-${vp}.png`;
      const fp = path.join(shotDir, fname);
      console.error(`[figma] ${fname}`);
      await download(url, fp);
      shotManifest.push({ section: sec.name, viewport: vp, filename: fname, path: path.relative('.', fp) });
    }
  }

  // Collect assets
  console.error('[figma] Scanning trees...');
  const da = collectAll(dr.document);
  const ma = mobileTree ? collectAll(mobileTree) : { images: [], icons: [], videos: [], texts: [] };

  const images = dedup([...da.images, ...ma.images], 'imageRef');
  const icons = dedup([...da.icons, ...ma.icons], 'nodeId');
  const videos = dedup([...da.videos, ...ma.videos], 'nodeName');
  const texts = [...da.texts, ...ma.texts];

  console.error(`[figma] Found: ${images.length} images, ${icons.length} icons, ${videos.length} videos`);

  // --- Download images ---

  const assetManifest = [];
  if (images.length) {
    console.error('[figma] Fetching image URLs...');
    const keys = new Set([dp.fileKey]);
    if (mp) keys.add(mp.fileKey);
    let urlMap = {};
    for (const k of keys) Object.assign(urlMap, await fetchFills(k, token));

    // Count images with no meaningful name per section (for fallback numbering)
    const fallbackCount = {}, fallbackIdx = {};
    for (const img of images) {
      if (!resolveImageName(img, texts)) {
        const sk = toKebab(img.sectionName);
        fallbackCount[sk] = (fallbackCount[sk] || 0) + 1;
      }
    }

    const usedNames = new Set();
    for (const img of images) {
      const url = urlMap[img.imageRef];
      if (!url) { console.error(`[figma] Warning: no URL for "${img.nodeName}"`); continue; }

      const sk = toKebab(img.sectionName);
      const suffix = resolveImageName(img, texts);
      let base;
      if (suffix) {
        base = `${sk}-${suffix}`;
      } else {
        const idx = fallbackIdx[sk] || 0;
        fallbackIdx[sk] = idx + 1;
        const num = fallbackCount[sk] > 1 ? `-${idx + 1}` : '';
        base = `${sk}-image${num}`;
      }

      const name = dedupSimple(base, usedNames);
      const fname = `${name}.jpg`;
      const fp = path.join(imgDir, fname);
      console.error(`[figma] ${fname}`);
      try {
        await download(url, fp);
        assetManifest.push({ file: fname, path: path.relative('.', fp), type: 'image', section: sk, figmaNodeName: img.nodeName, shopifyUrl: null });
      } catch (e) { console.error(`[figma] Failed: ${fname} — ${e.message}`); }
    }
  }

  // --- Create icon snippets ---

  const snippetManifest = [];
  if (icons.length) {
    console.error('[figma] Exporting SVGs...');
    const dIds = icons.filter((ic) => da.icons.some((d) => d.nodeId === ic.nodeId)).map((ic) => ic.nodeId);
    const mIds = icons.filter((ic) => !da.icons.some((d) => d.nodeId === ic.nodeId)).map((ic) => ic.nodeId);
    let svgUrls = {};
    if (dIds.length) Object.assign(svgUrls, await exportNodes(dp.fileKey, dIds, 'svg', 1, token));
    if (mp && mIds.length) Object.assign(svgUrls, await exportNodes(mp.fileKey, mIds, 'svg', 1, token));

    // Pass 1: resolve names with exclusive text claiming
    const claimed = new Set();
    const entries = [];
    for (const icon of icons) {
      const url = svgUrls[icon.nodeId];
      if (!url) { console.error(`[figma] Warning: no SVG for "${icon.nodeName}"`); continue; }
      const name = resolveIconName(icon, comps, sets, texts, claimed);
      entries.push({ icon, url, name });
    }

    // Pass 2: deduplicate, position fallback for collisions
    const usedNames = new Set();
    for (const entry of entries) {
      const sec = toKebab(entry.icon.sectionName);
      let final;

      if (entry.name) {
        final = dedupIcon(entry.name, usedNames, sec);
      }

      if (!final) {
        // Position fallback: ordinal within section
        const sectionEntries = entries.filter((e) => toKebab(e.icon.sectionName) === sec);
        const pos = sectionEntries.indexOf(entry);
        const label = pos < ORDINALS.length ? ORDINALS[pos] : `pos-${pos + 1}`;
        final = `${sec}-${label}`;
        usedNames.add(final);
      }

      const fname = `icon-${final}.liquid`;
      const fp = path.join(snipDir, fname);
      console.error(`[figma] ${fname}`);
      try {
        await writeFile(fp, await downloadText(entry.url));
        snippetManifest.push({ file: fname, path: path.relative('.', fp), type: 'snippet', section: sec, figmaNodeName: entry.icon.nodeName, renderTag: `{% render '${fname.replace('.liquid', '')}' %}` });
      } catch (e) { console.error(`[figma] Failed: ${fname} — ${e.message}`); }
    }
  }

  // --- Videos ---

  const videoList = videos.map((v) => ({
    name: `${toKebab(v.sectionName)}-video.mp4`,
    figmaNodeName: v.nodeName,
    section: toKebab(v.sectionName),
    note: 'Upload manually to Shopify Files',
  }));

  // --- Section info ---

  const sectionInfo = dSections.map((ds) => {
    const mob = mSections.find((ms) => toKebab(ms.name) === toKebab(ds.name));
    return { name: ds.name, kebabName: toKebab(ds.name), type: ds.type, desktopBounds: ds.bounds, mobileBounds: mob?.bounds || null, hasMobileVariant: !!mob };
  });

  // --- Write outputs ---

  const manifest = {
    feature, timestamp: new Date().toISOString(),
    desktopUrl: desktop, mobileUrl: mobile || null,
    sections: sectionInfo, screenshots: shotManifest,
    assets: assetManifest, snippets: snippetManifest, videos: videoList,
  };

  await writeFile(path.join(artDir, 'asset-manifest.json'), JSON.stringify(manifest, null, 2));
  await writeFile(path.join(artDir, 'design-context.md'), buildContext(manifest, sectionInfo, shotManifest));
  console.error(`[figma] Done: ${assetManifest.length} images, ${snippetManifest.length} snippets, ${videoList.length} videos`);

  // stdout for skill to read
  process.stdout.write(JSON.stringify(manifest, null, 2));
}

// ============================================================
// Design context markdown
// ============================================================

function buildContext(manifest, sections, shots) {
  const L = [];
  L.push(`# Design Context: ${manifest.feature}\n`);
  L.push('## Sections\n');
  for (const s of sections) {
    L.push(`### ${s.name}\n`);
    const ds = shots.find((x) => x.viewport === 'desktop' && toKebab(x.section) === s.kebabName);
    const ms = shots.find((x) => x.viewport === 'mobile' && toKebab(x.section) === s.kebabName);
    if (ds) L.push(`**Desktop:** \`${ds.path}\``);
    if (ms) L.push(`**Mobile:** \`${ms.path}\``);
    else if (!s.hasMobileVariant) L.push('**Mobile:** Inferred from desktop');
    if (s.desktopBounds) L.push(`**Desktop size:** ${s.desktopBounds.width}x${s.desktopBounds.height}px`);
    if (s.mobileBounds) L.push(`**Mobile size:** ${s.mobileBounds.width}x${s.mobileBounds.height}px`);
    L.push('');
  }

  L.push('## Images\n');
  if (!manifest.assets.length) { L.push('None.\n'); }
  else {
    const byS = {};
    for (const a of manifest.assets) (byS[a.section] ||= []).push(a);
    for (const [sec, assets] of Object.entries(byS)) {
      L.push(`### ${sec}\n`);
      L.push('| File | Shopify URL |');
      L.push('|------|-------------|');
      for (const a of assets) L.push(`| \`${a.file}\` | ${a.shopifyUrl || 'pending upload'} |`);
      L.push('');
    }
  }

  L.push('## Icon Snippets\n');
  if (!manifest.snippets.length) { L.push('None.\n'); }
  else {
    L.push('| Snippet | Section | Render Tag |');
    L.push('|---------|---------|------------|');
    for (const s of manifest.snippets) L.push(`| \`${s.file}\` | ${s.section} | \`${s.renderTag}\` |`);
    L.push('');
  }

  if (manifest.videos.length) {
    L.push('## Videos (Manual Upload Required)\n');
    for (const v of manifest.videos) L.push(`- **${v.name}** — "${v.figmaNodeName}" in ${v.section}`);
    L.push('');
  }

  L.push('## Source\n');
  L.push(`- **Desktop:** ${manifest.desktopUrl}`);
  if (manifest.mobileUrl) L.push(`- **Mobile:** ${manifest.mobileUrl}`);
  L.push(`- **Fetched:** ${manifest.timestamp}\n`);
  return L.join('\n');
}

main().catch((e) => { console.error(`[figma] Fatal: ${e.message}`); process.exit(1); });
