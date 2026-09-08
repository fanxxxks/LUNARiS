/* Actual V7 scene audit for personnel hatches, short connectors and floor holes.
 * Run: node .codex-review/v7-personnel-clearance.cjs
 * Uses the production geometry via the V7 harness. Finite ray grids are geometric
 * regression evidence, not swept-body, accessibility or airtightness certification. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const filename=path.join(__dirname,'v7-performance-test.cjs');
let source=fs.readFileSync(filename,'utf8');
source=source.replace('rendering: () => ({ targetRT,',`personnel: () => ({frameLevels,posts,foundations,elevators,shaftVisuals,parkedPallets,station,moduleBatches,
    apply: st => {updateInstances(st.positions,-1,false,st.orientations,-1);updateMechanism(st,-1,false);updateConnectivity(st,{showLinks:true,visibleFloor:-1,sectionRoom:-1});scene.updateMatrixWorld(true);const c=connectivityCache();for(const m of [c.leaf,c.inset,c.handle])m.computeBoundingSphere();return c;}}),
  rendering: () => ({ targetRT,`);
const loader=new Module(filename,module);loader.filename=filename;loader.paths=Module._nodeModulePaths(__dirname);loader._compile(source,filename);
const h=loader.exports.createHarness(),T=h.context.THREE,C=h.context.LunarCore,probe=h.context.__performanceProbe,audit=probe.personnel();h.settle();h.scene().updateMatrixWorld(true);
const scaleXZ=C.config.moduleScaleXZ,sleeveHalf=8.525*scaleXZ,well=C.portOffsets['+Y'];
const findings=[],results=[],rayStats={frame:0,pallet:0,openDoor:0,closedDoor:0,ladder:0};
function test(name,fn){try{fn();results.push({name,passed:true});console.log('PASS',name);}catch(e){results.push({name,passed:false});console.error('FAIL',name,e.message);}}
function meshes(groups){const out=[];for(const g of groups)g.traverse(o=>{if(o.isMesh)out.push(o);});return out;}
const staticMeshes=meshes([...audit.frameLevels,audit.posts,...Object.values(audit.shaftVisuals)]);
function hits(objects,start,end){const delta=new T.Vector3(...end).sub(new T.Vector3(...start)),len=delta.length();if(len<1e-7)return [];return new T.Raycaster(new T.Vector3(...start),delta.normalize(),.002,len-.002).intersectObjects(objects,false);}
function detail(hit){return {object:hit.object.name||hit.object.parent?.name||hit.object.type,point:hit.point.toArray().map(x=>+x.toFixed(4)),distance:+hit.distance.toFixed(4),instanceId:hit.instanceId};}
function grid(center,y0,y1,extent=sleeveHalf,steps=8,objects=staticMeshes,kind='frame'){
 const found=[];for(let xi=0;xi<=steps;xi++)for(let zi=0;zi<=steps;zi++){
  const x=center[0]-extent+2*extent*xi/steps,z=center[1]-extent+2*extent*zi/steps;rayStats[kind]++;
  const collisions=hits(objects,[x,y0,z],[x,y1,z]);if(collisions.length)found.push({x,z,...detail(collisions[0])});
 }return found;
}
function fixture(assignments){const layout=Array.from(C.initial);for(const [room,to] of assignments){const from=layout.indexOf(room),other=layout[to];if(from===to)continue;layout[from]=other;layout[to]=room;}return C.state(layout,[],0);}
const verticalPairs=[];for(const a of C.nodes){const b=C.bay(a.level+1,a.col,a.row);if(b!==undefined)verticalPairs.push([a.id,b]);}
test('All potential adjacent vertical bays clear the enlarged sleeve envelope',()=>{
 const blocked=[];for(const [a,b] of verticalPairs){const low=C.slots[a],up=C.slots[b],f=grid([low[0]+well[0],low[2]+well[2]],low[1]+well[1]+.01,up[1]+C.portOffsets['-Y'][1]-.01);if(f.length)blocked.push({lower:C.nodes[a].label,upper:C.nodes[b].label,hits:f});}
 findings.push(...blocked.map(x=>({kind:'frame-hole',...x})));assert.equal(blocked.length,0,JSON.stringify(blocked.slice(0,3)));
 console.log('  vertical adjacency pairs',verticalPairs.length,'grid rays',rayStats.frame);
});
test('Deployed cargo pallets and parked supports leave each bottom personnel hatch clear',()=>{
 const blocked=[];
 for(const shaft of C.shafts)for(const level of shaft.levels){const node=C.lift(level,shaft.id),p=C.slots[node],st=fixture([[0,node]]);
  for(const carrierHere of [true,false]){
   st.elevators[shaft.id]={y:carrierHere?p[1]:(p[1]===shaft.minY?shaft.maxY:shaft.minY),retracted:0};audit.apply(st);
   const objects=[...staticMeshes,...meshes([audit.elevators[shaft.id],...audit.parkedPallets.filter(g=>g.userData.node===node&&g.visible)])];
   const f=grid([p[0]+well[0],p[2]+well[2]],p[1]-8.5,p[1]+C.portOffsets['-Y'][1]-.01,sleeveHalf,8,objects,'pallet');if(f.length)blocked.push({node:C.nodes[node].label,carrierHere,hits:f});
  }
 }
 findings.push(...blocked.map(x=>({kind:'cargo-pallet-hole',...x})));assert.equal(blocked.length,0,JSON.stringify(blocked.slice(0,3)));
 console.log('  cargo positions',C.shafts.reduce((n,s)=>n+s.levels.length,0),'pallet/support rays',rayStats.pallet);
});
const faces=[{axis:0,sign:1,p:C.portOffsets['+X'],rot:[0,Math.PI/2,0]},{axis:0,sign:-1,p:C.portOffsets['-X'],rot:[0,-Math.PI/2,0]},{axis:2,sign:1,p:C.portOffsets['+Z'],rot:[0,0,0]},{axis:2,sign:-1,p:C.portOffsets['-Z'],rot:[0,Math.PI,0]},{axis:1,sign:1,p:C.portOffsets['+Y'],rot:[-Math.PI/2,0,0]},{axis:1,sign:-1,p:C.portOffsets['-Y'],rot:[Math.PI/2,0,0]}];
function doorRays(cache,base,face,kind){const q=new T.Quaternion().setFromEuler(new T.Euler(...face.rot)),uValues=[-5,-2.5,0,2.5,5].map(v=>v*scaleXZ),vValues=face.axis===1?uValues:[-9,-4.5,0,4.5,9],normalScale=face.axis===1?1:scaleXZ,objects=[cache.leaf,cache.inset,cache.handle,...audit.moduleBatches.map(b=>b.mesh)],samples=[];objects.forEach(m=>m.computeBoundingSphere?.());
 for(const u of uValues)for(const v of vValues){const origin=new T.Vector3(u,v,2*normalScale).applyQuaternion(q).add(new T.Vector3(...base)).add(new T.Vector3(...face.p)),end=new T.Vector3(u,v,-4*normalScale).applyQuaternion(q).add(new T.Vector3(...base)).add(new T.Vector3(...face.p));const collisions=hits(objects,origin.toArray(),end.toArray());rayStats[kind]++;samples.push({u,v,blocked:collisions.length>0,hit:collisions.length?detail(collisions[0]):null});}return samples;
}
test('Every functional room type has six unobstructed fully open doorway grids',()=>{
 const blocked=[];for(let type=0;type<6;type++)for(const face of faces){const room=C.roomTypes.indexOf(type),other=(room+1)%24;let pair;
  for(const n of C.nodes){const neighbor=C.neighbor(n.id,face.axis,face.sign);if(neighbor!==undefined){pair=[n.id,neighbor];break;}}
  assert.ok(pair,'missing candidate face');const st=fixture([[room,pair[0]],[other,pair[1]]]),cache=audit.apply(st),samples=doorRays(cache,C.slots[pair[0]],face,'openDoor').filter(p=>p.blocked);if(samples.length)blocked.push({type,axis:face.axis,sign:face.sign,hits:samples});
 }
 findings.push(...blocked.map(x=>({kind:'open-door',...x})));assert.equal(blocked.length,0,JSON.stringify(blocked.slice(0,3)));
});
test('Closed dual leaves occlude the sampled doorway, including the center seam',()=>{
 const leaks=[];for(let type=0;type<6;type++)for(const face of faces){const room=C.roomTypes.indexOf(type),other=(room+1)%24;let pair;
  for(const n of C.nodes){const neighbor=C.neighbor(n.id,face.axis,face.sign);if(neighbor!==undefined){pair=[n.id,neighbor];break;}}
  const st=fixture([[room,pair[0]],[other,pair[1]]]);st.phase={room,from:pair[0],to:pair[1]};st.active=room;st.type='unlock';st.connectionProgress=1;st.doorClosure=1;const cache=audit.apply(st),samples=doorRays(cache,C.slots[pair[0]],face,'closedDoor').filter(p=>!p.blocked);if(samples.length)leaks.push({type,axis:face.axis,sign:face.sign,clearRays:samples});
 }
 findings.push(...leaks.map(x=>({kind:'closed-door-seam',...x})));assert.equal(leaks.length,0,JSON.stringify(leaks.slice(0,3)));
});
test('An occupied middle room retains a central ladder passage through both internal floors',()=>{
 const node=C.bay(1,-1,-1),below=C.bay(0,-1,-1),above=C.bay(2,-1,-1),blocked=[];
 for(let type=0;type<6;type++){const room=C.roomTypes.indexOf(type),st=fixture([[room,node],[(room+1)%24,below],[(room+2)%24,above]]);const cache=audit.apply(st),p=C.slots[node],objects=audit.moduleBatches.map(b=>b.mesh).concat(cache.leaf,cache.inset,cache.handle);objects.forEach(m=>m.computeBoundingSphere?.());
  for(const dx of [-3,0,3].map(v=>v*scaleXZ))for(const dz of [-3,0,3].map(v=>v*scaleXZ)){rayStats.ladder++;const f=hits(objects,[p[0]+well[0]+dx,p[1]+3,p[2]+well[2]+dz],[p[0]+well[0]+dx,p[1]+75.5,p[2]+well[2]+dz]);if(f.length)blocked.push({type,dx,dz,hit:detail(f[0])});}
 }
 findings.push(...blocked.map(x=>({kind:'ladder-core',...x})));assert.equal(blocked.length,0,JSON.stringify(blocked.slice(0,3)));
 console.log('  Central '+(6*scaleXZ*C.config.metresPerUnit).toFixed(2)+' m square sample excludes the installed side ladder; no false rung obstruction.');
});
console.log(JSON.stringify({passed:results.filter(t=>t.passed).length,total:results.length,sleeveEnvelopeMetres:2*sleeveHalf*C.config.metresPerUnit,rayStats,findingCount:findings.length,findings:findings.slice(0,4),note:'Configured connector-envelope grid for static/pallet holes; safe interior throat grid for open doors; actual center seam checked when closed. This does not replace finite-body or airtightness verification.'},null,2));
if(results.some(t=>!t.passed))process.exitCode=1;
