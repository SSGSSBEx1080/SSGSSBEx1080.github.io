/* Original vanilla sound events referenced by Medusa's Java and mcfunctions.
 * One gesture-unlocked context also plays delayed detonations on Safari. */
(()=>{'use strict';
 let enabled=!!ZM.store.get('sfx',true),context=null,master=null,generation=0;
 const buffers=new Map(),active=new Set(),state={last:'',played:0,errors:[]};
 const format=document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"')?'ogg':'mp3';
 async function unlock(){if(!enabled)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  if(!context){context=new C();master=context.createGain();master.gain.value=.8;const limit=context.createDynamicsCompressor();limit.threshold.value=-3;limit.ratio.value=8;master.connect(limit);limit.connect(context.destination);}
  if(context.state!=='running')await context.resume();
 }
 function load(name){if(!buffers.has(name)){const task=(async()=>{const decode=async ext=>{const r=await fetch('../../assets/sounds/p28/'+name+'.'+ext);if(!r.ok)throw Error('HTTP '+r.status);return context.decodeAudioData(await r.arrayBuffer());};return decode(format).catch(e=>format==='ogg'?decode('mp3'):Promise.reject(e));})();buffers.set(name,task);task.catch(()=>buffers.delete(name));}return buffers.get(name);}
 async function play(key){if(!enabled||document.hidden)return;const spec=ZM.P28Audio[key];if(!spec)return;const epoch=generation,clip=spec.clips[Math.floor(Math.random()*spec.clips.length)];state.last=key;ZM.lastSound=performance.now();
  try{await unlock();if(epoch!==generation||!enabled)return;
   const pitch=(key==='bounce' ? .85+Math.random()*.25 : spec.pitch)*clip.pitch;
   if(context){const b=await load(clip.name);if(epoch!==generation||!enabled||document.hidden)return;const source=context.createBufferSource(),gain=context.createGain();source.buffer=b;source.playbackRate.value=pitch;gain.gain.value=spec.volume*clip.volume;source.connect(gain);gain.connect(master);active.add(source);source.onended=()=>{active.delete(source);source.disconnect();gain.disconnect();};source.start();state.played++;}
   else{const a=new Audio('../../assets/sounds/p28/'+clip.name+'.'+format);a.volume=Math.min(1,spec.volume*.8);a.playbackRate=pitch;a.preservesPitch=false;await a.play();state.played++;}
  }catch(e){state.errors.push(e.message);document.querySelector('#actionHint').textContent='Для звука нажмите кнопку «Звук». Воспроизведение заблокировано браузером.';}
 }
 function stop(){generation++;for(const a of active){try{a.stop();}catch(_){}a.disconnect();}active.clear();}
 function sync(){const b=document.querySelector('#soundToggle');b.setAttribute('aria-pressed',String(enabled));b.textContent=enabled?'◖)) Звук':'◖ Включить звук';}
 ZM.sfx.bind(()=>enabled);document.querySelector('#soundToggle').addEventListener('click',()=>{enabled=!enabled;ZM.store.set('sfx',enabled);if(enabled)unlock();else stop();sync();});
 addEventListener('pointerdown',()=>unlock().catch(()=>{}),{capture:true});addEventListener('keydown',()=>unlock().catch(()=>{}),{capture:true});addEventListener('pagehide',stop);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)context?.suspend();else if(enabled)context?.resume();});
 window.P28Sound={play,stop,state,get context(){return context;}};sync();
})();
