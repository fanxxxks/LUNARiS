/* Independent topology, swept-volume, conservation and continuous lift tests. */
const assert=require('node:assert/strict'),C=require('./simulation-core.js');
const {width,height,depth,clearance,roomCount}=C.config;
assert.equal(C.nodes.length,42);assert.equal(roomCount,24);
assert.equal(C.initial.filter(x=>x!==null).length,24);
assert.equal(new Set(C.slots.map(p=>p[1])).size,5);
assert.deepEqual(Array.from({length:5},(_,level)=>C.nodes.filter(n=>n.level===level).length),[14,11,8,6,3]);
assert.deepEqual(Array.from({length:5},(_,level)=>C.nodes.filter((n,i)=>n.level===level&&C.initial[i]!==null).length),[9,6,5,3,1]);
assert.equal(C.nodes.filter(n=>n.lift).length,14);
assert.equal(C.config.pitchX-width,32);assert.equal(C.config.pitchZ-depth,36);
for(let level=0;level<5;level++)assert.equal(C.bay(level,0,0),undefined,'central atrium must remain open');
for(const n of C.nodes){
 assert.equal(C.bay(n.level,n.col,n.row),n.id);
 assert.deepEqual(C.slots[n.id],[n.col*124,34+n.level*108,n.row*120]);
 assert.equal(C.initial[n.id]===null||!n.lift,true,'initial rooms only occupy ordinary bays');
 for(const j of C.graph[n.id]){
  const m=C.nodes[j];assert.ok(C.graph[j].includes(n.id),'graph is undirected');
  if(m.level!==n.level){assert.ok(n.lift&&m.lift);assert.equal(n.shaft,m.shaft);assert.equal(Math.abs(n.level-m.level),1);}
  else assert.equal(Math.abs(m.col-n.col)+Math.abs(m.row-n.row),1);
 }
}
function assertSeparate(positions){
 assert.equal(positions.length,24);
 for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++){
  const a=positions[i],b=positions[j];
  assert.ok(Math.abs(a[0]-b[0])>=width+clearance-1e-6||Math.abs(a[1]-b[1])>=height+clearance-1e-6||Math.abs(a[2]-b[2])>=depth+clearance-1e-6,`collision ${i}/${j}: ${a} vs ${b}`);
 }
}
function checkMove(layout,m,blocked=[]){
 assert.equal(layout[m.from],m.room);assert.equal(layout[m.to],null);
 assert.deepEqual(m.path[0],C.slots[m.from]);assert.deepEqual(m.path.at(-1),C.slots[m.to]);
 const obstacles=layout.flatMap((r,i)=>r!==null&&r!==m.room?[C.slots[i]]:[]),extents=[width+clearance,height+clearance,depth+clearance];
 for(let i=1;i<m.path.length;i++){
  const a=m.path[i-1],b=m.path[i],axis=a.findIndex((v,k)=>v!==b[k]);
  assert.equal(a.filter((v,k)=>v!==b[k]).length,1,'must move on one axis');
  assert.ok(C.graph[m.nodePath[i-1]].includes(m.nodePath[i]));
  assert.ok(!blocked.includes(m.nodePath[i-1])&&!blocked.includes(m.nodePath[i]));
  if(axis===1){const s=C.shafts.find(s=>a[0]===s.x&&a[2]===s.z);assert.ok(s,'vertical room travel must be inside an internal shaft');assert.equal(b[0],s.x);assert.equal(b[2],s.z);}
  // Independently derived interval intersection, without calling segmentClear.
  for(const q of obstacles){
   const transverse=[0,1,2].filter(k=>k!==axis).every(k=>Math.abs(a[k]-q[k])<extents[k]-1e-6);
   if(transverse){const lo=Math.min(a[axis],b[axis])-extents[axis],hi=Math.max(a[axis],b[axis])+extents[axis];assert.ok(q[axis]<=lo+1e-6||q[axis]>=hi-1e-6,'continuous swept collision');}
  }
 }
 const next=layout.slice();next[m.to]=m.room;next[m.from]=null;
 assert.deepEqual(C.apply(layout,m),next);assert.deepEqual(next.filter(r=>r!==null).sort((a,b)=>a-b),Array.from({length:24},(_,i)=>i));C.validate(next);return next;
}
function checkTimeline(layout,moves,starts=34){
 const tl=C.timeline(moves,32,starts);let vertical=0;
 for(let i=0;i<tl.phases.length;i++){
  const p=tl.phases[i];assert.ok(p.end>p.start);assert.equal(p.start,i?tl.phases[i-1].end:0);
  for(const fraction of [0,.12,.5,.88,1]){
   const t=p.start+(p.end-p.start)*fraction,st=C.state(layout,tl.phases,t,starts);assertSeparate(st.positions);
   for(const s of C.shafts){const e=st.elevators[s.id];assert.ok(e.y>=s.minY-1e-6&&e.y<=s.maxY+1e-6);assert.ok(e.retracted>=0&&e.retracted<=1);}
   if(p.type==='elevate'){
    assert.ok(p.shaft);assert.equal(st.elevators[p.shaft].y,st.positions[p.room][1]);
    if(fraction===.5){const y=st.positions[p.room][1];assert.ok(y>Math.min(p.path[0][1],p.path[1][1])&&y<Math.max(p.path[0][1],p.path[1][1]));vertical++;}
   }
  }
  const left=C.state(layout,tl.phases,Math.max(0,p.start-1e-7),starts),right=C.state(layout,tl.phases,p.start+1e-7,starts);
  for(const s of C.shafts){
   assert.ok(Math.abs(left.elevators[s.id].y-right.elevators[s.id].y)<1e-4,`${s.id} lift teleported`);
   assert.ok(Math.abs(left.elevators[s.id].retracted-right.elevators[s.id].retracted)<1e-4,`${s.id} lift snapped sideways`);
  }
  for(let r=0;r<24;r++)for(let axis=0;axis<3;axis++)assert.ok(Math.abs(left.positions[r][axis]-right.positions[r][axis])<1e-4,'room teleported');
  if(['retract','emptyLift','deploy'].includes(p.type)){
   const mid=C.state(layout,tl.phases,(p.start+p.end)/2,starts),before=C.state(layout,tl.phases,p.start,starts),after=C.state(layout,tl.phases,p.end,starts);
   assert.equal(mid.active,-1);assert.deepEqual(mid.positions,before.positions,'empty mechanism moved a room');
   for(const shaft of C.shafts.filter(s=>s.id!==p.shaft))assert.deepEqual(after.elevators[shaft.id],before.elevators[shaft.id],'one shaft changed another shaft');
   if(p.type==='emptyLift')assert.equal(mid.elevators[p.shaft].retracted,1,'empty vertical motion requires a folded carriage');
  }
 }
 const end=C.state(layout,tl.phases,tl.duration,starts);assert.equal(end.type,'done');assert.equal(end.finished,moves.length);assert.deepEqual(end.elevators,tl.elevators);
 let target=layout.slice();for(const m of moves)target=C.apply(target,m);assert.deepEqual(end.layout,target);
 target.forEach((room,node)=>{if(room!==null)assert.deepEqual(end.positions[room],C.slots[node]);});
 assert.deepEqual(C.state(layout,tl.phases,tl.duration+99,starts).positions,end.positions);
 const t=tl.duration*.37,at=C.state(layout,tl.phases,t,starts);C.state(layout,tl.phases,tl.duration,starts);assert.deepEqual(C.state(layout,tl.phases,t,starts),at,'backwards seeking is deterministic');
 return {vertical,tl,end};
}
let verticalSamples=0,missionSteps=0;
for(const name of ['vertical','cascade','district']){
 const plan=C.preset(name);let layout=C.initial.slice();for(const m of plan.moves)layout=checkMove(layout,m);
 assert.deepEqual(layout,plan.target);assert.equal(C.missionMetric(name,layout),C.missions[name].after);
 assert.equal(plan.metrics.before,C.missions[name].before);assert.equal(plan.metrics.after,C.missions[name].after);
 assert.deepEqual([...new Set(plan.moves.flatMap(m=>m.shafts))].sort(),['A','B','C'],`${name} should use all three internal shafts`);
 C.nodes.forEach((n,i)=>{if(n.lift)assert.equal(plan.target[i],null,'mission must release every internal shaft');});
 const result=checkTimeline(C.initial,plan.moves);verticalSamples+=result.vertical;missionSteps+=plan.moves.length;
 // Repeat only mechanism state validation with distinct inherited carriage heights.
 checkTimeline(C.initial,plan.moves,{A:{y:358,retracted:.3},B:{y:142,retracted:.8},C:{y:466,retracted:0}});
}
assert.ok(verticalSamples>=20);
const repair=C.preset('cascade').target;assert.equal(repair[C.bay(0,2,-1)],23);assert.equal(repair[C.bay(4,-1,-1)],10);
assert.equal(repair[C.bay(0,1,-1)],null);assert.equal(repair[C.bay(0,2,0)],null);
const expansion=C.preset('district').target;assert.notEqual(expansion[C.bay(1,-2,1)],null);assert.notEqual(expansion[C.bay(1,1,-1)],null);
// Close the middle C node: the same start/target route must move to shaft B.
const from=C.bay(0,1,-1),to=C.bay(1,1,-1),blocked=[C.lift(1,'C')];
const direct=C.move(C.initial,from,to),detour=C.move(C.initial,from,to,blocked);
assert.deepEqual(direct.shafts,['C']);assert.deepEqual(detour.shafts,['B']);checkMove(C.initial,detour,blocked);
const rerouted=C.preset('vertical',blocked);let reroutedLayout=C.initial.slice();for(const m of rerouted.moves)reroutedLayout=checkMove(reroutedLayout,m,blocked);
assert.deepEqual(reroutedLayout,C.preset('vertical').target);checkTimeline(C.initial,rerouted.moves);
assert.throws(()=>C.move(C.initial,from,to,[C.lift(1,'B'),C.lift(1,'C')]));
assert.throws(()=>C.move(C.initial,C.bay(0,-2,-1),C.bay(1,-2,-1)),/占用/);
const duplicate=C.initial.slice();duplicate[1]=duplicate[0];assert.throws(()=>C.validate(duplicate));
assert.throws(()=>C.validate(C.initial.slice(1)));assert.throws(()=>C.timeline([],0));assert.throws(()=>C.timeline([],NaN));
assert.throws(()=>C.timeline([],32,{A:999}));assert.throws(()=>C.state(C.initial,[],NaN));
assert.equal(C.neighbor(C.bay(0,-2,-1),1,1),undefined);
assert.equal(C.neighbor(C.lift(0,'A'),1,1),C.lift(1,'A'));
assert.equal(C.neighbor(C.lift(3,'B'),1,1),undefined);
assert.throws(()=>C.route(99,1,C.initial));assert.throws(()=>C.route(C.lift(0),0,C.initial));
assert.throws(()=>C.route(from,from,C.initial,[from]));
assert.equal(C.segmentClear([0,34,0],[248,34,0],[[124,34,0]]),false);
assert.equal(C.segmentClear([0,34,0],[248,34,0],[[124,142,0]]),true);
assert.deepEqual(C.state(C.initial,[],0,142).elevators,{A:{y:142,retracted:0},B:{y:142,retracted:0},C:{y:142,retracted:0}});
// A deterministic 1,000-step room walk, inheriting all carriage positions.
let layout=C.initial.slice(),seed=97,randomVertical=0,elevators=34;const randomShafts=new Set();
for(let step=0;step<1000;step++){
 const options=[];layout.forEach((r,from)=>{if(r!==null)for(const to of C.graph[from])if(layout[to]===null)options.push([from,to]);});
 assert.ok(options.length);seed=(1664525*seed+1013904223)>>>0;
 const [from,to]=options[seed%options.length],m=C.move(layout,from,to);if(m.vertical)randomVertical++;m.shafts.forEach(s=>randomShafts.add(s));
 const tl=C.timeline([m],32,elevators);
 for(const p of tl.phases)if(p.type==='elevate'||p.type==='translate')assertSeparate(C.state(layout,tl.phases,(p.start+p.end)/2,elevators).positions);
 const end=C.state(layout,tl.phases,tl.duration,elevators);elevators=end.elevators;layout=checkMove(layout,m);assert.deepEqual(end.layout,layout);
}
assert.ok(randomVertical>10);assert.deepEqual([...randomShafts].sort(),['A','B','C']);
console.log(`PASS: 24 rooms, 42 irregular-frame nodes, five levels, three internal shafts; ${missionSteps} purposeful mission moves and ${verticalSamples} vertical segments; 1,000 legal moves (${randomVertical} vertical); independent continuous AABB sweeps, 24-room conservation, mission outcomes, closed-shaft rerouting, independent continuous lift histories, inherited carriage states and deterministic seeking.`);
