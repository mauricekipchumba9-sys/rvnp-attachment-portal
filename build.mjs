import { mkdir, copyFile } from 'node:fs/promises';

await mkdir('netlify/functions', { recursive: true });
await copyFile('api.mjs', 'netlify/functions/api.mjs');
console.log('Netlify function prepared from root api.mjs');
