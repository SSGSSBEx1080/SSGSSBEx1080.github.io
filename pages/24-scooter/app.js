/* №24. A ride, not a spreadsheet. Physics is an explicitly limited illustration of
   ScooterEntity / ScooterMassHelper (the checked-in originals match the Drive MD5s).
   Server rates: 20 ticks/s, HUD = speed * 72, world movement = speed * .5 per tick. */
(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded',()=>document.querySelector('.zm-route')?.remove());
  const $ = ZM.$, K = ZM.kit, clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const scrollTo = el => el.scrollIntoView({behavior:reduce.matches ? 'instant' : 'smooth', block:'start'});
  ZM.topbar({crumb:'№24 · Электросамокат', ...ZM.pointNav(24)});
  K.finNav(24, $('#finNav'));
  const adv = K.adv({list:ZM.P24.advancements, store:'p24.adv', icon:a=>ZM.url(({scooter:'assets/textures/p24/scooter_item.png',station:'assets/textures/p24/charging_port_item.png',speed:'assets/textures/p3/vanilla/item_barrier.png'})[a.icon]), intro:'Три сувенира из одной поездки. Условия — из настоящих достижений мода.'});
  const TYPES = [
    ['iron_golem','Железный голем',8,'iron_golem'], ['villager','Житель',1.1,'villager'],
    ['pig','Свинья',2.2,'pig'], ['zombie','Зомби',1.2,'zombie'], ['player','Игрок',1,'steve'],
    ['enderman','Эндермен',2.5,'enderman'], ['ravager','Разоритель',7,null],
    ['cow','Корова',3.5,null], ['wolf','Волк / кот',.5,null], ['chicken','Курица',.2,null]
  ];
  // Entries without a matching portrait use an item silhouette, not another mob's face.
  const portraits = new Set(['iron_golem','villager','pig','zombie','player','enderman']);
  const types = Object.fromEntries(TYPES.map(t=>[t[0], t]));
  const s = {owned:false, speed:0, distance:0, charge:1000000, durability:500, riders:[null,null,null,null], slope:'level', surface:'road', running:false, gas:false, brake:false, parked:true, atPort:false, charging:false, port:0, steer:0, lane:0, tick:0};
  const mass = () => 2 + s.riders.reduce((sum,id)=>sum+(id ? types[id][2] : 0),0);
  const heavy = () => clamp((mass()-1)/24,0,1);
  const say = text => $('#stageMessage').textContent = text;
  const notes = {
    level:'Ровная дорога: предел 80 км/ч. При отпускании газа сохраняется инерция.',
    climb:'Подъём: разгон зависит от массы самоката и пассажиров.',
    descent:'Спуск: самокат ускоряется под действием гравитации. Дополнительная масса усиливает накат.'
  };
  function roster() {
    $('#roster').innerHTML = s.riders.map((id,i) => `<div class="seat ${id ? 'occupied' : ''}"><span class="seat-number">МЕСТО 0${i+2}</span><div class="seat-figure">${id ? `<img src="${portraits.has(id) ? '../../assets/textures/hub/av/'+types[id][3]+'.png' : '../../assets/textures/p23/i/name_tag.png'}" alt="${ZM.esc(types[id][1])}">` : ''}</div>${id ? `<select data-seat="${i}" aria-label="Пассажир на месте ${i+2}">${TYPES.map(([key,label,w])=>`<option value="${key}" ${key===id?'selected':''}>${label} · ${w}</option>`).join('')}</select><button class="remove" type="button" data-remove="${i}">Высадить ×</button>` : `<button type="button" class="board" data-board="${i}">Посадить ↗</button><small>Пока никого</small>`}</div>`).join('');
    $('#hudMass').textContent = mass().toFixed(1);
    const count = s.riders.filter(Boolean).length, full = count === 4;
    $('#crewHint').innerHTML = ['Водитель уже на борту.<br>Четыре места для компании.','Один уже на борту.<br>Ещё три места свободны.','Двое уже с тобой.<br>Поместятся ещё двое.','Трое на борту.<br>Осталось одно место.','Водитель и четыре пассажира.<br>Все пять мест заняты.'][count];
    $('#tripTitle').innerHTML = full ? 'Заезд: <em>полный экипаж</em>' : s.riders.some(Boolean) ? 'Заезд <em>с пассажирами</em>' : 'Испытательный <em>заезд</em>';
  }
  $('#roster').addEventListener('click', e => {
    const board = e.target.closest('[data-board]'), remove = e.target.closest('[data-remove]');
    if (board) { s.riders[+board.dataset.board] = 'iron_golem'; roster(); ZM.sfx('click',.35); }
    if (remove) { s.riders[+remove.dataset.remove] = null; roster(); }
  });
  $('#roster').addEventListener('change', e => { if (!e.target.matches('[data-seat]') || !types[e.target.value]) return; s.riders[+e.target.dataset.seat] = e.target.value; roster(); });
  document.querySelectorAll('[data-slope]').forEach(b => b.addEventListener('click', () => {
    s.slope = b.dataset.slope;
    document.querySelectorAll('[data-slope]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    $('#routeLabel').textContent = {level:'Ровный участок', climb:'Подъём', descent:'Спуск'}[s.slope];
    $('#terrainText').textContent = notes[s.slope];
    $('#roadSign').innerHTML = s.slope==='level' ? '80<br><small>ПО РОВНОЙ</small>' : s.slope==='climb' ? '↗<br><small>ПОДЪЁМ</small>' : '↘<br><small>СПУСК</small>';
    hud();
  }));
  document.querySelectorAll('[data-surface]').forEach(b => b.addEventListener('click', () => {
    s.surface = b.dataset.surface;
    document.querySelectorAll('[data-surface]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    say({road:'Снова сухая дорога.',honey:'Липко. Скорость ×0,55.',hay:'Сено гасит ход: ×0,75.',water:'Мокро. Прочность теряется даже без газа.'}[s.surface]);
  }));
  function take() {
    if (s.owned) return;
    s.owned=true; adv.grant('scooter_craft');
    $('#takeScooter').textContent='Самокат твой ✓'; $('#takeScooter').disabled=true;
    for (const id of ['drive','stop','coast']) $('#'+id).disabled=false;
    say('Водитель на месте. Можно газовать.'); hud();
  }
  $('#takeScooter').addEventListener('click', take);
  $('#startTrip').addEventListener('click', () => { take(); scrollTo($('#trip')); });
  function gas(on) {
    if (!s.owned || s.durability<=0) return;
    s.running=on; s.brake=false;
    if (on) { s.parked=false; s.atPort=false; s.charging=false; say('Едем. Попробуй другой рельеф или состав экипажа.'); }
    else say('Газ отпущен. Самокат катится по инерции.');
    hud();
  }
  $('#drive').addEventListener('click', () => gas(!s.running));
  $('#coast').addEventListener('click', () => gas(false));
  $('#stop').addEventListener('click', () => { s.running=false; s.gas=false; s.charging=false; s.brake=true; say('Тормозим. Тяжёлый экипаж остановится не сразу.'); });
  $('#resetTrip').addEventListener('click', () => {
    Object.assign(s,{speed:0,distance:0,charge:1000000,durability:500,running:false,gas:false,brake:false,parked:true,atPort:false,charging:false,lane:0,steer:0});
    say('Новый заезд. Пассажиры и достижения на месте.'); hud();
  });
  let roadVisible=false;
  new IntersectionObserver(es=>roadVisible=es[0].isIntersecting).observe($('#experiment'));
  const inputTarget = e => /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target.tagName) || e.target.isContentEditable;
  addEventListener('keydown', e => {
    if (!roadVisible || !s.owned || inputTarget(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    const key=e.key.toLowerCase();
    if (['w','ц','arrowup'].includes(key)) {s.gas=true;s.parked=false;s.atPort=false;s.charging=false; e.preventDefault();}
    if (['s','ы','arrowdown',' '].includes(key)) {s.brake=true;s.running=false;e.preventDefault();}
    if (['a','ф','arrowleft'].includes(key)) {s.steer=-1;e.preventDefault();}
    if (['d','в','arrowright'].includes(key)) {s.steer=1;e.preventDefault();}
  });
  addEventListener('keyup', e => {
    const k=e.key.toLowerCase();
    if (['w','ц','arrowup'].includes(k)) s.gas=false;
    if (['s','ы','arrowdown',' '].includes(k)) s.brake=false;
    if (['a','ф','d','в','arrowleft','arrowright'].includes(k)) s.steer=0;
  });
  function pause() {s.running=s.gas=s.brake=false;s.steer=0;hud();}
  addEventListener('blur', pause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  function tick() {
    if (!s.owned || document.hidden) return;
    s.tick++;
    if (s.charging) {s.speed=0;s.charge=Math.min(1000000,s.charge+500);if(s.charge>=1000000){s.charging=false;say('Полный заряд. Снова в путь?');}hud();return;}
    if (s.surface==='water' && s.tick%5===0 && s.durability>0) s.durability--;
    if (s.durability<=0) {s.speed=0;s.running=s.gas=false;s.parked=true;say('Прочность закончилась. Начни новый заезд — зарядка здесь не поможет.');hud();return;}
    if (s.parked && !s.running && !s.gas) {hud();return;}
    const h=heavy(), n=s.riders.filter(Boolean).length+1, down=s.slope==='descent', up=s.slope==='climb';
    const massDown=1+.85*h, pack=1+n*.08+h*.55;
    const accel=.032*(1-.55*h)*(down ? 1+.70*pack*massDown : up ? .70*(1-.65*h) : 1);
    const powered=s.charge>0;
    let target=s.speed;
    if (s.brake) target=Math.max(0,s.speed-.085*(1-.45*h));
    else if ((s.running||s.gas)&&powered) target=s.speed+accel+(down?.032*.55*pack*massDown:0);
    else if (down) target=s.speed*(.992+.006*h)+.032*.75*pack*massDown;
    else if (up) target=s.speed*(.94-.06*h);
    else target=s.speed*.965;
    const maxUp=(80/72)*clamp(1-([0,.1,.2,.3,.42,.55][n])-clamp((mass()-1)/10,0,2)*.1,.28,1);
    const cap=down ? 500/72 : up ? maxUp : (80/72)*(n>=5?.98:n===4?.99:1);
    s.speed=clamp(s.speed+(target-s.speed)*(.34-.16*h),0,cap);
    if (s.surface==='honey') s.speed*=.55;
    if (s.surface==='hay') s.speed*=.75;
    if (s.surface==='water') s.speed*=.88;
    // The stop deadzone must not eat every first acceleration tick under a heavy crew.
    if (s.speed<.005 && !(powered&&(s.running||s.gas)) && !down) s.speed=0;
    if (s.brake && s.speed<.008) {s.speed=0;s.brake=false;s.parked=true;say('Стоим. Теперь можно к зарядному порту.');}
    const moved=s.speed*.5; s.distance+=moved;
    if (powered) s.charge=Math.max(0,s.charge-moved*(1000000/15000)*(up?1.2:1)*(mass()>=5?1.1:1));
    s.lane=clamp(s.lane+s.steer*s.speed*.007*(1-.6*h),-.8,.8);
    if (s.speed*72>=99.5) adv.grant('speed_100');
    hud();
  }
  function hud() {
    const speed=Math.round(s.speed*72), pct=Math.round(s.charge/10000);
    $('#hudSpeed').textContent=String(speed).padStart(3,'0');
    $('#dialArc').style.strokeDashoffset=251.33*(1-clamp(speed/160,0,1));
    $('#dialNeedle').style.transform=`rotate(${clamp(speed/160,0,1)*145-25}deg)`;
    $('#hudDistance').textContent=Math.round(s.distance).toLocaleString('ru-RU')+' м';
    $('#hudBattery').textContent=pct+'%'; $('#batteryFill').style.width=pct+'%';
    $('#hudDurability').textContent=s.durability; $('#hudMass').textContent=mass().toFixed(1);
    $('#drive').setAttribute('aria-pressed',String(s.running));
    $('#terminalPct').textContent=pct+'%'; $('#terminalFill').style.width=pct+'%';
    $('#chargingLight').classList.toggle('on',s.charging); $('#chargeHere').classList.toggle('charging',s.charging);
    $('#chargeHere').disabled=!s.charging && !(s.owned&&s.atPort&&s.parked&&s.charge<1000000);
    $('#chargeHere').textContent=s.charging ? 'Отключить' : 'Подключить';
    $('#chargeHelp').textContent=s.charging ? 'Идёт зарядка. Каждая секунда возвращает 1%.' : !s.owned ? 'Сначала возьми самокат.' : s.charge>=1000000 ? 'Полный заряд. Можно не стоять.' : s.atPort&&s.parked ? 'Самокат у порта. Можно подключать.' : 'Сначала перенеси самокат к порту — он должен стоять рядом.';
  }
  $('#skipRoute').addEventListener('click', () => {
    if (!s.owned) {say('Сначала возьми самокат.');scrollTo($('#trip'));return;}
    Object.assign(s,{speed:0,running:false,gas:false,brake:false,charging:false,parked:true,atPort:true,steer:0});
    say('Самокат припаркован у зарядной станции.'); hud();
  });
  $('#chargeHere').addEventListener('click', () => {if($('#chargeHere').disabled)return;s.charging=!s.charging;hud();});
  function selectPort(i) {
    s.port=clamp(i,0,2);$('#portIndex').textContent=String(s.port+1).padStart(2,'0');
    document.querySelectorAll('[data-port]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.port===s.port)));
  }
  document.querySelectorAll('[data-port]').forEach(b=>b.addEventListener('click', () => {selectPort(+b.dataset.port);window.P24Station?.select(s.port);}));
  addEventListener('p24-port',e=>selectPort(e.detail));
  $('#takePort').addEventListener('click', () => {adv.grant('find_station');$('#takePort').textContent='Зарядный порт в инвентаре ✓';});
  setInterval(tick,50);
  window.P24TRIP={state:s,types,mass}; // the road renderer observes this same trip, never a second simulation
  roster(); hud();

  // Original geo + atlas, with a real image fallback. Do not mark ready until the image loads.
  const cv=$('#hero3d'), product=cv.parentElement;
  if (!window.ZMGeo?.supported()) {cv.hidden=true;$('#heroSpin').hidden=true;return;}
  try {
    const g=ZMGeo.create(cv,{geo:ZM.P24G,tex:ZM.url('assets/textures/p24/scooters.png'),mip:true});
    if (!g) {cv.hidden=true;$('#heroSpin').hidden=true;return;}
    const box=g.bbox(Object.keys(g.bones).filter(n=>g.bones[n].n));
    Object.assign(g.cam,{target:[box.c[0],box.c[1],box.c[2]],dist:Math.max(box.size[2]*1.65,box.size[1]*2.3,48),yaw:-58,pitch:15,fov:40});
    const tex=new Image();tex.onload=()=>product.classList.add('ready');tex.src=ZM.url('assets/textures/p24/scooters.png');
    let drag=null,seen=true,old=0,spin=!reduce.matches;
    $('#heroSpin').setAttribute('aria-pressed',String(spin));
    $('#heroSpin').addEventListener('click', () => {spin=!spin;$('#heroSpin').setAttribute('aria-pressed',String(spin));$('#heroSpin').textContent=spin?'Ⅱ Остановить вращение':'↔ Поверти самокат';});
    cv.addEventListener('pointerdown', e => {if(e.pointerType==='touch')return;drag={x:e.clientX,y:e.clientY,yaw:g.cam.yaw,pitch:g.cam.pitch};cv.setPointerCapture(e.pointerId);});
    cv.addEventListener('pointermove',e=>{if(!drag)return;g.cam.yaw=drag.yaw+(e.clientX-drag.x)*.45;g.cam.pitch=clamp(drag.pitch+(e.clientY-drag.y)*.25,-12,46);});
    cv.addEventListener('pointerup',()=>drag=null);cv.addEventListener('pointercancel',()=>drag=null);
    cv.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();g.cam.yaw+=e.key==='ArrowLeft'?-12:12;spin=false;}});
    new IntersectionObserver(es=>seen=es[0].isIntersecting).observe(cv);
    function frame(t) {requestAnimationFrame(frame);if(t-old<40)return;const dt=Math.min(.08,(t-old)/1000);old=t;if(!seen||document.hidden)return;if(spin&&!drag&&!reduce.matches)g.cam.yaw+=dt*5;g.render();}
    requestAnimationFrame(frame);
  } catch(e) {cv.hidden=true;$('#heroSpin').hidden=true;console.warn('Scooter model fallback',e);}
})();
