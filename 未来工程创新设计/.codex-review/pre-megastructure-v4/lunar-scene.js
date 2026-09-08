(() => {
'use strict';
const T=THREE,C=LunarCore,$=id=>document.getElementById(id),stage=$('stage');
let renderer;
try{renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch(e){$('error').hidden=false;$('error').textContent='三维场景未能启动。请使用支持 WebGL 的 Chrome 或 Edge 打开此文件。';$('loading').hidden=true;$('play').disabled=true;return;}
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.setClearColor('#0b1014');stage.appendChild(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#0b1014');
const camera=new T.PerspectiveCamera(38,1,.7,14000);
const ambient=new T.HemisphereLight('#c4dae7','#47413c',1.7);scene.add(ambient);
const sun=new T.DirectionalLight('#ffead1',3.7);sun.position.set(-420,620,380);sun.target.position.set(0,80,0);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-630,right:630,top:630,bottom:-630,near:40,far:1700});sun.shadow.normalBias=.3;sun.shadow.bias=-.00015;sun.shadow.radius=2;scene.add(sun,sun.target);
const rim=new T.DirectionalLight('#9cbed5',1.25);rim.position.set(430,230,-380);scene.add(rim);
// A locally generated reflection environment keeps the file entirely offline.
const envScene=new T.Scene();envScene.background=new T.Color('#2a333b');
function envPanel(w,h,x,y,z,color,intensity){const p=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(color).multiplyScalar(intensity),side:T.DoubleSide}));p.position.set(x,y,z);p.lookAt(0,0,0);envScene.add(p);}
envPanel(900,500,-400,550,250,'#fff0d4',3);envPanel(900,260,500,180,-280,'#a1c7e0',1.4);envPanel(800,800,0,-400,0,'#423b32',.6);
const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(envScene,.04);scene.environment=environment.texture;pmrem.dispose();envScene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
let seed=912;function rand(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
function canvasTexture(w,h,paint,repeat){const cv=document.createElement('canvas');cv.width=w;cv.height=h;paint(cv.getContext('2d'),w,h);const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(repeat){tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(...repeat);}return tex;}
const hullTexture=canvasTexture(512,512,(ctx,w,h)=>{
 ctx.fillStyle='#d2d0c6';ctx.fillRect(0,0,w,h);
 for(let i=0;i<20000;i++){const v=Math.floor(145+rand()*80);ctx.fillStyle=`rgba(${v},${v},${v},${.015+rand()*.045})`;ctx.fillRect(rand()*w,rand()*h,1+rand()*3,1+rand()*7);}
 ctx.strokeStyle='#888a8250';ctx.lineWidth=1;for(let x=0;x<=512;x+=128){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,512);ctx.stroke();}for(let y=0;y<=512;y+=128){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke();}
 for(let x=6;x<512;x+=128)for(let y=6;y<512;y+=128){ctx.fillStyle='#7a7d7970';ctx.fillRect(x,y,2,2);ctx.fillRect(x+115,y,2,2);}
});
const regolith=canvasTexture(512,512,(ctx,w,h)=>{
 const data=ctx.createImageData(w,h);for(let i=0;i<w*h;i++){const v=100+rand()*70;data.data.set([v*.98,v*.99,v,255],i*4);}ctx.putImageData(data,0,0);
 for(let i=0;i<1800;i++){const x=rand()*w,y=rand()*h,r=rand()*3+.2;ctx.fillStyle=rand()>.5?'#b8b8b815':'#08090a25';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
},[100,100]);
const solarTexture=canvasTexture(512,256,(ctx,w,h)=>{ctx.fillStyle='#162d42';ctx.fillRect(0,0,w,h);for(let x=0;x<w;x+=32)for(let y=0;y<h;y+=32){ctx.fillStyle=`rgb(${17+rand()*12},${41+rand()*15},${64+rand()*20})`;ctx.fillRect(x+1,y+1,30,30);ctx.strokeStyle='#62829388';ctx.strokeRect(x+1,y+1,30,30);ctx.fillStyle='#7095a44a';for(let q=4;q<30;q+=5)ctx.fillRect(x+q,y+2,.6,28);}});
const mats={
 hull:new T.MeshStandardMaterial({color:'#e5e1d4',map:hullTexture,roughness:.62,metalness:.28,envMapIntensity:.75}),
 pale:new T.MeshStandardMaterial({color:'#c6c9c4',roughness:.5,metalness:.4}),
 silver:new T.MeshStandardMaterial({color:'#8f9c9e',roughness:.36,metalness:.83}),
 dark:new T.MeshStandardMaterial({color:'#26333a',roughness:.64,metalness:.66}),
 deck:new T.MeshStandardMaterial({color:'#465158',roughness:.82,metalness:.36}),
 gold:new T.MeshStandardMaterial({color:'#b99a68',roughness:.4,metalness:.77}),
 glass:new T.MeshStandardMaterial({color:'#1b333a',roughness:.2,metalness:.78,emissive:'#739d9c',emissiveIntensity:.08,envMapIntensity:1.25}),
 warm:new T.MeshStandardMaterial({color:'#a99c78',emissive:'#ebbd73',emissiveIntensity:1.1,roughness:.34,metalness:.12}),
 cool:new T.MeshStandardMaterial({color:'#6f9999',emissive:'#70b4c1',emissiveIntensity:.55,roughness:.32,metalness:.3}),
 led:new T.MeshBasicMaterial({color:'#d9e8bd'}),
 solar:new T.MeshStandardMaterial({color:'#becddb',map:solarTexture,metalness:.7,roughness:.32}),
 rubber:new T.MeshStandardMaterial({color:'#101820',roughness:.93,metalness:.12}),
 insulation:new T.MeshStandardMaterial({color:'#be9b66',map:hullTexture,roughness:.52,metalness:.72})
};
function mesh(parent,geometry,mat,x=0,y=0,z=0){const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(parent,w,h,d,x,y,z,mat){return mesh(parent,new T.BoxGeometry(w,h,d),mat,x,y,z);}
function cyl(parent,r,h,x,y,z,mat,segments=16){return mesh(parent,new T.CylinderGeometry(r,r,h,segments),mat,x,y,z);}
function sphere(parent,r,x,y,z,mat){return mesh(parent,new T.SphereGeometry(r,24,16),mat,x,y,z);}
function tube(parent,a,b,r,mat){const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);const m=mesh(parent,new T.CylinderGeometry(r,r,delta.length(),8),mat);m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;}
function line(parent,pts,color='#accabf',opacity=1){const m=new T.Line(new T.BufferGeometry().setFromPoints(pts.map(p=>new T.Vector3(...p))),new T.LineBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false}));parent.add(m);return m;}
function decal(parent,text,w,h,x,y,z,rotation=0){const texture=canvasTexture(512,96,ctx=>{ctx.fillStyle='#aebcb7';ctx.font='500 34px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,48);});const m=mesh(parent,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:T.DoubleSide}),x,y,z);m.rotation.x=rotation;m.castShadow=false;return m;}
// Merge only rigid parts. Movable rooms are later drawn with instancing.
function bake(parent){parent.updateWorldMatrix(true,true);const inverse=parent.matrixWorld.clone().invert(),groups=new Map(),remove=[];
 parent.traverse(child=>{if(!child.isMesh||child.isInstancedMesh||Array.isArray(child.material))return;const geo=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();geo.applyMatrix4(inverse.clone().multiply(child.matrixWorld));let entry=groups.get(child.material);if(!entry){entry={position:[],normal:[],uv:[]};groups.set(child.material,entry);}for(const name of ['position','normal','uv']){const attr=geo.getAttribute(name);if(attr)for(const n of attr.array)entry[name].push(n);}geo.dispose();remove.push(child);});
 remove.forEach(m=>{m.parent.remove(m);m.geometry.dispose();});const out=[];for(const [mat,attrs] of groups){const geometry=new T.BufferGeometry();for(const name of ['position','normal','uv'])if(attrs[name].length)geometry.setAttribute(name,new T.Float32BufferAttribute(attrs[name],name==='uv'?2:3));geometry.computeBoundingSphere();const m=mesh(parent,geometry,mat);m.castShadow=!mat.transparent&&!mat.isMeshBasicMaterial;out.push(m);}return out;
}
function hash(x,z){const s=Math.sin(x*127.1+z*311.7)*43758.5453;return s-Math.floor(s);}
function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);return (hash(ix,iz)*(1-u)+hash(ix+1,iz)*u)*(1-v)+(hash(ix,iz+1)*(1-u)+hash(ix+1,iz+1)*u)*v;}
const craters=[[-690,210,165,54],[430,-680,200,66],[770,350,125,40],[-200,740,115,42],[-1150,-880,280,86],[1050,-1000,320,79],[-770,820,200,66]];
function terrainY(x,z){const margin=Math.min(1,Math.max(0,(Math.max(Math.abs((x-40)/375),Math.abs(z/245))-1)*2));let h=(noise(x*.005,z*.005)-.5)*30+(noise(x*.014,z*.014)-.5)*12+(noise(x*.055,z*.055)-.5)*3;for(const [cx,cz,r,d]of craters){const q=Math.hypot(x-cx,z-cz)/r;h-=d*Math.exp(-q*q*2.7);h+=d*.38*Math.exp(-Math.pow((q-.95)*5.8,2));}const horizon=Math.max(0,Math.hypot(x,z)-1200)/2200;h+=horizon*(80+120*noise(x*.002,z*.002));return -5+margin*h;}
const terrainGeo=new T.PlaneGeometry(9000,9000,300,300);terrainGeo.rotateX(-Math.PI/2);const tp=terrainGeo.attributes.position,colors=[];for(let i=0;i<tp.count;i++){const x=tp.getX(i),z=tp.getZ(i),y=terrainY(x,z);tp.setY(i,y);const shade=.46+(noise(x*.02,z*.02)-.5)*.09+Math.max(-.07,Math.min(.04,y*.0012));colors.push(shade*.96,shade*.97,shade);}terrainGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));terrainGeo.computeVertexNormals();const terrain=mesh(scene,terrainGeo,new T.MeshStandardMaterial({vertexColors:true,map:regolith,bumpMap:regolith,bumpScale:1.2,roughness:1,metalness:0}));terrain.castShadow=false;
const dummy=new T.Object3D();const rocks=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),new T.MeshStandardMaterial({color:'#5c6264',roughness:1}),1300);for(let i=0;i<1300;i++){let x,z;do{x=(rand()-.5)*3900;z=(rand()-.5)*3400;}while(x>-345&&x<425&&Math.abs(z)<250);const r=.7+Math.pow(rand(),3)*13;dummy.position.set(x,terrainY(x,z)+r*.2,z);dummy.rotation.set(rand()*3,rand()*3,rand()*3);dummy.scale.set(r,r*(.3+rand()*.6),r*.9);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}rocks.castShadow=true;rocks.receiveShadow=true;scene.add(rocks);
const starPositions=[];for(let i=0;i<950;i++){const a=rand()*Math.PI*2,h=.1+rand()*.8;starPositions.push(Math.sin(a)*Math.sqrt(1-h*h)*7000,h*7000,Math.cos(a)*Math.sqrt(1-h*h)*7000);}const stars=new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(starPositions,3)),new T.PointsMaterial({color:'#b0c1cf',size:1,sizeAttenuation:false,transparent:true,opacity:.42,depthWrite:false}));scene.add(stars);
const station=new T.Group();scene.add(station);const foundations=new T.Group();station.add(foundations);const floors=[];
for(const x of [-187,-98,0,98,187,291])for(const z of [-132,0,132]){if(x===291&&z!==0)continue;cyl(foundations,7.5,17,x,6,z,mats.dark);cyl(foundations,13,3,x,-2,z,mats.silver);box(foundations,19,3,19,x,15,z,mats.pale);}
box(foundations,407,7,283,0,17,0,mats.dark);box(foundations,103,7,94,246,17,0,mats.dark);
for(let level=0;level<3;level++){
 const floor=new T.Group();floor.position.y=C.config.baseY+level*96;station.add(floor);floors.push(floor);
 box(floor,394,5,279,0,-3.2,0,mats.deck);
 for(const z of [-137,137]){box(floor,405,5,3,0,-1,z,mats.pale);box(floor,400,.65,.6,0,1.7,z,mats.warm);box(floor,400,4,1,0,-7,z,mats.dark);}
 box(floor,3,5,274,-199,-1,0,mats.pale);
 for(const z of [-92,92])box(floor,3,5,90,199,-1,z,mats.pale);
 for(let row=0;row<3;row++)for(let col=0;col<4;col++){
   const x=(col-1.5)*98,z=(row-1)*90;box(floor,94,1,86,x,-.9,z,mats.silver);box(floor,89,.5,81,x,-.35,z,mats.dark);
   for(const dz of [-27,27])box(floor,96,.4,1,x,0,z+dz,mats.silver);
   for(const dx of [-28,28])box(floor,1,.4,86,x+dx,0,z,mats.silver);
 }
 for(const x of [-196,-98,0,98,196])box(floor,3,8,272,x,-8,0,mats.dark);
 for(const z of [-136,-45,45,136])box(floor,399,8,3,0,-8,z,mats.dark);
 // External transfer tracks meet an open shaft; there is no slab in the lift's sweep.
 for(const z of [-45.5,45.5])box(floor,100,5,3,246,-4,z,mats.silver);
 for(const x of [-201,201])for(const z of [-139,139]){box(floor,4,82,4,x,40,z,mats.pale);box(floor,1.5,78,1.5,x+(x<0?-2.2:2.2),40,z,mats.gold);}
 decal(floor,`L 0${level+1}  /  L U N A R I S`,95,5,118,-4,140);
 bake(floor);
}
bake(foundations);
const tower=new T.Group();station.add(tower);
for(const x of [197,293])for(const z of [-47,47]){box(tower,5,303,5,x,161,z,mats.pale);box(tower,1.2,290,1.2,x+1.5,160,z+1.5,mats.gold);box(tower,.7,284,.7,x,159,z+(z>0?3:-3),mats.warm);}
for(const y of [17,117,213,309]){for(const z of [-49,49])box(tower,102,7,5,245,y,z,mats.dark);for(const x of [195,295])box(tower,5,7,99,x,y,0,mats.pale);}
for(const y of [25,121,217]){tube(tower,[296,y,-47],[296,y+86,47],1.05,mats.silver);tube(tower,[296,y,47],[296,y+86,-47],1.05,mats.silver);for(const z of [-47,47]){box(tower,12,9,8,297,y+39,z,mats.gold);}}
box(tower,108,5,105,245,314,0,mats.dark);box(tower,104,2,99,245,318,0,mats.solar);cyl(tower,2,17,293,328,47,mats.silver);sphere(tower,2.6,293,338,47,mats.warm);
decal(tower,'Y / VERTICAL TRANSFER',64,8,245,308,51);
bake(tower);
const elevator=new T.Group();station.add(elevator);box(elevator,91,4,83,245,-2,0,mats.gold);box(elevator,87,.8,79,245,-.3,0,mats.dark);for(const x of [198,292])box(elevator,1,1,74,x,1,0,mats.led);bake(elevator);
const parkedPallets=C.nodes.map((n,i)=>{if(!n.lift)return null;const g=new T.Group();g.position.set(245,C.slots[i][1],0);box(g,90,3,81,0,-2,0,mats.gold);station.add(g);return g;}).filter(Boolean);
const typeNames=['材料实验','生命科学','居住单元','能源控制','物资保障','通信测控'];
const typeCodes=['MAT / LAB','BIO / LAB','HABITAT','ENERGY','LOGISTICS','COMMS'];
const typeColors=['#87a8a6','#a7b29a','#bba987','#b39e75','#8d9da5','#8fadc1'];
const roomTypes=Array.from({length:36},(_,i)=>(i%12+Math.floor(i/12)*2)%6);
const buildingNames=roomTypes.map((type,i)=>`${typeNames[type]} ${String(i+1).padStart(2,'0')}`);
const rooms=roomTypes.map((type,i)=>({position:new T.Vector3(...C.slots[C.initial.indexOf(i)]),userData:{index:i,type,height:78}}));
function buildModule(type){
 const g=new T.Group(),accent=new T.MeshStandardMaterial({color:typeColors[type],metalness:.55,roughness:.47});
 box(g,92,3.5,84,0,2,0,mats.dark);box(g,87,1.8,79,0,4.5,0,mats.silver);
 const shape=new T.Shape();shape.moveTo(-43,0);shape.lineTo(43,0);shape.lineTo(43,57);shape.quadraticCurveTo(43,64,36,64);shape.lineTo(-36,64);shape.quadraticCurveTo(-43,64,-43,57);shape.closePath();
 const shell=mesh(g,new T.ExtrudeGeometry(shape,{depth:78,bevelEnabled:true,bevelSize:.7,bevelThickness:.7,bevelSegments:2,steps:1,curveSegments:8}),mats.hull,0,6,-39);
 for(const z of [-40.1,40.1]){
   box(g,84,2,1,0,9,z,accent);box(g,83,1.3,1,0,69,z,mats.pale);
   for(const y of [18,34,50]){
     box(g,79,10,1.2,0,y,z,mats.dark);box(g,76,8,.6,0,y,z+(z>0?.7:-.7),mats.glass);
     for(let x=-35;x<=35;x+=10){box(g,.9,10,1.4,x,y,z,mats.silver);if(((x+35)/10+Math.floor(y/16)+type)%5<2)box(g,6.5,5.2,.45,x+4.4,y,z+(z>0?1.1:-1.1),(type===2||type===4)?mats.warm:mats.cool);}
     box(g,79,1.1,2,0,y-5.9,z,mats.pale);
   }
   for(const x of [-42,-21,21,42])box(g,.65,53,1.1,x,37,z,mats.pale);
   box(g,48,3,.9,-10,61,z,accent);
 }
 for(const x of [-44,44]){
   for(const y of [18,34,50]){box(g,.9,10,63,x,y,-5,mats.dark);box(g,1.1,7.8,60,x+(x>0?.45:-.45),y,-5,mats.glass);for(const z of [-31,-17,-3,11,23]){box(g,1.7,10,.8,x,y,z,mats.silver);if((z+y+type)%3===0)box(g,1.25,4.8,9,x+(x>0?.4:-.4),y,z+5,type===2?mats.warm:mats.cool);}}
   box(g,1.1,14,11,x,14,30,mats.silver);box(g,1.4,11,8,x+(x>0?.5:-.5),14,30,mats.dark);box(g,1.6,2.2,5,x+(x>0?.6:-.6),17,30,mats.cool);
 }
 for(const x of [-36,36])for(const z of [-32,32]){box(g,8,4,7,x,6,z,mats.dark);cyl(g,1.1,2,x,70.8,z,mats.gold,8);}
 // Roof services remain inside the same verified 92 × 78 × 84 transport envelope.
 box(g,74,1.8,56,0,70.7,-3,mats.silver);box(g,71,1,53,0,72,-3,mats.dark);
 if(type===0||type===3){box(g,39,1.4,42,-12,74,-3,mats.solar);box(g,18,4,26,24,74,-4,mats.pale);for(let z=-15;z<10;z+=4)box(g,15,.8,1,24,76.6,z,mats.dark);}
 else if(type===1){box(g,50,3.8,37,-6,73.5,-3,mats.glass);for(const x of [-28,-17,-6,5,16])box(g,.7,4,38,x,73.7,-3,mats.silver);box(g,9,4,34,29,74,-3,accent);}
 else if(type===2){box(g,42,2,38,-14,74,-3,mats.solar);for(const z of [-16,4]){box(g,19,4,15,23,74,z,mats.pale);for(let x=17;x<=29;x+=3)box(g,.7,.5,12,x,76.4,z,mats.dark);}}
 else if(type===4){for(const x of [-22,0,22]){box(g,17,3,44,x,74,-3,mats.insulation);for(const z of [-21,-2,17])box(g,18,.8,1,x,76,z,mats.silver);}}
 else {box(g,35,1.8,44,-18,74,-3,mats.solar);for(const z of [-15,10]){const dish=mesh(g,new T.SphereGeometry(11,20,10,0,Math.PI*2,0,Math.PI*.42),mats.pale,22,74,z);dish.scale.y=.25;dish.rotation.z=.13;cyl(g,.45,4,22,76,z,mats.gold,8);}}
 for(const z of [-30,30]){tube(g,[-34,73,z],[34,73,z],.65,mats.silver);for(const x of [-33,0,33])box(g,1.3,3,2,x,72,z,mats.dark);}
 decal(g,typeCodes[type],28,3.5,-18,61,41.35);
 return bake(g);
}
const moduleBatches=[],pickMeshes=[];
for(let type=0;type<6;type++){
 const ids=roomTypes.flatMap((t,i)=>t===type?[i]:[]);
 for(const part of buildModule(type)){
   const inst=new T.InstancedMesh(part.geometry,part.material,ids.length);inst.instanceMatrix.setUsage(T.DynamicDrawUsage);inst.castShadow=part.castShadow;inst.receiveShadow=true;inst.frustumCulled=false;inst.userData.roomIds=ids;station.add(inst);moduleBatches.push({mesh:inst,ids});pickMeshes.push(inst);
 }
}
const contactTexture=canvasTexture(128,128,ctx=>{const gradient=ctx.createRadialGradient(64,64,15,64,64,63);gradient.addColorStop(0,'#000000bb');gradient.addColorStop(.68,'#00000060');gradient.addColorStop(1,'#00000000');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);});
const contacts=new T.InstancedMesh(new T.PlaneGeometry(101,93).rotateX(-Math.PI/2),new T.MeshBasicMaterial({map:contactTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),36);contacts.frustumCulled=false;station.add(contacts);
const selectionFrame=new T.Group();station.add(selectionFrame);for(const x of [-47,47])for(const z of [-43,43]){line(selectionFrame,[[x,1,z-Math.sign(z)*12],[x,1,z],[x-Math.sign(x)*12,1,z]],'#d8e6b5');line(selectionFrame,[[x,5,z],[x,15,z]],'#d8e6b5',.65);}
const activeLabel=document.createElement('div');activeLabel.className='building-label';stage.appendChild(activeLabel);
const infra=new T.Group();scene.add(infra);
function solar(x,z){const g=new T.Group();g.position.set(x,terrainY(x,z),z);infra.add(g);for(const dx of [-22,22]){cyl(g,1.5,16,dx,8,0,mats.silver);tube(g,[dx,0,-12],[dx,16,0],1,mats.dark);}const panels=new T.Group();panels.position.y=18;panels.rotation.x=-.3;g.add(panels);box(panels,77,1.4,43,0,0,0,mats.silver);box(panels,75,.5,41,0,1,0,mats.solar);for(const x of [-38,0,38])box(panels,.6,.7,42,x,1.1,0,mats.silver);}
for(const x of [-435,-342])for(const z of [-98,-38,22,82])solar(x,z);
const antenna=new T.Group();infra.add(antenna);antenna.position.set(395,terrainY(395,174),174);cyl(antenna,15,3,0,2,0,mats.dark);cyl(antenna,3,32,0,18,0,mats.silver);const tilt=new T.Group();tilt.position.y=37;tilt.rotation.z=-.35;tilt.rotation.x=.35;antenna.add(tilt);const dish=mesh(tilt,new T.SphereGeometry(20,32,16,0,Math.PI*2,0,Math.PI*.44),new T.MeshStandardMaterial({color:'#d3d5cc',metalness:.55,roughness:.46,side:T.DoubleSide}));dish.rotation.x=Math.PI;for(const a of [0,2.094,4.188])tube(tilt,[Math.cos(a)*18,-3,Math.sin(a)*18],[0,8,0],.5,mats.silver);sphere(tilt,1.6,0,9,0,mats.gold);
for(const x of [-60,-26,8]){cyl(infra,9,33,x,13,-187,mats.pale);sphere(infra,9,x,30,-187,mats.pale);box(infra,4,3,4,x,40,-187,mats.gold);tube(infra,[x,0,-187],[x,1,-155],1.1,mats.silver);}
const rover=new T.Group();infra.add(rover);rover.position.set(-175,terrainY(-175,213)+5,213);rover.rotation.y=-.35;box(rover,24,7,14,0,2,0,mats.gold);box(rover,13,6,13,6,7,0,mats.pale);box(rover,1,3,11,13,8,0,mats.glass);box(rover,18,1.2,12,-2,11,0,mats.solar);for(const x of [-9,0,9])for(const z of [-9,9]){const wheel=cyl(rover,4,3,x,-1,z,mats.rubber,16);wheel.rotation.x=Math.PI/2;const hub=cyl(rover,2.2,3.2,x,-1,z,mats.silver,12);hub.rotation.x=Math.PI/2;}tube(rover,[9,11,0],[9,19,0],.5,mats.silver);box(rover,4,2.6,3,9,19,0,mats.pale);
// Human-scale maintenance figures (the world-to-metre scale is 1 : 0.25).
for(const [x,z]of [[-112,171],[-121,180],[333,74]]){const g=new T.Group();g.position.set(x,terrainY(x,z),z);infra.add(g);cyl(g,1.1,3.6,0,4.2,0,mats.pale,10);sphere(g,1.25,0,6.8,0,mats.pale);box(g,1.7,1,.7,0,6.9,1,mats.glass);for(const dx of [-.65,.65])tube(g,[dx,3,0],[dx,0,0],.45,mats.pale);tube(g,[-1,5.3,0],[-1.5,2.7,0],.45,mats.pale);tube(g,[1,5.3,0],[1.5,3.2,.8],.45,mats.pale);box(g,1.8,2.7,1.2,0,4.2,-1.2,mats.gold);}
for(const x of [-218,315])for(const z of [-156,156]){cyl(infra,.8,17,x,4,z,mats.silver);box(infra,4,2,3,x,13,z,mats.warm);}
const ramp=box(infra,52,4,74,-107,8,178,mats.deck);ramp.rotation.x=.22;for(const x of [-134,-80]){tube(infra,[x,2,215],[x,18,141],.8,mats.silver);for(const z of [155,180,205])cyl(infra,.7,8,x,14-(z-155)*.19,z,mats.pale);}
// Wheel tracks and footings give contact and scale to the lunar surface.
const tracks=canvasTexture(256,512,ctx=>{ctx.fillStyle='#00000000';ctx.fillRect(0,0,256,512);ctx.fillStyle='#151b2150';for(let y=0;y<512;y+=14){ctx.fillRect(28,y,29,6);ctx.fillRect(190,y,29,6);}});
const track=mesh(infra,new T.PlaneGeometry(32,230),new T.MeshBasicMaterial({map:tracks,transparent:true,depthWrite:false}),-168,-3.7,334);track.rotation.x=-Math.PI/2;track.rotation.z=-.12;
bake(infra);
let routeGroup=new T.Group();station.add(routeGroup);
const obstruction=new T.Group();station.add(obstruction);box(obstruction,92,2,83,245,122,0,new T.MeshStandardMaterial({color:'#bc805e',emissive:'#7b371c',emissiveIntensity:.8,transparent:true,opacity:.4}));obstruction.visible=false;
// Filmic output with subtle luminance-only bloom, FXAA, and a restrained vignette.
const targetRT=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true});
const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
const postMat=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{tScene:{value:targetRT.texture},resolution:{value:new T.Vector2(1,1)},exposure:{value:1.1},bloom:{value:.1}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',fragmentShader:`
uniform sampler2D tScene;uniform vec2 resolution;uniform float exposure;uniform float bloom;varying vec2 vUv;
float luminance(vec3 c){return dot(c,vec3(.299,.587,.114));}
vec3 bright(vec2 uv){vec3 c=texture2D(tScene,uv).rgb;return c*max(0.0,luminance(c)-1.4)/(luminance(c)+.001);}
void main(){vec2 px=1.0/resolution;vec3 center=texture2D(tScene,vUv).rgb;vec3 a=texture2D(tScene,vUv+vec2(-1.0,-1.0)*px).rgb;vec3 b=texture2D(tScene,vUv+vec2(1.0,-1.0)*px).rgb;vec3 c=texture2D(tScene,vUv+vec2(-1.0,1.0)*px).rgb;vec3 d=texture2D(tScene,vUv+vec2(1.0,1.0)*px).rgb;
float l0=luminance(center),la=luminance(a),lb=luminance(b),lc=luminance(c),ld=luminance(d);vec2 dir=vec2(-((la+lb)-(lc+ld)),(la+lc)-(lb+ld));float reduce=max((la+lb+lc+ld)*.03125,.0078125);dir=clamp(dir/(min(abs(dir.x),abs(dir.y))+reduce),vec2(-6.0),vec2(6.0))*px;vec3 aa=(texture2D(tScene,vUv+dir*(-.16667)).rgb+texture2D(tScene,vUv+dir*.16667).rgb)*.5;float contrast=max(max(la,lb),max(lc,ld))-min(min(la,lb),min(lc,ld));vec3 col=mix(center,aa,smoothstep(.07,.3,contrast));
vec3 glow=bright(vUv+vec2(3.,0.)*px)+bright(vUv-vec2(3.,0.)*px)+bright(vUv+vec2(0.,3.)*px)+bright(vUv-vec2(0.,3.)*px);glow+=.6*(bright(vUv+vec2(8.,5.)*px)+bright(vUv-vec2(8.,5.)*px)+bright(vUv+vec2(-5.,8.)*px)+bright(vUv-vec2(-5.,8.)*px));col+=glow*bloom/6.4;
col*=exposure;col=clamp((col*(2.51*col+.03))/(col*(2.43*col+.59)+.14),0.,1.);vec2 q=(vUv-.5)*vec2(.8,1.);col*=1.-.18*dot(q,q);col=mix(col*12.92,1.055*pow(col,vec3(1./2.4))-.055,step(vec3(.0031308),col));gl_FragColor=vec4(col,1.);
}`});postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),postMat));
let highQuality=true;
function renderScene(){if(highQuality){renderer.setRenderTarget(targetRT);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);}else renderer.render(scene,camera);}
function updateInstances(positions,visibleFloor,spread){
 dummy.rotation.set(0,0,0);
 rooms.forEach((room,i)=>{room.position.fromArray(positions[i]);room.position.y+=spread*((positions[i][1]-24)/96)*45;room.userData.visible=visibleFloor<0||Math.abs((positions[i][1]-24)/96-visibleFloor)<.52;});
 for(const batch of moduleBatches){batch.ids.forEach((id,j)=>{dummy.position.copy(rooms[id].position);dummy.scale.setScalar(rooms[id].userData.visible?1:0);dummy.updateMatrix();batch.mesh.setMatrixAt(j,dummy.matrix);});batch.mesh.instanceMatrix.needsUpdate=true;}
 rooms.forEach((r,i)=>{dummy.position.copy(r.position);dummy.position.y+=.35;dummy.scale.setScalar(r.userData.visible?1:0);dummy.updateMatrix();contacts.setMatrixAt(i,dummy.matrix);});contacts.instanceMatrix.needsUpdate=true;
 floors.forEach((f,i)=>{f.visible=visibleFloor<0||i===visibleFloor;f.position.y=24+i*96+spread*i*45;});tower.visible=visibleFloor<0;foundations.visible=visibleFloor<0||visibleFloor===0;
}
