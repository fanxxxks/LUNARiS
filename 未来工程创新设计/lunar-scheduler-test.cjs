'use strict';
const assert=require('node:assert/strict'),C=require('./simulation-core.js'),S=require('./lunar-scheduler.js');
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS:',name);}
function verify(text,initial=C.initial,blocked=[]){
 const before=initial.slice(),p=S.plan(text,initial,blocked);assert.deepEqual(initial,before,'Planning must not mutate the live layout');
 let layout=initial.slice();
 for(const move of p.moves){
  assert.deepEqual(move.layoutBefore,layout);assert.equal(layout[move.to],null);
  for(let i=1;i<move.nodePath.length;i++)assert.ok(C.edgeClear(move.nodePath[i-1],move.nodePath[i],layout,move.room,blocked),'Swept collision-free edge');
  layout=C.apply(layout,move);C.validate(layout);
 }
 assert.deepEqual(layout,p.target);assert.equal(new Set(layout.filter(r=>r!==null)).size,24);
 assert.deepEqual(p.roomIds.map(r=>C.roomTypes[r]),p.request.types);
 assert.ok(p.nodes.every(n=>!C.nodes[n].lift));
 if(p.request.level!==null)assert.ok(p.nodes.every(n=>C.nodes[n].level===p.request.level));
 const links=C.connections(layout);
 for(let i=1;i<p.nodes.length;i++){
  assert.equal(C.neighbor(p.nodes[i-1],p.request.axis,1),p.nodes[i]);
  assert.ok(links.some(l=>l.roomA===p.roomIds[i-1]&&l.roomB===p.roomIds[i]||l.roomB===p.roomIds[i-1]&&l.roomA===p.roomIds[i]));
 }
 const tl=C.timeline(p.moves),st=C.state(initial,tl.phases,tl.duration);assert.deepEqual(st.layout,p.target);
 if(p.moves.length)assert.equal(st.type,'done');
 return p;
}
test('User example compiles to actual moves and consecutive six-face connections',()=>verify('构建一条直线相连的居住模块、材料模块、通信模块'));
test('Specified floor and X direction are honored',()=>verify('在一层沿 X 方向将能源、物资、通信模块直线相连'));
test('Z direction is honored',()=>verify('L1 沿 Z 方向将材料、生命、居住直线相连'));
test('Repeated module types use distinct rooms',()=>{const p=verify('居住、居住、通信直线相连');assert.equal(new Set(p.roomIds).size,3);});
test('Four-room layout is possible',()=>verify('L1 居住、材料、通信、能源直线相连'));
test('Scheduling works from a previously reconfigured layout',()=>verify('材料、居住、通信直线相连',C.preset('district').target));
test('Closed shaft is excluded throughout all transfers',()=>verify('居住、材料、通信直线相连',C.initial,[C.lift(1,'C')]));
test('Already satisfied instruction produces no movement',()=>{const p=verify('居住、材料、通信直线相连');const same=verify('居住、材料、通信直线相连',p.target);assert.equal(same.moves.length,0);});
test('Unsupported, negated, unknown and ambiguous requests fail without mutation',()=>{
 for(const text of ['', '居住', '医疗、材料、通信直线相连','居住、材料、火箭模块直线相连','不要移动居住、材料、通信','把居住和通信放在环形上','L9 居住、材料直线相连','L1 L2 居住、材料直线相连','X Z 居住、材料直线相连','三个居住模块和通信模块相连','居住、居住、居住、居住、通信直线相连','L5 沿 X 方向居住、材料、通信直线相连']){
  const layout=C.initial.slice();assert.throws(()=>S.plan(text,layout),undefined,text);assert.deepEqual(layout,C.initial);
 }
});
test('Fully blocked layout fails without moving rooms',()=>assert.throws(()=>S.plan('居住、材料、通信直线相连',C.initial,C.nodes.map(n=>n.id))));
console.log(`${passed}/${passed} scheduler checks passed.`);
