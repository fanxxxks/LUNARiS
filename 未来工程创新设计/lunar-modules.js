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
