// Browser graphics settings. Values describe implemented WebGL passes, not
// similarly named native-engine features. Preferences are independent of audio.
const graphicsDefaults={
 output:'native',scale:100,dynamic:true,minScale:70,dynamicFps:60,upscale:'sharp',sharpness:.16,
 texture:2048,streaming:true,textureBudget:256,af:16,detail:'full',lodDistance:160,terrain:420,viewDistance:1400,
 roughness:1,metalness:1,normal:1,decals:true,wetness:0,environment:1,indirect:.24,
 shadow:4096,shadowDistance:70,shadowFilter:'soft',shadowSoftness:1.6,contact:.35,
 aoMode:'horizon',aoSamples:24,aoRadius:1.8,aoStrength:.65,ssr:'medium',ssrStrength:.38,
 tone:'aces',exposure:1.02,temperature:0,tint:0,saturation:1.02,contrast:1.02,
 bloom:.18,bloomThreshold:1.7,bloomRadius:1,dof:0,autoFocus:true,focusDistance:90,
 motionBlur:0,grain:0,aberration:0,vignette:.14,blackLevel:0,gamma:1,accumulate:16
};
const graphicsPresets={
 cinematic:{...graphicsDefaults,shadow:6144,aoSamples:32,ssr:'high'},
 high:{...graphicsDefaults,shadow:4096,terrain:260,aoSamples:16,ssr:'medium',indirect:.16,accumulate:8},
 performance:{...graphicsDefaults,scale:85,texture:1024,textureBudget:128,af:8,detail:'auto',terrain:128,shadow:2048,aoMode:'off',aoSamples:8,contact:0,ssr:'off',indirect:0,bloom:0,accumulate:0}
};
const graphicsGroups=[
 ['分辨率与重建',[
  ['output','输出分辨率',{native:'跟随窗口像素',1080:'1080p',1440:'1440p',2160:'2160p · 4K'}],
  ['scale','渲染比例',50,150,5,'%'],['dynamic','动态分辨率'],['minScale','动态最低比例',50,100,5,'%'],
  ['dynamicFps','动态目标帧率',{30:'30 FPS',60:'60 FPS',90:'90 FPS',120:'120 FPS'}],
  ['upscale','空间重建',{linear:'双线性',sharp:'抗振铃锐化'}],['sharpness','锐化强度',0,.6,.02]
 ],'输出保持所选尺寸；动态分辨率只调整内部渲染。静止时恢复设定比例并积累采样。空间重建不使用 AI。'],
 ['纹理与几何',[
  ['texture','纹理分辨率',{512:'512 · 节省内存',1024:'1K',2048:'2K · 原始精度'}],['streaming','按距离流送纹理'],
  ['textureBudget','纹理预算',{64:'64 MiB',128:'128 MiB',256:'256 MiB',512:'512 MiB'}],
  ['af','各向异性过滤 AF',{1:'1×',2:'2×',4:'4×',8:'8×',16:'16×'}],
  ['detail','模型细节',{full:'完整舱内模型',auto:'自动距离 LOD'}],['lodDistance','舱内 LOD 距离',80,300,10,' m'],
  ['terrain','地形细分',{128:'基础 · 128',260:'精细 · 260',420:'极致 · 420'}],['viewDistance','场景视距',600,1800,100,' m']
 ],'流送分批上传近处高精度贴图，预算控制表面纹理驻留量。LOD 只简化远处舱内陈设，房间外壳始终保留。地形细分使用真实高度场。'],
 ['表面材质',[
  ['roughness','粗糙度倍率',.5,1.5,.05],['metalness','金属度倍率',0,1.3,.05],['normal','法线细节',0,2,.1],['decals','表面印刷与贴花'],['wetness','湿润表面',0,1,.05]
 ],'保留各材质的金属与非金属属性。湿润效果降低粗糙度并加深表面，月面场景默认干燥。'],
 ['光照与阴影',[
  ['environment','环境探针强度',0,2,.05],['indirect','屏幕空间间接光',0,.6,.02],
  ['shadow','阴影分辨率',{0:'关闭',1024:'1024',2048:'2048',4096:'4096',6144:'6144',8192:'8192'}],
  ['shadowDistance','阴影覆盖半径',50,140,5,' m'],['shadowFilter','阴影过滤',{hard:'硬阴影',soft:'PCF 软阴影'}],['shadowSoftness','软阴影半径',.5,4,.25],['contact','接触阴影',0,.7,.05]
 ],'环境探针提供预过滤反射；间接光与接触阴影利用当前画面深度，无法获取屏幕外的信息。'],
 ['环境遮蔽与反射',[
  ['aoMode','环境光遮蔽',{off:'关闭',ssao:'SSAO',horizon:'多方向地平线 AO'}],['aoSamples','AO 采样',{8:'8',16:'16',24:'24',32:'32'}],['aoRadius','AO 半径',.4,3.6,.2,' m'],['aoStrength','AO 强度',0,1,.05],
  ['ssr','屏幕空间反射',{off:'关闭',medium:'SSR · 24 步',high:'SSR · 48 步'}],['ssrStrength','SSR 混合强度',0,.8,.02]
 ],'SSR 按表面法线和金属反射权重追踪当前深度；离屏区域由环境探针保留基础反射。'],
 ['镜头与调色',[
  ['tone','色调映射',{aces:'ACES Filmic',reinhard:'Reinhard',neutral:'中性压缩'}],
  ['temperature','冷暖',-1,1,.05],['tint','绿品红偏移',-1,1,.05],['saturation','饱和度',0,1.5,.05],['contrast','对比度',.8,1.3,.02],
  ['bloom','Bloom 强度',0,.6,.02],['bloomThreshold','Bloom 阈值',.5,4,.1],['bloomRadius','Bloom 半径',.5,3,.1],
  ['dof','景深强度',0,1,.05],['autoFocus','对焦当前主体'],['focusDistance','手动对焦距离',5,300,5,' m'],
  ['motionBlur','镜头动态模糊',0,1,.05],['grain','胶片颗粒',0,.1,.005],['aberration','色差',0,2,.1,' px'],['vignette','暗角',0,.6,.02],
  ['accumulate','静态积累采样',{0:'关闭',8:'8 帧',16:'16 帧',32:'32 帧'}]
 ],'静态积累消除细线闪烁，运动时即时重置。动态模糊仅根据镜头运动计算。景深与镜头瑕疵默认关闭。'],
 ['显示与能力',[
  ['blackLevel','SDR 黑位',-.03,.03,.005],['gamma','显示伽马倍率',.8,1.2,.02]
 ],'当前输出：SDR / sRGB。内部使用半浮点线性颜色。当前版本不提供 HDR 显示输出、峰值亮度、纸白或广色域控制，也不提供 Nanite、Lumen、硬件光追与 AI 超分。']
];
const graphicsStorageKey='lunaris.graphics.v2';
let graphicsProfile='cinematic',graphicsAA='auto',graphicsCustom=false;
const graphics={...graphicsPresets.cinematic};
const graphicsFields=new Map(graphicsGroups.flatMap(g=>g[1]).map(row=>[row[0],row]));
function sanitizeGraphics(key,value){
 if(key==='exposure')return Number.isFinite(Number(value))?Math.max(.65,Math.min(1.8,Number(value))):graphicsDefaults.exposure;
 const row=graphicsFields.get(key);if(!row)return undefined;
 if(row.length===2)return typeof value==='boolean'?value:graphicsDefaults[key];
 if(typeof row[2]==='object')return Object.hasOwn(row[2],String(value))?(typeof graphicsDefaults[key]==='number'?Number(value):String(value)):graphicsDefaults[key];
 const n=Number(value);return Number.isFinite(n)?Math.max(row[2],Math.min(row[3],n)):graphicsDefaults[key];
}
try{const saved=JSON.parse(localStorage.getItem(graphicsStorageKey)||'null');if(saved?.version===2){
 graphicsProfile=Object.hasOwn(graphicsPresets,saved.profile)?saved.profile:'cinematic';Object.assign(graphics,graphicsPresets[graphicsProfile]);
 for(const key of Object.keys(graphics))if(Object.hasOwn(saved.settings||{},key))graphics[key]=sanitizeGraphics(key,saved.settings[key]);
 graphicsAA=['auto','msaa','msaa2','msaa4','msaa8','fxaa'].includes(saved.aa)?saved.aa:'auto';graphicsCustom=!!saved.custom;
}}catch{}
function saveGraphics(){try{localStorage.setItem(graphicsStorageKey,JSON.stringify({version:2,profile:graphicsProfile,aa:graphicsAA,custom:graphicsCustom,settings:graphics}));}catch{}}
function graphicsValue(row){const value=graphics[row[0]];return typeof value==='number'?Number(value.toFixed(3))+(row[5]||''):String(value);}
function syncGraphicsUI(){
 for(const row of graphicsFields.values()){const el=$('gfx-'+row[0]);if(!el)continue;if(el.type==='checkbox')el.checked=graphics[row[0]];else el.value=String(graphics[row[0]]);const out=$('gfx-value-'+row[0]);if(out)out.textContent=graphicsValue(row);}
 $('quality').value=graphicsProfile;$('aaMode').value=graphicsAA;$('exposure').value=graphics.exposure;
 for(const key of ['minScale','dynamicFps'])if($('gfx-'+key))$('gfx-'+key).disabled=!graphics.dynamic;
 if($('gfx-focusDistance'))$('gfx-focusDistance').disabled=graphics.autoFocus;
 if($('graphicsPresetState'))$('graphicsPresetState').textContent=graphicsCustom?'已自定义 · 选择预设可重新应用整组设置':'预设已应用 · 所有选项可单独调整';
}
function mountGraphicsUI(){
 const host=$('graphicsSettings');
 for(const [title,rows,note] of graphicsGroups){const group=document.createElement('details'),summary=document.createElement('summary');group.className='graphics-group';summary.textContent=title;group.appendChild(summary);
  for(const row of rows){const [key,label,type]=row,id='gfx-'+key,wrap=document.createElement('label'),caption=document.createElement('span');wrap.className='row graphics-row';wrap.htmlFor=id;caption.textContent=label;wrap.appendChild(caption);
   const field=document.createElement(typeof type==='object'?'select':'input');field.id=id;
   if(typeof type==='object'){for(const [value,text] of Object.entries(type)){const option=document.createElement('option');option.value=value;option.textContent=text;field.appendChild(option);}}
   else if(row.length===2)field.type='checkbox';
   else{field.type='range';field.min=row[2];field.max=row[3];field.step=row[4];}
   const valueWrap=document.createElement('span');valueWrap.className='graphics-control';valueWrap.appendChild(field);
   if(field.type==='range'){const output=document.createElement('output');output.id='gfx-value-'+key;output.htmlFor=id;valueWrap.appendChild(output);field.oninput=()=>{output.textContent=Number(Number(field.value).toFixed(3))+(row[5]||'');};}
   field.onchange=()=>{graphics[key]=sanitizeGraphics(key,field.type==='checkbox'?field.checked:field.value);graphicsCustom=true;saveGraphics();applyGraphicsSettings(key);syncGraphicsUI();};
   wrap.appendChild(valueWrap);group.appendChild(wrap);
  }
  const help=document.createElement('p');help.className='quality-note';help.textContent=note;group.appendChild(help);host.appendChild(group);
 }
 syncGraphicsUI();$('graphicsReset').onclick=()=>{Object.assign(graphics,graphicsPresets[graphicsProfile]);graphicsCustom=false;saveGraphics();applyGraphicsSettings('all');syncGraphicsUI();};
}

