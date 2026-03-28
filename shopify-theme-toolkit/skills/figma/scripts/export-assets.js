'use strict';

const { readFile, writeFile, mkdir, access } = require('node:fs/promises');
const path = require('node:path');

const FIGMA_API = 'https://api.figma.com';
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;

const TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function log(msg) {
  console.error(`[export-assets] ${msg}`);
}


function parseArgs() {
  const args = process.argv.slice(2);
  const [fileKey, feature] = args;

  if (!fileKey || !feature) {
    console.error(
      'Usage: FIGMA_TOKEN=figd_... node export-assets.js <fileKey> <feature> [--theme-path <path>]'
    );
    process.exit(1);
  }

  const themePathIdx = args.indexOf('--theme-path');
  const themePath = (themePathIdx !== -1 && args[themePathIdx + 1] && !args[themePathIdx + 1].startsWith('--'))
    ? args[themePathIdx + 1]
    : '.';

  return { fileKey, feature, themePath };
}


async function figmaGet(endpoint) {
  log(`GET ${endpoint}`);
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(`${FIGMA_API}${endpoint}`, {
        headers: { 'X-Figma-Token': FIGMA_TOKEN },
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (attempt < MAX_RETRIES && (err.name === 'AbortError' || err.code === 'UND_ERR_CONNECT_TIMEOUT')) {
        log(`Timeout/network error (attempt ${attempt}/${MAX_RETRIES}) — retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      if (err.name === 'AbortError') {
        throw new Error(`Figma API request timed out after ${TIMEOUT_MS / 1000}s`);
      }
      if (attempt < MAX_RETRIES) {
        log(`Network error (attempt ${attempt}/${MAX_RETRIES}) — retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw new Error(`Network error after ${MAX_RETRIES} attempts: ${err.message}`);
    }
    clearTimeout(timer);

    if (res.status === 429) {
      if (attempt < MAX_RETRIES) {
        const wait = parseInt(res.headers.get('retry-after') || '10', 10);
        log(`Rate limited (429) — waiting ${wait}s before retry ${attempt + 1}/${MAX_RETRIES}...`);
        await new Promise((r) => setTimeout(r, wait * 1000));
        continue;
      }
      throw new Error('Figma API rate limit exceeded (429). Wait a few minutes and try again.');
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (res.status === 403) {
        throw new Error(
          'Figma API 403 — access denied. Verify FIGMA_TOKEN has read access to this file.'
        );
      }
      throw new Error(`Figma API ${res.status}: ${body}`);
    }
    return res.json();
  }
}

async function downloadText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, { signal: controller.signal });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error(`Download timed out after ${TIMEOUT_MS / 1000}s`);
    throw err;
  }
  clearTimeout(timer);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  return res.text();
}

