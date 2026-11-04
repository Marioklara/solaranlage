"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { calculatePvEstimate } = require("../assets/js/main.js");

// Synthetic scenarios only; these are consistency checks, not yield forecasts.
test("PV scenarios conserve annual energy and respect household consumption", () => {
  for (const roof of [20, 70, 250, 1000]) {
    for (const usage of [1000, 4200, 100000]) {
      for (const storage of [true, false]) {
        const r = calculatePvEstimate({roof, usage, people: 4, price: 0.25,
          tariff: 0.077, storage, houseType: "single", orientation: "south", shading: "low"});
        assert.equal(r.error, undefined);
        assert.ok(r.directOrStored >= 0 && r.directOrStored <= usage);
        assert.ok(r.feedInKwh >= 0 && r.storageLoss >= 0);
        assert.ok(Math.abs(r.annualGeneration - r.directOrStored - r.feedInKwh - r.storageLoss) < 1e-6);
        assert.ok(r.pvKwp <= r.roofMaxKwp);
        assert.ok(Math.abs(r.yearlyNetBenefit - (r.savedGridCost + r.feedInRevenue - r.operatingCost)) < 1e-6);
      }
    }
  }
});
