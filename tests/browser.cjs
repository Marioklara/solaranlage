"use strict";
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { spawn } = require("node:child_process");

const server = spawn("python3", ["-m", "http.server", "8765", "--bind", "127.0.0.1"], { stdio: "ignore" });
const origin = "http://127.0.0.1:8765";
let browser;
async function main() {
  for(let attempt=0;attempt<50;attempt++){
    try{const r=await fetch(origin);if(r.ok)break;}catch{}
    await new Promise(r=>setTimeout(r,200));
  }
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];
  page.on("pageerror",err=>errors.push(String(err)));
  await page.goto(origin+"/", {waitUntil:"load"});
  assert.ok(await page.locator(".nav-toggle").isVisible(),"Mobile toggle must be visible");
  assert.ok(await page.locator(".hero h1").innerText(),"Hero heading visible");
  require("node:fs").mkdirSync("test-artifacts",{recursive:true});
  await page.screenshot({path:"test-artifacts/mobile-home.png",fullPage:true});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2),true,"No mobile horizontal overflow");
  assert.equal(await page.locator(".nav-links").isVisible(),false,"Menu starts collapsed");
  await page.locator(".nav-toggle").click();
  assert.equal(await page.locator(".nav-links").isVisible(),true,"Menu opens");
  assert.equal(await page.locator(".nav-toggle").getAttribute("aria-expanded"),"true","Expanded state is announced");
  assert.equal(await page.locator(".nav-toggle").getAttribute("aria-label"),"Navigation schließen","Open menu has a close label");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".nav-links").isVisible(),false,"Escape closes mobile menu");
  assert.equal(await page.locator(".nav-toggle").getAttribute("aria-expanded"),"false","Escape resets expanded state");
  assert.equal(await page.locator(".nav-toggle").getAttribute("aria-label"),"Navigation öffnen","Closed menu has an open label");
  assert.equal(await page.locator(".nav-toggle").evaluate(e=>document.activeElement===e),true,"Focus returns to menu button");
  await page.locator(".nav-toggle").click();
  await page.locator(".nav-links a").first().focus();
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".nav-links").isVisible(),false,"Escape also works from a menu link");
  assert.equal(await page.locator(".nav-toggle").evaluate(e=>document.activeElement===e),true,"Menu link focus returns to toggle");
  await page.locator(".nav-toggle").click();
  await page.locator(".nav-links a").first().click();
  assert.ok(page.url().includes("/pv-rechner/"),"Mobile menu navigates");
  await page.locator("#roofSize").fill("70");
  await page.locator("#usage").fill("4200");
  await page.locator("#powerPrice").fill("0.25");
  await page.locator("#roofOrientation").selectOption("south");
  await page.locator("#shadeLevel").selectOption("low");
  await page.locator('#pvCalculator button[type="submit"]').click();
  const result=await page.locator("#pvResult").innerText();
  assert.match(result,/Orientierende PV-Größe/);
  assert.match(result,/Anteil Eigenversorgung/);
  assert.equal(await page.locator("#pvResult").getAttribute("role"),"status","Successful calculation is announced as a status");
  await page.locator(".scenario-compare summary").click();
  assert.equal(await page.locator(".scenario-compare tbody tr").count(),4,"Storage scenarios show four comparative rows");
  assert.ok(!result.includes("100 %"),"No 100 % autonomy from annual data");
  await page.locator("#roofSize").fill("5");
  assert.equal(await page.locator("#roofSize").evaluate(e=>e.checkValidity()),false,"Browser validates roof area");
  await page.evaluate(() => calculatePv()); // Exercise the JS error path despite native form validation.
  assert.equal(await page.locator("#pvResult").getAttribute("role"),"alert","Invalid calculation announces an error");
  await page.locator("#roofSize").fill("70");
  await page.locator('#pvCalculator button[type="submit"]').click();
  assert.equal(await page.locator("#pvResult").getAttribute("role"),"status","Corrected calculation returns to polite status");

  await page.goto(origin+"/stromspeicher/");
  assert.ok(await page.locator("#storageResult tr").count()>=2);
  const initial=await page.locator("#storageResult").innerText();
  await page.locator("#storageUsage").fill("9000");
  assert.notEqual(await page.locator("#storageResult").innerText(),initial,"Consumption affects storage recommendations");

  await page.goto(origin+"/");
  await page.locator("#zip").fill("68723");
  await page.locator('#pvCalculator button[type="submit"]').click();
  assert.equal(await page.locator("#formZip").inputValue(),"68723","ZIP transfers to lead form");
  assert.ok((await page.locator("#pvLeadSummary").inputValue()).includes("PV etwa"),"PV data transfers");
  await page.locator('#solarLeadForm input[name="name"]').fill("Testperson");
  await page.locator('#solarLeadForm input[name="email"]').fill("test@example.org");
  assert.equal(await page.locator("#solarLeadForm").evaluate(f=>f.checkValidity()),false,"Consent is required");
  await page.locator("#ownership").selectOption({label:"Ich bin Eigentümer/in"});
  await page.locator("#timeline").selectOption({label:"innerhalb von 3 Monaten"});
  await page.locator('input[name="datenschutz_zustimmung"]').check();
  assert.equal(await page.locator("#solarLeadForm").evaluate(f=>f.checkValidity()),true,"Required fields and privacy notice accepted");
  assert.equal(await page.locator('input[name="partner_einwilligung"]').isChecked(),false,"Partner contact opt-in is voluntary");
  await page.locator("#roofSize").fill("75");
  assert.equal(await page.locator("#pvLeadSummary").inputValue(),"","Stale calculator values must be cleared when input changes");
  await page.locator('#pvCalculator button[type="submit"]').click();
  assert.ok((await page.locator("#pvLeadSummary").inputValue()).includes("Dach 75"),"New results transfer after recomputation");
  assert.equal(await page.locator("#fragen details").count(),4,"Visible FAQ must be available");
  // Do not submit form: external FormSubmit delivery and privacy cannot be tested synthetically.
  // Desktop navigation, no-storage scenario and all 12 published pages.
  await page.setViewportSize({width:1280,height:900});
  await page.goto(origin+"/");
  assert.equal(await page.locator(".nav-toggle").isVisible(),false,"Desktop menu toggle stays hidden");
  assert.equal(await page.locator(".nav-links").isVisible(),true,"Desktop links are visible");
  assert.ok(await page.locator('link[rel="canonical"]').count()===1,"Canonical URL present");
  await page.screenshot({path:"test-artifacts/desktop-home.png",fullPage:true});
  await page.locator("#storageWanted").selectOption("no");
  await page.locator('#pvCalculator button[type="submit"]').click();
  assert.match(await page.locator("#pvResult").innerText(),/kein Speicher/i);
  for (const route of ["/","/pv-rechner/","/stromspeicher/","/solaranlage-kosten/","/photovoltaik-vergleich/","/waermepumpe/","/solar-foerderung/","/ratgeber/","/solaranlage-heidelberg/","/photovoltaik-mannheim/","/solaranlage-schwetzingen/","/pv-anlage-karlsruhe/"]) {
    const response = await page.goto(origin+route,{waitUntil:"load"});
    assert.equal(response.status(),200,"Missing page: "+route);
    assert.ok(await page.locator(".nav-links a").count()>0,"No navigation links: "+route);
  }
  assert.deepEqual(errors,[],"No JavaScript runtime errors");
  console.log("Browser-Checks OK: mobile menu, page navigation, PV inputs, calculation, storage and lead handoff.");
}
main().catch(err=>{console.error(err);process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.close();
  server.kill();
});
