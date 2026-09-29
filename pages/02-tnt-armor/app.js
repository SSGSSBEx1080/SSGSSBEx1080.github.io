/* =====================================================================
   №02 · ТНТ-броня — логика страницы
   1. общее: звук, угольки, фитиль        6. крафт и починка
   2. hero: разнесённый вид               7. ремкомплект
   3. комплект и сравнение                8. житель-подрывник (3D + торговля)
   4. детонация (полигон, world.js)       8b. ачивки «минное поле»
   5. взрыв (общий эффект), 5b. чары      9. хронология · 10. финал
   ===================================================================== */
(function () {
  "use strict";
  const { $, $$, esc } = ZM;
  const P = ZM.P02, R = ZM.P02R;
  const U = (p) => ZM.url(p);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  ZM.topbar({ crumb: "№02 · ТНТ-броня", ...ZM.pointNav(2) });

  /* ---------- иконки предметов ---------- */
  const ISO = new Set(["tnt", "sand", "redstone_block", "super_tnt"]);
  const BLOCK_TEX = new Set(["lever", "redstone_torch"]);
  const full = (id) => (id.includes(":") ? id.replace(/^zm:/, "zitraksmode:") : "minecraft:" + id);
  function src(id) {
    const [ns, n] = full(id).split(":");
    if (ISO.has(n)) return { src: U(`assets/textures/mc/p2/iso/${n}.png`), iso: true };
    if (ns === "zitraksmode") return { src: U(`assets/textures/item/${n}.png`) };
    if (BLOCK_TEX.has(n)) return { src: U(`assets/textures/mc/p2/block_${n}.png`) };
    return { src: U(`assets/textures/mc/p2/item_${n}.png`) };
  }
  const nameOf = (id) => P.names[full(id)] || id;
  const img = (id, cls = "") => { const s = src(id); return `<img class="${s.iso ? "iso" : ""} ${cls}" src="${s.src}" alt="" draggable="false">`; };

  // Особые «случайные» предметы сделок: список вариантов, которые крутятся по кругу
  const PIECES = P.pieces.map((p) => "zm:" + p.id);
  function variants(id) {
    if (id === "@button") return P.buttons.map((b) => ({ src: U(`assets/textures/mc/p2/iso/${b}_button.png`), iso: true }));
    if (id === "@plate") return P.plates.map((b) => ({ src: U(`assets/textures/mc/p2/iso/${b}_pressure_plate.png`), iso: true }));
    if (id === "@armor") return PIECES.map(src);
    return null;
  }
  const isBook = (id) => /^@book/.test(id);
  const glinty = (id) => isBook(id) || id === "@armor";
  const SPECIAL_NAME = { "@button": "Кнопка (случайная)", "@plate": "Нажимная плита (случайная)", "@armor": "ТНТ-броня (случайная часть)" };
  const tradeName = (id) => SPECIAL_NAME[id] || (isBook(id) ? "Зачарованная книга" : nameOf(id));

  /** Слот с предметом, как в инвентаре. id может быть "@button" и т.п. */
  function slot(id, count, extra = "") {
    if (!id) return `<span class="slot ${extra}"></span>`;
    const v = variants(id);
    const first = v ? v[0] : isBook(id) ? src("enchanted_book") : src(id);
    const g = glinty(id);
    const cyc = v ? ` data-cycle='${JSON.stringify(v.map((x) => x.src))}'` : "";
    const tip = `data-tip="${esc(tradeName(id))}"`;
    return `<span class="slot ${g ? "glint" : ""} ${extra}" ${tip} ${g ? `style="--m:url('${first.src}')"` : ""}>
      <img class="${first.iso ? "iso" : ""}" src="${first.src}" alt=""${cyc} draggable="false">${count && count !== 1 ? `<span class="cnt">${count}</span>` : ""}</span>`;
  }
  // перебор вариантов у случайных сделок
  let cycleI = 0;
  setInterval(() => {
    cycleI++;
    $$("img[data-cycle]").forEach((im) => {
      const l = JSON.parse(im.dataset.cycle);
      im.src = l[cycleI % l.length];
      const s = im.closest(".glint"); if (s) s.style.setProperty("--m", `url('${im.src}')`);
    });
  }, 900);

  // Зачарования (секция 02.3) управляют взрывом на полигоне (02.2)
  const ROM = ["", "I", "II", "III"];
  let E = Object.assign({ mode: "bomb", bomb: [0, 0, 0, 0], peace: 0 }, ZM.store.get("p02.ench2", {}));
  const saveE = () => ZM.store.set("p02.ench2", E);

  /* =====================================================================
     1. ОБЩЕЕ: звук, угольки, фитиль
     ===================================================================== */
  const SND_URL = [U("assets/sounds/crimson_moon.mp3"), U("assets/sounds/crimson_moon.ogg")];
  let soundOn = ZM.store.get("p02.sound", true);
  const sndBtn = $("#snd");
  const audio = new Audio();
  audio.preload = "auto";
  audio.src = audio.canPlayType("audio/mpeg") ? SND_URL[0] : SND_URL[1];
  function setSnd(v) { soundOn = v; ZM.store.set("p02.sound", v); sndBtn.setAttribute("aria-pressed", String(v)); sndBtn.querySelector(".snd-txt").textContent = v ? "звук" : "без звука"; }
  setSnd(soundOn);
  sndBtn.addEventListener("click", () => setSnd(!soundOn));
  ZM.sfx.bind(() => soundOn);   // общие звуки Minecraft (клики, тосты) слушаются кнопки звука страницы
  function playBoom(force) {
    if (!soundOn && !force) return;
    try { audio.pause(); audio.currentTime = 0; audio.volume = 0.85; audio.play().catch(() => {}); } catch (e) {}
  }
  // обычный ТНТ для финала: ванильное шипение фитиля (random/fuse) и один из 4 взрывов (random/explode1..4)
  const mkA = (n) => { const a = new Audio(); a.preload = "auto"; a.src = U(`assets/sounds/${n}.${audio.canPlayType("audio/mpeg") ? "mp3" : "ogg"}`); return a; };
  const sFuse = mkA("tnt_fuse"), sExplode = [1, 2, 3, 4].map((i) => mkA("tnt_explode" + i));
  function playVanilla(a, vol = 0.9) { if (!soundOn) return; try { a.pause(); a.currentTime = 0; a.volume = vol; a.play().catch(() => {}); } catch (e) {} }
  $("#sndTest").addEventListener("click", () => { if (!audio.paused) { audio.pause(); audio.currentTime = 0; return; } playBoom(true); });

  // угольки: тёплые искры, которые поднимаются снизу. При взрыве их становится больше
  const cv = $("#embers"), cx = cv.getContext("2d");
  let W = 0, H = 0, DPR = 1, embers = [], burst = 0;
  function resize() { DPR = Math.min(2, devicePixelRatio || 1); W = cv.width = innerWidth * DPR; H = cv.height = innerHeight * DPR; }
  resize(); addEventListener("resize", resize);
  const spawn = (y) => ({ x: Math.random() * W, y: y ?? H + 10, vx: (Math.random() - 0.5) * 0.3, vy: -(0.3 + Math.random() * 0.9), r: (0.6 + Math.random() * 1.8) * DPR, life: 0, max: 300 + Math.random() * 400, h: 18 + Math.random() * 25 });
  for (let i = 0; i < 70; i++) embers.push(spawn(Math.random() * H));
  let last = performance.now();
  function frame(t) {
    const dt = Math.min(50, t - last) / 16.7; last = t;
    cx.clearRect(0, 0, W, H);
    const target = (innerWidth < 700 ? 40 : 80) + burst;
    while (embers.length < target) embers.push(spawn());
    if (burst > 0) burst = Math.max(0, burst - 2 * dt);
    cx.globalCompositeOperation = "lighter";
    embers = embers.filter((e) => {
      e.life += dt; e.x += (e.vx + Math.sin((e.life + e.h * 10) / 40) * 0.25) * dt * DPR; e.y += e.vy * dt * DPR * (1 + burst / 150);
      const a = Math.max(0, 1 - e.life / e.max) * (0.55 + 0.45 * Math.sin(e.life / 6 + e.h));
      if (a <= 0 || e.y < -10) return embers.length > target ? false : Object.assign(e, spawn()) && true;
      cx.fillStyle = `hsla(${e.h},100%,${55 + a * 20}%,${a})`;
      cx.beginPath(); cx.arc(e.x, e.y, e.r, 0, 6.283); cx.fill();
      return true;
    });
    cx.globalCompositeOperation = "source-over";
    requestAnimationFrame(frame);
  }

  // фитиль: догорает по мере прокрутки, в самом низу взрывается финал
  const ash = $("#fuseAsh"), spark = $("#fuseSpark");
  let finaleArmed = true;
  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    ash.style.height = p * 100 + "%";
    spark.style.top = p * 100 + "%";
    spark.style.opacity = p > 0.995 ? 0 : 1;
    if (p > 0.995 && finaleArmed) { finaleArmed = false; finaleBoom(); }
    if (p < 0.9) finaleArmed = true;
    heroScroll();
  }
  addEventListener("scroll", onScroll, { passive: true });

  /* =====================================================================
     2. HERO: разнесённый вид, при прокрутке детали собираются
     ===================================================================== */
  const XV = [
    { p: P.pieces[0], top: 5, w: 24, side: "r" },
    { p: P.pieces[1], top: 25, w: 27, side: "l" },
    { p: P.pieces[2], top: 47, w: 25, side: "r" },
    { p: P.pieces[3], top: 66, w: 24, side: "l" },
  ];
  const ASSEMBLED = [22, 34, 49, 61]; // куда съезжаются детали (top в %), чтобы получилась фигура
  const totalDef = P.pieces.reduce((s, p) => s + p.defense, 0);
  const totalDur = P.pieces.reduce((s, p) => s + p.durability, 0);
  // Детали по центру, подписи в отдельных колонках по бокам (3%..33% и 67%..97%), к детали идёт пунктирная выноска.
  // Так текст никогда не залезает на картинку, а подписи одной стороны разнесены по высоте.
  const xv = $("#xview");
  xv.innerHTML = XV.map((x, i) => `
    <div class="xp-part" style="--w:${x.w}%;top:${x.top}%" data-i="${i}">
      <img src="${U(`assets/textures/item/${x.p.id}.png`)}" alt="${esc(x.p.name)}" draggable="false">
    </div>
    <div class="xp-call ${x.side}" data-i="${i}"><div><small>0${i + 1}</small><b>${esc(x.p.name)}</b>защита <em>${x.p.defense}</em> · прочность <em>${x.p.durability}</em></div><i class="ln"></i></div>`).join("") +
    `<div class="xp-total">ПОЛНЫЙ КОМПЛЕКТ<b>${totalDef} брони · ${totalDur} прочности</b></div>`;
  const xparts = $$(".xp-part", xv), xcalls = $$(".xp-call", xv);
  const hero = $("#hero");
  function placeCalls() {
    const W = xv.clientWidth;
    xcalls.forEach((c, i) => {
      const p = xparts[i], pw = p.offsetWidth;
      c.style.top = p.offsetTop + p.offsetHeight / 2 + "px";
      // длина выноски: от края колонки подписи до края детали (с заходом на 8% ширины детали, у PNG прозрачные поля)
      const edge = XV[i].side === "l" ? W / 2 - pw / 2 + pw * 0.1 - (c.offsetLeft + c.offsetWidth) : c.offsetLeft - (W / 2 + pw / 2 - pw * 0.1);
      c.style.setProperty("--ln", Math.max(8, edge) + "px");
    });
  }
  function heroScroll() {
    const k = Math.min(1, Math.max(0, scrollY / (hero.offsetHeight * 0.55)));
    const e = 1 - Math.pow(1 - k, 3);
    xparts.forEach((el, i) => { el.style.top = XV[i].top + (ASSEMBLED[i] - XV[i].top) * e + "%"; });
    xcalls.forEach((c) => c.style.setProperty("--co", String(Math.max(0, 1 - e * 1.6))));
    placeCalls();
  }
  new ResizeObserver(placeCalls).observe(xv);
  $$("img", xv).forEach((im) => im.addEventListener("load", placeCalls));

  $("#heroStats").innerHTML = [
    ["#set", P.pieces.length, "части"], ["#set", totalDef, "брони"], ["#set", totalDur, "прочность"], ["#villager", P.trades.length, "сделок"],
  ].map(([h, v, l]) => `<a href="${h}"><b>${v}</b><span>${l}</span></a>`).join("");

  /* =====================================================================
     3. КОМПЛЕКТ
     ===================================================================== */
  const ui = (n) => U(`assets/textures/mc/ui/${n}.png`);
  let worn = ZM.store.get("p02.worn", [true, true, true, true]);
  function armorBar(points) {
    let h = "";
    for (let i = 0; i < 10; i++) h += `<img src="${ui(points >= 2 * i + 2 ? "armor_full" : points === 2 * i + 1 ? "armor_half" : "armor_empty")}" alt="">`;
    return h;
  }
  function renderSet() {
    $("#setSlots").innerHTML = P.pieces.map((p, i) => `
      <button type="button" class="slot ${worn[i] ? "" : "off"}" data-i="${i}" style="--ghost:url('${U(`assets/textures/mc/p2/item_${p.iron.split(":")[1]}.png`)}')"
        data-tip="${esc(p.name)}" data-tip-info="${worn[i] ? "нажми, чтобы снять" : "нажми, чтобы надеть"}" aria-pressed="${worn[i]}" aria-label="${esc(p.name)}">
        <img src="${U(`assets/textures/item/${p.id}.png`)}" alt=""></button>`).join("");
    // фигура в броне: Стив + слои tnt_layer_1/2.png (как модель брони в игре, вид спереди)
    const L = ["head", "chest", "legs", "feet"], TT = (n) => U(`assets/textures/mc/p2/terrain/${n}.png`);
    $("#setDoll").innerHTML = `<div class="doll-fig"><img src="${TT("wearer_base")}" alt="">${[2, 3, 1, 0].map((i) => `<img class="dl ${worn[i] ? "" : "off"}" src="${TT("wearer_" + L[i])}" alt="">`).join("")}</div>`;
    const pts = P.pieces.reduce((s, p, i) => s + (worn[i] ? p.defense : 0), 0);
    const n = worn.filter(Boolean).length;
    $("#setArmorBar").innerHTML = armorBar(pts);
    $("#setSum").innerHTML = `Броня <b>${pts}</b> · Твёрдость <b>${(n * P.material.toughness).toFixed(1)}</b>`;
    $("#setPieces").innerHTML = P.pieces.map((p, i) => `
      <div class="pc ${worn[i] ? "" : "off"}"><img src="${U(`assets/textures/item/${p.id}.png`)}" alt="">
        <div><h4>${esc(p.name)}</h4><small>zitraksmode:${p.id}</small>
        <div class="nums"><span><img class="pixel" src="${ui("armor_full")}" alt="">${p.defense}</span><span>⛨ ${p.durability}</span></div></div></div>`).join("");
  }
  $("#setSlots").addEventListener("click", (e) => {
    const b = e.target.closest("[data-i]"); if (!b) return;
    const i = +b.dataset.i; if (!worn[i] && aDur[i] === 0) { aDur[i] = P.pieces[i].durability; ZM.store.set("p02.dura", aDur); }
    worn[i] = !worn[i]; ZM.store.set("p02.worn", worn); if (worn[i]) gainItem("zm:" + P.pieces[i].id); syncArmor();
    ZM.sfx(worn[i] ? "equip" : "cloth", 0.7);   // надел / снял
  });
  const M = P.material;
  $("#setProps").innerHTML = [
    ["Твёрдость", `${M.toughness} <small style="font-size:12px;opacity:.6">за часть</small>`],
    ["Откидывание", "0"],
    ["Зачаровываемость", M.enchantability],
    ["Ремонт", `${img("tnt")} ТНТ`],
    ["Звук надевания", "железо"],
    ["Множитель", `×${M.durabilityMultiplier}`],
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");

  // сравнение с ванилью
  const CMP = [
    { k: "def", l: "Защита", f: (m) => m.defense.reduce((a, b) => a + b, 0) },
    { k: "dur", l: "Прочность", f: (m) => 55 * m.mult },
    { k: "tough", l: "Твёрдость", f: (m) => m.toughness * 4 },
    { k: "ench", l: "Зачаровываемость", f: (m) => m.enchantability },
  ];
  let cmpSel = 0;
  function renderCmp() {
    $("#cmpTabs").innerHTML = CMP.map((c, i) => `<button type="button" role="tab" aria-selected="${i === cmpSel}" data-i="${i}">${c.l}</button>`).join("");
    const vals = P.compare.map((m) => CMP[cmpSel].f(m));
    const max = Math.max(...vals) || 1;
    $("#cmpBars").innerHTML = P.compare.map((m, i) => `<div class="cb ${m.ours ? "ours" : ""}"><span>${m.name}</span><div class="bar"><i data-w="${(vals[i] / max) * 100}"></i></div><span class="v">${+vals[i].toFixed(1)}</span></div>`).join("");
    requestAnimationFrame(() => requestAnimationFrame(() => $$("#cmpBars i").forEach((i) => (i.style.width = i.dataset.w + "%"))));
  }
  $("#cmpTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) { cmpSel = +b.dataset.i; renderCmp(); } });

  /* =====================================================================
     4. ДЕТОНАЦИЯ: полигон (world.js). Формулы из AbilitySystem.java (data → ability)
     Энергия копится от ПОЛУЧЕННОГО урона: прирост = clamp(урон × 2.5, 2, 35), максимум 100
     ===================================================================== */
  const A = P.ability;
  const scene = $("#scene"), btn = $("#detBtn"), prompt = $("#prompt");
  const chargeEl = $("#charge"), chargeFill = $("#chargeFill"), pctEl = $("#detPct"), topEl = $("#detTop");
  $("#hudHearts").innerHTML = Array.from({ length: 10 }, () => `<img src="${ui("heart_full")}" alt="">`).join("");
  function renderHudArmor() {
    const pts = P.pieces.reduce((s, p, i) => s + (worn[i] ? p.defense : 0), 0);
    $("#hudArmor").innerHTML = armorBar(pts);
  }
  $("#hotbar").innerHTML = ["iron_sword", "zm:tnt_repair_kit", "tnt", "flint_and_steel", "gunpowder", "emerald", "redstone", "", ""].map((id, i) => `<span class="${i === 0 ? "sel" : ""}">${id ? img(id) : ""}</span>`).join("");

  let energy = 0, busy = false, autoAtk = true;
  const fullSet = () => worn.every(Boolean);
  const TER = (n) => U(`assets/textures/mc/p2/terrain/${n}.png`);
  const world = new ZM.TntWorld($("#world"), {
    url: TER,
    wearer: (k) => TER(k === "full" ? "wearer" : "wearer_" + k),
    smoke: U("assets/textures/mc/p2/particle_big_smoke_0.png"),
    worn: () => worn,
    charge: () => energy / A.maxEnergy,
    autoAttack: () => autoAtk,
    onZombieHit: () => takeDamage(A.sources[0].dmg),
    onKill: (byBlast) => { if (byBlast) grant("explosion_kill"); },
    maxResistance: A.maxResistance, damageRadiusMul: A.damageRadiusMul, baseDamage: A.baseDamage,
    radiusDamageMul: A.radiusDamageMul, overkillDamage: A.overkillDamage, knockbackMul: A.knockbackMul,
  });
  new IntersectionObserver((es) => es.forEach((e) => (world.visible = e.isIntersecting)), { threshold: 0.1 }).observe(scene);

  /** Параметры взрыва с учётом зачарований (секция 02.3), как getExplosionRadius() и getPeacemakerLevel() */
  const bombSum = () => E.bomb.reduce((s, l, i) => s + (worn[i] ? l : 0), 0);
  function blastParams() {
    const sum = bombSum(), radius = A.baseRadius + A.bombardierPerLevel * sum, pk = E.peace;
    return { radius, sum, peace: pk, breaks: pk === 0 ? "all" : pk === 1 ? "soft" : "none", hostileOnly: pk >= 3, overkill: sum >= A.overkillLevels };
  }
  function renderInfo(extra = "") {
    const b = blastParams();
    const tags = [];
    if (b.sum) tags.push(`<span class="bomb">Бомбардир ${b.sum}/12</span>`);
    if (b.peace) tags.push(`<span class="peace">Миротворец ${ROM[b.peace]}</span>`);
    if (!tags.length) tags.push("<span>без чар</span>");
    $("#scInfo").innerHTML = tags.join("") + `<span>радиус <b>${b.radius}</b></span><span>урон до <b>${Math.round(b.overkill ? A.overkillDamage : A.baseDamage + b.radius * A.radiusDamageMul)}</b></span>` +
      (b.breaks === "soft" ? "<span class='safe'>только мягкие блоки</span>" : b.breaks === "none" ? "<span class='safe'>блоки целы</span>" : "") + extra;
  }
  function drawCharge() {
    // заполняется плавно: 100 невидимых частей, деления только для глаза
    const k = energy / A.maxEnergy;
    chargeFill.style.setProperty("--p", k * 100 + "%");
    chargeEl.setAttribute("aria-valuenow", Math.round(energy));
    pctEl.textContent = Math.round(energy) + "/" + A.maxEnergy;
    const ready = energy >= A.maxEnergy && !busy && fullSet();
    chargeEl.classList.toggle("full", energy >= A.maxEnergy); prompt.classList.toggle("on", ready);
    btn.disabled = !ready; btn.classList.toggle("ready", ready);
    topEl.textContent = busy ? "БАБАХ…" : !fullSet() ? "НУЖЕН ПОЛНЫЙ КОМПЛЕКТ" : ready ? "ВЗОРВАТЬСЯ" : "КОПИ ЗАРЯД";
    $("#scHint").classList.toggle("off", energy >= A.maxEnergy || busy);
  }
  let warnedSet = false;
  /** По носителю прилетел урон. Прирост энергии как в onLivingHurt() */
  function takeDamage(dmg) {
    if (busy) return;
    if (!fullSet()) {
      world.hurtPlayer(dmg, 0);
      if (!warnedSet) { warnedSet = true; ZM.toast({ iconHtml: img("zm:tnt_chestplate"), title: "Надень все 4 части", head: "Без полного комплекта заряд не копится" }); }
      return;
    }
    if (energy >= A.maxEnergy) { world.hurtPlayer(dmg, 0); return; }
    const gain = Math.max(A.minGain, Math.min(A.maxGain, dmg * A.energyMultiplier));
    energy = Math.min(A.maxEnergy, energy + gain);
    world.hurtPlayer(dmg, gain);
    if (energy >= A.maxEnergy) ding();
    drawCharge();
  }
  // звук «полной полоски»: в моде EXPERIENCE_ORB_PICKUP с pitch 0.5. Здесь короткий синтезированный «динь»
  function ding() {
    if (!soundOn) return;
    try {
      const ac = ding.ac || (ding.ac = new (window.AudioContext || window.webkitAudioContext)());
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(880, ac.currentTime); o.frequency.exponentialRampToValueAtTime(1320, ac.currentTime + 0.08);
      g.gain.setValueAtTime(0.18, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35);
      o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.4);
    } catch (e) {}
  }
  function detonate() {
    if (busy || energy < A.maxEnergy || !fullSet()) return;
    const b = blastParams();
    if (!world.detonate(b, reduce ? 0.4 : A.delayTicks / 20, onBoom)) return;
    busy = true; energy = 0; drawCharge();
    if (!sceneOnScreen) scene.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); // на телефоне кнопка ниже сцены
    playBoom();                       // triggerExplosion(): звук сразу, взрыв через 40 тиков
    grant("ultimate_use");
    scene.classList.add("winding");
  }
  function onBoom(res) {
    busy = false;
    scene.classList.remove("winding");
    burst = 120;
    const fl = $("#flash"); fl.classList.remove("on"); void fl.offsetWidth; fl.classList.add("on");
    if (!reduce) { scene.classList.remove("shake"); void scene.offsetWidth; scene.classList.add("shake"); }
    // каждая часть теряет 10% максимальной прочности
    const broke = [];
    P.pieces.forEach((p, i) => {
      if (!worn[i]) return;
      aDur[i] = Math.max(0, aDur[i] - Math.max(1, Math.floor(p.durability * A.armorWear)));
      if (aDur[i] === 0) { worn[i] = false; broke.push(p.name); }
    });
    ZM.store.set("p02.dura", aDur); ZM.store.set("p02.worn", worn);
    if (broke.length) { renderSet(); renderHudArmor(); ZM.toast({ iconHtml: img("zm:tnt_repair_kit"), title: broke.join(", ") + " сломались", head: "Сломанная часть пропадает" }); }
    renderDura(); renderKit();
    drawCharge();
    const h = res.hit;
    const mob = (name, r) => !r ? "" : r.out ? `<span>${name}: вне радиуса</span>` : r.spared ? `<span class="safe">${name}: цела (Миротворец III)</span>` : `<span class="res">${name} −${Math.round(r.dmg)}${r.killed ? " ☠" : ""}</span>`;
    renderInfo(`<span class="res">сломано <b>${res.broken}</b></span>` + mob("зомби", h) + mob("свинья", res.pig));
  }

  // источники урона: зомби бьёт сам, остальное по кнопкам
  $("#detSrc").innerHTML = `<div class="ds-h">Получить урон <small>урон → энергия</small></div>` + A.sources.map((s, i) => {
    const gain = Math.max(A.minGain, Math.min(A.maxGain, s.dmg * A.energyMultiplier));
    return `<button type="button" class="src" data-i="${i}">${img(s.icon)}<span>${esc(s.name)}</span><em>${s.dmg}♥ → +${+gain.toFixed(1)}</em></button>`;
  }).join("") + `<label class="src-auto"><input type="checkbox" id="autoAtk" checked> зомби атакует сам</label>`;
  $("#detSrc").addEventListener("click", (e) => { const b = e.target.closest(".src"); if (b) takeDamage(A.sources[+b.dataset.i].dmg); });
  $("#autoAtk").addEventListener("change", (e) => (autoAtk = e.target.checked));

  // прочность брони: взрыв отнимает 10%, ремкомплект чинит
  let aDur = ZM.store.get("p02.dura", P.pieces.map((p) => p.durability));
  function renderDura() {
    $("#detDura").innerHTML = `<div class="ds-h">Прочность <button type="button" class="chip fix" id="duraFix">${img("zm:tnt_repair_kit")} починить</button></div>` +
      P.pieces.map((p, i) => { const f = aDur[i] / p.durability; return `<div class="dd ${worn[i] ? "" : "off"}"><img src="${U(`assets/textures/item/${p.id}.png`)}" alt=""><span class="bar"><i style="width:${f * 100}%;background:hsl(${f * 120},90%,45%)"></i></span><b>${aDur[i]}</b></div>`; }).join("");
  }
  $("#detDura").addEventListener("click", (e) => {
    if (!e.target.closest("#duraFix")) return;
    aDur = P.pieces.map((p) => p.durability); ZM.store.set("p02.dura", aDur);
    worn = [true, true, true, true]; ZM.store.set("p02.worn", worn);
    syncArmor();
  });
  // всё, что зависит от надетой брони и её прочности (комплект, полигон, ремкомплект, ачивки)
  function syncArmor() { renderSet(); renderHudArmor(); renderDura(); drawCharge(); renderInfo(); renderKit(); checkSetAdv(); }

  scene.addEventListener("pointerdown", (e) => { if (world.zombieAt(e.clientX, e.clientY)) { e.preventDefault(); world.hit(); } });
  $("#hitBtn").addEventListener("click", () => world.hit());
  $("#worldBtn").addEventListener("click", () => { if (!busy) { world.regen(); renderInfo(); } });
  btn.addEventListener("click", detonate);
  let sceneOnScreen = false;
  let boomOnScreen = false;
  new IntersectionObserver((es) => es.forEach((e) => (sceneOnScreen = e.isIntersecting)), { threshold: 0.3 }).observe(scene);
  new IntersectionObserver((es) => es.forEach((e) => (boomOnScreen = e.isIntersecting)), { threshold: 0.05 }).observe($("#boom"));
  addEventListener("keydown", (e) => {
    if (!boomOnScreen || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.code === "KeyR" || /^[rRкК]$/.test(e.key)) { e.preventDefault(); detonate(); }
    else if (e.code === "KeyF") { e.preventDefault(); world.hit(); }
  });

  /* =====================================================================
     5. ВЗРЫВ: вспышка, тряска, кольцо, ванильные частицы explosion_0..15, обломки
     ===================================================================== */
  const DEBRIS = [src("tnt").src, src("sand").src, U("assets/textures/mc/p2/block_cobblestone.png"), U("assets/textures/mc/p2/block_stone.png"), src("redstone_block").src];
  function explosion(layer, shaker, { x = 50, y = 50, power = 1, sound = "armor" } = {}) {
    if (sound === "armor") playBoom();
    else if (sound === "tnt") { sFuse.pause(); playVanilla(sExplode[Math.floor(Math.random() * 4)], 1); }
    burst = 160 * power;
    const flash = layer.parentElement.querySelector(".sc-flash");
    if (flash) { flash.classList.remove("on"); void flash.offsetWidth; flash.classList.add("on"); }
    if (shaker && !reduce) { shaker.classList.remove("shake"); void shaker.offsetWidth; shaker.classList.add("shake"); }
    const add = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); const el = t.content.firstChild; layer.appendChild(el); return el; };
    const rect = layer.getBoundingClientRect();
    const base = Math.min(rect.width, rect.height);
    add(`<div class="ring" style="left:${x}%;top:${y}%"></div>`);
    const n = reduce ? 5 : Math.round(16 * power);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, d = Math.random() * base * 0.22 * power;
      const s = base * (0.12 + Math.random() * 0.22) * power;
      const el = add(`<div class="boom-p" style="left:calc(${x}% + ${Math.cos(a) * d}px);top:calc(${y}% + ${Math.sin(a) * d * 0.7}px);--s:${s}px;--d:${0.45 + Math.random() * 0.4}s;--b:${0.6 + Math.random() * 0.5};animation-delay:${Math.random() * 0.25}s"></div>`);
      setTimeout(() => el.remove(), 1400);
    }
    const m = reduce ? 0 : Math.round(12 * power);
    for (let i = 0; i < m; i++) {
      const a = -Math.PI * (0.1 + Math.random() * 0.8), sp = base * (0.35 + Math.random() * 0.45) * power;
      const el = add(`<div class="debris" style="left:${x}%;top:${y}%;--s:${base * (0.04 + Math.random() * 0.04)}px;background-image:url('${DEBRIS[i % DEBRIS.length]}');--dx:${Math.cos(a) * sp}px;--dy:${Math.sin(a) * sp + base * 0.3}px;--r:${(Math.random() - 0.5) * 900}deg;--d:${0.9 + Math.random() * 0.5}s"></div>`);
      setTimeout(() => el.remove(), 1600);
    }
    setTimeout(() => layer.querySelectorAll(".ring").forEach((r) => r.remove()), 800);
  }

  /* =====================================================================
     5b. ЗАЧАРОВАНИЯ: Бомбардир (ползунок на каждую часть) и Миротворец (лучший уровень)
     Оба действуют одновременно, вкладки только переключают вид
     ===================================================================== */
  function renderEnch() {
    $$("#enchTabs [data-m]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.m === E.mode)));
    const en = P.enchantments, body = $("#enchBody"), bp = blastParams();
    const status = `<div class="en-status"><span class="${E.bomb.some(Boolean) ? "on bomb" : ""}">Бомбардир: ${E.bomb.reduce((a, b) => a + b, 0)}/12</span><span class="${E.peace ? "on peace" : ""}">Миротворец: ${E.peace ? ROM[E.peace] : "нет"}</span><span>итог: радиус ${bp.radius}, ${bp.breaks === "all" ? "ломает всё" : bp.breaks === "soft" ? "только мягкие" : "блоки целы"}</span></div>`;
    if (E.mode === "bomb") {
      const B = en.bombardier, sum = E.bomb.reduce((a, b) => a + b, 0), R = A.baseRadius + A.bombardierPerLevel * sum;
      const maxR = A.baseRadius + A.bombardierPerLevel * 12;
      const dmg = sum >= A.overkillLevels ? A.overkillDamage : A.baseDamage + R * A.radiusDamageMul;
      body.innerHTML = `
        <div class="eb-pieces">${P.pieces.map((p, i) => `
          <div class="eb-p ${E.bomb[i] ? "on" : ""}">
            <span class="slot ${E.bomb[i] ? "glint" : ""}" style="--m:url('${U(`assets/textures/item/${p.id}.png`)}')"><img src="${U(`assets/textures/item/${p.id}.png`)}" alt=""></span>
            <span class="eb-n"><b>${esc(p.name)}</b><em>${E.bomb[i] ? `${B.name} ${ROM[E.bomb[i]]} · +${E.bomb[i] * A.bombardierPerLevel}` : "без чар"}</em></span>
            <span class="lv-track" role="radiogroup" aria-label="${esc(p.name)}: уровень Бомбардира" style="--v:${E.bomb[i]}">
              <span class="lv-fill"></span>
              ${[0, 1, 2, 3].map((v) => `<button type="button" role="radio" aria-checked="${E.bomb[i] === v}" data-i="${i}" data-v="${v}" class="${E.bomb[i] >= v ? "on" : ""}"><i></i><span>${v ? ROM[v] : "0"}</span></button>`).join("")}
            </span>
          </div>`).join("")}
        </div>
        <div class="eb-out">
          <div class="eb-h"><h3>${B.name}</h3></div>
          <p>${esc(B.short)}</p>
          <div class="eb-gauge"><i style="width:${(sum / 12) * 100}%"></i><span>${Array.from({ length: 12 }, (_, k) => `<b class="${k === A.overkillLevels - 1 ? "mark" : ""}"></b>`).join("")}</span></div>
          <div class="eb-nums">
            <div><small>радиус взрыва</small><b>${R}</b></div>
            <div><small>радиус урона</small><b>${+(R * A.damageRadiusMul).toFixed(2)}</b></div>
            <div class="${sum >= A.overkillLevels ? "ok" : ""}"><small>урон в центре</small><b>${+dmg.toFixed(1)}</b></div>
          </div>
          <code class="eb-f">радиус = ${A.baseRadius} + ${A.bombardierPerLevel} × (${E.bomb.join(" + ")}) = ${R}<br>урон = ${sum >= A.overkillLevels ? `${A.overkillDamage} × (1 − d / ${+(R * A.damageRadiusMul).toFixed(2)})` : `(${A.baseDamage} + ${R} × ${A.radiusDamageMul}) × (1 − d / ${+(R * A.damageRadiusMul).toFixed(2)})`}</code>
          <div class="eb-over ${sum >= A.overkillLevels ? "on" : ""}">☠ <b>${A.overkillLevels}+ уровней суммарно:</b> урон в центре сразу <b>${A.overkillDamage}</b>. ${sum >= A.overkillLevels ? "Включено!" : `Ещё ${A.overkillLevels - sum}.`}</div>
          <div class="eb-btns"><button type="button" class="chip" data-a="max">Всё на III</button><button type="button" class="chip" data-a="zero">Сброс</button><a class="chip hot" href="#boom">Испытать ↑</a></div>
        </div>${status}`;
    } else {
      const M = en.peacemaker;
      body.innerHTML = `
        <div class="ep-h"><h3>${M.name}</h3><p>${esc(M.short)} Радиус не меняется. Нажми на уровень ещё раз, чтобы снять.</p></div>
        <div class="ep-cards">${M.levels.map((l, i) => `
          <button type="button" class="ep-c ${E.peace === i + 1 ? "sel" : ""}" data-l="${i + 1}">
            <span class="ep-rom">${ROM[i + 1]}</span>
            <span class="ep-viz lv${i + 1}">${epViz(i + 1)}</span>
            <span class="ep-t">${esc(l.text)}</span>
            <span class="ep-tags"><span class="ep-tag ${l.breaks === "none" ? "safe" : l.breaks === "soft" ? "mid" : ""}">${l.breaks === "soft" ? "мягкие блоки" : "блоки целы"}</span><span class="ep-tag ${l.hostileOnly ? "safe" : ""}">${l.hostileOnly ? "бьёт только врагов" : "бьёт всех рядом"}</span></span>
          </button>`).join("")}
        </div>
        <div class="eb-btns"><a class="chip hot" href="#boom">Испытать ↑</a></div>${status}`;
    }
    renderInfo();
    checkSetAdv();
  }
  // мини-схема уровня Миротворца: 3x3 блоков (трава/камень/доски) + моб
  function epViz(l) {
    const t = (n) => U(`assets/textures/mc/p2/terrain/${n}.png`);
    const cells = ["grass_block_side", "oak_planks", "grass_block_side", "dirt", "stone", "dirt", "stone", "stone", "stone"];
    return `<span class="ev-grid">${cells.map((c) => { const gone = l === 1 && (c === "grass_block_side" || c === "dirt"); return `<i class="${gone ? "gone" : ""}" style="background-image:url('${t(c)}')"></i>`; }).join("")}</span>
      <span class="ev-mobs"><img src="${t("zombie")}" alt="" class="${"hurt"}"><img src="${U("assets/textures/mc/ui/steve_face.png")}" alt="" class="${l >= 3 ? "safe" : "hurt"}" title="игрок"></span>`;
  }
  $("#enchTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-m]"); if (!b) return; E.mode = b.dataset.m; saveE(); renderEnch(); });
  // уровень Бомбардира: клик по делению или стрелки на клавиатуре
  $("#enchBody").addEventListener("keydown", (e) => {
    const t = e.target.closest(".lv-track button"); if (!t || !/Arrow(Left|Right)/.test(e.key)) return;
    e.preventDefault(); const i = +t.dataset.i;
    E.bomb[i] = Math.max(0, Math.min(3, E.bomb[i] + (e.key === "ArrowRight" ? 1 : -1))); saveE(); renderEnch();
    $(`#enchBody .lv-track button[data-i="${i}"][data-v="${E.bomb[i]}"]`).focus();
  });
  $("#enchBody").addEventListener("click", (e) => {
    const lv = e.target.closest(".lv-track button");
    if (lv) { const i = +lv.dataset.i; E.bomb[i] = +lv.dataset.v; saveE(); renderEnch(); $(`#enchBody .lv-track button[data-i="${i}"][data-v="${E.bomb[i]}"]`).focus({ preventScroll: true }); return; }
    const a = e.target.closest("[data-a]"), l = e.target.closest("[data-l]");
    if (a) { E.bomb = E.bomb.map(() => (a.dataset.a === "max" ? 3 : 0)); saveE(); renderEnch(); }
    if (l) { E.peace = E.peace === +l.dataset.l ? 0 : +l.dataset.l; saveE(); renderEnch(); }
  });
  // ачивка BOMBARDIER_SET: полный комплект, и на каждой части есть Бомбардир (условие уточнить по коду триггера)
  // full_set: inventory_changed с 4 частями в слотах брони; bombardier_full: сет целиком на Бомбардире III (проверка раз в 20 тиков в моде)
  let advLive = false;   // до первого действия пользователя ачивки не выдаём (броня надета по умолчанию)
  function checkSetAdv() { if (!advLive || !fullSet()) return; PIECES.forEach(gainItem); grant("full_set"); if (E.bomb.every((l) => l >= 3)) grant("bombardier_full"); }

  /* =====================================================================
     6. КРАФТ И ПОЧИНКА
     ===================================================================== */
  const CR = [
    { k: "tnt_helmet", r: R.tnt_helmet }, { k: "tnt_chestplate", r: R.tnt_chestplate },
    { k: "tnt_leggings", r: R.tnt_leggings }, { k: "tnt_boots", r: R.tnt_boots }, { k: "tnt_repair_kit", r: R.tnt_repair_kit },
  ];
  let crSel = 1;
  // верстак 176x80: сетка 3x3 от (30,17) с шагом 18, предмет 16px; результат (124,35)
  const pc = (x, y, w, h) => `left:${(x / 176) * 100}%;top:${(y / 80) * 100}%;width:${(w / 176) * 100}%;height:${(h / 80) * 100}%`;
  function renderCraft() {
    $("#craftTabs").innerHTML = CR.map((c, i) => `<button type="button" role="tab" aria-selected="${i === crSel}" data-i="${i}">${img("zm:" + c.k)}${esc(nameOf("zm:" + c.k))}</button>`).join("");
    const c = CR[crSel], r = c.r;
    $("#craftGui").innerHTML = `<span class="title">Верстак</span>` + r.grid.map((id, i) => id ? `<span class="s in" style="${pc(30 + (i % 3) * 18, 17 + Math.floor(i / 3) * 18, 16, 16)};animation-delay:${i * 40}ms" data-tip="${esc(nameOf(id))}" data-tip-sub="${id}">${img(id)}</span>` : "").join("") +
      `<button type="button" class="s in res" id="craftTake" style="${pc(124, 35, 16, 16)};animation-delay:420ms" data-tip="${esc(nameOf(r.result))}" data-tip-sub="Нажми, чтобы забрать" aria-label="Забрать: ${esc(nameOf(r.result))}">${img(r.result)}${r.count > 1 ? `<span class="cnt">${r.count}</span>` : ""}</button>`;
    const cnt = {};
    r.grid.forEach((id) => id && (cnt[id] = (cnt[id] || 0) + 1));
    $("#craftCost").innerHTML = `<h4>${esc(nameOf(r.result))}</h4>` + Object.entries(cnt).map(([id, n]) => `<div class="row">${img(id)} ${n} × ${esc(nameOf(id))}</div>`).join("") +
      (c.k === "tnt_repair_kit" ? `<p>Подмастерье-подрывник продаёт его за 12 изумрудов.</p>` : `<p>Защита <b>${P.pieces[crSel].defense}</b>, прочность <b>${P.pieces[crSel].durability}</b>.</p>`);
  }
  // забрать результат = предмет попал в инвентарь (inventory_changed → ачивка)
  $("#craftGui").addEventListener("click", (e) => {
    const t = e.target.closest("#craftTake"); if (!t) return;
    const r = CR[crSel].r;
    t.classList.remove("took"); void t.offsetWidth; t.classList.add("took");
    gainItem(r.result.replace("zitraksmode:", "zm:"));
    ZM.sfx("pop", 0.5, 1.4 + Math.random() * 0.8);
  });
  $("#craftTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) { crSel = +b.dataset.i; renderCraft(); } });
  const dura = (f) => `<span class="dura"><i style="width:${f * 100}%;--dc:hsl(${f * 120},100%,50%)"></i></span>`;
  const slotD = (id, f) => `<span class="slot" data-tip="${esc(nameOf(id))}">${img(id)}${f < 1 ? dura(f) : ""}</span>`;
  $("#rpAnvil").innerHTML = `${slotD("zm:tnt_chestplate", 0.3)}<span class="op">+</span>${slot("tnt", 1)}<span class="arr"></span>${slotD("zm:tnt_chestplate", 0.55)}`;
  $("#rpSmith").innerHTML = `${slotD("zm:tnt_helmet", 0.35)}<span class="op">+</span>${slotD("zm:tnt_helmet", 0.4)}<span class="arr"></span>${slotD("zm:tnt_helmet", 0.8)}`;

  /* =====================================================================
     7. РЕМКОМПЛЕКТ: износ и мгновенная починка
     ===================================================================== */
  // Логика 1:1 из TntRepairKitItem.use(): нужен ПОЛНЫЙ комплект ТНТ-брони в слотах,
  // все повреждённые части чинятся до нуля урона, набор тратится (-1) только если что-то починилось.
  // Износ общий с полигоном: взорвался там — чинишь здесь.
  let kits = ZM.store.get("p02.kits", 4);
  function renderKit(anim) {
    $("#ksItems").innerHTML = P.pieces.map((p, i) => {
      const f = aDur[i] / p.durability;
      return `<button type="button" class="ks-it ${worn[i] ? "" : "off"}" data-i="${i}" aria-pressed="${worn[i]}"><span class="slot ${anim && anim[i] ? anim[i] : ""}" data-tip="${esc(p.name)}" data-tip-info="${worn[i] ? `Прочность: ${aDur[i]} / ${p.durability}` : "Не надето: нажми, чтобы надеть"}">${img("zm:" + p.id)}${worn[i] && f < 1 ? dura(f) : ""}</span><span class="n">${worn[i] ? `${aDur[i]}/${p.durability}` : "снято"}</span></button>`;
    }).join("");
    const t = aDur.reduce((a, b, i) => a + (worn[i] ? b : 0), 0);
    $("#ksTotal").textContent = `${t}/${totalDur}`;
    $("#ksKits").innerHTML = `${img("zm:tnt_repair_kit")}<b>${kits}</b>`;
    $("#ksFix").disabled = kits <= 0;
  }
  // сообщение над хотбаром (displayClientMessage(..., true))
  let barT;
  function actionBar(html) {
    const el = $("#ksBar"); el.innerHTML = html; el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
    clearTimeout(barT); barT = setTimeout(() => el.classList.remove("show"), 2600);
  }
  $("#ksItems").addEventListener("click", (e) => {
    const b = e.target.closest(".ks-it"); if (!b) return;
    const i = +b.dataset.i; if (!worn[i] && aDur[i] === 0) { aDur[i] = P.pieces[i].durability; ZM.store.set("p02.dura", aDur); }
    worn[i] = !worn[i]; ZM.store.set("p02.worn", worn); if (worn[i]) gainItem("zm:" + P.pieces[i].id); syncArmor();
    ZM.sfx(worn[i] ? "equip" : "cloth", 0.7);
  });
  $("#ksHit").addEventListener("click", () => {
    const anim = [];
    aDur = aDur.map((d, i) => { if (worn[i] && Math.random() < 0.8) { anim[i] = "hit"; return Math.max(1, d - Math.round(P.pieces[i].durability * (0.15 + Math.random() * 0.35))); } return d; });
    ZM.store.set("p02.dura", aDur); renderDura(); renderKit(anim);
    ZM.sfx("hit", 0.8, 0.8);
  });
  $("#ksMore").addEventListener("click", () => { ZM.sfx("pop", 0.5, 1.6); kits = Math.min(64, kits + 1); ZM.store.set("p02.kits", kits); gainItem("zm:tnt_repair_kit"); renderKit(); });
  const kitArt = $("#kitArt");
  const sPrimed = mkA("tnt_fuse");
  $("#ksFix").addEventListener("click", () => {
    if (kits <= 0) return;
    if (!fullSet()) { actionBar(mc("§cНадень полный комплект ТНТ-брони!")); kitArt.classList.remove("nope"); void kitArt.offsetWidth; kitArt.classList.add("nope"); return; }
    const anim = aDur.map((d, i) => (d < P.pieces[i].durability ? "fixed" : ""));
    if (!anim.some(Boolean)) { actionBar(mc("§cТНТ-броня уже полностью исправна!")); return; }
    aDur = P.pieces.map((p) => p.durability); ZM.store.set("p02.dura", aDur);
    kits--; ZM.store.set("p02.kits", kits); ZM.sfx("anvil", 0.5);
    renderDura(); renderKit(anim);
    actionBar(mc("§a⚡ ТНТ-броня полностью восстановлена!"));
    // SoundEvents.TNT_PRIMED, громкость 1.0, высота 0.8
    if (soundOn) { try { sPrimed.pause(); sPrimed.currentTime = 0; sPrimed.preservesPitch = false; sPrimed.mozPreservesPitch = false; sPrimed.playbackRate = 0.8; sPrimed.volume = 1; sPrimed.play().catch(() => {}); } catch (e) {} }
    // частицы: EXPLOSION ×3 и FLAME ×15
    kitArt.classList.remove("fixing"); void kitArt.offsetWidth; kitArt.classList.add("fixing");
    for (let k = 0; k < 18; k++) {
      const ex = k < 3, h = document.createElement("div");
      h.className = ex ? "kp-ex" : "kp-fl";
      h.style.cssText = ex ? `left:${30 + Math.random() * 40}%;top:${30 + Math.random() * 35}%;animation-delay:${k * 70}ms`
        : `left:${38 + Math.random() * 24}%;top:${35 + Math.random() * 25}%;--dx:${(Math.random() - 0.5) * 90}px;--dy:${-40 - Math.random() * 80}px;animation-delay:${Math.random() * 250}ms`;
      kitArt.appendChild(h); setTimeout(() => h.remove(), 1600);
    }
  });
  kitArt.addEventListener("contextmenu", (e) => { e.preventDefault(); $("#ksFix").click(); });
  kitArt.addEventListener("pointermove", (e) => {
    const r = kitArt.getBoundingClientRect();
    kitArt.style.setProperty("--ry", ((e.clientX - r.left) / r.width - 0.5) * 22 + "deg");
    kitArt.style.setProperty("--rx", ((e.clientY - r.top) / r.height - 0.5) * -22 + "deg");
  });
  kitArt.addEventListener("pointerleave", () => { kitArt.style.setProperty("--rx", "0deg"); kitArt.style.setProperty("--ry", "0deg"); });
  $("#kitRecipe").innerHTML = `<div class="mini-craft">${R.tnt_repair_kit.grid.map((id) => slot(id, 1)).join("")}</div>`;

  /* =====================================================================
     8. ЖИТЕЛЬ-ПОДРЫВНИК
     ===================================================================== */
  // 3D-модель жителя из CSS-боксов. Координаты и UV как в VillagerModel (1.19.2), 1 ед. = 1 пиксель модели
  function vbox(u, v, w, h, d, x, y, z, tr = "") {
    const S = (n) => `calc(${n} * var(--S))`;
    const face = (W, Hh, fu, fv, t) => `<i style="width:${S(W)};height:${S(Hh)};margin:${S(-Hh / 2)} 0 0 ${S(-W / 2)};background-size:${S(64)} ${S(64)};background-position:${S(-fu)} ${S(-fv)};transform:${t}"></i>`;
    return `<div class="vbox" style="transform:translate3d(${S(x)},${S(y)},${S(z)}) ${tr}">
      ${face(w, h, u + d, v + d, `translateZ(${S(d / 2)})`)}
      ${face(w, h, u + 2 * d + w, v + d, `rotateY(180deg) translateZ(${S(d / 2)})`)}
      ${face(d, h, u + d + w, v + d, `rotateY(90deg) translateZ(${S(w / 2)})`)}
      ${face(d, h, u, v + d, `rotateY(-90deg) translateZ(${S(w / 2)})`)}
      ${face(w, d, u + d, v, `rotateX(90deg) translateZ(${S(h / 2)})`)}
      ${face(w, d, u + d + w, v, `rotateX(-90deg) translateZ(${S(h / 2)})`)}
    </div>`;
  }
  const rig = $("#vilRig");
  rig.innerHTML = `<div class="vm" id="vm">
    <div class="vm" id="vHead" style="transform:translate3d(0,0,0)">${vbox(0, 0, 8, 10, 8, 0, -5, 0)}</div>
    ${vbox(16, 20, 8, 12, 6, 0, 6, 0)}
    ${vbox(0, 22, 4, 12, 4, -2, 18, 0)}${vbox(0, 22, 4, 12, 4, 2, 18, 0)}
    <div class="vm" style="transform:translate3d(0,calc(3*var(--S)),calc(1*var(--S))) rotateX(43deg)">
      ${vbox(44, 22, 4, 8, 4, -6, 2, 0)}${vbox(44, 22, 4, 8, 4, 6, 2, 0)}${vbox(40, 38, 8, 4, 4, 0, 4, 0)}
    </div></div>`;
  const vm = $("#vm"), vHead = $("#vHead"), stage = $("#vilStage");
  let rotY = -25, vel = 0, dragging = false, lastX = 0, idleT = 0;
  function drawVil() { vm.style.transform = `translateY(calc(-7 * var(--S))) rotateX(-10deg) rotateY(${rotY}deg)`; }
  stage.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; stage.setPointerCapture(e.pointerId); vel = 0; });
  stage.addEventListener("pointermove", (e) => {
    if (dragging) { const dx = e.clientX - lastX; lastX = e.clientX; rotY += dx * 0.6; vel = dx * 0.6; idleT = 0; drawVil(); return; }
    const r = stage.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
    vHead.style.transform = `translateY(0) rotateY(${nx * 40}deg) rotateX(${-ny * 20}deg)`;
    vHead.style.transformOrigin = "0 0";
  });
  const endDrag = () => (dragging = false);
  stage.addEventListener("pointerup", endDrag); stage.addEventListener("pointercancel", endDrag);
  stage.addEventListener("pointerleave", () => (vHead.style.transform = ""));
  let vilVisible = false;
  new IntersectionObserver((es) => es.forEach((e) => (vilVisible = e.isIntersecting))).observe(stage);
  (function spin() {
    if (vilVisible && !dragging) {
      if (Math.abs(vel) > 0.05) { rotY += vel; vel *= 0.93; }
      else if (!reduce) { idleT++; if (idleT > 120) rotY += 0.25; }
      drawVil();
    }
    requestAnimationFrame(spin);
  })();
  drawVil();

  // Торговля
  const LV = P.levels, LXP = P.levelXp;
  const LV_ICON = [U("assets/textures/mc/p2/block_stone.png"), U("assets/textures/mc/p2/item_iron_ingot.png"), U("assets/textures/mc/p2/item_gold_ingot.png"), U("assets/textures/mc/p2/item_emerald.png"), U("assets/textures/mc/p2/item_diamond.png")];
  const fresh = () => ({ lvl: 1, xp: 0, uses: {}, tab: 1, sel: 0, all: false });
  let V = Object.assign(fresh(), ZM.store.get("p02.vil", {}));
  const saveV = () => ZM.store.set("p02.vil", V);
  const unlocked = (l) => V.all || l <= V.lvl;
  let newTrades = new Set();
  function renderMerchant() {
    $("#merLvlName").textContent = LV[V.lvl - 1];
    $("#vilLvl").textContent = LV[V.lvl - 1];
    const p = V.lvl >= 5 ? 1 : (V.xp - LXP[V.lvl - 1]) / (LXP[V.lvl] - LXP[V.lvl - 1]);
    $("#vxpFill").style.setProperty("--p", Math.max(0, Math.min(1, p)) * 100 + "%");
    $("#merXp").innerHTML = V.lvl >= 5 ? `опыт <b>${V.xp}</b> · максимальный уровень` : `опыт <b>${V.xp}</b> / ${LXP[V.lvl]} · до «${LV[V.lvl]}» ещё ${LXP[V.lvl] - V.xp}`;
    $("#merAll").checked = V.all;
    $("#merTabs").innerHTML = LV.map((n, i) => {
      const l = i + 1, cnt = P.trades.filter((t) => t.lvl === l).length;
      return `<button type="button" role="tab" data-l="${l}" aria-selected="${V.tab === l}" class="${unlocked(l) ? "" : "locked"}" title="${esc(n)}">
        <img src="${LV_ICON[i]}" alt=""><span class="mt-n">${n}</span><span class="mt-c">${cnt}</span></button>`;
    }).join("");
    const list = P.trades.map((t, i) => ({ t, i })).filter((x) => x.t.lvl === V.tab);
    if (!list.some((x) => x.i === V.sel)) V.sel = list[0].i;
    $("#merList").innerHTML = list.map(({ t, i }) => {
      const used = V.uses[i] || 0, out = used >= t.uses, left = t.uses - used;
      return `<button type="button" class="tr ${V.sel === i ? "sel" : ""} ${out ? "out" : ""} ${unlocked(t.lvl) ? "" : "locked"} ${newTrades.has(i) ? "new" : ""}" data-i="${i}">
        <span class="tr-in">${slot(t.a[0], t.a[1])}${t.b ? slot(t.b[0], t.b[1]) : `<span class="slot ghost"></span>`}</span><span class="arrow"></span>${slot(t.r[0], t.r[1])}
        <span class="uses" title="осталось сделок"><i style="width:${(left / t.uses) * 100}%"></i><span>${left}</span></span></button>`;
    }).join("");
    newTrades.clear();
    renderDetail();
  }
  function renderDetail() {
    const t = P.trades[V.sel], used = V.uses[V.sel] || 0, out = used >= t.uses, ok = unlocked(t.lvl);
    const chips = [
      `<span class="ch lv"><img src="${LV_ICON[t.lvl - 1]}" alt="">${LV[t.lvl - 1]}</span>`,
      `<span class="ch xp">+${t.xp} опыта</span>`,
      `<span class="ch">сделок ${t.uses - used}/${t.uses}</span>`,
      t.ench ? `<span class="ch en">✦ ${esc(t.ench)}</span>` : "",
      t.chance ? `<span class="ch ra">шанс ${t.chance * 100}%</span>` : "",
      t.random ? `<span class="ch rn">🎲 случайно</span>` : "",
    ].join("");
    $("#merDetail").innerHTML = `
      <div class="md-stage"><div class="md-row">${slot(t.a[0], t.a[1])}${t.b ? `<span class="md-plus">+</span>${slot(t.b[0], t.b[1])}` : ""}<span class="arr ${out ? "off" : ""}"></span>${slot(t.r[0], t.r[1], "res")}</div></div>
      <div class="md-name">${esc(tradeName(t.r[0]))}${t.r[1] > 1 ? `<span class="x">×${t.r[1]}</span>` : ""}</div>
      <div class="md-chips">${chips}</div>
      ${t.random ? `<div class="md-note">${esc(t.random)}</div>` : ""}
      ${t.note ? `<div class="md-note">${esc(t.note)}</div>` : ""}
      <button type="button" class="mc-btn md-btn" id="merTrade" ${!ok || out ? "disabled" : ""}>${!ok ? `🔒 Откроется: ${LV[t.lvl - 1]}` : out ? "Нет в наличии" : "Обменять"}</button>`;
  }
  $("#merTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-l]"); if (!b) return; V.tab = +b.dataset.l; saveV(); renderMerchant(); });
  $("#merList").addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (!b) return; V.sel = +b.dataset.i; saveV(); $$(".tr", $("#merList")).forEach((x) => x.classList.toggle("sel", x === b)); renderDetail(); });
  $("#merDetail").addEventListener("click", (e) => {
    if (!e.target.closest("#merTrade")) return;
    const t = P.trades[V.sel];
    V.uses[V.sel] = (V.uses[V.sel] || 0) + 1;
    V.xp += t.xp; gainItem(t.r[0]);
    let up = false;
    while (V.lvl < 5 && V.xp >= LXP[V.lvl]) {
      V.lvl++; up = true;
      P.trades.forEach((x, i) => x.lvl === V.lvl && newTrades.add(i));
      ZM.toast({ iconHtml: img("emerald"), title: `Подрывник: ${LV[V.lvl - 1]}`, head: "Житель повысил уровень!" });
    }
    if (up) { V.tab = V.lvl; const vx = $(".vxp"); vx.classList.remove("up"); void vx.offsetWidth; vx.classList.add("up"); }
    saveV(); renderMerchant();
  });
  $("#merAll").addEventListener("change", (e) => { V.all = e.target.checked; saveV(); renderMerchant(); });
  $("#merReset").addEventListener("click", () => { V = fresh(); saveV(); renderMerchant(); });

  /* =====================================================================
     8b. АЧИВКИ: «минное поле». Пока ачивка не получена, клетка = целый ТНТ.
     Ачивки выдаются прямо на странице: ульта на полигоне, убийство взрывом, полный Бомбардир.
     ===================================================================== */
  const ADV = P.advancements || [];
  let got = ZM.store.get("p02.adv", []).filter((k) => ADV.some((a) => a.key === k));   // старые черновые ключи выкидываем
  const FRAME_RU = { task: "обычная", goal: "цель", challenge: "испытание" };
  // §-коды Minecraft → HTML (цвета и §l/§o/§n/§m), как в игре
  const MC_COL = { 0: "#000", 1: "#00a", 2: "#0a0", 3: "#0aa", 4: "#a00", 5: "#a0a", 6: "#fa0", 7: "#aaa", 8: "#555", 9: "#55f", a: "#5f5", b: "#5ff", c: "#f55", d: "#f5f", e: "#ff5", f: "#fff" };
  function mc(str, base = "#fff") {
    let col = base, st = {}, out = "";
    str.split(/(§[0-9a-fk-or])/i).forEach((part) => {
      const m = /^§([0-9a-fk-or])$/i.exec(part);
      if (m) { const c = m[1].toLowerCase(); if (MC_COL[c]) { col = MC_COL[c]; st = {}; } else if (c === "r") { col = base; st = {}; } else st[c] = 1; return; }
      if (!part) return;
      out += `<span style="color:${col};${st.l ? "font-weight:700;" : ""}${st.o ? "font-style:italic;" : ""}${st.n || st.m ? `text-decoration:${st.n ? "underline" : ""} ${st.m ? "line-through" : ""};` : ""}">${esc(part)}</span>`;
    });
    return out;
  }
  const plain = (str) => str.replace(/§[0-9a-fk-or]/gi, "");
  function grant(key) {
    const a = ADV.find((x) => x.key === key);
    if (!a || got.includes(key)) return;
    got.push(key); ZM.store.set("p02.adv", got);
    ZM.toast({ iconHtml: img(a.icon), title: plain(a.title), frame: a.frame, head: a.frame === "challenge" ? "Испытание выполнено!" : a.frame === "goal" ? "Цель достигнута!" : "Получено достижение!" });
    advSel = key;
    renderMines(key); renderTree(key);
  }
  // «inventory_changed»: предмет попал к игроку (верстак, комплект, подрывник)
  const ITEM_ADV = { "zm:tnt_helmet": "helmet", "zm:tnt_chestplate": "chestplate", "zm:tnt_leggings": "leggings", "zm:tnt_boots": "boots", "zm:tnt_repair_kit": "repair_kit_craft" };
  function gainItem(id) { if (ITEM_ADV[id]) grant(ITEM_ADV[id]); }
  // цепочка змейкой 3×3: 1→2→3, ↓, 6←5←4, ↓, 7→8→9; между клетками шнур, горит, если обе ачивки есть
  const COLS = 3;
  const cellPos = (i) => { const r = Math.floor(i / COLS), c = r % 2 ? COLS - 1 - (i % COLS) : i % COLS; return { r, c }; };
  function renderMines(fresh) {
    const tnt = U("assets/textures/mc/p2/iso/tnt.png");
    $("#mineGrid").innerHTML = ADV.map((a, i) => {
      const { r, c } = cellPos(i), has = got.includes(a.key);
      let lnk = "";
      if (i < ADV.length - 1) {
        const n = cellPos(i + 1), dir = n.r > r ? "d" : n.c > c ? "r" : "l";
        lnk = `<i class="lnk ${dir} ${has && got.includes(ADV[i + 1].key) ? "lit" : ""}" aria-hidden="true"></i>`;
      }
      const pos = `style="grid-row:${r + 1};grid-column:${c + 1}"`;
      if (has) {
        const s = src(a.icon);
        return `<button type="button" class="mine open ${fresh === a.key ? "fresh" : ""}" data-i="${i}" ${pos}>${lnk}<span class="mf ${a.glint ? "glint" : ""}" ${a.glint ? `style="--m:url('${s.src}')"` : ""}><span class="adv-frame ${a.frame || "task"}"></span>${img(a.icon)}</span><b>${mc(a.title)}</b></button>`;
      }
      return `<button type="button" class="mine" data-i="${i}" ${pos} aria-label="Закрытая ачивка">${lnk}<img src="${tnt}" alt="" draggable="false"><span class="q">???</span></button>`;
    }).join("");
    const opened = ADV.filter((a) => got.includes(a.key));
    const xp = opened.reduce((s, a) => s + a.xp, 0), xpAll = ADV.reduce((s, a) => s + a.xp, 0);
    $("#mineSide").innerHTML = `
      <div class="ms-count"><b>${opened.length}</b><span>/ ${ADV.length}</span></div>
      <div class="ms-xp"><span class="bar"><i style="width:${(xp / xpAll) * 100}%"></i></span><em>${xp} / ${xpAll} опыта</em></div>
      <p>Все ${ADV.length} ачивок скрытые, как в моде: пока не получишь, не видно ни названия, ни условия. <b>Взорвать можно все прямо здесь</b>, на этой странице.</p>
      <div class="ms-legend"><span><i class="lg t"></i>обычная</span><span><i class="lg g"></i>цель</span><span><i class="lg c"></i>испытание</span></div>
      <div class="ms-msg" id="mineMsg">Нажми на клетку, чтобы проверить её.</div>
      ${opened.length ? `<button type="button" class="link" id="mineReset">↺ заминировать заново</button>` : ""}`;
  }
  function resetAdv() { got = []; ZM.store.set("p02.adv", got); advSel = null; renderMines(); renderTree(); }
  $("#mineSide").addEventListener("click", (e) => { if (e.target.closest("#mineReset")) resetAdv(); });

  /* Ветка достижений: общий вид для всех пунктов (стили в shared/core.css, как на №01).
     В ветке только полученные ачивки, остальные не видны вообще, как в Майнкрафте. */
  $("#advBoard").style.setProperty("--tile", `url("${new URL(U("assets/textures/mc/p2/block_tnt_side.png"), location.href).href}")`);
  let advSel = null;
  const advIc = (a, px) => `<span class="ic${a.glint ? " glint" : ""}" style="width:${px}px;height:${px}px${a.glint ? `;--m:url('${src(a.icon).src}')` : ""}">${img(a.icon)}</span>`;
  function renderTree(pulse) {
    const open = ADV.filter((a) => got.includes(a.key)), hidden = ADV.length - open.length;
    if (!advSel || !got.includes(advSel)) advSel = open.length ? open[open.length - 1].key : null;
    $("#advChain").innerHTML = open.length
      ? open.map((a, i) => (i ? `<div class="adv-link on"></div>` : "") + `
        <button type="button" class="adv-node ${pulse === a.key ? "pulse" : ""} ${advSel === a.key ? "sel" : ""}" data-k="${a.key}" aria-label="${esc(plain(a.title))}">
          <span class="adv-frame ${a.frame}"></span>${advIc(a, 30)}</button>`).join("") + (hidden ? `<div class="adv-link"></div><div class="adv-more">+${hidden} скрыто</div>` : "")
      : `<div class="adv-empty">Тут пусто. Ачивки появляются, только когда получишь их.<br>Забери ТНТ-шлем из верстака или надень комплект.</div>`;
    const a = ADV.find((x) => x.key === advSel);
    if (!a) {
      $("#advDetail").innerHTML = `<div class="big"><span class="adv-frame task locked"></span><span class="q">?</span></div>
        <div class="txt"><div class="tt">???</div><div class="dd">Ни одной ачивки пока нет</div><div class="cc">В ветке ${ADV.length} ачивок, все скрыты</div></div>`;
    } else {
      const i = ADV.indexOf(a), par = ADV[i - 1];
      const parTxt = !par ? " · первая в ветке" : ` · после «${got.includes(par.key) ? esc(plain(par.title)) : "???"}»`;
      $("#advDetail").innerHTML = `
        <div class="big"><span class="adv-frame ${a.frame}"></span>${advIc(a, 34)}</div>
        <div class="txt"><div class="tt">${mc(a.title)}</div><div class="dd">${mc(a.description, "#aaa")}</div>
          <div class="cc">${esc(a.how)}${parTxt}</div></div>
        <div class="meta"><span class="st ok">ПОЛУЧЕНА</span>
          <span>Рамка: ${FRAME_RU[a.frame]}${a.frame === "challenge" ? " (фиолетовая)" : ""}</span><span><b>+${a.xp} XP</b></span></div>`;
    }
    $("#advList").innerHTML = open.map((a) => `<button type="button" class="adv-row has" data-k="${a.key}">
        <span class="fr"><span class="adv-frame ${a.frame}"></span>${advIc(a, 24)}</span>
        <span><span class="t">${mc(a.title)}</span><br><span class="d">${mc(a.description, "#999")}</span></span>
        <span class="x">✓ получена<br>+${a.xp} XP</span></button>`).join("")
      + (hidden ? `<div class="adv-row locked"><span class="fr"><span class="adv-frame task locked"></span><span class="q">?</span></span>
        <span><span class="t">??? × ${hidden}</span><br><span class="d">Скрыты, пока не получишь</span></span></div>` : "");
    $("#advBar").style.width = (open.length / ADV.length) * 100 + "%";
    $("#advTxt").textContent = `${open.length} / ${ADV.length} · ${open.reduce((s, x) => s + x.xp, 0)} / ${ADV.reduce((s, x) => s + x.xp, 0)} XP`;
  }
  const pickAdv = (e) => { const n = e.target.closest("[data-k]"); if (!n) return; advSel = n.dataset.k; renderTree(); };
  $("#advChain").addEventListener("click", pickAdv);
  $("#advList").addEventListener("click", (e) => { if (!e.target.closest("[data-k]")) return; pickAdv(e); $("#advBoard").scrollIntoView({ behavior: "smooth", block: "center" }); });
  $("#advReset").addEventListener("click", resetAdv);
  $("#mineGrid").addEventListener("click", (e) => {
    const b = e.target.closest(".mine"); if (!b) return;
    $$(".mine.sel", $("#mineGrid")).forEach((x) => x.classList.remove("sel"));
    if (b.classList.contains("open")) {
      const a = ADV[+b.dataset.i]; b.classList.add("sel");
      $("#mineMsg").innerHTML = `<div class="mm-t">${mc(a.title)}</div><div class="mm-d">${mc(a.description, "#aaa")}</div>
        <div class="mm-tags"><span class="f-${a.frame}">${FRAME_RU[a.frame]}</span><span>+${a.xp} опыта</span><span>№${+b.dataset.i + 1} в цепочке</span></div>
        <small>${esc(a.how)}</small>`;
      return;
    }
    b.classList.remove("wig"); void b.offsetWidth; b.classList.add("wig");
    $("#mineMsg").textContent = ["Не взорвано. Что под ним, узнаешь сам.", "Фитиль сухой. Сначала получи ачивку.", "Тсс… под этим блоком что-то тикает."][Math.floor(Math.random() * 3)];
  });

  /* =====================================================================
     9. ХРОНОЛОГИЯ
     ===================================================================== */
  // Бикфордов шнур вдоль хронологии: горит по кругу, искра зажигает вехи по пути, потом шнур «отрастает» заново
  const tl = $("#timeline");
  tl.innerHTML = `<div class="tl-rope" aria-hidden="true"><i class="tl-burn"></i><i class="tl-spark"><b></b><b></b><b></b><b></b></i></div>` +
    P.history.map((h) => `<div class="tl-i"><time>${h.date}</time>${h.ver ? `<span class="v">v${h.ver}</span>` : ""}<p>${esc(h.text)}</p></div>`).join("");
  const tlItems = $$(".tl-i", tl);
  let tlVisible = false, tlStart = 0;
  new IntersectionObserver((es) => es.forEach((e) => { tlVisible = e.isIntersecting; if (tlVisible && !tlStart) tlStart = performance.now(); }), { threshold: 0.2 }).observe(tl);
  const BURN = 5200, HOLD = 1400, REGROW = 700;   // мс: горит, тлеет, отрастает
  (function fuseLoop(now) {
    requestAnimationFrame(fuseLoop);
    if (!tlVisible) return;
    const vertical = getComputedStyle(tl).gridTemplateColumns.split(" ").length === 1;
    const len = vertical ? tl.clientHeight : tl.clientWidth;
    const t = (now - tlStart) % (BURN + HOLD + REGROW);
    let p, phase;
    if (t < BURN) { p = reduce ? 1 : t / BURN; phase = "burn"; }
    else if (t < BURN + HOLD) { p = 1; phase = "hold"; }
    else { p = 1 - (t - BURN - HOLD) / REGROW; phase = "regrow"; }
    tl.style.setProperty("--p", (p * 100).toFixed(2) + "%");
    tl.dataset.phase = phase;
    const head = p * len;
    tlItems.forEach((el) => {
      const pos = vertical ? el.offsetTop + 26 : el.offsetLeft + 30;   // центр кружка вехи
      el.classList.toggle("lit", phase !== "regrow" ? head >= pos - 4 : head >= pos);
    });
  })(performance.now());

  /* =====================================================================
     10. ФИНАЛ: вращающийся ТНТ, который взрывается, когда фитиль догорит
     ===================================================================== */
  const T = (n) => U(`assets/textures/mc/p2/block_tnt_${n}.png`);
  $("#finTnt").innerHTML = `<div class="tnt3">${[
    ["side", "translateZ(75px)"], ["side", "rotateY(90deg) translateZ(75px)"], ["side", "rotateY(180deg) translateZ(75px)"],
    ["side", "rotateY(-90deg) translateZ(75px)"], ["top", "rotateX(90deg) translateZ(75px)"], ["bottom", "rotateX(-90deg) translateZ(75px)"],
  ].map(([t, tr]) => `<i style="background-image:url('${T(t)}');transform:${tr}"></i>`).join("")}</div>`;
  const finTnt = $("#finTnt");
  let finBusy = false;
  function finaleBoom() {
    if (finBusy) return;
    finBusy = true;
    finTnt.classList.add("primed");
    $(".tnt-label").classList.add("lit");
    playVanilla(sFuse, 0.9);   // шипение фитиля, как у подожжённого ТНТ
    setTimeout(() => {
      finTnt.classList.remove("primed"); finTnt.classList.add("gone");
      const layer = document.createElement("div");
      layer.className = "page-boom";
      layer.innerHTML = `<div class="sc-fx"></div><div class="sc-flash"></div>`;
      document.body.appendChild(layer);
      const r = finTnt.getBoundingClientRect();
      explosion(layer.firstChild, $("#finale"), { x: ((r.left + r.width / 2) / innerWidth) * 100, y: ((r.top + r.height / 2) / innerHeight) * 100, power: 1.6, sound: "tnt" });
      setTimeout(() => { layer.remove(); finTnt.classList.remove("gone"); finBusy = false; $(".tnt-label").classList.remove("lit"); }, 2200);
    }, reduce ? 50 : 2500);
  }
  $("#finBtn").addEventListener("click", finaleBoom);
  const nav = ZM.pointNav(2);
  $("#finNav").innerHTML = (nav.prev ? `<a href="${U(nav.prev.href)}">← №${String(nav.prev.n).padStart(2, "0")} ${esc(nav.prev.title)}</a>` : "") +
    `<a href="${U("index.html")}">Все пункты</a>` + (nav.next ? `<a href="${U(nav.next.href)}">№${String(nav.next.n).padStart(2, "0")} ${esc(nav.next.title)} →</a>` : "");

  /* ---------------- старт ---------------- */
  renderSet(); renderHudArmor(); renderCmp(); renderDura(); drawCharge(); renderEnch(); renderCraft(); renderKit(); renderMerchant(); renderMines(); renderTree(); advLive = true;
  ZM.reveal();
  onScroll();
  requestAnimationFrame(frame);
})();
