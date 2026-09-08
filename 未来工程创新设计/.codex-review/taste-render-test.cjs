/* Lightweight rendering-math regression, without a scene or GPU.
 * Executes scalarized expressions extracted from the production GLSL against
 * analytic interpolation and radiometric invariants. It does not compile GLSL
 * on a driver or claim pixel, visual-quality, or frame-rate validation. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'lunar-renderer.js'),'utf8');
const post=source.slice(source.indexOf('const postMat='),source.indexOf('const accumulateMat='));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
const helpers={clamp,mix,pow:Math.pow,abs:Math.abs,floor:Math.floor,fract:x=>x-Math.floor(x),step:(edge,x)=>x<edge?0:1,vec2:x=>x,vec3:x=>x};
const close=(actual,expected,message,tolerance=1e-10)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${message}: ${actual} != ${expected}`);
function body(text,name){
 const match=new RegExp('\\b(?:float|vec[234]|void)\\s+'+name+'\\s*\\(').exec(text);assert.ok(match,'Missing GLSL function '+name);
 const start=text.indexOf('{',match.index);let depth=1,end=start+1;
 for(;end<text.length&&depth;end++)depth+=text[end]==='{'?1:text[end]==='}'?-1:0;
 assert.equal(depth,0,'Unclosed GLSL function '+name);return text.slice(start+1,end-1);
}
const aoBody=body(post,'ambientOcclusion'),displayBody=body(post,'displayColor'),mainBody=body(post,'main');
const expression=name=>{
 const match=new RegExp('\\b(?:float|vec[234])\\s+'+name+'\\s*=([^;]+);').exec(aoBody);
 assert.ok(match,'Missing AO expression '+name);return match[1];
};
const expressions=Object.fromEntries(['pixel','base','fraction','cell','sampleUV','bilinear','w','visibility'].map(name=>[name,expression(name)]));
expressions.output=aoBody.slice(aoBody.lastIndexOf('return ')+7).split(';')[0];
const compiled=new Map();
function evaluate(expr,variables){
 const scope={...helpers,...variables},keys=Object.keys(scope),key=expr+'|'+keys.join(',');
 let fn=compiled.get(key);if(!fn){fn=new Function(...keys,'return ('+expr+');');compiled.set(key,fn);}return fn(...keys.map(k=>scope[k]));
}
// Coordinate and weight expressions come from GLSL. The sampler is a finite
// nearest-texel table; expected results below are independent analytic fields.
function reconstruct(texels,uv,z,strength=1){
 const size=[texels[0].length,texels.length],coordinates=uv.map((u,k)=>{
  const pixel=evaluate(expressions.pixel,{vUv:u,aoResolution:size[k]});
  return {pixel,base:evaluate(expressions.base,{pixel}),fraction:evaluate(expressions.fraction,{pixel})};
 });
 let sum=0,weight=0;const reads=[];
 for(const offset of [[0,0],[1,0],[0,1],[1,1]]){
  const sampleUV=[],bilinear=[];
  for(let k=0;k<2;k++){
   const {base,fraction}=coordinates[k],cell=evaluate(expressions.cell,{base,offset:offset[k],aoResolution:size[k]});
   sampleUV[k]=evaluate(expressions.sampleUV,{cell,aoResolution:size[k]});
   bilinear[k]=evaluate(expressions.bilinear,{fraction,offset:offset[k]});
  }
  reads.push(sampleUV);const x=clamp(Math.floor(sampleUV[0]*size[0]),0,size[0]-1),y=clamp(Math.floor(sampleUV[1]*size[1]),0,size[1]-1),a=texels[y][x];
  const w=evaluate(expressions.w,{bilinear:{x:bilinear[0],y:bilinear[1]},a:{x:a[0],y:a[1]},z});sum+=a[0]*w;weight+=w;
 }
 const visibility=evaluate(expressions.visibility,{sum,weight});
 return {value:evaluate(expressions.output,{visibility,ao:strength}),reads};
}
const scalarDisplay=displayBody.replace(/\bvec3\s+x\s*=/,'let x=')
 .replace(/texture2D\(tScene,\s*uv\)\.rgb/g,'radiance').replace(/\blocalOcclusion\b/g,'occlusion').replace(/\blocalGlow\b/g,'glow');
assert.ok(!/texture2D/.test(scalarDisplay),'Display adapter must account for every texture fetch');
const displayFunction=new Function('radiance','occlusion','glow','bloom','exposure',...Object.keys(helpers),scalarDisplay);
const display=(radiance,occlusion=1,glow=0,bloom=.2,exposure=1)=>displayFunction(radiance,occlusion,glow,bloom,exposure,...Object.values(helpers));
const results=[];
function test(name,fn){try{fn();results.push({name,passed:true});console.log('PASS:',name);}catch(error){results.push({name,passed:false});console.error('FAIL:',name,error.stack);}}

test('Renderer JavaScript and shader blocks remain structurally valid; AO keeps four nearest reads',()=>{
 new vm.Script(source,{filename:'lunar-renderer.js'});
 const rt=source.match(/const aoRT=new T\.WebGLRenderTarget\([^;]+;/)?.[0];
 assert.match(rt,/minFilter:T\.NearestFilter/);assert.match(rt,/magFilter:T\.NearestFilter/);
 assert.match(aoBody,/for\s*\(int i=0;i<4;i\+\+\)/);
 assert.equal((aoBody.match(/texture2D\(tAO,/g)||[]).length,1);
 assert.equal((aoBody.match(/texture2D\(tDepth,/g)||[]).length,1);
 assert.match(aoBody,/if\(depth>\.99999\)return 1\./,'Sky must not inherit foreground AO');
 const shaders=[...source.matchAll(/fragmentShader:`([\s\S]*?)`/g)].map(m=>m[1]);
 assert.ok(shaders.length>=4);
 for(const shader of shaders){const stack=[];for(const c of shader.replace(/\/\/[^\n]*/g,'')){if('({['.includes(c))stack.push(c);else if(')}]'.includes(c))assert.equal(stack.pop(),'({['[')}]'.indexOf(c)]);}assert.equal(stack.length,0);}
});

