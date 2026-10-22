# PV-Angebot24 – Solaranlagen-Anfragen

Statische Website zur **unverbindlichen PV-Kostenschätzung und Erfassung von Kundenanfragen**.
Die Website ist **kein aktives Vergleichsportal mit angeschlossenen Solarfirmen** und vermittelt bislang nicht automatisch an Partner.

## Funktionen

- PV-Rechner mit Plausibilitätsprüfung von Dachfläche, Stromverbrauch, Strompreis, PLZ und weiteren Angaben
- Berücksichtigung von Dachausrichtung, Verschattung und optionalem Stromspeicher
- Separate Modellwerte für Haushalts-Eigenverbrauch, Stromkosteneinsparung, Einspeiseerlöse, Betriebskosten und einfache Amortisation
- Speicher-Vergleich auf Basis von PV-Größe **und** Jahresstromverbrauch
- Übergabe der PV-Eckdaten in das Kontaktformular (nur auf der Startseite)
- Kontaktformular über den externen Anbieter FormSubmit, mit CAPTCHA und Honeypot-Feld
- Separater Einwilligungstext für die geplante Weitergabe an Solarfirmen
- Responsive Mobilnavigation auf allen 12 HTML-Seiten
- SEO-Seiten, sitemap.xml und robots.txt

## Modellgrenzen

Die Rechnerwerte sind **keine belastbaren Wirtschaftlichkeitsprognosen** und ersetzen keine fachliche Auslegung.
Beispielannahmen im Code: 950 kWh/kWp/Jahr vor Dachfaktoren, begrenzte Autarkiequoten von höchstens ca. 35 % ohne bzw. 70 % mit Speicher, 1 % der Investition oder mindestens 150 EUR jährliche Betriebskosten. Die voreingestellte Einspeisevergütung von 0,077 EUR/kWh ist **nur ein änderbarer Beispielwert**. Der tatsächliche Vergütungssatz hängt unter anderem von Inbetriebnahmedatum, Anlagengröße und Vergütungsart ab.

Nicht berücksichtigt: zeitaufgelöste Lastprofile, Batteriealterung, detaillierte Wirkungsgrade, mögliche Wechselrichterbegrenzung, größere Reparaturen, Finanzierung, individuelle Förderungen, Steuern, saisonale Verschattung, standortgenaue Wetterdaten und tatsächliche Handwerkerangebote. Die Postleitzahl verändert im aktuellen Modell den PV-Ertrag **nicht**.

## Tests

Node.js 22 empfohlen. Keine npm-Abhängigkeiten notwendig.

```bash
node --check assets/js/main.js
node --test tests/site.test.cjs
```

GitHub Actions führt diese Prüfungen bei Pushes und Pull Requests aus (Workflow `.github/workflows/site-check.yml`). Zusätzlich installiert die CI Chromium/Playwright und prüft die Menüs, Formulare und Berechnungen im Browser auf Smartphone- und Desktop-Größe.

Diese Prüfungen testen die PV-Rechenlogik, Eingabegrenzen, internen Datei-/Seitenlinks und die Formularstruktur. Zusätzlich läuft ein Browser-Smoke-Test. Es bleibt **kein** Realbetrieb-Test eines FormSubmit-Versands, kein umfassender Test auf allen Geräten und keine Bestätigung der rechtlichen Zulässigkeit.

## Vor dem Produktivbetrieb offen

1. FormSubmit-Zustellung in einem eigenen kontrollierten Test verifizieren (inklusive erster E-Mail-Bestätigung, CAPTCHA und Spam-Ordner).
2. Rechtliche Prüfung von Impressum, Datenschutzerklärung, Einwilligungen, Empfängern, Auftragsverarbeitung, etwaigen Drittlandtransfers und Löschfristen. Diese README und die Formulartests bestätigen **keine DSGVO-Konformität**.
3. Tatsächliche Solarfirmen als Partner gewinnen und Weitergabe von Leads erst nach festgehaltener Einwilligung und vertraglicher Grundlage starten.
4. Für echte Vermittlung: sicheres Backend mit Lead-Datenbank, Zustimmungsnachweisen, Partnerzuordnung, Löschkonzept und Spam-/Missbrauchsschutz implementieren.
5. PV-Wirtschaftlichkeitswerte regelmäßig anhand aktueller Energiepreise und EEG-Regeln fachlich überprüfen.
6. Veröffentlicht wird über GitHub Pages; Änderungen im Entwicklungs-Branch erscheinen erst nach Freigabe/Merge in den Veröffentlichungs-Branch.

## SEO / Google Search Console

Nach Veröffentlichung die Website bei Google Search Console bestätigen, `sitemap.xml` einreichen und indexierbare Unterseiten prüfen.

Es gibt aktuell **keine vertraglich gesicherten Partnerpreise oder Affiliate-Tracking-Links**.
