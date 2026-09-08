const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const scripts=[read('vendor/three.min.js'),read('simulation-core.js'),read('lunar-scene.js')+'\n'+read('lunar-app.js')];
scripts.forEach((script,i)=>new vm.Script(script,{filename:`bundle-${i}.js`}));
const html=read('lunar-ui.html').replace('<!-- SCRIPTS -->',()=>scripts.map(s=>'<script>'+s.replace(/<\/script/gi,'<\\/script')+'</script>').join('\n'));
fs.writeFileSync(path.join(__dirname,'月宫华容_三维仿真软件.html'),html);
console.log(`Built LUNARIS 5: ${(Buffer.byteLength(html)/1024).toFixed(0)} KB, offline, 24 rooms / 30 lunar ports / 5 levels / propulsion and sealed docking.`);
