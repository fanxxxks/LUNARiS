// Six recessed pressure hatches. All helpers are declarations: moduleParts is
// called by lunar-scene before this concatenated source reaches its own body.
function modulePanel(parent,w,h,depth,r,holes,mat,chamfer=false){
 const shape=chamfer?moduleChamferShape:roundedShape;const s=shape(w,h,r);
 for(const q of holes){const cut=shape(q.w,q.h,q.r||1.4);s.holes.push(new T.Path(cut.getPoints(4).map(p=>new T.Vector2(p.x+(q.x||0),p.y+h/2+(q.y||0)-q.h/2))));}
 const geo=depth<1?new T.ShapeGeometry(s,4):new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:4,steps:1});
 // Match Box/Plane UVs: default extruded-shape world coordinates would clamp
 // most of a wall to one edge texel. Only UVs change; hatch geometry is intact.
 const p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv;
 for(let i=0;i<p.count;i++){
  const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));
  const u=nz>=nx&&nz>=ny?(p.getX(i)+w/2)/w:nx>=ny?p.getZ(i)/depth:(p.getX(i)+w/2)/w;
  const v=nz>=nx&&nz>=ny?p.getY(i)/h:nx>=ny?p.getY(i)/h:p.getZ(i)/depth;
  uv.setXY(i,Math.max(0,Math.min(1,u)),Math.max(0,Math.min(1,v)));
 }
 geo.translate(0,-h/2,-depth);return mesh(parent,geo,mat);
}
function moduleHatchFrame(parent,vertical=false){
 const w=vertical?14:14,h=vertical?14:23;
 const rim=modulePanel(parent,w+5.4,h+5.4,1.8,3,[{w:w+.5,h:h+.5,r:1.7}],mats.silver);rim.position.z=-.2;
 const gasket=modulePanel(parent,w+2.5,h+2.5,4.2,2.1,[{w,h,r:1.4}],mats.rubber);gasket.position.z=-.35;
 for(const x of [-1,1])for(const y of [-1,1]){box(parent,1,1,.35,x*(w/2+1.6),y*(h/2+1.6),-.3,mats.gold);}
 box(parent,5,.65,.3,0,h/2+1.9,-.3,mats.cool);
 box(parent,.9,4,.45,w/2+1.9,-2,-.25,mats.dark);
 box(parent,.55,1.1,.48,w/2+1.9,-1.2,-.35,mats.warm);
}

