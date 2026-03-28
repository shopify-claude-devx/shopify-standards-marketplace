'use strict';

const { readFile, writeFile, unlink } = require('node:fs/promises');
const path = require('node:path');

function log(msg) {
  console.error(`[parse-figma] ${msg}`);
}


function parseArgs() {
  const feature = process.argv[2];
  if (!feature) {
    console.error('Usage: node parse-figma.js <feature>');
    process.exit(1);
  }
  return feature;
}


function toKebab(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pxToRem(px) {
  return `${parseFloat((px / 16).toFixed(4))}rem`;
}

function figmaColorToHex({ r, g, b, a = 1 }) {
  const h = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  return a < 0.99 ? `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a.toFixed(2)})` : `#${h(r)}${h(g)}${h(b)}`;
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
    return ((style.lineHeightPercent || 100) / 100).toFixed(2);
  }
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
        ? `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${c.a?.toFixed(2) || 1})`
        : '';

      if (e.type === 'DROP_SHADOW') {
        return { css: 'box-shadow', value: `${e.offset?.x || 0}px ${e.offset?.y || 0}px ${e.radius || 0}px ${e.spread || 0}px ${rgba}` };
      }
      if (e.type === 'INNER_SHADOW') {
        return { css: 'box-shadow', value: `inset ${e.offset?.x || 0}px ${e.offset?.y || 0}px ${e.radius || 0}px ${rgba}` };
      }
      if (e.type === 'LAYER_BLUR') {
        return { css: 'filter', value: `blur(${e.radius || 0}px)` };
      }
      if (e.type === 'BACKGROUND_BLUR') {
        return { css: 'backdrop-filter', value: `blur(${e.radius || 0}px)` };
      }
      return null;
    })
    .filter(Boolean);
}


// Always-generic Figma auto-names (with or without a trailing number)
const ALWAYS_GENERIC_RE = /^(frame|rectangle|ellipse|group|component|instance|vector|image|boolean-operation|mask|union|subtract|intersect|exclude)\s*\d*$/i;
// Shape types that are only generic when followed by a number (bare "star" or "line" can be meaningful icon names)
const NUMBERED_GENERIC_RE = /^(star|polygon|line)\s+\d+$/i;

function isGenericName(name) {
  if (!name) return true;
  const trimmed = name.trim();
  return ALWAYS_GENERIC_RE.test(trimmed) || NUMBERED_GENERIC_RE.test(trimmed);
}

function meaningfulName(layerName, { parentName, grandparentName, nodeType, siblingIndex, totalSiblings }) {
  let base;

  if (!isGenericName(layerName)) {
    base = toKebab(layerName);
  } else if (parentName && !isGenericName(parentName)) {
    base = toKebab(parentName);
    if (totalSiblings > 1) base = `${base}-${siblingIndex + 1}`;
  } else if (grandparentName && !isGenericName(grandparentName)) {
    base = toKebab(grandparentName);
    if (totalSiblings > 1) base = `${base}-${siblingIndex + 1}`;
  } else {
    // All ancestors are generic — use type-based fallback
    if (nodeType === 'IMAGE') {
      base = totalSiblings > 1 ? `background-${siblingIndex + 1}` : 'background';
    } else {
      base = totalSiblings > 1 ? `graphic-${siblingIndex + 1}` : 'graphic';
    }
  }

  if (nodeType === 'SVG') {
    base = base.replace(/^icon-/, '').replace(/-icon$/, '') || base;
  }

  return base;
}

let _usedNames;
function uniqueAssetName(name) {
  const count = (_usedNames.get(name) || 0) + 1;
  _usedNames.set(name, count);
  return count === 1 ? name : `${name}-${count}`;
}


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


function relativeBounds(nodeBox, originBox) {
  if (!nodeBox || !originBox) return null;
  return {
    x: Math.round(nodeBox.x - originBox.x),
    y: Math.round(nodeBox.y - originBox.y),
    width: Math.round(nodeBox.width),
    height: Math.round(nodeBox.height),
  };
}


class FigmaParser {
  constructor(desktopRoot, mobileRoot, sectionName) {
    this.desktop = desktopRoot.document;
    this.mobile = mobileRoot ? mobileRoot.document : null;
    this.sectionName = sectionName;

    this.originBox = this.desktop.absoluteBoundingBox || { x: 0, y: 0 };
    this.typography = new Map();
    this.layouts = [];
    this.imageAssets = [];
    this.svgAssets = [];
    this.layerLines = [];
    this.diffNodes = {};
    _usedNames = new Map();
  }

  run() {
    this.walkNode(this.desktop, 0, this.sectionName, true);
    this.mobileChanges = this.mobile ? this.diffMobile() : [];
    return this;
  }

