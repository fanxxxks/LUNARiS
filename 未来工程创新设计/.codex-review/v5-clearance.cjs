/* Read-only actual-scene clearance audit. Uses inert GPU/DOM through the existing
   harness, but actual generated Three meshes, transforms and triangle vertices.
   Exact straight translation sweeps are tested against fixed triangles with SAT.
   The external curved flight is bounded by a conservative annular volume.
   A room-envelope hit is a potential conflict, not proof of mesh penetration. */
'use strict';
const assert=require('node:assert/strict'),{createHarness}=require('./v5-performance-test.cjs');
const h=createHarness();h.tick();const T=h.context.THREE,C=h.context.LunarCore,scene=h.scene();scene.updateMatrixWorld(true);
const station=scene.getObjectByName('lunar-autonomous-docking-port');assert.ok(station);
const moduleMeshes=[];station.traverse(o=>{if(o.userData.roomIds)moduleMeshes.push(o);});
const moduleBounds=[],min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
for(const m of moduleMeshes){m.geometry.computeBoundingBox();const b=m.geometry.boundingBox;for(let k=0;k<3;k++){min[k]=Math.min(min[k],b.min.getComponent(k));max[k]=Math.max(max[k],b.max.getComponent(k));}}
assert.ok(min[0]>=-46.001&&max[0]<=46.001&&min[1]>=-.001&&max[1]<=78.001&&min[2]>=-42.001&&max[2]<=42.001,'actual module geometry must fit planner');
moduleBounds.push({min,max});
const groups=station.children.slice(0,7).map((o,i)=>({object:o,label:i===0?'foundations':i===1?'core/roof':`berths L${i-1}`}));
const otherGroups=scene.children.filter(o=>o.isGroup&&o!==station);assert.equal(otherGroups.length,1,'infrastructure group detection changed');groups.push({object:otherGroups[0],label:'infrastructure'});
for(const o of scene.children.filter(o=>o.isMesh))groups.push({object:o,label:o.isInstancedMesh?'rocks':'terrain'});
const triangles=[],buckets=new Map(),cell=48;
function bounds(points){return {min:[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...points.map(p=>p[k])))};}
const overlap=(a,b)=>a.min.every((v,k)=>v<b.max[k]-1e-5&&a.max[k]>b.min[k]+1e-5);
function visitCells(b,fn){for(let x=Math.floor(b.min[0]/cell);x<=Math.floor(b.max[0]/cell);x++)for(let y=Math.floor(b.min[1]/cell);y<=Math.floor(b.max[1]/cell);y++)for(let z=Math.floor(b.min[2]/cell);z<=Math.floor(b.max[2]/cell);z++)fn(`${x},${y},${z}`);}
let totalStaticTriangles=0;
for(const {object,label} of groups)object.traverse(m=>{
 if(!m.isMesh)return;const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry,position=geo.attributes.position,count=m.isInstancedMesh?m.count:1;
 for(let instance=0;instance<count;instance++){
  const matrix=m.matrixWorld.clone();if(m.isInstancedMesh){const im=new T.Matrix4();m.getMatrixAt(instance,im);matrix.multiply(im);}
  for(let i=0;i<position.count;i+=3){totalStaticTriangles++;const p=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(position,i+k).applyMatrix4(matrix).toArray()),b=bounds(p);
   // All moving bodies stay above y=30 and within radial radius 520.
   if(b.max[1]<30||b.min[1]>650||b.min[0]>530||b.max[0]<-530||b.min[2]>530||b.max[2]<-530)continue;
   const id=triangles.length;triangles.push({points:p,...b,label,material:m.material.color?.getHexString(),instance,face:i/3});visitCells(b,key=>{if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(id);});
  }
 }if(geo!==m.geometry)geo.dispose();
});
function obb(p,yaw,lo=min,hi=max){const q=new T.Quaternion().setFromEuler(new T.Euler(0,yaw,0,'YXZ')),center=new T.Vector3(...lo.map((v,k)=>(v+hi[k])/2)).applyQuaternion(q).add(new T.Vector3(...p));return {center,q,half:lo.map((v,k)=>(hi[k]-v)/2),axes:[new T.Vector3(1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,0,1)].map(v=>v.applyQuaternion(q))};}
function boxCorners(b){const p=[];for(const a of [-1,1])for(const c of [-1,1])for(const d of [-1,1])p.push(b.center.clone().addScaledVector(b.axes[0],b.half[0]*a).addScaledVector(b.axes[1],b.half[1]*c).addScaledVector(b.axes[2],b.half[2]*d).toArray());return p;}
function triangleBox(face,b){
 const inverse=b.q.clone().invert(),p=face.points.map(p=>new T.Vector3(...p).sub(b.center).applyQuaternion(inverse));
 const e=[p[1].clone().sub(p[0]),p[2].clone().sub(p[1]),p[0].clone().sub(p[2])],xyz=[new T.Vector3(1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,0,1)],axes=[...xyz,e[0].clone().cross(e[1]),...e.flatMap(edge=>xyz.map(axis=>edge.clone().cross(axis)))];
 for(const axis of axes){if(axis.lengthSq()<1e-14)continue;axis.normalize();const values=p.map(v=>axis.dot(v)),r=b.half.reduce((s,h,i)=>s+Math.abs(axis.getComponent(i))*h,0);if(Math.min(...values)>=r-1e-5||Math.max(...values)<=-r+1e-5)return false;}return true;
}
const hits=[];let sweeps=0;
function sweep(a,b,yaw,label,node){
 sweeps++;const q=new T.Quaternion().setFromEuler(new T.Euler(0,yaw,0,'YXZ')),delta=new T.Vector3(...b).sub(new T.Vector3(...a)).applyQuaternion(q.clone().invert()).toArray();
 const lo=min.map((v,k)=>v+Math.min(0,delta[k])),hi=max.map((v,k)=>v+Math.max(0,delta[k])),box=obb(a,yaw,lo,hi),bb=bounds(boxCorners(box)),candidates=new Set();visitCells(bb,key=>{for(const id of buckets.get(key)||[])candidates.add(id);});
 const selected=[];for(const i of candidates){const face=triangles[i];if(overlap(bb,face)&&triangleBox(face,box))selected.push(face);}
 if(selected.length)hits.push({node,label,count:selected.length,examples:selected.slice(0,3).map(f=>({label:f.label,material:f.material,points:f.points})),a,b,yaw});
}
for(const node of C.nodes){
 const to=C.nodes[(node.id+6)%30],f={source:C.slots[node.id],target:C.slots[to.id],sourceRadius:node.radius,targetRadius:to.radius,fromYaw:node.yaw,toYaw:to.yaw,delta:0};
 for(const [type,steps] of [['depart',[0,.14,1]],['approach',[0,.84,1]],['softCapture',[0,1]]]){
  for(let j=1;j<steps.length;j++){
   const a=C.flightSample(f,type,steps[j-1]),b=C.flightSample(f,type,steps[j]);
   for(let k=1;k<8;k++){const p=C.flightSample(f,type,steps[j-1]+(steps[j]-steps[j-1])*k/8).position,d=new T.Vector3(...b.position).sub(new T.Vector3(...a.position)),v=new T.Vector3(...p).sub(new T.Vector3(...a.position));assert.ok(d.clone().cross(v).length()<.001,'audit translation segment must remain straight');}
   sweep(a.position,b.position,a.orientation[1],`${type} ${j}`,type==='depart'?node.id:to.id);
  }
 }
}
function minRadius(face){const points=face.points.map(p=>[p[0],p[2]]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),signs=points.map((p,i)=>cross(p,points[(i+1)%3],[0,0]));if(Math.abs(cross(...points))>1e-9&&(signs.every(s=>s>=0)||signs.every(s=>s<=0)))return 0;let min=Infinity;for(let i=0;i<3;i++){const a=points[i],b=points[(i+1)%3],d=[b[0]-a[0],b[1]-a[1]],den=d[0]**2+d[1]**2,u=den?Math.max(0,Math.min(1,-(a[0]*d[0]+a[1]*d[1])/den)):0;min=Math.min(min,Math.hypot(a[0]+d[0]*u,a[1]+d[1]*u));}return min;}
// Radius bound 78 also contains roll/pitch excursion of every cabin corner.
// Minimum cruise anchor y is 42; a 5-unit attitude allowance keeps bottom >37.
const annulusHits=triangles.filter(f=>f.max[1]>37&&f.min[1]<620&&minRadius(f)<518&&Math.max(...f.points.map(p=>Math.hypot(p[0],p[2])))>362);
const report={scope:'Actual fixed mother-port/bridge/braces/roof/infrastructure/terrain/rocks. 150 exact straight swept room envelopes including soft capture; conservative continuous annulus covers all external turns and vertical transfers. No CFD/load-bearing claim.',moduleBounds,totalStaticTriangles,indexedStaticTriangles:triangles.length,translationSweeps:sweeps,potentialTranslationConflicts:hits.length,potentialAnnularTriangles:annulusHits.length,hits,annulusExamples:annulusHits.slice(0,5).map(f=>({label:f.label,points:f.points}))};
console.log(JSON.stringify(report,null,2));
assert.equal(hits.length,0,'Potential room envelope / static triangle conflicts require inspection');assert.equal(annulusHits.length,0,'External annular flight envelope contains fixed geometry');
console.error('PASS actual scene clearance (conservative geometry only).');
