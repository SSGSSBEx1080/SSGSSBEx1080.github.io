/* =====================================================================
   №04 · Шлем шахтёра
   ===================================================================== */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = ZM.esc, U = ZM.url, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const P = ZM.P04, M = ZM.P04M;
  let ready = false;   // пока страница не собрана, глубиномер не трогаем
  const V = (n) => U(`assets/textures/p4/vanilla/${n}.png`);
  const ICON = (id) => id === "p4:miner_helmet" ? U("assets/textures/p4/models/miner_helmet.png")
    : id === "tnt" ? U("assets/textures/item/tnt_helmet.png") : V(id);
  const img = (src, cls = "") => `<img class="px ${cls}" src="${src}" alt="" draggable="false">`;
  const durBar = (dmg, max) => {   // полоска прочности как в инвентаре
    if (!dmg) return "";
    const f = Math.max(0, 1 - dmg / max);
    return `<i class="dur"><b style="width:${Math.round(f * 13) / 13 * 100}%;background:hsl(${f * 120},100%,50%)"></b></i>`;
  };
  const advIc = (a, px) => `<span class="ic adv-ic" style="width:${px}px;height:${px}px;position:relative">${img(ICON("p4:miner_helmet"))}${a.key === "drained_helmet" ? durBar(890, 900) : ""}</span>`;
  const fmt = (v) => String(Math.round(v * 100) / 100).replace(".", ",");

  ZM.topbar({ crumb: "№04 · Каска Шахтёра", ...ZM.pointNav(4) });

  /* ---------- ачивки (нужны раньше всех: их дают батарейка и крафт) ---------- */
  const ADV = P.advancements;
  let got = ZM.store.get("p04.adv", []).filter((k) => ADV.some((a) => a.key === k));
  const FRAME_RU = { task: "обычная", goal: "цель", challenge: "испытание" };
  const MC_COL = { 0: "#000", 1: "#00a", 2: "#0a0", 3: "#0aa", 4: "#a00", 5: "#a0a", 6: "#fa0", 7: "#aaa", 8: "#555", 9: "#55f", a: "#5f5", b: "#5ff", c: "#f55", d: "#f5f", e: "#ff5", f: "#fff" };
  function mc(str, base = "#fff") {
    let col = base, st = {}, out = "";
    str.split(/(§[0-9a-fk-or])/i).forEach((part) => {
      const m = /^§([0-9a-fk-or])$/i.exec(part);
      if (m) { const c = m[1].toLowerCase(); if (MC_COL[c]) { col = MC_COL[c]; st = {}; } else if (c === "r") { col = base; st = {}; } else st[c] = 1; return; }
      if (!part) return;
      out += `<span style="color:${col};${st.l ? "font-weight:700;" : ""}${st.o ? "font-style:italic;" : ""}">${esc(part)}</span>`;
    });
    return out;
  }
  const plain = (s) => s.replace(/§[0-9a-fk-or]/gi, "");
  let advSel = null;
  function grant(key) {
    const a = ADV.find((x) => x.key === key);
    if (!a || got.includes(key)) return;
    got.push(key); ZM.store.set("p04.adv", got);
    ZM.toast({ iconHtml: advIc(a, 32), title: plain(a.title), frame: a.frame, head: a.frame === "goal" ? "Цель достигнута!" : "Получено достижение!" });
    sfx("levelup", 0.5);
    advSel = key; renderTree && renderTree(key);
  }
  let renderTree = null;

  /* ---------- звук ---------- */
  const EXT = new Audio().canPlayType("audio/ogg; codecs=vorbis") ? "ogg" : "mp3";
  const MASTER_VOLUME = 0.35;
  let sndOn = ZM.store.get("p04.snd", true);
  const pool = {};
  function sfx(name, vol = 1, rate = 1) {
    if (!sndOn) return;
    try {
      const a = (pool[name] || (pool[name] = new Audio(U(`assets/sounds/p04/${name}.${EXT}`)))).cloneNode();
      a.volume = clamp(vol * MASTER_VOLUME, 0, 1); a.playbackRate = rate; a.preservesPitch = false;
      a.play().catch(() => {});
    } catch (e) {}
  }
  const bSnd = $("#snd");
  const syncSnd = () => { bSnd.setAttribute("aria-pressed", sndOn); bSnd.classList.toggle("on", sndOn); };
  bSnd.onclick = () => { sndOn = !sndOn; ZM.store.set("p04.snd", sndOn); syncSnd(); if (sndOn) sfx("click", 0.6); };
  ZM.sfx.bind(() => sndOn);   // общие звуки Minecraft (клики, тосты) слушаются кнопки звука страницы
  syncSnd();

  /* ---------- стена шахты ---------- */
  const texNames = ["stone", "deepslate", "tuff", "granite", "diorite", "andesite", "gravel", "dirt", "grass_block_side", "bedrock"];
  const tex = { destroy: [] };
  const loadI = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  const jobs = [];
  for (const n of texNames) jobs.push(loadI(V(n)).then((i) => (tex[n] = i)));
  for (const o of P.ores) for (const pre of ["", "deepslate_"]) { const k = `${pre}${o.k}_ore`; jobs.push(loadI(V(k)).then((i) => (tex[k] = i))); }
  for (let i = 0; i < 10; i++) jobs.push(loadI(V(`destroy_stage_${i}`)).then((im) => (tex.destroy[i] = im)));
  jobs.push(loadI(V("lava_still")).then((i) => { tex.lava = i; if (i) tex.lavaFrames = Math.floor(i.height / 16); }));

  const DROP = { stone: "cobblestone", deepslate: "cobbled_deepslate", grass_block_side: "dirt" };
  const inv = ZM.store.get("p04.inv", {});
  const minedArr = ZM.store.get("p04.mined", []);
  const TOOLS = [
    { id: "iron_pickaxe", n: "Железная", speed: 6 },
    { id: "diamond_pickaxe", n: "Алмазная", speed: 8 },
    { id: "netherite_pickaxe", n: "Незеритовая", speed: 9 },
  ];
  let toolI = clamp(ZM.store.get("p04.tool", 0), 0, TOOLS.length - 1);

  const mine = new ZMMine($("#mineCv"), {
    tex, data: P, level: P.LAMP_LEVEL, mined: minedArr,
    onDepth: (y) => { if (ready) depthUI(y); },
    onHit: () => sfx("hit" + (1 + Math.floor(Math.random() * 3)), 0.35, 0.8 + Math.random() * 0.15),
    onBreak: (b, key) => {
      sfx("dig" + (1 + Math.floor(Math.random() * 4)), 0.8);
      const id = b.k === "ore" ? b.ore.drop : DROP[b.k] || b.k;
      const n = b.k === "ore" ? ({ copper: 2 + rnd(4), redstone: 4 + rnd(2), lapis: 4 + rnd(6) }[b.ore.k] || 1) : 1;
      inv[id] = (inv[id] || 0) + n;
      minedArr.push(key); if (minedArr.length > 4000) minedArr.shift();
      ZM.store.set("p04.inv", inv); ZM.store.set("p04.mined", minedArr);
      setTimeout(() => sfx("pop", 0.5, 1 + Math.random() * 0.6), 90);
      renderHot(id);
    },
  });
  const rnd = (n) => Math.floor(Math.random() * n);
  Promise.all(jobs).then(() => { mine.dirty = true; });
  addEventListener("load", () => mine.resize());
  document.fonts && document.fonts.ready.then(() => { mine.resize(); mine.dirty = true; });

  // Копать можно только «голую» стену: не панели, не текст, не кнопки
  const BLOCKERS = ".pn, a, button, input, label, h1, h2, p, img, canvas:not(#mineCv), .zm-topbar, .dock, .depth, .hero-stage, .hero-stats, .hero-tag, .sec-head, .orex-list, .adv-board, .tl4, .fin-copy, .craft, .lights, .pv, .pv-facts, .fx, .adv-list, .bat";
  const onWall = (e) => !e.target.closest(BLOCKERS);
  const glow = $("#lampGlow");
  function setPtr(x, y) {
    mine.px = x; mine.py = y; mine.hasPtr = true; mine.dirty = true;
    glow.style.transform = `translate(${x}px, ${y}px)`;
  }
  addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" || mine.dig) setPtr(e.clientX, e.clientY);
    mine.hoverOk = e.pointerType === "mouse" && onWall(e);
    if (mine.dig) mine.moveDig(e.clientX, e.clientY);
    document.body.classList.toggle("can-dig", !!mine.hoverOk);
  }, { passive: true });
  document.addEventListener("mouseleave", () => { mine.hoverOk = false; mine.dirty = true; });
  let touchT = null;
  addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || !onWall(e)) return;
    if (e.pointerType === "mouse") { e.preventDefault(); setPtr(e.clientX, e.clientY); mine.startDig(e.clientX, e.clientY); return; }
    // палец: копаем долгим нажатием, чтобы не мешать скроллу
    const x = e.clientX, y = e.clientY;
    clearTimeout(touchT);
    touchT = setTimeout(() => { setPtr(x, y); mine.startDig(x, y); }, 280);
  });
  const stop = () => { clearTimeout(touchT); mine.stopDig(); };
  addEventListener("pointerup", stop); addEventListener("pointercancel", stop);
  addEventListener("scroll", () => { if (mine.dig && !mine.dig._m) stop(); }, { passive: true });
  document.addEventListener("contextmenu", (e) => { if (onWall(e)) e.preventDefault(); });
  document.addEventListener("dragstart", (e) => { if (onWall(e)) e.preventDefault(); });

  // На телефоне без мыши фонарь светит из центра экрана
  if (!matchMedia("(hover:hover)").matches) setPtr(innerWidth * 0.5, innerHeight * 0.42);

  /* ---------- пульт ---------- */
  const bLamp = $("#bLamp"), bF3 = $("#bF3"), bTool = $("#bTool");
  function setLamp(on) { mine.lampOn = on; mine.dirty = true; bLamp.setAttribute("aria-pressed", on); bLamp.classList.toggle("on", on); document.body.classList.toggle("lamp-off", !on); }
  function setF3(on) { mine.f3 = on; mine.dirty = true; bF3.setAttribute("aria-pressed", on); bF3.classList.toggle("on", on); }
  function setTool(i) { toolI = i; applyTool(); ZM.store.set("p04.tool", i); $("#toolIc").src = V("item_" + TOOLS[i].id); $("#toolN").textContent = TOOLS[i].n.toLowerCase(); }
  bLamp.onclick = () => { wear(!mine.lampOn); };
  bF3.onclick = () => { setF3(!mine.f3); sfx("click", 0.5); };
  bTool.onclick = () => { setTool((toolI + 1) % TOOLS.length); sfx("equip" + (1 + rnd(2)), 0.6); };
  addEventListener("keydown", (e) => {
    if (e.target.closest("input,textarea")) return;
    if (e.key === "F3") { e.preventDefault(); setF3(!mine.f3); }
    else if (e.key === "l" || e.key === "L" || e.key === "д" || e.key === "Д") wear(!mine.lampOn);
  });
  // Спешка с каски ускоряет копание: ×(1 + 0.2 × уровень), как в игре
  function applyTool() {
    const h = helmetActive() ? P.peresvet[bat.lvl].haste : 0;
    mine.tool = { speed: TOOLS[toolI].speed * (1 + 0.2 * h) };
    $("#toolIc").src = V("item_" + TOOLS[toolI].id); $("#toolN").textContent = TOOLS[toolI].n.toLowerCase();
    ZM.store.set("p04.tool", toolI);
  }

  // подсказка над хотбаром, как сообщения в игре (не ачивка)
  let abT = null;
  function actionBar(text) {
    let el = $("#actbar");
    if (!el) { el = document.createElement("div"); el.id = "actbar"; el.className = "actbar"; document.body.appendChild(el); }
    el.textContent = text; el.classList.add("show");
    clearTimeout(abT); abT = setTimeout(() => el.classList.remove("show"), 2200);
  }

  /* ---------- батарейка (прочность = заряд) ---------- */
  const MAX = P.DURABILITY;
  const bat = Object.assign({ dmg: 0, lvl: 0, worn: true }, ZM.store.get("p04.bat", {}));
  bat.dmg = clamp(bat.dmg | 0, 0, MAX); bat.lvl = clamp(bat.lvl | 0, 0, 3);
  let batSpeed = 1, batTicks = 0;
  const helmetActive = () => bat.worn && bat.dmg < MAX;
  const saveBat = () => ZM.store.set("p04.bat", { dmg: bat.dmg, lvl: bat.lvl, worn: bat.worn });
  function wear(on) {
    if (on && bat.dmg >= MAX) { actionBar("Каска разряжена: заряди её золотым слитком"); sfx("click", 0.4); return; }
    bat.worn = on; saveBat();
    setLamp(on); sfx(on ? "equip" + (1 + rnd(2)) : "click", 0.55);
    batUI(); applyTool(); fxUI();
  }
  function drained() {
    bat.worn = false; saveBat();
    setLamp(false); sfx("fizz", 0.7);
    document.body.classList.add("dark-flash"); setTimeout(() => document.body.classList.remove("dark-flash"), 900);
    grant("drained_helmet");
    batUI(); applyTool(); fxUI();
  }
  setInterval(() => {
    if (!helmetActive() || document.hidden) return;
    batTicks += 2 * batSpeed;                      // 100 мс = 2 тика
    const drain = P.peresvet[bat.lvl].drain;
    let changed = false;
    while (batTicks >= drain && bat.dmg < MAX) { batTicks -= drain; bat.dmg++; changed = true; }
    if (changed) { saveBat(); if (bat.dmg >= MAX) drained(); else batUI(); }
  }, 100);
  const ROMAN = ["", "I", "II", "III"];
  function batUI() {
    const pv = P.peresvet[bat.lvl], left = MAX - bat.dmg, sec = Math.floor(left * pv.drain / 20), f = left / MAX;
    $("#batSlot").innerHTML = `<span class="bs-ic ${bat.lvl ? "glint" : ""}" style="--ic:url('${new URL(ICON("p4:miner_helmet"), location.href).href}')">${img(ICON("p4:miner_helmet"))}${durBar(bat.dmg, MAX)}</span>
      <span class="bs-cap">${bat.worn && left ? "на голове" : left ? "в руке" : "разряжена"}</span>`;
    const lines = [`<div class="t-name">Каска Шахтёра</div>`];
    if (bat.lvl) lines.push(`<div style="color:#aaa">Пересвет ${ROMAN[bat.lvl]}</div>`);
    lines.push(left ? `<div style="color:#fa0">Осталось: ${Math.floor(sec / 60)} мин ${sec % 60} сек</div>` : `<div style="color:#f55">Разряжен</div>`);
    lines.push(`<div style="color:#ff5">Эффекты: Ночное зрение, Спешка ${ROMAN[pv.haste]}</div>`);
    lines.push(bat.lvl ? `<div style="color:#5ff">Пересвет ${ROMAN[bat.lvl]}: ${pv.minutes} минут работы${bat.lvl > 1 ? ", Спешка " + ROMAN[pv.haste] : ""}</div>` : `<div style="color:#aaa">Без Пересвета: 30 минут работы</div>`);
    lines.push(`<div class="t-gap"></div><div style="color:#aaa">На голове:</div><div style="color:#55f">+4 Броня</div><div style="color:#55f">+2 Твёрдость брони</div>`);
    lines.push(`<div style="color:#fff">Прочность: ${left} / ${MAX}</div>`);
    $("#batTip").innerHTML = lines.join("");
    $("#batFill").style.width = f * 100 + "%";
    $("#batCell").style.setProperty("--bc", f > 0.5 ? "#7dff5a" : f > 0.2 ? "#ffcc33" : "#ff4a3a");
    $("#batCell").classList.toggle("low", f <= 0.2 && f > 0); $("#batCell").classList.toggle("dead", !left);
    $("#batPct").textContent = Math.ceil(f * 100) + "%";
    $("#batRead").innerHTML = `<span><small>−1 прочности</small>каждые ${fmt(pv.drain / 20)} с</span><span><small>полный заряд</small>${pv.minutes} мин</span><span><small>спешка</small>${ROMAN[pv.haste]}</span>`;
    $$("#batLvl button").forEach((b) => b.classList.toggle("on", +b.dataset.l === bat.lvl));
    $$("#batSpd button").forEach((b) => b.classList.toggle("on", +b.dataset.s === batSpeed));
    const bw = $("#batWear"); bw.disabled = !left; bw.textContent = !left ? "Разряжена" : bat.worn ? "Снять каску" : "Надеть каску";
    const bf = $("#batFix"); bf.disabled = !bat.dmg;
    bf.innerHTML = `${img(V("item_gold_ingot"))}<span>Зарядить на наковальне<small>золотой слиток = +${MAX / 4} прочности</small></span>`;
    $$(".pvc").forEach((c) => c.classList.toggle("on", +c.dataset.l === bat.lvl));
    $("#bLamp").classList.toggle("dead", !left);
  }
  $("#batLvl").innerHTML = [0, 1, 2, 3].map((l) => `<button type="button" data-l="${l}">${l ? ROMAN[l] : "нет"}</button>`).join("");
  $("#batSpd").innerHTML = [[1, "×1"], [60, "×60"], [600, "×600"]].map(([v, t]) => `<button type="button" data-s="${v}">${t}</button>`).join("");
  function setLvl(l) { if (l === bat.lvl) return; bat.lvl = l; saveBat(); batUI(); applyTool(); fxUI(); if (l) sfx("enchant1", 0.5); }
  $("#batLvl").onclick = (e) => { const b = e.target.closest("[data-l]"); if (b) setLvl(+b.dataset.l); };
  $("#batSpd").onclick = (e) => { const b = e.target.closest("[data-s]"); if (b) { batSpeed = +b.dataset.s; batUI(); sfx("click", 0.4); } };
  $("#batWear").onclick = () => wear(!bat.worn);
  $("#batFix").onclick = () => {
    if (!bat.dmg) return;
    bat.dmg = Math.max(0, bat.dmg - MAX / 4); saveBat(); sfx("anvil", 0.45);
    batUI(); applyTool(); fxUI();
  };

  /* ---------- эффекты в углу экрана ---------- */
  let nv = ZM.store.get("p04.nv", false);
  function fxUI() {
    const on = helmetActive(), h = P.peresvet[bat.lvl].haste;
    const fx = $("#fx");
    fx.classList.toggle("off", !on);
    fx.innerHTML = `<button type="button" class="fx-e ${nv ? "act" : ""}" id="fxNv" title="Показать шахту глазами ночного зрения">${img(V("effect_night_vision"))}<span>Ночное зрение<small>${nv ? "вид: включён" : "нажми: посмотреть"}</small></span></button>
      <div class="fx-e">${img(V("effect_haste"))}<span>Спешка ${ROMAN[h]}<small>копаешь ×${fmt(1 + 0.2 * h)}</small></span></div>`;
    $("#fxNv").onclick = () => { nv = !nv; ZM.store.set("p04.nv", nv); fxUI(); sfx("click", 0.4); };
    mine.nv = on && nv; mine.dirty = true;
  }
  setF3(false); applyTool(); setLamp(helmetActive()); batUI(); fxUI();

  function renderHot(pulse) {
    const ids = Object.keys(inv).sort((a, b) => inv[b] - inv[a]).slice(0, 9);
    const iconOf = (id) => ["cobblestone", "cobbled_deepslate", "dirt", "gravel", "granite", "diorite", "andesite", "tuff"].includes(id) ? V(id) : V("item_" + id);
    let h = "";
    for (let i = 0; i < 9; i++) {
      const id = ids[i];
      h += `<span class="hs ${id === pulse ? "pulse" : ""}" ${id ? `title="${esc(id)}"` : ""}>${id ? img(iconOf(id)) + `<b>${inv[id] > 999 ? "999+" : inv[id]}</b>` : ""}</span>`;
    }
    $("#hot").innerHTML = h;
    $("#hot").classList.toggle("empty", !ids.length);
    finaleText();
  }
  renderHot();

  /* ---------- глубиномер ---------- */
  const LAYERS = [[61, "Поверхность"], [1, "Камень"], [-7, "Переход в сланец"], [-59, "Глубинный сланец"], [-99, "Бедрок"]];
  const layerOf = (y) => (LAYERS.find(([top]) => y >= top) || LAYERS[LAYERS.length - 1])[1];
  const oreMax = {}; for (const o of P.ores) { let m = 0; for (let y = -64; y <= 320; y++) m = Math.max(m, ZMMine.density(o, y)); oreMax[o.k] = m; }
  const oreIcon = (o) => V(o.k === "gold" ? "gold_ore" : `${o.k}_ore`);
  // шкала: отметки ключевых высот
  const scale = $("#dpScale"), SPAN = ZMMine.TOP_Y - ZMMine.BOTTOM_Y;
  const pct = (y) => ((ZMMine.TOP_Y - y) / SPAN) * 100;
  scale.insertAdjacentHTML("beforeend", [[64, "64"], [0, "0"], [-59, "−59"], [-64, "−64"]].map(([y, t]) => `<span class="dp-tick" style="top:${pct(y)}%">${t}</span>`).join(""));
  function depthUI(y) {
    $("#dpY").textContent = y < 0 ? "−" + -y : y;
    $("#dpLayer").textContent = layerOf(y);
    $("#dpMark").style.top = pct(y) + "%";
    const top = P.ores.filter((o) => o.k !== "emerald").map((o) => [o, ZMMine.density(o, y) / oreMax[o.k]]).filter((x) => x[1] > 0.02).sort((a, b) => b[1] - a[1]).slice(0, 3);
    $("#dpOres").innerHTML = top.length ? top.map(([o, v]) => `<div class="dp-ore">${img(oreIcon(o))}<span>${o.n}</span><i><b style="width:${Math.round(v * 100)}%"></b></i></div>`).join("") : `<div class="dp-none">${y > 60 ? "руды глубже" : "пусто"}</div>`;
    drawOre();
  }

  /* ---------- HERO: 3D-шлем ---------- */
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
  const stage = $("#heroStage");
  let helm = null;
  const rot = { y: 145, x: -20, vy: 0, drag: null, idle: 0 };
  function buildHelm() {
    const w = $("#hsModel").clientWidth || 300, unit = clamp((w * 0.66) / 7, 10, 60);
    if (helm) helm.destroy();
    helm = make3d(M.helmet, U("assets/textures/p4/models/"), { unit, cls: "helm", persp: 1300 });
    $("#hsModel").innerHTML = ""; $("#hsModel").appendChild(helm.el);
  }
  buildHelm();
  $("#hsPh").hidden = !M.info.placeholder;
  let rw = innerWidth; addEventListener("resize", () => { if (Math.abs(innerWidth - rw) > 40) { rw = innerWidth; buildHelm(); } });
  for (const ev of ["contextmenu", "dragstart", "selectstart"]) stage.addEventListener(ev, (e) => e.preventDefault());
  stage.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") e.preventDefault();
    rot.drag = { x: e.clientX, y: e.clientY, ry: rot.y, rx: rot.x }; rot.vy = 0;
    try { stage.setPointerCapture(e.pointerId); } catch (er) {}
    if (!ZM.store.get("p04.equip", false)) { ZM.store.set("p04.equip", true); }
    sfx("equip" + (1 + rnd(2)), 0.5);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!rot.drag) return;
    const ny = rot.drag.ry + (e.clientX - rot.drag.x) * 0.5;
    rot.vy = ny - rot.y; rot.y = ny; rot.x = clamp(rot.drag.rx - (e.clientY - rot.drag.y) * 0.4, -75, 75); rot.idle = 0;
  });
  const endDrag = () => { rot.drag = null; };
  stage.addEventListener("pointerup", endDrag); stage.addEventListener("pointercancel", endDrag);
  let heroVis = true;
  new IntersectionObserver((en) => { heroVis = en[0].isIntersecting; }).observe(stage);
  (function spin() {
    requestAnimationFrame(spin);
    if (!heroVis || !helm) return;
    if (!rot.drag) {
      rot.idle++;
      if (Math.abs(rot.vy) > 0.05) { rot.y += rot.vy; rot.vy *= 0.94; }
      else if (rot.idle > 90) rot.y += 0.25;
    }
    helm.setRot([["x", rot.x], ["y", rot.y]]);
  })();

  $("#heroStats").innerHTML = [
    ["4", "защита", "armor"], ["15", "свет", "light"], ["30", "минут заряда", "dura"], ["III", "спешка макс.", "ench"],
  ].map(([v, k, c]) => `<div class="hst ${c}"><b>${v}</b><span>${k}</span></div>`).join("");

  /* ---------- 04.1 паспорт ---------- */
  const A = P.armor;
  const armorBar = (def) => {
    let h = ""; for (let i = 0; i < 10; i++) { const v = def - i * 2; h += img(U(`assets/textures/mc/ui/armor_${v >= 2 ? "full" : v === 1 ? "half" : "empty"}.png`), "ab"); }
    return `<span class="abar">${h}</span>`;
  };
  $("#plate").innerHTML = `
    <div class="pl-top"><span class="pl-id">zitraksmode:miner_helmet</span><span class="pl-slot">СЛОТ · ГОЛОВА</span></div>
    <div class="pl-main">
      <div class="pl-icon">${img(ICON("p4:miner_helmet"))}</div>
      <div class="pl-name"><b>Каска Шахтёра</b><span>материал <code>MINER</code> · золото + фонарь</span></div>
    </div>
    <div class="pl-bar"><span>Броня на экране</span>${armorBar(A.defense)}</div>
    <dl class="pl-grid">
      <div><dt>Защита</dt><dd>${A.defense}</dd><small>лучший шлем в игре</small></div>
      <div><dt>Твёрдость</dt><dd>${fmt(A.toughness)}</dd><small>как у алмаза</small></div>
      <div><dt>Прочность</dt><dd>${A.durability}</dd><small>она же батарейка: 30 мин</small></div>
      <div><dt>Зачарование</dt><dd>${A.enchantability}</dd><small>выше алмаза и незерита</small></div>
      <div><dt>Ремонт</dt><dd class="ic">${img(V("item_gold_ingot"))}</dd><small>золотой слиток</small></div>
      <div><dt>Звук</dt><dd class="ic"><button type="button" class="pl-play" id="plPlay" aria-label="Послушать">▶</button></dd><small>надевание золота</small></div>
    </dl>
    <div class="pl-rivets" aria-hidden="true"><i></i><i></i><i></i><i></i></div>`;
  $("#plPlay").onclick = () => sfx("equip" + (1 + rnd(2)), 0.9);

  const METRICS = [
    { k: "defense", n: "Защита", max: 4, f: (v) => v },
    { k: "toughness", n: "Твёрдость", max: 3, f: fmt },
    { k: "durability", n: "Прочность", max: 900, f: (v) => v },
    { k: "enchantability", n: "Зачарование", max: 25, f: (v) => v },
  ];
  const NOTES = {
    defense: "Ни один ванильный шлем не даёт больше 3. У шахтёрского 4: на единицу больше, чем у незеритового.",
    toughness: "Твёрдость режет урон от сильных ударов. 2, как у алмазного; больше только у незеритового.",
    durability: "900: больше, чем у любого шлема в игре, вдвое больше незеритового. Только это ещё и батарейка: пока каска на голове, она тает сама по 1 за 2 секунды.",
    enchantability: "Чем больше, тем лучше чары со стола зачарования. 18: вторая строчка после чистого золота.",
  };
  let metric = ZM.store.get("p04.metric", "defense");
  $("#cmpTabs").innerHTML = METRICS.map((m) => `<button type="button" role="tab" data-m="${m.k}">${m.n}</button>`).join("");
  $("#cmpTabs").onclick = (e) => { const b = e.target.closest("[data-m]"); if (b) { metric = b.dataset.m; ZM.store.set("p04.metric", metric); renderCmp(); sfx("click", 0.4); } };
  function renderCmp() {
    const m = METRICS.find((x) => x.k === metric) || METRICS[0];
    $$("#cmpTabs button").forEach((b) => b.classList.toggle("on", b.dataset.m === m.k));
    const rows = [...P.helmets].sort((a, b) => b[m.k] - a[m.k] || (b.me ? 1 : 0) - (a.me ? 1 : 0));
    $("#cmpList").innerHTML = rows.map((h, i) => `<div class="cr ${h.me ? "me" : ""}" style="--w:${(h[m.k] / m.max) * 100}%;--d:${i * 40}ms">
      <span class="cr-ic">${img(ICON(h.icon))}</span><span class="cr-n">${esc(h.name)}</span>
      <span class="cr-bar">${m.k === "defense" ? armorBar(h.defense) : "<i></i>"}</span><b class="cr-v">${m.f(h[m.k])}</b></div>`).join("");
    $("#cmpNote").textContent = NOTES[m.k];
  }
  renderCmp();

  /* ---------- 04.2 свет ---------- */
  $("#lights").innerHTML = `<div class="lt-head"><span>Источник</span><span>Уровень света</span></div>` + P.lights.map((l) => {
    const lv = l.lvl;
    const src = l.ic.startsWith("p4:") || l.ic.startsWith("item_") ? ICON(l.ic) : V(l.ic);
    let cells = ""; for (let i = 1; i <= 15; i++) cells += `<i class="${i <= lv ? "on" : ""}" style="--b:${ZMMine.bright(i).toFixed(3)}"></i>`;
    return `<div class="lt ${l.me ? "me" : ""}"><span class="lt-ic">${img(src)}</span><span class="lt-n">${esc(l.n)}${l.me ? "<small>невидимый блок света, ходит за тобой</small>" : ""}</span>
      <span class="lt-cells">${cells}</span><b class="lt-v">${lv}</b></div>`;
  }).join("") + `<div class="lt-foot"><span><i class="sw on"></i>светло</span><span><i class="sw"></i>0 = тут спавнятся мобы</span></div>`;

  /* ---------- 04.3 руды по высоте ---------- */
  const oreCv = $("#oreCv");
  let orePick = ZM.store.get("p04.ore", "diamond");
  const Y0 = -64, Y1 = 128;
  function drawOre() {
    const r = oreCv.getBoundingClientRect(); if (!r.width) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    oreCv.width = r.width * dpr; oreCv.height = r.height * dpr;
    const c = oreCv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = r.width, H = r.height, L = 46, R = 10, T = 10, B = 10;
    const yPix = (y) => T + ((Y1 - y) / (Y1 - Y0)) * (H - T - B);
    c.clearRect(0, 0, W, H);
    // слои слева текстурами
    c.imageSmoothingEnabled = false;
    for (let y = Y1; y >= Y0; y -= 4) {
      const t = y > 60 ? tex.dirt : y > 0 ? tex.stone : y > -60 ? tex.deepslate : tex.bedrock;
      if (t) c.drawImage(t, 0, 0, 16, 16 * 4 / 4, 0, yPix(y), 12, yPix(y - 4) - yPix(y) + 0.5);
    }
    c.font = "11px 'JetBrains Mono', monospace"; c.textAlign = "right"; c.textBaseline = "middle";
    for (const y of [128, 96, 64, 32, 0, -32, -64]) {
      c.strokeStyle = y === 0 ? "rgba(255,204,51,.35)" : "rgba(255,255,255,.07)"; c.lineWidth = 1;
      c.beginPath(); c.moveTo(L, yPix(y)); c.lineTo(W - R, yPix(y)); c.stroke();
      c.fillStyle = "rgba(255,240,210,.55)"; c.fillText(y < 0 ? "−" + -y : y, L - 6, yPix(y));
    }
    // текущая глубина страницы
    const cy = mine.depthAtView();
    c.fillStyle = "rgba(255,204,51,.12)"; c.fillRect(L, yPix(cy) - 3, W - L - R, 6);
    for (const o of P.ores) {
      const on = o.k === orePick;
      c.beginPath();
      for (let y = Y1; y >= Y0; y--) { const x = L + (ZMMine.density(o, y) / oreMax[o.k]) * (W - L - R); y === Y1 ? c.moveTo(x, yPix(y)) : c.lineTo(x, yPix(y)); }
      c.strokeStyle = on ? o.col : "rgba(255,255,255,.07)"; c.lineWidth = on ? 3 : 1.2; c.stroke();
      if (on) { c.lineTo(L, yPix(Y0)); c.lineTo(L, yPix(Y1)); c.closePath(); c.fillStyle = o.col + "33"; c.fill(); }
    }
    const o = P.ores.find((x) => x.k === orePick);
    const d = ZMMine.density(o, cy) / oreMax[o.k];
    $("#oreRead").innerHTML = `<b>Y ${cy < 0 ? "−" + -cy : cy}</b> · ${esc(o.n)}: ${d > 0 ? Math.round(d * 100) + "% от максимума" : "здесь не генерируется"}`;
  }
  const BEST = { coal: [96, "в горах ещё больше, выше 136"], copper: [48], iron: [16, "и вторая волна в горах, Y 232"], lapis: [0], gold: [-16, "в бесплодных землях до Y 256"], redstone: [-59], diamond: [-59, "чем глубже, тем больше"], emerald: [232, "только в горах"] };
  $("#oreList").innerHTML = P.ores.map((o) => {
    const [y, note] = BEST[o.k], reach = y >= ZMMine.BOTTOM_Y && y <= 64;
    return `<button type="button" class="ol" data-o="${o.k}" style="--oc:${o.col}">
      <span class="ol-ic">${img(oreIcon(o))}</span><span class="ol-n"><b>${esc(o.n)}</b><small>${note ? esc(note) : "&nbsp;"}</small></span>
      <span class="ol-y"><small>лучше всего</small>Y ${y < 0 ? "−" + -y : y}</span>
      ${reach ? `<span class="ol-go" data-go="${y}">спуститься ↓</span>` : `<span class="ol-go off">выше шахты</span>`}</button>`;
  }).join("");
  $("#oreList").onclick = (e) => {
    const go = e.target.closest("[data-go]"), b = e.target.closest("[data-o]");
    if (b) { orePick = b.dataset.o; ZM.store.set("p04.ore", orePick); syncOre(); drawOre(); sfx("click", 0.4); }
    if (go) {
      const y = +go.dataset.go;
      scrollTo({ top: Math.max(0, mine.pageYOfY(y) - innerHeight * 0.5 + mine.tile / 2), behavior: "smooth" });
    }
  };
  const syncOre = () => $$(".ol").forEach((b) => b.classList.toggle("on", b.dataset.o === orePick));
  syncOre();
  new ResizeObserver(drawOre).observe(oreCv);
  Promise.all(jobs).then(drawOre);

  /* ---------- 04.4 Пересвет ---------- */
  const maxMin = 120;
  $("#pv").innerHTML = P.peresvet.map((p) => `<button type="button" class="pvc ${p.lvl ? "" : "none"}" data-l="${p.lvl}" style="--f:${p.minutes / maxMin}">
      <span class="pvc-book ${p.lvl ? "glint" : ""}" style="--ic:url('${new URL(V(p.lvl ? "item_enchanted_book" : "item_golden_helmet"), location.href).href}')">${img(p.lvl ? V("item_enchanted_book") : ICON("p4:miner_helmet"))}</span>
      <span class="pvc-n">${p.lvl ? "Пересвет " + ROMAN[p.lvl] : "Без чар"}</span>
      <span class="pvc-t"><b>${p.minutes}</b> мин</span>
      <span class="pvc-bar"><i></i></span>
      <span class="pvc-row"><span>−1 прочности</span><b>${fmt(p.drain / 20)} с</b></span>
      <span class="pvc-row"><span>Спешка</span><b>${ROMAN[p.haste]}</b></span>
      <span class="pvc-row"><span>Сила чар</span><b>${p.cost ? p.cost[0] + "–" + p.cost[1] : "—"}</b></span>
    </button>`).join("");
  $("#pv").onclick = (e) => { const c = e.target.closest("[data-l]"); if (c) setLvl(+c.dataset.l); };
  $("#pvFacts").innerHTML = [["Редкость", "редкие"], ["Макс. уровень", "III"], ["Куда", "Каска Шахтёра и книги"], ["Где взять", "стол зачарования, библиотекари"], ["Сокровище", "нет"]]
    .map(([k, v]) => `<span><small>${k}</small>${v}</span>`).join("");

  /* ---------- 04.6 крафт (recipes/04_miner/miner_helmet.json) ---------- */
  const R = P.recipe;
  $("#craftBox").innerHTML = `
    <div class="cg">
      <div class="cg-grid">${R.grid.map((id) => `<span class="cg-s">${id ? img(V("item_" + id)) : ""}</span>`).join("")}</div>
      <span class="cg-arrow"></span>
      <button type="button" class="cg-s cg-out" id="cgOut" title="Забрать">${img(ICON("p4:miner_helmet"))}</button>
    </div>
    <div class="cg-txt"><b>Фонарь на шлем</b><p>Обычный фонарь ставится над золотым шлемом, и всё: получается Каска Шахтёра. Нажми на результат, чтобы забрать.</p>
      <div class="cg-anvil">${img(ICON("p4:miner_helmet"))}<span>+</span>${img(V("item_gold_ingot"))}<span>→</span>${img(ICON("p4:miner_helmet"))}<small>зарядка: +${MAX / 4} прочности за слиток</small></div></div>`;
  $("#cgOut").onclick = () => {
    sfx("pop", 0.6); sfx("lantern", 0.5);
    $("#cgOut").classList.remove("took"); void $("#cgOut").offsetWidth; $("#cgOut").classList.add("took");
    grant("craft_helmet");
  };

  /* ---------- 04.7 достижения (ветка как на №01–03) ---------- */
  $("#advBoard").style.setProperty("--tile", `url("${new URL(V("stone"), location.href).href}")`);
  renderTree = function (pulse) {
    const open = ADV.filter((a) => got.includes(a.key)), hidden = ADV.length - open.length;
    if (!advSel || !got.includes(advSel)) advSel = open.length ? open[open.length - 1].key : null;
    $("#advChain").innerHTML = open.length
      ? open.map((a, i) => (i ? `<div class="adv-link on"></div>` : "") + `
        <button type="button" class="adv-node ${pulse === a.key ? "pulse" : ""} ${advSel === a.key ? "sel" : ""}" data-k="${a.key}" aria-label="${esc(plain(a.title))}">
          <span class="adv-frame ${a.frame}"></span>${advIc(a, 32)}</button>`).join("") + (hidden ? `<div class="adv-link"></div><div class="adv-more">+${hidden} скрыто</div>` : "")
      : `<div class="adv-empty">Тут пусто. Ачивки появляются, только когда получишь их.<br>Забери каску из верстака в «Крафте» или посади батарейку до нуля.</div>`;
    const a = ADV.find((x) => x.key === advSel);
    if (!a) {
      $("#advDetail").innerHTML = `<div class="big"><span class="adv-frame task locked"></span><span class="q">?</span></div>
        <div class="txt"><div class="tt">???</div><div class="dd">Ни одной ачивки пока нет</div><div class="cc">В ветке ${ADV.length} ачивки, все скрыты</div></div>`;
    } else {
      const i = ADV.indexOf(a);
      $("#advDetail").innerHTML = `
        <div class="big"><span class="adv-frame ${a.frame}"></span>${advIc(a, 38)}</div>
        <div class="txt"><div class="tt">${mc(a.title)}</div><div class="dd">${mc(a.description, "#aaa")}</div>
          <div class="cc">${esc(a.how)}${i ? ` · после «${esc(plain(ADV[i - 1].title))}»` : " · первая в ветке"}</div></div>
        <div class="meta"><span class="st ok">ПОЛУЧЕНА</span><span>Рамка: ${FRAME_RU[a.frame]}</span><span><b>+${a.xp} XP</b></span></div>`;
    }
    $("#advList").innerHTML = open.map((a) => `<button type="button" class="adv-row has" data-k="${a.key}">
        <span class="fr"><span class="adv-frame ${a.frame}"></span>${advIc(a, 26)}</span>
        <span><span class="t">${mc(a.title)}</span><br><span class="d">${mc(a.description, "#999")}</span></span>
        <span class="x">✓ получена<br>+${a.xp} XP</span></button>`).join("")
      + (hidden ? `<div class="adv-row locked"><span class="fr"><span class="adv-frame task locked"></span><span class="q">?</span></span>
        <span><span class="t">??? × ${hidden}</span><br><span class="d">Скрыта, пока не получишь</span></span></div>` : "");
    $("#advBar").style.width = (open.length / ADV.length) * 100 + "%";
    $("#advTxt").textContent = `${open.length} / ${ADV.length} · ${open.reduce((s, x) => s + x.xp, 0)} / ${ADV.reduce((s, x) => s + x.xp, 0)} XP`;
  };
  const pickAdv = (e) => { const n = e.target.closest("[data-k]"); if (!n) return; advSel = n.dataset.k; renderTree(); };
  $("#advChain").addEventListener("click", pickAdv);
  $("#advList").addEventListener("click", (e) => { if (!e.target.closest("[data-k]")) return; pickAdv(e); $("#advBoard").scrollIntoView({ behavior: "smooth", block: "center" }); });
  $("#advReset").addEventListener("click", () => { got = []; ZM.store.set("p04.adv", got); advSel = null; renderTree(); });
  renderTree();

  /* ---------- 04.6 хронология ---------- */
  $("#timeline").innerHTML = P.history.map((h) => `<article class="tl4-i">
      <div class="tl4-l"><span class="tl4-ver">${esc(h.ver)}</span><time>${esc(h.date)}</time></div>
      <div class="tl4-r"><b>${esc(h.title)}</b><p>${esc(h.text)}</p></div></article>`).join("");

  /* ---------- финал ---------- */
  function finaleText() {
    const total = Object.values(inv).reduce((s, v) => s + v, 0);
    const el = $("#finP"); if (!el) return;
    el.innerHTML = total
      ? `Глубже не копается. По дороге ты накопал <b>${total}</b> шт., из них алмазов: <b>${inv.diamond || 0}</b>.`
      : `Глубже не копается. А ты спустился и ни одного блока не тронул.`;
  }
  finaleText();
  const nav = ZM.pointNav(4);
  $("#finNav").innerHTML = [nav.prev && `<a href="${U(nav.prev.href)}">← №${String(nav.prev.n).padStart(2, "0")} ${esc(nav.prev.title)}</a>`,
    `<a href="${U("index.html")}">Все пункты</a>`,
    nav.next && `<a href="${U(nav.next.href)}">№${String(nav.next.n).padStart(2, "0")} ${esc(nav.next.title)} →</a>`].filter(Boolean).join("");

  /* ---------- метки глубины у заголовков ---------- */
  function tagY() {
    $$(".sec-y").forEach((el) => {
      const r = el.closest(".sec").getBoundingClientRect(), y = mine.yOfRow(mine.rowOfPage(r.top + scrollY));
      el.textContent = "Y " + (y < 0 ? "−" + -y : y);
    });
  }
  new ResizeObserver(() => { tagY(); }).observe(document.body);
  tagY();

  ready = true; depthUI(mine.depthAtView());
  ZM.reveal();
})();
