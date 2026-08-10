import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
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

assert.match(indexHtml, /<title>Projekt SNES · v0\.3\.5\.3<\/title>/);
assert.match(corpus, /Projekt SNES/);
assert.match(corpus, /snes-pal-sammlung-baseline-0\.3\.4/);
assert.match(corpus, /v0\.3\.5\.3/);
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
  "Validated GitHub Pages artifact: Project SNES v0.3.5.3, accessory-only filtering, condition-aware guide values, fresh search cache and compact mobile UI are present.",
);
