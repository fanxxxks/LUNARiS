/* LUNARIS 3 — deterministic XYZ bay planner. Scene units (0.25 m) and seconds. */
(function (root) {
'use strict';
const config = Object.freeze({columns:4, rows:3, layers:3, pitchX:98, pitchZ:90, pitchY:96, width:92, depth:84, height:78, clearance:2, baseY:24, metresPerUnit:.25});
const slots=[], nodes=[], graph=[];
for(let level=0;level<3;level++) {
  for(let row=0;row<3;row++) for(let col=0;col<4;col++) {
    nodes.push({level,row,col,lift:false,label:`L${level+1} · ${String(row*4+col+1).padStart(2,'0')}`});
    slots.push([(col-1.5)*98,24+level*96,(row-1)*90]);
  }
  nodes.push({level,row:1,col:4,lift:true,label:`L${level+1} · 升降位`});
  slots.push([245,24+level*96,0]);
}
const bay=(level,col,row)=>level*13+row*4+col, lift=level=>level*13+12;
const initial=nodes.map(n=>n.lift?null:n.level*12+n.row*4+n.col);
for(let i=0;i<slots.length;i++) graph[i]=nodes.flatMap((n,j)=>{
  if(i===j) return [];
  const a=nodes[i];
  const horizontal=a.level===n.level&&Math.abs(a.col-n.col)+Math.abs(a.row-n.row)===1;
  const vertical=a.lift&&n.lift&&Math.abs(a.level-n.level)===1;
  return horizontal||vertical?[j]:[];
});
const axes=['x','y','z'];
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const length=path=>path.slice(1).reduce((sum,p,i)=>sum+distance(path[i],p),0);
function validate(layout) {
  if(!Array.isArray(layout)||layout.length!==39) throw Error('布局需要 36 个建筑舱段和 3 个空闲升降位。');
  const ids=layout.filter(r=>r!==null);
  if(ids.length!==36||new Set(ids).size!==36||ids.some(r=>!Number.isInteger(r)||r<0||r>=36)) throw Error('每个建筑舱段必须且只能出现一次。');
  return true;
}
// Exact swept AABB overlap for an axis-aligned segment; no sampling gaps.
function intersects(a,b,q,size) {
  return a.every((v,k)=>Math.min(v,b[k])<q[k]+size[k]-1e-7&&Math.max(v,b[k])>q[k]-size[k]+1e-7);
}
function edgeClear(from,to,layout,room,blocked=[]) {
  if(!graph[from]?.includes(to)) return false;
  if(layout[to]!==null&&layout[to]!==room) return false;
  if(blocked.includes(from)||blocked.includes(to)) return false;
  const a=slots[from],b=slots[to],size=[config.width+config.clearance,config.height+config.clearance,config.depth+config.clearance];
  return !layout.some((r,i)=>r!==null&&r!==room&&intersects(a,b,slots[i],size));
}
function route(from,to,layout,blocked=[]) {
  validate(layout);
  if(!Number.isInteger(from)||!Number.isInteger(to)||!nodes[from]||!nodes[to]||layout[from]===null) throw Error('请选择一个有效建筑。');
  if(from===to) return [from];
  if(layout[to]!==null) throw Error('目标泊位已被占用，请先将该建筑移入空闲位。');
  const room=layout[from],queue=[from],prev=new Map([[from,null]]);
  for(let i=0;i<queue.length;i++) {
    const p=queue[i];
    if(p===to) {const result=[p];while(prev.get(result[0])!==null)result.unshift(prev.get(result[0]));return result;}
    for(const q of graph[p]) if(!prev.has(q)&&edgeClear(p,q,layout,room,blocked)){prev.set(q,p);queue.push(q);}
  }
  throw Error('通道被建筑或封闭区阻挡。请先腾出相邻泊位；跨层运输须经过右侧升降塔。');
}
function move(layout,from,to,blocked=[]) {
  const nodePath=route(from,to,layout,blocked),room=layout[from];
  return {room,from,to,path:nodePath.map(i=>slots[i].slice()),nodePath,vertical:nodePath.slice(1).reduce((s,n,i)=>s+Math.abs(slots[n][1]-slots[nodePath[i]][1]),0)};
}
function apply(layout,m) {const out=layout.slice();if(out[m.from]!==m.room||out[m.to]!==null)throw Error('搬运状态与当前布局不一致。');out[m.to]=m.room;out[m.from]=null;return out;}
function sequence(pairs,blocked=[]) {
  let layout=initial.slice();const moves=[];
  for(const [from,to] of pairs) {const m=move(layout,from,to,blocked);moves.push(m);layout=apply(layout,m);}
  return {moves,target:layout};
}
function preset(name,blocked=[]) {
  const a=bay(0,3,1),b=bay(1,3,1),c=bay(2,3,1),l0=lift(0),l2=lift(2);
  if(name==='vertical') return sequence([[b,l2],[a,b],[l2,a]],blocked);
  if(name==='cascade') return sequence([[b,l2],[a,b],[l2,a],[b,l0],[c,b],[l0,c]],blocked);
  if(name==='district') {
    const n=bay(0,3,0),nw=bay(0,2,0),w=bay(0,2,1);
    return sequence([[a,l0],[n,a],[nw,n],[w,nw],[a,w],[l0,a]],blocked);
  }
  throw Error('未知演示任务。');
}
function timeline(moves,speed=32,elevatorStart=24) {
  if(!Number.isFinite(speed)||speed<=0) throw Error('移动速度必须大于零。');
  let cursor=0,elevatorY=elevatorStart;const phases=[];
  const add=(type,d,extra)=>{phases.push({type,start:cursor,end:cursor+d,...extra});cursor+=d;};
  moves.forEach((m,moveIndex)=>{
    const usesLift=m.nodePath.some(n=>nodes[n].lift),fromY=slots[m.from][1],extra={...m,moveIndex,usesLift,elevatorStart};
    if(usesLift&&elevatorY!==fromY){
      add('retract',.55,{...extra,elevatorFrom:elevatorY,elevatorTo:fromY});
      add('emptyLift',1.875*Math.abs(fromY-elevatorY)/(speed*1.2),{...extra,elevatorFrom:elevatorY,elevatorTo:fromY});
      add('deploy',.55,{...extra,elevatorFrom:elevatorY,elevatorTo:fromY});elevatorY=fromY;
    }
    add('unlock',.8,extra);
    m.path.slice(1).forEach((p,i)=>{const path=[m.path[i],p],vertical=Math.abs(p[1]-path[0][1])>.01;add(vertical?'elevate':'translate',1.875*length(path)/(vertical?speed*.65:speed),{...extra,path,axis:axes[p.findIndex((v,k)=>v!==path[0][k])]});if(usesLift)elevatorY=p[1];});
    add('dock',.8,extra);
  });
  return {phases,duration:cursor};
}
function state(layout,phases,t,elevatorStart=24) {
  const positions=[];layout.forEach((room,i)=>{if(room!==null)positions[room]=slots[i].slice();});
  let active=-1,type='ready',finished=0,phase=null,head=slots[lift(0)].slice(),currentLayout=layout.slice(),elevatorY=phases[0]?.elevatorStart??elevatorStart,retracted=0;
  for(const p of phases) {
    if(t<p.start)break;
    const u=Math.max(0,Math.min(1,(t-p.start)/(p.end-p.start))),s=u*u*u*(u*(u*6-15)+10);
    type=p.type;active=['retract','emptyLift','deploy'].includes(type)?-1:p.room;phase=p;
    if(type==='retract'){elevatorY=p.elevatorFrom;retracted=s;}
    if(type==='emptyLift'){elevatorY=p.elevatorFrom+(p.elevatorTo-p.elevatorFrom)*s;retracted=1;}
    if(type==='deploy'){elevatorY=p.elevatorTo;retracted=1-s;}
    if(type==='translate'||type==='elevate') positions[p.room]=p.path[0].map((v,i)=>v+(p.path[1][i]-v)*s);
    if(type==='dock') {positions[p.room]=slots[p.to].slice();if(t>=p.end){currentLayout=apply(currentLayout,p);finished++;}}
    head=positions[p.room].slice();
    if(p.usesLift&&['translate','elevate','dock'].includes(type))elevatorY=head[1];
    if(t<p.end)break;
  }
  if(phases.length&&t>=phases[phases.length-1].end){active=-1;type='done';phase=null;}
  return {positions,active,type,finished,phase,head,layout:currentLayout,elevatorY,retracted};
}
function neighbor(node,axis,sign) {return graph[node]?.find(j=>Math.sign(slots[j][axis]-slots[node][axis])===sign&&slots[j].every((v,k)=>k===axis||v===slots[node][k]));}
const api={config,slots,nodes,graph,initial,bay,lift,validate,edgeClear,route,move,apply,sequence,preset,length,timeline,state,neighbor};
if(typeof module!=='undefined')module.exports=api;root.LunarCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
