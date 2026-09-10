'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {chromium}=require('C:/Users/frank/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/audio-validation');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--force-high-performance-gpu','--use-angle=d3d11']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  // Measure the actual mixed audio signal without adding a production test hook.
  await page.addInitScript(()=>{const Native=window.AudioContext;window.AudioContext=function(...args){const ctx=new Native(...args),analyser=ctx.createAnalyser();analyser.fftSize=2048;analyser.connect(ctx.destination);Object.defineProperty(ctx,'destination',{value:analyser});window.testAudioAnalyser=analyser;window.testAudioContext=ctx;return ctx;};});
  await page.goto(pathToFileURL(path.join(root,'月宫华容_三维仿真软件.html')).href,{timeout:60000});
  await page.waitForFunction(()=>window.LunarisAudioDiagnostics&&window.LunarisCharacterDiagnostics?.().status==='待机');
  const read=()=>page.evaluate(()=>window.LunarisAudioDiagnostics());
  assert.equal((await read()).state,'locked');
  await page.locator('#characterPanelToggle').click();await page.locator('#characterAuto').uncheck();await page.locator('#characterPanelClose').click();
  await page.waitForFunction(()=>window.LunarisAudioDiagnostics().state==='running');
  await page.locator('#openSettings').click();await page.screenshot({path:path.join(out,'settings-desktop.png')});
  const volume=async(id,n)=>page.locator('#'+id).evaluate((e,n)=>{e.value=n;e.dispatchEvent(new Event('input',{bubbles:true}));},n);
  await volume('mechanicalVolume',64);await volume('uiVolume',28);
  await page.locator('#closeSettings').click();
  await page.locator('#play').click();await page.waitForFunction(()=>window.LunarisAudioDiagnostics().motor,{},{timeout:15000});
  const signal=await page.evaluate(async()=>{let peak=0,energy=0,n=0;for(let i=0;i<8;i++){await new Promise(r=>setTimeout(r,35));const a=new Float32Array(2048);window.testAudioAnalyser.getFloatTimeDomainData(a);for(const v of a){peak=Math.max(peak,Math.abs(v));energy+=v*v;n++;}}return {peak,rms:Math.sqrt(energy/n)};});
  assert.ok(signal.rms>.00001,JSON.stringify(signal));assert.ok(signal.peak<.95,JSON.stringify(signal));
  await page.locator('#play').click();await page.waitForTimeout(500);assert.equal((await read()).motor,false);assert.equal((await read()).voices,0);
  const countsBeforeSeek=(await read()).counts;
  await page.locator('#timeline').evaluate(e=>{e.value=Number(e.max)*.7;e.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForTimeout(200);
  assert.equal((await read()).counts.dock,countsBeforeSeek.dock);assert.deepEqual((await read()).dockingRooms,[]);
  // Complete the entire preset at 16×, including any phase boundaries skipped by a frame.
  await page.locator('#speedToggle').click();await page.locator('#rate16').click();await page.locator('#replay').click();
  await page.waitForFunction(()=>window.LunarisAudioDiagnostics().dockingRooms.length>0,{},{timeout:20000});
  await page.screenshot({path:path.join(out,'docking.png')});
  await page.waitForFunction(()=>document.querySelector('#phase').textContent.includes('重构完成'),{},{timeout:90000});
  await page.waitForTimeout(1400);const completed=await read();
  assert.ok(completed.counts.dock>0);assert.ok(completed.counts.complete>0);assert.equal(completed.motor,false);assert.equal(completed.voices,0);assert.deepEqual(completed.dockingRooms,[]);
  // Close the actual browser audio device, then verify restored sound at its output.
  await page.locator('#openSettings').click();await page.evaluate(()=>window.testAudioContext.close());assert.equal((await read()).state,'closed');
  await page.locator('#audioRecover').click();await page.waitForFunction(()=>window.LunarisAudioDiagnostics().state==='running');
  const recoveredSignal=await page.evaluate(async()=>{let peak=0;for(let i=0;i<5;i++){const a=new Float32Array(2048);window.testAudioAnalyser.getFloatTimeDomainData(a);for(const v of a)peak=Math.max(peak,Math.abs(v));await new Promise(r=>setTimeout(r,20));}return peak;});
  assert.ok(recoveredSignal>.0001&&recoveredSignal<.95,String(recoveredSignal));assert.ok((await read()).recoveries>0);await page.locator('#closeSettings').click();
  // Mute during motion must stop all sources, and the saved mixer survives reload.
  await page.locator('#replay').click();await page.waitForFunction(()=>window.LunarisAudioDiagnostics().motor);
  await page.locator('#openSettings').click();await page.locator('#audioMuted').check();await page.waitForTimeout(150);
  assert.equal((await read()).motor,false);assert.equal((await read()).voices,0);assert.equal((await read()).settings.muted,true);
  await page.reload({timeout:60000});await page.waitForFunction(()=>window.LunarisAudioDiagnostics);
  assert.deepEqual((await read()).settings,{muted:true,mechanical:64,ui:28,music:18,musicEnabled:true});assert.equal((await read()).state,'locked');
  await page.locator('#openSettings').click();await page.locator('#audioMuted').uncheck();await page.waitForFunction(()=>window.LunarisAudioDiagnostics().state==='running');
  await page.locator('#stop').click();await page.waitForTimeout(550);assert.equal((await read()).motor,false);assert.ok((await read()).counts.stop>0);
  // The visibility handler immediately suspends audio, without a catch-up sound burst.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>window.LunarisAudioDiagnostics().state==='suspended');assert.equal((await read()).voices,0);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>window.LunarisAudioDiagnostics().state==='running');
  await page.setViewportSize({width:390,height:844});await page.locator('#openSettings').click();await page.locator('#toast').waitFor({state:'hidden'});await page.screenshot({path:path.join(out,'settings-mobile.png')});
  const fits=await page.locator('.audio-volume').evaluateAll(rows=>rows.every(row=>row.scrollWidth<=row.clientWidth));assert.ok(fits);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#audioPreview').focus();await page.keyboard.down('Space');assert.equal(await page.locator('#audioPreview').evaluate(e=>getComputedStyle(e).translate),'none');await page.keyboard.up('Space');
  const docksBeforeKeyboard=(await read()).counts.dock;await page.waitForTimeout(200);await page.locator('#audioPreview').press('Enter');assert.ok((await read()).counts.dock>docksBeforeKeyboard);
  const fallback=await browser.newPage();fallback.on('pageerror',e=>errors.push(e.message));
  await fallback.addInitScript(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined;});
  await fallback.goto(pathToFileURL(path.join(root,'月宫华容_三维仿真软件.html')).href,{timeout:60000});await fallback.waitForFunction(()=>window.LunarisAudioDiagnostics);
  await fallback.locator('#openSettings').click();assert.equal(await fallback.evaluate(()=>window.LunarisAudioDiagnostics().failed),true);
  await fallback.locator('#closeSettings').click();await fallback.locator('#play').click();await fallback.waitForFunction(()=>Number(document.querySelector('#timeline').value)>0);await fallback.close();
  assert.deepEqual(errors,[]);
  const report={url:'offline file',errors,signal,recoveredSignal,completed,checks:['first gesture unlock','actual waveform and peak','closed audio device restores real output','pause cleanup','silent timeline seeking','16x docking and completion','mute during motion','persisted settings','emergency stop','background suspension','mobile controls','reduced motion','keyboard activation','no AudioContext fallback']};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
