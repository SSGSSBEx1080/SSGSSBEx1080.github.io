/* №24 · Электросамокат. Всё из кода мода:
   ScooterEntity — MAX_CHARGE 1 000 000 на 15 000 блоков; км/ч = speed×72, движение speed×0.5 блока/тик; 80 км/ч на ровной, назад 18, на спуске потолок 500;
     разгон 0.032, тормоз 0.085, трение 0.965, сглаживание lerp(heavy, .34, .18); масса = 1 (самокат) + пассажиры, heavy = (m−1)/24;
     slopeFactor по числу пассажиров; заряд 1%/с у порта (±2 по XZ, ±1 по Y, скорость < 0.08); мёд ×0.55, сено ×0.75 к скорости каждый тик;
     вода −1 прочности за 5 тиков; таран от 20 км/ч: power = км/ч/80 × (1+(m−1)×0.085) × уклон, глубина round(power×5) ≤ 5, ломается только порог ≤ 1.2;
     обсидиан: power ≥ 2.85 и ≥ 70 км/ч — блок ломается, самокат разлетается. Моб: урон clamp(км/ч/22, 2, 14); самокат в самокат clamp(км/ч/20, 2, 18).
   ScooterHudOverlay — панель 136×72, цвета скорости 25/50/80/120, шкала 0–150 с насечками 0/75/150.
   ScooterStationSpawner — сетка 768, сдвиг ±120, самокаты 2%→3, 6%→2, 15%→1, иначе 0; заряд 50–100%; ScooterCraftHandler пишет заряд 15 000 (1.5%). */
