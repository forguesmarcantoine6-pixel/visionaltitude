import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const limit = 1_800_000;
const excluded = new Set(['.git', '.edge-check', '.agents', 'artifacts', 'node_modules']);
const extensions = /\.(?:avif|bmp|gif|ico|jpe?g|png|svg|tiff?|webp)$/i;
const images = [];

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await scan(file);
    else if (extensions.test(entry.name)) images.push({ file: path.relative(root, file), bytes: (await stat(file)).size });
  }
}

await scan(root);
const oversized = images.filter(image => image.bytes > limit);
for (const image of oversized) console.error(`${image.file}: ${image.bytes} bytes exceeds ${limit}`);
console.log(`${images.length} images checked; largest: ${Math.max(0, ...images.map(image => image.bytes))} bytes; limit: ${limit} bytes.`);
process.exitCode = oversized.length ? 1 : 0;
