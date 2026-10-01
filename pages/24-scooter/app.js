/* №24 · 2D illustration of source formulas. No WebGL, no fabricated masses.
   Exact structure geometry: data/p24_station.js derived from scooter_station.nbt. */
(function () {
  const { $, url: U } = ZM, K = ZM.kit;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = n => Math.round(n).toLocaleString('ru-RU');
  ZM.topbar({ crumb: '№24 · Электросамокат', ...ZM.pointNav(24) });
  K.finNav(24, $('#finNav'));
  const adv = K.adv({ list: ZM.P24.advancements, store: 'p24.adv',
    icon: a => U(({ scooter: 'assets/textures/p24/scooter_item.png', station: 'assets/textures/mc/p2/item_redstone.png', speed: 'assets/textures/p3/vanilla/item_barrier.png' })[a.icon]),
    intro: 'Получите предмет самоката, зарядный порт и отметку 100 по спидометру.' });
  // All values come from the exact ScooterMassHelper.java table (in mod-src/java/p24).
  const TYPES = [
    ['player', 'Игрок', 1], ['iron_golem', 'Железный голем', 8], ['ravager', 'Разоритель', 7],
    ['hoglin', 'Хоглин / зоглин', 6], ['polar_bear', 'Белый медведь', 5.5], ['warden', 'Варден', 12],
    ['sniffer', 'Нюхач', 5.5], ['camel', 'Верблюд', 5], ['horse', 'Лошадь', 4.5],
    ['panda', 'Панда', 4], ['cow', 'Корова', 3.5], ['llama', 'Лама', 3.5],
    ['goat', 'Коза / эндермен', 2.5], ['pig', 'Свинья / овца', 2.2],
    ['zombie', 'Зомби / скелет / крипер', 1.2], ['villager', 'Житель', 1.1],
    ['wolf', 'Волк / кот / лиса', .5], ['chicken', 'Курица / кролик / попугай', .2]
  ];
  const byType = Object.fromEntries(TYPES.map(t => [t[0], t]));
  const s = { owned: false, port: false, grade: 'flat', riders: ['player'], speed: 0,
    charge: 1000000, meters: 0, go: false, brake: false, cruise: false, charging: false, atStation: false };
  const scooter = new Image(); scooter.src = U('assets/textures/p24/scooter_side.png');
  const cv = $('#rideCanvas'), ctx = cv.getContext('2d');
  function masses() {
    const mass = 1 + s.riders.reduce((v, k) => v + byType[k][2], 0);
    return { mass, heavy: clamp((mass - 1) / 24, 0, 1), count: s.riders.length };
  }
  function crewUI() {
    const rows = $('#crewRows'); rows.replaceChildren();
    s.riders.forEach((key, i) => {
      const row = document.createElement('div'); row.className = 'sc-rider';
      const badge = document.createElement('b'); badge.className = 'sc-rnum' + (i === 0 ? ' driver' : ''); badge.textContent = String(i + 1).padStart(2, '0'); row.append(badge);
      if (i === 0) { const label = document.createElement('span'); label.textContent = 'Водитель · игрок'; label.style.flex = '1'; label.style.fontSize = '11px'; row.append(label); }
      else {
        const sel = document.createElement('select'); sel.setAttribute('aria-label', `Пассажир ${i + 1}: тип моба`);
        TYPES.forEach(([id, name, mass]) => { const option = new Option(`${name} · ${mass}`, id); sel.add(option); });
        sel.value = key; sel.addEventListener('change', () => { s.riders[i] = sel.value; crewUI(); }); row.append(sel);
      }
      const value = document.createElement('span'); value.textContent = byType[key][2].toFixed(1); row.append(value);
      if (i) { const rm = document.createElement('button'); rm.type = 'button'; rm.textContent = '×'; rm.setAttribute('aria-label', `Убрать пассажира ${i + 1}`); rm.addEventListener('click', () => { s.riders.splice(i, 1); crewUI(); }); row.append(rm); }
      rows.append(row);
    });
    const { mass, heavy } = masses(); $('#crewN').textContent = `${s.riders.length} / 5`;
    $('#totalMass').textContent = mass.toFixed(1); $('#massBar').style.width = `${Math.max(6, Math.round(heavy * 100))}%`;
    $('#massNote').textContent = `1.0 самокат + ${s.riders.map(k => byType[k][2].toFixed(1)).join(' + ')} экипаж`;
    $('#addRider').disabled = s.riders.length >= 5;
    paint();
  }
  $('#addRider').addEventListener('click', () => { if (s.riders.length < 5) { s.riders.push('iron_golem'); crewUI(); } });
  const labels = { flat: '→ РОВНАЯ ДОРОГА', down: '↘ СПУСК / МАССА ПОМОГАЕТ', up: '↗ ПОДЪЁМ / МАССА МЕШАЕТ' };
  document.querySelectorAll('[data-grade]').forEach(btn => btn.addEventListener('click', () => {
    s.grade = btn.dataset.grade;
    document.querySelectorAll('[data-grade]').forEach(b => { b.classList.toggle('on', b === btn); b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
    $('#gradeRead').textContent = labels[s.grade];
    $('#rideStatus').textContent = s.grade === 'down' ? 'НА СПУСКЕ ВОЗМОЖНО 100+ НА HUD' : s.grade === 'up' ? 'ПОДЪЁМ ТОРМОЗИТ ЭКИПАЖ · ТЯЖЁЛЫЕ МОГУТ ЗАСТРЯТЬ' : 'ЛИМИТ 80 НА HUD';
    paint();
  }));
  $('#getScooter').addEventListener('click', () => {
    if (s.owned) return; s.owned = true; adv.grant('scooter_craft');
    $('#getScooter').disabled = true; $('#getScooter').lastChild.textContent = ' ✓ Самокат получен';
    $('#go').disabled = $('#brake').disabled = $('#cruise').disabled = false;
    $('#rideStatus').textContent = 'УДЕРЖИВАЙ ГАЗ ИЛИ ВКЛЮЧИ КРУИЗ';
    display();
  });
  function cruise(on) {
    s.cruise = on; $('#cruise').setAttribute('aria-pressed', String(on));
    $('#cruise').childNodes[0].textContent = on ? '◉ КРУИЗ ' : '◎ КРУИЗ ';
  }
  $('#cruise').addEventListener('click', () => cruise(!s.cruise));
  function hold(el, key) {
    el.addEventListener('pointerdown', e => { if (el.disabled) return; e.preventDefault(); s[key] = true; el.setPointerCapture(e.pointerId); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(evt => el.addEventListener(evt, () => { s[key] = false; }));
  }
  hold($('#go'), 'go'); hold($('#brake'), 'brake');
  addEventListener('keydown', e => { if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return; if (['w', 'W', 'ArrowUp'].includes(e.key)) { if (s.owned) { s.go = true; e.preventDefault(); } }
    if (['s', 'S', 'ArrowDown', ' '].includes(e.key)) { if (s.owned) { s.brake = true; e.preventDefault(); } } });
  addEventListener('keyup', e => { if (['w', 'W', 'ArrowUp'].includes(e.key)) s.go = false; if (['s', 'S', 'ArrowDown', ' '].includes(e.key)) s.brake = false; });
  addEventListener('blur', () => { s.go = s.brake = false; });
  $('#rideReset').addEventListener('click', () => { s.speed = 0; s.charge = 1000000; s.meters = 0; s.go = s.brake = s.charging = s.atStation = false; cruise(false); $('#rideStatus').textContent = 'ПОЕЗДКА СБРОШЕНА · ДОСТИЖЕНИЯ СОХРАНЕНЫ'; display(); });
  // ScooterEntity: grade sign +up / -down, heavy=(mass-1)/24,
  // BASE_ACCEL .032, BRAKE_FORCE .085, NATURAL_FRICTION .965,
  // smooth .34→.18, HUD speed*72, movement speed*.5.
  // Constant schematic grade (.65) instead of actual terrain sampling/collisions.
  function step() {
    if (!s.owned) return;
    // At a station the scooter is parked on the station platform, not on the
    // selected test slope. Otherwise downhill coast would undo a stationary charge.
    if (s.charging) {
      s.speed = 0; s.charge = Math.min(1000000, s.charge + 500);
      if (s.charge >= 1000000) s.charging = false;
      display(); return;
    }
    if (s.atStation && !s.go && !s.cruise) { s.speed = 0; display(); return; }
    if (s.go || s.cruise) s.atStation = false;
    const { mass, heavy, count } = masses();
    const down = s.grade === 'down' ? 1 : 0, up = s.grade === 'up' ? 1 : 0;
    const massDown = 1 + .85 * heavy, massUp = 1 - .65 * heavy;
    const pack = 1 + count * .08 + heavy * .55;
    const accel = .032 * (1 - .55 * heavy) * (down ? 1 + .70 * pack * massDown : up ? .70 * massUp : 1);
    let target = s.speed;
    if (s.brake && s.charge > 0) target = s.speed > .03 ? s.speed - .085 * (1 - .45 * heavy) : s.speed - accel * 1.15;
    else if ((s.go || s.cruise) && s.charge > 0) target = s.speed + accel + (down ? .032 * .55 * pack * massDown : 0);
    else if (down) target = s.speed * (.992 + .006 * heavy) + .032 * .75 * pack * massDown;
    else if (up) target = s.speed * (.94 - .06 * heavy);
    else target = s.speed * .965;
    if (Math.abs(target) < .005) target = 0;
    s.speed = clamp(s.speed + (target - s.speed) * (.34 - .16 * heavy), -18 / 72,
      down ? 500 / 72 : up ? (80 / 72) * clamp(.90 - clamp((mass - 1) / 10, 0, 2) * .10, .28, 1) : (80 / 72) * (count >= 5 ? .98 : count === 4 ? .99 : 1));
    // Do not zero the smoothed result while accelerating: with four golems
    // one tick is < .005, but ScooterEntity thresholds the TARGET, not speed.
    if (Math.abs(s.speed) < .005 && !(s.go || s.cruise || down)) s.speed = 0;
    const moved = Math.abs(s.speed) * .5; s.meters += moved;
    if (moved > .001 && s.charge > 0) {
      const massDrain = mass >= 5 ? 1.1 : 1;
      const slopeDrain = up ? 1.2 : 1; // slopeFactor < .85 in mod, on steep ascents
      s.charge = Math.max(0, s.charge - moved * (1000000 / 15000) * massDrain * slopeDrain);
    }
    if (s.charging && Math.abs(s.speed) <= .08 && s.charge < 1000000) s.charge = Math.min(1000000, s.charge + 500);
    if (s.charging && Math.abs(s.speed) > .08) { s.charging = false; $('#rideStatus').textContent = 'ЗАРЯДКА ПРЕРВАНА / САМОКАТ ЕДЕТ'; }
    if (!adv.has('speed_100') && Math.abs(s.speed) * 72 >= 99.5) adv.grant('speed_100');
    display();
  }
  const hill = [[0,375],[65,355],[125,345],[205,305],[272,313],[355,272],[430,267],[508,246],[575,215],[650,226],[735,185],[825,165],[900,150]];
  function paint() {
    // Native 900×460 canvas; CSS scales it evenly on phones. No 3D render.
    const w = 900, h = 460, slope = s.grade === 'down' ? .18 : s.grade === 'up' ? -.18 : 0;
    ctx.clearRect(0, 0, w, h);
    const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#173e40'); sky.addColorStop(.7, '#456a61'); sky.addColorStop(1, '#829980'); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#b5ed86'; ctx.fillRect(690, 65, 93, 93); ctx.fillStyle = '#d3ffc3'; ctx.fillRect(702, 77, 69, 69);
    ctx.fillStyle = '#527b65'; ctx.beginPath(); ctx.moveTo(0, 285); hill.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    ctx.fillStyle = '#284c41'; ctx.beginPath(); ctx.moveTo(0, 325); hill.forEach(([x, y]) => ctx.lineTo(x, y + 65)); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    const roadY = x => 331 + slope * (x - 450);
    ctx.fillStyle = '#243d34'; ctx.beginPath(); ctx.moveTo(0, roadY(0)); ctx.lineTo(w, roadY(w)); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    ctx.strokeStyle = '#bcf470'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, roadY(0)); ctx.lineTo(w, roadY(w)); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.moveTo(0, roadY(0) + 62); ctx.lineTo(w, roadY(w) + 62); ctx.strokeStyle = '#9eac8c'; ctx.lineWidth = 4; ctx.setLineDash([44, 50]); ctx.lineDashOffset = -(s.meters * 22 % 94); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#132820'; for (let i = 0; i < 27; i++) {
      const x = ((i * 77 - s.meters * 6) % 940 + 940) % 940 - 30, y = roadY(x) + 13;
      ctx.fillRect(x, y, 11, 7); ctx.fillRect(x + 14, y + 11, 7, 4);
    }
    // Source-derived scooter side image; pixel avatars illustrate occupied seats.
    ctx.save(); ctx.translate(375, roadY(375) - 3); ctx.rotate(Math.atan(slope));
    ctx.fillStyle = '#061b18aa'; ctx.beginPath(); ctx.ellipse(0, 3, 125, 13, 0, 0, Math.PI * 2); ctx.fill();
    const colors = ['#e9c4a0','#a1c5d2','#c6afdf','#b3dfa8','#ebd08e'];
    s.riders.forEach((key, i) => {
      const px = -74 + i * 36, py = -120 - (i === 0 ? 10 : 0);
      ctx.fillStyle = '#142b2e'; ctx.fillRect(px + 4, py + 29, 22, 40);
      ctx.fillStyle = colors[i]; ctx.fillRect(px + 8, py, 20, 20);
      ctx.fillStyle = '#202b27'; ctx.fillRect(px + 8, py, 20, 4);
      ctx.fillStyle = '#101b1d'; ctx.fillRect(px + 23, py + 9, 3, 3);
      ctx.fillStyle = '#628c6b'; ctx.fillRect(px, py + 25, 30, 31);
      ctx.fillStyle = '#1c3931'; ctx.fillRect(px + 10, py + 55, 7, 13); ctx.fillRect(px + 21, py + 55, 7, 13);
    });
    if (scooter.complete && scooter.naturalWidth) { ctx.imageSmoothingEnabled = false; ctx.drawImage(scooter, -134, -156, 278, 166); }
    else { ctx.fillStyle = '#bac5bd'; ctx.fillRect(-115,-23,235,15); ctx.fillRect(90,-142,15,130); }
    ctx.restore();
    ctx.fillStyle = '#10251dcb'; ctx.fillRect(26, 27, 182, 53); ctx.fillStyle = '#baf652'; ctx.font = 'bold 17px monospace'; ctx.fillText(s.grade === 'down' ? '↘   DESCENT' : s.grade === 'up' ? '↗   ASCENT' : '→   FLAT', 42, 61);
    ctx.fillStyle = '#d8f8c3'; ctx.font = 'bold 13px monospace'; ctx.fillText('Z / 24', 789, 33);
  }
  scooter.onload = paint;
  function display() {
    const kmh = Math.round(Math.abs(s.speed) * 72), pct = Math.round(s.charge / 10000);
    $('#speed').textContent = String(kmh).padStart(3, '0'); $('#speedLine').style.width = `${clamp(kmh / 500 * 100, 0, 100)}%`;
    $('#chargeN').textContent = pct + '%'; $('#chargeBar').style.width = pct + '%';
    $('#meters').textContent = fmt(s.meters) + ' м'; $('#range').textContent = `≈ ${fmt(s.charge / 1000000 * 15000)} блоков осталось`;
    $('#stationChargeBar').style.width = pct + '%'; $('#stationChargeN').textContent = pct + '%';
    const canCharge = s.owned && s.charge < 999999 && Math.abs(s.speed) <= .08;
    $('#stationCharge').disabled = !canCharge;
    $('#stationCharge').textContent = s.charging ? '■ Отключить зарядку' : 'ϟ Подключить самокат ↗';
    $('#stationHint').textContent = !s.owned ? 'Возьми самокат в симуляторе.' : Math.abs(s.speed) > .08 ? 'Остановись: зарядка работает до скорости 0,08.' : s.charge >= 999999 ? 'Аккумулятор полон. Промотай маршрут для проверки.' : s.charging ? 'Зарядка идёт · +1% в секунду · порт рядом.' : 'Самокат стоит рядом с выбранным портом. Подключи зарядку.';
    if (s.charging) $('#rideStatus').textContent = `ϟ ЗАРЯДКА НА СТАНЦИИ / ${pct}%`;
    paint();
  }
  $('#stationCharge').addEventListener('click', () => { if (!s.owned) return; s.charging = !s.charging; display(); });
  $('#quickTrip').addEventListener('click', () => {
    if (!s.owned) { K.say('Сначала возьми самокат в симуляторе.', true); $('#ride').scrollIntoView({behavior:'smooth'}); return; }
    s.speed = 0; s.go = s.brake = s.charging = false; s.atStation = true; cruise(false);
    s.meters += 1500;
    const { mass } = masses(); s.charge = Math.max(0, s.charge - (1000000 / 15000) * 1500 * (mass >= 5 ? 1.1 : 1) * (s.grade === 'up' ? 1.2 : 1));
    $('#rideStatus').textContent = 'ПРОМОТКА / ПРИПАРКОВАН У СТАНЦИИ'; display();
  });
  $('#getPort').addEventListener('click', () => { if (s.port) return; s.port = true; adv.grant('find_station'); $('#getPort').textContent = '✓ Зарядный порт получен'; $('#getPort').disabled = true; });
  // Actual NBT block positions, including stone, walls, lantern, and the 3 ports.
  const st = ZM.P24ST, blocks = new Map(st.blocks.map(([x,y,z,i]) => [`${x},${y},${z}`, st.palette[i]]));
  const portZ = [3,5,7]; let chosen = 0, layer = 1;
  function material(id) {
    if (!id) return 'void'; if (id.includes('charging_port')) return 'port';
    if (id.includes('iron') || id.includes('lantern')) return 'iron';
    if (id.includes('concrete')) return 'concrete'; return 'stone';
  }
  function plan() {
    const grid = $('#stationGrid'); grid.replaceChildren();
    for (let z = 0; z < 11; z++) for (let x = 0; x < 10; x++) {
      const id = blocks.get(`${x},${layer},${z}`), port = material(id) === 'port';
      const cell = document.createElement(port ? 'button' : 'div');
      cell.className = `cell ${material(id)}${port && z === portZ[chosen] ? ' on' : ''}`;
      cell.title = `[${x}, ${layer}, ${z}] · ${id || 'воздух'}`;
      if (port) { cell.type = 'button'; cell.innerHTML = `<img src="${U('assets/textures/p24/charging_port_item.png')}" alt="">`;
        cell.setAttribute('aria-label', `Выбрать порт ${portZ.indexOf(z) + 1} из 3`);
        cell.addEventListener('click', () => { chosen = portZ.indexOf(z); $('#portLabel').textContent = `ЗАРЯДНЫЙ ПОРТ / 0${chosen + 1} ИЗ 03`; plan(); }); }
      grid.append(cell);
    }
  }
  // Orthographic facade from two actual NBT slices. X=2 contains the three
  // ports and signs; X=5 is the supporting rear wall. No invented geometry.
  const elevation = $('#stationElevation');
  for (let y = 5; y >= 0; y--) for (let z = 0; z < 11; z++) {
    const front = blocks.get(`2,${y},${z}`), rear = blocks.get(`5,${y},${z}`);
    const id = front || rear, port = material(front) === 'port';
    const cell = document.createElement('span'); cell.className = `facade-cell ${material(id)}${port ? ' port' : ''}`;
    cell.title = `[2, ${y}, ${z}]${front ? ' · ' + front : rear ? ' · задний план: ' + rear : ' · воздух'}`;
    if (port) { cell.innerHTML = `<img src="${U('assets/textures/p24/charging_port_front.png')}" alt="">`; cell.setAttribute('aria-label', `Зарядный порт ${portZ.indexOf(z) + 1}`); }
    elevation.append(cell);
  }
  $('#layerTabs').addEventListener('click', e => { const btn = e.target.closest('[data-layer]'); if (!btn) return; layer = +btn.dataset.layer;
    $('#layerTabs').querySelectorAll('button').forEach(b => { b.classList.toggle('on', b === btn); b.setAttribute('aria-pressed', String(b === btn)); }); plan(); });
  plan();
  // Diagram only: deterministic pseudo-roll illustrating source weights, not world seed.
  const map = $('#stationMap');
  for (let z = -2; z <= 2; z++) for (let x = -2; x <= 2; x++) {
    const btn = document.createElement('button'); btn.type = 'button'; btn.setAttribute('aria-label', `Ячейка ${x}, ${z}`);
    const hash = (Math.imul(x + 19, 1103515245) ^ Math.imul(z + 29, 12345)) >>> 0;
    const roll = hash % 100; const num = roll < 2 ? 3 : roll < 8 ? 2 : roll < 23 ? 1 : 0;
    btn.innerHTML = `<span>${x},${z}</span>`;
    btn.addEventListener('click', () => { map.querySelectorAll('button').forEach(b => b.classList.remove('on')); btn.classList.add('on');
      $('#stationMapDetail').textContent = `Ячейка [${x}, ${z}] · пример: ${num ? `${num} самокат${num === 1 ? '' : 'а'}` : 'без самоката'} · станция может не установиться на неподходящем рельефе.`; });
    map.append(btn); if (!x && !z) btn.click();
  }
  crewUI(); display(); setInterval(step, 50);
})();
