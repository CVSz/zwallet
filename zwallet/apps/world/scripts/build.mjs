import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const distDir = resolve(root, 'dist');
const srcDir = resolve(root, 'src');

await rm(distDir, { recursive: true, force: true });
await mkdir(resolve(distDir, 'src'), { recursive: true });

await cp(resolve(root, 'index.html'), resolve(distDir, 'index.html'));
await cp(resolve(srcDir, 'main.js'), resolve(distDir, 'src', 'main.js'));
await cp(resolve(srcDir, 'styles.css'), resolve(distDir, 'src', 'styles.css'));

console.log(`Built @zwallet/world to ${distDir}`);
