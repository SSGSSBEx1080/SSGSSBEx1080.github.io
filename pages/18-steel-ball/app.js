/* №18 · Стальной шар. Цифры и логика из SteelBallItem / SteelBallEntity / BallBreakerEnchantment:
   заряд как у лука, 20 тиков = заряжен; скорость 0.90+0.75c или 1.45+1.10c (+0.35 BB); разброс max(0.05, 1.1-0.9c);
   гравитация 0.075, воздух ×0.99 (ванильный снаряд) и ×0.992 (шар); отскоки пол 0.38/0.52, стены 0.60/0.74 (+0.10 BB);
   трение 0.84/0.92 (BB +0.03, макс 0.97); удар max(8|6, v×7|4.5) ×1.6 BB; сверло 30/60 тиков, каждые 4 тика 2.5/4.5;
   возврат к глазам×0.8, подбор ближе 1.5; незаряженный бьётся через 200 тиков. У мобов 10 тиков неуязвимости после удара. */
(function () {
  const { $, $$, esc } = ZM, K = ZM.kit, U = ZM.url;
  ZM.topbar({ crumb: "№18 · Стальной шар", ...ZM.pointNav(18) });
  const T = (p, e = "png") => U(`assets/textures/p18/${p}.${e}`);
  const snd = K.sounds("p18");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motion = () => !reduce && !document.documentElement.classList.contains("no-motion");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const f1 = (x, d = 1) => (+x).toFixed(d).replace(".", ",");
  const rnd = (a, b) => a + Math.random() * (b - a);
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v); };
  let adv = null;

  /* ---------- формулы мода ---------- */
  const chargeOf = (t) => { let c = t / 20; c = (c * c + c * 2) / 3; return Math.min(1, c); };
  const params = (t, bb) => {
    const c = bb ? 1 : chargeOf(t), charged = bb || t >= 20;
    let v = charged ? 1.45 + c * 1.1 : 0.9 + c * 0.75; if (bb) v += 0.35;
    const inac = bb ? 0 : Math.max(0.05, 1.1 - c * 0.9);
    return { c, charged, v, inac, ok: c >= 0.15 };
  };
  const impactDmg = (v, charged, bb) => { let d = Math.max(charged ? 8 : 6, v * (charged ? 7 : 4.5)); if (bb) d *= 1.6; return d; };
  const armorCut = (d, armor = 2) => d * (1 - Math.min(20, Math.max(armor / 5, armor - d / 2)) / 25);

  /* ================= HERO: золотая спираль ================= */
  (function spiral() {
    const svg = $("#spiral"), PHI = 1.6180339887; let x = 0, y = 0, w = 1000, h = 1000 / PHI, d = "", rects = "";
    for (let i = 0; i < 11; i++) {
      const dir = i % 4; let s;
      if (dir === 0) { s = h; rects += `<rect x="${x}" y="${y}" width="${s}" height="${s}"/>`; d += (i ? "" : `M${x} ${y + s}`) + ` A${s} ${s} 0 0 1 ${x + s} ${y}`; x += s; w -= s; }
      else if (dir === 1) { s = w; rects += `<rect x="${x}" y="${y}" width="${s}" height="${s}"/>`; d += ` A${s} ${s} 0 0 1 ${x + s} ${y + s}`; y += s; h -= s; }
      else if (dir === 2) { s = h; rects += `<rect x="${x + w - s}" y="${y}" width="${s}" height="${s}"/>`; d += ` A${s} ${s} 0 0 1 ${x + w - s} ${y + s}`; w -= s; }
      else { s = w; rects += `<rect x="${x}" y="${y + h - s}" width="${s}" height="${s}"/>`; d += ` A${s} ${s} 0 0 1 ${x} ${y + h - s}`; h -= s; }
    }
    svg.innerHTML = `<g class="r">${rects}</g><path class="p" d="${d}"/>`;
  })();

  /* ================= HERO: 3D-шар ================= */
  (function hero3d() {
    const box = $("#ball3d"); let v = null, rot = { x: -18, y: 20 }, drag = null, last = -1e9, spin = 30, vis = true;
    function build() {
      box.innerHTML = ""; v && v.destroy && v.destroy(); v = null;
      if (!(window.ZMGL && ZMGL.supported())) { box.innerHTML = `<img src="${T("item", "webp")}" alt="Стальной шар" class="sb-fb">`; return; }
      const r = box.getBoundingClientRect(), bb = ZMModel3D.bbox(ZM.P18M.steel_ball);
      v = ZMGL.build(ZM.P18M.steel_ball, U("assets/textures/p18/"), { unit: Math.min(r.width, r.height) * 0.78 / Math.max(...bb.size), persp: 3000 });
      if (!v) { box.innerHTML = `<img src="${T("item", "webp")}" alt="" class="sb-fb">`; return; }
      v.el.style.cssText = "width:100%;height:100%;display:block"; box.appendChild(v.el);
    }
    box.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, rx: rot.x, ry: rot.y, m: false }; try { box.setPointerCapture(e.pointerId); } catch (_) {} });
    box.addEventListener("pointermove", (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 5) drag.m = true; rot.y = drag.ry + dx * 0.5; rot.x = clamp(drag.rx - dy * 0.4, -80, 80); last = performance.now(); });
    box.addEventListener("pointerup", () => { if (drag && !drag.m) { spin = Math.min(900, spin + 360); snd("spin", 0.6, 0.9 + Math.random() * 0.25); } drag = null; });
    box.addEventListener("pointercancel", () => (drag = null));
    box.addEventListener("contextmenu", (e) => e.preventDefault());
    new IntersectionObserver((es) => { vis = es[0].isIntersecting; }).observe(box);
    let t0 = performance.now();
    (function f(now) { const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
      if (v && vis) { spin += (30 - spin) * Math.min(1, dt * 0.8); if (!drag && motion()) rot.y += spin * dt; v.setRot([["x", rot.x], ["y", rot.y]]); $(".sb-ring").style.setProperty("--sp", spin); }
      requestAnimationFrame(f); })(t0);
    requestAnimationFrame(build);
    let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(build, 250); });
  })();

  /* ================= 01 КРАФТ ================= */
  K.craft($("#craftBox"), { pattern: ["EEE", "EIE", "EEE"], key: { E: { src: T("i/emerald"), name: "Изумруд", id: "minecraft:emerald" }, I: { src: T("i/iron_block"), name: "Железный блок", id: "minecraft:iron_block" } },
    result: { src: T("i/steel_ball"), name: "Стальной шар", id: "zitraksmode:steel_ball" }, onTake: () => { snd("return", 0.6); adv.grant("craft_steel_ball"); } });

  /* ================= 02 СИМУЛЯТОР ================= */
  const cv = $("#cv"), cx = cv.getContext("2d"), field = $("#field");
  const img = (src) => { const i = new Image(); i.src = src; return i; };
  const IM = { sand: img(T("v/sand")), ss: img(T("v/sandstone")), cactus: img(T("v/cactus")), bush: img(T("v/deadbush")), steve: img(T("v/steve")), zombie: img(T("v/zombie")), ball: img(T("sprite")), iron: img(T("v/iron")), crit: img(T("v/crit")) };
  let W = 0, H = 0, S = 30, VIS = 28, GY = 0, dpr = 1;
  const PX = 2.2, EYE = 1.62; // игрок: ноги в x=2.2, глаза на 1.62
  let WALL = 26.5;
  function size() {
    dpr = Math.min(2, devicePixelRatio || 1); W = field.clientWidth; VIS = W < 700 ? 17 : 28; S = W / VIS; H = Math.round(Math.min(S * (W < 700 ? 10.5 : 14.5), W < 700 ? 330 : 470));
    cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + "px"; GY = H - S * 1.5; WALL = VIS - 1;
    if (zomb && zomb.x > WALL - 1.5) zomb.x = WALL - 1.5;
  }
  const wx = (x) => x * S, wy = (y) => GY - y * S;

  const st = { slow: false, bb: false, ang: 2 };
  let ball = null, zomb = null, charging = null, particles = [], nums = [], trail = [], tickN = 0, hint = null;
  function newZombie() { zomb = { x: Math.min(WALL - 1.5, VIS * 0.6), hp: 20, inv: 0, lastHurt: 0, hurtT: 0, dead: 0, walk: 0 }; }
  const log = (t, cls = "") => { const el = document.createElement("div"); el.className = cls; el.innerHTML = t; $("#log").appendChild(el); while ($("#log").children.length > 5) $("#log").firstChild.remove(); setTimeout(() => el.classList.add("old"), 5000); };
  function hurtZombie(d, src) {
    if (!zomb || zomb.dead) return false;
    if (zomb.inv > 10) { if (d <= zomb.lastHurt) { nums.push({ x: zomb.x, y: 2.2, t: 0, s: "блок", c: "#aaa" }); return false; } const a = armorCut(d - zomb.lastHurt); zomb.lastHurt = d; zomb.hp -= a; nums.push({ x: zomb.x + rnd(-0.3, 0.3), y: 2.1, t: 0, s: f1(a), c: "#ffdd55" }); }
    else { const a = armorCut(d); zomb.lastHurt = d; zomb.inv = 20; zomb.hp -= a; zomb.hurtT = 10; nums.push({ x: zomb.x + rnd(-0.3, 0.3), y: 2.1, t: 0, s: f1(a), c: src === "drill" ? "#7dff7d" : "#ff6a4a" }); snd(Math.random() < 0.5 ? "zhurt1" : "zhurt2", 0.5, rnd(0.9, 1.1)); }
    if (zomb.hp <= 0) { zomb.hp = 0; zomb.dead = 1; snd("zdeath", 0.6); log(`Зомби убит шаром`, "g"); adv.grant("kill_mob"); setTimeout(() => { if (zomb && zomb.dead) newZombie(); }, 2600); }
    return true;
  }
  function throwBall(t) {
    const p = params(t, st.bb); if (!p.ok) { log("Слишком коротко: шар не полетел (нужно хотя бы 5 тиков)", "d"); return; }
    let a = st.ang * Math.PI / 180; a += gauss() * 0.0075 * p.inac * 1.7; // ванильный разброс в плоскости экрана
    ball = { x: PX + 0.3, y: EYE - 0.1, vx: Math.cos(a) * p.v, vy: Math.sin(a) * p.v, r: 0.125, charged: p.charged, bb: st.bb, life: 0, ownerDelay: 10, ret: false, stuck: false, drill: 0, ground: false, gt: 0, spin: 0, spinDir: Math.random() < 0.5 ? 1 : -1, v0: p.v };
    trail = []; snd("throw", 0.8, p.charged ? 0.9 : 1.05);
    log(`${p.charged ? "<b>Заряженный</b>" : "Незаряженный"} бросок: ${f1(p.v, 2)} бл/тик${p.inac ? `, разброс ${f1(p.inac, 2)}` : ", без разброса"}`);
  }
  function pickup() {
    if (!ball) return; const was = ball; ball = null; snd("return", 0.8);
    if (was.charged) { log("Шар вернулся в руку — <b>золотое вращение</b>", "g"); adv.grant("golden_rotation"); } else log("Шар подобран");
  }
  function breakBall() { particles.push(...Array.from({ length: 14 }, () => ({ x: ball.x, y: ball.y, vx: rnd(-0.12, 0.12), vy: rnd(0.05, 0.25), t: 0, k: "iron" }))); snd("break", 0.7); log("Незаряженный шар пролежал 200 тиков и рассыпался. В игре он потерян.", "d"); ball = null; setTimeout(() => { hint = "Новый шар в руке"; }, 600); }
  // пересечение отрезка p→p+v с AABB (для зомби), возвращает t∈[0,1] или null
  function segBox(x, y, vx, vy, x0, y0, x1, y1) { let t0 = 0, t1 = 1; for (const [p, d, a, b] of [[x, vx, x0, x1], [y, vy, y0, y1]]) { if (Math.abs(d) < 1e-9) { if (p < a || p > b) return null; continue; } let ta = (a - p) / d, tb = (b - p) / d; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return null; } return t0; }

  function simTick() {
    tickN++;
    if (zomb) { if (zomb.inv > 0) zomb.inv--; if (zomb.hurtT > 0) zomb.hurtT--; if (zomb.dead) zomb.dead++; else if (!ball || !ball.stuck) { if (zomb.x > PX + 3.5) { zomb.x -= 0.012; zomb.walk += 0.012; } } }
    if (charging) { charging.t++; if (charging.t === 20 && !st.bb) { ZM.sfx("click", 0.4, 1.6); } }
    if (!ball) return;
    const b = ball;
    // --- ThrowableProjectile.tick: столкновения и перемещение (кроме сверления) ---
    if (!b.stuck) {
      if (!b.ret || !b.bb) {
        let hitT = 1.01, hit = null;
        if (!b.ret && zomb && !zomb.dead) { const t = segBox(b.x, b.y, b.vx, b.vy, zomb.x - 0.3 - b.r, -b.r, zomb.x + 0.3 + b.r, 1.95 + b.r); if (t != null && t < hitT) { hitT = t; hit = "ent"; } }
        if (!b.ground && b.vy < 0 && b.y + b.vy < b.r) { const t = (b.r - b.y) / b.vy; if (t >= 0 && t < hitT) { hitT = t; hit = "floor"; } }
        if (b.vx > 0 && b.x + b.vx > WALL - b.r) { const t = (WALL - b.r - b.x) / b.vx; if (t >= 0 && t < hitT) { hitT = t; hit = "wall"; } }
        if (b.vx < 0 && b.x + b.vx < 0.2 + b.r) { const t = (0.2 + b.r - b.x) / b.vx; if (t >= 0 && t < hitT) { hitT = t; hit = "wallL"; } }
        if (hit === "ent") { onHitEntity(b); if (!b.stuck) { b.x += b.vx * hitT; b.y += b.vy * hitT; } }
        else if (hit && !b.ret) {
          const hx = b.x + b.vx * hitT, hy = b.y + b.vy * hitT, sp = Math.hypot(b.vx, b.vy);
          if (sp < 0.10) { b.x = hx; b.y = hy; if (b.bb) b.ret = true; else { b.vx = 0; b.vy = 0; if (hit === "floor") { b.ground = true; b.y = b.r; } } }
          else {
            const vert = hit === "floor"; let f = vert ? (b.charged ? 0.52 : 0.38) : (b.charged ? 0.74 : 0.60); if (b.bb) f += 0.1;
            let nx = b.vx, ny = b.vy; if (vert) ny = -ny; else nx = -nx; nx *= f; ny *= f;
            if (vert) { nx *= 0.96; ny = Math.abs(ny); } else ny *= 0.98;
            if (Math.hypot(nx, ny) < 0.10) { if (b.bb) { b.ret = true; } else { nx = 0; ny = 0; } }
            b.x = hx + (vert ? 0 : (hit === "wall" ? -0.06 : 0.06)); b.y = hy + (vert ? 0.06 : 0);
            b.vx = nx; b.vy = ny; b.spinDir *= -1; snd("spin", 0.45, 0.85 + Math.random() * 0.25);
            sparks(b.x, b.y, 4);
            if (vert && ny < 0.09) { b.ground = true; b.vy = 0; b.y = b.r; }
          }
          b.x += b.vx; b.y += b.vy;
        } else { b.x += b.vx; b.y += b.vy; }
      } else { b.x += b.vx; b.y += b.vy; } // Ball Breaker при возврате летит сквозь всё
      if (!b.stuck) { b.vx *= 0.99; b.vy *= 0.99; if (!b.ground) b.vy -= 0.075; }
      if (b.y < b.r && !b.ret) { b.y = b.r; if (b.vy < 0) b.vy = 0; }
    }
    // --- SteelBallEntity.tick ---
    b.life++; if (b.ownerDelay > 0) b.ownerDelay--;
    const spd = Math.hypot(b.vx, b.vy); b.spin += Math.max(2, spd * 95 + (b.ret ? 18 : 0) + (b.stuck ? 24 : 0)) * b.spinDir;
    if (b.life >= 200 && !b.ret) { if (b.bb) b.ret = true; else return breakBall(); }
    if (b.stuck) {
      if (!zomb || zomb.dead) { b.stuck = false; b.drill = 0; b.ret = true; return; }
      b.vx = b.vy = 0; b.x = zomb.x; b.y = 0.975;
      if (b.drill > 0) { if (b.drill % 4 === 0) { hurtZombie(b.bb ? 4.5 : 2.5, "drill"); snd("spin", 0.7, b.bb ? 1.5 : 1.35); sparks(b.x, b.y, 3); } b.drill--; }
      if (b.drill <= 0 && b.stuck) { b.stuck = false; b.ret = true; }
      return;
    }
    if (b.ret) {
      const tx = PX, ty = EYE * 0.8, dx = tx - b.x, dy = ty - b.y, dist = Math.hypot(dx, dy);
      if (dist < 1.5) return pickup();
      const want = dist > 6 ? (b.bb ? 1.55 : 1.25) : (b.bb ? 1.05 : 0.85) + dist * 0.08, k = b.bb ? 0.62 : 0.72;
      b.vx = b.vx * k + dx / dist * want * (1 - k); b.vy = b.vy * k + dy / dist * want * (1 - k); b.ground = false;
      return;
    }
    if (!b.ground) { if (spd > 1e-5) { b.vx *= 0.992; b.vy *= 0.992; } b.gt = 0; }
    else {
      b.gt++; let h = Math.abs(b.vx);
      if (h > 0.045) { let fr = b.charged ? 0.92 : 0.84; if (b.bb) fr = Math.min(0.97, fr + 0.03); b.vx *= fr; } else b.vx = 0;
      b.vy = 0; h = Math.abs(b.vx);
      if (b.charged) {
        if (h * h > 0.04) {
          if (b.life % 6 === 0 && zomb && !zomb.dead && Math.abs(b.x - zomb.x) < 0.3 + 0.55) hurtZombie(Math.min(b.bb ? 9 : 5, (b.bb ? 2.8 : 1.5) + h * (b.bb ? 3.5 : 2.5)), "roll");
          if (b.life % 10 === 0) snd("spin", 0.3, 0.9 + Math.random() * 0.25);
        }
        if (b.gt >= (b.bb ? 20 : 30) && h * h < 0.02) b.ret = true;
      }
    }
    if (!b.ret && b.ownerDelay <= 0 && Math.hypot(b.x - PX, b.y) <= 1.5) pickup();
  }
  function onHitEntity(b) {
    const sp = Math.hypot(b.vx, b.vy), d = impactDmg(sp, b.charged, b.bb);
    hurtZombie(d, "hit"); sparks(b.x, b.y, 8);
    if (b.charged) { b.stuck = true; b.drill = b.bb ? 60 : 30; b.vx = b.vy = 0; log(`Удар ${f1(d)} и шар вгрызается: сверлит ${b.bb ? 60 : 30} тиков`); }
    else { b.ret = true; log(`Удар ${f1(d)}, шар отскакивает к тебе`); }
  }
  function sparks(x, y, n) { for (let i = 0; i < n; i++) particles.push({ x, y, vx: rnd(-0.15, 0.15), vy: rnd(0, 0.2), t: 0, k: "crit" }); }

  /* ---------- отрисовка ---------- */
  function drawPart(im, sx, sy, sw, sh, x, y, w, h, flip) { if (flip) { cx.save(); cx.translate(x + w, y); cx.scale(-1, 1); cx.drawImage(im, sx, sy, sw, sh, 0, 0, w, h); cx.restore(); } else cx.drawImage(im, sx, sy, sw, sh, x, y, w, h); }
  function drawMob(im, x, facing, armAng, legPhase, fall, red) {
    const u = S / 16, X = wx(x), Y = GY; cx.save(); cx.translate(X, Y);
    if (fall) { cx.rotate(-facing * Math.min(1, fall / 20) * Math.PI / 2); cx.globalAlpha = Math.max(0, 1 - Math.max(0, fall - 20) / 20); }
    const flip = facing < 0, sideHead = [0, 8], sideBody = [16, 20], sideArm = [40, 20], sideLeg = [0, 20];
    const lg = Math.sin(legPhase) * 0.5;
    for (const s of [1, -1]) { cx.save(); cx.translate(0, -12 * u); cx.rotate(lg * s); drawPart(im, sideLeg[0], sideLeg[1], 4, 12, -2 * u, 0, 4 * u, 12 * u, flip); cx.restore(); }
    drawPart(im, sideBody[0], sideBody[1], 4, 12, -2 * u, -24 * u, 4 * u, 12 * u, flip);
    drawPart(im, sideHead[0], sideHead[1], 8, 8, -4 * u, -32 * u, 8 * u, 8 * u, flip);
    cx.save(); cx.translate(0, -22 * u); cx.rotate(armAng); drawPart(im, sideArm[0], sideArm[1], 4, 12, -2 * u, -2 * u, 4 * u, 12 * u, flip); cx.restore();
    if (red) { cx.globalCompositeOperation = "source-atop"; cx.fillStyle = "rgba(255,0,0,.45)"; cx.fillRect(-6 * u, -34 * u, 12 * u, 36 * u); }
    cx.restore();
  }
  let pat = {};
  function tilePattern(k) { const im = IM[k]; if (!im.complete || !im.naturalWidth) return null; if (pat[k] && pat[k].S === S) return pat[k].p; const c = document.createElement("canvas"); c.width = c.height = Math.max(8, Math.round(S)); const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(im, 0, 0, 16, 16, 0, 0, c.width, c.height); pat[k] = { S, p: cx.createPattern(c, "repeat") }; return pat[k].p; }
  function draw(alpha) {
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.imageSmoothingEnabled = false;
    const g = cx.createLinearGradient(0, 0, 0, GY); g.addColorStop(0, "#2b1d3a"); g.addColorStop(0.45, "#c2552c"); g.addColorStop(1, "#f2b45a"); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    cx.fillStyle = "rgba(255,230,160,.9)"; cx.beginPath(); cx.arc(W * 0.72, GY - S * 2.2, S * 1.5, 0, 6.3); cx.fill();
    cx.fillStyle = "#8a3f22"; cx.beginPath(); cx.moveTo(0, GY); for (let x = 0; x <= W; x += 20) cx.lineTo(x, GY - S * (1.2 + Math.sin(x / 140) * 0.6 + Math.sin(x / 57) * 0.2)); cx.lineTo(W, GY); cx.fill();
    cx.fillStyle = "#5e2a18"; cx.beginPath(); cx.moveTo(0, GY); for (let x = 0; x <= W; x += 20) cx.lineTo(x, GY - S * (0.5 + Math.sin(x / 90 + 2) * 0.3)); cx.lineTo(W, GY); cx.fill();
    // кактус и куст
    if (IM.cactus.complete) { for (let k = 0; k < 2; k++) cx.drawImage(IM.cactus, 0, 0, 16, 16, wx(VIS * 0.38) - S / 2 + 1, GY - S * (k + 1), S - 2, S); }
    if (IM.bush.complete) cx.drawImage(IM.bush, wx(VIS * 0.82), GY - S, S, S);
    // земля
    const ps = tilePattern("sand"); if (ps) { cx.save(); cx.translate(0, GY); cx.fillStyle = ps; cx.fillRect(0, 0, W, H - GY); cx.restore(); cx.fillStyle = "rgba(0,0,0,.15)"; cx.fillRect(0, GY, W, 2); }
    const pw = tilePattern("ss"); if (pw) { cx.save(); cx.translate(wx(WALL), GY % S); cx.fillStyle = pw; cx.fillRect(0, -GY, W - wx(WALL), GY * 2); cx.restore(); cx.fillStyle = "rgba(0,0,0,.25)"; cx.fillRect(wx(WALL), 0, 3, GY); }
    // игрок
    const aim = charging ? -(st.ang * Math.PI / 180) - Math.PI / 2 : ball ? -0.3 : 0.15;
    if (IM.steve.complete) drawMob(IM.steve, PX, 1, aim, 0, 0, false);
    // зомби
    if (zomb && IM.zombie.complete) drawMob(IM.zombie, zomb.x, -1, Math.PI / 2, zomb.walk * 6, zomb.dead, zomb.hurtT > 0);
    if (zomb && !zomb.dead) { const hw = S * 1.2, x0 = wx(zomb.x) - hw / 2, y0 = GY - S * 2.35; cx.fillStyle = "rgba(0,0,0,.6)"; cx.fillRect(x0 - 1, y0 - 1, hw + 2, 6); cx.fillStyle = zomb.hp > 8 ? "#e33" : "#a11"; cx.fillRect(x0, y0, hw * zomb.hp / 20, 4); }
    // след
    if (trail.length > 1) { for (let i = 0; i < trail.length; i++) { const p = trail[i]; cx.fillStyle = `rgba(255,214,90,${(i / trail.length) * 0.7})`; cx.fillRect(wx(p[0]) - 2, wy(p[1]) - 2, 4, 4); } }
    // шар
    if (ball) {
      const bx = ball.px != null ? ball.px + (ball.x - ball.px) * alpha : ball.x, by = ball.py != null ? ball.py + (ball.y - ball.py) * alpha : ball.y, R = S * 0.26;
      cx.fillStyle = "rgba(0,0,0,.25)"; cx.beginPath(); cx.ellipse(wx(bx), GY + 2, R * clamp(1 - by / 6, 0.3, 1), R * 0.25, 0, 0, 6.3); cx.fill();
      if (ball.charged) { cx.strokeStyle = ball.bb ? "rgba(140,255,255,.8)" : "rgba(255,215,90,.8)"; cx.lineWidth = 2; cx.beginPath(); cx.arc(wx(bx), wy(by), R + 4 + Math.sin(tickN) * 1.5, 0, 6.3); cx.stroke(); }
      cx.save(); cx.translate(wx(bx), wy(by)); cx.rotate(ball.spin * Math.PI / 180); cx.imageSmoothingEnabled = true; if (IM.ball.complete) cx.drawImage(IM.ball, -R, -R, R * 2, R * 2); cx.restore();
    } else if (!charging) {
      cx.save(); cx.translate(wx(PX + 0.35), wy(1.05)); cx.imageSmoothingEnabled = true; if (IM.ball.complete) cx.drawImage(IM.ball, -S * 0.16, -S * 0.16, S * 0.32, S * 0.32); cx.restore();
    }
    if (charging) { const R = S * 0.2, a = -(st.ang * Math.PI / 180); cx.save(); cx.translate(wx(PX) + Math.cos(a) * S * 0.7, wy(1.5) + Math.sin(a) * S * 0.7); cx.rotate(tickN * (charging.t >= 20 || st.bb ? 1.2 : 0.5)); cx.imageSmoothingEnabled = true; if (IM.ball.complete) cx.drawImage(IM.ball, -R, -R, R * 2, R * 2); cx.restore();
      cx.setLineDash([4, 6]); cx.strokeStyle = "rgba(255,240,200,.55)"; cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(wx(PX + 0.3), wy(EYE - 0.1)); cx.lineTo(wx(PX + 0.3) + Math.cos(a) * S * 4, wy(EYE - 0.1) + Math.sin(a) * S * 4); cx.stroke(); cx.setLineDash([]); }
    // частицы и цифры
    cx.imageSmoothingEnabled = false;
    for (const p of particles) { const s = p.k === "iron" ? S * 0.18 : S * 0.2; if (p.k === "iron" && IM.iron.complete) cx.drawImage(IM.iron, 4, 4, 4, 4, wx(p.x) - s / 2, wy(p.y) - s / 2, s, s); else if (IM.crit.complete) { cx.globalAlpha = 1 - p.t / 14; cx.drawImage(IM.crit, wx(p.x) - s / 2, wy(p.y) - s / 2, s, s); cx.globalAlpha = 1; } }
    cx.font = `700 ${Math.round(S * 0.5)}px Oswald, sans-serif`; cx.textAlign = "center";
    for (const n of nums) { cx.globalAlpha = 1 - n.t / 30; cx.fillStyle = "#000"; cx.fillText(n.s, wx(n.x) + 2, wy(n.y + n.t * 0.03) + 2); cx.fillStyle = n.c; cx.fillText(n.s, wx(n.x), wy(n.y + n.t * 0.03)); cx.globalAlpha = 1; }
    if (hint) { cx.font = `400 ${Math.round(S * 0.4)}px ${getComputedStyle(document.body).getPropertyValue("--f-pixel") || "monospace"}`; cx.fillStyle = "#fff"; cx.fillText(hint, wx(PX), wy(2.7)); }
  }
  function stepFx() {
    for (const p of particles) { p.t++; p.x += p.vx; p.y += p.vy; p.vy -= 0.02; } particles = particles.filter((p) => p.t < 16);
    for (const n of nums) n.t++; nums = nums.filter((n) => n.t < 30);
    if (ball) { trail.push([ball.x, ball.y]); if (trail.length > 26) trail.shift(); } else if (trail.length) trail.shift();
  }
  function readout() {
    const p = charging ? params(charging.t, st.bb) : null;
    $("#chBar").style.width = (p ? (st.bb ? 100 : Math.min(1, charging.t / 30) * 100) : 0) + "%";
    $("#chBar").className = p ? (p.charged ? "gold" : p.ok ? "ok" : "") : "";
    $("#chTxt").textContent = p ? (st.bb ? "Ball Breaker: сразу максимум" : `${charging.t} тиков · заряд ${Math.round(p.c * 100)}%${p.charged ? " · ЗАРЯЖЕН" : ""}`) : ball ? "шар в полёте" : "держи ПКМ";
    const b = ball, state = !b ? "в руке" : b.stuck ? `сверлит · ${b.drill} т` : b.ret ? "летит домой" : b.ground ? "катится" : "в воздухе";
    $("#readout").innerHTML = [["Шар", state], ["Скорость", b ? f1(Math.hypot(b.vx, b.vy), 2) + " бл/т" : "—"], ["Жизнь", b ? `${b.life}/200` : "—"], ["Зомби", zomb ? (zomb.dead ? "убит" : `${f1(zomb.hp)} / 20 ❤`) : "—"], ["Неуязвимость", zomb && zomb.inv ? `${zomb.inv} т` : "—"]].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("");
  }
  // игровой цикл: 20 тиков/с (или 5 при замедлении)
  let acc = 0, lastT = performance.now(), simVis = true;
  new IntersectionObserver((es) => { simVis = es[0].isIntersecting; }).observe(field);
  function frame(now) {
    const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    if (simVis) {
      acc += dt; const TICK = 0.05;
      while (acc >= TICK) { acc -= TICK; if (ball) { ball.px = ball.x; ball.py = ball.y; } simTick(); stepFx(); }
      draw(acc / TICK); readout();
    }
    requestAnimationFrame(frame);
  }
  // управление
  function aimFrom(e) { const r = cv.getBoundingClientRect(); const x = (e.clientX - r.left) / S - PX, y = (GY - (e.clientY - r.top)) / S - EYE; if (x > 0.3) { st.ang = clamp(Math.round(Math.atan2(y, x) * 180 / Math.PI), -15, 60); $("#ang").value = st.ang; $("#angV").textContent = st.ang + "°"; } }
  function startCharge() { if (ball || charging) return; hint = null; charging = { t: 0 }; snd("charge", 0.6); }
  function release() { if (!charging) return; const t = charging.t; charging = null; throwBall(t); }
  cv.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") aimFrom(e); startCharge(); try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
  cv.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") aimFrom(e); });
  cv.addEventListener("pointerup", release); cv.addEventListener("pointercancel", release);
  cv.addEventListener("contextmenu", (e) => e.preventDefault());
  const tb = $("#throwBtn");
  tb.addEventListener("pointerdown", (e) => { e.preventDefault(); startCharge(); try { tb.setPointerCapture(e.pointerId); } catch (_) {} });
  tb.addEventListener("pointerup", release); tb.addEventListener("pointercancel", release);
  tb.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); startCharge(); } });
  tb.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") release(); });
  $("#ang").addEventListener("input", (e) => { st.ang = +e.target.value; $("#angV").textContent = st.ang + "°"; });
  $("#bbT").addEventListener("change", (e) => { st.bb = e.target.checked; field.classList.toggle("bb", st.bb); if (st.bb) snd("enchant", 0.6); });
  $("#zBtn").addEventListener("click", () => { newZombie(); snd("zsay", 0.5); });
  size(); newZombie(); new ResizeObserver(() => { if (Math.abs(field.clientWidth - W) > 1) { size(); pat = {}; } }).observe(field); requestAnimationFrame(frame);

  /* ================= 03 ЦИФРЫ ================= */
  function curve() {
    const c = $("#curve"), w = c.parentElement.clientWidth, h = Math.min(260, Math.max(180, w * 0.3)), d = Math.min(2, devicePixelRatio || 1);
    c.width = w * d; c.height = h * d; c.style.height = h + "px"; const g = c.getContext("2d"); g.setTransform(d, 0, 0, d, 0, 0);
    const L = 38, R = 12, Tp = 14, B = 26, X = (t) => L + (t / 30) * (w - L - R), Y = (v) => h - B - v * (h - B - Tp);
    g.strokeStyle = "rgba(255,255,255,.08)"; g.lineWidth = 1; g.font = "11px ui-monospace, monospace"; g.fillStyle = "#8f8676";
    for (let t = 0; t <= 30; t += 5) { g.beginPath(); g.moveTo(X(t), Tp); g.lineTo(X(t), h - B); g.stroke(); g.fillText(t + "т", X(t) - 8, h - 8); }
    for (let v = 0; v <= 1; v += 0.25) { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(w - R, Y(v)); g.stroke(); g.fillText(f1(v * 3, 1), 4, Y(v) + 4); }
    g.fillStyle = "rgba(255,90,60,.12)"; g.fillRect(X(0), Tp, X(5) - X(0), h - B - Tp);
    g.strokeStyle = "#ffd65a"; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(X(20), Tp); g.lineTo(X(20), h - B); g.stroke(); g.setLineDash([]);
    g.fillStyle = "#ffd65a"; g.fillText("1 с: заряжен", X(20) + 5, Tp + 12);
    g.fillStyle = "#ff8a6a"; g.fillText("не летит", X(0) + 4, h - B - 6);
    const line = (fn, col, wd) => { g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); for (let t = 0; t <= 30; t += 0.25) { const v = fn(Math.floor(t)); t ? g.lineTo(X(t), Y(v)) : g.moveTo(X(t), Y(v)); } g.stroke(); };
    line((t) => chargeOf(t), "#9ae66e", 2.5);
    line((t) => params(t, false).v / 3, "#ffd65a", 2.5);
    line((t) => Math.min(1, params(t, false).inac), "#e57a5a", 2);
  }
  curve(); addEventListener("resize", curve);
  const rows = [
    ["Держать", "0,5 с (10 т)", "1 с и дольше", "любой тап"],
    ["Скорость", f1(params(10, false).v, 2) + " бл/т", f1(params(20, false).v, 2) + " бл/т", f1(params(0, true).v, 2) + " бл/т"],
    ["Разброс", f1(params(10, false).inac, 2), f1(params(20, false).inac, 2), "нет"],
    ["Удар", f1(impactDmg(params(10, false).v, false, false)), f1(impactDmg(params(20, false).v, true, false)), f1(impactDmg(params(0, true).v, true, true))],
    ["После удара", "отлетает к тебе", "сверлит 30 т по 2,5", "сверлит 60 т по 4,5"],
    ["Отскок: пол / стена", "0,38 / 0,60", "0,52 / 0,74", "0,62 / 0,84"],
    ["Трение о землю", "0,84", "0,92", "0,95"],
    ["Качение", "не ранит", "до 5 урона раз в 6 т", "до 9 урона раз в 6 т"],
    ["Возврат", "только после удара по мобу", "после удара или остановки", "всегда, сквозь блоки"],
    ["Через 10 с", "рассыпается", "рассыпается, если не вернулся", "летит домой"],
  ];
  $("#tbl").innerHTML = `<div class="sb-tr h"><span></span><span>Незаряженный</span><span>Заряженный</span><span>Ball Breaker</span></div>` + rows.map((r) => `<div class="sb-tr"><span>${r[0]}</span><span>${r[1]}</span><span>${r[2]}</span><span>${r[3]}</span></div>`).join("");

  /* ================= 04 BALL BREAKER ================= */
  K.dl($("#bbDl"), [["Редкость", "Редкое (Rare)"], ["Уровень", "I"], ["Стоимость", "10–30 уровней"], ["На книги", "да"], ["Стол зачарований", "да"], ["Сокровище", "нет"]]);

  /* ================= 05–06 ================= */
  adv = K.adv({ list: ZM.P18.advancements, store: "p18.adv", icon: (a) => T("i/" + a.icon), chatSel: "#log", intro: "Три скрытые: скрафтить, поймать заряженный шар и казнить моба." });
  K.timeline($("#tl"), [
    { date: "02.05.2026", t: "Стальной шар", d: "Шар Джайро: заряд как у лука, отскоки, сверление заряженным ударом, возврат в руку. Три ачивки.", c: "#9ae66e" },
    { ver: "1.1.0", date: "18.07.2026", t: "Ball Breaker", d: "Энчант-апдейт: своё зачарование для шара — мгновенный полный заряд, двойное сверление, возврат сквозь стены.", c: "#8cffff" },
  ]);
  K.finNav(18, $("#finNav"));
  ZM.reveal && ZM.reveal();
})();
