import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const site = path.join(root, 'site');
const functions = path.join(root, 'netlify', 'functions');

fs.rmSync(site, { recursive: true, force: true });
fs.rmSync(path.join(root, 'netlify'), { recursive: true, force: true });
fs.mkdirSync(site, { recursive: true });
fs.mkdirSync(functions, { recursive: true });

const excluded = new Set([
  'api.mjs',
  'build.mjs',
  'netlify.toml',
  'package.json',
  'package-lock.json',
  'node_modules',
  'site',
  'netlify'
]);

for (const name of fs.readdirSync(root)) {
  if (excluded.has(name)) continue;
  fs.cpSync(path.join(root, name), path.join(site, name), { recursive: true });
}

fs.copyFileSync(path.join(root, 'api.mjs'), path.join(functions, 'api.mjs'));
console.log('RVNP portal build complete. Static files -> site/, API -> netlify/functions/api.mjs');
