'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/frank/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true,args:['--force-high-performance-gpu','--use-angle=d3d11']});try{
 const page=await browser.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'}),errors=[],out=path.resolve(__dirname,'../docs/gym-validation');fs.mkdirSync(out,{recursive:true});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8791/',{timeout:60000});await page.waitForFunction(()=>window.LunarisCharacterDiagnostics?.().status==='待机');
 await page.locator('#characterPanelToggle').click();await page.locator('#characterAuto').uncheck();await page.locator('#characterPanelClose').click();
 await page.locator('#studio').click();await page.getByRole('button',{name:'观察健身房',exact:true}).click();assert.equal(await page.locator('#studioTitle').textContent(),'健身房');assert.equal(await page.locator('#studioCode').textContent(),'GYM');
 await page.locator('#studioLower').click();await page.waitForTimeout(800);await page.screenshot({path:path.join(out,'gym-lower.png')});assert.match(await page.locator('#studioCaption').textContent(),/乒乓球/);
 await page.locator('#studioUpper').click();await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'gym-upper.png')});assert.match(await page.locator('#studioCaption').textContent(),/哑铃/);
 await page.locator('#studioExterior').click();await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'gym-exterior.png')});
 await page.locator('#exitStudio').click();await page.locator('#characterPanelToggle').click();await page.locator('#characterExample').click();await page.locator('#scheduleInput').fill('冯院长去健身房停留 5 秒');await page.locator('#scheduleSubmit').click();
 await page.waitForFunction(()=>window.LunarisCharacterDiagnostics().plan?.destination===22,{},{timeout:20000});await page.locator('#characterPause').click();const state=await page.evaluate(()=>window.LunarisCharacterDiagnostics());assert.match(state.thought,/想|缓/);
 await page.setViewportSize({width:390,height:844});await page.locator('#characterPanelClose').click();await page.locator('#studio').click();await page.getByRole('button',{name:'观察健身房',exact:true}).click();await page.locator('#studioLower').click();await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'gym-mobile.png')});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({errors,room:23,profile:'GYM',plan:state.plan}));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({errors,room:23,profile:'GYM',plan:state.plan},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
