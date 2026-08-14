import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("github-pages-dist");

async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(full)));
    else if (/\.(?:html|js|css)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const indexHtml = await readFile(path.join(root, "index.html"), "utf8");
const files = await collect(root);
const corpus = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");

assert.match(indexHtml, /<title>SNES Collect · v1\.0\.0<\/title>/);
assert.match(indexHtml, /rel="manifest" href="\/SNES-PAL-Sammlung\/manifest\.webmanifest"/);
assert.match(indexHtml, /rel="apple-touch-icon" href="\/SNES-PAL-Sammlung\/icons\/icon-180\.png"/);
assert.match(indexHtml, /apple-mobile-web-app-title" content="SNES Collect"/);
assert.match(indexHtml, /serviceWorker\.register\("\/SNES-PAL-Sammlung\/sw\.js"\)/);

const manifest = JSON.parse(await readFile(path.join(root, "manifest.webmanifest"), "utf8"));
assert.equal(manifest.name, "SNES Collect");
assert.equal(manifest.display, "standalone");
for (const icon of manifest.icons) {
  await access(path.join(root, icon.src));
}

const serviceWorker = await readFile(path.join(root, "sw.js"), "utf8");
assert.match(serviceWorker, /snes-collect-1\.0\.0/);

assert.match(corpus, /SNES Collect/);
assert.match(corpus, /snes-pal-sammlung-baseline-0\.3\.4/);
assert.match(corpus, /v1\.0\.0/);
assert.match(corpus, /SNES_GAMES\.xlsx/);
assert.match(corpus, /offer-description/);
assert.match(corpus, /-webkit-text-size-adjust:\s*100%/);
assert.match(corpus, /height:\s*36px/);
assert.match(corpus, /Modul \+ Anleitung/);
assert.match(corpus, /Modul \+ Box/);
assert.match(corpus, /Unklar · Modul-Richtwert/);
assert.match(corpus, /Nur Anleitung ohne Spiel\/Modul/);
assert.match(corpus, /Nur Verpackung ohne Spiel\/Modul/);
assert.match(corpus, /snes-pal-sammlung-search-v0353/);

console.log(
  "Validated GitHub Pages artifact: SNES Collect v1.0.0 with installable PWA (manifest, icons, service worker), accessory-only filtering, condition-aware guide values and compact mobile UI are present.",
);
