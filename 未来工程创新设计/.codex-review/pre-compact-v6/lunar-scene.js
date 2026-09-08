(() => {
'use strict';
const T=THREE,C=LunarCore,$=id=>document.getElementById(id),stage=$('stage');
let renderer;
try{renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch(e){$('error').hidden=false;$('error').textContent='三维场景未能启动，请使用支持 WebGL 的 Chrome 或 Edge。';$('loading').hidden=true;$('play').disabled=true;return;}
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;stage.appendChild(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#080e15');const camera=new T.PerspectiveCamera(35,1,1,14000);
const ambient=new T.HemisphereLight('#c5dbea','#38382e',.95);scene.add(ambient);
const sun=new T.DirectionalLight('#ffe3bd',3.6);sun.position.set(-520,760,450);sun.target.position.set(-40,230,0);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-780,right:780,top:780,bottom:-780,near:80,far:1900});sun.shadow.normalBias=.16;sun.shadow.bias=-.00007;sun.shadow.radius=3;scene.add(sun,sun.target);
const rim=new T.DirectionalLight('#9bbdd5',1.9);rim.position.set(400,420,-430);scene.add(rim);
const envScene=new T.Scene();envScene.background=new T.Color('#1e2935');
function envPanel(w,h,x,y,z,color,intensity){const p=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(color).multiplyScalar(intensity),side:T.DoubleSide}));p.position.set(x,y,z);p.lookAt(0,120,0);envScene.add(p);}
envPanel(1300,500,-500,650,350,'#fff2d9',3.5);envPanel(700,600,650,380,-320,'#91b8d5',1.8);envPanel(1600,500,0,180,-1100,'#b7d0e0',.6);envPanel(1800,1800,0,-500,0,'#514738',.45);
const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(envScene,.03);scene.environment=environment.texture;pmrem.dispose();envScene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
let seed=4217;function rand(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
function hash(x,z){const s=Math.sin(x*127.1+z*311.7)*43758.5453;return s-Math.floor(s);}
function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);return (hash(ix,iz)*(1-u)+hash(ix+1,iz)*u)*(1-v)+(hash(ix,iz+1)*(1-u)+hash(ix+1,iz+1)*u)*v;}
function texture(w,h,paint,repeat=null,data=false){const cv=document.createElement('canvas');cv.width=w;cv.height=h;paint(cv.getContext('2d'),w,h);const tex=new T.CanvasTexture(cv);if(!data)tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(repeat){tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(...repeat);}return tex;}
const alloyMap=texture(1024,512,(ctx,w,h)=>{ctx.fillStyle='#c5c5bb';ctx.fillRect(0,0,w,h);for(let i=0;i<44000;i++){const v=Math.floor(90+rand()*115);ctx.fillStyle=`rgba(${v},${v},${v},${.012+rand()*.045})`;ctx.fillRect(rand()*w,rand()*h,.5+rand()*18,.5);}ctx.strokeStyle='#686f7150';ctx.lineWidth=1;for(let x=0;x<w;x+=128){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0;y<h;y+=128){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}for(let x=7;x<w;x+=128)for(let y=7;y<h;y+=128){ctx.fillStyle='#657172';ctx.fillRect(x,y,2.5,2.5);ctx.fillRect(x+113,y,2.5,2.5);}});
const roughMap=texture(256,256,(ctx,w,h)=>{const d=ctx.createImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const v=130+noise(x*.1,y*.1)*65+rand()*15;d.data.set([v,v,v,255],(y*w+x)*4);}ctx.putImageData(d,0,0);},null,true);
const brushedMap=texture(512,256,(ctx,w,h)=>{ctx.fillStyle='#9b9c9f';ctx.fillRect(0,0,w,h);for(let y=0;y<h;y++){const v=Math.round(90+rand()*85);ctx.fillStyle=`rgba(${v},${v},${v},.35)`;ctx.fillRect(0,y,w,.5);}},[2,2],true);
const solarMap=texture(1024,512,(ctx,w,h)=>{ctx.fillStyle='#132940';ctx.fillRect(0,0,w,h);for(let x=0;x<w;x+=64)for(let y=0;y<h;y+=64){const v=rand();ctx.fillStyle=`rgb(${10+v*10},${30+v*12},${48+v*20})`;ctx.fillRect(x+2,y+2,60,60);ctx.strokeStyle='#69839188';ctx.strokeRect(x+2,y+2,60,60);for(let q=7;q<62;q+=8){ctx.fillStyle='#9daebb44';ctx.fillRect(x+q,y+3,.6,58);}}});
const soilMap=texture(1024,1024,(ctx,w,h)=>{const d=ctx.createImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const n=noise(x*.017,y*.017)*12+noise(x*.07,y*.07)*18+rand()*42,v=92+n;d.data.set([v*.99,v*.99,v,255],(y*w+x)*4);}ctx.putImageData(d,0,0);for(let i=0;i<2300;i++){const x=rand()*w,y=rand()*h,r=.4+rand()*4;ctx.fillStyle=rand()>.5?'#c5c9c422':'#161d2535';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}},[80,80]);
const soilBump=soilMap.clone();soilBump.colorSpace=T.NoColorSpace;soilBump.needsUpdate=true;
const mats={
 frame:new T.MeshStandardMaterial({color:'#c9c6b8',map:alloyMap,roughnessMap:roughMap,roughness:.64,metalness:.63,envMapIntensity:.75}),
 hull:new T.MeshStandardMaterial({color:'#e9e7df',map:alloyMap,roughnessMap:roughMap,roughness:.63,metalness:.27,envMapIntensity:.65}),
 silver:new T.MeshStandardMaterial({color:'#a9b9bd',roughnessMap:brushedMap,roughness:.46,metalness:.94,envMapIntensity:1.1}),
 pale:new T.MeshStandardMaterial({color:'#b5c1c2',roughness:.41,metalness:.6}),
 dark:new T.MeshStandardMaterial({color:'#192b36',roughness:.65,metalness:.72,envMapIntensity:.8}),
 deck:new T.MeshStandardMaterial({color:'#3a4a51',map:alloyMap,roughness:.81,metalness:.48}),
 gold:new T.MeshStandardMaterial({color:'#b99462',roughnessMap:roughMap,roughness:.47,metalness:.81}),
 glass:new T.MeshPhysicalMaterial({color:'#6d9eac',roughness:.13,metalness:.2,transparent:true,opacity:.29,depthWrite:false,forceSinglePass:true,clearcoat:1,clearcoatRoughness:.06,envMapIntensity:1.35,side:T.DoubleSide}),
 glassDark:new T.MeshPhysicalMaterial({color:'#193441',roughness:.17,metalness:.69,clearcoat:1,envMapIntensity:1.4}),
 warm:new T.MeshStandardMaterial({color:'#ceb894',emissive:'#efbb77',emissiveIntensity:1.45,roughness:.35}),
 cool:new T.MeshStandardMaterial({color:'#a3c9cb',emissive:'#75becf',emissiveIntensity:1.15,roughness:.28}),
 led:new T.MeshBasicMaterial({color:new T.Color('#c1eee9').multiplyScalar(1.7)}),
 solar:new T.MeshStandardMaterial({color:'#cedae0',map:solarMap,roughness:.33,metalness:.78,envMapIntensity:.9}),
 rubber:new T.MeshStandardMaterial({color:'#111c26',roughness:.97,metalness:.1}),
 insulation:new T.MeshStandardMaterial({color:'#b7a174',map:alloyMap,roughness:.56,metalness:.77}),
 interior:new T.MeshStandardMaterial({color:'#64737a',roughness:.85,metalness:.2,emissive:'#52605a',emissiveIntensity:.08}),
 innerWall:new T.MeshStandardMaterial({color:'#94a6a2',roughness:.84,emissive:'#cfb581',emissiveIntensity:.08}),
 plant:new T.MeshStandardMaterial({color:'#6d8062',roughness:.86})
};
function mesh(parent,geometry,mat,x=0,y=0,z=0){const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=!mat.transparent&&!mat.isMeshBasicMaterial;m.receiveShadow=true;parent.add(m);return m;}
function box(parent,w,h,d,x,y,z,mat){return mesh(parent,new T.BoxGeometry(w,h,d),mat,x,y,z);}
function cyl(parent,r,h,x,y,z,mat,segments=16){return mesh(parent,new T.CylinderGeometry(r,r,h,segments),mat,x,y,z);}
function sphere(parent,r,x,y,z,mat){return mesh(parent,new T.SphereGeometry(r,24,16),mat,x,y,z);}
function tube(parent,a,b,r,mat){const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start),m=mesh(parent,new T.CylinderGeometry(r,r,delta.length(),10),mat);m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;}
function line(parent,pts,color='#9cdbd5',opacity=1){const m=new T.Line(new T.BufferGeometry().setFromPoints(pts.map(p=>new T.Vector3(...p))),new T.LineBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false}));parent.add(m);return m;}
function decal(parent,text,w,h,x,y,z,rotation=0){
 const port=/^L([1-5])  \/  PORT (0[1-6])$/.exec(text),geometry=new T.PlaneGeometry(w,h);let material;
 if(port){
  const level=Number(port[1]),sector=Number(port[2])-1,atlases=decal.portAtlases||(decal.portAtlases=new Map());
  material=atlases.get(level);
  if(!material){
   // Six full-resolution 512 x 96 labels; shared per-level material lets bake merge their planes.
   const map=texture(512,96*6,ctx=>{ctx.fillStyle='#d1ded8';ctx.font='500 32px Arial';ctx.textAlign='center';ctx.textBaseline='middle';for(let i=0;i<6;i++)ctx.fillText(`L${level}  /  PORT ${String(i+1).padStart(2,'0')}`,256,48+i*96);});
   map.name=`port-label-atlas-L${level}`;map.userData.decalCellSize=[512,96];
   material=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,forceSinglePass:true,side:T.DoubleSide});material.name=`port-labels-L${level}`;atlases.set(level,material);
  }
  const uv=geometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setY(i,(5-sector+uv.getY(i))/6);uv.needsUpdate=true;
 }else{
  const map=texture(512,96,ctx=>{ctx.fillStyle='#d1ded8';ctx.font='500 32px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,48);});
  material=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,forceSinglePass:true,side:T.DoubleSide});
 }
 const m=mesh(parent,geometry,material,x,y,z);m.rotation.x=rotation;return m;
}
function roundedShape(w,h,r){r=Math.min(r,w/2,h/2);const s=new T.Shape(),x=-w/2;s.moveTo(x+r,0);s.lineTo(-x-r,0);s.quadraticCurveTo(-x,0,-x,r);s.lineTo(-x,h-r);s.quadraticCurveTo(-x,h,-x-r,h);s.lineTo(x+r,h);s.quadraticCurveTo(x,h,x,h-r);s.lineTo(x,r);s.quadraticCurveTo(x,0,x+r,0);return s;}
function roundedBox(parent,w,h,d,r,x,y,z,mat){const geo=new T.ExtrudeGeometry(roundedShape(w,h,r),{depth:d,bevelEnabled:false,curveSegments:8,steps:1});return mesh(parent,geo,mat,x,y-h/2,z-d/2);}
function bake(parent){parent.updateWorldMatrix(true,true);const inverse=parent.matrixWorld.clone().invert(),groups=new Map(),remove=[];parent.traverse(child=>{if(!child.isMesh||child.isInstancedMesh||Array.isArray(child.material))return;const geo=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();geo.applyMatrix4(inverse.clone().multiply(child.matrixWorld));let attrs=groups.get(child.material);if(!attrs){attrs={position:[],normal:[],uv:[]};groups.set(child.material,attrs);}for(const key of ['position','normal','uv']){const a=geo.getAttribute(key);if(a)for(const n of a.array)attrs[key].push(n);}geo.dispose();remove.push(child);});remove.forEach(m=>{m.parent.remove(m);m.geometry.dispose();});const out=[];for(const [mat,attrs] of groups){const geo=new T.BufferGeometry();for(const key of ['position','normal','uv'])if(attrs[key].length)geo.setAttribute(key,new T.Float32BufferAttribute(attrs[key],key==='uv'?2:3));geo.computeBoundingSphere();out.push(mesh(parent,geo,mat));}return out;}
const craters=[[-820,220,205,65],[570,-960,330,105],[920,480,205,60],[-390,780,130,37],[-1450,-980,360,88],[1340,-1550,490,139],[-1060,1290,300,78]];
function terrainY(x,z){const flatten=Math.min(1,Math.max(0,(Math.max(Math.abs((x+20)/405),Math.abs(z/290))-1)*1.6));let h=(noise(x*.003,z*.003)-.5)*48+(noise(x*.012,z*.012)-.5)*16+(noise(x*.054,z*.054)-.5)*4;for(const [cx,cz,r,d]of craters){const q=Math.hypot(x-cx,z-cz)/r;h-=d*Math.exp(-q*q*2.5);h+=d*.42*Math.exp(-Math.pow((q-.93)*5.4,2));}const far=Math.max(0,Math.hypot(x,z)-1250)/2300;h+=far*(80+170*noise(x*.0017,z*.0017));return -8+h*flatten;}
const terrainGeo=new T.PlaneGeometry(10500,10500,260,260);terrainGeo.rotateX(-Math.PI/2);const terrainPositions=terrainGeo.attributes.position,terrainColors=[];
for(let i=0;i<terrainPositions.count;i++){const x=terrainPositions.getX(i),z=terrainPositions.getZ(i),y=terrainY(x,z);terrainPositions.setY(i,y);const shade=.57+(noise(x*.009,z*.009)-.5)*.14+Math.max(-.08,Math.min(.04,y*.0008));terrainColors.push(shade*.92,shade*.96,shade);}terrainGeo.setAttribute('color',new T.Float32BufferAttribute(terrainColors,3));terrainGeo.computeVertexNormals();const terrain=mesh(scene,terrainGeo,new T.MeshStandardMaterial({vertexColors:true,map:soilMap,bumpMap:soilBump,bumpScale:1.35,roughness:1}));terrain.castShadow=false;
const dummy=new T.Object3D(),rocks=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),new T.MeshStandardMaterial({color:'#667077',roughness:.99}),1800);
for(let i=0;i<1800;i++){let x,z;do{x=(rand()-.5)*5400;z=(rand()-.5)*4600;}while(Math.abs(x+20)<410&&Math.abs(z)<295);const r=.5+Math.pow(rand(),3)*18;dummy.position.set(x,terrainY(x,z)+r*.22,z);dummy.rotation.set(rand()*3,rand()*3,rand()*3);dummy.scale.set(r,r*(.27+rand()*.55),r*.8);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}rocks.castShadow=true;rocks.receiveShadow=true;scene.add(rocks);
const starPositions=[];for(let i=0;i<1700;i++){const a=rand()*Math.PI*2,h=.045+rand()*.95;starPositions.push(Math.sin(a)*Math.sqrt(1-h*h)*8500,h*8500,Math.cos(a)*Math.sqrt(1-h*h)*8500);}const stars=new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(starPositions,3)),new T.PointsMaterial({color:'#b0c1d2',size:1.2,sizeAttenuation:false,transparent:true,opacity:.34,depthWrite:false}));scene.add(stars);
const station=new T.Group();station.name='lunar-autonomous-docking-port';scene.add(station);
const foundations=new T.Group(),posts=new T.Group(),frameLevels=Array.from({length:C.config.layers},()=>new T.Group());station.add(foundations,posts,...frameLevels);
const fixedBoxes=[];
function ring(parent,r,t,x,y,z,mat,rotationX=0){const m=mesh(parent,new T.TorusGeometry(r,t,8,64),mat,x,y,z);m.rotation.x=rotationX;return m;}
// A pressure core and radial cantilever berths carry landed modules; there is no transport cage.
const coreTop=C.config.baseY+(C.config.layers-1)*C.config.pitchY+86;
cyl(posts,73,coreTop-10,0,(coreTop+10)/2,0,mats.dark,48);cyl(posts,77,19,0,22,0,mats.frame,48);
for(let side=0;side<12;side++){
 const a=side*Math.PI/6,g=new T.Group();g.rotation.y=a;posts.add(g);
 box(g,28,coreTop-56,5,0,coreTop/2+12,74,mats.hull);box(g,19,coreTop-74,.8,0,coreTop/2+13,77,mats.pale);
 box(g,1.1,coreTop-80,1,13,coreTop/2+13,77.2,side%2?mats.cool:mats.gold);
 for(let y=63;y<coreTop-20;y+=29){box(g,14,.7,.5,-2,y,77.9,mats.dark);box(g,2,3,.8,9,y,78,mats.cool);}
}
for(let level=0;level<C.config.layers;level++){
 const g=frameLevels[level],y=C.config.baseY+level*C.config.pitchY;
 cyl(g,84,8,0,y-8,0,mats.silver,48);cyl(g,82,3,0,y-3,0,mats.gold,48);
 ring(g,96,10,0,y+24,0,mats.dark,Math.PI/2);ring(g,98,1.8,0,y+33,0,mats.frame,Math.PI/2);
 ring(g,103,.7,0,y+25,0,mats.cool,Math.PI/2);ring(g,96,1,0,y+14,0,mats.gold,Math.PI/2);
 for(let a=0;a<12;a++){const rad=a*Math.PI/6;box(g,6,15,5,Math.sin(rad)*94,y+24,Math.cos(rad)*94,mats.frame);}
}
const portGroups=[],portIndicatorGeometry=new T.RingGeometry(48,49,64),portIndicatorMaterial=new T.MeshBasicMaterial({color:'#8ccac2',transparent:true,opacity:.18,side:T.DoubleSide,forceSinglePass:true,depthWrite:false});
const portIndicators=Array.from({length:C.config.layers},(_,level)=>{const indicator=new T.InstancedMesh(portIndicatorGeometry,portIndicatorMaterial,C.config.sectors);indicator.name=`port-indicators-L${level+1}`;indicator.userData.level=level;indicator.castShadow=false;indicator.receiveShadow=true;station.add(indicator);return indicator;});
for(const node of C.nodes){
 const [x,y,z]=C.slots[node.id],r=Math.hypot(x,z),g=new T.Group();g.position.set(x,y,z);g.rotation.y=node.yaw;frameLevels[node.level].add(g);portGroups.push(g);
 // Solid support stays below the moving room. Ribs terminate on the pressure core.
 roundedBox(g,109,8,103,12,0,-7,0,mats.dark);roundedBox(g,102,2,95,9,0,-2.8,0,mats.silver);
 box(g,92,.8,84,0,-1,0,mats.deck);for(const dx of [-48,48])box(g,1.5,.6,89,dx,-1.4,0,mats.cool);
 for(const dx of [-27,27]){tube(g,[dx,-14,27],[dx,-15,100-r],3,mats.frame);tube(g,[dx,-12,-23],[dx,-15,100-r],2,mats.dark);}
 const bridgeLength=r-112-43.5;
 const bridge=cyl(g,10.5,bridgeLength,0,26,-43.5-bridgeLength/2,mats.hull,20);bridge.rotation.x=Math.PI/2;
 for(let d=47;d<r-110;d+=18){ring(g,11,.75,0,26,-d,mats.silver);box(g,10,.6,4,0,36.7,-d,mats.cool);}
 ring(g,12.8,2,0,26,-44,mats.dark);ring(g,11.2,.7,0,26,-42.8,mats.gold);
 box(g,16,20,1.1,0,26,-43.2,mats.dark);box(g,.5,18,.8,0,26,-42.8,mats.cool);
 for(const dx of [-40,40])for(const dz of [-33,33]){box(g,7,1.2,6,dx,-.5,dz,mats.gold);cyl(g,.8,.7,dx,-.3,dz,mats.silver,8);}
 for(const dx of [-47,47])for(const dz of [-44,44])line(g,[[dx,-.2,dz-Math.sign(dz)*7],[dx,-.2,dz],[dx-Math.sign(dx)*7,-.2,dz]],'#91cac9',.75);
 decal(g,`L${node.level+1}  /  PORT ${String(node.sector+1).padStart(2,'0')}`,56,4,0,-7,52);
 bake(g);
 const indicator=portIndicators[node.level],indicatorMatrix=new T.Matrix4().makeRotationX(-Math.PI/2).setPosition(x,y-.3,z);indicator.setMatrixAt(node.sector,indicatorMatrix);indicator.instanceMatrix.needsUpdate=true;
}
// Upper plant, communications and radiators give the service core a recognizable silhouette.
cyl(posts,86,13,0,coreTop,0,mats.frame,48);cyl(posts,72,5,0,coreTop+9,0,mats.dark,48);ring(posts,78,1,0,coreTop+9,0,mats.cool,Math.PI/2);
const roofCap=sphere(posts,65,0,coreTop+13,0,mats.hull);roofCap.scale.y=.28;
for(let a=0;a<6;a++){const rad=a*Math.PI/3,g=new T.Group();g.rotation.y=rad;posts.add(g);box(g,21,56,4,0,coreTop+20,66,mats.dark);for(let y=coreTop-2;y<coreTop+48;y+=5)box(g,19,.7,4.6,0,y,66,mats.silver);}
cyl(posts,3,62,0,coreTop+45,0,mats.silver,16);sphere(posts,5,0,coreTop+78,0,mats.glassDark);ring(posts,16,.6,0,coreTop+70,0,mats.gold,Math.PI/2);
for(let a=0;a<6;a++){const rad=a*Math.PI/3,x=Math.sin(rad)*92,z=Math.cos(rad)*92;cyl(foundations,17,12,x,5,z,mats.frame,20);tube(foundations,[x,11,z],[Math.sin(rad)*61,52,Math.cos(rad)*61],7,mats.dark);}
bake(posts);bake(foundations);frameLevels.forEach(g=>bake(g));
const workLights=[];for(const [x,y,z,color,intensity]of [[-140,175,58,'#a7d9dc',1400],[125,350,35,'#a2cbd9',1600],[-40,506,-105,'#ffe0a2',900],[-70,42,150,'#ffd79e',700]]){const l=new T.PointLight(color,intensity,165,2);l.position.set(x,y,z);scene.add(l);workLights.push(l);}

