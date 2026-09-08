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
 glass:new T.MeshPhysicalMaterial({color:'#6d9eac',roughness:.13,metalness:.2,transparent:true,opacity:.29,depthWrite:false,clearcoat:1,clearcoatRoughness:.06,envMapIntensity:1.35,side:T.DoubleSide}),
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
function decal(parent,text,w,h,x,y,z,rotation=0){const map=texture(512,96,ctx=>{ctx.fillStyle='#d1ded8';ctx.font='500 32px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,48);});const m=mesh(parent,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,side:T.DoubleSide}),x,y,z);m.rotation.x=rotation;return m;}
function roundedShape(w,h,r){const s=new T.Shape(),x=-w/2;s.moveTo(x+r,0);s.lineTo(-x-r,0);s.quadraticCurveTo(-x,0,-x,r);s.lineTo(-x,h-r);s.quadraticCurveTo(-x,h,-x-r,h);s.lineTo(x+r,h);s.quadraticCurveTo(x,h,x,h-r);s.lineTo(x,r);s.quadraticCurveTo(x,0,x+r,0);return s;}
function roundedBox(parent,w,h,d,r,x,y,z,mat){const geo=new T.ExtrudeGeometry(roundedShape(w,h,r),{depth:d,bevelEnabled:false,curveSegments:8,steps:1});return mesh(parent,geo,mat,x,y-h/2,z-d/2);}
function bake(parent){parent.updateWorldMatrix(true,true);const inverse=parent.matrixWorld.clone().invert(),groups=new Map(),remove=[];parent.traverse(child=>{if(!child.isMesh||child.isInstancedMesh||Array.isArray(child.material))return;const geo=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();geo.applyMatrix4(inverse.clone().multiply(child.matrixWorld));let attrs=groups.get(child.material);if(!attrs){attrs={position:[],normal:[],uv:[]};groups.set(child.material,attrs);}for(const key of ['position','normal','uv']){const a=geo.getAttribute(key);if(a)for(const n of a.array)attrs[key].push(n);}geo.dispose();remove.push(child);});remove.forEach(m=>{m.parent.remove(m);m.geometry.dispose();});const out=[];for(const [mat,attrs] of groups){const geo=new T.BufferGeometry();for(const key of ['position','normal','uv'])if(attrs[key].length)geo.setAttribute(key,new T.Float32BufferAttribute(attrs[key],key==='uv'?2:3));geo.computeBoundingSphere();out.push(mesh(parent,geo,mat));}return out;}
const craters=[[-820,220,205,65],[570,-960,330,105],[920,480,205,60],[-390,780,130,37],[-1450,-980,360,88],[1340,-1550,490,139],[-1060,1290,300,78]];
function terrainY(x,z){const flatten=Math.min(1,Math.max(0,(Math.max(Math.abs((x+20)/405),Math.abs(z/290))-1)*1.6));let h=(noise(x*.003,z*.003)-.5)*48+(noise(x*.012,z*.012)-.5)*16+(noise(x*.054,z*.054)-.5)*4;for(const [cx,cz,r,d]of craters){const q=Math.hypot(x-cx,z-cz)/r;h-=d*Math.exp(-q*q*2.5);h+=d*.42*Math.exp(-Math.pow((q-.93)*5.4,2));}const far=Math.max(0,Math.hypot(x,z)-1250)/2300;h+=far*(80+170*noise(x*.0017,z*.0017));return -8+h*flatten;}
const terrainGeo=new T.PlaneGeometry(10500,10500,260,260);terrainGeo.rotateX(-Math.PI/2);const terrainPositions=terrainGeo.attributes.position,terrainColors=[];
for(let i=0;i<terrainPositions.count;i++){const x=terrainPositions.getX(i),z=terrainPositions.getZ(i),y=terrainY(x,z);terrainPositions.setY(i,y);const shade=.57+(noise(x*.009,z*.009)-.5)*.14+Math.max(-.08,Math.min(.04,y*.0008));terrainColors.push(shade*.92,shade*.96,shade);}terrainGeo.setAttribute('color',new T.Float32BufferAttribute(terrainColors,3));terrainGeo.computeVertexNormals();const terrain=mesh(scene,terrainGeo,new T.MeshStandardMaterial({vertexColors:true,map:soilMap,bumpMap:soilBump,bumpScale:1.35,roughness:1}));terrain.castShadow=false;
const dummy=new T.Object3D(),rocks=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),new T.MeshStandardMaterial({color:'#667077',roughness:.99}),1800);
for(let i=0;i<1800;i++){let x,z;do{x=(rand()-.5)*5400;z=(rand()-.5)*4600;}while(Math.abs(x+20)<410&&Math.abs(z)<295);const r=.5+Math.pow(rand(),3)*18;dummy.position.set(x,terrainY(x,z)+r*.22,z);dummy.rotation.set(rand()*3,rand()*3,rand()*3);dummy.scale.set(r,r*(.27+rand()*.55),r*.8);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}rocks.castShadow=true;rocks.receiveShadow=true;scene.add(rocks);
const starPositions=[];for(let i=0;i<1700;i++){const a=rand()*Math.PI*2,h=.045+rand()*.95;starPositions.push(Math.sin(a)*Math.sqrt(1-h*h)*8500,h*8500,Math.cos(a)*Math.sqrt(1-h*h)*8500);}const stars=new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(starPositions,3)),new T.PointsMaterial({color:'#b0c1d2',size:1.2,sizeAttenuation:false,transparent:true,opacity:.34,depthWrite:false}));scene.add(stars);
const station=new T.Group();station.name='irregular-megastructure';scene.add(station);
const foundations=new T.Group(),posts=new T.Group(),frameLevels=Array.from({length:C.config.layers},()=>new T.Group());station.add(foundations,posts,...frameLevels);
const fixedBoxes=[];
function structuralBox(parent,w,h,d,x,y,z,mat=mats.frame){fixedBoxes.push({min:[x-w/2,y-h/2,z-d/2],max:[x+w/2,y+h/2,z+d/2]});return box(parent,w,h,d,x,y,z,mat);}
function girder(parent,a,b,size=8){const delta=a.map((v,i)=>Math.abs(v-b[i])),axis=delta.findIndex(v=>v>.001),center=a.map((v,i)=>(v+b[i])/2),dims=[size,size,size];dims[axis]=delta[axis]+size;
 structuralBox(parent,...dims,...center,mats.frame);
 if(axis===0){box(parent,dims[0]-2,2,size+.35,center[0],center[1],center[2],mats.dark);box(parent,dims[0]-3,.45,.55,center[0],center[1]+size*.48,center[2]+size*.52,mats.silver);}
 if(axis===2){box(parent,size+.35,2,dims[2]-2,center[0],center[1],center[2],mats.dark);}
}
// Generate the structure from the same irregular bay graph as the planner.
const frameEdges=new Set(),corners=new Map();
C.nodes.forEach((node,index)=>{
 const [x,y,z]=C.slots[index],g=frameLevels[node.level],hx=C.config.pitchX/2,hz=C.config.pitchZ/2;
 const cs=[[-hx,-hz],[hx,-hz],[hx,hz],[-hx,hz]].map(([dx,dz])=>[x+dx,z+dz]);
 cs.forEach(([cx,cz])=>{const key=`${cx},${cz}`,previous=corners.get(key);if(!previous||previous.top<y+88)corners.set(key,{x:cx,z:cz,top:y+88});});
 for(let k=0;k<4;k++){const a=cs[k],b=cs[(k+1)%4],key=[node.level,...a,...b].join(','),rev=[node.level,...b,...a].join(',');if(frameEdges.has(key)||frameEdges.has(rev))continue;frameEdges.add(key);girder(g,[a[0],y-8,a[1]],[b[0],y-8,b[1]],8);}
 // Tracks stay outside the vertically moving envelope; shaft interiors remain open.
 const railY=y-(node.lift?6.7:2.5);
 for(const dz of [-47,47])structuralBox(g,116,2.5,3,x,railY,z+dz,mats.silver);
 for(const dx of [-50,50])structuralBox(g,2.5,2,108,x+dx,railY,z,mats.dark);
 if(!node.lift){structuralBox(g,101,3,93,x,y-4.8,z,mats.deck);box(g,95,.6,87,x,y-2.7,z,mats.silver);box(g,91,.8,83,x,y-1.6,z,mats.dark);}
 for(const dx of [-54,54])for(const dz of [-50,50]){box(g,5,2,5,x+dx,y-.5,z+dz,node.lift?mats.gold:mats.pale);cyl(g,.6,.5,x+dx,y+.65,z+dz,mats.silver,8);}
 const markerColor=node.lift?'#d0b075':'#80b6b7';for(const dx of [-47,47])for(const dz of [-43,43])line(g,[[x+dx,y+.1,z+dz-Math.sign(dz)*6],[x+dx,y+.1,z+dz],[x+dx-Math.sign(dx)*6,y+.1,z+dz]],markerColor,.55);
 // Legible service edges and lock connectors; no monolithic floor plate across the atrium.
 if(!C.nodes.some(n=>n.level===node.level&&n.col===node.col&&n.row===node.row+1)){
   box(g,111,1.8,8,x,y-4,z+55,mats.dark);for(const dx of [-50,0,50])cyl(g,.5,8,x+dx,y+1,z+58,mats.pale,8);tube(g,[x-54,y+5,z+58],[x+54,y+5,z+58],.5,mats.silver);box(g,100,.5,.55,x,y-1,z+60,mats.cool);
 }
});
for(const {x,z,top}of corners.values()){
 structuralBox(posts,7.5,top+3,7.5,x,(top-3)/2,z,mats.frame);box(posts,1.1,top-7,1.1,x+4,(top-3)/2,z+3,mats.dark);box(posts,.4,top-10,.45,x+4.7,(top-3)/2,z+3,mats.silver);
 cyl(foundations,12,6,x,-3,z,mats.dark);cyl(foundations,8,16,x,6,z,mats.silver);box(foundations,20,3,20,x,14,z,mats.frame);
 for(let level=0;level<C.config.layers;level++){const y=C.config.baseY+level*C.config.pitchY;if(y>top)break;const g=frameLevels[level];structuralBox(g,14,4,14,x,y-9,z,mats.dark);for(const dx of [-4,4])for(const dz of [-4,4])cyl(g,.9,1.1,x+dx,y-6.4,z+dz,mats.gold,8);}
 box(posts,11,3,11,x,top,z,mats.dark);sphere(posts,1.1,x,top+2.6,z,mats.cool);
}
// Exterior triangulation sits clear of every horizontal and vertical room sweep.
for(const [a,b]of [[[-314,23,-189],[-65,345,-189]],[[187,23,-189],[63,345,-189]],[[-314,23,189],[-190,128,189]],[[314,18,189],[190,125,189]]]){tube(posts,a,b,2.3,mats.dark);tube(posts,a.map((v,i)=>i===2?v-1:v),b.map((v,i)=>i===2?v-1:v),.65,mats.silver);}
// Terrace caps follow the stepped profile instead of forming a rectangular roof.
for(const node of C.nodes){if(node.lift||C.bay(node.level+1,node.col,node.row)!==undefined)continue;const [x,y,z]=C.slots[C.bay(node.level,node.col,node.row)],g=frameLevels[node.level];girder(g,[x-62,y+87,z-60],[x+62,y+87,z-60],6);girder(g,[x-62,y+87,z+60],[x+62,y+87,z+60],6);for(const dx of [-62,62])girder(g,[x+dx,y+87,z-60],[x+dx,y+87,z+60],6);}
frameLevels.forEach((g,i)=>{const n=C.nodes.find(n=>n.level===i&&n.row===1)||C.nodes.find(n=>n.level===i);const x=n.col*124,z=n.row*120;decal(g,`L 0${i+1}  /  ORBITAL FRAME`,84,4,x,C.config.baseY+i*108-8,z+64);bake(g);});bake(posts);bake(foundations);
const elevators={},shaftVisuals={},parkedPallets=[];
for(const shaft of C.shafts){
 const {x,z}=shaft,g=new T.Group();g.position.set(x,34,z);station.add(g);elevators[shaft.id]=g;
 box(g,92,3.5,84,0,-2.2,0,mats.gold);box(g,88,.6,80,0,-.2,0,mats.dark);for(const dx of [-47,47])box(g,1,1,80,dx,-.8,0,mats.cool);for(const dz of [-43,43])box(g,90,.7,.7,0,-.6,dz,mats.gold);bake(g);
 for(const level of shaft.levels){const node=C.lift(level,shaft.id),y=C.slots[node][1],p=new T.Group();p.position.set(x,y,z);p.userData={node,level,shaft:shaft.id};for(const dx of [-41,41])box(p,8,2.2,82,dx,-1.1,0,mats.gold);station.add(p);parkedPallets.push(p);}
 const rails=new T.Group();station.add(rails);for(const dx of [-55,55])for(const dz of [-51,51]){box(rails,1.7,shaft.maxY-shaft.minY+85,1.7,x+dx,(shaft.maxY+shaft.minY+85)/2,z+dz,mats.silver);box(rails,.55,shaft.maxY-shaft.minY+83,.65,x+dx+1.3,(shaft.maxY+shaft.minY+85)/2,z+dz,mats.cool);}
 box(rails,110,5,105,x,shaft.maxY+89,z,mats.dark);box(rails,105,1.5,98,x,shaft.maxY+93,z,mats.solar);decal(rails,`LIFT ${shaft.id}  /  VERTICAL LINK`,67,6,x,shaft.maxY+85,z+54);bake(rails);shaftVisuals[shaft.id]=rails;
}
const workLights=[];for(const [x,y,z,color,intensity]of [[-140,175,58,'#a7d9dc',1400],[125,350,35,'#a2cbd9',1600],[-40,506,-105,'#ffe0a2',900],[-70,42,150,'#ffd79e',700]]){const l=new T.PointLight(color,intensity,165,2);l.position.set(x,y,z);scene.add(l);workLights.push(l);}
const typeNames=['材料实验','生命科学','居住单元','能源设备','物资保障','通信测控'],typeCodes=['MATERIAL / LAB','BIO / SCIENCE','HAB / LIVING','ENERGY / CORE','SUPPLY / LOG','COMMS / ARRAY'];
const roomTypes=Array.from({length:C.config.roomCount},(_,i)=>i%6);roomTypes[1]=0;roomTypes[2]=1;roomTypes[7]=4;roomTypes[10]=3;roomTypes[23]=3;
const buildingNames=roomTypes.map((type,i)=>`${typeNames[type]} ${String(i+1).padStart(2,'0')}`),rooms=roomTypes.map((type,i)=>({position:new T.Vector3(...C.slots[C.initial.indexOf(i)]),userData:{index:i,type,height:78}}));
function astronaut(parent,x,y,z,small=false){const g=new T.Group();g.position.set(x,y,z);if(small)g.scale.setScalar(.9);parent.add(g);cyl(g,1.1,3.5,0,4.1,0,mats.hull,10);sphere(g,1.2,0,6.6,0,mats.hull);box(g,1.8,1,.75,0,6.7,1,mats.glassDark);for(const dx of [-.65,.65])tube(g,[dx,3,0],[dx,0,0],.43,mats.hull);tube(g,[-1,5.2,0],[-1.7,3,.3],.43,mats.hull);tube(g,[1,5.2,0],[1.7,3,0],.43,mats.hull);box(g,1.8,2.6,1.1,0,4,-1.1,mats.gold);return g;}
function moduleParts(type){
 const g=new T.Group(),accent=new T.MeshStandardMaterial({color:['#668e91','#8c9d81','#bba67b','#b29162','#869da6','#7c9cac'][type],metalness:.58,roughness:.48});
 box(g,92,3,84,0,1.8,0,mats.dark);box(g,86,2,78,0,4.3,0,mats.silver);for(const x of [-35,35])for(const z of [-31,31]){box(g,9,4,9,x,6,z,mats.dark);box(g,6,.7,6,x,8.3,z,mats.gold);}
 // A thick rounded pressure shell with open front glazing and readable interior depth.
 const outer=roundedShape(87,58,11),hole=roundedShape(77,45,8);const path=new T.Path(hole.getPoints(48).map(p=>new T.Vector2(p.x,p.y+6)));outer.holes.push(path);
 const shell=mesh(g,new T.ExtrudeGeometry(outer,{depth:75,bevelEnabled:true,bevelThickness:.6,bevelSize:.5,bevelSegments:2,curveSegments:10,steps:1}),mats.hull,0,9,-37.5);shell.userData.skin=true;
 const back=roundedBox(g,83,54,2,10,0,38,-37,mats.hull);back.userData.skin=true;roundedBox(g,75,42,.7,7,0,37.5,-35.6,mats.innerWall);
 // Front mullions, structural belt, gasket and external handling points.
 const gasket=roundedShape(80,47,8),opening=roundedShape(76.2,42.5,7);gasket.holes.push(new T.Path(opening.getPoints(32).map(p=>new T.Vector2(p.x,p.y+2.25))));mesh(g,new T.ExtrudeGeometry(gasket,{depth:1.4,bevelEnabled:false,curveSegments:10}),mats.rubber,0,14,38.3);
 roundedBox(g,76.2,42.5,1.1,7,0,37.5,40,mats.glass); // physical glass reveal
 for(const x of [-27,-9,9,27])box(g,.85,43,1.8,x,37.2,40.6,mats.silver);
 box(g,74,1.5,1.8,0,36.8,40.6,mats.silver);
 // Two occupied interior decks visible through glazing; back-light exposes actual objects.
 for(const y of [14,37]){box(g,75,1.1,65,0,y,0,mats.interior);box(g,64,.5,.6,0,y+18,-31,mats.warm);for(const x of [-26,0,26]){box(g,13,.8,8,x,y+6,12,mats.pale);for(const dx of [-5,5])box(g,.7,5,5,x+dx,y+3.3,12,mats.dark);const monitor=box(g,9,5,.7,x,y+9.2,9,mats.dark);box(g,7.3,3.6,.8,x,y+9.4,9.5,type===2?mats.warm:mats.cool);box(g,5,1.1,5,x,y+3,23,mats.dark);box(g,5,5,1,x,y+5.1,25,mats.interior);}}
 for(const x of [-34,34]){box(g,4,38,13,x,36,-23,mats.dark);for(let y=20;y<54;y+=5){box(g,4.2,1.4,10,x,y,-23,mats.pale);box(g,.5,.5,.7,x+(x<0?2.3:-2.3),y,-18,mats.cool);}}
 if(type===1){for(const x of [-22,0,22])for(const z of [-12,1]){box(g,12,2,7,x,18,z,mats.pale);for(const dx of [-3,1,4])sphere(g,1.8,x+dx,20,z,mats.plant);}}
 if(type===2){for(const x of [-19,19]){box(g,18,3,22,x,18,-12,mats.pale);box(g,14,2,19,x,20,-12,mats.warm);box(g,2,16,24,x-10,24,-12,mats.interior);}}
 if(type===3||type===4){for(const x of [-21,0,21]){box(g,13,22,16,x,25,-10,type===3?mats.gold:mats.pale);for(let y=18;y<34;y+=4)box(g,12,1,.8,x,y,-1.5,mats.dark);}}
 astronaut(g,type===1?-17:13,15,28,true);
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
 const parts=bake(g);return parts;
}
const moduleBatches=[],pickMeshes=[];
for(let type=0;type<6;type++){const ids=roomTypes.flatMap((t,i)=>t===type?[i]:[]);if(!ids.length)continue;for(const part of moduleParts(type)){const inst=new T.InstancedMesh(part.geometry,part.material,ids.length);inst.instanceMatrix.setUsage(T.DynamicDrawUsage);inst.castShadow=part.castShadow;inst.receiveShadow=true;inst.frustumCulled=false;inst.userData.roomIds=ids;station.add(inst);moduleBatches.push({mesh:inst,ids});pickMeshes.push(inst);}}
const selectionFrame=new T.Group();station.add(selectionFrame);for(const x of [-48,48])for(const z of [-44,44]){line(selectionFrame,[[x,1,z-Math.sign(z)*14],[x,1,z],[x-Math.sign(x)*14,1,z]],'#c4ede5');line(selectionFrame,[[x,3,z],[x,14,z]],'#c4ede5',.7);}
const activeLabel=document.createElement('div');activeLabel.className='building-label';stage.appendChild(activeLabel);
const infra=new T.Group();scene.add(infra);
// Inhabited plinth and approach make the enormous structural scale understandable.
const padShape=new T.Shape();padShape.moveTo(-344,-220);padShape.lineTo(280,-220);padShape.lineTo(341,-159);padShape.lineTo(341,170);padShape.lineTo(266,228);padShape.lineTo(-295,228);padShape.lineTo(-344,177);padShape.closePath();
const plinth=mesh(infra,new T.ExtrudeGeometry(padShape,{depth:9,bevelEnabled:true,bevelSize:3,bevelThickness:2,bevelSegments:2,steps:1}),mats.dark);plinth.rotation.x=-Math.PI/2;plinth.position.y=3;
for(let x=-300;x<=300;x+=60)for(let z=-180;z<=180;z+=60)box(infra,59,.6,59,x,12.5,z,mats.deck);
decal(infra,'L U N A R I S    /    F R A M E   0 1',188,13,10,13.5,200,-Math.PI/2);
for(const x of [-318,315])box(infra,.9,.9,340,x,14,0,mats.cool);box(infra,607,.9,.9,0,14,216,mats.warm);
function solar(x,z){const g=new T.Group();g.position.set(x,terrainY(x,z),z);infra.add(g);for(const dx of [-27,27]){cyl(g,1.5,21,dx,9,0,mats.silver);tube(g,[dx,0,-15],[dx,21,0],1.1,mats.dark);}const panels=new T.Group();panels.position.y=24;panels.rotation.x=-.32;g.add(panels);box(panels,91,1.5,54,0,0,0,mats.silver);box(panels,89,.5,52,0,1,0,mats.solar);for(const x of [-44,0,44])box(panels,.7,.5,51,x,1.4,0,mats.silver);}
for(const x of [-585,-475])for(const z of [-145,-65,15,95])solar(x,z);
for(const x of [385,420,455]){const z=-162;cyl(infra,10,30,x,terrainY(x,z)+17,z,mats.pale);sphere(infra,10,x,terrainY(x,z)+32,z,mats.pale);cyl(infra,2,6,x,terrainY(x,z)+43,z,mats.gold);tube(infra,[x,0,z],[x,1,-223],1.3,mats.silver);}
const antenna=new T.Group();antenna.position.set(414,terrainY(414,215),215);infra.add(antenna);cyl(antenna,18,4,0,2,0,mats.dark);cyl(antenna,4,33,0,19,0,mats.pale);const tilt=new T.Group();tilt.position.y=40;tilt.rotation.z=-.42;tilt.rotation.x=.25;antenna.add(tilt);const dish=mesh(tilt,new T.SphereGeometry(25,32,18,0,Math.PI*2,0,.43*Math.PI),new T.MeshStandardMaterial({color:'#d1d2c8',metalness:.66,roughness:.39,side:T.DoubleSide}));dish.rotation.x=Math.PI;for(const a of [0,2.094,4.188])tube(tilt,[Math.cos(a)*23,-4,Math.sin(a)*23],[0,11,0],.55,mats.silver);sphere(tilt,1.8,0,11.5,0,mats.gold);
const ramp=box(infra,72,5,98,-185,4,248,mats.deck);ramp.rotation.x=.15;for(const x of [-222,-148]){tube(infra,[x,-3,298],[x,16,198],.7,mats.silver);for(const z of [207,245,283])cyl(infra,.6,9,x,12-(z-207)*.16,z,mats.pale);}
function rover(x,z,angle){const g=new T.Group();g.position.set(x,terrainY(x,z)+5,z);g.rotation.y=angle;infra.add(g);roundedBox(g,28,9,16,3,0,5,0,mats.hull);box(g,12,4,15,8,12,0,mats.hull);box(g,.7,3,12,14.2,12,0,mats.glassDark);box(g,23,1.1,14,-1,14.5,0,mats.solar);for(const x of [-10,0,10])for(const z of [-10,10]){const wheel=cyl(g,4.6,3.4,x,1,z,mats.rubber,16);wheel.rotation.x=Math.PI/2;const hub=cyl(g,2.5,3.5,x,1,z,mats.silver,12);hub.rotation.x=Math.PI/2;}tube(g,[10,14,0],[10,23,0],.5,mats.silver);box(g,4.5,3,3,10,23,0,mats.pale);box(g,.6,1.1,9,-14,6,0,mats.warm);}
rover(-239,324,-.35);rover(262,290,.4);for(const [x,z]of [[-181,207],[-175,196],[88,167],[-87,7]])astronaut(infra,x,13,z);
for(const [x,z]of [[-310,211],[310,203],[-341,-219],[341,-216]]){cyl(infra,1,17,x,20,z,mats.silver);box(infra,5,2,4,x,30,z,mats.warm);}
const tracks=texture(128,512,ctx=>{ctx.fillStyle='#141a235a';for(let y=0;y<512;y+=11){ctx.fillRect(14,y,16,4);ctx.fillRect(96,y,16,4);}});
const track=mesh(infra,new T.PlaneGeometry(33,245),new T.MeshBasicMaterial({map:tracks,transparent:true,depthWrite:false}),-244,-6.9,422);track.rotation.x=-Math.PI/2;track.rotation.z=-.1;bake(infra);
let routeGroup=new T.Group();station.add(routeGroup);const obstruction=new T.Group();station.add(obstruction);const closedSlot=C.slots[C.lift(1,'C')];box(obstruction,96,2,87,closedSlot[0],closedSlot[1]+1,closedSlot[2],new T.MeshStandardMaterial({color:'#b8754d',emissive:'#bc582a',emissiveIntensity:.65,transparent:true,opacity:.3}));obstruction.visible=false;
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
function renderScene(){if(highQuality){renderer.setRenderTarget(targetRT);renderer.render(scene,camera);quad.material=brightMat;renderer.setRenderTarget(brightRT);renderer.render(postScene,postCamera);quad.material=blurMat;blurMat.uniforms.tScene.value=brightRT.texture;blurMat.uniforms.direction.value.set(1.5,0);renderer.setRenderTarget(blurRT);renderer.render(postScene,postCamera);blurMat.uniforms.tScene.value=blurRT.texture;blurMat.uniforms.direction.value.set(0,1.5);renderer.setRenderTarget(bloomRT);renderer.render(postScene,postCamera);quad.material=postMat;postMat.uniforms.projectionInverse.value.copy(camera.projectionMatrixInverse);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);}else renderer.render(scene,camera);}
function setLighting(mode){sun.color.set(mode==='day'?'#f5eee0':mode==='night'?'#98b6d0':'#ffe3bd');sun.intensity=mode==='night'?.24:mode==='day'?4.1:3.6;ambient.intensity=mode==='night'?.48:mode==='day'?1.25:.95;rim.intensity=mode==='night'?.65:1.9;mats.warm.emissiveIntensity=mode==='night'?2.6:1.45;mats.cool.emissiveIntensity=mode==='night'?2.2:1.15;mats.innerWall.emissiveIntensity=mode==='night'?.45:.08;mats.interior.emissiveIntensity=mode==='night'?.3:.08;stars.material.opacity=mode==='night'?.67:.34;workLights.forEach((l,i)=>l.intensity=[1400,1600,900,700][i]*(mode==='night'?1.3:.6));postMat.uniforms.bloom.value=mode==='night'?.24:.16;renderer.shadowMap.needsUpdate=true;}
let previousTransformKey='';
function updateInstances(positions,visibleFloor,frameOnly){
 const key=positions.map(p=>p.map(n=>n.toFixed(3)).join(',')).join(';')+'|'+visibleFloor+'|'+frameOnly;
 if(key===previousTransformKey)return;previousTransformKey=key;dummy.rotation.set(0,0,0);
 rooms.forEach((room,i)=>{room.position.fromArray(positions[i]);room.userData.visible=(visibleFloor<0||Math.abs((positions[i][1]-C.config.baseY)/C.config.pitchY-visibleFloor)<.52)&&!frameOnly;});
 for(const batch of moduleBatches){batch.ids.forEach((id,j)=>{dummy.position.copy(rooms[id].position);dummy.scale.setScalar(rooms[id].userData.visible?1:0);dummy.updateMatrix();batch.mesh.setMatrixAt(j,dummy.matrix);});batch.mesh.instanceMatrix.needsUpdate=true;}
 frameLevels.forEach((g,i)=>g.visible=visibleFloor<0||i===visibleFloor);posts.visible=visibleFloor<0;foundations.visible=visibleFloor<0||visibleFloor===0;C.shafts.forEach(s=>shaftVisuals[s.id].visible=visibleFloor<0);renderer.shadowMap.needsUpdate=true;
}
