// Detailed, reference-derived equipment for the room identities. This file
// is inserted in lunar-scene's closure; all materials are lazy and shared.
function moduleInteriorMaterials(){
 if(moduleInteriorMaterials.value)return moduleInteriorMaterials.value;
 const fabricMap=texture(256,256,(c,w,h)=>{
  c.fillStyle='#ded9cc';c.fillRect(0,0,w,h);
  for(let v=0;v<256;v+=3){c.fillStyle=v%2?'#f2eee542':'#7e79632a';c.fillRect(v,0,1,h);c.fillRect(0,v,w,1);}
  for(let y=0;y<h;y+=16)for(let x=0;x<w;x+=16){c.fillStyle='#857c7020';c.fillRect(x+2,y+2,11,1);}
 },[2,2]);
 const panelMap=texture(512,512,(c,w,h)=>{
  c.fillStyle='#737d80';c.fillRect(0,0,w,h);
  for(let y=0;y<h;y+=64){c.fillStyle='#424b4e';c.fillRect(5,y+3,w-10,2);c.fillStyle='#a4b0ad';c.fillRect(16,y+13,88,8);c.fillStyle='#263135';c.fillRect(17,y+31,288,21);
   for(let x=24;x<302;x+=9){c.fillStyle='#919d9e';c.fillRect(x,y+33,2,17);}
   c.fillStyle='#142226';c.fillRect(342,y+17,141,35);c.fillStyle='#8fbfb1';c.font='11px monospace';c.fillText('SYS  0'+(y/64+1),350,y+31);c.fillStyle='#b4d8a5';c.fillRect(458,y+38,10,3);
   for(const x of [8,497]){c.fillStyle='#303b3c';c.beginPath();c.arc(x,y+10,2.3,0,Math.PI*2);c.fill();}}
 });
 const grilleMap=texture(256,256,(c,w,h)=>{
  c.fillStyle='#263136';c.fillRect(0,0,w,h);
  for(let y=7;y<h;y+=10)for(let x=7;x<w;x+=10){c.fillStyle='#111c22';c.beginPath();c.arc(x+(y%20?0:5),y,3,0,Math.PI*2);c.fill();c.fillStyle='#aab8b640';c.fillRect(x-2,y+3,4,1);}
 });
 const maker=(color,roughness,metalness=0,map=null)=>new T.MeshStandardMaterial({color,roughness,metalness,map,emissive:color,emissiveIntensity:metalness>.7?.07:.13,envMapIntensity:.72});
 const interiorFinish=(mat,family,name=family)=>{mat.name=name;mat.userData.surfaceSpec={family};return mat;};
 return moduleInteriorMaterials.value={
  linen:interiorFinish(maker('#e8dfcf',.97,0,fabricMap),'woven-fabric','woven-fabric-linen'),seat:interiorFinish(maker('#66767c',.91,0,fabricMap),'interior-upholstery','interior-upholstery-seat'),blanket:interiorFinish(maker('#ab713e',.94,0,fabricMap),'interior-upholstery','interior-upholstery-blanket'),
  // Dedicated finish requests keep fabrics, acoustic liners and countertops
  // distinct from exterior paint and the ceramic vessels used by equipment.
  wall:interiorFinish(maker('#dce1dc',.82,0),'interior-wall','interior-wall-panel'),worktop:interiorFinish(maker('#dbe3df',.43,0),'interior-worktop'),
  porcelain:maker('#dbe3df',.47,.1),steel:maker('#aabbbc',.37,.88),rubber:maker('#17262a',.93,.02),braid:maker('#79858a',.57,.76),
  amber:maker('#c99232',.48,.3),red:maker('#b8473e',.65,.06),leaf:maker('#4b793c',.83),youngLeaf:maker('#88a857',.8),soil:maker('#283328',1),
  panel:maker('#e0e8e2',.64,.44,panelMap),grille:maker('#a9b7b8',.8,.52,grilleMap),
  warmLED:new T.MeshStandardMaterial({color:'#efe4c8',emissive:'#ffe6bc',emissiveIntensity:.9,roughness:.5}),
  taskLED:new T.MeshStandardMaterial({color:'#dfede8',emissive:'#c5e0df',emissiveIntensity:.75,roughness:.42})
 };
}

