import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manager = await readFile(new URL("../app/project-snes-manager.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/ui-v0353.css", import.meta.url), "utf8");
const pagesEntry = await readFile(new URL("../github-pages/main.tsx", import.meta.url), "utf8");
const appLayout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const storage = await readFile(new URL("../app/search-storage.ts", import.meta.url), "utf8");
const evaluation = await readFile(new URL("../app/search-evaluation.ts", import.meta.url), "utf8");
const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");

test("0.3.5.3 identity is exposed in both application builds", () => {
  assert.match(manager, /badge\.textContent = "v0\.3\.5\.3"/);
  assert.match(manager, /data-project-version="0\.3\.5\.3"/);
  assert.match(css, /content:\s*"v0\.3\.5\.3"/);
  assert.ok(pagesEntry.indexOf("ui-v0352.css") < pagesEntry.indexOf("ui-v0353.css"));
  assert.ok(appLayout.indexOf("ui-v0352.css") < appLayout.indexOf("ui-v0353.css"));
});

test("0.3.5.3 starts a fresh search cache after accessory filtering changes", () => {
  assert.match(storage, /snes-pal-sammlung-search-v0353/);
  assert.match(storage, /snes-pal-kleinanzeigen-search-v0353/);
});

test("accessory-only listings are filtered before condition pricing", () => {
  assert.match(evaluation, /accessoryOnlyReason/);
  assert.match(evaluation, /Nur Anleitung ohne Spiel\/Modul/);
  assert.match(evaluation, /Nur Verpackung ohne Spiel\/Modul/);
  assert.match(evaluation, /return \{ kind: "ignored", reason: "irrelevant" \}/);
  assert.match(evaluation, /Unklar · Modul-Richtwert/);
});

test("0.3.5.3 regression suite is part of npm test", () => {
  assert.match(packageJson, /search-condition-v0353\.test\.ts/);
});
