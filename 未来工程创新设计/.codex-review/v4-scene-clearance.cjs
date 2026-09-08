/* Read-only CPU geometry audit. Run: node .codex-review/v4-scene-clearance.cjs
   Uses the actual Three.js meshes created by lunar-scene.js, with inert texture
   objects instead of Canvas/WebGL. No project source is modified or rendered.
   Triangle AABB sweeps are conservative: no intersections proves clearance;
   reported intersections require inspection and may include false positives.
   Carriage sweeps use the offsets/scales currently present in lunar-app.js. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),T=require(path.join(root,'vendor/three.min.js')),C=require(path.join(root,'simulation-core.js'));
const source=fs.readFileSync(path.join(root,'lunar-scene.js'),'utf8'),app=fs.readFileSync(path.join(root,'lunar-app.js'),'utf8');
function section(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a,`scene marker missing: ${start}`);return source.slice(a,b);}
const context={T,C};vm.createContext(context);
vm.runInContext(`const scene=new T.Scene();
const alloyMap=new T.Texture(),roughMap=new T.Texture(),brushedMap=new T.Texture(),solarMap=new T.Texture();
function texture(){return new T.Texture();}
${section('const mats=','function mesh')}
${section('function mesh','const craters=')}
${section('const station=','const workLights=')}
${section('const typeNames=','const moduleBatches=')}
globalThis.auditGeometry={station,elevators,parkedPallets,fixedBoxes,moduleParts,frameLevels,posts,foundations};`,context,{timeout:20000});
const G=context.auditGeometry,EPS=1e-5;
const intersect=(a,b)=>a.min.every((v,k)=>v<b.max[k]-EPS&&a.max[k]>b.min[k]+EPS);
const bounds=points=>({min:[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...points.map(p=>p[k])))});
const rounded=o=>JSON.parse(JSON.stringify(o,(_,v)=>typeof v==='number'?+v.toFixed(4):v));
function triangles(object,label){
 object.updateWorldMatrix(true,true);const result=[];
 object.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry,vertices=geometry.attributes.position;
  for(let i=0;i<vertices.count;i+=3){
   const points=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(vertices,i+k).applyMatrix4(mesh.matrixWorld).toArray());
   result.push({points,...bounds(points),label,material:mesh.material.color?.getHexString()});
  }
  if(geometry!==mesh.geometry)geometry.dispose();
 });return result;
}
const dynamic=new Set([...Object.values(G.elevators),...G.parkedPallets]),staticFaces=[];
for(const child of G.station.children){
 if(dynamic.has(child))continue;
 const floor=G.frameLevels.indexOf(child),shaft=C.shafts.find(s=>s.visual===child);
 const label=floor>=0?`frame L${floor+1}`:child===G.posts?'posts':child===G.foundations?'foundations':shaft?`shaft ${shaft.id} guides`:'shaft guide assembly';
 staticFaces.push(...triangles(child,label));
}
const moduleBounds=[];
for(let type=0;type<6;type++){
 const parts=G.moduleParts(type),b=new T.Box3().setFromObject(parts[0].parent),bound={type,min:b.min.toArray(),max:b.max.toArray()};moduleBounds.push(bound);
 assert.ok(bound.min[0]>=-C.config.width/2-EPS&&bound.max[0]<=C.config.width/2+EPS,'module exceeds configured X envelope');
 assert.ok(bound.min[1]>=-EPS&&bound.max[1]<=C.config.height+EPS,'module exceeds configured Y envelope');
 assert.ok(bound.min[2]>=-C.config.depth/2-EPS&&bound.max[2]<=C.config.depth/2+EPS,'module exceeds configured Z envelope');
}
const envelope={min:[0,1,2].map(k=>Math.min(...moduleBounds.map(b=>b.min[k]))),max:[0,1,2].map(k=>Math.max(...moduleBounds.map(b=>b.max[k])))};
const roomHits=[],registeredHits=[];let edgeCount=0;
for(const from of C.nodes)for(const to of C.graph[from.id]){
 if(to<from.id)continue;edgeCount++;
 const a=C.slots[from.id],b=C.slots[to],swept={min:a.map((v,k)=>Math.min(v,b[k])+envelope.min[k]),max:a.map((v,k)=>Math.max(v,b[k])+envelope.max[k])};
 for(const [i,o]of G.fixedBoxes.entries())if(intersect(swept,o))registeredHits.push({from:from.id,to,obstacle:i,box:o});
 for(const f of staticFaces)if(intersect(swept,f))roomHits.push({from:from.id,to,label:f.label,face:{min:f.min,max:f.max}});
}
// Parse only the small literal animation contract; fail if the renderer changes
// instead of silently validating obsolete hard-coded carriage kinematics.
const offsets=app.match(/retractAxis===0\?([\d.]+):([\d.]+)\)\*e\.retracted/),fold=app.match(/const scale=1-([\d.]+)\*e\.retracted/);
assert.ok(offsets&&fold,'carriage kinematics changed: update this audit adapter');
const shift=[+offsets[1],0,+offsets[2]],foldFactor=+fold[1],carriageHits=[],carriageRoomHits=[];
let carriageSweepCount=0;
for(const shaft of C.shafts){
 const g=G.elevators[shaft.id];g.position.set(0,0,0);g.scale.set(1,1,1);g.updateMatrixWorld(true);
 const faces=triangles(g,`carriage ${shaft.id}`);
 function pose(p,y,r){const out=p.slice();out[1]+=y;out[0]+=shaft.x;out[2]+=shaft.z;out[shaft.retractAxis]=p[shaft.retractAxis]*(1-foldFactor*r)+(shaft.retractAxis===0?shaft.x:shaft.z)+shaft.retractSign*shift[shaft.retractAxis]*r;return out;}
 const motions=[...shaft.levels.map(level=>({kind:'retract/deploy',level,y0:C.slots[C.lift(level,shaft.id)][1],y1:C.slots[C.lift(level,shaft.id)][1],r0:0,r1:1})),
  {kind:'empty vertical',y0:shaft.minY,y1:shaft.maxY,r0:1,r1:1},
  {kind:'loaded vertical',y0:shaft.minY,y1:shaft.maxY,r0:0,r1:0}];
 for(const motion of motions){
  carriageSweepCount++;
  for(const face of faces){
   const sweep=bounds([...face.points.map(p=>pose(p,motion.y0,motion.r0)),...face.points.map(p=>pose(p,motion.y1,motion.r1))]);
   for(const obstacle of staticFaces)if(intersect(sweep,obstacle))carriageHits.push({shaft:shaft.id,motion:motion.kind,level:motion.level,obstacle:obstacle.label,carriage:sweep,fixed:{min:obstacle.min,max:obstacle.max}});
   // A room can be locked in a shaft while the unloaded carriage withdraws.
   if(motion.kind==='retract/deploy'){
    const stationaryBase={min:[shaft.x-46,motion.y0+.3,shaft.z-42],max:[shaft.x+46,motion.y0+3.3,shaft.z+42]};
    if(intersect(sweep,stationaryBase))carriageRoomHits.push({shaft:shaft.id,level:motion.level,carriage:sweep});
   }
  }
 }
}
const report={moduleBounds:rounded(moduleBounds),fixedBoxes:G.fixedBoxes.length,staticTriangles:staticFaces.length,graphEdges:edgeCount,
 roomVersusRegisteredBoxes:registeredHits.length,roomVersusAllStaticTriangles:roomHits.length,
 carriageSweepCount,carriageVersusStaticTriangles:carriageHits.length,carriageVersusDockedRoomBase:carriageRoomHits.length,
 animation:{retractOffsetX:shift[0],retractOffsetZ:shift[2],foldedScale:1-foldFactor},
 findings:rounded([...registeredHits.slice(0,3),...roomHits.slice(0,3),...carriageHits.slice(0,6),...carriageRoomHits.slice(0,3)]),
 scope:'Geometry audit only. Dock-support visibility, visual separation/explode modes, shader rendering and load-bearing engineering require separate checks.'};
console.log(JSON.stringify(report,null,2));
assert.equal(registeredHits.length,0,'room sweep hits a registered fixed box');
assert.equal(roomHits.length,0,'room sweep potentially hits an actual static mesh');
assert.equal(carriageHits.length,0,'carriage sweep potentially hits an actual static mesh');
assert.equal(carriageRoomHits.length,0,'withdrawing carriage crosses a docked room base');
console.log('PASS: actual module envelopes, all room graph edges, fixed structure and continuous carriage retraction/vertical/deployment sweeps.');
