'use strict';
const fs=require('node:fs'),path=require('node:path');
const playwright=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/frank/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const out=path.resolve(__dirname,'../docs/character-validation');fs.mkdirSync(out,{recursive:true});
 const browser=await playwright.chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,400));});
  await page.goto(process.env.LUNARIS_TEST_URL||'http://127.0.0.1:8790',{waitUntil:'load',timeout:60000});
  await page.waitForFunction(()=>window.LunarisCharacterDiagnostics&&document.getElementById('characterStatus').textContent.includes('待机'),{},{timeout:60000});
  await page.locator('#characterPanelToggle').click();await page.locator('#characterAuto').uncheck();await page.locator('#characterFocus').click();await page.waitForTimeout(2500);
  await page.screenshot({path:path.join(out,'character-idle.png')});
  const initial=await page.evaluate(()=>window.LunarisCharacterDiagnostics());
  await page.locator('#characterExample').click();await page.locator('#scheduleInput').fill('冯院长先去 R14 停留 1 秒，再去 R20 停留 1 秒并挥手');await page.locator('#scheduleSubmit').click();
  await page.waitForTimeout(4500);const traveling=await page.evaluate(()=>window.LunarisCharacterDiagnostics());
  await page.locator('#characterPause').click();await page.waitForTimeout(200);const paused=await page.evaluate(()=>window.LunarisCharacterDiagnostics());
  await page.screenshot({path:path.join(out,'character-itinerary.png')});
  await page.waitForTimeout(700);const pausedLater=await page.evaluate(()=>window.LunarisCharacterDiagnostics());
  if(JSON.stringify(paused.position)!==JSON.stringify(pausedLater.position))throw Error('Pause moved character');
  await page.locator('#characterPause').click();
  await page.waitForFunction(()=>window.LunarisCharacterDiagnostics().history.filter(e=>e.event==='activity-complete').length===2,{},{timeout:180000});
  const completed=await page.evaluate(()=>window.LunarisCharacterDiagnostics());
  await page.locator('#characterExample').click();await page.locator('#scheduleInput').fill('冯老师去 R20 上层停留 1 秒并挥手');await page.locator('#scheduleSubmit').click();
  await page.waitForFunction(()=>window.LunarisCharacterDiagnostics().status==='攀爬上行',{},{timeout:30000});
  await page.waitForTimeout(1500);await page.screenshot({path:path.join(out,'character-climbing.png')});
  await page.waitForFunction(()=>window.LunarisCharacterDiagnostics().history.filter(e=>e.event==='activity-complete').length===3,{},{timeout:45000});
  await page.locator('#characterPause').click();await page.waitForTimeout(300);await page.screenshot({path:path.join(out,'character-upper.png')});
  await page.locator('#characterExample').click();await page.locator('#scheduleInput').fill('冯鹏去 R20 下层停留 1 秒');await page.locator('#scheduleSubmit').click();
  await page.waitForFunction(()=>window.LunarisCharacterDiagnostics().status==='攀爬下行',{},{timeout:30000});await page.waitForTimeout(1000);await page.screenshot({path:path.join(out,'character-descending.png')});
  await page.waitForFunction(()=>window.LunarisCharacterDiagnostics().history.filter(e=>e.event==='activity-complete').length===4,{},{timeout:45000});
  await page.locator('#characterIdle').fill('5');await page.locator('#characterAuto').check();
  await page.waitForFunction(()=>window.LunarisCharacterDiagnostics().history.filter(e=>e.event==='plan').length>=5,{},{timeout:15000});
  await page.locator('#characterPause').click();
  const performance=await page.evaluate(()=>({cpuMs:document.getElementById('cpuTime').textContent,gpuMs:document.getElementById('gpuTime').textContent,fps:document.getElementById('fps').textContent,gpu:document.getElementById('gpuName').textContent}));
  const report={errors,initial,traveling,paused,completed,final:await page.evaluate(()=>window.LunarisCharacterDiagnostics()),performance};fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({errors,arrivals:completed.history.filter(e=>e.event==='arrived'),final:report.final.status,performance}));
  if(errors.length)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
