"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const pages = [
  "index.html", "pv-rechner/index.html", "stromspeicher/index.html",
  "solaranlage-kosten/index.html", "photovoltaik-vergleich/index.html",
  "waermepumpe/index.html", "solar-foerderung/index.html", "ratgeber/index.html",
  "solaranlage-heidelberg/index.html", "photovoltaik-mannheim/index.html",
  "solaranlage-schwetzingen/index.html", "pv-anlage-karlsruhe/index.html"
];

test("every public page has one nonempty, unique SEO title", () => {
  const titles = new Map();
  for (const file of pages) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    const matches = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/gi)];
    assert.equal(matches.length, 1, file + ": expected exactly one title");
    const title = matches[0][1].replace(/\s+/g, " ").trim();
    assert.ok(title.length >= 12, file + ": title is empty or unhelpfully short");
    assert.ok(!titles.has(title.toLocaleLowerCase("de")), file + ": duplicate title with " + titles.get(title.toLocaleLowerCase("de")));
    titles.set(title.toLocaleLowerCase("de"), file);
  }
});
