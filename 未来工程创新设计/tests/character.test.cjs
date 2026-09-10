'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/core/simulation.js'),P=require('../src/core/character-routing.js');
test('safe stop accepts both cabin decks and rejects ladders, gaps and invalid positions',()=>{
 for(const position of [[0,14.08,28.75],[0,43.08,-28.75],[30,43.08,-28.75]])assert.equal(P.safeRoomPosition(position),true);
 for(const position of [[0,26,0],[C.config.width/2+1,14.08,0],[0,14.08,C.config.depth/2+1],[NaN,14.08,0],null])assert.equal(P.safeRoomPosition(position),false);
});
test('three names preserve ordered and repeated visits, waits and actions',()=>{
 for(const name of ['冯鹏','冯院长','冯老师']){
  const r=P.parse(`${name}先去 R14 停留 5 秒，再去 R20 停留 2 分钟并挥手，最后回 R14`);
  assert.deepEqual(r.visits.map(v=>v.room),[14,20,14]);assert.equal(r.visits[1].seconds,120);assert.equal(r.visits[1].action,'wave');
 }
 assert.equal(P.parse('将 R14 移动到二楼'),null);assert.throws(()=>P.parse('冯院长去 R99'));assert.throws(()=>P.parse('冯老师去居住舱'),/请指定房间/);
});
test('all room identities have distinct activities, goals and cooldowns',()=>{
 assert.equal(new Set(P.activities.map(a=>a.id)).size,P.activities.length);assert.ok(P.activities.length>=40);
 for(let p=0;p<P.profiles.length;p++){assert.ok(P.activities.filter(a=>a.profile===p).length>=5);assert.ok(P.modelTypes.includes(p));}
 const completed=Object.fromEntries(P.activities.map(a=>[a.id,100]));assert.equal(P.chooseActivity({completed,profileAt:{},fatigue:0},101,()=>0),null);
});
test('walking follows occupied room links and climbing changes floor without teleporting',()=>{
 assert.equal(P.walk(C.initial,0,2),null);
 const r=P.walk(C.initial,0,9);assert.ok(r.climbMetres>0);assert.deepEqual(r.rooms,[0,9]);
 r.pieces.forEach((p,i)=>{assert.ok(p.seconds>0);if(i)assert.deepEqual(p.a,r.pieces[i-1].b);});
 const floor=C.slots[C.initial.indexOf(9)][1];assert.ok(Math.abs(r.pieces.at(-1).b[1]-floor-14.08)<1e-8);
 const upper=P.walk(C.initial,0,0,{finish:[0,43.08,28.75]});assert.ok(upper.pieces.some(p=>p.kind==='climb'));assert.equal(upper.pieces.at(-1).b[1],C.slots[0][1]+43.08);
});
test('transport unlocks an isolated target using valid room moves and actual timing',()=>{
 const plan=P.plan({layout:C.initial,room:1,to:2,budgetMs:1200});let layout=C.initial;
 assert.ok(plan.moves.length>0);
 for(const m of plan.moves){const valid=C.move(layout,m.from,m.to);assert.deepEqual(valid.nodePath,m.nodePath);layout=C.apply(layout,m);}
 assert.deepEqual(layout,plan.layout);assert.ok(P.walk(layout,1,2));
 const tl=C.timeline(plan.moves);assert.ok(Math.abs(tl.duration-plan.transportSeconds)<1e-7);assert.ok(plan.total<=plan.search.fastest+plan.search.tolerance+1e-7);
});
test('locked rooms stay in place and blocked destinations cannot be fabricated',()=>{
 const plan=P.plan({layout:C.initial,room:0,to:1,locked:Array.from({length:24},(_,i)=>i),budgetMs:100});assert.equal(plan.moves.length,0);
 assert.throws(()=>P.plan({layout:C.initial,room:0,to:2,locked:Array.from({length:24},(_,i)=>i),budgetMs:100}),/没有找到/);
});
test('required autonomous transport relocates a relevant room and respects locks',()=>{
 const request={layout:C.initial,room:0,to:1,budgetMs:1200,requireTransport:true};
 assert.ok(P.walk(C.initial,0,1),'destination already supports walking');
 const result=P.plan(request);assert.ok(result.moves.length>0);
 assert.ok([0,1].some(r=>C.initial.indexOf(r)!==result.layout.indexOf(r)));
 let layout=C.initial;for(const m of result.moves){assert.deepEqual(C.move(layout,m.from,m.to).nodePath,m.nodePath);layout=C.apply(layout,m);}
 assert.deepEqual(result.layout,layout);assert.ok(P.walk(layout,0,1));
 assert.throws(()=>P.plan({...request,locked:Array.from({length:24},(_,i)=>i)}),/没有找到/);
});
test('after a walking trip, autonomous needs prefer an unconnected destination type',()=>{
 const state={room:1,walkOnlyTrips:1,completed:{},profileAt:{},fatigue:0};
 assert.equal(P.requiresTransport(state),true);assert.equal(P.requiresTransport({...state,walkOnlyTrips:0}),false);
 const a=P.chooseActivity(state,100,()=>.5,C.initial);
 assert.ok(P.modelTypes.some((type,r)=>type===a.profile&&r!==state.room&&!P.walk(C.initial,state.room,r)));
});
test('autonomous demand visits all room types without immediately repeating activities',()=>{
 const state={completed:{},profileAt:{},fatigue:0},types=new Set();let last=null;
 for(let now=30;now<=1200;now+=50){const a=P.chooseActivity(state,now,()=>.5);assert.ok(a);assert.notEqual(a.id,last);last=a.id;state.completed[a.id]=now;state.profileAt[a.profile]=now;types.add(a.profile);}
 assert.equal(types.size,P.profiles.length);
});
test('model-backed character interpretation uses visible room identities and validates output',async()=>{
 const savedFetch=global.fetch,savedKey=process.env.LUNARIS_API_KEY;process.env.LUNARIS_API_KEY='local-test-placeholder';
 try{
  const {interpret}=require('../src/server/server.cjs');let request;
  global.fetch=async(url,options)=>{request=JSON.parse(options.body);return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({kind:'character_itinerary',visits:[{room:20,action:'wave',seconds:5}]})}}]})};};
  const result=await interpret('请安排冯院长去医疗舱',C.initial,[],new AbortController().signal,'character_itinerary');
  assert.equal(result.visits[0].room,20);assert.match(request.messages[0].content,/人物行程/);const scene=JSON.parse(request.messages[1].content).scene;
  assert.equal(scene.rooms.find(r=>r.id===20).visibleProfile,'医疗舱');
 }finally{global.fetch=savedFetch;if(savedKey===undefined)delete process.env.LUNARIS_API_KEY;else process.env.LUNARIS_API_KEY=savedKey;}
});


