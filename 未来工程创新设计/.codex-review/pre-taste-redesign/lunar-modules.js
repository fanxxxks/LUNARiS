// Six recessed pressure hatches. All helpers are declarations: moduleParts is
// called by lunar-scene before this concatenated source reaches its own body.
function modulePanel(parent,w,h,depth,r,holes,mat){
 const s=roundedShape(w,h,r);
 for(const q of holes){const cut=roundedShape(q.w,q.h,q.r||1.4);s.holes.push(new T.Path(cut.getPoints(4).map(p=>new T.Vector2(p.x+(q.x||0),p.y+h/2+(q.y||0)-q.h/2))));}
 const geo=depth<1?new T.ShapeGeometry(s,4):new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:4,steps:1});
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
function moduleParts(type){
 const g=new T.Group(),skin=new T.Group(),inside=new T.Group(),roof=new T.Group();g.add(skin,inside);skin.add(roof);
 function rail(parent,a,b,r,mat){const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start),m=mesh(parent,new T.CylinderGeometry(r,r,delta.length(),6),mat);m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;}
 const palette=typeof roomPalette==='undefined'?[{code:'MAT',color:'#3e9dcc'},{code:'BIO',color:'#62ae85'},{code:'HAB',color:'#d5af75'},{code:'PWR',color:'#d28a48'},{code:'LOG',color:'#be716f'},{code:'COM',color:'#978cc7'}]:roomPalette;
 const identity=palette[type],accent=new T.MeshStandardMaterial({color:identity.color,map:mats.hull.map||null,roughnessMap:mats.hull.roughnessMap||null,metalness:.34,roughness:.55,envMapIntensity:.8});
 // Rounded wall panels have real openings. Separate glazing leaves the lower
 // central hatch clear; no opaque pressure-shell face crosses a hatch throat.
 for(const f of [{axis:2,sign:1,w:90},{axis:2,sign:-1,w:90},{axis:0,sign:1,w:82},{axis:0,sign:-1,w:82}]){
  const face=new T.Group();skin.add(face);face.position.set(f.axis===0?f.sign*45.6:0,38,f.axis===2?f.sign*41.6:0);face.rotation.y=f.axis===0?f.sign*Math.PI/2:f.sign<0?Math.PI:0;
  const holes=[{w:14.8,h:23.8,x:0,y:-12,r:1.7},{w:f.axis===2?23:18,h:26,x:-26,y:3,r:4},{w:f.axis===2?23:18,h:26,x:26,y:3,r:4}];
  modulePanel(face,f.w,62,1.5,8,holes,mats.hull);
  // Broad painted metal fields identify function at overview distance. Thin
  // surface coats retain the common white pressure shell and add just six
  // triangles per facade; neither the windows nor the hatch throat is covered.
  mesh(face,new T.PlaneGeometry(f.w-14,8.8),accent,0,21.4,.035);
  for(const x of [-25,25])mesh(face,new T.PlaneGeometry(22,9.5),accent,x,-20.5,.035);
  for(const x of [-26,26]){
   const ww=f.axis===2?23:18,seal=modulePanel(face,ww+1.8,27.8,.75,4.5,[{w:ww,h:26,r:4}],mats.dark);seal.position.set(x,3,-.7);
   roundedBox(face,ww-.3,25.7,.5,3.8,x,3,-1.5,mats.glass);
   box(face,.55,25,.7,x,3,-.55,mats.silver);box(face,ww-.5,.65,.7,x,4,-.5,mats.silver);
  }
  for(const x of [-36,36]){box(face,1.4,31,.6,x,0,-.2,mats.pale);box(face,3.2,7,.6,x,-22,-.1,accent);}
  box(face,28,1.6,.55,0,27,-.1,accent);box(face,9,.65,.5,-25,-25,-.15,mats.cool);
  const hatch=new T.Group();skin.add(hatch);hatch.position.set(f.axis===0?f.sign*46:0,26,f.axis===2?f.sign*42:0);hatch.rotation.copy(face.rotation);moduleHatchFrame(hatch);
 }
 // Structural floor and roof plates, plus both occupied decks, share a true
 // 1.4 m vertical opening at local (24, -23). No furniture occupies this well.
 function deck(parent,y,w,d,thickness,material){const plate=modulePanel(parent,w,d,thickness,5,[{x:24,y:23,w:14,h:14,r:1.2}],material);plate.rotation.x=-Math.PI/2;plate.position.y=y;return plate;}
 deck(skin,3,90,82,2.4,mats.dark);deck(skin,68.7,89,81,1.8,mats.hull);
 for(const y of [14,43]){
  deck(inside,y,82,73,1.2,mats.interior);
  // Three double-column collaboration rows in total: two below, one above.
  // Compensate furniture X/Z locally before the shell's shared 1.25 enlargement.
  for(const z of (y===14?[14,28]:[22]))for(const x of [-25,25]){
   const desk=new T.Group();desk.position.set(x,y,z);desk.scale.set(.8,1,.8);inside.add(desk);
   box(desk,15,.8,7,0,7.4,0,mats.pale);box(desk,2,6.4,5,0,3.8,0,mats.dark);
   box(desk,8.4,4.2,.8,0,10.1,-2.3,mats.dark);box(desk,7,3.1,.25,0,10.2,-1.78,type===2?mats.warm:mats.cool);
   box(desk,4.5,1.1,4.5,0,4.5,8,mats.dark);box(desk,4.5,4.5,.85,0,6.5,10,mats.interior);
  }
  box(inside,58,.5,.65,0,y+20,-34,mats.warm);
  // Floor guidance marks the clear cross passage and the side access to the well.
  box(inside,1,.06,54,-7.8,y+.08,0,mats.silver);box(inside,54,.06,1,0,y+.09,7.8,mats.silver);
  for(const z of [-30,-16])box(inside,.7,8,.7,32,y+4,z,mats.silver);
  rail(inside,[32,y+8,-30],[32,y+8,-16],.45,mats.silver);
 }
 // Continuous ladder with reachable intermediate landings and handrails.
 for(const z of [-28,-18])rail(inside,[30,3,z],[30,75,z],.5,mats.silver);
 for(let y=4;y<75;y+=3.4)rail(inside,[30,y,-28],[30,y,-18],.5,mats.pale);
 for(const z of [-29.8,-16.2])rail(inside,[17.5,44,z],[17.5,51,z],.4,mats.silver);
 // Vertical pressure vestibule above the roof, with its top and bottom leaves
 // animated in the shared hatch batch in lunar-connectivity.
 const topWell=modulePanel(skin,18,18,7.5,2.4,[{w:14,h:14,r:1.3}],mats.silver);topWell.rotation.x=-Math.PI/2;topWell.position.set(24,76.3,-23);
 for(const sign of [-1,1]){const h=new T.Group();skin.add(h);h.position.set(24,sign>0?76.5:.3,-23);h.rotation.x=sign>0?-Math.PI/2:Math.PI/2;moduleHatchFrame(h,true);}
 // Compact equipment stays outside the 1.4 m cross passage and vertical well.
 for(const y of [14,43]){
  if(type===1){for(const x of [-28,-17]){box(inside,8,2,10,x,y+4,-22,mats.pale);for(const z of [-24,-20]){const plant=sphere(inside,1.45,x,y+6,z,mats.plant);plant.geometry.dispose();plant.geometry=new T.IcosahedronGeometry(1.45,1);}}}
  else if(type===2){box(inside,18,3.5,23,-26,y+3,-21,mats.pale);box(inside,15,1.5,20,-26,y+5.2,-21,mats.warm);box(inside,3,4,11,-34,y+7,-23,mats.interior);}
  else{box(inside,19,18,17,-26,y+10,-22,type===3?mats.insulation:mats.pale);for(let dy=4;dy<17;dy+=4)box(inside,17,.8,.8,-26,y+dy,-13.1,mats.dark);box(inside,4,4,.35,-24,y+13,-12.6,mats.cool);}
 }
 const person=astronaut(inside,-15,14,27,true);person.scale.x*=.8;person.scale.z*=.8;person.traverse(o=>{if(o.isMesh&&o.geometry.type==='SphereGeometry'){const radius=o.geometry.parameters.radius;o.geometry.dispose();o.geometry=new T.SphereGeometry(radius,12,8);}});
 // Streamlined lower sills and roof-edge fasteners carry the hard-surface detail.
 for(const x of [-43,43]){box(g,3.2,3,60,x,6,0,mats.dark);box(g,1.1,2.5,55,x,9,0,accent);}
 for(const z of [-39,39]){box(g,70,2.2,2,0,6,z,mats.silver);for(const x of [-34,34])box(g,5,2.3,3,x,9,z,mats.gold);}
 // All roof attachments belong to skin, so sectioning removes their support
 // and equipment together. Six low-profile installations share one footprint.
 roundedBox(roof,39,2.5,49,3,-19,71,0,mats.dark);
 if(type===0){
  // Materials lab: four protected experiment panels with metallic edge clamps.
  for(const x of [-29,-10])for(const z of [-12,11]){box(roof,16,1.2,19,x,73,z,mats.pale);box(roof,13.6,.3,16.8,x,73.76,z,accent);for(const dx of [-6,6])box(roof,.65,.45,17,x+dx,74.05,z,mats.silver);}
 }else if(type===1){
  // Biology: planted trays are visible beneath a low transparent greenhouse.
  const dome=mesh(roof,new T.SphereGeometry(12,16,8),mats.glass,-20,71,0);dome.scale.set(1,.4,1.35);
  for(const x of [-25,-19,-13])for(const z of [-8,4]){box(roof,5.2,.7,5.3,x,71.3,z,mats.pale);const plant=mesh(roof,new T.IcosahedronGeometry(1.5,1),mats.plant,x,72.1,z);plant.scale.set(1,.7,1);}
 }else if(type===2){
  // Habitat: two warm daylight wells, divided by silver protective mullions.
  for(const x of [-28,-10]){box(roof,15,1.8,40,x,72.6,0,mats.pale);box(roof,12.6,.25,36.8,x,73.64,0,mats.warm);box(roof,12.6,.25,36.8,x,73.92,0,mats.glass);for(const z of [-12,0,12])box(roof,13,.4,.6,x,74.14,z,mats.silver);}
 }else if(type===3){
  // Power: dense folded radiator fins, never deployed beyond the envelope.
  box(roof,35,.8,44,-19,72.4,0,accent);for(const x of [-34,-28,-22,-16,-10,-4]){box(roof,1.2,3.8,42,x,74,0,mats.silver);box(roof,.25,3.2,40,x+.73,74,0,mats.dark);}
 }else if(type===4){
  // Logistics: four strapped service containers with reinforced corner bands.
  for(const x of [-29,-10])for(const z of [-12,11]){box(roof,15,4.3,18,x,73.4,z,mats.pale);box(roof,12,.25,15,x,75.68,z,accent);for(const dx of [-5,5])box(roof,.8,.45,18.3,x+dx,75.87,z,mats.silver);}
 }else{
  // Communications: a planar array, visibly distinct from the lab's four tiles.
  box(roof,35,1.1,44,-19,73,0,accent);for(const x of [-31,-23,-15,-7])for(const z of [-15,-5,5,15])box(roof,5.5,.55,6.6,x,73.9,z,mats.pale);
  box(roof,31,.5,.8,-19,74.35,0,mats.silver);
 }
 box(roof,24,2.5,23,24,71.5,17,mats.pale);for(let x=15;x<35;x+=3)box(roof,.6,.6,20,x,73.1,17,mats.dark);
 for(const x of [-39,39])rail(roof,[x,71,-30],[x,71,31],.45,mats.silver);
 decal(skin,identity.code+' / '+typeCodes[type],30,2.5,-1,64.4,41.85);
 const innerParts=bake(inside);innerParts.forEach(m=>m.userData.layer='interior');g.remove(inside);
 const shellParts=bake(skin);shellParts.forEach(m=>m.userData.layer='skin');g.remove(skin);
 return [...bake(g),...shellParts,...innerParts];
}