test('Every AO lookup lands on a real texel center, including borders and a one-texel target',()=>{
 for(const size of [[1,1],[2,3],[5,4]]){
  const field=Array.from({length:size[1]},()=>Array.from({length:size[0]},()=>[.6,100]));
  for(const uv of [[0,0],[1,1],[.137,.863],[.5,.5]])for(const p of reconstruct(field,uv,100).reads)for(let k=0;k<2;k++){
   const index=p[k]*size[k]-.5;close(index,Math.round(index),'Original texel center');assert.ok(index>=0&&index<size[k]);
  }
 }
});

test('Exact sample centers preserve their AO even next to opposing visibility and depth',()=>{
 const field=[[[.2,100],[1,14000]],[[.8,900],[.4,10]]];
 for(let y=0;y<2;y++)for(let x=0;x<2;x++)close(reconstruct(field,[(x+.5)/2,(y+.5)/2],500).value,field[y][x][0],'Exact texel sample');
});

test('A constant field is conserved at arbitrary depths, edges, resolutions and AO strengths',()=>{
 for(const size of [[1,1],[3,2]])for(const z of [1,100,14000])for(const strength of [0,.56,1]){
  const field=Array.from({length:size[1]},(_,y)=>Array.from({length:size[0]},(_,x)=>[.42,10+(x+y)*3500]));
  for(const uv of [[0,0],[1,1],[.18,.73],[.5,.5]])close(reconstruct(field,uv,z,strength).value,1-(1-.42)*strength,'Partition of unity');
 }
 // The old max(weight, .0001) denominator darkened even this fully visible sky stencil.
 close(reconstruct([[[1,14000],[1,14000]]],[.4,.5],1).value,1,'Remote but fully visible samples stay fully visible');
});

test('Equal-depth affine fields reproduce their analytic bilinear value instead of a box average',()=>{
 const width=4,height=3,field=Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>[.2+.11*x+.07*y,200]));
 for(const uv of [[0,0],[1,1],[.2,.37],[.63,.71],[.42,.19]]){
  const expected=.2+.11*clamp(uv[0]*width-.5,0,width-1)+.07*clamp(uv[1]*height-.5,0,height-1);
  close(reconstruct(field,uv,200).value,expected,'Affine plane interpolation');
 }
});

