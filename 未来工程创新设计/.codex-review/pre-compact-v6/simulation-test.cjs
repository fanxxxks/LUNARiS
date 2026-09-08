/* Independent OBB, continuous flight envelope, pressure interlock, personnel
   graph, propellant and random-seek tests. No WebGL renderer required. */
const assert=require('node:assert/strict'),C=require('./simulation-core.js'),T=require('./vendor/three.min.js');
const EPS=1e-7,{width,height,depth,clearance}=C.config;
assert.equal(C.nodes.length,30);assert.equal(C.config.roomCount,24);assert.equal(C.shafts.length,0);
assert.deepEqual(Array.from({length:5},(_,l)=>C.nodes.filter(n=>n.level===l).length),[6,6,6,6,6]);
assert.deepEqual(Array.from({length:5},(_,l)=>C.nodes.filter((n,i)=>n.level===l&&C.initial[i]!==null).length),[6,6,6,4,2]);
assert.equal(C.initial.filter(r=>r!==null).length,24);assert.equal(C.initial.filter(r=>r===null).length,6);
for(const n of C.nodes){assert.equal(C.port(n.level,n.sector),n.id);assert.equal(C.bay(n.level,n.sector),n.id);assert.equal(C.slots[n.id][1],34+n.level*108);assert.ok(Math.abs(Math.hypot(C.slots[n.id][0],C.slots[n.id][2])-n.radius)<EPS);assert.equal(C.graph[n.id].length,29);}
function obb(position,orientation){
 const q=new T.Quaternion().setFromEuler(new T.Euler(...orientation,'YXZ'));
 const axes=[new T.Vector3(1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,0,1)].map(v=>v.applyQuaternion(q));
 return {center:new T.Vector3(0,height/2,0).applyQuaternion(q).add(new T.Vector3(...position)),axes,half:[width/2,height/2,depth/2]};
}
function separated(a,b){
 const delta=b.center.clone().sub(a.center),axes=[...a.axes,...b.axes,...a.axes.flatMap(v=>b.axes.map(w=>v.clone().cross(w)))];
 return axes.some(v=>{if(v.lengthSq()<1e-12)return false;v=v.clone().normalize();const ra=a.axes.reduce((s,ax,i)=>s+Math.abs(v.dot(ax))*a.half[i],0),rb=b.axes.reduce((s,ax,i)=>s+Math.abs(v.dot(ax))*b.half[i],0);return Math.abs(delta.dot(v))>=ra+rb+clearance-1e-6;});
}
function corners(box){const points=[];for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])points.push(box.center.clone().addScaledVector(box.axes[0],x*box.half[0]).addScaledVector(box.axes[1],y*box.half[1]).addScaledVector(box.axes[2],z*box.half[2]));return points;}
function hull(points){
 const a=points.map(p=>[p.x,p.z]).sort((p,q)=>p[0]-q[0]||p[1]-q[1]),cross=(o,p,q)=>(p[0]-o[0])*(q[1]-o[1])-(p[1]-o[1])*(q[0]-o[0]);
 const lower=[],upper=[];for(const p of a){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}for(const p of a.slice().reverse()){while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}return lower.slice(0,-1).concat(upper.slice(0,-1));
}
function originClear(box){
 const p=hull(corners(box));let minimum=Infinity;
 for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy,u=Math.max(0,Math.min(1,-(a[0]*dx+a[1]*dy)/den));minimum=Math.min(minimum,Math.hypot(a[0]+u*dx,a[1]+u*dy));}
 return minimum>C.config.coreRadius+clearance;
}
function assertFrame(st){
 assert.equal(st.positions.length,24);assert.equal(st.orientations.length,24);C.validate(st.layout);
 const active=st.active>=0?[st.active]:Array.from({length:24},(_,i)=>i),boxes=st.positions.map((p,i)=>obb(p,st.orientations[i]));
 for(const i of active){assert.ok(originClear(boxes[i]),`core overlap, room ${i}`);for(let j=0;j<24;j++)if(i!==j)assert.ok(separated(boxes[i],boxes[j]),`OBB conflict ${i}/${j} at ${st.type}`);}
}
assertFrame(C.state(C.initial,[],0));
const initialCopy=JSON.stringify(C.initial),summaries=[];let testedFlightSamples=0;
for(const name of Object.keys(C.missions)){
 const plan=C.preset(name),{phases,duration}=C.timeline(plan.moves),final=C.state(C.initial,phases,duration);
 assert.ok(plan.moves.length>=2&&plan.moves.length<=4);assert.deepEqual(final.layout,plan.target);assert.equal(final.finished,plan.moves.length);assert.equal(final.type,'done');assert.equal(final.active,-1);assertFrame(final);
 assert.equal(C.missionMetric(name,final.layout),plan.metrics.after);assert.equal(JSON.stringify(C.initial),initialCopy);
 for(const m of plan.moves){assert.deepEqual(m.path[0],C.slots[m.from]);assert.deepEqual(m.path.at(-1),C.slots[m.to]);assert.equal(m.nodePath.length,2);assert.equal(m.shafts.length,0);assert.ok(C.length(m.path)>0);}
 for(const p of phases){
  const middle=C.state(C.initial,phases,(p.start+p.end)/2);
  assert.equal(middle.cabinPressure,1,'habitat pressure remains stable; interface annulus vents separately');
  if(!['seal','open','dock'].includes(p.type))assert.ok(middle.doorsClosed,`${p.type} requires closed doors`);
  if(p.flightPhase){assert.equal(middle.connected,false);assert.equal(middle.pressure,0);assert.equal(middle.connectionProgress,0);assert.ok(middle.thrustKN>5,'gravity support remains nonzero even when descending');}
  if(['leakTest','equalize','connect','open','dock'].includes(p.type))assert.ok(middle.hardLocked);
  if(p.type==='open'){assert.equal(middle.pressure,1);assert.equal(middle.servicesConnected,1);}
  if(p.type==='equalize'){assert.ok(middle.pressure>0&&middle.pressure<1);assert.equal(middle.servicesConnected,0);}
  const before=C.state(C.initial,phases,Math.max(0,p.end-1e-6)),after=C.state(C.initial,phases,p.end);
  for(let r=0;r<24;r++){assert.ok(Math.hypot(...before.positions[r].map((v,k)=>v-after.positions[r][k]))<.001,`continuous docking ${p.type}`);const qa=new T.Quaternion().setFromEuler(new T.Euler(...before.orientations[r],'YXZ')),qb=new T.Quaternion().setFromEuler(new T.Euler(...after.orientations[r],'YXZ'));assert.ok(qa.angleTo(qb)<.001,'continuous attitude');}
  if(p.flightPhase)for(let i=0;i<=96;i++){
   const st=C.state(C.initial,phases,p.start+(p.end-p.start)*Math.min(i/96,.999999));assertFrame(st);testedFlightSamples++;
   assert.ok(Math.abs(st.orientations[p.room][2])<=4*Math.PI/180);assert.ok(st.throttle>=0&&st.throttle<=1);assert.ok(st.thrustKN<=140+EPS,'nominal route must fit assumed available thrust');assert.ok(st.massKg<=45000&&st.massKg>40000);assert.ok(st.propellantKg>=0);assert.ok(st.velocity.every(Number.isFinite)&&st.acceleration.every(Number.isFinite));
  }
 }
 // Seeking in either direction cannot inherit old frame/pressure/attitude state.
 const seeks=Array.from({length:41},(_,i)=>duration*i/40),reference=seeks.map(t=>JSON.stringify(C.state(C.initial,phases,t)));
 for(let i=seeks.length-1;i>=0;i--)assert.equal(JSON.stringify(C.state(C.initial,phases,seeks[i])),reference[i]);
 // Playback multiplier changes elapsed wall time, not trajectory or termination.
 for(const rate of [.5,1,2,4,8,16]){let clock=0;while(clock<duration)clock=Math.min(duration,clock+(1/60)*rate);assert.deepEqual(C.state(C.initial,phases,clock).layout,plan.target);}
 for(const m of plan.moves){const ps=phases.filter(p=>p.room===m.room),start=C.state(C.initial,phases,ps[0].start),end=C.state(C.initial,phases,ps.at(-1).end-1e-6);assert.ok(start.propellantKg<.001);assert.ok(end.propellantKg>0);assert.ok(Math.abs(end.massKg+end.propellantKg-45000)<1e-6);}
 summaries.push({mission:name,moves:plan.moves.length,duration:+duration.toFixed(2),metrics:plan.metrics});
}
const research=C.preset('vertical'),before=C.walkMetrics(C.initial),after=C.walkMetrics(research.target);
assert.equal(+before.distance.toFixed(1),164.8);assert.equal(+after.distance.toFixed(1),117.2);assert.ok(after.distance<before.distance);assert.ok(before.liftTrips>0);assert.equal(after.liftTrips,0);
for(const layout of [C.initial,research.target])for(let i=0;i<24;i++)for(let j=i+1;j<24;j++){
 const a=C.walkRoute(layout,i,j),b=C.walkRoute(layout,j,i);assert.ok(Math.abs(a.distance-b.distance)<1e-6);assert.ok(Math.abs(a.distance-a.walkingDistance-a.verticalDistance)<1e-6);assert.ok(a.connected);assert.ok(a.distance>=new T.Vector3(...C.slots[layout.indexOf(i)]).distanceTo(new T.Vector3(...C.slots[layout.indexOf(j)]))*.1-1e-6);assert.deepEqual(a.points[0],C.slots[layout.indexOf(i)].map((v,k)=>v+(k===1?16:0)));assert.ok(a.segments.every(s=>['walk','lift'].includes(s.type)));}
