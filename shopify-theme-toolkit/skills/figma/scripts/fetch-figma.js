'use strict';

const { writeFile, mkdir } = require('node:fs/promises');
const path = require('node:path');

const FIGMA_API = 'https://api.figma.com';
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;

const TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function log(msg) {
  console.error(`[fetch-figma] ${msg}`);
}


function parseArgs() {
  const [fileKey, feature, desktop, mobile] = process.argv.slice(2);

  if (!fileKey || !feature || !desktop) {
    console.error(
      'Usage: FIGMA_TOKEN=figd_... node fetch-figma.js <fileKey> <feature> <desktopNodeId> [mobileNodeId|-]'
    );
    process.exit(1);
  }

  return {
    fileKey,
    feature,
    desktopNodeId: desktop.replace(/-/g, ':'),
    mobileNodeId: mobile && mobile !== '-' ? mobile.replace(/-/g, ':') : null,
  };
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
      if (err.name === 'AbortError') {
        throw new Error(
          `Figma API request timed out after ${TIMEOUT_MS / 1000}s.\n` +
          `Check your network connection and try again.`
        );
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
        const retryAfter = parseInt(res.headers.get('retry-after') || '10', 10);
        log(`Rate limited (429) — waiting ${retryAfter}s before retry ${attempt + 1}/${MAX_RETRIES}...`);
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }
      throw new Error('Figma API rate limit exceeded (429). Wait a few minutes and try again.');
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (res.status === 403) {
        throw new Error(
          `Figma API 403 — access denied.\n` +
          `• Verify FIGMA_TOKEN starts with "figd_" and has not expired.\n` +
          `• Ensure the token has "Read" access to this file.\n` +
          `• If the file is team-owned, ensure the token owner is a team member.`
        );
      }
      if (res.status === 404) {
        throw new Error(
          `Figma API 404 — not found: ${endpoint}\n` +
          `• Verify the file key from the URL: figma.com/design/{fileKey}/...\n` +
          `• Verify the node ID (convert dashes to colons: "110-363" → "110:363").`
        );
      }
      throw new Error(`Figma API ${res.status} on ${endpoint}: ${body}`);
    }

    return res.json();
  }
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


async function main() {
  if (!FIGMA_TOKEN) {
    console.error('[fetch-figma] FIGMA_TOKEN not set. Add it to .env and source it before running.');
    process.exit(1);
  }

  const { fileKey, feature, desktopNodeId, mobileNodeId } = parseArgs();

  const artifactDir = path.resolve(`.buildspace/artifacts/${feature}`);
  const screenshotsDir = path.join(artifactDir, 'screenshots');
  const assetsDir = path.join(artifactDir, 'assets');

  await mkdir(artifactDir, { recursive: true });
  await mkdir(screenshotsDir, { recursive: true });
  await mkdir(assetsDir, { recursive: true });

  const nodeIds = mobileNodeId
    ? `${desktopNodeId},${mobileNodeId}`
    : desktopNodeId;

  const nodesResponse = await figmaGet(
    `/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeIds)}`
  );
  if (!nodesResponse || typeof nodesResponse.nodes !== 'object') {
    throw new Error(
      'Figma API returned unexpected structure for /nodes endpoint. ' +
      'Verify the file key is correct and the file is accessible.'
    );
  }
  const nodes = nodesResponse.nodes;

  const desktopNode = nodes[desktopNodeId];
  if (!desktopNode) {
    const availableIds = Object.keys(nodes).slice(0, 5).join(', ');
    throw new Error(
      `Desktop node "${desktopNodeId}" not found in file "${fileKey}".\n` +
      `Available node IDs in response: ${availableIds || 'none'}.\n` +
      `Tip: In Figma URLs, dashes become colons — "110-363" → "110:363".`
    );
  }
  if (!desktopNode.document) {
    throw new Error(
      `Node "${desktopNodeId}" returned no document data. ` +
      `Ensure you are selecting a Frame (section) in Figma, not a text or shape layer.`
    );
  }

  await writeFile(
    path.join(artifactDir, 'figma-full.json'),
    JSON.stringify(desktopNode, null, 2)
  );
  log('Saved figma-full.json');

  let mobileWidth = 390;
  if (mobileNodeId) {
    const mobileNode = nodes[mobileNodeId];
    if (!mobileNode) {
      log(`Warning: mobile node "${mobileNodeId}" not found — skipping mobile`);
    } else {
      await writeFile(
        path.join(artifactDir, 'figma-full-mobile.json'),
        JSON.stringify(mobileNode, null, 2)
      );
      log('Saved figma-full-mobile.json');

      const box = mobileNode?.document?.absoluteBoundingBox;
      if (box?.width) mobileWidth = Math.round(box.width);
    }
  }

  const sectionsData = {
    feature,
    fileKey,
    desktopNodeId,
    mobileNodeId: mobileNodeId || null,
    mobileWidth,
  };
  await writeFile(
    path.join(artifactDir, 'figma-sections.json'),
    JSON.stringify(sectionsData, null, 2)
  );
  log('Saved figma-sections.json');

  const screenshotResponse = await figmaGet(
    `/v1/images/${fileKey}?ids=${encodeURIComponent(nodeIds)}&format=png&scale=2`
  );
  if (!screenshotResponse || typeof screenshotResponse.images !== 'object') {
    log('Warning: screenshot API returned unexpected structure — skipping screenshots');
  }
  const screenshotUrls = screenshotResponse?.images || {};

  const desktopShotUrl = screenshotUrls[desktopNodeId];
  if (desktopShotUrl) {
    log('Downloading figma-desktop.png...');
    await downloadBinary(desktopShotUrl, path.join(screenshotsDir, 'figma-desktop.png'));
    log('Saved screenshots/figma-desktop.png');
  } else {
    log('Warning: no desktop screenshot URL returned');
  }

  if (mobileNodeId) {
    const mobileShotUrl = screenshotUrls[mobileNodeId];
    if (mobileShotUrl) {
      log('Downloading figma-mobile.png...');
      await downloadBinary(mobileShotUrl, path.join(screenshotsDir, 'figma-mobile.png'));
      log('Saved screenshots/figma-mobile.png');
    }
  }

  const imagesResponse = await figmaGet(`/v1/files/${fileKey}/images`);
  await writeFile(
    path.join(artifactDir, 'figma-images.json'),
    JSON.stringify(imagesResponse, null, 2)
  );
  log('Saved figma-images.json');

  const summary = {
    feature,
    fileKey,
    desktopNodeId,
    mobileNodeId: mobileNodeId || null,
    mobileWidth,
    files: [
      'figma-full.json',
      mobileNodeId ? 'figma-full-mobile.json' : null,
      'figma-sections.json',
      'figma-images.json',
      'screenshots/figma-desktop.png',
      mobileNodeId ? 'screenshots/figma-mobile.png' : null,
    ].filter(Boolean),
  };

  log('All done. Next step: run parse-figma.js');
  console.log(JSON.stringify(summary));
}

main().catch((err) => {
  console.error(`[fetch-figma] Fatal: ${err.message}`);
  process.exit(1);
});
