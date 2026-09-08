/* Independent geometry, trajectory, conservation and randomized movement checks. */
const assert=require('node:assert/strict'),C=require('./simulation-core.js');
const {width,height,depth,clearance}=C.config;
assert.equal(C.nodes.length,39);assert.equal(C.initial.filter(x=>x!==null).length,36);
assert.equal(new Set(C.slots.map(p=>p[1])).size,3);
assert.equal(C.config.pitchX-width,6);assert.equal(C.config.pitchZ-depth,6);
assert.ok(width*depth/(C.config.pitchX*C.config.pitchZ)>.87);
function assertSeparate(positions){
 for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++){
   const a=positions[i],b=positions[j];
   assert.ok(Math.abs(a[0]-b[0])>=width+clearance-1e-6||Math.abs(a[1]-b[1])>=height+clearance-1e-6||Math.abs(a[2]-b[2])>=depth+clearance-1e-6,`collision ${i}/${j}: ${a} vs ${b}`);
 }
}
function checkMove(layout,m){
 assert.equal(layout[m.from],m.room);assert.equal(layout[m.to],null);assert.deepEqual(m.path[0],C.slots[m.from]);assert.deepEqual(m.path.at(-1),C.slots[m.to]);
 const obstacles=layout.flatMap((r,i)=>r!==null&&r!==m.room?[C.slots[i]]:[]),extents=[width+clearance,height+clearance,depth+clearance];
 for(let i=1;i<m.path.length;i++){
   const a=m.path[i-1],b=m.path[i],axis=a.findIndex((v,k)=>v!==b[k]);assert.equal(a.filter((v,k)=>v!==b[k]).length,1,'must move on one axis');
   if(axis===1){assert.equal(a[0],245);assert.equal(b[0],245);assert.equal(a[2],0);assert.equal(b[2],0);}
   // Interval test written separately from planner's traversal and route selection.
   for(const q of obstacles){const transverse=[0,1,2].filter(k=>k!==axis).every(k=>Math.abs(a[k]-q[k])<extents[k]-1e-6);if(transverse){const lo=Math.min(a[axis],b[axis])-extents[axis],hi=Math.max(a[axis],b[axis])+extents[axis];assert.ok(q[axis]<=lo+1e-6||q[axis]>=hi-1e-6,'continuous swept collision');}}
 }
 const next=layout.slice();next[m.to]=m.room;next[m.from]=null;assert.deepEqual(C.apply(layout,m),next);assert.equal(new Set(next.filter(r=>r!==null)).size,36);return next;
}
let verticalSamples=0;
for(const name of ['vertical','cascade','district']){
 const plan=C.preset(name),tl=C.timeline(plan.moves);let layout=C.initial.slice();for(const m of plan.moves)layout=checkMove(layout,m);assert.deepEqual(layout,plan.target);
 for(const p of tl.phases)for(const fraction of [0,.12,.5,.88,1]){const t=p.start+(p.end-p.start)*fraction,st=C.state(C.initial,tl.phases,t);assertSeparate(st.positions);if(p.type==='elevate'&&fraction===.5){const y=st.positions[p.room][1];assert.ok(y>Math.min(p.path[0][1],p.path[1][1])&&y<Math.max(p.path[0][1],p.path[1][1]));verticalSamples++;}}
 for(const p of tl.phases){const left=C.state(C.initial,tl.phases,Math.max(0,p.start-1e-7)),right=C.state(C.initial,tl.phases,p.start+1e-7);assert.ok(Math.abs(left.elevatorY-right.elevatorY)<1e-4,'lift teleported at a phase boundary');if(p.type==='emptyLift'){const mid=C.state(C.initial,tl.phases,(p.start+p.end)/2);assert.equal(mid.retracted,1);assert.equal(mid.active,-1);assert.deepEqual(mid.positions,C.state(C.initial,tl.phases,p.start).positions,'empty lift moved a building');}}
 const end=C.state(C.initial,tl.phases,tl.duration);assert.equal(end.type,'done');assert.equal(end.finished,plan.moves.length);plan.target.forEach((room,node)=>{if(room!==null)assert.deepEqual(end.positions[room],C.slots[node]);});assert.deepEqual(end.layout,plan.target);
 assert.deepEqual(C.state(C.initial,tl.phases,tl.duration+99).positions,end.positions);
 const t=tl.duration*.37;C.state(C.initial,tl.phases,tl.duration);assert.deepEqual(C.state(C.initial,tl.phases,t),C.state(C.initial,tl.phases,t),'seeking is deterministic');
}
assert.ok(verticalSamples>=8);
assert.throws(()=>C.preset('vertical',[C.lift(1)]));assert.throws(()=>C.preset('cascade',[C.lift(1)]));assert.ok(C.preset('district',[C.lift(1)]).moves.length);
assert.throws(()=>C.move(C.initial,C.bay(0,0,0),C.bay(1,0,0)),/占用/);
const duplicate=C.initial.slice();duplicate[1]=duplicate[0];assert.throws(()=>C.validate(duplicate));assert.throws(()=>C.timeline([],0));assert.throws(()=>C.timeline([],NaN));
assert.equal(C.neighbor(C.bay(0,2,1),1,1),undefined);assert.equal(C.neighbor(C.lift(0),1,1),C.lift(1));
assert.throws(()=>C.route(99,1,C.initial));assert.throws(()=>C.route(C.lift(0),0,C.initial));
// A reproducible thousand-step walk reaches both vertical and horizontal edges.
let layout=C.initial.slice(),seed=97,randomVertical=0;
for(let step=0;step<1000;step++){
 const options=[];layout.forEach((r,from)=>{if(r!==null)for(const to of C.graph[from])if(layout[to]===null)options.push([from,to]);});
 seed=(1664525*seed+1013904223)>>>0;const [from,to]=options[seed%options.length],m=C.move(layout,from,to);if(m.vertical)randomVertical++;
 const tl=C.timeline([m]);for(const p of tl.phases)if(p.type==='elevate'||p.type==='translate')assertSeparate(C.state(layout,tl.phases,(p.start+p.end)/2).positions);
 layout=checkMove(layout,m);
}
assert.ok(randomVertical>10);
console.log(`PASS: 36 buildings, dense packing, 3 levels, ${verticalSamples} preset vertical midpoints, 1,000 legal moves (${randomVertical} vertical), continuous AABB sweeps, timeline endpoints, backwards seeking, occupancy conservation, blocked lift and invalid input rejection.`);
