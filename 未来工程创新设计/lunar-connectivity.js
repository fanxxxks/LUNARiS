// Room hatches, short sealed connectors and quantitative traffic fields.
// Runtime state is lazy so concatenation after lunar-scene has no TDZ hazards.
function connectivityCache(){
 if(connectivityCache.value)return connectivityCache.value;
 const group=new T.Group();group.name='direct-room-connections';station.add(group);
 const geometry=new T.BoxGeometry(1,1,1),owned=[geometry];
 function batch(name,material,count){const m=new T.InstancedMesh(geometry,material,count);m.name=name;m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.frustumCulled=false;m.castShadow=!material.transparent;m.receiveShadow=true;m.count=0;group.add(m);return m;}
 return connectivityCache.value={group,owned,leaf:batch('recessed-hatch-leaves',mats.pale,288),inset:batch('hatch-inset-panels',moduleDesignMaterials().door,288),handle:batch('hatch-lock-bars',mats.gold,288),shell:batch('telescoping-link-walls',mats.dark,1600),ribs:batch('connector-frames-and-ladder',mats.silver,4000),glass:batch('connector-side-glazing',mats.glass,400),matrix:new T.Object3D(),v:new T.Vector3(),q:new T.Quaternion(),doorKeys:[],graphKey:null,linkKey:null,links:[],effectiveLayout:C.initial.slice(),lastState:null,visible:true};
}
function connectionFaces(){const sx=C.config.moduleScaleXZ||1;return [{axis:0,sign:1,dir:'+X',p:[46,26,0],rot:[0,Math.PI/2,0]},{axis:0,sign:-1,dir:'-X',p:[-46,26,0],rot:[0,-Math.PI/2,0]},{axis:2,sign:1,dir:'+Z',p:[0,26,42],rot:[0,0,0]},{axis:2,sign:-1,dir:'-Z',p:[0,26,-42],rot:[0,Math.PI,0]},{axis:1,sign:1,dir:'+Y',p:[24,76.5,-23],rot:[-Math.PI/2,0,0]},{axis:1,sign:-1,dir:'-Y',p:[24,.3,-23],rot:[Math.PI/2,0,0]}].map(f=>({...f,p:f.p.map((v,k)=>k===1?v:v*sx)}));}
function connectionWrite(cache,batch,index,origin,quaternion,local,scale,stretch=[1,1,1]){
 const d=cache.matrix;d.position.fromArray(origin).add(cache.v.set(local[0]*stretch[0],local[1]*stretch[1],local[2]*stretch[2]).applyQuaternion(quaternion));d.quaternion.copy(quaternion);d.scale.set(scale[0]*stretch[0],scale[1]*stretch[1],scale[2]*stretch[2]);d.updateMatrix();batch.setMatrixAt(index,d.matrix);batch.instanceMatrix.addUpdateRange?.(index*16,16);
}
function updateConnectivity(st,options={}){
 const s=connectivityCache(),show=options.showLinks!==false,floor=options.visibleFloor??-1,section=options.sectionRoom??-1,layout=st.layout||C.initial,phase=st.phase,room=phase?.room??st.active??-1;
 let progress=room>=0?Math.max(0,Math.min(1,st.connectionProgress??(st.type==='dock'?1:0))):1;
 const placed=layout.slice(),unavailable=[];
 if(room>=0){
  const before=placed.indexOf(room),atSource=before>=0&&st.positions?.[room]?.every((v,k)=>Math.abs(v-C.slots[before][k])<1e-5);
  if(st.type==='dock'&&Number.isInteger(phase?.to)){if(before>=0)placed[before]=null;placed[phase.to]=room;}
  else if(!(progress>0&&atSource))unavailable.push(room);
 }
 s.effectiveLayout=placed;s.lastState=st;
 const graphKey=placed.join(',')+'!'+unavailable.join(',');
 if(graphKey!==s.graphKey){s.links=typeof C.connections==='function'?C.connections(placed,{unavailable}):[];s.graphKey=graphKey;}
 const doorOpen=Array.from({length:C.config.roomCount},()=>({}));
 for(const edge of s.links){const p=(edge.roomA===room||edge.roomB===room)?1-Math.max(0,Math.min(1,st.doorClosure??1-progress)):1;if(show){doorOpen[edge.roomA][edge.directionA]=p;doorOpen[edge.roomB][edge.directionB]=p;}}
 let changed=false,doorChanged=false;
 const faces=connectionFaces(),batches=[s.leaf,s.inset,s.handle];batches.forEach(m=>m.instanceMatrix.clearUpdateRanges?.());
 for(let id=0;id<C.config.roomCount;id++){
  const p=st.positions?.[id]||C.slots[layout.indexOf(id)];if(!p)continue;
  const hideRooms=options.hideRooms??(typeof cutaway==='boolean'&&cutaway);
  const visible=!hideRooms&&(floor<0||Math.abs((p[1]-C.config.baseY)/C.config.pitchY-floor)<.52)&&id!==section;
  const key=p.join(',')+'|'+faces.map(f=>doorOpen[id][f.dir]||0).join(',')+'|'+visible;
  if(key===s.doorKeys[id])continue;s.doorKeys[id]=key;doorChanged=true;
  for(let f=0;f<faces.length;f++){
   const face=faces[f],q=s.q.setFromEuler(new T.Euler(...face.rot)),o=p.map((v,k)=>v+face.p[k]),h=face.axis===1?13.5:22.4,open=doorOpen[id][face.dir]||0,sx=C.config.moduleScaleXZ||1,stretch=[sx,face.axis===1?sx:1,face.axis===1?1:sx];
   // Both leaves retract sideways inside the wall; they never sweep outward
   // through a platform or another moving module.
   for(let side=0;side<2;side++){
    const sign=side?1:-1,index=id*12+f*2+side,x=sign*(3.4+open*7.1),scale=visible?1:0;
    connectionWrite(s,s.leaf,index,o,q,[x,0,-2.15],[6.85*scale,h*scale,.65*scale],stretch);
    connectionWrite(s,s.inset,index,o,q,[x,0,-1.78],[5.55*scale,(h-3.4)*scale,.12*scale],stretch);
    connectionWrite(s,s.handle,index,o,q,[x-sign*2.25,-2,-1.58],[.5*scale,4*scale,.32*scale],stretch);
   }
  }
 }
 if(doorChanged){for(const m of batches){m.count=C.config.roomCount*12;m.instanceMatrix.needsUpdate=true;}changed=true;}
 const linkKey=graphKey+'|'+room+'|'+progress.toFixed(5)+'|'+show+'|'+floor+'|'+section;
 if(linkKey!==s.linkKey){
  s.linkKey=linkKey;let wi=0,ri=0,gi=0,count=0;
  for(const b of [s.shell,s.ribs,s.glass])b.instanceMatrix.clearUpdateRanges?.();
  if(show)for(const e of s.links){
   const a=e.portA||e.points[0],b=e.portB||e.points.at(-1),axis=e.axis,p=(e.roomA===room||e.roomB===room)?progress:1;
   if(p<=.001)continue;
   const levels=[C.nodes[e.nodeA]?.level,C.nodes[e.nodeB]?.level];if(floor>=0&&levels.some(level=>level!==floor))continue;
   const delta=new T.Vector3(...b).sub(new T.Vector3(...a)),len=delta.length();if(len<.01)continue;
   const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),delta.normalize()),half=len*.5*p,h=axis===1?14:23,sx=C.config.moduleScaleXZ||1,stretch=[sx,axis===1?sx:1,1];
   if(p>.995)count++;
   // Opposing telescopic halves retract to their own doorway, leaving a real
   // gap when isolated. Each wall is geometry, with a traversable empty throat.
   for(const side of [0,1]){
    const center=side?len-half/2:half/2;
    for(const x of [-7.55,7.55])connectionWrite(s,s.shell,wi++,a,q,[x,0,center],[1.05,h+2,half],stretch);
    for(const y of [-h/2-.5,h/2+.5])connectionWrite(s,s.shell,wi++,a,q,[0,y,center],[14.1,1,half],stretch);
    if(axis!==1){for(const x of [-8.11,8.11])connectionWrite(s,s.glass,gi++,a,q,[x,2,center],[.15,h*.52,half*.75],stretch);}
    for(const t of [0,.48,1]){
     // The two fully joined halves share their center ring; draw it once.
     if(side===1&&t===1&&Math.abs(len-2*half)<1e-5)continue;
     const z=side?len-half*t:half*t;
     for(const x of [-8.15,8.15])connectionWrite(s,s.ribs,ri++,a,q,[x,0,z],[.65,h+3.1,.65],stretch);
     for(const y of [-h/2-1.2,h/2+1.2])connectionWrite(s,s.ribs,ri++,a,q,[0,y,z],[16.8,.65,.65],stretch);
    }
   }
   if(axis===1&&p>.995){
    for(const y of [-5,5])connectionWrite(s,s.ribs,ri++,a,q,[6,y,len/2],[.5,.5,len],stretch);
    for(let z=1.5;z<len;z+=3.4)connectionWrite(s,s.ribs,ri++,a,q,[6,0,z],[.5,10,.5],stretch);
   }
  }
  s.connections=count;
  for(const [batch,n]of [[s.shell,wi],[s.ribs,ri],[s.glass,gi]]){batch.count=n;batch.instanceMatrix.needsUpdate=true;}changed=true;
 }
 if(changed)renderer.shadowMap.needsUpdate=true;
 return {changed,connections:s.connections||0};
}
function clearConnectivity(){const s=connectivityCache.value;if(!s)return;for(const m of [s.leaf,s.inset,s.handle,s.shell,s.ribs,s.glass])m.count=0;s.doorKeys=[];s.graphKey=s.linkKey=null;s.connections=0;renderer.shadowMap.needsUpdate=true;}
function disposeConnectivity(){const s=connectivityCache.value;if(!s)return;station.remove(s.group);s.group.children.forEach(m=>m.dispose?.());s.owned.forEach(g=>g.dispose());connectivityCache.value=null;}

