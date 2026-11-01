/* PV-Angebot24: unverbindliche Orientierungsrechnung, kein Fachgutachten. */
"use strict";

const PV_ASSUMPTIONS = Object.freeze({
  yearlyKwhPerKwp: 950,
  usableRoofFraction: 0.72,
  roofSqmPerKwp: 6,
  feedInTariff: 0.077, // Beispielwert 2026, bei Inbetriebnahme prüfen.
  orientation: { south: 1, eastwest: 0.85, north: 0.65 },
  shade: { low: 1, medium: 0.85, high: 0.65 }
});

function readNumber(value) {
  if (typeof value === "string" && value.trim() === "") return NaN;
  return Number(String(value).replace(",", "."));
}

function money(value) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
}

function calculatePvEstimate(input) {
  const roof = readNumber(input.roof);
  const usage = readNumber(input.usage);
  const people = readNumber(input.people);
  const price = readNumber(input.price);
  const tariff = input.tariff === undefined ? PV_ASSUMPTIONS.feedInTariff : readNumber(input.tariff);
  const storage = input.storage === true || input.storage === "yes";
  // Unsupported storage values must not silently turn a requested battery into "no battery".
  if (![undefined, true, false, "yes", "no"].includes(input.storage)) {
    return { error: "Bitte eine gültige Auswahl zum Stromspeicher treffen." };
  }
  const houseType = input.houseType || "single";
  const orientation = input.orientation || "south";
  const shading = input.shading || "low";
  const zip = String(input.zip || "").trim();

  const validRange = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
  if (!validRange(roof, 20, 1000)) return { error: "Bitte eine Dachfläche zwischen 20 und 1.000 m² eingeben." };
  if (!validRange(usage, 1000, 100000)) return { error: "Bitte einen Jahresverbrauch zwischen 1.000 und 100.000 kWh eingeben." };
  if (!validRange(people, 1, 12) || !Number.isInteger(people)) return { error: "Bitte eine Personenzahl zwischen 1 und 12 eingeben." };
  if (!validRange(price, 0.1, 2)) return { error: "Bitte einen Strompreis von 0,10 bis 2,00 EUR/kWh eingeben." };
  if (!validRange(tariff, 0, 0.3)) return { error: "Bitte eine Einspeisevergütung zwischen 0 und 0,30 EUR/kWh eingeben." };
  if (zip && !/^\d{5}$/.test(zip)) return { error: "Die Postleitzahl muss aus genau fünf Ziffern bestehen." };
  if (!Object.hasOwn(PV_ASSUMPTIONS.orientation, orientation) || !Object.hasOwn(PV_ASSUMPTIONS.shade, shading)) {
    return { error: "Bitte gültige Angaben zu Dachausrichtung und Verschattung wählen." };
  }
  if (!["single", "multi", "row"].includes(houseType)) return { error: "Bitte eine gültige Hausart wählen." };

  const roofMaxKwp = roof / PV_ASSUMPTIONS.roofSqmPerKwp * PV_ASSUMPTIONS.usableRoofFraction;
  // Verbrauchsorientierte Startgröße; Dachbelegung und Wirtschaftlichkeit vor Ort prüfen.
  const pvKwp = Math.min(roofMaxKwp, Math.max(3, usage / 800));
  const annualGeneration = pvKwp * PV_ASSUMPTIONS.yearlyKwhPerKwp *
    PV_ASSUMPTIONS.orientation[orientation] * PV_ASSUMPTIONS.shade[shading];
  const batteryKwh = storage ? Math.min(12, Math.max(3, Math.round(Math.min(usage / 1000 * 1.2, pvKwp * 1.1)))) : 0;

  // Modellannahmen: maximal ca. 35 % Autarkie ohne bzw. 70 % mit Speicher.
  // Diese Deckungsgrenzen verhindern 100 % Autarkie aus Jahresmittelwerten.
  const directOrStored = Math.min(usage * (storage ? 0.70 : 0.35), annualGeneration * (storage ? 0.60 : 0.38));
  const storageLoss = storage ? Math.min(annualGeneration * 0.04, annualGeneration - directOrStored) : 0;
  const feedInKwh = Math.max(0, annualGeneration - directOrStored - storageLoss);

  const pvCost = pvKwp * (houseType === "multi" ? 1450 : 1550) + 1800;
  const batteryCost = storage ? batteryKwh * 850 + 600 : 0;
  const investment = pvCost + batteryCost;
  const savedGridCost = directOrStored * price;
  const feedInRevenue = feedInKwh * tariff;
  const operatingCost = Math.max(150, investment * 0.01);
  const yearlyNetBenefit = savedGridCost + feedInRevenue - operatingCost;
  const paybackYears = yearlyNetBenefit > 0 ? investment / yearlyNetBenefit : null;

  return {
    pvKwp, roofMaxKwp, annualGeneration, batteryKwh, investment, savedGridCost, feedInRevenue,
    operatingCost, yearlyNetBenefit, paybackYears, directOrStored, feedInKwh, storageLoss,
    autonomyPercent: directOrStored / usage * 100,
    storage, tariff, input: { roof, usage, people, price, houseType, orientation, shading, zip }
  };
}

