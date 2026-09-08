/*
 * Input / idle-work regression checks against the actual source application.
 * Real Three.js math and geometry; DOM, clock, and GPU submission are mocked.
 * This measures avoidable work and camera latency, NOT GPU FPS or image quality.
 * Run from any directory: node .codex-review/v6-performance-test.cjs
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

function createHarness({ useBundle = false } = {}) {
const html = read(useBundle ? '月宫华容_三维仿真软件.html' : 'lunar-ui.html');
const embedded = useBundle ? [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]) : null;
if (useBundle) { assert.equal(embedded.length, 3); embedded.forEach(s => new vm.Script(s)); }
const counters = { state: 0, render: 0, matrix: 0 };
const matrixWrites = [];
let lastState, exportedBlob, sceneObserved, clock = 0, nextFrameId = 0, renderer;
const frames = new Map();
const windowHandlers = {};

class Element {
  constructor(id = '', tag = 'DIV') {
    Object.assign(this, { id, tagName: tag, style: {}, dataset: {}, children: [],
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
  querySelectorAll: selector => selector === '[data-axis]' ? axes : missions
};
const element = id => document.getElementById(id);
element('labels').checked = element('paths').checked = true;
element('speed').value = '4'; element('quality').value = 'high';
element('exposure').value = '1.02'; element('settings').hidden = true;

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
vm.createContext(context);
vm.runInContext(useBundle ? embedded[0] : read('vendor/three.min.js'), context, { filename: 'three.min.js' });
context.THREE.WebGLRenderer = class {
  constructor() {
    renderer = this;
    this.shadowMap = {};
    this.capabilities = { getMaxAnisotropy: () => 8, isWebGL2: true };
    this.domElement = new Element();
    this.info = { autoReset: true, render: { calls: 0, triangles: 0, frame: 0 }, memory: {}, reset: () => {} };
  }
  setPixelRatio(value) { this.pixelRatio = value; }
  getPixelRatio() { return this.pixelRatio; }
  setClearColor() {}
  setSize(width, height) { this.width = width; this.height = height; }
  setRenderTarget(target) { this.target = target; }
  getDrawingBufferSize(v) { return v.set(1200 * this.pixelRatio, 720 * this.pixelRatio); }
  render(scene) { counters.render++; this.info.render.calls++; this.info.render.frame++; if (scene.isScene && scene.children.length > 3) sceneObserved = scene; }
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

// Instrument the closure only in this VM; leave production files and global API unchanged.
const app = useBundle ? embedded[2] : read('lunar-scene.js') + '\n' + read('lunar-app.js');
const end = app.lastIndexOf('})();');
assert.ok(end >= 0, 'Expected application IIFE closing marker for read-only test instrumentation');
const probe = `
globalThis.__performanceProbe = {
  read: () => ({ yaw, pitch, distance, target: target.toArray(), camera: camera.position.toArray(),
    goal: { yaw: goal.yaw, pitch: goal.pitch, distance: goal.distance, target: goal.target.toArray() },
    time, duration, playing, highQuality, visibleFloor, cutaway,
    phases, moves, state: snapshot(), selectedRoom, manualMode, estop, viewName, previewMove, walking, sectionMode }),
  batches: () => moduleBatches.map(b => ({ ids: b.ids.slice(), mesh: b.mesh, layer: b.layer })),
  rooms: () => rooms, routes: () => ({ routeGroup, walkGroup }), select: id => selectRoom(id)
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
  counters, matrixWrites, count, delta, tick, settle, seek, dispatch, change, input,
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
