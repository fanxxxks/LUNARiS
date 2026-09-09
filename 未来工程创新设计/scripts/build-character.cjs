'use strict';
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const {readGLB,accessorBytes}=require('./audit-character.cjs');
const root=path.resolve(__dirname,'..');
const old='character/Meshy_AI_business_man_rigged_biped/Meshy_AI_business_man_rigged_biped_Animation_';
const recent='character/new/Meshy_AI_Business_Man_Rig_biped/Meshy_AI_Business_Man_Rig_biped_Animation_';
const sources=[['idle',old+'Idle_9_withSkin.glb'],['walk',recent+'Walking_withSkin.glb'],['run',recent+'Running_withSkin.glb'],['wave',old+'Wave_One_Hand_withSkin.glb'],['push',old+'Step_Forward_and_Push_withSkin.glb'],['climb',recent+'Ladder_Climb_Loop_withSkin.glb']];
async function main(){
 const base=readGLB(path.join(root,recent+'Walking_withSkin.glb')),j=structuredClone(base.json);
 const chunks=[],views=[],accessors=[],animations=[],clips=[],meshMap=new Map();let offset=0;
 function view(data){const padded=Buffer.alloc(Math.ceil(data.length/4)*4);data.copy(padded);const index=views.length;views.push({buffer:0,byteOffset:offset,byteLength:data.length});chunks.push(padded);offset+=padded.length;return index;}
 function accessor(g,index){const a=structuredClone(g.json.accessors[index]);a.bufferView=view(accessorBytes(g,index));a.byteOffset=0;delete a.sparse;accessors.push(a);return accessors.length-1;}
 const baseAccessor=i=>{if(!meshMap.has(i))meshMap.set(i,accessor(base,i));return meshMap.get(i);};
 for(const m of j.meshes)for(const p of m.primitives){for(const key of Object.keys(p.attributes))p.attributes[key]=baseAccessor(p.attributes[key]);if(p.indices!==undefined)p.indices=baseAccessor(p.indices);}
 for(const s of j.skins)s.inverseBindMatrices=baseAccessor(s.inverseBindMatrices);
 // Keep the original 8K dimensions. Re-encode once rather than embedding the
 // same 44 MiB PNG in every clip. Originals remain available for authoring.
 const texture=base.json.images[0],v=base.json.bufferViews[texture.bufferView];
 const encoded=await sharp(base.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength)).jpeg({quality:94,chromaSubsampling:'4:4:4'}).toBuffer();
 j.images=[{mimeType:'image/jpeg',bufferView:view(encoded)}];j.textures=[{source:0,sampler:0}];
 j.materials=[{name:'Feng Peng · textile',pbrMetallicRoughness:{baseColorTexture:{index:0},metallicFactor:0,roughnessFactor:.88},doubleSided:false}];
 delete j.extensionsUsed;delete j.extensionsRequired;
 const nodeByName=new Map(j.nodes.map((n,i)=>[n.name,i]));
 for(const [name,file]of sources){
  const g=readGLB(path.join(root,file)),animation=g.json.animations[0],a=structuredClone(animation),map=new Map();
  a.name=name;for(const s of a.samplers){for(const k of ['input','output']){if(!map.has(s[k]))map.set(s[k],accessor(g,s[k]));s[k]=map.get(s[k]);}}
  for(const c of a.channels){const bone=g.json.nodes[c.target.node].name,target=nodeByName.get(bone);if(target===undefined)throw Error('Missing bone '+bone);c.target.node=target;}
  animations.push(a);clips.push({name,source:file,originalName:animation.name,retarget:name==='idle'||name==='wave'||name==='push'});
 }
 // Runtime retargets old clips against source/target inverse-bind rest poses.
 const oldGLB=readGLB(path.join(root,sources[0][1]));
 const sourceRest={joints:oldGLB.json.skins[0].joints.map(i=>oldGLB.json.nodes[i].name),inverseBindMatrices:Array.from(new Float32Array(accessorBytes(oldGLB,oldGLB.json.skins[0].inverseBindMatrices).buffer))};
 j.animations=animations;j.accessors=accessors;j.bufferViews=views;j.buffers=[{byteLength:offset}];
 j.asset={version:'2.0',generator:'LUNARIS character builder'};
 let json=Buffer.from(JSON.stringify(j));const jsonPad=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(jsonPad);json=jsonPad;
 const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+offset,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
 const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(offset);binHeader.writeUInt32LE(0x004e4942,4);
 const glb=Buffer.concat([header,json,binHeader,...chunks]);fs.mkdirSync(path.join(root,'assets/character'),{recursive:true});
 fs.writeFileSync(path.join(root,'assets/character/feng-peng.glb'),glb);
 const metadata={clips,sourceRest,texture:{width:8192,height:8192,bytes:encoded.length},bytes:glb.length};
 fs.writeFileSync(path.join(root,'assets/character/manifest.json'),JSON.stringify(metadata,null,2)+'\n');
 fs.writeFileSync(path.join(root,'src/generated/character-pack.js'),'const LunarCharacterAsset='+JSON.stringify({...metadata,base64:glb.toString('base64')})+';\n');
 const esbuild=require('esbuild'),T=require('../vendor/three.min.js');
 const result=await esbuild.build({stdin:{contents:"import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'; import {clone} from 'three/addons/utils/SkeletonUtils.js'; globalThis.LunarGLTFLoader=GLTFLoader; globalThis.LunarCloneSkeleton=clone;",resolveDir:root},bundle:true,format:'iife',minify:true,write:false,plugins:[{name:'reuse-three',setup(b){b.onResolve({filter:/^three$/},()=>({path:'three',namespace:'global-three'}));b.onLoad({filter:/.*/,namespace:'global-three'},()=>({contents:'export const {'+Object.keys(T).join(',')+'}=globalThis.THREE;'}));}}]});
 fs.writeFileSync(path.join(root,'vendor/character-loader.js'),result.outputFiles[0].text);
 console.log(JSON.stringify({bytes:glb.length,clips:clips.map(c=>c.name),textureBytes:encoded.length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
