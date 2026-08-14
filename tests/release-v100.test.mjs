import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const manager = await readFile(new URL("../app/project-snes-manager.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/ui-v100.css", import.meta.url), "utf8");
const pagesEntry = await readFile(new URL("../github-pages/main.tsx", import.meta.url), "utf8");
const pagesHtml = await readFile(new URL("../github-pages/index.html", import.meta.url), "utf8");
const appLayout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const storage = await readFile(new URL("../app/search-storage.ts", import.meta.url), "utf8");
const evaluation = await readFile(new URL("../app/search-evaluation.ts", import.meta.url), "utf8");
const manifest = JSON.parse(
  await readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
);
const serviceWorker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
const versionJson = JSON.parse(await readFile(new URL("../VERSION.json", import.meta.url), "utf8"));
const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");

test("1.0.0 identity is exposed in both application builds", () => {
  assert.match(manager, /heading\.textContent = "SNES Collect"/);
  assert.match(manager, /badge\.textContent = "v1\.0\.0"/);
  assert.match(manager, /data-project-version="1\.0\.0"/);
  assert.match(css, /content:\s*"SNES Collect"/);
  assert.match(css, /content:\s*"v1\.0\.0"/);
  assert.ok(pagesEntry.indexOf("ui-v0353.css") < pagesEntry.indexOf("ui-v100.css"));
  assert.ok(appLayout.indexOf("ui-v0353.css") < appLayout.indexOf("ui-v100.css"));
  assert.equal(versionJson.product, "SNES Collect");
  assert.equal(versionJson.version, "1.0.0");
});

test("1.0.0 ships an installable PWA on GitHub Pages", async () => {
  assert.equal(manifest.name, "SNES Collect");
  assert.equal(manifest.short_name, "SNES Collect");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  const purposes = manifest.icons.map((icon) => icon.purpose);
  assert.ok(purposes.includes("any"));
  assert.ok(purposes.includes("maskable"));
  for (const icon of manifest.icons) {
    await access(new URL(`../public/${icon.src}`, import.meta.url));
  }
  await access(new URL("../public/icons/icon-180.png", import.meta.url));
  assert.match(serviceWorker, /snes-collect-1\.0\.0/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  assert.match(pagesHtml, /<title>SNES Collect · v1\.0\.0<\/title>/);
  assert.match(pagesHtml, /rel="manifest" href="%BASE_URL%manifest\.webmanifest"/);
  assert.match(pagesHtml, /rel="apple-touch-icon" href="%BASE_URL%icons\/icon-180\.png"/);
  assert.match(pagesHtml, /apple-mobile-web-app-title" content="SNES Collect"/);
  assert.match(pagesHtml, /serviceWorker\.register\("%BASE_URL%sw\.js"\)/);
});

test("1.0.0 keeps the 0.3.5.3 search cache and accessory filtering", () => {
  assert.match(storage, /snes-pal-sammlung-search-v0353/);
  assert.match(storage, /snes-pal-kleinanzeigen-search-v0353/);
  assert.match(evaluation, /accessoryOnlyReason/);
  assert.match(evaluation, /Nur Anleitung ohne Spiel\/Modul/);
  assert.match(evaluation, /Nur Verpackung ohne Spiel\/Modul/);
  assert.match(evaluation, /Unklar · Modul-Richtwert/);
});

test("1.0.0 regression suite is part of npm test", () => {
  assert.match(packageJson, /release-v100\.test\.mjs/);
  assert.match(packageJson, /search-condition-v0353\.test\.ts/);
});
