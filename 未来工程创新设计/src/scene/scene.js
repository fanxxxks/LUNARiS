(() => {
'use strict';
const T=THREE,C=LunarCore,$=id=>document.getElementById(id),stage=$('stage');
let renderer;
try{renderer=new T.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});}catch(e){$('error').hidden=false;$('error').textContent='三维场景未能启动，请使用支持 WebGL 的 Chrome 或 Edge。';$('loading').hidden=true;$('play').disabled=true;return;}
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;stage.appendChild(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#080e15');const camera=new T.PerspectiveCamera(35,1,1,14000);
const ambient=new T.HemisphereLight('#cad6df','#343c43',.95);scene.add(ambient);
const sun=new T.DirectionalLight('#f6f1e8',3.6);sun.position.set(-520,760,450);sun.target.position.set(-40,230,0);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-540,right:540,top:540,bottom:-540,near:80,far:1900});sun.shadow.normalBias=.16;sun.shadow.bias=-.00007;sun.shadow.radius=3;scene.add(sun,sun.target);
const rim=new T.DirectionalLight('#b4c9d7',1.65);rim.position.set(400,420,-430);scene.add(rim);
const envScene=new T.Scene();envScene.background=new T.Color('#29333c');
function envPanel(w,h,x,y,z,color,intensity){const p=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(color).multiplyScalar(intensity),side:T.DoubleSide}));p.position.set(x,y,z);p.lookAt(0,120,0);envScene.add(p);}
envPanel(1400,850,-500,650,350,'#edf1f2',1.65);envPanel(950,800,650,380,-320,'#c6d3dc',1.0);
envPanel(1600,750,0,180,-1100,'#c7d2da',1.2);
// Broad, low-energy cards create gentle reflection gradients on satin metal.
envPanel(650,1100,-520,-180,760,'#e5e9e9',1.05);
envPanel(600,1100,520,-180,-760,'#d1dde5',1.0);
envPanel(1100,500,150,600,850,'#e8eded',1.15);
envPanel(1800,1800,0,-500,0,'#434a4f',.3);
// PMREM's default far plane is 100. These photographic light cards are
// 500–1800 units away: explicitly include them in the reflection capture.
const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(envScene,.03,.1,4000);scene.environment=environment.texture;pmrem.dispose();envScene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
let seed=4217;function rand(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
function hash(x,z){const s=Math.sin(x*127.1+z*311.7)*43758.5453;return s-Math.floor(s);}
function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);return (hash(ix,iz)*(1-u)+hash(ix+1,iz)*u)*(1-v)+(hash(ix,iz+1)*(1-u)+hash(ix+1,iz+1)*u)*v;}
function texture(w,h,paint,repeat=null,data=false){const cv=document.createElement('canvas');cv.width=w;cv.height=h;paint(cv.getContext('2d'),w,h);const tex=new T.CanvasTexture(cv);if(!data)tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(repeat){tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(...repeat);}return tex;}
// Shared surface maps use the same legacy random-call counts as before: later
// rock/star placement remains deterministic and independent of this art pass.
const alloyMap=texture(1024,512,(ctx,w,h)=>{
 ctx.fillStyle='#e9ecec';ctx.fillRect(0,0,w,h);
 for(let x=0;x<w;x+=128)for(let y=0;y<h;y+=128){
  const v=Math.round(231+hash(x/128,y/128)*8);ctx.fillStyle=`rgb(${v-1},${v},${v})`;ctx.fillRect(x+1,y+1,126,126);
  const dust=ctx.createLinearGradient(x,y,x+128,y+128);dust.addColorStop(0,'#66707800');dust.addColorStop(.78,'#66707800');dust.addColorStop(1,'#6670780b');ctx.fillStyle=dust;ctx.fillRect(x+1,y+1,126,126);
 }
 for(let i=0;i<44000;i++){const v=Math.floor(150+rand()*85);ctx.fillStyle=`rgba(${v},${v},${v},${.008+rand()*.022})`;ctx.fillRect(rand()*w,rand()*h,.5+rand()*14,.5);}
 ctx.strokeStyle='#76858c35';ctx.lineWidth=1;for(let x=0;x<w;x+=128){ctx.beginPath();ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,h);ctx.stroke();}for(let y=0;y<h;y+=128){ctx.beginPath();ctx.moveTo(0,y+.5);ctx.lineTo(w,y+.5);ctx.stroke();}
 for(let x=7;x<w;x+=128)for(let y=7;y<h;y+=128){ctx.fillStyle='#82909770';ctx.fillRect(x,y,2,2);ctx.fillRect(x+113,y,2,2);ctx.fillStyle='#ffffff99';ctx.fillRect(x,y+2,2,.6);ctx.fillRect(x+113,y+2,2,.6);}
});
const roughMap=texture(256,256,(ctx,w,h)=>{const d=ctx.createImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const v=196+noise(x*.06,y*.06)*34+rand()*9;d.data.set([v,v,v,255],(y*w+x)*4);}ctx.putImageData(d,0,0);},null,true);
let brushedHeight,coatingHeight;
const brushedMap=texture(512,256,(ctx,w,h)=>{brushedHeight=new Uint8Array(w*h*4);ctx.fillStyle='#d1d1d1';ctx.fillRect(0,0,w,h);for(let y=0;y<h;y++){const v=Math.round(194+rand()*44);ctx.fillStyle=`rgba(${v},${v},${v},.48)`;ctx.fillRect(0,y,w,.65);const height=Math.round(209+(v-209)*.48*.65);for(let x=0;x<w;x++)brushedHeight[(y*w+x)*4]=height;}},[1,1],true);
// R stores shallow height; G stores roughness. One shared map supplies both
// channels without per-room textures, extra geometry or transparent overlays.
const coatingDetail=texture(512,512,(ctx,w,h)=>{
 const d=ctx.createImageData(w,h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const edge=Math.min(x%64,64-x%64,y%128,128-y%128),seam=Math.max(0,1-edge/1.4);
  const grain=noise(x*.22,y*.22),dust=noise(x*.025,y*.025),scratch=hash(Math.floor(x*.13),y);
  const height=128+(grain-.5)*5+(scratch-.5)*1.8-seam*9,rough=217+dust*22+grain*6+seam*7;
  d.data.set([height,rough,height,255],(y*w+x)*4);
 }ctx.putImageData(d,0,0);coatingHeight=d.data;
},null,true);
// Bake tangent-space micro normals once. The runtime shader samples one normal
// texel instead of evaluating three height samples per fragment. Reference
// spans keep a panel's relief shallow; these normals never displace geometry.
function surfaceNormal(height,w,h,spanX,spanY,source){
 const data=new Uint8Array(w*h*4),wrapX=source.wrapS===T.RepeatWrapping,wrapY=source.wrapT===T.RepeatWrapping;
 const sample=(x,y)=>{x=wrapX?(x+w)%w:Math.max(0,Math.min(w-1,x));y=wrapY?(y+h)%h:Math.max(0,Math.min(h-1,y));return height[(y*w+x)*4];};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const nx=(sample(x-1,y)-sample(x+1,y))*w/(510*spanX),ny=(sample(x,y+1)-sample(x,y-1))*h/(510*spanY),q=1/Math.hypot(nx,ny,1),i=(y*w+x)*4;
  data[i]=Math.round((nx*q*.5+.5)*255);data[i+1]=Math.round((ny*q*.5+.5)*255);data[i+2]=Math.round((q*.5+.5)*255);data[i+3]=255;
 }
 const map=new T.DataTexture(data,w,h,T.RGBAFormat,T.UnsignedByteType);
 map.colorSpace=T.NoColorSpace;map.flipY=source.flipY;map.wrapS=source.wrapS;map.wrapT=source.wrapT;map.repeat.copy(source.repeat);
 map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;map.generateMipmaps=true;map.anisotropy=source.anisotropy;map.needsUpdate=true;return map;
}
const coatingNormal=surfaceNormal(coatingHeight,512,512,112.5,62,coatingDetail),brushedNormal=surfaceNormal(brushedHeight,512,256,20,20,brushedMap);
coatingHeight=null;brushedHeight=null;
const solarMap=texture(1024,512,(ctx,w,h)=>{ctx.fillStyle='#132940';ctx.fillRect(0,0,w,h);for(let x=0;x<w;x+=64)for(let y=0;y<h;y+=64){const v=rand();ctx.fillStyle=`rgb(${10+v*10},${30+v*12},${48+v*20})`;ctx.fillRect(x+2,y+2,60,60);ctx.strokeStyle='#69839188';ctx.strokeRect(x+2,y+2,60,60);for(let q=7;q<62;q+=8){ctx.fillStyle='#9daebb44';ctx.fillRect(x+q,y+3,.6,58);}}});
const soilMap=texture(1024,1024,(ctx,w,h)=>{const d=ctx.createImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const n=noise(x*.017,y*.017)*23+noise(x*.07,y*.07)*21+rand()*23,v=83+n;d.data.set([v*.985,v*.995,v,255],(y*w+x)*4);}ctx.putImageData(d,0,0);for(let i=0;i<2300;i++){const x=rand()*w,y=rand()*h,r=.4+rand()*4;ctx.fillStyle=rand()>.5?'#bbc0c333':'#20262d42';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}},[80,80]);
// A dedicated, band-limited regolith height field avoids treating high-contrast
// albedo flecks as deep relief. Green retains a consistently dry rough surface.
const soilBump=texture(512,512,(ctx,w,h)=>{
 const d=ctx.createImageData(w,h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const fine=noise(x*.42,y*.42),grit=noise(x*.13,y*.13),drift=noise(x*.034,y*.034);
  const height=108+fine*18+grit*24+drift*12,rough=232+fine*12+grit*9;
  d.data.set([height,rough,height,255],(y*w+x)*4);
 }ctx.putImageData(d,0,0);
},[80,80],true);
const mats={
 frame:new T.MeshStandardMaterial({color:'#a0acb5',map:alloyMap,roughnessMap:brushedMap,normalMap:brushedNormal,normalScale:new T.Vector2(.014,.014),roughness:.61,metalness:.84,envMapIntensity:.9}),
 hull:new T.MeshStandardMaterial({color:'#f0f2f1',map:alloyMap,roughnessMap:coatingDetail,normalMap:coatingNormal,normalScale:new T.Vector2(.055,.055),roughness:.77,metalness:.07,envMapIntensity:.7}),
 silver:new T.MeshStandardMaterial({color:'#c5cdd3',roughnessMap:brushedMap,normalMap:brushedNormal,normalScale:new T.Vector2(.012,.012),roughness:.49,metalness:.93,envMapIntensity:1}),
 pale:new T.MeshStandardMaterial({color:'#b8c3c8',roughnessMap:roughMap,normalMap:brushedNormal,normalScale:new T.Vector2(.01,.01),roughness:.6,metalness:.65}),
 dark:new T.MeshStandardMaterial({color:'#232d34',roughnessMap:roughMap,roughness:.83,metalness:.54,envMapIntensity:.7}),
 deck:new T.MeshStandardMaterial({color:'#46515a',map:alloyMap,roughnessMap:coatingDetail,normalMap:coatingNormal,normalScale:new T.Vector2(.045,.028),roughness:.92,metalness:.38}),
 gold:new T.MeshStandardMaterial({color:'#ae936d',roughnessMap:roughMap,roughness:.62,metalness:.78}),
 glass:new T.MeshPhysicalMaterial({name:'clear-pressure-window',color:'#d1e4e8',roughness:.075,metalness:0,transparent:true,opacity:.14,depthWrite:false,forceSinglePass:true,clearcoat:1,clearcoatRoughness:.035,envMapIntensity:.68,side:T.DoubleSide}),
 glassDark:new T.MeshPhysicalMaterial({color:'#193441',roughness:.17,metalness:.69,clearcoat:1,envMapIntensity:1.4}),
 warm:new T.MeshStandardMaterial({color:'#ceb894',emissive:'#efbb77',emissiveIntensity:1.45,roughness:.35}),
 cool:new T.MeshStandardMaterial({color:'#a3c9cb',emissive:'#75becf',emissiveIntensity:1.15,roughness:.28}),
 led:new T.MeshBasicMaterial({color:new T.Color('#c1eee9').multiplyScalar(1.7)}),
 solar:new T.MeshStandardMaterial({color:'#cedae0',map:solarMap,roughness:.33,metalness:.78,envMapIntensity:.9}),
 rubber:new T.MeshStandardMaterial({color:'#111c26',roughness:.97,metalness:.1}),
 suit:new T.MeshStandardMaterial({name:'nonmetal-astronaut-suit',color:'#f0f2ee',roughness:.93,metalness:0}),
 insulation:new T.MeshStandardMaterial({color:'#ad9b7d',map:alloyMap,roughnessMap:roughMap,roughness:.64,metalness:.77}),
 interior:new T.MeshStandardMaterial({color:'#6a747c',roughnessMap:roughMap,roughness:.95,metalness:.16,emissive:'#52605a',emissiveIntensity:.08}),
 innerWall:new T.MeshStandardMaterial({color:'#a5afaf',roughnessMap:coatingDetail,normalMap:coatingNormal,normalScale:new T.Vector2(.025,.025),roughness:.91,emissive:'#b7c3c7',emissiveIntensity:.05}),
 plant:new T.MeshStandardMaterial({color:'#6d8062',roughness:.86})
};
function mesh(parent,geometry,mat,x=0,y=0,z=0){const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=!mat.transparent&&!mat.isMeshBasicMaterial;m.receiveShadow=true;parent.add(m);return m;}
function box(parent,w,h,d,x,y,z,mat){return mesh(parent,new T.BoxGeometry(w,h,d),mat,x,y,z);}
function cyl(parent,r,h,x,y,z,mat,segments=16){return mesh(parent,new T.CylinderGeometry(r,r,h,segments),mat,x,y,z);}
function sphere(parent,r,x,y,z,mat){return mesh(parent,new T.SphereGeometry(r,24,16),mat,x,y,z);}
function tube(parent,a,b,r,mat){const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start),m=mesh(parent,new T.CylinderGeometry(r,r,delta.length(),10),mat);m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;}
function line(parent,pts,color='#9cdbd5',opacity=1){const m=new T.Line(new T.BufferGeometry().setFromPoints(pts.map(p=>new T.Vector3(...p))),new T.LineBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false}));parent.add(m);return m;}
function decal(parent,text,w,h,x,y,z,rotation=0){const map=texture(512,96,ctx=>{ctx.fillStyle='#d1ded8';ctx.font='700 32px Novecento Wide Bold, Lunaris Display, Lunaris Serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,48);});const m=mesh(parent,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,forceSinglePass:true,side:T.DoubleSide}),x,y,z);m.rotation.x=rotation;return m;}
function roundedShape(w,h,r){r=Math.min(r,w/2,h/2);const s=new T.Shape(),x=-w/2;s.moveTo(x+r,0);s.lineTo(-x-r,0);s.quadraticCurveTo(-x,0,-x,r);s.lineTo(-x,h-r);s.quadraticCurveTo(-x,h,-x-r,h);s.lineTo(x+r,h);s.quadraticCurveTo(x,h,x,h-r);s.lineTo(x,r);s.quadraticCurveTo(x,0,x+r,0);return s;}
function roundedBox(parent,w,h,d,r,x,y,z,mat){const geo=new T.ExtrudeGeometry(roundedShape(w,h,r),{depth:d,bevelEnabled:false,curveSegments:8,steps:1});return mesh(parent,geo,mat,x,y-h/2,z-d/2);}
function bake(parent){parent.updateWorldMatrix(true,true);const inverse=parent.matrixWorld.clone().invert(),groups=new Map(),remove=[];parent.traverse(child=>{if(!child.isMesh||child.isInstancedMesh||Array.isArray(child.material))return;const geo=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();geo.applyMatrix4(inverse.clone().multiply(child.matrixWorld));let attrs=groups.get(child.material);if(!attrs){attrs={position:[],normal:[],uv:[]};groups.set(child.material,attrs);}for(const key of ['position','normal','uv']){const a=geo.getAttribute(key);if(a)for(const n of a.array)attrs[key].push(n);}geo.dispose();remove.push(child);});remove.forEach(m=>{m.parent.remove(m);m.geometry.dispose();});const out=[];for(const [mat,attrs] of groups){const geo=new T.BufferGeometry();for(const key of ['position','normal','uv'])if(attrs[key].length)geo.setAttribute(key,new T.Float32BufferAttribute(attrs[key],key==='uv'?2:3));geo.computeBoundingSphere();out.push(mesh(parent,geo,mat));}return out;}
const craters=[[-820,220,205,65],[570,-960,330,105],[920,480,205,60],[-390,780,130,37],[-1450,-980,360,88],[1340,-1550,490,139],[-1060,1290,300,78]];
// Secondary impact bowls use the same height function for the mesh, props
// and free-camera clearance. Nothing displaces the level construction pad.
const smallCraters=Array.from({length:28},(_,i)=>{const a=hash(i,93)*Math.PI*2,reach=520+hash(i,39)*1400,r=18+hash(i,71)*49;return [Math.cos(a)*reach,Math.sin(a)*reach,r,r*(.13+hash(i,52)*.11)];});
function terrainY(x,z){const flatten=Math.min(1,Math.max(0,(Math.max(Math.abs((x+20)/405),Math.abs(z/290))-1)*1.6));let h=(noise(x*.003,z*.003)-.5)*48+(noise(x*.012,z*.012)-.5)*16+(noise(x*.054,z*.054)-.5)*4;for(const [cx,cz,r,d]of craters){const q=Math.hypot(x-cx,z-cz)/r;h-=d*Math.exp(-q*q*2.5);h+=d*.42*Math.exp(-Math.pow((q-.93)*5.4,2));}for(const [cx,cz,r,d]of smallCraters){if(Math.abs(x-cx)>r*2||Math.abs(z-cz)>r*2)continue;const q=Math.hypot(x-cx,z-cz)/r;h-=d*Math.exp(-q*q*3.2);h+=d*.35*Math.exp(-Math.pow((q-.91)*6,2));}const far=Math.max(0,Math.hypot(x,z)-1250)/2300;h+=far*(80+170*noise(x*.0017,z*.0017));return -8+h*flatten;}
// Concentrate samples around the station: ~9 m cells at the centre versus
// the previous uniform 40 m. The horizon remains continuous without seams.
const terrainSegments=260,terrainGeo=new T.PlaneGeometry(10500,10500,terrainSegments,terrainSegments);terrainGeo.rotateX(-Math.PI/2);const terrainPositions=terrainGeo.attributes.position,terrainColors=[];
const terrainAxis=v=>5250*Math.sinh(v/5250*3.5)/Math.sinh(3.5);
for(let i=0;i<terrainPositions.count;i++){
 const x=terrainAxis(terrainPositions.getX(i)),z=terrainAxis(terrainPositions.getZ(i)),y=terrainY(x,z);terrainPositions.setXYZ(i,x,y,z);
 const broad=noise(x*.0027,z*.0027),ejecta=noise(x*.018+19,z*.018-7),grit=noise(x*.085,z*.085);
 const padDistance=Math.max(Math.abs((x+20)/405),Math.abs(z/290)),disturbed=Math.max(0,1-Math.abs(padDistance-1.1)*2.5);
 const shade=.57+(broad-.5)*.18+(ejecta-.5)*.075+(grit-.5)*.035+disturbed*.035+Math.max(-.05,Math.min(.035,y*.0006));
 terrainColors.push(shade*.98,shade*.985,shade);
}
terrainGeo.setAttribute('color',new T.Float32BufferAttribute(terrainColors,3));terrainGeo.computeVertexNormals();const terrain=mesh(scene,terrainGeo,new T.MeshStandardMaterial({vertexColors:true,map:soilMap,bumpMap:soilBump,bumpScale:.22,roughnessMap:soilBump,roughness:1,metalness:0,envMapIntensity:.18}));terrain.name='graded-regolith-terrain';terrain.userData.nearFieldSpacing=terrainAxis(10500/terrainSegments);terrain.castShadow=false;
const dummy=new T.Object3D(),rocks=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),new T.MeshStandardMaterial({color:'#636970',roughnessMap:roughMap,roughness:1,metalness:0,envMapIntensity:.2}),1800);
const rockTint=new T.Color();
for(let i=0;i<1800;i++){let x,z;const spread=i<650?.38:1;do{x=(rand()-.5)*5400*spread;z=(rand()-.5)*4600*spread;}while(Math.abs(x+20)<410&&Math.abs(z)<295);const r=.5+Math.pow(rand(),3)*(i<650?8:18);dummy.position.set(x,terrainY(x,z)+r*.16,z);dummy.rotation.set(rand()*3,rand()*3,rand()*3);dummy.scale.set(r,r*(.27+rand()*.55),r*(.65+hash(i,62)*.4));dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);const tint=.72+hash(i,31)*.36;rockTint.setRGB(tint,tint*.99,tint*.97);rocks.setColorAt(i,rockTint);}rocks.name='regolith-fragments';rocks.castShadow=true;rocks.receiveShadow=true;scene.add(rocks);
const starPositions=[];for(let i=0;i<1700;i++){const a=rand()*Math.PI*2,h=.045+rand()*.95;starPositions.push(Math.sin(a)*Math.sqrt(1-h*h)*8500,h*8500,Math.cos(a)*Math.sqrt(1-h*h)*8500);}const stars=new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(starPositions,3)),new T.PointsMaterial({color:'#b0c1d2',size:1.2,sizeAttenuation:false,transparent:true,opacity:.34,depthWrite:false}));scene.add(stars);
const station=new T.Group();station.name='compact-stepped-lunar-frame';scene.add(station);
const foundations=new T.Group(),posts=new T.Group(),frameLevels=Array.from({length:C.config.layers},()=>new T.Group());station.add(foundations,posts,...frameLevels);
foundations.name='recessed-foundations';posts.name='slender-joint-columns';frameLevels.forEach((g,i)=>g.name='thin-floor-L'+(i+1));
const fixedBoxes=[],frameEdges=new Set(),frameCorners=new Map();
const {pitchX,pitchY,pitchZ,width:roomWidth,height:roomHeight,depth:roomDepth,baseY}=C.config;
const halfX=pitchX/2,halfZ=pitchZ/2;
const moduleScaleXZ=C.config.moduleScaleXZ||1;
const bounds={minX:Math.min(...C.slots.map(p=>p[0]))-halfX,maxX:Math.max(...C.slots.map(p=>p[0]))+halfX,minZ:Math.min(...C.slots.map(p=>p[2]))-halfZ,maxZ:Math.max(...C.slots.map(p=>p[2]))+halfZ};
// Recess each folded carriage into an uninterrupted vertical pocket at the bay edge.
// The pocket also cuts decorative slab trims, so the visible structure and clearance agree.
const carriagePockets=C.shafts.map(shaft=>{
 const axis=shaft.retractAxis,sign=shaft.retractSign||1,fold=C.config.foldedScale,pad=.55;
 const cx=shaft.x+(axis===0?halfX*sign:0),cz=shaft.z+(axis===2?halfZ*sign:0);
 const hx=(axis===0?roomWidth*fold:roomWidth)/2+pad,hz=(axis===2?roomDepth*fold:roomDepth)/2+pad;
 const pocket={min:[cx-hx,baseY-7,cz-hz],max:[cx+hx,shaft.maxY+1,cz+hz]};
 // Include the expanding leading edge, not only the fully folded resting shape.
 const inner=(axis===0?shaft.x:shaft.z)+sign*((axis===0?roomWidth:roomDepth)/2-pad);
 if(sign>0)pocket.min[axis]=Math.min(pocket.min[axis],inner);else pocket.max[axis]=Math.max(pocket.max[axis],inner);
 return pocket;
});
// Personnel shafts pass through real slab openings, independently of cargo lifts.
// The opening scales with the enlarged room and clears its personnel sleeve.
const personnelPockets=C.nodes.filter(n=>!n.lift).map(n=>{
 const [x,y,z]=C.slots[n.id];return {min:[x+14.5*moduleScaleXZ,y-9,z-32.5*moduleScaleXZ],max:[x+33.5*moduleScaleXZ,y+1,z-13.5*moduleScaleXZ]};
});
const framePockets=[...carriagePockets,...personnelPockets];
function floorBox(parent,w,h,d,x,y,z,mat=mats.frame,record=false,pockets=framePockets){
 let pieces=[{min:[x-w/2,y-h/2,z-d/2],max:[x+w/2,y+h/2,z+d/2]}];
 for(const pocket of pockets){const next=[];for(const piece of pieces){
  const lo=piece.min.map((v,i)=>Math.max(v,pocket.min[i])),hi=piece.max.map((v,i)=>Math.min(v,pocket.max[i]));
  if(lo.some((v,i)=>v>=hi[i])){next.push(piece);continue;}
  const core={min:piece.min.slice(),max:piece.max.slice()};
  for(let axis=0;axis<3;axis++){
   if(core.min[axis]<lo[axis]){const part={min:core.min.slice(),max:core.max.slice()};part.max[axis]=lo[axis];next.push(part);core.min[axis]=lo[axis];}
   if(core.max[axis]>hi[axis]){const part={min:core.min.slice(),max:core.max.slice()};part.min[axis]=hi[axis];next.push(part);core.max[axis]=hi[axis];}
  }
 }pieces=next;}
 let result=null;for(const piece of pieces){if(record)fixedBoxes.push(piece);const size=piece.max.map((v,i)=>v-piece.min[i]),center=piece.max.map((v,i)=>(v+piece.min[i])/2);result=box(parent,...size,...center,mat);}return result;
}
function structuralBox(parent,w,h,d,x,y,z,mat=mats.frame){return floorBox(parent,w,h,d,x,y,z,mat,true);}
function ring(parent,r,t,x,y,z,mat,rotationX=0){const m=mesh(parent,new T.TorusGeometry(r,t,8,64),mat,x,y,z);m.rotation.x=rotationX;return m;}
// Rooms define the stepped silhouette. Beams stay within the thin floor band;
// the shared corner joints are slender and stop at the last supported floor.
for(const node of C.nodes){
 const [x,y,z]=C.slots[node.id],g=frameLevels[node.level];
 const corners=[[-halfX,-halfZ],[halfX,-halfZ],[halfX,halfZ],[-halfX,halfZ]].map(([dx,dz])=>[x+dx,z+dz]);
 for(const [cx,cz]of corners){const key=cx+','+cz,previous=frameCorners.get(key);if(!previous||previous.top<y-3)frameCorners.set(key,{x:cx,z:cz,top:y-3});}
 for(let edge=0;edge<4;edge++){
  const a=corners[edge],b=corners[(edge+1)%4],key=node.level+'|'+[a.join(','),b.join(',')].sort().join('|');if(frameEdges.has(key))continue;frameEdges.add(key);
  const alongX=Math.abs(a[0]-b[0])>.01,cx=(a[0]+b[0])/2,cz=(a[1]+b[1])/2;
  structuralBox(g,alongX?pitchX:2.4,3.4,alongX?2.4:pitchZ,cx,y-5.7,cz,mats.dark);
  floorBox(g,alongX?pitchX-2:.6,.55,alongX?.6:pitchZ-2,cx,y-4.2,cz,mats.silver);
 }
 // The vertical shaft itself is an open slot: only perimeter guides cross floors.
 for(const dz of [-halfZ+1,halfZ-1])structuralBox(g,pitchX-4,1.2,1.1,x,y-2.3,z+dz,mats.silver);
 for(const dx of [-halfX+1,halfX-1])structuralBox(g,1.1,1.2,pitchZ-4,x+dx,y-2.3,z,mats.dark);
 if(!node.lift){
  structuralBox(g,pitchX-4,3.2,pitchZ-4,x,y-5.6,z,mats.deck);
  floorBox(g,roomWidth+2,.7,roomDepth+2,x,y-3.65,z,mats.silver);
  floorBox(g,roomWidth,.7,roomDepth,x,y-2.75,z,mats.dark);
  for(const dx of [-roomWidth/2+4,roomWidth/2-4])for(const dz of [-roomDepth/2+4,roomDepth/2-4]){
   floorBox(g,5,1,5,x+dx,y-.8,z+dz,mats.pale);floorBox(g,2,.25,2,x+dx,y-.3,z+dz,mats.gold);
  }
 }
 if(!C.nodes.some(n=>n.level===node.level&&n.col===node.col&&n.row===node.row+1)){
  floorBox(g,pitchX-4,2.4,3,x,y-4.9,z+halfZ-1.5,mats.hull);
  floorBox(g,pitchX-9,.45,.35,x,y-4,z+halfZ+.1,mats.cool);
 }
}
for(const {x,z,top}of frameCorners.values()){
 structuralBox(posts,2.4,top-12,2.4,x,(top+12)/2,z,mats.frame);
 box(posts,.35,Math.max(1,top-15),.4,x+1.25,(top+12)/2,z+.8,mats.silver);
 box(foundations,13,3,13,x,13.5,z,mats.dark);box(foundations,8,3,8,x,16.5,z,mats.frame);
 for(const dx of [-3,3])for(const dz of [-3,3])cyl(foundations,.55,.8,x+dx,18.4,z+dz,mats.gold,8);
}
frameLevels.forEach((g,level)=>{
 const candidates=C.nodes.filter(n=>n.level===level&&!n.lift),front=candidates.filter(n=>!C.nodes.some(q=>q.level===level&&q.col===n.col&&q.row===n.row+1)),n=front[0]||candidates[0];
 if(n){const p=C.slots[n.id];decal(g,'L 0'+(level+1)+'  /  COMPACT HABITAT',roomWidth-8,3.3,p[0],p[1]-5,p[2]+halfZ+1);}
 bake(g);
});bake(posts);bake(foundations);
const elevators={},shaftVisuals={},parkedPallets=[];
for(const shaft of C.shafts){
 const {x,z}=shaft,g=new T.Group();g.name='retractable-lift-'+shaft.id;g.position.set(x,baseY,z);station.add(g);elevators[shaft.id]=g;
 // All carriage geometry stays below the module floor; topmost surface is -0.3.
 const palletOpening=[{min:[14.5*moduleScaleXZ,-6,-32.5*moduleScaleXZ],max:[33.5*moduleScaleXZ,1,-13.5*moduleScaleXZ]}];
 floorBox(g,roomWidth,3.2,roomDepth,0,-2.1,0,mats.gold,false,palletOpening);
 floorBox(g,roomWidth-4,.6,roomDepth-4,0,-.6,0,mats.dark,false,palletOpening);
 for(const dx of [-roomWidth/2+1,roomWidth/2-1])box(g,.6,.5,roomDepth-5,dx,-.65,0,mats.cool);
 for(const dz of [-roomDepth/2+1,roomDepth/2-1])box(g,roomWidth-5,.5,.6,0,-.65,dz,mats.gold);
 bake(g);
 for(const level of shaft.levels){const node=C.lift(level,shaft.id),y=C.slots[node][1],p=new T.Group();p.name='parked-side-support-'+shaft.id+'-L'+(level+1);p.position.set(x,y,z);p.userData={node,level,shaft:shaft.id};
  for(const dx of [-roomWidth/2+4,roomWidth/2-4])box(p,6,2.2,roomDepth-2,dx,-1.4,0,mats.gold);
  bake(p);station.add(p);parkedPallets.push(p);
 }
 const rails=new T.Group();rails.name='flush-guide-'+shaft.id;station.add(rails);
 const guideTop=shaft.maxY+2,guideBottom=baseY-6;
 for(const dx of [-halfX+1,halfX-1])for(const dz of [-halfZ+1,halfZ-1]){
  structuralBox(rails,.75,guideTop-guideBottom,.75,x+dx,(guideTop+guideBottom)/2,z+dz,mats.silver);
 }
 // Discrete markers lie in the slab band, with no head beam or gantry above rooms.
 for(const level of shaft.levels){const y=baseY+level*pitchY;box(rails,5,1.1,.6,x,y-5,z+halfZ+1,mats.gold);}
 bake(rails);shaftVisuals[shaft.id]=rails;
}
const workLights=[];
for(const [x,y,z,color,intensity]of [[-pitchX,baseY+pitchY*1.25,halfZ,'#a7d9dc',1400],[pitchX*.8,baseY+pitchY*2.7,halfZ,'#a2cbd9',1600],[-pitchX*.25,baseY+pitchY*4,-pitchZ,'#ffe0a2',900],[-pitchX*.55,baseY+8,pitchZ*1.25,'#ffd79e',700]]){
 const light=new T.PointLight(color,intensity,165,2);light.position.set(x,y,z);scene.add(light);workLights.push(light);
}

