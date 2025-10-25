#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.resolve(rootDir, 'assets');
const manifestPath = path.resolve(assetsDir, 'images.json');

const VALID_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);

async function ensureAssetsDir() {
  try {
    const stats = await fs.stat(assetsDir);
    if (!stats.isDirectory()) {
      throw new Error(`Expected directory at ${assetsDir}`);
    }
  } catch (error) {
    throw new Error(`Unable to access assets directory: ${error.message}`);
  }
}

async function collectImages() {
  const entries = await fs.readdir(assetsDir, { withFileTypes: true });
  const images = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!VALID_EXTENSIONS.has(ext)) continue;
    images.push(`assets/${entry.name}`);
  }

  return images.sort((a, b) => a.localeCompare(b, 'en'));
}

async function writeManifest(images) {
  const payload = `${JSON.stringify(images, null, 2)}\n`;
  await fs.writeFile(manifestPath, payload, 'utf8');
}

async function main() {
  await ensureAssetsDir();
  const images = await collectImages();
  await writeManifest(images);
  console.log(`Wrote ${images.length} background ${images.length === 1 ? 'image' : 'images'} to ${path.relative(rootDir, manifestPath)}`);
}

main().catch((error) => {
  console.error('Failed to generate images manifest:', error);
  process.exitCode = 1;
});

