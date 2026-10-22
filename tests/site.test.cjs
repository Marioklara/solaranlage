"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {calculatePvEstimate: estimate,calculateStorageOptions: storage,readNumber} = require("../assets/js/main.js");
const root=path.resolve(__dirname,"..");
const pages=["index.html","pv-rechner/index.html","stromspeicher/index.html","solaranlage-kosten/index.html","photovoltaik-vergleich/index.html","waermepumpe/index.html","solar-foerderung/index.html","ratgeber/index.html","solaranlage-heidelberg/index.html","photovoltaik-mannheim/index.html","solaranlage-schwetzingen/index.html","pv-anlage-karlsruhe/index.html"];
const calc=(over={})=>estimate({roof:70,usage:4200,people:4,price:0.25,tariff:0.077,storage:true,houseType:"single",orientation:"south",shading:"low",zip:"68723",...over});
test("German decimal input",()=>{assert.equal(readNumber("0,25"),0.25);assert.ok(Number.isNaN(readNumber("")))});
test("sample household: energy balance, plausible autarky, nonnegative financials",()=>{
  const r=calc();
  assert.equal(r.error,undefined);
  assert.ok(r.pvKwp>0&&r.pvKwp<=r.roofMaxKwp);
  assert.ok(r.autonomyPercent<=70&&r.directOrStored<=4200);
  assert.ok(Math.abs(r.annualGeneration-r.directOrStored-r.feedInKwh-r.storageLoss)<0.001);
  assert.ok(r.investment>0&&r.paybackYears>0&&r.yearlyNetBenefit<r.savedGridCost+r.feedInRevenue);
});
test("available roof never exceeded",()=>{for(const roof of [20,25,50,70,100,500]){const r=calc({roof});assert.ok(r.pvKwp<=r.roofMaxKwp)}});
test("shading and orientation decrease production",()=>{assert.ok(calc({shading:"high"}).annualGeneration<calc().annualGeneration);assert.ok(calc({orientation:"north"}).annualGeneration<calc().annualGeneration)});
test("battery increases self-supply without 100% independence",()=>{
  const no=calc({storage:false}),yes=calc();
  assert.equal(no.batteryKwh,0);assert.ok(no.autonomyPercent<=35);
  assert.ok(yes.autonomyPercent>no.autonomyPercent);
});
test("invalid inputs rejected",()=>{for(const bad of [{roof:0},{roof:-5},{roof:Infinity},{roof:1001},{usage:""},{usage:-100},{people:0},{people:1.5},{price:"abc"},{tariff:0.8},{orientation:"unknown"},{shading:"evil"},{houseType:"bad"},{zip:"<script>"},{zip:"123"}]){assert.ok(calc(bad).error,JSON.stringify(bad))}});
test("storage sizing depends on consumption and PV capacity",()=>{
  const a=storage(8,3000),b=storage(8,8000);
  assert.ok(a.options.length>=2&&b.options[1].capacity>a.options[1].capacity);
  assert.ok(storage(0,3000).error&&storage(8,0).error);
});
test("all 12 pages have a mobile navigation control and main script",()=>{
  for(const file of pages){const h=fs.readFileSync(path.join(root,file),"utf8");
    assert.ok(h.includes('class="nav-toggle"'),file);
    assert.ok(h.includes('aria-expanded="false"'),file);
    assert.ok(h.includes('class="nav-links" id="nav-main"'),file);
    assert.ok(h.includes("assets/js/main.js"),file);
  }
});
test("internal links, CSS and JavaScript paths exist",()=>{
  for(const file of pages){const h=fs.readFileSync(path.join(root,file),"utf8"),base=path.dirname(path.join(root,file));
    for(const m of h.matchAll(/(?:href|src)="([^"]+)"/g)){
      const url=m[1]; if(/^(https?:|mailto:|tel:|#|data:)/.test(url))continue;
      const relative=url.split("#")[0].split("?")[0];if(!relative)continue;
      const abs=path.resolve(base,relative);
      assert.ok(abs.startsWith(root)&&fs.existsSync(abs),file+": missing "+url);
    }
  }
});
test("calculator results and lead form are linked and protected against basic spam",()=>{
  const h=fs.readFileSync(path.join(root,"index.html"),"utf8");
  for(const id of ["pvCalculator","roofOrientation","shadeLevel","feedInTariff","pvResult","solarLeadForm","pvLeadSummary","formZip"])assert.ok(h.includes('id="'+id+'"'),id);
  for(const frag of ['name="_captcha" value="true"','name="_honey"','name="partner_einwilligung"','name="datenschutz_zustimmung"'])assert.ok(h.includes(frag),frag);
});
test("storage and calculator subpages have necessary fields",()=>{
  const a=fs.readFileSync(path.join(root,"pv-rechner/index.html"),"utf8");
  const b=fs.readFileSync(path.join(root,"stromspeicher/index.html"),"utf8");
  for(const id of ["roofOrientation","shadeLevel","feedInTariff"])assert.ok(a.includes('id="'+id+'"'));
  for(const id of ["storagePvSize","storageUsage","storageResult"])assert.ok(b.includes('id="'+id+'"'));
});