async function downloadBinary(url, destPath) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(url, { signal: controller.signal });
    } catch (err) {
      clearTimeout(timer);
      if (attempt < MAX_RETRIES && (err.name === 'AbortError' || err.code === 'UND_ERR_CONNECT_TIMEOUT')) {
        log(`Download timeout (attempt ${attempt}/${MAX_RETRIES}) — retrying...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      if (err.name === 'AbortError') throw new Error(`Download timed out: ${path.basename(destPath)}`);
      if (attempt < MAX_RETRIES) {
        log(`Download network error (attempt ${attempt}/${MAX_RETRIES}) — retrying...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw new Error(`Download failed after ${MAX_RETRIES} attempts: ${err.message}`);
    }
    clearTimeout(timer);

    if (res.status === 429) {
      if (attempt < MAX_RETRIES) {
        const wait = parseInt(res.headers.get('retry-after') || '5', 10);
        log(`Rate limited downloading ${path.basename(destPath)} — waiting ${wait}s...`);
        await new Promise((r) => setTimeout(r, wait * 1000));
        continue;
      }
      throw new Error(`Rate limited downloading ${path.basename(destPath)}`);
    }
    if (!res.ok) throw new Error(`Download failed ${res.status}: ${path.basename(destPath)}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(destPath, buf);
    return;
  }
}


function cleanSvg(raw) {
  return raw
    .replace(/<\?xml[^>]*\?>\s*/g, '')
    .replace(/<!DOCTYPE[^>]*>\s*/g, '')
    .replace(/\s+id="[^"]*figma[^"]*"/gi, '')
    .trim();
}


async function exportSvgs(fileKey, assets, snippetsDir) {
  const svgs = assets.svgs || [];
  if (svgs.length === 0) {
    log('No SVG assets — skipping SVG export');
    return { created: [], failed: [] };
  }

  log(`${svgs.length} SVG(s) to export`);
  await mkdir(snippetsDir, { recursive: true });

  const nodeIds = svgs.map((s) => s.nodeId).join(',');
  const svgResponse = await figmaGet(
    `/v1/images/${fileKey}?ids=${encodeURIComponent(nodeIds)}&format=svg`
  );
  if (!svgResponse || typeof svgResponse.images !== 'object' || svgResponse.images === null) {
    throw new Error(
      'Figma API returned unexpected structure for SVG export (missing "images" object).'
    );
  }
  const svgUrls = svgResponse.images;

  const created = [];
  const failed = [];

  for (const svgAsset of svgs) {
    const exportUrl = svgUrls?.[svgAsset.nodeId];

    if (!exportUrl) {
      log(`✗ No export URL for "${svgAsset.name}" (${svgAsset.nodeId})`);
      svgAsset.status = 'FAILED';
      svgAsset.error = 'No export URL returned by Figma';
      failed.push(svgAsset.name);
      continue;
    }

    try {
      log(`Downloading ${svgAsset.name}...`);
      const rawSvg = await downloadText(exportUrl);
      const cleanedSvg = cleanSvg(rawSvg);

      const snippetName = svgAsset.snippetName;
      const snippetFile = path.join(snippetsDir, `${snippetName}.liquid`);

      const alreadyExists = await access(snippetFile).then(() => true).catch(() => false);
      if (alreadyExists) {
        log(`⚠ Snippet already exists — skipping ${snippetName}.liquid`);
        svgAsset.status = 'SKIPPED_EXISTS';
        svgAsset.snippetPath = `snippets/${snippetName}.liquid`;
        created.push({ name: svgAsset.name, snippetName, path: svgAsset.snippetPath, skipped: true });
        continue;
      }

      if (!cleanedSvg.includes('<svg')) {
        throw new Error(`Downloaded content for "${svgAsset.name}" is not valid SVG (no <svg> tag).`);
      }

      await writeFile(snippetFile, cleanedSvg);

      svgAsset.snippetPath = `snippets/${snippetName}.liquid`;
      svgAsset.status = 'SNIPPET_CREATED';
      created.push({ name: svgAsset.name, snippetName, path: svgAsset.snippetPath });
      log(`✅ snippets/${snippetName}.liquid`);
    } catch (err) {
      log(`✗ Failed "${svgAsset.name}": ${err.message}`);
      svgAsset.status = 'FAILED';
      svgAsset.error = err.message;
      failed.push(svgAsset.name);
    }
  }

  return { created, failed };
}


async function downloadImages(assets, assetsDir) {
  const images = (assets.images || []).filter((a) => a.cdnUrl);
  const noSource = (assets.images || []).filter((a) => !a.cdnUrl);

  if (noSource.length > 0) {
    for (const img of noSource) {
      log(`⚠ No source URL for "${img.name}" (${img.nodeId}) — image fill not found in figma-images.json`);
      img.status = 'FAILED';
      img.error = 'No source URL — imageRef not found in figma-images.json';
    }
  }

  if (images.length === 0) {
    log('No downloadable image assets');
    return { downloaded: [], failed: noSource.map((a) => a.name) };
  }

  log(`${images.length} image(s) to download from source`);
  await mkdir(assetsDir, { recursive: true });

  const downloaded = [];
  const failed = noSource.map((a) => a.name);

  for (const imgAsset of images) {
    try {
      // Detect extension from CDN URL content-type, default to png
      const filename = `${imgAsset.name}.png`;
      const localPath = path.join(assetsDir, filename);

      log(`Downloading ${imgAsset.name}...`);
      await downloadBinary(imgAsset.cdnUrl, localPath);

      imgAsset.localPath = path.relative(process.cwd(), localPath);
      imgAsset.filename = filename;
      imgAsset.status = 'DOWNLOADED';
      downloaded.push({ name: imgAsset.name, filename, localPath: imgAsset.localPath });
      log(`✅ ${filename}`);
    } catch (err) {
      log(`✗ Failed "${imgAsset.name}": ${err.message}`);
      imgAsset.status = 'FAILED';
      imgAsset.error = err.message;
      failed.push(imgAsset.name);
    }
  }

  return { downloaded, failed };
}


async function main() {
  if (!FIGMA_TOKEN) {
    console.error('[export-assets] FIGMA_TOKEN not set');
    process.exit(1);
  }

  const { fileKey, feature, themePath } = parseArgs();
  const base = path.resolve(`.buildspace/artifacts/${feature}`);
  const snippetsDir = path.resolve(path.join(themePath, 'snippets'));
  const assetsDir = path.join(base, 'assets');

  const assetsRaw = await readFile(path.join(base, 'figma-assets.json'), 'utf-8').catch(() => {
    throw new Error('figma-assets.json not found. Run parse-figma.js first.');
  });
  let assets;
  try {
    assets = JSON.parse(assetsRaw);
  } catch (err) {
    throw new Error(`figma-assets.json is not valid JSON: ${err.message}. Re-run parse-figma.js.`);
  }

  const svgResult = await exportSvgs(fileKey, assets, snippetsDir);
  const imgResult = await downloadImages(assets, assetsDir);

  await writeFile(path.join(base, 'figma-assets.json'), JSON.stringify(assets, null, 2));
  log('Updated figma-assets.json with export results');

  const summary = {
    feature,
    svgs: { created: svgResult.created.length, failed: svgResult.failed.length },
    images: { downloaded: imgResult.downloaded.length, failed: imgResult.failed.length },
  };

  log(`Done. SVGs: ${svgResult.created.length} created, ${svgResult.failed.length} failed. Images: ${imgResult.downloaded.length} downloaded, ${imgResult.failed.length} failed.`);
  console.log(JSON.stringify(summary));
}

main().catch((err) => {
  console.error(`[export-assets] Fatal: ${err.message}`);
  process.exit(1);
});
