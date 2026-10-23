/* Г-П · Мистер П — Соль, нож и редиска.
 * Числа из исходников: NinaKnifeItem / NinaKnifeCombatHandler (×2 в спину,
 * ×1.5 сбоку, без отбрасывания), SaltOreBlock / SaltTrailBlock (дроп 4,
 * горение 2 тика, сигнал 15), RadishCropBlock (8 стадий), borscht.json,
 * NinaRecipeHistoryHandler («когда-либо держал»). */
(() => {
  'use strict';
  const { $, esc } = ZM, U = ZM.url;
  ZM.topbar({ crumb: 'Гость П · Соль, нож и редиска' });

  const nav = $('#guestNav');
  if (nav && ZM.GUEST_POINTS) {
    const i = ZM.GUEST_POINTS.findIndex((g) => g.page && g.page.includes('/g4-'));
    const prev = ZM.GUEST_POINTS[i - 1];
    nav.innerHTML =
      (prev ? `<a href="${U(prev.page)}"><b>В</b> Назад: ${esc(prev.title)}</a>` : '') +
      `<a href="${U('index.html#guests-sec')}"><b>≡</b> Все гостевые пункты</a>` +
      `<a class="g-all" href="${U('index.html#points')}"><b>→</b> Основная линейка</a>`;
  }

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
  let bull = 'normal', bullShears = 0;
  const bullImg = $('#bullImg'), bullOut = $('#bullOut');
  $('#bullShear').addEventListener('click', () => {
    if (bull !== 'normal') return;
    bullShears++;
    const copper = Math.random() < 0.5;
    ZM.sfx('cloth', .6, 1.1);
    if (copper) {
      bull = 'copper'; bullImg.src = U('assets/textures/p22/cow_bull_copper.png');
      bullOut.innerHTML = '<span class="g-islot" data-tip="Медный бык" data-tip-sub="вариант быка"><img src="' + U('assets/textures/p22/cow_bull_copper.png') + '" alt="Медный бык"></span>';
      ZM.toast({ iconHtml: `<img src="${U('assets/textures/p22/cow_bull_copper.png')}" alt="" style="width:100%;height:100%;image-rendering:pixelated">`, title: 'Медный бык', frame: 'goal', head: 'Ветка №22: ачивка!' });
    } else {
      bull = 'bald'; bullImg.src = U('assets/textures/p22/cow_bull_bald.png');
      const n = 1 + (Math.random() * 2 | 0);
      bullOut.innerHTML = '<span class="g-islot" data-tip="Кожа ×' + n + '" data-tip-sub="выпадает из лысого быка"><img src="' + U('assets/textures/p22/i/leather.png') + '" alt="Кожа"><b>' + n + '</b></span>';
    }
    $('#bullShear').disabled = true;
  });
  $('#bullReset').addEventListener('click', () => { bull = 'normal'; bullImg.src = U('assets/textures/p22/cow_bull.png'); bullOut.innerHTML = ''; $('#bullShear').disabled = false; });

  /* ============ 02. СОЛЬ: фитиль ============ */
  const COLS = 14, ROWS = 7, TORCH = { r: 3, c: 0 };
  const grid = $('#fuseGrid');
  grid.style.gridTemplateColumns = `48px repeat(${COLS - 1}, 1fr)`;
  const cells = []; /* 0 пусто · 1 соль · 2 горит */
  const life = [];
  const btns = [];
  let burning = false, burned = 0;
  for (let r = 0; r < ROWS; r++) {
    cells.push(Array(COLS).fill(0)); life.push(Array(COLS).fill(0)); btns.push([]);
    for (let c = 0; c < COLS; c++) {
      const b = document.createElement('button');
      b.type = 'button';
      if (r === TORCH.r && c === TORCH.c) { b.className = 'torch'; b.setAttribute('aria-label', 'Рычаг: источник сигнала'); b.innerHTML = '<i></i>'; b.tabIndex = -1; }
      else b.setAttribute('aria-label', `Клетка ${c + 1},${r + 1}`);
      grid.appendChild(b); btns[r].push(b);
    }
  }
  const salt = (r, c) => cells[r][c] >= 1;
  function paintCell(r, c, add) {
    if (r === TORCH.r && c === TORCH.c) return;
    if (burning && add) return;
    cells[r][c] = add ? 1 : 0;
    renderFuse();
  }
  function renderFuse() {
    let n = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const b = btns[r][c];
      if (r === TORCH.r && c === TORCH.c) continue;
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
    $('#fusePlaced').textContent = n;
    $('#fuseBurned').textContent = burned;
  }
  let painting = null;
  grid.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    e.preventDefault();
    outer: for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (btns[r][c] === b) {
      if (r === TORCH.r && c === TORCH.c) break outer;
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
    cells[r][c] = 2; life[r][c] = 2; burning = true;
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
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          if (cells[r][c] === 2 && --life[r][c] <= 0) { cells[r][c] = 0; burned++; }
        }
        renderFuse();
        const anyLit = cells.flat().includes(2);
        if (!anyLit) { burning = false; $('#fuseSignal').textContent = 'СИГНАЛ: —'; ZM.sfx('pop', .4, .8); return; }
      }
      setTimeout(step, 100);
    };
    setTimeout(step, 100);
  });
  renderFuse();

  /* ============ 03. РЕДИСКА: грядка ============ */
  const plots = $('#farmPlots'), STAGES = 8;
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
  $('#harvestAll').addEventListener('click', () => {
    let n = 0; stage.forEach((s, i) => { if (s === 7) { stage[i] = -1; n++; } });
    if (n) { radCount += n; ZM.sfx('pop', .5, 1.2); }
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
      }
    }, 16);
  });
  farmRender();

  /* ============ 04. БОРЩ: крафт и память рецептов ============ */
  $('#takeBorscht').addEventListener('click', () => {
    ZM.sfx('pop', .5, 1.15);
    ZM.toast({ iconHtml: `<img src="${U('assets/textures/guest/borscht.png')}" alt="" style="width:100%;height:100%;image-rendering:pixelated">`, title: 'Борщ сварен', frame: 'task' });
  });
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
})();
