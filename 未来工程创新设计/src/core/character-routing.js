/* Character intentions and transport planning. Also runs in a Web Worker. */
(function(root){
'use strict';
const C=typeof module==='object'&&module.exports?require('./simulation.js'):root.LunarCore;
const profiles=['居住舱','生命支持舱','能源舱','生物培养舱','医疗舱','工程工坊','数据核心舱','指挥舱'];
const modelTypes=C.roomTypes.map(t=>[5,3,0,2,5,7][t]);modelTypes[13]=1;modelTypes[19]=4;modelTypes[11]=6;
const activityNames=[
 ['短暂休息','睡眠恢复','享用餐食','补充饮水','整理个人物品','回顾个人日程'],
 ['查看空气循环','检查供氧读数','查看水处理','巡检过滤设备','复核环境记录'],
 ['查看电池余量','核对配电负载','巡检热控','检查备用电源记录','评估实验用能'],
 ['观察植株','检查幼苗','查看培养环境','检查营养液记录','登记样本','复核培养进展'],
 ['例行健康自查','查看体征记录','复核体检日程','盘点医疗耗材','查看恢复建议'],
 ['检查工具','查看加工任务','检查装配件','巡视机器人工作台','复核维修记录','核查材料样件'],
 ['分析实验数据','检查计算任务','核对备份记录','查看网络状态','巡检机柜冷却','整理任务资料'],
 ['查看任务简报','安排当日工作','查看导航信息','检查通信链路','汇报研究进展','复盘任务']
];
const reasons=[['工作一阵了，休息一下','补充精力再开始下一项工作','该吃点东西了','先喝点水','整理好随身物品','看看接下来的安排'],['该检查空气循环了','确认一下供氧读数','看看水处理记录','定期检查过滤设备','复核今天的环境记录'],['确认下一项任务的供电余量','查看各回路负载','检查热控设备状态','复核备用电源记录','评估实验的用能安排'],['看看植株的生长情况','去观察幼苗','核对培养环境记录','看看营养液记录','记录今天的样本','复核培养进展'],['安排一次例行自查','看看自己的体征记录','确认体检安排','清点医疗耗材记录','回顾健康恢复建议'],['确认工具齐备','看看加工任务进度','检查装配件记录','巡视机器人工作台','复核维修记录','看看材料样件'],['整理样本并分析数据','查看计算任务进度','确认备份记录','检查网络状态','巡视机柜冷却','整理今天的任务资料'],['查看今天的任务简报','安排下一阶段工作','复核导航信息','检查通信链路','汇报最新研究进展','复盘已完成的任务']];
const activities=activityNames.flatMap((names,profile)=>names.map((name,i)=>({id:`${profile}:${i}`,profile,name,reason:reasons[profile][i],role:i%3,deck:i%2?'upper':'lower',seconds:12+(i%4)*5,cooldown:180+i*20,next:profile===3&&i===4?'6:0':profile===6&&i===0?'7:4':null})));
const personalThoughts=[
 ['一直惦记着工作，肩膀都有点僵了。想回去靠一会儿，让自己放松下来。','想好好睡一觉，养足精神再处理那些需要动脑筋的事情。','有点想念热乎的饭菜了。先去吃点东西，工作也得有精神才行。','说了这么久，想喝杯水润润嗓子，顺便歇一歇。','东西放得顺手，做事才不会手忙脚乱。想把自己的物品整理一下。','事情一多就容易顾此失彼。想找个安静地方，把接下来的安排理清楚。'],
 ['大家都要在这里生活很久，我想亲自看看空气循环设备，心里更踏实些。','想去看看供氧记录，弄明白这套系统平时是怎样维持稳定的。','每天用的水是怎么循环回来的？想再去水处理区仔细看看。','过滤设备平时不显眼，却少不了它。想花点时间做一次例行观察。','想把今天的环境记录梳理一下，看看有没有值得继续关注的变化。'],
 ['后面还有实验要安排，想先看看电池余量，做计划时心里有数。','想弄清各个设备的用电情况，看看任务安排还有没有协调的余地。','设备散热这件事不能只看表面。想去热控区看看平时的运行记录。','备用方案平时也得熟悉。想再翻翻备用电源的检查记录。','实验想法不少，得先想清楚要用多少电。去能源舱核对一下更合适。'],
 ['在月球上看到绿色总让人心情好些。想去看看那些植株长得怎么样。','我一直惦记着那几盘幼苗，想凑近看看新叶子有没有变化。','想弄明白温度和湿度对培养有什么影响，去看看环境记录。','养好这些植物可不只是浇水。想研究一下营养液的配比记录。','观察到的细节不记下来，很快就忘了。想把样本逐一看清楚、登记好。','想把最近几次培养记录放在一起看，也许能找到下一步研究的线索。'],
 ['忙起来就容易忽略自己，想抽点时间做个例行健康自查。','想认真看看自己的体征记录，了解休息和工作节奏是否合适。','不想让体检和实验安排撞在一起，去把日程确认清楚。','医疗用品需要时得找得到。想熟悉一下耗材清单和存放位置。','工作要紧，也得学会恢复精力。想看看有哪些适合自己的休息建议。'],
 ['想动手做点东西，先去看看工具是否齐备、放在哪里。','惦记着那项加工任务，想去工坊看看进展，想想后面怎么衔接。','图纸上的东西变成实物是什么样？想近距离看看装配件。','机器人做精细操作挺有意思，想去工作台旁观察一下。','以前的维修经验可能帮得上忙，想翻翻记录，把容易忽略的地方记住。','脑子里有个材料方面的想法，想对照样件看一看，能不能找到线索。'],
 ['样本看过了，我想把数据放在一起比较，弄清这些现象之间有没有联系。','一直惦记着计算结果，想去看看任务进度，好安排下一步。','资料攒了不少，想确认备份记录，免得以后找不到研究过程。','想了解各舱之间的数据怎么传递，去网络运维台看看。','算得快也要散得了热。想看看机柜冷却的记录，了解设备的工作条件。','零散的资料越来越多，想把它们整理成以后能直接查阅的笔记。'],
 ['想先弄明白今天最重要的事情，看看任务简报再开始忙。','大家的工作得衔接起来。我想把今天的任务排一排，留出沟通的时间。','想看看基地的位置和导航信息，把周围的空间关系再熟悉一下。','想熟悉一下通信联络的安排，等需要沟通时就不用临时翻找。','有些研究进展想讲清楚，去指挥舱整理一下要汇报的重点。','事情做完也值得回头想想。我想复盘一下，看看下次能不能做得更顺。']
];
function activityThought(a){return personalThoughts[a.profile][Number(a.id.split(':')[1])];}
function visitThought(visit){
 if(visit.action==='wave')return '到了先挥挥手打个招呼，再留点时间看看周围，不必来去都那么匆忙。';
 if(visit.action==='push')return '想过去试试推行动作，留意自己的站位和手边有没有足够的空间。';
 const interests=['感受一下起居空间，找个舒服的地方歇一会儿','了解一下空气和水是怎样循环利用的','看看能源设备，熟悉供电和散热的安排','看看绿植和样本，留意那些容易错过的小变化','熟悉一下诊疗区，看看健康检查的安排','近距离看看工具和加工设备，找点动手的灵感','看看计算和数据设备，梳理一下手头的资料','看看任务安排，把接下来的工作想清楚'];
 return `既然安排了这次到访，我想${interests[modelTypes[visit.room-1]]}。`;
}
const roomLabel=r=>`R${String(r+1).padStart(2,'0')} ${profiles[modelTypes[r]]}`;
const nodePosition=(layout,r)=>C.slots[layout.indexOf(r)];
const foot=deck=>deck==='upper'?43.08:14.08;
function activityPoint(a){return {position:[0,foot(a?.deck),a?.role===2?-28.75:28.75],yaw:a?.role===1?Math.PI/2:-Math.PI/2};}
const length=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k]));
function walk(layout,from,to,options={}){
 C.validate(layout);const speed=options.speed||1.35,climbSpeed=.32,start=options.position||[0,foot(options.deck),0],finish=options.finish||[0,14.08,0];
 const routes=new Map(),queue=[{room:from,seconds:0,steps:[]}];routes.set(from,0);let found;
 const links=C.connections(layout,{unavailable:options.unavailable||[]});
 while(queue.length){queue.sort((a,b)=>a.seconds-b.seconds);const q=queue.shift();if(q.seconds!==routes.get(q.room))continue;if(q.room===to){found=q;break;}
  for(const l of links){if(l.roomA!==q.room&&l.roomB!==q.room)continue;const dest=l.roomA===q.room?l.roomB:l.roomA;
   const a=nodePosition(layout,q.room),b=nodePosition(layout,dest),points=l.axis===1?[[0,14.08,0],[30,14.08,0],[30,14.08,-28.75],[30,b[1]-a[1]+14.08,-28.75],[30,b[1]-a[1]+14.08,0],[b[0]-a[0],b[1]-a[1]+14.08,b[2]-a[2]]]:[[0,14.08,0],[b[0]-a[0],14.08,b[2]-a[2]]];
   const world=points.map(p=>p.map((v,k)=>v+a[k])),cost=world.slice(1).reduce((s,p,i)=>s+length(p,world[i])*.1/(Math.abs(p[1]-world[i][1])>1?climbSpeed:speed),0),total=q.seconds+cost;
   if(total<(routes.get(dest)??Infinity)){routes.set(dest,total);queue.push({room:dest,seconds:total,steps:[...q.steps,{from:q.room,to:dest,points:world,vertical:l.axis===1}]});}
  }
 }
 if(!found)return null;
 const pieces=[];let cursor=start.slice(),owner=from;
 function segment(a,b,room,nextRoom=room){if(length(a,b)<1e-6)return;const vertical=Math.abs(a[1]-b[1])>1&&Math.abs(a[0]-b[0])+Math.abs(a[2]-b[2])<.01;pieces.push({a,b,room,nextRoom,kind:vertical?'climb':'walk',seconds:length(a,b)*.1/(vertical?climbSpeed:speed)});}
 function localPath(dest){
  const anchor=nodePosition(layout,owner),points=[cursor.slice()];
  if(Math.abs(cursor[1]-dest[1])>1){points.push([30,cursor[1],0],[30,cursor[1],-28.75],[30,dest[1],-28.75],[30,dest[1],0]);}
  else if(cursor[0]!==0&&cursor[2]!==0)points.push([0,cursor[1],cursor[2]]);
  points.push([0,dest[1],0]);if(dest[2]!==0)points.push([0,dest[1],dest[2]]);points.push(dest.slice());
  for(let i=1;i<points.length;i++)segment(points[i-1].map((v,k)=>v+anchor[k]),points[i].map((v,k)=>v+anchor[k]),owner);
  cursor=dest.slice();
 }
 localPath([0,14.08,0]);
 for(const s of found.steps){for(let i=1;i<s.points.length;i++)segment(s.points[i-1],s.points[i],s.from,i===s.points.length-1?s.to:s.from);owner=s.to;cursor=[0,14.08,0];}
 localPath(finish);
 return {pieces,seconds:pieces.reduce((s,p)=>s+p.seconds,0),walkMetres:pieces.filter(p=>p.kind==='walk').reduce((s,p)=>s+length(p.a,p.b)*.1,0),climbMetres:pieces.filter(p=>p.kind==='climb').reduce((s,p)=>s+length(p.a,p.b)*.1,0),rooms:[from,...found.steps.map(s=>s.to)]};
}
function validateIntent(raw){
 if(!raw||raw.kind!=='character_itinerary')throw Error('人物指令格式无效。');
 if(raw.clarification)throw Error(String(raw.clarification).slice(0,300));
 const command=raw.command||'go';if(!['go','pause','resume','stop','auto_on','auto_off'].includes(command))throw Error('未知人物控制指令。');
 if(command!=='go')return {kind:raw.kind,command};
 if(!Array.isArray(raw.visits)||!raw.visits.length||raw.visits.length>12)throw Error('请指定 1–12 个依次到访的房间。');
 const visits=raw.visits.map(v=>{if(!Number.isInteger(v.room)||v.room<1||v.room>24)throw Error('房间编号必须为 R01–R24。');const seconds=v.seconds??8;if(!Number.isFinite(seconds)||seconds<0||seconds>3600)throw Error('停留时间须为 0–3600 秒。');if(!['idle','wave','push'].includes(v.action||'idle'))throw Error('暂不支持该到达动作。');if(v.deck&&!['lower','upper'].includes(v.deck))throw Error('舱内楼层无效。');return {room:v.room,seconds,action:v.action||'idle',deck:v.deck||'lower'};});
 return {kind:raw.kind,command,visits,speed:raw.speed==='run'?'run':'walk',interpretation:typeof raw.interpretation==='string'?raw.interpretation.slice(0,600):visits.map(v=>roomLabel(v.room-1)).join(' → ')};
}
function parse(text){
 if(!/冯鹏|冯院长|冯老师/.test(text))return null;
 if(/暂停/.test(text))return validateIntent({kind:'character_itinerary',command:'pause'});
 if(/继续|恢复/.test(text)&&!/[Rr]\s*\d/.test(text))return validateIntent({kind:'character_itinerary',command:'resume'});
 if(/停止|取消/.test(text))return validateIntent({kind:'character_itinerary',command:'stop'});
 if(/自主|自由活动/.test(text))return validateIntent({kind:'character_itinerary',command:/关闭|不要/.test(text)?'auto_off':'auto_on'});
 const re=/[Rr]\s*0*(\d{1,3})|居住(?:舱|单元)?|生命支持舱?|能源舱?|生物培养舱?|医疗舱?|工程工坊|数据核心舱?|指挥舱?/g;
 const matches=[...text.matchAll(re)];if(!matches.length)return null;
 const visits=matches.map((m,i)=>{let room;if(m[1])room=Number(m[1]);else{const p=profiles.findIndex(n=>n.startsWith(m[0].replace('单元',''))||m[0].startsWith(n));const ids=modelTypes.flatMap((t,r)=>t===p?[r+1]:[]);if(ids.length!==1)throw Error(`“${m[0]}”对应 ${ids.map(r=>'R'+String(r).padStart(2,'0')).join('、')}，请指定房间编号。`);room=ids[0];}
  const suffix=text.slice(m.index+m[0].length,matches[i+1]?.index??text.length),seconds=suffix.match(/(?:停留|等待|休息|待机)\s*(\d+(?:\.\d+)?)\s*(秒|分钟|分)/);return {room,seconds:seconds?Number(seconds[1])*(seconds[2]==='秒'?1:60):8,action:/挥手/.test(suffix)?'wave':/推/.test(suffix)?'push':'idle',deck:/上层/.test(suffix)?'upper':'lower'};});
 return validateIntent({kind:'character_itinerary',visits,speed:/跑/.test(text)?'run':'walk'});
}
function requiresTransport(state){return (state.walkOnlyTrips||0)>=1;}
function chooseActivity(state,now,random=Math.random,layout=null){
 let eligible=activities.filter(a=>now-(state.completed[a.id]??-Infinity)>=a.cooldown&&now-(state.failed?.[a.id]??-Infinity)>90);
 if(layout&&requiresTransport(state)){
  const disconnected=new Set(modelTypes.flatMap((p,r)=>r!==state.room&&!walk(layout,state.room,r)?[p]:[]));
  const remote=eligible.filter(a=>disconnected.has(a.profile));if(remote.length)eligible=remote;
 }
 const ranked=eligible.map(a=>({a,score:(now-(state.profileAt[a.profile]??0))*.015+(a.profile===0?state.fatigue*.02:0)+random()*1.5})).sort((a,b)=>b.score-a.score);
 return ranked[0]?.a||null;
}
function plan(request){
 const {layout,room,blocked=[],elevators=C.config.baseY,position=[0,14.08,0],speed=1.35,finish=[0,14.08,0]}=request;
 C.validate(layout);const goals=request.goals||[request.to],locked=new Set(request.locked||[]),deadline=Date.now()+(request.budgetMs??1800),evaluated=[],seen=new Set();
 let frontier=[{layout,moves:[],elevators,transportSeconds:0}],expanded=0;
 const heuristic=s=>Math.min(...goals.map(g=>{const a=nodePosition(s.layout,room),b=nodePosition(s.layout,g);return length(a,b)*.1/3;}));
 function evaluate(s){for(const goal of goals){
  // A required demonstration must actually relocate the occupied or destination
  // room; shuffling an unrelated room cannot satisfy the transport cadence.
  if(request.requireTransport&&(!s.moves.length||![room,goal].some(r=>layout.indexOf(r)!==s.layout.indexOf(r))))continue;
  const route=walk(s.layout,room,goal,{position,speed,finish});if(!route)continue;const total=s.transportSeconds+route.seconds;evaluated.push({...s,to:goal,route,total});}}
 evaluate(frontier[0]);
 for(let depth=0;depth<5&&frontier.length&&Date.now()<deadline;depth++){
  const next=[];
  for(const state of frontier){
   const movable=state.layout.flatMap((r,n)=>r!==null&&!locked.has(r)?[n]:[]).sort((a,b)=>(state.layout[b]===room||goals.includes(state.layout[b]))-(state.layout[a]===room||goals.includes(state.layout[a])));
   for(const from of movable)for(let to=0;to<C.nodes.length;to++){
    if(Date.now()>=deadline)break;if(C.nodes[to].lift||state.layout[to]!==null)continue;
    let move;try{move=C.move(state.layout,from,to,blocked);}catch{continue;}
    const changed=C.apply(state.layout,move),key=changed.join(',');if(seen.has(key))continue;seen.add(key);
    const tl=C.timeline([move],32,state.elevators),n={layout:changed,moves:[...state.moves,move],elevators:tl.elevators,transportSeconds:state.transportSeconds+tl.duration};expanded++;
    evaluate(n);next.push(n);
   }
  }
  next.sort((a,b)=>(a.transportSeconds+heuristic(a))-(b.transportSeconds+heuristic(b)));frontier=next.slice(0,12);
 }
 if(!evaluated.length)throw Error('在当前通道约束和搜索时限内没有找到可执行路线。人物保留在原房间，可调整布局后重试。');
 // Compare several first-leg layouts against the next requested visit. This
 // bounded look-ahead avoids optimizing only the first room in an itinerary.
 if(request.nextRooms?.length){
  const unique=new Map();evaluated.sort((a,b)=>a.total-b.total);
  for(const p of evaluated){const key=p.layout.join(',');if(!unique.has(key))unique.set(key,p);if(unique.size>=4)break;}
  const continued=[];
  for(const p of unique.values())try{
   const next=plan({layout:p.layout,room:p.to,to:request.nextRooms[0],position:finish,speed,blocked,elevators:p.elevators,locked:[...locked],budgetMs:200});
   continued.push({...p,objectiveSeconds:p.total+next.total,nextEstimate:next.total});
  }catch{}
  if(continued.length)evaluated.splice(0,evaluated.length,...continued);
 }
 const fastest=Math.min(...evaluated.map(p=>p.objectiveSeconds??p.total)),tolerance=Math.min(2,fastest*.05),close=evaluated.filter(p=>(p.objectiveSeconds??p.total)<=fastest+tolerance);
 close.sort((a,b)=>a.route.walkMetres-b.route.walkMetres||a.moves.length-b.moves.length||a.total-b.total);
 const answer=close[0];return {...answer,plannedFrom:layout.slice(),search:{expanded,candidates:evaluated.length,fastest,tolerance,scope:'限时搜索中的最优候选'},estimatedSeconds:answer.total};
}
const api={profiles,modelTypes,activities,activityThought,visitThought,roomLabel,activityPoint,walk,parse,validateIntent,chooseActivity,requiresTransport,plan};
if(typeof module==='object'&&module.exports)module.exports=api;else root.LunarCharacter=api;
})(typeof globalThis==='object'?globalThis:this);
