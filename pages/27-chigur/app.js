/* №27 — исходники: AntonChigurEntity, ChigurSpawnHandler, ChigurShotgunItem,
   ChigurCoinItem, ChigurBedHandler; пользовательские эксперименты без боевого насилия. */
(() => {
  const { $, $$ } = ZM, K = ZM.kit, U = ZM.url;
  ZM.topbar({crumb:'№27 · Антон Чигур', ...ZM.pointNav(27)});
  const snd = K.sounds('p27');
  const tex = name => U(`assets/textures/p27/${name}.png`);
  const adv = K.adv({list: ZM.P27.advancements, store:'p27.adv', icon:a=>tex(a.icon), intro:'Пять достижений скрыты, как в игре. Подойди к незнакомцу на пять блоков.'});
  K.finNav(27,$('#finNav'));
  let g = null;
  function pose(name){if(g)g.play(`animation.chigur.${name}`,()=>{$('#stageState').textContent='НАБЛЮДАЕТ';});$('#stageState').textContent=({shoot:'СТРЕЛЯЕТ',coin:'БРОСАЕТ МОНЕТУ',kill:'ФИНАЛЬНАЯ СЦЕНА',vanish:'ИСЧЕЗАЕТ',stalk:'ОХОТИТСЯ',walk:'ПРИБЛИЖАЕТСЯ'})[name]||'НАБЛЮДАЕТ';}
  if(window.ZMGeo?.supported()){
    try {
      const cv=$('#character3d');
      g=ZMGeo.create(cv,{geo:ZM.P27G.geo,anim:ZM.P27G.anim,tex:tex('anton_chigur'),idle:'animation.chigur.idle',cam:{yaw:195,pitch:7,dist:61,target:[0,16,0],fov:41},lit:.45,mip:true});
      if(g){$('#stage').classList.add('model-ready');const rotation=K.spinner(cv,{rx:0,ry:0},45);let old=performance.now(),seen=true;
        new IntersectionObserver(entries=>{seen=entries[0].isIntersecting}).observe($('#stage'));
        function frame(t){requestAnimationFrame(frame);if(!seen){old=t;return;}g.tick(Math.min(.06,(t-old)/1000));old=t;g.setExtra(g.M.euler([rotation.rx,rotation.ry+(rotation.idle()?Math.sin(t/2500)*3:0),0]));g.render();}requestAnimationFrame(frame);
      }
    } catch(e){console.warn('3D-фигура недоступна, остаётся оригинальный портрет.',e);g=null;}
  }
  // Как у персонажей на первых страницах: клик по самой модели начинает встречу.
  {const cv=$('#character3d');let down=null;cv.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY});cv.addEventListener('pointerup',e=>{if(!down)return;const d=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;if(d>7)return;$('#meetBtn').click();$('#encounter').scrollIntoView({behavior:'smooth'});pose('stalk');});cv.addEventListener('pointercancel',()=>down=null);}
  const poses=['animation.chigur.idle','animation.chigur.walk','animation.chigur.stalk'];let poseIndex=0;
  $('#poseBtn').onclick=()=>{poseIndex=(poseIndex+1)%poses.length;if(g)g.st.idle=poses[poseIndex];$('#poseBtn').textContent=['ПОЗА: СПОКОЕН','ПОЗА: ИДЁТ','ПОЗА: СЛЕДИТ'][poseIndex];};

  // Порядок ChigurSpawnHandler: stored=20, migration=>40; failure stored=50, next migration=>100.
  const night={index:1,chance:40,found:false};
  function renderNight(){ $('#nightIndex').textContent=String(night.index).padStart(2,'0');$('#nightChance').textContent=night.chance;$('#chanceBar').style.width=night.chance+'%';$('#nightRoll').disabled=night.found;$('#approachControl').hidden=!night.found; }
  $('#nightRoll').onclick=()=>{
    if(night.found)return;
    const roll=Math.random()*100|0,success=roll<night.chance;
    if(success){night.found=true;$('#hunterDistance').textContent=(12+Math.random()*9|0)+' БЛОКОВ';$('#hunterMarker').classList.add('visible');$('#nightSignal').textContent='ФИГУРА ОБНАРУЖЕНА';$('#nightRoadnote').textContent='ПОДОЙДИ К НЕМУ';$('#approachRange').value='20';updateApproach();$('#nightResult').textContent=`Бросок ${roll} < ${night.chance}: Чигур появился в 12–20 блоках. Подойди, чтобы получить достижение.`;snd('chigur_vanish',.35);}
    else{$('#nightResult').textContent=`Бросок ${roll} ≥ ${night.chance}: никого нет. Следующей ночью шанс станет 100%.`;night.index++;night.chance=100;$('#nightSignal').textContent='ТИШИНА · СЛЕДУЮЩАЯ НОЧЬ';}
    renderNight();
  };
  $('#nightReset').onclick=()=>{night.index=1;night.chance=40;night.found=false;$('#nightResult').textContent='Новый прогон. Сначала проверь ночь.';$('#nightSignal').textContent='СИГНАЛ НЕ ОБНАРУЖЕН';$('#hunterMarker').classList.remove('visible');$('#nightRoadnote').textContent='ПРИСМОТРИСЬ К ОБОЧИНЕ';renderNight();};renderNight();

  function updateApproach(){const d=Number($('#approachRange').value);$('#nightDistance').textContent=d+' БЛОКОВ';$('#hunterDistance').textContent=d+' БЛОКОВ';const sprite=$('#hunterMarker');sprite.style.setProperty('--near-scale',String(.48+(20-d)*.05));sprite.style.right=(19+(20-d)*1.4)+'%';$('#nightApproachMessage').textContent=d<=5?'Пять блоков. Он видит тебя. «Первая встреча» открыта.':`До знакомства ещё ${d-5} блоков.`;if(d<=5&&night.found&&!adv.has('first_meeting')){$('#meetBtn').click();$('#nightRoadnote').textContent='ОН ВИДИТ ТЕБЯ';}}
  $('#approachRange').addEventListener('input',updateApproach);

  const scene={met:false,anger:0,hunt:false,ended:false};
  function dialogue(){
    $('#aggressionValue').textContent=scene.anger+' / 100';$('#aggressionBar').style.width=scene.anger+'%';
    $('#dialogueState').textContent=scene.hunt?'ОХОТА':scene.ended?'УШЁЛ':scene.met?'БЛИЗКО':'НЕЗНАКОМЕЦ';
    $$('#dialogueChoices button').forEach(b=>b.disabled=!scene.met||scene.ended||scene.hunt);
    $('#meetBtn').disabled=scene.met&&!scene.ended;
  }
  $('#meetBtn').onclick=()=>{if(scene.ended)resetDialogue();scene.met=true;$('#dialogueLine').textContent='Он замер. Пора задать вопрос — или промолчать.';adv.grant('first_meeting');dialogue();};
  function resetDialogue(){scene.met=false;scene.anger=0;scene.hunt=false;scene.ended=false;document.body.classList.remove('hunt-active');$('#dialogueLine').textContent='Он остановился рядом и смотрит на тебя. Подойди, чтобы заговорить.';$('#bedVisual').classList.remove('broken');$('#bedStamp').textContent='НЕ БЕЗОПАСНО';$('#sleepResult').textContent='Сперва запусти охоту диалогом выше.';dialogue();}
  $('#dialogueReset').onclick=resetDialogue;
  $('#dialogueChoices').onclick=e=>{const btn=e.target.closest('[data-choice]');if(!btn||btn.disabled)return;const choice=+btn.dataset.choice;
    if(choice===0){scene.hunt=true;document.body.classList.add('hunt-active');$('#dialogueLine').textContent='«Откуда ты?» — пять секунд лицом к лицу. Затем он исчезает из вида и начинает тихую охоту.';snd('chigur_speech_1',.55);adv.grant('dialogue_mistake');pose('stalk');}
    else if(choice===1){scene.anger=Math.min(100,scene.anger+34);if(scene.anger>=100){scene.hunt=true;document.body.classList.add('hunt-active');$('#dialogueLine').textContent='Третье молчание. 34 + 34 + 34 = 102. Шкала достигла предела — началась охота.';pose('stalk');}else $('#dialogueLine').textContent=`Он не получил ответа. Настороженность: ${scene.anger}/100. Ещё одно «...» поднимет её на 34.`;}
    else{scene.ended=true;$('#dialogueLine').textContent='«Извините, обознался». Он не преследует тебя. На этот раз.';snd('chigur_vanish',.35);}
    dialogue();
  };dialogue();
  $('#sleepBtn').onclick=()=>{if(!scene.hunt){$('#sleepResult').textContent='Сцена начинается только во время личной ночной охоты. Начни с «Откуда ты?».';return;}
    $('#bedVisual').classList.add('broken');$('#bedStamp').textContent='КРОВАТЬ СЛОМАНА';$('#sleepResult').textContent='Он ломает кровать, появляется перед игроком и исчезает после финальной сцены.';scene.hunt=false;scene.ended=true;document.body.classList.remove('hunt-active');dialogue();pose('kill');snd('chigur_airgun',.55);adv.grant('night_visit');};

  let refusals=0,witnessDone=false;
  $('#refuseBtn').onclick=()=>{if(witnessDone)return;refusals++;if(refusals<=2)snd('chigur_speech_'+(refusals+4),.34);$('#refusalNum').textContent=refusals+' / 3';$('#witnessResult').textContent=refusals<3?`Отказ №${refusals}. Он отступил и спросит снова.`:'Третий отказ: он молча отступает, прекращает охоту и уходит.';if(refusals===3){witnessDone=true;$('#refuseBtn').disabled=true;$('#tellBtn').disabled=true;snd('chigur_vanish',.4);}};
  $('#tellBtn').onclick=()=>{if(witnessDone)return;witnessDone=true;$('#tellBtn').disabled=true;$('#refuseBtn').disabled=true;$('#witnessResult').textContent='Свидетель выдаёт друга. По сценарию Чигур сначала убивает свидетеля, затем спустя пять секунд возвращается за целью.';snd('chigur_shot',.32);};
  $('#witnessReset').onclick=()=>{refusals=0;witnessDone=false;$('#refusalNum').textContent='0 / 3';$('#refuseBtn').disabled=false;$('#tellBtn').disabled=false;$('#witnessResult').textContent='Вообрази, что ты встретил его во время охоты за другом.';};

  let stillTimer=null,waited=0,coinPhase='idle',coinTimer=[];
  function clearCoinTimers(){if(stillTimer){clearInterval(stillTimer);stillTimer=null;}coinTimer.forEach(clearTimeout);coinTimer=[];}
  function resetCoin(){clearCoinTimers();coinPhase='idle';waited=0;$('#stillProgress').style.width='0%';$('#stillText').textContent='10 СЕКУНД / ОЖИДАНИЕ';$('#coinTitle').textContent='Постой. Подожди.';$('#coinText').textContent='Ничего не делай десять секунд. Если не вступишь в разговор, Чигур подойдёт и предложит бросить монету.';$('#coinResult').textContent='Выигрыш — монета, которую затем можно подбрасывать у друзей.';$('#standBtn').disabled=false;$('#standBtn').textContent='СТОЯТЬ НЕПОДВИЖНО';$$('.coin-picks button').forEach(x=>x.disabled=true);$('#coinDisc').classList.remove('flip');$('#coinDisc img').src=tex('coin_face');}
  $('#standBtn').onclick=()=>{if(coinPhase!=='idle')return;coinPhase='waiting';$('#standBtn').disabled=true;$('#coinTitle').textContent='Не двигайся.';$('#coinText').textContent='Счётчик ждёт десять секунд. После этого Чигур предложит назвать сторону монеты.';
    const start=performance.now();stillTimer=setInterval(()=>{waited=Math.min(10,(performance.now()-start)/1000);$('#stillProgress').style.width=(waited*10)+'%';$('#stillText').textContent=`${(10-waited).toFixed(1)} СЕКУНД ДО ВОПРОСА`;if(waited<10)return;
      clearInterval(stillTimer);stillTimer=null;coinPhase='pick';$('#stillText').textContent='ТЕПЕРЬ НАЗОВИ СТОРОНУ';$('#coinTitle').textContent='Орёл или решка?';snd('chigur_speech_2',.38);$('#coinText').textContent='Угадаешь — получишь монету после речи. Не угадаешь — у него свой ответ.';$$('.coin-picks button').forEach(x=>x.disabled=false);},80);
  };
  $$('.coin-picks button').forEach(btn=>btn.onclick=()=>{if(coinPhase!=='pick')return;coinPhase='toss';$$('.coin-picks button').forEach(x=>x.disabled=true);const heads=Math.random()<.5,choice=btn.dataset.side==='heads';$('#coinTitle').textContent='Монета в воздухе.';$('#coinResult').textContent='Бросок идёт две секунды...';$('#coinDisc').classList.remove('flip');void $('#coinDisc').offsetWidth;$('#coinDisc').classList.add('flip');snd('chigur_coin',.55);
    coinTimer.push(setTimeout(()=>{if(coinPhase!=='toss')return;const win=heads===choice;$('#coinDisc img').src=tex(heads?'coin_face':'coin_back');$('#coinDisc img').alt=heads?'Оригинальная сторона монеты: орёл':'Оригинальная сторона монеты: решка';$('#coinTitle').textContent=heads?'Орёл.':'Решка.';$('#coinResult').textContent=win?'Угадал. Он произносит речь — через пять секунд монета будет твоей.':'Не угадал. После паузы сценарий заканчивается казнью игрока.';
      if(win){coinPhase='reward';snd('chigur_speech_3',.4);coinTimer.push(setTimeout(()=>{if(coinPhase!=='reward')return;coinPhase='done';$('#coinResult').textContent='Монета получена! ПКМ объявит «Орёл» или «Решка» игрокам в радиусе 5 блоков.';snd('chigur_vanish',.4);adv.grant('coin_luck');},5000));}
      else{coinPhase='done';snd('chigur_shot',.27);}
    },2000));
  });$('#coinReset').onclick=resetCoin;

  const gun={ammo:6,dur:300,hp:80,reload:0,pump:false};let reloadTimer=null;
  const damage=d=>7+60*Math.pow(1-Math.min(1,Math.max(0,(d-2)/8)),2);
  function gunRender(){ $('#shells').innerHTML=Array.from({length:6},(_,i)=>`<span class="${i>=gun.ammo?'empty':''}"></span>`).join('');$('#targetHP').textContent=Math.ceil(gun.hp)+' / 80';$('#durability').textContent=gun.dur+' / 300';$('#damageValue').textContent=Math.round(damage(+$('input#distance').value));$('#distanceVal').textContent=$('input#distance').value;$('#fireBtn').disabled=gun.hp<=0||gun.reload>0||gun.pump||gun.dur<=0;$('#fireBtn').textContent=gun.reload>0?`ПЕРЕЗАРЯДКА: ${gun.reload} С`:gun.hp<=0?'МИШЕНЬ ПОРАЖЕНА':gun.pump?'ПЕРЕДЁРГИВАНИЕ':'ВЫСТРЕЛИТЬ';}
  $('#distance').oninput=gunRender;
  $('#fireBtn').onclick=()=>{if(gun.hp<=0||gun.reload||gun.pump||gun.dur<=0)return;
    const d=+$('input#distance').value,hurt=damage(d);gun.ammo--;gun.dur--;gun.hp=Math.max(0,gun.hp-hurt);gun.pump=true;$('#rangeFlash').classList.remove('on');void $('#rangeFlash').offsetWidth;$('#rangeFlash').classList.add('on');snd('chigur_shot',.42);pose('shoot');
    $('#weaponFeedback').textContent=`Дистанция ${d} бл. · урон ${hurt.toFixed(1).replace('.',',')} · патронов ${gun.ammo}/6.`;
    if(gun.hp<=0){$('#rangeTarget').classList.add('defeated');$('#weaponFeedback').textContent+=' Тренировочная победа над Чигуром: он оставил дробовик.';adv.grant('hunter');snd('chigur_vanish',.3);}
    if(gun.ammo===0&&gun.hp>0){gun.reload=10;$('#weaponFeedback').textContent+=' Барабан пуст — перезарядка 10 секунд.';snd('chigur_reload',.32);reloadTimer=setInterval(()=>{gun.reload--;if(gun.reload<=0){gun.reload=0;gun.ammo=6;clearInterval(reloadTimer);reloadTimer=null;$('#weaponFeedback').textContent='Шесть патронов на месте. Можно продолжать.';}gunRender();},1000);}
    gunRender();setTimeout(()=>{gun.pump=false;gunRender();},400);
  };
  $('#repairBtn').onclick=()=>{if(reloadTimer)clearInterval(reloadTimer);reloadTimer=null;gun.ammo=6;gun.reload=0;gun.hp=80;gun.pump=false;gun.dur=300;$('#rangeTarget').classList.remove('defeated');$('#weaponFeedback').textContent='Новая мишень и полностью отремонтированный учебный дробовик.';gunRender();};gunRender();

  // Six case-file tabs reveal different original pieces of evidence instead of identical cards.
  const evidence=[
    {image:'anton_full',desc:'Не достаточно увидеть силуэт: первые пять блоков открывают знакомство.'},
    {image:'anton_portrait',desc:'Молчание считается. Три раза по 34 — охота начинается.'},
    {image:'coin_face',desc:'Монета настоящая: орёл и решка взяты из оригинального атласа.'},
    {image:'chigur_shotgun_render',desc:'Барабан опустел — охотник ждёт следующей ночи.'},
    {image:'anton_full',desc:'Потеряешь его из вида — он не исчезнет сразу. Нужно 120 секунд.'},
    {image:'anton_portrait',desc:'Три отказа свидетеля разрывают охоту без выдачи друга.'}
  ];
  const allFacts=$$('.fact');function showEvidence(i){allFacts.forEach((el,n)=>el.classList.toggle('active',n===i));const x=evidence[i];$('#evidenceImg').src=tex(x.image);$('#evidenceImg').alt=allFacts[i].querySelector('h3').textContent;$('#evidenceImg').classList.toggle('is-vanished',i===4&&$('#factVanishImg').parentElement.classList.contains('faded'));$('#evidenceImg').classList.remove('changed');void $('#evidenceImg').offsetWidth;$('#evidenceImg').classList.add('changed');$('#evidenceIndex').textContent=String(i+1).padStart(2,'0')+' / 06';$('#evidenceTitle').textContent=allFacts[i].querySelector('h3').textContent;$('#evidenceDescription').textContent=x.desc;}
  allFacts.forEach((el,i)=>{el.tabIndex=0;el.addEventListener('click',()=>showEvidence(i));el.addEventListener('keydown',e=>{if(e.target===el&&(e.key==='Enter'||e.key===' ')){e.preventDefault();showEvidence(i);}})});
  showEvidence(0);
  let factAnger=0,factAmmo=6,factRefusal=0,rad=0;
  $$('.fact [data-fact]').forEach(btn=>btn.onclick=()=>{switch(btn.dataset.fact){
    case 'meet':$('#meetBtn').click();$('#factMeet').textContent='Теперь проверь ветку достижений: «Первая встреча» открыта.';break;
    case 'anger':factAnger=(factAnger+34)%136;$('#factAnger').textContent=factAnger+' / 100';$('#factMeter i').style.width=Math.min(100,factAnger)+'%';$('#factAngerText').textContent=factAnger>100?'102: после трёх ответов начинается охота.':'Молчание добавляет 34, предел — 100.';break;
    case 'radius':rad=(rad+1)%7;$('#factRadius').textContent=rad+' / 5';$('#factRadiusText').textContent=rad<=5?`Игроков в пределах ${rad} бл. услышат результат.`:'На 6 блоках оповещения уже нет.';snd('chigur_coin',.22);break;
    case 'ammo':factAmmo--;if(factAmmo<0)factAmmo=6;$('#factAmmoArt').textContent=Array.from({length:6},(_,i)=>i<factAmmo?'●':'○').join(' ');$('#factAmmoText').textContent=factAmmo?'Осталось '+factAmmo+'/6.':'Пусто. Чигур пополнит барабан только следующей игровой ночью.';snd('chigur_shot',.15);break;
    case 'vanish':$('#factVanishImg').parentElement.classList.toggle('faded');$('#evidenceImg').classList.toggle('is-vanished',$('#factVanishImg').parentElement.classList.contains('faded'));$('#factVanishText').textContent=$('#factVanishImg').parentElement.classList.contains('faded')?'Никто не видит его 120 секунд — он исчез.':'Он снова в поле зрения: отсчёт сброшен.';snd('chigur_vanish',.22);break;
    case 'refuse':factRefusal=(factRefusal+1)%4;$('#factRefusals').textContent='НЕ СКАЖУ '.repeat(factRefusal)||'НЕТ · НЕТ · НЕТ';$('#factRefuseText').textContent=factRefusal===3?'Третий отказ: он уходит без новых вопросов.':`Отказов: ${factRefusal}/3.`;break;
  }});
  if(window.ZM?.reveal)ZM.reveal();
})();
