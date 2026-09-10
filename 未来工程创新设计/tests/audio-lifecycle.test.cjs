'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/ui/audio.js'),'utf8');
function harness({state='running',delay=false,failOnce=false}={}){
 const elements=new Map(),listeners={},contexts=[];let failures=0;
 const param=()=>({value:0,cancelScheduledValues(){},setTargetAtTime(v){this.value=v;},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 const node=()=>({gain:param(),frequency:param(),Q:param(),pan:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){},disconnect(){},start(){},stop(){this.onended?.();}});
 const element=id=>{if(!elements.has(id))elements.set(id,{value:'',checked:false,addEventListener(name,fn){this[name]=fn;}});return elements.get(id);};
 const document={hidden:false,getElementById:element,addEventListener(name,fn){(listeners[name]??=[]).push(fn);}};
 class AudioContext{
  constructor(){if(failOnce&&failures++===0)throw Error('Device unavailable');this.state=state;this.currentTime=1;this.sampleRate=48000;this.destination=node();this.resumes=0;contexts.push(this);}
  createGain(){return node();}createDynamicsCompressor(){return node();}createOscillator(){return node();}createBiquadFilter(){return node();}createStereoPanner(){return node();}createBufferSource(){return node();}
  createBuffer(channels,length){return {getChannelData:()=>new Float32Array(length)};}
  resume(){this.resumes++;return new Promise(resolve=>{const finish=()=>{this.state='running';this.onstatechange?.();resolve();};if(delay)this.finishResume=finish;else finish();});}
  suspend(){this.state='suspended';this.onstatechange?.();return Promise.resolve();}
  close(){this.state='closed';this.onstatechange?.();return Promise.resolve();}
 }
 const scope={window:{AudioContext,addEventListener(){}},document,localStorage:{getItem:()=>null,setItem(){}},performance:{now:()=>100},Date,Math,Float32Array,setTimeout,clearTimeout};vm.createContext(scope);vm.runInContext(source+'\nthis.audio=createLunarAudio();',scope);
 const gesture=()=>{for(const listener of listeners.pointerdown||[])listener({isTrusted:true});};
 return {audio:scope.audio,contexts,gesture,element,document,listeners};
}
test('first click waits for audio resume instead of losing the sound',async()=>{
 const h=harness({state:'suspended',delay:true});h.gesture();h.audio.cue('panelOpen');h.contexts[0].finishResume();await new Promise(r=>setImmediate(r));assert.equal(h.audio.diagnostics().counts.panelOpen,1);
});
test('next gesture rebuilds a closed audio device and plays again',async()=>{
 const h=harness();h.gesture();h.audio.cue('click');await h.contexts[0].close();h.gesture();await new Promise(r=>setImmediate(r));h.audio.cue('dock');assert.equal(h.contexts.length,2);assert.equal(h.audio.diagnostics().counts.dock,1);
});
test('interrupted audio resumes on a new gesture',async()=>{
 const h=harness();h.gesture();h.contexts[0].state='interrupted';h.gesture();await new Promise(r=>setImmediate(r));h.audio.cue('dock');assert.ok(h.contexts[0].resumes>0);assert.equal(h.audio.diagnostics().counts.dock,1);
});
test('temporary initialization failure is retryable',async()=>{
 const h=harness({failOnce:true});h.gesture();assert.equal(h.audio.diagnostics().failed,true);h.gesture();await new Promise(r=>setImmediate(r));h.audio.cue('dock');assert.equal(h.audio.diagnostics().failed,false);assert.equal(h.audio.diagnostics().counts.dock,1);
});
test('mute discards clicks queued while the device is resuming',async()=>{
 const h=harness({state:'suspended',delay:true});h.gesture();h.audio.cue('panelOpen');h.element('audioMuted').checked=true;h.element('audioMuted').change();h.contexts[0].finishResume();await new Promise(r=>setImmediate(r));assert.equal(h.audio.diagnostics().counts.panelOpen,undefined);
});
test('restore rebuilds audio, clears mute and repairs zero channel volumes',async()=>{
 const h=harness();h.gesture();
 for(const id of ['mechanicalVolume','uiVolume']){h.element(id).value='0';h.element(id).input();}
 h.element('audioMuted').checked=true;h.element('audioMuted').change();h.element('audioRecover').click();await new Promise(r=>setImmediate(r));
 const d=h.audio.diagnostics();assert.equal(d.state,'running');assert.equal(d.settings.muted,false);assert.equal(d.settings.mechanical,55);assert.equal(d.settings.ui,35);assert.equal(d.counts.dock,1);assert.equal(h.contexts.length,2);
});
test('a late background suspension recovers after the page is visible again',async()=>{
 const h=harness();h.gesture();const graph=h.contexts[0];let finishSuspend;
 graph.suspend=()=>new Promise(resolve=>{finishSuspend=()=>{graph.state='suspended';graph.onstatechange?.();resolve();};});
 h.document.hidden=true;for(const listener of h.listeners.visibilitychange)listener();
 h.document.hidden=false;for(const listener of h.listeners.visibilitychange)listener();finishSuspend();await new Promise(r=>setImmediate(r));
 assert.equal(h.audio.diagnostics().state,'running');h.audio.cue('dock');assert.equal(h.audio.diagnostics().counts.dock,1);
});
