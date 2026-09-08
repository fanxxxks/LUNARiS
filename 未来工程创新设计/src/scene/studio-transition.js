// Catalogue-only motion. Reuse the real room surfaces and the existing post pass;
// the simulation's positions, geometry, materials and frame budget stay authoritative.
function createStudioTransition(){
 const count=4800,cache=new Map(),solid={value:1};
 const background={enabled:{value:0},center:{value:new T.Vector2(.5,.5)},radius:{value:250},turn:{value:0},energy:{value:0}};
 let effect=null,animation=null,installed=false,shadowState=null;
 const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};

 function install(){
  if(installed)return;installed=true;
  // Apply a screen-door reveal only while switching. Opaque materials remain
  // opaque, and existing physical shading / glass / texture code is retained.
  const materials=new Set(moduleBatches.map(b=>b.mesh.material));
  studioHatches.traverse(o=>{if(o.material)materials.add(o.material);});
  for(const material of materials){
   const compile=material.onBeforeCompile,key=material.customProgramCacheKey();
   material.onBeforeCompile=function(shader,webgl){
    compile.call(this,shader,webgl);shader.uniforms.studioSolid=solid;
    shader.vertexShader='varying float studioHeight;\n'+shader.vertexShader.replace('void main() {','void main(){').replace('void main(){','void main(){studioHeight=position.y;');
    shader.fragmentShader='uniform float studioSolid;varying float studioHeight;\n'+shader.fragmentShader.replace('void main() {','void main(){').replace('void main(){',`void main(){
     if(studioSolid<.9999){
      float coverage=clamp(studioSolid*1.3-clamp(studioHeight/78.,0.,1.)*.3,0.,1.);
      float grain=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);
      if(grain>=coverage)discard;
     }`);
   };
   material.customProgramCacheKey=()=>key+'|studio-reveal-v1';material.needsUpdate=true;
  }
  // Draw technical linework only where the scene has no foreground depth.
  // This is part of the existing composite: no overlay obscures the model.
  Object.assign(postMat.uniforms,{studioTech:background.enabled,studioCenter:background.center,studioRadius:background.radius,studioTurn:background.turn,studioEnergy:background.energy});
  const tech=`
   uniform float studioTech,studioRadius,studioTurn,studioEnergy;
   uniform vec2 studioCenter;
   float techLine(float distance,float width,float aa){return 1.-smoothstep(width,width+aa,abs(distance));}
   vec3 studioBackground(vec2 uv){
    vec2 p=(uv-studioCenter)*resolution/max(studioRadius,1.);
    float r=length(p),a=atan(p.y,p.x),px=1./max(studioRadius,1.);
    vec3 base=mix(vec3(.023,.034,.047),vec3(.047,.057,.075),exp(-r*r*.7));
    float ring=techLine(r-.96,.35*px,1.1*px)*.17;
    float arcs=step(.69,fract((a+studioTurn)/6.2831853*3.));
    ring+=techLine(r-1.065,1.35*px,px)*arcs*.37;
    float tick=step(.91,fract(a/6.2831853*120.));
    ring+=tick*step(1.12,r)*step(r,1.145)*.22;
    float fine=techLine(p.x+.91,.25*px,px)+techLine(p.x-1.43,.25*px,px);
    fine+=techLine(p.y-.51,.25*px,px)+techLine(p.y+.74,.25*px,px);
    float marks=techLine(p.x+.91,5.*px,px)*techLine(p.y-.51,.5*px,px)
     +techLine(p.x+.91,.5*px,px)*techLine(p.y-.51,5.*px,px);
    float sweep=pow(max(0.,1.-abs(sin(a-studioTurn*2.))),100.)*step(.97,r)*step(r,1.13);
    base+=vec3(.68,.73,.76)*(ring+fine*.055+marks*.23+sweep*studioEnergy*.18);
    return base;
   }
  `;
  postMat.fragmentShader=postMat.fragmentShader.replace('void main(){localOcclusion',tech+'\nvoid main(){localOcclusion').replace('col*=1.-.17*dot(q,q);','if(studioTech>.5&&texture2D(tDepth,vUv).r>.99999)col=studioBackground(vUv);col*=1.-.17*dot(q,q);');
  postMat.needsUpdate=true;
 }

 function surface(room,deck){
  const key=roomModelTypes[room]+':'+deck;if(cache.has(key))return cache.get(key);
  const triangles=[];let total=0;
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),ab=new T.Vector3(),ac=new T.Vector3();
  for(const batch of moduleBatches){
   if(!batch.ids.includes(room))continue;
   if(deck!=='exterior'&&(['skin','roof'].includes(batch.layer)||batch.layer===(deck==='lower'?'interior-upper':'interior-lower')))continue;
   const g=batch.mesh.geometry,position=g.attributes.position,index=g.index,n=index?index.count:position.count;
   for(let i=0;i<n;i+=3){
    const ia=index?index.getX(i):i,ib=index?index.getX(i+1):i+1,ic=index?index.getX(i+2):i+2;
    a.fromBufferAttribute(position,ia);b.fromBufferAttribute(position,ib);c.fromBufferAttribute(position,ic);
    const area=ab.subVectors(b,a).cross(ac.subVectors(c,a)).length()*.5;if(area<.00001)continue;
    total+=area;triangles.push({position,ia,ib,ic,end:total});
   }
  }
  let seed=619+roomModelTypes[room]*97;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  const points=new Float32Array(count*3);
  for(let i=0;i<count;i++){
   const sample=random()*total;let lo=0,hi=triangles.length-1;
   while(lo<hi){const mid=(lo+hi)>>1;if(triangles[mid].end<sample)lo=mid+1;else hi=mid;}
   const tri=triangles[lo];if(!tri)break;
   a.fromBufferAttribute(tri.position,tri.ia);b.fromBufferAttribute(tri.position,tri.ib);c.fromBufferAttribute(tri.position,tri.ic);
   const u=Math.sqrt(random()),v=random();a.multiplyScalar(1-u).addScaledVector(b,u*(1-v)).addScaledVector(c,u*v);a.toArray(points,i*3);
  }
  cache.set(key,points);return points;
 }

 function particles(){
  if(effect)return effect;
  const uniforms={progress:{value:0},pixelRatio:{value:1},tint:{value:new T.Color('#ced9d7')}};
  const vertex=`
   attribute vec3 destination;attribute float seed,trail;
   uniform float progress,pixelRatio;varying float intensity,vSeed;
   float ease(float x){x=clamp(x,0.,1.);return x*x*(3.-2.*x);}
   void main(){
    float t=clamp(progress-trail*.047,0.,1.),outward=ease((t-.06)/.43),inward=ease((t-.46)/.46);
    vec3 hinge=vec3((seed-.5)*13.,-30.+seed*15.,(fract(seed*17.)-.5)*12.);
    vec3 p=t<.48?mix(position,hinge,outward):mix(hinge,destination,inward);
    float spread=sin(clamp((t-.02)/.96,0.,1.)*3.14159265);
    p+=vec3(1.,1.6,-.35)*sin(seed*53.)*spread*(t<.48?outward:1.-inward)*42.;
    vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
    gl_PointSize=clamp((.9+seed)*pixelRatio*230./max(80.,-view.z),1.,3.2*pixelRatio);
    intensity=ease(t/.14)*(1.-ease((t-.76)/.24));vSeed=seed;
   }`;
  const pointsMaterial=new T.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:`uniform vec3 tint;varying float intensity,vSeed;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;vec3 color=mix(tint,vec3(.93,.81,.51),step(.88,vSeed));gl_FragColor=vec4(color,(1.-smoothstep(.2,.5,r))*intensity*.88);}`,transparent:true,depthWrite:false,depthTest:false,blending:T.AdditiveBlending,toneMapped:false});
  const lineMaterial=new T.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:'uniform vec3 tint;varying float intensity,vSeed;void main(){gl_FragColor=vec4(tint,intensity*.1);}',transparent:true,depthWrite:false,depthTest:false,blending:T.AdditiveBlending,toneMapped:false});
  function geometry(n,isLine){
   const g=new T.BufferGeometry(),seeds=new Float32Array(n),tails=new Float32Array(n);
   for(let i=0;i<n;i++){seeds[i]=((Math.floor(isLine?i/2:i)*7919)%count)/count;tails[i]=isLine?i%2:0;}
   g.setAttribute('position',new T.BufferAttribute(new Float32Array(n*3),3).setUsage(T.DynamicDrawUsage));
   g.setAttribute('destination',new T.BufferAttribute(new Float32Array(n*3),3).setUsage(T.DynamicDrawUsage));
   g.setAttribute('seed',new T.BufferAttribute(seeds,1));g.setAttribute('trail',new T.BufferAttribute(tails,1));return g;
  }
  const dots=new T.Points(geometry(count,false),pointsMaterial),lines=new T.LineSegments(geometry(720,true),lineMaterial),group=new T.Group();
  dots.frustumCulled=lines.frustumCulled=false;dots.renderOrder=8;lines.renderOrder=7;group.name='studio-switch-particles';group.add(dots,lines);group.visible=false;scene.add(group);
  effect={group,dots,lines,uniforms};return effect;
 }

 function reset(){
  animation=null;solid.value=1;background.energy.value=0;if(effect)effect.group.visible=false;
  if(shadowState){shadowState.forEach(([mesh,casts])=>mesh.castShadow=casts);shadowState=null;renderer.shadowMap.needsUpdate=true;}
 }
 function start(fromRoom,fromDeck,toRoom,toDeck,commit){
  install();reset();
  const fx=particles(),from=surface(fromRoom,fromDeck),to=surface(toRoom,toDeck);
  for(const [name,data] of [['position',from],['destination',to]]){
   fx.dots.geometry.attributes[name].array.set(data);fx.dots.geometry.attributes[name].needsUpdate=true;
   const buffer=fx.lines.geometry.attributes[name];for(let i=0;i<360;i++){const offset=(i*13%count)*3;for(let end=0;end<2;end++)buffer.array.set(data.subarray(offset,offset+3),(i*2+end)*3);}buffer.needsUpdate=true;
  }
  fx.uniforms.progress.value=0;fx.group.visible=true;
  shadowState=moduleBatches.map(({mesh})=>[mesh,mesh.castShadow]);
  studioHatches.traverse(mesh=>{if(mesh.isMesh)shadowState.push([mesh,mesh.castShadow]);});
  shadowState.forEach(([mesh])=>mesh.castShadow=false);renderer.shadowMap.needsUpdate=true;
  animation={start:performance.now(),duration:1250,turn:background.turn.value,commit,committed:false};
 }
 function step(now){
  if(!animation)return false;const current=animation,t=clamp((now-current.start)/current.duration);
  effect.uniforms.progress.value=t;background.turn.value=current.turn+smooth(t)*.68;background.energy.value=Math.sin(t*Math.PI);
  solid.value=t<.48?1-smooth(t/.32):smooth((t-.66)/.34);
  if(t>=.48&&!current.committed){current.committed=true;current.commit();renderer.shadowMap.needsUpdate=true;}
  if(t>=1)reset();return true;
 }
 function sync(active,room){
  if(!active){background.enabled.value=0;return;}
  install();background.enabled.value=1;
  // The catalogue uses an open technical backdrop rather than a solid plinth.
  // Keep the room's own floors; only hide the decorative display disk.
  studioGround.visible=false;
  const p=rooms[room].position.clone().add(new T.Vector3(0,38,0)).project(camera);
  background.center.value.set((p.x+1)*.5,(p.y+1)*.5);
  const width=stage.clientWidth,height=stage.clientHeight,panel=$('studioPanel').getBoundingClientRect();
  background.radius.value=Math.max(55,Math.min(width<760?width*.4:(width-panel.width-70)*.42,width<760?(height-panel.height-32)*.46:height*.39))*renderer.getPixelRatio();
  if(effect){effect.group.position.copy(rooms[room].position);effect.group.rotation.copy(rooms[room].rotation);effect.uniforms.pixelRatio.value=renderer.getPixelRatio();}
 }
 return {start,step,sync,reset,get active(){return animation!==null;}};
}
