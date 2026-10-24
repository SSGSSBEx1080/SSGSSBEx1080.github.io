/* №26 · One vacuum, one state. The floor, bag, enchantment and timer are connected.
   Mechanics: VacuumData / VacuumServerEvents / vacuum.json, not invented item stats. */
(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded',()=>document.querySelector('.zm-route')?.remove());
  const $=ZM.$, K=ZM.kit, esc=ZM.esc, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const T='../../assets/textures/p26/', icon=id=>T+(id==='vacuum_icon'?'vacuum_icon':'v/'+id)+'.png';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  ZM.topbar({crumb:'№26 · Пылесос',...ZM.pointNav(26)});K.finNav(26,$('#finNav'));
  K.timeline($('#tl'), [
    { date: '07.08.2026', t: 'Пылесос', d: 'Пункт №26: пылесос, который всасывает предметы и существ. Отдельной версии в дневнике нет — вошёл сразу после плащей, между 1.1.3 и 1.1.7.', c: '#86d8c6' },
  ]);
  const ITEMS=[['diamond','Алмаз','ore'],['coal','Уголь','ore'],['raw_iron','Сырое железо','ore'],['emerald','Изумруд','ore'],['copper_ingot','Медь','ore'],['iron_ingot','Железо','ore'],['raw_gold','Сырое золото','ore'],['stone','Камень','block'],['cobblestone','Булыжник','block'],['dirt','Земля','block'],['oak_log','Дуб','block'],['apple','Яблоко','food'],['bread','Хлеб','food'],['carrot','Морковь','food'],['potato','Картофель','food'],['wheat','Пшеница','wheat'],['dropper','Выбрасыватель','misc'],['feather','Перо','misc'],['stick','Палка','misc'],['arrow','Стрела','misc'],['redstone','Редстоун','misc'],['chest','Сундук','misc'],['hopper','Воронка','misc'],['anvil','Наковальня','misc'],['enchanted_book','Книга чар','misc']].map(([id,name,category])=>({id,name,category,max:id==='enchanted_book'?1:64}));
  const byId=id=>ITEMS.find(x=>x.id===id);
  const MODES=[['ores','Руды','diamond'],['blocks','Блоки','stone'],['food','Еда','bread'],['custom','Свой предмет','name_tag']];
  const defaults={power:5,mode:'ores',custom:'diamond',history:[],upgrades:0,enchant:0,inventory:[],caught:0};
  const specimenKeys=Object.keys(defaults);
  function clean(input={}) {
    const o=Object.assign(structuredClone(defaults),input);
    for(const [key,min,max] of [['power',1,10],['upgrades',0,15],['enchant',0,3]]) o[key]=clamp(Math.round(Number(o[key])||min),min,max);
    o.mode=MODES.some(x=>x[0]===o.mode)?o.mode:'ores';o.custom=byId(o.custom)?o.custom:'diamond';
    o.history=Array.isArray(o.history)?o.history.filter(id=>byId(id)).slice(0,10):[];
    o.inventory=Array.isArray(o.inventory)?o.inventory.filter(x=>x&&byId(x.id)&&Number.isFinite(x.n)&&x.n>0).map(x=>({id:x.id,n:Math.floor(x.n)})).slice(0,177):[];
    o.caught=Math.max(0,Math.floor(Number(o.caught)||0));
    return Object.fromEntries(specimenKeys.map(k=>[k,o[k]]));
  }
  const saved=ZM.store.get('p26.lab',{})||{}, exemplar=saved.exemplar==='B'?'B':'A';
  // The previous page kept both a current snapshot and A/B snapshots. Preserve both formats.
  const specimens={A:clean(saved.specimens?.A||saved),B:clean(saved.specimens?.B||{})};
  if(!saved.specimens) specimens[exemplar]=clean(saved);
  const S=Object.assign({},specimens[exemplar],{exemplar,specimens,active:false,maxSecs:0,playerCount:Math.max(0,Number(saved.playerCount)||0),crafted:!!saved.crafted});
  const snapshot=()=>Object.fromEntries(specimenKeys.map(k=>[k,structuredClone(S[k])]));
  function persist(){S.specimens[S.exemplar]=snapshot();ZM.store.set('p26.lab',Object.assign(snapshot(),{exemplar:S.exemplar,specimens:S.specimens,playerCount:S.playerCount,crafted:S.crafted}));}
  const capacity=()=>27+S.upgrades*10, range=()=>S.power+S.enchant*5, free=()=>capacity()-S.inventory.length;
  function matches(item){if(!item)return false;return S.mode==='ores'?item.category==='ore':S.mode==='blocks'?item.category==='block':S.mode==='food'?['food','wheat'].includes(item.category):S.mode==='custom'&&item.id===S.custom;}
  const log=text=>$('#labLog').textContent=text;
  const adv=K.adv({list:ZM.P26.advancements,store:'p26.adv',icon:a=>icon(a.icon),intro:'Три настоящих достижения мода. Имена и описания оставлены без прикрас.'});
  function ensureItem(){S.crafted=true;adv.grant('crafted');}
  function insert(id,count=1){
    if(!byId(id)||!Number.isFinite(count)||count<=0)return 0;
    let left=Math.floor(count);const max=byId(id).max;
    for(const stack of S.inventory){if(stack.id!==id||stack.n>=max)continue;const n=Math.min(left,max-stack.n);stack.n+=n;left-=n;if(!left)break;}
    while(left>0&&S.inventory.length<capacity()){const n=Math.min(max,left);S.inventory.push({id,n});left-=n;}
    const taken=Math.floor(count)-left;
    if(taken){S.inventory.sort((a,b)=>a.id.localeCompare(b.id,'en'));S.caught+=taken;persist();renderBag();renderStats();window.dispatchEvent(new CustomEvent('p26-insert',{detail:{id,n:taken}}));}
    return taken;
  }
  const sources=new Set();let preview=false,previewTimer=0,airTimer=0,transfer=null;
  const audio=$('#vacuumAudio');audio.volume=.22;
  let playing=false;
  function syncAudio(){const want=(S.active||preview)&&ZM.sfx.on()&&!document.hidden;if(want&&!playing){playing=true;audio.play().catch(()=>{playing=false;});}else if(!want&&playing){playing=false;audio.pause();audio.currentTime=0;}}
  function hold(on,source='floor') {
    if(on){ensureItem();sources.add(source);}else sources.delete(source);
    const active=sources.size>0;
    if(S.active!==active){S.active=active;if(!active)S.maxSecs=0;renderTimer();renderStats();syncAudio();}
    $('#latchBtn').setAttribute('aria-pressed',String(sources.has('latch')));
    $('#heroVisual').classList.toggle('pumping',S.active||preview);
  }
  function stop(){sources.clear();S.active=false;S.maxSecs=0;preview=false;clearTimeout(previewTimer);$('#heroSpin').setAttribute('aria-pressed','false');$('#heroSpin').textContent='Включить пылесос ▷';$('#heroVisual').classList.remove('pumping');$('#latchBtn').setAttribute('aria-pressed','false');renderStats();renderTimer();syncAudio();}
  const holdBtn=$('#suckBtn');
  holdBtn.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();holdBtn.setPointerCapture(e.pointerId);hold(true,'button');});
  ['pointerup','pointercancel','lostpointercapture'].forEach(event=>holdBtn.addEventListener(event,()=>hold(false,'button')));
  holdBtn.addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();hold(true,'key-button');}});
  holdBtn.addEventListener('blur',()=>{hold(false,'key-button');hold(false,'button');});
  holdBtn.addEventListener('keyup',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();hold(false,'key-button');}});
  $('#latchBtn').addEventListener('click',()=>hold(!sources.has('latch'),'latch'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});addEventListener('blur',stop);addEventListener('pagehide',stop);
  new IntersectionObserver(es=>{if(!es[0].isIntersecting&&S.active)stop();}).observe($('#cleanup'));
  document.addEventListener('click',()=>setTimeout(syncAudio,0));
  $('#heroSpin').addEventListener('click',()=>{
    preview=!preview;clearTimeout(previewTimer);$('#heroVisual').classList.toggle('pumping',preview);$('#heroSpin').setAttribute('aria-pressed',String(preview));$('#heroSpin').textContent=preview?'Выключить пылесос ■':'Включить пылесос ▷';
    if(preview&&!ZM.sfx.on())K.say('Звук выключен. Его можно включить кнопкой внизу.');
    syncAudio();if(preview)previewTimer=setTimeout(()=>{preview=false;$('#heroVisual').classList.toggle('pumping',S.active);$('#heroSpin').setAttribute('aria-pressed','false');$('#heroSpin').textContent='Включить пылесос ▷';syncAudio();},4500);
  });
  function renderStats(){
    $('#powerNumber').textContent=S.power;$('#powerRange').value=S.power;
    $('#labRange').textContent=range();$('#labCaught').textContent=S.caught;$('#labFree').textContent=free();
    $('#enchantRadius').textContent=range();$('#airReadout').textContent='Задний поток: ×'+(S.enchant+1);
    $('#airDemo').style.setProperty('--jet',S.enchant+1);$('#airDemo').classList.toggle('blowing',S.active);
    $('#suckLabel').textContent=S.active?'Всё внутрь!':'Зажми для потока';$('#suckBtn').setAttribute('aria-pressed',String(S.active));
    $('#capacityBig').textContent=capacity();$('#vaultCaseTitle').textContent=S.exemplar==='A'?'А':'Б';$('#upgradeCount').textContent=S.upgrades;
    $('#upgradeBtn').disabled=S.upgrades>=15;$('#chestsLeft').textContent=S.upgrades>=15?'Предел: 177 ячеек. Больше не бывает.':'Сундуки для опыта доступны бесплатно. Осталось: '+(15-S.upgrades)+'.';
    $('#playerItems').textContent=S.playerCount?S.playerCount+' предметов':'Пока пусто';
  }
  function setPower(n){n=clamp(Math.round(n),1,10);if(n===S.power)return;S.power=n;if(n!==10)S.maxSecs=0;persist();renderStats();renderTimer();log('Сила '+n+'/10. Конус и дальность изменились.');}
  $('#powerRange').addEventListener('input',e=>setPower(+e.target.value));
  function renderFilters(){
    $('#filters').innerHTML=MODES.map(([id,title,item])=>`<button type="button" data-mode="${id}" aria-pressed="${S.mode===id}"><img src="${item==='name_tag'?'../../assets/textures/p23/i/name_tag.png':icon(item)}" alt="">${title}</button>`).join('');
    $('#customPicker').hidden=S.mode!=='custom';$('#customSearch').value=byId(S.custom).name;$('#customSelected').textContent='Выбран: '+byId(S.custom).name;renderSearch();
  }
  $('#filters').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(!b)return;S.mode=b.dataset.mode;persist();renderFilters();log('Берём только '+MODES.find(x=>x[0]===S.mode)[1].toLowerCase()+'. Всё остальное останется.');window.P26FLOOR?.refresh();});
  function selectCustom(id){if(!byId(id))return false;S.custom=id;S.mode='custom';S.history=[id,...S.history.filter(x=>x!==id)].slice(0,10);persist();renderFilters();log('Фильтр: '+byId(id).name+'.');window.P26FLOOR?.refresh();return true;}
  function renderSearch(){const q=$('#customSearch').value.toLowerCase().trim().replace(/^minecraft:/,'');$('#customSuggestions').innerHTML=ITEMS.filter(x=>x.id.includes(q)||x.name.toLowerCase().includes(q)).slice(0,6).map(x=>`<button type="button" data-item="${x.id}">${esc(x.name)}</button>`).join('');$('#customHistory').innerHTML=S.history.map(id=>`<button type="button" data-item="${id}">↶ ${esc(byId(id).name)}</button>`).join('');}
  $('#customSearch').addEventListener('input',e=>{const entered=e.target.value;renderSearch();const q=entered.toLowerCase().trim().replace(/^minecraft:/,'');const item=byId(q)||ITEMS.find(x=>x.name.toLowerCase()===q);if(item&&item.id!==S.custom){selectCustom(item.id);e.target.value=entered;renderSearch();}});$('#customSearch').addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();const v=e.target.value.toLowerCase().trim().replace(/^minecraft:/,'');const item=byId(v)||ITEMS.find(x=>x.name.toLowerCase()===v);if(!item)log('Такого образца здесь нет. Выбери предмет из подсказок.');else selectCustom(item.id);});
  $('#customPicker').addEventListener('click',e=>{const b=e.target.closest('[data-item]');if(b)selectCustom(b.dataset.item);});
  function renderBag(){
    const r=$('#rowRange'),max=Math.max(0,Math.ceil(capacity()/9)-3);r.max=max;r.value=Math.min(+r.value,max);const first=+r.value*9;
    $('#slots').innerHTML=Array.from({length:27},(_,i)=>{const index=first+i,x=S.inventory[index];return index>=capacity()?'<span class="slot locked" aria-label="Слот не открыт"></span>':`<button type="button" class="slot ${x?'filled':'empty'}" data-slot="${index}" ${x?'':'disabled'} aria-label="${x?esc(byId(x.id).name)+' ×'+x.n:'Пустая ячейка '+(index+1)}" title="${x?esc(byId(x.id).name)+' ×'+x.n:'Пусто'}">${x?`<img src="${icon(x.id)}" alt=""><em>${x.n}</em>`:`<span>${index+1}</span>`}</button>`;}).join('');
    $('#vaultRows').textContent=`${first+1}–${Math.min(first+27,capacity())} / ${capacity()}`;$('#rowPrev').disabled=+r.value===0;$('#rowNext').disabled=+r.value===max;
  }
  function moveRows(delta){const r=$('#rowRange');r.value=clamp(+r.value+delta,0,+r.max);renderBag();}
  $('#rowRange').addEventListener('input',renderBag);$('#rowPrev').addEventListener('click',()=>moveRows(-1));$('#rowNext').addEventListener('click',()=>moveRows(1));
  $('#slots').addEventListener('wheel',e=>{if(+$('#rowRange').max){e.preventDefault();moveRows(e.deltaY>0?1:-1);}},{passive:false});
  function takeSlot(i){if(transfer)return;const stack=S.inventory[i];if(!stack)return;S.playerCount+=stack.n;S.inventory.splice(i,1);persist();renderBag();renderStats();log('В карманы: '+byId(stack.id).name+' ×'+stack.n+'.');}
  $('#slots').addEventListener('click',e=>{const b=e.target.closest('[data-slot]');if(b)takeSlot(+b.dataset.slot);});
  $('#transferBtn').addEventListener('click',()=>{
    if(transfer||!S.inventory.length){if(!transfer)log('Здесь пока пусто. Собери что-нибудь с пола.');return;}
    const total=S.inventory.length;let done=0;$('#transferBtn').disabled=true;
    transfer=setInterval(()=>{const stack=S.inventory.shift();if(stack){S.playerCount+=stack.n;done++;$('#transferBar').style.width=done/total*100+'%';persist();renderBag();renderStats();}if(!S.inventory.length){clearInterval(transfer);transfer=null;$('#transferBtn').disabled=false;$('#transferBar').style.width='0';log('Всё забрано. По одному слоту за тик, как в моде.');}},50);
  });
  $('#upgradeBtn').addEventListener('click',()=>{if(S.upgrades>=15)return;ensureItem();S.upgrades++;persist();renderBag();renderStats();log('Сундук установлен. Теперь '+capacity()+' ячеек.');});
  document.querySelectorAll('[data-specimen]').forEach(b=>b.addEventListener('click',()=>{
    if(transfer){log('Подожди окончания переноса.');return;}if(S.exemplar===b.dataset.specimen)return;stop();persist();Object.assign(S,structuredClone(S.specimens[b.dataset.specimen]));S.exemplar=b.dataset.specimen;$('#rowRange').value=0;persist();renderAll();window.P26FLOOR?.refresh();log('Экземпляр '+(S.exemplar==='A'?'А':'Б')+'. Его собственные настройки и содержимое.');
  }));
  function renderEnchantment(){$('#enchantButtons').innerHTML=[0,1,2,3].map(n=>`<button type="button" data-level="${n}" aria-pressed="${S.enchant===n}">${['—','I','II','III'][n]}</button>`).join('');}
  $('#enchantButtons').addEventListener('click',e=>{const b=e.target.closest('[data-level]');if(!b)return;S.enchant=+b.dataset.level;ensureItem();if(S.enchant===3)adv.grant('airuhan_3');persist();renderEnchantment();renderStats();log('Воздухан '+['без чар','I','II','III'][S.enchant]+': дальность '+range()+' блоков.');});
  $('#airTest').addEventListener('click',()=>{clearTimeout(airTimer);$('#airDemo').classList.remove('blowing');void $('#airDemo').offsetWidth;$('#airDemo').classList.add('blowing');airTimer=setTimeout(()=>$('#airDemo').classList.toggle('blowing',S.active),1900);});
  function renderTimer(){const n=Math.floor(S.maxSecs);$('#timerReadout').textContent=String(n).padStart(2,'0');$('#timerRing').style.setProperty('--progress',Math.min(100,S.maxSecs/60*100)+'%');$('#timerStatus').textContent=adv.has('max_power_60s')?'Испытание уже пройдено. Можешь повторить ради порядка.':S.active&&S.power===10?'Идёт непрерывный поток. Не отпускай и не снижай силу.':'Пауза сбрасывает отсчёт. Скрытая вкладка останавливает поток.';}
  let last=performance.now();setInterval(()=>{const t=performance.now(),dt=Math.min(.15,(t-last)/1000);last=t;if(S.active&&S.power===10&&!document.hidden){S.maxSecs=Math.min(60,S.maxSecs+dt);if(S.maxSecs>=60)adv.grant('max_power_60s');renderTimer();}syncAudio();},50);
  $('#startMinute').addEventListener('click',()=>{setPower(10);$('#cleanup').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});log('Сила 10. Теперь зажми поток на 60 секунд; можно зафиксировать кнопку.');});
  const ingredients={T:['dropper','Выбрасыватель'],B:['bamboo','Бамбук'],C:['chest','Сундук'],V:['hopper','Воронка']},pattern='TB  C  BV',grid=Array(9).fill('');let material='T';
  function renderRecipe(){
    const correct=grid.every((c,i)=>c===(pattern[i]===' '?'':pattern[i]));
    $('#recipeGrid').innerHTML=grid.map((c,i)=>`<button type="button" class="craft-cell ${c?(c===pattern[i]?'correct':'wrong'):''}" data-cell="${i}" aria-label="Клетка ${i+1}${c?': '+ingredients[c][1]:', пусто'}">${c?`<img src="${icon(ingredients[c][0])}" alt="">`:`<span>${i+1}</span>`}</button>`).join('');
    $('#materials').innerHTML=Object.entries(ingredients).map(([key,[id,label]])=>`<button type="button" class="mat-btn" data-material="${key}" aria-pressed="${key===material}"><img src="${icon(id)}" alt=""><span>${label}</span><small>×${key==='B'?2:1}</small></button>`).join('');
    $('#craftBtn').classList.toggle('ready',correct);$('#craftBtn').setAttribute('aria-disabled',String(!correct));$('#recipeStatus').textContent=correct?'Можно забирать!':'Сначала собери рецепт';
  }
  $('#materials').addEventListener('click',e=>{const b=e.target.closest('[data-material]');if(b){material=b.dataset.material;renderRecipe();}});$('#recipeGrid').addEventListener('click',e=>{const b=e.target.closest('[data-cell]');if(b){const i=+b.dataset.cell;grid[i]=grid[i]===material?'':material;renderRecipe();}});
  $('#autoRecipe').addEventListener('click',()=>{[...pattern].forEach((c,i)=>grid[i]=c===' '?'':c);renderRecipe();});$('#clearRecipe').addEventListener('click',()=>{grid.fill('');renderRecipe();});
  $('#craftBtn').addEventListener('click',()=>{if(!grid.every((c,i)=>c===(pattern[i]===' '?'':pattern[i]))){$('#recipeStatus').textContent='Не хватает деталей. Загляни в схему.';return;}ensureItem();persist();$('#recipeStatus').textContent='Пылесос твой. Пойдём убираться?';log('Пылесос собран. Батарейка не понадобится.');});
  function renderAll(){renderFilters();renderStats();renderBag();renderEnchantment();renderTimer();document.querySelectorAll('[data-specimen]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.specimen===S.exemplar)));}
  window.P26APP={state:S,items:ITEMS,byId,icon,matches,range,capacity,free,insert,hold,stop,setPower,log,renderStats};
  renderAll();renderRecipe();
  // Original GeckoLib model; ornament motion pauses out of view and respects reduced motion.
  const cv=$('#heroModel'),gpu=window.ZMGeo?.supported();
  if(!gpu)cv.hidden=true;
  if(gpu)try{
    const model=ZMGeo.create(cv,{geo:ZM.P26G.geo,anim:ZM.P26G.anim,tex:ZM.tex(T+'vacuum.png'),nearest:true,lit:.65,idle:'idle',exclusive:true,cam:{yaw:33,pitch:20,dist:35,target:[0,3,0],fov:41}});
    if(!model)cv.hidden=true;
    if(model){const tex=new Image();tex.onload=()=>$('#heroVisual').classList.add('model-ready');tex.src=T+'vacuum.png';let seen=true,old=0,drag=null;new IntersectionObserver(es=>seen=es[0].isIntersecting).observe(cv);
      cv.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;drag={x:e.clientX,y:e.clientY,yaw:model.cam.yaw,pitch:model.cam.pitch};cv.setPointerCapture(e.pointerId);});cv.addEventListener('pointermove',e=>{if(drag){model.cam.yaw=drag.yaw+(e.clientX-drag.x)*.5;model.cam.pitch=clamp(drag.pitch+(e.clientY-drag.y)*.25,-15,55);}});['pointerup','pointercancel'].forEach(n=>cv.addEventListener(n,()=>drag=null));cv.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();model.cam.yaw+=e.key==='ArrowLeft'?-12:12;}});
      function frame(t){requestAnimationFrame(frame);if(t-old<45)return;const dt=Math.min(.07,(t-old)/1000);old=t;if(!seen||document.hidden)return;const running=S.active||preview;if(running&&model.st.act!=='suck')model.play('suck');else if(!running&&model.st.act)model.stop();if(!reduced.matches)model.tick(dt);model.render();}requestAnimationFrame(frame);
    }
  }catch(e){cv.hidden=true;console.warn('Vacuum model fallback',e);}
})();