test('gym identity resolves from both names and supplies useful autonomous needs',()=>{
 for(const word of ['健身房','健身舱'])assert.equal(P.parse('冯院长去'+word).visits[0].room,23);
 assert.equal(P.roomLabel(22),'R23 健身房');const needs=P.activities.filter(a=>a.profile===8);assert.equal(needs.length,6);
 for(const a of needs)assert.ok(P.activityThought(a).length>20);
 assert.match(P.visitThought({room:23,action:'idle'}),/乒乓球/);
});


test('dining names and eating requests preserve duration and explicit itinerary order',()=>{
 for(const word of ['餐厅','食堂','餐饮舱','吃饭','用餐']){
  const visit=P.parse('冯院长去'+word+'停留 2 分钟').visits[0];assert.equal(visit.room,19);assert.equal(visit.seconds,120);
 }
 assert.deepEqual(P.parse('冯老师先去健身房，再去餐厅吃饭，最后回 R15').visits.map(v=>v.room),[23,19,15]);
 const meals=P.activities.filter(a=>a.profile===9);assert.equal(meals.length,6);
 assert.ok(meals.every(a=>P.activityThought(a).length>20));assert.equal(P.roomLabel(18),'R19 餐厅');
 assert.ok(meals.filter(a=>/早餐|用餐|晚餐/.test(a.name)).every(a=>a.deck==='lower'&&a.role===0));
});
