from pathlib import Path
p=Path('lunar-app.js')
s=p.read_text(encoding='utf-8')
def rep(a,b):
 global s
 assert a in s, a[:140]
 s=s.replace(a,b)
rep("const taskNames={vertical:'跨层换位',cascade:'三层重组',district:'街区平移',manual:'手动调度'};", "const taskNames={vertical:'科研协作',cascade:'维修隔离',district:'基地扩建',manual:'手动调度'};")
rep('baseElevatorY=24','baseElevators=C.config.baseY')
rep('baseElevatorY','baseElevators')
rep('cutaway=false,spread=0,','cutaway=false,')
rep("let yaw=.7,pitch=.34,distance=950,target=new T.Vector3(24,137,0),goal={yaw:.7,pitch:.34,distance:950,target:new T.Vector3(24,137,0)};", "let yaw=.64,pitch=.25,distance=1330,target=new T.Vector3(-30,246,0),goal={yaw:.64,pitch:.25,distance:1330,target:new T.Vector3(-30,246,0)};")
rep('mobile()?1090:950','mobile()?1450:1330')
rep('C.lift(1)',"C.lift(1,'C')")
rep('for(let level=2;level>=0;level--)','for(let level=C.config.layers-1;level>=0;level--)')
rep('24+level*96','C.config.baseY+level*C.config.pitchY')
rep("if(!node.lift){b.style.gridColumn=String(node.col+1);b.style.gridRow=String(node.row+1);}","b.style.gridColumn=String(node.col+3);b.style.gridRow=String(node.row+2);if(node.lift)b.textContent=node.shaft;")
rep("new T.Vector3(10,C.config.baseY+level*C.config.pitchY+20,0)","new T.Vector3(level>=2?-40:0,C.config.baseY+level*C.config.pitchY+25,0)")
rep('distance:mobile()?940:760','distance:mobile()?1050:900')
rep('distance:mobile()?440:370','distance:mobile()?460:390')
rep('distance:mobile()?1130:1010,target:new T.Vector3(32,visibleFloor<0?110:24+visibleFloor*96,0)','distance:mobile()?1500:1380,target:new T.Vector3(-25,visibleFloor<0?180:C.config.baseY+visibleFloor*C.config.pitchY,0)')
rep('distance:mobile()?1160:920,target:new T.Vector3(28,160,0)','distance:mobile()?1470:1290,target:new T.Vector3(-25,253,0)')
rep("goal={yaw:.7,pitch:cutaway?.39:.34,distance:cutaway?overviewDistance()+180:overviewDistance(),target:new T.Vector3(24,cutaway?166:137,0)}", "goal={yaw:.64,pitch:cutaway?.3:.25,distance:overviewDistance(),target:new T.Vector3(-30,246,0)}")
rep("$('log').innerHTML=", "$('planDistance').textContent=$('distance').textContent;const mission=C.missions[task];$('missionPurpose').textContent=mission?.purpose||'选择房间和空闲泊位，沿框架轨道执行六向调度。';\n $('log').innerHTML=")
rep("selectedRoom=name==='district'?7:19;","selectedRoom=C.missions[name].roomIds[0];")
rep('baseElevators=st.elevatorY','baseElevators=structuredClone(st.elevators)')
rep('baseElevators=current.elevatorY','baseElevators=structuredClone(current.elevators)')
rep('time>0&&time<duration&&st.active>=0','time>0&&time<duration&&st.phase')
rep('建筑须先平移至右侧升降塔，才能沿 Y 轴换层。','房间须先平移至框架内部 A / B / C 升降通道，才能沿 Y 轴换层。')
rep('这是空闲升降位。开启手动调度后可将选中建筑送到这里。','这是空闲框架泊位。开启手动调度后可将选中房间送到这里。')
rep('当前搬运经过 L2 升降位，请停靠后再封闭。','当前搬运经过 L2 · C 通道，请停靠后再封闭。')
rep('highQuality?1.6:1','highQuality?1.75:1')
rep('highQuality?2048:1024','highQuality?4096:2048')
rep("$('qualityLabel').textContent=highQuality?", "renderer.shadowMap.needsUpdate=true;$('qualityLabel').textContent=highQuality?")
a=s.index("$('lighting').onchange=()=>{")
b=s.index("$('export').onclick",a)
s=s[:a]+"$('lighting').onchange=()=>setLighting($('lighting').value);\n"+s[b:]
rep("version:'3.0',display:'LUNARIS multi-level architectural concept'", "version:'4.0',display:'LUNARIS irregular megaframe architectural concept'")
rep('initialElevatorY:baseElevators','initialElevators:baseElevators')
rep('slots:C.slots,nodes:C.nodes,moves','slots:C.slots,nodes:C.nodes,shafts:C.shafts,mission:C.missions[task]||null,moves')
rep('结构分解 · 搬运已暂停','框架透视 · 搬运已暂停')
rep('升降通道封闭 · 暂无有效路径','当前布局暂无有效路径')
rep('楼层分开展示承重骨架与运输轨道；实际调度坐标保持不变。','房间隐藏，显示原位承重框架、水平轨道与三条内部升降通道。')
rep('建筑紧密排列，跨层运输通过右侧升降塔进行。','房间嵌入五层不规则框架，经 A / B / C 内部通道完成跨层重构。')
rep("st.active>=0?buildingNames[st.active]:'共享升降机构'", "st.active>=0?buildingNames[st.active]:`${st.phase.shaft||''} 通道升降机构`")
rep("for(const b of mapButtons){", "const mission=C.missions[task];$('missionResult').textContent=mission?`${mission.metricLabel}：${mission.before} → ${mission.after} ${mission.unit} · 当前 ${C.missionMetric(task,st.layout)} ${mission.unit}`:'停靠后更新布局，可连续执行多次手动搬运。';\n for(const b of mapButtons){")
rep('已进入升降塔，可使用 Q / E 或 ±Y 跨层。','已进入内部升降通道，可使用 Q / E 或 ±Y 跨层。')
old="""const st=snapshot();spread+=(Number(cutaway)-spread)*Math.min(1,dt*6);updateInstances(st.positions,visibleFloor,spread);
 const liftY=st.elevatorY,forkScale=1-.92*st.retracted;elevator.scale.x=forkScale;elevator.position.set(245*(1-forkScale)+64*st.retracted,liftY,0);elevator.visible=!cutaway&&(visibleFloor<0||Math.abs((liftY-24)/96-visibleFloor)<.5);
 parkedPallets.forEach((g,i)=>{const occupant=st.layout[C.lift(i)];g.visible=occupant!==null&&occupant!==st.active&&(visibleFloor<0||visibleFloor===i);g.position.y=24+i*96+spread*i*45;});
 obstruction.visible=$('block').checked&&(visibleFloor<0||visibleFloor===1);"""
