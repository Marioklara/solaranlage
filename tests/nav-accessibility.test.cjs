"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const pages = ["index.html", "pv-rechner", "stromspeicher", "solaranlage-kosten", "photovoltaik-vergleich", "waermepumpe", "solar-foerderung", "ratgeber", "solaranlage-heidelberg", "photovoltaik-mannheim", "solaranlage-schwetzingen", "pv-anlage-karlsruhe"];

test("mobile navigation buttons identify the controlled menu on every page", () => {
  for (const page of pages) {
    const file = page.endsWith(".html") ? page : path.join(page, "index.html");
    const html = fs.readFileSync(path.join(root, file), "utf8");
    const button = html.match(/<button\b[^>]*class="nav-toggle"[^>]*>/);
    assert.ok(button, file + ": missing navigation button");
    assert.match(button[0], /\baria-controls="nav-main"/, file + ": missing menu association");
    assert.match(button[0], /\baria-expanded="false"/, file + ": incorrect initial state");
    assert.match(button[0], /\baria-label="[^"]+"/, file + ": missing accessible name");
    assert.match(html, /\bid="nav-main"/, file + ": missing controlled menu");
  }
});