function calculateStorageOptions(pvSizeValue, annualUsageValue) {
  const pvSize = readNumber(pvSizeValue);
  const annualUsage = readNumber(annualUsageValue);
  if (!Number.isFinite(pvSize) || pvSize < 3 || pvSize > 30) {
    return { error: "Bitte eine PV-Leistung zwischen 3 und 30 kWp eingeben." };
  }
  if (!Number.isFinite(annualUsage) || annualUsage < 1000 || annualUsage > 100000) {
    return { error: "Bitte einen Jahresverbrauch zwischen 1.000 und 100.000 kWh eingeben." };
  }
  const base = Math.min(12, Math.max(3, Math.round(Math.min(annualUsage / 1000 * 1.2, pvSize * 1.1))));
  const capacities = Array.from(new Set([Math.max(2, base - 2), base, Math.min(15, base + 2)]));
  return { options: capacities.map((capacity, index) => ({
    title: ["Kompakt", "Orientierung", "Groß"][index],
    capacity, estimatedCost: capacity * 850 + 600,
    note: index === 0 ? "kleinere Investition" : index === 1 ? "verbrauchsorientierte Startgröße" : "Mehr Kapazität, Wirtschaftlichkeit prüfen"
  })) };
}

function renderResult(result, comparison) {
  const target = document.getElementById("pvResult");
  if (!target) return;
  if (result.error) {
    target.textContent = result.error;
    target.setAttribute("role", "alert");
    return;
  }
  // Erfolg wird als höfliche Statusmeldung angekündigt; Fehler bleiben dringliche Alerts.
  target.setAttribute("role", "status");
  // Ausschließlich berechnete Zahlen und feste HTML-Texte, keine unbereinigten Benutzereingaben.
  target.innerHTML = `
    <h3>Geschätztes Ergebnis</h3>
    <p>Unverbindliche Modellrechnung – kein Angebot und keine Ertragsgarantie.</p>
    <div class="result-grid">
      <div class="metric"><span>Orientierende PV-Größe</span><strong>${formatNumber(result.pvKwp, 1)} kWp</strong></div>
      <div class="metric"><span>Investition geschätzt</span><strong>${money(result.investment)}</strong></div>
      <div class="metric"><span>Finanzieller Vorteil/Jahr*</span><strong>${money(result.yearlyNetBenefit)}</strong></div>
      <div class="metric"><span>Einfache Amortisation*</span><strong>${result.paybackYears ? formatNumber(result.paybackYears, 1) + " Jahre" : "nicht berechenbar"}</strong></div>
    </div>
    <div class="result-details">
      <p>Geschätzte Jahresproduktion: <strong>${formatNumber(result.annualGeneration)} kWh</strong> · Anteil Eigenversorgung: <strong>${formatNumber(result.autonomyPercent)} %</strong></p>
      <p>Gesparte Stromkosten: ${money(result.savedGridCost)} · angenommene Einspeiseerlöse: ${money(result.feedInRevenue)} · geschätzte laufende Kosten: ${money(result.operatingCost)}/Jahr</p>
      <p>Speicher: ${result.storage ? formatNumber(result.batteryKwh) + " kWh (grobe Startgröße)" : "kein Speicher"} · Rechenwert Einspeisung: ${formatNumber(result.tariff * 100, 2)} ct/kWh</p>
      <p class="result-disclaimer">* Ohne Finanzierung, Steuern, Förderung, Preisänderungen und größere Reparaturen. Dachstatik, Lastprofil, reale Erträge und tatsächliche Einspeisevergütung müssen geprüft werden. Die PLZ verändert die Ertragsschätzung nicht.</p>
    </div>
    <details class="scenario-compare">
      <summary>Mit und ohne Speicher vergleichen</summary>
      <div class="table-scroll"><table class="table scenario-table">
        <thead><tr><th>Rechenwert</th><th>Ohne Speicher</th><th>Mit Speicher</th></tr></thead>
        <tbody>
        <tr><th>Gesamtkosten</th><td>${money(comparison.no.investment)}</td><td>${money(comparison.yes.investment)}</td></tr>
        <tr><th>Eigenversorgung</th><td>${formatNumber(comparison.no.autonomyPercent)} %</td><td>${formatNumber(comparison.yes.autonomyPercent)} %</td></tr>
        <tr><th>Vorteil/Jahr nach Betriebskosten</th><td>${money(comparison.no.yearlyNetBenefit)}</td><td>${money(comparison.yes.yearlyNetBenefit)}</td></tr>
        <tr><th>Einfache Amortisation</th><td>${comparison.no.paybackYears ? formatNumber(comparison.no.paybackYears, 1) + " Jahre" : "–"}</td><td>${comparison.yes.paybackYears ? formatNumber(comparison.yes.paybackYears, 1) + " Jahre" : "–"}</td></tr>
        </tbody>
      </table></div>
      <p class="result-disclaimer">Beide Szenarien beruhen auf vereinfachten Durchschnittswerten. Ein Speicher kann die Unabhängigkeit erhöhen, muss aber nicht wirtschaftlicher sein.</p>
    </details>
    <a class="button result-cta" href="${document.getElementById("solarLeadForm") ? "#anfrage" : "../index.html#anfrage"}">Unverbindliche Anfrage stellen <span aria-hidden="true">→</span></a>`;
}

