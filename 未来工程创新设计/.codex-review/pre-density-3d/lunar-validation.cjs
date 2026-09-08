/* Logic/scene smoke test with a minimal DOM and renderer stub; NOT visual QA. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('月宫华容_三维仿真软件.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);scripts.forEach((s,i)=>new vm.Script(s,{filename:`embedded-${i}`}));assert.equal(scripts.length,3);
class Element{
 constructor(id=''){this.id=id;this.style={};this.children=[];this.dataset={};this.hidden=false;this.disabled=false;this.value='';this.checked=false;this.clientWidth=1100;this.clientHeight=760;this.tagName='DIV';this._classes=new Set();this.classList={add:x=>this._classes.add(x),remove:x=>this._classes.delete(x),contains:x=>this._classes.has(x),toggle:(x,on)=>{if(on===undefined)on=!this._classes.has(x);on?this._classes.add(x):this._classes.delete(x);return on;}};}
 appendChild(c){this.children.push(c);return c;}addEventListener(){}setAttribute(){}setPointerCapture(){}focus(){document.activeElement=this;}click(){this.onclick?.({target:this});}
 getContext(){return {fillText(){},clearRect(){}};}
 set innerHTML(s){this._html=s;if(this.id==='target')this.children=Array.from({length:8},()=>new Element());}
 get innerHTML(){return this._html;}
 querySelectorAll(){return this.children;}
}
const ids=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],new Element(m[1])]));
const document={getElementById:id=>{assert.ok(ids.has(id),'missing ID '+id);return ids.get(id);},createElement:()=>new Element(),body:new Element(),activeElement:new Element(),addEventListener(){},querySelectorAll:()=>missions};
const missions=['swap','science','service'].map(task=>{const e=new Element();e.dataset.task=task;return e;});
ids.get('labels').checked=true;ids.get('speed').value='2';ids.get('settings').hidden=true;
let frame=null,sceneObserved,renderCalls=0;
const context={console,document,devicePixelRatio:1,performance:{now:()=>0},setTimeout:()=>1,clearTimeout(){},ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>frame=fn,URL:{createObjectURL:()=>'',revokeObjectURL(){}},Blob};context.window=context;vm.createContext(context);
vm.runInContext(scripts[0],context);context.THREE.WebGLRenderer=class{constructor(){this.shadowMap={};this.domElement=new Element();}setPixelRatio(){}setClearColor(){}setSize(){}render(s){sceneObserved=s;renderCalls++;}};
vm.runInContext(scripts[1],context);vm.runInContext(scripts[2],context);
let clock=0;const tick=()=>{clock+=16.667;frame(clock);};tick();assert.equal(ids.get('play').disabled,false);assert.match(ids.get('phase').textContent,/已就绪/);assert.equal(ids.get('moveCount').textContent,3);
let meshes=0,triangles=0;sceneObserved.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});assert.ok(meshes>20);assert.ok(triangles>10000);
missions[0].click();tick();assert.equal(ids.get('play').textContent,'暂停演示');ids.get('play').click();tick();assert.equal(ids.get('play').textContent,'继续演示');
ids.get('closeup').click();for(let i=0;i<90;i++)tick();ids.get('mechanism').click();tick();assert.match(ids.get('phase').textContent,/机构剖视/);ids.get('play').click();tick();assert.equal(ids.get('play').textContent,'暂停演示');
ids.get('stop').click();tick();assert.equal(ids.get('play').textContent,'解除急停');assert.equal(ids.get('timeline').disabled,true);ids.get('play').click();tick();assert.equal(ids.get('timeline').disabled,false);
for(const mission of missions){mission.click();tick();assert.equal(ids.get('play').textContent,'暂停演示');ids.get('timeline').oninput({target:{value:ids.get('timeline').max}});tick();assert.match(ids.get('phase').textContent,/重构完成/);assert.equal(ids.get('completed').textContent,ids.get('moveCount').textContent);}
ids.get('block').checked=true;ids.get('block').onchange();tick();assert.equal(ids.get('play').disabled,false);
ids.get('presentation').click();assert.equal(ids.get('exitImmersion').hidden,false);ids.get('exitImmersion').click();assert.equal(ids.get('exitImmersion').hidden,true);
ids.get('target').children.forEach(e=>e.value='0');ids.get('apply').click();tick();assert.equal(ids.get('play').disabled,true);assert.match(ids.get('toast').textContent,/必须且只能出现一次/);
console.log(`PASS: scripts, scene build (${meshes} meshes, ${Math.round(triangles)} triangles), ready state, one-click missions, pause, closeup, cutaway, stop/resume, endpoints, blockage, immersive exit, duplicate rejection. Renderer mocked; no visual or real-browser verification.`);
