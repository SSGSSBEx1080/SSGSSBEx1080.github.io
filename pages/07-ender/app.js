/* =====================================================================
   №07 · Эндер-система — «хранилище в Энде»
   Всё поведение взято из кода мода: Ender*Block, EnderFurnaceBlockEntity,
   EnderSafeMenu, ModBlocks. Данные: data/p07_ender.js
   ===================================================================== */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = ZM.esc, U = ZM.url, S = ZM.store, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (n) => Math.floor(Math.random() * n), pick = (a) => a[rnd(a.length)];
  const P = ZM.P07, M = ZM.P07M;
  const T = (n) => U(`assets/textures/p7/${n}.png`);
  const fmt = (v, d = 2) => (Math.round(v * 10 ** d) / 10 ** d).toString().replace(".", ",");
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** иконка по спецификации: "iso:x" изометрия, "v:x" ванильная текстура, "item:x" предмет мода, "x" изометрия мода */
  const src = (s) => s.startsWith("iso:") ? T("iso/" + s.slice(4)) : s.startsWith("v:") ? T("v/" + s.slice(2)) : s.startsWith("item:") ? T("mod/" + s.slice(5)) : s.includes(":") ? T("v/" + s) : T("iso/" + s);
  const isPx = (s) => /^(v:|item:)/.test(s) || (!s.includes(":") && false);
  const img = (s, cls = "", alt = "") => `<img class="${isPx(s) ? "px " : ""}${cls}" src="${src(s)}" alt="${esc(alt)}" draggable="false">`;
  const B = Object.fromEntries(P.blocks.map((b) => [b.key, b]));

  ZM.topbar({ crumb: "№07 · Эндер-система", ...ZM.pointNav(7) });

  /* ================= звук ================= */
  const EXT = new Audio().canPlayType("audio/ogg; codecs=vorbis") ? "ogg" : "mp3";
  const MASTER_VOLUME = 0.4;
  const LIB = {
    door_open: ["door_open1", "door_open2", "door_open3"], door_close: ["door_close1", "door_close2", "door_close3"],
    trap_open: ["trap_open1", "trap_open2", "trap_open3"], trap_close: ["trap_close1", "trap_close2"],
    thunder: ["thunder1", "thunder2", "thunder3"], impact: ["impact1", "impact2", "explode3", "explode4"], explode: ["impact1", "impact2", "explode3", "explode4"],
    hurt: ["hurt1", "hurt2", "hurt3"], fire_hurt: ["fire_hurt1", "fire_hurt2"], glass: ["glass1", "glass2", "glass3"],
    dig: ["dig1", "dig2", "dig3", "dig4"], hit: ["hit1", "hit2", "hit3", "hit4"], crackle: ["crackle1", "crackle2", "crackle3"],
    click: ["click"], wood_click: ["wood_click"], portal: ["portal"], tp: ["tp1", "tp2"], echest_open: ["echest_open"], echest_close: ["echest_close"],
    eye: ["eye_launch"], fizz: ["fizz"], ignite: ["ignite"], stare: ["stare"], idle: ["idle1"], bow: ["bow"],
  };
  let sndOn = S.get("p07.snd", true);
  const pool = {};
  function play(name, vol = 1, rate = 1) {
    if (!sndOn) return null;
    if (!LIB[name] && !name.includes("_") && !/\d$/.test(name)) { ZM.sfx(name, vol, rate); return null; }   // общие звуки из core
    const f = LIB[name] ? pick(LIB[name]) : name;
    const url = U(`assets/sounds/p07/${f}.${EXT}`);
    try {
      const a = (pool[url] || (pool[url] = new Audio(url))).cloneNode();
      a.volume = clamp(vol * MASTER_VOLUME, 0, 1); a.playbackRate = rate; a.preservesPitch = false;
      a.play().catch(() => {});
      return a;
    } catch (e) { return null; }
  }
  const bSnd = $("#sndBtn");
  const syncSnd = () => { bSnd.setAttribute("aria-pressed", sndOn); bSnd.classList.toggle("on", sndOn); };
  bSnd.onclick = () => { sndOn = !sndOn; S.set("p07.snd", sndOn); syncSnd(); if (sndOn) play("click", 0.6); };
  ZM.sfx.bind(() => sndOn);
  syncSnd();

  /* ================= Minecraft: actionbar и чат ================= */
  const MC = { c: ["#ff5555", "#3f1515"], f: ["#ffffff", "#3f3f3f"], a: ["#55ff55", "#153f15"], 7: ["#aaaaaa", "#2a2a2a"], b: ["#55ffff", "#153f3f"], 4: ["#aa0000", "#2a0000"], e: ["#ffff55", "#3f3f15"], d: ["#ff55ff", "#3f153f"] };
  function bar(el, text, c = "c", ms = 2600) {
    el.style.setProperty("--c", MC[c][0]); el.style.setProperty("--sh", MC[c][1]);
    el.textContent = text; el.classList.add("show");
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), ms);
  }
  function chat(el, html) {
    const p = document.createElement("p"); p.innerHTML = html; el.appendChild(p);
    while (el.children.length > 6) el.firstChild.remove();
    setTimeout(() => p.classList.add("old"), 9000); setTimeout(() => p.remove(), 10200);
  }
  const col = (c, t) => `<span style="color:${MC[c][0]}">${esc(t)}</span>`;

  /* ================= кто ты: хозяин или чужак ================= */
  const WHO = {
    owner: { name: "Хозяин", sub: "поставил блоки", face: T("v/steve_face") },
    intruder: { name: "Чужак", sub: "зашёл в гости", face: T("v/alex_face") },
  };
  let who = S.get("p07.who", "owner"); if (!WHO[who]) who = "owner";
  const whoL = [];
  const isOwner = () => who === "owner";
  function renderWho() {
    const btn = (k, full) => `<button type="button" class="${k === "intruder" ? "bad" : ""}" data-who="${k}" aria-pressed="${who === k}" title="${WHO[k].name}">
      <img src="${WHO[k].face}" alt="">${full ? `<span>${WHO[k].name}<small>${WHO[k].sub}</small></span>` : ""}</button>`;
    for (const id of ["heroWho", "lkWho"]) $("#" + id).innerHTML = btn("owner", 1) + btn("intruder", 1);
    $("#whoFab").innerHTML = btn("owner", 0) + btn("intruder", 0);
  }
  function setWho(k) {
    if (k === who) return;
    who = k; S.set("p07.who", who); renderWho(); play("tp", 0.5, 0.9 + Math.random() * 0.2);
    whoL.forEach((f) => f());
  }
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-who]"); if (b) setWho(b.dataset.who); });
  renderWho();
  // маленький переключатель появляется, когда большой в hero уехал
  new IntersectionObserver(([e]) => $("#whoFab").classList.toggle("on", !e.isIntersecting)).observe($("#heroWho"));

  /* ================= ачивки ================= */
  const ADV = P.advancements;
  let got = S.get("p07.adv", []).filter((k) => ADV.some((a) => a.key === k));
  let advSel = null, renderTree = () => {};
  let chatSink = null;   // куда писать «получил достижение»: чат сцены, если она на экране
  const FRAME_CHAT = { task: "получил достижение", goal: "достиг цели", challenge: "выполнил испытание" };
  function announce(a) {
    if (!chatSink) return;
    const who = a.trigger === "fucked" ? "Чужак" : "Хозяин";
    chat(chatSink, `${who} ${FRAME_CHAT[a.frame]} <span style="color:${a.frame === "challenge" ? "#aa00aa" : "#55ff55"}">[${esc(a.title)}]</span>`);
  }
  function trigger(tr) {
    ADV.filter((a) => a.trigger === tr && !got.includes(a.key)).forEach((a) => {
      got.push(a.key); S.set("p07.adv", got);
      ZM.toast({ iconHtml: `<img src="${src(a.icon)}" alt="" style="width:100%;height:100%;object-fit:contain">`, title: `<span style="color:${MC[a.color][0]};${a.bold ? "font-weight:700;letter-spacing:.02em" : ""}">${esc(a.title)}</span>`, frame: a.frame });
      if (a.chat) announce(a);
      advSel = a.key; renderTree(a.key);
    });
  }

  /* ================= фон: портал в Энд ================= */
  // как шейдер end_portal: текстура end_portal.png слоями, каждый слой своим цветом, масштабом, углом и скоростью
  const PORTAL_COLORS = [[.022, .098, .111], [.012, .096, .089], [.028, .102, .1], [.047, .11, .115], [.065, .118, .097], [.064, .087, .124], [.085, .112, .166], [.097, .154, .091],
    [.106, .131, .195], [.098, .11, .187], [.134, .138, .149], [.07, .243, .236], [.197, .143, .215], [.047, .315, .322], [.205, .39, .302], [.081, .315, .661]];
  const portalImg = new Image(); portalImg.src = T("v/end_portal");
  function portal(cv, { layers = 9, gain = 3.2, down = 3, parts = 0, violet = true, speed = 9 } = {}) {
    const ctx = cv.getContext("2d");
    let W = 0, H = 0, pats = null, ps = [];
    function size() {
      const r = cv.getBoundingClientRect(); const w = Math.max(1, Math.round(r.width / down)), h = Math.max(1, Math.round(r.height / down));
      if (w !== W || h !== H) { W = cv.width = w; H = cv.height = h; }
    }
    function makePats() {
      pats = [];
      for (let i = 0; i < layers; i++) {
        const c = document.createElement("canvas"); c.width = c.height = portalImg.width; const x = c.getContext("2d");
        x.drawImage(portalImg, 0, 0);
        let [r, g, b] = PORTAL_COLORS[(i * 2 + 3) % 16];
        if (violet && i % 3 === 1) [r, g, b] = [0.28, 0.08, 0.42];   // немного фиолетового: наш портал в тон сайта
        x.globalCompositeOperation = "multiply"; x.fillStyle = `rgb(${Math.min(255, r * gain * 255)},${Math.min(255, g * gain * 255)},${Math.min(255, b * gain * 255)})`; x.fillRect(0, 0, c.width, c.height);
        pats.push(ctx.createPattern(c, "repeat"));
      }
    }
    let last = 0;
    function frame(now) {
      if (!cv.isConnected) return;
      requestAnimationFrame(frame);
      if (now - last < 50 || document.hidden) return; last = now;   // 20 кадров в секунду, как тики
      if (!portalImg.complete || !portalImg.width) return;
      if (!pats) makePats();
      size();
      const t = now / 1000;
      ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "#020104"; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < layers; i++) {
        const k = i + 1, s = (4.2 - k * 0.22) / down, a = ((k * k * 4321 + k * 9) * 2) * Math.PI / 180;
        const m = new DOMMatrix().rotateSelf(a * 180 / Math.PI).scaleSelf(s, s).translateSelf(17 / k * 40, (2 + k / 1.5) * t * speed);
        pats[i].setTransform(m); ctx.fillStyle = pats[i]; ctx.fillRect(0, 0, W, H);
      }
      if (parts) {
        ctx.globalCompositeOperation = "source-over";
        while (ps.length < parts) ps.push({ x: Math.random() * W, y: H + Math.random() * H * 0.5, v: 0.2 + Math.random() * 0.6, w: Math.random() * 6.28, s: Math.random() < 0.3 ? 2 : 1 });
        for (const p of ps) {
          p.y -= p.v; p.x += Math.sin(t * 2 + p.w) * 0.25;
          if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
          const a = clamp(p.y / H, 0, 1);
          ctx.fillStyle = `rgba(${200 + rnd(40)},${80 + rnd(40)},255,${0.25 + a * 0.6})`; ctx.fillRect(p.x | 0, p.y | 0, p.s, p.s);
        }
      }
    }
    requestAnimationFrame(frame);
  }
  portal($("#bgCv"), { layers: 5, gain: 2.2, down: 3, parts: 40, speed: 3 });
  portal($("#voidCv"), { layers: 10, gain: 4.4, down: 2, parts: 14 });

  /* ================= молния (LightningBolt у ног чужака) ================= */
  const bolt = $("#boltCv"), bctx = bolt.getContext("2d");
  function strike(x, y) {
    const dpr = Math.min(2, devicePixelRatio || 1);
    bolt.width = innerWidth * dpr; bolt.height = innerHeight * dpr; bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const path = (x0, y0, x1, y1, jit) => { const pts = [[x0, y0]]; const n = 14; for (let i = 1; i < n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t + (Math.random() - 0.5) * jit, y0 + (y1 - y0) * t]); } pts.push([x1, y1]); return pts; };
    const main = path(x + (Math.random() - 0.5) * 120, -20, x, y, 70);
    const branches = [0, 1, 2].map(() => { const i = 3 + rnd(8), p = main[i]; return path(p[0], p[1], p[0] + (Math.random() - 0.5) * 160, p[1] + 60 + Math.random() * 90, 30); });
    let n = 0;
    const draw = (on) => {
      bctx.clearRect(0, 0, innerWidth, innerHeight);
      if (!on) return;
      bctx.fillStyle = "rgba(210,220,255,.18)"; bctx.fillRect(0, 0, innerWidth, innerHeight);
      for (const [w, c] of [[14, "rgba(150,120,255,.25)"], [6, "rgba(200,200,255,.6)"], [2.5, "#fff"]]) {
        bctx.strokeStyle = c; bctx.lineWidth = w; bctx.lineJoin = "round";
        for (const pts of [main, ...branches]) { bctx.beginPath(); pts.forEach(([a, b], i) => (i ? bctx.lineTo(a, b) : bctx.moveTo(a, b))); bctx.stroke(); }
      }
    };
    const seq = [1, 0, 1, 1, 0, 1, 0];
    const step = () => { draw(seq[n]); n++; if (n <= seq.length) setTimeout(step, 55); };
    step();
    play("thunder", 0.9, 0.8 + Math.random() * 0.2); setTimeout(() => play("impact", 0.7, 0.5 + Math.random() * 0.2), 60);
  }
  const centerOf = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.7]; };

  /* ================= HERO ================= */
  $("#enStats").innerHTML = [["7", "блоков в наборе"], ["1200", "держит взрыв стекло и печь"], ["54", "слота в сейфе"], ["64", "переплавки на одно око"]]
    .map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join("");

  // буквы заголовка «телепортируются», как эндермен
  (function title() {
    const h = $("#enTitle"); h.style.position = "relative";
    for (const sp of $$("span", h)) { const t = sp.textContent; sp.innerHTML = [...t].map((c) => `<span class="ch">${c}</span>`).join(""); }
    if (reduce) return;
    const chars = $$(".ch", h);
    setInterval(() => {
      if (document.hidden) return;
      const c = pick(chars); if (c.classList.contains("tp")) return;
      c.style.setProperty("--dx", (Math.random() - 0.5) * 80 + "px"); c.style.setProperty("--dy", (Math.random() - 0.5) * 50 + "px");
      c.classList.add("tp"); setTimeout(() => c.classList.remove("tp"), 520);
      const hr = h.getBoundingClientRect(), r = c.getBoundingClientRect();
      for (let i = 0; i < 9; i++) {
        const p = document.createElement("i"); p.className = "tp-p";
        p.style.left = r.left - hr.left + Math.random() * r.width + "px"; p.style.top = r.top - hr.top + Math.random() * r.height + "px";
        p.style.setProperty("--x", (Math.random() - 0.5) * 60 + "px"); p.style.setProperty("--y", (Math.random() - 0.5) * 60 - 20 + "px");
        h.appendChild(p); setTimeout(() => p.remove(), 720);
      }
    }, 2300);
  })();

  // дверной проём
  const stage = $("#drStage"), door = $("#drDoor"), scene = $("#drScene");
  let heroOpen = false, plateT = 0;
  $("#drRoom").innerHTML = `<img src="${T("iso/ender_safe")}" alt=""><span>ДОМА</span>`;
  $("#drOwner").innerHTML = `<img src="${WHO.owner.face}" alt="">владелец двери <code>Owner: 3f1c…a9e2</code>`;
  function heroDoor(open) {
    if (open === heroOpen) return;
    heroOpen = open; stage.classList.toggle("open", open);
    play(open ? "door_open" : "door_close", 0.8, 0.9 + Math.random() * 0.1);
  }
  function heroClick() {
    if (isOwner()) { heroDoor(!heroOpen); return; }
    door.classList.remove("deny"); void door.offsetWidth; door.classList.add("deny");
    bar($("#drBar"), P.msg.door.text, P.msg.door.color);
  }
  door.addEventListener("click", heroClick);
  door.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); heroClick(); } });
  // плита перед дверью: продавливает только хозяин
  $(".dr-plate").addEventListener("click", () => {
    if (!isOwner()) { bar($("#drBar"), "плита не нажимается: ты не хозяин", "7", 1800); return; }
    play("click", 0.5, 0.6); heroDoor(true);
    clearTimeout(plateT); plateT = setTimeout(() => { play("click", 0.5, 0.5); heroDoor(false); }, 1500);
  });
  $(".dr-plate").style.cursor = "pointer"; $(".dr-plate").dataset.tipInfo = "встать на плиту";
  // кнопка на стене в hero: по диагонали от двери, поэтому дверь её не слышит (как в коде)
  $("#drBtn").addEventListener("click", () => {
    const b = $("#drBtn");
    if (!isOwner()) { bar($("#drBar"), P.msg.button.text, P.msg.button.color); return; }
    b.classList.add("on"); play("click", 0.6, 0.6); setTimeout(() => { b.classList.remove("on"); play("click", 0.6, 0.5); }, 1000);
    bar($("#drBar"), "кнопка на стене не вплотную к двери: сигнал до неё не доходит", "7", 2600);
  });
  whoL.push(() => { if (!isOwner() && heroOpen) heroDoor(false); });
  if (!reduce) stage.addEventListener("pointermove", (e) => {
    const r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    scene.style.setProperty("--ry", -22 + x * 18 + "deg"); scene.style.setProperty("--rx", -6 - y * 8 + "deg");
  });

  // лента
  const STRIP = [["iso:ender_safe", "54 СЛОТА", "у игрока, не в блоке"], ["v:ender_eye", "64 ПЕРЕПЛАВКИ", "на одно око"], ["iso:reinforced_ender_glass", "1200", "взрывоустойчивость"],
    ["v:alex_face", "МОЛНИЯ", "чужаку"], ["item:ender_door", "ТОЛЬКО СВОЙ", "редстоун"], ["iso:ender_pressure_plate", "ОДИН ЧЕЛОВЕК", "на плиту"], ["v:ender_pearl", "32 ПЕРЕПЛАВКИ", "на жемчуг"]];
  const stripHtml = STRIP.map(([i, a, b]) => `<span>${img(i)}${a} <em>${b}</em></span>`).join("<span>◆</span>");
  $("#strip").innerHTML = stripHtml + "<span>◆</span>" + stripHtml + "<span>◆</span>";

  /* ================= 07.1 БЛОКИ ================= */
  let sel = clamp(S.get("p07.sel", 0), 0, P.blocks.length - 1), view = null, rot = { x: -24, y: 38 }, lit = false, lastTouch = 0;
  const SCENE_ICON = { ender_button: "iso:ender_button_wc", ender_pressure_plate: "iso:ender_pressure_plate_wc" };
  const sceneIcon = (b) => SCENE_ICON[b.key] || railIcon(b);
  let have = new Set(S.get("p07.have", []).filter((k) => B[k]));
  const railIcon = (b) => b.icon.startsWith("item:") ? b.icon : "iso:" + b.icon;
  $("#bkRail").innerHTML = P.blocks.map((b, i) => `<button type="button" class="bk-slot" role="tab" data-i="${i}" aria-selected="${i === sel}">${img(sceneIcon(b))}<span>${esc(b.name)}</span><i class="bk-have" title="уже в инвентаре">✓</i></button>`).join("");
  const syncHave = () => { $$(".bk-slot").forEach((el, i) => el.classList.toggle("have", have.has(P.blocks[i].key))); const c = $("#bkHave"); if (c) c.innerHTML = haveTxt(); };
  const haveTxt = () => `в инвентаре <b>${have.size}</b> из 7${have.size < 7 ? ": забери результат рецепта" : ", все собраны"}`;
  $("#bkRail").addEventListener("click", (e) => { const s = e.target.closest("[data-i]"); if (!s) return; sel = +s.dataset.i; S.set("p07.sel", sel); lit = false; renderBlock(); play(B[P.blocks[sel].key].sound === "стекло" ? "hit" : "hit", 0.35, 1.2); });

  function buildView() {
    const b = P.blocks[sel], box = $("#bk3d"); box.innerHTML = "";
    if (view) { view.destroy && view.destroy(); view = null; }
    if (!(window.ZMGL && ZMGL.supported())) { box.innerHTML = `<img src="${src(railIcon(b))}" style="width:60%;margin:auto;display:block" alt="">`; return; }
    const model = M[lit && b.modelOn ? b.modelOn : b.model];
    const bb = ZMModel3D.bbox(model), r = box.getBoundingClientRect();
    const maxd = Math.max(...bb.size, 8), unit = Math.min(r.width, r.height) * (b.model === "door" ? 0.5 : 0.46) / maxd;
    view = ZMGL.build(model, U("assets/textures/p7/"), { unit, persp: 1600, blend: !!b.blend });
    if (!view) return;
    view.el.style.cssText = "width:100%;height:100%;display:block";
    box.appendChild(view.el); view.setRot([["x", rot.x], ["y", rot.y]]);
  }
  function renderBlock() {
    const b = P.blocks[sel];
    $$(".bk-slot").forEach((s, i) => s.setAttribute("aria-selected", i === sel));
    $("#bkName").textContent = b.short.toUpperCase();
    $("#bkTools").innerHTML = b.modelOn ? `<button type="button" class="chip" id="bkLit" aria-pressed="${lit}">🔥 горит</button>` : "";
    buildView();
    const recipe = (r) => `<div class="cg-gui">${r.p.join("").split("").map((c, i) => { const g = P.ing[c]; return `<span class="cg" style="left:${(30 + (i % 3) * 18) / 176 * 100}%;top:${(17 + Math.floor(i / 3) * 18) / 80 * 100}%;--i:${i}" data-tip="${esc(g.name)}" data-tip-sub="minecraft:${g.id}">${img(g.icon)}</span>`; }).join("")}
      <span class="cg res" style="left:${124 / 176 * 100}%;top:${35 / 80 * 100}%;--i:9" data-tip="${esc(b.name)}" data-tip-sub="zitraksmode:${b.key}" data-tip-info="клик: забрать">${img(railIcon(b))}</span><span class="cg-t">Создание</span></div>`;
    const rs = b.recipes;
    $("#bkInfo").innerHTML = `
      <div class="bi-top"><div><div class="bi-name">${esc(b.name)}</div><button type="button" class="bi-id" id="biId" title="Скопировать">zitraksmode:${b.key} <span>⧉</span></button></div></div>
      <div class="bi-tags">${b.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
      <p class="bi-text">${esc(b.text)}</p>
      <div class="bi-stats">
        <div><b>${fmt(b.hard)}</b><span>прочность</span><i>обсидиан 50</i></div>
        <div><b>${b.res}</b><span>взрывоустойчивость</span></div>
        <div><b>${b.light ? b.light : "0"}</b><span>${b.light ? "свет, пока горит" : "свет"}</span></div>
        <div><b>${esc(b.sound)}</b><span>звук блока</span></div>
        <div><b>${b.tool ? "нужен" : "не нужен"}</b><span>инструмент для дропа</span></div>
        <div><b>${b.owner ? "да" : "нет"}</b><span>хозяин</span></div>
      </div>
      <div class="bi-recipe"><div class="bi-rh"><b>Рецепт</b>${rs.length > 1 ? rs.map((r, i) => `<button type="button" class="chip" data-r="${i}" aria-pressed="${i === 0}">${esc(r.label)}</button>`).join("") : `<span>верстак, 1 шт.</span>`}</div><div id="biRecipe">${recipe(rs[0])}</div><div class="bi-have" id="bkHave">${haveTxt()}</div></div>`;
    $("#biId").onclick = () => { ZM.copy("zitraksmode:" + b.key).then(() => { const x = $("#biId"); x.classList.add("ok"); x.firstChild.textContent = "скопировано "; play("pop", 0.5); setTimeout(() => { x.classList.remove("ok"); x.firstChild.textContent = `zitraksmode:${b.key} `; }, 1200); }); };
    $$("[data-r]", $("#bkInfo")).forEach((c) => c.onclick = () => { $$("[data-r]", $("#bkInfo")).forEach((x) => x.setAttribute("aria-pressed", x === c)); $("#biRecipe").innerHTML = recipe(rs[+c.dataset.r]); });
    renderMine(); syncHave();
  }
  // забрать результат: предмет летит в слот каталога
  $("#bkInfo").addEventListener("click", (e) => {
    const r = e.target.closest(".cg.res"); if (!r) return;
    const b = P.blocks[sel], im = $("img", r), to = $$(".bk-slot")[sel];
    if (im && to) {
      const a = im.getBoundingClientRect(), z = $("img", to).getBoundingClientRect(), f = im.cloneNode();
      f.style.cssText = `position:fixed;z-index:150;left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px;pointer-events:none;transition:transform .55s cubic-bezier(.5,-0.3,.6,1),opacity .55s;image-rendering:pixelated`;
      document.body.appendChild(f);
      requestAnimationFrame(() => { f.style.transform = `translate(${z.left - a.left}px,${z.top - a.top}px) scale(${z.width / a.width})`; f.style.opacity = 0.4; });
      setTimeout(() => f.remove(), 600);
    }
    ZM.sfx("pop", 0.5, 1.2 + Math.random() * 0.3);
    if (!have.has(b.key)) { have.add(b.key); S.set("p07.have", [...have]); setTimeout(syncHave, 550); if (have.size === 7) setTimeout(() => trigger("master"), 650); }
  });
  $("#bkTools").addEventListener("click", (e) => { if (e.target.closest("#bkLit")) { lit = !lit; e.target.closest("#bkLit").setAttribute("aria-pressed", lit); buildView(); if (lit) play("ignite", 0.5); } });
  // вращение мышью / пальцем, иначе медленно крутится само
  (function drag() {
    const v = $("#bkView"); let d = null;
    v.addEventListener("pointerdown", (e) => { if (e.target.closest("button")) return; d = { x: e.clientX, y: e.clientY, rx: rot.x, ry: rot.y }; v.setPointerCapture(e.pointerId); });
    v.addEventListener("pointermove", (e) => { if (!d) return; rot.y = d.ry + (e.clientX - d.x) * 0.5; rot.x = clamp(d.rx - (e.clientY - d.y) * 0.4, -85, 85); lastTouch = performance.now(); view && view.setRot([["x", rot.x], ["y", rot.y]]); });
    const up = () => { d = null; lastTouch = performance.now(); };
    v.addEventListener("pointerup", up); v.addEventListener("pointercancel", up);
    v.addEventListener("contextmenu", (e) => e.preventDefault());
    let vis = false; new IntersectionObserver(([e]) => { vis = e.isIntersecting; }).observe(v);
    (function spin(now) { if (vis && !d && now - lastTouch > 2500 && view && !reduce) { rot.y += 0.25; view.setRot([["x", rot.x], ["y", rot.y]]); } requestAnimationFrame(spin); })(0);
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(buildView, 200); });
  })();

  /* ---- сколько ломать ---- */
  const TOOLS = [
    { k: "hand", name: "Рука", icon: "v:steve_face", speed: 1 }, { k: "wooden", name: "Деревянная", icon: "v:wooden_pickaxe", speed: 2 },
    { k: "stone", name: "Каменная", icon: "v:stone_pickaxe", speed: 4 }, { k: "iron", name: "Железная", icon: "v:iron_pickaxe", speed: 6 },
    { k: "golden", name: "Золотая", icon: "v:golden_pickaxe", speed: 12 }, { k: "diamond", name: "Алмазная", icon: "v:diamond_pickaxe", speed: 8 },
    { k: "netherite", name: "Незеритовая", icon: "v:netherite_pickaxe", speed: 9 },
  ];
  const FACE = { reinforced_ender_glass: "mod/reinforced_ender_glass", ender_furnace: "mod/ender_furnace_front", ender_safe: "mod/ender_safe_front", ender_door: "mod/ender_door_bottom",
    ender_trapdoor: "mod/ender_trapdoor", ender_button: "mod/ender_button", ender_pressure_plate: "mod/ender_pressure_plate" };
  let tool = S.get("p07.tool", "diamond"), eff = S.get("p07.eff", 0);
  // как Player.getDigSpeed + BlockBehaviour.getDestroyProgress (без Спешки и воды)
  function mineCalc(hard, needTool, t, e) {
    const correct = t.k !== "hand", speed = correct ? t.speed + (e > 0 ? e * e + 1 : 0) : 1;
    const harvest = !needTool || correct, dmg = speed / hard / (harvest ? 30 : 100);
    const ticks = dmg >= 1 ? 0 : Math.ceil(1 / dmg);
    return { ticks, s: ticks / 20, dmg, harvest };
  }
  const tFmt = (s) => s >= 60 ? `${Math.floor(s / 60)} мин ${fmt(s % 60, 1)} с` : `${fmt(s, 2)} с`;
  function renderMine() {
    const b = P.blocks[sel], t = TOOLS.find((x) => x.k === tool);
    $("#mineIco").src = T(FACE[b.key]);
    $("#mineTools").innerHTML = TOOLS.map((x) => `<button type="button" class="chip" data-tool="${x.k}" aria-pressed="${x.k === tool}" title="${x.name}">${img(x.icon)}</button>`).join("");
    $("#mineEff").innerHTML = [0, 1, 2, 3, 4, 5].map((e) => `<button type="button" class="chip" data-eff="${e}" aria-pressed="${e === eff}" ${t.k === "hand" && e ? "disabled style=\"opacity:.35\"" : ""}>${e ? "Эфф. " + ["I", "II", "III", "IV", "V"][e - 1] : "без чар"}</button>`).join("");
    const r = mineCalc(b.hard, b.tool, t, t.k === "hand" ? 0 : eff), o = mineCalc(50, true, t, t.k === "hand" ? 0 : eff);
    const obsHarvest = t.k === "diamond" || t.k === "netherite";
    $("#mineOut").innerHTML = `<div><b>${tFmt(r.s)}</b><span>${esc(t.name)}${t.k !== "hand" ? " кирка" : ""}</span></div><div><b>${r.ticks}</b><span>${plural(r.ticks, "тик", "тика", "тиков")}</span></div>
      <div><b>${tFmt(obsHarvest ? o.s : mineCalc(50, true, { k: "hand", speed: 1 }, 0).s * 0 + (50 * (t.k === "hand" ? 1 : 1) * 100 / (t.k === "hand" ? 1 : t.speed + (eff ? eff * eff + 1 : 0))) / 20)}</b><span>обсидиан тем же</span></div>
      <div class="wide">${r.harvest ? `Блок <b>выпадет</b>.` : `Рукой блок ломается втрое медленнее и <b>ничего не роняет</b>: у него requiresCorrectToolForDrops.`} ${!b.tool ? "Сейфу инструмент не обязателен: его можно снести даже голыми руками, вещи от этого не пострадают." : ""}</div>
      <div class="wide mine-bar"><i id="mineBar"></i></div>`;
  }
  $("#mine").addEventListener("click", (e) => {
    const a = e.target.closest("[data-tool]"), f = e.target.closest("[data-eff]");
    if (a) { tool = a.dataset.tool; S.set("p07.tool", tool); ZM.sfx("equip", 0.5); renderMine(); }
    if (f) { eff = +f.dataset.eff; S.set("p07.eff", eff); if (eff) ZM.sfx("enchant", 0.35); renderMine(); }
  });
  // зажми, чтобы ломать: реальная скорость, трещины destroy_stage_0..9, удар каждые 4 тика
  (function mining() {
    const el = $("#mineBlock"), crack = $("#mineCrack");
    let on = false, prog = 0, tk = 0, raf = 0, last = 0, acc = 0;
    function stop() { on = false; cancelAnimationFrame(raf); prog = 0; crack.removeAttribute("src"); crack.style.opacity = 0; el.classList.remove("busy"); const bb = $("#mineBar"); if (bb) bb.style.width = "0%"; }
    function loop(now) {
      if (!on) return;
      acc += Math.min(200, now - last); last = now;
      const b = P.blocks[sel], t = TOOLS.find((x) => x.k === tool), r = mineCalc(b.hard, b.tool, t, t.k === "hand" ? 0 : eff);
      while (acc >= 50 && on) {
        acc -= 50; tk++; prog += r.dmg;
        if (tk % 4 === 1) { play(b.sound === "стекло" ? "hit" : "hit", 0.25, b.sound === "металл" ? 1.5 * 0.83 : 0.5 * 1.6); el.classList.remove("hit"); void el.offsetWidth; el.classList.add("hit"); }
        if (prog >= 1) {
          play(b.sound === "стекло" ? "glass" : "dig", 0.9, b.sound === "металл" ? 1.2 : 0.8);
          el.classList.add("gone"); burst(el, T(FACE[b.key])); stop();
          setTimeout(() => el.classList.remove("gone"), 800); return;
        }
      }
      const st = Math.min(9, Math.floor(prog * 10));
      crack.src = T("v/destroy_" + st); crack.style.opacity = 0.85;
      const bb = $("#mineBar"); if (bb) bb.style.width = prog * 100 + "%";
      raf = requestAnimationFrame(loop);
    }
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); if (el.classList.contains("gone")) return; on = true; prog = 0; tk = 0; acc = 50; last = performance.now(); el.classList.add("busy"); el.setPointerCapture(e.pointerId); raf = requestAnimationFrame(loop); });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) el.addEventListener(ev, () => { if (on) stop(); });
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  })();
  // осколки блока при разрушении
  function burst(el, tex) {
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 18; i++) {
      const p = document.createElement("i"), s = 8 + rnd(10);
      p.style.cssText = `position:fixed;z-index:120;pointer-events:none;width:${s}px;height:${s}px;left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;background:url("${tex}") ${rnd(16) * -s}px ${rnd(16) * -s}px/${s * 16}px ${s * 16}px;image-rendering:pixelated;transition:transform .7s cubic-bezier(.2,.7,.3,1),opacity .7s`;
      document.body.appendChild(p);
      requestAnimationFrame(() => { p.style.transform = `translate(${(Math.random() - 0.5) * 180}px,${Math.random() * 120 - 40}px) rotate(${rnd(360)}deg)`; p.style.opacity = 0; });
      setTimeout(() => p.remove(), 750);
    }
  }

  /* ---- смета ---- */
  const cnt = Object.assign({ reinforced_ender_glass: 8, ender_furnace: 1, ender_safe: 1, ender_door: 1, ender_trapdoor: 1, ender_button: 1, ender_pressure_plate: 1 }, S.get("p07.cost", {}));
  function renderCost() {
    $("#costList").innerHTML = P.blocks.map((b) => `<div class="cost-row">${img(railIcon(b))}<span>${esc(b.name)}</span><span class="cost-n"><button type="button" data-c="${b.key}" data-d="-1" aria-label="меньше">−</button><b>${cnt[b.key]}</b><button type="button" data-c="${b.key}" data-d="1" aria-label="больше">+</button></span></div>`).join("");
    const direct = {};
    for (const b of P.blocks) for (const c of b.recipes[0].p.join("")) direct[c] = (direct[c] || 0) + cnt[b.key];
    // до сырья: эндер-сундук = 8 обсидиана + око; око = жемчуг + огненный порошок; дверь 6 железа на 3 шт.; люк 4 железа; кнопка 1 камень; плита 2 камня; печь 8 булыжника
    const raw = { obs: (direct.O || 0) + 8 * (direct.C || 0), eye: (direct.E || 0) + (direct.C || 0), glass: direct.G || 0, cobble: 8 * (direct.F || 0),
      iron: Math.ceil((direct.D || 0) / 3) * 6 + 4 * (direct.T || 0), stone: (direct.B || 0) + 2 * (direct.P || 0) };
    const d = mineCalc(50, true, TOOLS[5], 0).s, n5 = mineCalc(50, true, TOOLS[6], 5).s;
    const chips = [["iso:obsidian", "Обсидиан", raw.obs], ["v:ender_pearl", "Эндер-жемчуг", raw.eye], ["v:blaze_powder", "Огненный порошок", raw.eye], ["iso:glass", "Стекло", raw.glass],
      ["iso:cobblestone", "Булыжник", raw.cobble], ["v:iron_ingot", "Железо", raw.iron], ["iso:stone", "Камень", raw.stone]].filter((x) => x[2] > 0);
    $("#costSum").innerHTML = `<div class="cost-mats">${chips.map(([i, n, v]) => `<span data-tip="${esc(n)}">${img(i)}<b>${v}</b></span>`).join("")}</div>
      <div class="cost-t">Это уже в сырье: эндер-сундук разобран на обсидиан и око, око на жемчуг и порошок. Накопать <b>${raw.obs}</b> обсидиана алмазной киркой: <b>${tFmt(raw.obs * d)}</b>, незеритовой с Эффективностью V: <b>${tFmt(raw.obs * n5)}</b>.</div>`;
  }
  $("#cost").addEventListener("click", (e) => { const b = e.target.closest("[data-c]"); if (!b) return; cnt[b.dataset.c] = clamp(cnt[b.dataset.c] + +b.dataset.d, 0, 999); S.set("p07.cost", cnt); renderCost(); });
  renderCost();
  renderBlock();

  /* ================= 07.2 СВОЙ / ЧУЖОЙ ================= */
  const LK = [
    { k: "safe", b: "ender_safe", icon: "iso:ender_safe" }, { k: "furnace", b: "ender_furnace", icon: "iso:ender_furnace" }, { k: "door", b: "ender_door", icon: "item:ender_door" },
    { k: "trapdoor", b: "ender_trapdoor", icon: "iso:ender_trapdoor" }, { k: "button", b: "ender_button", icon: "iso:ender_button_wc" }, { k: "plate", b: "ender_pressure_plate", icon: "iso:ender_pressure_plate_wc" },
  ];
  const lkState = { door: false, trapdoor: false };
  $("#lkRow").innerHTML = LK.map((x) => `<button type="button" class="lk-b" data-lk="${x.k}"><span class="st"></span>${img(x.icon)}<span>${esc(B[x.b].short)}</span></button>`).join("");
  const RULES = {
    safe: { own: "Открывается интерфейс на 54 слота.", bad: `Сообщение в чат <q style="--c:#ff5555">${esc(P.msg.safe.text)}</q>, молния в чужака и ещё 25% его максимального здоровья магическим уроном. Хозяину ачивка, чужаку ачивка.` },
    furnace: { own: "Открывается печь.", bad: `В чат <q style="--c:#ff5555">${esc(P.msg.furnace.text)}</q>, молния и те же 25% здоровья. Ачивки те же, что у сейфа.` },
    door: { own: "Открывается рукой, хотя дверь по сути железная.", bad: `Над хотбаром <q style="--c:#ff5555">${esc(P.msg.door.text)}</q>. Без молнии.` },
    trapdoor: { own: "Открывается рукой, хлопает как деревянный.", bad: `Над хотбаром <q style="--c:#ff5555">${esc(P.msg.trapdoor.text)}</q>.` },
    button: { own: "Нажимается и держит сигнал секунду.", bad: `Над хотбаром <q style="--c:#ffffff">${esc(P.msg.button.text)}</q>, белым.` },
    plate: { own: "Продавливается, сигнал 15.", bad: "Ничего. Ни сообщения, ни звука: для чужака плиты как будто нет." },
  };
  function renderRules() {
    $("#lkRules").innerHTML = LK.map((x) => `<div class="lr" data-lr="${x.k}">${img(x.icon)}<div><b>${esc(B[x.b].name)}</b><p>${isOwner() ? RULES[x.k].own : RULES[x.k].bad}</p></div></div>`).join("")
      + `<div class="lr"><span></span><p style="font-size:11.5px;color:var(--dim)">${isOwner() ? "Сейчас ты хозяин. Переключись на чужака, чтобы увидеть, что будет с ним." : "Сейчас ты чужак. Жизни ниже: молния и магия бьют по-настоящему."}</p></div>`;
  }
  let hp = 20, burnT = 0, dead = false;
  function hearts() {
    const h = $("#lkHearts"); h.classList.toggle("owner", isOwner());
    h.innerHTML = Array.from({ length: 10 }, (_, i) => `<i class="${hp >= (i + 1) * 2 ? "f" : hp >= i * 2 + 1 ? "h" : ""}"></i>`).join("");
  }
  function damage(n, why) {
    if (dead) return;
    hp = Math.max(0, hp - n); const h = $("#lkHearts"); h.classList.remove("hurt"); void h.offsetWidth; h.classList.add("hurt"); hearts();
    if (hp <= 0) {
      dead = true; clearInterval(burnT); h.classList.remove("burn");
      $("#lkDeadWhy").textContent = why === "fire" ? "Чужак сгорел заживо" : "Чужак был убит магией";
      $("#lkDead").hidden = false;
    }
  }
  $("#lkRespawn").addEventListener("click", () => { hp = 20; dead = false; $("#lkDead").hidden = true; hearts(); });
  // наказание чужака: молния у ног + 25% макс. здоровья магией (player.hurt(MAGIC, max*0.25)), молния поджигает на 8 с
  function punish(kind, target, chatEl) {
    const m = P.msg[kind];
    if (chatEl) chat(chatEl, col(m.color, m.text));
    const [x, y] = centerOf(target); strike(x, y);
    if (!dead) {
      damage(5, "magic"); play("hurt", 0.7);
      clearInterval(burnT); let s = 0; $("#lkHearts").classList.add("burn");
      burnT = setInterval(() => { s++; if (s > 8 || dead) { clearInterval(burnT); $("#lkHearts").classList.remove("burn"); return; } damage(1, "fire"); play("fire_hurt", 0.5); }, 1000);
    }
    chatSink = chatEl; setTimeout(() => { trigger("caught"); trigger("fucked"); chatSink = null; }, 500);
  }
  function lkMark(el, ok, text) {
    el.classList.remove("ok", "no", "zap"); void el.offsetWidth; el.classList.add(ok ? "ok" : "no"); $(".st", el).textContent = text;
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("ok", "no"), 2200);
    $$(".lr").forEach((r) => r.classList.toggle("hl", r.dataset.lr === el.dataset.lk));
  }
  $("#lkRow").addEventListener("click", (e) => {
    const el = e.target.closest("[data-lk]"); if (!el) return;
    const k = el.dataset.lk, chatEl = $("#lkChat"), barEl = $("#lkBar");
    if (dead) return;
    if (isOwner()) {
      if (k === "safe") lkMark(el, true, "ОТКРЫТ");
      if (k === "furnace") lkMark(el, true, "ОТКРЫТА");
      if (k === "door") { lkState.door = !lkState.door; play(lkState.door ? "door_open" : "door_close", 0.7); lkMark(el, true, lkState.door ? "ОТКРЫТА" : "ЗАКРЫТА"); }
      if (k === "trapdoor") { lkState.trapdoor = !lkState.trapdoor; play(lkState.trapdoor ? "trap_open" : "trap_close", 0.7); lkMark(el, true, lkState.trapdoor ? "ОТКРЫТ" : "ЗАКРЫТ"); }
      if (k === "button") { play("click", 0.6, 0.6); setTimeout(() => play("click", 0.6, 0.5), 1000); lkMark(el, true, "СИГНАЛ 1 С"); }
      if (k === "plate") { play("click", 0.5, 0.6); setTimeout(() => play("click", 0.5, 0.5), 1000); lkMark(el, true, "СИГНАЛ 15"); }
      return;
    }
    if (k === "safe" || k === "furnace") { el.classList.add("zap"); lkMark(el, false, "МОЛНИЯ"); punish(k, $("img", el), chatEl); return; }
    if (k === "plate") { lkMark(el, false, "ТИШИНА"); return; }
    lkMark(el, false, "ОТКАЗ"); bar(barEl, P.msg[k].text, P.msg[k].color);
  });
  whoL.push(() => { renderRules(); hearts(); });
  renderRules(); hearts();

  /* ================= 07.3 ЭНДЕР-ПЕЧЬ ================= */
  const F = { inp: null, fuel: null, out: null, rem: 0, cap: 0, speed: 0, prog: 0 };
  const TOTAL = 200;   // у всех ванильных рецептов плавки cookingTime = 200
  let fuSel = 0;
  const SM = P.smelt, stack = (id) => (id === "ender_pearl" ? 16 : 64);
  const sIcon = (id) => id.startsWith("iso:") ? id : "v:" + id;
  const itemName = (id) => { for (const s of SM) { if (s.from === id) return s.a; if (s.to === id) return s.b; } return P.fuel[id] ? P.fuel[id].name : id; };
  $("#fuInputs").innerHTML = SM.map((s, i) => `<button type="button" class="chip" data-in="${i}" aria-pressed="${i === 0}" data-tip="${esc(s.a)}" data-tip-info="→ ${esc(s.b)}">${img(sIcon(s.from), s.from.startsWith("iso:") ? "iso" : "")}</button>`).join("");
  $("#fuFuels").innerHTML = [["ender_eye", "v:ender_eye", "Око Эндера", ""], ["ender_pearl", "v:ender_pearl", "Эндер-жемчуг", ""], ["coal", "v:coal", "Уголь", "bad"], ["charcoal", "v:charcoal", "Древесный уголь", "bad"]]
    .map(([k, i, n, c]) => `<button type="button" class="chip ${c}" data-fuel="${k}">${img(i)}${esc(n)} ${c ? "" : "+1"}</button>`).join("");
  const gui = $("#fuGui");
  const pos = (x, y) => `left:${x / 176 * 100}%;top:${y / 80 * 100}%`;
  gui.innerHTML = `<span class="ttl">Эндер-печь</span>
    <button type="button" class="sl" id="fsIn" style="${pos(56, 17)}"></button>
    <button type="button" class="sl" id="fsFuel" style="${pos(56, 53)}"></button>
    <button type="button" class="sl" id="fsOut" style="${pos(116, 35)}"></button>
    <i class="flame" id="fsFlame"></i><i class="arrow" id="fsArrow"></i>`;
  let fuMsg = "";
  function slotHtml(it) { if (!it) return ""; return `${img(sIcon(it.id), it.id.startsWith("iso:") ? "iso" : "")}${it.n > 1 ? `<span class="n">${it.n}</span>` : ""}`; }
  function renderFu() {
    $("#fsIn").innerHTML = slotHtml(F.inp); $("#fsFuel").innerHTML = slotHtml(F.fuel); $("#fsOut").innerHTML = slotHtml(F.out);
    for (const [id, it] of [["fsIn", F.inp], ["fsFuel", F.fuel], ["fsOut", F.out]]) { const s = $("#" + id); if (it) { s.dataset.tip = itemName(it.id); s.dataset.tipInfo = "×" + it.n; } else { delete s.dataset.tip; } }
    // пламя: remainingSmelts / capacity (dataAccess 0 и 1), стрелка: прогресс / 200
    gui.style.setProperty("--lit", F.cap ? (F.rem / F.cap) * 100 + "%" : "0%");
    $("#fsArrow").style.setProperty("--pr", (F.prog / TOTAL) * 100 + "%");
    $("#fsFlame").style.setProperty("--lit", F.cap ? (F.rem / F.cap) * 100 + "%" : "0%");
    const tpi = F.speed ? Math.ceil(TOTAL / F.speed) : 0, on = F.rem > 0;
    $("#fuStats").innerHTML = `
      <div style="display:flex;align-items:center;gap:10px"><img src="${T(on ? "iso/ender_furnace_on" : "iso/ender_furnace")}" alt="" style="width:46px;height:46px;${on ? "filter:drop-shadow(0 0 12px rgba(255,190,80,.8))" : ""}"><span><b>${on ? "горит" : "погашена"}</b><span>свет ${on ? 13 : 0}</span></span></div>
      <div><b>${F.rem} / ${F.cap}</b><span>заряд: переплавок осталось</span></div>
      <div><b>${F.speed || "—"}</b><span>прогресса за тик (обычная: 1)</span></div>
      <div><b>${tpi ? tpi + " " + plural(tpi, "тик", "тика", "тиков") : "—"}</b><span>на один предмет (обычная: 200)</span></div>
      <div><b>${tpi ? fmt(20 / tpi, 1) : "—"}</b><span>предметов в секунду</span></div>
      <div><b>${F.out ? F.out.n : 0}</b><span>готово</span></div>
      <div class="wide">Треска и дыма нет: своих частиц и звука горения у Эндер-печи нет, она горит молча. Опыт за переплавку <b>не копится</b>. Если плавить нечего, прогресс откатывается на 2 за тик, а заряд не тратится.</div>
      <div class="fu-msg" id="fuMsg">${esc(fuMsg)}</div>`;
  }
  function canBurn() {
    if (!F.inp) return false;
    const to = SM.find((s) => s.from === F.inp.id).to;
    if (!F.out) return true;
    return F.out.id === to && F.out.n + 1 <= 64;
  }
  // один тик EnderFurnaceBlockEntity.serverTick
  function fuTick() {
    if (F.rem <= 0 && canBurn() && F.fuel) {
      const f = P.fuel[F.fuel.id]; F.rem = f.smelts; F.speed = f.speed; F.cap = F.rem;
      F.fuel.n--; if (!F.fuel.n) F.fuel = null;
      play("eye", 0.25, 1.4);
    }
    if (F.rem > 0 && canBurn()) {
      F.prog += F.speed || 1;
      if (F.prog >= TOTAL) {
        F.prog = 0;
        const to = SM.find((s) => s.from === F.inp.id).to;
        F.out = F.out ? { id: to, n: F.out.n + 1 } : { id: to, n: 1 };
        F.inp.n--; if (!F.inp.n) F.inp = null;
        F.rem--; if (F.rem <= 0) { F.rem = 0; F.speed = 0; F.cap = 0; }
      }
    } else if (F.prog > 0) F.prog = Math.max(0, F.prog - 2);
  }
  let fuVis = false, fuAcc = 0, fuLast = 0;
  new IntersectionObserver(([e]) => { fuVis = e.isIntersecting; }).observe($("#furnace"));
  (function fuLoop(now) {
    requestAnimationFrame(fuLoop);
    const dt = Math.min(250, now - fuLast); fuLast = now;
    if (!fuVis) return;
    fuAcc += dt; let n = 0, was = JSON.stringify(F);
    while (fuAcc >= 50) { fuAcc -= 50; fuTick(); n++; }
    if (n && JSON.stringify(F) !== was) { if (F.out && F.out.n % 8 === 0 && F.prog === 0) play("pop", 0.15, 1.6 + Math.random() * 0.4); renderFu(); }
  })(0);
  const setMsg = (m) => { fuMsg = m; const el = $("#fuMsg"); if (el) el.textContent = m; };
  $("#fuInputs").addEventListener("click", (e) => { const c = e.target.closest("[data-in]"); if (!c) return; fuSel = +c.dataset.in; $$("[data-in]").forEach((x) => x.setAttribute("aria-pressed", x === c)); const id = SM[fuSel].from; if (!F.inp || F.inp.id !== id) F.inp = { id, n: 64 }; else F.inp.n = 64; F.prog = 0; setMsg(""); renderFu(); });
  $("#fuFuels").addEventListener("click", (e) => {
    const c = e.target.closest("[data-fuel]"); if (!c) return; const k = c.dataset.fuel;
    if (!P.fuel[k]) { setMsg("Не лезет: canPlaceItem пускает в слот топлива только око Эндера и эндер-жемчуг."); play("fizz", 0.3, 1.4); return; }
    if (F.fuel && F.fuel.id !== k) F.fuel = null;
    F.fuel = F.fuel ? { id: k, n: Math.min(stack(k), F.fuel.n + 1) } : { id: k, n: 1 }; setMsg(""); ZM.sfx("pop", 0.4); renderFu();
  });
  $("#fuFill").onclick = () => { const id = SM[fuSel].from; F.inp = { id, n: 64 }; if (!F.fuel) F.fuel = { id: "ender_eye", n: 1 }; setMsg(""); renderFu(); };
  $("#fuTake").onclick = () => { if (F.out) { ZM.sfx("pop", 0.5); F.out = null; renderFu(); } };
  $("#fuClear").onclick = () => { Object.assign(F, { inp: null, fuel: null, out: null, rem: 0, cap: 0, speed: 0, prog: 0 }); setMsg(""); renderFu(); };
  $("#fsOut").onclick = $("#fuTake").onclick;
  $("#fsFuel").onclick = () => { if (F.fuel) { F.fuel = null; ZM.sfx("pop", 0.4); renderFu(); } };
  $("#fsIn").onclick = () => { if (F.inp) { F.inp = null; F.prog = 0; ZM.sfx("pop", 0.4); renderFu(); } };
  renderFu();

  // гонка: 64 сырого железа
  const RACE = [
    { k: "coal", name: "Обычная печь · уголь", icon: "iso:furnace", tpi: 200, per: 8, fuelName: "угля", c1: "#666", c2: "#999" },
    { k: "pearl", name: "Эндер-печь · жемчуг", icon: "iso:ender_furnace_on", tpi: 2, per: 32, fuelName: "жемчуга", c1: "#2f6f63", c2: "#5fb8a0" },
    { k: "eye", name: "Эндер-печь · око", icon: "iso:ender_furnace_on", tpi: 1, per: 64, fuelName: "око", c1: "#7c3aed", c2: "#e879f9" },
  ];
  $("#raceRows").innerHTML = RACE.map((r) => `<div class="rr" style="--c1:${r.c1};--c2:${r.c2}">${img(r.icon)}<div class="rr-b"><i id="rb_${r.k}"></i><span>${r.name}</span></div><b id="rn_${r.k}">0</b></div>`).join("") + `<div class="race-note" id="raceNote"></div>`;
  let raceRaf = 0;
  $("#raceGo").onclick = () => {
    cancelAnimationFrame(raceRaf); const t0 = performance.now(); let lastCr = 0, done = {};
    $("#raceGo").disabled = true;
    (function f(now) {
      const tk = Math.floor((now - t0) / 50);
      for (const r of RACE) {
        const n = Math.min(64, Math.floor(tk / r.tpi));
        $("#rb_" + r.k).style.width = (r.k === "coal" ? ((tk % 200) / 200) * (100 / 64) + (n / 64) * 100 : (n / 64) * 100) + "%";
        $("#rn_" + r.k).textContent = n;
        if (n === 64 && !done[r.k]) { done[r.k] = 1; play("orb", 0.5, r.k === "eye" ? 1.2 : 1); }
      }
      if (now - lastCr > 900) { lastCr = now; play("crackle", 0.35); }
      $("#raceT").textContent = fmt((now - t0) / 1000, 2) + " с";
      if (tk < 128 + 30) raceRaf = requestAnimationFrame(f);
      else {
        $("#raceGo").disabled = false;
        $("#raceNote").innerHTML = `Око закончило за <b>3,2 с</b>, жемчуг за <b>6,4 с</b> и два жемчуга. Обычная печь за это время не выдала ни одного слитка: ей ещё <b>10 мин 40 с</b> и <b>8 угля</b>.`;
      }
    })(t0);
  };

  /* ================= 07.4 ЭНДЕР-СЕЙФ ================= */
  const ITEM_NAMES = { diamond: "Алмаз", netherite_ingot: "Незеритовый слиток", totem_of_undying: "Тотем бессмертия", elytra: "Элитры", golden_apple: "Золотое яблоко", emerald: "Изумруд",
    ender_pearl: "Эндер-жемчуг", diamond_sword: "Алмазный меч", enchanted_book: "Зачарованная книга", experience_bottle: "Пузырёк опыта", nether_star: "Звезда Незера", shulker_shell: "Панцирь шалкера",
    ender_eye: "Око Эндера", iron_ingot: "Железный слиток", gold_ingot: "Золотой слиток", blaze_powder: "Огненный порошок" };
  const MAXS = { totem_of_undying: 1, elytra: 1, diamond_sword: 1, enchanted_book: 1, ender_pearl: 16 };
  const mx = (id) => MAXS[id] || 64;
  const defInv = () => { const a = Array(36).fill(null); [["diamond", 64], ["netherite_ingot", 12], ["totem_of_undying", 1], ["elytra", 1], ["golden_apple", 23], ["diamond_sword", 1], ["ender_pearl", 16], ["experience_bottle", 64], ["emerald", 64]].forEach(([id, n], i) => (a[i] = { id, n })); a[20] = { id: "nether_star", n: 1 }; a[14] = { id: "enchanted_book", n: 1 }; a[30] = { id: "shulker_shell", n: 2 }; return a; };
  const defSafe = () => { const a = Array(54).fill(null); a[0] = { id: "ender_eye", n: 12 }; a[1] = { id: "iron_ingot", n: 64 }; a[2] = { id: "gold_ingot", n: 37 }; a[9] = { id: "blaze_powder", n: 9 }; return a; };
  let safe = S.get("p07.safe", null), inv = S.get("p07.inv", null);
  if (!Array.isArray(safe) || safe.length !== 54) safe = defSafe();
  if (!Array.isArray(inv) || inv.length !== 36) inv = defInv();
  const TABS = [{ k: "home", name: "Сейф у дома", icon: "iso:ender_safe" }, { k: "mine", name: "Сейф в шахте", icon: "iso:ender_safe" }, { k: "end", name: "Сейф в Энде", icon: "iso:ender_safe" }];
  let tab = 0, broken = S.get("p07.broken", {}), fresh = new Set();
  const saveSafe = () => { S.set("p07.safe", safe); S.set("p07.inv", inv); };
  $("#sfTabs").innerHTML = TABS.map((t, i) => `<button type="button" class="chip" data-tab="${i}" aria-pressed="${i === tab}">${img(t.icon)}${t.name}</button>`).join("");
  const sg = $("#sfGui");
  const spos = (x, y) => `left:${x / 176 * 100}%;top:${y / 222 * 100}%`;
  // слоты меню: 0..53 сейф, 54..80 инвентарь (inv 9..35), 81..89 хотбар (inv 0..8)
  const slotRef = (i) => i < 54 ? [safe, i] : i < 81 ? [inv, i - 54 + 9] : [inv, i - 81];
  const slotXY = (i) => i < 54 ? [8 + (i % 9) * 18, 18 + Math.floor(i / 9) * 18] : i < 81 ? [8 + ((i - 54) % 9) * 18, 140 + Math.floor((i - 54) / 9) * 18] : [8 + (i - 81) * 18, 198];
  function renderSafe() {
    let h = `<span class="ttl" style="top:${6 / 222 * 100}%">Эндер-сейф</span><span class="ttl" style="top:${128 / 222 * 100}%">Инвентарь</span>`;
    for (let i = 0; i < 90; i++) {
      const [arr, j] = slotRef(i), it = arr[j], [x, y] = slotXY(i);
      h += `<button type="button" class="sl ${fresh.has(i) ? "new" : ""}" data-s="${i}" style="${spos(x, y)}" ${it ? `data-tip="${esc(ITEM_NAMES[it.id] || it.id)}" data-tip-info="${i < 54 ? "клик: в инвентарь" : "клик: в сейф"}"` : ""}>${it ? `${img("v:" + it.id)}${it.n > 1 ? `<span class="n">${it.n}</span>` : ""}` : ""}</button>`;
    }
    sg.innerHTML = h; fresh.clear();
    const bk = broken[TABS[tab].k];
    $("#sfGone").hidden = !bk && isOwner();
    if (bk) $("#sfGone").innerHTML = `<img src="${T("iso/ender_safe")}" alt="" style="opacity:.3;filter:grayscale(1)"><b>Сейф сломан</b><p>Выпало: ничего. Вещи никуда не делись, они у тебя. Открой любой другой сейф или поставь этот заново.</p><button type="button" class="en-btn hot" id="sfPlace">Поставить заново</button>`;
    else if (!isOwner()) $("#sfGone").innerHTML = `<img src="${WHO.intruder.face}" alt="" class="px" style="width:64px;height:64px"><b>Это чужой сейф</b><p>Даже открой его чужак, он увидел бы свой собственный инвентарь сейфа, а не хозяйский. Но до этого не дойдёт.</p><button type="button" class="en-btn" id="sfTry">Всё равно открыть</button><div class="mc-chat" id="sfChat" style="align-items:center"></div>`;
    $("#sfBreak").disabled = !!bk; $("#sfBreak").textContent = bk ? "Этот сейф уже сломан" : "⛏ Сломать этот сейф";
  }
  // EnderSafeMenu.quickMoveStack -> moveItemStackTo: сначала докладываем в неполные стопки, потом в пустые слоты
  function moveTo(i, from, to, reverse) {
    const [arr, j] = slotRef(i), it = arr[j]; if (!it) return;
    const order = []; for (let k = from; k < to; k++) order.push(k); if (reverse) order.reverse();
    for (const k of order) { const [a2, j2] = slotRef(k), t = a2[j2]; if (t && t.id === it.id && t.n < mx(t.id)) { const m = Math.min(it.n, mx(t.id) - t.n); t.n += m; it.n -= m; fresh.add(k); if (!it.n) break; } }
    if (it.n) for (const k of order) { const [a2, j2] = slotRef(k); if (!a2[j2]) { a2[j2] = { id: it.id, n: it.n }; it.n = 0; fresh.add(k); break; } }
    if (!it.n) arr[j] = null;
  }
  sg.addEventListener("click", (e) => {
    const s = e.target.closest("[data-s]"); if (!s) return; const i = +s.dataset.s;
    if (!slotRef(i)[0][slotRef(i)[1]]) return;
    if (i < 54) moveTo(i, 54, 90, true); else moveTo(i, 0, 54, false);
    ZM.sfx("pop", 0.35, 1.5 + Math.random() * 0.3); saveSafe(); renderSafe();
  });
  $("#sfTabs").addEventListener("click", (e) => {
    const c = e.target.closest("[data-tab]"); if (!c || +c.dataset.tab === tab) return;
    tab = +c.dataset.tab; $$("[data-tab]").forEach((x) => x.setAttribute("aria-pressed", x === c));
    sg.classList.add("swap"); setTimeout(() => { renderSafe(); sg.classList.remove("swap"); }, 180);
  });
  $("#sfGone").addEventListener("click", (e) => {
    if (e.target.closest("#sfPlace")) { delete broken[TABS[tab].k]; S.set("p07.broken", broken); play("dig", 0.7, 0.8); renderSafe(); }
    if (e.target.closest("#sfTry")) { punish("safe", $("#sfTry"), null); chat($("#sfChat"), col("c", P.msg.safe.text)); }
  });
  $("#sfBreak").onclick = () => {
    if (!isOwner()) { bar($("#lkBar"), "", "c", 1); }
    let n = 0; const t = setInterval(() => { play("hit", 0.35, 0.8); if (++n >= 5) { clearInterval(t); play("dig", 0.9, 0.8); broken[TABS[tab].k] = 1; S.set("p07.broken", broken); burst($("#sfGui"), T("mod/ender_safe_front")); renderSafe(); } }, 180);
  };
  $("#sfSort").onclick = () => { for (let i = 0; i < 54; i++) if (safe[i]) moveTo(i, 54, 90, true); ZM.sfx("pop", 0.4); saveSafe(); renderSafe(); };
  $("#sfVs").innerHTML = `<div class="pn-h"><b>Эндер-сундук или Эндер-сейф</b><span>сейф крафтится из сундука</span></div>
    <div class="vs"><div></div><div class="h">${img("iso:ender_chest")}Эндер-сундук</div><div class="h">${img("iso:ender_safe")}Эндер-сейф</div>
    <div class="k">слотов</div><div class="l">27</div><div class="w">54</div>
    <div class="k">где вещи</div><div class="l">у игрока</div><div class="l">у игрока (свой отдельный)</div>
    <div class="k">кто открывает</div><div class="l">любой</div><div class="w">только хозяин</div>
    <div class="k">чужаку</div><div class="l">свой сундук</div><div class="w">молния и −25% здоровья</div>
    <div class="k">прочность</div><div class="l">22,5</div><div class="w">36,25</div>
    <div class="k">взрыв</div><div class="l">600</div><div class="l">600</div>
    <div class="k">свет, частицы</div><div class="w">есть</div><div class="l">нет</div></div>`;
  $("#sfNote").innerHTML = `<p>Инвентарь сейфа <b>свой у каждого игрока</b> и не связан с эндер-сундуком: это отдельные 54 слота.</p>
    <p>Сейф <b>поворачивается лицом к тебе</b>, когда ставишь. Интерфейс закроется, если отойти дальше 8 блоков.</p>
    <p>Прочность 36,25, а инструмент для дропа не нужен: сейф можно снести хоть рукой. Вещам это не страшно, в блоке их нет.</p>
    <p>Shift+клик работает как у сундука: из сейфа вещи ложатся в инвентарь начиная с хотбара справа, из инвентаря в первый свободный слот сейфа.</p>`;
  whoL.push(renderSafe);
  renderSafe();

  /* ================= 07.5 ДОСТУП ================= */
  // стена 7×4: col2 дверь; col1 и col3 воздух с напольными кнопками (вплотную к двери); на блоке над дверью рычаг;
  // col4 своя эндер-кнопка на стене (по диагонали); col5 люк в полу; col6 рычаг у люка
  const AC = { open: false, trap: false, plate: null, fbtn: 0, forbtn: 0, wbtn: 0, lever: false, tlever: false };
  const acWall = $("#acWall");
  const cells = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) {
    let cls = r === 3 ? "es" : "obs", inner = "";
    if (r === 3 && c === 5) { cls = "air"; inner = `<div class="ac-hole"></div><div class="ac-trap" id="acTrap" data-tip="Эндер-Люк" data-tip-info="рукой хозяина"></div>`; }
    if (c === 2 && (r === 1 || r === 2)) cls = "air";
    if (r === 1 && c === 2) inner = `<div class="ac-door" id="acDoor" data-tip="Эндер-дверь" data-tip-info="клик: рукой"><i></i></div>`;
    if (r === 2 && c === 2) inner = `<div class="ac-plate" id="acPlate"></div><div class="ac-ent" id="acEnt"></div>`;
    if (r === 0 && c === 2) inner = `<div class="ac-lever" id="acLever" data-tip="Рычаг на блоке над дверью" data-tip-info="обычный редстоун"></div>`;
    if (r === 2 && c === 1) { cls = "air"; inner = `<div class="ac-fbtn" id="acForBtn" style="filter:hue-rotate(160deg) saturate(1.4)" data-tip="Эндер-кнопка чужака" data-tip-info="вплотную, но хозяин другой"></div><span class="ac-tag no" >чужая</span>`; }
    if (r === 2 && c === 3) { cls = "air"; inner = `<div class="ac-fbtn" id="acFBtn" data-tip="Своя эндер-кнопка на полу" data-tip-info="вплотную к двери"></div><span class="ac-tag ok">своя, вплотную</span>`; }
    if (r === 2 && c === 4) inner = `<div class="ac-wbtn ender" id="acWBtn" data-tip="Своя эндер-кнопка на стене" data-tip-info="по диагонали от двери"></div>`;
    if ((r === 1 || r === 2) && c === 5) cls = "air";
    if (r === 2 && c === 6) inner = `<div class="ac-lever" id="acTLever" data-tip="Рычаг у люка" data-tip-info="люк его не слышит"></div>`;
    cells.push(`<div class="ac-c ${cls}" style="grid-row:${r + 1};grid-column:${c + 1}">${inner}</div>`);
  }
  acWall.innerHTML = cells.join("");
  const ENTS = [{ k: "owner", name: "Хозяин", icon: "v:steve_face" }, { k: "intruder", name: "Чужак", icon: "v:alex_face" }, { k: "zombie", name: "Зомби", icon: "v:zombie_face" }, { k: "arrow", name: "Стрела", icon: "v:arrow" }, { k: "item", name: "Алмаз", icon: "v:diamond" }, { k: null, name: "Никого", icon: "" }];
  $("#acStep").innerHTML = ENTS.map((x) => `<button type="button" class="chip" data-ent="${x.k}" aria-pressed="${x.k === null}">${x.icon ? img(x.icon) : ""}${x.name}</button>`).join("");
  const SRC = [{ k: "fbtn", name: "Своя кнопка на полу", ok: true }, { k: "wbtn", name: "Своя кнопка на стене" }, { k: "forbtn", name: "Чужая эндер-кнопка" }, { k: "lever", name: "Рычаг над дверью" }, { k: "tlever", name: "Рычаг у люка" }];
  $("#acSrc").innerHTML = SRC.map((x) => `<button type="button" class="chip" data-src="${x.k}">${x.name}</button>`).join("");
  const log = (html, cls = "") => { const l = $("#acLog"); const p = document.createElement("p"); p.className = cls; p.innerHTML = html; l.prepend(p); while (l.children.length > 8) l.lastChild.remove(); };
  log("Дверь закрыта. Жми по кнопкам, рычагам и двери, ставь кого-нибудь на плиту.");
  // hasAuthorizedControlSignal: соседи двери по 6 сторонам, только EnderButton/EnderPressurePlate того же хозяина с сигналом > 0
  const authorized = () => AC.fbtn > 0 || AC.plate === "owner";
  function acDoor(open, why) {
    if (AC.open === open) return false;
    AC.open = open; $("#acDoor").classList.toggle("open", open); play(open ? "door_open" : "door_close", 0.7, 0.9 + Math.random() * 0.1); renderSig(); return true;
  }
  // neighborChanged: если сигнал хозяина не совпадает с состоянием, дверь подстраивается
  function neighbor(src) {
    const a = authorized();
    if (a !== AC.open) { acDoor(a); return a ? "open" : "close"; }
    return null;
  }
  function renderSig() { const s = $("#acSig"); const a = authorized(); s.classList.toggle("on", a); s.innerHTML = `<i></i>сигнал хозяина у двери: ${a ? 15 : 0} · дверь ${AC.open ? "открыта" : "закрыта"}`; }
  renderSig();
  function press(k, el, ms = 1000) {
    AC[k] = (AC[k] || 0) + 1; el.classList.add("on"); play("click", 0.6, 0.6);
    const r = neighbor(k);
    setTimeout(() => { AC[k]--; if (!AC[k]) el.classList.remove("on"); play("click", 0.6, 0.5); neighbor(k); }, ms);
    return r;
  }
  acWall.addEventListener("click", (e) => {
    const t = e.target.closest("[id]"); if (!t) return;
    if (t.id === "acDoor") {
      if (!isOwner()) { const d = $("#acDoor"); d.classList.remove("deny"); void d.offsetWidth; d.classList.add("deny"); bar($("#acBar"), P.msg.door.text, P.msg.door.color); log("<b>Чужак</b> дёрнул дверь: отказ, InteractionResult.FAIL.", "no"); return; }
      acDoor(!AC.open); log(`<b>Хозяин</b> ${AC.open ? "открыл" : "закрыл"} дверь рукой. У ванильной железной двери так нельзя.`, "ok");
    }
    if (t.id === "acFBtn") srcAct("fbtn"); if (t.id === "acWBtn") srcAct("wbtn"); if (t.id === "acForBtn") srcAct("forbtn"); if (t.id === "acLever") srcAct("lever"); if (t.id === "acTLever") srcAct("tlever");
    if (t.id === "acTrap") {
      if (!isOwner()) { bar($("#acBar"), P.msg.trapdoor.text, P.msg.trapdoor.color); log("<b>Чужак</b> полез в люк: отказ.", "no"); return; }
      AC.trap = !AC.trap; $("#acTrap").classList.toggle("open", AC.trap); play(AC.trap ? "trap_open" : "trap_close", 0.7);
      log(`<b>Хозяин</b> ${AC.trap ? "открыл" : "закрыл"} люк рукой. Звук деревянного люка: по материалу он камень.`, "ok");
    }
  });
  function srcAct(k) {
    if (k === "fbtn") {
      if (!isOwner()) { bar($("#acBar"), P.msg.button.text, P.msg.button.color); log("<b>Чужак</b> жмёт кнопку хозяина: «Эта кнопка подчиняется только хозяину!»", "no"); return; }
      const r = press("fbtn", $("#acFBtn"));
      log(r === "open" ? "Своя эндер-кнопка вплотную к двери: сигнал 15, хозяин совпал, <b>дверь открылась</b> на секунду." : "Своя кнопка нажата, дверь и так открыта. Через секунду сигнал пропадёт, и дверь <b>закроется</b>.", "ok");
    }
    if (k === "wbtn") {
      if (!isOwner()) { bar($("#acBar"), P.msg.button.text, P.msg.button.color); log("<b>Чужак</b> жмёт кнопку хозяина: отказ.", "no"); return; }
      $("#acWBtn").classList.add("on"); play("click", 0.6, 0.6); setTimeout(() => { $("#acWBtn").classList.remove("on"); play("click", 0.6, 0.5); }, 1000);
      log("Своя кнопка, но <b>на стене</b>: она стоит по диагонали от двери, а дверь проверяет только 6 соседей. Сигнал не дошёл, <b>ничего не произошло</b>.", "no");
    }
    if (k === "forbtn") {
      const r = press("forbtn", $("#acForBtn"));
      log(r === "close" ? "Эндер-кнопка <b>чужого хозяина</b> вплотную: сигнал есть, но хозяин не тот. Зато сосед обновился, и открытая дверь <b>захлопнулась</b>." : "Эндер-кнопка <b>чужого хозяина</b>: владелец не совпал, дверь не открылась.", "no");
    }
    if (k === "lever") {
      AC.lever = !AC.lever; $("#acLever").classList.toggle("on", AC.lever); play("click", 0.6, AC.lever ? 0.6 : 0.5);
      const r = neighbor("lever");
      log(r === "close" ? "Рычаг над дверью не открывает её, но дёргает соседей: открытая рукой дверь пересчитала сигнал хозяина (0) и <b>закрылась</b>." : `Обычный рычаг ${AC.lever ? "включён" : "выключен"}: дверь <b>не реагирует</b>, это не эндер-блок.`, "no");
    }
    if (k === "tlever") {
      AC.tlever = !AC.tlever; $("#acTLever").classList.toggle("on", AC.tlever); play("click", 0.6, AC.tlever ? 0.6 : 0.5);
      log("Рычаг у люка: у Эндер-люка neighborChanged пустой, редстоун он <b>не слышит вообще</b>.", "no");
    }
  }
  $("#acSrc").addEventListener("click", (e) => { const b = e.target.closest("[data-src]"); if (b) srcAct(b.dataset.src); });
  $("#acStep").addEventListener("click", (e) => {
    const b = e.target.closest("[data-ent]"); if (!b) return;
    const k = b.dataset.ent === "null" ? null : b.dataset.ent;
    $$("[data-ent]").forEach((x) => x.setAttribute("aria-pressed", x === b));
    const was = AC.plate === "owner"; AC.plate = k;
    const ent = ENTS.find((x) => x.k === k), el = $("#acEnt");
    el.innerHTML = k ? img(ent.icon) : ""; el.classList.remove("fly"); void el.offsetWidth; if (k) el.classList.add("fly");
    const now = AC.plate === "owner";
    $("#acPlate").classList.toggle("on", now);
    if (now !== was) { play("click", 0.5, now ? 0.6 : 0.5); neighbor("plate"); }
    if (k === "owner") log("<b>Хозяин</b> на плите: сигнал 15, дверь открыта, пока он стоит в зоне 2×2 блока.", "ok");
    else if (k) log(`${esc(ent.name)} на плите: плита считает только хозяина, <b>сигнал 0</b>.`, "no");
    else log(was ? "Хозяин ушёл с плиты: сигнал пропал, дверь закрылась." : "На плите никого.");
  });

  /* ================= 07.6 КРАШ-ТЕСТ ================= */
  // Explosion: луч силой P·(0,7..1,3) теряет на блоке (сопротивление + 0,3)·0,3; блок ломается, если сила осталась
  const WALL = [
    ...P.vanilla.map((v) => ({ ...v, mod: false })),
    ...P.blocks.map((b) => ({ name: b.name, icon: sceneIcon(b), hard: b.hard, res: b.res, mod: true })),
  ].sort((a, b) => a.res - b.res);
  const BSRC = [
    { name: "Огненный шар", p: 1, icon: "v:fire_charge" }, { name: "Крипер", p: 3, icon: "v:creeper_face" }, { name: "ТНТ", p: 4, icon: "iso:tnt" },
    { name: "Заряженный крипер", p: 6, icon: "v:creeper_face", charged: true }, { name: "Кристалл Энда", p: 6, icon: "v:end_crystal" }, { name: "Визер", p: 7, icon: "v:nether_star" },
  ];
  const PMAX = 300, toP = (v) => Math.exp((v / 1000) * Math.log(PMAX)), toV = (p) => (Math.log(p) / Math.log(PMAX)) * 1000;
  const need = (res) => ((res + 0.3) * 0.3) / 1.3;                     // с какой силы блок вообще может сломаться
  const chance = (res, p) => clamp(1 - ((res + 0.3) * 0.3 / p - 0.7) / 0.6, 0, 1);
  let power = 4, srcSel = 2;
  $("#blSrc").innerHTML = BSRC.map((x, i) => `<button type="button" class="bl-s ${x.charged ? "charged" : ""}" data-s="${i}" aria-pressed="${i === srcSel}">${img(x.icon)}<b>${x.name}</b><span>сила ${x.p}</span></button>`).join("");
  $("#blWall").innerHTML = WALL.map((w, i) => `<div class="bw ${w.mod ? "mod" : ""}" data-w="${i}">${img(w.icon)}<b>${esc(w.name)}</b><em class="vd"></em><span class="tn"></span></div>`).join("");
  const tnt = (res) => need(res) / 4;
  function renderBlast() {
    $("#blP").textContent = power < 10 ? fmt(power, 1) : Math.round(power);
    $("#blX").textContent = `= ${fmt(power / 4, power < 40 ? 1 : 0)} ТНТ`;
    let dead = 0, risk = 0, modHit = 0;
    $$(".bw").forEach((el) => {
      const w = WALL[+el.dataset.w], c = chance(w.res, power);
      el.classList.toggle("safe", c <= 0); el.classList.toggle("risk", c > 0 && c < 1); el.classList.toggle("dead", c >= 1);
      $(".vd", el).textContent = c >= 1 ? "РАЗНЕСЁТ" : c <= 0 ? "УСТОИТ" : `как повезёт · ${Math.round(c * 100)}%`;
      const t = tnt(w.res);
      $(".tn", el).textContent = c >= 1 ? "" : t < 1 ? "ломается даже слабее ТНТ" : `сломает взрыв в ${t < 10 ? fmt(t, 1) : Math.round(t)} ТНТ`;
      if (c >= 1) dead++; else if (c > 0) risk++;
      if (w.mod && c > 0) modHit++;
    });
    const src = BSRC.find((x) => x.p === power);
    $("#blSum").innerHTML = `<b>${src ? esc(src.name) : "Сила " + (power < 10 ? fmt(power, 1) : Math.round(power))}</b>: разнесёт <b class="r">${dead}</b>, ${risk ? `может снести ещё <b class="y">${risk}</b>, ` : ""}устоят <b class="g">${WALL.length - dead - risk}</b> из ${WALL.length}.
      <span>${modHit ? "Даже эндер-блоки начали сдаваться." : "Эндер-блоки целы. В ванилле нет взрыва, который их возьмёт: сейфу нужен взрыв в 35 раз сильнее ТНТ, стеклу и печи в 69."}</span>`;
  }
  function boom() {
    const r = $("#blWall").getBoundingClientRect();
    // частицы explosion как в игре: серые, разного размера и оттенка, 16 кадров
    for (let i = 0; i < 16; i++) setTimeout(() => {
      const fx = document.createElement("i"), sz = 48 + rnd(64), g = 0.55 + Math.random() * 0.45;
      fx.className = "bl-fx"; fx.style.width = fx.style.height = sz + "px"; fx.style.filter = `brightness(${g})`;
      fx.style.left = r.left + Math.random() * r.width + "px"; fx.style.top = Math.max(0, r.top) + Math.random() * Math.min(r.height, innerHeight - Math.max(0, r.top)) + "px";
      document.body.appendChild(fx); let f = 0; const t = setInterval(() => { fx.style.backgroundPosition = `${(f / 15) * 100}% 0`; if (++f > 15) { clearInterval(t); fx.remove(); } }, 30 + rnd(30));
    }, i * 35);
    play("explode", 0.8, 0.9 + Math.random() * 0.2);
    $$(".bw").forEach((el) => {
      const w = WALL[+el.dataset.w], hit = Math.random() < chance(w.res, power);
      el.classList.remove("boom", "shake"); void el.offsetWidth; el.classList.add(hit ? "boom" : "shake");
      if (hit) setTimeout(() => el.classList.remove("boom"), 1800);
    });
  }
  $("#blSrc").addEventListener("click", (e) => {
    const b = e.target.closest("[data-s]"); if (!b) return; srcSel = +b.dataset.s; power = BSRC[srcSel].p;
    $$("[data-s]", $("#blSrc")).forEach((x) => x.setAttribute("aria-pressed", x === b)); $("#blRange").value = toV(power);
    renderBlast(); boom();
  });
  $("#blRange").addEventListener("input", (e) => { power = toP(+e.target.value); $$("[data-s]", $("#blSrc")).forEach((x) => x.setAttribute("aria-pressed", "false")); renderBlast(); });
  $("#blRange").addEventListener("change", boom);
  $("#blRange").value = toV(power);
  renderBlast();

  /* ================= ДОСТИЖЕНИЯ ================= */
  $("#advBoard").style.setProperty("--tile", `url("${new URL(T("v/end_stone_bricks"), location.href).href}")`);
  const FRAME_RU = { task: "обычная", goal: "цель", challenge: "испытание" };
  const titleH = (a) => `<span style="color:${MC[a.color][0]};${a.bold ? "font-weight:700" : ""}">${esc(a.title)}</span>`;
  renderTree = function (pulse) {
    const vis = ADV.filter((a) => got.includes(a.key) || !a.hidden), hidden = ADV.length - vis.length;
    if (!advSel || !vis.some((a) => a.key === advSel)) advSel = vis.length ? vis[vis.length - 1].key : null;
    const icon = (a, px) => `<span class="ic" style="width:${px}px;height:${px}px"><img src="${src(a.icon)}" alt=""></span>`;
    let html = vis.map((a, i) => (i ? `<div class="adv-link on"></div>` : "") + `<button type="button" class="adv-node ${pulse === a.key ? "pulse" : ""} ${advSel === a.key ? "sel" : ""}" data-k="${a.key}" aria-label="${esc(a.title)}"><span class="adv-frame ${a.frame}"></span>${icon(a, 32)}</button>`).join("");
    if (hidden) html += vis.length ? `<div class="adv-link"></div><div class="adv-more">+${hidden} скрыто</div>` : `<div class="adv-node"><span class="adv-frame task locked"></span><span class="q">?</span></div><div class="adv-link"></div><div class="adv-more">+${hidden} скрыто</div>`;
    $("#advChain").innerHTML = html;
    const a = ADV.find((x) => x.key === advSel);
    $("#advDetail").innerHTML = a
      ? `<div class="big"><span class="adv-frame ${a.frame}"></span>${icon(a, 38)}</div><div class="txt"><div class="tt">${titleH(a)}</div><div class="dd">${esc(a.desc)}</div><div class="cc">${esc(a.how)}</div></div><div class="meta"><span>${FRAME_RU[a.frame]}</span>${a.xp ? `<span>+${a.xp} XP</span>` : ""}</div>`
      : `<div class="big"><span class="adv-frame task locked"></span><span class="q">?</span></div><div class="txt"><div class="tt">Всё скрыто</div><div class="dd">Одна за сбор всех семи блоков, две за неудачный взлом. Попробуй забрать результаты из рецептов или стань чужаком и полезь в сейф.</div></div>`;
    $("#advList").innerHTML = ADV.map((a) => got.includes(a.key)
      ? `<button type="button" class="adv-row has" data-k="${a.key}"><span class="fr"><span class="adv-frame ${a.frame}"></span>${icon(a, 26)}</span><span><span class="t">${titleH(a)}</span><span class="d">${esc(a.desc)}</span></span></button>`
      : `<div class="adv-row locked mystery"><span class="fr"><span class="adv-frame task locked"></span><span class="q">?</span></span><span><span class="t">???</span><span class="d">скрытое достижение: откроется, когда получишь</span></span></div>`).join("");
    const done = ADV.filter((x) => got.includes(x.key));
    $("#advBar").style.width = (done.length / ADV.length) * 100 + "%";
    $("#advTxt").textContent = `${done.length} / ${ADV.length}`;
  };
  renderTree();
  $("#advQ").textContent = ADV.length + " " + plural(ADV.length, "ачивка", "ачивки", "ачивок");
  const pickAdv = (e) => { const n = e.target.closest("[data-k]"); if (!n) return; advSel = n.dataset.k; renderTree(); };
  $("#advChain").addEventListener("click", pickAdv);
  $("#advList").addEventListener("click", pickAdv);
  $("#advReset").addEventListener("click", () => { got = []; S.set("p07.adv", got); have = new Set(); S.set("p07.have", []); syncHave(); advSel = null; renderTree(); });

  /* ================= ХРОНОЛОГИЯ ================= */
  const HI = [["iso:ender_safe", "#a855f7"], ["iso:reinforced_ender_glass", "#5fb8a0"]];
  $("#timeline").innerHTML = P.history.map((h, i) => `<div class="tl7-i" style="--c:${HI[i][1]}"><div class="tl7-ic">${img(HI[i][0])}</div>
    <div><div class="tl7-top"><span class="tl7-v">${esc(h.ver)}</span><span class="tl7-d">${esc(h.date)}</span><span class="tl7-t">${esc(h.tag)}</span></div><b>${esc(h.title)}</b><p>${esc(h.text)}</p></div></div>`).join("");

  /* ================= ФИНАЛ ================= */
  $("#finEye").addEventListener("click", (e) => {
    const el = e.currentTarget; if (el.classList.contains("fly")) return;
    el.classList.add("fly"); play("eye", 0.7);
    setTimeout(() => { el.classList.remove("fly"); }, 1600);
  });
  const nav = ZM.pointNav(7);
  $("#finNav").innerHTML = [nav.prev && `<a href="${U(nav.prev.href)}">← №${String(nav.prev.n).padStart(2, "0")} ${esc(nav.prev.title)}</a>`,
    `<a href="${U("index.html")}">Все пункты</a>`,
    nav.next && `<a href="${U(nav.next.href)}">№${String(nav.next.n).padStart(2, "0")} ${esc(nav.next.title)} →</a>`].filter(Boolean).join("");

  ZM.reveal();
  ZM.p07 = { F, AC, setWho, punish, get who() { return who; } };
})();
