import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/ui-v0351.css", import.meta.url), "utf8");
const manager = await readFile(new URL("../app/project-snes-manager.tsx", import.meta.url), "utf8");
const pagesEntry = await readFile(new URL("../github-pages/main.tsx", import.meta.url), "utf8");
const appLayout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("0.3.5.1 identity is exposed in the mobile header", () => {
  assert.match(css, /content:\s*"v0\.3\.5\.1"/);
  assert.match(manager, /badge\.textContent = "v0\.3\.5\.1"/);
  assert.match(manager, /data-project-version="0\.3\.5\.1"/);
});

test("both application entrypoints load the 0.3.5.1 hotfix after 0.3.5", () => {
  assert.ok(pagesEntry.indexOf("ui-v035.css") < pagesEntry.indexOf("ui-v0351.css"));
  assert.ok(appLayout.indexOf("ui-v035.css") < appLayout.indexOf("ui-v0351.css"));
});

test("phone cards keep image small and comparison dense", () => {
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*\.search-result[\s\S]*64px minmax\(0, 1fr\)/);
  assert.match(css, /\.offer-image[\s\S]*width:\s*64px[\s\S]*height:\s*64px/);
  assert.match(css, /\.offer-comparison[\s\S]*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.offer-comparison > div:last-child[\s\S]*grid-column:\s*auto/);
});

test("phone action buttons cannot inherit the old vertical 120px flex basis", () => {
  assert.match(css, /\.offer-actions[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.offer-actions > \*[\s\S]*min-height:\s*36px[\s\S]*height:\s*36px[\s\S]*flex:\s*none/);
});

test("listing description stays hidden and reason is clamped to one phone line", () => {
  assert.match(css, /\.offer-description\s*\{\s*display:\s*none !important/);
  assert.match(css, /\.offer-reason[\s\S]*-webkit-line-clamp:\s*1/);
});
