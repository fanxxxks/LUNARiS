'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/frank/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const C=require('../src/core/simulation.js'),root=path.resolve(__dirname,'..'),out=path.join(root,'docs/character-handoff-validation');
// Expose simulation stepping only in this test response, never in the built artifact.
const html=fs.readFileSync(path.join(root,'月宫华容_三维仿真软件.html'),'utf8').replace('<head>','<head><meta name="lunaris-session" content="local-regression">').replace('window.LunarisCharacterDiagnostics=()=>fengPeng.export();','window.__handoff={person:fengPeng,snapshot,core:C};window.LunarisCharacterDiagnostics=()=>fengPeng.export();');
let requests=0,delayResponse=0,moveTarget=false;
const server=http.createServer(async(req,res)=>{
 if(req.url==='/api/interpret'){
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=JSON.parse(Buffer.concat(chunks));requests++;
  const floor=C.nodes[body.layout.indexOf(0)].level+1;
  const result={intent:{version:1,interpretation:'验证房间调度交接',goals:[{kind:'zone',rooms:[1],floors:[moveTarget?(floor===1?2:1):floor]}],lockedRooms:[],assumptions:[]}};
  setTimeout(()=>{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(result));},delayResponse);return;
 }
 if(req.url!=='/'){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--force-high-performance-gpu','--use-angle=d3d11']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'}),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{timeout:60000});await page.waitForFunction(()=>window.LunarisCharacterDiagnostics?.().status==='待机');
  await page.locator('#characterPanelToggle').click();await page.locator('#characterAuto').uncheck();
  const read=()=>page.evaluate(()=>window.LunarisCharacterDiagnostics());
  const visit=async(room,deck='lower')=>page.evaluate(async({room,deck})=>{await __handoff.person.dispatch({kind:'character_itinerary',command:'go',visits:[{room,deck,seconds:120,action:'idle'}]});},{room,deck});
  const submit=async()=>{if(!await page.locator('#scheduleInput').isVisible())await page.locator('#openScheduler').click();await page.locator('#scheduleInput').fill('将 R01 放到指定楼层');await page.locator('#scheduleSubmit').click();};
  const accepted=async()=>{await page.waitForFunction(()=>!document.querySelector('#scheduleSubmit').disabled,{},{timeout:30000});assert.equal(await page.locator('#scheduleStatus').evaluate(e=>e.classList.contains('bad')),false,await page.locator('#scheduleStatus').textContent());};
  // Old code kept pending stop until the lower foyer, missing the final cabin leg.
  await visit(2);await page.evaluate(()=>__handoff.person.tick(.3));
  assert.ok((await read()).busy);await page.locator('#characterStop').click();let state=await read();
  assert.equal(state.busy,false);assert.equal(state.pendingCommand,null);assert.deepEqual(state.visits,[]);assert.equal(state.plan,null);
  const stoppedPosition=state.position;await page.evaluate(()=>__handoff.person.tick(2));assert.deepEqual((await read()).position,stoppedPosition);checks.push('stop on final in-cabin leg clears task immediately');
  await submit();await accepted();checks.push('room request succeeds after Stop');
  // Pause on a ladder, then submit a room request: finish climbing before handing over.
  await visit(2,'upper');await page.evaluate(()=>{for(let i=0;i<300;i++){__handoff.person.tick(.1);const y=__handoff.person.state.position[1];if(y>17&&y<39)break;}});
  assert.ok((await read()).position[1]>17&&(await read()).position[1]<39);await page.locator('#characterPause').click();assert.equal((await read()).paused,true);
  const beforeRequests=requests;await submit();state=await read();assert.equal(state.roomScheduling,true);assert.equal(state.pendingCommand,'stop');assert.equal(state.paused,false);assert.equal(requests,beforeRequests);
  await page.evaluate(()=>{for(let i=0;i<400&&__handoff.person.busy();i++)__handoff.person.tick(.1);});await accepted();state=await read();
  assert.equal(state.busy,false);assert.equal(state.roomScheduling,false);assert.ok(Math.abs(state.position[1]-43.08)<.1);assert.equal(state.pendingCommand,null);checks.push('paused ladder traversal safely completes before room scheduling');
  // A paused activity can also yield immediately, with no stale itinerary after Resume.
  await visit(2,'upper');await page.evaluate(()=>{for(let i=0;i<300&&__handoff.person.state.status!=='到达活动';i++)__handoff.person.tick(.1);});
  await page.locator('#characterPause').click();await submit();await accepted();assert.equal((await read()).busy,false);checks.push('paused upper-deck activity yields to room scheduling');
  // Cancel a real in-flight worker and settle the pending dispatch instead of leaking it.
  await page.evaluate(()=>{window.cancelledDispatch=__handoff.person.dispatch({kind:'character_itinerary',command:'go',visits:[{room:3,seconds:120,action:'idle',deck:'lower'}]});});
  assert.equal((await read()).planning,true);await page.locator('#characterStop').click();
  await page.evaluate(()=>Promise.race([window.cancelledDispatch,new Promise((_,reject)=>setTimeout(()=>reject(Error('Cancelled dispatch never settled')),1000))]));
  assert.equal((await read()).busy,false);checks.push('Stop cancels worker and settles its pending dispatch');
  // Stop while carrying a room: preserve the physical move until its first docking boundary.
  await visit(3);assert.equal((await read()).transferring,true);await page.evaluate(()=>__handoff.person.tick(.4));
  await page.locator('#characterPause').click();await page.locator('#characterStop').click();state=await read();assert.equal(state.paused,false);assert.equal(state.pendingCommand,'stop');assert.equal(state.transferring,true);
  await page.evaluate(()=>{for(let i=0;i<3000&&__handoff.person.transferring;i++)__handoff.person.tick(.1);});state=await read();
  assert.equal(state.transferring,false);assert.equal(state.busy,false);assert.equal(state.pendingCommand,null);assert.deepEqual(state.visits,[]);
  const dock=await page.evaluate(()=>({connected:__handoff.snapshot().connected,unavailable:__handoff.snapshot().unavailableRooms}));assert.equal(dock.connected,true);assert.deepEqual(dock.unavailable,[]);
  await submit();await accepted();checks.push('paused room transport stops at docking and unblocks next request');
  // Keep autonomous planning out of the model/worker interval.
  delayResponse=400;await page.evaluate(()=>{__handoff.person.state.auto=true;__handoff.person.state.idle=1000;});
  await submit();await page.evaluate(()=>{for(let i=0;i<10;i++)__handoff.person.tick(.25);});state=await read();assert.equal(state.roomScheduling,true);assert.equal(state.busy,false);await accepted();checks.push('autonomous activity cannot reclaim the scene during room planning');
  // Run an actual room move after the successful handoff.
  delayResponse=0;moveTarget=true;await submit();await accepted();assert.ok(Number(await page.locator('#total').textContent())>0);assert.match(await page.locator('#phase').textContent(),/自然语言调度/);checks.push('real room transport starts after handoff');
  await page.screenshot({path:path.join(out,'room-scheduling.png')});assert.deepEqual(errors,[]);
  const report={checks,errors,requests,character:await read()};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks,errors,requests}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
