/* №22 · Дойка быка и разорителя. Логика из кода мода:
   CowMilkingHandler — пустое ведро в ОСНОВНОЙ руке по Cow (включая грибную): пол назначается при первой дойке (Math.random() < 0.5),
     пишется в ForgeData «IsBull»; ведро shrink(1) без проверки креатива, результат Inventory.add (при полном инвентаре пропадает);
     бык → sperm_bucket + ачивка 22_milk/bull_milking, корова → milk_bucket; звук COW_MILK 1.0.
   Разоритель: если ForgeData «Tamed» ещё нет — ставит Tamed, стирает все goal/target, добавляет Float, RandomStroll 0.4, LookAtPlayer 6, RandomLookAround;
     ведро → sperm_bucket, ачивка hero_of_village, звук COW_MILK с питчем 0.8; при загрузке мира ручной восстанавливается.
   BullShearHandler — ножницы по быку с вариантом NORMAL: 50% COPPER (ачивка copper_bull) или BALD + 1–2 кожи; ножницы −1; SHEEP_SHEAR 0.85–1.15.
   BullDropsHandler — лысый: кожа убирается; медный: кожа убирается, +1–3 медной шерсти. Вариант живёт только в synced data (не сохраняется).
   SpermBucketItem — еда 0/0 alwaysEat, 32 тика, POISON 40t + BLINDNESS 40t, через 40 тиков одно из JUMP/DIG_SPEED/MOVEMENT_SPEED/HERO_OF_THE_VILLAGE на 100t; стак 1; остаётся ведро.
   SpanishBoots — ноги, броня 2, прочность 450, зачаровываемость 12, ремонт медным слитком; MULTIPLY_TOTAL +1.0 к скорости, JUMP II (10t, без частиц),
     раз в 200 тиков (tickCount % 200) 1 урона магией + частицы DAMAGE_INDICATOR + PLAYER_HURT 0.5/1.15; FOV фиксируется на 1.0.
   SpanishBootsRepairHandler — наковальня: сапоги + медная шерсть → +25% прочности за 1 шерсть, цена 1 уровень. */
