'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/frank/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true,args:['--force-high-performance-gpu','--use-angle=d3d11']});try{
 const page=await browser.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'}),errors=[],out=path.resolve(__dirname,'../docs/dining-validation');fs.mkdirSync(out,{recursive:true});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8792/',{timeout:60000});await page.waitForFunction(()=>window.LunarisCharacterDiagnostics?.().status==='待机');
 await page.locator('#characterPanelToggle').click();await page.locator('#characterAuto').uncheck();await page.locator('#characterPanelClose').click();
 await page.locator('#studio').click();await page.getByRole('button',{name:'观察餐厅',exact:true}).click();assert.equal(await page.locator('#studioTitle').textContent(),'餐厅');assert.equal(await page.locator('#studioCode').textContent(),'DIN');
 await page.locator('#studioLower').click();await page.waitForTimeout(800);await page.screenshot({path:path.join(out,'dining-lower.png')});assert.match(await page.locator('#studioCaption').textContent(),/餐桌/);
 await page.locator('#studioUpper').click();await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'dining-upper.png')});assert.match(await page.locator('#studioCaption').textContent(),/茶饮/);
 await page.locator('#studioExterior').click();await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'dining-exterior.png')});
 await page.locator('#exitStudio').click();await page.locator('#characterPanelToggle').click();await page.locator('#characterExample').click();await page.locator('#scheduleInput').fill('冯院长去餐厅停留 5 秒');await page.locator('#scheduleSubmit').click();
 await page.waitForFunction(()=>window.LunarisCharacterDiagnostics().plan?.destination===18,{},{timeout:20000});await page.locator('#characterPause').click();const state=await page.evaluate(()=>window.LunarisCharacterDiagnostics());assert.match(state.thought,/想|缓/);
 await page.setViewportSize({width:390,height:844});await page.locator('#characterPanelClose').click();await page.locator('#studio').click();await page.getByRole('button',{name:'观察餐厅',exact:true}).click();await page.locator('#studioLower').click();await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'dining-mobile.png')});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({errors,room:19,profile:'DIN',plan:state.plan}));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({errors,room:19,profile:'DIN',plan:state.plan},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