test('Depth boundaries retain the matching surface instead of mixing foreground with background',()=>{
 const field=[[[.25,100],[1,14000]],[[.25,100],[1,14000]]];
 const front=reconstruct(field,[.5,.5],100).value,back=reconstruct(field,[.5,.5],14000).value;
 assert.ok(front>=.25&&front<.2501,'Foreground AO should remain close to its original value');
 assert.ok(back<=1&&back>.9999,'Background should not acquire a dark foreground halo');
});

test('AO and bloom are gathered once before FXAA and never added after the display transfer',()=>{
 assert.equal((mainBody.match(/ambientOcclusion\(/g)||[]).length,1);assert.equal((mainBody.match(/texture2D\(tBloom,/g)||[]).length,1);
 assert.ok(mainBody.indexOf('localOcclusion=')<mainBody.indexOf('antialias('));assert.ok(mainBody.indexOf('localGlow=')<mainBody.indexOf('antialias('));
 assert.ok(!/texture2D|ambientOcclusion/.test(body(post,'antialias')));
 assert.ok(!/glow|bloom|localOcclusion/i.test(mainBody.slice(mainBody.indexOf('antialias(')+11)),'No radiometric operations after display conversion');
 assert.ok(!/#include\s*<(?:tonemapping|colorspace)_fragment>/.test(post),'Custom post output must not add another conversion');
});

test('Zero exposure extinguishes bloom too, while unoccluded glow remains independent of surface AO',()=>{
 for(const r of [0,.18,4])for(const g of [0,.1,10])close(display(r,.3,g,.2,0),0,'Zero exposure');
 assert.ok(display(0,1,1,.2,1)>0,'Bloom contributes linear radiance');
 close(display(0,.1,1,.2,1),display(0,1,1,.2,1),'AO must not attenuate the separate glow contribution');
});

test('Equivalent linear energy and exposure produce identical displayed colors',()=>{
 for(const r of [.02,.18,1,4])for(const e of [.3,1,2]){
  close(display(r,.6,.35,.2,e),display(r*.6+.35*.2,1,0,.2,e),'Linear radiance addition');
  close(display(r,.6,.35,.2,e),display(r*e,.6,.35*e,.2,1),'Exposure scales scene and bloom together');
 }
});

test('The single filmic and sRGB transform stays finite, bounded and monotone',()=>{
 for(const r of [0,.0001,.02,.18,1,8]){
  const values=[0,.1,.5,1,2,4].map(e=>display(r,.7,.2,.2,e));
  assert.ok(values.every(v=>Number.isFinite(v)&&v>=0&&v<=1));assert.ok(values.every((v,i)=>i===0||v>=values[i-1]));
 }
 const x=.18,mapped=x*(2.51*x+.03)/(x*(2.43*x+.59)+.14),standardSRGB=mapped<=.0031308?mapped*12.92:1.055*Math.pow(mapped,1/2.4)-.055;
 close(display(x),standardSRGB,'One reference sRGB transfer after filmic mapping');
});

test('Bundled Three r160 leaves ordinary render targets linear and untone-mapped',()=>{
 const vendor=fs.readFileSync(path.join(root,'vendor/three.min.js'),'utf8');
 assert.ok(vendor.includes('const e="160"'));assert.ok(vendor.includes('t.NoToneMapping=p'));assert.ok(vendor.includes('Ht="srgb-linear"'));
 assert.ok(vendor.includes('s.toneMapped&&(null!==D&&!0!==D.isXRRenderTarget||(yt=t.toneMapping))'));
 assert.ok(vendor.includes('outputColorSpace:null===D?t.outputColorSpace:!0===D.isXRRenderTarget?D.texture.colorSpace:Ht'));
});

console.log(`${results.filter(r=>r.passed).length}/${results.length} rendering-math checks passed. No scene construction, GPU or driver GLSL compilation.`);
if(results.some(r=>!r.passed))process.exitCode=1;