function calculatePv({ transferToLead = true } = {}) {
  const get = (id) => document.getElementById(id)?.value;
  const input = {
    roof: get("roofSize"), usage: get("usage"), people: get("people"),
    price: get("powerPrice"), tariff: get("feedInTariff"),
    storage: get("storageWanted"), houseType: get("houseType"),
    orientation: get("roofOrientation"), shading: get("shadeLevel"), zip: get("zip")
  };
  const result = calculatePvEstimate(input);
  const comparison = result.error ? null : {
    no: calculatePvEstimate({ ...input, storage: "no" }),
    yes: calculatePvEstimate({ ...input, storage: "yes" })
  };
  renderResult(result, comparison);
  if (result.error) {
    const summary = document.getElementById("pvLeadSummary");
    const note = document.getElementById("calculatorTransferNotice");
    if (summary) summary.value = "";
    if (note) note.hidden = true;
  }
  // The initial preview uses example values. Attach them to a contact request only
  // after the visitor explicitly submits the calculator.
  if (!result.error && transferToLead) {
    const summary = document.getElementById("pvLeadSummary");
    const formZip = document.getElementById("formZip");
    const project = document.getElementById("project");
    if (summary) summary.value = `Dach ${result.input.roof} m²; Bedarf ${result.input.usage} kWh/Jahr; PV etwa ${formatNumber(result.pvKwp,1)} kWp; Speicher ${result.batteryKwh} kWh; Investition ca. ${money(result.investment)}; Jahresvorteil ca. ${money(result.yearlyNetBenefit)} (unverbindliche Modellrechnung)`;
    // Update only values that the calculator filled itself; never overwrite a manually edited PLZ.
    if (formZip && (!formZip.value || (formZip.dataset.pvAutoZip !== undefined && formZip.value === formZip.dataset.pvAutoZip))) {
      formZip.value = result.input.zip;
      formZip.dataset.pvAutoZip = result.input.zip;
    }
    if (project && project.dataset.pvManualSelection !== "true") {
      project.value = result.storage ? "Solaranlage mit Speicher" : "Solaranlage ohne Speicher";
      project.dataset.pvAutoProject = project.value;
    }
    const note = document.getElementById("calculatorTransferNotice");
    if (note) note.hidden = false;
  }
  return result;
}

