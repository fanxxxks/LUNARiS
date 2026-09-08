// Shared PBR material library. All bitmaps are embedded and GPU data textures
// use linear channels. No displacement changes the transport/clearance model.
function surfaceTexture(family,channel){
 const cache=surfaceTexture.cache||(surfaceTexture.cache=new Map()),key=family+'/'+channel;if(cache.has(key))return cache.get(key);
 const spec=LUNAR_TEXTURE_PACK.families[family],asset=spec?.maps[channel];if(!asset)throw Error('Missing embedded material '+key);
 const map=new T.Texture();map.name='photo/'+key;map.colorSpace=channel==='albedo'?T.SRGBColorSpace:T.NoColorSpace;
 map.wrapS=map.wrapT=spec.tiling==='RepeatWrapping'?T.RepeatWrapping:T.MirroredRepeatWrapping;map.anisotropy=Math.min(spec.mapSize>=2048?16:8,renderer.capabilities.getMaxAnisotropy());
 map.minFilter=T.LinearMipmapLinearFilter;map.magFilter=T.LinearFilter;map.generateMipmaps=true;
 map.userData={family,channel,embedded:true};cache.set(key,map);
 const state=surfaceTexture.state||(surfaceTexture.state={pending:0,loaded:0,failed:[]});state.pending++;
 const img=document.createElement('img');img.width=asset.width;img.height=asset.height;map.image=img;
 img.onload=()=>{map.needsUpdate=true;state.pending--;state.loaded++;if(surfaceTexture.ready){renderer.shadowMap.needsUpdate=true;requestRender();}};
 img.onerror=()=>{state.pending--;state.failed.push(key);$('error').hidden=false;$('error').textContent='部分表面贴图未能解码，请重新打开软件。';if(surfaceTexture.ready)requestRender();};
 img.src=asset.url;return map;
}
function applyPhotographicSurfaces(){
 const finish=(mat,family,options={})=>{
  if(!mat)return;family=mat.userData.surfaceSpec?.family||family;const spec=LUNAR_TEXTURE_PACK.families[family];
  if(!spec)throw Error('Missing photographic material family '+family);
  mat.userData.surfaceFamily=family;mat.userData.surfaceUV=options.keepUV?'existing':'metric';mat.userData.surfaceTile=options.tile||spec.tileWorld;
  if(!options.keepMap){
   mat.map=surfaceTexture(family,'albedo');
   // Maintain each room's intentional palette while retaining photographic
   // color variation. Linear compensation prevents double-darkening a tint.
   const c=mat.color;spec.meanLinear.forEach((mean,i)=>{const axis=['r','g','b'][i];c[axis]=Math.min(1.6,c[axis]/Math.max(.035,mean));});
  }
  if(mat.isMeshStandardMaterial||mat.isMeshPhysicalMaterial){
   const targetRoughness=options.roughness??mat.roughness;
   const targetMetalness=options.metalness??(spec.metalness?mat.metalness:0);
   mat.userData.surfaceTarget={roughness:targetRoughness,metalness:targetMetalness};
   mat.normalMap=surfaceTexture(family,'normal');mat.normalScale.setScalar(options.normal??spec.normalStrength);
   mat.roughnessMap=surfaceTexture(family,'orm');mat.metalnessMap=mat.roughnessMap;
   if(!mat.transparent&&family!=='glass-micro'){mat.aoMap=mat.roughnessMap;mat.aoMapIntensity=.35;}
   // This is a multiplier for the ORM green channel, not final roughness.
   // Clamp only the authored target: Three.js bounds the sampled result in
   // lights_physical_fragment. Clipping this multiplier to 1 made a matte
   // .91 wall with a .48 map render at .48 and .30 displays render at .075.
   mat.roughness=Math.max(0,Math.min(1,targetRoughness))/Math.max(.02,spec.roughness);
   // ORM B is sampled before Three.js bounds the final metalness. Its
   // multiplier must not cap a .95 metal to a family's .12 packed value.
   mat.metalness=spec.metalness?Math.max(0,Math.min(1,targetMetalness))/spec.metalness:targetMetalness;
   if(!spec.metalness)mat.metalnessMap=null;
   if(options.environment!==undefined)mat.envMapIntensity=options.environment;
   if(options.emissive!==undefined)mat.emissiveIntensity=options.emissive;
   mat.bumpMap=null;
  }
  mat.needsUpdate=true;
 };
 const common={frame:'brushed-titanium',hull:'pebbled-silver',silver:'brushed-titanium',pale:'brushed-titanium',dark:'graphite-metal',deck:'deck-tread',gold:'brushed-titanium',rubber:'molded-rubber',insulation:'insulation-foil',interior:'interior-floor',innerWall:'interior-wall',plant:'leaf-veins'};
 const metalFinish={
  frame:{roughness:.38,metalness:.98,normal:.06,environment:.85},
  hull:{roughness:.24,metalness:1,normal:.42,environment:1.1},
  silver:{roughness:.34,metalness:1,normal:.045,environment:.85},
  pale:{roughness:.42,metalness:.95,normal:.06,environment:.8},
  dark:{roughness:.46,metalness:.9,normal:.05,environment:.8},
  deck:{roughness:.53,metalness:.85,normal:.16,environment:.8},
  gold:{roughness:.4,metalness:.96,normal:.06,environment:.8},
  insulation:{roughness:.44,metalness:.98,normal:.15,environment:.8},
  interior:{roughness:.58,metalness:.65,normal:.12,environment:.75},
  innerWall:{roughness:.5,metalness:.65,normal:.09,environment:.75}
 };
 for(const [key,family]of Object.entries(common))finish(mats[key],family,{keepUV:key==='plant',...metalFinish[key]});
 finish(mats.suit,'woven-fabric',{roughness:.93,metalness:0,normal:.3,tile:3});
 for(const key of ['warm','cool','led'])finish(mats[key],'ceramic-polymer');
 finish(mats.glass,'glass-micro',{keepMap:true,keepUV:true,roughness:.085,environment:.75});finish(mats.glassDark,'glass-micro',{keepMap:true,keepUV:true,roughness:.24,metalness:.85,environment:.95});
 // The existing precision solar-cell artwork supplies layout; the actual
 // cover and busbar surfaces acquire the photographic microfinish.
 finish(mats.solar,'glass-micro',{keepMap:true,keepUV:true,roughness:.32,normal:.018,metalness:.9,environment:.9});
 const m=moduleDesignMaterials();
 // Fine pebbled silver catches broad, slowly varying reflections.
 m.shell.color.set('#c8cccf');m.door.color.set('#ced1d3');m.panel.color.set('#cbd0d3');
 const modelFinish={shell:metalFinish.hull,graphite:metalFinish.dark,seam:metalFinish.silver,door:{roughness:.26,metalness:1,normal:.36,environment:1.05},panel:{roughness:.27,metalness:1,normal:.34,environment:1.05},gasket:{roughness:.48,metalness:.12,normal:.12,environment:.9},floor:{...metalFinish.deck,emissive:.025}};
 for(const [key,family]of Object.entries({shell:'pebbled-silver',graphite:'graphite-metal',seam:'brushed-titanium',door:'pebbled-silver',panel:'pebbled-silver',gasket:'molded-rubber',white:'ceramic-polymer',fabric:'woven-fabric',screen:'glass-micro',floor:'deck-tread'}))finish(m[key],family,{keepMap:key==='screen',keepUV:key==='screen',...modelFinish[key]});
 m.shell.name='pebbled-silver-room-shell';m.graphite.name='anodized-room-frame';m.seam.name='machined-room-seam';
 if(m.panel)m.panel.name='pebbled-silver-room-service-panel';if(m.gasket)m.gasket.name='room-window-seal';m.door.name='pebbled-silver-room-pressure-door';
 for(const p of m.profiles){finish(p.paint,'coated-alloy',{roughness:.42,metalness:.88,normal:.06,environment:.85});finish(p.cabinet,'coated-alloy',{roughness:.44,metalness:.88,normal:.08,environment:.8,emissive:.015});finish(p.light,'ceramic-polymer');}
 const s=moduleInteriorMaterials();
 finish(s.wall,'interior-wall',{roughness:.52,metalness:.65,normal:.09,environment:.75,emissive:.025});finish(s.worktop,'interior-worktop',{roughness:.44,metalness:.75,normal:.05,environment:.8,emissive:.02});
 const interiorMetal={steel:{roughness:.32,metalness:1,normal:.06,environment:.95,emissive:.012},braid:{roughness:.4,metalness:.96,environment:.85,emissive:.015},grille:{roughness:.44,metalness:.9,environment:.8,emissive:.02},panel:{roughness:.45,metalness:.88,environment:.85,emissive:.025},amber:{roughness:.4,metalness:.85,environment:.85,emissive:.025},red:{roughness:.43,metalness:.85,environment:.85,emissive:.025},porcelain:{roughness:.38,metalness:.15,environment:.85,emissive:.035}};
 for(const [key,family]of Object.entries({linen:'woven-fabric',seat:'woven-fabric',blanket:'woven-fabric',porcelain:'ceramic-polymer',steel:'brushed-titanium',rubber:'molded-rubber',amber:'coated-alloy',red:'coated-alloy',leaf:'leaf-veins',youngLeaf:'leaf-veins',soil:'regolith',panel:'coated-alloy',grille:'graphite-metal',warmLED:'ceramic-polymer',taskLED:'ceramic-polymer',braid:'braided-cable'}))finish(s[key],family,{keepMap:key==='panel'||key==='grille',keepUV:['leaf','youngLeaf','panel','grille'].includes(key),tile:key==='soil'?2:undefined,...interiorMetal[key]});
 for(const mat of Object.values(moduleInteriorDisplay.cache||{}))finish(mat,'glass-micro',{keepMap:true,keepUV:true,normal:.012});
 for(const mat of Object.values(moduleInteriorLabel.cache||{}))finish(mat,'coated-alloy',{keepMap:true,keepUV:true,normal:.06});
 finish(terrain.material,'regolith',{tile:24,normal:.48,roughness:1,environment:.18});finish(rocks.material,'regolith',{keepUV:true,normal:.38,roughness:1,environment:.18});finish(studioGround.material,'graphite-metal',{tile:45,roughness:.9,metalness:.08,environment:.4});
 const uvOwners=new Map();
 scene.traverse(o=>{
  if(!o.isMesh||!o.geometry||Array.isArray(o.material))return;
  const mat=o.material;
  if((mat.isMeshStandardMaterial||mat.isMeshPhysicalMaterial)&&!mat.userData.surfaceFamily){
   finish(mat,mat.transparent?'glass-micro':mat.metalness>.6?'brushed-titanium':'coated-alloy',{keepMap:!!mat.map||mat.transparent,keepUV:!!mat.map||mat.transparent});
  }
  const tile=mat.userData.surfaceTile;if(mat.userData.surfaceUV!=='metric'||!tile){if(mat.aoMap&&o.geometry.attributes.uv)o.geometry.setAttribute('uv2',o.geometry.attributes.uv.clone());return;}
  let geo=o.geometry;const owner=uvOwners.get(geo);if(owner===tile)return;if(owner!==undefined){geo=geo.clone();o.geometry=geo;}uvOwners.set(geo,tile);
  const p=geo.attributes.position,n=geo.attributes.normal;if(!n)return;
  const uv=new Float32Array(p.count*2);
  for(let i=0;i<p.count;i++){
   const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));
   // Box projection uses physical distances, so a small bolt and a whole
   // wall retain the same grain scale after geometry batching.
   uv[i*2]=(ny>=nx&&ny>=nz?p.getX(i):nx>nz?p.getZ(i):p.getX(i))/tile;
   uv[i*2+1]=(ny>=nx&&ny>=nz?p.getZ(i):p.getY(i))/tile;
  }
  geo.setAttribute('uv',new T.BufferAttribute(uv,2));
  if(mat.aoMap)geo.setAttribute('uv2',geo.attributes.uv.clone());
 });
 surfaceTexture.ready=true;
}
