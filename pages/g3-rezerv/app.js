/* Г-В · Мистер В — резервный слот. Контента нет, и это честно.
 * Тюнер резерва: семь каналов пустоты на canvas, кадр собирается
 * в буфере 128×80 и растягивается без сглаживания — как ЭЛТ издалека. */
(() => {
  'use strict';
  const { $, esc } = ZM, U = ZM.url, K = ZM.kit;
  ZM.topbar({ crumb: 'Гость В · Пункт зарезервирован' });

  const nav = $('#guestNav');
  if (nav && ZM.GUEST_POINTS) {
    const i = ZM.GUEST_POINTS.findIndex((g) => g.page && g.page.includes('/g3-'));
    const prev = ZM.GUEST_POINTS[i - 1], next = ZM.GUEST_POINTS[i + 1];
    nav.innerHTML =
      (prev ? `<a href="${U(prev.page)}"><b>К</b> Назад: ${esc(prev.title)}</a>` : '') +
      (next ? `<a href="${U(next.page)}"><b>П</b> Далее: ${esc(next.title)}</a>` : '') +
      `<a href="${U('index.html#guests-sec')}"><b>≡</b> Все гостевые пункты</a>` +
      `<a class="g-all" href="${U('index.html#tree/103')}"><b>❦</b> Ветка В в древе ачивок</a>`;
  }

  /* ---------- стенд-цели ---------- */
  const G = (ZM.GUEST_ADV || []).find((g) => g.id === 'g3');
  const adv = G && K ? K.adv({
    list: G.adv.map((a) => ({ key: a.key, title: a.t, color: a.mc, bold: a.b, frame: a.frame, xp: a.xp, icon: U(a.icon), desc: a.d, how: a.how })),
    store: G.store,
    icon: (a) => a.icon,
    intro: 'Цели резерва скрыты: выдаются за сам факт ожидания.',
  }) : null;

  /* ---------- журнал ---------- */
  const waitLog = $('#waitLog');
  const wlog = (t) => { const d = document.createElement('div'); d.textContent = t; waitLog.appendChild(d); while (waitLog.children.length > 11) waitLog.firstChild.remove(); };
  const blink = document.createElement('div');
  blink.className = 'wait-line';
  blink.innerHTML = 'В: <span class="wait-cursor">▊</span>';
  waitLog.appendChild(blink);

  /* ---------- тюнер ---------- */
  const CHANNELS = [
    { name: 'БЕЛЫЙ ШУМ', mode: 'noise' },
    { name: 'СЕРЫЙ ШУМ', mode: 'coarse' },
    { name: 'ЦВЕТНЫЕ ПОЛОСЫ', mode: 'bars' },
    { name: 'СЕТКА', mode: 'grid' },
    { name: 'ЧЁРНЫЙ', mode: 'black' },
    { name: 'ПЕРЕКРЁСТ', mode: 'roll' },
    { name: 'СИНИЙ', mode: 'blue' },
  ];
  const SW = 128, SH = 80;
  const cv = $('#crtCanvas'), g = cv.getContext('2d');
  const buf = document.createElement('canvas'); buf.width = SW; buf.height = SH;
  const b = buf.getContext('2d');
  let ch = 0, t = 0, seen = false, blueSince = 0;
  const visited = new Set([0]);
  const dots = $('#crtDots');
  dots.innerHTML = CHANNELS.map((c, i) => `<i data-ch="${i}"></i>`).join('');
  function renderDots() {
    [...dots.children].forEach((d, i) => {
      d.className = (i === ch ? 'on' : '') + (visited.has(i) ? ' seen' : '');
      d.title = 'Канал ' + (i + 1);
    });
  }
  function setChannel(i, silent) {
    ch = (i + CHANNELS.length) % CHANNELS.length;
    $('#chNum').textContent = 'К' + String(ch + 1).padStart(2, '0');
    $('#chName').textContent = CHANNELS[ch].name;
    if (!silent) ZM.sfx('click', .35, .7 + ch * .06);
    if (CHANNELS[ch].mode === 'blue') blueSince = 0;
    if (!visited.has(ch)) {
      visited.add(ch);
      wlog(`тюнер: канал ${ch + 1} «${CHANNELS[ch].name}» — пусто`);
      if (visited.size >= CHANNELS.length && adv) adv.grant('seek');
    }
    renderDots();
  }
  $('#chDown').addEventListener('click', () => setChannel(ch - 1));
  $('#chUp').addEventListener('click', () => setChannel(ch + 1));
  dots.addEventListener('click', (e) => { const d = e.target.closest('[data-ch]'); if (d) setChannel(+d.dataset.ch); });
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input,textarea,select') || !seen) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); setChannel(ch - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); setChannel(ch + 1); }
  });
  new IntersectionObserver((e) => (seen = e[0].isIntersecting), { rootMargin: '60px' }).observe(cv);

  /* кадры каналов */
  const BARS = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0', '#101010'];
  function px(x, y, c) { b.fillStyle = c; b.fillRect(x, y, 1, 1); }
  function drawNoise(coarse) {
    const s = coarse ? 4 : 1;
    for (let y = 0; y < SH; y += s) for (let x = 0; x < SW; x += s) {
      const v = (Math.random() * 256) | 0;
      b.fillStyle = `rgb(${v},${v},${v})`; b.fillRect(x, y, s, s);
    }
  }
  function drawFrame() {
    const mode = CHANNELS[ch].mode;
    if (mode === 'noise') drawNoise(false);
    else if (mode === 'coarse') drawNoise(true);
    else if (mode === 'bars') {
      const bw = SW / BARS.length;
      BARS.forEach((c, i) => { b.fillStyle = c; b.fillRect(Math.round(i * bw), 0, Math.ceil(bw), SH - 12); });
      b.fillStyle = '#111'; b.fillRect(0, SH - 12, SW, 12);
      b.fillStyle = '#dbdbdb'; b.font = 'bold 8px monospace'; b.textAlign = 'center';
      b.fillText('РЕЗЕРВ · G-В · НЕТ СИГНАЛА', SW / 2, SH - 3);
    } else if (mode === 'grid') {
      b.fillStyle = '#04120c'; b.fillRect(0, 0, SW, SH);
      b.strokeStyle = '#1f8a5a'; b.lineWidth = 1;
      for (let x = 0; x <= SW; x += 16) { b.beginPath(); b.moveTo(x + .5, 0); b.lineTo(x + .5, SH); b.stroke(); }
      for (let y = 0; y <= SH; y += 16) { b.beginPath(); b.moveTo(0, y + .5); b.lineTo(SW, y + .5); b.stroke(); }
      b.strokeStyle = '#37d68b';
      b.beginPath(); b.arc(SW / 2 + Math.sin(t * .03) * 2, SH / 2, 26, 0, Math.PI * 2); b.stroke();
      b.beginPath(); b.moveTo(SW / 2 - 34, SH / 2); b.lineTo(SW / 2 + 34, SH / 2); b.moveTo(SW / 2, SH / 2 - 22); b.lineTo(SW / 2, SH / 2 + 22); b.stroke();
    } else if (mode === 'black') {
      b.fillStyle = '#050505'; b.fillRect(0, 0, SW, SH);
      if ((t / 30 | 0) % 2) {
        b.fillStyle = '#3a3a3a'; b.font = 'bold 8px monospace'; b.textAlign = 'center';
        b.fillText('ЭФИР ПУСТ', SW / 2, SH / 2 + 3);
      }
    } else if (mode === 'roll') {
      b.fillStyle = '#0a0a0a'; b.fillRect(0, 0, SW, SH);
      const off = (t * 2) % 12;
      for (let y = -12; y < SH + 12; y += 12) {
        b.fillStyle = y % 24 === 0 ? '#2c2c2c' : '#161616';
        b.fillRect(0, y + off, SW, 6);
      }
      for (let i = 0; i < 900; i++) px((Math.random() * SW) | 0, (Math.random() * SH) | 0, 'rgba(210,210,210,.25)');
    } else if (mode === 'blue') {
      b.fillStyle = '#12327e'; b.fillRect(0, 0, SW, SH);
      b.fillStyle = '#0d2561'; b.fillRect(0, 0, SW, 3); b.fillRect(0, SH - 3, SW, 3);
      b.fillStyle = '#e8eefc'; b.font = 'bold 11px monospace'; b.textAlign = 'center';
      b.fillText('НЕТ СИГНАЛА', SW / 2, SH / 2 - 2);
      b.font = '7px monospace'; b.fillStyle = '#9fb2e8';
      b.fillText('КАНАЛ 07 / 07 · ГОСТЬ В МОЛЧИТ', SW / 2, SH / 2 + 12);
      if ((t / 24 | 0) % 2) { b.fillStyle = '#e8eefc'; b.fillRect(SW / 2 + 44, SH / 2 + 6, 5, 8); }
      if (blueSince++ === 90 && adv) adv.grant('nosignal');   /* полторы секунды dwell */
    }
    /* развёртка: тёмные строки и бегущая полоса яркости */
    b.fillStyle = 'rgba(0,0,0,.22)';
    for (let y = (t % 3); y < SH; y += 3) b.fillRect(0, y, SW, 1);
    const band = ((t * .8) % (SH + 30)) - 15;
    const gr = b.createLinearGradient(0, band - 10, 0, band + 10);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.07)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    b.fillStyle = gr; b.fillRect(0, band - 10, SW, 20);
    /* мигание яркости */
    if (Math.random() < .06) { b.fillStyle = 'rgba(255,255,255,.05)'; b.fillRect(0, 0, SW, SH); }
  }
  function loop() {
    requestAnimationFrame(loop);
    if (document.hidden || !seen) return;
    t++;
    drawFrame();
    if (cv.width !== cv.clientWidth || cv.height !== cv.clientHeight) {
      const d = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.max(1, Math.round(cv.clientWidth * d)); cv.height = Math.max(1, Math.round(cv.clientHeight * d));
    }
    g.imageSmoothingEnabled = false;
    g.drawImage(buf, 0, 0, cv.width, cv.height);
  }
  requestAnimationFrame(loop);
  setChannel(0, true);
  wlog('тюнер включён: канал 1 «белый шум»');
})();
