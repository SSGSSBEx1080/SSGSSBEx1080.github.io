/* =====================================================================
   №03 · Снайперки — логика страницы
   0. общее: иконки, звук, текстуры      5. зачарования (3 демо)
   1. hero: ночной полигон + линза        6. ульта: разрез мира
   2. арсенал: CSS-3D модель, статы       7. крафт + полная стоимость
   3. тир (range.js)                      8. ачивки · 9. хронология · 10. финал
   4. пуля: 3D + траектория против стрелы
   ===================================================================== */
(function () {
  "use strict";
  const { $, $$, esc } = ZM;
  const P = ZM.P03, M = ZM.P03M;
  const U = (p) => ZM.url(p);
  const T = (p) => U("assets/textures/p3/" + p);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toString().replace(".", ",");

  ZM.topbar({ crumb: "№03 · Снайперки", ...ZM.pointNav(3) });

  /* =====================================================================
     0. ИКОНКИ И ЗВУК
     ===================================================================== */
  const ISO = new Set(["iron_block", "gold_block", "diamond_block", "netherite_block", "obsidian", "stone", "bedrock", "crafting_table", "reinforced_deepslate", "end_portal_frame", "crying_obsidian", "stone_bricks", "hay_block", "target"]);
  function src(id) {
    const [ns, n] = id.includes(":") ? id.split(":") : ["minecraft", id];
    if (ns === "zitraksmode") return n === "bullet" ? T("bullet_item.png") : T(`icons/${n}.png`);
    if (ISO.has(n)) return T(`icons/${n}.png`);
    return T(`vanilla/item_${n}.png`);
  }
  const nameOf = (id) => P.names[id] || id;
  const img = (id, cls = "") => `<img class="${cls}" src="${src(id)}" alt="" draggable="false">`;
  const TIER_ID = P.tiers.map((t) => t.id);
  let tex = null;   // текстуры для canvas (грузятся в конце)

  // Звук: ogg, если браузер умеет, иначе mp3
  const EXT = new Audio().canPlayType("audio/ogg; codecs=vorbis") ? "ogg" : "mp3";
  let sndOn = ZM.store.get("p03.snd", true);
  const sndBtn = $("#snd");
  const syncSnd = () => sndBtn.setAttribute("aria-pressed", String(sndOn));
  syncSnd();
  sndBtn.addEventListener("click", () => { sndOn = !sndOn; ZM.store.set("p03.snd", sndOn); syncSnd(); });
  ZM.sfx.bind(() => sndOn);   // общие звуки Minecraft (клики, тосты) слушаются кнопки звука страницы
  // ОБЩАЯ ГРОМКОСТЬ СТРАНИЦЫ (0..1). Меняй здесь, если всё ещё громко или тихо
  const MASTER_VOLUME = 0.35;
  const pool = {};
  function play(name, vol = 1, rate = 1) {
    if (!sndOn) return;
    const a = (pool[name] || (pool[name] = new Audio(U(`assets/sounds/p03/${name}.${EXT}`)))).cloneNode();
    a.volume = clamp(vol * MASTER_VOLUME, 0, 1);
    a.preservesPitch = a.mozPreservesPitch = a.webkitPreservesPitch = false;   // pitch 0.8 как в моде: ниже и медленнее
    a.playbackRate = rate;
    a.play().catch(() => {});
  }
  // Выстрел ульты: sniper_ultimate_shot.ogg из мода. Зарядки нет: луч сразу по R
  const SOUND = {
    sniper_shot: () => play("sniper_shot", 1, 0.8),       // volume 4.0 в моде (упираемся в 1), pitch 0.8
    scope_in: () => play("scope", 0.5), scope_out: () => play("scope", 0.35, 1.08),
    dispenser_fail: () => play("dispenser_fail", 0.8),
    bowhit: () => play("bowhit" + (1 + Math.floor(Math.random() * 4)), 0.6),
    ender_portal: () => play("ender_portal", 0.6),
    golem_hit: () => play("golem_hit", 0.7), zombie_hurt: () => play("zombie_hurt", 0.6),
    ult_shot: () => play("ult_shot", 1),
  };

  /* ---------- загрузка текстур для canvas ---------- */
  const loadImg = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = s; });
  async function loadTex() {
    const V = (n) => loadImg(T(`vanilla/${n}.png`));
    const [grassRaw, stone, obsidian, bedrock, target, hay, bricks, fire, scope, icons, widgets, bullet, ...rest] = await Promise.all([
      V("grass_block_top"), V("stone"), V("obsidian"), V("bedrock"), V("target_side"), V("hay_block_side"), V("stone_bricks"), V("fire_0"),
      loadImg(T("sniper_scope.png")), V("icons"), V("widgets"), loadImg(T("bullet_item.png")),
      ...["zombie", "skeleton", "creeper", "enderman", "iron_golem"].map((m) => loadImg(T(`mobs/${m}.png`))),
      ...TIER_ID.map((t) => loadImg(T(`icons/${t}_sniper.png`))),
    ]);
    // трава в ванили серая и красится биомом: равнины #91BD59
    const g = document.createElement("canvas"); g.width = g.height = 16;
    const gc = g.getContext("2d"); gc.drawImage(grassRaw, 0, 0); gc.globalCompositeOperation = "multiply"; gc.fillStyle = "#91bd59"; gc.fillRect(0, 0, 16, 16);
    gc.globalCompositeOperation = "destination-in"; gc.drawImage(grassRaw, 0, 0);
    const [zombie, skeleton, creeper, enderman, iron_golem] = rest.slice(0, 5);
    return { grass: g, blocks: { stone, obsidian, bedrock, target, hay_block: hay, stone_bricks: bricks }, fire, scope, icons, widgets, bullet,
      mobs: { zombie, skeleton, creeper, enderman, iron_golem }, icons_items: rest.slice(5) };
  }

  /* =====================================================================
     8 (раньше, т.к. нужна тиру). АЧИВКИ
     ===================================================================== */
  const ADV = P.advancements;
  let got = ZM.store.get("p03.adv", []).filter((k) => ADV.some((a) => a.key === k));
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
    got.push(key); ZM.store.set("p03.adv", got);
    ZM.toast({ iconHtml: img(a.icon), title: plain(a.title), frame: a.frame, head: a.frame === "challenge" ? "Испытание выполнено!" : a.frame === "goal" ? "Цель достигнута!" : "Получено достижение!" });
    play("levelup", 0.5);
    advSel = key; renderTree(key);
  }

  /* =====================================================================
     1. HERO
     ===================================================================== */
  const heroCv = $("#heroCv"), hero = $("#hero");
  let lens = { x: innerWidth * 0.66, y: innerHeight * 0.5, r: 0, tx: innerWidth * 0.66, ty: innerHeight * 0.5, auto: true };
  hero.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const r = hero.getBoundingClientRect(); lens.tx = e.clientX - r.left; lens.ty = e.clientY - r.top; lens.auto = false;
  });
  hero.addEventListener("pointerleave", () => { lens.auto = true; });
  $("#heroStrip").innerHTML = P.tiers.map((t, i) => `<a href="#arsenal" data-t="${i}" data-tip="${esc(t.name)}" style="--tc:${t.color}">${img(t.item)}<span>${t.short.toUpperCase()}</span></a>`).join("");
  $("#heroStrip").addEventListener("click", (e) => { const a = e.target.closest("[data-t]"); if (a) { setTier(+a.dataset.t); ZM.sfx("equip", 0.6); } });
  const t0 = Date.now();
  setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); $("#hhTime").textContent = [s / 3600, (s / 60) % 60, s % 60].map((v) => String(Math.floor(v)).padStart(2, "0")).join(":"); }, 1000);

  /* =====================================================================
     2. АРСЕНАЛ
     ===================================================================== */
  // 3D-модель: WebGL (быстро), а если его нет, прежняя CSS-версия. Поворот: [["x",deg],["y",deg]] как в CSS
  const USE_GL = window.ZMGL && ZMGL.supported();
  let glBroken = false;
  function cssModel(json, base, opt) {
    const m = ZMModel3D.build(json, base, opt);
    m.setRot = (ops) => { m.rig.style.transform = ops.map(([a, d]) => `rotate${a.toUpperCase()}(${d}deg)`).join(" "); };
    m.destroy = () => {};
    return m;
  }
  // Возвращает «ручку» модели; если WebGL откажет уже после старта, ручка сама подменяет canvas на CSS-модель
  function make3d(json, base, opt) {
    if (!USE_GL || glBroken) return cssModel(json, base, opt);
    const h = {};
    const g = ZMGL.build(json, base, Object.assign({}, opt, { onFail: () => {
      glBroken = true;
      const m = cssModel(json, h.base || base, opt), old = h.cur.el;
      h.cur = m; h.el = m.el; if (old.parentNode) old.parentNode.replaceChild(m.el, old);
      if (h.ops) m.setRot(h.ops);
    } }));
    if (!g) return cssModel(json, base, opt);
    h.cur = g; h.el = g.el; h.bb = g.bb;
    h.setTextures = (b) => { h.base = b; h.cur.setTextures(b); };
    h.setRot = (ops) => { h.ops = ops; h.cur.setRot(ops); };
    h.destroy = () => h.cur.destroy();
    return h;
  }
  let tier = 0;
  const stage = $("#arsStage");
  let model = null, rot = { y: -28, x: -14, vy: 0, drag: null, idle: 0 };
  function buildModel() {
    const w = stage.clientWidth, unit = clamp((w * 0.82) / 22, 8, 30);
    const base = T(`models/${TIER_ID[tier]}/`);
    if (model) model.destroy();
    model = make3d(M.sniper, base, { unit, cls: "sn", persp: 1400 });
    $("#arsModel").innerHTML = ""; $("#arsModel").appendChild(model.el);
  }
  $("#arsTabs").innerHTML = P.tiers.map((t, i) => `<button type="button" role="tab" class="ars-tab" data-t="${i}" style="--tc:${t.color}">${img(t.item)}<span>${esc(t.short)}<small>${t.dmg} урона · ${fmt(t.cd / 20)} с</small></span></button>`).join("");
  $("#arsTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-t]"); if (b) { setTier(+b.dataset.t); ZM.sfx("equip", 0.6); } });
  // Вращение: любая кнопка мыши или палец. preventDefault гасит браузерное перетаскивание/выделение (из-за него ЛКМ «залипала»),
  // а contextmenu глушим, чтобы после ПКМ не вылезало меню браузера
  function noBrowser(el) {
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    el.addEventListener("dragstart", (e) => e.preventDefault());
    el.addEventListener("selectstart", (e) => e.preventDefault());
  }
  noBrowser(stage);
  stage.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") e.preventDefault();
    rot.drag = { x: e.clientX, y: e.clientY, ry: rot.y, rx: rot.x }; rot.vy = 0;
    try { stage.setPointerCapture(e.pointerId); } catch (er) {}
  });
  stage.addEventListener("pointermove", (e) => {
    if (!rot.drag) return;
    const ny = rot.drag.ry + (e.clientX - rot.drag.x) * 0.5;
    rot.vy = ny - rot.y; rot.y = ny; rot.x = clamp(rot.drag.rx - (e.clientY - rot.drag.y) * 0.4, -70, 70); rot.idle = 0;
  });
  const endDrag = () => { rot.drag = null; };
  stage.addEventListener("pointerup", endDrag); stage.addEventListener("pointercancel", endDrag);

  function setTier(i) {
    tier = i;
    const t = P.tiers[i];
    $$(".ars-tab").forEach((b) => b.classList.toggle("on", +b.dataset.t === i));
    $(".ars").style.setProperty("--tc", t.color);
    stage.style.setProperty("--tg", t.glow);
    if (model) model.setTextures(T(`models/${t.id}/`));
    const ph = M.tiers[t.id] && M.tiers[t.id].placeholder;
    $("#arsPh").hidden = !ph;
    const own = (M.tiers[t.id] && M.tiers[t.id].own) || [];
    $("#arsPh").textContent = !ph ? "" : t.id === "netherite" && own.includes("texture08")
      ? "Часть текстур временная."
      : "Часть текстур временная.";
    const dps = t.dmg / (t.cd / 20), maxDps = Math.max(...P.tiers.map((x) => x.dmg / (x.cd / 20)));
    const row = (k, v, w) => `<div class="as-row"><span>${k}</span><span class="as-bar"><i style="width:${clamp(w, 0, 1) * 100}%"></i></span><b>${v}</b></div>`;
    $("#arsSpec").innerHTML = `
      <div class="as-name">${esc(t.name)}</div><div class="as-id">${t.item}</div>
      ${row("Урон", `${t.dmg} <small>(${t.dmg / 2} ♥)</small>`, t.dmg / 100)}
      ${row("Перезарядка", `${fmt(t.cd / 20)} с`, t.cd / 60)}
      ${row("Урон в секунду", fmt(dps), dps / maxDps)}
      ${row("Выстрелов в минуту", fmt(1200 / t.cd, 0), 1200 / t.cd / 40)}
      ${row("Зачаровываемость", t.ench, t.ench / 22)}
      <div class="as-sep"></div>
      <div class="as-inf"><b>∞</b><span>Прочность не тратится. У тира в ModToolTiers записано ${t.uses}, но выстрел её не снимает, поэтому снайперка <b>вечная</b>.</span></div>
      ${t.ult ? `<div class="as-inf" style="border-color:#8a5cf6;background:rgba(138,92,246,.1)"><b style="color:#b999ff">R</b><span>Ульта: луч на 200 блоков, ${t.dmg * 4} урона, сжигает 64 пули.</span></div>` : ""}
      <div class="as-foot"><span>Двойное проникновение: 2 × ${fmt(t.dmg * 0.6)}</span><span>Ремонт: ${img(t.repair)} ${esc(nameOf(t.repair))}</span></div>`;
    $("#arsKill").innerHTML = P.bosses.map((b) => {
      const n = Math.ceil(b.hp / t.dmg), time = (n - 1) * t.cd / 20;
      return `<div class="ak"><span>${esc(b.name)} · ${b.hp} ХП</span><b>${n}</b><span class="sh">${"<i></i>".repeat(Math.min(n, 20))}</span><em>${n === 1 ? "с одного выстрела" : `выстрелов · ${fmt(time)} с`}</em></div>`;
    }).join("");
    // синхронизируем тир и в тире
    if (S) { S.tier = i; renderRangeSide(); }
    renderEnchDemos();
  }
  (function spin(now) {
    requestAnimationFrame(spin);
    if (!model) return;
    if (!rot.drag) { rot.idle++; rot.y += rot.vy; rot.vy *= 0.93; if (rot.idle > 90 && !reduce) rot.y += 0.25; }
    if (arsVis) model.setRot([["x", rot.x], ["y", rot.y]]);
  })();
  let arsVis = true;
  new IntersectionObserver((es) => es.forEach((e) => (arsVis = e.isIntersecting))).observe(stage);
  let lastW = 0;
  new ResizeObserver(() => { if (Math.abs(stage.clientWidth - lastW) > 30) { lastW = stage.clientWidth; buildModel(); setTier(tier); } }).observe(stage);

  /* =====================================================================
     3. ТИР
     ===================================================================== */
  var S = { tier: 0, ench: ZM.store.get("p03.ench", { nimble: 0, double: false, pierce: false }), ammo: ZM.store.get("p03.ammo", 64), creative: false, cdUntil: 0, cdTicks: 1, cdStart: 0 };
  let rec = ZM.store.get("p03.rec", { shots: 0, hits: 0, kills: 0, best: 0 });
  const feed = $("#rgFeed");
  function say(html, cls = "") {
    const d = document.createElement("div"); d.className = "rk " + cls; d.innerHTML = html; feed.prepend(d);
    while (feed.children.length > 6) feed.lastChild.remove();
    setTimeout(() => d.remove(), 4600);
  }
  function renderRangeSide() {
    $("#rgTiers").innerHTML = P.tiers.map((t, i) => `<button type="button" data-t="${i}" class="${S.tier === i ? "on" : ""}" style="--tc:${t.color}" data-tip="${esc(t.name)}" data-tip-info="${t.dmg} урона · КД ${fmt(t.cd / 20)} с"><span>${i + 1}</span>${img(t.item)}</button>`).join("");
    const E = P.enchantments, roman = ["", "I", "II", "III"];
    $("#rgEnch").innerHTML =
      `<button type="button" class="re ${S.ench.nimble ? "on" : ""}" data-e="nimble">${img("minecraft:enchanted_book")}<span>${E[0].name}</span><i>${S.ench.nimble ? roman[S.ench.nimble] : "—"}</i></button>` +
      `<button type="button" class="re ${S.ench.double ? "on" : ""}" data-e="double">${img("minecraft:enchanted_book")}<span>${E[1].name}</span><i>${S.ench.double ? "I" : "—"}</i></button>` +
      `<button type="button" class="re ${S.ench.pierce ? "on" : ""}" data-e="pierce">${img("minecraft:enchanted_book")}<span>${E[2].name}</span><i>${S.ench.pierce ? "I" : "—"}</i></button>`;
    $("#rgAmmo").textContent = S.creative ? "∞" : S.ammo;
    $(".ra-n").classList.toggle("low", !S.creative && S.ammo <= 0);
    $("#rtUlt").hidden = !P.tiers[S.tier].ult;
  }
  $("#rgAmmoIc").src = T("bullet_item.png");
  $("#rgTiers").addEventListener("click", (e) => { const b = e.target.closest("[data-t]"); if (b) { setTier(+b.dataset.t); ZM.sfx("equip", 0.6); } });
  $("#rgEnch").addEventListener("click", (e) => {
    const b = e.target.closest("[data-e]"); if (!b) return;
    const k = b.dataset.e;
    if (k === "nimble") S.ench.nimble = (S.ench.nimble + 1) % 4; else S.ench[k] = !S.ench[k];
    ZM.store.set("p03.ench", S.ench); renderRangeSide();
  });
  $("#rgAdd").addEventListener("click", () => { ZM.sfx("pop", 0.5, 1.5); S.ammo += 64; ZM.store.set("p03.ammo", S.ammo); renderRangeSide(); grant("bullet"); });
  $("#rgCreative").addEventListener("change", (e) => { S.creative = e.target.checked; renderRangeSide(); });
  let range = null, heroRange = null;
  $("#rgReset").addEventListener("click", () => { if (range) range.reset(); say("Полигон отстроен заново"); });
  $("#rgStart").addEventListener("click", () => { $("#rgStart").classList.add("gone"); rangeStarted = true; if (range) range.lock(); });
  let rangeStarted = false;
  const blockRu = (t) => ({ stone: "камень", obsidian: "обсидиан", bedrock: "бедрок", target: "мишень", hay_block: "сено", stone_bricks: "каменные кирпичи" }[t] || t);

  const rangeEvents = {
    sound: (n) => SOUND[n] && SOUND[n](),
    shot: (d) => {
      rec.shots++; saveRec(); renderRec();
      ZM.store.set("p03.ammo", S.ammo); renderRangeSide();
      if (d.pierced) say(d.pierced.ok ? `⟂ пуля вышла за блоком: <b>${blockRu(d.pierced.type)}</b>` : `✕ ${esc(d.pierced.why)}`, d.pierced.ok ? "" : "miss");
    },
    fail: (why) => say(why === "cd" ? `КД: ещё <em>${fmt((S.cdUntil - performance.now()) / 1000)} с</em>` : why === "ultammo" ? `Для ульты нужно <b>64</b> пули, у тебя ${S.ammo}` : "Нет пуль. Скрафти или нажми «+64»", "miss"),
    hit: (r) => {
      if (r.dodge) { say(`<b>Эндермен</b> увернулся: пуля для него снаряд`, "dodge"); return; }
      rec.hits++; saveRec(); renderRec();
      if (!r.killed) say(`<b>${esc(r.mob)}</b> −${fmt(r.dmg)} · ${fmt(r.dist, 0)} м · полёт <em>${fmt(r.flight, 2)} с</em>${r.n ? ` · пуля ${r.n}/2` : ""}`);
    },
    kill: (r) => {
      rec.kills++; if (r.dist > rec.best) rec.best = r.dist; saveRec();
      say(`☠ <b>${esc(r.mob)}</b> убит · <em>${fmt(r.dist, 0)} м</em>${r.src === "ult" ? " · ульта" : r.src === "fire" ? " · сгорел" : ""}`, "kill");
      if (r.dist >= 100 && r.src !== "fire") grant("long_shot");
      renderRec();
    },
    block: (b) => {
      if (b.signal) { say(`⚡ Мишень · сигнал <b>${b.signal}</b>/15 · ${fmt(b.dist, 0)} м`, "sig"); }
      else say(`Попадание: ${blockRu(b.type)} · ${fmt(b.dist, 0)} м`, "miss");
    },
    lock: (on) => {
      $("#rgLock").hidden = !on;
      if (!on && rangeStarted && range && range.wantLock && !coarse) {   // Esc: как пауза в игре
        $("#rgStartT").textContent = "▶ ПРОДОЛЖИТЬ"; $("#rgStartS").textContent = "клик вернёт управление мышью";
        $("#rgStart").classList.remove("gone");
      }
      if (!on && range && !range.wantLock) say("Браузер не дал захватить мышь: целься курсором", "miss");
    },
    ult: (u) => {
      say(`УЛЬТА: сломано блоков: <b>${u.broken}</b>${u.bedrock ? ` · бедрок устоял (${u.bedrock})` : ""}`, "ult");
      renderRangeSide();
    },
  };
  function saveRec() { ZM.store.set("p03.rec", rec); }

  // клавиши тира
  addEventListener("keydown", (e) => {
    if (!range || !range.visible || !rangeStarted || e.target.closest("input,textarea")) return;
    if (e.code === "KeyR") { e.preventDefault(); range.ultimate(); }
    const n = +e.key; if (n >= 1 && n <= 4) setTier(n - 1);
  });
  // тач-кнопки
  const fire = $("#rtFire");
  fire.addEventListener("pointerdown", (e) => { e.preventDefault(); rangeStarted = true; $("#rgStart").classList.add("gone"); range && range.press(); fire.setPointerCapture(e.pointerId); });
  fire.addEventListener("pointerup", () => range && range.release());
  fire.addEventListener("pointercancel", () => range && range.release());
  $("#rtUlt").addEventListener("click", () => range && range.ultimate());

  /* =====================================================================
     4. ПУЛЯ
     ===================================================================== */
  let bullet3d = null, brot = { y: 20, x: 0, vy: 0, drag: null, spin: 0 };
  function buildBullet() {
    const w = $("#blStage").clientWidth, bb = ZMModel3D.bbox(M.bullet), unit = clamp(w * 0.62 / bb.size[0], 20, 160);
    $(".bl-ruler").style.cssText = `left:50%;right:auto;width:${bb.size[0] * unit}px;transform:translateX(-50%)`;
    $(".bl-ruler").dataset.l = `${fmt(bb.size[0] / 16, 2)} блока в длину (${fmt(bb.size[0], 1)} пикс. модели)`;
    if (bullet3d) bullet3d.destroy();
    bullet3d = make3d(M.bullet, T("models/bullet/"), { unit, cls: "bu", persp: 1200 });
    $("#blModel").innerHTML = ""; $("#blModel").appendChild(bullet3d.el);
  }
  const bst = $("#blStage");
  noBrowser(bst);
  bst.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") e.preventDefault();
    brot.drag = { x: e.clientX, y: e.clientY, ry: brot.y, rx: brot.x }; brot.vy = 0;
    try { bst.setPointerCapture(e.pointerId); } catch (er) {}
  });
  bst.addEventListener("pointermove", (e) => {
    if (!brot.drag) return;
    const ny = brot.drag.ry + (e.clientX - brot.drag.x) * 0.5;
    brot.vy = ny - brot.y; brot.y = ny;
    brot.x = clamp(brot.drag.rx - (e.clientY - brot.drag.y) * 0.4, -80, 80);
  });
  const bEnd = () => (brot.drag = null);
  bst.addEventListener("pointerup", bEnd); bst.addEventListener("pointercancel", bEnd);
  let blVis = true;
  new IntersectionObserver((es) => es.forEach((e) => (blVis = e.isIntersecting))).observe(bst);
  (function bspin() {
    requestAnimationFrame(bspin);
    if (!bullet3d || !blVis) return;
    if (!reduce) brot.spin += 2.2;
    if (!brot.drag) { brot.y += brot.vy; brot.vy *= 0.93; }   // инерция после броска
    bullet3d.setRot([["x", brot.x], ["y", brot.y], ["z", -4], ["x", brot.spin]]);
  })();
  let blW = 0;
  new ResizeObserver(() => { if (Math.abs(bst.clientWidth - blW) > 30) { blW = bst.clientWidth; buildBullet(); } }).observe(bst);
  const B = P.bullet;
  $("#blFacts").innerHTML = `
    <div class="bf"><b>${B.speed}</b><span>блоков за тик</span></div>
    <div class="bf"><b>${B.speed * 20}</b><span>блоков в секунду</span></div>
    <div class="bf"><b>${B.speed * 20 * 3.6}</b><span>км/ч (1 блок = 1 м)</span></div>
    <div class="bf"><b>${B.speed * B.lifeTicks}</b><span>блоков максимум, живёт ${B.lifeTicks} тиков (5 с)</span></div>
    <div class="bf"><b>0</b><span>гравитации и разброса, летит по линейке</span></div>
    <div class="bf"><b>= урон</b><span>снайперки: пуля сама урона не задаёт</span></div>
    <div class="bf w">${img("zitraksmode:bullet")}<span><b style="font-size:15px;color:#fff;display:inline">Пуля</b><br>Одна пуля на выстрел. Подобрать после выстрела нельзя. Ульта незеритовой съедает сразу <b style="display:inline;font-size:inherit;color:#fff">64</b>.</span></div>`;

  /* ---- траектории: пуля против ванильных снарядов ----
     Физика как в Minecraft 1.19 (за тик): позиция += скорость, скорость *= сопротивление, скорость.y -= гравитация.
     Раздатчик: направление + 0.1 вверх, сила 1.1. Зелья и пузырёк опыта игрок бросает на 20° выше взгляда. */
  const PROJ = [
    { k: "bullet", n: "Пуля снайперки", ic: "zitraksmode:bullet", v: B.speed, g: 0, d: 1, life: B.lifeTicks, col: "#ffb000", on: 1, w: 2.5 },
    { k: "bow", n: "Стрела из лука", ic: "item_bow", v: 3, g: 0.05, d: 0.99, col: "#9fd4ff", on: 1 },
    { k: "xbow", n: "Стрела из арбалета", ic: "item_crossbow_arrow", v: 3.15, g: 0.05, d: 0.99, col: "#5b7cff", on: 1 },
    { k: "fw", n: "Фейерверк из арбалета", ic: "item_crossbow_firework", v: 1.6, g: 0, d: 1, life: 26, boom: 1, col: "#ff5fd2", on: 0 },
    { k: "trident", n: "Трезубец", ic: "item_trident", v: 2.5, g: 0.05, d: 0.99, col: "#3fe0c0", on: 1 },
    { k: "snow", n: "Снежок рукой", ic: "item_snowball", v: 1.5, g: 0.03, d: 0.99, col: "#f4f4f4", on: 1 },
    { k: "snowd", n: "Снежок из раздатчика", ic: "dispenser_front", v: 1.1, g: 0.03, d: 0.99, disp: 1, col: "#b9c4ff", on: 1, dash: 1 },
    { k: "arrowd", n: "Стрела из раздатчика", ic: "dispenser_front", v: 1.1, g: 0.05, d: 0.99, disp: 1, col: "#8fb3d9", on: 0, dash: 1 },
    { k: "pearl", n: "Эндер-жемчуг", ic: "item_ender_pearl", v: 1.5, g: 0.03, d: 0.99, col: "#27c3a6", on: 0 },
    { k: "egg", n: "Яйцо", ic: "item_egg", v: 1.5, g: 0.03, d: 0.99, col: "#e8d7b0", on: 0 },
    { k: "potion", n: "Взрывное зелье", ic: "item_splash_potion", v: 0.5, g: 0.05, d: 0.99, up: 20, col: "#ff5f7e", on: 0 },
    { k: "xp", n: "Пузырёк опыта", ic: "item_experience_bottle", v: 0.7, g: 0.07, d: 0.99, up: 20, col: "#b6ff4a", on: 0 },
    { k: "ghast", n: "Огненный шар гаста", ic: "item_fire_charge", v: 0, acc: 0.1, g: 0, d: 0.95, life: 100, col: "#e8321e", on: 0 },
  ];
  const EYE = 1.62;   // стреляем с высоты глаз, земля на 1,62 ниже
  const trOn = ZM.store.get("p03.traj", Object.fromEntries(PROJ.map((p) => [p.k, !!p.on])));
  const trCv = $("#trajCv"), trC = trCv.getContext("2d");
  let trT = 0, trRun = false, trAng = 10, trLast = 0, trPaths = null;
  const trIcon = {};
  PROJ.forEach((p) => { const i = new Image(); i.src = p.ic.includes(":") ? src(p.ic) : T(`vanilla/${p.ic}.png`); trIcon[p.k] = i; });
  function simulate(p, angDeg) {
    let a = (angDeg + (p.up || 0)) * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
    if (p.disp) { dy += 0.1; const l = Math.hypot(dx, dy); dx /= l; dy /= l; }
    let x = 0, y = 0, vx = dx * p.v, vy = dy * p.v;
    const pts = [[0, 0]], life = p.life || 1200;
    let landed = false;
    for (let t = 1; t <= life; t++) {
      const nx = x + vx, ny = y + vy;
      if (ny < -EYE) { const f = (y + EYE) / (y - ny); pts.push([x + (nx - x) * f, -EYE, t - 1 + f]); landed = true; break; }
      x = nx; y = ny; pts.push([x, y]);
      if (p.acc) { vx += dx * p.acc; vy += dy * p.acc; }
      vx *= p.d; vy = vy * p.d - p.g;
    }
    const end = pts[pts.length - 1];
    return { pts, landed, dist: Math.hypot(end[0], end[1] + (landed ? EYE : 0)), range: end[0], ticks: end[2] != null ? end[2] : pts.length - 1, peak: Math.max(...pts.map((q) => q[1])) };
  }
  function trCompute() {
    trPaths = Object.fromEntries(PROJ.map((p) => [p.k, simulate(p, trAng)]));
    $("#trPick").innerHTML = PROJ.map((p) => {
      const r = trPaths[p.k], sec = fmt(r.ticks / 20, 2);
      const info = r.landed ? `${fmt(Math.abs(r.range), 1)} бл · ${sec} с · потолок ${fmt(r.peak + EYE, 1)}` : p.boom ? `взрыв через ${sec} с · ${fmt(r.dist, 0)} бл` : `${fmt(r.dist, 0)} бл за ${sec} с, не падает`;
      return `<button type="button" class="tp" data-k="${p.k}" aria-pressed="${!!trOn[p.k]}" style="--c:${p.col}"><img src="${trIcon[p.k].src}" alt=""><b>${esc(p.n)}</b><small>${info}</small></button>`;
    }).join("");
    $("#trNote").innerHTML = `Скорости в блоках за тик: пуля ${B.speed}, стрела лука 3, арбалета 3,15, трезубец 2,5, снежок/яйцо/жемчуг 1,5, фейерверк 1,6, из раздатчика 1,1. Раздатчик на деле смотрит только по сторонам, вверх или вниз, тут он «повёрнут» под тот же угол для сравнения. Пунктир — раздатчик.`;
  }
  $("#trPick").addEventListener("click", (e) => {
    const b = e.target.closest("[data-k]"); if (!b) return;
    trOn[b.dataset.k] = !trOn[b.dataset.k]; ZM.store.set("p03.traj", trOn);
    b.setAttribute("aria-pressed", String(!!trOn[b.dataset.k])); if (!trRun) drawTraj();
  });
  $("#trAng").addEventListener("input", (e) => { trAng = +e.target.value; $("#trAngO").textContent = trAng + "°"; trCompute(); trT = 0; trRun = true; });
  $("#trGo").addEventListener("click", () => { trT = 0; trRun = true; });
  const niceStep = (range, n) => { const r = range / n, p = Math.pow(10, Math.floor(Math.log10(r))); return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= r) || p * 10; };
  function drawTraj(now) {
    const r = trCv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    if (trCv.width !== Math.round(r.width * dpr) || trCv.height !== Math.round(r.height * dpr)) { trCv.width = Math.round(r.width * dpr); trCv.height = Math.round(r.height * dpr); }
    const W = trCv.width, H = trCv.height, c = trC;
    if (!trPaths) trCompute();
    const vis = PROJ.filter((p) => trOn[p.k]).sort((p, q) => (p.k === "bullet") - (q.k === "bullet"));   // пуля рисуется поверх
    // при крутом угле все летят почти по одной вертикали: разносим по дорожкам, чтобы не слипались
    const steep = trAng >= 70, ymaxAll = Math.max(8, ...vis.filter((p) => p.g).map((p) => trPaths[p.k].peak));
    const laneW = steep ? Math.max(3, ymaxAll * 0.09) : 0, lane = {};
    PROJ.filter((p) => trOn[p.k]).forEach((p, i) => (lane[p.k] = i * laneW));
    // рамка обзора: по всем включённым, кроме «бесконечных» прямых (пуля, гаст) — они просто уходят за край
    const fit = vis.filter((p) => p.g || p.boom).length ? vis.filter((p) => p.g || p.boom) : vis;
    let x0 = 0, x1 = 30, y0 = -EYE, y1 = 8;
    for (const p of fit) for (const q of trPaths[p.k].pts) { x0 = Math.min(x0, q[0] + lane[p.k]); x1 = Math.max(x1, q[0] + lane[p.k] + laneW * 0.5); y1 = Math.max(y1, q[1]); }
    if (!fit.length || fit.every((p) => !p.g && !p.boom)) { x1 = Math.max(x1, 60); }
    const padL = 44 * dpr, padR = 18 * dpr, padT = 30 * dpr, padB = 26 * dpr;
    const s = Math.min((W - padL - padR) / (x1 - x0), (H - padT - padB) / (y1 - y0));
    const ox = padL - x0 * s + ((W - padL - padR) - (x1 - x0) * s) / 2 * 0, gy = H - padB, oy = gy - EYE * s;   // земля внизу
    const X = (x) => ox + x * s, Y = (y) => oy - y * s;
    c.clearRect(0, 0, W, H);
    c.fillStyle = "#06100c"; c.fillRect(0, 0, W, H);
    // сетка
    const st = niceStep(Math.max((W - padL) / s, (H - padT - padB) / s * 1.6, 10), 8);
    c.lineWidth = 1; c.font = `${10 * dpr}px Tektur, monospace`; c.textAlign = "center";
    for (let d = Math.ceil((0 - ox) / s / st) * st; X(d) < W; d += st) { c.strokeStyle = "rgba(125,255,138,.10)"; c.beginPath(); c.moveTo(X(d), 0); c.lineTo(X(d), gy); c.stroke(); c.fillStyle = "#6f8f78"; c.fillText(fmt(d, 0), X(d), gy + 16 * dpr); }
    c.textAlign = "right";
    for (let h = st; Y(h - EYE) > 0; h += st) { c.strokeStyle = "rgba(125,255,138,.06)"; c.beginPath(); c.moveTo(padL, Y(h - EYE)); c.lineTo(W, Y(h - EYE)); c.stroke(); c.fillStyle = "#56705e"; c.fillText(fmt(h, 0), padL - 6 * dpr, Y(h - EYE) + 3 * dpr); }
    c.fillStyle = "#12301d"; c.fillRect(0, gy, W, H - gy);
    c.fillStyle = "#1c4a2c"; c.fillRect(0, gy, W, 2 * dpr);
    // стрелок (на каждой дорожке свой, если разнесли)
    c.fillStyle = "#7dff8a";
    for (const k of steep ? Object.keys(lane) : ["_"]) c.fillRect(X(lane[k] || 0) - 4 * dpr, gy - Math.max(EYE * s, 8 * dpr), 7 * dpr, Math.max(EYE * s, 8 * dpr));
    if (steep) { c.fillStyle = "#6f8f78"; c.textAlign = "left"; c.fillText("снаряды разнесены по дорожкам, чтобы не слипались", padL, 34 * dpr); }
    const tick = trRun ? trT : 1e9;
    const heads = [];
    for (const p of vis) {
      const R = trPaths[p.k], pts = R.pts;
      c.strokeStyle = p.col; c.lineWidth = (p.w || 2) * dpr; c.setLineDash(p.dash ? [6 * dpr, 5 * dpr] : []);
      c.beginPath(); let hx = 0, hy = 0;
      for (let i = 0; i < pts.length; i++) {
        let [x, y] = pts[i];
        const ti = pts[i][2] != null ? pts[i][2] : i;
        if (ti > tick) { const [px, py] = pts[i - 1], pt = pts[i - 1][2] != null ? pts[i - 1][2] : i - 1, f = (tick - pt) / (ti - pt); x = px + (x - px) * f; y = py + (y - py) * f; }
        x += lane[p.k];
        i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y)); hx = x; hy = y;
        if (ti > tick) break;
      }
      c.stroke(); c.setLineDash([]);
      heads.push([p, hx, hy, tick >= R.ticks]);
    }
    for (const [p, hx, hy, done] of heads) {
      const px = X(hx), py = Y(hy);
      if (p.boom && done) {   // фейерверк взрывается
        c.fillStyle = p.col; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; c.fillRect(px + Math.cos(a) * 12 * dpr - dpr, py + Math.sin(a) * 12 * dpr - dpr, 3 * dpr, 3 * dpr); }
      }
      c.fillStyle = p.col; c.beginPath(); c.arc(px, py, 3.2 * dpr, 0, Math.PI * 2); c.fill();
      const im = trIcon[p.k];
      if (im.complete && im.naturalWidth && px > -20 && px < W + 20) { c.imageSmoothingEnabled = false; const z = 18 * dpr; c.drawImage(im, px - z / 2, py - z - 6 * dpr, z, z); }
    }
    c.textAlign = "left"; c.fillStyle = "#cfe8d4"; c.font = `${11 * dpr}px Tektur, monospace`;
    c.fillText(`t = ${fmt(Math.min(tick, 999), 1)} тиков (${fmt(Math.min(tick, 999) / 20, 2)} с) · угол ${trAng}°`, padL, 18 * dpr);
    if (trRun) {
      const dt = trLast && now ? Math.min(0.1, (now - trLast) / 1000) : 1 / 60;
      trT += dt * 20;
      const maxT = Math.max(20, ...vis.map((p) => trPaths[p.k].ticks));
      if (trT > maxT + 10) trRun = false;
    }
    trLast = now || 0;
  }
  let trVis = false;
  new IntersectionObserver((es) => es.forEach((e) => { trVis = e.isIntersecting; if (trVis) { trT = 0; trRun = true; } }), { threshold: 0.3 }).observe(trCv);
  let trDirty = true;
  new ResizeObserver(() => (trDirty = true)).observe(trCv);
  (function trLoop(now) { requestAnimationFrame(trLoop); if (trVis && (trRun || trDirty)) { trDirty = false; drawTraj(now); } else trLast = 0; })();

  /* =====================================================================
     5. ЗАЧАРОВАНИЯ
     ===================================================================== */
  const E = P.enchantments;
  let nimLv = 1, pcBlock = "minecraft:stone";
  const PC_BLOCKS = ["minecraft:stone", "minecraft:iron_block", "minecraft:obsidian", "minecraft:crying_obsidian", "minecraft:bedrock", "minecraft:reinforced_deepslate", "minecraft:end_portal_frame", "minecraft:barrier"];
  function enCard(e, demo) {
    return `<article class="enc reveal"><div class="enc-h">${img("minecraft:enchanted_book")}<div><div class="enc-t">${esc(e.name)}</div><div class="enc-id">${e.id}</div></div></div>
      <div class="enc-tags"><span>макс. ${["", "I", "II", "III"][e.max]}</span><span>${e.rarityRu}</span><span>книги + стол</span><span>только снайперки</span></div>
      <p class="enc-p">${esc(e.text)}</p><div class="enc-demo" data-demo="${e.key}">${demo}</div>
      <div class="enc-cost">Стоимость на столе: ${e.cost.map((c, i) => `${e.max > 1 ? ["I", "II", "III"][i] + " " : ""}${c[0]}–${c[1]}`).join(" · ")}</div></article>`;
  }
  $("#enGrid").innerHTML = enCard(E[0], "") + enCard(E[1], "") + enCard(E[2], "");
  function renderEnchDemos() {
    const t = P.tiers[tier];
    const nd = $('[data-demo="nimble"]');
    if (nd) nd.innerHTML = `<div class="enc-lv">${[0, 1, 2, 3].map((l) => `<button type="button" data-lv="${l}" class="${l === nimLv ? "on" : ""}">${l ? ["", "I", "II", "III"][l] : "без"}</button>`).join("")}</div>` +
      P.tiers.map((x) => { const cd = Math.max(1, Math.round(x.cd * E[0].mult[nimLv])); return `<div class="cdrow" style="--tc:${x.color}"><span>${x.short}</span><span class="tr"><i style="width:${cd / 60 * 100}%"></i></span><b>${fmt(cd / 20, 2)} с</b></div>`; }).join("") +
      `<div class="cdrow" style="--tc:#8a5cf6"><span>ульта</span><span class="tr"><i style="width:${Math.round(600 * E[0].mult[nimLv]) / 600 * 100}%"></i></span><b>${fmt(Math.round(600 * E[0].mult[nimLv]) / 20, 1)} с</b></div>`;
    const dd = $('[data-demo="double"]');
    if (dd) dd.innerHTML = `<div class="dp-line"><i class="dp-b"></i><i class="dp-b two"></i>${[0, 1, 2, 3, 4].map((k) => `<span class="tk" style="left:${k * 25}%">${k * 2} т</span>`).join("")}</div>
      <div class="dp-sum"><span>${t.short}: <b>${fmt(t.dmg * 0.6)} + ${fmt(t.dmg * 0.6)}</b></span><span>= <b style="color:var(--amber)">${fmt(t.dmg * 1.2)}</b> вместо ${t.dmg}</span></div>
      <button type="button" class="chip" data-dp style="margin-top:10px">▶ залп</button>`;
    renderPierce();
  }
  function renderPierce() {
    const pd = $('[data-demo="pierce"]'); if (!pd) return;
    const no = P.noPierce.includes(pcBlock);
    if (!pd.querySelector("canvas")) {
      pd.innerHTML = `<canvas class="pc-cv"></canvas><div class="pc-list">${PC_BLOCKS.map((b) => `<button type="button" data-b="${b}" class="${P.noPierce.includes(b) ? "no" : ""}" data-tip="${esc(nameOf(b) === b ? "Железный блок" : nameOf(b))}">${img(b)}</button>`).join("")}</div><div class="pc-msg"></div>`;
    }
    $$(".pc-list button", pd).forEach((b) => b.classList.toggle("on", b.dataset.b === pcBlock));
    const nm = pcBlock === "minecraft:iron_block" ? "Железный блок" : nameOf(pcBlock);
    $(".pc-msg", pd).innerHTML = no ? `<b class="no">✕ ${esc(nm)}</b>: в списке запрещённых. Пуля вылетает как обычно и упирается в блок.` : `<b class="ok">✓ ${esc(nm)}</b>: пуля появляется сразу за блоком и летит дальше. Пробивается только первый блок.`;
    pcAnim = 0;
  }
  let pcAnim = 0, pcImgs = {};
  function drawPierce() {
    const cv = $(".pc-cv"); if (!cv) return;
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    const c = cv.getContext("2d"), W = cv.width, H = cv.height, s = H / 4.2;
    c.clearRect(0, 0, W, H); c.imageSmoothingEnabled = false;
    const gy = H - 6 * dpr;
    c.fillStyle = "rgba(125,255,138,.15)"; c.fillRect(0, gy, W, 2);
    // игрок (силуэт) слева, стена по центру, зомби справа
    c.fillStyle = "#7dff8a"; c.fillRect(W * 0.06, gy - s * 1.8, s * 0.5, s * 1.8);
    const key = pcBlock.split(":")[1];
    const im = pcImgs[key] || (pcImgs[key] = Object.assign(new Image(), { src: src(pcBlock) }));
    const bx = W * 0.46;
    for (let k = 0; k < 2; k++) if (im.complete && key !== "barrier") c.drawImage(im, bx, gy - s * (k + 1) - 2, s, s); else if (key === "barrier") { c.strokeStyle = "#ff3b3b"; c.lineWidth = 2; c.strokeRect(bx, gy - s * (k + 1), s, s); }
    const zi = tex && tex.mobs.zombie;
    if (zi) c.drawImage(zi, W * 0.82, gy - s * 1.95, s * 0.98, s * 1.95);
    const no = P.noPierce.includes(pcBlock), ey = gy - s * 1.55;
    pcAnim = Math.min(1, pcAnim + 0.012);
    const p = pcAnim;
    const x0 = W * 0.06 + s * 0.5, xw = bx, xa = bx + s + 3, xz = W * 0.82 + s * 0.3;
    c.strokeStyle = "#ffb000"; c.lineWidth = 2 * dpr; c.setLineDash([4 * dpr, 4 * dpr]);
    c.beginPath();
    if (no) { c.moveTo(x0, ey); c.lineTo(x0 + (xw - x0) * Math.min(1, p * 2), ey); }
    else { c.moveTo(x0, ey); c.lineTo(xw, ey); }
    c.stroke(); c.setLineDash([]);
    if (!no && p > 0.15) {
      c.strokeStyle = "#ffe6a0"; c.lineWidth = 3 * dpr; c.beginPath(); c.moveTo(xa, ey); c.lineTo(xa + (xz - xa) * Math.min(1, (p - 0.15) * 2), ey); c.stroke();
      c.fillStyle = "#fff"; c.beginPath(); c.arc(xa, ey, 3 * dpr, 0, 7); c.fill();
    }
    if (no && p > 0.5) { c.fillStyle = "#ff3b3b"; c.font = `bold ${14 * dpr}px Tektur`; c.fillText("✕", xw - 14 * dpr, ey - 6 * dpr); }
    c.fillStyle = "#8e7aa8"; c.font = `${9 * dpr}px Tektur, monospace`; c.fillText("ты", W * 0.06, gy - s * 1.9); c.fillText("цель", W * 0.82, gy - s * 2.05);
    if (p >= 1) pcAnim = 0;
  }
  $("#enGrid").addEventListener("click", (e) => {
    const lv = e.target.closest("[data-lv]"); if (lv) { nimLv = +lv.dataset.lv; renderEnchDemos(); return; }
    const b = e.target.closest("[data-b]"); if (b) { pcBlock = b.dataset.b; renderPierce(); return; }
    if (e.target.closest("[data-dp]")) {
      $$(".dp-b").forEach((x) => { x.classList.remove("go"); void x.offsetWidth; x.classList.add("go"); });
      SOUND.sniper_shot(); setTimeout(() => SOUND.sniper_shot(), 100);
    }
  });
  let enVis = false;
  new IntersectionObserver((es) => es.forEach((e) => (enVis = e.isIntersecting)), { threshold: 0.05 }).observe($("#enGrid"));
  (function enLoop() { requestAnimationFrame(enLoop); if (enVis) drawPierce(); })();

  /* =====================================================================
     6. УЛЬТА: разрез мира сбоку, луч ломает всё кроме бедрока
     ===================================================================== */
  const U_ = P.ult;
  $("#ultStats").innerHTML = `
    <div class="us"><b>${U_.range}</b><span>блоков длина луча</span></div>
    <div class="us"><b>${P.tiers[3].dmg * U_.dmgMul}</b><span>урона (100 × 4)</span></div>
    <div class="us"><b>${U_.fire} с</b><span>поджог</span></div>
    <div class="us"><b>${fmt(U_.cd / 20, 0)} с</b><span>перезарядка</span></div>
    <div class="us"><b>${U_.knockback}</b><span>отбрасывание</span></div>
    <div class="us"><b>+${U_.hitboxInflate}</b><span>к хитбоксу цели</span></div>
    <div class="us w">${img("zitraksmode:bullet")}<span><b style="display:inline;font-size:18px">× ${U_.ammo}</b> пуль за один выстрел</span></div>
    <div class="us w">${img("minecraft:bedrock")}<span>Бедрок луч не ломает, но проходит сквозь него дальше</span></div>`;
  const uCv = $("#ultCv"), uC = uCv.getContext("2d");
  const UT = {};
  ["dirt", "stone", "deepslate", "gravel", "coal_ore", "iron_ore", "diamond_ore", "deepslate_diamond_ore", "obsidian", "bedrock", "oak_log", "oak_leaves", "grass_block_side", "cobblestone"].forEach((n) => (UT[n] = Object.assign(new Image(), { src: T(`vanilla/${n}.png`) })));
  const COLS = 72, ROWS = 26;
  const uSide = Object.assign(new Image(), { src: T("icons/netherite_sniper_side.png") });
  let ug, uMobs, uBeam = null, uParts = [], uAim = 0.06, uLast = 0;
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  function genCut() {
    const seed = Math.random() * 100;
    ug = [];
    const surf = [];
    for (let x = 0; x < COLS; x++) surf[x] = Math.round(9 + Math.sin((x + seed) * 0.15) * 2 + Math.sin((x + seed) * 0.37) * 1.2);
    for (let x = 0; x < 6; x++) surf[x] = surf[6];
    for (let y = 0; y < ROWS; y++) {
      ug[y] = [];
      for (let x = 0; x < COLS; x++) {
        let b = null; const s = surf[x];
        if (y === s) b = "grass_block_side"; else if (y > s && y <= s + 3) b = "dirt";
        else if (y > s + 3) { const r = hash(x + seed, y); b = y > 19 ? "deepslate" : "stone";
          if (r < 0.05) b = y > 19 ? "deepslate_diamond_ore" : "coal_ore"; else if (r < 0.08) b = "iron_ore"; else if (r < 0.1) b = "gravel";
          if (y > 19 && r > 0.97) b = "diamond_ore"; }
        if (y >= ROWS - 2 || (y === ROWS - 3 && hash(x, seed) < 0.5)) b = "bedrock";
        ug[y][x] = b;
      }
    }
    // пещера
    const cx = 30 + Math.floor(Math.random() * 14), cy = 15;
    for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 7; x <= cx + 7; x++) if (((x - cx) / 7) ** 2 + ((y - cy) / 2.4) ** 2 < 1) ug[y][x] = null;
    // обсидиановая стена и бедрок-колонна
    const ox = 20 + Math.floor(Math.random() * 6);
    for (let y = surf[ox] - 4; y < surf[ox] + 6; y++) { if (y >= 0) { ug[y][ox] = "obsidian"; ug[y][ox + 1] = "obsidian"; } }
    const bx = 52 + Math.floor(Math.random() * 8);
    for (let y = surf[bx] - 5; y < ROWS; y++) if (y >= 0) ug[y][bx] = "bedrock";
    // дерево
    const tx = 12; for (let y = Math.max(0, surf[tx] - 4); y < surf[tx]; y++) ug[y][tx] = "oak_log";
    for (let y = Math.max(0, surf[tx] - 7); y < surf[tx] - 3; y++) for (let x = tx - 2; x <= tx + 2; x++) if (!ug[y][x] && Math.abs(x - tx) + Math.abs(y - (surf[tx] - 5)) < 4) ug[y][x] = "oak_leaves";
    uMobs = [
      { k: "zombie", x: 36, y: surf[36], hp: 20 }, { k: "creeper", x: 46, y: surf[46], hp: 20 },
      { k: "skeleton", x: cx, y: cy + 2.4, hp: 20 }, { k: "enderman", x: 64, y: surf[64], hp: 40 },
    ].map((m) => ({ ...m, vx: 0, vy: 0, fire: 0, dead: 0, ox: 0, oy: 0 }));
    ug.surf = surf;
    uBeam = null; uParts = [];
    $("#ultNote").innerHTML = `Разрез мира сбоку. <b>Наведи мышку</b> (или тапни), куда стрелять, и жми «R · ОГОНЬ». Шаг проверки блоков 0,3, как в коде.`;
  }
  genCut();
  function uEye() { return { x: 3.5, y: ug.surf[3] - 1.62 }; }
  uCv.addEventListener("pointermove", (e) => {
    const r = uCv.getBoundingClientRect(), cell = r.width / COLS;
    const offY = r.height - ROWS * cell, px = (e.clientX - r.left) / cell, py = (e.clientY - r.top - offY) / cell;
    const eye = uEye(); uAim = clamp(Math.atan2(py - eye.y, px - eye.x), -1.2, 1.2);
  });
  uCv.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") { const r = uCv.getBoundingClientRect(), cell = r.width / COLS, offY = r.height - ROWS * cell; const eye = uEye(); uAim = clamp(Math.atan2((e.clientY - r.top - offY) / cell - eye.y, (e.clientX - r.left) / cell - eye.x), -1.2, 1.2); } });
  function ultFire() {
    if (uBeam && uBeam.t < 0.8) return;
    ultRelease();   // как в моде: луч бьёт сразу по нажатию R, без зарядки
  }
  function ultRelease() {
    const eye = uEye(), dx = Math.cos(uAim), dy = Math.sin(uAim);
    let broken = 0, bed = new Set(); const seen = new Set();
    for (let t = 0; t <= 200; t += U_.blockStep) {
      const x = Math.floor(eye.x + dx * t), y = Math.floor(eye.y + dy * t);
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS) continue;
      const b = ug[y][x]; if (!b) continue;
      if (b === "bedrock") { bed.add(x + "," + y); continue; }
      ug[y][x] = null; broken++;
      for (let i = 0; i < 5; i++) uParts.push({ x: x + Math.random(), y: y + Math.random(), vx: (Math.random() - 0.5) * 0.3, vy: -Math.random() * 0.3, life: 0.8, age: 0, tex: b });
    }
    const hits = [];
    for (const m of uMobs) {
      if (m.dead) continue;
      const h = m.k === "enderman" ? 2.9 : 1.95, w = 0.3 + U_.hitboxInflate;
      // пересечение луча с прямоугольником моба (+0.45)
      const x0 = m.x - w, x1 = m.x + w, y0 = m.y - h - U_.hitboxInflate, y1 = m.y + U_.hitboxInflate;
      let t0 = 0, t1 = 200;
      for (const [o, d, a, b] of [[eye.x, dx, x0, x1], [eye.y, dy, y0, y1]]) { if (Math.abs(d) < 1e-9) { if (o < a || o > b) { t0 = 1; t1 = 0; } continue; } let ta = (a - o) / d, tb = (b - o) / d; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); }
      if (t0 <= t1) { m.dead = 1; m.fire = 8; m.vx = dx * 1.2; m.vy = dy * 1.2 - 0.12; hits.push(P.mobs[m.k].name); }
    }
    uBeam = { t: 0, dx, dy, eye };
    SOUND.ult_shot();
    $("#ultNote").innerHTML = `Сломано блоков: <b>${broken}</b>. Бедрок на пути: <b>${bed.size}</b> (цел). ${hits.length ? `Попал по: <b>${hits.join(", ")}</b>, 400 урона, поджог.` : "Мобов на линии не было."}`;
  }
  $("#ultFire").addEventListener("click", ultFire);
  $("#ultNew").addEventListener("click", genCut);
  let ultVis = false;
  new IntersectionObserver((es) => es.forEach((e) => (ultVis = e.isIntersecting)), { threshold: 0.1 }).observe(uCv);
  addEventListener("keydown", (e) => { if (ultVis && e.code === "KeyR" && !(range && range.visible)) { e.preventDefault(); ultFire(); } });
  function drawUlt(now) {
    const dt = Math.min(0.05, (now - uLast) / 1000 || 0); uLast = now;
    const r = uCv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    if (uCv.width !== Math.round(r.width * dpr) || uCv.height !== Math.round(r.height * dpr)) { uCv.width = Math.round(r.width * dpr); uCv.height = Math.round(r.height * dpr); }
    const c = uC, W = uCv.width, H = uCv.height, cell = W / COLS, offY = H - ROWS * cell;
    c.imageSmoothingEnabled = false;
    const sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#0a0716"); sky.addColorStop(1, "#1a1030"); c.fillStyle = sky; c.fillRect(0, 0, W, H);
    c.save(); c.translate(0, offY);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const b = ug[y][x];
      if (b) { const im = UT[b]; if (im && im.complete) c.drawImage(im, x * cell, y * cell, cell + 0.5, cell + 0.5); if (b === "oak_leaves") { c.fillStyle = "rgba(60,140,40,.55)"; c.fillRect(x * cell, y * cell, cell, cell); } }
      else if (y > ug.surf[x]) { c.fillStyle = "#05030a"; c.fillRect(x * cell, y * cell, cell + 0.5, cell + 0.5); }
    }
    // тень глубины
    c.fillStyle = "rgba(10,5,25,.25)"; c.fillRect(0, 0, W, ROWS * cell);
    // мобы
    for (const m of uMobs) {
      const im = tex && tex.mobs[m.k]; if (!im) continue;
      const h = (m.k === "enderman" ? 2.9 : m.k === "creeper" ? 1.7 : 1.95) * cell, w = h * im.width / im.height;
      if (m.dead) { m.ox += m.vx * dt * 20; m.oy += m.vy * dt * 20; m.vy += 0.06 * dt * 20; m.fire -= dt; }
      if (m.dead && m.fire < 5) continue;
      c.save(); c.translate((m.x + m.ox) * cell, (m.y + m.oy) * cell);
      if (m.dead) c.rotate(Math.min(1, (8 - m.fire) * 1.5) * Math.PI / 2);
      c.drawImage(im, -w / 2, -h, w, h);
      if (m.dead) { c.globalAlpha = 0.5; c.fillStyle = "#ff2020"; c.fillRect(-w / 2, -h, w, h); c.globalAlpha = 1; if (tex.fire) c.drawImage(tex.fire, 0, (Math.floor(now / 60) % 32) * 16, 16, 16, -w * 0.8, -h * 1.1, w * 1.6, h * 1.1); }
      c.restore();
    }
    // игрок со снайперкой
    const eye = uEye();
    c.fillStyle = "#3b2a5a"; c.fillRect((eye.x - 0.3) * cell, (eye.y - 0.3) * cell, 0.6 * cell, 1.92 * cell);
    c.fillStyle = "#c8a27a"; c.fillRect((eye.x - 0.3) * cell, (eye.y - 0.3) * cell, 0.6 * cell, 0.55 * cell);
    // незеритовая сбоку: ствол ровно по линии прицела, приклад у плеча
    if (uSide.complete && uSide.naturalWidth) { const w = cell * 3.4; c.save(); c.translate(eye.x * cell, (eye.y + 0.12) * cell); c.rotate(uAim); c.scale(-1, 1); c.drawImage(uSide, -w * 0.86, -w * 0.5 + w * 0.02, w, w); c.restore(); }
    // прицельная линия
    if (!uBeam || uBeam.t > 1.2) {
      c.setLineDash([cell * 0.4, cell * 0.4]); c.strokeStyle = "rgba(185,153,255,.45)"; c.lineWidth = Math.max(1, dpr);
      c.beginPath(); c.moveTo(eye.x * cell, eye.y * cell); c.lineTo((eye.x + Math.cos(uAim) * 90) * cell, (eye.y + Math.sin(uAim) * 90) * cell); c.stroke(); c.setLineDash([]);
    }
    // луч
    if (uBeam) {
      uBeam.t += dt;
      const k = Math.max(0, 1 - uBeam.t / 1.6), L = Math.min(1, uBeam.t / 0.08) * 200;
      const ex = (uBeam.eye.x + uBeam.dx * L) * cell, ey = (uBeam.eye.y + uBeam.dy * L) * cell;
      c.save(); c.globalCompositeOperation = "lighter"; c.lineCap = "round";
      [[cell * 1.6, `rgba(138,92,246,${0.45 * k})`], [cell * 0.8, `rgba(80,220,255,${0.6 * k})`], [cell * 0.28, `rgba(240,255,255,${0.95 * k})`]].forEach(([w, col]) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(uBeam.eye.x * cell, uBeam.eye.y * cell); c.lineTo(ex, ey); c.stroke(); });
      for (let i = 0; i < 30 * k; i++) { const t = Math.random() * Math.min(L, 90); c.fillStyle = Math.random() < 0.5 ? "#6ff2ff" : "#d9c8ff"; c.fillRect((uBeam.eye.x + uBeam.dx * t) * cell + (Math.random() - 0.5) * cell, (uBeam.eye.y + uBeam.dy * t) * cell + (Math.random() - 0.5) * cell, cell * 0.18, cell * 0.18); }
      c.restore();
      if (uBeam.t > 1.6) uBeam.t = 1.61;
    }
    for (const p of uParts) { p.age += dt; p.x += p.vx; p.y += p.vy; p.vy += 0.02; const im = UT[p.tex]; if (im && im.complete) { c.globalAlpha = 1 - p.age / p.life; c.drawImage(im, 4, 4, 5, 5, p.x * cell, p.y * cell, cell * 0.28, cell * 0.28); } }
    c.globalAlpha = 1; uParts = uParts.filter((p) => p.age < p.life);
    c.restore();
    c.fillStyle = "rgba(217,200,255,.7)"; c.font = `${10 * dpr}px Tektur, monospace`; c.fillText("→ луч продолжается до 200 блоков", W - 230 * dpr, 16 * dpr);
  }
  (function uLoop(now) { requestAnimationFrame(uLoop); if (ultVis) drawUlt(now); })(0);

  /* =====================================================================
     7. КРАФТ
     ===================================================================== */
  const RECIPES = P.recipes;
  const CR_ORDER = ["zitraksmode:bullet", "zitraksmode:iron_sniper", "zitraksmode:golden_sniper", "zitraksmode:diamond_sniper", "zitraksmode:netherite_sniper"];
  let crSel = "zitraksmode:iron_sniper";
  const crColor = (id) => { const t = P.tiers.find((x) => x.item === id); return t ? t.color : "#ffb000"; };
  function renderCraft() {
    $("#crTabs").innerHTML = CR_ORDER.map((id) => `<button type="button" data-id="${id}" class="${id === crSel ? "on" : ""}">${img(id)}<span>${esc(nameOf(id).replace(/\sснайперка/i, ""))}</span></button>`).join("");
    const r = RECIPES[crSel];
    const slot = (id, x, y, res) => `<div class="cr-slot ${res ? "res" : ""}" style="left:${x / 176 * 100}%;top:${y / 80 * 100}%" ${id ? `data-tip="${esc(nameOf(id))}" data-tip-sub="${id}"` : ""}>${id ? img(id) : ""}${res && r.count > 1 ? `<b>${r.count}</b>` : ""}</div>`;
    $("#crTable").style.backgroundImage = `url('${T("vanilla/crafting_table_gui.png")}')`;
    $("#crTable").style.backgroundSize = `${256 / 176 * 100}% auto`;
    $("#crTable").innerHTML = r.grid.map((id, i) => slot(id, 30 + (i % 3) * 18, 17 + Math.floor(i / 3) * 18)).join("") + slot(crSel, 124, 35, true);
    const cnt = {}; r.grid.forEach((id) => id && (cnt[id] = (cnt[id] || 0) + 1));
    const desc = {
      "zitraksmode:bullet": "Самородок, порох и слиток по диагонали. Одна пуля за крафт, так что на ульту (64 пули) придётся покрафтить.",
      "zitraksmode:iron_sniper": "Подзорная труба сверху, три железных блока посередине, внизу пуля и слиток.",
      "zitraksmode:golden_sniper": "Железная снайперка в центре, вокруг 8 золотых блоков. Урон вырастает с 20 до 35, КД сокращается до 1,5 с.",
      "zitraksmode:diamond_sniper": "Золотая в центре, вокруг 8 алмазных блоков. Бьёт на 45, но перезаряжается дольше всех младших: 2,5 с.",
      "zitraksmode:netherite_sniper": "Самый дорогой крафт: 3 незеритовых блока, все три младшие снайперки, обсидиан, звезда Незера и кристалл Края.",
    }[crSel];
    $("#crInfo").style.setProperty("--tc", crColor(crSel));
    $("#crInfo").innerHTML = `<h3>${esc(nameOf(crSel))}</h3><p>${desc}</p><ul>${Object.entries(cnt).map(([id, n]) => `<li><b>×${n}</b>${img(id)}<span>${esc(nameOf(id))}</span></li>`).join("")}</ul>
      <div class="cr-hint ${got.includes(crSel.split(":")[1]) ? "got" : ""}">${got.includes(crSel.split(":")[1]) ? "✓ Уже забирал, ачивка есть" : "▸ Нажми на результат справа от стрелки, чтобы забрать предмет"}</div>`;
  }
  $("#crTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-id]"); if (b) { crSel = b.dataset.id; renderCraft(); } });
  // «inventory_changed»: забрал предмет из слота результата -> ачивка ветки
  $("#crTable").addEventListener("click", (e) => {
    if (!e.target.closest(".cr-slot.res")) return;
    play("orb", 0.4, 1.2);
    grant(crSel.split(":")[1]);
    renderCraft();
  });

  // Полная стоимость: разворачиваем рецепты мода рекурсивно до ванильных предметов
  let costSel = "zitraksmode:netherite_sniper";
  const INGOTS = { "minecraft:iron_block": ["minecraft:iron_ingot", 9], "minecraft:gold_block": ["minecraft:gold_ingot", 9], "minecraft:diamond_block": ["minecraft:diamond", 9], "minecraft:netherite_block": ["minecraft:netherite_ingot", 9] };
  function tally(id, n, acc) {
    const r = RECIPES[id];
    if (!r) { acc[id] = (acc[id] || 0) + n; return; }
    const cnt = {}; r.grid.forEach((x) => x && (cnt[x] = (cnt[x] || 0) + 1));
    for (const [k, v] of Object.entries(cnt)) tally(k, v * n, acc);
  }
  function treeHtml(id, n, depth) {
    const r = RECIPES[id];
    const kids = r ? Object.entries(r.grid.reduce((a, x) => (x && (a[x] = (a[x] || 0) + 1), a), {})) : [];
    const ing = INGOTS[id];
    const has = kids.length > 0;
    return `<div class="ct"><div class="ct-n ${has ? "has" : ""}"><span class="tw">${has ? (depth < 1 ? "▾" : "▸") : "·"}</span><em>×${n}</em>${img(id)}<span>${esc(nameOf(id))}${ing ? ` <small style="color:var(--mute)">(= ${ing[1] * n} ${esc(nameOf(ing[0]).toLowerCase())})</small>` : ""}</span></div>
      ${has ? `<div class="ct-kids ${depth < 1 ? "" : "shut"}">${kids.map(([k, v]) => treeHtml(k, v * n, depth + 1)).join("")}</div>` : ""}</div>`;
  }
  function renderCost() {
    $("#costTabs").innerHTML = CR_ORDER.slice().reverse().map((id) => `<button type="button" data-id="${id}" class="${id === costSel ? "on" : ""}" data-tip="${esc(nameOf(id))}">${img(id)}</button>`).join("");
    $("#costTree").innerHTML = treeHtml(costSel, 1, 0);
    const acc = {}; tally(costSel, 1, acc);
    const order = Object.entries(acc).sort((a, b) => b[1] - a[1]);
    const ing = {}; order.forEach(([k, v]) => { const x = INGOTS[k]; if (x) ing[x[0]] = (ing[x[0]] || 0) + x[1] * v; else if (/_ingot$|^minecraft:diamond$/.test(k)) ing[k] = (ing[k] || 0) + v; });
    const snipers = costSel === "zitraksmode:netherite_sniper" ? "Внутри 3 железные, 2 золотые и 1 алмазная снайперка (все сгорают в крафте)." : "";
    $("#costSum").innerHTML = `<div class="rg-lbl">Итого из сундука</div>
      <div class="cs-grid">${order.map(([k, v]) => `<div class="cs-it" data-tip="${esc(nameOf(k))}" data-tip-info="× ${v}">${img(k)}<b>${v}</b></div>`).join("")}</div>
      <div class="cs-note">${Object.keys(ing).length ? "В пересчёте на слитки: " + Object.entries(ing).map(([k, v]) => `<b>${v}</b> ${esc(nameOf(k).toLowerCase())}`).join(", ") + ". " : ""}${snipers}</div>`;
  }
  $("#costTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-id]"); if (b) { costSel = b.dataset.id; renderCost(); } });
  $("#costTree").addEventListener("click", (e) => {
    const n = e.target.closest(".ct-n.has"); if (!n) return;
    const k = n.nextElementSibling; k.classList.toggle("shut"); n.querySelector(".tw").textContent = k.classList.contains("shut") ? "▸" : "▾";
  });

  /* =====================================================================
     8. ВЕТКА ДОСТИЖЕНИЙ (общий вид, стили в shared/core.css)
     ===================================================================== */
  $("#advBoard").style.setProperty("--tile", `url("${new URL(T("vanilla/stone.png"), location.href).href}")`);   // тот же фон, что у ветки цифроблоков
  // Иконки в рамках как в игре: пуля объёмная (плоская 124×24 в рамке не читается), снайперки и мишень заполняют рамку
  const advSrc = (a) => (a.icon === "zitraksmode:bullet" ? T("icons/bullet_3d.png") : src(a.icon));
  const advIc = (a, px) => `<span class="ic adv-ic" style="width:${px}px;height:${px}px"><img src="${advSrc(a)}" alt="" draggable="false"></span>`;
  function renderTree(pulse) {
    const open = ADV.filter((a) => got.includes(a.key)), hidden = ADV.length - open.length;
    if (!advSel || !got.includes(advSel)) advSel = open.length ? open[open.length - 1].key : null;
    $("#advChain").innerHTML = open.length
      ? open.map((a, i) => (i ? `<div class="adv-link on"></div>` : "") + `
        <button type="button" class="adv-node ${pulse === a.key ? "pulse" : ""} ${advSel === a.key ? "sel" : ""}" data-k="${a.key}" aria-label="${esc(plain(a.title))}">
          <span class="adv-frame ${a.frame}"></span>${advIc(a, 32)}</button>`).join("") + (hidden ? `<div class="adv-link"></div><div class="adv-more">+${hidden} скрыто</div>` : "")
      : `<div class="adv-empty">Тут пусто. Ачивки появляются, только когда получишь их.<br>Забери пулю или снайперку из верстака в «Крафте» либо сними кого-нибудь в тире со 100+ блоков.</div>`;
    const a = ADV.find((x) => x.key === advSel);
    if (!a) {
      $("#advDetail").innerHTML = `<div class="big"><span class="adv-frame task locked"></span><span class="q">?</span></div>
        <div class="txt"><div class="tt">???</div><div class="dd">Ни одной ачивки пока нет</div><div class="cc">В ветке ${ADV.length} ${ADV.length === 1 ? "ачивка, она скрыта" : "ачивок, все скрыты"}</div></div>`;
    } else {
      $("#advDetail").innerHTML = `
        <div class="big"><span class="adv-frame ${a.frame}"></span>${advIc(a, 38)}</div>
        <div class="txt"><div class="tt">${mc(a.title)}</div><div class="dd">${mc(a.description, "#aaa")}</div>
          <div class="cc">${esc(a.how)}${(() => { const i = ADV.indexOf(a); return i ? ` · после «${esc(plain(ADV[i - 1].title))}»` : " · первая в ветке"; })()}</div></div>
        <div class="meta"><span class="st ok">ПОЛУЧЕНА</span><span>Рамка: ${FRAME_RU[a.frame]}${a.frame === "challenge" ? " (фиолетовая)" : ""}</span><span><b>+${a.xp} XP</b></span></div>`;
    }
    $("#advList").innerHTML = open.map((a) => `<button type="button" class="adv-row has" data-k="${a.key}">
        <span class="fr"><span class="adv-frame ${a.frame}"></span>${advIc(a, 26)}</span>
        <span><span class="t">${mc(a.title)}</span><br><span class="d">${mc(a.description, "#999")}</span></span>
        <span class="x">✓ получена<br>+${a.xp} XP</span></button>`).join("")
      + (hidden ? `<div class="adv-row locked"><span class="fr"><span class="adv-frame task locked"></span><span class="q">?</span></span>
        <span><span class="t">??? × ${hidden}</span><br><span class="d">Скрыта, пока не получишь</span></span></div>` : "");
    $("#advBar").style.width = (open.length / ADV.length) * 100 + "%";
    $("#advTxt").textContent = `${open.length} / ${ADV.length} · ${open.reduce((s, x) => s + x.xp, 0)} / ${ADV.reduce((s, x) => s + x.xp, 0)} XP`;
  }
  const pickAdv = (e) => { const n = e.target.closest("[data-k]"); if (!n) return; advSel = n.dataset.k; renderTree(); };
  $("#advChain").addEventListener("click", pickAdv);
  $("#advList").addEventListener("click", (e) => { if (!e.target.closest("[data-k]")) return; pickAdv(e); $("#advBoard").scrollIntoView({ behavior: "smooth", block: "center" }); });
  $("#advReset").addEventListener("click", () => { got = []; ZM.store.set("p03.adv", got); advSel = null; renderTree(); });
  function renderRec() {
    $("#scopeRec").innerHTML = `<div class="sr-scope"><b>${fmt(rec.best, 0)} м</b></div>
      <div><h4>Журнал стрелка</h4><p>Твоя статистика в тире (хранится в браузере). Самый дальний килл в перекрестье слева.</p>
      <div class="rec-list"><span>Выстрелов: <b>${rec.shots}</b></span><span>Попаданий: <b>${rec.hits}</b></span><span>Точность: <b>${rec.shots ? Math.round(rec.hits / rec.shots * 100) : 0}%</b></span><span>Убийств: <b>${rec.kills}</b></span></div></div>`;
  }

  /* =====================================================================
     9. ХРОНОЛОГИЯ · 10. ФИНАЛ
     ===================================================================== */
  $("#timeline").innerHTML = `<i class="tl-trace" aria-hidden="true"></i>` + P.history.map((h, i) => `<div class="tl-i ${i ? "" : "first"} ${i === P.history.length - 1 ? "last" : ""}">
      <div class="tl-top"><span class="tl-ver ${/^v/.test(h.ver) ? "" : "pre"}">${esc(h.ver)}</span><time>${h.date}</time></div>
      <b class="tl-t">${esc(h.title)}</b><p>${esc(h.text)}</p></div>`).join("");
  $("#finScope").style.background = `url('${T("sniper_scope.png")}') center/cover no-repeat, radial-gradient(circle at 50% 50%, #123a22, #050b09 60%)`;
  const nav = ZM.pointNav(3);
  $("#finNav").innerHTML = (nav.prev ? `<a href="${U(nav.prev.href)}">← №${String(nav.prev.n).padStart(2, "0")} ${esc(nav.prev.title)}</a>` : "") +
    `<a href="${U("index.html")}">Все пункты</a>` + (nav.next ? `<a href="${U(nav.next.href)}">№${String(nav.next.n).padStart(2, "0")} ${esc(nav.next.title)} →</a>` : "");

  /* ---------------- старт ---------------- */
  buildModel(); buildBullet(); setTier(0); renderRangeSide(); renderCraft(); renderCost(); renderTree(); renderRec();
  ZM.reveal();
  setTimeout(() => { trRun = false; drawTraj(); }, 300);
  loadTex().then((t) => {
    tex = t;
    // hero
    heroRange = new ZMRange(heroCv, { tex, data: P, mode: "hero", state: { tier: 0, ench: {}, ammo: 0, cdUntil: 0 },
      heroYaw: (tt) => ({ yaw: Math.sin(tt * 0.05) * 0.18 + 0.05, pitch: 0.035 }),
      lens: () => {
        const r = hero.getBoundingClientRect();
        if (lens.auto) {
          const tt = performance.now() / 1000, narrow = r.width < 800;
          lens.tx = r.width * (narrow ? 0.5 + Math.sin(tt * 0.35) * 0.22 : 0.62 + Math.sin(tt * 0.35) * 0.16);
          lens.ty = r.height * (narrow ? 0.22 + Math.sin(tt * 0.53) * 0.04 : 0.5 + Math.sin(tt * 0.53) * 0.08);
        }
        lens.x += (lens.tx - lens.x) * 0.12; lens.y += (lens.ty - lens.y) * 0.12;
        lens.r = clamp(Math.min(r.width, r.height) * 0.2, 70, 190);
        return lens;
      } });
    heroRange.visible = true;
    // подпись цели под линзой
    setInterval(() => {
      const R = heroRange; if (!R || !R.W) return;
      const cam = R.cam(); const px = lens.x * R.dpr, py = lens.y * R.dpr;
      const d = R.dir(cam.yaw + Math.atan((px - R.W / 2) / cam.f), cam.pitch - Math.atan((py - R.H / 2) / cam.f));
      const eye = { x: 0, y: 1.62, z: 0 }, blk = R.raycastBlocks(eye, d, 400), mob = R.firstMobOnRay(eye, d, blk ? blk.t : 400, 0.3);
      $("#hhAim").textContent = mob ? `ЦЕЛЬ: ${mob.m.def.name.toUpperCase()} · ${Math.round(mob.t)} М` : blk ? `ПРЕГРАДА · ${Math.round(blk.t)} М` : "ЦЕЛЬ: —";
      $("#hhZoom").textContent = lens.auto && coarse ? "2.6" : "2.6";
    }, 150);
    new IntersectionObserver((es) => es.forEach((e) => (heroRange.visible = e.isIntersecting))).observe(hero);
    // тир
    range = new ZMRange($("#rangeCv"), { tex, data: P, mode: "game", state: S, on: rangeEvents });
    ZM.p03range = range;   // для отладки из консоли
    new IntersectionObserver((es) => es.forEach((e) => (range.visible = e.isIntersecting)), { threshold: 0.2 }).observe($("#rangeCv"));
    // стартовое окно перехватывает первый клик, чтобы не стрелять случайно при прокрутке
  });
})();
