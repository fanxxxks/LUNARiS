'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/frank/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--force-high-performance-gpu','--use-angle=d3d11']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  // Accelerate only the simulation delta in this test response. Production RAF,
  // navigation, worker planning and transport completion remain unchanged.
  await page.route('http://127.0.0.1:8791/',async route=>{const response=await route.fetch();const html=await response.text();assert.ok(html.includes('fengPeng?.tick(Math.min(.25,realDt))'));await route.fulfill({response,body:html.replace('fengPeng?.tick(Math.min(.25,realDt))','fengPeng?.tick(.25)')});});
  await page.goto('http://127.0.0.1:8791/',{timeout:60000});await page.waitForFunction(()=>window.LunarisCharacterDiagnostics?.().status==='待机');
  await page.locator('#characterPanelToggle').click();await page.locator('#characterIdle').fill('5');
  await page.waitForFunction(()=>window.LunarisCharacterDiagnostics().history.filter(e=>e.event==='arrived').length>=4,{},{timeout:120000});
  await page.locator('#characterPause').click();const state=await page.evaluate(()=>window.LunarisCharacterDiagnostics());
  const plans=[];let lastPlan;for(const e of state.history){if(e.event==='plan')lastPlan=e;if(e.event==='arrived')plans.push(lastPlan);}
  assert.ok(plans.length>=4);for(let i=1;i<plans.length;i++)assert.ok(plans[i-1].moves>0||plans[i].moves>0,'each consecutive pair must include transport');
  assert.equal(state.history.filter(e=>e.event==='planning-failed').length,0);assert.deepEqual(errors,[]);
  // Explicit scene navigation releases follow ownership instead of letting the
  // next frame overwrite all-floor selection again.
  await page.locator('#characterFocus').click();await page.waitForTimeout(300);
  await page.locator('#overview').evaluate(b=>b.click());await page.waitForTimeout(500);
  let view=await page.evaluate(()=>window.LunarisCharacterDiagnostics().view);assert.deepEqual([view.follow,view.floor,view.visibleRooms],[false,-1,24]);
  await page.locator('#characterFocus').click();await page.waitForTimeout(300);
  await page.locator('.floor-select').nth(3).evaluate(b=>b.click());await page.waitForTimeout(500);
  view=await page.evaluate(()=>window.LunarisCharacterDiagnostics().view);assert.equal(view.follow,false);assert.equal(view.floor,3);
  const report={errors,completedPlans:plans,view};fs.writeFileSync(path.resolve(__dirname,'../docs/character-validation/cadence-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
