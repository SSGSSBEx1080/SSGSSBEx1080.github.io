/* =====================================================================
   №12 · Катана
   По коду мода: KatanaItem (комбо без повторов, ПКМ парирование, Shift+ПКМ ульта ≥20 тиков, 67 прочности),
   KatanaParryHandler (что парируется, ответный урон, ачивки), VerticalSlashEntity (дуга, ломание, дроп),
   KatanaHUD (текст справа снизу + полоска 100×4). Модель и анимации GeckoLib: data/p12_geo.js.
   Весь фон и сцены рисуются кодом, из картинок только текстуры мода и ванилы.
   ===================================================================== */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = ZM.esc, U = ZM.url, S = ZM.store, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (n) => Math.floor(Math.random() * n), pick = (a) => a[rnd(a.length)], rr = (a, b) => a + Math.random() * (b - a);
  const P = ZM.P12, G = ZM.P12G;
  const T = (n) => U(`assets/textures/p12/${n}.png`);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MC = { 7: "#aaaaaa", a: "#55ff55", b: "#55ffff", c: "#ff5555", e: "#ffff55", f: "#ffffff" };
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };
  const me = () => (ZM.profile ? ZM.profile.me() : { nick: "Игрок", avatar: "steve" });
  const IMG = {}; const img = (n) => { if (!IMG[n]) { IMG[n] = new Image(); IMG[n].src = T(n); } return IMG[n]; };

  ZM.topbar({ crumb: "№12 · Катана", ...ZM.pointNav(12) });

  /* ================= звук ================= */
  const MASTER = 0.5;
  let sndOn = S.get("p12.snd", true);
  const pool = {};
  function play(name, vol = 1, rate = 1) {
    if (!sndOn) return;
    const url = U(`assets/sounds/p12/${name}.ogg`);
    try { const a = (pool[url] || (pool[url] = new Audio(url))).cloneNode(); a.volume = clamp(vol * MASTER, 0, 1); a.playbackRate = rate; a.preservesPitch = false; a.play().catch(() => {}); return a; } catch (e) { return null; }
  }
  const slashSnd = () => play(pick(["k_slash_1", "k_slash_2", "k_slash_3"]), 0.8);
  const parrySnd = () => play(pick(["k_parry_1", "k_parry_2", "k_parry_3"]), 0.9);
  const bSnd = $("#sndBtn");
  const syncSnd = () => { bSnd.setAttribute("aria-pressed", sndOn); bSnd.classList.toggle("on", sndOn); };
  bSnd.onclick = () => { sndOn = !sndOn; S.set("p12.snd", sndOn); syncSnd(); if (sndOn) play("click", 0.6); };
  ZM.sfx.bind(() => sndOn);

  /* ---------- «звон стали»: процедурно (WebAudio), к ванильным свипам и звукам мода ---------- */
  let AC = null;
  const ac = () => { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (AC.state === "suspended") AC.resume(); return AC; };
  let noiseBuf = null;
  function whoosh(vol = 0.5, dur = 0.2, f0 = 500, f1 = 3200) {   // рассечённый воздух
    if (!sndOn) return; const a = ac(); if (!a) return;
    if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate * 0.6, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = a.createBufferSource(), bp = a.createBiquadFilter(), gn = a.createGain(), t = a.currentTime;
    s.buffer = noiseBuf; bp.type = "bandpass"; bp.Q.value = 2.2; bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7);
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(vol * MASTER, t + dur * 0.35); gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(bp).connect(gn).connect(a.destination); s.start(t); s.stop(t + dur + 0.05);
  }
  function shing(vol = 0.3, base = 2900) {                          // звон клинка
    if (!sndOn) return; const a = ac(); if (!a) return; const t = a.currentTime;
    [[base, 1], [base * 1.51, 0.6], [base * 2.37, 0.35]].forEach(([f, k]) => {
      const o = a.createOscillator(), gn = a.createGain(); o.type = "sine"; o.frequency.setValueAtTime(f * 1.02, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.1);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol * k * 0.35 * MASTER, t + 0.006); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.55 * k + 0.15);
      o.connect(gn).connect(a.destination); o.start(t); o.stop(t + 0.8);
    });
  }

  /* ---------- графика «острого»: осколок-разрез, серп, искры-штрихи, тряска ---------- */
  // тонкий изогнутый «осколок» от p0 к p1: острый на концах, как след лезвия
  function sliver(g, x0, y0, x1, y1, w, col, a, bend = 0.9) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const mx = x0 + dx * 0.42, my = y0 + dy * 0.42;
    const path = (ww) => { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx + nx * ww * 2 * bend + nx * ww, my + ny * ww * 2 * bend + ny * ww, x1, y1); g.quadraticCurveTo(mx + nx * ww * 2 * bend - nx * ww * 0.6, my + ny * ww * 2 * bend - ny * ww * 0.6, x0, y0); g.fill(); };
    g.save(); g.globalCompositeOperation = "lighter";
    g.shadowColor = `rgba(${col},${a})`; g.shadowBlur = w * 3;
    g.fillStyle = `rgba(${col},${a * 0.45})`; path(w * 1.9);
    g.fillStyle = `rgba(${col},${a})`; path(w);
    g.shadowBlur = 0; g.fillStyle = `rgba(255,255,255,${a})`; path(w * 0.42);
    g.restore();
  }
  // серп: внешняя дуга радиуса r, толщина к середине th, к концам ноль
  function crescent(g, cx, cy, r, a0, a1, th, col, a) {
    const N = 26, o = [], i2 = [];
    for (let i = 0; i <= N; i++) { const k = i / N, an = a0 + (a1 - a0) * k, tw = Math.pow(Math.sin(Math.PI * k), 0.8) * th * (0.45 + 0.55 * k); o.push([cx + Math.cos(an) * r, cy + Math.sin(an) * r]); i2.push([cx + Math.cos(an) * (r - tw), cy + Math.sin(an) * (r - tw)]); }
    const poly = (sc) => { g.beginPath(); o.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); for (let i = N; i >= 0; i--) { const p = i2[i], q = o[i]; g.lineTo(q[0] + (p[0] - q[0]) * sc, q[1] + (p[1] - q[1]) * sc); } g.closePath(); g.fill(); };
    g.save(); g.globalCompositeOperation = "lighter"; g.shadowColor = `rgba(${col},${a})`; g.shadowBlur = th * 1.4;
    g.fillStyle = `rgba(${col},${a * 0.55})`; poly(1); g.shadowBlur = 0; g.fillStyle = `rgba(255,255,255,${a * 0.95})`; poly(0.35); g.restore();
  }
  // искры-штрихи: рисуются линией вдоль скорости
  function sparkBurst(arr, x, y, n, spd, col, dirA = null, spread = Math.PI * 2) {
    for (let i = 0; i < n; i++) { const an = dirA === null ? Math.random() * 6.283 : dirA + (Math.random() - 0.5) * spread, v = spd * rr(0.35, 1); arr.push({ x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, t: rr(0.18, 0.42), t0: 0.42, col }); }
  }
  function sparkDraw(g, arr, dt, grav = 0) {
    g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    for (const s of arr) {
      s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 1 - 3 * dt; s.vy = s.vy * (1 - 3 * dt) + grav * dt;
      const a = clamp(s.t / 0.25, 0, 1); g.strokeStyle = `rgba(${s.col},${a})`; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x - s.vx * 0.035, s.y - s.vy * 0.035); g.stroke();
    }
    g.restore();
    for (let i = arr.length - 1; i >= 0; i--) if (arr[i].t <= 0) arr.splice(i, 1);
  }
  function shake(el, p = 6, ms = 220) {
    if (reduce) return;
    const k = []; for (let i = 0; i < 7; i++) { const f = 1 - i / 7; k.push({ transform: `translate(${(Math.random() - 0.5) * 2 * p * f}px,${(Math.random() - 0.5) * 2 * p * f}px)` }); } k.push({ transform: "none" });
    el.animate(k, { duration: ms });
  }
  // слой эффектов поверх сцены (в CSS-пикселях)
  function mkFX(cv) {
    const g = cv.getContext("2d"), cuts = [], sp = []; let flash = 0, flashCol = "255,255,255";
    return {
      cut(x0, y0, x1, y1, o = {}) { cuts.push({ x0, y0, x1, y1, w: o.w || 5, col: o.col || "224,49,75", life: o.life || 0.42, age: -(o.delay || 0), grow: o.grow || 0.07, bend: o.bend ?? 0.9 }); if (o.sparks !== false) { const n = o.sparks || 14, an = Math.atan2(y1 - y0, x1 - x0); cuts[cuts.length - 1].sp = { n, an }; } },
      sparks(x, y, n, spd, col, a, s) { sparkBurst(sp, x, y, n, spd, col, a, s); },
      flash(a = 0.6, col = "255,255,255") { flash = a; flashCol = col; },
      tick(dt) {
        const d = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight; if (!w) return;
        if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
        g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, w, h);
        if (flash > 0) { g.fillStyle = `rgba(${flashCol},${flash})`; g.fillRect(0, 0, w, h); flash = Math.max(0, flash - dt * 3.5); }
        for (let i = cuts.length - 1; i >= 0; i--) {
          const c = cuts[i]; c.age += dt; if (c.age < 0) continue;
          if (c.sp && c.age >= c.grow * 0.6) { const { n, an } = c.sp; c.sp = null; for (let k = 0; k < n; k++) { const t = Math.random(); sparkBurst(sp, c.x0 + (c.x1 - c.x0) * t, c.y0 + (c.y1 - c.y0) * t, 1, rr(200, 520), pick(["255,255,255", c.col, "255,220,200"]), an + (Math.random() < 0.5 ? 0 : Math.PI) + rr(-0.5, 0.5), 0.4); } }
          const gp = clamp(c.age / c.grow, 0, 1), fade = c.age < c.grow ? 1 : Math.pow(1 - clamp((c.age - c.grow) / (c.life - c.grow), 0, 1), 0.7);
          if (fade <= 0) { cuts.splice(i, 1); continue; }
          const e = 1 - Math.pow(1 - gp, 3), hx = c.x0 + (c.x1 - c.x0) * e, hy = c.y0 + (c.y1 - c.y0) * e;
          const tx = c.age < c.grow ? c.x0 : c.x0 + (c.x1 - c.x0) * (1 - fade) * 0.35, ty = c.age < c.grow ? c.y0 : c.y0 + (c.y1 - c.y0) * (1 - fade) * 0.35;
          sliver(g, tx, ty, hx, hy, c.w * (0.35 + 0.65 * fade), c.col, Math.min(1, fade * 1.2), c.bend);
        }
        sparkDraw(g, sp, dt, 300);
      },
      get busy() { return cuts.length || sp.length || flash > 0; },
    };
  }

  function chat(html, life = 6500) {
    const el = $("#chat"), p = document.createElement("p"); p.innerHTML = html; el.appendChild(p);
    while (el.children.length > 5) el.firstChild.remove();
    setTimeout(() => p.classList.add("old"), life); setTimeout(() => p.remove(), life + 1200);
  }

  /* ================= ачивки ================= */
  const ADV = P.advancements;
  let got = S.get("p12.adv", []).filter((k) => ADV.some((a) => a.key === k));
  let advSel = null, renderTree = () => {};
  const titleH = (a) => `<span style="color:${MC[a.color]};${a.bold ? "font-weight:700" : ""}">${esc(a.title)}</span>`;
  const advIcon = (a) => T(a.icon);
  function grant(key) {
    const a = ADV.find((x) => x.key === key);
    if (!a || got.includes(key)) return;
    got.push(key); S.set("p12.adv", got);
    ZM.toast({ iconHtml: `<img src="${advIcon(a)}" alt="" style="width:100%;height:100%;object-fit:contain;image-rendering:${a.icon === "katana_icon" ? "auto" : "pixelated"}">`, title: titleH(a), frame: a.frame });
    const kind = a.frame === "challenge" ? "выполнил испытание" : "получил достижение";
    chat(`${esc(me().nick)} ${kind} <span style="color:${a.frame === "challenge" ? "#aa00aa" : "#55ff55"}">[${esc(a.title)}]</span>`);
    advSel = key; renderTree(key);
  }

  /* ================= прочность: −67 за каждую ульту ================= */
  let durN = 0;
  function durSpend(host) {
    durN++; const n = $("#durN"), sm = $("#durSum"); if (n) { n.textContent = durN; sm.textContent = durN * P.ult.cost; }
    const big = $(".dur-big"); if (big) { big.classList.remove("hit"); void big.offsetWidth; big.classList.add("hit"); }
  }

  /* ================= общий КД ульты и HUD (KatanaHUD) ================= */
  const CD_MS = 10000;   // на странице ульта перезаряжается 10 с
  let ultReadyAt = 0;
  const ultReady = () => performance.now() >= ultReadyAt;
  function hudHtml() {
    if (ultReady()) return `<span style="color:#55ff55">✓ Ultimate Ready</span>`;
    const rem = ultReadyAt - performance.now(), s = Math.ceil(rem / 1000), p = 1 - rem / CD_MS;
    return `<span style="color:#ff5555">Ultimate: ${s}s</span><i><b style="width:${(p * 100).toFixed(1)}%"></b></i>`;
  }
  const huds = ["#heroHud", "#stHud", "#ulHud"].map((s) => $(s));
  function hudRender() { const h = hudHtml(); if (h !== hudRender.h) { hudRender.h = h; huds.forEach((e) => (e.innerHTML = h)); } }

  /* ================= фон: ночь самурая (всё процедурно, без картинок) =================
     слои: небо и звёзды → луна с кратерами → облака → Фудзи и дальние хребты → туман → холм с пагодой →
     туман → утёс с сосной и самураем → бамбук и трава (качаются) → лепестки сакуры → далёкие разрезы по небу */
  const bg = $("#bg"), bgc = bg.getContext("2d");
  let bgW = 0, bgH = 0, BGL = null, bgD = 1;
  const SIL = "#050308";
  // 1D-шум: сумма октав синусов со случайными фазами (детерминированно от seed)
  const ridge = (seed) => { const ph = Array.from({ length: 6 }, (_, i) => ((seed * 9301 + i * 49297) % 233280) / 233280 * 6.283); return (t) => { let v = 0, a = 1, f = 1, n = 0; for (let i = 0; i < 6; i++) { v += Math.sin(t * f * 6.283 + ph[i]) * a; n += a; a *= 0.52; f *= 2.13; } return v / n; }; };
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  function bgBuild() {
    bgD = Math.min(1.5, devicePixelRatio || 1);
    bgW = bg.width = Math.round(innerWidth * bgD); bgH = bg.height = Math.round(innerHeight * bgD);
    const W = bgW, H = bgH, U = Math.min(W, H) / 900, EXT = Math.round(H * 0.25);   // EXT: запас снизу под параллакс
    // --- небо ---
    const sky = mk(W, H), s = sky.getContext("2d");
    const gr = s.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#06040b"); gr.addColorStop(0.45, "#150c22"); gr.addColorStop(0.72, "#3b1628"); gr.addColorStop(1, "#1a0d18");
    s.fillStyle = gr; s.fillRect(0, 0, W, H);
    for (let i = 0; i < 420; i++) { const x = Math.random() * W, y = Math.pow(Math.random(), 1.6) * H * 0.6, r = Math.random() < 0.06 ? 1.3 * U + 0.6 : 0.6 * U + 0.3; s.globalAlpha = rr(0.15, 0.8) * (1 - y / (H * 0.65)); s.fillStyle = Math.random() < 0.15 ? "#ffd6dc" : "#e8e4ff"; s.beginPath(); s.arc(x, y, r, 0, 7); s.fill(); }
    s.globalAlpha = 1;
    // --- луна: диск, моря и кратеры мягкими пятнами, зерно ---
    const MR = Math.round(Math.min(W, H) * 0.19), moon = mk(MR * 2 + 4, MR * 2 + 4), m = moon.getContext("2d"), c0 = MR + 2;
    const mg = m.createRadialGradient(c0 - MR * 0.25, c0 - MR * 0.3, MR * 0.05, c0, c0, MR); mg.addColorStop(0, "#fff4ef"); mg.addColorStop(0.55, "#f6d5d2"); mg.addColorStop(0.9, "#e2a3a6"); mg.addColorStop(1, "#c77f86");
    m.fillStyle = mg; m.beginPath(); m.arc(c0, c0, MR, 0, 7); m.fill();
    m.save(); m.beginPath(); m.arc(c0, c0, MR, 0, 7); m.clip();
    [[-0.28, -0.18, 0.42, 0.16], [0.22, 0.12, 0.34, 0.14], [0.05, 0.45, 0.22, 0.12], [-0.4, 0.3, 0.2, 0.1], [0.38, -0.38, 0.18, 0.08]].forEach(([x, y, r, a]) => { const g2 = m.createRadialGradient(c0 + x * MR, c0 + y * MR, 0, c0 + x * MR, c0 + y * MR, r * MR); g2.addColorStop(0, `rgba(150,70,90,${a})`); g2.addColorStop(1, "rgba(150,70,90,0)"); m.fillStyle = g2; m.fillRect(0, 0, MR * 2 + 4, MR * 2 + 4); });
    for (let i = 0; i < 38; i++) { const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * MR * 0.92, x = c0 + Math.cos(a) * d, y = c0 + Math.sin(a) * d, r = Math.pow(Math.random(), 3) * MR * 0.07 + MR * 0.006;
      const cg = m.createRadialGradient(x + r * 0.2, y + r * 0.2, 0, x, y, r); cg.addColorStop(0, "rgba(150,70,90,.16)"); cg.addColorStop(0.8, "rgba(150,70,90,.1)"); cg.addColorStop(1, "rgba(255,240,240,.08)"); m.fillStyle = cg; m.beginPath(); m.arc(x, y, r, 0, 7); m.fill(); }
    const id = m.getImageData(0, 0, moon.width, moon.height), dd = id.data; for (let i = 0; i < dd.length; i += 4) { const n = (Math.random() - 0.5) * 14; dd[i] += n; dd[i + 1] += n; dd[i + 2] += n; } m.putImageData(id, 0, 0);
    const limb = m.createRadialGradient(c0, c0, MR * 0.6, c0, c0, MR); limb.addColorStop(0, "rgba(90,20,40,0)"); limb.addColorStop(1, "rgba(90,20,40,.35)"); m.fillStyle = limb; m.fillRect(0, 0, MR * 2 + 4, MR * 2 + 4);
    m.restore();
    // --- облака: мягкие вытянутые комки ---
    const clouds = [];
    for (let k = 0; k < 5; k++) {
      const cw = Math.round(W * rr(0.35, 0.6)), ch = Math.round(cw * 0.3), cc = mk(cw, ch), q = cc.getContext("2d");
      for (let i = 0; i < 26; i++) { const t = rr(0.05, 0.95), x = t * cw, y = ch * (0.5 + rr(-0.2, 0.2)), r = rr(0.12, 0.35) * cw * Math.sin(t * Math.PI);   // вытянутые перистые пряди
        q.save(); q.translate(x, y); q.scale(1, rr(0.12, 0.26)); const g3 = q.createRadialGradient(0, 0, 0, 0, 0, r); g3.addColorStop(0, "rgba(34,10,30,.22)"); g3.addColorStop(1, "rgba(34,10,30,0)"); q.fillStyle = g3; q.beginPath(); q.arc(0, 0, r, 0, 7); q.fill(); q.restore(); }
      clouds.push({ c: cc, x: Math.random() * W, y: rr(0.08, 0.42) * H, v: rr(4, 12) * U, a: rr(0.6, 1) });
    }
    // --- горный слой: хребет + градиент в туман ---
    const range = (seed, base, amp, col, fog, opt = {}) => {
      const c = mk(W, H + EXT), q = c.getContext("2d"), f = ridge(seed), pts = [];
      for (let x = 0; x <= W; x += 3) { const t = x / W; let y = base - (f(t * (opt.freq || 1.3)) * 0.5 + 0.5) * amp; if (opt.fuji) { const d = Math.abs(t - opt.fuji) / 0.23; if (d < 1) y = Math.min(y, base - amp * 1.9 * (1 - Math.pow(d, 1.35)) - amp * 0.2); } pts.push([x, y * H]); }
      const top = Math.min(...pts.map((p) => p[1]));
      const g4 = q.createLinearGradient(0, top, 0, base * H + EXT * 0.3); g4.addColorStop(0, col); g4.addColorStop(1, fog);
      q.fillStyle = g4; q.beginPath(); q.moveTo(0, H + EXT); pts.forEach((p) => q.lineTo(p[0], p[1])); q.lineTo(W, H + EXT); q.closePath(); q.fill();
      if (opt.fuji) {   // снежная шапка, подсвеченная луной
        q.save(); q.clip(); const fx = opt.fuji * W, fy = Math.min(...pts.slice(Math.round((opt.fuji - 0.05) * W / 3), Math.round((opt.fuji + 0.05) * W / 3)).map((p) => p[1])), capH = H * 0.07;
        const sg = q.createLinearGradient(0, fy, 0, fy + capH * 1.3); sg.addColorStop(0, "rgba(245,222,232,.85)"); sg.addColorStop(1, "rgba(220,180,200,.25)");
        q.fillStyle = sg; q.beginPath(); q.moveTo(fx - W * 0.2, fy - 20);
        for (let i = 0; i <= 16; i++) { const x = fx - W * 0.1 + i * W * 0.0125, y = fy + capH * (0.75 + (i % 2 ? 0.35 : -0.05) * (1 - Math.abs(i - 8) / 10)) + Math.abs(i - 8) * capH * 0.02; q.lineTo(x, y); }
        q.lineTo(fx + W * 0.2, fy - 20); q.closePath(); q.fill();
        const shade = q.createLinearGradient(fx - W * 0.1, 0, fx + W * 0.1, 0); shade.addColorStop(0, "rgba(40,20,50,0)"); shade.addColorStop(0.5, "rgba(40,20,50,0)"); shade.addColorStop(1, "rgba(40,20,50,.35)"); q.fillStyle = shade; q.fillRect(fx - W * 0.2, fy - 20, W * 0.4, H * 0.3);
        q.restore();
      }
      if (opt.rim) { q.strokeStyle = opt.rim; q.lineWidth = 1.2 * U + 0.5; q.beginPath(); pts.forEach((p, i) => (i ? q.lineTo(p[0], p[1]) : q.moveTo(p[0], p[1]))); q.stroke(); }
      return { c, pts };
    };
    const far = range(7, 0.62, 0.1, "#3a2442", "#4a2a44", { fuji: 0.3, freq: 1.1, rim: "rgba(255,190,200,.12)" });
    const mid = range(19, 0.7, 0.12, "#22152e", "#3a2038", { freq: 1.7, rim: "rgba(255,170,190,.08)" });
    // холм с пагодой и кипарисами
    const hill = range(31, 0.8, 0.09, "#130b1c", "#2a1628", { freq: 1.2 });
    { const q = hill.c.getContext("2d"), px = W * 0.66, pi = Math.round(px / 3), py = hill.pts[pi][1] + 2, S2 = U * 1.25; q.fillStyle = "#0e0816";
      // пагода: 5 ярусов, крыши с загнутыми краями
      let y = py; for (let i = 0; i < 5; i++) { const bw = (30 - i * 4) * S2, rw = (52 - i * 7) * S2, bh = (15 - i) * S2;
        q.fillRect(px - bw / 2, y - bh, bw, bh + 1); y -= bh;
        q.beginPath(); q.moveTo(px - rw / 2 - 5 * S2, y - 6 * S2); q.quadraticCurveTo(px - rw / 4, y + 1 * S2, px - bw / 2, y - 5 * S2); q.lineTo(px, y - 13 * S2); q.lineTo(px + bw / 2, y - 5 * S2); q.quadraticCurveTo(px + rw / 4, y + 1 * S2, px + rw / 2 + 5 * S2, y - 6 * S2); q.lineTo(px + rw / 2, y + 1 * S2); q.lineTo(px - rw / 2, y + 1 * S2); q.closePath(); q.fill(); y -= 8 * S2; }
      q.fillRect(px - 1.2 * S2, y - 34 * S2, 2.4 * S2, 34 * S2); for (let i = 0; i < 6; i++) { q.beginPath(); q.ellipse(px, y - 6 * S2 - i * 4.5 * S2, 4 * S2, 1.2 * S2, 0, 0, 7); q.fill(); }
      // окно-фонарь
      q.fillStyle = "rgba(255,150,90,.55)"; q.fillRect(px - 3 * S2, py - 11 * S2, 6 * S2, 6 * S2);
      q.fillStyle = "#0e0816";
      for (let k = 0; k < 9; k++) { const tx = px + (k - 4) * 26 * S2 + rr(-8, 8), ti = clamp(Math.round(tx / 3), 0, hill.pts.length - 1), ty = hill.pts[ti][1] + 3, th = rr(28, 50) * S2; if (Math.abs(tx - px) < 30 * S2) continue; q.beginPath(); q.moveTo(tx, ty - th); q.quadraticCurveTo(tx + th * 0.22, ty - th * 0.4, tx + th * 0.13, ty); q.lineTo(tx - th * 0.13, ty); q.quadraticCurveTo(tx - th * 0.22, ty - th * 0.4, tx, ty - th); q.fill(); }
      // тории у подножия
      const gx = W * 0.84, gi = clamp(Math.round(gx / 3), 0, hill.pts.length - 1), gy = hill.pts[gi][1] + 6, T2 = U * 1.4; q.fillStyle = "#1a0a14";
      q.fillRect(gx - 17 * T2, gy - 40 * T2, 3.2 * T2, 40 * T2); q.fillRect(gx + 14 * T2, gy - 40 * T2, 3.2 * T2, 40 * T2); q.fillRect(gx - 16 * T2, gy - 33 * T2, 32 * T2, 2.6 * T2);
      q.beginPath(); q.moveTo(gx - 26 * T2, gy - 44 * T2); q.quadraticCurveTo(gx, gy - 39 * T2, gx + 26 * T2, gy - 44 * T2); q.lineTo(gx + 24 * T2, gy - 40 * T2); q.quadraticCurveTo(gx, gy - 36 * T2, gx - 24 * T2, gy - 40 * T2); q.closePath(); q.fill();
    }
    // --- утёс слева с сосной и самураем ---
    const cliff = mk(W, H + EXT), q = cliff.getContext("2d");
    const cw2 = W < 700 ? W * 0.62 : W * 0.58, cy = H * (W < 700 ? 0.84 : 0.9), cf = ridge(53);
    q.fillStyle = SIL; q.beginPath(); q.moveTo(0, H + EXT); q.lineTo(0, cy - H * 0.06);
    for (let x = 0; x <= cw2; x += 4) { const t = x / cw2; q.lineTo(x, cy - H * 0.06 * (1 - t) + cf(t * 2) * H * 0.012 + Math.pow(t, 6) * H * 0.02); }
    q.lineTo(cw2 + W * 0.02, cy + H * 0.05); q.quadraticCurveTo(cw2 - W * 0.02, cy + H * 0.18, cw2 + W * 0.05, H + EXT); q.closePath(); q.fill();
    // сосна: изогнутый ствол, ветви с «подушками» хвои
    const pine = (x, y, len, ang, depth, wdt) => {
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      q.strokeStyle = SIL; q.lineWidth = wdt; q.lineCap = "round"; q.beginPath(); q.moveTo(x, y); q.quadraticCurveTo(x + Math.cos(ang + 0.4) * len * 0.5, y + Math.sin(ang + 0.4) * len * 0.5, x2, y2); q.stroke();
      if (depth <= 0) { q.fillStyle = SIL; for (let i = 0; i < 7; i++) { q.beginPath(); q.ellipse(x2 + rr(-1, 1) * len * 0.6, y2 + rr(-0.25, 0.1) * len * 0.4, len * rr(0.35, 0.7), len * rr(0.12, 0.2), rr(-0.1, 0.1), 0, 7); q.fill(); } return; }
      const n = depth > 2 ? 2 : 3; for (let i = 0; i < n; i++) pine(x2, y2, len * rr(0.55, 0.8), ang + rr(-0.7, 0.7) + (i - (n - 1) / 2) * 0.5, depth - 1, wdt * 0.62);
    };
    const tx = cw2 * 0.28, ty = cy - H * 0.06 * 0.72;
    pine(tx, ty, H * 0.1, -1.2, 3, 7 * U + 2); pine(tx, ty - H * 0.05, H * 0.11, -0.25, 2, 5 * U + 1.5);
    // самурай на краю утёса, лицом к луне
    const sx = cw2 * 0.92, sy = cy - H * 0.06 * (1 - 0.92) + cf(0.92 * 2) * H * 0.012 + Math.pow(0.92, 6) * H * 0.02 + 1, sk = H * 0.0013 * (W < 700 ? 0.8 : 1);
    q.save(); q.translate(sx, sy); q.scale(sk, sk); q.fillStyle = SIL;
    const P2 = (a) => { q.beginPath(); a.forEach((p, i) => (i ? q.lineTo(p[0], p[1]) : q.moveTo(p[0], p[1]))); q.closePath(); q.fill(); };
    P2([[-10, -46], [10, -46], [18, 0], [3, 0], [0, -22], [-3, 0], [-19, 0]]);           // хакама
    P2([[-9, -73], [9, -73], [10.5, -44], [-10.5, -44]]);                                // корпус
    P2([[-20, -72], [20, -72], [14, -62], [-14, -62]]);                                   // катагину (плечи-крылья)
    P2([[11, -68], [15, -50], [12, -44], [8, -46], [9, -64]]);                            // рука у рукояти
    q.fillRect(-2.6, -79, 5.2, 7); q.beginPath(); q.arc(0.5, -84, 6.2, 0, 7); q.fill();   // шея, голова
    q.beginPath(); q.ellipse(-2, -91.5, 3.2, 2, -0.3, 0, 7); q.fill();                    // пучок
    q.lineCap = "round"; q.strokeStyle = SIL; q.lineWidth = 3; q.beginPath(); q.moveTo(-30, -35); q.lineTo(10, -51); q.stroke();   // ножны
    q.lineWidth = 3.6; q.beginPath(); q.moveTo(9, -51); q.lineTo(19, -55); q.stroke();        // рукоять
    q.lineWidth = 2.2; q.beginPath(); q.moveTo(-18, -40); q.lineTo(8, -49); q.stroke();       // вакидзаси
    q.restore();
    // --- туман: мягкая горизонтальная текстура, бесшовная по X ---
    const fog = mk(1024, 200), fq = fog.getContext("2d");
    for (let i = 0; i < 90; i++) { const x = Math.random() * 1024, y = rr(60, 150), r = rr(40, 110); for (const ox of [-1024, 0, 1024]) { const g5 = fq.createRadialGradient(x + ox, y, 0, x + ox, y, r); g5.addColorStop(0, "rgba(120,80,120,.10)"); g5.addColorStop(1, "rgba(120,80,120,0)"); fq.fillStyle = g5; fq.fillRect(0, 0, 1024, 200); } }
    // --- бамбук справа (рисуется каждый кадр, качается) ---
    const bamboo = Array.from({ length: W < 700 ? 3 : 6 }, (_, i) => ({ x: W - (i * 0.028 + rr(0, 0.012)) * W - W * 0.01, w: rr(5, 9) * U + 2, ph: Math.random() * 6.283, amp: rr(0.008, 0.018), nodes: rr(55, 80) * U, leaves: Array.from({ length: 5 }, () => ({ y: rr(0.08, 0.5), s: Math.random() < 0.5 ? -1 : 1, l: rr(26, 48) * U })) }));
    const grass = Array.from({ length: Math.round(W / (7 * bgD)) }, (_, i) => ({ x: i * 7 * bgD + rr(-3, 3), h: rr(10, 34) * U * (0.6 + 0.4 * Math.sin(i * 0.37) ** 2), ph: Math.random() * 6.283 }));
    BGL = { sky, moon, MR, clouds, far, mid, hill, cliff, fog, bamboo, grass, U, EXT };
  }
  // лепестки сакуры: форма с выемкой; при разрезе делятся на половинки
  const petals = [];
  const newPetal = (x, y) => ({ x: x ?? Math.random(), y: y ?? Math.random(), s: rr(2.8, 5.5), vx: rr(0.01, 0.035), vy: rr(0.018, 0.045), a: Math.random() * 6.28, va: rr(-2, 2), fl: Math.random() * 6.28, vf: rr(2, 4), ph: Math.random() * 6.28, c: pick(["#f7c0d4", "#f2a7c3", "#ffd5e4", "#e9b0ff"]), half: 0 });
  for (let i = 0; i < (reduce ? 0 : innerWidth < 640 ? 28 : 64); i++) petals.push(newPetal());
  function petalPath(g, s, half) {
    g.beginPath();
    if (half >= 0) { g.moveTo(0, s); g.bezierCurveTo(s * 1.1, s * 0.4, s * 0.9, -s * 0.9, s * 0.18, -s); g.lineTo(0, -s * 0.72); }
    if (half <= 0) { if (half < 0) g.moveTo(0, -s * 0.72); g.lineTo(-s * 0.18, -s); g.bezierCurveTo(-s * 0.9, -s * 0.9, -s * 1.1, s * 0.4, 0, s); }
    g.closePath(); g.fill();
  }
  const bgCuts = [], bgSparks = []; let bgNextCut = 3500;
  function bgFrame(dt, now) {
    if (!BGL) return;
    const g = bgc, w = bgW, h = bgH, L = BGL, U = L.U, sc = Math.min(scrollY, innerHeight * 4) * bgD;
    g.drawImage(L.sky, 0, 0);
    // луна: гало, диск, лёгкий параллакс
    const mx = w * (w < 700 ? 0.62 : 0.68), my = h * 0.3 - sc * 0.02;
    const halo = g.createRadialGradient(mx, my, L.MR * 0.9, mx, my, L.MR * 3.2); halo.addColorStop(0, "rgba(240,120,140,.28)"); halo.addColorStop(0.4, "rgba(200,60,90,.1)"); halo.addColorStop(1, "rgba(200,60,90,0)");
    g.fillStyle = halo; g.fillRect(0, 0, w, h);
    g.drawImage(L.moon, mx - L.MR - 2, my - L.MR - 2);
    for (const c of L.clouds) { c.x += c.v * dt * bgD; if (c.x > w + 50) c.x = -c.c.width - 50; g.globalAlpha = c.a; g.drawImage(c.c, c.x, c.y - sc * 0.03); }
    g.globalAlpha = 1;
    // далёкие разрезы по небу
    if (!reduce && now > bgNextCut) {
      bgNextCut = now + rr(5000, 9000);
      const a = rr(-0.5, 0.5) + (Math.random() < 0.5 ? 0 : Math.PI), cx = rr(0.2, 0.8) * w, cy = rr(0.12, 0.5) * h, R = rr(0.25, 0.45) * w;
      bgCuts.push({ x0: cx - Math.cos(a) * R, y0: cy - Math.sin(a) * R, x1: cx + Math.cos(a) * R, y1: cy + Math.sin(a) * R, age: 0, hit: false });
    }
    for (let i = bgCuts.length - 1; i >= 0; i--) {
      const c = bgCuts[i]; c.age += dt; const gp = Math.min(1, c.age / 0.12), fade = c.age < 0.12 ? 1 : 1 - (c.age - 0.12) / 0.7;
      if (fade <= 0) { bgCuts.splice(i, 1); continue; }
      const e = 1 - Math.pow(1 - gp, 3), hx = c.x0 + (c.x1 - c.x0) * e, hy = c.y0 + (c.y1 - c.y0) * e;
      sliver(g, c.x0 + (c.x1 - c.x0) * (1 - fade) * 0.4, c.y0 + (c.y1 - c.y0) * (1 - fade) * 0.4, hx, hy, 3.2 * U * bgD * fade + 0.5, "255,120,150", fade * 0.85, 0.5);
      if (!c.hit && gp >= 1) {   // лепестки на линии разрезаются пополам
        c.hit = true; const dx = c.x1 - c.x0, dy = c.y1 - c.y0, Ln = Math.hypot(dx, dy), nx = -dy / Ln, ny = dx / Ln;
        for (let k = petals.length - 1; k >= 0; k--) { const p = petals[k]; if (p.half) continue; const px = p.x * w, py = p.y * h, t = ((px - c.x0) * dx + (py - c.y0) * dy) / (Ln * Ln), dist = Math.abs((px - c.x0) * nx + (py - c.y0) * ny);
          if (t > 0 && t < 1 && dist < 26 * bgD) { petals.splice(k, 1); for (const sd of [-1, 1]) { const h2 = { ...p, half: sd, vx: p.vx + nx * sd * 0.03, vy: p.vy + ny * sd * 0.03, va: p.va + sd * 4, life: 2.5 }; petals.push(h2); } sparkBurst(bgSparks, px, py, 5, 180 * bgD, "255,200,220"); } }
        for (let k = 0; k < 16; k++) { const t = Math.random(); sparkBurst(bgSparks, c.x0 + dx * t, c.y0 + dy * t, 1, rr(80, 220) * bgD, "255,170,190", Math.atan2(dy, dx) + (Math.random() < 0.5 ? 0 : Math.PI), 0.5); }
      }
    }
    sparkDraw(g, bgSparks, dt, 60 * bgD);
    // горы, туман, холм
    const fogBand = (y, speed, alpha, scale = 1) => { const fw = 1024 * scale * bgD, fh = 200 * scale * bgD, off = -((now / 1000 * speed * bgD) % fw); g.globalAlpha = alpha; for (let x = off; x < w; x += fw) g.drawImage(L.fog, x, y, fw, fh); g.globalAlpha = 1; };
    g.drawImage(L.far.c, 0, -sc * 0.04);
    fogBand(h * 0.52 - sc * 0.05, 6, 0.9, 1.4);
    g.drawImage(L.mid.c, 0, -sc * 0.07);
    fogBand(h * 0.6 - sc * 0.08, 10, 0.8, 1.2);
    g.drawImage(L.hill.c, 0, -sc * 0.1);
    fogBand(h * 0.72 - sc * 0.12, 16, 0.7, 1.1);
    g.drawImage(L.cliff, 0, -sc * 0.14);
    // бамбук
    const tt = now / 1000;
    for (const b of L.bamboo) {
      const ang = Math.sin(tt * 0.8 + b.ph) * b.amp + Math.sin(tt * 2.1 + b.ph) * b.amp * 0.3, baseY = h + 20;
      g.save(); g.translate(b.x, baseY); g.rotate(ang); g.fillStyle = SIL; g.fillRect(-b.w / 2, -h * 1.2, b.w, h * 1.2);
      g.fillStyle = "#0d0a12"; for (let y = -b.nodes; y > -h * 1.2; y -= b.nodes) g.fillRect(-b.w / 2 - 1, y, b.w + 2, 2 * U + 1);
      g.fillStyle = SIL; for (const lf of b.leaves) { const ly = -h * lf.y - h * 0.4, sw2 = Math.sin(tt * 1.7 + b.ph + lf.y * 9) * 0.12; g.save(); g.translate(0, ly); g.rotate(lf.s * (0.5 + sw2)); g.beginPath(); g.ellipse(lf.s * lf.l * 0.55, 0, lf.l * 0.55, lf.l * 0.08, 0, 0, 7); g.fill(); g.restore(); }
      g.restore();
    }
    // трава на переднем плане
    g.strokeStyle = SIL; g.lineWidth = 2 * bgD; g.lineCap = "round"; g.beginPath();
    for (const gr of L.grass) { const sway = Math.sin(tt * 1.3 + gr.ph + gr.x * 0.004) * gr.h * 0.35; g.moveTo(gr.x, h + 2); g.quadraticCurveTo(gr.x + sway * 0.3, h - gr.h * 0.5, gr.x + sway, h - gr.h); }
    g.stroke();
    // лепестки
    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i];
      p.x += (p.vx + Math.sin(tt * 0.7 + p.ph) * 0.012) * dt; p.y += p.vy * dt; p.a += p.va * dt; p.fl += p.vf * dt;
      if (p.half) { p.life -= dt; if (p.life <= 0) { petals.splice(i, 1); petals.push(newPetal(Math.random(), -0.05)); continue; } }
      else if (p.y > 1.05 || p.x > 1.05) { Object.assign(p, newPetal(p.x > 1.05 ? -0.05 : Math.random(), p.x > 1.05 ? Math.random() : -0.05)); }
      const s = p.s * (w / 1400 + 0.55);
      g.save(); g.translate(p.x * w, p.y * h); g.rotate(p.a); g.scale(1, Math.abs(Math.sin(p.fl)) * 0.75 + 0.25);
      g.fillStyle = p.c; g.globalAlpha = p.half ? Math.min(1, p.life) * 0.9 : 0.9; petalPath(g, s, p.half); g.restore();
    }
    g.globalAlpha = 1;
  }
  addEventListener("resize", () => { clearTimeout(bgFrame.rt); bgFrame.rt = setTimeout(bgBuild, 150); });

  /* ================= 3D: катана в hero ================= */
  const M = ZMGeo.M;
  function heroView() {
    const cv = $("#hero3d");
    if (!ZMGeo.supported()) { cv.replaceWith(Object.assign(new Image(), { src: T("katana_icon"), className: "kt-3d", style: "object-fit:contain;image-rendering:auto" })); return null; }
    const g = ZMGeo.create(cv, { geo: G.geo, anim: G.anim, tex: ZM.P12TEX, hide: ["right_arm", "left_arm"] });
    const bb = g.bbox(["katana"]); const c = bb.c;
    Object.assign(g.cam, { target: c, dist: bb.size[1] * 1.55, yaw: 0, pitch: 4, fov: 42 });
    let ry = 20, rx = 0, drag = null, last = -1e9;
    cv.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, ry, rx }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
    cv.addEventListener("pointermove", (e) => { if (!drag) return; ry = drag.ry + (e.clientX - drag.x) * 0.6; rx = clamp(drag.rx + (e.clientY - drag.y) * 0.4, -60, 60); last = performance.now(); });
    const fx = mkFX($("#heroFx")), stage = cv.parentElement;
    cv.addEventListener("pointerup", (e) => {
      const moved = drag && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6; drag = null;
      if (moved) return;
      // клик без перетаскивания: разрез через всю сцену
      const w = stage.clientWidth, h = stage.clientHeight, a = rr(-0.9, 0.9) + (Math.random() < 0.5 ? 0 : Math.PI), r = Math.hypot(w, h) * 0.5;
      const cx = w / 2 + rr(-40, 40), cy = h / 2 + rr(-60, 60);
      fx.cut(cx - Math.cos(a) * r, cy - Math.sin(a) * r, cx + Math.cos(a) * r, cy + Math.sin(a) * r, { w: 7, life: 0.55, sparks: 26 });
      fx.flash(0.12); shake(stage, 5); whoosh(0.55, 0.18); setTimeout(() => shing(0.35), 40); spinKick = 540;
    });
    cv.addEventListener("pointercancel", () => (drag = null));
    let spinKick = 0;
    let vis = true; new IntersectionObserver((es) => (vis = es[0].isIntersecting)).observe(cv);
    return { tick(dt, now) {
      if (!vis) return;
      if (!drag && now - last > 1500 && !reduce) ry += dt * 22;
      if (spinKick > 0) { const k = Math.min(spinKick, dt * 1800); ry += k; spinKick -= k; }
      fx.tick(dt);
      const bob = Math.sin(now / 1200) * 0.6;
      g.setExtra(M.mul(M.t(c[0], c[1] + bob, c[2]), M.mul(M.rz(-0.18), M.mul(M.ry(ry * Math.PI / 180), M.mul(M.rx(rx * Math.PI / 180), M.t(-c[0], -c[1], -c[2]))))));
      g.render();
    } };
  }

  /* ================= I · стойка: руки + катана, 7 анимаций ================= */
  const COMBO = ["diagonal_left", "diagonal_right", "swing_horizontal"];
  let lastCombo = -1;
  const t0 = performance.now();
  function slog(cls, txt) {
    const el = $("#stLog"), p = document.createElement("p");
    p.innerHTML = `<span class="t">[${((performance.now() - t0) / 1000).toFixed(1)}]</span><span class="${cls}">${esc(txt)}</span>`;
    el.appendChild(p); while (el.children.length > 40) el.firstChild.remove(); el.scrollTop = el.scrollHeight;
  }
  function stanceView() {
    const view = $("#stView"), cv = $("#rig3d"), tr = $("#trail"), tg = tr.getContext("2d");
    if (!ZMGeo.supported()) { view.insertAdjacentHTML("beforeend", `<img src="${T("katana_blade")}" alt="" style="position:absolute;left:50%;top:10%;height:80%;transform:translateX(-50%) rotate(20deg)">`); return null; }
    const g = ZMGeo.create(cv, { geo: G.geo, anim: G.anim, tex: ZM.P12TEX, idle: "idle" });
    Object.assign(g.cam, { eye: [34, 20, 3], target: [-6, 12, 3], fov: 66 });
    const trail = [];
    let charging = false, chargeT0 = 0, ultAct = false;
    const setAnimLbl = () => { $("#stAnim").textContent = g.st.act || "idle"; $$("#stList button").forEach((b) => b.classList.toggle("on", b.dataset.k === (g.st.act || "idle"))); };
    $("#stList").innerHTML = P.anims.map((a) => `<button type="button" data-k="${a.k}" data-nosfx><span><b>${esc(a.n)}</b><br><small>${esc(a.t)}</small></span><code>${a.k}</code></button>`).join("");
    $("#stList").addEventListener("click", (e) => {
      const b = e.target.closest("[data-k]"); if (!b) return; const k = b.dataset.k;
      if (k === "idle") { g.stop(); } else if (k === "ultimate_charge") { g.play(k); } else { g.play(k, setAnimLbl); if (COMBO.includes(k) || k === "ultimate_release") play(pick(["sweep1", "sweep2", "sweep3"]), 0.4); }
      setAnimLbl();
    });
    function combo() {
      if (charging) return;
      let n; do { n = rnd(COMBO.length); } while (n === lastCombo && COMBO.length > 1);
      lastCombo = n; const a = COMBO[n];
      g.play(a, setAnimLbl); setAnimLbl(); slog("c", "⚔️ COMBO → " + a);
      play(pick(["sweep1", "sweep2", "sweep3"]), 0.35, rr(0.95, 1.1)); whoosh(0.5, 0.2, 450, 3600);
      sw = { t0: performance.now(), pts: [], done: false, col: "190,150,255" };
    }
    let parryCd = 0;
    function parry() {
      if (charging) return;
      if (performance.now() < parryCd) return;
      parryCd = performance.now() + 700;
      g.play("parry", setAnimLbl); setAnimLbl(); slog("p", "🛡️ PARRY WINDOW START");
      play("shield", 0.25, 1.4); shing(0.3, 3400);
      setTimeout(() => { const m = g.project("katana", [-6, 20, 1]); fx.cut(m[0] - 60, m[1] - 40, m[0] + 60, m[1] + 40, { w: 3, col: "120,220,255", life: 0.3, sparks: 10 }); fx.cut(m[0] + 60, m[1] - 40, m[0] - 60, m[1] + 40, { w: 3, col: "120,220,255", life: 0.3, sparks: 10, delay: 0.03 }); fx.sparks(m[0], m[1], 22, 380, "160,235,255"); }, 90);
    }
    function ultDown() {
      if (charging) return;
      if (!ultReady()) { slog("r", "✖ ульта на перезарядке: " + Math.ceil((ultReadyAt - performance.now()) / 1000) + " с"); play("nodamage", 0.4); return; }
      charging = true; chargeT0 = performance.now();
      g.play("ultimate_charge"); setAnimLbl(); slog("u", "🔥 ULTIMATE CHARGING...");
      play("k_charge", 0.9, 0.8);
      $("#stCharge").classList.add("on"); $("#pUlt").classList.add("hot");
    }
    function ultUp() {
      if (!charging) return;
      charging = false; $("#stCharge").classList.remove("on", "full"); $("#pUlt").classList.remove("hot");
      const held = performance.now() - chargeT0;
      if (held >= 1000) {   // 20 тиков
        g.play("ultimate_release", setAnimLbl); setAnimLbl(); slog("r", "⚡ ULTIMATE RELEASE");
        play("k_charged_slash", 1); ultReadyAt = performance.now() + CD_MS; grant("use_ultimate");
        whoosh(0.8, 0.35, 250, 4200); durSpend(view);
        setTimeout(() => {
          const w = view.clientWidth, h = view.clientHeight, x = w * rr(0.44, 0.56);
          fx.flash(0.55); fx.cut(x + w * 0.06, -20, x - w * 0.06, h + 20, { w: 14, life: 1.1, grow: 0.09, sparks: 50, bend: 0.4 });
          fx.cut(x + w * 0.14, h * 0.05, x - w * 0.02, h * 0.95, { w: 4, life: 0.6, delay: 0.05, col: "255,255,255", sparks: 0 });
          fx.cut(x - w * 0.01, h * 0.1, x - w * 0.12, h * 0.9, { w: 3, life: 0.5, delay: 0.08, sparks: 0 });
          shake(view, 14, 380); shing(0.5, 2200);
        }, 170);
      } else { g.stop(); setAnimLbl(); slog("t", "отпустил раньше секунды: удар отменён"); }
    }
    view.addEventListener("contextmenu", (e) => e.preventDefault());
    view.addEventListener("pointerdown", (e) => {
      view.focus({ preventScroll: true });
      if (e.button === 2) { if (e.shiftKey) ultDown(); else parry(); }
      else if (e.button === 0) combo();
    });
    addEventListener("pointerup", (e) => { if (e.button === 2 || e.pointerType !== "mouse") ultUp(); });
    const padHold = (el, down, up) => { el.addEventListener("pointerdown", (e) => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (_) {} down(); }); if (up) { el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up); } };
    padHold($("#pLmb"), combo); padHold($("#pRmb"), parry); padHold($("#pUlt"), ultDown, ultUp);
    const fx = mkFX($("#stFx")); let sw = null;
    let vis = false; new IntersectionObserver((es) => { vis = es[0].isIntersecting; if (vis && !stanceView.eq) { stanceView.eq = 1; play("k_equip", 0.6); } }).observe(view);
    const TIP = [-6.1, 35.2, 0.2], MID = [-6.0, 12, 2.0];
    return { tick(dt, now) {
      if (!vis) return;
      g.cam.fov = cv.clientWidth / cv.clientHeight < 1 ? 92 : 66;
      g.tick(dt); g.render();
      if (charging) { const p = clamp((now - chargeT0) / 1000, 0, 1); const el = $("#stCharge"); el.style.setProperty("--p", p); el.classList.toggle("full", p >= 1); }
      // след клинка
      const d = Math.min(2, devicePixelRatio || 1), w = tr.clientWidth, h = tr.clientHeight;
      if (tr.width !== Math.round(w * d)) { tr.width = Math.round(w * d); tr.height = Math.round(h * d); }
      tg.setTransform(d, 0, 0, d, 0, 0); tg.clearRect(0, 0, w, h);
      const act = g.st.act, swing = act && act !== "ultimate_charge";
      if (swing) trail.push({ a: g.project("katana", TIP), b: g.project("katana", MID), t: now, act });
      while (trail.length && (now - trail[0].t > 230 || trail.length > 30)) trail.shift();
      // след: от кромки (белая) к середине клинка (прозрачная), сложение света
      tg.globalCompositeOperation = "lighter";
      const colOf = (a) => a === "ultimate_release" ? "255,70,100" : a === "parry" ? "110,215,255" : "185,145,255";
      for (let i = 1; i < trail.length; i++) {
        const p0 = trail[i - 1], p1 = trail[i], k = Math.pow(i / trail.length, 1.4), c = colOf(p1.act);
        const gr = tg.createLinearGradient(p1.a[0], p1.a[1], p1.b[0], p1.b[1]);
        gr.addColorStop(0, `rgba(255,255,255,${k * 0.95})`); gr.addColorStop(0.12, `rgba(${c},${k * 0.8})`); gr.addColorStop(1, `rgba(${c},0)`);
        tg.fillStyle = gr; tg.beginPath(); tg.moveTo(p0.a[0], p0.a[1]); tg.lineTo(p1.a[0], p1.a[1]); tg.lineTo(p1.b[0], p1.b[1]); tg.lineTo(p0.b[0], p0.b[1]); tg.fill();
      }
      if (trail.length > 2) { tg.strokeStyle = "rgba(255,255,255,.9)"; tg.lineWidth = 1.5; tg.lineCap = "round"; tg.beginPath(); trail.forEach((p, i) => (i ? tg.lineTo(p.a[0], p.a[1]) : tg.moveTo(p.a[0], p.a[1]))); tg.stroke(); }
      tg.globalCompositeOperation = "source-over";
      // разрез по реальной траектории кончика клинка
      if (sw && !sw.done) {
        const age = now - sw.t0;
        if (age > 40) sw.pts.push(g.project("katana", TIP));
        if (age > 250 && sw.pts.length > 2) {
          sw.done = true;
          let bi = 1, bv = 0; for (let i = 1; i < sw.pts.length; i++) { const v = Math.hypot(sw.pts[i][0] - sw.pts[i - 1][0], sw.pts[i][1] - sw.pts[i - 1][1]); if (v > bv) { bv = v; bi = i; } }
          const a0 = sw.pts[Math.max(0, bi - 4)], a1 = sw.pts[Math.min(sw.pts.length - 1, bi + 3)], dx = a1[0] - a0[0], dy = a1[1] - a0[1], L = Math.hypot(dx, dy);
          if (L > 20) { const ex = 0.6; fx.cut(a0[0] - dx * ex, a0[1] - dy * ex, a1[0] + dx * ex, a1[1] + dy * ex, { w: 6, col: sw.col, life: 0.45, sparks: 18 }); shake(view, 4, 160); shing(0.22, rr(2700, 3300)); }
        }
      }
      // замах: искры стягиваются к кончику
      if (charging && Math.random() < 0.9) { const tp = g.project("katana", TIP), a = Math.random() * 6.283, R = rr(60, 140), full = now - chargeT0 >= 1000; fx.sparks(tp[0] + Math.cos(a) * R, tp[1] + Math.sin(a) * R, 1, R * 2.6, full ? "255,90,110" : "190,150,255", a + Math.PI, 0.1); }
      fx.tick(dt);
    } };
  }

  /* ================= II · парирование: арена сбоку ================= */
  function arena() {
    const view = $("#prView"), cv = $("#prCv"), g = cv.getContext("2d");
    let VW = 20;                         // блоков в кадре (на телефоне 12)
    const WINDOW = 450, CD = 350;        // окно и откат на странице (мс)
    const pl = { x: 3.5, y: 0, vy: 0, hp: 20, face: 1, swing: 0, swingK: 0, parryUntil: 0, parryCd: 0, hurt: 0, dead: false, fall: 0 };
    let mobs = [], arrows = [], parts = [], texts = [], stats = S.get("p12.pr", { parries: 0, kills: 0, deflect: 0 });
    let lastCombo2 = -1, autoOn = false, autoT = 2, regenT = 0;
    const fx = mkFX($("#prFx")); let stop = 0, lB = 30, lGy = 200, cres = null, cutAn = null;
    const SX = (x) => x * lB, SY = (y) => lGy - y * lB;
    const saveStats = () => S.set("p12.pr", stats);
    const tints = {};
    function tinted(name, rgb) {
      const k = name + rgb; if (tints[k]) return tints[k];
      const im = img(name); if (!im.complete || !im.naturalWidth) return null;
      const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const x = c.getContext("2d");
      x.drawImage(im, 0, 0); x.globalCompositeOperation = "multiply"; x.fillStyle = rgb; x.fillRect(0, 0, c.width, c.height);
      x.globalCompositeOperation = "destination-in"; x.drawImage(im, 0, 0); return (tints[k] = c);
    }
    const BODY = {
      steve: { tex: "steve", head: [0, 8, 8, 8], body: [16, 20, 4, 12], arm: [40, 20, 4, 12], leg: [0, 20, 4, 12], lw: 4, aw: 4, legH: 12, bodyH: 12 },
      zombie: { tex: "zombie", head: [0, 8, 8, 8], body: [16, 20, 4, 12], arm: [40, 20, 4, 12], leg: [0, 20, 4, 12], lw: 4, aw: 4, legH: 12, bodyH: 12 },
      skeleton: { tex: "skeleton", head: [0, 8, 8, 8], body: [16, 20, 4, 12], arm: [40, 18, 2, 12], leg: [0, 18, 2, 12], lw: 2, aw: 2, legH: 12, bodyH: 12 },
      creeper: { tex: "creeper", head: [0, 8, 8, 8], body: [16, 20, 4, 12], leg: [0, 20, 4, 6], lw: 4, legH: 6, bodyH: 12, quad: true },
    };
    // моб сбоку из кусков скина: ноги, тело, рука, голова
    const off = document.createElement("canvas"), og = off.getContext("2d");
    function drawMob(kind, fx, fy, face, tx, st) {
      const B = BODY[kind], im = img(B.tex); if (!im.complete) return;
      const sw = st.swell || 1, W = 50, H = 58; off.width = W * 4; off.height = H * 4;
      og.setTransform(4, 0, 0, 4, W * 2, H * 4); og.imageSmoothingEnabled = false; og.clearRect(-W, -H, W * 2, H);
      const part = (r, x, y, w, h, rot = 0, px = 0, py = 0) => { og.save(); og.translate(px, py); og.rotate(rot || 0); og.drawImage(im, r[0], r[1], r[2], r[3], x - px, y - py, w, h); og.restore(); };
      const leg = Math.sin(st.walk || 0) * 0.6;
      if (B.quad) {
        part(B.leg, -B.lw / 2 - 2, -6, B.lw, 6, leg * 0.5, -2, -6); part(B.leg, -B.lw / 2 + 2, -6, B.lw, 6, -leg * 0.5, 2, -6);
        og.save(); og.scale(sw, sw); part(B.body, -2, -18, 4, 12); part(B.head, -4, -26, 8, 8); og.restore();
      } else {
        const lh = B.legH, top = -lh - B.bodyH;
        part(B.leg, -B.lw / 2, -lh, B.lw, lh, -leg, 0, -lh); part(B.leg, -B.lw / 2, -lh, B.lw, lh, leg, 0, -lh);
        part(B.body, -2, top, 4, B.bodyH);
        part(B.head, -4, top - 8, 8, 8);
        let armRot = st.arm ?? leg * 0.7;
        // предмет в кулаке: угол itemAng задаётся абсолютно (0 = картинка стоит ровно), рисуется ДО руки, чтобы кулак обхватывал рукоять
        if (st.item) {
          const bi = img(st.item);
          og.save(); og.translate(0, top + 2); og.rotate(armRot); og.translate(0, 10.5); og.rotate(-armRot + (st.itemAng || 0));
          if (bi.complete) { if (st.item === "katana_blade") og.drawImage(bi, -1.35, -20.6, 2.7, 22); else og.drawImage(bi, -5, -5, 10, 10); }
          og.restore();
        }
        part(B.arm, -B.aw / 2, top, B.aw, 12, armRot, 0, top + 2);
      }
      if (st.flash) { og.globalCompositeOperation = "source-atop"; og.fillStyle = st.flash; og.fillRect(-W, -H, W * 2, H); og.globalCompositeOperation = "source-over"; }
      if (st.noBlit) return;
      const px = tx / 16;
      g.save(); g.translate(fx, fy); g.scale(face, 1); g.imageSmoothingEnabled = false;
      g.drawImage(off, -W * px / 2 * 16 / 16 * 1, -H * px, W * px, H * px); g.restore();
    }
    function spawn(kind) {
      if (pl.dead) return;
      if (kind === "fall") { if (pl.fall) return; pl.fall = 1; pl.y = 5; pl.vy = 0; chat(`<span style="color:#aaa">Прыжок с 5 блоков. Падение не парируется: у него нет атакующего.</span>`); return; }
      const hp = 20;
      const m = { kind, x: kind === "skeleton" ? VW * rr(0.7, 0.82) : VW - 0.5, y: 0, hp, max: hp, st: "walk", t: 0, walk: 0, hurt: 0, face: -1, id: Math.random() };
      mobs.push(m); if (kind === "skeleton") play("skel_say", 0.5); else if (kind === "zombie") play("zomb_say", 0.5);
    }
    function hurtMob(m, dmg, cause) {
      m.hp -= dmg; m.hurt = 0.35; texts.push({ x: m.x, y: 2.4, t: 1, s: "-" + (Math.round(dmg * 10) / 10), c: "#ff5555" });
      if (m.hp <= 0) {
        m.dead = true; play({ zombie: "zomb_death", skeleton: "skel_death", creeper: "creep_death" }[m.kind], 0.6);
        // тело разрубается по линии удара на две половины
        parts.push({ k: "split", kind: m.kind, x: m.x, y: m.y, t: 1.1, an: cutAn ?? rr(-0.7, 0.7), st: { walk: m.walk, arm: m.kind === "creeper" ? 0 : -1.57, item: m.kind === "skeleton" ? "bow" : null, itemAng: Math.PI * 0.75 } }); cutAn = null;
        for (let i = 0; i < 8; i++) parts.push({ k: "puff", x: m.x + rr(-0.4, 0.4), y: rr(0.2, 1.6), vx: rr(-0.5, 0.5), vy: rr(0.3, 1.2), t: rr(0.5, 0.9) });
        stats.kills++;
        if (cause === "deflect" && m.kind === "skeleton") { stats.deflect++; grant("deflect_arrow_kill"); chat(`<span style="color:#ff5555">Скелет убит своей же стрелой.</span>`); }
        saveStats();
      } else play({ zombie: "zomb_hurt", skeleton: pick(["skel_hurt", "skel_hurt2"]), creeper: "creep_hurt" }[m.kind], 0.5);
    }
    const parrying = () => performance.now() < pl.parryUntil;
    function tryParry() {
      if (pl.dead) return;
      const now = performance.now(); if (now < pl.parryCd || parrying()) return;
      pl.parryUntil = now + WINDOW; pl.parryCd = now + WINDOW + CD; play("shield", 0.2, 1.5);
    }
    function ring() {   // spawnParryEffects: 30 точек по кругу r=1 на высоте 1.2
      for (let i = 0; i < 30; i++) {
        const a = Math.PI * 2 * i / 30, cx = pl.x + Math.cos(a) * 1, cy = pl.y + 1.2 + Math.sin(a) * 0.35;
        parts.push({ k: "crit", x: cx, y: cy, vx: Math.cos(a) * 2.5, vy: Math.sin(a) * 0.8 + 0.5, t: rr(0.4, 0.7) });
        parts.push({ k: "ench", x: cx, y: cy, vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 0.6 + 1, t: rr(0.5, 0.9) });
      }
    }
    // урон по игроку: LivingAttackEvent → если парирование и урон парируемый — отмена + ответ
    function hitPlayer(dmg, src) {
      if (pl.dead) return false;
      const parriable = src.kind === "projectile" || src.kind === "melee" || src.kind === "explosion";
      if (parrying() && parriable) {
        parrySnd(); ring(); stats.parries++; saveStats(); grant("successful_parry");
        pl.parryUntil = 0;   // ParryManager.resetParry
        texts.push({ x: pl.x, y: 2.5, t: 1.1, s: "парировано", c: "#55ffff" });
        if (src.mob && !src.mob.dead) {
          const cause = src.kind === "projectile" ? "deflect" : "counter";
          parts.push({ k: "zap", x: pl.x, y: 1.3, x2: src.mob.x, y2: 1.2, t: 0.25 });
          hurtMob(src.mob, dmg, cause);
        }
        stop = 0.12; shake(view, 7, 240); shing(0.5, 3600);
        const bx = SX(pl.x + 0.55), by = SY(pl.y + 1.3);
        fx.flash(0.22, "160,235,255"); fx.sparks(bx, by, 34, 520, "170,240,255"); fx.sparks(bx, by, 14, 420, "255,255,255");
        fx.cut(bx - lB * 0.9, by - lB * 0.7, bx + lB * 0.9, by + lB * 0.7, { w: 4, col: "120,220,255", life: 0.32, sparks: 0 });
        fx.cut(bx + lB * 0.9, by - lB * 0.7, bx - lB * 0.9, by + lB * 0.7, { w: 4, col: "120,220,255", life: 0.32, sparks: 0, delay: 0.02 });
        parts.push({ k: "shock", x: pl.x + 0.55, y: pl.y + 1.3, t: 0.35 });
        return false;
      }
      pl.hp -= dmg; pl.hurt = 0.4; play(pick(["hit1", "hit2"]), 0.6);
      texts.push({ x: pl.x, y: 2.4, t: 1, s: "-" + dmg, c: "#ff5555" });
      if (pl.hp <= 0) {
        pl.hp = 0; pl.dead = true;
        $("#prDeadWhy").textContent = { melee: "Зомби дотянулся.", projectile: "Стрела нашла цель.", explosion: "Крипер сделал бум.", fall: "Слишком сильно ударился о землю." }[src.kind] || "";
        $("#prDead").hidden = false;
      }
      return true;
    }
    $("#prRespawn").onclick = () => { pl.hp = 20; pl.dead = false; mobs = []; arrows = []; $("#prDead").hidden = true; };
    function swing() {
      if (pl.dead) return;
      let n; do { n = rnd(3); } while (n === lastCombo2); lastCombo2 = n;
      pl.swing = 0.3; pl.swingK = n; cres = { t: 0, k: n }; whoosh(0.4, 0.16, 500, 3400);
      const tgt = mobs.filter((m) => !m.dead && m.x > pl.x && m.x - pl.x < 2.4).sort((a, b) => a.x - b.x)[0];
      if (tgt) {
        const cx = SX(tgt.x), cy = SY(tgt.y + 1.1), an = [0.75, -0.75, 0.12][n] + rr(-0.15, 0.15), L = lB * 1.5;
        cutAn = Math.PI - an; hurtMob(tgt, 7, "melee"); slashSnd();   // hurtEnemy: волна + один из трёх звуков
        tgt.white = 0.07; stop = 0.075; shake(view, 5, 180); shing(0.28, rr(2800, 3400));
        fx.cut(cx - Math.cos(an) * L, cy - Math.sin(an) * L, cx + Math.cos(an) * L, cy + Math.sin(an) * L, { w: tgt.dead ? 7 : 5, col: tgt.dead ? "255,60,90" : "235,225,255", life: tgt.dead ? 0.6 : 0.38, sparks: tgt.dead ? 30 : 16 });
        fx.sparks(cx, cy, 12, 380, "255,90,90", an + Math.PI / 2, 1.2);
        tgt.x = Math.min(VW - 0.5, tgt.x + 0.8);
        parts.push({ k: "sweep", x: tgt.x - 0.3, y: 1.1, t: 0.4 });
      } else play(pick(["sweep1", "sweep2"]), 0.3);
    }
    view.addEventListener("contextmenu", (e) => e.preventDefault());
    view.addEventListener("pointerdown", (e) => { view.focus({ preventScroll: true }); if (e.button === 2) tryParry(); else if (e.button === 0) { if (e.pointerType === "mouse") swing(); else tryParry(); } });
    view.addEventListener("keydown", (e) => { if (e.code === "Space") { e.preventDefault(); tryParry(); } });
    $("#prBtn").addEventListener("pointerdown", (e) => { e.preventDefault(); tryParry(); });
    $$("[data-spawn]").forEach((b) => b.addEventListener("click", () => spawn(b.dataset.spawn)));
    $("#prAuto").addEventListener("change", (e) => (autoOn = e.target.checked));
    let vis = false; new IntersectionObserver((es) => (vis = es[0].isIntersecting)).observe(view);
    let seeded = false;

    function update(dt) {
      VW = cv.clientWidth && cv.clientWidth < 600 ? 12 : 20;
      if (!seeded && vis) { seeded = true; spawn("zombie"); setTimeout(() => spawn("skeleton"), 900); }
      if (autoOn && !pl.dead && (autoT -= dt) <= 0) { autoT = rr(3, 6); if (mobs.filter((m) => !m.dead).length < 3) spawn(pick(["zombie", "zombie", "skeleton", "creeper"])); }
      if (!pl.dead && pl.hp < 20 && (regenT += dt) > 3) { regenT = 0; pl.hp = Math.min(20, pl.hp + 1); }
      pl.swing = Math.max(0, pl.swing - dt); pl.hurt = Math.max(0, pl.hurt - dt);
      if (pl.fall) { pl.vy -= 32 * dt; pl.y += pl.vy * dt; if (pl.y <= 0) { pl.y = 0; pl.fall = 0; play("fallbig", 0.6); hitPlayer(2, { kind: "fall" }); } }
      for (const m of mobs) {
        if (m.dead) continue;
        m.hurt = Math.max(0, m.hurt - dt); m.t += dt;
        const d = m.x - pl.x;
        if (m.kind === "zombie") {
          if (m.st === "walk") { if (d > 1.3) { m.x -= 1.6 * dt; m.walk += dt * 8; } else { m.st = "wind"; m.t = 0; } }
          else if (m.st === "wind" && m.t > 0.6) { m.st = "cool"; m.t = 0; if (d < 1.8) hitPlayer(3, { kind: "melee", mob: m }); }
          else if (m.st === "cool" && m.t > 1.0) { m.st = d > 1.5 ? "walk" : "wind"; m.t = 0; }
        } else if (m.kind === "skeleton") {
          if (m.st === "walk") { m.st = "draw"; m.t = 0; }
          else if (m.st === "draw" && m.t > 1.1) { m.st = "cool"; m.t = 0; play("bow", 0.5, rr(0.9, 1.1)); arrows.push({ x: m.x - 0.5, y: 1.45, vx: -13, vy: 1.2, mob: m, dmg: 2 + rnd(3) }); }
          else if (m.st === "cool" && m.t > 1.4) { m.st = "draw"; m.t = 0; }
        } else if (m.kind === "creeper") {
          if (m.st === "walk") { if (d > 1.6) { m.x -= 1.4 * dt; m.walk += dt * 7; } else { m.st = "fuse"; m.t = 0; play("fuse", 0.6); } }
          else if (m.st === "fuse" && m.t > 1.5) {
            m.dead = true; play(pick(["explode1", "explode2"]), 0.7);
            for (let i = 0; i < 16; i++) parts.push({ k: "exp", x: m.x + rr(-1.2, 1.2), y: rr(0.2, 2.2), t: 0.8, f: rnd(4) });
            if (Math.abs(m.x - pl.x) < 3.5) hitPlayer(15, { kind: "explosion", mob: m });
          }
        }
      }
      for (const a of arrows) {
        if (a.done) { a.t -= dt; continue; }
        a.vy -= 2 * dt; a.x += a.vx * dt; a.y += a.vy * dt;
        if (a.x <= pl.x + 0.3 && a.x > pl.x - 0.6 && a.y > pl.y && a.y < pl.y + 1.9) {
          const hit = hitPlayer(a.dmg, { kind: "projectile", mob: a.mob.dead ? null : a.mob });
          a.done = true; a.t = hit ? 0 : 0.7;
          if (!hit) { a.back = true; a.vx = 24; a.vy = 0.4; a.tx = a.mob.x; }   // отбитая стрела летит обратно
          if (hit) play("bowhit", 0.4);
        }
        if (a.x < -1 || a.y < 0) { a.done = true; a.t = 0; }
      }
      for (const a of arrows) if (a.back && a.t > 0) { a.x += a.vx * dt; a.y += a.vy * dt; if (a.x >= a.tx) a.t = 0; }
      arrows = arrows.filter((a) => !a.done || a.t > 0);
      mobs = mobs.filter((m) => !m.dead);
      for (const p of parts) { p.t -= dt; if (p.vx !== undefined) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; } }
      parts = parts.filter((p) => p.t > 0);
      for (const t of texts) { t.t -= dt; t.y += dt * 0.8; } texts = texts.filter((t) => t.t > 0);
    }
    function heart(x, y, s, kind) { const ic = img("icons"); if (!ic.complete) return; g.drawImage(ic, 16, 0, 9, 9, x, y, s, s); if (kind) g.drawImage(ic, kind === 2 ? 52 : 61, 0, 9, 9, x, y, s, s); }
    function draw(now) {
      const d = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight; if (!w) return;
      if (cv.width !== Math.round(w * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
      g.setTransform(d, 0, 0, d, 0, 0); g.imageSmoothingEnabled = false;
      VW = w < 600 ? 12 : 20; const B = w / VW, gy = h - B * 1.4; lB = B; lGy = gy;       // пиксели на блок, линия земли
      const X = (x) => x * B, Y = (y) => gy - y * B;
      const sky = g.createLinearGradient(0, 0, 0, gy); sky.addColorStop(0, "#0c0918"); sky.addColorStop(1, "#2a1a3c"); g.fillStyle = sky; g.fillRect(0, 0, w, gy);
      // задник: луна с гало, два хребта в тумане, тории и сосна
      const mx2 = w * 0.8, my2 = h * 0.24, mr2 = B * 1.15, hl = g.createRadialGradient(mx2, my2, mr2 * 0.8, mx2, my2, mr2 * 3.5); hl.addColorStop(0, "rgba(240,120,140,.25)"); hl.addColorStop(1, "rgba(240,120,140,0)");
      g.fillStyle = hl; g.fillRect(0, 0, w, gy);
      const mg2 = g.createRadialGradient(mx2 - mr2 * 0.3, my2 - mr2 * 0.3, 1, mx2, my2, mr2); mg2.addColorStop(0, "#fff1ee"); mg2.addColorStop(1, "#d98f98"); g.fillStyle = mg2; g.beginPath(); g.arc(mx2, my2, mr2, 0, 7); g.fill();
      const ridgeL = (base, amp, fr, ph, c1, c2) => { const gg = g.createLinearGradient(0, gy - (base + amp) * B, 0, gy); gg.addColorStop(0, c1); gg.addColorStop(1, c2); g.fillStyle = gg; g.beginPath(); g.moveTo(0, gy);
        for (let x = 0; x <= w; x += 4) { const t = x / w; g.lineTo(x, gy - (base + amp * (Math.sin(t * fr + ph) * 0.5 + Math.sin(t * fr * 2.3 + ph * 2) * 0.3 + 0.8) * 0.6) * B); } g.lineTo(w, gy); g.fill(); };
      ridgeL(2.2, 2.4, 5, 1.3, "#2e1d3c", "#3c2440"); ridgeL(0.8, 1.6, 8, 4.1, "#1a1026", "#2a1830");
      { const tx2 = X(VW * 0.62), ty2 = gy, u = B / 16; g.fillStyle = "#10081a"; g.fillRect(tx2 - 13 * u, ty2 - 30 * u, 2.4 * u, 30 * u); g.fillRect(tx2 + 10.6 * u, ty2 - 30 * u, 2.4 * u, 30 * u); g.fillRect(tx2 - 12 * u, ty2 - 25 * u, 24 * u, 2 * u);
        g.beginPath(); g.moveTo(tx2 - 19 * u, ty2 - 33 * u); g.quadraticCurveTo(tx2, ty2 - 29 * u, tx2 + 19 * u, ty2 - 33 * u); g.lineTo(tx2 + 17.5 * u, ty2 - 30 * u); g.quadraticCurveTo(tx2, ty2 - 27 * u, tx2 - 17.5 * u, ty2 - 30 * u); g.fill(); }
      const gt = img("grass_side"), dt2 = img("dirt_b");
      for (let i = 0; i < VW; i++) { if (gt.complete) g.drawImage(gt, X(i), gy, B + 0.5, B + 0.5); if (dt2.complete) g.drawImage(dt2, X(i), gy + B, B + 0.5, B + 0.5); }
      g.fillStyle = "rgba(10,6,20,.35)"; g.fillRect(0, gy, w, h - gy);
      // игрок
      const pAct = parrying(), swingK = pl.swing > 0 ? 1 - pl.swing / 0.3 : -1;
      // позы: стойка (клинок вперёд-вверх), блок (клинок почти вертикально перед собой), три взмаха
      const SW = [[-2.9, -0.35, -1.0, 2.3], [-0.35, -2.7, 2.2, -0.6], [-1.75, -1.25, -0.2, 1.95]];
      const ease = (t) => 1 - Math.pow(1 - t, 3), br = Math.sin(now / 700) * 0.04;
      let armRot = -0.45 + br, itAng = 0.62 + br;
      if (pAct) { armRot = -1.25; itAng = 0.18; }
      else if (swingK >= 0) { const q = SW[pl.swingK], e = ease(Math.min(1, swingK * 1.6)); armRot = q[0] + (q[1] - q[0]) * e; itAng = q[2] + (q[3] - q[2]) * e; }
      drawMob("steve", X(pl.x), Y(pl.y), 1, B, { walk: 0, arm: armRot, item: "katana_blade", itemAng: itAng, flash: pl.hurt > 0 ? "rgba(255,0,0,.45)" : pAct ? "rgba(120,220,255,.18)" : null });
      if (pAct) { g.strokeStyle = "rgba(120,220,255,.7)"; g.lineWidth = 2; g.beginPath(); g.arc(X(pl.x + 0.3), Y(1.1), B * 1.1, -1.2, 1.2); g.stroke(); }
      // мобы
      for (const m of mobs) {
        const flash = m.white > 0 ? "rgba(255,255,255,.9)" : m.hurt > 0 ? "rgba(255,0,0,.45)" : m.kind === "creeper" && m.st === "fuse" && Math.floor(m.t * 8) % 2 ? "rgba(255,255,255,.6)" : null;
        const st = { walk: m.walk, flash, swell: m.kind === "creeper" && m.st === "fuse" ? 1 + m.t * 0.1 : 1 };
        if (m.kind === "zombie") st.arm = m.st === "wind" ? -2.6 - m.t : -1.57;
        if (m.kind === "skeleton") { st.arm = -1.57; st.item = m.st === "draw" ? "bow_pull" : "bow"; st.itemAng = Math.PI * 0.75; }   // в текстуре наконечник смотрит влево-вверх: +135° = стрелой вперёд, плечи лука вертикально
        drawMob(m.kind, X(m.x), Y(m.y), -1, B, st);
        // полоска здоровья и «!» перед ударом
        const hx = X(m.x) - B * 0.5, hy = Y(2.35);
        g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(hx, hy, B, 4); g.fillStyle = m.hp / m.max > 0.5 ? "#55ff55" : m.hp / m.max > 0.25 ? "#ffff55" : "#ff5555"; g.fillRect(hx, hy, B * clamp(m.hp / m.max, 0, 1), 4);
        const warn = (m.kind === "zombie" && m.st === "wind") || (m.kind === "skeleton" && m.st === "draw" && m.t > 0.6) || (m.kind === "creeper" && m.st === "fuse");
        if (warn) { g.fillStyle = "#e0314b"; g.font = `700 ${Math.round(B * 0.7)}px ${getComputedStyle(document.body).getPropertyValue("--f-pixel")}`; g.textAlign = "center"; g.fillText("!", X(m.x), Y(2.6)); }
      }
      // серп взмаха перед игроком
      if (cres) {
        const k = cres.t / 0.16, [a0, a1] = [[-1.5, 1.1], [1.1, -1.4], [-0.55, 0.6]][cres.k], grow = Math.min(1, k * 1.8), end = a0 + (a1 - a0) * grow;
        const fade = k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45;
        if (fade > 0) crescent(g, X(pl.x + 0.1), Y(pl.y + 1.15), B * 1.85, Math.min(a0, end), Math.max(a0, end), B * 0.85 * fade + 1, cres.k === 1 ? "200,160,255" : "185,145,255", fade);
      }
      for (const p of parts) if (p.k === "shock") { const k = 1 - p.t / 0.35; g.strokeStyle = `rgba(170,240,255,${1 - k})`; g.lineWidth = 3 * (1 - k) + 1; g.beginPath(); g.ellipse(X(p.x), Y(p.y), B * (0.3 + k * 2.2), B * (0.3 + k * 1.2), 0, 0, 7); g.stroke(); }
      // стрелы
      const at = img("arrow_ent");
      for (const a of arrows) { if (!at.complete) break; g.save(); g.translate(X(a.x), Y(a.y)); g.rotate(Math.atan2(-a.vy, a.vx)); if (a.back) { g.globalCompositeOperation = "lighter"; g.strokeStyle = "rgba(170,240,255,.7)"; g.lineWidth = 2; g.beginPath(); g.moveTo(-B * 0.5, 0); g.lineTo(-B * 2.2, 0); g.stroke(); g.globalCompositeOperation = "source-over"; } g.drawImage(at, 0, 0, 16, 5, -B * 0.5, -B * 0.08, B, B * 0.31); g.restore(); }
      // частицы
      const crit = tinted("crit", "rgb(230,230,230)"), ench = tinted("ench_hit", "rgb(80,200,255)");
      for (const p of parts) if (p.k === "split") {
        const k = 1 - p.t / 1.1, px = B / 16, OW = 50, OH = 58;
        drawMob(p.kind, 0, 0, -1, B, { ...p.st, noBlit: true });
        const cy = -(p.kind === "creeper" ? 13 : 20) * px, dx = Math.cos(p.an), dy = Math.sin(p.an);
        g.save(); g.translate(X(p.x), Y(p.y)); g.scale(-1, 1); g.imageSmoothingEnabled = false; g.globalAlpha = clamp(p.t * 1.6, 0, 1);
        for (const sd of [-1, 1]) {
          g.save();
          const push = k * B * 0.5, fall = sd > 0 ? k * k * B * 1.2 : k * k * B * 0.2;
          g.translate(-dy * sd * push, dx * sd * push + fall); g.rotate(sd * k * 0.5);
          g.beginPath(); g.moveTo(dx * -999, cy + dy * -999); g.lineTo(dx * 999, cy + dy * 999); g.lineTo(dx * 999 - dy * sd * 999, cy + dy * 999 + dx * sd * 999); g.lineTo(dx * -999 - dy * sd * 999, cy + dy * -999 + dx * sd * 999); g.closePath(); g.clip();
          g.drawImage(off, -OW * px / 2, -OH * px, OW * px, OH * px);
          g.restore();
        }
        g.restore(); g.globalAlpha = 1;
        if (k < 0.35) { const f = 1 - k / 0.35, cx = X(p.x), cyy = Y(p.y) + cy, L = B * 1.1; sliver(g, cx - dx * L, cyy + dy * L, cx + dx * L, cyy - dy * L, B * 0.12 * f + 1, "255,70,100", f, 0.2); }
      }
      for (const p of parts) {
        if (p.k === "split") continue;
        const a = clamp(p.t * 2, 0, 1); g.globalAlpha = a;
        if (p.k === "crit" && crit) g.drawImage(crit, X(p.x) - B * 0.12, Y(p.y) - B * 0.12, B * 0.24, B * 0.24);
        else if (p.k === "ench" && ench) g.drawImage(ench, X(p.x) - B * 0.1, Y(p.y) - B * 0.1, B * 0.2, B * 0.2);
        else if (p.k === "puff") { g.fillStyle = "#ddd"; g.fillRect(X(p.x), Y(p.y), B * 0.14, B * 0.14); }
        else if (p.k === "exp") { const fi = img("exp_" + Math.min(15, Math.floor((0.8 - p.t) / 0.8 * 16))); if (fi.complete) g.drawImage(fi, X(p.x) - B, Y(p.y) - B, B * 2, B * 2); }
        else if (p.k === "sweep") { const fi = img("sweep_" + Math.min(7, Math.floor((0.4 - p.t) / 0.4 * 8))); if (fi.complete) g.drawImage(fi, X(p.x) - B, Y(p.y) - B, B * 2, B * 2); }
        else if (p.k === "zap") { g.strokeStyle = "#a77bff"; g.lineWidth = 3; g.shadowColor = "#a77bff"; g.shadowBlur = 12; g.beginPath(); g.moveTo(X(p.x), Y(p.y)); g.lineTo(X(p.x2), Y(p.y2)); g.stroke(); g.shadowBlur = 0; }
      }
      g.globalAlpha = 1;
      const fnt = getComputedStyle(document.body).getPropertyValue("--f-pixel");
      g.textAlign = "center";
      for (const t of texts) { g.globalAlpha = clamp(t.t, 0, 1); g.font = `${Math.round(B * 0.42)}px ${fnt}`; g.fillStyle = "#000"; g.fillText(t.s, X(t.x) + 2, Y(t.y) + 2); g.fillStyle = t.c; g.fillText(t.s, X(t.x), Y(t.y)); }
      g.globalAlpha = 1;
      // сердца
      const hs = Math.max(12, Math.round(B * 0.42));
      for (let i = 0; i < 10; i++) heart(10 + i * (hs - 1), 10, hs, pl.hp >= (i + 1) * 2 ? 2 : pl.hp >= i * 2 + 1 ? 1 : 0);
      // окно парирования
      if (pAct || performance.now() < pl.parryCd) {
        const now2 = performance.now(), wx = X(pl.x) - B * 0.6, wy = Y(-0.35);
        g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(wx, wy, B * 1.2, 5);
        g.fillStyle = pAct ? "#55ffff" : "#555"; g.fillRect(wx, wy, B * 1.2 * (pAct ? (pl.parryUntil - now2) / WINDOW : 1 - (pl.parryCd - now2) / (WINDOW + CD)), 5);
      }
      $("#prStat").innerHTML = `<span>Парирований: <b>${stats.parries}</b></span><span>Убито: <b>${stats.kills}</b></span><span>Скелетов своей стрелой: <b>${stats.deflect}</b></span><span>ЛКМ по сцене: удар катаной</span>`;
    }
    return { tick(dt, now) {
      if (!vis) return;
      if (stop > 0) stop -= dt;   // стоп-кадр при попадании: удар чувствуется
      else { update(dt); if (cres && (cres.t += dt) > 0.16) cres = null; mobs.forEach((m) => (m.white = Math.max(0, (m.white || 0) - dt))); }
      draw(now); fx.tick(dt);
    } };
  }

  /* ================= III · мировой разрез: разрез горы сбоку ================= */
  function slashSim() {
    const view = $("#ulView"), cv = $("#ulCv"), g = cv.getContext("2d");
    const W = 66, H = 34, YTOP = 21, YBOT = -12;
    const U2 = P.ult;
    const HARD = { grass: 0.6, dirt: 0.5, stone: 1.5, deepslate: 3, coal_ore: 3, iron_ore: 3, gold_ore: 3, diamond_ore: 3, emerald_ore: 3, gravel: 0.6, oak_log: 2, oak_leaves: 0.2,
      obsidian: 50, bedrock: -1, ancient_debris: 30, barrel: 2.5, furnace: 3.5, spawner: 5, enchanting_table: 5, jukebox: 2, anvil: 5 };
    const TEXB = { grass: "grass_side", dirt: "dirt_b", stone: "stone_b", deepslate: "deepslate_b", coal_ore: "coal_ore", iron_ore: "iron_ore", gold_ore: "gold_ore", diamond_ore: "diamond_ore",
      emerald_ore: "emerald_ore", gravel: "gravel", oak_log: "oak_log", oak_leaves: "oak_leaves", obsidian: "obsidian", bedrock: "bedrock", ancient_debris: "debris",
      barrel: "iso/barrel", furnace: "iso/furnace", spawner: "iso/spawner", enchanting_table: "iso/enchanting_table", jukebox: "iso/jukebox", anvil: "iso/anvil" };
    const COL = { grass: "#6a9a3a", dirt: "#866043", stone: "#7d7d7d", deepslate: "#4d4d52", coal_ore: "#555", iron_ore: "#b69d86", gold_ore: "#d8c35a", diamond_ore: "#6ad8d0", emerald_ore: "#3cc76b",
      gravel: "#827d7b", oak_log: "#6d5530", oak_leaves: "#4f7a22", ancient_debris: "#6b4a42", barrel: "#8a6a3a", furnace: "#6d6d6d", spawner: "#1f2d3a", enchanting_table: "#a02234", jukebox: "#6b4a38", anvil: "#444" };
    const BE = new Set(["barrel", "furnace", "spawner", "enchanting_table", "jukebox"]), IMPORTANT = new Set(["anvil", "enchanting_table", "jukebox"]);
    const ORE = new Set(["coal_ore", "iron_ore", "gold_ore", "diamond_ore", "emerald_ore", "ancient_debris"]);
    // дроп как с незеритовой кирки без удачи; опыт: уголь 0–2, алмаз/изумруд 3–7
    const DROP = { grass: "dirt", dirt: "dirt", stone: "cobblestone", deepslate: "cobbled_deepslate", coal_ore: "coal", iron_ore: "raw_iron", gold_ore: "raw_gold", diamond_ore: "diamond",
      emerald_ore: "emerald", gravel: "gravel", oak_log: "oak_log", oak_leaves: null, ancient_debris: "ancient_debris" };
    const XP = { coal_ore: [0, 2], diamond_ore: [3, 7], emerald_ore: [3, 7] };
    const ICON = { dirt: "iso/dirt", cobblestone: "iso/cobblestone", cobbled_deepslate: "iso/cobbled_deepslate", coal: "coal", raw_iron: "raw_iron", raw_gold: "raw_gold", diamond: "diamond",
      emerald: "emerald", gravel: "iso/gravel", oak_log: "iso/oak_log", ancient_debris: "iso/ancient_debris", barrel: "iso/barrel", furnace: "iso/furnace", spawner: "iso/spawner",
      enchanting_table: "iso/enchanting_table", jukebox: "iso/jukebox", anvil: "iso/anvil" };
    const NAME = { dirt: "Земля", cobblestone: "Булыжник", cobbled_deepslate: "Колотый глубинный сланец", coal: "Уголь", raw_iron: "Необработанное железо", raw_gold: "Необработанное золото",
      diamond: "Алмаз", emerald: "Изумруд", gravel: "Гравий", oak_log: "Дубовое бревно", ancient_debris: "Древние обломки", barrel: "Бочка", furnace: "Печь", spawner: "Спавнер",
      enchanting_table: "Стол зачаровывания", jukebox: "Проигрыватель", anvil: "Наковальня" };
    let grid, mobs, items, parts, slash = null, afters = [], tally = {}, xpSum = 0, broken = 0, seed = 1;
    const cutMap = new Map(), wsp = []; let lB = 10, uFlash = 0;   // свежие срезы (раскалённые края), искры, вспышка
    const srand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const at = (x, y) => (x < 0 || x >= W || y < YBOT || y > YTOP ? null : grid[x][y - YBOT]);
    const set = (x, y, v) => { if (x >= 0 && x < W && y >= YBOT && y <= YTOP) grid[x][y - YBOT] = v; };
    function gen() {
      seed = 1 + rnd(1e6);
      grid = Array.from({ length: W }, () => Array(H).fill(null));
      const surf = [];
      for (let x = 0; x < W; x++) {
        let gl = 0;
        if (x >= 9 && x <= 50) gl = Math.round(15 * Math.sin(Math.PI * (x - 9) / 41) + (srand() - 0.5) * 1.6);
        else if (x > 52) gl = Math.round(Math.sin(x * 0.7) * 1.2);
        surf[x] = Math.max(0, gl);
        for (let y = YBOT; y < surf[x]; y++) {
          let b = y === surf[x] - 1 ? "grass" : y >= surf[x] - 3 ? "dirt" : y <= -4 ? "deepslate" : "stone";
          if (y === YBOT || (y === YBOT + 1 && srand() < 0.5)) b = "bedrock";
          if ((b === "stone" || b === "deepslate") && y > YBOT + 1) {
            const r = srand();
            if (r < 0.07) b = "coal_ore"; else if (r < 0.11) b = "iron_ore"; else if (r < 0.125 && y < 6) b = "gold_ore"; else if (r < 0.14 && y < -3) b = "diamond_ore"; else if (r < 0.15 && y > 6) b = "emerald_ore"; else if (r < 0.18) b = "gravel";
          }
          set(x, y, b);
        }
      }
      // обсидиан в горе и немного древних обломков для примера
      for (let x = 36; x <= 37; x++) for (let y = 3; y <= 6; y++) set(x, y, "obsidian");
      set(31, 1, "ancient_debris"); set(44, 3, "ancient_debris");
      // пещера с хранилищами и важными блоками
      for (let x = 20; x <= 30; x++) for (let y = 0; y <= 4; y++) if (at(x, y)) set(x, y, null);
      for (let x = 20; x <= 30; x++) if (at(x, -1) === null) set(x, -1, "stone");
      ["barrel", "furnace", "enchanting_table", "jukebox", "anvil", "spawner"].forEach((b, i) => set(21 + i, 0, b));
      // деревья
      const tree = (x) => { const s = surf[x]; for (let y = s; y < s + 4; y++) set(x, y, "oak_log"); for (let dx = -2; dx <= 2; dx++) for (let dy = 3; dy <= 5; dy++) if (Math.abs(dx) + (dy - 3) < 4 && !at(x + dx, s + dy)) set(x + dx, s + dy, "oak_leaves"); };
      tree(6); tree(57);
      mobs = [
        { kind: "zombie", x: 28.5, y: 0, hp: 20, max: 20, h: 1.95, hit: false },
        { kind: "creeper", x: 14.5, y: surf[14], hp: 20, max: 20, h: 1.7, hit: false },
        { kind: "iron_golem", x: 45.5, y: surf[45], hp: 100, max: 100, h: 2.7, hit: false },
        { kind: "skeleton", x: 60.5, y: surf[60], hp: 20, max: 20, h: 1.99, hit: false },
      ];
      items = []; parts = []; slash = null; afters = []; cutMap.clear(); wsp.length = 0;
    }
    function resetTally() { tally = {}; xpSum = 0; broken = 0; renderTally(); }
    // ------ ломание (breakBlock) ------
    const lvl = () => +$("#ws").value, mining = () => $("#mi").checked;
    function popItem(x, y, name, n = 1) { for (let i = 0; i < n; i++) items.push({ name, x: x + 0.5 + rr(-0.2, 0.2), y: y + 0.5, vx: rr(-1.5, 1.5), vy: rr(2, 4), t: 0, land: false }); tally[name] = (tally[name] || 0) + n; }
    function popXp(x, y, n) { if (n <= 0) return; xpSum += n; for (let i = 0; i < Math.min(n, 4); i++) items.push({ name: "xp", x: x + 0.5, y: y + 0.5, vx: rr(-1.2, 1.2), vy: rr(2, 4), t: 0, land: false }); }
    function crumbs(x, y, b) { for (let i = 0; i < 6; i++) parts.push({ x: x + rr(0.1, 0.9), y: y + rr(0.1, 0.9), vx: rr(-2, 2), vy: rr(0, 3), t: rr(0.4, 0.8), c: COL[b] || "#888" }); }
    let sndBudget = 0;
    function breakBlock(x, y, done) {
      const before = at(x, y); breakBlock0(x, y, done);
      if (before && !at(x, y)) {
        cutMap.set(x + "," + y, 0);
        if (wsp.length < 420 && slash) { const f = slash.vel, an = Math.atan2(-f[1], f[0]); sparkBurst(wsp, (x + 0.5) * lB, (YTOP + 0.5 - y) * lB, 2, lB * 14, pick(["255,255,255", "255,200,150", "200,160,255"]), an + rr(-0.6, 0.6), 0.8); }
      }
    }
    function breakBlock0(x, y, done) {
      const k = x + "," + y; if (done.has(k)) return; const b = at(x, y); if (!b) return;
      const hd = HARD[b]; if (hd < 0 || hd >= U2.hardMax) return;       // бедрок, обсидиан и всё твёрже 40
      if (BE.has(b) || IMPORTANT.has(b)) {                                // гарантированно, с шёлковым касанием
        set(x, y, null); popItem(x, y, b); done.add(k); broken++; if (sndBudget-- > 0) play("wood1", 0.4); return;
      }
      if (mining() && ORE.has(b)) {                                       // Mining Industry: руды всегда
        set(x, y, null); if (DROP[b]) popItem(x, y, DROP[b]); const xr = XP[b]; if (xr) popXp(x, y, xr[0] + rnd(xr[1] - xr[0] + 1)); done.add(k); broken++; return;
      }
      if (!mining()) {                                                    // destroyBlock: крошки и звук, дроп 50/50
        if (Math.random() < U2.dropChance) { if (DROP[b]) popItem(x, y, DROP[b]); const xr = XP[b]; if (xr) popXp(x, y, xr[0] + rnd(xr[1] - xr[0] + 1)); }
        set(x, y, null); crumbs(x, y, b);
        if (sndBudget-- > 0) play(b === "gravel" || b === "dirt" || b === "grass" ? pick(["gravel1", "grass1"]) : b === "oak_log" ? "wood1" : pick(["stone1", "stone2", "stone3"]), 0.35, rr(0.85, 1.15));
      } else set(x, y, null);                                             // removeBlock: молча, без дропа
      done.add(k); broken++;
    }
    // ------ полёт дуги (tick) ------
    function fire() {
      const p = +$("#pitch").value * Math.PI / 180, dir = [Math.cos(p), Math.sin(p)];
      const L = lvl(), start = [2.5 + dir[0] * 1, 0.1];
      slash = { pos: start.slice(), start, dir, vel: [dir[0] * U2.speed, dir[1] * U2.speed], max: U2.dist + L * U2.distLvl, up: U2.up + L * U2.upLvl, done: new Set(), acc: 0 };
      mobs.forEach((m) => (m.hit = false)); afters = [];
    }
    function basis(f) { return { f, u: [-f[1], f[0]] }; }
    function arcPts(base, bs, up) { const pts = []; for (let h = 0; h <= up; h += 0.5) { const b = Math.sin(h / up * Math.PI) * U2.bulge; pts.push([base[0] + bs.u[0] * h + bs.f[0] * b, base[1] + bs.u[1] * h + bs.f[1] * b]); } return pts; }
    function slashTick() {
      const s = slash;
      const trav = Math.hypot(s.pos[0] - s.start[0], s.pos[1] - s.start[1]);
      if (trav > s.max) { slash = null; return; }
      const from = s.pos, to = [from[0] + s.vel[0], from[1] + s.vel[1]], seg = [to[0] - from[0], to[1] - from[1]], ln = Math.hypot(seg[0], seg[1]);
      const bs = basis([seg[0] / ln, seg[1] / ln]);
      sndBudget = 3;
      for (let t = 0; t <= 1.0001; t += 0.1) {
        const base = [from[0] + seg[0] * t, from[1] + seg[1] * t];
        for (let h = 0; h <= s.up + 1e-9; h += 0.75) {
          const bul = Math.sin(h / s.up * Math.PI) * U2.bulge;
          const c = [base[0] + bs.u[0] * h + bs.f[0] * bul, base[1] + bs.u[1] * h + bs.f[1] * bul];
          for (let dd = -0.3; dd <= 0.30001; dd += 0.3) breakBlock(Math.floor(c[0] + bs.f[0] * dd), Math.floor(c[1] + bs.f[1] * dd), s.done);
        }
      }
      // урон по мобам: центр хитбокса внутри дуги
      for (const m of mobs) {
        if (m.hit || m.hp <= 0) continue;
        const pt = [m.x, m.y + m.h / 2];
        for (let t = 0; t <= 1.0001; t += 0.08) {
          const base = [from[0] + seg[0] * t, from[1] + seg[1] * t], rel = [pt[0] - base[0], pt[1] - base[1]];
          const hh = rel[0] * bs.u[0] + rel[1] * bs.u[1]; if (hh < -0.8 || hh > s.up + 0.8) continue;
          const vt = clamp(hh / s.up, 0, 1), exp = Math.sin(vt * Math.PI) * U2.bulge, fw = rel[0] * bs.f[0] + rel[1] * bs.f[1];
          if (Math.abs(fw - exp) <= U2.thick) {
            m.hit = true; m.hp -= U2.dmg; m.hurt = 0.4; shake(view, 6, 200);
            { const cx = m.x * lB, cy = (YTOP + 1 - m.y - m.h / 2) * lB; sparkBurst(wsp, cx, cy, 26, lB * 20, pick(["255,80,100", "255,255,255"])); m.cutFx = { t: 0.5, an: rr(-0.4, 0.4) + Math.PI / 2 }; }
            parts.push({ txt: "-25", x: m.x, y: m.y + m.h + 0.4, vx: 0, vy: 1, t: 1.2 });
            play(m.kind === "iron_golem" ? "golem_hit" : m.kind === "zombie" ? (m.hp <= 0 ? "zomb_death" : "zomb_hurt") : m.kind === "skeleton" ? (m.hp <= 0 ? "skel_death" : "skel_hurt") : m.hp <= 0 ? "creep_death" : "creep_hurt", 0.55);
            break;
          }
        }
      }
      afters.push({ base: from.slice(), bs, up: s.up, a: 1 });
      s.pos = to;
    }
    // ------ ввод: замах и отпускание ------
    let charging = false, chT0 = 0;
    function down() {
      if (charging || slash) return;
      if (!ultReady()) { play("nodamage", 0.4); return; }
      charging = true; chT0 = performance.now(); play("k_charge", 0.9, 0.8); $("#ulCharge").classList.add("on"); $("#ulBtn").classList.add("hot");
    }
    function up() {
      if (!charging) return; charging = false; $("#ulCharge").classList.remove("on"); $("#ulBtn").classList.remove("hot");
      if (performance.now() - chT0 < 1000) return;
      play("k_charged_slash", 1); ultReadyAt = performance.now() + CD_MS; grant("use_ultimate"); fire();
      whoosh(0.8, 0.4, 220, 4000); setTimeout(() => shing(0.45, 2100), 60); shake(view, 12, 420); uFlash = 0.5;
      durSpend(view);
    }
    view.addEventListener("contextmenu", (e) => e.preventDefault());
    cv.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") { e.preventDefault(); down(); } });
    addEventListener("pointerup", up);
    const btn = $("#ulBtn");
    btn.addEventListener("pointerdown", (e) => { e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch (_) {} down(); });
    btn.addEventListener("pointerup", up); btn.addEventListener("pointercancel", up);
    $("#ulReset").onclick = () => { gen(); resetTally(); };
    // выбор уровня: плитки-книги 0, I–V
    const R = ["—", "I", "II", "III", "IV", "V"];
    $("#lvPick").innerHTML = R.map((r, l) => `<button type="button" role="radio" data-l="${l}" data-nosfx class="${l ? "" : "zero"}"><b>${r}</b><small>${U2.dist + l * U2.distLvl}<i>бл</i> · ${U2.up + l * U2.upLvl}<i>↑</i></small></button>`).join("");
    $("#lvPick").addEventListener("click", (e) => {
      const b = e.target.closest("[data-l]"); if (!b) return; const s2 = $("#ws"); if (s2.value === b.dataset.l) return;
      s2.value = b.dataset.l; s2.dispatchEvent(new Event("input"));
      play(+b.dataset.l ? "levelup" : "click", +b.dataset.l ? 0.25 : 0.4, 0.8 + +b.dataset.l * 0.08); shing(0.15, 2600 + +b.dataset.l * 300);
    });
    const wsRender = () => {
      const L = lvl(), D = U2.dist + L * U2.distLvl, Hh = U2.up + L * U2.upLvl;
      $$("#lvPick button").forEach((b) => { const on = +b.dataset.l === L; b.classList.toggle("on", on); b.setAttribute("aria-checked", on); });
      $("#wsQ").innerHTML = `<span><b>${D}</b>блоков вперёд</span><span><b>${Hh}</b>блоков в высоту</span><span class="st">${L ? `уровень ${R[L]}: +${L * U2.distLvl} и +${L * U2.upLvl}` : "без зачарования"}</span>`;
    };
    $("#ws").addEventListener("input", wsRender);
    $("#pitch").addEventListener("input", () => ($("#pitchLbl").textContent = $("#pitch").value + "°"));
    function renderTally() {
      const keys = Object.keys(tally).sort((a, b) => tally[b] - tally[a]);
      $("#dropGrid").innerHTML = keys.length ? keys.map((k) => `<span class="slot12" data-tip="${esc(NAME[k] || k)}"><img class="${ICON[k].startsWith("iso/") ? "" : "px"}" src="${T(ICON[k])}" alt=""><i>${tally[k]}</i></span>`).join("")
        + (xpSum ? `<span class="slot12" data-tip="Опыт"><img class="px" src="${T("xp_orb")}" alt="" style="object-fit:none;object-position:0 0;width:16px;height:16px;transform:scale(2.4)"><i>${xpSum}</i></span>` : "")
        : `<span class="ul-empty">Пока ничего. Зажми замах и отпусти через секунду.</span>`;
      $("#dropSum").textContent = broken ? `сломано ${broken} ${plural(broken, "блок", "блока", "блоков")}` : "";
    }
    let vis = false; new IntersectionObserver((es) => (vis = es[0].isIntersecting)).observe(view);
    function drawMob2(m, X, Y, B) {
      const k = m.kind, px = B / 16;
      g.save(); g.translate(X(m.x), Y(m.y)); g.scale(-1, 1);
      if (m.hurt > 0) g.filter = "sepia(1) saturate(6) hue-rotate(-50deg)";
      if (k === "iron_golem") { const im = img("iron_golem"); if (im.complete) { g.drawImage(im, 60, 70, 6, 16, -3 * px, -16 * px, 6 * px, 16 * px); g.drawImage(im, 0, 52, 11, 18, -5.5 * px, -34 * px, 11 * px, 18 * px); g.drawImage(im, 0, 8, 8, 10, -4 * px, -44 * px, 8 * px, 10 * px); g.drawImage(im, 60, 21, 4, 30, -2 * px, -34 * px, 4 * px, 30 * px); } }
      else {
        const t = k === "zombie" ? "zombie" : k === "skeleton" ? "skeleton" : "creeper", im = img(t);
        if (im.complete) {
          if (k === "creeper") { g.drawImage(im, 0, 20, 4, 6, -2 * px, -6 * px, 4 * px, 6 * px); g.drawImage(im, 16, 20, 4, 12, -2 * px, -18 * px, 4 * px, 12 * px); g.drawImage(im, 0, 8, 8, 8, -4 * px, -26 * px, 8 * px, 8 * px); }
          else { const lw = k === "skeleton" ? 2 : 4; g.drawImage(im, 0, k === "skeleton" ? 18 : 20, lw, 12, -lw / 2 * px, -12 * px, lw * px, 12 * px); g.drawImage(im, 16, 20, 4, 12, -2 * px, -24 * px, 4 * px, 12 * px); g.drawImage(im, 0, 8, 8, 8, -4 * px, -32 * px, 8 * px, 8 * px);
            g.save(); g.translate(0, -22 * px); g.rotate(-1.57); g.drawImage(im, 40, k === "skeleton" ? 18 : 20, lw, 12, -lw / 2 * px, 0, lw * px, 12 * px); g.restore(); }
        }
      }
      g.restore(); g.filter = "none";
      const hx = X(m.x) - B * 0.6, hy = Y(m.y + m.h + 0.25);
      g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(hx, hy, B * 1.2, 3); g.fillStyle = m.hp / m.max > 0.5 ? "#55ff55" : m.hp > 0 ? "#ffff55" : "#ff5555"; g.fillRect(hx, hy, B * 1.2 * clamp(m.hp / m.max, 0, 1), 3);
    }
    function draw(dt, now) {
      const d = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight; if (!w) return;
      if (cv.width !== Math.round(w * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
      g.setTransform(d, 0, 0, d, 0, 0); g.imageSmoothingEnabled = false;
      const B = w / W, X = (x) => x * B, Y = (y) => (YTOP + 1 - y) * B; lB = B;
      const sky = g.createLinearGradient(0, 0, 0, Y(0)); sky.addColorStop(0, "#0b0816"); sky.addColorStop(1, "#261a3a"); g.fillStyle = sky; g.fillRect(0, 0, w, Y(0));
      g.fillStyle = "#0d0a14"; g.fillRect(0, Y(0), w, h - Y(0));
      g.fillStyle = "rgba(241,199,201,.8)"; g.beginPath(); g.arc(X(58), Y(18), B * 2, 0, 7); g.fill();
      for (let x = 0; x < W; x++) for (let y = YBOT; y <= YTOP; y++) {
        const b = at(x, y); if (!b) continue; const t = img(TEXB[b]);
        if (TEXB[b].startsWith("iso/")) { g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(X(x), Y(y + 1), B, B); if (t.complete) g.drawImage(t, X(x) - B * 0.05, Y(y + 1) - B * 0.05, B * 1.1, B * 1.1); }
        else if (t.complete) g.drawImage(t, X(x), Y(y + 1), B + 0.5, B + 0.5);
      }
      // линия дальности
      const L = lvl(), p = +$("#pitch").value * Math.PI / 180, mx = 2.5 + Math.cos(p) * (1 + U2.dist + L * U2.distLvl), my = 0.1 + Math.sin(p) * (U2.dist + L * U2.distLvl);
      g.setLineDash([4, 4]); g.strokeStyle = charging ? `rgba(255,80,110,${0.5 + 0.5 * Math.sin(now / 60)})` : "rgba(224,49,75,.45)"; g.lineWidth = charging ? 2 : 1;
      if (charging && wsp.length < 300) { const a = Math.random() * 6.283, R = B * rr(2, 4), full = now - chT0 >= 1000; sparkBurst(wsp, X(2.9) + Math.cos(a) * R, Y(2.4) + Math.sin(a) * R, 1, R * 2.8, full ? "255,90,110" : "190,150,255", a + Math.PI, 0.1); }
      g.beginPath(); g.moveTo(X(3.5), Y(0.1)); g.lineTo(X(mx), Y(my)); g.stroke();
      g.beginPath(); g.moveTo(X(mx), Y(my)); g.lineTo(X(mx - Math.sin(p) * (U2.up + L * U2.upLvl)), Y(my + Math.cos(p) * (U2.up + L * U2.upLvl))); g.stroke(); g.setLineDash([]);
      // игрок
      const st = img("steve");
      if (st.complete) { const px = B / 16; g.save(); g.translate(X(2.5), Y(0)); g.drawImage(st, 0, 20, 4, 12, -2 * px, -12 * px, 4 * px, 12 * px); g.drawImage(st, 16, 20, 4, 12, -2 * px, -24 * px, 4 * px, 12 * px); g.drawImage(st, 0, 8, 8, 8, -4 * px, -32 * px, 8 * px, 8 * px);
        g.translate(0, -22 * px); g.rotate(charging ? -2.8 : slash ? 0.6 : -0.5); g.drawImage(st, 40, 20, 4, 12, -2 * px, 0, 4 * px, 12 * px); const kb = img("katana_blade"); if (kb.complete) { g.translate(0, 11 * px); g.rotate(charging ? 0 : 1.2); g.drawImage(kb, -1.2 * px, -22 * px, 3 * px, 24 * px); } g.restore(); }
      for (const m of mobs) if (m.hp > 0) drawMob2(m, X, Y, B);
      // дуга и шлейф
      // раскалённые края свежего среза: белый → оранжевый → красный, гаснут за 1,8 с
      g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "square";
      for (const [k, age0] of cutMap) {
        const age = age0 + dt; if (age > 1.8) { cutMap.delete(k); continue; } cutMap.set(k, age);
        const [cx, cy] = k.split(",").map(Number), q = age / 1.8, col = q < 0.15 ? "255,255,255" : q < 0.5 ? "255,170,90" : "224,49,75", a = Math.pow(1 - q, 1.3);
        g.strokeStyle = `rgba(${col},${a})`; g.lineWidth = Math.max(1.5, B * 0.2);
        const x0 = X(cx), x1 = X(cx + 1), y0 = Y(cy + 1), y1 = Y(cy);
        g.beginPath();
        if (at(cx, cy + 1)) { g.moveTo(x0, y0); g.lineTo(x1, y0); }
        if (at(cx, cy - 1)) { g.moveTo(x0, y1); g.lineTo(x1, y1); }
        if (at(cx - 1, cy)) { g.moveTo(x0, y0); g.lineTo(x0, y1); }
        if (at(cx + 1, cy)) { g.moveTo(x1, y0); g.lineTo(x1, y1); }
        g.stroke();
      }
      g.restore();
      // серп дуги: острый на концах, толстый в середине, белая сердцевина
      const crescentArc = (base, bs, up, th, col, a, core = true) => {
        const N = 22, F = [], Bk = [];
        for (let i = 0; i <= N; i++) { const h = up * i / N, tp = Math.pow(Math.sin(Math.PI * i / N), 0.75), bul = Math.sin(Math.PI * i / N) * U2.bulge;
          const c = [base[0] + bs.u[0] * h + bs.f[0] * bul, base[1] + bs.u[1] * h + bs.f[1] * bul];
          F.push([c[0] + bs.f[0] * th * tp, c[1] + bs.f[1] * th * tp]); Bk.push([c[0] - bs.f[0] * th * tp * 0.9, c[1] - bs.f[1] * th * tp * 0.9]); }
        const poly = (sc) => { g.beginPath(); F.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])))); for (let i = N; i >= 0; i--) { const p = F[i], b = Bk[i]; g.lineTo(X(p[0] + (b[0] - p[0]) * sc), Y(p[1] + (b[1] - p[1]) * sc)); } g.closePath(); g.fill(); };
        g.save(); g.globalCompositeOperation = "lighter"; g.shadowColor = `rgba(${col},${a})`; g.shadowBlur = B * 1.5;
        g.fillStyle = `rgba(${col},${a * 0.6})`; poly(1); g.shadowBlur = 0;
        if (core) { g.fillStyle = `rgba(255,255,255,${a})`; poly(0.38); }
        g.restore();
      };
      for (const a of afters) { a.a -= dt * 2.6; if (a.a > 0) crescentArc(a.base, a.bs, a.up, U2.thick * 0.7, "167,123,255", a.a * 0.45, false); }
      afters = afters.filter((a) => a.a > 0);
      if (slash) {
        const seg = slash.vel, ln = Math.hypot(seg[0], seg[1]), bs = basis([seg[0] / ln, seg[1] / ln]);
        // линии скорости позади дуги
        g.save(); g.globalCompositeOperation = "lighter"; g.lineWidth = 1.2;
        for (let i = 0; i < 9; i++) { const h = slash.up * ((i * 0.618 + now / 900) % 1), bul = Math.sin(Math.PI * h / slash.up) * U2.bulge, c = [slash.pos[0] + bs.u[0] * h + bs.f[0] * bul, slash.pos[1] + bs.u[1] * h + bs.f[1] * bul], L2 = 2 + (i % 3) * 1.5;
          g.strokeStyle = `rgba(230,215,255,${0.25 + (i % 3) * 0.15})`; g.beginPath(); g.moveTo(X(c[0] - bs.f[0] * 0.8), Y(c[1] - bs.f[1] * 0.8)); g.lineTo(X(c[0] - bs.f[0] * (0.8 + L2)), Y(c[1] - bs.f[1] * (0.8 + L2))); g.stroke(); }
        g.restore();
        crescentArc(slash.pos, bs, slash.up, U2.thick * 1.6, "224,49,75", 0.55, false);
        crescentArc(slash.pos, bs, slash.up, U2.thick, "200,160,255", 1, true);
      }
      sparkDraw(g, wsp, dt, lB * 30);
      for (const m of mobs) if (m.cutFx && (m.cutFx.t -= dt) > 0) { const cx = X(m.x), cy = Y(m.y + m.h / 2), L = B * m.h * 0.9, an = m.cutFx.an, f = m.cutFx.t / 0.5; sliver(g, cx - Math.cos(an) * L, cy - Math.sin(an) * L, cx + Math.cos(an) * L, cy + Math.sin(an) * L, B * 0.35 * f + 1, "255,60,90", f); }
      if (uFlash > 0) { g.fillStyle = `rgba(255,240,245,${uFlash})`; g.fillRect(0, 0, w, h); uFlash = Math.max(0, uFlash - dt * 2.5); }
      // крошки, предметы, опыт
      for (const q of parts) {
        q.t -= dt; q.x += (q.vx || 0) * dt; q.y += (q.vy || 0) * dt; if (!q.txt) q.vy -= 12 * dt;
        g.globalAlpha = clamp(q.t * 2, 0, 1);
        if (q.txt) { g.font = `${Math.round(B * 1.1)}px ${getComputedStyle(document.body).getPropertyValue("--f-pixel")}`; g.textAlign = "center"; g.fillStyle = "#000"; g.fillText(q.txt, X(q.x) + 2, Y(q.y) + 2); g.fillStyle = "#ff5555"; g.fillText(q.txt, X(q.x), Y(q.y)); }
        else { g.fillStyle = q.c; g.fillRect(X(q.x), Y(q.y), B * 0.22, B * 0.22); }
      }
      g.globalAlpha = 1; parts = parts.filter((q) => q.t > 0);
      const xo = img("xp_orb");
      for (const it of items) {
        it.t += dt;
        if (!it.land) { it.vy -= 18 * dt; it.x += it.vx * dt; it.y += it.vy * dt; const b = at(Math.floor(it.x), Math.floor(it.y - 0.15)); if (b && it.vy < 0) { it.y = Math.floor(it.y - 0.15) + 1.15; it.vy *= -0.3; it.vx *= 0.5; if (Math.abs(it.vy) < 0.8) it.land = true; } if (it.y < YBOT) it.land = true; }
        else if (!at(Math.floor(it.x), Math.floor(it.y - 0.2))) it.land = false;
        const bob = it.land ? Math.sin(now / 300 + it.x) * 0.08 : 0, s = B * 0.62;
        if (it.name === "xp") { if (xo.complete) g.drawImage(xo, 0, 0, 16, 16, X(it.x) - s / 2, Y(it.y + bob) - s / 2, s, s); }
        else { const im = img(ICON[it.name]); if (im.complete) g.drawImage(im, X(it.x) - s / 2, Y(it.y + bob) - s / 2, s, s); }
      }
      items = items.filter((it) => it.t < 6);
      for (const m of mobs) { m.hurt = Math.max(0, (m.hurt || 0) - dt); if (m.hp > 0) { let yy = Math.floor(m.y - 0.01); while (yy > YBOT && !at(Math.floor(m.x), yy)) { m.y = yy; yy--; } } }
    }
    let acc = 0, tallyT = 0;
    gen(); wsRender(); renderTally();
    return { tick(dt, now) {
      if (charging) { const pp = clamp((now - chT0) / 1000, 0, 1); $("#ulCharge").style.setProperty("--p", pp); }
      if (!vis) return;
      if (slash) { acc += dt * ($("#slow").checked ? 2 : 20); while (acc >= 1 && slash) { acc -= 1; slashTick(); } } else acc = 0;
      draw(dt, now);
      if ((tallyT -= dt) <= 0) { tallyT = 0.25; renderTally(); }
    } };
  }

  /* ================= IV · крафт ================= */
  const inv = Object.assign({ katana: 0 }, S.get("p12.inv", {}));
  function craftRender() {
    const R = P.recipe, cells = R.pattern.join("").split("");
    $("#craftGrid").innerHTML = `<span class="ttl">Создание</span>` + cells.map((ch, i) => {
      if (ch === " ") return "";
      const k = R.key[ch];
      return `<span class="c12" style="left:${(30 + (i % 3) * 18) / 176 * 100}%;top:${(17 + Math.floor(i / 3) * 18) / 80 * 100}%"><img src="${T(k.icon)}" alt="" data-tip="${esc(k.name)}" data-tip-sub="${k.id}"></span>`;
    }).join("") + `<span class="c12 res" id="craftRes" style="left:${124 / 176 * 100}%;top:${35 / 80 * 100}%" data-tip="${esc(P.item.name)}" data-tip-sub="${P.item.id}" data-tip-info="клик: забрать"><img src="${T("katana_icon")}" alt=""></span>`;
  }
  function invRender(bump) {
    // стак 1: каждая катана занимает свой слот, как в хотбаре
    $("#inv9").innerHTML = Array.from({ length: 9 }, (_, i) => `<span class="slot12 ${i < inv.katana ? "" : "empty"} ${bump && i === inv.katana - 1 ? "bump" : ""}">${i < inv.katana ? `<img src="${T("katana_icon")}" alt="Катана">` : ""}</span>`).join("");
    $("#craftMsg").innerHTML = inv.katana ? `Катан в инвентаре: <b style="color:#fff">${inv.katana}</b>. Не стакаются: каждая в своём слоте. Дальше <a href="#parry" style="color:#e0314b">парирование</a> и <a href="#ult" style="color:#e0314b">мировой разрез</a>.`
      : `Клик по результату справа забирает катану.`;
  }
  function take() { inv.katana = Math.min(9, inv.katana + 1); S.set("p12.inv", inv); play("k_equip", 0.6); invRender(true); grant("craft_katana"); }
  $("#craftGrid").addEventListener("click", (e) => { if (e.target.closest("#craftRes")) take(); });
  $("#creativeTake").addEventListener("click", take);

  /* ================= V · достижения ================= */
  $("#advBoard").style.setProperty("--tile", `url("${new URL(T("crimson_planks"), location.href).href}")`);
  const FRAME_RU = { task: "обычная", goal: "цель", challenge: "испытание" };
  renderTree = function (pulse) {
    const vis = ADV.filter((a) => got.includes(a.key)), hidden = ADV.length - vis.length;
    if (!advSel || !vis.some((a) => a.key === advSel)) advSel = vis.length ? vis[vis.length - 1].key : null;
    const icon = (a, px) => `<span class="ic" style="width:${px}px;height:${px}px"><img src="${advIcon(a)}" alt="" style="${a.icon === "katana_icon" ? "image-rendering:auto" : ""}"></span>`;
    let html = vis.map((a, i) => (i ? `<div class="adv-link on"></div>` : "") + `<button type="button" class="adv-node ${pulse === a.key ? "pulse" : ""} ${advSel === a.key ? "sel" : ""}" data-k="${a.key}" aria-label="${esc(a.title)}"><span class="adv-frame ${a.frame}"></span>${icon(a, 32)}</button>`).join("");
    if (hidden) html += vis.length ? `<div class="adv-link"></div><div class="adv-more">+${hidden} скрыто</div>` : `<div class="adv-node"><span class="adv-frame task locked"></span><span class="q">?</span></div><div class="adv-link"></div><div class="adv-more">+${hidden} скрыто</div>`;
    $("#advChain").innerHTML = html;
    const a = ADV.find((x) => x.key === advSel);
    $("#advDetail").innerHTML = a
      ? `<div class="big"><span class="adv-frame ${a.frame}"></span>${icon(a, 38)}</div><div class="txt"><div class="tt">${titleH(a)}</div><div class="dd">${esc(a.desc)}</div><div class="cc">${esc(a.how)}</div></div><div class="meta"><span>${FRAME_RU[a.frame]}</span>${a.xp ? `<span>+${a.xp} XP</span>` : ""}</div>`
      : `<div class="big"><span class="adv-frame task locked"></span><span class="q">?</span></div><div class="txt"><div class="tt">Скрыто</div><div class="dd">Все четыре скрыты. Начни с крафта.</div></div>`;
    $("#advList").innerHTML = ADV.map((x) => got.includes(x.key)
      ? `<button type="button" class="adv-row has" data-k="${x.key}"><span class="fr"><span class="adv-frame ${x.frame}"></span>${icon(x, 26)}</span><span><span class="t">${titleH(x)}</span><span class="d">${esc(x.desc)}</span></span></button>`
      : `<div class="adv-row locked mystery"><span class="fr"><span class="adv-frame task locked"></span><span class="q">?</span></span><span><span class="t">???</span><span class="d">скрытое достижение: откроется, когда получишь</span></span></div>`).join("");
    const done = ADV.filter((x) => got.includes(x.key)), xp = done.reduce((s, x) => s + x.xp, 0), xpAll = ADV.reduce((s, x) => s + x.xp, 0);
    $("#advBar").style.width = (done.length / ADV.length) * 100 + "%";
    $("#advTxt").textContent = `${done.length} / ${ADV.length} · ${xp}/${xpAll} XP`;
    $("#stGot").textContent = `${done.length}/${ADV.length}`;
  };
  $("#advQ").textContent = ADV.length + " " + plural(ADV.length, "ачивка", "ачивки", "ачивок");
  const pickAdv = (e) => { const n = e.target.closest("[data-k]"); if (!n) return; advSel = n.dataset.k; renderTree(); };
  $("#advChain").addEventListener("click", pickAdv); $("#advList").addEventListener("click", pickAdv);
  $("#advReset").addEventListener("click", () => { got = []; S.set("p12.adv", got); advSel = null; renderTree(); });

  /* ================= зачарования (Энчант-апдейт) ================= */
  const ROM = ["", "I", "II", "III", "IV", "V"];
  function enchRender() {
    const [ws, mi] = P.enchants, U2 = P.ult;
    $("#enchGrid").innerHTML = `
      <div class="en12" id="enWs">
        <div class="en12-top"><img src="${T("enchanted_book")}" alt=""><div><div class="en12-n">${esc(ws.name)} <em id="enWsL">I</em></div>
          <div class="en12-tags"><span class="r">${ws.rarity}</span><span>I–V</span><span>катана и книга</span><span>стол, сундуки, жители</span></div></div></div>
        <p>${esc(ws.text)}</p>
        <div class="en12-lv" id="enWsLv">${[1, 2, 3, 4, 5].map((l) => `<button type="button" data-l="${l}">${ROM[l]}</button>`).join("")}</div>
        <div class="gr12">стоимость на столе (сила зачарования)</div>
        <div class="en12-cost"><i id="enWsBar"></i><b id="enWsTxt"></b></div>
        <div class="en12-scale"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span></div>
        <svg class="en12-arc" id="enWsArc" viewBox="0 0 640 170" aria-hidden="true"></svg>
        <div class="en12-note" id="enWsNote"></div>
      </div>
      <div class="en12" id="enMi">
        <div class="en12-top"><img src="${T("enchanted_book")}" alt=""><div><div class="en12-n">${esc(mi.name)}</div>
          <div class="en12-tags"><span class="r">${mi.rarity}</span><span>только I</span><span>катана и книга</span><span>стол, сундуки, жители</span></div></div></div>
        <p>${esc(mi.text)}</p>
        <div class="gr12">стоимость на столе (сила зачарования)</div>
        <div class="en12-cost"><i style="left:${15 / 80 * 100}%;width:${25 / 80 * 100}%"></i><b style="left:${15 / 80 * 100}%">15–40</b></div>
        <div class="en12-scale"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span></div>
        <div class="en12-note">Работает только с ультой: обычные удары катаны блоки не ломают вообще.</div>
        <label class="tog2" style="margin-top:12px"><input type="checkbox" id="enMiTog"><span></span><b>Включить в симуляторе выше</b></label>
      </div>`;
    const setL = (l, fromSlider) => {
      const [a, b] = ws.cost(l), dist = U2.dist + l * U2.distLvl, up = U2.up + l * U2.upLvl;
      $$("#enWsLv button").forEach((x) => x.classList.toggle("on", +x.dataset.l === l));
      $("#enWsL").textContent = ROM[l];
      $("#enWsBar").style.cssText = `left:${a / 80 * 100}%;width:${(b - a) / 80 * 100}%`;
      const t = $("#enWsTxt"); t.style.left = a / 80 * 100 + "%"; t.textContent = `${a}–${b}`;
      $("#enWsNote").textContent = l >= 4 ? "Порог выше 30: со стола 30 уровня такое выпадает редко или никогда. Надёжнее собрать на наковальне: две книги одного уровня дают следующий." : "Со стола 30 уровня выпадает нормально.";
      // схема: игрок, дуга, дальность и высота в масштабе
      const k = 600 / 62, x0 = 24, gy = 150, pts = [];
      for (let i = 0; i <= 20; i++) { const h = up * i / 20, bul = Math.sin(Math.PI * i / 20) * U2.bulge; pts.push([x0 + (dist + bul) * k, gy - h * k * 0.62]); }
      const f = pts.map((p) => p.join(",")).join(" ");
      $("#enWsArc").innerHTML = `<defs><linearGradient id="enG" x1="0" x2="1"><stop offset="0" stop-color="#6d4bd1" stop-opacity="0"/><stop offset="1" stop-color="#e0314b" stop-opacity=".55"/></linearGradient></defs>
        <rect x="0" y="${gy}" width="640" height="20" fill="#2a2238"/>
        <rect x="${x0}" y="${gy - up * k * 0.62}" width="${dist * k}" height="${up * k * 0.62}" fill="url(#enG)" opacity=".35"/>
        <polyline points="${f}" fill="none" stroke="#e0314b" stroke-width="7" stroke-linecap="round" opacity=".45"/>
        <polyline points="${f}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
        <rect x="${x0 - 5}" y="${gy - 18}" width="10" height="18" fill="#3aa0c8"/><rect x="${x0 - 5}" y="${gy - 26}" width="10" height="8" fill="#c79b7a"/>
        <text x="${x0 + dist * k / 2}" y="${gy + 15}" fill="#ece6f5" font-size="13" text-anchor="middle" font-family="monospace">${dist} блоков</text>
        <text x="${x0 + dist * k + 10}" y="${gy - up * k * 0.31}" fill="#ece6f5" font-size="13" font-family="monospace">${up} ↕</text>`;
      if (!fromSlider) { const s = $("#ws"); s.value = l; s.dispatchEvent(new Event("input")); }
    };
    $("#enWsLv").addEventListener("click", (e) => { const b = e.target.closest("[data-l]"); if (b) { setL(+b.dataset.l); play("click", 0.4); } });
    $("#ws").addEventListener("input", () => { const v = +$("#ws").value; if (v) setL(v, true); });
    setL(Math.max(1, +$("#ws").value || 1), true);
    const mt = $("#enMiTog"), m = $("#mi"); mt.checked = m.checked;
    mt.addEventListener("change", () => { m.checked = mt.checked; }); m.addEventListener("change", () => { mt.checked = m.checked; });
  }

  /* ================= правила, история, финал ================= */
  $("#ruGrid").innerHTML = P.rules.map(([ic, t, p]) => `<div class="ru12"><img src="${T(ic)}" alt="" style="${ic === "katana_icon" ? "image-rendering:auto" : ""}"><b>${esc(t)}</b><p>${esc(p)}</p></div>`).join("");
  $("#timeline").innerHTML = P.history.map((h) => `<div class="tl12" style="--c:${h.c}"><img class="${h.icon === "katana_icon" ? "hi" : ""}" src="${T(h.icon)}" alt=""><div>
    <div class="tl12-top"><span class="tl12-v">${h.ver === h.date ? esc(h.date) : "v" + esc(h.ver)}</span>${h.ver !== h.date ? `<span class="tl12-d">${esc(h.date)}</span>` : ""}<span class="tl12-t">${esc(h.tag)}</span></div><b>${esc(h.title)}</b><p>${esc(h.text)}</p></div></div>`).join("");
  const nav = ZM.pointNav(12);
  $("#finNav").innerHTML = [nav.prev && `<a href="${U(nav.prev.href)}">← №${String(nav.prev.n).padStart(2, "0")} ${esc(nav.prev.title)}</a>`,
    `<a href="${U("index.html")}">Все пункты</a>`,
    nav.next && `<a href="${U(nav.next.href)}">№${String(nav.next.n).padStart(2, "0")} ${esc(nav.next.title)} →</a>`].filter(Boolean).join("");
  const fin = $("#finCut");
  fin.addEventListener("click", () => {
    if (fin.classList.contains("cut")) { fin.classList.remove("cut"); play("k_equip", 0.5); return; }
    fin.classList.add("cut"); slashSnd(); whoosh(0.7, 0.3, 300, 4000); setTimeout(() => shing(0.5, 2400), 50);
    const fr = $("#finFx").getBoundingClientRect(), br = fin.getBoundingClientRect(), x0 = br.left - fr.left - 60, x1 = br.right - fr.left + 60, yc = br.top - fr.top + br.height * 0.52, dy = Math.tan(4.5 * Math.PI / 180) * (x1 - x0) / 2;
    finFx.cut(x0, yc + dy, x1, yc - dy, { w: 9, life: 0.8, sparks: 40, bend: 0.3 }); finFx.flash(0.18); shake(fin, 8, 300);
  });
  const finFx = mkFX($("#finFx"));

  /* ================= разрезы по всей странице ================= */
  const pfx = mkFX($("#pageFx")); let touched = false;
  addEventListener("pointerdown", () => (touched = true), { capture: true, once: true });
  // клик по пустому месту: короткий разрез в точке клика
  document.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || reduce) return;
    if (e.target.closest("button,a,input,label,canvas,select,textarea,.st-view,.pr-view,.ul-view,.cg12,.adv-board,.zm-topbar,.inv9,.slot12")) return;
    const a = rr(-0.9, 0.9) + (Math.random() < 0.5 ? 0 : Math.PI), L = rr(80, 150), x = e.clientX, y = e.clientY;
    pfx.cut(x - Math.cos(a) * L, y - Math.sin(a) * L, x + Math.cos(a) * L, y + Math.sin(a) * L, { w: 4, life: 0.42, sparks: 14 });
    whoosh(0.3, 0.14, 600, 3600); shing(0.1, rr(3000, 3800));
  });
  // заголовок секции разрезается, когда впервые появляется на экране
  const headIO = new IntersectionObserver((es) => es.forEach((en) => {
    if (!en.isIntersecting) return; headIO.unobserve(en.target);
    const h2 = en.target.querySelector("h2"); if (!h2 || reduce) return;
    setTimeout(() => {
      const r = h2.getBoundingClientRect(), tilt = Math.tan(-3 * Math.PI / 180) * (r.width + 80), yy = r.top + r.height * 0.56;
      pfx.cut(r.left - 40, yy - tilt / 2, r.right + 40, yy + tilt / 2, { w: 5, life: 0.55, sparks: 18, bend: 0.3 });
      h2.classList.remove("sliced"); void h2.offsetWidth; h2.classList.add("sliced");
      if (touched) whoosh(0.22, 0.18, 500, 3000);
    }, 250);
  }), { threshold: 0.8 });
  $$(".sec-head").forEach((h) => headIO.observe(h));

  /* ================= цикл ================= */
  syncSnd(); bgBuild(); craftRender(); invRender(); renderTree(); hudRender();
  const loops = [heroView(), stanceView(), arena(), slashSim()].filter(Boolean);
  enchRender();
  ZM.reveal();
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    bgFrame(dt, now); hudRender();
    loops.forEach((l) => l.tick(dt, now)); if (finFx.busy) finFx.tick(dt); if (pfx.busy) pfx.tick(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  ZM.p12 = { grant, take, resetCd() { ultReadyAt = 0; }, get got() { return got; } };
})();
