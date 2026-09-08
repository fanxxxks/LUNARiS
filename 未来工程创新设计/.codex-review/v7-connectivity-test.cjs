/* V7 geometry / connectivity / traffic regression. Real Three geometry, no GPU.
 * Run: node .codex-review/v7-connectivity-test.cjs
 * This is not a photometric, structural, airtightness or GPU frame-rate test. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const context={console,C:require(path.join(root,'simulation-core.js'))};vm.createContext(context);vm.runInContext(read('vendor/three.min.js'),context);
const source=read('lunar-scene.js'),helpers=source.slice(source.indexOf('function mesh('),source.indexOf('const craters=')),astronaut=source.match(/function astronaut\([^\n]+/)[0],palette=source.match(/const roomPalette=[^\n]+/)[0];
vm.runInContext(`const T=THREE,station=new T.Group(),renderer={shadowMap:{needsUpdate:false}},roughMap=null,alloyMap=null,coatingDetail=null,coatingNormal=null,mats={},cutaway=false,typeCodes=['A','B','C','D','E','F'];
for(const key of ['dark','silver','gold','hull','innerWall','rubber','glass','pale','warm','cool','plant','interior','glassDark','solar','insulation'])mats[key]=new T.MeshStandardMaterial({color:'white',side:T.DoubleSide,transparent:key==='glass'});
let matrixWrites=0;const originalMatrix=T.InstancedMesh.prototype.setMatrixAt;T.InstancedMesh.prototype.setMatrixAt=function(i,m){matrixWrites++;return originalMatrix.call(this,i,m);};
`+palette+'\n'+helpers+astronaut+'\nconst personnelReferenceHeights=[],actualAstronaut=astronaut;astronaut=(...args)=>{const g=actualAstronaut(...args);personnelReferenceHeights.push(new T.Box3().setFromObject(g).getSize(new T.Vector3()).y);return g;};\nfunction decal(parent,text,w,h,x,y,z,rotation=0){const m=mesh(parent,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({side:T.DoubleSide}),x,y,z);m.rotation.x=rotation;return m;}\n'+read('lunar-modules.js')+'\n'+read('lunar-model-profiles.js')+'\nfunction texture(){return new T.Texture();}\n'+read('lunar-connectivity.js'),context);
const run=code=>vm.runInContext(code,context),results=[];
function test(name,fn){try{fn();results.push({name,passed:true});console.log('PASS',name);}catch(e){results.push({name,passed:false});console.error('FAIL',name,e.stack||e.message);}}
run(`const geometries=[];for(let type=0;type<8;type++){const parts=moduleParts(0,type);for(const m of parts){m.geometry.scale(C.config.moduleScaleXZ,1,C.config.moduleScaleXZ);m.geometry.computeBoundingSphere();}geometries.push(parts);}`);
let inventory,peakDynamicTriangles=0,peakDynamicState;
test('All eight reference module profiles fit the configured 115 x 78 x 105 transport envelope',()=>{
 inventory=JSON.parse(run(`JSON.stringify(geometries.map((parts,type)=>{const bounds=new T.Box3();let triangles=0;for(const m of parts){m.geometry.computeBoundingBox();bounds.union(m.geometry.boundingBox);triangles+=(m.geometry.index?m.geometry.index.count:m.geometry.attributes.position.count)/3;}return {type,triangles,min:bounds.min.toArray(),max:bounds.max.toArray()};}))`));
 const {width,height,depth}=context.C.config;for(const a of inventory){assert.ok(a.min[0]>=-width/2-1e-5&&a.max[0]<=width/2+1e-5);assert.ok(a.min[1]>=-1e-5&&a.max[1]<=height+1e-5);assert.ok(a.min[2]>=-depth/2-1e-5&&a.max[2]<=depth/2+1e-5);}
});

test('Eight visual profiles retain distinct equipment, signal colors and human-scale interiors',()=>{
 const result=JSON.parse(run(`JSON.stringify(geometries.map((parts,type)=>({accent:parts.some(m=>m.material.color?.equals(new T.Color(moduleProfiles()[type].color))),interior:JSON.stringify(parts.filter(m=>m.userData.layer==='interior').map(m=>Array.from(m.geometry.attributes.position.array))),personHeight:personnelReferenceHeights[type]*C.config.metresPerUnit})))`));
 assert.equal(result.length,8);assert.ok(result.every(r=>r.accent));
 assert.equal(new Set(result.map(r=>r.interior)).size,8,'Each reference has a distinct equipment arrangement');
 assert.ok(result.every(r=>r.personHeight>=1.5&&r.personHeight<=1.9));
});
test('Six actual hatch throats are unobstructed by every module skin',()=>{
 const hits=JSON.parse(run(`JSON.stringify(geometries.map(parts=>{const shell=parts.filter(m=>m.userData.layer==='skin');return Object.entries(C.portOffsets).map(([name,p])=>{const axis={X:0,Y:1,Z:2}[name[1]],d=[0,0,0],o=p.slice();d[axis]=name[0]==='+'?-1:1;o[axis]-=2*d[axis];return new T.Raycaster(new T.Vector3(...o),new T.Vector3(...d),0,8).intersectObjects(shell,false).length;});}))`));
 assert.ok(hits.flat().every(n=>n===0),JSON.stringify(hits));
});
test('Vertical vestibule passes through the roof, both occupied decks and base',()=>{
 const hits=JSON.parse(run(`JSON.stringify(geometries.map(parts=>new T.Raycaster(new T.Vector3(C.portOffsets['+Y'][0],77.5,C.portOffsets['+Y'][2]),new T.Vector3(0,-1,0),0,78).intersectObjects(parts,false).length))`));
 assert.ok(hits.every(n=>n===0),JSON.stringify(hits));
});
test('Initial sleeves only join adjacent occupied rooms and no-op on repeated state',()=>{
 const result=JSON.parse(run(`JSON.stringify((()=>{const st=C.state(C.initial,[],0);const first=updateConnectivity(st,{showLinks:true,visibleFloor:-1});const writes=matrixWrites;renderer.shadowMap.needsUpdate=false;const second=updateConnectivity(st,{showLinks:true,visibleFloor:-1});return {first,second,writes:matrixWrites-writes,shadow:renderer.shadowMap.needsUpdate,expected:C.connections(C.initial).length};})())`));
 assert.equal(result.first.connections,result.expected);assert.equal(result.expected,25);assert.equal(result.second.changed,false);assert.equal(result.writes,0);assert.equal(result.shadow,false);
});
test('Every task can be sampled through disconnect, movement and target reconnection',()=>{
 const check=JSON.parse(run(`JSON.stringify((()=>{let samples=0,midMove=0,dock=0,peak=0,peakState;for(const name of Object.keys(C.missions)){const plan=C.preset(name),tl=C.timeline(plan.moves);for(let i=0;i<=180;i++){const st=C.state(C.initial,tl.phases,tl.duration*i/180);updateConnectivity(st,{showLinks:true,visibleFloor:-1});const s=connectivityCache();if(st.phase&&st.connectionProgress===0){if(s.links.some(e=>e.roomA===st.phase.room||e.roomB===st.phase.room))throw Error('moving room retains a connection');midMove++;}if(st.type==='dock'){if(s.effectiveLayout[st.phase.to]!==st.phase.room)throw Error('dock sleeves use source layout');dock++;}let triangles=0;for(const m of [s.leaf,s.inset,s.handle,s.shell,s.ribs,s.glass]){triangles+=12*m.count;if(m.count>m.instanceMatrix.count)throw Error('instance capacity exceeded');for(let k=0;k<m.count*16;k++)if(!Number.isFinite(m.instanceMatrix.array[k]))throw Error('nonfinite matrix');}if(triangles>peak){peak=triangles;peakState={mission:name,type:st.type,moveIndex:st.phase?.moveIndex};}samples++;}}return {samples,midMove,dock,peak,peakState};})())`));
 peakDynamicTriangles=check.peak;peakDynamicState=check.peakState;
 assert.ok(check.midMove>0&&check.dock>0);console.log('  state samples',check);
});
test('Heatmap uses floor areas, continuous vertex values and directional GPU particles',()=>{
 const check=JSON.parse(run(`JSON.stringify((()=>{updateConnectivity(C.state(C.initial,[],0),{showLinks:true});const data=C.traffic(C.initial,{demand:120,scenario:'commute'});const result=updateTrafficVisual(data,{visible:true,time:0,visibleFloor:-1});const s=trafficVisualCache(),values=Array.from(s.geometry.attributes.density.array.slice(0,result.vertices));return {...result,range:[Math.min(...values),Math.max(...values)],unique:new Set(values.map(v=>v.toFixed(4))).size};})())`));
 assert.ok(check.vertices>5000&&check.vertices<24000);assert.ok(check.particles>0&&check.particles<=4096);assert.ok(check.unique>12);assert.ok(check.range[1]>check.range[0]);assert.equal(check.maxFlow,120);
});
test('Unchanged traffic only updates time uniforms; no geometry, matrix or shadow writes',()=>{
 const check=JSON.parse(run(`JSON.stringify((()=>{const data=C.traffic(C.initial,{demand:120,scenario:'commute'}),s=trafficVisualCache(),versions=[...Object.values(s.geometry.attributes),...Object.values(s.pg.attributes)].map(a=>a.version),writes=matrixWrites;renderer.shadowMap.needsUpdate=false;const result=updateTrafficVisual(data,{visible:true,time:2.5,visibleFloor:-1});return {result,same:versions.every((v,i)=>v===[...Object.values(s.geometry.attributes),...Object.values(s.pg.attributes)][i].version),writes:matrixWrites-writes,shadow:renderer.shadowMap.needsUpdate,time:s.pm.uniforms.uTime.value};})())`));
 assert.equal(check.result.changed,false);assert.equal(check.same,true);assert.equal(check.writes,0);assert.equal(check.shadow,false);assert.equal(check.time,2.5);
});
test('Geometry budget is bounded without removing the hatches or interiors',()=>{
 const C=context.C,profiles=C.roomTypes.map(t=>[5,3,0,2,5,7][t]),roomTriangles=profiles.map((t,id)=>({13:1,19:4,11:6})[id]??t).reduce((sum,t)=>sum+inventory[t].triangles,0),dynamicTriangles=run(`(()=>{const s=connectivityCache();return [s.leaf,s.inset,s.handle,s.shell,s.ribs,s.glass].reduce((n,m)=>n+12*m.count,0);})()`);
 console.log('  geometry inventory',JSON.stringify({roomTriangles,dynamicTriangles,peakDynamicTriangles,peakDynamicState,heatTriangles:run('trafficVisualCache().vertices/3'),perType:inventory.map(a=>a.triangles),note:'Decal geometry is included. The separate room identity batch is covered by lunar-validation total budget; terrain/frame are excluded.'}));
 assert.ok(roomTriangles<=230000,'module triangle budget exceeded: '+roomTriangles);assert.ok(Math.max(dynamicTriangles,peakDynamicTriangles)<=22000,'connector triangle budget exceeded: '+Math.max(dynamicTriangles,peakDynamicTriangles));
});
test('Clear and dispose release owned geometry and remove both scene groups',()=>{
 const check=JSON.parse(run(`JSON.stringify((()=>{clearConnectivity();clearTrafficVisual();const empty=connectivityCache().leaf.count===0&&trafficVisualCache().geometry.drawRange.count===0;disposeConnectivity();disposeTrafficVisual();return {empty,children:station.children.length,disposed:!connectivityCache.value&&!trafficVisualCache.value};})())`));
 assert.equal(check.empty,true);assert.equal(check.children,0);assert.equal(check.disposed,true);
});
console.log(JSON.stringify({passed:results.filter(t=>t.passed).length,total:results.length,note:'CPU geometry and cache verification only; browser visual QA and GPU measurements remain separate.'}));
if(results.some(t=>!t.passed))process.exitCode=1;
