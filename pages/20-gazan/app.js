/* №20 · Газан. Логика из GazanEntity / GazanTradeTrigger / GazanRenderer / r_gazan_spawn_egg:
   житель без мозга (customServerAiStep пустой), 5 целей: Float, TradeWithPlayer, RandomStroll 0.7, LookAtPlayer 6, RandomLookAround;
   20 HP, скорость 0.5, follow 32; persistent; имя «Газан» видно всегда; не размножается (золотое яблоко/морковь → PASS); монстры не видят;
   сделки пересобираются при каждой загрузке мира: 16 изумрудов → блок 6, 16 → блок 7, 14 пластинок → 16–32 изумруда, maxUses 9999, без опыта;
   фразы speech_1..10 строго по кругу, кулдаун 400 тиков, перед шестой 800; индекс не сохраняется;
   hurt_1/2, death, trade_open при открытии, yes/no при выборе сделки, trade_1/2 после сделки; дроп — дилдо из незерита. */
(function () {
  const { $, $$, esc } = ZM, K = ZM.kit, U = ZM.url;
  ZM.topbar({ crumb: "№20 · Газан", ...ZM.pointNav(20) });
  const T = (p, e = "png") => U(`assets/textures/p20/${p}.${e}`);
  const snd = K.sounds("p20");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motion = () => !reduce && !document.documentElement.classList.contains("no-motion");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const USE_GL = window.ZMGL && ZMGL.supported();
  let adv = null;
  const grant = (k) => adv && adv.grant(k);

  /* ================= данные ================= */
  const DISCS = [["11", "C418 - 11"], ["13", "C418 - 13"], ["cat", "C418 - cat"], ["blocks", "C418 - blocks"], ["chirp", "C418 - chirp"], ["far", "C418 - far"], ["mall", "C418 - mall"],
    ["mellohi", "C418 - mellohi"], ["otherside", "Lena Raine - otherside"], ["pigstep", "Lena Raine - Pigstep"], ["stal", "C418 - stal"], ["strad", "C418 - strad"], ["wait", "C418 - wait"], ["5", "Samuel Åberg - 5"]];
  const NAME = { emerald: "Изумруд", six: "Блок Шесть", seven: "Блок Семь", gazan_spawn_egg: "Яйцо призыва Газана", netherite_dildo: "Дилдо из незерита" };
  const ICON = { emerald: T("i/emerald"), six: T("i/six_iso"), seven: T("i/seven_iso"), gazan_spawn_egg: T("i/gazan_spawn_egg"), netherite_dildo: T("i/netherite_dildo") };
  for (const [d, t] of DISCS) { NAME["disc_" + d] = "Музыкальная пластинка · " + t; ICON["disc_" + d] = T("i/music_disc_" + d); }
  // длительности фраз (с), измерены по файлам
  const SPEECH = [11.2, 17.2, 9.0, 11.5, 33.9, 16.5, 10.7, 11.0, 20.2, 13.4];
  const COOL = (i) => (i === 5 ? 40 : 20);   // перед фразой с индексом 5 (шестой) — 800 тиков
  const START_AT = (() => { const a = [0]; for (let i = 1; i < 10; i++) a.push(a[i - 1] + COOL(i)); return a; })();   // 0,20,40,60,80,120,…,200
  const CYCLE = START_AT[9] + COOL(0);   // 220 с

  /* ================= общее состояние (как один мир) ================= */
  const S0 = () => {
    const inv = Array(36).fill(null);
    inv[27] = { id: "emerald", n: 40 }; inv[28] = { id: "disc_13", n: 1 }; inv[29] = { id: "disc_cat", n: 1 }; inv[30] = { id: "disc_pigstep", n: 1 }; inv[31] = { id: "disc_otherside", n: 1 };
    return { inv, slots: [null, null], sel: -1, scroll: 0, prices: rollPrices(), prev: null, sold: 0, got: 0, best: 0, bought: 0, spent: 0, joins: 1 };
  };
  function rollPrices() { return DISCS.map(() => ri(16, 32)); }   // 16 + random.nextInt(17)
  let W = ZM.store.get("p20.world", null);
  if (!W || !W.inv || W.inv.length !== 36 || !W.prices) W = S0();
  const save = () => ZM.store.set("p20.world", W);
  const count = (id) => W.inv.reduce((s, x) => s + (x && x.id === id ? x.n : 0), 0);
  function take(id, n) { for (let i = 35; i >= 0 && n > 0; i--) { const x = W.inv[i]; if (x && x.id === id) { const k = Math.min(n, x.n); x.n -= k; n -= k; if (!x.n) W.inv[i] = null; } } }
  function give(id, n) {
    const max = id.startsWith("disc_") || id === "netherite_dildo" ? (id.startsWith("disc_") ? 1 : 64) : 64;
    const order = [...Array(9).keys()].map((i) => 27 + i).concat([...Array(27).keys()]);
    for (const i of order) { const x = W.inv[i]; if (n > 0 && x && x.id === id && x.n < max) { const k = Math.min(max - x.n, n); x.n += k; n -= k; } }
    for (const i of order) { if (n > 0 && !W.inv[i]) { const k = Math.min(max, n); W.inv[i] = { id, n: k }; n -= k; } }
    return n;
  }
  const listeners = [];
  const changed = () => { save(); if (count("six") && count("seven")) grant("blocks_67"); listeners.forEach((f) => f()); };

  /* ================= голос Газана: один на всю страницу ================= */
  const V = { a: null, i: -1, idx: 0, last: -1e9, ui: [] };
  function speak(i, from) {
    if (!ZM.sfx.on()) { K.say("Звук выключен в верхней панели", true); return; }
    stopSpeech();
    const a = new Audio(U(`assets/sounds/p20/speech_${i + 1}.ogg`)); a.volume = 0.8;
    V.a = a; V.i = i; V.from = from; V.last = performance.now(); V.idx = (i + 1) % 10;
    a.play().catch(() => {});
    a.addEventListener("ended", () => { if (V.a === a) { V.a = null; V.i = -1; uiSpeech(); } });
    uiSpeech();
  }
  function stopSpeech() { if (V.a) { V.a.pause(); V.a = null; } V.i = -1; uiSpeech(); }
  const uiSpeech = () => V.ui.forEach((f) => f());
  const cdLeft = () => Math.max(0, COOL(V.idx) - (performance.now() - V.last) / 1000);

  /* ================= фон: софиты и цифры ================= */
  (function bg() {
    const cv = $("#bg"), cx = cv.getContext("2d"); let Wd, Hd, dig = [];
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); Wd = innerWidth; Hd = innerHeight; cv.width = Wd * d; cv.height = Hd * d; cx.setTransform(d, 0, 0, d, 0, 0);
      dig = Array.from({ length: Math.round(Wd / 110) }, (_, i) => ({ c: i % 2 ? "7" : "6", x: Math.random() * Wd, y: Math.random() * Hd, z: rnd(60, 220), v: rnd(6, 16), r: rnd(-0.3, 0.3) })); };
    size(); addEventListener("resize", size);
    function frame(t) {
      requestAnimationFrame(frame);
      if (document.hidden) return;
      const k = t / 1000, m = motion();
      cx.clearRect(0, 0, Wd, Hd);
      // два софита качаются из верхних углов
      for (const [ox, ph] of [[0.12, 0], [0.88, 2.1]]) {
        const ang = Math.PI / 2 + (ox < 0.5 ? -0.35 : 0.35) + (m ? Math.sin(k * 0.35 + ph) * 0.28 : 0);
        const x0 = ox * Wd, L = Hd * 1.3, sp = 0.16;
        const g = cx.createLinearGradient(x0, 0, x0 + Math.cos(ang) * L, Math.sin(ang) * L);
        g.addColorStop(0, "rgba(255,215,0,.13)"); g.addColorStop(1, "rgba(255,215,0,0)");
        cx.fillStyle = g; cx.beginPath(); cx.moveTo(x0, -10);
        cx.lineTo(x0 + Math.cos(ang - sp) * L, Math.sin(ang - sp) * L); cx.lineTo(x0 + Math.cos(ang + sp) * L, Math.sin(ang + sp) * L); cx.closePath(); cx.fill();
      }
      cx.font = `400 120px "GZ Big", sans-serif`; cx.textAlign = "center"; cx.textBaseline = "middle";
      for (const d of dig) {
        if (m) { d.y -= d.v / 60; if (d.y < -d.z) { d.y = Hd + d.z; d.x = Math.random() * Wd; } }
        cx.save(); cx.translate(d.x, d.y); cx.rotate(d.r); cx.font = `400 ${d.z}px "GZ Big", sans-serif`;
        cx.fillStyle = "rgba(255,215,0,.035)"; cx.fillText(d.c, 0, 0); cx.restore();
      }
    }
    requestAnimationFrame(frame);
  })();
  (function tick() {
    const w = ["ГАЗАН", "67", "СОЗДАТЕЛЬ ХАЙПА", "ШЕСТЬ", "СЕМЬ", "10 ФРАЗ ПО КРУГУ", "16 ИЗУМРУДОВ ЗА БЛОК", "СДЕЛКА ВЕКА", "МЕДИА-ПОХОРОНЫ"];
    const one = w.map((x) => `<span>${x}</span><i>✦</i>`).join("");
    $("#tick").innerHTML = one + one;
  })();

  /* ================= 3D ================= */
  function gl3d(box, model, fit, persp = 2400) {
    if (!USE_GL) return null;
    const r = box.getBoundingClientRect(), bb = ZMModel3D.bbox(model);
    const unit = Math.min(r.width / (bb.size[0] * 1.9), r.height * fit / bb.size[1]);
    const v = ZMGL.build(model, U("assets/textures/p20/"), { unit, persp });
    if (!v) return null;
    v.el.style.cssText = "width:100%;height:100%;display:block"; box.innerHTML = ""; box.appendChild(v.el);
    return v;
  }
  function dragRot(box, rot, lim = 40) {
    let d = null; rot.last = -1e9;
    box.addEventListener("pointerdown", (e) => { d = { x: e.clientX, y: e.clientY, rx: rot.x, ry: rot.y, m: false }; try { box.setPointerCapture(e.pointerId); } catch (_) {} });
    box.addEventListener("pointermove", (e) => { if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.abs(dx) + Math.abs(dy) > 5) d.m = true; rot.y = d.ry + dx * 0.5; rot.x = clamp(d.rx - dy * 0.3, -lim, lim); rot.last = performance.now(); });
    const up = (e) => { if (d && !d.m && e.type === "pointerup" && rot.onClick) rot.onClick(e); d = null; };
    box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);
    for (const ev of ["contextmenu", "dragstart"]) box.addEventListener(ev, (e) => e.preventDefault());
    rot.idle = () => !d && performance.now() - rot.last > 1600;
    return rot;
  }

  /* ================= HERO ================= */
  (function hero() {
    const box = $("#heroModel"); let v = null; const rot = dragRot(box, { x: -6, y: 0 });
    const fallback = () => { box.innerHTML = `<img class="gz-fb" src="${T("i/gazan")}" alt="Газан">`; };
    const build = () => { v && v.destroy && v.destroy(); v = gl3d(box, ZM.P20M.gazan, 0.86); if (!v) fallback(); };
    rot.onClick = () => { speak(V.idx, "hero"); };
    let t0 = performance.now();
    (function f(now) {
      requestAnimationFrame(f);
      const k = (now - t0) / 1000;
      if (rot.idle() && motion()) { rot.y += (Math.sin(k * 0.4) * 28 - rot.y) * 0.02; rot.x += (-6 - rot.x) * 0.03; }
      const talk = V.i >= 0 && motion() ? Math.sin(k * 11) * 1.2 : 0;
      if (v) v.setRot([["x", rot.x + talk], ["y", 180 + rot.y]]);
    })(t0);
    requestAnimationFrame(build);
    let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(build, 250); });
    const now = $("#heroNow");
    V.ui.push(() => {
      now.classList.toggle("on", V.i >= 0);
      now.querySelector("span").textContent = V.i >= 0 ? `фраза ${V.i + 1} из 10 · ${Math.round(SPEECH[V.i])} с` : `клик — фраза ${V.idx + 1}`;
      $("#heroName").classList.toggle("talk", V.i >= 0);
    });
    uiSpeech();
  })();

  /* ================= 01 ЯЙЦО ================= */
  const eggN = () => count("gazan_spawn_egg");
  function renderCraft() {
    const cells = Array(9).fill(" "), a = ri(0, 8); let b = ri(0, 7); if (b >= a) b++;
    cells[a] = "6"; cells[b] = "7";
    const pat = [0, 3, 6].map((i) => cells.slice(i, i + 3).join(""));
    K.craft($("#craftBox"), {
      pattern: pat,
      key: { 6: { name: "Блок Шесть", id: "zitraksmode:six", src: T("i/six_iso") }, 7: { name: "Блок Семь", id: "zitraksmode:seven", src: T("i/seven_iso") } },
      result: { name: "Яйцо призыва Газана", id: "zitraksmode:gazan_spawn_egg", src: T("i/gazan_spawn_egg") },
      onTake: () => {
        if (!count("six") || !count("seven")) { K.say(`Не хватает: ${[!count("six") && "Блок Шесть", !count("seven") && "Блок Семь"].filter(Boolean).join(" и ")}. Подбери выше или купи у Газана.`, true); return; }
        take("six", 1); take("seven", 1); give("gazan_spawn_egg", 1); snd("pop", 0.6, 0.9);
        grant("craft_egg"); changed();
        K.say(`Яйцо в инвентаре: ${eggN()} шт. Сцена ниже.`);
      },
    });
    $("#craftBox .k-craft").classList.add("gz-kc");
  }
  renderCraft();
  $("#shuffle").addEventListener("click", () => { renderCraft(); snd("click", 0.5); });
  $("#pick").addEventListener("click", (e) => {
    const b = e.target.closest("[data-b]"); if (!b) return;
    give(b.dataset.b, 1); snd("pop", 0.5, 1.1 + Math.random() * 0.2);
    b.classList.remove("got"); void b.offsetWidth; b.classList.add("got");
    changed();
  });
  function renderPick() {
    $$("#pick [data-b]").forEach((b) => { const n = count(b.dataset.b); b.querySelector("span").textContent = n ? `в инвентаре: ${n}` : "подобрать"; b.classList.toggle("has", n > 0); });
    $("#craftNote").innerHTML = count("six") && count("seven") ? "Оба блока есть. Забирай яйцо из правой клетки." : "Рецепт бесформенный: шестёрку и семёрку можно класть в любые две клетки.";
  }
  listeners.push(renderPick); renderPick();
  K.dl($("#eggDl"), [
    ["Рецепт", "бесформенный · 6 + 7 → 1 яйцо"],
    ["Открывает", "ачивка «Числа судьбы»"],
    ["Модель", "своя, 7 полосок по полпикселя толщиной"],
    ["Цвета в коде", `<i class="gz-sw" style="background:#FFD700"></i>#FFD700 <i class="gz-sw" style="background:#8B4513"></i>#8B4513`],
    ["Стак", "64"],
  ]);
  (function egg() {
    const box = $("#egg3d"); let v = null; const rot = dragRot(box, { x: 0, y: 0 }, 30);
    const build = () => { v && v.destroy && v.destroy(); v = gl3d(box, ZM.P20M.egg, 0.8, 1600); if (!v) box.innerHTML = `<img class="gz-fb px" src="${T("i/gazan_spawn_egg")}" alt="">`; };
    rot.onClick = () => { snd("egg", 0.5, 1 + Math.random() * 0.2); rot.y += 360; };
    let vis = true; new IntersectionObserver((es) => (vis = es[0].isIntersecting)).observe(box);
    let t0 = performance.now(), ry = 0;
    (function f(now) { requestAnimationFrame(f); const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
      if (!v || !vis) return;
      if (rot.idle() && motion()) rot.y += dt * 40;
      ry += (rot.y - ry) * Math.min(1, dt * 8);
      v.setRot([["x", rot.x], ["y", 180 + ry]]); })(t0);
    requestAnimationFrame(build);
    let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(build, 250); });
  })();

  /* ================= 02 СЦЕНА ================= */
  const G = Object.assign({ alive: false, hp: 20, x: 0.5, dead: 0, drop: null }, ZM.store.get("p20.gz", {}));
  G.dead = 0; if (G.drop) G.drop.t = 0;
  const saveG = () => ZM.store.set("p20.gz", { alive: G.alive, hp: G.hp, x: G.x, drop: G.drop ? { x: G.drop.x } : null });
  let hand = "egg";
  $("#hp").style.setProperty("--ic", `url("${new URL(T("v/icons"), location.href).href}")`);
  const view = $("#view"), cv = $("#cv"), cx = cv.getContext("2d");
  const img = (s) => { const i = new Image(); i.src = s; return i; };
  const IM = { grass: img(T("v/grass_top")), side: img(T("v/grass_side")), dirt: img(T("v/dirt")), note: img(T("v/note")), heart: img(T("v/heart")), angry: img(T("v/angry")), icons: img(T("v/icons")), dildo: img(T("i/netherite_dildo")) };
  // модель на сцене — тот же 3D-житель поверх канваса
  const mob = document.createElement("div"); mob.className = "gz-mob"; mob.innerHTML = `<div class="gz-mtag">Газан</div><div class="gz-mbox"></div>`; view.appendChild(mob);
  const mbox = mob.querySelector(".gz-mbox");
  let mv = null, face = 0, faceT = 0, walkTo = null, hurtT = 0, invul = 0, kb = 0, jump = 0;
  const parts = [];
  function buildMob() {
    mv && mv.destroy && mv.destroy(); mv = null;
    const h = view.clientHeight * 0.6; mob.style.height = h + "px"; mob.style.width = h * 0.62 + "px";
    if (USE_GL) { const bb = ZMModel3D.bbox(ZM.P20M.gazan); mv = ZMGL.build(ZM.P20M.gazan, U("assets/textures/p20/"), { unit: h * 0.9375 * 0.86 / bb.size[1], persp: 2400 }); }
    mbox.innerHTML = "";
    if (mv) { mv.el.style.cssText = "width:100%;height:100%;display:block"; mbox.appendChild(mv.el); } else mbox.innerHTML = `<img class="gz-fb" src="${T("i/gazan")}" alt="">`;
  }
  function sizeCv() { const d = Math.min(2, devicePixelRatio || 1); cv.width = view.clientWidth * d; cv.height = view.clientHeight * d; cx.setTransform(d, 0, 0, d, 0, 0); cx.imageSmoothingEnabled = false; }
  const groundY = () => view.clientHeight * 0.8;
  function drawStage(t) {
    const w = view.clientWidth, h = view.clientHeight, gy = groundY(), ts = Math.max(28, Math.round(w / 18));
    cx.clearRect(0, 0, w, h);
    const g = cx.createRadialGradient(w / 2, gy, 10, w / 2, gy, w * 0.7); g.addColorStop(0, "rgba(255,200,60,.22)"); g.addColorStop(1, "rgba(0,0,0,0)");
    cx.fillStyle = g; cx.fillRect(0, 0, w, h);
    // луч прожектора на Газана
    if (G.alive) { const mx = G.x * w; const lg = cx.createLinearGradient(0, 0, 0, gy); lg.addColorStop(0, "rgba(255,230,140,0)"); lg.addColorStop(1, "rgba(255,230,140,.16)");
      cx.fillStyle = lg; cx.beginPath(); cx.moveTo(mx - 20, 0); cx.lineTo(mx + 20, 0); cx.lineTo(mx + w * 0.12, gy); cx.lineTo(mx - w * 0.12, gy); cx.closePath(); cx.fill(); }
    for (let x = 0; x < w + ts; x += ts) { if (IM.side.complete) cx.drawImage(IM.side, x, gy, ts, ts); for (let y = gy + ts; y < h; y += ts) if (IM.dirt.complete) cx.drawImage(IM.dirt, x, y, ts, ts); }
    cx.fillStyle = "rgba(0,0,0,.35)"; cx.fillRect(0, gy + ts, w, h);
    // тень
    if (G.alive) { cx.fillStyle = "rgba(0,0,0,.4)"; cx.beginPath(); cx.ellipse(G.x * w + kb, gy + 2, view.clientHeight * 0.1, 6, 0, 0, Math.PI * 2); cx.fill(); }
    // дроп
    if (G.drop) { const d = G.drop, s = Math.max(48, ts * 1.5), bob = Math.sin(t / 400) * 5; d.t = (d.t || 0) + 1;
      const gl = cx.createRadialGradient(d.x * w, gy - s * 0.6, 2, d.x * w, gy - s * 0.6, s); gl.addColorStop(0, "rgba(190,120,255,.35)"); gl.addColorStop(1, "rgba(190,120,255,0)"); cx.fillStyle = gl; cx.fillRect(d.x * w - s, gy - s * 1.6, s * 2, s * 2);
      cx.save(); cx.translate(d.x * w, gy - s * 0.6 + bob); cx.scale(0.35 + 0.65 * Math.abs(Math.cos(t / 900)), 1); if (IM.dildo.complete) cx.drawImage(IM.dildo, -s / 2, -s / 2, s, s); cx.restore(); }
    // частицы
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life--; if (p.life <= 0) { parts.splice(i, 1); continue; }
      cx.globalAlpha = Math.min(1, p.life / 20);
      if (p.im) cx.drawImage(p.im, p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); else { cx.fillStyle = p.c; cx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
      cx.globalAlpha = 1; }
  }
  function renderHp() {
    const n = Math.ceil(G.hp / 2), half = G.hp % 2 === 1;
    $("#hp").innerHTML = G.alive ? Array.from({ length: 10 }, (_, i) => `<i class="${i < Math.floor(G.hp / 2) ? "f" : i === Math.floor(G.hp / 2) && half ? "h" : "e"}"></i>`).join("") + `<b>${G.hp} / 20</b>` : "";
    $("#empty").hidden = G.alive || !!G.dead;
    $("#emptyWhy").textContent = G.drop ? "Кликни по дропу, чтобы подобрать." : eggN() ? "Яйцо в руке — кликни по земле." : "Яйца нет. Скрафти его в разделе 01.";
    $("#eggN").textContent = eggN();
    mob.style.display = G.alive || G.dead ? "" : "none";
    void n;
  }
  listeners.push(renderHp);
  function place() {
    const w = view.clientWidth, gy = groundY();
    mob.style.left = (G.x * w + kb - mob.clientWidth / 2) + "px";
    mob.style.top = (gy - mob.clientHeight - jump) + "px";
  }
  function spawnAt(x) {
    if (G.alive) { chat("§7Газан уже на сцене. Второго мир не выдержит."); return; }
    if (!eggN()) { K.say("Нет яйца. Скрафти его в разделе 01.", true); return; }
    take("gazan_spawn_egg", 1); G.alive = true; G.hp = 20; G.x = clamp(x, 0.12, 0.88); G.dead = 0; face = 0; walkTo = null;
    snd("pop", 0.6, 0.8); puff(G.x * view.clientWidth, groundY() - view.clientHeight * 0.25, "#fff", 18);
    chat("§6Газан§r появился. Имя над головой видно всегда, и сам он никуда не денется.");
    V.last = performance.now() - 17000;   // первая фраза почти сразу
    saveG(); changed();
  }
  function talk() {
    if (!G.alive) { K.say("Сначала призови Газана", true); return; }
    if (hand === "carrot") { chat("§7Газан не размножается. С золотой морковью в руке он даже торговать не станет."); snd("vno", 0.4, 0.8); particle(IM.angry, 1); return; }
    snd("trade_open", 0.8); grant("gazan_summon"); chat("§6Газан: §f«Хммм…»");
    face = 0; faceT = performance.now() + 4000;
    setTimeout(() => $("#trade").scrollIntoView({ behavior: motion() ? "smooth" : "instant", block: "start" }), 700);
  }
  function hit() {
    if (!G.alive) { K.say("Бить некого", true); return; }
    if (hand === "egg" || hand === "carrot") { K.say("Возьми в руку кулак или меч", true); return; }
    const now = performance.now();
    if (now < invul) { snd("weak", 0.4); return; }   // 10 тиков неуязвимости после удара
    const dmg = hand === "sword" ? 6 : 1;
    G.hp = Math.max(0, G.hp - dmg); invul = now + 500; hurtT = now + 500; kb = (Math.random() < 0.5 ? -1 : 1) * 18; jump = 14;
    snd(hand === "sword" ? "strong" : "weak", 0.5); snd("hurt_" + ri(1, 2), 0.8);
    for (let i = 0; i < 6; i++) parts.push({ x: G.x * view.clientWidth, y: groundY() - view.clientHeight * 0.3, vx: rnd(-2, 2), vy: rnd(-3, -1), g: 0.15, life: 30, s: 5, c: "#8b0000" });
    if (G.hp <= 0) die(); else { renderHp(); saveG(); }
  }
  function die() {
    G.alive = false; G.dead = performance.now(); stopSpeech(); snd("death", 0.9);
    chat("§6Газан§7 погиб. Медиа-похороны.");
    grant("kill_gazan"); renderHp();
    setTimeout(() => {
      puff(G.x * view.clientWidth, groundY() - view.clientHeight * 0.1, "#ddd", 26);
      G.dead = 0; G.drop = { x: G.x, t: 0 }; renderHp(); saveG();
    }, 1000);
  }
  function puff(x, y, c, n) { for (let i = 0; i < n; i++) parts.push({ x: x + rnd(-30, 30), y: y + rnd(-40, 40), vx: rnd(-1, 1), vy: rnd(-1.6, -0.2), g: -0.01, life: ri(25, 45), s: ri(6, 12), c }); }
  function particle(im, n) { for (let i = 0; i < n; i++) parts.push({ im, x: G.x * view.clientWidth + rnd(-20, 20), y: groundY() - view.clientHeight * 0.55, vx: rnd(-0.3, 0.3), vy: -0.6, g: 0, life: 50, s: 18 }); }
  const chat = (t) => K.chat("#log", t);
  function pickDrop(e) {
    if (!G.drop) return false;
    const r = view.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
    if (Math.abs(x - G.drop.x) > 0.09 || e.clientY - r.top < groundY() - 110) return false;
    G.drop = null; give("netherite_dildo", 1); snd("pop", 0.6, 0.7); changed(); saveG();
    chat("§7Подобран §5Дилдо из незерита§7. Другого способа его получить нет.");
    return true;
  }
  view.addEventListener("contextmenu", (e) => { e.preventDefault(); if (G.alive) talk(); });
  view.addEventListener("pointerdown", (e) => {
    if (e.button === 2) return;
    if (pickDrop(e)) return;
    const r = view.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
    const onMob = G.alive && Math.abs(x - G.x) < (mob.clientWidth / 2) / r.width && e.clientY - r.top < groundY();
    if (hand === "egg") { if (onMob) talk(); else spawnAt(x); return; }
    if (onMob) { if (hand === "carrot") talk(); else hit(); }
  });
  $("#talk").addEventListener("click", talk);
  $("#hit").addEventListener("click", hit);
  $$(".gz-hand button").forEach((b) => b.addEventListener("click", () => { hand = b.dataset.h; $$(".gz-hand button").forEach((x) => x.classList.toggle("on", x === b)); snd("click", 0.4); view.dataset.hand = hand; }));
  view.dataset.hand = hand;
  K.dl($("#mobDl"), [["Здоровье", "20 (10 сердец)"], ["Скорость", "0.5 · бродит на 0.7 от неё"], ["Замечает игрока", "до 6 блоков смотрит, до 32 — следит"], ["Модель", "житель, ужат до 93,75%"], ["Дроп", `<a href="../09-dildo/index.html">Дилдо из незерита</a>`]]);
  let visA = false; new IntersectionObserver((es) => (visA = es[0].isIntersecting)).observe(view);
  let tLast = performance.now(), nextWalk = performance.now() + 3000, nextSpeechTry = 0;
  (function loop(t) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - tLast) / 1000); tLast = t;
    if (!visA) return;
    if (cv.width !== Math.round(view.clientWidth * Math.min(2, devicePixelRatio || 1))) { sizeCv(); buildMob(); }
    kb *= 0.85; jump = Math.max(0, jump - dt * 60);
    if (G.alive) {
      // RandomStrollGoal / LookAtPlayerGoal
      if (motion() && t > nextWalk && t > faceT) { walkTo = clamp(G.x + rnd(-0.25, 0.25), 0.1, 0.9); nextWalk = t + rnd(4000, 9000); }
      if (walkTo != null) { const d = walkTo - G.x; if (Math.abs(d) < 0.005) { walkTo = null; } else { G.x += Math.sign(d) * dt * 0.045; face += ((d > 0 ? 70 : -70) - face) * 0.1; } }
      else face += (0 - face) * 0.05;
      // сам говорит: как getAmbientSound — только если кулдаун прошёл
      if (t > nextSpeechTry && V.i < 0 && ZM.sfx.on()) { nextSpeechTry = t + 1500 + Math.random() * 2500; if (cdLeft() <= 0 && Math.random() < 0.6) speak(V.idx, "stage"); }
    }
    if (mv) {
      const talkBob = V.i >= 0 && G.alive && motion() ? Math.sin(t / 90) * 1.5 : 0;
      const fall = G.dead ? Math.min(90, (t - G.dead) / 1000 * 90 * 1.6) : 0;
      mv.setRot([["x", -4 + talkBob], ["y", 180 + face], ["z", fall]]);
    }
    mob.classList.toggle("hurt", t < hurtT || !!G.dead);
    place(); drawStage(t);
  })(tLast);
  V.ui.push(() => { mob.classList.toggle("talk", V.i >= 0); if (V.i >= 0 && V.from === "stage") chat(`§6Газан§7 · фраза ${V.i + 1}`); });
  renderHp();

  /* ================= 03 СДЕЛКИ ================= */
  const gui = $("#gui");
  gui.style.setProperty("--tex", `url("${new URL(T("v/villager2"), location.href).href}")`);
  gui.style.setProperty("--wid", `url("${new URL(T("v/widgets"), location.href).href}")`);
  const offers = () => [
    { buy: ["emerald", 16], sell: ["six", 1] }, { buy: ["emerald", 16], sell: ["seven", 1] },
    ...DISCS.map(([d], i) => ({ buy: ["disc_" + d, 1], sell: ["emerald", W.prices[i]], di: i })),
  ];
  const VIS = 7;
  const itemHtml = (x, cls = "") => x ? `<span class="g-it ${cls}" data-tip="${esc(NAME[x.id])}"><img src="${ICON[x.id]}" alt="" class="${x.id.startsWith("disc") || x.id === "emerald" ? "px" : ""}">${x.n > 1 ? `<b>${x.n}</b>` : ""}</span>` : "";
  const at = (x, y, w, h) => `style="--x:${x};--y:${y}${w ? `;--w:${w};--h:${h}` : ""}"`;
  function returnSlots() { W.slots.forEach((s) => { if (s) give(s.id, s.n); }); W.slots = [null, null]; }
  function fillFor(i) {
    returnSlots();
    const o = offers()[i], have = count(o.buy[0]);
    const k = Math.min(have, Math.max(o.buy[1], Math.min(have, 64)));
    if (k > 0) { take(o.buy[0], k); W.slots[0] = { id: o.buy[0], n: k }; }
  }
  const canTrade = (i) => { if (i < 0) return false; const o = offers()[i]; return W.slots[0] && W.slots[0].id === o.buy[0] && W.slots[0].n >= o.buy[1]; };
  function doTrade(i) {
    if (!canTrade(i)) return false;
    const o = offers()[i];
    W.slots[0].n -= o.buy[1]; if (!W.slots[0].n) W.slots[0] = null;
    const left = give(o.sell[0], o.sell[1]);
    if (left) { W.slots[0] = W.slots[0] ? { id: o.buy[0], n: W.slots[0].n + o.buy[1] } : { id: o.buy[0], n: o.buy[1] }; return false; }
    if (o.di != null) { W.sold++; W.got += o.sell[1]; W.best += 32; } else { W.bought++; W.spent += 16; }
    grant("trade_gazan");
    return true;
  }
  function renderGui() {
    const sel = W.sel, list = offers(), maxS = list.length - VIS; W.scroll = clamp(W.scroll, 0, maxS);
    let h = `<div class="g-bg"></div>
      <div class="g-t" ${at(49, 6)}><span>Газан - Новичок</span></div>
      <div class="g-t l" ${at(4, 6)}><span>Сделки</span></div>
      <div class="g-xp" ${at(136, 16, 102, 5)} data-tip="Опыт: 0 / 10. За сделки с Газаном его не бывает"></div>
      <div class="g-t inv" ${at(107, 72)}><span>Инвентарь</span></div>`;
    list.slice(W.scroll, W.scroll + VIS).forEach((o, k) => {
      const i = W.scroll + k, y = 18 + k * 20, ok = count(o.buy[0]) + (W.slots[0] && W.slots[0].id === o.buy[0] ? W.slots[0].n : 0) >= o.buy[1];
      h += `<button type="button" class="g-of ${sel === i ? "sel" : ""} ${ok ? "" : "poor"}" data-of="${i}" ${at(5, y, 88, 20)} aria-label="Сделка ${i + 1}">
        <span class="g-abs" ${at(5, 1)}>${itemHtml({ id: o.buy[0], n: o.buy[1] })}</span>
        <i class="g-arr" ${at(55, 4, 10, 9)}></i>
        <span class="g-abs" ${at(68, 1)}>${itemHtml({ id: o.sell[0], n: o.sell[1] })}</span></button>`;
    });
    const sy = 18 + Math.round((139 - 27) * (maxS ? W.scroll / maxS : 0));
    h += `<div class="g-track" data-track ${at(94, 18, 6, 139)}></div><div class="g-scroll" ${at(94, sy, 6, 27)}></div>`;
    h += `<div class="g-slot" data-slot="0" ${at(136, 37, 16, 16)}>${itemHtml(W.slots[0])}</div>`;
    h += `<div class="g-slot" data-slot="1" ${at(162, 37, 16, 16)}>${itemHtml(W.slots[1])}</div>`;
    const ok = canTrade(sel);
    h += `<div class="g-slot res ${ok ? "ok" : ""}" data-res ${at(220, 37, 16, 16)}>${ok ? itemHtml({ id: list[sel].sell[0], n: list[sel].sell[1] }) : sel >= 0 ? `<span class="g-ghost">${itemHtml({ id: list[sel].sell[0], n: list[sel].sell[1] })}</span>` : ""}</div>`;
    for (let i = 0; i < 36; i++) {
      const x = 108 + (i % 9) * 18, y = i < 27 ? 84 + Math.floor(i / 9) * 18 : 142;
      h += `<div class="g-slot inv" ${at(x, y, 16, 16)}>${itemHtml(W.inv[i])}</div>`;
    }
    gui.innerHTML = h;
  }
  function fitGui() {
    const w = $("#guiWrap").clientWidth;
    const s = w >= 276 * 3 ? 3 : w >= 276 * 2 ? 2 : Math.max(1, w / 276);
    gui.style.setProperty("--s", s); $("#guiWrap").style.height = 166 * s + "px";
  }
  let opened = false;
  gui.addEventListener("click", (e) => {
    if (!opened) { opened = true; snd("trade_open", 0.7); }
    const of = e.target.closest("[data-of]");
    if (of) { const i = +of.dataset.of; W.sel = i; fillFor(i); snd(canTrade(i) ? "yes" : "no", 0.7); changed(); return; }
    if (e.target.closest("[data-track]")) { const r = e.target.getBoundingClientRect(); W.scroll = Math.round((e.clientY - r.top) / r.height * (offers().length - VIS)); renderGui(); return; }
    if (e.target.closest("[data-res]")) {
      const i = W.sel; if (!canTrade(i)) { if (i >= 0) snd("no", 0.6); return; }
      let n = 0;
      do { if (!doTrade(i)) break; n++; } while (e.shiftKey && (fillFor(i), canTrade(i)));
      if (n) { snd("trade_" + ri(1, 2), 0.8); tradeFx(n); }
      if (!W.slots[0]) fillFor(i);
      changed(); return;
    }
    const sl = e.target.closest("[data-slot]");
    if (sl) { const k = +sl.dataset.slot, x = W.slots[k]; if (x) { give(x.id, x.n); W.slots[k] = null; snd("click", 0.4); changed(); } }
  });
  gui.addEventListener("wheel", (e) => { e.preventDefault(); W.scroll = clamp(W.scroll + Math.sign(e.deltaY), 0, offers().length - VIS); renderGui(); }, { passive: false });
  // перетаскивание списка пальцем
  (function () { let d = null;
    gui.addEventListener("touchstart", (e) => { if (e.target.closest(".g-of,.g-track,.g-scroll")) d = { y: e.touches[0].clientY, s: W.scroll }; }, { passive: true });
    gui.addEventListener("touchmove", (e) => { if (!d) return; const s = parseFloat(getComputedStyle(gui).getPropertyValue("--s")) || 1, ns = clamp(Math.round(d.s - (e.touches[0].clientY - d.y) / (20 * s)), 0, offers().length - VIS); if (ns !== W.scroll) { W.scroll = ns; renderGui(); } if (e.cancelable) e.preventDefault(); }, { passive: false });
    gui.addEventListener("touchend", () => (d = null));
  })();
  const tip = document.createElement("div"); tip.className = "g-tip"; document.body.appendChild(tip);
  gui.addEventListener("pointermove", (e) => {
    const el = e.target.closest("[data-tip]");
    if (!el || e.pointerType !== "mouse") { tip.style.opacity = 0; return; }
    tip.textContent = el.dataset.tip; tip.style.opacity = 1;
    tip.style.left = Math.min(innerWidth - tip.offsetWidth - 8, e.clientX + 14) + "px"; tip.style.top = (e.clientY - 30) + "px";
  });
  gui.addEventListener("pointerleave", () => { tip.style.opacity = 0; });
  function tradeFx(n) { const f = document.createElement("div"); f.className = "g-fx"; f.textContent = n > 1 ? `×${n}` : "сделка"; gui.appendChild(f); setTimeout(() => f.remove(), 900); }
  function renderLedger() {
    const P = W.prices, lo = Math.min(...P), hi = Math.max(...P), lost = W.best - W.got;
    const rows = DISCS.map(([d, t], i) => {
      const pv = W.prev ? W.prev[i] : null, df = pv == null ? 0 : P[i] - pv;
      return `<li class="${P[i] === hi ? "hi" : P[i] === lo ? "lo" : ""}"><img class="px" src="${ICON["disc_" + d]}" alt=""><span>${esc(t.split(" - ")[1])}</span><b>${P[i]}</b><em class="${df > 0 ? "up" : df < 0 ? "dn" : ""}">${df ? (df > 0 ? "▲" : "▼") + Math.abs(df) : ""}</em></li>`;
    }).join("");
    $("#ledger").innerHTML = `
      <div class="gz-lg-h"><b>Прайс этого захода</b><span>вход в мир №${W.joins}</span></div>
      <ul class="gz-prices">${rows}</ul>
      <button type="button" class="gz-b gz-rejoin" id="rejoin">↻ Перезайти в мир</button>
      <p class="gz-note">Сделки собираются заново при каждой загрузке: блоки всегда по 16, а каждая пластинка получает новую цену от 16 до 32.</p>
      <div class="gz-scam">
        <div><span>Изумрудов</span><b>${count("emerald")}</b></div>
        <div><span>Продано пластинок</span><b>${W.sold}</b></div>
        <div><span>Недополучено</span><b class="${lost > 0 ? "bad" : ""}">${lost}</b></div>
      </div>
      <p class="gz-note">${W.sold ? (lost > 0 ? `За ${W.sold} пласт. при потолке в 32 ты мог бы получить ${W.best}. Он тебя наебал на ${lost} изумр.` : "Ты продал всё по потолку. Такое бывает раз в жизни.") : "«Недополучено» считает разницу с потолком в 32 изумруда за пластинку."}</p>
      <button type="button" class="btn-ghost" id="invReset">↺ вернуть стартовый инвентарь</button>`;
    $("#rejoin").onclick = () => {
      returnSlots(); W.prev = W.prices; W.prices = rollPrices(); W.joins++; W.sel = -1; opened = false;
      stopSpeech(); V.idx = 0; V.last = -1e9;   // индекс фразы не сохраняется
      snd("click", 0.5); changed(); K.say("Мир загружен заново: новые цены, фразы снова с первой.");
    };
    $("#invReset").onclick = () => { const j = W.joins; W = S0(); W.joins = j; snd("click", 0.4); changed(); };
  }
  listeners.push(renderGui, renderLedger);
  fitGui(); renderGui(); renderLedger();
  addEventListener("resize", fitGui);

  /* ================= 04 ЭФИР ================= */
  (function radio() {
    const tr = $("#tracks");
    const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
    tr.innerHTML = SPEECH.map((d, i) => `<li data-i="${i}"><button type="button" aria-label="Фраза ${i + 1}"><i></i></button><b>${String(i + 1).padStart(2, "0")}</b><span class="gz-wave">${Array.from({ length: 28 }, (_, k) => `<i style="--h:${(0.25 + 0.75 * Math.abs(Math.sin((i + 1) * 7.3 + k * 1.7) * Math.cos(k * 0.6 + i))).toFixed(2)}"></i>`).join("")}</span><em>${mmss(d)}</em><small>${i === 5 ? "ждёт 40 с" : "ждёт 20 с"}</small><div class="gz-prog"><u></u></div></li>`).join("");
    tr.addEventListener("click", (e) => { const li = e.target.closest("li"); if (!li) return; const i = +li.dataset.i; if (V.i === i) stopSpeech(); else speak(i, "list"); });
    $("#cycT").textContent = `минимум ${mmss(CYCLE)} · звучит ${mmss(SPEECH.reduce((a, b) => a + b, 0))}`;
    const cyc = $("#cyc");
    cyc.innerHTML = SPEECH.map((d, i) => `<div class="gz-seg ${i === 4 ? "long" : ""}" style="left:${START_AT[i] / CYCLE * 100}%;width:${d / CYCLE * 100}%" title="Фраза ${i + 1}"><b>${i + 1}</b></div>`).join("")
      + SPEECH.map((d, i) => { const s = START_AT[i] + d, e = i < 9 ? START_AT[i + 1] : CYCLE; return e > s ? `<div class="gz-gap" style="left:${s / CYCLE * 100}%;width:${(e - s) / CYCLE * 100}%"></div>` : ""; }).join("")
      + `<div class="gz-head" id="cycHead"></div>`;
    $("#cycAx").innerHTML = [0, 60, 120, 180, 220].map((s) => `<span style="left:${s / CYCLE * 100}%">${mmss(s)}</span>`).join("");
    let live = null;
    $("#live").addEventListener("click", () => {
      if (live) { live = null; stopSpeech(); $("#live").textContent = "▶ Круг в реальном времени"; return; }
      if (!ZM.sfx.on()) { K.say("Звук выключен в верхней панели", true); return; }
      live = { t0: performance.now() - START_AT[V.idx] * 1000, next: V.idx };
      $("#live").textContent = "■ Остановить";
    });
    (function f() {
      requestAnimationFrame(f);
      const now = performance.now();
      if (live) {
        const el = ((now - live.t0) / 1000) % CYCLE;
        if (Math.abs(el - START_AT[live.next]) < 0.1 || (live.next === 0 && el < 0.1) || el > START_AT[live.next] && el - START_AT[live.next] < 0.3) { speak(live.next, "live"); live.next = (live.next + 1) % 10; }
        $("#cycHead").style.left = el / CYCLE * 100 + "%"; $("#cycHead").style.opacity = 1;
        $("#liveT").textContent = V.i >= 0 ? `Фраза ${V.i + 1}` : `Пауза. До фразы ${live.next + 1}: ${Math.ceil(((START_AT[live.next] - el) % CYCLE + CYCLE) % CYCLE)} с`;
      } else $("#cycHead").style.opacity = 0;
      $$("#tracks li").forEach((li, i) => { const on = V.i === i; li.classList.toggle("on", on); li.classList.toggle("next", V.i < 0 && V.idx === i);
        li.querySelector("u").style.width = on && V.a && V.a.duration ? (V.a.currentTime / V.a.duration * 100) + "%" : "0"; });
      $$("#cyc .gz-seg").forEach((s, i) => s.classList.toggle("on", V.i === i));
    })();
  })();

  /* ================= 05 ДОСЬЕ ================= */
  const FACTS = [
    ["Профессии не будет", "Любая попытка сменить ему данные жителя просто игнорируется. Рабочее место рядом ставить бесполезно: он всегда «Газан - Новичок»."],
    ["Мозг отключён", "Ванильный распорядок жителя выключен целиком. Остались пять простых целей: плавать, торговать, бродить, смотреть на игрока в радиусе 6 блоков и оглядываться."],
    ["Не размножается", "Золотое яблоко и золотая морковь не действуют, а любовный таймер сбрасывается. С морковью в руке даже окно торговли не откроется."],
    ["Монстры проходят мимо", "Для враждебных мобов Газан не цель: зомби и разбойники его не трогают. Из мобов обидеть его можешь только ты."],
    ["Никуда не денется", "Отмечен как постоянный: не исчезает, когда уходишь далеко. Имя над головой видно всегда, даже не глядя на него."],
    ["Опыта нет", "За сделки не дают опыта ни тебе, ни ему. Полоска в окне торговли так и останется пустой."],
    ["Цены живут до перезахода", "Список сделок пересобирается при каждой загрузке мира, поэтому ценник на пластинки меняется только после выхода и входа."],
    ["Незерит только с него", "После смерти выпадает дилдо из незерита. Рецепта у этого блока нет, так что другого способа получить его тоже нет."],
    ["Молния делает ведьму", "Ударит молния — Газан превратится в ведьму. Имя «Газан» останется, а сделки и дилдо из незерита пропадут навсегда."],
    ["Яйцо по Газану — обычный малыш", "Кликни яйцом призыва по самому Газану, и появится ребёнок, но не Газан, а простой житель без имени и без сделок."],
    ["Герою деревни скидка", "Эффект «Герой деревни» срезает хотя бы один изумруд: блоки 6 и 7 уходят за 15 вместо 16. На пластинки не действует, там платят не изумрудами."],
    ["Речь с начала после перезахода", "Какую речь он скажет следующей, в мир не сохраняется. После выхода и входа Газан снова начнёт с первой."],
  ];
  $("#factsBox").innerHTML = FACTS.map(([t, d], i) => `<article class="gz-fact"><span>${String(i + 1).padStart(2, "0")}</span><b>${esc(t)}</b><p>${esc(d)}</p></article>`).join("");

  /* ================= 06–07 ================= */
  adv = K.adv({ list: ZM.P20.advancements, store: "p20.adv", icon: (a) => T("i/" + a.icon), chatSel: "#log", intro: "Пять скрытых: от двух цифр до медиа-похорон." });
  if (count("six") && count("seven")) grant("blocks_67");
  K.timeline($("#tl"), [
    { date: "07.05.2026", t: "Газан 67", d: "Житель-исполнитель со своей текстурой, десятью фразами и окном торговли: блоки 6 и 7 за изумруды, скупка четырнадцати пластинок. Яйцо из двух цифроблоков, дилдо из незерита в дропе, пять ачивок.", c: "#ffd700" },
  ]);
  K.finNav(20, $("#finNav"));
  ZM.reveal && ZM.reveal();
})();
