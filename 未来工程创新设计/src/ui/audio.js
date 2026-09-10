/* Offline procedural sound. Audio failure never interrupts the simulation. */
function createLunarAudio(onReady=()=>{}){
 const defaults={muted:false,mechanical:55,ui:35,music:18,musicEnabled:true},settings={...defaults},voices=new Set(),counts={};
 let context=null,master=null,mechanical=null,ui=null,motor=null,lastPhase=null,lastCueAt=-Infinity,lastPriorityAt=-Infinity,lastPriority=null,failed=false;
 let pendingCue=null,resuming=null,epoch=0,recoveries=0,lastError='';
 try{const saved=JSON.parse(localStorage.getItem('lunaris.audio.v1'));if(saved&&typeof saved==='object'){for(const key of ['muted','musicEnabled'])if(typeof saved[key]==='boolean')settings[key]=saved[key];for(const key of ['mechanical','ui','music'])if(Number.isFinite(saved[key]))settings[key]=Math.max(0,Math.min(100,saved[key]));}}catch(_){}
 const element=id=>document.getElementById(id);
 const music=element('backgroundMusic');let musicActivated=false,musicPending=null,musicError='';
 function musicStatus(){element('musicStatus').textContent='Flow of Life · '+(settings.muted?'已全部静音':!settings.musicEnabled?'背景音乐已暂停':settings.music===0?'音乐音量为零':musicError?'点击页面重试播放':!musicActivated?'首次点击后循环播放':music?.paused?'等待播放':'循环播放中');}
 function musicWanted(){return musicActivated&&settings.musicEnabled&&!settings.muted&&settings.music>0&&!document.hidden;}
 function syncMusic(){
  if(typeof music?.play!=='function')return;
  music.loop=true;music.volume=settings.music/100;music.muted=settings.muted;
  if(!musicWanted()){music.pause();musicStatus();return;}
  if(!music.paused||musicPending){musicStatus();return;}
  musicError='';
  musicPending=music.play().then(()=>{if(!musicWanted())music.pause();}).catch(error=>{musicError=String(error.message||error);}).finally(()=>{musicPending=null;musicStatus();});
  musicStatus();
 }
 function status(){element('audioStatus').textContent=settings.muted?'全部音效已静音。':!settings.mechanical&&!settings.ui?'机械与操作音量均为零。':failed?'音频暂时不可用，点击“恢复并试听”重试。':context?.state==='running'?'音效已就绪 · 跟随搬运与操作。':context?'音频等待恢复，可点击“恢复并试听”。':'首次点击或按键后启用音效。';}
 function ramp(param,value,seconds=.035){const t=context.currentTime;param.cancelScheduledValues(t);param.setTargetAtTime(value,t,seconds);}
 function save(){try{localStorage.setItem('lunaris.audio.v1',JSON.stringify(settings));}catch(_){} }
 function volumes(){if(!context)return;ramp(master.gain,settings.muted?0:.7,.012);ramp(mechanical.gain,settings.mechanical/100);ramp(ui.gain,settings.ui/100);}
 function track(source,nodes){voices.add(source);source.onended=()=>{voices.delete(source);for(const node of nodes)node.disconnect();};return source;}
 function stopMotor(){if(!motor)return;const old=motor;motor=null;ramp(old.gain.gain,0,.012);for(const source of old.sources)source.stop(context.currentTime+.07);}
 function silence(all=false){stopMotor();if(all){pendingCue=null;if(context){for(const source of voices){try{source.stop();}catch(_){}}}}}
 function discardContext(){
  const old=context;if(old)old.onstatechange=null;
  silence(true);voices.clear();context=null;master=mechanical=ui=null;resuming=null;lastPhase=null;epoch++;
  lastCueAt=lastPriorityAt=-Infinity;lastPriority=null;
  if(old&&old.state!=='closed')old.close().catch(()=>{});
 }
 function ready(){
  status();if(!context||context.state!=='running'||document.hidden||settings.muted)return;
  const pending=pendingCue;pendingCue=null;if(pending&&performance.now()-pending.at<500)cue(pending.kind);
  onReady();
 }
 function unlock(event){
  if(event&&!event.isTrusted)return Promise.resolve(false);
  if(event?.isTrusted)musicActivated=true;syncMusic();
  if(settings.muted||document.hidden)return Promise.resolve(false);
  try{
   if(failed||context?.state==='closed'){discardContext();recoveries++;}
   if(!context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('Audio unavailable');context=new Audio();master=context.createGain();mechanical=context.createGain();ui=context.createGain();
    const limiter=context.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=12;limiter.ratio.value=6;limiter.attack.value=.003;limiter.release.value=.15;
    mechanical.connect(master);ui.connect(master);master.connect(limiter);limiter.connect(context.destination);master.gain.value=.7;mechanical.gain.value=settings.mechanical/100;ui.gain.value=settings.ui/100;volumes();
    const graph=context;context.onstatechange=()=>{if(context!==graph)return;status();if(graph.state==='running')ready();};
   }
   failed=false;lastError='';
   if(context.state==='running'){ready();return Promise.resolve(true);}
   // Retry on a fresh gesture even if an earlier autoplay-blocked resume is pending.
   if(resuming&&!event)return resuming;
   const token=epoch,graph=context;
   const attempt=graph.resume().then(()=>{if(token!==epoch||context!==graph)return false;ready();return graph.state==='running';}).catch(error=>{if(token===epoch){lastError=String(error.message||error);status();}return false;}).finally(()=>{if(resuming===attempt)resuming=null;});
   resuming=attempt;status();return attempt;
  }catch(error){failed=true;lastError=String(error.message||error);silence(true);status();return Promise.resolve(false);}
 }
 function tone(frequency,end,duration,volume,bus,delay=0,type='sine'){
  const t=context.currentTime+delay,source=context.createOscillator(),gain=context.createGain();source.type=type;source.frequency.setValueAtTime(frequency,t);source.frequency.exponentialRampToValueAtTime(end,t+duration);
  gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.008);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);source.connect(gain);gain.connect(bus);track(source,[source,gain]);source.start(t);source.stop(t+duration+.02);
 }
 function metalTransient(bus,delay,frequency,duration,volume){
  const t=context.currentTime+delay,source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
  const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  source.buffer=buffer;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.8;
  gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.002);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
  source.connect(filter);filter.connect(gain);gain.connect(bus);track(source,[source,filter,gain]);source.start(t);source.stop(t+duration+.01);
 }
 function dockingImpact(bus){
  // Heavy seat impact, then two locking jaws; inharmonic modes suggest a metal frame.
  tone(82,36,.3,.36,bus,0,'triangle');metalTransient(bus,0,1150,.1,.25);
  for(const [frequency,decay,level] of [[173,.56,.105],[293,.43,.085],[467,.34,.062],[719,.27,.042],[1091,.2,.025]])tone(frequency,frequency*.987,decay,level,bus,.012);
  metalTransient(bus,.115,2300,.065,.32);tone(326,310,.18,.1,bus,.115,'triangle');
  metalTransient(bus,.185,1650,.085,.23);tone(211,204,.32,.11,bus,.185,'triangle');
 }
 function cue(kind='click'){
  if(settings.muted||document.hidden||failed)return;
  if(!context||context.state!=='running'){
   // Preserve only the current UI gesture, never replay a backlog of mechanical events.
   if(context&&resuming&&!['unlock','dock','deploy','retract'].includes(kind))pendingCue={kind,at:performance.now()};
   return;
  }
  const machine=['unlock','dock','deploy','retract'].includes(kind),bus=machine?mechanical:ui;
  if((machine?settings.mechanical:settings.ui)===0)return;
  const now=context.currentTime,priority=['error','stop','complete','submit'].includes(kind);
  if(!machine&&!priority&&(now-lastCueAt<.075||now-lastPriorityAt<.25))return;
  if(priority&&(lastPriority===kind||lastPriority==='stop')&&now-lastPriorityAt<.12)return;
  if(voices.size>28)return;
  if(!machine)lastCueAt=now;if(priority){lastPriorityAt=now;lastPriority=kind;}counts[kind]=(counts[kind]||0)+1;
  switch(kind){
   case 'unlock':tone(230,95,.16,.17,bus,0,'triangle');tone(360,130,.11,.1,bus,.08,'triangle');break;
   case 'dock':dockingImpact(bus);break;
   case 'deploy':case 'retract':tone(kind==='deploy'?150:270,kind==='deploy'?270:140,.2,.1,bus,0,'triangle');break;
   case 'complete':tone(620,620,.16,.13,bus);tone(830,830,.24,.12,bus,.12);break;
   case 'error':case 'stop':tone(kind==='stop'?250:330,180,.2,.15,bus,0,'triangle');if(kind==='stop')tone(230,150,.22,.12,bus,.18,'triangle');break;
   case 'submit':tone(430,680,.16,.12,bus);break;
   case 'on':case 'panelOpen':tone(420,650,.09,.1,bus);break;
   case 'off':case 'panelClose':tone(560,360,.09,.1,bus);break;
   default:tone(920,620,.045,.09,bus);break;
  }
 }
 function startMotor(){
  const gain=context.createGain(),filter=context.createBiquadFilter(),pan=context.createStereoPanner();gain.gain.value=0;filter.type='lowpass';filter.frequency.value=600;filter.Q.value=.6;filter.connect(gain);gain.connect(pan);pan.connect(mechanical);
  const low=context.createOscillator(),harmonic=context.createOscillator(),noise=context.createBufferSource(),noiseGain=context.createGain();low.type='triangle';harmonic.type='sawtooth';
  const harmonicGain=context.createGain();harmonicGain.gain.value=.13;harmonic.connect(harmonicGain);harmonicGain.connect(filter);low.connect(filter);
  const buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate),data=buffer.getChannelData(0);let smooth=0;for(let i=0;i<data.length;i++){smooth=.88*smooth+.12*(Math.random()*2-1);data[i]=smooth;}noise.buffer=buffer;noise.loop=true;noiseGain.gain.value=.45;noise.connect(noiseGain);noiseGain.connect(filter);
  const sources=[low,harmonic,noise];track(low,[low,gain,filter,pan]);track(harmonic,[harmonic,harmonicGain]);track(noise,[noise,noiseGain]);for(const source of sources)source.start();motor={gain,filter,pan,low,harmonic,harmonicGain,noiseGain,sources};
 }
 function motion(st,running,pan=0,attenuation=1){
  if(failed||!running||!st.phase||!context||context.state!=='running'||settings.muted||!settings.mechanical||document.hidden){stopMotor();return;}
  if(lastPhase!==st.phase){lastPhase=st.phase;if(['unlock','deploy','retract'].includes(st.type))cue(st.type);}
  if(!['translate','elevate','emptyLift','deploy','retract'].includes(st.type)){stopMotor();return;}
  if(!motor)startMotor();
  const velocity=Math.min(1,Math.hypot(...(st.velocity||[0,0,0]))/40),curve=Math.sin(Math.PI*Math.max(0,Math.min(1,st.phaseProgress||0))),speed=['translate','elevate'].includes(st.type)?velocity:curve;
  const vertical=st.type==='elevate'||st.type==='emptyLift',frequency=(vertical?48:65)+speed*(vertical?52:78);
  // Rail motion needs audible midrange on laptop speakers, even under the soundtrack.
  const rail=st.type==='translate';
  ramp(motor.low.frequency,frequency);ramp(motor.harmonic.frequency,frequency*(rail?3.03:2.02));ramp(motor.harmonicGain.gain,rail?.26:.13);ramp(motor.noiseGain.gain,rail?.7:.45);
  ramp(motor.filter.frequency,rail?450+speed*1400:280+speed*700);
  ramp(motor.gain.gain,(.018+speed*.085)*(rail?4:1)*Math.max(rail?.55:.15,Math.min(1,attenuation)));ramp(motor.pan.pan,Math.max(-.85,Math.min(.85,pan)));
 }
 element('audioMuted').checked=settings.muted;
 for(const [key,id] of [['mechanical','mechanicalVolume'],['ui','uiVolume']]){const input=element(id),output=element(id+'Value');input.value=settings[key];output.value=settings[key]+'%';input.addEventListener('input',()=>{settings[key]=Number(input.value);output.value=input.value+'%';volumes();if(!settings.mechanical)stopMotor();save();status();});input.addEventListener('change',()=>cue(key==='mechanical'?'dock':'click'));}
 element('audioMuted').addEventListener('change',()=>{settings.muted=element('audioMuted').checked;if(settings.muted)silence(true);else unlock();volumes();syncMusic();save();status();});
 element('musicEnabled').checked=settings.musicEnabled;
 element('musicEnabled').addEventListener('change',()=>{settings.musicEnabled=element('musicEnabled').checked;syncMusic();save();});
 element('musicVolume').value=settings.music;element('musicVolumeValue').value=settings.music+'%';
 element('musicVolume').addEventListener('input',()=>{settings.music=Number(element('musicVolume').value);element('musicVolumeValue').value=settings.music+'%';syncMusic();save();});
 if(typeof music?.play==='function')for(const event of ['playing','pause','loadedmetadata','error'])music.addEventListener(event,()=>{if(event==='error')musicError='无法读取背景音乐';musicStatus();});
 musicStatus();
 element('audioPreview').addEventListener('click',()=>{unlock().then(ok=>{if(ok)cue('dock');});});
 element('audioRecover').addEventListener('click',()=>{
  discardContext();recoveries++;failed=false;settings.muted=false;element('audioMuted').checked=false;
  for(const [key,id] of [['mechanical','mechanicalVolume'],['ui','uiVolume']]){if(settings[key]===0)settings[key]=defaults[key];element(id).value=settings[key];element(id+'Value').value=settings[key]+'%';}
  save();unlock().then(ok=>{if(ok)cue('dock');});
 });
 document.addEventListener('pointerdown',unlock,true);document.addEventListener('keydown',unlock,true);
 document.addEventListener('click',event=>{if(!event.isTrusted)return;unlock(event);const button=event.target.closest?.('button');if(!button||button.disabled||button.getAttribute('aria-disabled')==='true'||['audioPreview','audioRecover','play','replay','stop','scheduleSubmit'].includes(button.id))return;
  const expanded=button.getAttribute('aria-expanded'),pressed=button.getAttribute('aria-pressed');cue(expanded!==null?(expanded==='true'?'panelOpen':'panelClose'):button.matches('[data-close-panel],.close')?'panelClose':pressed!==null?(pressed==='true'?'on':'off'):'click');
 });
 document.addEventListener('change',event=>{if(event.isTrusted&&event.target.matches('input[type=checkbox]:not(#audioMuted)'))cue(event.target.checked?'on':'off');else if(event.isTrusted&&event.target.matches('select'))cue('click');});
 function suspend(){
  music?.pause?.();musicStatus();
  pendingCue=null;silence(true);const graph=context;
  if(graph&&graph.state!=='closed')graph.suspend().then(()=>{if(context===graph&&!document.hidden&&!settings.muted)unlock();}).catch(()=>{});
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else{syncMusic();if(context&&!settings.muted)unlock();}});
 window.addEventListener('pagehide',()=>{music?.pause?.();silence(true);if(context?.state==='running')context.suspend().catch(()=>{});});
 window.addEventListener('pageshow',()=>{syncMusic();if(context&&!document.hidden&&!settings.muted)unlock();});
 status();return {cue,motion:(...args)=>{try{motion(...args);}catch(error){failed=true;lastError=String(error.message||error);silence(true);status();}},silence,diagnostics:()=>({state:context?.state||'locked',failed,lastError,recoveries,settings:{...settings},music:{playing:!!music&&!music.paused,loop:!!music?.loop,time:music?.currentTime||0,duration:Number.isFinite(music?.duration)?music.duration:null,error:musicError},motor:!!motor,voices:voices.size,phase:lastPhase?.type||null,counts:{...counts}})};
}
