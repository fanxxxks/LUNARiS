'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/frank/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true,args:['--force-high-performance-gpu','--use-angle=d3d11']});try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[],out=path.resolve(__dirname,'../docs/follow-validation'),results=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|framebuffer/i.test(m.text()))errors.push(m.text().slice(0,300));});
 await page.goto('http://127.0.0.1:8791/',{timeout:60000});await page.waitForFunction(()=>window.LunarisCharacterDiagnostics?.().status==='待机');await page.locator('#characterPanelToggle').click();await page.locator('#characterAuto').uncheck();await page.locator('#characterPause').click();await page.locator('#characterPanelClose').click();
 for(const mode of ['performance','high','cinematic']){
  await page.locator('#quality').evaluate((s,mode)=>{s.value=mode;s.dispatchEvent(new Event('change'));},mode);
  await page.locator('#cameraBenchmark').evaluate(b=>b.click());await page.waitForTimeout(10000);
  if(mode==='cinematic')await page.waitForFunction(()=>window.LunarisRenderDiagnostics().accumulationCount===16,{},{timeout:15000});
  const d=await page.evaluate(()=>window.LunarisRenderDiagnostics());assert.equal(d.quality,mode);assert.equal(d.invalidMatrices,0);assert.equal(d.boundsErrors,0);assert.equal(d.roomInstances.filter(r=>r.visible&&r.shells>0).length,24);results.push({mode,benchmark:await page.locator('#benchmarkStatus').textContent(),gpu:d.gpuName,cpuMs:d.cpuMs,gpuMs:d.gpuMs,passes:d.passes,samples:d.samples,aoSamples:d.aoSamples,shadowSize:d.shadowSize,accumulationCount:d.accumulationCount});
  await page.screenshot({path:path.join(out,'quality-'+mode+'.png')});
 }
 await page.locator('#quality').evaluate(s=>{s.value='performance';s.dispatchEvent(new Event('change'));});await page.setViewportSize({width:3840,height:2160});await page.waitForTimeout(500);const fourK=await page.evaluate(()=>window.LunarisRenderDiagnostics());assert.ok(fourK.drawSize[0]*fourK.drawSize[1]<=3686400);assert.equal(fourK.roomInstances.filter(r=>r.visible).length,24);
 assert.deepEqual(errors,[]);const report={errors,viewport:[1600,1000],headless:true,results,fourKDrawSize:fourK.drawSize};fs.writeFileSync(path.join(out,'quality-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
