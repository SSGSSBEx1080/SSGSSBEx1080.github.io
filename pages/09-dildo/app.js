/* =====================================================================
   №09 · Дилдо-блоки
   Поведение из кода мода: DildoBlock, DildoSeatEntity, DildoMaterial,
   DildoEnchantmentHandler, MorichekEnchantment, BedWarsEnchantment.
   Ванильные формулы (1.19.2): таблица улова, стол зачарований, лучи взрыва.
   Данные: data/p09_dildo.js, механика: mod-src/java/p09/MECHANICS.md
   ===================================================================== */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = ZM.esc, U = ZM.url, S = ZM.store, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (n) => Math.floor(Math.random() * n), pick = (a) => a[rnd(a.length)];
  const P = ZM.P09, M = ZM.P09M, MATS = P.mats, TK = P.T;
  const T = (n) => U(`assets/textures/p9/${n.includes("/") ? n : "v/" + n}.png`);
  const ISO = (k) => T(`iso/${k}_dildo`);
  const fmt = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString("ru-RU", { maximumFractionDigits: d });
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };
  const dur = (sec) => { if (!isFinite(sec)) return "никогда"; if (sec < 60) return fmt(sec, 0) + " с"; const m = sec / 60; if (m < 60) return fmt(m, m < 10 ? 1 : 0) + " мин"; const h = m / 60; return h < 48 ? fmt(h, h < 10 ? 1 : 0) + " ч" : fmt(h / 24, 1) + " дн"; };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const imgs = {};
  const IMG = (src) => imgs[src] || (imgs[src] = Object.assign(new Image(), { src }));
  const MC = { 0: "#000000", 4: "#aa0000", 5: "#aa00aa", 6: "#ffaa00", 7: "#aaaaaa", 8: "#555555", a: "#55ff55", b: "#55ffff", c: "#ff5555", d: "#ff55ff", e: "#ffff55", f: "#ffffff" };
  const col = (c, t) => `<span style="color:${MC[c]}">${esc(t)}</span>`;

  ZM.topbar({ crumb: "№09 · Дилдо-блоки", ...ZM.pointNav(9) });

  /* ================= звук ================= */
  const EXT = new Audio().canPlayType("audio/ogg; codecs=vorbis") ? "ogg" : "mp3";
  const MASTER_VOLUME = 0.4;
  const LIB = { slide: ["slide1", "slide2", "slide3"], hbreak: ["hbreak1", "hbreak2", "hbreak3"], hstep: ["hstep1", "hstep2", "hstep3"],
    scream: ["scream1", "scream2", "scream3", "scream4"], retrieve: ["retrieve1", "retrieve2"], explode: ["explode1", "explode2", "explode3"], ench: ["ench1", "ench2", "ench3"] };
  const CORE = ["click", "pop", "orb", "levelup", "stone", "hit", "page", "equip", "enchant", "toast_in", "challenge", "anvil"];
  let sndOn = S.get("p09.snd", true);
  const pool = {};
  function play(name, vol = 1, rate = 1) {
    if (!sndOn) return null;
    if (CORE.includes(name)) return ZM.sfx(name, vol, rate);
    const f = LIB[name] ? pick(LIB[name]) : name;
    const url = U(`assets/sounds/p09/${f}.${EXT}`);
    try {
      const a = (pool[url] || (pool[url] = new Audio(url))).cloneNode();
      a.volume = clamp(vol * MASTER_VOLUME, 0, 1); a.playbackRate = rate; a.preservesPitch = false;
      a.play().catch(() => {});
      return a;
    } catch (e) { return null; }
  }
  const bSnd = $("#sndBtn");
  const syncSnd = () => { bSnd.setAttribute("aria-pressed", sndOn); bSnd.classList.toggle("on", sndOn); };
  bSnd.onclick = () => { sndOn = !sndOn; S.set("p09.snd", sndOn); syncSnd(); if (sndOn) play("click", 0.6); };
  ZM.sfx.bind(() => sndOn);
  syncSnd();

  /* ================= чат ================= */
  const chatEl = $("#chat");
  function chat(html, life = 8000) {
    const p = document.createElement("p"); p.innerHTML = html; chatEl.appendChild(p);
    while (chatEl.children.length > 6) chatEl.firstChild.remove();
    setTimeout(() => p.classList.add("old"), life); setTimeout(() => p.remove(), life + 1200);
  }

  /* ================= общее состояние + скорборд ================= */
  const st = { mat: clamp(S.get("p09.mat", 4), 0, 8), res: {}, fish: 0, treasure: 0, ench: { morichek: false, bed_wars: true } };
  const listeners = [];
  const onMat = (fn) => listeners.push(fn);
  function setMat(i, from) {
    if (i === st.mat && from !== "init") return;
    st.mat = i; S.set("p09.mat", i);
    listeners.forEach((fn) => fn(i, from));
    sb();
  }
  let sbT = 0;
  function sb(bump) {
    const m = MATS[st.mat], seat = seatState();
    const total = Object.values(st.res).reduce((a, b) => a + b, 0);
    const top = Object.entries(st.res).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const en = [st.ench.morichek && "М", st.ench.bed_wars && "Б"].filter(Boolean).join("+") || "нет";
    const L = [
      ["Материал:", `<span style="color:${m.color}">${esc(m.short)}</span>`],
      ["Сидит:", seat.who ? `<span class="grn">${esc(seat.who)}</span>` : `<span class="gr">никто</span>`],
      ["Сидит уже:", seat.who ? `<span class="yl">${fmt(seat.t / 20, 1)} с</span>` : `<span class="gr">—</span>`],
      null,
      ["Ресурсы:", `<span class="aq${bump === "res" ? " bump" : ""}">${total}</span>`],
      ...top.map(([k, n]) => [`<span class="gr">&nbsp;${esc(MATS.find((x) => x.k === k).drop.name.split(" ")[0])}</span>`, `<span style="color:${MC[MATS.find((x) => x.k === k).drop.c]}">${n}</span>`]),
      ["Улов:", `<span class="${bump === "fish" ? "bump " : ""}yl">${st.fish}</span>`],
      ["Чары:", `<span class="pk">${en}</span>`],
      null,
      ["Ачивки:", `<span class="gd">${got.length}/${P.advancements.length}</span>`],
    ];
    $("#sbLines").innerHTML = L.map((l) => l ? `<div><span>${l[0]}</span>${l[1]}</div>` : `<div class="gap"></div>`).join("");
  }

  /* ================= ачивки ================= */
  const ADV = P.advancements;
  let got = S.get("p09.adv", []).filter((k) => ADV.some((a) => a.key === k));
  let advSel = null, renderTree = () => {};
  function grant(key) {
    const a = ADV.find((x) => x.key === key);
    if (!a || got.includes(key)) return;
    got.push(key); S.set("p09.adv", got);
    ZM.toast({ iconHtml: `<img src="${T(a.icon)}" alt="" style="width:100%;height:100%;object-fit:contain">`, title: `<span style="color:${MC[a.color]}">${esc(a.title)}</span>`, frame: a.frame });
    if (a.chat) chat(`Игрок получил достижение ${col("a", "[" + a.title + "]")}`);
    advSel = key; renderTree(key); sb();
  }

  /* ================= 3D-модель (WebGL, как в игре; без WebGL — изометрическая иконка) ================= */
  function view3d(box, opt = {}) {
    let v = null, rot = { x: -16, y: 35 }, drag = null, last = 0, spin = opt.spin ?? 14, kick = 0;
    function build() {
      box.innerHTML = ""; if (v) { v.destroy && v.destroy(); v = null; }
      const k = MATS[st.mat].k;
      if (!(window.ZMGL && ZMGL.supported())) { box.innerHTML = `<img src="${ISO(k)}" alt="" style="width:70%;height:70%;object-fit:contain;margin:auto;display:block">`; return; }
      const model = M[k], bb = ZMModel3D.bbox(model), r = box.getBoundingClientRect();
      const unit = Math.min(r.width || 300, r.height || 300) * (opt.fill || 0.5) / Math.max(...bb.size, 8);
      v = ZMGL.build(model, U("assets/textures/p9/"), { unit, persp: 1400, onFail: () => { box.innerHTML = `<img src="${ISO(k)}" alt="" style="width:70%;margin:auto;display:block">`; v = null; } });
      if (!v) return;
      v.el.style.cssText = "width:100%;height:100%;display:block";
      box.appendChild(v.el); v.setRot([["x", rot.x], ["y", rot.y]]);
    }
    box.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, rx: rot.x, ry: rot.y }; box.setPointerCapture(e.pointerId); });
    box.addEventListener("pointermove", (e) => { if (!drag) return; rot.y = drag.ry + (e.clientX - drag.x) * 0.5; rot.x = clamp(drag.rx - (e.clientY - drag.y) * 0.4, -80, 80); last = performance.now(); v && v.setRot([["x", rot.x], ["y", rot.y]]); });
    const up = () => { drag = null; };
    box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);
    box.addEventListener("contextmenu", (e) => e.preventDefault());
    let vis = true;
    new IntersectionObserver((es) => { vis = es[0].isIntersecting; }).observe(box);
    return {
      build,
      kick() { kick = 720; },
      tick(dt, now) {
        if (!v || !vis || drag) return;
        if (kick > 0) { const d = Math.min(kick, dt * 900); kick -= d; rot.y += d; }
        else if (now - last > 1500 && !reduce) rot.y += dt * spin;
        rot.x += (-16 - rot.x) * Math.min(1, dt * (now - last > 1500 ? 1.5 : 0));
        v.setRot([["x", rot.x], ["y", rot.y]]);
      },
    };
  }
  const hero3d = view3d($("#heroStage"), { fill: 0.62 });
  const fin3d = view3d($("#finStage"), { fill: 0.56, spin: 20 });
  $("#finStage").addEventListener("click", () => { fin3d.kick(); play("slide", 0.6, 1.1); });

  /* ================= HERO: материал, голограмма генератора ================= */
  const matBtn = (m, i, cls) => `<button type="button" class="${cls}" role="radio" data-i="${i}" style="--c:${m.color}" data-tip="${esc(m.name)}" data-tip-sub="zitraksmode:${m.k}_dildo" aria-label="${esc(m.name)}"><img src="${ISO(m.k)}" alt=""></button>`;
  $("#heroMats").innerHTML = MATS.map((m, i) => matBtn(m, i, "mat-b")).join("");
  $("#heroMats").addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (!b) return; setMat(+b.dataset.i); play("hstep", 0.7, 1 + Math.random() * 0.2); });
  function holo() {
    const m = MATS[st.mat], s = seatState();
    $("#ghItem").src = T(m.drop.icon);
    $("#ghL1").textContent = m.drop.name; $("#ghL1").style.color = MC[m.drop.c] === "#ffffff" ? "#fff" : MC[m.drop.c];
    let t = "Посади кого-нибудь";
    if (s.who && !st.ench.bed_wars) t = "Нужна чара «БЭД Варс»";
    else if (s.who && s.t < TK.buff) t = `Разгон: <b>${Math.ceil((TK.buff - s.t) / 20)}</b> с`;
    else if (s.who && s.next > 0) t = `Появится через <b>${Math.ceil(s.next / 20)}</b> с`;
    $("#ghL2").innerHTML = t;
  }
  onMat(() => { $$("#heroMats .mat-b").forEach((b, i) => { b.classList.toggle("on", i === st.mat); b.setAttribute("aria-checked", i === st.mat); }); hero3d.build(); fin3d.build(); holo(); });

  /* ================= I · МАГАЗИН ================= */
  $("#shopGrid").innerHTML = MATS.map((m, i) => `<button type="button" class="slot9" role="option" data-i="${i}" data-tip="${esc(m.name)}" data-tip-info="прочность ${fmt(m.hard)} · взрыв ${fmt(m.res, 0)}" data-tip-sub="zitraksmode:${m.k}_dildo"><img src="${ISO(m.k)}" alt="${esc(m.name)}">${m.gazan ? `<span class="gz">Газан</span>` : ""}</button>`).join("");
  $("#shopGrid").addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (!b) return; setMat(+b.dataset.i); play("pop", 0.5, 1.2); });
  const logBar = (v, max) => (Math.log10(1 + v) / Math.log10(1 + max)) * 100;
  function shopCard() {
    const m = MATS[st.mat], c = m.craft;
    const cells = " Q | Q |QQQ".replace(/\|/g, "").split("");
    const grid = `<div class="cg9${c ? "" : " none"}"><span class="t">Создание</span>${c ? cells.map((ch, i) => ch === "Q" ? `<span class="c" style="left:${(30 + (i % 3) * 18) / 176 * 100}%;top:${(17 + Math.floor(i / 3) * 18) / 80 * 100}%" data-tip="${esc(c.name)}"><img src="${T("iso/" + c.icon)}" alt=""></span>` : "").join("") : ""}
      <span class="c res${have.has(m.k) ? " got" : ""}" style="left:${124 / 176 * 100}%;top:${35 / 80 * 100}%" data-tip="${esc(m.name)}" data-tip-sub="zitraksmode:${m.k}_dildo" data-tip-info="${c ? "клик: забрать" : "клик: забрать дроп Газана"}"><img src="${ISO(m.k)}" alt=""></span></div>`;
    $("#shopCard").innerHTML = `
      <div class="sc-ic"><img src="${ISO(m.k)}" alt=""></div>
      <div>
        <div class="sc-id">zitraksmode:${m.k}_dildo</div>
        <div class="sc-name" style="text-shadow:0 0 22px ${m.color}66">${esc(m.name)}</div>
        <div class="sc-stats">
          <div><b>${fmt(m.hard)}</b><span>прочность</span></div>
          <div><b>${fmt(m.res, 0)}</b><span>взрывостойкость</span></div>
          <div><b>${m.tool ? "нужна" : "рукой"}</b><span>${m.tool ? "кирка для дропа" : "ломается"}</span></div>
        </div>
        <div class="bars">
          <div class="bar"><span>прочность</span><i><u style="width:${logBar(m.hard, 50)}%"></u></i><b>${fmt(m.hard)}</b></div>
          <div class="bar"><span>взрыв</span><i><u style="width:${logBar(m.res, 1200)}%"></u></i><b>${fmt(m.res, 0)}</b></div>
        </div>
        ${m.k === "tnt" ? `<div class="sc-warn">Сломаешь в выживании, и он взорвётся как настоящий TNT</div>` : ""}
        ${c ? `<div class="sc-cost">Стоимость: <img src="${T("iso/" + c.icon)}" alt=""><span class="c">${c.n} × ${esc(c.name)}</span><span>= ${c.n * c.per} ${esc(c.unit)}${c.extra ? " " + esc(c.extra) : ""}</span></div>`
            : `<div class="sc-cost gz">Не крафтится. Выпадает только с Газана 67 (пункт №19)</div>`}
      </div>
      <div class="sc-craft">${grid}<div class="sc-drop"><img src="${T(m.drop.icon)}" alt=""><span>С чарой «БЭД Варс» выдаёт<br><b>${esc(m.drop.name)}</b> раз в 60–80 с</span></div><div class="sc-have" id="scHave">${haveTxt()}</div></div>`;
  }
  onMat(() => { $$("#shopGrid .slot9").forEach((b, i) => b.classList.toggle("on", i === st.mat)); shopCard(); });
  // инвентарь: забрал результат крафта = ачивка inventory_changed
  const have = new Set(S.get("p09.have", []));
  const CRAFT_ADV = { mud: "craft_mud", stone: "craft_stone", iron: "craft_iron", gold: "craft_gold", diamond: "craft_diamond", emerald: "craft_emerald", obsidian: "craft_obsidian", tnt: "craft_tnt", netherite: "craft_netherite" };
  function haveTxt() { return `в инвентаре <b>${have.size}</b> из 9 ${MATS.map((m) => `<i class="${have.has(m.k) ? "on" : ""}" style="--c:${m.color}"></i>`).join("")}`; }
  const syncHave = () => { $$("#shopGrid .slot9").forEach((b, i) => b.classList.toggle("have", have.has(MATS[i].k))); const h = $("#scHave"); if (h) h.innerHTML = haveTxt(); };
  $("#shopCard").addEventListener("click", (e) => {
    const r = e.target.closest(".c.res"); if (!r) return;
    const m = MATS[st.mat], im = $("img", r), to = $$("#shopGrid .slot9")[st.mat];
    if (im && to) {
      const a = im.getBoundingClientRect(), z = $("img", to).getBoundingClientRect(), f = im.cloneNode();
      f.style.cssText = `position:fixed;z-index:150;left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px;pointer-events:none;transition:transform .55s cubic-bezier(.5,-0.3,.6,1),opacity .55s`;
      document.body.appendChild(f);
      requestAnimationFrame(() => { f.style.transform = `translate(${z.left - a.left}px,${z.top - a.top}px) scale(${z.width / a.width})`; f.style.opacity = 0.4; });
      setTimeout(() => f.remove(), 600);
    }
    play("pop", 0.5, 1.2 + Math.random() * 0.3);
    r.classList.add("got");
    const fresh = !have.has(m.k); have.add(m.k); S.set("p09.have", [...have]);
    setTimeout(() => { syncHave(); grant(CRAFT_ADV[m.k]); if (fresh && have.size === 9) setTimeout(() => grant("gay_master"), 900); }, 560);
  });

  /* ================= II · ПОСАДКА ================= */
  const SIT = P.sitters;
  const seat = { who: null, t: 0, next: -1, sitter: 0, walker: null, acc: 0, speed: 1, parts: [], drops: [], shake: 0, screamT: 0, buffShown: false };
  function seatState() { return { who: seat.who != null ? SIT[seat.who].name : null, t: seat.t, next: seat.next }; }
  const cv = $("#seatCv"), cx = cv.getContext("2d");
  const W = cv.width, H = cv.height, FLOOR = 380, SC = 8, SEAT_Y = 11;   // низ спрайта сидящего: бёдра на ~15 px из 17,3
    // 1 тексель = 8 px, блок = 128 px
  $("#whoGrid").innerHTML = SIT.map((s, i) => `<button type="button" role="radio" data-i="${i}" data-tip="${esc(s.name)}" data-tip-info="${esc(P.kinds[s.kind])} · ×${fmt(s.mult)}" aria-label="${esc(s.name)}"><img src="${T("mob/" + s.k + "_face")}" alt=""></button>`).join("");
  function seatLog(html, c = "#888") {
    const li = document.createElement("li"); li.style.setProperty("--c", c);
    li.innerHTML = `<small>${fmt(seat.t / 20, 1)} с</small>${html}`;
    const ol = $("#seatLog"); ol.prepend(li); while (ol.children.length > 9) ol.lastChild.remove();
  }
  function whoInfo() {
    const s = SIT[seat.sitter];
    $("#whoInfo").innerHTML = `<b>${esc(s.name)}</b> · ${esc(P.kinds[s.kind])}, генератор ×${fmt(s.mult)}${s.mult > 1 ? " быстрее" : ""}${s.note ? ` · ${esc(s.note)}` : ""}`;
    $$("#whoGrid button").forEach((b, i) => { b.classList.toggle("on", i === seat.sitter); b.setAttribute("aria-checked", i === seat.sitter); });
    $("#seatWalk").hidden = s.kind === "player";
    seatBtn();
  }
  function seatBtn() {
    const s = SIT[seat.sitter];
    const bb = $("#seatBreak"); if (bb) bb.innerHTML = MATS[st.mat].k === "tnt" ? "⛏ Сломать (TNT!)" : "⛏ Сломать";
    $("#seatGoT").textContent = seat.who != null ? (SIT[seat.who].kind === "player" ? "Встать" : "Сломать блок") : s.kind === "player" ? "Сесть" : "Посадить";
  }
  function nextGen() { return Math.max(1, Math.round((TK.genMin + rnd(TK.genMax - TK.genMin + 1)) / SIT[seat.who].mult)); }   // враждебные ×1,2 быстрее, нейтральные ×1,1
  function sitDown(i) {
    seat.who = i; seat.t = 0; seat.next = -1; seat.buffShown = false; seat.walker = null;
    play("slide", 0.9); play(SIT[i].kind === "player" ? "hstep" : SIT[i].k, 0.5);
    seatLog(`${esc(SIT[i].name)} ${SIT[i].kind === "player" ? "сел (ПКМ)" : "сел сам: был ближе 0,9 блока"}`, "#ff4fd8");
    fxIcons(); seatBtn(); sb();
  }
  function standUp(broke) {
    if (seat.who == null) return;
    const n = SIT[seat.who].name;
    seat.who = null; seat.t = 0; seat.next = -1; seat.parts.length = 0;
    if (broke && MATS[st.mat].k === "tnt") setTimeout(() => grant("joker_trap"), 300);
    if (broke) { play("hbreak", 0.9); seatLog(`блок сломан: сиденье исчезло, ${esc(n)} выкинут`, "#ff5555"); setTimeout(() => play("hstep", 0.6), 250); }
    else { play("hstep", 0.6); seatLog(`${esc(n)} встал: слез на 1,5 блока вбок`, "#aaa"); }
    fxIcons(); seatBtn(); sb(); holo();
  }
  function fxIcons() {
    const on = seat.who != null && SIT[seat.who].kind === "player" && st.ench.morichek && seat.t >= TK.buff;
    const html = on ? `<img src="${T("eff_resistance")}" alt="Сопротивление I" title="Сопротивление I"><img src="${T("eff_luck")}" alt="Удача V" title="Удача V">` : "";
    if ($("#seatFx").innerHTML !== html) $("#seatFx").innerHTML = html;
  }
  $("#whoGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-i]"); if (!b) return;
    const i = +b.dataset.i; if (i === seat.sitter) return;
    if (seat.who != null) standUp(false);
    seat.sitter = i; seat.walker = null; whoInfo(); play(SIT[i].kind === "player" ? "click" : SIT[i].k, 0.4);
  });
  // ломаем блок: сиденье исчезает, блок выпадает сам; TNT-дилдо в выживании поджигает настоящий TNT (playerWillDestroy)
  function breakBlock() {
    if (seat.primed || seat.gone) return;
    const m = MATS[st.mat];
    if (seat.who != null) standUp(true); else play("hbreak", 0.9);
    seat.walker = null;
    seat.drops.push({ x: 0.15, vy: -0.3, y: 0.6, icon: "iso/" + m.k + "_dildo", age: 0 });
    if (m.k === "tnt") {
      seat.primed = 80; play("fuse", 0.7);
      seatLog(`${col("c", "TNT-дилдо сломан в выживании:")} зажёгся настоящий TNT, 4 секунды`, "#ff5555");
      setTimeout(() => grant("joker_trap"), 400);
    } else { seat.gone = 30; seatLog(`${esc(m.name)} сломан и выпал целым, ставлю обратно`, "#aaa"); }
    seatBtn();
  }
  $("#seatBreak").addEventListener("click", breakBlock);
  function seatAction() {
    if (seat.primed || seat.gone) return;
    if (seat.who != null) { if (SIT[seat.who].kind === "player") standUp(false); else breakBlock(); return; }
    const s = SIT[seat.sitter];
    if (s.kind === "player") sitDown(seat.sitter);
    else seat.walker = { i: seat.sitter, x: 3.2, stop: false };   // идёт сам, сядет, когда подойдёт
  }
  $("#seatGo").addEventListener("click", seatAction);
  cv.addEventListener("click", seatAction);
  $("#seatWalk").addEventListener("click", () => { seat.walker = { i: seat.sitter, x: 3.2, stop: false }; play("click", 0.4); });
  $$(".speed button").forEach((b) => b.addEventListener("click", () => { seat.speed = +b.dataset.s; $$(".speed button").forEach((x) => x.classList.toggle("on", x === b)); }));
  const syncEnch = () => { $("#enMor").checked = st.ench.morichek; $("#enBed").checked = st.ench.bed_wars; sb(); fxIcons(); holo(); };
  $("#enMor").addEventListener("change", (e) => { st.ench.morichek = e.target.checked; play("ench", 0.5); syncEnch(); });
  $("#enBed").addEventListener("change", (e) => { st.ench.bed_wars = e.target.checked; if (!st.ench.bed_wars) seat.next = -1; play("ench", 0.5); syncEnch(); });
  onMat(() => seatBtn());
  onMat((i, from) => { if (from !== "init" && seat.who != null) { seatLog("поставлен другой материал: таймер заново", "#aaa"); seat.t = 0; seat.next = -1; } });

  function seatTick() {   // один серверный тик DildoSeatEntity
    if (seat.primed) {
      if (--seat.primed <= 0) { seat.primed = 0; seat.blast = 34; seat.shake = 1.4; play("explode", 0.8); seatLog("Бабах. Сидеть больше не на чем", "#ff5555"); seat.drops.length = 0; }
      return;
    }
    if (seat.blast) { if (--seat.blast <= 0) { seat.blast = 0; seat.gone = 20; } return; }
    if (seat.gone) { if (--seat.gone <= 0) { seat.gone = 0; play("hstep", 0.6); seatLog("новый блок поставлен", "#aaa"); seatBtn(); } return; }
    const w = seat.walker;
    if (w) {   // forceNearbyMobToSit: ближайший моб в AABB(pos).inflate(0.9, 0.7, 0.9)
      if (seat.who == null && Math.abs(w.x) <= 0.9 + 0.5) { sitDown(w.i); return; }
      const stopAt = seat.who != null ? 1.6 : 0;
      if (w.x > stopAt) w.x -= 0.1;   // 2 блока в секунду
      else if (!w.stop) { w.stop = true; if (seat.who != null) seatLog(`${esc(SIT[w.i].name)} подошёл: место занято`, "#aaa"); }
    }
    if (seat.who == null) return;
    seat.t++;
    const t = seat.t, s = SIT[seat.who];
    if (t === TK.buff) {
      if (st.ench.morichek && s.kind === "player") { seatLog(`${col("b", "Сопротивление I")} и ${col("a", "Удача V")}, рыба клюёт сразу`, "#55ffff"); play("orb", 0.5, 0.8); }
      if (st.ench.bed_wars) { seat.next = nextGen(); seatLog(`генератор запущен: первый ресурс через ${fmt(seat.next / 20, 0)} с`, MATS[st.mat].color); play("orb", 0.4, 1.3); }
      fxIcons();
    }
    if (st.ench.bed_wars && t >= TK.buff) {
      if (seat.next < 0) seat.next = nextGen();
      if (--seat.next <= 0) { seatDrop(); seat.next = nextGen(); }
    }
    if (t >= TK.long && t % TK.particle === 0 && seat.speed <= 10) spawnDrips();
    if (t === TK.long) { seatLog("10 секунд: пошли лава, споры и крики эндермена", "#ff5555"); if (s.kind === "player") grant("gay_chair"); }
    if (t >= TK.long && t % TK.scream === 0) { seat.shake = 1; if (seat.speed <= 10) play("scream", 0.35, 0.95 + Math.random() * 0.1); }
  }
  function seatDrop() {
    const m = MATS[st.mat];
    st.res[m.k] = (st.res[m.k] || 0) + 1;
    seat.drops.push({ x: (Math.random() - 0.5) * 1.4, vy: -0.25, y: 0.5, icon: m.drop.icon, age: 0 });
    if (seat.drops.length > 10) seat.drops.shift();
    play("pop", 0.5, 0.9 + Math.random() * 0.3);
    seatLog(`выпал ресурс: ${col(m.drop.c, m.drop.name)}`, m.color);
    sb("res");
  }
  function spawnDrips() {
    for (let i = 0; i < 5; i++) {
      const ox = (Math.random() - 0.5) * 0.3;
      seat.parts.push({ k: "p_lava", x: ox, y: 0.5 + 0.5, vy: -0.1, life: 40 });
      seat.parts.push({ k: "p_spore", x: ox + (Math.random() - 0.5) * 0.2, y: 0.5 + 0.3, vy: -0.03, life: 60 });
    }
    if (seat.parts.length > 400) seat.parts.splice(0, seat.parts.length - 400);
  }
  // рисуем модель спереди (грань north): основание 16×4,5 и ствол 5×12,8, как в netherite_dildo.json
  function frontTex(k) { return k === "mud" ? "mod/mud" : k === "tnt" ? "tnt_side" : "mod/" + k; }
  function drawDildo(c, x0, floor, sc, k) {
    const im = IMG(T(frontTex(k))); if (!im.complete) return;
    const X = (x) => x0 + (x - 8) * sc, Y = (y) => floor - y * sc;
    const ib = k === "mud" ? IMG(T("dirt")) : im;   // у грязевого основание земляное, трава только на стволе
    if (ib.complete) c.drawImage(ib, 0, 0, 16, 16, X(-0.075), Y(4.5375), 16.075 * sc, 4.5375 * sc);
    c.drawImage(im, 0, 0, 16, 16, X(5.575), Y(17.325), 4.975 * sc, (17.325 - 4.5375) * sc);
    c.fillStyle = "rgba(0,0,0,.18)"; c.fillRect(X(5.575), Y(4.5375) - 2, 4.975 * sc, 2);   // тень ствола на основании
  }
  function drawMob(c, k, x, bottom, sc, bob) {
    const im = IMG(T("mob/" + k)); if (!im.complete) return;
    c.drawImage(im, Math.round(x - im.width * sc / 2), Math.round(bottom - im.height * sc + bob), im.width * sc, im.height * sc);
  }
  let starsSeat = Array.from({ length: 60 }, () => [Math.random() * W, Math.random() * (FLOOR - 40), Math.random()]);
  function drawSeat(now) {
    const c = cx; c.imageSmoothingEnabled = false;
    const sh = seat.shake > 0 ? seat.shake * 6 : 0; seat.shake = Math.max(0, seat.shake - 0.05);
    c.save(); c.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#12061c"); g.addColorStop(1, "#2a0d33");
    c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    for (const s of starsSeat) { c.fillStyle = `rgba(255,220,255,${0.3 + 0.5 * Math.abs(Math.sin(now / 900 + s[2] * 9))})`; c.fillRect(s[0] | 0, s[1] | 0, 2, 2); }
    // остров: розовая шерсть сверху, эндерняк ниже
    const wool = IMG(T("pink_wool")), es = IMG(T("end_stone"));
    for (let x = -1; x < W / 80 + 1; x++) {
      if (wool.complete) c.drawImage(wool, x * 80, FLOOR, 80, 80);
      if (es.complete) c.drawImage(es, x * 80, FLOOR + 80, 80, 80);
    }
    c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(0, FLOOR, W, 4);
    const cx0 = W / 2;
    // зона захвата моба: 0,9 блока от блока
    if (seat.who == null && seat.walker) {
      c.strokeStyle = "rgba(255,79,216,.7)"; c.setLineDash([8, 6]); c.lineWidth = 2;
      c.beginPath(); c.ellipse(cx0, FLOOR - 4, (0.5 + 0.9) * 16 * SC, 16, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    }
    // свечение чар
    if (st.ench.morichek || st.ench.bed_wars) { const gg = c.createRadialGradient(cx0, FLOOR - 90, 10, cx0, FLOOR - 90, 190); gg.addColorStop(0, `rgba(179,123,255,${0.18 + 0.08 * Math.sin(now / 300)})`); gg.addColorStop(1, "rgba(179,123,255,0)"); c.fillStyle = gg; c.fillRect(cx0 - 200, FLOOR - 300, 400, 300); }
    if (seat.primed) {   // зажжённый TNT мигает белым
      const tn = IMG(T("tnt_side")), sz = 16 * SC, sc2 = 1 + (seat.primed < 12 ? (12 - seat.primed) * 0.012 : 0);
      if (tn.complete) c.drawImage(tn, cx0 - (sz * sc2) / 2, FLOOR - sz * sc2, sz * sc2, sz * sc2);
      if (Math.floor(seat.primed / 5) % 2 === 0) { c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(cx0 - (sz * sc2) / 2, FLOOR - sz * sc2, sz * sc2, sz * sc2); }
    } else if (seat.blast) {
      c.save(); c.filter = "sepia(1) saturate(2.4) hue-rotate(-12deg)";
      const fr = Math.min(15, Math.floor((34 - seat.blast) / 2));
      for (let k = 0; k < 9; k++) { const e = IMG(T(`explosion_${(fr + k * 2) % 16}`)); const ang = k * 0.7, r = 40 + (k % 3) * 50; if (e.complete) c.drawImage(e, cx0 + Math.cos(ang) * r * 1.4 - 80, FLOOR - 90 + Math.sin(ang) * r * 0.6 - 80, 160, 160); }
      c.restore();
      if (seat.blast > 28) { c.fillStyle = `rgba(255,240,220,${(seat.blast - 28) * 0.1})`; c.fillRect(-10, -10, W + 20, H + 20); }
    } else if (!seat.gone) drawDildo(c, cx0, FLOOR, SC, MATS[st.mat].k);
    // выпавшие ресурсы: крутятся и подпрыгивают, как предметы на земле
    for (const d of seat.drops) {
      d.age++; if (d.y > 0.12) { d.vy += 0.02; d.y -= d.vy * 0.2; } else d.y = 0.12;
      const im = IMG(T(d.icon)); if (!im.complete) continue;
      const iso = d.icon.startsWith("iso/"), s = iso ? 40 : 34, sx = iso ? 1 : Math.abs(Math.cos(now / 600 + d.x * 5));
      c.drawImage(im, cx0 + d.x * 16 * SC * 1.3 - (s * sx) / 2, FLOOR - d.y * 16 * SC - s + Math.sin(now / 400 + d.x) * 3, s * sx, s);
    }
    // сидящий (чуть ниже кончика) и идущий моб
    if (seat.who != null) drawMob(c, SIT[seat.who].k, cx0, FLOOR - SEAT_Y * SC, SC, 0);
    const wk = seat.walker;
    if (wk && seat.who !== wk.i) drawMob(c, SIT[wk.i].k, cx0 + wk.x * 16 * SC, FLOOR, SC, wk.stop ? 0 : -Math.abs(Math.sin(now / 120)) * 6);
    // частицы: FALLING_LAVA и CRIMSON_SPORE
    for (let i = seat.parts.length - 1; i >= 0; i--) {
      const p = seat.parts[i]; p.y += p.vy * 0.25; p.life--;
      if (p.y < 0.02 || p.life <= 0) { seat.parts.splice(i, 1); continue; }
      const im = IMG(T(p.k)); if (!im.complete) continue;
      const s = p.k === "p_lava" ? 18 : 12;
      c.drawImage(im, cx0 + p.x * 16 * SC - s / 2, FLOOR - p.y * 16 * SC, s, s);
    }
    // крик эндермена: экран краснеет
    if (seat.shake > 0.3) { c.fillStyle = `rgba(160,0,60,${(seat.shake - 0.3) * 0.3})`; c.fillRect(-10, -10, W + 20, H + 20); }
    c.restore();
    // полоса времени
    const t = seat.who != null ? seat.t / 20 : 0;
    $("#seatFill").style.width = Math.min(100, (t / 20) * 100) + "%";
    $("#seatTime").textContent = fmt(t, 1) + " с";
  }

  /* ================= пересадка по ряду (как сидушки из 26.3) ================= */
  // Сидя жмёшь ПКМ по другому дилдо: use() сажает на его сиденье. Дотянуться можно, пока хитбокс 6×12×6 в пределах досягаемости руки.
  const HOP = [1, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1], HOP_MAT = [4, 4, 2, 0, 3, 5, 0, 0, 6, 7, 1, 8];
  const HOP_H = [0, 1, 0, 0, 2, 1, 0, 0, 0, 1, 2, 0];   // перепады высот: пересаживаться можно вверх и вниз
  const hop = { at: 0, reach: 4.5, n: 0 };
  $("#hopRow").innerHTML = HOP.map((d, i) => `<button type="button" class="hop-c" data-i="${i}" data-nosfx style="--h:${HOP_H[i]}" ${d ? `data-tip="${esc(MATS[HOP_MAT[i]].name)}" data-tip-info="высота ${HOP_H[i]}"` : `aria-label="пусто"`}>${d ? `<img src="${ISO(MATS[HOP_MAT[i]].k)}" alt="">` : ""}<span class="hop-p"></span></button>`).join("")
    + `<div class="hop-tp" id="hopTp"></div><div class="hop-me" id="hopMe"><img src="${T("mob/steve")}" alt="Игрок"></div>`;
  // от глаз сидящего (кончик + ~1,1 блока) до ближайшей точки хитбокса 6×12×6 на другом блоке
  function hopDist(i) {
    const dx = Math.max(0, Math.abs(i - hop.at) - 0.31), eye = HOP_H[hop.at] + 1.1, lo = HOP_H[i], hi = HOP_H[i] + 0.75;
    const dy = eye < lo ? lo - eye : eye > hi ? eye - hi : 0;
    return Math.hypot(dx, dy);
  }
  const canReach = (i) => i !== hop.at && hopDist(i) <= hop.reach;
  function hopPos(i) { const cw = $("#hopRow").clientWidth / 12; return { cw, x: (i + 0.5) * cw - cw * 0.31, y: cw * (0.64 + HOP_H[i]) }; }
  function hopRender(from) {
    const me = $("#hopMe"), p = hopPos(hop.at);
    me.style.width = p.cw * 0.62 + "px"; me.style.left = p.x + "px"; me.style.bottom = p.y + "px";
    if (from != null) {   // телепорт по прямой: вспышка-луч между сиденьями
      const q = hopPos(from), tp = $("#hopTp"), x1 = q.x + p.cw * 0.31, y1 = q.y + p.cw * 0.5, x2 = p.x + p.cw * 0.31, y2 = p.y + p.cw * 0.5;
      tp.style.cssText = `left:${x1}px;bottom:${y1}px;width:${Math.hypot(x2 - x1, y2 - y1)}px;transform:rotate(${-Math.atan2(y2 - y1, x2 - x1)}rad)`;
      tp.classList.remove("on"); void tp.offsetWidth; tp.classList.add("on");
      me.classList.remove("tp"); void me.offsetWidth; me.classList.add("tp");
    }
    $$("#hopRow .hop-c").forEach((c, i) => { c.classList.toggle("reach", !!HOP[i] && canReach(i)); c.classList.toggle("far", !!HOP[i] && i !== hop.at && !canReach(i)); });
    $("#hopInfo").innerHTML = `Рука достаёт на <b>${fmt(hop.reach, 1)}</b> блока, считая и высоту. Подсвечено, куда можно пересесть. Пересадок: <b>${hop.n}</b>`;
  }
  $("#hopRow").addEventListener("click", (e) => {
    const c = e.target.closest(".hop-c"); if (!c) return;
    const i = +c.dataset.i;
    if (!HOP[i] || i === hop.at) return;
    if (!canReach(i)) { c.classList.remove("nope"); void c.offsetWidth; c.classList.add("nope"); play("click", 0.3, 0.6); $("#hopInfo").innerHTML = `<span style="color:#ff5555">Не дотянуться:</span> до хитбокса ${fmt(hopDist(i), 2)} блока, а рука достаёт на ${fmt(hop.reach, 1)}`; return; }
    const from = hop.at; hop.at = i; hop.n++; play("slide", 0.8, 1.05); setTimeout(() => play("hstep", 0.5), 200); hopRender(from);
  });
  $("#hopMode").addEventListener("click", (e) => { const b = e.target.closest("[data-r]"); if (!b) return; hop.reach = +b.dataset.r; $$("#hopMode button").forEach((x) => x.classList.toggle("on", x === b)); hopRender(); });
  hopRender(); addEventListener("resize", () => hopRender());

  /* ================= III · ГЕНЕРАТОР ================= */
  const MULT = { player: 1, mob: 1.1, enemy: 1.2 };
  const gen = { mat: st.mat, kind: "player", n: 1, running: false };
  const BEACON = 164 * 9;   // полная пирамида маяка: 164 блока = 1476 слитков / алмазов / изумрудов
  const beaconOK = (k) => ["iron", "gold", "diamond", "emerald", "netherite"].includes(k);
  const perHour = (k, kind, n) => (72000 / ((TK.genMin + TK.genMax) / 2 / MULT[kind])) * n;
  const craftUnits = (m) => m.craft ? m.craft.n * m.craft.per : 0;
  $("#genMats").innerHTML = MATS.map((m, i) => matBtn(m, i, "")).join("");
  function genRender() {
    const m = MATS[gen.mat], ph = perHour(m.k, gen.kind, gen.n);
    $$("#genMats button").forEach((b, i) => { b.classList.toggle("on", i === gen.mat); b.setAttribute("aria-checked", i === gen.mat); });
    $$("#genKind button").forEach((b) => b.classList.toggle("on", b.dataset.k === gen.kind));
    $("#genNv").textContent = gen.n;
    $("#gPerH").textContent = fmt(ph, ph < 10 ? 1 : 0);
    $("#gPay").textContent = m.craft ? dur((craftUnits(m) * gen.n) / ph * 3600) : "даром";
    $("#gBeacon").textContent = beaconOK(m.k) ? dur(BEACON / ph * 3600) : "не для маяка";
    if (!gen.running) {
      $("#genFarm").innerHTML = Array.from({ length: gen.n }, () => `<div class="gf" style="--drop:url('${T(m.drop.icon)}')"><img src="${ISO(m.k)}" alt=""></div>`).join("");
      $("#genGot").innerHTML = ""; $("#genClock").textContent = "0:00";
    }
    $("#genTable").innerHTML = MATS.map((x, i) => {
      const h = perHour(x.k, gen.kind, gen.n), pay = x.craft ? dur((craftUnits(x) * gen.n) / h * 3600) : `<span class="gz">даром (Газан)</span>`;
      return `<tr class="${i === gen.mat ? "on" : ""}"><td><img src="${ISO(x.k)}" alt=""><b>${esc(x.short)}</b></td><td><img src="${T(x.drop.icon)}" alt="">${esc(x.drop.name)}</td>
        <td>${x.craft ? `${gen.n > 1 ? gen.n + " × " : ""}${x.craft.n} ${esc(x.craft.name.toLowerCase())}` : "—"}</td><td><b>${pay}</b></td><td><b>${fmt(h, h < 10 ? 1 : 0)}</b></td></tr>`;
    }).join("");
  }
  $("#genMats").addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (!b || gen.running) return; gen.mat = +b.dataset.i; genRender(); play("hstep", 0.5); });
  $("#genKind").addEventListener("click", (e) => { const b = e.target.closest("[data-k]"); if (!b || gen.running) return; gen.kind = b.dataset.k; genRender(); });
  $("#genN").addEventListener("input", (e) => { if (gen.running) { e.target.value = gen.n; return; } gen.n = +e.target.value; genRender(); });
  onMat((i) => { if (!gen.running) { gen.mat = i; genRender(); } });
  // час фермы за 10 секунд: у каждого дилдо свой таймер 1200–1600 тиков × множитель
  $("#genRun").addEventListener("click", () => {
    if (gen.running) return;
    gen.running = true; $("#genRun").disabled = true;
    const m = MATS[gen.mat], cells = $$("#genFarm .gf"), mult = MULT[gen.kind];
    const timers = cells.map(() => TK.buff + Math.round((TK.genMin + rnd(401)) / mult));
    let tick = 0, got = 0, last = performance.now(); const TOTAL = 72000, REAL = 10000;
    const icon = `<img src="${T(m.drop.icon)}" alt="">`;
    (function step(now) {
      const adv = Math.min(TOTAL - tick, Math.round((now - last) / REAL * TOTAL)); last = now;
      const t1 = tick + adv;
      timers.forEach((tm, i) => {
        let tt = tm;
        while (tt <= t1) { got++; const c = cells[i]; if (c) { c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop"); } tt += Math.round((TK.genMin + rnd(401)) / mult); }
        timers[i] = tt;
      });
      if (adv && Math.random() < 0.4) play("pop", 0.25, 1 + Math.random() * 0.4);
      tick = t1;
      const min = Math.floor(tick / 1200); $("#genClock").textContent = `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
      $("#genGot").innerHTML = `${icon}× ${got}`;
      if (tick < TOTAL) requestAnimationFrame(step);
      else { gen.running = false; $("#genRun").disabled = false; st.res[m.k] = (st.res[m.k] || 0) + got; sb("res"); play("levelup", 0.5); chat(`Ферма из ${gen.n} ${plural(gen.n, "дилдо", "дилдо", "дилдо")} за час: ${col(m.drop.c, got + " × " + m.drop.name)}`); }
    })(last);
  });

  /* ================= IV · РЫБАЛКА ================= */
  const FP = P.fishing;
  const fish = { st: "idle", t: 0, wait: 0, approach: 0, nibble: 0, bob: { x: 0, y: 0 }, auto: false, casts: 0, caught: 0, time: 0, splash: [], trail: [] };
  const fc = $("#fishCv"), fx = fc.getContext("2d"), FW = fc.width, FH = fc.height, WATER = 200;
  function effW(g, luck) { return Math.max(0, Math.floor(g.weight + g.quality * luck)); }
  function rollLoot(luck) {
    const gs = FP.groups.map((g) => [g, effW(g, luck)]), tot = gs.reduce((a, b) => a + b[1], 0);
    let r = Math.random() * tot, g = gs[0][0];
    for (const [gg, w] of gs) { if ((r -= w) < 0) { g = gg; break; } }
    const it = g.items, iw = it.reduce((a, b) => a + b[2], 0); let q = Math.random() * iw, item = it[0];
    for (const x of it) { if ((q -= x[2]) < 0) { item = x; break; } }
    return { g, item };
  }
  function fishOdds() {
    const L = (luck) => { const w = FP.groups.map((g) => effW(g, luck)), t = w.reduce((a, b) => a + b, 0); return w.map((x) => (x / t) * 100); };
    const a = L(0), b = L(FP.luckV);
    $("#fishOdds").innerHTML = `<div class="lbl">Таблица улова: без удачи и с Удачей V</div><div class="odds"><div class="odd-h"><span></span><span>обычно</span><span>Удача V</span></div>${FP.groups.map((g, i) => `<div class="odd" style="--c:${g.c}"><span>${esc(g.name)}</span><i><u style="width:${a[i]}%"></u><em>${fmt(a[i], 1)}%</em></i><i><u style="width:${b[i]}%"></u><em>${fmt(b[i], 1)}%</em></i></div>`).join("")}</div>
      <p style="margin:10px 0 0;font-size:12.5px;color:var(--dim)">Вес группы = вес + качество × удача: рыба 85 − 1×5, хлам 10 − 2×5 = 0, сокровища 5 + 2×5 = 15.</p>`;
  }
  const morOn = () => $("#fishMor").checked;
  function fishStat() {
    const perMin = fish.time > 0 ? fish.caught / (fish.time / 1200) : 0;
    $("#fishStat").innerHTML = `<div><b>${fish.caught}</b><span>поймано</span></div><div><b>${fmt(fish.time / 20, 0)} с</b><span>игрового времени</span></div><div><b>${fmt(perMin, 1)}</b><span>в минуту</span></div>`;
    $("#fishEff").innerHTML = morOn() ? `<img src="${T("eff_resistance")}" alt="Сопротивление I" title="Сопротивление I"><img src="${T("eff_luck")}" alt="Удача V" title="Удача V">` : "";
  }
  // ванильный поплавок: timeUntilLured 100–600 тиков, подход рыбы 20–80, поклёвка 20–40. Моричёк режет первые два до 1–2 тиков
  function lureTimes(mor) { return mor ? { wait: 2, approach: 2 } : { wait: 100 + rnd(501), approach: 20 + rnd(61) }; }
  function fishBtnT() { $("#fishBtnT").textContent = fish.st === "idle" ? "Закинуть" : fish.st === "nibble" ? "Тянуть!" : "Вытянуть"; }
  function fishState(t) { $("#fishState").innerHTML = t; }
  function cast() {
    const lt = lureTimes(morOn());
    fish.st = "fly"; fish.t = 0; fish.wait = lt.wait; fish.approach = lt.approach; fish.nibble = 20 + rnd(21); fish.casts++;
    play("throw", 0.5); play("cast", 0.3, 0.8); fishBtnT(); fishState("Ждём поклёвку…");
  }
  function reel() {
    if (fish.st === "nibble") {
      const { g, item } = rollLoot(morOn() ? FP.luckV : 0);
      fish.caught++; st.fish++; if (g.k === "treasure") st.treasure++;
      addLoot(g, item);
      play("retrieve", 0.6); setTimeout(() => play("orb", 0.4, 0.8 + Math.random() * 0.4), 200);
      fishState(`Поймал: <span style="color:${g.c}">${esc(item[1])}</span>`);
      sb("fish");
    } else { play("retrieve", 0.4, 1.2); fishState(fish.st === "fly" || fish.st === "wait" || fish.st === "approach" ? "Рано вытащил, пусто" : "Закидывай"); }
    fish.st = "idle"; fishBtnT(); fishStat();
  }
  function addLoot(g, item) {
    const d = document.createElement("div"); d.className = "fl fl-" + g.k; d.dataset.tip = item[1]; d.dataset.tipInfo = g.name;
    d.innerHTML = `<img src="${T(item[0])}" alt="">`;
    const log = $("#fishLog"); log.prepend(d); while (log.children.length > 24) log.lastChild.remove();
  }
  $("#fishBtn").addEventListener("click", () => { fish.auto = false; fish.st === "idle" ? cast() : reel(); });
  fc.addEventListener("click", () => { fish.auto = false; fish.st === "idle" ? cast() : reel(); });
  $("#fishMor").addEventListener("change", () => { fishStat(); play("ench", 0.4); });
  // авто: 20 забросов мгновенно, время считается по-игровому
  $("#fishAuto").addEventListener("click", () => {
    const mor = morOn(); let t = 0;
    for (let i = 0; i < 20; i++) {
      const lt = lureTimes(mor); t += 10 + lt.wait + lt.approach + 8;   // полёт + ожидание + подход + реакция
      const { g, item } = rollLoot(mor ? FP.luckV : 0); fish.caught++; st.fish++; addLoot(g, item);
    }
    fish.time += t; play("retrieve", 0.6); play("orb", 0.4); fishStat(); sb("fish");
    fishState(`20 забросов за ${fmt(t / 20, 0)} с игрового времени`);
  });
  function fishTick() {
    if (fish.st === "idle") return;
    fish.t++; fish.time++;
    if (fish.st === "fly" && fish.t > 10) { fish.st = "wait"; fish.t = 0; play("splash", 0.3, 1.3); fish.splash.push({ x: 0, t: 0 }); }
    else if (fish.st === "wait" && fish.t >= fish.wait) { fish.st = "approach"; fish.t = 0; }
    else if (fish.st === "approach") { fish.trail.push({ k: fish.approach - fish.t, t: 0 }); if (fish.t >= fish.approach) { fish.st = "nibble"; fish.t = 0; play("splash", 0.5); fish.splash.push({ x: 0, t: 0 }); fishState(`<span style="color:#55ff55">Клюёт! Жми!</span>`); fishBtnT(); } }
    else if (fish.st === "nibble" && fish.t >= fish.nibble) { fish.st = "wait"; fish.t = 0; fish.wait = lureTimes(morOn()).wait; fishState("Сорвалась. Ждём ещё…"); fishBtnT(); }
  }
  function drawFish(now) {
    const c = fx; c.imageSmoothingEnabled = false;
    const g = c.createLinearGradient(0, 0, 0, WATER); g.addColorStop(0, "#0e0418"); g.addColorStop(1, "#2b0f3a");
    c.fillStyle = g; c.fillRect(0, 0, FW, WATER);
    for (let i = 0; i < 40; i++) { const x = (i * 97) % FW, y = (i * 53) % (WATER - 30); c.fillStyle = `rgba(255,220,255,${0.25 + 0.4 * Math.abs(Math.sin(now / 1000 + i))})`; c.fillRect(x, y, 2, 2); }
    const wt = IMG(T("water")), s = 40;
    if (wt.complete) { const off = (now / 60) % s; for (let y = WATER; y < FH; y += s) for (let x = -s; x < FW + s; x += s) c.drawImage(wt, x + (((y / s) & 1) ? off : -off), y, s, s); }
    c.fillStyle = "rgba(80,0,120,.25)"; c.fillRect(0, WATER, FW, FH - WATER);
    // берег: игрок сидит на дилдо
    const es = IMG(T("pink_wool")); if (es.complete) for (let y = WATER - 10; y < FH; y += 40) { c.drawImage(es, 0, y, 40, 40); c.drawImage(es, 40, y, 40, 40); c.drawImage(es, 80, y, 40, 40); }
    const sx = 5, bx = 60, fl = WATER - 10;
    drawDildo(c, bx, fl, sx, MATS[st.mat].k);
    drawMob(c, "steve", bx, fl - SEAT_Y * sx, sx, 0);
    const rod = IMG(T(fish.st === "idle" ? "fishing_rod" : "fishing_rod_cast"));
    const tip = { x: bx + 60, y: fl - 186 };
    if (rod.complete) { c.save(); c.translate(bx + 20, fl - 124); c.drawImage(rod, 0, -64, 64, 64); c.restore(); }
    // поплавок
    let bxp = 470, byp = WATER + 6;
    if (fish.st === "fly") { const p = fish.t / 10; bxp = tip.x + (470 - tip.x) * p; byp = tip.y + (WATER + 6 - tip.y) * p - Math.sin(p * Math.PI) * 90; }
    if (fish.st === "nibble") byp += 14 + Math.sin(now / 50) * 3;
    else if (fish.st !== "fly") byp += Math.sin(now / 400) * 2;
    if (fish.st !== "idle") {
      c.strokeStyle = "rgba(20,20,20,.9)"; c.lineWidth = 2; c.beginPath(); c.moveTo(tip.x, tip.y);
      c.quadraticCurveTo((tip.x + bxp) / 2, Math.max(tip.y, byp) + 30, bxp, byp - 8); c.stroke();
      const hk = IMG(T("fishing_hook")); if (hk.complete) c.drawImage(hk, bxp - 16, byp - 26, 32, 32);
    }
    // след подплывающей рыбы
    for (let i = fish.trail.length - 1; i >= 0; i--) {
      const tr = fish.trail[i]; tr.t++; if (tr.t > 16) { fish.trail.splice(i, 1); continue; }
      const d = tr.k * 4 + 20; c.fillStyle = `rgba(210,240,255,${0.7 - tr.t / 24})`; c.fillRect(bxp + d * 0.8 - 3, WATER + 14 + d * 0.3, 6, 3);
    }
    for (let i = fish.splash.length - 1; i >= 0; i--) {
      const sp = fish.splash[i]; sp.t++; if (sp.t > 24) { fish.splash.splice(i, 1); continue; }
      c.fillStyle = `rgba(200,230,255,${1 - sp.t / 24})`;
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI; c.fillRect(bxp + Math.cos(a) * sp.t * 2.2 - 2, WATER + 4 - Math.sin(a) * sp.t * 1.6 + sp.t * sp.t * 0.05, 4, 4); }
    }
  }

  /* ================= V · СТОЛ ЗАЧАРОВАНИЙ (ванильный EnchantmentHelper) ================= */
  const EN = P.ench;
  const rngOf = (seed) => { let s = seed >>> 0 || 1; const f = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; return { f, i: (n) => Math.floor(f() * n) }; };
  function available(level) { const out = []; for (const e of EN) if (level >= e.min && level <= e.maxc) out.push(e); return out; }
  function weighted(r, list) { const t = list.reduce((a, e) => a + e.weight, 0); let q = r.i(t); for (const e of list) { if ((q -= e.weight) < 0) return e; } return list[0]; }
  function select(r, level) {
    const ench = P.enchantability;
    level += 1 + r.i(Math.floor(ench / 4) + 1) + r.i(Math.floor(ench / 4) + 1);
    const f = (r.f() + r.f() - 1) * 0.15;
    level = clamp(Math.round(level + level * f), 1, 1e9);
    let list = available(level); const out = [];
    if (!list.length) return out;
    out.push(weighted(r, list));
    while (r.i(50) <= level) {
      list = list.filter((e) => !out.includes(e));   // разные чары совместимы, одна и та же нет
      if (!list.length) break;
      out.push(weighted(r, list)); level = Math.floor(level / 2);
    }
    return out;
  }
  function costs(r, shelves) {
    return [0, 1, 2].map((slot) => {
      const i = r.i(8) + 1 + (shelves >> 1) + r.i(shelves + 1);
      const c = slot === 0 ? Math.max(Math.floor(i / 3), 1) : slot === 1 ? Math.floor((i * 2) / 3) + 1 : Math.max(i, shelves * 2);
      return c < slot + 1 ? 0 : c;
    });
  }
  const GAL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const galWord = (r) => Array.from({ length: 3 + r.i(5) }, () => GAL[r.i(26)]).join("").toLowerCase();
  let egSeed = rnd(1e9), egItem = st.mat, egOffers = [];
  function egRender() {
    const shelves = +$("#shelves").value, r = rngOf(egSeed);
    $("#shelvesV").textContent = shelves;
    $("#egItem").innerHTML = `<img src="${ISO(MATS[egItem].k)}" alt="">`;
    $("#egItem").dataset.tip = MATS[egItem].name; $("#egItem").dataset.tipInfo = "клик: другой материал";
    const cs = costs(r, shelves);
    egOffers = cs.map((c, slot) => { if (!c) return null; const rr = rngOf(egSeed + slot * 7919 + c); return { c, list: select(rr, c), gal: [galWord(rr), galWord(rr), galWord(rr)].join(" ") }; });
    $("#egOpts").innerHTML = egOffers.map((o, i) => {
      if (!o) return `<div class="eg-o off"></div>`;
      const off = !o.list.length;
      return `<button type="button" class="eg-o${off ? " off" : ""}" data-i="${i}" data-nosfx aria-label="Вариант ${i + 1}: уровень ${o.c}"><span class="lv" style="background-image:url('${T(`gui_ench_lvl${i + 1}${off ? "_off" : ""}`)}')"></span><span class="gal">${o.gal}</span><span class="cost">${o.c}</span><span class="clue">${off ? "ничего не выпадет" : esc(o.list[0].name) + " . . . ?"}</span></button>`;
    }).join("");
  }
  $("#shelves").addEventListener("input", () => { egSeed = rnd(1e9); egRender(); });
  $("#egRoll").addEventListener("click", () => { egSeed = rnd(1e9); egRender(); play("page", 0.5); });
  $("#egItem").addEventListener("click", () => { egItem = (egItem + 1) % MATS.length; egSeed = rnd(1e9); egRender(); play("pop", 0.4); });
  $("#egOpts").addEventListener("click", (e) => {
    const b = e.target.closest(".eg-o:not(.off)"); if (!b) return;
    const o = egOffers[+b.dataset.i]; if (!o || !o.list.length) return;
    play("ench", 0.8); ZM.sfx("levelup", 0.3);
    st.ench.morichek = o.list.some((x) => x.k === "morichek"); st.ench.bed_wars = o.list.some((x) => x.k === "bed_wars");
    syncEnch();
    $("#egRes").innerHTML = `<img src="${ISO(MATS[egItem].k)}" alt="" style="width:36px;height:36px">${esc(MATS[egItem].name)}: ${o.list.map((x) => `<span class="e">${esc(x.name)}</span>`).join(" + ")} <small style="color:var(--dim)">· −${o.c} ур.</small>`;
    chat(`Зачаровано: ${o.list.map((x) => col("d", x.name)).join(" + ")}. Чары стоят и на блоке в «Посадке».`);
    egSeed = rnd(1e9); setTimeout(egRender, 300);
  });
  // график: вероятности по уровню стола 1–30
  function enchChart() {
    const c = $("#enchCv"), g = c.getContext("2d"), w = c.width, h = c.height, L = 44, B = 30, Tp = 12, R = 12;
    const N = 4000, rows = [];
    const r = rngOf(12345);
    for (let lv = 1; lv <= 30; lv++) {
      let m = 0, b = 0, both = 0, none = 0;
      for (let k = 0; k < N; k++) { const s = select(r, lv); const hm = s.some((x) => x.k === "morichek"), hb = s.some((x) => x.k === "bed_wars"); if (hm) m++; if (hb) b++; if (hm && hb) both++; if (!s.length) none++; }
      rows.push([m / N, b / N, both / N, none / N]);
    }
    const X = (lv) => L + ((lv - 1) / 29) * (w - L - R), Y = (p) => Tp + (1 - p) * (h - Tp - B);
    g.clearRect(0, 0, w, h); g.font = "11px Rubik, sans-serif"; g.fillStyle = "#7d6a92"; g.strokeStyle = "rgba(255,255,255,.07)";
    for (let p = 0; p <= 1.001; p += 0.25) { g.beginPath(); g.moveTo(L, Y(p)); g.lineTo(w - R, Y(p)); g.stroke(); g.fillText(Math.round(p * 100) + "%", 6, Y(p) + 4); }
    for (const lv of [1, 5, 10, 15, 20, 25, 30]) g.fillText(lv, X(lv) - 5, h - 10);
    const SER = [["И теперь я моричёк...", "#b37bff", 0], ["БЭД Варс", "#55ffff", 1], ["обе сразу", "#ff4fd8", 2], ["ничего", "#777", 3]];
    for (const [, cl, j] of SER) { g.strokeStyle = cl; g.lineWidth = 2.5; g.beginPath(); rows.forEach((rw, i) => { const x = X(i + 1), y = Y(rw[j]); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
    $("#enchLeg").innerHTML = SER.map(([n, cl]) => `<span style="--c:${cl}"><i></i>${esc(n)}</span>`).join("") + `<span>при 30 уровне «БЭД Варс»: ${fmt(rows[29][1] * 100, 1)}%</span>`;
  }
  $("#enchCards").innerHTML = EN.map((e) => `<div class="pnl ec"><div class="ec-book"><img src="${T("enchanted_book")}" alt=""></div><div>
    <div class="ec-n">${esc(e.name)}</div><div class="ec-w">${esc(e.what)}</div>
    <div class="ec-props"><span>редкость <b>${esc(e.rarityRu)}</b></span><span>макс. уровень <b>I</b></span><span>стоимость <b>${e.min}–${e.maxc}</b></span><span>книги <b>да</b></span><span>торговля/стол <b>да</b></span><span>только на дилдо</span><span>zitraksmode:${e.k}</span></div></div></div>`).join("");

  /* ================= VI · ВЗРЫВ (ванильный Explosion: 16×16×16 лучей, сила 4) ================= */
  // Точное решение без случайности: блок уцелеет, если ни один луч до него не дойдёт.
  // Луч дошёл, если f0 − 0,225·s − (res + 0,3)·0,3 > 0, где s — номер шага, на котором луч впервые в клетке блока, f0 ∈ [2,8; 5,2].
  const RAYS = (() => { const r = []; for (let j = 0; j < 16; j++) for (let k = 0; k < 16; k++) for (let l = 0; l < 16; l++) { if (j && j < 15 && k && k < 15 && l && l < 15) continue; let d = [j / 15 * 2 - 1, k / 15 * 2 - 1, l / 15 * 2 - 1]; const n = Math.hypot(...d); r.push(d.map((v) => v / n)); } return r; })();
  const ORIGIN = [0.5, 0.98 * 0.0625, 0.5];   // TNT: getY(0.0625)
  const entrySteps = {};
  function stepsFor(dist) {
    if (entrySteps[dist]) return entrySteps[dist];
    const out = [];
    for (const d of RAYS) {
      let p = [...ORIGIN];
      for (let s = 0; s < 24; s++) {   // 5,2 / 0,225 < 24
        if (Math.floor(p[0]) === dist && Math.floor(p[1]) === 0 && Math.floor(p[2]) === 0) { out.push(s); break; }
        p[0] += d[0] * 0.3; p[1] += d[1] * 0.3; p[2] += d[2] * 0.3;
      }
    }
    return (entrySteps[dist] = out);
  }
  function breakChance(res, dist) {
    let survive = 1;
    for (const s of stepsFor(dist)) { const thr = 0.225 * s + (res + 0.3) * 0.3; survive *= clamp((thr - 2.8) / 2.4, 0, 1); if (!survive) break; }
    return 1 - survive;
  }
  const boom = { d: 3, anim: null };
  const pct = (p) => (p >= 0.9995 ? "100" : p <= 0.0005 ? "0" : p < 0.01 ? "<1" : fmt(p * 100, 0));
  const heatCol = (p) => `hsl(${(1 - p) * 130},70%,${28 + p * 14}%)`;
  function heat() {
    let h = `<div></div>${[1, 2, 3, 4, 5, 6, 7, 8].map((d) => `<div class="h">${d}</div>`).join("")}`;
    MATS.forEach((m, i) => {
      h += `<div class="h"><img src="${ISO(m.k)}" alt="${esc(m.short)}" title="${esc(m.name)}"></div>`;
      for (let d = 1; d <= 8; d++) { const p = breakChance(m.res, d); h += `<div class="c${i === st.mat ? " row" : ""}${i === st.mat && d === boom.d ? " sel" : ""}" data-i="${i}" data-d="${d}" style="background:${heatCol(p)}" title="${esc(m.short)}, ${d} бл.: ${pct(p)}%">${pct(p)}</div>`; }
    });
    $("#boomHeat").innerHTML = h;
  }
  $("#boomHeat").addEventListener("click", (e) => { const c = e.target.closest("[data-d]"); if (!c) return; boom.d = +c.dataset.d; $("#boomD").value = boom.d; if (+c.dataset.i !== st.mat) setMat(+c.dataset.i); else { heat(); boomOut(); } });
  $("#boomD").addEventListener("input", (e) => { boom.d = +e.target.value; heat(); boomOut(); boom.anim = null; });
  function boomOut() { const m = MATS[st.mat], p = breakChance(m.res, boom.d); $("#boomDv").textContent = boom.d; $("#boomOut").innerHTML = `${esc(m.short)} на ${boom.d} бл.: шанс сломаться <span style="color:${heatCol(p)};filter:brightness(1.8)">${pct(p)}%</span>`; }
  onMat(() => { heat(); boomOut(); boom.anim = null; });
  $("#boomGo").addEventListener("click", () => {
    if (boom.anim && boom.anim.phase !== "done") return;
    const m = MATS[st.mat];
    // разыгрываем конкретный взрыв: каждый луч со своей силой
    let broke = false; for (const s of stepsFor(boom.d)) { const f0 = 4 * (0.7 + Math.random() * 0.6); if (f0 - 0.225 * s - (m.res + 0.3) * 0.3 > 0) { broke = true; break; } }
    boom.anim = { phase: "fuse", t: 0, broke, deb: [] }; play("fuse", 0.6); $("#boomGo").disabled = true;
  });
  const bc = $("#boomCv"), bx = bc.getContext("2d");
  function boomTick() {   // 20 тиков в секунду
    const a = boom.anim; if (!a || a.phase === "done") return;
    a.t++;
    if (a.phase === "chain") {   // wasExploded: PrimedTnt с фитилём rand(20)+10
      if (a.t >= a.chainFuse) { a.phase = "blast2"; a.t = 0; play("explode", 0.8, 0.95); }
      return;
    }
    if (a.phase === "blast2") {
      if (a.t >= 34) { a.phase = "done"; $("#boomGo").disabled = false; $("#boomOut").innerHTML = `<span style="color:#ff5555">Цепная реакция.</span> TNT-дилдо зажёгся от взрыва и рванул через ${fmt(a.chainFuse / 20, 2)} с`; chat(`${col("c", "Дилдо из TNT")} сдетонировал следом через ${fmt(a.chainFuse / 20, 2)} с`); }
      return;
    }
    if (a.phase === "fuse" && a.t >= 80) {   // фитиль TNT: 80 тиков
      a.phase = "blast"; a.t = 0; play("explode", 0.7);
      if (a.broke) { play("hbreak", 0.8); for (let i = 0; i < 24; i++) a.deb.push({ x: 0.5 + (Math.random() - 0.5) * 0.6, y: 0.4 + Math.random() * 0.8, vx: 0.05 + Math.random() * 0.12, vy: 0.1 + Math.random() * 0.15 }); }
    } else if (a.phase === "blast" && a.t < 34) { /* разлёт */ } else if (a.phase === "blast") {
      a.phase = "done"; $("#boomGo").disabled = false;
      const m = MATS[st.mat];
      if (a.broke && m.k === "tnt" && !a.chained) { a.chained = true; a.phase = "chain"; a.t = 0; a.chainFuse = 10 + rnd(20); $("#boomGo").disabled = true; return; }
      $("#boomOut").innerHTML = a.broke ? `<span style="color:#ff5555">Сломан.</span> Выпал сам ${esc(m.name.toLowerCase())} со всеми чарами` : `<span style="color:#55ff55">Выжил.</span> ${esc(m.short)} на ${boom.d} бл. устоял`;
      chat(a.broke ? `${col("c", m.name)} не пережил взрыв на ${boom.d} бл.` : `${col("a", m.name)} пережил взрыв на ${boom.d} бл.`);
    }
  }
  function drawBoom(now) {
    const c = bx, w = bc.width, h = bc.height, B = 80, fl = h - 40, sc = 5; c.imageSmoothingEnabled = false;
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#10051a"); g.addColorStop(1, "#28102f"); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = "rgba(255,255,255,.05)"; for (let x = 0; x <= w; x += B) c.fillRect(x, 0, 1, fl);
    c.font = "12px Tiny5, monospace"; c.fillStyle = "#7d6a92"; for (let d = 1; d <= 8; d++) c.fillText(d, 8 + d * B + B / 2 - 3, h - 14);
    c.fillStyle = "rgba(255,79,216,.22)"; c.fillRect(0, fl, w, 2);
    const a = boom.anim, tnt = IMG(T("tnt_side"));
    const tx = 8, ty = fl - B;
    if (!a || a.phase === "fuse") {
      if (tnt.complete) c.drawImage(tnt, tx, ty, B, B);
      if (a && Math.floor(a.t / 4) % 2 === 0) { c.fillStyle = "rgba(255,255,255,.6)"; c.fillRect(tx, ty, B, B); }
    }
    const m = MATS[st.mat], dx = 8 + boom.d * B + B / 2;
    if (!a || a.phase === "fuse" || !a.broke) drawDildo(c, dx, fl, sc, m.k);
    if (a && a.phase !== "fuse") {
      if (a.broke) { const im = IMG(T(frontTex(m.k))); for (const d of a.deb) { d.x += d.vx; d.y += d.vy; d.vy -= 0.02; if (im.complete) c.drawImage(im, (d.x * 16) | 0, (d.y * 16) | 0, 3, 3, dx - B / 2 + d.x * B, fl - d.y * B, 10, 10); } }
      if (a.phase === "chain") { const tn = IMG(T("tnt_side")); if (tn.complete) c.drawImage(tn, dx - B / 2, fl - B, B, B); if (Math.floor(a.t / 3) % 2 === 0) { c.fillStyle = "rgba(255,255,255,.6)"; c.fillRect(dx - B / 2, fl - B, B, B); } }
      if (a.phase === "blast2") { c.save(); c.filter = "sepia(1) saturate(2.4) hue-rotate(-12deg)"; const fr = Math.min(15, Math.floor(a.t / 2)); for (let k = 0; k < 7; k++) { const e = IMG(T(`explosion_${(fr + k * 2) % 16}`)); const r = 50 + k * 14, ang = k * 1.7; if (e.complete) c.drawImage(e, dx + Math.cos(ang) * r * 0.6 - 50, fl - B / 2 + Math.sin(ang) * r * 0.4 - 50, 100, 100); } c.restore(); }
      if (a.broke && a.t > 8 && m.k !== "tnt") { const im = IMG(ISO(m.k)); if (im.complete) c.drawImage(im, dx - 26, fl - 52 - Math.abs(Math.sin(now / 400)) * 6 - Math.max(0, 20 - a.t) * 3, 52, 52); }
      if (a.phase === "blast") {
        const fr = Math.min(15, Math.floor(a.t / 2));
        c.save(); c.filter = "sepia(1) saturate(2.4) hue-rotate(-12deg)";
        for (let k = 0; k < 7; k++) { const e = IMG(T(`explosion_${(fr + k * 2) % 16}`)); const r = 60 + k * 18, ang = k * 1.7; if (e.complete) c.drawImage(e, tx + B / 2 + Math.cos(ang) * r * 0.6 - 50, ty + B / 2 + Math.sin(ang) * r * 0.4 - 50, 100, 100); }
        c.restore();
        if (a.t < 5) { c.fillStyle = `rgba(255,240,220,${0.6 - a.t * 0.12})`; c.fillRect(0, 0, w, h); }
      }
    }
  }

  /* ================= VII · ПРАВИЛА ================= */
  const RULES = [
    ["iso/stone_dildo", "Сиденье внутри", "В блоке живёт невидимая сущность-сиденье. Каждые 5 тиков блок проверяет, на месте ли она, и если нет, ставит новую."],
    ["mob/pig_face", "Мобы садятся сами", "Если сиденье свободно, ближайший моб в радиусе 0,9 блока (по высоте 0,7) садится силой. Уйти он уже не может."],
    ["mob/steve_face", "Как встать", "Слезаешь на 1,5 блока в сторону, где свободно: север, юг, восток, запад. Если везде стены, окажешься на 2 блока выше."],
    ["iso/diamond_dildo", "Смена седока", "Сел другой: таймер с нуля. Разгон 5 секунд для чар и 10 секунд до лавы и спор придётся ждать заново."],
    ["enchanted_book", "Чары не теряются", "При установке блок запоминает весь NBT предмета. Сломал и получил тот же дилдо со всеми чарами и именем."],
    ["iso/iron_dildo", "Хитбокс меньше модели", "Рамка выделения и коллизия 6×12×6 пикселей по центру. Основание модели широкое, но сквозь него можно пройти."],
    ["iso/tnt_dildo", "TNT-дилдо не ломай", "Сломал в выживании, и под тобой зажёгся настоящий TNT: 4 секунды. Огонь и горящая стрела тоже поджигают, чужой взрыв рвёт его следом. В креативе ломается спокойно."],
    ["p_lava", "После 10 секунд", "Каждые 2 тика 5 капель лавы и 5 багровых спор, каждые 3 секунды крик эндермена. Сломал блок, и все сидевшие вылетают."],
  ];
  $("#ruGrid").innerHTML = RULES.map(([ic, t, p], i) => `<div class="ru" data-n="${i + 1}"><img src="${T(ic)}" alt=""><b>${esc(t)}</b><p>${esc(p)}</p></div>`).join("");

  /* ================= VIII · ДОСТИЖЕНИЯ ================= */
  $("#advBoard").style.setProperty("--tile", `url("${new URL(T("pink_wool"), location.href).href}")`);
  const FRAME_RU = { task: "обычная", goal: "цель", challenge: "испытание" };
  const titleH = (a) => `<span style="color:${MC[a.color]}">${esc(a.title)}</span>`;
  renderTree = function (pulse) {
    const vis = ADV.filter((a) => got.includes(a.key) || !a.hidden), hidden = ADV.length - vis.length;
    if (!advSel || !vis.some((a) => a.key === advSel)) advSel = vis.length ? vis[vis.length - 1].key : null;
    const icon = (a, px) => `<span class="ic" style="width:${px}px;height:${px}px"><img src="${T(a.icon)}" alt=""></span>`;
    let html = vis.map((a, i) => (i ? `<div class="adv-link on"></div>` : "") + `<button type="button" class="adv-node ${pulse === a.key ? "pulse" : ""} ${advSel === a.key ? "sel" : ""}" data-k="${a.key}" aria-label="${esc(a.title)}"><span class="adv-frame ${a.frame}"></span>${icon(a, 32)}</button>`).join("");
    if (hidden) html += vis.length ? `<div class="adv-link"></div><div class="adv-more">+${hidden} скрыто</div>` : `<div class="adv-node"><span class="adv-frame task locked"></span><span class="q">?</span></div>`;
    $("#advChain").innerHTML = html;
    const a = ADV.find((x) => x.key === advSel);
    $("#advDetail").innerHTML = a
      ? `<div class="big"><span class="adv-frame ${a.frame}"></span>${icon(a, 38)}</div><div class="txt"><div class="tt">${titleH(a)}</div><div class="dd">${esc(a.desc)}</div><div class="cc">${esc(a.how)}</div></div><div class="meta"><span>${FRAME_RU[a.frame]}</span>${a.xp ? `<span>+${a.xp} XP</span>` : ""}</div>`
      : `<div class="big"><span class="adv-frame task locked"></span><span class="q">?</span></div><div class="txt"><div class="tt">Скрыто</div><div class="dd">Все ачивки скрыты. Крафти, садись, ломай.</div></div>`;
    $("#advList").innerHTML = ADV.map((a) => got.includes(a.key)
      ? `<button type="button" class="adv-row has" data-k="${a.key}"><span class="fr"><span class="adv-frame ${a.frame}"></span>${icon(a, 26)}</span><span><span class="t">${titleH(a)}</span><span class="d">${esc(a.desc)}</span></span></button>`
      : `<div class="adv-row locked mystery"><span class="fr"><span class="adv-frame task locked"></span><span class="q">?</span></span><span><span class="t">???</span><span class="d">скрытое достижение: откроется, когда получишь</span></span></div>`).join("");
    const done = ADV.filter((x) => got.includes(x.key));
    $("#advBar").style.width = (done.length / ADV.length) * 100 + "%";
    $("#advTxt").textContent = `${done.length} / ${ADV.length}`;
  };
  $("#advQ").textContent = ADV.length + " " + plural(ADV.length, "ачивка", "ачивки", "ачивок");
  const pickAdv = (e) => { const n = e.target.closest("[data-k]"); if (!n) return; advSel = n.dataset.k; renderTree(); };
  $("#advChain").addEventListener("click", pickAdv);
  $("#advList").addEventListener("click", pickAdv);
  $("#advReset").addEventListener("click", () => { got = []; S.set("p09.adv", got); advSel = null; renderTree(); sb(); });

  /* ================= IX · ИСТОРИЯ ================= */
  $("#timeline").innerHTML = P.history.map((h) => `<div class="tl9" style="--c:${h.c}"><img src="${T(h.icon)}" alt=""><div>
    <div class="tl9-top"><span class="tl9-v">${esc(h.ver)}</span>${h.ver !== h.date ? `<span class="tl9-d">${esc(h.date)}</span>` : ""}<span class="tl9-t">${esc(h.tag)}</span></div><b>${esc(h.title)}</b><p>${esc(h.text)}</p></div></div>`).join("");

  /* ================= ФИНАЛ ================= */
  const nav = ZM.pointNav(9);
  $("#finNav").innerHTML = [nav.prev && `<a href="${U(nav.prev.href)}">← №${String(nav.prev.n).padStart(2, "0")} ${esc(nav.prev.title)}</a>`,
    `<a href="${U("index.html")}">Все пункты</a>`,
    nav.next && `<a href="${U(nav.next.href)}">№${String(nav.next.n).padStart(2, "0")} ${esc(nav.next.title)} →</a>`].filter(Boolean).join("");

  /* ================= споры на фоне ================= */
  const sp = $("#spores"), sg = sp.getContext("2d");
  const SP = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), v: 0.004 + Math.random() * 0.01, s: Math.random() < 0.25 ? 3 : 2, ph: Math.random() * 6, pink: Math.random() < 0.5 }));
  const sizeSp = () => { sp.width = Math.ceil(innerWidth / 2); sp.height = Math.ceil(innerHeight / 2); };
  addEventListener("resize", sizeSp); sizeSp();
  function drawSpores(now, dt) {
    const w = sp.width, h = sp.height; sg.clearRect(0, 0, w, h);
    for (const p of SP) {
      p.y += p.v * dt * 1.4; if (p.y > 1.02) { p.y = -0.02; p.x = Math.random(); }
      const a = 0.35 + 0.45 * Math.abs(Math.sin(now / 1200 + p.ph));
      sg.fillStyle = p.pink ? `rgba(255,90,216,${a})` : `rgba(230,40,40,${a * 0.8})`;
      sg.fillRect((p.x * w + Math.sin(now / 2400 + p.ph) * 8) | 0, (p.y * h) | 0, p.s, p.s);
    }
  }

  /* ================= общий цикл ================= */
  let last = performance.now(), acc = 0, holoT = 0, sbTick = 0;
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    acc += dt * 20;
    let n = Math.floor(acc); acc -= n;
    for (let i = 0; i < n; i++) { fishTick(); boomTick(); }
    seat.acc += dt * 20 * seat.speed;
    let ns = Math.min(4000, Math.floor(seat.acc)); seat.acc -= ns;
    for (let i = 0; i < ns; i++) seatTick();
    drawSeat(now); drawFish(now); drawBoom(now);
    if (!reduce) drawSpores(now, dt);
    hero3d.tick(dt, now); fin3d.tick(dt, now);
    fxIcons();
    if (now - holoT > 250) { holoT = now; holo(); if (seat.who != null) sb(); }
    requestAnimationFrame(loop);
  }

  // старт
  setMat(st.mat, "init");
  whoInfo(); syncEnch(); fishOdds(); fishStat(); egRender(); genRender(); heat(); boomOut(); renderTree();
  requestAnimationFrame(() => { hero3d.build(); fin3d.build(); });
  setTimeout(enchChart, 60);
  ZM.reveal();
  requestAnimationFrame(loop);
  ZM.p09 = { st, seat, setMat, grant, breakChance, select, rollLoot, seatTick, fish, boom };
})();
