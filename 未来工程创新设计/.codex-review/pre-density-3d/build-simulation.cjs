const fs=require('node:fs');
const source=fs.readFileSync('未来校园_三维互动演示.html','utf8');
const library=source.slice(source.indexOf('<script>')+8,source.indexOf('</script><script>'));
const scene=fs.readFileSync('lunar-scene.js','utf8');
const scripts=[library,fs.readFileSync('simulation-core.js','utf8'),scene+fs.readFileSync('lunar-app.js','utf8')];
const html=fs.readFileSync('lunar-ui.html','utf8').replace('<!-- SCRIPTS -->',()=>scripts.map(s=>'<script>'+s+'</script>').join('\n'));
fs.writeFileSync('月宫华容_三维仿真软件.html',html);
console.log('Built standalone HTML:',Buffer.byteLength(html),'bytes; embedded Three.js and planner, no CDN dependencies.');
