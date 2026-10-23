/* Г-Б · Мистер Б — Докторская колбаса. ГАСТРОНОМ №1, отдел колбасных изделий.
 * Числа из исходников: FoodProperties (10 / 0.8 / мясо), BasicItemListing
 * (1 изумруд → 1 колбаса, 16 использований, +1 XP жителю, множитель 0.05).
 * Ачивка — единственная настоящая из 00_guest/kolbasa.json: «ГОСТ». */
(() => {
  'use strict';
  const { $, esc } = ZM, U = ZM.url, K = ZM.kit;
  ZM.topbar({ crumb: 'Гость Б · Докторская колбаса' });

  /* ---------- навигация по гостевым пунктам ---------- */
  const nav = $('#guestNav');
  if (nav && ZM.GUEST_POINTS) {
    const i = ZM.GUEST_POINTS.findIndex((g) => g.page && g.page.includes('/g1-'));
    const next = ZM.GUEST_POINTS[i + 1];
    nav.innerHTML =
      (next ? `<a href="${U(next.page)}"><b>${esc(next.letter)}</b> Далее: ${esc(next.title)}</a>` : '') +
      `<a href="${U('index.html#guests-sec')}"><b>≡</b> Все гостевые пункты</a>` +
      `<a class="g-all" href="${U('index.html#tree/101')}"><b>❦</b> Ветка Б в древе ачивок</a>` +
      `<a class="g-all" href="${U('index.html#points')}"><b>→</b> Основная линейка</a>`;
  }

  /* ---------- стенд-цель: единственная настоящая ачивка ГОСТ ---------- */
  const G = (ZM.GUEST_ADV || []).find((g) => g.id === 'g1');
  const adv = G && K ? K.adv({
    list: G.adv.map((a) => ({ key: a.key, title: a.t, color: a.mc, bold: a.b, frame: a.frame, xp: a.xp, icon: U(a.icon), desc: a.d, how: a.how })),
    store: G.store,
    icon: (a) => a.icon,
    intro: 'У гостя Б ровно одна ачивка в 00_guest — «ГОСТ», скрытая, как в игре.',
  }) : null;

  /* ---------- чек + журнал прилавка ---------- */
  const put = (sel, txt) => { const el = $(sel); if (!el) return; const row = document.createElement('div'); row.textContent = txt; el.appendChild(row); el.scrollTop = el.scrollHeight; };
  const log = (txt) => put('#receipt', txt);
  const tlog = (txt) => put('#tradeLog', txt);
  const stamp = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

  /* ---------- 01. весовой отдел: еда ---------- */
  const H_FULL = U('assets/textures/p22/i/h_full.png'), H_HALF = U('assets/textures/p22/i/h_half.png'), H_EMPTY = U('assets/textures/p22/i/h_box.png');
  let hunger = 14;
  const hungerBar = $('#hungerBar');
  function renderHunger() {
    $('#hungerVal').textContent = `${hunger} / 20`;
    hungerBar.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const img = document.createElement('img');
      const v = hunger - i * 2;
      img.src = v >= 2 ? H_FULL : v === 1 ? H_HALF : H_EMPTY;
      if (v === 1) img.className = 'half';
      img.alt = '';
      hungerBar.appendChild(img);
    }
  }
  $('#eatBtn').addEventListener('click', () => {
    if (hunger >= 20) { $('#eatNote').innerHTML = 'Голод уже полный — прилавок закрыт на обед.'; return; }
    hunger = Math.min(20, hunger + 10);
    renderHunger(); ZM.sfx('pop', .5, 1.1);
    $('#eatNote').innerHTML = '+10 голода и насыщение ×0.8. Пометка «мясо» — такой же кусок лечит волка.';
    log(`${stamp()} продано: 1 кусок, голод ${hunger}/20`);
    if (adv) adv.grant('kolbasa');
  });
  $('#fastBtn').addEventListener('click', () => { hunger = Math.max(0, hunger - 6); renderHunger(); $('#eatNote').innerHTML = 'Шесть единиц голода потрачено — можно пробовать снова.'; });
  $('#eatReset').addEventListener('click', () => { hunger = 14; renderHunger(); $('#eatNote').innerHTML = 'Одно использование восстанавливает <b>10 единиц</b>: пять целых иконок голода.'; });
  renderHunger();

  /* ---------- 02. прилавок: торговля ---------- */
  const PROFS = [
    ['armorer', 'Бронник'], ['butcher', 'Мясник'], ['cartographer', 'Картограф'], ['cleric', 'Священник'],
    ['farmer', 'Фермер'], ['fisherman', 'Рыбак'], ['fletcher', 'Стрельник'], ['leatherworker', 'Кожевник'],
    ['librarian', 'Библиотекарь'], ['mason', 'Каменщик'], ['shepherd', 'Пастух'], ['toolsmith', 'Инструментальщик'],
    ['weaponsmith', 'Оружейник'], ['none', 'Безработный'], ['nitwit', 'Нищий'],
  ];
  const MAX_USES = 16, RESTOCK_S = 12, LEVELS = ['НОВИЧОК', 'УЧЕНИК', 'РЕМЕСЛЕННИК', 'ЭКСПЕРТ', 'МАСТЕР'];
  let prof = 'farmer', uses = 0, villXp = 0, emeralds = 12, sausages = 0;
  let restockLeft = 0, restockIv = null;
  const tradable = (p) => p !== 'none' && p !== 'nitwit';
  const grid = $('#profGrid');
  grid.innerHTML = PROFS.map(([id, name]) => `<button type="button" data-prof="${id}" class="${tradable(id) ? '' : 'no-trade'}">${esc(name)}</button>`).join('');
  function level() { return Math.min(5, 1 + Math.floor(villXp / 12)); }
  function renderTrade() {
    grid.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.prof === prof));
    const ok = tradable(prof);
    $('#tradeDeal').classList.toggle('refused', !ok);
    $('#usesLeft').textContent = MAX_USES - uses;
    $('#villagerXp').textContent = '+' + villXp;
    const lv = level();
    const lvEl = $('#villagerLevel');
    lvEl.textContent = `${LEVELS[lv - 1]} ${lv}`;
    lvEl.style.color = ['#d8e7ec', '#9fe08a', '#7fe3db', '#ffd76e', '#ff9d76'][lv - 1];
    $('#emeraldCount').textContent = emeralds;
    $('#sausageCount').textContent = sausages;
    $('#buyBtn').disabled = !ok || uses >= MAX_USES || emeralds < 1 || restockLeft > 0;
    const rb = $('#restockBtn');
    rb.hidden = ok && uses < MAX_USES;
    rb.textContent = restockLeft > 0 ? `ЖИТЕЛЬ ЗА ТОВАРОМ · ${restockLeft} С` : 'ЖДАТЬ ПОПОЛНЕНИЯ';
    rb.disabled = restockLeft > 0;
    let bar = $('#usesBar');
    if (!bar) { bar = document.createElement('i'); bar.id = 'usesBar'; $('#usesLeft').parentElement.appendChild(bar); }
    bar.style.width = (uses / MAX_USES) * 100 + '%';
  }
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-prof]'); if (!b) return;
    prof = b.dataset.prof;
    if (restockIv) { clearInterval(restockIv); restockIv = null; restockLeft = 0; uses = 0; }
    uses = 0; villXp = 0; renderTrade();
    tlog(`${stamp()} ${tradable(prof) ? `житель-«${b.textContent}»: уровень Новичок, сделка доступна` : `«${b.textContent}» не торгует: колбаса только у профессионалов`}`);
  });
  function startRestock() {
    if (restockIv) return;
    restockLeft = RESTOCK_S;
    tlog(`${stamp()} лимит исчерпан: житель ушёл за новой партией`);
    renderTrade();
    restockIv = setInterval(() => {
      restockLeft--;
      if (restockLeft <= 0) {
        clearInterval(restockIv); restockIv = null; restockLeft = 0; uses = 0;
        ZM.sfx('wood', .4, 1.2);
        tlog(`${stamp()} житель вернулся: снова 16 покупок`);
      }
      renderTrade();
    }, 1000);
  }
  $('#restockBtn').addEventListener('click', () => { if (restockLeft > 0) tlog(`${stamp()} житель уже идёт — осталось ${restockLeft} с`); });
  $('#buyBtn').addEventListener('click', () => {
    if (!tradable(prof) || uses >= MAX_USES || emeralds < 1 || restockLeft > 0) return;
    uses++; emeralds--; sausages++; villXp++; ZM.sfx('orb', .4, 1.15);
    tlog(`${stamp()} обмен: 1 изумруд → 1 колбаса (покупка ${uses}/${MAX_USES}, опыт жителя +1)`);
    if (uses >= MAX_USES) startRestock();
    renderTrade();
  });
  tlog(`${stamp()} гастроном открыт: выбери профессию жителя за прилавком`);
  renderTrade();

  /* ---------- 3D-диорама: прилавок гастронома ---------- */
  (function deli3d() {
    const fig = $('#sausageArt'), cv = $('#sausage3d');
    if (!fig || !cv) return;
    if (!(window.ZMGeo && ZMGeo.supported())) { fig.classList.add('no3d'); return; }

    /* --- текстура прилавка: кафель, столешница, крашеное дерево, фарш, латунь, ценник --- */
    const tex = (() => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 128;
      const g = c.getContext('2d');
      let seed = 777; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

      /* кафельная стена (0,0)-(108,28): плитка 9×9 со швами */
      g.fillStyle = '#cfc2a4'; g.fillRect(0, 0, 108, 28);
      for (let ty = 0; ty < 28; ty += 9) for (let tx = 0; tx < 108; tx += 9) {
        const v = 232 + (rnd() * 16 | 0);
        g.fillStyle = `rgb(${v},${v - 8},${v - 26})`;
        g.fillRect(tx + 1, ty + 1, 7, 7);
        g.fillStyle = 'rgba(120,100,70,.25)'; g.fillRect(tx + 1, ty + 7, 7, 1);
      }
      /* красная лента на стене */
      g.fillStyle = '#a02721'; g.fillRect(0, 12, 108, 4);
      g.fillStyle = '#c23b2e'; g.fillRect(0, 12, 108, 1);

      /* столешница (0,32)-(124,52): белая с прожилками */
      g.fillStyle = '#e8e4da'; g.fillRect(0, 32, 124, 20);
      g.strokeStyle = 'rgba(150,145,135,.5)'; g.lineWidth = 1;
      for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(rnd() * 124, 32); g.lineTo(rnd() * 124, 52); g.stroke(); }
      g.fillStyle = 'rgba(190,185,175,.8)'; g.fillRect(0, 32, 124, 2);

      /* фронт прилавка (0,56)-(124,84): крашеные доски */
      g.fillStyle = '#7e2a22'; g.fillRect(0, 56, 124, 28);
      for (let x = 0; x < 124; x += 12) {
        g.fillStyle = x % 24 ? '#8e3129' : '#872c24'; g.fillRect(x + 1, 57, 10, 26);
        g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x, 56, 1, 28);
        g.fillStyle = 'rgba(255,220,180,.10)'; g.fillRect(x + 1, 57, 10, 1);
      }
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 82, 124, 2);

      /* доска (128,32) 50×10: светлое дерево */
      g.fillStyle = '#c9a06a'; g.fillRect(128, 32, 50, 10);
      for (let y = 33; y < 42; y += 2) { g.fillStyle = 'rgba(120,80,40,.30)'; g.fillRect(128, y + (rnd() * 2 | 0), 50, 1); }
      g.fillStyle = 'rgba(60,35,15,.5)'; g.fillRect(128, 32, 50, 1);

      /* фарш колбасы (128,56) 38×15 */
      g.fillStyle = '#cf8d7b'; g.fillRect(128, 56, 38, 15);
      seed = 555;
      for (let i = 0; i < 300; i++) {
        g.fillStyle = rnd() < .72 ? 'rgba(245,232,221,.85)' : 'rgba(158,92,78,.9)';
        g.fillRect(128 + (rnd() * 38 | 0), 56 + (rnd() * 15 | 0), rnd() < .3 ? 2 : 1, 1);
      }
      g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(128, 58, 38, 2); /* блик оболочки */
      g.fillStyle = 'rgba(120,60,50,.35)'; g.fillRect(128, 69, 38, 1);

      /* срез ломтика: круг фарша на (152,58) 4×4 внутри (150,56)-(162,62) */
      g.fillStyle = '#e8a392'; g.fillRect(150, 56, 12, 6);
      g.fillStyle = '#d7907e'; g.fillRect(152, 57, 8, 4);
      g.fillStyle = 'rgba(245,240,230,.95)'; g.fillRect(153, 58, 1, 1); g.fillRect(156, 59, 1, 1); g.fillRect(155, 57, 1, 1);

      /* кончики (170,56) 22×12 */
      g.fillStyle = '#c98a78'; g.fillRect(170, 56, 22, 12);
      for (let i = 0; i < 120; i++) { g.fillStyle = rnd() < .7 ? 'rgba(240,228,216,.7)' : 'rgba(150,88,74,.8)'; g.fillRect(170 + (rnd() * 22 | 0), 56 + (rnd() * 12 | 0), 1, 1); }

      /* латунь гирьки (128,76) 16×8 + ножка (150,76) */
      g.fillStyle = '#b98a3e'; g.fillRect(128, 76, 16, 8);
      g.fillStyle = '#e2b95e'; g.fillRect(128, 76, 16, 2);
      g.fillStyle = '#8c6425'; g.fillRect(128, 82, 16, 2);
      g.fillStyle = '#b98a3e'; g.fillRect(150, 76, 5, 5);
      g.fillStyle = '#e2b95e'; g.fillRect(150, 76, 5, 1);

      /* ценник (168,32) 32×24: белый ярлык, изумруд, «1» */
      g.fillStyle = '#f6efdc'; g.fillRect(168, 32, 32, 24);
      g.strokeStyle = '#a02721'; g.lineWidth = 2; g.strokeRect(169.5, 33.5, 29, 21);
      g.fillStyle = '#1e9e56';
      g.fillRect(180, 38, 8, 10); g.fillRect(178, 40, 12, 6);
      g.fillStyle = '#57d68d'; g.fillRect(180, 40, 4, 4); g.fillRect(184, 44, 4, 3);
      g.fillStyle = '#a02721'; g.font = '900 9px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('1', 194, 44);
      g.fillStyle = '#5a4a33'; g.font = '700 5px monospace';
      g.fillText('ИЗУМРУД', 186, 52);
      return c.toDataURL('image/png');
    })();

    /* --- геометрия диорамы --- */
    const SLICES = 10;
    const GEO = {
      tw: 256, th: 128,
      bones: [
        { name: 'wall', pivot: [0, 0, 0], cubes: [{ origin: [-26, 0, -13], size: [52, 26, 2], uv: [0, 0] }] },
        { name: 'counter', pivot: [0, 0, 0], cubes: [
          { origin: [-22, 10, -9], size: [44, 2, 18], uv: [0, 32] },
          { origin: [-22, 0, -9], size: [44, 10, 18], uv: [0, 56] },
        ] },
        { name: 'board', pivot: [0, 12, 0], cubes: [{ origin: [-13, 12, -3], size: [16, 1, 9], uv: [128, 32] }] },
        { name: 'sausage', pivot: [0, 13, 0], cubes: [
          { origin: [-11, 13, -2.5], size: [14, 5, 5], uv: [128, 56] },
          { origin: [-13.5, 13.5, -2], size: [3, 4, 4], uv: [170, 56], rotation: [0, 0, 10], pivot: [-11, 15.5, 0] },
          { origin: [10.5, 13.5, -2], size: [3, 4, 4], uv: [170, 56], rotation: [0, 0, -10], pivot: [10, 15.5, 0] },
        ] },
        { name: 'weight', pivot: [0, 12, 0], cubes: [
          { origin: [15, 12, -6], size: [4, 4, 4], uv: [128, 76] },
          { origin: [16.4, 16, -4.6], size: [1.2, 1.2, 1.2], uv: [150, 76] },
        ] },
        { name: 'tag', pivot: [8, 12, 6], cubes: [
          { origin: [4, 12, 5.7], size: [8, 6, 0.6], rotation: [0, 0, -7], uv: { south: { uv: [168, 32], uv_size: [32, 24] } } },
        ] },
      ].concat(Array.from({ length: SLICES }, (_, i) => ({
        name: 'slice' + i, pivot: [0, 12, 0],
        cubes: [{ origin: [3.2 + i * 1.5, 12.2, 5], size: [4, 4, 1.6], uv: [150, 56] }],
      }))),
    };

    let api = null;
    try {
      api = ZMGeo.create(cv, {
        geo: GEO, tex, nearest: true, lit: 1,
        hide: Array.from({ length: SLICES }, (_, i) => 'slice' + i),
        cam: { yaw: -24, pitch: 13, dist: 86, target: [0, 13, 0], fov: 31 },
      });
    } catch (e) { api = null; }
    if (!api) { fig.classList.add('no3d'); return; }
    fig.classList.add('ready'); /* канвас поверх фолбэка: пусто, пока не готова текстура — не страшно */

    const st = K.spinner(cv, { ry: -24, rx: 0 }, 46);
    let seen = false, last = 0, ang = -24, cut = 0, jiggle = 0, first = false;
    new IntersectionObserver((e) => (seen = e[0].isIntersecting), { rootMargin: '120px' }).observe(cv);
    const D2R = Math.PI / 180;
    function frame(now) {
      requestAnimationFrame(frame);
      if (!seen || document.hidden || !cv.clientWidth) return;
      const dt = Math.min(.05, (now - last) / 1000) || .016; last = now;
      api.tick(dt);
      if (st.idle()) ang += dt * 10; else ang = st.ry;
      api.setExtra(ZMGeo.M.mul(ZMGeo.M.rx(st.rx * D2R), ZMGeo.M.ry(ang * D2R)));
      if (jiggle > 0) { jiggle = Math.max(0, jiggle - dt * 2); api.setBoneRot('sausage', [0, 0, Math.sin(now * .04) * 6 * jiggle]); }
      else api.setBoneRot('sausage', null);
      api.render();
      if (!first) { first = true; fig.classList.add('drawn'); }
    }
    requestAnimationFrame(frame);

    cv.addEventListener('click', () => {
      if (performance.now() - (st.last || 0) < 260) return; /* это был drag */
      if (cut < SLICES) {
        api.hide('slice' + cut, false); cut++;
        jiggle = 1; ZM.sfx('cloth', .35, 1.4 + cut * .05);
        log(`${stamp()} отрезан ломтик ${cut}/10 — бесплатно, по доброте`);
        if (cut === SLICES) log(`${stamp()} колбаса кончилась! весы показывают ноль`);
      } else {
        for (let i = 0; i < SLICES; i++) api.hide('slice' + i, true);
        cut = 0; jiggle = 1; ZM.sfx('wood', .4, 1.3);
        log(`${stamp()} новая палка колбасы на прилавке`);
      }
    });
  })();

  log(`${stamp()} ГОСТЕВОЙ ПУНКТ Б · добро пожаловать в гастроном`);

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
