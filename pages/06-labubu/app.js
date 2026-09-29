/* =====================================================================
   №06 · Лабубу-система — «кейс-опенинг»
   Все цифры из Java: data/p06_labubu.js + mod-src/java/p06/MECHANICS.md
   ===================================================================== */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = ZM.esc, U = ZM.url, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (n) => Math.floor(Math.random() * n), pick = (a) => a[rnd(a.length)];
  const P = ZM.P06, M = ZM.P06M, S = ZM.store;
  const IC = (k) => U(`assets/textures/p6/icons/${k}.png`);
  const PX = (n) => U(`assets/textures/p6/${n}.png`);
  const fmt = (v, d = 2) => (+v).toFixed(d).replace(/\.?0+$/, "").replace(".", ",");
  const pct = (v, d = 2) => (v * 100).toFixed(d).replace(".", ",") + "%";
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };
  const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  const MC = { f: "#ffffff", a: "#55ff55", 5: "#aa00aa", 6: "#ffaa00", b: "#55ffff" };

  ZM.topbar({ crumb: "№06 · Лабубу-система", ...ZM.pointNav(6) });

  /* ================= данные ================= */
  const RAR = P.rarities, RI = {}; RAR.forEach((r, i) => { RI[r.key] = i; r.i = i; });
  const TYPES = P.types, T = {}; TYPES.forEach((t) => { T[t.key] = t; t.r = t.r || 6; t.R = RAR[RI[t.rar]]; });
  const byRar = (rk) => TYPES.filter((t) => t.rar === rk);
  const TOTAL_W = TYPES.reduce((s, t) => s + t.R.weight, 0);   // 495
  const chance = (t) => t.R.weight / TOTAL_W;
  const rarChance = (r) => byRar(r.key).length * r.weight / TOTAL_W;
  function roll() {   // LabubuLootTable: каждый тип со своим весом редкости
    let x = Math.random() * TOTAL_W;
    for (const t of TYPES) { x -= t.R.weight; if (x < 0) return t.key; }
    return TYPES[TYPES.length - 1].key;
  }
  const img = (src, cls = "", alt = "") => `<img class="${cls}" src="${src}" alt="${esc(alt)}" draggable="false" loading="lazy">`;

  /* ================= состояние ================= */
  let col = S.get("p06.col", {});          // сколько фигурок каждого типа сейчас в инвентаре
  let seen = S.get("p06.seen", []);        // NBT ZitraksLabubuCollection: кто хоть раз был (навсегда)
  let boxes = S.get("p06.box", 0);
  let stats = S.get("p06.stats", { n: 0, r: {} });
  let last = S.get("p06.last", []);
  const save = () => { S.set("p06.col", col); S.set("p06.seen", seen); S.set("p06.box", boxes); S.set("p06.stats", stats); S.set("p06.last", last); };
  seen = seen.filter((k) => T[k]);

  /* ================= звук ================= */
  const EXT = new Audio().canPlayType("audio/ogg; codecs=vorbis") ? "ogg" : "mp3";
  const MASTER_VOLUME = 0.45;
  let sndOn = S.get("p06.snd", true);
  const pool = {};
  function play(name, vol = 1, rate = 1) {
    if (!sndOn) return null;
    try {
      const url = U(`assets/sounds/p06/${name}.${EXT}`);
      const a = (pool[url] || (pool[url] = new Audio(url))).cloneNode();
      a.volume = clamp(vol * MASTER_VOLUME, 0, 1); a.playbackRate = rate; a.preservesPitch = false;
      a.play().catch(() => {}); return a;
    } catch (e) { return null; }
  }
  const bSnd = $("#sndBtn");
  const syncSnd = () => { bSnd.setAttribute("aria-pressed", sndOn); bSnd.classList.toggle("on", sndOn); };
  bSnd.onclick = () => { sndOn = !sndOn; S.set("p06.snd", sndOn); syncSnd(); if (sndOn) play("click", 0.6); };
  ZM.sfx.bind(() => sndOn);   // общие звуки Minecraft (клики, тосты) слушаются кнопки звука страницы
  syncSnd();

  /* ================= ачивки ================= */
  const ADV = P.advancements;
  let got = S.get("p06.adv", []).filter((k) => ADV.some((a) => a.key === k));
  let advSel = null, renderTree = () => {};
  function trigger(tr) {
    ADV.filter((a) => a.trigger === tr && !got.includes(a.key)).forEach((a) => {
      got.push(a.key); S.set("p06.adv", got);
      ZM.toast({ iconHtml: `<img src="${IC(a.icon)}" alt="" style="width:100%;height:100%;object-fit:contain">`, title: `<span style="color:${MC[a.color]}">${esc(a.title)}</span>`, frame: a.frame });
      play(a.frame === "challenge" ? "levelup" : "orb", 0.6); advSel = a.key; renderTree(a.key);
    });
  }

  /* ================= получение фигурки (всё идёт через сюда, как inventory_changed) ================= */
  const listeners = [];
  function gain(k, src) {
    col[k] = (col[k] || 0) + 1;
    if (!seen.includes(k)) seen.push(k);
    if (src === "box") {
      stats.n++; stats.r[T[k].rar] = (stats.r[T[k].rar] || 0) + 1;
      last.unshift(k); last = last.slice(0, 14);
    }
    save();
    trigger("any");
    const ri = RI[T[k].rar];
    if (ri <= 2) trigger("common_rare");
    if (ri === 3) trigger("epic");
    if (ri === 4) trigger("legendary");
    if (k === "anime") trigger("anime");
    if (seen.length >= TYPES.length) trigger("all");
    listeners.forEach((f) => f(k));
  }
  function addBox(n = 1) { boxes += n; save(); trigger("box"); renderBox(); }

  /* ================= 3D-витрины (WebGL, запасной вариант CSS) ================= */
  const GL = window.ZMGL && ZMGL.supported();
  const viewers = [];
  function viewer(el, opt = {}) {
    const st = { x: opt.x ?? -10, y: opt.y ?? 30, vy: 0, drag: false, idle: 999, vis: true };
    let g = null, cur = null, cssRig = null;
    const v = {
      st,
      set(k) {
        if (k === cur && g) return; cur = k;
        if (g) { g.destroy && g.destroy(); g.el.remove(); g = null; }
        const m = M[k], bb = ZMModel3D.bbox(m);
        const H = el.clientHeight || 300, W = el.clientWidth || H;
        const unit = (opt.fit || 0.8) * Math.min(H, W) / Math.max(bb.size[1], Math.hypot(bb.size[0], bb.size[2]));
        if (GL) {
          g = ZMGL.build(m, U("assets/textures/p6/"), { unit, persp: 2600, onFail: () => { cur = null; v.forceCss = true; v.set(k); } });
        }
        if (!g || v.forceCss) {
          g = ZMModel3D.build(m, U("assets/textures/p6/"), { unit }); cssRig = g.rig;
        } else cssRig = null;
        g.el.classList.add("lb-gl"); el.appendChild(g.el); v.apply(true);
      },
      apply(force) {
        if (!g) return;
        if (cssRig) cssRig.style.transform = `rotateX(${st.x}deg) rotateY(${st.y}deg)`;
        else g.setRot([["x", st.x], ["y", st.y + (force ? 0.0001 : 0)]]);
      },
      get key() { return cur; },
    };
    // перетаскивание
    const host = opt.host || el;
    let lx = 0, ly = 0;
    host.addEventListener("pointerdown", (e) => { if (e.button > 2) return; st.drag = true; st.vy = 0; lx = e.clientX; ly = e.clientY; host.setPointerCapture(e.pointerId); host.classList.add("grab"); });
    host.addEventListener("pointermove", (e) => {
      if (!st.drag) return;
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      st.y += dx * 0.6; st.vy = dx * 0.6; st.x = clamp(st.x - dy * 0.4, -70, 50); st.idle = 0;
    });
    const up = () => { st.drag = false; host.classList.remove("grab"); };
    host.addEventListener("pointerup", up); host.addEventListener("pointercancel", up);
    host.addEventListener("contextmenu", (e) => e.preventDefault());
    host.addEventListener("dragstart", (e) => e.preventDefault());
    new IntersectionObserver((es) => { st.vis = es[0].isIntersecting; }).observe(el);
    viewers.push(v);
    return v;
  }
  (function spin() {
    for (const v of viewers) {
      const st = v.st; if (!st.vis) continue;
      if (!st.drag) { st.idle++; if (Math.abs(st.vy) > 0.05) { st.y += st.vy; st.vy *= 0.94; } else if (st.idle > 70) st.y += 0.45; }
      v.apply();
    }
    requestAnimationFrame(spin);
  })();

  /* ================= фон: конфетти редкостей ================= */
  (function bg() {
    const cv = $("#bgCv"), cx = cv.getContext("2d");
    const cols = RAR.map((r) => r.border).concat(["#ff7ab6", "#ff7ab6"]);
    let W, H, parts = [];
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); W = cv.width = innerWidth * d; H = cv.height = innerHeight * d; cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px"; };
    size(); addEventListener("resize", size);
    const n = innerWidth < 700 ? 26 : 54;
    for (let i = 0; i < n; i++) parts.push({ x: Math.random(), y: Math.random(), s: 3 + Math.random() * 7, v: 0.00012 + Math.random() * 0.00035, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.02, c: pick(cols), o: 0.12 + Math.random() * 0.3 });
    let on = true; document.addEventListener("visibilitychange", () => { on = !document.hidden; });
    (function loop() {
      if (on) {
        cx.clearRect(0, 0, W, H);
        const d = W / innerWidth;
        for (const p of parts) {
          p.y += p.v; p.a += p.va; if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); }
          cx.save(); cx.globalAlpha = p.o; cx.translate(p.x * W, p.y * H); cx.rotate(p.a); cx.fillStyle = p.c;
          cx.fillRect(-p.s * d / 2, -p.s * d * 0.3, p.s * d, p.s * d * 0.6); cx.restore();
        }
      }
      requestAnimationFrame(loop);
    })();
  })();

  /* ================= HERO ================= */
  const colN = () => seen.length;
  $("#heroStats").innerHTML = [
    ["26", "фигурок"], ["5", "редкостей"], [pct(1 / TOTAL_W * 5, 2), "шанс конкретной легендарки"], ["13³", "блоков в зоне ауры"],
  ].map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join("");
  const hero = viewer($("#heroModel"), { fit: 0.86, host: $("#heroStage"), x: -8, y: 28 });
  let heroKey = "galactic", heroT = 0;
  function setHero(k, user) {
    heroKey = k; const t = T[k];
    hero.set(k);
    $("#heroStage").style.setProperty("--rc", t.R.border);
    $("#heroCard").innerHTML = `<span class="rc" style="color:${t.R.border}">${t.R.ru}</span><b>${esc(t.name)}</b><span class="au">${esc(t.aura)}</span>`;
    $$("#heroShelf .sh").forEach((b) => b.classList.toggle("on", b.dataset.k === k));
    if (user) heroT = performance.now() + 12000;
  }
  const shelfItems = TYPES.map((t) => `<button type="button" class="sh" data-k="${t.key}" style="--rc:${t.R.border}" data-tip="${esc(t.name)}" data-tip-info="${esc(t.R.ru)}">${img(IC(t.key), "", t.name)}</button>`).join("");
  $("#heroShelf").innerHTML = `<div class="sh-track">${shelfItems}${shelfItems}</div>`;
  $("#heroShelf").addEventListener("click", (e) => { const b = e.target.closest(".sh"); if (b) setHero(b.dataset.k, true); });
  setHero(heroKey);
  setInterval(() => {
    if (performance.now() < heroT || hero.st.drag || !hero.st.vis) return;
    const i = TYPES.findIndex((t) => t.key === heroKey); setHero(TYPES[(i + 1) % TYPES.length].key);
  }, 5000);
  $("#heroOpen").addEventListener("click", (e) => { e.preventDefault(); $("#case").scrollIntoView({ behavior: "smooth" }); setTimeout(openBox, 650); });

  /* ================= КЕЙС ================= */
  const boxV = viewer($("#boxModel"), { fit: 0.7, host: $("#boxStage"), x: -24, y: 25 });
  boxV.set("box");
  function renderBox() {
    $("#boxSlot").innerHTML = img(IC("box"), "", "Лабубу-бокс") + (boxes ? `<b>${boxes}</b>` : "");
    $("#boxSlot").classList.toggle("empty", !boxes);
  }
  renderBox();
  $("#boxTake").addEventListener("click", () => { addBox(1); play("pop", 0.6); });

  // рецепт из мода (data/zitraksmode/recipes/labubu_box.json): SRS / GIB / bbb
  const ING = {
    S: { id: "stone", name: "Камень", icon: "stone" }, R: { id: "red_dye", name: "Красный краситель", icon: "red_dye", px: 1 },
    G: { id: "green_dye", name: "Зелёный краситель", icon: "green_dye", px: 1 }, I: { id: "emerald", name: "Изумруд", icon: "emerald", px: 1 },
    B: { id: "blue_dye", name: "Синий краситель", icon: "blue_dye", px: 1 }, b: { id: "gold_block", name: "Золотой блок", icon: "gold_block" },
  };
  const PATTERN = ["SRS", "GIB", "bbb"];
  const ingImg = (g) => `<img class="${g.px ? "px" : ""}" src="${PX("craft/" + g.icon)}" alt="${esc(g.name)}" draggable="false">`;
  const bgui = $("#boxGui");
  bgui.style.backgroundImage = `url("${U("assets/textures/mc/ui/crafting.png")}")`;
  bgui.innerHTML = PATTERN.join("").split("").map((c, i) => { const g = ING[c]; return `<span class="cg" style="left:${(30 + (i % 3) * 18) / 176 * 100}%;top:${(17 + Math.floor(i / 3) * 18) / 80 * 100}%;--i:${i}" data-tip="${esc(g.name)}" data-tip-sub="minecraft:${g.id}">${ingImg(g)}</span>`; }).join("")
    + `<button type="button" class="cg res" id="boxCraft" style="left:${124 / 176 * 100}%;top:${35 / 80 * 100}%" data-tip="Лабубу-бокс" data-tip-info="Нажми, чтобы скрафтить" data-tip-sub="zitraksmode:labubu_box">${img(IC("box"), "", "Лабубу-бокс")}</button><div class="fu-ttl">Создание</div>`;
  $("#boxCraft").addEventListener("click", (e) => {
    addBox(1); ZM.sfx("pop", 0.6, 1.4 + Math.random() * 0.6);
    const b = e.currentTarget; b.classList.remove("took"); void b.offsetWidth; b.classList.add("took");
  });
  const need = {}; PATTERN.join("").split("").forEach((c) => (need[c] = (need[c] || 0) + 1));
  $("#boxUnlock").innerHTML = `<div class="cu-h">Рецепт скрыт, пока в инвентаре нет <b>всех шести</b> ингредиентов сразу. Тогда он откроется в книге рецептов.</div>
    <div class="cu-row">${Object.entries(need).map(([c, n]) => `<span class="cu" data-tip="${esc(ING[c].name)}" data-tip-sub="minecraft:${ING[c].id}">${ingImg(ING[c])}<b>×${n}</b></span>`).join("")}</div>`;

  // таблица шансов
  $("#odds").innerHTML = RAR.map((r) => {
    const list = byRar(r.key), rc = rarChance(r);
    return `<div class="od" style="--rc:${r.border};--bg:${r.bg}">
      <div class="od-h"><b>${r.ru}</b><span>${list.length} × вес ${r.weight}</span><em>${pct(rc, 1)}</em></div>
      <div class="od-bar"><i style="width:${(rc / rarChance(RAR[0])) * 100}%"></i></div>
      <div class="od-ics">${list.map((t) => `<span data-tip="${esc(t.name)}" data-tip-info="${pct(chance(t))} за бокс">${img(IC(t.key))}</span>`).join("")}<small>по ${pct(chance(list[0]))} каждая</small></div>
    </div>`;
  }).join("");
  function renderMine() {
    $("#mineN").textContent = stats.n ? `${stats.n} ${plural(stats.n, "бокс", "бокса", "боксов")}` : "пока ни одного";
    $("#mine").innerHTML = RAR.map((r) => {
      const n = stats.r[r.key] || 0, fact = stats.n ? n / stats.n : 0, exp = rarChance(r);
      return `<div class="mi" style="--rc:${r.border}"><span>${r.ru}</span><b>${n}</b><i><u style="width:${Math.min(100, fact / 0.5 * 100)}%"></u><s style="left:${exp / 0.5 * 100}%"></s></i><em>${stats.n ? pct(fact, 1) : "—"}</em></div>`;
    }).join("") + `<p class="mi-note">полоска — твой факт, чёрточка — сколько должно быть по весам</p>`;
    $("#lastDrops").innerHTML = last.length
      ? last.map((k, i) => `<span class="ld ${i === 0 ? "new" : ""}" style="--rc:${T[k].R.border};--bg:${T[k].R.bg}" data-tip="${esc(T[k].name)}" data-tip-info="${T[k].R.ru}">${img(IC(k))}</span>`).join("")
      : `<span class="ld-empty">тут будут последние дропы</span>`;
  }
  renderMine();
  $("#mineReset").addEventListener("click", () => { stats = { n: 0, r: {} }; last = []; save(); renderMine(); });

  /* --- рулетка LabubuCaseScreen --- */
  const C = P.caseScreen, rl = $("#rl"), strip = $("#rlStrip"), track = $("#rlTrack");
  let spin = null;
  function openBox() {
    if (spin) return;
    if (!boxes) addBox(1);   // бокса нет: сначала «крафтим»
    boxes--; save(); renderBox();
    const win = roll();
    if ($("#boxFast").checked) { gain(win, "box"); play("orb", 0.5, 0.9 + Math.random() * 0.3); flashDrop(); return; }
    const items = Array.from({ length: C.slots }, (_, i) => (i === C.winner ? win : roll()));
    rl.hidden = false; document.body.classList.add("rl-open");
    const s = clamp(track.clientWidth / (C.step * 7.2), 0.62, 1.5);
    rl.style.setProperty("--s", s);
    strip.innerHTML = items.map((k, i) => `<div class="rs" style="--rc:${T[k].R.border};--bg:${T[k].R.bg}" ${i === C.winner ? 'id="rlWin"' : ""}>${img(IC(k))}</div>`).join("");
    strip.style.transform = "translateX(0)";
    $("#rlReveal").innerHTML = ""; $("#rlReveal").className = "rl-reveal"; $(".rl-panel").classList.remove("big");
    $("#rlSub").textContent = "Открытие..."; $("#rlSub").style.color = "";
    $("#rlTake").hidden = $("#rlAgain").hidden = true; $("#rlSkip").hidden = false;
    track.classList.add("spinning");
    const jitter = (Math.random() - 0.5) * C.slotW * 0.6 * s;
    const dist = C.winner * C.step * s + (C.slotW * s) / 2 - track.clientWidth / 2 + jitter;
    spin = { t0: performance.now(), win, dist, s, audio: play(C.sound, 1), done: false };
    requestAnimationFrame(tick);
  }
  // быстрая фаза: 90% пути за 70 тиков; потом экспонента 30 тиков. k подобран так, чтобы скорость на стыке совпала
  const K = 3.75;
  function progress(t) {
    if (t <= C.fastTicks) return C.fastShare * (t / C.fastTicks);
    const u = Math.min(1, (t - C.fastTicks) / (C.spinTicks - C.fastTicks));
    return C.fastShare + (1 - C.fastShare) * (1 - Math.exp(-K * u)) / (1 - Math.exp(-K));
  }
  function tick(now) {
    if (!spin) return;
    const t = (now - spin.t0) / 50;   // 20 тиков в секунду
    strip.style.transform = `translateX(${-spin.dist * progress(Math.min(t, C.spinTicks))}px)`;
    if (t >= C.spinTicks && !spin.revealed) {
      spin.revealed = true; track.classList.remove("spinning");
      const w = $("#rlWin"); if (w) w.classList.add("win");
      const tt = T[spin.win];
      $("#rlReveal").style.setProperty("--rc", tt.R.border);
      $("#rlReveal").innerHTML = `<div class="rv-burst"></div><img class="rv-img" src="${IC(spin.win)}" alt=""><div class="rv-txt"><span style="color:${tt.R.border}">${tt.R.ru}</span><b>${esc(tt.name)}</b><em>${esc(tt.aura)}</em></div>`;
      $("#rlReveal").classList.add("on"); $(".rl-panel").classList.add("big");
    }
    if (spin.revealed) {   // 20 тиков: масштаб 2.4 -> 10 (в GUI-пикселях предмета 16×16)
      const u = clamp((t - C.spinTicks) / C.revealTicks, 0, 1), e = 1 - Math.pow(1 - u, 3);
      const sc = C.revealScale[0] + (C.revealScale[1] - C.revealScale[0]) * e;
      const im = $("#rlReveal .rv-img"); if (im) im.style.width = im.style.height = `${16 * sc * spin.s}px`;
      if (u >= 1 && !spin.done) finish();
    }
    if (!spin.done) requestAnimationFrame(tick);
  }
  function finish() {
    spin.done = true;
    const tt = T[spin.win];
    $("#rlSub").textContent = tt.R.ru; $("#rlSub").style.color = tt.R.border;
    $("#rlReveal").classList.add("txt");
    $("#rlSkip").hidden = true; $("#rlTake").hidden = $("#rlAgain").hidden = false;
    gain(spin.win, "box"); play("orb", 0.7); glints($("#rlReveal"));
    $("#rlTake").focus({ preventScroll: true });
  }
  function closeRl() {
    if (spin && !spin.done) return;
    if (spin && spin.audio) spin.audio.pause();
    spin = null; rl.hidden = true; document.body.classList.remove("rl-open");
  }
  $("#rlSkip").addEventListener("click", () => { if (spin && !spin.revealed) { spin.t0 = performance.now() - C.spinTicks * 50; if (spin.audio) spin.audio.pause(); } });
  $("#rlTake").addEventListener("click", closeRl);
  $("#rlAgain").addEventListener("click", () => { closeRl(); openBox(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") { closeRl(); closeViewer(); } });
  $("#boxOpen").addEventListener("click", openBox);
  $("#boxStage").addEventListener("contextmenu", (e) => { e.preventDefault(); openBox(); });
  // ×10 в быстром режиме
  const b10 = document.createElement("button"); b10.type = "button"; b10.className = "lb-btn sm"; b10.textContent = "×10"; b10.hidden = true;
  $(".cs-inv").appendChild(b10);
  $("#boxFast").addEventListener("change", (e) => { b10.hidden = !e.target.checked; });
  b10.addEventListener("click", () => { for (let i = 0; i < 10; i++) openBox(); });
  function flashDrop() { renderMine(); const n = $("#lastDrops .ld.new"); if (n) { n.classList.remove("pop"); void n.offsetWidth; n.classList.add("pop"); } }
  function glints(host) {   // частицы happy_villager
    for (let i = 0; i < 14; i++) {
      const g = document.createElement("i"); g.className = "glint";
      g.style.cssText = `left:${50 + (Math.random() - 0.5) * 60}%;top:${45 + (Math.random() - 0.5) * 50}%;animation-delay:${Math.random() * 0.4}s;background-image:url("${PX("p_glint")}")`;
      host.appendChild(g); setTimeout(() => g.remove(), 1600);
    }
  }
  listeners.push(() => renderMine());

  /* ================= ауры: тексты и формулы (LabubuAuraHandler) ================= */
  function jumpH(v) { let y = 0; while (v > 0) { y += v; v = (v - 0.08) * 0.98; } return y; }
  const AU = {
    red: (n) => [`+${n} урона к каждому удару`],
    blue: (n) => [`скорость прыжка ${fmt(0.42 + 0.24 * n)} вместо 0,42`, `прыгаешь на ${fmt(jumpH(0.42 + 0.24 * n), 1)} бл. (обычно 1,25)`],
    yellow: (n) => [`+${7 * n}% к скорости бега`],
    white: (n) => [`−${6 * n}% входящего урона`],
    black: (n) => [`+${5 * n}% к урону`],
    green: (n) => [`лечит ${n} ед. здоровья раз в 5 секунд`, `${n * 12} ед. в минуту`],
    purple: (n) => [`+${10 * n}% к скорости копания`],
    black_white: (n) => [`+${5 * n}% к урону`, `−${6 * n}% входящего урона`],
    striped: (n, o) => [o.night ? `ночь: +${10 * n}% к урону` : `день: −${10 * n}% входящего урона`, o.night ? "днём вместо этого держит удар" : "ночью вместо этого бьёт сильнее"],
    kazakh: () => ["×2 урона по лошадям", "лошадь под тобой: Скорость II"],
    ukrainian: (n) => ["×2 урона по свиньям", "свинья под тобой: Скорость XIII", `свинину ешь на ${4 * n} тиков быстрее`],
    japanese: () => ["улов с удочки ×2", "Удача II", "поле зрения ×0,5 (как в прицеле)"],
    top_hat: (n) => [`броня и твёрдость шлема +${75 * n}%`, `защитные чары шлема: +${3 * n}% защиты за уровень`],
    faseless: (n) => [`свои снаряды ×${fmt(1 + 5.55 * n)}`, `чужие снаряды в 10 блоках тормозят: ×${fmt(Math.max(0.05, 1 - 0.555 * n), 3)} за тик`],
    russian: (n) => ["+50% к урону", `еда на ${2 + n} тиков быстрее`, `пьяная камера: ${Math.round(Math.min(1, 0.35 * n) * 100)}% силы (крен 6°, рыскание 3°, FOV ±8%)`],
    neon: () => ["ночное зрение"],
    litvin: (n, o) => [o.sneak ? "в присяде: +75% урона и +50% скорости атаки" : "встань в присед: +75% урона и +50% скорости атаки", "раз в 10 секунд бьёт тебя на 1 ед. магией"],
    anonymous: () => ["невидимость", "мобы в 64 блоках сбрасывают цель", "ник над головой скрыт"],
    demon: () => ["огнестойкость", "×2 урона по горящим", "каждую секунду поджигает мобов в 6 блоках на 3 с"],
    angel: (n) => [`спасает от смерти раз в 3 минуты: здоровье ${8 + 2 * n}, Регенерация II, Сопротивление II, Поглощение III на 10 с`, "+25% к скорости", `+${2 * n} брони`, "−50% входящего урона"],
    galactic: () => ["центр гравитации в самой фигурке: предметы в 10 блоках от неё кружат вокруг неё по часовой", "мобов отбрасывает от фигурки"],
    rainbow: () => ["раз в секунду взрослые животные в 6 блоках влюбляются"],
    golden: (n) => [`раз в 10 секунд ${n} ${plural(n, "яблоко или морковь", "яблока или моркови", "яблок или морковок")} на земле в 4 блоках становятся золотыми`],
    buddha: (n, o) => o.quran ? ["Коран в руке пробивает зону: урон снова проходит"] : ["в 8 блоках нельзя нанести урон и сломать блок", "мобы бросают цель и оружие"],
    booba: () => ["раз в 10 секунд появляется ведро спермы", "у жителей рядом сердечки"],
    anime: (n) => [`5 случайных баффов из 11, смена каждые 5 с`, `уровень эффектов: ${ROMAN[n] || n}`],
  };
  const NOTE = {
    blue: "Высота посчитана по физике игры: каждый тик скорость −0,08 и ×0,98.",
    buddha: "Щит пробивает только Коран в руке. Плащ логии Сэнгоку его игнорирует. Аура чинилась в 1.0.3.",
    anonymous: "Радиус всего 3 блока: фигурку надо держать совсем рядом.",
    faseless: "Радиус торможения чужих снарядов 10 блоков, минимум ×0,05 за тик.",
    russian: "Сила пьяной камеры: min(1; 0,35·n). Три фигурки уже почти максимум. Аура чинилась в 1.0.5.",
    anime: "Уровень баффов = число Аниме Лабубу в зоне минус 1. Аура чинилась в 1.0.5.",
    angel: "Спасение срабатывает вместо смерти и показывает анимацию тотема.",
    neon: "Текстура у этой фигурки частично «missing texture»: фиолетово-чёрная шахматка из игры.",
    litvin: "Бонус работает только пока сидишь в присяде.",
    top_hat: "Считается от брони того шлема, что надет. Без шлема бонуса нет.",
  };

  /* ================= КОЛЛЕКЦИЯ ================= */
  let tab = "ALL";
  $("#colTabs").innerHTML = [["ALL", "все", "#fff"], ...RAR.map((r) => [r.key, r.ru.toLowerCase(), r.border])]
    .map(([k, l, c]) => `<button type="button" role="tab" class="ct" data-k="${k}" style="--rc:${c}">${l}<span></span></button>`).join("");
  $("#colTabs").addEventListener("click", (e) => { const b = e.target.closest(".ct"); if (!b) return; tab = b.dataset.k; renderCol(); });
  function renderCol() {
    $$("#colTabs .ct").forEach((b) => {
      b.classList.toggle("on", b.dataset.k === tab);
      const list = b.dataset.k === "ALL" ? TYPES : byRar(b.dataset.k);
      b.querySelector("span").textContent = `${list.filter((t) => seen.includes(t.key)).length}/${list.length}`;
    });
    const list = tab === "ALL" ? TYPES : byRar(tab);
    $("#colGrid").innerHTML = list.map((t) => {
      const has = seen.includes(t.key), n = col[t.key] || 0;
      return `<button type="button" class="cc6 ${has ? "has" : "no"}" data-k="${t.key}" style="--rc:${t.R.border};--bg:${t.R.bg}">
        <span class="cc6-r">${t.R.ru}</span>
        <span class="cc6-n">${n ? "×" + n : has ? "было" : ""}</span>
        <span class="cc6-ic">${img(IC(t.key), "", t.name)}</span>
        <b>${esc(t.name)}</b>
        <span class="cc6-a">${esc(t.aura)}</span>
        <span class="cc6-f"><em>${pct(chance(t))}</em><i>${t.r !== 6 ? "радиус " + t.r : t.tag}</i></span>
      </button>`;
    }).join("");
    const n = colN();
    $("#colBar").style.width = (n / TYPES.length) * 100 + "%";
    $("#colTxt").textContent = n >= TYPES.length ? "ПОЛНАЯ КОЛЛЕКЦИЯ" : `${n} из ${TYPES.length} · осталось ${TYPES.length - n}`;
    $("#colQ").textContent = `${n} / ${TYPES.length}`;
    $("#heroCol").textContent = `${n}/${TYPES.length}`;
  }
  renderCol(); listeners.push(renderCol);
  $("#colGrid").addEventListener("click", (e) => { const b = e.target.closest(".cc6"); if (b) openViewer(b.dataset.k); });

  /* --- витрина фигурки --- */
  const vw = $("#vw"); let vwV = null;
  function openViewer(k) {
    const t = T[k];
    ZM.sfx("page", 0.6);
    vw.hidden = false; document.body.classList.add("rl-open");
    vw.style.setProperty("--rc", t.R.border); vw.style.setProperty("--bg", t.R.bg);
    if (!vwV) vwV = viewer($("#vwModel"), { fit: 0.84, host: $("#vwStage"), x: -8, y: 25 });
    vwV.st.y = 25; vwV.st.idle = 0;
    requestAnimationFrame(() => { vwV.set(k); });
    const L = [1, 2, 3].map((n) => AU[k](n, { night: true, sneak: true }).map(esc).join("<br>"));
    const flat = L.every((x) => x === L[0]);   // аура не зависит от числа фигурок
    const rows = flat ? `<tr><td>1+</td><td>${L[0]}</td></tr>` : L.map((x, i) => `<tr><td>${i + 1}</td><td>${x}</td></tr>`).join("");
    const next = RAR[t.R.i + 1], prev = RAR[t.R.i - 1];
    $("#vwInfo").innerHTML = `
      <div class="vw-r" style="color:${t.R.border}">${t.R.ru}</div>
      <h3 id="vwName">${esc(t.name)}</h3>
      <div class="vw-id">zitraksmode:labubu_${t.key}</div>
      <div class="vw-kv">
        <div><span>шанс из бокса</span><b>${pct(chance(t))}</b><small>1 из ${Math.round(1 / chance(t))}</small></div>
        <div><span>радиус ауры</span><b>${t.r}</b><small>куб ${2 * t.r + 1}³</small></div>
        <div><span>в инвентаре</span><b>${col[k] || 0}</b><small>${seen.includes(k) ? "в коллекции" : "ещё не было"}</small></div>
      </div>
      <h4>Аура</h4>
      <table class="vw-tb"><thead><tr><th>n</th><th>${flat ? "не стакается: одна фигурка даёт всё" : "что даёт, если рядом n таких фигурок"}</th></tr></thead><tbody>${rows}</tbody></table>
      ${NOTE[k] ? `<p class="vw-note">${esc(NOTE[k])}</p>` : ""}
      <h4>Где взять</h4>
      <p class="vw-p">Лабубу-бокс${prev ? ` · фьюжн из 9 фигурок редкости «${prev.ru.toLowerCase()}» (выпадет случайная из ${byRar(t.rar).length})` : ""}.${next ? "" : " Дальше не сплавляется."}</p>
      <div class="vw-btns"><button type="button" class="lb-btn hot" id="vwPlace">Поставить на карту аур</button></div>`;
    $("#vwPlace").onclick = () => { closeViewer(); auPlaceNear(k); $("#auras").scrollIntoView({ behavior: "smooth" }); };
    $("#vwX").focus({ preventScroll: true });
  }
  function closeViewer() { if (vw.hidden) return; vw.hidden = true; if (rl.hidden) document.body.classList.remove("rl-open"); }
  $("#vwX").addEventListener("click", closeViewer);
  vw.addEventListener("click", (e) => { if (e.target === vw) closeViewer(); });

  /* ================= ФЬЮЖН ================= */
  let grid = Array(9).fill(null);
  const gui = $("#fuGui");
  gui.style.backgroundImage = `url("${U("assets/textures/mc/ui/crafting.png")}")`;
  gui.innerHTML = Array.from({ length: 9 }, (_, i) => `<button type="button" class="fs" data-i="${i}" style="left:${(30 + (i % 3) * 18) / 176 * 100}%;top:${(17 + Math.floor(i / 3) * 18) / 80 * 100}%"></button>`).join("")
    + `<button type="button" class="fr6" id="fuOut" style="left:${124 / 176 * 100}%;top:${35 / 80 * 100}%"></button><div class="fu-ttl">Создание</div>`;
  function fuValid() {
    if (grid.some((k) => !k)) return null;
    const r = T[grid[0]].rar; if (!grid.every((k) => T[k].rar === r)) return null;
    return RAR[RI[r]].next;
  }
  function renderFu() {
    $$(".fs", gui).forEach((b, i) => { const k = grid[i]; b.innerHTML = k ? img(IC(k)) : ""; b.dataset.tip = k ? T[k].name : ""; if (!k) delete b.dataset.tip; });
    const nx = fuValid(), out = $("#fuOut");
    out.classList.toggle("ok", !!nx);
    out.style.setProperty("--rc", nx ? RAR[RI[nx]].border : "transparent");
    out.innerHTML = nx ? `<span class="q">?</span>` : "";
    if (nx) out.dataset.tip = `Случайная: ${RAR[RI[nx]].ru.toLowerCase()}`; else delete out.dataset.tip;
    // инвентарь: сколько свободно (минус то, что лежит в сетке)
    const inGrid = {}; grid.forEach((k) => { if (k) inGrid[k] = (inGrid[k] || 0) + 1; });
    const avail = (k) => (col[k] || 0) - (inGrid[k] || 0);
    const owned = TYPES.filter((t) => (col[t.key] || 0) > 0);
    $("#fuInvN").textContent = owned.length ? `${owned.reduce((s, t) => s + (col[t.key] || 0), 0)} шт.` : "пусто";
    $("#fuInv").innerHTML = owned.length
      ? owned.map((t) => `<button type="button" class="fi" data-k="${t.key}" style="--rc:${t.R.border}" ${avail(t.key) ? "" : "disabled"} data-tip="${esc(t.name)}" data-tip-info="${t.R.ru}">${img(IC(t.key))}<b>${avail(t.key)}</b></button>`).join("")
      : `<p class="fu-empty">Фигурок нет. Открой пару боксов выше или насыпь из креатива.</p>`;
    $("#fuFill").innerHTML = RAR.slice(0, 4).map((r) => {
      const have = byRar(r.key).reduce((s, t) => s + (col[t.key] || 0), 0);
      return `<span class="ff" style="--rc:${r.border}"><button type="button" data-r="${r.key}" class="ff-a" ${have >= 9 ? "" : "disabled"} title="Выложить 9 фигурок этой редкости">9× ${r.ru.toLowerCase()} <small>${have}</small></button><button type="button" data-c="${r.key}" class="ff-c" title="Креатив: +9 случайных этой редкости">+9</button></span>`;
    }).join("");
  }
  gui.addEventListener("click", (e) => {
    const s = e.target.closest(".fs"); if (s) { grid[+s.dataset.i] = null; play("click", 0.4); renderFu(); return; }
    if (e.target.closest("#fuOut")) {
      const nx = fuValid(); if (!nx) return;
      grid.forEach((k) => { col[k]--; if (col[k] <= 0) delete col[k]; });
      grid = Array(9).fill(null);
      const k = pick(byRar(nx)).key;
      play("levelup", 0.35, 1.4);
      const out = $("#fuOut"); out.classList.add("boom"); setTimeout(() => out.classList.remove("boom"), 700);
      gain(k, "fusion");
      fuResult(k);
    }
  });
  function fuResult(k) {
    const t = T[k], el = document.createElement("div"); el.className = "fu-pop"; el.style.setProperty("--rc", t.R.border);
    el.innerHTML = `${img(IC(k))}<span style="color:${t.R.border}">${t.R.ru}</span><b>${esc(t.name)}</b>`;
    $(".fu-gui-wrap").appendChild(el); glints(el); setTimeout(() => el.remove(), 2600);
  }
  $("#fuInv").addEventListener("click", (e) => {
    const b = e.target.closest(".fi"); if (!b || b.disabled) return;
    const i = grid.indexOf(null); if (i < 0) return;
    grid[i] = b.dataset.k; play("click", 0.4); renderFu();
  });
  $("#fuFill").addEventListener("click", (e) => {
    const a = e.target.closest(".ff-a"), c = e.target.closest(".ff-c");
    if (c) { for (let i = 0; i < 9; i++) gain(pick(byRar(c.dataset.c)).key, "creative"); play("pop", 0.6); renderFu(); return; }
    if (a && !a.disabled) {
      grid = Array(9).fill(null); const pool = [];
      byRar(a.dataset.r).forEach((t) => { for (let i = 0; i < (col[t.key] || 0); i++) pool.push(t.key); });
      pool.sort((x, y) => (col[y] || 0) - (col[x] || 0));   // сначала тратим дубликаты
      for (let i = 0; i < 9; i++) grid[i] = pool[i];
      play("click", 0.5); renderFu();
    }
  });
  renderFu(); listeners.push(renderFu);

  // лестница
  $("#fuLadder").innerHTML = RAR.map((r, i) => `<div class="fl" style="--rc:${r.border};--bg:${r.bg}"><b>${Math.pow(9, 4 - i).toLocaleString("ru")}</b><span>${r.ru.toLowerCase()}</span></div>`).join("");
  // калькулятор
  (function calc() {
    const v = RAR.reduce((s, r, i) => s + rarChance(r) / Math.pow(9, 4 - i), 0);   // «легендарок» с бокса, если всё плавить
    const vEpic = RAR.slice(0, 4).reduce((s, r, i) => s + rarChance(r) / Math.pow(9, 3 - i), 0);
    const legP = rarChance(RAR[4]), epP = rarChance(RAR[3]);
    const animeFuse = 1 / TOTAL_W * 5 + (v - legP) / 6;
    const rows = [
      ["любая эпическая", 1 / epP, 1 / vEpic],
      ["любая легендарная", 1 / legP, 1 / v],
      ["именно Аниме Лабубу", TOTAL_W / 5, 1 / animeFuse],
    ];
    const line = (l, a, b) => `<div class="fc"><span>${l}</span><b>${fmt(a, 1)}</b><b class="f">${b == null ? "…" : fmt(b, 1)}</b></div>`;
    $("#fuCalc").innerHTML = `<div class="fc h"><span></span><b>без фьюжна</b><b class="f">всё плавить</b></div>` + rows.map((r) => line(...r)).join("")
      + `<div id="fcCol"><div class="fc"><span>полная коллекция</span><b>…</b><b class="f">…</b></div></div>
      <p class="fc-note">Среднее число боксов. Первые три строки посчитаны точно по весам; коллекция — симуляцией 400 прохождений (дубликаты сразу в верстак).</p>`;
    // симуляция коллекции
    const typesByR = RAR.map((r) => byRar(r.key).map((t) => TYPES.indexOf(t)));
    const rOf = TYPES.map((t) => RI[t.rar]);
    function run(fuse) {
      const s = new Uint8Array(26), spare = [0, 0, 0, 0, 0]; let got = 0, n = 0;
      const add = (i) => { if (!s[i]) { s[i] = 1; got++; } else spare[rOf[i]]++; };
      while (got < 26) {
        n++;
        let x = Math.random() * TOTAL_W, i = 0; for (; i < 26; i++) { x -= TYPES[i].R.weight; if (x < 0) break; } add(Math.min(i, 25));
        if (fuse) for (let r = 0; r < 4; r++) while (spare[r] >= 9) { spare[r] -= 9; add(pick(typesByR[r + 1])); }
      }
      return n;
    }
    setTimeout(() => {
      let a = 0, b = 0; const N = 400;
      for (let i = 0; i < N; i++) { a += run(false); b += run(true); }
      $("#fcCol").innerHTML = line("полная коллекция", a / N, b / N);
    }, 1200);
  })();

  /* ================= АУРЫ: симулятор ================= */
  const N = 21, cv = $("#auCv"), g2 = cv.getContext("2d");
  let au = S.get("p06.au", null);
  const DEMO = { player: [10, 10], items: { "12,10": "red", "12,11": "red", "8,8": "yellow", "9,13": "green", "14,6": "angel", "2,10": "rainbow", "10,3": "blue" } };
  if (!au || !au.items) au = JSON.parse(JSON.stringify(DEMO));
  let tool = "red", opt = { night: false, sneak: false, quran: false };
  const saveAu = () => S.set("p06.au", au);
  const ims = {};
  const loadI = (k, src) => { const i = new Image(); i.src = src; i.onload = () => { dirty = true; }; ims[k] = i; };
  TYPES.forEach((t) => loadI(t.key, IC(t.key)));
  loadI("steve", U("assets/textures/mc/ui/steve_face.png")); loadI("heart", PX("p_heart")); loadI("glint", PX("p_glint"));
  $("#auPal").innerHTML = `<button type="button" class="ap tool" data-t="player" data-tip="Игрок" data-tip-info="тащи по карте">${img(U("assets/textures/mc/ui/steve_face.png"), "pix")}</button>`
    + `<button type="button" class="ap tool" data-t="erase" data-tip="Ластик">✕</button>`
    + TYPES.map((t) => `<button type="button" class="ap" data-t="${t.key}" style="--rc:${t.R.border}" data-tip="${esc(t.name)}" data-tip-info="${esc(t.aura)}">${img(IC(t.key))}</button>`).join("");
  const syncPal = () => $$("#auPal .ap").forEach((b) => b.classList.toggle("on", b.dataset.t === tool));
  $("#auPal").addEventListener("click", (e) => { const b = e.target.closest(".ap"); if (!b) return; tool = b.dataset.t; syncPal(); });
  syncPal();
  let dirty = true, cell = 20, auVis = false;
  new IntersectionObserver((es) => { auVis = es[0].isIntersecting; }).observe(cv);
  function sizeAu() {
    const w = $("#auWrap").clientWidth, d = Math.min(2, devicePixelRatio || 1);
    cell = w / N; cv.width = Math.round(w * d); cv.height = Math.round(w * d); cv.style.width = cv.style.height = w + "px";
    g2.setTransform(d, 0, 0, d, 0, 0); dirty = true;
  }
  addEventListener("resize", sizeAu); sizeAu();
  function active() {   // тип -> сколько фигурок этого типа в своём радиусе
    const [px, py] = au.player, cnt = {};
    for (const [pos, k] of Object.entries(au.items)) {
      const [x, y] = pos.split(",").map(Number);
      if (Math.abs(x - px) <= T[k].r && Math.abs(y - py) <= T[k].r) cnt[k] = (cnt[k] || 0) + 1;
    }
    return cnt;
  }
  const cellAt = (e) => { const r = cv.getBoundingClientRect(); return [clamp(Math.floor((e.clientX - r.left) / cell), 0, N - 1), clamp(Math.floor((e.clientY - r.top) / cell), 0, N - 1)]; };
  let dragP = false, paint = null, lastCell = "";
  cv.addEventListener("pointerdown", (e) => {
    const [x, y] = cellAt(e), key = x + "," + y; cv.setPointerCapture(e.pointerId); lastCell = key;
    if (tool === "player" || (x === au.player[0] && y === au.player[1])) { dragP = true; au.player = [x, y]; }
    else if (tool === "erase") { if (au.items[key]) ZM.sfx("cloth", 0.7, 0.9); delete au.items[key]; paint = "erase"; }
    else if (au.items[key] === tool) { delete au.items[key]; paint = "erase"; ZM.sfx("cloth", 0.7, 0.9); }
    else { au.items[key] = tool; paint = tool; ZM.sfx("cloth", 0.8, 0.8); }   // фигурка ставится как блок (звук шерсти)
    update();
  });
  cv.addEventListener("pointermove", (e) => {
    if (!dragP && !paint) return;
    const [x, y] = cellAt(e), key = x + "," + y; if (key === lastCell) return; lastCell = key;
    if (dragP) { if (!au.items[key]) au.player = [x, y]; }
    else if (paint === "erase") { if (au.items[key]) ZM.sfx("cloth", 0.5, 0.9); delete au.items[key]; }
    else if (!(x === au.player[0] && y === au.player[1])) { if (au.items[key] !== paint) ZM.sfx("cloth", 0.5, 0.8); au.items[key] = paint; }
    update();
  });
  const stopP = () => { dragP = false; paint = null; };
  cv.addEventListener("pointerup", stopP); cv.addEventListener("pointercancel", stopP);
  cv.addEventListener("contextmenu", (e) => e.preventDefault());
  function auPlaceNear(k) {
    const [px, py] = au.player;
    for (let r = 1; r < N; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = px + dx, y = py + dy, key = x + "," + y;
      if (x < 0 || y < 0 || x >= N || y >= N || au.items[key] || (dx === 0 && dy === 0)) continue;
      au.items[key] = k; tool = k; syncPal(); update(); return;
    }
  }
  const chip = (id, on, a, b) => { const el = $(id); el.setAttribute("aria-pressed", on); el.textContent = on ? a : b; };
  $("#auNight").onclick = () => { opt.night = !opt.night; chip("#auNight", opt.night, "☾ ночь", "☀ день"); update(); };
  $("#auSneak").onclick = () => { opt.sneak = !opt.sneak; chip("#auSneak", opt.sneak, "присед: да", "присед: нет"); update(); };
  $("#auQuran").onclick = () => { opt.quran = !opt.quran; chip("#auQuran", opt.quran, "Коран в руке: да", "Коран в руке: нет"); update(); };
  $("#auClear").onclick = () => { au.items = {}; update(); };
  $("#auFill").onclick = () => {
    au.items = {}; const [px, py] = au.player;
    for (let i = 0; i < 8; i++) { const x = clamp(px + rnd(13) - 6, 0, N - 1), y = clamp(py + rnd(13) - 6, 0, N - 1); if (x !== px || y !== py) au.items[x + "," + y] = pick(TYPES).key; }
    update();
  };
  let animeT = 0;
  function update() {
    saveAu(); dirty = true;
    const a = active(), n = (k) => a[k] || 0;
    // итоги (проценты одного вида складываем, как в коде: каждый обработчик добавляет свой бонус)
    const dmgFlat = n("red");
    const dmgPct = 5 * n("black") + 5 * n("black_white") + (opt.night ? 10 * n("striped") : 0) + (n("russian") ? 50 : 0) + (opt.sneak && n("litvin") ? 75 : 0);
    const takePct = 6 * n("white") + 6 * n("black_white") + (!opt.night ? 10 * n("striped") : 0) + (n("angel") ? 50 : 0);
    const buddha = n("buddha") && !opt.quran;
    const spd = 7 * n("yellow") + (n("angel") ? 25 : 0);
    const jump = jumpH(0.42 + 0.24 * n("blue"));
    const heal = n("green") * 12, armor = 2 * n("angel");
    const tiles = [
      ["урон", dmgFlat || dmgPct ? `${dmgFlat ? "+" + dmgFlat : ""}${dmgFlat && dmgPct ? " · " : ""}${dmgPct ? "+" + dmgPct + "%" : ""}` : "—", dmgFlat || dmgPct],
      ["входящий урон", buddha ? "0 (Будда)" : takePct ? "−" + Math.min(100, takePct) + "%" : "—", buddha || takePct],
      ["скорость", spd ? "+" + spd + "%" : "—", spd],
      ["прыжок", fmt(jump, 2) + " бл.", n("blue")],
      ["лечение", heal ? heal + " ед./мин" : "—", heal],
      ["броня", armor ? "+" + armor : "—", armor],
    ];
    $("#auSum").innerHTML = tiles.map(([l, v, on]) => `<div class="as ${on ? "on" : ""}"><span>${l}</span><b>${v}</b></div>`).join("");
    const keys = Object.keys(a).sort((x, y) => RI[T[y].rar] - RI[T[x].rar]);
    const placed = new Set(Object.values(au.items)), off = [...placed].filter((k) => !a[k]);
    $("#auList").innerHTML = (keys.length ? keys.map((k) => `<div class="al" style="--rc:${T[k].R.border}">${img(IC(k))}<div><b>${esc(T[k].name)} <em>×${a[k]}</em></b>${AU[k](a[k], opt).map((l) => `<span>${esc(l)}</span>`).join("")}${k === "anime" ? `<span class="anime-t" id="animeT"></span>` : ""}</div></div>`).join("")
      : `<p class="al-empty">В зоне нет ни одной фигурки. Поставь их ближе к игроку: 6 блоков в любую сторону, включая диагональ.</p>`)
      + (off.length ? `<div class="al-off"><span>вне зоны:</span>${off.map((k) => `<i data-tip="${esc(T[k].name)}" data-tip-info="радиус ${T[k].r}">${img(IC(k))}</i>`).join("")}</div>` : "");
    const w = $("#auWrap");
    w.classList.toggle("drunk", !!n("russian")); w.style.setProperty("--di", Math.min(1, 0.35 * n("russian")));
    w.classList.toggle("nv", !!n("neon")); w.classList.toggle("night", opt.night && !n("neon"));
  }
  update();
  // отрисовка карты
  const parts = [];
  function drawAu(now) {
    const a = active(), W = cell * N, [px, py] = au.player;
    g2.clearRect(0, 0, W, W);
    // пол
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { g2.fillStyle = (x + y) % 2 ? "#1c1024" : "#211329"; g2.fillRect(x * cell, y * cell, cell, cell); }
    // зоны
    const zone = (r, fill, stroke, dash) => {
      const x0 = (px - r) * cell, y0 = (py - r) * cell, s = (2 * r + 1) * cell;
      if (fill) { g2.fillStyle = fill; g2.fillRect(x0, y0, s, s); }
      g2.save(); g2.setLineDash(dash || []); g2.strokeStyle = stroke; g2.lineWidth = 2; g2.strokeRect(x0 + 1, y0 + 1, s - 2, s - 2); g2.restore();
    };
    const placed = new Set(Object.values(au.items));
    if (placed.has("buddha")) zone(8, a.buddha && !opt.quran ? "rgba(255,213,74,.07)" : null, "rgba(255,213,74,.7)", [6, 5]);
    zone(6, "rgba(255,122,182,.09)", "rgba(255,122,182,.85)");
    if (placed.has("anonymous")) zone(3, "rgba(0,0,0,.18)", "rgba(200,200,200,.6)", [3, 4]);
    // сетка
    g2.strokeStyle = "rgba(255,255,255,.035)"; g2.lineWidth = 1;
    for (let i = 1; i < N; i++) { g2.beginPath(); g2.moveTo(i * cell, 0); g2.lineTo(i * cell, W); g2.moveTo(0, i * cell); g2.lineTo(W, i * cell); g2.stroke(); }
    // фигурки
    for (const [pos, k] of Object.entries(au.items)) {
      const [x, y] = pos.split(",").map(Number), t = T[k], on = Math.abs(x - px) <= t.r && Math.abs(y - py) <= t.r;
      g2.globalAlpha = on ? 1 : 0.32;
      if (on) { g2.fillStyle = t.R.border + "33"; g2.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2); g2.strokeStyle = t.R.border; g2.lineWidth = 1.5; g2.strokeRect(x * cell + 1.5, y * cell + 1.5, cell - 3, cell - 3); }
      const im = ims[k]; if (im && im.complete) g2.drawImage(im, x * cell - cell * 0.05, y * cell - cell * 0.1, cell * 1.1, cell * 1.1);
      g2.globalAlpha = 1;
      if (on && (k === "rainbow" || k === "booba") && Math.random() < 0.04) parts.push({ x: x + 0.5, y: y + 0.3, vy: -0.02, life: 1, im: "heart" });
      if (on && k === "golden" && Math.random() < 0.03) parts.push({ x: x + Math.random(), y: y + Math.random(), vy: -0.01, life: 1, im: "glint" });
    }
    // игрок
    const anon = a.anonymous, st = ims.steve;
    g2.globalAlpha = anon ? 0.3 : 1; g2.imageSmoothingEnabled = false;
    if (st && st.complete) g2.drawImage(st, px * cell + cell * 0.1, py * cell + cell * 0.1, cell * 0.8, cell * 0.8);
    g2.imageSmoothingEnabled = true; g2.globalAlpha = 1;
    g2.strokeStyle = "#fff"; g2.lineWidth = 2; g2.strokeRect(px * cell + cell * 0.1, py * cell + cell * 0.1, cell * 0.8, cell * 0.8);
    // галактический вихрь по часовой: центр гравитации в самой фигурке, а не в игроке
    if (a.galactic) {
      const tt = now / 1000;
      for (const [pos, k] of Object.entries(au.items)) {
        if (k !== "galactic") continue;
        const [gx, gy] = pos.split(",").map(Number);
        if (Math.abs(gx - px) > T.galactic.r || Math.abs(gy - py) > T.galactic.r) continue;
        const cx = (gx + 0.5) * cell, cy = (gy + 0.5) * cell;
        const gr = g2.createRadialGradient(cx, cy, 0, cx, cy, cell * 3.2);
        gr.addColorStop(0, "rgba(150,90,255,.28)"); gr.addColorStop(1, "rgba(150,90,255,0)");
        g2.fillStyle = gr; g2.beginPath(); g2.arc(cx, cy, cell * 3.2, 0, 7); g2.fill();
        for (let i = 0; i < 22; i++) {
          const ang = tt * (1.8 - (i % 5) * 0.2) + i * (Math.PI * 2 / 22), rr = (1 + (i % 5) * 0.55 + Math.sin(tt * 1.3 + i) * 0.2) * cell;
          const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
          g2.strokeStyle = `hsla(${250 + i * 5},90%,72%,.35)`; g2.lineWidth = cell * 0.06; g2.beginPath(); g2.arc(cx, cy, rr, ang - 0.35, ang); g2.stroke();
          g2.fillStyle = `hsla(${250 + i * 5},90%,75%,.9)`; g2.beginPath(); g2.arc(x, y, cell * 0.08, 0, 7); g2.fill();
        }
      }
    }
    // Будда: купол
    if (a.buddha && !opt.quran) {
      const gr = g2.createRadialGradient((px + 0.5) * cell, (py + 0.5) * cell, cell, (px + 0.5) * cell, (py + 0.5) * cell, cell * 8.5);
      gr.addColorStop(0, "rgba(255,220,120,0)"); gr.addColorStop(0.85, "rgba(255,220,120,.10)"); gr.addColorStop(1, "rgba(255,220,120,0)");
      g2.fillStyle = gr; g2.fillRect(0, 0, W, W);
    }
    // частицы
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.y += p.vy; p.life -= 0.012; if (p.life <= 0) { parts.splice(i, 1); continue; }
      const im = ims[p.im]; if (!im || !im.complete) continue;
      g2.globalAlpha = p.life; g2.imageSmoothingEnabled = false; g2.drawImage(im, p.x * cell - cell * 0.18, p.y * cell - cell * 0.18, cell * 0.36, cell * 0.36); g2.imageSmoothingEnabled = true; g2.globalAlpha = 1;
    }
    // Аниме: таймер реролла
    const at = $("#animeT"); if (at) { const s = 5 - ((now / 1000) % 5); at.textContent = `реролл через ${s.toFixed(1).replace(".", ",")} с`; at.style.setProperty("--p", s / 5); }
  }
  (function loopAu(now) {
    if (auVis) { const a = active(); if (dirty || a.galactic || a.buddha || a.rainbow || a.booba || a.golden || a.anime || parts.length) { drawAu(now); dirty = false; } }
    requestAnimationFrame(loopAu);
  })(performance.now());

  /* ================= ДОСТИЖЕНИЯ: та же ветка, что на остальных страницах ================= */
  $("#advBoard").style.setProperty("--tile", `url("${new URL(U("assets/textures/p6/pink_wool.png"), location.href).href}")`);
  const FRAME_RU = { task: "обычная", goal: "цель", challenge: "испытание" };
  const titleH = (a) => `<span style="color:${MC[a.color]};${a.bold ? "font-weight:700" : ""}">${esc(a.title)}</span>`;
  renderTree = function (pulse) {
    const vis = ADV.filter((a) => got.includes(a.key) || !a.hidden), hidden = ADV.length - vis.length;
    if (!advSel || !vis.some((a) => a.key === advSel)) advSel = vis.length ? (vis.filter((a) => got.includes(a.key)).pop() || vis[0]).key : null;
    const icon = (a, px) => `<span class="ic" style="width:${px}px;height:${px}px">${img(IC(a.icon))}</span>`;
    const node = (a, i) => { const has = got.includes(a.key); return (i ? `<div class="adv-link ${has ? "on" : ""}"></div>` : "") + `
        <button type="button" class="adv-node ${has ? "" : "todo"} ${pulse === a.key ? "pulse" : ""} ${advSel === a.key ? "sel" : ""}" data-k="${a.key}" aria-label="${esc(a.title)}">
          <span class="adv-frame ${a.frame} ${has ? "" : "locked"}"></span>${icon(a, 32)}</button>`; };
    // скрытые ачивки стоят между полученными и «Полной коллекцией» (она видна сразу, как в json: hidden:false)
    const openList = vis.filter((a) => got.includes(a.key)), col6 = vis.filter((a) => !got.includes(a.key));
    let html = openList.map(node).join("");
    if (hidden) html += `${openList.length ? '<div class="adv-link"></div>' : ""}<div class="adv-more">+${hidden} скрыто</div>`;
    html += col6.map((a, i) => node(a, openList.length || hidden ? 1 : i)).join("");
    $("#advChain").innerHTML = html;
    const a = ADV.find((x) => x.key === advSel), has = a && got.includes(a.key);
    const prog = a && a.key === "collector" ? ` <b class="adv-pp">${colN()} / 26</b>` : "";
    $("#advDetail").innerHTML = a
      ? `<div class="big"><span class="adv-frame ${a.frame} ${has ? "" : "locked"}"></span>${icon(a, 38)}</div>
         <div class="txt"><div class="tt">${titleH(a)}${prog}</div><div class="dd">${esc(a.desc)}</div><div class="cc">${esc(a.how)}</div></div>
         <div class="meta"><span>${has ? FRAME_RU[a.frame] : "не получено"}</span><b>+${a.xp} XP</b></div>`
      : "";
    // все 7 карточек по порядку json; не полученные скрытые показываются как «???» (без названия, как в игре)
    $("#advList").innerHTML = ADV.map((a) => {
      const h = got.includes(a.key);
      if (a.hidden && !h) return `<div class="adv-row locked mystery"><span class="fr"><span class="adv-frame task locked"></span><span class="q">?</span></span><span><span class="t">???</span><span class="d">скрытое достижение: откроется, когда получишь</span></span><span class="x">? XP</span></div>`;
      return `<button type="button" class="adv-row ${h ? "has" : ""} ${a.key === "collector" ? "wide" : ""}" data-k="${a.key}"><span class="fr"><span class="adv-frame ${a.frame} ${h ? "" : "locked"}"></span>${icon(a, 26)}</span><span><span class="t">${titleH(a)}</span><span class="d">${esc(a.desc)}${a.key === "collector" ? ` · ${colN()}/26` : ""}</span></span><span class="x">+${a.xp} XP</span></button>`;
    }).join("");
    const done = ADV.filter((x) => got.includes(x.key));
    $("#advBar").style.width = (done.length / ADV.length) * 100 + "%";
    $("#advTxt").textContent = `${done.length} / ${ADV.length} · ${done.reduce((s, x) => s + x.xp, 0)} / ${ADV.reduce((s, x) => s + x.xp, 0)} XP`;
  };
  renderTree(); listeners.push(() => renderTree());
  $("#advQ").textContent = ADV.reduce((s, x) => s + x.xp, 0) + " XP";
  const pickAdv = (e) => { const n = e.target.closest("[data-k]"); if (!n) return; advSel = n.dataset.k; renderTree(); };
  $("#advChain").addEventListener("click", pickAdv);
  $("#advList").addEventListener("click", pickAdv);
  $("#advReset").addEventListener("click", () => {
    got = []; S.set("p06.adv", got); col = {}; seen = []; boxes = 0; stats = { n: 0, r: {} }; last = []; save();
    advSel = null; grid = Array(9).fill(null); renderTree(); renderCol(); renderBox(); renderMine(); renderFu(); renderFin();
  });

  /* ================= ЛЕНТЫ-СКОТЧ ================= */
  (function tapes() {
    const ics = (arr) => arr.map((k) => img(IC(k), "", "")).join("");
    const pinkWords = ["ЛАБУБУ", "26 фигурок", "1,01%", "9 → 1", "рулетка", "аура 13³", "секретка", "LABUBU"];
    const yWords = ["blind box", "collect them all", "не открывай на стриме", "третий красный подряд", "аниме за 99 боксов", "фьюжн", "легендарка"];
    const mk = (seed, kind) => {
      const order = TYPES.map((t) => t.key).sort((a, b) => ((a.charCodeAt(0) * 31 + seed) % 7) - ((b.charCodeAt(0) * 31 + seed) % 7));
      let h = "";
      for (let i = 0; i < 8; i++) {
        h += kind === "a" ? `<span>${pinkWords[(i + seed) % pinkWords.length]}</span>${ics(order.slice(i * 3 % 24, i * 3 % 24 + 2))}<i>✦</i>`
                          : `<span>${yWords[(i + seed) % yWords.length]}</span>${ics(order.slice((i * 5 + 3) % 24, (i * 5 + 3) % 24 + 1))}<i>●</i>`;
      }
      return h + h;   // дважды: анимация на -50% бесшовная
    };
    const map = { a: [1, "a"], b: [2, "b"], c: [4, "a"], d: [5, "b"], e: [3, "a"] };
    $$("[data-tape]").forEach((el) => { const [s, k] = map[el.dataset.tape]; el.innerHTML = mk(s, k); });
  })();

  /* ================= КРАН-МАШИНА ================= */
  (function claw() {
    const glass = $("#clGlass"), cv = $("#clCv"), g = cv.getContext("2d"), msg = $("#clMsg"), goB = $("#clGo"), knob = $("#clKnob");
    const W = 480, H = 520, FLOOR = H - 14, WALL_X = 104, WALL_TOP = 318, CHUTE_X = 54, TOP_Y = 64, RAIL_Y = 26;
    let cs = S.get("p06.claw", { n: 0, win: 0, gold: 0, boxes: 0 });
    const saveC = () => S.set("p06.claw", cs);
    // спрайты: обычный бокс + золотой (тот же бокс, залитый золотом поверх)
    const boxI = new Image(); boxI.src = IC("box");
    let goldC = null;
    boxI.onload = () => {
      goldC = document.createElement("canvas"); goldC.width = goldC.height = 128;
      const c = goldC.getContext("2d"); c.drawImage(boxI, 0, 0, 128, 128);
      c.globalCompositeOperation = "source-atop";
      const gr = c.createLinearGradient(0, 0, 128, 128); gr.addColorStop(0, "rgba(255,240,150,.75)"); gr.addColorStop(.5, "rgba(255,190,40,.7)"); gr.addColorStop(1, "rgba(190,110,0,.75)");
      c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
      c.globalCompositeOperation = "source-over"; dirty = true;
    };
    const decoK = ["anime", "rainbow", "golden", "buddha", "angel", "demon", "galactic", "booba"];
    const deco = decoK.map((k) => { const i = new Image(); i.src = IC(k); return i; });

    let bodies = [], dirty = true;
    const newBody = (x, y) => ({ x, y, vx: (Math.random() - .5) * 40, vy: 0, r: 27 + Math.random() * 7, a: (Math.random() - .5) * 0.8, gold: Math.random() < 1 / 12, held: false });
    function fill(n) { for (let i = 0; i < n; i++) bodies.push(newBody(WALL_X + 40 + Math.random() * (W - WALL_X - 80), -40 - i * 46)); }
    fill(15);
    // предварительно «уронить» кучу, чтобы при первом показе она уже лежала
    for (let i = 0; i < 600; i++) physics(1 / 60);

    const C = { x: CHUTE_X, y: TOP_Y, open: 1, st: "idle", t: 0, carry: null, hold: 1, slipAt: [], tx: null };
    let keyDir = 0, btnDir = 0;

    function physics(dt) {
      const G = 1500;
      for (const b of bodies) {
        if (b.held) continue;
        b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt;
        b.vx *= 0.995; b.vy *= 0.998;
        // пол
        if (b.y + b.r > FLOOR) { b.y = FLOOR - b.r; if (b.vy > 0) b.vy *= -0.15; b.vx *= 0.9; b.a += b.vx * dt / b.r; }
        // стенки автомата
        if (b.x - b.r < 8) { b.x = 8 + b.r; b.vx = Math.abs(b.vx) * .3; }
        if (b.x + b.r > W - 8) { b.x = W - 8 - b.r; b.vx = -Math.abs(b.vx) * .3; }
        // перегородка лотка: вертикальный отрезок x=WALL_X от WALL_TOP до пола + точка на верхушке
        if (b.y > WALL_TOP && Math.abs(b.x - WALL_X) < b.r) {
          if (b.x < WALL_X) { b.x = WALL_X - b.r; b.vx = -Math.abs(b.vx) * .3; } else { b.x = WALL_X + b.r; b.vx = Math.abs(b.vx) * .3; }
        } else {
          const dx = b.x - WALL_X, dy = b.y - WALL_TOP, d = Math.hypot(dx, dy);
          if (d < b.r && d > 0) { const k = (b.r - d) / d; b.x += dx * k; b.y += dy * k; b.vx += (dx / d) * 40; }
        }
      }
      // столкновения кругов
      for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i], b = bodies[j]; if (a.held || b.held) continue;
        const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, p = (rr - d) / 2;
        a.x -= nx * p; a.y -= ny * p; b.x += nx * p; b.y += ny * p;
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) { const imp = -rv * 0.55; a.vx -= nx * imp; a.vy -= ny * imp; b.vx += nx * imp; b.vy += ny * imp; a.a -= imp * 0.002; b.a += imp * 0.002; }
      }
    }

    const say = (t, cls = "") => { msg.textContent = t; msg.className = "cl-msg on " + cls; clearTimeout(say.t); say.t = setTimeout(() => msg.classList.remove("on"), 1300); };
    function log(html, cls) { const el = $("#clLog"); el.insertAdjacentHTML("afterbegin", `<span class="${cls}">${html}</span>`); while (el.children.length > 8) el.lastChild.remove(); }
    function renderStats() {
      $("#clStats").innerHTML = `<div><b>${cs.n}</b><span>попыток</span></div><div><b>${cs.win}</b><span>выловлено</span></div><div><b>${cs.n ? Math.round(cs.win / cs.n * 100) : 0}%</b><span>удачных</span></div>`;
      $("#clQ").textContent = `выловлено ${cs.win}`;
    }
    renderStats();
    // сколько боксов лежит в инвентаре кейса (слот обновляет renderBox)
    const inv = $("#clInv");
    function renderInv(bump) {
      const n = +($("#boxSlot b") || {}).textContent || 0;
      inv.innerHTML = `${img(IC("box"), "", "Лабубу-бокс")}<div><b>${n}</b><span>${plural(n, "бокс", "бокса", "боксов")} в инвентаре кейса</span></div><a class="lb-btn hot sm" href="#case" id="clOpen">Открыть ↑</a>`;
      if (bump) { inv.classList.remove("bump"); void inv.offsetWidth; inv.classList.add("bump"); }
    }
    renderInv();
    new MutationObserver(() => renderInv(true)).observe($("#boxSlot"), { childList: true, subtree: true, characterData: true });
    inv.addEventListener("click", (e) => { if (e.target.closest("#clOpen") && (+($("#boxSlot b") || {}).textContent || 0) > 0) { e.preventDefault(); $("#case").scrollIntoView({ behavior: "smooth" }); setTimeout(() => $("#boxOpen").click(), 700); } });

    function drop() {
      if (C.st !== "idle") return;
      C.st = "down"; C.tx = null; cs.n++; saveC(); renderStats(); goB.disabled = true; play("click", 0.7, 0.8);
    }
    function slip() {
      const b = C.carry; if (!b) return;
      b.held = false; b.vx = (Math.random() - .5) * 120; b.vy = 40; C.carry = null;
      say("сорвался!", "miss"); log(`${img(IC("box"))} сорвался`, "miss"); play("pop", 0.5, 0.7);
    }
    function win(b) {
      bodies.splice(bodies.indexOf(b), 1);
      const n = b.gold ? 3 : 1;
      cs.win++; cs.boxes += n; if (b.gold) cs.gold++; saveC(); renderStats();
      addBox(n);
      $(".cl-slot").classList.remove("hit"); void $(".cl-slot").offsetWidth; $(".cl-slot").classList.add("hit");
      if (b.gold) { say("ЗОЛОТОЙ! +3", "gold"); play("levelup", 0.6); log(`${img(IC("box"))} золотой · +3 бокса`, "gold"); }
      else { say("+1 бокс"); play("orb", 0.7); log(`${img(IC("box"))} +1 бокс`, ""); }
      if (bodies.length < 9) fill(6);
    }

    function step(dt) {
      // управление
      const dir = btnDir || keyDir;
      if (C.st === "idle") {
        if (dir) { C.x += dir * 190 * dt; C.tx = null; }
        else if (C.tx != null) { const d = C.tx - C.x; C.x += Math.sign(d) * Math.min(Math.abs(d), 260 * dt); }
        C.x = clamp(C.x, CHUTE_X, W - 34);
        knob.className = "cl-knob" + (dir < 0 ? " l" : dir > 0 ? " r" : "");
      } else knob.className = "cl-knob";
      const tipY = C.y + 26;
      if (C.st === "down") {
        let stop = FLOOR - 24;
        for (const b of bodies) if (Math.abs(b.x - C.x) < b.r * 0.8 + 6) stop = Math.min(stop, b.y - b.r * 0.35 - 26);
        C.y += 230 * dt;
        if (C.y >= stop) { C.y = Math.max(TOP_Y, stop); C.st = "close"; C.t = 0; }
      } else if (C.st === "close") {
        C.t += dt; C.open = Math.max(0, 1 - C.t / 0.35);
        if (C.t >= 0.4) {
          let best = null, bd = 1e9;
          for (const b of bodies) { const d = Math.hypot(b.x - C.x, b.y - (tipY + 6)); if (d < b.r + 16 && d < bd) { bd = d; best = b; } }
          if (best) {
            const q = clamp(1 - Math.abs(best.x - C.x) / (best.r + 10), 0, 1);
            C.hold = (0.2 + 0.7 * Math.pow(q, 0.7)) * (best.gold ? 0.85 : 1);
            best.held = true; C.carry = best; play("pop", 0.55, 1.2);
            C.slipAt = [TOP_Y + (C.y - TOP_Y) * 0.45, CHUTE_X + (C.x - CHUTE_X) * Math.random()];
          } else { say("мимо", "miss"); log("мимо", "miss"); }
          C.st = "up";
        }
      } else if (C.st === "up") {
        const y0 = C.y; C.y -= 170 * dt;
        if (C.carry && y0 > C.slipAt[0] && C.y <= C.slipAt[0] && Math.random() > Math.sqrt(C.hold)) slip();
        if (C.y <= TOP_Y) { C.y = TOP_Y; C.st = "travel"; }
      } else if (C.st === "travel") {
        const x0 = C.x; C.x = Math.max(CHUTE_X, C.x - 170 * dt);
        if (C.carry && x0 > C.slipAt[1] && C.x <= C.slipAt[1] && Math.random() > Math.sqrt(C.hold)) slip();
        if (C.x <= CHUTE_X) { C.st = "release"; C.t = 0; }
      } else if (C.st === "release") {
        C.t += dt; C.open = Math.min(1, C.t / 0.3);
        if (C.carry && C.t > 0.12) { C.carry.held = false; C.carry.vy = 60; C.carry.vx = 0; C.carry = null; }
        if (C.t > 0.6) { C.st = "idle"; goB.disabled = false; }
      } else if (C.st === "idle" && C.open < 1) C.open = Math.min(1, C.open + dt * 3);
      if (C.carry) { const b = C.carry; b.x = C.x; b.y = C.y + 26 + b.r * 0.55; b.vx = b.vy = 0; b.a *= 0.9; }
      physics(dt);
      for (const b of [...bodies]) if (!b.held && b.x < WALL_X && b.y > FLOOR - b.r - 6 && Math.abs(b.vy) < 80) win(b);
    }

    function draw(now) {
      const dpr = Math.min(2, window.devicePixelRatio || 1), cw = glass.clientWidth, ch = glass.clientHeight;
      if (cv.width !== Math.round(cw * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
      g.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
      g.clearRect(0, 0, W, H);
      // задник: полки с фигурками-приманками
      g.globalAlpha = 0.28;
      deco.forEach((im, i) => { if (im.complete && im.naturalWidth) g.drawImage(im, WALL_X + 18 + i * ((W - WALL_X - 40) / deco.length), 96 + (i % 2) * 8, 44, 44); });
      g.globalAlpha = 1;
      g.fillStyle = "rgba(255,122,182,.10)"; g.fillRect(WALL_X + 10, 142, W - WALL_X - 20, 4);
      // рельс и каретка
      const mg = g.createLinearGradient(0, RAIL_Y - 6, 0, RAIL_Y + 6); mg.addColorStop(0, "#eee"); mg.addColorStop(.5, "#888"); mg.addColorStop(1, "#444");
      g.fillStyle = mg; g.fillRect(10, RAIL_Y - 5, W - 20, 10);
      g.fillStyle = "#2a0a1d"; g.fillRect(C.x - 20, RAIL_Y - 9, 40, 18);
      g.fillStyle = "#ff4f9a"; g.fillRect(C.x - 16, RAIL_Y - 5, 32, 10);
      // трос
      g.strokeStyle = "#cfcfcf"; g.lineWidth = 2; g.beginPath(); g.moveTo(C.x, RAIL_Y + 8); g.lineTo(C.x, C.y); g.stroke();
      // боксы
      for (const b of bodies) {
        const im = b.gold && goldC ? goldC : boxI; if (!im.width && !im.naturalWidth) continue;
        g.save(); g.translate(b.x, b.y); g.rotate(b.a);
        if (b.gold) { g.shadowColor = "rgba(255,213,74,.9)"; g.shadowBlur = 16 + Math.sin(now / 200) * 6; }
        g.drawImage(im, -b.r * 1.18, -b.r * 1.18, b.r * 2.36, b.r * 2.36); g.restore();
      }
      // клешня
      g.save(); g.translate(C.x, C.y);
      g.fillStyle = "#bbb"; g.fillRect(-14, -4, 28, 14); g.fillStyle = "#ff4f9a"; g.fillRect(-14, -4, 28, 4);
      const ang = 0.12 + C.open * 0.55;
      g.strokeStyle = "#e6e6e6"; g.lineWidth = 5; g.lineCap = "round";
      for (const s of [-1, 1]) {
        g.save(); g.translate(s * 10, 10); g.rotate(-s * ang);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(s * 10, 18); g.lineTo(s * 2, 36); g.stroke(); g.restore();
      }
      g.fillStyle = "#444"; g.beginPath(); g.arc(0, 10, 4, 0, 7); g.fill();
      g.restore();
      // перегородка лотка
      g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(WALL_X - 3, WALL_TOP, 6, FLOOR - WALL_TOP + 14);
      g.fillStyle = "#ff4f9a"; g.fillRect(WALL_X - 3, WALL_TOP, 6, 5);
      g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(8, FLOOR - 50, WALL_X - 11, 64);
      g.fillStyle = "#ffd54a"; g.font = "800 13px Rubik, sans-serif"; g.textAlign = "center";
      g.fillText("ПРИЗ", CHUTE_X, FLOOR - 26); g.fillText("↓", CHUTE_X, FLOOR - 10);
      // пол
      g.fillStyle = "#12050c"; g.fillRect(WALL_X, FLOOR, W - WALL_X, 14);
      // прицел под клешнёй (в режиме ожидания)
      if (C.st === "idle") { g.strokeStyle = "rgba(255,213,74,.35)"; g.setLineDash([4, 6]); g.beginPath(); g.moveTo(C.x, C.y + 40); g.lineTo(C.x, FLOOR); g.stroke(); g.setLineDash([]); }
    }

    let vis = false, lastT = 0, acc = 0;
    new IntersectionObserver((es) => { vis = es[0].isIntersecting; if (vis) { lastT = 0; requestAnimationFrame(loop); } }).observe(glass);
    function loop(now) {
      if (!vis) return;
      const dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 1 / 60; lastT = now; acc += dt;
      while (acc >= 1 / 120) { step(1 / 120); acc -= 1 / 120; }
      draw(now);
      requestAnimationFrame(loop);
    }

    // ввод: кнопки (удержание), клавиатура (когда автомат на экране), палец/мышь по стеклу
    const hold = (el, d) => {
      const on = (e) => { e.preventDefault(); btnDir = d; el.classList.add("on"); el.setPointerCapture && el.setPointerCapture(e.pointerId); };
      const off = () => { if (btnDir === d) btnDir = 0; el.classList.remove("on"); };
      el.addEventListener("pointerdown", on); el.addEventListener("pointerup", off); el.addEventListener("pointercancel", off); el.addEventListener("lostpointercapture", off);
    };
    hold($("#clL"), -1); hold($("#clR"), 1);
    goB.addEventListener("click", drop);
    const toX = (e) => { const r = glass.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; };
    let gDown = false;
    glass.addEventListener("pointerdown", (e) => { gDown = true; C.tx = toX(e); glass.setPointerCapture(e.pointerId); });
    glass.addEventListener("pointermove", (e) => { if (gDown) C.tx = toX(e); });
    glass.addEventListener("pointerup", () => { gDown = false; });
    glass.addEventListener("dblclick", drop);
    const typing = () => /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "");
    addEventListener("keydown", (e) => {
      if (!vis || typing() || !rl.hidden || !vw.hidden) return;
      if (e.code === "ArrowLeft" || e.code === "KeyA") { keyDir = -1; e.preventDefault(); }
      else if (e.code === "ArrowRight" || e.code === "KeyD") { keyDir = 1; e.preventDefault(); }
      else if (e.code === "Space" || e.code === "ArrowDown" || e.code === "KeyS") { e.preventDefault(); drop(); }
    });
    addEventListener("keyup", (e) => { if ((e.code === "ArrowLeft" || e.code === "KeyA") && keyDir < 0) keyDir = 0; if ((e.code === "ArrowRight" || e.code === "KeyD") && keyDir > 0) keyDir = 0; });
    addEventListener("blur", () => { keyDir = 0; btnDir = 0; });

    // лампочки по периметру
    const bl = [], N = 13;
    for (let i = 0; i <= N; i++) { bl.push([i / N * 100, 0]); bl.push([i / N * 100, 100]); }
    for (let i = 1; i < 17; i++) { bl.push([0, i / 17 * 100]); bl.push([100, i / 17 * 100]); }
    $("#clBulbs").innerHTML = bl.map(([x, y], i) => `<i style="left:${x}%;top:${y}%;animation-delay:${(i % 2) * 0.6}s"></i>`).join("");
    ZM.p06claw = { C, bodies: () => bodies, drop, cs: () => cs };
  })();

  /* ================= ХРОНОЛОГИЯ ================= */
  const HI = [
    { ic: IC("box"), r: 0 }, { ic: IC("galactic"), r: 4 }, { ic: IC("buddha"), r: 2 }, { ic: IC("anime"), ic2: IC("russian"), r: 2 }, { ic: U("assets/textures/p6/iso/crafting_table.png"), r: 3 },
  ];
  $("#timeline").innerHTML = P.history.map((h, i) => {
    const r = RAR[HI[i].r];
    return `<div class="hf" style="--rc:${r.border};--bg:${r.bg}">
      <div class="hf-ic">${img(HI[i].ic)}${HI[i].ic2 ? img(HI[i].ic2, "two") : ""}</div>
      <div class="hf-b"><div class="hf-top"><span class="hf-v">${esc(h.ver)}</span><span class="hf-d">${esc(h.date)}</span><span class="hf-t">${esc(h.tag)}</span></div>
      <b>${esc(h.title)}</b><p>${esc(h.text)}</p></div></div>`;
  }).join("");

  /* ================= ФИНАЛ ================= */
  function renderFin() { $("#finRow").innerHTML = TYPES.map((t) => `<span class="${seen.includes(t.key) ? "on" : ""}" style="--rc:${t.R.border}" data-tip="${esc(t.name)}">${img(IC(t.key))}</span>`).join(""); }
  renderFin(); listeners.push(renderFin);
  const nav = ZM.pointNav(6);
  $("#finNav").innerHTML = [nav.prev && `<a href="${U(nav.prev.href)}">← №${String(nav.prev.n).padStart(2, "0")} ${esc(nav.prev.title)}</a>`,
    `<a href="${U("index.html")}">Все пункты</a>`,
    nav.next && `<a href="${U(nav.next.href)}">№${String(nav.next.n).padStart(2, "0")} ${esc(nav.next.title)} →</a>`].filter(Boolean).join("");

  ZM.reveal();
})();
