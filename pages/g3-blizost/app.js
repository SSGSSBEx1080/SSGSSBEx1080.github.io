/* Г-В · Мистер В — Команды близости: /sex, /blowjob, /yes, /no.
 * Вся механика — из исходников: IntimacyCommand.java (4 команды),
 * IntimacyManager.java (RADIUS 2, сессия 10 с, рефрактерность 60 с,
 * кулдаун команды 5 с, приглашение 30 с, 5 колебаний/сек, эффекты),
 * IntimacyAchievements.java (условия всех 19 ачивок 00_guest).
 * Стенд честный: ты играешь и за себя, и за цель — ачивки обеих сторон твои. */
(() => {
  'use strict';
  const { $, esc } = ZM, U = ZM.url, K = ZM.kit;
  ZM.topbar({ crumb: 'Гость В · Команды близости' });

  /* ---------- навигация ---------- */
  const nav = $('#guestNav');
  if (nav && ZM.GUEST_POINTS) {
    const i = ZM.GUEST_POINTS.findIndex((g) => g.page && g.page.includes('/g3-'));
    const next = ZM.GUEST_POINTS[i + 1];
    nav.innerHTML =
      (next ? `<a href="${U(next.page)}"><b>${esc(next.letter)}</b> Далее: ${esc(next.title)}</a>` : '') +
      `<a href="${U('index.html#guests-sec')}"><b>≡</b> Все гостевые пункты</a>` +
      `<a class="g-all" href="${U('index.html#tree/103')}"><b>❦</b> Ветка В в древе ачивок</a>` +
      `<a class="g-all" href="${U('index.html#points')}"><b>→</b> Основная линейка</a>`;
  }

  /* ---------- стенд-цели: 19 настоящих ачивок 00_guest ---------- */
  const G = (ZM.GUEST_ADV || []).find((g) => g.id === 'g3');
  const adv = G && K ? K.adv({
    list: G.adv.map((a) => ({ key: a.key, title: a.t, color: a.mc, bold: a.b, frame: a.frame, xp: a.xp, icon: U(a.icon), desc: a.d, how: a.how })),
    store: G.store,
    icon: (a) => a.icon,
    intro: 'Вся ветка В — из папки 00_guest мода. Скрытые, как в игре: открываются действиями на чат-полигоне.',
  }) : null;

  /* ---------- чат ---------- */
  const chatEl = $('#chatLog');
  const say = (t) => K.chat(chatEl, t, 60);
  const me = () => ZM.profile.me().nick;

  /* ---------- константы из IntimacyManager ---------- */
  const RADIUS = 2, DURATION = 10, REFRACTORY = 60, CMD_CD = 5, INVITE_TTL = 30, OSC_HZ = 5;

  /* ---------- цели стенда ---------- */
  const PLAYERS = ['Толя', 'Вован', 'Лена', 'Олег', 'Макс', 'Даша', 'Гоша', 'Стас', 'Рита', 'Кузя'];
  const ANIMALS = ['овца', 'свинья', 'корова', 'курица', 'кролик', 'конь', 'волк', 'кот', 'лама'];
  const VILLAGERS = ['житель', 'торговец'];
  const NAMED = { 'торговец': 'Странствующий торговец', 'житель': 'Житель' };
  const isPlayer = (t) => PLAYERS.some((p) => p.toLowerCase() === t);
  const isAnimal = (t) => ANIMALS.some((p) => p === t);
  const isVillager = (t) => VILLAGERS.includes(t);
  const dispName = (t) => NAMED[t] || (isPlayer(t) ? PLAYERS.find((p) => p.toLowerCase() === t) : t);

  /* ---------- состояние ---------- */
  let cmdCd = 0, refr = 0;
  let invite = null;          /* {type:'sex'|'bj', target, left} */
  let session = null;         /* {type, partner, kind, initiatedByUser, left, osc} */
  let far = false;            /* дистанция до цели: 1.5 или 3 блока */
  let location = 'plain';
  let cmdPick = null;         /* выбранная команда чипом */
  let counts = { sessions: 0, partners: new Set(), animals: new Set(), villagers: 0, villagerInit: false, playerInit: false, playerRecv: false, bjRecv: false, declined: false };
  let vilChipAt = 0;          /* когда житель сам может пригласить */

  const LOCS = [
    ['plain', 'Равнина'], ['forest', 'Лес'], ['taiga', 'Тайга'], ['jungle', 'Джунгли'], ['swamp', 'Болото'],
    ['nether', 'Незер'], ['end', 'Край'], ['water', 'Под водой'], ['deep', 'Пещера Y<−30'],
  ];

  /* ---------- HUD ---------- */
  function hud() {
    const h = [];
    if (session) h.push(`<span class="hud-chip hot">СЕССИЯ ${session.left} с · колебаний ${session.osc}/${DURATION * OSC_HZ}</span>`);
    if (refr > 0) h.push(`<span class="hud-chip cd">РЕФРАКТЕРНОСТЬ ${refr} с</span>`);
    if (cmdCd > 0) h.push(`<span class="hud-chip">КОМАНДА ${cmdCd} с</span>`);
    if (invite) h.push(`<span class="hud-chip inv">ПРИГЛАШЕНИЕ ${invite.left} с</span>`);
    $('#hud').innerHTML = h.join('') || '<span class="hud-chip ok">ГОТОВ К КОМАНДАМ</span>';
    $('#locNow').textContent = LOCS.find((l) => l[0] === location)[1];
  }

  /* ---------- статистика (раздел 03) ---------- */
  function stats() {
    const rows = [
      ['Сессий всего', counts.sessions, 10, 'tired — «Ебанутый дрочер без мамы»'],
      ['Партнёров-игроков', counts.partners.size, 10, 'maniac — «Вот такая пара.»'],
      ['Видов животных', counts.animals.size, 9, 'farmer_pervert — «Фермер-извращенец»'],
      ['Сессий с жителями', counts.villagers, 10, 'mayor — «Мэр деревни гэнг бэнг»'],
    ];
    $('#statRows').innerHTML = rows.map(([t, v, m, d]) => `
      <div class="stat-row"><span class="stat-t">${t}</span>
        <span class="stat-bar"><i style="width:${Math.min(100, (v / m) * 100)}%"></i></span>
        <b>${v} / ${m}</b><small>${d}</small></div>`).join('');
  }

  /* ---------- ачивки по правилам IntimacyAchievements ---------- */
  function checkBiome() {
    if (location === 'forest' || location === 'taiga') adv && adv.grant('forest_king');
    if (location === 'jungle' || location === 'swamp') adv && adv.grant('nature_guardian');
    if (location === 'end') adv && adv.grant('ender_bang');
    if (location === 'nether') adv && adv.grant('nether_bang');
    if (location === 'water') adv && adv.grant('water_bang');
    if (location === 'deep') adv && adv.grant('cave_bang');
  }
  function onSessionEnd() {
    const s = session; session = null;
    counts.sessions++;
    if (s.kind === 'player') {
      counts.partners.add(s.partner);
      if (s.initiatedByUser) { if (!counts.playerInit) { counts.playerInit = true; adv && adv.grant('first_time'); } }
      else {
        if (!counts.playerRecv) { counts.playerRecv = true; adv && adv.grant('first_time_receive'); adv && adv.grant('trusting'); }
        if (s.type === 'bj' && !counts.bjRecv) { counts.bjRecv = true; adv && adv.grant('submitted'); }
      }
    } else if (s.kind === 'animal') {
      counts.animals.add(s.partner);
      adv && adv.grant('animal_lover');
      adv && adv.grant('gave_up');
    } else if (s.kind === 'villager') {
      counts.villagers++;
      adv && adv.grant('diplomat');
      if (!s.initiatedByUser && !counts.villagerInit) {
        counts.villagerInit = true; adv && adv.grant('caring');
        say('§aЖитель передал тебе полезный букетик. §7Регенерация активна');
      }
    }
    if (counts.sessions >= 10) adv && adv.grant('tired');
    if (counts.partners.size >= 10) adv && adv.grant('maniac');
    if (counts.animals.size >= 9) adv && adv.grant('farmer_pervert');
    if (counts.villagers >= 10) adv && adv.grant('mayor');
    checkBiome();
    refr = REFRACTORY;
    stats(); hud(); renderSess();
  }

  /* ---------- сессия ---------- */
  function hearts(n) {
    const host = $('#sessFx');
    for (let i = 0; i < n; i++) {
      const im = document.createElement('img');
      im.src = U('assets/textures/p22/i/h_full.png'); im.alt = ''; im.className = 'fx-heart';
      host.appendChild(im);
      const x = 10 + Math.random() * 80, d = 1200 + Math.random() * 900;
      im.style.left = x + '%';
      im.animate([
        { transform: `translate(0,0) scale(.6)`, opacity: 0 },
        { opacity: 1, offset: .2 },
        { transform: `translate(${(Math.random() - .5) * 60}px,-${90 + Math.random() * 120}px) scale(1.15)`, opacity: 0 },
      ], { duration: d, easing: 'ease-out' }).onfinish = () => im.remove();
    }
  }
  function startSession(kind, partner, type, initiatedByUser) {
    session = { kind, partner, type, initiatedByUser, left: DURATION, osc: 0 };
    invite = null;
    const dn = dispName(partner);
    if (initiatedByUser) {
      if (type === 'bj') say(`§fВам отсасывает хуй ${kind === 'player' ? 'игрок ' : ''}${dn}`);
      else say(`§fТы начинаешь ебаться с ${dn}!`);
    } else {
      say(`§f${dn} начинает сессию с тобой!`);
      if (type === 'bj') say('§7Ты приседаешь (Pose.CROUCHING)');
    }
    if (kind === 'animal') say(`§8${dn} замирает: setNoAi(true), навигация остановлена`);
    if (kind === 'villager') say('§8Житель озвучивает сделку: villager_trade, 0.5F / 1.5F');
    if (type === 'bj' && initiatedByUser && kind === 'player') say(`§7${dn} приседает (Pose.CROUCHING)`);
    say('§8Эффекты: Замедление 255 + Слепота, 200 тиков · неуязвимость · 30 сердечек + 15 искр обоим');
    ZM.sfx('cloth', .5, .8); ZM.sfx('pop', .5, 1.2);
    hearts(30);
    $('#sessPanel').classList.add('on');
    renderSess(); hud();
  }
  function renderSess() {
    const p = $('#sessPanel');
    if (!session) { p.classList.remove('on'); return; }
    $('#sessBar').style.width = ((DURATION - session.left) / DURATION) * 100 + '%';
    $('#sessTxt').textContent = `${dispName(session.partner)} · осталось ${session.left} с · колебаний ${session.osc}/${DURATION * OSC_HZ}`;
  }

  /* ---------- приглашение ---------- */
  function renderInvite() {
    const bar = $('#inviteBar');
    if (!invite) { bar.classList.remove('on'); bar.innerHTML = ''; return; }
    bar.classList.add('on');
    bar.innerHTML = `<span class="inv-who">ТЫ — ${esc(dispName(invite.target))}:</span>
      <button type="button" class="g-btn tiny" id="invYes">/yes</button>
      <button type="button" class="g-btn tiny" id="invNo">/no</button>
      <span class="inv-ttl">истекает через ${invite.left} с</span>`;
    $('#invYes').addEventListener('click', () => exec('/yes'));
    $('#invNo').addEventListener('click', () => exec('/no'));
  }

  /* ---------- разбор команд ---------- */
  function exec(raw) {
    const line = raw.trim().replace(/\s+/g, ' ');
    if (!line) return;
    say(`§f<${me()}> ${line.replace(/[<>&]/g, '')}`);
    if (!line.startsWith('/')) { say('§8Это не команда. Начни со слэша: /sex, /blowjob, /yes, /no'); return; }
    const parts = line.slice(1).split(' ');
    const c = parts[0].toLowerCase(), arg = (parts[1] || '').toLowerCase();
    if (c === 'yes' || c === 'no') return answer(c === 'yes');
    if (c !== 'sex' && c !== 'blowjob') { say('§8Неизвестная команда. Доступны: /sex <цель>, /blowjob <цель>, /yes, /no'); return; }
    const type = c === 'sex' ? 'sex' : 'bj';
    if (!arg) { say('§8Формат: /' + c + ' <цель> — ник игрока или имя существа рядом'); return; }
    if (!isPlayer(arg) && !isAnimal(arg) && !isVillager(arg)) { say('§cЦель не найдена.'); return; }
    if (refr > 0) { say(`§cТы ещё не отошёл после прошлого раза. Подожди ещё ${refr} сек.`); return; }
    if (cmdCd > 0) { say('§cПодожди 5 секунд перед следующим приглашением.'); return; }
    if (far) { say('§cСлишком далеко. Подойди ближе.'); return; }
    cmdCd = CMD_CD;
    if (isPlayer(arg)) {
      invite = { type, target: dispName(arg), left: INVITE_TTL };
      say(`§e${me()} хочет заняться близостью. Введи /yes или /no`);
      say(`§7Приглашение отправлено ${dispName(arg)}`);
    } else {
      const kind = isAnimal(arg) ? 'animal' : 'villager';
      startSession(kind, arg, type, true);
    }
    renderInvite(); hud();
  }
  function answer(yes) {
    if (!invite) { say('§cУ тебя нет активных приглашений.'); return; }
    const inv = invite;
    if (!yes) {
      say('§fТы отказался.');
      say(`§7${inv.target} отказался.`);
      invite = null;
      if (!counts.declined) { counts.declined = true; adv && adv.grant('rejected'); }
      renderInvite(); hud(); return;
    }
    if (far) { say('§cПартнёр отошёл слишком далеко.'); return; }
    if (refr > 0) { say('§cПартнёр ещё не отошёл после прошлого раза.'); return; }
    invite = null;
    startSession('player', inv.target.toLowerCase(), inv.type, false);
    renderInvite(); hud();
  }

  /* ---------- житель сам приглашает (для «Заботливого») ---------- */
  function maybeVillagerChip() {
    const chip = $('#vilChip');
    if (session || invite || refr > 0 || counts.villagers < 1) { chip.classList.remove('on'); return; }
    if (Date.now() < vilChipAt) return;
    vilChipAt = Date.now() + 40000;
    chip.classList.add('on');
    say('§eЖитель хочет заняться близостью с тобой. Введи /yes или /no');
    setTimeout(() => chip.classList.remove('on'), 30000);
  }
  $('#vilYes').addEventListener('click', () => { $('#vilChip').classList.remove('on'); if (!session && refr <= 0) startSession('villager', 'житель', 'sex', false); });
  $('#vilNo').addEventListener('click', () => { $('#vilChip').classList.remove('on'); say('§fТы отказался.'); say('§7Житель отказался.'); if (!counts.declined) { counts.declined = true; adv && adv.grant('rejected'); } });

  /* ---------- тикер ---------- */
  setInterval(() => {
    if (cmdCd > 0) cmdCd--;
    if (refr > 0) refr--;
    if (invite) { invite.left--; if (invite.left <= 0) { say('§cПриглашение истекло.'); invite = null; renderInvite(); } else renderInvite(); }
    if (session) {
      session.left--; session.osc += OSC_HZ;
      if (session.left <= 0) { say('§8Сессия завершена.'); onSessionEnd(); }
      renderSess();
      if (session && (session.osc % 15 === 0)) hearts(6);
    }
    maybeVillagerChip();
    hud();
  }, 1000);

  /* ---------- панель управления ---------- */
  $('#cmdRow').innerHTML = ['sex', 'blowjob', 'yes', 'no'].map((c) => `<button type="button" class="cmd-key" data-cmd="/${c}">/${c}</button>`).join('');
  $('#targetRow').innerHTML =
    PLAYERS.map((p) => `<button type="button" class="tgt-chip p" data-t="${p.toLowerCase()}">${esc(p)}</button>`).join('') +
    ANIMALS.map((p) => `<button type="button" class="tgt-chip a" data-t="${p}">${esc(p)}</button>`).join('') +
    VILLAGERS.map((p) => `<button type="button" class="tgt-chip v" data-t="${p}">${esc(NAMED[p])}</button>`).join('');
  $('#cmdRow').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cmd]'); if (!b) return;
    const c = b.dataset.cmd;
    if (c === '/yes' || c === '/no') return exec(c);
    const was = cmdPick === c;
    cmdPick = was ? null : c;
    $('#cmdRow').querySelectorAll('.cmd-key').forEach((k) => k.classList.toggle('pick', k.dataset.cmd === cmdPick));
    $('#targetRow').classList.toggle('armed', !!cmdPick);
    $('#pickHint').textContent = cmdPick ? `цель для ${cmdPick}:` : 'или собери команду сам:';
  });
  $('#targetRow').addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    if (!cmdPick) { $('#pickHint').textContent = 'сначала выбери /sex или /blowjob ↑'; return; }
    exec(`${cmdPick} ${b.dataset.t}`);
  });
  $('#distToggle').addEventListener('click', () => {
    far = !far;
    $('#distToggle').textContent = far ? 'ДИСТАНЦИЯ ДО ЦЕЛИ: 3 БЛОКА' : 'ДИСТАНЦИЯ ДО ЦЕЛИ: 1.5 БЛОКА';
    $('#distToggle').classList.toggle('bad', far);
  });
  $('#locRow').innerHTML = LOCS.map(([id, n]) => `<button type="button" class="loc-chip" data-loc="${id}">${esc(n)}</button>`).join('');
  $('#locRow').addEventListener('click', (e) => {
    const b = e.target.closest('[data-loc]'); if (!b) return;
    location = b.dataset.loc;
    $('#locRow').querySelectorAll('.loc-chip').forEach((c) => c.classList.toggle('on', c.dataset.loc === location));
    say(`§8Локация стенда: ${LOCS.find((l) => l[0] === location)[1]}`);
  });
  $('#chatForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = $('#chatIn');
    exec(inp.value); inp.value = '';
  });

  /* ---------- старт ---------- */
  const kf = $('.keys-float');
  if (kf) for (let i = 0; i < 6; i++) { const im = document.createElement('img'); im.src = U('assets/textures/p22/i/h_full.png'); im.alt = ''; kf.appendChild(im); }
  say('§8Чат-полигон гостя В. Ты играешь за обоих: ачивки обеих сторон — твои.');
  say('§8Команды: /sex <цель> · /blowjob <цель> · /yes · /no. Радиус 2 блока, сессия 10 с.');
  stats(); hud();
})();
