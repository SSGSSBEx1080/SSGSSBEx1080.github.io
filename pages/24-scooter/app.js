/* №24 · Original Bedrock scooter geometry/atlas; local teaching simulation of
   ScooterEntity constants, not the Minecraft physics or a server-side ride. */
(function () {
  const { $ } = ZM, K = ZM.kit, U = ZM.url;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const fmt = n => Math.round(n).toLocaleString('ru-RU');
  ZM.topbar({ crumb: '№24 · Электросамокат', ...ZM.pointNav(24) });
  K.finNav(24, $('#finNav'));
  const adv = K.adv({ list: ZM.P24.advancements, store: 'p24.adv',
    icon: a => U(`assets/textures/p24/${a.icon}.svg`),
    intro: 'Три скрытых достижения: самокат, зарядный порт и отметка 100 на HUD.' });

  // Source geometry, not a fabricated silhouette. A transparent render of the
  // same model is the canvas fallback and the graphic in the track.
  const canvas = $('#hero3d');
  if (window.ZMGeo && ZMGeo.supported()) {
    try {
      const g = ZMGeo.create(canvas, { geo: ZM.P24G, tex: U('assets/textures/p24/scooters.png'), nearest: true, lit: .78 });
      const box = g.bbox(Object.keys(g.bones)), spinner = K.spinner(canvas, { ry: -32, rx: 0 }, 35);
      Object.assign(g.cam, { target: box.c.slice(), dist: Math.max(...box.size) * 1.92, yaw: 37, pitch: 18, fov: 37 });
      let last = 0;
      function draw(now) {
        const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
        if (!document.hidden) {
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
    water: { title: 'ВОДА', factor: .88, text: 'В воде движение каждый тик теряет скорость: коэффициент сопротивления 0,88. Дальнобойная прогулка заканчивается у берега.' },
    honey: { title: 'МЁД', factor: .55, text: 'Медовые блоки гасят скорость до 55% от прежней за тик. Промчаться сквозь липкую стену не получится.' },
    hay: { title: 'СЕНО', factor: .75, text: 'Сено снижает скорость до 75% за тик. Тормоз плавнее, чем в меду, но разгон снова придётся набирать.' },
    slime: { title: 'СЛИЗЬ', factor: 1, text: 'Слизь меняет направление столкновения: самокат отскакивает от стенки, сохраняя модуль скорости, если поверхность позволяет.' }
  };
  const state = { owned: false, port: false, charging: false, speed: 0, charge: 1000000,
    health: 500, passengers: 1, grade: 'flat', surface: 'asphalt',
    keys: { go: false, brake: false }, meters: 0, offset: 0 };
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
    $('#getScooter').disabled = state.owned; $('#pack').disabled = !state.owned;
    if (!canRide) state.keys.go = state.keys.brake = false;
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
    $('#surfaceTag').textContent = `ПОКРЫТИЕ / ${SURFACE[s.surface].title}`;
    $('#scene').dataset.surface = s.surface;
    $('#rider').classList.toggle('moving', s.owned && display > 5);
    $('#portProgress').style.width = percent + '%'; $('#portPct').textContent = Math.round(percent) + '%';
    const active = s.charging && s.port && s.owned && Math.abs(s.speed) <= .08 && s.charge < 1000000;
    $('#portLed').textContent = active ? '● CHARGING' : s.port && s.charging ? '○ WAITING' : '○ OFFLINE';
    $('#portLed').classList.toggle('on', active);
    $('#chargeBar').classList.toggle('low', percent < 15);
  }
  // 20 simulated ticks/sec. Uses the constants for acceleration, drag, HUD
  // display and movement; cannot reproduce Minecraft collisions or terrain.
  function step() {
    if (!state.owned) { present(); return; }
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
    s.speed *= SURFACE[s.surface].factor;
    const moved = Math.abs(s.speed) * .5; // MOVE_SCALE=.5, HUD_SCALE=72
    if (s.charge > 0 && moved > .001) {
      s.charge = Math.max(0, s.charge - moved * (1000000 / 15000) * (up ? 1.2 : 1));
      s.meters += moved;
    }
    if (s.port && s.charging && Math.abs(s.speed) <= .08 && s.charge < 1000000)
      s.charge = Math.min(1000000, s.charge + 500); // 1%/sec × 20 ticks
    s.offset += Math.abs(s.speed) * 19;
    if (s.speed * 72 >= 99.5) adv.grant('speed_100');
    present();
  }
  let prev = performance.now(), acc = 0;
  function loop(now) {
    const dt = Math.min(.08, (now - prev) / 1000); prev = now;
    if (!document.hidden) { acc = Math.min(.15, acc + dt); while (acc >= .05) { step(); acc -= .05; } }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  $('#getScooter').addEventListener('click', () => {
    if (state.health <= 0) { state.health = 500; state.charge = 1000000; note('Новый самокат для следующего испытания. Старый разбился об обсидиан.'); }
    state.owned = true; state.passengers = 1; $('#pax').value = 1; state.speed = 0;
    riderState(); adv.grant('scooter_craft');
    note('Самокат на трассе. Удерживай газ; для достижения 100 переключи уклон на спуск.'); present();
  });
  $('#getPort').addEventListener('click', () => {
    state.port = true; $('#getPort').disabled = true; $('#charge').disabled = false;
    adv.grant('find_station'); note('Порт у тебя в инвентаре. Подключи его; заряжает только на остановке и в радиусе двух блоков.'); present();
  });
  $('#charge').addEventListener('click', () => {
    state.charging = !state.charging;
    $('#charge').textContent = state.charging ? 'Отключить порт' : 'Подключить зарядку';
    note(state.charging ? 'Порт в двух блоках: заряд идёт при скорости ≤ 0,08 внутренних единиц. Разгон остановит процесс.' : 'Порт отключён.'); present();
  });
  $('#pack').addEventListener('click', () => {
    if (Math.abs(state.speed) > .08) { note('Нельзя складывать на ходу: притормози до 0,08 внутренней скорости.'); return; }
    if (state.passengers > 0) { note('В Minecraft складывать можно лишь БЕЗ пассажиров. Передвинь ползунок «На борту» на 0, потом складывай.'); return; }
    state.owned = false; state.charging = false; $('#charge').textContent = 'Подключить зарядку';
    riderState(); note(`Самокат сложен: предмет хранит заряд ${Math.round(state.charge / 10000)}% и прочность ${state.health}/500.`); present();
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
  for (const [selector, key] of [['#go', 'go'], ['#brake', 'brake']]) {
    const button = $(selector), on = event => {
      if (button.disabled) return; event.preventDefault(); state.keys[key] = true; button.classList.add('pressed');
      try { button.setPointerCapture(event.pointerId); } catch (_) { /* keyboard or synthesized click */ }
    }, off = () => { state.keys[key] = false; button.classList.remove('pressed'); };
    button.addEventListener('pointerdown', on);
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, off);
  }
  const keyOf = event => ({ KeyW: 'go', ArrowUp: 'go', KeyS: 'brake', ArrowDown: 'brake' })[event.code];
  addEventListener('keydown', event => {
    if (!state.owned || state.passengers < 1 || event.target.matches('input:not([type=range]),select,textarea,[contenteditable=true]') ||
      (event.target.matches('input[type=range]') && event.code.startsWith('Arrow'))) return;
    const key = keyOf(event);
    if (key) { event.preventDefault(); state.keys[key] = true; $(key === 'go' ? '#go' : '#brake').classList.add('pressed'); }
  });
  addEventListener('keyup', event => {
    const key = keyOf(event); if (key) { state.keys[key] = false; $(key === 'go' ? '#go' : '#brake').classList.remove('pressed'); }
  });
  addEventListener('blur', () => {
    state.keys.go = state.keys.brake = false;
    $('#go').classList.remove('pressed'); $('#brake').classList.remove('pressed');
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
    $('#scene').classList.add('shaken');
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
    state.grade = 'flat'; $('#grade').value = 'flat';
    note(`Экспресс-маршрут: ${fmt(distance)} блоков пройдено. Самокат припаркован у станции; осталось ${Math.round(state.charge / 10000)}% батареи. Теперь проверь порт.`); present();
  });
  riderState(); present();
})();