new="""const st=snapshot();updateInstances(st.positions,visibleFloor,cutaway);
 for(const shaft of C.shafts){const e=st.elevators[shaft.id],g=elevators[shaft.id],offset=shaft.retractSign*(shaft.retractAxis===0?54:52)*e.retracted;
  const next=new T.Vector3(shaft.x,e.y,shaft.z);next.setComponent(shaft.retractAxis,next.getComponent(shaft.retractAxis)+offset);const scale=1-.94*e.retracted;
  if(!g.position.equals(next)||g.scale.getComponent(shaft.retractAxis)!==scale)renderer.shadowMap.needsUpdate=true;
  g.position.copy(next);g.scale.set(1,1,1);g.scale.setComponent(shaft.retractAxis,scale);g.visible=visibleFloor<0||Math.abs((e.y-C.config.baseY)/C.config.pitchY-visibleFloor)<.5;
 }
 parkedPallets.forEach(g=>{const {node,level}=g.userData,occupant=st.layout[node];g.visible=occupant!==null&&occupant!==st.active&&(visibleFloor<0||visibleFloor===level);});
 obstruction.visible=$('block').checked&&(visibleFloor<0||visibleFloor===1);"""
rep(old,new)
rep('postMat.uniforms.resolution.value.copy(size);','postMat.uniforms.resolution.value.copy(size);const half=new T.Vector2(Math.ceil(size.x/2),Math.ceil(size.y/2));for(const rt of [brightRT,blurRT,bloomRT])rt.setSize(half.x,half.y);blurMat.uniforms.resolution.value.copy(half);renderer.shadowMap.needsUpdate=true;')
p.write_text(s,encoding='utf-8')
p=Path('lunar-scene.js');s=p.read_text(encoding='utf-8').replace("C.lift(2,'A')","C.lift(1,'C')");p.write_text(s,encoding='utf-8')
p=Path('lunar-ui.html');s=p.read_text(encoding='utf-8').replace('封闭 L3 · A 通道','封闭 L2 · C 通道').replace('value="1.1" aria-label="场景曝光"','value="1.02" aria-label="场景曝光"');p.write_text(s,encoding='utf-8')
p=Path('build-simulation.cjs');s=p.read_text(encoding='utf-8').replace('LUNARIS 3:','LUNARIS 4:').replace('36 buildings / 3 levels / XYZ transport.','24 rooms / 5 irregular levels / 3 internal XYZ shafts.');p.write_text(s,encoding='utf-8')
