/* Г-П · Мистер П — Соль, нож и редиска.
 * Числа из исходников: NinaKnifeItem / NinaKnifeCombatHandler (×2 в спину,
 * ×1.5 сбоку, без отбрасывания), SaltOreBlock / SaltTrailBlock (дроп 4,
 * горение 2 тика, сигнал 15), RadishCropBlock (8 стадий), borscht.json,
 * NinaRecipeHistoryHandler («когда-либо держал»). */
(() => {
  'use strict';
  const { $, esc } = ZM, U = ZM.url, K = ZM.kit;
  ZM.topbar({ crumb: 'Гость П · Соль, нож и редиска' });

  const nav = $('#guestNav');
  if (nav && ZM.GUEST_POINTS) {
    const i = ZM.GUEST_POINTS.findIndex((g) => g.page && g.page.includes('/g4-'));
    const prev = ZM.GUEST_POINTS[i - 1];
    nav.innerHTML =
      (prev ? `<a href="${U(prev.page)}"><b>В</b> Назад: ${esc(prev.title)}</a>` : '') +
      `<a href="${U('index.html#guests-sec')}"><b>≡</b> Все гостевые пункты</a>` +
      `<a class="g-all" href="${U('index.html#tree/104')}"><b>❦</b> Ветка П в древе ачивок</a>`;
  }

  /* ---------- стенд-цели ---------- */
  const G = (ZM.GUEST_ADV || []).find((g) => g.id === 'g4');
  const adv = G && K ? K.adv({
    list: G.adv.map((a) => ({ key: a.key, title: a.t, color: a.mc, bold: a.b, frame: a.frame, xp: a.xp, icon: U(a.icon), desc: a.d, how: a.how })),
    store: G.store,
    icon: (a) => a.icon,
    intro: 'Цели гостя скрыты, как ачивки в игре: открываются действиями на стендах этой страницы.',
  }) : null;

  /* ============ 01. НОЖ: удар по секторам ============ */
  const zone = $('#stabZone'), facing = $('#stabFacing'), multEl = $('#stabMult');
  const R2D = 180 / Math.PI;
  let face = 0;
  function stabRender() {
    zone.style.transform = `translate(-50%,-50%) rotate(${face}deg)`;
    facing.style.setProperty('--face', face + 'deg');
    $('#stabDeg').textContent = face + '°';
    $('#stabDeg2').textContent = face + '°';
    const dot = -Math.cos(face / R2D); /* цель смотрит от 0° (вверх), атакующий снизу */
    $('#stabDot').textContent = dot.toFixed(2);
    const back = dot <= -0.5, side = Math.abs(dot) < 0.5;
    multEl.textContent = back ? '×2' : side ? '×1.5' : '×1';
    multEl.className = 'stab-mult' + (side ? ' side' : !back ? ' front' : '');
  }
  $('#stabRange').addEventListener('input', (e) => { face = +e.target.value; stabRender(); });
  $('#stabHit').addEventListener('click', () => {
    const dot = -Math.cos(face / R2D);
    const mult = dot <= -0.5 ? 2 : Math.abs(dot) < 0.5 ? 1.5 : 1;
    const dmg = 3 * mult;
    const f = document.createElement('b');
    f.className = 'dmg-float'; f.textContent = '−' + dmg.toFixed(mult === 1.5 ? 1 : 0);
    $('#stabArena').appendChild(f);
    setTimeout(() => f.remove(), 900);
    ZM.sfx('hit', .4, mult === 2 ? .8 : 1);
  });
  stabRender();

  /* ============ 01б. стрижка быка ============ */
  let bull = 'normal';
  const bullImg = $('#bullImg'), bullOut = $('#bullOut');
  $('#bullShear').addEventListener('click', () => {
    if (bull !== 'normal') return;
    const copper = Math.random() < 0.5;
    ZM.sfx('cloth', .6, 1.1);
    if (copper) {
      bull = 'copper'; bullImg.src = U('assets/textures/p22/cow_bull_copper.png');
      bullOut.innerHTML = '<span class="g-islot" data-tip="Медный бык" data-tip-sub="вариант быка"><img src="' + U('assets/textures/p22/cow_bull_copper.png') + '" alt="Медный бык"></span>';
    } else {
      bull = 'bald'; bullImg.src = U('assets/textures/p22/cow_bull_bald.png');
      const n = 1 + (Math.random() * 2 | 0);
      bullOut.innerHTML = '<span class="g-islot" data-tip="Кожа ×' + n + '" data-tip-sub="выпадает из лысого быка"><img src="' + U('assets/textures/p22/i/leather.png') + '" alt="Кожа"><b>' + n + '</b></span>';
    }
    $('#bullShear').disabled = true;
  });
  $('#bullReset').addEventListener('click', () => { bull = 'normal'; bullImg.src = U('assets/textures/p22/cow_bull.png'); bullOut.innerHTML = ''; $('#bullShear').disabled = false; });

  /* ============ 02. СОЛЬ: фитиль с лампой ============ */
  const COLS = 14, ROWS = 7, TORCH = { r: 3, c: 0 }, LAMP = { r: 3, c: 13 };
  const grid = $('#fuseGrid');
  grid.style.gridTemplateColumns = `48px repeat(${COLS - 2}, 1fr) 48px`;
  const cells = []; /* 0 пусто · 1 соль · 2 горит */
  const life = [];
  const btns = [];
  let burning = false, burned = 0, runBurned = 0, lampOn = false;
  for (let r = 0; r < ROWS; r++) {
    cells.push(Array(COLS).fill(0)); life.push(Array(COLS).fill(0)); btns.push([]);
    for (let c = 0; c < COLS; c++) {
      const b = document.createElement('button');
      b.type = 'button';
      if (r === TORCH.r && c === TORCH.c) { b.className = 'torch'; b.setAttribute('aria-label', 'Рычаг: источник сигнала'); b.innerHTML = '<i></i>'; b.tabIndex = -1; }
      else if (r === LAMP.r && c === LAMP.c) { b.className = 'lamp'; b.setAttribute('aria-label', 'Красная лампа: приёмник сигнала'); b.innerHTML = '<i></i>'; b.tabIndex = -1; }
      else b.setAttribute('aria-label', `Клетка ${c + 1},${r + 1}`);
      grid.appendChild(b); btns[r].push(b);
    }
  }
  const salt = (r, c) => cells[r][c] >= 1;
  let saltOwned = 0;
  function paintCell(r, c, add) {
    if ((r === TORCH.r && c === TORCH.c) || (r === LAMP.r && c === LAMP.c)) return;
    if (burning && add) return;
    cells[r][c] = add ? 1 : 0;
    if (add && adv) adv.grant('salt_fuse');
    renderFuse();
  }
  $('#mineSalt').addEventListener('click', () => {
    saltOwned += 4; $('#saltOwned').textContent = saltOwned;
    ZM.sfx('stone', .5, 1.15); ZM.sfx('orb', .3, 1.3);
    if (adv) adv.grant('salt_discovery');
  });
  function renderFuse() {
    let n = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const b = btns[r][c];
      if ((r === TORCH.r && c === TORCH.c) || (r === LAMP.r && c === LAMP.c)) continue;
      const v = cells[r][c];
      if (v) n++;
      const hor = (c > 0 && salt(r, c - 1)) || (c < COLS - 1 && salt(r, c + 1));
      const ver = (r > 0 && salt(r - 1, c)) || (r < ROWS - 1 && salt(r + 1, c));
      b.className = v === 2 ? 'lit' : v === 1 ? 'salt' : '';
      if (v) {
        if (hor && ver) b.innerHTML = '<i class="w"></i>';
        else if (hor) b.innerHTML = '<i class="h"></i>';
        else if (ver) b.innerHTML = '<i class="v"></i>';
        else b.innerHTML = '<i class="w"></i>';
      } else b.innerHTML = '';
    }
    btns[LAMP.r][LAMP.c].classList.toggle('on', lampOn);
    $('#fusePlaced').textContent = n;
    $('#fuseBurned').textContent = burned;
  }
  let painting = null;
  grid.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    e.preventDefault();
    outer: for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (btns[r][c] === b) {
      if ((r === TORCH.r && c === TORCH.c) || (r === LAMP.r && c === LAMP.c)) break outer;
      painting = cells[r][c] ? false : true;
      paintCell(r, c, painting);
      break outer;
    }
  });
  grid.addEventListener('pointerover', (e) => {
    if (painting === null || !e.target.closest) return;
    const b = e.target.closest('button'); if (!b) return;
    outer2: for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (btns[r][c] === b) { paintCell(r, c, painting); break outer2; }
  });
  addEventListener('pointerup', () => (painting = null));
  $('#fuseClear').addEventListener('click', () => { if (burning) return; for (let r = 0; r < ROWS; r++) cells[r].fill(0); renderFuse(); });
  $('#fuseIgnite').addEventListener('click', () => {
    if (burning) return;
    const c = TORCH.c + 1, r = TORCH.r;
    if (!salt(r, c)) { $('#fuseSignal').textContent = 'СИГНАЛ: — (СОЛИ РЯДОМ НЕТ)'; return; }
    cells[r][c] = 2; life[r][c] = 2; burning = true; runBurned = 0;
    $('#fuseSignal').textContent = 'СИГНАЛ: 15';
    ZM.sfx('click', .4, 1.3);
    renderFuse();
    const step = () => {
      if (!document.hidden) {
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          if (cells[r][c] === 2) {
            for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && cells[nr][nc] === 1) { cells[nr][nc] = 2; life[nr][nc] = 2; }
            }
          }
        }
        /* лампа: сигнал 15 доходит до соседней соли */
        lampOn = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dr, dc]) => {
          const nr = LAMP.r + dr, nc = LAMP.c + dc;
          return nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && cells[nr][nc] === 2;
        });
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          if (cells[r][c] === 2 && --life[r][c] <= 0) { cells[r][c] = 0; burned++; runBurned++; }
        }
        renderFuse();
        const anyLit = cells.flat().includes(2);
        if (!anyLit) {
          burning = false; lampOn = false; renderFuse();
          $('#fuseSignal').textContent = 'СИГНАЛ: —';
          ZM.sfx('pop', .4, .8);
          return;
        }
      }
      setTimeout(step, 100);
    };
    setTimeout(step, 100);
  });
  renderFuse();

  /* ============ 03. РЕДИСКА: грядка ============ */
  const plots = $('#farmPlots');
  let stage = [], radCount = 1, friedCount = 0, cooking = null;
  for (let i = 0; i < 6; i++) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'plot';
    b.setAttribute('aria-label', 'Грядка ' + (i + 1));
    b.addEventListener('click', () => {
      if (stage[i] === -1) {
        if (radCount < 1) return;
        radCount--; stage[i] = 0; ZM.sfx('wood', .4, 1.4); farmRender();
      } else if (stage[i] === 7) {
        stage[i] = -1; radCount++; ZM.sfx('pop', .5, 1.1); farmRender();
        if (adv) adv.grant('radish');
      }
    });
    plots.appendChild(b); stage.push(-1);
  }
  function farmRender() {
    [...plots.children].forEach((b, i) => {
      b.classList.toggle('ready', stage[i] === 7);
      b.innerHTML = stage[i] >= 0 ? `<img src="${U('assets/textures/guest/radish_crop/stage' + stage[i] + '.png')}" alt="Редиска, стадия ${stage[i]}">` : '';
    });
    $('#radCount').textContent = radCount;
    $('#friedCount').textContent = friedCount;
    $('#cookBtn').disabled = cooking !== null || radCount < 1;
  }
  $('#tickBtn').addEventListener('click', () => {
    for (let t = 0; t < 10; t++) stage.forEach((s, i) => { if (s >= 0 && s < 7 && Math.random() < .16) stage[i] = s + 1; });
    ZM.sfx('cloth', .25, 1.3); farmRender();
  });
  $('#mealBtn').addEventListener('click', () => {   /* костная мука: +1 стадия случайной грядке */
    const growing = stage.map((s, i) => [s, i]).filter(([s]) => s >= 0 && s < 7);
    if (!growing.length) { $('#farmNote').textContent = 'Расти нечему: посади редиску или дождись спелых.'; return; }
    const [, i] = growing[(Math.random() * growing.length) | 0];
    stage[i]++;
    ZM.sfx('cloth', .45, .8); farmRender();
    $('#farmNote').textContent = 'Костная мука: грядка ' + (i + 1) + ' перескочила на стадию ' + stage[i] + '.';
  });
  $('#harvestAll').addEventListener('click', () => {
    let n = 0; stage.forEach((s, i) => { if (s === 7) { stage[i] = -1; n++; } });
    if (n) { radCount += n; ZM.sfx('pop', .5, 1.2); if (adv) adv.grant('radish'); }
    farmRender();
  });
  $('#farmReset').addEventListener('click', () => { stage.fill(-1); farmRender(); });
  $('#cookBtn').addEventListener('click', () => {
    if (cooking !== null || radCount < 1) return;
    cooking = 0; farmRender();
    const iv = setInterval(() => {
      cooking += 2; /* два тика за шаг */
      $('#cookFill').style.width = Math.min(100, cooking) + '%';
      if (cooking >= 100) {
        clearInterval(iv); cooking = null; radCount--; friedCount++;
        $('#cookFill').style.width = '0%';
        ZM.sfx('pop', .5, .9); farmRender();
        if (adv) adv.grant('fried_radish');
      }
    }, 16);
  });
  farmRender();

  /* ============ 04. БОРЩ: крафт, еда и память рецептов ============ */
  let borschtCount = 0, bowlCount = 0, eatHunger = 8;
  const H_FULL = U('assets/textures/p22/i/h_full.png'), H_HALF = U('assets/textures/p22/i/h_half.png'), H_EMPTY = U('assets/textures/p22/i/h_box.png');
  function eatRender() {
    $('#borschtCount').textContent = borschtCount;
    $('#bowlCount').textContent = bowlCount;
    $('#eatBtn').disabled = borschtCount < 1 || eatHunger >= 20;
    const bar = $('#eatBar');
    bar.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const img = document.createElement('img');
      const v = eatHunger - i * 2;
      img.src = v >= 2 ? H_FULL : v === 1 ? H_HALF : H_EMPTY;
      img.alt = '';
      bar.appendChild(img);
    }
  }
  $('#takeBorscht').addEventListener('click', () => {
    borschtCount++; ZM.sfx('pop', .5, 1.15);
    eatRender();
  });
  $('#eatBtn').addEventListener('click', () => {
    if (borschtCount < 1 || eatHunger >= 20) return;
    borschtCount--; bowlCount++; eatHunger = Math.min(20, eatHunger + 10);
    ZM.sfx('pop', .5, .95);
    if (adv) adv.grant('borscht');
    $('#eatNote').innerHTML = '+10 голода и ×0.8 насыщения. Миска <b>вернулась в инвентарь</b> — как в исходнике.';
    eatRender();
  });
  $('#fastBtn2').addEventListener('click', () => { eatHunger = Math.max(0, eatHunger - 7); eatRender(); });
  eatRender();

  const knU = $('#knifeUnlock'), boU = $('#borschtUnlock');
  const unlockRender = () => {
    const knife = $('#hadIngot').checked;
    const borscht = $('#hadSalt').checked || $('#hadRadish').checked || $('#hadPotato').checked;
    knU.textContent = knife ? 'РЕЦЕПТ: ОТКРЫТ НАВСЕГДА' : 'РЕЦЕПТ: НЕИЗВЕСТЕН';
    knU.classList.toggle('ok', knife);
    boU.textContent = borscht ? 'РЕЦЕПТ: ОТКРЫТ НАВСЕГДА' : 'РЕЦЕПТ: НЕИЗВЕСТЕН';
    boU.classList.toggle('ok', borscht);
  };
  for (const id of ['hadIngot', 'hadSalt', 'hadRadish', 'hadPotato']) $('#' + id).addEventListener('change', (e) => { ZM.sfx('click', .3); unlockRender(); });
  unlockRender();
  $('#takeKnife').addEventListener('click', () => {
    ZM.sfx('equip', .5, 1.1);
    if (adv) adv.grant('nina_knife');
  });

  /* ============ 3D: нож гостя ============ */
  (function knife3d() {
    const fig = $('#knifeArt'), cv = $('#knife3d');
    if (!fig || !cv || !(window.ZMGeo && ZMGeo.supported())) return;
    const tex = (() => {
      const c = document.createElement('canvas'); c.width = 64; c.height = 64;
      const g = c.getContext('2d');
      /* сталь: клинок и остриё */
      const st = g.createLinearGradient(0, 0, 0, 38);
      st.addColorStop(0, '#eef4f7'); st.addColorStop(.4, '#cfd8de'); st.addColorStop(1, '#9aa6ae');
      g.fillStyle = st; g.fillRect(0, 0, 40, 38);
      for (let i = 0; i < 130; i++) { g.fillStyle = 'rgba(255,255,255,' + (Math.random() * .3) + ')'; g.fillRect(Math.random() * 40 | 0, Math.random() * 38 | 0, 1, 1); }
      g.fillStyle = '#f7fbfd'; g.fillRect(19, 1, 2, 18);           /* светлая кромка */
      /* гарда: тёмная сталь */
      g.fillStyle = '#57626b'; g.fillRect(42, 18, 13, 10);
      g.fillStyle = '#7d8a93'; g.fillRect(42, 18, 13, 2);
      /* рукоять: дерево с волокнами */
      g.fillStyle = '#7a4a26'; g.fillRect(42, 0, 22, 14);
      for (let y = 1; y < 14; y += 2) { g.fillStyle = 'rgba(94,56,30,.6)'; g.fillRect(42, y + (Math.random() * 2 | 0), 22, 1); }
      g.fillStyle = '#c9d2d8'; g.fillRect(46, 4, 2, 2); g.fillRect(56, 8, 2, 2);  /* заклёпки */
      return c.toDataURL('image/png');
    })();
    const GEO = {
      tw: 64, th: 64,
      bones: [
        { name: 'knife', pivot: [0, 4, 0], cubes: [
          { origin: [-1, 4, -4], size: [2, 4, 18], uv: [1, 1] },
          { origin: [-1, 4, 14], size: [2, 2, 3], uv: [20, 30] },
          { origin: [-2, 2, -6], size: [4, 5, 2], uv: [42, 20] },
          { origin: [-1, 3, -15], size: [2, 3, 9], uv: [42, 1] },
        ] },
      ],
    };
    let api;
    try { api = ZMGeo.create(cv, { geo: GEO, tex, nearest: true, lit: 1, cam: { yaw: -30, pitch: 22, dist: 48, target: [0, 5, 0], fov: 30 } }); } catch (e) { api = null; }
    if (!api) return;
    fig.classList.add('ready');
    const st = K.spinner(cv, { ry: 30, rx: 0 }, 50);
    let seen = false, last = 0, ang = 30, spin = 0;
    new IntersectionObserver((e) => (seen = e[0].isIntersecting), { rootMargin: '90px' }).observe(cv);
    const D2R = Math.PI / 180;
    function frame(now) {
      requestAnimationFrame(frame);
      if (!seen || document.hidden || !cv.clientWidth) return;
      const dt = Math.min(.05, (now - last) / 1000) || .016; last = now;
      api.tick(dt);
      if (spin > 0) { spin = Math.max(0, spin - dt * 1.4); ang += dt * 480 * spin; }
      else if (st.idle()) ang = (ang + dt * 14) % 360;
      else ang = st.ry;
      api.setExtra(ZMGeo.M.mul(ZMGeo.M.rx(st.rx * D2R), ZMGeo.M.ry(ang * D2R)));
      api.setBoneRot('knife', [Math.sin(now * .0013) * 2, 0, Math.sin(now * .0019) * 3]);
      api.render();
    }
    requestAnimationFrame(frame);
    cv.addEventListener('click', () => { spin = 1; ZM.sfx('hit', .3, 1.5); });
  })();
})();
