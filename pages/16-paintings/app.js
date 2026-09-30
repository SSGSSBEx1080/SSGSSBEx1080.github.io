/* №16 · Картины. Выбор картины — как в Painting.create (1.19.2): из тега placeable берутся все, что выживают
   на этом месте, остаются только максимальные по площади, из них случайная. Смещение чётных размеров — как в
   HangingEntity.recalculateBoundingBox: по ширине на полблока вправо (если смотреть на стену), по высоте на полблока вверх. */
(function () {
  const { $, $$, esc } = ZM, K = ZM.kit, U = ZM.url;
  ZM.topbar({ crumb: "№16 · Картины", ...ZM.pointNav(16) });
  const T = (p, ext = "png") => U(`assets/textures/p16/${p}.${ext}`);
  const snd = K.sounds("p16");
  const L = ZM.P16L;
  const ALL = [
    ...Object.entries(L.mod).map(([n, [w, h]]) => ({ n, w, h, mod: true, src: T("paint/" + n, "webp") })),
    ...Object.entries(L.van).map(([n, [w, h]]) => ({ n, w, h, mod: false, src: T("v/" + n) })),
  ];
  const MOD = ALL.filter((p) => p.mod), byName = Object.fromEntries(ALL.map((p) => [p.n, p]));
  const pct = (x) => (x * 100).toFixed(x < 0.1 ? 1 : 0).replace(".", ",") + "%";
  const sizeKey = (p) => `${p.w}×${p.h}`;
  let adv = null;

  // вписать раму с пропорцией w:h в коробку maxW×maxH
  function fit(el, w, h, maxW, maxH) { const k = Math.min(maxW / w, maxH / h); el.style.width = Math.round(w * k) + "px"; el.style.height = Math.round(h * k) + "px"; }
  const heroBox = () => { const m = innerWidth < 640; return [Math.min($("#spot").clientWidth - 40, m ? 320 : 460), m ? 250 : 400]; };
  /* ================= HERO: прожектор ================= */
  const heroList = MOD.filter((p) => p.n !== "epic");
  let heroI = Math.floor(Math.random() * heroList.length), heroCur = null;
  addEventListener("resize", () => heroCur && fit($("#spotFrame"), heroCur.w, heroCur.h, ...heroBox()));
  function heroShow() {
    const p = heroList[heroI % heroList.length], f = $("#spotFrame"), im = $("#spotImg");
    f.classList.add("out");
    setTimeout(() => {
      im.src = p.src; im.alt = p.n; fit(f, p.w, p.h, ...heroBox()); f.dataset.p = p.n; heroCur = p;
      $("#spotCap").innerHTML = `<b>${esc(p.n)}</b><span>${p.w}×${p.h} бл. · холст, пиксели · ZitraksMode, 2026</span>`;
      f.classList.remove("out");
    }, 380);
  }
  heroShow(); setInterval(() => { if (!document.hidden && scrollY < innerHeight) { heroI++; heroShow(); } }, 5200);
  $("#spotFrame").addEventListener("click", () => openP($("#spotFrame").dataset.p));

  /* ================= 01 ЗАЛ ================= */
  const SIZES = [...new Set(MOD.filter((p) => p.n !== "epic").map(sizeKey))].sort((a, b) => { const [aw, ah] = a.split("×").map(Number), [bw, bh] = b.split("×").map(Number); return aw * ah - bw * bh || aw - bw; });
  let filt = "all";
  $("#chips").innerHTML = `<button type="button" class="on" data-s="all">все · 18</button>` + SIZES.map((s) => `<button type="button" data-s="${s}">${s} · ${MOD.filter((p) => sizeKey(p) === s).length}</button>`).join("");
  $("#chips").addEventListener("click", (e) => { const b = e.target.closest("[data-s]"); if (!b) return; filt = b.dataset.s; $$("#chips button").forEach((x) => x.classList.toggle("on", x === b)); drawSalon(); ZM.sfx("click", 0.3); });
  function drawSalon() {
    const list = MOD.filter((p) => p.n !== "epic").sort((a, b) => b.w * b.h - a.w * a.h || b.h - a.h);
    $("#salon").innerHTML = list.map((p) => `<button type="button" class="pg-pt ${filt === "all" || sizeKey(p) === filt ? "" : "dim"}" data-p="${p.n}" style="grid-column:span ${p.w};grid-row:span ${p.h}" aria-label="${p.n}, ${p.w} на ${p.h}">
      <span class="pg-frame gold"><img src="${p.src}" alt="" loading="lazy"></span><span class="pg-lbl"><b>${esc(p.n)}</b>${p.w}×${p.h}</span></button>`).join("");
  }
  drawSalon();
  $("#salon").addEventListener("click", (e) => { const b = e.target.closest("[data-p]"); if (b) openP(b.dataset.p); });

  /* ================= модалка ================= */
  let cur = null;
  function exactOdds(p) { const g = ALL.filter((q) => q.w === p.w && q.h === p.h), sameArea = ALL.filter((q) => q.w * q.h === p.w * p.h); return { g, sameArea }; }
  function openP(n) {
    const p = byName[n]; if (!p) return; cur = p;
    $("#mImg").src = p.src; $("#mImg").alt = p.n; const mob = innerWidth < 640; fit($("#mFrame"), p.w, p.h, mob ? innerWidth - 80 : Math.min(540, innerWidth * 0.5), innerHeight * (mob ? 0.42 : 0.62));
    $("#mId").textContent = (p.mod ? "zitraksmode:" : "minecraft:") + p.n; $("#mName").textContent = p.n;
    const { g } = exactOdds(p), mods = g.filter((q) => q.mod).length;
    $("#mDl").innerHTML = `<dt>Размер</dt><dd>${p.w} × ${p.h} блоков</dd><dt>В игре</dt><dd>${p.w * 16} × ${p.h * 16} px</dd>
      <dt>Того же размера</dt><dd>${g.length} ${K.plural(g.length, "картина", "картины", "картин")} (мод ${mods}, ваниль ${g.length - mods})</dd>
      <dt>Шанс в нише ${p.w}×${p.h}</dt><dd><b>${pct(1 / g.length)}</b></dd>`;
    $("#mFind").hidden = !p.mod;
    $("#modal").hidden = false; ZM.sfx("click", 0.4); $("#mClose").focus({ preventScroll: true });
  }
  const closeM = () => ($("#modal").hidden = true);
  $("#mClose").addEventListener("click", closeM);
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeM(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") closeM(); });
  $("#mFind").addEventListener("click", () => { closeM(); if (cur) nicheFor(cur.w, cur.h); });

  /* ================= 02 СТЕНА ================= */
  const W = 20, H = 16;
  const S = { solid: new Uint8Array(W * H).fill(1), hung: [], tool: "hang", hover: null };
  const at = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const cellsEl = $("#cells"), hungEl = $("#hung"), ghostEl = $("#ghosts"), grid = $("#wallGrid");
  cellsEl.innerHTML = Array.from({ length: W * H }, (_, i) => `<i data-i="${i}"></i>`).join("");
  const occ = () => { const o = new Int16Array(W * H).fill(-1); S.hung.forEach((p, k) => { for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) o[y * W + x] = k; }); return o; };
  // область картины w×h с якорем (ax, ay); y сверху вниз
  function region(ax, ay, w, h) {
    const x0 = w % 2 ? ax - (w - 1) / 2 : ax - w / 2 + 1;
    const y0 = h % 2 ? ay - (h - 1) / 2 : ay - h / 2;
    return { x: x0, y: y0, w, h };
  }
  function survives(r, o) {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { if (!at(x, y) || !S.solid[y * W + x] || o[y * W + x] >= 0) return false; }
    return true;
  }
  function candidates(ax, ay) {
    const o = occ(); if (!S.solid[ay * W + ax] || o[ay * W + ax] >= 0) return { fit: [], top: [], area: 0 };
    const fit = ALL.filter((p) => survives(region(ax, ay, p.w, p.h), o));
    const area = fit.reduce((m, p) => Math.max(m, p.w * p.h), 0);
    return { fit, top: fit.filter((p) => p.w * p.h === area), area };
  }
  function drawCells() {
    cellsEl.querySelectorAll("i").forEach((c, i) => c.classList.toggle("air", !S.solid[i]));
  }
  const place = (el, r) => Object.assign(el.style, { left: (r.x / W) * 100 + "%", top: (r.y / H) * 100 + "%", width: (r.w / W) * 100 + "%", height: (r.h / H) * 100 + "%" });
  function drawHung(fresh) {
    hungEl.innerHTML = "";
    S.hung.forEach((p, k) => {
      const d = document.createElement("button"); d.type = "button"; d.className = "pg-hp" + (fresh === k ? " fresh" : "") + (p.mod ? " mod" : ""); d.dataset.k = k;
      d.innerHTML = `<img src="${byName[p.n].src}" alt="${esc(p.n)}"><span>${esc(p.n)}</span>`; d.setAttribute("aria-label", `снять ${p.n}`);
      place(d, p); hungEl.appendChild(d);
    });
  }
  function drawGhosts(c, ax, ay) {
    ghostEl.innerHTML = "";
    if (!c || !c.top.length || S.tool !== "hang") return;
    const shapes = [...new Set(c.top.map(sizeKey))];
    shapes.forEach((s) => { const [w, h] = s.split("×").map(Number), d = document.createElement("i"); place(d, region(ax, ay, w, h)); d.dataset.s = s; ghostEl.appendChild(d); });
    const a = document.createElement("b"); place(a, { x: ax, y: ay, w: 1, h: 1 }); ghostEl.appendChild(a);
  }
  function side(c, picked) {
    const el = $("#cand");
    if (!c) { el.innerHTML = `<h3>Сюда влезет</h3><p class="pg-dim">Наведи на стену (на телефоне просто тыкай): тут будет список кандидатов и шансы.</p>`; return; }
    if (!c.fit.length) { el.innerHTML = `<h3>Сюда влезет</h3><p class="pg-bad">Ничего. Нужна сплошная стена за картиной и никаких других картин на пути.</p>`; return; }
    const groups = {}; c.fit.forEach((p) => (groups[p.w * p.h] = groups[p.w * p.h] || []).push(p));
    const areas = Object.keys(groups).map(Number).sort((a, b) => b - a);
    const chip = (p, win) => `<span class="pg-cn ${p.mod ? "mod" : ""} ${picked === p.n ? "got" : ""}" title="${p.mod ? "zitraksmode" : "minecraft"}:${p.n}"><img src="${p.src}" alt="">${esc(p.n)}${win ? `<em>${pct(1 / c.top.length)}</em>` : ""}</span>`;
    el.innerHTML = `<h3>Сюда влезет ${c.fit.length} ${K.plural(c.fit.length, "картина", "картины", "картин")}</h3>` + areas.map((a, i) => `<div class="pg-grp ${i ? "lose" : "win"}"><div class="pg-grp-h">${i ? "проиграли по площади" : "самые большие, из них случайная"}<span>площадь ${a}</span></div><div class="pg-grp-l">${(i ? groups[a].slice(0, 6) : groups[a]).map((p) => chip(p, !i)).join("")}${i && groups[a].length > 6 ? `<span class="pg-more">+${groups[a].length - 6}</span>` : ""}</div></div>`).join("");
  }
  function cellOf(e) { const r = grid.getBoundingClientRect(), x = Math.floor(((e.clientX - r.left) / r.width) * W), y = Math.floor(((e.clientY - r.top) / r.height) * H); return at(x, y) ? [x, y] : null; }
  let lastKey = "";
  grid.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return; const c = cellOf(e); if (!c) return; const k = c.join(","); if (k === lastKey) return; lastKey = k;
    if (e.target.closest(".pg-hp")) { drawGhosts(null); return; }
    const cd = candidates(...c); drawGhosts(cd, ...c); side(cd);
  });
  grid.addEventListener("pointerleave", () => { lastKey = ""; drawGhosts(null); });
  let collected = new Set(ZM.store.get("p16.coll", []));
  function drawColl() {
    $("#collN").textContent = collected.size; $("#collBar").style.width = (collected.size / 19) * 100 + "%";
    $("#collG").innerHTML = MOD.map((p) => `<span class="${collected.has(p.n) ? "on" : ""}" title="${p.n}">${collected.has(p.n) ? `<img src="${p.src}" alt="">` : "?"}</span>`).join("");
  }
  grid.addEventListener("click", (e) => {
    const hp = e.target.closest(".pg-hp");
    if (hp) { const p = S.hung.splice(+hp.dataset.k, 1)[0]; snd("paint_break", 0.6); drawHung(); side(null); drawGhosts(null); lastKey = ""; hot(`Сняли ${p.n}. Выпала обычная «Картина».`); return; }
    const c = cellOf(e); if (!c) return; const [x, y] = c;
    if (S.tool === "pick") {
      const i = y * W + x; if (occ()[i] >= 0) { hot("Сначала сними картину", true); return; }
      S.solid[i] = S.solid[i] ? 0 : 1; snd(S.solid[i] ? "stone" : "stone_break", 0.5); drawCells(); lastKey = ""; return;
    }
    const cd = candidates(x, y);
    if (!cd.top.length) { side(cd); ZM.sfx("click", 0.3, 0.6); hot(S.solid[y * W + x] ? "Не влезает даже 1×1" : "Картину не на что повесить: тут дыра", true); return; }
    const p = cd.top[Math.floor(Math.random() * cd.top.length)], r = region(x, y, p.w, p.h);
    S.hung.push({ n: p.n, mod: p.mod, ...r }); snd("paint", 0.7); drawHung(S.hung.length - 1); side(cd, p.n); drawGhosts(null); lastKey = "";
    hot(`${p.mod ? "zitraksmode" : "minecraft"}:${p.n} · ${p.w}×${p.h} · шанс был ${pct(1 / cd.top.length)}`);
    if (p.mod && !collected.has(p.n)) { collected.add(p.n); ZM.store.set("p16.coll", [...collected]); drawColl(); if (collected.size === 19) { snd("levelup", 0.5); K.say("Вся коллекция собрана. Музей гордится тобой."); } }
    if (p.n === "boobs") adv.grant("boobs");
  });
  let hotT = 0;
  function hot(t, bad) { const h = $("#hot"); h.textContent = t; h.className = "pg-hot on" + (bad ? " bad" : ""); clearTimeout(hotT); hotT = setTimeout(() => h.classList.remove("on"), 3200); }
  $$(".pg-seg [data-tool]").forEach((b) => b.addEventListener("click", () => { S.tool = b.dataset.tool; $$(".pg-seg [data-tool]").forEach((x) => x.classList.toggle("on", x === b)); grid.classList.toggle("pick", S.tool === "pick"); drawGhosts(null); ZM.sfx("click", 0.3); }));
  $("#clearP").addEventListener("click", () => { if (!S.hung.length) return; S.hung = []; snd("paint_break", 0.6); drawHung(); side(null); });
  // стены-заготовки
  function fillHoles() { S.solid.fill(0); }
  function carve(x0, y0, w, h) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (at(x, y)) S.solid[y * W + x] = 1; }
  function preset(v) {
    S.hung = [];
    if (v === "bare") S.solid.fill(1);
    else if (v === "rooms") { fillHoles(); [[1, 1, 1, 1], [3, 1, 2, 1], [6, 1, 1, 2], [8, 1, 2, 2], [11, 1, 3, 2], [15, 1, 4, 2], [1, 5, 4, 3], [6, 5, 4, 4], [11, 5, 4, 3], [16, 5, 3, 3], [1, 10, 4, 4], [7, 10, 2, 1], [10, 10, 1, 1], [12, 10, 7, 5]].forEach((r) => carve(...r)); }
    else if (v === "n43") { fillHoles(); carve(8, 6, 4, 3); }
    else if (v === "n11") { fillHoles(); carve(9, 7, 1, 1); }
    else if (v === "swiss") { S.solid.fill(1); let s = 7; for (let i = 0; i < W * H; i++) { s = (s * 16807) % 2147483647; if (s % 100 < 14) S.solid[i] = 0; } }
    drawCells(); drawHung(); side(null); drawGhosts(null);
  }
  $("#preset").addEventListener("change", (e) => { preset(e.target.value); snd("stone", 0.4); });
  function nicheFor(w, h) {
    S.hung = []; fillHoles(); const x0 = Math.floor((W - w) / 2), y0 = Math.floor((H - h) / 2); carve(x0, y0, w, h);
    drawCells(); drawHung(); $("#preset").value = ""; $("#wall").scrollIntoView({ behavior: "smooth", block: "start" });
    const ax = w % 2 ? x0 + (w - 1) / 2 : x0 + w / 2 - 1, ay = h % 2 ? y0 + (h - 1) / 2 : y0 + h / 2;
    const cd = candidates(ax, ay); side(cd); setTimeout(() => { drawGhosts(cd, ax, ay); hot(`Ниша ${w}×${h} готова: кликай в подсвеченную клетку`); }, 500);
  }
  $("#epicTry").addEventListener("click", () => nicheFor(16, 16));
  $("#collReset").addEventListener("click", () => { collected = new Set(); ZM.store.set("p16.coll", []); drawColl(); });
  preset("bare"); drawColl();

  /* ================= 04 ШАНСЫ ================= */
  const allSizes = [...new Set(ALL.map(sizeKey))].sort((a, b) => { const [aw, ah] = a.split("×").map(Number), [bw, bh] = b.split("×").map(Number); return aw * ah - bw * bh || bh - ah; });
  $("#oddsT").innerHTML = `<div class="pg-or h"><span>ниша</span><span>мод</span><span>ваниль</span><span>шанс одной картины</span></div>` + allSizes.map((s) => {
    const [w, h] = s.split("×").map(Number), g = ALL.filter((p) => p.w === w && p.h === h), m = g.filter((p) => p.mod), v = g.filter((p) => !p.mod);
    const thumbs = (arr) => arr.map((p) => `<img src="${p.src}" alt="${p.n}" title="${p.n}" style="aspect-ratio:${p.w}/${p.h}">`).join("") || `<i>—</i>`;
    return `<div class="pg-or ${m.length ? "" : "vo"}"><span class="pg-sz"><i style="aspect-ratio:${w}/${h}"></i>${s}</span><span>${thumbs(m)}</span><span>${thumbs(v)}</span><span><b>${pct(1 / g.length)}</b><small>${m.length ? `${pct(m.length / g.length)}, что выпадет картина мода` : "мод не лезет"}</small></span></div>`;
  }).join("");

  /* ================= ачивка / история / финал ================= */
  adv = K.adv({ list: ZM.P16.advancements, store: "p16.adv", icon: (a) => T("i/" + a.icon), intro: "Одна скрытая ачивка. Подсказка — в таблице шансов." });
  K.timeline($("#tl"), [
    { date: "30.04.2026", t: "Картины", d: "19 своих картин в теге placeable, от 1×1 до 16×16, и ачивка BOOBSLANDER. В том же апдейте — хентай-блок и Коран.", c: "#d9a55b" },
  ]);

  /* ================= /summon ================= */
  (function cmd() {
    const mods = ALL.filter((p) => p.mod);
    let cur = mods.find((p) => p.n === "boobs") || mods[0], look = "north";
    // куда смотрит игрок → куда смотрит картина (facing, get2DDataValue: S0 W1 N2 E3)
    const DIR = { north: ["север", 0, "юг"], south: ["юг", 2, "север"], west: ["запад", 3, "восток"], east: ["восток", 1, "запад"] };
    $("#cmdPick").innerHTML = mods.map((p) => `<button type="button" data-n="${p.n}" title="${p.n}"><img src="${p.src}" alt="" style="aspect-ratio:${p.w}/${p.h}"><span>${p.w}×${p.h}</span></button>`).join("");
    $("#cmdDir").innerHTML = `<span>Ты смотришь на</span>` + Object.entries(DIR).map(([k, [ru]]) => `<button type="button" data-d="${k}">${ru}</button>`).join("");
    function draw() {
      $$("#cmdPick button").forEach((b) => b.classList.toggle("on", b.dataset.n === cur.n));
      $$("#cmdDir button").forEach((b) => b.classList.toggle("on", b.dataset.d === look));
      $("#cmdPrev").innerHTML = `<img src="${cur.src}" alt="" style="aspect-ratio:${cur.w}/${cur.h};${cur.w >= cur.h ? "width:min(100%,260px)" : "height:180px"}"><div><b>${cur.n}</b><small>${cur.w}×${cur.h} блоков · картина смотрит на ${DIR[look][2]}</small></div>`;
      $("#cmdCode").textContent = `/summon minecraft:painting ~ ~1 ~ {variant:"zitraksmode:${cur.n}",facing:${DIR[look][1]}b}`;
    }
    $("#cmdPick").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; cur = mods.find((p) => p.n === b.dataset.n); ZM.sfx("click", 0.4); draw(); });
    $("#cmdDir").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; look = b.dataset.d; ZM.sfx("click", 0.4); draw(); });
    $("#cmdCopy").addEventListener("click", () => { ZM.copy($("#cmdCode").textContent); ZM.sfx("orb", 0.5); K.say("Команда скопирована"); });
    draw();
  })();

  /* ================= тонкости ================= */
  (function fine() {
    const F = [
      ["Ачивку дают, даже если не вешал", "BOOBSLANDER засчитывается, когда картина появляется в мире. Для игры это случается и тогда, когда чанк с уже висящей картиной просто подгружается. Подойди к чужой картине, и ачивка твоя."],
      ["Получает ближайший", "Ачивка уходит ближайшему игроку в радиусе 8 блоков, а не тому, кто кликнул. Творческий режим не мешает, режим наблюдателя — мешает."],
      ["Командой тоже считается", "Картина boobs, вызванная через /summon, даёт ту же ачивку. Проверяется только то, что она появилась."],
      ["Выбранная картина не сохраняется", "Сломал картину — выпадает обычная «Картина» без памяти. Повесишь снова — жребий заново, и может выпасть совсем другая."],
      ["Держится на каждом блоке", "Картина — сущность, а не блок. Её сбивает стрела, взрыв или пропажа любого блока стены позади. Эпик держится на 256 блоках, и чтобы уронить его, хватит выбить один."],
      ["Эпику нужна площадь", "Точка клика — это не угол картины, а место около её центра. Ровная стена 16×16 должна быть вокруг него, иначе эпик не поместится и выпадет что-то поменьше."],
      ["Свои картины через ресурспак", "Текстуры лежат в textures/painting. Ресурспаком их можно заменить на свои с теми же именами и пропорциями, а размер на стене останется прежним."],
      ["Ванильные стали реже", "Мод не заменяет ванильные картины, а добавляет свои к ним. В нише 1×1 раньше было 7 кандидатов, теперь 11: у каждой ванильной шанс упал с 14% до 9%. У ниши 4×3 было 2 кандидата, стало 5."],
    ];
    $("#fineBox").innerHTML = F.map(([t, d], i) => `<article class="pnl"><span>${["I", "II", "III", "IV", "V", "VI", "VII", "VIII"][i]}</span><b>${esc(t)}</b><p>${esc(d)}</p></article>`).join("");
  })();
  K.finNav(16, $("#finNav"));
  ZM.reveal && ZM.reveal();
})();
