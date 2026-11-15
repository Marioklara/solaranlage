"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { calculatePvEstimate } = require("../assets/js/main.js");

const baseline = {
  roof: 70, usage: 4200, people: 4, price: 0.25, tariff: 0.077,
  houseType: "single", orientation: "south", shading: "low", zip: "68723"
};

test("PV energy balance and financial outputs remain finite across valid scenarios", () => {
  for (const roof of [20, 70, 1000]) {
    for (const usage of [1000, 4200, 100000]) {
      for (const storage of [true, false]) {
        const result = calculatePvEstimate({ ...baseline, roof, usage, storage });
        assert.equal(result.error, undefined, JSON.stringify({ roof, usage, storage }));
        for (const field of ["pvKwp", "annualGeneration", "directOrStored", "feedInKwh",
          "storageLoss", "investment", "savedGridCost", "feedInRevenue",
          "operatingCost", "yearlyNetBenefit", "autonomyPercent"]) {
          assert.ok(Number.isFinite(result[field]), field + " must be finite");
        }
        assert.ok(Math.abs(result.annualGeneration -
          result.directOrStored - result.feedInKwh - result.storageLoss) < 1e-7,
          "Generation must equal self-use, feed-in and losses");
        assert.ok(result.feedInKwh >= 0 && result.storageLoss >= 0);
        assert.ok(result.directOrStored <= usage);
        assert.ok(result.autonomyPercent >= 0 && result.autonomyPercent <= (storage ? 70 : 35));
        assert.ok(result.pvKwp <= result.roofMaxKwp + 1e-9);
      }
    }
  }
});
