/* Convert photographic sources and deterministic metallic surface fields into GPU maps.
 * Normal/height/roughness are inferred microdetail, not measured photogrammetry.
 * node scripts/build-textures.cjs -> assets/textures/pbr + manifest + offline JS pack. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..'),out=path.join(root,'assets/textures'),source=path.join(out,'source');
const definitions={
 'pebbled-silver':{name:'高清细凹凸银色金属',procedural:'pebbled',mapSize:2048,colorSize:2048,tiling:'RepeatWrapping',tileWorld:170,roughness:.24,metalness:1,normalStrength:.42,relief:22,usage:'房间外壳、屋顶、舱门与服务面板；原生 2K 微表面，细密浅凹凸与宽幅金属反光'},
 'satin-alloy':{name:'轻磨砂拉丝银合金',procedural:'satin',tiling:'RepeatWrapping',tileWorld:28,roughness:.5,metalness:.9,normalStrength:.16,relief:3,usage:'房间外壳、屋顶、舱门与服务面板；细拉丝叠加轻磨砂颗粒，保留柔和宽高光'},
 'coated-alloy':{name:'金属珠光涂层',sourceFile:'coated-alloy-satin-v2.png',tileWorld:12,roughness:.27,metalness:.85,normalStrength:.14,relief:1.2,usage:'彩色外饰、设备柜体与室内金属饰面'},
 'brushed-titanium':{name:'抛光拉丝钛铝合金',tileWorld:12,roughness:.21,metalness:.98,normalStrength:.16,relief:1.7,usage:'结构框架、窗框、接缝与裸露五金'},
 'graphite-metal':{name:'石墨阳极金属',tileWorld:20,roughness:.29,metalness:.92,normalStrength:.16,relief:2},
 'woven-fabric':{name:'航天舱高密织物',tileWorld:6,roughness:.92,metalness:0,normalStrength:.6,relief:2.3},
 'molded-rubber':{name:'模压密封橡胶',tileWorld:9,roughness:.88,metalness:0,normalStrength:.48,relief:2},
 'ceramic-polymer':{name:'陶瓷与工程塑料',tileWorld:16,roughness:.48,metalness:0,normalStrength:.2,relief:1.5},
 'deck-tread':{name:'金属防滑甲板',tileWorld:28,roughness:.38,metalness:.9,normalStrength:.65,relief:3.2},
 'regolith':{name:'月壤矿物颗粒',tileWorld:60,roughness:.97,metalness:0,normalStrength:.85,relief:2.6},
 'leaf-veins':{name:'水培叶片微叶脉',tileWorld:1,roughness:.73,metalness:0,normalStrength:.5,relief:2},
 'glass-micro':{name:'透明玻璃微表面',tileWorld:25,roughness:.075,metalness:0,normalStrength:.018,relief:1},
 'braided-cable':{name:'金属编织护套',tileWorld:4,roughness:.27,metalness:.96,normalStrength:.65,relief:2.8},
 'insulation-foil':{name:'复合隔热金属膜',tileWorld:12,roughness:.24,metalness:.98,normalStrength:.65,relief:2.2},
 'interior-wall':{name:'微穿孔吸音内墙',tileWorld:18,roughness:.82,metalness:0,normalStrength:.3,relief:1.8,usage:'八类房间分区吸音后衬板与内墙'},
 'interior-upholstery':{name:'摄影织物家具软包',tileWorld:6,roughness:.94,metalness:0,normalStrength:.55,relief:2.2,usage:'床品、枕头、沙发、座椅与软包'},
 'interior-floor':{name:'防静电细颗粒地胶',tileWorld:24,roughness:.86,metalness:0,normalStrength:.38,relief:1.8,usage:'八类房间上下层地面'},
 'interior-worktop':{name:'实心复合工作台面',tileWorld:20,roughness:.43,metalness:0,normalStrength:.16,relief:1.3,usage:'柜顶、工作桌、厨房台面与茶几'}
};
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const srgb=v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);
// Seamless, band-limited micro relief. Albedo stays nearly uniform: the bright
// flecks come from real reflections of the normal field, not painted highlights.
function satinField(n){
 const hash=(x,y)=>{let v=Math.imul(x+371,374761393)^Math.imul(y+719,668265263);v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967295;};
 const noise=(u,v,cells)=>{const x=u*cells,y=v*cells,ix=Math.floor(x),iy=Math.floor(y),a=x-ix,b=y-iy,s=a*a*(3-2*a),t=b*b*(3-2*b),h=(i,j)=>hash((i%cells+cells)%cells,(j%cells+cells)%cells);return (h(ix,iy)*(1-s)+h(ix+1,iy)*s)*(1-t)+(h(ix,iy+1)*(1-s)+h(ix+1,iy+1)*s)*t;};
 const height=new Float32Array(n*n),rgb=Buffer.alloc(n*n*3);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  // Long diagonal strokes: strong correlation along each brushed strand,
  // shallow relief across it, with fine isotropic frosting between strands.
  const i=y*n+x,u=x/n,v=y/n,across=u+v,along=u-v;
  const strand=noise(across,along,192),fine=noise(across*2,along,192);
  const grain=noise(across,0,192)*.7+fine*.3;
  const frost=noise(u,v,96)*.72+noise(u,v,224)*.28;
  height[i]=.5+(grain-.5)*.065+(frost-.5)*.24;
  const tint=Math.round(210+(grain-.5)*7+(strand-.5)*.8+(frost-.5)*12);rgb[i*3]=tint;rgb[i*3+1]=tint+1;rgb[i*3+2]=tint+2;
 }return {height,rgb};
}
// Keep the reflection envelope and micrograin on separate spatial scales.
// One broad swell spans most of a room; shallow fine relief catches light
// without baking a dense checker of highlights into the silver albedo.
function pebbledField(n){
 const height=new Float32Array(n*n),roughness=new Float32Array(n*n),rgb=Buffer.alloc(n*n*3);
 const hash=(x,y)=>{let k=Math.imul(x+127,374761393)^Math.imul(y+359,668265263);k=Math.imul(k^(k>>>13),1274126177);return ((k^(k>>>16))>>>0)/4294967295;};
 const noise=(u,v,cells)=>{const x=u*cells,y=v*cells,ix=Math.floor(x),iy=Math.floor(y),a=x-ix,b=y-iy,s=a*a*a*(a*(a*6-15)+10),t=b*b*b*(b*(b*6-15)+10),h=(i,j)=>hash((i%cells+cells)%cells,(j%cells+cells)%cells);return (h(ix,iy)*(1-s)+h(ix+1,iy)*s)*(1-t)+(h(ix,iy+1)*(1-s)+h(ix+1,iy+1)*s)*t;};
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=y*n+x,u=x/n,v=y/n;
  const swell=noise(u+.17,v+.31,2)*.78+noise(u-.21,v+.08,3)*.22;
  const grain=noise(u,v,256)*.76+noise(u+.13,v-.07,512)*.24;
  height[i]=.5+(swell-.5)*.9+(grain-.5)*.005;
  roughness[i]=.24+(grain-.5)*.025;
  const value=Math.round(214+(grain-.5)*2);
  rgb[i*3]=value;rgb[i*3+1]=value+1;rgb[i*3+2]=value+2;
 }return {height,roughness,rgb};
}
async function main(){
 fs.mkdirSync(path.join(root,'src/generated'),{recursive:true});
 const families={},manifest={version:1,source:'ImageGen sources + procedural pebbled and satin alloys',normalConvention:'OpenGL tangent space (+Y up)',tiling:'MirroredRepeatWrapping, identical UVs for every PBR channel',derivation:'Photographic sources preserved. Pebbled and satin alloys use deterministic periodic height fields and neutral albedo. Other normals are inferred from band-limited luminance. ORM is calibrated by material family. No displacement.',families:{}};
 for(const [slug,spec]of Object.entries(definitions)){
  const n=spec.mapSize||512,colorSize=spec.colorSize||1024;
  const procedural=spec.procedural==='pebbled'?pebbledField(n):spec.procedural==='satin'?satinField(n):null;
  const file=path.join(source,spec.sourceFile||slug+'.png');
  if(procedural)await sharp(procedural.rgb,{raw:{width:n,height:n,channels:3}}).resize(colorSize,colorSize).png().toFile(file);
  if(!fs.existsSync(file))throw Error('Missing generated source '+file);
  const meta=await sharp(file).metadata(),dir=path.join(out,'pbr',slug);fs.mkdirSync(dir,{recursive:true});
  const albedoFile=path.join(dir,'albedo.jpg');await sharp(file).flatten({background:slug==='glass-micro'?'#9ca6aa':'#ffffff'}).resize(colorSize,colorSize,{fit:'fill'}).jpeg({quality:spec.colorSize?97:91,chromaSubsampling:'4:4:4'}).toFile(albedoFile);
  const {data:rgb}=await sharp(file).removeAlpha().resize(n,n).raw().toBuffer({resolveWithObject:true});
  const means=[0,0,0],height=new Float32Array(n*n),normal=Buffer.alloc(n*n*3),orm=Buffer.alloc(n*n*3),heightBytes=Buffer.alloc(n*n);
  const glassAlpha=slug==='glass-micro'&&meta.hasAlpha?await sharp(file).ensureAlpha().resize(n,n).extractChannel(3).raw().toBuffer():null;
  for(let i=0;i<n*n;i++){for(let c=0;c<3;c++)means[c]+=srgb(rgb[i*3+c]/255)/(n*n);height[i]=glassAlpha?glassAlpha[i]/255:(.2126*rgb[i*3]+.7152*rgb[i*3+1]+.0722*rgb[i*3+2])/255;}
  if(glassAlpha)means.fill(srgb(.63)); // Preview background only; never used as opaque glazing color.
  if(procedural)height.set(procedural.height);
  const sample=(x,y)=>height[procedural?((y+n)%n)*n+(x+n)%n:clamp(y,0,n-1)*n+clamp(x,0,n-1)];
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const i=y*n+x,v=height[i],blur=(sample(x-2,y)+sample(x+2,y)+sample(x,y-2)+sample(x,y+2)+v*4)/8,detail=v-blur;
   // Image Y points down; exported tangent-space Y points up.
   // Preserve physical slope when increasing native sampling resolution.
   const relief=spec.relief*(procedural?n/512:1);
   const nx=(sample(x-1,y)-sample(x+1,y))*relief,ny=(sample(x,y+1)-sample(x,y-1))*relief,q=1/Math.hypot(nx,ny,1);
   normal[i*3]=Math.round((nx*q*.5+.5)*255);normal[i*3+1]=Math.round((ny*q*.5+.5)*255);normal[i*3+2]=Math.round((q*.5+.5)*255);
   orm[i*3]=Math.round(clamp(1+Math.min(0,detail)*.45,.87,1)*255);
   orm[i*3+1]=Math.round(clamp(procedural?.roughness?procedural.roughness[i]:procedural?spec.roughness+(v-.5)*.35:glassAlpha?spec.roughness+v*.085:spec.roughness-detail*.4+(Math.abs(detail)*.1),.025,1)*255);
   orm[i*3+2]=Math.round(spec.metalness*255);heightBytes[i]=Math.round(clamp(procedural?v:.5+detail*2.2,0,1)*255);
  }
  const maps={albedo:{file:path.relative(root,albedoFile).replace(/\\/g,'/'),width:colorSize,height:colorSize,colorSpace:'sRGB'}};
  for(const [name,data,channels]of [['normal',normal,3],['orm',orm,3],['height',heightBytes,1]]){
   const dest=path.join(dir,name+'.png');await sharp(data,{raw:{width:n,height:n,channels}}).png({compressionLevel:9}).toFile(dest);maps[name]={file:path.relative(root,dest).replace(/\\/g,'/'),width:n,height:n,colorSpace:'linear'};
  }
  // Standalone authoring maps exactly match the packed runtime channels.
  for(const [name,channel]of [['roughness',1],['metalness',2]]){
   const dest=path.join(dir,name+'.png');await sharp(orm,{raw:{width:n,height:n,channels:3}}).extractChannel(channel).png({compressionLevel:9}).toFile(dest);
   maps[name]={file:path.relative(root,dest).replace(/\\/g,'/'),width:n,height:n,colorSpace:'linear'};
  }
  families[slug]={...spec,meanLinear:means,maps:Object.fromEntries(Object.entries(maps).filter(([key])=>['albedo','normal','orm'].includes(key)).map(([key,map])=>[key,{width:map.width,height:map.height,url:'data:image/'+(key==='albedo'?'jpeg':'png')+';base64,'+fs.readFileSync(path.join(root,map.file)).toString('base64')}]))};
  manifest.families[slug]={...spec,source:path.relative(root,file).replace(/\\/g,'/'),sourceSize:[meta.width,meta.height],sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),meanLinear:means,maps};
  console.log(slug+': '+meta.width+'×'+meta.height+' -> '+colorSize+' color / '+n+' normal, ORM, height');
 }
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(out,'catalog-data.js'),'// Generated alongside the PBR files. Works on file:// without fetch.\nconst MATERIAL_ATLAS_DATA='+JSON.stringify(Object.entries(manifest.families).map(([slug,item])=>({slug,...item})))+';\n');
 fs.writeFileSync(path.join(root,'src/generated/texture-pack.js'),'// Generated by scripts/build-textures.cjs. ImageGen sources are retained in assets/textures/source.\nconst LUNAR_TEXTURE_PACK='+JSON.stringify({version:1,families})+';\n');
 console.log('Embedded '+Object.keys(families).length+' material families in src/generated/texture-pack.js.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
