import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manager = await readFile(new URL("../app/project-snes-manager.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/ui-v0352.css", import.meta.url), "utf8");
const pagesEntry = await readFile(new URL("../github-pages/main.tsx", import.meta.url), "utf8");
const appLayout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const storage = await readFile(new URL("../app/search-storage.ts", import.meta.url), "utf8");
const evaluation = await readFile(new URL("../app/search-evaluation.ts", import.meta.url), "utf8");

test("0.3.5.2 identity is exposed in both application builds", () => {
  assert.match(manager, /badge\.textContent = "v0\.3\.5\.2"/);
  assert.match(manager, /data-project-version="0\.3\.5\.2"/);
  assert.match(css, /content:\s*"v0\.3\.5\.2"/);
  assert.ok(pagesEntry.indexOf("ui-v0351.css") < pagesEntry.indexOf("ui-v0352.css"));
  assert.ok(appLayout.indexOf("ui-v0351.css") < appLayout.indexOf("ui-v0352.css"));
});

test("0.3.5.2 starts a fresh search cache after changing price semantics", () => {
  assert.match(storage, /snes-pal-sammlung-search-v0352/);
  assert.match(storage, /snes-pal-kleinanzeigen-search-v0352/);
});

test("condition-aware pricing keeps unclear listings on module guide values", () => {
  assert.match(evaluation, /module_manual/);
  assert.match(evaluation, /module_box/);
  assert.match(evaluation, /Unklar · Modul-Richtwert/);
  assert.match(evaluation, /Zustand unklar · Modul-Richtwert verwendet/);
  assert.match(evaluation, /conditionReferenceForGame/);
});
