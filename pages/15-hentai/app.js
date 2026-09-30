/* №15 · Хентай-блок. Логика граней — как в HentaiBlockEntity.randomizeTextures. */
(function () {
  const { $, $$, esc } = ZM, K = ZM.kit, U = ZM.url;
  ZM.topbar({ crumb: "№15 · Хентай-блок", ...ZM.pointNav(15) });
  const T = (p, ext = "png") => U(`assets/textures/p15/${p}.${ext}`);
  const snd = K.sounds("p15");
  const L = ZM.P15L, POOL = { pron: 165, hentai: 167, meme: 121 };
  const FACES = ["north", "south", "east", "west", "up", "down"], FCL = { north: "f-n", south: "f-s", east: "f-e", west: "f-w", up: "f-u", down: "f-d" };
  const FRU = { north: "север", south: "юг", east: "восток", west: "запад", up: "верх", down: "низ" };
  const MEME_CHANCE = 0.05, PENALTY = 0.3;
  let adv = null;

  /* ================= 18+ ================= */
  if (!ZM.store.get("p15.age", false)) $("#gate").hidden = false;
  $("#gateYes").addEventListener("click", () => { ZM.store.set("p15.age", true); $("#gate").hidden = true; ZM.sfx("click"); });
  $("#gateNo").addEventListener("click", () => { ZM.sfx("click"); location.href = U("pages/16-paintings/index.html"); });

  /* ================= цензура: мозаика кодом, вместо откровенных текстур ================= */
  const cache = {};
  function mosaic(cat, num) {
    const k = cat + num; if (cache[k]) return cache[k];
    const c = document.createElement("canvas"); c.width = c.height = 16; const x = c.getContext("2d");
    let s = num * 9301 + (cat === "pron" ? 49297 : 23333); const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const pal = cat === "pron" ? ["#ff9000", "#cc6f00", "#ffb04d", "#7a3d00", "#1a1a1a", "#ffd199"] : ["#ff5fa8", "#b8307a", "#ff9fd0", "#6a1a55", "#2a0d2a", "#ffd0ea"];
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { x.fillStyle = pal[(rnd() * pal.length) | 0]; x.fillRect(i, j, 1, 1); }
    return (cache[k] = c.toDataURL());
  }
  const faceName = (key) => { const [cat, raw] = key.split("/"); return ({ pron: "Порно грань ", hentai: "Хентай грань ", meme: "Мем грань " })[cat] + (/^\d+$/.test(raw) ? "№" + raw : raw.replace(/_/g, " ")); };
  function faceHtml(key, locked) {
    const [cat, raw] = key.split("/");
    const body = cat === "meme" ? `<img src="${T("meme/" + raw, "webp")}" alt="">` : `<img src="${mosaic(cat, +raw)}" alt=""><span class="cz">18+</span>`;
    return body + `<span class="lb ${"c-" + cat}">${esc(faceName(key))}</span>` + (locked ? `<span class="lk">🔒</span>` : "");
  }

  /* ================= состояние блока ================= */
  const B = { tex: {}, lock: {}, placed: false };
  FACES.forEach((f) => { B.tex[f] = "hentai/1"; B.lock[f] = false; });
  function pool(cat) {
    const items = cat === "meme" ? L.memes.slice() : Array.from({ length: POOL[cat] }, (_, i) => String(i + 1));
    const w = items.map(() => 1);
    return { pick() { const sum = w.reduce((a, b) => a + b, 0); let r = Math.random() * sum; for (let i = 0; i < items.length; i++) { r -= w[i]; if (r <= 0) { w[i] *= PENALTY; return items[i]; } } return items[items.length - 1]; } };
  }
  function randomize() {
    const un = FACES.filter((f) => !B.lock[f]);
    for (let i = un.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [un[i], un[j]] = [un[j], un[i]]; }
    const nP = Math.floor(un.length / 2), P = pool("pron"), H = pool("hentai"), M = pool("meme");
    un.forEach((f, i) => { const cat = i < nP ? "pron" : "hentai"; B.tex[f] = Math.random() < MEME_CHANCE ? "meme/" + M.pick() : cat + "/" + (cat === "pron" ? P : H).pick(); });
    const memes = FACES.filter((f) => B.tex[f].startsWith("meme/")).length;   // считаются все шесть граней, закреплённые тоже
    if (memes >= 2) adv.grant("meme_faces");
    collect(FACES.map((f) => B.tex[f]), memes);
  }

  /* ================= куб ================= */
  function buildCube(el, size, interactive) {
    el.style.setProperty("--h", size / 2 + "px");
    el.innerHTML = FACES.map((f) => `<div class="hb-face ${FCL[f]}" data-f="${f}"></div>`).join("");
  }
  const big = $("#bigCube"), mini = $("#heroCube");
  const bigSize = () => big.clientWidth || 240;
  buildCube(big, bigSize(), true); buildCube(mini, mini.clientWidth || 220);
  addEventListener("resize", () => { big.style.setProperty("--h", bigSize() / 2 + "px"); mini.style.setProperty("--h", (mini.clientWidth || 220) / 2 + "px"); });
  function render() {
    FACES.forEach((f) => { const el = big.querySelector(`[data-f=${f}]`); el.innerHTML = faceHtml(B.tex[f], B.lock[f]); el.classList.toggle("locked", B.lock[f]); el.classList.toggle("meme", B.tex[f].startsWith("meme/")); });
    $("#faceList").innerHTML = FACES.map((f) => { const cat = B.tex[f].split("/")[0]; return `<button type="button" data-f="${f}" class="${B.lock[f] ? "on" : ""}"><i>${FRU[f]}</i><span class="c-${cat}">${esc(faceName(B.tex[f]))}</span><em>${B.lock[f] ? "🔒" : ""}</em></button>`; }).join("");
    odds();
  }
  // мини-куб в hero: крутится и сам перебрасывает грани
  function renderMini() { const P = pool("pron"), H = pool("hentai"), M = pool("meme"); FACES.forEach((f, i) => { const k = Math.random() < 0.18 ? "meme/" + M.pick() : i % 2 ? "pron/" + P.pick() : "hentai/" + H.pick(); mini.querySelector(`[data-f=${f}]`).innerHTML = faceHtml(k, false).replace(/<span class="lb[^]*?<\/span>/, ""); }); }
  renderMini(); setInterval(renderMini, 3500);

  let rot = { x: -22, y: 35 }, drag = null;
  const scene = $("#scene"), apply = () => (big.style.transform = `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`);
  apply();
  scene.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, rx: rot.x, ry: rot.y, moved: false, t: e.target }; try { scene.setPointerCapture(e.pointerId); } catch (_) {} });
  scene.addEventListener("pointermove", (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.hypot(dx, dy) > 5) drag.moved = true; rot.y = drag.ry + dx * 0.5; rot.x = Math.max(-80, Math.min(80, drag.rx - dy * 0.5)); apply(); });
  scene.addEventListener("pointerup", (e) => {
    if (!drag) return; const d = drag; drag = null; if (d.moved) return;
    const el = document.elementFromPoint(e.clientX, e.clientY); const f = el && el.closest(".hb-face"); if (f && big.contains(f)) toggle(f.dataset.f);
  });
  scene.addEventListener("pointercancel", () => (drag = null));
  let barT = 0;
  function bar(t) { const b = $("#actionBar"); b.textContent = t; b.classList.add("on"); clearTimeout(barT); barT = setTimeout(() => b.classList.remove("on"), 2200); }
  function toggle(f) {
    if (!B.placed) { K.say("Сначала поставь блок"); return; }
    B.lock[f] = !B.lock[f]; ZM.sfx("click", 0.5); bar(`${faceName(B.tex[f])} ${B.lock[f] ? "сохранена." : "снова случайная."}`); render();
  }
  $("#faceList").addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (b) toggle(b.dataset.f); });
  let dropItem = null;
  function place() {
    if (dropItem) { Object.assign(B.tex, dropItem.tex); Object.assign(B.lock, dropItem.lock); dropItem = null; $("#drop").hidden = true; }
    randomize(); B.placed = true; $("#place").textContent = "Поставить заново"; snd("place", 0.6); adv.grant("place_hentai"); render();
    big.animate([{ transform: big.style.transform + " scale(.85)" }, { transform: big.style.transform }], { duration: 250, easing: "cubic-bezier(.3,1.6,.5,1)" });
  }
  $("#place").addEventListener("click", place);
  $("#unlock").addEventListener("click", () => { FACES.forEach((f) => (B.lock[f] = false)); ZM.sfx("click"); render(); });
  $("#break").addEventListener("click", () => {
    if (!B.placed) { K.say("Блока и так нет"); return; }
    const any = FACES.some((f) => B.lock[f]); snd("break", 0.5);
    dropItem = any ? { tex: { ...B.tex }, lock: { ...B.lock } } : null;
    const d = $("#drop"); d.hidden = false;
    d.innerHTML = `<span class="k-slot"><img src="${T("hentai_block")}" alt=""></span><div class="mc-tt"><span class="n" style="color:#fff">Блок Порнухи/Хентая</span>${any ? `<span class="n" style="color:#aaa">+NBT: ${FACES.filter((f) => B.lock[f]).length} закреплённых граней</span>` : `<span class="n" style="color:#aaa">обычный, без граней</span>`}</div>`;
    B.placed = false; FACES.forEach((f) => { if (!any) { B.lock[f] = false; } }); bar(any ? "Закреплённые грани уехали в предмет" : "Выпал пустой блок"); render();
  });
  function binomAtLeast(n, m, p) { let s = 0; for (let k = m; k <= n; k++) { let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); s += c * Math.pow(p, k) * Math.pow(1 - p, n - k); } return s; }
  function odds() {
    const lockedMemes = FACES.filter((f) => B.lock[f] && B.tex[f].startsWith("meme/")).length, un = FACES.filter((f) => !B.lock[f]).length;
    const need = Math.max(0, 2 - lockedMemes), p = need === 0 ? 1 : binomAtLeast(un, need, MEME_CHANCE);
    $("#odds").textContent = (p * 100).toFixed(p < 0.1 ? 1 : 0).replace(".", ",") + "%";
    $("#oddsHint").textContent = lockedMemes >= 2 ? "Два мема уже закреплены — ачивка при любой установке." : lockedMemes === 1 ? `Один мем закреплён — остальные ${un} граней ищут второй.` : `≈ одна удачная установка из ${Math.round(1 / p)}. Хитрость: выпал мем — закрепи его.`;
  }

  /* взгляд 30 секунд = 600 тиков */
  let stare = 0, hovering = false, lastScroll = 0; const ring = $("#stareRing"), stT = $("#stareT");
  const touch = matchMedia("(hover: none)").matches;
  scene.addEventListener("pointerenter", () => (hovering = true)); scene.addEventListener("pointerleave", () => { if (!touch) { hovering = false; stare = 0; } });
  addEventListener("scroll", () => (lastScroll = performance.now()), { passive: true });
  let sceneVis = false; new IntersectionObserver((es) => (sceneVis = es[0].intersectionRatio > 0.8), { threshold: [0, 0.8, 1] }).observe($(".hb-view"));
  setInterval(() => {
    const looking = B.placed && sceneVis && (touch ? performance.now() - lastScroll > 400 : hovering);
    stare = looking ? stare + 2 : 0;   // PlayerTickEvent без проверки фазы приходит дважды за тик
    ring.style.strokeDashoffset = 106.8 * (1 - Math.min(1, stare / 600));
    stT.textContent = stare ? `счётчик ${stare} / 600 · прошло ${(stare / 40).toFixed(0)} с` : B.placed ? "не отводи взгляд" : "";
    if (stare >= 600) { adv.grant("stare_hentai"); stare = 0; }
  }, 50);


  /* ================= коллекция и статистика ================= */
  const SEEN = Object.assign({ pron: [], hentai: [], meme: [], n: 0, hist: [0, 0, 0, 0, 0, 0, 0] }, ZM.store.get("p15.seen", {}));
  const sets = { pron: new Set(SEEN.pron), hentai: new Set(SEEN.hentai), meme: new Set(SEEN.meme) };
  let collDirty = false;
  function collect(keys, memes) {
    for (const k of keys) { const [c, r] = k.split("/"); sets[c] && sets[c].add(r); }
    SEEN.n++; SEEN.hist[memes]++; collDirty = true;
  }
  function saveSeen() { SEEN.pron = [...sets.pron]; SEEN.hentai = [...sets.hentai]; SEEN.meme = [...sets.meme]; ZM.store.set("p15.seen", SEEN); }
  const binom = (k, n = 6, p = MEME_CHANCE) => { let c = 1; for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1); return c * p ** k * (1 - p) ** (n - k); };
  const H = (n) => { let s = 0; for (let i = 1; i <= n; i++) s += 1 / i; return s; };
  function renderColl() {
    const row = (c, name, tot) => { const n = sets[c].size; return `<div class="c-${c}"><span>${name}</span><b>${n}<small> / ${tot}</small></b><i><em style="width:${(n / tot) * 100}%"></em></i></div>`; };
    $("#cnt").innerHTML = `<div class="hb-n"><span>установок</span><b>${SEEN.n.toLocaleString("ru")}</b></div>` + row("pron", "порно", POOL.pron) + row("hentai", "хентай", POOL.hentai) + row("meme", "мемы на сайте", L.memes.length);
    const tot = SEEN.n || 1, mx = Math.max(0.0001, ...SEEN.hist.map((v) => v / tot), binom(0));
    $("#hist").innerHTML = SEEN.hist.map((v, k) => `<div><i style="height:${Math.max(v ? 2 : 0, (v / tot / mx) * 100)}%"></i><u style="bottom:${(binom(k) / mx) * 100}%"></u><span>${k}</span></div>`).join("");
    const got2 = SEEN.hist.slice(2).reduce((a, b) => a + b, 0);
    $("#histT").innerHTML = `Столбцы — сколько раз на блоке было столько мемов, чёрточки — теория. Два и больше: у тебя <b>${SEEN.n ? ((got2 / SEEN.n) * 100).toFixed(1) : "0"}%</b>, по формуле <b>${((1 - binom(0) - binom(1)) * 100).toFixed(1)}%</b>.`;
    $("#memes").innerHTML = L.memes.map((m) => sets.meme.has(m) ? `<img src="${T("meme/" + m, "webp")}" alt="" title="Мем грань №${m}">` : `<span>?</span>`).join("");
    // купонный коллекционер: n·H(n) граней нужной категории
    const perP = 3 * (1 - MEME_CHANCE), perM = 6 * MEME_CHANCE;
    const e = [["все 165 порно", (POOL.pron * H(POOL.pron)) / perP], ["все 167 хентай", (POOL.hentai * H(POOL.hentai)) / perP], ["все 121 мем из мода", (POOL.meme * H(POOL.meme)) / perM]];
    $("#exp").innerHTML = `<b>Сколько раз ставить, чтобы увидеть</b>` + e.map(([t, v]) => `<div><span>${t}</span><b>≈ ${Math.round(v).toLocaleString("ru")}</b></div>`).join("") + `<small>В среднем, если ничего не закреплять. На сайте 27 мемов из 121, остальные ждут в самой игре.</small>`;
  }
  $$("[data-auto]").forEach((b) => b.addEventListener("click", () => {
    const n = +b.dataset.auto;
    for (let i = 0; i < n; i++) randomize();
    B.placed = true; render(); snd("place", 0.5); saveSeen(); renderColl(); collDirty = false;
    K.say(`Поставлено ${n} раз. Мемов в коллекции: ${sets.meme.size} / ${L.memes.length}`);
  }));
  $("#collReset").addEventListener("click", () => { Object.values(sets).forEach((x) => x.clear()); SEEN.n = 0; SEEN.hist = [0, 0, 0, 0, 0, 0, 0]; saveSeen(); renderColl(); ZM.sfx("click", 0.4); });
  renderColl();
  setInterval(() => { if (collDirty) { collDirty = false; saveSeen(); renderColl(); } }, 400);

  /* ================= тонкости ================= */
  (function fine() {
    $("#srvCubes").innerHTML = [0, 1].map(() => `<div class="hb-srv">${FACES.slice(0, 3).map((f, i) => `<i class="s${i}">${faceHtml(i === 1 ? "hentai/1" : "pron/1", false).replace(/<span class="lb[^]*?<\/span>/, "")}</i>`).join("")}</div>`).join("");
    const F = [
      ["15 секунд вместо 30", "В коде ачивке за взгляд нужно 600 отсчётов, и это похоже на 30 секунд. Но обработчик срабатывает дважды за тик, в начале и в конце, поэтому на деле хватает 15. Счётчик выше считает так же."],
      ["Смотреть можно издалека", "Взгляд ловится на расстоянии до 5 блоков, на любую грань. Отвёл прицел хоть на тик — счёт с нуля. Игроки в режиме наблюдателя не считаются."],
      ["Закреплённый мем тоже в счёт", "«Смехуятинка» считает мемы на всех шести гранях, и закреплённые тоже. Выпал мем — закрепи и переставляй: шанс поймать второй поднимается с 3,3% до 22,6% за установку."],
      ["Ачивку получит ближайший", "Два мема засчитываются не тому, кто поставил, а ближайшему игроку в радиусе 8 блоков. Друг стоит ближе — ачивка уходит ему."],
      ["Пять граней делятся нечестно", "Если одна грань закреплена, пять оставшихся делятся на 2 порно и 3 хентая: лишняя грань всегда достаётся хентаю."],
      ["Всё закрепил — ничего не меняется", "Если закреплены все шесть граней, постановка ничего не перебрасывает. Блок можно носить в инвентаре как готовую композицию."],
      ["Колёсико копирует композицию", "В творческом режиме средняя кнопка мыши по блоку даёт копию вместе с закреплёнными гранями. Незакреплённые в предмет не пишутся и выпадут заново."],
      ["Свои картинки через ресурспак", "Списки собираются по папкам pron, hentai и meme в textures/block из всех включённых ресурспаков. Положи свои PNG, и они попадут в пул. Читаются списки один раз при запуске игры, так что после смены пака нужен перезапуск."],
      ["Ачивки без верстака", "«Хроники AD-блока» и «Адский дрочила» проверяют инвентарь, а не крафт. Достаточно получить блок любым способом, хоть из сундука. Для второй нужен полный стак в одной ячейке."],
    ];
    $("#fineBox").innerHTML = F.map(([t, d], i) => `<article class="pnl"><span>${String(i + 1).padStart(2, "0")}</span><b>${esc(t)}</b><p>${esc(d)}</p></article>`).join("");
  })();

  /* ================= поп-апы в hero (Хроники AD-блока) ================= */
  const POPS = [
    ["Внимание!", "ГОРЯЧИЕ БЛОКИ В ТВОЁМ БИОМЕ", "Одинокие грани ждут тебя в радиусе 8 блоков", "Смотреть"],
    ["Поздравляем!!!", "ВЫ 1 000 000-Й ПОСЕТИТЕЛЬ", "Заберите приз: 1 блок без СМС и регистрации", "Забрать"],
    ["Сообщение системы", "ВАШ ВЕРСТАК ЗАРАЖЁН", "Обнаружено 64 угрозы. Скрафтить антивирус?", "Скрафтить"],
  ];
  const pops = $("#pops"); let popN = 0;
  function spawnPop() {
    if (pops.children.length >= 2 || document.hidden || scrollY > innerHeight * 0.6) return;
    const [t, h, d, go] = POPS[popN++ % POPS.length], el = document.createElement("div"); el.className = "hb-pop";
    const w = pops.clientWidth, H = pops.clientHeight; el.style.left = Math.max(8, Math.random() * (w - 270)) + "px"; el.style.top = 80 + Math.random() * Math.max(10, H - 300) + "px";
    el.innerHTML = `<div class="t"><span>${esc(t)}</span><button type="button" aria-label="Закрыть">×</button></div><div class="b"><img src="${T("hentai_block")}" alt=""><div><strong>${esc(h)}</strong>${esc(d)}</div></div><button type="button" class="go">${esc(go)}</button>`;
    el.querySelector(".t button").addEventListener("click", () => { el.remove(); ZM.sfx("click", 0.4); });
    el.querySelector(".go").addEventListener("click", () => { el.remove(); $("#craft").scrollIntoView({ behavior: "smooth" }); K.say("Бесплатно — только через верстак."); });
    let dg = null; const tb = el.querySelector(".t");
    tb.addEventListener("pointerdown", (e) => { if (e.target.tagName === "BUTTON") return; dg = { x: e.clientX - el.offsetLeft, y: e.clientY - el.offsetTop }; try { tb.setPointerCapture(e.pointerId); } catch (_) {} });
    tb.addEventListener("pointermove", (e) => { if (dg) { el.style.left = e.clientX - dg.x + "px"; el.style.top = e.clientY - dg.y + "px"; } });
    tb.addEventListener("pointerup", () => (dg = null));
    pops.appendChild(el);
  }
  setTimeout(spawnPop, 2500); setInterval(spawnPop, 9000);

  /* ================= крафт ================= */
  const I = (n, name, id) => ({ src: T("i/" + n), name, id: id || "minecraft:" + n });
  const craftKey = { R: I("red_dye", "Красный краситель"), V: I("green_dye", "Зелёный краситель"), B: I("blue_dye", "Синий краситель"), M: I("milk_bucket", "Ведро молока"), Q: I("quartz_block", "Кварцевый блок"), E: I("end_rod", "Стержень Края"), P: I("painting", "Картина"), A: I("black_wool", "Чёрная шерсть"), N: I("orange_wool", "Оранжевая шерсть") };
  let inv = ZM.store.get("p15.inv", 0);
  const invUpd = () => { $("#invN").textContent = inv; $("#invT").textContent = Math.min(inv, 64); ZM.store.set("p15.inv", inv); if (inv >= 64) adv.grant("stack_hentai"); };
  function take(n) { inv = Math.min(64, inv + n); adv.grant("craft_hentai"); invUpd(); snd(n > 1 ? "levelup" : "pop", n > 1 ? 0.4 : 0.5); }
  K.craft($("#craftBox"), { pattern: ["RVB", "MQE", "PAN"], key: craftKey, result: { src: T("hentai_block"), name: "Блок Порнухи/Хентая", id: "zitraksmode:hentai_block" }, onTake: () => take(1) });
  $("#craft64").addEventListener("click", () => (inv >= 64 ? K.say("Стак уже есть. Ты знаешь зачем...") : take(64 - inv)));
  // ведро молока ↔ ведро спермы, как перебор вариантов в JEI
  const mSlot = $("#craftBox").querySelectorAll(".k-slot")[3]; let alt = false;
  setInterval(() => { alt = !alt; const img = mSlot.querySelector("img"); img.src = alt ? T("sperm_bucket") : T("i/milk_bucket"); mSlot.dataset.tip = alt ? "Ведро спермы" : "Ведро молока"; mSlot.dataset.tipSub = alt ? "zitraksmode:sperm_bucket" : "minecraft:milk_bucket"; }, 1500);

  /* ================= ачивки / история / финал ================= */
  adv = K.adv({ list: ZM.P15.advancements, store: "p15.adv", icon: (a) => T("i/" + a.icon), intro: "Пять ачивок за блок. Все скрыты." });
  invUpd();
  K.timeline($("#tl"), [
    { date: "30.04.2026", t: "Хентай-блок", d: "Шесть случайных граней, закрепление ПКМ, пять ачивок.", c: "#ff9000" },
    { date: "30.04.2026", t: "В том же апдейте", d: "Картины (пункт №16) и Коран (№17).", c: "#ff5fa8" },
  ]);
  K.finNav(15, $("#finNav"));
  $("#clear").addEventListener("click", () => { document.body.classList.toggle("wiped"); const on = document.body.classList.contains("wiped"); snd(on ? "burp" : "pop", 0.6); $("#finP").textContent = on ? "История очищена. Никто ничего не видел." : "Ладно, вернули."; $("#clear").textContent = on ? "Вернуть как было" : "Очистить историю"; });
  render();
  ZM.reveal && ZM.reveal();
})();
