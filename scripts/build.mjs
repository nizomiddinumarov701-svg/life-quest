import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const srcRoot = path.join(root, 'src');

async function collectJsFiles(dir, prefix = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectJsFiles(full, rel)));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(rel);
    }
  }
  return files.sort();
}

const staticFiles = ['index.html', 'styles.css', 'icon.svg', 'manifest.webmanifest', '.nojekyll'];
const jsRelFiles = await collectJsFiles(srcRoot);

// Compute a deterministic short content hash across all app files to eliminate ES module cache skew
const hash = crypto.createHash('sha256');
for (const file of staticFiles) {
  const buf = await fs.readFile(path.join(root, file));
  hash.update(file);
  hash.update(buf);
}
for (const rel of jsRelFiles) {
  const buf = await fs.readFile(path.join(srcRoot, rel));
  hash.update(`src/${rel}`);
  hash.update(buf);
}
const buildHash = hash.digest('hex').slice(0, 10);

await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(path.join(dist, 'src'), { recursive: true });

// Copy non-HTML static assets
for (const file of ['styles.css', 'icon.svg', 'manifest.webmanifest', '.nojekyll']) {
  await fs.copyFile(path.join(root, file), path.join(dist, file));
}

// Stamp ?v=<buildHash> onto CSS and JS entry points in dist/index.html
const rawHtml = await fs.readFile(path.join(root, 'index.html'), 'utf8');
const builtHtml = rawHtml
  .replace('href="./styles.css"', `href="./styles.css?v=${buildHash}"`)
  .replace('src="./src/app.js"', `src="./src/app.js?v=${buildHash}"`);
await fs.writeFile(path.join(dist, 'index.html'), builtHtml, 'utf8');

// Recursively copy src/**/*.js and version-stamp relative ES module imports
const importPattern = /((?:from|import)\s+['"])(\.\.?\/[^'"]+?\.js)(['"])/g;
for (const rel of jsRelFiles) {
  const srcPath = path.join(srcRoot, rel);
  const destPath = path.join(dist, 'src', rel);
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  const code = await fs.readFile(srcPath, 'utf8');
  const stamped = code.replace(importPattern, `$1$2?v=${buildHash}$3`);
  await fs.writeFile(destPath, stamped, 'utf8');
}

// Stamp buildHash and exact versioned APP_SHELL_ASSETS list into dist/sw.js
const rawSw = await fs.readFile(path.join(root, 'sw.js'), 'utf8');
const versionedAssets = [
  './',
  './index.html',
  `./styles.css?v=${buildHash}`,
  './icon.svg',
  './manifest.webmanifest',
  ...jsRelFiles.map((rel) => `./src/${rel}?v=${buildHash}`),
];
const assetBlock = `const APP_SHELL_ASSETS = [\n${versionedAssets.map((a) => `  '${a}',`).join('\n')}\n];`;
const builtSw = rawSw
  .replaceAll('__BUILD_HASH__', buildHash)
  .replace(/const APP_SHELL_ASSETS = \[[\s\S]*?\];/, assetBlock);
await fs.writeFile(path.join(dist, 'sw.js'), builtSw, 'utf8');

console.log(`Built LifeQuest dist/ (v=${buildHash}, ${jsRelFiles.length} JS modules + offline sw.js)`);
