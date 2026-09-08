(() => {
'use strict';
const T=THREE,C=LunarCore,$=id=>document.getElementById(id),stage=$('stage');
let renderer;
try{renderer=new T.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});}catch(e){$('error').hidden=false;$('error').textContent='三维场景未能启动，请使用支持 WebGL 的 Chrome 或 Edge。';$('loading').hidden=true;$('play').disabled=true;return;}
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;stage.appendChild(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#080e15');const camera=new T.PerspectiveCamera(35,1,1,14000);
const ambient=new T.HemisphereLight('#c5dbea','#38382e',.95);scene.add(ambient);
const sun=new T.DirectionalLight('#ffe3bd',3.6);sun.position.set(-520,760,450);sun.target.position.set(-40,230,0);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-540,right:540,top:540,bottom:-540,near:80,far:1900});sun.shadow.normalBias=.16;sun.shadow.bias=-.00007;sun.shadow.radius=3;scene.add(sun,sun.target);
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
function decal(parent,text,w,h,x,y,z,rotation=0){const map=texture(512,96,ctx=>{ctx.fillStyle='#d1ded8';ctx.font='500 32px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,48);});const m=mesh(parent,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,forceSinglePass:true,side:T.DoubleSide}),x,y,z);m.rotation.x=rotation;return m;}
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
const station=new T.Group();station.name='compact-stepped-lunar-frame';scene.add(station);
const foundations=new T.Group(),posts=new T.Group(),frameLevels=Array.from({length:C.config.layers},()=>new T.Group());station.add(foundations,posts,...frameLevels);
foundations.name='recessed-foundations';posts.name='slender-joint-columns';frameLevels.forEach((g,i)=>g.name='thin-floor-L'+(i+1));
const fixedBoxes=[],frameEdges=new Set(),frameCorners=new Map();
const {pitchX,pitchY,pitchZ,width:roomWidth,height:roomHeight,depth:roomDepth,baseY}=C.config;
const halfX=pitchX/2,halfZ=pitchZ/2;
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
// A 1.9 m frame opening clears the 1.705 m connector around its 1.4 m throat.
const personnelPockets=C.nodes.filter(n=>!n.lift).map(n=>{
 const [x,y,z]=C.slots[n.id];return {min:[x+14.5,y-9,z-32.5],max:[x+33.5,y+1,z-13.5]};
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
 const palletOpening=[{min:[14.5,-6,-32.5],max:[33.5,1,-13.5]}];
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
const roomTypes=Array.from({length:C.config.roomCount},(_,i)=>i%6);roomTypes[1]=0;roomTypes[2]=1;roomTypes[7]=4;roomTypes[10]=3;roomTypes[23]=3;
const buildingNames=roomTypes.map((type,i)=>`${typeNames[type]} ${String(i+1).padStart(2,'0')}`),rooms=roomTypes.map((type,i)=>({position:new T.Vector3(...C.slots[C.initial.indexOf(i)]),rotation:new T.Euler(0,0,0,'YXZ'),userData:{index:i,type,height:78}}));
function astronaut(parent,x,y,z,small=false){const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(small?2.05:2.35);parent.add(g);cyl(g,1.1,3.5,0,4.1,0,mats.hull,10);sphere(g,1.2,0,6.6,0,mats.hull);box(g,1.8,1,.75,0,6.7,1,mats.glassDark);for(const dx of [-.65,.65])tube(g,[dx,3,0],[dx,0,0],.43,mats.hull);tube(g,[-1,5.2,0],[-1.7,3,.3],.43,mats.hull);tube(g,[1,5.2,0],[1.7,3,0],.43,mats.hull);box(g,1.8,2.6,1.1,0,4,-1.1,mats.gold);return g;}
const moduleBatches=[],pickMeshes=[];
// Share identical parts across room functions as well as within each function.
// Compare full attributes; geometry and material appearance remain identical.
const sharedParts=[];
function sameGeometry(a,b){return ['position','normal','uv'].every(key=>{const x=a.getAttribute(key)?.array,y=b.getAttribute(key)?.array;if(!x||!y)return x===y;if(x.length!==y.length)return false;for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;return true;});}
for(let type=0;type<6;type++){const ids=roomTypes.flatMap((t,i)=>t===type?[i]:[]);if(!ids.length)continue;for(const part of moduleParts(type)){const layer=part.userData.layer||'body',match=sharedParts.find(p=>p.part.material===part.material&&p.layer===layer&&sameGeometry(p.part.geometry,part.geometry));if(match){match.ids.push(...ids);part.geometry.dispose();}else sharedParts.push({part,ids:ids.slice(),layer});}}
for(const {part,ids,layer} of sharedParts){const inst=new T.InstancedMesh(part.geometry,part.material,ids.length);inst.instanceMatrix.setUsage(T.DynamicDrawUsage);inst.castShadow=part.castShadow;inst.receiveShadow=true;inst.frustumCulled=true;inst.userData.roomIds=ids;station.add(inst);moduleBatches.push({mesh:inst,ids,layer});pickMeshes.push(inst);}
const selectionFrame=new T.Group();station.add(selectionFrame);for(const x of [-48,48])for(const z of [-44,44]){line(selectionFrame,[[x,1,z-Math.sign(z)*14],[x,1,z],[x-Math.sign(x)*14,1,z]],'#c4ede5');line(selectionFrame,[[x,3,z],[x,14,z]],'#c4ede5',.7);}
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
 rooms.forEach((room,i)=>{const p=positions[i],o=orientations?.[i]||[0,0,0],visible=(visibleFloor<0||Math.abs((p[1]-C.config.baseY)/C.config.pitchY-visibleFloor)<.52)&&!frameOnly;
  const prev=instanceState[i];if(filterChanged||!prev||p.some((v,k)=>v!==prev[k])||o.some((v,k)=>v!==prev[k+3])){room.position.fromArray(p);room.rotation.set(...o,'YXZ');room.userData.visible=visible;instanceState[i]=[...p,...o];changed.add(i);}
 });
 if(!changed.size)return false;
 for(const batch of moduleBatches){let touched=false;batch.mesh.instanceMatrix.clearUpdateRanges?.();batch.ids.forEach((id,j)=>{if(!changed.has(id))return;const room=rooms[id],show=room.userData.visible&&!(batch.layer==='skin'&&id===sectionRoom);dummy.position.copy(room.position);dummy.rotation.copy(room.rotation);dummy.scale.setScalar(show?1:0);dummy.updateMatrix();batch.mesh.setMatrixAt(j,dummy.matrix);batch.mesh.instanceMatrix.addUpdateRange?.(j*16,16);touched=true;});if(touched){batch.mesh.instanceMatrix.needsUpdate=true;batch.mesh.computeBoundingSphere();}}
 if(filterChanged){frameLevels.forEach((g,i)=>g.visible=visibleFloor<0||i===visibleFloor);posts.visible=visibleFloor<0;foundations.visible=visibleFloor<0||visibleFloor===0;}
 lastFloor=visibleFloor;lastFrameOnly=frameOnly;lastSection=sectionRoom;renderer.shadowMap.needsUpdate=true;return true;
}

