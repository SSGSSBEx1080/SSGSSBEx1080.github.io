/* Г-Б · Мистер Б — Докторская колбаса.
 * Числа взяты из GostDoctorskayaSausageItem (питание) и GostVillagerTrades
 * (BasicItemListing: 1 изумруд, 16 использований, 1 XP, множитель 0.05).
 * Стенд — иллюстрация правил, не клиент Minecraft. */
(() => {
  'use strict';
  const { $, esc } = ZM, U = ZM.url;
  ZM.topbar({ crumb: 'Гость Б · Докторская колбаса' });

  /* ---------- навигация по гостевой ветке ---------- */
  const nav = $('#guestNav');
  if (nav && ZM.GUEST_POINTS) {
    const i = ZM.GUEST_POINTS.findIndex((g) => g.page && g.page.includes('/g1-'));
    const next = ZM.GUEST_POINTS[i + 1];
    nav.innerHTML =
      (next ? `<a href="${U(next.page)}"><b>К</b> Далее: ${esc(next.title)}</a>` : '') +
      `<a href="${U('index.html#guests-sec')}"><b>≡</b> Все гостевые пункты</a>` +
      `<a class="g-all" href="${U('index.html#points')}"><b>→</b> Основная линейка</a>`;
  }

  /* ---------- пасхалка подписи ---------- */
  const log = (sel, txt) => { const el = $(sel); const row = document.createElement('div'); row.textContent = txt; el.appendChild(row); el.scrollTop = el.scrollHeight; };

  /* ---------- 01. еда ---------- */
  const H_FULL = U('assets/textures/p22/i/h_full.png'), H_HALF = U('assets/textures/p22/i/h_half.png'), H_EMPTY = U('assets/textures/p22/i/h_box.png');
  let hunger = 14;
  const hungerBar = $('#hungerBar');
  function renderHunger(flash) {
    $('#hungerVal').textContent = `${hunger} / 20`;
    hungerBar.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const img = document.createElement('img');
      const v = hunger - i * 2;
      img.src = v >= 2 ? H_FULL : v === 1 ? H_HALF : H_EMPTY;
      if (v === 1) img.className = 'half';
      img.alt = '';
      if (flash && v > 0 && i * 2 + 2 > hunger - 10) img.style.animation = 'none';
      hungerBar.appendChild(img);
    }
  }
  $('#eatBtn').addEventListener('click', () => {
    if (hunger >= 20) { $('#eatNote').innerHTML = 'Голод уже полный — колбаса подождёт.'; return; }
    hunger = Math.min(20, hunger + 10);
    renderHunger(); ZM.sfx('pop', .5, 1.1);
    $('#eatNote').innerHTML = '+10 голода и насыщение ×0.8. Пометка «мясо» — такой же кусок лечит волка.';
    log('#receipt', 'съеден кусок: голод ' + hunger + '/20');
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
  const MAX_USES = 16;
  let prof = 'farmer', uses = 0, villXp = 0, emeralds = 12, sausages = 0;
  const tradable = (p) => p !== 'none' && p !== 'nitwit';
  const grid = $('#profGrid');
  grid.innerHTML = PROFS.map(([id, name]) => `<button type="button" data-prof="${id}" class="${tradable(id) ? '' : 'no-trade'}">${esc(name)}</button>`).join('');
  function renderTrade() {
    grid.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.prof === prof));
    const ok = tradable(prof);
    $('#tradeDeal').classList.toggle('refused', !ok);
    $('#usesLeft').textContent = MAX_USES - uses;
    $('#villagerXp').textContent = '+' + villXp;
    $('#emeraldCount').textContent = emeralds;
    $('#sausageCount').textContent = sausages;
    $('#buyBtn').disabled = !ok || uses >= MAX_USES || emeralds < 1;
    $('#restockBtn').hidden = ok && uses < MAX_USES;
  }
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-prof]'); if (!b) return;
    prof = b.dataset.prof; uses = 0; villXp = 0; renderTrade();
    log('#tradeLog', tradable(prof) ? `житель-профессионал «${b.textContent}»: уровень Новичок, сделка доступна` : `«${b.textContent}» не торгует: колбаса только у профессионалов`);
  });
  $('#buyBtn').addEventListener('click', () => {
    if (!tradable(prof) || uses >= MAX_USES || emeralds < 1) return;
    uses++; emeralds--; sausages++; villXp++; ZM.sfx('orb', .4, 1.15);
    log('#tradeLog', `обмен: 1 изумруд → 1 колбаса (покупка ${uses}/${MAX_USES}, опыт жителя +1)`);
    log('#receipt', 'куплено у жителя: −1 изумруд, +1 колбаса');
    if (uses >= MAX_USES) log('#tradeLog', 'лимит сделок исчерпан — ждём пополнения товара');
    renderTrade();
  });
  $('#restockBtn').addEventListener('click', () => { uses = 0; renderTrade(); log('#tradeLog', 'товар пополнен: снова 16 покупок'); });
  log('#tradeLog', 'стенд готов: выбери профессию жителя');
  renderTrade();
})();
