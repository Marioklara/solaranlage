function euro(value) {
  return Math.round(value).toLocaleString("de-DE") + " EUR";
}

function calculatePv() {
  const roof = Number(document.getElementById("roofSize")?.value || 0);
  const usage = Number(document.getElementById("usage")?.value || 0);
  const people = Number(document.getElementById("people")?.value || 1);
  const price = Number(document.getElementById("powerPrice")?.value || 0.35);
  const storage = document.getElementById("storageWanted")?.value === "yes";
  const houseType = document.getElementById("houseType")?.value || "single";
  const result = document.getElementById("pvResult");

  if (!result) return;

  const usableRoof = Math.max(roof, 20);
  const kwpByRoof = usableRoof / 6;
  const demandKwp = Math.max(4, usage / 850);
  const kwp = Math.min(Math.max(kwpByRoof * 0.72, 4), Math.max(demandKwp, 14));
  const yearlyProduction = kwp * 950;
  const baseCostPerKwp = houseType === "multi" ? 1450 : 1550;
  const storageKwh = storage ? Math.min(Math.max(Math.round(kwp * 0.9), 5), 14) : 0;
  const storageCost = storageKwh * 850;
  const totalCost = kwp * baseCostPerKwp + storageCost + 1800;
  const selfUseRate = storage ? 0.58 : 0.32;
  const selfUsed = Math.min(yearlyProduction * selfUseRate, usage);
  const feedIn = Math.max(yearlyProduction - selfUsed, 0);
  const yearlySaving = selfUsed * price + feedIn * 0.08;
  const payback = totalCost / Math.max(yearlySaving, 1);
  const householdHint = people >= 4 ? "Der Verbrauch wirkt familiennah; Speicher und Lastverschiebung können wichtiger werden." : "Bei diesem Verbrauch ist die richtige Anlagengröße wichtiger als maximale Dachbelegung.";

  result.innerHTML = `
    <h3>Geschätztes Ergebnis</h3>
    <p>Diese Werte sind eine Orientierung und ersetzen kein verbindliches Angebot.</p>
    <div class="result-grid">
      <div class="metric"><span>PV-Größe</span><strong>${kwp.toFixed(1).replace(".", ",")} kWp</strong></div>
      <div class="metric"><span>Kosten grob</span><strong>${euro(totalCost)}</strong></div>
      <div class="metric"><span>Ersparnis/Jahr</span><strong>${euro(yearlySaving)}</strong></div>
      <div class="metric"><span>Amortisation</span><strong>${payback.toFixed(1).replace(".", ",")} Jahre</strong></div>
    </div>
    <p style="margin-top:14px">Speicher-Empfehlung: ${storage ? storageKwh + " kWh als grobe Startgröße." : "Kein Speicher ausgewählt; dadurch sind die Investitionskosten niedriger."} ${householdHint}</p>
  `;
}

function updateStorageComparison() {
  const pvSize = Number(document.getElementById("storagePvSize")?.value || 8);
  const output = document.getElementById("storageResult");
  if (!output) return;

  const small = Math.max(5, Math.round(pvSize * 0.65));
  const balanced = Math.max(6, Math.round(pvSize * 0.9));
  const large = Math.max(8, Math.round(pvSize * 1.15));
  const rows = [
    ["Kompakt", small, small * 850 + 1200, "niedriger Einstiegspreis"],
    ["Ausgewogen", balanced, balanced * 850 + 1500, "häufig passend für Einfamilienhäuser"],
    ["Groß", large, large * 850 + 1900, "mehr Autarkie, höhere Investition"]
  ];

  output.innerHTML = rows.map(row => `
    <tr>
      <td>${row[0]}</td>
      <td>${row[1]} kWh</td>
      <td>${euro(row[2])}</td>
      <td>${row[3]}</td>
    </tr>
  `).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("pvCalculator")?.addEventListener("submit", event => {
    event.preventDefault();
    calculatePv();
  });
  document.getElementById("storagePvSize")?.addEventListener("input", updateStorageComparison);
  calculatePv();
  updateStorageComparison();
});
