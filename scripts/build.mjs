import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const distSrc = path.join(dist, 'src');

await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(distSrc, { recursive: true });

const staticFiles = ['index.html', 'styles.css', 'icon.svg', 'manifest.webmanifest'];
for (const file of staticFiles) {
  await fs.copyFile(path.join(root, file), path.join(dist, file));
}

const srcFiles = await fs.readdir(path.join(root, 'src'));
for (const file of srcFiles) {
  if (file.endsWith('.js')) {
    await fs.copyFile(path.join(root, 'src', file), path.join(distSrc, file));
  }
}

await fs.writeFile(path.join(dist, '_redirects'), '/*  /index.html  200\n', 'utf8');
console.log(`Built LifeQuest static assets into ${dist} (${srcFiles.filter((f) => f.endsWith('.js')).length} JS modules)`);
