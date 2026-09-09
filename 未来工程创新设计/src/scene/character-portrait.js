// A small, independent rig for the dossier. It runs on the existing app RAF;
// closing the card or choosing the illustration stops all preview rendering.
function createCharacterPortrait(){
 const button=$('characterPortrait'),canvas=$('characterPortraitCanvas'),hint=$('characterPortraitHint');
 let source=null,walkClip=null,expanded=false,mode='illustration',previewRenderer=null,previewScene,previewCamera,previewMixer,previewAction,frames=0,width=1,height=1;
 const active=()=>expanded&&mode==='walking'&&source&&!document.hidden&&!document.body.classList.contains('reduced');
 function initialize(){
  if(previewRenderer||!source)return;
  previewRenderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  previewRenderer.setClearColor(0x000000,0);previewRenderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  previewRenderer.outputColorSpace=T.SRGBColorSpace;previewRenderer.toneMapping=T.ACESFilmicToneMapping;previewRenderer.toneMappingExposure=1.15;
  previewScene=new T.Scene();previewCamera=new T.PerspectiveCamera(32,1,.1,100);previewCamera.position.set(0,9,36);previewCamera.lookAt(0,8.5,0);
  const figure=LunarCloneSkeleton(source),remove=[];
  figure.traverse(o=>{if(o.name.startsWith('character-highlight-'))remove.push(o);});remove.forEach(o=>o.removeFromParent());
  // Share mesh geometry, but use a 1K UI texture so a second context does not
  // upload the main scene's 8K texture again. No changes to the scene material.
  const materials=new Map(),textures=new Map();
  figure.traverse(o=>{if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=false;
   const convert=original=>{if(materials.has(original))return materials.get(original);const material=original.clone();
    if(original.map){let texture=textures.get(original.map);if(!texture){const image=original.map.image,small=document.createElement('canvas');small.width=small.height=1024;small.getContext('2d').drawImage(image,0,0,1024,1024);texture=new T.CanvasTexture(small);texture.colorSpace=original.map.colorSpace;texture.flipY=original.map.flipY;textures.set(original.map,texture);}material.map=texture;}materials.set(original,material);return material;};
   o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);
  });
  const facing=new T.Group();facing.rotation.y=-Math.PI/4;facing.add(figure);previewScene.add(facing);
  previewScene.add(new T.HemisphereLight('#f6ffe9','#6b756a',2.7));const key=new T.DirectionalLight('#fff6e5',3.4);key.position.set(-10,20,20);previewScene.add(key);const rim=new T.DirectionalLight('#becfdc',2);rim.position.set(12,15,-10);previewScene.add(rim);
  previewMixer=new T.AnimationMixer(figure);previewAction=previewMixer.clipAction(walkClip);previewAction.play();resize();
 }
 function resize(){const rect=button.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height-24);if(previewRenderer){previewRenderer.setSize(width,height,false);previewCamera.aspect=width/height;previewCamera.position.z=Math.max(36,20/previewCamera.aspect);previewCamera.updateProjectionMatrix();}requestRender();}
 new ResizeObserver(resize).observe(button);
 function setMode(next){mode=next;button.classList.toggle('is-walking',mode==='walking');canvas.hidden=mode!=='walking';button.setAttribute('aria-pressed',String(mode==='walking'));button.setAttribute('aria-label',mode==='walking'?'切换为冯鹏立绘':'切换为行走模型');hint.textContent=mode==='walking'?'返回人物立绘 ↙':'查看行走模型 ↗';requestRender();}
 button.onclick=()=>setMode(mode==='illustration'?'walking':'illustration');
 function tick(dt){if(!active())return;try{initialize();previewMixer.update(Math.min(.1,dt));previewRenderer.render(previewScene,previewCamera);frames++;}catch(e){setMode('illustration');hint.textContent='模型预览暂不可用';console.warn('Character portrait preview:',e.message);}}
 return {setAsset(model,clip){source=model;walkClip=clip;requestRender();},setExpanded(value){expanded=value;requestRender();},tick,get needsFrames(){return !!active();},export:()=>({mode,expanded,frames,animationTime:previewAction?.time||0,initialized:!!previewRenderer,width,height})};
}
