import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('src', 'dist', { recursive: true });
await cp('docs/MODEL.md', 'dist/MODEL.md');
// A self-contained entry works from file:// as well as static hosting. Keep
// editable ES modules in src/; only strip our known local import/export lines.
const modules = await Promise.all(['model.js', 'view.js', 'app.js'].map(name => readFile(`src/${name}`, 'utf8')));
const script = modules.map(code => code.replace(/^import .* from '\.\/[^']+';\n/gm, '').replace(/^export /gm, '')).join('\n');
const css = await readFile('src/style.css', 'utf8');
const html = (await readFile('src/index.html', 'utf8'))
  .replace('<link rel="stylesheet" href="style.css">', () => `<style>${css}</style>`)
  .replace('<script type="module" src="app.js"></script>', () => `<script type="module">${script}</script>`);
await writeFile('dist/index.html', html);
// preview.html opens from file://, which cannot import a sibling module, so it loads Three.js from the CDN.
await writeFile('preview.html', html.replace('href="MODEL.md"', 'href="docs/MODEL.md"')
  .replace("import('./vendor/three.module.min.js')", () => "import('https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.min.js')"));
console.log('Static site ready in dist/');
