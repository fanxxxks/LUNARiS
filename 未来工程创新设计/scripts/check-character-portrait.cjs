'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/frank/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--force-high-performance-gpu','--use-angle=d3d11']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[],out=path.resolve(__dirname,'../docs/character-validation');
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'&&m.text().includes('Character portrait preview:'))errors.push(m.text());});
  await page.goto('http://127.0.0.1:8791/',{timeout:60000});await page.waitForFunction(()=>window.LunarisCharacterDiagnostics?.().status==='待机');
  await page.locator('#characterPanelToggle').click();await page.locator('#characterAuto').uncheck();await page.locator('#characterPause').click();
  const diag=()=>page.evaluate(()=>window.LunarisCharacterDiagnostics().portrait);
  assert.equal((await diag()).mode,'illustration');assert.equal((await diag()).initialized,false);
  assert.ok(await page.locator('.character-standee').evaluate(i=>i.complete&&i.naturalWidth>0));
  await page.screenshot({path:path.join(out,'portrait-illustration.png')});
  await page.locator('#characterPortrait').click();await page.waitForFunction(()=>window.LunarisCharacterDiagnostics().portrait.frames>2);
  const first=await page.locator('#characterPortraitCanvas').screenshot();const before=await diag();await page.waitForTimeout(350);const second=await page.locator('#characterPortraitCanvas').screenshot();const after=await diag();assert.ok(after.frames>before.frames);assert.notEqual(after.animationTime,before.animationTime);assert.ok(!first.equals(second),'the rendered gait must change');
  await page.screenshot({path:path.join(out,'portrait-walking.png')});
  await page.locator('#characterPortrait').click();let stopped=await diag();await page.waitForTimeout(300);assert.equal((await diag()).frames,stopped.frames);assert.equal(stopped.mode,'illustration');
  await page.locator('#characterPortrait').focus();await page.keyboard.press('Enter');await page.waitForTimeout(250);assert.equal((await diag()).mode,'walking');
  await page.locator('#characterPanelClose').click();stopped=await diag();await page.waitForTimeout(300);assert.equal((await diag()).frames,stopped.frames);
  await page.locator('#characterPanelToggle').click();await page.waitForTimeout(250);assert.ok((await diag()).frames>stopped.frames);
  await page.locator('#characterPortrait').click();await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
  const boxes=await page.evaluate(()=>{const ids=['characterPortrait','characterThought','characterPanelBody'];return Object.fromEntries(ids.map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [id,{x:r.x,y:r.y,right:r.right,bottom:r.bottom}]}));});
  assert.ok(boxes.characterThought.right<=boxes.characterPortrait.x);assert.ok(boxes.characterPortrait.right<=390);await page.screenshot({path:path.join(out,'portrait-mobile.png')});
  assert.deepEqual(errors,[]);const report={errors,before,after,mobileBounds:boxes,checks:['illustration default','actual walking rig animation','click and Enter toggle','no simulation pause coupling','stop rendering on illustration and collapse','resume on expand','mobile text separation']};fs.writeFileSync(path.join(out,'portrait-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
