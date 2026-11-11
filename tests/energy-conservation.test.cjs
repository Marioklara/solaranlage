"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { calculatePvEstimate } = require("../assets/js/main.js");

// Regression: annual generation must be accounted for, even at input boundaries.
test("PV energy balance is conserved across roof, shading and battery scenarios", () => {
  for (const roof of [20, 70, 1000]) {
    for (const shading of ["low", "medium", "high"]) {
      for (const battery of [false, true]) {
        const result = calculatePvEstimate({
          roof, usage: 4200, people: 4, price: 0.25,
          tariff: 0.077, storage: battery, houseType: "single",
          orientation: "south", shading, zip: "68723"
        });
        assert.equal(result.error, undefined);
        const components = result.directOrStored + result.feedInKwh + result.storageLoss;
        assert.ok(Math.abs(result.annualGeneration - components) < 1e-7,
          `Energy mismatch for roof=${roof}, shading=${shading}, battery=${battery}`);
        assert.ok(result.feedInKwh >= 0 && result.storageLoss >= 0);
        assert.ok(result.directOrStored <= 4200);
        if (!battery) assert.equal(result.storageLoss, 0);
      }
    }
  }
});
