/* Г-Б · Мистер Б — Докторская колбаса.
 * Числа из исходников: FoodProperties (10 / 0.8 / мясо), BasicItemListing
 * (1 изумруд → 1 колбаса, 16 использований, +1 XP жителю, множитель 0.05),
 * предложение вешается на уровень «Новичок» любого профессионального жителя. */
(() => {
  'use strict';
  const { $, esc } = ZM, U = ZM.url, K = ZM.kit;
  ZM.topbar({ crumb: 'Гость Б · Докторская колбаса' });

  /* ---------- навигация по ветке + ветка в древе ---------- */
  const nav = $('#guestNav');
  if (nav && ZM.GUEST_POINTS) {
    const i = ZM.GUEST_POINTS.findIndex((g) => g.page && g.page.includes('/g1-'));
    const next = ZM.GUEST_POINTS[i + 1];
    nav.innerHTML =
      (next ? `<a href="${U(next.page)}"><b>К</b> Далее: ${esc(next.title)}</a>` : '') +
      `<a href="${U('index.html#guests-sec')}"><b>≡</b> Все гостевые пункты</a>` +
      `<a class="g-all" href="${U('index.html#tree/101')}"><b>❦</b> Ветка Б в древе ачивок</a>` +
      `<a class="g-all" href="${U('index.html#points')}"><b>→</b> Основная линейка</a>`;
  }

  /* ---------- стенд-цели: ветка гостя в общем древе ---------- */
  const G = (ZM.GUEST_ADV || []).find((g) => g.id === 'g1');
  const adv = G && K ? K.adv({
    list: G.adv.map((a) => ({ key: a.key, title: a.t, color: a.mc, bold: a.b, frame: a.frame, xp: a.xp, icon: U(a.icon), desc: a.d, how: a.how })),
    store: G.store,
    icon: (a) => a.icon,
    intro: 'Цели гостя скрыты, как ачивки в игре: открываются действиями на этом стенде.',
  }) : null;

  /* ---------- журнал ---------- */
  const log = (sel, txt) => { const el = $(sel); const row = document.createElement('div'); row.textContent = txt; el.appendChild(row); el.scrollTop = el.scrollHeight; };

  /* ---------- 01. еда ---------- */
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
    if (hunger >= 20) { $('#eatNote').innerHTML = 'Голод уже полный — колбаса подождёт.'; return; }
    hunger = Math.min(20, hunger + 10);
    renderHunger(); ZM.sfx('pop', .5, 1.1);
    $('#eatNote').innerHTML = '+10 голода и насыщение ×0.8. Пометка «мясо» — такой же кусок лечит волка.';
    log('#receipt', 'съеден кусок: голод ' + hunger + '/20');
    if (adv) { adv.grant('bite'); if (hunger >= 20) adv.grant('full'); }
  });
  $('#fastBtn').addEventListener('click', () => { hunger = Math.max(0, hunger - 6); renderHunger(); $('#eatNote').innerHTML = 'Шесть единиц голода потрачено — можно пробовать снова.'; });
  $('#eatReset').addEventListener('click', () => { hunger = 14; renderHunger(); $('#eatNote').innerHTML = 'Одно использование восстанавливает <b>10 единиц</b>: пять целых иконок голода.'; });
  renderHunger();

  /* ---------- 02. торговля ---------- */
  const PROFS = [
    ['armorer', 'Бронник'], ['butcher', 'Мясник'], ['cartographer', 'Картограф'], ['cleric', 'Священник'],
    ['farmer', 'Фермер'], ['fisherman', 'Рыбак'], ['fletcher', 'Стрельник'], ['leatherworker', 'Кожевник'],
    ['librarian', 'Библиотекарь'], ['mason', 'Каменщик'], ['shepherd', 'Пастух'], ['toolsmith', 'Инструментальщик'],
    ['weaponsmith', 'Оружейник'], ['none', 'Безработный'], ['nitwit', 'Нищий'],
  ];
  const MAX_USES = 16, RESTOCK_S = 12, LEVELS = ['НОВИЧОК', 'УЧЕНИК', 'РЕМЕСЛЕННИК', 'ЭКСПЕРТ', 'МАСТЕР'];
  let prof = 'farmer', uses = 0, villXp = 0, emeralds = 12, sausages = 0;
  let restockLeft = 0, restockIv = null;
  const visited = new Set(['farmer']);
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
    /* полоска сделок: 16 клеток, как прочность предмета */
    let bar = $('#usesBar');
    if (!bar) { bar = document.createElement('i'); bar.id = 'usesBar'; $('#usesLeft').parentElement.appendChild(bar); }
    bar.style.width = (uses / MAX_USES) * 100 + '%';
  }
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-prof]'); if (!b) return;
    prof = b.dataset.prof; visited.add(prof);
    if (visited.size >= PROFS.length && adv) adv.grant('taster');
    if (restockIv) { clearInterval(restockIv); restockIv = null; restockLeft = 0; uses = 0; }
    uses = 0; villXp = 0; renderTrade();
    log('#tradeLog', tradable(prof) ? `житель-профессионал «${b.textContent}»: уровень Новичок, сделка доступна` : `«${b.textContent}» не торгует: колбаса только у профессионалов`);
  });
  function startRestock() {
    if (restockIv) return;
    restockLeft = RESTOCK_S;
    log('#tradeLog', 'лимит исчерпан: житель ушёл за новой партией колбасы');
    renderTrade();
    restockIv = setInterval(() => {
      restockLeft--;
      if (restockLeft <= 0) {
        clearInterval(restockIv); restockIv = null; restockLeft = 0; uses = 0;
        ZM.sfx('wood', .4, 1.2);
        log('#tradeLog', 'житель вернулся: снова 16 покупок');
      }
      renderTrade();
    }, 1000);
  }
  $('#restockBtn').addEventListener('click', () => { if (restockLeft > 0) log('#tradeLog', 'житель уже идёт — осталось ' + restockLeft + ' с'); });
  $('#buyBtn').addEventListener('click', () => {
    if (!tradable(prof) || uses >= MAX_USES || emeralds < 1 || restockLeft > 0) return;
    uses++; emeralds--; sausages++; villXp++; ZM.sfx('orb', .4, 1.15);
    log('#tradeLog', `обмен: 1 изумруд → 1 колбаса (покупка ${uses}/${MAX_USES}, опыт жителя +1)`);
    log('#receipt', 'куплено у жителя: −1 изумруд, +1 колбаса');
    if (adv) { adv.grant('deal'); if (uses >= MAX_USES) adv.grant('regular'); }
    if (uses >= MAX_USES) startRestock();
    renderTrade();
  });
  log('#tradeLog', 'стенд готов: выбери профессию жителя');
  renderTrade();

  /* ---------- 3D: колбаса на разделочной доске ---------- */
  (function sausage3d() {
    const fig = $('#sausageArt'), cv = $('#sausage3d');
    if (!fig || !cv || !(window.ZMGeo && ZMGeo.supported())) return;
    const tex = (() => {
      const c = document.createElement('canvas'); c.width = 128; c.height = 64;
      const g = c.getContext('2d');
      g.fillStyle = '#cf8d7b'; g.fillRect(0, 0, 128, 28);            /* фарш */
      for (let i = 0; i < 480; i++) { g.fillStyle = Math.random() < .75 ? 'rgba(245,232,221,.8)' : 'rgba(158,92,78,.85)'; g.fillRect(Math.random() * 128 | 0, Math.random() * 28 | 0, Math.random() < .3 ? 2 : 1, 1); }
      g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(0, 4, 128, 2); /* блик оболочки */
      g.fillStyle = '#8a5a33'; g.fillRect(0, 32, 128, 32);            /* доска */
      for (let y = 34; y < 64; y += 3) { g.fillStyle = 'rgba(94,56,30,.55)'; g.fillRect(0, y + (Math.random() * 2 | 0), 128, 1); }
      for (let i = 0; i < 26; i++) { g.fillStyle = 'rgba(58,33,16,.4)'; g.fillRect(Math.random() * 128 | 0, 33 + (Math.random() * 30 | 0), 2, 2); }
      return c.toDataURL('image/png');
    })();
    const GEO = {
      tw: 128, th: 64,
      bones: [
        { name: 'board', pivot: [0, 0, 0], cubes: [
          { origin: [-16, 0, -11], size: [32, 2, 22], uv: [2, 34] },
        ] },
        { name: 'sausage', pivot: [0, 2, 0], cubes: [
          { origin: [-11, 3, -3.5], size: [22, 7, 7], uv: [2, 2] },
          { origin: [-14, 3.5, -3], size: [3, 6, 6], uv: [66, 3], rotation: [0, 0, 12], pivot: [-11, 6.5, 0] },
          { origin: [11, 3.5, -3], size: [3, 6, 6], uv: [66, 3], rotation: [0, 0, -12], pivot: [11, 6.5, 0] },
        ] },
      ],
    };
    let api;
    try { api = ZMGeo.create(cv, { geo: GEO, tex, nearest: true, lit: 1, cam: { yaw: 34, pitch: 20, dist: 54, target: [0, 6, 0], fov: 34 } }); } catch (e) { api = null; }
    if (!api) return;
    fig.classList.add('ready');
    const st = K.spinner(cv, { ry: 30, rx: 0 }, 50);
    let seen = false, last = 0, ang = 30, poke = 0;
    new IntersectionObserver((e) => (seen = e[0].isIntersecting), { rootMargin: '90px' }).observe(cv);
    const D2R = Math.PI / 180;
    function frame(now) {
      requestAnimationFrame(frame);
      if (!seen || document.hidden || !cv.clientWidth) return;
      const dt = Math.min(.05, (now - last) / 1000) || .016; last = now;
      api.tick(dt);
      if (st.idle()) ang = (ang + dt * 16) % 360; else ang = st.ry;
      api.setExtra(ZMGeo.M.mul(ZMGeo.M.rx(st.rx * D2R), ZMGeo.M.ry(ang * D2R)));
      const wob = Math.sin(now * .0016) * 3 + (poke > 0 ? Math.sin(now * .05) * 8 * poke : 0);
      if (poke > 0) poke = Math.max(0, poke - dt * 1.6);
      api.setBoneRot('sausage', [0, 0, wob]);
      api.render();
    }
    requestAnimationFrame(frame);
    cv.addEventListener('click', () => {
      poke = 1; ZM.sfx('cloth', .35, 1.5);
      log('#receipt', 'гость Б потыкал колбасу пальцем — целая');
    });
  })();
})();
