/* №24 · Night Route. New 2D interface, with original mod masses and NBT station. */
(() => {
  const { $, url: urlOf } = ZM;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const fmt = v => Math.round(v).toLocaleString('ru-RU');
  ZM.topbar({ crumb: '№24 · Электросамокат', ...ZM.pointNav(24) });
  ZM.kit.finNav(24, $('#finNav'));
  const achievements = ZM.kit.adv({
    list: ZM.P24.advancements, store: 'p24.adv',
    icon: a => urlOf(({ scooter: 'assets/textures/p24/scooter_item.png', station: 'assets/textures/mc/p2/item_redstone.png', speed: 'assets/textures/p3/vanilla/item_barrier.png' })[a.icon]),
    intro: 'Три скрытых достижения: самокат, зарядный порт и скорость 100 по HUD.'
  });
  // The numbers below are transcribed from mod-src/java/p24/ScooterMassHelper.java.
  // In the roster an override is explicitly a hypothetical test, never a mod value.
  const TYPES = [
    ['iron_golem', 'Железный голем', 8], ['ravager', 'Разоритель', 7],
    ['hoglin', 'Хоглин / зоглин', 6], ['polar_bear', 'Белый медведь', 5.5],
    ['warden', 'Варден', 12], ['sniffer', 'Нюхач', 5.5], ['camel', 'Верблюд', 5],
    ['horse', 'Лошадь', 4.5], ['panda', 'Панда', 4], ['cow', 'Корова', 3.5],
    ['llama', 'Лама', 3.5], ['goat', 'Коза / эндермен', 2.5],
    ['pig', 'Свинья / овца', 2.2], ['zombie', 'Зомби / скелет / крипер', 1.2],
    ['villager', 'Житель', 1.1], ['wolf', 'Кот / волк / лиса', .5],
    ['chicken', 'Курица / кролик / попугай', .2]
  ];
  const typeOf = Object.fromEntries(TYPES.map(t => [t[0], t]));
  const state = { owned:false, port:false, slope:'level', running:false, keyGas:false, brake:false,
    parked:false, charging:false, speed:0, charge:1_000_000, distance:0, riders:[], portIndex:0 };
  const totalMass = () => 2 + state.riders.reduce((sum, r) => sum + (r.override ?? typeOf[r.id][2]), 0);
  const heavy = () => clamp((totalMass() - 1) / 24, 0, 1);
  const roadName = { level: 'РАВНИНА · ЛИМИТ 80', climb: 'ПОДЪЁМ · МАССА МЕШАЕТ', descent: 'СПУСК · ЛИМИТ СНЯТ' };
  const scene = $('#journey'), ctx = scene.getContext('2d');
  const scooter = new Image(); scooter.src = urlOf('assets/textures/p24/scooter_side.png'); scooter.onload = draw;
  function setStatus(text) { $('#stageMessage').textContent = text; }
  function updateRoster() {
    const list = $('#roster'); list.replaceChildren();
    state.riders.forEach((r, i) => {
      const row = document.createElement('div'); row.className = 'nr-rider';
      const n = document.createElement('span'); n.textContent = String(i + 2).padStart(2,'0'); row.append(n);
      const sel = document.createElement('select'); sel.setAttribute('aria-label', `Моб на месте ${i + 2}`);
      for (const [id, name, mass] of TYPES) sel.add(new Option(`${name} · ${mass}`, id));
      sel.value = r.id; sel.addEventListener('change', () => { r.id = sel.value; r.override = null; updateRoster(); }); row.append(sel);
      const input = document.createElement('input'); input.type='number'; input.min='0.1'; input.max='32'; input.step='0.1';
      input.value = r.override ?? typeOf[r.id][2]; input.classList.toggle('custom', r.override !== null);
      input.setAttribute('aria-label', `Масса пассажира на месте ${i + 2}, игровые единицы`);
      input.title = `В моде ${typeOf[r.id][2]}; изменение — эксперимент, не изменение мода`;
      input.addEventListener('change', () => {
        const val = Number(input.value);
        r.override = Number.isFinite(val) && val > 0 ? Math.round(clamp(val, .1, 32) * 10) / 10 : null;
        if (r.override === typeOf[r.id][2]) r.override = null;
        updateRoster();
      }); row.append(input);
      const del = document.createElement('button'); del.type='button'; del.setAttribute('aria-label',`Убрать пассажира ${i + 2}`); del.textContent='×';
      del.addEventListener('click', () => { state.riders.splice(i,1); updateRoster(); }); row.append(del); list.append(row);
    });
    $('#addPassenger').disabled = state.riders.length >= 4;
    $('#hudMass').textContent = totalMass().toFixed(1);
    draw();
  }
  $('#addPassenger').addEventListener('click', () => { if (state.riders.length >= 4) return;
    state.riders.push({ id: 'iron_golem', override: null }); updateRoster(); });
  updateRoster();
  const terrainNotes = {
    level: 'На ровной дороге предел — 80 на HUD. Присмотрись к скорости: для скрытого испытания понадобится спуск.',
    climb: 'Тяжёлый состав на подъёме разгоняется хуже. Четыре голема могут вообще не тронуться: ускорение меньше порога исходного кода.',
    descent: 'Под уклон масса помогает катиться. Здесь снимается лимит 80 на HUD — можно получить достижение за отметку 100.'
  };
  document.querySelectorAll('[data-slope]').forEach(b => b.addEventListener('click', () => {
    state.slope = b.dataset.slope;
    document.querySelectorAll('[data-slope]').forEach(c => { const active = b === c; c.classList.toggle('selected', active); c.setAttribute('aria-pressed', String(active)); });
    $('#sceneName').textContent = roadName[state.slope]; $('#terrainText').textContent = terrainNotes[state.slope]; draw();
  }));
  $('#takeScooter').addEventListener('click', () => {
    if (state.owned) return;
    state.owned = true; achievements.grant('scooter_craft');
    $('#takeScooter').disabled = true; $('#takeScooter').lastChild.textContent = ' ✓ САМОКАТ В ИНВЕНТАРЕ';
    $('#drive').disabled = $('#stop').disabled = false;
    setStatus('ВЫБЕРИ РЕЛЬЕФ И НАЖМИ «ЕХАТЬ»'); updateHUD();
  });
  function driving(active) {
    if (!state.owned) return;
    state.running = active; if (active) { state.parked = false; state.charging = false; state.brake = false; }
    $('#drive').setAttribute('aria-pressed', String(active)); $('#drive').textContent = active ? 'Ⅱ ПАУЗА' : '▶ ЕХАТЬ';
    if (active) setStatus('В ПУТИ / ВПЕРЁДИ СТАНЦИЯ');
  }
  $('#drive').addEventListener('click', () => driving(!state.running));
  $('#stop').addEventListener('click', () => { if (!state.owned) return; state.brake = true; state.running = false; setStatus('ТОРМОЗИМ · ОСТАНОВКА У СТАНЦИИ'); });
  $('#resetTrip').addEventListener('click', () => { state.running = state.keyGas = state.brake = state.parked = state.charging = false;
    state.charge = 1_000_000; state.speed = state.distance = 0; driving(false);
    setStatus('ПОЕЗДКА СБРОШЕНА / ДОСТИЖЕНИЯ СОХРАНЕНЫ'); updateHUD(); });
  addEventListener('keydown', e => {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) || !state.owned) return;
    if (['w','W','ArrowUp'].includes(e.key)) { state.keyGas=true; state.parked=false; state.charging=false; e.preventDefault(); }
    if (['s','S','ArrowDown',' '].includes(e.key)) { state.brake=true; e.preventDefault(); }
  });
  addEventListener('keyup', e => { if (['w','W','ArrowUp'].includes(e.key)) state.keyGas=false;
    if (['s','S','ArrowDown',' '].includes(e.key)) state.brake=false; });
  addEventListener('blur', () => { state.keyGas=false; });
  // Approximates one server tick; no Minecraft collisions/terrain sampling.
  // Physics constants and branching follow ScooterEntity.java (20 TPS).
  function tick() {
    if (!state.owned) return;
    if (state.charging) { state.speed=0; state.charge=Math.min(1_000_000,state.charge+500);
      if (state.charge>=1_000_000) state.charging=false; updateHUD(); return; }
    if (state.parked && !state.running && !state.keyGas) { updateHUD(); return; }
    const h = heavy(), n=state.riders.length+1;
    const down = state.slope === 'descent' ? 1 : 0, up = state.slope === 'climb' ? 1 : 0;
    const massDown=1+.85*h, pack=1+n*.08+h*.55;
    const accel=.032*(1-.55*h)*(down ? 1+.70*pack*massDown : up ? .70*(1-.65*h) : 1);
    const powered=state.charge>0, pressing=(state.running || state.keyGas) && powered;
    let target=state.speed;
    if (state.brake && powered) target=state.speed>.03 ? state.speed-.085*(1-.45*h) : state.speed-accel*1.15;
    else if (pressing) target=state.speed+accel+(down ? .032*.55*pack*massDown : 0);
    else if (down) target=state.speed*(.992+.006*h)+.032*.75*pack*massDown;
    else if (up) target=state.speed*(.94-.06*h);
    else target=state.speed*.965;
    if (Math.abs(target)<.005) target=0;
    const maxUp=(80/72)*clamp((1-(n===1?.1:n===2?.2:n===3?.3:n===4?.42:.55))-clamp((totalMass()-1)/10,0,2)*.1,.28,1);
    state.speed=clamp(state.speed+(target-state.speed)*(.34-.16*h),0,down?500/72:up?maxUp:(80/72)*(n>=5?.98:n===4?.99:1));
    if (state.brake && state.speed<.008) { state.speed=0; state.brake=false; state.parked=true; setStatus('ОСТАНОВКА / ТЕПЕРЬ МОЖНО ЗАРЯЖАТЬСЯ'); }
    const moved=state.speed*.5; state.distance+=moved;
    if (moved>.001 && powered) state.charge=Math.max(0,state.charge-moved*(1_000_000/15_000)*(up?1.2:1)*(totalMass()>=5?1.1:1));
    if (!achievements.has('speed_100') && state.speed*72>=99.5) achievements.grant('speed_100');
    updateHUD();
  }
  function updateHUD() {
    $('#hudSpeed').textContent=String(Math.round(state.speed*72)).padStart(3,'0');
    const pct=Math.round(state.charge/10_000);
    $('#hudBattery').textContent=pct+'%'; $('#batteryFill').style.width=pct+'%';
    $('#hudDistance').textContent=fmt(state.distance)+' м'; $('#hudMass').textContent=totalMass().toFixed(1);
    $('#terminalFill').style.width=pct+'%'; $('#terminalPct').textContent=pct+'%';
    const can=state.owned && state.parked && state.charge<1_000_000;
    $('#chargeHere').disabled=!can && !state.charging;
    $('#chargeHere').textContent=state.charging?'■ ОТКЛЮЧИТЬ ЗАРЯДКУ':'ϟ ПОДКЛЮЧИТЬ САМОКАТ';
    $('#chargeHelp').textContent=!state.owned?'Сначала получи самокат в разделе «Поездка».':state.charging?'Идёт зарядка у порта: +1% в секунду.':state.charge>=1_000_000?'Заряд полный. Промотай маршрут, если хочешь испытать станцию.':state.parked?'Самокат остановлен у станции. Можно подключаться.':'Остановись кнопкой «Тормозить» или воспользуйся перемоткой маршрута.';
    draw();
  }
  $('#skipRoute').addEventListener('click', () => { if (!state.owned) { ZM.kit.say('Сначала получи самокат.',true); $('#route').scrollIntoView({behavior:'smooth'});return; }
    state.running=state.keyGas=state.brake=state.charging=false;state.parked=true;state.speed=0;
    state.distance+=1500;state.charge=Math.max(0,state.charge-100_000*(totalMass()>=5?1.1:1)*(state.slope==='climb'?1.2:1));
    driving(false);setStatus('ПРИПАРКОВАН У ЗАРЯДНОЙ СТАНЦИИ');updateHUD(); });
  $('#chargeHere').addEventListener('click', () => { if (!state.owned || !state.parked) return;
    state.charging=!state.charging; setStatus(state.charging?'ЗАРЯДКА / +1% В СЕКУНДУ':'ЗАРЯДКА ОТКЛЮЧЕНА');updateHUD(); });
  $('#takePort').addEventListener('click', () => { if (state.port) return; state.port=true;
    achievements.grant('find_station'); $('#takePort').textContent='✓ ПОРТ В ИНВЕНТАРЕ'; $('#takePort').disabled=true; });
  // Build an accessible 2D station facade from the original 10×6×11 NBT.
  // The front row x=2 has all three charging ports, x=5 supports the back wall.
  const station=ZM.P24ST, positions=new Map(station.blocks.map(([x,y,z,i])=>[`${x}/${y}/${z}`,station.palette[i]]));
  const ports=[3,5,7], facade=$('#stationFacade');
  const material=id => !id?'void':id.includes('charging_port')?'port':id.includes('iron')||id.includes('concrete')?'iron':'stone';
  function highlightPort() { facade.querySelectorAll('.port').forEach(b=>b.classList.toggle('selected',+b.dataset.port===state.portIndex));
    $('#portIndex').textContent=`ПОРТ 0${state.portIndex+1} ИЗ 03`; }
  for (let y=5;y>=0;y--) for (let z=0;z<11;z++) {
    const front=positions.get(`2/${y}/${z}`), behind=positions.get(`5/${y}/${z}`), port=material(front)==='port';
    const el=document.createElement(port?'button':'div');el.className=`nr-block ${material(front||behind)}`;
    el.title=`[${front?2:5},${y},${z}] · ${front||behind||'воздух'}`;
    if (port) { el.type='button'; el.dataset.port=ports.indexOf(z);
      const image=document.createElement('img');image.src=urlOf('assets/textures/p24/charging_port_front.png');image.alt='';el.append(image);
      el.setAttribute('aria-label',`Выбрать зарядный порт ${ports.indexOf(z)+1} из трёх`);
      el.addEventListener('click',()=>{state.portIndex=ports.indexOf(z);highlightPort();}); }
    facade.append(el);
  }
  highlightPort(); updateHUD();
  function draw() {
    if (!ctx) return;
    const W=960,H=490,offset=state.distance*10,slope=state.slope==='descent'?.18:state.slope==='climb'?-.18:0;
    ctx.imageSmoothingEnabled=false;
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#423f60');sky.addColorStop(.6,'#a16567');sky.addColorStop(1,'#f5ae79');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ffd7a1';ctx.fillRect(755,55,96,96);ctx.fillStyle='#ffe8b6';ctx.fillRect(767,67,72,72);
    for(let layer=0;layer<2;layer++){
      const base=layer?310:273,step=layer?105:146,speed=layer?.2:.08;
      ctx.fillStyle=layer?'#384356':'#555068';
      for(let i=-2;i<14;i++){
        const x=Math.floor(i*step-(offset*speed%step)),hgt=(i*43+layer*37)%76+32;
        ctx.fillRect(x,base-hgt,step-4,hgt+110);
        if(layer){ctx.fillStyle='#f9b782';for(let k=14;k<step-10;k+=22)for(let yy=base-hgt+12;yy<base-10;yy+=22)ctx.fillRect(x+k,yy,6,7);ctx.fillStyle='#384356';}
      }
    }
    const line=x=>354+slope*(x-W*.5);
    ctx.fillStyle='#293c4a';ctx.beginPath();ctx.moveTo(0,line(0));ctx.lineTo(W,line(W));ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
    ctx.strokeStyle='#ffc18b';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(0,line(0));ctx.lineTo(W,line(W));ctx.stroke();
    ctx.save();ctx.strokeStyle='#9a9d99';ctx.lineWidth=5;ctx.setLineDash([60,65]);ctx.lineDashOffset=-(offset%125);ctx.beginPath();ctx.moveTo(0,line(0)+77);ctx.lineTo(W,line(W)+77);ctx.stroke();ctx.restore();
    ctx.save();ctx.translate(380,line(380)-3);ctx.rotate(Math.atan(slope));
    ctx.fillStyle='#0d1b2777';ctx.beginPath();ctx.ellipse(0,9,153,17,0,0,Math.PI*2);ctx.fill();
    const colors=['#f1b993','#d9b9b2','#a0c8ce','#efcd9e','#c2b3da'];
    for(let i=0;i<state.riders.length+1;i++){
      const x=-105+i*42,y=-122-(i===0?14:0);
      ctx.fillStyle='#243c57';ctx.fillRect(x,y+22,30,56);
      ctx.fillStyle=colors[i];ctx.fillRect(x+5,y,22,22);ctx.fillStyle='#352d32';ctx.fillRect(x+5,y,22,5);
      ctx.fillStyle='#1b283a';ctx.fillRect(x+13,y+62,6,13);ctx.fillRect(x+24,y+62,6,13);
    }
    if(scooter.complete&&scooter.naturalWidth)ctx.drawImage(scooter,-150,-170,310,179);
    else {ctx.fillStyle='#9ca9b2';ctx.fillRect(-130,-23,276,17);ctx.fillRect(115,-155,14,145);}
    ctx.restore();
    ctx.fillStyle='#1c2a3cda';ctx.fillRect(25,22,220,44);ctx.fillStyle='#fff0d9';ctx.font='bold 17px monospace';ctx.fillText(roadName[state.slope].split(' · ')[0],42,50);
    ctx.fillStyle='#f6b687';ctx.font='bold 12px monospace';ctx.fillText('ZITRAKSMODE / 24',770,31);
  }
  setInterval(tick,50);
})();
