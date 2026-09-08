// HDR rendering: genuine off-screen MSAA, half-resolution bilateral AO,
// quarter-resolution bloom and edge-aware FXAA. Cinematic stills accumulate
// eight jittered samples, then release RAF completely.
const renderProfiles={
 high:{label:'精细',dpr:1.75,shadow:4096,samples:4,aoSamples:8,aoStrength:.56,accumulate:0},
 cinematic:{label:'极致',dpr:2,shadow:4096,samples:4,aoSamples:16,aoStrength:.68,accumulate:8},
 performance:{label:'高帧',dpr:1.25,shadow:2048,samples:2,aoSamples:0,aoStrength:0,accumulate:0}
};
let qualityMode='high',highQuality=true,aaMode='auto',aaSamples=0,accumulationCount=0,renderSettingsVersion=0;
const targetRT=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true});
targetRT.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
const aoRT=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false,minFilter:T.NearestFilter,magFilter:T.NearestFilter});
const brightRT=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false}),bloomRT=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});
const stillRT=new T.WebGLRenderTarget(1,1,{depthBuffer:false}),historyRT=[new T.WebGLRenderTarget(1,1,{depthBuffer:false}),new T.WebGLRenderTarget(1,1,{depthBuffer:false})];
let historyIndex=0;
const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1),quad=new T.Mesh(new T.PlaneGeometry(2,2));postScene.add(quad);
const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const aoMat=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,extensions:{derivatives:true},uniforms:{tDepth:{value:targetRT.depthTexture},resolution:{value:new T.Vector2(1,1)},projectionInverse:{value:new T.Matrix4()},samples:{value:8}},vertexShader:vertex,fragmentShader:`
uniform sampler2D tDepth;uniform vec2 resolution;uniform mat4 projectionInverse;uniform int samples;varying vec2 vUv;
vec3 positionAt(vec2 uv){vec4 p=projectionInverse*vec4(uv*2.-1.,texture2D(tDepth,uv).r*2.-1.,1.);return p.xyz/p.w;}
void main(){float depth=texture2D(tDepth,vUv).r;if(depth>.99999){gl_FragColor=vec4(1.,14000.,0.,1.);return;}vec3 p=positionAt(vUv);vec3 n=normalize(cross(dFdx(p),dFdy(p)));float radius=clamp(14.*resolution.y/max(1.,-p.z),2.,18.);float occ=0.;for(int i=0;i<16;i++){if(i>=samples)break;float a=float(i)*2.399963;float r=sqrt((float(i)+.5)/float(samples));vec2 uv=clamp(vUv+vec2(cos(a),sin(a))*radius*r/resolution,vec2(0.),vec2(1.));vec3 d=positionAt(uv)-p;float len=length(d);occ+=max(0.,dot(n,d/max(len,.001))-.15)*(1.-smoothstep(2.,18.,len));}gl_FragColor=vec4(1.-clamp(occ/float(samples)*2.7,0.,.6),-p.z,0.,1.);}`});
const bloomH=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{tScene:{value:targetRT.texture},resolution:{value:new T.Vector2(1,1)}},vertexShader:vertex,fragmentShader:`
uniform sampler2D tScene;uniform vec2 resolution;varying vec2 vUv;
vec3 bright(vec2 uv){vec3 c=texture2D(tScene,uv).rgb;float b=max(c.r,max(c.g,c.b)),k=clamp((b-1.7)/1.35,0.,1.);return c*k*k/(1.+b*.28);}
void main(){vec2 d=vec2(1./resolution.x,0.);vec3 c=bright(vUv)*.227027;c+=(bright(vUv+d*1.384615)+bright(vUv-d*1.384615))*.316216;c+=(bright(vUv+d*3.230769)+bright(vUv-d*3.230769))*.070270;gl_FragColor=vec4(c,1.);}`});
const bloomV=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{tScene:{value:brightRT.texture},resolution:{value:new T.Vector2(1,1)}},vertexShader:vertex,fragmentShader:`
uniform sampler2D tScene;uniform vec2 resolution;varying vec2 vUv;void main(){vec2 d=vec2(0.,1./resolution.y);vec3 c=texture2D(tScene,vUv).rgb*.227027;c+=(texture2D(tScene,vUv+d*1.384615).rgb+texture2D(tScene,vUv-d*1.384615).rgb)*.316216;c+=(texture2D(tScene,vUv+d*3.230769).rgb+texture2D(tScene,vUv-d*3.230769).rgb)*.070270;gl_FragColor=vec4(c,1.);}`});
const postMat=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{tScene:{value:targetRT.texture},tDepth:{value:targetRT.depthTexture},tAO:{value:aoRT.texture},tBloom:{value:bloomRT.texture},resolution:{value:new T.Vector2(1,1)},aoResolution:{value:new T.Vector2(1,1)},projectionInverse:{value:new T.Matrix4()},exposure:{value:1.02},bloom:{value:.14},ao:{value:.56},fxaa:{value:1}},vertexShader:vertex,fragmentShader:`
uniform sampler2D tScene,tDepth,tAO,tBloom;uniform vec2 resolution,aoResolution;uniform mat4 projectionInverse;uniform float exposure,bloom,ao,fxaa;varying vec2 vUv;
// AO and bloom are radiometric operations, before the single filmic/display transform.
// Reuse this pixel's smooth fields across FXAA taps instead of repeating AO gathers.
float localOcclusion;vec3 localGlow;
vec3 displayColor(vec2 uv){vec3 x=(texture2D(tScene,uv).rgb*localOcclusion+localGlow*bloom)*exposure;x=clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);return mix(x*12.92,1.055*pow(x,vec3(1./2.4))-.055,step(vec3(.0031308),x));}
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
vec3 antialias(){vec2 px=1./resolution;vec3 c=displayColor(vUv);if(fxaa<.5)return c;vec3 nw=displayColor(vUv+vec2(-1.,1.)*px),ne=displayColor(vUv+px),sw=displayColor(vUv-px),se=displayColor(vUv+vec2(1.,-1.)*px);float a=lum(nw),b=lum(ne),d=lum(sw),e=lum(se),m=lum(c),lo=min(m,min(min(a,b),min(d,e))),hi=max(m,max(max(a,b),max(d,e)));if(hi-lo<max(.0312,hi*.125))return c;vec2 dir=vec2(-((a+b)-(d+e)),(a+d)-(b+e));float reduce=max((a+b+d+e)*.03125,.0078125);dir=clamp(dir/(min(abs(dir.x),abs(dir.y))+reduce),vec2(-8.),vec2(8.))*px;vec3 ca=.5*(displayColor(vUv+dir*(1./3.-.5))+displayColor(vUv+dir*(2./3.-.5)));vec3 cb=ca*.5+.25*(displayColor(vUv+dir*-.5)+displayColor(vUv+dir*.5));float l=lum(cb);return l<lo||l>hi?ca:cb;}
float ambientOcclusion(){
 if(ao<=0.)return 1.;float depth=texture2D(tDepth,vUv).r;if(depth>.99999)return 1.;
 vec4 p=projectionInverse*vec4(vUv*2.-1.,depth*2.-1.,1.);float z=-p.z/p.w;
 // Gather original AO/depth pairs; filtering their depth first creates false edges.
 vec2 pixel=vUv*aoResolution-.5;vec2 base=floor(pixel);vec2 fraction=fract(pixel);
 float sum=0.,weight=0.;
 for(int i=0;i<4;i++){
  vec2 offset=vec2(float(i-2*(i/2)),float(i/2));
  vec2 cell=clamp(base+offset,vec2(0.),aoResolution-1.);
  vec2 sampleUV=(cell+.5)/aoResolution;vec2 a=texture2D(tAO,sampleUV).rg;
  vec2 bilinear=mix(1.-fraction,fraction,offset);
  float w=bilinear.x*bilinear.y/(1.+abs(a.y-z)*2.);sum+=a.x*w;weight+=w;
 }
 float visibility=weight>0.?sum/weight:1.;return 1.-(1.-clamp(visibility,0.,1.))*ao;
}
void main(){localOcclusion=ambientOcclusion();localGlow=texture2D(tBloom,vUv).rgb;vec3 col=antialias();vec2 q=vUv-.5;col*=1.-.17*dot(q,q);gl_FragColor=vec4(clamp(col,0.,1.),1.);}`});
const accumulateMat=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{current:{value:stillRT.texture},previous:{value:historyRT[0].texture},weight:{value:1}},vertexShader:vertex,fragmentShader:'uniform sampler2D current,previous;uniform float weight;varying vec2 vUv;void main(){vec4 c=texture2D(current,vUv);gl_FragColor=weight>.999?c:mix(texture2D(previous,vUv),c,weight);}'});
const copyMat=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{source:{value:historyRT[0].texture}},vertexShader:vertex,fragmentShader:'uniform sampler2D source;varying vec2 vUv;void main(){gl_FragColor=texture2D(source,vUv);}'});
function resetAccumulation(){accumulationCount=0;}
function hasPendingRefinement(){return renderProfiles[qualityMode].accumulate>accumulationCount;}
function supportedSamples(wanted){if(!renderer.capabilities.isWebGL2)return 0;let levels=[0,2,4,8].filter(n=>n<=(renderer.capabilities.maxSamples??4));try{const gl=renderer.getContext?.();if(gl?.getInternalformatParameter)levels=Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER,gl.RGBA16F,gl.SAMPLES));}catch{}return Math.max(0,...levels.filter(n=>n<=wanted));}
function configureRenderer(mode='high',aa='auto'){
 qualityMode=renderProfiles[mode]?mode:'high';highQuality=qualityMode!=='performance';aaMode=aa;const p=renderProfiles[qualityMode];const samples=aa==='fxaa'?0:supportedSamples(p.samples);if(targetRT.samples!==samples){targetRT.dispose();targetRT.samples=samples;}aaSamples=samples;
 const dpr=window.devicePixelRatio||1;renderer.setPixelRatio(Math.min(qualityMode==='cinematic'?dpr*1.25:dpr,p.dpr));
 if(sun.shadow.mapSize.x!==p.shadow){sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapSize.set(p.shadow,p.shadow);}renderer.shadowMap.enabled=true;renderer.shadowMap.needsUpdate=true;
 aoMat.uniforms.samples.value=p.aoSamples;postMat.uniforms.ao.value=p.aoStrength;postMat.uniforms.fxaa.value=aa==='msaa'&&samples>0?0:1;resetAccumulation();renderSettingsVersion++;
 return p.label+' · '+(samples?samples+'× MSAA':'FXAA')+(qualityMode==='cinematic'?' · 8帧精修':'');
}
function resizeRenderTargets(w,h){renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();const size=renderer.getDrawingBufferSize(new T.Vector2());targetRT.setSize(size.x,size.y);postMat.uniforms.resolution.value.copy(size);const half=new T.Vector2(Math.max(1,Math.ceil(size.x/2)),Math.max(1,Math.ceil(size.y/2))),quarter=new T.Vector2(Math.max(1,Math.ceil(size.x/4)),Math.max(1,Math.ceil(size.y/4)));aoRT.setSize(half.x,half.y);aoMat.uniforms.resolution.value.copy(half);postMat.uniforms.aoResolution.value.copy(half);for(const rt of [brightRT,bloomRT])rt.setSize(quarter.x,quarter.y);bloomH.uniforms.resolution.value.copy(quarter);bloomV.uniforms.resolution.value.copy(quarter);if(qualityMode==='cinematic')for(const rt of [stillRT,...historyRT])rt.setSize(size.x,size.y);resetAccumulation();renderer.shadowMap.needsUpdate=true;}
function pass(material,target){quad.material=material;renderer.setRenderTarget(target);renderer.render(postScene,postCamera);}
const jitterSamples=[[.5,1/3],[.25,2/3],[.75,1/9],[.125,4/9],[.625,7/9],[.375,2/9],[.875,5/9],[.0625,8/9]];
function renderScene({moving=false}={}){
 if(renderer.info){renderer.info.autoReset=false;renderer.info.reset?.();}if(moving)resetAccumulation();
 const refine=!moving&&qualityMode==='cinematic',offset=jitterSamples[accumulationCount%8];
 if(refine){const r=postMat.uniforms.resolution.value;camera.setViewOffset(r.x,r.y,offset[0]-.5,offset[1]-.5,r.x,r.y);}
 renderer.setRenderTarget(targetRT);renderer.render(scene,camera);aoMat.uniforms.projectionInverse.value.copy(camera.projectionMatrixInverse);postMat.uniforms.projectionInverse.value.copy(camera.projectionMatrixInverse);
 if(renderProfiles[qualityMode].aoSamples)pass(aoMat,aoRT);pass(bloomH,brightRT);pass(bloomV,bloomRT);pass(postMat,refine?stillRT:null);
 if(refine){const next=1-historyIndex;accumulateMat.uniforms.previous.value=historyRT[historyIndex].texture;accumulateMat.uniforms.weight.value=1/(accumulationCount+1);pass(accumulateMat,historyRT[next]);historyIndex=next;copyMat.uniforms.source.value=historyRT[next].texture;pass(copyMat,null);accumulationCount=Math.min(8,accumulationCount+1);camera.clearViewOffset();}
}
function setLighting(mode){
 const night=mode==='night',day=mode==='day';
 sun.color.set(night?'#9eb5ce':day?'#f5f7f6':'#fff0dc');sun.intensity=night?.1:day?3.9:3.5;
 sun.position.set(-640,day?800:530,440);ambient.intensity=night?.2:day?.9:.48;
 rim.color.set('#9eb6cb');rim.intensity=night?.46:day?1.25:1.05;
 mats.warm.emissiveIntensity=night?3:1.85;mats.cool.emissiveIntensity=night?2.4:1.25;
 mats.innerWall.emissiveIntensity=night?.38:.13;mats.interior.emissiveIntensity=night?.24:.1;
 stars.material.opacity=night?.66:day?.03:.18;
 workLights.forEach((l,i)=>l.intensity=[1400,1600,900,700][i]*(night?1.45:.7));
 postMat.uniforms.bloom.value=night?.3:.18;renderer.shadowMap.needsUpdate=true;resetAccumulation();
}
configureRenderer('high','auto');
setLighting('sunrise');
