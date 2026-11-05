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

test("public pages have meaningful, distinct SEO titles and descriptions", () => {
  const titles = new Set();
  const descriptions = new Set();
  for (const file of pages) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
    const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1]?.trim();
    assert.ok(title && title.length >= 15, file + ": missing or short title");
    assert.ok(description && description.length >= 50, file + ": missing or short description");
    assert.ok(!titles.has(title), file + ": duplicate title");
    assert.ok(!descriptions.has(description), file + ": duplicate description");
    titles.add(title);
    descriptions.add(description);
  }
});
