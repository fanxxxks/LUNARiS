/* Independent offline background music. Mechanical and UI sounds live on weishan. */
function createLunarAudio(){
 const settings={muted:false,music:18,musicEnabled:true},key='lunaris.audio.v1';
 const element=id=>document.getElementById(id),music=element('backgroundMusic');
 let activated=false,pending=null,error='';
 try{const saved=JSON.parse(localStorage.getItem(key));if(saved){for(const name of ['muted','musicEnabled'])if(typeof saved[name]==='boolean')settings[name]=saved[name];if(Number.isFinite(saved.music))settings.music=Math.max(0,Math.min(100,saved.music));}}catch{}
 function save(){try{const saved=JSON.parse(localStorage.getItem(key))||{};localStorage.setItem(key,JSON.stringify({...saved,...settings}));}catch{}}
 function status(){element('musicStatus').textContent='Flow of Life · '+(settings.muted?'音乐已静音':!settings.musicEnabled?'背景音乐已暂停':settings.music===0?'音乐音量为零':error?'点击页面重试播放':!activated?'首次点击后循环播放':music?.paused?'等待播放':'循环播放中');}
 function wanted(){return activated&&settings.musicEnabled&&!settings.muted&&settings.music>0&&!document.hidden;}
 function sync(){
  if(!music)return;music.loop=true;music.volume=settings.music/100;music.muted=settings.muted;
  if(!wanted()){music.pause();status();return;}
  if(!music.paused||pending){status();return;}
  error='';pending=music.play().then(()=>{if(!wanted())music.pause();}).catch(e=>{error=String(e.message||e);}).finally(()=>{pending=null;status();});status();
 }
 function activate(event){if(event.isTrusted)activated=true;sync();}
 for(const name of ['pointerdown','keydown','click'])document.addEventListener(name,activate,{capture:true});
 element('audioMuted').checked=settings.muted;
 element('audioMuted').addEventListener('change',()=>{settings.muted=element('audioMuted').checked;save();sync();});
 element('musicEnabled').checked=settings.musicEnabled;
 element('musicEnabled').addEventListener('change',()=>{settings.musicEnabled=element('musicEnabled').checked;save();sync();});
 element('musicVolume').value=settings.music;element('musicVolumeValue').value=settings.music+'%';
 element('musicVolume').addEventListener('input',()=>{settings.music=Number(element('musicVolume').value);element('musicVolumeValue').value=settings.music+'%';save();sync();});
 element('audioRecover').addEventListener('click',()=>{activated=true;settings.muted=false;settings.musicEnabled=true;if(!settings.music)settings.music=18;element('audioMuted').checked=false;element('musicEnabled').checked=true;element('musicVolume').value=settings.music;element('musicVolumeValue').value=settings.music+'%';save();sync();});
 if(music)for(const name of ['playing','pause','loadedmetadata','error'])music.addEventListener(name,()=>{if(name==='error')error='无法读取背景音乐';status();});
 document.addEventListener('visibilitychange',sync);
 window.addEventListener('pagehide',()=>{music?.pause();status();});window.addEventListener('pageshow',sync);
 status();return {diagnostics:()=>({settings:{...settings},music:{playing:!!music&&!music.paused,loop:!!music?.loop,time:music?.currentTime||0,duration:Number.isFinite(music?.duration)?music.duration:null,error}})};
}
