const taskNames={vertical:'科研协作案例',cascade:'维修隔离案例',district:'基地扩建案例',manual:'手动调度',natural:'自然语言调度'};
const phaseNames={ready:'已就绪',retract:'升降托架收拢',emptyLift:'空载升降机构定位',deploy:'升降托架展开',unlock:'解除泊位锁定',translate:'沿楼板导轨平移',elevate:'内部升降 · Y 轴跨层',dock:'落座对接并锁定',done:'重构完成'};
const metres=n=>(n*C.config.metresPerUnit).toFixed(1),fmt=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
let fengPeng=null;
const backgroundAudio=createLunarAudio();
let baseLayout=C.initial.slice(),baseElevators=C.config.baseY,moves=[],phases=[],duration=0,time=0,playing=false,estop=false,task='vertical',ready=false,events=[];
let flowData=null,flowKey='',flowClock=0,benchmark=null,nextRenderDeadline=0,lastDiagnosticsAt=-Infinity;
let previewMove=null,walking=false,sectionMode=false,needsRender=true,rafPending=false,inFrame=false,lastNow=performance.now(),snapshotCache=null;
let selectedRoom=1,visibleFloor=-1,manualMode=false,pendingManual=false,cutaway=false,viewName='overview',roaming=false,routeKey='',toastTimer;
let studioMode=false,studioDeck='exterior';
const studioTransition=createStudioTransition();
let studioTarget=null,studioCommit=null;
let yaw=.72,pitch=.2,distance=1230,target=new T.Vector3(-30,212,0),goal={yaw:.72,pitch:.2,distance:1230,target:new T.Vector3(-30,212,0)};
const freePosition=new T.Vector3(),held=new Set();let freeYaw=0,freePitch=0,roamSpeed=1;
const mobile=()=>window.innerWidth<=760;
let activePanel=null,chosenMission=null,naturalPlan=null,scheduling=false,railTimer=null,railPinned=false;
const railZone='.sidebar,.side-panel,.view-cluster,.inspection-stack';
function expandRail(open){document.body.classList.toggle('rail-open',open);$('railToggle').setAttribute('aria-expanded',String(open));$('railToggle').setAttribute('aria-label',railPinned?'收起左侧导航':open?'固定展开左侧导航':'展开左侧导航');}
function scheduleRailClose(){clearTimeout(railTimer);railTimer=setTimeout(()=>{if(railPinned||[...document.querySelectorAll(railZone)].some(panel=>!panel.hidden&&panel.matches(':hover')))return;const focused=document.activeElement;if(focused?.closest?.(railZone)&&(['INPUT','TEXTAREA','SELECT'].includes(focused.tagName)||focused.matches?.(':focus-visible')))return;showPanel(null);expandRail(false);},350);}
$('sidebar').addEventListener('pointerenter',e=>{if(e.pointerType==='touch')return;clearTimeout(railTimer);expandRail(true);});
document.addEventListener('pointerover',e=>{if(e.target.closest?.(railZone))clearTimeout(railTimer);});
document.addEventListener('pointerout',e=>{if(e.target.closest?.(railZone)&&!e.relatedTarget?.closest?.(railZone))scheduleRailClose();});
document.addEventListener('focusin',e=>{if(e.target.closest?.(railZone)){clearTimeout(railTimer);expandRail(true);}});
document.addEventListener('focusout',e=>{if(e.target.closest?.(railZone))scheduleRailClose();});
$('railToggle').onclick=()=>{railPinned=!railPinned;expandRail(railPinned);if(!railPinned){showPanel(null);$('railToggle').blur();}};
const panelOpeners={missionPanel:'openMissions',schedulerPanel:'openScheduler',viewPanel:'openViews',floorPanel:'openFloors'};
function showPanel(id,focus=false){
 const previous=activePanel;activePanel=id;if(previous==='floorPanel'&&id!=='floorPanel')exitManual();if(id!=='viewPanel')showOtherViews(false);held.clear();if(id){clearTimeout(railTimer);expandRail(true);if(previous!==id)$(id).scrollTop=0;}
 for(const [panel,opener] of Object.entries(panelOpeners)){
  $(panel).hidden=panel!==id;$(opener).classList.toggle('active',panel===id);$(opener).setAttribute('aria-expanded',String(panel===id));
 }
 if(focus&&id)$(id).querySelector('[data-close-panel]').focus();
 else if(focus&&previous)$(panelOpeners[previous]).focus();
}
for(const [panel,opener] of Object.entries(panelOpeners))$(opener).onclick=()=>showPanel(activePanel===panel?null:panel);
function showOtherViews(open){$('otherViewsMenu').hidden=!open;$('otherViewsToggle').setAttribute('aria-expanded',String(open));}
$('otherViews').addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')showOtherViews(true);});
$('otherViews').addEventListener('pointerleave',()=>{if(!$('otherViews').contains(document.activeElement))showOtherViews(false);});
$('otherViews').addEventListener('focusout',e=>{if(!$('otherViews').contains(e.relatedTarget))showOtherViews(false);});
$('otherViewsToggle').onclick=()=>showOtherViews($('otherViewsMenu').hidden);
$('otherViewsToggle').addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();showOtherViews(true);$('closeup').focus();}});
$('otherViews').addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('otherViewsMenu').hidden){e.preventDefault();e.stopPropagation();showOtherViews(false);$('otherViewsToggle').focus();}});
document.querySelectorAll('[data-close-panel]').forEach(button=>button.onclick=()=>showPanel(null,true));
document.addEventListener('click',event=>{if(activePanel&&!event.target.closest(railZone)&&event.target.tagName!=='CANVAS'&&!event.target.closest('.character-panel'))showPanel(null);});
const overviewDistance=()=>mobile()?1320:1230;
distance=goal.distance=overviewDistance();
const audit=(event,detail)=>events.push({event,time:+time.toFixed(3),detail});
function notify(message,bad=false){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.toggle('bad',bad);$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,bad?6500:3800);}
const blocked=()=>$('block').checked?[C.lift(1,'C')]:[];
const snapshot=()=>{const personTransfer=fengPeng?.transportState;if(personTransfer)return personTransfer;if(!snapshotCache||snapshotCache.base!==baseLayout||snapshotCache.phases!==phases||snapshotCache.time!==time)snapshotCache={base:baseLayout,phases,time,state:C.state(baseLayout,phases,time,baseElevators)};return snapshotCache.state;};
function requestRender(){needsRender=true;resetAccumulation();if(!rafPending&&!inFrame){rafPending=true;lastNow=performance.now();nextRenderDeadline=0;requestAnimationFrame(frame);}}
for(const event of ['pointerdown','pointerup','wheel','input','change','click','keydown','keyup'])document.addEventListener(event,requestRender,true);
const putText=(id,value)=>{const e=$(id),v=String(value);if(e.textContent!==v)e.textContent=v;};
const viewButtons=['overview','closeup','topview','elevation','mechanism','roam','studio'];
const studioProfileButtons=[],studioDeckButtons={exterior:'studioExterior',lower:'studioLower',upper:'studioUpper'};
const studioDescriptions=[['单床睡眠区、对坐沙发、餐桌与生活收纳。','书桌、饮水台与盆栽，围绕起居与休息布置。'],['氧气储瓶、水回收过滤罐与空气循环设备。','过滤罐组、风机柜与生命保障监测。'],['电池机架、储能罐与配电逆变设备。','双电池机架、能源监测与配电操作台。'],['成熟叶菜水培架、营养液系统与显微分析台。','分层幼苗培养架、育苗区与显微分析台。'],['诊疗床、输液架、监护仪与医疗储物。','诊疗床、无菌耗材药柜与双屏检测台。'],['工具挂板、虎钳、机械臂工位与数控加工台。','机械臂、数控加工台与精密工具操作区。'],['双服务器机架、液冷风机柜与运维台。','服务器设备、液冷系统与运维监测。'],['双屏工作台、大屏任务席与驾驶操作席。','任务监控大屏、双屏工位与驾驶控制。'],['乒乓球桌、球网与球拍，双跑步机、拉伸垫和毛巾收纳。','力量训练架、卧推凳、动感单车、哑铃架与补水收纳。'],['四人餐桌卡座、餐盘餐具、热餐配餐台与清洗回收区。','茶饮吧、交流卡座、食品储藏柜与餐具收纳。']];
function updateStudioUI(){
 $('studioPanel').hidden=!studioMode;document.body.classList.toggle('studio-mode',studioMode);
 const profile=roomModelTypes[selectedRoom],model=moduleProfiles()[profile];
 const chosen=studioTarget?roomModelTypes[studioTarget.room]:profile,chosenDeck=studioTarget?.deck||studioDeck;
 studioProfileButtons.forEach((b,i)=>{b.classList.toggle('active',i===chosen);b.setAttribute('aria-pressed',String(i===chosen));});
 for(const [deck,id] of Object.entries(studioDeckButtons)){$(id).classList.toggle('active',deck===chosenDeck);$(id).setAttribute('aria-pressed',String(deck===chosenDeck));}
 $('studioPanel').setAttribute('aria-busy',String(Boolean(studioTarget)));
 putText('studioCode',model.code);putText('studioTitle',model.name);$('studioPanel').style.setProperty('--studio-color',model.color);
 putText('studioCaption',studioDeck==='exterior'?'通透舷窗、金属围护与双层舱室。':studioDescriptions[profile][studioDeck==='lower'?0:1]);
}
function cancelStudioSwitch(commitPending=false){
 const commit=studioCommit;studioTransition.reset();studioCommit=null;studioTarget=null;
 if(commitPending&&commit)commit();
 updateStudioUI();
}
function switchStudio(room,deck=studioTarget?.deck||studioDeck){
 if(!studioMode||room<0)return;
 cancelStudioSwitch();
 if(room===selectedRoom&&deck===studioDeck)return;
 const commit=()=>{
  const positions=snapshot().positions,delta=new T.Vector3().fromArray(positions[room]).sub(new T.Vector3().fromArray(positions[selectedRoom]));
  const heights={exterior:35,lower:27,upper:53};delta.y+=heights[deck]-heights[studioDeck];
  // Move the camera's reference origin with the room while it is dissolved.
  // The orbital angle, zoom and actual simulation positions stay unchanged.
  target.add(delta);goal.target.add(delta);selectedRoom=room;studioDeck=deck;studioCommit=null;
  updateStudioUI();drawUI(snapshot());requestRender();
 };
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){commit();return;}
 studioTarget={room,deck};studioCommit=commit;
 studioTransition.start(selectedRoom,studioDeck,room,deck,commit);updateStudioUI();requestRender();
}
function leaveStudio(){if(!studioMode)return;cancelStudioSwitch();updateStudioEnvironment(-1,'exterior');studioMode=false;studioDeck='exterior';updateStudioUI();}
function focusStudio(){
 const p=snapshot().positions[selectedRoom];goal={yaw:.6,pitch:studioDeck==='exterior'?.4:.65,distance:mobile()?330:300,target:new T.Vector3(p[0],p[1]+(studioDeck==='lower'?27:studioDeck==='upper'?53:35),p[2])};
 updateStudioUI();
 // Centre the room in the space beside the catalogue, in world units at this zoom.
 const height=Math.max(1,stage.clientHeight),panel=$('studioPanel').getBoundingClientRect(),cameraDistance=goal.distance*Math.max(1,.9/camera.aspect),unitsPerPixel=2*cameraDistance*Math.tan(camera.fov*Math.PI/360)/height;
 if(mobile())goal.target.y-=Math.min(height*.48,panel.height+20)*.5*unitsPerPixel/Math.cos(goal.pitch);
 else{const offset=Math.min(stage.clientWidth*.38,panel.width+48)*.5*unitsPerPixel;goal.target.x+=Math.cos(goal.yaw)*offset;goal.target.z-=Math.sin(goal.yaw)*offset;}
 requestRender();drawUI(snapshot());
}
moduleProfiles().forEach((profile,index)=>{
 const b=document.createElement('button');b.className='studio-profile';b.type='button';b.textContent=profile.name;b.setAttribute('aria-label',`观察${profile.name}`);b.setAttribute('aria-pressed','false');
 b.onclick=()=>switchStudio(roomModelTypes.indexOf(index));$('studioProfiles').appendChild(b);studioProfileButtons.push(b);
});
for(const [deck,id] of Object.entries(studioDeckButtons))$(id).onclick=()=>switchStudio(studioTarget?.room??selectedRoom,deck);
$('exitStudio').onclick=()=>chooseView('overview');
const axisButtons=[...document.querySelectorAll('[data-axis]')];
const missionButtons=[...document.querySelectorAll('[data-task]')];
const mapButtons=[],floorItems=[],mapStates=[];let mapFloor=0,targetMapKey="",reachableTargets=new Set();
for(let level=0;level<C.config.layers;level++){
 const item=document.createElement('div');item.className='floor-item';item.dataset.level=level;floorItems.push(item);
 const button=document.createElement('button');button.className='floor-select';button.setAttribute('aria-label',`单独观察 L${level+1} 层`);button.setAttribute('aria-pressed','false');button.innerHTML=`<span>L${level+1}</span>`;button.onclick=()=>setFloor(visibleFloor===level?-1:level);item.appendChild(button);
 const grid=document.createElement('div');grid.className='floor-grid';grid.hidden=level!==mapFloor;item.appendChild(grid);
 C.nodes.forEach((node,i)=>{if(node.level!==level)return;const b=document.createElement('button');b.className='bay-dot'+(node.lift?' lift':'');b.style.gridColumn=String(node.col+3);b.style.gridRow=String(node.row+2);b.textContent='＋';b.dataset.node=i;b.onclick=()=>selectBay(i);grid.appendChild(b);mapButtons.push(b);});$('floorMaps').appendChild(item);
}
function setMapFloor(level){mapFloor=level;floorItems.forEach(item=>{const active=Number(item.dataset.level)===level;item.classList.toggle('map-current',active);item.children[1].hidden=!active;});}
function applyFloorSelection(level){visibleFloor=level;if(level>=0)setMapFloor(level);$('allFloors').classList.toggle('active',level<0);$('allFloors').setAttribute('aria-pressed',String(level<0));floorItems.forEach(item=>{const active=Number(item.dataset.level)===level;item.classList.toggle('selected',active);item.querySelector('button').setAttribute('aria-pressed',String(active));});}
function setFloor(level){fengPeng?.stopFollowing();leaveStudio();requestRender();applyFloorSelection(level);if(level<0)chooseView('overview');else{cutaway=false;roaming=false;viewName='layer';goal={yaw:.64,pitch:.72,distance:mobile()?1160:980,target:new T.Vector3(level>=2?-55:-12,C.config.baseY+level*C.config.pitchY+25,0)};updateViewButtons();}drawUI(snapshot());}
$('allFloors').onclick=()=>setFloor(-1);
function controls(){
 requestRender();lastUI=-Infinity;

 document.body.classList.toggle('manual-mode',manualMode||pendingManual);
 putText('play',!ready?'暂无可用计划':estop?'解除急停':playing?'Ⅱ 暂停演示':manualMode&&phases.length===0?'等待手动指令':time>=duration&&duration?'↺ 再次演示':time>0?'▶ 继续演示':'▶ 开始演示');
 $('play').disabled=!ready||(!phases.length&&!estop);$('timeline').disabled=!phases.length||estop;$('replay').disabled=!phases.length;$('export').disabled=!ready;
 $('manual').classList.toggle('active',manualMode);$('manual').setAttribute('aria-pressed',String(manualMode));
 missionButtons.forEach(b=>{const active=b.dataset.task===task&&b.dataset.task===chosenMission;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
}
function updateViewButtons(){viewButtons.forEach(id=>{$(id).classList.toggle('active',id===viewName);$(id).setAttribute('aria-pressed',String(id===viewName));});}
function chooseView(name){
 fengPeng?.stopFollowing();

 requestRender();resetPointerState();
 if(name==='studio'){
  if(studioTransition.active)cancelStudioSwitch(true);
  showPanel(null);studioMode=true;studioDeck='exterior';playing=false;pendingManual=false;manualMode=false;previewMove=null;roaming=false;cutaway=false;viewName='studio';applyFloorSelection(-1);railPinned=false;expandRail(false);focusStudio();controls();updateViewButtons();return;
 }
 leaveStudio();
 if(name==='roam'&&roaming)name='overview';if(name==='overview'||name==='mechanism')applyFloorSelection(-1);viewName=name;cutaway=name==='mechanism';
 if(name==='roam'){if(cutaway)cutaway=false;freePosition.copy(camera.position);const direction=new T.Vector3();camera.getWorldDirection(direction);freeYaw=Math.atan2(direction.x,direction.z);freePitch=Math.asin(direction.y);roaming=true;manualMode=false;pendingManual=false;previewMove=null;controls();notify('自由漫游：WASD 移动，Q / E 垂直升降，拖动改变朝向。');}
 else{roaming=false;if(cutaway){playing=false;controls();}const st=snapshot(),p=st.positions[selectedRoom];
 if(name==='closeup'){playing=false;controls();applyFloorSelection(Math.max(0,Math.min(C.config.layers-1,Math.round((p[1]-C.config.baseY)/C.config.pitchY))));goal={yaw:.24,pitch:.4,distance:mobile()?370:320,target:new T.Vector3(p[0],p[1]+35,p[2])};}
 else if(name==='topview')goal={yaw:0,pitch:1.53,distance:mobile()?1450:1320,target:new T.Vector3(-30,visibleFloor<0?180:C.config.baseY+visibleFloor*C.config.pitchY,0)};
 else if(name==='elevation')goal={yaw:.15,pitch:.055,distance:mobile()?1320:1230,target:new T.Vector3(-30,212,0)};
 else goal={yaw:.72,pitch:cutaway?.3:.2,distance:overviewDistance(),target:new T.Vector3(-30,212,0)};
 }
 updateViewButtons();
}
for(const id of viewButtons)$(id).onclick=()=>chooseView(id);
function showPlan(){

 $('timeline').max=duration||1;putText('total',String(moves.length));putText('distance',metres(moves.reduce((sum,m)=>sum+C.length(m.path),0))+' m');putText('verticalDistance',String(Math.round(moves.reduce((s,m)=>s+m.vertical,0)*C.config.metresPerUnit)));
 putText('planDistance',metres(moves.reduce((sum,m)=>sum+C.length(m.path),0)));
 $('log').innerHTML=moves.map(m=>`<li>${buildingNames[m.room]}<br>${C.nodes[m.from].label} → ${C.nodes[m.to].label}${m.vertical?' · 跨层':''}</li>`).join('')||'<li>选择建筑后，使用房间与空闲泊位。</li>';
}
function compile(name,auto=true){
 fengPeng?.reset();
 naturalPlan=null;task=name;manualMode=false;pendingManual=false;estop=false;playing=false;time=0;baseLayout=C.initial.slice();baseElevators=C.config.baseY;previewMove=null;events=[];selectedRoom=C.missions[name].roomIds[0];
 try{const p=C.preset(name,blocked());moves=p.moves;const tl=C.timeline(moves,32,baseElevators);phases=tl.phases;duration=tl.duration;ready=true;playing=auto;audit('plan',{task,initial:baseLayout.slice(),target:p.target,blocked:blocked(),metresPerUnit:C.config.metresPerUnit});}
 catch(e){moves=[];phases=[];duration=0;ready=false;notify(e.message,true);}
 showPlan();setFloor(-1);chooseView('overview');controls();drawUI(snapshot());
}
missionButtons.forEach(b=>b.onclick=()=>{chosenMission=b.dataset.task;compile(b.dataset.task,true);});
function scheduleStamp(){return JSON.stringify({time,phases:phases.length,base:baseLayout,layout:snapshot().layout,blocked:blocked(),estop,task});}
async function computeNaturalPlan(text,layout,closed){
 let intent=null;
 if(location.protocol!=='file:'){
  const token=document.querySelector('meta[name="lunaris-session"]')?.content;
  if(!token)throw Error('请通过「启动高性能仿真」打开页面，以连接自然语言调度服务。');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),85000);
  try{
   putText('scheduleStatus','正在理解房间与空间目标…');
   const response=await fetch('/api/interpret',{method:'POST',headers:{'Content-Type':'application/json','X-Lunaris-Session':token},body:JSON.stringify({text,layout,blocked:closed}),signal:controller.signal});
   let result;try{result=await response.json();}catch{throw Error('本机调度服务响应异常，请重新启动仿真。');}
   if(!response.ok)throw Error(result.error||'模型解析失败，请重试。');
   intent=LunarScheduler.validateIntent(result.intent);
  }catch(e){if(e.name==='AbortError')throw Error('模型解析超时，请稍后重试。');if(e instanceof TypeError)throw Error('本机调度服务连接中断，请重新启动仿真。');throw e;}
  finally{clearTimeout(timer);}
  putText('scheduleStatus',`${intent.interpretation}\n正在校验目标并规划可通行的搬运路线…`);
 }else{
  try{LunarScheduler.parse(text);}catch{throw Error('当前是离线页面，仅支持按类型直线排列。请通过「启动高性能仿真」启用智能调度，处理分层与模糊调度。');}
 }
 const source=$('schedulerWorkerSource')?.textContent;
 if(typeof Worker==='undefined'||!source){if(intent)throw Error('浏览器无法启动后台规划线程，请使用 Edge 或 Chrome 重新打开。');return new Promise((resolve,reject)=>setTimeout(()=>{try{resolve(LunarScheduler.plan(text,layout,closed));}catch(e){reject(e);}},30));}
 return new Promise((resolve,reject)=>{const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));let worker;
  try{worker=new Worker(url);}catch(e){URL.revokeObjectURL(url);reject(Error('调度计算线程未能启动，请刷新页面重试。'));return;}
  const finish=()=>{worker.terminate();URL.revokeObjectURL(url);clearTimeout(timeout);};
  const timeout=setTimeout(()=>{finish();reject(Error('规划超时，请减少目标模块或调整楼层后重试。'));},intent?26000:12000);
  worker.onmessage=e=>{finish();e.data.error?reject(Error(e.data.error)):resolve(e.data.plan);};worker.onerror=()=>{finish();reject(Error('调度计算失败，请刷新页面后重试。'));};
  worker.postMessage({text,intent,layout,blocked:closed});
 });
}
$('scheduleForm').onsubmit=async e=>{
 e.preventDefault();if(scheduling)return;
 let roomSchedulingOwned=false;
 $('scheduleStatus').classList.remove('bad');
 try{
  if(estop)throw Error('请先解除急停，再提交调度目标。');
  if(time>0&&time<duration)throw Error('当前计划尚未完成。请先播放至停靠完成，或恢复初始房间布局后提交。');
  const text=$('scheduleInput').value.trim();if(!text||text.length>600)throw Error('请输入 1–600 字的调度目标。');
  scheduling=true;$('scheduleSubmit').disabled=true;
  if(/冯鹏|冯院长|冯老师/.test(text)){
   let intent=LunarCharacter.parse(text);
   if(!intent){
    const token=document.querySelector('meta[name="lunaris-session"]')?.content;if(!token)throw Error('请用本机启动器打开以解析复杂人物指令，或使用“冯院长先去 R14，再去 R20”等明确指令。');
    scheduling=true;$('scheduleSubmit').disabled=true;
    const response=await fetch('/api/interpret',{method:'POST',headers:{'Content-Type':'application/json','X-Lunaris-Session':token},body:JSON.stringify({text,layout:snapshot().layout,blocked:blocked(),kind:'character_itinerary'})});
    const result=await response.json();if(!response.ok)throw Error(result.error);intent=LunarCharacter.validateIntent(result.intent);
   }
   await fengPeng.dispatch(intent);putText('scheduleStatus',intent.interpretation||'人物控制已更新');$('scheduleTargets').replaceChildren();return;
  }
  if(fengPeng){
   roomSchedulingOwned=true;putText('scheduleStatus','正在结束人物行程；通行或搬运中的人物将在安全停靠后自动交接房间调度…');
   await fengPeng.prepareRoomScheduling();
   if(!fengPeng.roomScheduling||estop)throw Error('房间调度已中断，请解除急停或重新提交。');
  }
  const initial=snapshot().layout.slice(),elevators=structuredClone(snapshot().elevators),stamp=scheduleStamp();
  scheduling=true;$('scheduleSubmit').disabled=true;putText('scheduleStatus','正在解析目标并搜索可通行的搬运路线…');
  const p=await computeNaturalPlan(text,initial,blocked());
  if(stamp!==scheduleStamp()||fengPeng&&!fengPeng.roomScheduling)throw Error('计算期间场景或通道状态已变化，请重新提交指令。');
  const tl=C.timeline(p.moves,32,elevators);
  playing=false;manualMode=false;pendingManual=false;previewMove=null;estop=false;
  naturalPlan=p;task='natural';baseLayout=initial;baseElevators=elevators;moves=p.moves;
  phases=tl.phases;duration=tl.duration;time=0;ready=true;events=[];selectedRoom=p.roomIds[0];
  audit('natural-plan',{request:p.request,target:p.target,roomIds:p.roomIds,blocked:blocked()});
  showPlan();chooseView('overview');playing=moves.length>0;controls();drawUI(snapshot());
  $('scheduleTargets').replaceChildren(...p.roomIds.map((id,i)=>{const li=document.createElement('li');li.textContent=`${i+1}. R${String(id+1).padStart(2,'0')} ${buildingNames[id]} · ${C.nodes[p.nodes[i]].label}`;return li;}));
  putText('scheduleStatus',moves.length?`${p.summary}\n已生成 ${moves.length} 次搬运，正在自动执行。`:`目标已满足 · ${p.summary}`);
  notify(moves.length?`调度已开始 · ${moves.length} 次搬运。`:'当前布局已满足指令，目标模块已高亮。');
 }catch(error){$('scheduleStatus').classList.add('bad');putText('scheduleStatus',error.message);}
 finally{if(roomSchedulingOwned)fengPeng?.releaseRoomScheduling();scheduling=false;$('scheduleSubmit').disabled=false;requestRender();}
};
$('scheduleReset').onclick=()=>{$('scheduleInput').value='';$('scheduleInput').focus();};
$('scheduleInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();$('scheduleForm').requestSubmit();}});
$('motionHighlight').onchange=()=>requestRender();
// One reusable edge geometry per room, drawn after opaque geometry with depth disabled.
const motionFrames=new T.Group();motionFrames.name='motion-xray-outlines';station.add(motionFrames);
const motionBox=new T.BoxGeometry(C.config.width+2,C.config.height+2,C.config.depth+2);motionBox.translate(0,C.config.height/2,0);
const motionEdges=new T.EdgesGeometry(motionBox);motionBox.dispose();
const motionMaterial=new T.LineBasicMaterial({color:'#c5ffdc',depthTest:false,depthWrite:false,transparent:true,opacity:.94,toneMapped:false});
const roomOutlines=rooms.map(()=>{const outline=new T.LineSegments(motionEdges,motionMaterial);outline.renderOrder=1000;outline.visible=false;motionFrames.add(outline);return outline;});
function updateMotionOverlay(st){
 if(studioMode){roomOutlines.forEach(outline=>outline.visible=false);$('motionBubble').hidden=$('motionLeader').hidden=true;return;}
 const inTransfer=st.phase&&time>0&&time<duration,completedTargets=naturalPlan&&time>=duration?naturalPlan.roomIds:[];
 const active=inTransfer?st.phase.room:-1;
 roomOutlines.forEach((outline,id)=>{outline.visible=completedTargets.includes(id)||$('motionHighlight').checked&&id===active;if(outline.visible){outline.position.copy(rooms[id].position);outline.rotation.copy(rooms[id].rotation);}});
 const bubble=$('motionBubble'),leader=$('motionLeader');bubble.hidden=leader.hidden=active<0||!$('motionHighlight').checked;
 if(bubble.hidden)return;
 const rect=stage.getBoundingClientRect(),anchor=rooms[active].position.clone().add(new T.Vector3(0,C.config.height+3,0));station.localToWorld(anchor);anchor.project(camera);
 if(anchor.z< -1||anchor.z>1){bubble.hidden=leader.hidden=true;return;}
 const x=rect.left+(anchor.x+1)*rect.width/2,y=rect.top+(1-anchor.y)*rect.height/2;
 if(x<rect.left||x>rect.right||y<rect.top||y>rect.bottom){bubble.hidden=leader.hidden=true;return;}
 const width=mobile()?194:218,bx=Math.max(rect.left+12,Math.min(rect.right-width-12,x+38)),by=Math.max(rect.top+14,Math.min(rect.bottom-115,y-105));
 bubble.style.left=`${bx}px`;bubble.style.top=`${by}px`;
 $('motionLeaderPath').setAttribute('d',`M ${x} ${y} L ${bx+12} ${by+84} L ${bx+24} ${by+84}`);
 putText('motionRoom',`R${String(active+1).padStart(2,'0')} · ${typeNames[roomTypes[active]]}`);
 putText('motionStep',`${estop?'已急停 · ':!playing?'已暂停 · ':''}${phaseNames[st.type]} · ${st.phase.moveIndex+1}/${moves.length}`);
}
const playbackRates=[1,2,4,8,16];
function closeSpeedMenu(focus=false){$('speedMenu').hidden=true;$('speedToggle').setAttribute('aria-expanded','false');if(focus)$('speedToggle').focus();}
function setPlaybackRate(rate){if(!playbackRates.includes(rate))return;$('speed').value=String(rate);putText('speedToggle',rate+'×');playbackRates.forEach(n=>$('rate'+n).setAttribute('aria-checked',String(n===rate)));closeSpeedMenu(true);requestRender();}
$('speedToggle').onclick=()=>{const opening=$('speedMenu').hidden;$('speedMenu').hidden=!opening;$('speedToggle').setAttribute('aria-expanded',String(opening));if(opening)$('rate'+$('speed').value).focus();};
playbackRates.forEach(n=>$('rate'+n).onclick=()=>setPlaybackRate(n));
$('speed').onchange=()=>setPlaybackRate(Number($('speed').value));
$('speedMenu').addEventListener('keydown',e=>{const index=playbackRates.findIndex(n=>$('rate'+n)===document.activeElement);let next=index;if(e.key==='ArrowDown')next=(index+1)%playbackRates.length;else if(e.key==='ArrowUp')next=(index-1+playbackRates.length)%playbackRates.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=playbackRates.length-1;else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeSpeedMenu(true);return;}else if(e.key==='Tab'){closeSpeedMenu(true);return;}else return;e.preventDefault();$('rate'+playbackRates[next]).focus();});
$('speedToggle').addEventListener('keydown',e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();$('speedMenu').hidden=false;$('speedToggle').setAttribute('aria-expanded','true');$('rate'+$('speed').value).focus();}});
document.addEventListener('click',e=>{if(!e.target.closest('.speed-control'))closeSpeedMenu();});
$('play').onclick=()=>{if(fengPeng?.busy()){notify('请先停止人物行程并等待安全停靠。',true);return;}if(!ready)return;if(estop){estop=false;notify('急停已解除。');}if(time>=duration)time=0;playing=!playing;if(playing&&(cutaway||viewName==='closeup'||studioMode))chooseView('overview');audit(playing?'play':'pause');controls();};
$('replay').onclick=()=>{if(fengPeng?.busy()){notify('请先停止人物行程并等待安全停靠。',true);return;}time=0;playing=true;estop=false;pendingManual=false;if(cutaway||viewName==='closeup'||studioMode)chooseView('overview');audit('restart');controls();};
$('timeline').oninput=e=>{if(estop||fengPeng?.busy())return;if(studioMode)chooseView('overview');playing=false;pendingManual=false;const requested=Number(e.target.value);time=Math.abs(duration-requested)<.025?duration:Math.max(0,Math.min(duration,requested));audit('seek');controls();drawUI(snapshot());};
function exitManual(){
 manualMode=false;pendingManual=false;previewMove=null;chooseView('overview');controls();drawUI(snapshot());
}
function enterManual(){
 if(fengPeng?.busy()){notify('请先停止人物行程，再进入房间手动调度。',true);return;}
 if(studioMode)chooseView('overview');
 naturalPlan=null;const st=snapshot();baseLayout=st.layout.slice();baseElevators=structuredClone(st.elevators);moves=[];phases=[];duration=0;time=0;playing=false;manualMode=true;pendingManual=false;task='manual';previewMove=null;estop=false;ready=true;roaming=false;cutaway=false;if(viewName==='roam'||viewName==='mechanism')chooseView('overview');showPlan();controls();drawUI(snapshot());audit('manual-start',{layout:baseLayout.slice()});
}
$('manual').onclick=()=>{

 if(studioMode)chooseView('overview');
 if(manualMode){exitManual();return;}
 if(estop){notify('请先解除急停，再开始手动调度。',true);return;}
 const st=snapshot();if(time>0&&time<duration&&st.phase){pendingManual=true;playing=true;cutaway=false;notify('当前建筑停靠后进入手动调度，保留已完成的布局。');controls();}else enterManual();
};
function moveSelected(to){
 if(!manualMode||estop)return;if(phases.length&&time<duration){notify('房间正在搬运，请等待停靠。');return;}
 const current=snapshot(),layout=current.layout,from=layout.indexOf(selectedRoom);if(from===to)return;
 try{
  const transfer=C.move(layout,from,to,blocked());
  baseLayout=layout.slice();baseElevators=structuredClone(current.elevators);moves=[transfer];previewMove=null;
  const tl=C.timeline(moves,32,baseElevators);phases=tl.phases;duration=tl.duration;time=0;ready=true;
  if(activePanel==='floorPanel'){railPinned=true;clearTimeout(railTimer);expandRail(true);}
  chooseView('overview');playing=true;showPlan();audit('manual-transfer',{room:selectedRoom,path:transfer.path});controls();drawUI(snapshot());
 }catch(e){notify(e.message,true);requestRender();}
}
$('openFloors').onclick=()=>{
 const opening=activePanel!=='floorPanel';showPanel(opening?'floorPanel':null);
 if(opening){const st=snapshot();setMapFloor(C.nodes[st.layout.indexOf(selectedRoom)]?.level||0);if(!manualMode&&!pendingManual)$('manual').click();}
};
$('walkthrough').onclick=()=>{if(studioMode)chooseView('overview');walking=!walking;$('walkthrough').classList.toggle('active',walking);$('walkthrough').setAttribute('aria-pressed',String(walking));$('trafficPanel').hidden=!walking;flowKey='';requestRender();if(walking)notify('热力颜色表示假设人次/分钟，沿可用舱口与短接通道分配；移动房间自动断链。');};
$('flowDemand').oninput=()=>{putText('flowDemandValue',$('flowDemand').value);flowKey='';requestRender();};
$('flowScenario').onchange=()=>{flowKey='';requestRender();};
$('showLinks').onchange=()=>requestRender();
$('cameraBenchmark').onclick=()=>{if(benchmark){finishBenchmark(true);return;}playing=false;controls();chooseView('overview');const warmup=performance.now();benchmark={start:warmup,samples:[],last:0,initialYaw:goal.yaw,mode:qualityMode};putText('cameraBenchmark','停止检测');putText('benchmarkStatus','预热 · 即将旋转镜头采样 8 秒');requestRender();};
function finishBenchmark(cancelled=false){if(!benchmark)return;const b=benchmark;benchmark=null;putText('cameraBenchmark','镜头性能检测');if(b.samples.length){const sorted=b.samples.slice().sort((a,b)=>a-b),mean=b.samples.reduce((a,b)=>a+b,0)/b.samples.length,p95=sorted[Math.floor((sorted.length-1)*.95)];putText('benchmarkStatus',`${cancelled?'已停止 · ':''}${renderProfiles[b.mode].label} ${Math.round(1000/mean)} FPS · P95 ${p95.toFixed(1)} ms · ${b.samples.length} 帧`);}else putText('benchmarkStatus','检测已取消');requestRender();}
$('sectionView').onclick=()=>{fengPeng?.stopFollowing();if(studioMode)chooseView('closeup');sectionMode=!sectionMode;$('sectionView').classList.toggle('active',sectionMode);$('sectionView').setAttribute('aria-pressed',String(sectionMode));if(sectionMode)chooseView('closeup');requestRender();};
function moveAxis(axis,sign){
 if(!manualMode)return;
 const layout=snapshot().layout,node=layout.indexOf(selectedRoom),to=C.neighbor(node,axis,sign);
 if(to===undefined){notify(axis===1?'该位置没有相邻层升降节点，跨层转运须先进入 A / B / C 内部升降通道。':'该方向已到达建筑边界，也可点击其它空位查看是否可达。',true);return;}moveSelected(to);
}
axisButtons.forEach(b=>b.onclick=()=>moveAxis(Number(b.dataset.axis),Number(b.dataset.sign)));
function selectBay(node){const st=snapshot(),room=st.layout[node];if(room===null){if(manualMode)moveSelected(node);else notify('请选择房间后再选择空位。');}else selectRoom(room);}
function selectRoom(room){previewMove=null;requestRender();selectedRoom=room;setMapFloor(C.nodes[snapshot().layout.indexOf(room)]?.level||0);drawUI(snapshot());if(!document.body.classList.contains('reduced')){showPanel('floorPanel');if(!manualMode&&!pendingManual)$('manual').click();}if(viewName==='closeup')chooseView('closeup');}
const raycaster=new T.Raycaster(),pointer=new T.Vector2();
function pick(x,y){if(studioMode)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(pickMeshes,false);for(const hit of hits){const room=hit.object.userData.roomIds[hit.instanceId];if(rooms[room].userData.visible){selectRoom(room);break;}}}
const pointers=new Map();let drag=null,pinch=0,pinchCenter=null;
function resetPointerState(){pointers.clear();drag=null;pinch=0;pinchCenter=null;}
renderer.domElement.addEventListener('lostpointercapture',resetPointerState);window.addEventListener('blur',resetPointerState);
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
renderer.domElement.addEventListener('pointerdown',e=>{if(studioTransition.active)cancelStudioSwitch(true);held.clear();pointers.set(e.pointerId,[e.clientX,e.clientY]);drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,pan:e.button===2||e.shiftKey,moved:false};renderer.domElement.setPointerCapture(e.pointerId);});
function pan(dx,dy){if(viewName==='closeup'){viewName='custom';updateViewButtons();}$('follow').checked=false;const scale=goal.distance*.001;goal.target.x-=Math.cos(goal.yaw)*dx*scale;goal.target.z+=Math.sin(goal.yaw)*dx*scale;goal.target.y+=dy*scale;}
function syncInput(){yaw=goal.yaw;pitch=goal.pitch;distance=goal.distance;target.copy(goal.target);requestRender();}
renderer.domElement.addEventListener('pointermove',e=>{
 if(e.pointerType!=='touch'&&e.buttons===0){resetPointerState();return;}
 if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);
 if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]),mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];if(pinch){goal.distance=Math.max(120,Math.min(2600,goal.distance*pinch/d));pan(mid[0]-pinchCenter[0],mid[1]-pinchCenter[1]);}pinch=d;pinchCenter=mid;if(drag)drag.moved=true;}
 else if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>5)drag.moved=true;if(roaming){freeYaw-=dx*.004;freePitch=Math.max(-1.5,Math.min(1.5,freePitch-dy*.003));}else if(drag.pan)pan(dx,dy);else{goal.yaw-=dx*.004;goal.pitch=Math.max(.035,Math.min(1.55,goal.pitch+dy*.003));}drag.x=e.clientX;drag.y=e.clientY;}
 if(!roaming)syncInput();else requestRender();
});
for(const event of ['pointerup','pointercancel'])renderer.domElement.addEventListener(event,e=>{if(event==='pointerup'&&drag&&!drag.moved&&e.button!==2&&!roaming)pick(e.clientX,e.clientY);pointers.delete(e.pointerId);pinch=0;pinchCenter=null;drag=null;});
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();if(roaming){const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?window.innerHeight:1);roamSpeed=Math.max(.1,Math.min(8,roamSpeed*Math.exp(-Math.max(-600,Math.min(600,delta))*.002)));notify(`漫游速度 · ${roamSpeed.toFixed(1)}×`);}else goal.distance=Math.max(110,Math.min(3100,goal.distance*Math.exp(e.deltaY*.00085)));if(!roaming)syncInput();requestRender();},{passive:false});
let focusBefore=null;function openSettings(){held.clear();showPanel(null);focusBefore=document.activeElement;$('settings').hidden=false;$('closeSettings').focus();}function closeSettings(){$('settings').hidden=true;focusBefore?.focus();}
$('openSettings').onclick=openSettings;$('closeSettings').onclick=closeSettings;$('settings').onclick=e=>{if(e.target===$('settings'))closeSettings();};
$('stop').onclick=()=>{playing=false;estop=true;pendingManual=false;fengPeng?.cancelRoomScheduling('已急停，房间调度已取消；解除急停后可重新提交。');audit('emergency-stop');controls();closeSettings();notify('已急停。所有建筑保持当前位置，点击“解除急停”继续。',true);};
$('reset').onclick=()=>{const nextTask=['manual','natural'].includes(task)?'vertical':task;compile(nextTask,false);closeSettings();notify('已恢复初始建筑布局。');};
$('block').onchange=()=>{if(task==='natural'){if($('block').checked&&time<duration&&moves.some(m=>m.nodePath.includes(C.lift(1,'C')))){$('block').checked=false;notify('当前自然语言计划使用 L2 · C 通道，请完成搬运后再封闭。',true);}else notify('通道状态已更新；后续指令使用新的通道约束。');requestRender();return;}if(manualMode){playing=false;pendingManual=false;previewMove=null;const st=snapshot();if(st.phase&&st.phase.nodePath.includes(C.lift(1,'C'))&&time<duration){$('block').checked=false;notify('当前计划使用 L2 · C 升降通道，请停靠后再封闭。',true);}controls();drawUI(snapshot());}else{compile(task,false);if(ready)notify('通道状态已更新，计划已重新验证。');}};
$('presentation').onclick=()=>{showPanel(null);document.body.classList.add('reduced');$('exitImmersion').hidden=false;resize();};
$('exitImmersion').onclick=()=>{document.body.classList.remove('reduced');$('exitImmersion').hidden=true;resize();};
const motionKeys={KeyA:[0,-1],KeyD:[0,1],KeyW:[2,-1],KeyS:[2,1],KeyQ:[1,-1],KeyE:[1,1]};
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){held.clear();railPinned=false;expandRail(false);if(!$('settings').hidden)closeSettings();else if(activePanel)showPanel(null,true);else if(roaming||studioMode)chooseView('overview');else if(document.body.classList.contains('reduced'))$('exitImmersion').click();return;}
 if(e.key==='Tab'&&!$('settings').hidden){const items=[...$('settings').querySelectorAll('button:not(:disabled),input,select')],first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}return;}
 if(!$('settings').hidden||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
 if(e.code==='Space'&&document.activeElement.tagName!=='BUTTON'){e.preventDefault();$('play').click();return;}
 if(motionKeys[e.code]||e.code==='ShiftLeft'||e.code==='ShiftRight'){
   if(roaming){e.preventDefault();held.add(e.code);}
   else if(manualMode&&motionKeys[e.code]&&!e.repeat){e.preventDefault();moveAxis(...motionKeys[e.code]);}
 }
});
document.addEventListener('keyup',e=>held.delete(e.code));window.addEventListener('blur',()=>held.clear());
function applyQuality(){if(benchmark)finishBenchmark(true);putText('qualityLabel',configureRenderer($('quality').value,$('aaMode').value));resize();}
$('quality').onchange=applyQuality;$('aaMode').onchange=applyQuality;
$('targetFps').onchange=()=>{if(benchmark)finishBenchmark(true);nextRenderDeadline=0;requestRender();};
$('exposure').oninput=()=>{renderer.toneMappingExposure=Number($('exposure').value);postMat.uniforms.exposure.value=Number($('exposure').value);requestRender();};
$('lighting').onchange=()=>{setLighting($('lighting').value);requestRender();};
$('export').onclick=()=>{
 const data={character:fengPeng?.export(),version:'7.0',display:'LUNARIS six-face modular habitat and personnel traffic simulation',coordinateSystem:'X horizontal, Y vertical, Z depth',metresPerSceneUnit:C.config.metresPerUnit,config:C.config,initialLayout:baseLayout,initialElevators:baseElevators,slots:C.slots,nodes:C.nodes,shafts:C.shafts,mission:naturalPlan?{title:taskNames.natural,request:naturalPlan.request,targetRoomIds:naturalPlan.roomIds,targetNodes:naturalPlan.nodes}:C.missions[task]||null,moves,phases,predictedSeconds:duration,events,current:snapshot(),time,blocked:blocked(),traffic:flowData,rendering:{quality:qualityMode,antiAliasing:aaMode,msaaSamples:aaSamples,targetFps:$('targetFps').value==='native'?'native':Number($('targetFps').value)},scope:'Geometry, assumed traffic demand and sequence; not structural or evacuation certification'};
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='LUNARIS-XYZ-simulation.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
function drawUI(st){

 const p=st.positions[selectedRoom],node=st.layout.indexOf(selectedRoom),title=`<span>R${String(selectedRoom+1).padStart(2,'0')}</span>${typeNames[roomTypes[selectedRoom]]}`;if($('selectedTitle').innerHTML!==title)$('selectedTitle').innerHTML=title;
 const identity=roomPalette[roomTypes[selectedRoom]];$('selectedTitle').style.setProperty('--room-color',identity.color);$('selectedTitle').parentElement?.style.setProperty('--room-color',identity.color);
 const model=moduleProfiles()[roomModelTypes[selectedRoom]];putText('modelProfile',`${model.name} / ${model.code}`);
 const arriving=st.active===selectedRoom&&['dock'].includes(st.type);
 const location=st.active===selectedRoom&&['translate','elevate'].includes(st.type)?'运输中':C.nodes[arriving?st.phase.to:node]?.label||'运输中';
 putText('selectedInfo',location);
 putText('coordX',metres(p[0]));putText('coordY',metres(p[1]));putText('coordZ',metres(p[2]));
 putText('phase',studioMode?`房间图鉴 · ${model.name} · ${studioDeck==='exterior'?'完整外观':studioDeck==='lower'?'下层内饰':'上层内饰'}`:estop?'已急停':cutaway?'精简框架 · 演示已暂停':!ready?'当前布局暂无有效路径':manualMode&&!phases.length?'手动调度 · 请选择泊位':`${taskNames[task]} · ${naturalPlan&&!moves.length?'目标已满足':time===0?'已就绪':phaseNames[st.type]}`);
 putText('time',`${fmt(time)} / ${fmt(duration)}`);$('timeline').value=String(time);putText('completed',String(st.finished));
 putText('detail',cutaway?'隐藏舱体，观察融入楼板与接缝的承重梁、导轨和内部升降机构。':estop?'建筑保持当前状态，解除急停后继续。':pendingManual?'正在完成当前搬运，停靠后进入手动调度。':time===0?'房间沿集成于楼板的导轨平移，经内部升降通道跨层，落座后完成对接锁定。':st.phase?`${st.active>=0?buildingNames[st.active]:'对接机构'} · ${C.nodes[st.phase.from].label} → ${C.nodes[st.phase.to].label} · ${phaseNames[st.type]}${st.type==='elevate'?' · Y = '+metres(st.head[1])+' m':''}`:st.type==='done'?'任务完成。可切换楼层观察布局，或开启手动调度。':'房间沿集成于楼板的导轨平移，经内部升降通道跨层，落座后完成对接锁定。');
 $('flightTelemetry').hidden=true;
 if(studioMode)putText('detail','选择房间种类，切换外观与双层内饰。拖动旋转，滚轮放大细节。');
 const busy=phases.length>0&&time<duration;
 const targetKey=st.layout.join(',')+'|'+selectedRoom+'|'+manualMode+'|'+busy+'|'+estop+'|'+blocked().join(',');
 if(targetMapKey!==targetKey){targetMapKey=targetKey;reachableTargets=new Set();if(manualMode&&!busy&&!estop)st.layout.forEach((room,to)=>{if(room!==null)return;try{C.route(node,to,st.layout,blocked());reachableTargets.add(to);}catch{}});}
 for(const b of mapButtons){
  const index=Number(b.dataset.node),room=st.layout[index],reachable=reachableTargets.has(index),movingHere=Boolean(st.phase&&st.phase.nodePath.includes(index)&&Math.hypot(...C.slots[index].map((v,k)=>v-st.head[k]))<45),key=`${room}|${selectedRoom}|${movingHere}|${reachable}|${manualMode}|${busy}|${estop}`;
  if(mapStates[index]===key)continue;mapStates[index]=key;
  b.classList.toggle('empty',room===null);b.classList.toggle('chosen',room===selectedRoom);b.classList.toggle('active',movingHere);b.classList.toggle('reachable',reachable);
  b.disabled=room===null&&!reachable;b.style.setProperty('--room-color',room===null?'#607f98':roomPalette[roomTypes[room]].color);b.dataset.room=room===null?'':String(room);
  b.textContent=room===null?'＋':String(room+1).padStart(2,'0');
  b.setAttribute('aria-label',`${C.nodes[index].label}：${room===null?(reachable?'可达空位，点击搬运':'不可达空位'):buildingNames[room]}`);b.title=`${C.nodes[index].label} · ${room===null?(reachable?'点击立即搬运':'当前不可达'):buildingNames[room]}`;
 }
 putText('manualState',estop?'已急停':pendingManual?'等待停靠':manualMode&&busy?'搬运中':'已选中');
 axisButtons.forEach(b=>{const to=C.neighbor(node,Number(b.dataset.axis),Number(b.dataset.sign)),available=to!==undefined&&C.edgeClear(node,to,st.layout,selectedRoom,blocked());b.disabled=Boolean(estop||busy||!available);});
 putText('manualHint',estop?'已急停，请先恢复播放。':pendingManual?'当前房间停靠后切换手动调度。':manualMode&&busy?'搬运中 · 停靠后可继续操作。':'选房间，再点黄色“＋”即可搬运。');
}
function updateRoute(st){
 const current=previewMove||(st.phase?moves[st.phase.moveIndex]:null),key=current?current.room+'|'+current.from+'|'+current.to+'|'+(previewMove?'preview':'flight'):'';
 if(routeKey!==key){routeGroup.traverse(o=>{o.geometry?.dispose();if(o.material&&o.material!==mats.led)o.material.dispose();});station.remove(routeGroup);routeGroup=new T.Group();station.add(routeGroup);routeKey=key;
   if(current){const points=current.path.map(p=>new T.Vector3(p[0],p[1]+18,p[2]));
    const pathLine=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:previewMove?'#82e5eb':'#e8bf85',transparent:true,opacity:.86}));routeGroup.add(pathLine);
    const marks=[];let travelled=0,nextMark=0;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],len=a.distanceTo(b);if(len<.0001)continue;while(nextMark<=travelled+len){marks.push(a.clone().lerp(b,(nextMark-travelled)/len));nextMark+=20;}travelled+=len;}
    const dots=new T.InstancedMesh(new T.SphereGeometry(1.1,8,6),new T.MeshBasicMaterial({color:'#bfe8df'}),marks.length),matrix=new T.Matrix4();marks.forEach((p,i)=>dots.setMatrixAt(i,matrix.makeTranslation(p.x,p.y,p.z)));routeGroup.add(dots);
   }
 }
 routeGroup.visible=$('paths').checked&&!cutaway&&visibleFloor<0;
}
let lastUI=-1;
function draw(dt,now,force=false){
 fengPeng?.sync();
 const st=snapshot(),instanceChanged=updateInstances(st.positions,visibleFloor,cutaway,st.orientations,!studioMode&&sectionMode?selectedRoom:-1,studioMode?selectedRoom:-1,studioDeck),mechanismChanged=updateMechanism(st,visibleFloor,cutaway);
 const connectionState=updateConnectivity(st,{showLinks:$('showLinks').checked&&!cutaway,visibleFloor,sectionRoom:sectionMode?selectedRoom:-1});
 obstruction.visible=$('block').checked&&(visibleFloor<0||visibleFloor===1);
 previewGhost.visible=Boolean(previewMove);if(previewMove){const p=C.slots[previewMove.to];previewGhost.position.set(p[0],p[1]+C.config.height/2,p[2]);previewGhost.rotation.y=0;}
 const walkLayout=st.layout.slice();if(st.active>=0&&st.connected&&st.type==='dock'){walkLayout[walkLayout.indexOf(st.active)]=null;walkLayout[st.phase.to]=st.active;}
 const demandConditions={demand:Number($('flowDemand').value),scenario:$('flowScenario').value};
 const unavailable=st.unavailableRooms||(st.active>=0&&!st.connected?[st.active]:[]),key=walkLayout.join(',')+'|'+unavailable.join(',')+'|'+demandConditions.demand+'|'+demandConditions.scenario;
 if(flowKey!==key){flowData=C.traffic(walkLayout,{...demandConditions,unavailable});flowKey=key;putText('flowCount',flowData.servedDemand.toFixed(1));putText('flowPeak',flowData.peakFlow.toFixed(1));putText('flowDisconnected',flowData.disconnectedDemand.toFixed(1));putText('flowConnections',flowData.links.length);putText('heatLegend',`0 ───────── ${flowData.totalDemand}\n人次每分钟 · 假设需求`);}
 updateTrafficVisual(flowData,{visible:walking&&!cutaway&&!studioMode,time:flowClock,visibleFloor});
 const adjacent=flowData.links.filter(l=>l.roomA===selectedRoom||l.roomB===selectedRoom);putText('hatchInfo',`六向舱口 · ${adjacent.length}/6 已连接${adjacent.length?' · '+adjacent.map(l=>l.roomA===selectedRoom?l.directionA:l.directionB).join(' '):' · 当前隔离'}`);
 const selected=rooms[selectedRoom];selectionFrame.position.copy(selected.position);selectionFrame.rotation.copy(selected.rotation);selectionFrame.visible=selected.userData.visible&&!cutaway&&!studioMode;
 updateRoute(st);
 updateStudioEnvironment(studioMode?selectedRoom:-1,studioDeck);
 if(viewName==='closeup'&&!roaming){const p=st.positions[selectedRoom];goal.target.set(p[0],p[1]+35,p[2]);}
 else if($('follow').checked&&playing&&st.active>=0&&!roaming){goal.target.set(st.head[0],st.head[1]+35,st.head[2]);}
 if(roaming){const forward=new T.Vector3(Math.sin(freeYaw),0,Math.cos(freeYaw)),right=new T.Vector3(-Math.cos(freeYaw),0,Math.sin(freeYaw)),speed=dt*roamSpeed*(held.has('ShiftLeft')||held.has('ShiftRight')?230:75);if(held.has('KeyW'))freePosition.addScaledVector(forward,speed);if(held.has('KeyS'))freePosition.addScaledVector(forward,-speed);if(held.has('KeyD'))freePosition.addScaledVector(right,speed);if(held.has('KeyA'))freePosition.addScaledVector(right,-speed);if(held.has('KeyE'))freePosition.y+=speed;if(held.has('KeyQ'))freePosition.y-=speed;freePosition.y=Math.max(terrainY(freePosition.x,freePosition.z)+7,Math.min(2500,freePosition.y));freePosition.x=Math.max(-3500,Math.min(3500,freePosition.x));freePosition.z=Math.max(-3500,Math.min(3500,freePosition.z));camera.position.copy(freePosition);camera.lookAt(freePosition.x+Math.sin(freeYaw)*Math.cos(freePitch),freePosition.y+Math.sin(freePitch),freePosition.z+Math.cos(freeYaw)*Math.cos(freePitch));}
 else{const ease=reducedMotion?1:1-Math.exp(-dt*8);yaw+=(goal.yaw-yaw)*ease;pitch+=(goal.pitch-pitch)*ease;distance+=(goal.distance-distance)*ease;target.lerp(goal.target,ease);const dist=distance*Math.max(1,.9/camera.aspect);camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*dist,target.y+Math.sin(pitch)*dist,target.z+Math.cos(yaw)*Math.cos(pitch)*dist);camera.lookAt(target);if(Math.abs(goal.yaw-yaw)<.00001&&Math.abs(goal.pitch-pitch)<.00001&&Math.abs(goal.distance-distance)<.02&&target.distanceTo(goal.target)<.02){yaw=goal.yaw;pitch=goal.pitch;distance=goal.distance;target.copy(goal.target);}}
 camera.updateMatrixWorld();studioTransition.sync(studioMode,selectedRoom);updateMotionOverlay(st);const labelRoom=st.active>=0&&time>0?st.active:selectedRoom,r=rooms[labelRoom],v=r.position.clone().add(new T.Vector3(0,85,0)).project(camera),w=stage.clientWidth,h=stage.clientHeight,sx=(v.x+1)*w/2,sy=(1-v.y)*h/2;
 activeLabel.hidden=studioMode||!$('labels').checked||!r.userData.visible||v.z>1||v.z< -1||sx<60||sx>w-60||sy<70||sy>h-20;const labelText=`${buildingNames[labelRoom]}${st.type==='elevate'?'  ↑↓ Y '+metres(st.head[1])+' m':''}`;if(activeLabel.textContent!==labelText)activeLabel.textContent=labelText;if(!activeLabel.hidden){activeLabel.style.transform=`translate3d(${sx}px,${sy}px,0) translate(-50%,-100%)`;activeLabel.style.left='0';activeLabel.style.top='0';}
 if(now-lastUI>100){drawUI(snapshot());lastUI=now;}
 if(naturalPlan&&time>=duration&&!scheduling&&!$('scheduleStatus').classList.contains('bad')){putText('scheduleStatus',`目标已完成 · ${naturalPlan.summary}\n${naturalPlan.roomIds.length} 个目标模块已到达规划位置并高亮。`);}
 const moving=Boolean(fengPeng?.needsFrames)||playing||studioTransition.active||cameraChanging()||Boolean(benchmark)||(walking&&Number($('flowDemand').value)>0)||(roaming&&held.size>0);
 renderScene({moving});return true;
}
function resize(){resizeRenderTargets(Math.max(1,stage.clientWidth),Math.max(1,stage.clientHeight));if(studioMode){if(studioTransition.active)cancelStudioSwitch(true);focusStudio();}requestRender();}
new ResizeObserver(resize).observe(stage);resize();
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(studioTransition.active)cancelStudioSwitch(true);playing=false;$('error').hidden=false;putText('error','显卡渲染上下文已丢失。请刷新页面恢复三维场景。');controls();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(studioTransition.active)cancelStudioSwitch(true);playing=false;held.clear();if(benchmark)finishBenchmark(true);controls();}else requestRender();lastNow=performance.now();});
putText('qualityLabel',configureRenderer($('quality').value||'high',$('aaMode').value||'auto'));
compile('vertical',false);
let fpsFrames=0,fpsElapsed=0;const frameSamples=[];const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(reducedMotion){yaw=goal.yaw;pitch=goal.pitch;distance=goal.distance;target.copy(goal.target);}
function cameraChanging(){return Math.abs(goal.yaw-yaw)>.000001||Math.abs(goal.pitch-pitch)>.000001||Math.abs(goal.distance-distance)>.001||target.distanceToSquared(goal.target)>.000001;}
function updateRenderDiagnostics(){
 const d=getRenderDiagnostics(),gpu=d.gpuName||'浏览器未提供显卡名称';
 putText('gpuName',gpu);putText('cpuTime',Number.isFinite(d.cpuMs)?d.cpuMs.toFixed(1):'—');putText('gpuTime',Number.isFinite(d.gpuMs)?d.gpuMs.toFixed(1):'—');
 putText('renderStats',`${d.drawCalls} / ${(d.triangles/1000).toFixed(0)}k`);
 const software=/swiftshader|llvmpipe|software|basic render/i.test(gpu);
 putText('gpuHint',software?'当前使用软件渲染。请通过“启动高性能仿真.cmd”打开，再核对这里的实际显卡。':'若上方未显示期望的独立显卡，请通过“启动高性能仿真.cmd”重新打开并核对。');
}
function frame(now){
 rafPending=false;inFrame=true;
 if(document.hidden){needsRender=true;inFrame=false;return;}
 const ongoing=Boolean(fengPeng?.needsFrames)||playing||walking||studioTransition.active||cameraChanging()||Boolean(benchmark)||(roaming&&held.size>0),fpsLimit=Number($('targetFps').value),frameBudget=fpsLimit>0?1000/fpsLimit:0;
 // Native mode submits every available browser frame. Optional caps keep their
 // accumulated phase instead of discarding the remainder at each submission.
 if(frameBudget&&ongoing&&!needsRender&&now+.5<nextRenderDeadline){inFrame=false;rafPending=true;requestAnimationFrame(frame);return;}
 const realDt=Math.max(.0001,(now-lastNow)/1000),dt=Math.min(.1,realDt);lastNow=now;flowClock+=Math.min(realDt,.1);
 if(studioTransition.step(now)){needsRender=true;if(!studioTransition.active){studioTarget=null;studioCommit=null;updateStudioUI();}}
 if(benchmark){const elapsed=now-benchmark.start;if(elapsed<9000){goal.yaw=benchmark.initialYaw+(elapsed/1000)*.15;yaw=goal.yaw;if(elapsed>1000&&benchmark.last){benchmark.samples.push(now-benchmark.last);}benchmark.last=now;if(elapsed>1000)putText('benchmarkStatus',`采样中 · ${Math.min(8,Math.floor((elapsed-1000)/1000))}/8 秒`);}else finishBenchmark();}
 if(playing){const before=pendingManual?snapshot():null;time+=realDt*Number($('speed').value);
  if(pendingManual&&before?.phase){const docking=phases.find(p=>p.type==='dock'&&p.moveIndex===before.phase.moveIndex);if(docking&&time>=docking.end){time=docking.end;enterManual();}}
  if(time>=duration&&phases.length){time=duration;playing=false;audit('complete');if($('loop').checked&&!manualMode){time=0;playing=true;audit('loop');}controls();}
 }
 fengPeng?.tick(Math.min(.25,realDt));
 const active=Boolean(fengPeng?.needsFrames)||needsRender||playing||cameraChanging()||Boolean(benchmark)||(walking&&Number($('flowDemand').value)>0)||(roaming&&held.size>0)||hasPendingRefinement(),force=needsRender;needsRender=false;
 if(active){draw(dt,now,force);nextRenderDeadline=frameBudget?(nextRenderDeadline===0||now+.5<nextRenderDeadline||now-nextRenderDeadline>frameBudget?now+frameBudget:nextRenderDeadline+frameBudget):0;if(realDt<.5){frameSamples.push(realDt*1000);if(frameSamples.length>480)frameSamples.shift();fpsFrames++;fpsElapsed+=realDt;}
  if(fpsElapsed>1){putText('fps',Math.round(fpsFrames/fpsElapsed));const sorted=frameSamples.slice().sort((a,b)=>a-b);putText('frameTime',sorted[Math.floor((sorted.length-1)*.95)].toFixed(1));fpsFrames=0;fpsElapsed=0;}
  if(now-lastDiagnosticsAt>=1000){updateRenderDiagnostics();lastDiagnosticsAt=now;}$('loading').hidden=true;
 }
 inFrame=false;if(!rafPending&&(fengPeng?.needsFrames||playing||studioTransition.active||cameraChanging()||Boolean(benchmark)||(walking&&Number($('flowDemand').value)>0)||(roaming&&held.size>0)||needsRender||hasPendingRefinement())){rafPending=true;requestAnimationFrame(frame);}
}
fengPeng=createFengPeng();
 window.LunarisCharacterDiagnostics=()=>fengPeng.export();
 window.LunarisAudioDiagnostics=()=>backgroundAudio.diagnostics();
 requestRender();
})();
