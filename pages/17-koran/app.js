/* №17 · Коран. Данные из мода: KoranItem (20 страниц, isFireResistant, ачивка по числу страниц), рецепты
   vetkhiy_minet / noviy_omlet / koran, модели (книга = две половины, шов на y = 9.75), дроп Махораги 30%. */
(function () {
  const { $, $$, esc } = ZM, K = ZM.kit, U = ZM.url;
  ZM.topbar({ crumb: "№17 · Коран", ...ZM.pointNav(17) });
  const T = (p) => U(`assets/textures/p17/${p}.png`);
  const snd = K.sounds("p17");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motion = () => !reduce && !document.documentElement.classList.contains("no-motion");
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let adv = null;

  /* ================= пыль в луче света ================= */
  (function dust() {
    const cv = $("#dust"), cx = cv.getContext("2d"); let W, H, P = [];
    const size = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; P = Array.from({ length: Math.round(W * H / 26000) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: rnd(0.6, 2), v: rnd(4, 14), a: rnd(0.15, 0.6), p: Math.random() * 6.3 })); };
    size(); addEventListener("resize", size);
    let last = performance.now();
    (function f(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; cx.clearRect(0, 0, W, H);
      for (const d of P) {
        if (motion()) { d.y -= d.v * dt; d.x += Math.sin(now / 1800 + d.p) * 6 * dt; if (d.y < -4) { d.y = H + 4; d.x = Math.random() * W; } }
        const beam = Math.max(0, 1 - Math.abs(d.x - W * 0.66 + (d.y - H * 0.2) * 0.35) / (W * 0.22));
        cx.globalAlpha = d.a * (0.25 + beam); cx.fillStyle = "#ffdca0"; cx.beginPath(); cx.arc(d.x, d.y, d.r, 0, 6.3); cx.fill();
      }
      requestAnimationFrame(f);
    })(last);
  })();

  /* ================= HERO: книга из двух половин ================= */
  const M = ZM.P17M, stage = $("#book3d");
  const OFF = { top: (9.75 + 17.5) / 2 - 9.625, bot: (1.75 + 9.75) / 2 - 9.625 }; // центр половины относительно центра целой книги (в 1/16 блока)
  const rot = { x: -20, y: -38 }; let drag = null, lastTouch = -1e9, split = 0, splitT = 0, unit = 10, parts = null, visible = true;
  function build3d() {
    const r = stage.getBoundingClientRect(); unit = Math.min(r.width, r.height) * 0.62 / 16;
    parts = [];
    for (const [key, el] of [["noviy_omlet", $("#pTop")], ["vetkhiy_minet", $("#pBot")]]) {
      el.innerHTML = "";
      if (!(window.ZMGL && ZMGL.supported())) { el.innerHTML = `<img src="${T("i/koran")}" alt="Коран" class="kr-fallback">`; $("#pBot").innerHTML = ""; parts = null; return; }
      const v = ZMGL.build(M[key], U("assets/textures/p17/"), { unit, persp: 5000 });
      if (!v) { parts = null; return; }
      v.el.style.cssText = "width:100%;height:100%;display:block"; el.appendChild(v.el); parts.push({ v, el, off: key === "noviy_omlet" ? OFF.top : OFF.bot, dir: key === "noviy_omlet" ? 1 : -1 });
    }
  }
  function apply3d() {
    if (!parts) return;
    const c = Math.cos(rot.x * Math.PI / 180), gap = split * 3.2;
    const topFront = rot.x <= 0; for (const p of parts) { p.el.style.zIndex = (p.dir > 0) === topFront ? 2 : 1; p.v.setRot([["x", rot.x], ["y", rot.y]]); p.el.style.transform = `translateY(${-(p.off + p.dir * gap) * unit * c}px)`; }
  }
  stage.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, rx: rot.x, ry: rot.y }; try { stage.setPointerCapture(e.pointerId); } catch (_) {} });
  stage.addEventListener("pointermove", (e) => { if (!drag) return; rot.y = drag.ry + (e.clientX - drag.x) * 0.5; rot.x = clamp(drag.rx - (e.clientY - drag.y) * 0.4, -70, 70); lastTouch = performance.now(); });
  const up = () => { drag = null; }; stage.addEventListener("pointerup", up); stage.addEventListener("pointercancel", up);
  stage.addEventListener("contextmenu", (e) => e.preventDefault());
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(stage);
  $("#splitBtn").addEventListener("click", () => {
    splitT = splitT ? 0 : 1; snd(splitT ? "flip1" : "flip2", 0.8, splitT ? 0.9 : 1.1);
    $("#splitBtn").textContent = splitT ? "Соединить" : "Разделить";
    $("#partName").innerHTML = splitT ? "сверху <b>Новый Омлет</b> · снизу <b>Ветхий Минет</b>" : "Коран · zitraksmode:koran";
  });
  let lastF = performance.now();
  (function loop(now) {
    const dt = Math.min(0.05, (now - lastF) / 1000); lastF = now;
    if (visible && parts) {
      split += (splitT - split) * Math.min(1, dt * 7);
      if (!drag && now - lastTouch > 1600 && motion()) { rot.y += dt * 16; rot.x += (-20 - rot.x) * Math.min(1, dt * 1.2); }
      apply3d();
    }
    requestAnimationFrame(loop);
  })(lastF);
  requestAnimationFrame(() => { build3d(); apply3d(); });
  let rz = 0; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { parts && parts.forEach((p) => p.v.destroy && p.v.destroy()); build3d(); apply3d(); }, 250); });

  /* ================= 01 КРАФТ ================= */
  const I = (id, name, src) => ({ src: src || T("i/" + id), name, id: id.includes(":") ? id : "minecraft:" + id });
  const RAW = I("porkchop", "Сырая свинина"), COOKED = I("cooked_porkchop", "Жареная свинина");
  const VET = { src: T("i/vetkhiy_minet"), name: "Ветхий Минет", id: "zitraksmode:vetkhiy_minet" };
  const NOV = { src: T("i/noviy_omlet"), name: "Новый Омлет", id: "zitraksmode:noviy_omlet" };
  const KOR = { src: T("i/koran"), name: "Коран", id: "zitraksmode:koran" };
  K.craft($("#craftA"), { pattern: [" PP", " P ", "PP "], key: { P: RAW }, result: VET, onTake: () => { snd("place", 0.6); adv.grant("craft_vetkhiy_minet"); } });
  K.craft($("#craftB"), { pattern: ["P  ", "PPP", "  P"], key: { P: COOKED }, result: NOV, onTake: () => { snd("place", 0.6); adv.grant("craft_noviy_omlet"); } });
  K.craft($("#craftC"), { pattern: ["   ", "ON ", "   "], key: { O: VET, N: NOV }, result: KOR, onTake: () => {
    snd("flip3", 0.8); adv.grant("craft_koran");
    if (splitT) $("#splitBtn").click();
  } });
  // печка: 5 сырых → 5 жареных, 10 секунд на штуку в игре (тут быстрее)
  const fIn = $("#fIn"), fOut = $("#fOut");
  fIn.querySelector("img").src = RAW.src; fOut.querySelector("img").src = COOKED.src; $("#furn .kr-f-grid > span.k-slot img").src = T("i/coal");
  let fLeft = 5, fDone = 0, fBusy = false;
  const fDraw = () => { fIn.querySelector("b").textContent = fLeft > 1 ? fLeft : ""; fIn.querySelector("img").style.opacity = fLeft ? 1 : 0; fOut.querySelector("b").textContent = fDone > 1 ? fDone : ""; fOut.querySelector("img").style.opacity = fDone ? 1 : 0; };
  fDraw();
  fIn.addEventListener("click", () => {
    if (fBusy) return; if (!fLeft) { fLeft = 5; fDone = 0; fDraw(); }
    fBusy = true; $("#furn").classList.add("on"); $("#fHint").textContent = "Жарится… В игре 10 секунд на штуку, тут быстрее.";
    const one = () => {
      $("#fArrow").style.transition = "none"; $("#fArrow").style.width = "0"; void $("#fArrow").offsetWidth;
      $("#fArrow").style.transition = "width .55s linear"; $("#fArrow").style.width = "100%"; snd("crackle", 0.5, rnd(0.9, 1.1));
      setTimeout(() => { fLeft--; fDone++; fDraw(); if (fLeft) one(); else { fBusy = false; $("#furn").classList.remove("on"); $("#fHint").textContent = "Готово: пять жареных, хватит на «Новый Омлет». Жми ещё раз, чтобы начать заново."; ZM.sfx("pop", 0.5, 1.3); } }, 600);
    };
    one();
  });
  fOut.addEventListener("click", () => { if (!fDone) return; snd("eat" + (1 + (Math.random() * 2 | 0)), 0.6); fDone--; fDraw(); if (!fDone && Math.random() < 0.5) setTimeout(() => snd("burp", 0.5), 400); });

  /* ================= 02 КНИГА ================= */
  const P = ZM.P17P, COL = { black: "#000", dark_blue: "#0000AA", dark_green: "#00AA00", dark_aqua: "#00AAAA", dark_red: "#AA0000", dark_purple: "#AA00AA", gold: "#FFAA00", gray: "#AAAAAA", dark_gray: "#555555" };
  let pi = 0; const seen = new Set(ZM.store.get("p17.read", []));
  $("#pgDots").innerHTML = P.pages.map((p, i) => `<button type="button" data-i="${i}" aria-label="Страница ${p.n}">${p.n}</button>`).join("");
  function page(i, flip) {
    pi = clamp(i, 0, P.pages.length - 1); const p = P.pages[pi];
    $("#pgN").textContent = `Страница ${p.n} из ${P.total}`;
    const t = $("#pgT"); t.style.color = COL[p.color] || "#000"; t.style.fontWeight = p.bold ? "700" : ""; t.style.fontStyle = p.italic ? "italic" : "";
    t.textContent = p.text;
    if (flip) { t.classList.remove("in"); void t.offsetWidth; t.classList.add("in"); snd("flip" + (1 + (Math.random() * 3 | 0)), 0.7); }
    $("#pgBack").hidden = pi === 0; $("#pgFwd").hidden = pi === P.pages.length - 1;
    seen.add(p.n); ZM.store.set("p17.read", [...seen]);
    $$("#pgDots button").forEach((b, k) => { b.classList.toggle("on", k === pi); b.classList.toggle("seen", seen.has(P.pages[k].n)); });
    $("#readBar").style.width = (seen.size / P.pages.length) * 100 + "%";
    $("#readTxt").textContent = `прочитано ${seen.size} из ${P.pages.length}`;
    if (seen.size >= P.pages.length && adv && !adv.has("read_all_pages")) adv.grant("read_all_pages");
  }
  $("#pgBack").addEventListener("click", () => page(pi - 1, true));
  $("#pgFwd").addEventListener("click", () => page(pi + 1, true));
  $("#pgDots").addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) page(+b.dataset.i, true); });
  let sx = null; const bk = $("#book");
  bk.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  bk.addEventListener("touchend", (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 40) page(pi + (dx < 0 ? 1 : -1), true); });
  addEventListener("keydown", (e) => { const r = bk.getBoundingClientRect(); if (r.top > innerHeight || r.bottom < 0 || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return; if (e.key === "ArrowRight") page(pi + 1, true); if (e.key === "ArrowLeft") page(pi - 1, true); });
  // масштаб окна книги: целые пиксели GUI
  const scaleBook = () => { const w = bk.parentElement.clientWidth; bk.style.setProperty("--s", Math.max(1.5, Math.min(3, Math.floor((w / 146) * 4) / 4)) + "px"); };
  scaleBook(); addEventListener("resize", scaleBook);

  /* ================= 03 ЛАВА ================= */
  const HOT = [
    { id: "koran", name: "Коран", fire: true, src: T("i/koran") },
    { id: "book", name: "Книга" }, { id: "written_book", name: "Подписанная книга" }, { id: "porkchop", name: "Сырая свинина" },
    { id: "cooked_porkchop", name: "Жареная свинина" }, { id: "paper", name: "Бумага" }, { id: "leather", name: "Кожа" },
    { id: "netherite_hoe", name: "Незеритовая мотыга", fire: true }, { id: "feather", name: "Перо" },
  ];
  $("#hotbar").innerHTML = HOT.map((h, i) => `<button type="button" class="kr-hs" data-i="${i}" data-tip="${esc(h.name)}" data-tip-sub="${h.fire ? "не горит" : "сгорит"}"><img src="${h.src || T("i/" + h.id)}" alt="${esc(h.name)}"></button>`).join("");
  const pool = $("#pool"), fl = $("#floats"); let floats = [];
  function hot(t) { const el = $("#poolHot"); el.textContent = t; el.classList.remove("on"); void el.offsetWidth; el.classList.add("on"); clearTimeout(hot.t); hot.t = setTimeout(() => el.classList.remove("on"), 2200); }
  function particles(x, y, n, cls) { for (let k = 0; k < n; k++) { const p = document.createElement("i"); p.className = "kr-pt " + cls; p.style.left = x + rnd(-14, 14) + "px"; p.style.top = y + rnd(-6, 6) + "px"; p.style.setProperty("--dx", rnd(-20, 20) + "px"); p.style.setProperty("--dy", -rnd(30, 80) + "px"); p.style.animationDelay = rnd(0, 0.3) + "s"; fl.appendChild(p); setTimeout(() => p.remove(), 1400); } }
  $("#hotbar").addEventListener("click", (e) => {
    const b = e.target.closest("[data-i]"); if (!b) return; const h = HOT[+b.dataset.i];
    b.classList.remove("thr"); void b.offsetWidth; b.classList.add("thr");
    const W = pool.clientWidth, x = rnd(W * 0.12, W * 0.88), surf = pool.clientHeight * 0.52;
    const el = document.createElement("button"); el.type = "button"; el.className = "kr-it" + (h.fire ? " fire" : ""); el.innerHTML = `<img src="${h.src || T("i/" + h.id)}" alt="">`;
    el.style.left = x + "px"; el.style.top = "-40px"; el.style.setProperty("--ph", Math.random() * 3 + "s"); fl.appendChild(el);
    ZM.sfx("click", 0.3, 1.4);
    requestAnimationFrame(() => { el.style.top = surf + "px"; el.classList.add("drop"); });
    setTimeout(() => {
      snd("lavapop", 0.6, rnd(0.9, 1.2));
      if (h.fire) {
        el.classList.add("bob"); floats.push(el); if (floats.length > 6) { const o = floats.shift(); o.remove(); }
        hot(`${h.name} не горит и держится на поверхности`);
        el.addEventListener("click", () => { snd("pop", 0.6, 1.2); floats = floats.filter((f) => f !== el); el.classList.add("got"); setTimeout(() => el.remove(), 300); }, { once: true });
      } else {
        snd("fizz", 0.5, rnd(0.9, 1.1)); particles(x, surf, 8, "fl"); el.classList.add("burn");
        setTimeout(() => { particles(x, surf, 5, "sm"); el.remove(); }, 450);
        hot(`${h.name}: сгорело`);
      }
    }, 520);
  });
  // иногда булькает, пока бассейн на экране
  let poolVis = false; new IntersectionObserver((es) => { poolVis = es[0].isIntersecting; }).observe(pool);
  (function amb() { setTimeout(() => { if (poolVis && !document.hidden) { if (Math.random() < 0.5) snd("lavapop", 0.25, rnd(0.8, 1.2)); else snd("lava", 0.15); } amb(); }, rnd(3500, 8000)); })();

  /* ================= 04 СВОЙСТВА ================= */
  const nav21 = ZM.POINTS.find((p) => p.n === 21);
  const toMah = $("#toMah"); if (nav21 && nav21.page) toMah.href = U(nav21.page); else { toMah.removeAttribute("href"); toMah.classList.add("off"); }
  $("#props").innerHTML = [
    ["ID", "<code>zitraksmode:koran</code>"], ["Стак", "1"], ["Не горит", "да, как незерит"], ["Страниц", "20"],
    ["Половины", "по 64 в стаке"], ["Вкладка", "ZitraksMode"],
  ].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("");

  /* ================= 05–06 ================= */
  adv = K.adv({ list: ZM.P17.advancements, store: "p17.adv", icon: (a) => T("i/" + a.icon), intro: "Четыре скрытые ачивки: две половины, целая книга и чтение до конца." });
  page(0, false);
  K.timeline($("#tl"), [
    { date: "30.04.2026", t: "Коран", d: "Книга на 20 страниц из двух половин: «Ветхий Минет» и «Новый Омлет». Огнестойкая, в стак не складывается. В тот же день вышли хентай-блок и картины.", c: "#d8b25a" },
    { date: "16.05.2026", t: "Дроп с Махораги", d: "С выходом Махораги книга начала выпадать с него с шансом 30%.", c: "#8fbf9a" },
    { date: "29.05.2026", t: "Ачивки", d: "В древе достижений появилась ветка из четырёх ачивок: две половины, целая книга и «Знание — сила».", c: "#55ffff" },
  ]);
  K.finNav(17, $("#finNav"));
  ZM.reveal && ZM.reveal();
})();