const typeNames=['材料实验','生命科学','居住单元','能源设备','物资保障','通信测控'],typeCodes=['MATERIAL / LAB','BIO / SCIENCE','HAB / LIVING','ENERGY / CORE','SUPPLY / LOG','COMMS / ARRAY'];
const roomPalette=[{code:'MAT',color:'#3e9dcc'},{code:'BIO',color:'#62ae85'},{code:'HAB',color:'#d5af75'},{code:'PWR',color:'#d28a48'},{code:'LOG',color:'#be716f'},{code:'COM',color:'#978cc7'}];
const roomTypes=Array.from({length:C.config.roomCount},(_,i)=>i%6);roomTypes[1]=0;roomTypes[2]=1;roomTypes[7]=4;roomTypes[10]=3;roomTypes[23]=3;
const roomModelTypes=roomTypes.map(type=>[5,3,0,2,5,7][type]);roomModelTypes[13]=1;roomModelTypes[19]=4;roomModelTypes[11]=6;roomModelTypes[22]=8;roomModelTypes[18]=9;
const buildingNames=roomTypes.map((type,i)=>`${typeNames[type]} ${String(i+1).padStart(2,'0')}`),rooms=roomTypes.map((type,i)=>({position:new T.Vector3(...C.slots[C.initial.indexOf(i)]),rotation:new T.Euler(0,0,0,'YXZ'),userData:{index:i,type,height:78}}));
function astronaut(parent,x,y,z,small=false){const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(small?2.05:2.35);parent.add(g);cyl(g,1.1,3.5,0,4.1,0,mats.suit,10);sphere(g,1.2,0,6.6,0,mats.suit);box(g,1.8,1,.75,0,6.7,1,mats.glassDark);for(const dx of [-.65,.65])tube(g,[dx,3,0],[dx,0,0],.43,mats.suit);tube(g,[-1,5.2,0],[-1.7,3,.3],.43,mats.suit);tube(g,[1,5.2,0],[1.7,3,0],.43,mats.suit);box(g,1.8,2.6,1.1,0,4,-1.1,mats.gold);return g;}
const moduleBatches=[],pickMeshes=[];
// Share identical parts across room functions as well as within each function.
// Compare full attributes; geometry and material appearance remain identical.
const sharedParts=[];
function sameGeometry(a,b){return ['position','normal','uv'].every(key=>{const x=a.getAttribute(key)?.array,y=b.getAttribute(key)?.array;if(!x||!y)return x===y;if(x.length!==y.length)return false;for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;return true;});}
for(let profile=0;profile<moduleProfiles().length;profile++){const ids=roomModelTypes.flatMap((t,i)=>t===profile?[i]:[]);if(!ids.length)continue;for(const part of moduleParts(roomTypes[ids[0]],profile)){part.geometry.scale(moduleScaleXZ,1,moduleScaleXZ);part.geometry.computeBoundingSphere();const layer=part.userData.layer||'body',match=sharedParts.find(p=>p.part.material===part.material&&p.layer===layer&&sameGeometry(p.part.geometry,part.geometry));if(match){match.ids.push(...ids);part.geometry.dispose();}else sharedParts.push({part,ids:ids.slice(),layer});}}
for(const {part,ids,layer} of sharedParts){const inst=new T.InstancedMesh(part.geometry,part.material,ids.length);inst.instanceMatrix.setUsage(T.DynamicDrawUsage);inst.castShadow=part.castShadow;inst.receiveShadow=true;inst.renderOrder=part.material===mats.glass?2:0;inst.frustumCulled=true;inst.userData.roomIds=ids;station.add(inst);moduleBatches.push({mesh:inst,ids,layer});pickMeshes.push(inst);}
// All 24 identities share one atlas, one geometry and one instanced draw.
// The same room number follows its room through every transfer.
const roomAtlas=texture(2048,512,(ctx,w,h)=>{const cw=w/6,ch=h/4;roomTypes.forEach((type,id)=>{const x=(id%6)*cw,y=Math.floor(id/6)*ch,profile=moduleProfiles()[roomModelTypes[id]];ctx.fillStyle='#cbd0ce';ctx.fillRect(x,y,cw,ch);ctx.fillStyle=profile.color;ctx.fillRect(x+12,y+9,30,6);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#282b2b';ctx.font='700 74px Novecento Wide Bold, Lunaris Display, Lunaris Serif';ctx.fillText('R'+String(id+1).padStart(2,'0'),x+cw/2,y+63);ctx.fillStyle=profile.color;ctx.font='700 24px Novecento Wide Bold, Lunaris Display, Lunaris Serif';ctx.fillText(profile.code,x+cw/2,y+108);});},null,true);
const badgePositions=[],badgeUVs=[];
function identityFace(w,h,position,rotation){const g=new T.PlaneGeometry(w,h).toNonIndexed(),m=new T.Matrix4().compose(new T.Vector3(...position),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(1,1,1));g.applyMatrix4(m);badgePositions.push(...g.attributes.position.array);badgeUVs.push(...g.attributes.uv.array);g.dispose();}
for(const sign of [-1,1]){identityFace(15,4.5,[-34,44,sign*(roomDepth/2-.08)],[0,sign<0?Math.PI:0,0]);identityFace(15,4.5,[sign*(roomWidth/2-.08),44,32],[0,sign*Math.PI/2,0]);}
identityFace(20,6,[-16,71.38,0],[-Math.PI/2,0,0]);
const badgeGeometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(badgePositions,3)).setAttribute('uv',new T.Float32BufferAttribute(badgeUVs,2));
badgeGeometry.setAttribute('identityTile',new T.InstancedBufferAttribute(new Float32Array(roomTypes.flatMap((_,id)=>[id%6,3-Math.floor(id/6)])),2));
const badgeMaterial=new T.ShaderMaterial({toneMapped:false,uniforms:{atlas:{value:roomAtlas}},vertexShader:'attribute vec2 identityTile;varying vec2 labelUV;void main(){labelUV=(uv+identityTile)/vec2(6.,4.);gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D atlas;varying vec2 labelUV;void main(){vec3 s=texture2D(atlas,labelUV).rgb;vec3 linearColor=mix(s/12.92,pow((s+.055)/1.055,vec3(2.4)),step(vec3(.04045),s));gl_FragColor=vec4(linearColor,1.);}'});
const roomBadges=new T.InstancedMesh(badgeGeometry,badgeMaterial,C.config.roomCount),badgeIds=roomTypes.map((_,id)=>id);roomBadges.name='persistent-room-identities';roomBadges.userData.roomIds=badgeIds;roomBadges.instanceMatrix.setUsage(T.DynamicDrawUsage);roomBadges.castShadow=false;station.add(roomBadges);moduleBatches.push({mesh:roomBadges,ids:badgeIds,layer:'skin'});pickMeshes.push(roomBadges);
const selectionFrame=new T.Group();station.add(selectionFrame);for(const x of [-roomWidth/2-2,roomWidth/2+2])for(const z of [-roomDepth/2-2,roomDepth/2+2]){line(selectionFrame,[[x,1,z-Math.sign(z)*14],[x,1,z],[x-Math.sign(x)*14,1,z]],'#c4ede5');line(selectionFrame,[[x,3,z],[x,14,z]],'#c4ede5',.7);}
const activeLabel=document.createElement('div');activeLabel.className='building-label';stage.appendChild(activeLabel);
const infra=new T.Group();infra.name='rectangular-surface-facilities';scene.add(infra);
const pad={minX:bounds.minX-32,maxX:bounds.maxX+32,minZ:bounds.minZ-32,maxZ:bounds.maxZ+48},padShape=new T.Shape();
padShape.moveTo(pad.minX+12,pad.minZ);padShape.lineTo(pad.maxX-12,pad.minZ);padShape.lineTo(pad.maxX,pad.minZ+12);padShape.lineTo(pad.maxX,pad.maxZ-12);padShape.lineTo(pad.maxX-12,pad.maxZ);padShape.lineTo(pad.minX+12,pad.maxZ);padShape.lineTo(pad.minX,pad.maxZ-12);padShape.lineTo(pad.minX,pad.minZ+12);padShape.closePath();
const plinth=mesh(infra,new T.ExtrudeGeometry(padShape,{depth:8,bevelEnabled:true,bevelSize:1.5,bevelThickness:1,bevelSegments:2,steps:1}),mats.dark);plinth.rotation.x=-Math.PI/2;plinth.position.y=11;
const tile=48;for(let x=pad.minX+tile/2+6;x<pad.maxX-tile/2;x+=tile)for(let z=pad.minZ+tile/2+6;z<pad.maxZ-tile/2;z+=tile)box(infra,tile-.7,.5,tile-.7,x,12.25,z,mats.deck);
decal(infra,'L U N A R I S   /   C O M P A C T   H A B I T A T',170,9,-35,12.7,pad.maxZ-17,-Math.PI/2);
for(const x of [pad.minX+9,pad.maxX-9])box(infra,.7,.6,pad.maxZ-pad.minZ-30,x,12.7,(pad.minZ+pad.maxZ)/2,mats.cool);
box(infra,pad.maxX-pad.minX-35,.6,.7,(pad.minX+pad.maxX)/2,12.7,pad.maxZ-7,mats.warm);
function solar(x,z){const g=new T.Group();g.position.set(x,terrainY(x,z),z);infra.add(g);for(const dx of [-27,27]){cyl(g,1.5,21,dx,9,0,mats.silver);tube(g,[dx,0,-15],[dx,21,0],1.1,mats.dark);}const panels=new T.Group();panels.position.y=24;panels.rotation.x=-.32;g.add(panels);box(panels,91,1.5,54,0,0,0,mats.silver);box(panels,89,.5,52,0,1,0,mats.solar);for(const px of [-44,0,44])box(panels,.7,.5,51,px,1.4,0,mats.silver);}
for(const x of [pad.minX-185,pad.minX-75])for(const z of [-130,-50,30,110])solar(x,z);
for(const x of [pad.maxX+60,pad.maxX+95,pad.maxX+130]){const z=pad.minZ+20;cyl(infra,10,30,x,terrainY(x,z)+17,z,mats.pale);sphere(infra,10,x,terrainY(x,z)+32,z,mats.pale);cyl(infra,2,6,x,terrainY(x,z)+43,z,mats.gold);tube(infra,[x,0,z],[x,1,pad.minZ-20],1.3,mats.silver);}
const antenna=new T.Group();antenna.position.set(pad.maxX+100,terrainY(pad.maxX+100,pad.maxZ-20),pad.maxZ-20);infra.add(antenna);cyl(antenna,18,4,0,2,0,mats.dark);cyl(antenna,4,33,0,19,0,mats.pale);const tilt=new T.Group();tilt.position.y=40;tilt.rotation.z=-.42;tilt.rotation.x=.25;antenna.add(tilt);const dish=mesh(tilt,new T.SphereGeometry(25,32,18,0,Math.PI*2,0,.43*Math.PI),new T.MeshStandardMaterial({color:'#d1d2c8',metalness:.66,roughness:.39,side:T.DoubleSide}));dish.rotation.x=Math.PI;for(const a of [0,2.094,4.188])tube(tilt,[Math.cos(a)*23,-4,Math.sin(a)*23],[0,11,0],.55,mats.silver);sphere(tilt,1.8,0,11.5,0,mats.gold);
const ramp=box(infra,60,3,70,pad.minX+90,4,pad.maxZ+24,mats.deck);ramp.rotation.x=.16;
function rover(x,z,angle){const g=new T.Group();g.position.set(x,terrainY(x,z)+5,z);g.rotation.y=angle;infra.add(g);roundedBox(g,28,9,16,3,0,5,0,mats.hull);box(g,12,4,15,8,12,0,mats.hull);box(g,.7,3,12,14.2,12,0,mats.glassDark);box(g,23,1.1,14,-1,14.5,0,mats.solar);for(const dx of [-10,0,10])for(const dz of [-10,10]){const wheel=cyl(g,4.6,3.4,dx,1,dz,mats.rubber,16);wheel.rotation.x=Math.PI/2;const hub=cyl(g,2.5,3.5,dx,1,dz,mats.silver,12);hub.rotation.x=Math.PI/2;}tube(g,[10,14,0],[10,23,0],.5,mats.silver);box(g,4.5,3,3,10,23,0,mats.pale);box(g,.6,1.1,9,-14,6,0,mats.warm);}
rover(pad.minX+80,pad.maxZ+85,-.35);rover(pad.maxX-55,pad.maxZ+55,.4);
for(const [x,z]of [[pad.minX+85,pad.maxZ-22],[pad.minX+96,pad.maxZ-27],[68,pad.maxZ-22],[-68,pad.maxZ-22]])astronaut(infra,x,12.5,z);
for(const [x,z]of [[pad.minX+8,pad.maxZ-8],[pad.maxX-8,pad.maxZ-8],[pad.minX+8,pad.minZ+8],[pad.maxX-8,pad.minZ+8]]){cyl(infra,1,17,x,20,z,mats.silver);box(infra,5,2,4,x,30,z,mats.warm);}
const tracks=texture(128,512,ctx=>{ctx.fillStyle='#141a235a';for(let y=0;y<512;y+=11){ctx.fillRect(14,y,16,4);ctx.fillRect(96,y,16,4);}});
const track=mesh(infra,new T.PlaneGeometry(33,195),new T.MeshBasicMaterial({map:tracks,transparent:true,depthWrite:false,forceSinglePass:true}),pad.minX+80,-6.9,pad.maxZ+125);track.rotation.x=-Math.PI/2;track.rotation.z=-.1;bake(infra);
let routeGroup=new T.Group();station.add(routeGroup);
const obstruction=new T.Group();obstruction.name='closed-C-guide';station.add(obstruction);const closedNode=C.lift(1,'C'),closedSlot=C.slots[closedNode];
if(closedSlot){const closedMat=new T.MeshBasicMaterial({color:'#de9a69',transparent:true,opacity:.5,depthWrite:false});box(obstruction,roomWidth,1,roomDepth,closedSlot[0],closedSlot[1]-1,closedSlot[2],closedMat);}
obstruction.visible=false;
const ghostMaterial=new T.MeshBasicMaterial({color:'#97efd1',transparent:true,opacity:.15,depthWrite:false,wireframe:true});const previewGhost=mesh(station,new T.BoxGeometry(C.config.width,C.config.height,C.config.depth),ghostMaterial);previewGhost.visible=false;previewGhost.castShadow=false;
let walkGroup=new T.Group();station.add(walkGroup);let walkLineKey='';
function drawWalkPath(routes,key){if(walkLineKey===key)return;walkLineKey=key;walkGroup.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});station.remove(walkGroup);walkGroup=new T.Group();station.add(walkGroup);for(const route of routes||[]){if(route.points?.length>1){const pts=route.points.map(p=>[p[0],p[1]+3,p[2]]);const l=line(walkGroup,pts,'#99e4b4',.95);l.material.depthTest=false;l.renderOrder=9;}}}
function updateMechanism(st,visibleFloor=-1,cutaway=false){
 let changed=false;
 for(const shaft of C.shafts){
  const e=st.elevators?.[shaft.id]||{y:baseY,retracted:0},g=elevators[shaft.id],r=Math.max(0,Math.min(1,e.retracted||0)),axis=shaft.retractAxis;
  const shift=(axis===0?pitchX:pitchZ)/2*(shaft.retractSign||1)*r,scale=1-(1-C.config.foldedScale)*r;
  const x=shaft.x+(axis===0?shift:0),z=shaft.z+(axis===2?shift:0),visible=visibleFloor<0||Math.abs(e.y-(baseY+visibleFloor*pitchY))<pitchY*.52;
  if(g.position.x!==x||g.position.y!==e.y||g.position.z!==z||g.scale.getComponent(axis)!==scale||g.visible!==visible){g.position.set(x,e.y,z);g.scale.set(1,1,1);g.scale.setComponent(axis,scale);g.visible=visible;changed=true;}
  const rails=shaftVisuals[shaft.id],railVisible=visibleFloor<0||cutaway;
  if(rails.visible!==railVisible){rails.visible=railVisible;changed=true;}
 }
 for(const pallet of parkedPallets){
  const {node,level,shaft}=pallet.userData,occupant=st.layout[node],e=st.elevators?.[shaft];
  // The carriage takes over support before it unfolds beneath an occupied room.
  // Parked side supports return only once the carriage has cleared their envelope.
  const carriageTakesLoad=e&&Math.abs(e.y-C.slots[node][1])<4&&(e.retracted||0)<.98;
  const visible=occupant!==null&&occupant!==st.active&&!carriageTakesLoad&&(visibleFloor<0||visibleFloor===level);
  if(pallet.visible!==visible){pallet.visible=visible;changed=true;}
 }
 const closedVisible=$('block').checked&&(visibleFloor<0||visibleFloor===1);if(obstruction.visible!==closedVisible){obstruction.visible=closedVisible;changed=true;}
 if(changed)renderer.shadowMap.needsUpdate=true;return changed;
}
// Index exact duplicate vertices after merging. No positions, normals, UVs or
// triangles are simplified; this restores the GPU vertex cache and saves VRAM.
function indexExactGeometry(geo){
 if(geo.index||!geo.attributes.position)return;const keys=Object.keys(geo.attributes),attrs=keys.map(k=>geo.attributes[k]);if(attrs.some(a=>a.isInstancedBufferAttribute||!(a.array instanceof Float32Array)))return;
 const count=attrs[0].count,bits=attrs.map(a=>new Uint32Array(a.array.buffer,a.array.byteOffset,a.array.length)),heads=new Map(),next=[],source=[],indices=new Uint32Array(count);
 for(let i=0;i<count;i++){let hash=2166136261;for(let a=0;a<attrs.length;a++)for(let c=0;c<attrs[a].itemSize;c++)hash=Math.imul(hash^bits[a][i*attrs[a].itemSize+c],16777619);let found=-1;
  for(let j=heads.get(hash);j!==undefined&&j!==-1;j=next[j]){const original=source[j];let equal=true;for(let a=0;a<attrs.length&&equal;a++)for(let c=0;c<attrs[a].itemSize;c++)if(bits[a][i*attrs[a].itemSize+c]!==bits[a][original*attrs[a].itemSize+c]){equal=false;break;}if(equal){found=j;break;}}
  if(found<0){found=source.length;source.push(i);next.push(heads.get(hash)??-1);heads.set(hash,found);}indices[i]=found;
 }
 if(source.length===count)return;attrs.forEach((a,k)=>{const out=new Float32Array(source.length*a.itemSize);source.forEach((i,j)=>out.set(a.array.subarray(i*a.itemSize,(i+1)*a.itemSize),j*a.itemSize));geo.setAttribute(keys[k],new T.BufferAttribute(out,a.itemSize,a.normalized));});geo.setIndex(new T.BufferAttribute(source.length<65536?new Uint16Array(indices):indices,1));
}
const indexedGeometries=new Set();scene.traverse(o=>{if(o.isMesh&&!indexedGeometries.has(o.geometry)){indexExactGeometry(o.geometry);indexedGeometries.add(o.geometry);}});
let lastFloor=null,lastFrameOnly=null,lastSection=null,lastStudio=null,lastStudioDeck=null,lastCharacterDeck=null;const instanceState=rooms.map(()=>null),instanceTransforms=rooms.map(()=>({shown:new T.Matrix4(),hidden:new T.Matrix4()}));
function invalidateRoomInstances(){
 instanceState.fill(null);lastFloor=lastFrameOnly=lastSection=lastStudio=lastStudioDeck=lastCharacterDeck=null;
 renderer.shadowMap.needsUpdate=true;
}
// Read-only audit of the actual instance buffers, called by diagnostics/tests,
// never by the per-frame render path.
function inspectRoomInstances(){
 const roomInstances=rooms.map((r,id)=>({room:id+1,visible:!!r.userData.visible,shown:0,shells:0,interiors:0}));let invalidMatrices=0,boundsErrors=0;
 const matrix=new T.Matrix4(),center=new T.Vector3();
 for(const batch of moduleBatches){const data=batch.mesh.instanceMatrix.array,bound=batch.mesh.boundingSphere,local=batch.mesh.geometry.boundingSphere;
  batch.ids.forEach((id,j)=>{const offset=j*16;for(let k=0;k<16;k++)if(!Number.isFinite(data[offset+k]))invalidMatrices++;
   if(Math.abs(data[offset])+Math.abs(data[offset+5])+Math.abs(data[offset+10])<1e-8)return;
   const room=roomInstances[id];room.shown++;if(batch.layer==='skin'||batch.layer==='roof')room.shells++;if(batch.layer.startsWith('interior'))room.interiors++;
   if(local&&bound){matrix.fromArray(data,offset);center.copy(local.center).applyMatrix4(matrix);if(center.distanceTo(bound.center)+local.radius*matrix.getMaxScaleOnAxis()>bound.radius+.05)boundsErrors++;}
  });
 }
 return {roomInstances,invalidMatrices,boundsErrors};
}
function updateInstances(positions,visibleFloor,frameOnly,orientations=null,sectionRoom=-1,studioRoom=-1,studioDeck='exterior'){
 const characterDeck=fengPeng?.state.follow?(fengPeng.state.position[1]<39?'lower':'upper'):null;
 const filterChanged=characterDeck!==lastCharacterDeck||visibleFloor!==lastFloor||frameOnly!==lastFrameOnly||sectionRoom!==lastSection||studioRoom!==lastStudio||studioDeck!==lastStudioDeck,changed=new Set();
 rooms.forEach((room,i)=>{const p=positions[i],o=orientations?.[i]||[0,0,0],visible=(studioRoom>=0?i===studioRoom:visibleFloor<0||Math.abs((p[1]-C.config.baseY)/C.config.pitchY-visibleFloor)<.52)&&!frameOnly;
  const prev=instanceState[i];if(filterChanged||!prev||p.some((v,k)=>v!==prev[k])||o.some((v,k)=>v!==prev[k+3])){room.position.fromArray(p);room.rotation.set(...o,'YXZ');room.userData.visible=visible;instanceState[i]=[...p,...o];changed.add(i);
   // Compose the room pose once, then reuse it across its material batches.
   dummy.position.copy(room.position);dummy.rotation.copy(room.rotation);dummy.scale.setScalar(1);dummy.updateMatrix();instanceTransforms[i].shown.copy(dummy.matrix);instanceTransforms[i].hidden.makeScale(0,0,0).setPosition(room.position);
  }
 });
 if(!changed.size)return false;
 for(const batch of moduleBatches){let first=Infinity,last=-1;batch.ids.forEach((id,j)=>{if(!changed.has(id))return;const room=rooms[id],shell=batch.layer==='skin'||batch.layer==='roof',section=shell&&id===sectionRoom;let show=room.userData.visible&&!section;
  if(characterDeck&&id===sectionRoom&&batch.layer===(characterDeck==='lower'?'interior-upper':'interior-lower'))show=false;
  if(studioRoom>=0&&studioDeck!=='exterior'){if(shell)show=false;if(batch.layer==='interior-upper'&&studioDeck==='lower')show=false;if(batch.layer==='interior-lower'&&studioDeck==='upper')show=false;}
  batch.mesh.setMatrixAt(j,instanceTransforms[id][show?'shown':'hidden']);first=Math.min(first,j*16);last=Math.max(last,(j+1)*16);
 });if(last>=0){const buffer=batch.mesh.instanceMatrix;
   // Include pending writes from culled batches; the renderer clears ranges
   // only after uploading. One contiguous span avoids tiny driver calls.
   for(const range of buffer.updateRanges||[]){first=Math.min(first,range.start);last=Math.max(last,range.start+range.count);}
   buffer.clearUpdateRanges?.();buffer.addUpdateRange?.(first,last-first);buffer.needsUpdate=true;batch.mesh.computeBoundingSphere();
  }}
 if(filterChanged){frameLevels.forEach((g,i)=>g.visible=visibleFloor<0||i===visibleFloor);posts.visible=visibleFloor<0;foundations.visible=visibleFloor<0||visibleFloor===0;}
 lastCharacterDeck=characterDeck;lastFloor=visibleFloor;lastFrameOnly=frameOnly;lastSection=sectionRoom;lastStudio=studioRoom;lastStudioDeck=studioDeck;renderer.shadowMap.needsUpdate=true;return true;
}

// Four local ceiling sources illuminate actual equipment in the room viewer.
// Lights stay outside mesh baking and are reused when switching room identities.
const studioLights=Array.from({length:4},()=>{const light=new T.PointLight('#ffe6c3',0,112,2);light.visible=false;scene.add(light);return light;});
const studioGround=mesh(scene,new T.CircleGeometry(112,80),new T.MeshStandardMaterial({color:'#343e44',roughness:.84,metalness:.22}));studioGround.rotation.x=-Math.PI/2;studioGround.visible=false;studioGround.castShadow=false;
const studioHatches=new T.Group();scene.add(studioHatches);studioHatches.visible=false;
for(const [axis,sign]of [[0,1],[0,-1],[2,1],[2,-1]]){
 const face=new T.Group();studioHatches.add(face);face.position.set(axis===0?sign*45.7:0,26,axis===2?sign*41.7:0);face.rotation.y=axis===0?sign*Math.PI/2:sign<0?Math.PI:0;
 for(const x of [-3.6,3.6]){box(face,6.9,22.8,.7,x,0,-1,mats.pale);box(face,5.8,20,.25,x,0,-.5,moduleDesignMaterials().door);box(face,.5,5,.5,x-Math.sign(x)*1.8,-1,-.3,mats.silver);}
}
box(studioHatches,13.8,.5,13.8,24,76,-23,moduleDesignMaterials().door);studioHatches.scale.set(moduleScaleXZ,1,moduleScaleXZ);
let studioEnvironmentState=null;
function updateStudioEnvironment(roomId=-1,deck='exterior'){
 const active=roomId>=0,hiddenObjects=[terrain,rocks,stars,infra,foundations,posts,...frameLevels,...Object.values(elevators),...Object.values(shaftVisuals),...parkedPallets,routeGroup,selectionFrame,obstruction,previewGhost];
 const links=connectivityCache(),traffic=trafficVisualCache();if(links?.group)hiddenObjects.push(links.group);if(traffic?.group)hiddenObjects.push(traffic.group);
 if(active&&!studioEnvironmentState){studioEnvironmentState={background:scene.background,visibility:hiddenObjects.map(o=>[o,o.visible])};scene.background=new T.Color('#141c23');}
 if(active){
  hiddenObjects.forEach(o=>o.visible=false);
  const room=rooms[roomId],warm=roomModelTypes[roomId]===0;
  studioGround.visible=true;studioGround.position.set(room.position.x,room.position.y+1,room.position.z);
  studioHatches.visible=deck==='exterior';studioHatches.position.copy(room.position);studioHatches.rotation.copy(room.rotation);
  studioLights.forEach((light,i)=>{const upper=i>1;light.position.set(room.position.x+(i%2?25:-25),room.position.y+(upper?65:36),room.position.z+8);light.color.set(warm?'#ffe4b9':'#e2f0ff');light.visible=!(deck==='lower'&&upper||deck==='upper'&&!upper);light.intensity=1750;});
 }else{
  if(studioEnvironmentState){scene.background=studioEnvironmentState.background;studioEnvironmentState.visibility.forEach(([o,v])=>o.visible=v);studioEnvironmentState=null;renderer.shadowMap.needsUpdate=true;}
  studioGround.visible=false;studioHatches.visible=false;studioLights.forEach(light=>{light.visible=false;light.intensity=0;});
 }
}
applyPhotographicSurfaces();

