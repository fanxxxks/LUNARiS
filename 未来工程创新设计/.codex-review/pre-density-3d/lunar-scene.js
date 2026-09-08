(() => {
'use strict';
const T=THREE,C=LunarCore,$=id=>document.getElementById(id),stage=$('stage');
let renderer;
try{renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch(e){$('error').hidden=false;$('error').textContent='三维场景未能启动。请用支持 WebGL 的 Chrome 或 Edge 打开此文件。';$('play').disabled=true;return;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.setClearColor('#090e16');stage.appendChild(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#090e16');scene.fog=new T.FogExp2('#090e16',.00043);
const camera=new T.PerspectiveCamera(37,1,2,12000);
scene.add(new T.HemisphereLight('#c8d6e4','#232226',1.15));
const sun=new T.DirectionalLight('#fff1d7',3.7);sun.position.set(-700,640,-400);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-900,right:900,top:850,bottom:-850,near:10,far:2200});sun.shadow.bias=-.00015;sun.shadow.normalBias=.5;scene.add(sun);
const rim=new T.DirectionalLight('#85b5d5',1.0);rim.position.set(500,190,500);scene.add(rim);
const mats={white:new T.MeshStandardMaterial({color:'#deded9',roughness:.47,metalness:.32}),silver:new T.MeshStandardMaterial({color:'#8995a3',roughness:.34,metalness:.8}),dark:new T.MeshStandardMaterial({color:'#252c35',roughness:.65,metalness:.55}),deck:new T.MeshStandardMaterial({color:'#555e66',roughness:.88,metalness:.28}),gold:new T.MeshStandardMaterial({color:'#c7a66d',roughness:.42,metalness:.78}),glass:new T.MeshStandardMaterial({color:'#577684',metalness:.62,roughness:.16,emissive:'#9accc6',emissiveIntensity:.55}),warm:new T.MeshStandardMaterial({color:'#efdcb4',emissive:'#e7b97d',emissiveIntensity:1.8,roughness:.25}),blue:new T.MeshStandardMaterial({color:'#193045',metalness:.65,roughness:.32}),led:new T.MeshBasicMaterial({color:'#add6cc'})};
function box(parent,w,h,d,x,y,z,mat){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function cyl(parent,r,h,x,y,z,mat,segments=24){const m=new T.Mesh(new T.CylinderGeometry(r,r,h,segments),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function sphere(parent,r,x,y,z,mat){const m=new T.Mesh(new T.SphereGeometry(r,32,20),mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
function line(parent,pts,color='#718389',opacity=1){const m=new T.Line(new T.BufferGeometry().setFromPoints(pts.map(p=>new T.Vector3(...p))),new T.LineBasicMaterial({color,transparent:opacity<1,opacity}));parent.add(m);return m;}
function tube(parent,a,b,r,mat){const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start),m=new T.Mesh(new T.CylinderGeometry(r,r,delta.length(),8),mat);m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());m.castShadow=true;parent.add(m);return m;}
function decal(parent,text,w,h,x,y,z){const cv=document.createElement('canvas');cv.width=512;cv.height=128;const ctx=cv.getContext('2d');ctx.fillStyle='#ccd5d3';ctx.font='500 44px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64);const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);parent.add(m);return m;}
let seed=912;function rand(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
const craters=[[-760,170,185,57],[340,-770,210,69],[790,360,138,45],[-210,780,120,38],[-930,-650,250,82],[850,-950,290,70],[-670,700,155,35]];
function terrainY(x,z){const mask=Math.min(1,Math.max(0,(Math.max(Math.abs(x)/455,Math.abs(z)/355)-1)*2));let h=9*Math.sin(x*.009)*Math.cos(z*.012)+4*Math.sin(x*.031+z*.028)+2*Math.sin(x*.083-z*.062);for(const [cx,cz,r,d] of craters){const q=Math.hypot(x-cx,z-cz)/r;h+=-d*Math.exp(-q*q*2.1)+d*.36*Math.exp(-Math.pow((q-.94)*5,2));}return -8+mask*h;}
const terrainGeo=new T.PlaneGeometry(6000,6000,220,220);terrainGeo.rotateX(-Math.PI/2);const tp=terrainGeo.attributes.position,colors=[];for(let i=0;i<tp.count;i++){const x=tp.getX(i),z=tp.getZ(i),y=terrainY(x,z);tp.setY(i,y);const shade=.25+(rand()-.5)*.065+Math.max(-.06,Math.min(.08,y*.001)),c=new T.Color(shade*.94,shade*.97,shade);colors.push(c.r,c.g,c.b);}terrainGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));terrainGeo.computeVertexNormals();const terrain=new T.Mesh(terrainGeo,new T.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0}));terrain.receiveShadow=true;scene.add(terrain);
const rocks=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),new T.MeshStandardMaterial({color:'#5a5d62',roughness:1}),260);const dummy=new T.Object3D();for(let i=0;i<260;i++){let x,z;do{x=(rand()-.5)*3500;z=(rand()-.5)*2800;}while(Math.abs(x)<590&&Math.abs(z)<390);const size=3+Math.pow(rand(),3)*20;dummy.position.set(x,terrainY(x,z)+size*.3,z);dummy.rotation.set(rand()*3,rand()*3,rand()*3);dummy.scale.set(size,size*(.4+rand()*.5),size*.8);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}rocks.castShadow=true;rocks.receiveShadow=true;scene.add(rocks);
const starPositions=[];for(let i=0;i<700;i++){const theta=rand()*Math.PI*2,phi=rand()*1.3;starPositions.push(Math.sin(theta)*Math.cos(phi)*5000,Math.sin(phi)*5000,Math.cos(theta)*Math.cos(phi)*5000);}const stars=new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(starPositions,3)),new T.PointsMaterial({color:'#c5d6e4',size:1.4,sizeAttenuation:false,transparent:true,opacity:.5,fog:false}));scene.add(stars);
// Architectural platform: raised foundations, service cavity and segmented surface.
const station=new T.Group();scene.add(station);const deck=new T.Group();station.add(deck);const structural=new T.Group();station.add(structural);
for(const x of [-355,-180,0,180,355])for(const z of [-255,0,255]){cyl(structural,9,22,x,2,z,mats.dark);cyl(structural,15,3,x,-7,z,mats.silver);}
box(structural,800,5,600,0,8,0,mats.dark);box(deck,800,8,600,0,25,0,mats.deck);
const tileMat=new T.MeshStandardMaterial({color:'#636c73',roughness:.78,metalness:.38});for(let x=-360;x<=360;x+=80)for(let z=-262.5;z<=263;z+=75)box(deck,79.3,.7,74.3,x,29.5,z,tileMat);
for(const z of [-299,299]){box(deck,800,2,2,0,29,z,mats.silver);box(deck,790,.5,.6,0,30.5,z,mats.warm);}for(const x of [-399,399])box(deck,2,2,600,x,29,0,mats.silver);
const bayMat=new T.MeshStandardMaterial({color:'#939b9e',roughness:.85,metalness:.3});
C.slots.forEach(([x,y],i)=>{const px=x-400,pz=300-y;box(deck,78,.8,58,px,30,pz,bayMat);for(const sx of [-1,1])for(const sz of [-1,1]){line(deck,[[px+sx*39,31,pz+sz*18],[px+sx*39,31,pz+sz*29],[px+sx*26,31,pz+sz*29]],i===8?'#e2bc78':'#b0c4c4');}decal(deck,i===8?'W / TRANSFER':'P0'+(i+1),37,9,px,31,pz+41);});
decal(deck,'L U N A R I S     /     0 1',185,20,-160,31,265);
for(const z of [-180,0,180])line(deck,[[-320,30.7,z],[320,30.7,z]],'#b5c4c8',.21);
for(const x of [-320,-160,0,160,320])line(deck,[[x,30.7,-180],[x,30.7,180]],'#b5c4c8',.16);
// Shared drive becomes visible only in the cutaway view.
const mechanism=new T.Group();station.add(mechanism);for(const x of [-350,350])box(mechanism,7,5,540,x,14,0,mats.silver);
const bridge=new T.Group();mechanism.add(bridge);box(bridge,710,5,10,0,18,0,mats.silver);box(bridge,710,2,4,0,21,0,mats.dark);
const carriage=new T.Group();bridge.add(carriage);box(carriage,30,5,25,0,21,0,mats.gold);const magnet=cyl(carriage,10,3,0,25,0,mats.led);
for(const x of [-350,350])box(bridge,16,7,20,x,16,0,mats.dark);
const buildingNames=['材料实验舱','生命科学舱','居住舱 A','居住舱 B','能源控制舱','物资保障舱','工程维护舱','通信测控舱'];
const roomAccents=['#84aaa9','#91b8b0','#c6ad89','#c6ad89','#d4b56d','#a1a99b','#c88d70','#9caaca'];
const rooms=C.slots.slice(0,8).map(([x,y],i)=>{
 const g=new T.Group();station.add(g);g.position.set(x-400,32,300-y);g.userData.index=i;
 const accent=new T.MeshStandardMaterial({color:roomAccents[i],metalness:.58,roughness:.45});
 box(g,58,3,38,0,1.5,0,mats.dark);for(const px of [-22,22])for(const pz of [-13,13]){box(g,4,5,4,px,5,pz,mats.silver);box(g,7,1,7,px,3,pz,mats.dark);}
 // Rounded pressurised shell, with an arched roof rather than a toy block.
 const shape=new T.Shape();shape.moveTo(-26,0);shape.lineTo(26,0);shape.lineTo(26,14);shape.quadraticCurveTo(26,25,15,25);shape.lineTo(-15,25);shape.quadraticCurveTo(-26,25,-26,14);shape.closePath();
 const shell=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:32,bevelEnabled:true,bevelSize:1.1,bevelThickness:1,bevelSegments:3,steps:1,curveSegments:16}),mats.white);shell.position.set(0,8,-16);shell.castShadow=true;shell.receiveShadow=true;g.add(shell);
 for(const z of [-11,0,11]){const arch=new T.Shape();arch.moveTo(-27,8);arch.lineTo(-27,23);arch.quadraticCurveTo(-27,34,-15,34);arch.lineTo(15,34);arch.quadraticCurveTo(27,34,27,23);arch.lineTo(27,8);const pts=arch.getPoints(24).map(p=>new T.Vector3(p.x,p.y,z));const curve=new T.CatmullRomCurve3(pts);const rib=new T.Mesh(new T.TubeGeometry(curve,48,.45,5,false),mats.silver);g.add(rib);}
 for(const z of [-17.15,17.15]){
  box(g,47,1.3,.6,0,14,z,accent);
  for(const px of [-17,-8,8,17]){const frame=box(g,6,7,.9,px,23,z,mats.dark);const window=box(g,4.8,5.7,1,px,23,z+(z>0?.5:-.5),i===2||i===3?mats.warm:mats.glass);}
 }
 // Front airlock, recessed door and a three-step entrance, all inside the transport envelope.
 box(g,10,15,2,0,16,17.1,mats.silver);box(g,7.5,12,.7,0,15.5,18.3,mats.dark);box(g,5,2,.8,0,19.5,18.8,mats.glass);box(g,.6,5,.8,2,14,19,mats.gold);
 for(let k=0;k<3;k++)box(g,10,1.5,1.1,0,4+k*1.5,19-k,mats.silver);
 box(g,20,1.2,10,0,34.6,-2,accent);for(const px of [-7,-2,3,8])box(g,3,1.3,8,px,35,-2,mats.blue);
 for(const px of [-20,20]){box(g,3,1,8,px,32,-2,mats.silver);for(let k=0;k<5;k++)box(g,3,.3,.5,px,32.7,-5+k*1.4,mats.dark);}
 if(i===7){cyl(g,.6,13,15,39,0,mats.silver);const dish=new T.Mesh(new T.SphereGeometry(6,24,12,0,Math.PI*2,0,Math.PI*.4),new T.MeshStandardMaterial({color:'#d0d4d4',side:T.DoubleSide,metalness:.55,roughness:.4}));dish.rotation.z=.7;dish.position.set(15,46,0);g.add(dish);sphere(g,.7,15,48,0,mats.led);}
 if(i===1){const dome=sphere(g,7,-12,33,-2,mats.glass);dome.scale.y=.65;}
 if(i===6){box(g,10,6,9,17,8,-6,mats.gold);box(g,8,1,7,17,11.5,-6,mats.dark);}
 const marker=new T.Mesh(new T.RingGeometry(33,34,64),new T.MeshBasicMaterial({color:'#e5c49a',transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false}));marker.rotation.x=-Math.PI/2;marker.position.y=.8;marker.scale.y=.72;marker.visible=false;g.add(marker);g.userData.marker=marker;
 decal(g,'LNR / 0'+(i+1),22,5,0,36,9);
 const label=document.createElement('div');label.className='building-label';label.textContent=buildingNames[i];stage.appendChild(label);g.userData.label=label;
 return g;
});
// Solar field and stationary communications infrastructure outside the moving area.
function solar(x,z){const group=new T.Group();scene.add(group);group.position.set(x,terrainY(x,z),z);cyl(group,2,20,0,10,0,mats.silver);const panels=new T.Group();group.add(panels);panels.position.y=23;panels.rotation.z=-.23;box(panels,82,1.4,47,0,0,0,mats.silver);box(panels,80,.5,45,0,1,0,mats.blue);for(let ix=-36;ix<=36;ix+=9)box(panels,.3,.1,44,ix,1.4,0,mats.silver);for(let iz=-18;iz<=18;iz+=9)box(panels,80,.1,.3,0,1.4,iz,mats.silver);tube(group,[-23,0,0],[0,20,0],1.1,mats.dark);}
for(const x of [480,580])for(const z of [-210,-130,-50,30])solar(x,z);
const dishBase=new T.Group();scene.add(dishBase);dishBase.position.set(-495,terrainY(-495,-190),-190);cyl(dishBase,23,4,0,2,0,mats.dark);cyl(dishBase,7,40,0,22,0,mats.silver);const dishTilt=new T.Group();dishTilt.position.y=47;dishTilt.rotation.z=-.5;dishTilt.rotation.x=.3;dishBase.add(dishTilt);const dish=new T.Mesh(new T.SphereGeometry(29,40,20,0,Math.PI*2,0,.43*Math.PI),new T.MeshStandardMaterial({color:'#c7cdd0',metalness:.5,roughness:.45,side:T.DoubleSide}));dish.rotation.x=Math.PI;dishTilt.add(dish);for(const a of [0,2.094,4.188])tube(dishTilt,[Math.cos(a)*28,-6,Math.sin(a)*28],[0,10,0],.5,mats.silver);sphere(dishTilt,2,0,11,0,mats.gold);
// Scale cue: a compact six-wheel rover beside the platform.
const rover=new T.Group();scene.add(rover);rover.position.set(-390,terrainY(-390,390)+7,390);rover.rotation.y=.35;box(rover,24,8,15,0,2,0,mats.gold);box(rover,14,2,12,0,7,0,mats.white);for(const x of [-9,0,9])for(const z of [-10,10]){const w=cyl(rover,4,3,x,-1,z,mats.dark,12);w.rotation.x=Math.PI/2;}tube(rover,[6,7,0],[6,21,0],.6,mats.silver);box(rover,5,3,3,6,21,0,mats.white);box(rover,4,2,.3,6,21,1.6,mats.glass);
for(const [x,z] of [[-407,310],[407,310],[-407,-310],[407,-310]]){cyl(scene,.8,15,x,6,z,mats.silver);sphere(scene,1.6,x,14,z,mats.warm);}
const obstruction=new T.Group();station.add(obstruction);box(obstruction,80,1,60,0,32,0,new T.MeshStandardMaterial({color:'#c77d57',emissive:'#8a462b',emissiveIntensity:.4,transparent:true,opacity:.5}));for(let x=-32;x<=32;x+=16)line(obstruction,[[x-5,33,-26],[x+15,33,26]],'#e5a775');obstruction.visible=false;
let routeLine=null;
