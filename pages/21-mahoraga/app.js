/* №21 · Махорага. Логика из MahoragaEntity / MahoragaSummonItem / MahoragaCinematicEntity / MahoragaOutpostSpawner / LaserBeamEntity:
   500 HP, 10 сегментов по 50, удар режется до границы сегмента; категория, добившая сегмент, → иммунитет, колесо +45°;
   10-й сегмент → фаза 2: 100 HP, скорость ×2, иммунитеты сброшены, больше не адаптируется, свиток хозяина сгорает;
   цели: только отмеченные хозяином ударом пустой руки (+1 приоритет, при равенстве — раньше отмеченный);
   навыки по старшинству: крик (≥6 врагов в r10) → лазер (≥14) → прыжок (|dy|>5, ≤22) → рывок (dy≤5, 3..15) → кулаки;
   лазер 20 блоков, тоннель 3×3, ранит всех кроме самого Махораги (хозяина тоже);
   ритуал 460 тиков, на 420-м Махорага падает с +67: кратер 3×3×3 + порча r4–7 (90%→35%) из 14 блоков. */
(function () {
  const { $, $$, esc } = ZM, K = ZM.kit, U = ZM.url;
  ZM.topbar({ crumb: "№21 · Махорага", ...ZM.pointNav(21) });
  const T = (p, e = "png") => U(`assets/textures/p21/${p}.${e}`);
  const I = (n) => T("i/" + n);
  const snd = K.sounds("p21");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motion = () => !reduce && !document.documentElement.classList.contains("no-motion");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const G = ZM.P21G, TEX = ZM.P21TEX;
  const GL = window.ZMGeo && ZMGeo.supported();
  const nick = () => (ZM.profile && ZM.profile.me().nick) || "Игрок";
  let adv = null;
  const grant = (k) => adv && adv.grant(k);
  const mc = K.mcHtml;
  const visible = (el, cb) => { let v = false; new IntersectionObserver((es) => { v = es[0].isIntersecting; cb && cb(v); }, { rootMargin: "100px" }).observe(el); return () => v; };

  /* ================= фон: пепел и души скалка ================= */
  (function bg() {
    const cv = $("#bg"), g = cv.getContext("2d"); let W, H, P = [];
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); W = cv.width = innerWidth * d; H = cv.height = innerHeight * d; P = Array.from({ length: innerWidth < 600 ? 34 : 70 }, () => mk(true)); };
    const mk = (any) => ({ x: Math.random() * W, y: any ? Math.random() * H : H + 10, r: rnd(0.6, 2.2) * (devicePixelRatio || 1), v: rnd(0.15, 0.6), w: rnd(0, Math.PI * 2), soul: Math.random() < 0.12, a: rnd(0.15, 0.55) });
    size(); addEventListener("resize", size);
    let last = performance.now();
    (function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!document.hidden && motion()) {
        g.clearRect(0, 0, W, H);
        for (const p of P) {
          p.y -= p.v * 60 * dt * (devicePixelRatio || 1); p.w += dt; p.x += Math.sin(p.w) * 0.3;
          if (p.y < -10) Object.assign(p, mk(false));
          g.fillStyle = p.soul ? `rgba(63,216,208,${p.a})` : `rgba(232,226,207,${p.a * 0.6})`;
          g.beginPath(); g.arc(p.x, p.y, p.soul ? p.r * 1.6 : p.r, 0, 7); g.fill();
        }
      }
      requestAnimationFrame(loop);
    })(last);
  })();

  /* ================= мини-колесо: 10 секций = 10 поворотов ================= */
  (function mini() {
    const seen = new Set(), secs = $$("main > section.sec"), el = $("#mini"), svg = el.querySelector("svg");
    const io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting && !seen.has(e.target.id)) {
        seen.add(e.target.id); svg.style.transform = `rotate(${seen.size * 45}deg)`; $("#miniN").textContent = `${seen.size}/${secs.length}`;
        if (seen.size >= secs.length) el.classList.add("full");
      }
    }, { threshold: 0.2 });
    secs.forEach((s) => io.observe(s));
  })();

  $("#strip").innerHTML = (() => { const s = ["<b>500</b> здоровья", "<em>魔虚羅</em>", "10 сегментов по <b>50</b>", "16 видов урона", "<em>八握剣</em>", "ритуал <b>460</b> тиков", "падение с <b>+67</b>", "фаза 2: <b>100</b> HP и скорость ×2", "<em>布瑠部由良</em>", "лазер на <b>20</b> блоков", "лут: <b>64</b> незерита"].map((x) => `<span>${x}</span>`).join(""); return s + s; })();

  /* ================= общая 3D-модель ================= */
  function mahoraga(cv, opt = {}) {
    if (!GL) return null;
    // два контроллера как в моде: movement (переход 5 тиков) и attack (2 тика); во время атаки idle не играет
    const g = ZMGeo.create(cv, { geo: G.m.geo, anim: G.m.anim, tex: TEX.m, idle: "idle", gecko: { inT: 0.1, outT: 0.25 } });
    // колесо крутит не анимация, а код: +45° за 10 тиков, угол копится (MahoragaModel.setLivingAnimations)
    let wA = 0, wT = 0; const tk = g.tick;
    g.turnWheel = () => { wT += 45; };
    g.resetWheel = () => { wA = wT = 0; };
    g.tick = (dt) => { tk(dt); if (wA < wT) wA = Math.min(wT, wA + 90 * dt); g.override.wheel = { ry: -wA }; };
    const bb = g.bbox(Object.keys(g.bones).filter((n) => g.bones[n].n));
    Object.assign(g.cam, { target: [bb.c[0], bb.c[1] + (opt.dy || 0), bb.c[2]], dist: bb.size[1] * (opt.k || 1.7), yaw: opt.yaw ?? 0, pitch: opt.pitch ?? 6, fov: 40 });
    g.bb = bb; return g;
  }
  const ATK = [["attack_left", 0.4], ["attack_right", 0.4], ["attack_double", 0.2]];
  const pickAtk = () => { let r = Math.random(); for (const [n, p] of ATK) { if ((r -= p) < 0) return n; } return "attack_right"; };

  /* ================= HERO ================= */
  (function hero() {
    const cv = $("#hero3d"), stage = $("#heroStage");
    const g = mahoraga(cv, { k: 2.0, pitch: 8 });
    if (!g) { cv.replaceWith(Object.assign(new Image(), { src: T("scroll_big"), className: "mh-model", style: "object-fit:contain;padding:20%" })); return; }
    const st = K.spinner(cv, { ry: -25, rx: 0 }, 30);
    let down = null, hp = 500, wheelA = 0, immune = false, immHits = 0;
    const cap = $("#heroStage figcaption"), capDef = cap.textContent;
    const pops = document.createElement("div"); pops.className = "mh-ad-pops"; stage.appendChild(pops);
    const pop = (txt, cls) => { const s = document.createElement("span"); s.textContent = txt; if (cls) s.className = cls; s.style.left = 50 + rnd(-14, 14) + "%"; pops.appendChild(s); setTimeout(() => s.remove(), 1000); };
    const bar = () => ($("#heroBar i").style.width = hp / 5 + "%");
    cv.addEventListener("pointerdown", (e) => (down = { x: e.clientX, y: e.clientY }));
    cv.addEventListener("pointerup", (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return; down = null;
      if (immune) {
        // ближний бой уже в иммунитете: урон не проходит, он отвечает кулаком
        pop("иммунитет", "imm"); ZM.sfx("stone", 0.4, 1.4);
        if (!g.st.act) { g.play(pickAtk()); snd("attack", 0.6, rnd(0.9, 1.1)); }
        if (++immHits >= 3) cap.innerHTML = `ближний бой больше не работает · <a href="#adapt">ломай другим уроном ↓</a>`;
        return;
      }
      // удар мечом ~12, но не больше остатка сегмента: 500 → 450
      const d = Math.min(12, hp - 450); hp -= d; bar(); ZM.sfx("hit", 0.5); pop("−" + d);
      if (hp <= 450) {
        immune = true; g.turnWheel(); wheelA += 45; $("#heroWheel").style.transform = `rotate(${wheelA}deg)`;
        snd("adapt", 0.5); setTimeout(() => pop("адаптировался", "adp"), 250);
        cap.textContent = "колесо повернулось · к ближнему бою иммунитет";
      }
    });
    const vis = visible(cv); let last = performance.now();
    (function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (vis()) {
        if (st.idle() && motion()) st.ry += dt * 14;
        g.tick(dt); const c = g.bb.c, M = g.M;
        g.setExtra(M.mul(M.t(c[0], c[1], c[2]), M.mul(M.rx(st.rx * Math.PI / 180), M.mul(M.ry(st.ry * Math.PI / 180), M.t(-c[0], -c[1], -c[2])))));
        g.render();
      }
      requestAnimationFrame(loop);
    })(last);
  })();

  /* ================= 01 · АВАНПОСТ ================= */
  const OUT = ZM.P21OUT;
  (function outpost() {
    const cv = $("#op3d");
    const E = window.ZMVox && ZMVox.supported() ? ZMVox.create(cv, { atlas: OUT.atlas }) : null;
    if (!E) { $("#opHud").textContent = "WebGL недоступен"; }
    else {
      const w = OUT.world; E.setWorld({ sx: w.sx, sy: w.sy, sz: w.sz, data: Uint8Array.from(w.data) });
      E.env.fog = [200, 400]; E.env.fade = false;
      const b = OUT.beacon; E.setBoxes([{ min: [b[0] + 0.36, b[1] + 1, b[2] + 0.36], max: [b[0] + 0.64, b[1] + 60, b[2] + 0.64], c: [0.55, 0.85, 0.95, 0.55], flat: true }]);
      const C = [w.sx / 2, 3.2, w.sz / 2];
      Object.assign(E.cam, { target: C.slice(), yaw: 0.9, pitch: 0.42, dist: 23, fov: 50 });
      let drag = null, lastI = -1e9, focus = null;
      cv.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, yaw: E.cam.yaw, pitch: E.cam.pitch }; focus = null; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
      cv.addEventListener("pointermove", (e) => { if (!drag) return; E.cam.yaw = drag.yaw - (e.clientX - drag.x) * 0.008; E.cam.pitch = clamp(drag.pitch + (e.clientY - drag.y) * 0.006, 0.05, 1.35); lastI = performance.now(); E.dirty = true; });
      const up = () => (drag = null); cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
      $("#opFrame").addEventListener("click", () => {
        const f = OUT.frame; focus = { target: [f[0] + 0.9, f[1] + 0.5, f[2] + 0.5], yaw: -Math.PI / 2 + 0.25, pitch: 0.12, dist: 5.2 };
        ZM.sfx("click", 0.5); $("#opHud").textContent = "рамка на восточной стене · свиток выпадает всегда (шанс 100%)";
      });
      const vis = visible(cv); let last = performance.now();
      (function loop(now) {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (vis()) {
          if (focus) {
            const c = E.cam, k = 1 - Math.pow(0.02, dt);
            for (let i = 0; i < 3; i++) c.target[i] += (focus.target[i] - c.target[i]) * k;
            let dy = focus.yaw - c.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); c.yaw += dy * k; c.pitch += (focus.pitch - c.pitch) * k; c.dist += (focus.dist - c.dist) * k;
          } else {
            const c = E.cam, k = 1 - Math.pow(0.1, dt);
            for (let i = 0; i < 3; i++) c.target[i] += (C[i] - c.target[i]) * k; c.dist += (23 - c.dist) * k;
            if (!drag && performance.now() - lastI > 1500 && motion()) c.yaw += dt * 0.18;
          }
          E.render();
        }
        requestAnimationFrame(loop);
      })(last);
    }
    // состав постройки
    const cnt = {}; for (const id of OUT.world.data) if (id) { const n = OUT.atlas.blocks[id].name; cnt[n] = (cnt[n] || 0) + 1; }
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
    K.dl($("#opDl"), [
      ["Размер", `${OUT.world.sx} × ${OUT.world.sy} × ${OUT.world.sz} блоков`],
      ["Блоков", `${OUT.count}, из них ${top.length} видов`],
      ["Больше всего", top.slice(0, 3).map(([n, c]) => `${esc(n)} ×${c}`).join(", ")],
      ["Свет", "11 фонарей душ, маяк на железной пирамиде"],
      ["Внутри", "рамка со свитком призыва Махораги"],
      ["Измерение", "только Верхний мир"],
    ]);
    const F = [
      ["Ставится один раз", "При первом запуске сервера или мира. Отметка «уже поставлен» хранится в данных мира, так что при следующих запусках второй аванпост не появится, даже если первый разобрать до основания."],
      ["Поиск по оку Края", "Брось око на спавне: оно полетит к ближайшей крепости. Аванпост стоит ровно посередине этого пути. Считается от общей точки спавна мира, а не от твоей кровати."],
      ["Если крепости нет", "Когда ближайшую крепость найти не удалось, серединой считается точка +500/+500 от спавна, то есть аванпост окажется на 250/250 от него."],
      ["Прямо на поверхность", "Высоту берёт по самому верхнему блоку, листва не в счёт. Если середина пути пришлась на океан, аванпост встанет прямо на воду."],
      ["Ачивка у угла", "Испытание «Следы божества» проверяет расстояние до угла, с которого ставилась постройка, а не до её центра. Достаточно пройти в 6 блоках от него."],
      ["Маяк можно забрать", "Маяк стоит на пирамиде из железных блоков и светит в небо, его видно издалека. Если сломать, он выпадет вместе с железом."],
    ];
    $("#opFacts").innerHTML = F.map(([t, d], i) => `<div class="mh-card ${i === 4 ? "red" : i === 5 ? "sculk" : ""}"><b>${esc(t)}</b><p>${esc(d)}</p></div>`).join("");

    // карта: спавн → крепость, аванпост посередине
    const mcv = $("#mapCv"), g = mcv.getContext("2d");
    let S, H, O, P = null, noSH = false, walk = null;
    const newWorld = (fallback) => {
      noSH = !!fallback; S = [ri(-60, 60), ri(-60, 60)];
      if (noSH) H = [S[0] + 500, S[1] + 500];
      else { const a = rnd(0, Math.PI * 2), r = rnd(1280, 2816); H = [Math.round(S[0] + Math.cos(a) * r), Math.round(S[1] + Math.sin(a) * r)]; }
      O = [Math.trunc((S[0] + H[0]) / 2), Math.trunc((S[1] + H[1]) / 2)]; P = null; walk = null; read(); draw();
    };
    const read = (extra = "") => {
      $("#mapRead").innerHTML = `Спавн <b>${S[0]} / ${S[1]}</b> · ${noSH ? "крепость не найдена, берётся" : "крепость"} <b>${H[0]} / ${H[1]}</b><br>Аванпост <b>${O[0]} / ${O[1]}</b> · до него <b>${Math.round(Math.hypot(O[0] - S[0], O[1] - S[1]))}</b> блоков ${extra}`;
    };
    function draw() {
      const d = Math.min(2, devicePixelRatio || 1), W = mcv.clientWidth * d, Hh = mcv.clientHeight * d; mcv.width = W; mcv.height = Hh;
      const minx = Math.min(S[0], H[0]), maxx = Math.max(S[0], H[0]), miny = Math.min(S[1], H[1]), maxy = Math.max(S[1], H[1]);
      const span = Math.max(maxx - minx, (maxy - miny) * W / Hh, 600) * 1.3, sc = W / span, cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
      const X = (x) => W / 2 + (x - cx) * sc, Y = (y) => Hh / 2 + (y - cy) * sc;
      g.fillStyle = "#0b0d10"; g.fillRect(0, 0, W, Hh);
      g.strokeStyle = "rgba(255,255,255,.05)"; g.lineWidth = 1;
      const step = span > 3000 ? 500 : 250;
      for (let x = Math.floor((cx - span) / step) * step; x < cx + span; x += step) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), Hh); g.stroke(); }
      for (let y = Math.floor((cy - span) / step) * step; y < cy + span; y += step) { g.beginPath(); g.moveTo(0, Y(y)); g.lineTo(W, Y(y)); g.stroke(); }
      g.setLineDash([6 * d, 6 * d]); g.strokeStyle = "rgba(63,216,208,.5)"; g.lineWidth = 2 * d; g.beginPath(); g.moveTo(X(S[0]), Y(S[1])); g.lineTo(X(H[0]), Y(H[1])); g.stroke(); g.setLineDash([]);
      const dot = (x, y, c, r, lab, img) => {
        g.fillStyle = c; g.beginPath(); g.arc(X(x), Y(y), r * d, 0, 7); g.fill();
        g.font = `${12 * d}px "MH Cond", sans-serif`; g.fillStyle = "#e8e2cf"; g.textAlign = "center"; g.fillText(lab, X(x), Y(y) - (r + 6) * d);
      };
      dot(S[0], S[1], "#e8e2cf", 5, "спавн"); dot(H[0], H[1], noSH ? "#555" : "#8a4dff", 6, noSH ? "+500/+500" : "крепость");
      // аванпост — маленькое колесо
      g.save(); g.translate(X(O[0]), Y(O[1])); g.strokeStyle = "#c9a45c"; g.lineWidth = 2 * d; g.beginPath(); g.arc(0, 0, 8 * d, 0, 7); g.stroke();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(Math.cos(a) * 3 * d, Math.sin(a) * 3 * d); g.lineTo(Math.cos(a) * 12 * d, Math.sin(a) * 12 * d); g.stroke(); }
      g.restore(); g.font = `${12 * d}px "MH Cond", sans-serif`; g.fillStyle = "#c9a45c"; g.textAlign = "center"; g.fillText("аванпост", X(O[0]), Y(O[1]) + 26 * d);
      if (P) { g.fillStyle = "#ff3a4f"; g.beginPath(); g.arc(X(P[0]), Y(P[1]), 4 * d, 0, 7); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 1 * d; g.stroke(); }
    }
    $("#mapNew").addEventListener("click", () => { newWorld(Math.random() < 0.12); ZM.sfx("click", 0.4); });
    $("#mapGo").addEventListener("click", () => {
      if (walk) return; ZM.sfx("click", 0.4); P = S.slice(); const dir = [H[0] - S[0], H[1] - S[1]], L = Math.hypot(dir[0], dir[1]); dir[0] /= L; dir[1] /= L;
      const t0 = performance.now(), dist = Math.hypot(O[0] - S[0], O[1] - S[1]) - 5; walk = true;
      (function step(now) {
        const k = Math.min(1, (now - t0) / 2600), e = 1 - Math.pow(1 - k, 2);
        P = [S[0] + dir[0] * dist * e, S[1] + dir[1] * dist * e]; draw();
        read(`· идёшь: <b>${Math.round(dist * e)}</b>`);
        if (k < 1) requestAnimationFrame(step);
        else { walk = null; read("· <b style='color:#3fd8d0'>ты в 6 блоках от угла</b>"); grant("find_outpost"); ZM.sfx("challenge", 0.4); }
      })(t0);
    });
    newWorld(false); addEventListener("resize", () => draw());
  })();

  /* ================= 02 · СВИТОК ================= */
  (function scroll() {
    const CD_CANCEL = 300, CD_SEAL = 600, RIT = 23;
    let clock = 0, cdEnd = 0, state = "free", ritT0 = 0, staleTag = false, lastReal = performance.now(), consumed = false;
    const now = () => clock;
    const fmt = (s) => { s = Math.max(0, Math.floor(s)); const m = Math.floor(s / 60), r = s % 60; return m > 0 ? `${m}м ${r}с` : `${r}с`; };
    const bar = (t) => K.chat("#scChat", t, 5);
    function tip() {
      const L = ["§fСвиток призыва Махораги"]; const cd = cdEnd - now();
      if (cd > 0) L.push("§cКД: §e" + fmt(cd)); else if (staleTag) L.push("§cКД активен");
      if (state === "ritual" || state === "alive") L.push("§5Привязан к активному ритуалу / Махораге");
      else { L.push("§7ПКМ — начать ритуал"); L.push("§7ПКМ ещё раз — прервать / изгнать"); }
      L.push("§6Не сгорает в огне, лаве и кактусе");
      $("#scTip").innerHTML = L.map((l) => `<div>${mc(l)}</div>`).join("");
      const img = $("#scImg"); img.classList.toggle("cd", cd > 0); img.classList.toggle("bound", state === "ritual" || state === "alive");
      const S = cd > 0 ? ["cd", "Восстанавливается", `ещё ${fmt(cd)} игрового времени`] : state === "ritual" ? ["rit", "Идёт ритуал", `до падения ${Math.max(0, RIT - 2 - (now() - ritT0)).toFixed(0)} с · ПКМ — прервать`] : state === "alive" ? ["alive", "Махорага в мире", "ПКМ — изгнать обратно в свиток"] : consumed ? ["cd", "Свиток сгорел", "Махорага вошёл во вторую фазу"] : ["", "Готов", "ПКМ — начать ритуал"];
      $("#scState").innerHTML = `<i class="${S[0]}"></i><div><b>${S[1]}</b><span>${S[2]}</span></div>`;
    }
    function tick() {
      const t = performance.now(); clock += (t - lastReal) / 1000; lastReal = t;
      if (state === "ritual" && now() - ritT0 >= RIT) { state = "alive"; bar("§7[" + nick() + ": Махорага призван]"); grant("summon_mahoraga"); snd("jump", 0.5); }
      if (cdEnd && now() >= cdEnd) { cdEnd = 0; staleTag = true; }
      tip();
    }
    setInterval(tick, 250);
    $("#scRmb").addEventListener("click", () => {
      ZM.sfx("click", 0.4);
      if (consumed) { bar("§8Свитка больше нет в инвентаре"); return; }
      if (cdEnd - now() > 0) { bar("§cСвиток ещё восстанавливается: §e" + fmt(cdEnd - now())); return; }
      if (state === "ritual") { state = "free"; cdEnd = now() + CD_CANCEL; staleTag = false; bar("§6Ритуал призыва прерван. §7(КД 5 минут)"); tip(); return; }
      if (state === "alive") { state = "free"; cdEnd = now() + CD_SEAL; staleTag = false; bar("§5Махорага изгнан обратно в свиток. §7(КД 10 минут)"); snd("adapt", 0.35, 1.4); tip(); return; }
      state = "ritual"; ritT0 = now(); bar("§5Ритуал призыва начат..."); tip();
    });
    $("#scStranger").addEventListener("click", () => {
      ZM.sfx("click", 0.4);
      if (state === "ritual" || state === "alive") bar("§cТолько хозяин этого свитка может управлять Махорагой.");
      else bar("§7Свиток свободен: второй игрок может начать свой ритуал сам");
    });
    $("#scFast").addEventListener("click", () => { clock += 60; ZM.sfx("click", 0.3, 1.3); tick(); });
    $("#scCmd").addEventListener("click", () => { cdEnd = 0; staleTag = false; bar("§aКД свитков Махораги сброшен."); ZM.sfx("orb", 0.4); tip(); });
    tip();
    const R = [
      ["mahoraga_scroll", "<b>Одна кнопка.</b> ПКМ начинает ритуал на месте, где ты стоишь. Нажмёшь ещё раз во время ритуала — прервёшь его (перезарядка 5 минут). Нажмёшь, когда Махорага уже бегает по миру — изгонишь его обратно (10 минут, лута не будет)."],
      ["player_head", "<b>Свиток помнит хозяина.</b> Пока ритуал или Махорага живы, чужой игрок этим свитком ничего не сделает. Как только они исчезли, привязка снимается, и свиток снова общий."],
      ["barrier", "<b>Один Махорага на хозяина.</b> Если у тебя уже идёт ритуал или живой Махорага, другим свитком ни призвать, ни изгнать не выйдет: только тем же, которым призывал. Проверяется в текущем измерении."],
      ["lava_bucket", "<b>Не горит.</b> Выброшенный свиток переживает огонь, лаву и кактус, как незеритовые вещи."],
      ["command_block", "<b>/mahoragaresetcd</b> сбрасывает перезарядку всех свитков в инвентаре. Нужен уровень оператора 2."],
    ];
    $("#scRules").innerHTML = R.map(([i, t]) => `<div><img src="${I(i)}" alt=""><span>${t}</span></div>`).join("");
    window.__p21scroll = { consume() { consumed = true; state = "free"; tip(); } };
  })();

  /* ================= 03 · РИТУАЛ ================= */
  (function ritual() {
    const cv = $("#rt3d"), LEN = 23;
    const CAPS = [[0, "§5Ритуал призыва начат..."], [1, "Вдали появляется кокон. Внутри свернулся Махорага"], [2.8, "Из земли одна за другой выныривают восемь жаб"], [6.5, "Кокон ползёт к центру круга и растёт"], [16, "Кокон трясёт. Колесо поднимается сквозь землю"], [20.5, "Кокон лопается"], [21, "Тик 420: Махорага падает с высоты 67 блоков"], [21.8, "Удар. Кратер 3×3 и порча вокруг"]];
    const MARKS = [[0, "старт"], [2.8, "жабы"], [16, "колесо"], [21, "падение"]];
    $("#rtMarks").innerHTML = MARKS.map(([t, l]) => `<i data-t style="left:${(t / LEN) * 100}%"><span>${l}</span></i>`).join("");
    const CAMS = [["Общий план", { target: [0, 20, -30], dist: 190, yaw: 38, pitch: 14 }], ["Глазами призывателя", { target: [0, 34, -30], dist: 60, yaw: 180, pitch: 4, eye: [0, 26, 130] }], ["Сверху", { target: [0, 0, -30], dist: 200, yaw: 0, pitch: 80 }], ["Крупно", { target: [0, 38, -6], dist: 150, yaw: 25, pitch: 6 }]];
    let cam = 0;
    $("#rtCams").innerHTML = CAMS.map(([n], i) => `<button type="button" data-i="${i}" class="${i ? "" : "on"}">${n}</button>`).join("");
    const g = GL ? ZMGeo.create(cv, { geo: G.c.geo, anim: G.c.anim, tex: TEX.c }) : null;
    if (!g) { $("#rtCap").textContent = "WebGL недоступен"; return; }
    const setCam = (i) => { cam = i; const c = CAMS[i][1]; g.cam.eye = c.eye || null; Object.assign(g.cam, { target: c.target, dist: c.dist, yaw: c.yaw, pitch: c.pitch, fov: 45 }); $$("#rtCams button").forEach((b) => b.classList.toggle("on", +b.dataset.i === i)); };
    setCam(0);
    $("#rtCams").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { setCam(+b.dataset.i); ZM.sfx("click", 0.3); } });
    g.st.act = "idle"; g.st.actT = 0.001;
    let t = 0, playing = false, capI = -1, landed = false;
    const music = new Audio(U("assets/sounds/p21/music.ogg")); music.preload = "none"; music.volume = 0.6;
    const syncMusic = () => { if (!ZM.sfx.on()) { music.pause(); return; } if (playing) { if (Math.abs(music.currentTime - t) > 0.25) music.currentTime = t; music.play().catch(() => {}); } else music.pause(); };
    const setT = (v) => { t = clamp(v, 0, LEN); g.st.actT = Math.max(0.001, t); landed = t >= 21.1 ? landed : false; };
    function ui() {
      $("#rtFill").style.width = (t / LEN) * 100 + "%"; $("#rtT").textContent = `${t.toFixed(1)} / ${LEN.toFixed(1)} с`;
      let ci = -1; CAPS.forEach(([ct], i) => { if (t >= ct) ci = i; });
      if (ci !== capI) { capI = ci; $("#rtCap").innerHTML = ci >= 0 ? mc(CAPS[ci][1].startsWith("§") ? CAPS[ci][1] : "§f" + CAPS[ci][1]) : ""; }
      $("#rtPP").textContent = playing ? "❚❚" : "▶";
    }
    const play = () => { if (t >= LEN) setT(0); playing = true; $("#rtPlay").hidden = true; syncMusic(); ui(); };
    const pause = () => { playing = false; syncMusic(); ui(); };
    $("#rtPlay").addEventListener("click", () => { ZM.sfx("click", 0.4); play(); });
    $("#rtPP").addEventListener("click", () => (playing ? pause() : play()));
    const tr = $("#rtTrack"); let sc = null;
    const seek = (e) => { const r = tr.getBoundingClientRect(); setT(((e.clientX - r.left) / r.width) * LEN); $("#rtPlay").hidden = true; syncMusic(); ui(); };
    tr.addEventListener("pointerdown", (e) => { sc = true; try { tr.setPointerCapture(e.pointerId); } catch (_) {} seek(e); });
    tr.addEventListener("pointermove", (e) => sc && seek(e));
    tr.addEventListener("pointerup", () => (sc = null));
    const vis = visible(cv, (v) => { if (!v && playing) pause(); });
    let last = performance.now();
    (function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (playing) {
        setT(t + dt);
        if (t >= 21.1 && !landed) { landed = true; window.__p21land && window.__p21land(); ZM.sfx("explode", 0.35); const v = $("#rtView"); v.animate([{ transform: "translate(0,0)" }, { transform: "translate(-6px,4px)" }, { transform: "translate(5px,-3px)" }, { transform: "translate(0,0)" }], { duration: 380 }); }
        if (t >= LEN) { playing = false; grant("summon_mahoraga"); $("#rtPlay").hidden = false; $("#rtPlay span").textContent = "Ещё раз"; syncMusic(); }
        ui();
      }
      if (vis()) {
        if (cam === 3) { const c = g.cam; c.yaw = 25 + Math.sin(now / 3000) * 20; }
        g.render();
      }
      requestAnimationFrame(loop);
    })(last);
    ui();
  })();

  /* ---------- приземление: кратер + порча ---------- */
  (function landing() {
    const POOL = [["sculk", "Скалк"], ["sculk_sensor", "Скалковый сенсор"], ["sculk_catalyst", "Скалковый катализатор"], ["sculk_shrieker", "Скалковый крикун"], ["magma_block", "Магмовый блок"], ["soul_sand", "Песок душ"], ["soul_soil", "Почва душ"], ["blackstone", "Чернит"], ["basalt", "Базальт"], ["netherrack", "Незерак"], ["crying_obsidian", "Плачущий обсидиан"], ["gilded_blackstone", "Позолоченный чернит"], ["cracked_polished_blackstone_bricks", "Потрескавшиеся кирпичи из полированного чернита"], ["polished_blackstone_bricks", "Кирпичи из полированного чернита"]];
    const imgs = {}; let loaded = 0; const need = POOL.length + 2;
    const load = (k) => { const im = new Image(); im.onload = () => { if (++loaded >= need) run(); }; im.src = T("b/" + k); imgs[k] = im; };
    POOL.forEach(([k]) => load(k)); load("grass_top"); load("dirt");
    const cv = $("#landCv"), g = cv.getContext("2d"), N = 17, C = 8, px = 16; cv.width = cv.height = N * px; g.imageSmoothingEnabled = false;
    let counts = {}, anim = null;
    $("#landPool").innerHTML = POOL.map(([k, n]) => `<span data-tip="${esc(n)}" data-k="${k}"><img src="${T("b/" + k)}" alt=""><b></b></span>`).join("");
    function run() {
      if (anim) cancelAnimationFrame(anim);
      const R = ri(4, 7), cells = [];
      for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) {
        if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) continue;
        const d2 = dx * dx + dz * dz; if (d2 > R * R) continue;
        const ch = 0.9 - (d2 / (R * R)) * 0.55; if (Math.random() > ch) continue;
        cells.push({ x: C + dx, z: C + dz, k: POOL[ri(0, POOL.length - 1)][0], d: Math.sqrt(d2) });
      }
      cells.sort((a, b) => a.d - b.d); counts = {}; cells.forEach((c) => (counts[c.k] = (counts[c.k] || 0) + 1));
      const t0 = performance.now(), dur = motion() ? 1400 : 0;
      (function frame(now) {
        const k = dur ? Math.min(1, (now - t0) / dur) : 1;
        for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) g.drawImage(imgs.grass_top, x * px, z * px, px, px);
        // кратер 3×3: провал на 3 блока
        g.fillStyle = "#050505"; g.fillRect((C - 1) * px, (C - 1) * px, 3 * px, 3 * px);
        g.globalAlpha = 0.35; g.drawImage(imgs.dirt, (C - 1) * px + 4, (C - 1) * px + 4, 3 * px - 8, 3 * px - 8); g.globalAlpha = 1;
        const lim = cells.length * k;
        for (let i = 0; i < lim; i++) { const c = cells[i]; g.drawImage(imgs[c.k], c.x * px, c.z * px, px, px); }
        // граница радиуса
        g.strokeStyle = "rgba(255,58,79,.55)"; g.setLineDash([4, 4]); g.beginPath(); g.arc((C + 0.5) * px, (C + 0.5) * px, (R + 0.5) * px, 0, 7); g.stroke(); g.setLineDash([]);
        if (k < 1) anim = requestAnimationFrame(frame); else anim = null;
      })(t0);
      $("#landRead").innerHTML = `радиус <b>${R}</b> · заражено <b>${cells.length}</b> блоков`;
      $$("#landPool span").forEach((s) => (s.querySelector("b").textContent = counts[s.dataset.k] || ""));
    }
    window.__p21land = () => loaded >= need && run();
    $("#landGo").addEventListener("click", () => { ZM.sfx("explode", 0.3); run(); });
  })();

  /* ================= 04 · АДАПТАЦИЯ ================= */
  const CATS = [
    { k: "fire", n: "Огонь", ic: "flint_and_steel", dmg: 4, ex: "лава, костёр, горение, заговор огня" },
    { k: "lightning", n: "Молния", ic: "lightning_rod", dmg: 5, ex: "трезубец с «Громовержцем» в грозу" },
    { k: "wither", n: "Иссушение", ic: "wither_rose", dmg: 1, ex: "эффект иссушения, роза визера" },
    { k: "drown", n: "Утопление", ic: "water_bucket", dmg: 2, ex: "долго под водой" },
    { k: "suffocation", n: "Удушение", ic: "gravel", dmg: 1, ex: "застрял в блоке: песок, гравий" },
    { k: "starve", n: "Голод", ic: "rotten_flesh", dmg: 1, ex: "мобы не голодают", no: true },
    { k: "freeze", n: "Замерзание", ic: "powder_snow_bucket", dmg: 1, ex: "рыхлый снег" },
    { k: "cactus", n: "Кактус", ic: "cactus", dmg: 1, ex: "прижать к кактусу" },
    { k: "berry", n: "Куст ягод", ic: "sweet_berries", dmg: 1, ex: "куст сладких ягод" },
    { k: "fall", n: "Падение", ic: "feather", dmg: 6, ex: "падение, сталагмит" },
    { k: "explosion", n: "Взрыв", ic: "tnt", dmg: 45, ex: "динамит, крипер, кристалл Края, фейерверк" },
    { k: "magic", n: "Магия", ic: "splash_potion", dmg: 12, ex: "зелье урона, клыки заклинателя, шипы" },
    { k: "projectile", n: "Снаряд", ic: "arrow", dmg: 9, ex: "стрелы, брошенный трезубец" },
    { k: "falling_block", n: "Падающий блок", ic: "anvil", dmg: 10, ex: "только источник «fallingBlock» — наковальня бьёт своим", rare: true },
    { k: "melee", n: "Ближний бой", ic: "iron_sword", dmg: 8, ex: "меч, топор, кулак, волк, голем" },
    { k: "generic", n: "Прочее", ic: "command_block", dmg: 1e9, ex: "/kill, пустота, наковальня, всё остальное" },
  ];
  const CAT = Object.fromEntries(CATS.map((c) => [c.k, c]));
  (function adapt() {
    const MODES = [["как в игре", null], ["1 урон", 1], ["25 урона", 25], ["1000 урона", 1000]];
    let hp, thr, stage, p2, adapted, dead, wheelA = 0;
    const reset = () => { hp = 500; thr = 450; stage = 0; p2 = false; adapted = new Set(); dead = false; render(); };
    const chat = (t) => K.chat("#adChat", t, 7);
    const pop = (txt, cls) => { const s = document.createElement("span"); s.textContent = txt; if (cls) s.className = cls; s.style.left = 50 + rnd(-18, 18) + "%"; $("#adPops").appendChild(s); setTimeout(() => s.remove(), 1000); };
    $("#adSrc").innerHTML = CATS.map((c) => `<button type="button" data-k="${c.k}" class="${c.no ? "no" : ""}" data-tip="${esc(c.n)}" data-tip-info="${esc(c.ex)}"><img src="${I(c.ic)}" alt=""><b>${esc(c.n)}</b><small>${c.dmg >= 1e9 ? "∞" : c.dmg}</small></button>`).join("");
    $("#adSegs").innerHTML = Array.from({ length: 10 }, () => "<i></i>").join("");
    function render() {
      const segs = $("#adSegs"); segs.classList.toggle("p2", p2);
      if (p2) { segs.innerHTML = "<i></i>"; segs.firstChild.style.setProperty("--f", (hp / 100) * 100 + "%"); }
      else {
        if (segs.children.length !== 10) segs.innerHTML = Array.from({ length: 10 }, () => "<i></i>").join("");
        // как обычная полоска здоровья: убывает справа налево, первым ломается правый сегмент (500..450)
        [...segs.children].forEach((el, i) => { const lo = i * 50, f = clamp((hp - lo) / 50, 0, 1); el.style.setProperty("--f", f * 100 + "%"); el.classList.toggle("done", i >= 10 - stage); });
      }
      $("#adHpT").textContent = `${Math.ceil(hp * 10) / 10} / ${p2 ? 100 : 500}`;
      $("#adPhase").textContent = dead ? "убит" : p2 ? "фаза 2 · скорость ×2" : `фаза 1 · сегмент ${stage + 1}/10`;
      $("#adNum").innerHTML = `<b>${stage}</b><span>/10</span>`;
      $("#adWheelBox").classList.toggle("p2", p2);
      $("#adImm").innerHTML = p2 ? `<span class="dim">Иммунитеты сброшены. Всё снова работает, но колесо больше не крутится.</span>` : adapted.size ? [...adapted].map((k) => `<span class="chip"><img src="${I(CAT[k].ic)}" alt="">${esc(CAT[k].n)}</span>`).join("") : `<span class="dim">Иммунитетов пока нет</span>`;
      $$("#adSrc button").forEach((b) => b.classList.toggle("imm", !p2 && adapted.has(b.dataset.k)));
    }
    function adaptTo(k) {
      adapted.add(k); stage++; thr -= 50;
      if (stage >= 10) {
        p2 = true; adapted.clear(); thr = 0; hp = 100;
        chat("§4§l[Махорага] Вошёл во 2 фазу! §c100 HP, скорость x2, больше не адаптируется.");
        snd("scream", 0.6); window.__p21scroll && window.__p21scroll.consume();
        $("#adWheelBox").animate([{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }], { duration: 500 });
        return;
      }
      wheelA += 45; $("#adWheel").style.transform = `rotate(${wheelA}deg)`;
      const box = $("#adWheelBox"); box.classList.add("flash"); setTimeout(() => box.classList.remove("flash"), 260);
      snd("adapt", 0.5, 1); pop("адаптировался", "adp");
      chat(`§6[Махорага] §cАдаптировался: §e${CAT[k].n} §7(${stage}/10)`);
    }
    function hit(k) {
      if (dead) { chat("§7Махорага уже мёртв. Жми «Новый Махорага»"); return; }
      const c = CAT[k];
      if (c.no) { chat("§7Мобы не голодают: эта категория в коде есть, но Махорагу ею не достать"); ZM.sfx("click", 0.3); return; }
      const m = MODES[+$("#adDmg").value][1], amt = m ?? c.dmg;
      if (p2) {
        hp -= amt; ZM.sfx("hit", 0.5); pop("−" + (amt >= 1e9 ? "∞" : amt));
        if (hp <= 0) { hp = 0; dead = true; snd("death", 0.6); chat(`§7Махорага повержен. Ачивка всем, кто его ранил`); grant("kill_mahoraga"); }
        render(); return;
      }
      if (adapted.has(k)) { pop("иммунитет", "imm"); ZM.sfx("stone", 0.4, 1.4); render(); return; }
      const before = hp, maxA = Math.max(0.1, before - thr); let cl = Math.min(amt, maxA);
      const force = stage >= 9 && before - cl <= 0.5; if (force) cl = Math.max(0, before - 1);
      hp -= cl; ZM.sfx("hit", 0.5); pop("−" + (Math.round(cl * 10) / 10) + (cl < amt ? ` из ${amt >= 1e9 ? "∞" : amt}` : ""));
      if (force || hp <= thr + 0.5) adaptTo(k);
      render();
    }
    $("#adSrc").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) hit(b.dataset.k); });
    $("#adDmg").addEventListener("input", () => ($("#adDmgO").textContent = MODES[+$("#adDmg").value][0]));
    $("#adReset").addEventListener("click", () => { reset(); chat("§7Новый Махорага: 500 HP, колесо на нуле"); ZM.sfx("click", 0.4); });
    reset();
    const TIPS = [
      ["01", "Добивай мусором", "Иммунитет получает не тот, кто нанёс больше, а тот, кто добил полоску. Сними 49 из 50 мечом, а последнюю единицу дай кактусом или ягодным кустом. Колесо привыкнет к кактусу, а меч останется рабочим."],
      ["02", "Меч прибереги", "Во второй фазе иммунитеты сбрасываются, и Махорага больше не адаптируется. Значит, основной урон нужен именно там: 100 HP на скорости ×2, и любой вид урона снова работает."],
      ["03", "/kill не убивает", "Команда бьёт уроном «Прочее», и он режется до конца сегмента, как любой другой. Первый /kill снимет одну полоску, второй не сделает ничего. Простой способ добить сегмент, но не больше."],
    ];
    $("#adTips").innerHTML = TIPS.map(([n, t, d]) => `<div class="mh-tip"><span>${n}</span><b>${esc(t)}</b><p>${esc(d)}</p></div>`).join("");
    const ORDER = [["fire", "горение, лава, костёр, магмовый блок"], ["lightning", "удар молнии"], ["wither", "эффект иссушения"], ["drown", "кончился воздух под водой"], ["suffocation", "голова внутри блока"], ["starve", "только у игроков"], ["freeze", "рыхлый снег"], ["cactus", "касание кактуса"], ["berry", "колючий куст"], ["fire", "любой другой огненный урон, например огненный шар"], ["fall", "падение и сталагмит"], ["explosion", "динамит, крипер, кристалл"], ["magic", "зелья, клыки, шипы"], ["projectile", "стрелы, трезубец, снежки"], ["falling_block", "только источник «fallingBlock»"], ["melee", "урон нанесён живым существом в упор"], ["generic", "всё, что не подошло выше"]];
    $("#adCls").innerHTML = ORDER.map(([k, t]) => `<li><img src="${I(CAT[k].ic)}" alt=""><span><b>${esc(CAT[k].n)}</b> · ${esc(t)}</span></li>`).join("");
  })();

  /* ================= 05 · АРСЕНАЛ ================= */
  const SK = [
    { k: "melee", jp: "拳", n: "Кулаки", anim: () => pickAtk(), s: "attack", d: "Левый или правый удар по 40%, двойной в 20% случаев. Двойной вдобавок вешает Замедление III на 2 секунды.", n1: "15 · двойной 25", n2: "24 · двойной 40", cd: "0,5 с" },
    { k: "leap", jp: "跳", n: "Прыжок", anim: "leap", s: "jump", d: "Если цель выше или ниже больше чем на 5 блоков и не дальше 22. Взлетает на 8 блоков над точкой старта, перелетает до 12 по горизонтали и бьёт по площади радиусом 3.", n1: "25 по площади", n2: "40 по площади", cd: "15 с / 9 с" },
    { k: "blitz", jp: "閃", n: "Рывок", anim: "speed_blitz", s: "speedblitz", d: "Цель в 3–15 блоках и почти на одной высоте (до 5). Бросок по прямой, первого задетого хватает, бьёт дважды и отшвыривает.", n1: "8 при касании, 2×10", n2: "14 при касании, 2×16", cd: "14 с / 8 с" },
    { k: "laser", jp: "光", n: "Лазер", anim: "laser", s: "laser", d: "Цель дальше 14 блоков. Луч на 20 блоков растёт по 1,35 блока за тик, выжигает тоннель 3×3 и ранит всех на пути, кроме самого Махораги.", n1: "18", n2: "28", cd: "15 с / 9 с" },
    { k: "scream", jp: "咆", n: "Крик", anim: "scream", s: "scream", d: "Если вокруг, в радиусе 10, хотя бы 6 отмеченных врагов. Все получают Замедление IV и Слабость II на 4 секунды.", n1: "дебафф", n2: "дебафф", cd: "15 с / 9 с" },
    { k: "adapt", jp: "適", n: "Поворот колеса", anim: "adapt", s: "adapt", d: "Не атака, а реакция: сегмент сломан, колесо проворачивается на 45°, в воздух летят искры и частицы портала.", n1: "—", n2: "во 2 фазе не бывает", cd: "по событию" },
    { k: "death", jp: "終", n: "Смерть", anim: "death", s: "death", d: "Падение на 2,5 секунды, после него лут и 500 опыта. Свиток хозяина сгорает, если он ещё был.", n1: "—", n2: "—", cd: "один раз" },
  ];
  (function arsenal() {
    $("#arList").innerHTML = SK.map((s, i) => `<button type="button" class="mh-sk" data-i="${i}"><span class="ic">${s.jp}</span><span><b>${esc(s.n)}</b><p>${esc(s.d)}</p></span><span class="n"><span>ф1 <em>${esc(s.n1)}</em></span><span>ф2 <em>${esc(s.n2)}</em></span><span>КД ${esc(s.cd)}</span></span></button>`).join("");
    const cv = $("#ar3d"), g = mahoraga(cv, { k: 2.6, yaw: 25, pitch: 6 });
    const name = (s) => ($("#arName").innerHTML = `${esc(s.n)}<small>${s.k === "adapt" ? "wheel · +45° за 10 тиков" : typeof s.anim === "string" ? "animation." + s.anim : "attack_left / right / double"}</small>`);
    name(SK[0]);
    $("#arList").addEventListener("click", (e) => {
      const b = e.target.closest(".mh-sk"); if (!b) return; const s = SK[+b.dataset.i];
      $$(".mh-sk").forEach((x) => x.classList.toggle("on", x === b)); name(s);
      snd(s.s, 0.55); if (!g) return;
      clearTimeout(g._rt);
      if (s.k === "adapt") { g.stop(); g.turnWheel(); return; }   // в игре это не анимация: колесо докручивает код
      g.stop();
      if (s.k === "death") { g.play("death", null, { hold: true }); g._rt = setTimeout(() => g.stop(), 4200); return; }   // лежит, потом встаёт обратно
      g.play(typeof s.anim === "function" ? s.anim() : s.anim);
    });
    if (!g) return;
    const st = K.spinner(cv, { ry: 25, rx: 0 }, 25), vis = visible(cv); let last = performance.now();
    (function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (vis()) { if (st.idle() && motion()) st.ry += dt * 8; g.tick(dt); const c = g.bb.c, M = g.M; g.setExtra(M.mul(M.t(c[0], c[1], c[2]), M.mul(M.rx(st.rx * Math.PI / 180), M.mul(M.ry(st.ry * Math.PI / 180), M.t(-c[0], -c[1], -c[2]))))); g.render(); }
      requestAnimationFrame(loop);
    })(last);
  })();

  /* ---------- что он сделает: схема сбоку ---------- */
  (function ai() {
    const cv = $("#aiCv"), g = cv.getContext("2d"), SKN = { scream: "Крик", laser: "Лазер", leap: "Прыжок", blitz: "Рывок", melee: "Кулаки", walk: "Идёт к цели" };
    let tx = 9, ty = 0, phase = 1, en = 1; const cd = { scream: false, laser: false, leap: false, blitz: false };
    $("#aiCd").innerHTML = Object.keys(cd).map((k) => `<button type="button" data-k="${k}">${SKN[k]} готов</button>`).join("");
    $("#aiCd").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; cd[b.dataset.k] = !cd[b.dataset.k]; b.classList.toggle("off", cd[b.dataset.k]); b.textContent = `${SKN[b.dataset.k]} ${cd[b.dataset.k] ? "на КД" : "готов"}`; draw(); });
    $("#aiPhase").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; phase = +b.dataset.v; $$("#aiPhase button").forEach((x) => x.classList.toggle("on", x === b)); draw(); });
    $("#aiEn").addEventListener("input", () => { en = +$("#aiEn").value; $("#aiEnO").textContent = en; draw(); });
    function decide(x, y, n = en) {
      const d = Math.hypot(x, y), dy = Math.abs(y);
      if (!cd.scream && n >= 6) return "scream";
      if (!cd.laser && d >= 14) return "laser";
      if (!cd.leap && dy > 5 && d <= 22) return "leap";
      if (!cd.blitz && dy <= 5 && d > 3 && d < 15) return "blitz";
      return d <= 3.4 ? "melee" : "walk";
    }
    const COL = { scream: "rgba(170,0,170,.35)", laser: "rgba(255,58,79,.28)", leap: "rgba(201,164,92,.3)", blitz: "rgba(63,216,208,.26)", melee: "rgba(232,226,207,.28)", walk: "rgba(255,255,255,.03)" };
    let W, H, sc, ox, oy;
    function draw() {
      const d = Math.min(2, devicePixelRatio || 1); W = cv.width = cv.clientWidth * d; H = cv.height = cv.clientHeight * d;
      sc = W / 34; ox = sc * 2.5; oy = H * 0.62;
      const step = Math.max(4, Math.round(sc / 2));
      for (let px = 0; px < W; px += step) for (let py = 0; py < H; py += step) {
        const x = (px + step / 2 - ox) / sc, y = (oy - py - step / 2) / sc; g.fillStyle = "#0a0b0e"; g.fillRect(px, py, step, step);
        if (x < 0) continue; g.fillStyle = COL[decide(x, y, 1)]; g.fillRect(px, py, step, step);
      }
      g.strokeStyle = "#3a3f47"; g.lineWidth = d; g.beginPath(); g.moveTo(0, oy); g.lineTo(W, oy); g.stroke();
      g.fillStyle = "#6f6a60"; g.font = `${11 * d}px "MH Cond", sans-serif`; g.textAlign = "center";
      for (let b = 0; b <= 30; b += 5) { g.fillText(b + "", ox + b * sc, oy + 14 * d); g.fillRect(ox + b * sc, oy - 3 * d, d, 6 * d); }
      // Махорага: силуэт 3,5 блока
      g.fillStyle = "#e8e2cf"; g.fillRect(ox - 0.5 * sc, oy - 3.5 * sc, sc, 3.5 * sc);
      g.strokeStyle = "#c9a45c"; g.lineWidth = 2 * d; g.beginPath(); g.arc(ox, oy - 4.3 * sc, 0.6 * sc, 0, 7); g.stroke();
      // цель
      const X = ox + tx * sc, Y = oy - ty * sc;
      g.fillStyle = "#ff3a4f"; g.fillRect(X - 0.3 * sc, Y - 1.8 * sc, 0.6 * sc, 1.8 * sc);
      g.strokeStyle = "#fff"; g.setLineDash([4 * d, 4 * d]); g.lineWidth = d; g.beginPath(); g.moveTo(ox, oy - 1.7 * sc); g.lineTo(X, Y - 0.9 * sc); g.stroke(); g.setLineDash([]);
      const r = decide(tx, ty), dist = Math.hypot(tx, ty), sk = SK.find((s) => s.k === r);
      const dmg = sk ? (phase === 1 ? sk.n1 : sk.n2) : "";
      const cdv = sk ? sk.cd.split(" / ")[phase === 1 ? 0 : 1] || sk.cd : "";
      $("#aiOut").innerHTML = `<b>${SKN[r]}</b><p>${r === "walk" ? "Ни один навык не подходит или все на перезарядке: просто идёт к цели." : esc(sk.d)}</p><small>расстояние ${dist.toFixed(1)} · по высоте ${ty >= 0 ? "+" : ""}${ty.toFixed(1)} · врагов ${en}${dmg && r !== "walk" ? ` · урон ${esc(dmg)} · КД ${esc(cdv)}` : ""}</small>`;
    }
    let drag = false;
    const pos = (e) => { const r = cv.getBoundingClientRect(), d = cv.width / r.width; tx = clamp(((e.clientX - r.left) * d - ox) / sc, 0.5, 30); ty = clamp((oy - (e.clientY - r.top) * d) / sc + 0.9, -(H - oy) / sc + 0.5, oy / sc - 2); draw(); };
    cv.addEventListener("pointerdown", (e) => { drag = true; try { cv.setPointerCapture(e.pointerId); } catch (_) {} pos(e); });
    cv.addEventListener("pointermove", (e) => drag && pos(e));
    cv.addEventListener("pointerup", () => (drag = false));
    draw(); addEventListener("resize", draw);
    const F = [
      ["Застрял — пробьётся", "Если 10 тиков не может сдвинуться к цели, пробует прыжок, потом рывок, потом ломает блоки по линии и подпрыгивает. Через 40 тиков просто телепортируется на 3 блока вверх, расчистив место."],
      ["Не даёт стоять в упор", "Если бой вплотную тянется 3 секунды или он нанёс 3 удара подряд, он отходит на 7–8 блоков и бьёт ближайшим готовым дальним навыком."],
      ["Ломает всё, кроме бедрока", "Прыжок, рывок, лазер и выход из застревания рушат любые блоки на пути. Лазер щадит только бедрок, барьер, рамку портала Края и укреплённый глубинный сланец."],
      ["Нельзя оттолкнуть", "Сопротивление отбрасыванию 100%: ни отдача, ни взрыв его не сдвинут. Следит за целью с 64 блоков."],
    ];
    $("#arFacts").innerHTML = F.map(([t, d], i) => `<div class="mh-card ${i === 2 ? "red" : ""}"><b>${esc(t)}</b><p>${esc(d)}</p></div>`).join("");
  })();

  /* ================= 06 · ХОЗЯИН ================= */
  (function owner() {
    const MOBS = [["zombie", "Зомби", "zombie_head"], ["skel", "Скелет", "bone"], ["creeper", "Крипер", "gunpowder"], ["friend", "Друг", "player_head"], ["pig", "Свинья", "porkchop"], ["self", "Махорага", "mahoraga_scroll"]];
    let pr = {}, ord = {}, next = 1, sword = false;
    $("#owField").innerHTML = MOBS.map(([k, n, ic]) => `<button type="button" class="mh-mob" data-k="${k}"><i></i><img src="${I(ic)}" alt=""><b>${n}</b></button>`).join("");
    const log = (t) => K.chat("#log", t, 4);
    function render() {
      const list = Object.keys(pr).sort((a, b) => pr[b] - pr[a] || ord[a] - ord[b]);
      $$(".mh-mob").forEach((b) => { const k = b.dataset.k; b.querySelector("i").textContent = pr[k] ? "+" + pr[k] : ""; b.classList.toggle("top", list[0] === k); });
      $("#owQ").innerHTML = list.length ? list.map((k) => { const m = MOBS.find((x) => x[0] === k); return `<li><img src="${I(m[2])}" alt=""><b>${m[1]}</b><span>приоритет ${pr[k]} · метка №${ord[k]}</span></li>`; }).join("") : `<li class="empty">Целей нет: Махорага идёт в 1,7 блока за твоей спиной</li>`;
    }
    $("#owField").addEventListener("click", (e) => {
      const b = e.target.closest(".mh-mob"); if (!b) return; const k = b.dataset.k;
      b.classList.remove("hit"); void b.offsetWidth; b.classList.add("hit"); ZM.sfx("hit", 0.4);
      if (k === "self") { log("§7Ты бьёшь своего Махорагу. Урон засчитан, но в ответ он тебя не тронет"); return; }
      if (sword) { log("§7С предметом в руке метка не ставится: только пустая рука"); return; }
      if (!pr[k]) { pr[k] = 0; ord[k] = next++; }
      pr[k]++; render();
    });
    $("#owHand").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; sword = b.dataset.v === "1"; $$("#owHand button").forEach((x) => x.classList.toggle("on", x === b)); });
    $("#owReset").addEventListener("click", () => { pr = {}; ord = {}; next = 1; render(); ZM.sfx("click", 0.3); });
    render();
  })();

  /* ---------- лазер ---------- */
  (function laser() {
    const cv = $("#lzCv"), g = cv.getContext("2d"); let phase = 1, hp = 20, beam = -1, fired = false, dead = false, t0 = 0;
    const blocks = [];
    const mkBlocks = () => { blocks.length = 0; for (let y = 0; y < 6; y++) { blocks.push({ x: 12, y, k: y === 0 ? "bedrock" : "stone", alive: true }); blocks.push({ x: 13, y, k: "deepslate", alive: true }); } };
    mkBlocks();
    const imgs = {}; ["stone", "bedrock", "deepslate", "player_head", "zombie_head"].forEach((k) => { const im = new Image(); im.onload = () => beam < 0 && draw(0); im.src = I(k); imgs[k] = im; });
    function hpUI() { $("#lzHp").innerHTML = dead ? `<b style="color:#ff5555;font:14px var(--f-pixel)">Ты погиб</b>` : `<b style="font:14px var(--f-pixel);color:#ff5555">${"❤".repeat(Math.ceil(hp / 2))}</b><b style="font:14px var(--f-pixel);color:#333">${"❤".repeat(10 - Math.ceil(hp / 2))}</b>`; }
    function draw(len) {
      const d = Math.min(2, devicePixelRatio || 1), W = cv.width = cv.clientWidth * d, H = cv.height = cv.clientHeight * d, s = W / 24, gy = H * 0.78;
      g.imageSmoothingEnabled = false; g.fillStyle = "#07080a"; g.fillRect(0, 0, W, H);
      g.fillStyle = "#1a1d22"; g.fillRect(0, gy, W, H - gy);
      const by = gy - 2.2 * s; // высота луча
      for (const b of blocks) if (b.alive && imgs[b.k].complete) g.drawImage(imgs[b.k], b.x * s, gy - (b.y + 1) * s, s, s);
      // Махорага
      g.fillStyle = "#e8e2cf"; g.fillRect(1 * s, gy - 3.5 * s, s, 3.5 * s); g.strokeStyle = "#c9a45c"; g.lineWidth = 2 * d; g.beginPath(); g.arc(1.5 * s, gy - 4.3 * s, 0.6 * s, 0, 7); g.stroke();
      // хозяин на линии (x=7) и цель (x=19)
      if (!dead) { g.drawImage(imgs.player_head, 7 * s, gy - 2.6 * s, 0.8 * s, 0.8 * s); g.fillStyle = "#3c6fb0"; g.fillRect(7.1 * s, gy - 1.8 * s, 0.6 * s, 1.8 * s); }
      g.drawImage(imgs.zombie_head, 19 * s, gy - 2.6 * s, 0.8 * s, 0.8 * s); g.fillStyle = "#2f7a3a"; g.fillRect(19.1 * s, gy - 1.8 * s, 0.6 * s, 1.8 * s);
      g.font = `${11 * d}px "MH Cond", sans-serif`; g.fillStyle = "#9a958a"; g.textAlign = "center";
      g.fillText("ТЫ (хозяин)", 7.4 * s, gy - 3 * s); g.fillText("ЦЕЛЬ", 19.4 * s, gy - 3 * s); g.fillText("20 блоков", 11.5 * s, H - 8 * d);
      if (len > 0) {
        const x0 = 2 * s, x1 = x0 + len * s * (21 / 20) * 0.95;
        const gr = g.createLinearGradient(0, by - 0.8 * s, 0, by + 0.8 * s); gr.addColorStop(0, "rgba(255,58,79,0)"); gr.addColorStop(0.5, "rgba(255,240,240,1)"); gr.addColorStop(1, "rgba(255,58,79,0)");
        g.fillStyle = gr; g.fillRect(x0, by - 0.8 * s, x1 - x0, 1.6 * s);
        g.fillStyle = "rgba(255,58,79,.18)"; g.fillRect(x0, by - 1.5 * s, x1 - x0, 3 * s);
      }
    }
    $("#lzPhase").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; phase = +b.dataset.v; $$("#lzPhase button").forEach((x) => x.classList.toggle("on", x === b)); });
    $("#lzFire").addEventListener("click", () => {
      if (beam >= 0) return;
      if (dead) { dead = false; hp = 20; mkBlocks(); hpUI(); draw(0); $("#lzFire").textContent = "Встать на линию"; return; }
      beam = 0; fired = false; t0 = performance.now(); snd("laser", 0.7);
      (function step(now) {
        const ticks = (now - t0) / 50; beam = Math.min(20, ticks * 1.35);
        // тоннель 3×3 на высоте луча: блоки y 1..3
        for (const b of blocks) if (b.alive && b.k !== "bedrock" && b.y >= 1 && b.y <= 3 && beam * 0.95 + 2 >= b.x) { b.alive = false; ZM.sfx("stone", 0.25); }
        if (!fired && beam + 2 >= 7) { fired = true; hp -= phase === 1 ? 18 : 28; ZM.sfx("hit", 0.6); if (hp <= 0) { hp = 0; dead = true; K.chat("#log", `§f${nick()} был убит Махорагой`); grant("killed_by_mahoraga"); } hpUI(); }
        draw(beam);
        if (ticks < 22) requestAnimationFrame(step); else { beam = -1; draw(0); if (dead) $("#lzFire").textContent = "Возродиться"; else if (hp < 20) { $("#lzFire").textContent = "Встать ещё раз"; } }
      })(t0);
    });
    hpUI(); draw(0); addEventListener("resize", () => draw(beam > 0 ? beam : 0));
  })();

  /* ================= 07 · ЛУТ ================= */
  (function loot() {
    const EN = "Прочность III · Починка · Защита IV";
    const it = (id, n, c = 1, o = {}) => ({ id, n, c, ...o });
    const GROUPS = [
      { p: 1, t: "Всегда", items: [it("mahoraga_scroll", "Свиток призыва Махораги", 1, { info: "с перезарядкой 10 минут" }), it("diamond", "Алмаз", 64), it("netherite_ingot", "Незеритовый слиток", 64), it("enchanted_golden_apple", "Зачарованное золотое яблоко", 42, { gl: 1 }), it("steel_ball", "Стальной шар Джайро", 2), it("feather", "Перо", 4), it("emerald", "Изумруд", 128)] },
      { p: 0.5, t: "50% каждое", items: [it("sculk_shrieker", "Скалковый крикун", 32), it("egg", "Яйцо призыва из мода", 64, { info: "Житель-Даун, Газан или Антон Чигур" }), it("obsidian", "Обсидиан", 64), it("bedrock", "Бедрок", 1)] },
      { p: 0.3, t: "30% каждое", items: [it("dset", "Алмазная броня, 4 части", 1, { info: EN, set: ["diamond_helmet", "diamond_chestplate", "diamond_leggings", "diamond_boots"], gl: 1 }), it("netherite_hoe", "Незеритовая мотыга", 1, { info: EN, gl: 1 }), it("koran", "Коран", 1), it("shulker_box", "Шалкер с красителями", 1, { info: "16 красителей по 64, ткацкий станок, 64 белых флага" })] },
      { p: 0.05, t: "5% каждое", items: [it("nset", "Незеритовая броня, 4 части", 1, { info: EN, set: ["netherite_helmet", "netherite_chestplate", "netherite_leggings", "netherite_boots"], gl: 1 }), it("nether_star", "Звезда Незера", 64), it("death_note_requiem", "Тетрадь смерти: Реквием", 1), it("beacon", "Маяк", 12), it("white_shulker_box", "Шалкер белого бетона", 1, { info: "27 стаков белого бетона" }), it("mahoraga_scroll", "Свиток призыва Махораги", 1, { info: "ещё один, сверх гарантированного" })] },
    ];
    const EGGS = [["adun_egg", "Яйцо призыва Жителя-Дауна"], ["gazan_egg", "Яйцо призыва Газана"], ["chigur_egg", "Яйцо призыва Антона Чигура"]];
    const pct = (p) => (p === 1 ? "100%" : Math.round(p * 100) + "%");
    $("#lootTable").innerHTML = GROUPS.map((gr) => `<div class="mh-lt-g"><b>${gr.t}<em>${pct(gr.p)}</em></b>${gr.items.map((x) => `<div class="mh-lt-row"><img src="${I(x.set ? x.set[1] : x.id === "egg" ? "gazan_egg" : x.id)}" alt=""><span style="font:inherit;color:inherit">${esc(x.n)}${x.info ? ` <span>· ${esc(x.info)}</span>` : ""}</span><span>×${x.c}</span></div>`).join("")}</div>`).join("") + `<div class="mh-lt-g"><b>Опыт<em>500</em></b><div class="mh-lt-row"><img src="${I("emerald")}" alt="" style="filter:hue-rotate(40deg) saturate(1.4)"><span style="font:inherit;color:inherit">Шары опыта при смерти</span><span>500</span></div></div>`;
    $("#lootQ").textContent = "7 гарантированных + 19 шансов";
    let rolls = 0, stats = { rare: 0 };
    function roll() {
      rolls++; const out = [];
      const push = (id, n, c, o = {}) => { while (c > 0) { const k = Math.min(64, c); out.push({ id, n, c: k, ...o }); c -= k; } };
      for (const gr of GROUPS) for (const x of gr.items) {
        if (gr.p < 1 && Math.random() >= gr.p) continue;
        if (gr.p === 0.05) stats.rare++;
        if (x.set) x.set.forEach((s) => push(s, x.n.replace(/, 4 части/, ""), 1, { info: x.info, gl: 1 }));
        else if (x.id === "egg") { const e = EGGS[ri(0, 2)]; push(e[0], e[1], 64); }
        else push(x.id, x.n, x.c, { info: x.info, gl: x.gl });
      }
      const grid = $("#lootGrid"), cells = Math.max(27, Math.ceil(out.length / 9) * 9);
      grid.innerHTML = Array.from({ length: cells }, (_, i) => { const o = out[i]; return o ? `<span class="k-slot new ${o.gl ? "gl" : ""}" style="animation-delay:${i * 25}ms" data-tip="${esc(o.n)}"${o.info ? ` data-tip-info="${esc(o.info)}"` : ""}><img src="${I(o.id)}" alt="">${o.c > 1 ? `<b>${o.c}</b>` : ""}</span>` : `<span class="k-slot"></span>`; }).join("");
      $("#lootN").textContent = `${out.length} стаков`;
      $("#lootRolls").textContent = `убит ${rolls} ${K.plural(rolls, "раз", "раза", "раз")} · редких (5%) выпало ${stats.rare}`;
      ZM.sfx("pop", 0.4); if (rolls > 1) snd("death", 0.25, 1.3);
    }
    $("#lootRoll").addEventListener("click", roll); roll();
  })();

  /* ================= 08 · МЕЛОЧИ ================= */
  const FACTS = [
    ["Свой его не бьёт", "Хозяина Махорага не атакует ни при каких условиях, даже если ты сам лупишь его мечом. Урон от хозяина засчитывается, так что своего можно спокойно довести до смерти. В ответ прилетит разве что лазер, выпущенный по другой цели."],
    ["Свиток сгорает во второй фазе", "Как только колесо сделало десятый поворот, свиток, которым его призвали, исчезает из инвентаря хозяина. Изгнать Махорагу уже нечем: либо победить, либо бежать. Если он умер раньше, свиток тоже сгорает."],
    ["С трупа — новый свиток", "С убитого Махораги всегда падает свежий свиток с перезарядкой 10 минут. Ещё один с шансом 5% сверху."],
    ["Изгнание без награды", "Изгнанный свитком Махорага просто исчезает. Ни лута, ни опыта, ни ачивки: только перезарядка 10 минут."],
    ["Антон Чигур вне правил", "Выстрелы Антона Чигура не считаются ни одной категорией: не двигают колесо, не дают иммунитета и не включают вторую фазу. Сегменты при этом не режут его урон."],
    ["Адаптация сохраняется", "Сегменты, иммунитеты, фаза, приоритеты целей и даже угол колеса пишутся в данные мира. Перезаход не вылечит Махорагу и не сбросит колесо."],
    ["Никуда не исчезает", "Махорага не пропадает, если отойти далеко. Над экраном висит красная полоска босса, а раз в три минуты заново включается его тема."],
    ["Сообщения только тем, кто рядом", "Строка «Адаптировался» и объявление второй фазы приходят только игрокам, у которых на экране его полоска босса."],
    ["«КД активен» врёт", "Когда перезарядка кончилась, метка о ней остаётся на предмете, и подсказка продолжает писать «КД активен». Свиток при этом уже работает."],
    ["Перезарядка тикает в игре", "Время считается по игровым тикам мира. Пока игра на паузе или сервер выключен, перезарядка стоит."],
    ["Отмена не бесплатна", "Прерванный ритуал стоит 5 минут перезарядки, хотя Махорага так и не появился."],
    ["Мир хозяина", "Свиток ищет твой ритуал и твоего Махорагу только в текущем измерении. Ушёл в Незер — управлять оставшимся в Верхнем мире будет нечем."],
  ];
  $("#factsBox").innerHTML = FACTS.map(([t, d], i) => `<article class="mh-fact"><span>${String(i + 1).padStart(2, "0")}</span><b>${esc(t)}</b><p>${esc(d)}</p></article>`).join("");

  /* ================= 09–10 ================= */
  adv = K.adv({ list: ZM.P21.advancements, store: "p21.adv", icon: (a) => I(a.icon), chatSel: "#log", intro: "Четыре скрытых: от следов на карте до смерти под колесом." });
  K.timeline($("#tl"), [
    { date: "16.05.2026", t: "Махорага", d: "Босс-шикигами целиком: аванпост на полпути к крепости, свиток призыва с перезарядкой, 23-секундный ритуал с жабами и коконом, колесо адаптации на 16 видов урона, вторая фаза, четыре навыка, выбор целей кулаком хозяина и лут на пол-инвентаря." },
  ]);
  K.finNav(21, $("#finNav"));
  ZM.reveal && ZM.reveal();
})();
