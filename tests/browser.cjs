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
  assert.equal(await page.locator(".nav-links").isVisible(),false,"Menu starts collapsed");
  await page.locator(".nav-toggle").click();
  assert.equal(await page.locator(".nav-links").isVisible(),true,"Menu opens");
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
  assert.ok(!result.includes("100 %"),"No 100 % autonomy from annual data");
  await page.locator("#roofSize").fill("5");
  assert.equal(await page.locator("#roofSize").evaluate(e=>e.checkValidity()),false,"Browser validates roof area");

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
  await page.locator('input[name="partner_einwilligung"]').check();
  await page.locator('input[name="datenschutz_zustimmung"]').check();
  assert.equal(await page.locator("#solarLeadForm").evaluate(f=>f.checkValidity()),true,"Complete form is valid");
  // Do not submit form: external FormSubmit delivery and privacy cannot be tested synthetically.
  assert.deepEqual(errors,[],"No JavaScript runtime errors");
  console.log("Browser-Checks OK: mobile menu, page navigation, PV inputs, calculation, storage and lead handoff.");
}
main().catch(err=>{console.error(err);process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.close();
  server.kill();
});
