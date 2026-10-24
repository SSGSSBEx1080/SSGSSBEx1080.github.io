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
