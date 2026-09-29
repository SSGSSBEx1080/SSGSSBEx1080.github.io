/* =====================================================================
   №08 · Made in Heaven
   Всё поведение взято из кода мода: MadeInHeavenItem, MadeInHeavenHandler,
   ModEnchantments. Данные: data/p08_mih.js, механика: mod-src/java/p08/MECHANICS.md
   ===================================================================== */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = ZM.esc, U = ZM.url, S = ZM.store, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (n) => Math.floor(Math.random() * n), pick = (a) => a[rnd(a.length)], lerp = (a, b, t) => a + (b - a) * t;
  const P = ZM.P08, TK = P.T;
  const T = (n) => U(`assets/textures/p8/${n}.png`);
  const fmt = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString("ru-RU", { maximumFractionDigits: d });
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const imgs = {};
  const IMG = (n) => imgs[n] || (imgs[n] = Object.assign(new Image(), { src: T(n) }));

  ZM.topbar({ crumb: "№08 · Made in Heaven", ...ZM.pointNav(8) });

  /* ================= звук ================= */
  const EXT = new Audio().canPlayType("audio/ogg; codecs=vorbis") ? "ogg" : "mp3";
  const MASTER_VOLUME = 0.4;
  const LIB = { hurt: ["death"] };
  let sndOn = S.get("p08.snd", true);
  const pool = {};
  const CORE = ["click", "pop", "orb", "levelup", "stone", "hit", "page", "equip", "enchant", "toast_in", "challenge"];
  function play(name, vol = 1, rate = 1) {
    if (!sndOn) return null;
    if (CORE.includes(name)) return ZM.sfx(name, vol, rate);
    const f = LIB[name] ? pick(LIB[name]) : name;
    const url = U(`assets/sounds/p08/${f}.${EXT}`);
    try {
      const a = (pool[url] || (pool[url] = new Audio(url))).cloneNode();
      a.volume = clamp(vol * MASTER_VOLUME, 0, 1); a.playbackRate = rate; a.preservesPitch = false;
      a.play().catch(() => {});
      return a;
    } catch (e) { return null; }
  }
  // музыка активации: отдельный плеер, ровно 47 секунд = 940 тиков
  const music = new Audio(U(`assets/sounds/p08/madeinheaven.${EXT}`));
  music.preload = "auto";
  const MUSIC_VOL = 0.85;
  const bSnd = $("#sndBtn");
  const syncSnd = () => { bSnd.setAttribute("aria-pressed", sndOn); bSnd.classList.toggle("on", sndOn); music.volume = sndOn ? MUSIC_VOL : 0; };
  bSnd.onclick = () => { sndOn = !sndOn; S.set("p08.snd", sndOn); syncSnd(); if (sndOn) play("click", 0.6); };
  ZM.sfx.bind(() => sndOn);
  syncSnd();

  /* ================= чат Minecraft ================= */
  const MC = { 0: "#000000", 4: "#aa0000", 6: "#ffaa00", 7: "#aaaaaa", 8: "#555555", a: "#55ff55", b: "#55ffff", c: "#ff5555", d: "#ff55ff", e: "#ffff55", f: "#ffffff", 5: "#aa00aa" };
  const col = (c, t, bold) => `<span style="color:${MC[c]}${bold ? ";font-weight:700" : ""}">${esc(t)}</span>`;
  const chatEl = $("#chat");
  function chat(html, life = 9000) {
    const p = document.createElement("p"); p.innerHTML = html; chatEl.appendChild(p);
    while (chatEl.children.length > 7) chatEl.firstChild.remove();
    setTimeout(() => p.classList.add("old"), life); setTimeout(() => p.remove(), life + 1200);
  }

  /* ================= ачивки ================= */
  const ADV = P.advancements;
  let got = S.get("p08.adv", []).filter((k) => ADV.some((a) => a.key === k));
  let advSel = null, renderTree = () => {};
  const FRAME_CHAT = { task: "получил достижение", goal: "достиг цели", challenge: "выполнил испытание" };
  function grant(key) {
    const a = ADV.find((x) => x.key === key);
    if (!a || got.includes(key)) return;
    got.push(key); S.set("p08.adv", got);
    ZM.toast({ iconHtml: `<img class="pixel" src="${T(a.icon)}" alt="" style="width:100%;height:100%;object-fit:contain">`, title: `<span style="color:${MC[a.color]};${a.bold ? "font-weight:700;letter-spacing:.02em" : ""}">${esc(a.title)}</span>`, frame: a.frame });
    if (a.chat) chat(`Игрок ${FRAME_CHAT[a.frame]} ${col(a.frame === "challenge" ? "5" : "a", "[" + a.title + "]")}`);
    advSel = key; renderTree(key);
  }

  /* ================= кривая времени (из MadeInHeavenHandler) ================= */
  function inc(t) {                      // сколько тиков времени прибавляется за тик t
    if (t >= TK.reset) return 0;
    const p = t / TK.reset;
    if (p < 0.7) return Math.floor(20 + Math.pow(p, 1.8) * 1000);
    if (p < 0.9) return Math.floor(500 + ((p - 0.7) / 0.2) * 1500);
    if (p < 0.97) return Math.floor(2000 + Math.pow((p - 0.9) / 0.07, 2) * 6000);
    return Math.floor(8000 + Math.pow((p - 0.97) / 0.03, 3) * 10000);
  }
  const INC = [], CUM = [0];
  for (let t = 0; t < TK.total; t++) { INC.push(inc(t)); CUM.push(CUM[t] + INC[t]); }
  const TOTAL_DAYS = CUM[TK.reset] / 24000;
  $("#factDays").textContent = Math.round(TOTAL_DAYS);
  const speedAt = (t) => { const p = t / TK.reset; for (const [lim, v] of P.speed) if (p < lim) return v; return 8; };
  function shakeAt(t) {
    if (t < TK.shake || t >= TK.reset) return 0;
    const s = (t - TK.shake) / TK.shakeLen;
    return s < 1 / 3 ? lerp(0, 0.2, s * 3) : s < 2 / 3 ? lerp(0.2, 0.6, (s - 1 / 3) * 3) : lerp(0.6, 1.4, (s - 2 / 3) * 3);
  }

  /* ================= небо Minecraft ================= */
  const sky = $("#sky"), sx = sky.getContext("2d");
  const now0 = new Date();
  let dayTime = (((now0.getHours() - 6 + 24) % 24) * 1000 + (now0.getMinutes() / 60) * 1000) | 0;   // 06:00 = 0, как в игре; дальше 20 тиков в секунду
  const heavenEl = document.querySelector(".heaven");
  let gameTime = 0, rain = 0, rainTarget = 0, sunScr = { x: 0.5, y: 0.1, br: 1 };
  const STARS = Array.from({ length: 1500 }, () => { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()); return { a, r, s: Math.random() < 0.15 ? 2 : 1, b: 0.4 + Math.random() * 0.6 }; });
  // карта облаков 256×256 (environment/clouds.png), 1 бит на клетку
  const CL = (() => { try { const b = atob(ZM.P08CLOUDS || ""), a = new Uint8Array(65536); for (let i = 0; i < 65536; i++) a[i] = (b.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1; return b.length ? a : null; } catch (e) { return null; } })();
  const celestial = (dt) => { const d = ((dt / 24000 - 0.25) % 1 + 1) % 1, e = 0.5 - Math.cos(d * Math.PI) / 2; return (d * 2 + e) / 3; };
  const clockStr = (dt) => { const h = (Math.floor(dt / 1000) + 6) % 24, m = Math.floor(((dt % 1000) / 1000) * 60); return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0"); };
  function sizeSky() { const k = innerWidth < 700 ? 0.5 : 0.5; sky.width = Math.ceil(innerWidth * k); sky.height = Math.ceil(innerHeight * k); drawSky(); }
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  function drawSky(shx = 0, shy = 0) {
    const W = sky.width, H = sky.height, hz = H * 0.8;
    const ang = celestial(dayTime), th = ang * Math.PI * 2, cs = Math.cos(th);
    const br = clamp(cs * 2 + 0.5, 0, 1);
    let top = [120, 167, 255].map((v) => v * br), fog = [192, 216, 255].map((v) => v * (br * 0.94 + 0.06));
    if (rain > 0) { const g = (c) => { const l = (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) * 0.6; return mix(c, [l, l, l], rain * 0.75); }; top = g(top); fog = g(fog); }
    top = top.map((v) => Math.max(v, 4)); fog = fog.map((v) => Math.max(v, 8));
    sx.setTransform(1, 0, 0, 1, shx, shy);
    const gr = sx.createLinearGradient(0, 0, 0, H), hk = hz / H;
    gr.addColorStop(0, rgb(top)); gr.addColorStop(hk * 0.72, rgb(mix(top, fog, 0.5))); gr.addColorStop(hk, rgb(fog)); gr.addColorStop(1, rgb(fog.map((v) => v * 0.6)));
    sx.fillStyle = gr; sx.fillRect(-20, -20, W + 40, H + 40);
    // звёзды крутятся вместе с небом
    const star = Math.pow(clamp(1 - (cs * 2 + 0.25), 0, 1), 2) * 0.5 * (1 - rain);
    if (star > 0.01) {
      const R = Math.hypot(W, H);
      sx.fillStyle = "#fff";
      for (const s of STARS) {
        const a = s.a + th, x = W / 2 + Math.cos(a) * s.r * R, y = hz + Math.sin(a) * s.r * R;
        if (y > hz || x < 0 || x > W || y < 0) continue;
        sx.globalAlpha = star * s.b; sx.fillRect(x | 0, y | 0, s.s, s.s);
      }
      sx.globalAlpha = 1;
    }
    // рассвет и закат
    if (Math.abs(cs) < 0.4) {
      const g = (cs / 0.4) * 0.5 + 0.5, a = Math.pow(1 - (1 - Math.sin(g * Math.PI)) * 0.99, 2) * (1 - rain * 0.8);
      const c = [(g * 0.3 + 0.7) * 255, (g * g * 0.7 + 0.2) * 255, 0.2 * 255];
      const east = Math.sin(th) < 0;   // утром солнце слева
      const rg = sx.createRadialGradient(east ? 0 : W, hz, 0, east ? 0 : W, hz, W * 0.9);
      rg.addColorStop(0, rgb(c, a * 0.85)); rg.addColorStop(1, rgb(c, 0));
      sx.fillStyle = rg; sx.fillRect(0, 0, W, hz + 4);
    }
    // солнце и луна
    const R = Math.min(W * 0.42, hz * 0.8), cx = W / 2, sz = Math.round(Math.min(W, H) * 0.3);   // диск занимает центр текстуры
    const bodyA = 1 - rain;
    sx.imageSmoothingEnabled = false;
    const sun = IMG("sun"), moon = IMG("moon_phases");
    const sxp = cx + Math.sin(th) * R, syp = hz - Math.cos(th) * R;
    sunScr = { x: sxp / W, y: syp / H, br: br * (1 - rain) };
    // облачное море рая живёт по тем же суткам: темнеет ночью, краснеет на закате
    if (!document.body.classList.contains("mih-sky")) {
      const dusk = Math.abs(cs) < 0.4 ? Math.sin(((cs / 0.4) * 0.5 + 0.5) * Math.PI) : 0;
      heavenEl.style.setProperty("--hvF", `brightness(${(0.22 + br * 0.78).toFixed(3)}) saturate(${(0.55 + br * 0.45 + dusk * 0.4).toFixed(3)}) sepia(${(dusk * 0.45).toFixed(3)}) hue-rotate(${(dusk * -12 + (1 - br) * 18).toFixed(1)}deg)`);
      const nt = document.body.classList.contains("night");
      if (!nt && br < 0.32) document.body.classList.add("night"); else if (nt && br > 0.4) document.body.classList.remove("night");
    }
    if (sun.complete && syp < hz + sz) { sx.globalAlpha = bodyA; sx.globalCompositeOperation = "lighter"; sx.drawImage(sun, sxp - sz / 2, syp - sz / 2, sz, sz); sx.globalCompositeOperation = "source-over"; }
    const mxp = cx - Math.sin(th) * R, myp = hz + Math.cos(th) * R, ph = Math.floor(dayTime / 24000) % 8;
    if (myp < hz && br < 0.8) {   // лунный ореол, чтобы ночь в раю была серебряной
      const mg = sx.createRadialGradient(mxp, myp, 0, mxp, myp, sz * 2.2), ma = (1 - br) * 0.32 * bodyA;
      mg.addColorStop(0, `rgba(220,230,255,${ma})`); mg.addColorStop(1, "rgba(220,230,255,0)");
      sx.fillStyle = mg; sx.fillRect(mxp - sz * 2.2, myp - sz * 2.2, sz * 4.4, sz * 4.4);
    }
    if (moon.complete && myp < hz + sz) { sx.globalAlpha = bodyA; sx.globalCompositeOperation = "lighter"; sx.drawImage(moon, (ph % 4) * 32, Math.floor(ph / 4) * 32, 32, 32, mxp - sz / 2, myp - sz / 2, sz, sz); sx.globalCompositeOperation = "source-over"; }
    sx.globalAlpha = 1;
    // облака: слой над головой в перспективе, как в игре снизу. Их двигает gameTime,
    // а не время суток, поэтому при ускорении они плывут как обычно
    if (CL) {
      const cb = br * 0.9 + 0.1, cc = mix([255, 255, 255], [150, 150, 160], rain).map((v) => v * cb);
      const K = hz * 0.55, cs = 0.3, drift = gameTime * 0.0025 * 2;   // 0,03 блока за тик, клетка = 12 блоков
      sx.fillStyle = rgb(cc);
      for (let j = 0; ; j++) {
        const z0 = 1.2 + j * cs, z1 = z0 + cs, y0 = Math.round(hz - K / z0), y1 = Math.round(hz - K / z1);
        if (hz - y1 < 2) break;
        const row = ((j + 90) & 255) * 256, zm = (z0 + z1) / 2, sc = K / zm;
        // ближние ряды тают сверху, дальние в тумане у горизонта
        sx.globalAlpha = 0.7 * clamp((j + 1) / 5, 0, 1) * clamp(1 - (zm - 1.2) / 13, 0, 1) * (1 - rain * 0.3);
        if (sx.globalAlpha < 0.02) break;
        const wl = (-W / 2) / sc, wr = (W / 2) / sc, k0 = Math.floor(wl / cs + drift) - 1, k1 = Math.ceil(wr / cs + drift) + 1;
        const X = (k) => Math.round(W / 2 + (k - drift) * cs * sc);
        for (let k = k0; k <= k1; k++) {
          if (!CL[row + (k & 255)]) continue;
          let e = k; while (e + 1 <= k1 && CL[row + ((e + 1) & 255)]) e++;   // сплошной отрезок без швов
          sx.fillRect(X(k), y0, X(e + 1) - X(k), y1 - y0);
          k = e;
        }
      }
      sx.globalAlpha = 1;
    }
    // дождь
    if (rain > 0.02) {
      sx.strokeStyle = `rgba(170,190,230,${0.35 * rain})`; sx.lineWidth = 1; sx.beginPath();
      const t = performance.now() / 1000;
      for (let i = 0; i < 160 * rain; i++) { const x = (i * 97.3 + t * 40) % W, y = (i * 53.1 + t * 520) % H; sx.moveTo(x, y); sx.lineTo(x - 2, y + 9); }
      sx.stroke();
    }
    sx.setTransform(1, 0, 0, 1, 0, 0);
  }
  addEventListener("resize", sizeSky);
  IMG("sun").onload = IMG("moon_phases").onload = () => drawSky();
  sizeSky();
  addEventListener("scroll", () => document.body.classList.toggle("scrolled", scrollY > innerHeight * 0.6), { passive: true });

  /* ================= лучи рая (god rays) и перья ================= */
  const rays = $("#rays"), rg = rays.getContext("2d");
  const BEAMS = Array.from({ length: 26 }, (_, i) => ({ a: (i / 26) * Math.PI * 2 + Math.random() * 0.2, w: 0.035 + Math.random() * 0.07, sp: (Math.random() - 0.5) * 0.02, ph: Math.random() * 6, len: 0.8 + Math.random() * 0.6 }));
  const FEATH = Array.from({ length: 7 }, () => ({ x: Math.random(), y: Math.random(), s: 18 + Math.random() * 16, v: 0.012 + Math.random() * 0.02, ph: Math.random() * 6, r: Math.random() * 6 }));
  const MOTES = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), v: 0.004 + Math.random() * 0.012, s: Math.random() < 0.2 ? 3 : 2, ph: Math.random() * 6 }));
  function sizeRays() { rays.width = Math.ceil(innerWidth / 2); rays.height = Math.ceil(innerHeight / 2); }
  addEventListener("resize", sizeRays); sizeRays();
  let raySrc = { x: 0.5, y: 0.04 }, rayI = 1;
  function drawRays(t, dt) {
    const W = rays.width, H = rays.height;
    rg.clearRect(0, 0, W, H);
    // источник: солнце на фоне рая, во время активации — солнце Minecraft
    const tgt = { x: sunScr.x, y: sunScr.y, i: Math.pow(sunScr.br, 1.5) * 1.1 };   // лучи всегда от настоящего солнца
    const k = Math.min(1, dt * (mih.active ? 12 : 2));
    raySrc.x += (tgt.x - raySrc.x) * k; raySrc.y += (tgt.y - raySrc.y) * k; rayI += (tgt.i - rayI) * k;
    const cx = raySrc.x * W, cy = raySrc.y * H, L = Math.hypot(W, H) * 1.1, sp = mih.active ? 6 : 1;
    rg.globalCompositeOperation = "lighter";
    for (const b of BEAMS) {
      b.a += b.sp * dt * sp;
      const pulse = 0.55 + 0.45 * Math.sin(t / 1000 * 0.6 * sp + b.ph), a0 = b.a - b.w / 2, a1 = b.a + b.w / 2, len = L * b.len;
      const g = rg.createRadialGradient(cx, cy, 0, cx, cy, len);
      const al = 0.16 * pulse * rayI;
      g.addColorStop(0, `rgba(255,244,205,${al * 1.6})`); g.addColorStop(0.35, `rgba(255,226,150,${al})`); g.addColorStop(1, "rgba(255,226,150,0)");
      rg.fillStyle = g; rg.beginPath(); rg.moveTo(cx, cy); rg.arc(cx, cy, len, a0, a1); rg.closePath(); rg.fill();
    }
    const core = rg.createRadialGradient(cx, cy, 0, cx, cy, H * 0.45);
    core.addColorStop(0, `rgba(255,250,225,${0.55 * rayI})`); core.addColorStop(1, "rgba(255,250,225,0)");
    rg.fillStyle = core; rg.fillRect(0, 0, W, H);
    rg.globalCompositeOperation = "source-over";
    // золотые искры в воздухе
    for (const m of MOTES) {
      m.y -= m.v * dt * sp * 0.4; if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t / 700 + m.ph));
      rg.fillStyle = `rgba(255,236,170,${0.8 * tw})`; rg.fillRect((m.x * W + Math.sin(t / 2000 + m.ph) * 6) | 0, (m.y * H) | 0, m.s, m.s);
    }
    // перья падают, покачиваясь
    const fe = IMG("feather");
    if (fe.complete) {
      rg.imageSmoothingEnabled = false;
      for (const f of FEATH) {
        f.y += f.v * dt * (mih.active ? 4 : 1); if (f.y > 1.08) { f.y = -0.08; f.x = Math.random(); }
        const sw = Math.sin(t / 1400 + f.ph);
        rg.save(); rg.translate(f.x * W + sw * 24, f.y * H); rg.rotate(sw * 0.6 + f.r); rg.globalAlpha = 0.85;
        rg.drawImage(fe, -f.s / 4, -f.s / 4, f.s / 2, f.s / 2); rg.restore();
      }
      rg.globalAlpha = 1;
    }
  }

  /* ================= эффект частиц вокруг предмета ================= */
  const fx = $("#fxCv"), fc = fx.getContext("2d");
  const parts = [];
  let lasers = [];
  function sizeFx() { const r = fx.getBoundingClientRect(); fx.width = Math.max(200, Math.round(r.width / 2)); fx.height = fx.width; }
  addEventListener("resize", sizeFx); sizeFx();
  function spawnParts(n, spread, speed) {
    const W = fx.width;
    for (let i = 0; i < n; i++) {
      // вокруг циферблата, а не поверх него
      const a = Math.random() * Math.PI * 2, r = W * (0.2 + Math.random() * 0.14) * (spread > 50 ? 1.15 : 1);
      parts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.9, vx: Math.cos(a + 1.3) * speed, vy: Math.sin(a + 1.3) * speed - 0.2, life: 0, max: 40 + rnd(40), kind: "p_endrod_gold" });
    }
  }
  function drawFx(t) {
    const W = fx.width, H = fx.height, cx = W / 2, cy = H * 0.4;
    fc.clearRect(0, 0, W, H);
    fc.imageSmoothingEnabled = false;
    for (const L of lasers) {
      const a = 1 - L.life / L.max;
      fc.strokeStyle = `rgba(255,236,170,${a})`; fc.lineWidth = 3; fc.shadowColor = "#d4a23a"; fc.shadowBlur = 12;
      fc.beginPath(); fc.moveTo(cx, cy); fc.lineTo(cx + Math.cos(L.a) * W, cy + Math.sin(L.a) * W); fc.stroke();
      L.life++;
    }
    fc.shadowBlur = 0;
    lasers = lasers.filter((L) => L.life < L.max);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy -= 0.004; p.life++;
      const fr = Math.min(7, Math.floor((p.life / p.max) * 8)), im = IMG(p.kind), s = Math.max(4, Math.round(W / 60));
      if (im.complete) { fc.globalAlpha = 1 - p.life / p.max * 0.6; fc.drawImage(im, fr * 8, 0, 8, 8, Math.round(cx + p.x - s / 2), Math.round(cy + p.y - s / 2), s, s); }
    }
    fc.globalAlpha = 1;
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life >= parts[i].max) parts.splice(i, 1);
  }

  /* ================= хотбар и инвентарь ================= */
  let inv = S.get("p08.inv", 1);
  const hb = $("#hotbar");
  function renderHotbar() {
    hb.innerHTML = Array.from({ length: 9 }, (_, i) => `<span class="hs" style="left:${((3 + i * 20) / 182) * 100}%">${i === 0 && inv > 0 ? `<img src="${T("made_in_heaven")}" alt="Made in Heaven">${inv > 1 ? `<b>${inv}</b>` : ""}` : ""}</span>`).join("") + `<i class="sel" style="left:${(-1 / 182) * 100}%"></i>`;
    $("#invN").textContent = inv;
    $("#itSlot").innerHTML = `<img src="${T("made_in_heaven")}" alt="">`;
    const u = $("#useBtn");
    if (!mih.active) { $("#useTxt").textContent = inv > 0 ? "Активировать" : "Скрафтить новый"; }
  }
  const setInv = (n) => { inv = clamp(n, 0, 64); S.set("p08.inv", inv); renderHotbar(); };

  /* ================= АКТИВАЦИЯ ================= */
  const mih = { active: false, tick: -1, t0: 0, raf: 0, buff: null };
  const world = $("#world"), hud = $("#hud");
  function activate() {
    if (mih.active) { chat(col("c", P.msg.busy)); play("click", 0.4, 0.6); return; }
    if (inv <= 0) { $("#item").scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); return; }
    setInv(inv - 1);
    Object.assign(mih, { active: true, tick: -1, t0: performance.now(), buff: null });
    rainTarget = 0; rain = 0;                                // ясная погода на старте
    document.body.classList.add("mih", "mih-sky"); document.body.classList.remove("night");
    cardShow("standCard");
    hud.hidden = false; $("#dieBtn").hidden = false;
    $("#useTxt").textContent = "Идёт...";
    try { music.currentTime = 0; music.volume = sndOn ? MUSIC_VOL : 0; music.play().catch(() => {}); } catch (e) {}
    chat(col("6", P.msg.on));
    grant("activate_mih");
    spawnParts(40, 30, 1.2);
  }
  function stopMih(reason) {
    mih.active = false;
    document.body.classList.remove("mih", "mih-sky", "menace");
    hud.hidden = true; $("#dieBtn").hidden = true;
    world.style.transform = "";
    try { music.pause(); } catch (e) {}
    if (reason === "dead") chat(col("c", P.msg.dead));
    renderHotbar();
  }
  function stepTick(t) {
    if (t < TK.reset) {
      dayTime += INC[t];
      // погода: после 80% меняется каждые 30 тиков, 70% ясно / 30% дождь
      const p = t / TK.reset;
      if (p > TK.weatherFrom && t % TK.weatherEvery === 0) { rainTarget = Math.random() < 0.3 ? 1 : 0; if (rainTarget) play("rain", 0.25); }
      if (t >= TK.lasers && t % 3 === 0) lasers.push({ a: Math.random() * Math.PI * 2, life: 0, max: 14 });
      if (t % 2 === 0) spawnParts(t > 500 ? 5 : 2, 40, 0.5 + p * 1.5);
    } else if (t === TK.reset) {
      universeReset();
    } else {
      dayTime = Math.floor(dayTime / 24000) * 24000 + 6000;   // после сброса держится полдень
      rainTarget = 0;
    }
  }
  function universeReset() {
    $("#flash").classList.remove("go"); void $("#flash").offsetWidth; $("#flash").classList.add("go");
    dayTime = Math.floor(dayTime / 24000) * 24000 + 6000; rainTarget = 0; rain = 0;
    world.style.transform = "";
    document.body.classList.remove("mih-sky", "menace");     // новая вселенная — снова рай
    setTimeout(() => cardShow("cycleCard"), 700);
    chat(col("f", P.msg.reset, true), 12000);
    const e = pick(P.effects); mih.buff = e;
    setTimeout(() => chat(col("e", P.msg.buff) + col("6", e.name), 12000), 900);
    setTimeout(() => showBuff(P.effects.indexOf(e)), 900);
    // сброс на карте 08.4 тоже случается, если она уже видна
    runReset(true);
    grant("universe_reset");
  }
  function endMih() {
    stopMih("end");
    const tbc = $("#tbc"); tbc.classList.add("on"); document.body.classList.add("sepia");
    setTimeout(() => { tbc.classList.remove("on"); document.body.classList.remove("sepia"); }, 3800);
  }
  $("#useBtn").addEventListener("click", activate);
  $("#heroItem").addEventListener("contextmenu", (e) => { e.preventDefault(); activate(); });
  $("#dieBtn").addEventListener("click", () => { if (!mih.active) return; play("hurt", 0.8); stopMih("dead"); });

  /* ================= общий цикл ================= */
  let lastSky = 0, lastT = performance.now();
  function loop(now) {
    const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    gameTime += dt * 20;
    let shx = 0, shy = 0;
    if (mih.active) {
      const tk = Math.floor((now - mih.t0) / 50);
      while (mih.tick < tk && mih.tick < TK.total - 1) { mih.tick++; stepTick(mih.tick); }
      const frac = clamp((now - mih.t0) / 50 - mih.tick, 0, 1);
      const t = mih.tick;
      // тряска камеры
      const sh = shakeAt(t);
      document.body.classList.toggle("menace", sh > 0);
      if (sh > 0 && !reduce) { shx = (Math.random() - 0.5) * sh * 14; shy = (Math.random() - 0.5) * sh * 14; world.style.transform = `translate(${shx.toFixed(1)}px,${shy.toFixed(1)}px)`; }
      else world.style.transform = "";
      renderHud(t, frac);
      if (tk >= TK.total) endMih();
    } else {
      dayTime += dt * 20;
    }
    rain += (rainTarget - rain) * Math.min(1, dt * (mih.active ? 6 : 1));
    if (mih.active || now - lastSky > 200) { drawSky(shx / 2, shy / 2); lastSky = now; }
    if (!mih.active && Math.random() < 0.06) spawnParts(1, 60, 0.25);
    drawFx(now);
    if (!reduce || mih.active) drawRays(now, dt);
    requestAnimationFrame(loop);
  }
  function renderHud(t, frac) {
    const day = Math.floor(dayTime / 24000) + 1;
    $("#hudDay").textContent = "День " + day;
    $("#hudTime").textContent = clockStr(dayTime % 24000);
    $("#hudX").textContent = t < TK.reset ? "×" + INC[t].toLocaleString("ru-RU") : "полдень";
    $("#hudBar").style.width = Math.min(100, ((t + frac) / TK.reset) * 100) + "%";
    $("#hudTick").textContent = `тик ${t} / ${TK.total}`;
    const np = Math.min(PRIMES.length, 1 + Math.floor(t / 20));
    if (np !== renderHud.np) { renderHud.np = np; $("#hudPrimes").textContent = PRIMES.slice(0, np).join(" · ") + " …"; }
    $("#hudSpd").textContent = t < TK.reset ? "скорость ×" + fmt(speedAt(t)) : "эффект: " + (mih.buff ? mih.buff.name : "...");
    const st = t < TK.lasers ? "разгон" : t < TK.shake ? "лазеры" : t < TK.reset ? "тряска " + fmt(shakeAt(t), 2) : "новая вселенная";
    $("#hudStage").textContent = st;
    const fr = Math.floor(celestial(dayTime) * 64) % 64;
    $("#hudClock").style.backgroundPosition = `${(fr / 63) * 100}% 0`;
  }
  const PRIMES = []; for (let n = 2; PRIMES.length < 60; n++) if (PRIMES.every((p) => n % p)) PRIMES.push(n);
  function cardShow(id) { const c = $("#" + id); c.classList.remove("on"); void c.offsetWidth; c.classList.add("on"); }
  // ゴゴゴ по краям экрана во время тряски
  $("#gogo").innerHTML = Array.from({ length: 10 }, (_, i) => { const l = i % 2 ? 78 + Math.random() * 14 : 2 + Math.random() * 14, tp = 10 + (i >> 1) * 17; return `<i style="left:${l}%;top:${tp}%;--r:${i % 2 ? 12 : -12}deg;animation-delay:${(i * 0.13).toFixed(2)}s">ゴ</i>`; }).join("");
  $("#qPrimes").textContent = P.quotes.primes; $("#qFate").textContent = P.quotes.fate;
  renderHotbar();
  requestAnimationFrame(loop);

  /* ================= I · ДНЕВНИК DIO: 14 слов ================= */
  const ROM = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV"];
  $("#drWords").innerHTML = P.words.map(([jp, ro, ru], i) => `<button type="button" class="dr-w" data-i="${i}" data-nosfx><i>${ROM[i]}</i><span class="jp${jp.length > 5 ? " long" : ""}">${esc(jp)}</span><b>${esc(ro)}</b><small>${esc(ru)}</small></button>`).join("");
  let drN = 0, drTimer = 0;
  function drSet(n) {
    drN = n; $$("#drWords .dr-w").forEach((w, i) => w.classList.toggle("on", i < n));
    $("#drBar").style.width = (n / 14) * 100 + "%"; $("#drTxt").textContent = `${n} / 14`;
    $("#drDone").hidden = n < 14;
    if (n === 14) { play("levelup", 0.5); play("beacon_on", 0.5); $("#craftGui").classList.add("glow"); }
  }
  function drPick(i) {
    if (drN >= 14) { drSet(0); }
    if (i === drN) { play("shimmer", 0.5, 0.7 + drN * 0.05); drSet(drN + 1); }
    else if (i >= drN) { const w = $$("#drWords .dr-w")[i]; w.classList.remove("bad"); void w.offsetWidth; w.classList.add("bad"); play("click", 0.4, 0.6); drSet(0); }
  }
  $("#drWords").addEventListener("click", (e) => { const w = e.target.closest(".dr-w"); if (w) { clearInterval(drTimer); drPick(+w.dataset.i); } });
  $("#drAuto").addEventListener("click", () => { clearInterval(drTimer); drSet(0); drTimer = setInterval(() => { if (drN >= 14) return clearInterval(drTimer); drPick(drN); }, 420); });

  // карточка стенда: шестиугольник как в JoJo
  {
    const ST = P.stand.stats, V = { A: 5, B: 4, C: 3, D: 2, E: 1, "∞": 5.6 }, R = 150, c = 200;
    const pt = (i, r) => { const a = -Math.PI / 2 + (i / 6) * Math.PI * 2; return [c + Math.cos(a) * r, c + Math.sin(a) * r]; };
    let svg = `<svg viewBox="-40 -10 480 420" role="img" aria-label="Параметры стенда"><defs><linearGradient id="stG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d2"/><stop offset=".5" stop-color="#e9c46a"/><stop offset="1" stop-color="#b8862b"/></linearGradient></defs>`;
    for (let k = 5; k >= 1; k--) svg += `<polygon points="${[0, 1, 2, 3, 4, 5].map((i) => pt(i, (R * k) / 5).join(",")).join(" ")}" fill="${k % 2 ? "rgba(255,255,255,.75)" : "rgba(214,235,255,.6)"}" stroke="rgba(201,152,46,.45)" stroke-width="1"/>`;
    for (let i = 0; i < 6; i++) { const [x, y] = pt(i, R); svg += `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="rgba(201,152,46,.35)"/>`; }
    svg += `<polygon class="st-poly" points="${ST.map(([, g], i) => pt(i, (R * V[g]) / 5).join(",")).join(" ")}" fill="url(#stG)" fill-opacity=".72" stroke="#8a6414" stroke-width="2.5" stroke-linejoin="round"/>`;
    ST.forEach(([n, g], i) => { const [x, y] = pt(i, R + 34); svg += `<text x="${x}" y="${y - 4}" text-anchor="middle" font-family="Cinzel,serif" font-weight="900" font-size="26" fill="${g === "∞" ? "#7b4fd6" : "#8a6414"}">${g}</text><text x="${x}" y="${y + 14}" text-anchor="middle" font-family="Rubik,sans-serif" font-size="10.5" fill="#4f5d7a">${esc(n)}</text>`; });
    $("#stHex").innerHTML = svg + "</svg>";
    $("#stGrades").innerHTML = ST.map(([n, g]) => `<div><b class="${g === "∞" ? "inf" : ""}">${g}</b><span>${esc(n)}</span></div>`).join("");
  }

  /* ================= II · ПРЕДМЕТ ================= */
  $("#itTip").innerHTML = `<div class="n">${esc(P.name)}</div>` + P.tooltip.map((l) => `<div class="l">${esc(l)}</div>`).join("") + `<div class="id">${esc(P.id)}</div>`;
  const gui = $("#craftGui");
  function renderCraft() {
    gui.classList.remove("used");
    gui.innerHTML = `<span class="cg-t">Создание</span>` + P.recipe.p.join("").split("").map((c, i) => { const g = P.recipe.key[c]; return `<span class="cg" style="left:${(30 + (i % 3) * 18) / 176 * 100}%;top:${(17 + Math.floor(i / 3) * 18) / 80 * 100}%" data-tip="${esc(g.name)}" data-tip-sub="minecraft:${g.id}"><img src="${T(g.icon)}" alt=""></span>`; }).join("")
      + `<span class="cg res" style="left:${124 / 176 * 100}%;top:${35 / 80 * 100}%" data-tip="${esc(P.name)}" data-tip-sub="${P.id}" role="button" tabindex="0" aria-label="Забрать Made in Heaven"><img src="${T("made_in_heaven")}" alt=""></span>`;
  }
  renderCraft();
  function craft() {
    if (gui.classList.contains("used")) return;
    gui.classList.add("used"); gui.classList.remove("glow");
    const res = gui.querySelector(".res"); res.classList.add("empty");
    play("pop", 0.7); setInv(inv + 1);
    grant("craft_mih");
    setTimeout(renderCraft, 1100);
  }
  gui.addEventListener("click", (e) => { if (e.target.closest(".res")) craft(); });
  gui.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.closest(".res")) { e.preventDefault(); craft(); } });

  /* ================= 08.2 ХРОНОМЕТР ================= */
  const cv = $("#cvPlot"), cx2 = cv.getContext("2d"), rng = $("#cvRange");
  const PH = [[0, 504, "#7b4fd6", "плавный разгон"], [504, 648, "#3f93dc", "линейно"], [648, 699, "#c9982e", "квадрат"], [699, 720, "#e0603a", "куб"], [720, 940, "#e9c46a", "полдень"]];
  function drawPlot() {
    const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
    const W = cv.width, H = cv.height, L = 52 * d, B = 26 * d, Tp = 10 * d, Rr = 10 * d;
    const X = (t) => L + (t / TK.total) * (W - L - Rr), Y = (v) => H - B - ((Math.log10(Math.max(v, 10)) - 1) / (Math.log10(20000) - 1)) * (H - B - Tp);
    cx2.clearRect(0, 0, W, H);
    cx2.font = `${11 * d}px Rubik, sans-serif`; cx2.fillStyle = "#6a7590"; cx2.strokeStyle = "rgba(27,41,70,.08)"; cx2.lineWidth = 1;
    for (const v of [10, 100, 1000, 10000]) { const y = Y(v); cx2.beginPath(); cx2.moveTo(L, y); cx2.lineTo(W - Rr, y); cx2.stroke(); cx2.fillText(v.toLocaleString("ru-RU"), 4 * d, y + 4 * d); }
    for (let s = 0; s <= 47; s += r.width < 600 ? 10 : 5) { const x = X(s * 20); cx2.fillText(s + " с", x - 8 * d, H - 8 * d); }
    // обычная игра: 1 тик за тик
    cx2.setLineDash([4 * d, 4 * d]); cx2.strokeStyle = "rgba(27,41,70,.3)"; cx2.beginPath(); cx2.moveTo(L, Y(10)); cx2.lineTo(W - Rr, Y(10)); cx2.stroke(); cx2.setLineDash([]);
    for (const [a, b, c] of PH) {
      cx2.fillStyle = c + "1c"; cx2.fillRect(X(a), Tp, X(b) - X(a), H - B - Tp);
      if (a >= 720) continue;
      cx2.strokeStyle = c; cx2.lineWidth = 2.5 * d; cx2.beginPath();
      for (let t = a; t <= Math.min(b, 719); t++) { const x = X(t), y = Y(INC[t]); t === a ? cx2.moveTo(x, y) : cx2.lineTo(x, y); }
      cx2.stroke();
    }
    cx2.fillStyle = "#8a6414"; cx2.font = `italic 700 ${17 * d}px Cormorant, serif`; cx2.fillText("полдень", X(790), Y(3000));
    // метки событий
    for (const [t, n, c] of [[500, "лазеры", "#d0707a"], [520, "тряска", "#c83a3a"], [720, "сброс", "#8a6414"]]) {
      cx2.strokeStyle = c; cx2.lineWidth = 1 * d; cx2.beginPath(); cx2.moveTo(X(t), Tp); cx2.lineTo(X(t), H - B); cx2.stroke();
      cx2.fillStyle = c; cx2.font = `${10.5 * d}px Rubik, sans-serif`; cx2.fillText(n, X(t) + 4 * d, Tp + 12 * d + (t === 520 ? 14 * d : 0));
    }
    // маркер
    const t = +rng.value, v = t < 720 ? INC[t] : 0, x = X(t), y = t < 720 ? Y(v) : Y(10);
    cx2.strokeStyle = "rgba(27,41,70,.55)"; cx2.lineWidth = 1.5 * d; cx2.beginPath(); cx2.moveTo(x, Tp); cx2.lineTo(x, H - B); cx2.stroke();
    cx2.fillStyle = "#1b2946"; cx2.beginPath(); cx2.arc(x, y, 5 * d, 0, Math.PI * 2); cx2.fill();
  }
  function readCurve() {
    const t = +rng.value, v = t < 720 ? INC[t] : 0, days = CUM[Math.min(t, 720)] / 24000;
    const dayIn = v ? 24000 / (v * 20) : Infinity;
    const cell = (k, val, g) => `<div><span>${k}</span><b class="${g ? "g" : ""}">${val}</b></div>`;
    $("#cvRead").innerHTML = cell("секунда", fmt(t / 20) + " с") + cell("за один тик", t < 720 ? "+" + v.toLocaleString("ru-RU") : "стоп", 1)
      + cell("сутки проходят за", t < 720 ? (dayIn >= 60 ? fmt(dayIn / 60) + " мин" : fmt(dayIn, dayIn < 1 ? 2 : 1) + " с") : "полдень") + cell("пролетело суток", fmt(days))
      + cell("скорость бега", t < 720 ? "×" + fmt(speedAt(t)) : "обычная") + cell("тряска", shakeAt(t) ? fmt(shakeAt(t), 2) : "нет");
  }
  rng.addEventListener("input", () => { drawPlot(); readCurve(); });
  addEventListener("resize", drawPlot);
  let cvAnim = 0;
  $("#cvPlay").addEventListener("click", (e) => {
    if (cvAnim) { cancelAnimationFrame(cvAnim); cvAnim = 0; e.currentTarget.textContent = "▶ проиграть за 47 с"; return; }
    const t0 = performance.now() - (+rng.value >= 939 ? 0 : +rng.value * 50), btn = e.currentTarget; btn.textContent = "❚❚ пауза";
    const f = (n) => { const t = Math.floor((n - t0) / 50); rng.value = Math.min(940, t); drawPlot(); readCurve(); if (t < 940) cvAnim = requestAnimationFrame(f); else { cvAnim = 0; btn.textContent = "▶ проиграть за 47 с"; } };
    cvAnim = requestAnimationFrame(f);
  });
  drawPlot(); readCurve();

  /* ================= 08.3 ОТРАЖЕНИЕ ================= */
  const rf = $("#rfCv"), rc = rf.getContext("2d");
  const RW = 640, RH = 440, BL = 16, PX = RW / 2, PY = RH / 2, RING = P.reflectRadius * BL;
  rf.width = RW; rf.height = RH;
  let rfOn = true, rfN = 0, rfK = 0, rfH = 0, hearts = 20, hurtT = 0;
  const SHOOTERS = [
    { face: "skeleton_face", name: "Скелет", proj: "arrow", sp: 5.2, every: 1.9 },
    { face: "skeleton_face", name: "Скелет", proj: "arrow", sp: 5.2, every: 2.3 },
    { face: "blaze_face", name: "Ифрит", proj: "fire_charge", sp: 3.1, every: 3.1 },
    { face: "steve_face", name: "Чужой игрок", proj: "trident", sp: 4.2, every: 3.7 },
  ];
  const mobs = SHOOTERS.map((s, i) => ({ ...s, a: (i / SHOOTERS.length) * Math.PI * 2 + 0.4, d: 12 + Math.random() * 2, cd: 0.8 + i * 0.6, hit: 0 }));
  const projs = [], sparks = [];
  $("#rfLegend").innerHTML = [["skeleton_face", "arrow", "Скелет", "стрела"], ["blaze_face", "fire_charge", "Ифрит", "огненный шар"], ["steve_face", "trident", "Чужой игрок", "трезубец"]]
    .map(([f, p, n, pn]) => `<div><img src="${T(f)}" alt=""><img src="${T(p)}" alt=""><b>${n}</b><span>${pn}</span></div>`).join("") + `<div><span style="margin:0">Кликни по арене, чтобы бросить снежок из этой точки</span><img src="${T("snowball")}" alt="" style="margin-left:auto"></div>`;
  const mobPos = (m) => [PX + Math.cos(m.a) * m.d * BL, PY + Math.sin(m.a) * m.d * BL * 0.62];
  function shoot(x, y, proj, sp, from) {
    const dx = PX - x, dy = PY - y, l = Math.hypot(dx, dy), j = (Math.random() - 0.5) * 0.08;
    const a = Math.atan2(dy, dx) + j;
    projs.push({ x, y, vx: Math.cos(a) * sp * BL, vy: Math.sin(a) * sp * BL, kind: proj, own: "mob", from, t: 0 });
    play(proj === "arrow" ? "bow" : proj === "fire_charge" ? "fireball" : proj === "trident" ? "trident" : "bow", 0.35, proj === "snowball" ? 1.4 : 1);
  }
  rf.addEventListener("click", (e) => {
    const r = rf.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * RW, y = ((e.clientY - r.top) / r.height) * RH;
    if (Math.hypot(x - PX, y - PY) < RING + 8) return;
    shoot(x, y, "snowball", 6, null);
  });
  $("#rfTog").addEventListener("click", (e) => {
    rfOn = !rfOn; e.currentTarget.setAttribute("aria-checked", rfOn);
    $("#rfTogS").textContent = rfOn ? "время ускорено" : "обычный мир";
    play(rfOn ? "beacon_on" : "beacon_off", 0.5);
  });
  function heartsHtml() {
    let h = "";
    for (let i = 0; i < 10; i++) { const v = hearts - i * 2; h += `<img src="${U("assets/textures/mc/ui/" + (v >= 2 ? "heart_full" : v === 1 ? "heart_half" : "heart_bg") + ".png")}" alt="">`; }
    $("#rfHud").innerHTML = h;
  }
  heartsHtml();
  const grass = IMG("grass_top");
  let rfVis = false, rfLast = 0;
  new IntersectionObserver(([e]) => { rfVis = e.isIntersecting; if (rfVis) { rfLast = performance.now(); requestAnimationFrame(rfLoop); } }).observe(rf);
  function rfLoop(now) {
    if (!rfVis) return;
    const dt = Math.min(0.05, (now - rfLast) / 1000); rfLast = now;
    // логика
    for (const m of mobs) {
      m.cd -= dt; m.hit = Math.max(0, m.hit - dt);
      m.a += dt * 0.05;
      if (m.cd <= 0) { const [x, y] = mobPos(m); shoot(x, y, m.proj, m.sp, m); m.cd = m.every * (0.8 + Math.random() * 0.5); }
    }
    for (const p of projs) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.t += dt;
      const d = Math.hypot(p.x - PX, p.y - PY);
      if (p.own !== "player" && rfOn && d < RING) {
        // разворот: скорость не меньше 1,5 блока за тик, хозяином становится игрок
        const v = Math.hypot(p.vx, p.vy), nv = Math.max(v, 6.5 * BL);
        p.vx = (-p.vx / v) * nv; p.vy = (-p.vy / v) * nv; p.own = "player";
        rfN++; $("#rfN").textContent = rfN;
        for (let i = 0; i < 12; i++) { const a = Math.random() * Math.PI * 2; sparks.push({ x: p.x, y: p.y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, l: 0 }); }
        play("shimmer", 0.6, 0.9 + Math.random() * 0.3);
      } else if (p.own !== "player" && d < 12) {
        p.dead = true; rfH++; $("#rfH").textContent = rfH; hurtT = 0.3;
        hearts -= p.kind === "fire_charge" ? 5 : p.kind === "trident" ? 8 : p.kind === "snowball" ? 0 : 3;
        if (hearts <= 0) { hearts = 20; chat(col("f", "Игрок был застрелен"), 4000); }
        heartsHtml(); play("hurt", 0.5);
      }
      if (p.own === "player" && p.from) {
        const [mx, my] = mobPos(p.from);
        if (Math.hypot(p.x - mx, p.y - my) < 14) { p.dead = true; p.from.hit = 0.4; rfK++; $("#rfK").textContent = rfK; play("hit", 0.6); }
      }
      if (p.x < -40 || p.x > RW + 40 || p.y < -40 || p.y > RH + 40) p.dead = true;
    }
    for (let i = projs.length - 1; i >= 0; i--) if (projs[i].dead) projs.splice(i, 1);
    // рисуем
    rc.imageSmoothingEnabled = false;
    if (grass.complete) { for (let y = 0; y < RH; y += 32) for (let x = 0; x < RW; x += 32) rc.drawImage(grass, x, y, 32, 32); }
    rc.fillStyle = "rgba(255,248,220,.08)"; rc.fillRect(0, 0, RW, RH);
    // кольцо отражения
    rc.save(); rc.translate(PX, PY);
    if (rfOn) {
      const pulse = 0.5 + Math.sin(now / 300) * 0.2;
      rc.fillStyle = `rgba(245,240,208,${0.08 + pulse * 0.06})`; rc.beginPath(); rc.arc(0, 0, RING, 0, Math.PI * 2); rc.fill();
      rc.strokeStyle = "rgba(242,193,78,.9)"; rc.lineWidth = 2; rc.setLineDash([8, 6]); rc.lineDashOffset = -now / 40; rc.beginPath(); rc.arc(0, 0, RING, 0, Math.PI * 2); rc.stroke(); rc.setLineDash([]);
      rc.fillStyle = "#f5f0d0"; rc.font = "12px Tiny5, monospace"; rc.textAlign = "center"; rc.fillText("4,5 блока", 0, -RING - 6);
    } else { rc.strokeStyle = "rgba(255,255,255,.18)"; rc.lineWidth = 1; rc.beginPath(); rc.arc(0, 0, RING, 0, Math.PI * 2); rc.stroke(); }
    rc.restore();
    // игрок и мобы
    const face = (n, x, y, s, red) => { const im = IMG(n); if (!im.complete) return; rc.fillStyle = "rgba(0,0,0,.35)"; rc.fillRect(x - s / 2 + 3, y - s / 2 + 3, s, s); rc.drawImage(im, x - s / 2, y - s / 2, s, s); if (red) { rc.fillStyle = `rgba(255,0,0,${red})`; rc.fillRect(x - s / 2, y - s / 2, s, s); } };
    face("steve_face", PX, PY, 28, hurtT > 0 ? 0.45 : 0); hurtT = Math.max(0, hurtT - dt);
    for (const m of mobs) { const [x, y] = mobPos(m); face(m.face, x, y, 26, m.hit > 0 ? 0.5 : 0); }
    // снаряды
    for (const p of projs) {
      const im = IMG(p.kind); if (!im.complete) continue;
      rc.save(); rc.translate(p.x, p.y);
      if (p.kind === "arrow" || p.kind === "trident") rc.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 4);
      if (p.own === "player") { rc.shadowColor = "#f2c14e"; rc.shadowBlur = 12; }
      const s = p.kind === "trident" ? 30 : 22;
      rc.drawImage(im, -s / 2, -s / 2, s, s);
      rc.restore();
    }
    for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.l += dt; rc.fillStyle = `rgba(255,248,214,${1 - s.l * 2})`; rc.fillRect(s.x | 0, s.y | 0, 3, 3); }
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].l > 0.5) sparks.splice(i, 1);
    requestAnimationFrame(rfLoop);
  }

  /* ================= 08.4 СБРОС ВСЕЛЕННОЙ ================= */
  const rs = $("#rsCv"), rx = rs.getContext("2d"), N = 41, C = 16, MID = 20;
  rs.width = rs.height = N * C;
  const REG = ZM.P08REG || [], regImg = IMG("registry");
  const FIG = ["angel", "anime", "black", "blue", "booba", "buddha", "demon", "galactic", "golden", "green", "japanese", "neon", "purple", "rainbow", "red", "russian", "striped", "top_hat", "white", "yellow", "kazakh", "litvin", "black_white", "faseless", "anonymous", "ukrainian"];
  const p6 = (n) => { const k = "p6_" + n; return imgs[k] || (imgs[k] = Object.assign(new Image(), { src: U(`assets/textures/p6/icons/${n}.png`) })); };
  let seedW = 8;
  function srand(s) { return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  let ground, obj, anim = null;
  function genWorld() {
    const R = srand(seedW); ground = []; obj = [];
    const at = (x, z) => (z + MID) * N + (x + MID);
    for (let z = -MID; z <= MID; z++) for (let x = -MID; x <= MID; x++) {
      const n = Math.sin(x * 0.35 + seedW) * Math.cos(z * 0.3) + R() * 0.6;
      ground.push({ b: n > 1.05 ? "dirt" : n < -1.1 ? "stone" : "grass_top" }); obj.push(null);
    }
    // пруд
    for (let z = -MID; z <= MID; z++) for (let x = -MID; x <= MID; x++) {
      const e = Math.hypot((x + 10) / 5.5, (z - 8) / 4.2);
      if (e < 1) ground[at(x, z)].b = "water"; else if (e < 1.35) ground[at(x, z)].b = "sand";
    }
    // дом
    const hx0 = 4, hx1 = 12, hz0 = -12, hz1 = -5;
    for (let z = hz0; z <= hz1; z++) for (let x = hx0; x <= hx1; x++) {
      const edge = x === hx0 || x === hx1 || z === hz0 || z === hz1, corner = (x === hx0 || x === hx1) && (z === hz0 || z === hz1);
      ground[at(x, z)].b = corner ? "oak_log_top" : edge ? "cobblestone" : "oak_planks";
    }
    ground[at(8, hz1)].b = "oak_planks"; obj[at(8, hz1)] = "oak_door";
    ground[at(5, hz0 + 1)].b = "bookshelf"; ground[at(6, hz0 + 1)].b = "bookshelf"; ground[at(11, hz0 + 1)].b = "crafting_table";
    obj[at(10, hz0 + 3)] = "white_bed"; obj[at(5, hz1 - 1)] = "torch"; obj[at(11, hz1 - 1)] = "torch";
    // дорожка к игроку
    for (let z = hz1 + 1; z <= 0; z++) { ground[at(8 - Math.round((z - hz1) * 0.6), z)].b = "gravel"; ground[at(9 - Math.round((z - hz1) * 0.6), z)].b = "gravel"; }
    // деревья
    for (const [tx, tz] of [[-14, -12], [-6, -16], [15, 6], [13, 15], [-16, 17], [-3, 14]]) {
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { if (Math.abs(dx) + Math.abs(dz) > 3) continue; const i = at(clamp(tx + dx, -MID, MID), clamp(tz + dz, -MID, MID)); ground[i].b = "oak_leaves"; obj[i] = null; }
      ground[at(tx, tz)].b = "oak_log_top";
    }
    // цветы и факелы
    for (let i = 0; i < 46; i++) { const x = Math.floor(R() * N) - MID, z = Math.floor(R() * N) - MID, k = at(x, z); if (ground[k].b === "grass_top" && !obj[k] && Math.hypot(x, z) > 1.5) obj[k] = ["poppy", "dandelion", "oxeye_daisy"][Math.floor(R() * 3)]; }
    for (const [x, z] of [[-3, -3], [3, 3], [-8, 2], [2, -9]]) obj[at(x, z)] = "torch";
    ground.forEach((g) => { g.orig = g.b; g.t = 0; });
    obj = obj.map((o) => o);
    extras = [];
  }
  let extras = [];
  const SAFE_NO = new Set(["water"]);
  const OBJ_TIP = P.names;
  let mode = "none";
  const MODES = {
    none: { name: "Без чар", sub: () => "радиус 8 / 20 · ваниль + ZitraksMode", icon: "made_in_heaven" },
    yobyr: { name: P.ench.yobyr.name, sub: () => "радиус 2 / 5 · 80% хентай-блок", icon: "enchanted_book", glint: 1 },
    labubu: { name: P.ench.labubu.name, sub: () => "радиус 2 / 5 · Лабубу и золото", icon: "enchanted_book", glint: 1 },
    both: { name: "Оба сразу", sub: () => "радиус 4 / 10 · 50 на 50", icon: "enchanted_book", glint: 1 },
  };
  {
    const E = P.ench, roman = ["", "I", "II", "III"];
    const card = (e, what, other) => `<div class="pnl en-c" style="--c:${e.c}">
      <div class="en-top"><span class="glint"><img src="${T("enchanted_book")}" alt=""></span>
        <div class="it-tip en-tip"><div class="n" style="color:#ffff55">Зачарованная книга</div><div class="l">${esc(e.name)}${E.maxLevel > 1 ? " " + roman[E.maxLevel] : ""}</div></div></div>
      <p>${what}</p>
      <div class="en-f"><span>редкость<b>${E.rarity}</b></span><span>максимум<b>${roman[E.maxLevel]}</b></span><span>стол чар<b>${E.minCost}–${E.maxCost}</b></span></div>
      <div class="en-tags"><i>книга</i><i>стол зачарований</i><i>библиотекари</i><i>+ ${esc(other)}</i></div></div>`;
    $("#enCards").innerHTML = card(E.yobyr, "Вместо случайных блоков: 80% хентай-блоков, остальное шерсть, кварц, кактусы и цветы. Радиус 2 и 5.", E.labubu.name)
      + card(E.labubu, "Камень, золото, коробки Лабубу и сами фигурки, плюс ещё 10 фигурок сверху. Радиус 2 и 5.", E.yobyr.name)
      + `<div class="pnl en-c en-combo"><div class="en-sum"><img src="${T("iso_hentai_block")}" alt=""><b>+</b><img src="${U("assets/textures/p6/icons/red.png")}" alt=""></div>
        <p><b>Вместе встают.</b> Каждая чара проверяет совместимость с другой отдельно, поэтому обе ложатся на один предмет. Радиус 4 и 10, каждый блок решает 50 на 50, из какого набора.</p>
        <p class="en-note">На Made in Heaven встают только эти две: у них своя категория. Не сокровище, выпадают в обычном столе.</p></div>`;
  }
  $("#rsVer").textContent = `чары из ${P.ench.ver} · ${P.ench.verName}`;
  $("#rsEnch").innerHTML = Object.entries(MODES).map(([k, m]) => `<button type="button" role="radio" aria-checked="${k === mode}" data-m="${k}"><span class="${m.glint ? "glint" : ""}"><img src="${T(m.icon)}" alt=""></span><span><b>${esc(m.name)}</b><small>${m.sub()}</small></span></button>`).join("");
  $("#rsEnch").addEventListener("click", (e) => {
    const b = e.target.closest("[data-m]"); if (!b || anim) return;
    mode = b.dataset.m; $$("#rsEnch [data-m]").forEach((x) => x.setAttribute("aria-checked", x.dataset.m === mode));
    play("enchant", 0.5); restore(); drawMap();
  });
  const radiusOf = () => mode === "none" ? P.radius.none : mode === "both" ? P.radius.both : P.radius.one;
  function rollYobyr() { return Math.random() < 0.8 ? "hentai_block" : pick(P.yobyrTable.rest); }
  function rollLabubu() {
    let r = Math.random() * 100;
    for (const [k, w] of P.labubuTable) { if ((r -= w) < 0) return k === "figure" ? "fig:" + pick(FIG) : k; }
    return "stone";
  }
  function roll() {
    if (mode === "none") return "reg:" + rnd(REG.length);
    if (mode === "yobyr") return rollYobyr();
    if (mode === "labubu") return rollLabubu();
    return Math.random() < 0.5 ? rollYobyr() : rollLabubu();
  }
  function restore() { ground.forEach((g) => { g.b = g.orig; g.t = 0; }); extras = []; renderStat(null); }
  function runReset(fromHero) {
    if (anim) return;
    if (fromHero) mode = mode;   // активация в hero использует выбранные чары
    restore();
    const [r0, r1] = radiusOf();
    let rep = 0, luck = 0, prot = 0;
    const counts = {};
    for (let z = -MID; z <= MID; z++) for (let x = -MID; x <= MID; x++) {
      const i = (z + MID) * N + (x + MID), g = ground[i], d = Math.hypot(x, z, 1);   // слой под ногами: y = -1
      if (d > r1) continue;
      if (SAFE_NO.has(g.orig) || obj[i] === "oak_door" || obj[i] === "white_bed") { prot++; continue; }
      const ch = d <= r0 ? 1 : 1 - (d - r0) * 0.05;
      if (Math.random() >= ch) { luck++; continue; }
      g.next = roll(); g.t = d; rep++;
      const key = g.next.startsWith("reg:") ? "reg" : g.next.startsWith("fig:") ? "figure" : g.next === "hentai_block" ? "hentai" : g.next;
      counts[key] = (counts[key] || 0) + 1;
      if (key === "reg" && REG[+g.next.slice(4)].includes(":")) counts.regMod = (counts.regMod || 0) + 1;
    }
    if (mode === "labubu" || mode === "both") {
      for (let i = 0; i < P.labubuExtra; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * r1; extras.push({ x: Math.round(Math.cos(a) * r), z: Math.round(Math.sin(a) * r), f: pick(FIG), t: r }); }
      counts.figure = (counts.figure || 0) + P.labubuExtra;
    }
    const t0 = performance.now(), vis = rs.getBoundingClientRect(), onScreen = vis.bottom > 0 && vis.top < innerHeight;
    if (!fromHero || onScreen) { play("boom", 0.5); setTimeout(() => play("shimmer", 0.6), 150); }
    anim = { t0, r1 };
    const step = (n) => {
      const el = (n - t0) / 1000 * 18;   // волна: 18 блоков в секунду
      ground.forEach((g) => { if (g.next && g.t <= el) { g.b = g.next; g.next = null; g.pop = n; } });
      drawMap(el);
      if (el <= r1 + 2) requestAnimationFrame(step); else { anim = null; drawMap(); }
    };
    requestAnimationFrame(step);
    renderStat({ rep, luck, prot, counts });
  }
  function renderStat(s) {
    if (!s) { $("#rsStat").innerHTML = `<div><b>—</b><span>заменено</span></div><div><b>—</b><span>пощадил шанс</span></div><div><b>—</b><span>не тронуто</span></div>`; $("#rsGot").innerHTML = ""; return; }
    $("#rsStat").innerHTML = `<div><b>${s.rep}</b><span>заменено</span></div><div><b>${s.luck}</b><span>пощадил шанс</span></div><div><b>${s.prot}</b><span>вода, дверь, кровать</span></div>`;
    const ic = (k) => k === "reg" ? T("made_in_heaven") : k === "figure" ? U("assets/textures/p6/icons/red.png") : k === "box" ? U("assets/textures/p6/icons/box.png") : k === "hentai" ? T("iso_hentai_block") : k === "stone" ? T("iso_stone") : k === "gold_block" ? T("iso_gold_block") : T(k);
    const nm = (k) => k === "reg" ? "случайные блоки ванили и мода" : P.names[k] || k;
    const regMod = s.counts.regMod || 0; delete s.counts.regMod;
    if (s.counts.reg) s.counts.reg = `${s.counts.reg} · из них ZitraksMode ${regMod}`;
    $("#rsGot").innerHTML = Object.entries(s.counts).sort((a, b) => parseInt(b[1]) - parseInt(a[1])).map(([k, v]) => `<div><img src="${ic(k)}" alt=""><span>${esc(nm(k))}</span><i>${v}</i></div>`).join("");
  }
  function drawCell(b, x, y) {
    if (b.startsWith("reg:")) { const i = +b.slice(4); if (regImg.complete) rx.drawImage(regImg, (i % 16) * 16, Math.floor(i / 16) * 16, 16, 16, x, y, C, C); return; }
    if (b.startsWith("fig:")) { rx.drawImage(IMG("grass_top"), x, y, C, C); rx.drawImage(p6(b.slice(4)), x, y, C, C); return; }
    if (b === "box") { rx.drawImage(p6("box"), x, y, C, C); return; }
    const flat = ["poppy", "red_tulip", "rose_bush", "end_rod"];
    if (flat.includes(b)) { rx.drawImage(IMG("grass_top"), x, y, C, C); }
    const im = IMG(b); if (im.complete) rx.drawImage(im, x, y, C, C);
  }
  function drawMap(wave) {
    rx.imageSmoothingEnabled = false;
    const now = performance.now();
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      const i = z * N + x, g = ground[i], px = x * C, py = z * C;
      drawCell(g.b, px, py);
      if (obj[i]) { const im = IMG(obj[i]); if (im.complete) { if (obj[i] === "oak_door") rx.drawImage(im, 0, 0, 16, 16, px, py, C, C); else rx.drawImage(im, px, py, C, C); } }
      if (g.pop && now - g.pop < 350) { rx.fillStyle = `rgba(255,255,255,${1 - (now - g.pop) / 350})`; rx.fillRect(px, py, C, C); }
    }
    for (const e of extras) if (!wave || e.t <= wave) rx.drawImage(p6(e.f), (e.x + MID) * C - 2, (e.z + MID) * C - 2, C + 4, C + 4);
    // игрок и радиусы
    const [r0, r1] = radiusOf(), c = MID * C + C / 2;
    rx.lineWidth = 2;
    rx.strokeStyle = "rgba(255,255,255,.85)"; rx.setLineDash([]); rx.beginPath(); rx.arc(c, c, r0 * C, 0, Math.PI * 2); rx.stroke();
    rx.strokeStyle = "rgba(242,193,78,.9)"; rx.setLineDash([6, 5]); rx.beginPath(); rx.arc(c, c, r1 * C, 0, Math.PI * 2); rx.stroke(); rx.setLineDash([]);
    if (wave != null) { rx.strokeStyle = "rgba(255,255,255,.9)"; rx.lineWidth = 4; rx.beginPath(); rx.arc(c, c, Math.max(1, wave * C), 0, Math.PI * 2); rx.stroke(); }
    const sf = IMG("steve_face"); if (sf.complete) { rx.fillStyle = "rgba(0,0,0,.4)"; rx.fillRect(c - 9, c - 7, 20, 20); rx.drawImage(sf, c - 10, c - 10, 20, 20); }
  }
  // подсказка по клетке
  const tipEl = $("#rsTip");
  rs.addEventListener("pointermove", (e) => {
    const r = rs.getBoundingClientRect(), x = Math.floor(((e.clientX - r.left) / r.width) * N), z = Math.floor(((e.clientY - r.top) / r.height) * N);
    if (x < 0 || z < 0 || x >= N || z >= N) { tipEl.style.opacity = 0; return; }
    const i = z * N + x, g = ground[i];
    let n = g.b.startsWith("reg:") ? (REG[+g.b.slice(4)].includes(":") ? REG[+g.b.slice(4)] : "minecraft:" + REG[+g.b.slice(4)]) : g.b === "hentai_block" ? P.names.hentai : g.b.startsWith("fig:") ? "Лабубу" : P.names[g.b] || g.b;
    if (g.b === "oak_log_top") n = P.names.oak_log;
    if (obj[i]) n = (P.names[obj[i]] || obj[i]) + " · не трогается";
    const d = Math.hypot(x - MID, z - MID, 1), [r0, r1] = radiusOf();
    const ch = d <= r0 ? 100 : d <= r1 ? Math.round((1 - (d - r0) * 0.05) * 100) : 0;
    tipEl.innerHTML = `${esc(n)}<br><span style="color:#aaa">${fmt(d)} бл. · шанс ${ch}%</span>`;
    const pr = rs.parentElement.getBoundingClientRect();
    tipEl.style.left = Math.min(e.clientX - pr.left + 14, pr.width - tipEl.offsetWidth - 6) + "px"; tipEl.style.top = e.clientY - pr.top + 16 + "px"; tipEl.style.opacity = 1;
  });
  rs.addEventListener("pointerleave", () => (tipEl.style.opacity = 0));
  $("#rsGo").addEventListener("click", () => { if (anim) return; $(".rs-map").animate([{ boxShadow: "0 0 0 0 #fff" }, { boxShadow: "0 0 80px 20px rgba(255,255,255,.8)" }, { boxShadow: "0 0 0 0 #fff" }], { duration: 900 }); runReset(false); });
  $("#rsBack").addEventListener("click", () => { if (anim) return; seedW++; genWorld(); renderStat(null); drawMap(); play("stone", 0.5); });
  genWorld(); renderStat(null);
  let waitImgs = 0;
  const redraw = () => { clearTimeout(waitImgs); waitImgs = setTimeout(() => { if (!anim) drawMap(); }, 60); };
  ["registry", "grass_top", "oak_leaves", "water", "sand", "dirt", "stone", "gravel", "oak_planks", "oak_log_top", "cobblestone", "bookshelf", "crafting_table", "oak_door", "torch", "white_bed", "poppy", "dandelion", "oxeye_daisy", "steve_face"].forEach((n) => { const im = IMG(n); if (!im.complete) im.addEventListener("load", redraw); });
  drawMap();

  /* ================= 08.5 ЭФФЕКТ ВСЕЛЕННОЙ ================= */
  const EF = P.effects, strip = $("#bfStrip");
  const efIcon = (i) => `<i style="background-position:${(i / 11) * 100}% 0"></i>`;
  $("#bfAll").innerHTML = EF.map((e, i) => `<div data-i="${i}">${efIcon(i)}<span>${esc(e.name)}</span></div>`).join("");
  let reel = [], spinning = false;
  function buildReel(win) {
    reel = Array.from({ length: 60 }, () => rnd(12)); reel[52] = win;
    strip.innerHTML = reel.map((i) => `<div title="${esc(EF[i].name)}">${efIcon(i)}</div>`).join("");
  }
  buildReel(0); strip.style.transform = `translateX(${-(52 * 96) + strip.parentElement.clientWidth / 2 - 48}px)`;
  function showBuff(win, animate = true) {
    if (spinning) return;
    spinning = true; buildReel(win);
    const w = strip.parentElement.clientWidth, end = -(52 * 96) + w / 2 - 48 + (Math.random() - 0.5) * 60;
    strip.style.transition = "none"; strip.style.transform = `translateX(${w / 2 - 48}px)`; void strip.offsetWidth;
    const dur = animate && !reduce ? 4200 : 10;
    strip.style.transition = `transform ${dur}ms cubic-bezier(.12,.72,.18,1)`; strip.style.transform = `translateX(${end}px)`;
    let lastCell = -1; const t0 = performance.now();
    const tick = () => { const m = new DOMMatrix(getComputedStyle(strip).transform), cell = Math.floor((-m.m41 + w / 2) / 96); if (cell !== lastCell) { lastCell = cell; play("click", 0.25, 1.6); } if (performance.now() - t0 < dur) requestAnimationFrame(tick); };
    if (animate) requestAnimationFrame(tick);
    $$("#bfAll div").forEach((d) => d.classList.remove("win"));
    $("#bfOut").innerHTML = "...";
    setTimeout(() => {
      strip.style.transition = "transform .3s"; strip.style.transform = `translateX(${-(52 * 96) + w / 2 - 48}px)`;
      $("#bfOut").innerHTML = col("e", P.msg.buff) + col("6", EF[win].name) + ` <span style="color:#aaa">· II · 2:00</span>`;
      $(`#bfAll div[data-i="${win}"]`).classList.add("win");
      play("levelup", 0.4); spinning = false;
    }, dur + 60);
  }
  $("#bfGo").addEventListener("click", () => showBuff(rnd(12)));

  /* ================= 08.6 ЗАКОНЫ ================= */
  const spd = P.speed.map(([lim, v], i) => `<span style="--a:${(i + 1) / 4}">×${fmt(v)}<small>${i ? "до " : "до "}${fmt((lim * TK.reset) / 20)} с</small></span>`).join("");
  const RULES = [
    ["made_in_heaven", "Одна на весь сервер", "Пока идёт активация, вторую не запустит никто, даже с другим предметом в руках.", `<div class="mc">${col("c", P.msg.busy)}</div>`],
    ["totem", "Смерть всё отменяет", "Умер, и время сразу возвращается к обычному ходу. Музыка обрывается, предмет уже потрачен.", `<div class="mc">${col("c", P.msg.dead)}</div>`],
    ["water_bucket", "Небо чистое", "На старте погода ясная. С 29-й секунды она меняется каждые полторы секунды: 70% ясно, 30% дождь.", ""],
    ["sugar", "Бег без рыбьего глаза", "Скорость растёт ступенями, а угол обзора зафиксирован, поэтому экран не растягивает.", `<div class="ru-spd">${spd}</div>`],
    ["firework", "Лазеры и тряска", "С 25-й секунды из тебя бьют лучи. С 26-й трясёт камеру, всё сильнее: 0,2 → 0,6 → 1,4.", ""],
    ["glowstone_dust", "Вспышка", "На 36-й секунде экран заливает белым. В этот момент мир вокруг уже другой.", `<div class="mc">${col("f", P.msg.reset, true)}</div>`],
    ["sunflower", "Вечный полдень", "После сброса время стоит на полудне до конца музыки, ещё 11 секунд.", ""],
    ["bell", "Слышат все", "Музыка играет на громкости 100 для всего сервера, сообщения уходят в общий чат.", `<div class="mc">${col("6", P.msg.on)}</div>`],
  ];
  $("#ruGrid").innerHTML = RULES.map(([ic, t, p, x], i) => `<div class="ru-c" data-n="${i + 1}"><img src="${T(ic)}" alt=""><b>${esc(t)}</b><p>${esc(p)}</p>${x}</div>`).join("");

  /* ================= ДОСТИЖЕНИЯ ================= */
  $("#advBoard").style.setProperty("--tile", `url("${new URL(T("quartz"), location.href).href}")`);
  const FRAME_RU = { task: "обычная", goal: "цель", challenge: "испытание" };
  const titleH = (a) => `<span style="color:${MC[a.color]};${a.bold ? "font-weight:700" : ""}">${esc(a.title)}</span>`;
  renderTree = function (pulse) {
    const vis = ADV.filter((a) => got.includes(a.key) || !a.hidden), hidden = ADV.length - vis.length;
    if (!advSel || !vis.some((a) => a.key === advSel)) advSel = vis.length ? vis[vis.length - 1].key : null;
    const icon = (a, px) => `<span class="ic" style="width:${px}px;height:${px}px"><img src="${T(a.icon)}" alt=""></span>`;
    let html = vis.map((a, i) => (i ? `<div class="adv-link on"></div>` : "") + `<button type="button" class="adv-node ${pulse === a.key ? "pulse" : ""} ${advSel === a.key ? "sel" : ""}" data-k="${a.key}" aria-label="${esc(a.title)}"><span class="adv-frame ${a.frame}"></span>${icon(a, 32)}</button>`).join("");
    if (hidden) html += vis.length ? `<div class="adv-link"></div><div class="adv-more">+${hidden} скрыто</div>` : `<div class="adv-node"><span class="adv-frame task locked"></span><span class="q">?</span></div><div class="adv-link"></div><div class="adv-more">+${hidden} скрыто</div>`;
    $("#advChain").innerHTML = html;
    const a = ADV.find((x) => x.key === advSel);
    $("#advDetail").innerHTML = a
      ? `<div class="big"><span class="adv-frame ${a.frame}"></span>${icon(a, 38)}</div><div class="txt"><div class="tt">${titleH(a)}</div><div class="dd">${esc(a.desc)}</div><div class="cc">${esc(a.how)}</div></div><div class="meta"><span>${FRAME_RU[a.frame]}</span>${a.xp ? `<span>+${a.xp} XP</span>` : ""}</div>`
      : `<div class="big"><span class="adv-frame task locked"></span><span class="q">?</span></div><div class="txt"><div class="tt">Всё скрыто</div><div class="dd">Забери предмет из верстака, нажми «Активировать» наверху и дождись вспышки.</div></div>`;
    $("#advList").innerHTML = ADV.map((a) => got.includes(a.key)
      ? `<button type="button" class="adv-row has" data-k="${a.key}"><span class="fr"><span class="adv-frame ${a.frame}"></span>${icon(a, 26)}</span><span><span class="t">${titleH(a)}</span><span class="d">${esc(a.desc)}</span></span></button>`
      : `<div class="adv-row locked mystery"><span class="fr"><span class="adv-frame task locked"></span><span class="q">?</span></span><span><span class="t">???</span><span class="d">скрытое достижение: откроется, когда получишь</span></span></div>`).join("");
    const done = ADV.filter((x) => got.includes(x.key));
    $("#advBar").style.width = (done.length / ADV.length) * 100 + "%";
    $("#advTxt").textContent = `${done.length} / ${ADV.length}`;
  };
  renderTree();
  $("#advQ").textContent = ADV.length + " " + plural(ADV.length, "ачивка", "ачивки", "ачивок") + " · " + ADV.reduce((s, a) => s + a.xp, 0) + " XP";
  const pickAdv = (e) => { const n = e.target.closest("[data-k]"); if (!n) return; advSel = n.dataset.k; renderTree(); };
  $("#advChain").addEventListener("click", pickAdv);
  $("#advList").addEventListener("click", pickAdv);
  $("#advReset").addEventListener("click", () => { got = []; S.set("p08.adv", got); setInv(1); advSel = null; renderTree(); });

  /* ================= ИСТОРИЯ ================= */
  const HI = [["made_in_heaven", "#c9982e"], ["clock", "#3f93dc"], ["enchanted_book", "#7b4fd6"]];
  $("#timeline").innerHTML = P.history.map((h, i) => `<div class="tl8-i" style="--c:${HI[i][1]}"><div class="tl8-ic"><img src="${T(HI[i][0])}" alt=""></div>
    <div><div class="tl8-top"><span class="tl8-v">${esc(h.ver)}</span>${h.ver !== h.date ? `<span class="tl8-d">${esc(h.date)}</span>` : ""}<span class="tl8-t">${esc(h.tag)}</span></div><b>${esc(h.title)}</b><p>${esc(h.text)}</p></div></div>`).join("");

  /* ================= ФИНАЛ ================= */
  $("#finItem").addEventListener("click", (e) => {
    const el = e.currentTarget; if (el.classList.contains("spin")) return;
    el.classList.add("spin"); play("shimmer", 0.8);
    setTimeout(() => el.classList.remove("spin"), 1500);
  });
  const nav = ZM.pointNav(8);
  $("#finNav").innerHTML = [nav.prev && `<a href="${U(nav.prev.href)}">← №${String(nav.prev.n).padStart(2, "0")} ${esc(nav.prev.title)}</a>`,
    `<a href="${U("index.html")}">Все пункты</a>`,
    nav.next && `<a href="${U(nav.next.href)}">№${String(nav.next.n).padStart(2, "0")} ${esc(nav.next.title)} →</a>`].filter(Boolean).join("");

  ZM.reveal();
  ZM.p08 = { mih, activate, stopMih, grant, runReset, showBuff, get dayTime() { return dayTime; }, set dayTime(v) { dayTime = v; }, INC, CUM };
})();
