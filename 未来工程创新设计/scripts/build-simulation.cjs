'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const base64 = name => fs.readFileSync(path.join(root, name)).toString('base64');
const joinSources = names => names.map(read).join('\n');

const coreFiles = ['src/core/simulation.js', 'src/core/scheduler.js', 'src/core/character-routing.js'];
// scene.js opens the shared closure and app.js closes it. Keep this order:
// model functions are hoisted and share scene materials and instance caches.
const sceneFiles = [
  'src/generated/texture-pack.js',
  'src/generated/character-pack.js',
  'src/scene/scene.js',
  'src/scene/modules.js',
  'src/scene/interiors.js',
  'src/scene/connectivity.js',
  'src/scene/surfaces.js',
  'src/scene/renderer.js',
  'src/scene/studio-transition.js',
  'src/scene/character-portrait.js',
  'src/scene/character.js',
  'src/ui/app.js',
];
const scripts = [
  read('vendor/three.min.js')+'\n'+read('vendor/character-loader.js'),
  joinSources(coreFiles),
  joinSources(sceneFiles),
];
scripts.forEach((source, index) => new vm.Script(source, { filename: `bundle-${index}.js` }));
const fonts = [
  ['Lunaris Serif', 'lunaris-serif-bold.woff2', '700', 'SourceHanSerif-OFL.txt'],
  ['Lunaris Display', 'lunaris-display.woff2', '300 700', 'SpaceGrotesk-OFL.txt'],
];
const fontCSS = fonts.map(([family, file, weight, license]) =>
  `/* ${read('vendor/fonts/' + license).replace(/\*\//g, '* /')} */\n` +
  `@font-face{font-family:'${family}';src:url(data:font/woff2;base64,${base64('vendor/fonts/' + file)}) format('woff2');font-weight:${weight};font-style:normal;font-display:swap;}`
).join('\n');
const englishFile = 'vendor/fonts/novecento-wide-bold.woff2';
const hasEnglishFont = fs.existsSync(path.join(root, englishFile));
const englishSource = hasEnglishFont
  ? `url(data:font/woff2;base64,${base64(englishFile)}) format('woff2')`
  : "local('Novecento Wide Bold'),local('Novecento-WideBold'),local('Novecento sans wide Bold'),local('Novecentosanswide-Bold')";
const localEnglish = `@font-face{font-family:'Novecento Wide Bold';src:${englishSource};font-weight:700;}`;
if (!hasEnglishFont) console.warn('Novecento Wide Bold: using local lookup with embedded Space Grotesk fallback.');
const workerSource = joinSources(coreFiles) + '\n' +
  'self.onmessage=e=>{try{self.postMessage({plan:e.data.intent?LunarScheduler.planIntent(e.data.intent,e.data.layout,e.data.blocked):LunarScheduler.plan(e.data.text,e.data.layout,e.data.blocked)});}catch(error){self.postMessage({error:error.message});}};';
new vm.Script(workerSource, { filename: 'scheduler-worker.js' });
const characterWorkerSource=joinSources(coreFiles)+'\nself.onmessage=e=>{try{self.postMessage({plan:LunarCharacter.plan(e.data)});}catch(error){self.postMessage({error:error.message});}};';
new vm.Script(characterWorkerSource,{filename:'character-worker.js'});
const escapeScript = source => source.replace(/<\/script/gi, '<\\/script');
const template = read('src/ui/template.html');
for (const marker of ['FONTS', 'STYLES', 'SCRIPTS', 'SCHEDULER WORKER']) {
  if (template.split(`<!-- ${marker} -->`).length !== 2) {
    throw new Error(`UI template must contain exactly one ${marker} build marker.`);
  }
}
const html = template
  .replace('<!-- CHARACTER STANDEE -->', () => `<img class="character-standee" src="data:image/png;base64,${base64('assets/character/feng-peng-side-profile.png')}" style="--character-cutout:url(data:image/png;base64,${base64('assets/character/feng-peng-side-mask.png')})" alt="朝左略微低头的冯鹏侧脸立绘">`)
  .replace('<!-- CHARACTER PORTRAIT -->', () => `<img src="data:image/png;base64,${base64('assets/character/feng-peng-portrait.png')}" alt="冯鹏" width="56" height="56">`)
  .replace('<!-- SCHEDULER WORKER -->', () => `<script id="schedulerWorkerSource" type="text/plain">${escapeScript(workerSource)}</script><script id="characterWorkerSource" type="text/plain">${escapeScript(characterWorkerSource)}</script>`)
  .replace('<!-- FONTS -->', () => fontCSS + '\n' + localEnglish)
  .replace('<!-- STYLES -->', () => read('src/ui/style.css'))
  .replace('<!-- SCRIPTS -->', () => scripts.map((source, index) => {
    const ready = index === 2
      ? `Promise.allSettled([document.fonts.load('700 16px "Lunaris Serif"'),document.fonts.load('700 16px "Lunaris Display"'),document.fonts.load('700 16px "Novecento Wide Bold"')]).then(()=>{${source}\n});`
      : source;
    return `<script>${escapeScript(ready)}</script>`;
  }).join('\n'));
fs.writeFileSync(path.join(root, '月宫华容_三维仿真软件.html'), html);
console.log(`Built LUNARIS 7: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, offline, 24 rooms / 42 nodes / 5 levels.`);
