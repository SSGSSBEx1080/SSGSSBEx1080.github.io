(()=>{'use strict';
 const{$,$$,esc}=ZM,K=ZM.kit,Core=P29Core,store='p29.lab',fmt=(n,d=1)=>Number(n).toLocaleString('ru-RU',{minimumFractionDigits:d,maximumFractionDigits:d});
 ZM.topbar({crumb:'№29 · Сандевистан',...ZM.pointNav(29)});K.finNav(29,$('#finNav'));document.addEventListener('DOMContentLoaded',()=>document.querySelector('.zm-route')?.remove());
 let model=new Core.Model(ZM.store.get(store,null)),auto=false,motion=!matchMedia('(prefers-reduced-motion: reduce)').matches,status='',lastSave=0;
 const inputs=new Set(),history=[];
 const adv=K.adv({list:ZM.P29.advancements,store:'p29.adv',icon:a=>'../../assets/textures/p29/i/'+a.icon+'.png',intro:'Шесть скрытых достижений оригинального мода. Описания — цитаты из исходных JSON.',onGrant:a=>{P29Sound.play(a.key);}});
 const save=()=>{ZM.store.set(store,model.snapshot());lastSave=performance.now();};
 const clearInputs=()=>{inputs.clear();model.movement(0,0);$$('[data-move]').forEach(b=>b.setAttribute('aria-pressed','false'));};
 const FX={event(e){if(!motion)return;const cyan=e.type==='installed'||e.type==='ritualStart'||(e.type==='sound'&&e.name==='activate');const red=e.type==='death'||e.type==='psychosisBurst'||(e.type==='sound'&&e.name==='psychosis');if(!cyan&&!red)return;const f=$('#fxFlash');if(f){f.classList.remove('cyan','red','go');void f.offsetWidth;f.classList.add(cyan?'cyan':'red','go');}if(red){const a=$('#arena');a.classList.remove('fx-shake');void a.offsetWidth;a.classList.add('fx-shake');}}};
 function consume(){for(const e of model.drain()){if(e.type==='adv')adv.grant(e.key);if(e.type==='sound')P29Sound.play(e.name);if(e.type==='ritualStart'||e.type==='installed')P29Sound.play(e.type);window.P29?.scene?.event?.(e);FX.event(e);}}
 function action(fn,error=''){const ok=fn();status=ok?'':error;consume();render();save();return ok;}
 $('#installButton').addEventListener('click',()=>action(()=>model.requestInstall(),'Условия: город Энда, незеритовый нагрудник и две дозы.'));
 for(const id of['endCity','netheriteChest'])$('#'+id).addEventListener('change',()=>{const s=model.state;if(s.inCutscene||s.chest==='sandevistan')return;s.inCity=$('#endCity').checked;s.chest=$('#netheriteChest').checked?'netherite':'other';s.ritualReady=false;render();save();});
 $('#activate').addEventListener('click',()=>action(()=>model.toggle(),'Ускорение недоступно: нужен имплант, завершённый откат и отсутствие критической фазы.'));
 $('#inject').addEventListener('click',()=>{if(model.state.using?.kind==='inject'){model.cancelUse();render();return;}action(()=>model.inject(),'Инъекция начинается только с установленным имплантом и без активного ускорения.');});
 $('#foodDemo').addEventListener('click',()=>action(()=>model.food(),'Сначала завершите текущее использование предмета.'));
 $('#attack').addEventListener('click',()=>action(()=>model.attack(),'Цель должна быть ближе 3,3 блока. Её обычные кадры неуязвимости действуют вне ускорения.'));
 $('#spawnArrow').addEventListener('click',()=>action(()=>model.shoot()));$('#spawnTNT').addEventListener('click',()=>action(()=>model.ignite()));$('#peerActive').addEventListener('click',()=>{model.peer();render();save();});$('#resetTarget').addEventListener('click',()=>{model.resetTarget();render();save();});
 $('#autoRun').addEventListener('click',()=>{auto=!auto;$('#autoRun').setAttribute('aria-pressed',String(auto));if(!auto)clearInputs();});
 $('#waitCooldown').addEventListener('click',()=>{clearInputs();model.tick(model.state.cooldown);consume();render();save();});
 $('#restFiveMinutes').addEventListener('click',()=>{clearInputs();model.tick(6000);consume();render();save();});
 $('#resetStand').addEventListener('click',()=>{P29Sound.stop();clearInputs();auto=false;$('#autoRun').setAttribute('aria-pressed','false');model=new Core.Model();history.length=0;status='';$('#endCity').checked=$('#netheriteChest').checked=true;window.P29.scene?.reset?.();render();save();});
 // прямое управление ареной: тяни по арене — бежишь, тап — удар (мышь и сенсор)
 const arenaHost=$('#arena');let steer=null,steered=false,steerVec=null;
 const endSteer=()=>{steer=null;steered=false;steerVec=null;};
 arenaHost.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;steer={x:e.clientX,y:e.clientY};steered=false;});
 arenaHost.addEventListener('pointermove',e=>{if(!steer)return;const dx=e.clientX-steer.x,dy=e.clientY-steer.y;if(!steered&&Math.hypot(dx,dy)<12)return;steered=true;steerVec={x:Math.max(-1,Math.min(1,dx/70)),y:Math.max(-1,Math.min(1,dy/70))};});
 for(const name of['pointerup','pointercancel'])arenaHost.addEventListener(name,()=>{if(!steer)return;if(!steered)action(()=>model.attack(),'Цель должна быть ближе 3,3 блока. Её обычные кадры неуязвимости действуют вне ускорения.');endSteer();});
 const setMove=(key,on)=>{if(on)inputs.add(key);else inputs.delete(key);$$('[data-move]').forEach(b=>b.setAttribute('aria-pressed',String(inputs.has(b.dataset.move))));};
 $$('[data-move]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);setMove(b.dataset.move,true);});for(const name of['pointerup','pointercancel','lostpointercapture','blur'])b.addEventListener(name,()=>setMove(b.dataset.move,false));});
 const editable=e=>e.target.closest('input,select,textarea,[contenteditable]');
 document.addEventListener('keydown',e=>{if(editable(e))return;const inOS=$('#os').getBoundingClientRect().bottom>100&&$('#os').getBoundingClientRect().top<innerHeight;
  if(e.code==='KeyV'&&!e.repeat){e.preventDefault();action(()=>model.toggle());}
  if(inOS){const dir={KeyW:'up',KeyA:'left',KeyS:'down',KeyD:'right'}[e.code];if(dir){e.preventDefault();setMove(dir,true);}if(e.code==='Space'&&!e.repeat&&!e.target.closest('button')){e.preventDefault();action(()=>model.attack());}}
 });
 document.addEventListener('keyup',e=>{const dir={KeyW:'up',KeyA:'left',KeyS:'down',KeyD:'right'}[e.code];if(dir)setMove(dir,false);});addEventListener('blur',clearInputs);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInputs();});
 function syncMotion(){document.documentElement.classList.toggle('no-sandy-effects',!motion);$('#motionToggle').setAttribute('aria-pressed',String(motion));$('#motionToggle').textContent=motion?'ЭФФЕКТЫ ВКЛ':'БЕЗ ВСПЫШЕК';}
 $('#motionToggle').addEventListener('click',()=>{motion=!motion;syncMotion();});syncMotion();
 const brewValid=()=>$('#potionSelect').value==='strong_regeneration'&&$('#bottleSelect').value==='potion';
 function renderBrew(){$('#brewButton').disabled=!brewValid();$('#brewStatus').textContent=brewValid()?'Обычная Регенерация II + Око Энда. Один ингредиент на партию.':'Этот набор не подходит исходному рецепту.';}
 $('#potionSelect').addEventListener('change',renderBrew);$('#bottleSelect').addEventListener('change',renderBrew);
 $('#brewButton').addEventListener('click',()=>{action(()=>model.brew({potion:$('#potionSelect').value,type:$('#bottleSelect').value,bottles:Number($('#brewBottles').value)}));$('#brewStatus').textContent='Партия готова. Дозы добавлены к запасу стенда.';});
 function render(){const s=model.state,installed=s.chest==='sandevistan',active=s.accelerating,critical=s.psychosisActive;
  const phase=!s.alive?'SYSTEM FAILURE':critical?'CYBERPSYCHOSIS':s.inCutscene?'INSTALLING':active?'ACCELERATION ACTIVE':s.cooldown?'COOLDOWN':installed?'STANDBY':'AWAITING IMPLANT';
  $('#systemState').textContent=phase;$('#subjectState').textContent=!s.alive?'DECEASED':critical?'CRITICAL':installed?'ONLINE':'PREPARED';$('#systemLight').classList.toggle('active',active);$('#arena').classList.toggle('active',active);$('#arena').classList.toggle('critical',critical);
  $('#nativeHUD').hidden=!installed;$('#hudStatus').textContent='STATUS: '+(active?'ACTIVE':installed?'STANDBY':'OFFLINE');$('#hudStatus').style.color=active?'#73ff73':'#64d4d5';$('#hudTolerance').textContent='TOLERANCE: '+Math.round(s.tolerance*100)+'%';
  $('#hudLoad').style.width=s.psychosis+'%';$('#hudLoad').style.background=s.psychosis>80?'#ff4359':s.psychosis>50?'#effa47':'#4ff689';$('#hudTimer').textContent=active?'TIME: '+((100-s.accelerationTicks)/20).toFixed(1)+'s':s.cooldown?'COOLDOWN: '+(s.cooldown/20).toFixed(1)+'s':installed?'READY — PRESS [V]':!s.alive?'SIGNAL LOST':'IMPLANT REQUIRED';
  $('#trailCount').textContent='AFTERIMAGES: '+s.trail.length+' / 100';$('#targetReadout').textContent='МАНЕКЕН: '+Math.max(0,s.targetHP).toFixed(1)+' HP';
  $('#ritualOverlay').hidden=!s.inCutscene;$('#ritualCountdown').textContent=(Math.max(0,100-s.cutsceneTicks)/20).toFixed(1);$('#ritualPhase').textContent=s.cutsceneTicks<40?'Подъём / синхронизация':s.cutsceneTicks<90?'Связь с имплантом':'Фиксация в слоте нагрудника';
  $('#criticalOverlay').hidden=!critical;$('#criticalClock').textContent=!s.alive?'SUBJECT LOST':(s.psychosisTicks/20).toFixed(1)+' / 10.0s';
  $('#activate').disabled=!s.alive||!installed||s.inCutscene||critical||!active&&(s.cooldown>0||s.psychosis>=100);$('#activate').classList.toggle('active',active);$('#activateText').textContent=!s.alive?'СИСТЕМА ПОТЕРЯНА':critical?'КРИТИЧЕСКАЯ ФАЗА':active?'ОТКЛЮЧИТЬ':s.cooldown?'ОТКАТ '+fmt(s.cooldown/20)+' С':installed?'УСКОРИТЬ':'НУЖЕН ИМПЛАНТ';
  $('#installControls').hidden=installed||critical||!s.alive;$('#installButton').disabled=s.inCutscene||s.ritualReady||!s.inCity||s.chest!=='netherite'||s.doses<2;$('#endCity').disabled=$('#netheriteChest').disabled=s.inCutscene;
  $('#chestState').textContent=installed?'Сандевистан':s.chest==='netherite'?'Незеритовый':s.chest==='empty'?'Пусто':'Другой предмет';const icon=installed?'sandevistan':'netherite_chestplate';const url='../../assets/textures/p29/i/'+icon+'.png';if($('#chestIcon').getAttribute('src')!==url)$('#chestIcon').src=url;$('#curseState').textContent=s.binding?'НЕСЪЁМНОСТЬ\nУТРАТА':'—';
  $('#playerHP').textContent=fmt(Math.max(0,s.hp),1)+' / 20';$('#healthFill').style.width=(Math.max(0,s.hp)/20*100)+'%';$('#healthFill').style.background=critical?'#f85269':'#6ecb9c';
  $('#doseCount').textContent=s.doses;$('#inject').disabled=!s.alive||!installed||active||s.doses<1||!!s.using&&s.using.kind!=='inject';$('#injectText').textContent=s.using?.kind==='inject'?'ОТМЕНИТЬ ИНЪЕКЦИЮ':'ВВЕСТИ ДОЗУ';$('#useProgress').style.width=s.using?((1-s.using.remaining/s.using.total)*100)+'%':'0%';
  $('#useState').textContent=s.using?'Использование: '+fmt(s.using.remaining/20)+' с.':s.nausea?'Тошнота: '+fmt(s.nausea/20)+' с.':critical?'После запуска психоза новая доза не отменит критическую фазу.':'';
  $('#foodDemo').disabled=!s.alive||s.inCutscene||!!s.using;$('#foodTime').textContent=active?'1 тик':'32 тика';$('#cooldownTime').textContent=fmt(s.cooldown/20)+' с';$('#toleranceValue').textContent=Math.round(s.tolerance*100)+'%';$('#queuedReduction').textContent=fmt(s.psychosisToReduce);$('#waitCooldown').disabled=!s.cooldown||active||critical||s.inCutscene;$('#restFiveMinutes').disabled=!s.alive||s.inCutscene;
  $('#operatorStatus').textContent=P29Sound.state.errors.length?'Для звука нажмите кнопку «ЗВУК».':status||!s.alive&&'Субъект погиб. «Новый субъект» — отдельный прогон стенда.'||critical&&'Фаза необратима: магический урон, атака по окружающим и удаление импланта.'||active&&'Ускорение не останавливает часы мира. Нейральная нагрузка растёт.'||s.inCutscene&&'Установка занимает 100 тиков. Имплант появится на 99-м.'||s.cooldown&&'Откат идёт, психоз сам не уменьшается.'||installed&&'Система готова. Повторный V отключает ускорение раньше срока.'||'Подготовлены город Энда, незеритовый нагрудник и три дозы стенда.';
  $('#neuralPercent').textContent=(Math.floor(s.psychosis*100)/100).toFixed(2)+'%';$('#neuralPercent').style.color=s.psychosis>=80?'#fc586e':s.psychosis>=50?'#eff34b':'#b9e55d';$('#loadWarning').textContent=critical?'CRITICAL ERROR':s.psychosis>=80?'NEURAL OVERLOAD IMMINENT':s.psychosis>=50?'CAUTION':'STABLE';
  $('#attack').disabled=!s.alive||s.inCutscene;$('#autoRun').disabled=!s.alive||s.inCutscene;
 }
 const graph=$('#loadGraph'),g=graph.getContext('2d');let graphW=400,graphH=180;
 new ResizeObserver(()=>{graphW=graph.clientWidth;graphH=graph.clientHeight;const d=Math.min(devicePixelRatio||1,1.5);graph.width=Math.round(graphW*d);graph.height=Math.round(graphH*d);g.setTransform(d,0,0,d,0,0);drawGraph();}).observe(graph);
 function drawGraph(){g.clearRect(0,0,graphW,graphH);g.strokeStyle='#1e4045';g.lineWidth=1;for(const y of[20,50,80,100]){const h=graphH-y/100*graphH;g.beginPath();g.moveTo(0,h);g.lineTo(graphW,h);g.stroke();}if(history.length<2)return;g.strokeStyle=model.state.psychosis>=80?'#fb5570':'#b3e765';g.lineWidth=2;g.beginPath();history.forEach((p,i)=>{const x=i/159*graphW,y=graphH-p/100*graphH;i?g.lineTo(x,y):g.moveTo(x,y);});g.stroke();}
 // The page's isolated native armor model, including its source texture/bone turn.
 const cv=$('#implant3d');let implant=null,seen=true,drag=null;
 // The native model has sub-pixel box-UV dimensions. Sample zero-width UVs just
 // inside the intended texel to avoid GPU roundoff speckling; geometry is untouched.
 const displayGeo=structuredClone(ZM.P29G.geo);
 for(const bone of displayGeo.bones)for(const c of bone.cubes||[]){if(!Array.isArray(c.uv))continue;const[u,v]=c.uv,[w,h,d]=c.size.map(Math.floor);const rects={east:[u,v+d,u+d,v+d+h],north:[u+d,v+d,u+d+w,v+d+h],west:[u+d+w,v+d,u+2*d+w,v+d+h],south:[u+2*d+w,v+d,u+2*d+2*w,v+d+h],up:[u+d,v,u+d+w,v+d],down:[u+d+w,v+d,u+d+2*w,v]};c.uv={};for(const[name,a]of Object.entries(rects)){if(a[0]===a[2])a[0]=a[2]=a[0]+.0001;if(a[1]===a[3])a[1]=a[3]=a[1]+.0001;c.uv[name]={uv:[a[0],a[1]],uv_size:[a[2]-a[0],a[3]-a[1]]};}}

 if(window.ZMGeo?.supported())try{implant=ZMGeo.create(cv,{geo:displayGeo,anim:{},tex:'../../assets/textures/p29/sandevistan_armor.png',nearest:true,lit:.4,cam:{yaw:15,pitch:7,dist:16,target:[0,19.5,2],fov:40}});if(implant){$('#implantArt').classList.add('ready');new IntersectionObserver(e=>seen=e[0].isIntersecting).observe(cv);cv.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,yaw:implant.cam.yaw,pitch:implant.cam.pitch};cv.setPointerCapture(e.pointerId);});cv.addEventListener('pointermove',e=>{if(drag){implant.cam.yaw=drag.yaw+(e.clientX-drag.x)*.6;implant.cam.pitch=Math.max(-60,Math.min(60,drag.pitch+(e.clientY-drag.y)*.25));}});for(const event of['pointerup','pointercancel','lostpointercapture'])cv.addEventListener(event,()=>drag=null);cv.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();implant.cam.yaw+=e.key==='ArrowLeft'?-12:12;}});let last=0;(function frame(t){requestAnimationFrame(frame);if(seen&&!document.hidden&&t-last>50){last=t;implant.render();}})(0);}}catch(e){console.warn('Implant uses native item fallback',e.message);}
 window.P29={get model(){return model;},get motion(){return motion;},get history(){return history;},render,consume,save,scene:null};
 renderBrew();render();save();let last=performance.now(),accum=0;
 setInterval(()=>{const now=performance.now(),dt=Math.min(250,now-last);last=now;if(document.hidden){accum=0;clearInputs();return;}accum+=dt;const n=Math.floor(accum/50);if(!n)return;accum-=n*50;
  for(let i=0;i<n;i++){if(auto)model.movement(Math.cos(model.state.t*.025),Math.sin(model.state.t*.025));else if(steerVec)model.movement(steerVec.x,steerVec.y);else model.movement((inputs.has('right')?1:0)-(inputs.has('left')?1:0),(inputs.has('down')?1:0)-(inputs.has('up')?1:0));model.tick();if(model.state.t%10===0){history.push(model.state.psychosis);if(history.length>160)history.shift();}}
  consume();render();drawGraph();if(now-lastSave>1000)save();
 },25);addEventListener('pagehide',save);
})();
