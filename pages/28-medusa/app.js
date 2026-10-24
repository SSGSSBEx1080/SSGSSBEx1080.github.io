(()=>{
 'use strict';
 const {$,$$,esc}=ZM,K=ZM.kit,C=P28Core,store='p28.lab',fmt=(n,d=1)=>Number(n).toLocaleString('ru-RU',{minimumFractionDigits:d,maximumFractionDigits:d});
 ZM.topbar({crumb:'№28 · Медуза',...ZM.pointNav(28)});K.finNav(28,$('#finNav'));
  K.timeline($('#tl'), [
    { date: '17.08.2026', ver: '1.1.8', t: 'Медуза', d: 'Пункт №28 — Медуза из аниме «Доктор Стоун»: окаменение, наука и возвращение к жизни. С этой версией мод вырос до 1.1.8.', c: '#7deebe' },
  ]);
 document.addEventListener('DOMContentLoaded',()=>document.querySelector('.zm-route')?.remove());
 let model=new C.Model(ZM.store.get(store,null)),selected='owner',press=null,feedback='',lastSave=0,lastLog='';
 const armor={none:[0,0],iron:[15,0],diamond:[20,8],netherite:[20,12]};
 const adv=K.adv({list:ZM.P28.advancements,store:'p28.adv',icon:a=>'../../assets/textures/p28/i/'+a.icon+'.png',intro:'Названия, условия, родители и 175 XP — из исходных JSON мода.',onGrant:a=>{P28Sound.play(a.key);window.P28?.scene?.reward?.(a.key);}});
 const portrait=e=>e.kind==='zombieVillager'?'../../assets/textures/p28/i/zombie_villager_face.png':'../../assets/textures/hub/av/'+(e.kind==='player'?'steve':e.kind==='villager'?'villager':'zombie')+'.png';
 const patient=()=>model.state.entities.find(e=>e.id===selected)||model.owner;
 const persist=()=>{ZM.store.set(store,model.snapshot());lastSave=performance.now();};
 function report(text){feedback=text;$('#actionHint').textContent=text;}
 function consume(){for(const event of model.drain()){
   if(event.type==='adv')adv.grant(event.key);
   if(event.type==='wave'||event.type==='bounce')P28Sound.play(event.type);
   if(event.type==='heal'&&event.id===selected){const bar=$('.health-bar');bar.classList.remove('healed');void bar.offsetWidth;bar.classList.add('healed');}
   window.P28?.scene?.event?.(event);
  }}
 function action(fn,message){const ok=fn();if(!ok&&message)report(message);else feedback='';consume();render();persist();return ok;}
 function controls(){const e=patient();$('#xpRange').value=e.xp;$('#mobHealth').value=e.maxHP;$('#armorSelect').value=Object.keys(armor).find(key=>armor[key][0]===e.armor&&armor[key][1]===e.toughness)||'none';}
 function select(id){if(!model.state.entities.some(e=>e.id===id))return;selected=id;controls();render();}
 $('#subjectTabs').innerHTML=model.state.entities.map(e=>`<button type="button" data-subject="${e.id}" aria-pressed="${e.id===selected}"><img src="${portrait(e)}" alt=""><span>${esc(e.name)}</span></button>`).join('');
 $('#subjectTabs').addEventListener('click',event=>{const b=event.target.closest('[data-subject]');if(b)select(b.dataset.subject);});
 function configure(){const i=model.state.item;model.configure(Number($('#radiusInput').value),Number($('#delayInput').value)*20);feedback='';render();persist();}
 for(const [range,input]of[['radiusRange','radiusInput'],['delayRange','delayInput']]){
  $('#'+range).addEventListener('input',event=>{$('#'+input).value=event.target.value;configure();});
  $('#'+input).addEventListener('input',event=>{$('#'+range).value=event.target.value;configure();});
  $('#'+input).addEventListener('change',()=>{const i=model.state.item;$('#radiusInput').value=i.radius;$('#delayInput').value=i.delay/20;});
 }
 $('#scienceLevels').addEventListener('click',event=>{const b=event.target.closest('[data-science]');if(b){model.science(Number(b.dataset.science));feedback='';render();persist();}});
 $('#takeDevice').addEventListener('click',()=>action(()=>model.take()));
 $('#armDevice').addEventListener('click',()=>action(()=>model.arm(),'Запуск недоступен: нужен заряд и живой неокаменевший владелец.'));
 const throwButton=$('#throwDevice');
 function begin(){if(!model.canAct()||press!==null)return;press=model.state.time;feedback='';}
 function release(){if(press===null)return;const used=model.state.time-press;press=null;action(()=>model.throw(used),'Для броска удерживайте кнопку хотя бы 0,15 секунды.');}
 throwButton.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();throwButton.setPointerCapture(event.pointerId);begin();});
 throwButton.addEventListener('pointerup',release);throwButton.addEventListener('pointercancel',()=>press=null);throwButton.addEventListener('lostpointercapture',()=>press=null);throwButton.addEventListener('blur',()=>press=null);
 throwButton.addEventListener('keydown',event=>{if(event.code==='Space'||event.code==='Enter'){event.preventDefault();if(!event.repeat)begin();}});
 throwButton.addEventListener('keyup',event=>{if(event.code==='Space'||event.code==='Enter'){event.preventDefault();release();}});
 $('#pickupDevice').addEventListener('click',()=>action(()=>model.pickup(),'Для подбора нужно дождаться замедления Медузы. Отсчёт при этом продолжается.'));
 $('#rechargeDevice').addEventListener('click',()=>{action(()=>model.recharge(),'Нужны разряженная Медуза в руке, алмаз и один уровень.');controls();});
 $('#skipTime').addEventListener('click',()=>{press=null;model.tick(600);consume();render();persist();});
 $('#resetStand').addEventListener('click',()=>{P28Sound.stop();press=null;model=new C.Model();selected='owner';feedback='';lastLog='';controls();window.P28.scene?.reset?.();render();persist();});
 $('#cameraReset').addEventListener('click',()=>window.P28.scene?.resetCamera?.());
 $('#xpRange').addEventListener('input',event=>{patient().xp=Math.max(0,Math.min(80,Number(event.target.value)));render();persist();});
 $('#armorSelect').addEventListener('change',event=>{[patient().armor,patient().toughness]=armor[event.target.value];render();persist();});
 $('#mobHealth').addEventListener('input',event=>{const e=patient();e.maxHP=Math.max(1,Math.min(1000,Number(event.target.value)||1));e.hp=Math.min(e.hp,e.maxHP);render();persist();});
 const hitReadout=()=>{const e=patient(),kind=$('#toolSelect').value,raw=Math.max(1,Math.min(20,Number($('#rawDamage').value)||4));$('#damageReadout').textContent='×'+fmt(C.toolFactor(kind),2)+' перед бронёй → '+fmt(C.damage(raw,kind,e.armor,e.toughness),2)+' урона образцу.';};
 $('#toolSelect').addEventListener('change',hitReadout);$('#rawDamage').addEventListener('input',hitReadout);
 $('#hitSpecimen').addEventListener('click',()=>{const e=patient(),n=model.hit(e.id,$('#toolSelect').value,Math.max(1,Math.min(20,Number($('#rawDamage').value)||4)));$('#damageFeedback').textContent=n===false?'Цель должна быть окаменевшей.':'Нанесено '+fmt(n,2)+' урона'+(e.alive?'.':'. Образец разрушен.');consume();render();persist();});
 $('#testFire').addEventListener('click',()=>{const n=model.hit(patient().id,'fire');$('#damageFeedback').textContent=n===false?'Огнестойкость проверяется во время окаменения.':'Огонь: 0 урона. Окаменевшая цель не горит.';consume();render();persist();});
 const pattern=['iron_block','redstone_block','iron_block','redstone_block','diamond','redstone_block','iron_block','redstone_block','iron_block'];
 $('#craftGrid').innerHTML=pattern.map(id=>`<div><img src="../../assets/textures/p28/i/${id}.png" alt="${id==='iron_block'?'Железный блок':id==='redstone_block'?'Редстоуновый блок':'Алмаз'}"></div>`).join('');
 $('#craftMedusa').addEventListener('click',()=>{if(!model.state.item.owned&&!model.state.orb)model.take();else adv.grant(C.keys.discovery);consume();$('#craftStatus').textContent='Рецепт: четыре железных и четыре редстоуновых блока, один алмаз. Медуза получена.';render();persist();});
 function render(){
  const s=model.state,i=s.item,o=s.orb,e=patient(),remaining=model.remaining(),isCharged=o?o.charged:i.charged,canAct=model.canAct(),activeWave=s.waves.find(w=>!w.done)||s.waves.at(-1);
  $('#heroRadius').textContent=i.radius;$('#heroDelay').textContent=fmt(i.delay/20);$('#chargeState').textContent=isCharged?'ЗАРЯЖЕНА':'РАЗРЯЖЕНА';$('#chargeState').classList.toggle('spent',!isCharged);
  const max=C.caps[i.science];$('#radiusRange').max=$('#radiusInput').max=max;$('#maxRadius').textContent=max;
  for(const id of ['radiusRange','radiusInput','delayRange','delayInput']){const input=$('#'+id);input.disabled=!!o||(i.owned&&model.owner.stone);if(document.activeElement!==input)input.value=id.startsWith('radius')?i.radius:i.delay/20;}
  $$('#scienceLevels button').forEach(b=>{b.setAttribute('aria-pressed',String(Number(b.dataset.science)===i.science));b.disabled=!!o||i.armed||model.owner.stone;});
  $('#takeDevice').hidden=i.owned||!!o;$('#deviceActions').hidden=!i.owned&&!o;$('#armDevice').hidden=!!o;throwButton.hidden=!!o;$('#pickupDevice').hidden=!o;
  $('#armDevice').disabled=!canAct||!i.charged||i.armed;throwButton.disabled=!canAct;
  $('#pickupDevice').disabled=!o||model.owner.stone||!model.owner.alive||o.age<10||o.vx*o.vx+o.vy*o.vy+o.vz*o.vz>.18;
  if(!canAct)press=null;$('#throwPower').style.transform='scaleX('+(press===null?0:Math.min(1,(s.time-press)/20))+')';
  $('#worldPhase').textContent=!i.owned&&!o?'ПОДГОТОВКА':!model.owner.alive?'ВЛАДЕЛЕЦ ПОГИБ':s.waves.some(w=>!w.done)?'ЗЕЛЁНАЯ ВОЛНА':remaining>0?(o?'ПОЛЁТ / ОТСЧЁТ':'ТАЙМЕР В РУКЕ'):model.owner.stone?'ВЛАДЕЛЕЦ ОКАМЕНЕЛ':isCharged?'ГОТОВА К АКТИВАЦИИ':'ЗАРЯД ИЗРАСХОДОВАН';
  $('#worldLight').classList.toggle('active',remaining>0||!!activeWave);$('#waveRadius').textContent=fmt(activeWave?.current||0);
  $('#clockLabel').textContent=remaining>0?'ДО АКТИВАЦИИ':!isCharged?'ЗАРЯД ИЗРАСХОДОВАН':'ЗАДЕРЖКА';$('#countdown').textContent=fmt(remaining>0?Math.ceil(remaining/2)/10:!isCharged?0:i.delay/20).padStart(4,'0');$('.world-countdown').classList.toggle('armed',remaining>0);
  $('#worldTime').textContent=String(Math.floor(s.time/1200)).padStart(2,'0')+':'+String(Math.floor(s.time/20)%60).padStart(2,'0');
  if(!feedback){$('#actionHint').textContent=P28Sound.state.errors.length?'Для звука нажмите кнопку «Звук».':!model.owner.alive?'Владелец погиб. «Новый стенд» начинает отдельную демонстрацию.':model.owner.stone?'Владелец окаменел: использование предмета заблокировано до освобождения.':o?.charged?'Летит копия настроек. При подборе сохранится прежний срок активации.':o?'Разряженная Медуза остаётся в мире. Её можно подобрать после остановки.':i.armed?'Отсчёт необратим. Изменение задержки не меняет уже назначенный срок.':i.charged?'ЛКМ в игре — настройки. Shift + ПКМ — запуск в руке.': 'Заряд восстанавливается в наковальне: алмаз и один уровень.';}
  const nbt={MedusaCharged:isCharged,MedusaRadius:o?o.radius:i.radius,MedusaDelayTicks:i.delay};if(remaining>0){nbt.MedusaArmed=true;nbt.MedusaDetonateAt=o?o.deadline:i.deadline;}$('#nbtData').textContent=JSON.stringify(nbt,null,2);
  $$('#subjectTabs button').forEach(b=>{const actor=s.entities.find(x=>x.id===b.dataset.subject);b.setAttribute('aria-pressed',String(b.dataset.subject===selected));b.querySelector('span').textContent=actor.name;if(b.querySelector('img').getAttribute('src')!==portrait(actor))b.querySelector('img').src=portrait(actor);});
  if($('#subjectPortrait').getAttribute('src')!==portrait(e))$('#subjectPortrait').src=portrait(e);$('#subjectName').textContent=e.name;$('#subjectType').textContent=e.kind==='player'?'ИГРОК':e.kind==='zombieVillager'?'ЗОМБИ-ЖИТЕЛЬ':e.kind==='villager'?'ЖИТЕЛЬ':'МОБ';
  $('#subjectState').textContent=!e.alive?'РАЗРУШЕН':e.stone?'ОКАМЕНЕЛ':e.cured?'ИЗЛЕЧЕН':'ЖИВОЙ';$('#specimenMonitor').classList.toggle('stone',e.stone);
  $('#subjectHP').textContent=fmt(e.hp,e.hp%1?2:0)+' / '+fmt(e.maxHP,0);$('#healthFill').style.width=(100*e.hp/e.maxHP)+'%';$('#stoneRemaining').textContent=e.stone?fmt(Math.max(0,e.endAt-s.time)/20)+' с':'—';
  $('#stoneStatus').textContent=!e.alive?'Образец разрушен':e.stone?'Управление заблокировано. Гравитация действует.':e.cured?'Окаменение закончилось, зомби-житель излечен.':'Ожидание попадания сферы';
  $('#goodEffects').textContent=e.stone?'Пауза · '+fmt(e.suspended/20,0)+' с':fmt(e.beneficial/20,0)+' с';$('#badEffects').textContent=e.harmful?'Активны · '+fmt(e.harmful/20,0)+' с':'Сняты';
  $('#cureNotice').textContent=e.cured?'Этот зомби-житель стал обычным жителем после освобождения.':'Зомби-житель излечивается при завершении окаменения.';
  $('#playerSettings').hidden=e.kind!=='player';$('#mobSettings').hidden=e.kind==='player';$('#xpValue').textContent=e.xp;
  $('#calculatedDuration').textContent=fmt((e.kind==='player'?C.playerDuration(e.xp,e.armor,e.toughness):C.mobDuration(e.maxHP))/20,2)+' с';
  $('#hitSpecimen').disabled=$('#testFire').disabled=!e.alive||!e.stone;hitReadout();
  $('#materialsReadout').textContent='Материалы стенда: '+s.playerDiamonds+' алмаза · уровень владельца '+model.owner.xp;$('#rechargeDevice').disabled=!canAct||i.charged||s.playerDiamonds<1||model.owner.xp<1;
  $('#rechargeHint').textContent=i.charged?'Устройство уже заряжено. Повторная зарядка не расходует материалы.':o?'Сначала нужно подобрать разряженную Медузу.':model.owner.stone?'Владелец окаменел. Зарядка доступна после освобождения.':'Один алмаз и один уровень. Радиус, задержка и чары сохранятся.';
  const log=JSON.stringify(s.log);if(log!==lastLog){$('#eventLog').innerHTML=s.log.slice(-4).map(x=>`<div><time>${fmt(x.t/20)} с</time>${esc(x.text)}</div>`).join('');lastLog=log;$('#eventLog').scrollTop=$('#eventLog').scrollHeight;}
 }
 window.P28={get model(){return model;},get selected(){return selected;},select,render,consume,persist,scene:null};
 controls();render();persist();
 let last=performance.now(),accum=0;
 setInterval(()=>{const now=performance.now(),dt=Math.min(250,now-last);last=now;if(document.hidden){accum=0;press=null;return;}accum+=dt;const n=Math.floor(accum/50);if(!n)return;accum-=n*50;model.tick(n);consume();render();if(now-lastSave>1000)persist();},25);
 addEventListener('pagehide',persist);

 /* ================= v2: обложка дышит вместе со стендом ================= */
 (function heroSync(){
  if('IntersectionObserver' in window)ZM.reveal();else $$('.reveal').forEach(el=>el.classList.add('in'));
  const mode=$('#hpMode'),value=$('#hpValue'),unit=$('#hpUnit'),led=$('#hpLed'),pulse=$('#heroPulse'),artifact=$('#heroArtifact');
  const fmtT=t=>{const s=Math.max(0,t)/20;return s>=60?Math.floor(s/60)+':'+String(Math.round(s%60)).padStart(2,'0'):fmt(s,1)+' с';};
  function sync(){
   if(!window.P28)return;
   const s=window.P28.model.state,remaining=window.P28.model.remaining(),wave=s.waves.find(w=>!w.done),owner=window.P28.model.owner;
   const armed=remaining>0,active=!!wave;
   document.body.classList.toggle('armed',armed);
   document.body.classList.toggle('wave',active);
   document.body.classList.toggle('owner-stoned',!!owner.stone);
   if(mode){
    if(active){mode.textContent='ЗЕЛЁНАЯ ВОЛНА';value.textContent=fmt(wave.current,1)+' бл.';unit.textContent='сфера расширяется · 32 бл/с';led.className='hp-led wave';}
    else if(armed){mode.textContent='ОТСЧЁТ ИДЁТ';value.textContent=fmtT(remaining);unit.textContent='необратимо · до активации сферы';led.className='hp-led armed';}
    else if(!owner.alive){mode.textContent='СТЕНД ОСТАНОВЛЕН';value.textContent='—';unit.textContent='владелец погиб';led.className='hp-led dead';}
    else if(owner.stone){mode.textContent='ВЛАДЕЛЕЦ В КАМНЕ';value.textContent=fmtT(Math.max(0,owner.endAt-s.time));unit.textContent='восстанавливается · 15% HP/с';led.className='hp-led stoned';}
    else if(!s.item.owned&&!s.orb){mode.textContent='СТЕНД ЖДЁТ';value.textContent='—';unit.textContent='настрой параметры и запусти';led.className='hp-led';}
    else if(s.orb){mode.textContent='МЕДУЗА В ПОЛЁТЕ';value.textContent=s.orb.charged?'заряжена':'разряжена';unit.textContent='отскоки · подбор — ПКМ';led.className='hp-led'+(s.orb.charged?' armed':'');}
    else{mode.textContent='ГОТОВА К АКТИВАЦИИ';value.textContent='R '+s.item.radius+' · '+fmt(s.item.delay/20)+' с';unit.textContent='запуск в руке или бросок';led.className='hp-led ready';}
    pulse.dataset.mode=led.className.replace('hp-led','').trim()||'idle';
   }
   if(artifact)artifact.classList.toggle('live',armed||active);
  }
  setInterval(()=>{if(!document.hidden)sync();},200);
  sync();
 })();
})();
