/* №25 · Плащи Логии. Всё из кода мода:
   LogiaCloakType — потолок заряда 500 / 1 400 / 3 000, цена блока: удар 30/36/55, снаряд 18/22/40, взрыв 150/190/260; логия у четырёх, абсолют у Сэнгоку и Белоуса.
   LogiaArmorMaterial — броня 5/9/10, твёрдость 1/3/5, отбрасывание 0/0/0.5, прочность 16×30/36/42.
   LogiaCloakEvents — 5 с тишины после траты, затем 2, 4, 6… ед/с каждые 5 с без потолка; надет ×1, в инвентаре ×¼, на стойке ×2;
     вода: −0.08/тик до −0.35, логии под водой воздух 0 и 2 урона раз в 10 тиков; Аокидзи — шар льда R10 каждый тик; Кизару — рывок 10 блоков, 12 урона, КД 60 с;
     Сэнгоку — отражение снарядов за 40, без отбрасывания, 1% с руды; Белоус — +8 здоровья, рубеж 10 с на половине сердца, КД 120 с.
   LogiaGaugeOverlay — шкала 34×154 в левом нижнем углу, у каждого плаща своя рамка. LogiaCloakRepairHandler — ремонт за 1 уровень. */
(function () {
  const { $, $$, esc } = ZM, K = ZM.kit, U = ZM.url;
  ZM.topbar({ crumb: "№25 · Плащи Логии", ...ZM.pointNav(25) });
  const T = (p, e = "png") => U(`assets/textures/p25/${p}.${e}`);
  const I = (n) => T("i/" + n), V = (n) => T("v/" + n), UI = (n) => U(`assets/textures/mc/ui/${n}.png`);
  const snd = K.sounds("p25");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motion = () => !reduce && !document.documentElement.classList.contains("no-motion");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (t, a, b) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const fmt = (n, d = 0) => Number(n).toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d });
  const GL = window.ZMGeo && (() => { try { return !!document.createElement("canvas").getContext("webgl"); } catch (e) { return false; } })();
  const visible = (el) => { let v = false; new IntersectionObserver((es) => { v = es[0].isIntersecting; }, { rootMargin: "120px" }).observe(el); return () => v; };
  const img = (src) => { const i = new Image(); i.src = src; return i; };
  const log = (t) => K.chat("#log", t, 4);
  let adv = null;
  const onAdv = [];
  const grant = (k) => adv && adv.grant(k);
  const has = (k) => adv && adv.has(k);

  /* ================= данные плащей (LogiaCloakType + LogiaArmorMaterial) ================= */
  const MC = { 6: "#FFAA00", 4: "#AA0000", b: "#55FFFF", e: "#FFFF55", 5: "#AA00AA", f: "#FFFFFF" };
  const CL = {
    crocodile: { n: "Крокодайл", full: "Плащ Крокодайла", code: "6", max: 500, melee: 30, proj: 18, expl: 150, emul: 0.1, logia: true, rar: "Необычный", rc: "#FFFF55", tint: "#C7A35B",
      armor: 5, tough: 1, kb: 0, dura: 480, ench: 15, equip: "leather", tier: "Песок", elem: "песок", el: "sand", coat: "#2f5a2e", trim: "#1d3b1c", ep: null,
      power: "Не задыхается в песке", weak: "вода", kind: "Логия" },
    akainu: { n: "Акаину", full: "Плащ Акаину", code: "4", max: 1400, melee: 36, proj: 22, expl: 190, emul: 0.1, logia: true, rar: "Редкий", rc: "#55FFFF", tint: "#F14A24",
      armor: 9, tough: 3, kb: 0, dura: 576, ench: 18, equip: "iron", tier: "Адмирал", elem: "магма", el: "magma", coat: "#eef1f6", trim: "#a5281c", ep: "#d9a531",
      power: "Огонь и лава не жгут", weak: "вода", kind: "Логия" },
    aokiji: { n: "Аокидзи", full: "Плащ Аокидзи", code: "b", max: 1400, melee: 36, proj: 22, expl: 190, emul: 0.1, logia: true, rar: "Редкий", rc: "#55FFFF", tint: "#77D9FF",
      armor: 9, tough: 3, kb: 0, dura: 576, ench: 18, equip: "iron", tier: "Адмирал", elem: "лёд", el: "ice", coat: "#eef1f6", trim: "#2846a8", ep: "#d9a531",
      power: "Ледниковый период", weak: "вода", kind: "Логия" },
    kizaru: { n: "Кизару", full: "Плащ Кизару", code: "e", max: 1400, melee: 36, proj: 22, expl: 190, emul: 0.1, logia: true, rar: "Редкий", rc: "#55FFFF", tint: "#FFE34D",
      armor: 9, tough: 3, kb: 0, dura: 576, ench: 18, equip: "iron", tier: "Адмирал", elem: "свет", el: "light", coat: "#eef1f6", trim: "#e6c13a", ep: "#d9a531",
      power: "Световой рывок", weak: "вода", kind: "Логия" },
    sengoku: { n: "Сэнгоку", full: "Плащ Сэнгоку", code: "6", max: 3000, melee: 55, proj: 40, expl: 260, emul: 0, logia: false, rar: "Эпический", rc: "#FF55FF", tint: "#FFD22E",
      armor: 10, tough: 5, kb: 0.5, dura: 672, ench: 20, equip: "netherite", tier: "Финал", elem: "золото", el: "gold", coat: "#f3f1ea", trim: "#2b3f9a", ep: "#e0b232",
      power: "Отражает снаряды", weak: "вода", kind: "Абсолют" },
    whitebeard: { n: "Белоус", full: "Плащ Белоуса", code: "5", max: 3000, melee: 55, proj: 40, expl: 260, emul: 0, logia: false, rar: "Эпический", rc: "#FF55FF", tint: "#8E2B38",
      armor: 10, tough: 5, kb: 0.5, dura: 672, ench: 20, equip: "netherite", tier: "Финал", elem: "землетрясение", el: "quake", coat: "#eef1f6", trim: "#8E2B38", ep: "#b52a2a",
      power: "Последний рубеж", weak: "вода", kind: "Абсолют" },
  };
  const IDS = Object.keys(CL);
  const HUDC = { crocodile: "#E1B65D", akainu: "#FF8B18", aokiji: "#78DFFF", kizaru: "#FFC91E", sengoku: "#FFE572", whitebeard: "#E7ECF5" };
  let cur = localStorage.getItem("zm:p25.cur"); if (!CL[cur]) cur = "akainu";
  const onCloak = [];
  function setCloak(id, quiet) {
    if (!CL[id]) return;
    const prev = cur; cur = id; localStorage.setItem("zm:p25.cur", id);
    const c = CL[id], r = document.documentElement.style;
    r.setProperty("--c", c.tint); r.setProperty("--c2", lighten(c.tint));
    // общий заряд: потолок задаёт надетый плащ, лишнее срезается (setGauge(cap))
    if (PG.g > c.max) PG.g = c.max;
    if (!quiet && prev !== id) snd(c.equip, 0.8);
    onCloak.forEach((f) => f(id, prev));
  }
  function lighten(hex) { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, m = (v) => Math.round(v + (255 - v) * 0.55); return `rgb(${m(r)},${m(g)},${m(b)})`; }

  /* ================= заряд (LogiaGauge) ================= */
  const regenPS = (tss) => (tss < 100 ? 0 : (1 + Math.floor((tss - 100) / 100)) * 2);
  const mkGauge = (g) => ({ g, tss: 600, frac: 0 });
  function gTick(s, cap, mul) {
    if (s.tss < 2147483647) s.tss++;
    if (s.g > cap) s.g = cap;
    const add = (regenPS(s.tss) * mul) / 20;
    if (add <= 0 || cap <= 0 || s.g >= cap) return;
    s.frac += add; const w = Math.floor(s.frac);
    if (w > 0) { s.frac -= w; s.g = Math.min(cap, s.g + w); }
  }
  const trySpend = (s, n) => { if (n <= 0) return true; if (s.g < n) return false; s.g -= n; s.tss = 0; return true; };
  const PG = mkGauge(CL[cur].max);
  const PS = { kiz: 0, wbLock: 0, wbCd: 0 };

  /* ================= HUD (LogiaGaugeOverlay, один в один) ================= */
  const OW = 34, OH = 154, HX = 5, HY = 5, BX = HX + 11, BY = HY + 20, BW = 12, BH = 116;
  const argb = (c) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${(((c >>> 24) & 255) / 255).toFixed(3)})`;
  function hudDraw(cv, type, charge, max, time, ex = {}) {
    const ctx = cv.getContext("2d"), sc = cv.width / 100;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(sc, 0, 0, sc, 0, 0);
    const f = (x1, y1, x2, y2, c) => { ctx.fillStyle = argb(c); ctx.fillRect(x1, y1, x2 - x1, y2 - y1); };
    const X = HX, Y = HY, pct = clamp(charge / max, 0, 1);
    f(X - 3, Y - 3, X + OW + 3, Y + OH + 3, 0x90000000);
    const th = {
      crocodile() {
        f(X + 4, Y + 3, X + OW - 4, Y + 6, 0xFF9A6824); f(X + 5, Y + 7, X + OW - 5, Y + 9, 0xFFFFD77B);
        f(X + 6, BY - 3, X + 9, BY + BH + 4, 0xFF956126); f(X + OW - 9, BY - 3, X + OW - 6, BY + BH + 4, 0xFF956126);
        f(X + 7, BY - 1, X + OW - 7, BY + 1, 0xFFFFD77B); f(X + 5, BY + BH + 2, X + OW - 5, BY + BH + 5, 0xFF9A6824);
        const gy = BY + Math.floor((time * 1.7) % BH); f(X + OW / 2 - 1, gy, X + OW / 2 + 1, gy + 5, 0xFFFFDEA0);
      },
      akainu() {
        f(X + 3, Y + 3, X + OW - 3, Y + OH - 16, 0xFF280500); f(X + 5, Y + 5, X + OW - 5, Y + OH - 18, 0xFF70200C);
        f(X + 7, BY - 3, X + 9, BY + BH + 3, 0xFFFF5920); f(X + OW - 9, BY - 3, X + OW - 7, BY + BH + 3, 0xFFFF5920);
        const a = BY + 10 + Math.floor((time * 1.5) % 34), b = BY + 55 + Math.floor((time * 1.1) % 38);
        f(X + 5, a, X + 8, a + 3, 0xFFFFCA38); f(X + OW - 8, b, X + OW - 5, b + 4, 0xFFFF7D18);
        const d = Y + 8 + Math.floor((time * 1.2) % 12); f(X + OW - 5, d, X + OW - 3, d + 5, 0xFFFF6B1A);
      },
      aokiji() {
        f(X + 3, Y + 3, X + OW - 3, Y + OH - 16, 0xFF153A61); f(X + 5, Y + 5, X + OW - 5, Y + OH - 18, 0xFF68CDEE);
        f(X + 7, BY - 4, X + 10, BY + BH + 3, 0xFFD6FAFF); f(X + OW - 10, BY - 4, X + OW - 7, BY + BH + 3, 0xFFD6FAFF);
        f(X + 4, Y + OH - 21, X + 7, Y + OH - 13, 0xFFB7F4FF); f(X + 12, Y + OH - 19, X + 15, Y + OH - 11, 0xFFB7F4FF); f(X + 23, Y + OH - 21, X + 26, Y + OH - 14, 0xFFB7F4FF);
        for (let i = 0; i < 4; i++) { const sy = Y + 7 + Math.floor((time * 1.1 + i * 29) % 112), sx = X + 4 + ((i * 7) % 24); f(sx, sy, sx + 2, sy + 2, 0xFFFFFFFF); }
      },
      kizaru() {
        const p = Math.floor((Math.sin(time * 0.35) + 1) * 20);
        f(X + 3, Y + 3, X + OW - 3, Y + OH - 16, 0xFF6A4B00); f(X + 5, Y + 5, X + OW - 5, Y + OH - 18, 0xFFFFD32E);
        f(X + 7, BY - 4, X + 10, BY + BH + 3, 0xFFFFFF9A); f(X + OW - 10, BY - 4, X + OW - 7, BY + BH + 3, 0xFFFFFF9A);
        f(X + OW / 2 - 2, Y + 2, X + OW / 2 + 2, Y + 11, 0xFFFFFFFF); f(X + 4 - Math.floor(p / 20), Y + 6, X + OW - 4 + Math.floor(p / 20), Y + 8, 0xFFFFFFAF);
        f(X + 1, Y + 12, X + 5, Y + 14, 0xFFFFE85B); f(X + OW - 5, Y + 12, X + OW - 1, Y + 14, 0xFFFFE85B);
      },
      sengoku() {
        f(X + 2, Y + 2, X + OW - 2, Y + OH - 16, 0xFF704000); f(X + 4, Y + 4, X + OW - 4, Y + OH - 18, 0xFFFFC92D); f(X + 6, Y + 6, X + OW - 6, Y + OH - 20, 0xFF9F6200);
        f(X + 8, BY - 3, X + 10, BY + BH + 3, 0xFFFFE979); f(X + OW - 10, BY - 3, X + OW - 8, BY + BH + 3, 0xFFFFE979);
        const cx = X + OW / 2, cy = Y + 11;
        f(cx - 2, cy - 8, cx + 2, cy - 4, 0xFFFFF1B5); f(cx - 2, cy + 4, cx + 2, cy + 8, 0xFFFFF1B5); f(cx - 8, cy - 2, cx - 4, cy + 2, 0xFFFFF1B5); f(cx + 4, cy - 2, cx + 8, cy + 2, 0xFFFFF1B5); f(cx - 3, cy - 3, cx + 3, cy + 3, 0xFFFFFFFF);
        const sy = BY + Math.floor((time * 1.2) % BH); f(X + 5, sy, X + OW - 5, sy + 1, 0x88FFFFFF);
      },
      whitebeard() {
        f(X + 2, Y + 2, X + OW - 2, Y + OH - 16, 0xFF333947); f(X + 4, Y + 4, X + OW - 4, Y + OH - 18, 0xFFBEC8D8); f(X + 6, Y + 6, X + OW - 6, Y + OH - 20, 0xFF5D6777);
        f(X + 8, BY - 3, X + 10, BY + BH + 3, 0xFFFFFFFF); f(X + OW - 10, BY - 3, X + OW - 8, BY + BH + 3, 0xFFFFFFFF);
        f(X + 4, Y + 25, X + 8, Y + 27, 0xFF4B5362); f(X + 7, Y + 27, X + 10, Y + 32, 0xFF4B5362); f(X + OW - 9, Y + 62, X + OW - 5, Y + 64, 0xFF4B5362); f(X + OW - 12, Y + 64, X + OW - 9, Y + 70, 0xFF4B5362);
        const p = Math.floor((Math.sin(time * 0.5) + 1) * 2); f(X + 5, Y + 8 + p, X + OW - 5, Y + 10 + p, 0x88FFFFFF);
      },
    };
    th[type]();
    const fh = Math.round(BH * pct), ft = BY + BH - fh;
    f(BX, BY, BX + BW, BY + BH, 0xD0101010);
    if (fh > 0) {
      const iv = {
        crocodile() { f(BX + 2, ft, BX + BW - 2, BY + BH, 0xFFE1B65D); const s = BY + Math.floor((time * 2) % (BH - 5)); f(BX + 5, s, BX + 7, Math.min(BY + BH, s + 6), 0xFFFFE4A0); },
        akainu() { f(BX + 1, ft, BX + BW - 1, BY + BH, 0xFFD9340F); f(BX + 3, ft, BX + BW - 3, BY + BH, 0xFFFF8B18); const w = Math.trunc(Math.sin(time * 0.45) * 2); f(BX + 2, ft + 2 + w, BX + BW - 2, ft + 4 + w, 0xFFFFDC43); },
        aokiji() { f(BX + 1, ft, BX + BW - 1, BY + BH, 0xFF78DFFF); f(BX + 3, ft, BX + 6, BY + BH, 0xFFDDFBFF); for (let i = 0; i < 5; i++) { const s = ft + Math.floor((time * 1.7 + i * 22) % Math.max(1, fh)); f(BX + 2 + (i % 3), s, BX + 4 + (i % 3), s + 2, 0xFFFFFFFF); } },
        kizaru() { f(BX + 1, ft, BX + BW - 1, BY + BH, 0xFFFFC91E); f(BX + 4, ft, BX + 7, BY + BH, 0xFFFFFFB5); const fl = Math.floor((Math.sin(time * 0.6) + 1) * 2); f(BX + 1, ft + fl, BX + BW - 1, ft + fl + 2, 0xFFFFF7A3); },
        sengoku() { f(BX + 1, ft, BX + BW - 1, BY + BH, 0xFFD08A00); f(BX + 3, ft, BX + 7, BY + BH, 0xFFFFE572); f(BX + 8, ft, BX + 10, BY + BH, 0xFF8A4A00); },
        whitebeard() { f(BX + 1, ft, BX + BW - 1, BY + BH, 0xFFE7ECF5); f(BX + 3, ft, BX + 5, BY + BH, 0xFFFFFFFF); f(BX + 8, ft, BX + 10, BY + BH, 0xFF8C97A8); },
      };
      iv[type]();
    }
    ctx.font = "8px 'LG Px', monospace"; ctx.textBaseline = "top";
    const txt = (s, x, y, c) => { ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillText(s, x + 1, y + 1); ctx.fillStyle = argb(c); ctx.fillText(s, x, y); };
    const v = `${Math.round(charge)}/${max}`; txt(v, X + (OW - ctx.measureText(v).width) / 2, Y + OH - 13, type === "whitebeard" ? 0xFFF3F5FF : 0xFFFFE29A);
    const sec = (t) => Math.max(1, Math.floor((t + 19) / 20));
    if (type === "kizaru" && ex.kiz > 0) txt(`СВЕТ ${sec(ex.kiz)}с`, X + OW + 3, Y + OH - 22, 0xFFFFF18A);
    else if (type === "whitebeard" && ex.wbLock > 0) txt(`ЯРОСТЬ ${sec(ex.wbLock)}с`, X + OW + 3, Y + OH - 22, 0xFFF7F8FF);
    else if (type === "whitebeard" && ex.wbCd > 0) txt(`РУБЕЖ ${sec(ex.wbCd)}с`, X + OW + 3, Y + OH - 22, 0xFFBFC9D8);
  }
  const prepHud = (cv) => { cv.width = 200; cv.height = 328; return cv; };

  /* ================= спрайт игрока сбоку (ванильный Стив) + плащ ================= */
  const STEVE = img(V("steve"));
  function drawPlayer(ctx, x, y, s, o = {}) {
    // x — центр по горизонтали, y — уровень ног; s — px на пиксель скина; смотрит вправо
    const c = CL[o.cloak || cur], face = o.dir || 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(face, 1); ctx.imageSmoothingEnabled = false;
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const sw = o.swing || 0;
    const part = (sx, sy, w, h, dx, dy, rot = 0, px = 0, py = 0) => {
      ctx.save(); ctx.translate(dx + px, dy + py); ctx.rotate(rot); ctx.drawImage(STEVE, sx, sy, w, h, -px, -py, w * s, h * s); ctx.restore();
    };
    // плащ за спиной
    if (c && !o.noCloak) {
      const top = -24 * s, h = 22.5 * s, w0 = 2.4 * s, flare = (o.flap || 0) * s;
      ctx.fillStyle = c.coat; ctx.beginPath(); ctx.moveTo(-2 * s, top); ctx.lineTo(-2 * s - w0, top + 1 * s); ctx.lineTo(-2 * s - w0 - 2 * s - flare, top + h); ctx.lineTo(-1 * s, top + h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c.trim; ctx.fillRect(-2 * s - w0 - 2 * s - flare, top + h - 1 * s, w0 + 3 * s + flare, 1 * s);
      ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(-2 * s - w0 + 0.6 * s, top + 3 * s, 0.6 * s, h - 5 * s);
      if (c.el === "sand") { ctx.fillStyle = "#3f7a3c"; for (let i = 0; i < 5; i++) ctx.fillRect(-2 * s - w0 - 1.6 * s - i * 0.25 * s, top + 4 * s + i * 3.4 * s, 1.2 * s, 1.6 * s); }
    }
    part(4, 20, 4, 12, -2 * s, -12 * s, sw, 2 * s, 0);          // нога
    part(4, 20, 4, 12, -2 * s, -12 * s, -sw, 2 * s, 0);
    part(16, 20, 4, 12, -2 * s, -24 * s);                        // тело
    if (c && !o.noCloak) { ctx.fillStyle = c.coat; ctx.fillRect(-2.6 * s, -24.4 * s, 1.4 * s, 11 * s); }
    part(0, 8, 8, 8, -4 * s, -32 * s);                           // голова
    part(40, 20, 4, 12, -2 * s, -24 * s, o.arm != null ? o.arm : -sw, 2 * s, 2 * s); // рука
    if (c && c.ep && !o.noCloak) { ctx.fillStyle = c.ep; ctx.fillRect(-2.8 * s, -24.6 * s, 5.6 * s, 1.6 * s); ctx.fillStyle = "rgba(0,0,0,.25)"; for (let i = 0; i < 4; i++) ctx.fillRect(-2.4 * s + i * 1.4 * s, -23 * s, 0.5 * s, 1.2 * s); }
    ctx.restore();
  }
  // моб сбоку: голова + тело + ноги из ванильной текстуры
  const MOBTX = { zombie: img(V("mob_zombie")), skeleton: img(V("mob_skeleton")), creeper: img(V("mob_creeper")) };
  function drawMob(ctx, kind, x, y, s, o = {}) {
    const t = MOBTX[kind]; if (!t.complete) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.imageSmoothingEnabled = false;
    const sw = o.swing || 0;
    const part = (sx, sy, w, h, dx, dy, rot = 0, px = 0, py = 0) => { ctx.save(); ctx.translate(dx + px, dy + py); ctx.rotate(rot); ctx.drawImage(t, sx, sy, w, h, -px, -py, w * s, h * s); ctx.restore(); };
    if (o.flash) ctx.filter = "brightness(1.6) sepia(1) hue-rotate(-50deg) saturate(5)";
    if (kind === "creeper") {
      part(4, 20, 4, 6, -4 * s, -6 * s, 0); part(4, 20, 4, 6, 0, -6 * s, 0);
      part(16, 20, 4, 12, -2 * s, -18 * s); part(0, 8, 8, 8, -4 * s, -26 * s);
      if (o.swell) { ctx.globalAlpha = o.swell; ctx.fillStyle = "#fff"; ctx.fillRect(-4 * s, -26 * s, 8 * s, 26 * s); }
    } else {
      const lw = kind === "skeleton" ? 2 : 4, ax = kind === "skeleton" ? 40 : 40;
      part(kind === "skeleton" ? 2 : 4, 20, lw, 12, -lw / 2 * s, -12 * s, sw, lw / 2 * s, 0);
      part(16, 20, 4, 12, -2 * s, -24 * s); part(0, 8, 8, 8, -4 * s, -32 * s);
      part(kind === "skeleton" ? 42 : 44, 20, lw, 12, -lw / 2 * s, -24 * s, o.arm != null ? o.arm : -sw, lw / 2 * s, 2 * s);
      void ax;
    }
    ctx.restore();
  }
  // частицы стихии (spawnDefenseParticles)
  function burst(list, el, x, y, n = 26, spread = 1) {
    const P = {
      sand: () => ({ c: ["#e3cf9a", "#d8b46a", "#c79a52", "#f2e3b8"][Math.random() * 4 | 0], g: 0.12, s: rnd(2, 5) }),
      magma: () => ({ c: ["#ff5a1f", "#ffb02e", "#ffdc43", "#d9340f"][Math.random() * 4 | 0], g: -0.04, s: rnd(2, 6), glow: 1 }),
      ice: () => ({ c: ["#ffffff", "#d6faff", "#9be6ff", "#78dfff"][Math.random() * 4 | 0], g: 0.03, s: rnd(2, 5) }),
      light: () => ({ c: ["#fff7a3", "#ffd32e", "#ffffff", "#ffe34d"][Math.random() * 4 | 0], g: 0, s: rnd(2, 4), glow: 1, streak: 1 }),
      gold: () => ({ c: ["#ffe572", "#ffd22e", "#fff1b5", "#d08a00"][Math.random() * 4 | 0], g: -0.02, s: rnd(2, 5), glow: 1 }),
      quake: () => ({ c: ["#eef4ff", "#ffffff", "#c9e2ff", "#9fd0ff"][Math.random() * 4 | 0], g: 0, s: rnd(2, 4), glow: 1, streak: 1 }),
      blood: () => ({ c: ["#b3122b", "#7a0a1b"][Math.random() * 2 | 0], g: 0.2, s: rnd(2, 4) }),
      smoke: () => ({ c: ["#ddd", "#aaa", "#777"][Math.random() * 3 | 0], g: -0.03, s: rnd(4, 9) }),
    }[el] || (() => ({ c: "#fff", g: 0, s: 3 }));
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = rnd(0.6, 3.2) * spread; list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, life: rnd(26, 60), t: 0, ...P() }); }
  }
  function drawParts(ctx, list) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i]; p.t++; p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.96; p.vy *= 0.97;
      if (p.t > p.life) { list.splice(i, 1); continue; }
      const a = 1 - p.t / p.life; ctx.globalAlpha = a; ctx.fillStyle = p.c;
      if (p.glow) { ctx.shadowColor = p.c; ctx.shadowBlur = 8; }
      if (p.streak) ctx.fillRect(p.x - p.vx * 3, p.y - p.vy * 3, Math.max(2, Math.abs(p.vx) * 3), Math.max(2, Math.abs(p.vy) * 3)); else ctx.fillRect(p.x, p.y, p.s, p.s);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }
  const TEX = {}; ["stone", "dirt", "grass_top", "grass_side", "sand", "sandstone", "obsidian", "water", "ice", "packed_ice", "lava", "planks", "hay", "glass", "gold_ore", "diamond_ore", "slime", "magma", "deepslate", "cobble", "snow"].forEach((k) => (TEX[k] = img(V(k))));
  const tile = (ctx, k, x, y, s) => { const t = TEX[k]; if (t && t.complete) ctx.drawImage(t, 0, 0, 16, 16, Math.floor(x), Math.floor(y), Math.ceil(s), Math.ceil(s)); };
  function fitCanvas(cv, w) { const d = Math.min(2, devicePixelRatio || 1), r = cv.getBoundingClientRect(); const W = Math.max(1, Math.round(r.width * d)), H = Math.max(1, Math.round(r.height * d)); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; } const ctx = cv.getContext("2d"); ctx.setTransform(W / w, 0, 0, W / w, 0, 0); ctx.imageSmoothingEnabled = false; return { ctx, w, h: H / (W / w) }; }

  /* ================= фон: частицы стихии надетого плаща ================= */
  (function bg() {
    const cv = $("#bg"), ctx = cv.getContext("2d"); let W = 0, H = 0, P = [];
    const rs = () => { const d = Math.min(1.5, devicePixelRatio || 1); W = cv.width = innerWidth * d; H = cv.height = innerHeight * d; };
    addEventListener("resize", rs); rs();
    const spawn = () => {
      const el = CL[cur].el, d = Math.min(1.5, devicePixelRatio || 1);
      const up = el === "magma" || el === "gold" || el === "light";
      return { x: Math.random() * W, y: up ? H + 10 : -10, vx: rnd(-0.3, 0.3) * d, vy: (up ? -rnd(0.3, 1.1) : rnd(0.3, el === "sand" ? 1.6 : 0.9)) * d, s: rnd(1, el === "ice" ? 3.5 : 2.5) * d, el, a: rnd(0.15, 0.55), t: Math.random() * 6 };
    };
    (function f() {
      requestAnimationFrame(f);
      if (!motion()) { ctx.clearRect(0, 0, W, H); return; }
      ctx.clearRect(0, 0, W, H);
      if (P.length < 70) P.push(spawn());
      const col = { sand: "227,207,154", magma: "255,120,40", ice: "220,246,255", light: "255,230,120", gold: "255,214,90", quake: "230,240,255" };
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i]; p.t += 0.02; p.x += p.vx + Math.sin(p.t) * 0.2; p.y += p.vy;
        if (p.y < -20 || p.y > H + 20 || p.el !== CL[cur].el) { P.splice(i, 1); continue; }
        ctx.fillStyle = `rgba(${col[p.el]},${p.a})`;
        if (p.el === "light" || p.el === "quake") ctx.fillRect(p.x, p.y, p.s, p.s * 6); else ctx.fillRect(p.x, p.y, p.s, p.s);
      }
    })();
  })();
  $("#marq").innerHTML = [0, 1].map(() => ["Логия", "Абсолютная справедливость", "Ледниковый период", "Магма", "Песчаная буря", "Свет", "Будда", "Землетрясение", "Хаки вооружения", "Вода — слабость", "3 000 заряда", "Маринфорд"].map((s) => `<span>${esc(s)}</span>`).join("")).join("");

  /* ================= мировой тик 20 TPS: общий заряд игрока ================= */
  const tickL = [];
  let acc = 0, lt = performance.now(), gtime = 0;
  (function loop(now) {
    requestAnimationFrame(loop);
    acc += Math.min(0.25, (now - lt) / 1000); lt = now;
    while (acc >= 0.05) {
      acc -= 0.05; gtime++;
      gTick(PG, CL[cur].max, 1);
      if (PS.kiz > 0) PS.kiz--; if (PS.wbLock > 0) PS.wbLock--; if (PS.wbCd > 0) PS.wbCd--;
      tickL.forEach((f) => f());
    }
  })(lt);

  /* ================= HERO ================= */
  const tipLines = (id, g) => {
    const c = CL[id];
    return [`§${c.code}${c.full}`, `§7${c.logia ? "Логия" : "Особая абсолютная защита"}`, `§6Заряд: ${Math.min(g, c.max)}`, "", "§7На теле:", `§9+${c.armor} Броня`, `§9+${c.tough} Твёрдость брони`, ...(c.kb ? [`§9+${c.kb * 10} Сопротивление отбрасыванию`] : [])];
  };
  const tipHtml = (id, g) => tipLines(id, g).map((s) => `<div>${s ? K.mcHtml(s) : "&nbsp;"}</div>`).join("") + `<div style="color:#555">zitraksmode:cloak_${id}</div>`;
  const models = {};
  (function hero() {
    const cv = $("#hero3d"), stage = $("#heroStage"), hudCv = prepHud($("#heroHud")), vis = visible(stage);
    $("#heroPick").innerHTML = IDS.map((id) => `<button type="button" role="tab" data-id="${id}" aria-selected="${id === cur}" aria-label="${esc(CL[id].full)}"><img src="${I("cloak_" + id)}" alt=""></button>`).join("");
    $("#heroPick").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) setCloak(b.dataset.id); });
    const st = { ry: 155, rx: 0, vy: 155, vx: 0, drag: null, idleAt: performance.now() + 3000 };
    let back = false;
    const get = (id) => {
      if (!GL) return null;
      if (models[id]) return models[id];
      const d = ZM.P25G.cloaks[id];
      const g = ZMGeo.create(cv, { geo: d.geo, anim: d.anim, tex: d.tex, idle: "animation.cloak.idle", mip: true, cam: { yaw: 0, pitch: 6, dist: 84, target: [0, 15, 0], fov: 40 } });
      return (models[id] = g);
    };
    if (!GL) cv.outerHTML = `<img id="heroFallback" src="${I("cloak_" + cur)}" alt="" style="position:absolute;inset:14% 18%;width:64%;height:72%;object-fit:contain;image-rendering:pixelated;z-index:2">`;
    cv.addEventListener("pointerdown", (e) => { st.drag = { x: e.clientX, y: e.clientY, ry: st.ry, rx: st.rx }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
    cv.addEventListener("pointermove", (e) => { if (!st.drag) return; st.ry = st.drag.ry + (e.clientX - st.drag.x) * 0.6; st.rx = clamp(st.drag.rx + (e.clientY - st.drag.y) * 0.25, -20, 30); st.idleAt = performance.now(); });
    const up = () => { st.drag = null; st.idleAt = performance.now(); }; cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    $("#heroTurn").addEventListener("click", (e) => { back = !back; const base = Math.round((st.ry - (back ? 155 : 335)) / 360) * 360; st.vy -= 0; st.ry = base + (back ? 335 : 155); st.idleAt = performance.now() + 4000; e.currentTarget.setAttribute("aria-pressed", back); e.currentTarget.textContent = back ? "↻ лицом" : "↻ спиной"; snd("click", 0.4); });
    const parts = []; let flash = 0;
    $("#heroHit").addEventListener("click", () => {
      const c = CL[cur], cost = c.melee;
      if (trySpend(PG, cost)) { flash = 1; snd(c.el === "magma" ? "fire" : c.el === "ice" ? "glass" : c.el === "sand" ? "sand" : c.el === "light" ? "chime" : "shield", 0.6); K.say(`§7Удар прошёл сквозь тело: §6−${cost}§7 заряда`); }
      else { snd("hurt", 0.7); K.say(`Заряда не хватило (нужно ${cost}) — удар прошёл как обычно`, true); }
    });
    onCloak.push((id) => { $$("#heroPick button").forEach((b) => b.setAttribute("aria-selected", b.dataset.id === id)); const fb = $("#heroFallback"); if (fb) fb.src = I("cloak_" + id); });
    let lt2 = performance.now();
    (function f(now) {
      requestAnimationFrame(f);
      const dt = Math.min(0.05, (now - lt2) / 1000); lt2 = now;
      if (!vis()) return;
      if (!st.drag && motion() && now - st.idleAt > 2500) st.ry += dt * 9;
      st.vy += (st.ry - st.vy) * Math.min(1, dt * 8); st.vx += (st.rx - st.vx) * Math.min(1, dt * 8);
      const g = get(cur);
      if (g) {
        const M = g.M, D = Math.PI / 180;
        g.setExtra(M.mul(M.t(0, 16, 0), M.mul(M.rx(st.vx * D), M.mul(M.ry(st.vy * D), M.t(0, -16, 0)))));
        g.tick(dt); g.render();
      }
      if (flash > 0) { flash -= dt * 2.5; stage.style.boxShadow = `inset 0 0 ${80 * flash}px ${CL[cur].tint}`; } else stage.style.boxShadow = "";
      hudDraw(hudCv, cur, PG.g, CL[cur].max, gtime + (acc / 0.05), PS);
      $("#heroTip").innerHTML = tipHtml(cur, PG.g);
      void parts;
    })(lt2);
  })();

  /* ================= 01 ЛИСТОВКИ И ТАБЛИЦА ================= */
  (function posters() {
    const R = [-2.2, 1.6, -1, 2, -1.6, 1.2];
    $("#posters").innerHTML = IDS.map((id, i) => {
      const c = CL[id];
      return `<button type="button" class="lg-poster" data-id="${id}" style="--r:${R[i]}deg;--pc:${c.tint};--rc:${c.rc === "#FFFF55" ? "#9a8a12" : c.rc === "#55FFFF" ? "#1d8a99" : "#9a2d9a"}" aria-pressed="${id === cur}">
        <span class="rt">${esc(c.rar)}</span><h4>Дозор</h4><span class="ph"><img src="${I("cloak_" + id)}" alt=""></span>
        <span class="nm" style="color:${c.code === "f" ? "#3b2412" : MC[c.code] === "#FFFF55" ? "#8a6d00" : MC[c.code] === "#55FFFF" ? "#11778a" : MC[c.code]}">${esc(c.n)}</span><span class="kd">${esc(c.kind)} · ${esc(c.elem)}</span>
        <span class="bt">${fmt(c.max)}<small>ЗАРЯДА</small></span></button>`;
    }).join("");
    $("#posters").addEventListener("click", (e) => { const b = e.target.closest(".lg-poster"); if (b) setCloak(b.dataset.id); });
    const rows = [
      ["Тип", (c) => c.kind], ["Стихия", (c) => c.elem], ["Редкость", (c) => `<span style="color:${c.rc}">${c.rar}</span>`],
      ["Заряд, максимум", (c) => fmt(c.max), 1], ["Удар — цена", (c) => c.melee], ["Снаряд — цена", (c) => c.proj], ["Взрыв — цена", (c) => c.expl],
      ["Урон взрыва с зарядом", (c) => (c.logia ? "×0.10" : "0, если хватило")],
      ["Броня", (c) => c.armor, 1], ["Твёрдость", (c) => c.tough], ["Отбрасывание", (c) => (c.kb ? "−50%" : "—")], ["Прочность", (c) => c.dura], ["Зачаровываемость", (c) => c.ench],
      ["Звук надевания", (c) => ({ leather: "кожа", iron: "железо", netherite: "незерит" })[c.equip]],
      ["Сила", (c) => c.power, 1],
    ];
    const draw = () => {
      $("#cmpTable").innerHTML = `<thead><tr><th></th>${IDS.map((id) => `<th class="${id === cur ? "on" : ""}"><img src="${I("cloak_" + id)}" alt="">${esc(CL[id].n)}</th>`).join("")}</tr></thead><tbody>${rows.map(([k, fn, hi]) => `<tr><td>${esc(k)}</td>${IDS.map((id) => `<td class="${hi ? "hi" : ""} ${id === cur ? "on" : ""}">${fn(CL[id])}</td>`).join("")}</tr>`).join("")}</tbody>`;
    };
    draw();
    onCloak.push((id) => { $$(".lg-poster").forEach((b) => b.setAttribute("aria-pressed", b.dataset.id === id)); draw(); });
  })();

  /* ================= 02 АРЕНА ================= */
  const ATK = [
    { k: "zombie", n: "Зомби", ic: "rotten_flesh", type: "melee", dmg: 3, mob: "zombie", armor: 1, ent: 1 },
    { k: "sword", n: "Железный меч", ic: "iron_sword", type: "melee", dmg: 6, mob: "zombie", armor: 1, ent: 1 },
    { k: "arrow", n: "Стрела скелета", ic: "arrow", type: "proj", dmg: 4, mob: "skeleton", armor: 1, ent: 1, pr: "arrow" },
    { k: "trident", n: "Трезубец", ic: "trident", type: "proj", dmg: 8, mob: "zombie", armor: 1, ent: 1, pr: "trident" },
    { k: "creeper", n: "Крипер", ic: "gunpowder", type: "expl", dmg: 22, mob: "creeper", armor: 1, ent: 1 },
    { k: "tnt", n: "Динамит", ic: "tnt", type: "expl", dmg: 22, armor: 1, ent: 0 },
    { k: "netherite", n: "Незеритовый меч", ic: "netherite_sword", type: "melee", dmg: 8, mob: "zombie", armor: 1, ent: 1, haki: 1 },
    { k: "katana", n: "Катана", ic: "katana", type: "melee", dmg: 8, mob: "zombie", armor: 1, ent: 1, haki: 1 },
    { k: "lava", n: "Лава", ic: "lava_bucket", type: "env", dmg: 4, src: "lava" },
    { k: "freeze", n: "Рыхлый снег", ic: "powder_snow_bucket", type: "env", dmg: 1, src: "freeze" },
    { k: "sand", n: "Удушье в песке", ic: "sand", type: "env", dmg: 1, src: "wall" },
    { k: "fall", n: "Падение с 15", ic: "feather", type: "env", dmg: 12, src: "fall" },
    { k: "void", n: "Бездна", ic: "barrier", type: "env", dmg: 4, src: "void" },
  ];
  const AR = { hp: 20, maxhp: 20, anim: null, parts: [], shake: 0, hurt: 0, phase: 0, msg: "" };
  const maxHp = () => (cur === "whitebeard" ? 28 : 20);
  function armorRed(dmg, c) { const def = c.armor, t = c.tough; const f = clamp(def - dmg / (2 + t / 4), def * 0.2, 20); return dmg * (1 - f / 25); }
  // порядок проверок как в onLivingAttack + onLivingHurt
  function resolve(a, id, g) {
    const c = CL[id], R = { cost: 0, cancel: false, dmg: a.dmg, why: "", kind: "", reflect: false };
    if (id === "whitebeard" && PS.wbLock > 0) { R.cancel = true; R.kind = "lock"; R.why = "Идёт последний рубеж: 10 секунд не проходит вообще ничего, даже бездна."; return R; }
    if ((id === "akainu" && (a.src === "lava")) || (id === "aokiji" && a.src === "freeze") || (id === "crocodile" && a.src === "wall" && a.k === "sand")) { R.cancel = true; R.kind = "native"; R.why = `Своя стихия: ${c.n} не получает такой урон вообще, заряд не тратится.`; return R; }
    if (id === "sengoku" && a.type === "proj") {
      if (g >= c.proj) { R.cancel = true; R.cost = c.proj; R.reflect = true; R.kind = "reflect"; R.why = "Сэнгоку разворачивает снаряд в стрелявшего, на 20% быстрее, и сам становится его владельцем."; return R; }
    }
    if (a.src === "void" || a.haki) { R.kind = a.haki ? "haki" : "void"; R.why = a.haki ? "Хаки вооружения: катана и всё незеритовое бьют мимо заряда." : "Падение в бездну не блокирует никто."; R.dmg = finalDmg(a, c); return R; }
    if (!c.logia) {
      const cost = a.type === "expl" ? c.expl : a.type === "proj" ? c.proj : c.melee;
      if (g >= cost) { R.cancel = true; R.cost = cost; R.kind = "abs"; R.why = `Абсолютная защита гасит любой урон, даже ${a.type === "env" ? "от окружения" : "этот"}: −${cost} заряда.`; return R; }
      R.kind = "short"; R.why = `Не хватило заряда: нужно ${cost}. Урон прошёл.`; R.dmg = finalDmg(a, c); return R;
    }
    if (a.type === "expl") {
      if (g > 0) { R.cost = Math.min(g, c.expl); R.kind = "expl"; R.dmg = finalDmg(a, c) * c.emul; R.why = `Взрыв логия не отменяет, но забирает до ${c.expl} заряда (сколько есть) и оставляет 10% урона.`; return R; }
      R.kind = "short"; R.why = "Заряд пуст — взрыв бьёт в полную силу."; R.dmg = finalDmg(a, c); return R;
    }
    if (!(a.type === "proj" || a.ent)) { R.kind = "env"; R.why = "Логия пропускает сквозь себя только удары живых и снаряды. Огонь, падение, удушье — по телу."; R.dmg = finalDmg(a, c); return R; }
    const cost = a.type === "proj" ? c.proj : c.melee;
    if (g >= cost) { R.cancel = true; R.cost = cost; R.kind = "phase"; R.why = `${a.type === "proj" ? "Снаряд" : "Удар"} прошёл насквозь: −${cost} заряда, горизонтальная скорость гасится до 15%.`; return R; }
    R.kind = "short"; R.why = `Не хватило заряда: нужно ${cost}. Урон прошёл.`; R.dmg = finalDmg(a, c); return R;
  }
  function finalDmg(a, c) { return a.armor ? armorRed(a.dmg, c) : a.dmg; }
  function heartsHtml(hp, max) { const n = Math.ceil(max / 2); let s = ""; for (let i = 0; i < n; i++) { const v = hp - i * 2; s += `<img src="${v >= 2 ? UI("heart_full") : v >= 1 ? UI("heart_half") : UI("heart_bg")}" alt="">`; } return s; }
  (function arena() {
    const cv = $("#arenaCv"), hud = prepHud($("#arenaHud")), vis = visible(cv);
    $("#atkList").innerHTML = ATK.map((a) => `<button type="button" data-k="${a.k}" class="${a.haki ? "hk" : ""}"><img src="${I(a.ic)}" alt="">${esc(a.n)}</button>`).join("");
    AR.hp = maxHp();
    const upHp = () => { $("#arenaHp").innerHTML = heartsHtml(AR.hp, maxHp()); };
    upHp();
    onCloak.push(() => { AR.hp = Math.min(AR.hp, maxHp()); if (cur === "whitebeard" && AR.hp < maxHp()) {} upHp(); });
    $("#arenaReset").addEventListener("click", () => { PG.g = CL[cur].max; AR.hp = maxHp(); PS.wbLock = 0; PS.wbCd = 0; upHp(); snd("orb", 0.5); $("#atkOut").innerHTML = ""; $("#atkNote").textContent = "Заряд и здоровье на максимуме."; });
    const out = (a, R, before) => {
      const rows = [["Удар", `${a.n} · ${a.dmg} ед.`], ["Защита", R.cancel ? "отменён" : R.kind === "expl" ? "ослаблен" : "нет", R.cancel ? "ok" : R.kind === "expl" ? "warn" : "bad"],
        ["Заряд", `${before} → ${Math.max(0, before - R.cost)}${R.cost ? ` (−${R.cost})` : ""}`, R.cost ? "warn" : ""],
        ["Урон по здоровью", R.cancel ? "0" : fmt(R.dmg, 1), R.cancel ? "ok" : "bad"]];
      $("#atkOut").innerHTML = rows.map(([k, v, c]) => `<dt>${k}</dt><dd class="${c || ""}">${v}</dd>`).join("");
      $("#atkNote").textContent = R.why;
    };
    $("#atkList").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b || AR.anim) return;
      const a = ATK.find((x) => x.k === b.dataset.k);
      AR.anim = { a, t: 0, done: false };
      snd("click", 0.3);
    });
    function hit(a) {
      const before = PG.g, R = resolve(a, cur, PG.g), c = CL[cur];
      if (R.cost) { PG.g = Math.max(0, PG.g - R.cost); PG.tss = 0; }
      const px = 180, py = 300 - 16 * 5;
      if (R.cancel) {
        if (R.kind === "phase" || R.kind === "abs" || R.kind === "reflect") { burst(AR.parts, c.el, px, py - 20, 34, 1.2); AR.phase = 1; snd(c.el === "magma" ? "lava" : c.el === "ice" ? "glass" : c.el === "sand" ? "sand" : c.el === "light" ? "chime" : c.el === "quake" ? "thunder" : "shield", 0.55, c.el === "gold" ? 1.45 : 1); }
        if (R.kind === "native") { burst(AR.parts, c.el, px, py, 14, 0.6); }
        if (R.kind === "lock") burst(AR.parts, "quake", px, py, 20);
        log(R.kind === "reflect" ? "§6Стрела развернулась в стрелявшего" : R.kind === "native" ? `§7${c.n}: своя стихия` : R.kind === "lock" ? "§fЯРОСТЬ: урон не проходит" : `§7Сквозь тело · §6−${R.cost}`);
      } else {
        let dmg = R.dmg;
        // последний рубеж Белоуса (onLivingHurt): смертельный удар → половина сердца, 10 с неуязвимости, КД 120 с
        if (cur === "whitebeard" && PS.wbCd <= 0 && a.src !== "void" && AR.hp - a.dmg <= 1) {
          AR.hp = 1; PS.wbLock = 200; PS.wbCd = 2400; burst(AR.parts, "quake", px, py, 40, 1.4); snd("thunder", 0.6); log("§fПоследний рубеж! §710 секунд на половине сердца"); R.why = "Удар был смертельным: Белоус замирает на половине сердца, 10 секунд его не берёт ничего. Снова сработает через 120 секунд."; upHp(); out(a, R, before); return R;
        }
        AR.hp = Math.max(0, AR.hp - dmg); AR.hurt = 1; AR.shake = 6; burst(AR.parts, "blood", px, py - 30, 10, 0.8); snd("hurt", 0.7);
        if (R.kind === "expl") burst(AR.parts, c.el, px, py - 20, 20);
        log(AR.hp <= 0 ? "§cИгрок погиб" : `§c−${fmt(dmg, 1)} здоровья`);
        if (AR.hp <= 0) setTimeout(() => { AR.hp = maxHp(); upHp(); log("§7Возрождение"); }, 1400);
      }
      upHp(); out(a, R, before);
      return R;
    }
    tickL.push(() => { if (cur === "whitebeard" && PS.wbLock > 0 && AR.hp !== 1) { AR.hp = 1; upHp(); } });
    let last = performance.now();
    (function f(now) {
      requestAnimationFrame(f);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!vis()) return;
      const { ctx, w, h } = fitCanvas(cv, 640);
      const G = h - 64;
      // небо и море Маринфорда
      const sky = ctx.createLinearGradient(0, 0, 0, G); sky.addColorStop(0, "#0d1d38"); sky.addColorStop(1, "#1a3360"); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, G);
      ctx.fillStyle = "rgba(255,255,255,.05)"; ctx.font = "900 150px 'LG JP', serif"; ctx.textAlign = "center"; ctx.fillText("正義", w / 2 + 120, G - 40); ctx.textAlign = "left";
      for (let x = 0; x < w; x += 32) { tile(ctx, "grass_top", x, G, 32); tile(ctx, "dirt", x, G + 32, 32); }
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(0, G, w, 4);
      let sx = AR.shake > 0 ? rnd(-AR.shake, AR.shake) : 0; AR.shake = Math.max(0, AR.shake - 0.6);
      const px = 180, s = 5, A = AR.anim, t = A ? (A.t += dt) : 0;
      // атакующий
      let mx = 520, swing = Math.sin(now / 300) * 0.25, arm = null, swell = 0, proj = null, boom = 0;
      if (A) {
        const a = A.a;
        if (a.type === "melee") { mx = lerp(clamp(t / 0.7, 0, 1), 520, 250); swing = Math.sin(t * 14) * 0.5; arm = t > 0.7 ? -1.6 + Math.min(1, (t - 0.7) * 6) * 1.2 : -1.4; if (t > 0.78 && !A.done) { A.done = true; A.R = hit(a); } }
        else if (a.type === "proj") { mx = 520; arm = -1.5; const ft = clamp((t - 0.35) / 0.45, 0, 1); if (t > 0.35) { if (!A.shot) { A.shot = 1; snd("bow", 0.5); } if (!A.done) proj = { x: lerp(ft, 490, 200), y: G - 26 * s + Math.sin(ft * Math.PI) * -18, a: 0 }; } if (ft >= 1 && !A.done) { A.done = true; A.R = hit(a); A.back = A.R.reflect ? 0 : -1; if (A.R.reflect) snd("shield", 0.8, 1.45); } if (A.back >= 0 && A.done) { A.back += dt / 0.4; const k = clamp(A.back, 0, 1); proj = { x: lerp(k, 200, 500), y: G - 26 * s, a: Math.PI }; if (k >= 1 && !A.hitBack) { A.hitBack = 1; burst(AR.parts, "smoke", 500, G - 100, 10); snd("bowhit", 0.6); } } }
        else if (a.type === "expl") { mx = a.mob ? lerp(clamp(t / 0.5, 0, 1), 520, 280) : 9999; swell = a.mob ? clamp((t - 0.5) / 0.7, 0, 1) : 0; if (!a.mob && t < 1.1) { ctx.globalAlpha = Math.floor(t * 8) % 2 ? 1 : 0.6; tile(ctx, "planks", 0, 0, 0); ctx.globalAlpha = 1; } if (t > 1.2 && !A.done) { A.done = true; boom = 1; snd("explode", 0.7); burst(AR.parts, "smoke", a.mob ? 280 : 300, G - 40, 40, 2); AR.shake = 10; A.R = hit(a); } }
        else { if (t > 0.25 && !A.done) { A.done = true; A.R = hit(a); } }
        if (t > (a.type === "proj" ? 1.6 : 1.8)) AR.anim = null;
      }
      if (A && A.a.mob && !(A.a.type === "expl" && A.done)) drawMob(ctx, A.a.mob, mx + sx, G, s, { swing, arm: A.a.mob === "skeleton" ? -1.5 : arm, swell: swell > 0 ? (Math.floor(swell * 10) % 2) * 0.6 : 0 });
      if (!A) drawMob(ctx, "zombie", 520, G, s, { swing: 0, arm: -1.4 });
      if (A && A.a.k === "tnt" && !A.done) { const k = clamp(A.t / 1.2, 0, 1); ctx.fillStyle = Math.floor(A.t * 8) % 2 ? "#fff" : "#d33"; ctx.fillRect(300, G - 40, 40, 40); ctx.globalAlpha = 1 - k * 0.3; }
      ctx.globalAlpha = 1;
      if (proj) { ctx.save(); ctx.translate(proj.x, proj.y); ctx.rotate(proj.a + Math.PI * 0.75); const pi = img(I(A.a.pr === "trident" ? "trident" : "arrow")); if (pi.complete) ctx.drawImage(pi, -20, -20, 40, 40); ctx.restore(); }
      // окружение
      if (A && A.a.src === "lava") { for (let x = 120; x < 260; x += 32) tile(ctx, "lava", x, G, 32); }
      if (A && A.a.src === "freeze") { ctx.fillStyle = "rgba(240,250,255,.7)"; ctx.fillRect(140, G - 64, 80, 64); }
      if (A && A.a.src === "wall") { for (let y = G - 64; y < G; y += 32) tile(ctx, "sand", 164, y, 32); }
      if (A && A.a.src === "void") { ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(0, 0, w, h); }
      // игрок
      const ph = AR.phase > 0 ? (AR.phase -= dt * 1.6) : 0;
      if (ph > 0) { ctx.globalAlpha = 0.35 + 0.65 * (1 - ph); }
      const fallY = A && A.a.src === "fall" ? -Math.max(0, 1 - A.t * 4) * 260 : 0;
      drawPlayer(ctx, px + sx, G + fallY, s, { swing: 0, flap: Math.sin(now / 500) * 0.6 });
      ctx.globalAlpha = 1;
      if (AR.hurt > 0) { AR.hurt -= dt * 3; ctx.fillStyle = `rgba(255,0,0,${AR.hurt * 0.35})`; ctx.fillRect(px - 30, G - 165, 60, 165); }
      if (cur === "whitebeard" && PS.wbLock > 0) { for (let i = 0; i < 8; i++) { const an = (Math.PI * 2 * i) / 8 + gtime * 0.12; ctx.fillStyle = "rgba(238,247,255,.85)"; ctx.fillRect(px + Math.cos(an) * 40, G - 80 + (i % 3) * 18 + Math.sin(an) * 6, 4, 10); } }
      if (boom) { ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.fillRect(0, 0, w, h); }
      drawParts(ctx, AR.parts);
      hudDraw(hud, cur, PG.g, CL[cur].max, gtime, PS);
    })(last);
    const RULES = [
      ["Удар и снаряд", "Логия: заряд по цене удара или снаряда, удар отменяется целиком. Работает только если у урона есть живой атакующий или это снаряд.", "#ff8800"],
      ["Взрыв", "Логия не отменяет взрыв, но забирает остаток заряда до цены взрыва — и урон падает до 10%. Хватит даже одной единицы.", "#ff5a1f"],
      ["Абсолют", "Сэнгоку и Белоус гасят любой урон: огонь, падение, утопление, голод. Цена — как за удар, снаряд или взрыв.", "#ffd22e"],
      ["Хаки", "Катана и всё, в чьём id есть «netherite», бьют мимо заряда по броне. Проверяется рука атакующего.", "#b3122b"],
      ["Бездна", "Урон от падения в пустоту не блокирует никто, кроме Белоуса в ярости последнего рубежа.", "#7a7a7a"],
      ["Своя стихия", "Акаину не горит и не плавится, Аокидзи не мёрзнет, Крокодайл не задыхается в песке. Заряд на это не тратится.", "#77D9FF"],
    ];
    $("#rules").innerHTML = RULES.map(([h, p, c]) => `<div class="lg-rule" style="--rc:${c}"><h4>${esc(h)}</h4><p>${esc(p)}</p></div>`).join("");
  })();

  /* ================= 03 ЗАРЯД: ступеньки и стойка ================= */
  (function regen() {
    const cv = $("#rgCv"), vis = visible(cv); let src = "worn";
    const MUL = { worn: 1, inv: 0.25, stand: 2 };
    $("#rgSrc").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; src = b.dataset.k; $$("#rgSrc button").forEach((x) => x.setAttribute("aria-pressed", x === b)); calc(); snd("click", 0.35); });
    let data = null;
    function calc() {
      const c = CL[cur], s = mkGauge(0); s.tss = 0; const pts = [[0, 0, 0]]; let t = 0;
      while (s.g < c.max && t < 20 * 60 * 20) { gTick(s, c.max, MUL[src]); t++; if (t % 10 === 0) pts.push([t / 20, s.g, regenPS(s.tss) * MUL[src]]); }
      pts.push([t / 20, s.g, regenPS(s.tss) * MUL[src]]);
      data = { pts, T: t / 20, max: c.max };
      const at = (sec) => { const p = pts.find((q) => q[0] >= sec); return p ? p[1] : c.max; };
      $("#rgOut").innerHTML = [["Плащ", `<span style="color:${MC[c.code]}">${c.full}</span>`], ["Потолок", fmt(c.max)], ["Тишина после траты", "5 с"],
        ["До полного", `${fmt(data.T, 1)} с`], ["Скорость в конце", `${fmt(pts[pts.length - 1][2], 1)} ед/с`], ["Через 30 с", fmt(at(30))], ["Через минуту без трат", `${fmt(regenPS(1200) * MUL[src], 1)} ед/с`]].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
    }
    calc(); onCloak.push(calc);
    let sweep = 0, lt3 = performance.now();
    (function f(now) {
      requestAnimationFrame(f); const dt = Math.min(0.05, (now - lt3) / 1000); lt3 = now;
      if (!vis() || !data) return;
      const { ctx, w, h } = fitCanvas(cv, 640);
      ctx.clearRect(0, 0, w, h);
      const L = 46, Rr = 14, Tt = 12, B = 30, W2 = w - L - Rr, H2 = h - Tt - B, T = Math.max(10, Math.ceil(data.T / 10) * 10);
      const X = (s) => L + (s / T) * W2, Y = (g) => Tt + H2 - (g / data.max) * H2;
      const maxR = data.pts[data.pts.length - 1][2] || 1, YR = (r) => Tt + H2 - (r / maxR) * H2 * 0.9;
      ctx.strokeStyle = "#1c2f4f"; ctx.lineWidth = 1; ctx.font = "11px 'LG Text', sans-serif"; ctx.fillStyle = "#7f93b6";
      for (let i = 0; i <= 4; i++) { const y = Tt + (H2 * i) / 4; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(w - Rr, y); ctx.stroke(); ctx.fillText(fmt(data.max * (1 - i / 4)), 4, y + 4); }
      for (let s = 0; s <= T; s += T > 60 ? 20 : 10) { ctx.fillText(s + " с", X(s) - 8, h - 10); }
      ctx.fillStyle = "rgba(255,80,80,.08)"; ctx.fillRect(X(0), Tt, X(5) - X(0), H2); ctx.fillStyle = "#ff8080"; ctx.fillText("тишина", X(0) + 3, Tt + 14);
      // ступеньки скорости
      ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); data.pts.forEach(([s, , r], i) => (i ? ctx.lineTo(X(s), YR(r)) : ctx.moveTo(X(s), YR(r)))); ctx.stroke();
      // заряд
      const col = getComputedStyle(document.documentElement).getPropertyValue("--c").trim() || "#ff8800";
      sweep = (sweep + dt / Math.max(3, data.T / 6)) % 1.25; const lim = Math.min(1, sweep) * data.T;
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); data.pts.filter((p) => p[0] <= lim).forEach(([s, g], i) => (i ? ctx.lineTo(X(s), Y(g)) : ctx.moveTo(X(s), Y(g)))); ctx.stroke();
      const p = data.pts.filter((q) => q[0] <= lim).pop(); if (p) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 5, 0, 7); ctx.fill(); ctx.fillStyle = "#fff"; ctx.fillText(`${fmt(p[1])} · ${fmt(p[2], 1)}/с`, Math.min(X(p[0]) + 8, w - 120), Y(p[1]) - 8); }
    })(lt3);

    // стойка для брони: своя батарея ×2, при снятии заряд = max(свой, стойки)
    const S = { on: false, P: mkGauge(0), St: mkGauge(0), safe: 0 }, scv = $("#standCv"), sx = scv.getContext("2d"), svis = visible(scv);
    S.P.g = CL[cur].max;
    const ST = img(V("armorstand"));
    const drawStand = () => {
      const c = CL[cur]; sx.clearRect(0, 0, 120, 220); sx.imageSmoothingEnabled = false;
      sx.fillStyle = "#6b4a2b"; sx.fillRect(18, 206, 84, 8); sx.fillStyle = "#8a6239"; sx.fillRect(56, 60, 8, 146); sx.fillRect(30, 70, 60, 7); sx.fillRect(40, 140, 40, 6); sx.fillRect(54, 40, 12, 20);
      if (S.on) { const ic = img(I("cloak_" + cur)); if (ic.complete) sx.drawImage(ic, 10, 46, 100, 100); }
      void ST; void c;
    };
    const upd = () => {
      const cap = CL[cur].max;
      $("#sbP").style.width = (S.P.g / cap) * 100 + "%"; $("#sbPv").textContent = `${S.P.g}/${cap}`;
      $("#sbS").style.width = S.on ? (S.St.g / cap) * 100 + "%" : "0%"; $("#sbSv").textContent = S.on ? `${S.St.g}/${cap}` : "—";
    };
    let tk = 0;
    tickL.push(() => {
      if (!svis()) return;
      const cap = CL[cur].max;
      if (S.on) { gTick(S.St, cap, 2); S.P.tss++; } else gTick(S.P, cap, 1);
      if (++tk % 4 === 0) upd();
    });
    $("#standPut").addEventListener("click", (e) => {
      const cap = CL[cur].max;
      if (!S.on) { S.on = true; S.St.g = Math.min(S.P.g, cap); S.St.tss = S.P.tss; S.St.frac = 0; e.currentTarget.textContent = "снять плащ"; $("#standNote").innerHTML = "Плащ на стойке. Она скопировала твой заряд и счётчик тишины и копит сама, <b>вдвое быстрее</b>. У тебя без плаща заряд стоит."; snd("wood", 0.6); }
      else { S.on = false; S.P.g = Math.max(S.P.g, S.St.g); e.currentTarget.textContent = "повесить плащ"; $("#standNote").innerHTML = `Плащ снова на тебе: заряд стал <b>большим из двух</b> — ${S.P.g}. Батарея стойки обнулилась. А вот тишина после траты у тебя своя: стойка её не обнуляет.`; snd(CL[cur].equip, 0.7); }
      drawStand(); upd();
    });
    $("#standSpend").addEventListener("click", () => {
      if (S.on) { K.say("Плащ висит на стойке — тратить нечего"); return; }
      if (trySpend(S.P, Math.min(500, S.P.g)) && S.P.g >= 0) { snd("shield", 0.5); $("#standNote").textContent = "Потрачено. Теперь пять секунд тишины, потом ступеньки. Попробуй повесить плащ на стойку и сравнить скорость."; } upd();
    });
    onCloak.push(() => { S.P.g = Math.min(S.P.g, CL[cur].max); S.St.g = Math.min(S.St.g, CL[cur].max); drawStand(); upd(); });
    setTimeout(() => { drawStand(); upd(); }, 300);
  })();

  /* ================= 04 СИЛЫ ================= */
  const PW = {};
  (function powers() {
    let id = cur, P = null;
    $("#pTabs").innerHTML = IDS.map((k) => `<button type="button" role="tab" data-id="${k}" style="--tc:${CL[k].tint}" aria-selected="${k === id}"><img src="${I("cloak_" + k)}" alt="">${esc(CL[k].n)}<small>${esc(CL[k].power)}</small></button>`).join("");
    const cv = $("#pCv"), vis = visible(cv), ctl = $("#pCtl");
    $("#pTabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { open(b.dataset.id); setCloak(b.dataset.id); } });
    onCloak.push((k) => { if (k !== id) open(k); });
    const out = (rows) => { $("#pOut").innerHTML = rows.map(([k, v, c]) => `<dt>${k}</dt><dd class="${c || ""}">${v}</dd>`).join(""); };
    function open(k) {
      id = k; $$("#pTabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.id === k));
      $("#pBox").style.setProperty("--tc", CL[k].tint); $(".lg-ptxt h3").style.color = CL[k].tint;
      $("#pTitle").textContent = CL[k].power; ctl.innerHTML = ""; P = PW[k](); P.parts = [];
    }
    /* --- Крокодайл: песок не душит --- */
    PW.crocodile = () => {
      const s = { blk: "sand", on: true, hp: 20, t: 0 };
      $("#pText").innerHTML = `<p>Застрял в песке — обычный игрок задыхается: 1 урона каждые полсекунды. В Плаще Крокодайла этот урон просто не приходит. Проверяются две клетки — ноги и голова, и только <b>песок</b> и <b>красный песок</b>. Гравий и песок душ душат как обычно.</p><p>Заряд на это не тратится: это своя стихия, а не защита.</p>`;
      ctl.innerHTML = `<div class="lg-seg" id="cBlk"><button type="button" data-k="sand" aria-pressed="true">песок</button><button type="button" data-k="red_sand" aria-pressed="false">красный песок</button><button type="button" data-k="gravel" aria-pressed="false">гравий</button></div><button type="button" class="lg-chip" id="cOn" aria-pressed="true">плащ надет</button><button type="button" class="btn-ghost" id="cRe">↺</button>`;
      $("#cBlk").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; s.blk = b.dataset.k; $$("#cBlk button").forEach((x) => x.setAttribute("aria-pressed", x === b)); snd("sand", 0.5); });
      $("#cOn").addEventListener("click", (e) => { s.on = !s.on; e.currentTarget.setAttribute("aria-pressed", s.on); e.currentTarget.textContent = s.on ? "плащ надет" : "без плаща"; });
      $("#cRe").addEventListener("click", () => { s.hp = 20; });
      return {
        tick() { s.t++; const safe = s.on && s.blk !== "gravel"; if (!safe && s.t % 10 === 0 && s.hp > 0) { s.hp--; if (vis()) snd("hurt", 0.25); } if (s.hp <= 0 && s.t % 40 === 0) s.hp = 20; },
        draw(ctx, w, h) {
          const G = h - 60; bgSky(ctx, w, G, "#3b2a16", "#c79a52");
          for (let x = 0; x < w; x += 32) for (let y = G; y < h; y += 32) tile(ctx, "sandstone", x, y, 32);
          const k = s.blk === "gravel" ? "cobble" : "sand";
          for (let y = G - 160; y < G; y += 32) for (let x = 240; x < 400; x += 32) tile(ctx, k, x, y, 32);
          if (s.blk === "red_sand") { ctx.fillStyle = "rgba(190,90,30,.45)"; ctx.fillRect(240, G - 160, 160, 160); }
          ctx.globalAlpha = 0.55; drawPlayer(ctx, 320, G, 4.6, { cloak: s.on ? "crocodile" : null, noCloak: !s.on }); ctx.globalAlpha = 1;
          const safe = s.on && s.blk !== "gravel";
          if (!safe && s.t % 20 < 10) { ctx.fillStyle = "rgba(255,0,0,.18)"; ctx.fillRect(240, G - 160, 160, 160); }
          ctx.drawImage(heartsCanvas(s.hp, 20), 16, 16);
          out([["Блок", { sand: "песок", red_sand: "красный песок", gravel: "гравий" }[s.blk]], ["Плащ", s.on ? "Крокодайл" : "нет"], ["Удушье", safe ? "не приходит" : "1 урон / 10 тиков", safe ? "ok" : "bad"], ["Здоровье", `${s.hp}/20`]]);
        },
      };
    };
    /* --- Акаину: огонь и лава --- */
    PW.akainu = () => {
      const s = { on: true, hp: 20, t: 0, fire: 0, inLava: true };
      $("#pText").innerHTML = `<p>Огонь, горение, лава и магма-блок для Акаину не существуют: такой урон отменяется до всех расчётов. Каждый тик плащ ещё и тушит игрока, так что, выйдя из лавы, он не догорает.</p><p>Обычный игрок в лаве получает 4 урона за раз и горит ещё 15 секунд после выхода.</p>`;
      ctl.innerHTML = `<button type="button" class="lg-chip" id="aOn" aria-pressed="true">плащ надет</button><button type="button" class="lg-chip" id="aIn" aria-pressed="true">в лаве</button><button type="button" class="btn-ghost" id="aRe">↺</button>`;
      $("#aOn").addEventListener("click", (e) => { s.on = !s.on; e.currentTarget.setAttribute("aria-pressed", s.on); e.currentTarget.textContent = s.on ? "плащ надет" : "без плаща"; });
      $("#aIn").addEventListener("click", (e) => { s.inLava = !s.inLava; e.currentTarget.setAttribute("aria-pressed", s.inLava); e.currentTarget.textContent = s.inLava ? "в лаве" : "на берегу"; snd(s.inLava ? "lava" : "swim", 0.5); });
      $("#aRe").addEventListener("click", () => { s.hp = 20; s.fire = 0; });
      return {
        tick() {
          s.t++;
          if (s.inLava) s.fire = 300;
          if (s.on) s.fire = 0; else if (s.fire > 0) s.fire--;
          if (!s.on && s.hp > 0) { if (s.inLava && s.t % 10 === 0) { s.hp = Math.max(0, s.hp - 4); if (vis()) snd("hurt", 0.25); } else if (!s.inLava && s.fire > 0 && s.t % 20 === 0) s.hp = Math.max(0, s.hp - 1); }
          if (s.hp <= 0 && s.t % 40 === 0) { s.hp = 20; s.fire = 0; }
        },
        draw(ctx, w, h) {
          const G = h - 60; bgSky(ctx, w, G, "#1a0603", "#5a1a08");
          for (let x = 0; x < w; x += 32) { tile(ctx, x > 200 && x < 460 ? "lava" : "magma", x, G, 32); tile(ctx, "magma", x, G + 32, 32); }
          const px = s.inLava ? 330 : 120;
          drawPlayer(ctx, px, G + (s.inLava ? 30 : 0), 4.6, { cloak: s.on ? "akainu" : null, noCloak: !s.on });
          if (s.fire > 0 || (!s.on && s.inLava)) for (let i = 0; i < 6; i++) { ctx.fillStyle = ["#ff5a1f", "#ffb02e", "#ffdc43"][i % 3]; ctx.fillRect(px - 20 + Math.random() * 40, G - 30 - Math.random() * 120, 6, 10); }
          if (Math.random() < 0.3) P.parts.push({ x: rnd(200, 460), y: G, vx: rnd(-0.5, 0.5), vy: -rnd(1, 3), g: 0.08, life: 40, t: 0, c: "#ffb02e", s: 3, glow: 1 });
          ctx.drawImage(heartsCanvas(s.hp, 20), 16, 16);
          out([["Плащ", s.on ? "Акаину" : "нет"], ["Лава", s.on ? "урон отменён" : s.inLava ? "4 урона раз в полсекунды" : "—", s.on ? "ok" : s.inLava ? "bad" : ""], ["Горение", s.on ? "тушится каждый тик" : s.fire > 0 ? `ещё ${Math.ceil(s.fire / 20)} с` : "нет", s.on ? "ok" : s.fire ? "bad" : ""], ["Здоровье", `${s.hp}/20`]]);
        },
      };
    };
    /* --- Аокидзи: Ледниковый период --- */
    PW.aokiji = () => {
      const N = 41, R0 = 10, grid = []; for (let z = 0; z < N; z++) { grid.push([]); for (let x = 0; x < N; x++) { const dx = x - 20, dz = z - 20, d = Math.hypot(dx * 0.9, dz * 1.1) + Math.sin(x * 0.7) * 1.5 + Math.cos(z * 0.5) * 1.5; grid[z].push(d < 17 ? "water" : d < 18.5 ? "sand" : "grass"); } }
      const s = { x: 6, z: 20, dy: 0, frozen: 0, drag: false, t: 0 };
      $("#pText").innerHTML = `<p>Каждый тик вокруг Аокидзи проверяется шар радиусом <b>10 блоков</b> — до 4 169 клеток — и вся вода в нём превращается в лёд. Не только снизу: сверху, сбоку, во все стороны. По озеру он идёт как по катку.</p><p>Надел плащ, уже стоя под водой — две клетки, где ноги и голова, сначала становятся воздухом. Получается пузырь внутри ледяной глыбы. Мороз, рыхлый снег и замерзание ему не страшны.</p>`;
      ctl.innerHTML = `<label>Срез на высоте <input type="range" id="iDy" min="-9" max="9" value="0"><b id="iDyT">0</b></label><button type="button" class="btn-ghost" id="iRe">↺ растопить</button>`;
      $("#iDy").addEventListener("input", (e) => { s.dy = +e.target.value; $("#iDyT").textContent = (s.dy > 0 ? "+" : "") + s.dy; });
      $("#iRe").addEventListener("click", () => { for (const r of grid) for (let i = 0; i < N; i++) if (r[i] === "ice") r[i] = "water"; s.frozen = 0; snd("swim", 0.5); });
      const pos = (e) => { const r = cv.getBoundingClientRect(), cell = Math.min(r.width, r.height * 1.6) / N; void cell; const ox = (r.width - r.height) / 2; return [clamp(((e.clientX - r.left - ox) / r.height) * N, 0, N - 1), clamp(((e.clientY - r.top) / r.height) * N, 0, N - 1)]; };
      const down = (e) => { s.drag = true; [s.x, s.z] = pos(e); try { cv.setPointerCapture(e.pointerId); } catch (_) {} };
      const move = (e) => { if (s.drag) [s.x, s.z] = pos(e); };
      const up = () => (s.drag = false);
      cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move); cv.addEventListener("pointerup", up);
      const cleanup = () => { cv.removeEventListener("pointerdown", down); cv.removeEventListener("pointermove", move); cv.removeEventListener("pointerup", up); };
      return {
        cleanup,
        tick() {
          s.t++; if (!s.drag && motion()) { s.x = 20 + Math.cos(s.t / 90) * 15; s.z = 20 + Math.sin(s.t / 60) * 12; }
          const r2 = R0 * R0 - s.dy * s.dy; if (r2 < 0) return; const rr = Math.sqrt(r2); let n = 0;
          const cx = Math.floor(s.x), cz = Math.floor(s.z);
          for (let z = Math.max(0, cz - 10); z <= Math.min(N - 1, cz + 10); z++) for (let x = Math.max(0, cx - 10); x <= Math.min(N - 1, cx + 10); x++) {
            const dx = x - cx, dz = z - cz; if (dx * dx + dz * dz + s.dy * s.dy > R0 * R0) continue;
            if (s.dy === 0 && x === cx && z === cz) continue;
            if (grid[z][x] === "water") { grid[z][x] = "ice"; n++; }
          }
          if (n) { s.frozen += n; if (vis() && s.t % 6 === 0) snd("freeze", 0.25, rnd(0.9, 1.2)); }
          void rr;
        },
        draw(ctx, w, h) {
          ctx.fillStyle = "#0a1426"; ctx.fillRect(0, 0, w, h);
          const cs = h / N, ox = (w - h) / 2;
          for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) { const k = grid[z][x]; tile(ctx, k === "grass" ? "grass_top" : k, ox + x * cs, z * cs, cs + 0.5); }
          const rr = Math.sqrt(Math.max(0, R0 * R0 - s.dy * s.dy));
          const cx = (Math.floor(s.x) + 0.5) * cs + ox, cz = (Math.floor(s.z) + 0.5) * cs;
          ctx.strokeStyle = "rgba(214,250,255,.9)"; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(cx, cz, rr * cs, 0, 7); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = "rgba(120,223,255,.12)"; ctx.beginPath(); ctx.arc(cx, cz, rr * cs, 0, 7); ctx.fill();
          const hd = img(I("player_head")); if (hd.complete) ctx.drawImage(hd, cx - cs * 1.2, cz - cs * 1.2, cs * 2.4, cs * 2.4);
          let water = 0, ice = 0; for (const r of grid) for (const k of r) { if (k === "water") water++; if (k === "ice") ice++; }
          out([["Радиус на этом срезе", `${fmt(rr, 1)} бл.`], ["Заморожено за раз", fmt(s.frozen)], ["Лёд / вода", `${ice} / ${water}`], ["Проверок за тик", "до 4 169"]]);
        },
      };
    };
    /* --- Кизару: световой рывок при смертельном падении --- */
    PW.kizaru = () => {
      const LAND = { normal: ["земля", 1], hay: ["сено", 0.2], bed: ["кровать", 0.5], honey: ["мёд", 0.2], slime: ["слизь", 0] };
      const s = { hgt: 30, hp: 20, land: "normal", obs: true, anim: null, cd: 0 };
      $("#pText").innerHTML = `<p>Если падение должно убить — урон считается как (высота − 3) × множитель блока, и сено, кровать, мёд уже учтены, — Кизару вместо смерти уходит <b>световым рывком</b> на 10 блоков вперёд по взгляду. Падение отменяется целиком.</p><p>По пути ломаются блоки на уровне ног и головы (с дропом), и все, кого задело, получают <b>12 урона</b> от игрока. Обсидиан, плачущий обсидиан, бедрок, барьер, командные и структурные блоки луч не пробивает: рывок обрывается перед ними. Перезарядка — минута, в HUD горит «СВЕТ».</p>`;
      ctl.innerHTML = `<label>Высота <input type="range" id="kH" min="4" max="80" value="30"><b id="kHT">30</b></label><label>Здоровье <input type="range" id="kHp" min="1" max="20" value="20"><b id="kHpT">20</b></label>
        <div class="lg-seg" id="kL">${Object.entries(LAND).map(([k, v]) => `<button type="button" data-k="${k}" aria-pressed="${k === "normal"}">${v[0]}</button>`).join("")}</div>
        <button type="button" class="lg-chip" id="kObs" aria-pressed="true">обсидиан на пути</button><button type="button" class="k-btn" id="kGo" style="padding:10px 16px">Прыгнуть</button>`;
      const pred = () => Math.max(0, s.hgt - 3) * LAND[s.land][1];
      $("#kH").addEventListener("input", (e) => { s.hgt = +e.target.value; $("#kHT").textContent = s.hgt; });
      $("#kHp").addEventListener("input", (e) => { s.hp = +e.target.value; $("#kHpT").textContent = s.hp; });
      $("#kL").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; s.land = b.dataset.k; $$("#kL button").forEach((x) => x.setAttribute("aria-pressed", x === b)); });
      $("#kObs").addEventListener("click", (e) => { s.obs = !s.obs; e.currentTarget.setAttribute("aria-pressed", s.obs); });
      $("#kGo").addEventListener("click", () => { if (s.anim) return; const lethal = pred() >= s.hp; s.anim = { t: 0, lethal, dash: lethal && PS.kiz <= 0, blocks: [["planks", 3], ["stone", 5], s.obs ? ["obsidian", 8] : null].filter(Boolean), mob: 6, mobHit: false, broke: [] }; snd("swim", 0.3, 0.6); });
      return {
        tick() {},
        draw(ctx, w, h) {
          const G = h - 50; bgSky(ctx, w, G, "#0d1d38", "#2a4a80");
          for (let x = 0; x < w; x += 32) { tile(ctx, s.land === "hay" && x < 128 ? "hay" : s.land === "slime" && x < 128 ? "slime" : "grass_top", x, G, 32); tile(ctx, "dirt", x, G + 32, 32); }
          const bs = 48, x0 = 70, A = s.anim;
          const blocks = A ? A.blocks : [["planks", 3], ["stone", 5], ...(s.obs ? [["obsidian", 8]] : [])];
          const stopAt = blocks.find((b) => b[0] === "obsidian"); const maxStep = stopAt ? stopAt[1] - 1 : 10;
          for (const [k, i] of blocks) if (!(A && A.broke.includes(i))) { tile(ctx, k, x0 + i * bs - bs / 2 + 24, G - bs, bs); tile(ctx, k, x0 + i * bs - bs / 2 + 24, G - bs * 2, bs); }
          ctx.fillStyle = "rgba(255,255,255,.25)"; for (let i = 1; i <= 10; i++) ctx.fillRect(x0 + i * bs + 24, G + 2, 2, 8);
          let py = G, px = x0 + 24, alpha = 1;
          if (A) {
            A.t += 1 / 60; const fallT = 0.9;
            if (A.t < fallT) py = G - (1 - (A.t / fallT) ** 2) * (G - 30);
            else if (A.dash) {
              const k = clamp((A.t - fallT) / 0.25, 0, 1), step = k * maxStep; px = x0 + 24 + step * bs;
              for (const [kk, i] of blocks) if (kk !== "obsidian" && i <= step && !A.broke.includes(i)) { A.broke.push(i); burst(P.parts, "smoke", x0 + i * bs + 24, G - bs, 14); snd(kk === "stone" ? "stone" : "wood", 0.5); }
              if (step >= A.mob && !A.mobHit && A.mob <= maxStep) { A.mobHit = true; snd("hurt", 0.5); }
              if (!A.fx) { A.fx = 1; snd("rocket", 0.7, 1.85); snd("beacon", 0.5, 1.75); PS.kiz = 1200; }
              ctx.fillStyle = "rgba(255,227,77,.9)"; ctx.shadowColor = "#ffe34d"; ctx.shadowBlur = 18;
              for (const o of [-6, 0, 6]) ctx.fillRect(x0 + 24, G - 4.2 * 10 + o, step * bs, o ? 2 : 4); ctx.shadowBlur = 0;
              if (k >= 1 && !A.flash) { A.flash = 1; burst(P.parts, "light", px, G - 40, 30, 1.5); }
            } else if (A.t >= fallT && !A.dead) { A.dead = 1; burst(P.parts, "blood", px, G - 10, 20); snd("hurt", 0.8); }
            if (A.dead) alpha = 0.3;
            if (A.t > 2.4) s.anim = null;
          }
          if (!(A && A.mobHit)) drawMob(ctx, "zombie", x0 + 24 + 6 * bs, G, 3.4, { swing: Math.sin(Date.now() / 300) * 0.3, arm: -1.4 });
          else { ctx.globalAlpha = 0.5; drawMob(ctx, "zombie", x0 + 24 + 6 * bs, G, 3.4, { flash: 1 }); ctx.globalAlpha = 1; }
          ctx.globalAlpha = alpha; drawPlayer(ctx, px, py, 3.4, { cloak: "kizaru" }); ctx.globalAlpha = 1;
          const p = pred(), lethal = p >= s.hp;
          out([["Урон от падения", `${fmt(p, 1)} = (${s.hgt} − 3) × ${LAND[s.land][1]}`], ["Смертельно?", lethal ? "да" : "нет", lethal ? "bad" : "ok"], ["Рывок", lethal ? (PS.kiz > 0 ? `перезарядка ${Math.ceil(PS.kiz / 20)} с` : "сработает") : "не нужен", lethal ? (PS.kiz > 0 ? "bad" : "ok") : ""],
            ["Дальность", stopAt ? `${maxStep} бл. — обсидиан` : "10 бл."], ["Урон задетым", "12"], ["Перезарядка", "60 с"]]);
        },
      };
    };
    /* --- Сэнгоку: отражение и без отбрасывания --- */
    PW.sengoku = () => {
      const s = { t: 0, arrows: [], ore: null };
      $("#pText").innerHTML = `<p>Стрела, трезубец или любой другой снаряд, выпущенный не тобой, разворачивается в стрелявшего: в сторону его глаз, со скоростью ×1.2 (не меньше 0.8). Снаряд становится твоим. Каждое отражение стоит <b>40 заряда</b>, кончился заряд — снаряды снова попадают, только уже в абсолютную защиту.</p><p>Пока заряд больше нуля, Сэнгоку не отбрасывает вообще. А каждая добытая руда — один бросок на <b>1%</b>: выпадает Будда Лабубу, золотое яблоко, золотая морковь или печенье, поровну.</p>`;
      ctl.innerHTML = `<button type="button" class="lg-chip" id="sMine">⛏ добыть 100 руд</button><button type="button" class="btn-ghost" id="sRe">↺ полный заряд</button>`;
      $("#sRe").addEventListener("click", () => { PG.g = CL.sengoku.max; snd("orb", 0.4); });
      $("#sMine").addEventListener("click", () => {
        const got = { labubu_buddha: 0, golden_apple: 0, golden_carrot: 0, cookie: 0 }; let n = 0;
        for (let i = 0; i < 100; i++) if (Math.random() < 0.01) { n++; got[Object.keys(got)[Math.random() * 4 | 0]]++; }
        s.ore = { n, got }; snd(n ? "levelup" : "stone", 0.5);
      });
      return {
        tick() {
          s.t++;
          if (s.t % 40 === 0 && cur === "sengoku") s.arrows.push({ x: 520, y: 0, vx: -9, back: false, life: 0 });
          for (let i = s.arrows.length - 1; i >= 0; i--) {
            const a = s.arrows[i]; a.x += a.vx; a.life++;
            if (!a.back && a.x <= 220) {
              if (trySpend(PG, 40)) { a.back = true; a.vx = Math.max(8, Math.abs(a.vx) * 1.2); if (vis()) snd("shield", 0.45, 1.45); burst(P.parts, "gold", 220, 0, 16); a.hitY = 1; }
              else { s.arrows.splice(i, 1); if (vis()) snd("bowhit", 0.4); continue; }
            }
            if (a.back && a.x > 520) { s.arrows.splice(i, 1); if (vis()) snd("bowhit", 0.3, 0.8); }
          }
        },
        draw(ctx, w, h) {
          const G = h - 60; bgSky(ctx, w, G, "#1d1404", "#5a4210");
          for (let x = 0; x < w; x += 32) { tile(ctx, "stone", x, G, 32); tile(ctx, "deepslate", x, G + 32, 32); }
          if (cur !== "sengoku") { ctx.fillStyle = "#fff"; ctx.font = "16px 'LG Text'"; ctx.fillText("Надень Плащ Сэнгоку, чтобы скелет начал стрелять", 20, 30); }
          drawPlayer(ctx, 200, G, 4.2, { cloak: "sengoku" });
          drawMob(ctx, "skeleton", 540, G, 4.2, { arm: -1.5 });
          const ar = img(I("arrow"));
          for (const a of s.arrows) { ctx.save(); ctx.translate(a.x, G - 22 * 4.2); ctx.rotate(a.back ? -Math.PI / 4 : Math.PI * 0.75); if (ar.complete) ctx.drawImage(ar, -18, -18, 36, 36); ctx.restore(); if (a.back) { ctx.fillStyle = "rgba(255,214,90,.6)"; ctx.fillRect(a.x - 30, G - 22 * 4.2 - 1, 30, 2); } }
          for (const p of P.parts) if (p.y < 5) { p.y += G - 22 * 4.2; }
          const o = s.ore;
          out([["Заряд", `${PG.g}/3000`], ["Отражение", PG.g >= 40 ? "40 заряда" : "не хватает", PG.g >= 40 ? "ok" : "bad"], ["Отбрасывание", PG.g > 0 ? "нет" : "есть", PG.g > 0 ? "ok" : "warn"],
            ...(o ? [["100 руд → бонусов", String(o.n), o.n ? "ok" : ""], ...Object.entries(o.got).filter(([, v]) => v).map(([k, v]) => [{ labubu_buddha: "Будда Лабубу", golden_apple: "Золотое яблоко", golden_carrot: "Золотая морковь", cookie: "Печенье" }[k], "×" + v])] : [["Руда", "1% на блок"]])]);
        },
      };
    };
    /* --- Белоус: +4 сердца и последний рубеж --- */
    PW.whitebeard = () => {
      const s = { hp: 28, lock: 0, cd: 0 };
      $("#pText").innerHTML = `<p>Плащ Белоуса даёт <b>+8 к максимуму здоровья</b> — четыре сердца сверху. Сняли плащ — сердца исчезают, лишнее здоровье срезается.</p><p>Когда удар должен добить (или оставить меньше половины сердца), срабатывает <b>последний рубеж</b>: здоровье застывает на половине сердца, и 10 секунд его не берёт ничего — даже бездна, даже хаки. HUD пишет «ЯРОСТЬ». Потом ещё 110 секунд «РУБЕЖ» — перезарядка, всего 120. Бездна сама рубеж не запускает.</p>`;
      ctl.innerHTML = `<button type="button" class="lg-chip" id="wHit">⚔ незеритовый топор, 10</button><button type="button" class="lg-chip" id="wVoid">бездна, 4</button><button type="button" class="btn-ghost" id="wRe">↺ здоровье</button>`;
      const hitW = (dmg, isVoid) => {
        if (s.lock > 0) { burst(P.parts, "quake", 320, 0, 16); snd("shield", 0.5, 0.7); return; }
        if (!isVoid && s.cd <= 0 && s.hp - dmg <= 1) { s.hp = 1; s.lock = 200; s.cd = 2400; burst(P.parts, "quake", 320, 0, 40, 1.5); snd("thunder", 0.6); return; }
        s.hp = Math.max(0, s.hp - dmg); snd("hurt", 0.6); burst(P.parts, "blood", 320, 0, 10);
        if (s.hp <= 0) setTimeout(() => { s.hp = 28; }, 1200);
      };
      $("#wHit").addEventListener("click", () => hitW(10, false));
      $("#wVoid").addEventListener("click", () => hitW(4, true));
      $("#wRe").addEventListener("click", () => { s.hp = 28; s.lock = 0; s.cd = 0; snd("orb", 0.4); });
      return {
        tick() { if (s.lock > 0) { s.lock--; s.hp = 1; } if (s.cd > 0) s.cd--; },
        draw(ctx, w, h) {
          const G = h - 60; bgSky(ctx, w, G, "#141820", "#3a4256");
          for (let x = 0; x < w; x += 32) { tile(ctx, "stone", x, G, 32); tile(ctx, "cobble", x, G + 32, 32); }
          if (s.lock > 0) { ctx.strokeStyle = "rgba(238,247,255,.8)"; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { ctx.beginPath(); let x = 320, y = G; ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (i < 3 ? -1 : 1) * rnd(10, 30); y += rnd(-4, 10); ctx.lineTo(x, y); } ctx.stroke(); } for (let i = 0; i < 8; i++) { const an = (Math.PI * 2 * i) / 8 + gtime * 0.12; ctx.fillStyle = "rgba(238,247,255,.9)"; ctx.fillRect(320 + Math.cos(an) * 46, G - 90 + (i % 3) * 20, 4, 12); } }
          drawPlayer(ctx, 320, G, 4.4, { cloak: "whitebeard" });
          for (const p of P.parts) if (p.y < 5) p.y += G - 80;
          ctx.drawImage(heartsCanvas(s.hp, 28), 16, 16);
          out([["Здоровье", `${s.hp}/28`], ["Ярость", s.lock > 0 ? `${Math.ceil(s.lock / 20)} с` : "—", s.lock > 0 ? "ok" : ""], ["Рубеж", s.cd > 0 ? `перезарядка ${Math.ceil(s.cd / 20)} с` : "готов", s.cd > 0 ? "warn" : "ok"]]);
        },
      };
    };
    let prevP = null;
    const _open = open; open = (k) => { if (P && P.cleanup) P.cleanup(); _open(k); prevP = P; };
    open(id);
    tickL.push(() => { if (P && P.tick) P.tick(); });
    let lt4 = performance.now();
    (function f(now) {
      requestAnimationFrame(f); lt4 = now;
      if (!vis() || !P) return;
      const { ctx, w, h } = fitCanvas(cv, 640); P.draw(ctx, w, h); drawParts(ctx, P.parts);
    })(lt4);
    void prevP;
  })();
  function bgSky(ctx, w, G, a, b) { const g = ctx.createLinearGradient(0, 0, 0, G); g.addColorStop(0, a); g.addColorStop(1, b); ctx.fillStyle = g; ctx.fillRect(0, 0, w, G); }
  const HI = { f: img(UI("heart_full")), h: img(UI("heart_half")), b: img(UI("heart_bg")) };
  function heartsCanvas(hp, max) {
    const n = Math.ceil(max / 2), c = document.createElement("canvas"); c.width = n * 19; c.height = 18; const x = c.getContext("2d"); x.imageSmoothingEnabled = false;
    for (let i = 0; i < n; i++) { const v = hp - i * 2; const im = v >= 2 ? HI.f : v >= 1 ? HI.h : HI.b; if (im.complete) x.drawImage(im, i * 19, 0, 18, 18); }
    return c;
  }

  /* ================= 05 ВОДА ================= */
  (function water() {
    const cv = $("#poolCv"), vis = visible(cv); let pick = cur;
    $("#poolPick").innerHTML = IDS.map((k) => `<button type="button" class="pk" data-id="${k}" aria-pressed="${k === pick}" aria-label="${esc(CL[k].full)}"><img src="${I("cloak_" + k)}" alt=""></button>`).join("");
    const SURF = 5, DEPTH = 12, COLS = 20, MID = COLS / 2;
    const S = { on: false, x: 1, y: SURF, vy: 0, t: 0, hp: 20, air: 300, g: 0, ice: new Set() };
    const reset = () => Object.assign(S, { on: false, x: 1, y: SURF, vy: 0, t: 0, hp: 20, air: 300, g: CL[pick].max, inW: false, ice: new Set() });
    reset();
    $("#poolPick").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; pick = b.dataset.id; $$("#poolPick button").forEach((x) => x.setAttribute("aria-pressed", x === b)); reset(); snd(CL[pick].equip, 0.6); });
    $("#poolGo").addEventListener("click", () => { reset(); S.on = true; S.vy = 0.42; snd("swim", 0.4); });
    $("#poolOut").addEventListener("click", () => { reset(); });
    const isWater = (cx, cy) => cx >= 2 && cx < COLS - 2 && cy >= SURF && cy < SURF + DEPTH - 1;
    const solid = (cx, cy) => !isWater(cx, cy) || S.ice.has(cx + "," + cy);
    tickL.push(() => {
      if (!vis()) return;
      const c = CL[pick];
      // Ледниковый период: шар R10 вокруг игрока, кроме клеток ног и головы
      if (pick === "aokiji") { const px = Math.floor(S.x), fy = Math.floor(S.y - 0.01); for (let cy = SURF; cy < SURF + DEPTH; cy++) for (let cx = 0; cx < COLS; cx++) { if (!isWater(cx, cy)) continue; if ((cx - px) ** 2 + (cy - fy) ** 2 > 100) continue; if (cx === px && (cy === fy || cy === fy - 1)) continue; if (!S.ice.has(cx + "," + cy)) { S.ice.add(cx + "," + cy); if (S.t % 4 === 0) snd("freeze", 0.2); } } }
      if (!S.on) return;
      S.t++;
      const air = S.y - S.vy < SURF || !isWater(Math.floor(S.x), Math.floor(S.y));
      if (S.x < MID) S.x = Math.min(MID, S.x + 0.22);
      const inW = isWater(Math.floor(S.x), Math.floor(S.y)) && !S.ice.has(Math.floor(S.x) + "," + Math.floor(S.y)) && S.y > SURF;
      if (inW && !S.inW) { S.inW = true; snd("splash", 0.5); }
      if (!inW) { S.vy -= 0.08; S.vy *= 0.98; }
      else { S.vy *= 0.8; S.vy -= 0.02; S.vy -= 0.08; if (S.vy < -0.35) S.vy = -0.35; }
      let ny = S.y - S.vy;
      // приземление на твёрдое (берег, лёд, дно)
      if (S.vy < 0 && solid(Math.floor(S.x), Math.floor(ny)) && Math.floor(ny) >= SURF) { ny = Math.floor(ny); S.vy = 0; }
      S.y = ny; void air;
      const eyes = S.y - 1.62 > SURF && inW;
      if (eyes) {
        if (c.logia) { S.air = 0; if (S.t % 10 === 0 && S.hp > 0) { S.hp = Math.max(0, S.hp - 2); snd("hurt", 0.35); } }
        else { if (S.air > 0) S.air -= 1; else if (S.t % 20 === 0 && S.hp > 0) { if (S.g >= c.melee) { S.g -= c.melee; snd("shield", 0.3); } else { S.hp = Math.max(0, S.hp - 2); snd("hurt", 0.35); } } }
      }
      if (S.hp <= 0) S.on = false;
    });
    let lt5 = performance.now();
    (function f(now) {
      requestAnimationFrame(f); lt5 = now;
      if (!vis()) return;
      const { ctx, w, h } = fitCanvas(cv, 480);
      const bs = Math.min(w / COLS, h / (SURF + DEPTH)), c = CL[pick], oy = h - (SURF + DEPTH) * bs, ox = (w - COLS * bs) / 2;
      bgSky(ctx, w, oy + SURF * bs, "#0b1830", "#244a85");
      ctx.save(); ctx.translate(ox, oy);
      const ex = Math.ceil(ox / bs) + 1;
      for (let cy = SURF; cy < SURF + DEPTH; cy++) for (let cx = -ex; cx < COLS + ex; cx++) {
        const k = isWater(cx, cy) ? (S.ice.has(cx + "," + cy) ? "ice" : "water") : cy === SURF && (cx < 2 || cx >= COLS - 2) ? "grass_side" : cy === SURF + DEPTH - 1 || cx < 0 || cx >= COLS ? "sandstone" : "sand";
        tile(ctx, k, cx * bs, cy * bs, bs + 0.5);
      }
      ctx.fillStyle = "rgba(20,60,160,.22)"; ctx.fillRect(2 * bs, SURF * bs, (COLS - 4) * bs, (DEPTH - 1) * bs);
      drawPlayer(ctx, S.x * bs, S.y * bs, bs / 16, { cloak: pick, alpha: S.hp <= 0 ? 0.3 : 1 });
      if (S.y - 1.62 > SURF && Math.random() < 0.3) { ctx.fillStyle = "rgba(220,240,255,.7)"; ctx.fillRect(S.x * bs + rnd(-8, 8), S.y * bs - 1.8 * bs - rnd(0, 30), 4, 4); }
      ctx.restore();
      ctx.drawImage(heartsCanvas(S.hp, 20), 10, 10);
      // пузырьки воздуха как в ванили (10 штук по 30 тиков)
      const bub = Math.ceil(S.air / 30); for (let i = 0; i < 10; i++) { ctx.fillStyle = i < bub ? "#cfe8ff" : "rgba(255,255,255,.12)"; ctx.beginPath(); ctx.arc(14 + i * 19, 40, 6, 0, 7); ctx.fill(); }
      const depth = Math.max(0, S.y - SURF);
      $("#poolTele").innerHTML = [["Плащ", `<span style="color:${MC[c.code]}">${c.n}</span>`], ["Глубина", `${fmt(depth, 1)} бл.`], ["Скорость вниз", `${fmt(Math.max(0, -S.vy), 2)} бл./тик`, S.vy <= -0.34 ? "bad" : ""],
        ["Воздух", c.logia && S.y - 1.62 > SURF ? "0 (логия)" : `${S.air}/300`, c.logia && S.y - 1.62 > SURF ? "bad" : ""], ["Здоровье", `${S.hp}/20`, S.hp < 8 ? "bad" : ""], ...(c.logia ? [] : [["Заряд", `${S.g}/${c.max}`]])].map(([k, v, cl]) => `<dt>${k}</dt><dd class="${cl || ""}">${v}</dd>`).join("");
      $("#poolNote").textContent = pick === "aokiji" ? "Аокидзи не тонет: вода в радиусе 10 замерзает раньше, чем он до неё долетает, и он приземляется на лёд." :
        c.logia ? "Логия: голова под водой — воздух сразу ноль, по 2 урона каждые полсекунды. Двадцать здоровья — пять секунд." :
        "Абсолют тонет как все, но урон от утопления — тоже урон: пока есть заряд, каждый удар воды стоит 55.";
    })(lt5);
  })();

  /* ================= 06 ГДЕ ВЗЯТЬ ================= */
  const RC = {
    akainu: { pattern: ["MFM", "BCB", "MLM"], key: { M: ["Магма-блок", "magma_block"], F: ["Огненный заряд", "fire_charge"], B: ["Огненный порошок", "blaze_powder"], L: ["Ведро лавы", "lava_bucket"], C: ["Плащ Крокодайла", "cloak_crocodile", 1] } },
    aokiji: { pattern: ["IBI", "SCS", "IDI"], key: { I: ["Плотный лёд", "packed_ice"], B: ["Синий лёд", "blue_ice"], S: ["Снежный блок", "snow_block"], D: ["Алмаз", "diamond"], C: ["Плащ Крокодайла", "cloak_crocodile", 1] } },
    kizaru: { pattern: ["GDG", "LCL", "GAG"], key: { G: ["Светокамень", "glowstone"], D: ["Алмаз", "diamond"], L: ["Морской фонарь", "sea_lantern"], A: ["Осколок аметиста", "amethyst_shard"], C: ["Плащ Крокодайла", "cloak_crocodile", 1] } },
    sengoku: { pattern: ["KBK", "ILI", "GAG"], key: { K: ["Печенье", "cookie"], B: ["Будда Лабубу", "labubu_buddha", 1], G: ["Золотой блок", "gold_block"], I: ["Золотой слиток", "gold_ingot"], L: ["Зачарованное золотое яблоко", "enchanted_golden_apple"], A: ["Любой плащ адмирала", "cloak_akainu", 2] } },
    whitebeard: { pattern: ["DHD", "NAN", "DSD"], key: { D: ["Алмаз", "diamond"], H: ["Сердце моря", "heart_of_the_sea"], N: ["Железный блок", "iron_block"], A: ["Любой плащ адмирала", "cloak_akainu", 2], S: ["Звезда Незера", "nether_star"] } },
  };
  (function craft() {
    const gotCroc = () => has("crocodile");
    const tree = () => {
      const n = (k, sub) => `<div class="lg-tnode ${has(k) ? "got" : ""}"><img src="${I("cloak_" + k)}" alt="">${esc(CL[k].n)}${sub ? `<small>${esc(sub)}</small>` : ""}</div>`;
      $("#tree").innerHTML = `<div class="lg-tnode"><img src="${I("chest")}" alt="">Храм в пустыне<small>35%</small></div><div class="lg-tarrow">→</div>
        <div class="lg-tcol">${n("crocodile", "открывает рецепты")}</div><div class="lg-tarrow">→</div>
        <div class="lg-tcol">${n("akainu")}${n("aokiji")}${n("kizaru")}</div>`;
      $("#tree").insertAdjacentHTML("beforeend", `<div class="lg-tarrow">→</div><div class="lg-tcol">${n("sengoku", "из любого адмирала")}${n("whitebeard", "из любого адмирала")}</div>`);
      $("#tree").style.gridTemplateColumns = "auto auto auto auto auto auto auto";
    };
    tree(); onAdv.push(tree);
    // сундук
    const LOOT = [["bone", 1, 6], ["rotten_flesh", 1, 8], ["gunpowder", 1, 8], ["string", 1, 8], ["spider_eye", 1, 3], ["sand", 1, 8], ["gold_ingot", 1, 5], ["iron_ingot", 1, 5], ["emerald", 1, 3], ["diamond", 1, 2], ["golden_apple", 1, 1], ["saddle", 1, 1], ["enchanted_book", 1, 1]];
    let opened = 0;
    const chest = $("#chest");
    chest.innerHTML = Array.from({ length: 27 }, () => "<span></span>").join("");
    $("#chestOpen").addEventListener("click", () => {
      opened++; snd("chest", 0.6);
      const cells = $$("#chest span"); cells.forEach((c) => { c.innerHTML = ""; c.className = ""; c.onclick = null; c.removeAttribute("data-tip"); });
      const n = 4 + (Math.random() * 6 | 0), used = new Set();
      const put = (k, cnt, name) => { let i; do i = Math.random() * 27 | 0; while (used.has(i)); used.add(i); const c = cells[i]; c.innerHTML = `<img src="${I(k)}" alt="">${cnt > 1 ? `<b>${cnt}</b>` : ""}`; c.className = "cl"; if (name) c.setAttribute("data-tip", name); return c; };
      for (let j = 0; j < n; j++) { const [k, a, b] = LOOT[Math.random() * LOOT.length | 0]; put(k, a + (Math.random() * (b - a + 1) | 0)); }
      const croc = Math.random() < 0.35 || (opened >= 4 && !gotCroc());
      if (croc) {
        const c = put("cloak_crocodile", 1, "Плащ Крокодайла"); c.style.cursor = "pointer"; c.style.boxShadow = "0 0 0 2px #FFAA00";
        c.onclick = () => { c.innerHTML = ""; c.style.boxShadow = ""; c.onclick = null; snd("pop", 0.6); snd("leather", 0.6); grant("crocodile"); K.say("§6Плащ Крокодайла§7 · открыты рецепты пяти плащей"); drawR(); };
        $("#chestCnt").textContent = `Сундук №${opened}: плащ есть! Забери его.`;
      } else $("#chestCnt").textContent = `Сундук №${opened}: плаща нет (65%). Ищи следующий храм.`;
    });
    // рецепты
    let rk = "akainu", rot = null;
    $("#rTabs").innerHTML = Object.keys(RC).map((k) => `<button type="button" data-k="${k}" aria-pressed="${k === rk}"><img src="${I("cloak_" + k)}" alt="">${esc(CL[k].n)}</button>`).join("");
    $("#rTabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; rk = b.dataset.k; $$("#rTabs button").forEach((x) => x.setAttribute("aria-pressed", x === b)); drawR(); snd("click", 0.35); });
    function drawR() {
      const r = RC[rk], key = {};
      for (const [ch, [name, ic]] of Object.entries(r.key)) key[ch] = { name, id: ic.startsWith("cloak_") || ic === "labubu_buddha" ? `zitraksmode:${ic}` : ic === "cloak_akainu" ? "#zitraksmode:admiral_cloaks" : `minecraft:${ic}`, src: I(ic) };
      if (r.key.A && r.key.A[2] === 2) key.A.id = "#zitraksmode:admiral_cloaks";
      K.craft($("#craftBox"), {
        pattern: r.pattern, key, result: { name: CL[rk].full, id: `zitraksmode:cloak_${rk}`, src: I("cloak_" + rk) },
        onTake: () => {
          if (!gotCroc()) { K.say("Рецепт ещё закрыт: он откроется, когда в руки попадёт Плащ Крокодайла", true); return; }
          if ((rk === "sengoku" || rk === "whitebeard") && !["akainu", "aokiji", "kizaru"].some(has)) { K.say("Нужен любой плащ адмирала: сначала сшей Акаину, Аокидзи или Кизару", true); return; }
          grant(rk); snd(CL[rk].equip, 0.7); setCloak(rk);
        },
      });
      clearInterval(rot);
      if (r.key.A && r.key.A[2] === 2) { let i = 0; rot = setInterval(() => { i = (i + 1) % 3; $$("#craftBox img[alt='Любой плащ адмирала']").forEach((im) => (im.src = I("cloak_" + ["akainu", "aokiji", "kizaru"][i]))); }, 1100); }
      $("#craftNote").innerHTML = (gotCroc() ? "" : "<b>Рецепт закрыт</b> — найди Крокодайла в сундуке слева. ") + {
        akainu: "Магма по углам, лава снизу, огонь сверху. Крокодайл в центре уходит в крафт.",
        aokiji: "Плотный и синий лёд, снег и алмаз. Крокодайл в центре уходит в крафт.",
        kizaru: "Светокамень, морские фонари, алмаз и аметист. Крокодайл в центре уходит в крафт.",
        sengoku: "Внизу в центре — любой из трёх плащей адмиралов (тег admiral_cloaks). Плюс Будда Лабубу из пункта №6, зачарованное яблоко и золото.",
        whitebeard: "Любой плащ адмирала в центре, сердце моря сверху, звезда Незера снизу, железные блоки по бокам.",
      }[rk];
    }
    drawR(); onAdv.push(drawR);
  })();

  /* ================= 07 РЕМОНТ ================= */
  const REP = { akainu: [["magma_cream", "Сгусток магмы", 0.15], ["fire_charge", "Огненный заряд", 0.28], ["lava_bucket", "Ведро лавы", 0.48], ["magma_block", "Магма-блок", 0.7]],
    aokiji: [["snowball", "Снежок", 0.1], ["ice", "Лёд", 0.2], ["packed_ice", "Плотный лёд", 0.35], ["blue_ice", "Синий лёд", 0.5], ["diamond", "Алмаз", 0.75]],
    kizaru: [["amethyst_shard", "Осколок аметиста", 0.2], ["glowstone_dust", "Светопыль", 0.42], ["glowstone", "Светокамень", 0.7]],
    sengoku: [["gold_ingot", "Золотой слиток", 0.55]], whitebeard: [["iron_ingot", "Железный слиток", 0.32], ["heart_of_the_sea", "Сердце моря", 0.8]], crocodile: [] };
  (function anvil() {
    const st = { dmg: {}, mat: null, lvl: 0 };
    IDS.forEach((k) => (st.dmg[k] = Math.round(CL[k].dura * 0.7)));
    const ui = $("#anvUi");
    const dur = (k) => CL[k].dura - st.dmg[k];
    const bar = (k, d) => { const f = d / CL[k].dura; return `<i style="--du:hsl(${Math.round(f * 120)},100%,50%)"><b style="width:${f * 100}%"></b></i>`; };
    function draw() {
      const k = cur, m = st.mat, max = CL[k].dura;
      const rep = m ? Math.max(1, Math.round(max * m[2])) : 0, nd = m ? Math.min(max, dur(k) + rep) : 0, can = m && st.dmg[k] > 0;
      ui.innerHTML = `<div class="at">Ремонт и наименование</div><div class="nm">${esc(CL[k].full)}</div>
        <div class="ar"><span class="sl" title="${esc(CL[k].full)}"><img src="${I("cloak_" + k)}" alt="">${bar(k, dur(k))}</span><span class="pl">+</span>
        <span class="sl">${m ? `<img src="${I(m[0])}" alt="${esc(m[1])}">` : ""}</span>
        <svg viewBox="0 0 22 15" aria-hidden="true"><path d="M0 5h12V0l10 7.5L12 15v-5H0z" fill="${can ? "#fff" : "#8b8b8b"}" stroke="#373737"/></svg>
        <button type="button" class="sl" id="anvRes" aria-label="Забрать">${can ? `<img src="${I("cloak_" + k)}" alt="">${bar(k, nd)}` : ""}</button></div>
        <div class="cost">${can ? "Стоимость: 1" : k === "crocodile" ? "Чинить Крокодайла нечем" : st.dmg[k] <= 0 ? "Плащ целый" : "Положи материал"}</div>`;
      $("#anvMats").innerHTML = REP[k].length ? REP[k].map((r) => `<button type="button" data-k="${r[0]}"><img src="${I(r[0])}" alt="">${esc(r[1])} <b>+${Math.round(r[2] * 100)}%</b></button>`).join("") : `<span class="lg-small">У Крокодайла особого ремонта нет. Плащ не чинится материалом, остаётся только объединять два плаща на наковальне по ванильным правилам.</span>`;
      $("#anvNote").innerHTML = `Прочность: <b>${dur(k)}/${max}</b>. Потрачено уровней: <b>${st.lvl}</b>. <button type="button" class="btn-ghost" id="anvHurt" style="margin-left:6px">потрепать плащ</button>`;
      const res = $("#anvRes"); if (res) res.onclick = () => { if (!can) return; st.dmg[k] = max - nd; st.lvl++; snd("anvil", 0.6); st.mat = null; draw(); };
      $("#anvHurt").onclick = () => { st.dmg[k] = Math.min(max - 1, st.dmg[k] + Math.round(max * 0.3)); snd("break", 0.5); draw(); };
    }
    $("#anvMats").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; st.mat = REP[cur].find((r) => r[0] === b.dataset.k); snd("click", 0.4); draw(); });
    onCloak.push(() => { st.mat = null; draw(); });
    draw();
  })();

  /* ================= 08 ТОНКОСТИ ================= */
  const NOTES = [
    ["Заряд живёт в игроке", "Плащ сам ничего не хранит. В подсказке «Заряд: N» — твой общий заряд, урезанный до потолка этого плаща. Сменил плащ — число в подсказках поменялось у всех сразу."],
    ["Переодевание режет заряд", "Надел плащ с меньшим потолком — лишнее срезается сразу и навсегда. С Сэнгоку на 3 000 в Крокодайла — 500, и обратно уже 500.", 1],
    ["Полный только первый", "Полным приходит только самый первый плащ в жизни игрока. Следующие плащи заряд не добавляют: он общий и продолжает копиться с того, что есть."],
    ["Восстановление без потолка", "Ступенька +2 ед/с каждые 5 секунд без трат и никакого предела. Через минуту без трат — 24 в секунду, через пять минут — 120."],
    ["Рюкзак тоже копит", "Плащ, просто лежащий в инвентаре, копит заряд на четверть скорости, а потолок берётся у самого ёмкого плаща из инвентаря."],
    ["Базовая регенерация — для вида", "У каждого типа записано своё «базовое восстановление» 4, 7 и 10 в секунду, но формула его не читает. Все шесть плащей восстанавливаются одинаково.", 1],
    ["Взрыв за копейку", "Логия при взрыве отдаёт сколько есть, до цены взрыва, — и урон падает до 10% даже если оставалась одна единица заряда.", 1],
    ["Абсолют гасит всё", "Сэнгоку и Белоус тратят заряд на любой урон: падение, лаву, огонь, утопление, голод, яд. Лава просит заряд каждый тик, так что бак тает за секунды."],
    ["Хаки по имени", "Мимо заряда бьют катана и любое оружие, в чьём id есть слово «netherite», — даже из чужих модов. Проверяется рука атакующего."],
    ["Звуковой удар хранителя", "У звукового удара хранителя есть живой атакующий, поэтому логия пропускает его сквозь себя, как обычный удар."],
    ["Логия гасит скорость", "Когда удар проходит сквозь тело, горизонтальная скорость падает до 15%. Отбрасывания нет, но и разбег тоже пропадает."],
    ["Отражённая стрела — твоя", "Сэнгоку не просто разворачивает снаряд: владельцем становится он сам. Убийство отражённой стрелой засчитывается игроку."],
    ["Сэнгоку не сдвинуть", "Пока заряд больше нуля, отбрасывание отменяется полностью — и от ударов, и от взрывов."],
    ["Сердца Белоуса временные", "+8 к максимуму здоровья висят, пока плащ надет. Сняли — сердца пропали, и здоровье выше нового максимума срезается."],
    ["В ярости не берёт даже бездна", "10 секунд последнего рубежа отменяют любой урон, включая падение в пустоту. Сама бездна рубеж не запускает.", 1],
    ["Лучом по стене", "Рывок Кизару ломает блоки на уровне ног и головы с дропом, как будто их сломал игрок. Обсидиан, бедрок, барьер и командные блоки обрывают луч."],
    ["Кизару только в смерть", "Рывок срабатывает, только если падение смертельное с учётом сена, кровати и мёда. Если перезарядка не кончилась — умираешь."],
    ["Лёд вместо воды в блоках", "Ледниковый период ищет воду в блоке, а не блок воды. Водоросли, ламинарии и затопленные ступеньки в радиусе 10 тоже становятся льдом.", 1],
    ["Пузырь Аокидзи", "Плащ надет под водой — ноги и голова получают воздух, всё вокруг замерзает. Получается ледяная капсула ровно на одного игрока."],
    ["Вода топит всех", "Тянет на дно любой плащ, даже абсолютный: −0.08 скорости за тик, до 0.35 блока вниз. Логия ещё и сразу теряет воздух."],
    ["Стойка — второй бак", "У стойки своя батарея: она копирует твой заряд и копит вдвое быстрее. Снял плащ — заряд стал большим из двух. Можно зарядить плащ на стойке, пока ходишь в другом."],
    ["Крокодайл не чинится", "У песка нет ремонтного материала. Остальные плащи чинятся своей стихией, и всегда за 1 уровень опыта, сколько бы раз ни чинили."],
    ["Коллекцию помнят", "Игра запоминает каждый плащ, который хоть раз побывал у тебя в руках. «ВАН ПИС ФАГ» не требует держать все шесть одновременно, а Крокодайла можно смело пускать в крафт."],
    ["Крокодайл ищется заново", "Пул с плащом добавлен к сундукам пустынных храмов: 35% на сундук, в храме их четыре. В каждом новом храме шанс свой."],
  ];
  $("#notesBox").innerHTML = NOTES.map(([h, p, r]) => `<div class="lg-note ${r ? "r" : ""}"><h4>${esc(h)}</h4><p>${esc(p)}</p></div>`).join("");

  /* ================= 09–10 ================= */
  adv = K.adv({
    list: ZM.P25.advancements, store: "p25.adv", icon: (a) => I(a.icon), chatSel: "#log", intro: "Семь скрытых: найти Крокодайла, сшить пятерых и собрать коллекцию.",
    onGrant: (a) => {
      onAdv.forEach((f) => f());
      if (a.key !== "all_cloaks" && IDS.every((k) => adv.has(k))) setTimeout(() => grant("all_cloaks"), 900);
    },
  });
  onAdv.forEach((f) => f());
  K.timeline($("#tl"), [
    { date: "04.08.2026", ver: "1.1.3", t: "Плащи из One Piece", d: "Шесть плащей, механика Логии и абсолютной защиты, общий заряд, силы каждого плаща и ремонт на наковальне.", c: "#ff8800" },
    { date: "04.08.2026", ver: "1.1.3", t: "Мелкие исправления", d: "Поправлен рецепт Закалённого Эндер-стекла.", c: "#77D9FF" },
  ]);
  K.finNav(25, $("#finNav"));
  setCloak(cur, true);
  ZM.reveal();
})();
