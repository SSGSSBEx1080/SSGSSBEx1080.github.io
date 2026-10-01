/* №24 · Original Bedrock scooter geometry/atlas; local teaching simulation of
   ScooterEntity constants, not the Minecraft physics or a server-side ride. */
(function () {
  const { $ } = ZM, K = ZM.kit, U = ZM.url;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const fmt = n => Math.round(n).toLocaleString('ru-RU');
  ZM.topbar({ crumb: '№24 · Электросамокат', ...ZM.pointNav(24) });
  K.finNav(24, $('#finNav'));
  const adv = K.adv({ list: ZM.P24.advancements, store: 'p24.adv',
    icon: a => U(({ scooter: 'assets/textures/p24/scooter_item.png', station: 'assets/textures/mc/p2/item_redstone.png', speed: 'assets/textures/p3/vanilla/item_barrier.png' })[a.icon]),
    intro: 'Три скрытых достижения: самокат, зарядный порт и отметка 100 на HUD.' });

  // Source geometry, not a fabricated silhouette. A transparent render of the
  // same model is the canvas fallback and the graphic in the track.
  const canvas = $('#hero3d');
  if (window.ZMGeo && ZMGeo.supported()) {
    try {
      const g = ZMGeo.create(canvas, { geo: ZM.P24G, tex: U('assets/textures/p24/scooters.png'), nearest: true, lit: .78 });
      const box = g.bbox(Object.keys(g.bones)), spinner = K.spinner(canvas, { ry: -32, rx: 0 }, 35);
      Object.assign(g.cam, { target: box.c.slice(), dist: Math.max(...box.size) * 1.92, yaw: 37, pitch: 18, fov: 37 });
      let last = 0, heroVisible = true;
      new IntersectionObserver(entries => { heroVisible = entries[0].isIntersecting; }, { threshold: .01 }).observe(canvas);
      function draw(now) {
        const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
        if (!document.hidden && heroVisible && now - (draw.lastPaint || 0) > 32) {
          draw.lastPaint = now;
          if (spinner.idle() && !matchMedia('(prefers-reduced-motion: reduce)').matches) spinner.ry += dt * 9;
          g.cam.yaw = spinner.ry + 70; g.cam.pitch = 18 + spinner.rx * .4;
          g.tick(dt); g.render();
        }
        requestAnimationFrame(draw);
      }
      requestAnimationFrame(draw);
    } catch (error) {
      canvas.hidden = true; $('#modelFallback').hidden = false;
      console.warn('Scooter 3D fallback', error);
    }
  } else { canvas.hidden = true; $('#modelFallback').hidden = false; }

  const SURFACE = {
    asphalt: { title: 'АСФАЛЬТ', factor: 1, text: 'На сухой трассе самокат сохраняет ход. Обычная стена сдвигает его вдоль преграды, не выбрасывая пассажиров.' },
    water: { title: 'ВОДА', factor: .88, text: 'Вода тормозит движение до 0,88 за тик, а корпус теряет 1 прочность каждые 5 тиков (≈4 в секунду) — так устроен ScooterEntity.' },
    honey: { title: 'МЁД', factor: .55, text: 'Медовые блоки гасят скорость до 55% от прежней за тик. Промчаться сквозь липкую стену не получится.' },
    hay: { title: 'СЕНО', factor: .75, text: 'Сено снижает скорость до 75% за тик. Тормоз плавнее, чем в меду, но разгон снова придётся набирать.' },
    slime: { title: 'СЛИЗЬ', factor: 1, text: 'Слизь меняет направление столкновения: самокат отскакивает от стенки, сохраняя модуль скорости, если поверхность позволяет.' }
  };
  const state = { owned: false, port: false, charging: false, speed: 0, charge: 1000000,
    health: 500, passengers: 1, grade: 'flat', surface: 'asphalt',
    keys: { go: false, brake: false, left: false, right: false }, meters: 0, offset: 0 };
  let world = null, worldInfo = null;
  const run = { ticks: 0, started: false, finished: false, best: Number(ZM.store.get('p24.best', 0)) || 0 };
  let waterTicks = 0, mapTicks = 0;
  const clock = ticks => { const sec = ticks / 20; return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}.${Math.floor(sec * 10 % 10)}`; };
  function drawMap() {
    const cv = $('#miniMap'), g = cv.getContext('2d');
    if (!world) return;
    const loc = world.location, px = x => 70 + x * 1.8, pz = z => (40 - z) * .98;
    g.fillStyle = '#183529'; g.fillRect(0, 0, 140, 140);
    g.fillStyle = '#324936'; for (let z = 0; z < 140; z += 8) for (let x = 0; x < 140; x += 8)
      if (((x * 17 + z * 13) % 7) < 3) g.fillRect(x, z, 2, 2);
    g.fillStyle = '#737970'; g.fillRect(px(-6), 0, 12 * 1.8, 140);
    g.fillStyle = '#e5e7b9'; for (let z = 5; z < 140; z += 13) g.fillRect(69, z, 2, 5);
    for (const [x, z, color] of [[0, -32, '#c8c5b8'], [0, -45, '#ae7556'], [5, -62, '#8aea66'], [-4, -78, '#a986e2']]) {
      g.fillStyle = color; g.fillRect(px(x) - 4, pz(z) - 4, 8, 8);
    }
    for (const z of [-16, -52, -86]) { g.fillStyle = '#d5fb40'; g.fillRect(px(-7), pz(z), 2, 2); g.fillRect(px(7), pz(z), 2, 2); }
    g.fillStyle = '#8dfff4'; g.fillRect(px(5) - 3, pz(23) - 3, 7, 7);
    g.save(); g.translate(px(loc.x), pz(loc.z)); g.rotate(loc.heading);
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath(); g.fill(); g.restore();
  }
  function worldToast(text, achievement = false) {
    const el = $(achievement ? '#worldAdvToast' : '#worldToast');
    el.textContent = text; el.hidden = false; clearTimeout(el.hideTimer);
    el.hideTimer = setTimeout(() => { el.hidden = true; }, achievement ? 3800 : 2600);
  }
  function award(key, title) {
    if (adv.has(key)) return;
    adv.grant(key); worldToast(`✦ ДОСТИЖЕНИЕ ПОЛУЧЕНО · ${title}`, true);
  }
  const $log = $('#rideLog');
  function note(message, feed = true) {
    $log.textContent = message;
    if (feed) {
      const li = document.createElement('li'); li.textContent = message;
      $('#rideFeed').prepend(li);
      while ($('#rideFeed').children.length > 5) $('#rideFeed').lastElementChild.remove();
    }
  }
  function riderState() {
    const canRide = state.owned && state.passengers > 0;
    $('#go').disabled = !canRide; $('#brake').disabled = !canRide; $('#horn').disabled = !canRide;
    $('#steerL').disabled = !canRide; $('#steerR').disabled = !canRide;
    $('#getScooter').disabled = state.owned;
    $('#getScooter').textContent = state.owned ? '✓ Ты на самокате' : 'Взять самокат';
    $('#pack').disabled = !state.owned;
    if (!canRide) state.keys.go = state.keys.brake = state.keys.left = state.keys.right = false;
    $('#paxN').textContent = `${state.passengers} / 5`;
    $('#crew').replaceChildren(...Array.from({ length: state.owned ? state.passengers : 0 }, (_, index) => {
      const head = document.createElement('i'); head.style.setProperty('--i', index);
      return head;
    }));
  }
  function present() {
    const s = state, display = Math.round(Math.abs(s.speed) * 72), percent = s.charge / 10000;
    $('#speed').textContent = String(display).padStart(3, '0');
    $('#chargeN').textContent = `${Math.round(percent)}%`; $('#chargeBar').style.width = percent + '%';
    $('#healthN').textContent = `${s.health} / 500`; $('#healthBar').style.width = s.health / 5 + '%';
    $('#needle').style.left = clamp(display / 500 * 100, 0, 99) + '%';
    $('#meters').textContent = fmt(s.meters) + ' м';
    $('#range').textContent = fmt(s.charge / 1000000 * 15000) + ' м';
    $('#lines').style.backgroundPositionX = -(s.offset % 100) + 'px';
    $('#roadLabel').textContent = { flat: 'РОВНАЯ · ОГРАНИЧЕНИЕ 80', down: 'СПУСК · БЕЗ ЛИМИТА 80', up: 'ПОДЪЁМ · ГРАВИТАЦИЯ' }[s.grade];
    const beneath = s.surface === 'asphalt' && world?.location.surface === 'asphalt' ? (worldInfo?.floor || s.surface) : s.surface;
    $('#surfaceTag').textContent = `ПОД КОЛЁСАМИ / ${SURFACE[beneath].title}`;
    $('#scene').dataset.surface = s.surface;
    $('#worldGrade').dataset.grade = s.grade;
    $('#worldGrade').textContent = ({ flat: '→ РОВНО', down: '↘ УКЛОН', up: '↗ ПОДЪЁМ' })[s.grade];
    $('#rider').classList.toggle('moving', s.owned && display > 5);
    $('#portProgress').style.width = percent + '%'; $('#portPct').textContent = Math.round(percent) + '%';
    const near = !world || !!worldInfo?.nearPort;
    const active = s.charging && s.port && s.owned && near && Math.abs(s.speed) <= .08 && s.charge < 1000000;
    $('#portLed').textContent = active ? '● CHARGING' : s.port && s.charging ? near ? '○ STOP FIRST' : '○ TOO FAR' : '○ OFFLINE';
    $('#portLed').classList.toggle('on', active);
    $('#chargeBar').classList.toggle('low', percent < 15);
    $('#timerValue').textContent = run.started || run.finished ? clock(run.ticks) : '00:00.0';
    $('#bestValue').textContent = run.best ? clock(run.best) : '—';
    $('#gameHotbar').querySelectorAll('[data-slot]').forEach(button => {
      const slot = +button.dataset.slot;
      button.classList.toggle('active', slot === (s.surface === 'asphalt' ? 3 : { water: 4, honey: 5, hay: 6, slime: 7 }[s.surface]));
      button.classList.toggle('owned', (slot === 1 && s.owned) || (slot === 2 && s.port));
    });
    if (world) {
      const loc = world.location, distance = Math.round(Math.hypot(loc.x - 5, loc.z - 23));
      $('#worldCoords').textContent = `XYZ ${Math.round(loc.x)} · ${Math.round(loc.z)}`;
      $('#worldDistance').textContent = distance <= 2 ? 'ϟ ПОРТ В РАДИУСЕ 2 БЛОКОВ' : `ϟ ПОРТ ↗ ${distance} БЛОКОВ`;
      $('#worldProgress').textContent = `${loc.checkpoint} / 3 арки`;
      if (++mapTicks % 6 === 0) drawMap();
      $('#worldQuest').textContent = !s.owned ? 'ЗАДАНИЕ / ВОЗЬМИ САМОКАТ' :
        s.charge < 950000 && s.port ? 'ЗАДАНИЕ / ВЕРНИСЬ К ПОРТУ' :
        loc.checkpoint >= 3 ? 'МАРШРУТ ПРОЙДЕН · НАЙДИ ЗАРЯДКУ' : `ЗАДАНИЕ / ПРОЙДИ АРКУ 0${loc.checkpoint + 1}`;
    }
  }
  // 20 simulated ticks/sec. Uses the constants for acceleration, drag, HUD
  // display and movement; cannot reproduce Minecraft collisions or terrain.
  function step() {
    if (!state.owned) { if (world) worldInfo = world.tick(state); present(); return; }
    const s = state, heavy = clamp((s.passengers - 1) * .14, 0, 1);
    const down = s.grade === 'down' ? .85 : 0, up = s.grade === 'up' ? .55 : 0;
    const boost = 1 + s.passengers * .08 + heavy * .55;
    const accel = .032 * (1 - .55 * heavy) * (down ? 1 + .7 * down * boost * (1 + .85 * heavy) : up ? (1 - .3 * up) * (1 - .65 * heavy) : 1);
    let target = s.speed;
    if (s.keys.go && s.charge > 0 && s.passengers > 0) target += accel + (down ? .032 * .55 * down * boost * (1 + .85 * heavy) : 0);
    else if (s.keys.brake && s.passengers > 0) target -= s.speed > .03 ? .085 * (1 - .45 * heavy) : accel * 1.15;
    else if (down) target = s.speed * (.965 + (.992 + .006 * heavy - .965) * down) + .032 * .75 * down * boost * (1 + .85 * heavy);
    else target *= up ? .965 + (.94 - .06 * heavy - .965) * up : .965;
    if (Math.abs(target) < .005) target = 0;
    s.speed = clamp(s.speed + (target - s.speed) * (.34 - .16 * heavy), -18 / 72, down ? 500 / 72 : 80 / 72);
    const floor = world?.floorAt() || s.surface;
    s.speed *= SURFACE[floor].factor;
    if (!run.started && !run.finished && Math.abs(s.speed) > .05) run.started = true;
    if (run.started && !run.finished) run.ticks++;
    if (floor === 'water') {
      if (++waterTicks % 5 === 0) {
        s.health = Math.max(0, s.health - 1);
        if (s.health === 0) { s.speed = 0; s.owned = false; s.passengers = 0; riderState();
          note('ВОДА: корпус разрушен. Постоянное купание снимает по 4 прочности в секунду.'); }
      }
    } else waterTicks = 0;
    if (world) worldInfo = world.tick(s, .05);
    const moved = Math.abs(s.speed) * .5; // MOVE_SCALE=.5, HUD_SCALE=72
    if (s.charge > 0 && moved > .001) {
      s.charge = Math.max(0, s.charge - moved * (1000000 / 15000) * (up ? 1.2 : 1));
      s.meters += moved;
    }
    if (s.port && s.charging && (!world || worldInfo?.nearPort) && Math.abs(s.speed) <= .08 && s.charge < 1000000)
      s.charge = Math.min(1000000, s.charge + 500); // 1%/sec × 20 ticks
    s.offset += Math.abs(s.speed) * 19;
    if (s.speed * 72 >= 99.5) award('speed_100', '320 км/ч peek · 100 на HUD');
    present();
  }
  let prev = performance.now(), acc = 0;
  function loop(now) {
    const dt = Math.min(1, (now - prev) / 1000); prev = now;
    if (!document.hidden) { acc = Math.min(1, acc + dt); while (acc >= .05) { step(); acc -= .05; } }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  $('#getScooter').addEventListener('click', () => {
    if (state.health <= 0) { state.health = 500; state.charge = 1000000; world?.reset(); note('Новый самокат для следующего испытания. Старый разбился об обсидиан.'); }
    state.owned = true; state.passengers = 1; $('#pax').value = 1; state.speed = 0;
    riderState(); ZM.sfx('equip', .42); award('scooter_craft', 'МТС Юрент');
    note('Самокат на трассе. Удерживай газ; для достижения 100 переключи уклон на спуск.'); present();
  });
  $('#getPort').addEventListener('click', () => {
    state.port = true; $('#getPort').disabled = true; $('#charge').disabled = false;
    ZM.sfx('pop', .48); award('find_station', 'Бензина нет'); note('Порт у тебя в инвентаре. Подъедь к станции справа от старта, остановись и подключи зарядку.'); present();
  });
  $('#charge').addEventListener('click', () => {
    state.charging = !state.charging;
    $('#charge').textContent = state.charging ? 'Отключить порт' : 'Подключить зарядку';
    if (state.charging) ZM.sfx('enchant', .25);
    note(state.charging ? (world && !worldInfo?.nearPort ? 'Порт слишком далеко: подъедь к светящемуся блоку справа от старта на 2 блока.' : 'Заряд идёт только при скорости ≤ 0,08 и в двух блоках от станции.') : 'Порт отключён.'); present();
  });
  $('#pack').addEventListener('click', () => {
    if (Math.abs(state.speed) > .08) { note('Нельзя складывать на ходу: притормози до 0,08 внутренней скорости.'); return; }
    if (state.passengers > 0) { note('В Minecraft складывать можно лишь БЕЗ пассажиров. Передвинь ползунок «На борту» на 0, потом складывай.'); return; }
    state.owned = false; state.charging = false; $('#charge').textContent = 'Подключить зарядку';
    riderState(); ZM.sfx('pop', .4); note(`Самокат сложен: предмет хранит заряд ${Math.round(state.charge / 10000)}% и прочность ${state.health}/500.`); present();
  });
  $('#grade').addEventListener('change', event => {
    state.grade = event.target.value;
    note({ flat: 'Ровная дорога: HUD ограничен 80.', down: 'Спуск: лимит 80 снят, пассажиры усиливают инерцию.', up: 'Подъём: разгон тяжелее, расход заряда выше.' }[state.grade]); present();
  });
  $('#pax').addEventListener('input', event => {
    state.passengers = +event.target.value; riderState();
    note(state.passengers === 0 ? 'Все слезли. Скорость должна упасть до 0,08, прежде чем складывать самокат.' : `На борту ${state.passengers} из 5. Масса влияет на разгон и инерцию.`);
  });
  $('#horn').addEventListener('click', () => { note('Бип-бип! Сигнал из ScooterEntity.honk().'); ZM.sfx('click', .35); });
  for (const [selector, key] of [['#go', 'go'], ['#brake', 'brake'], ['#steerL', 'left'], ['#steerR', 'right'],
    ['#touchGo', 'go'], ['#touchBrake', 'brake'], ['#touchL', 'left'], ['#touchR', 'right']]) {
    const button = $(selector), on = event => {
      if (button.disabled || !state.owned || state.passengers < 1) return;
      event.preventDefault(); state.keys[key] = true; button.classList.add('pressed');
      try { button.setPointerCapture(event.pointerId); } catch (_) { /* keyboard or synthesized click */ }
    }, off = () => { state.keys[key] = false; button.classList.remove('pressed'); };
    button.addEventListener('pointerdown', on);
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, off);
  }
  const keyOf = event => ({ KeyW: 'go', ArrowUp: 'go', KeyS: 'brake', ArrowDown: 'brake',
    Space: 'brake', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' })[event.code];
  const keyButton = { go: '#go', brake: '#brake', left: '#steerL', right: '#steerR' };
  addEventListener('keydown', event => {
    if (event.target.matches('input:not([type=range]),textarea,[contenteditable=true]') ||
      ((event.target.matches('select,input[type=range]')) && event.code.startsWith('Arrow'))) return;
    if (/^Digit[1-9]$/.test(event.code) && world) {
      event.preventDefault(); $('#gameHotbar [data-slot="' + event.code.slice(-1) + '"]').click(); return;
    }
    if (!state.owned || state.passengers < 1) return;
    if (event.code === 'KeyG' && world) { event.preventDefault(); $('#worldGrade').click(); return; }
    if (event.code === 'KeyC' && world) { event.preventDefault(); $('#worldCam').click(); return; }
    if (event.code === 'KeyR' && world) { event.preventDefault(); $('#worldReset').click(); return; }
    if (event.code === 'KeyE' && state.port) { event.preventDefault(); $('#charge').click(); return; }
    if (event.code === 'KeyF') { event.preventDefault(); $('#horn').click(); return; }
    const key = keyOf(event);
    if (key) { event.preventDefault(); state.keys[key] = true; $(keyButton[key]).classList.add('pressed'); }
  });
  addEventListener('keyup', event => {
    const key = keyOf(event); if (key) { state.keys[key] = false; $(keyButton[key]).classList.remove('pressed'); }
  });
  addEventListener('blur', () => {
    state.keys.go = state.keys.brake = state.keys.left = state.keys.right = false;
    for (const selector of Object.values(keyButton)) $(selector).classList.remove('pressed');
  });

  $('#surfaceList').addEventListener('click', event => {
    const button = event.target.closest('[data-surface]'); if (!button) return;
    state.surface = button.dataset.surface;
    for (const choice of $('#surfaceList').querySelectorAll('button')) choice.setAttribute('aria-pressed', String(choice === button));
    $('#surfaceInfo').textContent = SURFACE[state.surface].text;
    note(`Трасса: ${SURFACE[state.surface].title.toLowerCase()}. ${SURFACE[state.surface].text}`); present();
  });
  function impact(message) {
    $('#collisionNote').textContent = message; note(message);
    const badge = $('#impact'); badge.textContent = message; badge.hidden = false;
    $('#scene').classList.remove('shaken'); void $('#scene').offsetWidth;
    $('#scene').classList.add('shaken'); ZM.sfx('anvil', .24);
    clearTimeout(impact.timer); impact.timer = setTimeout(() => { badge.hidden = true; $('#scene').classList.remove('shaken'); }, 2400);
    present();
  }
  $('#testWall').addEventListener('click', () => {
    if (!state.owned) { impact('Сначала возьми самокат на треке.'); return; }
    const speed = Math.abs(state.speed * 72);
    if (speed < 20) { state.speed = 0; impact('Тихий контакт: остановился у стены. Разгонись хотя бы до 20 на HUD.'); return; }
    if (state.surface === 'slime') {
      // The original mod reflects the movement vector, keeping its magnitude.
      impact(`СЛИЗЬ: отскок! ${Math.round(speed)} на HUD сохранены; направление поменялось.`);
    } else {
      state.speed *= state.surface === 'honey' ? .55 : state.surface === 'hay' ? .75 : .25;
      impact(`СТЕНА: скольжение вдоль препятствия. Все ${state.passengers} на борту — никого не сбросило.`);
    }
  });
  $('#testObsidian').addEventListener('click', () => {
    if (!state.owned) { impact('Сначала возьми самокат на треке.'); return; }
    if (Math.abs(state.speed * 72) < 70) { impact('Обсидиан опасен на скорости. Разгонись до 70 на HUD, затем попробуй ещё раз.'); return; }
    state.health = 0; state.speed = 0; state.passengers = 0; state.owned = false;
    state.charging = false; $('#charge').textContent = 'Подключить зарядку'; riderState();
    impact('ОБСИДИАН: самокат разрушен, пассажиры выброшены. Возьми новый для следующего теста.');
  });
  $('#quickRide').addEventListener('click', () => {
    if (!state.owned) { note('Сначала возьми самокат на тестовом треке.'); return; }
    const distance = Math.min(1500, Math.floor(state.charge / (1000000 / 15000)));
    if (!distance) { note('Заряд пуст. Подключи порт и дождись хотя бы одного процента.'); return; }
    state.charge = Math.max(0, state.charge - distance * (1000000 / 15000));
    state.meters += distance; state.speed = 0; state.keys.go = state.keys.brake = false;
    // An express route ends at a level charging bay, even when it started on a slope.
    state.grade = 'flat'; $('#grade').value = 'flat'; world?.park(); if (world) worldInfo = world.tick(state);
    note(`Экспресс-маршрут: ${fmt(distance)} блоков пройдено. Самокат припаркован у станции; осталось ${Math.round(state.charge / 10000)}% батареи. Теперь проверь порт.`); present();
  });
  $('#gameHotbar').addEventListener('click', event => {
    const button = event.target.closest('[data-slot]'); if (!button) return;
    const slot = +button.dataset.slot;
    if (slot === 1) {
      if (!state.owned) $('#getScooter').click();
      else if (state.passengers || Math.abs(state.speed) > .08)
        worldToast('ЧТОБЫ СЛОЖИТЬ: ОСТАНОВИСЬ И ПОСТАВЬ «НА БОРТУ» НА 0');
      else $('#pack').click();
    } else if (slot === 2) {
      if (!state.port) $('#getPort').click(); else $('#charge').click();
    } else if (button.dataset.surface) $('#surfaceList [data-surface="' + button.dataset.surface + '"]').click();
    else if (slot === 8) { if (!$('#horn').disabled) $('#horn').click(); }
    else if (slot === 9) $('#worldCam').click();
  });
  $('#worldGrade').addEventListener('click', () => {
    const grades = ['flat', 'down', 'up'];
    $('#grade').value = grades[(grades.indexOf(state.grade) + 1) % 3];
    $('#grade').dispatchEvent(new Event('change', { bubbles: true }));
    worldToast({ flat: 'РОВНАЯ ДОРОГА · ЛИМИТ 80', down: 'СПУСК · ЛИМИТ СНЯТ', up: 'ПОДЪЁМ · ТЯЖЁЛЫЙ РАЗГОН' }[state.grade]);
  });
  // The ES module initializes the 3D world after this classic script has run.
  addEventListener('scooterworldready', () => {
    try {
      world = window.ZMScooterWorld.create({ canvas: $('#ride3d'), getState: () => state,
        onCollision: ({ kind, speed }) => {
          if (kind === 'plow') {
            state.health = Math.max(1, state.health - 2);
            ZM.sfx('stone', .45);
            worldToast('ПЛУГ! ГРУНТ РАЗБИТ · −2 ПРОЧНОСТИ');
            note(`Грунт пробит на ${Math.round(speed)} HUD: тяжёлая загрузка или разгон ≥70.`); return;
          }
          if (kind === 'mob') {
            const loss = Math.max(1, Math.min(25, Math.round(speed / 22)));
            state.health = Math.max(0, state.health - loss);
            state.speed *= .9; ZM.sfx('hit', .35);
            worldToast(`СТОЛКНОВЕНИЕ С МОБОМ · −${loss} ПРОЧНОСТИ`);
            note('Слишком быстро для посадки коровы: подъезжай медленно (≤25 на HUD).');
            if (state.health === 0) { state.speed = 0; state.passengers = 0; state.owned = false; riderState(); }
            return;
          }
          if (kind === 'slime') { impact(`СЛИЗЬ: отскок без потери скорости · ${Math.round(speed)} на HUD.`); return; }
          if (kind === 'obsidian' && speed >= 70) {
            state.health = 0; state.speed = 0; state.passengers = 0; state.owned = false;
            state.charging = false; $('#charge').textContent = 'Подключить зарядку'; riderState();
            impact('ОБСИДИАН: самокат разбит, пассажиры выброшены. Возьми новый.'); return;
          }
          const damage = speed >= 20 ? Math.max(1, Math.round(speed * .045)) : 0;
          state.health = Math.max(0, state.health - damage);
          if (state.health === 0) { state.owned = false; state.passengers = 0; riderState(); }
          impact(kind === 'border' ? 'КРАЙ МИРА: разверни самокат к трассе.' :
            `КАМЕНЬ: скользим вдоль стены · −${damage} прочности · пассажиры остались.`);
        },
        onPort: () => {
          const loc = world.location;
          if (Math.abs(loc.x - 5) > 3 || Math.abs(loc.z - 23) > 3) {
            worldToast('ПОДЪЕДЬ К БЛОКУ ПОРТА · РАДИУС 2 БЛОКА'); return;
          }
          if (!state.port) $('#getPort').click();
          else if (state.owned) $('#charge').click();
        },
        onBoard: () => {
          if (!state.owned || state.passengers >= 5) return;
          state.passengers++; $('#pax').value = state.passengers; riderState();
          ZM.sfx('pop', .45); worldToast(`КОРОВА ЗАПРЫГНУЛА · ${state.passengers} / 5 НА БОРТУ`);
          note(`Попутчик подобран на низкой скорости. Теперь ${state.passengers} из 5: разгон тяжелее, спуск быстрее.`);
        },
        onCheckpoint: number => {
          ZM.sfx('orb', .6, 1 + number * .1);
          if (number === 3) {
            run.finished = true; run.started = false;
            if (!run.best || run.ticks < run.best) { run.best = run.ticks; ZM.store.set('p24.best', run.best); }
            worldToast(`ФИНИШ · ${clock(run.ticks)} · РЕКОРД ${clock(run.best)}`);
            note(`Три арки пройдены! Время: ${clock(run.ticks)}. Проверь заряд и попробуй побить рекорд.`);
          } else {
            worldToast(`✓ АРКА 0${number} / 03 · ВРЕМЯ ${clock(run.ticks)}`);
            note(`Арка ${number}/3 пройдена! Держись дороги, объезжай блоки и следи за зарядом.`);
          }
        }
      });
      if (!world) return;
      $('#ride3d').hidden = false; $('#scene').classList.add('world-ready');
      for (const id of ['gameTop', 'gameSide', 'gameTools', 'gameHotbar', 'gamePad', 'miniMapWrap', 'worldTimer']) $("#" + id).hidden = false;
      worldInfo = world.tick(state); present();
    } catch (error) { console.warn('Block-world fallback', error); world = null; }
  });
  $('#worldCam').addEventListener('click', () => {
    if (!world) return;
    const mode = world.cameraMode === 'chase' ? 'first' : 'chase'; world.setCameraMode(mode);
    $('#worldCam').textContent = mode === 'chase' ? '◉ КАМЕРА' : '⊕ ОТ 1-ГО ЛИЦА';
    $('#worldCrosshair').hidden = mode !== 'first';
    worldToast(mode === 'first' ? 'ВИД ОТ ПЕРВОГО ЛИЦА · C — ПЕРЕКЛЮЧИТЬ' : 'КАМЕРА ОТ ТРЕТЬЕГО ЛИЦА');
  });
  $('#worldReset').addEventListener('click', () => {
    if (!world) return;
    world.reset(); run.ticks = 0; run.started = run.finished = false; waterTicks = 0;
    state.passengers = state.owned ? 1 : 0; $('#pax').value = state.passengers; riderState(); state.speed = 0; state.keys.go = state.keys.brake = state.keys.left = state.keys.right = false;
    worldInfo = world.tick(state); note('Ты на старте. Держи W/газ и рули A/D; порт справа.'); present();
  });
  $('#worldExpand').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('#scene').requestFullscreen(); }
    catch (_) { worldToast('Браузер не разрешил полноэкранный режим.'); }
  });
  addEventListener('fullscreenchange', () => { $('#worldExpand').textContent = document.fullscreenElement ? '⤢' : '⛶'; });
  riderState(); present();
})();
