/* Original ModSounds / sounds.json resources. OGG is preserved byte-for-byte;
 * MP3 is a codec fallback only. A user gesture unlocks ONE AudioContext so delayed
 * dialogue can actually play on Safari as well. Playback failures are visible. */
(() => {
  'use strict';
  const bank = [
    ['speech_1','Реплика 1 · «Откуда ты?»'],['speech_2','Реплика 2 · перед монетой'],
    ['speech_3','Реплика 3 · выигрыш'],['speech_4','Реплика 4 · свидетель'],
    ['speech_5','Реплика 5 · первый отказ'],['speech_6','Реплика 6 · второй отказ'],
    ['shot','Выстрел'],['reload','Перезарядка'],['coin','Бросок монеты'],
    ['airgun','Пневматический пистолет'],['step','Шаг'],['vanish','Исчезновение']
  ];
  const root='../../assets/sounds/p27/', toggle=document.querySelector('#soundToggle');
  let enabled=!!ZM.store.get('sfx',true), level=Number(ZM.store.get('p27.volume',.8));
  if(!Number.isFinite(level))level=.8;
  level=Math.max(0,Math.min(1,level));
  const active=new Set(), buffers=new Map(), state={unlocked:false,last:'',active:0,errors:[]};
  let context=null,master=null,analyser=null,version=0,media=null;
  const Context=window.AudioContext||window.webkitAudioContext;
  const format=document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"')?'ogg':'mp3';
  function status(text){document.querySelector('#audioStatus').textContent=text;}
  function sync(){
    toggle.setAttribute('aria-pressed',String(enabled));
    document.querySelector('#soundLabel').textContent=enabled?'ЗВУК ВКЛЮЧЁН':'ВКЛЮЧИТЬ ЗВУК';
    document.querySelectorAll('[data-clip]').forEach(button=>{
      const playing=[...active].some(x=>x.name===button.dataset.clip)||!!(media&&!media.paused&&media.dataset.clip===button.dataset.clip);
      button.classList.toggle('playing',playing);button.setAttribute('aria-pressed',String(playing));
      button.querySelector('.clip-symbol').textContent=playing?'■':'▶';
    });
    state.active=active.size+(media&&!media.paused?1:0);
  }
  function create(){
    if(context||!Context)return;
    context=new Context();master=context.createGain();master.gain.value=level;
    const limiter=context.createDynamicsCompressor();limiter.threshold.value=-3;limiter.knee.value=8;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.2;
    analyser=context.createAnalyser();analyser.fftSize=512;
    master.connect(limiter);limiter.connect(analyser);analyser.connect(context.destination);
  }
  async function unlock(){
    if(!enabled)return;
    try{create();if(context){await context.resume();state.unlocked=context.state==='running';}}
    catch(error){state.errors.push(error.message);status('Для воспроизведения нажмите на кнопку звука.');}
  }
  function load(name){
    if(buffers.has(name))return buffers.get(name);
    const request=(async()=>{
      const decode=async ext=>{
        const response=await fetch(root+'chigur_'+name+'.'+ext);
        if(!response.ok)throw new Error('HTTP '+response.status);
        return context.decodeAudioData(await response.arrayBuffer());
      };
      return decode(format).catch(error=>format==='ogg'?decode('mp3'):Promise.reject(error));
    })();
    buffers.set(name,request);request.catch(()=>buffers.delete(name));return request;
  }
  async function play(name,relative=.5){
    if(!enabled||document.hidden)return null;
    const epoch=version;state.last=name;
    try{
      await unlock();if(!enabled||epoch!==version)return null;
      if(context){
        const buffer=await load(name);
        if(!enabled||document.hidden||epoch!==version)return null;
        const node=context.createBufferSource(),gain=context.createGain();node.buffer=buffer;
        // The original dialogue averages about -28 dB. Do not halve it again,
        // as the generic UI sound helper does. The compressor avoids clipping.
        gain.gain.value=Math.min(3.5,Math.max(.2,relative/.5)*(name.startsWith('speech')?2.6:1.8));
        node.connect(gain);gain.connect(master);const item={name,node,gain};active.add(item);
        node.onended=()=>{active.delete(item);node.disconnect();gain.disconnect();sync();};
        node.start();sync();status('Воспроизводится: '+bank.find(x=>x[0]===name)?.[1]+'.');
        return node;
      }
      if(media)media.pause();media=new Audio(root+'chigur_'+name+'.'+format);media.volume=level;media.dataset.clip=name;
      media.onended=sync;await media.play();state.unlocked=true;sync();return media;
    }catch(error){state.errors.push(error.message);status('Звук не запустился. Нажмите на запись ещё раз или включите звук.');return null;}
  }
  function stop(){
    version++;for(const item of active){try{item.node.stop();}catch(_){}item.node.disconnect();item.gain.disconnect();}
    active.clear();if(media){media.pause();media=null;}sync();
  }
  function enable(value){enabled=!!value;ZM.store.set('sfx',enabled);if(!enabled)stop();else unlock();sync();}
  ZM.sfx.bind(()=>enabled);
  const clips=document.querySelector('#soundClips');
  clips.innerHTML=bank.map(([name,label])=>`<button type="button" class="sound-clip" data-clip="${name}" aria-pressed="false" data-nosfx><span class="clip-symbol" aria-hidden="true">▶</span><span><b>${label}</b><small>chigur_${name}.ogg</small></span><span class="clip-time">OGG</span></button>`).join('');
  clips.addEventListener('click',event=>{
    const button=event.target.closest('[data-clip]');if(!button)return;
    const playing=button.classList.contains('playing');stop();
    if(!playing){enable(true);play(button.dataset.clip,.55);}
  });
  const volume=document.createElement('label');volume.className='sound-volume';
  volume.innerHTML=`ГРОМКОСТЬ <input type="range" id="soundVolume" min="0" max="100" value="${Math.round(level*100)}" aria-label="Громкость оригинальных звуков"><span id="volumeLabel">${Math.round(level*100)}%</span>`;
  clips.after(volume);volume.querySelector('input').addEventListener('input',event=>{
    level=Number(event.target.value)/100;if(master)master.gain.value=level;if(media)media.volume=level;
    document.querySelector('#volumeLabel').textContent=Math.round(level*100)+'%';ZM.store.set('p27.volume',level);
  });
  toggle.addEventListener('click',()=>{enable(!enabled);status(enabled?'Звук включён. Записи доступны ниже, в разделе «Звуки мода».':'Звук выключен.');});
  addEventListener('pointerdown',unlock,{capture:true});addEventListener('keydown',unlock,{capture:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){context?.suspend();if(media)media.pause();}
    else if(enabled&&state.unlocked)context?.resume();
  });
  addEventListener('pagehide',stop);
  window.P27Audio={play,stop,enable,state,get enabled(){return enabled;},get analyser(){return analyser;},get context(){return context;},load};sync();
})();
