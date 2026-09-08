/* Offline Chinese scheduling: explicit language constraints → collision-checked moves. */
(function(root){
'use strict';
const C=typeof module==='object'&&module.exports?require('./simulation-core.js'):root.LunarCore;
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
const api={parse,plan};if(typeof module==='object'&&module.exports)module.exports=api;else root.LunarScheduler=api;
})(typeof globalThis==='object'?globalThis:this);
