/* №14 · Акваланг. Вся логика воздуха — как в AqualungItem.onArmorTick: 1 тик под водой = 1 единица, 7340 максимум. */
(function () {
  const { $, esc } = ZM, K = ZM.kit, U = ZM.url;
  ZM.topbar({ crumb: "№14 · Акваланг", ...ZM.pointNav(14) });
  const T = (p) => U(`assets/textures/p14/${p}.png`);
  const snd = K.sounds("p14");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), rr = (a, b) => a + Math.random() * (b - a);
  const img = (src) => Object.assign(new Image(), { src });
  const MAX = 7340;
  const airCol = (p) => (p > 0.5 ? "#00CCFF" : p > 0.25 ? "#FFCC00" : "#FF4444");       // AqualungHUD
  const tipCol = (s) => (s > 183 ? "#55FFFF" : s > 91 ? "#FFFF55" : "#FF5555");          // подсказка: >183 аква, >91 жёлтый
  const tipHtml = (ticks, extra = "") => `<span class="n" style="color:#55ffff">Акваланг</span><span class="n" style="color:${tipCol(Math.floor(ticks / 20))}">Воздух: ${Math.floor(ticks / 20)} сек</span><span class="n" style="color:#aaa">Чинится: железо, медь, ракушка</span>${extra}`;

  /* ================= фон: толща воды, глубина = прокрутка ================= */
  const bg = $("#bg"), bx = bg.getContext("2d");
  let BW = 0, BH = 0, depth = 0;
  const bubbles = [], snow = [];
  function bgSize() { const r = Math.min(devicePixelRatio || 1, 1.5) * 0.5; BW = bg.width = Math.ceil(innerWidth * r); BH = bg.height = Math.ceil(innerHeight * r); }
  bgSize(); addEventListener("resize", bgSize);
  for (let i = 0; i < 70; i++) snow.push({ x: Math.random(), y: Math.random(), r: rr(0.4, 1.4), v: rr(0.002, 0.008) });
  const burst = (x, y, n = 14, big = 1) => { for (let i = 0; i < n; i++) bubbles.push({ x: x + rr(-0.02, 0.02), y: y + rr(-0.01, 0.01), r: rr(2, 6) * big, v: rr(0.0025, 0.006), w: rr(0, 6) }); };
  function lerpC(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
  function bgDraw(now) {
    const t = now / 1000, d = depth;
    const top = lerpC([14, 110, 160], [1, 12, 22], Math.pow(d, 0.7)), bot = lerpC([3, 40, 70], [0, 3, 8], Math.pow(d, 0.6));
    const g = bx.createLinearGradient(0, 0, 0, BH); g.addColorStop(0, `rgb(${top})`); g.addColorStop(1, `rgb(${bot})`);
    bx.fillStyle = g; bx.fillRect(0, 0, BW, BH);
    // лучи сверху, гаснут с глубиной
    const ra = (1 - d) * 0.16;
    if (ra > 0.005) { bx.save(); bx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 7; i++) { const x = ((i / 7 + Math.sin(t * 0.13 + i) * 0.03) * 1.3 - 0.1) * BW, w = BW * (0.04 + (i % 3) * 0.025);
        const lg = bx.createLinearGradient(0, 0, 0, BH); lg.addColorStop(0, `rgba(190,240,255,${ra * (0.6 + 0.4 * Math.sin(t * 0.7 + i * 2))})`); lg.addColorStop(1, "rgba(190,240,255,0)");
        bx.fillStyle = lg; bx.beginPath(); bx.moveTo(x, 0); bx.lineTo(x + w, 0); bx.lineTo(x + w * 2.4 + BW * 0.15, BH); bx.lineTo(x + BW * 0.15, BH); bx.fill(); }
      bx.restore(); }
    // поверхность воды видна только у самого верха
    if (d < 0.04) { const a = 1 - d / 0.04; bx.fillStyle = `rgba(200,245,255,${0.18 * a})`; bx.beginPath(); bx.moveTo(0, 0);
      for (let x = 0; x <= BW; x += 8) bx.lineTo(x, 10 + Math.sin(x / 40 + t * 1.6) * 4 + Math.sin(x / 13 + t * 2.3) * 2); bx.lineTo(BW, 0); bx.fill(); }
    bx.fillStyle = `rgba(200,230,255,${0.25 + d * 0.2})`;
    for (const s of snow) { s.y -= s.v * 0.12; s.x += Math.sin(t + s.y * 9) * 0.0003; if (s.y < 0) { s.y = 1; s.x = Math.random(); } bx.fillRect(s.x * BW, s.y * BH, s.r, s.r); }
    if (!reduce && Math.random() < 0.08) bubbles.push({ x: Math.random(), y: 1.02, r: rr(1.5, 4), v: rr(0.0015, 0.004), w: rr(0, 6) });
    bx.strokeStyle = "rgba(220,250,255,.55)"; bx.lineWidth = 1;
    for (let i = bubbles.length - 1; i >= 0; i--) { const b = bubbles[i]; b.y -= b.v; b.w += 0.08; const x = (b.x + Math.sin(b.w) * 0.004) * BW, y = b.y * BH;
      bx.beginPath(); bx.arc(x, y, b.r, 0, 7); bx.stroke(); bx.fillStyle = "rgba(255,255,255,.5)"; bx.fillRect(x - b.r * 0.4, y - b.r * 0.5, 1, 1);
      if (b.y < -0.05) bubbles.splice(i, 1); }
  }
  const depthTxt = $("#depthTxt"), depthMark = $("#depthMark"), hudBar = $("#pageHudBar"), hudTxt = $("#pageHudTxt");
  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight; depth = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
    const m = Math.round(depth * 120), h = depthMark.parentElement.clientHeight;
    depthMark.style.top = depth * h + "px"; depthTxt.style.setProperty("--y", depth * h + "px"); depthTxt.textContent = `−${m} м`;
    const p = 1 - depth; hudBar.style.width = p * 100 + "%"; hudBar.style.background = airCol(p); hudTxt.textContent = Math.round(p * 100) + "%";
    setNeedle(p);
  }
  addEventListener("scroll", onScroll, { passive: true });

  /* ================= hero: модель в иллюминаторе + манометр ================= */
  const gT = $("#gTicks"); let gh = "";
  for (let i = 0; i <= 10; i++) { const a = (-135 + i * 27) * Math.PI / 180, r1 = i % 5 ? 38 : 34; gh += `<line x1="${50 + Math.sin(a) * r1}" y1="${50 - Math.cos(a) * r1}" x2="${50 + Math.sin(a) * 43}" y2="${50 - Math.cos(a) * 43}"/>`; }
  gT.innerHTML = gh + `<path d="M${50 + Math.sin(-1.4) * 43} ${50 - Math.cos(-1.4) * 43} A43 43 0 0 1 ${50 + Math.sin(-0.8) * 43} ${50 - Math.cos(-0.8) * 43}" stroke="#d21f1f" stroke-width="4" fill="none"/>`;
  const needle = $("#gNeedle"); let kick = 0;
  function setNeedle(p) { needle.style.transform = `rotate(${-135 + clamp(p + kick, 0, 1.05) * 270}deg)`; }
  let hero = null;
  (function heroView() {
    const cv = $("#hero3d"), G = ZM.GEO && ZM.GEO.aqualung;
    if (!G || !window.ZMGeo || !ZMGeo.supported()) { cv.replaceWith(Object.assign(img(T("aqualung")), { style: "position:absolute;inset:18%;width:64%;image-rendering:pixelated" })); return; }
    const g = ZMGeo.create(cv, { geo: G.geo, anim: G.anim, tex: G.tex });
    if (!g) return;
    const bb = g.bbox(["aqualung_r", "aqualung_l", "tubes"]), c = bb.c, M = ZMGeo.M;
    Object.assign(g.cam, { target: c, dist: Math.max(...bb.size) * 2.9, yaw: 0, pitch: 6, fov: 40 });
    const st = K.spinner(cv, { ry: 200, rx: 0 });
    let down = null;
    cv.addEventListener("pointerdown", (e) => (down = { x: e.clientX, y: e.clientY }));
    cv.addEventListener("pointerup", (e) => { if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return; down = null;
      const r = cv.getBoundingClientRect(); burst((r.left + r.width / 2) / innerWidth, (r.top + r.height * 0.35) / innerHeight, 26, 1.4);
      snd(["bub1", "bub2", "bub3"][Math.random() * 3 | 0], 0.8); kick = 0.25; setNeedle(1 - depth); setTimeout(() => { kick = 0; setNeedle(1 - depth); }, 600); });
    let vis = true; new IntersectionObserver((es) => (vis = es[0].isIntersecting)).observe(cv);
    hero = (dt, now) => {
      if (!vis) return;
      if (st.idle() && !reduce) st.ry += dt * 25;
      const bob = Math.sin(now / 1300) * 0.8;
      g.setExtra(M.mul(M.t(c[0], c[1] + bob, c[2]), M.mul(M.ry(st.ry * Math.PI / 180), M.mul(M.rx(st.rx * Math.PI / 180), M.t(-c[0], -c[1], -c[2])))));
      g.render();
      if (!reduce && Math.random() < dt * 1.2) { const r = cv.getBoundingClientRect(); if (r.bottom > 0) burst((r.left + r.width * rr(0.4, 0.6)) / innerWidth, (r.top + r.height * 0.3) / innerHeight, 3, 0.8); }
    };
  })();

  /* ================= 01 предмет ================= */
  $("#itemTip").innerHTML = tipHtml(MAX, `<span class="n">&nbsp;</span><span class="n" style="color:#aaa">При ношении на теле:</span><span class="n" style="color:#5555ff">+10 Броня</span><span class="n" style="color:#5555ff">+4 Прочность брони</span><span class="n" style="color:#5555ff">+1 Сопротивление отбрасыванию</span>`);
  $("#armorBar").innerHTML = Array.from({ length: 10 }, (_, i) => `<i style="background-image:url(${T("v/icons")});background-position:${i < 5 ? "-68px -18px" : "-32px -18px"}"></i>`).join("");
  K.dl($("#itemDl"), [
    ["слот", "нагрудник · модель GeckoLib: два баллона и шланги"],
    ["редкость", `<span style="color:#55ffff">редкий</span> · стак 1`],
    ["воздух", "7340 тиков = <b>367 секунд</b> (6:07)"],
    ["броня", "10 · прочность брони 4 · отбрасывание −10%"],
    ["зачаровывание", "18 — как у золота, книги ложатся охотно"],
    ["под водой", "пузыри не тратятся · Ночное зрение · Спешка I · плавание ×2"],
    ["без воздуха", "на суше — 2 урона (1 ❤) каждую секунду, пока не снимешь"],
    ["починка", `<span class="aq-mini"><img src="${T("i/iron_ingot")}" alt="">железо</span> <span class="aq-mini"><img src="${T("i/copper_ingot")}" alt="">медь</span> <span class="aq-mini"><img src="${T("i/nautilus_shell")}" alt="">раковина наутилуса</span>`],
    ["звук", "надевается с лязгом железной брони"],
  ]);

  /* ================= 02 крафт ================= */
  const I = (n, name, id) => ({ src: T("i/" + n), name, id: id || "minecraft:" + n });
  let adv = null;
  const wearR = $("#wearR");
  function wearUpd() { const v = +wearR.value, p = v / 240, air = Math.round(MAX * p);
    $("#wearDur").style.width = p * 100 + "%"; $("#wearDur").style.background = `hsl(${p * 120},100%,50%)`;
    $("#wearTxt").textContent = `${v} / 240 · ${Math.round(p * 100)}%`; $("#wearOut").textContent = `${air} тиков · ${Math.floor(air / 20)} сек`; return air; }
  wearR.addEventListener("input", wearUpd); wearUpd();
  K.craft($("#craftBox"), { pattern: ["IHI", " P ", "IGI"], key: { I: I("iron_ingot", "Железный слиток"), H: I("iron_helmet", "Железный шлем"), P: I("iron_chestplate", "Железный нагрудник"), G: I("glass", "Стекло") },
    result: { src: T("aqualung"), name: "Акваланг", id: "zitraksmode:aqualung" },
    onTake() { const air = wearUpd(); snd("equip", 0.7); adv.grant("craft_aqualung"); sim.set(air); K.say(`Акваланг в симуляторе: ${Math.floor(air / 20)} сек воздуха`); } });

  /* ================= 03 симулятор ================= */
  const sim = (function () {
    const cv = $("#sim"), x = cv.getContext("2d"), W = 640, H = 400, S = 32;       // 1 блок = 32 px
    cv.width = W; cv.height = H; x.imageSmoothingEnabled = false;
    const tx = {}; ["v/icons", "v/nv", "v/haste", "v/steve", "v/sand", "v/gravel", "v/kelp", "v/seagrass", "v/tube", "v/brain", "v/fire", "v/lantern", "v/prismarine", "aqualung", "i/cod", "i/salmon", "i/tropical_fish"].forEach((k) => (tx[k] = img(T(k))));
    const COLS = 44, BOT = 26, LAND = 5;
    const ground = []; for (let i = 0; i < COLS; i++) ground[i] = i < LAND ? 0 : i < 14 ? Math.round(2 + (i - LAND) * 2.4) : BOT - 3 + ((i * 7) % 3);
    const deco = []; for (let i = 13; i < COLS; i++) { const r = (i * 37) % 11; if (r < 3) deco.push({ c: i, k: "kelp", n: 4 + (i % 6) }); else if (r < 6) deco.push({ c: i, k: ["v/tube", "v/brain", "v/fire"][r - 3] }); else if (r < 8) deco.push({ c: i, k: "v/seagrass" }); }
    const lanternCol = 21;
    const fish = Array.from({ length: 6 }, (_, i) => ({ x: rr(8, 40), y: rr(4, 20), v: rr(0.02, 0.05) * (Math.random() < 0.5 ? -1 : 1), k: ["i/cod", "i/salmon", "i/tropical_fish"][i % 3] }));
    const P = { x: 3, y: 0, vx: 0, vy: 0, face: 1, ang: 0, hp: 20, air: 300, A: MAX, rt: 0, ut: 0, hurtT: 0, sinceHurt: 999, ground: true, dead: false, walk: 0 };
    const opt = { wear: true, vod: false, zhp: false, speed: 1 };
    const keys = { u: 0, d: 0, l: 0, r: 0 };
    let tick = 0, camY = -4, camX = 0, part = [], lastState = "", ambient = null, visible = false;
    const eye = () => P.y - 1.62, under = () => P.x >= LAND && eye() > 0.05, inWater = () => P.x >= LAND && P.y > 0.05;
    const log = (t) => K.chat("#simLog", t, 5);
    const nick = () => ZM.profile.me().nick;
    function hurt(n, why) {
      if (P.dead) return; P.hp = Math.max(0, P.hp - n); P.hurtT = 8; P.sinceHurt = 0; snd(Math.random() < 0.5 ? "drown1" : "drown2", 0.6);
      if (P.hp <= 0) { P.dead = true; const aq = opt.wear && P.A <= 0;
        const msg = why === "land" ? `${nick()} задохнулся в пустом акваланге на суше` : `${nick()} утонул`;
        log("§f" + msg); $("#deadWhy").textContent = msg; $("#dead").hidden = false; snd("death", 0.6);
        if (aq) adv.grant("drown_loser"); }
    }
    function step() {
      tick++;
      const uw = under(), iw = inWater();
      const hasA = opt.wear && P.A > 0;
      // --- AqualungItem.onArmorTick ---
      if (opt.wear) {
        if (uw && P.A > 0) { P.A--; if (P.A === 0) log("§eВ баллонах кончился воздух"); }
        if (!uw) { if (opt.vod && P.A < MAX) { if (++P.rt >= 40) { P.rt = 0; P.A = Math.min(MAX, P.A + 20); } } else P.rt = 0; } else P.rt = 0;
        if (opt.zhp && iw) P.vy = Math.min(P.vy + 0.08, 0.35);
        if (P.A <= 0 && !uw && tick % 20 === 0) hurt(2, "land");
      }
      const boost = uw && opt.wear && P.A > 0;
      // --- ванильные пузыри ---
      if (uw && !boost) { P.air--; if (P.air <= -20) { P.air = 0; hurt(2, "drown"); } } else if (boost) P.air = 300; else P.air = Math.min(300, P.air + 4);
      // --- таймер ачивки (сбрасывается, если голова над водой) ---
      if (uw) { if (++P.ut >= 1340) { adv.grant("deep_breath"); P.ut = 0; P.utDone = true; } } else P.ut = 0;
      // --- движение ---
      const ix = keys.r - keys.l, iy = keys.d - keys.u;
      if (iw) {
        const spd = 0.1 * (boost ? 2 : 1);
        P.vx += (ix * spd - P.vx) * 0.25; P.vy += ((iy ? iy * spd : 0.015) - P.vy) * 0.25;
        if (opt.zhp) P.vy = Math.min(P.vy + 0.08, 0.35);
        if (P.y + P.vy < 1.25 && !(keys.u && P.x < LAND + 1.2)) { P.y = Math.max(P.y, 1.25); if (P.vy < 0) P.vy = 0; }      // держится на поверхности
        if (keys.u && P.x < LAND + 1.2 && P.y < 1.8) { P.y = -0.01; P.x = LAND - 0.4; P.vy = 0; log("§7вылез на берег"); snd("exit", 0.5); }
      } else {
        P.vx += (ix * 0.215 - P.vx) * 0.5; P.vy = Math.min(P.vy + 0.08, 0.8);
        if (P.ground && keys.u) { P.vy = -0.42; P.ground = false; }
      }
      if (P.dead) { P.vx = 0; if (!iw) P.vy = Math.max(P.vy, 0); }
      const wasIn = iw;
      P.x = clamp(P.x + P.vx, 0.3, COLS - 0.3); P.y += P.vy;
      if (P.x >= LAND && P.x - P.vx < LAND && P.y <= 0) snd("splash", 0.6);
      const gcol = ground[clamp(Math.floor(P.x), 0, COLS - 1)];
      P.ground = false; if (P.y >= gcol) { P.y = gcol; P.vy = 0; P.ground = true; }
      if (P.x < LAND && P.y > 0) P.y = 0;
      if (!wasIn && inWater()) { snd("splash", 0.5); for (let i = 0; i < 10; i++) part.push({ x: P.x + rr(-0.5, 0.5), y: 0, vx: rr(-0.05, 0.05), vy: rr(-0.2, -0.05), l: 20, k: "drop" }); }
      if (Math.abs(ix) > 0) P.face = ix;
      P.walk += Math.hypot(P.vx, P.vy) * 3;
      if (P.hurtT) P.hurtT--; P.sinceHurt++;
      if (!P.dead && P.hp < 20 && P.sinceHurt > 80 && tick % 80 === 0) P.hp++;
      // пузыри: из баллонов (выдох раз в 1,5 с) или изо рта, когда тонешь
      if (uw && (boost ? tick % 30 < 4 : P.air < 300 && tick % 6 === 0)) part.push({ x: P.x + rr(-0.15, 0.15) - P.face * 0.1, y: eye() - 0.1, vx: 0, vy: -0.06, l: 200, k: "bub", r: rr(1.5, 3.2) });
      if (tick % 40 === 0 && uw && boost) snd(["bub1", "bub2", "bub3"][tick / 40 % 3 | 0], 0.25);
      for (const f of fish) { f.x += f.v; if (f.x < LAND + 1 || f.x > COLS - 1) f.v *= -1; f.y += Math.sin(tick / 30 + f.x) * 0.01; const dx = f.x - P.x, dy = f.y - (P.y - 0.9); if (Math.hypot(dx, dy) < 2.5) { f.v = Math.sign(dx || 1) * 0.12; } else f.v = Math.sign(f.v) * Math.min(Math.abs(f.v), 0.05); }
      for (let i = part.length - 1; i >= 0; i--) { const p = part[i]; p.x += p.vx + (p.k === "bub" ? Math.sin((tick + i) / 5) * 0.01 : 0); p.y += p.vy; if (p.k === "drop") p.vy += 0.02; if (--p.l <= 0 || (p.k === "bub" && p.y < 0)) part.splice(i, 1); }
    }
    function blk(t, bx0, by0) { x.drawImage(tx[t], 0, 0, 16, 16, Math.round((bx0 - camX) * S), Math.round((by0 - camY) * S), S, S); }
    function drawPlayer() {
      const sx = (P.x - camX) * S, sy = (P.y - camY) * S, s = 1.8, sk = tx["v/steve"];
      const swim = inWater() && Math.hypot(P.vx, P.vy) > 0.03 && !P.dead;
      const target = P.dead ? 90 : swim ? Math.atan2(P.vy, Math.abs(P.vx)) * 57.3 + 90 : 0;
      P.ang += (target - P.ang) * 0.15;
      x.save(); x.translate(sx, sy - 16 * s); x.scale(P.face, 1); x.rotate(P.ang * Math.PI / 180); x.translate(0, 16 * s);
      if (P.hurtT) x.filter = "sepia(1) saturate(6) hue-rotate(-40deg)";
      const sw = Math.sin(P.walk) * (swim ? 0.5 : 0.7);
      const part2 = (u, v, w, h, px, py, rot, ox = 0) => { x.save(); x.translate(px * s, py * s); x.rotate(rot); x.drawImage(sk, u, v, w, h, (-w / 2 + ox) * s, 0, w * s, h * s); x.restore(); };
      part2(0, 20, 4, 12, 0, -12, -sw);                                          // дальняя нога
      if (opt.wear) x.drawImage(tx.aqualung, (-9) * s, -25 * s, 9 * s, 13 * s);   // баллоны за спиной
      part2(0, 20, 4, 12, 0, -12, sw);                                           // нога
      x.drawImage(sk, 16, 20, 4, 12, -2 * s, -24 * s, 4 * s, 12 * s);             // торс сбоку
      x.drawImage(sk, 0, 8, 8, 8, -4 * s, -32 * s, 8 * s, 8 * s);                 // голова сбоку
      if (opt.wear) { x.fillStyle = "rgba(170,230,255,.55)"; x.fillRect(1.5 * s, -30 * s, 3 * s, 3 * s); x.fillStyle = "#333"; x.fillRect(4 * s, -30.5 * s, 0.7 * s, 4 * s); }  // маска
      part2(40, 20, 4, 12, 0, -24, swim ? -2.6 + sw * 0.6 : sw);                 // рука
      x.restore();
    }
    function drawHud() {
      const ic = tx["v/icons"], g = 2;
      const hx = 170, hy = H - 30;
      for (let i = 0; i < 10; i++) { const X = hx + i * 8 * g, sh = P.hp <= 4 && !P.dead ? Math.round(Math.sin(tick + i) * 1) : 0;
        x.drawImage(ic, P.hurtT ? 25 : 16, 0, 9, 9, X, hy + sh, 9 * g, 9 * g);
        const v = P.hp - i * 2; if (v >= 2) x.drawImage(ic, 52, 0, 9, 9, X, hy + sh, 9 * g, 9 * g); else if (v === 1) x.drawImage(ic, 61, 0, 9, 9, X, hy + sh, 9 * g, 9 * g); }
      if (under() || P.air < 300) { const full = Math.ceil((P.air - 2) * 10 / 300), pop = Math.ceil(P.air * 10 / 300) - full;
        for (let i = 0; i < full + pop; i++) x.drawImage(ic, i < full ? 16 : 25, 18, 9, 9, W - 170 - (i + 1) * 8 * g, hy, 9 * g, 9 * g); }
      if (opt.wear) { const p = P.A / MAX, bw = 100, by = H - 84;                         // AqualungHUD: x=10, y=h-42, 50×5 (×2)
        x.fillStyle = "rgba(0,0,0,.8)"; x.fillRect(20, by, bw, 10); x.fillStyle = airCol(p); x.fillRect(20, by, Math.round(bw * p), 10);
        x.font = "16px Tiny5, monospace"; x.fillStyle = "#3f3f3f"; const t = Math.round(p * 100) + "%"; x.fillText(t, 20 + bw + 8 + 2, by + 11); x.fillStyle = "#fff"; x.fillText(t, 20 + bw + 8, by + 9); }
      const fx = []; if (under() && opt.wear && P.A > 0) fx.push("v/nv", "v/haste");
      fx.forEach((k, i) => { const X = W - 30 - i * 30; x.fillStyle = "rgba(0,0,0,.55)"; x.fillRect(X - 2, 8, 28, 28); x.strokeStyle = "#8b8b8b"; x.strokeRect(X - 2.5, 7.5, 29, 29); x.drawImage(tx[k], X + 3, 13, 18, 18); });
    }
    function draw(now) {
      camY += (clamp(P.y - 7, -4, BOT + 1 - H / S) - camY) * 0.1; camX += (clamp(P.x - W / S / 2, 0, COLS - W / S) - camX) * 0.1;
      const t = now / 1000, nv = under() && opt.wear && P.A > 0;
      // небо + вода
      const sy0 = (0 - camY) * S;
      x.fillStyle = "#7fb8ff"; x.fillRect(0, 0, W, Math.max(0, sy0));
      const wg = x.createLinearGradient(0, sy0, 0, sy0 + BOT * S); wg.addColorStop(0, "#2a78c8"); wg.addColorStop(1, "#0a2252");
      x.fillStyle = wg; x.fillRect(0, sy0, W, H - sy0);
      // декор и блоки
      for (const d of deco) { const gy = ground[d.c];
        if (d.k === "kelp") for (let j = 1; j <= d.n; j++) { x.save(); x.translate(Math.sin(t * 1.3 + d.c + j * 0.5) * j * 0.8, 0); blk("v/kelp", d.c, gy - j); x.restore(); }
        else blk(d.k, d.c, gy - 1); }
      for (let c = Math.floor(camX); c < Math.min(COLS, camX + W / S + 1); c++) for (let r = ground[c]; r < BOT + 4; r++) { if ((r - camY) * S > H) break; blk(c === lanternCol && r === ground[c] ? "v/lantern" : r > ground[c] + 2 && ((c * 928371 + r * 12345) >>> 3) % 9 === 0 ? "v/gravel" : c < LAND ? "v/sand" : r > BOT - 2 ? "v/prismarine" : "v/sand", c, r); }
      // рыбы
      for (const f of fish) { x.save(); x.translate((f.x - camX) * S, (f.y - camY) * S); x.scale(f.v > 0 ? -1 : 1, 1); x.drawImage(tx[f.k], -14, -14, 28, 28); x.restore(); }
      drawPlayer();
      // частицы
      for (const p of part) { const X = (p.x - camX) * S, Y = (p.y - camY) * S;
        if (p.k === "bub") { x.strokeStyle = "rgba(230,250,255,.8)"; x.lineWidth = 1; x.beginPath(); x.arc(X, Y, p.r * 1.5, 0, 7); x.stroke(); }
        else { x.fillStyle = "rgba(200,235,255,.8)"; x.fillRect(X, Y, 3, 3); } }
      // толща воды: темнеет с глубиной; ночное зрение её «выключает»
      const fog = x.createLinearGradient(0, sy0, 0, sy0 + BOT * S); const k = nv ? 0.18 : 1;
      fog.addColorStop(0, `rgba(10,60,120,${0.15 * k})`); fog.addColorStop(1, `rgba(0,6,20,${0.82 * k})`);
      x.fillStyle = fog; x.fillRect(0, sy0, W, H - sy0 + 1);
      if (under()) { x.fillStyle = nv ? "rgba(120,200,255,.06)" : "rgba(0,20,60,.18)"; x.fillRect(0, 0, W, H); }
      // поверхность
      x.fillStyle = "rgba(210,245,255,.55)"; const lx = Math.max(0, (LAND - camX) * S); x.beginPath(); x.moveTo(lx, sy0);
      for (let X = lx; X <= W; X += 8) x.lineTo(X, sy0 + Math.sin((X + camX * S) / 30 + t * 2) * 2); x.lineTo(W, sy0 + 4); x.lineTo(lx, sy0 + 4); x.fill();
      if (under() && nv) { const vg = x.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.35)"); x.fillStyle = vg; x.fillRect(0, 0, W, H); }
      drawHud();
    }
    const dl = $("#simDl");
    function readout() {
      const s = `${P.A}|${P.air}|${P.ut}|${opt.wear}|${Math.round(Math.hypot(P.vx, P.vy) * 200)}|${under()}|${P.hp}`;
      if (s === lastState) return; lastState = s;
      const boost = under() && opt.wear && P.A > 0;
      K.dl(dl, [
        ["баллоны", opt.wear ? `<span style="color:${tipCol(Math.floor(P.A / 20))}">${Math.floor(P.A / 20)} сек</span> · ${P.A} тиков` : "снят"],
        ["пузыри", `${Math.max(0, P.air)} / 300 ${boost ? "· держит акваланг" : ""}`],
        ["под водой подряд", `${(P.ut / 20).toFixed(1)} с ${P.utDone ? "" : "/ 67"}`],
        ["скорость", `${(Math.hypot(P.vx, P.vy) * 20).toFixed(1)} бл/с ${boost ? "· ×2" : ""}`],
        ["здоровье", `${P.hp / 2} ❤`],
      ]);
    }
    let acc = 0, last = performance.now();
    function frame(now) {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (visible) { acc += dt * 20 * opt.speed; let n = 0; while (acc >= 1 && n < 60) { step(); acc--; n++; } if (n >= 60) acc = 0; draw(now); readout(); }
      const want = visible && under() && ZM.sfx.on();
      if (want && !ambient) { ambient = snd("under", 0.35); if (ambient) { ambient.loop = true; } } else if (!want && ambient) { ambient.pause(); ambient = null; }
    }
    new IntersectionObserver((es) => (visible = es[0].isIntersecting)).observe(cv);
    // управление
    const KM = { ArrowUp: "u", KeyW: "u", Space: "u", ArrowDown: "d", KeyS: "d", ShiftLeft: "d", ArrowLeft: "l", KeyA: "l", ArrowRight: "r", KeyD: "r" };
    addEventListener("keydown", (e) => { const k = KM[e.code]; if (!k || !visible || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return; keys[k] = 1; e.preventDefault(); });
    addEventListener("keyup", (e) => { const k = KM[e.code]; if (k) keys[k] = 0; });
    addEventListener("blur", () => Object.keys(keys).forEach((k) => (keys[k] = 0)));
    $("#pad").querySelectorAll("button").forEach((b) => {
      const on = (e) => { e.preventDefault(); keys[b.dataset.d] = 1; b.classList.add("on"); try { b.setPointerCapture(e.pointerId); } catch (_) {} };
      const off = () => { keys[b.dataset.d] = 0; b.classList.remove("on"); };
      b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("contextmenu", (e) => e.preventDefault());
    });
    const tog = (id, k, msg) => $(id).addEventListener("click", (e) => { opt[k] = !opt[k]; e.currentTarget.classList.toggle("on", opt[k]); msg && msg(opt[k]); });
    tog("#tWear", "wear", (v) => { snd("equip", 0.6); log(v ? "§7надел акваланг" : "§7снял акваланг"); });
    tog("#tVod", "vod", (v) => { ZM.sfx("enchant", 0.4); if (v) log("§bВодохлёбус: на воздухе +1 сек каждые 2 сек"); });
    tog("#tZhp", "zhp", (v) => { ZM.sfx("enchant", 0.4); if (v) log("§cЖирный пидор: тянет на дно"); });
    document.querySelectorAll("[data-sp]").forEach((b) => b.addEventListener("click", () => { opt.speed = +b.dataset.sp; document.querySelectorAll("[data-sp]").forEach((c) => c.classList.toggle("on", c === b)); }));
    document.querySelectorAll("[data-rep]").forEach((b) => b.addEventListener("click", () => {
      if (P.A >= MAX) { K.say("Баллоны и так полные"); return; }
      P.A = Math.min(MAX, P.A + Math.floor(MAX / 4)); ZM.sfx("anvil", 0.35); log(`§7наковальня: +25% воздуха (${Math.floor(P.A / 20)} сек)`);
    }));
    $("#drain").addEventListener("click", () => { P.A = 0; log("§eвоздух слит"); snd("fizz", 0.4); });
    $("#respawn").addEventListener("click", () => { Object.assign(P, { x: 3, y: 0, vx: 0, vy: 0, hp: 20, air: 300, dead: false, ut: 0, ang: 0 }); $("#dead").hidden = true; ZM.sfx("click"); });
    log("§7Акваланг надет. Нырни вправо →");
    return { frame, set(a) { P.A = a; } };
  })();

  /* ================= 04 воздух ================= */
  const mR = $("#mR");
  function mUpd() { const v = +mR.value, p = v / MAX; $("#mBar").style.width = p * 100 + "%"; $("#mBar").style.background = airCol(p); $("#mPct").textContent = Math.round(p * 100) + "%"; $("#mTip").innerHTML = tipHtml(v); }
  mR.addEventListener("input", mUpd); mUpd();
  const CMP = [
    { i: T("v/breath"), t: "Просто нырнуть", s: 15, d: "300 тиков пузырей", c: "#8fb3c9" },
    { i: T("i/turtle_helmet"), t: "Черепаший панцирь", s: 25, d: "+10 сек Подводного дыхания", c: "#55c86a" },
    { i: T("v/breath"), t: "Зелье подводного дыхания", s: 180, d: "3:00 · удлинённое 8:00", c: "#2e5299" },
    { i: T("aqualung"), t: "Акваланг", s: 382, d: "367 сек баллонов + 15 сек своих пузырей", c: "#ffc90e", me: 1 },
    { i: T("v/breath"), t: "Удлинённое зелье", s: 480, d: "но без ×2 к скорости и Спешки", c: "#3f6bd1" },
  ];
  $("#cmp").innerHTML = CMP.map((c) => `<div class="aq-bar ${c.me ? "me" : ""}" style="--c:${c.c}"><img src="${c.i}" alt=""><div><b>${esc(c.t)}<span>${c.s >= 60 ? Math.floor(c.s / 60) + ":" + K.pad2(c.s % 60) : c.s + " с"}</span></b><i><em data-w="${(c.s / 480) * 100}"></em></i><small>${esc(c.d)}</small></div></div>`).join("")
    + `<small>С Водохлёбусом баллоны сами добирают воздух на берегу — бесконечно, если не жадничать.</small>`;
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { $("#cmp").querySelectorAll("em").forEach((e) => (e.style.width = e.dataset.w + "%")); o.disconnect(); } }, { threshold: 0.3 }).observe($("#cmp"));

  /* ================= 05 броня: формула урона 1.19.2 ================= */
  (function armor() {
    const CH = [
      { k: "none", t: "Без нагрудника", d: 0, g: 0, kb: 0 },
      { k: "leather_chestplate", t: "Кожаный", d: 3, g: 0, kb: 0, cls: "lth" },
      { k: "golden_chestplate", t: "Золотой", d: 5, g: 0, kb: 0 },
      { k: "chainmail_chestplate", t: "Кольчужный", d: 5, g: 0, kb: 0 },
      { k: "iron_chestplate", t: "Железный", d: 6, g: 0, kb: 0 },
      { k: "diamond_chestplate", t: "Алмазный", d: 8, g: 2, kb: 0 },
      { k: "netherite_chestplate", t: "Незеритовый", d: 8, g: 3, kb: 0.1 },
      { k: "aqualung", t: "Акваланг", d: 10, g: 4, kb: 0.1, me: 1 },
    ];
    const SETS = [["none", "ничего", 0, 0, 0], ["iron", "железо", 9, 0, 0], ["diamond", "алмаз", 12, 6, 0], ["netherite", "незерит", 12, 9, 0.3]];
    const PRE = [[4, "Зомби"], [7, "Утопленник с трезубцем"], [9, "Страж (шипы не в счёт)"], [22, "Разрушитель"], [30, "Варден, ближний бой"]];
    let set = 0;
    $("#aSet").innerHTML = SETS.map((x, i) => `<button type="button" class="${i ? "" : "on"}" data-i="${i}">${x[1]}</button>`).join("");
    $("#aPre").innerHTML = PRE.map(([d, t]) => `<button type="button" data-d="${d}">${esc(t)} · ${d}</button>`).join("");
    const red = (dmg, def, tg) => { const f = 2 + tg / 4, a = Math.min(20, Math.max(def / 5, def - dmg / f)); return dmg * (1 - a / 25); };
    const icon = (c) => c.k === "none" ? `<span class="aq-none">—</span>` : `<img class="${c.cls || ""}" src="${c.k === "aqualung" ? T("aqualung") : T("i/" + c.k)}" alt="">`;
    function upd() {
      const dmg = +$("#aR").value, S = SETS[set];
      $("#aDmg").textContent = dmg; $("#aDmgH").textContent = `= ${dmg / 2} ♥`;
      const rows = CH.map((c) => ({ c, def: c.d + S[2], tg: c.g + S[3], kb: c.kb + S[4] })).map((r) => Object.assign(r, { got: red(dmg, r.def, r.tg) }));
      const worst = rows[0].got;
      $("#aTbl").innerHTML = `<div class="aq-row h"><span></span><span>нагрудник</span><span>броня</span><span>твёрд.</span><span>получишь</span><span>срезано</span></div>` + rows.map((r) => {
        const cut = worst ? (1 - r.got / worst) : 0;
        return `<div class="aq-row ${r.c.me ? "me" : ""}"><span>${icon(r.c)}</span><span>${esc(r.c.t)}</span><span>${r.def}</span><span>${r.tg}</span><span><b>${r.got.toFixed(2)}</b><i style="width:${(r.got / dmg) * 100}%"></i></span><span>${Math.round((1 - r.got / dmg) * 100)}%</span></div>`;
      }).join("");
      const a = rows[7].got, n = rows[6].got;
      $("#aNote").innerHTML = `Против незеритового нагрудника акваланг снимает ещё <b>${(n - a).toFixed(2)}</b> урона с каждого такого удара. Отбрасывание в сумме режется на ${Math.round(rows[7].kb * 100)}%.`;
    }
    $("#aR").addEventListener("input", upd);
    $("#aSet").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; set = +b.dataset.i; $$("#aSet button").forEach((x) => x.classList.toggle("on", x === b)); ZM.sfx("click", 0.4); upd(); });
    $("#aPre").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; $("#aR").value = b.dataset.d; ZM.sfx("hit", 0.4); upd(); });
    upd();
  })();

  /* ================= 06 тонкости: копание под водой и детали ================= */
  (function fine() {
    const TOOLS = [["hand", "рука", 1, false], ["iron_pickaxe", "железная", 6, true], ["diamond_pickaxe", "алмазная", 8, true]];
    const MODES = [["land", "на суше"], ["floor", "под водой, на дне"], ["swim", "под водой, вплавь"]];
    let tool = 1, mode = 1;
    $("#dTool").innerHTML = TOOLS.map((x, i) => `<button type="button" class="${i === tool ? "on" : ""}" data-i="${i}">${x[0] === "hand" ? "" : `<img src="${T("i/" + x[0])}" alt="">`}${x[1]}</button>`).join("");
    $("#dMode").innerHTML = MODES.map((x, i) => `<button type="button" class="${i === mode ? "on" : ""}" data-i="${i}">${x[1]}</button>`).join("");
    // время разрушения камня (прочность 1.5): скорость / прочность / 30 (или /100, если инструмент не подходит) за тик
    const ticks = (sp, ok) => { const per = sp / 1.5 / (ok ? 30 : 100); return per >= 1 ? 0 : Math.ceil(1 / per); };
    function upd() {
      const [, , base, ok] = TOOLS[tool], m = MODES[mode][0];
      const pen = m === "land" ? 1 : m === "floor" ? 0.2 : 0.04;
      const V = [
        ["Без акваланга", base * pen],
        ["С аквалангом (Спешка I)", base * pen * (m === "land" ? 1 : 1.2)],
        ["Акваланг + Подводник", base * (m === "swim" ? 0.2 : 1) * (m === "land" ? 1 : 1.2)],
      ].map(([t, sp]) => [t, ticks(sp, ok)]);
      const mx = Math.max(...V.map((v) => v[1]));
      $("#dRes").innerHTML = V.map(([t, k]) => `<div><span>${t}</span><i><em style="width:${(k / mx) * 100}%"></em></i><b>${(k / 20).toFixed(2)} с</b></div>`).join("")
        + `<small>${m === "land" ? "На суше Спешки нет: эффект даётся только под водой, пока в баллонах есть воздух." : "Каменный блок, прочность 1.5. Спешка работает только пока баллоны не пусты."}</small>`;
    }
    $("#dTool").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; tool = +b.dataset.i; $$("#dTool button").forEach((x) => x.classList.toggle("on", x === b)); ZM.sfx("stone", 0.4); upd(); });
    $("#dMode").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; mode = +b.dataset.i; $$("#dMode button").forEach((x) => x.classList.toggle("on", x === b)); ZM.sfx("click", 0.4); upd(); });
    upd();
    const F = [
      ["i/trident", "Удары пьют воздух", "Воздух хранится в прочности, а броня тратит прочность при каждом ударе: минимум 1 тик, а с сильных ударов по тику за каждые 4 урона. Разрушитель за удар срежет пять тиков воздуха. Мелочь, но баллоны от драки пустеют."],
      ["v/breath", "Свои пузыри ждут", "Пока в баллонах есть воздух, игра каждый тик доливает тебе полные пузыри. Твои собственные 15 секунд пойдут в дело, только когда баллоны опустеют."],
      ["i/iron_chestplate", "Пустой душит на суше", "Если воздух кончился, на берегу акваланг бьёт на 1 сердце в секунду, пока его не снимешь. Урон засчитывается как утопление, поэтому ачивку «утонуть» можно получить, не заходя в воду."],
      ["i/potion", "Эффекты гаснут за полсекунды", "Ночное зрение и Спешку акваланг выдаёт на 10 тиков и продлевает каждый тик. Вынырнул — Спешка снимается сразу, ночное зрение догорает ещё полсекунды."],
      ["i/kelp", "67 секунд без передышки", "Счётчик ачивки идёт только непрерывно: 1340 тиков под водой подряд. Хватит одного вдоха над поверхностью, и отсчёт начнётся с нуля."],
      ["i/copper_ingot", "Медь — самая дешёвая заправка", "На наковальне любой из трёх материалов (железо, медь, ракушка) возвращает четверть баллона: 1835 тиков, то есть 91 секунду. Четыре медных слитка заправят баллоны досуха."],
      ["i/anvil", "Два в один", "Два акваланга в сетке крафта склеятся в один с суммой воздуха и бонусом 5%, но все чары пропадут. На наковальне бонус 12%, а чары сохранятся."],
      ["i/enchanted_book", "Любит чары", "Зачаровываемость 18: выше, чем у незерита (15) и алмаза (10). Столу зачарований он нравится почти как золото, так что хорошие чары выпадают чаще."],
    ];
    $("#fine").innerHTML = F.map(([i, t, d]) => `<article class="aq-fc pnl"><img src="${T(i)}" alt=""><b>${esc(t)}</b><p>${esc(d)}</p></article>`).join("");
  })();

  /* ================= 08 ачивки / 09 история / финал ================= */
  adv = K.adv({ list: ZM.P14.advancements, store: "p14.adv", icon: (a) => T("i/" + a.icon), chatSel: "#simLog", intro: "Три штуки: скрафтить, выдержать 67 секунд под водой и позорно утонуть." });
  K.timeline($("#tl"), [
    { date: "22.04.2026", t: "Акваланг", d: "Баллоны на спину, воздух под водой, свой HUD и три ачивки.", c: "#ffc90e" },
    { ver: "1.0.5", date: "02.07.2026", t: "Реворк работы акваланга", d: "Воздух переехал прямо в прочность предмета, старые баллоны перенеслись сами. Поношенный нагрудник теперь даёт неполный акваланг.", c: "#5fd8ff" },
    { ver: "1.1.0", date: "18.07.2026", t: "Энчант-апдейт", d: "Свои книги: Водохлёбус набирает воздух на берегу, проклятие Жирный пидор тянет на дно.", c: "#ff5555" },
  ]);
  K.finNav(14, $("#finNav"));
  $("#surf").addEventListener("click", () => { snd("splash", 0.8); for (let i = 0; i < 6; i++) setTimeout(() => burst(rr(0.2, 0.8), 1, 20, 1.5), i * 120); $("#finP").textContent = "Вдох."; scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });

  /* ================= цикл ================= */
  let lastT = performance.now();
  function loop(now) { const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; bgDraw(now); hero && hero(dt, now); sim.frame(now); requestAnimationFrame(loop); }
  onScroll(); requestAnimationFrame(loop);
  ZM.reveal && ZM.reveal();
})();
