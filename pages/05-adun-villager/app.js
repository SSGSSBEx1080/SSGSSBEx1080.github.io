/* =====================================================================
   №05 · Житель-Даун — «земляная биржа»
   ===================================================================== */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = ZM.esc, U = ZM.url, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (n) => Math.floor(Math.random() * n), pick = (a) => a[rnd(a.length)];
  const P = ZM.P05, M = ZM.P05M;
  const V = (n) => U(`assets/textures/p5/vanilla/${n}.png`);
const ISO = (n) => U(`assets/textures/p5/iso/${n}.png`);
  const EGG_IC = U("assets/textures/p5/icons/adun_egg.png");
  const ITEM = { dirt: U("assets/textures/p5/iso/dirt.png"), emerald: V("emerald") };
  const NAME = { dirt: "Земля", emerald: "Изумруд" };
  const img = (src, cls = "") => `<img class="px ${cls}" src="${src}" alt="" draggable="false">`;
  const fmt = (v) => String(v).replace(".", ",");
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };

  ZM.topbar({ crumb: "№05 · Житель-Даун", ...ZM.pointNav(5) });

  /* ================= звук ================= */
  const EXT = new Audio().canPlayType("audio/ogg; codecs=vorbis") ? "ogg" : "mp3";
  const MASTER_VOLUME = 0.4;
  let sndOn = ZM.store.get("p05.snd", true);
  let touched = false;   // браузер не даст играть звук до первого клика
  addEventListener("pointerdown", () => { touched = true; }, { once: true, capture: true });
  const pool = {};
  function play(url, vol = 1, rate = 1) {
    if (!sndOn) return null;
    try {
      const a = (pool[url] || (pool[url] = new Audio(url))).cloneNode();
      a.volume = clamp(vol * MASTER_VOLUME, 0, 1); a.playbackRate = rate; a.preservesPitch = false;
      a.play().catch(() => {});
      return a;
    } catch (e) { return null; }
  }
  const sfx = (name, vol = 1, rate = 1) => play(U(`assets/sounds/p05/vanilla/${name}.${EXT}`), vol, rate);
  // свои звуки из ModSounds: если файла нет, играет ванильный запасной
  const own = {};
  function probe(key) {
    const url = U("assets/sounds/p05/" + P.SOUNDS[key].files[0].replace(/\.ogg$/, "." + EXT));
    return new Promise((res) => {
      const a = new Audio(); let done = false;
      const fin = (ok) => { if (!done) { done = true; res(ok); } };
      a.addEventListener("loadedmetadata", () => fin(true)); a.addEventListener("error", () => fin(false));
      a.preload = "metadata"; a.src = url; setTimeout(() => fin(false), 5000);
    });
  }
  const voicePitch = () => (Math.random() - Math.random()) * 0.2 + 1;   // как у мобов в игре
  function voice(key, vol = 1, idx) {
    const s = P.SOUNDS[key];
    const f = idx != null ? s.files[idx] : pick(s.files);
    const url = own[key] ? U("assets/sounds/p05/" + f.replace(/\.ogg$/, "." + EXT)) : U(`assets/sounds/p05/${pick(s.fallback)}.${EXT}`);
    const a = play(url, vol, voicePitch());
    document.dispatchEvent(new CustomEvent("adun-voice", { detail: { key, a } }));
    return a;
  }
  const soundReady = Promise.all(Object.keys(P.SOUNDS).map((k) => probe(k).then((ok) => { own[k] = ok; })));
  const bSnd = $("#sndBtn");
  const syncSnd = () => { bSnd.setAttribute("aria-pressed", sndOn); bSnd.classList.toggle("on", sndOn); };
  bSnd.onclick = () => { sndOn = !sndOn; ZM.store.set("p05.snd", sndOn); syncSnd(); if (sndOn) sfx("click", 0.6); };
  ZM.sfx.bind(() => sndOn);   // общие звуки Minecraft (клики, тосты) слушаются кнопки звука страницы
  syncSnd();

  /* ================= ачивки (json ещё нет: ветка готова, узлы появятся из P.advancements) ================= */
  const ADV = P.advancements;
  let got = ZM.store.get("p05.adv", []).filter((k) => ADV.some((a) => a.key === k));
  let advSel = null, renderTree = () => {};
  function grantByTrigger(trigger) {
    ADV.filter((a) => a.trigger === trigger && !got.includes(a.key)).forEach((a) => {
      got.push(a.key); ZM.store.set("p05.adv", got);
      ZM.toast({ iconHtml: img(a.icon ? U(a.icon) : EGG_IC), title: a.title, frame: a.frame, head: a.frame === "challenge" ? "Испытание завершено!" : a.frame === "goal" ? "Цель достигнута!" : "Получено достижение!" });
      sfx(a.frame === "challenge" ? "levelup" : "orb", 0.6); advSel = a.key; renderTree(a.key);
      chat(`<span class="w">Ты</span> получил достижение <span class="adv-g">[${esc(a.title)}]</span>`);   // announce_to_chat
    });
  }

  /* ================= фон: график DIRT/EMR ================= */
  (function chart() {
    const cv = $("#chartCv"), g = cv.getContext("2d");
    let W, H, dpr, candles = [], price = 52, t = 0;
    function size() {
      dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px"; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.ceil(W / 14) + 4;
      while (candles.length < n) candles.push(next());
    }
    function next() {
      const o = price;
      // курс «земля за изумруд» то и дело обваливается до 1: вторая сделка продаёт землю по 1
      if (Math.random() < 0.06) price = Math.random() < 0.5 ? 1 + Math.random() * 4 : 52;
      else price = clamp(price + (Math.random() - 0.5) * 9, 1, 64);
      const hi = Math.max(o, price) + Math.random() * 5, lo = Math.min(o, price) - Math.random() * 5;
      return { o, c: price, hi, lo };
    }
    size(); addEventListener("resize", size);
    let last = 0, vis = true;
    document.addEventListener("visibilitychange", () => { vis = !document.hidden; });
    (function loop(ts) {
      requestAnimationFrame(loop);
      if (!vis || ts - last < 50) return; last = ts; t += 0.05;
      const off = (t * 14 / 1.6) % 14;
      if (off < 0.5 && t > 0.1) { candles.shift(); candles.push(next()); }
      g.clearRect(0, 0, W, H);
      const y = (v) => H * 0.86 - (v / 64) * H * 0.62;
      g.strokeStyle = "rgba(255,255,255,.035)"; g.lineWidth = 1;
      for (let v = 0; v <= 64; v += 8) { g.beginPath(); g.moveTo(0, y(v) + 0.5); g.lineTo(W, y(v) + 0.5); g.stroke(); }
      candles.forEach((c, i) => {
        const x = i * 14 - off, up = c.c >= c.o;
        g.strokeStyle = g.fillStyle = up ? "rgba(23,221,98,.16)" : "rgba(255,70,70,.14)";
        g.beginPath(); g.moveTo(x + 5, y(c.hi)); g.lineTo(x + 5, y(c.lo)); g.stroke();
        g.fillRect(x + 1, y(Math.max(c.o, c.c)), 8, Math.max(2, Math.abs(y(c.o) - y(c.c))));
      });
    })(0);
  })();

  /* ================= бегущая строка ================= */
  (function ticker() {
    const items = [
      ["DIRT/EMR", "52 : 1", "▼", "dn"], ["EMR/DIRT", "1 : 1", "▲", "up"], ["СПРЕД", "5100%", "▲", "up"],
      ["ОБЪЁМ", "3 сделки за жизнь", "▬", ""], ["ОПЫТ ЖИТЕЛЯ", "0 XP", "▬", ""], ["ПРОФЕССИЯ", "нет", "▼", "dn"],
      ["УРОВЕНЬ", "1 / 1", "▬", ""], ["HP", "20", "▬", ""], ["ДЕСПАВН", "никогда", "▲", "up"], ["ПЛОТНОСТЬ", "1 на 129×129", "▬", ""],
      ["РАЗМНОЖЕНИЕ", "0", "▼", "dn"], ["ШАНС СПАВНА", "1/10", "▼", "dn"],
    ];
    const one = items.map(([k, v, a, c]) => `<span class="ti"><b>${k}</b> ${v} <i class="${c}">${a}</i></span>`).join("");
    $("#tick").innerHTML = one + one;
  })();

  /* ================= 3D ================= */
  const USE_GL = window.ZMGL && ZMGL.supported();
  function cssModel(json, base, opt) {
    const m = ZMModel3D.build(json, base, opt);
    m.setRot = (ops) => { m.rig.style.transform = ops.map(([a, d]) => `rotate${a.toUpperCase()}(${d}deg)`).join(" "); };
    m.destroy = () => {};
    return m;
  }
  function make3d(json, base, opt) {
    if (!USE_GL) return cssModel(json, base, opt);
    const h = {};
    const g = ZMGL.build(json, base, Object.assign({}, opt, { onFail: () => {
      const m = cssModel(json, base, opt), old = h.cur.el;
      h.cur = m; h.el = m.el; if (old.parentNode) old.parentNode.replaceChild(m.el, old);
      if (h.ops) m.setRot(h.ops);
    } }));
    if (!g) return cssModel(json, base, opt);
    h.cur = g; h.el = g.el;
    h.setRot = (ops) => { h.ops = ops; h.cur.setRot(ops); };
    h.destroy = () => h.cur.destroy();
    return h;
  }
  function spinner(stage, opt) {   // ЛКМ-вращение без контекстного меню и нативного drag
    const r = { y: opt.y, x: opt.x, vy: 0, drag: null, idle: 0, moved: 0 };
    for (const ev of ["contextmenu", "dragstart", "selectstart"]) stage.addEventListener(ev, (e) => e.preventDefault());
    stage.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse") e.preventDefault();
      r.drag = { x: e.clientX, y: e.clientY, ry: r.y, rx: r.x, b: e.button }; r.vy = 0; r.moved = 0;
      try { stage.setPointerCapture(e.pointerId); } catch (er) {}
    });
    stage.addEventListener("pointermove", (e) => {
      if (!r.drag) return;
      r.moved = Math.max(r.moved, Math.hypot(e.clientX - r.drag.x, e.clientY - r.drag.y));
      if (r.moved < 5) return;
      const ny = r.drag.ry + (e.clientX - r.drag.x) * 0.5;
      r.vy = ny - r.y; r.y = ny; r.x = clamp(r.drag.rx - (e.clientY - r.drag.y) * 0.4, -70, 70); r.idle = 0;
    });
    const end = (e) => { if (!r.drag) return; const d = r.drag; r.drag = null; if (r.moved < 5 && opt.onClick && e.type === "pointerup") opt.onClick(d.b, e); };
    stage.addEventListener("pointerup", end); stage.addEventListener("pointercancel", end);
    return r;
  }

  /* ================= HERO ================= */
  const stage = $("#heroStage");
  let vil = null;
  function buildVil() {
    const w = $("#hsModel").clientWidth || 300, h = $("#hsModel").clientHeight || 400;
    const unit = clamp(Math.min(w / 22, h / 36), 6, 26);
    if (vil) vil.destroy();
    vil = make3d(M.villager, U("assets/textures/p5/models/"), { unit, cls: "vil", persp: 1500 });
    $("#hsModel").innerHTML = ""; $("#hsModel").appendChild(vil.el);
  }
  buildVil();
  $("#hsPh").hidden = !M.info.placeholder;
  let rw = innerWidth; addEventListener("resize", () => { if (Math.abs(innerWidth - rw) > 40) { rw = innerWidth; buildVil(); } });

  stage.style.setProperty("--icons", `url("${new URL(V("icons"), location.href).href}")`);
  const hp = { v: P.stats.hp, dead: false, inv: 0 };
  let kills = ZM.store.get("p05.kills", 0);
  const WEAPON = { n: "Железный меч", dmg: 6, ic: V("iron_sword") };
  function drawHp() {   // сердечки из icons.png, как над мобами в модах-хелсбарах
    let s = "";
    for (let i = 0; i < 10; i++) {
      const v = hp.v - i * 2;
      s += `<i class="ht ${v >= 2 ? "f" : v === 1 ? "h" : ""}"></i>`;
    }
    $("#hsHp").innerHTML = s + `<b>${hp.v} / ${P.stats.hp}</b>`;
  }
  drawHp();
  const drawKills = () => { $("#hsKills").innerHTML = `${img(WEAPON.ic)}<span>убито: <b>${kills}</b></span>`; };
  drawKills();

  function chat(html, cls = "") {
    const c = $("#chat"), line = document.createElement("div");
    line.className = "cl " + cls; line.innerHTML = html; c.appendChild(line);
    while (c.children.length > 5) c.firstChild.remove();
    setTimeout(() => line.classList.add("old"), 7000);
  }
  function say(text) {
    const b = $("#hsSay"); b.innerHTML = text; b.classList.remove("on"); void b.offsetWidth; b.classList.add("on");
    clearTimeout(say.t); say.t = setTimeout(() => b.classList.remove("on"), 1800);
  }
  function hit() {
    if (hp.dead) return;
    const now = performance.now();
    if (now < hp.inv) return;   // 10 тиков неуязвимости после удара
    hp.inv = now + 500;
    hp.v = Math.max(0, hp.v - WEAPON.dmg);
    drawHp();
    sfx("strong", 0.5);
    stage.classList.remove("hurt"); void stage.offsetWidth; stage.classList.add("hurt");
    rot.kick = 1;
    if (hp.v <= 0) return die();
    voice("hurt");
  }
  function die() {
    hp.dead = true; voice("death");
    stage.classList.add("dying");
    kills++; ZM.store.set("p05.kills", kills); drawKills();
    chat(`<span class="w">Житель-Даун</span> был убит игроком <span class="w">Ты</span>`);
    setTimeout(() => {
      poof(); stage.classList.add("gone");
      grantByTrigger("kill_adun");
    }, 1000);
    setTimeout(() => {   // новый из яйца
      stage.classList.remove("dying", "gone", "hurt"); hp.v = P.stats.hp; hp.dead = false; drawHp(); poof(true); sfx("pop", 0.5);
      chat(`${img(EGG_IC, "ci")} новый Житель-Даун вылупился из яйца`, "sys");
    }, 3600);
  }
  function poof(small) {
    const p = $("#hsPoof"); p.innerHTML = "";
    for (let i = 0; i < (small ? 10 : 20); i++) {
      const d = document.createElement("i");
      d.style.cssText = `--dx:${(Math.random() - 0.5) * 180}px;--dy:${-40 - Math.random() * 140}px;--s:${0.6 + Math.random()}` + `;left:${40 + Math.random() * 20}%;top:${40 + Math.random() * 35}%;animation-delay:${Math.random() * 0.15}s`;
      p.appendChild(d);
    }
  }
  const rot = spinner(stage, { y: 200, x: -8, onClick: (b) => { if (b === 2) openShop(); else hit(); } });
  rot.kick = 0;
  const bTrade = $("#hsTrade");
  for (const ev of ["pointerdown", "pointerup"]) bTrade.addEventListener(ev, (e) => e.stopPropagation());
  bTrade.addEventListener("click", () => openShop());
  function openShop() { sfx("click", 0.5); voice("trade", 0.8); grantByTrigger("find_adun"); $("#shop").scrollIntoView({ behavior: "smooth", block: "start" }); }
  // «смотреть на игрока»: пока курсор рядом, житель поворачивается к нему
  const look = { x: 0, y: 0, on: false };
  $("#hero").addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const r = stage.getBoundingClientRect();
    look.x = clamp((e.clientX - (r.left + r.width / 2)) / r.width, -1.2, 1.2);
    look.y = clamp((e.clientY - (r.top + r.height * 0.25)) / r.height, -1, 1);
    look.on = true;
  });
  $("#hero").addEventListener("pointerleave", () => { look.on = false; });
  let heroVis = true;
  new IntersectionObserver((en) => { heroVis = en[0].isIntersecting; }).observe(stage);
  let t0 = 0;
  (function spin(ts) {
    requestAnimationFrame(spin);
    if (!heroVis || !vil) return;
    t0 = ts / 1000;
    if (!rot.drag) {
      rot.idle++;
      if (Math.abs(rot.vy) > 0.05) { rot.y += rot.vy; rot.vy *= 0.93; }
      else if (rot.idle > 60) {
        // свободная голова: смотрит на курсор, иначе оглядывается по сторонам
        const ty = look.on ? 180 - look.x * 55 : 190 + Math.sin(t0 * 0.5) * 35;
        const tx = look.on ? clamp(-8 - look.y * 18, -30, 15) : -8;
        let dy = ((ty - rot.y) % 360 + 540) % 360 - 180;
        rot.y += dy * 0.05; rot.x += (tx - rot.x) * 0.05;
      }
    }
    rot.kick *= 0.85;
    vil.setRot([["x", rot.x + rot.kick * 8], ["y", rot.y]]);
  })(0);
  // фоновый голос, пока житель на экране
  (function ambient() {
    setTimeout(ambient, 9000 + Math.random() * 9000);
    if (!heroVis || hp.dead || !touched || document.hidden) return;
    voice("ambient", 0.7); say("♪");
  })();

  $("#heroStats").innerHTML = [
    ["20", "здоровье"], ["0", "опыт за сделки"], ["1/10", "шанс спавна"], ["∞", "живёт"],
  ].map(([v, k]) => `<div class="st5"><b>${v}</b><span>${k}</span></div>`).join("");

  /* ================= ДОСЬЕ ================= */
  const S = P.stats;
  $("#dosCard").innerHTML = `
    <div class="dc-top"><span>ПАСПОРТ ЖИТЕЛЯ</span><span>ZITRAKSMODE · №05</span></div>
    <div class="dc-body">
      <div class="dc-photo">${img(U("assets/textures/p5/icons/adun_villager.png"))}<span>фото на паспорт</span></div>
      <dl class="dc-f">
        <dt>Имя</dt><dd>Житель-Даун</dd>
        <dt>ID</dt><dd><code>${esc(P.id)}</code></dd>
        <dt>Профессия</dt><dd class="red">нет и не будет</dd>
        <dt>Уровень</dt><dd>Новичок, навсегда</dd>
        <dt>Здоровье</dt><dd>${S.hp} <small>(10 сердец)</small></dd>
        <dt>Скорость</dt><dd>${fmt(S.speed)} <small>(бродит на 0,7 от неё)</small></dd>
        <dt>Видит на</dt><dd>${S.follow} блока</dd>
        <dt>Рост</dt><dd>${fmt(S.scale)} от жителя <small>(на 1/16 ниже)</small></dd>
      </dl>
    </div>
    <div class="dc-mrz">P&lt;ZM&lt;&lt;ADUN&lt;VILLAGER&lt;&lt;&lt;&lt;52DIRT&lt;1EMR&lt;&lt;&lt;&lt;&lt;&lt;&lt;<br>ZITRAKSMODE&lt;&lt;05&lt;&lt;081125&lt;&lt;NONE&lt;LVL1&lt;XP0&lt;&lt;&lt;&lt;</div>`;
  $("#goals").innerHTML = P.goals.map((g) => `<li><b>${g.p}</b><span>${esc(g.n)}<small>${esc(g.d)}</small></span></li>`).join("");
  const NOPE = [
    [ISO("lectern"), "Профессия", "код держит «без профессии» каждый тик"],
    [V("golden_carrot"), "Размножение", "морковь и золотое яблоко не берёт, любовь сбрасывается"],
    [V("emerald"), "Опыт за сделки", "торгуй сколько хочешь: уровень не растёт"],
    [V("name_tag"), "Исчезновение", "не деспавнится, даже если уйти далеко"],
    [V("rotten_flesh"), "Роль мишени", "враждебные мобы не считают его врагом"],
  ];
  $("#nope").innerHTML = NOPE.map(([ic, n, d]) => `<div class="np"><span class="np-ic">${img(ic)}<i></i></span><span><b>${n}</b><small>${d}</small></span></div>`).join("");
  // иконки как в инвентаре: блоки отрендерены из ванильных моделей (tools/mc_icon.py), котёл и стойка — предметы
  const JOBS = [[ISO("composter"), "Компостер"], [ISO("lectern"), "Кафедра"], [ISO("barrel"), "Бочка"], [ISO("smoker"), "Коптильня"], [ISO("blast_furnace"), "Плавильня"],
    [ISO("cartography_table"), "Стол картографа"], [ISO("fletching_table"), "Стол лучника"], [ISO("smithing_table"), "Стол кузнеца"], [ISO("loom"), "Ткацкий станок"],
    [ISO("stonecutter"), "Камнерез"], [ISO("grindstone"), "Точило"], [V("cauldron"), "Котёл"], [V("brewing_stand"), "Варочная стойка"]];
  $("#jobs").innerHTML = JOBS.map(([src, n], i) => `<button type="button" class="job" style="--d:${i * 0.04}s" title="${n}">${img(src)}<i></i><span>${n}</span></button>`).join("");
  $("#jobs").addEventListener("click", (e) => {
    const b = e.target.closest(".job"); if (!b) return;
    b.classList.remove("no"); void b.offsetWidth; b.classList.add("no"); sfx("no1", 0.6, voicePitch());
  });

  /* ================= ЛАВКА ================= */
  const gui = $("#gui");
  gui.style.setProperty("--tex", `url("${new URL(V("villager2"), location.href).href}")`);
  gui.style.setProperty("--wid", `url("${new URL(U("assets/textures/p5/vanilla/widgets.png"), location.href).href}")`);
  const START = () => {
    const inv = Array(36).fill(null);
    inv[27] = { id: "dirt", n: 64 }; inv[28] = { id: "dirt", n: 64 }; inv[29] = { id: "dirt", n: 64 }; inv[30] = { id: "dirt", n: 12 }; inv[31] = { id: "emerald", n: 3 };
    return { inv, uses: [0, 0], slots: [null, null], sel: -1, hero: 0, log: { sold: 0, bought: 0, gotEm: 0, spentEm: 0 } };
  };
  let shop = ZM.store.get("p05.shop", null);
  if (!shop || !shop.inv || shop.inv.length !== 36) shop = START();
  const saveShop = () => ZM.store.set("p05.shop", shop);
  const count = (id) => shop.inv.reduce((s, x) => s + (x && x.id === id ? x.n : 0), 0);
  function take(id, n) {   // снять n предметов из инвентаря
    for (let i = 35; i >= 0 && n > 0; i--) { const x = shop.inv[i]; if (x && x.id === id) { const k = Math.min(n, x.n); x.n -= k; n -= k; if (!x.n) shop.inv[i] = null; } }
  }
  function give(id, n) {   // положить, как в игре: сначала досыпаем стаки, потом хотбар, потом рюкзак
    const order = [...Array(9).keys()].map((i) => 27 + i).concat([...Array(27).keys()]);
    for (const i of order) { const x = shop.inv[i]; if (n > 0 && x && x.id === id && x.n < 64) { const k = Math.min(64 - x.n, n); x.n += k; n -= k; } }
    for (const i of order) { if (n > 0 && !shop.inv[i]) { const k = Math.min(64, n); shop.inv[i] = { id, n: k }; n -= k; } }
    return n;
  }
  // цена с учётом «Героя деревни»: floor((0.3 + 0.0625·ур) · база), минимум 1; спрос и репутация = 0 (множитель 0)
  function cost(t) {
    const base = t.buy[1];
    if (!shop.hero) return base;
    const k = Math.floor((0.3 + 0.0625 * (shop.hero - 1)) * base);
    return clamp(base - Math.max(k, 1), 1, 64);
  }
  const out = (i) => shop.uses[i] >= P.trades[i].max;
  const itemHtml = (x, cls = "") => x ? `<span class="g-it ${cls}" data-tip="${NAME[x.id]}">${img(ITEM[x.id])}${x.n > 1 ? `<b>${x.n}</b>` : ""}</span>` : "";
  const at = (x, y, w, h) => `style="--x:${x};--y:${y}${w ? `;--w:${w};--h:${h}` : ""}"`;
  function returnSlots() { shop.slots.forEach((s) => { if (s) give(s.id, s.n); }); shop.slots = [null, null]; }
  function fillFor(i) {
    returnSlots();
    const t = P.trades[i], need = cost(t), have = count(t.buy[0]);
    const k = Math.min(have, Math.max(need, Math.min(have, 64)));   // игра перекладывает целый стак нужного предмета
    if (k > 0) { take(t.buy[0], k); shop.slots[0] = { id: t.buy[0], n: k }; }
  }
  function topUp(i) {   // Shift+клик в игре сам докладывает товар из инвентаря
    const id = P.trades[i].buy[0], have = count(id);
    if (!have || out(i)) return;
    const cur = shop.slots[0] && shop.slots[0].id === id ? shop.slots[0].n : 0;
    if (shop.slots[0] && shop.slots[0].id !== id) return;
    const k = Math.min(have, 64 - cur); if (k <= 0) return;
    take(id, k); shop.slots[0] = { id, n: cur + k };
  }
  const canTrade = (i) => i >= 0 && !out(i) && shop.slots[0] && shop.slots[0].id === P.trades[i].buy[0] && shop.slots[0].n >= cost(P.trades[i]);
  function doTrade(i) {
    if (!canTrade(i)) return false;
    const t = P.trades[i], c = cost(t);
    shop.slots[0].n -= c; if (!shop.slots[0].n) shop.slots[0] = null;
    const left = give(t.sell[0], t.sell[1]);
    if (left) { shop.slots[0] = shop.slots[0] ? { id: t.buy[0], n: shop.slots[0].n + c } : { id: t.buy[0], n: c }; return false; }
    shop.uses[i]++; grantByTrigger("trade_adun");
    if (t.buy[0] === "dirt") { shop.log.sold += c; shop.log.gotEm += t.sell[1]; } else { shop.log.spentEm += c; shop.log.bought += t.sell[1]; }
    return true;
  }
  function renderGui() {
    const sel = shop.sel, lvl = "Новичок";
    let h = `<div class="g-bg"></div>
      <div class="g-t" ${at(49, 6)}><span>Житель-Даун - ${lvl}</span></div>
      <div class="g-t l" ${at(4, 6)}><span>Сделки</span></div>
      <div class="g-xp" ${at(136, 16, 102, 5)} data-tip="Опыт жителя: 0 / 10. Не растёт никогда"></div>
      <div class="g-t inv" ${at(107, 72)}><span>Инвентарь</span></div>`;
    P.trades.forEach((t, i) => {
      const y = 18 + i * 20, o = out(i);
      h += `<button type="button" class="g-of ${sel === i ? "sel" : ""} ${o ? "out" : ""}" data-of="${i}" ${at(5, y, 88, 20)} aria-label="Сделка ${i + 1}">
        <span class="g-abs" ${at(5, 1)}>${itemHtml({ id: t.buy[0], n: cost(t) }, cost(t) !== t.buy[1] ? "disc" : "")}${cost(t) !== t.buy[1] ? `<s>${t.buy[1]}</s>` : ""}</span>
        <i class="g-arr ${o ? "x" : ""}" ${at(55, 4, 10, 9)}></i>
        <span class="g-abs" ${at(68, 1)}>${itemHtml({ id: t.sell[0], n: t.sell[1] })}</span>
        <em class="g-uses">${o ? "всё" : t.max > 1000 ? "∞" : `${t.max - shop.uses[i]}/${t.max}`}</em></button>`;
    });
    h += `<div class="g-scroll" ${at(94, 18, 6, 27)}></div>`;
    h += `<div class="g-slot" data-slot="0" ${at(136, 37, 16, 16)}>${itemHtml(shop.slots[0])}</div>`;
    h += `<div class="g-slot" data-slot="1" ${at(162, 37, 16, 16)}>${itemHtml(shop.slots[1])}</div>`;
    if (sel >= 0 && out(sel)) h += `<i class="g-bigx" ${at(186, 35, 28, 21)} data-tip="Сделка закончилась, и пополнить её нечем"></i>`;
    const ok = canTrade(sel);
    h += `<div class="g-slot res ${ok ? "ok" : ""}" data-res ${at(220, 37, 16, 16)}>${ok ? itemHtml({ id: P.trades[sel].sell[0], n: P.trades[sel].sell[1] }) : sel >= 0 && !out(sel) ? `<span class="g-ghost">${itemHtml({ id: P.trades[sel].sell[0], n: P.trades[sel].sell[1] })}</span>` : ""}</div>`;
    for (let i = 0; i < 36; i++) {
      const x = 108 + (i % 9) * 18, y = i < 27 ? 84 + Math.floor(i / 9) * 18 : 142;
      h += `<div class="g-slot inv" ${at(x, y, 16, 16)}>${itemHtml(shop.inv[i])}</div>`;
    }
    gui.innerHTML = h;
    renderLedger();
  }
  function fitGui() {
    const w = $("#guiWrap").clientWidth;
    const s = w >= 276 * 3 ? 3 : w >= 276 * 2 ? 2 : Math.max(1, w / 276);
    gui.style.setProperty("--s", s);
    $("#guiWrap").style.height = 166 * s + "px";
  }
  gui.addEventListener("click", (e) => {
    grantByTrigger("find_adun");   // окно лавки открывается только через ПКМ по нему
    const of = e.target.closest("[data-of]");
    if (of) { const i = +of.dataset.of; shop.sel = i; fillFor(i); sfx("click", 0.5); saveShop(); renderGui(); return; }
    if (e.target.closest("[data-res]")) {
      const i = shop.sel; if (!canTrade(i)) { if (i >= 0) sfx("no1", 0.5, voicePitch()); return; }
      let n = 0;
      do { if (!doTrade(i)) break; n++; } while (e.shiftKey && (topUp(i), canTrade(i)));
      if (n) { voice("trade"); sfx("pop", 0.35, 1.3); tradeFx(n); }
      if (!shop.slots[0] && !out(i)) fillFor(i);
      saveShop(); renderGui(); return;
    }
    const sl = e.target.closest("[data-slot]");
    if (sl) { const k = +sl.dataset.slot, x = shop.slots[k]; if (x) { give(x.id, x.n); shop.slots[k] = null; sfx("click", 0.4); saveShop(); renderGui(); } }
  });
  // подсказки предметов как в игре
  const tip = document.createElement("div"); tip.className = "g-tip"; document.body.appendChild(tip);
  gui.addEventListener("pointermove", (e) => {
    const el = e.target.closest("[data-tip]");
    if (!el || e.pointerType !== "mouse") { tip.style.opacity = 0; return; }
    tip.textContent = el.dataset.tip; tip.style.opacity = 1;
    tip.style.left = Math.min(innerWidth - tip.offsetWidth - 8, e.clientX + 14) + "px"; tip.style.top = (e.clientY - 30) + "px";
  });
  gui.addEventListener("pointerleave", () => { tip.style.opacity = 0; });
  function tradeFx(n) {
    const f = document.createElement("div"); f.className = "g-fx"; f.textContent = n > 1 ? `×${n}` : "сделка";
    gui.appendChild(f); setTimeout(() => f.remove(), 900);
  }
  function renderLedger() {
    if ($("#finAcc")) $("#finAcc").textContent = `${count("emerald")} изумр. · ${count("dirt")} земли`;
    const em = count("emerald"), dirt = count("dirt"), L = shop.log, c0 = cost(P.trades[0]), c1 = cost(P.trades[1]);
    const lossPct = Math.round((1 - 1 / c0) * 100);
    $("#ledger").innerHTML = `
      <div class="lg-h"><b>Выписка по счёту</b><span>обновляется после каждой сделки</span></div>
      <div class="lg-bal">
        <div>${img(ITEM.emerald)}<b>${em}</b><span>изумрудов</span></div>
        <div>${img(ITEM.dirt)}<b>${dirt}</b><span>земли</span></div>
      </div>
      <div class="lg-rows">
        <div><span>Сдал ему земли</span><b>${L.sold}</b></div>
        <div><span>Получил изумрудов</span><b class="up">+${L.gotEm}</b></div>
        <div><span>Отдал изумрудов</span><b class="dn">−${L.spentEm}</b></div>
        <div><span>Купил земли</span><b>${L.bought}</b></div>
        <div><span>Сделка на изумруд</span><b class="${out(0) ? "dn" : ""}">${shop.uses[0]} / ${P.trades[0].max}${out(0) ? " · кончилась" : ""}</b></div>
        <div><span>Опыт жителя</span><b>0 / 10, навсегда</b></div>
      </div>
      <div class="lg-arb">
        <b>Круг арбитража</b>
        <div class="lg-loop"><span>${c0}${img(ITEM.dirt)}</span><i>→</i><span>1${img(ITEM.emerald)}</span><i>→</i><span>1${img(ITEM.dirt)}</span></div>
        <p>Отдал ${c0} ${plural(c0, "блок", "блока", "блоков")}, вернул один: минус <b>${c0 - 1}</b> (${lossPct}%) за круг. Спред между его ценами ${fmt(Math.round(c0 / c1 * 100 - 100))}%.</p>
      </div>
      <div class="lg-hero">
        <span>Эффект «Герой деревни»</span>
        <div class="seg" id="heroLvl">${[0, 1, 2, 3, 4, 5].map((l) => `<button type="button" data-h="${l}" class="${shop.hero === l ? "on" : ""}">${l ? ["I", "II", "III", "IV", "V"][l - 1] : "нет"}</button>`).join("")}</div>
        <small>Спрос и репутация на его цены не влияют: множитель цены 0. А скидка героя считается от базы отдельно, так что ${shop.hero ? `сейчас земля идёт по <b>${c0}</b> вместо 52` : "герой деревни сбивает 52 до 37 и ниже"}. Изумруд дешевле единицы не станет.</small>
      </div>
      <div class="lg-btns"><button type="button" class="bb" id="shopMax">Торговать до упора <small>Shift+клик</small></button><button type="button" class="bb ghost" id="shopReset">↺ новый инвентарь</button></div>`;
  }
  $("#ledger").addEventListener("click", (e) => {
    const h = e.target.closest("[data-h]");
    if (h) { shop.hero = +h.dataset.h; if (shop.sel >= 0) fillFor(shop.sel); sfx("click", 0.5); saveShop(); renderGui(); return; }
    if (e.target.closest("#shopReset")) { shop = START(); saveShop(); sfx("click", 0.5); renderGui(); return; }
    if (e.target.closest("#shopMax")) {
      if (shop.sel < 0) { shop.sel = 0; fillFor(0); }
      let n = 0; const i = shop.sel;
      for (let g = 0; g < 5000; g++) { topUp(i); if (!canTrade(i) || !doTrade(i)) break; n++; }
      if (n) { voice("trade"); tradeFx(n); } else sfx("no1", 0.5, voicePitch());
      saveShop(); renderGui();
    }
  });
  fitGui(); renderGui();
  addEventListener("resize", fitGui);

  /* ================= СПАВН ================= */
  (function spawnSim() {
    const N = 384, R = P.spawn.radius, cv = $("#spCv"), g = cv.getContext("2d");
    // рельеф: трава, лес (листва), песок, вода; своё зерно, чтобы карта всегда одна
    let seed = 1337; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const G = 24, grid = []; for (let i = 0; i <= G * G + G * 2; i++) grid.push(rand());
    const noise = (x, y, s) => {
      const gx = x / N * s, gy = y / N * s, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
      const v = (a, b) => grid[((b % G) * G + (a % G) + G * G) % grid.length];
      const sm = (t) => t * t * (3 - 2 * t);
      const a = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * sm(fx), b = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * sm(fx);
      return a + (b - a) * sm(fy);
    };
    const land = new Uint8Array(N * N);   // 0 трава, 1 лес, 2 песок, 3 вода
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const h = noise(x, y, 5) * 0.7 + noise(x + 99, y + 57, 13) * 0.3, f = noise(x + 300, y + 11, 9);
      land[y * N + x] = h < 0.33 ? 3 : h < 0.37 ? 2 : f > 0.62 ? 1 : 0;
    }
    const base = document.createElement("canvas"); base.width = base.height = N;
    const bg = base.getContext("2d"), id = bg.createImageData(N, N);
    const COL = [[106, 170, 72], [52, 104, 38], [219, 207, 163], [58, 96, 190]];
    for (let i = 0; i < N * N; i++) { const c = COL[land[i]], j = (rand() - 0.5) * 16; id.data.set([c[0] + j, c[1] + j, c[2] + j, 255], i * 4); }
    bg.putImageData(id, 0, 0);
    bg.strokeStyle = "rgba(0,0,0,.12)";
    for (let c = 0; c <= N; c += 16) { bg.beginPath(); bg.moveTo(c + 0.5, 0); bg.lineTo(c + 0.5, N); bg.moveTo(0, c + 0.5); bg.lineTo(N, c + 0.5); bg.stroke(); }
    const face = new Image(); face.src = U("assets/textures/p5/models/adun_villager.png");
    const eggI = new Image(); eggI.src = EGG_IC;
    const st = { tries: 0, roll: 0, rules: 0, near: 0, ok: 0, egg: 0, mobs: [], dots: [], queue: 0 };
    const nearOther = (x, y) => st.mobs.some((m) => Math.abs(m.x - x) <= R && Math.abs(m.y - y) <= R);
    function attempt() {
      const x = rnd(N), y = rnd(N); st.tries++;
      if (rnd(P.spawn.roll) !== 0) { st.dots.push({ x, y, c: "#8d8d8d", t: 0 }); return; }
      st.roll++;
      if (land[y * N + x] !== 0 && land[y * N + x] !== 2) { st.dots.push({ x, y, c: "#ff5050", t: 0 }); return; }
      st.rules++;
      if (nearOther(x, y)) { st.dots.push({ x, y, c: "#ffae00", t: 0 }); return; }
      st.ok++; st.mobs.push({ x, y, t: 0 }); sfx("pop", 0.25, 0.9 + Math.random() * 0.3);
    }
    let S0 = 1;
    function fit() { const w = cv.parentElement.clientWidth; const d = Math.min(2, devicePixelRatio || 1); cv.width = cv.height = Math.round(w * d); cv.style.width = cv.style.height = w + "px"; S0 = cv.width / N; }
    fit(); addEventListener("resize", fit);
    let vis = false; new IntersectionObserver((en) => { vis = en[0].isIntersecting; }).observe(cv);
    function draw() {
      g.imageSmoothingEnabled = false;
      g.drawImage(base, 0, 0, cv.width, cv.height);
      st.mobs.forEach((m) => {
        g.fillStyle = m.egg ? "rgba(255,255,255,.07)" : "rgba(120,70,30,.22)"; g.strokeStyle = m.egg ? "rgba(255,255,255,.6)" : "rgba(255,210,150,.75)"; g.lineWidth = Math.max(1, S0);
        const k = Math.min(1, m.t / 12);
        g.fillRect((m.x - R * k) * S0, (m.y - R * k) * S0, 2 * R * k * S0, 2 * R * k * S0);
        g.setLineDash([4 * S0, 3 * S0]); g.strokeRect((m.x - R * k) * S0, (m.y - R * k) * S0, 2 * R * k * S0, 2 * R * k * S0); g.setLineDash([]);
      });
      st.dots.forEach((d) => { g.globalAlpha = Math.max(0, 1 - d.t / 40); g.fillStyle = d.c; g.fillRect((d.x - 1.5) * S0, (d.y - 1.5) * S0, 3 * S0, 3 * S0); });
      g.globalAlpha = 1;
      st.mobs.forEach((m) => {
        const s = 12 * S0 * (m.t < 8 ? 0.6 + m.t / 20 : 1);
        g.fillStyle = "#000"; g.fillRect(m.x * S0 - s / 2 - S0, m.y * S0 - s / 2 - S0, s + 2 * S0, s * 1.25 + 2 * S0);
        if (face.complete) g.drawImage(face, 8, 8, 8, 10, m.x * S0 - s / 2, m.y * S0 - s / 2, s, s * 1.25);   // лицо жителя из текстуры
        if (m.egg && eggI.complete) g.drawImage(eggI, m.x * S0 + s / 2 - 2 * S0, m.y * S0 - s / 2 - 6 * S0, 9 * S0, 9 * S0);
      });
    }
    function panel() {
      const rows = [["Попыток спавна", st.tries, "#ddd"], ["прошли бросок 1/10", st.roll, "#bbb"], ["встали на траву или песок", st.rules, "#ff7a7a"], ["нет соседа в ±64", st.ok, "#ffcf6e"]];
      const mx = Math.max(1, st.tries);
      $("#spFunnel").innerHTML = `<h3>Воронка</h3>` + rows.map(([n, v, c], i) => `<div class="fn"><span>${n}</span><b>${v}</b><i style="--w:${(v / mx) * 100}%;--c:${c}"></i></div>`).join("")
        + `<div class="fn-sum"><b>${st.mobs.length}</b> ${plural(st.mobs.length, "Житель-Даун", "Жителя-Дауна", "Жителей-Даунов")} на карте${st.egg ? `, из них <b>${st.egg}</b> из яйца` : ""}<small>карта ${N}×${N} блоков, клетка = чанк 16×16</small></div>`;
    }
    $("#spLeg").innerHTML = `<span><i style="background:#8d8d8d"></i>не выпал шанс</span><span><i style="background:#ff5050"></i>вода или листва</span><span><i style="background:#ffae00"></i>сосед рядом</span><span><i class="sq"></i>зона ±64</span>`;
    $("#spBtns").innerHTML = [[10, "+10"], [100, "+100"], [1000, "+1000"]].map(([n, t]) => `<button type="button" class="bb" data-n="${n}">${t} попыток</button>`).join("") + `<button type="button" class="bb ghost" data-n="0">↺ сброс</button>`;
    $("#spBtns").addEventListener("click", (e) => {
      const b = e.target.closest("[data-n]"); if (!b) return;
      const n = +b.dataset.n;
      if (!n) { Object.assign(st, { tries: 0, roll: 0, rules: 0, near: 0, ok: 0, egg: 0, mobs: [], dots: [], queue: 0 }); panel(); draw(); return; }
      st.queue += n; sfx("click", 0.4);
    });
    cv.addEventListener("click", (e) => {
      const r = cv.getBoundingClientRect(), x = Math.round((e.clientX - r.left) / r.width * N), y = Math.round((e.clientY - r.top) / r.height * N);
      st.mobs.push({ x, y, t: 0, egg: true }); st.egg++; sfx("pop", 0.5); panel();
    });
    $("#spBypass").innerHTML = [[EGG_IC, P.spawn.bypass[0]], [ISO("command_block"), P.spawn.bypass[1]], [ISO("dispenser"), P.spawn.bypass[2]], [V("bell"), P.spawn.bypass[3]]]
      .map(([ic, n]) => `<div class="bp">${img(ic)}<span>${esc(n)}</span></div>`).join("") + `<p>Для них ни броска, ни проверки соседей: хоть десять штук в одной клетке.</p>`;
    panel();
    (function loop() {
      requestAnimationFrame(loop);
      if (!vis) return;
      if (st.queue > 0) { const k = Math.min(st.queue, Math.max(2, Math.ceil(st.queue / 30))); for (let i = 0; i < k; i++) attempt(); st.queue -= k; panel(); }
      st.dots.forEach((d) => d.t++); st.dots = st.dots.filter((d) => d.t < 40);
      st.mobs.forEach((m) => m.t++);
      draw();
    })();
  })();

  /* ================= ЗВУКИ ================= */
  const SI = { ambient: "♪", trade: "⇄", hurt: "✕", death: "☠" };
  function renderSnd() {
    $("#snd").innerHTML = Object.entries(P.SOUNDS).map(([k, s]) => `
      <button type="button" class="sc" data-s="${k}">
        <span class="sc-ic">${SI[k]}</span>
        <span class="sc-t"><b>${esc(s.n)}</b><code>${s.code}</code><small>${esc(s.when)}</small></span>
        <span class="sc-bars">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</span>
        <span class="sc-var">${own[k] ? s.files.map((f, i) => `<i data-v="${i}" title="${esc(f.split("/").pop())}">${i + 1}</i>`).join("") : ""}<small>${own[k] ? (s.files.length > 1 ? `${s.files.length} ${plural(s.files.length, "вариант", "варианта", "вариантов")}, играет случайный` : "один вариант") : "временно ванильный"}</small></span>
      </button>`).join("");
  }
  renderSnd(); soundReady.then(renderSnd);
  $("#snd").addEventListener("click", (e) => { const b = e.target.closest("[data-s]"); if (!b) return; touched = true; const v = e.target.closest("[data-v]"); voice(b.dataset.s, 1, v ? +v.dataset.v : undefined); });
  document.addEventListener("adun-voice", (e) => {
    const b = $(`#snd [data-s="${e.detail.key}"]`); if (!b) return;
    b.classList.remove("play"); void b.offsetWidth; b.classList.add("play");
    const a = e.detail.a, stop = () => b.classList.remove("play");
    if (a) { a.addEventListener("ended", stop, { once: true }); setTimeout(stop, 4000); } else setTimeout(stop, 700);
  });

  /* ================= ЯЙЦО ================= */
  let egg = null;
  const eggModel = () => M.egg;
  function buildEgg() {
    const w = $("#eggModel").clientWidth || 260, unit = clamp(w / 22, 8, 30);
    if (egg) egg.destroy();
    egg = make3d(eggModel(), U("assets/textures/p5/egg/"), { unit, cls: "eggm", persp: 1400 });
    $("#eggModel").innerHTML = ""; $("#eggModel").appendChild(egg.el);
  }
  buildEgg();
  const erot = spinner($("#eggStage"), { y: -25, x: -12 });
  let eggVis = false; new IntersectionObserver((en) => { eggVis = en[0].isIntersecting; }).observe($("#eggStage"));
  (function eloop() {
    requestAnimationFrame(eloop);
    if (!eggVis || !egg) return;
    if (!erot.drag) { erot.idle++; if (Math.abs(erot.vy) > 0.05) { erot.y += erot.vy; erot.vy *= 0.93; } else if (erot.idle > 60) erot.y = -25 + Math.sin(performance.now() / 1400) * 40; }
    egg.setRot([["x", erot.x], ["y", erot.y]]);
  })();
  $("#eggInfo").innerHTML = `
    <div class="mc-name">${img(EGG_IC)}<div><b>${esc(P.egg)}</b><span>ZitraksMode</span></div></div>
    <p>Не ванильное пятнистое яйцо, а своя объёмная модель с лицом Жителя-Дауна.</p>
    <div class="egg-cr">${img(ISO("command_block"))}<span><b>Только в творческом режиме</b>Лежит во вкладке творческого инвентаря. Скрафтить, выбить или купить его нельзя.</span></div>
    <div class="egg-use"><b>Работает везде</b><span>ПКМ по земле, из раздатчика и через <code>/summon ${esc(P.id)}</code>. Правило «один на 64 блока» и шанс 1/10 тут не действуют.</span></div>`;

  /* ================= ДОСТИЖЕНИЯ: та же ветка, что на остальных страницах ================= */
  $("#advBoard").style.setProperty("--tile", `url("${new URL(V("dirt"), location.href).href}")`);
  const FRAME_RU = { task: "обычная", goal: "цель", challenge: "испытание" };
  renderTree = function (pulse) {
    const open = ADV.filter((a) => got.includes(a.key)), hidden = ADV.length - open.length || (ADV.length ? 0 : 1);
    if (!advSel || !got.includes(advSel)) advSel = open.length ? open[open.length - 1].key : null;
    const icon = (a, px) => `<span class="ic" style="width:${px}px;height:${px}px">${img(a.icon ? U(a.icon) : EGG_IC)}</span>`;
    $("#advChain").innerHTML = open.length
      ? open.map((a, i) => (i ? `<div class="adv-link on"></div>` : "") + `
        <button type="button" class="adv-node ${pulse === a.key ? "pulse" : ""} ${advSel === a.key ? "sel" : ""}" data-k="${a.key}" aria-label="${esc(a.title)}">
          <span class="adv-frame ${a.frame}"></span>${icon(a, 32)}</button>`).join("") + (hidden ? `<div class="adv-link"></div><div class="adv-more">+${hidden} скрыто</div>` : "")
      : `<div class="adv-node"><span class="adv-frame task locked"></span><span class="q">?</span></div><div class="adv-link"></div><div class="adv-more">+${hidden} скрыто</div>`;
    const a = ADV.find((x) => x.key === advSel);
    $("#advDetail").innerHTML = a
      ? `<div class="big"><span class="adv-frame ${a.frame}"></span>${icon(a, 38)}</div>
         <div class="txt"><div class="tt">${esc(a.title)}</div><div class="dd">${esc(a.desc)}</div><div class="cc">${esc(a.how)}</div></div>
         <div class="meta"><span>${FRAME_RU[a.frame]}</span><b>+${a.xp} XP</b></div>`
      : `<div class="big"><span class="adv-frame task locked"></span><span class="q">?</span></div>
         <div class="txt"><div class="tt">???</div><div class="dd">Все три ачивки Жителя-Дауна скрытые: их видно только после получения, как в игре. Подсказка: знакомство, сделка и… тишина.</div></div>`;
    $("#advList").innerHTML = open.map((a) => `<button type="button" class="adv-row has" data-k="${a.key}"><span class="fr"><span class="adv-frame ${a.frame}"></span>${icon(a, 26)}</span><span><span class="t">${esc(a.title)}</span><span class="d">${esc(a.desc)}</span></span><span class="x">+${a.xp} XP</span></button>`).join("")
      + (hidden ? `<div class="adv-row locked"><span class="fr"><span class="adv-frame task locked"></span><span class="q">?</span></span><span><span class="t">???</span><span class="d">откроется, когда получишь</span></span></div>` : "");
    const total = Math.max(ADV.length, 1);
    $("#advBar").style.width = (open.length / total) * 100 + "%";
    $("#advTxt").textContent = `${open.length} / ${total}` + (ADV.length ? ` · ${open.reduce((s, x) => s + x.xp, 0)} / ${ADV.reduce((s, x) => s + x.xp, 0)} XP` : "");
  };
  renderTree();
  const pickAdv = (e) => { const n = e.target.closest("[data-k]"); if (!n) return; advSel = n.dataset.k; renderTree(); };
  $("#advChain").addEventListener("click", pickAdv);
  $("#advList").addEventListener("click", pickAdv);
  $("#advReset").addEventListener("click", () => { got = []; ZM.store.set("p05.adv", got); advSel = null; renderTree(); });

  /* ================= ХРОНОЛОГИЯ ================= */
  const TL = [
    { date: "27.09.2025", ver: "старт", title: "Начало ZitraksMode", text: "Первый день разработки мода.", dim: true },
    { date: "07.11.2025", ver: "№04", title: "Каска Шахтёра", text: "Пункт перед этим.", dim: true, href: "pages/04-miner-helmet/index.html" },
    ...P.history.map((h) => Object.assign({ main: true }, h)),
    { date: "08.11.2025", ver: "тот же день", title: "Логотип мода", text: "В один день с Жителем-Дауном у ZitraksMode появился логотип.", logo: "assets/brand/zitraksmode_logo.jpg" },
  ];
  $("#timeline").innerHTML = TL.map((h) => `
    <div class="tl-row ${h.main ? "main" : ""} ${h.dim ? "dim" : ""}">
      <div class="tl-date"><b>${h.date.slice(0, 5)}</b><span>${h.date.slice(6)}</span></div>
      <div class="tl-candle ${h.main ? "up" : ""}"><i></i></div>
      <div class="tl-body"><span class="tl-ver">${esc(h.ver)}</span><b>${h.href ? `<a href="${U(h.href)}">${esc(h.title)}</a>` : esc(h.title)}</b><p>${esc(h.text)}</p>${h.logo ? `<img class="tl-logo" src="${U(h.logo)}" alt="Логотип ZitraksMode" loading="lazy">` : ""}</div>
    </div>`).join("");

  /* ================= заголовки-котировки и финал ================= */
  const Q = ["HP 20", "−98%", "1/10", "4 звука", "творческий", "15 XP", "08.11.25"];
  Q.forEach((q, i) => { const el = $("#q" + (i + 1)); if (el) el.textContent = q; });
  const shopNow = () => `${count("emerald")} изумр. · ${count("dirt")} земли`;
  $("#finBoard").innerHTML = `<span>ЗАКРЫТИЕ ТОРГОВ</span><b>DIRT/EMR 52 : 1</b><span id="finAcc">${shopNow()}</span>`;
  const nav = ZM.pointNav(5);
  $("#finNav").innerHTML = [nav.prev && `<a href="${U(nav.prev.href)}">← №${String(nav.prev.n).padStart(2, "0")} ${esc(nav.prev.title)}</a>`,
    `<a href="${U("index.html")}">Все пункты</a>`,
    nav.next && `<a href="${U(nav.next.href)}">№${String(nav.next.n).padStart(2, "0")} ${esc(nav.next.title)} →</a>`].filter(Boolean).join("");

  ZM.reveal();
})();
