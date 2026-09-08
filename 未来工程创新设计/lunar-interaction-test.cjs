'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm');
const {createHarness}=require('./.codex-review/v7-performance-test.cjs');
const h=createHarness({useBundle:true}),$=h.element,read=h.probeRead;
// Extend only the test DOM; production uses standard DOM methods.
Object.getPrototypeOf($('scheduleTargets')).replaceChildren=function(...children){this.children=children;};
Object.getPrototypeOf($('railToggle')).blur=function(){h.document.activeElement=h.document.body;};
Object.getPrototypeOf($('stage')).getBoundingClientRect=()=>({left:76,top:0,width:1200,height:720,right:1276,bottom:720});
$('floorMaps').parentElement=$('floorPanel');$('floorPanel').className='inspection-stack';$('manual').parentElement=$('floorPanel');
const speedRoot=h.document.createElement('div');speedRoot.className='speed-control';$('speedToggle').parentElement=speedRoot;$('speedMenu').parentElement=speedRoot;for(const rate of [1,2,4,8,16])$('rate'+rate).parentElement=$('speedMenu');
h.context.setTimeout=fn=>{fn();return 1;};$('motionHighlight').checked=true;h.tick();h.settle();
function submit(text){$('scheduleInput').value=text;vm.runInContext("document.getElementById('scheduleForm').onsubmit({preventDefault(){}});",h.context);h.tick();}
const visible=()=>h.scene().getObjectByName('motion-xray-outlines').children.filter(o=>o.visible);
let count=0;
function test(name,fn){fn();count++;console.log('PASS:',name);}
test('Opening cases leaves the default task neutral',()=>{
 $('openMissions').click();assert.ok(h.missions.every(b=>!b.classList.contains('active')));$('openMissions').click();
});
test('Natural input starts empty and reset clears input without changing the layout',()=>{
 assert.match(h.html, /placeholder="例：构建一条直线相连的居住模块、材料模块、通信模块"[^>]*><\/textarea>/);
 const before=JSON.stringify(read().state.layout);$('scheduleInput').value='材料、居住相连';$('scheduleReset').click();assert.equal($('scheduleInput').value,'');assert.equal(JSON.stringify(read().state.layout),before);
});
test('One mission entry and all tools open mutually exclusive left panels',()=>{
 for(const [opener,panel] of [['openMissions','missionPanel'],['openScheduler','schedulerPanel'],['openViews','viewPanel'],['openFloors','floorPanel']]){
  $(opener).click();assert.equal($(panel).hidden,false);
  for(const other of ['missionPanel','schedulerPanel','viewPanel','floorPanel'].filter(p=>p!==panel))assert.equal($(other).hidden,true);
 }
});
test('Natural-language submission starts the current-layout plan and target list',()=>{
 submit('构建一条直线相连的居住模块、材料模块、通信模块');assert.equal(read().playing,true,$('scheduleStatus').textContent);assert.equal($('scheduleTargets').children.length,3);assert.match($('scheduleStatus').textContent,/已生成/);
});
test('Active room has a depth-independent edge outline and matching phase bubble',()=>{
 const phase=read().phases.find(p=>p.type==='elevate');h.seek(phase.start+(phase.end-phase.start)*.5);
 const outlines=visible();assert.equal(outlines.length,1);assert.equal(outlines[0].material.depthTest,false);assert.equal(outlines[0].material.depthWrite,false);assert.equal(outlines[0].renderOrder,1000);
 assert.deepEqual(outlines[0].position.toArray(),read().state.positions[phase.room]);assert.equal($('motionBubble').hidden,false);assert.match($('motionStep').textContent,/内部升降/);
 $('motionHighlight').checked=false;$('motionHighlight').onchange();h.tick();assert.equal(visible().length,0);assert.equal($('motionBubble').hidden,true);assert.equal($('motionLeader').hidden,true);
 $('motionHighlight').checked=true;$('motionHighlight').onchange();h.tick();assert.equal($('motionBubble').hidden,false);
 $('motionHighlight').checked=false;$('motionHighlight').onchange();h.tick();
});
test('A new request cannot replace an in-flight room',()=>{
 const phases=read().phases;submit('材料、居住直线相连');assert.strictEqual(read().phases,phases);assert.match($('scheduleStatus').textContent,/尚未完成/);
});
test('Completion highlights exactly the target modules even with movement x-ray off',()=>{
 h.seek(read().duration);assert.equal(visible().length,3);assert.equal($('motionBubble').hidden,true);
});
test('Already satisfied plan stays docked; invalid subsequent input keeps its error',()=>{
 submit('构建一条直线相连的居住模块、材料模块、通信模块');assert.equal(read().moves.length,0);assert.equal(read().playing,false);assert.equal(visible().length,3);
 submit('居住、火箭、通信直线相连');assert.match($('scheduleStatus').textContent,/未识别/);h.tick();assert.match($('scheduleStatus').textContent,/未识别/);
});
test('Manual mode and reset clear natural targets without unknown-task errors',()=>{
 $('manual').click();h.tick();assert.equal(visible().length,0);$('reset').click();h.tick();assert.equal(read().moves.length,6);assert.equal(visible().length,0);
});
test('Touch/keyboard rail toggle can open and close without trapping focus',()=>{
 $('railToggle').click();assert.equal(h.document.body.classList.contains('rail-open'),true);$('railToggle').click();assert.equal(h.document.body.classList.contains('rail-open'),false);
});
test('In-page speed choices update the actual playback clock and selected state',()=>{
 $('reset').click();h.tick();$('speedToggle').click();assert.equal($('speedMenu').hidden,false);
 for(const rate of [1,2,4,8,16]){
  $('rate'+rate).click();assert.equal($('speed').value,String(rate));assert.equal($('speedToggle').textContent,rate+'×');assert.equal($('rate'+rate).attrs['aria-checked'],'true');assert.equal($('speedMenu').hidden,true);
  h.seek(0);$('play').click();const start=read().time;h.tick(100);assert.ok(Math.abs(read().time-start-rate*.1)<.002);$('play').click();
 }
 $('rate4').click();
});
test('Manual entry transfers by clicking a plus berth without direction buttons',()=>{
 $('reset').click();h.tick();$('openFloors').click();h.tick();assert.equal(read().manualMode,true);assert.doesNotMatch(h.html,/<button[^>]+data-axis=/);
 const cells=$('floorMaps').querySelectorAll().filter(e=>e.dataset.node!==undefined),target=cells.find(e=>e.classList.contains('reachable'));assert.ok(target);assert.equal(target.textContent,'＋');target.click();h.tick();assert.equal(read().playing,true);assert.equal(read().moves.length,1);assert.equal($('manualState').textContent,'搬运中');
 h.document.activeElement=h.document.body;h.dispatch(h.document,'focusout',{target});h.dispatch(h.document,'pointerout',{target,relatedTarget:h.document.body});assert.equal($('floorPanel').hidden,false,'Transfer must keep the dispatch panel open after the target becomes disabled');assert.equal(h.document.body.classList.contains('rail-open'),true);
 h.seek(read().duration);assert.equal($('manualState').textContent,'已选中');
});
test('Leaving manual dispatch restores all floors and overview without resetting the transfer',()=>{
 if($('floorPanel').hidden)$('openFloors').click();
 const floor=$('floorMaps').children[1].children[0];floor.click();h.tick();assert.equal(read().visibleFloor,1);
 const layout=JSON.stringify(read().state.layout),moves=read().moves;
 h.dispatch(h.document,'keydown',{key:'Escape',code:'Escape'});h.tick();
 assert.equal($('floorPanel').hidden,true);assert.equal(read().viewName,'overview');assert.equal(read().visibleFloor,-1);assert.equal(read().manualMode,false);assert.equal(read().moves,moves);assert.equal(JSON.stringify(read().state.layout),layout);
});
test('Roam wheel changes keyboard travel speed without moving the camera by itself',()=>{
 $('roam').click();h.document.activeElement=h.document.body;h.tick();
 const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
 const travel=()=>{const before=read().camera;h.dispatch(h.document,'keydown',{code:'KeyW',key:'w'});for(let i=0;i<10;i++)h.tick(50);h.dispatch(h.document,'keyup',{code:'KeyW',key:'w'});return distance(before,read().camera);};
 const normal=travel(),before=read().camera;h.dispatch(h.renderer.domElement,'wheel',{deltaY:-120,deltaMode:0});h.tick();assert.deepEqual(read().camera,before,'Scrolling adjusts speed without translating');
 const fast=travel();assert.ok(fast>normal*1.2,`${fast} should exceed ${normal}`);
 h.dispatch(h.renderer.domElement,'wheel',{deltaY:240,deltaMode:0});h.tick();const slow=travel();assert.ok(slow<normal*.85,`${slow} should be less than ${normal}`);
 for(let i=0;i<12;i++)h.dispatch(h.renderer.domElement,'wheel',{deltaY:-600,deltaMode:0});assert.match($('toast').textContent,/8\.0×/);
 for(let i=0;i<12;i++)h.dispatch(h.renderer.domElement,'wheel',{deltaY:600,deltaMode:0});assert.match($('toast').textContent,/0\.1×/);
 $('overview').click();h.tick();const zoom=read().distance;h.dispatch(h.renderer.domElement,'wheel',{deltaY:-120,deltaMode:0});h.tick();assert.ok(read().distance<zoom,'Orbit view retains wheel zoom');
});
console.log(`${count}/${count} interaction checks passed (mock DOM/GPU, real bundled code).`);