function trafficVisualCache(){
 if(trafficVisualCache.value)return trafficVisualCache.value;
 const group=new T.Group();group.name='quantitative-traffic-heatmap';group.visible=false;station.add(group);
 const size=24000,geometry=new T.BufferGeometry();
 for(const name of ['position','color'])geometry.setAttribute(name,new T.BufferAttribute(new Float32Array(size*3),3).setUsage(T.DynamicDrawUsage));
 geometry.setAttribute('density',new T.BufferAttribute(new Float32Array(size),1).setUsage(T.DynamicDrawUsage));geometry.setDrawRange(0,0);
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,side:T.DoubleSide,toneMapped:false,uniforms:{uTime:{value:0}},vertexShader:'attribute float density;varying vec3 vColor;varying float vDensity;void main(){vColor=color;vDensity=density;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vColor;varying float vDensity;void main(){float a=.10+.38*clamp(vDensity,0.,1.);gl_FragColor=vec4(vColor,a);}',vertexColors:true});
 const heat=new T.Mesh(geometry,material);heat.frustumCulled=false;heat.renderOrder=12;group.add(heat);
 const pg=new T.BufferGeometry(),capacity=4096;
 for(const name of ['position','aStart','aEnd'])pg.setAttribute(name,new T.BufferAttribute(new Float32Array(capacity*3),3).setUsage(T.DynamicDrawUsage));
 for(const name of ['aSeed','aFlow'])pg.setAttribute(name,new T.BufferAttribute(new Float32Array(capacity),1).setUsage(T.DynamicDrawUsage));pg.setDrawRange(0,0);
 const pm=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,toneMapped:false,uniforms:{uTime:{value:0}},vertexShader:'attribute vec3 aStart;attribute vec3 aEnd;attribute float aSeed;attribute float aFlow;uniform float uTime;varying float vFlow;void main(){float distance=max(length(aEnd-aStart),1.);float t=fract(aSeed+uTime*10./distance);vec3 p=mix(aStart,aEnd,t);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((2.7+2.8*aFlow)*650./max(-mv.z,150.),2.,7.);vFlow=aFlow;}',fragmentShader:'varying float vFlow;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;vec3 c=mix(vec3(.65,.98,1.),vec3(1.,.87,.53),vFlow);gl_FragColor=vec4(c,(1.-r*r)*.9);}'});
 const points=new T.Points(pg,pm);points.frustumCulled=false;points.renderOrder=13;group.add(points);
 return trafficVisualCache.value={group,geometry,material,pg,pm,size,capacity,key:null,vertices:0,particles:0};
}
function trafficPalette(value){
 const x=Math.max(0,Math.min(1,value)),stops=[[.04,.3,.94],[0,.77,.91],[.42,.95,.66],[1,.86,.21],[1,.31,.06]],u=x*4,i=Math.min(3,Math.floor(u)),t=u-i;return stops[i].map((v,k)=>v+(stops[i+1][k]-v)*t);
}
function updateTrafficVisual(data,options={}){
 const s=trafficVisualCache(),visible=!!options.visible,floor=options.visibleFloor??-1,time=Number(options.time)||0;
 let changed=s.group.visible!==visible;s.group.visible=visible;s.material.uniforms.uTime.value=time;s.pm.uniforms.uTime.value=time;
 if(!visible||!data)return {changed,vertices:s.vertices,particles:s.particles};
 const key=(data.key??JSON.stringify([data.links,data.roomLoads]))+'|'+floor;
 if(key===s.key)return {changed,vertices:s.vertices,particles:s.particles};s.key=key;
 const position=s.geometry.attributes.position.array,color=s.geometry.attributes.color.array,density=s.geometry.attributes.density.array,sx=C.config.moduleScaleXZ||1;
 let vi=0;const max=Math.max(1,data.maxFlow||data.totalDemand||120),links=data.links||[],layout=data.layout||connectivityCache.value?.effectiveLayout||C.initial;
 function vertex(p,d){if(vi>=s.size)return;position.set(p,vi*3);color.set(trafficPalette(d),vi*3);density[vi]=Math.max(0,Math.min(1,d));vi++;}
 function quad(a,b,c,d,values){vertex(a,values[0]);vertex(b,values[1]);vertex(c,values[2]);vertex(a,values[0]);vertex(c,values[2]);vertex(d,values[3]);}
 const roomNodes=data.roomNodes||Array.from({length:C.config.roomCount},(_,id)=>layout.indexOf(id)),roomLinks=Array.from({length:C.config.roomCount},()=>[]);
 for(const e of links){roomLinks[e.roomA]?.push({point:e.portA||e.points[0],flow:e.flow||0});roomLinks[e.roomB]?.push({point:e.portB||e.points.at(-1),flow:e.flow||0});}
 function pointSegmentDistance(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/Math.max(1e-5,dx*dx+dz*dz)));return Math.hypot(px-ax-t*dx,pz-az-t*dz);}
 for(let id=0;id<C.config.roomCount;id++){
  const node=roomNodes[id],n=C.nodes[node];if(!n||floor>=0&&n.level!==floor||data.unavailable?.includes(id))continue;
  const p=C.slots[node],load=Math.max(0,data.roomLoads?.[id]||0)/max;
  function value(x,z){let field=load*.08;for(const e of roomLinks[id]){const endX=e.point[0]-p[0],endZ=e.point[2]-p[2],distance=pointSegmentDistance(x*sx,z*sx,0,0,endX,endZ);field+=e.flow/max*Math.exp(-distance*distance/(175*sx*sx));}return Math.min(1,field);}
  // A sampled continuous field over the actual lower floor, not a colored line.
  const nx=8,nz=8;for(let x=0;x<nx;x++)for(let z=0;z<nz;z++){
   const x0=-38+x*76/nx,x1=-38+(x+1)*76/nx,z0=-33+z*66/nz,z1=-33+(z+1)*66/nz;
   // Keep the vertical ladder opening unpainted.
   if((x0+x1)/2>17&&(x0+x1)/2<31&&(z0+z1)/2>-30&&(z0+z1)/2<-16)continue;
   const world=(a,b)=>[p[0]+a*sx,p[1]+14.22,p[2]+b*sx];quad(world(x0,z0),world(x1,z0),world(x1,z1),world(x0,z1),[value(x0,z0),value(x1,z0),value(x1,z1),value(x0,z1)]);
  }
 }
 for(const e of links){
  if(floor>=0&&C.nodes[e.nodeA]?.level!==floor&&C.nodes[e.nodeB]?.level!==floor)continue;
  const a=(e.portA||e.points[0]).slice(),b=(e.portB||e.points.at(-1)).slice(),d=Math.min(1,(e.flow||0)/max),axis=e.axis;
  if(axis!==1){a[1]-=11.25;b[1]-=11.25;}
  const side=axis===0?[0,0,6.6*sx]:[6.6*sx,0,0],add=(p,k)=>p.map((v,i)=>v+side[i]*k);
  const mid=a.map((v,i)=>(v+b[i])/2);quad(add(a,-1),add(mid,-1),add(mid,1),add(a,1),[d*.62,d,d,d*.62]);quad(add(mid,-1),add(b,-1),add(b,1),add(mid,1),[d,d*.62,d*.62,d]);
 }
 s.geometry.setDrawRange(0,vi);for(const a of Object.values(s.geometry.attributes))a.needsUpdate=true;s.vertices=vi;
 let pi=0;const pa=s.pg.attributes;
 for(const path of data.paths||[]){
  const pts=path.points||[];for(let j=1;j<pts.length;j++){
   const a=pts[j-1].slice(),b=pts[j].slice(),middleY=(a[1]+b[1])/2;
   if(floor>=0&&Math.abs((middleY-C.config.baseY-26)/C.config.pitchY-floor)>.65)continue;
   a[1]+=1;b[1]+=1;const flow=Math.min(1,(path.flow||0)/max),num=Math.min(5,Math.max(1,Math.ceil(flow*6)));
   for(let k=0;k<num&&pi<s.capacity;k++,pi++){pa.position.array.set(a,pi*3);pa.aStart.array.set(a,pi*3);pa.aEnd.array.set(b,pi*3);pa.aSeed.array[pi]=((pi*.61803398875)%1);pa.aFlow.array[pi]=flow;}
  }
 }
 s.pg.setDrawRange(0,pi);for(const a of Object.values(pa))a.needsUpdate=true;s.particles=pi;
 return {changed:true,vertices:vi,particles:pi,maxFlow:max};
}
function clearTrafficVisual(){const s=trafficVisualCache.value;if(!s)return;s.group.visible=false;s.geometry.setDrawRange(0,0);s.pg.setDrawRange(0,0);s.key=null;s.vertices=s.particles=0;}
function disposeTrafficVisual(){const s=trafficVisualCache.value;if(!s)return;station.remove(s.group);s.geometry.dispose();s.pg.dispose();s.material.dispose();s.pm.dispose();trafficVisualCache.value=null;}