const typeNames=['材料实验','生命科学','居住单元','能源设备','物资保障','通信测控'],typeCodes=['MATERIAL / LAB','BIO / SCIENCE','HAB / LIVING','ENERGY / CORE','SUPPLY / LOG','COMMS / ARRAY'];
const roomTypes=Array.from({length:C.config.roomCount},(_,i)=>i%6);roomTypes[1]=0;roomTypes[2]=1;roomTypes[7]=4;roomTypes[10]=3;roomTypes[23]=3;
const buildingNames=roomTypes.map((type,i)=>`${typeNames[type]} ${String(i+1).padStart(2,'0')}`),rooms=roomTypes.map((type,i)=>({position:new T.Vector3(...C.slots[C.initial.indexOf(i)]),rotation:new T.Euler(0,C.nodes[C.initial.indexOf(i)].yaw,0,'YXZ'),userData:{index:i,type,height:78}}));
function astronaut(parent,x,y,z,small=false){const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(small?2.05:2.35);parent.add(g);cyl(g,1.1,3.5,0,4.1,0,mats.hull,10);sphere(g,1.2,0,6.6,0,mats.hull);box(g,1.8,1,.75,0,6.7,1,mats.glassDark);for(const dx of [-.65,.65])tube(g,[dx,3,0],[dx,0,0],.43,mats.hull);tube(g,[-1,5.2,0],[-1.7,3,.3],.43,mats.hull);tube(g,[1,5.2,0],[1.7,3,0],.43,mats.hull);box(g,1.8,2.6,1.1,0,4,-1.1,mats.gold);return g;}
function moduleParts(type){
 const g=new T.Group(),interiorGroup=new T.Group(),skinGroup=new T.Group(),accent=new T.MeshStandardMaterial({color:['#668e91','#8c9d81','#bba67b','#b29162','#869da6','#7c9cac'][type],metalness:.58,roughness:.48});
 box(g,92,3,84,0,1.8,0,mats.dark);box(g,86,2,78,0,4.3,0,mats.silver);for(const x of [-35,35])for(const z of [-31,31]){box(g,9,4,9,x,6,z,mats.dark);box(g,6,.7,6,x,8.3,z,mats.gold);}
 g.add(interiorGroup,skinGroup);
 // A thick rounded pressure shell with open front glazing and readable interior depth.
 const outer=roundedShape(87,58,11),hole=roundedShape(77,45,8);const path=new T.Path(hole.getPoints(48).map(p=>new T.Vector2(p.x,p.y+6)));outer.holes.push(path);
 const shell=mesh(skinGroup,new T.ExtrudeGeometry(outer,{depth:75,bevelEnabled:true,bevelThickness:.6,bevelSize:.5,bevelSegments:2,curveSegments:10,steps:1}),mats.hull,0,9,-37.5);shell.userData.skin=true;
 const back=roundedBox(skinGroup,83,54,2,10,0,38,-37,mats.hull);back.userData.skin=true;roundedBox(skinGroup,75,42,.7,7,0,37.5,-35.6,mats.innerWall);
 // Front mullions, structural belt, gasket and external handling points.
 const gasket=roundedShape(80,47,8),opening=roundedShape(76.2,42.5,7);gasket.holes.push(new T.Path(opening.getPoints(32).map(p=>new T.Vector2(p.x,p.y+2.25))));mesh(skinGroup,new T.ExtrudeGeometry(gasket,{depth:1.4,bevelEnabled:false,curveSegments:10}),mats.rubber,0,14,38.3);
 roundedBox(skinGroup,76.2,42.5,1.1,7,0,37.5,40,mats.glass); // physical glass reveal
 for(const x of [-27,-9,9,27])box(skinGroup,.85,43,1.8,x,37.2,40.6,mats.silver);
 box(skinGroup,74,1.5,1.8,0,36.8,40.6,mats.silver);
 // Two occupied interior decks visible through glazing; back-light exposes actual objects.
 for(const y of [14,37]){box(interiorGroup,75,1.1,65,0,y,0,mats.interior);box(interiorGroup,64,.5,.6,0,y+18,-31,mats.warm);for(const x of [-26,0,26]){box(interiorGroup,13,.8,8,x,y+6,12,mats.pale);for(const dx of [-5,5])box(interiorGroup,.7,5,5,x+dx,y+3.3,12,mats.dark);const monitor=box(interiorGroup,9,5,.7,x,y+9.2,9,mats.dark);box(interiorGroup,7.3,3.6,.8,x,y+9.4,9.5,type===2?mats.warm:mats.cool);box(interiorGroup,5,1.1,5,x,y+3,23,mats.dark);box(interiorGroup,5,5,1,x,y+5.1,25,mats.interior);}}
 for(const x of [-34,34]){box(interiorGroup,4,38,13,x,36,-23,mats.dark);for(let y=20;y<54;y+=5){box(interiorGroup,4.2,1.4,10,x,y,-23,mats.pale);box(interiorGroup,.5,.5,.7,x+(x<0?2.3:-2.3),y,-18,mats.cool);}}
 if(type===1){for(const x of [-22,0,22])for(const z of [-12,1]){box(interiorGroup,12,2,7,x,18,z,mats.pale);for(const dx of [-3,1,4])sphere(interiorGroup,1.8,x+dx,20,z,mats.plant);}}
 if(type===2){for(const x of [-19,19]){box(interiorGroup,18,3,22,x,18,-12,mats.pale);box(interiorGroup,14,2,19,x,20,-12,mats.warm);box(interiorGroup,2,16,24,x-10,24,-12,mats.interior);}}
 if(type===3||type===4){for(const x of [-21,0,21]){box(interiorGroup,13,22,16,x,25,-10,type===3?mats.gold:mats.pale);for(let y=18;y<34;y+=4)box(interiorGroup,12,1,.8,x,y,-1.5,mats.dark);}}
 astronaut(interiorGroup,type===1?-17:13,15,28,true);
 // Reinforcing ribs wrap the side walls and roof instead of resembling stacked storeys.
 for(const z of [-28,0,28]){const pts=roundedShape(89,60,12).getPoints(44).map(p=>new T.Vector3(p.x,p.y+8,z));const curve=new T.CatmullRomCurve3(pts,true);mesh(g,new T.TubeGeometry(curve,64,.48,6,true),mats.silver);}
 for(const x of [-43,43]){box(g,1,17,29,x,37,-3,accent);box(g,1.3,12,24,x+(x>0?.6:-.6),37,-3,mats.glassDark);for(const z of [-13,-3,7])box(g,1.7,12,.65,x,37,z,mats.silver);box(g,1.1,6,51,x,16,0,mats.dark);}
 for(const x of [-35,35]){roundedBox(g,9,20,4,3,x,35,38.7,mats.hull);box(g,3,9,1,x,36,41.1,accent);for(const y of [27,43])sphere(g,.6,x,y,41.3,mats.gold);}
 box(g,40,2.5,1.6,0,63,39.6,accent);box(g,58,.5,.5,0,12,41,mats.cool);
 // Roof machinery, thermal louvres, folded service connections and solar skins.
 roundedBox(g,71,3,57,3,0,69,-2,mats.dark);
 if(type===0||type===2){box(g,41,1.3,45,-12,71.5,-2,mats.solar);box(g,16,4.5,30,24,72.5,-2,mats.pale);for(let z=-13;z<12;z+=3)box(g,13,.6,.8,24,75,z,mats.dark);}
 else if(type===1){const dome=sphere(g,16,-10,69,-4,mats.glass);dome.scale.set(1,.45,1.15);for(const x of [-30,16,30])box(g,8,3,38,x,71,-3,mats.pale);}
 else if(type===3){for(const x of [-24,0,24]){box(g,17,4.2,45,x,72,-3,mats.insulation);for(const z of [-23,-8,7,18])box(g,18,.8,1,x,74.6,z,mats.silver);}}
 else if(type===4){box(g,48,4,40,-6,71.5,-3,mats.pale);for(const x of [-27,-13,1,15])box(g,1.1,.6,41,x,73.9,-3,mats.dark);box(g,10,4,37,29,71.5,-3,accent);}
 else{box(g,33,1.5,44,-20,71.5,-3,mats.solar);for(const z of [-16,12]){const dish=mesh(g,new T.SphereGeometry(11,24,12,0,Math.PI*2,0,Math.PI*.43),mats.pale,21,72,z);dish.scale.y=.3;cyl(g,.5,5,21,74,z,mats.gold,8);}}
 for(const x of [-29,29])tube(g,[x,71,-26],[x,71,25],.6,mats.silver);
 decal(g,typeCodes[type],33,3,-5,63.2,40.6);
 // Recessed landing engines, RCS blocks, rear pressure interface and service protection.
 for(const x of [-35,35])for(const z of [-29,29]){const bell=mesh(g,new T.CylinderGeometry(2.7,5.2,7,16,1,true),mats.dark,x,4.2,z);cyl(g,5.6,1.1,x,7.8,z,mats.silver,16);cyl(g,3.1,1,x,1.4,z,mats.cool,16);}
 for(const x of [-42,42])for(const z of [-25,25]){box(g,5.5,7,7,x,20,z,mats.dark);const nozzle=cyl(g,1.6,2.8,x+(x>0?2:-2),20,z,mats.silver,12);nozzle.rotation.z=Math.PI/2;}
 ring(g,10.2,1.8,0,26,-40,mats.silver);ring(g,8.9,.65,0,26,-41,mats.gold);box(g,12,16,.8,0,26,-41.5,mats.dark);box(g,.5,14,.6,0,26,-41.4,mats.cool);
 box(skinGroup,55,7,1.2,0,18,40.7,mats.hull);box(skinGroup,58,5,1.2,0,57.5,40.7,mats.hull);
 for(const x of [-31,31])for(const y of [17,58]){box(skinGroup,3,4,.8,x,y,41,mats.gold);}
 const inside=bake(interiorGroup);inside.forEach(m=>m.userData.layer='interior');g.remove(interiorGroup);
 const skin=bake(skinGroup);skin.forEach(m=>m.userData.layer='skin');g.remove(skinGroup);
 return [...bake(g),...skin,...inside];
}
const moduleBatches=[],pickMeshes=[];
// Share identical parts across room functions as well as within each function.
// Compare full attributes; geometry and material appearance remain identical.
const sharedParts=[];
function sameGeometry(a,b){return ['position','normal','uv'].every(key=>{const x=a.getAttribute(key)?.array,y=b.getAttribute(key)?.array;if(!x||!y)return x===y;if(x.length!==y.length)return false;for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;return true;});}
for(let type=0;type<6;type++){const ids=roomTypes.flatMap((t,i)=>t===type?[i]:[]);if(!ids.length)continue;for(const part of moduleParts(type)){const layer=part.userData.layer||'body',match=sharedParts.find(p=>p.part.material===part.material&&p.layer===layer&&sameGeometry(p.part.geometry,part.geometry));if(match){match.ids.push(...ids);part.geometry.dispose();}else sharedParts.push({part,ids:ids.slice(),layer});}}
for(const {part,ids,layer} of sharedParts){const inst=new T.InstancedMesh(part.geometry,part.material,ids.length);inst.instanceMatrix.setUsage(T.DynamicDrawUsage);inst.castShadow=part.castShadow;inst.receiveShadow=true;inst.frustumCulled=false;inst.userData.roomIds=ids;station.add(inst);moduleBatches.push({mesh:inst,ids,layer});pickMeshes.push(inst);}
const selectionFrame=new T.Group();station.add(selectionFrame);for(const x of [-48,48])for(const z of [-44,44]){line(selectionFrame,[[x,1,z-Math.sign(z)*14],[x,1,z],[x-Math.sign(x)*14,1,z]],'#c4ede5');line(selectionFrame,[[x,3,z],[x,14,z]],'#c4ede5',.7);}
const activeLabel=document.createElement('div');activeLabel.className='building-label';stage.appendChild(activeLabel);
const infra=new T.Group();scene.add(infra);
// Inhabited plinth and approach make the enormous structural scale understandable.
const padShape=new T.Shape();for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.sin(a)*360,z=Math.cos(a)*360;i?padShape.lineTo(x,z):padShape.moveTo(x,z);}padShape.closePath();
const plinth=mesh(infra,new T.ExtrudeGeometry(padShape,{depth:9,bevelEnabled:true,bevelSize:3,bevelThickness:2,bevelSegments:2,steps:1}),mats.dark);plinth.rotation.x=-Math.PI/2;plinth.position.y=3;
for(let x=-300;x<=300;x+=60)for(let z=-300;z<=300;z+=60)if(Math.hypot(x,z)<325)box(infra,59,.6,59,x,12.5,z,mats.deck);
ring(infra,342,1,0,14,0,mats.cool,Math.PI/2);ring(infra,350,.7,0,14,0,mats.gold,Math.PI/2);decal(infra,'L U N A R I S   /   S U R F A C E   P O R T',160,10,0,14,305,-Math.PI/2);
function solar(x,z){const g=new T.Group();g.position.set(x,terrainY(x,z),z);infra.add(g);for(const dx of [-27,27]){cyl(g,1.5,21,dx,9,0,mats.silver);tube(g,[dx,0,-15],[dx,21,0],1.1,mats.dark);}const panels=new T.Group();panels.position.y=24;panels.rotation.x=-.32;g.add(panels);box(panels,91,1.5,54,0,0,0,mats.silver);box(panels,89,.5,52,0,1,0,mats.solar);for(const x of [-44,0,44])box(panels,.7,.5,51,x,1.4,0,mats.silver);}
for(const x of [-750,-640])for(const z of [-145,-65,15,95])solar(x,z);
for(const x of [590,625,660]){const z=-162;cyl(infra,10,30,x,terrainY(x,z)+17,z,mats.pale);sphere(infra,10,x,terrainY(x,z)+32,z,mats.pale);cyl(infra,2,6,x,terrainY(x,z)+43,z,mats.gold);tube(infra,[x,0,z],[x,1,-223],1.3,mats.silver);}
const antenna=new T.Group();antenna.position.set(605,terrainY(605,330),330);infra.add(antenna);cyl(antenna,18,4,0,2,0,mats.dark);cyl(antenna,4,33,0,19,0,mats.pale);const tilt=new T.Group();tilt.position.y=40;tilt.rotation.z=-.42;tilt.rotation.x=.25;antenna.add(tilt);const dish=mesh(tilt,new T.SphereGeometry(25,32,18,0,Math.PI*2,0,.43*Math.PI),new T.MeshStandardMaterial({color:'#d1d2c8',metalness:.66,roughness:.39,side:T.DoubleSide}));dish.rotation.x=Math.PI;for(const a of [0,2.094,4.188])tube(tilt,[Math.cos(a)*23,-4,Math.sin(a)*23],[0,11,0],.55,mats.silver);sphere(tilt,1.8,0,11.5,0,mats.gold);
const ramp=box(infra,72,5,98,-185,4,248,mats.deck);ramp.rotation.x=.15;for(const x of [-222,-148]){tube(infra,[x,-3,298],[x,16,198],.7,mats.silver);for(const z of [207,245,283])cyl(infra,.6,9,x,12-(z-207)*.16,z,mats.pale);}
function rover(x,z,angle){const g=new T.Group();g.position.set(x,terrainY(x,z)+5,z);g.rotation.y=angle;infra.add(g);roundedBox(g,28,9,16,3,0,5,0,mats.hull);box(g,12,4,15,8,12,0,mats.hull);box(g,.7,3,12,14.2,12,0,mats.glassDark);box(g,23,1.1,14,-1,14.5,0,mats.solar);for(const x of [-10,0,10])for(const z of [-10,10]){const wheel=cyl(g,4.6,3.4,x,1,z,mats.rubber,16);wheel.rotation.x=Math.PI/2;const hub=cyl(g,2.5,3.5,x,1,z,mats.silver,12);hub.rotation.x=Math.PI/2;}tube(g,[10,14,0],[10,23,0],.5,mats.silver);box(g,4.5,3,3,10,23,0,mats.pale);box(g,.6,1.1,9,-14,6,0,mats.warm);}
rover(-239,324,-.35);rover(262,290,.4);for(const [x,z]of [[-181,207],[-175,196],[88,167],[-87,7]])astronaut(infra,x,13,z);
for(const [x,z]of [[-310,211],[310,203],[-341,-219],[341,-216]]){cyl(infra,1,17,x,20,z,mats.silver);box(infra,5,2,4,x,30,z,mats.warm);}
const tracks=texture(128,512,ctx=>{ctx.fillStyle='#141a235a';for(let y=0;y<512;y+=11){ctx.fillRect(14,y,16,4);ctx.fillRect(96,y,16,4);}});
const track=mesh(infra,new T.PlaneGeometry(33,245),new T.MeshBasicMaterial({map:tracks,transparent:true,depthWrite:false}),-244,-6.9,422);track.rotation.x=-Math.PI/2;track.rotation.z=-.1;bake(infra);
let routeGroup=new T.Group();station.add(routeGroup);const obstruction=new T.Group();station.add(obstruction);const closedSlot=C.slots[C.bay(4,2)];const stopRing=ring(obstruction,48,1.4,closedSlot[0],closedSlot[1]+1,closedSlot[2],new T.MeshBasicMaterial({color:'#de9a69',transparent:true,opacity:.7}),Math.PI/2);obstruction.visible=false;
// HDR scene + depth-based contact shading + half-resolution optical bloom + filmic output.
const targetRT=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true});targetRT.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
const brightRT=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false}),blurRT=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false}),bloomRT=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});
const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1),quad=new T.Mesh(new T.PlaneGeometry(2,2));postScene.add(quad);
const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const brightMat=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{tScene:{value:targetRT.texture}},vertexShader:vertex,fragmentShader:'uniform sampler2D tScene;varying vec2 vUv;void main(){vec3 c=texture2D(tScene,vUv).rgb;float b=max(c.r,max(c.g,c.b));float knee=clamp((b-.9)/1.4,0.,1.);gl_FragColor=vec4(c*knee*knee/(1.+b*.24),1.);}'});
const blurMat=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{tScene:{value:brightRT.texture},direction:{value:new T.Vector2(1,0)},resolution:{value:new T.Vector2(1,1)}},vertexShader:vertex,fragmentShader:'uniform sampler2D tScene;uniform vec2 direction;uniform vec2 resolution;varying vec2 vUv;void main(){vec2 d=direction/resolution;vec3 c=texture2D(tScene,vUv).rgb*.227027;c+=(texture2D(tScene,vUv+d*1.384615).rgb+texture2D(tScene,vUv-d*1.384615).rgb)*.316216;c+=(texture2D(tScene,vUv+d*3.230769).rgb+texture2D(tScene,vUv-d*3.230769).rgb)*.070270;gl_FragColor=vec4(c,1.);}'});
const postMat=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,extensions:{derivatives:true},uniforms:{tScene:{value:targetRT.texture},tDepth:{value:targetRT.depthTexture},tBloom:{value:bloomRT.texture},resolution:{value:new T.Vector2(1,1)},projectionInverse:{value:new T.Matrix4()},exposure:{value:1.02},bloom:{value:.16},ao:{value:.6}},vertexShader:vertex,fragmentShader:`
uniform sampler2D tScene;uniform sampler2D tDepth;uniform sampler2D tBloom;uniform vec2 resolution;uniform mat4 projectionInverse;uniform float exposure;uniform float bloom;uniform float ao;varying vec2 vUv;
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
vec3 positionAt(vec2 uv){float d=texture2D(tDepth,uv).r;vec4 p=projectionInverse*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
void main(){vec2 px=1./resolution;vec3 base=texture2D(tScene,vUv).rgb;float la=lum(texture2D(tScene,vUv+vec2(-1.,-1.)*px).rgb),lb=lum(texture2D(tScene,vUv+vec2(1.,-1.)*px).rgb),lc=lum(texture2D(tScene,vUv+vec2(-1.,1.)*px).rgb),ld=lum(texture2D(tScene,vUv+vec2(1.,1.)*px).rgb);vec2 dir=vec2(-((la+lb)-(lc+ld)),(la+lc)-(lb+ld));dir=clamp(dir/(min(abs(dir.x),abs(dir.y))+max((la+lb+lc+ld)*.03125,.0078)),vec2(-5.),vec2(5.))*px;vec3 aa=(texture2D(tScene,vUv+dir*.16667).rgb+texture2D(tScene,vUv-dir*.16667).rgb)*.5;float contrast=max(max(la,lb),max(lc,ld))-min(min(la,lb),min(lc,ld));vec3 col=mix(base,aa,smoothstep(.1,.45,contrast)*.75);
vec3 p=positionAt(vUv);vec3 n=normalize(cross(dFdx(p),dFdy(p)));float occlusion=0.;float radius=clamp(18.*resolution.y/max(1.,-p.z),2.,30.);for(int i=0;i<12;i++){float a=float(i)*2.399963;float r=(.3+.7*float(i+1)/12.);vec2 uv=clamp(vUv+vec2(cos(a),sin(a))*radius*r*px,px,1.-px);vec3 delta=positionAt(uv)-p;float len=length(delta);occlusion+=max(0.,dot(n,delta/max(len,.001))-.12)*(1.-smoothstep(3.,25.,len));}if(texture2D(tDepth,vUv).r<.99999)col*=1.-clamp(occlusion*ao/5.,0.,.38);
col+=texture2D(tBloom,vUv).rgb*bloom;col*=exposure;col=clamp((col*(2.51*col+.03))/(col*(2.43*col+.59)+.14),0.,1.);vec2 q=(vUv-.5)*vec2(.75,1.);col*=1.-.24*dot(q,q);col=mix(col*12.92,1.055*pow(col,vec3(1./2.4))-.055,step(vec3(.0031308),col));gl_FragColor=vec4(col,1.);}`});
let highQuality=true;
function renderScene(){if(renderer.info){renderer.info.autoReset=false;renderer.info.reset?.();}if(highQuality){renderer.setRenderTarget(targetRT);renderer.render(scene,camera);quad.material=brightMat;renderer.setRenderTarget(brightRT);renderer.render(postScene,postCamera);quad.material=blurMat;blurMat.uniforms.tScene.value=brightRT.texture;blurMat.uniforms.direction.value.set(1.5,0);renderer.setRenderTarget(blurRT);renderer.render(postScene,postCamera);blurMat.uniforms.tScene.value=blurRT.texture;blurMat.uniforms.direction.value.set(0,1.5);renderer.setRenderTarget(bloomRT);renderer.render(postScene,postCamera);quad.material=postMat;postMat.uniforms.projectionInverse.value.copy(camera.projectionMatrixInverse);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);}else renderer.render(scene,camera);}
function setLighting(mode){sun.color.set(mode==='day'?'#f5eee0':mode==='night'?'#98b6d0':'#ffe3bd');sun.intensity=mode==='night'?.24:mode==='day'?4.1:3.6;ambient.intensity=mode==='night'?.48:mode==='day'?1.25:.95;rim.intensity=mode==='night'?.65:1.9;mats.warm.emissiveIntensity=mode==='night'?2.6:1.45;mats.cool.emissiveIntensity=mode==='night'?2.2:1.15;mats.innerWall.emissiveIntensity=mode==='night'?.45:.08;mats.interior.emissiveIntensity=mode==='night'?.3:.08;stars.material.opacity=mode==='night'?.67:.34;workLights.forEach((l,i)=>l.intensity=[1400,1600,900,700][i]*(mode==='night'?1.3:.6));postMat.uniforms.bloom.value=mode==='night'?.24:.16;renderer.shadowMap.needsUpdate=true;}
const flightVisual=new T.Group();station.add(flightVisual);flightVisual.visible=false;
const flameMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false,uniforms:{power:{value:.5},time:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float power;uniform float time;void main(){float edge=pow(sin(vUv.x*3.14159),1.4);float shape=pow(vUv.y,.4)*(1.-smoothstep(.8,1.,vUv.y));float pulse=.87+.13*sin(vUv.y*35.-time*25.);vec3 c=mix(vec3(.08,.35,.72),vec3(.65,.93,1.35),pow(vUv.y,1.4));gl_FragColor=vec4(c*1.6,edge*shape*pulse*power*.65);}'});
const flames=[];for(const x of [-35,35])for(const z of [-29,29]){const f=mesh(flightVisual,new T.ConeGeometry(5,22,16,1,true),flameMaterial,x,-11,z);f.castShadow=false;flames.push(f);}
const rcsMaterial=new T.MeshBasicMaterial({color:'#a4deff',transparent:true,opacity:.4,blending:T.AdditiveBlending,depthWrite:false});const rcs=[];
for(const side of [-1,1]){const f=mesh(flightVisual,new T.ConeGeometry(2,15,12,1,true),rcsMaterial,side*52,20,-25);f.rotation.z=side*Math.PI/2;f.castShadow=false;rcs.push(f);}
const dustCount=160,dustGeometry=new T.BufferGeometry(),dustData=new Float32Array(dustCount*3);for(let i=0;i<dustCount;i++){dustData[i*3]=rand()*Math.PI*2;dustData[i*3+1]=rand();dustData[i*3+2]=rand();}dustGeometry.setAttribute('position',new T.BufferAttribute(dustData,3));
const dustMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},power:{value:0}},vertexShader:'uniform float time;uniform float power;varying float alpha;void main(){float age=fract(position.y+time*.65);float r=age*(26.+position.z*32.);vec3 p=vec3(sin(position.x)*r,max(0.,age*14.-age*age*14.),cos(position.x)*r);alpha=(1.-age)*power*.45;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(1300./-mv.z,1.,2.5);}',fragmentShader:'varying float alpha;void main(){gl_FragColor=vec4(.64,.67,.7,alpha);}'});const dust=new T.Points(dustGeometry,dustMaterial);station.add(dust);dust.visible=false;
const ghostMaterial=new T.MeshBasicMaterial({color:'#97efd1',transparent:true,opacity:.15,depthWrite:false,wireframe:true});const previewGhost=mesh(station,new T.BoxGeometry(C.config.width,C.config.height,C.config.depth),ghostMaterial);previewGhost.visible=false;previewGhost.castShadow=false;
let walkGroup=new T.Group();station.add(walkGroup);let walkLineKey='';
function drawWalkPath(routes,key){if(walkLineKey===key)return;walkLineKey=key;walkGroup.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});station.remove(walkGroup);walkGroup=new T.Group();station.add(walkGroup);for(const route of routes||[]){if(route.points?.length>1){const pts=route.points.map(p=>[p[0],p[1]+3,p[2]]);const l=line(walkGroup,pts,'#99e4b4',.95);l.material.depthTest=false;l.renderOrder=9;}}}
const captureVisual=new T.Group();station.add(captureVisual);captureVisual.visible=false;
const captureRing=ring(captureVisual,13.5,.8,0,26,-44,mats.cool);const captureArms=[];for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const arm=box(captureVisual,3,5,4,Math.cos(a)*16,26+Math.sin(a)*16,-42,mats.gold);arm.userData.angle=a;captureArms.push(arm);}
function updateFlightVisual(st,t){
 const flying=['depart','cruise','approach'].includes(st.type),id=st.active,p=id>=0?st.positions[id]:null;
 flightVisual.visible=Boolean(p&&flying);dust.visible=Boolean(p&&flying&&p[1]<80);
 if(p&&flying){flightVisual.position.fromArray(p);flightVisual.rotation.set(...st.orientations[id],'YXZ');const throttle=st.throttle||.4;flameMaterial.uniforms.power.value=throttle;flameMaterial.uniforms.time.value=t;
  for(const f of flames){const scale=.5+throttle*.8;f.scale.y=scale;f.position.y=-11*scale;}const accel=st.acceleration||[0,0,0];rcs.forEach((f,i)=>f.visible=Math.abs(accel[0])+Math.abs(accel[2])>.2&&(i===0?accel[0]>0:accel[0]<0));
  if(dust.visible){dust.position.set(p[0],13.5,p[2]);dustMaterial.uniforms.time.value=t;dustMaterial.uniforms.power.value=Math.max(0,1-(p[1]-34)/46)*throttle;}
 }
 const capture=p&&['softCapture','hardCapture','leakTest','equalize','connect','open','dock'].includes(st.type);captureVisual.visible=Boolean(capture);
 if(capture){const n=C.nodes[st.phase.to];captureVisual.position.fromArray(C.slots[n.id]);captureVisual.rotation.y=n.yaw;const close=st.connectionProgress??0;captureArms.forEach(a=>{a.position.x=Math.cos(a.userData.angle)*(16-close*3);a.position.y=26+Math.sin(a.userData.angle)*(16-close*3);});}
}
// Index exact duplicate vertices after merging. No positions, normals, UVs or
// triangles are simplified; this restores the GPU vertex cache and saves VRAM.
function indexExactGeometry(geo){
 if(geo.index||!geo.attributes.position)return;const keys=Object.keys(geo.attributes),attrs=keys.map(k=>geo.attributes[k]);if(attrs.some(a=>!(a.array instanceof Float32Array)))return;
 const count=attrs[0].count,bits=attrs.map(a=>new Uint32Array(a.array.buffer,a.array.byteOffset,a.array.length)),heads=new Map(),next=[],source=[],indices=new Uint32Array(count);
 for(let i=0;i<count;i++){let hash=2166136261;for(let a=0;a<attrs.length;a++)for(let c=0;c<attrs[a].itemSize;c++)hash=Math.imul(hash^bits[a][i*attrs[a].itemSize+c],16777619);let found=-1;
  for(let j=heads.get(hash);j!==undefined&&j!==-1;j=next[j]){const original=source[j];let equal=true;for(let a=0;a<attrs.length&&equal;a++)for(let c=0;c<attrs[a].itemSize;c++)if(bits[a][i*attrs[a].itemSize+c]!==bits[a][original*attrs[a].itemSize+c]){equal=false;break;}if(equal){found=j;break;}}
  if(found<0){found=source.length;source.push(i);next.push(heads.get(hash)??-1);heads.set(hash,found);}indices[i]=found;
 }
 if(source.length===count)return;attrs.forEach((a,k)=>{const out=new Float32Array(source.length*a.itemSize);source.forEach((i,j)=>out.set(a.array.subarray(i*a.itemSize,(i+1)*a.itemSize),j*a.itemSize));geo.setAttribute(keys[k],new T.BufferAttribute(out,a.itemSize,a.normalized));});geo.setIndex(new T.BufferAttribute(source.length<65536?new Uint16Array(indices):indices,1));
}
const indexedGeometries=new Set();scene.traverse(o=>{if(o.isMesh&&!indexedGeometries.has(o.geometry)){indexExactGeometry(o.geometry);indexedGeometries.add(o.geometry);}});
let lastFloor=null,lastFrameOnly=null,lastSection=null;const instanceState=rooms.map(()=>null);
function updateInstances(positions,visibleFloor,frameOnly,orientations=null,sectionRoom=-1){
 const filterChanged=visibleFloor!==lastFloor||frameOnly!==lastFrameOnly||sectionRoom!==lastSection,changed=new Set();
 rooms.forEach((room,i)=>{const p=positions[i],o=orientations?.[i]||[0,C.nodes[C.initial.indexOf(i)].yaw,0],visible=(visibleFloor<0||Math.abs((p[1]-C.config.baseY)/C.config.pitchY-visibleFloor)<.52)&&!frameOnly;
  const prev=instanceState[i];if(filterChanged||!prev||p.some((v,k)=>v!==prev[k])||o.some((v,k)=>v!==prev[k+3])){room.position.fromArray(p);room.rotation.set(...o,'YXZ');room.userData.visible=visible;instanceState[i]=[...p,...o];changed.add(i);}
 });
 if(!changed.size)return false;
 for(const batch of moduleBatches){let touched=false;batch.mesh.instanceMatrix.clearUpdateRanges?.();batch.ids.forEach((id,j)=>{if(!changed.has(id))return;const room=rooms[id],show=room.userData.visible&&!(batch.layer==='skin'&&id===sectionRoom);dummy.position.copy(room.position);dummy.rotation.copy(room.rotation);dummy.scale.setScalar(show?1:0);dummy.updateMatrix();batch.mesh.setMatrixAt(j,dummy.matrix);batch.mesh.instanceMatrix.addUpdateRange?.(j*16,16);touched=true;});if(touched)batch.mesh.instanceMatrix.needsUpdate=true;}
 if(filterChanged){frameLevels.forEach((g,i)=>g.visible=visibleFloor<0||i===visibleFloor);posts.visible=visibleFloor<0;foundations.visible=visibleFloor<0||visibleFloor===0;portIndicators.forEach(g=>g.visible=visibleFloor<0||g.userData.level===visibleFloor);}
 lastFloor=visibleFloor;lastFrameOnly=frameOnly;lastSection=sectionRoom;renderer.shadowMap.needsUpdate=true;return true;
}

