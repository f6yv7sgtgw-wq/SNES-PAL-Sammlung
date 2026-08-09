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

assert.match(indexHtml, /<title>Projekt SNES · v0\.3\.4<\/title>/);
assert.match(corpus, /Projekt SNES/);
assert.match(corpus, /snes-pal-sammlung-baseline-0\.3\.4/);
assert.match(corpus, /v0\.3\.4/);
assert.match(corpus, /SNES_GAMES\.xlsx/);

console.log("Validated GitHub Pages artifact: Project SNES v0.3.4 and embedded collection bootstrap are present.");
