/* LUNARIS 5. Lunar surface, propulsion transport and sealed seated docking.
   Parameterized concept model; one scene unit = 0.1 m. Not CFD or certification. */
(function(root){
'use strict';
const config=Object.freeze({columns:6,rows:1,layers:5,sectors:6,pitchX:124,pitchZ:120,pitchY:108,width:92,height:78,depth:84,clearance:3,baseY:34,metresPerUnit:.1,roomCount:24,flightRadius:440,coreRadius:112,walkRadius:92,walkHeight:16,lunarGravity:1.62,roomMassKg:45000,designThrustNewtons:140000,specificImpulse:320,standardGravity:9.80665});
const radii=[248,238,228,218,208],offsets=[0,16,-6,10,-4,6],slots=[],nodes=[],shafts=[],graph=[];
const port=(l,s)=>Number.isInteger(l)&&l>=0&&l<5&&Number.isInteger(s)&&s>=0&&s<6?l*6+s:undefined;
const bay=(l,s,r=0)=>r===0?port(l,s):undefined,lift=()=>undefined;
for(let level=0;level<5;level++)for(let sector=0;sector<6;sector++){
 const id=port(level,sector),yaw=sector*Math.PI/3,radius=radii[level]+offsets[sector],normal=[Math.sin(yaw),0,Math.cos(yaw)];
 nodes.push({id,level,sector,col:sector,row:0,yaw,radius,normal,lift:false,shaft:null,label:`L${level+1} · P${String(sector+1).padStart(2,'0')} 泊位`});
 slots.push([normal[0]*radius,34+level*108,normal[2]*radius]);graph[id]=Array.from({length:30},(_,i)=>i).filter(i=>i!==id);
}
let nextRoom=0;const initial=nodes.map(n=>n.level<3||n.level===3&&[0,1,3,4].includes(n.sector)||n.level===4&&[0,3].includes(n.sector)?nextRoom++:null);
const distance=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k]));
const length=path=>path.slice(1).reduce((sum,p,i)=>sum+distance(path[i],p),0);
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
function validate(layout){
 if(!Array.isArray(layout)||layout.length!==30)throw Error('布局需要 30 个径向泊位。');
 const ids=layout.filter(r=>r!==null);if(ids.length!==24||new Set(ids).size!==24||ids.some(r=>!Number.isInteger(r)||r<0||r>=24))throw Error('24 个房间必须且只能各出现一次。');return true;
}
function roomEnvelope(orientation=[0,0,0]){
 const [p,y,r]=orientation,cx=Math.cos(p),sx=Math.sin(p),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(r),sz=Math.sin(r);let radius=0,minY=Infinity,maxY=-Infinity;const corners=[];
 for(const x of [-46,46])for(const yy of [0,78])for(const z of [-42,42]){
  // Euler YXZ, matching the instanced scene: R_y R_x R_z.
  const x1=cz*x-sz*yy,y1=sz*x+cz*yy,y2=cx*y1-sx*z,z2=sx*y1+cx*z;
  const q=[cy*x1+sy*z2,y2,-sy*x1+cy*z2];corners.push(q);radius=Math.max(radius,Math.hypot(q[0],q[2]));minY=Math.min(minY,q[1]);maxY=Math.max(maxY,q[1]);
 }return {radius,minY,maxY,corners};
}
const staticEnvelope=roomEnvelope();
function pointSegmentXZ(p,a,b){const dx=b[0]-a[0],dz=b[2]-a[2],d=dx*dx+dz*dz,u=d?clamp(((p[0]-a[0])*dx+(p[2]-a[2])*dz)/d):0;return Math.hypot(a[0]+dx*u-p[0],a[2]+dz*u-p[2]);}
// Continuous, conservative swept cylinder. Margin encloses intermediate
// orientation and curved motion, not only sampled render frames.
function sweptRoomClear(a,b,oa,ob,occupied,curveMargin=0){
 const ea=roomEnvelope(oa),eb=roomEnvelope(ob),angular=oa.reduce((s,v,i)=>s+Math.abs(angleDelta(v,ob[i])),0),margin=100*angular+curveMargin+config.clearance;
 const radius=Math.max(ea.radius,eb.radius)+margin,lo=Math.min(a[1]+ea.minY,b[1]+eb.minY)-margin,hi=Math.max(a[1]+ea.maxY,b[1]+eb.maxY)+margin;
 if(pointSegmentXZ([0,0,0],a,b)<config.coreRadius+radius-1e-7)return false;
 return !occupied.some(item=>{const q=Array.isArray(item)?item:item.position,e=item.envelope||staticEnvelope;return lo<q[1]+e.maxY-1e-7&&hi>q[1]+e.minY+1e-7&&pointSegmentXZ(q,a,b)<radius+e.radius-1e-7;});
}
const segmentClear=(a,b,occupied)=>sweptRoomClear(a,b,[0,0,0],[0,0,0],occupied);
function flightSpec(from,to){return {from,to,source:slots[from].slice(),target:slots[to].slice(),sourceRadius:nodes[from].radius,targetRadius:nodes[to].radius,fromYaw:nodes[from].yaw,toYaw:nodes[to].yaw,delta:angleDelta(nodes[from].yaw,nodes[to].yaw)};}
function flightSample(f,type,u){
 u=clamp(u);const s=smooth(u),r=config.flightRadius;let position,orientation=[0,f.fromYaw,0];
 if(type==='depart'){
  const rr=f.sourceRadius+(r-f.sourceRadius)*smooth((u-.14)/.86);position=[Math.sin(f.fromYaw)*rr,f.source[1]+8*smooth(u/.14),Math.cos(f.fromYaw)*rr];
 }else if(type==='cruise'){
  const yaw=f.fromYaw+f.delta*s,y=f.source[1]+8+(f.target[1]-f.source[1])*s+24*Math.sin(Math.PI*s);position=[Math.sin(yaw)*r,y,Math.cos(yaw)*r];orientation=[-.022*Math.sin(2*Math.PI*s),yaw,clamp(-f.delta*.028,-.0698,.0698)*Math.sin(Math.PI*s)**2];
 }else if(type==='approach'){
  const rr=r+(f.targetRadius+8-r)*smooth(u/.84);position=[Math.sin(f.toYaw)*rr,f.target[1]+8*(1-smooth((u-.84)/.16)),Math.cos(f.toYaw)*rr];orientation=[0,f.toYaw,0];
 }else if(type==='softCapture'){
  const rr=f.targetRadius+8*(1-s);position=[Math.sin(f.toYaw)*rr,f.target[1],Math.cos(f.toYaw)*rr];orientation=[0,f.toYaw,0];
 }else throw Error('未知飞行阶段。');return {position,orientation};
}
const flightTypes=['depart','cruise','approach','softCapture'];
function flightPath(f){const path=[];for(const type of flightTypes){const count=type==='cruise'?64:type==='softCapture'?4:24;for(let i=path.length?1:0;i<=count;i++)path.push(flightSample(f,type,i/count).position);}path[0]=f.source.slice();path[path.length-1]=f.target.slice();return path;}
function flightClear(f,occupied){
 for(const type of flightTypes){const count=type==='cruise'?128:64;let previous=flightSample(f,type,0);
  for(let i=1;i<=count;i++){const current=flightSample(f,type,i/count);if(!sweptRoomClear(previous.position,current.position,previous.orientation,current.orientation,occupied,.3))return false;previous=current;}
 }return true;
}
function route(from,to,layout,blocked=[]){
 validate(layout);if(!Number.isInteger(from)||!Number.isInteger(to)||!nodes[from]||!nodes[to]||layout[from]===null)throw Error('请选择一个有效房间与径向泊位。');
 if(blocked.includes(from)||blocked.includes(to))throw Error('起点或目标泊位已封闭。');if(from===to)return [from];if(layout[to]!==null)throw Error('目标泊位已被占用，请选择空闲泊位。');
 const occupied=layout.flatMap((r,i)=>r!==null&&i!==from?[{position:slots[i],envelope:staticEnvelope}]:[]);if(!flightClear(flightSpec(from,to),occupied))throw Error('保守飞行包络与房间或核心相交，无法生成安全航路。');return [from,to];
}
function edgeClear(from,to,layout,room,blocked=[]){try{return layout[from]===room&&route(from,to,layout,blocked).length>1;}catch{return false;}}
function move(layout,from,to,blocked=[],via=[]){
 if(via.length)throw Error('自由飞行直接前往目标泊位，无需指定轨道中转点。');const nodePath=route(from,to,layout,blocked),flight=flightSpec(from,to),path=from===to?[slots[from].slice()]:flightPath(flight);
 return {room:layout[from],from,to,path,nodePath,vertical:path.slice(1).reduce((s,p,i)=>s+Math.abs(p[1]-path[i][1]),0),shafts:[],flight,layoutBefore:layout.slice()};
}
function apply(layout,m){if(m.from===m.to&&layout[m.from]===m.room)return layout.slice();if(layout[m.from]!==m.room||layout[m.to]!==null)throw Error('搬运状态与当前布局不一致。');const out=layout.slice();out[m.to]=m.room;out[m.from]=null;return out;}
function sequence(pairs,blocked=[],startLayout=initial){let layout=startLayout.slice();validate(layout);const moves=[];for(const [from,to,via=[]] of pairs){const m=move(layout,from,to,blocked,via);moves.push(m);layout=apply(layout,m);}return {moves,target:layout};}
// Personnel network: six ring nodes and six spokes to the central lobby on
// every floor, plus vertical lift links. Physical path length, not straight line.
const walkingGraph=Array.from({length:35},()=>[]),walkPoints=[];
for(const n of nodes)walkPoints[n.id]=[n.normal[0]*92,slots[n.id][1]+16,n.normal[2]*92];
for(let level=0;level<5;level++)walkPoints[30+level]=[0,34+level*108+16,0];
function addWalkEdge(a,b,d,type,points){walkingGraph[a].push({to:b,d,type,points});walkingGraph[b].push({to:a,d,type,points:points.slice().reverse()});}
for(let level=0;level<5;level++){
 for(let sector=0;sector<6;sector++){const a=port(level,sector),b=port(level,(sector+1)%6),points=[];for(let j=0;j<=8;j++){const yaw=(sector+j/8)*Math.PI/3;points.push([Math.sin(yaw)*92,walkPoints[a][1],Math.cos(yaw)*92]);}addWalkEdge(a,b,92*Math.PI/3,'walk',points);addWalkEdge(a,30+level,92,'walk',[walkPoints[a],walkPoints[30+level]]);}
 if(level<4)addWalkEdge(30+level,31+level,108,'lift',[walkPoints[30+level],walkPoints[31+level]]);
}
function walkRoute(layout,roomA,roomB,unavailable=[]){
 validate(layout);const from=layout.indexOf(roomA),to=layout.indexOf(roomB);if(from<0||to<0)throw Error('人员通行端点需要有效房间。');
 if(unavailable.includes(roomA)||unavailable.includes(roomB))return {points:[],distance:0,walkingDistance:0,verticalDistance:0,liftTrips:0,segments:[],from,to,connected:false};
 const start=slots[from].map((v,k)=>v+(k===1?16:0)),end=slots[to].map((v,k)=>v+(k===1?16:0));
 if(from===to)return {points:[start],distance:0,walkingDistance:0,verticalDistance:0,liftTrips:0,segments:[],from,to,connected:true};
 const dist=Array(35).fill(Infinity),previous=Array(35).fill(null),visited=new Set();dist[from]=0;
 for(let i=0;i<35;i++){let q=-1;for(let j=0;j<35;j++)if(!visited.has(j)&&(q<0||dist[j]<dist[q]))q=j;if(q===to||q<0)break;visited.add(q);for(const e of walkingGraph[q])if(dist[q]+e.d<dist[e.to]-1e-7){dist[e.to]=dist[q]+e.d;previous[e.to]={from:q,...e};}}
 const edges=[];for(let q=to;q!==from;){const e=previous[q];if(!e)throw Error('人员通行网络不连通。');edges.unshift(e);q=e.from;}
 const radialStart=nodes[from].radius-92,radialEnd=nodes[to].radius-92;
 const segments=[{type:'walk',distance:radialStart*.1,points:[start,walkPoints[from]]},...edges.map(e=>({type:e.type,distance:e.d*.1,points:e.points})),{type:'walk',distance:radialEnd*.1,points:[walkPoints[to],end]}];
 const verticalDistance=segments.filter(s=>s.type==='lift').reduce((sum,s)=>sum+s.distance,0),total=(radialStart+radialEnd+dist[to])*.1;
 return {points:segments.flatMap((s,i)=>i?s.points.slice(1):s.points),distance:total,walkingDistance:total-verticalDistance,verticalDistance,liftTrips:verticalDistance?1:0,segments,from,to,connected:true};
}
function walkMetrics(layout,roomIds=[1,2,7]){const routes=[],pairs=[];for(let i=0;i<roomIds.length;i++)for(let j=i+1;j<roomIds.length;j++){pairs.push([roomIds[i],roomIds[j]]);routes.push(walkRoute(layout,roomIds[i],roomIds[j]));}return {distance:routes.reduce((s,r)=>s+r.distance,0),walkingDistance:routes.reduce((s,r)=>s+r.walkingDistance,0),verticalDistance:routes.reduce((s,r)=>s+r.verticalDistance,0),liftTrips:routes.reduce((s,r)=>s+r.liftTrips,0),routes,pairs};}
const missions={
 vertical:{title:'科研协作',purpose:'将 R02、R03、R08 调入 L5，通过气密核心连接，缩短三对协作舱的人员通行距离。',description:'三个科研舱依次关闭舱门、脱离泊位、沿外围飞行，再落座锁紧、检漏均压并恢复通行。',roomIds:[1,2,7],objective:'三对协作舱之间最短通行距离之和降低；距离包括步行环廊与中央垂直交通。',metricLabel:'协作通行距离',before:0,after:0,unit:'m',lowerIsBetter:true},
 cascade:{title:'维修隔离',purpose:'将 R24 移至 L1/P04 检修泊位，并腾空两侧泊位，保留空间缓冲。',description:'先迁出检修位与两个邻位的舱体，再将故障舱从顶层转运至首层。缓冲不等同于已完成防爆或污染防护验证。',roomIds:[23,3,2,4],objective:'R24 落座 L1/P04，L1/P03 与 L1/P05 留空。',metricLabel:'检修缓冲泊位',before:0,after:2,unit:'处'},
 district:{title:'基地扩建',purpose:'把 R13 与 R18 移入 L4 两个预留泊位，激活既有上层空间。',description:'两次跨层自由搬运使 L4 从 4 舱增至 6 舱；房间总数保持 24，演示泊位启用而非新增硬件。',roomIds:[12,17],objective:'L4 六个泊位全部入驻，24 个房间守恒。',metricLabel:'L4 入驻量',before:4,after:6,unit:'舱'}
};
function missionMetric(name,layout){if(name==='vertical')return Math.round(walkMetrics(layout).distance*10)/10;if(name==='cascade')return layout[port(0,3)]===23?[port(0,2),port(0,4)].filter(p=>layout[p]===null).length:0;if(name==='district')return nodes.filter((n,i)=>n.level===3&&layout[i]!==null).length;return 0;}
const missionPairs={vertical:[[1,25],[2,26],[7,28]],cascade:[[3,28],[2,20],[4,23],[27,3]],district:[[12,20],[17,23]]};
function preset(name,blocked=[]){if(!missions[name])throw Error('未知演示任务。');const plan=sequence(missionPairs[name],blocked),mission=missions[name];return {...plan,mission,metrics:{label:mission.metricLabel,before:missionMetric(name,initial),after:missionMetric(name,plan.target),unit:mission.unit,lowerIsBetter:!!mission.lowerIsBetter}};}
for(const name of Object.keys(missions)){let layout=initial.slice();for(const [from,to] of missionPairs[name])layout=apply(layout,{from,to,room:layout[from]});missions[name].before=missionMetric(name,initial);missions[name].after=missionMetric(name,layout);}
function layoutPositions(layout){const positions=[],orientations=[];layout.forEach((r,i)=>{if(r!==null){positions[r]=slots[i].slice();orientations[r]=[0,nodes[i].yaw,0];}});return {positions,orientations};}
const phaseOrder=['seal','disconnect','unlock','depart','cruise','approach','softCapture','hardCapture','leakTest','equalize','connect','open','dock'];
function kinematics(f,type,u,duration){
 const sample=flightSample(f,type,u),du=Math.min(.0005,.02/duration),umin=Math.max(0,u-du),umax=Math.min(1,u+du),a=flightSample(f,type,umin).position,b=flightSample(f,type,umax).position;
 const velocity=b.map((v,i)=>(v-a[i])/(umax-umin)/duration||0),acceleration=u>=du&&u<=1-du?b.map((v,i)=>(v-2*sample.position[i]+a[i])/(du*duration)**2):[0,0,0];
 return {...sample,velocity,acceleration,requiredAcceleration:Math.hypot(...acceleration.map((v,i)=>v*.1+(i===1?1.62:0)))};
}
function timeline(moves,speed=32){
 if(!Number.isFinite(speed)||speed<=0)throw Error('移动速度必须大于零。');const phases=[];let cursor=0,layout=moves[0]?.layoutBefore?.slice()||initial.slice(),completed=0;validate(layout);
 moves.forEach(m=>{
  if(m.from===m.to)return;if(layout[m.from]!==m.room||layout[m.to]!==null)throw Error('演示搬运序列与布局不一致。');
  const base=layoutPositions(layout),f=m.flight||flightSpec(m.from,m.to),cruisePath=Array.from({length:65},(_,i)=>flightSample(f,'cruise',i/64).position);
  const times={seal:1.4,disconnect:1.4,unlock:1,depart:Math.max(1.875*8/(speed*.14),1.875*(440-f.sourceRadius)/(speed*.86)),cruise:Math.max(2,1.875*length(cruisePath)/speed),approach:Math.max(1.875*8/(speed*.16),1.875*(440-f.targetRadius-8)/(speed*.84)),softCapture:3,hardCapture:2,leakTest:3.5,equalize:3,connect:1.4,open:1.2,dock:.25};
  // Time-scale flight to keep the reference mass within available thrust.
  // This is a conservative acceleration bound: |a| + g <= T_max / m.
  const accelerationLimit=(config.designThrustNewtons/config.roomMassKg-config.lunarGravity)*.9;
  for(const type of flightTypes){let maximum=0;for(let i=1;i<160;i++)maximum=Math.max(maximum,Math.hypot(...kinematics(f,type,i/160,times[type]).acceleration)*.1);if(maximum>accelerationLimit)times[type]*=Math.sqrt(maximum/accelerationLimit);}
  let consumedIntegral=0;
  for(const type of phaseOrder){
   const flight=flightTypes.includes(type),destination=phaseOrder.indexOf(type)>phaseOrder.indexOf('softCapture'),positions=base.positions.slice(),orientations=base.orientations.slice();if(destination){positions[m.room]=slots[m.to].slice();orientations[m.room]=[0,nodes[m.to].yaw,0];}
   const p={...m,type,start:cursor,end:cursor+times[type],moveIndex:completed,flight:f,positions,orientations,layoutBefore:layout,flightPhase:flight,path:flight?Array.from({length:type==='cruise'?49:17},(_,i)=>flightSample(f,type,i/(type==='cruise'?48:16)).position):[positions[m.room].slice()],massIntegralStart:consumedIntegral};
   const count=96,integrals=[0];let integral=0;
   for(let i=1;i<=count;i++){const u=(i-.5)/count,a=flight?kinematics(f,type,u,times[type]).requiredAcceleration:type==='unlock'?1.62*smooth(u):type==='hardCapture'?1.62*(1-smooth(u)):0;integral+=a*times[type]/count;integrals.push(integral);}
   p.massIntegral=integrals;consumedIntegral+=integral;phases.push(p);cursor+=times[type];
  }layout=apply(layout,m);completed++;
 });
 Object.defineProperty(phases,'cache',{value:{initial:moves[0]?.layoutBefore?.slice()||initial.slice(),target:layout,duration:cursor,finished:completed},enumerable:false});return {phases,duration:cursor,elevators:{},elevatorStarts:{},target:layout};
}
function connectionState(type,u){
 let doorClosure=1,connectionProgress=0,pressure=0,services=0,hardLocked=false;
 if(['ready','done','dock'].includes(type)){doorClosure=0;connectionProgress=pressure=services=1;hardLocked=true;}
 else if(type==='seal'){doorClosure=smooth(u);connectionProgress=pressure=services=1;hardLocked=true;}
 else if(type==='disconnect'){connectionProgress=1;pressure=services=1-smooth(u);hardLocked=true;}
 else if(type==='unlock')connectionProgress=1-smooth(u);
 else if(type==='hardCapture'){connectionProgress=smooth(u);hardLocked=u>=1-1e-8;}
 else if(['leakTest','equalize','connect','open'].includes(type)){connectionProgress=1;hardLocked=true;pressure=type==='leakTest'?0:type==='equalize'?smooth(u):1;services=type==='connect'?smooth(u):type==='open'?1:0;if(type==='open')doorClosure=1-smooth(u);}
 return {connectionProgress,pressure,cabinPressure:1,servicesConnected:services,doorClosure,doorsClosed:doorClosure>=1-1e-7,hardLocked,connected:connectionProgress===1&&pressure===1&&doorClosure===0};
}
function state(layout,phases,t){
 if(!Number.isFinite(t))throw Error('时间必须为有效数值。');const cache=phases.cache,end=cache?.duration??phases.at(-1)?.end??0;
 if(!phases.length||t<0||t>=end){
  const done=phases.length&&t>=end,current=done?(cache?.target||apply(phases.at(-1).layoutBefore,phases.at(-1))):layout,base=layoutPositions(current),last=done?phases.at(-1):null,integral=last?last.massIntegralStart+last.massIntegral.at(-1):0,massKg=45000*Math.exp(-integral/(320*9.80665));
  return {...base,active:-1,type:done?'done':'ready',finished:done?(cache?.finished??phases.at(-1).moveIndex+1):0,phase:null,head:base.positions[0].slice(),layout:current.slice(),velocity:[0,0,0],acceleration:[0,0,0],throttle:0,thrustNewtons:0,thrustKN:0,massKg,propellantKg:45000-massKg,fuelKg:45000-massKg,flight:false,elevators:{},elevatorY:34,retracted:0,...connectionState(done?'done':'ready',1)};
 }
 let lo=0,hi=phases.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(t>=phases[mid].end)lo=mid+1;else hi=mid;}
 const p=phases[lo],duration=p.end-p.start,u=clamp((t-p.start)/duration),positions=p.positions.slice(),orientations=p.orientations.slice();let velocity=[0,0,0],acceleration=[0,0,0],required=0;
 if(p.flightPhase){const k=kinematics(p.flight,p.type,u,duration);positions[p.room]=k.position;orientations[p.room]=k.orientation;velocity=k.velocity;acceleration=k.acceleration;required=k.requiredAcceleration;}
 else if(p.type==='unlock')required=1.62*smooth(u);else if(p.type==='hardCapture')required=1.62*(1-smooth(u));
 const ix=u*(p.massIntegral.length-1),left=Math.floor(ix),f=ix-left,integral=p.massIntegralStart+p.massIntegral[left]+((p.massIntegral[left+1]??p.massIntegral[left])-p.massIntegral[left])*f,massKg=45000*Math.exp(-integral/(320*9.80665)),thrustNewtons=massKg*required;
 return {positions,orientations,active:p.room,type:p.type,finished:p.moveIndex,phase:p,head:positions[p.room].slice(),layout:p.layoutBefore.slice(),velocity,acceleration,throttle:clamp(thrustNewtons/140000),thrustNewtons,thrustKN:thrustNewtons/1000,massKg,propellantKg:45000-massKg,fuelKg:45000-massKg,flight:p.flightPhase,phaseProgress:u,elevators:{},elevatorY:34,retracted:0,...connectionState(p.type,u)};
}
function neighbor(node,axis,sign){
 if(!nodes[node]||![0,1,2].includes(axis)||![-1,1].includes(sign))return undefined;if(axis===1)return port(nodes[node].level+sign,nodes[node].sector);
 const a=slots[node];return nodes.filter(n=>n.level===nodes[node].level&&(slots[n.id][axis]-a[axis])*sign>1e-5).sort((aa,bb)=>{const score=n=>{const p=slots[n.id],along=Math.abs(p[axis]-a[axis]),across=Math.abs(p[axis===0?2:0]-a[axis===0?2:0]);return across/along*1000+distance(p,a);};return score(aa)-score(bb);})[0]?.id;
}
const api={config,slots,nodes,graph,shafts,initial,port,bay,lift,validate,roomEnvelope,sweptRoomClear,segmentClear,flightSample,flightClear,edgeClear,route,move,apply,sequence,preset,missions,missionMetric,walkRoute,walkMetrics,length,timeline,state,neighbor,phaseOrder};
if(typeof module!=='undefined')module.exports=api;root.LunarCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
