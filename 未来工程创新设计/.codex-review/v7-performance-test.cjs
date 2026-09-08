/*
 * Input / idle-work regression checks against the actual source application.
 * Real Three.js math and geometry; DOM, clock, and GPU submission are mocked.
 * This measures avoidable work and camera latency, NOT GPU FPS or image quality.
 * Run from any directory: node .codex-review/v7-performance-test.cjs
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

function createHarness({ useBundle = false, webgl2 = true, sampleLevels = [4, 2, 0] } = {}) {
const html = read(useBundle ? '月宫华容_三维仿真软件.html' : 'lunar-ui.html');
const embedded = useBundle ? [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]) : null;
if (useBundle) { assert.equal(embedded.length, 3); embedded.forEach(s => new vm.Script(s)); }
const counters = { state: 0, render: 0, matrix: 0 };
const apiCalls = { traffic: 0 }, gpuStats = { mainFrames: 0 };
const matrixWrites = [];
let lastState, exportedBlob, sceneObserved, clock = 0, nextFrameId = 0, renderer;
const frames = new Map();
const windowHandlers = {};

class Element {
  constructor(id = '', tag = 'DIV') {
    Object.assign(this, { id, tagName: tag, style: { setProperty(name,value){this[name]=String(value);}, getPropertyValue(name){return this[name]??'';} }, dataset: {}, children: [],
      hidden: false, disabled: false, checked: false, value: '', attrs: {},
      handlers: {}, clientWidth: 1200, clientHeight: 720, _classes: new Set() });
    this.classList = {
      add: (...names) => names.forEach(n => this._classes.add(n)),
      remove: (...names) => names.forEach(n => this._classes.delete(n)),
      contains: name => this._classes.has(name),
      toggle: (name, on = !this._classes.has(name)) => {
        on ? this._classes.add(name) : this._classes.delete(name); return on;
      }
    };
  }
  appendChild(child) { this.children.push(child); child.parentElement = this; return child; }
  addEventListener(name, fn) { (this.handlers[name] ??= []).push(fn); }
  removeEventListener(name, fn) { this.handlers[name] = (this.handlers[name] ?? []).filter(f => f !== fn); }
  setAttribute(name, value) { this.attrs[name] = value; }
  getAttribute(name) { return this.attrs[name]; }
  closest(selector) {
    const selectors=selector.split(',').map(s=>s.trim());
    for(let node=this;node;node=node.parentElement){
      if(selectors.some(s=>s.startsWith('.')?(node._classes.has(s.slice(1))||String(node.className||'').split(/\s+/).includes(s.slice(1))):s.startsWith('#')?node.id===s.slice(1):node.tagName===s.toUpperCase()))return node;
    }
    return null;
  }
  setPointerCapture() {}
  releasePointerCapture() {}
  focus() { document.activeElement = this; }
  click() { if (!this.disabled) { const e = { target: this }; for (const fn of document.handlers.click ?? []) fn(e); this.onclick?.(e); } }
  getContext() {
    return { fillText() {}, fillRect() {}, clearRect() {}, strokeRect() {},
      beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, arc() {}, fill() {},
      closePath() {}, save() {}, restore() {}, translate() {}, rotate() {},
      putImageData() {}, createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      createRadialGradient: () => ({ addColorStop() {} }),
      createLinearGradient: () => ({ addColorStop() {} }), measureText: text => ({ width: text.length * 9 }) };
  }
  getBoundingClientRect() { return { left: 240, top: 74, width: 1200, height: 720 }; }
  querySelector() { return this.children.find(c => c.tagName === 'BUTTON'); }
  querySelectorAll() { return this.children.flatMap(c => [c, ...c.querySelectorAll()]); }
  set innerHTML(value) { this._html = value; }
  get innerHTML() { return this._html ?? ''; }
}

const ids = new Map([...html.matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"([^>]*)>/g)].map(m => {
  const e = new Element(m[2], m[1].toUpperCase()); e.hidden = /\bhidden\b/.test(m[3]); return [m[2], e];
}));
const missions = ['vertical', 'cascade', 'district'].map(task => {
  const e = new Element('', 'BUTTON'); e.dataset.task = task; return e;
});
const axes = [[0, -1], [1, 1], [0, 1], [2, -1], [1, -1], [2, 1]].map(([axis, sign]) => {
  const e = new Element('', 'BUTTON'); e.dataset = { axis: String(axis), sign: String(sign) }; return e;
});
const document = {
  getElementById(id) { assert.ok(ids.has(id), 'Missing actual UI ID: ' + id); return ids.get(id); },
  createElement: tag => new Element('', tag.toUpperCase()), body: new Element(),
  activeElement: new Element(), hidden: false, handlers: {},
  addEventListener(name, fn) { (this.handlers[name] ??= []).push(fn); },
  querySelectorAll: selector => selector === '[data-axis]' ? axes : selector === '[data-task]' ? missions : []
};
const element = id => document.getElementById(id);
element('labels').checked = element('paths').checked = true;
element('speed').value = '4'; element('quality').value = 'high';
element('exposure').value = '1.02'; element('settings').hidden = true;
element('aaMode').value = 'auto'; element('targetFps').value = '60';
element('flowDemand').value = '120'; element('flowScenario').value = 'commute';
element('lighting').value = 'sunrise'; element('showLinks').checked = true;

const context = {
  console, document, structuredClone, innerWidth: 1440, devicePixelRatio: 1.5,
  performance: { now: () => clock }, setTimeout: () => 1, clearTimeout() {},
  addEventListener(name, fn) { (windowHandlers[name] ??= []).push(fn); },
  matchMedia: () => ({ matches: false }), ResizeObserver: class { observe() {} },
  requestAnimationFrame(fn) { const id = ++nextFrameId; frames.set(id, fn); return id; },
  cancelAnimationFrame(id) { frames.delete(id); },
  URL: { createObjectURL: blob => { exportedBlob = blob; return 'blob:performance-test'; }, revokeObjectURL() {} }, Blob
};
context.window = context;
vm.createContext(context, { microtaskMode: 'afterEvaluate' });
// Font readiness gates bundle startup; glyph rendering is verified in the browser.
vm.runInContext('document.fonts = { load: () => Promise.resolve([]) };', context);
vm.runInContext(useBundle ? embedded[0] : read('vendor/three.min.js'), context, { filename: 'three.min.js' });
context.THREE.WebGLRenderer = class {
  constructor() {
    renderer = this;
    this.shadowMap = {};
    this.capabilities = { getMaxAnisotropy: () => 8, isWebGL2: webgl2, maxSamples: 4 };
    this.sampleLevels = sampleLevels.slice();
    this.domElement = new Element();
    this.info = { autoReset: true, render: { calls: 0, triangles: 0, frame: 0 }, memory: {}, reset: () => {} };
  }
  setPixelRatio(value) { this.pixelRatio = value; }
  getPixelRatio() { return this.pixelRatio; }
  getContext() { return { RENDERBUFFER: 36161, RGBA16F: 34842, SAMPLES: 32937,
    getInternalformatParameter: () => Int32Array.from(this.sampleLevels) }; }
  setClearColor() {}
  setSize(width, height) { this.width = width; this.height = height; }
  setRenderTarget(target) { this.target = target; }
  getDrawingBufferSize(v) { return v.set(1200 * this.pixelRatio, 720 * this.pixelRatio); }
  render(scene) { counters.render++; this.info.render.calls++; this.info.render.frame++; if (scene.isScene && scene.children.length > 3) { sceneObserved = scene; gpuStats.mainFrames++; } }
};
context.THREE.PMREMGenerator = class {
  fromScene() { return { texture: new context.THREE.Texture() }; }
  dispose() {}
};
const originalSetMatrix = context.THREE.InstancedMesh.prototype.setMatrixAt;
context.THREE.InstancedMesh.prototype.setMatrixAt = function (index, matrix) {
  counters.matrix++; matrixWrites.push({ mesh: this, index });
  return originalSetMatrix.call(this, index, matrix);
};
vm.runInContext(useBundle ? embedded[1] : read('simulation-core.js'), context, { filename: 'simulation-core.js' });
const originalState = context.LunarCore.state;
context.LunarCore.state = (...args) => { counters.state++; return lastState = originalState(...args); };
const originalTraffic = context.LunarCore.traffic;
context.LunarCore.traffic = (...args) => { apiCalls.traffic++; return originalTraffic(...args); };

// Instrument the closure only in this VM; leave production files and global API unchanged.
const app = useBundle ? embedded[2] : ['lunar-scene.js','lunar-modules.js','lunar-model-profiles.js','lunar-connectivity.js','lunar-renderer.js','lunar-app.js'].map(read).join('\n');
const end = app.lastIndexOf('})();');
assert.ok(end >= 0, 'Expected application IIFE closing marker for read-only test instrumentation');
const probe = `
globalThis.__performanceProbe = {
  read: () => ({ yaw, pitch, distance, target: target.toArray(), camera: camera.position.toArray(),
    goal: { yaw: goal.yaw, pitch: goal.pitch, distance: goal.distance, target: goal.target.toArray() },
    time, duration, playing, highQuality, visibleFloor, cutaway,
    phases, moves, state: snapshot(), selectedRoom, manualMode, estop, viewName, previewMove, walking, sectionMode,
    qualityMode, aaMode, aaSamples, accumulationCount, renderSettingsVersion, flowData, flowKey, flowClock,
    benchmark, pendingRefinement: hasPendingRefinement(), cameraView: camera.view }),
  batches: () => moduleBatches.map(b => ({ ids: b.ids.slice(), mesh: b.mesh, layer: b.layer })),
  rooms: () => rooms, routes: () => ({ routeGroup }), select: id => selectRoom(id),
  identities: () => ({ roomBadges, roomPalette, roomTypes, buildingNames }),
  connections: () => connectivityCache.value, traffic: () => trafficVisualCache.value,
  rendering: () => ({ targetRT, aoRT, stillRT, historyRT, postMat, aoMat })
};
`;
vm.runInContext(app.slice(0, end) + probe + app.slice(end), context,
  { filename: 'instrumented-lunar-source.js', timeout: 120000 });
const probeRead = () => context.__performanceProbe.read();
const count = () => ({ ...counters });
const delta = before => Object.fromEntries(Object.keys(counters).map(k => [k, counters[k] - before[k]]));
const tick = (ms = 1000 / 60) => {
  clock += ms;
  const pending = [...frames.values()]; frames.clear();
  for (const fn of pending) fn(clock);
};
const settle = () => { for (let n = 0; n < 240; n++) tick(); };
const seek = time => { element('timeline').oninput({ target: { value: String(time) } }); tick(); };
const dispatch = (node, type, values = {}) => {
  const e = { target: node, pointerId: 1, pointerType: 'mouse', clientX: 640, clientY: 320,
    button: 0, buttons: 1, shiftKey: false, preventDefault() {}, ...values };
  for (const handler of document.handlers[type] ?? []) handler(e);
  if (node !== document) for (const handler of node.handlers[type] ?? []) handler(e);
};
const close = (a, b, message, tolerance = 1e-5) => assert.ok(Math.abs(a - b) <= tolerance,
  `${message}: got ${a}, expected ${b} (tolerance ${tolerance})`);
const cameraAtGoal = message => {
  const p = probeRead();
  for (const key of ['yaw', 'pitch', 'distance']) close(p[key], p.goal[key], message + ' ' + key);
  p.target.forEach((value, axis) => close(value, p.goal.target[axis], message + ' target axis ' + axis));
};

const change = (id, value) => { const e = element(id); e.value = value; for (const fn of document.handlers.change ?? []) fn({target:e}); e.onchange?.({target:e}); };
const input = (id, value) => { const e = element(id); e.value = value; for (const fn of document.handlers.input ?? []) fn({target:e}); e.oninput?.({target:e}); };
return { html, element, ids, missions, axes, document, context, renderer, frames, windowHandlers,
  counters, apiCalls, gpuStats, matrixWrites, count, delta, tick, settle, seek, dispatch, change, input,
  close, cameraAtGoal, probeRead, state: () => lastState, scene: () => sceneObserved,
  exportData: async () => { element('export').click(); assert.ok(exportedBlob); return JSON.parse(await exportedBlob.text()); }
};

}

function runPerformance(h = createHarness()) {
const { html, element, ids, missions, axes, document, context, renderer, counters, matrixWrites, count, delta, tick, settle, seek, dispatch, close, cameraAtGoal, probeRead } = h;
const results = [];
function test(name, fn) {
  try { fn(); results.push({ name, passed: true }); console.log('PASS:', name); }
  catch (error) { results.push({ name, passed: false }); console.error('FAIL:', name, '\n ', error.message); }
  finally {
    // Failed input checks must not leave a drag active and contaminate later cases.
    dispatch(renderer.domElement, 'lostpointercapture', { buttons: 0 });
    settle();
  }
}

tick();
assert.equal(element('loading').hidden, true, 'Application initialized');
assert.equal(probeRead().playing, false, 'Initial scene is paused');
settle();

test('Paused, settled scene performs no repeated simulation, rendering, or instance uploads over 180 frames', () => {
  const before = count();
  for (let n = 0; n < 180; n++) tick();
  assert.deepEqual(delta(before), { state: 0, render: 0, matrix: 0 });
  assert.equal(h.frames.size, 0, 'Settled scene has no queued RAF callback');
});

test('Unpressed pointer movement does not redraw a settled scene',()=>{
  settle();const before=count();for(let n=0;n<60;n++){dispatch(renderer.domElement,'pointermove',{buttons:0,clientX:640+n});tick();}assert.deepEqual(delta(before),{state:0,render:0,matrix:0});
});

test('Orbit dragging reaches the input target on the next frame without reducing rendering quality', () => {
  const before = count(), start = probeRead(), quality = {
    pixelRatio: renderer.pixelRatio, shadow: context.__performanceProbe.read().highQuality,
    enabled: renderer.shadowMap.enabled
  };
  dispatch(renderer.domElement, 'pointerdown');
  dispatch(renderer.domElement, 'pointermove', { clientX: 688, clientY: 338 });
  tick();
  const current = probeRead();
  assert.ok(Math.abs(current.goal.yaw - start.goal.yaw) > .01, 'Input changes orbit target');
  cameraAtGoal('First drag frame');
  assert.equal(counters.state - before.state, 0, 'Camera-only input must use cached simulation');
  assert.equal(counters.matrix - before.matrix, 0, 'Camera-only input must not upload room instances');
  assert.ok(counters.render > before.render, 'Input must actually produce an updated render');
  assert.equal(current.highQuality, quality.shadow);
  assert.equal(renderer.pixelRatio, quality.pixelRatio, 'Internal resolution remains unchanged during drag');
  assert.equal(renderer.shadowMap.enabled, quality.enabled, 'Shadow rendering remains enabled');
  dispatch(renderer.domElement, 'pointerup', { clientX: 688, clientY: 338, buttons: 0 });
  settle();
});

test('Right-button panning responds on the next frame', () => {
  const start = probeRead();
  dispatch(renderer.domElement, 'pointerdown', { button: 2, buttons: 2 });
  dispatch(renderer.domElement, 'pointermove', { button: 2, buttons: 2, clientX: 675, clientY: 346 });
  tick(); cameraAtGoal('First pan frame');
  assert.ok(probeRead().target.some((v, i) => Math.abs(v - start.target[i]) > .1));
  dispatch(renderer.domElement, 'pointerup', { button: 2, buttons: 0, clientX: 675, clientY: 346 });
  settle();
});

test('Wheel zoom reaches the input target on the next frame', () => {
  const start = probeRead().distance;
  dispatch(renderer.domElement, 'wheel', { deltaY: -80 }); tick();
  cameraAtGoal('First wheel frame');
  assert.ok(probeRead().distance < start, 'Negative wheel delta zooms in');
  settle();
});

test('A moving room updates only that room in its material batches', () => {
  element('reset').click(); tick();
  const phase = probeRead().phases.find(p => ['translate', 'elevate'].includes(p.type));
  assert.ok(phase, 'Compiled demo contains a moving-room phase');
  seek(phase.start + (phase.end - phase.start) * .25);
  const batches = context.__performanceProbe.batches();
  const oldVersions = new Map(batches.map(b => [b.mesh, b.mesh.instanceMatrix.version]));
  const writeStart = matrixWrites.length;
  seek(phase.start + (phase.end - phase.start) * .35);
  assert.equal(h.state().active, phase.room);
  const writes = matrixWrites.slice(writeStart).filter(w => w.mesh.userData.roomIds);
  assert.ok(writes.length > 0, 'Moving room matrices are updated');
  for (const write of writes) assert.equal(write.mesh.userData.roomIds[write.index], phase.room,
    'An unchanged room was unnecessarily written into an instance buffer');
  for (const batch of batches) {
    const changed = batch.mesh.instanceMatrix.version > oldVersions.get(batch.mesh);
    assert.equal(changed, batch.ids.includes(phase.room), 'Only batches containing the active room request upload');
  }
});

test('Pausing during movement also stops simulation replay, rendering, and instance writes', () => {
  // Seeking above is paused by the actual UI. Allow any camera transition to settle.
  settle(); const time = probeRead().time, before = count();
  for (let n = 0; n < 180; n++) tick();
  close(probeRead().time, time, 'Paused simulation time');
  assert.deepEqual(delta(before), { state: 0, render: 0, matrix: 0 });
});

test('Actual demo speed selector exposes 1× / 4× / 16× and applies proportional simulation time', () => {
  const speedMarkup = html.match(/<select\b[^>]*\bid="speed"[^>]*>([\s\S]*?)<\/select>/)?.[1];
  assert.ok(speedMarkup, 'Speed control is present in the actual UI');
  const options = [...speedMarkup.matchAll(/<option\b[^>]*\bvalue="([^"]+)"/g)].map(m => Number(m[1]));
  for (const rate of [1, 4, 16]) {
    assert.ok(options.includes(rate), `${rate}× option is user-selectable`);
    element('reset').click(); tick();
    element('speed').value = String(rate);
    element('speed').onchange?.({ target: element('speed') });
    const start = probeRead().time;
    element('play').click();
    for (let n = 0; n < 6; n++) tick(1000 / 60);
    close(probeRead().time - start, .1 * rate, `${rate}× elapsed simulation time`, .001);
    element('play').click(); tick();
    assert.equal(probeRead().playing, false);
  }
});


test('Internal vertical movement keeps rooms upright and parked room transforms unchanged', () => {
  element('reset').click(); tick();
  const phase = probeRead().phases.find(p => p.type === 'elevate');
  seek(phase.start + (phase.end - phase.start) * .2);
  const before = probeRead().state;
  const parked = before.positions.map(p => p.slice());
  const pose = before.orientations[phase.room].slice();
  seek(phase.start + (phase.end - phase.start) * .55);
  const after = probeRead().state;
  assert.equal(after.orientations.length, 24);
  assert.ok(after.orientations.every(o => o.length === 3 && o.every(Number.isFinite)));
  assert.deepEqual(Array.from(after.orientations[phase.room]),[0,0,0],'Rooms stay upright in internal lifts');assert.ok(after.positions[phase.room][1]!==parked[phase.room][1],'Lift changes Y');
  for (let id = 0; id < 24; id++) if (id !== phase.room) assert.deepEqual(Array.from(after.positions[id]), Array.from(parked[id]));
});
test('Released pointer and lost pointer capture cannot leave a latent orbit drag', () => {
  element('overview').click(); settle();
  dispatch(renderer.domElement, 'pointerdown');
  dispatch(renderer.domElement, 'pointermove', { clientX: 670, buttons: 0 }); tick();
  const before = probeRead().goal.yaw;
  dispatch(renderer.domElement, 'pointermove', { clientX: 920, buttons: 1 }); tick();
  close(probeRead().goal.yaw, before, 'No drag after mouse release');
  dispatch(renderer.domElement, 'pointerdown');
  dispatch(renderer.domElement, 'lostpointercapture', { buttons: 0 });
  dispatch(renderer.domElement, 'pointermove', { clientX: 930, buttons: 1 }); tick();
  close(probeRead().goal.yaw, before, 'No drag after capture loss');
});


test('Playback maintains one RAF chain and releases its callback when paused and settled', () => {
  element('reset').click(); tick(); element('play').click();
  for (let n=0;n<60;n++) { assert.ok(h.frames.size <= 1, 'Duplicate RAF callbacks were queued'); tick(); }
  element('play').click(); tick(); settle();
  assert.equal(h.frames.size, 0, 'No RAF callback survives a settled pause');
});

test('One identity batch preserves 24 distinct instance atlas tiles while every label follows its room', () => {
  element('reset').click(); tick();
  const batches=context.__performanceProbe.batches().filter(b=>b.mesh.name==='persistent-room-identities');
  assert.equal(batches.length,1,'Room identities share exactly one draw batch');
  const badge=batches[0],tile=badge.mesh.geometry.getAttribute('identityTile');
  assert.equal(tile.isInstancedBufferAttribute,true,'Geometry indexing must preserve per-instance atlas addressing');
  assert.equal(tile.count,24);assert.equal(tile.meshPerAttribute,1);assert.equal(badge.mesh.count,24);
  assert.equal(new Set(Array.from({length:24},(_,i)=>tile.getX(i)+','+tile.getY(i))).size,24);
  for(let i=0;i<24;i++){assert.equal(badge.ids[i],i);assert.equal(tile.getX(i),i%6);assert.equal(tile.getY(i),3-Math.floor(i/6));}
  const tileValues=Array.from(tile.array),version=tile.version,matrix=new context.THREE.Matrix4(),position=new context.THREE.Vector3();
  const phase=probeRead().phases.find(p=>p.type==='elevate');
  for(const time of [phase.start+(phase.end-phase.start)*.2,phase.start+(phase.end-phase.start)*.7,probeRead().duration]){
    seek(time);const st=probeRead().state;
    for(let i=0;i<24;i++){badge.mesh.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);position.toArray().forEach((v,k)=>close(v,st.positions[badge.ids[i]][k],'Identity world position remains attached to room '+badge.ids[i],1e-4));}
    assert.strictEqual(badge.mesh.geometry.getAttribute('identityTile'),tile);
    assert.deepEqual(Array.from(tile.array),tileValues);assert.equal(tile.version,version,'Movement does not rewrite immutable identity tiles');
  }
  badge.mesh.geometry.computeBoundingBox();const b=badge.mesh.geometry.boundingBox,c=context.LunarCore.config;
  assert.ok(b.min.x>=-c.width/2-.001&&b.max.x<=c.width/2+.001&&b.min.y>=-.001&&b.max.y<=c.height+.001&&b.min.z>=-c.depth/2-.001&&b.max.z<=c.depth/2+.001,'Labels remain inside the planner envelope');
});

test('HDR target uses supported MSAA samples and falls back to FXAA on unsupported formats or WebGL 1', () => {
  const rendering = context.__performanceProbe.rendering();
  try {
    h.change('quality', 'high'); h.change('aaMode', 'msaa'); tick();
    assert.equal(probeRead().aaSamples, 4); assert.equal(rendering.targetRT.samples, 4);
    assert.equal(rendering.targetRT.texture.type, context.THREE.HalfFloatType);
    assert.equal(rendering.postMat.uniforms.fxaa.value, 0, 'Supported explicit MSAA does not add FXAA');
    assert.equal(rendering.aoRT.width, Math.ceil(rendering.targetRT.width / 2));
    assert.equal(rendering.aoRT.height, Math.ceil(rendering.targetRT.height / 2));
    renderer.sampleLevels = [2, 0]; h.change('aaMode', 'msaa'); tick();
    assert.equal(probeRead().aaSamples, 2, 'Actual HDR-format sample support limits MSAA');
    renderer.sampleLevels = [0]; h.change('aaMode', 'msaa'); tick();
    assert.equal(rendering.targetRT.samples, 0); assert.equal(rendering.postMat.uniforms.fxaa.value, 1);
    assert.match(element('qualityLabel').textContent, /FXAA/);
    renderer.sampleLevels = [4, 2, 0]; renderer.capabilities.isWebGL2 = false;
    h.change('aaMode', 'msaa'); tick();
    assert.equal(probeRead().aaSamples, 0); assert.equal(rendering.postMat.uniforms.fxaa.value, 1);
    renderer.capabilities.isWebGL2 = true; h.change('aaMode', 'fxaa'); tick();
    assert.equal(rendering.targetRT.samples, 0); assert.equal(rendering.postMat.uniforms.fxaa.value, 1);
  } finally {
    renderer.capabilities.isWebGL2 = true; renderer.sampleLevels = [4, 2, 0];
    h.change('quality', 'high'); h.change('aaMode', 'auto'); tick();
  }
});

test('Cinematic stills refine exactly eight frames, clear camera jitter, and then stop all idle work', () => {
  element('reset').click(); element('overview').click(); settle();
  try {
    const before = count(), mainFrames = h.gpuStats.mainFrames;
    h.change('quality', 'cinematic');
    assert.equal(probeRead().accumulationCount, 0);
    for (let n = 1; n <= 8; n++) { tick(); assert.equal(probeRead().accumulationCount, n); }
    assert.equal(h.gpuStats.mainFrames - mainFrames, 8);
    assert.equal(probeRead().pendingRefinement, false); assert.equal(h.frames.size, 0);
    assert.equal(probeRead().cameraView?.enabled, false, 'Subpixel jitter must not leak into picking or the next camera pose');
    assert.equal(counters.state - before.state, 0); assert.equal(counters.matrix - before.matrix, 0);
    const idle = count(); for (let n = 0; n < 180; n++) tick();
    assert.deepEqual(delta(idle), { state: 0, render: 0, matrix: 0 });
    h.input('exposure', '1.12'); assert.equal(probeRead().accumulationCount, 0, 'Visible changes invalidate accumulated history');
    for (let n = 0; n < 8; n++) tick();
    assert.equal(probeRead().accumulationCount, 8); assert.equal(h.frames.size, 0);
  } finally { h.input('exposure', '1.02'); h.change('quality', 'high'); tick(); }
});

test('30 / 60 / 120 FPS targets preserve wall-clock simulation speed at 1× / 4× / 16×', () => {
  try {
    for (const fps of [30, 60, 120]) for (const rate of [1, 4, 16]) {
      element('reset').click(); tick(); h.change('targetFps', String(fps)); h.change('speed', String(rate)); tick();
      const start = probeRead().time; element('play').click();
      for (let n = 0; n < fps; n++) tick(1000 / fps);
      close(probeRead().time - start, rate, `${fps} FPS / ${rate}× after one second`, .001);
      element('play').click(); tick();
    }
    element('reset').click(); tick(); h.change('targetFps', '30'); h.change('speed', '4'); tick();
    const framesBefore = h.gpuStats.mainFrames; element('play').click();
    for (let n = 0; n < 120; n++) tick(1000 / 120);
    const rendered = h.gpuStats.mainFrames - framesBefore;
    assert.ok(rendered >= 29 && rendered <= 31, '30 FPS setting limits main renders under 120 Hz RAF; got ' + rendered);
    close(probeRead().time, 4, 'Frame cap may defer at most one target-frame of simulation display', 4 / 30 + .001);
    element('play').click(); tick();
  } finally {
    if (probeRead().playing) element('play').click();
    h.change('targetFps', '60'); h.change('speed', '4'); tick();
  }
});

const attributeVersions = cache => [cache.geometry, cache.pg].flatMap(g => Object.entries(g.attributes).map(([name, a]) => [name, a.version]));
test('Traffic particles animate by uniforms without recomputing topology or uploading unchanged buffers', () => {
  element('reset').click(); tick(); h.input('flowDemand', '120'); h.change('flowScenario', 'commute');
  if (!probeRead().walking) element('walkthrough').click(); tick();
  try {
    const visual = context.__performanceProbe.traffic(), data = probeRead().flowData;
    assert.equal(visual.group.visible, true); assert.ok(visual.vertices > 0 && visual.particles > 0);
    assert.equal(data.links.length, context.LunarCore.connections(data.layout).length);
    close(data.servedDemand + data.disconnectedDemand, 120, 'Demand conservation');
    const versions = attributeVersions(visual), matrixBefore = count().matrix, calls = h.apiCalls.traffic, startTime = visual.pm.uniforms.uTime.value;
    for (let n = 0; n < 60; n++) tick();
    assert.ok(visual.pm.uniforms.uTime.value > startTime);
    assert.strictEqual(probeRead().flowData, data); assert.equal(h.apiCalls.traffic, calls);
    assert.deepEqual(attributeVersions(visual), versions); assert.equal(count().matrix, matrixBefore);
    dispatch(renderer.domElement, 'pointerdown'); dispatch(renderer.domElement, 'pointermove', { clientX: 680 }); tick();
    dispatch(renderer.domElement, 'pointerup', { buttons: 0, clientX: 680 }); tick();
    assert.deepEqual(attributeVersions(visual), versions, 'Camera movement does not rebuild a world-space heat field');
    assert.equal(h.apiCalls.traffic, calls);
    h.change('flowScenario', 'lab'); tick();
    assert.notEqual(probeRead().flowData.key, data.key); assert.ok(visual.geometry.attributes.position.version > versions[0][1]);
  } finally { if (probeRead().walking) element('walkthrough').click(); tick(); }
});

test('Moving-room disconnection rebuilds heat topology once and reconnects only after docking', () => {
  element('reset').click(); tick(); h.input('flowDemand', '120'); h.change('flowScenario', 'commute');
  if (!probeRead().walking) element('walkthrough').click(); tick();
  try {
    const initial = probeRead().flowData, p = probeRead().phases.find(p => p.type === 'elevate');
    seek(p.start + (p.end - p.start) * .3);
    const during = probeRead().flowData, visual = context.__performanceProbe.traffic();
    assert.notEqual(during.key, initial.key); assert.equal(during.roomNodes[p.room], -1);
    assert.ok(during.links.every(e => e.roomA !== p.room && e.roomB !== p.room));
    assert.ok(during.paths.every(path => !path.roomIds.includes(p.room)));
    const versions = attributeVersions(visual), calls = h.apiCalls.traffic;
    seek(p.start + (p.end - p.start) * .6);
    assert.strictEqual(probeRead().flowData, during); assert.equal(h.apiCalls.traffic, calls);
    assert.deepEqual(attributeVersions(visual), versions);
    const dock = probeRead().phases.find(q => q.moveIndex === p.moveIndex && q.type === 'dock');
    seek(dock.end - .01); assert.equal(probeRead().flowData.roomNodes[p.room], -1);
    seek(dock.end); assert.equal(probeRead().flowData.roomNodes[p.room], dock.to);
    const restored = probeRead().flowData;
    assert.equal(context.__performanceProbe.connections().connections, restored.links.length);
    close(restored.servedDemand + restored.disconnectedDemand, restored.totalDemand, 'Docked demand conservation');
  } finally { if (probeRead().walking) element('walkthrough').click(); tick(); }
});

test('Zero traffic demand removes particles and flow, preserves direct connections, and releases RAF', () => {
  element('reset').click(); tick(); if (!probeRead().walking) element('walkthrough').click(); tick();
  try {
    const connectionCount = context.__performanceProbe.connections().connections;
    h.input('flowDemand', '0'); tick(); settle();
    const data = probeRead().flowData, visual = context.__performanceProbe.traffic();
    assert.equal(data.totalDemand, 0); assert.equal(data.servedDemand, 0); assert.equal(data.disconnectedDemand, 0);
    assert.equal(data.peakFlow, 0); assert.ok(data.links.every(e => e.flow === 0));
    assert.ok(data.roomLoads.every(x => x === 0)); assert.equal(data.paths.length, 0);
    assert.equal(visual.particles, 0); assert.equal(visual.pg.drawRange.count, 0);
    assert.ok(visual.geometry.attributes.density.array.slice(0, visual.vertices).every(x => x === 0));
    assert.equal(context.__performanceProbe.connections().connections, connectionCount);
    assert.equal(h.frames.size, 0); const idle = count(); for (let n = 0; n < 120; n++) tick();
    assert.deepEqual(delta(idle), { state: 0, render: 0, matrix: 0 });
  } finally { if (probeRead().walking) element('walkthrough').click(); h.input('flowDemand', '120'); tick(); }
});

test('Camera benchmark cancels before and after sampling, and changing quality or hiding the page cancels it', () => {
  element('reset').click(); element('overview').click(); settle();
  const simulationTime = probeRead().time;
  element('cameraBenchmark').click(); tick(200); assert.ok(probeRead().benchmark);
  element('cameraBenchmark').click(); tick(); settle();
  assert.equal(probeRead().benchmark, null); assert.match(element('benchmarkStatus').textContent, /取消/);
  assert.equal(h.frames.size, 0); const stoppedYaw = probeRead().yaw;
  for (let n = 0; n < 60; n++) tick(); close(probeRead().yaw, stoppedYaw, 'Cancelled benchmark stops rotating');
  element('cameraBenchmark').click(); for (let n = 0; n < 90; n++) tick();
  assert.ok(probeRead().benchmark.samples.length > 0); element('cameraBenchmark').click(); tick(); settle();
  assert.match(element('benchmarkStatus').textContent, /已停止.*FPS.*P95/); assert.equal(h.frames.size, 0);
  element('cameraBenchmark').click(); tick(); h.change('quality', 'performance'); tick();
  assert.equal(probeRead().benchmark, null); h.change('quality', 'high'); tick(); settle();
  element('cameraBenchmark').click(); tick(); document.hidden = true;
  dispatch(document, 'visibilitychange'); tick(); assert.equal(probeRead().benchmark, null);
  document.hidden = false; dispatch(document, 'visibilitychange'); tick(); settle();
  close(probeRead().time, simulationTime, 'Benchmark is camera-only'); assert.equal(h.frames.size, 0);
});

const passed = results.filter(r => r.passed).length;
console.log(`\n${passed}/${results.length} performance/input regression checks passed.`);
console.log('GPU mocked: these checks do not establish real-device FPS, frame-time stability, or visual quality.');
return { passed, total: results.length, results };



}


function profileGeometry(h) {
  h.element('reset').click(); h.tick(); h.settle();
  const triangles = g => (g.index?.count ?? g.attributes.position.count) / 3;
  const visible = object => { for(let p=object;p;p=p.parent) if(!p.visible) return false; return true; };
  const byLayer={}, byStaticMaterial=new Map(), materialGroups=new Map();
  for (const b of h.context.__performanceProbe.batches()) {
    const t=triangles(b.mesh.geometry)*b.ids.length;
    const q=byLayer[b.layer]??={batches:0,instances:0,triangles:0,shadowBatches:0};
    q.batches++;q.instances+=b.ids.length;q.triangles+=t;if(b.mesh.castShadow)q.shadowBatches++;
    const m=b.mesh.material,key=m.uuid;
    const p=materialGroups.get(key)||{material:m.type,color:m.color?.getHexString(),batches:0,triangles:0,transparent:m.transparent,doubleSide:m.side===2,forceSinglePass:m.forceSinglePass};
    p.batches++;p.triangles+=t;materialGroups.set(key,p);
  }
  const staticSummary={objects:0,triangles:0,shadowObjects:0};
  h.scene().traverse(o=>{
    if(!o.isMesh||o.userData.roomIds||!visible(o))return;
    const t=triangles(o.geometry)*(o.isInstancedMesh?o.count:1),m=o.material;
    staticSummary.objects++;staticSummary.triangles+=t;if(o.castShadow)staticSummary.shadowObjects++;
    const key=m.type+':'+m.color?.getHexString(),p=byStaticMaterial.get(key)||{material:key,objects:0,triangles:0,shadowObjects:0};
    p.objects++;p.triangles+=t;if(o.castShadow)p.shadowObjects++;byStaticMaterial.set(key,p);
  });
  return {moduleLayers:byLayer,staticSummary,
    moduleMaterials:[...materialGroups.values()].sort((a,b)=>b.batches-a.batches),
    staticMaterials:[...byStaticMaterial.values()].sort((a,b)=>b.triangles-a.triangles),
    note:'CPU geometry inventory before camera frustum culling; excludes extra shadow/transparent/postprocessing draw passes. Not measured GPU frame time.'};
}

module.exports = { createHarness, runPerformance, profileGeometry };
if (require.main === module) { const h=createHarness(),result = runPerformance(h); if (process.argv.includes('--profile')) console.log(JSON.stringify(profileGeometry(h),null,2)); if (result.passed !== result.total) process.exitCode = 1; }
