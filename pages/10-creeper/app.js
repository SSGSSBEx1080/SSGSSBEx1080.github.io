/* =====================================================================
   №10 · Кастрация криперов + Супер-TNT
   Поведение из кода мода: CreeperCastrationHandler, CreeperMixin (casted_creeper.png),
   CreeperEggsItem, CreeperStatueBlock, SuperTntBlock, PrimedSuperTnt, SuperTntMinecart.
   Ванильное 1.19.2: фитиль крипера 30 тиков, Explosion (лучи, урон), LightningBolt.
   Данные: data/p10_creeper.js, механика: mod-src/java/p10/MECHANICS.md
   ===================================================================== */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = ZM.esc, U = ZM.url, S = ZM.store, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (n) => Math.floor(Math.random() * n), pick = (a) => a[rnd(a.length)];
  const P = ZM.P10, M = ZM.P10M, IT = P.items;
  const T = (n) => U(`assets/textures/p10/${n}.png`);
  const fmt = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString("ru-RU", { maximumFractionDigits: d });
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MC = { 4: "#aa0000", 7: "#aaaaaa", 8: "#555555", a: "#55ff55", b: "#55ffff", c: "#ff5555", e: "#ffff55", f: "#ffffff" };
  const col = (c, t) => `<span style="color:${MC[c]}">${esc(t)}</span>`;
  const imgs = {};
  const IMG = (n) => imgs[n] || (imgs[n] = Object.assign(new Image(), { src: T(n) }));

  ZM.topbar({ crumb: "№10 · Кастрация криперов", ...ZM.pointNav(10) });

  /* ================= звук ================= */
  const EXT = new Audio().canPlayType("audio/ogg; codecs=vorbis") ? "ogg" : "mp3";
  const MASTER_VOLUME = 0.4;
  const LIB = { creeper: ["creeper1", "creeper2", "creeper3"], explode: ["explode", "explode2", "explode3", "explode4"], thunder: ["thunder1", "thunder2", "thunder3"],
    eat: ["eat1", "eat2", "eat3"], crackle: ["crackle1", "crackle2"], grass: ["grass1", "grass2"] };
  const CORE = ["click", "pop", "orb", "levelup", "stone", "hit", "page", "equip", "toast_in", "challenge"];
  let sndOn = S.get("p10.snd", true);
  const pool = {};
  function play(name, vol = 1, rate = 1) {
    if (!sndOn) return;
    if (CORE.includes(name)) { ZM.sfx(name, vol, rate); return; }
    const url = U(`assets/sounds/p10/${LIB[name] ? pick(LIB[name]) : name}.${EXT}`);
    try { const a = (pool[url] || (pool[url] = new Audio(url))).cloneNode(); a.volume = clamp(vol * MASTER_VOLUME, 0, 1); a.playbackRate = rate; a.preservesPitch = false; a.play().catch(() => {}); } catch (e) {}
  }
  const bSnd = $("#sndBtn");
  const syncSnd = () => { bSnd.setAttribute("aria-pressed", sndOn); bSnd.classList.toggle("on", sndOn); };
  bSnd.onclick = () => { sndOn = !sndOn; S.set("p10.snd", sndOn); syncSnd(); if (sndOn) play("click", 0.6); };
  ZM.sfx.bind(() => sndOn); syncSnd();

  /* ================= чат, вспышка ================= */
  function chat(html, life = 6500) {
    const el = $("#chat"), p = document.createElement("p"); p.innerHTML = html; el.appendChild(p);
    while (el.children.length > 5) el.firstChild.remove();
    setTimeout(() => p.classList.add("old"), life); setTimeout(() => p.remove(), life + 1200);
  }
  function flash(shake) {
    const f = $("#flash"); f.classList.remove("on"); void f.offsetWidth; f.classList.add("on");
    if (shake && !reduce) { document.body.classList.remove("shake"); void document.body.offsetWidth; document.body.classList.add("shake"); setTimeout(() => document.body.classList.remove("shake"), 500); }
  }

  /* ================= ачивки ================= */
  const ADV = P.advancements;
  let got = S.get("p10.adv", []).filter((k) => ADV.some((a) => a.key === k));
  let advSel = null, renderTree = () => {};
  const titleH = (a) => `<span style="color:${MC[a.color]};${a.bold ? "font-weight:700" : ""}">${esc(a.title)}</span>`;
  const descH = (d) => esc(d).replace(/§k(.*?)§r/g, (m, s) => `<span class="obf" data-n="${s.length}">${s}</span>`);
  function grant(key) {
    const a = ADV.find((x) => x.key === key);
    if (!a || got.includes(key)) return;
    got.push(key); S.set("p10.adv", got);
    ZM.toast({ iconHtml: `<img src="${T(a.icon)}" alt="" style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated">`, title: titleH(a), frame: a.frame });
    if (a.chat) chat(`Игрок ${a.frame === "challenge" ? "завершил испытание" : a.frame === "goal" ? "достиг цели" : "получил достижение"} <span style="color:${a.frame === "challenge" ? "#aa00aa" : "#55ff55"}">[${esc(a.title)}]</span>`);
    advSel = key; renderTree(key);
  }
  // §k: мигающие случайные символы, как в игре
  const OBF = "ABCDEFGHJKLMNOPQRSTUVWXYZabdeghkmnpqrsuvwxyz0123456789#$%&?@";
  setInterval(() => $$(".obf").forEach((o) => { o.textContent = Array.from({ length: +o.dataset.n }, () => OBF[rnd(OBF.length)]).join(""); }), 70);

  /* ================= инвентарь (хотбар) ================= */
  const INV_KEYS = ["creeper_eggs", "cooked_creeper_eggs", "charged_creeper_eggs", "creeper_statue", "super_tnt", "super_tnt_minecart"];
  const ICON = (k) => k === "super_tnt_minecart" ? T("mod/super_tnt_minecart") : T("iso/" + k);
  const inv = Object.assign(Object.fromEntries(INV_KEYS.map((k) => [k, 0])), S.get("p10.inv", {}));
  const INV_ADV = { cooked_creeper_eggs: "cook_creeper_eggs", super_tnt: "craft_super_tnt", super_tnt_minecart: "craft_super_tnt_minecart" };   // inventory_changed
  function renderHotbar(bump) {
    $("#hotbar").innerHTML = INV_KEYS.map((k) => `<button type="button" class="hb ${inv[k] ? "" : "zero"} ${IT[k].rare ? "rare" : ""} ${bump === k ? "bump" : ""}" data-k="${k}" data-tip="${esc(IT[k].name)}" data-tip-info="${inv[k] ? inv[k] + " шт." : "пусто"}${IT[k].food ? " · клик: съесть" : ""}" data-tip-sub="${IT[k].id}"><img class="${k === "super_tnt_minecart" ? "px" : ""}" src="${ICON(k)}" alt=""><i>${inv[k] > 1 ? inv[k] : ""}</i></button>`).join("");
  }
  function addItem(k, n = 1) {
    const max = IT[k].stack === 1 ? 1 : 64 * 9;
    if (IT[k].stack === 1 && inv[k] >= 1) { chat(`${esc(IT[k].name)}: стак 1, вторая не влезет`); return false; }
    inv[k] = Math.min(max, inv[k] + n); S.set("p10.inv", inv); renderHotbar(k); refreshAll();
    if (INV_ADV[k]) setTimeout(() => grant(INV_ADV[k]), 350);
    return true;
  }
  function takeItem(k, n = 1) { if (inv[k] < n) return false; inv[k] -= n; S.set("p10.inv", inv); renderHotbar(); refreshAll(); return true; }
  const refreshers = [];
  const refreshAll = () => refreshers.forEach((f) => f());
  $("#hotbar").addEventListener("click", (e) => {
    const b = e.target.closest("[data-k]"); if (!b) return; const k = b.dataset.k;
    if (IT[k].food && inv[k]) eat(k);
    else if (!inv[k]) chat(`${esc(IT[k].name)}: в хотбаре нет. ${k === "creeper_eggs" || k === "charged_creeper_eggs" ? "Кастрируй крипера наверху" : "Возьми в креативной вкладке"}`);
    else ({ creeper_statue: "#statue", super_tnt: "#range", super_tnt_minecart: "#cart", charged_creeper_eggs: "#supertnt" })[k] && document.querySelector(({ creeper_statue: "#statue", super_tnt: "#range", super_tnt_minecart: "#cart", charged_creeper_eggs: "#supertnt" })[k]).scrollIntoView({ behavior: "smooth" });
  });
  // полёт иконки в хотбар
  function flyTo(fromEl, k) {
    const to = $(`#hotbar [data-k="${k}"] img`); if (!fromEl || !to) return;
    const a = fromEl.getBoundingClientRect(), z = to.getBoundingClientRect(), f = document.createElement("img");
    f.src = ICON(k); f.style.cssText = `position:fixed;z-index:150;left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px;pointer-events:none;image-rendering:pixelated;transition:transform .55s cubic-bezier(.5,-0.3,.6,1),opacity .55s`;
    document.body.appendChild(f);
    requestAnimationFrame(() => { f.style.transform = `translate(${z.left - a.left}px,${z.top - a.top}px) scale(${z.width / a.width})`; f.style.opacity = 0.5; });
    setTimeout(() => f.remove(), 600);
  }

  /* ================= еда ================= */
  let eating = false, nauseaT = 0;
  function eat(k) {
    if (eating) return; eating = true;
    const it = IT[k];
    for (let i = 0; i < 4; i++) setTimeout(() => play("eat", 0.6, 0.9 + Math.random() * 0.2), i * 380);
    setTimeout(() => {
      eating = false; if (!takeItem(k)) return;
      play("burp", 0.5);
      const sat = it.food * it.satMod * 2;
      chat(`${col("f", it.name)}: +${it.food / 2} ${plural(it.food / 2, "окорочок", "окорочка", "окорочков")}, насыщение +${fmt(sat)}`);
      if (k === "creeper_eggs") {
        grant("eat_creeper_eggs");
        if (Math.random() < it.eff.p) {
          document.body.classList.add("nausea"); clearTimeout(nauseaT);
          nauseaT = setTimeout(() => document.body.classList.remove("nausea"), it.eff.sec * 1000);
          chat(`<span style="color:#b5e36b">Тошнота</span> на ${it.eff.sec} секунд. Шанс был 20%, повезло`);
        }
      }
    }, 1600);
  }

  /* ================= 3D-модели (WebGL, без него — изометрическая иконка) ================= */
  function view3d(box, key, opt = {}) {
    let v = null, rot = { x: opt.rx ?? -18, y: 35 }, drag = null, last = 0, vis = true;
    const iso = () => { box.innerHTML = `<img src="${T("iso/" + key)}" alt="" style="width:60%;height:60%;object-fit:contain;margin:auto;display:block">`; v = null; };
    function build() {
      box.innerHTML = ""; if (v && v.destroy) v.destroy(); v = null;
      if (!(window.ZMGL && ZMGL.supported())) return iso();
      const model = M[key], bb = ZMModel3D.bbox(model), r = box.getBoundingClientRect();
      const unit = Math.min(r.width || 300, r.height || 300) * (opt.fill || 0.5) / Math.max(...bb.size, 8);
      v = ZMGL.build(model, U("assets/textures/p10/"), { unit, persp: 1400, onFail: iso });
      if (!v) return;
      v.el.style.cssText = "width:100%;height:100%;display:block"; box.appendChild(v.el); v.setRot([["x", rot.x], ["y", rot.y]]);
    }
    box.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, rx: rot.x, ry: rot.y }; box.setPointerCapture(e.pointerId); });
    box.addEventListener("pointermove", (e) => { if (!drag) return; rot.y = drag.ry + (e.clientX - drag.x) * 0.5; rot.x = clamp(drag.rx - (e.clientY - drag.y) * 0.4, -80, 80); last = performance.now(); v && v.setRot([["x", rot.x], ["y", rot.y]]); });
    const up = () => { drag = null; }; box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);
    box.addEventListener("contextmenu", (e) => e.preventDefault());
    new IntersectionObserver((es) => { vis = es[0].isIntersecting; }).observe(box);
    return { build, tick(dt, now) { if (!v || !vis || drag) return; if (now - last > 1500 && !reduce) rot.y += dt * (opt.spin ?? 16); rot.x += ((opt.rx ?? -18) - rot.x) * Math.min(1, dt * (now - last > 1500 ? 1.5 : 0)); v.setRot([["x", rot.x], ["y", rot.y]]); } };
  }
  const viewers = [];

  /* ================= 3D-крипер: модель сущности + заряд (armor, раздут на 2 px, прокрутка uv, сложение цвета) ================= */
  function creeper3d(box, opt = {}) {
    let base = null, aura = null, rot = { x: opt.rx ?? -6, y: opt.ry ?? 62 }, drag = null, moved = false, last = -9e9, vis = true, t = 0;
    let skin = opt.skin || "normal", charged = !!opt.charged;
    const ok = () => window.ZMGL && ZMGL.supported();
    function build() {
      [base, aura].forEach((v) => v && v.destroy && v.destroy()); base = aura = null; box.innerHTML = "";
      if (!ok()) { box.classList.add("no3d"); return false; }
      const r = box.getBoundingClientRect(), unit = Math.min((r.height || 300) * (opt.fill || 0.86) / 30, (r.width || 200) * 0.9 / 16);
      base = ZMGL.build(M.creeper_entity, U(`assets/textures/p10/ent/${skin}/`), { unit, persp: 1400, onFail: () => box.classList.add("no3d") });
      aura = ZMGL.build(M.creeper_aura, U("assets/textures/p10/ent/armor/"), { unit, persp: 1400, additive: true, repeat: true, light: 0.9 });
      if (!base) { box.classList.add("no3d"); return false; }
      for (const v of [base, aura]) if (v) { v.el.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block"; box.appendChild(v.el); }
      if (aura) { aura.el.classList.add("aura3d"); aura.el.style.display = charged ? "" : "none"; }
      base.el.classList.add("base3d"); apply(); return true;
    }
    const apply = () => { const o = [["x", rot.x], ["y", rot.y]]; base && base.setRot(o); aura && charged && aura.setRot(o); };
    box.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, rx: rot.x, ry: rot.y }; moved = false; box.setPointerCapture(e.pointerId); });
    box.addEventListener("pointermove", (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 6) moved = true; rot.y = drag.ry + dx * 0.5; rot.x = clamp(drag.rx - dy * 0.4, -60, 60); last = performance.now(); apply(); });
    const up = () => { drag = null; }; box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);
    box.addEventListener("contextmenu", (e) => e.preventDefault());
    new IntersectionObserver((es) => { vis = es[0].isIntersecting; }).observe(box);
    return {
      build, get ok() { return !!base; }, wasDrag: () => moved,
      setSkin(k) { if (k === skin) return; skin = k; base && base.setTextures(U(`assets/textures/p10/ent/${k}/`)); },
      setCharged(c) { charged = c; if (aura) { aura.el.style.display = c ? "" : "none"; apply(); } },
      tick(dt, now) {
        if (!base || !vis) return;
        if (!drag && now - last > 1600 && !reduce) { rot.y = (opt.ry ?? 62) + Math.sin(now / 2600) * (opt.sway ?? 22) + (opt.spin ? now / 1000 * opt.spin : 0); rot.x += ((opt.rx ?? -6) - rot.x) * Math.min(1, dt * 2); apply(); }
        if (charged && aura) { t += dt * 20; aura.setUV(t * 0.01, t * 0.01); }
      },
    };
  }

  /* ================= HERO: операционная ================= */
  const cv = $("#ecg"), g = cv.getContext("2d"), EW = cv.width, EH = cv.height;
  const ecg = { bpm: 72, target: 72, x: 0, phase: 0, buf: new Float32Array(EW).fill(EH / 2), panic: 0 };
  function beat(t) {   // PQRST на отрезке 0..1
    if (t < 0.1) return -Math.sin(t / 0.1 * Math.PI) * 6;
    if (t < 0.16) return 0; if (t < 0.19) return 10; if (t < 0.23) return -52; if (t < 0.27) return 18; if (t < 0.4) return 0;
    if (t < 0.55) return -Math.sin((t - 0.4) / 0.15 * Math.PI) * 10;
    return 0;
  }
  function ecgFrame(dt) {
    ecg.bpm += (ecg.target - ecg.bpm) * Math.min(1, dt * 2);
    if (ecg.panic > 0) ecg.panic -= dt;
    let steps = Math.round(dt * 160);
    while (steps-- > 0) {
      ecg.phase += ecg.bpm / 60 / 160; if (ecg.phase >= 1) ecg.phase -= 1;
      ecg.x = (ecg.x + 1) % EW;
      ecg.buf[ecg.x] = EH / 2 + (cr.gone ? 0 : beat(ecg.phase)) + (ecg.panic > 0 ? (Math.random() - 0.5) * 8 : 0);
    }
    g.clearRect(0, 0, EW, EH);
    g.lineWidth = 2.5; g.strokeStyle = ecg.panic > 0 || cr.gone ? "#ff3b3b" : "#39ff7a"; g.shadowColor = g.strokeStyle; g.shadowBlur = 10;
    g.beginPath();
    for (let i = 1; i < EW; i++) { const xi = (ecg.x + 1 + i) % EW; i === 1 ? g.moveTo(i, ecg.buf[xi]) : g.lineTo(i, ecg.buf[xi]); }
    g.stroke(); g.shadowBlur = 0;
    g.fillStyle = "#fff"; g.beginPath(); g.arc(EW - 2, ecg.buf[ecg.x], 3, 0, Math.PI * 2); g.fill();
    $("#vBpm").textContent = cr.gone ? 0 : Math.round(ecg.bpm);
  }

  const SHEARS_MAX = 238;
  const cr = { charged: false, casted: false, hiss: 0, gone: false };
  let tool = "shears", shearsDur = S.get("p10.shears", SHEARS_MAX), ops = S.get("p10.ops", 0);
  const crEl = $("#orCreeper");
  const hero3d = creeper3d($("#cr3d"), { fill: 0.92 });
  viewers.push(hero3d);
  function crRender() {
    hero3d.setSkin(cr.casted ? "casted" : "normal"); hero3d.setCharged(cr.charged);
    crEl.classList.toggle("charged", cr.charged); crEl.classList.toggle("casted", cr.casted);
    crEl.classList.toggle("hiss", cr.hiss > 0); crEl.classList.toggle("gone", cr.gone);
    $("#crImg").src = T(cr.casted ? "casted_front" : "creeper_front");
    const fb = $("#vFuseBox"); fb.classList.toggle("bad", cr.hiss > 0 || (!cr.casted && cr.charged)); fb.classList.toggle("ok", cr.casted);
    $("#vFuse").textContent = cr.casted ? "0" : cr.charged ? "6" : "3";
    $("#vOps").textContent = ops;
    $("#monName").textContent = "ПАЦИЕНТ: " + (cr.casted ? "CASTED " : "") + (cr.charged ? "CHARGED " : "") + "CREEPER";
    $("#boltBtn").classList.toggle("on", cr.charged);
    $("#orDur").innerHTML = tool === "shears"
      ? `Ножницы <i><u style="width:${shearsDur / SHEARS_MAX * 100}%"></u></i> ${shearsDur}/${SHEARS_MAX}`
      : `Нож: −1 прочности за операцию, как у ножниц`;
  }
  $("#toolSeg").addEventListener("click", (e) => { const b = e.target.closest("[data-t]"); if (!b) return; tool = b.dataset.t; $$("#toolSeg button").forEach((x) => x.classList.toggle("on", x === b)); play("equip", 0.5); crRender(); });

  // ткнуть пальцем: крипер начинает шипеть (фитиль 30 тиков)
  function poke() {
    if (cr.gone) return;
    if (cr.casted) { crEl.classList.remove("cut"); void crEl.offsetWidth; crEl.classList.add("cut"); play("creeper", 0.5, 0.8); chat(pick(["Даже не шипит", "Ему уже всё равно", "Смотрит с укором", "Больше не опасен"])); return; }
    if (cr.hiss > 0) return;
    cr.hiss = 30; play("hiss", 0.7); ecg.panic = 1.6; ecg.target = 180;
    chat(`<span style="color:#ff5555">Шипит!</span> 1,5 секунды, режь`); crRender();
  }
  function heroTick() {   // 20 тиков в секунду
    if (cr.hiss > 0 && !cr.casted) {
      cr.hiss--;
      // как в игре: раздувается и мигает белым всё чаще
      const f = 1 - cr.hiss / 30, sw = 1 + Math.sin(f * 100) * f * 0.01;
      crEl.style.setProperty("--sw", (1 + f * f * 0.4) * sw); crEl.style.setProperty("--sh", (1 + f * f * 0.1) / sw);
      crEl.classList.toggle("white", ((f * 10) | 0) % 2 === 1);
      if (cr.hiss === 0) boomCreeper();
    }
  }
  function boomCreeper() {
    cr.gone = true; crRender(); play("explode", 0.8); flash(true);
    ecg.panic = 0; ecg.target = 0;
    chat(`Игрок был взорван Крипером${cr.charged ? " (заряженным, сила 6)" : ""}`);
    setTimeout(() => { newPatient(); chat("Следующий пациент на столе"); }, 1600);
  }
  function unswell() { crEl.style.removeProperty("--sw"); crEl.style.removeProperty("--sh"); crEl.classList.remove("white"); }
  function newPatient() { Object.assign(cr, { charged: false, casted: false, hiss: 0, gone: false }); unswell(); ecg.target = 72; $("#orDrops").innerHTML = ""; crRender(); }
  function castrate() {
    if (cr.gone) return;
    if (cr.casted) { play("click", 0.5); chat("Уже кастрирован. Второй раз резать нечего"); return; }
    if (tool === "shears" && shearsDur <= 0) { chat("Ножницы сломались. Бери новые"); shearsDur = SHEARS_MAX; S.set("p10.shears", shearsDur); crRender(); return; }
    const wasHiss = cr.hiss > 0;
    cr.casted = true; cr.hiss = 0; unswell(); ops++; S.set("p10.ops", ops);
    if (tool === "shears") { shearsDur--; S.set("p10.shears", shearsDur); }
    play("shear", 0.9, 0.95 + Math.random() * 0.1); setTimeout(() => play("creeper", 0.55, 1.35), 160);
    crEl.classList.remove("cut"); void crEl.offsetWidth; crEl.classList.add("cut");
    ecg.panic = 0.8; ecg.target = 130; setTimeout(() => { ecg.target = 58; }, 1400);
    const k = cr.charged ? "charged_creeper_eggs" : "creeper_eggs", n = 1 + rnd(2);
    const box = $("#orDrops");
    for (let i = 0; i < n; i++) {
      const b = document.createElement("button"); b.type = "button"; b.dataset.k = k; b.setAttribute("data-tip", IT[k].name); b.setAttribute("data-tip-info", "клик: подобрать");
      b.style.left = `calc(50% + ${(i ? 40 : -80) + rnd(20)}px)`; b.style.setProperty("--dx0", `${(i ? -30 : 30)}px`);
      b.innerHTML = `<img src="${T("iso/" + k)}" alt="">`; box.appendChild(b);
      setTimeout(() => pickDrop(b), 5000);
    }
    setTimeout(() => play("pop", 0.4, 1.2), 500);
    chat(wasHiss ? "Успел. Фитиль погас навсегда" : cr.charged ? `Заряженный! Выпало ${n} ${col("b", IT[k].name)}` : `Готово. Выпало: ${n} ${plural(n, "яйцо", "яйца", "яиц")}`);
    crRender();
    grant(cr.charged ? "castrate_charged_creeper" : "castrate_creeper");
  }
  function pickDrop(b) {
    if (!b.isConnected || b.classList.contains("take")) return;
    b.classList.add("take"); play("pop", 0.5, 1.3 + Math.random() * 0.3); addItem(b.dataset.k); setTimeout(() => b.remove(), 400);
  }
  $("#orDrops").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { e.stopPropagation(); pickDrop(b); } });
  crEl.addEventListener("click", () => { if (hero3d.wasDrag()) return; poke(); });
  $("#cutBtn").addEventListener("click", castrate);
  $("#boltBtn").addEventListener("click", () => {
    if (cr.gone || cr.charged) return;
    cr.charged = true; play("thunder", 0.6); play("explode", 0.3, 1.3); flash(false);
    chat(cr.casted ? "Заряжен, но взрываться ему уже нечем" : `Молния! Теперь это ${col("b", "заряженный крипер")}: взрыв 6`);
    crRender();
  });
  $("#nextBtn").addEventListener("click", () => { play("click", 0.5); newPatient(); });

  /* ================= I · ПАЦИЕНТ ================= */
  $("#chartGrid").innerHTML = P.patient.map(([v, n, s]) => `<div class="cv"><b>${esc(v)}</b><span>${esc(n)}</span><i>${esc(s)}</i></div>`).join("");
  $("#cmp").innerHTML = `<div><span></span><span>до</span><span>после</span></div>` + P.compare.map(([a, b, c]) => `<div><span>${esc(a)}</span><span>${esc(b)}</span><span>${esc(c)}</span></div>`).join("");
  (function () {
    const ba = $("#ba"); let on = false;
    const set = (x) => { const r = ba.getBoundingClientRect(), p = clamp((x - r.left) / r.width, 0, 1) * 100; $("#baAfter").style.clipPath = `inset(0 0 0 ${p}%)`; $("#baLine").style.left = p + "%"; };
    ba.addEventListener("pointerdown", (e) => { on = true; ba.setPointerCapture(e.pointerId); set(e.clientX); });
    ba.addEventListener("pointermove", (e) => on && set(e.clientX));
    ba.addEventListener("pointerup", () => { on = false; });
  })();

  /* ================= II · ОПЕРАЦИЯ ================= */
  $("#steps").innerHTML = [
    ["shears", "Взять инструмент", "Ножницы или нож. Больше ничего не режет."],
    ["creeper_face", "ПКМ по криперу", "Хоть когда: даже если он уже шипит. Операция мгновенная."],
    ["iso/creeper_eggs", "Собрать яйца", "Падает 1–2 штуки, звук как у стрижки овцы. Инструмент теряет 1 прочности."],
    ["casted_face", "Пациент готов", "Лицо в шоке навсегда. Не шипит, не раздувается, не взрывается. Даже от молнии."],
  ].map(([ic, t, p]) => `<li><img src="${T(ic)}" alt=""><b>${esc(t)}</b><p>${esc(p)}</p></li>`).join("");

  viewers.push(creeper3d($("#chView"), { charged: true, fill: 0.9, ry: 60, sway: 0, spin: 24 }));

  /* ================= III · ЯЙЦА ================= */
  const EGGS = ["creeper_eggs", "cooked_creeper_eggs", "charged_creeper_eggs"];
  const foodIcons = (n, px) => { const out = []; for (let i = 0; i < Math.ceil(n / 2); i++) out.push(`<img src="${T(n - i * 2 >= 2 ? "food_full" : "food_half")}" alt="" style="width:${px}px;height:${px}px">`); return out.join(""); };
  $("#eggGrid").innerHTML = EGGS.map((k) => { const it = IT[k]; return `<div class="egg ${it.rare ? "rare" : ""}">
    <div class="v3d" id="v_${k}"></div>
    <div class="egg-b">
      <div class="egg-id">${it.id}</div>
      <div class="egg-n" style="color:${it.color}">${esc(it.name)}</div>
      <div class="egg-food">${it.food ? foodIcons(it.food, 18) + `<span>+${fmt(it.food * it.satMod * 2)} насыщ.</span>` : `<span>не едятся · редкие · стак 64</span>`}</div>
      ${it.eff ? `<div class="egg-eff"><img src="${T("nausea")}" alt="">Тошнота 10 с · шанс 20%</div>` : ""}
      <p class="egg-note">${esc(it.note)}</p>
      <div class="egg-foot">${it.food ? `<button type="button" class="btn-or2" data-eat="${k}" data-nosfx>Съесть</button>` : `<a class="btn-or2" href="#supertnt" style="text-decoration:none">В Супер-TNT →</a>`}<span class="cnt">в хотбаре: <b data-cnt="${k}">0</b></span></div>
    </div></div>`; }).join("");
  $("#eggGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-eat]"); if (!b) return; const k = b.dataset.eat;
    if (!inv[k]) { play("click", 0.4); chat(k === "creeper_eggs" ? "Сырых яиц нет. Кастрируй крипера наверху или сломай статую рукой" : "Жареных нет. Сначала на кухню"); return; }
    eat(k);
  });
  refreshers.push(() => $$("[data-cnt]").forEach((x) => { x.textContent = inv[x.dataset.cnt]; }));
  EGGS.forEach((k) => viewers.push(view3d($("#v_" + k), k, { fill: 0.62, rx: -22 })));

  /* ================= IV · КУХНЯ ================= */
  const oven = { type: "furnace", inN: 0, outN: 0, prog: 0, lit: 0, litMax: 1600 };
  function ovenRender() {
    const tot = P.cook[oven.type];
    $("#oven").classList.toggle("smoker", oven.type === "smoker");
    $("#ovenT").textContent = oven.type === "furnace" ? "Печь" : "Коптильня";
    $("#ovIn").innerHTML = oven.inN ? `<img src="${T("iso/creeper_eggs")}" alt="">${oven.inN > 1 ? `<i>${oven.inN}</i>` : ""}` : "";
    $("#ovOut").innerHTML = oven.outN ? `<img src="${T("iso/cooked_creeper_eggs")}" alt="">${oven.outN > 1 ? `<i>${oven.outN}</i>` : ""}` : "";
    $("#ovArrow").style.clipPath = `inset(0 ${100 - oven.prog / tot * 100}% 0 0)`;
    const fl = oven.lit > 0 ? oven.lit / oven.litMax : 0;
    $("#ovFlame").style.clipPath = `inset(${100 - fl * 100}% 0 0 0)`;
    $("#ovLoad").disabled = !inv.creeper_eggs;
  }
  let crackleT = 0;
  function ovenTick() {
    const tot = P.cook[oven.type];
    if (oven.inN > 0 && oven.outN < 64) {
      if (oven.lit <= 0) { oven.lit = oven.litMax; }   // уголь: 1600 тиков, бесконечный
      oven.prog++;
      if (oven.prog >= tot) { oven.prog = 0; oven.inN--; oven.outN++; ovenRender(); }
      if (++crackleT % 50 === 0) play(oven.type === "smoker" ? "smoker1" : "crackle", 0.35);
    } else oven.prog = 0;
    if (oven.lit > 0) oven.lit--;
  }
  function ovenLoad(all) {
    const n = all ? inv.creeper_eggs : Math.min(1, inv.creeper_eggs);
    if (!n) { play("click", 0.4); $("#ovMsg").textContent = "Сырых яиц в хотбаре нет. Кастрируй крипера или сломай статую рукой"; return; }
    takeItem("creeper_eggs", n); oven.inN += n; play("pop", 0.4, 0.8); $("#ovMsg").textContent = `Жарится ${oven.inN} шт.`; ovenRender();
  }
  $("#ovIn").addEventListener("click", () => ovenLoad(false));
  $("#ovLoad").addEventListener("click", () => ovenLoad(true));
  $("#ovOut").addEventListener("click", () => {
    if (!oven.outN) return;
    const n = oven.outN; flyTo($("#ovOut img"), "cooked_creeper_eggs"); oven.outN = 0;
    addItem("cooked_creeper_eggs", n); play("orb", 0.5, 0.8 + Math.random() * 0.4);
    $("#ovMsg").textContent = `+${n} жареных, опыта +${fmt(n * P.cook.xp, 2)}`; ovenRender();
  });
  $("#ovenSeg").addEventListener("click", (e) => { const b = e.target.closest("[data-o]"); if (!b) return; oven.type = b.dataset.o; oven.prog = 0; $$("#ovenSeg button").forEach((x) => x.classList.toggle("on", x === b)); play("click", 0.5); ovenRender(); });
  $("#foodCmp").innerHTML = [["iso/creeper_eggs", "Яйца Крипера", 2, 0.3], ["iso/cooked_creeper_eggs", "Жареные Яйца Крипера", 8, 0.8], ["cooked_beef", "Стейк (ваниль)", 8, 0.8], ["rotten_flesh", "Гнилая плоть (ваниль)", 4, 0.1]]
    .map(([ic, n, f, m]) => `<div class="fc"><img src="${T(ic)}" alt=""><div><b>${esc(n)}</b><div class="bars10">${foodIcons(f, 14)}</div><div class="sat"><i style="width:${f * m * 2 / 12.8 * 100}%"></i></div><small>еда ${f} · насыщение ${fmt(f * m * 2)}</small></div></div>`).join("");
  refreshers.push(ovenRender);

  /* ================= V · СТАТУЯ ================= */
  viewers.push(view3d($("#stView"), "creeper_statue", { fill: 0.78, rx: -12 }));
  let brk = "pick", statuePlaced = S.get("p10.placed", true);
  const stCv = $("#stCv"), sg = stCv.getContext("2d"), stOff = document.createElement("canvas"); stOff.width = 128; stOff.height = 128;
  let stStage = -1;
  function stDraw() {
    const w = stCv.width, h = stCv.height; sg.imageSmoothingEnabled = false; sg.clearRect(0, 0, w, h);
    const pl = IMG("oak_planks"); if (pl.complete && pl.naturalWidth) for (let x = 0; x < w; x += 24) sg.drawImage(pl, x, h - 24, 24, 24); else pl.onload = stDraw;
    if (!statuePlaced) return;
    const st = IMG("iso/creeper_statue"); if (!st.complete || !st.naturalWidth) { st.onload = stDraw; return; }
    const o = stOff.getContext("2d"); o.imageSmoothingEnabled = false; o.clearRect(0, 0, 128, 128); o.globalCompositeOperation = "source-over"; o.drawImage(st, 0, 0, 128, 128);
    if (stStage >= 0) { const d = IMG("destroy_" + stStage); if (d.complete) { o.globalCompositeOperation = "source-atop"; for (let y = 0; y < 128; y += 32) for (let x = 0; x < 128; x += 32) o.drawImage(d, x, y, 32, 32); } }
    sg.drawImage(stOff, w / 2 - 64, h - 24 - 122, 128, 128);
  }
  for (let i = 0; i < 10; i++) IMG("destroy_" + i);
  function stRender() {
    stDraw();
    $("#stBreak").disabled = !statuePlaced; $("#stPlace").disabled = statuePlaced;
  }
  $("#brkSeg").addEventListener("click", (e) => { const b = e.target.closest("[data-b]"); if (!b) return; brk = b.dataset.b; $$("#brkSeg button").forEach((x) => x.classList.toggle("on", x === b)); play("equip", 0.4); });
  $("#stBreak").addEventListener("click", () => {
    if (!statuePlaced) return;
    let hits = 0; const n = brk === "pick" ? 6 : 14;   // рукой дольше
    $("#stBreak").disabled = true;
    const iv = setInterval(() => {
      play("hit", 0.5, 0.9); hits++; stStage = Math.min(9, Math.floor(hits / n * 10)); stDraw();
      if (hits < n) return;
      clearInterval(iv); stStage = -1; play("stone", 0.7); statuePlaced = false; S.set("p10.placed", false); stRender();
      const drop = $("#stDrop"); drop.innerHTML = "";
      const k = brk === "pick" ? "creeper_statue" : "creeper_eggs", cnt = brk === "pick" ? 1 : 9;
      for (let i = 0; i < cnt; i++) { const im = document.createElement("img"); im.src = T("iso/" + k); im.style.left = `calc(50% - 13px)`; im.style.setProperty("--dx", `${(i - (cnt - 1) / 2) * 22}px`); im.style.animationDelay = i * 40 + "ms"; drop.appendChild(im); }
      setTimeout(() => { drop.innerHTML = ""; addItem(k, cnt); play("pop", 0.5, 1.2); }, 1100);
      $("#stMsg").textContent = brk === "pick" ? "Кирка: статуя целая, в хотбар" : "Рукой: вместо статуи 9 сырых яиц";
    }, brk === "pick" ? 150 : 170);
  });
  function stCraftRender() {
    const n = inv.creeper_eggs, ok = n >= 9;
    $("#stCraft").innerHTML = craftHtml(Array.from({ length: 9 }, (_, i) => ({ icon: "iso/creeper_eggs", name: IT.creeper_eggs.name, info: `в хотбаре ${n}`, miss: i >= n })),
      { k: "creeper_statue", ok, info: ok ? "клик: забрать" : `нужно 9 сырых яиц, есть ${n}` }, "stCraftRes");
    $("#stCraftMsg").innerHTML = ok ? `Сырых яиц в хотбаре: <b>${n}</b>` : `Нужно 9 сырых яиц, в хотбаре ${n}. Режь криперов наверху`;
  }
  $("#stCraft").addEventListener("click", (e) => {
    const r = e.target.closest("#stCraftRes"); if (!r) return;
    if (inv.creeper_eggs < 9) { play("click", 0.4); return; }
    takeItem("creeper_eggs", 9); flyTo($("img", r), "creeper_statue"); play("pop", 0.5, 1.1); addItem("creeper_statue");
  });
  refreshers.push(stCraftRender);
  $("#stPlace").addEventListener("click", () => {
    if (statuePlaced) return;
    if (!takeItem("creeper_statue")) { play("click", 0.4); $("#stMsg").textContent = "Статуи в хотбаре нет. Скрафти из 9 сырых яиц"; return; }
    statuePlaced = true; S.set("p10.placed", true); play("stone", 0.7, 0.9); stRender(); $("#stMsg").textContent = "Стоит. Смотрит на тебя";
    grant("place_creeper_statue");
  });

  /* ================= верстак (общий) ================= */
  // cells: 9 элементов null | { icon, name, sub, miss }, res: { k, ok, info }
  function craftHtml(cells, res, id) {
    const cell = (i, c) => `<span class="c10 ${c.miss ? "miss" : ""}" style="left:${(30 + (i % 3) * 18) / 176 * 100}%;top:${(17 + Math.floor(i / 3) * 18) / 80 * 100}%"><img class="${c.px ? "px" : ""}" src="${T(c.icon)}" alt="" data-tip="${esc(c.name)}"${c.sub ? ` data-tip-sub="${c.sub}"` : ""}${c.info ? ` data-tip-info="${esc(c.info)}"` : ""}></span>`;
    return `<span class="ttl">Создание</span>` + cells.map((c, i) => c ? cell(i, c) : "").join("")
      + `<span class="c10 res ${res.ok ? "" : "off"}" id="${id}" style="left:${124 / 176 * 100}%;top:${35 / 80 * 100}%" data-tip="${esc(IT[res.k].name)}" data-tip-sub="${IT[res.k].id}" data-tip-info="${esc(res.info)}"><img class="${res.k === "super_tnt_minecart" ? "px" : ""}" src="${ICON(res.k)}" alt=""></span>`;
  }

  /* ================= VI · СУПЕР-TNT ================= */
  viewers.push(view3d($("#tntView"), "super_tnt", { fill: 0.5, rx: -22 }));
  function craftRender() {
    const has = inv.charged_creeper_eggs > 0, TNTc = { icon: "iso/tnt", name: "TNT", sub: "minecraft:tnt" };
    $("#craftGrid").innerHTML = craftHtml(Array.from({ length: 9 }, (_, i) => i === 4
      ? { icon: "iso/charged_creeper_eggs", name: IT.charged_creeper_eggs.name, info: has ? "в хотбаре " + inv.charged_creeper_eggs : "нет в хотбаре", miss: !has } : TNTc),
      { k: "super_tnt", ok: has, info: has ? "клик: забрать" : "нужны заряженные яйца" }, "craftRes");
    $("#craftMsg").innerHTML = has ? `Заряженных яиц в хотбаре: <b style="color:#55ffff">${inv.charged_creeper_eggs}</b>. TNT считаем, что есть` : `Не хватает ${col("b", "Заряженных Яиц Крипера")}. Операционная: ⚡ Молния, потом ножницы`;
  }
  $("#craftGrid").addEventListener("click", (e) => {
    const r = e.target.closest("#craftRes"); if (!r) return;
    if (!inv.charged_creeper_eggs) { play("click", 0.4); $("#hero").scrollIntoView({ behavior: "smooth" }); return; }
    takeItem("charged_creeper_eggs"); flyTo($("img", r), "super_tnt"); play("pop", 0.5, 1.1); addItem("super_tnt");
  });
  refreshers.push(craftRender);
  const TN = P.tnt;
  $("#tntNums").innerHTML = [[`${TN.vanilla} → ${TN.power}`, "сила взрыва"], [`${Math.round(1.3 * TN.power / 0.225 * 0.3)}`, "блоков: предел луча"], [`${TN.power * 2}`, "блоков: радиус урона"],
    [`${TN.fuse / 20} с`, "фитиль"], [`${TN.dry}`, "радиус осушки"], [`${TN.bolts}`, "молний после"]].map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join("");
  $("#ignGrid").innerHTML = P.ignite.map(([ic, t, s]) => `<div><img src="${T(ic)}" alt=""><b>${esc(t)}</b><span>${esc(s)}</span></div>`).join("");

  /* ================= VII · ПОЛИГОН ================= */
  // срез мира толщиной в блок: 120 × 55 клеток, 8 px
  const RC = $("#rangeCv"), rg = RC.getContext("2d"), GW = 120, GH = 55, CS = 8, SEA = 25;
  rg.imageSmoothingEnabled = false;
  const RES = { grass: 0.6, dirt: 0.5, stone: 6, deepslate: 6, coal_ore: 3, iron_ore: 3, sand: 0.5, gravel: 0.6, oak_log: 2, leaves: 0.2, bedrock: 3600000, water: 100 };
  const TEXOF = { grass: "grass_side", dirt: "dirt", stone: "stone", deepslate: "deepslate", coal_ore: "coal_ore", iron_ore: "iron_ore", sand: "sand", gravel: "gravel", oak_log: "oak_log", leaves: "leaves", bedrock: "bedrock", water: "water" };
  Object.values(TEXOF).forEach(IMG); ["mob/zombie", "mob/skeleton", "mob/creeper", "mob/casted", "mob/steve", "aura_front", "tnt_side", "mod/super_tnt", "mod/super_tnt_minecart", "rail"].forEach(IMG);
  for (let i = 0; i < 16; i++) IMG("explosion_" + i);
  let W = [], surf = [], mobs = [], lakeBot = {};
  function seeded(s) { return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function genWorld() {
    const r = seeded(1337); W = Array.from({ length: GH }, () => new Array(GW).fill(null)); surf = []; lakeBot = {};
    for (let x = 0; x < GW; x++) {
      const inLake = x >= 52 && x < 76, near = Math.min(Math.abs(x - 52), Math.abs(x - 75));
      const hill = Math.max(0, 1.6 * Math.sin(x / 8.5) + 1.2 * Math.sin(x / 3.7 + 1) + 1.4) * clamp(near / 8, 0, 1);
      const s = inLake ? SEA : SEA - Math.round(hill); surf.push(s);
      let bot = s;
      if (inLake) { bot = SEA + Math.round(7 * Math.sin(Math.PI * (x - 51.5) / 24)); lakeBot[x] = bot; for (let y = SEA; y < bot; y++) W[y][x] = "water"; }
      for (let y = bot; y < GH; y++) {
        let b = y === bot ? (inLake ? "sand" : "grass") : y < bot + 3 ? (inLake ? (y === bot + 1 ? "sand" : "gravel") : "dirt") : y >= 44 ? "deepslate" : "stone";
        if ((b === "stone" || b === "deepslate") && r() < 0.035) b = y > 36 ? "iron_ore" : "coal_ore";
        if (y >= 54 || (y === 53 && r() < 0.6) || (y === 52 && r() < 0.25)) b = "bedrock";
        W[y][x] = b;
      }
    }
    for (const tx of [16, 101]) {   // деревья
      const s = surf[tx];
      for (let y = s - 5; y < s; y++) W[y][tx] = "oak_log";
      for (let y = s - 7; y <= s - 4; y++) for (let x = tx - 2; x <= tx + 2; x++) if (!W[y][x] && !(Math.abs(x - tx) === 2 && (y === s - 7 || y === s - 4))) W[y][x] = "leaves";
    }
    mobs = [{ k: "zombie", x: 32, name: "Зомби" }, { k: "skeleton", x: 45, name: "Скелет" }, { k: "creeper", x: 86, name: "Крипер" }, { k: "casted", x: 92, name: "Кастрированный крипер" }, { k: "steve", x: 112, name: "Игрок", owner: true }]
      .map((m) => ({ ...m, y: surf[m.x], hp: 20, dead: false, charged: false, hurt: 0, w: m.k === "creeper" || m.k === "casted" ? 0.6 : 0.6, h: m.k === "creeper" || m.k === "casted" ? 1.7 : 1.95 }));
    terrainDirty = true;
  }
  let terrainDirty = true; const terrain = document.createElement("canvas"); terrain.width = GW * CS; terrain.height = GH * CS;
  function drawTerrain() {
    const t = terrain.getContext("2d"); t.imageSmoothingEnabled = false; t.clearRect(0, 0, terrain.width, terrain.height);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const b = W[y][x]; if (!b) continue;
      const im = IMG(TEXOF[b]); if (!im.complete || !im.naturalWidth) { terrainDirty = true; continue; }
      if (b === "water") t.globalAlpha = 0.78;
      t.drawImage(im, 0, 0, 16, 16, x * CS, y * CS, CS, CS); t.globalAlpha = 1;
    }
    // «глубина»: чуть темнее книзу
    const gr = t.createLinearGradient(0, SEA * CS, 0, GH * CS); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.45)");
    t.globalCompositeOperation = "source-atop"; t.fillStyle = gr; t.fillRect(0, 0, terrain.width, terrain.height); t.globalCompositeOperation = "source-over";
  }

  const rs = { kind: "super", place: "land", phase: "idle", t: 0, bomb: null, fx: [], bolts: [], stats: null, dark: 0, boltQ: 0, cartX: 0 };
  const POW = () => rs.kind === "tnt" ? TN.vanilla : TN.power;
  function bombPos() {
    if (rs.place === "water" && rs.kind !== "cart") { const x = 64; return { x, y: lakeBot[x] - 1 }; }
    const x = 40; return { x, y: surf[x] - 1 };
  }
  function solidAt(x, y) { const b = W[y] && W[y][x]; return b && b !== "water" && b !== "leaves" ? b : null; }
  // ванильный Explosion в срезе: лучи с шагом 0,3; сила луча P·(0,7..1,3), минус 0,225 за шаг и (стойкость+0,3)·0,3 в блоке
  function explode(cx, cy, power) {
    const toBlow = new Set(), N = 1440;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2, dx = Math.cos(a) * 0.3, dy = Math.sin(a) * 0.3;
      let f = power * (0.7 + Math.random() * 0.6), x = cx + 0.5, y = cy + 0.5;
      while (f > 0) {
        const bx = Math.floor(x), by = Math.floor(y);
        if (bx < 0 || by < 0 || bx >= GW || by >= GH) break;
        const b = W[by][bx];
        if (b) { f -= (RES[b] + 0.3) * 0.3; if (f > 0 && b !== "water") toBlow.add(by * GW + bx); }
        x += dx; y += dy; f -= 0.225;
      }
    }
    let n = 0; const gone = []; toBlow.forEach((k) => { const y = (k / GW) | 0, x = k % GW; if (W[y][x] && W[y][x] !== "bedrock") { W[y][x] = null; n++; gone.push([x, y]); } });
    for (let i = 0; i < Math.min(90, Math.max(12, gone.length / 3)); i++) { const [x, y] = gone.length ? pick(gone) : [cx, cy]; rs.fx.push({ x: x + 0.5, y: y + 0.5, f: -rnd(8), s: 0.7 + Math.random() * 0.9 }); }
    // урон сущностям: радиус 2P, видимость по лучам сквозь твёрдые блоки
    const R2 = power * 2; let killed = [];
    for (const m of mobs) {
      if (m.dead) continue;
      const mx = m.x + 0.5, my = m.y - m.h / 2, d = Math.hypot(mx - (cx + 0.5), my - (cy + 0.5)) / R2;
      if (d > 1) continue;
      let seen = 0, tot = 0;
      for (let sx = -1; sx <= 1; sx++) for (let sy = 0; sy <= 2; sy++) {
        tot++; const px = m.x + 0.5 + sx * m.w / 2.2, py = m.y - sy * m.h / 2.05; let clear = true;
        const L = Math.hypot(px - cx - 0.5, py - cy - 0.5), st = Math.ceil(L / 0.25);
        for (let s = 1; s < st; s++) { const qx = Math.floor(cx + 0.5 + (px - cx - 0.5) * s / st), qy = Math.floor(cy + 0.5 + (py - cy - 0.5) * s / st); if (solidAt(qx, qy)) { clear = false; break; } }
        if (clear) seen++;
      }
      const imp = (1 - d) * seen / tot, dmg = (imp * imp + imp) / 2 * 7 * R2 + 1;
      m.hp -= dmg; m.hurt = 10;
      if (m.hp <= 0) { m.dead = true; killed.push(m); }
    }
    terrainDirty = true;
    return { n, killed };
  }
  function dry(cx, cy, r) {
    let n = 0;
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (W[y][x] === "water" && Math.hypot(x - cx, y - cy) <= r) { W[y][x] = null; n++; }
    terrainDirty = true; return n;
  }
  function heightAt(x) { for (let y = 0; y < GH; y++) if (W[y][x]) return y; return GH; }
  function strike() {
    const b = rs.bomb, owner = rs.kind !== "cart";
    const cand = mobs.filter((m) => !m.dead && Math.abs(m.x - b.x) <= TN.boltR && Math.abs(m.y - b.y) <= TN.boltR && !(owner && m.owner));
    let tx, ty, hit = null;
    if (cand.length) { hit = pick(cand); tx = hit.x; ty = hit.y; }
    else { tx = clamp(b.x - TN.boltR + rnd(TN.boltR * 2 + 1), 0, GW - 1); ty = heightAt(tx); }
    const pts = []; let x = tx + 0.5; for (let y = 0; y <= ty; y += 1.5) { pts.push([x + (Math.random() - 0.5) * 1.6, y]); } pts.push([tx + 0.5, ty]);
    rs.bolts.push({ pts, life: 8 }); rs.dark = 1;
    if (hit) {
      hit.hp -= 5; hit.hurt = 10; rs.stats.boltHits++;
      if (hit.k === "creeper" || hit.k === "casted") hit.charged = true;   // молния заряжает крипера
      if (hit.hp <= 0) { hit.dead = true; rs.stats.killed.push(hit); burst(hit.x, hit.y - 1, 3, 0.5); }
    }
    if (rs.stats.bolts < 3) play("thunder", 0.55, 0.9 + Math.random() * 0.2);
    rs.stats.bolts++;
  }
  function burst(x, y, n, sc = 1) { for (let i = 0; i < n; i++) rs.fx.push({ x: x + (Math.random() - 0.5) * 2, y: y + (Math.random() - 0.5) * 2, f: -rnd(4), s: sc * (1 + Math.random()) }); }

  function fire() {
    if (rs.phase !== "idle" && rs.phase !== "done") return;
    if (rs.phase === "done") { genWorld(); placeMe(); }
    rs.bomb = bombPos(); rs.stats = { n: 0, water: 0, killed: [], bolts: 0, boltHits: 0 }; rs.fx = []; rs.bolts = [];
    if (rs.kind === "cart") { rs.phase = "roll"; rs.cartX = 2; play("minecart", 0.4); }
    else { rs.phase = "fuse"; rs.t = TN.fuse; play("ignite", 0.7); play("hiss", 0.6); if (rs.kind === "super") grant("activate_super_tnt"); }
    $("#fireBtn").disabled = true; rangeOut();
  }
  function rangeTick() {
    if (rs.phase === "roll") {   // вагонетка едет по рельсам 0,4 бл/тик к активирующему рельсу
      rs.cartX += 0.4;
      if (rs.cartX >= rs.bomb.x) { rs.cartX = rs.bomb.x; rs.phase = "fuse"; rs.t = TN.fuse; play("hiss", 0.6); }
    } else if (rs.phase === "fuse") {
      rs.t--;
      if (rs.t <= 0) {
        const b = rs.bomb, pw = rs.kind === "cart" ? TN.power + Math.random() * 2 * Math.min(0.4, 5) : POW();
        rs.power = pw;
        const r = explode(b.x, b.y, pw); rs.stats.n = r.n; rs.stats.killed = r.killed;
        for (const m of r.killed) burst(m.x, m.y - 1, 3, 0.5);
        burst(b.x, b.y, rs.kind === "tnt" ? 6 : 14, rs.kind === "tnt" ? 1 : 1.6);
        play("explode", 1, rs.kind === "tnt" ? 1 : 0.7); if (rs.kind !== "tnt") setTimeout(() => play("explode", 0.8, 0.55), 90);
        flash(rs.kind !== "tnt");
        if (rs.kind !== "tnt") { rs.stats.water = dry(b.x, b.y, TN.dry); rs.phase = "bolts"; rs.t = 0; rs.boltQ = TN.bolts; }
        else rs.phase = "done";
        rangeOut();
      }
    } else if (rs.phase === "bolts") {
      if (rs.t-- <= 0 && rs.boltQ > 0) { strike(); rs.boltQ--; rs.t = TN.boltGap - 1; rangeOut(); }
      if (rs.boltQ === 0 && rs.bolts.length === 0) { rs.phase = "done"; rangeOut(); }
    }
    for (const m of mobs) if (m.hurt > 0) m.hurt--;
  }
  function rangeOut() {
    const s = rs.stats, fin = rs.phase === "done";
    $("#fireBtn").disabled = !(rs.phase === "idle" || fin);
    $("#fireBtn").lastChild.textContent = fin ? "Ещё раз" : "Поджечь";
    $$("#placeSeg button").forEach((b) => { b.disabled = rs.kind === "cart" && b.dataset.p === "water"; });
    if (!s) { $("#rangeOut").innerHTML = [["—", "блоков снесено"], ["—", "воды высушено"], ["—", "мобов погибло"], ["—", "молний в мобов"]].map(([b, t]) => `<div><b>${b}</b><span>${t}</span></div>`).join(""); return; }
    $("#rangeOut").innerHTML = [[s.n, "блоков снесено в срезе"], [s.water, "блоков воды высушено"], [s.killed.length, s.killed.length ? s.killed.map((m) => m.name).join(", ") : "мобов погибло"], [`${s.boltHits}/${s.bolts}`, "молний попало в мобов"]]
      .map(([b, t]) => `<div><b>${b}</b><span>${esc(String(t))}</span></div>`).join("");
    if (fin) {
      const note = rs.kind === "tnt" ? (rs.place === "water" ? "Обычный TNT под водой не ломает ни блока: вода держит взрыв." : "Обычный TNT: аккуратная ямка.")
        : rs.place === "water" && rs.kind === "super" ? "Под водой взрыв не ломает блоки, зато потом озеро пропадает целиком в радиусе 20." : s.killed.some((m) => m.owner) ? `Тебя разорвало в ${meD.value} блоках. Урон достаёт до 40.` : +meD.value <= 40 ? `Выжил в ${meD.value} блоках, осталось ${Math.ceil(Math.max(1, (mobs.find((m) => m.owner) || { hp: 20 }).hp) / 2)} ♥: часть взрыва упёрлась в блоки.` : "Воронка, сухое дно и десять молний. До тебя не достало.";
      chat(esc(note));
    }
  }
  $("#bombSeg").addEventListener("click", (e) => { const b = e.target.closest("[data-k]"); if (!b || (rs.phase !== "idle" && rs.phase !== "done")) return; rs.kind = b.dataset.k; if (rs.kind === "cart") rs.place = "land"; placeMe(); $$("#bombSeg button").forEach((x) => x.classList.toggle("on", x === b)); $$("#placeSeg button").forEach((x) => x.classList.toggle("on", x.dataset.p === rs.place)); play("click", 0.5); if (rs.phase === "done") resetRange(); rangeOut(); });
  $("#placeSeg").addEventListener("click", (e) => { const b = e.target.closest("[data-p]"); if (!b || b.disabled || (rs.phase !== "idle" && rs.phase !== "done")) return; rs.place = b.dataset.p; placeMe(); $$("#placeSeg button").forEach((x) => x.classList.toggle("on", x === b)); play("click", 0.5); if (rs.phase === "done") resetRange(); });
  const meD = $("#meD");
  function placeMe() { const me = mobs.find((m) => m.owner); if (!me || rs.phase !== "idle") return; const b = bombPos(); me.x = clamp(b.x + +meD.value, 0, GW - 1); me.y = surf[me.x]; $("#meDv").textContent = meD.value; }
  meD.addEventListener("input", placeMe);
  function resetRange() { genWorld(); placeMe(); Object.assign(rs, { phase: "idle", stats: null, fx: [], bolts: [], dark: 0 }); rangeOut(); }
  $("#fireBtn").addEventListener("click", fire);
  $("#resetBtn").addEventListener("click", () => { play("click", 0.5); resetRange(); });

  function drawSprite(im, x, y, w, h, flashW) {
    if (!im.complete || !im.naturalWidth) return;
    rg.drawImage(im, x, y, w, h);
    if (flashW) { rg.save(); rg.globalCompositeOperation = "lighter"; rg.globalAlpha = flashW; rg.drawImage(im, x, y, w, h); rg.drawImage(im, x, y, w, h); rg.restore(); }
  }
  let rangeVis = false; new IntersectionObserver((es) => { rangeVis = es[0].isIntersecting; }).observe(RC);
  function drawRange(now) {
    if (!rangeVis) return;
    if (terrainDirty) { terrainDirty = false; drawTerrain(); }
    const w = RC.width, h = RC.height;
    const sky = rg.createLinearGradient(0, 0, 0, SEA * CS); const d = rs.dark;
    sky.addColorStop(0, d > 0.5 ? "#1a2233" : "#2c5a8c"); sky.addColorStop(1, d > 0.5 ? "#3a4a5e" : "#8fc0e8");
    rg.fillStyle = sky; rg.fillRect(0, 0, w, h);
    // задняя стенка среза: тёмный камень, чтобы воронка читалась как дыра
    const wall = IMG("stone"); if (wall.complete && wall.naturalWidth) { if (!drawRange.pat) drawRange.pat = rg.createPattern(wall, "repeat"); rg.save(); rg.fillStyle = "#0b0f14"; rg.fillRect(0, SEA * CS, w, h); rg.globalAlpha = 0.28; rg.setTransform(0.5, 0, 0, 0.5, 0, 0); rg.fillStyle = drawRange.pat; rg.fillRect(0, SEA * CS * 2, w * 2, h * 2); rg.restore(); } else { rg.fillStyle = "#0b0f14"; rg.fillRect(0, SEA * CS, w, h); }
    rg.drawImage(terrain, 0, 0);
    // рельсы для вагонетки
    if (rs.kind === "cart") { const rim = IMG("rail"); if (rim.complete) for (let x = 0; x <= 40; x++) { rg.save(); rg.globalAlpha = 0.9; rg.drawImage(rim, 0, 12, 16, 4, x * CS, (surf[x] - 1) * CS + CS - 3, CS, 3); rg.restore(); } }
    // заряд
    if (rs.phase === "idle" || rs.phase === "fuse" || rs.phase === "roll") {
      const b = rs.bomb || bombPos(), fuse = rs.phase === "fuse" ? rs.t : TN.fuse;
      const white = rs.phase === "fuse" && ((fuse / 5) | 0) % 2 === 0 ? 0.8 : 0;
      const sw = rs.phase === "fuse" && fuse < 10 ? 1 + (1 - fuse / 10) * 0.3 : 1;
      if (rs.kind === "cart") {
        const cx = (rs.phase === "roll" ? rs.cartX : rs.phase === "idle" ? 2 : b.x) * CS, cy = b.y * CS;
        drawSprite(IMG("mod/super_tnt_minecart"), cx - CS * 0.5 * sw, cy - CS * 1.0 * sw + CS, CS * 2 * sw, CS * 2 * sw, white);
      } else {
        const x = b.x * CS + CS / 2, y = b.y * CS + CS / 2, s = CS * sw;
        const im = rs.kind === "tnt" ? IMG("tnt_side") : IMG("mod/super_tnt");
        if (im.complete && im.naturalWidth) {
          if (rs.kind === "tnt") rg.drawImage(im, x - s / 2, y - s / 2, s, s);
          else { rg.save(); rg.translate(x, y); rg.scale(-1, 1); rg.drawImage(im, 4.4 / 16 * im.naturalWidth, 5.8 / 16 * im.naturalHeight, 3.83 / 16 * im.naturalWidth, 5 / 16 * im.naturalHeight, -s / 2, -s / 2, s, s); rg.restore(); }
          if (white) { rg.fillStyle = `rgba(255,255,255,${white})`; rg.fillRect(x - s / 2, y - s / 2, s, s); }
        }
      }
    }
    // мобы
    for (const m of mobs) {
      if (m.dead) continue;
      const im = IMG("mob/" + m.k), sc = CS / 16, iw = (m.k === "creeper" || m.k === "casted" ? 8 : 16) * sc, ih = (m.k === "creeper" || m.k === "casted" ? 26 : 32) * sc;
      const x = m.x * CS + CS / 2 - iw / 2, y = m.y * CS - ih;
      drawSprite(im, x, y, iw, ih, 0);
      if (m.hurt > 0) { rg.fillStyle = "rgba(255,0,0,.45)"; rg.fillRect(x, y, iw, ih); }
      if (m.charged) {   // заряд как в игре: прокручивающаяся текстура creeper_armor, сложение цвета
        const a = IMG("ent/armor/skin");
        if (a.complete && a.naturalWidth) {
          if (!drawRange.apat) drawRange.apat = rg.createPattern(a, "repeat");
          const off = (now / 1000) * 20 * 0.01 * 64 * 0.25;
          rg.save(); rg.globalCompositeOperation = "lighter"; rg.globalAlpha = 0.75;
          rg.beginPath(); rg.rect(x - 1.5, y - 1.5, iw + 3, ih + 3); rg.clip();
          rg.translate(x + off, y + off); rg.scale(0.25, 0.25); rg.fillStyle = drawRange.apat; rg.fillRect(-off * 4 - 20, -off * 4 - 20, (iw + 10) * 4 + 40, (ih + 10) * 4 + 40);
          rg.restore();
        }
      }
      if (m.owner && m.hp < 20 && !m.dead) { rg.font = "9px monospace"; rg.fillStyle = "#ff5555"; rg.textAlign = "center"; rg.fillText("♥" + Math.ceil(m.hp / 2), x + iw / 2, y - 16); }
      if (m.owner) { rg.font = "10px monospace"; rg.fillStyle = "rgba(0,0,0,.5)"; rg.fillRect(x - 10, y - 13, iw + 20, 11); rg.fillStyle = "#fff"; rg.textAlign = "center"; rg.fillText(rs.kind === "cart" ? "ты" : "ты (поджёг)", x + iw / 2, y - 4); }
    }
    // молнии
    for (const b of rs.bolts) {
      rg.save(); rg.strokeStyle = "rgba(170,190,255,.55)"; rg.lineWidth = 7; rg.shadowColor = "#aabfff"; rg.shadowBlur = 20;
      const line = () => { rg.beginPath(); b.pts.forEach(([x, y], i) => i ? rg.lineTo(x * CS, y * CS) : rg.moveTo(x * CS, y * CS)); rg.stroke(); };
      if (b.life % 2 || b.life > 5) { line(); rg.strokeStyle = "#fff"; rg.lineWidth = 2.5; line(); }
      rg.restore(); b.life -= 0.5;
    }
    rs.bolts = rs.bolts.filter((b) => b.life > 0);
    if (rs.bolts.length) { rg.fillStyle = "rgba(220,230,255,.12)"; rg.fillRect(0, 0, w, h); }
    // частицы взрыва
    for (const p of rs.fx) {
      p.f += 0.5; if (p.f < 0) continue;
      const im = IMG("explosion_" + Math.min(15, p.f | 0)), s = CS * 3 * p.s;
      if (im.complete) { rg.globalAlpha = 0.75; rg.drawImage(im, p.x * CS - s / 2, p.y * CS - s / 2, s, s); rg.globalAlpha = 1; }
    }
    rs.fx = rs.fx.filter((p) => p.f < 16);
    if (rs.dark > 0 && rs.phase === "done" && !rs.bolts.length) rs.dark = Math.max(0, rs.dark - 0.004);
    // радиусы (подсказка)
    if (rs.phase === "idle") {
      const b = bombPos(), cx = b.x * CS + CS / 2, cy = b.y * CS + CS / 2, P0 = POW();
      rg.save(); rg.setLineDash([4, 4]); rg.lineWidth = 1.5;
      rg.strokeStyle = "rgba(255,138,112,.8)"; rg.beginPath(); rg.arc(cx, cy, 1.3 * P0 / 0.225 * 0.3 * CS, 0, Math.PI * 2); rg.stroke();
      if (rs.kind !== "tnt") { rg.strokeStyle = "rgba(120,180,255,.8)"; rg.beginPath(); rg.arc(cx, cy, TN.dry * CS, 0, Math.PI * 2); rg.stroke(); }
      rg.restore();
    }
    // HUD
    const hud = rs.phase === "fuse" ? `<span>фитиль</span><span class="big10">${fmt(rs.t / 20, 1)} с</span>`
      : rs.phase === "roll" ? `<span>едет к активирующему рельсу</span><span class="big10">0,4 бл/тик</span>`
      : rs.phase === "bolts" ? `<span>сила ${fmt(rs.power, 1)} · вода высушена</span><span class="big10">молния ${rs.stats.bolts}/${TN.bolts}</span>`
      : rs.phase === "done" ? `<span>готово · сила ${fmt(rs.power || POW(), 1)}</span>`
      : `<span style="color:#ff8a70">- - предел луча ${Math.round(1.3 * POW() / 0.225 * 0.3)} бл.</span>${rs.kind !== "tnt" ? `<span style="color:#9cc8ff">- - осушка ${TN.dry} бл.</span>` : ""}`;
    if (hud !== drawRange.hud) { drawRange.hud = hud; $("#rangeHud").innerHTML = hud; }
  }

  /* ================= VIII · ВАГОНЕТКА ================= */
  function cartRender() {
    const v = +$("#cartSpd").value / 10, add = 2 * Math.min(v, 5), max = 30;
    $("#cartV").textContent = fmt(v, 1);
    $("#cartVs").textContent = v <= 0.4 ? "· по рельсам" : v <= 1 ? "· только с разгона вне рельс" : "· падение или пушка";
    $("#cartBar").style.width = 20 / max * 100 + "%";
    $("#cartBar2").style.left = 20 / max * 100 + "%"; $("#cartBar2").style.width = add / max * 100 + "%";
    $("#cartPw").textContent = add ? `20…${fmt(20 + add, 1)}` : "20";
    $("#cartNote").textContent = `Сила = 20 + случайное × 2 × скорость (скорость не больше 5). По рельсам вагонетка разгоняется максимум до 0,4 бл/тик, так что прибавка не больше +0,8. До 30 дотянет только вагонетка, летящая на скорости 5+ блоков в тик. Молнии после взрыва бьют и того, кто её запустил.`;
  }
  $("#cartSpd").addEventListener("input", cartRender);
  function cartCraftRender() {
    const ok = inv.super_tnt > 0, c = Array(9).fill(null);
    c[1] = { icon: "iso/super_tnt", name: IT.super_tnt.name, sub: IT.super_tnt.id, info: ok ? "в хотбаре " + inv.super_tnt : "нет в хотбаре", miss: !ok };
    c[4] = { icon: "minecart", name: "Вагонетка", sub: "minecraft:minecart", px: true };
    $("#cartCraft").innerHTML = craftHtml(c, { k: "super_tnt_minecart", ok, info: ok ? "клик: забрать" : "нужен Супер-TNT" }, "cartCraftRes");
    $("#cartCraftMsg").innerHTML = ok ? `Супер-TNT в хотбаре: <b>${inv.super_tnt}</b>. Вагонетку считаем, что есть` : "Нужен Супер-TNT: скрафти его в разделе VI";
  }
  $("#cartCraft").addEventListener("click", (e) => {
    const r = e.target.closest("#cartCraftRes"); if (!r) return;
    if (!inv.super_tnt) { play("click", 0.4); $("#supertnt").scrollIntoView({ behavior: "smooth" }); return; }
    if (inv.super_tnt_minecart) { chat("Вагонетка уже есть: стак 1"); return; }
    takeItem("super_tnt"); flyTo($("img", r), "super_tnt_minecart"); play("pop", 0.5, 1.1); addItem("super_tnt_minecart");
  });
  refreshers.push(cartCraftRender);

  /* ================= IX · КРЕАТИВ ================= */
  $("#ctabGrid").innerHTML = INV_KEYS.map((k) => `<button type="button" class="cslot ${IT[k].rare ? "rare" : ""}" data-k="${k}" data-tip="${esc(IT[k].name)}" data-tip-sub="${IT[k].id}" data-tip-info="${esc(IT[k].note)}"><img class="${k === "super_tnt_minecart" ? "px" : ""}" src="${ICON(k)}" alt="${esc(IT[k].name)}"></button>`).join("")
    + `<span class="cslot empty"></span>`.repeat(3);
  $("#ctabGrid").addEventListener("click", (e) => { const b = e.target.closest("[data-k]"); if (!b) return; const k = b.dataset.k; if (addItem(k, IT[k].stack === 1 ? 1 : 1)) { flyTo($("img", b), k); play("pop", 0.45, 1.2 + Math.random() * 0.3); } });

  /* ================= X · ПРАВИЛА ================= */
  $("#ruGrid").innerHTML = P.rules.map(([ic, t, p]) => `<div class="ru10"><img src="${T(ic)}" alt=""><b>${esc(t)}</b><p>${esc(p)}</p></div>`).join("");

  /* ================= XI · ДОСТИЖЕНИЯ ================= */
  $("#advBoard").style.setProperty("--tile", `url("${new URL(T("lime_concrete"), location.href).href}")`);
  const FRAME_RU = { task: "обычная", goal: "цель", challenge: "испытание" };
  renderTree = function (pulse) {
    const vis = ADV.filter((a) => got.includes(a.key) || !a.hidden), hidden = ADV.length - vis.length;
    if (!advSel || !vis.some((a) => a.key === advSel)) advSel = vis.length ? vis[vis.length - 1].key : null;
    const icon = (a, px) => `<span class="ic" style="width:${px}px;height:${px}px"><img src="${T(a.icon)}" alt=""></span>`;
    let html = vis.map((a, i) => (i ? `<div class="adv-link on"></div>` : "") + `<button type="button" class="adv-node ${pulse === a.key ? "pulse" : ""} ${advSel === a.key ? "sel" : ""}" data-k="${a.key}" aria-label="${esc(a.title)}"><span class="adv-frame ${a.frame}"></span>${icon(a, 32)}</button>`).join("");
    if (hidden) html += vis.length ? `<div class="adv-link"></div><div class="adv-more">+${hidden} скрыто</div>` : `<div class="adv-node"><span class="adv-frame task locked"></span><span class="q">?</span></div>`;
    $("#advChain").innerHTML = html;
    const a = ADV.find((x) => x.key === advSel);
    $("#advDetail").innerHTML = a
      ? `<div class="big"><span class="adv-frame ${a.frame}"></span>${icon(a, 38)}</div><div class="txt"><div class="tt">${titleH(a)}</div><div class="dd">${descH(a.desc)}</div><div class="cc">${esc(a.how)}</div></div><div class="meta"><span>${FRAME_RU[a.frame]}</span>${a.xp ? `<span>+${a.xp} XP</span>` : ""}</div>`
      : `<div class="big"><span class="adv-frame task locked"></span><span class="q">?</span></div><div class="txt"><div class="tt">Скрыто</div><div class="dd">Все ачивки скрыты. Режь, жарь, взрывай.</div></div>`;
    $("#advList").innerHTML = ADV.map((a) => got.includes(a.key)
      ? `<button type="button" class="adv-row has" data-k="${a.key}"><span class="fr"><span class="adv-frame ${a.frame}"></span>${icon(a, 26)}</span><span><span class="t">${titleH(a)}</span><span class="d">${descH(a.desc)}</span></span></button>`
      : `<div class="adv-row locked mystery"><span class="fr"><span class="adv-frame task locked"></span><span class="q">?</span></span><span><span class="t">???</span><span class="d">скрытое достижение: откроется, когда получишь</span></span></div>`).join("");
    const done = ADV.filter((x) => got.includes(x.key)), xp = done.reduce((s, x) => s + x.xp, 0), xpAll = ADV.reduce((s, x) => s + x.xp, 0);
    $("#advBar").style.width = (done.length / ADV.length) * 100 + "%";
    $("#advTxt").textContent = `${done.length} / ${ADV.length} · ${xp}/${xpAll} XP`;
    $("#stGot").textContent = `${done.length}/${ADV.length}`; $("#stXp").textContent = xp; $("#stXp").nextElementSibling.textContent = `из ${xpAll} XP`;
  };
  $("#advQ").textContent = ADV.length + " " + plural(ADV.length, "ачивка", "ачивки", "ачивок");
  const pickAdv = (e) => { const n = e.target.closest("[data-k]"); if (!n) return; advSel = n.dataset.k; renderTree(); };
  $("#advChain").addEventListener("click", pickAdv); $("#advList").addEventListener("click", pickAdv);
  $("#advReset").addEventListener("click", () => { got = []; S.set("p10.adv", got); advSel = null; renderTree(); });

  /* ================= XII · ИСТОРИЯ ================= */
  $("#timeline").innerHTML = P.history.map((h) => `<div class="tl10" style="--c:${h.c}"><img src="${T(h.icon)}" alt=""><div>
    <div class="tl10-top"><span class="tl10-v">${h.ver === h.date ? esc(h.date) : "v" + esc(h.ver)}</span>${h.ver !== h.date ? `<span class="tl10-d">${esc(h.date)}</span>` : ""}<span class="tl10-t">${esc(h.tag)}</span></div><b>${esc(h.title)}</b><p>${esc(h.text)}</p></div></div>`).join("");

  /* ================= ФИНАЛ ================= */
  const nav = ZM.pointNav(10);
  $("#finNav").innerHTML = [nav.prev && `<a href="${U(nav.prev.href)}">← №${String(nav.prev.n).padStart(2, "0")} ${esc(nav.prev.title)}</a>`,
    `<a href="${U("index.html")}">Все пункты</a>`,
    nav.next && `<a href="${U(nav.next.href)}">№${String(nav.next.n).padStart(2, "0")} ${esc(nav.next.title)} →</a>`].filter(Boolean).join("");
  $("#finCr").addEventListener("click", () => { const f = $("#finCr"); f.classList.remove("poke"); void f.offsetWidth; f.classList.add("poke"); play("creeper", 0.5, 0.7 + Math.random() * 0.3); });

  /* ================= общий цикл ================= */
  let last = performance.now(), acc = 0;
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    acc += dt * 20; let n = Math.floor(acc); acc -= n;
    for (let i = 0; i < n; i++) { heroTick(); ovenTick(); rangeTick(); }
    if (n) ovenRender();
    ecgFrame(dt); drawRange(now);
    viewers.forEach((v) => v.tick(dt, now));
    requestAnimationFrame(loop);
  }

  // старт
  genWorld(); placeMe(); renderHotbar(); crRender(); stRender(); cartRender(); rangeOut(); renderTree(); refreshAll();
  requestAnimationFrame(() => viewers.forEach((v) => v.build()));
  ZM.reveal();
  requestAnimationFrame(loop);
  ZM.p10 = { ecg, cr, castrate, poke, inv, addItem, grant, rs, fire, explode, oven };
})();