(function () {
  const { $, $$, esc } = ZM, K = ZM.kit, U = ZM.url;
  ZM.topbar({ crumb: "№24 · Электросамокат", ...ZM.pointNav(24) });
  const T = (p, e = "png") => U(`assets/textures/p24/${p}.${e}`);
  const I = (n) => T("i/" + n), MOB = (n) => T("m/" + n);
  const snd = K.sounds("p24");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motion = () => !reduce && !document.documentElement.classList.contains("no-motion");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (t, a, b) => a + (b - a) * t;
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const fmt = (n, d = 0) => Number(n).toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d });
  const GL = window.ZMGeo && (() => { try { return !!document.createElement("canvas").getContext("webgl"); } catch (e) { return false; } })();
  const G = ZM.P24G;
  let adv = null;
  const grant = (k) => adv && adv.grant(k);
  const visible = (el) => { let v = false; new IntersectionObserver((es) => { v = es[0].isIntersecting; }, { rootMargin: "120px" }).observe(el); return () => v; };
  const log = (t) => K.chat("#log", t, 4);
  let horn = 0;
  const honk = () => { const n = performance.now(); if (n - horn < 600) return false; horn = n; snd("bass", 0.9, 0.55); snd("pling", 0.55, 1.4); return true; };

  /* ================= физика самоката (ScooterEntity.tick, серверная часть) ================= */
  const KMH = 72, MOVE = 0.5, MAXF = 80 / KMH, MAXR = 18 / KMH, RUN = 500 / KMH, ACC = 0.032, BRK = 0.085, FR = 0.965;
  const MAXC = 1e6, CPB = MAXC / 15000, MAXD = 500;
  function slopeFactor(g, n, mass) {
    const mb = clamp((mass - 1) / 10, 0, 2);
    if (g > 0.06) { const st = clamp(g / 0.7, 0, 1), bc = n <= 1 ? 0.9 : n === 2 ? 0.8 : n === 3 ? 0.7 : n === 4 ? 0.58 : 0.45; return clamp(lerp(st, 1, bc) - mb * 0.1 * st, 0.28, 1); }
    if (g < -0.06) { const st = clamp(-g / 0.5, 0, 1), bc = 1.4 + n * 0.25, bm = 1.4 + mb * 1.4, boost = Math.max(bc, bm) + (bc - 1) * mb * 0.5; return clamp(lerp(st, 1.35, boost), 1.25, 6); }
    return n >= 5 ? 0.98 : n === 4 ? 0.99 : 1;
  }
  const MOBS = [
    ["player", "Игрок", 1, 0], ["iron_golem", "Железный голем", 8, 0], ["warden", "Хранитель", 12, 0], ["ravager", "Разоритель", 7, 0], ["hoglin", "Хоглин", 6, 1],
    ["polar_bear", "Белый медведь", 5.5, 1], ["horse", "Лошадь", 4.5, 1], ["panda", "Панда", 4, 1], ["cow", "Корова", 3.5, 1], ["enderman", "Эндермен", 2.5, 0],
    ["pig", "Свинья", 2.2, 1], ["sheep", "Овца", 2.2, 1], ["zombie", "Зомби", 1.2, 0], ["creeper", "Крипер", 1.2, 0], ["villager", "Житель", 1.1, 0],
    ["wolf", "Волк", 0.5, 1], ["cat", "Кошка", 0.5, 1], ["chicken", "Курица", 0.2, 1],
  ];
  const MB = Object.fromEntries(MOBS.map((m) => [m[0], { key: m[0], name: m[1], mass: m[2], animal: !!m[3] }]));
  const PAX = ["player", null, null, null, null];
  const paxL = [];
  const paxChanged = () => paxL.forEach((f) => f());
  const paxN = () => PAX.filter(Boolean).length;
  const paxMass = () => 1 + PAX.reduce((s, k) => s + (k ? MB[k].mass : 0), 0);

  function makeSim() {
    return { speed: 0, cg: 0, tg: 0, charge: MAXC, dura: MAXD, dist: 0, drainAcc: 0, chgAcc: 0, fwd: false, back: false, port: false, surf: "road", t: 0, cap: MAXF, sf: 1, drainMul: 1, moved: 0 };
  }
  function step(s, n, mass) {
    s.t++;
    s.cg += clamp(s.tg - s.cg, -0.07, 0.07);
    const sf = slopeFactor(s.cg, n, mass); s.sf = sf;
    const maxF = MAXF * sf, g = s.cg;
    const down = g < -0.04 ? clamp(-g / 0.65, 0, 1) : 0, up = g > 0.04 ? clamp(g / 0.65, 0, 1) : 0;
    const heavy = clamp((mass - 1) / 24, 0, 1);
    const mA = lerp(heavy, 1, 0.45), mD = lerp(heavy, 1, 1.85), mU = lerp(heavy, 1, 0.35), pack = 1 + n * 0.08 + heavy * 0.55;
    let acc = ACC * mA;
    if (down > 0) acc *= 1 + 0.7 * down * pack * mD; else if (up > 0) acc *= (1 - 0.3 * up) * mU;
    let sp = s.speed, t = sp;
    if (s.charge > 0) {
      if (s.fwd) { t = sp + acc; if (down > 0) t += ACC * 0.55 * down * pack * mD; }
      else if (s.back) { const br = BRK * lerp(heavy, 1, 0.55); t = sp > 0.03 ? sp - br : sp - acc * 1.15; }
      else if (down > 0) t = sp * lerp(down, FR, lerp(heavy, 0.992, 0.998)) + ACC * 0.75 * down * pack * mD;
      else if (up > 0) t = sp * lerp(up, FR, lerp(heavy, 0.94, 0.88));
      else t = sp * FR;
    } else if (down > 0) t = sp * lerp(heavy, 0.994, 0.998) + ACC * 0.8 * down * pack * mD;
    else t = sp * FR;
    if (Math.abs(t) < 0.005) t = 0;
    sp = sp + (t - sp) * lerp(heavy, 0.34, 0.18);
    const downhill = down > 0.04;
    s.cap = downhill ? RUN : maxF;
    sp = clamp(sp, -MAXR, s.cap);
    // окружение (handleEnvironmentEffects)
    if (s.surf === "honey") sp *= 0.55;
    if (s.surf === "hay") sp *= 0.75;
    let mv = Math.abs(sp) * MOVE;
    if (s.surf === "water") { mv *= 0.88; if (s.t % 5 === 0) s.dura = Math.max(0, s.dura - 1); }
    s.speed = sp; s.moved = mv; s.dist += Math.sign(sp) * mv;
    if (mv > 0.001 && s.charge > 0) {
      let dm = 1; if (sf < 0.85) dm += 0.2; if (mass >= 5) dm += 0.1; s.drainMul = dm;
      s.drainAcc += mv * CPB * dm; if (s.drainAcc >= 1) { const d = Math.floor(s.drainAcc); s.drainAcc -= d; s.charge = Math.max(0, s.charge - d); }
    }
    s.charging = false;
    if (s.port && s.charge < MAXC && Math.abs(sp) <= 0.08) { s.charging = true; s.charge = Math.min(MAXC, s.charge + MAXC / 2000); }
    return s;
  }
  const kmh = (s) => Math.abs(s.speed) * KMH;

  /* ================= спидометр (ScooterHudOverlay) ================= */
  const spdColor = (v) => v >= 120 ? "#ff2222" : v >= 80 ? "#ff5533" : v >= 50 ? "#ffaa00" : v >= 25 ? "#66ff66" : "#99ff99";
  function hud(el) {
    el.innerHTML = `<i class="acc"></i><b class="spd">0</b><span class="unit">км/ч</span><div class="bar"><i></i><s style="left:0"></s><s style="left:50%"></s><s style="right:0"></s></div><div class="r r1"><span class="c"></span><span class="p" style="color:#aaffaa"></span></div><div class="r r2"><span class="h"></span></div>`;
    const q = (s) => el.querySelector(s), A = q(".acc"), S = q(".spd"), Un = q(".unit"), B = q(".bar i"), C = q(".c"), P = q(".p"), H = q(".h");
    let last = "";
    return ({ v, rev, chg, charge, seats, hp }) => {
      const key = [Math.round(v), rev, chg, charge, seats, hp].join("|"); if (key === last) return; last = key;
      const sc = rev ? "#ff7777" : spdColor(v);
      A.style.background = rev ? "#ff4444" : chg ? "#33ccff" : spdColor(v);
      S.textContent = Math.round(v); S.style.color = sc;
      Un.textContent = rev ? "км/ч  НАЗАД" : chg ? "км/ч  ЗАРЯДКА" : "км/ч"; Un.style.color = rev ? "#ff9999" : "#bbbbbb";
      B.style.width = clamp(v / 150, 0, 1) * 100 + "%"; B.style.background = sc;
      const pct = clamp(Math.round(charge * 100 / MAXC), 0, 100);
      C.textContent = `Заряд: ${pct}%${chg ? " +" : ""}`; C.style.color = chg ? "#66ffff" : pct <= 15 ? "#ff5555" : pct <= 40 ? "#ffaa00" : "#55ffff";
      P.textContent = `Мест: ${seats}/5`;
      H.textContent = `Прочность: ${hp}/${MAXD}`; H.style.color = hp <= MAXD * 0.2 ? "#ff5555" : hp <= MAXD * 0.5 ? "#ffaa00" : "#ff8888";
    };
  }

  /* ================= фон: ночная трасса ================= */
  let roadSpeed = 0;
  (function bg() {
    const cv = $("#bg"), cx = cv.getContext("2d"); let W = 0, H = 0, off = 0, lastY = scrollY, sv = 0;
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0); };
    size(); addEventListener("resize", size);
    const lights = Array.from({ length: 14 }, (_, i) => ({ z: i / 14, side: i % 2 ? 1 : -1 }));
    let lt = performance.now();
    (function frame(now) {
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - lt) / 1000); lt = now;
      sv = sv * 0.9 + Math.abs(scrollY - lastY) * 0.1; lastY = scrollY;
      if (!motion()) { if (off) return; }
      const v = 0.08 + Math.min(1.6, sv * 0.02) + roadSpeed * 0.06; off = (off + dt * v) % 1;
      cx.clearRect(0, 0, W, H);
      const hz = H * 0.58, vx = W / 2;
      // дорога: перспективные полосы
      const g = cx.createLinearGradient(0, hz, 0, H); g.addColorStop(0, "rgba(0,224,160,0)"); g.addColorStop(1, "rgba(0,224,160,.05)");
      cx.fillStyle = g; cx.beginPath(); cx.moveTo(vx - 6, hz); cx.lineTo(vx + 6, hz); cx.lineTo(W * 1.2, H); cx.lineTo(-W * 0.2, H); cx.fill();
      cx.strokeStyle = "rgba(0,224,160,.13)"; cx.lineWidth = 1;
      for (const k of [-1.4, -0.7, 0.7, 1.4]) { cx.beginPath(); cx.moveTo(vx, hz); cx.lineTo(vx + k * W, H); cx.stroke(); }
      for (let i = 0; i < 12; i++) {
        const z = ((i + off * 1) / 12), p = z * z, y = hz + (H - hz) * p, w = 2 + 10 * p;
        cx.fillStyle = `rgba(233,227,201,${0.04 + 0.12 * p})`; cx.fillRect(vx - w / 2, y, w, 4 + 30 * p * 0.4);
      }
      for (const l of lights) {
        const z = (l.z + off) % 1, p = z * z, y = hz + (H - hz) * p, x = vx + l.side * (20 + W * 0.7 * p), h = 12 + 220 * p;
        cx.strokeStyle = `rgba(80,100,100,${0.15 + 0.3 * p})`; cx.lineWidth = 1 + 2 * p; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x, y - h); cx.stroke();
        const r = 4 + 40 * p, gr = cx.createRadialGradient(x, y - h, 0, x, y - h, r); gr.addColorStop(0, `rgba(0,224,160,${0.25 + 0.3 * p})`); gr.addColorStop(1, "rgba(0,224,160,0)");
        cx.fillStyle = gr; cx.fillRect(x - r, y - h - r, r * 2, r * 2);
      }
    })(lt);
  })();
  $("#marq").innerHTML = (() => { const w = ["80 км/ч", "бензина нет", "пятеро на деке", "15 000 блоков", "1% в секунду", "МТС Юрент", "320 км/ч peek", "два точила", "станция раз на 768 блоков"]; const s = w.map((x) => `<span>${x}</span>`).join(""); return s + s; })();

  /* ================= 3D-просмотр самоката ================= */
  const views = [];
  function drag(el, st, onClick) {
    let d = null; st.last = -1e9;
    el.addEventListener("pointerdown", (e) => { d = { x: e.clientX, y: e.clientY, ry: st.ry, rx: st.rx, m: false }; try { el.setPointerCapture(e.pointerId); } catch (_) {} });
    el.addEventListener("pointermove", (e) => { if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.abs(dx) + Math.abs(dy) > 6) d.m = true; if (!d.m) return; st.ry = d.ry + dx * 0.6; st.rx = clamp(d.rx + dy * 0.3, -30, 60); st.last = performance.now(); });
    const up = (e) => { if (d && !d.m && e.type === "pointerup" && onClick) onClick(e); d = null; };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    st.idle = () => !d && performance.now() - st.last > 2200;
    return st;
  }
  function view(cv, o = {}) {
    if (!GL) return null;
    const g = ZMGeo.create(cv, { geo: G.geo, anim: G.anim, tex: G.tex, idle: "idle", exclusive: true, nearest: true, cam: o.cam });
    ["player1", "player2", "player3"].forEach((n) => g.hide(n, true));
    const bb = g.bbox(["body", "front_wheel", "rear_wheel"]), c = bb.c;
    const st = drag(cv, { ry: o.ry || 0, rx: 0 }, o.onClick);
    const v = { g, st, vis: visible(cv), spin: o.spin ?? 10, ry: st.ry, rx: 0, c, after: null };
    v.update = (dt) => {
      if (st.idle() && motion() && v.spin) st.ry += dt * v.spin;
      v.ry += (st.ry - v.ry) * Math.min(1, dt * 10); v.rx += (st.rx - v.rx) * Math.min(1, dt * 10);
      const M = g.M, D = Math.PI / 180;
      g.setExtra(M.mul(M.t(c[0], 0, c[2]), M.mul(M.rx(v.rx * D * 0.6), M.mul(M.ry(v.ry * D), M.t(-c[0], 0, -c[2])))));
      g.tick(dt); g.render(); v.after && v.after(dt);
    };
    views.push(v);
    return v;
  }
  let lastV = performance.now();
  (function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - lastV) / 1000); lastV = now;
    for (const v of views) if (v.vis()) v.update(dt);
  })(lastV);
  const anim = (v, a) => { if (!v) return; if (a === "idle") v.g.stop(); else if (v.g.st.act !== a) v.g.play(a); };

  /* ================= HERO ================= */
  (function hero() {
    const cv = $("#hero3d");
    const v = view(cv, { cam: { yaw: 62, pitch: 16, dist: 80, target: [0, 3, 2], fov: 38 }, ry: 0, spin: 9, onClick: () => { if (honk()) log("§7*бип-бип*"); } });
    if (!v) cv.outerHTML = `<img src="${I("scooter")}" alt="" style="position:absolute;inset:12%;width:76%;height:76%;object-fit:contain;image-rendering:pixelated;z-index:2">`;
    const H = hud($("#heroHud")), s = makeSim(), road = $("#heroRoad");
    let acc = 0, off = 0, lt = performance.now();
    const vis = visible($("#heroStage"));
    (function f(now) {
      requestAnimationFrame(f);
      const dt = Math.min(0.1, (now - lt) / 1000); lt = now;
      if (!vis()) return;
      acc += dt; while (acc >= 0.05) { acc -= 0.05; step(s, 1, 2); }
      const k = kmh(s); roadSpeed = Math.abs(s.speed) * MOVE * 20;
      if (motion()) { off += dt * roadSpeed * 60; road.style.transform = `translateX(${-(off % 150)}px)`; }
      anim(v, s.speed > 0.02 ? "forward" : "idle");
      H({ v: k, rev: false, chg: false, charge: s.charge, seats: 1, hp: s.dura });
    })(lt);
    $("#heroGo").addEventListener("click", (e) => { s.fwd = !s.fwd; e.currentTarget.setAttribute("aria-pressed", s.fwd); e.currentTarget.textContent = s.fwd ? "■ стоп" : "▶ поехали"; snd("click", 0.4); });
    $("#heroHorn").addEventListener("click", () => { if (honk()) log("§7*бип-бип*"); });
  })();

  /* ================= 01 ГАРАЖ ================= */
  (function garage() {
    const cv = $("#gar3d");
    const v = view(cv, { cam: { yaw: 90, pitch: 12, dist: 66, target: [0, 10, 2], fov: 36 }, ry: 0, spin: 8 });
    if (!v) cv.outerHTML = `<img src="${I("scooter")}" alt="" style="position:absolute;inset:10%;width:80%;height:80%;object-fit:contain;image-rendering:pixelated">`;
    $("#garAnim").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      $$("#garAnim button").forEach((x) => x.setAttribute("aria-pressed", x === b)); anim(v, b.dataset.a); snd("click", 0.4);
    });
    const pins = $("#garPins"); let showSeats = false;
    const SEATS = [["водитель", "player1", 0], ["середина", "player2", 0], ["хвост", "player3", 0], ["слева", "mid", -8], ["справа", "mid", 8]];
    if (v) v.after = () => {
      if (!showSeats) { if (pins.innerHTML) pins.innerHTML = ""; return; }
      const c1 = v.g.project("root", [0, 6, -6.3]), pts = { player1: [0, 6, -6.3], player2: [0, 6, 2.4], player3: [0, 6, 10.7] };
      pins.innerHTML = SEATS.map(([n, b, x]) => { const p = b === "mid" ? [x, 6, -2] : pts[b]; const q = v.g.project("root", p); return `<span style="left:${q[0]}px;top:${q[1]}px">${n}</span>`; }).join("");
      void c1;
    };
    $("#garSeats").addEventListener("click", (e) => { showSeats = !showSeats; e.currentTarget.setAttribute("aria-pressed", showSeats); snd("click", 0.4); });
    let top = false;
    $("#garTop").addEventListener("click", (e) => { if (!v) return; top = !top; v.g.cam.pitch = top ? 82 : 12; v.st.rx = 0; e.currentTarget.textContent = top ? "вид сбоку" : "вид сверху"; snd("click", 0.4); });
    // ливреи
    const SK = [["Стандарт", "#2b2f33", "0"], ["Яндекс Go", "#ffcc00", "1"], ["Юрент", "#7c3aed", "2"]];
    let skin = ri(0, 2);
    const drawSk = () => {
      $("#skins").innerHTML = SK.map(([n, c, id], i) => `<button type="button" data-i="${i}" aria-pressed="${i === skin}"><i style="background:${c}"></i>${n}<small>ScooterSkin: ${id}</small></button>`).join("");
      $("#skinNote").innerHTML = `Ливрея выпадает случайно при первой установке и при спавне на станции, пишется в самокат и переживает складывание. Только вот модель рисуется одной текстурой <b>scooters.png</b>, так что «${SK[skin][0]}» снаружи выглядит так же, как остальные два. Номер ливреи есть, а покраски пока нет.`;
    };
    $("#skins").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; skin = +b.dataset.i; drawSk(); snd("cloth", 0.4); });
    drawSk();
    $("#itemTip").innerHTML = ["§bСамокат"].map((s) => `<div>${K.mcHtml(s)}</div>`).join("") + `<div style="color:#555">zitraksmode:scooter</div>`;
    K.dl($("#garDl"), [
      ["Название", `<span style="color:#55ffff">Самокат</span> · редкий, голубое имя`],
      ["Стак", "1, во вкладке ZitraksMode"],
      ["Хитбокс", "1.35 × 0.5 блока, длина модели около 1.7"],
      ["Поставить", "ПКМ по блоку — на его грань, носом туда, куда смотришь. ПКМ в воздух — в двух блоках перед собой"],
      ["Сложить", "удар пустой рукой или Shift + ПКМ, только пустой и стоящий"],
      ["Хранит", "заряд, прочность и номер ливреи"],
      ["Прочность", "500, любой урон × 5"],
      ["Пассажиры", "до 5, все стоят"],
      ["Измерение", "ездит где угодно, станции только в Верхнем мире"],
    ]);
  })();

  /* ================= 02 ТЕСТ-ДРАЙВ ================= */
  const SLOPES = [["крутой подъём", 0.7], ["подъём", 0.3], ["ровно", 0], ["спуск", -0.3], ["крутой спуск", -0.65], ["обрыв", -1.0]];
  (function drive() {
    const cv = $("#trackCv"), cx = cv.getContext("2d"), track = $("#track");
    const s = makeSim(); s.charge = MAXC;
    const H = hud($("#driveHud"));
    let slope = 2, Hm = { 0: 0 }, minI = 0, maxI = 0;
    const gNow = () => SLOPES[slope][1];
    const hAt = (i) => {
      while (i > maxI) { maxI++; Hm[maxI] = Hm[maxI - 1] + (maxI > 6 ? gNow() : 0); }
      while (i < minI) { minI--; Hm[minI] = Hm[minI + 1] - (minI < -6 ? gNow() * 0 : 0); }
      return Hm[i];
    };
    const hX = (x) => { const i = Math.floor(x), f = x - i; return lerp(f, hAt(i), hAt(i + 1)); };
    const resetAhead = () => { const base = Math.floor(s.dist) + 3; for (let i = base + 1; i <= maxI; i++) delete Hm[i]; maxI = Math.max(base, minI); hAt(base); };
    // рельеф впереди меняется на выбранный уклон
    $("#slopeSeg").innerHTML = SLOPES.map(([n], i) => `<button type="button" data-i="${i}" aria-pressed="${i === slope}">${n}</button>`).join("");
    $("#slopeSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; slope = +b.dataset.i; $$("#slopeSeg button").forEach((x) => x.setAttribute("aria-pressed", x === b)); resetAhead(); snd("click", 0.4); });
    const SURF = [["road", "асфальт"], ["honey", "мёд"], ["hay", "сено"], ["water", "вода"]];
    $("#surfSeg").innerHTML = SURF.map(([k, n]) => `<button type="button" data-k="${k}" aria-pressed="${k === "road"}">${n}</button>`).join("");
    $("#surfSeg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; s.surf = b.dataset.k; $$("#surfSeg button").forEach((x) => x.setAttribute("aria-pressed", x === b)); snd(s.surf === "water" ? "splash" : "click", 0.4); });
    $("#dPort").addEventListener("click", (e) => { s.port = !s.port; e.currentTarget.setAttribute("aria-pressed", s.port); snd("click", 0.4); });
    $("#dHorn").addEventListener("click", () => honk());
    $("#dReset").addEventListener("click", () => { Object.assign(s, makeSim()); Hm = { 0: 0 }; minI = maxI = 0; hist.length = 0; snd("pack", 0.5, 0.9); });
    // управление
    const keys = { w: false, s: false };
    const sync = () => { s.fwd = keys.w; s.back = keys.s && !keys.w; $("#pGas").classList.toggle("on", keys.w); $("#pBrake").classList.toggle("on", keys.s); };
    const onScreen = visible(track);
    addEventListener("keydown", (e) => {
      if (!onScreen() || e.target.closest("input,textarea")) return;
      const k = e.key.toLowerCase();
      if (k === "w" || k === "ц" || e.key === "ArrowUp") { keys.w = true; sync(); e.preventDefault(); }
      else if (k === "s" || k === "ы" || e.key === "ArrowDown") { keys.s = true; sync(); e.preventDefault(); }
      else if (e.key === " " && document.activeElement === track) { honk(); e.preventDefault(); }
    });
    addEventListener("keyup", (e) => { const k = e.key.toLowerCase(); if (k === "w" || k === "ц" || e.key === "ArrowUp") keys.w = false; if (k === "s" || k === "ы" || e.key === "ArrowDown") keys.s = false; sync(); });
    addEventListener("blur", () => { keys.w = keys.s = false; sync(); });
    const hold = (el, k) => {
      const on = (e) => { e.preventDefault(); keys[k] = true; sync(); try { el.setPointerCapture(e.pointerId); } catch (_) {} };
      const off = () => { keys[k] = false; sync(); };
      el.addEventListener("pointerdown", on); el.addEventListener("pointerup", off); el.addEventListener("pointercancel", off); el.addEventListener("lostpointercapture", off);
      el.addEventListener("contextmenu", (e) => e.preventDefault());
    };
    hold($("#pGas"), "w"); hold($("#pBrake"), "s");
    // картинки
    const img = (src) => { const i = new Image(); i.src = src; return i; };
    const IM = { car: img(I("scooter")), dirt: img(T("v/dirt")), grass: img(T("v/grass_side")), faces: {} };
    MOBS.forEach(([k]) => (IM.faces[k] = img(MOB(k))));
    const city = Array.from({ length: 40 }, (_, i) => ({ x: i * 7 + Math.random() * 4, w: 3 + Math.random() * 4, h: 4 + Math.random() * 14, win: Math.random() }));
    const hist = [];
    let acc = 0, lt = performance.now(), sent = false, lastTip = 0;
    function draw() {
      const d = Math.min(2, devicePixelRatio || 1), W = track.clientWidth, Hh = track.clientHeight;
      if (cv.width !== Math.round(W * d) || cv.height !== Math.round(Hh * d)) { cv.width = Math.round(W * d); cv.height = Math.round(Hh * d); }
      cx.setTransform(d, 0, 0, d, 0, 0); cx.imageSmoothingEnabled = false;
      const B = W < 560 ? 30 : 40, x0 = s.dist, y0 = hX(x0 + 0.85);
      const SX = (x) => W * 0.36 + (x - x0) * B, SY = (y) => Hh * 0.64 - (y - y0) * B;
      // небо и город
      const sky = cx.createLinearGradient(0, 0, 0, Hh); sky.addColorStop(0, "#071014"); sky.addColorStop(1, "#0f1d22"); cx.fillStyle = sky; cx.fillRect(0, 0, W, Hh);
      for (const b of city) {
        const px = ((b.x * B * 0.6 - x0 * B * 0.25) % (280 * B * 0.6) + 280 * B * 0.6) % (280 * B * 0.6) - 40, bw = b.w * B * 0.6, bh = b.h * B * 0.6;
        if (px > W + 10 || px + bw < -10) continue;
        cx.fillStyle = "#0d181c"; cx.fillRect(px, Hh * 0.62 - bh, bw, bh + Hh);
        cx.fillStyle = "rgba(0,224,160,.10)"; for (let yy = 0; yy < bh - 8; yy += 12) for (let xx = 4; xx < bw - 6; xx += 10) if (((xx * 7 + yy * 13 + b.win * 100) | 0) % 5 === 0) cx.fillRect(px + xx, Hh * 0.62 - bh + yy + 6, 4, 5);
      }
      // земля
      const iA = Math.floor(x0 - W * 0.36 / B) - 2, iB = Math.ceil(x0 + W * 0.64 / B) + 2;
      cx.beginPath(); cx.moveTo(SX(iA), Hh + 10);
      for (let i = iA; i <= iB; i++) cx.lineTo(SX(i), SY(hAt(i)));
      cx.lineTo(SX(iB), Hh + 10); cx.closePath();
      if (IM.dirt.complete && IM.dirt.naturalWidth) { const p = cx.createPattern(IM.dirt, "repeat"); const m = new DOMMatrix().translateSelf(-x0 * B % B + W * 0.36 % B, 0).scaleSelf(B / 16, B / 16); p.setTransform(m); cx.fillStyle = p; } else cx.fillStyle = "#5b3f2a";
      cx.fill(); cx.fillStyle = "rgba(0,0,0,.35)"; cx.fill();
      cx.strokeStyle = s.surf === "honey" ? "#f2a91e" : s.surf === "hay" ? "#c9a227" : s.surf === "water" ? "#3f76e4" : "#59a33a"; cx.lineWidth = Math.max(4, B * 0.18); cx.beginPath();
      for (let i = iA; i <= iB; i++) { const X = SX(i), Y = SY(hAt(i)) + cx.lineWidth / 2; i === iA ? cx.moveTo(X, Y) : cx.lineTo(X, Y); } cx.stroke();
      if (s.surf === "water") { cx.fillStyle = "rgba(63,118,228,.35)"; cx.fillRect(0, SY(y0) - B * 0.7, W, B * 0.7); }
      // столбы и порт
      for (let i = Math.floor(iA / 12) * 12; i <= iB; i += 12) {
        const X = SX(i), Y = SY(hAt(i)); cx.fillStyle = "#26363a"; cx.fillRect(X - 2, Y - B * 4, 4, B * 4);
        const gr = cx.createRadialGradient(X, Y - B * 4, 0, X, Y - B * 4, B * 2.2); gr.addColorStop(0, "rgba(0,224,160,.55)"); gr.addColorStop(1, "rgba(0,224,160,0)"); cx.fillStyle = gr; cx.fillRect(X - B * 2.2, Y - B * 6.2, B * 4.4, B * 4.4);
      }
      if (s.port) { const X = SX(x0 + 1.6), Y = SY(hX(x0 + 1.6)); cx.fillStyle = "#2d3236"; cx.fillRect(X, Y - B, B, B); cx.fillStyle = "#e2453b"; cx.fillRect(X + B * 0.3, Y - B * 0.8, B * 0.15, B * 0.1); cx.fillStyle = "#3be37a"; cx.fillRect(X + B * 0.55, Y - B * 0.8, B * 0.15, B * 0.1); cx.strokeStyle = "rgba(0,224,160,.25)"; cx.setLineDash([4, 4]); cx.strokeRect(X - B * 2, Y - B * 2, B * 5, B * 3); cx.setLineDash([]); }
      // самокат: наклон как у рендера (±20°)
      const pitch = clamp(Math.atan(s.cg), -20 * Math.PI / 180, 20 * Math.PI / 180);
      cx.save(); cx.translate(SX(x0 + 0.85), SY(y0)); cx.rotate(-pitch);
      // пассажиры
      const seatX = [0.25, -0.3, -0.85, 0.05, -0.05];
      PAX.forEach((k, i) => {
        if (!k) return; const f = IM.faces[k], m = MB[k], hgt = clamp(0.9 + m.mass * 0.09, 0.6, 1.9), hw = clamp(0.32 + m.mass * 0.05, 0.3, 0.9);
        const X = seatX[i] * B, side = i >= 3; cx.globalAlpha = side ? 0.65 : 1;
        cx.fillStyle = side ? "#1b2a2e" : "#22343a"; cx.fillRect(X - hw * B / 2, -B * 0.35 - hgt * B, hw * B, hgt * B);
        if (f.complete && f.naturalWidth) { const fs = hw * B * 1.05, ar = f.naturalHeight / f.naturalWidth; cx.drawImage(f, X - fs / 2, -B * 0.35 - hgt * B - fs * ar * 0.9, fs, fs * ar); }
        cx.globalAlpha = 1;
      });
      if (IM.car.complete && IM.car.naturalWidth) { const w = B * 2.3; cx.scale(-1, 1); cx.drawImage(IM.car, -w / 2, -w * 0.86, w, w); }
      cx.restore();
      // искры на скорости
      if (kmh(s) > 60 && motion()) { cx.fillStyle = "rgba(255,230,150,.8)"; for (let k = 0; k < 3; k++) cx.fillRect(SX(x0 - 0.2) - Math.random() * B * 2, SY(y0) - Math.random() * 4, 2, 2); }
    }
    function graph() {
      const g = $("#graphCv"), c = g.getContext("2d"), d = Math.min(2, devicePixelRatio || 1), W = g.clientWidth, Hh = g.clientHeight;
      if (g.width !== Math.round(W * d)) { g.width = Math.round(W * d); g.height = Math.round(Hh * d); }
      c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, Hh);
      const top = Math.max(100, ...hist.map((h) => h[0])) * 1.1, X = (i) => (i / 300) * W, Y = (v) => Hh - 14 - (v / top) * (Hh - 34);
      c.strokeStyle = "rgba(255,255,255,.06)"; c.fillStyle = "rgba(255,255,255,.35)"; c.font = "11px sans-serif";
      for (const v of [0, 40, 80, 100, 150, 200, 300, 400, 500]) { if (v > top) break; c.beginPath(); c.moveTo(0, Y(v)); c.lineTo(W, Y(v)); c.stroke(); c.fillText(v, 6, Y(v) - 3); }
      const line = (idx, col, w = 2) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); hist.forEach((h, i) => { const x = X(i + 300 - hist.length), y = Y(Math.min(h[idx], top)); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); };
      line(2, "rgba(255,90,90,.6)", 1.5); line(1, "#ffd166"); line(0, "#00e0a0", 2.5);
    }
    const tele = $("#tele");
    function info() {
      const n = paxN(), m = paxMass(), k = kmh(s), real = Math.abs(s.speed) * MOVE * 20 * (s.surf === "water" ? 0.88 : 1);
      const left = s.charge / CPB / s.drainMul;
      const rows = [
        ["Спидометр", `${fmt(k, 1)} км/ч`, k >= 99.5 ? "ok" : ""],
        ["На самом деле", `${fmt(real, 2)} блока/с · ${fmt(real * 3.6, 1)} км/ч`],
        ["Потолок сейчас", s.cap >= RUN - 1e-6 ? "500 км/ч (спуск)" : `${fmt(s.cap * KMH, 1)} км/ч`, s.cap < MAXF ? "warn" : ""],
        ["Уклон под колёсами", `${s.cg >= 0 ? "+" : ""}${fmt(s.cg, 2)} · ${fmt(Math.atan(s.cg) * 180 / Math.PI, 0)}°`],
        ["Масса", `${fmt(m, 1)} (пассажиров ${n})`],
        ["Пройдено", `${fmt(Math.abs(s.dist), 0)} блоков`],
        ["Заряд", `${fmt(s.charge, 0)} / 1 000 000`, s.charge <= 0 ? "bad" : s.charging ? "ok" : ""],
        ["Расход", `×${fmt(s.drainMul, 1)}`, s.drainMul > 1 ? "warn" : ""],
        ["Хватит ещё", `${fmt(left, 0)} блоков`],
        ["Прочность", `${s.dura} / 500`, s.dura < 100 ? "bad" : ""],
      ];
      tele.innerHTML = rows.map(([a, b, c]) => `<dt>${a}</dt><dd class="${c || ""}">${b}</dd>`).join("");
      let tip;
      if (s.charge <= 0) tip = "Заряд кончился: газ больше не работает, но под горку самокат катится сам.";
      else if (s.surf === "honey") tip = "Мёд режет скорость в 0.55 раза <b>каждый тик</b>: выше 1 км/ч не разогнаться.";
      else if (s.surf === "hay") tip = "Сено — ×0.75 каждый тик, это около 2 км/ч потолка.";
      else if (s.surf === "water") tip = "В воде −1 прочности каждые 5 тиков: полный самокат умрёт за 125 секунд.";
      else if (s.charging) tip = "Порт рядом, самокат стоит: <b>+1%</b> в секунду.";
      else if (s.speed < -0.01) tip = "Задний ход: не больше 18 км/ч, на спидометре «НАЗАД».";
      else if (s.cap >= RUN - 1e-6 && k > 1) tip = `Спуск: обычного потолка нет, держит только <b>500</b>. На деле едешь в два раза медленнее, чем показывает спидометр.`;
      else if (s.cg > 0.06 && k > 1) tip = `Подъём: потолок <b>${fmt(s.cap * KMH, 0)}</b> км/ч. Чем больше народу, тем ниже.`;
      else tip = k > 1 ? `Спидометр <b>${fmt(k, 0)}</b>, а реально ${fmt(k / 2, 0)} км/ч: на экран скорость идёт с множителем 72, в движение — с 0.5.` : "Жми W или педаль «газ». Уклон впереди меняется кнопками справа.";
      if (tip !== lastTip) { $("#truth").innerHTML = tip; lastTip = tip; }
    }
    paxL.push(() => {});
    (function f(now) {
      requestAnimationFrame(f);
      const dt = Math.min(0.1, (now - lt) / 1000); lt = now;
      if (!onScreen()) return;
      acc += dt;
      while (acc >= 0.05) {
        acc -= 0.05;
        s.tg = (hX(s.dist + 0.9 + 0.9) - hX(s.dist + 0.9)) / 0.9;
        step(s, paxN(), paxMass());
        hist.push([kmh(s), Math.abs(s.speed) * 36, (s.cap >= RUN - 1e-6 ? 500 : s.cap * KMH)]); if (hist.length > 300) hist.shift();
        if (kmh(s) >= 99.5 && !sent) { sent = true; grant("speed_100"); snd("levelup", 0.5); }
      }
      draw(); graph(); info();
      H({ v: kmh(s), rev: s.speed < -0.01, chg: s.charging, charge: s.charge, seats: paxN(), hp: s.dura });
    })(lt);
  })();

  /* ================= 03 ПАССАЖИРЫ ================= */
  (function pax() {
    let pick = "iron_golem";
    // вид сверху: нос вправо. SEAT_LOCAL (x, z): водитель z .40, середина −.15, хвост −.67, бока x ±.5 z .125 (тело ±45°)
    const SEAT = [["водитель", 0, 0.4, 0], ["середина", 0, -0.15, 0], ["хвост", 0, -0.67, 0], ["слева", -0.5, 0.125, -45], ["справа", 0.5, 0.125, 45]];
    const pos = ([, x, z]) => [50 + z * 52, 50 + x * 62];
    const deck = $("#deck");
    function draw() {
      deck.innerHTML = `<svg viewBox="0 0 100 56.25" preserveAspectRatio="none" aria-hidden="true">
        <rect x="9" y="22" width="72" height="12.5" rx="4" fill="#1d2326" stroke="#2f3b3f" stroke-width=".5"/>
        <rect x="11" y="23.5" width="68" height="9.5" rx="3" fill="#2a3135"/>
        <rect x="83" y="25.5" width="3" height="5.5" fill="#3a4246"/><rect x="84" y="12" width="1.6" height="32" rx=".8" fill="#e2453b"/>
        <circle cx="88" cy="28.1" r="3.5" fill="#111"/><circle cx="6" cy="28.1" r="3.5" fill="#111"/>
        <rect x="3" y="27" width="2" height="2.3" fill="#e2453b"/>
        <text x="91" y="7" fill="#00e0a0" font-size="3.2" font-family="sans-serif" text-anchor="end">нос →</text></svg>` +
        SEAT.map((s, i) => { const [l, t] = pos(s), k = PAX[i]; return `<button type="button" class="sc-seat ${k ? "on" : ""} ${i === 0 ? "drv" : ""}" data-i="${i}" style="left:${l}%;top:${t}%;--r:${s[3]}deg" aria-label="${s[0]}${k ? ": " + MB[k].name : ", свободно"}">${k ? `<img src="${MOB(k)}" alt=""><b>${MB[k].mass}</b>` : "+"}<em>${s[0]}</em></button>`; }).join("");
      const n = paxN(), m = paxMass(), heavy = clamp((m - 1) / 24, 0, 1);
      const turn = (n >= 5 ? 0.72 : n === 4 ? 0.9 : 1) * lerp(heavy, 1, 0.4);
      const upCap = slopeFactor(0.7, n, m) * 80;
      const plow = m >= 8 ? "от 15 км/ч" : m >= 4 ? "от 25 км/ч" : "от 70 км/ч";
      const rows = [
        ["Масса на деке", `${fmt(m, 1)} = 1 самокат + ${fmt(m - 1, 1)}`],
        ["Тяжесть", `${fmt(heavy * 100, 0)}%${heavy >= 1 ? " (максимум)" : ""}`, heavy > 0.5 ? "warn" : ""],
        ["Разгон", `×${fmt(lerp(heavy, 1, 0.45), 2)}`, heavy > 0 ? "warn" : ""],
        ["Тормоз", `×${fmt(lerp(heavy, 1, 0.55), 2)}`, heavy > 0 ? "warn" : ""],
        ["Накат с горы", `×${fmt(lerp(heavy, 1, 1.85), 2)}`, heavy > 0 ? "ok" : ""],
        ["Тяга в гору", `×${fmt(lerp(heavy, 1, 0.35), 2)}`, heavy > 0 ? "warn" : ""],
        ["Руль", `×${fmt(turn, 2)}`, turn < 1 ? "warn" : ""],
        ["Потолок на крутом подъёме", `${fmt(upCap, 0)} км/ч`],
        ["Шагает на", n <= 3 ? "1 блок" : n === 4 ? "0.6 блока" : "0.5 блока (плиты)"],
        ["Расход заряда", m >= 5 ? "+10%" : "обычный", m >= 5 ? "warn" : ""],
        ["Пашет землю", plow],
        ["Сила тарана на 80", fmt(1 + (m - 1) * 0.085, 2)],
      ];
      $("#massDl").innerHTML = rows.map(([a, b, c]) => `<dt>${a}</dt><dd class="${c || ""}">${b}</dd>`).join("");
    }
    $("#mobs").innerHTML = MOBS.map(([k, n, m, a]) => `<button type="button" class="sc-mob" data-k="${k}" aria-pressed="${k === pick}" title="${a ? "садится сам" : "только вплотную"}"><img src="${MOB(k)}" alt=""><span>${n}</span><b>${m}</b></button>`).join("");
    $("#mobs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; pick = b.dataset.k; $$("#mobs button").forEach((x) => x.setAttribute("aria-pressed", x === b)); snd("click", 0.35); });
    deck.addEventListener("click", (e) => {
      const b = e.target.closest(".sc-seat"); if (!b) return; const i = +b.dataset.i;
      if (i === 0) { K.say("Водитель — всегда игрок: управлять самокатом может только он."); return; }
      if (PAX[i]) { log(`§7${MB[PAX[i]].name} спрыгивает вправо`); PAX[i] = null; snd("pop", 0.4, 0.8); }
      else { PAX[i] = pick; const m = MB[pick]; log(m.animal ? `§a${m.name} запрыгивает сам, как в лодку` : `§e${m.name} садится, только если прижать вплотную`); snd(pick === "iron_golem" || pick === "warden" ? "metal" : "pop", 0.5, 1.2); }
      draw(); paxChanged();
    });
    draw();
  })();

  /* ================= 04 КРАШ-ТЕСТ ================= */
  (function crash() {
    const BL = [
      ["grass_block", "Блок дёрна", "dirt"], ["dirt", "Земля", "dirt"], ["sand", "Песок", "dirt"], ["gravel", "Гравий", "dirt"], ["glass", "Стекло", 0.55], ["oak_leaves", "Листва", "leaf"],
      ["netherrack", "Незерак", "dirt"], ["oak_planks", "Доски", 1.05], ["oak_log", "Бревно", 1.05], ["ice", "Лёд", 1.05], ["stone", "Камень", 1.85], ["cobblestone", "Булыжник", 1.85],
      ["deepslate", "Глубинный сланец", 1.85], ["tuff", "Туф", 1.85], ["iron_block", "Железный блок", 2.2], ["gold_block", "Золотой блок", 2.2], ["obsidian", "Обсидиан", 2.85],
      ["bedrock", "Бедрок", -1], ["white_wool", "Шерсть", "soft"], ["hay_block", "Сено", "soft"], ["slime_block", "Слизь", "soft"], ["honey_block", "Мёд", "soft"], ["snow_block", "Снег", "soft"], ["moss_block", "Мох", "soft"],
    ];
    const SL = [["ровно", 0], ["пологий спуск", -0.15], ["спуск", -0.3], ["крутой спуск", -0.5], ["обрыв", -0.8]];
    let blk = "dirt";
    $("#cBlocks").innerHTML = BL.map(([k, n]) => `<button type="button" data-k="${k}" aria-pressed="${k === blk}" title="${n}" aria-label="${n}"><img src="${I(k)}" alt=""></button>`).join("");
    const lane = $("#lane"), COLS = 9, WALL0 = 3, DEPTH = 5;
    function build() {
      const b = BL.find((x) => x[0] === blk);
      lane.innerHTML = `<div class="row" style="bottom:0">${Array.from({ length: COLS }, (_, i) => `<div class="cell g" data-i="${i}"><img src="${I("grass_block")}" alt=""></div>`).join("")}</div>
        <div class="row" style="bottom:var(--b)">${Array.from({ length: COLS }, (_, i) => `<div class="cell w" data-i="${i}">${i >= WALL0 && i < WALL0 + DEPTH ? `<img src="${I(b[0])}" alt="">` : ""}</div>`).join("")}</div>
        <img class="sc-car" id="car" src="${I("scooter")}" alt="" style="left:0">`;
    }
    const thr = (b) => b[2] === "dirt" ? 0.55 : b[2] === "leaf" ? 0 : b[2];
    function compute(kmhV, g, mass, n, b) {
      const sb = Math.max(1, slopeFactor(g, n, mass)), power = (kmhV / 80) * (1 + Math.max(0, mass - 1) * 0.085) * sb;
      const depth = kmhV < 22 ? 0 : clamp(Math.round(power * 5), 0, 5);
      const plow = kmhV >= 70 || (mass >= 8 && kmhV >= 15) || (mass >= 4 && kmhV >= 25);
      const R = { power, sb, depth, plow, wall: [], ground: [], soft: 0, hard: 0, kind: "", keep: 1, dmg: 0 };
      if (kmhV <= 20) { R.kind = "slow"; return R; }
      if (b[2] === "leaf") { R.kind = "leaf"; R.wall = [0, 1, 2]; return R; }
      if (b[2] === "soft") { R.kind = "soft"; R.keep = 0.55; return R; }
      if (b[0] === "obsidian" && power >= 2.85 && kmhV >= 70) { R.kind = "obs"; R.wall = [0]; R.dmg = 500; return R; }
      let stop = false;
      for (let i = 0; i < depth && !stop; i++) {
        // yi=0 — блок стены на уровне колёс, yi=1 — блок под ним (дёрн)
        const cells = [[b, "wall"], [["grass_block", "", "dirt"], "ground"]];
        for (const [bb, where] of cells) {
          const dirt = bb[2] === "dirt";
          if (dirt && plow) { R[where].push(i); R.soft++; continue; }
          const need = thr(bb);
          if (need < 0 || power < need) { stop = true; break; }
          if (need <= 1.2) { R[where].push(i); R.hard++; } else { stop = true; R.kind = R.kind || "hardstop"; break; }
        }
      }
      if (R.soft + R.hard > 0) {
        const slow = clamp(R.soft * 0.02 + R.hard * 0.08 + power * 0.03, 0.05, 0.45); R.keep = 1 - slow;
        R.dmg = R.hard > 0 ? Math.max(2, Math.round(2 + R.hard * 3 + power * 2)) : R.soft > 3 ? 1 : 0;
        R.kind = R.kind || "dig";
      } else R.kind = R.kind || (depth === 0 ? "nodepth" : "stop");
      return R;
    }
    let busy = false;
    const out = (R, kmhV, b) => {
      const rows = [
        ["Сила удара", `${fmt(R.power, 2)} = ${fmt(kmhV / 80, 2)} × ${fmt(1 + Math.max(0, paxMass() - 1) * 0.085, 2)} × ${fmt(R.sb, 2)}`],
        ["Глубина тарана", `${R.depth} ${R.depth === 1 ? "блок" : R.depth >= 2 && R.depth <= 4 ? "блока" : "блоков"}`],
        ["Порог блока", b[2] === "soft" ? "мягкий буфер" : b[2] === "leaf" ? "косится" : b[2] === "dirt" ? (R.plow ? "пашется" : "0.55") : b[2] < 0 ? "неразрушим" : fmt(b[2], 2) + (b[2] > 1.2 && b[0] !== "obsidian" ? " (выше 1.2 — никогда)" : ""), b[2] !== "soft" && b[2] > 1.2 ? "bad" : ""],
        ["Сломано", `${R.wall.length} стены + ${R.ground.length} под колёсами`, R.wall.length ? "ok" : ""],
        ["Скорость после", `${fmt(kmhV * R.keep, 0)} км/ч (×${fmt(R.keep, 2)})`],
        ["Урон корпусу", R.dmg >= 500 ? "500 — вдребезги" : `${R.dmg}`, R.dmg >= 500 ? "bad" : R.dmg ? "warn" : ""],
      ];
      $("#cOut").innerHTML = rows.map(([a, v, c]) => `<dt>${a}</dt><dd class="${c || ""}">${v}</dd>`).join("");
      const N = {
        slow: "До 20 км/ч самокат таранить не пытается: упёрся и скользит вдоль стены.",
        leaf: "Листву, траву, цветы, посевы, лианы и паутину самокат сносит перед собой на любой скорости, не тормозя.",
        soft: `${b[1]} — мягкий буфер: ничего не ломается, скорость падает до 55%. Шерсть и снег при этом стоят и в списке ломаемых, но проверка буфера идёт раньше.`,
        obs: "Обсидиан проломлен, но самокат получил 500 урона и разлетелся на запчасти. Все пассажиры летят на землю и получают по 4 урона.",
        hardstop: `${b[1]}: порог ${b[2]} выше 1.2. Такие блоки самокат не ломает, сколько бы ни было силы — проверка на 1.2 стоит отдельно. Остаётся скольжение вдоль стены.`,
        dig: "Таран прошёл. Он копает два слоя: блок стены на уровне колёс и блок под ним, поэтому за самокатом остаётся траншея.",
        nodepth: "Копать самокат начинает с 22 км/ч, а глубина считается как сила × 5, округлённая. Не хватило.",
        stop: b[2] < 0 ? "Бедрок, барьер, рамка портала Края и укреплённый сланец неразрушимы." : `Силы ${fmt(R.power, 2)} меньше порога ${thr(b)}. Самокат упёрся и скользит, пассажиры на месте.`,
      };
      $("#cNote").textContent = N[R.kind] || "";
    };
    function run() {
      if (busy) return; busy = true; build();
      const kmhV = +$("#cSpd").value, g = SL[+$("#cSl").value][1], m = paxMass(), n = paxN(), b = BL.find((x) => x[0] === blk);
      const R = compute(kmhV, g, m, n, b), car = $("#car"), bw = lane.querySelector(".cell").offsetWidth;
      const xHit = (WALL0 - 2.05) * bw; let x = -bw * 2.1;
      const speedPx = Math.max(60, kmhV * 6);
      car.style.left = x + "px"; snd("click", 0.3);
      const t0 = performance.now(); let phase = 0, idx = 0, lastBreak = 0;
      const wallCells = $$(".cell.w", lane), grCells = $$(".cell.g", lane);
      const chunk = (cell, src) => { for (let k = 0; k < 6; k++) { const c = document.createElement("img"); c.src = src; c.className = "chunk"; const r = cell.getBoundingClientRect(), L = lane.getBoundingClientRect(); c.style.left = (r.left - L.left + r.width / 2) + "px"; c.style.top = (r.top - L.top + r.height / 2) + "px"; lane.appendChild(c); c.animate([{ transform: "translate(0,0)", opacity: 1 }, { transform: `translate(${ri(-40, 60)}px,${ri(-60, 10)}px) rotate(${ri(-180, 180)}deg)`, opacity: 0 }], { duration: 700, easing: "cubic-bezier(.2,.8,.3,1)" }); setTimeout(() => c.remove(), 720); } };
      (function f(now) {
        const dt = 1 / 60;
        if (phase === 0) { x += speedPx * dt; if (x >= xHit) { x = xHit; phase = 1; lastBreak = now; if (R.kind === "soft") snd(blk === "slime_block" ? "slime" : "cloth", 0.6); else if (R.kind === "slow" || R.kind === "stop" || R.kind === "hardstop" || R.kind === "nodepth") snd("anvil", 0.35, 1.2); } }
        else if (phase === 1) {
          const maxI = Math.max(R.wall.length ? Math.max(...R.wall) + 1 : 0, R.ground.length ? Math.max(...R.ground) + 1 : 0);
          if (idx < maxI && now - lastBreak > 130) {
            const i = idx++; lastBreak = now;
            if (R.wall.includes(i)) { const c = wallCells[WALL0 + i]; c.classList.add("gone"); chunk(c, I(blk)); }
            if (R.ground.includes(i)) { const c = grCells[WALL0 + i]; c.classList.add("gone"); chunk(c, I("grass_block")); }
            snd(R.hard ? "gravel" : blk === "glass" ? "glass" : "grass", 0.5, 0.9 + Math.random() * 0.2);
            x = xHit + (i + 1) * bw * (R.wall.includes(i) ? 1 : 0);
          } else if (idx >= maxI && now - lastBreak > 200) { phase = 2;
            if (R.kind === "obs") { snd("break", 0.7, 0.7); car.animate([{ opacity: 1, transform: "scaleX(-1)" }, { opacity: 0, transform: "scaleX(-1) translateY(20px) rotate(30deg)" }], { duration: 500, fill: "forwards" }); }
            else if (R.kind === "hardstop") { snd("anvil", 0.45, 1.2); $$(".cell.w img", lane).slice(WALL0, WALL0 + 1).forEach((im) => im.parentNode.classList.add("cracked")); }
            out(R, kmhV, b); busy = false; return;
          }
        }
        car.style.left = x + "px";
        requestAnimationFrame(f);
      })(t0);
    }
    $("#cBlocks").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b || busy) return; blk = b.dataset.k; $$("#cBlocks button").forEach((x) => x.setAttribute("aria-pressed", x === b)); build(); snd("stone", 0.35); upd(); });
    const upd = () => {
      const v = +$("#cSpd").value; $("#cSpdT").textContent = v + " км/ч"; $("#cSlT").textContent = SL[+$("#cSl").value][0];
      const m = paxMass(), imp = v / 72;
      if (!busy) { const bb = BL.find((x) => x[0] === blk); out(compute(v, SL[+$("#cSl").value][1], m, paxN(), bb), v, bb); $("#cNote").textContent = "Прогноз до удара. Жми «Таран!», чтобы проверить вживую. " + $("#cNote").textContent; }
      // сбить моба
      const dmg = clamp(v / 22, 2, 14), loss = clamp(Math.round(imp * 4 / Math.max(1, m * 0.35)), 1, 25);
      let h = ""; const hp = 20 - dmg;
      for (let i = 0; i < 10; i++) { const val = hp - i * 2; const pos = val >= 2 ? "-104px 0" : val >= 1 ? "-122px 0" : "-32px 0"; h += `<i style="background:url(${T("v/icons")}) ${pos}/512px 512px"></i>`; }
      $("#mobVis").innerHTML = `<img src="${MOB("zombie")}" width="44" alt=""><div class="hearts">${h}</div>`;
      $("#mobOut").innerHTML = [["Урон", `${fmt(dmg, 1)} (${fmt(dmg / 2, 1)} ❤)`], ["Отброс", `${fmt(0.55 + v / 130, 2)} + подлёт 0.28`], ["Корпус", `−${loss} (не больше 25)`], ["Самокат тормозит", `на ${fmt(0.1 / Math.max(1, m) * 72, 1)} км/ч`], ["Порог", "от 8.6 км/ч, раз в 6 тиков"]].map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("");
      const d2 = clamp(v / 20, 2, 18);
      $("#twoVis").innerHTML = `<img src="${I("scooter")}" width="76" alt="" style="transform:scaleX(-1) rotate(-6deg)"><b style="font:800 22px var(--f-h);color:#e2453b">✕</b><img src="${I("scooter")}" width="76" alt="" style="transform:rotate(-6deg)">`;
      $("#twoOut").innerHTML = [["Урон каждому", `−${Math.round(d2)} прочности`], ["Отскок", fmt(0.45 + v / 160, 2)], ["Скорость", "×0.35 обоим"], ["Пассажиры", "остаются на месте"], ["Звук", "наковальня"]].map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("");
    };
    $("#cSpd").addEventListener("input", upd); $("#cSl").addEventListener("input", upd);
    $("#cGo").addEventListener("click", run);
    paxL.push(upd);
    // лут
    const loot = (crash) => {
      const v = +$("#cSpd").value, ser = crash ? clamp((v / 72) / MAXF, 0.35, 1) : 0.15 + Math.random() * 0.25;
      let u = Math.round(lerp(ser, 81, 1)); u = clamp(u + ri(-2, 2), 1, 81);
      const ing = Math.floor(u / 9), nug = u % 9;
      $("#loot").innerHTML = (ing ? `<span><img src="${I("iron_ingot")}" alt="Железный слиток"><b>${ing > 1 ? ing : ""}</b></span>` : "") + (nug ? `<span><img src="${I("iron_nugget")}" alt="Железный самородок"><b>${nug > 1 ? nug : ""}</b></span>` : "");
      $("#lootNote").innerHTML = crash ? `Лобовое на ${v} км/ч: тяжесть ${fmt(ser * 100, 0)}%, уцелело ${u} самородков из 81. Чем быстрее влетел, тем меньше запчастей.` : `Обычная поломка (прочность кончилась от ударов или воды): тяжесть 15–40%, выпало ${u} самородков из 81, это ${ing} слитков и ${nug} самородков.`;
      snd("break", 0.6, 0.7);
    };
    $("#lootA").addEventListener("click", () => loot(false)); $("#lootB").addEventListener("click", () => loot(true));
    build(); upd();
    $("#loot").innerHTML = `<span class="sc-hint" style="width:auto;height:auto;background:none;border:0;display:block">Пассажиры летят на землю с 4 урона каждый, а самокат рассыпается в железо: от одного самородка до девяти слитков.</span>`;
  })();

  /* ================= 05 ЗАРЯД ================= */
  (function charge() {
    // кубик порта
    const cube = $("#cube"), wrap = $("#cubeWrap"); const st = { ry: -38, rx: -24 }; let d = null;
    wrap.addEventListener("pointerdown", (e) => { d = { x: e.clientX, y: e.clientY, ry: st.ry, rx: st.rx }; try { wrap.setPointerCapture(e.pointerId); } catch (_) {} });
    wrap.addEventListener("pointermove", (e) => { if (!d) return; st.ry = d.ry + (e.clientX - d.x) * 0.5; st.rx = clamp(d.rx - (e.clientY - d.y) * 0.4, -80, 80); cube.style.transform = `rotateX(${st.rx}deg) rotateY(${st.ry}deg)`; });
    const up = () => (d = null); wrap.addEventListener("pointerup", up); wrap.addEventListener("pointercancel", up);
    wrap.addEventListener("click", () => snd("metal", 0.5));
    $("#portTip").innerHTML = `<div>${K.mcHtml("§fПорт зарядки")}</div><div style="color:#555">zitraksmode:charging_port</div>`;
    K.dl($("#portDl"), [
      ["Прочность", "1.2, как у каменной плиты · взрывоустойчивость 4"],
      ["Добыча", `<img src="${I("iron_pickaxe")}" width="18" alt=""> любая кирка, иначе не выпадет`],
      ["Свет", "12"],
      ["Редстоун", "сигнал 12 во все стороны, всегда"],
      ["Ставится", "лицом к игроку"],
      ["Рецепт", "нет: только со станций или из творческого"],
      ["Зона", "самокат в 2 блоках по горизонтали и 1 по высоте"],
    ]);
    // калькулятор
    const MODES = [["ровно", 1], ["в гору", 1.2], ["груз от 5", 1.1], ["в гору с грузом", 1.3]];
    let mode = 0;
    $("#kMode").innerHTML = MODES.map(([n], i) => `<button type="button" data-i="${i}" aria-pressed="${i === 0}">${n}</button>`).join("") + `<button type="button" data-p="1.5">скрафчен</button><button type="button" data-p="75">со станции</button><button type="button" data-p="100">полный</button>`;
    $("#kMode").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.p) { $("#kCh").value = b.dataset.p; if (b.dataset.p === "75") $("#kCh").value = 50 + Math.random() * 50; }
      else { mode = +b.dataset.i; $$("#kMode button[data-i]").forEach((x) => x.setAttribute("aria-pressed", x === b)); }
      snd("click", 0.4); calc();
    });
    function calc() {
      const ch = +$("#kCh").value, sp = +$("#kSp").value, mul = MODES[mode][1];
      $("#kChT").textContent = fmt(ch, 1) + "%"; $("#kSpT").textContent = sp + " км/ч";
      const blocks = ch / 100 * 15000 / mul, bps = sp / KMH * MOVE * 20, sec = blocks / bps;
      $("#kBat").style.width = ch + "%"; $("#kBat").style.background = ch <= 15 ? "#ff5555" : ch <= 40 ? "#ffaa00" : "#00e0a0";
      $("#kBatT").textContent = `${fmt(ch * 10000, 0)} / 1 000 000`;
      const mm = Math.floor(sec / 60), ss = Math.round(sec % 60);
      $("#kOut").innerHTML = [
        ["Хватит на", `${fmt(blocks, 0)} блоков`, "ok"],
        ["Это", `${fmt(blocks / 768, 1)} квадрата между станциями`],
        ["Время в пути", sec > 0 ? `${mm} мин ${ss} с` : "—"],
        ["Реальная скорость", `${fmt(bps, 2)} блока/с`],
        ["До полного у порта", `${fmt(100 - ch, 0)} с`],
        ["Расход", `×${fmt(mul, 1)} · ${fmt(CPB * mul, 1)} ед. на блок`],
      ].map(([a, b, c]) => `<dt>${a}</dt><dd class="${c || ""}">${b}</dd>`).join("");
    }
    $("#kCh").addEventListener("input", calc); $("#kSp").addEventListener("input", calc); calc();
  })();

  /* ================= 06 СТАНЦИИ ================= */
  const ST = ZM.P24ST;
  (function station() {
    const cv = $("#st3d");
    const E = window.ZMVox && ZMVox.supported() ? ZMVox.create(cv, { atlas: ST.atlas }) : null;
    const w = ST.world, C = [w.sx / 2, 1.6, w.sz / 2];
    if (!E) $("#stHud").textContent = "WebGL недоступен";
    else {
      E.setWorld({ sx: w.sx, sy: w.sy, sz: w.sz, data: Uint8Array.from(w.data) });
      E.env.fog = [200, 400]; E.env.fade = false;
      const portBoxes = (on) => E.setBoxes(on ? ST.ports.map((p) => ({ min: [p[0] - 0.04, p[1] - 0.04, p[2] - 0.04], max: [p[0] + 1.04, p[1] + 1.04, p[2] + 1.04], c: [0, 0.88, 0.63, 0.28], flat: true })) : []);
      Object.assign(E.cam, { target: C.slice(), yaw: -2.2, pitch: 0.5, dist: 17, fov: 50 });
      let drag = null, lastI = -1e9, focus = null, home = { target: C.slice(), dist: 17 };
      cv.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, yaw: E.cam.yaw, pitch: E.cam.pitch }; focus = null; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
      cv.addEventListener("pointermove", (e) => { if (!drag) return; E.cam.yaw = drag.yaw - (e.clientX - drag.x) * 0.008; E.cam.pitch = clamp(drag.pitch + (e.clientY - drag.y) * 0.006, 0.05, 1.35); lastI = performance.now(); });
      const up = () => (drag = null); cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
      const s0 = ST.signs[0], p1 = ST.ports[1];
      $("#stSign").addEventListener("click", () => { focus = { target: [s0[0] + 0.2, s0[1] + 0.55, s0[2] + 0.5], yaw: Math.PI / 2, pitch: 0.08, dist: 3.4 }; portBoxes(false); $("#stHud").textContent = "«БЕНЗИНА НЕТ!» — две таблички по краям навеса"; snd("wood", 0.5); });
      $("#stPorts").addEventListener("click", () => { focus = { target: [p1[0] + 0.5, p1[1] + 0.5, p1[2] + 0.5], yaw: Math.PI / 2 + 0.5, pitch: 0.35, dist: 7 }; portBoxes(true); $("#stHud").textContent = "три порта смотрят в одну сторону, самокаты встают перед ними носом к порту"; snd("metal", 0.5); });
      $("#stAll").addEventListener("click", () => { focus = { target: home.target, yaw: E.cam.yaw, pitch: 0.5, dist: home.dist }; portBoxes(false); $("#stHud").textContent = "тяни — вращать"; snd("click", 0.4); });
      const vis = visible(cv); let last = performance.now();
      (function loop(now) {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (vis()) {
          const c = E.cam;
          if (focus) { const k = 1 - Math.pow(0.02, dt); for (let i = 0; i < 3; i++) c.target[i] += (focus.target[i] - c.target[i]) * k; let dy = focus.yaw - c.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); c.yaw += dy * k; c.pitch += (focus.pitch - c.pitch) * k; c.dist += (focus.dist - c.dist) * k; }
          else if (!drag && performance.now() - lastI > 1800 && motion()) c.yaw += dt * 0.2;
          E.render();
        }
        requestAnimationFrame(loop);
      })(last);
    }
    const cnt = {}; for (const id of w.data) if (id) { const n = ST.atlas.blocks[id].name; cnt[n] = (cnt[n] || 0) + 1; }
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
    K.dl($("#stDl"), [
      ["Размер", `${w.sx} × ${w.sy} × ${w.sz} блоков`],
      ["Блоков", `${ST.count}, ${top.length} видов`],
      ["Больше всего", top.slice(0, 3).map(([n, c]) => `${esc(n)} ×${c}`).join(", ")],
      ["Порты", `${ST.ports.length}, все смотрят в одну сторону`],
      ["Таблички", "2 · «БЕНЗИНА / НЕТ!»"],
      ["Свет", "фонарь под навесом + сами порты светят на 12"],
      ["Поворот", "случайный из четырёх, вокруг центра"],
      ["Самокаты", "0–3 штуки перед портами, заряд 50–100%, ливрея случайная"],
      ["Если шаблон потерян", "вместо постройки встают 6 голых портов на гладком камне"],
    ]);

    /* ---- карта мира ---- */
    const GRID = 768, JIT = 120;
    const mcv = $("#mapCv"), g = mcv.getContext("2d");
    let seed, cells, P, cam, sel = null, walk = null, inv = { port: 0, scooter: 0 };
    const hash = (a, b) => { let h = (seed ^ (a * 374761393) ^ (b * 668265263)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const rnd = (a, b, k) => hash(a * 7 + k, b * 13 - k);
    const land = (x, z) => { const v = Math.sin(x * 0.0021 + seed % 7) + Math.sin(z * 0.0017 + seed % 11) + Math.sin((x + z) * 0.0013 + seed % 5) * 0.8; return v > -1.15; };
    function ensure(cx, cz) {
      const key = cx + "," + cz; if (cells[key]) return;
      let x = cx * GRID + GRID / 2 + Math.floor(rnd(cx, cz, 1) * (JIT * 2 + 1)) - JIT, z = cz * GRID + GRID / 2 + Math.floor(rnd(cx, cz, 2) * (JIT * 2 + 1)) - JIT;
      let ok = land(x, z), moved = false;
      if (!ok) for (let a = 0; a < 12 && !ok; a++) { const tx = cx * GRID + 16 + Math.floor(rnd(cx, cz, 10 + a) * (GRID - 32)), tz = cz * GRID + 16 + Math.floor(rnd(cx, cz, 30 + a) * (GRID - 32)); if (land(tx, tz)) { x = tx; z = tz; ok = true; moved = true; } }
      if (!ok) { cells[key] = { skip: true, cx, cz }; return; }
      const r = Math.random(); const n = r < 0.02 ? 3 : r < 0.08 ? 2 : r < 0.23 ? 1 : 0;
      const sc = Array.from({ length: n }, () => ({ ch: Math.round(50 + Math.random() * 50), skin: ri(0, 2) }));
      cells[key] = { cx, cz, x, z, moved, ports: 3, sc, rot: ri(0, 3) * 90, t: performance.now() };
    }
    const around = () => { const cx = Math.floor(P[0] / GRID), cz = Math.floor(P[1] / GRID); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) ensure(cx + dx, cz + dz); };
    function newWorld() { seed = (Math.random() * 2 ** 31) | 0; cells = {}; P = [ri(-200, 200), ri(-200, 200)]; cam = P.slice(); sel = null; walk = null; around(); side(); draw(); }
    let scale = 1;
    const fit = () => { scale = Math.min(mcv.clientWidth, mcv.clientHeight) / 2000; };
    const X = (x) => mcv.clientWidth / 2 + (x - cam[0]) * scale, Y = (z) => mcv.clientHeight / 2 + (z - cam[1]) * scale;
    function draw() {
      const d = Math.min(2, devicePixelRatio || 1), W = mcv.clientWidth, H = mcv.clientHeight;
      if (mcv.width !== Math.round(W * d) || mcv.height !== Math.round(H * d)) { mcv.width = Math.round(W * d); mcv.height = Math.round(H * d); }
      fit(); g.setTransform(d, 0, 0, d, 0, 0);
      // рельеф: суша/вода крупными клетками
      const step = 48, x0 = cam[0] - W / 2 / scale, z0 = cam[1] - H / 2 / scale;
      for (let x = Math.floor(x0 / step) * step; x < x0 + W / scale + step; x += step) for (let z = Math.floor(z0 / step) * step; z < z0 + H / scale + step; z += step) {
        const l = land(x + step / 2, z + step / 2); g.fillStyle = l ? ((((x + z) / step) & 1) ? "#14231a" : "#16261c") : "#0d1b2a"; g.fillRect(X(x), Y(z), step * scale + 1, step * scale + 1);
      }
      // сетка ячеек
      g.strokeStyle = "rgba(0,224,160,.16)"; g.lineWidth = 1; g.setLineDash([4, 6]);
      for (let x = Math.floor(x0 / GRID) * GRID; x < x0 + W / scale + GRID; x += GRID) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), H); g.stroke(); }
      for (let z = Math.floor(z0 / GRID) * GRID; z < z0 + H / scale + GRID; z += GRID) { g.beginPath(); g.moveTo(0, Y(z)); g.lineTo(W, Y(z)); g.stroke(); }
      g.setLineDash([]);
      // зона генерации 3×3
      const pcx = Math.floor(P[0] / GRID), pcz = Math.floor(P[1] / GRID);
      g.strokeStyle = "rgba(0,224,160,.45)"; g.lineWidth = 1.5; g.strokeRect(X((pcx - 1) * GRID), Y((pcz - 1) * GRID), GRID * 3 * scale, GRID * 3 * scale);
      g.font = "11px sans-serif"; g.fillStyle = "rgba(0,224,160,.6)"; g.fillText("зона генерации 3×3", X((pcx - 1) * GRID) + 6, Y((pcz - 1) * GRID) + 14);
      // станции
      for (const c of Object.values(cells)) {
        if (c.skip) { const cx0 = X(c.cx * GRID + GRID / 2), cy0 = Y(c.cz * GRID + GRID / 2); g.fillStyle = "rgba(255,255,255,.25)"; g.fillText("суши нет", cx0 - 22, cy0); continue; }
        const x = X(c.x), y = Y(c.z), r = 7, pop = clamp((performance.now() - c.t) / 400, 0, 1);
        g.save(); g.translate(x, y); g.scale(pop, pop);
        g.fillStyle = sel === c ? "#ffffff" : c.sc.length ? "#00e0a0" : "#1f8f6c"; g.beginPath(); g.moveTo(0, -r * 1.6); g.lineTo(r, 0); g.lineTo(0, r * 1.6 * 0.3); g.lineTo(-r, 0); g.closePath(); g.fill();
        g.fillStyle = "#06110d"; g.font = "bold 9px sans-serif"; g.textAlign = "center"; g.fillText("⚡", 0, -1); g.textAlign = "left";
        g.restore();
        if (c.sc.length) { g.fillStyle = "#ffd166"; g.font = "bold 11px sans-serif"; g.fillText("×" + c.sc.length, x + 9, y + 4); }
      }
      // игрок
      g.fillStyle = "#fff"; g.beginPath(); g.arc(X(P[0]), Y(P[1]), 5, 0, 7); g.fill(); g.strokeStyle = "#00e0a0"; g.lineWidth = 2; g.stroke();
      g.fillStyle = "rgba(255,255,255,.8)"; g.font = "11px sans-serif"; g.fillText(`${Math.round(P[0])} / ${Math.round(P[1])}`, X(P[0]) + 9, Y(P[1]) - 8);
    }
    function side() {
      const list = Object.values(cells), st = list.filter((c) => !c.skip), scs = st.reduce((s, c) => s + c.sc.length, 0);
      $("#odds").innerHTML = `<div><span>без самокатов</span><i style="--w:77%"></i><b>77%</b></div><div><span>1 самокат</span><i style="--w:15%"></i><b>15%</b></div><div><span>2 самоката</span><i style="--w:6%"></i><b>6%</b></div><div><span>3 самоката</span><i style="--w:2%"></i><b>2%</b></div>
        <p class="sc-small">В этом мире: станций <b>${st.length}</b>, самокатов на них <b>${scs}</b>, пустых квадратов <b>${list.length - st.length}</b>. В инвентаре: портов <b>${inv.port}</b>, самокатов <b>${inv.scooter}</b>.</p>`;
      if (!sel) { $("#msTitle").textContent = "Станция"; $("#msBody").innerHTML = "Кликни по карте, чтобы пойти туда. Станции появляются, когда квадрат попадает в зону 3×3 вокруг игрока. Кликни по станции, чтобы подойти к ней."; $("#msAct").innerHTML = ""; return; }
      const c = sel, dist = Math.hypot(c.x - P[0], c.z - P[1]), near = dist < 24;
      $("#msTitle").textContent = `Станция ${c.cx} / ${c.cz}`;
      $("#msBody").innerHTML = `<dl class="sc-tele"><dt>Координаты</dt><dd>${c.x} / ${c.z}</dd><dt>Центр квадрата</dt><dd>${c.cx * GRID + 384} / ${c.cz * GRID + 384}</dd><dt>Сдвиг</dt><dd>${c.moved ? "центр в воде, перенесена на сушу" : `${c.x - c.cx * GRID - 384} / ${c.z - c.cz * GRID - 384}`}</dd><dt>Поворот</dt><dd>${c.rot}°</dd><dt>Порты</dt><dd>${c.ports} из 3</dd><dt>До неё</dt><dd class="${near ? "ok" : ""}">${near ? "ты на месте" : fmt(dist, 0) + " блоков"}</dd></dl>` +
        (c.sc.length ? `<div class="sc-sc">${c.sc.map((s) => `<span><img src="${I("scooter")}" alt="">${s.ch}% · ${["Стандарт", "Яндекс Go", "Юрент"][s.skin]}</span>`).join("")}</div>` : `<p class="sc-small">Самокатов нет — так бывает в 77% случаев.</p>`);
      $("#msAct").innerHTML = near ? `${c.ports ? `<button type="button" class="sc-chip" id="msDig">⛏ выкопать порт</button>` : ""}${c.sc.length ? `<button type="button" class="sc-chip" id="msPack">сложить самокат</button>` : ""}` : `<button type="button" class="sc-chip" id="msGo">идти к станции</button>`;
      const b1 = $("#msDig"), b2 = $("#msPack"), b3 = $("#msGo");
      b1 && b1.addEventListener("click", () => { c.ports--; inv.port++; snd("metal", 0.6); snd("pop", 0.4); log("§7+1 Порт зарядки"); grant("find_station"); side(); draw(); });
      b2 && b2.addEventListener("click", () => { const s = c.sc.shift(); inv.scooter++; snd("pack", 0.6, 0.9); log(`§7+1 Самокат (§b${s.ch}%§7)`); grant("scooter_craft"); side(); draw(); });
      b3 && b3.addEventListener("click", () => goTo([c.x - 6, c.z + 4]));
    }
    function goTo(T2) {
      const from = P.slice(), L = Math.hypot(T2[0] - from[0], T2[1] - from[1]), t0 = performance.now(), dur = clamp(L * 1.2, 300, 3500);
      walk = true;
      (function f(now) {
        const k = clamp((now - t0) / dur, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        P = [lerp(e, from[0], T2[0]), lerp(e, from[1], T2[1])]; cam = [lerp(0.08, cam[0], P[0]), lerp(0.08, cam[1], P[1])];
        const before = Object.keys(cells).length; around(); if (Object.keys(cells).length > before) snd("orb", 0.3, 1.4);
        draw(); if (k < 1) requestAnimationFrame(f); else { walk = null; side(); settle(); }
      })(t0);
    }
    const settle = () => { const t0 = performance.now(), c0 = cam.slice(); (function f(now) { const k = clamp((now - t0) / 500, 0, 1); cam = [lerp(k, c0[0], P[0]), lerp(k, c0[1], P[1])]; draw(); if (k < 1) requestAnimationFrame(f); })(t0); };
    let dr = null;
    mcv.addEventListener("pointerdown", (e) => { dr = { x: e.clientX, y: e.clientY, c: cam.slice(), m: false }; try { mcv.setPointerCapture(e.pointerId); } catch (_) {} });
    mcv.addEventListener("pointermove", (e) => { if (!dr) return; const dx = e.clientX - dr.x, dy = e.clientY - dr.y; if (Math.abs(dx) + Math.abs(dy) > 6) dr.m = true; if (dr.m) { cam = [dr.c[0] - dx / scale, dr.c[1] - dy / scale]; draw(); } });
    mcv.addEventListener("pointerup", (e) => {
      if (!dr) return; const m = dr.m; dr = null; if (m || walk) return;
      const r = mcv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      const hit = Object.values(cells).find((c) => !c.skip && Math.hypot(X(c.x) - px, Y(c.z) - py) < 14);
      if (hit) { sel = hit; snd("click", 0.4); side(); draw(); if (Math.hypot(hit.x - P[0], hit.z - P[1]) >= 24) goTo([hit.x - 6, hit.z + 4]); }
      else { goTo([cam[0] + (px - mcv.clientWidth / 2) / scale, cam[1] + (py - mcv.clientHeight / 2) / scale]); }
    });
    mcv.addEventListener("pointercancel", () => (dr = null));
    $("#mapNew").addEventListener("click", () => { newWorld(); snd("click", 0.4); });
    addEventListener("resize", () => draw());
    newWorld();
  })();

  /* ================= 07 КРАФТ И УПРАВЛЕНИЕ ================= */
  K.craft($("#craftBox"), {
    pattern: ["T  ", "I  ", "WSW"],
    key: { T: { name: "Палка", id: "minecraft:stick", src: I("stick") }, I: { name: "Железная решётка", id: "minecraft:iron_bars", src: I("iron_bars") },
      W: { name: "Точило", id: "minecraft:grindstone", src: I("grindstone") }, S: { name: "Тяжёлая нажимная плита", id: "minecraft:heavy_weighted_pressure_plate", src: I("heavy_weighted_pressure_plate") } },
    result: { name: "Самокат", id: "zitraksmode:scooter", src: I("scooter") },
    onTake: () => { grant("scooter_craft"); log("§7+1 Самокат · заряд §c1%§7, прочность 500"); $("#craftNote").innerHTML = "Самокат собран, но заряда в нём <b>1.5%</b>: при крафте пишется старое значение 15 000 из миллиона. Это около 225 блоков, примерно 20 секунд на полном ходу. Дальше — на станцию."; },
  });
  const KEYS = [
    ["W / S", "Газ и тормоз", "S сначала тормозит, на месте включает задний ход до 18 км/ч"],
    ["A / D", "Руль", "8.5° за тик на месте, 10.5° на ходу, на 72+ км/ч чуть туже. Задом руль работает наоборот"],
    ["ПКМ", "Гудок (водитель)", "бас + колокольчик, не чаще раза в 0.6 с. Остальным ПКМ — сесть на свободное место"],
    ["Shift + ПКМ", "Сложить", "или удар пустой рукой. Только когда на деке никого и самокат стоит"],
    ["Shift", "Слезть", "водитель и пассажиры сходят с правой стороны"],
    ["ПКМ предметом", "Поставить", "на грань блока носом по взгляду, в воздух — в двух блоках перед собой"],
    ["G", "«Сложить самокат»", "клавиша работает только у водителя на борту, а с кем-то на борту складывать нельзя. Итог: ничего", 1],
    ["B / N", "«Сигнал» и «Фара»", "есть в настройках управления, но ни к чему не подключены. Гудок — только ПКМ, фары нет", 1],
  ];
  $("#keys").innerHTML = KEYS.map(([k, t, d, dead]) => `<div class="sc-key ${dead ? "dead" : ""}"><kbd>${esc(k)}</kbd><div><b>${esc(t)}</b><p>${esc(d)}</p></div></div>`).join("");

  /* ================= 08 ТОНКОСТИ ================= */
  const NOTES = [
    ["Спидометр врёт вдвое", "На экран скорость идёт с множителем 72, а в движение — с 0.5. Честные «80 км/ч» — это 0.55 блока за тик, 11 блоков в секунду, около 40 км/ч, если блок считать метром."],
    ["Скрафченный почти пустой", "Обработчик крафта пишет в новый самокат заряд 15 000 — старое значение из времён, когда батарея была на 15 000. Сейчас батарея на миллион, так что из верстака выходит 1.5%. Из творческого самокат приходит полным, со станции — на 50–100%.", 1],
    ["Ливрея есть, покраски нет", "Стандарт, Яндекс Go и Юрент выпадают случайно и хранятся в самокате, но модель рисуется одной текстурой. Снаружи все три одинаковые."],
    ["Заряд — за блоки, не за время", "Стоять можно сколько угодно. Ноль заряда отключает газ, но под горку самокат катится сам и даже разгоняется."],
    ["Мёд и сено", "Скорость умножается каждый тик: на мёде ×0.55, на сене ×0.75. На практике это 1 и 2 км/ч, мёд работает и под колёсами, и внутри блока."],
    ["Слизь — бильярд", "Удар о стену на слизи отражает самокат с той же скоростью, нос разворачивается в новую сторону."],
    ["Вода разъедает", "В воде −1 прочности каждые 5 тиков, полный самокат умирает за 125 секунд. Ход тоже вязнет: ×0.88."],
    ["Пассажиров не выбрасывает", "Ни стена, ни моб, ни другой самокат не скидывают людей с деки. Сбросить их может только поломка самого самоката: каждому по 4 урона."],
    ["Камень не проломить", "Блоки с порогом выше 1.2 самокат не ломает никогда, даже если сила удара больше порога: стоит отдельная проверка. Исключение — обсидиан: при силе от 2.85 и скорости от 70 он ломается, но вместе с самокатом.", 1],
    ["Шерсть — буфер", "Шерсть и снег записаны и в ломаемые, и в мягкие. Проверка мягких идёт первой, поэтому шерстяная стена только тормозит до 55%."],
    ["Траншея", "Таран копает два слоя: блок стены и блок под колёсами. Тяжёлый самокат на скорости оставляет за собой канаву."],
    ["Косилка", "Упёршись в листву, траву, цветы, посевы, тростник, бамбук, лианы или паутину, самокат сносит их перед собой и едет дальше."],
    ["«Бензина нет» — не за клик", "ПКМ по порту пытается выдать ачивку по адресу, которого нет, и ничего не даёт. Ачивка приходит, когда порт оказывается в инвентаре.", 1],
    ["Порт съедает клик", "ПКМ по порту всегда «успешен», поэтому приставить к нему блок можно только с Shift."],
    ["Зарядка сквозь стену", "Порт ищется в коробке 5×3×5 вокруг самоката по блокам, а не по видимости. Можно спрятать порт под пол парковки."],
    ["Порт — источник питания", "Порт всегда выдаёт редстоун-сигнал 12 во все стороны, как постоянно включённый рычаг."],
    ["Станция раз и навсегда", "Отметка «квадрат готов» ставится даже если станцию поставить не удалось: квадрат целиком в воде или слишком низко. Снесённая станция тоже не вернётся."],
    ["Станция грузит чанки", "Чтобы станция появилась, игра принудительно загружает чанк в центре квадрата, даже если ты в 700 блоках от него. При входе в новые места это может дать короткий подлаг."],
    ["Ступеньки", "До трёх пассажиров самокат заезжает на целый блок, с четырьмя — на 0.6, с пятью — только на полублок."],
    ["Любой урон × 5", "Удар мечом на 7 снимает 35 прочности. Пустая рука вместо урона складывает самокат в предмет, если на нём никого нет."],
    ["Сотка только с горы", "На ровной потолок 80. Ачивка за 100 по спидометру берётся на спуске, а тяжёлые пассажиры добавляют накату почти вдвое."],
  ];
  $("#notesBox").innerHTML = NOTES.map(([h, p, r]) => `<div class="sc-note ${r ? "r" : ""}"><h4>${esc(h)}</h4><p>${esc(p)}</p></div>`).join("");

  /* ================= 09–10 ================= */
  adv = K.adv({ list: ZM.P24.advancements, store: "p24.adv", icon: (a) => I(a.icon), chatSel: "#log", intro: "Три скрытых: собрать самокат, добыть порт и выжать сотку." });
  K.timeline($("#tl"), [
    { date: "28.07.2026", ver: "1.1.2", t: "Электросамокат", d: "Самокат на пятерых со спидометром, массой пассажиров, тараном и тремя анимациями.", c: "#00e0a0" },
    { date: "28.07.2026", ver: "1.1.2", t: "Зарядная станция", d: "Порт зарядки и станции по сетке 768×768 в Верхнем мире, на некоторых уже стоят самокаты.", c: "#e2453b" },
  ]);
  K.finNav(24, $("#finNav"));
})();
