'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm');
const {createHarness}=require('./.codex-review/v7-performance-test.cjs');
const h=createHarness({useBundle:true}),$=h.element,read=h.probeRead;
// Extend only the test DOM; production uses standard DOM methods.
Object.getPrototypeOf($('scheduleTargets')).replaceChildren=function(...children){this.children=children;};
Object.getPrototypeOf($('railToggle')).blur=function(){h.document.activeElement=h.document.body;};
Object.getPrototypeOf($('stage')).getBoundingClientRect=()=>({left:76,top:0,width:1200,height:720,right:1276,bottom:720});
$('floorPanel').className='inspection-stack';$('manual').parentElement=$('floorPanel');
const speedRoot=h.document.createElement('div');speedRoot.className='speed-control';$('speedToggle').parentElement=speedRoot;$('speedMenu').parentElement=speedRoot;for(const rate of [1,2,4,8,16])$('rate'+rate).parentElement=$('speedMenu');
h.context.setTimeout=fn=>{fn();return 1;};$('motionHighlight').checked=true;h.tick();h.settle();
function submit(text){$('scheduleInput').value=text;vm.runInContext("document.getElementById('scheduleForm').onsubmit({preventDefault(){}});",h.context);h.tick();}
const visible=()=>h.scene().getObjectByName('motion-xray-outlines').children.filter(o=>o.visible);
let count=0;
function test(name,fn){fn();count++;console.log('PASS:',name);}
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
 $('motionHighlight').checked=false;$('motionHighlight').onchange();h.tick();assert.equal(visible().length,0);assert.equal($('motionBubble').hidden,false);
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
test('Manual entry enables immediate directions without a second mode button',()=>{
 $('reset').click();h.tick();$('openFloors').click();h.tick();assert.equal(read().manualMode,true);assert.equal($('manualControls').hidden,false);
 const right=h.axes.find(b=>b.dataset.axis==='0'&&b.dataset.sign==='1');assert.equal(right.disabled,false);right.click();h.tick();assert.equal(read().playing,true);assert.equal(read().moves.length,1);assert.equal($('manualState').textContent,'搬运中');
 h.seek(read().duration);assert.equal($('manualState').textContent,'已选中');
});
console.log(`${count}/${count} interaction checks passed (mock DOM/GPU, real bundled code).`);
