import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/ui-v035.css", import.meta.url), "utf8");
const pagesEntry = await readFile(new URL("../github-pages/main.tsx", import.meta.url), "utf8");

test("0.3.5 base UI identity remains present", () => {
  assert.match(css, /content:\s*"Projekt SNES"/);
  assert.match(css, /content:\s*"v0\.3\.5"/);
});

test("mobile cards explicitly allow shrinkage and prevent horizontal overflow", () => {
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /-webkit-text-size-adjust:\s*100%/);
  assert.match(css, /\.value-list > div[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*\.value-list > div[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(css, /\.stat-card strong[\s\S]*overflow-wrap:\s*anywhere/);
});

test("search cards retain the 0.3.5 compact GenericParser media base", () => {
  assert.match(css, /\.search-result[\s\S]*grid-template-columns:\s*92px minmax\(0, 1fr\)/);
  assert.match(css, /\.offer-image[\s\S]*width:\s*92px[\s\S]*height:\s*92px/);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*\.search-result[\s\S]*70px minmax\(0, 1fr\)/);
  assert.match(css, /\.offer-description\s*\{\s*display:\s*none !important/);
});

test("GitHub Pages keeps the 0.3.5 base stylesheet before later hotfix layers", () => {
  assert.match(pagesEntry, /ui-v035\.css/);
});
