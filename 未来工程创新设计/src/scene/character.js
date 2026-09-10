// One visible person, one mixer, and the application's existing RAF chain.
function createFengPeng(){
 const portrait=createCharacterPortrait();
 const D=LunarCharacter,group=new T.Group();group.name='冯鹏 / 冯院长 / 冯老师';station.add(group);
 // Reuse the existing skin and bones for an inexpensive, occlusion-independent
 // silhouette. The pale tint keeps the face and clothing readable in close-up.
 const highlightMaterial=new T.MeshBasicMaterial({color:'#efff50',transparent:true,opacity:.22,depthTest:false,depthWrite:false,toneMapped:false});
 const markerMaterial=new T.LineBasicMaterial({color:'#f4ff00',transparent:true,opacity:.95,depthTest:false,depthWrite:false,toneMapped:false});
 const ringPoints=Array.from({length:48},(_,i)=>new T.Vector3(Math.cos(i*Math.PI/24)*4.8,.14,Math.sin(i*Math.PI/24)*4.8));
 const footRing=new T.LineLoop(new T.BufferGeometry().setFromPoints(ringPoints),markerMaterial);footRing.name='character-highlight-ring';footRing.renderOrder=1002;group.add(footRing);
 const headMarker=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(-2,23,0),new T.Vector3(0,21,0),new T.Vector3(2,23,0)]),markerMaterial);headMarker.name='character-highlight-marker';headMarker.renderOrder=1002;group.add(headMarker);
 const highlights=[footRing,headMarker];
 const state={loaded:false,visible:true,highlight:true,walkOnlyTrips:0,paused:false,auto:true,follow:false,status:'载入角色',thought:'正在整理行装…',room:selectedRoom,position:[0,14.08,0],yaw:0,idle:0,clock:0,fatigue:0,completed:{},profileAt:{},failed:{},visits:[],index:0,history:[],progress:0,plan:null};
 let mixer,clips={},currentAction=null,hips,hipOrigin,model,groundOffset=0,loadError=null,planning=false,worker=null,generation=0,route=null,piece=0,pieceTime=0,activity=null,activityTime=0,transfer=null,pending=null,nextActivity=null,uiClock=0,previousView=null;
 let actionName='idle';
 let cancelWorker=null,roomReservation=false,roomHandoff=null;
 const snapshotExport=()=>({portrait:portrait.export(),name:'冯院长',room:state.room,position:state.position.slice(),status:state.status,thought:state.thought,visible:group.visible,highlighted:group.visible&&state.highlight,walkOnlyTrips:state.walkOnlyTrips,view:{follow:state.follow,name:viewName,floor:visibleFloor,section:sectionMode,visibleRooms:rooms.filter(r=>r.userData.visible).length},paused:state.paused,autonomous:state.auto,visits:structuredClone(state.visits),index:state.index,history:structuredClone(state.history),plan:state.plan,needs:{fatigue:state.fatigue,completed:{...state.completed}}});
 function log(event,detail={}){state.history.push({event,at:state.clock,...detail});if(state.history.length>160)state.history.shift();}
 function showThought(text){state.thought=text;uiClock=1;requestRender();}
 function animate(name){if(!clips[name])name='idle';if(name===actionName&&currentAction)return;actionName=name;const action=clips[name];if(!action)return;action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();if(currentAction)currentAction.crossFadeTo(action,.25,false);currentAction=action;}
 function retarget(gltf){
  const skin=[];gltf.scene.traverse(o=>{if(o.isSkinnedMesh)skin.push(o);});const skeleton=skin[0].skeleton,source=LunarCharacterAsset.sourceRest;
  const rotation=m=>{const q=new T.Quaternion();m.decompose(new T.Vector3(),q,new T.Vector3());return q;};
  const sourceRest=new Map(source.joints.map((n,i)=>[n,new T.Matrix4().fromArray(source.inverseBindMatrices,i*16).invert()])),targetRest=new Map(skeleton.bones.map((b,i)=>[b.name,skeleton.boneInverses[i].clone().invert()]));
  for(const clip of gltf.animations){
   if(!LunarCharacterAsset.clips.find(c=>c.name===clip.name)?.retarget)continue;
   for(const track of clip.tracks){const at=track.name.lastIndexOf('.'),name=track.name.slice(0,at),property=track.name.slice(at+1),bone=skeleton.getBoneByName(name);if(!bone||!sourceRest.has(name))continue;
    const sr=sourceRest.get(name),tr=targetRest.get(name),sp=sourceRest.get(bone.parent?.name)||new T.Matrix4(),tp=targetRest.get(bone.parent?.name)||new T.Matrix4();
    if(property==='quaternion'){
     const left=rotation(tp).invert().multiply(rotation(sp));
     const right=rotation(sr).invert().multiply(rotation(tr));
     for(let i=0;i<track.values.length;i+=4)new T.Quaternion().fromArray(track.values,i).premultiply(left).multiply(right).normalize().toArray(track.values,i);
    }else if(property==='position'&&name!=='Hips'){
     // Retain target bone lengths; translations in these clips are bind offsets.
     const local=tp.clone().invert().multiply(tr),p=new T.Vector3().setFromMatrixPosition(local);for(let i=0;i<track.values.length;i+=3)p.toArray(track.values,i);
    }
   }
  }
  // Root translation drives gait only; scene navigation owns locomotion.
  for(const clip of gltf.animations)for(const track of clip.tracks)if(track.name==='Hips.position'){
   const v=track.values,first=[v[0],v[1],v[2]],last=[...v.slice(-3)];for(let i=0;i<v.length;i+=3){const t=i/(v.length-3);v[i]=first[0];v[i+2]=first[2];if(clip.name==='climb')v[i+1]-=(last[1]-first[1])*t;}
  }
  return skin;
 }
 const bytes=Uint8Array.from(atob(LunarCharacterAsset.base64),c=>c.charCodeAt(0));
 new LunarGLTFLoader().parse(bytes.buffer,'',gltf=>{
  try{
   const meshes=retarget(gltf);model=gltf.scene;group.add(model);mixer=new T.AnimationMixer(model);
   for(const clip of gltf.animations)clips[clip.name]=mixer.clipAction(clip);
   animate('idle');mixer.update(0);model.updateMatrixWorld(true);
   const bounds=new T.Box3().setFromObject(model,true),size=bounds.getSize(new T.Vector3());
   if(!(size.y>0&&Number.isFinite(size.y)))throw Error('人物尺寸无效');
   model.scale.multiplyScalar(17/size.y);model.updateMatrixWorld(true);bounds.setFromObject(model,true);groundOffset=-bounds.min.y;model.position.y=groundOffset;
   hips=model.getObjectByName('Hips');hipOrigin=hips.position.clone();
   meshes.forEach(m=>{m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;if(m.material.map)m.material.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const glow=new T.SkinnedMesh(m.geometry,highlightMaterial);glow.name='character-highlight-silhouette';glow.position.copy(m.position);glow.quaternion.copy(m.quaternion);glow.scale.copy(m.scale);glow.bindMode=m.bindMode;glow.bind(m.skeleton,m.bindMatrix);glow.frustumCulled=false;glow.renderOrder=1001;m.parent.add(glow);highlights.push(glow);
   });
   portrait.setAsset(model,gltf.animations.find(c=>c.name==='walk'));
   state.loaded=true;state.status='待机';showThought('先安顿下来，看看周围。今天想把工作安排好，也给自己留一点休息的时间。');log('loaded',{clips:Object.keys(clips)});ui();
  }catch(e){loadError=e;state.status='角色载入失败';showThought(e.message);}
 },e=>{loadError=e;state.status='角色载入失败';showThought('角色素材无法读取，请重新构建项目。');});
 function currentLayout(){return snapshot().layout.slice();}
 function busy(){return planning||!!transfer||!!route||!!activity||state.visits.length>0;}
 function stopWorker(){generation++;cancelWorker?.();if(worker){worker.terminate();worker=null;}planning=false;}
 function settleRoomHandoff(error){const waiter=roomHandoff;roomHandoff=null;if(waiter){if(error)waiter.reject(Error(error));else waiter.resolve();}}
 function cancelRoomScheduling(message='房间调度已取消，请重新提交。'){roomReservation=false;settleRoomHandoff(message);}
 function releaseRoomScheduling(){roomReservation=false;}
 function clearTask(){stopWorker();route=null;activity=null;pending=null;state.visits=[];state.index=0;state.progress=0;state.plan=null;nextActivity=null;state.idle=0;state.status='待机';animate('idle');if(!transfer)settleRoomHandoff();}
 function safeToStop(){return !transfer&&D.safeRoomPosition(state.position)&&!(route&&route.pieces[piece]?.kind==='climb'&&pieceTime>0);}
 function requestSafeStop(){
  state.paused=false;
  if(transfer||route&&!safeToStop()){pending={command:'stop'};state.status='等待安全停靠';showThought('正在结束当前通行或搬运，到达安全位置后立即停止。');}
  else{clearTask();showThought('已停止人物行程，可以调度房间。');}
  ui();requestRender();
 }
 function prepareRoomScheduling(){
  if(estop)return Promise.reject(Error('请先解除急停，再提交调度目标。'));
  roomReservation=true;
  return new Promise((resolve,reject)=>{roomHandoff={resolve,reject};requestSafeStop();});
 }
 function control(command){
  if(roomReservation&&['resume','auto_on'].includes(command)){showThought('正在交接或执行房间调度，请等待本次调度完成。');return;}
  if(command==='pause'){if(roomReservation)cancelRoomScheduling('人物已暂停，房间调度已取消。重新提交后将继续安全停靠。');state.paused=true;showThought('先缓一缓，给自己一点时间想清楚接下来要做的事。');ui();return;}
  if(command==='resume'){state.paused=false;showThought(state.visits[state.index]?D.visitThought(state.visits[state.index]):'歇过一会儿了，接着把想做的事情做好。');return;}
  if(command==='auto_on'){state.auto=true;state.paused=false;state.idle=0;showThought('接下来自己安排一会儿。既想看看研究进展，也想照顾好日常生活。');return;}
  if(command==='auto_off'){state.auto=false;showThought('先把眼前这件事做好，之后就安心歇一会儿，等新的安排。');return;}
  if(command==='stop'){state.auto=false;requestSafeStop();}
 }
 async function dispatch(intent){
  const v=D.validateIntent(intent);if(v.command!=='go'){control(v.command);ui();return;}
  if(roomReservation)throw Error('正在交接或执行房间调度，请稍后再安排行程。');
  if(!state.loaded)throw Error(loadError?'角色加载失败，请刷新重试。':'角色正在载入，请稍候。');
  if(estop)throw Error('请先解除急停。');if(playing||time>0&&time<duration)throw Error('请先完成当前房间搬运并停靠。');
  if(transfer||route){pending=v;state.paused=false;showThought('有了新的安排，我先把这一步走稳，再认真做下一件事。');return;}
  clearTask();state.paused=false;state.visits=v.visits;state.speed=v.speed==='run'?2.6:1.35;log('manual-itinerary',{intent:v});await planVisit();
 }
 function calculate(data){
  const source=$('characterWorkerSource').textContent,url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
  return new Promise((resolve,reject)=>{const w=new Worker(url);URL.revokeObjectURL(url);worker=w;
   const finish=(error,plan)=>{clearTimeout(timer);w.terminate();if(worker===w){worker=null;cancelWorker=null;}error?reject(Error(error)):resolve(plan);};
   const timer=setTimeout(()=>finish('人物路线规划超时，请重试。'),10000);cancelWorker=()=>finish('人物规划已取消。');
   w.onmessage=e=>finish(e.data.error,e.data.plan);w.onerror=()=>finish('人物规划线程发生错误。');w.postMessage(data);
  });
 }
 async function planVisit(autoActivity=null){
  const visit=state.visits[state.index],a=autoActivity;if(!visit&&!a)return;
  const layout=currentLayout(),stamp=layout.join(','),token=++generation;planning=true;state.status='规划路线';state.idle=0;
  showThought(a?D.activityThought(a):D.visitThought(visit));
  try{
   let goals=a?D.modelTypes.flatMap((p,r)=>p===a.profile&&r!==state.room?[r]:[]):[visit.room-1];if(a&&!goals.length)goals.push(state.room);
   const requireTransport=!!a&&D.requiresTransport(state);
   if(requireTransport){const remote=goals.filter(r=>r!==state.room&&!D.walk(layout,state.room,r));if(remote.length)goals=remote;}
   const point=D.activityPoint(a||{deck:visit.deck,role:0});
   const result=await calculate({layout,room:state.room,goals,nextRooms:a?[]:state.visits.slice(state.index+1).map(v=>v.room-1),position:state.position.slice(),finish:point.position,speed:state.speed||1.35,blocked:blocked(),elevators:structuredClone(snapshot().elevators),budgetMs:1600,requireTransport});
   if(token!==generation)return;if(stamp!==currentLayout().join(','))throw Error('规划期间布局变化，请重新提交。');
   state.plan={destination:result.to,estimatedSeconds:result.estimatedSeconds,walkMetres:result.route.walkMetres,moves:result.moves.length,search:result.search};
   if(a){state.visits=[{room:result.to+1,seconds:a.seconds,action:'idle',deck:a.deck,activityId:a.id,hadTransport:false}];state.index=0;}
   state.visits[state.index].point=point;planning=false;log('plan',state.plan);
   if(result.moves.length){const elevators=structuredClone(snapshot().elevators),tl=C.timeline(result.moves,32,elevators);transfer={base:layout,elevators,phases:tl.phases,duration:tl.duration,time:0,target:result.layout,after:result.route};state.status='房间搬运';uiClock=1;requestRender();}
   else startWalk(result.route);
  }catch(e){if(token!==generation)return;planning=false;state.status='等待调整';if(a)state.failed[a.id]=state.clock;state.visits=[];state.idle=0;showThought(e.message);log('planning-failed',{reason:e.message});}
 }
 function startWalk(p){route=p;piece=0;pieceTime=0;state.status='前往目的地';uiClock=1;requestRender();if(!p.pieces.length)arrive();}
 function arrive(){route=null;if(pending){acceptPending();return;}const visit=state.visits[state.index];if(!visit)return;if(visit.activityId)state.walkOnlyTrips=visit.hadTransport?0:state.walkOnlyTrips+1;state.room=visit.room-1;state.position=visit.point.position.slice();state.yaw=visit.point.yaw;activity=visit;activityTime=0;animate(visit.action);state.status='到达活动';const a=D.activities.find(a=>a.id===visit.activityId);showThought(a?'到了，先静下心来。'+D.activityThought(a):D.visitThought(visit));log('arrived',{room:state.room,index:state.index});}
 function acceptPending(){if(!pending)return false;const task=pending;pending=null;clearTask();if(task.command==='stop'){showThought('已经停稳了，先歇一会儿，慢慢想想之后的安排。');return true;}dispatch(task).catch(e=>showThought(e.message));return true;}
 function tick(dt){
  portrait.tick(dt);
  if(!state.loaded)return;uiClock+=dt;if(uiClock>.12){uiClock=0;ui();}
  if(state.paused||document.hidden||estop)return;
  const step=dt;state.clock+=step;state.fatigue=Math.min(100,state.fatigue+step*.025);
  if(transfer){
   const stopDock=pending?transfer.phases.find(p=>p.type==='dock'&&p.end>transfer.time+1e-8):null;
   transfer.time=Math.min(transfer.duration,stopDock?.end??Infinity,transfer.time+step);state.progress=transfer.time/transfer.duration;animate('idle');
   if(transfer.time>=transfer.duration||stopDock&&transfer.time>=stopDock.end){const tr=transfer,end=C.state(tr.base,tr.phases,tr.time,tr.elevators);baseLayout=end.layout.slice();baseElevators=structuredClone(end.elevators);phases=[];moves=[];duration=time=0;playing=false;snapshotCache=null;transfer=null;showPlan();controls();if(!acceptPending()){const visit=state.visits[state.index];if(visit&&tr.time>=tr.duration)visit.hadTransport=true;startWalk(tr.after);}}
  }else if(route){
   let remaining=step;
   while(route&&remaining>0){const p=route.pieces[piece],part=Math.min(remaining,p.seconds-pieceTime);pieceTime+=part;remaining-=part;const u=Math.min(1,pieceTime/p.seconds),anchor=nodePositionFor(p.room);state.room=p.room;state.position=p.a.map((v,k)=>v+(p.b[k]-v)*u-anchor[k]);
    if(p.kind==='climb'){state.yaw=Math.PI/2;animate('climb');currentAction.timeScale=(p.b[1]>=p.a[1]?1:-1)*.84;state.status=p.b[1]>=p.a[1]?'攀爬上行':'攀爬下行';}
    else{state.yaw=Math.atan2(p.b[0]-p.a[0],p.b[2]-p.a[2]);animate((state.speed||1.35)>2?'run':'walk');state.status='行走';}
    state.progress=(piece+u)/route.pieces.length;
    if(u>=1){state.room=p.nextRoom;const nextAnchor=nodePositionFor(state.room);state.position=p.b.map((v,k)=>v-nextAnchor[k]);piece++;pieceTime=0;
     if(pending&&D.safeRoomPosition(state.position)){route=null;acceptPending();break;}
     if(piece>=route.pieces.length){arrive();break;}
    }
   }
  }else if(activity){activityTime+=step;state.progress=activity.seconds?Math.min(1,activityTime/activity.seconds):1;
   if(activityTime>=activity.seconds){const a=D.activities.find(a=>a.id===activity.activityId);if(a){state.completed[a.id]=state.clock;state.profileAt[a.profile]=state.clock;if(a.profile===0)state.fatigue=Math.max(0,state.fatigue-35);nextActivity=a.next;}log('activity-complete',{room:state.room,activity:activity.activityId});activity=null;state.index++;animate('idle');
    if(state.index<state.visits.length)planVisit();else{state.visits=[];state.index=0;state.idle=0;state.status='待机';showThought(a?`“${a.name}”这件事先告一段落。想留一点时间消化刚才的观察，再想下一件事。`:'这次到访结束了。想歇一会儿，把刚才看到的东西理一理。');}
   }
  }else if(!planning&&!roomReservation&&!scheduling&&!playing&&!(time>0&&time<duration)&&!manualMode){state.idle+=step;
   if(state.auto&&state.idle>=Number($('characterIdle').value||30)){const a=nextActivity&&!D.requiresTransport(state)?D.activities.find(a=>a.id===nextActivity):D.chooseActivity(state,state.clock,Math.random,currentLayout());nextActivity=null;if(a)planVisit(a);}
  }
  const rendered=state.visible&&(!studioMode||selectedRoom===state.room);if(rendered){mixer.update(step);if(hips&&actionName==='climb')hips.position.x=hipOrigin.x;renderer.shadowMap.needsUpdate=true;}
 }
 function nodePositionFor(room){return snapshot().positions[room];}
 function sync(){
  highlights.forEach(o=>{o.visible=state.highlight;});
  group.visible=state.loaded&&state.visible&&!cutaway&&(!studioMode||selectedRoom===state.room)&&(visibleFloor<0||Math.abs((nodePositionFor(state.room)[1]-C.config.baseY)/C.config.pitchY-visibleFloor)<.52);
  if(!state.loaded)return;const anchor=nodePositionFor(state.room);group.position.set(...state.position.map((v,k)=>v+anchor[k]));group.rotation.y=state.yaw;
  if(state.follow&&!roaming&&!studioMode){selectedRoom=state.room;sectionMode=true;const floor=Math.max(0,Math.min(4,Math.round((anchor[1]-C.config.baseY)/C.config.pitchY)));if(visibleFloor!==floor)applyFloorSelection(floor);goal.target.copy(group.position).add(new T.Vector3(0,9,0));}
 }
 function ui(){putText('characterStatus',`${D.roomLabel(state.room)} · ${state.paused?'已暂停':state.status}`);putText('characterThought',state.thought);$('characterProgress').value=state.progress;$('characterAuto').checked=state.auto;$('characterVisible').checked=state.visible;$('characterHighlight').checked=state.highlight;putText('characterPause',state.paused?'继续':'暂停');
  const summary=state.plan?`预计 ${state.plan.estimatedSeconds.toFixed(1)} 秒 · 步行 ${state.plan.walkMetres.toFixed(1)} 米 · 搬运 ${state.plan.moves} 次`:D.profiles.length+' 类舱室 · '+D.activities.length+' 项自主活动';putText('characterMetrics',summary);
  const text=state.visits.map((v,i)=>`${i<state.index?'✓':i===state.index?'→':'·'} ${D.roomLabel(v.room-1)} · ${v.seconds} 秒`).join('\n');putText('characterItinerary',text);
 }
 function stopFollowing(){
  if(!state.follow)return;state.follow=false;sectionMode=previousView?.section||false;applyFloorSelection(previousView?.floor??-1);
  $('characterFocus').setAttribute('aria-pressed','false');putText('characterFocus','跟随观察');requestRender();
 }
 function focus(){
  if(state.follow){const saved=previousView;stopFollowing();chooseView(saved?.name==='studio'?'overview':saved?.name||'overview');if(saved&&saved.name!=='studio'){applyFloorSelection(saved.floor);selectedRoom=saved.room;goal={...saved.goal,target:saved.goal.target.clone()};}}
  else{const saved={name:viewName,section:sectionMode,floor:visibleFloor,room:selectedRoom,goal:{...goal,target:goal.target.clone()}};chooseView('overview');showPanel(null);previousView=saved;state.follow=true;goal.distance=180;goal.pitch=.65;goal.yaw=.6;selectedRoom=state.room;sectionMode=true;}
  $('characterFocus').setAttribute('aria-pressed',String(state.follow));putText('characterFocus',state.follow?'退出跟随':'跟随观察');requestRender();
 }
 function reset(){cancelRoomScheduling('布局已重置，房间调度已取消，请重新提交。');stopFollowing();state.walkOnlyTrips=0;pending=null;transfer=null;clearTask();state.room=selectedRoom;state.position=[0,14.08,0];state.paused=false;state.plan=null;state.idle=0;showThought('周围重新安顿好了，想先熟悉一下这里，再开始今天的事情。');}
 function setPanelExpanded(expanded){portrait.setExpanded(expanded);const panel=$('characterPanel'),body=$('characterPanelBody'),toggle=$('characterPanelToggle');panel.classList.toggle('is-collapsed',!expanded);toggle.setAttribute('aria-expanded',String(expanded));toggle.setAttribute('aria-label',expanded?'收起冯院长面板':'展开冯院长面板');body.inert=!expanded;body.setAttribute('aria-hidden',String(!expanded));if(!expanded&&body.contains(document.activeElement))toggle.focus();}
 $('characterPanelClose').onclick=()=>setPanelExpanded(false);
 $('characterPanelToggle').onclick=()=>setPanelExpanded($('characterPanelToggle').getAttribute('aria-expanded')!=='true');
 $('characterPanel').addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();setPanelExpanded(false);$('characterPanelToggle').focus();}});
 $('characterHighlight').onchange=e=>{state.highlight=e.target.checked;requestRender();};
 $('characterVisible').onchange=e=>{state.visible=e.target.checked;requestRender();};$('characterAuto').onchange=e=>control(e.target.checked?'auto_on':'auto_off');$('characterPause').onclick=()=>control(state.paused?'resume':'pause');$('characterStop').onclick=()=>control('stop');$('characterFocus').onclick=focus;
 $('characterExample').onclick=()=>{$('scheduleInput').value='冯院长先去 R14 停留 5 秒，再去 R20 停留 8 秒并挥手';showPanel('schedulerPanel');$('scheduleInput').focus();};
 return {state,tick,sync,dispatch,reset,busy,ui,focus,stopFollowing,prepareRoomScheduling,cancelRoomScheduling,releaseRoomScheduling,export:()=>({...snapshotExport(),busy:busy(),planning,pendingCommand:pending?.command||null,roomScheduling:roomReservation,transferring:!!transfer}),get roomScheduling(){return roomReservation;},get transferring(){return !!transfer;},get needsFrames(){return portrait.needsFrames||state.loaded&&!state.paused&&(state.visible||busy()||state.auto);},get transportState(){return transfer?C.state(transfer.base,transfer.phases,transfer.time,transfer.elevators):null;},get planning(){return planning;}};
}
