(()=>{'use strict';
 const{$,$$,esc}=ZM,K=ZM.kit,Core=P29Core,store='p29.lab',fmt=(n,d=1)=>Number(n).toLocaleString('ru-RU',{minimumFractionDigits:d,maximumFractionDigits:d});
 ZM.topbar({crumb:'№29 · Сандевистан',...ZM.pointNav(29)});K.finNav(29,$('#finNav'));document.addEventListener('DOMContentLoaded',()=>document.querySelector('.zm-route')?.remove());
 let model=new Core.Model(ZM.store.get(store,null)),motion=!matchMedia('(prefers-reduced-motion: reduce)').matches,status='',lastLog='',lastSave=0,implantShown=false;
 const history=[];
 const adv=K.adv({list:ZM.P29.advancements,store:'p29.adv',icon:a=>'../../assets/textures/p29/i/'+a.icon+'.png',intro:'Шесть скрытых достижений оригинального мода. Описания — цитаты из исходных JSON.',onGrant:a=>{P29Sound.play(a.key);}});
 const save=()=>{ZM.store.set(store,model.snapshot());lastSave=performance.now();};
 /* FX: вспышка и тряска фигуры субъекта в разделе 03. */
 const FX={event(e){if(!motion)return;const cyan=e.type==='installed'||e.type==='ritualStart'||(e.type==='sound'&&e.name==='activate');const red=e.type==='death'||e.type==='psychosisBurst'||(e.type==='sound'&&e.name==='psychosis');if(!cyan&&!red)return;const st=$('#psychoStage');if(!st)return;st.classList.remove('fx-cyan','fx-red');void st.offsetWidth;st.classList.add(cyan?'fx-cyan':'fx-red');if(red){st.classList.remove('fx-shake');void st.offsetWidth;st.classList.add('fx-shake');}}};
 function ring(radius){const fig=$('#psychoFig');if(!fig||fig.querySelectorAll('.pf-ring').length>7)return;const d=document.createElement('div');d.className='pf-ring';d.style.setProperty('--r',(70+radius*14)+'px');fig.appendChild(d);d.addEventListener('animationend',()=>d.remove());}
 function consume(){for(const e of model.drain()){if(e.type==='adv')adv.grant(e.key);if(e.type==='sound')P29Sound.play(e.name);if(e.type==='log')lastLog=e.text;if(e.type==='psychosisBurst')ring(e.radius);if(e.type==='ritualStart'||e.type==='installed')P29Sound.play(e.type);window.P29?.scene?.event?.(e);FX.event(e);}}
 function action(fn,error=''){const ok=fn();status=ok?'':error;consume();render();save();return ok;}
 /* ── раздел 03: субъект ─────────────────────────────────────────── */
 $('#psychoV').addEventListener('click',()=>action(()=>model.toggle(),'Ускорение недоступно: нужен имплант, завершённый откат и отсутствие критической фазы.'));
 $('#inject').addEventListener('click',()=>{if(model.state.using?.kind==='inject'){model.cancelUse();render();return;}action(()=>model.inject(),'Инъекция начинается только с установленным имплантом, с дозой в кармане и без активного ускорения.');});
 $('#waitCooldown').addEventListener('click',()=>{model.tick(model.state.cooldown);consume();render();save();});
 $('#restFiveMinutes').addEventListener('click',()=>{model.tick(6000);consume();render();save();});
 $('#psychoReset').addEventListener('click',()=>{P29Sound.stop();model=new Core.Model();history.length=0;status='';lastLog='';implantShown=false;noteSticky=false;$('#endCity').checked=$('#netheriteChest').checked=true;consume();render();save();$('#psychoStatus').textContent='Новый субъект: город Энда, незеритовый нагрудник и пустой карман.';});
 for(const id of['endCity','netheriteChest'])$('#'+id).addEventListener('change',()=>{const s=model.state;if(s.inCutscene||s.chest==='sandevistan')return;s.inCity=$('#endCity').checked;s.chest=$('#netheriteChest').checked?'netherite':'other';s.ritualReady=false;render();save();});
 /* ── раздел 04: ритуал со стихом из ачивки «Иммуносупрессант» ──── */
 const POEM=(ZM.P29.advancements[0].desc||'').split('\n'),stage=$('#ritualStage');
 let theater=null,typeTimer=null,noteSticky=false;
 function typeLine(text){clearInterval(typeTimer);const span=$('#poemLine span');span.textContent='';let i=0;typeTimer=setInterval(()=>{i++;span.textContent=text.slice(0,i);if(i>=text.length)clearInterval(typeTimer);},32);}
 function startTheater(replay){
  if(theater)return;const s=model.state;
  if(!replay){
   if(!s.alive){status='Субъект погиб — ритуал невозможен. Сначала «НОВЫЙ СУБЪЕКТ».';render();return;}
   if(s.chest==='sandevistan')replay=true;
   else if(!s.inCity||s.chest!=='netherite'){status='Условия ритуала: город Энда и незеритовый нагрудник на субъекте.';render();return;}
   else if(s.doses<2){status='Нужно минимум две дозы иммуносупрессанта — свари партию в аптеке выше.';render();return;}
  }
  stage.dataset.beat='idle';typeLine('');noteSticky=false;$('#ritualNote').textContent=replay?'повтор стиха — имплант уже в слоте':'ритуал начат';
  theater={t0:performance.now(),replay:!!replay,idx:0,linked:false};
  if(!replay)P29Sound.play('ritualStart');
  requestAnimationFrame(theaterFrame);
 }
 const CUES=[{t:.2,b:'armor',l:0},{t:4.8,b:'void',l:1},{t:9.4,b:'syr',l:2},{t:14.0,b:'finale',l:3},{t:16.2,link:true}];
 function theaterFrame(){
  if(!theater)return;
  const el=(performance.now()-theater.t0)/1000;
  while(theater.idx<CUES.length&&el>=CUES[theater.idx].t){const c=CUES[theater.idx++];
   if(c.b){stage.dataset.beat=c.b;typeLine(POEM[c.l]||'');}
   if(c.link){
    if(theater.replay){finishTheater();return;}
    const ok=model.requestInstall();consume();
    if(!ok){$('#ritualNote').textContent='условия ритуала изменились — связь сорвана';theater=null;return;}
    theater.linked=true;$('#ritualNote').textContent='нейро-связь: 0 / 100 тиков';
   }}
  if(theater&&theater.linked){const s=model.state;
   $('#ritualNote').textContent='нейро-связь: '+Math.min(100,s.cutsceneTicks)+' / 100 тиков · имплант на 99-м';
   if(s.chest==='sandevistan'){finishTheater();return;}
   if(el>34){theater=null;$('#ritualNote').textContent='сигнал нейро-связи потерян';return;}}
  if(theater)requestAnimationFrame(theaterFrame);
 }
 function finishTheater(){theater=null;clearInterval(typeTimer);stage.dataset.beat='done';$('#poemLine span').textContent=POEM[3]||'';noteSticky=true;$('#ritualNote').textContent=model.state.chest==='sandevistan'?'имплант в слоте · проклятия наложены':'стих окончен';render();save();}
 $('#installButton').addEventListener('click',()=>startTheater(false));
 $('#ritualReplay').addEventListener('click',()=>startTheater(true));
 /* ── аптека ─────────────────────────────────────────────────────── */
 const brewValid=()=>$('#potionSelect').value==='strong_regeneration'&&$('#bottleSelect').value==='potion';
 function renderBrew(){$('#brewButton').disabled=!brewValid();$('#brewStatus').textContent=brewValid()?'Обычная Регенерации II + Око Энда. Один ингредиент на партию.':'Этот набор не подходит исходному рецепту.';}
 $('#potionSelect').addEventListener('change',renderBrew);$('#bottleSelect').addEventListener('change',renderBrew);
 $('#brewButton').addEventListener('click',()=>{if(action(()=>model.brew({potion:$('#potionSelect').value,type:$('#bottleSelect').value,bottles:Number($('#brewBottles').value)})))$('#brewStatus').textContent='Партия готова. Дозы добавлены к запасу стенда.';});
 /* ── тумблеры ───────────────────────────────────────────────────── */
 function syncMotion(){document.documentElement.classList.toggle('no-sandy-effects',!motion);$('#motionToggle').setAttribute('aria-pressed',String(motion));$('#motionToggle').textContent=motion?'~ АНИМАЦИЯ':'БЕЗ ЭФФЕКТОВ';}
 $('#motionToggle').addEventListener('click',()=>{motion=!motion;syncMotion();});syncMotion();
 const editable=e=>e.target.closest('input,select,textarea,[contenteditable]');
 document.addEventListener('keydown',e=>{if(editable(e))return;if(window.P29SLOW?.hover)return;if(e.code==='KeyV'&&!e.repeat){e.preventDefault();action(()=>model.toggle());}});
 /* ── рендер ─────────────────────────────────────────────────────── */
 function render(){const s=model.state,installed=s.chest==='sandevistan',active=s.accelerating,critical=s.psychosisActive;
  const phase=!s.alive?'SYSTEM FAILURE':critical?'CYBERPSYCHOSIS':s.inCutscene?'INSTALLING':active?'ACCELERATION ACTIVE':s.cooldown?'COOLDOWN':installed?'STANDBY':'AWAITING IMPLANT';
  $('#systemState').textContent=phase;$('#systemLight').classList.toggle('active',active);
  const bigV=$('#psychoV');bigV.disabled=!s.alive||!installed||s.inCutscene||critical||!active&&(s.cooldown>0||s.psychosis>=100);bigV.classList.toggle('active',active);
  bigV.querySelector('span').textContent=!s.alive?'СИСТЕМА ПОТЕРЯНА':critical?'КРИТИЧЕСКАЯ ФАЗА':active?'ОТКЛЮЧИТЬ':s.cooldown?'ОТКАТ '+fmt(s.cooldown/20)+' С':installed?'УСКОРИТЬ':'НУЖЕН ИМПЛАНТ';
  $('#inject').disabled=!s.alive||!installed||active||s.doses<1||!!s.using&&s.using.kind!=='inject';
  $('#injectText').textContent=s.using?.kind==='inject'?'ОТМЕНА · '+s.using.remaining+' т':s.using?'занято':'доза в кармане: '+s.doses;
  $('#waitCooldown').disabled=!s.cooldown||active||critical||s.inCutscene;$('#restFiveMinutes').disabled=!s.alive||s.inCutscene;
  $('#doseCount').textContent=s.doses;$('#toleranceValue').textContent='×'+fmt(s.tolerance,2);$('#queuedReduction').textContent=fmt(s.psychosisToReduce);
  $('#cooldownTime').textContent=s.cooldown?fmt(s.cooldown/20)+' с':'готов';$('#playerHP').textContent=fmt(Math.max(0,s.hp))+' / 20';
  $('#psychoPhase').textContent=!s.alive?'субъект потерян':critical?'идёт · '+fmt(s.psychosisTicks/20)+' с':'нет';
  $('#neuralPercent').textContent=(Math.floor(s.psychosis*100)/100).toFixed(2)+'%';$('#neuralPercent').style.color=s.psychosis>=80?'#fc586e':s.psychosis>=50?'#eff34b':'#b9e55d';
  $('#loadFill').style.width=s.psychosis+'%';$('#loadFill').style.background=s.psychosis>=80?'#f85269':s.psychosis>=50?'#effa47':'#6ecb9c';
  $('#loadWarning').textContent=critical?'CRITICAL ERROR':s.psychosis>=80?'NEURAL OVERLOAD IMMINENT':s.psychosis>=50?'CAUTION':'STABLE';
  const fig=$('#psychoFig');fig.classList.toggle('active',active);fig.classList.toggle('critical',critical);fig.classList.toggle('dead',!s.alive);
  const op=Math.min(1,s.psychosis/100);fig.querySelector('.v1').style.opacity=op*.55;fig.querySelector('.v2').style.opacity=op*.8;fig.querySelector('.v3').style.opacity=op;
  if(installed)implantShown=true;else if(!s.alive&&implantShown)implantShown=true;else if(!s.alive)implantShown=false;
  const imp=$('#pfImplant');imp.classList.toggle('on',installed);imp.classList.toggle('lost',!installed&&implantShown&&!s.alive);
  if(!implantShown&&!installed)imp.classList.remove('lost');
  $('#psychoCaption').textContent=!s.alive?'субъект потерян · имплант удалён':critical?'критическая фаза: урон себе и вокруг':active?'нейроны разогнаны ×2 · нагрузка растёт':s.inCutscene?'нейро-связь устанавливается…':s.cooldown?'откат импланта':installed?'стабилен · V готов':'имплант не установлен';
  const tags=[];tags.push(installed?'ONLINE':'NO IMPLANT');if(active)tags.push('ACTIVE');if(s.cooldown)tags.push('COOLDOWN '+s.cooldown+'т');if(s.nausea)tags.push('NAUSEA');if(critical)tags.push('CRITICAL');if(!s.alive)tags.push('LOST');
  $('#psychoTags').innerHTML=tags.map(t=>'<i>'+esc(t)+'</i>').join('');
  $('#criticalOverlay').hidden=!critical;$('#criticalClock').textContent=!s.alive?'SUBJECT LOST':fmt(s.psychosisTicks/20)+' / 10.0 с';
  $('#installButton').disabled=!!theater||s.inCutscene;$('#installLabel').textContent=theater?'РИТУАЛ ИДЁТ…':installed?'ПОВТОРИТЬ РИТУАЛ':'НАЧАТЬ РИТУАЛ';
  if(s.inCutscene){$('#ritualNote').textContent='нейро-связь: '+Math.min(100,s.cutsceneTicks)+' / 100 тиков · имплант на 99-м';noteSticky=false;}else if(!theater&&!noteSticky)$('#ritualNote').textContent=installed?'имплант в слоте · проклятия несъёмности и утраты':!s.alive?'нужен новый субъект':'нажми «начать ритуал» — дальше он сам';
  $('#curseState').textContent=!s.alive?(implantShown?'ИМПЛАНТ УТРАЧЕН':'СУБЪЕКТ ПОТЕРЯН'):s.binding?'НЕСЪЁМНОСТЬ + УТРАТА':'без проклятий';
  $('#plateCurse').classList.toggle('on',!!s.binding&&installed);
  $('#psychoStatus').textContent=P29Sound.state.errors.length?'Для звука нажмите кнопку «ЗВУК» в разделе 01.':status||(!s.alive&&'Субъект погиб. Киберпсихоз забрал имплант — «НОВЫЙ СУБЪЕКТ» начнёт отдельный прогон.')||(critical&&'Фаза необратима: магический урон субъекту, атаки по округе и удаление импланта в конце.')||(active&&'Часы мира не останавливаются. Нагрузка +0.2 за тик разгона.')||(s.inCutscene&&'Установка: 100 тиков, имплант появляется на 99-м.')||(s.cooldown&&'Откат идёт; нагрузка сама не рассасывается, пока очередь препарата пуста.')||(installed&&'Система готова. Повторный V отключает ускорение раньше срока.')||lastLog||'Подготовлены город Энда и незеритовый нагрудник. Дозы варятся в аптеке ниже.';
 }
 /* ── журнал нагрузки ────────────────────────────────────────────── */
 const graph=$('#loadGraph'),g=graph.getContext('2d');let graphW=400,graphH=120;
 new ResizeObserver(()=>{graphW=graph.clientWidth||560;graphH=graph.clientHeight||120;const d=Math.min(devicePixelRatio||1,1.5);graph.width=Math.round(graphW*d);graph.height=Math.round(graphH*d);g.setTransform(d,0,0,d,0,0);drawGraph();}).observe(graph);
 function drawGraph(){if(!g)return;g.clearRect(0,0,graphW,graphH);g.strokeStyle='#1e4045';g.lineWidth=1;for(const y of[20,50,80,100]){const h=graphH-y/100*graphH;g.beginPath();g.moveTo(0,h);g.lineTo(graphW,h);g.stroke();}if(history.length<2)return;g.strokeStyle=model.state.psychosis>=80?'#fb5570':'#b3e765';g.lineWidth=2;g.beginPath();history.forEach((p,i)=>{const x=i/159*graphW,y=graphH-p/100*graphH;i?g.lineTo(x,y):g.moveTo(x,y);});g.stroke();}
 /* ── 3D-вьювер импланта: нативная модель брони из мода ──────────── */
 const cv=$('#implant3d');let implant=null,seen=true,drag=null;
 // The native model has sub-pixel box-UV dimensions. Sample zero-width UVs just
 // inside the intended texel to avoid GPU roundoff speckling; geometry is untouched.
 const displayGeo=(window.structuredClone||(o=>JSON.parse(JSON.stringify(o))))(ZM.P29G.geo);
 for(const bone of displayGeo.bones)for(const c of bone.cubes||[]){if(!Array.isArray(c.uv))continue;const[u,v]=c.uv,[w,h,d]=c.size.map(Math.floor);const rects={east:[u,v+d,u+d,v+d+h],north:[u+d,v+d,u+d+w,v+d+h],west:[u+d+w,v,u+2*d+w,v+d+h],south:[u+2*d+w,v+d,u+2*d+2*w,v+d+h],up:[u+d,v,u+d+w,v+d],down:[u+d+w,v+d,u+d+2*w,v]};c.uv={};for(const[name,a]of Object.entries(rects)){if(a[0]===a[2])a[0]=a[2]=a[0]+.0001;if(a[1]===a[3])a[1]=a[3]=a[1]+.0001;c.uv[name]={uv:[a[0],a[1]],uv_size:[a[2]-a[0],a[3]-a[1]]};}}
 if(window.ZMGeo?.supported())try{implant=ZMGeo.create(cv,{geo:displayGeo,anim:{},tex:'../../assets/textures/p29/sandevistan_armor.png',nearest:true,lit:.4,cam:{yaw:15,pitch:7,dist:16,target:[0,19.5,2],fov:40}});if(implant){$('#implantArt').classList.add('ready');new IntersectionObserver(e=>seen=e[0].isIntersecting).observe(cv);cv.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,yaw:implant.cam.yaw,pitch:implant.cam.pitch};cv.setPointerCapture(e.pointerId);});cv.addEventListener('pointermove',e=>{if(drag){implant.cam.yaw=drag.yaw+(e.clientX-drag.x)*.6;implant.cam.pitch=Math.max(-60,Math.min(60,drag.pitch+(e.clientY-drag.y)*.25));}});for(const event of['pointerup','pointercancel','lostpointercapture'])cv.addEventListener(event,()=>drag=null);let last=0;(function frame(t){requestAnimationFrame(frame);if(seen&&!document.hidden&&t-last>50){last=t;implant.render();}})(0);}}catch(e){console.warn('Implant uses native item fallback',e.message);}
 window.P29={get model(){return model;},get motion(){return motion;},get history(){return history;},render,consume,save,scene:null};
 /* ── главный цикл: 20 тиков в секунду, как в моде ───────────────── */
 renderBrew();render();save();let last=performance.now(),accum=0;
 setInterval(()=>{const now=performance.now(),dt=Math.min(250,now-last);last=now;if(document.hidden){accum=0;return;}
  accum+=dt;const n=Math.floor(accum/50);if(!n)return;accum-=n*50;
  for(let i=0;i<n;i++){model.movement(0,0);model.tick();if(model.state.t%10===0){history.push(model.state.psychosis);if(history.length>160)history.shift();}}
  consume();render();drawGraph();if(now-lastSave>1000)save();
 },25);addEventListener('pagehide',save);

 /* ================= fx5: обложка синхронизируется с состоянием субъекта ================= */
 (function osSync(){
  if('IntersectionObserver' in window)ZM.reveal();else $$('.reveal').forEach(el=>el.classList.add('in'));
  const mode=$('#osMode'),value=$('#osValue'),led=$('#osLed');
  if(!mode)return;
  let lastKey='';
  function sync(){
   if(!window.P29||document.hidden)return;
   const s=window.P29.model.state,installed=s.chest==='sandevistan',active=!!s.accelerating,critical=!!s.psychosisActive;
   document.body.classList.toggle('accel',active);
   document.body.classList.toggle('psycho',critical);
   document.body.classList.toggle('flatline',!s.alive);
   let key,text,val,cls;
   if(!s.alive){key='dead';text='СИГНАЛ ПОТЕРЯН';val='субъект погиб · психоз забрал имплант';cls='dead';}
   else if(critical){key='psycho';text='КИБЕРПСИХОЗ';val='нагрузка '+Math.round(s.psychosis)+'% · фаза необратима';cls='psycho';}
   else if(active){key='accel';text='УСКОРЕНИЕ АКТИВНО';val=Math.ceil((100-s.accelerationTicks)/20)+' из 5 с · мир замедлен';cls='accel';}
   else if(s.inCutscene){key='install';text='УСТАНОВКА ИМПЛАНТА';val='100 тиков · появляется на 99-м';cls='install';}
   else if(s.cooldown>0){key='cool';text='ОТКАТ';val=Math.ceil(s.cooldown/20)+' с до следующего рывка';cls='cool';}
   else if(installed){key='ready';text='СИСТЕМА ГОТОВА';val='V — запуск · 5 секунд рывка';cls='ready';}
   else{key='idle';text='СИСТЕМА ОЖИДАЕТ';val='имплант не установлен';cls='';}
   if(key!==lastKey){lastKey=key;mode.textContent=text;value.textContent=val;led.className='os-led '+cls;}
  }
  setInterval(sync,200);sync();
 })();
})();
