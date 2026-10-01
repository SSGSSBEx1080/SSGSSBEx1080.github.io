/* №22 · Дойка быка и разорителя. Логика из CowMilkingHandler / BullShearHandler / BullDropsHandler / SpermBucketItem /
   SpanishBoots* / CopperWoolBlock / Cow- и RavagerMergedMixin:
   ведро в основной руке по корове: пол при первой дойке 50/50 (NBT IsBull), бык → ведро спермы + ачивка, корова → молоко;
   ведро по разорителю без метки Tamed: цели и задачи стёрты, гуляет 0.4, смотрит на игрока 6 блоков; текстура ravager_tamed;
   ножницы по быку с шерстью: 50% медный (ачивка) / 50% лысый + 1–2 кожи; смерть: лысый без кожи, медный без кожи + 1–3 медной шерсти;
   ведро спермы: стак 1, 32 тика, баф 100 тиков из четырёх; сапоги: скорость ×2, прыгучесть II, −1 HP раз в 200 тиков, ремонт шерстью 25% за 1 ур. */
(function () {
  const { $, $$, esc } = ZM, K = ZM.kit, U = ZM.url;
  ZM.topbar({ crumb: "№22 · Дойка", ...ZM.pointNav(22) });
  const T = (p, e = "png") => U(`assets/textures/p22/${p}.${e}`);
  const I = (n) => T("i/" + n);
  const V = (n) => T("v/" + n);
  const snd = K.sounds("p22");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motion = () => !reduce && !document.documentElement.classList.contains("no-motion");
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const G = ZM.P22G, TEX = ZM.P22TEX;
  const GL = window.ZMGeo && ZMGeo.supported();
  let adv = null;
  const grant = (k) => adv && adv.grant(k);
  const chat = (t) => K.chat("#log", t);
  const visible = (el) => { let v = false; new IntersectionObserver((es) => { v = es[0].isIntersecting; }, { rootMargin: "120px" }).observe(el); return () => v; };
  const milk = (rate = 1) => snd("milk" + ri(1, 3), 0.7, rate);
  const moo = (rate = 1) => snd("moo" + ri(1, 4), 0.5, rate);

  /* ================= фон: пятна голштинки плывут, изредка капает молоко ================= */
  (function bg() {
    const cv = $("#bg"), g = cv.getContext("2d"); let W, H, S = [], D = [];
    const blob = () => { const n = ri(7, 11), r = rnd(40, 120), pts = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push([Math.cos(a) * r * rnd(.65, 1.2), Math.sin(a) * r * rnd(.6, 1.15)]); } return pts; };
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); W = cv.width = innerWidth * d; H = cv.height = innerHeight * d; g.setTransform(d, 0, 0, d, 0, 0);
      S = Array.from({ length: innerWidth < 640 ? 7 : 12 }, () => ({ x: rnd(0, innerWidth), y: rnd(0, innerHeight), p: blob(), v: rnd(4, 10), a: rnd(0, 6), s: rnd(-.05, .05) })); };
    size(); addEventListener("resize", size);
    function draw(pts) { g.beginPath(); const n = pts.length; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; i ? g.quadraticCurveTo(a[0], a[1], m[0], m[1]) : g.moveTo(m[0], m[1]); } g.closePath(); g.fill(); }
    let last = performance.now();
    (function f(now) {
      requestAnimationFrame(f); const dt = Math.min(.05, (now - last) / 1000); last = now;
      const w = innerWidth, h = innerHeight; g.clearRect(0, 0, w, h);
      g.fillStyle = "rgba(29,26,23,.035)";
      for (const s of S) { if (motion()) { s.y -= s.v * dt; s.a += s.s * dt; } if (s.y < -160) { s.y = h + 160; s.x = rnd(0, w); } g.save(); g.translate(s.x, s.y); g.rotate(s.a); draw(s.p); g.restore(); }
      if (motion() && Math.random() < dt * .6) D.push({ x: rnd(0, w), y: -10, v: rnd(60, 120), r: rnd(3, 6) });
      g.fillStyle = "rgba(255,255,255,.95)"; g.strokeStyle = "rgba(29,26,23,.12)";
      D = D.filter((d) => { d.v += 300 * dt; d.y += d.v * dt; g.beginPath(); g.ellipse(d.x, d.y, d.r * .8, d.r * 1.25, 0, 0, 7); g.fill(); g.stroke(); return d.y < h + 20; });
    })(last);
  })();

  $("#tick").innerHTML = (() => { const s = ["Бык улыбается при дойке", "50 / 50", "ведро в основной руке", "разоритель тоже", "32 тика глоток", "медный бык", "1–3 шерсти", "скорость ×2", "−½ сердца каждые 10 секунд"].map((x) => `<span>${x}</span><i></i>`).join(""); return s + s; })();

  /* ================= общие 3D-модели ================= */
  // процедурные анимации вместо ванильных: ходьба (ноги), кивок головы, «дёрнулся» при дойке
  function beast(cv, kind, tex, opt = {}) {
    if (!GL) return null;
    const o = { geo: G[kind], tex: TEX[tex], nearest: tex === "cow" || tex === "rav", keep: !!opt.keep, tint: [1, 1, 1] };
    const g = ZMGeo.create(cv, o); if (!g) return null;
    g.o = o; g.kind = kind; g.texKey = tex;
    const bb = g.bbox(Object.keys(g.bones));
    g.bb = bb;
    Object.assign(g.cam, { target: [bb.c[0], bb.c[1] + (opt.dy || 0), bb.c[2]], dist: Math.max(bb.size[1], bb.size[2]) * (opt.k || 2.1), yaw: 0, pitch: opt.pitch ?? 12, fov: 38 });
    g.walk = 0; g.nod = 0; g.jolt = 0; g.dead = 0; g.t = 0; g.look = 0;
    g.setSkin = (k) => { g.texKey = k; g.setTex(TEX[k]); };
    g.step = (dt) => {
      g.t += dt; const t = g.t;
      const sw = Math.sin(t * (kind === "rav" ? 5 : 7)) * 26 * g.walk;
      for (const [n, s] of [["leg_rh", 1], ["leg_lf", 1], ["leg_lh", -1], ["leg_rf", -1]]) g.setBoneRot(n, [sw * s, 0, 0]);
      g.jolt = Math.max(0, g.jolt - dt * 2.5); g.nod = Math.max(0, g.nod - dt * 1.6);
      const hx = Math.sin(g.nod * 14) * 18 * g.nod + (kind === "rav" ? Math.sin(t * 1.3) * 3 : 0);
      const hy = g.look + Math.sin(t * .7) * 6;
      g.setBoneRot(kind === "rav" ? "neck" : "head", [hx + g.jolt * 10, hy, Math.sin(g.jolt * 30) * 6 * g.jolt]);
    };
    // поза для setExtra: вращение мышью + падение набок при смерти
    g.place = (ry, rx = 0) => {
      const c = bb.c, M = g.M;
      let m = M.mul(M.t(c[0], 0, c[2]), M.mul(M.rx(rx * Math.PI / 180), M.mul(M.ry(ry * Math.PI / 180), M.t(-c[0], 0, -c[2]))));
      if (g.dead) { const a = Math.min(1, g.dead) * Math.PI / 2; m = M.mul(m, M.mul(M.t(bb.mx[0], 0, 0), M.mul(M.rz(-a), M.t(-bb.mx[0], 0, 0)))); }
      if (g.jolt) m = M.mul(M.t(0, Math.abs(Math.sin(g.jolt * 20)) * g.jolt * 1.2, 0), m);
      g.setExtra(m);
    };
    return g;
  }
  const clickOnly = (el, fn) => { let d = null; el.addEventListener("pointerdown", (e) => (d = { x: e.clientX, y: e.clientY })); el.addEventListener("pointerup", (e) => { if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 7) fn(e); d = null; }); };
  const pop = (host, txt, x, y, cls = "ml-moo") => { const el = document.createElement("span"); el.className = cls; el.textContent = txt; el.style.left = x + "px"; el.style.top = y + "px"; host.appendChild(el); setTimeout(() => el.remove(), 1300); };
  const loop = (el, fn) => { const vis = visible(el); let last = performance.now(); (function f(now) { const dt = Math.min(.05, (now - last) / 1000); last = now; if (vis()) fn(dt, now); requestAnimationFrame(f); })(last); };

  /* ================= HERO ================= */
  (function hero() {
    const cv = $("#hero3d"), stage = $("#heroStage");
    const g = beast(cv, "cow", "bull", { k: 3.3, pitch: 10, dy: 2 });
    if (!g) { cv.replaceWith(Object.assign(new Image(), { src: I("sperm_bucket"), className: "px", style: "position:absolute;left:30%;top:28%;width:40%" })); return; }
    const st = K.spinner(cv, { ry: -140, rx: 0 }, 25);
    $("#heroSw").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; $$("#heroSw button").forEach((x) => x.classList.toggle("on", x === b)); g.setSkin(b.dataset.t); g.jolt = 1; ZM.sfx("click", 0.3); });
    clickOnly(cv, (e) => { const r = stage.getBoundingClientRect(); g.nod = 1; moo(g.texKey === "cow" ? 1.1 : 0.8); pop(stage, g.texKey === "cow" ? "Муу!" : "МУУ", e.clientX - r.left, e.clientY - r.top - 30); });
    loop(cv, (dt) => { if (st.idle() && motion()) st.ry += dt * 12; g.walk += ((motion() ? .35 : 0) - g.walk) * .05; g.step(dt); g.place(st.ry, st.rx); g.render(); });
  })();

  /* ================= ИНВЕНТАРЬ (общий для страницы) ================= */
  const NAMES = { milk_bucket: "Ведро молока", sperm_bucket: "Ведро спермы", leather: "Кожа", beef: "Сырая говядина", copper_wool: "Медная шерсть", spanish_boots: "Испанские сапоги", bucket: "Ведро", copper_ingot: "Медный слиток" };
  const MAXS = { milk_bucket: 1, sperm_bucket: 1, spanish_boots: 1, bucket: 16 };
  const INV = new Array(27).fill(null);
  function give(id, n = 1) {
    let left = n; const max = MAXS[id] || 64;
    for (const s of INV) if (s && s.id === id && s.n < max && left) { const k = Math.min(max - s.n, left); s.n += k; left -= k; }
    for (let i = 0; i < INV.length && left; i++) if (!INV[i]) { const k = Math.min(max, left); INV[i] = { id, n: k, fresh: 1 }; left -= k; }
    renderInv();
    if (id === "copper_wool" && n - left > 0) grant("copper_wool");
    return n - left;
  }
  const count = (id) => INV.reduce((s, x) => s + (x && x.id === id ? x.n : 0), 0);
  function take(id, n = 1) { for (let i = INV.length - 1; i >= 0 && n; i--) { const s = INV[i]; if (s && s.id === id) { const k = Math.min(n, s.n); s.n -= k; n -= k; if (!s.n) INV[i] = null; } } renderInv(); }
  function renderInv() {
    $("#inv").innerHTML = INV.map((s) => s ? `<span class="${s.fresh ? "new" : ""}" data-tip="${esc(NAMES[s.id] || s.id)}"><img class="px" src="${I(s.id)}" alt="">${s.n > 1 ? `<b>${s.n}</b>` : ""}</span>` : "<span></span>").join("");
    INV.forEach((s) => s && (s.fresh = 0));
  }
  $("#invClear").addEventListener("click", () => { INV.fill(null); renderInv(); ZM.sfx("pop", 0.3, 0.7); });

  /* ================= 01 · ЗАГОН ================= */
  (function pen() {
    const cv = $("#pen3d"), stage = cv.parentElement;
    const newCow = (i) => ({ id: i, sex: null, v: "n", alive: true, milked: 0 });
    let n = 0; const herd = Array.from({ length: 6 }, () => newCow(++n));
    let cur = 0, hand = "bucket", buckets = 16, shearDur = 238;
    const stats = { milk: 0, bull: 0, cow: 0, copper: 0, lost: 0 };
    const HB = [["bucket", "Ведро"], ["shears", "Ножницы"], ["iron_sword", "Железный меч"]];
    const g = beast(cv, "cow", "cow", { k: 3.0, pitch: 14, dy: 3 });
    const st = g ? K.spinner(cv, { ry: -135, rx: 0 }, 20) : null;
    const skin = (c) => (c.sex === "m" ? (c.v === "bald" ? "bald" : c.v === "copper" ? "copper" : "bull") : "cow");
    function hotbar() {
      $("#hotbar").innerHTML = HB.map(([id, nm]) => `<button type="button" class="${hand === id ? "on" : ""}" data-h="${id}" data-tip="${nm}" aria-label="${nm}"><img class="px" src="${I(id)}" alt="">${id === "bucket" ? `<b>${buckets}</b>` : ""}${id === "shears" && shearDur < 238 ? `<span class="dur"><i style="width:${shearDur / 238 * 100}%;background:hsl(${shearDur / 238 * 120},100%,50%)"></i></span>` : ""}</button>`).join("");
    }
    const gl = (c) => !c.sex ? ["?", "x", "", "не доена"] : c.sex === "f" ? ["♀", "f", "корова", `доена ${c.milked}×`] : c.v === "copper" ? ["♂", "cu", "медный бык", "стриженый"] : c.v === "bald" ? ["♂", "bd", "лысый бык", "стриженый"] : ["♂", "m", "бык", `доен ${c.milked}×`];
    function herdUI() {
      $("#herd").innerHTML = herd.map((c, i) => { const [s, k, t, sub] = gl(c); return `<button type="button" role="listitem" class="${i === cur ? "on" : ""}" data-i="${i}"><span class="g ${k}">${s}</span><span><b>№${c.id} ${t}</b><small>${sub}</small></span></button>`; }).join("");
      const c = herd[cur]; $("#penName").textContent = `Корова №${c.id}` + (c.sex === "m" ? " · бык" : c.sex === "f" ? " · корова" : "");
      $("#tally").innerHTML = `<div><b>${stats.milk}</b><span>подоено</span></div><div><b>${stats.bull}:${stats.cow}</b><span>быки : коровы</span></div><div><b>${stats.copper}</b><span>медных быков</span></div>`;
    }
    function select(i) { cur = i; if (g) { g.setSkin(skin(herd[i])); g.dead = 0; g.o.tint = [1, 1, 1]; g.jolt = .6; } herdUI(); }
    $("#herd").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { select(+b.dataset.i); ZM.sfx("click", 0.3); } });
    $("#hotbar").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { hand = b.dataset.h; hotbar(); ZM.sfx("click", 0.3, 1.3); } });
    const fly = (id, x, y) => { const el = document.createElement("img"); el.className = "ml-fly px"; el.src = I(id); el.style.left = x + "px"; el.style.top = y + "px"; stage.appendChild(el); setTimeout(() => el.remove(), 800); };
    let busy = false;
    function act(e) {
      const c = herd[cur]; if (!c.alive || busy) return;
      const r = stage.getBoundingClientRect(), x = e ? e.clientX - r.left : r.width / 2, y = e ? e.clientY - r.top : r.height / 2;
      if (hand === "bucket") {
        if (!buckets) { buckets = 16; chat("§7Вёдра кончились, взяли ещё стак."); }
        const first = !c.sex; if (first) c.sex = Math.random() < .5 ? "m" : "f";
        buckets--; c.milked++; stats.milk++; if (first) stats[c.sex === "m" ? "bull" : "cow"]++;
        const it = c.sex === "m" ? "sperm_bucket" : "milk_bucket";
        milk(); fly(it, x, y);
        if (!give(it)) { stats.lost++; chat("§cИнвентарь полон: ведро некуда положить, оно пропало."); }
        if (c.sex === "m") { grant("bull_milking"); if (first) chat("§7Корова №" + c.id + " оказалась §9быком§7. Бык улыбается при дойке."); }
        else if (first) chat("§7Корова №" + c.id + " — §dкорова§7. Молоко как молоко.");
        if (g) { g.setSkin(skin(c)); g.jolt = 1; }
      } else if (hand === "shears") {
        if (c.sex !== "m") { ZM.sfx("click", 0.3, .7); K.say(c.sex ? "Коров ножницы не берут. Только быков." : "Сначала подои: пока пол неизвестен, это просто корова."); return; }
        if (c.v !== "n") { K.say("Этот бык уже пострижен. Второй раз ножницы не сработают."); return; }
        snd("shear", 0.6, rnd(.85, 1.15)); shearDur--;
        if (Math.random() < .5) { c.v = "copper"; stats.copper++; grant("copper_bull"); chat("§6Под шерстью оказалась медь!"); }
        else { c.v = "bald"; const k = ri(1, 2); give("leather", k); fly("leather", x, y); chat(`§7Лысый бык. Выпало кожи: ${k}.`); }
        if (g) { g.setSkin(skin(c)); g.jolt = 1; }
      } else {
        busy = true; snd("cowhurt", 0.6); if (g) { g.o.tint = [1, .45, .45]; g.jolt = 1; }
        setTimeout(() => {
          if (g) g.o.tint = [1, 1, 1];
          c.alive = false; snd("death", 0.5, .9);
          const drops = [["beef", ri(1, 3)]];
          if (c.sex !== "m" || c.v === "n") { const l = ri(0, 2); l && drops.push(["leather", l]); }
          if (c.sex === "m" && c.v === "copper") drops.push(["copper_wool", ri(1, 3)]);
          drops.forEach(([id, k], i) => setTimeout(() => { give(id, k); fly(id, x + i * 26 - 20, y + 40); ZM.sfx("pop", 0.3, 1.2 + i * .1); }, 350 + i * 150));
          chat("§7Дроп: " + drops.map(([id, k]) => `${NAMES[id]} ×${k}`).join(", ") + (c.v === "bald" ? " §8(лысый: без кожи)" : c.v === "copper" ? " §6(медный: шерсть вместо кожи)" : ""));
          const t0 = performance.now();
          (function fall(now) { if (!g) return; g.dead = Math.min(1, (now - t0) / 350); if (g.dead < 1) requestAnimationFrame(fall); })(t0);
          setTimeout(() => { herd[cur] = newCow(++n); busy = false; select(cur); chat("§7В загон зашла новая корова №" + herd[cur].id + "."); }, 1500);
        }, 250);
      }
      hotbar(); herdUI();
    }
    if (g) {
      clickOnly(cv, act);
      loop(cv, (dt) => { if (st.idle() && motion()) st.ry += dt * 8; g.walk += ((herd[cur].alive && motion() ? .12 : 0) - g.walk) * .05; g.step(dt); g.place(st.ry, st.rx); g.render(); });
    } else { cv.replaceWith(Object.assign(document.createElement("button"), { className: "k-btn", textContent: "Применить предмет", style: "position:absolute;left:50%;top:45%;transform:translateX(-50%)", onclick: () => act() })); }
    hotbar(); herdUI(); renderInv();
  })();

  /* ================= 02 · РАЗОРИТЕЛЬ ================= */
  (function ravager() {
    const cv = $("#rv3d"), stage = $("#rvStage"), box = $(".ml-rv");
    let tamed = false;
    const g = beast(cv, "rav", "rav", { k: 2.0, pitch: 10, dy: 3 });
    const st = g ? K.spinner(cv, { ry: -140, rx: 0 }, 20) : null;
    const set = (v) => { tamed = v; stage.classList.toggle("calm", v); box.classList.toggle("tamed", v); $("#rvState span").textContent = v ? "смирный" : "агрессивный"; if (g) g.setSkin(v ? "ravt" : "rav"); };
    $("#rvMilk").addEventListener("click", (e) => {
      if (tamed) { ZM.sfx("click", 0.3, .7); K.say("Уже подоен. Повторная дойка ничего не делает, ведро остаётся в руке."); return; }
      set(true); milk(0.8); if (g) g.jolt = 1; give("sperm_bucket") || chat("§cИнвентарь полон: ведро пропало.");
      grant("hero_of_village"); chat("§7Разоритель подоен и больше ни на кого не бросается.");
    });
    $("#rvReset").addEventListener("click", () => { set(false); snd("rroar", 0.4); if (g) g.jolt = 1; });
    if (g) {
      clickOnly(cv, () => { if (tamed) { snd("ridle" + ri(1, 2), 0.4, 1.1); g.nod = 1; } else { snd("rroar", 0.4); g.jolt = 1; } });
      let ang = 0;
      loop(cv, (dt, now) => {
        if (st.idle() && motion()) st.ry += dt * (tamed ? 6 : 10);
        g.walk += ((motion() ? (tamed ? .18 : .5) : 0) - g.walk) * .05;
        if (!tamed && motion()) { ang += dt; g.look = Math.sin(ang * 2.3) * 14; } else g.look *= .95;
        g.step(dt); g.place(st.ry, st.rx); g.render();
      });
    }
    K.dl($("#rvDl"), [["Чем доить", "обычное пустое ведро, основная рука"], ["Результат", "<b>ведро спермы</b> + ачивка «Хранитель семени»"], ["Звук", "дойка коровы, на тон ниже (0.8)"], ["Внешний вид", "своя текстура прирученного"], ["Сохранение", "метка Tamed в NBT: после перезахода он всё так же смирный"], ["Повторно", "игнор, ведро не тратится"]]);
  })();

  /* ================= 03 · ВЕДРО СПЕРМЫ ================= */
  (function bucket() {
    const BUFFS = [["jump", "Прыгучесть"], ["haste", "Спешка"], ["speed", "Скорость"], ["hero", "Герой деревни"]];
    const hits = [0, 0, 0, 0]; let drank = 0;
    $("#bkRoll").innerHTML = BUFFS.map(([k, n], i) => `<div data-i="${i}"><img class="px" src="${V(k)}" alt=""><b>${n}</b><small>5 с · I</small></div>`).join("");
    $("#bkTl").innerHTML = [["32 т", "глоток, 1,6 секунды, как у зелья"], ["0 т", "бонус приходит сразу после глотка"], ["100 т", "5 секунд бонуса, уровень I"], ["→", "в руке остаётся пустое ведро"]].map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join("");
    K.dl($("#bkDl"), [["Стак", "1"], ["Сытость", "0, пить можно даже сытым"], ["В творческом", "вкладка «Разное», не вкладка мода"], ["После крафта", "оставляет ведро"], ["Яд и слепота", "прописаны в еде, но не срабатывают (см. Тонкости)"]]);
    const btn = $("#bkDrink"), fill = $("#bkFill"), item = $("#bkItem");
    let hold = null, raf = 0, sipT = 0;
    const DUR = 1600;
    function stop() { hold = null; cancelAnimationFrame(raf); fill.style.width = "0"; item.classList.remove("drinking"); }
    function done() {
      stop(); drank++; grant("drink_sperm");
      if (count("sperm_bucket")) { take("sperm_bucket"); give("bucket"); }
      const $roll = $$("#bkRoll div"); let k = 0, spins = 12 + ri(0, 3);
      const win = ri(0, 3);
      const spin = () => { $roll.forEach((d, i) => d.classList.toggle("hot", i === k % 4)); if (k < spins + ((win - spins) % 4 + 4) % 4) { k++; ZM.sfx("click", 0.15, 1.6); setTimeout(spin, 40 + k * 6); } else fin(); };
      const fin = () => {
        hits[win]++; $("#bkStat").textContent = `выпито: ${drank} · ` + BUFFS.map(([, n], i) => `${n.split(" ")[0]} ${hits[i]}`).join(" · ");
        const [id, nm] = BUFFS[win]; ZM.sfx("orb", 0.4, 1.3);
        const fx = $("#bkFx"); fx.innerHTML = `<span><img class="px" src="${V(id)}" alt="">${nm} I <em id="bkCd">0:05</em></span>`;
        let left = 5; const cd = setInterval(() => { left--; const e = $("#bkCd"); if (!e) return clearInterval(cd); e.textContent = "0:0" + Math.max(0, left); if (left <= 0) { clearInterval(cd); fx.innerHTML = ""; } }, 1000);
        chat(`§7Ведро выпито. Бонус: §a${nm}§7 на 5 секунд.`);
      };
      spin();
    }
    function frame(now) {
      if (!hold) return; const k = Math.min(1, (now - hold) / DUR); fill.style.width = k * 100 + "%";
      if (now > sipT) { sipT = now + 250; snd("drink", 0.4, rnd(.9, 1.1)); const d = $("#bkDrops"); for (let i = 0; i < 2; i++) { const p = document.createElement("i"); p.style.left = rnd(35, 60) + "%"; p.style.top = "30%"; p.style.setProperty("--dx", rnd(-40, 40) + "px"); d.appendChild(p); setTimeout(() => p.remove(), 700); } }
      if (k >= 1) return done(); raf = requestAnimationFrame(frame);
    }
    btn.addEventListener("pointerdown", (e) => { e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch (_) {} hold = performance.now(); sipT = 0; item.classList.add("drinking"); raf = requestAnimationFrame(frame); });
    for (const ev of ["pointerup", "pointercancel", "pointerleave"]) btn.addEventListener(ev, () => hold && stop());
    btn.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && !hold && !e.repeat) { e.preventDefault(); hold = performance.now(); sipT = 0; item.classList.add("drinking"); raf = requestAnimationFrame(frame); } });
    btn.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") stop(); });
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  })();

  /* ================= 04 · ДЕРЕВО СЛУЧАЙНОСТЕЙ + МЕДНАЯ ШЕРСТЬ ================= */
  (function tree() {
    const N = [
      ["cow", "Корова", "любая, пол неизвестен", "", ""],
      ["bull", "Бык", "первая дойка ведром", "50%", "или корова: даёт молоко, дальше ветки нет"],
      ["copper", "Медный бык", "ножницы, ачивка «Медный бык»", "50%", "или лысый бык: 1–2 кожи сразу, при смерти кожи нет"],
      ["copper_wool", "1–3 медной шерсти", "только при смерти, кожа не падает", "×", ""],
    ];
    $("#tree").innerHTML = N.map(([k, t, s, p, alt], i) => `<div class="ml-node ${k === "copper" || k === "copper_wool" ? "cu" : ""}"><span class="pct">${p}</span><div class="b">${k === "copper_wool" ? `<img class="px" src="${I("copper_wool")}" alt="" style="width:110px;height:110px;margin:5px">` : `<img data-snap="${k}" alt="" style="width:100%;height:120px;object-fit:contain">`}<b>${t}</b><small>${s}</small></div>${alt ? `<div class="alt">${alt}</div>` : ""}</div>`).join("");
    // снимки моделей одним скрытым WebGL-холстом
    if (GL) {
      const cv = document.createElement("canvas"); cv.width = 360; cv.height = 240; cv.style.cssText = "position:fixed;left:-9999px;top:0;width:360px;height:240px"; document.body.appendChild(cv);
      const g = beast(cv, "cow", "cow", { k: 2.2, pitch: 14, keep: true });
      const keys = ["cow", "bull", "copper"]; let i = 0;
      const next = () => { if (i >= keys.length) { cv.remove(); return; } const k = keys[i]; g.setSkin(k); setTimeout(() => { g.step(0); g.place(-130); g.render(); const url = cv.toDataURL(); $$(`[data-snap="${k}"]`).forEach((im) => (im.src = url)); i++; next(); }, 160); };
      setTimeout(next, 200);
    }
    // кубик медной шерсти: крутится сам, тянется мышью
    const cube = $("#cube"), st = K.spinner($("#cwCube"), { ry: 38, rx: -24 }, 60);
    loop(cube, (dt) => { if (st.idle() && motion()) st.ry += dt * 20; cube.style.transform = `rotateX(${-Math.abs(st.rx) - 10}deg) rotateY(${st.ry}deg)`; });
    clickOnly($("#cwCube"), () => snd("cloth", 0.6, rnd(.9, 1.1)));
    K.dl($("#cwDl"), [["ID", "zitraksmode:copper_wool"], ["Прочность", "0.8, как у шерсти"], ["Звук", "шерсть"], ["Цвет на карте", "оранжевый"], ["Откуда", "медный бык, 1–3 при смерти"], ["Куда", "испанские сапоги · ремонт сапог"]]);
    // симуляция: сколько коров до 4 шерсти
    $("#simRun").addEventListener("click", () => {
      const RUNS = 10000, H = new Array(41).fill(0); let sum = 0;
      for (let r = 0; r < RUNS; r++) { let wool = 0, cows = 0; while (wool < 4) { cows++; if (Math.random() < .5 && Math.random() < .5) wool += 1 + Math.floor(Math.random() * 3); } sum += cows; H[Math.min(40, cows)]++; }
      const mx = Math.max(...H);
      $("#simOut b").textContent = (sum / RUNS).toFixed(1).replace(".", ",");
      $("#simOut span").textContent = "коров в среднем на одну пару сапог";
      $("#simBars").innerHTML = H.slice(1).map((v, i) => `<i style="height:${v / mx * 100}%" data-t="${i + 1}${i + 1 === 40 ? "+" : ""} коров: ${(v / RUNS * 100).toFixed(1)}%"></i>`).join("");
      if (!$(".ml-sim-ax")) $("#simBars").insertAdjacentHTML("afterend", `<div class="ml-sim-ax"><span>1</span><span>10</span><span>20</span><span>30</span><span>40+</span></div>`);
      if (!quiet) ZM.sfx("orb", 0.3, 1.1); quiet = false;
    });
    let quiet = true; $("#simRun").click();
  })();

  /* ================= 05 · ИСПАНСКИЕ САПОГИ ================= */
  (function boots() {
    const W = { name: "Медная шерсть", id: "zitraksmode:copper_wool", src: I("copper_wool") };
    K.craft($("#btCraft"), { pattern: ["W W", "W W"], key: { W }, result: { name: "Испанские сапоги", id: "zitraksmode:spanish_boots", src: I("spanish_boots") }, count: 1,
      onTake: () => {
        const have = count("copper_wool");
        if (have < 4) { K.say(`Нужно 4 медные шерсти, в инвентаре ${have}. Добудь в загоне (01) или возьми в «Предметах» (07).`, true); return; }
        take("copper_wool", 4); give("spanish_boots"); snd("equip", 0.6); grant("spanish_boots"); K.say("Испанские сапоги в инвентаре.");
      } });
    $("#btTip").innerHTML = K.mcHtml("§eИспанские сапоги") + "<br>" + ["§6Испанские сапоги", "§7Скорость бега x2", "§7Прыгучесть", "§cТратят полсердца раз в 10 секунд", "§4Кровавые эффекты", "", "§7На ногах:", "§9+2 Броня"].map((l) => l ? K.mcHtml(l) : "&nbsp;").join("<br>");
    K.dl($("#btDl"), [["Скорость", "<b>×2</b> ко всей итоговой скорости, вместе с зельем тоже"], ["Прыгучесть", "II, без частиц, иконка видна"], ["Цена", "−1 HP (полсердца) каждые 200 тиков, магией: броня не спасает"], ["Броня", "2 · жёсткость 0 · отбрасывание 0"], ["Прочность", "450"], ["Зачаровываемость", "12"], ["Ремонт", "медный слиток или медная шерсть (25% за 1 ур.)"], ["Редкость", "необычная, жёлтое имя"], ["Звук надевания", "кожаная броня"], ["Поле зрения", "от скорости не растягивается"]]);

    // ---- забег ----
    const cv = $("#runCv"), g = cv.getContext("2d"), wrap = $("#run");
    const imgs = {}; for (const k of ["grass_side", "grass_top", "dirt"]) { imgs[k] = new Image(); imgs[k].onload = () => draw(); imgs[k].src = V(k); }
    const icons = V("icons"); $("#hearts").style.setProperty("--icons", `url("${icons}")`);
    const SP = 5.612; // м/с спринт
    let run = null, hp = 20;
    const hearts = () => { $("#hearts").innerHTML = Array.from({ length: 10 }, (_, i) => { const v = hp - i * 2, f = v >= 2 ? 52 : v === 1 ? 61 : 0; return `<i style="background-image:${f ? `url('${icons}'),` : ""}url('${icons}');background-position:${f ? `-${f * 2}px 0,` : ""}-32px 0;background-size:512px 512px"></i>`; }).join(""); };
    hearts();
    function size() { const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); }
    function steve(x, y, s, ph, boots) {
      const L = Math.sin(ph) * 0.5, px = (c, a, b, w, h) => { g.fillStyle = c; g.fillRect(x + a * s, y + b * s, w * s, h * s); };
      g.save(); g.translate(x + 4 * s, y + 20 * s); g.rotate(L); g.translate(-(x + 4 * s), -(y + 20 * s)); px("#3a3aa0", 2, 20, 4, 12); if (boots) px("#6b4a1f", 1.6, 28, 4.8, 4.5); g.restore();
      g.save(); g.translate(x + 4 * s, y + 8 * s); g.rotate(-L * .9); g.translate(-(x + 4 * s), -(y + 8 * s)); px("#00a8a8", 2, 8, 4, 8); px("#c68e6b", 2, 16, 4, 4); g.restore();
      px("#00a8a8", 1, 8, 6, 12); px("#c68e6b", 0, 0, 8, 8); px("#3b2a14", 0, 0, 8, 2.5); px("#fff", 5, 3.5, 2, 1); px("#4a3aa0", 6, 3.5, 1, 1);
      g.save(); g.translate(x + 4 * s, y + 20 * s); g.rotate(-L); g.translate(-(x + 4 * s), -(y + 20 * s)); px("#2c2c88", 2, 20, 4, 12); if (boots) px("#7c5626", 1.6, 28, 4.8, 4.5); g.restore();
      g.save(); g.translate(x + 4 * s, y + 8 * s); g.rotate(L * .9); g.translate(-(x + 4 * s), -(y + 8 * s)); px("#0bb", 2, 8, 4, 8); px("#d9a07c", 2, 16, 4, 4); g.restore();
    }
    function lane(y0, h, dist, boots, t) {
      const B = h / 3.2; // пикселей на блок
      const off = (dist * B) % B;
      g.fillStyle = boots ? "#f4d9d0" : "#cfe8fb"; g.fillRect(0, y0, cv.width, h);
      // столбики каждые 16 блоков
      g.font = `${Math.round(B * .38)}px monospace`; g.textAlign = "center";
      const x0 = cv.width * .22;
      for (let k = Math.floor((dist - 40)); k < dist + 40; k++) { if (k % 16 || k < 0) continue; const x = x0 + (k - dist) * B; g.fillStyle = "rgba(29,26,23,.35)"; g.fillRect(x - 2, y0 + h - B * 2.2, 4, B * 1.2); g.fillStyle = "#1d1a17"; g.fillText(k + " бл", x, y0 + h - B * 2.4); }
      for (let x = -off; x < cv.width + B; x += B) { if (imgs.grass_side.complete) { g.imageSmoothingEnabled = false; g.drawImage(imgs.grass_side, x, y0 + h - B, B, B); } else { g.fillStyle = "#5d9b3a"; g.fillRect(x, y0 + h - B, B, B); } }
      const jump = boots ? Math.max(0, Math.sin(t * 2.2)) ** 2 * B * 1.2 : 0;
      const s = B * 1.8 / 32;
      steve(x0 - 4 * s, y0 + h - B - 32 * s - jump, s, t * (boots ? 18 : 12), boots);
      g.textAlign = "right"; g.font = `bold ${Math.round(B * .36)}px system-ui,sans-serif`; const tx = (boots ? "в сапогах · " : "обычный спринт · ") + dist.toFixed(0) + " бл.";
      g.fillStyle = "rgba(0,0,0,.55)"; g.fillText(tx, cv.width - 12 + 2, y0 + h - B * .35 + 2); g.fillStyle = "#fff"; g.fillText(tx, cv.width - 12, y0 + h - B * .35);
    }
    function draw() {
      if (!cv.width) size(); const t = run ? run.t : 0, h = cv.height / 2;
      lane(0, h, SP * t, false, t); lane(h, h, SP * 2 * t, true, t);
      g.fillStyle = "#1d1a17"; g.fillRect(0, h - 1, cv.width, 2);
    }
    addEventListener("resize", () => { size(); draw(); }); size(); draw();
    $("#runGo").addEventListener("click", () => {
      if (run) return; hp = 20; hearts(); const scale = $("#runFast").checked ? 1 : 5;
      const phase = Math.random() * 10; let lastHit = -1;
      run = { t: 0 }; let last = performance.now(); $("#runGo").textContent = "Бежим…";
      (function f(now) {
        const dt = Math.min(.05, (now - last) / 1000) * scale; last = now; run.t += dt;
        const hitN = Math.floor((run.t + phase) / 10); if (lastHit < 0) lastHit = hitN;
        if (hitN > lastHit) { lastHit = hitN; hp = Math.max(0, hp - 1); hearts(); snd("hurt", 0.4, 1.15); wrap.animate([{ boxShadow: "inset 0 0 0 0 rgba(158,27,27,0)" }, { boxShadow: "inset 0 0 60px 10px rgba(158,27,27,.7)" }, { boxShadow: "inset 0 0 0 0 rgba(158,27,27,0)" }], { duration: 500 }); }
        $("#runT").textContent = run.t.toFixed(1).replace(".", ",") + " с";
        draw();
        if (run.t < 60) requestAnimationFrame(f);
        else { $("#runNote").innerHTML = `За минуту: спринт — <b>${Math.round(SP * 60)}</b> блоков, в сапогах — <b>${Math.round(SP * 120)}</b>. Сапоги сняли <b>${(20 - hp) / 2}</b> ${K.plural((20 - hp) / 2, "сердце", "сердца", "сердец")} (без учёта регенерации). Сытым это почти незаметно: регенерация на полной еде лечит быстрее, но голод уходит.`; run = null; $("#runGo").textContent = "Ещё забег"; }
      })(last);
    });

    // ---- наковальня ----
    const MAX = 450; let dmg = 300, level = 30;
    function anvil(res) {
      const dur = (d) => `<span class="dur"><i style="width:${(MAX - d) / MAX * 100}%;background:hsl(${(MAX - d) / MAX * 120},100%,45%)"></i></span>`;
      const w = count("copper_wool");
      const canFix = dmg > 0;
      const out = canFix ? Math.max(0, dmg - Math.max(1, Math.floor(MAX / 4))) : null;
      $("#anvil").innerHTML = `<span class="ttl">Ремонт и имя</span>
        <span class="s" style="left:12%;top:36%"><img class="px" src="${I("spanish_boots")}" alt="">${dur(dmg)}</span>
        <span class="pl" style="left:32%;top:44%">+</span>
        <span class="s" style="left:42%;top:36%"><img class="px" src="${I("copper_wool")}" alt=""><b>${Math.max(1, w)}</b></span>
        <span class="ar" style="left:60%;top:44%">➜</span>
        <span class="s" style="left:75%;top:36%">${canFix ? `<img class="px" src="${I("spanish_boots")}" alt="">${dur(out)}` : ""}</span>
        ${canFix ? `<span class="cost">Стоимость: 1</span>` : ""}`;
      $("#anvNote").innerHTML = `Прочность: <b>${MAX - dmg}/${MAX}</b>. Одна медная шерсть = четверть прочности (112) за <b>1 уровень</b>, и цена не растёт, сколько ни чини. Медный слиток тоже чинит, но уже по обычным правилам наковальни.` + (res ? ` <br>${res}` : "");
    }
    $("#anvWear").addEventListener("click", () => { dmg = Math.min(MAX - 1, dmg + ri(60, 140)); snd("hurt", 0.4, .9); anvil(); });
    $("#anvFix").addEventListener("click", () => {
      if (dmg <= 0) { K.say("Сапоги целые: наковальня не даёт результата.", true); return; }
      const fromInv = count("copper_wool") > 0; if (fromInv) take("copper_wool");
      dmg = Math.max(0, dmg - 112); snd("anvil", 0.4); anvil(fromInv ? "Шерсть взята из инвентаря." : "<i>Шерсти в инвентаре нет, взяли из творческого запаса.</i>");
    });
    anvil();
  })();

  /* ================= 06 · ТОНКОСТИ ================= */
  const FACTS = [
    ["Телят тоже можно доить", "Ванилла малышей не доит. Мод возраст не проверяет, так что телёнок тоже получит пол и отдаст ведро."],
    ["Два быка дадут телёнка", "Пол на размножение не влияет. Телёнок рождается без пола, узнаешь при первой дойке."],
    ["Грибная корова тоже корова", "Муушрум в коде считается коровой: доится ведром с тем же 50 на 50. Шкура быка на неё не ложится, у грибной коровы свой рендер."],
    ["Грибного быка не остричь", "Ножницы по грибному быку перехватывает мод. Грибы не срезаются, в обычную корову он не превращается, а медный или лысый вариант не видно."],
    ["Стрижка до перезахода", "Пол хранится в NBT, а медный или лысый вариант нет. После перезагрузки чанка бык снова с шерстью. Медного лучше забить сразу, а лысого можно стричь по новой."],
    ["Ведро тратится и в творческом", "Ванилла в творческом ведро оставляет. Здесь пустое ведро уходит всегда, а результат ложится в первый свободный слот. Инвентарь полон — ведро пропало."],
    ["Яд и слепота не срабатывают", "В свойствах еды они есть, но своё окончание глотка у ведра не зовёт обычную логику еды. Поэтому ни яда, ни слепоты, ни сытости."],
    ["Бонус приходит сразу", "В коде задержка на 40 тиков, но задача ставится на 40-й тик жизни сервера, а он давно прошёл. Бонус выдаётся тут же после глотка."],
    ["Разоритель ломает листву и после дойки", "Ломание листвы при упоре не задача ИИ, а часть его движения. Смирный разоритель, гуляя, всё так же проламывает кусты при включённом mobGriefing."],
    ["Наездник остаётся злым", "Дойка касается только самого разорителя. Разбойник или вызыватель на спине продолжит атаковать."],
    ["Сапоги убирают растяжение обзора", "Пока надеты сапоги, поле зрения зафиксировано: не растягивается ни от ×2, ни от спринта, ни от зелья скорости."],
    ["Колет раз в 10 секунд по часам игрока", "Урон идёт по счётчику тиков игрока, а не с момента надевания. Первый укол может прийти через секунду. Урон магический: прочность сапог не тратит, в творческом его нет."],
  ];
  $("#factsBox").innerHTML = FACTS.map(([t, d], i) => `<article class="ml-fact"><span>${String(i + 1).padStart(2, "0")}</span><b>${esc(t)}</b><p>${esc(d)}</p></article>`).join("");

  /* ================= 07 · ТВОРЧЕСКИЙ ================= */
  (function creative() {
    const TABS = {
      zm: { n: "ZitraksMode", items: [["copper_wool", 1], ["spanish_boots", 1]] },
      misc: { n: "Разное", items: [["bucket", 0], ["milk_bucket", 0], ["sperm_bucket", 1], ["leather", 0], ["beef", 0], ["shears", 0], ["copper_ingot", 0], ["wheat", 0], ["mushroom_stew", 0], ["experience_bottle", 0], ["saddle", 0]] },
    };
    const TIP = {
      copper_wool: ["§fМедная шерсть", "§9ZitraksMode"],
      spanish_boots: ["§eИспанские сапоги", "§6Испанские сапоги", "§7Скорость бега x2", "§7Прыгучесть", "§cТратят полсердца раз в 10 секунд", "§4Кровавые эффекты", "", "§7На ногах:", "§9+2 Броня", "§9ZitraksMode"],
      sperm_bucket: ["§fВедро спермы", "§9ZitraksMode"],
    };
    const INFO = {
      copper_wool: "Блок из медного быка. Четыре штуки на верстаке столбиками по краям, как обычные сапоги, — и получаются испанские.",
      spanish_boots: "Рецепт W W / W W из медной шерсти. Ачивка «Испанские сапоги» выдаётся, когда они попадают в инвентарь.",
      sperm_bucket: "Лежит во вкладке «Разное», а не в вкладке мода. Стакается по одному, после выпивания оставляет пустое ведро.",
    };
    const VN = { bucket: "Ведро", milk_bucket: "Ведро молока", leather: "Кожа", beef: "Сырая говядина", shears: "Ножницы", copper_ingot: "Медный слиток", wheat: "Пшеница", mushroom_stew: "Грибной суп", experience_bottle: "Пузырёк опыта", saddle: "Седло" };
    let tab = "zm", sel = null;
    function render() {
      $("#crTabs").innerHTML = Object.entries(TABS).map(([k, t]) => `<button type="button" data-t="${k}" class="${k === tab ? "on" : ""}">${t.n}</button>`).join("");
      const it = TABS[tab].items; const cells = it.concat(Array(Math.max(0, 27 - it.length)).fill(null));
      $("#crGrid").innerHTML = cells.map((x) => x ? `<button type="button" data-i="${x[0]}" class="${x[1] ? "mod" : ""} ${sel === x[0] ? "on" : ""}" data-tip="${esc(NAMES[x[0]] || VN[x[0]])}"><img class="px" src="${I(x[0])}" alt=""></button>` : `<button type="button" disabled></button>`).join("");
      const s = sel && (TIP[sel] || [`§f${VN[sel] || NAMES[sel]}`, "§9Minecraft"]);
      $("#crInfo").innerHTML = s ? `<div class="ml-tip">${s.map((l) => l ? K.mcHtml(l) : "&nbsp;").join("<br>")}</div><p class="ml-p">${esc(INFO[sel] || "Ванильный предмет, нужен по ходу пункта.")} Клик по предмету кладёт его в инвентарь загона (раздел 01).</p>` :
        `<p class="ml-p">Предметы пункта во вкладках творческого режима. Синяя точка — из мода. Клик — предмет уходит в инвентарь загона, оттуда его берут наковальня и верстак.</p>`;
    }
    $("#crTabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { tab = b.dataset.t; sel = null; render(); ZM.sfx("click", 0.3); } });
    $("#crGrid").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-i]"); if (!b) return; sel = b.dataset.i;
      const id = sel, n = (MAXS[id] || 64) === 1 ? 1 : id === "copper_wool" ? 4 : MAXS[id] || 64;
      if (["copper_wool", "spanish_boots", "sperm_bucket", "leather", "beef", "milk_bucket", "bucket", "copper_ingot"].includes(id)) { const got = give(id, n); ZM.sfx("pop", 0.3, 1.3); if (id === "spanish_boots" && got) grant("spanish_boots"); got ? chat(`§7В инвентарь: ${NAMES[id]} ×${got}`) : chat("§cИнвентарь полон."); }
      render();
    });
    render();
  })();

  /* ================= 08–09 ================= */
  adv = K.adv({ list: ZM.P22.advancements, store: "p22.adv", icon: (a) => I(a.icon), chatSel: "#log", intro: "Шесть скрытых: от первой дойки до сапог, которые пьют кровь." });
  K.timeline($("#tl"), [
    { date: "18.05.2026", t: "Дойка быка и разорителя", d: "У коров появился пол, который решает первая дойка. Бык даёт ведро спермы, разоритель после дойки становится смирным. Ножницы превращают быка в лысого или медного, из медной шерсти шьются испанские сапоги. Шесть ачивок.", c: "#2e6fd8" },
  ]);
  K.finNav(22, $("#finNav"));
  $("#finB").addEventListener("click", () => { const im = $("#finB img"); const full = /bucket\.png/.test(im.src) && !/milk|sperm/.test(im.src); const next = full ? (Math.random() < .5 ? "sperm_bucket" : "milk_bucket") : "bucket"; im.src = I(next); full ? milk() : ZM.sfx("pop", 0.3); });
  ZM.reveal && ZM.reveal();
})();
