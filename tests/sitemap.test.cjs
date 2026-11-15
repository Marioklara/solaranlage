"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const base = "https://marioklara.github.io/solaranlage/";

test("sitemap lists each public HTML canonical exactly once", () => {
  const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  const pages = ["index.html"];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory() && fs.existsSync(path.join(root, entry.name, "index.html"))) {
      pages.push(entry.name + "/index.html");
    }
  }
  const expected = pages.map(file => base + (file === "index.html" ? "" : file.slice(0, -"index.html".length)));
  assert.equal(new Set(locations).size, locations.length, "Duplicate sitemap URL");
  assert.deepEqual([...locations].sort(), [...expected].sort(), "Missing or unexpected sitemap URL");
  for (const file of pages) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    const canonical = base + (file === "index.html" ? "" : file.slice(0, -"index.html".length));
    assert.ok(html.includes('rel="canonical" href="' + canonical + '"'), file + ": canonical mismatch");
  }
});

test("robots.txt references the published sitemap", () => {
  const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");
  assert.match(robots, /^Sitemap: https:\/\/marioklara\.github\.io\/solaranlage\/sitemap\.xml$/m);
});
