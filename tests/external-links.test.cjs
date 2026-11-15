"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const pages = [
  "index.html", "pv-rechner/index.html", "stromspeicher/index.html",
  "solaranlage-kosten/index.html", "photovoltaik-vergleich/index.html",
  "waermepumpe/index.html", "solar-foerderung/index.html",
  "ratgeber/index.html", "solaranlage-heidelberg/index.html",
  "photovoltaik-mannheim/index.html", "solaranlage-schwetzingen/index.html",
  "pv-anlage-karlsruhe/index.html"
];

test("external links opening a new tab cannot access the originating page", () => {
  for (const file of pages) {
    const html = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
    for (const [tag] of html.matchAll(/<a\b[^>]*>/gi)) {
      if (!/\btarget\s*=\s*["']_blank["']/i.test(tag)) continue;
      assert.match(tag, /\brel\s*=\s*["'][^"']*\bnoopener\b[^"']*["']/i,
        file + ": external new-tab link must set rel=noopener: " + tag);
    }
  }
});
