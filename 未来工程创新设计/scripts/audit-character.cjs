'use strict';
// Read-only inventory. A matching animation name alone never proves duplication.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),assetRoot=path.join(root,'character');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function readGLB(file){
 const data=fs.readFileSync(file);
 if(data.readUInt32LE(0)!==0x46546c67||data.readUInt32LE(4)!==2||data.readUInt32LE(8)!==data.length)throw Error('Invalid GLB: '+file);
 let json,bin;for(let at=12;at<data.length;){const size=data.readUInt32LE(at),type=data.readUInt32LE(at+4),chunk=data.subarray(at+8,at+8+size);if(type===0x4e4f534a)json=JSON.parse(chunk.toString());if(type===0x004e4942)bin=chunk;at+=size+8;}
 return {data,json,bin};
}
function accessorBytes(g,index){
 const a=g.json.accessors[index],v=g.json.bufferViews[a.bufferView],counts={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16},sizes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
 if(a.sparse)throw Error('Sparse accessor requires explicit decoding');
 const width=counts[a.type]*sizes[a.componentType],stride=v.byteStride||width,start=(v.byteOffset||0)+(a.byteOffset||0),out=Buffer.alloc(a.count*width);
 for(let i=0;i<a.count;i++)g.bin.copy(out,i*width,start+i*stride,start+i*stride+width);
 return out;
}
function inspect(file){
 const g=readGLB(file),j=g.json;
 const signature=indices=>hash(Buffer.concat(indices.map(i=>accessorBytes(g,i))));
 const animations=(j.animations||[]).map(a=>{
  const tracks=a.channels.map(c=>{const s=a.samplers[c.sampler];return {bone:j.nodes[c.target.node].name,path:c.target.path,interpolation:s.interpolation||'LINEAR',input:hash(accessorBytes(g,s.input)),output:hash(accessorBytes(g,s.output))};});
  const times=a.samplers.flatMap(s=>{const b=accessorBytes(g,s.input);return Array.from({length:b.length/4},(_,i)=>b.readFloatLE(i*4));});
  return {name:a.name,duration:Math.max(...times),channels:a.channels.length,tracksSHA256:hash(JSON.stringify(tracks)),ladder:/ladder|climb|爬梯|攀爬/i.test(a.name)};
 });
 return {file:path.relative(root,file).replaceAll('\\','/'),bytes:g.data.length,sha256:hash(g.data),animations,
  meshes:(j.meshes||[]).flatMap(m=>m.primitives.map(p=>({vertices:j.accessors[p.attributes.POSITION].count,triangles:p.indices===undefined?j.accessors[p.attributes.POSITION].count/3:j.accessors[p.indices].count/3,geometrySHA256:signature([...Object.entries(p.attributes).sort().map(([,i])=>i),...(p.indices===undefined?[]:[p.indices])])}))),
  skins:(j.skins||[]).map(s=>({joints:s.joints.map(i=>j.nodes[i].name),bindSHA256:signature([s.inverseBindMatrices])})),
  images:(j.images||[]).map(i=>{const v=j.bufferViews[i.bufferView],b=g.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);return {mimeType:i.mimeType,bytes:b.length,sha256:hash(b)};})};
}
function scan(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?scan(path.join(dir,d.name)):/\.glb$/i.test(d.name)?[inspect(path.join(dir,d.name))]:[]);}
if(require.main===module){
 const files=scan(assetRoot),groups=new Map();for(const f of files){const g=groups.get(f.sha256)||[];g.push(f.file);groups.set(f.sha256,g);}
 const report={files,exactDuplicates:[...groups.values()].filter(g=>g.length>1)};
 fs.writeFileSync(path.join(root,'docs/character-asset-audit.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({files:files.map(f=>({...f,skins:f.skins.map(s=>({joints:s.joints.length,bindSHA256:s.bindSHA256}))})),exactDuplicates:report.exactDuplicates},null,2));
}
module.exports={readGLB,accessorBytes,inspect,scan};
