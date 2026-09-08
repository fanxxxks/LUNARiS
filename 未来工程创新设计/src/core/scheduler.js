/* Scheduling: offline line parser and validated cloud intents → collision-checked moves. */
(function(root){
'use strict';
const C=typeof module==='object'&&module.exports?require('./simulation.js'):root.LunarCore;
const aliases=['材料(?:实验)?|MAT','生命(?:科学)?|生物|BIO','居住(?:单元)?|住宅|生活|HAB','能源(?:设备)?|电力|PWR','物资(?:保障)?|物流|LOG','通信(?:测控)?|通讯|COM'];
function parse(text){
 text=String(text||'').trim();
 if(!text)throw Error('请输入调度目标，例如：居住、材料、通信模块按顺序直线相连。');
 if(text.length>240)throw Error('请将指令控制在 240 字以内。');
 if(/环形|圆形|三角|方形|曲线|分支|删除|移除|新增|复制|拆除|垂直|竖直|跨层/.test(text))throw Error('目前支持将现有模块在同一楼层按顺序排成直线，可指定 X / Z 方向和楼层。');
 const re=new RegExp(aliases.map(s=>'('+s+')').join('|'),'gi'),types=[];
 let match;while((match=re.exec(text)))types.push(match.slice(1).findIndex(v=>v!==undefined));
 if(types.length<2||types.length>5)throw Error('请依次写出 2–5 个模块：居住、材料、通信、生命、能源或物资；也可以重复同一种类型。');
 // Reject counts rather than silently treating “三个居住模块” as one room.
 if(/[两一二三四五六七八九十\d]+\s*(?:个|间|座|组)/.test(text))throw Error('需要多个同类模块时，请重复名称，例如：居住、居住、通信直线相连。');
 const residue=text.replace(re,'').replace(/(?:L\s*\d+|第?\s*[一二三四五六七八九十\d]+\s*层)/gi,'').replace(/[XZ]\s*(?:轴|方向)?/gi,'');
 if(/不要|不移动|不改变|保留|保持|禁止|除了|避开|最少|最快|最短|逆序|倒序|从右|从后/.test(text))throw Error('目前支持模块顺序、楼层和 X / Z 方向；暂不支持排除、锁定、反向或最优路径等额外条件。');
 const unknown=residue.replace(/帮我|给我|我想要|我希望|我想|需要|请|自动|构建|建立|形成|连接|连成|连在一起|相连|相邻|依次|按照|顺序|一条|一排|直线|排列|排成|放在|放到|安排|调度|重组|组合|组织|模块|单元|舱|将|把|让|的|与|和|及|并|在|沿|方向|横向|水平|左右|前后|按/g,'').replace(/[\s，,、。.!！?？:：;；→>\-]/g,'');
 if(unknown)throw Error('未识别的模块或条件：“'+unknown.slice(0,24)+'”。请使用模块名称、直线排列、楼层与 X / Z 方向。');
 const floors=[...text.matchAll(/L\s*(\d+)|第?\s*([一二三四五六七八九十\d]+)\s*层/gi)].map(m=>m[1]?Number(m[1]):/^\d+$/.test(m[2])?Number(m[2]):'一二三四五六七八九十'.indexOf(m[2])+1);
 if(floors.some(n=>n<1||n>5)||new Set(floors).size>1)throw Error('请选择一个有效楼层 L1–L5。');
 if(/X/i.test(text)&&/Z/i.test(text))throw Error('一条直线只能选择 X 或 Z 方向。');
 return {text,types,level:floors.length?floors[0]-1:null,axis:/Z/i.test(text)||/前后/.test(text)?2:0};
}
function plan(text,initial=C.initial,blocked=[]){
 const request=typeof text==='string'?parse(text):text;C.validate(initial);
 for(const type of new Set(request.types))if(request.types.filter(t=>t===type).length>C.roomTypes.filter(t=>t===type).length)throw Error(`${C.roomTypeNames[type]}数量不足，请减少重复模块。`);
 const forbidden=new Set(blocked),N=C.nodes.length;
 const distances=C.nodes.map((_,start)=>{const d=Array(N).fill(999),q=[start];d[start]=0;for(let i=0;i<q.length;i++)for(const n of C.graph[q[i]])if(!forbidden.has(n)&&d[n]===999){d[n]=d[q[i]]+1;q.push(n);}return d;});
 const lines=[];
 for(const node of C.nodes){if(node.lift||forbidden.has(node.id)||request.level!==null&&node.level!==request.level)continue;
  const line=[node.id];while(line.length<request.types.length){const next=C.neighbor(line.at(-1),request.axis,1);if(next===undefined||C.nodes[next].lift||forbidden.has(next))break;line.push(next);}
  if(line.length===request.types.length)lines.push(line);
 }
 if(!lines.length)throw Error('指定楼层或方向没有足够的连续普通泊位；请减少模块数量，或改用 L1 / L2 的 X 方向。');
 const typeAt=(layout,n)=>layout[n]===null?-1:C.roomTypes[layout[n]];
 function score(layout,line){
  const used=new Set();let cost=0;
  // Reserve already correct rooms before matching the remaining repeated types.
  line.forEach((n,i)=>{if(typeAt(layout,n)===request.types[i])used.add(n);});
  line.forEach((n,i)=>{if(typeAt(layout,n)===request.types[i])return;let best=999,bestNode=-1;
   layout.forEach((r,p)=>{if(r!==null&&!used.has(p)&&C.roomTypes[r]===request.types[i]&&distances[p][n]<best){best=distances[p][n];bestNode=p;}});
   used.add(bestNode);cost+=best*2+5+(layout[n]===null?0:2);
  });return cost+layout.reduce((sum,r,n)=>sum+(r!==null&&C.nodes[n].lift?4:0),0);
 }
 const solved=(layout,line)=>line.every((n,i)=>typeAt(layout,n)===request.types[i])&&layout.every((r,n)=>r===null||!C.nodes[n].lift);
 const key=layout=>layout.map(r=>r===null?'-':C.roomTypes[r]).join('');
 const candidates=lines.map(line=>({line,cost:score(initial,line)})).sort((a,b)=>a.cost-b.cost);
 const deadline=Date.now()+6500;let answer=null;
 // Try ordinary-bay transfers first. Most short commands do not need temporary lift parking.
 // Fall back to the wider search only when the cheap pass cannot connect the requested rooms.
 for(const pass of [{width:28,depth:24,staging:false,budget:1600},{width:90,depth:42,staging:true,budget:6500}]){
 const passDeadline=Math.min(deadline,Date.now()+pass.budget);
 for(const {line} of candidates){
  if(solved(initial,line)){answer={layout:initial.slice(),steps:[],line};break;}
  let beam=[{layout:initial.slice(),steps:[],cost:score(initial,line)}];const seen=new Set([key(initial)]);
  for(let depth=0;depth<pass.depth&&beam.length&&Date.now()<passDeadline;depth++){
   const next=[],nextHashes=new Set();
   for(const state of beam){
    for(let from=0;from<N;from++){
     if(state.layout[from]===null||forbidden.has(from))continue;
     const room=state.layout[from],q=[from],visited=new Set(q);
     for(let j=0;j<q.length;j++)for(const to of C.graph[q[j]])if(!visited.has(to)&&!forbidden.has(to)&&state.layout[to]===null){visited.add(to);q.push(to);}
     for(const to of q.slice(1)){
      // Temporary shaft staging is enabled only by the fallback; all shafts clear at completion.
      if(!pass.staging&&C.nodes[to].lift)continue;
      const layout=state.layout.slice();layout[from]=null;layout[to]=room;const hash=key(layout);if(seen.has(hash)||nextHashes.has(hash))continue;nextHashes.add(hash);
      const cost=score(layout,line),steps=state.steps.concat([[from,to]]);
      if(solved(layout,line)){answer={layout,steps,line};break;}
      next.push({layout,steps,cost,hash,rank:cost+steps.length*.4});
     }if(answer)break;
    }if(answer)break;
   }if(answer)break;
   next.sort((a,b)=>a.rank-b.rank);beam=[];
   for(const item of next){if(seen.has(item.hash))continue;seen.add(item.hash);beam.push(item);if(beam.length===pass.width)break;}
  }if(answer||Date.now()>=passDeadline)break;
 }
 if(answer||Date.now()>=deadline)break;
 }
 if(!answer)throw Error('在当前布局与封闭通道约束下未找到可执行计划。请尝试减少模块、切换楼层或恢复初始布局。');
 // Materialize exclusively through the simulation core; never teleport rooms.
 let layout=initial.slice();const moves=[];
 for(const [from,to] of answer.steps){const m=C.move(layout,from,to,blocked);moves.push(m);layout=C.apply(layout,m);}
 const roomIds=answer.line.map(n=>layout[n]);
 const links=C.connections(layout);if(roomIds.slice(1).some((r,i)=>!links.some(l=>l.roomA===r&&l.roomB===roomIds[i]||l.roomB===r&&l.roomA===roomIds[i])))throw Error('目标模块无法形成连续舱口连接，请调整指令。');
 return {request,moves,target:layout,roomIds,nodes:answer.line,summary:`L${C.nodes[answer.line[0]].level+1} · ${request.axis===0?'X':'Z'} 方向 · ${request.types.map(t=>C.roomTypeNames[t]).join(' → ')}`};
}
// Cloud output is declarative data. Room numbers in this contract are one-based.
function validateIntent(value){
 const fail=message=>{throw Error(message||'模型返回的调度目标格式无效，请补充房间与目标后重试。');};
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const keys=(v,allowed)=>{if(!object(v)||Object.keys(v).some(k=>!allowed.includes(k)))fail();};
 keys(value,['version','interpretation','assumptions','goals','lockedRooms','clarification']);
 if(value.version!==1)fail();
 if(value.clarification){if(typeof value.clarification!=='string'||value.clarification.length>400)fail();fail(value.clarification);}
 if(typeof value.interpretation!=='string'||!value.interpretation.trim()||value.interpretation.length>500)fail();
 const ids=(a,min=1)=>{if(!Array.isArray(a)||a.length<min||a.length>24||new Set(a).size!==a.length||a.some(r=>!Number.isInteger(r)||r<1||r>24))fail();return a.slice();};
 const floors=a=>{if(!Array.isArray(a)||!a.length||a.length>5||new Set(a).size!==a.length||a.some(f=>!Number.isInteger(f)||f<1||f>5))fail('楼层只能是 L1–L5。');return a.slice();};
 if(!Array.isArray(value.goals)||!value.goals.length||value.goals.length>6)fail();
 const goals=value.goals.map(g=>{
  const fields={line:['kind','rooms','floors','axis'],zone:['kind','rooms','floors'],cluster:['kind','rooms','floors'],near:['kind','rooms','others','distance'],separate:['kind','rooms','others','distance']}[g?.kind];
  if(!Array.isArray(fields))fail('该空间目标暂不能转换为搬运约束，请使用排列、分层、集中、靠近或分离。');keys(g,fields);
  const out={kind:g.kind,rooms:ids(g.rooms,g.kind==='line'||g.kind==='cluster'?2:1)};
  if(['line','zone','cluster'].includes(g.kind))out.floors=floors(g.floors);
  if(g.kind==='line'){if(!['x','z'].includes(g.axis)||g.rooms.length>5)fail('直线排列需选择 2–5 个房间和 X / Z 方向。');out.axis=g.axis;}
  if(g.kind==='near'||g.kind==='separate'){
   out.others=ids(g.others);if(out.others.some(r=>out.rooms.includes(r)))fail('靠近或分离的两组房间不能重叠。');
   if(!Number.isInteger(g.distance)||g.distance<1||g.distance>8)fail();out.distance=g.distance;
  }return out;
 });
 const assumptions=value.assumptions??[];if(!Array.isArray(assumptions)||assumptions.length>8||assumptions.some(s=>typeof s!=='string'||s.length>300))fail();
 return {version:1,interpretation:value.interpretation.trim(),assumptions:assumptions.slice(),goals,lockedRooms:ids(value.lockedRooms??[],0)};
}
function planIntent(input,initial=C.initial,blocked=[]){
 const request=validateIntent(input);C.validate(initial);
 if(!Array.isArray(blocked)||blocked.some(n=>!Number.isInteger(n)||!C.nodes[n]))throw Error('封闭通道数据无效。');
 const N=C.nodes.length,forbidden=new Set(blocked),locked=new Set(request.lockedRooms.map(r=>r-1));
 const ordinary=C.nodes.filter(n=>!n.lift&&!forbidden.has(n.id));
 const positions=layout=>{const p=[];layout.forEach((r,n)=>{if(r!==null)p[r]=n;});return p;};
 const startPositions=positions(initial);
 const distances=C.nodes.map((_,start)=>{const d=Array(N).fill(999),q=[start];d[start]=0;for(let i=0;i<q.length;i++)for(const n of C.graph[q[i]])if(!forbidden.has(n)&&d[n]===999){d[n]=d[q[i]]+1;q.push(n);}return d;});
 const spatial=C.nodes.map(a=>C.nodes.map(b=>Math.abs(a.col-b.col)+Math.abs(a.row-b.row)+Math.abs(a.level-b.level)));
 const goals=request.goals.map(g=>{
  const out={...g,rooms:g.rooms.map(r=>r-1),others:g.others?.map(r=>r-1)};
  if(g.floors){out.allowed=ordinary.filter(n=>g.floors.includes(n.level+1)).map(n=>n.id);if(out.allowed.length<out.rooms.length)throw Error('目标楼层的普通泊位不足以容纳所选房间。');}
  if(g.kind==='line'){
   out.lines=[];for(const n of out.allowed){const line=[n];while(line.length<out.rooms.length){const next=C.neighbor(line.at(-1),g.axis==='x'?0:2,1);if(!out.allowed.includes(next))break;line.push(next);}if(line.length===out.rooms.length)out.lines.push(line);}
   if(!out.lines.length)throw Error('指定方向与楼层没有足够的连续普通泊位，请减少房间或改用 L1 / L2 的 X 方向。');
  }
  if(g.kind==='cluster'){
   out.zones=g.floors.map(f=>out.allowed.filter(n=>C.nodes[n].level===f-1)).filter(a=>a.length>=out.rooms.length);
   if(!out.zones.length)throw Error('所选房间无法集中在指定的同一楼层，请扩大楼层范围或减少房间。');
  }return out;
 });
 // Check overlapping floor requirements together, including rooms the user locks.
 const allowedByRoom=Array.from({length:24},()=>new Set(ordinary.map(n=>n.id)));
 for(const g of goals)if(g.allowed)for(const r of g.rooms)allowedByRoom[r]=new Set([...allowedByRoom[r]].filter(n=>g.allowed.includes(n)));
 for(const r of locked)allowedByRoom[r]=new Set([...allowedByRoom[r]].filter(n=>n===startPositions[r]));
 const assigned=new Map();
 function assign(r,seen){for(const n of allowedByRoom[r]){if(seen.has(n))continue;seen.add(n);if(!assigned.has(n)||assign(assigned.get(n),seen)){assigned.set(n,r);return true;}}return false;}
 if(Array.from({length:24},(_,r)=>r).some(r=>!assign(r,new Set())))throw Error('楼层容量、锁定房间或多个目标存在冲突，无法同时满足。');
 const tracked=new Set(goals.flatMap(g=>[...g.rooms,...(g.others||[])]));
 const key=layout=>layout.map(r=>r===null?'_':tracked.has(r)?String.fromCharCode(65+r):'*').join('');
 function zoneCost(pos,rooms,allowed){let cost=0;for(const r of rooms){const p=pos[r];if(!allowed.includes(p))cost+=6+Math.min(...allowed.map(n=>distances[p][n]))*2;}return cost;}
 function score(layout){
  const pos=positions(layout);let cost=0,soft=0;
  for(const g of goals){
   if(g.kind==='zone')cost+=zoneCost(pos,g.rooms,g.allowed);
   if(g.kind==='cluster'){cost+=Math.min(...g.zones.map(a=>zoneCost(pos,g.rooms,a)));for(let i=0;i<g.rooms.length;i++)for(let j=0;j<i;j++)soft+=spatial[pos[g.rooms[i]]][pos[g.rooms[j]]]*.015;}
   if(g.kind==='line')cost+=Math.min(...g.lines.map(line=>line.reduce((sum,n,i)=>sum+(pos[g.rooms[i]]===n?0:6+distances[pos[g.rooms[i]]][n]*2+(layout[n]===null?0:1)),0)));
   if(g.others)for(const a of g.rooms)for(const b of g.others){const d=spatial[pos[a]][pos[b]],gap=g.kind==='near'?d-g.distance:g.distance-d;if(gap>0)cost+=4+gap*3;}
  }
  for(let n=0;n<N;n++)if(layout[n]!==null&&C.nodes[n].lift)cost+=5;
  return {cost,soft};
 }
 const initialScore=score(initial),deadline=Date.now()+22000;let answer=initialScore.cost===0?{layout:initial.slice(),parent:null}:null;
 for(const pass of [{width:36,depth:70,staging:false,budget:6500},{width:80,depth:100,staging:true,budget:22000}]){
  if(answer)break;const end=Math.min(deadline,Date.now()+pass.budget),seen=new Set([key(initial)]);
  let beam=[{layout:initial.slice(),parent:null,depth:0,...initialScore}];
  for(let depth=0;depth<pass.depth&&beam.length&&Date.now()<end;depth++){
   const next=new Map();
   for(const state of beam){
    if(Date.now()>=end)break;
    for(let from=0;from<N;from++){
     const room=state.layout[from];if(room===null||locked.has(room)||forbidden.has(from))continue;
     const q=[from],visited=new Set(q);for(let i=0;i<q.length;i++)for(const n of C.graph[q[i]])if(!visited.has(n)&&!forbidden.has(n)&&state.layout[n]===null){visited.add(n);q.push(n);}
     for(const to of q.slice(1)){
      if(!pass.staging&&C.nodes[to].lift)continue;
      const layout=state.layout.slice();layout[from]=null;layout[to]=room;const hash=key(layout);if(seen.has(hash)||next.has(hash))continue;
      const s=score(layout),item={layout,parent:state,from,to,depth:depth+1,...s,rank:s.cost+s.soft+(depth+1)*.12};
      if(s.cost===0){answer=item;break;}next.set(hash,item);
     }if(answer)break;
    }if(answer)break;
   }if(answer)break;
   beam=[...next.entries()].sort((a,b)=>a[1].rank-b[1].rank).slice(0,pass.width).map(([hash,item])=>{seen.add(hash);return item;});
  }
 }
 if(!answer)throw Error('当前布局下在规划时限内未找到同时满足所有目标的路线。可减少组合条件、放宽楼层范围或开放通道；原布局已保留。');
 const steps=[];for(let s=answer;s.parent;s=s.parent)steps.unshift([s.from,s.to]);
 let layout=initial.slice();const moves=[];for(const [from,to] of steps){const m=C.move(layout,from,to,blocked);moves.push(m);layout=C.apply(layout,m);}
 C.validate(layout);if(score(layout).cost!==0||[...locked].some(r=>layout[startPositions[r]]!==r))throw Error('搬运计划未通过目标校验，原布局已保留。');
 const roomIds=[...tracked],nodes=roomIds.map(r=>layout.indexOf(r));
 return {request,moves,target:layout,roomIds,nodes,summary:request.interpretation+(request.assumptions.length?'\n理解说明：'+request.assumptions.join('；'):''),engine:'cloud'};
}
const api={parse,plan,validateIntent,planIntent};if(typeof module==='object'&&module.exports)module.exports=api;else root.LunarScheduler=api;
})(typeof globalThis==='object'?globalThis:this);
