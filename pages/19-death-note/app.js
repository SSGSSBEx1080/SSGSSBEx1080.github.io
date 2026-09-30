/* №19 · Тетрадь смерти. Логика из DeathNoteItem / DeathNoteRequiemItem / DeathNoteRecipe / RequestDeathPacket / DeathNoteTickHandler / KillMethods:
   обычная: 40 с, способ 0 (kill()), прочность = maxUses из NBT по первому распознанному чёрному материалу; Реквием: 25, время 10/30/40/60, 6 способов;
   запись тратит 1 прочность только если цель найдена; поломка на последней единице → запись не исполняется;
   игрок — по нику на всём сервере, моб — ближайший в кубе ±256 по имени/ID/русскому имени (14 мобов), боссы не находятся;
   убийства считает только обычная; маска способов 63 → «Мастер казни». */
(function () {
  const { $, $$, esc } = ZM, K = ZM.kit, U = ZM.url;
  ZM.topbar({ crumb: "№19 · Тетрадь смерти", ...ZM.pointNav(19) });
  const T = (p, e = "png") => U(`assets/textures/p19/${p}.${e}`);
  const snd = K.sounds("p19");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motion = () => !reduce && !document.documentElement.classList.contains("no-motion");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const flip = () => snd("flip" + (1 + Math.floor(Math.random() * 3)), 0.8);
  let adv = null;
  const me = () => (ZM.profile && ZM.profile.me().nick) || "Игрок";

  /* ================= фон: имена, которые кто-то пишет ================= */
  (function rain() {
    const cv = $("#rain"), cx = cv.getContext("2d"); let W, H, items = [];
    const NAMES = ["Зомби", "Крипер", "zombie", "Скелет", "Свинья", "Хрюн", "L_Lawliet", "Житель", "Корова", "skeleton", "Ведьма", "Паук", "creeper", "Курица", "Овца", "Эндермен", "Лошадь", "Волк"];
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0); };
    size(); addEventListener("resize", size);
    let last = 0;
    function frame(t) {
      requestAnimationFrame(frame);
      if (!motion() || document.hidden) return;
      if (t - last > 1700 && items.length < 7) { last = t; items.push({ s: NAMES[Math.floor(Math.random() * NAMES.length)], x: rnd(0.04, 0.8) * W, y: rnd(0.1, 0.95) * H, r: rnd(-0.12, 0.05), z: rnd(22, 44), t0: t }); }
      cx.clearRect(0, 0, W, H);
      items = items.filter((it) => t - it.t0 < 9000);
      for (const it of items) {
        const age = (t - it.t0) / 1000, n = Math.min(it.s.length, Math.floor(age * 7)), a = age < 6 ? 1 : Math.max(0, 1 - (age - 6) / 3);
        cx.save(); cx.translate(it.x, it.y); cx.rotate(it.r); cx.font = `500 ${it.z}px "DN Hand", cursive`; cx.fillStyle = `rgba(235,235,235,${0.07 * a})`;
        cx.fillText(it.s.slice(0, n), 0, 0);
        if (n >= it.s.length && age > 2.2) { const w = cx.measureText(it.s).width, k = Math.min(1, (age - 2.2) * 2.5); cx.strokeStyle = `rgba(190,20,30,${0.22 * a})`; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(-4, -it.z * 0.3); cx.lineTo(-4 + (w + 8) * k, -it.z * 0.3); cx.stroke(); }
        cx.restore();
      }
    }
    requestAnimationFrame(frame);
  })();

  /* ================= HERO: тетрадь из модели (две половины, анимация open из death_note.animation.json) ================= */
  const names = ZM.store.get("p19.names", []); let heroNames = () => {};
  (function book() {
    const b = $("#book"), wrap = $("#bookWrap");
    b.innerHTML = `
      <div class="dn-half r"><div class="dn-f back"></div><div class="dn-edge e1"></div><div class="dn-edge e2"></div><div class="dn-pg"><div class="dn-pg-t">${esc("Имена")}</div><ol id="heroNames"></ol></div><div class="dn-sp"></div></div>
      <div class="dn-half l"><div class="dn-f out"></div><div class="dn-pg in"><div class="dn-rule-h">HOW TO USE IT</div><p>Человек, чьё имя будет записано в этой тетради, умрёт.</p><p>Если время не указано, смерть наступит через 40 секунд.</p><p>Писать нужно, держа лицо цели в уме: иначе умрёт ближайший тёзка.</p></div><div class="dn-sp"></div></div>`;
    const st = K.spinner(wrap, { ry: -24, rx: 8 }, 35); let open = false, down = null, t0 = performance.now();
    const hn = () => { $("#heroNames").innerHTML = names.slice(-7).map((n) => `<li>${esc(n)}</li>`).join("") || `<li class="e">…пусто</li>`; };
    hn(); heroNames = hn;
    wrap.addEventListener("pointerdown", (e) => (down = { x: e.clientX, y: e.clientY }));
    wrap.addEventListener("pointerup", (e) => { if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) { open = !open; b.classList.toggle("open", open); flip(); } down = null; });
    $$(".dn-mode button").forEach((x) => x.addEventListener("click", () => { $$(".dn-mode button").forEach((y) => y.classList.toggle("on", y === x)); b.classList.toggle("req", x.dataset.m === "r"); snd(x.dataset.m === "r" ? "enchant" : "click", 0.6); }));
    (function loop(t) {
      requestAnimationFrame(loop);
      if (st.idle() && motion()) { const k = (t - t0) / 1000; st.ry += (-24 + Math.sin(k * 0.5) * 16 - st.ry) * 0.03; st.rx += (8 + Math.sin(k * 0.8) * 3 - st.rx) * 0.03; }
      const bob = motion() ? Math.sin(t / 1000 * Math.PI * 2) * 3 : 0; // idle: position y -0.5 на полсекунды
      b.style.transform = `translateY(${bob}px) rotateX(${st.rx}deg) rotateY(${st.ry}deg)`;
    })(performance.now());
  })();

  /* ================= 01 КРАФТ ================= */
  const MATS = [
    ["obsidian", "Обсидиан", 10], ["netherite_block", "Незеритовый блок", 10], ["crying_obsidian", "Плачущий обсидиан", 7], ["black_shulker_box", "Чёрный шалкеровый ящик", 5],
    ["blackstone", "Чернокамень", 4], ["black_terracotta", "Чёрная терракота", 4], ["black_glazed_terracotta", "Чёрная глазурованная керамика", 4], ["black_concrete", "Чёрный бетон", 3],
    ["black_wool", "Чёрная шерсть", 2], ["coal_block", "Угольный блок", 2], ["black_concrete_powder", "Чёрный сухой бетон", 2], ["black_candle", "Чёрная свеча", 2],
    ["black_banner", "Чёрный флаг", 2], ["black_bed", "Чёрная кровать", 2], ["black_carpet", "Чёрный ковёр", 1], ["black_stained_glass", "Чёрное окрашенное стекло", 0], ["black_stained_glass_pane", "Чёрная окрашенная стеклянная панель", 0],
  ];
  const MAT = Object.fromEntries(MATS.map(([id, n, u]) => [id, { id, n, u }]));
  let brush = "obsidian"; const slots = Array(9).fill("obsidian"); slots[4] = "book";
  const kills = (n) => `${n} ${K.plural(n, "казнь", "казни", "казней")}`;
  const zap = (n) => `${n} ${K.plural(n, "запись", "записи", "записей")}`;
  $("#mats").innerHTML = MATS.map(([id, n, u]) => `<button type="button" class="dn-mat${id === brush ? " on" : ""}${u ? "" : " bad"}" data-id="${id}" role="option" data-tip="${esc(n)}" data-tip-sub="${u ? zap(u) : "тег принимает, рецепт — нет"}"><img src="${T("i/" + id)}" alt="${esc(n)}"><b>${u || "✕"}</b></button>`).join("");
  function craftResult() {
    // DeathNoteRecipe.assemble: первый слот, который узнаёт isBlackBlock (стекло и панель он не узнаёт)
    const first = slots.find((s, i) => i !== 4 && MAT[s] && MAT[s].u > 0);
    return first ? MAT[first] : null;
  }
  function drawGrid() {
    $("#grid").innerHTML = slots.map((s, i) => i === 4
      ? `<span class="k-slot" data-tip="Книга с пером" data-tip-sub="minecraft:writable_book"><img src="${T("i/writable_book")}" alt=""></span>`
      : `<button type="button" class="k-slot dn-gs" data-i="${i}" data-tip="${esc(MAT[s].n)}" data-tip-sub="клик — положить выбранный"><img src="${T("i/" + s)}" alt=""></button>`).join("");
    const r = craftResult(), res = $("#res");
    res.innerHTML = r ? `<img src="${T("i/death_note")}" alt="">` : "";
    res.dataset.tip = r ? "Тетрадь смерти" : ""; res.dataset.tipSub = r ? zap(r.u) : "";
    const firstI = slots.findIndex((s, i) => i !== 4 && MAT[s] && MAT[s].u > 0);
    $$("#grid .dn-gs").forEach((el) => el.classList.toggle("first", +el.dataset.i === firstI));
    $("#matInfo").innerHTML = r
      ? `<b>${esc(r.n)}</b> в слоте №${firstI + 1} решает всё:<br><span class="big">${zap(r.u)}</span><span class="dim">→ ${r.u > 1 ? kills(r.u - 1) : "ни одной казни: сломается на первой же записи"}</span>${r.u >= 6 ? `<span class="ok">хватит на Реквием</span>` : `<span class="no">на Реквием не хватит</span>`}`
      : `<b>Результата нет.</b><span class="dim">Стекло есть в теге рецепта, но сборщик его не узнаёт — верстак остаётся пустым.</span>`;
  }
  drawGrid();
  $("#mats").addEventListener("click", (e) => {
    const b = e.target.closest(".dn-mat"); if (!b) return; brush = b.dataset.id;
    $$(".dn-mat").forEach((x) => x.classList.toggle("on", x === b)); snd("click", 0.5);
    adv && adv.grant("black_book");
  });
  $("#grid").addEventListener("click", (e) => { const s = e.target.closest(".dn-gs"); if (!s) return; slots[+s.dataset.i] = brush; snd("pop", 0.4, 1.4); drawGrid(); adv && adv.grant("black_book"); });
  $("#fillAll").addEventListener("click", () => { for (let i = 0; i < 9; i++) if (i !== 4) slots[i] = brush; snd("pop", 0.4, 1.1); drawGrid(); adv && adv.grant("black_book"); });
  $("#trick").addEventListener("click", () => { for (let i = 0; i < 9; i++) if (i !== 4) slots[i] = i === 0 ? "obsidian" : "black_carpet"; snd("pop", 0.4, 1.1); drawGrid(); adv && adv.grant("black_book"); });
  $("#res").addEventListener("click", () => {
    const r = craftResult(); if (!r) { snd("click", 0.4, 0.6); return; }
    const el = $("#res"); el.classList.remove("got"); void el.offsetWidth; el.classList.add("got"); ZM.sfx("pop", 0.5, 1.2);
    adv && adv.grant("craft_death_note");
    setNote({ mat: r.id, max: r.u, dmg: 0, kills: 0 }); selectTab("n");
    K.say(`Тетрадь из «${r.n}»: ${zap(r.u)}. Она уже в симуляторе.`);
  });
  K.craft($("#craftB"), {
    pattern: ["ANA", "OTO", "KSE"],
    key: { A: { name: "Зачарованное золотое яблоко", id: "minecraft:enchanted_golden_apple", src: T("i/enchanted_golden_apple") }, N: { name: "Незеритовый блок", id: "minecraft:netherite_block", src: T("i/netherite_block") },
      O: { name: "Обсидиан", id: "minecraft:obsidian", src: T("i/obsidian") }, T: { name: "Тетрадь смерти (5 убийств)", id: "zitraksmode:death_note", src: T("i/death_note") },
      K: { name: "Кафедра", id: "minecraft:lectern", src: T("i/lectern") }, S: { name: "Звезда Незера", id: "minecraft:nether_star", src: T("i/nether_star") }, E: { name: "Стол зачаровывания", id: "minecraft:enchanting_table", src: T("i/enchanting_table") } },
    result: { name: "Тетрадь смерти Реквием", id: "zitraksmode:death_note_requiem", src: T("i/death_note_requiem") },
    onTake: () => {
      if (!note || note.kills < 5) { K.say(`Нужна Тетрадь с пятью убийствами. На твоей: ${note ? note.kills : 0}.`, true); return; }
      adv && adv.grant("craft_death_note_requiem");
      note = null; saveNote(); req = { dmg: 0 }; ZM.store.set("p19.req", req); selectTab("r"); snd("enchant", 0.8);
      K.say("Реквием в руке. Обычная тетрадь ушла в рецепт.");
    },
  });
  $("#craftB .k-craft").classList.add("dn-kc", "dn-req-craft");

  /* ================= 02 ПРАВИЛА ================= */
  const RULES = [
    ["Человек, чьё имя записано в этой тетради, умрёт через <b>40 секунд</b>. Владелец Реквиема сам выбирает срок: 10, 30, 40 или 60 секунд."],
    ["Регистр букв не важен. Игрока тетрадь найдёт по нику на всём сервере, в любом измерении."],
    ["Моба можно записать по имени с бирки, по английскому ID (<i>zombie</i>) или по-русски. По-русски тетрадь знает четырнадцать имён: Крипер, Зомби, Скелет, Паук, Пещерный паук, Эндермен, Ведьма, Волк, Свинья, Корова, Курица, Овца, Лошадь, Житель."],
    ["Мобов тетрадь ищет не дальше 256 блоков от владельца. Если подходят несколько, умрёт ближайший."],
    ["Эндер-дракон, иссушитель, хранитель и древний страж тетради не подчиняются: их она просто не находит."],
    ["Пока идёт отсчёт, цель светится сквозь стены. Владелец слышит свою музыку, и длится она ровно сорок секунд."],
    ["Одновременно действует только одна запись. Пока казнь не исполнена, ни одна тетрадь в инвентаре не откроется."],
    ["Каждая запись стоит одну единицу прочности. Если цель не найдена, прочность не тратится."],
    ["Прочность обычной тетради зависит от чёрного материала в крафте: от 1 (ковёр) до 10 (обсидиан, незерит). У Реквиема всегда 25."],
    ["Запись, на которой тетрадь ломается, не исполняется. Казней всегда на одну меньше, чем прочность."],
    ["Убийства считает только обычная тетрадь. После пятого её можно вложить в Реквием."],
    ["Способ смерти выбирает только Реквием: казнь, наковальня, лава, падение, молния, взрыв. Обычная тетрадь просто останавливает сердце."],
    ["Можно записать и собственный ник. Тетрадь спорить не будет."],
  ];
  const ROM = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII"];
  $("#rulesBox").innerHTML = `<div class="dn-rules-h"><b>HOW TO USE IT</b><span>как пользоваться</span></div><ol>${RULES.map((r, i) => `<li><em>${ROM[i]}</em><p>${r[0]}</p></li>`).join("")}</ol>`;

  /* ================= 03 СИМУЛЯТОР ================= */
  const MOBS = [
    { key: "zombie", id: "zombie", ru: "Зомби", hp: 20, dist: 14, snd: "zdeath" },
    { key: "pig", id: "pig", ru: "Свинья", nick: "Хрюн", hp: 10, dist: 6, snd: "pdeath" },
    { key: "creeper", id: "creeper", ru: "Крипер", hp: 20, dist: 22, snd: "cdeath" },
    { key: "skeleton", id: "skeleton", ru: "Скелет", hp: 20, dist: 41, snd: "sdeath" },
    { key: "cow", id: "cow", ru: "Корова", hp: 10, dist: 63, snd: "cowhurt" },
    { key: "lawliet", id: "player", player: "L_Lawliet", face: "steve", hp: 20, dist: 4812, snd: "hit" },
    { key: "wither", id: "wither", ru: "Иссушитель", boss: true, hp: 300, dist: 35, snd: "wither" },
  ];
  const ME = { key: "self", id: "player", self: true, face: "steve", hp: 20, dist: 0, snd: "hit" };
  const label = (m) => m.self ? me() : m.player || m.nick || m.ru;
  let cur = MOBS[0];
  function resolve(name) {
    const q = name.trim().toLowerCase(); if (!q) return null;
    if (q === me().toLowerCase()) return ME;                                      // getPlayerByName: и себя тоже
    const pl = MOBS.find((m) => m.player && m.player.toLowerCase() === q); if (pl) return pl;
    const found = MOBS.filter((m) => !m.player && !m.boss && m.dist <= 256 && ((m.nick ? m.nick : m.ru).toLowerCase() === q || m.id === q || (m.ru && m.ru.toLowerCase() === q)));
    found.sort((a, b) => a.dist - b.dist); return found[0] || null;
  }
  $("#targets").innerHTML = MOBS.map((m) => `<button type="button" class="dn-dos${m.boss ? " boss" : ""}" data-k="${m.key}"><img src="${T("f/" + (m.face || m.key))}" alt=""><span><b>${esc(m.player || m.nick || m.ru)}</b><small>${m.player ? "игрок · " + (m.dist > 1000 ? "другое измерение" : m.dist + " бл.") : (m.nick ? m.ru + " с биркой · " : "") + (m.boss ? "босс" : m.id) + (m.player ? "" : " · " + m.dist + " бл.")}</small></span></button>`).join("");
  $("#targets").addEventListener("click", (e) => {
    const d = e.target.closest(".dn-dos"); if (!d) return; const m = MOBS.find((x) => x.key === d.dataset.k);
    if (!active) { cur = m; resetMob(); }
    const inp = $("#name"); inp.value = label(m); inp.dispatchEvent(new Event("input")); snd("click", 0.4);
    $$(".dn-dos").forEach((x) => x.classList.toggle("on", x === d));
  });
  $$(".dn-dos")[0].classList.add("on");

  /* ---- тетрадь в руке ---- */
  let note = ZM.store.get("p19.note", { mat: "obsidian", max: 10, dmg: 0, kills: 0 }), req = ZM.store.get("p19.req", null), tab = "n", broken = false;
  let mask = ZM.store.get("p19.mask", 0);
  const saveNote = () => ZM.store.set("p19.note", note);
  function setNote(n) { note = n; broken = false; saveNote(); renderItem(); }
  const TIMES = [10, 30, 40, 60], METHODS = ["Казнь", "Наковальня", "Лава", "Падение", "Молния", "Взрыв"], MICON = ["wither_head", "anvil", "lava_bucket", "feather", null, "tnt"];
  let selTime = 40, selMethod = 0;
  $("#times").innerHTML = TIMES.map((t) => `<button type="button" data-t="${t}" class="${t === 40 ? "on" : ""}">${t} сек</button>`).join("");
  $("#methods").innerHTML = METHODS.map((m, i) => `<button type="button" data-m="${i}" class="${i ? "" : "on"}">${m}</button>`).join("");
  $("#times").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; selTime = +b.dataset.t; $$("#times button").forEach((x) => x.classList.toggle("on", x === b)); snd("click", 0.4); });
  $("#methods").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; selMethod = +b.dataset.m; $$("#methods button").forEach((x) => x.classList.toggle("on", x === b)); snd("click", 0.4); });
  const bolt = `<svg viewBox="0 0 16 16"><path d="M9 1 3 9h4l-1 6 6-8H8z" fill="#fff38a" stroke="#6b5a00" stroke-width=".8"/></svg>`;
  function renderMask() { $("#mask").innerHTML = METHODS.map((m, i) => `<span class="${mask & (1 << i) ? "on" : ""}" data-tip="${m}" data-tip-sub="${mask & (1 << i) ? "уже было" : "ещё не пробовал"}">${MICON[i] ? `<img src="${T("i/" + MICON[i])}" alt="">` : bolt}</span>`).join("") + `<em>${[...Array(6)].filter((_, i) => mask & (1 << i)).length}/6</em>`; }
  function renderItem() {
    const r = tab === "r", n = r ? req : note;
    $("#itemImg").src = T("i/" + (r ? "death_note_requiem" : "death_note"));
    $("#item").classList.toggle("foil", r); $("#note").classList.toggle("req", r);
    $("#itemName").textContent = r ? "Тетрадь смерти Реквием" : "Тетрадь смерти";
    $("#sheetH").textContent = r ? "DEATH NOTE: REQUIEM" : "DEATH NOTE";
    $("#reqOpts").hidden = !r;
    if (!n) { $("#itemSub").textContent = r ? "ещё не скрафчена" : "сломана или ушла в Реквием"; $("#kills").textContent = ""; $("#durBar").style.width = "0"; $("#item").classList.add("empty"); }
    else {
      const max = r ? 25 : n.max, left = max - n.dmg; $("#item").classList.remove("empty");
      $("#itemSub").textContent = `прочность ${left}/${max}` + (r ? "" : ` · ${MAT[n.mat] ? MAT[n.mat].n.toLowerCase() : ""}`);
      $("#kills").textContent = r ? "" : `Убийств: ${n.kills}`;
      const f = left / max; $("#durBar").style.width = f * 100 + "%"; $("#durBar").style.background = `hsl(${Math.round(f * 120)},100%,50%)`;
    }
    $("#tabR").classList.toggle("lock", !req && !ZM.store.get("p19.hadReq", false));
    const lk = $("#reqLock"); lk.textContent = note && note.kills >= 5 ? "На тетради пять убийств — забирай Реквием." : `Сейчас на тетради ${note ? note.kills : 0} из 5 убийств.`; lk.classList.toggle("ok", !!(note && note.kills >= 5));
  }
  function selectTab(t) {
    tab = t; $$(".dn-note-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.n === t));
    if (t === "r" && req) ZM.store.set("p19.hadReq", true);
    renderItem();
  }
  $$(".dn-note-tabs button").forEach((b) => b.addEventListener("click", () => { if (b.dataset.n === "r" && !req && !ZM.store.get("p19.hadReq", false)) { K.say("Реквием сначала надо скрафтить: пять убийств одной тетрадью.", true); return; } flip(); selectTab(b.dataset.n); }));
  $("#newNote").addEventListener("click", () => {
    if (tab === "r") { if (!ZM.store.get("p19.hadReq", false)) return; req = { dmg: 0 }; ZM.store.set("p19.req", req); }
    else setNote({ mat: note ? note.mat : "obsidian", max: note ? note.max : 10, dmg: 0, kills: 0 });
    snd("pop", 0.5); renderItem(); K.say("Новая тетрадь в руке.");
  });
  $("#name").addEventListener("input", () => { $("#name").classList.toggle("has", !!$("#name").value.trim()); });
  $("#name").addEventListener("keydown", (e) => { if (e.key === "Enter") write(); });

  /* ---- музыка: death_note_ost.ogg, 40 секунд, стоп в момент казни ---- */
  let ost = null;
  const music = (on) => { if (ost) { ost.pause(); ost = null; } if (on && ZM.sfx.on()) { ost = new Audio(U("assets/sounds/p19/ost.ogg")); ost.volume = 0.45; ost.play().catch(() => {}); } };

  /* ---- запись ---- */
  let active = null; // { target, method, at, dur, requiem }
  function write() {
    const name = $("#name").value.trim(); if (!name) { $("#name").focus(); return; }
    const r = tab === "r", n = r ? req : note;
    if (!n) { K.say(r ? "Реквиема нет в руке." : "Тетради нет: скрафти новую или нажми «Новая».", true); return; }
    if (active) { K.chat("#log", "§cТетрадь уже активна, дождись исполнения казни."); snd("click", 0.4, 0.6); return; }
    if (dead) return;
    flip();
    const tg = resolve(name);
    if (!tg) { K.chat("#log", "§cЦель не найдена: " + name); return; }
    names.push(name); ZM.store.set("p19.names", names.slice(-30)); heroNames();
    $("#written").innerHTML = `<span>${esc(name)}</span><small>${r ? `${METHODS[selMethod].toLowerCase()} · ${selTime} сек` : "остановка сердца · 40 сек"}</small>`;
    $("#written").classList.remove("in"); void $("#written").offsetWidth; $("#written").classList.add("in");
    // stack.hurtAndBreak(1): на последней единице предмет исчезает раньше, чем на него ляжет таймер
    n.dmg++; const max = r ? 25 : n.max;
    if (n.dmg >= max) {
      snd("break", 0.8);
      if (r) { req = null; ZM.store.set("p19.req", null); } else { note = null; saveNote(); }
      renderItem(); music(true);
      K.chat("#log", "§7Тетрадь рассыпалась прямо в руках. Запись не исполнится, а музыка доиграет до конца.");
      return;
    }
    r ? ZM.store.set("p19.req", req) : saveNote(); renderItem();
    if (!tg.self) { cur = tg; resetMob(); $$(".dn-dos").forEach((x) => x.classList.toggle("on", x.dataset.k === tg.key)); }
    const dur = (r ? selTime : 40) * 1000;
    active = { target: tg, method: r ? selMethod : 0, at: performance.now() + dur, dur, requiem: r };
    music(true);
    $("#timer").hidden = false; $("#skip").hidden = false; $("#tWho").textContent = label(tg);
    K.chat("#log", tg.self ? "§4Ты записал собственное имя." : `§7${label(tg)} подсвечен. Осталось ${dur / 1000} с.`);
  }
  $("#write").addEventListener("click", write);
  $("#skip").addEventListener("click", () => { if (active) active.at = performance.now(); });

  function execute() {
    const a = active; active = null; music(false);
    $("#timer").hidden = true; $("#skip").hidden = true;
    const m = a.method;
    mask |= 1 << m; ZM.store.set("p19.mask", mask); renderMask();
    if (!a.requiem && note) { note.kills++; saveNote(); renderItem(); if (note.kills >= 5) adv && adv.grant("five_kills"); }
    if (mask === 63) adv && adv.grant("all_kill_methods");
    if (a.target.self) { selfDeath(m); return; }
    play(m, a.target);
  }
  function selfDeath(m) {
    const WHY = [`${me()} умер`, `${me()} был раздавлен падающей наковальней`, `${me()} решил поплавать в лаве`, `${me()} разбился в лепёшку`, `${me()} был поражён молнией`, `${me()} взорвался`];
    snd(["hit", "anvil", "lava", "fallbig", "thunder", "explode"][m], 0.8);
    dead = true; $("#deadWhy").textContent = WHY[m]; $("#dead").hidden = false;
  }
  let dead = false;
  $("#respawn").addEventListener("click", () => { dead = false; $("#dead").hidden = true; snd("pop", 0.5); });

  /* ================= сцена ================= */
  const cv = $("#cv"), cx = cv.getContext("2d"), view = $("#view");
  const IMG = {}; ["zombie", "steve", "creeper", "creeper_armor", "skeleton", "pig", "cow", "wither", "anvil", "lava", "fire", "grass_top", "grass_side", "dirt", "stone", "explosion"].forEach((n) => { const i = new Image(); i.src = T("v/" + n); IMG[n] = i; });
  // передние грани частей: [sx, sy, sw, sh, dx, dy] в пикселях модели; box — ширина и высота силуэта
  const HUM = (tex, arms, legacy) => ({ tex, w: 16, h: 32, parts: [[4, 20, 4, 12, 4, 20], legacy ? [4, 20, 4, 12, 8, 20] : [20, 52, 4, 12, 8, 20], [20, 20, 8, 12, 4, 8], ...(arms || [[44, 20, 4, 12, 0, 8], [36, 52, 4, 12, 12, 8]]), [8, 8, 8, 8, 4, 0]] });
  const SPR = {
    zombie: HUM("zombie", [[48, 16, 4, 4, 0, 8], [48, 16, 4, 4, 12, 8]], true),
    steve: (() => { const s = HUM("steve"); s.parts.push([40, 8, 8, 8, 4, 0]); return s; })(),
    skeleton: { tex: "skeleton", w: 16, h: 32, parts: [[2, 18, 2, 12, 5, 20], [2, 18, 2, 12, 9, 20], [20, 20, 8, 12, 4, 8], [42, 18, 2, 12, 2, 8], [42, 18, 2, 12, 12, 8], [8, 8, 8, 8, 4, 0]] },
    creeper: { tex: "creeper", w: 8, h: 26, parts: [[4, 20, 4, 6, 0, 20], [4, 20, 4, 6, 4, 20], [20, 20, 8, 12, 0, 8], [8, 8, 8, 8, 0, 0]] },
    pig: { tex: "pig", w: 10, h: 16, parts: [[4, 20, 4, 6, 0, 10], [4, 20, 4, 6, 6, 10], [36, 8, 10, 8, 0, 2], [8, 8, 8, 8, 1, 0], [17, 17, 4, 3, 3, 4]] },
    cow: { tex: "cow", w: 12, h: 25, parts: [[4, 20, 4, 12, 0, 13], [4, 20, 4, 12, 8, 13], [28, 4, 12, 10, 0, 3], [23, 1, 1, 3, 1, 0], [23, 1, 1, 3, 10, 0], [6, 6, 8, 8, 2, 1]] },
    wither: { tex: "wither", w: 20, h: 27, parts: [[15, 25, 3, 6, 8.5, 21], [3, 25, 3, 10, 8.5, 11], [26, 24, 11, 2, 4.5, 13], [26, 24, 11, 2, 4.5, 15.5], [26, 24, 11, 2, 4.5, 18], [3, 19, 20, 3, 0, 8], [8, 8, 8, 8, 6, 0], [38, 6, 6, 6, 0, 3], [38, 6, 6, 6, 14, 3]] },
  };
  SPR.lawliet = SPR.steve;
  const cache = {};
  function sprite(key, variant) {
    const id = key + ":" + variant; if (cache[id]) return cache[id];
    const s = SPR[key], img = IMG[s.tex]; if (!img.complete || !img.naturalWidth) return null;
    const sc = img.naturalWidth / 64, c = document.createElement("canvas"); c.width = s.w; c.height = s.h; const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    for (const [sx, sy, sw, sh, dx, dy] of s.parts) g.drawImage(img, sx * sc, sy * sc, sw * sc, sh * sc, dx, dy, sw, sh);
    if (variant === "red") { g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(255,0,0,.5)"; g.fillRect(0, 0, s.w, s.h); }
    if (variant === "glow") { g.globalCompositeOperation = "source-in"; g.fillStyle = "#fff"; g.fillRect(0, 0, s.w, s.h); }
    return (cache[id] = c);
  }
  let W = 0, H = 0, P = 1, GY = 0, BS = 1;
  function size() {
    const d = Math.min(2, devicePixelRatio || 1); W = view.clientWidth; H = Math.round(W < 640 ? W * 0.78 : Math.min(W * 0.6, 470));
    cv.width = W * d; cv.height = H * d; cv.style.height = H + "px"; cx.setTransform(d, 0, 0, d, 0, 0);
    P = H / 84; BS = P * 16; GY = Math.round(H - BS * 1.3);
  }
  size(); new ResizeObserver(() => { if (Math.abs(view.clientWidth - W) > 1) size(); }).observe(view);

  const TICK = 50; let acc = 0, lastT = performance.now(), tick = 0;
  let mob = null, fx = null, parts = [], crater = 0, lavaLeft = false, stars = [...Array(60)].map(() => [Math.random(), Math.random() * 0.55, Math.random()]);
  function resetMob() { mob = { key: cur.key, alive: true, hurt: 0, death: -1, dy: 0, gone: false, charged: false, burn: 0, hp: cur.hp, respawn: 0 }; fx = null; crater = 0; lavaLeft = false; parts = []; }
  resetMob();
  function hurt(dmg, s) { if (!mob.alive) return; mob.hp -= dmg; mob.hurt = 10; if (s) snd(s, 0.6); if (mob.hp <= 0) die(); }
  function die() { if (!mob.alive) return; mob.alive = false; mob.death = 0; const d = MOBS.find((m) => m.key === mob.key); d && snd(d.snd, 0.7); }
  function poof() { for (let i = 0; i < 18; i++) parts.push({ x: W / 2 + rnd(-1, 1) * 8 * P, y: GY - rnd(0, SPR[mob.key].h) * P, vx: rnd(-1, 1) * P * 0.4, vy: -rnd(0.2, 1) * P * 0.5, l: 20 + Math.random() * 10, c: `hsl(0,0%,${rnd(70, 95)}%)`, s: P * rnd(1.2, 2.4) }); }

  /* 20 TPS: способы казни. demo = только показать, без счёта */
  function play(m, target, demo) {
    if (target && target.key !== cur.key) { cur = target; }
    resetMob(); fx = { m, t: 0, demo };
    if (m === 0) { die(); }
    if (m === 1) { fx.anvils = [[0, 28], [0, 31], [0, 34], [1, 34], [-1, 34]].map(([dx, y]) => ({ dx, y, vy: -0.25, landed: false })); }
    if (m === 2) { snd("lava", 0.7); lavaLeft = true; mob.burn = 240; }
    if (m === 3) { mob.dy = 67; fx.vy = 0; snd("pop", 0.4, 0.6); }
    if (m === 4) { fx.bolt = 0; snd("thunder", 0.8); if (mob.key === "creeper") { mob.charged = true; snd("fuse", 0.5); } else { die(); } }
    if (m === 5) { snd("explode", 0.9); crater = 1; for (let i = 0; i < 30; i++) parts.push({ x: W / 2 + rnd(-3, 3) * BS * 0.5, y: GY - rnd(0, 2) * BS, vx: 0, vy: -P * 0.05, l: 12 + Math.random() * 12, ex: true, s: BS * rnd(0.6, 1.4) }); die(); }
  }
  function step() {
    tick++;
    if (mob.hurt > 0) mob.hurt--;
    if (fx) {
      fx.t++;
      if (fx.m === 1) for (const a of fx.anvils) if (!a.landed) {
        a.vy = (a.vy - 0.04) * 0.98; a.y += a.vy;                                 // FallingBlockEntity: гравитация 0.04, воздух 0.98
        const floor = a.dx === 0 ? fx.anvils.filter((b) => b.landed && b.dx === 0).length : 0;
        if (a.dx === 0 && mob.alive && a.y <= SPR[mob.key].h / 16) hurt(200);          // падающий блок бьёт всех, через кого проходит
        if (a.y <= floor) { a.y = floor; a.landed = true; snd("anvil", 0.55, rnd(0.9, 1.1)); }
      }
      if (fx.m === 3 && mob.dy > 0) {
        if (fx.t > 6) { fx.vy = (fx.vy - 0.08) * 0.98; mob.dy = Math.max(0, mob.dy + fx.vy); if (mob.dy === 0) { snd("fallbig", 0.8); hurt(64); } }
      }
      if (fx.m === 4 && fx.bolt !== undefined) fx.bolt++;
    }
    if (mob.burn > 0 && mob.alive) { mob.burn--; if (mob.burn % 10 === 0) hurt(4, "hit"); if (tick % 12 === 0) snd("fire", 0.25); }
    if (lavaLeft && tick % 30 === 0 && Math.random() < 0.4) snd("lavapop", 0.3);
    if (mob.death >= 0 && !mob.gone) { mob.death++; if (mob.death === 20) { mob.gone = true; poof(); mob.respawn = 60; } }
    if (mob.gone && mob.respawn > 0 && --mob.respawn === 0 && !active) { resetMob(); }
    parts = parts.filter((p) => --p.l > 0); for (const p of parts) { p.x += p.vx; p.y += p.vy; }
  }

  function tile(img, x, y, s, frame = 0) { if (img.complete && img.naturalWidth) cx.drawImage(img, 0, frame * img.naturalWidth, img.naturalWidth, img.naturalWidth, x, y, s, s); }
  function drawAnvil(x, y, s) { // силуэт наковальни спереди, закрашенный текстурой
    const u = s / 16, img = IMG.anvil; if (!img.complete) return;
    cx.drawImage(img, 0, 0, 16, 6, x, y, 16 * u, 6 * u); cx.drawImage(img, 4, 6, 8, 5, x + 4 * u, y + 6 * u, 8 * u, 5 * u); cx.drawImage(img, 2, 11, 12, 5, x + 2 * u, y + 11 * u, 12 * u, 5 * u);
  }
  function draw(t) {
    cx.imageSmoothingEnabled = false;
    const sky = cx.createLinearGradient(0, 0, 0, GY); sky.addColorStop(0, "#030307"); sky.addColorStop(1, "#15131f"); cx.fillStyle = sky; cx.fillRect(0, 0, W, H);
    for (const [x, y, k] of stars) { cx.fillStyle = `rgba(255,255,255,${0.25 + 0.5 * Math.abs(Math.sin(t / 1400 + k * 9))})`; cx.fillRect(Math.round(x * W), Math.round(y * H), 2, 2); }
    cx.fillStyle = "#e9e6d6"; cx.fillRect(W * 0.8, H * 0.1, BS * 0.55, BS * 0.55); cx.fillStyle = "rgba(0,0,0,.12)"; cx.fillRect(W * 0.8 + BS * 0.1, H * 0.1 + BS * 0.12, BS * 0.15, BS * 0.12);
    // вспышка молнии
    if (fx && fx.m === 4 && fx.bolt < 8) { cx.fillStyle = `rgba(200,210,255,${0.35 * (1 - fx.bolt / 8)})`; cx.fillRect(0, 0, W, H); }
    // земля
    const cols = Math.ceil(W / BS) + 1, c0 = W / 2 - BS / 2 - Math.ceil(cols / 2) * BS;
    for (let i = 0; i <= cols; i++) {
      const x = c0 + i * BS, mid = Math.abs(x + BS / 2 - W / 2) < BS * 1.6;
      if (crater && mid) { tile(IMG.stone, x, GY + BS * 0.5, BS); cx.fillStyle = "rgba(0,0,0,.55)"; cx.fillRect(x, GY + BS * 0.5, BS, BS); continue; }
      tile(IMG.grass_side, x, GY, BS); tile(IMG.dirt, x, GY + BS, BS);
      cx.fillStyle = "rgba(20,30,60,.35)"; cx.fillRect(x, GY, BS, BS * 2);
    }
    const s = SPR[mob.key], mx = W / 2, feet = GY - (crater ? -BS * 0.5 : 0) - mob.dy * BS;
    // моб
    if (!mob.gone && s) {
      const w = s.w * P, h = s.h * P, glow = active && active.target.key === mob.key;
      const rot = mob.death >= 0 ? Math.min(1, Math.sqrt(mob.death / 20 * 1.6)) * Math.PI / 2 : 0;
      cx.save(); cx.translate(mx, feet); cx.rotate(rot);
      if (glow) { const g = sprite(mob.key, "glow"); if (g) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) cx.drawImage(g, -w / 2 + ox * P * 0.6, -h + oy * P * 0.6, w, h); }
      const img = sprite(mob.key, mob.hurt > 0 || mob.death >= 0 ? "red" : "base"); if (img) cx.drawImage(img, -w / 2, -h, w, h);
      if (mob.charged && IMG.creeper_armor.complete) { cx.globalAlpha = 0.55 + 0.25 * Math.sin(t / 120); cx.globalCompositeOperation = "lighter"; const o = (t / 40) % 64; cx.drawImage(IMG.creeper_armor, o, 0, 32, 32, -w / 2 - P, -h - P, w + 2 * P, h + 2 * P); cx.globalCompositeOperation = "source-over"; cx.globalAlpha = 1; }
      if (mob.burn > 0 && mob.alive || (fx && fx.m === 2 && mob.death >= 0 && mob.death < 20)) { const fr = Math.floor(t / 50) % 32; cx.globalAlpha = 0.9; tile(IMG.fire, -w / 2 - P * 2, -h * 0.9, Math.max(w, h * 0.6) + P * 4, fr); cx.globalAlpha = 1; }
      cx.restore();
      if (mob.dy > 3 && fx && fx.m === 3) { /* падает из-за кадра */ }
    }
    // падение: указатель высоты
    if (fx && fx.m === 3 && mob.dy > 0) {
      cx.fillStyle = "#fff"; cx.font = `400 ${Math.round(P * 4)}px "Tiny5", monospace`; cx.textAlign = "center";
      cx.fillText(`↑ ${Math.round(mob.dy)} бл.`, mx, P * 7); cx.fillStyle = "rgba(255,255,255,.4)"; cx.fillRect(mx - 1, P * 7, 2, Math.max(0, feet - P * 7 - SPR[mob.key].h * P));
    }
    // лава 3×3×3 (спереди видно 3×3)
    if (lavaLeft) { const fr = Math.floor(t / 100) % 20; cx.globalAlpha = fx && fx.m === 2 && fx.t < 10 ? fx.t / 10 : 0.86; for (let i = -1; i <= 1; i++) for (let j = 0; j < 3; j++) tile(IMG.lava, mx - BS / 2 + i * BS, GY - (j + 1) * BS + BS, BS, fr); cx.globalAlpha = 1; }
    // наковальни
    if (fx && fx.m === 1) for (const a of fx.anvils) { const y = GY - a.y * BS - BS; if (y > -BS) drawAnvil(mx - BS / 2 + a.dx * BS, y, BS); }
    if (fx && fx.m === 1) { const top = fx.anvils.filter((a) => !a.landed).reduce((m, a) => Math.min(m, a.y), 99); if (top < 99 && GY - top * BS - BS < -BS) { cx.fillStyle = "#fff"; cx.font = `400 ${Math.round(P * 4)}px "Tiny5", monospace`; cx.textAlign = "center"; cx.fillText(`↓ наковальни: ${Math.round(top)} бл.`, mx, P * 7); } }
    // молния
    if (fx && fx.m === 4 && fx.bolt < 10) {
      cx.save(); cx.strokeStyle = "rgba(220,230,255,.95)"; cx.shadowColor = "#8fa8ff"; cx.shadowBlur = 18; cx.lineWidth = P * 1.2;
      let x = mx + rnd(-1, 1) * P * 4, y = 0; cx.beginPath(); cx.moveTo(x, y);
      while (y < feet - SPR[mob.key].h * P * 0.3) { y += P * rnd(3, 7); x += rnd(-1, 1) * P * 4; cx.lineTo(x, y); }
      cx.stroke(); cx.restore();
    }
    // частицы
    for (const p of parts) {
      if (p.ex) { const fr = Math.min(15, Math.floor((24 - p.l) / 1.5)); cx.globalAlpha = Math.min(1, p.l / 8); cx.fillStyle = `hsl(0,0%,${50 + p.l * 2}%)`; cx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); cx.globalAlpha = 1; }
      else { cx.fillStyle = p.c; cx.fillRect(p.x, p.y, p.s, p.s); }
    }
    if (crater && fx && fx.m === 5 && fx.t < 6) { cx.fillStyle = `rgba(255,255,255,${0.7 * (1 - fx.t / 6)})`; cx.fillRect(0, 0, W, H); }
    // подпись цели
    if (!mob.gone && mob.dy < 3) { cx.font = `400 ${Math.round(Math.max(11, P * 3.4))}px "Tiny5", monospace`; cx.textAlign = "center"; const lb = label(cur); const tw = cx.measureText(lb).width; cx.fillStyle = "rgba(0,0,0,.5)"; const fs = Math.max(11, P * 3.4); cx.fillRect(mx - tw / 2 - 4, feet - s.h * P - fs * 1.9, tw + 8, fs * 1.3); cx.fillStyle = cur.boss ? "#c9a0ff" : "#fff"; cx.fillText(lb, mx, feet - s.h * P - fs * 0.9); }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    acc += Math.min(250, now - lastT); lastT = now;
    while (acc >= TICK) { acc -= TICK; step(); }
    if (active) { const left = Math.max(0, active.at - now); $("#tSec").textContent = Math.ceil(left / 1000); $("#timer").classList.toggle("last", left < 5500); if (left <= 0) execute(); }
    draw(now);
  }
  requestAnimationFrame(frame);

  /* ================= 04 ПРОЧНОСТЬ ================= */
  $("#usesTbl").innerHTML = `<div class="dn-ur h"><span>Материал</span><span>Прочность</span><span>Казней</span><span>Реквием</span></div>` + MATS.map(([id, n, u]) =>
    `<div class="dn-ur${u >= 6 ? " good" : ""}${u ? "" : " bad"}"><span><img src="${T("i/" + id)}" alt="">${esc(n)}</span><span>${u || "—"}</span><span>${u ? (u - 1 || "0 · ломается сразу") : "не крафтится"}</span><span>${u >= 6 ? "✓" : u ? "✕" : ""}</span></div>`).join("");

  /* ================= 05 ШЕСТЬ СМЕРТЕЙ ================= */
  const WAYS = [
    ["Казнь", "wither_head", "Сердце останавливается. Без урона и без шанса: обычный kill(), как по команде. Этот способ стоит в обычной тетради по умолчанию."],
    ["Наковальня", "anvil", "Пять наковален в 28, 31 и 34 блоках над целью, верхний ряд — тройкой. Каждая бьёт по 40 за блок падения, но не больше 200. Остаются лежать горкой."],
    ["Лава", "lava_bucket", "Куб лавы 3×3×3 прямо вокруг цели, не трогает только бедрок. Сверху — поджог на 12 секунд. Лава после казни никуда не денется."],
    ["Падение", "feather", "Цель телепортируется на 67 блоков вверх, скорость и накопленное падение обнуляются. Дальше всё делает гравитация."],
    ["Молния", null, "Настоящая молния плюс урон размером в максимальное здоровье; если цель выжила, здоровье дописывается до нуля. Крипера молния только заряжает, и он остаётся жив."],
    ["Взрыв", "tnt", "Взрыв силой 6 — мощнее ТНТ (4), ломает блоки, без огня. Плюс урон в максимальное здоровье. Держись подальше: взрыву всё равно, кто писал имя."],
  ];
  $("#waysBox").innerHTML = WAYS.map(([t, ic, d], i) => `<article class="dn-way"><div class="dn-way-h"><span class="ic">${ic ? `<img src="${T("i/" + ic)}" alt="">` : bolt}</span><em>${ROM[i]}</em><b>${t}</b></div><p>${d}</p><button type="button" class="dn-b sm" data-m="${i}">показать на сцене</button></article>`).join("");
  $("#waysBox").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-m]"); if (!b) return;
    if (active) { K.say("Сначала дождись казни, которая уже записана.", true); return; }
    $("#view").scrollIntoView({ behavior: motion() ? "smooth" : "instant", block: "center" });
    setTimeout(() => { if (cur.boss || cur.player) { cur = MOBS[0]; } play(+b.dataset.m, cur, true); K.chat("#log", `§7Показ: ${WAYS[+b.dataset.m][0].toLowerCase()} — ${label(cur)}. Без записи и без счёта.`); }, motion() ? 450 : 0);
  });

  /* ================= 06–07 ================= */
  adv = K.adv({ list: ZM.P19.advancements, store: "p19.adv", icon: (a) => T("i/" + a.icon), chatSel: "#log", intro: "Пять скрытых: от первой книги до всех шести смертей." });
  K.timeline($("#tl"), [
    { date: "05.05.2026", t: "Тетрадь смерти", d: "Две тетради: обычная с прочностью от чёрного материала и Реквием с выбором времени и способа казни. Своя музыка на время отсчёта, пять ачивок.", c: "#e6e6e6" },
    { ver: "1.0.3", date: "25.06.2026", t: "Исправление тетради смерти", d: "Тетрадь попала в список исправлений вместе с Супер-ТНТ, Made in Heaven и JBL-колонкой.", c: "#b00020" },
  ]);

  /* ================= кто выживет ================= */
  (function execution() {
    const EX = [
      ["wither_head", "Казнь", "Смерть как от команды /kill. Обычная тетрадь убивает только так.", "Никто. Не спасают броня, тотем бессмертия и даже творческий режим.", "Чисто: ни блоков, ни огня."],
      ["anvil", "Наковальня", "Пять наковален в 28–34 блоках над целью, до 40 урона каждая.", "Цель под крышей: наковальни лягут на крышу.", "Наковальни остаются лежать блоками — можно забрать, некоторые побитые."],
      ["lava_bucket", "Лава", "Куб лавы 3×3×3 вокруг цели и поджог на 12 секунд.", "Огнестойкие: ифриты, магмовые кубы, лавомерки, скелеты-иссушители, игрок с огнестойкостью.", "Все 27 блоков, кроме бедрока, заменяются лавой. Сундук в этой зоне вываливает вещи прямо в неё."],
      ["feather", "Падение", "Телепорт на 67 блоков вверх и падение с нуля. Урон примерно 64.", "Курицы и летающие мобы, игрок с медленным падением, элитрами или жемчугом в руке. Под водой внизу — тоже.", "Если над целью камень, её вставит прямо в него — будет задыхаться в блоке."],
      [null, "Молния", "Настоящая молния и урон в размер всего здоровья цели.", "Крипер: молния его не убивает, а заряжает.", "Молния поджигает траву и дерево вокруг."],
      ["tnt", "Взрыв", "Взрыв силы 6 (ТНТ — 4) и урон в размер всего здоровья.", "Никто, кроме боссов, которых тетрадь не видит.", "Воронка на месте цели. Стоишь рядом — достанется и тебе."],
    ];
    const bolt = `<svg viewBox="0 0 16 16"><path d="M9 1 3 9h4l-1 6 6-8H8z" fill="#fff38a" stroke="#6b5a00" stroke-width=".8"/></svg>`;
    $("#exBox").innerHTML = EX.map(([ic, n, what, live, after], i) => `<article class="pnl"><header><span class="dn-ex-i">${ic ? `<img src="${T("i/" + ic)}" alt="">` : bolt}</span><b>${n}</b><em>${i ? "Реквием" : "обе тетради"}</em></header><p>${esc(what)}</p><dl><dt>Выживет</dt><dd>${esc(live)}</dd><dt>После</dt><dd>${esc(after)}</dd></dl></article>`).join("");

    const F = [
      ["Светится не обязательно тот, кто умрёт", "Подсветку получает моб, найденный в момент записи. Но в срок тетрадь ищет цель по имени заново, и умирает ближайший подходящий на тот момент. Записал «zombie», а рядом подошёл другой — умрёт он."],
      ["Отсчёт идёт только в кармане", "Таймер проверяется, пока тетрадь в твоём инвентаре или во второй руке. Положил в сундук — казнь замерла. Но срок записан по часам мира, так что стоит взять тетрадь обратно, и казнь случится мгновенно."],
      ["Подобрал чужую — казнь твоя", "Если тетрадь с записью перешла к другому игроку, срок исполнит уже он. Ближайшего моба будут искать вокруг него, и убийство засчитается его тетради."],
      ["256 блоков считаются в момент казни", "Мобов ищут вокруг владельца не при записи, а в срок. Убежал за 40 секунд дальше 256 блоков — «Цель не найдена», а единица прочности уже потрачена."],
      ["Другое измерение — половина казни", "Игрока тетрадь найдёт где угодно, но наковальни, лава и взрыв появятся в твоём мире на его координатах. Цель в Незере переживёт наковальни и отделается поджогом от лавы. Казни, молнии и падению измерение не мешает."],
      ["Все шесть способов пишутся игроку", "Прогресс «всех способов» хранится у игрока, а не в тетради. Можно сменить Реквием, и счёт продолжится."],
    ];
    $("#fineBox").innerHTML = F.map(([h, t]) => `<article><b>${esc(h)}</b><p>${esc(t)}</p></article>`).join("");
  })();
  K.finNav(19, $("#finNav"));
  renderMask(); renderItem();
  ZM.reveal && ZM.reveal();
})();
