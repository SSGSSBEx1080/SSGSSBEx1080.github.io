/* №27 · A small cinematic state machine, not six independent fact demos.
   Durations and outcomes follow the supplied AntonChigurEntity. Reset means a NEW
   encounter/NPC. The coin is sampled once, before the visible toss, with no pity rule. */
(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded',()=>document.querySelector('.zm-route')?.remove());
  const $=ZM.$,K=ZM.kit,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  ZM.topbar({crumb:'№27 · Антон Чигур',...ZM.pointNav(27)});K.finNav(27,$('#finNav'));
  K.timeline($('#tl'), [
    { date: '15.08.2026', ver: '1.1.7', t: 'Антон Чигур', d: 'Вместе с четырьмя гостевыми пунктами в мод вошёл Антон Чигур со своим оружием и манерой. Версия 1.1.7 — по дневнику разработчика.', c: '#b3936d' },
  ]);
  const help={first_meeting:'Подойти к живому Чигуру на пять блоков. Одного появления недостаточно.',dialogue_mistake:'Спросить «Откуда ты?». Начинается личная тихая охота.',night_visit:'Попытаться уснуть во время личной ночной охоты.',coin_luck:'Угадать сторону монеты. После броска дождаться окончания пятисекундной реплики.',hunter:'В моде — победить Чигура и забрать выпавший дробовик. Здесь — открыть отдельно обозначенный исход победы.'};
  const adv=K.adv({list:ZM.P27.advancements.map(a=>({...a,how:help[a.key]})),store:'p27.adv',icon:a=>'../../assets/textures/p27/i/'+a.icon+'.png',intro:'Названия и описания — из мода; очки XP — за исследование вики.'});
  const snd=(name,volume=.5)=>P27Audio.play(name,volume);
  const clearSound=()=>P27Audio.stop();
  let model=null,task=null,last=performance.now();
  const s={phase:'far',mode:'meeting',distance:18,aggression:0,hunt:false,coinUsed:false,coinResult:null,refusals:0,questionSpoken:false,dead:false};
  const refusalLines=['Извините, но мы не раскрываем информацию.','Я не знаю, о ком вы говорите.','Нет. Я не стану говорить, где он.'];
  function pose(name,loop=false){if(!model)return;if(loop){model.stop();model.st.idle='animation.chigur.'+name;}else model.play('animation.chigur.'+name);}
  function distance(n){s.distance=n;$('#sceneDistance').textContent=n>=10?Math.round(n):n.toFixed(1).replace('.0','');$('#character').classList.toggle('near',n<=5);$('#character').classList.toggle('distant',n>22);}
  function title(first,second,atmosphere){$('#sceneTitle').innerHTML=first+'<br><em>'+second+'</em>';$('#sceneAtmosphere').textContent=atmosphere;}
  function show(phase,line,buttons=[],hint=''){
    s.phase=phase;task=null;$('#sceneLine').textContent=line;$('#sceneProgress').style.width='0%';
    $('#sceneState').textContent=({far:'НЕЗНАКОМЕЦ',approach:'БЛИЖЕ',close:'ЛИЦОМ К ЛИЦУ',dismissed:'РАЗГОВОР ОКОНЧЕН',silence:'МОЛЧАНИЕ',frozen:'НЕ ДВИГАТЬСЯ',hunt:'ЛИЧНАЯ ОХОТА',huntDelay:'ДЕРЖИТСЯ ВДАЛИ',waiting:'НЕПОДВИЖНО',coinApproach:'ОН ПОДХОДИТ',coinSpeech:'СЛУШАЙ',coinChoice:'ОРЁЛ ИЛИ РЕШКА',coinToss:'БРОСОК',coinReward:'ЕЩЁ ПЯТЬ СЕКУНД',coinLoss:'НЕ ТА СТОРОНА',coinExecution:'ВЫСТРЕЛ',bed:'КАЗНЬ',ended:'КОНЕЦ ЭПИЗОДА',witnessPause:'ТИШИНА',witnessSpeech:'ВОПРОС',witnessChoice:'СВИДЕТЕЛЬ',witnessRetreat:'ОТКАЗ',confessor:'СЛИШКОМ ПОЗДНО',targetDelay:'ЦЕЛЬ — СЛЕДУЮЩАЯ',targetExecution:'КОНЕЦ ОХОТЫ'})[phase]||'НОЧЬ';
    $('#sceneActions').innerHTML=buttons.map(([act,label,quiet],i)=>`<button type="button" data-act="${act}" ${quiet?'class="quiet"':''}>${quiet?'':`<span class="choice-num">0${i+1}</span>`}${label}</button>`).join('');
    $('#sceneHint').textContent=hint||'Модель, анимации и реплики — из мода. Это интерактивная постановка вики.';
    $('#aggression').hidden=!['close','silence','hunt','huntDelay','frozen','dismissed'].includes(phase);$('#aggressionValue').textContent=s.aggression;$('#aggressionBar').style.width=s.aggression+'%';
    $('#sceneChapter').textContent=s.mode==='witness'?'03 / ДРУГОЙ ИГРОК':s.mode==='coin'||phase.startsWith('coin')?'02 / МОНЕТА':'01 / У ОБОЧИНЫ';
    $('#encounter').classList.toggle('hunting',s.hunt);$('#encounter').classList.toggle('ended',phase==='ended');
    $('#encounter').classList.toggle('executing',['bed','confessor','targetExecution','coinExecution'].includes(phase));
    $('#encounter').dataset.phase=phase;
  }
  function schedule(seconds,done,progress){task={duration:seconds,left:seconds,done,progress};}
  function arrive(done){
    const start=s.distance;pose('walk',true);show('approach','Ты подходишь. Он не отводит взгляд.');
    schedule(1.7,()=>{distance(4.5);adv.grant('first_meeting');pose('idle',true);done();},p=>distance(start+(4.5-start)*p));
  }
  function far(){
    pose('idle',true);show('far','На обочине кто-то стоит. Можно подойти. Можно просто остаться на месте.',[['approach','Подойти ближе'],['wait','Остаться на месте']]);
  }
  function conversation(){
    if(s.hunt||s.dead)return;distance(4.5);title('Встреча','с Чигуром','До него меньше пяти блоков.');
    show('close','Он ждёт. Что ты скажешь?',[['question','«Откуда ты?»'],['silent','«...»'],['dismiss','«Извините, обознался»']]);
  }
  function beginHunt(){
    s.hunt=true;pose('stalk',true);
    const buttons=[['sleep','Попробовать уснуть'],['witness','Увидеть роль свидетеля',true]];
    if(s.questionSpoken){
      distance(26);snd('vanish',.3);title('Личная','охота','Просто теперь он стоит дальше.');
      show('huntDelay','Он отступил примерно на 26 блоков. Шесть секунд держится вдали — затем снова может сближаться.',buttons,'Личная охота уже началась. Эти шесть секунд не защищают от казни у кровати; ноль на шкале тоже не спасает.');
      schedule(6,()=>show('hunt','Шесть секунд прошли. Настороженность — ноль. Тихая охота продолжается и привязана именно к тебе.',buttons,'Он обычно держит дистанцию и лишь иногда сближается. Мы не подменяем эту охоту немедленным гарантированным выстрелом.'));
    }else{
      title('Начало','охоты','Настороженность достигла ста.');
      show('hunt','Третье молчание. Настороженность достигла 100. Теперь он охотится на тебя.',buttons,'Молчание не запускает пятисекундную реплику и отступление из первого вопроса.');
    }
  }
  function ask(){
    if(s.phase!=='close')return;adv.grant('dialogue_mistake');s.aggression=0;s.questionSpoken=true;pose('idle',true);title('Неудачный','вопрос','Пять секунд. Камера не слушается.');
    show('frozen','«Откуда ты?» — вы стоите лицом к лицу. Пять секунд невозможно пошевелиться.');snd('speech_1',.55);schedule(5,beginHunt);
  }
  function silent(){
    if(s.phase!=='close')return;s.aggression=clamp(s.aggression+34,0,100);
    if(s.aggression===100){beginHunt();return;}
    show('silence','Ты промолчал. Настороженность: '+s.aggression+'/100. Он всё ещё рядом.',[['talk','Заговорить снова'],['wait','Остаться молча'],['back','Отойти',true]],'Каждое «...» добавляет 34. Третье молчание — начало охоты.');
  }
  function dismiss(){
    if(s.phase!=='close')return;show('dismissed','Ты закончил разговор. Он остался на месте.',[['back','Отойти к дороге'],['wait','Не двигаться'],['talk','Поговорить ещё',true]],'«Извините, обознался» закрывает окно диалога. Самого Чигура эта реплика не удаляет.');
  }
  function waitStill(){
    if(s.coinUsed||s.hunt||s.dead)return;s.mode='coin';title('Ожидание','монеты','Не двигайся. Он сам подойдёт.');
    show('waiting','Ты не вступаешь в разговор и стоишь неподвижно. В пределах 32 блоков этого достаточно.',[['move','Сдвинуться с места',true]],'Это не таймер появления. Чигур уже рядом; проверяется именно неподвижность игрока.');
    schedule(10,()=>{
      show('coinApproach','Он идёт к тебе. Теперь заговорит он.');pose('walk',true);const start=s.distance;
      schedule(1.3,()=>{distance(2.5);adv.grant('first_meeting');pose('idle',true);show('coinSpeech','Сначала — его реплика. Выбор появится только после неё.');snd('speech_2',.55);schedule(5,coinChoice);},p=>distance(start+(2.5-start)*p));
    });
  }
  function coinChoice(){
    title('Игра','в монету','Назови сторону. Один раз на этого Чигура.');$('#coinOverlay').hidden=false;$('#coinDisc').className='coin-disc';$('#coinCaption').textContent='50 / 50';
    show('coinChoice','Орёл или решка?',[['heads','<img src="../../assets/textures/p27/coin_model_heads.png?v=items4" alt="">Орёл'],['tails','<img src="../../assets/textures/p27/coin_model_tails.png?v=items4" alt="">Решка']],'Честные 50/50. Никакой гарантированной победы после нескольких проигрышей.');
  }
  function toss(heads){
    if(s.phase!=='coinChoice'||s.coinUsed)return;
    s.coinUsed=true;
    // A single unbiased bit. It is chosen BEFORE the animation, just like random.nextBoolean().
    const random=new Uint32Array(1);if(window.crypto?.getRandomValues){crypto.getRandomValues(random);s.coinResult=(random[0]&1)===0;}else s.coinResult=Math.random()<.5;
    const result=s.coinResult;$('#coinCaption').textContent='';$('#coinDisc').className='coin-disc tossing';
    pose(result?'coin':'coin2');snd('coin',.4);show('coinToss','Монета уже в воздухе. Ответ изменить нельзя.');
    schedule(2,()=>{
      $('#coinDisc').className='coin-disc'+(result?'':' tails-up');$('#coinCaption').textContent=result?'ОРЁЛ':'РЕШКА';pose('idle',true);
      if(result===heads){
        show('coinReward','Ты угадал. Но он ещё не отдал монету. Нужно дослушать пять секунд.');snd('speech_3',.55);
        schedule(5,()=>{adv.grant('coin_luck');title('Выигрыш','в монету','Монета — у тебя. Он исчезает.');end('Он отдаёт монету. На этом эта встреча заканчивается.','Монета выдаётся только после реплики. Второй бросок возможен лишь в новой встрече.');});
      }else{
        title('Проигрыш','в монету','Он подождёт ещё две секунды.');show('coinLoss','Ответ не совпал. Две секунды тишины перед выстрелом.');
        schedule(2,()=>{
          show('coinExecution','Выстрел. Через восемь тиков — контрольный урон, если игрок ещё жив. Тотем не меняет исход.');pose('shoot');snd('shot',.4);
          schedule(.4,()=>{s.dead=true;title('Вы','погибли.','Исход проигрыша в монету.');end('Он стреляет. Этот исход не спасает даже тотем.','Это конец конкретной встречи. Новая встреча создаёт другого Чигура, а не даёт переиграть ту же монету.');});
        });
      }
    });
  }
  function end(line,hint){
    pose('vanish');snd('vanish',.25);$('#character').classList.add('gone');show('ended',line,[['new','Другая встреча ↺']],hint);s.hunt=false;
  }
  function sleep(){
    if(!s.hunt||!['hunt','huntDelay'].includes(s.phase))return;distance(1);adv.grant('night_visit');title('Казнь','у кровати','Обе части кровати сломаны. Он перед тобой.');
    show('bed','Ты пытаешься лечь. Кровать ломается. Одна секунда — и казнь завершится.');pose('kill');snd('airgun',.45);
    schedule(1,()=>{s.dead=true;title('Вы','погибли.','Исход личной ночной охоты.');snd('shot',.35);end('Ночная охота не заканчивается у кровати.','Сцена из ChigurBedHandler и AntonChigurEntity, без выдуманного способа спастись.');});
  }
  function witnessQuestion(){
    if(s.questionSpoken){witnessChoice();return;}
    show('witnessPause','Три секунды молчания. Он смотрит на тебя.');pose('idle',true);
    schedule(3,()=>{
      if(!s.questionSpoken){s.questionSpoken=true;show('witnessSpeech','Он спрашивает о другом игроке. Ты — свидетель, а не его цель.');snd('speech_4',.5);schedule(3,witnessChoice);}
      else witnessChoice();
    });
  }
  function witnessChoice(){
    const refusal=refusalLines[Math.floor(Math.random()*refusalLines.length)];
    show('witnessChoice',s.refusals?'Он всё ещё ждёт ответа. Отказов: '+s.refusals+'/3.':'Он хочет узнать, где другой игрок. Ты здесь ни при чём. Пока.',[['tell','Рассказать, где он'],['refuse',ZM.esc(refusal)]],'Тексты отказов выбраны из оригинальных трёх реплик интерфейса. Третий отказ он встречает молча.');
  }
  function refuse(){
    if(s.phase!=='witnessChoice')return;s.refusals++;
    show('witnessRetreat',s.refusals===3?'Третий отказ. Он молча отступает. Больше не спрашивает.':'Он делает небольшой шаг назад. Отказ '+s.refusals+'/3.');
    if(s.refusals<3)snd('speech_'+(s.refusals===1?5:6),.5);
    const start=s.distance;schedule(3,()=>{
      if(s.refusals===3){title('Третий','отказ','Охота прекращена. Он уходит.');end('Три отказа. Охота на другого игрока закончилась, никто не выдал его местоположение.','За этот исход в моде нет отдельного достижения. Мы не придумываем ему награду.');}
      else witnessQuestion();
    },p=>distance(start+p*.8));
  }
  function tell(){
    if(s.phase!=='witnessChoice')return;
    title('Казнь','свидетеля','Сначала — свидетель. Потом — цель.');show('confessor','Ты рассказываешь. Он начинает казнь того, кто выдал другого игрока.');pose('kill');
    schedule(1,()=>{
      $('#witnessSelf').classList.add('dead');snd('shot',.35);s.dead=true;show('targetDelay','Свидетель погиб. Через пять секунд Чигур доберётся до цели.');
      schedule(5,()=>{show('targetExecution','Он оказывается у цели и начинает вторую казнь.');pose('kill');schedule(1,()=>{$('#witnessTarget').classList.add('dead');snd('shot',.35);title('Завершение','охоты','Так закончилась эта охота.');end('Сначала погиб информатор, затем — игрок, которого он выдал.','В исходнике обе казни гарантированы. Здесь нет дополнительной «хорошей» ветки признания.');});});
    });
  }
  function reset(mode='meeting'){
    clearSound();task=null;Object.assign(s,{phase:'far',mode,distance:18,aggression:0,hunt:false,coinUsed:false,coinResult:null,refusals:0,questionSpoken:false,dead:false});
    $('#character').classList.remove('gone','near','distant');$('#coinOverlay').hidden=true;$('#coinDisc').className='coin-disc';$('#witnessMarks').hidden=mode!=='witness';$('#witnessSelf').classList.remove('dead');$('#witnessTarget').classList.remove('dead');
    distance(18);title('Ночная','встреча','Он пока просто смотрит.');pose('idle',true);
    if(mode==='coin')waitStill();else if(mode==='witness'){distance(3);adv.grant('first_meeting');title('Роль','свидетеля','Другой игрок стал целью. Чигур нашёл тебя.');witnessQuestion();}else far();
  }
  const actions={approach:()=>arrive(conversation),question:ask,silent,dismiss,talk:conversation,wait:waitStill,move:()=>{title('Движение','игрока','Отсчёт неподвижности сброшен.');far();},back:()=>{distance(18);title('Дистанция','18 блоков','Не исчез. Просто дальше от тебя.');far();},heads:()=>toss(true),tails:()=>toss(false),sleep,witness:()=>reset('witness'),refuse,tell,new:()=>reset()};
  $('#sceneActions').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(b&&!b.disabled)actions[b.dataset.act]?.();});
  $('#sceneReset').addEventListener('click',()=>reset());
  document.querySelectorAll('[data-episode]').forEach(b=>b.addEventListener('click',()=>{reset(b.dataset.episode);$('#encounter').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});}));
  $('#character3d').addEventListener('click',()=>{if(s.phase==='far')arrive(conversation);});$('#character3d').addEventListener('keydown',e=>{if(e.key==='Enter'&&s.phase==='far'){e.preventDefault();arrive(conversation);}});

  // Trophy range. This is an unarmoured dummy, NOT a simulated victory over the NPC.
  const gun={unlocked:false,ammo:6,life:300,reload:0,pump:0,hp:80};let recoilTimer=0;
  const dist=()=>+$('#distance').value;
  const damage=()=>dist()>10?0:7+60*Math.pow(1-clamp((dist()-2)/8,0,1),2);
  const damageText=()=>damage().toLocaleString('ru-RU',{maximumFractionDigits:1});
  function gunHUD(){
    $('#distanceVal').textContent=dist().toLocaleString('ru-RU');$('#damageHint').textContent=dist()>10?'За пределами 10 блоков трофей не находит цель.':'В манекен без брони: '+damageText()+' урона.';
    $('#paperTarget').style.setProperty('--target-scale',String(1.15-(dist()-2)/12*.52));$('#paperTarget').classList.toggle('down',gun.hp<=0);$('#targetHP').textContent=Math.max(0,gun.hp).toLocaleString('ru-RU',{maximumFractionDigits:1});
    $('#shells').innerHTML=Array.from({length:6},(_,i)=>`<i ${i>=gun.ammo?'class="spent"':''}></i>`).join('');$('#shells').setAttribute('aria-label',gun.ammo+' патронов из шести');
    $('#ammoLabel').textContent=gun.reload>0?'ПЕРЕЗАРЯДКА '+Math.ceil(gun.reload)+' с':gun.ammo+' / 6';$('#durability').textContent=gun.life;
    $('#fireBtn').disabled=!gun.unlocked||gun.reload>0||gun.pump>0||gun.life<=0;$('#fireBtn').textContent=gun.life<=0?'Сломан':gun.reload>0?'Перезарядка…':'Выстрелить';
  }
  $('#unlockWeapon').addEventListener('click',()=>{gun.unlocked=true;$('#caseClosed').hidden=true;$('#shootingRange').hidden=false;adv.grant('hunter');gunHUD();});
  $('#distance').addEventListener('input',gunHUD);
  $('#fireBtn').addEventListener('click',()=>{
    if(!gun.unlocked||gun.reload>0||gun.pump>0||gun.life<=0)return;
    gun.ammo--;gun.life--;gun.pump=.4;
    const hit=gun.hp>0?damage():0;gun.hp=Math.max(0,gun.hp-hit);snd('shot',.35);
    $('#weaponFeedback').textContent=hit?'Попадание: −'+hit.toLocaleString('ru-RU',{maximumFractionDigits:1})+'.'+(gun.hp<=0?' Манекен упал.':'') : gun.hp<=0?'Манекен уже упал. Патрон всё равно потрачен.':'Мимо: цель дальше десяти блоков. Патрон и прочность потрачены.';
    if(gun.ammo===0){gun.reload=10;snd('reload',.25);$('#weaponFeedback').textContent+=' Барабан пуст. Десять обязательных секунд.';}
    if(!reduced.matches){clearTimeout(recoilTimer);$('#shotgunArt').classList.add('recoil');$('#paperTarget').classList.add('hit');$('#rangeFlash').classList.add('on');recoilTimer=setTimeout(()=>{$('#shotgunArt').classList.remove('recoil');$('#paperTarget').classList.remove('hit');$('#rangeFlash').classList.remove('on');},150);}
    gunHUD();
  });
  $('#repairBtn').addEventListener('click',()=>{gun.life=300;$('#weaponFeedback').textContent='Демонстрация ремонта: прочность восстановлена. В игре подходят железо или порох; патроны ремонт не добавляет.';gunHUD();});
  $('#resetTarget').addEventListener('click',()=>{gun.hp=80;$('#weaponFeedback').textContent='Новый манекен, 80 здоровья, без брони. Барабан и прочность остались прежними.';gunHUD();});
  setInterval(()=>{
    const now=performance.now(),dt=Math.min(.15,(now-last)/1000);last=now;if(document.hidden)return;
    if(task){const current=task;current.left=Math.max(0,current.left-dt);const p=1-current.left/current.duration;$('#sceneProgress').style.width=p*100+'%';current.progress?.(p);if(current.left<=0&&task===current){task=null;current.done();}}
    if(gun.unlocked&&(gun.reload>0||gun.pump>0)){gun.pump=Math.max(0,gun.pump-dt);if(gun.reload>0){gun.reload=Math.max(0,gun.reload-dt);if(gun.reload===0){gun.ammo=6;$('#weaponFeedback').textContent='Десять секунд прошли. Барабан снова полон.';}}gunHUD();}
  },50);
  window.P27SCENE={state:s,gun}; // observable state for the page and regression tests
  reset();gunHUD();
  const cv=$('#character3d');
  if(window.ZMGeo?.supported())try{
    model=ZMGeo.create(cv,{geo:ZM.P27G.geo,anim:ZM.P27G.anim,tex:ZM.tex('../../assets/textures/p27/anton_chigur.png'),idle:'animation.chigur.idle',lit:.45,mip:true,exclusive:true,cam:{yaw:195,pitch:3,dist:88,target:[0,16,0],fov:40}});
    if(model){const image=new Image();image.onload=()=>$('#character').classList.add('model-ready');image.src='../../assets/textures/p27/anton_chigur.png';let seen=true,old=0;new IntersectionObserver(es=>seen=es[0].isIntersecting).observe(cv);
      function frame(t){requestAnimationFrame(frame);if(t-old<45)return;const dt=Math.min(.07,(t-old)/1000);old=t;if(!seen||document.hidden)return;const target=58+s.distance*1.65;model.cam.dist+=(target-model.cam.dist)*(reduced.matches?1:.15);if(!reduced.matches)model.tick(dt);model.render();}requestAnimationFrame(frame);
    }
  }catch(e){model=null;console.warn('Chigur model fallback',e);}
})();