// Readable dashboard layouts rather than luminous blank polygons. Every room
// reuses its two screen atlases, including medical traces and lunar navigation.
function moduleInteriorDisplay(profile,variant=0){
 const cache=moduleInteriorDisplay.cache||(moduleInteriorDisplay.cache={}),key=profile+':'+variant;
 if(cache[key])return cache[key];
 const identity=moduleProfiles()[profile],map=texture(512,320,(c,w,h)=>{
  const ink=identity.color;c.fillStyle='#08161e';c.fillRect(0,0,w,h);
  c.fillStyle='#152b36';c.fillRect(0,0,w,43);c.fillStyle='#d4e5e5';c.font='600 20px monospace';c.fillText(identity.code+' / '+['SYSTEM OVERVIEW','OPERATIONS 02'][variant%2],18,28);
  c.fillStyle=ink;c.fillRect(18,51,6,6);c.font='11px monospace';c.fillText('ONLINE  •  LUNAR STATION  /  SOL 042',34,59);
  c.strokeStyle='#46636e70';c.lineWidth=1;
  for(let x=18;x<352;x+=24){c.beginPath();c.moveTo(x,76);c.lineTo(x,239);c.stroke();}
  for(let y=76;y<242;y+=24){c.beginPath();c.moveTo(18,y);c.lineTo(349,y);c.stroke();}
  if(profile===7||profile===6){
   c.strokeStyle=ink;c.lineWidth=1.5;
   for(const r of [29,58,85]){c.beginPath();c.ellipse(179,157,r,r*.73,-.22,0,Math.PI*2);c.stroke();}
   c.beginPath();c.moveTo(74,157);c.lineTo(284,157);c.moveTo(179,78);c.lineTo(179,235);c.stroke();
   if(profile===7&&variant){c.fillStyle='#abbcc0';c.beginPath();c.arc(179,157,54,0,Math.PI*2);c.fill();
    for(let i=0;i<24;i++){const a=i*2.4,r=14+((i*19)%36);c.fillStyle=i%2?'#72848b':'#d5dddd';c.beginPath();c.ellipse(179+Math.cos(a)*r,157+Math.sin(a)*r,3+i%5,2+i%3,0,0,Math.PI*2);c.fill();}}
   else for(let i=0;i<13;i++){const a=i*2.4;c.fillStyle=ink;c.fillRect(176+Math.cos(a)*(24+i*4),155+Math.sin(a)*(18+i*3),5,5);}
  }else{
   for(let row=0;row<3;row++){c.strokeStyle=[ink,'#94bbd0','#b4c5a3'][row];c.lineWidth=1.8;c.beginPath();
    for(let x=18;x<349;x+=3){const q=(x+variant*27+row*17)%82;const pulse=profile===4?(q>44&&q<57?Math.sin((q-44)/13*Math.PI*2)*20:Math.sin(x*.1)*1.3):Math.sin(x*.033+row)*13+Math.sin(x*.12+row)*4;const y=107+row*51+pulse;x===18?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();}
  }
  const labels=profile===4?['HR  72','O2  98%','BP 120/80']:profile===1?['O2  21.0%','H2O 98.4%','CO2  420']:profile===2?['BUS  480V','SOC  94%','LOAD 62%']:profile===3?['TEMP 23.1','RH  64.5%','PH  6.20']:['NOMINAL','LOAD  42%','LINK  99%'];
  for(let i=0;i<3;i++){c.fillStyle='#182e39';c.fillRect(365,77+i*56,132,47);c.fillStyle=ink;c.font='15px monospace';c.fillText(labels[i],373,99+i*56);c.fillStyle='#526f79';c.fillRect(374,111+i*56,109,3);c.fillStyle=ink;c.fillRect(374,111+i*56,65+i*13,3);}
  c.fillStyle='#0e2631';c.fillRect(18,254,478,49);c.font='10px monospace';
  for(let i=0;i<7;i++){c.fillStyle='#75929c';c.fillText(['FLOW','CORE','AIR','GRID','MEM','TEMP','SYNC'][i],27+i*67,269);c.fillStyle=ink;c.fillRect(28+i*67,289-(i*7+variant*3)%13,39,5+(i*7+variant*3)%13);}
 });
 return cache[key]=new T.MeshStandardMaterial({map,emissiveMap:map,color:'#c6d8df',emissive:'#d5edf4',emissiveIntensity:.48,roughness:.3,metalness:.06});
}

function moduleInteriorLabel(textValue,color='#c9d3cd'){
 // One padded atlas for every printed label, tool legend and soft-stowage
 // detail. Unique wording must never introduce another room draw batch.
 const tiles=moduleInteriorLabel.tiles||(moduleInteriorLabel.tiles=new Map()),key=textValue+color,card=textValue.startsWith('@');
 if(!moduleInteriorLabel.cache){
  // Square detail cards occupy the first 256px row at their native aspect
  // ratio. Printed legends use the remaining narrow rows of this one atlas.
  const map=texture(2048,2048,(c,w,h)=>{c.fillStyle='#263337';c.fillRect(0,0,w,h);});
  const atlas=new T.MeshStandardMaterial({map,roughness:.83,metalness:0});atlas.name='interior-print-atlas';
  atlas.userData.interiorAtlas=true;moduleInteriorLabel.cache={atlas};
 }
 const mat=moduleInteriorLabel.cache.atlas;if(tiles.has(key))return mat;
 const index=[...tiles.values()].filter(tile=>tile.card===card).length;
 if(index>=(card?8:224))throw Error('Interior detail atlas capacity exceeded');
 const x=(index%8)*256,y=card?0:256+Math.floor(index/8)*64,tileHeight=card?256:64,c=mat.map.image.getContext('2d');
 c.save();c.translate(x+4,y+4);c.beginPath();c.rect(0,0,248,tileHeight-8);c.clip();c.fillStyle='#263337';c.fillRect(0,0,248,tileHeight-8);
 c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;
 if(card){
  c.scale(248/256,248/256);
  if(textValue==='@KEYBOARD'){
   c.fillStyle='#172429';c.fillRect(0,0,256,256);
   for(let row=0;row<5;row++)for(let col=0;col<13;col++){const xx=8+col*18.5,yy=13+row*38;c.fillStyle=row===0?'#647b7d':'#62706f';c.fillRect(xx,yy,15,29);c.fillStyle='#d4ddd5';c.font='11px monospace';c.fillText(String.fromCharCode(65+(row*13+col)%26),xx+7,yy+14);}
   c.fillStyle='#6a7e7b';c.fillRect(61,216,115,23);c.fillRect(198,216,39,23);
  }else if(textValue==='@CHECKLIST'){
   c.fillStyle='#d1d6c5';c.fillRect(0,0,256,256);c.fillStyle='#263a3d';c.font='bold 21px monospace';c.fillText('SOL 042 / LOG',128,23);
   for(let i=0;i<6;i++){c.strokeStyle='#6b7b71';c.lineWidth=2;c.strokeRect(17,46+i*30,13,13);c.fillStyle='#69766f';c.fillRect(45,50+i*30,173-i%3*19,3);if(i<4){c.strokeStyle='#427f6c';c.beginPath();c.moveTo(19,51+i*30);c.lineTo(23,57+i*30);c.lineTo(31,44+i*30);c.stroke();}}
   c.fillStyle='#ab793e';c.fillRect(14,239,228,4);
  }else if(textValue==='@POUCH'){
   c.fillStyle='#6e7b75';c.fillRect(0,0,256,256);c.fillStyle='#263432';c.fillRect(11,36,234,12);c.fillStyle='#b4b7a2';
   for(let i=14;i<245;i+=9){c.fillRect(i,37,3,10);c.fillRect(i,226,4,2);c.fillRect(15,i,2,4);c.fillRect(239,i,2,4);}
   c.fillStyle='#d3ccaf';c.fillRect(153,88,73,43);c.fillStyle='#3c4b43';c.font='bold 16px monospace';c.fillText('CREW',188,111);c.fillStyle='#9fa896';c.fillRect(46,151,169,40);c.fillStyle='#7c8b7a';c.fillRect(46,151,169,3);
  }else if(textValue==='@TRAY'){
   c.fillStyle='#536663';c.fillRect(0,0,256,256);c.strokeStyle='#a9beba';c.lineWidth=5;
   for(const xx of [41,100,160,216]){c.beginPath();c.moveTo(xx,34);c.lineTo(xx,212);c.stroke();c.beginPath();c.arc(xx,53,11,0,Math.PI*2);c.stroke();}c.strokeStyle='#243d3c';c.lineWidth=2;c.strokeRect(12,12,232,232);
  }else if(textValue==='@PATCH'){
   c.fillStyle='#162a31';c.fillRect(0,0,256,256);
   for(let i=0;i<4;i++)for(let j=0;j<6;j++){c.fillStyle='#a2b8b2';c.fillRect(14+j*40,20+i*58,25,23);c.fillStyle='#1b363d';c.fillRect(18+j*40,24+i*58,17,12);c.fillStyle=(i+j)%3?'#7aba9c':'#d1a65d';c.fillRect(16+j*40,47+i*58,6,4);}
  }else{
   c.fillStyle='#26373a';c.fillRect(0,0,256,256);c.strokeStyle='#b3bdb0';c.lineWidth=4;c.strokeRect(8,8,240,240);c.fillStyle=color;c.font='bold 30px monospace';c.fillText('LOCK',128,104);c.font='18px monospace';c.fillText('SERVICE ONLY',128,146);
   for(let i=-40;i<270;i+=40){c.fillStyle='#c3a255';c.beginPath();c.moveTo(i,230);c.lineTo(i+22,230);c.lineTo(i+42,256);c.lineTo(i+20,256);c.fill();}
  }
 }else{
  const lines=textValue.split('|');c.font=lines.length>1?'bold 19px monospace':'bold 27px monospace';
  lines.forEach((line,i)=>c.fillText(line,124,lines.length>1?17+i*24:28,232));
  c.fillStyle='#a2b6ad';c.fillRect(3,6,2,44);c.fillRect(243,6,2,44);
 }
 c.restore();tiles.set(key,{card,u0:(x+4)/2048,v0:1-(y+tileHeight-4)/2048,u1:(x+252)/2048,v1:1-(y+4)/2048});mat.map.needsUpdate=true;return mat;
}

function moduleDetailedInterior(inside,profile,m,p){
 const s=moduleInteriorMaterials();
 // The same shared floor serves both decks of all room identities.
 // This annotation selects its photographic finish without changing openings.
 m.floor.userData.surfaceSpec={family:'interior-floor'};
 m.floor.name='interior-floor';
 m.fabric.userData.surfaceSpec={family:'interior-upholstery'};
 m.fabric.name='interior-upholstery-base';
 function block(g,w,h,d,x,y,z,mat=m.door){return box(g,w,h,d,x,y,z,mat);}
 function disc(g,r,h,x,y,z,mat=s.steel,n=10){return cyl(g,r,h,x,y,z,mat,n);}
 function rod(g,a,b,r=.2,mat=s.steel){const u=new T.Vector3(...a),v=new T.Vector3(...b),delta=v.clone().sub(u),o=mesh(g,new T.CylinderGeometry(r,r,delta.length(),6),mat);o.position.copy(u.add(v).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;}
 function face(g,w,h,x,y,z,mat){return mesh(g,new T.PlaneGeometry(w,h),mat,x,y,z);}
 function pad(g,w,h,d,x,y,z,mat=s.linen){
  // Rounded upholstery with 48 triangles and continuous corner normals.
  const geo=new T.BoxGeometry(w,h,d,2,2,2),pos=geo.attributes.position,norm=geo.attributes.normal,r=Math.min(w,h,d)*.3;
  for(let i=0;i<pos.count;i++){const v=new T.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)),c=new T.Vector3(Math.max(-w/2+r,Math.min(w/2-r,v.x)),Math.max(-h/2+r,Math.min(h/2-r,v.y)),Math.max(-d/2+r,Math.min(d/2-r,v.z))),n=v.clone().sub(c).normalize();v.copy(c).addScaledVector(n,r);pos.setXYZ(i,v.x,v.y,v.z);norm.setXYZ(i,n.x,n.y,n.z);}
  return mesh(g,geo,mat,x,y,z);
 }
 function feet(g,w,d,y=1){for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])block(g,.9,y,1,x,y/2+.7,z,m.graphite);}
 function decal(g,t,w,h,x,y,z,col='#c9d3cd'){
  const mat=moduleInteriorLabel(t,col),tile=moduleInteriorLabel.tiles.get(t+col),o=face(g,w,h,x,y,z,mat),uv=o.geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,tile.u0+uv.getX(i)*(tile.u1-tile.u0),tile.v0+uv.getY(i)*(tile.v1-tile.v0));
  return o;
 }
 function label(g,t,w,x,y,z,col){return decal(g,t,w,w/4,x,y,z,col);}
 function checklist(g,x,y,z,rotation=0){
  const q=new T.Group();g.add(q);q.position.set(x,y,z);q.rotation.y=rotation;
  block(q,3.7,.16,5,0,0,0,s.rubber);decal(q,'@CHECKLIST',3.35,4.65,0,.091,0).rotation.x=-Math.PI/2;block(q,1.4,.19,.4,0,.17,-2.1,s.steel);
 }
 function keyboard(g,x,y,z,w=7){
  block(g,w,.28,2.9,x,y,z,s.rubber);decal(g,'@KEYBOARD',w-.25,2.68,x,y+.147,z).rotation.x=-Math.PI/2;
 }
 function stowage(g,x,y,z,w=5,h=4){
  pad(g,w,h,1.1,x,y,z,s.seat);decal(g,'@POUCH',w-.2,h-.2,x,y,z+.57);
  block(g,.24,.65,.2,x+w*.29,y+h*.28,z+.69,s.steel);
 }
 function screen(g,x,y,z,w=11,h=7,v=0){block(g,w+.65,h+.65,.8,x,y,z,m.graphite);face(g,w,h,x,y,z+.43,moduleInteriorDisplay(profile,v));block(g,1.2,.15,.1,x+w*.36,y-h*.5-.16,z+.46,p.light);}
 function cabinet(g,x,z,w=9,h=18,d=6,drawers=3){
  block(g,w,h,d,x,h/2+.8,z,p.cabinet);block(g,w+.4,.7,d+.4,x,h+1,z,s.worktop);block(g,w-.8,.8,d-.3,x,1,z,m.graphite);
  for(let i=0;i<drawers;i++){const dh=(h-2)/drawers,yy=2+dh*(i+.5);block(g,w-.65,dh-.32,.36,x,yy,z+d/2+.18,m.door);block(g,w*.35,.32,.5,x,yy+dh*.28,z+d/2+.5,s.steel);}
  // Recessed plinth and rubber edge separate cabinet carcass, doors and top.
  block(g,w-.5,.22,.16,x,h+.55,z+d/2+.36,s.rubber);
 }
 function workstation(g,w=20,d=10){
  block(g,w,1,d,0,9,0,s.worktop);for(const x of [-w/2+1,w/2-1])block(g,1,8,d-2,x,4.7,0,m.graphite);
  block(g,w-.8,.5,.6,0,8.5,d/2-.4,p.paint);block(g,w-2,.7,.65,0,1.3,-d/2+1,s.steel);
  block(g,w-3,.65,.9,0,7.7,-d/2+1,s.rubber); // Under-desk cable tray.
 }
 function chair(g,x,z,rotation=0){
  const q=new T.Group();g.add(q);q.position.set(x,0,z);q.rotation.y=rotation;
  disc(q,.65,3,0,3,0,s.steel,6);for(let i=0;i<4;i++){const a=i*Math.PI/2;rod(q,[0,1.4,0],[Math.sin(a)*3,1.15,Math.cos(a)*3],.3,m.graphite);}
  pad(q,5.6,1.3,5,0,5.1,0,s.seat);const back=pad(q,5.5,6,1.15,0,8,-2.3,s.seat);back.rotation.x=-.1;
  for(const dx of [-3.2,3.2]){rod(q,[dx,5,-1],[dx,7.3,-1],.22);pad(q,1, .6,3.5,dx,7.5,.4,s.rubber);}
 }
 function fan(g,x,y,z,r=2.8){
  const a=disc(g,r+.45,.45,x,y,z,m.graphite,12);a.rotation.x=Math.PI/2;
  const ring=mesh(g,new T.TorusGeometry(r,.17,4,12),s.steel,x,y,z+.3);
  for(let i=0;i<5;i++){const t=i*Math.PI*2/5;const blade=block(g,r*.95,.5,.13,x+Math.sin(t)*r*.48,y+Math.cos(t)*r*.48,z+.35,s.steel);blade.rotation.z=-t+.45;}
  const hub=disc(g,.48,.3,x,y,z+.52,s.rubber,8);hub.rotation.x=Math.PI/2;
 }
 function valve(g,x,y,z,r=.75){
  const wheel=mesh(g,new T.TorusGeometry(r,.16,4,8),p.paint,x,y,z);for(const a of [0,Math.PI/2]){const spoke=block(g,r*1.7,.14,.15,x,y,z,p.paint);spoke.rotation.z=a;}rod(g,[x,y,z-.6],[x,y,z+.2],.2);
 }
 function gauge(g,x,y,z,r=.85){
  const ring=disc(g,r,.3,x,y,z,s.steel,12);ring.rotation.x=Math.PI/2;
  const dial=mesh(g,new T.CircleGeometry(r*.78,12),s.porcelain,x,y,z+.17);
  for(let i=0;i<5;i++){const a=-2.35+i*1.17;rod(g,[x+Math.sin(a)*r*.55,y+Math.cos(a)*r*.55,z+.19],[x+Math.sin(a)*r*.68,y+Math.cos(a)*r*.68,z+.19],.035,s.rubber);}
  rod(g,[x,y,z+.22],[x+r*.42,y+r*.33,z+.22],.045,s.red);
 }
 function plant(g,x,y,z,scale=1,young=false){
  // Individual curved leaves, with a central ridge. No faceted green spheres.
  rod(g,[x,y,z],[x,y+2.3*scale,z],.085*scale,s.leaf);
  for(let i=0;i<5;i++){
   const a=i*2.399,geo=new T.BufferGeometry(),len=(1.6+(i%2)*.65)*scale,wide=.66*scale;
   const points=[0,0,0,-wide,len*.35,len*.43,0,len*.56,len*.72,wide,len*.35,len*.43,0,len*.52,len];
   geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.setAttribute('uv',new T.Float32BufferAttribute([.5,0,0,.43,.5,.72,1,.43,.5,1],2));geo.setIndex([0,1,2,0,2,3,1,4,2,2,4,3]);geo.computeVertexNormals();
   const leaf=mesh(g,geo,young?s.youngLeaf:s.leaf,x,y+.6*scale,z);leaf.rotation.y=a;leaf.rotation.x=(i%2)*.2;
   // Folded leaves need both surfaces in the cutaway view; retain shared mats.
   leaf.material.side=T.DoubleSide;
  }
 }
 function planter(g,x,y,z,scale=1){disc(g,1.5*scale,1.8*scale,x,y+.9*scale,z,s.porcelain,8);disc(g,1.3*scale,.15,x,y+1.86*scale,z,s.soil,8);plant(g,x,y+1.95*scale,z,scale);}
 function bed(g,medical=false){
  block(g,13,1.25,19,-2,4.3,0,m.graphite);block(g,11,2.9,15,-2,2.5,0,medical?s.porcelain:p.cabinet);
  pad(g,12.7,1.5,18.4,-2,5.6,0,medical?s.seat:s.linen);
  const pillow=pad(g,9.5,1.4,4.1,-2,7.05,-6.1,s.linen);pillow.rotation.x=.06;
  if(!medical){pad(g,12.9,.6,10,-2,6.7,3.4,s.linen);pad(g,13.05,.35,4,-2,7,6.1,s.blanket);for(const x of [-8.4,4.4])block(g,.16,.38,9.6,x,6.5,3.4,s.blanket);
   for(const z of [4.5,7.7])block(g,12.5,.045,.09,-2,7.2,z,s.linen);block(g,9,1.8,.24,-2,2.7,7.64,m.door);label(g,'PERSONAL / 02',5,-2,2.8,7.78);}
  else{for(const x of [-9.3,5.3]){rod(g,[x,6,-6.6],[x,6,6.6],.25);for(const z of [-6.6,6.6])rod(g,[x,4.3,z],[x,6,z],.2);}block(g,13,.4,.5,-2,4.8,9.7,s.red);}
  for(const x of [-6,2])for(const z of [-6,6]){const wheel=disc(g,.85,.5,x,1.2,z,s.rubber,8);wheel.rotation.z=Math.PI/2;}
 }
 function bottles(g,x,z,count=3,y=1.1){
  for(let i=0;i<count;i++){const xx=x+i*2.2;disc(g,.67,2.3,xx,y+1.15,z,s.porcelain,8);disc(g,.45,.35,xx,y+2.48,z,profile===4?s.red:p.paint,8);label(g,profile===4?'RX':'N',1,xx,y+1.4,z+.69);}
 }
 function serviceBay(g,variant){
  // A shallow rear liner makes equipment silhouettes readable through glass.
  block(g,23,21.5,.45,0,11.5,-11.1,s.wall);block(g,22,.65,.8,0,22.1,-10.7,s.warmLED);
  for(const x of [-10.7,10.7])block(g,.5,21,.6,x,11.3,-10.75,m.seam);
  block(g,21.8,.75,1.05,0,1.4,-10.35,m.door);block(g,.075,18,.08,0,11.6,-10.83,m.seam);
  const roles=[['REST','MESS','GALLEY'],['AIR','WATER','FILTER'],['BATTERY','THERMAL','DISTRIBUTION'],['CULTURE','NURSERY','ANALYSIS'],['CARE','PHARMACY','DIAGNOSTICS'],['BENCH','ROBOTICS','FABRICATION'],['COMPUTE','COOLING','NETWORK'],['NAVIGATION','MISSION','COMMS'],['TABLE TENNIS','CARDIO','RECOVERY'],['DINING','GALLEY','WASH']];
  label(g,moduleProfiles()[profile].code+' / '+String(variant+1).padStart(2,'0')+'|'+(profile===8&&variant>=3?['STRENGTH','CYCLE','FREE WEIGHTS']:profile===9&&variant>=3?['LOUNGE','TEA BAR','PANTRY']:roles[profile])[variant%3],7,-5.6,20,-10.8);
  // Separate removable wall cassettes, low voltage service ports and a raised
  // cable route keep supplies off the occupied floor and the transfer cross.
  block(g,5,1.8,.38,7.4,2.4,-10.61,m.graphite);
  for(const x of [5.7,7.4,9.1]){block(g,.9,.65,.15,x,2.4,-10.35,m.door);block(g,.4,.3,.17,x,2.4,-10.24,s.rubber);}
  block(g,21,.38,.55,0,21.15,-10.48,m.door);
 }
 function habitation(g,role,level){
  if(role===0){bed(g);cabinet(g,8,-5,5,9,8,3);screen(g,7.8,16,-10.35,5,4,level);block(g,13,1.1,1.2,-2,10.3,-10,s.linen);
   stowage(g,-6.9,14.8,-10.05,5.6,5);block(g,3.6,.35,1.2,-1.5,15.5,-10,s.warmLED);label(g,'CREW 0'+(level+1),4.5,-1.5,12.3,-9.34);
   block(g,3.1,.2,4.3,8,10.65,-4.8,s.rubber);decal(g,'@CHECKLIST',2.9,4,8,10.76,-4.8).rotation.x=-Math.PI/2;
   for(const x of [-7,3]){block(g,.32,.26,13,x,6.94,.8,s.blanket);block(g,.8,.25,.7,x,7.12,2.5,s.steel);}}
  else if(role===1){
   for(const x of [-7.6,7.6]){pad(g,5.8,2.2,15,x,3.3,-1,s.seat);pad(g,1.8,7.4,15,x+(x<0?-2.2:2.2),6.8,-1,s.linen);for(const z of [-5.3,2.3])pad(g,4.6,1,6.3,x,4.8,z,s.linen);pad(g,2.6,3.5,2.8,x,6.4,-6.6,s.blanket);}
   pad(g,8,1,11,0,7,1,s.worktop);block(g,1.3,5.7,1.3,0,3.8,1,m.graphite);planter(g,0,7.5,-1,.55);
   for(const x of [-2.3,2.3])disc(g,.6,.8,x,7.9,3.5,s.porcelain,8);screen(g,0,15.4,-10.5,11,6,level);
   checklist(g,0,7.62,3.9,-.1);for(const x of [-7.6,7.6])block(g,4.9,.22,.32,x,4.17,6.45,s.blanket);
  }else{
   cabinet(g,-5.2,-6.5,9,17,7,4);cabinet(g,5.8,-6.5,9,9,7,2);block(g,9,.7,7.5,5.8,10,-6.5,s.worktop);
   // Galley coffee dispenser, inset basin and personal storage.
   block(g,3.4,4.5,3.8,8,12.6,-7,s.rubber);label(g,'H2O',2.8,8,12.7,-5.04);disc(g,.5,.7,8,10.9,-4.7,s.porcelain,8);
   block(g,4,.2,3.7,3,10.43,-6,s.steel);block(g,3,.2,2.7,3,10.55,-6,m.graphite);rod(g,[3,10.6,-8],[3,13,-8],.18);rod(g,[3,13,-8],[3,13,-6.7],.18);
   workstation(g,12,6);screen(g,0,13.4,0,8,4.8,level);chair(g,0,8.1,Math.PI);planter(g,8.4,.8,6,.7);
   block(g,5,.5,2.8,-5,19.2,-9.1,s.worktop);for(const x of [-6.5,-4]){disc(g,.72,1.65,x,20.25,-9,s.porcelain,8);disc(g,.76,.22,x,21.15,-9,s.amber,8);}label(g,'RATIONS',4.3,-5,16.4,-2.59);
   keyboard(g,0,9.67,1.45,7.5);stowage(g,-7.2,6.8,-2.13,4.1,5);label(g,'POTABLE',3.6,3,8.7,-2.59);
  }
 }
 function lifeSupport(g,role,level){
  if(role===0){
   for(const x of [-6,2]){disc(g,3.2,12,x,9,-2,s.porcelain,12);const cap=mesh(g,new T.SphereGeometry(3.2,10,5,0,Math.PI*2,0,Math.PI/2),s.porcelain,x,15,-2);disc(g,.7,2,x,18.3,-2,s.steel,8);valve(g,x,19,-.95,.7);for(const y of [4.5,13])disc(g,3.33,.5,x,y,-2,s.steel,12);label(g,'O2',3.5,x,10,1.23,'#8bbfc6');}
   rod(g,[-8.8,19,-5.8],[8.7,19,-5.8],.35,s.braid);rod(g,[8.7,19,-5.8],[8.7,3,-5.8],.35,s.braid);block(g,5,9,5,7.8,5.6,4.8,p.cabinet);face(g,4,5,7.8,5.7,7.34,s.grille);screen(g,6,16.7,-10.3,7,5,level);
   for(const x of [-6,2]){gauge(g,x,15.2,1.24,.8);rod(g,[x,18.2,-2],[x,19,-5.8],.23,s.braid);block(g,5.7,.65,6,x,2.6,-2,m.graphite);}
   label(g,'AIR RECOVERY',8,0,3,8.14);block(g,8,2.4,2,0,2.8,7.1,p.cabinet);
  }else if(role===1){
   block(g,20,1.3,13,0,1.5,0,m.graphite);disc(g,3.7,14,-6,9,-3,s.porcelain,12);label(g,'H2O',4,-6,11,.73,'#84c2c9');
   for(const x of [0,4.2,8.3]){disc(g,1.5,8,x,6.5,3,s.steel,10);disc(g,1.75,.6,x,10.6,3,m.door,10);rod(g,[x,10.9,3],[x,14,3],.23);}
   rod(g,[-6,16,-3],[-6,19,-3],.4);rod(g,[-6,19,-3],[8.3,19,-3],.4);rod(g,[8.3,19,-3],[8.3,14,3],.25);rod(g,[0,14,3],[8.3,14,3],.3);valve(g,4.2,14,3.6,.8);screen(g,1.7,16,-10.5,11,6,level);
   block(g,13,3,3,2.1,4,-7,p.cabinet);face(g,12,2,2.1,4,-5.46,s.grille);
   for(const x of [0,4.2,8.3]){gauge(g,x,8.4,4.54,.58);label(g,'F'+(Math.round(x/4.2)+1),1.4,x,5.4,4.54);}
   block(g,5,3,3,-6,3.8,6,s.rubber);label(g,'SAMPLE',4,-6,4,7.56);valve(g,-6,6.1,6,.6);
  }else{
   cabinet(g,5,-4,10,19,10,2);face(g,8,10,5,8,1.2,s.grille);screen(g,5,16,1.25,7,4.2,level);
   block(g,10,17,9,-6,9.5,-3,m.graphite);fan(g,-6,11,1.7,3.5);fan(g,-6,5,1.7,2.3);
   for(const x of [-10,9.7]){rod(g,[x,2,-8],[x,20,-8],.5);valve(g,x,17,-6.7,.7);}rod(g,[-10,20,-8],[9.7,20,-8],.5);bottles(g,-8,6,3);
   label(g,'CO2 SORBENT',7,-5.9,17,1.56);stowage(g,5,4.1,2,6,3.2);gauge(g,9.7,13,-6.8,.75);
  }
 }
 function power(g,role,level){
  if(role===0){
   for(const x of [-5.6,5.6]){block(g,9.8,21,11,x,11.5,-3,m.graphite);for(let i=0;i<4;i++){block(g,8.7,4.4,10.7,x,4+i*4.9,-2.6,p.cabinet);face(g,8,3.8,x,4+i*4.9,2.78,s.panel);for(const dx of [-3.9,3.9])block(g,.28,2,.45,x+dx,4+i*4.9,3.05,s.steel);}label(g,'480 V',5,x,21.4,2.6,'#e3ca72');}
   rod(g,[-10,2,5],[10,2,5],.4,s.amber);rod(g,[-10,2,5],[-10,20,5],.4,s.amber);
   for(const x of [-5.6,5.6]){block(g,3.4,1.1,1.1,x,1.5,5,s.rubber);label(g,'DC BUS',3,x,1.6,5.58);}
  }else if(role===1){
   // Reflective insulation wraps the thermal core under its retaining rings.
   disc(g,7.4,1.1,0,1.5,0,m.graphite,12);disc(g,5.7,16,0,11,0,mats.insulation,12);for(const y of [3.5,6,16.5,19])disc(g,6.1,.6,0,y,0,m.graphite,12);
   for(let i=0;i<8;i++){const a=i*Math.PI/4;block(g,.8,9,.8,Math.sin(a)*5.9,11,Math.cos(a)*5.9,s.amber);block(g,.25,7,.25,Math.sin(a)*6.35,11,Math.cos(a)*6.35,p.light);}
   block(g,6,9,4,8,5.5,-6.5,p.cabinet);screen(g,8,10,-4.3,5,3.6,level);
   for(const x of [-9,9])rod(g,[x,1.4,8],[x,6.8,8],.23,s.amber);rod(g,[-9,6.8,8],[9,6.8,8],.23,s.amber);
   block(g,6,3.4,.35,0,5.5,8,s.rubber);label(g,'THERMAL|KEEP CLEAR',5.6,0,5.5,8.2,'#e8c668');gauge(g,8,7.7,-4.3,.8);
  }else{
   for(const x of [-6,5.5]){cabinet(g,x,-4.5,9.5,20,11,1);face(g,7.8,12,x,10,1.24,s.panel);block(g,.4,6,.5,x+3.8,11,1.7,s.rubber);screen(g,x,18,1.4,5.7,3,level);}
   workstation(g,15,5);block(g,13,.4,4,0,9.75,0,m.graphite);const panel=face(g,12,3,0,10,.3,moduleInteriorDisplay(profile,1));panel.rotation.x=-Math.PI/2;
   rod(g,[-10,21,-9],[10,21,-9],.3,s.amber);label(g,'ISOLATE',6,6,3,1.46,'#e8c668');
   for(const x of [-6,5.5]){block(g,2.2,2.2,.2,x,5.3,1.3,s.rubber);decal(g,'@ISOLATE',1.95,1.95,x,5.3,1.42);}
   checklist(g,6.2,21.46,-6.4,.1);
  }
 }
 function growRack(g,x,z,w=20,d=10,young=false){
  for(const dx of [-w/2,w/2])for(const dz of [-d/2,d/2])block(g,.48,20.5,.48,x+dx,11,z+dz,s.steel);
  for(const y of [3,10.5,18]){
   block(g,w+1,.85,d+1,x,y,z,s.porcelain);block(g,w-1,.22,d-1,x,y+.5,z,s.soil);
   for(const xx of [-.32,0,.32])for(const zz of [-d*.23,d*.23]){disc(g,.65,.45,x+xx*w,y+.75,z+zz,s.rubber,6);plant(g,x+xx*w,y+.9,z+zz,young?.66:.85,young);}
   block(g,w-.8,.3,.65,x,y+4.6,z-d*.38,s.taskLED);
  }
  rod(g,[x+w/2+.3,2,z],[x+w/2+.3,20,z],.22);block(g,5,1.7,3,x,1.5,z,s.rubber);
  for(const y of [3,10.5,18]){rod(g,[x-w*.43,y+1,z-d*.38],[x+w*.43,y+1,z-d*.38],.12,s.rubber);label(g,young?'SEEDLING':'CULTURE',4.6,x,y+.05,z+d/2+.52,'#b8d294');}
 }
 function biology(g,role,level){
  if(role===0)growRack(g,0,-1,19,12,Boolean(level));
  else if(role===1){
   growRack(g,-4.7,-2,10,13,true);cabinet(g,7,-6,6.5,10,7,2);screen(g,7,15,-9.8,6,4.5,level);
   disc(g,2.2,8,7,5.4,3,s.porcelain,10);label(g,'FEED',3,7,5.8,5.25);rod(g,[7,9.5,3],[7,12,3],.2);rod(g,[7,12,3],[-1,12,3],.2);planter(g,6.8,9.5,-6,.7);
   gauge(g,7,8.3,5.27,.65);stowage(g,7,3.9,-1.5,4.6,3.2);label(g,'NUTRIENTS',4.7,7,8.3,-2.39);
  }else{
   workstation(g,21,12);cabinet(g,-6.5,-1,6.5,7,8,3);block(g,8,.35,8,3,9.65,0,m.graphite);
   for(const x of [.5,4.5])for(const z of [-2,2])planter(g,x,9.85,z,.52);screen(g,-5,15,-9.8,8,5,level);bottles(g,5,-8,3,9.5);
   block(g,3.5,.7,3.5,-6,10,-1,s.porcelain);rod(g,[-6,10,-1],[-6,14,-1],.5);rod(g,[-6,14,-1],[-3.8,16,-1],.4);disc(g,1,.35,-6,12.2,0,s.rubber,8);
   label(g,'SAMPLE 042',7,4,7,6.08);chair(g,0,8.5,Math.PI);
   checklist(g,-8.5,9.7,2.9,-.08);block(g,4.2,.45,3.7,7.5,10,2,s.porcelain);decal(g,'@TRAY',3.9,3.4,7.5,10.24,2).rotation.x=-Math.PI/2;
   block(g,6.5,.6,3,7.2,9.2,-8.3,s.worktop);for(const x of [4.5,9.6])rod(g,[x,9,-7.4],[x,6,-10.6],.17,s.steel);
  }
 }
 function medical(g,role,level){
  if(role===0){
   bed(g,true);cabinet(g,8,-5,5,10,7,3);screen(g,7.8,15.5,-4,5,4.2,level);rod(g,[7.8,11,-4.5],[7.8,14,-4.5],.25);
   rod(g,[-9.5,1,-7.5],[-9.5,21,-7.5],.2);rod(g,[-9.5,21,-7.5],[-6.2,21,-7.5],.2);block(g,1.5,3,.8,-6.5,18.6,-7.5,s.porcelain);rod(g,[-6.5,17,-7.5],[-6.5,7,-7.5],.07,s.rubber);
   block(g,2.5,.5,.15,7.8,9.5,-1.4,s.red);block(g,.5,2.5,.15,7.8,9.5,-1.4,s.red);
   block(g,3.8,4.2,1.1,-8.6,11.5,-10,s.porcelain);label(g,'O2 / VAC',3.4,-8.6,12.5,-9.43);gauge(g,-8.6,10.8,-9.4,.58);
   rod(g,[7.8,14,-4.4],[9.6,10,-4.4],.1,s.rubber);rod(g,[9.6,10,-4.4],[5.3,6.6,-3.8],.1,s.rubber);stowage(g,7.8,5.5,-1.35,4.2,3);
  }else if(role===1){
   for(const x of [-6.2,5.8]){block(g,9.5,20,.5,x,10.8,-9.25,p.cabinet);for(const dx of [-4.5,4.5])block(g,.5,20,8,x+dx,10.8,-5.5,p.cabinet);block(g,9.5,.7,8,x,21,-5.5,s.porcelain);block(g,9.5,3,8,x,2.3,-5.5,p.cabinet);
    for(const y of [5,10.5,16]){block(g,8.7,.45,7.8,x,y,-5,s.steel);for(const dx of [-2.4,0,2.4]){block(g,1.7,3,3,x+dx,y+1.7,-2.5,s.porcelain);block(g,1.65,.4,.13,x+dx,y+2,-.93,s.red);}}
    label(g,x<0?'STERILE':'PHARMACY',7,x,19,-1.35);}
   block(g,18,2.6,5,0,2.1,5,p.cabinet);bottles(g,-5,5,5,3.5);screen(g,0,16,3.5,8,4.8,level);rod(g,[0,3.5,3.2],[0,15,3.2],.35);
   for(const x of [-6.2,5.8])label(g,'SEALED / 042',6,x,3,-1.43);checklist(g,-7,3.52,5,-.04);
  }else{
   workstation(g,21,10);cabinet(g,-6,0,7,7,8,3);screen(g,-5.5,16,-9.8,8,6,0);screen(g,5.5,16,-9.8,8,6,1);
   block(g,6,6,6,5.5,12.5,-1,p.cabinet);disc(g,2.4,.5,5.5,15.75,-1,s.steel,12);label(g,'SCAN',4,5.5,13,2.1);
   block(g,7,.25,3.5,-4,9.65,1,s.rubber);bottles(g,-8,-5,3,9.5);chair(g,0,8.3,Math.PI);
   decal(g,'@TRAY',6.6,3.2,-4,9.79,1).rotation.x=-Math.PI/2;label(g,'CENTRIFUGE',5,5.5,10.9,2.11);
  }
 }
 function workshop(g,role,level){
  workstation(g,21,13);cabinet(g,-6.8,-1,6,7,9,4);
  if(role===0){
   block(g,20,10,.55,0,16,-9,m.graphite);face(g,19,9,0,16,-8.7,s.grille);
   for(let i=0;i<6;i++){const x=-8+i*3.2,yy=16.5+(i%2);block(g,.65,4,.65,x,yy,-8,s.steel);block(g,1.6,.9,.7,x,yy+2,-8,i<3?s.steel:s.amber);if(i%2)block(g,1.8,.8,.7,x,yy-2,-8,s.rubber);}
   block(g,5,2,4,4,10.5,1,s.steel);block(g,1.1,2.5,4,1.5,11,1,m.graphite);block(g,1.1,2.5,4,6.5,11,1,m.graphite);rod(g,[0,10.7,1],[8,10.7,1],.27);block(g,3,.6,2,-5,9.8,2,s.amber);
  }else if(role===1){
   disc(g,3,1.3,3.5,10.3,0,m.graphite,10);disc(g,2.4,2,3.5,11.7,0,p.paint,10);
   rod(g,[3.5,12.7,0],[-1.8,17.5,0],1.05,p.paint);rod(g,[-1.8,17.5,0],[3.5,20,0],.85,p.paint);rod(g,[3.5,20,0],[6.2,16.7,0],.6,p.paint);
   for(const [x,y]of [[3.5,12.7],[-1.8,17.5],[3.5,20]]){const a=disc(g,1.15,2.3,x,y,0,m.graphite,10);a.rotation.x=Math.PI/2;}
   for(const x of [5.6,6.8])block(g,.45,2,.7,x,15.5,0,s.steel);block(g,5,.7,5,5,9.9,4,m.graphite);block(g,2.5,2,2.5,5,11.1,4,s.steel);
   screen(g,-6.2,15,-9.8,6.8,4.5,level);block(g,6,1,3,-6,9.8,3,s.rubber);
  }else{
   block(g,11,1,10,2,10,-1,m.graphite);for(const x of [-2.5,6.5]){block(g,1.2,11,1.5,x,16,-5,p.cabinet);rod(g,[x,10,-3.8],[x,21,-3.8],.3);}
   block(g,10.8,1.8,2,2,20.7,-4.5,p.cabinet);block(g,3,4,3,2,17.8,-3,p.cabinet);disc(g,.6,3,2,14.5,-3,s.steel,8);block(g,5,1.2,4,2,11.2,-2,s.steel);
   screen(g,-6.8,15,-8.6,6.2,4.4,level);label(g,'CNC / 02',6,2,20.7,-3.43);bottles(g,5,4.5,2,9.5);
  }
  for(const x of [-7,7]){block(g,5,3.5,5,x,2.6,7.5,m.graphite);block(g,5.1,.45,5.1,x,4.5,7.5,p.paint);block(g,2,.35,.5,x,3.5,10.1,s.steel);}
  block(g,4.5,.5,3.3,-6,9.8,4,s.rubber);decal(g,'@TRAY',4.2,3,-6,10.07,4).rotation.x=-Math.PI/2;
  label(g,role===0?'HAND TOOLS':role===1?'ROBOT CELL':'FABRICATION',8,0,7.1,6.57);
  if(role!==0){keyboard(g,-6.3,9.7,.15,5.5);rod(g,[-6.3,8.2,-3],[-6.3,14,-9],.1,s.rubber);}
 }
 function serverRack(g,x,z,w=9,h=22){
  block(g,w,h,10,x,h/2+1,z,m.graphite);for(const dx of [-w/2+.45,w/2-.45])block(g,.45,h-.5,.55,x+dx,h/2+1,z+5.1,s.steel);
  for(let i=0;i<6;i++){const yy=3+i*3.35;block(g,w-1.3,2.7,.45,x,yy,z+5.3,p.cabinet);face(g,w-1.8,2.2,x,yy,z+5.54,s.panel);block(g,.25,1.2,.1,x+w/2-1.25,yy,z+5.63,p.light);}
  face(g,w-1,16,x,11,z-5.02,s.grille).rotation.y=Math.PI;label(g,'NODE 0'+(x<0?'1':'2'),w-2,x,21.7,z+5.15);
  block(g,w-.8,.75,.7,x,1.5,z+5.2,s.rubber);for(const y of [5,12,19]){rod(g,[x-w/2+.1,y,z+5.55],[x-w/2+.1,y+1.7,z+5.55],.13,s.braid);block(g,.36,.32,.2,x-w/2+.1,y+.4,z+5.69,p.light);}
 }
 function dataCore(g,role,level){
  if(role===0){serverRack(g,-5.8,-3);serverRack(g,5.8,-3);for(const x of [-10.8,10.8])rod(g,[x,2,-8],[x,22,-8],.3,s.steel);}
  else if(role===1){
   serverRack(g,-5.7,-3,9);block(g,9,21,9,5.5,11.5,-2.5,p.cabinet);for(const yy of [6,12,18])fan(g,5.5,yy,2.2,2.5);
   for(const x of [1,10])rod(g,[x,2,3],[x,21,3],.4,s.steel);rod(g,[1,21,3],[10,21,3],.4);valve(g,10,5,3.9,.65);label(g,'COOLANT',7,5.5,21,2.11,'#aeade2');
   gauge(g,10,9,3.6,.65);label(g,'SUPPLY',3.3,2,2.2,3.51);label(g,'RETURN',3.3,8.5,2.2,3.51);
  }else{
   serverRack(g,-7.3,-5.5,6.3,21);serverRack(g,7.3,-5.5,6.3,21);workstation(g,13,8);
   screen(g,0,15,-3,11,7,level);rod(g,[0,9.5,-3.6],[0,14,-3.6],.35);chair(g,0,8.4,Math.PI);
   for(const x of [-7.3,7.3]){block(g,5,3.4,.3,x,18.5,-.13,m.graphite);decal(g,'@PATCH',4.7,3.1,x,18.5,.04);}
   checklist(g,4.45,9.7,.8,-.02);keyboard(g,-1.8,9.7,2.1,7.3);
  }
 }
 function command(g,role,level){
  workstation(g,21,11);for(const x of [-6.8,6.8])cabinet(g,x,-1,5.7,7,8,2);
  if(role===1){screen(g,0,16.3,-8.9,19.5,9.2,1);label(g,'MISSION CONTROL',12,0,22,-10.79);}
  else{for(const x of [-5.3,5.3]){const q=new T.Group();g.add(q);q.position.set(x,16,-8);q.rotation.y=x<0?.09:-.09;screen(q,0,0,0,9.4,7.4,(level+(x>0?1:0))%2);}}
  for(const x of [-5.2,5.2]){
   block(g,8.8,.6,4.5,x,9.8,.3,m.graphite);const q=face(g,7.8,3.6,x,10.14,.3,moduleInteriorDisplay(profile,x>0?1:0));q.rotation.x=-Math.PI/2;
   for(let i=0;i<3;i++)block(g,.75,.17,.65,x-1.5+i*1.5,10.25,2.6,i===2?p.paint:s.steel);
  }
  chair(g,role===2?-3.4:0,8.5,Math.PI);if(role===2){disc(g,.5,2.3,7.8,10.5,3.2,s.rubber,8);disc(g,1,.6,7.8,11.9,3.2,s.rubber,8);}else disc(g,.63,.9,9,10.2,3.3,s.porcelain,8);
  checklist(g,-8.3,9.7,3.3,-.12);stowage(g,-6.8,4.5,3.2,4.2,3.5);
  block(g,3.5,.4,2.5,0,9.7,3.5,s.rubber);rod(g,[0,10,3.5],[0,12.5,3.5],.12);rod(g,[0,12.5,3.5],[-.8,13,3.2],.12);disc(g,.3,.8,-.8,13.3,3.2,s.rubber,8);
  label(g,role===2?'UPLINK / COMMS':role===1?'MISSION OPS':'NAVIGATION',10,0,7.2,5.58);
 }
 function gym(g,role,level){
  // Equipment stays inside its existing service bay; the central walking cross
  // and the opposite ladder bay remain clear on both decks.
  if(!s.tableBlue){s.tableBlue=s.worktop.clone();s.tableBlue.color.set('#236b82');s.tableBlue.roughness=.88;s.tableBlue.metalness=0;s.tableBlue.name='gym-table-matte';s.tableBlue.userData.surfaceSpec={family:'coated-alloy'};}
  block(g,23,.18,21,0,.13,0,s.rubber);
  function weight(q,x,y,z,r=1.2){const o=disc(q,r,.65,x,y,z,s.rubber,12);o.rotation.z=Math.PI/2;const hub=disc(q,.3,.72,x,y,z,s.steel,8);hub.rotation.z=Math.PI/2;}
  function dumbbell(q,x,y,z,size=1){rod(q,[x-2*size,y,z],[x+2*size,y,z],.18,s.steel);for(const dx of [-1.55,1.55])weight(q,x+dx*size,y,z,.85*size);}
  function treadmill(x){
   const q=new T.Group();g.add(q);q.position.x=x;
   block(q,8.4,1.1,18,0,1.15,0,m.graphite);block(q,6.5,.14,15,0,1.78,.5,s.rubber);
   for(const xx of [-3.9,3.9]){block(q,.65,.3,16,xx,1.8,.5,s.steel);rod(q,[xx,1,-6],[xx,12,-6],.35);rod(q,[xx,10,-6],[xx,9,1.5],.28,s.rubber);}
   for(let zz=-6;zz<8;zz+=1.2)block(q,6.2,.025,.07,0,1.87,zz,m.seam);
   block(q,8.2,1.5,3,0,12,-6,s.rubber);screen(q,0,13,-5.8,5.5,2.7,0);block(q,.7,.3,.7,0,11.95,-4.45,s.red);
   for(const xx of [-3.2,3.2]){disc(q,.6,.3,xx,13,-5.6,s.rubber,8);block(q,.7,.18,9,xx,1.98,1,p.paint);}
  }
  function bicycle(x){
   const q=new T.Group();g.add(q);q.position.x=x;
   for(const z of [-5,5])block(q,7,.7,1.2,0,.8,z,m.graphite);
   rod(q,[0,1,-5],[0,7,0],.55,s.steel);rod(q,[0,7,0],[0,1,5],.55,s.steel);rod(q,[0,3,-3],[0,10,2],.48,p.paint);
   const wheel=disc(q,3,.9,0,3.5,-3,m.graphite,20);wheel.rotation.z=Math.PI/2;weight(q,0,3.5,-3,2.6);
   rod(q,[0,6,2],[0,10.5,2],.35);pad(q,3.6,.85,4.1,0,10.9,2,s.seat);
   rod(q,[0,2,-5],[0,13,-5],.4);rod(q,[-3,13,-5],[3,13,-5],.3,s.rubber);screen(q,0,14.3,-5.2,3.7,2.2,1);
   for(const sign of [-1,1]){rod(q,[sign*.9,4,0],[sign*1.8,4+sign,0],.18);block(q,1.8,.45,2,sign*2,4+sign,0,s.rubber);}
  }
  if(!level&&role===0){
   // 2.74 x 1.525 m tabletop after the module's 1.25 X/Z scale; 0.76 m high.
   block(g,21.92,.42,12.2,0,7.39,0,s.tableBlue);block(g,21.6,.7,11.9,0,6.95,0,m.graphite);
   for(const x of [-10.82,10.82])block(g,.16,.035,12,x,7.62,0,s.worktop);
   for(const z of [-6,6])block(g,21.7,.035,.16,0,7.62,z,s.worktop);block(g,21.7,.035,.09,0,7.62,0,s.worktop);
   for(const x of [-7.6,7.6]){for(const z of [-4.3,4.3]){rod(g,[x,.5,z],[x,6.95,z],.34);const wheel=disc(g,.5,.42,x,.56,z,s.rubber,8);wheel.rotation.x=Math.PI/2;}rod(g,[x,2,-4.3],[x,2,4.3],.25);}
   for(const z of [-4.3,4.3])rod(g,[-7.6,5,z],[7.6,5,z],.22);
   // A real open net grid, with posts and pale top tape, readable from either side.
   for(const z of [-6.5,6.5])rod(g,[0,7.3,z],[0,9.12,z],.12,m.graphite);
   for(let z=-6.3;z<=6.3;z+=.55)rod(g,[0,7.65,z],[0,9.06,z],.018,s.worktop);
   for(const y of [7.7,8.15,8.6,9.06])rod(g,[0,y,-6.5],[0,y,6.5],.022,s.worktop);
   block(g,.09,.12,13,0,9.12,0,s.worktop);
   for(const [x,z,color]of [[-7,3,s.red],[7,-3,s.rubber]]){const paddle=disc(g,.64,.13,x,7.77,z,color,14);paddle.scale.z=1.25;block(g,.3,.14,1.1,x,7.76,z+.95,s.amber);}
   mesh(g,new T.SphereGeometry(.16,8,6),s.worktop,-5.6,7.8,2.4);label(g,'TABLE TENNIS',9,0,18,-10.78);
  }else if(!level&&role===1){treadmill(-5.3);treadmill(5.3);label(g,'CARDIO / TREADMILL',13,0,19,-10.78);}
  else if(level&&role===0){
   for(const x of [-8,8]){block(g,1,21,1,x,11,-5,s.steel);block(g,1,.75,16,x,.8,0,m.graphite);for(let y=7;y<19;y+=2)block(g,.4,.4,.4,x,y,-4.35,s.rubber);}
   rod(g,[-8,21,-5],[8,21,-5],.35,s.steel);rod(g,[-8,20,-5],[-5,20,0],.3,s.rubber);rod(g,[8,20,-5],[5,20,0],.3,s.rubber);
   rod(g,[-10,13,-3],[10,13,-3],.24);for(const x of [-9,-7,7,9])weight(g,x,13,-3,2.1);
   block(g,1.2,3.5,11,0,2.6,2,m.graphite);pad(g,5.2,1.2,12,0,4.7,2,s.seat);for(const z of [-3,7])block(g,6,.65,1,0,1,z,s.steel);
   label(g,'STRENGTH / RACK',13,0,23,-10.7);
  }else if(level&&role===1){bicycle(-5.3);bicycle(5.3);label(g,'CYCLE / ENDURANCE',13,0,20,-10.78);}
  else{
   cabinet(g,-7,-7,6,18,5,3);label(g,'TOWELS',4.5,-7,16,-4.29);bottles(g,-8,-6,2,19.5);
   if(level){for(const y of [3,7,11]){block(g,12,.45,4,3,y,-5,m.graphite);for(const x of [-1,3,7])dumbbell(g,x,y+1,-5,.75+(y/30));}for(const x of [-3,9])rod(g,[x,.5,-5],[x,12,-5],.3);}
   else{for(const x of [-4,5]){pad(g,6.2,.35,13,x,.6,2,s.seat);for(const z of [-2,4])block(g,5.5,.04,.08,x,.8,z,s.linen);}disc(g,1,4,8,3,-7,s.blanket,12);}
   screen(g,2,18,-10.5,10,5,1);label(g,level?'FREE WEIGHTS':'MOBILITY / RECOVERY',12,0,23,-10.7);
  }
 }
 function dining(g,role,level){
  // Furniture stays in the three existing bays, clear of hatches and ladders.
  function mug(x,y,z){disc(g,.64,1.15,x,y+.57,z,s.porcelain,12);disc(g,.5,.035,x,y+1.16,z,s.soil,12);const handle=mesh(g,new T.TorusGeometry(.43,.12,6,10),s.porcelain,x+.7,y+.6,z);handle.rotation.y=Math.PI/2;}
  function placeSetting(x,z){
   pad(g,4.7,.12,5.8,x,7.95,z,s.rubber);disc(g,1.65,.16,x,8.1,z,s.porcelain,16);disc(g,1.34,.08,x,8.22,z,s.linen,16);
   for(const dx of [-.5,.45]){const food=mesh(g,new T.SphereGeometry(.5,8,6),s.amber,x+dx,8.4,z);food.scale.set(1,.45,1.3);}
   for(const dx of [-2,2]){rod(g,[x+dx,8.08,z-1.4],[x+dx,8.08,z+.9],.075,s.steel);if(dx<0)for(const offset of [-.15,0,.15])rod(g,[x+dx+offset,8.08,z+.7],[x+dx+offset,8.08,z+1.3],.035,s.steel);}
   mug(x+1.3,8.02,z-2);
  }
  if(role===0){
   for(const x of [-8,8]){block(g,5.7,3.4,17,x,2.1,0,m.graphite);pad(g,5.8,1.25,17,x,4.45,0,s.seat);pad(g,1.4,7.8,17,x+(x<0?-2.2:2.2),7.4,0,s.blanket);for(const z of [-4.3,4.3])pad(g,4.5,.25,7,x,5.2,z,s.linen);}
   pad(g,9.8,.7,17,0,7.55,0,s.worktop);for(const z of [-5,5]){block(g,1,6,1,0,4,z,s.steel);block(g,6,.35,3,0,.8,z,m.graphite);}
   if(!level)for(const x of [-2.5,2.5])for(const z of [-4.2,4.2])placeSetting(x,z);
   else{for(const z of [-4,4]){mug(-2,7.95,z);mug(2,7.95,z);}planter(g,0,7.95,0,.55);checklist(g,0,7.98,5.4,.1);}
   block(g,20,.3,1,0,18,-10.35,s.warmLED);label(g,level?'CREW LOUNGE':'CREW DINING',12,0,16,-10.72);
  }else if(role===1){
   cabinet(g,-6.4,-6,8,9,8,2);cabinet(g,4.6,-6,12,9,8,3);block(g,22,.7,8.5,0,10,-6,s.worktop);
   if(!level){
    for(const x of [-6,0,6]){block(g,5.2,.4,5.7,x,10.6,-5.4,s.steel);block(g,4.5,.18,4.8,x,10.83,-5.4,s.rubber);for(const z of [-6.6,-4.5]){disc(g,1.65,.9,x,11.25,z,s.porcelain,12);disc(g,1.4,.12,x,11.75,z,s.amber,12);}}
    block(g,21,1.4,6,0,19,-6,s.grille);block(g,19,.12,4.5,0,18.2,-5.8,s.warmLED);
    cabinet(g,-6,6,9,6.3,5,2);block(g,10,.5,5.5,-6,7,6,s.worktop);for(let i=0;i<4;i++)pad(g,7,.17,4,-6,7.4+i*.25,6,s.steel);
    label(g,'HOT MEALS / SERVE',14,0,16,-10.7);
   }else{
    block(g,6.2,6.6,5.7,-6.2,13.7,-6.6,s.rubber);screen(g,-6.2,14.7,-3.68,4,2.5,1);for(const x of [-7.4,-5]){rod(g,[x,12.3,-3.5],[x,11.6,-3.5],.18,s.steel);mug(x,10.4,-2.8);}
    disc(g,1.75,3.3,5,12.1,-5.7,s.porcelain,14);disc(g,1.8,.35,5,13.9,-5.7,s.steel,14);rod(g,[6.4,12.6,-5.7],[7.6,13.2,-5.7],.24,s.steel);
    for(const x of [0,3,6,9]){block(g,2.2,3.6,2.8,x,16.8,-9,p.cabinet);label(g,'TEA',1.6,x,16.8,-7.54);}
    block(g,12,.4,3.7,4.5,14.7,-8.9,s.worktop);for(const x of [-7,0,7]){pad(g,4,.8,4,x,5.2,4,s.seat);rod(g,[x,.7,4],[x,4.8,4],.35);disc(g,2.5,.4,x,.7,4,m.graphite,12);}
    label(g,'TEA / COFFEE / WATER',16,0,21,-10.7);
   }
  }else if(!level){
   cabinet(g,0,-5,21,9,9,4);block(g,22,.7,9.5,0,10,-5,s.worktop);
   for(const x of [-5,5]){block(g,7.6,.22,6.6,x,10.47,-5,s.steel);block(g,6.5,.18,5.5,x,10.62,-5,s.rubber);rod(g,[x,10.7,-8],[x,14.8,-8],.2);rod(g,[x,14.8,-8],[x,14.8,-5.8],.2);rod(g,[x,14.8,-5.8],[x,14,-5.8],.2);}
   for(const x of [-7,0,7]){block(g,5.2,6,5.7,x,3.4,5,p.cabinet);block(g,5.5,.4,6,x,6.6,5,s.steel);block(g,3,.2,2.6,x,6.86,5,s.rubber);label(g,x<0?'TRAYS':x>0?'RECYCLE':'WASTE',3.8,x,4,7.9);}
   block(g,19,.4,3.4,0,17,-9,s.worktop);for(const x of [-6,0,6])for(let i=0;i<4;i++)disc(g,1.6,.22,x,17.45+i*.25,-8.9,s.porcelain,12);label(g,'WASH / RETURN',13,0,21,-10.7);
  }else{
   cabinet(g,-6.4,-6,8,20,8,4);label(g,'CHILLED',5,-6.4,17,-1.9);block(g,.4,6,.4,-3.5,10,-1.7,s.steel);
   for(const x of [.2,9.5])rod(g,[x,.6,-7],[x,21,-7],.3,s.steel);
   for(const y of [2.5,8,13.5,19]){block(g,10,.45,6,5,y,-7,s.worktop);for(const x of [2,5,8]){block(g,2.4,3.7,4,x,y+2.1,-7,p.cabinet);label(g,'FOOD',1.8,x,y+2,-4.94);}}
   cabinet(g,0,5,17,7,6,3);label(g,'DRY STORE / CROCKERY',14,0,23,-10.7);
  }
 }
 const builders=[habitation,lifeSupport,power,biology,medical,workshop,dataCore,command,gym,dining];
 for(let level=0;level<2;level++){
  const y=level?43:14,deckGroup=new T.Group();deckGroup.userData.deck=level?'upper':'lower';inside.add(deckGroup);
  for(const [x,z,role]of [[-25,23,0],[25,23,1],[-25,-23,2]]){
   const bay=new T.Group();deckGroup.add(bay);bay.position.set(x,y,z);if(role===2)bay.rotation.y=Math.PI;
   serviceBay(bay,role+level*3);builders[profile](bay,role,level);
  }
 }
}
