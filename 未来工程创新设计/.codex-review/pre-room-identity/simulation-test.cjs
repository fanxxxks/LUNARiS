/* Independent topology, swept-volume, conservation and continuous lift tests. */
const assert=require('node:assert/strict'),C=require('./simulation-core.js');
const {width,height,depth,clearance,roomCount}=C.config;
assert.equal(C.nodes.length,42);assert.equal(roomCount,24);
assert.equal(C.initial.filter(x=>x!==null).length,24);
assert.equal(new Set(C.slots.map(p=>p[1])).size,5);
assert.deepEqual(Array.from({length:5},(_,level)=>C.nodes.filter(n=>n.level===level).length),[14,11,8,6,3]);
assert.deepEqual(Array.from({length:5},(_,level)=>C.nodes.filter((n,i)=>n.level===level&&C.initial[i]!==null).length),[9,6,5,3,1]);
assert.equal(C.nodes.filter(n=>n.lift).length,14);
assert.equal(C.config.pitchX-width,10);assert.equal(C.config.pitchZ-depth,12);
assert.equal(C.config.pitchY-height,14);assert.equal(C.config.metresPerUnit,.1);assert.equal(C.config.version,7);
for(let level=0;level<5;level++)assert.equal(C.bay(level,0,0),undefined,'central atrium must remain open');
for(const n of C.nodes){
 assert.equal(C.bay(n.level,n.col,n.row),n.id);
 assert.deepEqual(C.slots[n.id],[n.col*102,34+n.level*92,n.row*96]);
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
   assert.deepEqual(st.orientations,Array.from({length:24},()=>[0,0,0]),'mechanical transportation never rotates a room');
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
 assert.ok(tl.phases.cache);assert.equal(tl.phases.cache.target.length,42);
 for(const rate of [.5,1,2,4,8,16]){const finalTime=Math.min(tl.duration,Math.ceil(tl.duration/(rate/60))*rate/60);assert.deepEqual(C.state(layout,tl.phases,finalTime,starts).layout,target,'playback rate cannot alter docking result');}
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
 checkTimeline(C.initial,plan.moves,{A:{y:310,retracted:.3},B:{y:126,retracted:.8},C:{y:402,retracted:0}});
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
assert.equal(C.segmentClear([0,34,0],[204,34,0],[[102,34,0]]),false);
assert.equal(C.segmentClear([0,34,0],[204,34,0],[[102,126,0]]),true);
assert.deepEqual(C.state(C.initial,[],0,126).elevators,{A:{y:126,retracted:0},B:{y:126,retracted:0},C:{y:126,retracted:0}});
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
// Compact-gap carriage contract: a 2% folded platform parks on the shared bay
// boundary, and retains >=3 units of clearance on both sides during empty lift.
assert.equal(C.config.foldedScale,.02);assert.equal(C.config.retractShiftX,C.config.pitchX/2);assert.equal(C.config.retractShiftZ,C.config.pitchZ/2);
function bodyBounds(p){return {min:[p[0]-width/2,p[1],p[2]-depth/2],max:[p[0]+width/2,p[1]+height,p[2]+depth/2]};}
function boundsOverlap(a,b,gap=0){return a.min.every((v,k)=>v<b.max[k]+gap-1e-6&&a.max[k]>b.min[k]-gap+1e-6);}
function carriage(shaft,y,r){
 const scale=1-(1-C.config.foldedScale)*r,half=[width/2,1.55,depth/2],p=[shaft.x,y-1.85,shaft.z];half[shaft.retractAxis]*=scale;p[shaft.retractAxis]+=shaft.retractSign*(shaft.retractAxis===0?C.config.retractShiftX:C.config.retractShiftZ)*r;
 return {min:p.map((v,k)=>v-half[k]),max:p.map((v,k)=>v+half[k])};
}
let carriageChecks=0;
for(const shaft of C.shafts){
 const a=carriage(shaft,shaft.minY,1),b=carriage(shaft,shaft.maxY,1),sweep={min:a.min.map((v,k)=>Math.min(v,b.min[k])),max:a.max.map((v,k)=>Math.max(v,b.max[k]))};
 // Treat every node as occupied, including the lift shaft itself: this is
 // stronger than any actual 24-room layout can demand.
 for(const p of C.slots){assert.ok(!boundsOverlap(sweep,bodyBounds(p),3),`${shaft.id} folded carriage clips a room during continuous empty lift`);carriageChecks++;}
 for(const level of shaft.levels){const y=C.config.baseY+level*C.config.pitchY,room=bodyBounds([shaft.x,y,shaft.z]);for(let i=0;i<=100;i++){const p=carriage(shaft,y,i/100);assert.ok(p.max[1]<=y-.299999);assert.ok(!boundsOverlap(p,room),'fold/deploy must remain below supported room');carriageChecks++;}}
}
const close=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-6,`${msg}: ${a} != ${b}`);
const offsets={'+X':[46,26,0],'-X':[-46,26,0],'+Y':[24,76.5,-23],'-Y':[24,.3,-23],'+Z':[0,26,42],'-Z':[0,26,-42]};assert.deepEqual(C.portOffsets,offsets);
assert.equal(C.roomTypes.length,24);for(const [id,type] of [[1,0],[2,1],[7,4],[10,3],[23,3]])assert.equal(C.roomTypes[id],type);
function lineEnters(a,b,room){const axis=a.findIndex((v,k)=>Math.abs(v-b[k])>1e-6);if(axis<0)return false;return room.min.every((v,k)=>k===axis?Math.max(a[k],b[k])>v+1e-6&&Math.min(a[k],b[k])<room.max[k]-1e-6:a[k]>v+1e-6&&a[k]<room.max[k]-1e-6);}
let checkedLinks=0,walkSegments=0,checkedTraffic=0;
const layouts=[C.initial,...['vertical','cascade','district'].map(name=>C.preset(name).target)];
for(const layout of layouts)for(const unavailable of [[],[0],[1,2,7]]){
 const links=C.connections(layout,{unavailable}),expected=[];
 for(let a=0;a<42;a++)if(layout[a]!==null&&!unavailable.includes(layout[a]))for(let b=a+1;b<42;b++)if(layout[b]!==null&&!unavailable.includes(layout[b])){
  const delta=C.slots[a].map((v,k)=>Math.abs(v-C.slots[b][k]));if(delta.filter(v=>v>1e-7).length===1&&delta.some((v,k)=>Math.abs(v-[102,92,96][k])<1e-7))expected.push(a+':'+b);
 }
 assert.deepEqual(links.map(l=>[l.nodeA,l.nodeB].sort((a,b)=>a-b).join(':')).sort(),expected.sort(),'only immediately adjacent occupied rooms have personnel links');
 for(const link of links){
  assert.equal(layout[link.nodeA],link.roomA);assert.equal(layout[link.nodeB],link.roomB);assert.equal(link.directionA,'+'+['X','Y','Z'][link.axis]);assert.equal(link.directionB,'-'+['X','Y','Z'][link.axis]);
  assert.deepEqual(link.portA,C.slots[link.nodeA].map((v,k)=>v+offsets[link.directionA][k]));assert.deepEqual(link.portB,C.slots[link.nodeB].map((v,k)=>v+offsets[link.directionB][k]));
  close(link.len,[10,15.8,12][link.axis],'short coupling length');close(link.distance,link.len*.1,'coupling metres');assert.deepEqual(link.points,[link.portA,link.portB]);
  for(let node=0;node<42;node++)if(layout[node]!==null&&node!==link.nodeA&&node!==link.nodeB)assert.ok(!lineEnters(link.portA,link.portB,bodyBounds(C.slots[node])),'short sleeve cannot cross a third room');checkedLinks++;
 }
 for(const scenario of ['commute','lab','emergency']){
  const data=C.traffic(layout,{scenario,demand:120,unavailable});checkedTraffic++;assert.equal(data.version,7);assert.equal(data.maxFlow,120);assert.equal(data.legend.unit,'人次/min');assert.equal(data.links.length,links.length);
  close(data.servedDemand+data.disconnectedDemand,data.totalDemand,'demand conservation');close(data.paths.reduce((s,p)=>s+p.flow,0),data.servedDemand,'assigned path demand');close(data.roomSources.reduce((a,b)=>a+b,0),data.servedDemand,'served origins');close(data.roomSinks.reduce((a,b)=>a+b,0),data.servedDemand,'served destinations');
  assert.equal(data.componentCount,data.components.length);assert.equal(data.components.flat().length,24-unavailable.length);assert.ok(data.peakFlow<=data.maxFlow+1e-6);
  for(let r=0;r<24;r++){
   close(data.roomOutflow[r]-data.roomInflow[r],data.roomSources[r]-data.roomSinks[r],'room flow balance');close(data.roomLoads[r],data.roomSources[r]+data.roomInflow[r],'room visits');
   assert.equal(data.roomNodes[r],unavailable.includes(r)?-1:layout.indexOf(r));if(unavailable.includes(r))assert.equal(data.roomLoads[r],0);
  }
  for(const link of data.links){assert.ok(link.flow>=0);close(link.flow,link.flowAB+link.flowBA,'bidirectional link total');}
  close(data.links.reduce((s,l)=>s+l.flow,0),data.paths.reduce((s,p)=>s+p.flow*p.linkIds.length,0),'link traversals conserve assigned flow');
  for(const path of data.paths){assert.ok(path.flow>0);assert.equal(path.roomIds[0],path.roomA);assert.equal(path.roomIds.at(-1),path.roomB);assert.ok(path.roomIds.every(r=>!unavailable.includes(r)));assert.ok(path.linkIds.every(id=>links.some(l=>l.id===id)));
   for(let i=1;i<path.points.length;i++){const a=path.points[i-1],b=path.points[i];assert.ok(a.filter((v,k)=>Math.abs(v-b[k])>1e-6).length<=1,'paths use orthogonal vestibules and internal ladders');walkSegments++;}
  }
  assert.strictEqual(C.traffic(layout,{scenario,demand:120,unavailable:unavailable.slice().reverse()}),data,'same network and demand uses deterministic cache');
 }
}
assert.equal(C.connections(C.initial).length,25);assert.equal(C.traffic(C.initial).componentCount,3);
close(C.walkRoute(C.initial,0,1).distance,10.2,'direct X route between vestibules');close(C.walkRoute(C.initial,0,3).distance,9.6,'direct Z route between vestibules');close(C.walkRoute(C.initial,0,9).distance,18.6,'vertical route includes internal ladders and vestibule access');
const isolated=C.traffic(C.initial).components,missing=C.walkRoute(C.initial,isolated[0][0],isolated[1][0]);assert.equal(missing.connected,false);assert.deepEqual(missing.points,[],'unreachable endpoint must not get a path through an empty slot');
assert.equal(C.walkRoute(C.initial,0,1,[0]).connected,false);assert.ok(C.walkMetrics(C.initial).disconnectedPairs>=0);
const normal=C.traffic(C.initial,{demand:120}),doubled=C.traffic(C.initial,{demand:240}),zero=C.traffic(C.initial,{demand:0}),allClosed=C.traffic(C.initial,{unavailable:Array.from({length:24},(_,i)=>i)});
for(let i=0;i<normal.links.length;i++)close(doubled.links[i].flow,normal.links[i].flow*2,'linear hypothetical demand scaling');
assert.ok(zero.links.every(l=>l.flow===0&&l.flowAB===0&&l.flowBA===0));assert.ok(zero.roomLoads.every(v=>v===0));assert.deepEqual(zero.paths,[]);assert.equal(zero.totalDemand,0);assert.equal(zero.disconnectedDemand,0);
assert.equal(allClosed.links.length,0);assert.equal(allClosed.paths.length,0);assert.equal(allClosed.servedDemand,0);close(allClosed.disconnectedDemand,120,'closed network preserves unmet demand');assert.equal(allClosed.componentCount,0);
assert.ok(C.traffic(C.initial,{unavailable:[0]}).disconnectedDemand>=normal.disconnectedDemand-1e-6);
assert.throws(()=>C.traffic(C.initial,{demand:-1}));assert.throws(()=>C.traffic(C.initial,{demand:NaN}));assert.throws(()=>C.traffic(C.initial,{scenario:'unknown'}));
// Door closure and services precede mechanical detachment; docking locks first,
// restores services next and only then opens doors. Pressure is not simulated.
for(const name of ['vertical','cascade','district']){const {phases,duration}=C.timeline(C.preset(name).moves);
 for(const p of phases)for(const u of [.01,.15,.4,.6,.85,.99]){const st=C.state(C.initial,phases,p.start+(p.end-p.start)*u);assert.equal(st.pressure,null);assert.equal(st.pressureMode,'not-simulated');
  if(st.connectionProgress<1-1e-6){assert.ok(st.doorsClosed,'detachment requires shut doors');assert.equal(st.servicesConnected,0,'services disconnected before moving');}
  if(p.type==='dock'&&st.doorClosure<1-1e-6){close(st.connectionProgress,1,'locked before door opens');close(st.servicesConnected,1,'services restored before door opens');}
  if(['translate','elevate'].includes(p.type)){assert.equal(st.connectionProgress,0);assert.ok(st.unavailableRooms.includes(p.room));assert.ok(C.connections(st.layout,{unavailable:st.unavailableRooms}).every(l=>l.roomA!==p.room&&l.roomB!==p.room));}
 }assert.equal(C.state(C.initial,phases,duration).connected,true);
}
// Many layout and slider states must evict old graphs/results instead of
// retaining an unbounded object graph over a long interactive session.
let networkLayout=C.initial.slice();for(let i=0;i<140;i++){const options=[];networkLayout.forEach((r,from)=>{if(r!==null)for(const to of C.graph[from])if(networkLayout[to]===null)options.push([from,to]);});const [from,to]=options[(i*31+7)%options.length];networkLayout=C.apply(networkLayout,C.move(networkLayout,from,to));C.connections(networkLayout,{unavailable:[i%24]});}
for(let i=0;i<220;i++)C.traffic(C.initial,{demand:i});const cache=C.networkCacheInfo();assert.ok(cache.graphs<=96&&cache.traffic<=192);assert.equal(cache.graphLimit,96);assert.equal(cache.trafficLimit,192);
const resumedPlan=C.preset('cascade'),resumedTimeline=C.timeline(resumedPlan.moves),serialized=JSON.parse(JSON.stringify(resumedTimeline.phases));
assert.deepEqual(C.state(C.initial,serialized,resumedTimeline.duration*.5).positions,C.state(C.initial,resumedTimeline.phases,resumedTimeline.duration*.5).positions,'imported phase data rebuilds the seek cache');
console.log(`PASS: 24 rooms, 42 irregular-frame nodes, five levels, three internal shafts; ${missionSteps} purposeful mission moves and ${verticalSamples} vertical segments; 1,000 legal moves (${randomVertical} vertical); independent continuous AABB sweeps, 24-room conservation, mission outcomes, closed-shaft rerouting, independent continuous lift histories, inherited carriage states and deterministic seeking.`);
console.log(`V7 direct-network PASS: ${carriageChecks} compact carriage checks, ${checkedLinks} six-face coupling checks, ${checkedTraffic} conserved traffic scenarios, ${walkSegments} vestibule/ladder route segments; blocked-room isolation, unmet demand, zero-demand and bounded caches. Mechanical seek/0.5–16× tests retained.`);