// Keep source bitmaps on the CPU; upload just the chosen mipmapped resolution.
// This pool is a budget for photographic surface maps, not a reading of free VRAM.
const graphicsResources={materials:new Set(),textures:new Set(),jobs:[],managedMiB:0,residentMiB:0,otherTextureMiB:0,uploads:0,lastScan:-Infinity,lastStream:-Infinity,terrainSegments:260,lodRooms:0};
const textureSlots=['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','bumpMap','alphaMap'];
function collectGraphicsResources(){
 scene.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material])){if(!m)continue;graphicsResources.materials.add(m);for(const key of textureSlots)if(m[key])graphicsResources.textures.add(m[key]);}});
 for(const map of surfaceTexture.cache?.values()||[])graphicsResources.textures.add(map);
 for(const mat of graphicsResources.materials)if((mat.isMeshStandardMaterial||mat.isMeshPhysicalMaterial)&&!mat.userData.graphicsBase){mat.userData.graphicsBase={roughness:mat.roughness,metalness:mat.metalness,normal:mat.normalScale?.clone(),environment:mat.envMapIntensity,color:mat.color.clone()};}
}
function applyGraphicsMaterials(){
 collectGraphicsResources();
 for(const mat of graphicsResources.materials){const base=mat.userData.graphicsBase;if(base){
  const wet=mat.transparent?0:graphics.wetness;
  mat.roughness=base.roughness*graphics.roughness*(1-wet*.7);mat.metalness=base.metalness*graphics.metalness;
  if(base.normal)mat.normalScale.copy(base.normal).multiplyScalar(graphics.normal);
  mat.envMapIntensity=base.environment*graphics.environment;mat.color.copy(base.color).multiplyScalar(1-wet*.22);
 }if(mat.userData.graphicsDecal||mat.userData.interiorAtlas)mat.visible=graphics.decals;}
 const af=Math.min(graphics.af,renderer.capabilities.getMaxAnisotropy());
 for(const map of graphicsResources.textures)if(map.anisotropy!==af){map.anisotropy=af;map.needsUpdate=true;}
}
function scheduleTextureResidency(){
 collectGraphicsResources();const priorities=new Map();
 scene.traverse(o=>{if(!o.isMesh)return;const family=o.material?.userData.surfaceFamily;if(!family)return;
  let d=Infinity;if(o.userData.roomIds){for(const id of o.userData.roomIds)d=Math.min(d,camera.position.distanceTo(rooms[id].position));}
  else{o.getWorldPosition(textureWorldPosition);d=textureWorldPosition.distanceTo(camera.position);}
  priorities.set(family,Math.min(priorities.get(family)??Infinity,d));
 });
 const entries=[];let other=0;
 for(const map of graphicsResources.textures){const source=map.userData.graphicsSource||map.image;
  if(!source||source.complete===false||!(source.naturalWidth||source.width))continue;
  const w=source.naturalWidth||source.width,h=source.naturalHeight||source.height;
  if(!map.userData.embedded){other+=w*h*4*(map.generateMipmaps?4/3:1);continue;}
  map.userData.graphicsSource=source;
  const distance=priorities.get(map.userData.family)??2000,max=Math.max(w,h);
  const cap=graphics.streaming?(distance>1800?512:distance>950?1024:graphics.texture):graphics.texture;
  const size=Math.min(max,graphics.texture,cap),factor=size/max;
  entries.push({map,source,w:Math.max(1,Math.round(w*factor)),h:Math.max(1,Math.round(h*factor)),distance});
 }
 const bytes=e=>e.w*e.h*4*4/3;let total=entries.reduce((n,e)=>n+bytes(e),0),budget=graphics.textureBudget*1024*1024;
 // Reduce the farthest families first. Every channel receives the same order
 // and cost model; no encoded JPEG size is mistaken for GPU memory usage.
 const order=entries.slice().sort((a,b)=>b.distance-a.distance);
 while(total>budget){let changed=false;for(const e of order){if(Math.max(e.w,e.h)<=256)continue;const before=bytes(e);e.w=Math.max(1,e.w/2|0);e.h=Math.max(1,e.h/2|0);total-=before-bytes(e);changed=true;if(total<=budget)break;}if(!changed)break;}
 graphicsResources.jobs=entries.filter(e=>(e.map.image?.width!==e.w||e.map.image?.height!==e.h||!e.map.userData.residentWidth)).sort((a,b)=>a.distance-b.distance);
 graphicsResources.managedMiB=total/1048576;graphicsResources.otherTextureMiB=other/1048576;
}
const textureWorldPosition=new T.Vector3();
function serviceTextureResidency(){
 // At most one upload per frame limits stutter during image decode / streaming.
 const e=graphicsResources.jobs.shift();if(!e)return false;
 if(e.w===(e.source.naturalWidth||e.source.width)&&e.h===(e.source.naturalHeight||e.source.height))e.map.image=e.source;
 else{const canvas=document.createElement('canvas');canvas.width=e.w;canvas.height=e.h;const ctx=canvas.getContext('2d');ctx.drawImage(e.source,0,0,e.w,e.h);e.map.image=canvas;}
 e.map.userData.residentWidth=e.w;e.map.userData.residentHeight=e.h;e.map.needsUpdate=true;graphicsResources.uploads++;resetAccumulation();return true;
}
function graphicsTextureStats(){
 const maps=[...graphicsResources.textures].filter(m=>m.userData.embedded);graphicsResources.residentMiB=maps.reduce((sum,m)=>sum+(m.image?.width||0)*(m.image?.height||0)*4*4/3,0)/1048576;
 return {budgetMiB:graphics.textureBudget,plannedMiB:graphicsResources.managedMiB,residentMiB:graphicsResources.residentMiB,otherTextureMiB:graphicsResources.otherTextureMiB,pendingUploads:graphicsResources.jobs.length,uploads:graphicsResources.uploads,af:Math.min(graphics.af,renderer.capabilities.getMaxAnisotropy()),maps:maps.map(m=>({name:m.name,width:m.image?.width||0,height:m.image?.height||0}))};
}
function applyTerrainDetail(){
 if(graphicsResources.terrainSegments===graphics.terrain)return;
 const n=graphics.terrain,geo=new T.PlaneGeometry(10500,10500,n,n);geo.rotateX(-Math.PI/2);const p=geo.attributes.position,uv=geo.attributes.uv,colors=[];
 for(let i=0;i<p.count;i++){const x=terrainAxis(p.getX(i)),z=terrainAxis(p.getZ(i)),y=terrainY(x,z);p.setXYZ(i,x,y,z);uv.setXY(i,x/24,z/24);
  const disturbed=Math.max(0,1-Math.abs(Math.max(Math.abs((x+20)/405),Math.abs(z/290))-1.1)*2.5);
  const shade=.57+(noise(x*.0027,z*.0027)-.5)*.18+(noise(x*.018+19,z*.018-7)-.5)*.075+(noise(x*.085,z*.085)-.5)*.035+disturbed*.035+Math.max(-.05,Math.min(.035,y*.0006));colors.push(shade*.98,shade*.985,shade);
 }
 geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setAttribute('uv2',uv.clone());geo.computeVertexNormals();geo.computeBoundingSphere();terrain.geometry.dispose();terrain.geometry=geo;terrain.userData.nearFieldSpacing=terrainAxis(10500/n);graphicsResources.terrainSegments=n;
}
function applyGraphicsSettings(changed='all'){
 if(benchmark)finishBenchmark(true);
 if(changed==='all'||['roughness','metalness','normal','environment','wetness','decals','af'].includes(changed))applyGraphicsMaterials();
 if(changed==='all'||['texture','streaming','textureBudget'].includes(changed))scheduleTextureResidency();
 if(changed==='all'||changed==='terrain')applyTerrainDetail();
 camera.far=graphics.viewDistance/C.config.metresPerUnit;camera.updateProjectionMatrix();
 configureRenderer(graphicsProfile,graphicsAA);resizeRenderTargets(Math.max(1,stage.clientWidth),Math.max(1,stage.clientHeight));invalidateRoomInstances();
 syncGraphicsUI();updateGraphicsReadout();requestRender();
}
function updateGraphicsReadout(){
 const el=$('graphicsResolution');if(!el)return;const size=renderer.getDrawingBufferSize(drawingSize),textures=graphicsTextureStats();
 el.textContent=`输出 ${size.x} × ${size.y} · 内部 ${targetRT.width} × ${targetRT.height} · ${Math.round(renderScale*100)}%`;
 $('graphicsMemory').textContent=`表面纹理 ${textures.residentMiB.toFixed(1)} / ${textures.budgetMiB} MiB · 其他贴图约 ${textures.otherTextureMiB.toFixed(1)} MiB · 待上传 ${textures.pendingUploads}`;
 $('qualityLabel').textContent=renderProfiles[qualityMode].label+(graphicsCustom?' · 自定义':'')+' · '+(aaSamples?aaSamples+'× MSAA':'FXAA');
 const dyn=$('graphicsDynamicState');dyn.textContent=graphics.dynamic?(getRenderDiagnostics().timerAvailable?'动态缩放使用异步 GPU 耗时；静止恢复精度。':'GPU 计时不可用，保持设定比例。'):'动态缩放已关闭。';
}
