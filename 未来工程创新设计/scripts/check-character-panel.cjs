'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/frank/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--force-high-performance-gpu','--use-angle=d3d11']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[],out=path.resolve(__dirname,'../docs/character-validation');
  page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8791',{timeout:60000});
  await page.waitForFunction(()=>window.LunarisCharacterDiagnostics&&document.getElementById('characterStatus').textContent.includes('待机'));
  assert.equal(await page.locator('#characterBubble').count(),0);assert.equal(await page.locator('#characterPanelToggle').getAttribute('aria-expanded'),'false');
  await page.screenshot({path:path.join(out,'panel-collapsed.png')});
  await page.locator('#characterPanelToggle').click();await page.locator('#characterAuto').uncheck();await page.locator('#characterFocus').click();await page.waitForTimeout(1800);
  assert.equal(await page.locator('#characterPanelToggle').getAttribute('aria-expanded'),'true');assert.equal(await page.evaluate(()=>window.LunarisCharacterDiagnostics().highlighted),true);
  await page.screenshot({path:path.join(out,'panel-expanded-highlight.png')});
  await page.locator('#characterHighlight').uncheck();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.LunarisCharacterDiagnostics().highlighted),false);assert.equal(await page.evaluate(()=>window.LunarisCharacterDiagnostics().visible),true);await page.locator('#characterHighlight').check();
  await page.locator('#characterVisible').uncheck();await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.LunarisCharacterDiagnostics().highlighted),false);await page.locator('#characterVisible').check();
  await page.locator('#characterFocus').click();await page.waitForTimeout(500);assert.deepEqual(await page.evaluate(()=>{const v=window.LunarisCharacterDiagnostics().view;return [v.follow,v.floor,v.visibleRooms]}),[false,-1,24]);
  await page.locator('#characterIdle').fill('5');await page.locator('#characterAuto').check();
  await page.waitForFunction(()=>window.LunarisCharacterDiagnostics().plan!==null,{},{timeout:15000});
  const desire=await page.locator('#characterThought').textContent();assert.match(desire,/想|惦记|心情/);assert.doesNotMatch(desire,/正在比较|次搬运|米步行|下一站/);
  await page.waitForTimeout(500);assert.equal(await page.locator('#characterThought').textContent(),desire);
  await page.locator('#characterPause').click();await page.locator('#characterPanelToggle').focus();await page.keyboard.press('Escape');assert.equal(await page.locator('#characterPanelToggle').getAttribute('aria-expanded'),'false');
  await page.setViewportSize({width:390,height:844});await page.locator('#characterPanelToggle').click();await page.waitForTimeout(500);const bounds=await page.locator('#characterPanel').boundingBox();assert.ok(bounds.x>=50&&bounds.x+bounds.width<=391);
  await page.screenshot({path:path.join(out,'panel-mobile.png')});
  fs.writeFileSync(path.join(out,'panel-report.json'),JSON.stringify({errors,desire,mobileBounds:bounds,checks:['default collapse','portrait toggle','independent highlight switch','follow restores 24 rooms','no thought bubble','visible highlight','hidden highlight off','purpose preserved during travel','keyboard collapse','mobile bounds']},null,2));
  console.log(JSON.stringify({errors,desire,mobileBounds:bounds}));assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
