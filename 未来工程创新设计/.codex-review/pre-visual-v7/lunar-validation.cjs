/* V6 integration against actual bundled HTML (default) or current source (--source).
 * Real Three.js geometry and transforms; DOM, clock, and GPU are mocked.
 * Do not treat this as visual, GPU-frame-time, engineering, or structural validation. */
'use strict';
const assert = require('node:assert/strict');
const { createHarness } = require('./.codex-review/v6-performance-test.cjs');
const plain = value => JSON.parse(JSON.stringify(value));

async function main() {
  const h = createHarness({ useBundle: !process.argv.includes('--source') });
  const { element: $, context, missions, axes, tick, settle, seek, probeRead: read, dispatch, document } = h;
  const C = context.LunarCore, results = [];
  const end = () => seek(read().duration);
  const reset = () => { $('block').checked = false; $('reset').click(); tick(); settle(); };
  const maps = () => $('floorMaps').querySelectorAll().filter(e => e.dataset.node !== undefined);
  const map = node => { const e = maps().find(e => Number(e.dataset.node) === node); assert.ok(e, 'Expected map node ' + node); return e; };
  async function test(name, fn) {
    try { await fn(); results.push({ name, passed: true }); console.log('PASS:', name); }
    catch (error) { results.push({ name, passed: false }); console.error('FAIL:', name, '\n ', error.stack); }
  }
  tick(); settle();

  await test('V6 initializes 24 rooms, 42 compact nodes, five irregular 5×3 maps, and a paused 4× default', () => {
    assert.equal($('loading').hidden, true); assert.equal($('play').disabled, false);
    assert.equal(read().playing, false); assert.match($('phase').textContent, /已就绪/);
    assert.equal(C.nodes.length, 42); assert.equal(C.config.roomCount, 24); assert.equal(C.config.metresPerUnit, .1);
    assert.equal(C.shafts.length, 3); assert.equal(read().state.positions.length, 24);
    assert.equal(read().state.orientations.length, 24); assert.equal(maps().length, 42);
    assert.equal($('floorMaps').children.length, 5);
    for(const cell of maps()){const node=C.nodes[Number(cell.dataset.node)];assert.equal(Number(cell.style.gridColumn),node.col+3);assert.equal(Number(cell.style.gridRow),node.row+2);}
    assert.equal(C.config.pitchX,102);assert.equal(C.config.pitchZ,96);assert.equal(C.config.pitchY,92);
    const options = h.html.match(/<select[^>]*id="speed"[^>]*>([\s\S]*?)<\/select>/)[1];
    assert.match(options, /value="4" selected/);
    assert.equal($('speed').value, '4');
  });

  await test('Every actual module geometry fits its local 92×78×84 transport envelope', () => {
    const roomIds = new Set(); let batches = 0, triangles = 0;
    for (const batch of context.__performanceProbe.batches()) {
      batches++; batch.ids.forEach(id => roomIds.add(id));
      const g = batch.mesh.geometry; g.computeBoundingBox(); const b = g.boundingBox;
      const label = 'batch ' + batches + ' / ' + batch.layer;
      assert.ok(b.min.x >= -46.001 && b.max.x <= 46.001, label + ' X: ' + b.min.x + '..' + b.max.x);
      assert.ok(b.min.y >= -.001 && b.max.y <= 78.001, label + ' Y: ' + b.min.y + '..' + b.max.y);
      assert.ok(b.min.z >= -42.001 && b.max.z <= 42.001, label + ' Z: ' + b.min.z + '..' + b.max.z);
      triangles += (g.index?.count ?? g.attributes.position.count) / 3 * batch.ids.length;
    }
    assert.equal(roomIds.size, 24); assert.ok(batches > 0 && triangles > 100000);
    console.log('  Actual room geometry:', batches, 'batches /', Math.round(triangles), 'instanced triangles');
  });

  await test('All three tasks complete, conserve rooms, meet mission metrics, and dock after native-slider rounding', () => {
    for (const mission of missions) {
      $('block').checked = false; mission.click(); tick();
      assert.equal(read().playing, true); end();
      const st = read().state, preset = C.preset(mission.dataset.task);
      assert.equal(st.type, 'done'); assert.equal(st.finished, read().moves.length);
      assert.equal($('completed').textContent, $('total').textContent);
      assert.deepEqual(plain(st.layout), plain(preset.target));
      assert.equal(new Set(st.layout.filter(x => x !== null)).size, 24);
      assert.equal(C.missionMetric(mission.dataset.task, st.layout), C.missions[mission.dataset.task].after);
      seek(read().duration - .0025); assert.equal(read().state.type, 'done');
      st.layout.forEach((id, node) => { if (id !== null) {
        assert.deepEqual(plain(st.positions[id]), plain(C.slots[node]));
        h.close(st.orientations[id][1], 0, 'Dock orientation');
      }});
    }
  });

  await test('Pause, reverse seek, emergency stop, and resume preserve continuous XYZ state', () => {
    reset(); const p = read().phases.find(p => p.type === 'elevate');
    const t = p.start + (p.end - p.start) * .45;
    seek(t); const paused = plain(read().state.positions); tick(120);
    assert.deepEqual(plain(read().state.positions), paused);
    end(); seek(t); assert.deepEqual(plain(read().state.positions), paused);
    $('stop').click(); tick(); assert.equal($('timeline').disabled, true); assert.equal(read().estop, true);
    const stopped = read().time; tick(500); h.close(read().time, stopped, 'Stop preserves time');
    $('play').click(); tick(); assert.equal(read().estop, false); assert.equal($('timeline').disabled, false);
    assert.ok(read().time > stopped); $('play').click(); tick();
  });

  await test('Playback completion refreshes the final labels before demand rendering stops',()=>{
    reset();$('speed').value='16';seek(read().duration-.3);$('play').click();tick(10);tick(10);
    assert.equal(read().playing,false);assert.equal(read().state.type,'done');assert.match($('phase').textContent,/重构完成/);assert.equal($('completed').textContent,$('total').textContent);$('speed').value='4';
  });

  await test('Manual movement previews first, cancels without moving, then confirms a full internal cross-level transfer', () => {
    reset(); $('manual').click(); tick();
    assert.equal($('manualControls').hidden, false); assert.equal(read().manualMode, true);
    const from=C.bay(0,-1,-1),to=C.bay(1,1,-1),id=read().state.layout[from];
    assert.notEqual(id,null);assert.equal(read().state.layout[to],null);map(from).click();tick();
    const before=plain(read().state.layout);map(to).click();tick();assert.equal($('movePreview').hidden,false);
    assert.equal(read().previewMove.to,to);assert.equal(read().playing,false);assert.deepEqual(plain(read().state.layout),before);
    $('cancelMove').click();tick();assert.equal(read().previewMove,null);assert.deepEqual(plain(read().state.layout),before);
    map(to).click();tick();$('confirmMove').click();tick();assert.equal(read().playing,true);
    const vertical=read().phases.find(p=>p.type==='elevate');seek(vertical.start+(vertical.end-vertical.start)*.4);
    const st=read().state;assert.equal(st.active,id);assert.ok(st.positions[id][1]>34&&st.positions[id][1]<126);assert.equal($('flightTelemetry').hidden,true);
    for(const [index,room] of context.__performanceProbe.rooms().entries()){room.position.toArray().forEach((v,a)=>h.close(v,st.positions[index][a],'Rendered XYZ position'));assert.equal(room.rotation.order,'YXZ');}
    end();assert.equal(read().state.layout[to],id);assert.equal($('coordY').textContent,'12.6');
    document.activeElement=document.body;dispatch(document,'keydown',{code:'KeyA',key:'a'});tick();assert.equal(read().previewMove.to,C.lift(1,'C'));$('confirmMove').click();tick();end();
    dispatch(document,'keydown',{code:'KeyQ',key:'q'});tick();assert.equal(read().previewMove.to,C.lift(0,'C'));$('confirmMove').click();tick();end();assert.equal($('coordY').textContent,'3.4');
  });

  await test('Selecting another room clears a stale manual preview', () => {
    reset(); $('manual').click(); tick(); map(C.bay(0,-1,-1)).click(); map(C.bay(1,1,-1)).click(); tick();
    assert.ok(read().previewMove); map(C.bay(0,-2,-1)).click(); tick();
    assert.equal(read().previewMove, null); assert.equal($('movePreview').hidden, true);
  });

  await test('Changing access or exiting manual mode invalidates the unconfirmed route',()=>{
    reset();$('manual').click();tick();map(C.bay(0,-1,-1)).click();map(C.bay(1,1,-1)).click();tick();assert.ok(read().previewMove);
    $('block').checked=true;$('block').onchange();tick();assert.equal(read().previewMove,null);$('confirmMove').click();tick();assert.equal(read().playing,false);
    $('block').checked=false;$('block').onchange();map(C.bay(1,1,-1)).click();tick();assert.ok(read().previewMove);$('manual').click();tick();assert.equal(read().previewMove,null);assert.equal($('movePreview').hidden,true);
  });

  await test('Five-layer isolation and integrated framework view retain original coordinates', () => {
    reset(); const original = plain(read().state.positions);
    $('floorMaps').children[0].querySelector('button').click(); tick(); settle();
    assert.equal(read().visibleFloor, 4); assert.equal($('allFloors').attrs['aria-pressed'], 'false');
    const visible = context.__performanceProbe.rooms().filter(r => r.userData.visible);
    assert.equal(visible.length, C.initial.filter((id,node) => id !== null && C.nodes[node].level === 4).length);
    $('allFloors').click(); tick(); $('mechanism').click(); tick(); settle();
    assert.equal(read().cutaway, true); assert.match($('phase').textContent, /精简框架/);
    assert.ok(context.__performanceProbe.rooms().every(r => !r.userData.visible));
    assert.deepEqual(plain(read().state.positions), original);
    $('overview').click(); tick(); assert.ok(context.__performanceProbe.rooms().every(r => r.userData.visible));
  });

  await test('Personnel routing renders all three connected initial room pairs and removes disconnected-flight pairs', () => {
    reset(); if (read().walking) $('walkthrough').click(); $('walkthrough').click(); tick();
    assert.equal(read().walking, true); assert.equal(read().state.connected, true);
    assert.equal(context.__performanceProbe.routes().walkGroup.children.length, 3, 'All initial scientific pairs remain connected');
    const flight = read().phases.find(p => p.type === 'elevate'&&C.missions.vertical.roomIds.includes(p.room));
    seek(flight.start + (flight.end-flight.start)*.4);
    assert.equal(read().state.connected, false);
    assert.equal(context.__performanceProbe.routes().walkGroup.children.length, 1, 'Flying collaborator cannot be used as a walking endpoint');
    end(); tick(); assert.equal(context.__performanceProbe.routes().walkGroup.children.length, 3);
    $('walkthrough').click(); tick(); assert.equal(read().walking, false);
  });

  await test('Selected-room section hides only its skin and preserves nearby rooms and interior', () => {
    reset(); if (read().sectionMode) $('sectionView').click(); $('sectionView').click(); tick(); settle();
    assert.equal(read().sectionMode, true); assert.equal($('sectionView').attrs['aria-pressed'], 'true');
    const selected = read().selectedRoom, matrix = new context.THREE.Matrix4(), scale = new context.THREE.Vector3();
    let hiddenSkins = 0, visibleOtherSkins = 0, visibleInteriors = 0;
    for (const b of context.__performanceProbe.batches()) for (let index=0;index<b.ids.length;index++) {
      b.mesh.getMatrixAt(index,matrix); scale.setFromMatrixScale(matrix);
      if (b.layer === 'skin' && b.ids[index] === selected) { assert.ok(scale.length() < 1e-8); hiddenSkins++; }
      if (b.layer === 'skin' && b.ids[index] !== selected && scale.length() > 1) visibleOtherSkins++;
      if (b.layer === 'interior' && b.ids[index] === selected && scale.length() > 1) visibleInteriors++;
    }
    assert.ok(hiddenSkins && visibleOtherSkins && visibleInteriors);
    $('sectionView').click(); tick(); assert.equal(read().sectionMode, false);
  });

  await test('Three lighting modes, two quality modes, exposure, immersion, and free-flight camera operate', () => {
    reset();
    for (const mode of ['sunrise','day','night']) { h.change('lighting',mode); tick(); }
    h.change('quality','balanced'); tick(); assert.equal(read().highQuality,false); assert.equal(rendererShadow(),2048);
    h.change('quality','high'); tick(); assert.equal(read().highQuality,true);
    h.input('exposure','1.3'); tick(); assert.equal(h.renderer.toneMappingExposure,1.3);
    $('presentation').click(); assert.equal($('exitImmersion').hidden,false);
    $('exitImmersion').click(); assert.equal($('exitImmersion').hidden,true);
    $('roam').click(); tick(); const start = read().camera.slice();
    document.activeElement=document.body; dispatch(document,'keydown',{code:'KeyE',key:'e'}); tick(100);
    assert.ok(read().camera[1]>start[1]); dispatch(document,'keyup',{code:'KeyE',key:'e'});
    $('overview').click(); tick(); settle(); assert.equal(read().viewName,'overview');
  });
  function rendererShadow() {
    let value; h.scene().traverse(o=>{if(o.isDirectionalLight&&o.castShadow)value=o.shadow.mapSize.x;}); return value;
  }

  await test('Closing L2 C reroutes presets, refuses a blocked manual target, and reopens cleanly',()=>{
    $('block').checked=true;missions[0].click();tick();assert.equal($('play').disabled,false);assert.ok(read().moves.every(m=>!m.nodePath.includes(C.lift(1,'C'))));end();assert.equal(C.missionMetric('vertical',read().state.layout),3);
    reset();$('manual').click();tick();map(C.bay(0,-1,-1)).click();$('block').checked=true;$('block').onchange();map(C.lift(1,'C')).click();tick();assert.equal(read().previewMove,null);assert.equal($('movePreview').hidden,true);reset();
  });

  await test('V6 export contains compact nodes, independent lift states, and reconstructible phases', async () => {
    reset(); const phase=read().phases.find(p=>p.type==='elevate');seek(phase.start+(phase.end-phase.start)*.5);
    const data=await h.exportData();
    assert.equal(data.version,'6.0'); assert.equal(data.metresPerSceneUnit,.1);
    assert.equal(data.slots.length,42); assert.equal(data.nodes.length,42); assert.equal(data.shafts.length,3);
    assert.equal(data.current.positions.length,24); assert.equal(data.current.orientations.length,24);
    assert.ok(data.current.orientations.every(o=>o.length===3&&o.every(Number.isFinite)));
    assert.ok(data.current.elevators.A);assert.ok(data.current.elevators.B);assert.ok(data.current.elevators.C);
    assert.ok(data.phases.some(p=>p.type==='elevate'));assert.ok(data.phases.some(p=>p.type==='translate'));assert.ok(data.phases.some(p=>p.type==='dock'));
    assert.ok(data.events.some(e=>e.event==='plan'));
  });

  const passed=results.filter(r=>r.passed).length;
  console.log('\n'+passed+'/'+results.length+' V6 integration checks passed ('+(process.argv.includes('--source')?'source':'bundled HTML')+').');
  console.log('GPU and DOM mocked; real-browser visual, layout, FPS and frame-time review remains separate.');
  if(passed!==results.length)process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
