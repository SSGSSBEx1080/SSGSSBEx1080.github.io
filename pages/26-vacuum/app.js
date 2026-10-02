/* №26 · ПЫЛЕСОС — полевой стенд и локальная модель механик из оригинального Java-кода. */
(() => {
  'use strict';
  const $ = ZM.$, esc = ZM.esc, K = ZM.kit;
  const T = '../../assets/textures/p26/';
  const icon = (id) => id === 'vacuum_icon' ? T + 'vacuum_icon.png' : T + 'v/' + id + '.png';
  const ITEMS = [
    ['diamond','Алмаз','ore'],['coal','Уголь','ore'],['raw_iron','Сырое железо','ore'],['emerald','Изумруд','ore'],['copper_ingot','Медь','ore'],['iron_ingot','Железо','ore'],['raw_gold','Сырое золото','ore'],
    ['stone','Камень','block'],['cobblestone','Булыжник','block'],['dirt','Земля','block'],['oak_log','Дуб','block'],
    ['apple','Яблоко','food'],['bread','Хлеб','food'],['carrot','Морковь','food'],['potato','Картофель','food'],['wheat','Пшеница','wheat'],
    ['dropper','Выбрасыватель','misc'],['feather','Перо','misc'],['stick','Палка','misc'],['arrow','Стрела','misc'],['redstone','Редстоун','misc'],['chest','Сундук','misc'],['hopper','Воронка','misc'],['anvil','Наковальня','misc'],['enchanted_book','Книга чар','misc']
  ].map(([id,name,category]) => ({id,name,category}));
  const byId = id => ITEMS.find(x=>x.id===id);
  const MODES = [ ['ores','Руды','◈'],['blocks','Блоки','▦'],['food','Еда','♨'],['misc','Прочее','✳'],['custom','Один предмет','⌕'] ];
  const defaults = {power:5,mode:'ores',custom:'diamond',history:[],upgrades:0,enchant:0,inventory:[],caught:0,playerCount:0,crafted:false};
  const saved = ZM.store.get('p26.lab', {});
  const S = Object.assign({},defaults,saved,{active:false,maxSecs:0});
  S.inventory = Array.isArray(S.inventory) ? S.inventory.filter(x=>byId(x.id)&&x.n>0).slice(0,177) : [];
  S.power = Math.min(10,Math.max(1,+S.power||1)); S.upgrades=Math.min(15,Math.max(0,+S.upgrades||0)); S.enchant=Math.min(3,Math.max(0,+S.enchant||0));
  S.mode=MODES.some(x=>x[0]===S.mode)?S.mode:'ores'; S.history=Array.isArray(S.history)?S.history.slice(0,10):[];
  const specimenKeys=['power','mode','custom','history','upgrades','enchant','inventory','caught'];
  const snapshot=()=>Object.fromEntries(specimenKeys.map(k=>[k,structuredClone(S[k])]));
  S.exemplar=S.exemplar==='B'?'B':'A';
  S.specimens=S.specimens&&S.specimens.A&&S.specimens.B?S.specimens:{A:snapshot(),B:Object.fromEntries(specimenKeys.map(k=>[k,structuredClone(defaults[k])]))};
  const persist=()=>{S.specimens[S.exemplar]=snapshot();ZM.store.set('p26.lab',Object.fromEntries([...specimenKeys,'playerCount','crafted','exemplar','specimens'].map(k=>[k,S[k]])));};
  const capacity=()=>27+S.upgrades*10;
  const used=()=>S.inventory.length;
  const free=()=>capacity()-used();
  const range=()=>S.power+5*S.enchant;
  const matches=(item)=>{
    const c=item.category;
    if(S.mode==='ores')return c==='ore';
    if(S.mode==='blocks')return c==='block';
    if(S.mode==='food')return c==='food'||c==='wheat';
    // Java-код MISC проверяет isEdible, isSolidNonBlockEntity и isOreLike;
    // пшеница не isEdible, поэтому совпадает и с FOOD, и с MISC.
    if(S.mode==='misc')return c==='misc'||c==='wheat';
    return item.id===S.custom;
  };
  const log=(text)=>{$('#labLog').textContent='> '+text;};
  const fmt=n=>String(n).padStart(2,'0');
  const adv=K.adv({list:ZM.P26.advancements,store:'p26.adv',icon:a=>icon(a.icon),intro:'Сначала получи пылесос. Следующие достижения откроются за удержание максимальной мощности и чары «Воздухан» III.'});
  K.finNav(26,$('#finNav'));
  function renderStats(){
    $('#powerNumber').textContent=fmt(S.power);$('#powerRange').value=S.power;$('#powerRange').style.setProperty('--fill',((S.power-1)/9*100)+'%');
    $('#labRange').textContent=fmt(range());$('#labCaught').textContent=fmt(S.caught);$('#labFree').textContent=fmt(free());
    $('#capacityBig').textContent=String(capacity()).padStart(3,'0');$('#vaultCap').textContent=capacity();
    $('#upgradeCount').textContent=fmt(S.upgrades);$('#chestsLeft').textContent=S.upgrades<15?`Доступно ${15-S.upgrades} сундуков в демонстрации`:'Достигнут предел: 177 ячеек';
    $('#upgradeBtn').disabled=S.upgrades>=15;
    $('#upgradeTicks').innerHTML=Array.from({length:15},(_,i)=>`<span class="${i<S.upgrades?'on':''}"></span>`).join('');
    $('#enchantRadius').textContent=fmt(range());$('#jetStrength').textContent=fmt(S.enchant);
    $('#playerItems').textContent=S.playerCount?S.playerCount+' ПРЕДМЕТОВ':'ПУСТО';
    const maxRow=Math.max(0,Math.ceil(capacity()/9)-3);$('#rowRange').max=maxRow;
    if(+$('#rowRange').value>maxRow)$('#rowRange').value=maxRow;
    $('#stageStatus').textContent=S.active?`ПОТОК АКТИВЕН / ${MODES.find(m=>m[0]===S.mode)[1].toUpperCase()} / R=${range()}`:'ОЖИДАНИЕ / МОЖНО ВКЛЮЧАТЬ ПОТОК';
    $('#suckLabel').textContent=S.active?'ОСТАНОВИТЬ ПОТОК':'ВКЛЮЧИТЬ ПОТОК';$('#suckBtn').classList.toggle('on',S.active);$('#suckBtn').setAttribute('aria-pressed',String(S.active));
    $('#jetTarget').style.left=(S.active?Math.max(4,14-S.enchant*3):14)+'%';$('#jetTarget').parentElement.classList.toggle('working',S.active);
    updateFacts();
  }
  function renderFilters(){
    $('#filters').innerHTML=MODES.map(([id,title,glyph])=>`<button type="button" class="filter-btn ${S.mode===id?'active':''}" data-mode="${id}" aria-pressed="${S.mode===id}"><i>${glyph}</i><span>${title}</span>${id==='misc'?'<small class="asterisk">* JAVA</small>':''}</button>`).join('');
    $('#filterId').textContent=S.mode.toUpperCase();$('#customPicker').hidden=S.mode!=='custom';
    $('#customSearch').value='minecraft:'+S.custom;renderSearch();
  }
  function renderSearch(){
    const q=$('#customSearch').value.toLowerCase().trim().replace(/^minecraft:/,'');
    $('#customSuggestions').innerHTML=ITEMS.filter(x=>x.id.includes(q)||x.name.toLowerCase().includes(q)).slice(0,5).map(x=>`<button type="button" data-id="${x.id}">${esc(x.name)} · ${x.id}</button>`).join('');
    $('#customHistory').innerHTML=S.history.map(id=>`<button type="button" data-id="${esc(id)}" title="Недавний выбор">↶ ${esc(id)}</button>`).join('');
  }
  function selectCustom(id){if(!byId(id))return false;S.custom=id;S.mode='custom';S.history=[id,...S.history.filter(x=>x!==id)].slice(0,10);persist();renderFilters();log('Фильтр установлен: minecraft:'+id);return true;}
  $('#filters').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(!b)return;S.mode=b.dataset.mode;persist();renderFilters();renderStats();log(`Режим «${MODES.find(m=>m[0]===S.mode)[1]}» установлен.`);});
  $('#customSearch').addEventListener('input',renderSearch);
  $('#customSearch').addEventListener('keydown',e=>{if(e.key!=='Enter')return;const v=e.target.value.trim().toLowerCase().replace(/^minecraft:/,'');if(!selectCustom(v))log('Для демонстрации выбери один из предметов в подсказках.');});
  $('#customPicker').addEventListener('click',e=>{let b=e.target.closest('[data-id]');if(b)selectCustom(b.dataset.id);});
  function setPower(n){n=Math.max(1,Math.min(10,Math.round(n)));if(S.power===n)return;S.power=n;if(n!==10)resetTimer();persist();renderStats();log(`Сила: ${n}/10 · дальность: ${range()} блоков.`);}
  $('#powerRange').addEventListener('input',e=>setPower(+e.target.value));
  $('#powerScale').innerHTML=Array.from({length:10},(_,i)=>`<span>${i+1}</span>`).join('');
  $('#chamber').addEventListener('wheel',e=>{if(e.target.closest('.chamber-canvas')){e.preventDefault();setPower(S.power+(e.deltaY<0?1:-1));}},{passive:false});
  let audio=$('#vacuumAudio');audio.volume=.28;
  const syncAudio=()=>{if(S.active&&$('#soundOn').checked){audio.play().catch(()=>{log('Звук доступен после нажатия кнопки потока.');});}else{audio.pause();audio.currentTime=0;}};
  function toggleSuction(force){S.active=typeof force==='boolean'?force:!S.active;if(!S.active)resetTimer();syncAudio();window.P26CHAMBER?.setActive(S.active);renderStats();log(S.active?'Поток включён. Подходящие предметы втягиваются в хранилище.':'Поток остановлен. Предметы больше не движутся.');}
  $('#suckBtn').addEventListener('click',()=>toggleSuction());$('#soundOn').addEventListener('change',syncAudio);
  $('#spawnBtn').addEventListener('click',()=>{window.P26CHAMBER?.spawn(18);log('В камеру добавлена смешанная партия предметов.');});
  function resetTimer(){S.maxSecs=0;renderTimer();}
  function renderTimer(){const t=S.maxSecs;$('#factTimer').textContent=fmt(Math.floor(t));$('#factTimerRing').style.setProperty('--progress',(Math.min(t,60)/60*100)+'%');$('#timerReadout').innerHTML=`${fmt(Math.floor(t/60))}:${fmt(Math.floor(t%60))} <small>/ 01:00</small>`;$('#timerBar').style.width=Math.min(100,t/60*100)+'%';}
  let last=performance.now();setInterval(()=>{const now=performance.now(),dt=Math.min((now-last)/1000,.25);last=now;if(S.active&&S.power===10&&document.visibilityState==='visible'&&!adv.has('max_power_60s')){S.maxSecs=Math.min(60,S.maxSecs+dt);renderTimer();if(S.maxSecs>=60){adv.grant('max_power_60s');log('60 секунд непрерывно! Достижение «Сосёт как твоя ****» получено.');}}},100);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&S.active)toggleSuction(false);});
  // Хранилище: стеки сливаются до 64, затем свободная ячейка. Сортировка — по ID;
  // в моде второй ключ NBT, в этом стенде NBT у тестовых предметов нет.
  function insert(id,count=1){const item=byId(id);if(!item)return 0;let left=count;
    for(const stack of S.inventory.filter(x=>x.id===id)){const n=Math.min(left,64-stack.n);stack.n+=n;left-=n;if(!left)break;}
    while(left>0&&S.inventory.length<capacity()){let n=Math.min(64,left);S.inventory.push({id,n});left-=n;}
    S.inventory.sort((a,b)=>a.id.localeCompare(b.id,'en'));const taken=count-left;
    if(taken){S.caught+=taken;persist();renderStorage();renderStats();}
    return taken;
  }
  function renderStorage(){const row=+$('#rowRange').value||0,maxRow=Math.max(0,Math.ceil(capacity()/9)-3);$('#rowRange').value=Math.min(row,maxRow);const first=+$('#rowRange').value*9;
    $('#slots').innerHTML=Array.from({length:27},(_,i)=>{const n=first+i,slot=S.inventory[n];return n>=capacity()?`<span class="slot locked" role="gridcell" title="Закрыто"><span class="slot-index">×</span></span>`:slot?`<span class="slot" role="gridcell" title="${esc(byId(slot.id)?.name)} ×${slot.n}"><img src="${icon(slot.id)}" alt="${esc(byId(slot.id)?.name)}"><em>${slot.n}</em></span>`:`<span class="slot empty" role="gridcell" title="Ячейка ${n+1}"><span class="slot-index">${String(n+1).padStart(2,'0')}</span></span>`;}).join('');
    $('#vaultRows').textContent=`РЯДЫ ${fmt(+$('#rowRange').value+1)}–${fmt(+$('#rowRange').value+3)} / ${fmt(maxRow+3)}`;$('#rowPrev').disabled=+$('#rowRange').value===0;$('#rowNext').disabled=+$('#rowRange').value===maxRow;
  }
  $('#rowRange').addEventListener('input',renderStorage);$('#rowPrev').onclick=()=>{let r=$('#rowRange');r.value=Math.max(0,+r.value-1);renderStorage();};$('#rowNext').onclick=()=>{let r=$('#rowRange');r.value=Math.min(+r.max,+r.value+1);renderStorage();};
  $('#slots').addEventListener('wheel',e=>{e.preventDefault();let r=$('#rowRange');r.value=Math.max(0,Math.min(+r.max,+r.value+(e.deltaY>0?1:-1)));renderStorage();},{passive:false});
  $('#upgradeBtn').addEventListener('click',()=>{if(S.upgrades>=15)return;S.upgrades++;persist();renderStats();renderStorage();log(`Сундук установлен. Новая ёмкость — ${capacity()} ячеек.`);});
  function switchSpecimen(target){if(target===S.exemplar||transferTimer)return;if(S.active)toggleSuction(false);persist();
    for(const k of specimenKeys)S[k]=structuredClone(S.specimens[target][k]);S.exemplar=target;resetTimer();persist();renderFilters();renderEnchantment();renderStats();renderStorage();
    $('#vaultCaseTitle').textContent=target==='A'?'А':'Б';document.querySelectorAll('[data-specimen]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.specimen===target)));
    log(`Экземпляр ${target==='A'?'А':'Б'}: собственное хранилище, настройки и история предметов.`);
  }
  document.querySelector('.specimen-switch').addEventListener('click',e=>{const b=e.target.closest('[data-specimen]');if(b)switchSpecimen(b.dataset.specimen);});
  $('#vaultCaseTitle').textContent=S.exemplar==='A'?'А':'Б';document.querySelectorAll('[data-specimen]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.specimen===S.exemplar)));

  let transferTimer=null;
  $('#transferBtn').addEventListener('click',()=>{if(transferTimer)return;if(!S.inventory.length){log('Хранилище пусто. Засыпь предметы в лаборатории.');return;}const total=S.inventory.length;let done=0;$('#transferBtn').disabled=true;$('#transferBtn').textContent='ПЕРЕНОС...';
    transferTimer=setInterval(()=>{if(!S.inventory.length){clearInterval(transferTimer);transferTimer=null;$('#transferBtn').disabled=false;$('#transferBtn').textContent='ЗАБРАТЬ ВСЁ';$('#transferBar').style.width='0';log(`Перенесено ${done} стаков в инвентарь игрока. Один слот за тик.`);persist();renderStats();return;}
      const stack=S.inventory.shift();S.playerCount+=stack.n;done++;$('#transferBar').style.width=(done/total*100)+'%';persist();renderStorage();renderStats();},50);
  });
  // Рецепт фигурный: TB / C / BV. Грид редактируется отдельно от книги рецептов.
  const key={T:{id:'dropper',name:'Выбрасыватель'},B:{id:'bamboo',name:'Бамбук'},C:{id:'chest',name:'Сундук'},V:{id:'hopper',name:'Воронка'}};
  const recipe='TB  C  BV'.replace(/ /g,' '); // 9 клеток: 'TB ' + ' C ' + ' BV'
  const grid=Array(9).fill('');let material='T';
  function renderRecipe(){const correct=grid.every((c,i)=>c===(recipe[i]===' '?'':recipe[i]));$('#recipeGrid').innerHTML=grid.map((c,i)=>`<button class="craft-cell ${c?(c===recipe[i]?'correct':'wrong'):''}" type="button" data-index="${i}" title="Клетка ${i+1}${c?': '+key[c].name:''}" aria-label="Клетка ${i+1}${c?': '+key[c].name:''}">${c?`<img src="${icon(key[c].id)}" alt="${key[c].name}">`:`<span>${i+1}</span>`}</button>`).join('');
    $('#materials').innerHTML=Object.entries(key).map(([k,v])=>`<button class="mat-btn ${material===k?'selected':''}" type="button" data-mat="${k}" aria-pressed="${material===k}"><img src="${icon(v.id)}" alt=""><span>${v.name}</span><small>${k==='B'?'× 2':'× 1'}</small></button>`).join('');
    $('#craftBtn').classList.toggle('ready',correct);$('#craftBtn').setAttribute('aria-disabled',String(!correct));$('#recipeStatus').textContent=correct?'СХЕМА ВЕРНА / НАЖМИ НА ПЫЛЕСОС':grid.some(Boolean)?'ПРОВЕРЬ РАСПОЛОЖЕНИЕ ДЕТАЛЕЙ':'РАССТАВЬ ПРЕДМЕТЫ В СЕТКЕ';
  }
  $('#materials').addEventListener('click',e=>{const b=e.target.closest('[data-mat]');if(b){material=b.dataset.mat;renderRecipe();}});
  $('#recipeGrid').addEventListener('click',e=>{const b=e.target.closest('[data-index]');if(!b)return;const i=+b.dataset.index;grid[i]=grid[i]===material?'':material;renderRecipe();});
  $('#autoRecipe').onclick=()=>{[...recipe].forEach((c,i)=>grid[i]=c===' '?'':c);renderRecipe();};
  $('#clearRecipe').onclick=()=>{grid.fill('');renderRecipe();};
  $('#craftBtn').onclick=()=>{if(!grid.every((c,i)=>c===(recipe[i]===' '?'':recipe[i]))){$('#recipeStatus').textContent='СНАЧАЛА СОБЕРИ РЕЦЕПТ';return;}S.crafted=true;persist();adv.grant('crafted');$('#recipeStatus').textContent='ГОТОВО / ПЫЛЕСОС ПОЛУЧЕН';log('Пылесос собран: +10 XP, достижение открыто.');};
  $('#enchantButtons').addEventListener('click',e=>{const b=e.target.closest('[data-level]');if(!b)return;S.enchant=+b.dataset.level;persist();renderEnchantment();renderStats();if(S.enchant===3){adv.grant('airuhan_3');}log(`«Воздухан» ${S.enchant?['','I','II','III'][S.enchant]:'снят'}: дальность ${range()}, задний поток ${S.enchant?S.enchant+1:1}× базы.`);});
  function renderEnchantment(){$('#enchantButtons').innerHTML=[0,1,2,3].map(i=>`<button type="button" data-level="${i}" class="${S.enchant===i?'active':''}" aria-pressed="${S.enchant===i}">${['—','I','II','III'][i]}</button>`).join('');}
  const plants=Array(12).fill(true);
  function renderFarm(){const ripe=plants.filter(Boolean).length;$('#cropCounter').textContent=`${ripe} / 12 ЗРЕЛЫХ`;$('#farmGrid').innerHTML=plants.map((on,i)=>`<div class="crop ${on?'':'sprout'}" title="${on?'Зрелая пшеница':'Молодой росток'}" aria-label="Растение ${i+1}: ${on?'зрелое':'молодое'}">${on?'<img src="'+icon('wheat')+'" alt="">':''}</div>`).join('');}
  $('#harvestBtn').onclick=()=>{if(S.mode!=='food'||!S.active){$('#farmMessage').textContent='Сначала включи поток и выбери режим «Еда» в лаборатории.';log('Урожай собирается только активным пылесосом с фильтром «Еда».');return;}
    const amount=plants.filter(Boolean).length;if(!amount){$('#farmMessage').textContent='Грядка уже срезана. Ростки подрастут автоматически.';return;}plants.fill(false);renderFarm();const collected=insert('wheat',amount);$('#farmMessage').textContent=`Срезано ${amount} зрелых растений, восстановлен начальный рост. Пшеница в хранилище: +${collected}.`;log(`Собрано ${amount} растений. Молодые ростки посажены заново.`);setTimeout(()=>{plants.fill(true);renderFarm();},7500);
  };
  // Шесть опытов используют ТО ЖЕ состояние предмета и те же кнопки, что лаборатория.
  const factLoot=['diamond','bread','feather','stone','wheat'];
  function updateFacts(){
    const accepted=factLoot.filter(id=>matches(byId(id)));
    $('#factLoot').innerHTML=factLoot.map(id=>`<span class="${accepted.includes(id)?'pass':'reject'}" title="${esc(byId(id).name)}"><img src="${icon(id)}" alt="${esc(byId(id).name)}"></span>`).join('');
    $('#factLootResult').textContent=`Фильтр «${MODES.find(m=>m[0]===S.mode)[1]}»: ${accepted.map(id=>byId(id).name.toLowerCase()).join(', ')||'ничего из показанного'}.`;
    $('#factCapacity').textContent=capacity();$('#factChestResult').textContent=S.upgrades>=15?'Предел: 15 сундуков, 177 ячеек.':`Улучшений: ${S.upgrades}/15 · свободных ячеек: ${free()}.`;
    $('#factAddChest').disabled=S.upgrades===15;
    $('#factAirScene').classList.toggle('blasting',S.active&&S.enchant>0);
    $('#factSpecResult').textContent=`Экземпляр ${S.exemplar==='A'?'А':'Б'}: ${used()} занятых ячеек · сила ${S.power}/10.`;
    document.querySelectorAll('[data-fact-specimen]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.factSpecimen===S.exemplar)));
    document.querySelectorAll('[data-fact-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.factFilter===S.mode)));
    $('#factStartTimer').textContent=S.active&&S.power===10?'ИСПЫТАНИЕ ИДЁТ':'НАЧАТЬ ИСПЫТАНИЕ';
  }
  $('#notes').addEventListener('click',e=>{
    const filter=e.target.closest('[data-fact-filter]');if(filter){$('#filters [data-mode="'+filter.dataset.factFilter+'"]').click();return;}
    const wheat=e.target.closest('[data-fact-wheat]');if(wheat){$('#filters [data-mode="'+wheat.dataset.factWheat+'"]').click();$('#factWheatResult').textContent=`Да! В режиме «${wheat.dataset.factWheat==='food'?'Еда':'Прочее'}» пшеница тоже попадает внутрь.`;document.querySelectorAll('[data-fact-wheat]').forEach(b=>b.setAttribute('aria-pressed',String(b===wheat)));return;}
    const specimen=e.target.closest('[data-fact-specimen]');if(specimen){document.querySelector('.specimen-switch [data-specimen="'+specimen.dataset.factSpecimen+'"]').click();updateFacts();return;}
  });
  $('#factAddChest').onclick=()=>$('#upgradeBtn').click();
  $('#factBlast').onclick=()=>{if(!S.enchant)$('#enchantButtons [data-level="1"]').click();if(!S.active)toggleSuction(true);$('#factBlastResult').textContent=`Воздухан ${['','I','II','III'][S.enchant]}: радиус ${range()} блоков · струя отталкивает зомби.`;updateFacts();};
  $('#factStartTimer').onclick=()=>{if(S.power!==10)setPower(10);if(!S.active)toggleSuction(true);$('#factTimerResult').textContent='Сила 10 · поток включён. Держи его 60 секунд без остановки.';};
  // Публичный мост для независимой WebGL-камеры: без симуляции серверных пакетов.
  window.P26APP={state:S,items:ITEMS,byId,matches,range,capacity,free,insert,log,renderStats};
  renderFilters();renderRecipe();renderFarm();renderEnchantment();renderStats();renderStorage();renderTimer();
  log('Выбери фильтр, запусти поток и засыпь предметы в камеру.');
  // Прогрессивное улучшение: при отключённом WebGL лаборатория остаётся рабочей.
  window.addEventListener('load',()=>setTimeout(()=>{
    if(window.P26CHAMBER)return;
    const field=document.querySelector('.chamber-fallback');let loose=[],running=false;
    const paint=()=>{field.innerHTML='<img class=\"fallback-machine\" src=\"'+T+'vacuum_icon.png\" alt=\"Пылесос\">'+loose.map((x,i)=>'<img class=\"fallback-item\" style=\"left:'+x.x+'%;top:'+x.y+'%\" src=\"'+icon(x.id)+'\" alt=\"'+esc(byId(x.id).name)+'\">').join('');};
    const fallback={fallback:true,get count(){return loose.length},spawn(n=12){for(let i=0;i<n&&loose.length<40;i++)loose.push({id:ITEMS[Math.random()*ITEMS.length|0].id,x:45+Math.random()*43,y:17+Math.random()*70});paint();},setActive(v){running=v}};
    window.P26CHAMBER=fallback;fallback.spawn(17);
    setInterval(()=>{if(!running)return;const i=loose.findIndex(x=>matches(byId(x.id)));if(i<0)return;const x=loose[i];if(insert(x.id,1)){loose.splice(i,1);paint();log(byId(x.id).name+' втянут. Упрощённый режим без WebGL.');}},420);
    log('WebGL недоступен: схема всасывания работает без 3D.');
  },1200));
  // Оригинальная Geo-модель на первом экране. Сквозной canvas не закрывает интерфейс.
  if(window.ZMGeo?.supported()){
    try{const cv=$('#heroModel'), g=ZMGeo.create(cv,{geo:ZM.P26G.geo,anim:ZM.P26G.anim,tex:T+'vacuum.png',cam:{yaw:33,pitch:19,dist:39,target:[0,4,0],fov:41},nearest:true,lit:.65,idle:'idle',exclusive:true});
      if(g){$('#heroVisual').classList.add('model-ready');const turn=K.spinner(cv,{ry:0,rx:0},55);let was=performance.now(),visible=true;new IntersectionObserver(entries=>{visible=entries[0].isIntersecting}).observe($('#heroVisual'));
        function frame(now){requestAnimationFrame(frame);if(!visible){was=now;return;}let dt=Math.min((now-was)/1000,.07);was=now;g.tick(dt);g.setExtra(g.M.euler([turn.rx,turn.ry+(turn.idle()?Math.sin(now/2800)*5:0),0]));g.render();}requestAnimationFrame(frame);
        $('#heroSpin').onclick=()=>{if(g.st.act){g.stop();$('#heroSpin').textContent='АНИМАЦИЯ: ВЫКЛ';$('#heroVisual').classList.remove('model-pumping');$('#heroSpin').setAttribute('aria-pressed','false');}else{g.play('suck');$('#heroSpin').textContent='АНИМАЦИЯ: ВКЛ';$('#heroVisual').classList.add('model-pumping');$('#heroSpin').setAttribute('aria-pressed','true');}};
      }
    }catch(e){console.warn('[P26] fallback hero',e);}
  }
  if(window.ZM?.reveal)ZM.reveal();
})();