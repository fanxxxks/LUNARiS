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
 {code:'CMD',name:'指挥舱',caption:'COMMAND UNIT',color:'#74b7ed'}
];}
function moduleDesignMaterials(){
 if(moduleDesignMaterials.value)return moduleDesignMaterials.value;
 const metal=(color,roughness=.67,metalness=.35)=>new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:roughMap,envMapIntensity:.75});
 const shell=new T.MeshStandardMaterial({color:'#d4d5d0',map:alloyMap,roughnessMap:coatingDetail,normalMap:coatingNormal,normalScale:new T.Vector2(.035,.035),roughness:.76,metalness:.2,envMapIntensity:.75});
 return moduleDesignMaterials.value={shell,graphite:metal('#292b2c',.7,.42),seam:metal('#4c4e4c',.8,.35),door:metal('#b9bdbb',.65,.35),white:new T.MeshStandardMaterial({color:'#efe7d4',emissive:'#ffeccc',emissiveIntensity:1.3,roughness:.45}),fabric:metal('#b0a18c',.94,0),screen:metal('#152025',.5,.15),profiles:moduleProfiles().map(p=>({
 paint:metal(p.color,.67,.2),light:new T.MeshStandardMaterial({color:p.color,emissive:p.color,emissiveIntensity:.85,roughness:.42}),
 cabinet:new T.MeshStandardMaterial({color:'#8a9498',roughness:.7,metalness:.35,emissive:p.color,emissiveIntensity:.07})
 }))};
}
function moduleChamferShape(w,h,c){
 const s=new T.Shape(),x=w/2;c=Math.min(c,w/2,h/2);
 s.moveTo(-x+c,0);s.lineTo(x-c,0);s.lineTo(x,c);s.lineTo(x,h-c);s.lineTo(x-c,h);s.lineTo(-x+c,h);s.lineTo(-x,h-c);s.lineTo(-x,c);s.closePath();return s;
}
function moduleProfileLabel(profile){
 const cache=moduleProfileLabel.cache||(moduleProfileLabel.cache=[]);if(cache[profile])return cache[profile];
 const p=moduleProfiles()[profile],map=texture(512,192,(ctx)=>{
  ctx.fillStyle='#282b2b';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='700 76px Novecento Wide Bold, Lunaris Display, Lunaris Serif';ctx.fillText(p.code,256,70);
  ctx.font='700 23px Novecento Wide Bold, Lunaris Display, Lunaris Serif';ctx.fillText(p.caption,256,128);
 });
 return cache[profile]=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
}
function moduleParts(type,profile=5){
 const g=new T.Group(),skin=new T.Group(),inside=new T.Group(),roof=new T.Group();g.add(skin,inside);skin.add(roof);
 const m=moduleDesignMaterials(),p=m.profiles[profile],identity=moduleProfiles()[profile];
 const armor=(parent,w,h,d,c,holes,material)=>modulePanel(parent,w,h,d,c,holes,material,true);
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
  armor(face,f.w,68,1.5,2.8,[{w:14.8,h:23.8,x:0,y:-12,r:1.7},{w:ww,h:20,x:-wx,y:-4,r:1.5},{w:ww,h:20,x:wx,y:-4,r:1.5}],m.shell);
  // Slim seams, service covers and louvers are actual shallow geometry.
  for(const x of [-wx,wx]){
   for(const y of [-21,10,24])box(face,ww+1,.24,.15,x,y,.1,m.seam);
   box(face,ww+1,5.6,.6,x,29,-.15,m.door);vent(face,x,29,ww-6,1.7,.25);
   const rim=armor(face,ww+2.4,22.4,.85,2.1,[{w:ww,h:20,r:1.5}],m.graphite);rim.position.set(x,-4,.05);
   const glass=armor(face,ww-.35,19.65,.15,1.2,[],mats.glass);glass.position.set(x,-4,-1.05);
   box(face,ww-1,.45,.4,x,5.5,-1.6,p.light);
   armor(face,ww-3,10,.35,.7,[],m.door).position.set(x,-27.5,-.05);
   vent(face,x,-28,ww-7,5,.22);
   for(const dx of [-ww/2+.8,ww/2-.8])for(const y of [-32.3,11.3,23])mesh(face,new T.PlaneGeometry(.65,.65),m.graphite,x+dx,y,.36);
  }
  const surround=new T.Group();face.add(surround);surround.position.set(0,-4,.1);
  armor(surround,31,54,1.3,5.2,[{w:26,h:49,r:4}],m.graphite);
  armor(surround,27,50,.6,4.2,[{w:24.8,h:47.6,r:3.8}],m.seam).position.z=.08;
  armor(surround,24.8,47.6,.9,3.7,[{w:14.8,h:23.8,y:-8,r:1.7}],m.door).position.z=-.15;
  const title=mesh(surround,new T.PlaneGeometry(20,7.5),moduleProfileLabel(profile),0,11,.03);
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
  box(face,f.w-8,3.4,.5,0,-32,-.15,m.graphite);
 }
 // Actual floor/roof openings and passenger clearance match the routing model.
 function deck(parent,y,w,d,thickness,mat){const plate=modulePanel(parent,w,d,thickness,2.3,[{x:24,y:23,w:14,h:14,r:1.2}],mat);plate.rotation.x=-Math.PI/2;plate.position.y=y;return plate;}
 deck(skin,3,90,82,2.4,m.graphite);deck(roof,70,90,82,1.8,m.shell);
 for(const y of [14,43]){
  deck(inside,y,82,73,1.2,mats.interior);
  for(const x of [-37,37])box(skin,.65,1,65,x,y+20,0,p.light);
  box(skin,70,.65,1,0,y+20,33,p.light);
  // Furniture is assembled in three corner bays, outside the cross corridor
  // and the existing vertical well. Repeated equipment shares baked batches.
  for(const [x,z,side]of [[-25,23,0],[25,23,1],[-25,-23,2]]){
   const bay=new T.Group();inside.add(bay);bay.position.set(x,y,z);
   const equip=p.cabinet;
   function bench(){box(bay,19,1.3,12,0,8,0,m.door);for(const dx of [-7,7])box(bay,2,7,9,dx,4,0,m.graphite);}
   function monitor(dx=0,dy=14,dz=-4){box(bay,14,8,.8,dx,dy,dz,m.graphite);box(bay,12.4,6.4,.18,dx,dy,dz+.51,p.light);for(const v of [-1.8,.2,2.2])box(bay,8,.25,.2,dx,dy+v,dz+.64,m.screen);}
   if(profile===0){
    if(side!==1){box(bay,20,3.3,19,0,3,0,m.graphite);box(bay,18,2.2,18,0,5.5,0,m.fabric);box(bay,16,2.1,4,0,7,-6,m.door);box(bay,18,.65,5,0,7,5,p.paint);}
    else{box(bay,20,4,7,0,4,-5,m.fabric);box(bay,20,8,2,0,7,-9,m.fabric);box(bay,15,1,10,0,7,6,m.door);box(bay,2,6,2,0,3.7,6,m.graphite);}
   }else if(profile===1){
    for(const dx of [-6,6]){cyl(bay,4.5,15,dx,9,0,m.door,10);mesh(bay,new T.SphereGeometry(4.5,10,6,0,Math.PI*2,0,Math.PI/2),m.door,dx,16.5,0);cyl(bay,1.1,2,dx,22,0,m.seam,6);box(bay,5,1,.6,dx,10,4.6,p.light);}
    rail(bay,[-9,3,7],[9,3,7],.55,mats.silver);rail(bay,[-9,3,7],[-9,19,7],.55,mats.silver);
   }else if(profile===2){
    if(side===1){cyl(bay,7.5,18,0,11,0,m.graphite,12);for(let a=0;a<6;a++){const angle=a*Math.PI/3;box(bay,1.2,14,1.2,Math.sin(angle)*7.7,11,Math.cos(angle)*7.7,p.light);}for(const v of [2,20])cyl(bay,8.5,1.2,0,v,0,mats.silver,12);}
    else{box(bay,20,22,12,0,11,0,m.graphite);for(const yy of [4,9,14,19]){box(bay,17,3.7,.6,0,yy,6.3,equip);box(bay,4,.6,.4,5,yy,6.8,p.light);}}
   }else if(profile===3){
    for(const dx of [-10,10])for(const zz of [-6,6])box(bay,.7,22,.7,dx,11,zz,mats.silver);
    for(const yy of [3,11,19]){box(bay,21,1,14,0,yy,0,m.door);box(bay,19,.5,11,0,yy+.7,0,m.graphite);box(bay,19,.4,.6,0,yy+5,-5,p.light);for(const xx of [-7,0,7])for(const zz of [-3,3]){const leaf=mesh(bay,new T.IcosahedronGeometry(2.1,0),mats.plant,xx,yy+2.6,zz);leaf.scale.set(1,.85,1);}}
   }else if(profile===4){
    box(bay,10,5,12,0,3,0,m.graphite);box(bay,14,2,21,0,7,0,m.door);box(bay,12,1.3,17,0,8.8,0,m.fabric);box(bay,12,1.8,4,0,10,-6,m.door);for(const dx of [-8,8])rail(bay,[dx,7,-8],[dx,7,8],.45,mats.silver);
    box(bay,7,14,6,-8,7,-9,equip);box(bay,5,4,.3,-8,12,-5.8,p.light);
   }else if(profile===5){
    bench();box(bay,20,11,.8,0,15,-6,m.graphite);for(const dx of [-7,-2,3,7])box(bay,.7,6,.6,dx,15,-5.4,mats.silver);
    if(side===1){cyl(bay,3,2,1,10,2,m.graphite,8);rail(bay,[1,11,2],[-3,18,2],1.4,p.paint);rail(bay,[-3,18,2],[4,20,2],1.1,p.paint);box(bay,2,3,2,5,19,2,m.graphite);}
    else{for(const dx of [-5,5]){box(bay,7,4,6,dx,11,0,equip);box(bay,7,.5,1,dx,12,3.3,p.paint);}}
   }else if(profile===6){
    for(const dx of [-6,6]){box(bay,10,24,14,dx,12,0,m.graphite);for(let yy=3;yy<24;yy+=3){box(bay,8,2.2,.5,dx,yy,7.3,equip);box(bay,.7,.5,.4,dx+2,yy,7.7,p.light);box(bay,3,.3,.4,dx-1,yy,7.7,m.seam);}}
   }else{
    bench();monitor();box(bay,7,1.2,6,0,4.5,9,m.graphite);box(bay,7,6,1,0,7.2,12,m.graphite);box(bay,10,.3,4,0,9,1,equip);
   }
  }
  box(inside,1,.06,54,-7.8,y+.08,0,mats.silver);box(inside,54,.06,1,0,y+.09,7.8,mats.silver);
  for(const z of [-30,-16])box(inside,.7,8,.7,32,y+4,z,mats.silver);
  rail(inside,[32,y+8,-30],[32,y+8,-16],.45,mats.silver);
 }
 for(const z of [-28,-18])rail(inside,[30,3,z],[30,75,z],.5,mats.silver);
 for(let y=4;y<75;y+=3.4)rail(inside,[30,y,-28],[30,y,-18],.5,m.door);
 for(const z of [-29.8,-16.2])rail(inside,[17.5,44,z],[17.5,51,z],.4,mats.silver);
 const well=modulePanel(roof,18,18,6.2,2,[{w:14,h:14,r:1.3}],m.door);well.rotation.x=-Math.PI/2;well.position.set(24,76.3,-23);
 for(const sign of [-1,1]){const hatch=new T.Group();skin.add(hatch);hatch.position.set(24,sign>0?76.5:.3,-23);hatch.rotation.x=sign>0?-Math.PI/2:Math.PI/2;moduleHatchFrame(hatch,true);}
 // Flat armored roof service cover: no projecting domes, cargo or radiators.
 const lid=armor(roof,47,49,1.1,3.5,[],m.door);lid.rotation.x=-Math.PI/2;lid.position.set(-13,71.3,0);
 const rim=armor(roof,50,52,1.5,4,[{w:46,h:48,r:3}],m.graphite);rim.rotation.x=-Math.PI/2;rim.position.set(-13,72.2,0);
 for(const x of [-35,9])for(const z of [-22,22]){box(roof,5.5,1.2,3,x,72.9,z,m.seam);box(roof,2,.3,.7,x,73.6,z,p.light);}
 for(const [x,z]of [[-36,-34],[-36,34],[34,29]]){box(roof,12,.4,8,x,70.4,z,m.graphite);for(let dx=-4;dx<=4;dx+=2)box(roof,.6,.35,7,x+dx,70.8,z,m.seam);}
 for(const x of [-43,43])box(g,3.2,3,60,x,3,0,m.graphite);
 for(const z of [-39,39])box(g,70,2.2,2,0,3,z,m.graphite);
 const person=astronaut(inside,-12,14,12,true);person.scale.x*=.8;person.scale.z*=.8;person.traverse(o=>{if(o.isMesh&&o.geometry.type==='SphereGeometry'){const radius=o.geometry.parameters.radius;o.geometry.dispose();o.geometry=new T.SphereGeometry(radius,12,8);}});
 const inner=bake(inside);inner.forEach(o=>o.userData.layer='interior');g.remove(inside);
 const shell=bake(skin);shell.forEach(o=>o.userData.layer='skin');g.remove(skin);
 return [...bake(g),...shell,...inner];
}
