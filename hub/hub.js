/* Главная: титульный экран, профиль и сохранения, пункты, общее древо достижений */
(function () {
  const { $, $$, esc, url: U, store: S } = ZM;
  const PF = ZM.profile, HUB = ZM.HUB_ADV || [], ROOT = ZM.HUB_ROOT;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pad2 = (n) => String(n).padStart(2, "0");
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; };
  const sfx = (n, v = 0.5, r = 1) => ZM.sfx && ZM.sfx(n, v, r);

  ZM.topbar({ crumb: "Главная" });

  /* ================= настройки (свои у каждого профиля) ================= */
  const cfg = Object.assign({ dim: 0, theme: "sunset", view: "grid", motion: true, splash: true, done: true }, S.get("hub.cfg", {}));
  const saveCfg = () => { S.set("hub.cfg", cfg); applyCfg(); };
  function applyCfg() {
    document.documentElement.dataset.theme = cfg.theme;
    document.documentElement.classList.toggle("no-motion", !cfg.motion || matchMedia("(prefers-reduced-motion: reduce)").matches);
    $("#splash").hidden = !cfg.splash;
    $("#pGrid").classList.toggle("list", cfg.view === "list");
    $$("#ptView button,#setView button").forEach((b) => b.classList.toggle("on", b.dataset.v === cfg.view));
    $$("#themes button").forEach((b) => b.classList.toggle("on", b.dataset.t === cfg.theme));
    drawStars();
    ZM.pano && ZM.pano.theme(cfg.theme);
  }

  /* ================= прогресс ================= */
  const gotSet = (pt) => new Set(S.get(pt.store, []));
  function levelOf(xp) {   // формула опыта Minecraft: сколько всего нужно на уровень L
    const need = (L) => L <= 16 ? L * L + 6 * L : L <= 31 ? 2.5 * L * L - 40.5 * L + 360 : 4.5 * L * L - 162.5 * L + 2220;
    let L = 0; while (need(L + 1) <= xp) L++;
    return { L, cur: xp - need(L), span: need(L + 1) - need(L) };
  }
  function stats() {
    let got = 0, all = 0, xp = 0, xpAll = 0, full = 0;
    const per = {};
    for (const pt of HUB) {
      const g = gotSet(pt), done = pt.adv.filter((a) => g.has(a.key)), x = done.reduce((s, a) => s + a.xp, 0);
      per[pt.n] = { got: done.length, all: pt.adv.length, xp: x, g };
      got += done.length; all += pt.adv.length; xp += x; xpAll += pt.adv.reduce((s, a) => s + a.xp, 0); if (done.length === pt.adv.length) full++;
    }
    return { got, all, xp, xpAll, full, per, lv: levelOf(xp) };
  }
  const RANKS = [[0, "Только заспавнился"], [3, "Цифроблок"], [7, "Подрывник"], [11, "Снайпер"], [15, "Хирург криперов"], [20, "Эндер-мастер"], [24, "Гей-мастер"], [27, "Прошёл мод"]];
  const rankOf = (L) => RANKS.filter((r) => L >= r[0]).pop()[1];
  const LIVE = ZM.POINTS.filter((p) => p.page);

  /* ================= титульный экран ================= */
  const SPLASH = ["Теперь с кастрацией!", "Супер-TNT: сила 20!", "Нож, не ножницы!", "1337!", "Житель-Даун одобряет!", "Эндер-сейф не твой!", "Made in Heaven!", "Лабубу внутри!", "Присаживайся!",
    "Снайперка вечная!", "Каска светит!", "Forge 1.19.2!", "29 пунктов!", "Гей-мастер ждёт!", "Взрыв 6? Мало!", "Бомбардир!", "Одна извилина!", "To be continued...", "Детонация!", "Хуй не нос!", "Чик, и всё!"];
  let spI = (Math.random() * SPLASH.length) | 0;
  const splash = () => { $("#splash").textContent = SPLASH[spI % SPLASH.length]; };
  $("#splash").addEventListener("click", () => { spI++; splash(); sfx("pop", 0.4, 1.2); });
  splash();

  /* ---- логотип: 11 букв, каждая живёт в стиле случайного пункта ---- */
  const LG = $("#logo"), TIP = $("#lgTip"), LTR = "ZITRAKSMODE".split(""), STY = LIVE.map((p) => p.n);
  const lgSt = new Array(11).fill(0); let lgHover = -1, lgLock = 0, lgTm = 0;
  LG.querySelector(".l1").innerHTML = LTR.slice(0, 7).map((c, i) => `<span class="lg-c" data-i="${i}" data-s="0">${c}</span>`).join("");
  LG.querySelector(".l2").innerHTML = LTR.slice(7).map((c, i) => `<span class="lg-c" data-i="${i + 7}" data-s="0">${c}</span>`).join("");
  const cells = $$(".lg-c", LG), JUNK = "ZITRAKSMODE0123456789#%&";
  const motionOn = () => !document.documentElement.classList.contains("no-motion");
  function setL(i, s, fast) {
    const el = cells[i]; lgSt[i] = s; clearInterval(el._t);
    if (fast || !motionOn()) { el.dataset.s = s; el.textContent = LTR[i]; return; }
    let k = 0; el.classList.add("mx");
    el._t = setInterval(() => {
      if (++k < 6) { el.textContent = JUNK[(Math.random() * JUNK.length) | 0]; el.dataset.s = STY[(Math.random() * STY.length) | 0]; return; }
      clearInterval(el._t); el.textContent = LTR[i]; el.dataset.s = s; el.classList.remove("mx"); el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
    }, 45);
  }
  const rndSty = (not) => { let s; do s = STY[(Math.random() * STY.length) | 0]; while (STY.length > 1 && s === not); return s; };
  function tipFor(n) { const p = ZM.POINTS.find((q) => q.n === n); if (!p) { TIP.classList.remove("on"); return; } TIP.innerHTML = `<b style="color:${p.tone}">№${pad2(n)}</b> ${esc(p.title)}`; TIP.classList.add("on"); }
  function lgTick() { clearTimeout(lgTm); lgTm = setTimeout(lgTick, 900 + Math.random() * 700); if (lgLock || !motionOn() || document.hidden) return; const i = (Math.random() * 11) | 0; if (i !== lgHover) setL(i, rndSty(lgSt[i])); }
  // вход: камень → каскадом в стили пунктов
  cells.forEach((el, i) => setTimeout(() => setL(i, rndSty(i ? lgSt[i - 1] : 0)), 500 + i * 90));
  setTimeout(lgTick, 2200);
  LG.addEventListener("pointerover", (e) => { const c = e.target.closest(".lg-c"); if (!c) return; lgHover = +c.dataset.i; tipFor(lgSt[lgHover]); });
  LG.addEventListener("pointerleave", () => { lgHover = -1; if (!lgLock) TIP.classList.remove("on"); });
  LG.addEventListener("click", (e) => { const c = e.target.closest(".lg-c"); if (!c) return; const p = LIVE.find((q) => q.n === lgSt[+c.dataset.i]); if (!p) return; sfx("orb", 0.5, 1.2); setTimeout(() => (location.href = p.page), 160); });
  // наведение на карточку пункта: весь логотип переодевается в его стиль
  ZM.logoAll = (n) => { if (!STY.includes(n)) return; lgLock = n; cells.forEach((el, i) => setTimeout(() => lgLock === n && setL(i, n), i * 35)); tipFor(n); };
  ZM.logoFree = () => { const was = lgLock; lgLock = 0; if (!was) return; cells.forEach((el, i) => setTimeout(() => !lgLock && setL(i, rndSty(was)), i * 35)); TIP.classList.remove("on"); };
  function heroRender(st) {
    const me = PF.me(), last = S.get("hub.last", null), lp = last && ZM.POINTS.find((p) => p.n === last.n && p.page);
    const c = $("#bCont"); c.hidden = !lp;
    if (lp) { c.href = lp.page; c.textContent = `Продолжить: №${pad2(lp.n)} ${lp.title}`; }
    $("#tsMe").innerHTML = `<a href="#profile"><img src="${PF.avatarUrl(me.avatar)}" alt=""><span>${esc(me.nick)}<small>Уровень ${st.lv.L} · ★ ${st.got}/${st.all}</small></span></a>`;
    $("#tsInfo").textContent = `${LIVE.length}/${ZM.POINTS.length} страниц`;
  }
  $("#bRnd").addEventListener("click", () => {
    const st = stats(), seen = S.get("hub.seen", []);
    const pool = LIVE.filter((p) => !seen.includes(p.n)).length ? LIVE.filter((p) => !seen.includes(p.n)) : LIVE.filter((p) => !st.per[p.n] || st.per[p.n].got < st.per[p.n].all);
    const p = (pool.length ? pool : LIVE)[(Math.random() * (pool.length || LIVE.length)) | 0];
    sfx("orb", 0.5, 1); setTimeout(() => (location.href = p.page), 180);
  });
  // звёзды для ночной темы и Энда
  const stars = $("#tsStars");
  function drawStars() {
    const r = stars.getBoundingClientRect(); stars.width = Math.ceil(r.width / 2) || 1; stars.height = Math.ceil(r.height / 2) || 1;
    const g = stars.getContext("2d"); g.clearRect(0, 0, stars.width, stars.height);
    if (cfg.theme !== "night" && cfg.theme !== "end") return;
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 260; i++) { const y = rnd() * stars.height * 0.55; g.fillStyle = `rgba(255,255,255,${(0.3 + rnd() * 0.7) * (1 - y / stars.height)})`; g.fillRect(rnd() * stars.width | 0, y | 0, 1, 1); }
  }
  addEventListener("resize", drawStars);

  /* ================= профиль ================= */
  const ago = (ts) => { const s = (Date.now() - ts) / 1000; return s < 60 ? "только что" : s < 3600 ? `${(s / 60) | 0} мин назад` : s < 86400 ? `${(s / 3600) | 0} ч назад` : `${(s / 86400) | 0} дн назад`; };
  const dateRu = (ts) => new Date(ts).toLocaleDateString("ru-RU");
  function profileRender(st) {
    const me = PF.me(), seen = S.get("hub.seen", []);
    $("#pfAvImg").src = PF.avatarUrl(me.avatar);
    if (document.activeElement !== $("#pfNick")) $("#pfNick").value = me.nick;
    $("#pfSince").textContent = `Профиль с ${dateRu(me.created)}${PF.list().length > 1 ? ` · профилей: ${PF.list().length}` : ""}`;
    $("#pfTitle").textContent = rankOf(st.lv.L);
    $("#pfLvl").textContent = st.lv.L;
    const w = st.lv.span ? st.lv.cur / st.lv.span : 1;
    $("#pfXpFill").style.width = w * 100 + "%"; $("#pfXpFill").style.setProperty("--xpw", w > 0 ? 100 / w + "%" : "100%");
    $("#pfXpTxt").textContent = st.xp >= st.xpAll ? `${st.xp} XP · всё собрано` : `${st.xp} / ${st.xpAll} XP · до ${st.lv.L + 1} уровня ${Math.ceil(st.lv.span - st.lv.cur)} XP`;
    $("#pfStats").innerHTML = [[`${st.got}/${st.all}`, "ачивок"], [st.xp, "опыта"], [`${st.full}/${HUB.length}`, "пунктов закрыто"], [`${seen.filter((n) => LIVE.some((p) => p.n === n)).length}/${LIVE.length}`, "страниц открыто"]]
      .map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join("");
    $("#pfPts").innerHTML = HUB.map((pt) => { const p = st.per[pt.n]; return `<a href="${pt.page}#adv" style="--tone:${pt.tone}" class="${p.got === p.all ? "full" : ""}" title="${esc(pt.title)}: ${p.got}/${p.all}"><img src="${pt.icon}" alt="">№${pad2(pt.n)} <span style="margin-left:auto">${p.got}/${p.all}</span><i style="width:${(p.got / p.all) * 100}%"></i></a>`; }).join("");
    $("#pfQ").textContent = `ур. ${st.lv.L} · ${rankOf(st.lv.L)}`;
    // профили
    const list = PF.list(), act = PF.me().id;
    $("#pfList").innerHTML = list.map((p) => {
      let n = 0;
      if (p.id === act) n = PF.gotCount(); else try { const d = JSON.parse(localStorage.getItem("zmp:snap:" + p.id)) || {}; for (const k in d) if (/^p\d\d\.adv$/.test(k)) n += (JSON.parse(d[k]) || []).length; } catch (e) {}
      return `<div class="pf-row ${p.id === act ? "on" : ""}"><img src="${PF.avatarUrl(p.avatar)}" alt=""><b>${esc(p.nick)}<small>★ ${n} · с ${dateRu(p.created)}</small></b>${p.id === act ? `<span class="pf-cur" style="font:400 12px var(--f-pixel);color:var(--acc)">играешь</span>` : `<button class="mcb" type="button" data-sw="${p.id}">Играть</button>`}${list.length > 1 ? `<button class="del" type="button" data-del="${p.id}" title="Удалить профиль">×</button>` : ""}</div>`;
    }).join("");
    // лента
    const feed = S.get("hub.feed", []);
    $("#pfFeed").innerHTML = feed.length ? feed.map((f) => `<div><img src="${f.i ? U(f.i) : ROOT.icon}" alt=""><span><b>${f.f === "challenge" ? "Испытание выполнено!" : f.f === "goal" ? "Цель достигнута!" : "Достижение получено!"}</b>${esc(f.t)}</span><small>${f.p ? "№" + pad2(f.p) + " · " : ""}${ago(f.ts)}</small></div>`).join("")
      : `<p class="pf-empty">Пока пусто. Получи ачивку на любой странице, и она появится здесь.</p>`;
  }
  $("#pfNick").addEventListener("change", (e) => { const v = e.target.value.trim().slice(0, 16) || "Игрок"; PF.update({ nick: v }); sfx("orb", 0.4, 1.4); renderAll(); });
  $("#pfNick").addEventListener("keydown", (e) => { if (e.key === "Enter") e.target.blur(); });
  $$(".pf-tabs button").forEach((b) => b.addEventListener("click", () => {
    $$(".pf-tabs button").forEach((x) => x.classList.toggle("on", x === b));
    $$(".pf-pane").forEach((p) => (p.hidden = p.dataset.pane !== b.dataset.tab));
  }));
  const msg = (t, ok) => { const m = $("#svMsg"); m.textContent = t; m.className = "pf-msg " + (ok ? "ok" : "bad"); };
  $("#svCopy").addEventListener("click", () => { const c = PF.exportCode(); $("#svCode").value = c; ZM.copy(c).then(() => msg(`Код скопирован (${Math.ceil(c.length / 1024)} КБ). Вставь его на другом устройстве`, true)); });
  $("#svFile").addEventListener("click", () => { PF.download(); msg("Файл .zmsave скачан", true); });
  function doImport(text) {
    try { const o = PF.importCode(text, $("#svNew").checked); msg(`Загружено: ${o.p && o.p.nick ? o.p.nick : "профиль"}. Перезагружаю…`, true); sfx("levelup", 0.5); setTimeout(() => location.reload(), 900); }
    catch (e) { msg("Не получилось: " + e.message, false); sfx("anvil", 0.3); }
  }
  $("#svLoad").addEventListener("click", () => { const t = $("#svCode").value.trim(); if (!t) return msg("Сначала вставь код", false); doImport(t); });
  $("#svPick").addEventListener("change", (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => doImport(String(r.result)); r.readAsText(f); e.target.value = ""; });
  $("#svReset").addEventListener("click", () => {
    if (!confirm(`Сбросить весь прогресс профиля «${PF.me().nick}»? Ачивки, инвентари и настройки всех страниц пропадут.`)) return;
    PF.restore({}); location.reload();
  });
  $("#pfList").addEventListener("click", (e) => {
    const sw = e.target.closest("[data-sw]"), del = e.target.closest("[data-del]");
    if (sw) { PF.switchTo(sw.dataset.sw); location.reload(); }
    if (del) { const p = PF.list().find((x) => x.id === del.dataset.del); if (p && confirm(`Удалить профиль «${p.nick}» вместе с прогрессом?`)) { PF.remove(p.id); location.reload(); } }
  });
  $("#pfNew").addEventListener("submit", (e) => { e.preventDefault(); const n = $("#pfNewNick").value.trim(); if (!n) { $("#pfNewNick").focus(); return; } PF.create(n); location.reload(); });

  // аватар
  const avBtn = (k) => `<button type="button" data-av="${k}" class="${PF.me().avatar === k ? "on" : ""}" title="${k}"><img src="${PF.avatarUrl(k)}" alt=""></button>`;
  const openMd = (id) => { $(id).hidden = false; sfx("chest_open", 0.35, 1.2); };
  const closeMd = (m) => { m.hidden = true; };
  $("#pfAv").addEventListener("click", () => { $("#avMob").innerHTML = PF.AV_MOB.map(avBtn).join(""); $("#avMod").innerHTML = Object.keys(PF.AV_MOD).map(avBtn).join(""); openMd("#mdAv"); });
  $("#mdAv").addEventListener("click", (e) => { const b = e.target.closest("[data-av]"); if (!b) return; PF.update({ avatar: b.dataset.av }); sfx("equip", 0.5); closeMd($("#mdAv")); renderAll(); });
  $("#avPick").addEventListener("change", (e) => {
    const f = e.target.files[0]; if (!f) return;
    const img = new Image(); img.onload = () => {
      const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
      g.imageSmoothingEnabled = img.width > 64; const s = Math.min(img.width, img.height);
      g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 64, 64);
      PF.update({ avatar: c.toDataURL("image/png") }); URL.revokeObjectURL(img.src); closeMd($("#mdAv")); renderAll();
    };
    img.src = URL.createObjectURL(f); e.target.value = "";
  });
  $$(".md").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m || e.target.closest("[data-close]")) closeMd(m); }));
  addEventListener("keydown", (e) => { if (e.key === "Escape") { $$(".md").forEach(closeMd); if ($("#tw").classList.contains("full")) toggleFull(); } });

  // настройки
  const THEMES = [["sunset", "Закат"], ["night", "Ночь"], ["nether", "Незер"], ["end", "Энд"]];
  $("#themes").innerHTML = THEMES.map(([k, n]) => `<button type="button" data-t="${k}" class="th-${k}"><span>${n}</span></button>`).join("");
  $("#themes").addEventListener("click", (e) => { const b = e.target.closest("[data-t]"); if (!b) return; cfg.theme = b.dataset.t; saveCfg(); });
  $("#bSet").addEventListener("click", () => { $("#setMotion").checked = cfg.motion; $("#setSplash").checked = cfg.splash; $("#setDone").checked = cfg.done; openMd("#mdSet"); });
  $("#setMotion").addEventListener("change", (e) => { cfg.motion = e.target.checked; saveCfg(); });
  $("#setSplash").addEventListener("change", (e) => { cfg.splash = e.target.checked; saveCfg(); });
  $("#setDone").addEventListener("change", (e) => { cfg.done = e.target.checked; saveCfg(); ptRender(); });
  $$("#setView,#ptView").forEach((seg) => seg.addEventListener("click", (e) => { const b = e.target.closest("[data-v]"); if (!b) return; cfg.view = b.dataset.v; saveCfg(); }));

  /* ================= пункты ================= */
  let ptF = "all";
  const DIG = Array.from({ length: 600 }, () => (Math.random() * 10) | 0).join("");
  function ptRender() {
    const st = stats(), q = $("#ptSearch").value.trim().toLowerCase();
    const match = (p) => !q || String(p.n) === q.replace(/^№/, "") || pad2(p.n) === q || p.title.toLowerCase().includes(q);
    const list = ZM.POINTS.filter((p) => (ptF === "all" || (ptF === "live" && p.page) || (ptF === "soon" && !p.page) || (ptF === "todo" && p.page && st.per[p.n] && st.per[p.n].got < st.per[p.n].all)) && match(p));
    $("#pGrid").innerHTML = list.map((p) => {
      const pr = st.per[p.n];
      if (!p.page) return `<div class="pc soon ${p.n === 29 ? "secret" : ""}" style="--tone:${p.tone}"><span class="pc-n">${pad2(p.n)}</span><span class="pc-st">СКОРО</span><span class="pc-t">${esc(p.title)}</span><span class="pc-d">${p.date || "—"} ${p.confirmed ? "" : '<span class="q" title="Номер не подтверждён">?</span>'}</span></div>`;
      const pc = pr ? (pr.got / pr.all) * 100 : 0;
      return `<a class="pc live pc-${p.n} ${pr && pr.got === pr.all ? "full" : ""}" href="${p.page}" style="--tone:${p.tone}"><span class="pc-bg"${p.n === 1 ? ` data-d="${DIG}"` : ""}></span>
        <span class="pc-n">${pad2(p.n)}</span>${p.icon ? `<img class="pc-ic" src="${p.icon}" alt="">` : ""}
        <span class="pc-t">${esc(p.title)}</span><span class="pc-d">${p.date} ${p.confirmed ? "" : '<span class="q" title="Номер не подтверждён">?</span>'}</span>
        ${pr ? `<span class="pc-pr" style="--p:${pc}%"><i></i><b>★ ${pr.got}/${pr.all}</b></span>` : ""}</a>`;
    }).join("") || `<p class="pf-empty">Ничего не нашлось.</p>`;
    // найденные ачивки (только полученные: скрытые не выдаём)
    const found = q.length >= 2 && cfg.done ? HUB.flatMap((pt) => pt.adv.filter((a) => st.per[pt.n].g.has(a.key) && (a.t + " " + a.d).toLowerCase().includes(q)).map((a) => ({ a, pt }))) : [];
    $("#ptFound").innerHTML = found.slice(0, 12).map(({ a, pt }) => `<a href="${pt.page}#adv"><img src="${a.icon}" alt=""><span style="color:${a.c}">${esc(a.t.replace(/§[kr]/g, ""))}</span><small>№${pad2(pt.n)} ${esc(pt.title)}</small></a>`).join("");
    $("#ptQ").textContent = `${LIVE.length} из ${ZM.POINTS.length} готово`;
  }
  $("#ptFilter").addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (!b) return; ptF = b.dataset.f; $$("#ptFilter button").forEach((x) => x.classList.toggle("on", x === b)); ptRender(); });
  $("#ptSearch").addEventListener("input", ptRender);
  addEventListener("keydown", (e) => { if (e.key === "/" && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $("#points").scrollIntoView({ behavior: "smooth" }); setTimeout(() => $("#ptSearch").focus(), 350); } });

  /* ================= общее древо ================= */
  const TW = { x0: 30, step: 74, row: 64, y0: 30, pan: { x: 0, y: 0 }, s: 1, W: 0, H: 0 };
  const twIn = $("#twIn2"), twMap = $("#twMap"), twTip = $("#twTip");
  const nodes = [];   // {id, x, y, a, pt, root}
  function layout() {
    nodes.length = 0;
    const rows = HUB.length, yc = TW.y0 + ((rows - 1) * TW.row) / 2;
    nodes.push({ id: "root", x: TW.x0, y: yc - 4, a: ROOT, root: true });
    const c1 = TW.x0 + 60 + 44;
    HUB.forEach((pt, r) => {
      const y = TW.y0 + r * TW.row, depth = {};
      pt.adv.forEach((a) => { depth[a.key] = a.parent ? (depth[a.parent] ?? 0) + 1 : 0; nodes.push({ id: pt.n + ":" + a.key, x: c1 + depth[a.key] * TW.step, y, a, pt }); });
    });
    TW.W = Math.max(...nodes.map((n) => n.x)) + 52 + 230; TW.H = TW.y0 * 2 + (rows - 1) * TW.row + 52;
  }
  function treeRender(st) {
    const R = nodes[0], c1 = TW.x0 + 60 + 44, trunk = c1 - 22;
    let d = `M${R.x + 60} ${R.y + 30}H${trunk}M${trunk} ${TW.y0 + 26}V${TW.y0 + (HUB.length - 1) * TW.row + 26}`;
    HUB.forEach((pt, r) => {
      const y = TW.y0 + r * TW.row + 26; d += `M${trunk} ${y}H${c1}`;
      const ns = nodes.filter((n) => n.pt === pt);
      ns.forEach((n) => { if (!n.a.parent) return; const p = ns.find((m) => m.a.key === n.a.parent); if (p) d += `M${p.x + 52} ${y}H${n.x}`; });
    });
    const svg = $("#twLines"); svg.setAttribute("width", TW.W); svg.setAttribute("height", TW.H); svg.setAttribute("viewBox", `0 0 ${TW.W} ${TW.H}`);
    svg.innerHTML = `<path d="${d}" stroke="#000" stroke-width="6" fill="none" stroke-linecap="square"/><path d="${d}" stroke="#fff" stroke-width="2" fill="none"/>`;
    twMap.style.width = TW.W + "px"; twMap.style.height = TW.H + "px";
    $("#twNodes").innerHTML = nodes.map((n, i) => {
      if (n.root) return `<button type="button" class="tw-node root" data-i="${i}" style="left:${n.x}px;top:${n.y}px" aria-label="ZitraksMode"><span class="adv-frame task"></span><img src="${n.a.icon}" alt=""></button>`;
      const has = st.per[n.pt.n].g.has(n.a.key), show = has || !n.a.hidden;
      return `<button type="button" class="tw-node ${has ? "has" : "no"} ${twSel === i ? "sel" : ""}" data-i="${i}" style="left:${n.x}px;top:${n.y}px" aria-label="${show ? esc(n.a.t.replace(/§[kr]/g, "")) : "Скрытое достижение"}"><span class="adv-frame ${show ? n.a.frame : "task"}${has ? "" : " locked"}"></span>${show ? `<img src="${n.a.icon}" alt=""${has ? "" : ' style="filter:brightness(.55) saturate(.4)"'}>` : "<i>?</i>"}</button>`;
    }).join("") + HUB.map((pt, r) => { const last = nodes.filter((n) => n.pt === pt).pop(), p = st.per[pt.n];
      return `<span class="tw-lab" data-n="${pt.n}" style="left:${last.x + 64}px;top:${TW.y0 + r * TW.row + 18}px;--tone:${pt.tone}"><em>№${pad2(pt.n)}</em> ${esc(pt.title)} · ${p.got}/${p.all}</span>`; }).join("");
    $("#trQ").textContent = `${st.got} / ${st.all} · ${st.xp} XP`;
    $("#twRows").innerHTML = HUB.map((pt) => { const p = st.per[pt.n]; return `<a href="${pt.page}#adv" data-n="${pt.n}" style="--tone:${pt.tone}"><img src="${pt.icon}" alt=""><span>№${pad2(pt.n)} ${esc(pt.title)}</span><b>${p.got}/${p.all}</b><i style="width:${(p.got / p.all) * 100}%"></i></a>`; }).join("");
  }
  function applyPan() {
    const W = twIn.clientWidth, H = twIn.clientHeight, sw = TW.W * TW.s, sh = TW.H * TW.s, m = 60;
    TW.pan.x = sw + 2 * m <= W ? (W - sw) / 2 : clamp(TW.pan.x, W - sw - m, m);
    TW.pan.y = sh + 2 * m <= H ? (H - sh) / 2 : clamp(TW.pan.y, H - sh - m, m);
    twMap.style.transform = `translate(${TW.pan.x}px,${TW.pan.y}px) scale(${TW.s})`;
  }
  function zoomAt(f, cx, cy) {
    const s2 = clamp(TW.s * f, 0.45, 2); if (s2 === TW.s) return;
    TW.pan.x = cx - ((cx - TW.pan.x) * s2) / TW.s; TW.pan.y = cy - ((cy - TW.pan.y) * s2) / TW.s; TW.s = s2; applyPan(); hideTip();
  }
  function home() {
    const W = twIn.clientWidth, H = twIn.clientHeight;
    TW.s = clamp(Math.min(W / (TW.W + 20), H / (TW.H + 20)), 0.55, 1);
    if (W < 700) TW.s = 0.7;
    const R = nodes[0]; TW.pan.x = W < 700 ? 16 - R.x * TW.s : (W - TW.W * TW.s) / 2; TW.pan.y = H / 2 - (R.y + 30) * TW.s; applyPan();
  }
  // подсказка как в игре
  let twSel = -1;
  const obf = (t) => esc(t).replace(/§k(.*?)§r/g, (m, s) => `<span class="obf" data-n="${s.length}">${s}</span>`);
  function showTip(i, pin) {
    const n = nodes[i]; if (!n) return;
    const st = stats(), has = n.root || st.per[n.pt.n].g.has(n.a.key), show = has || (!n.root && !n.a.hidden);
    twTip.className = "tw-tip " + (has ? "has" : "no") + (pin ? " pin" : "");
    const fr = n.root ? "task" : n.a.frame, title = n.root ? "ZitraksMode" : show ? obf(n.a.t) : "???";
    const desc = n.root ? `${esc(ROOT.d)}<em>Получено ${st.got} из ${st.all} · ${st.xp} XP</em>` : show ? obf(n.a.d) : "Скрытое достижение. Откроется, когда получишь.";
    twTip.innerHTML = `<div class="tw-bar"><span class="tw-ic"><span class="adv-frame ${show ? fr : "task"}${has ? "" : " locked"}"></span>${show ? `<img src="${n.a.icon}" alt="">` : "<i>?</i>"}</span><b style="${has && n.a.c && !n.root ? `color:${n.a.c === "#FFFFFF" ? "#fff" : n.a.c}` : ""}">${title}</b></div>`
      + `<div class="tw-desc">${desc}${has && !n.root && n.a.xp ? `<em>+${n.a.xp} XP · ${{ task: "обычная", goal: "цель", challenge: "испытание" }[n.a.frame]}</em>` : ""}${pin && !n.root ? `<a href="${n.pt.page}#adv">№${pad2(n.pt.n)} ${esc(n.pt.title)} →</a>` : ""}</div>`;
    twTip.hidden = false;
    const frR = twTip.parentElement.getBoundingClientRect(), inR = twIn.getBoundingClientRect(), sz = n.root ? 60 : 52;
    const nx = inR.left - frR.left + TW.pan.x + n.x * TW.s - (sz * (1 - TW.s)) / 2 * 0, ny = inR.top - frR.top + TW.pan.y + n.y * TW.s + (sz * TW.s - 52) / 2;
    const tw = twTip.offsetWidth, flip = nx + tw > frR.width - 8, left = flip ? nx + sz * TW.s - tw : nx;
    twTip.style.left = clamp(left, 6, Math.max(6, frR.width - tw - 6)) + "px"; twTip.style.top = clamp(ny, 30, frR.height - twTip.offsetHeight - 6) + "px";
    twTip.classList.toggle("flip", flip); twTip.dataset.i = i;
  }
  const hideTip = () => { twTip.hidden = true; delete twTip.dataset.pin; };
  setInterval(() => { $$(".obf").forEach((o) => { const n = +o.dataset.n || 4; let s = ""; for (let i = 0; i < n; i++) s += "#$%&@*?!ƒ§¥"[(Math.random() * 11) | 0]; o.textContent = s; }); }, 90);
  // таскание, колесо, щипок
  const ptrs = new Map(); let drag = null, pinch = null;
  twIn.addEventListener("pointerdown", (e) => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); twIn.setPointerCapture(e.pointerId);
    if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, px: TW.pan.x, py: TW.pan.y, m: false };
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: TW.s }; drag = null; } });
  twIn.addEventListener("pointermove", (e) => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()], r = twIn.getBoundingClientRect(); zoomAt((pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d) / TW.s, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); return; }
    if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 5) drag.m = true; if (drag.m) { TW.pan.x = drag.px + dx; TW.pan.y = drag.py + dy; applyPan(); hideTip(); } return; }
    if (e.pointerType !== "mouse" || twTip.dataset.pin) return;
    const nd = document.elementFromPoint(e.clientX, e.clientY)?.closest(".tw-node");
    if (nd) { if (twTip.hidden || twTip.dataset.i !== nd.dataset.i) showTip(+nd.dataset.i); } else hideTip();
  });
  const up = (e) => {
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
    if (!drag || e.type === "pointercancel") { drag = null; return; }
    const moved = drag.m; drag = null; if (moved) return;
    const el = document.elementFromPoint(e.clientX, e.clientY), lab = el && el.closest(".tw-lab");
    if (lab) { setTab(+lab.dataset.n); return; }
    const nd = el && el.closest(".tw-node");
    if (!nd) { hideTip(); return; }
    const i = +nd.dataset.i; sfx("click", 0.35, 1.2);
    twSel = i; $$(".tw-node").forEach((b) => b.classList.toggle("sel", +b.dataset.i === i));
    showTip(i, true); twTip.dataset.pin = 1;
  };
  twIn.addEventListener("pointerup", up); twIn.addEventListener("pointercancel", up);
  twIn.addEventListener("pointerleave", () => { if (!twTip.dataset.pin && !drag) hideTip(); });
  twIn.addEventListener("wheel", (e) => { e.preventDefault(); const r = twIn.getBoundingClientRect(); if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top); else { TW.pan.x -= e.deltaX; applyPan(); } }, { passive: false });
  const mid = () => [twIn.clientWidth / 2, twIn.clientHeight / 2];
  $("#twIn").addEventListener("click", () => { zoomAt(1.25, ...mid()); sfx("click", 0.3, 1.3); });
  $("#twOut").addEventListener("click", () => { zoomAt(1 / 1.25, ...mid()); sfx("click", 0.3, 1.1); });
  $("#twHome").addEventListener("click", () => { home(); hideTip(); sfx("click", 0.3); });
  function toggleFull() { $("#tw").classList.toggle("full"); document.body.style.overflow = $("#tw").classList.contains("full") ? "hidden" : ""; hideTip(); requestAnimationFrame(() => { home(); sizeBg(); }); }
  $("#twFull").addEventListener("click", () => { toggleFull(); sfx("click", 0.3); });
  addEventListener("resize", () => { applyPan(); sizeBg(); });

  // живой фон окна корня: dynamic_bg.png, зеркально замощённый, медленно плывёт и сдвигается вслед за картой
  const bg = $("#twBg"), bgc = bg.getContext("2d"); let bgVis = false, tile = null;
  const bgImg = new Image();
  bgImg.onload = () => {   // 2×2 с зеркалами: стыков не видно
    const w = 620, h = Math.round((w * bgImg.height) / bgImg.width), c = document.createElement("canvas"); c.width = w * 2; c.height = h * 2;
    const g = c.getContext("2d");
    [[1, 1, 0, 0], [-1, 1, 2 * w, 0], [1, -1, 0, 2 * h], [-1, -1, 2 * w, 2 * h]].forEach(([sx, sy, tx, ty]) => { g.setTransform(sx, 0, 0, sy, tx, ty); g.drawImage(bgImg, 0, 0, w, h); });
    tile = c;
  };
  bgImg.src = U(ROOT.bg);
  function sizeBg() { const d = Math.min(2, devicePixelRatio || 1) * 0.75; bg.width = Math.ceil(twIn.clientWidth * d) || 1; bg.height = Math.ceil(twIn.clientHeight * d) || 1; }
  new IntersectionObserver((es) => { bgVis = es[0].isIntersecting; }).observe(twIn);
  const DIMS = [0.86, 0.6, 0.3, 0], DIM_RU = ["тёмный", "средний", "светлый", "как есть"];
  $("#twDim").addEventListener("click", () => { cfg.dim = (cfg.dim + 1) % DIMS.length; saveCfg(); sfx("click", 0.3, 1.2); $("#twDim").setAttribute("title", "Фон: " + DIM_RU[cfg.dim]); });
  let drift = 0, lastT = performance.now();
  function frame(t) {
    const dt = Math.min(0.1, (t - lastT) / 1000); lastT = t;
    if (bgVis && !twIn.hidden) {
      if (cfg.motion) drift += dt;
      const W = bg.width, Hh = bg.height, k = W / twIn.clientWidth;
      bgc.setTransform(1, 0, 0, 1, 0, 0); bgc.fillStyle = "#050505"; bgc.fillRect(0, 0, W, Hh);
      if (tile) {
        const sc = k * (0.85 + 0.15 * TW.s), tw = tile.width * sc, th = tile.height * sc;
        const ox = ((((TW.pan.x * 0.35 * k - drift * 9 * k) % tw) + tw) % tw) - tw, oy = ((((TW.pan.y * 0.35 * k - drift * 5 * k + Math.sin(drift * 0.4) * 12 * k) % th) + th) % th) - th;
        bgc.globalAlpha = 1;
        for (let x = ox; x < W; x += tw) for (let y = oy; y < Hh; y += th) bgc.drawImage(tile, x, y, tw, th);
        // затемнение, чтобы рамки читались, и мягкая волна света
        bgc.fillStyle = `rgba(6,6,8,${DIMS[cfg.dim] ?? 0.86})`; bgc.fillRect(0, 0, W, Hh);
        const gx = (Math.sin(drift * 0.25) * 0.5 + 0.5) * W, gr = bgc.createRadialGradient(gx, Hh * 0.45, 0, gx, Hh * 0.45, W * 0.5);
        gr.addColorStop(0, "rgba(255,255,255,.07)"); gr.addColorStop(1, "rgba(255,255,255,0)"); bgc.fillStyle = gr; bgc.fillRect(0, 0, W, Hh);
      }
    }
    requestAnimationFrame(frame);
  }

  /* ================= вкладки: ветка каждого пункта отдельно, как на страницах ================= */
  const TILE = { 1: "assets/textures/mc/stone.png", 2: "assets/textures/mc/p2/block_tnt_side.png", 3: "assets/textures/mc/stone.png", 4: "assets/textures/mc/stone.png", 5: "assets/textures/mc/p2/terrain/dirt.png",
    6: "assets/textures/p6/pink_wool.png", 7: "assets/textures/p7/v/end_stone_bricks.png", 8: "assets/textures/mc/quartz.png", 9: "assets/textures/p9/v/pink_wool.png", 10: "assets/textures/p10/lime_concrete.png", 11: "assets/textures/p11/blue_wool.png", 12: "assets/textures/p12/crimson_planks.png" };
  const FR_RU = { task: "обычная", goal: "цель", challenge: "испытание" };
  let tab = 0, ptSel = null;
  const aTitle = (a) => `<span style="color:${a.c && a.c !== "#FFFFFF" ? a.c : "#fff"}">${obf(a.t)}</span>`;
  function tabsRender(st) {
    $("#twTabs").innerHTML = `<button type="button" class="tw-tab root ${tab === 0 ? "on" : ""}" data-tab-n="0" data-tip="ZitraksMode · всё древо"><img src="${ROOT.icon}" alt=""></button>`
      + HUB.map((pt) => { const p = st.per[pt.n]; return `<button type="button" class="tw-tab ${tab === pt.n ? "on" : ""} ${p.got === p.all ? "full" : ""}" data-tab-n="${pt.n}" data-tip="№${pad2(pt.n)} ${esc(pt.title)} · ${p.got}/${p.all}"><img src="${pt.icon}" alt=""></button>`; }).join("");
  }
  function ptBoard(st) {
    const pt = HUB.find((x) => x.n === tab); if (!pt) return;
    const g = st.per[pt.n].g, list = pt.adv, open = list.filter((a) => g.has(a.key) || !a.hidden), hidden = list.length - open.length;
    if (!ptSel || !open.some((a) => a.key === ptSel)) { const o = open.filter((a) => g.has(a.key)); ptSel = o.length ? o[o.length - 1].key : open.length ? open[0].key : null; }
    $("#twBoard").style.setProperty("--tile", `url("${new URL(U(TILE[pt.n] || "assets/textures/mc/stone.png"), location.href).href}")`);
    const ic = (a, s) => `<img src="${a.icon}" alt="" style="width:${s}px;height:${s}px${g.has(a.key) ? "" : ";filter:brightness(.55) saturate(.4)"}">`;
    $("#twChain").innerHTML = open.length
      ? open.map((a, i) => (i ? `<div class="adv-link ${g.has(a.key) ? "on" : ""}"></div>` : "") + `<button type="button" class="adv-node ${ptSel === a.key ? "sel" : ""}" data-k="${a.key}"><span class="adv-frame ${a.frame}${g.has(a.key) ? "" : " locked"}"></span>${ic(a, 30)}</button>`).join("")
        + (hidden ? `<div class="adv-link"></div><div class="adv-more">+${hidden} скрыто</div>` : "")
      : `<div class="adv-empty">Тут пусто. Ачивки появляются, только когда получишь их.<br>Заходи на страницу пункта и добывай.</div>`;
    const a = list.find((x) => x.key === ptSel);
    if (!a) $("#twDetail").innerHTML = `<div class="big"><span class="adv-frame task locked"></span><span class="q">?</span></div><div class="txt"><div class="tt">???</div><div class="dd">Ни одной ачивки пока нет</div><div class="cc">В ветке ${list.length} ${plural(list.length, "ачивка", "ачивки", "ачивок")}, все скрыты</div></div>`;
    else {
      const has = g.has(a.key), par = list.find((x) => x.key === a.parent);
      $("#twDetail").innerHTML = `<div class="big"><span class="adv-frame ${a.frame}${has ? "" : " locked"}"></span>${ic(a, 34)}</div>
        <div class="txt"><div class="tt">${aTitle(a)}</div><div class="dd">${obf(a.d)}</div><div class="cc">${par ? `после «${g.has(par.key) || !par.hidden ? esc(par.t.replace(/§[kr]/g, "")) : "???"}»` : "первая в ветке, растёт от корня ZitraksMode"}</div></div>
        <div class="meta"><span class="st ${has ? "ok" : ""}">${has ? "ПОЛУЧЕНА" : "НЕ ПОЛУЧЕНА"}</span><span>Рамка: ${FR_RU[a.frame]}</span><span><b>+${a.xp} XP</b></span></div>`;
    }
    $("#twList").innerHTML = open.map((a) => { const has = g.has(a.key); return `<button type="button" class="adv-row ${has ? "has" : "locked"}" data-k="${a.key}"><span class="fr"><span class="adv-frame ${a.frame}${has ? "" : " locked"}"></span>${ic(a, 24)}</span>
        <span><span class="t">${aTitle(a)}</span><br><span class="d">${obf(a.d)}</span></span><span class="x">${has ? "✓ получена" : "не получена"}<br>+${a.xp} XP</span></button>`; }).join("")
      + (hidden ? `<div class="adv-row locked"><span class="fr"><span class="adv-frame task locked"></span><span class="q">?</span></span><span><span class="t">??? × ${hidden}</span><br><span class="d">Скрыты, пока не получишь</span></span></div>` : "");
    const n = list.filter((x) => g.has(x.key)).length, xp = list.filter((x) => g.has(x.key)).reduce((s, x) => s + x.xp, 0), xpAll = list.reduce((s, x) => s + x.xp, 0);
    $("#twPBar").style.width = (n / list.length) * 100 + "%"; $("#twPTxt").textContent = `${n} / ${list.length} · ${xp}/${xpAll} XP`;
    $("#twPGo").href = pt.page + "#adv";
  }
  function setTab(n) {
    tab = n; ptSel = null; hideTip(); sfx("click", 0.35, n ? 1.25 : 1);
    // A branch link from any point page must open the matching tab, not just
    // leave the visitor at an unrecognized #tree/NN fragment.
    const branchHash = n ? `#tree/${n}` : '#tree';
    if (location.hash !== branchHash) history.replaceState(null, '', branchHash);
    const pt = HUB.find((x) => x.n === n), st = stats();
    $("#tw").classList.toggle("pt", !!pt);
    $("#twIn2").hidden = !!pt; $("#twPt").hidden = !pt;
    $(".tw-title").textContent = pt ? `№${pad2(pt.n)} · ${pt.title}` : "ZitraksMode";
    tabsRender(st); if (pt) { ptBoard(st); $("#twPt").scrollTop = 0; } else requestAnimationFrame(() => { sizeBg(); home(); });
    const on = $("#twTabs .on"); if (on) on.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }
  $("#twTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-tab-n]"); if (b && +b.dataset.tabN !== tab) setTab(+b.dataset.tabN); });
  $("#twPt").addEventListener("click", (e) => { const b = e.target.closest("[data-k]"); if (!b) return; ptSel = b.dataset.k; sfx("click", 0.3, 1.2); ptBoard(stats()); });
  $("#twRows").addEventListener("click", (e) => { const a = e.target.closest("a"); if (!a || e.ctrlKey || e.metaKey) return; const n = +a.dataset.n; if (!n) return; e.preventDefault(); setTab(n); $("#tw").scrollIntoView({ behavior: "smooth", block: "center" }); });

  /* ================= гости, история ================= */
  $("#guests").innerHTML = ZM.GUEST_POINTS.map((g) => `<div>${esc(g.title)}<small>${esc(g.from)}</small></div>`).join("");
  const H = (ZM.HISTORY || []).slice().reverse(); let all = false;
  const tl = () => {
    $("#tl").innerHTML = (all ? H : H.slice(0, 8)).map((h) => { const p = ZM.POINTS.find((x) => x.page && x.date === h.date);
      return `<div class="${h.version ? "v" : ""}"><time>${h.date}</time>${h.version ? `<span class="ver">v${h.version}</span>` : ""}${p ? `<a class="pt-l" href="${p.page}">${esc(h.text)}</a>` : esc(h.text)}</div>`; }).join("");
    $("#tlMore").textContent = all ? "Свернуть" : `Показать всё (${H.length})`;
  };
  $("#tlMore").addEventListener("click", () => { all = !all; tl(); });

  /* ================= всё вместе ================= */
  function renderAll() { const st = stats(); heroRender(st); profileRender(st); ptRender(); treeRender(st); tabsRender(st); if (tab) ptBoard(st); PF.refresh(); }
  document.documentElement.style.scrollBehavior = "smooth";
  applyCfg(); layout(); tl(); renderAll();
  const followBranchLink = () => {
    const m = /^#tree\/(\d{1,2})$/.exec(location.hash);
    if (m && HUB.some((pt) => pt.n === +m[1])) {
      setTab(+m[1]);
      requestAnimationFrame(() => document.getElementById('tree').scrollIntoView({ block: 'start', behavior: 'instant' }));
    } else if (location.hash === '#tree' && tab) setTab(0);
  };
  followBranchLink();
  addEventListener('hashchange', followBranchLink);
  requestAnimationFrame(() => { sizeBg(); if (!tab) home(); requestAnimationFrame(frame); });
  // вернулся со страницы пункта: обновить прогресс
  addEventListener("pageshow", (e) => { if (e.persisted) renderAll(); });
  addEventListener("storage", (e) => { if (e.key && e.key.startsWith("zm:")) renderAll(); });
  ZM.hub = { stats, renderAll, TW, home };
})();