(function () {
  const { $, $$, esc } = ZM, K = ZM.kit, U = ZM.url;
  ZM.topbar({ crumb: "№22 · Дойка", ...ZM.pointNav(22) });
  const T = (p, e = "png") => U(`assets/textures/p22/${p}.${e}`);
  const I = (n) => T("i/" + n);
  const snd = K.sounds("p22");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motion = () => !reduce && !document.documentElement.classList.contains("no-motion");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const GL = window.ZMGeo && (() => { try { return !!document.createElement("canvas").getContext("webgl"); } catch (e) { return false; } })();
  const G = ZM.P22G, TX = ZM.P22TEX;
  let adv = null;
  const grant = (k) => adv && adv.grant(k);
  const visible = (el) => { let v = false; new IntersectionObserver((es) => { v = es[0].isIntersecting; }, { rootMargin: "120px" }).observe(el); return () => v; };

  /* ================= общий инвентарь ================= */
  const NAME = { bucket: "Ведро", milk_bucket: "Ведро молока", sperm_bucket: "Ведро спермы", leather: "Кожа", beef: "Сырая говядина", copper_wool: "Медная шерсть", spanish_boots: "Испанские сапоги", shears: "Ножницы", iron_sword: "Железный меч" };
  const INV = { bucket: 16, milk_bucket: 0, sperm_bucket: 0, leather: 0, beef: 0, copper_wool: 0, spanish_boots: 0 };
  const listeners = [];
  const changed = (fresh) => listeners.forEach((f) => f(fresh));
  const give = (id, n = 1) => { INV[id] = (INV[id] || 0) + n; if (id === "copper_wool" && n > 0) grant("copper_wool"); if (id === "spanish_boots" && n > 0) grant("spanish_boots"); changed(id); };

  /* ================= фон: пятна голштинки ================= */
  (function bg() {
    const cv = $("#bg"), cx = cv.getContext("2d"); let W = 0, H = 0;
    const blobs = Array.from({ length: 9 }, (_, i) => ({ x: Math.random(), y: Math.random(), r: 80 + Math.random() * 160, s: Math.random() * 10, v: 0.004 + Math.random() * 0.006, red: i === 4 }));
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0); };
    size(); addEventListener("resize", size);
    let t = 0;
    (function frame() {
      requestAnimationFrame(frame);
      if (motion()) t += 1 / 60; else if (t) return;
      cx.clearRect(0, 0, W, H);
      const sc = scrollY * 0.00015;
      for (const b of blobs) {
        const X = ((b.x + Math.sin(t * b.v * 6 + b.s) * 0.03) % 1) * W, Y = (((b.y - sc * (1 + b.s / 10)) % 1 + 1) % 1) * (H + 400) - 200;
        cx.beginPath();
        for (let k = 0; k <= 24; k++) {
          const a = (k / 24) * Math.PI * 2, rr = b.r * (1 + 0.18 * Math.sin(a * 3 + b.s + t * 0.3) + 0.1 * Math.sin(a * 5 - b.s * 2 + t * 0.2));
          const px = X + Math.cos(a) * rr * 1.25, py = Y + Math.sin(a) * rr;
          k ? cx.lineTo(px, py) : cx.moveTo(px, py);
        }
        cx.closePath(); cx.fillStyle = b.red ? "rgba(215,50,44,.05)" : "rgba(20,18,16,.055)"; cx.fill();
      }
    })();
  })();
  (function tick() {
    const w = ["ВЕДРО В ОСНОВНУЮ РУКУ", "50 НА 50", "БЫК УЛЫБАЕТСЯ", "ЗАВТРАК ЧЕМПИОНА", "ХРАНИТЕЛЬ СЕМЕНИ", "МЕДНЫЙ БЫК", "ИСПАНСКИЕ САПОГИ", "МОЛОКО ИЛИ НЕ МОЛОКО"];
    const one = w.map((x) => `<span>${x}</span><i>●</i>`).join("");
    $("#tick").innerHTML = one + one;
  })();

  /* ================= 3D: общий цикл ================= */
  const views = [];
  function drag(el, st, onClick) {
    let d = null; st.last = -1e9;
    el.addEventListener("pointerdown", (e) => { d = { x: e.clientX, y: e.clientY, ry: st.ry, rx: st.rx, m: false }; try { el.setPointerCapture(e.pointerId); } catch (_) {} });
    el.addEventListener("pointermove", (e) => { if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.abs(dx) + Math.abs(dy) > 6) d.m = true; if (!d.m) return; st.ry = d.ry + dx * 0.6; st.rx = clamp(d.rx + dy * 0.3, -25, 35); st.last = performance.now(); });
    const up = (e) => { if (d && !d.m && e.type === "pointerup" && onClick) onClick(e); d = null; };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    st.idle = () => !d && performance.now() - st.last > 1800;
    return st;
  }
  function view(cv, key, tex, o = {}) {
    if (!GL) return null;
    const g = ZMGeo.create(cv, { geo: G[key].geo, anim: G[key].anim, tex: TX[tex], idle: o.idle === undefined ? "idle" : o.idle, nearest: true, cam: o.cam });
    const all = Object.keys(g.bones), bb = g.bbox(all), c = bb.c;
    const st = drag(cv, { ry: o.ry || 0, rx: 0 }, o.onClick);
    const v = { g, st, vis: visible(cv), spin: o.spin ?? 14, scale: 1, sm: 1, ry: st.ry, c, bb, hit: 0 };
    v.update = (dt) => {
      if (st.idle() && motion() && v.spin) st.ry += dt * v.spin;
      v.ry += (st.ry - v.ry) * Math.min(1, dt * 10); v.sm += (v.scale - v.sm) * Math.min(1, dt * 8);
      const M = g.M, D = Math.PI / 180;
      let m = M.mul(M.t(c[0], 0, c[2]), M.mul(M.rx(st.rx * D * 0.6), M.mul(M.ry(v.ry * D), M.mul(M.s(v.sm), M.t(-c[0], 0, -c[2])))));
      if (v.hit > 0) { v.hit -= dt; m = M.mul(M.t(Math.sin(v.hit * 60) * 0.6, 0, 0), m); }
      g.setExtra(m); g.tick(dt); g.render();
      if (o.ground) { // трава ровно под копытами: проецируем углы «пятна» на земле
        let y = 0; for (const p of o.gp || [[-6, 0, -9], [6, 0, -9], [-6, 0, 9], [6, 0, 9]]) y = Math.max(y, g.project(o.gb || "leg_rf", p)[1]);
        o.ground.style.top = Math.round(y - (o.sink ?? 10)) + "px";
      }
    };
    views.push(v);
    return v;
  }
  let last = performance.now();
  (function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    for (const v of views) if (v.vis()) v.update(dt);
  })(last);
  const flash = (v) => { if (v) v.hit = 0.25; };

  function pop(box, html, x = 50, y = 45) {
    const p = document.createElement("div"); p.className = "mk-pop"; p.innerHTML = html;
    p.style.left = x + "%"; p.style.top = y + "%"; box.appendChild(p); setTimeout(() => p.remove(), 1700);
  }
  function drops(box, x = 50, y = 58) {
    if (!motion()) return;
    for (let i = 0; i < 6; i++) { const d = document.createElement("i"); d.className = "mk-drop"; d.style.left = `calc(${x}% + ${(Math.random() - 0.5) * 60}px)`; d.style.top = `calc(${y}% + ${Math.random() * 20}px)`; d.style.animationDelay = i * 0.07 + "s"; box.appendChild(d); setTimeout(() => d.remove(), 1400); }
  }
  const TEXOF = (c) => (c.bull !== true ? "cow" : c.variant === 1 ? "cow_bull_bald" : c.variant === 2 ? "cow_bull_copper" : "cow_bull");
  const COWCAM = { yaw: 205, pitch: 14, dist: 74, target: [0, 9, 0], fov: 38 };

  /* ================= общая логика дойки ================= */
  const herd = { cow: 0, bull: 0 };
  function milkCow(c, opt = {}) {
    if (INV.bucket <= 0) { K.say("Пустых вёдер нет. Добавь в инвентаре справа.", true); return null; }
    let rolled = false;
    if (c.bull === null) { c.bull = Math.random() < 0.5; rolled = true; herd[c.bull ? "bull" : "cow"]++; }
    INV.bucket--;
    const out = c.bull ? "sperm_bucket" : "milk_bucket";
    snd("milk", 0.6, 1);
    if (opt.full) { changed(); return { out, lost: true, rolled }; }
    give(out, 1);
    if (c.bull) grant("bull_milking");
    return { out, lost: false, rolled };
  }

  /* ================= HERO ================= */
  (function hero() {
    const cv = $("#hero3d"), who = $("#heroWho"), pops = $("#heroPops");
    const cow = { bull: null, variant: 0 };
    cv.classList.add("bucket");
    const paint = () => {
      who.className = "mk-who" + (cow.bull === true ? " bull" : cow.bull === false ? " cow" : "");
      who.innerHTML = cow.bull === null ? "<b>?</b><span>пол не известен</span>" : cow.bull ? "<b>♂</b><span>бык</span>" : "<b>♀</b><span>корова</span>";
      v && v.g.setTex(TX[TEXOF(cow)]);
    };
    const v = view(cv, "cow", "cow", { cam: Object.assign({}, COWCAM, { dist: 78, target: [0, 9, 0] }), ground: $("#heroStage .mk-grass"), ry: -20, spin: 10, onClick: () => {
      if (INV.bucket <= 0) give("bucket", 16);
      const r = milkCow(cow); if (!r) return;
      pop(pops, `<img src="${I(r.out)}" alt="">${NAME[r.out]}`, 50, 40); drops(pops);
      if (r.rolled && cow.bull) { snd("moo2", 0.4, 0.8); setTimeout(() => K.say("Это бык. Ведро спермы в инвентаре, ачивка тоже."), 250); }
      paint();
    } });
    if (!v) cv.outerHTML = `<img class="mk-model" src="${I("milk_bucket")}" alt="">`;
    $("#heroNext").addEventListener("click", () => { cow.bull = null; cow.variant = 0; paint(); snd(["moo", "moo2", "moo3"][ri(0, 2)], 0.35, 0.9 + Math.random() * 0.2); });
    paint();
  })();

  /* ================= 01 ВЫГОН ================= */
  (function farm() {
    const cv = $("#pen3d"), pops = $("#penPops");
    const S = { cow: { bull: null, variant: 0, alive: true }, tool: "bucket", baby: false, full: false, creative: false, shears: 238 };
    const chat = (t) => K.chat("#log", t, 5);
    const v = view(cv, "cow", "cow", { cam: COWCAM, ground: $("#penView .mk-grass"), ry: -25, spin: 0, idle: "idle", onClick: () => use() });
    if (!v) $("#penView").insertAdjacentHTML("beforeend", `<p class="mk-small" style="position:absolute;inset:auto 12px 12px">WebGL недоступен: модель не показывается, но инструменты работают. Кликни по полю.</p>`), cv.addEventListener("click", () => use());
    const TOOLS = [["bucket", "Ведро"], ["shears", "Ножницы"], ["iron_sword", "Железный меч"]];
    const hot = $("#hot");
    function renderHot() {
      hot.innerHTML = TOOLS.map(([id, n]) => `<button type="button" data-t="${id}" class="${S.tool === id ? "on" : ""}" aria-label="${n}" title="${n}"><img src="${I(id)}" alt="">${id === "bucket" ? `<b>${INV.bucket}</b>` : ""}${id === "shears" && S.shears < 238 ? `<span class="du"><i style="width:${(S.shears / 238) * 100}%;background:hsl(${(S.shears / 238) * 120},100%,50%)"></i></span>` : ""}</button>`).join("");
    }
    hot.addEventListener("click", (e) => { const b = e.target.closest("[data-t]"); if (!b) return; S.tool = b.dataset.t; snd("click", 0.4); renderHot(); });
    function paint() {
      const c = S.cow;
      $("#penWho").textContent = (S.baby ? "Телёнок" : "Корова") + " · " + (c.bull === null ? "пол не назначен" : c.bull ? "бык" : "корова");
      $("#penVar").textContent = c.bull ? ["вариант: обычный", "вариант: лысый", "вариант: медный"][c.variant] : "";
      if (v) { v.g.setTex(TX[TEXOF(c)]); v.scale = S.baby ? 0.55 : 1; }
      $("#penDead").hidden = c.alive;
    }
    function newCow(msg = true) { S.cow = { bull: null, variant: 0, alive: true }; paint(); if (msg) snd(["moo", "moo2", "moo3"][ri(0, 2)], 0.35, 0.9 + Math.random() * 0.2); }
    function use() {
      const c = S.cow;
      if (!c.alive) { K.say("Здесь только что была корова. Нажми «новая корова».", true); return; }
      if (S.tool === "bucket") {
        const r = milkCow(c, { full: S.full }); if (!r) return;
        if (r.lost) chat(`§7Ведро списано, а §f${NAME[r.out]}§7 некуда положить: инвентарь забит, предмет пропал`);
        else { pop(pops, `<img src="${I(r.out)}" alt="">+1`); drops(pops); chat(r.rolled ? `§7Пол назначен: ${c.bull ? "§cбык" : "§fкорова"}§7. В инвентарь: §f${NAME[r.out]}` : `§7Ещё раз: §f${NAME[r.out]}§7, пол уже записан`); }
        if (S.creative) chat("§eКреатив§7: ведро всё равно ушло из руки");
        if (r.rolled && c.bull) snd("moo2", 0.4, 0.8);
        if (S.baby && r.rolled) chat("§7Телёнка подоили: ванильная проверка на детёныша здесь не работает");
      } else if (S.tool === "shears") {
        if (c.bull !== true) { chat(c.bull === null ? "§7Ножницы ничего не делают: пол ещё не назначен, а для мода это пока «не бык»" : "§7Корову ножницами не остричь"); snd("click", 0.3, 0.7); return; }
        if (c.variant !== 0) { chat(`§7Этот бык уже ${c.variant === 1 ? "лысый" : "медный"}, второй раз не стрижётся`); snd("click", 0.3, 0.7); return; }
        if (S.shears <= 0) { K.say("Ножницы сломались", true); return; }
        if (Math.random() < 0.5) { c.variant = 2; chat("§6Медный бык!§7 Кожи не будет, зато при смерти упадёт медная шерсть"); grant("copper_bull"); pop(pops, `<img src="${I("copper_wool")}" alt="">медь`, 50, 40); }
        else { c.variant = 1; const n = ri(1, 2); if (!S.full) give("leather", n); chat(`§7Бык облысел, выпало §f${n} кожи`); pop(pops, `<img src="${I("leather")}" alt="">+${n}`, 50, 40); }
        if (!S.creative) S.shears--;
        snd("shear", 0.6, 0.85 + Math.random() * 0.3);
      } else {
        c.alive = false; flash(v); snd("cowhurt", 0.5, S.baby ? 1.4 : 1); snd("strong", 0.4);
        const got = [];
        if (!S.baby) {
          const beef = ri(1, 3); got.push(["beef", beef]);
          const lea = ri(0, 2); if (lea && !(c.bull && c.variant)) got.push(["leather", lea]);
        }
        if (c.bull && c.variant === 2) got.push(["copper_wool", ri(1, 3)]);
        if (!got.length) chat("§7С телёнка ничего не падает");
        else { got.forEach(([id, n]) => give(id, n)); chat("§7Дроп: " + got.map(([id, n]) => `§f${NAME[id]} ×${n}`).join("§7, ")); pop(pops, got.map(([id, n]) => `<img src="${I(id)}" alt="">${n}`).join(" "), 50, 50); }
        if (S.baby && c.bull && c.variant === 2) chat("§6Медный телёнок§7: ванильного лута нет, а шерсть мод всё равно добавил");
        paint(); setTimeout(() => { if (!S.cow.alive) newCow(); }, 1800);
      }
      paint(); renderHot();
    }
    $("#penNew").addEventListener("click", () => newCow());
    const tog = (id, key, cb) => $(id).addEventListener("click", (e) => { S[key] = !S[key]; e.currentTarget.setAttribute("aria-pressed", S[key]); snd("click", 0.4); cb && cb(); });
    tog("#penBaby", "baby", () => { newCow(false); });
    tog("#penFull", "full", () => chat(S.full ? "§7Инвентарь забит: всё, что выдаст корова, пропадёт" : "§7Место в инвентаре есть"));
    tog("#penCreative", "creative", () => chat(S.creative ? "§eКреатив§7: ножницы не тупятся, но ведро всё равно тратится" : "§7Выживание"));
    $("#penRe").addEventListener("click", () => {
      const c = S.cow; snd("click", 0.5);
      if (c.bull && c.variant) { c.variant = 0; chat("§7Мир перезагружен. Пол сохранился, а вариант нет: бык снова §fобычный§7 и его можно стричь заново"); }
      else chat(c.bull === null ? "§7Мир перезагружен. Пола всё ещё нет" : "§7Мир перезагружен. Пол сохранён в данных коровы");
      paint();
    });
    $("#invRefill").addEventListener("click", () => { give("bucket", 16); snd("pop", 0.4); });
    // инвентарь
    function renderInv(fresh) {
      const ids = ["bucket", "milk_bucket", "sperm_bucket", "leather", "beef", "copper_wool", "spanish_boots"].filter((id) => INV[id] > 0);
      const cells = ids.slice(0, 12).map((id) => `<span class="${fresh === id ? "new" : ""}" data-tip="${esc(NAME[id])}"><img src="${I(id)}" alt="${esc(NAME[id])}">${INV[id] > 1 ? `<b>${INV[id]}</b>` : ""}</span>`);
      while (cells.length < 12) cells.push("<span></span>");
      $("#inv").innerHTML = cells.join("");
      const n = herd.cow + herd.bull;
      $("#nCow").textContent = herd.cow; $("#nBull").textContent = herd.bull;
      $("#rCow").style.width = (n ? (herd.cow / n) * 100 : 50) + "%"; $("#rBull").style.width = (n ? (herd.bull / n) * 100 : 50) + "%";
      if (n >= 6) $("#ratioNote").textContent = `Из ${n} назначенных ${Math.round((herd.bull / n) * 100)}% оказались быками. В коде ровно Math.random() < 0.5 на каждую корову.`;
      renderHot();
    }
    listeners.push(renderInv); renderInv(); paint();
    chat("§7Выбери инструмент в хотбаре и кликни по корове");
    K.dl($("#farmDl"), [
      ["Рука", "только основная: ведро в левой руке не сработает"],
      ["Пол", "при первой дойке, 50/50, навсегда (ForgeData)"],
      ["Корова даёт", `<img class="px" src="${I("milk_bucket")}" width="18" alt=""> ведро молока, как в ванили`],
      ["Бык даёт", `<img class="px" src="${I("sperm_bucket")}" width="18" alt=""> ведро спермы`],
      ["Сколько раз", "без ограничений, пока есть вёдра"],
      ["Звук", "ванильная дойка коровы"],
    ]);
  })();

  /* ================= 02 ТРИ БЫКА ================= */
  (function bulls() {
    const L = [
      { t: "cow", n: "Корова", how: "пол «корова» или ещё не назначен", d: "Ванильная текстура. Даёт молоко, ножницами не стрижётся.", dr: [["beef", "1–3"], ["leather", "0–2"]] },
      { t: "cow_bull", n: "Бык", how: "первая дойка, 50%", d: "Рога, улыбка и красная кнопка на вымени. Даёт сперму, стрижётся один раз.", dr: [["beef", "1–3"], ["leather", "0–2"]] },
      { t: "cow_bull_bald", n: "Лысый бык", how: "ножницы, 50%", d: "Голая розовая шкура и ошалевший взгляд. При стрижке роняет 1–2 кожи, после смерти кожи уже нет.", dr: [["beef", "1–3"], ["leather", "—", 1]] },
      { t: "cow_bull_copper", n: "Медный бык", how: "ножницы, 50%", d: "Клёпаная медь с патиной. Кожи не даёт вовсе, зато после смерти роняет медную шерсть.", dr: [["beef", "1–3"], ["leather", "—", 1], ["copper_wool", "1–3"]] },
    ];
    $("#bullsBox").innerHTML = L.map((b, i) => `<article class="mk-bull"><div class="v"><div class="mk-grass"></div><canvas id="bull${i}" aria-label="${esc(b.n)}"></canvas></div><div class="b"><span class="how">${esc(b.how)}</span><h3>${esc(b.n)}</h3><p>${esc(b.d)}</p><div class="dr">${b.dr.map(([id, n, no]) => `<span class="${no ? "no" : ""}"><img src="${I(id)}" alt="">${esc(NAME[id])} ${esc(n)}</span>`).join("")}</div></div></article>`).join("");
    L.forEach((b, i) => { const cv = $("#bull" + i); const v = view(cv, "cow", b.t, { cam: Object.assign({}, COWCAM, { dist: 68, target: [0, 8, 0] }), ground: cv.parentNode.querySelector(".mk-grass"), ry: -30 + i * 10, spin: 8, onClick: () => snd(["moo", "moo2", "moo3"][i % 3], 0.35, i ? 0.8 : 1.05) }); if (!v) cv.outerHTML = `<img src="${T(b.t)}" alt="" class="px" style="width:100%;height:100%;object-fit:contain">`; });
  })();

  /* ================= 03 РАЗОРИТЕЛЬ ================= */
  (function ravager() {
    const cv = $("#rv3d"), box = $("#rvView"), pops = $("#rvPops");
    const R = { tamed: false };
    const v = view(cv, "rav", "ravager", { cam: { yaw: 215, pitch: 12, dist: 150, target: [0, 17, -4], fov: 38 }, ground: $("#rvView .mk-grass"), gp: [[-12, 0, -12], [12, 0, -12], [-12, 0, 22], [12, 0, 22]], sink: 16, ry: -15, spin: 6 });
    const BEFORE = [["Не тонуть", "FloatGoal · 0"], ["Атака рогами", "RavagerMeleeAttackGoal · 4", "t"], ["Бродить, обходя воду", "скорость 0.4 · 5"], ["Смотреть на игрока", "6 блоков · 6"], ["Смотреть на мобов", "8 блоков · 10"], ["Рейдовые: знамя, путь к рейду, деревня, праздник", "Raider · 1–5"], ["Мстить обидчику и звать своих", "HurtByTarget", "t"], ["Искать игрока", "NearestAttackableTarget", "t"], ["Искать жителей", "AbstractVillager", "t"], ["Искать железного голема", "IronGolem", "t"]];
    const AFTER = [["Не тонуть", "FloatGoal · 0"], ["Бродить", "RandomStroll 0.4 · 1"], ["Смотреть на игрока", "6 блоков · 2"], ["Оглядываться", "RandomLookAround · 3"]];
    function paint() {
      $("#gBefore").innerHTML = BEFORE.map(([a, b, t]) => `<li class="${R.tamed ? "x" : t ? "t" : ""}">${esc(a)}<small>${esc(b)}</small></li>`).join("");
      $("#gAfter").innerHTML = AFTER.map(([a, b]) => `<li class="${R.tamed ? "n" : ""}">${esc(a)}<small>${esc(b)}</small></li>`).join("");
      $("#gAfter").classList.toggle("off", !R.tamed);
      box.classList.toggle("tamed", R.tamed);
      $("#rvName").textContent = R.tamed ? "Разоритель · ручной" : "Разоритель";
      if (v) { v.g.setTex(TX[R.tamed ? "ravager_tamed" : "ravager"]); v.spin = R.tamed ? 10 : 6; }
    }
    let roarT = 0;
    setInterval(() => { if (!R.tamed && v && v.vis() && motion() && performance.now() - roarT > 7000) { roarT = performance.now(); v.g.play("roar"); } }, 2500);
    $("#rvMilk").addEventListener("click", () => {
      if (R.tamed) { K.say("Он уже ручной. Второй раз не доится, ведро осталось пустым.", true); snd("click", 0.4, 0.7); return; }
      R.tamed = true; give("sperm_bucket", 1); grant("hero_of_village");
      snd("milk", 0.6, 0.8); pop(pops, `<img src="${I("sperm_bucket")}" alt="">+1`, 50, 42); drops(pops, 50, 55);
      $("#rvNote").textContent = "Готово. Цели стёрты, текстура сменилась. Флаг Tamed лежит в данных моба, так что после перезахода он останется ручным.";
      paint();
    });
    $("#rvHit").addEventListener("click", () => {
      flash(v); snd("rav_hurt", 0.5); snd("strong", 0.35);
      if (!R.tamed) { setTimeout(() => { v && v.g.play("roar"); snd("rav_roar", 0.5); }, 250); K.say("Ревёт и идёт на тебя: у дикого есть цель «мстить обидчику»"); }
      else K.say("Никакой реакции: целей атаки у него больше нет вообще");
    });
    $("#rvRe").addEventListener("click", () => { snd("click", 0.5); K.say(R.tamed ? "Перезашёл: всё ещё ручной, мод восстанавливает цели при загрузке" : "Перезашёл: дикий, как и был"); });
    $("#rvNew").addEventListener("click", () => { R.tamed = false; snd("rav_idle", 0.5); $("#rvNote").textContent = "Сделать это можно только один раз. Повторный клик по ручному разорителю ничего не даёт, ведро остаётся пустым."; paint(); });
    if (!v) cv.outerHTML = `<img src="${T("ravager_tamed")}" alt="" class="px" style="position:absolute;inset:20%;width:60%;object-fit:contain">`;
    paint();
  })();

  /* ================= 04 ВЕДРО ================= */
  (function bucket() {
    const btn = $("#drink"), bar = $("#drinkBar"), img = $("#bkImg"), eff = $("#effects"), hearts = $("#hearts"), blind = $("#blind"), scr = $("#screen");
    const BUFF = [["jump_boost", "Прыгучесть"], ["haste", "Спешка"], ["speed", "Скорость"], ["hero", "Герой деревни"]];
    let hp = 20, poison = false, hold = null, run = null;
    const drawHearts = (el, h, p) => { let s = ""; for (let i = 0; i < 10; i++) { const v = h - i * 2; const f = v >= 2 ? (p ? "h_pfull" : "h_full") : v === 1 ? (p ? "h_phalf" : "h_half") : null; s += `<i style="background-image:${f ? `url(${I(f)}),` : ""}url(${I("h_box")})"></i>`; } el.innerHTML = s; };
    drawHearts(hearts, hp, false);
    const step = (n) => $$("#bkSteps li").forEach((li) => li.classList.toggle("on", +li.dataset.s === n));
    function effects(list) { eff.innerHTML = list.map((e) => `<span class="${e.good ? "good" : ""}${e.left < 1 ? " blink" : ""}" title="${esc(e.n)}"><img src="${T("v/" + e.id)}" alt="${esc(e.n)}"><b>0:0${Math.max(0, Math.ceil(e.left))}</b></span>`).join(""); }
    function start(e) {
      if (run) return; e.preventDefault(); const t0 = performance.now(); img.classList.add("sip"), scr.classList.add("sip"); step(0);
      const sip = setInterval(() => snd("drink", 0.4, 0.9 + Math.random() * 0.2), 260); snd("drink", 0.4);
      hold = { sip, raf: 0 };
      const f = () => { const k = (performance.now() - t0) / 1600; bar.style.width = Math.min(100, k * 100) + "%"; $("#screenT").textContent = (Math.min(1, k) * 1.6).toFixed(1) + " с"; if (k >= 1) { finish(); return; } hold.raf = requestAnimationFrame(f); };
      f();
    }
    function cancel() { if (!hold) return; clearInterval(hold.sip); cancelAnimationFrame(hold.raf); hold = null; img.classList.remove("sip"), scr.classList.remove("sip"); bar.style.width = "0"; step(-1); $("#screenT").textContent = "0.0 с"; }
    function finish() {
      clearInterval(hold.sip); hold = null; img.classList.remove("sip"), scr.classList.remove("sip"); img.classList.add("gone"), $("#scrHand").src = $("#scrSlot").src = "../../assets/textures/p22/i/bucket.png"; bar.style.width = "0";
      snd("burp", 0.5); grant("drink_sperm"); if (INV.sperm_bucket > 0) { INV.sperm_bucket--; give("bucket", 1); }
      step(1); blind.classList.add("on"); scr.classList.add("poison"); poison = true;
      const buff = BUFF[ri(0, 3)]; const t0 = performance.now(); let hurt = false;
      run = setInterval(() => {
        const t = (performance.now() - t0) / 1000;
        $("#screenT").textContent = (1.6 + t).toFixed(1) + " с";
        if (!hurt && t >= 1.25) { hurt = true; hp = 19; snd("hurt", 0.4); scr.animate([{ filter: "sepia(1) saturate(4) hue-rotate(-50deg)" }, { filter: "none" }], 300); }
        const list = [];
        if (t < 2) list.push({ id: "poison", n: "Отравление", left: 2 - t }, { id: "blindness", n: "Слепота", left: 2 - t });
        else { if (poison) { poison = false; blind.classList.remove("on"); scr.classList.remove("poison"); step(2); snd("levelup", 0.3, 1.4); } list.push({ id: buff[0], n: buff[1], left: 7 - t, good: true }); }
        effects(list); drawHearts(hearts, hp, poison);
        if (t >= 7) { clearInterval(run); run = null; eff.innerHTML = ""; img.classList.remove("gone"); $("#scrHand").src = $("#scrSlot").src = "../../assets/textures/p22/i/sperm_bucket.png"; step(-1); $("#screenT").textContent = `выпало: ${buff[1].toLowerCase()}`; setTimeout(() => { hp = 20; drawHearts(hearts, hp, false); }, 1500); }
      }, 100);
    }
    btn.addEventListener("pointerdown", start);
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => btn.addEventListener(ev, () => { if (hold) { cancel(); K.say("Отпустил раньше 32 тиков: глоток не засчитан", true); } }));
    btn.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && !hold && !run) start(e); });
    btn.addEventListener("keyup", (e) => { if ((e.key === " " || e.key === "Enter") && hold) cancel(); });
    K.dl($("#bkDl"), [
      ["Откуда", "бык и разоритель, по ведру за дойку"],
      ["Стак", "1, как у любого ведра"],
      ["Еда", "0 голода, 0 насыщения, пьётся и на полный желудок"],
      ["Побочка", "отравление I и слепота I, по 2 с"],
      ["Бонус", "через 2 с: прыгучесть, спешка, скорость или «Герой деревни», 5 с"],
      ["После", "в руке остаётся пустое ведро"],
      ["В креативе", "ведро не тратится, эффекты всё равно накладываются"],
      ["Вкладка", "ванильная «Разное», не вкладка мода"],
    ]);
  })();

  /* ================= 05 МЕДНЫЙ БЫК ================= */
  (function egg() {
    // кубик медной шерсти
    const cube = $("#cube"), wrap = $("#cubeWrap"); const cs = drag(wrap, { ry: 35, rx: -24 }, () => snd("cloth", 0.5, 0.9 + Math.random() * 0.2));
    let cry = 35; (function f() { requestAnimationFrame(f); if (cs.idle() && motion()) cs.ry += 0.3; cry += (cs.ry - cry) * 0.15; cube.style.transform = `rotateX(${-24 - cs.rx * 0.5}deg) rotateY(${cry}deg)`; })();
    K.dl($("#woolDl"), [
      ["Источник", "только медный бык, 1–3 при смерти"],
      ["Прочность", "0.8, как у обычной шерсти"],
      ["Звук", "шерсть"],
      ["На карте", "оранжевый"],
      ["Текстура", "Джокер на всех шести гранях"],
      ["Ремонт", "испанских сапог: +25% за штуку, 1 уровень"],
    ]);
    // верстак
    function craft() {
      K.craft($("#craftBox"), {
        pattern: ["W W", "W W"],
        key: { W: { name: "Медная шерсть", id: "zitraksmode:copper_wool", src: I("copper_wool") } },
        result: { name: "Испанские сапоги", id: "zitraksmode:spanish_boots", src: I("spanish_boots") },
        onTake: () => {
          if (INV.copper_wool < 4) { K.say(`Медной шерсти ${INV.copper_wool}/4. Добудь на выгоне или возьми кнопкой ниже.`, true); return; }
          INV.copper_wool -= 4; give("spanish_boots", 1); snd("equip", 0.5); K.say("Испанские сапоги в инвентаре. Ниже можно надеть.");
        },
      });
    }
    craft();
    $("#giveWool").addEventListener("click", () => { give("copper_wool", 4); snd("cloth", 0.5); });
    listeners.push(() => { $("#craftNote").textContent = INV.copper_wool >= 4 ? `Медной шерсти ${INV.copper_wool}. Забирай сапоги из правой клетки.` : `Медной шерсти ${INV.copper_wool}/4. Добыть: выгон → ножницы по быку → меч.`; });
    changed();
    // сапоги 3D
    const bcv = $("#boots3d");
    const bv = view(bcv, "boots", "spanish_boots_tex", { idle: null, cam: { yaw: 200, pitch: 18, dist: 42, target: [0, 4, 0], fov: 36 }, ry: 0, spin: 22, onClick: () => snd("equip", 0.5) });
    if (!bv) bcv.outerHTML = `<img src="${I("spanish_boots")}" alt="" style="position:absolute;inset:15%;width:70%;height:70%;object-fit:contain">`;
    $("#bootsTip").innerHTML = K.mcHtml("§fИспанские сапоги") + "<div>" + ["§6Испанские сапоги", "§7Скорость бега x2", "§7Прыгучесть", "§cТратят полсердца раз в 10 секунд", "§4Кровавые эффекты", " ", "§7На ногах:", "§9+2 Броня"].map((s) => `<div>${K.mcHtml(s) || "&nbsp;"}</div>`).join("") + "</div>";
    K.dl($("#bootsDl"), [
      ["Слот", "ноги"],
      ["Броня", "2 · твёрдость 0 · отдача 0"],
      ["Прочность", "450"],
      ["Зачаровываемость", "12, как у кольчуги"],
      ["Скорость", "×2 (модификатор атрибута, иконки нет)"],
      ["Прыжок", "прыгучесть II, иконка есть, частиц нет"],
      ["Плата", "1 урона магией раз в 10 с, сквозь броню"],
      ["Обзор", "зафиксирован, пока сапоги на ногах"],
      ["Ремонт", `<img class="px" src="${I("copper_ingot")}" width="18" alt=""> медный слиток или <img src="${I("copper_wool")}" width="18" alt=""> медная шерсть`],
      ["Рецепт", "4 медной шерсти, форма ванильных ботинок"],
    ]);
    // примерка
    const W = { on: false, hp: 20, dura: 450, lvl: 5, full: true, t: 0, last: 0, regen: 0, bow: false };
    const run = $("#run"), runner = $("#runner"), track = $("#runTrack");
    const drawH = () => { let s = ""; for (let i = 0; i < 10; i++) { const v = W.hp - i * 2, f = v >= 2 ? "h_full" : v === 1 ? "h_half" : null; s += `<i style="background-image:${f ? `url(${I(f)}),` : ""}url(${I("h_box")})"></i>`; } $("#wHearts").innerHTML = s; };
    const drawD = () => { $("#wDura").style.width = (W.dura / 450) * 100 + "%"; $("#wDura").style.background = `hsl(${(W.dura / 450) * 120},100%,50%)`; $("#wDuraT").textContent = `${W.dura}/450`; };
    const note = (t) => ($("#wNote").textContent = t);
    let off = 0, lt = performance.now(), hopT = 0;
    (function f(now) {
      requestAnimationFrame(f); const dt = Math.min(0.05, (now - lt) / 1000); lt = now;
      if (motion()) { off += dt * (W.on ? 360 : 180); track.style.backgroundPositionX = -off + "px"; }
      if (!W.on) return;
      W.t += dt; W.regen += dt; hopT += dt;
      if (hopT > 1.6 && motion()) { hopT = 0; runner.classList.remove("hop"); void runner.offsetWidth; runner.classList.add("hop"); }
      if (W.t >= W.next) { W.next += 10; W.hp = Math.max(1, W.hp - 1); drawH(); snd("hurt", 0.35, 1.15); runner.classList.add("hurt"); setTimeout(() => runner.classList.remove("hurt"), 250);
        for (let i = 0; i < 8; i++) { const p = document.createElement("i"); p.className = "mk-dmg"; p.style.left = `calc(18% + ${ri(0, 26)}px)`; p.style.bottom = "30%"; p.style.setProperty("--dx", ri(-30, 30) + "px"); p.style.setProperty("--dy", ri(-40, -10) + "px"); run.appendChild(p); setTimeout(() => p.remove(), 800); } }
      if (W.full && W.regen >= 4) { W.regen = 0; if (W.hp < 20) { W.hp++; drawH(); } }
    })(lt);
    $("#wear").addEventListener("click", (e) => {
      if (!W.on && !INV.spanish_boots) { K.say("Сначала скрафти сапоги (или возьми шерсть кнопкой выше)", true); return; }
      W.on = !W.on; run.classList.toggle("on", W.on); e.currentTarget.textContent = W.on ? "Снять сапоги" : "Надеть сапоги"; snd("equip", 0.5);
      if (W.on) { W.t = 0; W.next = ri(1, 10); W.regen = 0; $("#wEff").innerHTML = `<span title="Прыгучесть II"><img src="${T("v/jump_boost")}" alt=""><b>II</b></span>`; note("Скорость ×2, прыгучесть II. Первый укол придёт через случайное время до 10 секунд: счёт идёт от общего счётчика тиков игрока, а не от момента надевания."); }
      else { $("#wEff").innerHTML = ""; note("Сапоги сняты: модификатор скорости снимается в тот же тик, обзор снова работает."); }
      run.classList.toggle("fov", W.on);
    });
    $("#wHit").addEventListener("click", () => {
      W.hp = Math.max(1, W.hp - 2); drawH(); snd("hurt", 0.4); if (W.on) { W.dura = Math.max(0, W.dura - 1); drawD(); note("Удар мобом: сапоги потеряли 1 прочности. Их собственные уколы магией прочность не тратят."); } else note("Без сапог удар просто снял сердце.");
    });
    $("#wBow").addEventListener("click", () => {
      snd("click", 0.4);
      if (W.on) { note("Натягиваешь лук, а приближения нет: пока висит модификатор скорости, мод держит множитель обзора ровно 1.0. Ускорение от бега тоже не расширяет картинку."); run.animate([{ transform: "scale(1)" }, { transform: "scale(1)" }], 600); }
      else { note("Без сапог натяжение лука приближает картинку, как обычно."); run.animate([{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], 1200); }
    });
    $("#wAnvil").addEventListener("click", () => {
      if (W.dura >= 450) { K.say("Целые сапоги наковальня чинить не станет. Получи пару ударов.", true); return; }
      if (INV.copper_wool < 1) { K.say("Нужна медная шерсть: 1 штука = +112 прочности", true); return; }
      INV.copper_wool--; changed(); W.dura = Math.min(450, W.dura + 112); drawD(); snd("anvil", 0.4);
      note("Наковальня: сапоги + 1 медная шерсть = +112 (четверть от 450) за 1 уровень. Цена не растёт от раза к разу.");
    });
    drawH(); drawD();
  })();

  /* ================= 06 ТОНКОСТИ ================= */
  const NOTES = [
    ["Пол не с рождения", "Корова получает пол только при первой дойке. До этого у всех стоит флаг «не бык», поэтому ножницы не трогают даже корову, которая потом окажется быком."],
    ["Телят тоже доят", "Ванильная проверка на детёныша обходится: мод перехватывает клик раньше. Телёнок-бык даёт ведро спермы, как взрослый."],
    ["Грибная корова — тоже корова", "Муушрум в коде наследует корову, поэтому получает пол и может дать сперму. Текстура не меняется: у муушрума свой рендер. Ножницы по такому «быку» не превращают его в обычную корову, а стригут в медь или налысо."],
    ["Ведро уходит всегда", "Ведро списывается без проверки креатива, так что и в креативе оно пропадает из руки. Ножницы в креативе при этом не тупятся."],
    ["Полный инвентарь", "Результат дойки кладётся прямо в инвентарь. Если места нет, ведро молока или спермы исчезает, а пустое ведро уже потрачено."],
    ["Медь до перезахода", "Пол сохраняется в данных коровы, а вариант (лысый или медный) живёт только до выгрузки. После перезахода бык снова обычный, и его можно стричь заново: ещё кожа или ещё один шанс на медь."],
    ["Медный телёнок", "С детёнышей ванильного лута нет, но медную шерсть мод добавляет поверх, не проверяя возраст. Медный телёнок роняет свои 1–3 шерсти."],
    ["Ручной, но не безобидный", "У разорителя стёрты цели, а ломание листвы сидит в другом месте кода. Упрётся в листву — прогрызёт её, как дикий."],
    ["Бить можно", "Ручной разоритель не отвечает на удары: целей атаки у него нет вообще. Повторная дойка ничего не даёт, ведро остаётся пустым."],
    ["Сапоги без иконки скорости", "Скорость ×2 — модификатор атрибута, в списке эффектов его не видно. Прыгучесть II — эффект с иконкой, но без частиц. Снимаются сапоги — модификатор уходит в тот же тик."],
    ["Уколы сквозь броню", "Полсердца раз в 10 секунд — магический урон: броня не спасает, прочность сапог не тратится. Счёт идёт от счётчика тиков игрока, первый укол приходит в случайный момент. На сытый желудок естественная регенерация восполняет больше, чем отнимают сапоги."],
    ["Обзор заморожен", "Пока на ногах сапоги, множитель обзора держится ровно на 1.0: бег его не расширяет, натянутый лук не приближает."],
    ["Ремонт за 1 уровень", "Медная шерсть на наковальне возвращает четверть прочности и всегда стоит ровно 1 уровень. Обычный ремонт медными слитками тоже работает, как у любой брони."],
    ["Не во вкладке мода", "Ведро спермы лежит в ванильной вкладке «Разное». Медная шерсть и сапоги — во вкладке ZitraksMode."],
    ["Только основная рука", "Мод смотрит на предмет в основной руке. Ведро во второй руке по корове или разорителю не сработает."],
  ];
  $("#notesBox").innerHTML = NOTES.map(([h, p]) => `<div class="mk-note"><h4>${esc(h)}</h4><p>${esc(p)}</p></div>`).join("");

  /* ================= 07–08 ================= */
  adv = K.adv({ list: ZM.P22.advancements, store: "p22.adv", icon: (a) => I(a.icon), chatSel: "#log", intro: "Шесть скрытых: от первого быка до испанских сапог.", onGrant: () => setTimeout(got, 50) });
  const got = () => { $("#stGot").textContent = `${ZM.P22.advancements.filter((a) => adv.has(a.key)).length}/6`; };
  got(); setInterval(got, 1500);
  K.timeline($("#tl"), [
    { date: "18.05.2026", t: "Дойка быка и разорителя", d: "Пол у коров, ведро спермы, усмирение разорителя, новые текстуры быка и ручного разорителя.", c: "#d7322c" },
    { date: "29.05.2026", t: "Ветка ачивок", d: "Шесть скрытых достижений в общем древе мода: от первого быка до испанских сапог.", c: "#3f7d22" },
    { date: "позже", t: "Медный бык", d: "Стрижка быков, лысый и медный варианты, медная шерсть и испанские сапоги с ремонтом на наковальне.", c: "#c9763d" },
  ]);
  const vs = $$("#tl .v"); if (vs[1]) vs[1].textContent = "древо"; if (vs[2]) vs[2].textContent = "пасхалка";
  K.finNav(22, $("#finNav"));
})();
