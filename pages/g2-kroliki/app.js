/* Г-К · Мистер К — Размножение кроликов.
 * Константы из RabbitRecoilHandler: 60 тиков позы, 0.45 блока дистанция,
 * ±0.06 тряска заднего, ровно 2.0 блока отлёт, 100–200 тиков оглушения,
 * поиск партнёра в радиусе 3 блоков, старт по флагу «в любви» у обоих.
 * Стенд-целей у К нет: его страница про «NO AI», ачивки здесь были бы ложью. */
(() => {
  'use strict';
  const { $, $$, esc } = ZM, U = ZM.url;
  ZM.topbar({ crumb: 'Гость К · Размножение кроликов' });

  const nav = $('#guestNav');
  if (nav && ZM.GUEST_POINTS) {
    const i = ZM.GUEST_POINTS.findIndex((g) => g.page && g.page.includes('/g2-'));
    const prev = ZM.GUEST_POINTS[i - 1], next = ZM.GUEST_POINTS[i + 1];
    nav.innerHTML =
      (prev ? `<a href="${U(prev.page)}"><b>Б</b> Назад: ${esc(prev.title)}</a>` : '') +
      (next ? `<a href="${U(next.page)}"><b>В</b> Далее: ${esc(next.title)}</a>` : '') +
      `<a href="${U('index.html#guests-sec')}"><b>≡</b> Все гостевые пункты</a>`;
  }

  /* ---------- константы исходника ---------- */
  const TRAIN_TICKS = 60, CLOSE = 0.45, SHAKE = 0.06, RECOIL = 2.0, STUN_MIN = 100, STUN_MAX = 200, FIND_R = 3.0;
  const FIELD_W = 16, FIELD_H = 9, GROW_TICKS = 36;

  /* ---------- спрайты ---------- */
  const RAB = [
    '..........ff....',
    '.........fppf...',
    '.........fppf...',
    '.........ffff...',
    '....ffffffffdf..',
    '..fffffffffffdf.',
    '.ffffffffffffff.',
    '.fffffffffffff..',
    'wtffffffffffff..',
    'wwtffffffffff...',
    '..fffffffff.....',
    '..ff....fff.....',
    '..f......ff.....',
    '................',
  ];
  const PAL_BROWN = { f: '#b58963', p: '#f2b6c1', d: '#2b2019', w: '#efe9dc', t: '#a1795a' };
  const PAL_WHITE = { f: '#e9e2d4', p: '#f2b6c1', d: '#2b2019', w: '#ffffff', t: '#d9d2c2' };
  const HEART = ['.HH.HH.', 'HHHHHHH', 'HHHHHHH', '.HHHHH.', '..HHH..', '...H...'];
  const GRASS = ['..g.g..', '.g.g.g.', 'g.g.g.g', '..g.g..'];
  function sprite(matrix, pal) {
    const c = document.createElement('canvas'); c.width = 16; c.height = matrix.length;
    const g = c.getContext('2d');
    matrix.forEach((row, y) => { [...row].forEach((ch, x) => { if (ch === '.') return; g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); }); });
    return c;
  }
  const SPR = { A: sprite(RAB, PAL_BROWN), B: sprite(RAB, PAL_WHITE) };
  const heartC = (() => { const c = document.createElement('canvas'); c.width = 7; c.height = 6; const g = c.getContext('2d'); HEART.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'H') { g.fillStyle = '#ff5b7a'; g.fillRect(x, y, 1, 1); } })); return c; })();
  const grassC = (() => { const c = document.createElement('canvas'); c.width = 7; c.height = 4; const g = c.getContext('2d'); GRASS.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'g') { g.fillStyle = ['#3f7a3a', '#4c8a44', '#356830'][(x + y) % 3]; g.fillRect(x, y, 1, 1); } })); return c; })();
  /* трава на фиксированных местах: детерминированный ГПЧ, чтобы не прыгала */
  const GRASS_AT = (() => { let seed = 42; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); const a = []; for (let i = 0; i < 26; i++) a.push({ x: .6 + r() * (FIELD_W - 1.2), z: .6 + r() * (FIELD_H - 1.2), p: r() * 6.28 }); return a; })();

  /* ---------- состояние ---------- */
  const logEl = $('#simLog');
  const log = (t) => { const d = document.createElement('div'); d.textContent = t; logEl.appendChild(d); while (logEl.children.length > 9) logEl.firstChild.remove(); };
  let generation = 1;
  let S;
  function fresh() {
    return {
      t: 0, phase: 'idle',
      a: { x: 4.5, z: 3.2, dir: 1, love: false, spr: SPR.A },
      b: { x: 10.5, z: 5.6, dir: 1, love: false, spr: SPR.B },
      baby: null, fwd: null, bBase: null, trainT: 0, stunT: 0, stunNeed: 0, babyShown: false, growT: 0,
      hopA: 0, hopB: 0, restA: 20, restB: 20, va: { x: 0, z: 0 }, vb: { x: 0, z: 0 },
    };
  }
  S = fresh();
  const burst = [];   /* сердечки при появлении детёныша */

  const feed = (who) => {
    const r = who === 'a' ? S.a : S.b;
    if (S.phase !== 'idle') { log('Сначала дождись конца текущей сцены или нажми «новый прогон».'); return; }
    if (r.love) { log(`Кролик ${who === 'a' ? 'А' : 'Б'} уже в любви — ждёт партнёра.`); return; }
    r.love = true; ZM.sfx('pop', .5, 1.2);
    log(`Морковка съедена: кролик ${who === 'a' ? 'А' : 'Б'} в любви.`);
    if (S.a.love && S.b.love) log('Оба в любви — последовательность начнётся на следующем тике.');
  };
  $('#feedA').addEventListener('click', () => feed('a'));
  $('#feedB').addEventListener('click', () => feed('b'));
  $('#simReset').addEventListener('click', () => { S = fresh(); burst.length = 0; log('Новый прогон: два кролика на поле. Поколение не сбрасывается.'); syncGen(); });
  $('#genBtn').addEventListener('click', () => {
    if (S.phase !== 'done' || !S.baby) return;
    S.phase = 'grow'; S.growT = 0;
    log('Детёныш подрастает: 36 тиков — и займёт место родителя.');
    ZM.sfx('wood', .4, 1.3);
  });
  $$('.speed-seg [data-speed]').forEach((b) => b.addEventListener('click', () => {
    speed = +b.dataset.speed;
    $$('.speed-seg [data-speed]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    ZM.sfx('click', .3, .8 + speed * .4);
    log(`Скорость стенда: ×${speed === 0.5 ? '½' : speed}`);
  }));

  /* ---------- логика тика (20 тпс × скорость) ---------- */
  const rnd = (a, b) => a + Math.random() * (b - a);
  function hop(r, v, restKey, hopKey) {
    if (S[restKey] > 0) { S[restKey]--; if (!S[restKey]) { v.x = 0; v.z = 0; } }
    else if (Math.random() < 0.02) { S[restKey] = 12 + (Math.random() * 26 | 0); const ang = rnd(0, Math.PI * 2), sp = rnd(.03, .07); v.x = Math.cos(ang) * sp; v.z = Math.sin(ang) * sp; S[hopKey] = 1; }
    r.x = Math.min(FIELD_W - 1, Math.max(1, r.x + v.x)); r.z = Math.min(FIELD_H - 1, Math.max(1, r.z + v.z));
    if (v.x) r.dir = v.x > 0 ? 1 : -1;
    if (S[hopKey] > 0 && Math.random() < .12) S[hopKey] = 0;
  }
  function startTrain() {
    let fx = S.a.x - S.b.x, fz = S.a.z - S.b.z; const len = Math.hypot(fx, fz);
    if (len < .001) { const ang = rnd(0, Math.PI * 2); fx = Math.cos(ang); fz = Math.sin(ang); } else { fx /= len; fz /= len; }
    S.fwd = { x: fx, z: fz };
    S.a.x = S.b.x + fx * CLOSE; S.a.z = S.b.z + fz * CLOSE;
    S.a.dir = fx >= 0 ? 1 : -1; S.b.dir = S.a.dir;
    S.bBase = { x: S.b.x, z: S.b.z };
    S.phase = 'train'; S.trainT = 0; S.babyShown = false;
    log('Тик старта: кролик А телепортирован на 0.45 блока перед Б — поза «паровозик».');
    ZM.sfx('orb', .3, 1.4);
  }
  function newGeneration() {
    generation++;
    const spr = S.baby.spr;
    S.a = { x: Math.min(FIELD_W - 1.2, Math.max(1.2, S.baby.x)), z: Math.min(FIELD_H - 1.2, Math.max(1.2, S.baby.z)), dir: 1, love: false, spr };
    S.b = { x: rnd(1.5, FIELD_W - 1.5), z: rnd(1.2, FIELD_H - 1.2), dir: 1, love: false, spr: Math.random() < .5 ? SPR.A : SPR.B };
    S.baby = null; S.phase = 'idle';
    S.va = { x: 0, z: 0 }; S.vb = { x: 0, z: 0 }; S.restA = 20; S.restB = 20;
    log(`Поколение ${generation}: детёныш вырос и встал на место родителя А. Окрас достался от родителя.`);
    ZM.sfx('levelup', .45, 1.1);
    syncGen();
  }
  function tick() {
    S.t++;
    if (S.phase === 'idle') {
      hop(S.a, S.va, 'restA', 'hopA'); hop(S.b, S.vb, 'restB', 'hopB');
      if (S.a.love && S.b.love && Math.hypot(S.a.x - S.b.x, S.a.z - S.b.z) <= FIND_R) startTrain();
      return;
    }
    if (S.phase === 'train') {
      S.trainT++;
      const sign = (S.trainT & 1) ? -1 : 1;
      S.b.x = S.bBase.x + S.fwd.x * SHAKE * sign; S.b.z = S.bBase.z + S.fwd.z * SHAKE * sign;
      if (!S.babyShown && S.trainT >= 40) {
        S.babyShown = true;
        S.baby = { x: (S.a.x + S.b.x) / 2, z: (S.a.z + S.b.z) / 2, dir: S.a.dir, t: 0, spr: Math.random() < .5 ? SPR.A : SPR.B };
        for (let i = 0; i < 10; i++) burst.push({ x: S.baby.x, z: S.baby.z, vy: .012 + Math.random() * .02, vx: rnd(-.02, .02), life: 1 });
        log('Детёныш появился: ванильный ИИ размножения не отключался. Окрас — случайного родителя.');
        ZM.sfx('pop', .5, 1.7);
      }
      if (S.trainT >= TRAIN_TICKS) {
        S.phase = 'stun'; S.stunT = 0; S.stunNeed = STUN_MIN + (Math.random() * (STUN_MAX - STUN_MIN + 1) | 0);
        S.b.x = S.bBase.x - S.fwd.x * RECOIL; S.b.z = S.bBase.z - S.fwd.z * RECOIL;
        S.b.up = true; S.va = { x: 0, z: 0 }; S.vb = { x: 0, z: 0 };
        log(`Отлёт: ровно 2 блока назад, XRot 180°. Оглушение ${S.stunNeed} тиков (${(S.stunNeed / 20).toFixed(1)} с).`);
        ZM.sfx('stone', .5, .7);
      }
      return;
    }
    if (S.phase === 'stun') {
      S.stunT++;
      if (S.baby) { S.baby.t++; if (S.baby.t % 40 === 0) { S.baby.x += rnd(-.4, .4); S.baby.z += rnd(-.3, .3); } }
      if (S.stunT >= S.stunNeed) {
        S.phase = 'done'; S.b.up = false; S.a.love = false; S.b.love = false;
        log('Оглушение закончилось: XRot и ИИ возвращены. Пара снова свободна.');
        if (S.baby) log('Детёныш на поле — можно запустить новое поколение.');
      }
      return;
    }
    if (S.phase === 'grow') {
      S.growT++;
      if (S.baby) { S.baby.x += rnd(-.02, .02); }
      if (S.growT >= GROW_TICKS) newGeneration();
    }
  }

  /* ---------- рендер ---------- */
  const cv = $('#simCanvas'), g = cv.getContext('2d');
  let W = 800, H = 430, CELL = 44, seen = true;
  function size() {
    W = cv.clientWidth || 800; H = cv.clientHeight || 430;
    const d = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(W * d); cv.height = Math.round(H * d); g.setTransform(d, 0, 0, d, 0, 0);
    CELL = Math.min(W / FIELD_W, H / FIELD_H);
  }
  new ResizeObserver(size).observe(cv);
  new IntersectionObserver((e) => (seen = e[0].isIntersecting), { rootMargin: '60px' }).observe(cv);
  size();

  function drawRabbit(spr, r, scale, label) {
    const px = r.x * CELL, pz = r.z * CELL;
    const sw = 16 * scale, sh = spr.height * scale;
    const bounce = (S.phase === 'idle' && (r === S.a ? S.hopA : S.hopB)) ? -Math.abs(Math.sin(S.t * .35)) * CELL * .12 : 0;
    g.save(); g.translate(px, pz + bounce);
    if (r.up) g.rotate(Math.PI);
    g.scale(r.dir >= 0 ? 1 : -1, 1);
    g.imageSmoothingEnabled = false;
    g.drawImage(spr, -sw / 2, -sh + 6, sw, sh);
    g.restore();
    if (!r.up) { g.font = '700 10px "JetBrains Mono",monospace'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.strokeStyle = '#000'; g.lineWidth = 2; g.strokeText(label, px, pz - sh - 2 + bounce); g.fillText(label, px, pz - sh - 2 + bounce); }
  }
  function drawHearts(r) {
    if (!r.love) return;
    const px = r.x * CELL, pz = r.z * CELL;
    for (let i = 0; i < 3; i++) {
      const a = S.t * .12 + i * 2.1, hx = px + Math.sin(a) * 8, hy = pz - 58 - ((S.t * .5 + i * 9) % 26);
      g.globalAlpha = .95; g.imageSmoothingEnabled = false;
      g.drawImage(heartC, hx - 5, hy, 10, 8.5);
    }
    g.globalAlpha = 1;
  }
  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden || !seen) return;
    g.fillStyle = '#0f1d14'; g.fillRect(0, 0, W, H);
    const ox = (W - FIELD_W * CELL) / 2, oy = (H - FIELD_H * CELL) / 2;
    g.save(); g.translate(ox, oy);
    for (let x = 0; x < FIELD_W; x++) for (let z = 0; z < FIELD_H; z++) {
      g.fillStyle = (x + z) % 2 ? '#16281a' : '#132317'; g.fillRect(x * CELL, z * CELL, CELL, CELL);
    }
    g.strokeStyle = '#ffffff08'; g.lineWidth = 1;
    for (let x = 0; x <= FIELD_W; x++) { g.beginPath(); g.moveTo(x * CELL, 0); g.lineTo(x * CELL, FIELD_H * CELL); g.stroke(); }
    for (let z = 0; z <= FIELD_H; z++) { g.beginPath(); g.moveTo(0, z * CELL); g.lineTo(FIELD_W * CELL, z * CELL); g.stroke(); }
    /* трава: чуть колышется */
    g.imageSmoothingEnabled = false;
    GRASS_AT.forEach((tuft, i) => {
      const sway = Math.sin(S.t * .05 + tuft.p) * 1.5;
      const s = CELL * .055;
      g.globalAlpha = .5 + (i % 3) * .15;
      g.drawImage(grassC, tuft.x * CELL - 7 * s / 2 + sway, tuft.z * CELL - 4 * s + 3, 7 * s, 4 * s);
    });
    g.globalAlpha = 1;
    /* зона поиска партнёра — когда в любви только один */
    const lone = (S.a.love !== S.b.love) ? (S.a.love ? S.a : S.b) : null;
    if (S.phase === 'idle' && lone) {
      g.strokeStyle = '#ffa03a66'; g.setLineDash([6, 6]); g.lineWidth = 1.5;
      g.beginPath(); g.arc(lone.x * CELL, lone.z * CELL, FIND_R * CELL, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      g.font = '9px "JetBrains Mono",monospace'; g.fillStyle = '#ffa03a99'; g.textAlign = 'center';
      g.fillText('ПОИСК ПАРТНЁРА · 3 БЛОКА', lone.x * CELL, lone.z * CELL - FIND_R * CELL - 6);
    }
    /* линия дистанции во время позы */
    if (S.phase === 'train') {
      g.strokeStyle = '#ffd76e'; g.lineWidth = 2; g.setLineDash([4, 4]);
      g.beginPath(); g.moveTo(S.a.x * CELL, S.a.z * CELL); g.lineTo(S.b.x * CELL, S.b.z * CELL); g.stroke(); g.setLineDash([]);
      g.font = '700 11px "JetBrains Mono",monospace'; g.fillStyle = '#ffd76e'; g.textAlign = 'center';
      g.fillText('0.45', (S.a.x + S.b.x) / 2 * CELL, (S.a.z + S.b.z) / 2 * CELL - 8);
    }
    if (S.baby) {
      const grow = S.phase === 'grow' ? .55 + (S.growT / GROW_TICKS) * .85 : .55;
      drawRabbit(S.baby.spr || SPR.A, { ...S.baby, love: false, up: false, dir: S.baby.dir }, CELL * .14 * grow, S.phase === 'grow' ? 'ДЕТЁНЫШ' : '');
      if (S.phase === 'grow') {
        g.font = '9px "JetBrains Mono",monospace'; g.fillStyle = '#9fe08a'; g.textAlign = 'center';
        g.fillText(`РОСТ ${S.growT}/${GROW_TICKS}`, S.baby.x * CELL, S.baby.z * CELL + 30);
      }
    }
    drawRabbit(S.a.spr, S.a, CELL * .14, 'А');
    drawRabbit(S.b.spr, S.b, CELL * .14, 'Б');
    drawHearts(S.a); drawHearts(S.b);
    /* всплеск сердец при рождении */
    for (let i = burst.length - 1; i >= 0; i--) {
      const p = burst[i];
      p.x += p.vx; p.z -= p.vy * 2; p.life -= .012;
      if (p.life <= 0) { burst.splice(i, 1); continue; }
      g.globalAlpha = Math.max(0, p.life);
      g.drawImage(heartC, p.x * CELL - 5, p.z * CELL - 40 - (1 - p.life) * 30, 10, 8.5);
    }
    g.globalAlpha = 1;
    if (S.b.up) { g.font = '700 10px "JetBrains Mono",monospace'; g.fillStyle = '#ff8f6a'; g.textAlign = 'center'; g.fillText('NO AI · XROT 180°', S.b.x * CELL, S.b.z * CELL + 34); }
    g.restore();
  }
  requestAnimationFrame(frame);

  /* ---------- шкала и тикер ---------- */
  const PHASE_RU = { idle: 'ОЖИДАНИЕ', train: 'ПАРОВОЗИК', stun: 'ОГЛУШЕНИЕ', done: 'ГОТОВО', grow: 'ДЕТЁНЫШ РАСТЁТ' };
  function syncGen() {
    $('#simGen').textContent = generation;
    $('#simPop').textContent = 2 + (S.baby ? 1 : 0);
    $('#genBtn').hidden = !(S.phase === 'done' && S.baby);
  }
  let speed = 1, tickTimer = null;
  (function loop() {
    tickTimer = setTimeout(loop, 50 / speed);
    if (document.hidden || !seen) return;
    tick();
    $('#simPhase').textContent = S.phase === 'train' ? `ПАРОВОЗИК ${S.trainT}/${TRAIN_TICKS}` : S.phase === 'grow' ? `РОСТ ${S.growT}/${GROW_TICKS}` : PHASE_RU[S.phase];
    $('#simDist').textContent = S.phase === 'train' ? Math.hypot(S.a.x - S.b.x, S.a.z - S.b.z).toFixed(2) + ' бл.' : '—';
    $('#simTick').textContent = S.t;
    $('#simStun').textContent = S.phase === 'stun' ? `${((S.stunNeed - S.stunT) / 20).toFixed(1)} с` : '—';
    syncGen();
  })();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { /* нагонять нечего: стенд честный */ } });

  log('Поле готово: кролик А (бурый) и кролик Б (белый). Накорми обоих морковкой.');
  log('После удачного прогона детёныша можно вырастить — поколение счётчик не сбрасывает.');
})();