function updateStorageComparison() {
  const output = document.getElementById("storageResult");
  if (!output) return;
  const answer = calculateStorageOptions(document.getElementById("storagePvSize")?.value, document.getElementById("storageUsage")?.value);
  const feedback = document.getElementById("storageFeedback");
  if (answer.error) {
    output.innerHTML = `<tr><td colspan="4">${answer.error}</td></tr>`;
    if (feedback) {
      feedback.setAttribute("role", "alert");
      feedback.textContent = answer.error;
    }
    return;
  }
  output.innerHTML = answer.options.map(option => `<tr><td>${option.title}</td><td>${option.capacity} kWh</td><td>${money(option.estimatedCost)}</td><td>${option.note}</td></tr>`).join("");
  if (feedback) {
    feedback.setAttribute("role", "status");
    feedback.textContent = `Speichervergleich aktualisiert für ${formatNumber(readNumber(document.getElementById("storagePvSize")?.value), 1)} kWp und ${formatNumber(readNumber(document.getElementById("storageUsage")?.value))} kWh Jahresverbrauch.`;
  }
}

function initializeSite() {
  document.querySelectorAll(".nav-toggle").forEach(button => {
    const menu = button.parentElement.querySelector(".nav-links");
    if (!menu) return;
    const setMenuOpen = open => {
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "Navigation schließen" : "Navigation öffnen");
      menu.classList.toggle("is-open", open);
    };
    button.addEventListener("click", () => {
      setMenuOpen(button.getAttribute("aria-expanded") !== "true");
    });
    // The desktop layout always displays navigation links. Clear the mobile
    // state when crossing the breakpoint so it cannot reopen unexpectedly.
    window.matchMedia("(min-width: 901px)").addEventListener("change", event => {
      if (event.matches) setMenuOpen(false);
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
        setMenuOpen(false);
        button.focus();
      }
    });
    menu.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
      setMenuOpen(false);
    }));
    // When keyboard focus leaves the menu, close it instead of leaving
    // an expanded overlay behind while the visitor tabs through the page.
    menu.addEventListener("focusout", event => {
      if (button.getAttribute("aria-expanded") === "true" &&
          !menu.contains(event.relatedTarget) && !button.contains(event.relatedTarget)) {
        setMenuOpen(false);
      }
    });
    // Close the mobile menu when interacting elsewhere on the page.
    // Do not steal focus from the visitor's selected element.
    document.addEventListener("click", event => {
      if (button.getAttribute("aria-expanded") === "true" &&
          !button.contains(event.target) && !menu.contains(event.target)) {
        setMenuOpen(false);
      }
    });
  });

  const formZip = document.getElementById("formZip");
  formZip?.addEventListener("input", () => { delete formZip.dataset.pvAutoZip; });
  // Respect a project type selected explicitly in the contact form.
  document.getElementById("project")?.addEventListener("change", event => {
    event.currentTarget.dataset.pvManualSelection = "true";
    delete event.currentTarget.dataset.pvAutoProject;
  });
  const calcForm = document.getElementById("pvCalculator");
  if (calcForm) {
    calcForm.addEventListener("submit", event => {
      event.preventDefault();
      calculatePv();
    });
    calculatePv({ transferToLead: false });
    const invalidateStaleCalculation = () => {
      const summary = document.getElementById("pvLeadSummary");
      const note = document.getElementById("calculatorTransferNotice");
      const result = document.getElementById("pvResult");
      if (summary) summary.value = "";
      if (note) note.hidden = true;
      // A project inferred from the previous calculation is no longer reliable.
      // Preserve an explicitly selected project type.
      const project = document.getElementById("project");
      if (project && project.dataset.pvManualSelection !== "true" &&
          project.dataset.pvAutoProject !== undefined && project.value === project.dataset.pvAutoProject) {
        project.value = "";
        delete project.dataset.pvAutoProject;
      }
      // A previously auto-filled contact ZIP is also stale after calculator edits.
      // Never clear a ZIP that the visitor has entered or changed manually.
      const formZip = document.getElementById("formZip");
      if (formZip && formZip.dataset.pvAutoZip !== undefined && formZip.value === formZip.dataset.pvAutoZip) {
        formZip.value = "";
        delete formZip.dataset.pvAutoZip;
      }
      // Do not show an outdated estimate while the user edits its input values.
      if (result) {
        result.textContent = "Eingaben geändert. Bitte erneut berechnen.";
        result.setAttribute("role", "status");
      }
    };
    calcForm.addEventListener("input", invalidateStaleCalculation);
    calcForm.addEventListener("change", invalidateStaleCalculation);
  }
  document.getElementById("storagePvSize")?.addEventListener("input", updateStorageComparison);
  document.getElementById("storageUsage")?.addEventListener("input", updateStorageComparison);
  updateStorageComparison();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initializeSite);
  else initializeSite();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { calculatePvEstimate, calculateStorageOptions, readNumber, PV_ASSUMPTIONS };
}