// Reference-derived model profiles are visual equipment variants. The six
// simulation function groups and their routing/traffic semantics stay separate.
function moduleProfiles(){return [
 {code:'HAB',name:'居住舱',caption:'HABITAT UNIT',color:'#e9a55b'},
 {code:'LSU',name:'生命支持舱',caption:'LIFE SUPPORT UNIT',color:'#58d4dc'},
 {code:'PWR',name:'能源舱',caption:'POWER UNIT',color:'#e9c646'},
 {code:'BIO',name:'生物培养舱',caption:'BIOLOGICAL UNIT',color:'#96c66a'},
 {code:'MED',name:'医疗舱',caption:'MEDICAL UNIT',color:'#db7c70'},
 {code:'ENG',name:'工程工坊',caption:'ENGINEERING UNIT',color:'#e4af56'},
 {code:'DCU',name:'数据核心舱',caption:'DATA CORE UNIT',color:'#9695ed'},
 {code:'CMD',name:'指挥舱',caption:'COMMAND UNIT',color:'#74b7ed'},
 {code:'GYM',name:'健身房',caption:'FITNESS UNIT',color:'#73c7b4'},
 {code:'DIN',name:'餐厅',caption:'DINING UNIT',color:'#dfad78'}
];}
function moduleDesignMaterials(){
 if(moduleDesignMaterials.value)return moduleDesignMaterials.value;
 const metal=(color,roughness=.67,metalness=.35)=>new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:roughMap,envMapIntensity:.75});
 const paintMap=texture(512,512,(ctx,w,h)=>{
  ctx.fillStyle='#eceeea';ctx.fillRect(0,0,w,h);
  for(let i=0;i<12500;i++){const x=hash(i,17)*w,y=hash(i,38)*h,v=Math.floor(110+hash(i,21)*95);ctx.fillStyle=`rgba(${v},${v},${v},${.015+hash(i,8)*.04})`;ctx.fillRect(x,y,.5+hash(i,5)*1.3,.5+hash(i,9)*1.4);}
  const dust=ctx.createLinearGradient(0,0,0,h);dust.addColorStop(0,'#4d4b4008');dust.addColorStop(.7,'#4d4b4000');dust.addColorStop(1,'#4d4b4019');ctx.fillStyle=dust;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#55616b28';ctx.lineWidth=.7;for(let i=0;i<70;i++){const x=hash(i,47)*w,y=hash(i,83)*h;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+hash(i,27)*9,y+1);ctx.stroke();}
 });
 const shell=new T.MeshStandardMaterial({color:'#c4cdd1',map:paintMap,roughnessMap:roughMap,normalMap:coatingNormal,normalScale:new T.Vector2(.018,.018),roughness:.64,metalness:.16,envMapIntensity:.8});
 const floorMap=texture(512,512,(ctx,w,h)=>{ctx.fillStyle='#5c6467';ctx.fillRect(0,0,w,h);for(let x=0;x<w;x+=64)for(let y=0;y<h;y+=64){ctx.strokeStyle='#30393c';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,62,62);ctx.fillStyle='#a5b2ad30';ctx.fillRect(x+4,y+4,56,1);for(let q=10;q<60;q+=8){ctx.fillStyle='#38444766';ctx.fillRect(x+q,y+8,2,48);}}},[2,2]);
 return moduleDesignMaterials.value={shell,gasket:metal('#171d21',.92,0),panel:new T.MeshStandardMaterial({color:'#dce1df',map:paintMap,roughness:.43,metalness:.035}),graphite:metal('#292e31',.52,.52),seam:metal('#576166',.51,.6),door:new T.MeshStandardMaterial({color:'#c8cecc',map:paintMap,roughness:.55,metalness:.28}),white:new T.MeshStandardMaterial({color:'#fff4e3',emissive:'#ffe9c9',emissiveIntensity:1.65,roughness:.35}),fabric:metal('#c3b9a3',.94,0),screen:metal('#152025',.5,.15),floor:new T.MeshStandardMaterial({color:'#a0a8a6',map:floorMap,roughness:.84,metalness:.25,emissive:'#bcc7c8',emissiveIntensity:.1}),profiles:moduleProfiles().map(p=>({
 paint:metal(p.color,.67,.2),light:new T.MeshStandardMaterial({color:p.color,emissive:p.color,emissiveIntensity:.85,roughness:.42}),
 cabinet:new T.MeshStandardMaterial({color:'#8a9498',roughness:.7,metalness:.35,emissive:p.color,emissiveIntensity:.07})
 }))};
}
function moduleChamferShape(w,h,c){
 const s=new T.Shape(),x=w/2;c=Math.min(c,w/2,h/2);
 s.moveTo(-x+c,0);s.lineTo(x-c,0);s.lineTo(x,c);s.lineTo(x,h-c);s.lineTo(x-c,h);s.lineTo(-x+c,h);s.lineTo(-x,h-c);s.lineTo(-x,c);s.closePath();return s;
}
// Pictograms are redundant with the printed code, so colour is never the only
// way to distinguish equipment variants. Drawn locally for the offline build.
function moduleProfileGlyph(ctx,profile,x,y,size){
 ctx.save();ctx.translate(x,y);ctx.scale(size/100,size/100);ctx.strokeStyle='#1e2b30';ctx.fillStyle='#1e2b30';ctx.lineWidth=7;ctx.lineCap='round';ctx.lineJoin='round';
 const line=points=>{ctx.beginPath();points.forEach(([a,b],i)=>i?ctx.lineTo(a,b):ctx.moveTo(a,b));ctx.stroke();};
 const circle=(a,b,r)=>{ctx.beginPath();ctx.arc(a,b,r,0,Math.PI*2);ctx.stroke();};
 if(profile===0){line([[13,46],[50,17],[87,46]]);line([[25,43],[25,81],[75,81],[75,43]]);line([[45,81],[45,59],[58,59],[58,81]]);}
 else if(profile===1){line([[18,34],[28,20],[69,20],[82,35]]);line([[82,66],[72,80],[31,80],[18,65]]);line([[69,35],[82,35],[82,22]]);line([[31,65],[18,65],[18,78]]);circle(50,50,13);}
 else if(profile===2){ctx.beginPath();ctx.moveTo(58,12);ctx.lineTo(26,56);ctx.lineTo(46,56);ctx.lineTo(38,88);ctx.lineTo(76,41);ctx.lineTo(54,41);ctx.closePath();ctx.fill();}
 else if(profile===3){ctx.beginPath();ctx.moveTo(25,78);ctx.bezierCurveTo(9,38,47,17,81,20);ctx.bezierCurveTo(85,60,62,83,25,78);ctx.stroke();line([[23,81],[65,38]]);line([[44,60],[43,39]]);}
 else if(profile===4){ctx.fillRect(39,17,22,66);ctx.fillRect(17,39,66,22);}
 else if(profile===5){line([[23,78],[56,44]]);ctx.beginPath();ctx.arc(67,33,19,-.15,Math.PI*1.65);ctx.stroke();line([[86,30],[69,40],[60,30],[66,14]]);circle(23,78,6);}
 else if(profile===6){for(const yy of [17,43,69]){ctx.strokeRect(21,yy,58,17);ctx.fillRect(29,yy+6,5,5);line([[45,yy+8],[70,yy+8]]);}}
 else if(profile===9){circle(50,50,23);line([[15,17],[15,83]]);line([[8,17],[8,36],[22,36],[22,17]]);line([[85,17],[78,44],[85,44],[85,83]]);}
 else if(profile===8){line([[22,50],[78,50]]);for(const x of [18,30,70,82])line([[x,32],[x,68]]);}
 else{circle(50,50,12);for(const [a,b]of [[18,23],[82,23],[18,77],[82,77]]){line([[50+(a-50)*.3,50+(b-50)*.3],[a,b]]);circle(a,b,7);}}
 ctx.restore();
}
function moduleProfileLabel(profile){
 const cache=moduleProfileLabel.cache||(moduleProfileLabel.cache=[]);if(cache[profile])return cache[profile];
 const p=moduleProfiles()[profile],map=texture(768,256,(ctx)=>{
  ctx.fillStyle='#e1e7e4';ctx.fillRect(0,0,768,256);ctx.fillStyle=p.color;ctx.fillRect(0,0,200,256);
  moduleProfileGlyph(ctx,profile,23,42,156);
  ctx.fillStyle='#1e2b30';ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.font='700 126px Novecento Wide Bold, Lunaris Display, Lunaris Serif';ctx.fillText(p.code,232,97);
  ctx.font='700 27px Novecento Wide Bold, Lunaris Display, Lunaris Serif';ctx.fillText(p.caption,236,190);
  ctx.fillStyle=p.color;ctx.fillRect(228,228,510,8);
 });
 const label=new T.MeshBasicMaterial({map,polygonOffset:true,polygonOffsetFactor:-1});label.name='module-identity-'+p.code;label.userData.moduleIdentity=p.code;
 return cache[profile]=label;
}
function moduleRoofServices(roof,profile,m,p){
 // Shallow replaceable cassettes stay on the existing lid, clear of the upper
 // transfer hatch. Different silhouettes remain readable from the station view.
 const pad=(x,z,w,d,mat=m.graphite)=>box(roof,w,.32,d,x,71.55,z,mat);
 const strip=(x,z,w,d,mat=m.seam)=>box(roof,w,.22,d,x,71.83,z,mat);
 const port=(x,z,r)=>{mesh(roof,new T.CylinderGeometry(r,r,.25,16),m.seam,x,71.88,z);mesh(roof,new T.CylinderGeometry(r*.64,r*.64,.28,16),m.graphite,x,72,z);};
 if(profile===0){
  for(const x of [-24,-2]){pad(x,-8,17,26);for(const z of [-17,-11,-5,1])strip(x,z,14,3,m.panel);}
  strip(-13,-8,2,26,p.paint);
 }else if(profile===1){
  for(const x of [-28,-13,2]){pad(x,-8,10,26);for(const z of [-17,-12,-7,-2])strip(x,z,8,2.2);strip(x,3,8,2,p.paint);}
  strip(-13,6,40,1.4);strip(-13,-22,40,1.4);
 }else if(profile===2){
  for(const x of [-24,-2]){pad(x,-8,18,27);for(const z of [-16,-7,2]){strip(x,z,14,5,m.panel);strip(x,z,1.4,5,p.paint);}}
  strip(-13,-8,2,27,p.paint);
 }else if(profile===3){
  for(const x of [-24,-2]){pad(x,-8,18,27,m.panel);for(const z of [-16,-3]){port(x,z,4.8);strip(x,z,1.2,4.8,p.paint);}strip(x,5,14,1.4,p.paint);}
 }else if(profile===4){
  for(const x of [-28,-13,2])for(const z of [-16,-1]){pad(x,z,11.5,12);strip(x,z,10,10,m.panel);strip(x,z+3.5,7,1,p.paint);}
  strip(-13,7,36,1.4,m.panel);
 }else if(profile===5){
  pad(-13,-8,38,26);for(const x of [-25,-1]){strip(x,-8,10,23,m.panel);for(const z of [-17,1])port(x,z,2);}
  for(const z of [-16,-8,0]){const rib=strip(-13,z,14,2);rib.rotation.y=-Math.PI/5;}strip(-13,7,38,2,p.paint);
 }else if(profile===6){
  for(const x of [-29,-18,-7,4]){pad(x,-8,7,27);for(let z=-18;z<4;z+=3)strip(x,z,5.8,.8);strip(x,5,5,1.4,p.paint);}
 }else if(profile===9){
  pad(-13,-8,38,26,m.panel);for(const x of [-25,-1]){port(x,-10,5);for(const z of [-19,0,4])strip(x,z,14,1.4,m.seam);}strip(-13,8,38,1.4,p.paint);
 }else if(profile===8){
  for(const x of [-25,-1]){pad(x,-8,16,26,m.panel);for(const z of [-16,-9,-2])strip(x,z,12,2,m.seam);port(x,6,2.4);}
  strip(-13,8,38,1.4,p.paint);
 }else{
  pad(-13,-8,38,28,m.panel);port(-13,-8,9);
  const ring=mesh(roof,new T.RingGeometry(3.6,4.8,24),m.seam,-13,72.18,-8);ring.rotation.x=-Math.PI/2;
  for(const x of [-28,2])for(const z of [-18,2]){pad(x,z,5.5,6);strip(x,z,3.8,4,p.paint);}
  strip(-13,6,36,1.4,p.paint);
 }
 // The roof carries the same readable identifier as all four door headers.
 const title=mesh(roof,new T.PlaneGeometry(36,12),moduleProfileLabel(profile),-13,71.84,16);title.rotation.x=-Math.PI/2;title.castShadow=false;
 for(const x of [-39.5,13.5])box(roof,2.8,.25,47,x,70.3,0,p.paint);
}
function moduleParts(type,profile=5){
 const g=new T.Group(),skin=new T.Group(),inside=new T.Group(),roof=new T.Group();g.add(skin,inside,roof);
 const m=moduleDesignMaterials(),p=m.profiles[profile],identity=moduleProfiles()[profile];
 const armor=(parent,w,h,d,c,holes,material)=>{
  if(holes.length||d<.3)return modulePanel(parent,w,h,d,c,holes,material,true);
  // Sub-millimetre edge catches make coated service panels read as metal.
  const edge=Math.min(.12,d*.22),geo=new T.ExtrudeGeometry(moduleChamferShape(w-edge*2,h-edge*2,c),{depth:d-edge*2,bevelEnabled:true,bevelSize:edge,bevelThickness:edge,bevelSegments:1,curveSegments:1,steps:1});
  const pos=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+w/2)/w,(pos.getY(i)+edge)/h);
  geo.translate(0,-h/2+edge,-d+edge);return mesh(parent,geo,material);
 };
 function rail(parent,a,b,r,mat){const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start),o=mesh(parent,new T.CylinderGeometry(r,r,delta.length(),6),mat);o.position.copy(start.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;}
 function vent(parent,x,y,w,h,z=.08){
  box(parent,w,h,.4,x,y,z,m.graphite);
  for(let v=-h/2+1;v<h/2;v+=1.5)mesh(parent,new T.PlaneGeometry(w-.7,.35),m.seam,x,y+v,z+.43);
 }
 // The external octagonal surround is larger than the preserved clear throat.
 // Its upper armor and sliding leaves together read as one full-height door.
 for(const f of [{axis:2,sign:1,w:90},{axis:2,sign:-1,w:90},{axis:0,sign:1,w:82},{axis:0,sign:-1,w:82}]){
  const face=new T.Group();skin.add(face);face.position.set(f.axis===0?f.sign*45:0,38,f.axis===2?f.sign*41:0);face.rotation.y=f.axis===0?f.sign*Math.PI/2:f.sign<0?Math.PI:0;
  const wx=f.axis===2?28:25,ww=f.axis===2?24:19;
  const windowHoles=[];for(const x of [-wx,wx]){windowHoles.push({w:ww,h:22,x,y:-9,r:1.4},{w:ww,h:14,x,y:18,r:1.2});}
  armor(face,f.w,68,1.5,2.8,[{w:14.8,h:23.8,x:0,y:-12,r:1.7},...windowHoles],m.shell);
  // Slim seams, service covers and louvers are actual shallow geometry.
  for(const x of [-wx,wx]){
   // Each window is a single transparent surface inside a real wall opening.
   // Separate seal / steel rebate / sill preserve readable edge reflections.
   for(const [wy,wh]of [[-9,22],[18,14]]){
    const rim=armor(face,ww+2.2,wh+2.2,.7,2.2,[{w:ww,h:wh,r:1.4}],m.gasket);rim.position.set(x,wy,.16);
    const rebate=armor(face,ww+.35,wh+.35,1.6,1.5,[{w:ww-.8,h:wh-.8,r:1.1}],mats.silver);rebate.position.set(x,wy,-.2);
    const glass=modulePanel(face,ww-.8,wh-.8,0,1.1,[],mats.glass);glass.position.set(x,wy,-1.25);glass.castShadow=false;
    box(face,ww-1,.35,.7,x,wy+wh/2-.8,-1.7,m.white);
    box(face,ww+1,.7,1.1,x,wy-wh/2-.5,-.12,m.seam);
   }
   for(const [py,ph]of [[-27,11],[6,6],[29.5,5.8]]){
    const panel=armor(face,ww-.3,ph,.38,.7,[],m.panel);panel.position.set(x,py,.02);
    for(const dx of [-ww/2+1.4,ww/2-1.4])for(const dy of [-ph/2+1,ph/2-1]){
     const screw=mesh(face,new T.CircleGeometry(.25,6),m.graphite,x+dx,py+dy,.13);screw.castShadow=false;
     box(face,.21,.045,.015,x+dx,py+dy,.15,mats.silver);
    }
   }
   vent(face,x-ww*.14,-27.5,ww*.45,6,.1);vent(face,x,29.5,ww-5,1.3,.12);
   // Flush quick-release latch and emergency locator, restrained abrasion.
   box(face,2.5,2.6,.25,x+ww*.32,-29,.15,m.graphite);box(face,1.5,.3,.3,x+ww*.32,-29,.3,mats.silver);
   box(face,ww-1,2.4,.12,x,6,.11,p.paint);
   for(const dx of [-ww*.34,ww*.34])box(face,.65,2.4,.14,x+dx,6,.13,m.panel);
  }
  const surround=new T.Group();face.add(surround);surround.position.set(0,-4,.1);
  armor(surround,31,54,1.3,5.2,[{w:26,h:49,r:4}],m.graphite);
  armor(surround,27,50,.6,4.2,[{w:24.8,h:47.6,r:3.8}],m.seam).position.z=.08;
  armor(surround,24.8,47.6,.9,3.7,[{w:14.8,h:23.8,y:-8,r:1.7}],m.door).position.z=-.15;
  const title=mesh(surround,new T.PlaneGeometry(21,7),moduleProfileLabel(profile),0,11,.03);
  title.castShadow=false;
  for(const x of [-13.5,13.5]){
   for(const y of [-15,15]){box(surround,1.8,7.8,.8,x,y,.08,m.graphite);box(surround,.6,5.9,.25,x,y,.55,m.white);}
   for(const y of [-20,0,20])box(surround,2.3,1.3,.7,x,y,.55,m.seam);
  }
  for(const y of [-25,25]){box(surround,12,1.5,.5,0,y,.25,m.graphite);box(surround,3.4,.6,.5,0,y,.55,p.light);}
  const hatch=new T.Group();skin.add(hatch);hatch.position.set(f.axis===0?f.sign*46:0,26,f.axis===2?f.sign*42:0);hatch.rotation.copy(face.rotation);moduleHatchFrame(hatch);
  // One-piece dark corner guards with split vertical white locator lights.
  for(const x of [-f.w/2+2.4,f.w/2-2.4]){
   box(face,4.2,66,.5,x,0,.05,m.graphite);
   for(const y of [-17,17]){box(face,2,19,.35,x,y,.24,m.seam);box(face,.8,16.5,.4,x,y,.38,m.white);}
   for(const y of [-31,31])box(face,.7,3.2,.4,x,y,.25,p.paint);
  }
  box(face,f.w-8,3.4,.5,0,-32,-.15,m.gasket);
  for(const x of [-f.w/2+10,f.w/2-10]){box(face,10,1,.5,x,-33,.2,m.seam);for(const dx of [-3,3])box(face,.6,.55,.15,x+dx,-33,.51,mats.silver);}
 }
 // Actual floor/roof openings and passenger clearance match the routing model.
 function deck(parent,y,w,d,thickness,mat){const plate=modulePanel(parent,w,d,thickness,2.3,[{x:24,y:23,w:14,h:14,r:1.2}],mat);plate.rotation.x=-Math.PI/2;plate.position.y=y;return plate;}
 deck(skin,3,90,82,2.4,m.graphite);deck(roof,70,90,82,1.8,m.shell);
 const decks=[];
 for(const y of [14,43]){
  const level=new T.Group();level.userData.deck=y===14?'lower':'upper';inside.add(level);decks.push(level);
  deck(level,y,82,73,1.2,m.floor);
  // Service skirting and recessed ceiling channels face into the room.
  for(const x of [-39.5,39.5]){
   box(level,.6,1.4,70,x,y+.9,0,m.seam);
   box(skin,1.4,.7,68,x,y+23,0,m.graphite);
   box(skin,.65,.25,64,x-Math.sign(x)*.35,y+22.7,0,m.white);
  }
  for(const z of [-34.5,34.5]){box(level,78,1.4,.6,0,y+.9,z,m.seam);box(skin,76,.45,.65,0,y+23,z,m.white);}
  // The walking cross is unobstructed; low-profile path inlays give scale.
  for(const x of [-8,8])box(level,.25,.035,62,x,y+.06,0,m.door);
  for(const z of [-8,8])box(level,70,.035,.25,0,y+.07,z,m.door);
  for(const z of [-30,-16])box(level,.65,8,.65,32,y+4,z,mats.silver);
  rail(level,[32,y+8,-30],[32,y+8,-16],.35,mats.silver);
 }
 moduleDetailedInterior(inside,profile,m,p);
 for(const [level,lo,hi]of [[decks[0],3,43],[decks[1],43,75]]){
  for(const z of [-28,-18])rail(level,[30,lo,z],[30,hi,z],.5,mats.silver);
  for(let y=lo+1;y<hi;y+=3.4)rail(level,[30,y,-28],[30,y,-18],.5,m.door);
 }
 for(const z of [-29.8,-16.2])rail(decks[1],[17.5,44,z],[17.5,51,z],.4,mats.silver);
 const well=modulePanel(roof,18,18,6.2,2,[{w:14,h:14,r:1.3}],m.door);well.rotation.x=-Math.PI/2;well.position.set(24,76.3,-23);
 for(const sign of [-1,1]){const hatch=new T.Group();skin.add(hatch);hatch.position.set(24,sign>0?76.5:.3,-23);hatch.rotation.x=sign>0?-Math.PI/2:Math.PI/2;moduleHatchFrame(hatch,true);}
 // Flat armored roof service cover: no projecting domes, cargo or radiators.
 const lid=armor(roof,47,49,1.1,3.5,[],m.panel);lid.rotation.x=-Math.PI/2;lid.position.set(-13,71.3,0);
 const rim=armor(roof,50,52,1.5,4,[{w:46,h:48,r:3}],m.graphite);rim.rotation.x=-Math.PI/2;rim.position.set(-13,72.2,0);
 for(const x of [-35,9])for(const z of [-22,22]){box(roof,5.5,1.2,3,x,72.9,z,m.seam);box(roof,2,.3,.7,x,73.6,z,p.light);}
 moduleRoofServices(roof,profile,m,p);
 for(const [x,z]of [[-36,-34],[-36,34],[34,29]]){box(roof,12,.4,8,x,70.4,z,m.graphite);for(let dx=-4;dx<=4;dx+=2)box(roof,.6,.35,7,x+dx,70.8,z,m.seam);}
 for(const x of [-43,43])box(g,3.2,3,60,x,3,0,m.graphite);
 for(const z of [-39,39])box(g,70,2.2,2,0,3,z,m.graphite);
 const person=astronaut(decks[0],-12,14,12,true);person.scale.x*=.8;person.scale.z*=.8;person.traverse(o=>{if(o.isMesh&&o.geometry.type==='SphereGeometry'){const radius=o.geometry.parameters.radius;o.geometry.dispose();o.geometry=new T.SphereGeometry(radius,12,8);}});
 const layers=[];
 for(const level of inside.children.slice())if(level.userData.deck){
  bake(level).forEach(o=>{o.userData.layer='interior-'+level.userData.deck;layers.push(o);});inside.remove(level);
 }
 const inner=bake(inside);inner.forEach(o=>o.userData.layer='interior');g.remove(inside);
 const shell=bake(skin);shell.forEach(o=>o.userData.layer='skin');g.remove(skin);
 const top=bake(roof);top.forEach(o=>o.userData.layer='roof');g.remove(roof);
 return [...bake(g),...shell,...top,...inner,...layers];
}
