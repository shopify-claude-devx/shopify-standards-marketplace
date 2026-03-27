#!/usr/bin/env node
/**
 * parse-figma.js — Extract design data from figma-full.json
 *
 * Reads raw Figma JSON (never touched by AI) → writes:
 *   design-context.md         — The ONLY Figma file AI reads
 *   figma-assets.json         — IMAGE and SVG assets with node IDs and CDN URLs
 *   figma-diff-reference.json — Expected positions + styles per node (for position-diff.js)
 *
 * Usage:
 *   node parse-figma.js <feature>
 *
 * Reads from .buildspace/artifacts/{feature}/
 *   figma-full.json           — Required
 *   figma-full-mobile.json    — Optional (for responsive diff)
 *   figma-images.json         — Required (imageRef → CDN URL map)
 */

'use strict';

const { readFile, writeFile } = require('node:fs/promises');
const path = require('node:path');

function log(msg) {
  console.error(`[parse-figma] ${msg}`);
}

// ── Args ─────────────────────────────────────────────────────────

function parseArgs() {
  const feature = process.argv[2];
  if (!feature) {
    console.error('Usage: node parse-figma.js <feature>');
    process.exit(1);
  }
  return feature;
}

// ── Conversion helpers ────────────────────────────────────────────

function toKebab(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pxToRem(px) {
  const rem = px / 16;
  // e.g. 32 → "2rem", 14 → "0.875rem"
  return `${parseFloat(rem.toFixed(4))}rem`;
}

function figmaColorToHex({ r, g, b, a = 1 }) {
  const h = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  return a < 0.99 ? `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${a.toFixed(2)})` : `#${h(r)}${h(g)}${h(b)}`;
}

function figmaColorToCSS({ r, g, b, a = 1 }) {
  const ri = Math.round(r * 255);
  const gi = Math.round(g * 255);
  const bi = Math.round(b * 255);
  return a < 0.99 ? `rgba(${ri}, ${gi}, ${bi}, ${a.toFixed(2)})` : `rgb(${ri}, ${gi}, ${bi})`;
}

function getFirstSolidFill(fills) {
  if (!Array.isArray(fills)) return null;
  return fills.find((f) => f.type === 'SOLID' && f.color) || null;
}

function lineHeightValue(style) {
  if (!style) return 'normal';
  if (style.lineHeightUnit === 'PIXELS') {
    return `${Math.round(style.lineHeightPx * 100) / 100}px`;
  }
  if (style.lineHeightUnit === 'PERCENT' || style.lineHeightUnit === 'FONT_SIZE_%') {
    // Convert percent to unitless ratio: 120% → 1.2
    const ratio = ((style.lineHeightPercent || 100) / 100).toFixed(2);
    return ratio;
  }
  // AUTO
  return 'normal';
}

function letterSpacingValue(style) {
  if (!style || style.letterSpacing == null || style.letterSpacing === 0) return '0';
  const em = (style.letterSpacing / (style.fontSize || 16)).toFixed(4);
  return `${em}em`;
}

function extractEffects(effects) {
  if (!Array.isArray(effects) || effects.length === 0) return [];
  return effects
    .filter((e) => e.visible !== false)
    .map((e) => {
      const c = e.color;
      const rgba = c
        ? `rgba(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)},${c.a?.toFixed(2) || 1})`
        : '';

      if (e.type === 'DROP_SHADOW') {
        return { css: 'box-shadow', value: `${e.offset?.x||0}px ${e.offset?.y||0}px ${e.radius||0}px ${e.spread||0}px ${rgba}` };
      }
      if (e.type === 'INNER_SHADOW') {
        return { css: 'box-shadow', value: `inset ${e.offset?.x||0}px ${e.offset?.y||0}px ${e.radius||0}px ${rgba}` };
      }
      if (e.type === 'LAYER_BLUR') {
        return { css: 'filter', value: `blur(${e.radius||0}px)` };
      }
      if (e.type === 'BACKGROUND_BLUR') {
        return { css: 'backdrop-filter', value: `blur(${e.radius||0}px)` };
      }
      return null;
    })
    .filter(Boolean);
}

// ── Asset detection ───────────────────────────────────────────────

const SVG_TYPES = new Set(['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'LINE']);
const SVG_KEYWORDS = ['icon', 'arrow', 'chevron', 'logo', 'close', 'menu', 'search', 'cart', 'check', 'plus', 'minus', 'heart', 'play', 'pause'];

function isSvgNode(node) {
  if (SVG_TYPES.has(node.type)) return true;
  const name = (node.name || '').toLowerCase();
  if (['GROUP', 'COMPONENT', 'INSTANCE', 'FRAME'].includes(node.type)) {
    return SVG_KEYWORDS.some((k) => name.includes(k));
  }
  return false;
}

function getImageRef(node) {
  if (!Array.isArray(node.fills)) return null;
  const imgFill = node.fills.find((f) => f.type === 'IMAGE');
  return imgFill?.imageRef || null;
}

// ── Relative bounds ───────────────────────────────────────────────

function relativeBounds(nodeBox, originBox) {
  if (!nodeBox || !originBox) return null;
  return {
    x: Math.round(nodeBox.x - originBox.x),
    y: Math.round(nodeBox.y - originBox.y),
    width: Math.round(nodeBox.width),
    height: Math.round(nodeBox.height),
  };
}

// ── Tree walker ───────────────────────────────────────────────────

class FigmaParser {
  constructor(desktopRoot, mobileRoot, imagesMap, sectionName) {
    this.desktop = desktopRoot.document;
    this.mobile = mobileRoot ? mobileRoot.document : null;
    this.imagesMap = imagesMap;
    this.sectionName = sectionName;

    // Origin for relative position calculation
    this.originBox = this.desktop.absoluteBoundingBox || { x: 0, y: 0 };

    // Outputs
    this.typography = new Map();   // deduplicated by family+size+weight
    this.layouts = [];             // frames with auto-layout
    this.imageAssets = [];
    this.svgAssets = [];
    this.layerLines = [];
    this.diffNodes = {};           // nodeId → { selector, type, relativeBounds, typography }
  }

  run() {
    this.walkNode(this.desktop, 0, this.sectionName, true);
    this.mobileChanges = this.mobile ? this.diffMobile() : [];
    return this;
  }

  // ── Node walker ─────────────────────────────────────────────────

  walkNode(node, depth, parentBem, isRoot = false) {
    if (!node || typeof node !== 'object') return;
    const { id: nodeId, name = '', type, children } = node;
    if (!nodeId || !type) return;
    const slug = toKebab(name);
    const bem = isRoot ? this.sectionName : `${this.sectionName}__${slug}`;
    const indent = '  '.repeat(depth);

    // ── TEXT ──────────────────────────────────────────────────────
    if (type === 'TEXT' && node.style) {
      const s = node.style;
      const fill = getFirstSolidFill(node.fills);
      const colorHex = fill ? figmaColorToHex(fill.color) : '#000000';
      const colorCSS = fill ? figmaColorToCSS(fill.color) : 'rgb(0,0,0)';
      const lh = lineHeightValue(s);
      const ls = letterSpacingValue(s);

      const sig = `${s.fontFamily}|${s.fontSize}|${s.fontWeight}`;
      if (!this.typography.has(sig)) {
        this.typography.set(sig, {
          role: slug || 'text',
          family: s.fontFamily,
          sizePx: s.fontSize,
          sizeRem: pxToRem(s.fontSize),
          weight: s.fontWeight,
          lineHeight: lh,
          letterSpacing: ls,
          textDecoration: s.textDecoration && s.textDecoration !== 'NONE' ? s.textDecoration.toLowerCase() : null,
          textCase: s.textCase && s.textCase !== 'ORIGINAL' ? s.textCase.toLowerCase() : null,
          colorHex,
          colorCSS,
          nodeId,
        });
      }

      this.diffNodes[nodeId] = {
        selector: `.${bem}`,
        type: 'TEXT',
        typography: {
          fontSize: `${s.fontSize}px`,
          fontWeight: String(s.fontWeight),
          color: colorCSS,
        },
        relativeBounds: relativeBounds(node.absoluteBoundingBox, this.originBox),
      };

      const preview = (node.characters || '').slice(0, 50);
      this.layerLines.push(`${indent}Node ${nodeId} → .${bem} [TEXT] "${preview}${(node.characters || '').length > 50 ? '…' : ''}"`);
      return;
    }

    // ── SVG / icon ────────────────────────────────────────────────
    if (isSvgNode(node)) {
      const snippetName = `icon-${slug}`;
      this.svgAssets.push({ nodeId, name: snippetName, layerName: name, snippetName });
      this.layerLines.push(`${indent}Node ${nodeId} → {% render '${snippetName}' %} [SVG]`);
      return; // don't recurse into SVG internals
    }

    // ── IMAGE fill ────────────────────────────────────────────────
    const imageRef = getImageRef(node);
    if (imageRef) {
      const cdnUrl = this.imagesMap[imageRef] || null;
      const assetName = `${this.sectionName}-${slug}`;
      this.imageAssets.push({ nodeId, name: assetName, layerName: name, cdnUrl, viewport: 'desktop' });

      this.diffNodes[nodeId] = {
        selector: `.${bem}`,
        type: 'IMAGE',
        relativeBounds: relativeBounds(node.absoluteBoundingBox, this.originBox),
      };

      this.layerLines.push(`${indent}Node ${nodeId} → .${bem} [IMAGE] "${assetName}"`);
      // still recurse — image fills can have children (e.g. overlaid text)
    }

    // ── Layout frame ──────────────────────────────────────────────
    if (['FRAME', 'COMPONENT', 'INSTANCE', 'GROUP'].includes(type)) {
      // Don't overwrite the IMAGE diffNode already written above for image-fill frames
      if (!imageRef && node.absoluteBoundingBox) {
        this.diffNodes[nodeId] = {
          selector: `.${bem}`,
          type,
          ...(isRoot ? { isSection: true } : {}),
          relativeBounds: relativeBounds(node.absoluteBoundingBox, this.originBox),
        };
      }

      if (node.layoutMode) {
        const bg = getFirstSolidFill(node.fills);
        this.layouts.push({
          nodeId,
          bem,
          name,
          isRoot,
          direction: node.layoutMode === 'HORIZONTAL' ? 'row' : 'column',
          gap: node.itemSpacing || 0,
          paddingTop: node.paddingTop || 0,
          paddingRight: node.paddingRight || 0,
          paddingBottom: node.paddingBottom || 0,
          paddingLeft: node.paddingLeft || 0,
          primaryAxisAlign: node.primaryAxisAlignItems || null,
          counterAxisAlign: node.counterAxisAlignItems || null,
          width: node.absoluteBoundingBox?.width || null,
          height: node.absoluteBoundingBox?.height || null,
          background: bg ? figmaColorToHex(bg.color) : null,
          effects: extractEffects(node.effects),
        });
      } else if (isRoot) {
        // Root frame without auto-layout — still capture background
        const bg = getFirstSolidFill(node.fills);
        this.layouts.push({
          nodeId,
          bem,
          name,
          isRoot: true,
          direction: null,
          width: node.absoluteBoundingBox?.width || null,
          height: node.absoluteBoundingBox?.height || null,
          background: bg ? figmaColorToHex(bg.color) : null,
          effects: extractEffects(node.effects),
        });
      }
    }

    // Only write layer line if IMAGE fill didn't already write one above
    if (!imageRef) {
      const lineType = isRoot ? '[section]' : `[${type}]`;
      this.layerLines.push(`${indent}Node ${nodeId} → .${bem} ${lineType}`);
    }

    // ── Recurse ───────────────────────────────────────────────────
    if (Array.isArray(children)) {
      for (const child of children) {
        this.walkNode(child, depth + 1, bem);
      }
    }
  }

  // ── Responsive diff ───────────────────────────────────────────

  diffMobile() {
    const changes = [];
    this.compareNodes(this.desktop, this.mobile, changes, this.sectionName);
    return changes;
  }

  compareNodes(dNode, mNode, changes, parentBem) {
    if (!dNode || !mNode || dNode.type !== mNode.type) return;

    const slug = toKebab(dNode.name || '');
    const bem = dNode.id === this.desktop.id ? this.sectionName : `${this.sectionName}__${slug}`;

    if (dNode.type === 'TEXT' && dNode.style && mNode.style) {
      const ds = dNode.style;
      const ms = mNode.style;
      if (ds.fontSize !== ms.fontSize) {
        changes.push({ property: 'font-size', selector: `.${bem}`, nodeId: dNode.id, desktop: `${ds.fontSize}px`, mobile: `${ms.fontSize}px` });
      }
      if (ds.fontWeight !== ms.fontWeight) {
        changes.push({ property: 'font-weight', selector: `.${bem}`, nodeId: dNode.id, desktop: String(ds.fontWeight), mobile: String(ms.fontWeight) });
      }
    }

    if (dNode.layoutMode && mNode.layoutMode) {
      if (dNode.layoutMode !== mNode.layoutMode) {
        changes.push({ property: 'flex-direction', selector: `.${bem}`, nodeId: dNode.id,
          desktop: dNode.layoutMode === 'HORIZONTAL' ? 'row' : 'column',
          mobile: mNode.layoutMode === 'HORIZONTAL' ? 'row' : 'column' });
      }
      if (dNode.itemSpacing !== mNode.itemSpacing) {
        changes.push({ property: 'gap', selector: `.${bem}`, nodeId: dNode.id,
          desktop: `${dNode.itemSpacing || 0}px`, mobile: `${mNode.itemSpacing || 0}px` });
      }
      const dPad = `${dNode.paddingTop||0}px ${dNode.paddingRight||0}px ${dNode.paddingBottom||0}px ${dNode.paddingLeft||0}px`;
      const mPad = `${mNode.paddingTop||0}px ${mNode.paddingRight||0}px ${mNode.paddingBottom||0}px ${mNode.paddingLeft||0}px`;
      if (dPad !== mPad) {
        changes.push({ property: 'padding', selector: `.${bem}`, nodeId: dNode.id, desktop: dPad, mobile: mPad });
      }
    }

    const dChildren = dNode.children || [];
    const mChildren = mNode.children || [];
    const len = Math.min(dChildren.length, mChildren.length);
    for (let i = 0; i < len; i++) {
      this.compareNodes(dChildren[i], mChildren[i], changes, bem);
    }
  }

  // ── design-context.md builder ────────────────────────────────

  buildDesignContext() {
    const section = this.sectionName;

    // CSS typography comment block
    const commentLines = Array.from(this.typography.values()).map((t) => {
      let line = `  ${t.role.padEnd(14)}: ${t.family}, ${t.sizePx}px (${t.sizeRem}), weight ${t.weight}, lh ${t.lineHeight}`;
      if (t.letterSpacing !== '0') line += `, ls ${t.letterSpacing}`;
      if (t.textCase) line += `, ${t.textCase}`;
      line += `, ${t.colorHex}`;
      return line;
    });
    const rootBg = this.layouts.find((l) => l.isRoot)?.background;
    if (rootBg) commentLines.push(`  ${'background'.padEnd(14)}: ${rootBg}`);

    const cssBlock = [
      '```css',
      '/*',
      `  Typography from Figma — copy to top of ${section}-stylesheet.css:`,
      ...commentLines,
      '*/',
      '```',
    ].join('\n');

    // Typography table
    const typRows = Array.from(this.typography.values()).map((t) =>
      `| ${t.role} | ${t.family} | ${t.sizePx}px | ${t.sizeRem} | ${t.weight} | ${t.lineHeight} | ${t.letterSpacing} | ${t.colorHex} | ${t.nodeId} |`
    );

    // Layout section
    const layoutBlocks = this.layouts.map((l) => {
      const lines = [`### .${l.bem}  —  Node \`${l.nodeId}\`  —  "${l.name}"`];
      if (l.direction) lines.push(`- **flex-direction**: \`${l.direction}\``);
      if (l.gap) lines.push(`- **gap**: \`${l.gap}px\``);
      if (l.paddingTop !== undefined) {
        lines.push(`- **padding**: \`${l.paddingTop}px ${l.paddingRight}px ${l.paddingBottom}px ${l.paddingLeft}px\``);
      }
      if (l.background) lines.push(`- **background**: \`${l.background}\``);
      if (l.width) lines.push(`- **width**: \`${l.width}px\``);
      if (l.height) lines.push(`- **height**: \`${l.height}px\``);
      if (l.primaryAxisAlign) lines.push(`- **justify-content**: \`${l.primaryAxisAlign}\``);
      if (l.counterAxisAlign) lines.push(`- **align-items**: \`${l.counterAxisAlign}\``);
      for (const e of l.effects || []) lines.push(`- **${e.css}**: \`${e.value}\``);
      return lines.join('\n');
    });

    // Assets
    const imgRows = this.imageAssets.map((a) =>
      `| \`${a.name}\` | \`${a.nodeId}\` | ${a.cdnUrl ? '[CDN URL in figma-assets.json]' : '⚠ not found in figma-images.json'} |`
    );
    const svgRows = this.svgAssets.map((a) =>
      `| \`${a.snippetName}\` | \`${a.nodeId}\` | \`snippets/${a.snippetName}.liquid\` |`
    );

    // Responsive
    const respRows = (this.mobileChanges || []).map((c) =>
      `| \`${c.property}\` | \`${c.desktop}\` | \`${c.mobile}\` | \`${c.selector}\` | \`${c.nodeId}\` |`
    );

    return `# Design Context: ${section}
_Auto-generated by parse-figma.js — do not edit manually_

---

## CSS Typography Comment Block

Paste this verbatim at the top of \`assets/${section}-stylesheet.css\` **before writing any rules**:

${cssBlock}

---

## Typography

| Role | Family | px | rem | Weight | Line Height | Letter Spacing | Color | Node ID |
|------|--------|----|-----|--------|-------------|----------------|-------|---------|
${typRows.join('\n') || '| (no text nodes found) ||||||||'}

---

## Layout

${layoutBlocks.join('\n\n') || '_No layout frames found_'}

---

## Layer Structure

Every node listed here needs a \`data-figma-id\` attribute in Liquid.

\`\`\`
${this.layerLines.join('\n')}
\`\`\`

---

## Assets

### Images (uploaded to Shopify Files)
| Asset Name | Node ID | CDN Source |
|------------|---------|------------|
${imgRows.join('\n') || '| (none) | | |'}

### SVGs (inline snippets)
| Snippet Name | Node ID | Output Path |
|--------------|---------|-------------|
${svgRows.join('\n') || '| (none) | | |'}

---

## Responsive Differences (mobile overrides)

${respRows.length
  ? `| Property | Desktop | Mobile | Selector | Node ID |\n|----------|---------|--------|----------|----------|\n${respRows.join('\n')}`
  : '_No mobile frame provided or no differences found_'}
`;
  }
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  const feature = parseArgs();
  const base = path.resolve(`.buildspace/artifacts/${feature}`);

  // Read desktop JSON
  const desktopRaw = await readFile(path.join(base, 'figma-full.json'), 'utf-8').catch(() => {
    throw new Error('figma-full.json not found. Run fetch-figma.js first.');
  });
  let desktopRoot;
  try {
    desktopRoot = JSON.parse(desktopRaw);
  } catch (err) {
    throw new Error(`figma-full.json is not valid JSON: ${err.message}. Re-run fetch-figma.js.`);
  }
  if (!desktopRoot || !desktopRoot.document) {
    throw new Error(
      'figma-full.json has unexpected structure (missing "document"). ' +
      'Re-run fetch-figma.js — the node may be inaccessible or the file key is wrong.'
    );
  }

  // Read mobile JSON (optional)
  let mobileRoot = null;
  try {
    const raw = await readFile(path.join(base, 'figma-full-mobile.json'), 'utf-8');
    try {
      mobileRoot = JSON.parse(raw);
      if (!mobileRoot || !mobileRoot.document) {
        log('Warning: figma-full-mobile.json has unexpected structure — skipping mobile');
        mobileRoot = null;
      } else {
        log('Mobile frame loaded');
      }
    } catch (err) {
      log(`Warning: figma-full-mobile.json is invalid JSON (${err.message}) — skipping mobile`);
    }
  } catch {
    log('No mobile frame (figma-full-mobile.json not present)');
  }

  // Read images CDN map
  const imagesRaw = await readFile(path.join(base, 'figma-images.json'), 'utf-8').catch(() => {
    throw new Error('figma-images.json not found. Run fetch-figma.js first.');
  });
  let imagesData;
  try {
    imagesData = JSON.parse(imagesRaw);
  } catch (err) {
    throw new Error(`figma-images.json is not valid JSON: ${err.message}. Re-run fetch-figma.js.`);
  }
  const imagesMap = (imagesData && typeof imagesData.images === 'object') ? imagesData.images : {};
  if (Object.keys(imagesMap).length === 0) {
    log('Note: figma-images.json has no image entries (no image fills in this design, or the design has no rasterized assets)');
  }

  // Derive section name from root node name
  const rootDoc = desktopRoot.document;
  if (!rootDoc.name && !feature) {
    throw new Error('Cannot derive section name: root document has no name and no feature argument provided.');
  }
  const sectionName = toKebab(rootDoc.name || feature);
  log(`Section: "${sectionName}"`);

  // Parse
  const parser = new FigmaParser(desktopRoot, mobileRoot, imagesMap, sectionName);
  parser.run();

  // Write design-context.md
  const designContext = parser.buildDesignContext();
  await writeFile(path.join(base, 'design-context.md'), designContext);
  log('Saved design-context.md');

  // Write figma-assets.json
  const assetsOut = {
    feature,
    sectionName,
    images: parser.imageAssets,
    svgs: parser.svgAssets,
  };
  await writeFile(path.join(base, 'figma-assets.json'), JSON.stringify(assetsOut, null, 2));
  log('Saved figma-assets.json');

  // Write figma-diff-reference.json
  const diffOut = {
    feature,
    sectionName,
    nodes: parser.diffNodes,
  };
  await writeFile(path.join(base, 'figma-diff-reference.json'), JSON.stringify(diffOut, null, 2));
  log('Saved figma-diff-reference.json');

  const summary = {
    feature,
    sectionName,
    typographyStyles: parser.typography.size,
    images: parser.imageAssets.length,
    svgs: parser.svgAssets.length,
    layoutFrames: parser.layouts.length,
    mobileChanges: parser.mobileChanges?.length || 0,
  };

  log(`Done — typography: ${summary.typographyStyles}, images: ${summary.images}, svgs: ${summary.svgs}`);
  console.log(JSON.stringify(summary));
}

main().catch((err) => {
  console.error(`[parse-figma] Fatal: ${err.message}`);
  process.exit(1);
});
