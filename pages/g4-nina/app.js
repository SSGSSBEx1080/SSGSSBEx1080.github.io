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
    $('#stabArena').style.setProperty('--face', face + 'deg');
    $('#stabDeg').textContent = face + '°';
    $('#stabDeg2').textContent = face + '°';
    const dot = -Math.cos(face / R2D); /* цель смотрит от 0° (вверх), атакующий снизу */
    $('#stabDot').textContent = dot.toFixed(2);
    const back = dot <= -0.5, side = Math.abs(dot) < 0.5;
    multEl.textContent = back ? '×2' : side ? '×1.5' : '×1';
    multEl.className = 'stab-mult' + (side ? ' side' : !back ? ' front' : '');
    /* подсвечиваем сектор, в который сейчас бьём */
    zone.classList.remove('z-back', 'z-side', 'z-front');
    zone.classList.add(back ? 'z-back' : side ? 'z-side' : 'z-front');
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
    /* вспышка сектора + отброс манекена отменён (нож не толкает) */
    const arena = $('#stabArena');
    arena.classList.remove('hit'); void arena.offsetWidth; arena.classList.add('hit');
    const dummy = $('.stab-dummy', arena);
    if (dummy) { dummy.classList.remove('flinch'); void dummy.offsetWidth; dummy.classList.add('flinch'); }
    ZM.sfx('hit', .55, mult === 2 ? .72 : mult === 1.5 ? .9 : 1.1);
  });
  stabRender();

  /* ============ 01б. ПКМ-стенд: все функции ножа правой кнопкой ============ */
  (() => {
    const A = 'assets/textures/';
    const T = {
      sheep:   { img: U(A + 'hub/av/sheep.png'), cap: 'ОВЦА', done: 'ОВЦА · ОСТРИЖЕНА' },
      bull:    { img: U(A + 'hub/av/cow.png'), cap: 'БЫК', done: 'БЫК · ОБРАБОТАН' },
      berries: { img: U(A + 'p21/i/sweet_berries.png'), cap: 'КУСТ ЯГОД', done: 'КУСТ · СОБРАН, ОТРАСТЁТ' },
      log:     { img: U(A + 'mc/p2/block_oak_log.png'), cap: 'ДУБ-БРЕВНО', done: 'БРЕВНО · БЕЗ КОРЫ' },
    };
    const st = { sheep: false, bull: 'normal', berries: false, log: false, t: 'sheep', dur: 500 };
    const img = $('#rcmImg'), cap = $('#rcmCap'), drop = $('#rcmDrop'), logEl = $('#rcmLog');
    const put = (t) => { const d = document.createElement('div'); d.textContent = t; logEl.appendChild(d); while (logEl.children.length > 8) logEl.firstChild.remove(); logEl.scrollTop = logEl.scrollHeight; };
    const slot = (src, tip, n) => `<span class="g-islot" data-tip="${tip}"><img src="${src}" alt=""><b>${n || ''}</b></span>`;
    const durRender = () => { $('#rcmDur').textContent = st.dur + ' / 500'; $('#rcmDurBar').style.width = (st.dur / 5) + '%'; };
    const scene = () => {
      const t = st.t;
      if (t === 'bull') img.src = st.bull === 'normal' ? T.bull.img : U(A + 'hub/av/cow.png');
      else img.src = T[t].img;
      img.classList.toggle('rcm-dim', (t === 'sheep' && st.sheep) || (t === 'berries' && st.berries));
      img.classList.toggle('rcm-strip', t === 'log' && st.log);
      if (t === 'log' && st.log) img.src = U(A + 'guest/stripped_oak_log.png');
      const done = t === 'bull' ? st.bull !== 'normal' : st[t];
      cap.textContent = done ? T[t].done : T[t].cap + ' · ЖДЁТ';
      try { const d = { t: st.t, sheep: st.sheep, bull: st.bull, berries: st.berries, log: st.log, dur: st.dur }; window.__G4RCM = d; dispatchEvent(new CustomEvent('g4rcm', { detail: d })); } catch (e) {}
    };
    $('#rcmTargets').addEventListener('click', (e) => {
      const b = e.target.closest('[data-t]'); if (!b) return;
      st.t = b.dataset.t; ZM.sfx('click', .3);
      for (const x of $('#rcmTargets').children) x.classList.toggle('on', x === b);
      drop.innerHTML = ''; scene();
    });
    $('#rcmUse').addEventListener('click', () => {
      if (st.dur <= 0) { put('Нож сломался: 0 из 500. Нужен новый.'); return; }
      const t = st.t;
      if (t === 'bull' && st.bull !== 'normal') { put('Этот бык уже обработан — сначала «восстановить цель».'); return; }
      if (t !== 'bull' && st[t]) { put('Цель уже обработана — восстанови, чтобы повторить.'); return; }
      st.dur--; durRender();
      $('#rcmMouse').classList.remove('click'); void $('#rcmMouse').offsetWidth; $('#rcmMouse').classList.add('click');
      if (t === 'sheep') {
        st.sheep = true; ZM.sfx('cloth', .6, 1.1);
        const n = 1 + (Math.random() * 3 | 0);
        drop.innerHTML = slot(U(A + 'p13/i/white_wool.png'), 'Шерсть', '×' + n);
        put(`Овца острижена как ножницами: ${n} шерсти. Прочность −1.`);
      } else if (t === 'bull') {
        const copper = Math.random() < 0.5; ZM.sfx('cloth', .6, 1.1);
        st.bull = copper ? 'copper' : 'bald';
        if (copper) { drop.innerHTML = slot(U(A + 'hub/av/cow.png'), 'Медный бык'); put('Бык стал медным — 50 из 50. Ачивка №22 в родной ветке дойки.'); }
        else { const n = 1 + (Math.random() * 2 | 0); drop.innerHTML = slot(U(A + 'p22/i/leather.png'), 'Кожа', '×' + n); put(`Бык стал лысым и роняет ${n} кожи. Прочность −1.`); }
      } else if (t === 'berries') {
        st.berries = true; ZM.sfx('pop', .5, 1.2);
        drop.innerHTML = slot(U(A + 'p21/i/sweet_berries.png'), 'Ягоды', '+');
        put('Куст отдал ягоды и отрастёт заново — поведение как у ножниц.');
      } else {
        st.log = true; ZM.sfx('wood', .6, .9);
        drop.innerHTML = '';
        put('Кора снята, как топором: бревно дуба стало бревном без коры.');
      }
      scene();
    });
    $('#rcmReset').addEventListener('click', () => {
      st.sheep = false; st.bull = 'normal'; st.berries = false; st.log = false;
      drop.innerHTML = ''; ZM.sfx('click', .3); scene();
      put('Цель восстановлена. Прочность ножа не возвращается.');
    });
    durRender(); scene(); put('Выбери цель и примени ПКМ. Прочность честная: 500 использований.');
  })();

  /* ============ 02. СОЛЬ: добыча руды + мини-мир с дорожкой ============ */
  const grid = $('#fuseGrid');

  /* ---- шахта: зажми руду — 10 стадий трещин, ровно 4 соли и 2–5 опыта ---- */
  let saltOwned = 0;
  const mineBlock = $('#mineBlock'), crackCv = $('#mineCrack'), crackG = crackCv.getContext('2d');
  crackCv.width = crackCv.height = 16;
  /* подлинные стадии разрушения из ванилы — как на стендах 01 и 04 */
  const DST = Array.from({ length: 10 }, (_, i) => { const im = new Image(); im.src = U(`assets/textures/mc/destroy_stage_${i}.png`); return im; });
  const SALT_COLS = ['#ffffff', '#e9e9e9', '#cfc9bd', '#8f8a80', '#5a5a5a'];
  let mining = null, mineStage = 0;
  const mineParticles = (n, power) => {
    for (let i = 0; i < n; i++) {
      const pt = document.createElement('i');
      pt.className = 'mpt';
      const ang = Math.random() * Math.PI * 2, dist = (26 + Math.random() * 58) * power;
      pt.style.cssText = `--c:${SALT_COLS[(Math.random() * SALT_COLS.length) | 0]};--sz:${3 + Math.random() * 5}px;--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist + 34 * power}px;--r:${Math.random() * 360}deg`;
      mineBlock.appendChild(pt);
      setTimeout(() => pt.remove(), 760);
    }
  };
  const drawCracks = () => {
    const fill = $('#mineFill'), ring = $('#mineRing');
    if (fill) fill.style.width = (mineStage * 10) + '%';
    if (ring) ring.style.strokeDashoffset = String(1 - mineStage / 10);
    crackG.clearRect(0, 0, 16, 16);
    if (mineStage > 0.15) {
      crackG.imageSmoothingEnabled = false;
      crackG.drawImage(DST[Math.min(9, Math.floor(mineStage))], 0, 0, 16, 16);
    }
  };
  const saltSync = () => { $('#saltOwned').textContent = saltOwned; const m = $('#saltOwned2'); if (m) m.textContent = saltOwned; };
  const mineFinish = () => {
    mineStage = 0; mining = null; drawCracks();
    saltOwned += 4; saltSync();
    const xp = 2 + (Math.random() * 4 | 0);
    $('#mineXp').textContent = '+' + xp + ' XP';
    ZM.sfx('stone', 1, .8); ZM.sfx('orb', .3, 1.35);
    mineParticles(18, 1);
    mineBlock.classList.remove('broke'); void mineBlock.offsetWidth; mineBlock.classList.add('broke');
    if (adv) adv.grant('salt_discovery');
    const note = $('#mineNote');
    if (note) { note.textContent = `Руда разобрана: ровно 4 соли в карман, ${xp} опыта за ручную добычу.`; note.classList.remove('flash'); void note.offsetWidth; note.classList.add('flash'); }
  };
  let holding = false, lastHit = 0, shakeOn = false;
  const setShake = (on) => { if (on === shakeOn) return; shakeOn = on; mineBlock.style.setProperty('--shake', on ? ((Math.random() - .5) * 2 + 'px') : '0px'); };
  const mineStep = (dt, now) => {
    mineStage = Math.min(10, mineStage + dt * 5.2);
    drawCracks();
    /* как в игре: удар раз в 4 тика с pitch 0.5, искры с каждой стадии */
    if (now - lastHit > 200) { lastHit = now; ZM.sfx('hit', .5, .5); mineParticles(2, .5); }
    if (mineStage >= 10) { mineFinish(); return; }
    setShake(true); mineBlock.style.setProperty('--shake', (Math.random() - .5) * 2 + 'px');
  };
  mineBlock.addEventListener('pointerdown', e => { e.preventDefault(); try { mineBlock.setPointerCapture(e.pointerId); } catch (_) {} holding = true; mining = performance.now(); });
  mineBlock.addEventListener('pointerup', () => { holding = false; mining = null; });
  mineBlock.addEventListener('pointercancel', () => { holding = false; mining = null; });
  mineBlock.addEventListener('keydown', e => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); holding = true; mining = performance.now(); } });
  mineBlock.addEventListener('keyup', e => { if (e.code === 'Space') { holding = false; mining = null; } });
  mineBlock.addEventListener('blur', () => { holding = false; mining = null; });
  mineBlock.addEventListener('contextmenu', e => e.preventDefault());
  (function mineLoop() {
    requestAnimationFrame(mineLoop);
    const now = performance.now();
    if (holding && !document.hidden) { mineStep((now - (mining || now)) / 1000, now); mining = now; return; }
    mining = null; setShake(false);
    if (mineStage > 0) { mineStage = Math.max(0, mineStage - .9); drawCracks(); }
  })();
  drawCracks(); saltSync();

  /* ---- мини-мир: травяное поле, рычаг и 4 случайных блока-механизма ----
   * Дорожка соли кладётся кликами по траве (1 соль = 1 клетка, соль из
   * кармана). Дёрни рычаг — огонь идёт по дорожке: 2 тика на клетку,
   * сигнал 15 — и запускает каждый механизм, до которого доберётся.
   * Механики честные из мода: дроп ровно 4 соли с руды, горение 2 тика. */
  const WCOLS = 12, WROWS = 7;
  const VAN = U('assets/textures/mc/van/'), P2 = U('assets/textures/mc/p2/');
  const POOL = [
    { k: 'piston', n: 'ПОРШЕНЬ', tex: VAN + 'piston_top.png' },
    { k: 'sticky', n: 'ЛИПКИЙ ПОРШЕНЬ', tex: VAN + 'piston_top_sticky.png' },
    { k: 'tnt', n: 'ДИНАМИТ', tex: P2 + 'block_tnt_side.png' },
    { k: 'dispenser', n: 'РАЗДАТЧИК СО СТРЕЛОЙ', tex: VAN + 'dispenser_front.png' },
    { k: 'dropper', n: 'ДРОППЕР', tex: VAN + 'dropper_front.png' },
    { k: 'observer', n: 'НАБЛЮДАТЕЛЬ', tex: VAN + 'observer_front.png' },
    { k: 'lamp', n: 'КРАСНАЯ ЛАМПА', tex: VAN + 'redstone_lamp.png', texOn: VAN + 'redstone_lamp_on.png' },
    { k: 'rtorch', n: 'РЕДСТОУН-ФАКЕЛ', tex: VAN + 'redstone_torch_off.png', texOn: VAN + 'redstone_torch.png' },
    { k: 'note', n: 'НОТНЫЙ БЛОК', tex: VAN + 'note_block.png' },
    { k: 'target', n: 'МИШЕНЬ', tex: VAN + 'target_top.png' },
  ];
  const trail = document.createElement('canvas');
  trail.className = 'fuse-trail'; trail.setAttribute('aria-hidden', 'true');
  grid.appendChild(trail);
  const tg = trail.getContext('2d');
  const cells = [], life = [], btns = [], mech = [];
  let lever = { r: 3, c: 0 };
  let burning = false, burned = 0;
  const N4 = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  const inGrid = (r, c) => r >= 0 && r < WROWS && c >= 0 && c < WCOLS;
  const salt = (r, c) => inGrid(r, c) && cells[r][c] >= 1;
  const isNode = (r, c) => salt(r, c) || (inGrid(r, c) && (mech[r][c] || (r === lever.r && c === lever.c)));

  function buildWorld() {
    burning = false; burned = 0;
    cells.length = life.length = btns.length = mech.length = 0;
    grid.querySelectorAll('button').forEach(b => b.remove());
    for (let r = 0; r < WROWS; r++) {
      cells.push(Array(WCOLS).fill(0)); life.push(Array(WCOLS).fill(0)); btns.push([]); mech.push(Array(WCOLS).fill(null));
      for (let c = 0; c < WCOLS; c++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'grass';
        b.setAttribute('aria-label', `Трава ${c + 1},${r + 1}: положить соль`);
        grid.appendChild(b); btns[r].push(b);
      }
    }
    /* рычаг и 4 разных механизма: случайные клетки, не вплотную к рычагу */
    const taken = [];
    const free = (r, c) => !taken.some(([tr, tc]) => tr === r && tc === c) &&
      N4.every(([dr, dc]) => !(r + dr === lever.r && c + dc === lever.c)) &&
      Math.abs(r - lever.r) + Math.abs(c - lever.c) >= 3;
    lever = { r: (Math.random() * WROWS) | 0, c: (Math.random() * WCOLS) | 0 };
    taken.push([lever.r, lever.c]);
    const lb = btns[lever.r][lever.c];
    lb.classList.add('lever');
    lb.innerHTML = `<img src="${VAN}lever.png" alt="Рычаг">`;
    lb.setAttribute('aria-label', 'Рычаг: дёрнуть, чтобы поджечь дорожку');
    const pick = [...POOL].sort(() => Math.random() - .5).slice(0, 4);
    for (const def of pick) {
      let r, c, guard = 0;
      do { r = (Math.random() * WROWS) | 0; c = (Math.random() * WCOLS) | 0; } while (!free(r, c) && ++guard < 200);
      if (guard >= 200) continue;
      taken.push([r, c]);
      mech[r][c] = Object.assign({ done: false, on: false }, def);
      const b = btns[r][c];
      b.classList.add('mech');
      b.innerHTML = `<img src="${def.tex}" alt="${def.n}">`;
      b.setAttribute('aria-label', def.n + ': запустится, когда огонь дойдёт');
    }
    renderFuse();
  }

  let painting = null;
  function paintCell(r, c, add) {
    if (!inGrid(r, c) || mech[r][c] || (r === lever.r && c === lever.c)) return;
    if (burning && add) return;
    if (add) {
      if (saltOwned <= 0) { $('#fuseSignal').textContent = 'СОЛИ НЕТ — ДОБУДЬ РУДУ'; return; }
      cells[r][c] = 1; saltOwned--; saltSync();
      if (adv) adv.grant('salt_fuse');
    } else if (cells[r][c]) { cells[r][c] = 0; saltOwned++; saltSync(); }
    renderFuse();
  }
  grid.addEventListener('pointerdown', e => {
    const b = e.target.closest('button'); if (!b || e.target === trail) return;
    e.preventDefault();
    outer: for (let r = 0; r < WROWS; r++) for (let c = 0; c < WCOLS; c++) if (btns[r][c] === b) {
      if (mech[r][c] || (r === lever.r && c === lever.c)) break outer;
      painting = !cells[r][c];
      paintCell(r, c, painting);
      break outer;
    }
  });
  grid.addEventListener('pointerover', e => {
    if (painting === null || !e.target.closest) return;
    const b = e.target.closest('button'); if (!b) return;
    outer2: for (let r = 0; r < WROWS; r++) for (let c = 0; c < WCOLS; c++) if (btns[r][c] === b) { paintCell(r, c, painting); break outer2; }
  });
  addEventListener('pointerup', () => (painting = null));
  $('#fuseClear').addEventListener('click', () => {
    if (burning) return;
    let refund = 0;
    for (let r = 0; r < WROWS; r++) for (let c = 0; c < WCOLS; c++) if (cells[r][c]) { cells[r][c] = 0; refund++; }
    saltOwned += refund; saltSync(); renderFuse();
  });
  $('#fuseNew').addEventListener('click', () => {
    if (burning) return;
    let refund = 0;
    for (let r = 0; r < WROWS; r++) for (let c = 0; c < WCOLS; c++) if (cells[r][c]) refund++;
    saltOwned += refund; saltSync();
    ZM.sfx('page', .5, 1.2);
    buildWorld();
  });

  function renderFuse() {
    let n = 0;
    for (let r = 0; r < WROWS; r++) for (let c = 0; c < WCOLS; c++) {
      const b = btns[r][c]; if (!b) continue;
      const v = cells[r][c];
      if (v) n++;
      b.classList.toggle('salt', v === 1);
      b.classList.toggle('lit', v === 2);
    }
    $('#fusePlaced').textContent = n;
    $('#fuseBurned').textContent = burned;
    drawTrail();
  }
  /* текстуры дорожки — те же, что кладёт блок в игре: line0 вертикальная,
   * для горизонталей поворачиваем; каждая связь = половинка от центра к краю */
  const TR = {
    lineW: Object.assign(new Image(), { src: U('assets/textures/guest/salt_trail/salt_redstone_dust_line0_white.png') }),
    lineL: Object.assign(new Image(), { src: U('assets/textures/guest/salt_trail/salt_redstone_dust_line0_lit.png') }),
    dotW: Object.assign(new Image(), { src: U('assets/textures/guest/salt_trail/salt_redstone_dust_dot_white.png') }),
    dotL: Object.assign(new Image(), { src: U('assets/textures/guest/salt_trail/salt_redstone_dust_dot_lit.png') }),
  };
  function drawTrail() {
    const w = grid.clientWidth, h = grid.clientHeight, d = Math.min(devicePixelRatio || 1, 2);
    if (!w || !h) return;
    if (trail.width !== Math.round(w * d) || trail.height !== Math.round(h * d)) { trail.width = Math.round(w * d); trail.height = Math.round(h * d); }
    tg.setTransform(d, 0, 0, d, 0, 0); tg.clearRect(0, 0, w, h);
    tg.imageSmoothingEnabled = false;
    const pad = 2.6;   /* перекрыть зазор сетки, чтобы дорожка была сплошной */
    for (let r = 0; r < WROWS; r++) for (let c = 0; c < WCOLS; c++) {
      if (!salt(r, c)) continue;
      const b = btns[r][c], x = b.offsetLeft - grid.clientLeft, y = b.offsetTop - grid.clientTop, bw = b.offsetWidth, bh = b.offsetHeight;
      const cx = x + bw / 2, cy = y + bh / 2;
      const lit = cells[r][c] === 2;
      const line = lit ? TR.lineL : TR.lineW, dot = lit ? TR.dotL : TR.dotW;
      /* направления: вверх (k=0), вправо (1), вниз (2), влево (3) */
      const dirs = [[-1, 0, 0], [0, 1, 1], [1, 0, 2], [0, -1, 3]].filter(([dr, dc]) => isNode(r + dr, c + dc));
      if (!dirs.length) {   /* одинокая соль — точка, как у красной пыли */
        const sz = Math.min(bw, bh) * .78;
        if (lit) { tg.globalAlpha = .4; tg.drawImage(dot, cx - sz / 2 - 2, cy - sz / 2 - 2, sz + 4, sz + 4); tg.globalAlpha = 1; }
        tg.drawImage(dot, cx - sz / 2, cy - sz / 2, sz, sz);
        continue;
      }
      for (const [, , k] of dirs) {
        tg.save(); tg.translate(cx, cy); tg.rotate(k * Math.PI / 2);
        if (lit) { tg.globalAlpha = .38; tg.drawImage(line, 0, 0, 16, 8, -bw / 2 - 2, -bh / 2 - pad - 2, bw + 4, bh / 2 + pad + 4); tg.globalAlpha = 1; }
        tg.drawImage(line, 0, 0, 16, 8, -bw / 2, -bh / 2 - pad, bw, bh / 2 + pad);
        tg.restore();
      }
    }
  }
  addEventListener('resize', () => renderFuse());

  /* --- реакции механизмов: каждый срабатывает по-своему --- */
  const wPop = (r, c, col) => {
    const host = btns[r][c]; if (!host) return;
    for (let i = 0; i < 6; i++) {
      const pt = document.createElement('i');
      pt.className = 'wpt';
      const ang = Math.random() * Math.PI * 2, dist = 16 + Math.random() * 30;
      pt.style.cssText = `--c:${col};--sz:${2 + Math.random() * 4}px;--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist}px`;
      host.appendChild(pt);
      setTimeout(() => pt.remove(), 700);
    }
  };
  function shootArrow(r, c) {
    const b = btns[r][c], a = document.createElement('i');
    a.className = 'w-arrow';
    const dir = c >= lever.c ? 1 : -1;
    a.style.left = b.offsetLeft + 'px'; a.style.top = b.offsetTop + b.offsetHeight / 2 + 'px';
    a.style.setProperty('--fly', dir * (grid.clientWidth + 40) + 'px');
    a.style.setProperty('--flip', dir < 0 ? 'scaleX(-1)' : '');
    grid.appendChild(a);
    setTimeout(() => a.remove(), 900);
    ZM.sfx('click', .6, .7);
  }
  function boom(r, c) {
    ZM.sfx('anvil', .9, .45); ZM.sfx('stone', 1, .5);
    grid.classList.remove('quake'); void grid.offsetWidth; grid.classList.add('quake');
    /* сам динамит превращается в воронку */
    const self = btns[r][c];
    mech[r][c] = null;
    self.classList.remove('mech'); self.innerHTML = ''; self.classList.add('scorch');
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc;
      if (!inGrid(nr, nc) || (nr === r && nc === c)) continue;
      cells[nr][nc] = 0;
      const b = btns[nr][nc];
      b.classList.remove('salt', 'lit');
      b.classList.add('boom');
      setTimeout(() => b.classList.remove('boom'), 650);
      if (mech[nr][nc]) {
        /* цепная детонация соседнего динамита, остальные механизмы уцелели */
        if (mech[nr][nc].k === 'tnt' && !mech[nr][nc].done) { mech[nr][nc].done = true; const rr = nr, cc = nc; setTimeout(() => boom(rr, cc), 260); }
        continue;
      }
      if (!(nr === lever.r && nc === lever.c)) b.classList.add('scorch');
    }
    wPop(r, c, '#ffb02e');
    renderFuse();
  }
  function fireMech(r, c) {
    const m = mech[r][c]; if (!m || m.done) return;
    m.done = true; m.on = true;
    const b = btns[r][c];
    b.classList.add('act');
    if (m.k === 'lamp' || m.k === 'rtorch') { const im = b.querySelector('img'); if (im && m.texOn) im.src = m.texOn; b.classList.add('on'); ZM.sfx('click', .5, 1.4); ZM.sfx('orb', .25, 1.6); }
    else if (m.k === 'piston') { b.classList.add('push'); setTimeout(() => b.classList.remove('push'), 480); ZM.sfx('page', .6, .8); }
    else if (m.k === 'sticky') { b.classList.add('push'); setTimeout(() => b.classList.remove('push'), 1500); ZM.sfx('page', .6, .65); }
    else if (m.k === 'dispenser') shootArrow(r, c);
    else if (m.k === 'dropper') { wPop(r, c, '#e9e9e9'); ZM.sfx('pop', .6, .8); }
    else if (m.k === 'observer') { b.classList.add('on'); ZM.sfx('click', .35, .7); wPop(r, c, '#9fd8ff'); }
    else if (m.k === 'note') { b.classList.add('ding'); ZM.sfx('pop', .55, .55 + Math.random() * 1.3); wPop(r, c, '#ffd76e'); }
    else if (m.k === 'target') { b.classList.add('hit'); ZM.sfx('hit', .6, 1.3); }
    else if (m.k === 'tnt') setTimeout(() => boom(r, c), 220);
  }

  $('#fuseIgnite').addEventListener('click', () => {
    if (burning) return;
    const near = N4.filter(([dr, dc]) => salt(lever.r + dr, lever.c + dc));
    if (!near.length) { $('#fuseSignal').textContent = 'СИГНАЛ: — (СОЛИ У РЫЧАГА НЕТ)'; return; }
    for (const [dr, dc] of near) { cells[lever.r + dr][lever.c + dc] = 2; life[lever.r + dr][lever.c + dc] = 2; }
    burning = true;
    btns[lever.r][lever.c].classList.add('pulled');
    $('#fuseSignal').textContent = 'СИГНАЛ: 15';
    ZM.sfx('click', .4, 1.3);
    renderFuse();
    const step = () => {
      if (!document.hidden) {
        for (let r = 0; r < WROWS; r++) for (let c = 0; c < WCOLS; c++) {
          if (cells[r][c] === 2) {
            for (const [dr, dc] of N4) {
              const nr = r + dr, nc = c + dc;
              if (inGrid(nr, nc) && cells[nr][nc] === 1) { cells[nr][nc] = 2; life[nr][nc] = 2; }
            }
          }
        }
        /* механизм срабатывает, когда соседняя соль горит: сигнал 15 */
        for (let r = 0; r < WROWS; r++) for (let c = 0; c < WCOLS; c++) {
          if (mech[r][c] && !mech[r][c].done && N4.some(([dr, dc]) => salt(r + dr, c + dc) && cells[r + dr][c + dc] === 2)) fireMech(r, c);
        }
        for (let r = 0; r < WROWS; r++) for (let c = 0; c < WCOLS; c++) {
          if (cells[r][c] === 2 && --life[r][c] <= 0) { cells[r][c] = 0; burned++; }
        }
        renderFuse();
        if (!cells.flat().includes(2)) {
          burning = false; renderFuse();
          $('#fuseSignal').textContent = 'СИГНАЛ: —';
          ZM.sfx('pop', .4, .8);
          return;
        }
      }
      setTimeout(step, 100);
    };
    setTimeout(step, 100);
  });
  buildWorld();

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


  /* ---------- мини-ветка гостя в футере, как у основной линейки ---------- */
  (() => {
    const el = $('#gBranch'); if (!el || !G) return;
    const renderBranch = () => {
      const got = ZM.store.get(G.store, []);
      const chain = G.adv.map((a, i) => {
        const has = got.includes(a.key), prev = i && got.includes(G.adv[i - 1].key);
        const node = `<a class="adv-node${has ? '' : ' no'}" href="#adv" aria-label="${esc(has ? a.t : 'Скрытая ачивка')}"><span class="adv-frame ${a.frame}${has ? '' : ' locked'}"></span>${has ? `<span class="ic"><img src="${U(a.icon)}" alt=""></span>` : '<span class="q">?</span>'}</a>`;
        return (i ? `<div class="adv-link${has && prev ? ' on' : ''}"></div>` : '') + node;
      }).join('');
      el.innerHTML = `<span class="gb-label">ВЕТКА ГОСТЯ · <b>${got.length}/${G.adv.length}</b></span><div class="gb-chain">${chain}</div>`;
    };
    renderBranch();
    if (adv) { const grant0 = adv.grant; adv.grant = (k) => { const r = grant0(k); renderBranch(); return r; }; }
    $('#advReset')?.addEventListener('click', () => setTimeout(renderBranch, 0));
    addEventListener('storage', (e) => { if (e.key === 'zm:' + G.store) renderBranch(); });
  })();
})();
