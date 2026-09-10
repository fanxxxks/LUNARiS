// View-space effects. All lighting stays linear until the final display pass.
// Rays only consult the current depth buffer; no hardware ray tracing is used.
const screenPositionGLSL=`
uniform sampler2D tDepth,tNormal,tScene;
uniform mat4 projectionInverse,projection;
uniform vec2 resolution;
varying vec2 vUv;
vec3 positionAt(vec2 uv){vec4 p=projectionInverse*vec4(uv*2.-1.,texture2D(tDepth,uv).r*2.-1.,1.);return p.xyz/p.w;}
vec3 normalAt(vec2 uv){return normalize(texture2D(tNormal,uv).xyz*2.-1.);}
vec2 screenAt(vec3 p){vec4 q=projection*vec4(p,1.);return q.xy/q.w*.5+.5;}
bool inside(vec2 uv){return all(greaterThan(uv,vec2(.002)))&&all(lessThan(uv,vec2(.998)));}
float noise2(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
`;
const screenAOShader=screenPositionGLSL+`
uniform int samples,mode;uniform float radius,contact;uniform vec3 sunDirection;
void main(){
 float depth=texture2D(tDepth,vUv).r;
 if(depth>.99999){gl_FragColor=vec4(1.,14000.,1.,1.);return;}
 vec3 p=positionAt(vUv),n=normalAt(vUv);float occlusion=0.;
 float pixels=clamp(radius*projection[1][1]*resolution.y/max(1.,-p.z)*.5,2.,110.);
 float rotation=noise2(floor(vUv*resolution))*6.2831853;
 if(mode==1){
  for(int i=0;i<32;i++){if(i>=samples)break;float a=float(i)*2.399963+rotation,r=sqrt((float(i)+.5)/float(samples));
   vec2 uv=vUv+vec2(cos(a),sin(a))*pixels*r/resolution;if(!inside(uv))continue;
   vec3 d=positionAt(uv)-p;float len=length(d);
   occlusion+=max(0.,dot(n,d/max(len,.001))-.12)*(1.-smoothstep(radius*.1,radius,len));
  }occlusion=clamp(occlusion/float(samples)*2.7,0.,.8);
 }else if(mode==2){
  // Horizon integration: eight azimuths, increasing radial samples. The
  // highest elevation along each azimuth contributes once, not per sample.
  int steps=max(1,samples/8);
  for(int axis=0;axis<8;axis++){
   float angle=float(axis)*.78539816+rotation,horizon=0.;
   for(int j=1;j<=4;j++){if(j>steps)break;float r=(float(j)-.35)/float(steps);
    vec2 uv=vUv+vec2(cos(angle),sin(angle))*pixels*r/resolution;if(!inside(uv))continue;
    vec3 delta=positionAt(uv)-p;float d=length(delta),elevation=max(0.,dot(n,delta/max(d,.001))-.08);
    horizon=max(horizon,elevation*(1.-smoothstep(radius*.05,radius,d)));
   }occlusion+=horizon;
  }occlusion=clamp(occlusion/8.*1.6,0.,.8);
 }
 float visibility=1.;
 if(contact>0.&&dot(n,sunDirection)>.05){
  for(int i=1;i<=12;i++){
   vec3 q=p+n*.35+sunDirection*(float(i)*.65);vec2 uv=screenAt(q);if(!inside(uv)||q.z>-.1)break;
   float delta=positionAt(uv).z-q.z;
   if(delta>.18&&delta<1.8){visibility=0.;break;}
  }
 }
 gl_FragColor=vec4(1.-occlusion,-p.z,visibility,1.);
}`;
const screenIndirectShader=screenPositionGLSL+`
uniform float radius;
void main(){
 if(texture2D(tDepth,vUv).r>.99999){gl_FragColor=vec4(0.);return;}
 vec3 p=positionAt(vUv),n=normalAt(vUv),result=vec3(0.);float weight=0.;
 float pixels=clamp(radius*projection[1][1]*resolution.y/max(1.,-p.z)*.5,3.,90.);
 float rotation=noise2(floor(vUv*resolution))*6.2831853;
 for(int i=0;i<16;i++){
  float a=float(i)*2.399963+rotation,r=sqrt((float(i)+.5)/16.);
  vec2 uv=vUv+vec2(cos(a),sin(a))*pixels*r/resolution;if(!inside(uv)||texture2D(tDepth,uv).r>.99999)continue;
  vec3 delta=positionAt(uv)-p;float d=length(delta);vec3 direction=delta/max(d,.001);
  float w=max(0.,dot(n,direction)-.04)*max(0.,dot(normalAt(uv),-direction))*(1.-smoothstep(radius*.2,radius,d));
  // Reject light bleeding across a nearer intervening silhouette.
  vec3 midpoint=p+delta*.5;float obstruction=positionAt((uv+vUv)*.5).z-midpoint.z;
  if(obstruction>1.5)w=0.;
  vec3 radiance=min(texture2D(tScene,uv).rgb,vec3(4.));result+=radiance*w;weight+=1.;
 }
 gl_FragColor=vec4(result/max(weight,1.)*3.,-p.z);
}`;
const screenReflectionShader=screenPositionGLSL+`
uniform int steps;uniform float reach;
void main(){
 vec4 surface=texture2D(tNormal,vUv);float mask=surface.a;
 if(mask<.015||texture2D(tDepth,vUv).r>.99999){gl_FragColor=vec4(0.);return;}
 vec3 p=positionAt(vUv),n=normalAt(vUv),direction=reflect(normalize(p),n),origin=p+n*.45;
 float stride=reach/float(steps),previous=0.;
 for(int i=1;i<=48;i++){
  if(i>steps)break;float travel=float(i)*stride;vec3 q=origin+direction*travel;vec2 uv=screenAt(q);
  if(q.z>-.5||!inside(uv))break;
  float delta=positionAt(uv).z-q.z;
  if(delta>.05&&delta<stride*1.8&&travel>2.&&distance(uv,vUv)>2./resolution.y){
   // Refine the first crossing rather than accepting a thick screen slab.
   float lo=previous,hi=travel;
   for(int j=0;j<4;j++){float mid=(lo+hi)*.5;vec3 point=origin+direction*mid;vec2 at=screenAt(point);if(positionAt(at).z-point.z>0.)hi=mid;else lo=mid;}
   vec2 hit=screenAt(origin+direction*(lo+hi)*.5);float edge=min(min(hit.x,hit.y),min(1.-hit.x,1.-hit.y));
   float confidence=smoothstep(0.,.09,edge)*(1.-travel/reach)*mask;
   if(dot(normalAt(hit),-direction)<.02)confidence=0.;
   gl_FragColor=vec4(texture2D(tScene,hit).rgb,confidence);return;
  }previous=travel;
 }
 gl_FragColor=vec4(0.);
}`;
const screenPostShader=`
uniform sampler2D tScene,tDepth,tAO,tBloom,tIndirect,tReflection;
uniform vec2 resolution,aoResolution,outputResolution;
uniform mat4 projectionInverse,inverseViewProjection,previousViewProjection;
uniform float exposure,bloom,ao,contact,indirect,reflection,fxaa,cinematic;
uniform float sharpness,temperature,tint,saturation,contrast,dof,focusDistance,motionBlur,grain,aberration,vignette,blackLevel,gamma;
uniform int tone;varying vec2 vUv;
float localOcclusion;vec3 localGlow;
float depthAt(vec2 uv){vec4 p=projectionInverse*vec4(uv*2.-1.,texture2D(tDepth,uv).r*2.-1.,1.);return -p.z/p.w;}
vec3 litColor(vec2 uv){
 vec3 color=texture2D(tScene,uv).rgb*localOcclusion;
 if(indirect>0.){vec4 light=texture2D(tIndirect,uv);float reject=1./(1.+abs(light.a-depthAt(uv))*.8);color+=light.rgb*indirect*reject;}
 if(reflection>0.){vec4 r=texture2D(tReflection,uv);color=mix(color,r.rgb,clamp(r.a*reflection,0.,.8));}
 return color;
}
vec3 lensColor(vec2 uv){
 vec3 color=litColor(uv);float z=depthAt(uv);
 if(motionBlur>0.){
  vec4 world=inverseViewProjection*vec4(uv*2.-1.,texture2D(tDepth,uv).r*2.-1.,1.);world/=world.w;
  vec4 previous=previousViewProjection*world;vec2 velocity=clamp((uv-(previous.xy/previous.w*.5+.5))*motionBlur,vec2(-.025),vec2(.025));
  vec3 sum=color;float weight=1.;
  for(int i=1;i<=4;i++){vec2 tap=clamp(uv-velocity*float(i)/4.,vec2(.001),vec2(.999));float w=1./(1.+abs(depthAt(tap)-z)*.5);sum+=litColor(tap)*w;weight+=w;}color=sum/weight;
 }
 if(dof>0.){
  float coc=clamp(abs(z-focusDistance)/max(z,1.)*dof*14.,0.,12.);vec3 sum=color;float weight=1.;
  for(int i=0;i<8;i++){float angle=float(i)*2.399963;vec2 tap=clamp(uv+vec2(cos(angle),sin(angle))*coc*sqrt((float(i)+.5)/8.)/resolution,vec2(.001),vec2(.999));
   float tapZ=depthAt(tap),w=tapZ<z-2.?min(1.,abs(tapZ-focusDistance)/max(tapZ,1.)*dof*5.):1.;sum+=litColor(tap)*w;weight+=w;
  }color=sum/weight;
 }return color;
}
vec3 displayColor(vec2 uv){
 vec3 x=(lensColor(uv)+localGlow*bloom)*exposure;
 x*=vec3(1.+temperature*.14+tint*.04,1.-tint*.08,1.-temperature*.14+tint*.04);
 if(cinematic>.5){float light=dot(x,vec3(.2126,.7152,.0722));x*=mix(vec3(.98,.997,1.02),vec3(1.012,1.004,.987),smoothstep(.08,1.4,light));}
 if(tone==0)x=clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);
 else if(tone==1)x=x/(1.+x);
 else{float peak=max(x.r,max(x.g,x.b)),compressed=peak<.76?peak:.76+.24*(1.-exp(-(peak-.76)/.24));x*=compressed/max(peak,.0001);}
 float luminance=dot(x,vec3(.2126,.7152,.0722));x=mix(vec3(luminance),x,saturation);x=max(vec3(0.),(x-.18)*contrast+.18);
 return mix(x*12.92,1.055*pow(x,vec3(1./2.4))-.055,step(vec3(.0031308),x));
}
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
vec3 antialias(){
 vec2 px=1./resolution;vec3 c=displayColor(vUv);if(fxaa<.5)return c;
 vec3 nw=displayColor(vUv+vec2(-1.,1.)*px),ne=displayColor(vUv+px),sw=displayColor(vUv-px),se=displayColor(vUv+vec2(1.,-1.)*px);
 float a=lum(nw),b=lum(ne),d=lum(sw),e=lum(se),m=lum(c),lo=min(m,min(min(a,b),min(d,e))),hi=max(m,max(max(a,b),max(d,e)));
 if(hi-lo<max(.0312,hi*.125))return c;
 vec2 dir=vec2(-((a+b)-(d+e)),(a+d)-(b+e));float reduce=max((a+b+d+e)*.03125,.0078125);dir=clamp(dir/(min(abs(dir.x),abs(dir.y))+reduce),vec2(-8.),vec2(8.))*px;
 vec3 ca=.5*(displayColor(vUv+dir*(1./3.-.5))+displayColor(vUv+dir*(2./3.-.5))),cb=ca*.5+.25*(displayColor(vUv+dir*-.5)+displayColor(vUv+dir*.5));float l=lum(cb);return l<lo||l>hi?ca:cb;
}
float ambientOcclusion(){
 if(ao<=0.&&contact<=0.)return 1.;float depth=texture2D(tDepth,vUv).r;if(depth>.99999)return 1.;
 float z=depthAt(vUv);vec2 pixel=vUv*aoResolution-.5,base=floor(pixel),fraction=fract(pixel);float sum=0.,shadow=0.,weight=0.;
 for(int i=0;i<4;i++){
  vec2 offset=vec2(float(i-2*(i/2)),float(i/2)),cell=clamp(base+offset,vec2(0.),aoResolution-1.);vec3 a=texture2D(tAO,(cell+.5)/aoResolution).rgb;
  vec2 bilinear=mix(1.-fraction,fraction,offset);float w=bilinear.x*bilinear.y/(1.+abs(a.y-z)*2.);sum+=a.x*w;shadow+=a.z*w;weight+=w;
 }
 return (1.-(1.-clamp(sum/max(weight,.00001),0.,1.))*ao)*(1.-(1.-clamp(shadow/max(weight,.00001),0.,1.))*contact);
}
void main(){localOcclusion=ambientOcclusion();localGlow=bloom>0.?texture2D(tBloom,vUv).rgb:vec3(0.);vec3 col=antialias();
 if(sharpness>0.){
  vec2 px=1./resolution;vec3 a=displayColor(vUv+vec2(px.x,0.)),b=displayColor(vUv-vec2(px.x,0.)),c=displayColor(vUv+vec2(0.,px.y)),d=displayColor(vUv-vec2(0.,px.y));
  vec3 lo=min(col,min(min(a,b),min(c,d))),hi=max(col,max(max(a,b),max(c,d)));
  col=clamp(col+(col-(a+b+c+d)*.25)*sharpness,lo,hi);
 }
 if(aberration>0.){vec2 offset=(vUv-.5)*aberration*2./outputResolution;col.r=displayColor(vUv+offset).r;col.b=displayColor(vUv-offset).b;}
 /* STUDIO_BACKGROUND */
 vec2 q=vUv-.5;col*=1.-vignette*dot(q,q);
 if(grain>0.)col+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)*grain;
 col=pow(clamp(col+blackLevel,0.,1.),vec3(1./gamma));gl_FragColor=vec4(col,1.);
}`;
