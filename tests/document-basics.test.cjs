"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const pages = [
  "index.html", "pv-rechner/index.html", "stromspeicher/index.html",
  "solaranlage-kosten/index.html", "photovoltaik-vergleich/index.html",
  "waermepumpe/index.html", "solar-foerderung/index.html",
  "ratgeber/index.html", "solaranlage-heidelberg/index.html",
  "photovoltaik-mannheim/index.html", "solaranlage-schwetzingen/index.html",
  "pv-anlage-karlsruhe/index.html"
];

test("every published page declares German and a mobile viewport", () => {
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), "utf8");
    assert.match(html, /<html\s+lang="de"\s*>/i, page + ": missing German document language");
    assert.match(html, /<meta\s+name="viewport"\s+content="width=device-width, initial-scale=1\.0"\s*\/>/i,
      page + ": missing responsive viewport");
  }
});
