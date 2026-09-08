/* Read-only continuous geometry audit of the compact V7 frame. Actual Three
   meshes; inert WebGL. A triangle AABB intersection is conservative and must
   be inspected; zero intersections proves clearance for the tested envelopes. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHarness}=require('./v7-performance-test.cjs');
const h=createHarness();h.tick();const T=h.context.THREE,C=h.context.LunarCore,scene=h.scene();scene.updateMatrixWorld(true);
const station=scene.getObjectByName('compact-stepped-lunar-frame');assert.ok(station);
const source=fs.readFileSync(path.join(__dirname,'../lunar-scene.js'),'utf8');assert.ok(/scale=1-\(1-C.config.foldedScale\)\*r/.test(source),'renderer fold contract changed');assert.ok(/axis===0\?pitchX:pitchZ\)\/2/.test(source),'renderer retract shift changed');
const bounds=points=>({min:[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...points.map(p=>p[k])))});
const hit=(a,b)=>a.min.every((v,k)=>v<b.max[k]-1e-5&&a.max[k]>b.min[k]+1e-5);
function faces(object,label){const result=[];object.updateWorldMatrix(true,true);object.traverse(m=>{if(!m.isMesh)return;const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry,a=geo.attributes.position,count=m.isInstancedMesh?m.count:1;for(let j=0;j<count;j++){const matrix=m.matrixWorld.clone();if(m.isInstancedMesh){const im=new T.Matrix4();m.getMatrixAt(j,im);matrix.multiply(im);}for(let i=0;i<a.count;i+=3){const points=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(a,i+k).applyMatrix4(matrix).toArray());result.push({points,...bounds(points),label,material:m.material.color?.getHexString()});}}if(geo!==m.geometry)geo.dispose();});return result;}
const staticFaces=[],carriages={},parked=[];
for(const o of station.children){
 if(/^retractable-lift-/.test(o.name)){carriages[o.name.at(-1)]=o;continue;}
 if(/^parked-side-support-/.test(o.name)){parked.push(o);continue;}
 if(/^(recessed-foundations|slender-joint-columns|thin-floor-L|flush-guide-)/.test(o.name))staticFaces.push(...faces(o,o.name));
}
const infra=scene.children.find(o=>o.isGroup&&o!==station);assert.ok(infra);staticFaces.push(...faces(infra,'infrastructure'));
// Ground and rocks outside the compact building envelope cannot meet a room or
// carriage. Keep only actual triangles overlapping its XY/Z bounding region.
const roomRegion={minX:Math.min(...C.slots.map(p=>p[0]))-C.config.width/2,maxX:Math.max(...C.slots.map(p=>p[0]))+C.config.width/2,minZ:Math.min(...C.slots.map(p=>p[2]))-C.config.depth/2,maxZ:Math.max(...C.slots.map(p=>p[2]))+C.config.depth/2};
for(const o of scene.children.filter(o=>o.isMesh)){const candidate=faces(o,o.isInstancedMesh?'rocks':'terrain');for(const f of candidate)if(f.max[0]>roomRegion.minX&&f.min[0]<roomRegion.maxX&&f.max[2]>roomRegion.minZ&&f.min[2]<roomRegion.maxZ&&f.max[1]>20)staticFaces.push(f);}
const moduleMin=[Infinity,Infinity,Infinity],moduleMax=[-Infinity,-Infinity,-Infinity];
station.traverse(m=>{if(!m.userData.roomIds)return;m.geometry.computeBoundingBox();const b=m.geometry.boundingBox;for(let k=0;k<3;k++){moduleMin[k]=Math.min(moduleMin[k],b.min.getComponent(k));moduleMax[k]=Math.max(moduleMax[k],b.max.getComponent(k));}});
assert.ok(moduleMin[0]>=-C.config.width/2-.001&&moduleMax[0]<=C.config.width/2+.001&&moduleMin[1]>=-.001&&moduleMax[1]<=C.config.height+.001&&moduleMin[2]>=-C.config.depth/2-.001&&moduleMax[2]<=C.config.depth/2+.001,'actual room geometry exceeds planner');
const roomHits=[];let roomSweeps=0;
for(const n of C.nodes)for(const to of C.graph[n.id]){if(to<n.id)continue;roomSweeps++;const a=C.slots[n.id],b=C.slots[to],sweep={min:a.map((v,k)=>Math.min(v,b[k])+moduleMin[k]),max:a.map((v,k)=>Math.max(v,b[k])+moduleMax[k])};const collisions=staticFaces.filter(f=>hit(sweep,f));if(collisions.length)roomHits.push({from:n.id,to,count:collisions.length,examples:collisions.slice(0,4)});}
const carriageHits=[],parkedHits=[];let carriageSweeps=0;
for(const shaft of C.shafts){
 const g=carriages[shaft.id];assert.ok(g);g.position.set(0,0,0);g.scale.set(1,1,1);g.updateMatrixWorld(true);const triangles=faces(g,shaft.id);
 const localBounds={min:[0,1,2].map(k=>Math.min(...triangles.map(t=>t.min[k]))),max:[0,1,2].map(k=>Math.max(...triangles.map(t=>t.max[k])))};assert.ok(localBounds.max[1]<=-.299999,'carriage top must stay below module floor');
 function pose(p,y,r){const q=p.slice();q[0]+=shaft.x;q[1]+=y;q[2]+=shaft.z;q[shaft.retractAxis]=p[shaft.retractAxis]*(1-(1-C.config.foldedScale)*r)+(shaft.retractAxis===0?shaft.x:shaft.z)+shaft.retractSign*(shaft.retractAxis===0?C.config.pitchX:C.config.pitchZ)/2*r;return q;}
 const motions=[...shaft.levels.map(level=>({kind:'retract/deploy',level,y0:C.config.baseY+level*C.config.pitchY,y1:C.config.baseY+level*C.config.pitchY,r0:0,r1:1})),{kind:'empty vertical',y0:shaft.minY,y1:shaft.maxY,r0:1,r1:1},{kind:'loaded vertical',y0:shaft.minY,y1:shaft.maxY,r0:0,r1:0}];
 for(const motion of motions){carriageSweeps++;const findings=[];
  for(const face of triangles){const sweep=bounds([...face.points.map(p=>pose(p,motion.y0,motion.r0)),...face.points.map(p=>pose(p,motion.y1,motion.r1))]);for(const fixed of staticFaces)if(hit(sweep,fixed)&&findings.length<8)findings.push({moving:sweep,fixed});}
  if(findings.length)carriageHits.push({shaft:shaft.id,motion:motion.kind,level:motion.level,examples:findings});
 }
 // Parked side supports are a separate moving/visibility mechanism. Report
 // potential overlap at takeover without treating it as a fixed obstruction.
 for(const p of parked.filter(p=>p.userData.shaft===shaft.id)){const y=C.slots[p.userData.node][1],full={min:localBounds.min.map((v,k)=>v+(k===0?shaft.x:k===1?y:shaft.z)),max:localBounds.max.map((v,k)=>v+(k===0?shaft.x:k===1?y:shaft.z))},overlaps=faces(p,p.name).filter(f=>hit(full,f));if(overlaps.length)parkedHits.push({shaft:shaft.id,node:p.userData.node,level:p.userData.level,triangles:overlaps.length,note:'Requires mutually exclusive visibility or a takeover/retraction mechanism.'});}
}
// Invoke the actual source takeover routine on this inert scene. This tests the
// visible geometry contract, rather than copying its visibility condition here.
const start=source.indexOf('function updateMechanism('),end=source.indexOf('// Index exact geometry',start)>=0?source.indexOf('// Index exact geometry',start):source.indexOf('// Index exact duplicate',start);
assert.ok(start>=0&&end>start,'mechanism source adapter needs updating');
const guideGroups=Object.fromEntries(C.shafts.map(s=>[s.id,station.getObjectByName('flush-guide-'+s.id)]));
const update=new Function('C','baseY','pitchX','pitchY','pitchZ','elevators','shaftVisuals','parkedPallets','obstruction','$','renderer',`return (${source.slice(start,end).trim()});`)(C,C.config.baseY,C.config.pitchX,C.config.pitchY,C.config.pitchZ,carriages,guideGroups,parked,{visible:false},()=>({checked:false}),{shadowMap:{}});
let takeoverChecks=0,visibleSupportChecks=0,hiddenSupportChecks=0;const supportConflicts=[];
for(const shaft of C.shafts)for(const level of shaft.levels){
 const node=C.lift(level,shaft.id),base=C.slots[node][1],layout=C.initial.slice(),room=0;layout[layout.indexOf(room)]=null;layout[node]=room;
 for(let dy=-10;dy<=10;dy+=.5)for(const r of [0,.2,.5,.9,.97,.98,.99,1]){
  const elevators=Object.fromEntries(C.shafts.map(s=>[s.id,{y:s.minY,retracted:1}]));elevators[shaft.id]={y:base+dy,retracted:r};update({layout,active:-1,elevators},-1,false);takeoverChecks++;
  const g=carriages[shaft.id],b=new T.Box3().setFromObject(g),platform={min:b.min.toArray(),max:b.max.toArray()};
  for(const p of parked.filter(p=>p.userData.node===node)){
   if(!p.visible){hiddenSupportChecks++;continue;}visibleSupportChecks++;const support=new T.Box3().setFromObject(p);if(hit(platform,{min:support.min.toArray(),max:support.max.toArray()}))supportConflicts.push({shaft:shaft.id,level,dy,r});
  }
 }
}
assert.ok(visibleSupportChecks>0&&hiddenSupportChecks>0,'takeover audit must exercise both deployed and withdrawn supports');
const report={moduleBounds:{min:moduleMin,max:moduleMax},staticTriangles:staticFaces.length,roomSweeps,carriageSweeps,roomConflicts:roomHits.length,carriageConflicts:carriageHits.length,coincidentSupportEnvelopes:parkedHits.length,takeoverChecks,visibleSupportChecks,hiddenSupportChecks,visibleSupportConflicts:supportConflicts.length,roomHits,carriageHits,supportConflicts,scope:'Actual fixed geometry and continuous room/carriage swept AABBs; actual source visibility takeover checked across all fourteen landing nodes. Support pairs intentionally occupy the same area at different times. No structural, tolerance, people-width or pressure certification.'};
console.log(JSON.stringify(report,null,2));assert.equal(roomHits.length,0,'room sweep intersects actual static geometry');assert.equal(carriageHits.length,0,'carriage sweep intersects actual static geometry');assert.equal(supportConflicts.length,0,'visible parked support intersects carriage during takeover');console.error('PASS room, carriage and parked-support takeover clearance.');

