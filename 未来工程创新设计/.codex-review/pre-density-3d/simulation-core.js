/* Shared deterministic planning core; millimetres and seconds. */
(function(root){
'use strict';
const slots=[[160,390],[320,390],[480,390],[640,390],[160,210],[320,210],[480,210],[640,210],[400,120]];
function route(start,end,occupied,blocked=[]){
 const xs=[80,160,240,320,400,480,560,640,720],ys=[120,210,300,390,480];
 const key=p=>p.join(','),clear=p=>!occupied.some(q=>Math.abs(p[0]-q[0])<66&&Math.abs(p[1]-q[1])<46)&&!blocked.some(b=>p[0]>b[0]-36&&p[0]<b[2]+36&&p[1]>b[1]-26&&p[1]<b[3]+26);
 function edge(a,b){const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/5);for(let i=0;i<=n;i++)if(!clear([a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n]))return false;return true;}
 if(!clear(start)||!clear(end))throw Error('起点或目标受到占用或封闭区影响');
 const open=[start],cost=new Map([[key(start),0]]),prev=new Map(),closed=new Set();
 while(open.length){open.sort((a,b)=>cost.get(key(a))+Math.abs(a[0]-end[0])+Math.abs(a[1]-end[1])-cost.get(key(b))-Math.abs(b[0]-end[0])-Math.abs(b[1]-end[1]));const p=open.shift(),k=key(p);if(closed.has(k))continue;closed.add(k);
  if(k===key(end)){let out=[end];while(prev.has(key(out[0])))out.unshift(prev.get(key(out[0])));return out.filter((p,i,a)=>i===0||i===a.length-1||!((a[i-1][0]===p[0]&&p[0]===a[i+1][0])||(a[i-1][1]===p[1]&&p[1]===a[i+1][1])));}
  const xi=xs.indexOf(p[0]),yi=ys.indexOf(p[1]);for(const [x,y] of [[xi-1,yi],[xi+1,yi],[xi,yi-1],[xi,yi+1]]){if(x<0||y<0||x>=xs.length||y>=ys.length)continue;const q=[xs[x],ys[y]],qk=key(q),g=cost.get(k)+Math.abs(q[0]-p[0])+Math.abs(q[1]-p[1]);if(edge(p,q)&&g<(cost.get(qk)??Infinity)){cost.set(qk,g);prev.set(qk,p);open.push(q);}}
 }throw Error('没有满足舱段尺寸与安全间距的路径，请解除封闭区或调整布局');
}
function plan(initial,target,blocked=[]){
 if(initial.length!==8||target.length!==8||new Set(initial).size!==8||new Set(target).size!==8||[...initial,...target].some(x=>!Number.isInteger(x)||x<0||x>7))throw Error('每个舱段必须且只能出现一次');
 const at=[...initial,null],moves=[];function move(from,to){const room=at[from];if(room===null||at[to]!==null)throw Error('换位状态无效');const path=route(slots[from],slots[to],at.flatMap((r,i)=>r!==null&&i!==from?[slots[i]]:[]),blocked);moves.push({room,from,to,path});at[to]=room;at[from]=null;}
 while(target.some((r,i)=>at[i]!==r)){if(moves.length>40)throw Error('规划超过安全步数');const empty=at.findIndex((r,i)=>i<8&&r===null);if(empty>=0)move(at.indexOf(target[empty]),empty);else{if(at[8]!==null)throw Error('等待区未释放');move(target.findIndex((r,i)=>at[i]!==r),8);}}
 if(at[8]!==null)throw Error('等待区未恢复为空');return moves;
}
const length=p=>p.slice(1).reduce((s,q,i)=>s+Math.hypot(q[0]-p[i][0],q[1]-p[i][1]),0);
function timeline(moves,v=80){
 if(!Number.isFinite(v)||v<=0)throw Error('速度必须大于零');let cursor=0,head=[400,120],phases=[];
 const add=(type,d,extra)=>{phases.push({type,start:cursor,end:cursor+d,...extra});cursor+=d;};
 for(const m of moves){const from=slots[m.from],to=slots[m.to],empty=[head,[from[0],head[1]],from];add('position',Math.max(.5,length(empty)/v),{...m,path:empty});add('pick',1,{...m});for(let i=0;i<m.path.length-1;i++){const path=m.path.slice(i,i+2);add('drag',1.5*length(path)/v,{...m,path});}add('drop',1,{...m});head=to;}
 if(moves.length)add('return',Math.max(.5,length([head,[400,head[1]],[400,120]])/v),{path:[head,[400,head[1]],[400,120]]});return {phases,duration:cursor};
}
function point(path,u){let d=length(path)*u;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d<=l||i===path.length-1){const f=l?Math.min(1,d/l):1;return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];}d-=l;}return path[0];}
function state(initial,phases,t){const positions=initial.reduce((a,r,i)=>(a[r]=slots[i].slice(),a),[]);let head=[400,120],lift=0,active=-1,type='ready',finished=0;for(const p of phases){if(t<p.start)break;const u=Math.max(0,Math.min(1,(t-p.start)/(p.end-p.start))),s=u*u*(3-2*u);type=p.type;active=p.room??-1;if(p.type==='position'||p.type==='return'){head=point(p.path,u);lift=0;}if(p.type==='pick'){head=slots[p.from];lift=s;}if(p.type==='drag'){head=point(p.path,s);positions[p.room]=head;lift=1;}if(p.type==='drop'){head=slots[p.to];positions[p.room]=head;lift=1-s;if(t>=p.end)finished++;}if(t<p.end)break;}if(phases.length&&t>=phases.at(-1).end){type='done';active=-1;}return {positions,head,lift,active,type,finished};}
const api={slots,route,plan,length,timeline,state};if(typeof module!=='undefined')module.exports=api;root.LunarCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
