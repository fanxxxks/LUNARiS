const taskNames={vertical:'科研协作',cascade:'维修隔离',district:'基地扩建',manual:'手动调度'};
const phaseNames={ready:'已就绪',retract:'升降托架收拢',emptyLift:'空载升降机构定位',deploy:'升降托架展开',unlock:'解除泊位锁定',translate:'沿轨道平移',elevate:'Y 轴跨层升降',dock:'对接并锁定',done:'重构完成'};
const metres=n=>(n*C.config.metresPerUnit).toFixed(1),fmt=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
let baseLayout=C.initial.slice(),baseElevators=C.config.baseY,moves=[],phases=[],duration=0,time=0,playing=false,estop=false,task='vertical',ready=false,events=[];
let selectedRoom=7,visibleFloor=-1,manualMode=false,pendingManual=false,cutaway=false,viewName='overview',roaming=false,routeKey='',toastTimer;
let yaw=.64,pitch=.25,distance=1330,target=new T.Vector3(-30,246,0),goal={yaw:.64,pitch:.25,distance:1330,target:new T.Vector3(-30,246,0)};
const freePosition=new T.Vector3(),held=new Set();let freeYaw=0,freePitch=0;
const mobile=()=>window.innerWidth<=760;
const overviewDistance=()=>mobile()?1450:1330;
distance=goal.distance=overviewDistance();
const audit=(event,detail)=>events.push({event,time:+time.toFixed(3),detail});
function notify(message,bad=false){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.toggle('bad',bad);$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,bad?6500:3800);}
const blocked=()=>$('block').checked?[C.lift(1,'C')]:[];
const snapshot=()=>C.state(baseLayout,phases,time,baseElevators);
const viewButtons=['overview','closeup','topview','elevation','mechanism','roam'];
const axisButtons=[...document.querySelectorAll('[data-axis]')];
const missionButtons=[...document.querySelectorAll('[data-task]')];
const mapButtons=[],floorItems=[];
for(let level=C.config.layers-1;level>=0;level--){
 const item=document.createElement('div');item.className='floor-item';item.dataset.level=level;floorItems.push(item);
 const button=document.createElement('button');button.className='floor-select';button.setAttribute('aria-label',`单独观察 L${level+1} 层`);button.setAttribute('aria-pressed','false');button.innerHTML=`<span>L${level+1}</span><small>+${metres(C.config.baseY+level*C.config.pitchY)} m</small>`;button.onclick=()=>setFloor(visibleFloor===level?-1:level);item.appendChild(button);
 const grid=document.createElement('div');grid.className='floor-grid';item.appendChild(grid);
 C.nodes.forEach((node,i)=>{if(node.level!==level)return;const b=document.createElement('button');b.className='bay-dot'+(node.lift?' lift':'');b.style.gridColumn=String(node.col+3);b.style.gridRow=String(node.row+2);if(node.lift)b.textContent=node.shaft;b.dataset.node=i;b.onclick=()=>selectBay(i);grid.appendChild(b);mapButtons.push(b);});$('floorMaps').appendChild(item);
}
function setFloor(level){visibleFloor=level;$('allFloors').classList.toggle('active',level<0);$('allFloors').setAttribute('aria-pressed',String(level<0));floorItems.forEach(item=>{const active=Number(item.dataset.level)===level;item.classList.toggle('selected',active);item.querySelector('button').setAttribute('aria-pressed',String(active));});if(level<0)chooseView('overview');else{cutaway=false;roaming=false;viewName='layer';goal={yaw:.64,pitch:.72,distance:mobile()?1050:900,target:new T.Vector3(level>=2?-40:0,C.config.baseY+level*C.config.pitchY+25,0)};updateViewButtons();}drawUI(snapshot());}
$('allFloors').onclick=()=>setFloor(-1);
function controls(){
 document.body.classList.toggle('manual-mode',manualMode||pendingManual);
 $('play').textContent=!ready?'暂无可用计划':estop?'解除急停':playing?'Ⅱ 暂停演示':manualMode&&phases.length===0?'等待手动指令':time>=duration&&duration?'↺ 再次演示':time>0?'▶ 继续演示':'▶ 开始演示';
 $('play').disabled=!ready||(!phases.length&&!estop);$('timeline').disabled=!phases.length||estop;$('replay').disabled=!phases.length;$('export').disabled=!ready;
 $('manual').classList.toggle('active',manualMode);$('manual').setAttribute('aria-pressed',String(manualMode));$('manual').innerHTML=manualMode?'退出手动调度 <span>−</span>':pendingManual?'停靠后进入手动 <span>…</span>':'手动六向调度 <span>＋</span>';$('manualControls').hidden=!manualMode;
 missionButtons.forEach(b=>{const active=b.dataset.task===task;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
}
function updateViewButtons(){viewButtons.forEach(id=>{$(id).classList.toggle('active',id===viewName);$(id).setAttribute('aria-pressed',String(id===viewName));});$('navigationHint').textContent=roaming?'WASD 行走 · Q / E 升降 · Shift 加速 · 拖动转向':'拖动环视 · 右键平移 · 滚轮缩放 · 点击建筑选择';}
function chooseView(name){
 resetPointerState();
 if(name==='roam'&&roaming)name='overview';viewName=name;cutaway=name==='mechanism';
 if(name==='roam'){if(cutaway)cutaway=false;freePosition.copy(camera.position);const direction=new T.Vector3();camera.getWorldDirection(direction);freeYaw=Math.atan2(direction.x,direction.z);freePitch=Math.asin(direction.y);roaming=true;manualMode=false;pendingManual=false;controls();notify('自由漫游：WASD 移动，Q / E 垂直升降，拖动改变朝向。');}
 else{roaming=false;if(cutaway){playing=false;controls();}const st=snapshot(),p=st.positions[selectedRoom];
 if(name==='closeup')goal={yaw:.7,pitch:.32,distance:mobile()?460:390,target:new T.Vector3(p[0],p[1]+35,p[2])};
 else if(name==='topview')goal={yaw:0,pitch:1.53,distance:mobile()?1500:1380,target:new T.Vector3(-25,visibleFloor<0?180:C.config.baseY+visibleFloor*C.config.pitchY,0)};
 else if(name==='elevation')goal={yaw:.15,pitch:.055,distance:mobile()?1470:1290,target:new T.Vector3(-25,253,0)};
 else goal={yaw:.64,pitch:cutaway?.3:.25,distance:overviewDistance(),target:new T.Vector3(-30,246,0)};
 }
 updateViewButtons();
}
for(const id of viewButtons)$(id).onclick=()=>chooseView(id);
function showPlan(){
 $('timeline').max=duration||1;$('total').textContent=String(moves.length);$('distance').textContent=metres(moves.reduce((sum,m)=>sum+C.length(m.path),0))+' m';$('verticalDistance').textContent=String(Math.round(moves.reduce((s,m)=>s+m.vertical,0)*C.config.metresPerUnit));
 $('planDistance').textContent=metres(moves.reduce((sum,m)=>sum+C.length(m.path),0));const mission=C.missions[task];$('missionPurpose').textContent=mission?.purpose||'选择房间和空闲泊位，沿框架轨道执行六向调度。';
 $('log').innerHTML=moves.map(m=>`<li>${buildingNames[m.room]}<br>${C.nodes[m.from].label} → ${C.nodes[m.to].label}${m.vertical?' · 跨层':''}</li>`).join('')||'<li>选择建筑后，使用六向按钮或点击空闲格位。</li>';
}
function compile(name,auto=true){
 task=name;manualMode=false;pendingManual=false;estop=false;playing=false;time=0;baseLayout=C.initial.slice();baseElevators=C.config.baseY;events=[];selectedRoom=C.missions[name].roomIds[0];
 try{const p=C.preset(name,blocked());moves=p.moves;const tl=C.timeline(moves);phases=tl.phases;duration=tl.duration;ready=true;playing=auto;audit('plan',{task,initial:baseLayout.slice(),target:p.target,blocked:blocked(),metresPerUnit:C.config.metresPerUnit});}
 catch(e){moves=[];phases=[];duration=0;ready=false;notify(e.message,true);}
 showPlan();setFloor(-1);chooseView('overview');controls();drawUI(snapshot());
}
missionButtons.forEach(b=>b.onclick=()=>compile(b.dataset.task,true));
$('play').onclick=()=>{if(!ready)return;if(estop){estop=false;notify('急停已解除。');}if(time>=duration)time=0;playing=!playing;if(playing&&cutaway)chooseView('overview');audit(playing?'play':'pause');controls();};
$('replay').onclick=()=>{time=0;playing=true;estop=false;pendingManual=false;if(cutaway)chooseView('overview');audit('restart');controls();};
$('timeline').oninput=e=>{if(estop)return;playing=false;pendingManual=false;const requested=Number(e.target.value);time=Math.abs(duration-requested)<.025?duration:Math.max(0,Math.min(duration,requested));audit('seek');controls();drawUI(snapshot());};
function enterManual(){
 const st=snapshot();baseLayout=st.layout.slice();baseElevators=structuredClone(st.elevators);moves=[];phases=[];duration=0;time=0;playing=false;manualMode=true;pendingManual=false;task='manual';estop=false;ready=true;roaming=false;cutaway=false;if(viewName==='roam'||viewName==='mechanism')chooseView('overview');showPlan();controls();drawUI(snapshot());audit('manual-start',{layout:baseLayout.slice()});
}
$('manual').onclick=()=>{
 if(manualMode){manualMode=false;controls();return;}
 if(estop){notify('请先解除急停，再开始手动调度。',true);return;}
 const st=snapshot();if(time>0&&time<duration&&st.phase){pendingManual=true;playing=true;cutaway=false;notify('当前建筑停靠后进入手动调度，保留已完成的布局。');controls();}else enterManual();
};
function moveSelected(to){
 if(!manualMode||estop)return;
 if(phases.length&&time<duration){notify('当前建筑尚未停靠，请先完成这次搬运。');return;}
 const current=snapshot(),layout=current.layout,from=layout.indexOf(selectedRoom);
 if(from===to)return;
 try{const m=C.move(layout,from,to,blocked());baseLayout=layout.slice();baseElevators=structuredClone(current.elevators);moves=[m];const tl=C.timeline(moves,32,baseElevators);phases=tl.phases;duration=tl.duration;time=0;playing=true;ready=true;showPlan();audit('manual-move',{room:selectedRoom,from,to,path:m.path});controls();drawUI(snapshot());}
 catch(e){notify(e.message,true);}
}
function moveAxis(axis,sign){
 if(!manualMode)return;
 const layout=snapshot().layout,node=layout.indexOf(selectedRoom),to=C.neighbor(node,axis,sign);
 if(to===undefined){notify(axis===1?'房间须先平移至框架内部 A / B / C 升降通道，才能沿 Y 轴换层。':'该方向已到达轨道边界。',true);return;}moveSelected(to);
}
axisButtons.forEach(b=>b.onclick=()=>moveAxis(Number(b.dataset.axis),Number(b.dataset.sign)));
function selectBay(node){const st=snapshot(),room=st.layout[node];if(room===null){if(manualMode)moveSelected(node);else notify('这是空闲框架泊位。开启手动调度后可将选中房间送到这里。');}else selectRoom(room);}
function selectRoom(room){selectedRoom=room;drawUI(snapshot());if(viewName==='closeup')chooseView('closeup');}
const raycaster=new T.Raycaster(),pointer=new T.Vector2();
function pick(x,y){const rect=renderer.domElement.getBoundingClientRect();pointer.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(pickMeshes,false);for(const hit of hits){const room=hit.object.userData.roomIds[hit.instanceId];if(rooms[room].userData.visible){selectRoom(room);break;}}}
const pointers=new Map();let drag=null,pinch=0,pinchCenter=null;
function resetPointerState(){pointers.clear();drag=null;pinch=0;pinchCenter=null;}
renderer.domElement.addEventListener('lostpointercapture',resetPointerState);window.addEventListener('blur',resetPointerState);
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
renderer.domElement.addEventListener('pointerdown',e=>{held.clear();pointers.set(e.pointerId,[e.clientX,e.clientY]);drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,pan:e.button===2||e.shiftKey,moved:false};renderer.domElement.setPointerCapture(e.pointerId);});
function pan(dx,dy){const scale=goal.distance*.001;goal.target.x-=Math.cos(goal.yaw)*dx*scale;goal.target.z+=Math.sin(goal.yaw)*dx*scale;goal.target.y+=dy*scale;}
renderer.domElement.addEventListener('pointermove',e=>{
 if(e.pointerType!=='touch'&&e.buttons===0){resetPointerState();return;}
 if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);
 if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]),mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];if(pinch){goal.distance=Math.max(120,Math.min(2600,goal.distance*pinch/d));pan(mid[0]-pinchCenter[0],mid[1]-pinchCenter[1]);}pinch=d;pinchCenter=mid;if(drag)drag.moved=true;}
 else if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>5)drag.moved=true;if(roaming){freeYaw-=dx*.004;freePitch=Math.max(-1.5,Math.min(1.5,freePitch-dy*.003));}else if(drag.pan)pan(dx,dy);else{goal.yaw-=dx*.004;goal.pitch=Math.max(.035,Math.min(1.55,goal.pitch+dy*.003));}drag.x=e.clientX;drag.y=e.clientY;}
});
for(const event of ['pointerup','pointercancel'])renderer.domElement.addEventListener(event,e=>{if(event==='pointerup'&&drag&&!drag.moved&&e.button!==2&&!roaming)pick(e.clientX,e.clientY);pointers.delete(e.pointerId);pinch=0;pinchCenter=null;drag=null;});
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();if(roaming){const forward=new T.Vector3(Math.sin(freeYaw)*Math.cos(freePitch),Math.sin(freePitch),Math.cos(freeYaw)*Math.cos(freePitch));freePosition.addScaledVector(forward,-e.deltaY*.15);}else goal.distance=Math.max(110,Math.min(3100,goal.distance*Math.exp(e.deltaY*.00085)));},{passive:false});
let focusBefore=null;function openSettings(){held.clear();focusBefore=document.activeElement;$('settings').hidden=false;$('closeSettings').focus();}function closeSettings(){$('settings').hidden=true;focusBefore?.focus();}
$('openSettings').onclick=openSettings;$('closeSettings').onclick=closeSettings;$('settings').onclick=e=>{if(e.target===$('settings'))closeSettings();};
$('stop').onclick=()=>{playing=false;estop=true;pendingManual=false;audit('emergency-stop');controls();closeSettings();notify('已急停。所有建筑保持当前位置，点击“解除急停”继续。',true);};
$('reset').onclick=()=>{const nextTask=task==='manual'?'vertical':task;compile(nextTask,false);closeSettings();notify('已恢复初始建筑布局。');};
$('block').onchange=()=>{if(manualMode){playing=false;pendingManual=false;const st=snapshot();if(st.phase&&st.phase.nodePath.includes(C.lift(1,'C'))&&time<duration){$('block').checked=false;notify('当前搬运经过 L2 · C 通道，请停靠后再封闭。',true);}controls();drawUI(snapshot());}else{compile(task,false);if(ready)notify('通道状态已更新，计划已重新验证。');}};
$('presentation').onclick=()=>{document.body.classList.add('reduced');$('exitImmersion').hidden=false;resize();};
$('exitImmersion').onclick=()=>{document.body.classList.remove('reduced');$('exitImmersion').hidden=true;resize();};
const motionKeys={KeyA:[0,-1],KeyD:[0,1],KeyW:[2,-1],KeyS:[2,1],KeyQ:[1,-1],KeyE:[1,1]};
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){held.clear();if(!$('settings').hidden)closeSettings();else if(roaming)chooseView('overview');else if(document.body.classList.contains('reduced'))$('exitImmersion').click();return;}
 if(e.key==='Tab'&&!$('settings').hidden){const items=[...$('settings').querySelectorAll('button:not(:disabled),input,select')],first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}return;}
 if(!$('settings').hidden||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
 if(e.code==='Space'&&document.activeElement.tagName!=='BUTTON'){e.preventDefault();$('play').click();return;}
 if(motionKeys[e.code]||e.code==='ShiftLeft'||e.code==='ShiftRight'){
   if(roaming){e.preventDefault();held.add(e.code);}
   else if(manualMode&&motionKeys[e.code]&&!e.repeat){e.preventDefault();moveAxis(...motionKeys[e.code]);}
 }
});
document.addEventListener('keyup',e=>held.delete(e.code));window.addEventListener('blur',()=>held.clear());
$('quality').onchange=()=>{highQuality=$('quality').value==='high';renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,highQuality?1.75:1));renderer.shadowMap.enabled=true;sun.shadow.mapSize.set(highQuality?4096:2048,highQuality?4096:2048);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}renderer.shadowMap.needsUpdate=true;$('qualityLabel').textContent=highQuality?'精细画质':'均衡画质';resize();};
$('exposure').oninput=()=>{renderer.toneMappingExposure=Number($('exposure').value);postMat.uniforms.exposure.value=Number($('exposure').value);};
$('lighting').onchange=()=>setLighting($('lighting').value);
$('export').onclick=()=>{
 const data={version:'4.0',display:'LUNARIS irregular megaframe architectural concept',coordinateSystem:'X horizontal, Y vertical, Z depth',metresPerSceneUnit:C.config.metresPerUnit,config:C.config,initialLayout:baseLayout,initialElevators:baseElevators,slots:C.slots,nodes:C.nodes,shafts:C.shafts,mission:C.missions[task]||null,moves,phases,predictedSeconds:duration,events,current:snapshot(),time,blocked:blocked(),scope:'geometry and sequence; not an engineering validation'};
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='LUNARIS-XYZ-simulation.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
function drawUI(st){
 const p=st.positions[selectedRoom],node=st.layout.indexOf(selectedRoom);$('selectedTitle').innerHTML=`<span>R${String(selectedRoom+1).padStart(2,'0')}</span>${typeNames[roomTypes[selectedRoom]]}`;
 const location=st.active===selectedRoom&&['translate','elevate'].includes(st.type)?'运输中':C.nodes[node]?.label||'运输中';
 $('selectedInfo').textContent=`${location}  /  X ${metres(p[0])}  Y ${metres(p[1])}  Z ${metres(p[2])} m`;
 $('coordX').textContent=metres(p[0]);$('coordY').textContent=metres(p[1]);$('coordZ').textContent=metres(p[2]);
 $('phase').textContent=estop?'已急停':cutaway?'框架透视 · 搬运已暂停':!ready?'当前布局暂无有效路径':manualMode&&!phases.length?'手动调度 · 请选择方向':`${taskNames[task]} · ${time===0?'已就绪':phaseNames[st.type]}`;
 $('time').textContent=`${fmt(time)} / ${fmt(duration)}`;$('timeline').value=String(time);$('completed').textContent=String(st.finished);
 $('detail').textContent=cutaway?'房间隐藏，显示原位承重框架、水平轨道与三条内部升降通道。':estop?'建筑保持当前状态，解除急停后继续。':pendingManual?'正在完成当前搬运，停靠后进入手动调度。':time===0?'房间嵌入五层不规则框架，经 A / B / C 内部通道完成跨层重构。':st.phase?`${st.active>=0?buildingNames[st.active]:`${st.phase.shaft||''} 通道升降机构`} · ${C.nodes[st.phase.from].label} → ${C.nodes[st.phase.to].label} · ${phaseNames[st.type]}${st.type==='elevate'?' · Y = '+metres(st.head[1])+' m':''}`:st.type==='done'?'任务完成。可切换楼层观察布局，或开启手动六向调度。':'房间嵌入五层不规则框架，经 A / B / C 内部通道完成跨层重构。';
 const mission=C.missions[task];$('missionResult').textContent=mission?`${mission.metricLabel}：${mission.before} → ${mission.after} ${mission.unit} · 当前 ${C.missionMetric(task,st.layout)} ${mission.unit}`:'停靠后更新布局，可连续执行多次手动搬运。';
 for(const b of mapButtons){const index=Number(b.dataset.node),room=st.layout[index],movingHere=st.phase&&st.phase.nodePath.includes(index)&&Math.hypot(...C.slots[index].map((v,k)=>v-st.head[k]))<45;b.classList.toggle('empty',room===null);b.classList.toggle('chosen',room===selectedRoom);b.classList.toggle('active',Boolean(movingHere));b.setAttribute('aria-label',`${C.nodes[index].label}：${room===null?'空闲':buildingNames[room]}`);b.title=`${C.nodes[index].label} · ${room===null?'空闲泊位':buildingNames[room]}`;}
 const busy=phases.length>0&&time<duration;
 axisButtons.forEach(b=>{const to=C.neighbor(node,Number(b.dataset.axis),Number(b.dataset.sign)),available=to!==undefined&&C.edgeClear(node,to,st.layout,selectedRoom,blocked());b.disabled=Boolean(estop||busy||!available);});
 if(manualMode)$('manualHint').textContent=estop?'已急停，请先解除急停。':busy?'建筑运输中，停靠后可继续调度。':C.nodes[node]?.lift?'已进入内部升降通道，可使用 Q / E 或 ±Y 跨层。':'WASD 平移 · Q / E 升降。灰色方向表示占用或轨道边界。';
}
function updateRoute(st){
 const current=st.phase?moves[st.phase.moveIndex]:null,key=current?JSON.stringify(current.path):'';
 if(routeKey!==key){routeGroup.traverse(o=>{o.geometry?.dispose();if(o.material&&o.material!==mats.led)o.material.dispose();});station.remove(routeGroup);routeGroup=new T.Group();station.add(routeGroup);routeKey=key;
   if(current){for(let i=1;i<current.path.length;i++){const a=current.path[i-1],b=current.path[i];const vertical=a[1]!==b[1],color=vertical?'#e8bf85':'#bbd5ba';const offset=vertical?[53,12,0]:[0,2,44];const start=a.map((v,k)=>v+offset[k]),end=b.map((v,k)=>v+offset[k]);line(routeGroup,[start,end],color,.95);const count=Math.max(1,Math.floor(C.length([a,b])/20));for(let j=0;j<=count;j++){const pos=start.map((v,k)=>v+(end[k]-v)*j/count);const dot=mesh(routeGroup,new T.SphereGeometry(1.05,8,6),new T.MeshBasicMaterial({color}),...pos);dot.castShadow=false;}}
   }
 }
 routeGroup.visible=$('paths').checked&&!cutaway&&visibleFloor<0;
}
let lastUI=-1;
function draw(dt,now){
 const st=snapshot();updateInstances(st.positions,visibleFloor,cutaway);
 for(const shaft of C.shafts){const e=st.elevators[shaft.id],g=elevators[shaft.id],offset=shaft.retractSign*(shaft.retractAxis===0?54.625:52)*e.retracted;
  const next=new T.Vector3(shaft.x,e.y,shaft.z);next.setComponent(shaft.retractAxis,next.getComponent(shaft.retractAxis)+offset);const scale=1-.94*e.retracted;
  if(!g.position.equals(next)||g.scale.getComponent(shaft.retractAxis)!==scale)renderer.shadowMap.needsUpdate=true;
  g.position.copy(next);g.scale.set(1,1,1);g.scale.setComponent(shaft.retractAxis,scale);g.visible=visibleFloor<0||Math.abs((e.y-C.config.baseY)/C.config.pitchY-visibleFloor)<.5;
 }
 parkedPallets.forEach(g=>{const {node,level,shaft}=g.userData,occupant=st.layout[node],e=st.elevators[shaft],liftAway=Math.abs(e.y-C.slots[node][1])>5||e.retracted>.99;g.visible=liftAway&&occupant!==null&&occupant!==st.active&&(visibleFloor<0||visibleFloor===level);});
 obstruction.visible=$('block').checked&&(visibleFloor<0||visibleFloor===1);
 const selected=rooms[selectedRoom];selectionFrame.position.copy(selected.position);selectionFrame.visible=selected.userData.visible&&!cutaway;
 updateRoute(st);
 if(viewName==='closeup'&&!roaming){const p=st.positions[selectedRoom];goal.target.set(p[0],p[1]+35,p[2]);}
 else if($('follow').checked&&playing&&st.active>=0&&!roaming){goal.target.set(st.head[0],st.head[1]+35,st.head[2]);}
 if(roaming){const forward=new T.Vector3(Math.sin(freeYaw),0,Math.cos(freeYaw)),right=new T.Vector3(-Math.cos(freeYaw),0,Math.sin(freeYaw)),speed=dt*(held.has('ShiftLeft')||held.has('ShiftRight')?230:75);if(held.has('KeyW'))freePosition.addScaledVector(forward,speed);if(held.has('KeyS'))freePosition.addScaledVector(forward,-speed);if(held.has('KeyD'))freePosition.addScaledVector(right,speed);if(held.has('KeyA'))freePosition.addScaledVector(right,-speed);if(held.has('KeyE'))freePosition.y+=speed;if(held.has('KeyQ'))freePosition.y-=speed;freePosition.y=Math.max(terrainY(freePosition.x,freePosition.z)+7,Math.min(2500,freePosition.y));freePosition.x=Math.max(-3500,Math.min(3500,freePosition.x));freePosition.z=Math.max(-3500,Math.min(3500,freePosition.z));camera.position.copy(freePosition);camera.lookAt(freePosition.x+Math.sin(freeYaw)*Math.cos(freePitch),freePosition.y+Math.sin(freePitch),freePosition.z+Math.cos(freeYaw)*Math.cos(freePitch));}
 else{const ease=1-Math.exp(-dt*5);yaw+=(goal.yaw-yaw)*ease;pitch+=(goal.pitch-pitch)*ease;distance+=(goal.distance-distance)*ease;target.lerp(goal.target,ease);const dist=distance*Math.max(1,.9/camera.aspect);camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*dist,target.y+Math.sin(pitch)*dist,target.z+Math.cos(yaw)*Math.cos(pitch)*dist);camera.lookAt(target);}
 camera.updateMatrixWorld();const labelRoom=st.active>=0&&time>0?st.active:selectedRoom,r=rooms[labelRoom],v=r.position.clone().add(new T.Vector3(0,85,0)).project(camera),w=stage.clientWidth,h=stage.clientHeight,sx=(v.x+1)*w/2,sy=(1-v.y)*h/2;
 activeLabel.hidden=!$('labels').checked||!r.userData.visible||v.z>1||v.z< -1||sx<60||sx>w-60||sy<70||sy>h-20;activeLabel.textContent=`${buildingNames[labelRoom]}${st.type==='elevate'?'  ↑↓ Y '+metres(st.head[1])+' m':''}`;if(!activeLabel.hidden){activeLabel.style.left=sx+'px';activeLabel.style.top=sy+'px';}
 if(now-lastUI>100){drawUI(st);lastUI=now;}
 renderScene();
}
function resize(){const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();const size=renderer.getDrawingBufferSize(new T.Vector2());targetRT.setSize(size.x,size.y);postMat.uniforms.resolution.value.copy(size);const half=new T.Vector2(Math.ceil(size.x/2),Math.ceil(size.y/2));for(const rt of [brightRT,blurRT,bloomRT])rt.setSize(half.x,half.y);blurMat.uniforms.resolution.value.copy(half);renderer.shadowMap.needsUpdate=true;}
new ResizeObserver(resize).observe(stage);resize();
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();playing=false;$('error').hidden=false;$('error').textContent='显卡渲染上下文已丢失。请刷新页面恢复三维场景。';controls();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){playing=false;held.clear();controls();}lastNow=performance.now();});
compile('vertical',false);
let lastNow=performance.now(),fpsFrames=0,fpsElapsed=0;const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(reducedMotion){yaw=goal.yaw;pitch=goal.pitch;distance=goal.distance;target.copy(goal.target);}
function frame(now){
 const realDt=Math.max(.0001,(now-lastNow)/1000),dt=Math.min(.25,realDt);lastNow=now;
 if(playing){const before=snapshot();time+=Math.min(1,realDt)*Number($('speed').value);
   if(pendingManual&&before.phase){const docking=phases.find(p=>p.type==='dock'&&p.moveIndex===before.phase.moveIndex);if(docking&&time>=docking.end){time=docking.end;enterManual();}}
   if(time>=duration&&phases.length){time=duration;playing=false;audit('complete');if($('loop').checked&&!manualMode){time=0;playing=true;audit('loop');}controls();}
 }
 draw(dt,now);fpsFrames++;fpsElapsed+=realDt;if(fpsElapsed>1){$('fps').textContent=String(Math.round(fpsFrames/fpsElapsed));fpsFrames=0;fpsElapsed=0;}$('loading').hidden=true;requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
