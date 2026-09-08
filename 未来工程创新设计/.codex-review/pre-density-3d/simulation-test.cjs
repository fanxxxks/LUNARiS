const assert=require('node:assert/strict'),C=require('./simulation-core.js');
const initial=[0,1,2,3,4,5,6,7];
function check(target,blocked=[]){const moves=C.plan(initial,target,blocked),at=[...initial,null];for(const m of moves){assert.equal(at[m.to],null);assert.equal(at[m.from],m.room);assert.deepEqual(m.path[0],C.slots[m.from]);assert.deepEqual(m.path.at(-1),C.slots[m.to]);for(let j=1;j<m.path.length;j++){const a=m.path[j-1],b=m.path[j];assert.ok(a[0]===b[0]||a[1]===b[1]);for(let k=0;k<=100;k++){const p=[a[0]+(b[0]-a[0])*k/100,a[1]+(b[1]-a[1])*k/100];at.forEach((r,i)=>{if(r!==null&&i!==m.from)assert.ok(Math.abs(p[0]-C.slots[i][0])>=66||Math.abs(p[1]-C.slots[i][1])>=46,'swept collision');});}}at[m.to]=at[m.from];at[m.from]=null;}assert.deepEqual(at,[...target,null]);const tl=C.timeline(moves),end=C.state(initial,tl.phases,tl.duration);target.forEach((r,i)=>assert.deepEqual(end.positions[r],C.slots[i]));return moves;}
assert.equal(check(initial).length,0);assert.equal(check([1,0,2,3,4,5,6,7]).length,3);
check([7,6,5,4,3,2,1,0]);check([1,2,3,4,5,6,7,0]);check([1,0,2,3,4,5,6,7],[[360,270,440,330]]);
assert.throws(()=>C.plan(initial,[0,0,2,3,4,5,6,7]));assert.throws(()=>C.plan(initial,[1,0,2,3,4,5,6,7],[[0,0,800,600]]));
let seed=42;for(let n=0;n<200;n++){const t=[...initial];for(let i=7;i>0;i--){seed=(1664525*seed+1013904223)>>>0;const j=seed%(i+1);[t[i],t[j]]=[t[j],t[i]];}check(t);}
console.log('PASS: 204 layouts, buffered swap, independent swept-clearance checks, target states, duplicate and blocked-path rejection');
