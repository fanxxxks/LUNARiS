from pathlib import Path
p=Path('lunar-app.js');s=p.read_text(encoding='utf-8')
def rep(a,b):
 global s
 assert a in s,a[:100]
 s=s.replace(a,b)
rep("const phaseNames=", "const oldPhaseNames=")
i=s.index('const metres=');s=s[:i]+"const phaseNames={ready:'已就绪',seal:'关闭舱门并隔离',disconnect:'断开服务接口',unlock:'释放停靠锁',depart:'离座与径向退出',cruise:'外围飞行与姿态控制',approach:'反推制动与接近',softCapture:'软捕获与对准',hardCapture:'机械硬锁定',leakTest:'接口检漏',equalize:'接口均压',connect:'恢复服务连接',open:'开启气密通道',dock:'停靠完成',done:'重构完成'};\n"+s[i:]
rep('let selectedRoom=7,','let previewMove=null,walking=false,sectionMode=false,needsRender=true,rafPending=false,lastNow=performance.now(),snapshotCache=null;\nlet selectedRoom=1,')
rep("const blocked=()=>$('block').checked?[C.lift(1,'C')]:[];", "const blocked=()=>$('block').checked?[C.bay(4,2)]:[];")
rep('const snapshot=()=>C.state(baseLayout,phases,time,baseElevators);',"const snapshot=()=>{if(!snapshotCache||snapshotCache.base!==baseLayout||snapshotCache.phases!==phases||snapshotCache.time!==time)snapshotCache={base:baseLayout,phases,time,state:C.state(baseLayout,phases,time)};return snapshotCache.state;};\nfunction requestRender(){needsRender=true;if(!rafPending){rafPending=true;lastNow=performance.now();requestAnimationFrame(frame);}}\nfor(const event of ['pointerdown','pointermove','pointerup','wheel','input','change','click','keydown','keyup'])document.addEventListener(event,requestRender,true);\nconst putText=(id,value)=>{const e=$(id),v=String(value);if(e.textContent!==v)e.textContent=v;};")
rep('b.style.gridColumn=String(node.col+3);b.style.gridRow=String(node.row+2);if(node.lift)b.textContent=node.shaft;',"b.style.gridColumn=String(node.sector+1);b.style.gridRow='1';b.textContent=String(node.sector+1);")
rep('function setFloor(level){visibleFloor=level;', 'function setFloor(level){requestRender();visibleFloor=level;')
rep('function controls(){','function controls(){\n requestRender();')
rep(' resetPointerState();',' requestRender();resetPointerState();')
rep("if(name==='closeup')goal={yaw:.7,pitch:.32,distance:mobile()?460:390,target:new T.Vector3(p[0],p[1]+35,p[2])};", "if(name==='closeup')goal={yaw:st.orientations[selectedRoom][1]+.3,pitch:.16,distance:mobile()?440:330,target:new T.Vector3(p[0],p[1]+35,p[2])};")
rep('baseElevators=C.config.baseY;events=[];', 'baseElevators=C.config.baseY;previewMove=null;$(\'movePreview\').hidden=true;events=[];')
rep('baseElevators=structuredClone(st.elevators)', 'baseElevators=C.config.baseY')
rep('baseElevators=structuredClone(current.elevators)', 'baseElevators=C.config.baseY')
rep("task='manual';estop=false;", "task='manual';previewMove=null;$('movePreview').hidden=true;estop=false;")
a=s.index('function moveSelected(to){');b=s.index('function moveAxis',a)
s=s[:a]+'''function moveSelected(to){
 if(!manualMode||estop)return;if(phases.length&&time<duration){notify('当前舱段尚未停靠，请先完成本次飞行。');return;}
 const current=snapshot(),layout=current.layout,from=layout.indexOf(selectedRoom);if(from===to)return;
 try{previewMove=C.move(layout,from,to,blocked());$('movePreview').hidden=false;putText('previewInfo',`${C.nodes[from].label} → ${C.nodes[to].label} · 飞行 ${metres(C.length(previewMove.path))} m。确认后开始关门、离座与对接。`);requestRender();}
 catch(e){previewMove=null;$('movePreview').hidden=true;notify(e.message,true);requestRender();}
}
$('confirmMove').onclick=()=>{if(!previewMove||estop)return;const current=snapshot();baseLayout=current.layout.slice();moves=[previewMove];previewMove=null;$('movePreview').hidden=true;const tl=C.timeline(moves);phases=tl.phases;duration=tl.duration;time=0;playing=true;ready=true;showPlan();audit('manual-flight',{room:selectedRoom,path:moves[0].path});controls();};
$('cancelMove').onclick=()=>{previewMove=null;$('movePreview').hidden=true;requestRender();};
$('walkthrough').onclick=()=>{walking=!walking;$('walkthrough').classList.toggle('active',walking);$('walkthrough').setAttribute('aria-pressed',String(walking));requestRender();if(walking)notify('绿色线显示科研舱之间经环廊与中央竖向交通的实际路径；飞行中舱段暂不可通行。');};
$('sectionView').onclick=()=>{sectionMode=!sectionMode;$('sectionView').classList.toggle('active',sectionMode);$('sectionView').setAttribute('aria-pressed',String(sectionMode));if(sectionMode)chooseView('closeup');requestRender();};
''' +s[b:]
rep('房间须先平移至框架内部 A / B / C 升降通道，才能沿 Y 轴换层。','该方向没有更高或更低的泊位。可直接点击任意空闲泊位规划跨层飞行。')
rep('该方向已到达轨道边界。','该方向没有可用泊位。可以直接点击空闲泊位规划飞行。')
rep('这是空闲框架泊位。开启手动调度后可将选中房间送到这里。','这是空闲停靠位。开启手动调度后点击这里，可预览飞行路线。')
rep('function selectRoom(room){selectedRoom=room;', "function selectRoom(room){previewMove=null;$('movePreview').hidden=true;requestRender();selectedRoom=room;")
rep('const scale=goal.distance*.001;', 'const scale=goal.distance*.001;')
rep('goal.target.y+=dy*scale;}', 'goal.target.y+=dy*scale;}\nfunction syncInput(){yaw=goal.yaw;pitch=goal.pitch;distance=goal.distance;target.copy(goal.target);requestRender();}')
rep('drag.y=e.clientY;}\n});','drag.y=e.clientY;}\n if(!roaming)syncInput();\n});')
rep('goal.distance*Math.exp(e.deltaY*.00085)));},{passive:false});', 'goal.distance*Math.exp(e.deltaY*.00085)));if(!roaming)syncInput();requestRender();},{passive:false});')
rep("C.lift(1,'C')",'C.bay(4,2)')
rep('当前搬运经过 L2 · C 通道，请停靠后再封闭。','当前计划使用 L5 · P03 泊位，请停靠后再封闭。')
rep("version:'4.0',display:'LUNARIS irregular megaframe architectural concept'", "version:'5.0',display:'LUNARIS lunar surface propulsion and pressure docking concept'")
rep("'translate','elevate'", "'depart','cruise','approach'")
rep('框架透视 · 搬运已暂停','对接结构 · 演示已暂停')
rep('房间隐藏，显示原位承重框架、水平轨道与三条内部升降通道。','隐藏舱体，观察中央气密核心、连接通道与独立落座支承。')
rep('房间嵌入五层不规则框架，经 A / B / C 内部通道完成跨层重构。','推进器将舱段送往外围飞行空域，落座后锁定并恢复气密连接。')
rep("st.active>=0?buildingNames[st.active]:`${st.phase.shaft||''} 通道升降机构`", "st.active>=0?buildingNames[st.active]:'对接机构'")
rep("st.type==='elevate'", "st.type==='cruise'")
rep("C.nodes[node]?.lift?'已进入内部升降通道，可使用 Q / E 或 ±Y 跨层。':'WASD 平移 · Q / E 升降。灰色方向表示占用或轨道边界。'", "previewMove?'已生成预览。确认飞行后执行完整离座与对接流程。':'点击空闲泊位预览飞行；六向按钮按方位选择泊位。' ")
rep('const current=st.phase?moves[st.phase.moveIndex]:null,key=current?JSON.stringify(current.path):\'\';',"const current=previewMove||(st.phase?moves[st.phase.moveIndex]:null),key=current?current.room+'|'+current.from+'|'+current.to+'|'+(previewMove?'preview':'flight'):'';")
rep('const offset=vertical?[53,12,0]:[0,2,44];','const offset=[0,18,0];')
a=s.index(' const st=snapshot();updateInstances');b=s.index(' const selected=rooms[selectedRoom];',a)
s=s[:a]+''' const st=snapshot();updateInstances(st.positions,visibleFloor,cutaway,st.orientations,sectionMode?selectedRoom:-1);updateFlightVisual(st,time);
 obstruction.visible=$('block').checked&&(visibleFloor<0||visibleFloor===4);
 previewGhost.visible=Boolean(previewMove);if(previewMove){const p=C.slots[previewMove.to];previewGhost.position.set(p[0],p[1]+C.config.height/2,p[2]);previewGhost.rotation.y=C.nodes[previewMove.to].yaw;}
 const walkingKey=walking?st.layout.join(',')+'|'+st.active+'|'+visibleFloor:'off';
 if(walking&&walkingKey!==walkLineKey){const ids=(C.missions[task]?.roomIds||[1,2,7]).filter(id=>id!==st.active);drawWalkPath(C.walkMetrics(st.layout,ids).routes,walkingKey);}else if(!walking)drawWalkPath([],walkingKey);walkGroup.visible=walking&&!cutaway;
''' +s[b:]
rep('selectionFrame.position.copy(selected.position);', 'selectionFrame.position.copy(selected.position);selectionFrame.rotation.copy(selected.rotation);')
rep('const ease=1-Math.exp(-dt*5);', 'const ease=1-Math.exp(-dt*8);')
rep('camera.lookAt(target);}', 'camera.lookAt(target);if(Math.abs(goal.yaw-yaw)<.00001&&Math.abs(goal.pitch-pitch)<.00001&&Math.abs(goal.distance-distance)<.02&&target.distanceTo(goal.target)<.02){yaw=goal.yaw;pitch=goal.pitch;distance=goal.distance;target.copy(goal.target);}}')
rep("activeLabel.textContent=`", "const labelText=`")
rep("if(!activeLabel.hidden){activeLabel.style.left=sx+'px';activeLabel.style.top=sy+'px';}","if(activeLabel.textContent!==labelText)activeLabel.textContent=labelText;if(!activeLabel.hidden){activeLabel.style.transform=`translate3d(${sx}px,${sy}px,0) translate(-50%,-100%)`;activeLabel.style.left='0';activeLabel.style.top='0';}")
rep('renderer.shadowMap.needsUpdate=true;}\nnew ResizeObserver', 'renderer.shadowMap.needsUpdate=true;requestRender();}\nnew ResizeObserver')
rep("postMat.uniforms.exposure.value=Number($('exposure').value);};", "postMat.uniforms.exposure.value=Number($('exposure').value);requestRender();};")
rep("$('lighting').onchange=()=>setLighting($('lighting').value);", "$('lighting').onchange=()=>{setLighting($('lighting').value);requestRender();};")
a=s.index('let lastNow=performance.now(),fpsFrames=0');s=s[:a]+'''let fpsFrames=0,fpsElapsed=0;const frameSamples=[];const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(reducedMotion){yaw=goal.yaw;pitch=goal.pitch;distance=goal.distance;target.copy(goal.target);}
function cameraChanging(){return Math.abs(goal.yaw-yaw)>.000001||Math.abs(goal.pitch-pitch)>.000001||Math.abs(goal.distance-distance)>.001||target.distanceToSquared(goal.target)>.000001;}
function frame(now){
 rafPending=false;const realDt=Math.max(.0001,(now-lastNow)/1000),dt=Math.min(.1,realDt);lastNow=now;
 if(playing){const before=pendingManual?snapshot():null;time+=realDt*Number($('speed').value);
  if(pendingManual&&before?.phase){const docking=phases.find(p=>p.type==='dock'&&p.moveIndex===before.phase.moveIndex);if(docking&&time>=docking.end){time=docking.end;enterManual();}}
  if(time>=duration&&phases.length){time=duration;playing=false;audit('complete');if($('loop').checked&&!manualMode){time=0;playing=true;audit('loop');}controls();}
 }
 const active=needsRender||playing||cameraChanging()||(roaming&&held.size>0);needsRender=false;
 if(active){draw(dt,now);if(realDt<.15){frameSamples.push(realDt*1000);if(frameSamples.length>120)frameSamples.shift();fpsFrames++;fpsElapsed+=realDt;}
  if(fpsElapsed>1){putText('fps',Math.round(fpsFrames/fpsElapsed));const sorted=frameSamples.slice().sort((a,b)=>a-b);putText('frameTime',sorted[Math.floor((sorted.length-1)*.95)].toFixed(1));fpsFrames=0;fpsElapsed=0;}
  if(renderer.info)putText('renderStats',`${renderer.info.render.calls} / ${(renderer.info.render.triangles/1000).toFixed(0)}k`);$('loading').hidden=true;
 }
 if(playing||cameraChanging()||(roaming&&held.size>0)||needsRender){rafPending=true;requestAnimationFrame(frame);}
}
requestRender();
})();
'''
# Telemetry, map accessibility and route availability are refreshed only as their content changes.
needle="const mission=C.missions[task];$('missionResult').textContent="
rep(needle,"$('flightTelemetry').hidden=st.active<0||time===0;putText('flightStage',phaseNames[st.type]||st.type);putText('flightSpeed',(Math.hypot(...(st.velocity||[0,0,0]))*C.config.metresPerUnit).toFixed(1));putText('flightThrust',(st.thrustKN||0).toFixed(1));putText('dockStatus',st.connected?'气密通道已连通':st.doorsClosed?`舱门隔离 · 接口压力 ${Math.round((st.pressure||0)*100)}%`:'准备关闭舱门');\n const mission=C.missions[task];$('missionResult').textContent=")
rep('C.edgeClear(node,to,st.layout,selectedRoom,blocked())', 'st.layout[to]===null&&!blocked().includes(to)&&!blocked().includes(node)')
p.write_text(s,encoding='utf-8')
