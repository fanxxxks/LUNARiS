/* LUNARIS 6 — compact stepped block assembly, three internal mechanical lifts.
   Floor anchors are in scene units. 1 scene unit = 0.1 m. */
(function (root) {
'use strict';
const config=Object.freeze({version:6,columns:5,rows:3,layers:5,pitchX:102,pitchZ:96,pitchY:92,width:92,height:78,depth:84,clearance:3,baseY:34,metresPerUnit:.1,roomCount:24,foldedScale:.02,retractShiftX:51,retractShiftZ:48,walkHeight:16});
const footprints=[
 [[-2,-1,0,1,2],[-2,-1,1,2],[-2,-1,0,1,2]],
 [[-2,-1,0,1],[-2,-1,1],[-2,-1,0,1]],
 [[-1,0,1],[-1,1],[-1,0,1]],
 [[-1,0,1],[-1,1],[1]],
 [[-1,0],[-1],[]]
];
const shafts=[{id:'A',col:-1,row:0,levels:[0,1,2,3,4],retractAxis:0,retractSign:-1,label:'A · 西侧内核'},
 {id:'B',col:1,row:0,levels:[0,1,2,3],retractAxis:0,retractSign:1,label:'B · 东侧内核'},
 {id:'C',col:0,row:-1,levels:[0,1,2,3,4],retractAxis:2,retractSign:-1,label:'C · 后部内核'}];
const slots=[],nodes=[],graph=[],lookup=new Map();
for(let level=0;level<config.layers;level++)for(let r=0;r<3;r++)for(const col of footprints[level][r]){
 const row=r-1,shaft=shafts.find(s=>s.col===col&&s.row===row)?.id??null,id=nodes.length;
 nodes.push({id,level,row,col,lift:!!shaft,shaft,label:`L${level+1} · ${shaft?shaft+' 升降通道':(row===-1?'后':row===1?'前':'中')+String(col+3).padStart(2,'0')+' 泊位'}`});
 slots.push([col*config.pitchX,config.baseY+level*config.pitchY,row*config.pitchZ]);lookup.set(`${level},${col},${row}`,id);
}
const bay=(level,col,row)=>lookup.get(`${level},${col},${row}`);
const lift=(level,shaft='A')=>{const s=shafts.find(s=>s.id===shaft);return s?bay(level,s.col,s.row):undefined;};
shafts.forEach(s=>{s.nodes=s.levels.map(level=>lift(level,s.id));s.x=s.col*config.pitchX;s.z=s.row*config.pitchZ;s.position={x:s.x,z:s.z};s.minY=config.baseY;s.maxY=config.baseY+s.levels.at(-1)*config.pitchY;});
const reserved=new Set([bay(0,2,-1),bay(0,0,1),bay(1,1,-1),bay(1,-2,1)]);let roomId=0;
const initial=nodes.map((n,i)=>n.lift||reserved.has(i)?null:roomId++);
for(let i=0;i<nodes.length;i++)graph[i]=nodes.flatMap((b,j)=>{
 const a=nodes[i],horizontal=a.level===b.level&&Math.abs(a.col-b.col)+Math.abs(a.row-b.row)===1;
 const vertical=a.shaft&&a.shaft===b.shaft&&Math.abs(a.level-b.level)===1;
 return i!==j&&(horizontal||vertical)?[j]:[];
});
const axes=['x','y','z'],distance=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k]));
const length=path=>path.slice(1).reduce((sum,p,i)=>sum+distance(path[i],p),0);
function validate(layout){
 if(!Array.isArray(layout)||layout.length!==nodes.length)throw Error(`布局需要 ${nodes.length} 个框架节点。`);
 const ids=layout.filter(r=>r!==null);
 if(ids.length!==config.roomCount||new Set(ids).size!==config.roomCount||ids.some(r=>!Number.isInteger(r)||r<0||r>=config.roomCount))throw Error('24 个房间必须且只能各出现一次。');
 return true;
}
// Exact continuous swept AABB check. occupied contains other room floor anchors.
function segmentClear(a,b,occupied){
 const extent=[config.width+config.clearance,config.height+config.clearance,config.depth+config.clearance];
 return !occupied.some(q=>a.every((v,k)=>Math.min(v,b[k])<q[k]+extent[k]-1e-7&&Math.max(v,b[k])>q[k]-extent[k]+1e-7));
}
function edgeClear(from,to,layout,room,blocked=[]){
 if(!graph[from]?.includes(to)||layout[to]!==null&&layout[to]!==room||blocked.includes(from)||blocked.includes(to))return false;
 return segmentClear(slots[from],slots[to],layout.flatMap((r,i)=>r!==null&&r!==room?[slots[i]]:[]));
}
function route(from,to,layout,blocked=[]){
 validate(layout);
 if(!Number.isInteger(from)||!Number.isInteger(to)||!nodes[from]||!nodes[to]||layout[from]===null)throw Error('请选择一个有效房间与框架泊位。');
 if(blocked.includes(from)||blocked.includes(to))throw Error('起点或目标位于封闭通道内。');
 if(from===to)return [from];
 if(layout[to]!==null)throw Error('目标泊位已被占用，请先将该房间移入空闲位。');
 const room=layout[from],queue=[from],prev=new Map([[from,null]]);
 for(let i=0;i<queue.length;i++){
  const p=queue[i];if(p===to){const result=[p];while(prev.get(result[0])!==null)result.unshift(prev.get(result[0]));return result;}
  for(const q of graph[p])if(!prev.has(q)&&edgeClear(p,q,layout,room,blocked)){prev.set(q,p);queue.push(q);}
 }
 throw Error('房间或封闭区阻挡了当前路径。请先腾出相邻泊位；跨层运输需使用框架内部 A / B / C 通道。');
}
function move(layout,from,to,blocked=[],via=[]){
 let virtual=layout.slice(),cursor=from;const nodePath=[];
 for(const destination of [...via,to]){
  const leg=route(cursor,destination,virtual,blocked);nodePath.push(...(nodePath.length?leg.slice(1):leg));
  if(cursor!==destination){virtual[destination]=virtual[cursor];virtual[cursor]=null;}cursor=destination;
 }
 const path=nodePath.map(i=>slots[i].slice());
 const vertical=nodePath.slice(1).reduce((sum,n,i)=>sum+Math.abs(slots[n][1]-slots[nodePath[i]][1]),0);
 const usedShafts=[...new Set(nodePath.slice(1).flatMap((n,i)=>nodes[n].level!==nodes[nodePath[i]].level?[nodes[n].shaft]:[]))];
 return {room:layout[from],from,to,path,nodePath,vertical,shafts:usedShafts,layoutBefore:layout.slice()};
}
function apply(layout,m){
 if(m.from===m.to&&layout[m.from]===m.room)return layout.slice();
 if(layout[m.from]!==m.room||layout[m.to]!==null)throw Error('搬运状态与当前布局不一致。');
 const out=layout.slice();out[m.to]=m.room;out[m.from]=null;return out;
}
function sequence(pairs,blocked=[]){
 let layout=initial.slice();const moves=[];
 for(const [from,to,via=[]] of pairs){const m=move(layout,from,to,blocked,via);moves.push(m);layout=apply(layout,m);}
 return {moves,target:layout};
}
const missions={
 vertical:{title:'科研协作',purpose:'将 R02、R03、R08 调入二层既有实验组，减少跨层协作。',description:'先腾出中转泊位，再由三条内部通道协同搬运，形成同层科研组团。',roomIds:[1,2,7],objective:'三个协作舱全部停靠 L2，所有升降通道恢复空闲。',metricLabel:'二层协作舱',before:0,after:3,unit:'舱'},
 cascade:{title:'维修隔离',purpose:'将顶层 R24 移至首层东缘检修泊位，腾空相邻泊位；R11 补位顶层。',description:'利用 B 通道让位、C 通道下送故障舱、A 通道补位。隔离缓冲表示空间留空，不模拟气密隔离。',roomIds:[23,10],objective:'R24 到达 L1 东缘，两处相邻普通泊位留空，R11 恢复顶层节点。',metricLabel:'检修缓冲泊位',before:0,after:2,unit:'处'},
 district:{title:'基地扩建',purpose:'激活二层两个预留翼部泊位，将成熟舱组迁入扩展区，并释放首层物流空间。',description:'在 24 个房间总数不变的条件下，将二层入驻量从 6 舱提高到 8 舱；演示空间扩容而非新增舱体。',roomIds:[17,16,3],objective:'L2 两处原预留泊位启用、8 个普通泊位全部入驻，三条升降通道保持畅通。',metricLabel:'二层入驻',before:6,after:8,unit:'舱'}
};
function missionMetric(name,layout){
 if(name==='vertical')return missions.vertical.roomIds.filter(r=>nodes[layout.indexOf(r)].level===1).length;
 if(name==='cascade')return layout[bay(0,2,-1)]===23?[bay(0,1,-1),bay(0,2,0)].filter(i=>layout[i]===null).length:0;
 if(name==='district')return nodes.filter((n,i)=>n.level===1&&!n.lift&&layout[i]!==null).length;
 return 0;
}
function preset(name,blocked=[]){
 const b=bay;let pairs;
 if(name==='vertical')pairs=[
  [b(0,-1,1),b(0,0,1)],[b(1,-1,1),b(0,-1,1)],[b(0,-1,-1),b(1,-2,1)],
  [b(0,1,-1),b(1,1,-1)],[b(1,1,1),b(0,2,-1)],[b(0,1,1),b(1,1,1)]
 ];
 else if(name==='cascade')pairs=[
  [b(0,1,1),b(1,1,-1)],[b(0,1,-1),b(0,0,1)],[b(1,1,1),b(0,1,1)],
  [b(0,2,0),b(1,1,1)],[b(4,-1,-1),b(0,2,-1)],[b(1,-1,-1),b(4,-1,-1),[lift(1,'A')]]
 ];
 else if(name==='district')pairs=[
  [b(0,-1,1),b(0,0,1)],[b(1,-1,1),b(0,-1,1)],[b(2,-1,1),b(1,-2,1)],
  [b(0,-1,-1),b(2,-1,1)],[b(2,1,-1),b(1,1,-1)],[b(0,1,-1),b(2,1,-1)],
  [b(1,1,1),b(0,2,-1)],[b(0,1,1),b(1,1,1)],[b(0,-2,0),b(1,-1,1)]
 ];
 else throw Error('未知演示任务。');
 const plan=sequence(pairs,blocked),mission=missions[name];
 return {...plan,mission,metrics:{label:mission.metricLabel,before:missionMetric(name,initial),after:missionMetric(name,plan.target),unit:mission.unit}};
}
function normalizeElevators(start=config.baseY){
 const result={};for(const s of shafts){const value=typeof start==='number'?start:start?.[s.id];
  const y=typeof value==='number'?value:value?.y??config.baseY,retracted=typeof value==='object'?value?.retracted??0:0;
  if(!Number.isFinite(y)||y<s.minY-1e-6||y>s.maxY+1e-6||!Number.isFinite(retracted)||retracted<0||retracted>1)throw Error(`${s.id} 升降机构初始状态无效。`);
  result[s.id]={y,retracted};
 }return result;
}
function timeline(moves,speed=32,elevatorStarts=config.baseY){
 if(speed&&typeof speed==='object'){elevatorStarts=speed;speed=32;}
 if(!Number.isFinite(speed)||speed<=0)throw Error('移动速度必须大于零。');
 const starts=normalizeElevators(elevatorStarts),elevators=normalizeElevators(starts),phases=[];let cursor=0;
 const add=(type,d,extra)=>{if(d>1e-9){phases.push({type,start:cursor,end:cursor+d,elevatorStarts:starts,...extra});cursor+=d;}};
 const prepare=(shaft,y,extra)=>{
  const elevator=elevators[shaft];if(!shaft||!elevator)return;
  const common={...extra,shaft,elevatorFrom:elevator.y,elevatorTo:y};
  if(Math.abs(elevator.y-y)>1e-7){
   add('retract',.65*(1-elevator.retracted),{...common,retractedFrom:elevator.retracted,retractedTo:1});elevator.retracted=1;
   add('emptyLift',1.875*Math.abs(y-elevator.y)/(speed*1.2),common);elevator.y=y;
  }
  if(elevator.retracted>0){add('deploy',.65*elevator.retracted,{...common,retractedFrom:elevator.retracted,retractedTo:0});elevator.retracted=0;}
 };
 moves.forEach((m,moveIndex)=>{
  const extra={...m,moveIndex,usesLift:m.nodePath.some(n=>nodes[n].lift)};
  const first=m.nodePath[0],next=m.nodePath[1],firstShaft=nodes[first].shaft||nodes[next]?.shaft;
  if(firstShaft)prepare(firstShaft,m.path[0][1],extra);
  add('unlock',.8,extra);
  m.path.slice(1).forEach((p,i)=>{
   const path=[m.path[i],p],vertical=Math.abs(p[1]-path[0][1])>.01,shaft=nodes[m.nodePath[i]].shaft||nodes[m.nodePath[i+1]].shaft;
   if(shaft)prepare(shaft,path[0][1],extra);
   add(vertical?'elevate':'translate',1.875*length(path)/(vertical?speed*.65:speed),{...extra,path,shaft:shaft||null,axis:axes[p.findIndex((v,k)=>v!==path[0][k])]});
   if(vertical)elevators[shaft].y=p[1];
  });
  add('dock',.8,extra);
 });
 attachSnapshots(moves[0]?.layoutBefore||initial,phases,starts);
 return {phases,duration:cursor,elevatorStarts:starts,elevators:normalizeElevators(elevators)};
}
function positionsFor(layout){const p=[];layout.forEach((r,i)=>{if(r!==null)p[r]=slots[i].slice();});return p;}
const zeroOrientations=Array.from({length:config.roomCount},()=>Object.freeze([0,0,0]));
function attachSnapshots(layout,phases,starts){
 validate(layout);let positions=positionsFor(layout),current=layout.slice(),elevators=normalizeElevators(starts),finished=0;
 const cache={initial:current,initialPositions:positions.slice(),initialElevators:normalizeElevators(elevators)};
 for(const p of phases){
  p.positionsBefore=positions.slice();p.layoutBefore=current;p.elevatorsBefore=normalizeElevators(elevators);p.finishedBefore=finished;
  const e=p.shaft?elevators[p.shaft]:null;
  if(p.type==='retract'||p.type==='deploy')e.retracted=p.retractedTo;
  if(p.type==='emptyLift'){e.y=p.elevatorTo;e.retracted=1;}
  if(p.type==='translate'||p.type==='elevate')positions[p.room]=p.path.at(-1).slice();
  if(p.type==='elevate'){e.y=positions[p.room][1];e.retracted=0;}
  if(p.type==='dock'){positions[p.room]=slots[p.to].slice();current=apply(current,p);finished++;}
 }
 Object.assign(cache,{target:current,finalPositions:positions,finalElevators:normalizeElevators(elevators),finished,duration:phases.at(-1)?.end??0});
 Object.defineProperty(phases,'cache',{value:cache,enumerable:false,configurable:true});return cache;
}
function state(layout,phases,t,elevatorStarts=config.baseY){
 if(!Number.isFinite(t))throw Error('时间必须为有效数值。');
 const cache=phases.length?(phases.cache||attachSnapshots(layout,phases,phases[0]?.elevatorStarts??elevatorStarts)):null;
 let positions,elevators,current,active=-1,type='ready',finished=0,phase=null,u=0,s=0,velocity=[0,0,0],acceleration=[0,0,0];
 if(!cache||t<0){positions=positionsFor(layout);elevators=normalizeElevators(elevatorStarts);current=layout;}
 else if(t>=cache.duration){positions=cache.finalPositions.slice();elevators=normalizeElevators(cache.finalElevators);current=cache.target;finished=cache.finished;type='done';}
 else{
  let lo=0,hi=phases.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(t>=phases[mid].end)lo=mid+1;else hi=mid;}
  const p=phases[lo],d=p.end-p.start;phase=p;type=p.type;u=Math.max(0,Math.min(1,(t-p.start)/d));s=u*u*u*(u*(u*6-15)+10);
  positions=p.positionsBefore.slice();elevators=normalizeElevators(p.elevatorsBefore);current=p.layoutBefore;finished=p.finishedBefore;active=['retract','emptyLift','deploy'].includes(type)?-1:p.room;
  const elevator=p.shaft?elevators[p.shaft]:null;
  if(type==='retract'||type==='deploy')elevator.retracted=p.retractedFrom+(p.retractedTo-p.retractedFrom)*s;
  if(type==='emptyLift'){elevator.y=p.elevatorFrom+(p.elevatorTo-p.elevatorFrom)*s;elevator.retracted=1;}
  if(type==='translate'||type==='elevate'){
   const delta=p.path[1].map((v,k)=>v-p.path[0][k]);positions[p.room]=p.path[0].map((v,k)=>v+delta[k]*s);
   velocity=delta.map(v=>v*30*u*u*(u-1)*(u-1)/d);acceleration=delta.map(v=>v*60*u*(2*u*u-3*u+1)/(d*d));
  }
  if(type==='elevate'){elevator.y=positions[p.room][1];elevator.retracted=0;}
  if(type==='dock')positions[p.room]=slots[p.to].slice();
 }
 const compatibility=elevators[phase?.shaft??'A'],connectionProgress=type==='unlock'?1-s:type==='dock'?s:['translate','elevate'].includes(type)?0:1,closed=active>=0&&type!=='dock';
 return {positions,orientations:zeroOrientations.slice(),active,type,finished,phase,phaseProgress:u,head:(phase?positions[phase.room]:slots[lift(0)]).slice(),layout:current.slice(),elevators,elevatorY:compatibility.y,retracted:compatibility.retracted,velocity,acceleration,flight:false,connectionProgress,doorClosure:closed?1:0,doorsClosed:closed,hardLocked:connectionProgress===1,connected:connectionProgress===1,pressure:null,pressureMode:'not-simulated',cabinPressure:1,servicesConnected:connectionProgress};
}
function neighbor(node,axis,sign){return graph[node]?.find(j=>Math.sign(slots[j][axis]-slots[node][axis])===sign&&slots[j].every((v,k)=>k===axis||v===slots[node][k]));}
// Separate schematic personnel network. Horizontal edges follow the open seams
// around room envelopes; vertical links use the central void, not the cargo lifts.
// Net clear walking widths, doors and pressure integrity require separate design.
const walkingNodes=[],walkingEdges=[],walkingLookup=new Map(),walkEntries=[],walkCenters=[];
function walkingNode(key,point){if(walkingLookup.has(key))return walkingLookup.get(key);const id=walkingNodes.length;walkingLookup.set(key,id);walkingNodes.push(point);walkingEdges.push([]);return id;}
function walkingEdge(a,b,type='walk',points=[walkingNodes[a],walkingNodes[b]]){const d=length(points)*config.metresPerUnit;walkingEdges[a].push({to:b,d,type,points});walkingEdges[b].push({to:a,d,type,points:points.slice().reverse()});}
function corner(level,col,row){return walkingNode(`${level}/${col}/${row}`,[col*config.pitchX,config.baseY+level*config.pitchY+config.walkHeight,row*config.pitchZ]);}
for(const n of nodes){
 const a=corner(n.level,n.col-.5,n.row-.5),b=corner(n.level,n.col+.5,n.row-.5),c=corner(n.level,n.col+.5,n.row+.5),d=corner(n.level,n.col-.5,n.row+.5);
 for(const pair of [[a,b],[b,c],[c,d],[d,a]])walkingEdge(...pair);
 const entry=walkingNode(`entry/${n.id}`,[slots[n.id][0]+config.pitchX/2,slots[n.id][1]+config.walkHeight,slots[n.id][2]]);walkEntries[n.id]=entry;walkingEdge(entry,b);walkingEdge(entry,c);
}
for(let level=0;level<config.layers;level++){
 const center=walkingNode(`center/${level}`,[0,config.baseY+level*config.pitchY+config.walkHeight,0]);walkCenters.push(center);
 for(const x of [-.5,.5])for(const z of [-.5,.5]){const id=walkingLookup.get(`${level}/${x}/${z}`);if(id!==undefined){const p=walkingNodes[id];walkingEdge(center,id,'walk',[walkingNodes[center],[p[0],p[1],0],p]);}}
 if(level)walkingEdge(walkCenters[level-1],center,'lift');
}
const walkCache=new Map();
function walkRoute(layout,roomA,roomB,unavailable=[]){
 const from=layout.indexOf(roomA),to=layout.indexOf(roomB);if(from<0||to<0)throw Error('人员通道需要有效的房间端点。');
 if(unavailable.includes(roomA)||unavailable.includes(roomB))return {points:[],distance:0,routes:[],connected:false};
 if(from===to)return {points:[],distance:0,walkingDistance:0,verticalDistance:0,liftTrips:0,segments:[],connected:true,schematic:true};
 const key=`${from}/${to}`;if(walkCache.has(key))return walkCache.get(key);
 const start=walkEntries[from],end=walkEntries[to],dist=Array(walkingNodes.length).fill(Infinity),previous=[],visited=new Set();dist[start]=0;
 for(let i=0;i<walkingNodes.length;i++){
  let q=-1;for(let j=0;j<dist.length;j++)if(!visited.has(j)&&(q<0||dist[j]<dist[q]))q=j;if(q<0||q===end)break;visited.add(q);
  for(const edge of walkingEdges[q])if(dist[q]+edge.d<dist[edge.to]-1e-9){dist[edge.to]=dist[q]+edge.d;previous[edge.to]={from:q,...edge};}
 }
 const edges=[];for(let q=end;q!==start;){const e=previous[q];if(!e)throw Error('人员接缝通道未连通。');edges.unshift(e);q=e.from;}
 const entryPoint=n=>[slots[n][0]+config.width/2,slots[n][1]+config.walkHeight,slots[n][2]],connector=(config.pitchX-config.width)/2*config.metresPerUnit;
 const segments=[{type:'walk',distance:connector,points:[entryPoint(from),walkingNodes[start]]},...edges.map(e=>({type:e.type,distance:e.d,points:e.points})),{type:'walk',distance:connector,points:[walkingNodes[end],entryPoint(to)]}];
 const total=dist[end]+connector*2,verticalDistance=segments.filter(s=>s.type==='lift').reduce((v,s)=>v+s.distance,0);
 const result={points:segments.flatMap((s,i)=>i?s.points.slice(1):s.points),distance:total,walkingDistance:total-verticalDistance,verticalDistance,liftTrips:verticalDistance?1:0,segments,from,to,connected:true,schematic:true,note:'接缝与中央竖向交通的概念通行路径；未校核人行净宽、门洞或气密性。'};walkCache.set(key,result);return result;
}
function walkMetrics(layout,ids=[1,2,7]){const routes=[],pairs=[];for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){pairs.push([ids[i],ids[j]]);routes.push(walkRoute(layout,ids[i],ids[j]));}return {routes,pairs,distance:routes.reduce((v,r)=>v+r.distance,0),walkingDistance:routes.reduce((v,r)=>v+r.walkingDistance,0),verticalDistance:routes.reduce((v,r)=>v+r.verticalDistance,0),schematic:true};}
const api={config,slots,nodes,graph,shafts,initial,bay,lift,validate,segmentClear,edgeClear,route,move,apply,sequence,preset,missions,missionMetric,length,timeline,state,neighbor,walkRoute,walkMetrics};
if(typeof module!=='undefined')module.exports=api;root.LunarCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
