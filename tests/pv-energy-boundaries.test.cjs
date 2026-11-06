"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { calculatePvEstimate } = require("../assets/js/main.js");

test("PV energy balance stays finite and conserves generation at input boundaries", () => {
  for (const roof of [20, 70, 1000]) {
    for (const usage of [1000, 4200, 100000]) {
      for (const storage of ["yes", "no"]) {
        for (const orientation of ["south", "eastwest", "north"]) {
          for (const shading of ["low", "medium", "high"]) {
            const result = calculatePvEstimate({
              roof, usage, people: 4, price: 0.25, tariff: 0.077,
              storage, orientation, shading, houseType: "single", zip: "68723"
            });
            assert.equal(result.error, undefined, JSON.stringify({roof, usage, storage, orientation, shading}));
            for (const key of ["annualGeneration", "directOrStored", "feedInKwh", "storageLoss", "autonomyPercent"]) {
              assert.ok(Number.isFinite(result[key]) && result[key] >= 0, key);
            }
            assert.ok(result.directOrStored <= usage + 1e-8);
            assert.ok(result.pvKwp <= result.roofMaxKwp + 1e-8);
            assert.ok(Math.abs(result.annualGeneration - result.directOrStored - result.feedInKwh - result.storageLoss) < 1e-7);
            assert.ok(result.autonomyPercent <= (storage === "yes" ? 70 : 35) + 1e-8);
          }
        }
      }
    }
  }
});