assert.equal(C.walkRoute(C.initial,1,2,[1]).connected,false);
assert.throws(()=>C.move(C.initial,1,25,[25]),/封闭/);assert.throws(()=>C.move(C.initial,1,25,[1]),/封闭/);assert.throws(()=>C.move(C.initial,1,2),/占用/);assert.throws(()=>C.move(C.initial,25,1),/有效/);assert.throws(()=>C.timeline([],0),/速度/);assert.throws(()=>C.state(C.initial,[],NaN),/时间/);
assert.equal(C.neighbor(C.port(0,2),1,1),C.port(1,2));assert.equal(C.neighbor(C.port(4,2),1,1),undefined);assert.equal(C.neighbor(C.port(0,2),1,-1),undefined);
// Deterministic randomized transfers exercise every level/sector pair through
// varied occupancy, including same-sector vertical and opposite-side flights.
let seed=52391,layout=C.initial.slice();const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
for(let i=0;i<1000;i++){
 const occupied=layout.flatMap((r,n)=>r!==null?[n]:[]),empty=layout.flatMap((r,n)=>r===null?[n]:[]),from=occupied[Math.floor(rand()*occupied.length)],to=empty[Math.floor(rand()*empty.length)],m=C.move(layout,from,to);
 assert.equal(m.room,layout[from]);const next=C.apply(layout,m);assert.equal(next[to],m.room);assert.equal(next[from],null);C.validate(next);
 if(i%40===0){const tl=C.timeline([m]);for(const p of tl.phases.filter(p=>p.flightPhase)){const st=C.state(layout,tl.phases,(p.start+p.end)/2);assertFrame(st);}assert.deepEqual(C.state(layout,tl.phases,tl.duration).layout,next);}
 layout=next;
}
// Deliberately obstruct the only radial departure ray: checker must reject.
const example=C.move(C.initial,1,25),blockedRay=[[(C.slots[1][0]+Math.sin(C.nodes[1].yaw)*440)/2,C.slots[1][1]+8,(C.slots[1][2]+Math.cos(C.nodes[1].yaw)*440)/2]];
assert.equal(C.flightClear(example.flight,blockedRay),false);
console.log(JSON.stringify({result:'PASS',randomTransfers:1000,independentOBBSamples:testedFlightSamples,missions:summaries,notes:'Continuous conservative flight envelope + independent oriented boxes; concept thrust/pressure, not CFD.'},null,2));
