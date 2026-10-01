/* №24 · Электросамокат. 3D-модель и физическая лаборатория по исходникам мода. */
(()=>{
 const {$,url:URL}=ZM, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const fmt=v=>Math.round(v).toLocaleString('ru-RU');
 ZM.topbar({crumb:'№24 · Электросамокат',...ZM.pointNav(24)});
 ZM.kit.finNav(24,$('#finNav'));
 ZM.reveal?.();
 const adv=ZM.kit.adv({list:ZM.P24.advancements,store:'p24.adv',icon:a=>URL(({scooter:'assets/textures/p24/scooter_item.png',station:'assets/textures/mc/p2/item_redstone.png',speed:'assets/textures/p3/vanilla/item_barrier.png'})[a.icon]),intro:'Три скрытых достижения. Получи самокат, найди зарядный порт и разгонись до 100 км/ч на HUD.'});
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 /* Витрина: именно geo/scooter.geo.json + scooters.png из оригинального мода. */
 (()=>{
  const canvas=$('#hero3d');
  if(!window.ZMGeo?.supported()){canvas.replaceWith(Object.assign(new Image(),{src:URL('assets/textures/p24/scooter_side.png'),alt:'Оригинальный самокат, вид сбоку',className:'es-product-fallback'}));return;}
  const g=ZMGeo.create(canvas,{geo:ZM.P24G,tex:URL('assets/textures/p24/scooters.png'),mip:true});
  if(!g)return;
  const bb=g.bbox(Object.keys(g.bones).filter(n=>g.bones[n].n&&n!=='root'));
  Object.assign(g.cam,{target:[bb.c[0],bb.c[1]+1,bb.c[2]],dist:Math.max(bb.size[2]*1.75,bb.size[1]*2.45,52),yaw:-58,pitch:16,fov:42});
  let spin=true,drag=null,visible=true,last=performance.now(),roll=0;
  const btn=$('#heroSpin');btn.addEventListener('click',()=>{spin=!spin;btn.setAttribute('aria-pressed',String(spin));btn.textContent=spin?'⟳ ВРАЩЕНИЕ ВКЛ':'⟳ ВРАЩЕНИЕ ВЫКЛ';});
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,yaw:g.cam.yaw,pitch:g.cam.pitch};canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;g.cam.yaw=drag.yaw+(e.clientX-drag.x)*.42;g.cam.pitch=clamp(drag.pitch+(e.clientY-drag.y)*.25,-18,50)});
  canvas.addEventListener('pointerup',()=>drag=null);
  new IntersectionObserver(es=>visible=es[0].isIntersecting,{rootMargin:'150px'}).observe(canvas);
  function frame(t){requestAnimationFrame(frame);const dt=Math.min(.04,(t-last)/1000);last=t;if(document.hidden||!visible)return;
   if(!reduce.matches){if(spin&&!drag)g.cam.yaw+=dt*9;roll=(roll+dt*110)%360;g.setBoneRot('front_wheel',[roll,0,0]);g.setBoneRot('rear_wheel',[roll,0,0]);}
   g.render();}
  requestAnimationFrame(frame);
 })();
 const TYPES=[['iron_golem','Железный голем',8],['ravager','Разоритель',7],['hoglin','Хоглин / зоглин',6],['polar_bear','Белый медведь',5.5],['warden','Варден',12],['sniffer','Нюхач',5.5],['camel','Верблюд',5],['horse','Лошадь',4.5],['panda','Панда',4],['cow','Корова',3.5],['llama','Лама',3.5],['goat','Коза / эндермен',2.5],['pig','Свинья / овца',2.2],['zombie','Зомби / скелет / крипер',1.2],['villager','Житель',1.1],['wolf','Кот / волк / лиса',.5],['chicken','Курица / кролик / попугай',.2]];
 const typeOf=Object.fromEntries(TYPES.map(t=>[t[0],t]));
 const s={owned:false,port:false,slope:'level',running:false,keyGas:false,brake:false,parked:false,charging:false,speed:0,charge:1_000_000,distance:0,riders:[],portIndex:0};
 const mass=()=>2+s.riders.reduce((sum,r)=>sum+(r.override??typeOf[r.id][2]),0);
 const heavy=()=>clamp((mass()-1)/24,0,1);
 const say=t=>$('#stageMessage').textContent=t;
 const redraw=()=>{const kmh=s.speed*72;$('#speedTrail').style.width=clamp(kmh/180*100,0,100)+'%';$('#miniRoad').classList.toggle('moving',kmh>2&&!reduce.matches);$('#miniRoad').classList.toggle('climb',s.slope==='climb');$('#miniRoad').classList.toggle('descent',s.slope==='descent');};
 function roster(){const list=$('#roster');list.replaceChildren();s.riders.forEach((r,i)=>{const row=document.createElement('div');row.className='es-rider';
  const n=document.createElement('span');n.textContent=String(i+2).padStart(2,'0');row.append(n);
  const sel=document.createElement('select');sel.setAttribute('aria-label',`Моб на месте ${i+2}`);for(const [id,name,w] of TYPES)sel.add(new Option(`${name} · ${w}`,id));sel.value=r.id;sel.addEventListener('change',()=>{r.id=sel.value;r.override=null;roster()});row.append(sel);
  const input=document.createElement('input');input.type='number';input.min='.1';input.max='32';input.step='.1';input.value=r.override??typeOf[r.id][2];input.classList.toggle('custom',r.override!==null);input.title='Экспериментальный вес: не изменяет значения мода';input.setAttribute('aria-label',`Экспериментальная масса пассажира ${i+2}`);input.addEventListener('change',()=>{const v=Number(input.value);r.override=Number.isFinite(v)&&v>0?Math.round(clamp(v,.1,32)*10)/10:null;if(r.override===typeOf[r.id][2])r.override=null;roster()});row.append(input);
  const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label',`Убрать пассажира ${i+2}`);remove.addEventListener('click',()=>{s.riders.splice(i,1);roster()});row.append(remove);list.append(row)});$('#addPassenger').disabled=s.riders.length>=4;$('#hudMass').textContent=mass().toFixed(1);}
 $('#addPassenger').addEventListener('click',()=>{if(s.riders.length<4){s.riders.push({id:'iron_golem',override:null});roster()}});roster();
 const notes={level:'На ровной дороге предел — 80 на HUD. Для рекорда в 100 понадобится спуск.',climb:'Тяжёлый экипаж плохо берёт подъём: попробуй добавить четырёх големов.',descent:'Под уклон масса помогает разгону. Именно здесь можно пересечь отметку 100 на HUD.'};
 document.querySelectorAll('[data-slope]').forEach(b=>b.addEventListener('click',()=>{s.slope=b.dataset.slope;document.querySelectorAll('[data-slope]').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',String(x===b))});$('#routeLabel').textContent=({level:'01 / РОВНАЯ',climb:'02 / ПОДЪЁМ',descent:'03 / СПУСК'})[s.slope];$('#terrainText').textContent=notes[s.slope];redraw()}));
 $('#takeScooter').addEventListener('click',()=>{if(s.owned)return;s.owned=true;adv.grant('scooter_craft');$('#takeScooter').disabled=true;$('#takeScooter').textContent='✓ САМОКАТ В ИНВЕНТАРЕ';$('#drive').disabled=$('#stop').disabled=false;say('ВЫБЕРИ РЕЛЬЕФ И НАЖМИ «ЕХАТЬ»');hud()});
 function drive(on){if(!s.owned)return;s.running=on;if(on){s.parked=false;s.charging=false;s.brake=false}$('#drive').setAttribute('aria-pressed',String(on));$('#drive').textContent=on?'Ⅱ ПАУЗА':'▶ ЕХАТЬ';if(on)say('В ПУТИ / ВПЕРЁДИ СТАНЦИЯ');}
 $('#drive').addEventListener('click',()=>drive(!s.running));
 $('#stop').addEventListener('click',()=>{if(!s.owned)return;s.brake=true;s.running=false;$('#drive').setAttribute('aria-pressed','false');$('#drive').textContent='▶ ЕХАТЬ';say('ТОРМОЗИМ · ОСТАНОВКА У СТАНЦИИ')});
 $('#resetTrip').addEventListener('click',()=>{s.running=s.keyGas=s.brake=s.parked=s.charging=false;s.charge=1_000_000;s.speed=s.distance=0;drive(false);say('ЗАЕЗД СБРОШЕН / ДОСТИЖЕНИЯ СОХРАНЕНЫ');hud()});
 addEventListener('keydown',e=>{if(/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)||!s.owned)return;if(['w','W','ArrowUp'].includes(e.key)){s.keyGas=true;s.parked=false;s.charging=false;e.preventDefault()}if(['s','S','ArrowDown',' '].includes(e.key)){s.brake=true;e.preventDefault()}});
 addEventListener('keyup',e=>{if(['w','W','ArrowUp'].includes(e.key))s.keyGas=false;if(['s','S','ArrowDown',' '].includes(e.key))s.brake=false});addEventListener('blur',()=>s.keyGas=false);
 /* Один шаг ~один серверный тик. Без столкновений и сканирования блоков Minecraft. */
 function tick(){if(!s.owned)return;if(s.charging){s.speed=0;s.charge=Math.min(1_000_000,s.charge+500);if(s.charge>=1_000_000)s.charging=false;hud();return}
  if(s.parked&&!s.running&&!s.keyGas){hud();return}
  const h=heavy(),n=s.riders.length+1,down=s.slope==='descent'?1:0,up=s.slope==='climb'?1:0;
  const massDown=1+.85*h,pack=1+n*.08+h*.55;
  const accel=.032*(1-.55*h)*(down?1+.70*pack*massDown:up?.70*(1-.65*h):1);
  const powered=s.charge>0,pressing=(s.running||s.keyGas)&&powered;
  let target=s.speed;
  if(s.brake&&powered)target=s.speed>.03?s.speed-.085*(1-.45*h):s.speed-accel*1.15;
  else if(pressing)target=s.speed+accel+(down?.032*.55*pack*massDown:0);
  else if(down)target=s.speed*(.992+.006*h)+.032*.75*pack*massDown;
  else if(up)target=s.speed*(.94-.06*h);
  else target=s.speed*.965;
  if(Math.abs(target)<.005)target=0;
  const maxUp=(80/72)*clamp((1-(n===1?.1:n===2?.2:n===3?.3:n===4?.42:.55))-clamp((mass()-1)/10,0,2)*.1,.28,1);
  s.speed=clamp(s.speed+(target-s.speed)*(.34-.16*h),0,down?500/72:up?maxUp:(80/72)*(n>=5?.98:n===4?.99:1));
  if(s.brake&&s.speed<.008){s.speed=0;s.brake=false;s.parked=true;say('ОСТАНОВКА / ТЕПЕРЬ МОЖНО ЗАРЯЖАТЬСЯ')}
  const moved=s.speed*.5;s.distance+=moved;
  if(moved>.001&&powered)s.charge=Math.max(0,s.charge-moved*(1_000_000/15_000)*(up?1.2:1)*(mass()>=5?1.1:1));
  if(!adv.has('speed_100')&&s.speed*72>=99.5)adv.grant('speed_100');hud();}
 function hud(){$('#hudSpeed').textContent=String(Math.round(s.speed*72)).padStart(3,'0');const pct=Math.round(s.charge/10_000);$('#hudBattery').textContent=pct+'%';$('#batteryFill').style.width=pct+'%';$('#hudDistance').textContent=fmt(s.distance)+' м';$('#hudMass').textContent=mass().toFixed(1);$('#terminalFill').style.width=pct+'%';$('#terminalPct').textContent=pct+'%';
  const can=s.owned&&s.parked&&s.charge<1_000_000;$('#chargeHere').disabled=!can&&!s.charging;$('#chargeHere').textContent=s.charging?'■ ОТКЛЮЧИТЬ ЗАРЯДКУ':'ϟ ПОДКЛЮЧИТЬ САМОКАТ';$('#chargeHelp').textContent=!s.owned?'Сначала получи самокат в разделе «Испытательный трек».':s.charging?'Идёт зарядка: +1% в секунду.':s.charge>=1_000_000?'Заряд полный. Проедь маршрут, чтобы испытать станцию.':s.parked?'Самокат остановлен у станции. Можно подключаться.':'Остановись кнопкой «Тормоз» или воспользуйся тестовой перемоткой.';redraw();}
 $('#skipRoute').addEventListener('click',()=>{if(!s.owned){ZM.kit.say('Сначала получи самокат.',true);$('#experiment').scrollIntoView({behavior:'smooth'});return}s.running=s.keyGas=s.brake=s.charging=false;s.parked=true;s.speed=0;s.distance+=1500;s.charge=Math.max(0,s.charge-100_000*(mass()>=5?1.1:1)*(s.slope==='climb'?1.2:1));drive(false);say('ПРИПАРКОВАН У ЗАРЯДНОЙ СТАНЦИИ');hud()});
 $('#chargeHere').addEventListener('click',()=>{if(!s.owned||!s.parked)return;s.charging=!s.charging;say(s.charging?'ЗАРЯДКА / +1% В СЕКУНДУ':'ЗАРЯДКА ОТКЛЮЧЕНА');hud()});
 $('#takePort').addEventListener('click',()=>{if(s.port)return;s.port=true;adv.grant('find_station');$('#takePort').textContent='✓ ПОРТ В ИНВЕНТАРЕ';$('#takePort').disabled=true});
 function choosePort(i){s.portIndex=i;$('#portIndex').textContent=`ПОРТ 0${i+1} ИЗ 03`;document.querySelectorAll('[data-port]').forEach(b=>{b.classList.toggle('on',+b.dataset.port===i);b.setAttribute('aria-pressed',String(+b.dataset.port===i))});}
 document.querySelectorAll('[data-port]').forEach(b=>b.addEventListener('click',()=>{choosePort(+b.dataset.port);window.P24Station?.select(+b.dataset.port)}));
 addEventListener('p24-port',e=>choosePort(e.detail));
 hud();setInterval(tick,50);
})();