  walkNode(node, depth, parentBem, isRoot = false, parentName = '', grandparentName = '', siblingIndex = 0, totalSiblings = 1) {
    if (!node || typeof node !== 'object') return;
    const { id: nodeId, name = '', type, children } = node;
    if (!nodeId || !type) return;
    const slug = toKebab(name);
    const bem = isRoot ? this.sectionName : `${this.sectionName}__${slug}`;
    const indent = '  '.repeat(depth);

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

    if (isSvgNode(node)) {
      const iconSlug = meaningfulName(name, { parentName, grandparentName, nodeType: 'SVG', siblingIndex, totalSiblings });
      const snippetName = uniqueAssetName(`icon-${iconSlug}`);
      this.svgAssets.push({ nodeId, name: snippetName, layerName: name, snippetName });
      this.layerLines.push(`${indent}Node ${nodeId} → {% render '${snippetName}' %} [SVG]`);
      return;
    }

    const imageRef = getImageRef(node);
    if (imageRef) {
      const imgSlug = meaningfulName(name, { parentName, grandparentName, nodeType: 'IMAGE', siblingIndex, totalSiblings });
      const assetName = uniqueAssetName(`${this.sectionName}-${imgSlug}`);
      this.imageAssets.push({ nodeId, name: assetName, layerName: name, viewport: 'desktop' });

      this.diffNodes[nodeId] = {
        selector: `.${bem}`,
        type: 'IMAGE',
        relativeBounds: relativeBounds(node.absoluteBoundingBox, this.originBox),
      };

      this.layerLines.push(`${indent}Node ${nodeId} → .${bem} [IMAGE] "${assetName}"`);
    }

    if (['FRAME', 'COMPONENT', 'INSTANCE', 'GROUP'].includes(type)) {
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

    if (!imageRef) {
      const lineType = isRoot ? '[section]' : `[${type}]`;
      this.layerLines.push(`${indent}Node ${nodeId} → .${bem} ${lineType}`);
    }

    if (Array.isArray(children)) {
      for (let i = 0; i < children.length; i++) {
        this.walkNode(children[i], depth + 1, bem, false, name, parentName, i, children.length);
      }
    }
  }

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
        changes.push({
          property: 'flex-direction', selector: `.${bem}`, nodeId: dNode.id,
          desktop: dNode.layoutMode === 'HORIZONTAL' ? 'row' : 'column',
          mobile: mNode.layoutMode === 'HORIZONTAL' ? 'row' : 'column'
        });
      }
      if (dNode.itemSpacing !== mNode.itemSpacing) {
        changes.push({
          property: 'gap', selector: `.${bem}`, nodeId: dNode.id,
          desktop: `${dNode.itemSpacing || 0}px`, mobile: `${mNode.itemSpacing || 0}px`
        });
      }
      const dPad = `${dNode.paddingTop || 0}px ${dNode.paddingRight || 0}px ${dNode.paddingBottom || 0}px ${dNode.paddingLeft || 0}px`;
      const mPad = `${mNode.paddingTop || 0}px ${mNode.paddingRight || 0}px ${mNode.paddingBottom || 0}px ${mNode.paddingLeft || 0}px`;
      if (dPad !== mPad) {
        changes.push({ property: 'padding', selector: `.${bem}`, nodeId: dNode.id, desktop: dPad, mobile: mPad });
      }
    }

    // Match children by name instead of array index — handles reordering, hidden layers, and differing child counts
    const dChildren = dNode.children || [];
    const mChildren = mNode.children || [];
    const mChildMap = new Map();
    for (const mc of mChildren) {
      // Skip nulls and only keep the first child with each name (duplicates are common with Figma auto-naming)
      if (mc && mc.name && !mChildMap.has(mc.name)) {
        mChildMap.set(mc.name, mc);
      }
    }

    // If all children have duplicate/empty names, fall back to index-based matching
    if (mChildMap.size === 0 && mChildren.length > 0 && dChildren.length > 0) {
      const len = Math.min(dChildren.length, mChildren.length);
      for (let i = 0; i < len; i++) {
        this.compareNodes(dChildren[i], mChildren[i], changes, bem);
      }
    } else {
      for (const dc of dChildren) {
        if (!dc || !dc.name) continue;
        const mc = mChildMap.get(dc.name);
        if (mc) {
          this.compareNodes(dc, mc, changes, bem);
        }
      }
    }
  }

  buildDesignContext() {
    const section = this.sectionName;

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

    const typRows = Array.from(this.typography.values()).map((t) =>
      `| ${t.role} | ${t.family} | ${t.sizePx}px | ${t.sizeRem} | ${t.weight} | ${t.lineHeight} | ${t.letterSpacing} | ${t.colorHex} | ${t.nodeId} |`
    );

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

    const imgRows = this.imageAssets.map((a) =>
      `| \`${a.name}\` | \`${a.nodeId}\` | ${a.viewport} |`
    );
    const svgRows = this.svgAssets.map((a) =>
      `| \`${a.snippetName}\` | \`${a.nodeId}\` | \`snippets/${a.snippetName}.liquid\` |`
    );

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

### Images
| Asset Name | Node ID | Viewport |
|------------|---------|----------|
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


async function main() {
  const feature = parseArgs();
  const base = path.resolve(`.buildspace/artifacts/${feature}`);

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

  const rootDoc = desktopRoot.document;
  if (!rootDoc.name && !feature) {
    throw new Error('Cannot derive section name: root document has no name and no feature argument provided.');
  }
  const sectionName = toKebab(rootDoc.name || feature);
  log(`Section: "${sectionName}"`);

  const parser = new FigmaParser(desktopRoot, mobileRoot, sectionName);
  parser.run();

  const designContext = parser.buildDesignContext();
  await writeFile(path.join(base, 'design-context.md'), designContext);
  log('Saved design-context.md');

  const assetsOut = {
    feature,
    sectionName,
    images: parser.imageAssets,
    svgs: parser.svgAssets,
  };
  await writeFile(path.join(base, 'figma-assets.json'), JSON.stringify(assetsOut, null, 2));
  log('Saved figma-assets.json');

  const diffOut = {
    feature,
    sectionName,
    nodes: parser.diffNodes,
  };
  await writeFile(path.join(base, 'figma-diff-reference.json'), JSON.stringify(diffOut, null, 2));
  log('Saved figma-diff-reference.json');

  // Auto-delete raw Figma JSON files — they are only needed for parsing
  await unlink(path.join(base, 'figma-full.json')).catch(() => {});
  log('Cleaned up figma-full.json');
  if (mobileRoot) {
    await unlink(path.join(base, 'figma-full-mobile.json')).catch(() => {});
    log('Cleaned up figma-full-mobile.json');
  }

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
