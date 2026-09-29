/* №13 · 3D-принтер
   Всё рисуется кодом: чертёжный фон, печать в hero, студия на воксельном движке (shared/voxel.js),
   формат чертежей .zlp (текстовый, можно слать куда угодно), барахолка чертежей. */
(function () {
  const { $, $$, esc, store: S } = ZM;
  const U = ZM.url, P = ZM.P13, AT = ZM.VOX_ATLAS, VX = window.ZMVox;
  const B = AT.blocks, KEY = {}; B.forEach((b, i) => { if (b) KEY[b.key] = i; });
  const T = (n) => U(`assets/textures/p13/${n}.png`);
  const pad2 = (n) => String(n).padStart(2, "0");
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; };
  const MC = { 0: "#000", 1: "#0000AA", 2: "#00AA00", 3: "#00AAAA", 4: "#AA0000", 5: "#AA00AA", 6: "#FFAA00", 7: "#AAAAAA", 8: "#555555", 9: "#5555FF", a: "#55FF55", b: "#55FFFF", c: "#FF5555", d: "#FF55FF", e: "#FFFF55", f: "#FFFFFF" };
  const GL_OK = VX && VX.supported();

  ZM.topbar({ crumb: "№13 · 3D-принтер", ...ZM.pointNav(13) });

  /* ---------------- звук ---------------- */
  const sndPool = {};
  function snd(name, vol = 0.5, rate = 1) {
    if (!ZM.sfx.on()) return;
    const url = U(`assets/sounds/p13/${name}.ogg`);
    try { const a = (sndPool[url] || (sndPool[url] = new Audio(url))).cloneNode(); a.volume = Math.min(1, vol * 0.45); a.playbackRate = rate; a.preservesPitch = false; a.play().catch(() => {}); ZM.lastSound = performance.now(); } catch (e) {}
  }
  const drawSnd = () => snd("drawmap" + (1 + ((Math.random() * 3) | 0)), 0.8, 0.95 + Math.random() * 0.1);
  const blockSnd = (id, vol = 0.5) => {
    const k = (B[id] && B[id].key) || "";
    const kind = /planks|log|bookshelf|crafting|stem|pumpkin|melon|jack/.test(k) ? "wood" : /leaves|wool|hay|wart|grass|dirt|sand|gravel|soul/.test(k) ? "cloth" : "stone";
    ZM.sfx(kind, vol, 0.9 + Math.random() * 0.2);
  };

  let toastTm = 0;
  function say(t, bad) { const el = $("#p3toast"); el.textContent = t; el.className = "p3-toast on" + (bad ? " bad" : ""); clearTimeout(toastTm); toastTm = setTimeout(() => el.classList.remove("on"), 2600); }

  /* ================= иконки блоков (изометрия из атласа) ================= */
  const atlasImg = new Image(); atlasImg.src = AT.uri;
  const iconCache = {};
  function isoIcon(id, s = 32) {
    const key = id + ":" + s; if (iconCache[key]) return iconCache[key];
    const b = B[id]; if (!b || !atlasImg.complete) return "";
    const c = document.createElement("canvas"); c.width = c.height = s; const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    const cols = AT.size / AT.tile, t = AT.tile;
    const face = (tile, m, shade) => {
      g.setTransform(...m); g.drawImage(atlasImg, (tile % cols) * t, ((tile / cols) | 0) * t, t, t, 0, 0, t, t);
      if (shade) { g.globalCompositeOperation = "source-atop"; g.fillStyle = `rgba(0,0,0,${shade})`; g.fillRect(0, 0, t, t); g.globalCompositeOperation = "source-over"; }
    };
    const k = s / t;
    face(b.t[0], [(k / 2), -(k / 4), (k / 2), (k / 4), 0, s / 4], 0);
    face(b.t[1], [(k / 2), (k / 4), 0, (k / 2), 0, s / 4], 0.22);
    face(b.t[1], [(k / 2), -(k / 4), 0, (k / 2), s / 2, s / 2], 0.42);
    return (iconCache[key] = c.toDataURL());
  }

  /* ================= мир, пресеты ================= */
  const mkWorld = (sx, sy, sz) => ({ sx, sy, sz, data: new Uint8Array(sx * sy * sz) });
  const idx = (w, x, y, z) => x + z * w.sx + y * w.sx * w.sz;
  const setB = (w, x, y, z, k) => { if (x < 0 || y < 0 || z < 0 || x >= w.sx || y >= w.sy || z >= w.sz) return; w.data[idx(w, x, y, z)] = typeof k === "number" ? k : KEY[k] || 0; };
  const getB = (w, x, y, z) => (x < 0 || y < 0 || z < 0 || x >= w.sx || y >= w.sy || z >= w.sz ? 0 : w.data[idx(w, x, y, z)]);
  const count = (w) => { let n = 0; for (const v of w.data) if (v) n++; return n; };
  const box = (w, x0, y0, z0, x1, y1, z1, k, hollow) => { for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { if (hollow && x > x0 && x < x1 && z > z0 && z < z1) continue; setB(w, x, y, z, k); } };

  const PRESETS = [
    { id: "house", name: "Домик у дороги", desc: "Булыжный фундамент, дубовый каркас, окна и труба. Классика первой ночи.", ts: "2026-04-26", likes: 41,
      make() { const w = mkWorld(9, 9, 9);
        box(w, 0, 0, 0, 8, 0, 8, "cobblestone");
        box(w, 1, 1, 1, 7, 4, 7, "oak_planks", true);
        for (const [x, z] of [[1, 1], [7, 1], [1, 7], [7, 7]]) box(w, x, 1, z, x, 4, z, "oak_log");
        box(w, 4, 1, 1, 4, 2, 1, 0); setB(w, 2, 3, 1, "glass"); setB(w, 6, 3, 1, "glass"); setB(w, 1, 3, 4, "glass"); setB(w, 7, 3, 4, "glass"); setB(w, 4, 3, 7, "glass");
        for (let i = 0; i < 4; i++) box(w, i, 5 + i, i, 8 - i, 5 + i, 8 - i, i % 2 ? "spruce_planks" : "bricks", true);
        box(w, 4, 8, 4, 4, 8, 4, "bricks"); box(w, 6, 5, 6, 6, 8, 6, "bricks"); setB(w, 4, 1, 4, "crafting_table"); setB(w, 6, 1, 6, "furnace"); setB(w, 2, 1, 6, "bookshelf");
        return w; } },
    { id: "oak", name: "Дуб-переросток", desc: "Ствол, крона и немного лишней листвы. Печатается дольше, чем растёт.", ts: "2026-04-27", likes: 18,
      make() { const w = mkWorld(9, 11, 9);
        box(w, 0, 0, 0, 8, 0, 8, "grass_block"); box(w, 4, 1, 4, 4, 7, 4, "oak_log");
        for (let y = 5; y <= 9; y++) { const r = y >= 8 ? 1 : y === 5 ? 2 : 3; for (let z = 4 - r; z <= 4 + r; z++) for (let x = 4 - r; x <= 4 + r; x++) { if (Math.abs(x - 4) === r && Math.abs(z - 4) === r && y !== 7) continue; if (!getB(w, x, y, z)) setB(w, x, y, z, "oak_leaves"); } }
        setB(w, 4, 10, 4, "oak_leaves"); setB(w, 2, 1, 6, "pumpkin"); setB(w, 6, 1, 2, "hay_block");
        return w; } },
    { id: "creeper", name: "Статуя Крипера", desc: "Во весь рост, из бетона. Не взрывается, честно.", ts: "2026-04-29", likes: 67,
      make() { const w = mkWorld(8, 12, 8); const g = (x, y, z) => setB(w, x, y, z, (x * 7 + y * 3 + z * 5) % 4 ? "lime_concrete" : "green_concrete");
        box(w, 0, 0, 0, 7, 0, 7, "smooth_stone");
        for (let y = 1; y <= 2; y++) for (const [x0, z0] of [[2, 1], [4, 1], [2, 5], [4, 5]]) for (let z = z0; z < z0 + 2; z++) for (let x = x0; x < x0 + 2; x++) g(x, y, z);
        for (let y = 3; y <= 7; y++) for (let z = 3; z <= 4; z++) for (let x = 2; x <= 5; x++) g(x, y, z);
        for (let y = 8; y <= 11; y++) for (let z = 2; z <= 5; z++) for (let x = 2; x <= 5; x++) g(x, y, z);
        for (const [x, y] of [[2, 10], [5, 10], [3, 9], [4, 9], [3, 8], [2, 8], [5, 8]]) setB(w, x, y, 2, "black_concrete");
        return w; } },
    { id: "leet", name: "1337", desc: "Цифроблоками на каменном постаменте. Кто знает, тот знает.", ts: "2026-05-01", likes: 133,
      make() { const w = mkWorld(12, 5, 5);
        box(w, 0, 0, 0, 11, 0, 4, "stone_bricks"); box(w, 1, 1, 1, 10, 1, 3, "polished_blackstone_bricks");
        ["zitraksmode:one", "zitraksmode:three", "zitraksmode:three", "zitraksmode:seven"].forEach((k, i) => { setB(w, 3 + i * 2, 2, 2, k); setB(w, 3 + i * 2, 1, 2, "gold_block"); });
        setB(w, 0, 1, 0, "sea_lantern"); setB(w, 11, 1, 0, "sea_lantern"); setB(w, 0, 1, 4, "sea_lantern"); setB(w, 11, 1, 4, "sea_lantern");
        return w; } },
    { id: "portal", name: "Портал в Незер", desc: "Рамка из обсидиана на кусочке ада. Зажигалка в комплект не входит.", ts: "2026-05-03", likes: 29,
      make() { const w = mkWorld(8, 8, 5);
        box(w, 0, 0, 0, 7, 0, 4, "netherrack"); setB(w, 1, 0, 1, "soul_sand"); setB(w, 6, 0, 3, "soul_sand"); setB(w, 0, 0, 4, "glowstone");
        box(w, 2, 1, 2, 5, 1, 2, "obsidian"); box(w, 2, 6, 2, 5, 6, 2, "obsidian"); box(w, 2, 1, 2, 2, 6, 2, "obsidian"); box(w, 5, 1, 2, 5, 6, 2, "obsidian");
        setB(w, 5, 6, 2, "crying_obsidian"); setB(w, 2, 3, 2, "crying_obsidian"); box(w, 6, 1, 3, 6, 2, 3, "netherrack"); setB(w, 1, 1, 3, "magma" in KEY ? "magma" : "nether_wart_block");
        return w; } },
    { id: "lighthouse", name: "Маяк", desc: "Кирпич, кварц и морской фонарь наверху. Видно с другого конца карты.", ts: "2026-05-06", likes: 22,
      make() { const w = mkWorld(7, 14, 7);
        box(w, 0, 0, 0, 6, 0, 6, "sand"); box(w, 1, 1, 1, 5, 1, 5, "stone_bricks");
        for (let y = 2; y <= 10; y++) box(w, 2, y, 2, 4, y, 4, (y >> 1) % 2 ? "red_concrete" : "white_concrete", true);
        box(w, 1, 11, 1, 5, 11, 5, "quartz_block"); box(w, 2, 12, 2, 4, 12, 4, "glass", true); setB(w, 3, 12, 3, "sea_lantern"); box(w, 2, 13, 2, 4, 13, 4, "quartz_block");
        return w; } },
  ];

  /* ================= формат .zlp =================
     ZLP1                                  ← сигнатура
     {"v":1,"n":…,"a":…,"s":[x,y,z],"p":[…]} ← заголовок: имя, автор, размер, палитра
     <base64>                              ← блоки: пары (сколько подряд, номер в палитре), 0 = воздух
     порядок: x быстрее всего, потом z, потом y — ровно в этом порядке принтер и печатает */
  const b64 = { enc(bytes) { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }, dec(str) { const s = atob(str), b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; } };
  const ZLP = {
    encode(w, meta = {}) {
      const pal = [], map = {}, rle = [];
      for (let i = 0; i < w.data.length;) {
        const v = w.data[i]; let n = 1; while (n < 255 && i + n < w.data.length && w.data[i + n] === v) n++;
        let pi = 0; if (v) { if (!(v in map)) { pal.push(B[v].key.includes(":") ? B[v].key : "minecraft:" + B[v].key); map[v] = pal.length; } pi = map[v]; }
        rle.push(n, pi); i += n;
      }
      const head = { v: 1, n: meta.name || "Без названия", a: meta.author || ZM.profile.me().nick, s: [w.sx, w.sy, w.sz], p: pal, c: count(w), t: meta.t || Date.now() };
      if (meta.desc) head.d = meta.desc;
      return "ZLP1\n" + JSON.stringify(head) + "\n" + b64.enc(new Uint8Array(rle)) + "\n";
    },
    decode(text) {
      text = String(text || "").trim();
      if (!text.startsWith("ZLP1")) { try { text = new TextDecoder().decode(b64.dec(text.replace(/-/g, "+").replace(/_/g, "/"))).trim(); } catch (e) {} }
      const lines = text.split(/\r?\n/);
      if (lines[0].trim() !== "ZLP1") throw new Error("это не чертёж .zlp");
      const h = JSON.parse(lines[1]); const [sx, sy, sz] = h.s || [];
      if (!(sx > 0 && sy > 0 && sz > 0) || sx * sy * sz > 64 * 64 * 64) throw new Error("странный размер чертежа");
      const ids = (h.p || []).map((k) => KEY[k.replace(/^minecraft:/, "")] || KEY[k] || 0), miss = (h.p || []).filter((k, i) => !ids[i]);
      const w = mkWorld(sx, sy, sz), rle = b64.dec((lines[2] || "").trim()); let o = 0;
      for (let i = 0; i + 1 < rle.length; i += 2) { const n = rle[i], v = rle[i + 1] ? ids[rle[i + 1] - 1] || KEY.stone : 0; w.data.fill(v, o, Math.min(w.data.length, o + n)); o += n; }
      return { w, h, miss };
    },
    link(text) { const u = b64.enc(new TextEncoder().encode(text)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); return location.href.split("#")[0] + "#zlp=" + u; },
    file(text, name) {
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
      a.download = (name || "chertezh").replace(/[^\wа-яё-]+/gi, "_").slice(0, 40) + ".zlp"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    },
  };
  ZM.ZLP = ZLP;

  /* ================= ачивки (ветка страницы) ================= */
  const ADV = P.advancements, AK = "p13.sadv";
  let got = S.get(AK, []).filter((k) => ADV.some((a) => a.key === k)), advSel = null;
  const advIc = (a) => T(a.icon);
  const titleH = (a) => `<span style="color:${MC[a.color] || "#fff"}">${esc(a.title)}</span>`;
  function grant(key) {
    if (got.includes(key)) return; const a = ADV.find((x) => x.key === key); if (!a) return;
    got.push(key); S.set(AK, got); advSel = key;
    ZM.toast({ iconHtml: `<img src="${advIc(a)}" alt="" style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated">`, title: titleH(a), frame: a.frame });
    renderAdv(key);
  }
  const FRAME_RU = { task: "Достижение", goal: "Цель", challenge: "Испытание" };
  function renderAdv(pulse) {
    const vis = ADV.filter((a) => got.includes(a.key)), hidden = ADV.length - vis.length;
    if (!advSel || !vis.some((a) => a.key === advSel)) advSel = vis.length ? vis[vis.length - 1].key : null;
    const icon = (a, px) => `<span class="ic" style="width:${px}px;height:${px}px"><img src="${advIc(a)}" alt=""></span>`;
    let html = vis.map((a, i) => (i ? `<div class="adv-link on"></div>` : "") + `<button type="button" class="adv-node ${pulse === a.key ? "pulse" : ""} ${advSel === a.key ? "sel" : ""}" data-k="${a.key}" aria-label="${esc(a.title)}"><span class="adv-frame ${a.frame}"></span>${icon(a, 32)}</button>`).join("");
    if (hidden) html += vis.length ? `<div class="adv-link"></div><div class="adv-more">+${hidden} скрыто</div>` : `<div class="adv-node"><span class="adv-frame task locked"></span><span class="q">?</span></div><div class="adv-link"></div><div class="adv-more">+${hidden} скрыто</div>`;
    $("#advChain").innerHTML = html;
    const a = ADV.find((x) => x.key === advSel);
    $("#advDetail").innerHTML = a
      ? `<div class="big"><span class="adv-frame ${a.frame}"></span>${icon(a, 38)}</div><div class="txt"><div class="tt">${titleH(a)}</div><div class="dd">${esc(a.desc)}</div><div class="cc">${esc(a.how)}</div></div><div class="meta"><span>${FRAME_RU[a.frame]}</span>${a.xp ? `<span>+${a.xp} XP</span>` : ""}</div>`
      : `<div class="big"><span class="adv-frame task locked"></span><span class="q">?</span></div><div class="txt"><div class="tt">Скрыто</div><div class="dd">Все ачивки скрыты. Начни со студии: сохрани любой чертёж.</div></div>`;
    $("#advList").innerHTML = ADV.map((x) => got.includes(x.key)
      ? `<button type="button" class="adv-row has" data-k="${x.key}"><span class="fr"><span class="adv-frame ${x.frame}"></span>${icon(x, 26)}</span><span><span class="t">${titleH(x)}</span><span class="d">${esc(x.desc)}</span></span></button>`
      : `<div class="adv-row locked"><span class="fr"><span class="adv-frame task locked"></span><span class="q">?</span></span><span><span class="t">???</span><span class="d">скрытое достижение: откроется, когда получишь</span></span></div>`).join("");
    const done = vis.length;
    $("#advBar").style.width = (done / ADV.length) * 100 + "%";
    $("#advTxt").textContent = `${done} / ${ADV.length}`;
    $("#stGot").textContent = `${done}/${ADV.length}`;
  }
  $("#advQ").textContent = ADV.length + " " + plural(ADV.length, "ачивка", "ачивки", "ачивок");
  const pickAdv = (e) => { const n = e.target.closest("[data-k]"); if (!n) return; advSel = n.dataset.k; renderAdv(); };
  $("#advChain").addEventListener("click", pickAdv); $("#advList").addEventListener("click", pickAdv);
  $("#advReset").addEventListener("click", () => { got = []; S.set(AK, got); advSel = null; renderAdv(); });
  renderAdv();

  /* ================= фон: чертёжная сетка + плоттер ================= */
  (function bg() {
    const cv = $("#bg"), g = cv.getContext("2d"); let W = 0, H = 0, dpr = 1, jobs = [], t0 = performance.now();
    const rs = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; };
    rs(); addEventListener("resize", rs);
    const iso = (x, y, z, s, ox, oy) => [ox + (x - z) * s * 0.866, oy + (x + z) * s * 0.5 - y * s];
    function newJob() {
      const s = 14 + Math.random() * 16, ox = Math.random() * W, oy = H * (0.2 + Math.random() * 0.7), segs = [];
      const n = 2 + ((Math.random() * 4) | 0), cubes = [];
      for (let i = 0; i < n; i++) cubes.push([(Math.random() * 3) | 0, i ? (Math.random() * 2) | 0 : 0, (Math.random() * 3) | 0, 1 + ((Math.random() * 2) | 0)]);
      for (const [x, y, z, h] of cubes) {
        const P = (a, b, c) => iso(x + a, y + b, z + c, s, ox, oy);
        const e = [[0, 0, 0, 1, 0, 0], [1, 0, 0, 1, 0, 1], [1, 0, 1, 0, 0, 1], [0, 0, 1, 0, 0, 0], [0, h, 0, 1, h, 0], [1, h, 0, 1, h, 1], [1, h, 1, 0, h, 1], [0, h, 1, 0, h, 0], [0, 0, 0, 0, h, 0], [1, 0, 0, 1, h, 0], [1, 0, 1, 1, h, 1], [0, 0, 1, 0, h, 1]];
        for (const q of e) segs.push([...P(q[0], q[1], q[2]), ...P(q[3], q[4], q[5])]);
      }
      // размерная линия
      const a = iso(0, 0, 3.6, s, ox, oy), b = iso(3, 0, 3.6, s, ox, oy);
      return { segs, dim: [a, b, (3 * 16) + "px"], p: 0, life: 0, fade: 1 };
    }
    for (let i = 0; i < 3; i++) jobs.push(newJob());
    let last = performance.now();
    function frame(t) {
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, (t - last) / 1000); last = t; if (document.hidden) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      // сетка
      const off = ((t - t0) / 1000 * 4) % 24;
      g.lineWidth = 1;
      g.strokeStyle = "rgba(90,170,230,.07)"; g.beginPath();
      for (let x = -off; x < W; x += 24) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); } for (let y = -off; y < H; y += 24) { g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); } g.stroke();
      g.strokeStyle = "rgba(90,170,230,.14)"; g.beginPath();
      for (let x = -off; x < W; x += 120) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); } for (let y = -off; y < H; y += 120) { g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); } g.stroke();
      // плоттер
      for (const j of jobs) {
        j.p += dt * 7; const n = j.segs.length;
        if (j.p > n + 6) j.fade -= dt * 0.5;
        g.globalAlpha = Math.max(0, j.fade) * 0.55; g.strokeStyle = "#5cc8ff"; g.lineWidth = 1.2; g.beginPath();
        let pen = null;
        for (let i = 0; i < Math.min(n, j.p); i++) { const s = j.segs[i], f = Math.min(1, j.p - i); g.moveTo(s[0], s[1]); const x = s[0] + (s[2] - s[0]) * f, y = s[1] + (s[3] - s[1]) * f; g.lineTo(x, y); if (f < 1) pen = [x, y]; }
        g.stroke();
        if (pen) { g.fillStyle = "#ffb000"; g.beginPath(); g.arc(pen[0], pen[1], 2.4, 0, 7); g.fill(); g.fillStyle = "rgba(255,176,0,.25)"; g.beginPath(); g.arc(pen[0], pen[1], 7, 0, 7); g.fill(); }
        if (j.p > n) { const [a, b, lbl] = j.dim; g.strokeStyle = "rgba(92,200,255,.6)"; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.fillStyle = "rgba(160,220,255,.7)"; g.font = "10px JetBrains Mono, monospace"; g.fillText(lbl, (a[0] + b[0]) / 2 + 4, (a[1] + b[1]) / 2 + 12); }
        g.globalAlpha = 1;
      }
      jobs = jobs.filter((j) => j.fade > 0); while (jobs.length < (W < 700 ? 2 : 4)) jobs.push(newJob());
    }
    requestAnimationFrame(frame);
    // перекрестие CAD за мышью
    const cr = $("#cross"), ct = $("#crossTxt");
    addEventListener("pointermove", (e) => { if (e.pointerType !== "mouse") return; cr.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; ct.textContent = `X ${String(Math.round(e.clientX / 16)).padStart(3, "0")} · Y ${String(Math.round((e.clientY + scrollY) / 16)).padStart(4, "0")}`; cr.classList.add("on"); }, { passive: true });
    document.addEventListener("pointerleave", () => cr.classList.remove("on"));
  })();

  /* ================= печатающая голова (общая для hero и студии) ================= */
  function printer(eng, opt = {}) {
    const st = { on: false, k: 0, speed: opt.speed || 14, total: 0, lastSnd: 0, w: null, done: null, maxY: 1 };
    st.start = (w, done) => {
      st.w = w; eng.world = w; eng.rebuild(true); st.total = eng.order.length; st.k = 0; st.on = true; st.done = done;
      st.maxY = eng.order.length ? eng.order[eng.order.length - 1][1] + 1 : 1; eng.drawBlocks = 0;
    };
    st.stop = (finish) => { st.on = false; eng.drawBlocks = Infinity; if (finish) st.k = st.total; eng.setBoxes(opt.extra ? opt.extra() : []); if (st.w) { eng.world = st.w; eng.rebuild(false); } };
    st.tick = (dt) => {
      if (!st.on) return;
      const before = Math.floor(st.k); st.k = Math.min(st.total, st.k + dt * st.speed); const now = Math.floor(st.k);
      eng.drawBlocks = st.k;
      if (opt.sound && now > before && performance.now() - st.lastSnd > 110) { st.lastSnd = performance.now(); const o = eng.order[now - 1]; o && blockSnd(getB(st.w, o[0], o[1], o[2]), 0.28); }
      const o = eng.order[Math.min(st.total - 1, now)] || [0, 0, 0], w = st.w;
      // сопло и портал
      const fx = o[0] + 0.5, fy = o[1] + 1, fz = o[2] + 0.5, top = w.sy + 0.6;
      const boxes = [
        { min: [fx - 0.28, fy + 0.25, fz - 0.28], max: [fx + 0.28, fy + 0.75, fz + 0.28], c: [1, 0.62, 0.1, 1] },
        { min: [fx - 0.08, fy + 0.02, fz - 0.08], max: [fx + 0.08, fy + 0.25, fz + 0.08], c: [1, 0.85, 0.3, 1] },
        { min: [fx - 0.06, fy + 0.75, fz - 0.06], max: [fx + 0.06, top, fz + 0.06], c: [0.75, 0.8, 0.86, 0.9] },
        { min: [-0.3, top, fz - 0.07], max: [w.sx + 0.3, top + 0.12, fz + 0.07], c: [0.8, 0.84, 0.9, 1] },
        { min: [-0.42, top - 0.02, -0.3], max: [-0.26, top + 0.14, w.sz + 0.3], c: [0.55, 0.6, 0.66, 1] },
        { min: [w.sx + 0.26, top - 0.02, -0.3], max: [w.sx + 0.42, top + 0.14, w.sz + 0.3], c: [0.55, 0.6, 0.66, 1] },
      ];
      if (Math.floor(st.k * 3) % 2) boxes.push({ min: [o[0] + 0.02, o[1] + 0.98, o[2] + 0.02], max: [o[0] + 0.98, o[1] + 1.01, o[2] + 0.98], c: [0.2, 0.85, 1, 0.55], flat: 1 });
      eng.setBoxes(boxes.concat(opt.extra ? opt.extra() : []));
      if (st.k >= st.total) { st.on = false; eng.drawBlocks = Infinity; eng.setBoxes(opt.extra ? opt.extra() : []); eng.world = st.w; eng.rebuild(false); st.done && st.done(); }
    };
    st.layer = () => { const o = eng.order[Math.min(st.total - 1, Math.floor(st.k))]; return o ? o[1] + 1 : 0; };
    return st;
  }
  // рамка рабочего объёма и сетка стола
  function frameLines(w, extra = []) {
    const L = [], c = [0.21, 0.82, 1];
    for (let i = 0; i <= w.sx; i++) L.push([i, 0.002, 0, i, 0.002, w.sz, ...c, i % 4 ? 0.12 : 0.28]);
    for (let i = 0; i <= w.sz; i++) L.push([0, 0.002, i, w.sx, 0.002, i, ...c, i % 4 ? 0.12 : 0.28]);
    const X = w.sx, Y = w.sy, Z = w.sz, e = [[0, 0, 0, 0, Y, 0], [X, 0, 0, X, Y, 0], [0, 0, Z, 0, Y, Z], [X, 0, Z, X, Y, Z], [0, Y, 0, X, Y, 0], [0, Y, Z, X, Y, Z], [0, Y, 0, 0, Y, Z], [X, Y, 0, X, Y, Z]];
    for (const q of e) L.push([...q, ...c, 0.22]);
    return L.concat(extra);
  }
  // орбита мышью/пальцем
  function orbit(cv, eng, { onTap, min = 6, max = 60 } = {}) {
    let drag = null, pinch = null; const pts = new Map();
    cv.addEventListener("contextmenu", (e) => e.preventDefault());
    cv.addEventListener("pointerdown", (e) => { pts.set(e.pointerId, [e.clientX, e.clientY]); try { cv.setPointerCapture(e.pointerId); } catch (er) {} if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), dist: eng.cam.dist }; drag = null; return; } drag = { x: e.clientX, y: e.clientY, yaw: eng.cam.yaw, pitch: eng.cam.pitch, moved: false, btn: e.button, e }; });
    cv.addEventListener("pointermove", (e) => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; eng.cam.dist = Math.max(min, Math.min(max, pinch.dist * pinch.d / Math.max(20, Math.hypot(a[0] - b[0], a[1] - b[1])))); eng.dirty = true; return; }
      if (!drag) { onTap && onTap.hover && onTap.hover(e); return; }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 5) drag.moved = true;
      if (drag.moved) { eng.cam.yaw = drag.yaw - dx * 0.008; eng.cam.pitch = Math.max(0.05, Math.min(1.45, drag.pitch + dy * 0.006)); eng.dirty = true; onTap && onTap.rot && onTap.rot(); }
    });
    const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (drag && !drag.moved && onTap && onTap.tap) onTap.tap(drag.e); drag = null; };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", (e) => { pts.delete(e.pointerId); drag = null; pinch = null; });
    cv.addEventListener("wheel", (e) => { e.preventDefault(); eng.cam.dist = Math.max(min, Math.min(max, eng.cam.dist * (e.deltaY > 0 ? 1.1 : 0.9))); eng.dirty = true; }, { passive: false });
  }

  /* ================= HERO: принтер печатает сам ================= */
  let heroEng = null, heroPr = null, heroI = 0, heroWait = 0, heroSpin = true;
  if (GL_OK) {
    heroEng = VX.create($("#hero3d"), { scale: 1 });
    if (heroEng) {
      heroEng.env.fade = true; heroEng.env.fog = [80, 140];
      heroPr = printer(heroEng, { speed: 22 });
      const next = () => {
        const p = PRESETS[heroI++ % PRESETS.length], w = p.make();
        heroEng.cam.target = [w.sx / 2, w.sy * 0.42, w.sz / 2]; heroEng.cam.dist = Math.max(w.sx, w.sy, w.sz) * 2.05; heroEng.cam.pitch = 0.5; heroEng.cam.fov = 45;
        heroEng.setLines(frameLines(w));
        $("#heroName").textContent = p.name; $(".p3-dims .dx").textContent = "X " + w.sx; $(".p3-dims .dy").textContent = "Y " + w.sy; $(".p3-dims .dz").textContent = "Z " + w.sz;
        heroPr.start(w, () => { heroWait = 2.2; });
      };
      heroPr.next = next; next();
      orbit($("#hero3d"), heroEng, { onTap: { rot() { heroSpin = false; clearTimeout(heroPr.spinTm); heroPr.spinTm = setTimeout(() => (heroSpin = true), 2500); } } });
    }
  }
  if (!heroEng) $("#hero").classList.add("nogl");

  /* ================= I. БЛОК ================= */
  (function block() {
    $("#blkLead").textContent = P.block.lead;
    $("#blkDl").innerHTML = P.block.dl.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
    const F = { f: "printer_front", b: "printer_side", l: "printer_side", r: "printer_side", u: "printer_top", d: "printer_bottom" };
    $("#blkCube").innerHTML = Object.entries(F).map(([k, v]) => `<i class="bf ${k}" style="background-image:url('${T(v)}')"></i>`).join("");
    $("#blkFaces").innerHTML = P.block.faces.map(([k, n]) => `<figure><img class="pixel" src="${T("printer_" + k)}" alt=""><figcaption>${n}</figcaption></figure>`).join("");
    const cube = $("#blkCube"), sc = $("#blkScene"); let rx = -22, ry = 35, drag = null, spin = true, last = performance.now();
    const apply = () => (cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`);
    sc.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, rx, ry }; spin = false; try { sc.setPointerCapture(e.pointerId); } catch (er) {} });
    sc.addEventListener("pointermove", (e) => { if (!drag) return; ry = drag.ry + (e.clientX - drag.x) * 0.5; rx = Math.max(-80, Math.min(80, drag.rx - (e.clientY - drag.y) * 0.5)); apply(); });
    sc.addEventListener("pointerup", () => { drag = null; setTimeout(() => (spin = true), 1800); });
    sc.addEventListener("contextmenu", (e) => e.preventDefault());
    (function loop(t) { requestAnimationFrame(loop); const dt = (t - last) / 1000; last = t; if (spin && !drag) { ry += dt * 18; apply(); } })(last);
    // креатив: хотбар на 9 слотов
    let inv = S.get("p13.inv", 0);
    const drawInv = () => { $("#inv13").innerHTML = Array.from({ length: 9 }, (_, i) => i === 0 && inv ? `<span class="slot13 has" title="3D-принтер"><img src="${T("printer_iso")}" alt="3D-принтер">${inv > 1 ? `<b>${inv}</b>` : ""}</span>` : `<span class="slot13"></span>`).join(""); };
    $("#creativeTake").addEventListener("click", () => { inv = Math.min(64, inv + 1); S.set("p13.inv", inv); drawInv(); ZM.sfx("pop", 0.5, 1.4); });
    drawInv();
  })();

  /* ================= II. ЦИКЛ: три живые схемы ================= */
  (function cycle() {
    $("#cyc").innerHTML = P.cycle.map((c, i) => `<article class="cy" data-k="${c.k}"><canvas class="cy-cv" width="300" height="200"></canvas><div class="cy-n">${c.n}</div><h3>${esc(c.t)}</h3><p>${esc(c.d)}</p>${i < 2 ? '<i class="cy-arr" aria-hidden="true"></i>' : ""}</article>`).join("");
    const cvs = $$(".cy-cv"); const M = [];
    for (let y = 0; y < 4; y++) for (let z = 0; z < 4; z++) for (let x = 0; x < 4; x++) { const r = 3 - y; if (x <= r && z <= r && !(y === 0 && x === 3 && z === 0)) M.push([x, y, z]); }
    M.sort((a, b) => a[1] - b[1] || (a[0] + a[2]) - (b[0] + b[2]));
    const cube = (g, x, y, z, s, ox, oy, fill, line) => {
      const P = (a, b, c) => [ox + (x + a - z - c) * s * 0.866, oy + (x + a + z + c) * s * 0.5 - (y + b) * s];
      const f = (pts, col) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.closePath(); if (col) { g.fillStyle = col; g.fill(); } if (line) { g.strokeStyle = line; g.stroke(); } };
      if (fill) { f([P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1)], fill[0]); f([P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1)], fill[1]); f([P(1, 0, 0), P(1, 0, 1), P(1, 1, 1), P(1, 1, 0)], fill[2]); }
      else { f([P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1)]); f([P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1)]); f([P(1, 0, 0), P(1, 0, 1), P(1, 1, 1), P(1, 1, 0)]); }
    };
    const STONE = ["#9aa3ad", "#6f7780", "#848c95"], CY = ["#7fe3ff", "#1f9fd0", "#35c0ee"];
    const lines = ["ZLP1", '{"v":1,"n":"пирамидка",', ' "s":[4,4,4],"p":[', '  "minecraft:stone"],', ' "c":30}', "BAEDAQEBAgEDAQ...", "8AEB8AEBwAEB..."];
    let vis = new Set();
    if ("IntersectionObserver" in window) { const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? vis.add(e.target) : vis.delete(e.target)))); cvs.forEach((c) => io.observe(c)); } else cvs.forEach((c) => vis.add(c));
    (function loop(t) {
      requestAnimationFrame(loop);
      cvs.forEach((cv, i) => {
        if (!vis.has(cv)) return; const g = cv.getContext("2d"); g.clearRect(0, 0, 300, 200); g.lineWidth = 1;
        const s = 22, ox = 150, oy = 70;
        if (i === 0) { // скан: плоскость поднимается, под ней блоки уже «сняты»
          const h = ((t / 1000) % 3.2) / 3.2 * 4.6 - 0.3;
          M.forEach(([x, y, z]) => cube(g, x - 1.5, y - 1.2, z - 1.5, s, ox, oy + 60, y + 1 <= h ? CY : y < h ? CY : STONE, "rgba(0,0,0,.35)"));
          const P = (a, c) => [ox + (a - c) * s * 0.866, oy + 60 + (a + c) * s * 0.5 - (h - 1.2) * s];
          g.beginPath(); [P(-2.2, -2.2), P(2.8, -2.2), P(2.8, 2.8), P(-2.2, 2.8)].forEach((p, k) => (k ? g.lineTo(...p) : g.moveTo(...p))); g.closePath();
          g.fillStyle = "rgba(53,208,255,.16)"; g.fill(); g.strokeStyle = "#35d0ff"; g.lineWidth = 1.5; g.stroke();
          g.fillStyle = "#9fe6ff"; g.font = "11px JetBrains Mono"; g.fillText(`Y ${Math.max(0, Math.min(4, h)).toFixed(1)}`, 14, 188);
        } else if (i === 1) { // чертёж: файл набирается
          const k = ((t / 1000) % 5) / 4;
          g.fillStyle = "#0b2338"; g.strokeStyle = "#35d0ff"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(70, 16); g.lineTo(206, 16); g.lineTo(230, 40); g.lineTo(230, 186); g.lineTo(70, 186); g.closePath(); g.fill(); g.stroke();
          g.beginPath(); g.moveTo(206, 16); g.lineTo(206, 40); g.lineTo(230, 40); g.stroke();
          g.font = "10.5px JetBrains Mono"; let left = Math.floor(k * lines.join("").length);
          lines.forEach((l, j) => { const part = l.slice(0, Math.max(0, left)); left -= l.length; g.fillStyle = j === 0 ? "#ffb000" : j >= 5 ? "#7dff8a" : "#bfe9ff"; g.fillText(part, 80, 50 + j * 18); });
          g.fillStyle = "#35d0ff"; g.font = "bold 13px JetBrains Mono"; g.fillText(".zlp", 184, 178);
        } else { // печать: блоки появляются по порядку, сопло ходит змейкой
          const n = Math.floor(((t / 1000) % 4.5) / 3.6 * M.length);
          M.forEach(([x, y, z], j) => { if (j < n) cube(g, x - 1.5, y - 1.2, z - 1.5, s, ox, oy + 60, STONE, "rgba(0,0,0,.35)"); else cube(g, x - 1.5, y - 1.2, z - 1.5, s, ox, oy + 60, null, "rgba(53,208,255,.18)"); });
          const o = M[Math.min(M.length - 1, n)], px = ox + ((o[0] - 1.5 + 0.5) - (o[2] - 1.5 + 0.5)) * s * 0.866, py = oy + 60 + ((o[0] - 1.5 + 0.5) + (o[2] - 1.5 + 0.5)) * s * 0.5 - (o[1] - 1.2 + 1) * s;
          g.strokeStyle = "#c7cdd4"; g.lineWidth = 2; g.beginPath(); g.moveTo(px, 0); g.lineTo(px, py - 14); g.stroke();
          g.fillStyle = "#ff9d1a"; g.fillRect(px - 7, py - 20, 14, 10); g.fillStyle = "#ffd24a"; g.beginPath(); g.moveTo(px - 3, py - 10); g.lineTo(px + 3, py - 10); g.lineTo(px, py - 5); g.fill();
        }
      });
    })(0);
  })();

  /* ================= III. СТУДИЯ ================= */
  let N = 12, W = mkWorld(N, N, N), tool = "place", cur = KEY.oak_planks, slice = N, undoS = [], redoS = [], eng = null, pr = null, hover = null, curName = "Без названия", curDesc = "", curAuthor = null;
  const view = () => { if (slice >= W.sy) return W; const v = mkWorld(W.sx, W.sy, W.sz); v.data.set(W.data.subarray(0, W.sx * W.sz * slice)); return v; };
  function commit() { undoS.push(W.data.slice()); if (undoS.length > 80) undoS.shift(); redoS = []; }
  function refresh(keepCam) {
    if (!eng) return;
    if (!(pr && pr.on)) eng.setWorld(view());
    eng.setLines(frameLines(W, slice < W.sy ? [[0, slice, 0, W.sx, slice, 0, 1, 0.7, 0.1, 0.8], [W.sx, slice, 0, W.sx, slice, W.sz, 1, 0.7, 0.1, 0.8], [W.sx, slice, W.sz, 0, slice, W.sz, 1, 0.7, 0.1, 0.8], [0, slice, W.sz, 0, slice, 0, 1, 0.7, 0.1, 0.8]] : []));
    if (!keepCam) { eng.cam.target = [W.sx / 2, W.sy * 0.3, W.sz / 2]; eng.cam.dist = Math.max(W.sx, W.sy, W.sz) * 2.1; }
    ghost(); stats(); zlpView();
  }
  function ghost() {
    if (!eng || (pr && pr.on)) return;
    const L = [];
    if (hover) {
      let x = hover.x, y = hover.y, z = hover.z, c = [0.21, 0.82, 1, 0.28];
      if (tool === "place" || hover.ground) { x += hover.n[0]; y += hover.n[1]; z += hover.n[2]; }
      if (tool === "break" && !hover.ground) c = [1, 0.3, 0.3, 0.35];
      if (tool === "pick") c = [1, 0.85, 0.2, 0.3];
      if (x >= 0 && y >= 0 && z >= 0 && x < W.sx && y < W.sy && z < W.sz) L.push({ min: [x - 0.01, y - 0.01, z - 0.01], max: [x + 1.01, y + 1.01, z + 1.01], c, flat: 1 });
    }
    eng.setBoxes(L);
  }
  function act(e, hit) {
    if (!hit) return;
    let t = tool; if (e.button === 2 || e.shiftKey) t = "break"; if (e.button === 1 || e.altKey) t = "pick";
    if (t === "pick") { if (!hit.ground) { cur = getB(W, hit.x, hit.y, hit.z); drawPal(); ZM.sfx("click", 0.4, 1.6); } return; }
    if (t === "break") { if (hit.ground) return; const id = getB(W, hit.x, hit.y, hit.z); commit(); setB(W, hit.x, hit.y, hit.z, 0); blockSnd(id, 0.55); refresh(true); return; }
    const x = hit.x + hit.n[0], y = hit.y + hit.n[1], z = hit.z + hit.n[2];
    if (x < 0 || y < 0 || z < 0 || x >= W.sx || y >= W.sy || z >= W.sz || y >= slice) { ZM.sfx("click", 0.3, 0.6); return; }
    commit(); setB(W, x, y, z, cur); blockSnd(cur, 0.6); refresh(true);
  }
  function stats() {
    const n = count(W); $("#stBlocks").textContent = AT.palette.length; $("#stuQ").textContent = `${W.sx}×${W.sy}×${W.sz} · ${n} ${plural(n, "блок", "блока", "блоков")}`;
    const m = {}; for (const v of W.data) if (v) m[v] = (m[v] || 0) + 1;
    const rows = Object.entries(m).sort((a, b) => b[1] - a[1]);
    const stack = (c) => c >= 64 ? `${(c / 64) | 0} ст.${c % 64 ? " + " + (c % 64) : ""}` : String(c);
    $("#bom").innerHTML = rows.length ? `<b class="bom-h">Материалы для печати</b>` + rows.map(([id, c]) => `<span class="bom-i" title="${esc(B[id].name)}"><img src="${isoIcon(+id, 32)}" alt="">${esc(B[id].name)}<em>${stack(c)}</em></span>`).join("") : `<b class="bom-h">Материалы для печати</b><span class="bom-e">пока пусто — поставь пару блоков</span>`;
  }
  function drawPal() {
    const q = ($("#palQ").value || "").trim().toLowerCase();
    $("#pal").innerHTML = AT.palette.filter((id) => !q || B[id].name.toLowerCase().includes(q) || B[id].key.includes(q)).map((id) => `<button type="button" class="pb ${id === cur ? "on" : ""} ${B[id].zm ? "zm" : ""}" data-id="${id}" title="${esc(B[id].name)}"><img src="${isoIcon(id, 32)}" alt="${esc(B[id].name)}"></button>`).join("");
    $("#palCur").innerHTML = cur ? `<img src="${isoIcon(cur, 32)}" alt=""><span><b>${esc(B[cur].name)}</b><small>${esc(B[cur].key.includes(":") ? B[cur].key : "minecraft:" + B[cur].key)}</small></span>` : "";
  }
  function loadWorld(w, meta = {}) {
    if (pr && pr.on) pr.stop();
    const need = Math.max(w.sx, w.sy, w.sz);
    W = w; N = need; curName = meta.name || "Без названия"; curDesc = meta.desc || ""; curAuthor = meta.author || null;
    const sel = $("#size"); if (![...sel.options].some((o) => +o.value === need)) { const o = document.createElement("option"); o.value = need; o.textContent = `${w.sx}×${w.sy}×${w.sz}`; sel.appendChild(o); }
    sel.value = need; slice = W.sy; $("#slice").max = W.sy; $("#slice").value = W.sy; $("#sliceV").textContent = "все";
    undoS = []; redoS = []; refresh(false);
  }
  function openText(text, from) {
    try {
      const { w, h, miss } = ZLP.decode(text);
      loadWorld(w, { name: h.n, desc: h.d, author: h.a });
      say(`Открыт чертёж «${h.n}»${h.a ? " от " + h.a : ""}${miss.length ? ` · неизвестные блоки заменены камнем: ${miss.length}` : ""}`);
      drawSnd();
      if (from && h.a !== ZM.profile.me().nick) grant("import_zlp");
      return true;
    } catch (e) { say("Не открылось: " + e.message, true); ZM.sfx("anvil", 0.3); return false; }
  }

  if (GL_OK) {
    eng = VX.create($("#stu3d"), { onReady: () => { drawPal(); stats(); } });
  }
  if (eng) {
    eng.env.fade = false; eng.env.fog = [400, 600]; eng.cam.fov = 45; eng.cam.pitch = 0.62; eng.cam.yaw = 0.7;
    pr = printer(eng, { sound: true, speed: 14 });
    const cv = $("#stu3d");
    orbit(cv, eng, { min: 5, max: 70, onTap: {
      tap(e) { if (pr.on) return; const r = cv.getBoundingClientRect(); act(e, eng.pick(e.clientX - r.left, e.clientY - r.top)); },
      hover(e) { if (pr.on || e.pointerType !== "mouse") return; const r = cv.getBoundingClientRect(); hover = eng.pick(e.clientX - r.left, e.clientY - r.top); ghost(); },
    } });
    cv.addEventListener("pointerleave", () => { hover = null; ghost(); });
    cv.addEventListener("auxclick", (e) => e.preventDefault());
    cv.addEventListener("mousedown", (e) => { if (e.button === 1) e.preventDefault(); });
  } else {
    $("#stuView").innerHTML = `<div class="stu-nogl">Браузер не дал WebGL: 3D-студия недоступна. Чертежи всё равно можно открыть, скачать и отправить.</div>`;
  }
  $$(".stu-tools [data-tool]").forEach((b) => b.addEventListener("click", () => { tool = b.dataset.tool; $$(".stu-tools [data-tool]").forEach((x) => x.classList.toggle("on", x === b)); ghost(); }));
  $("#undo").addEventListener("click", () => { if (!undoS.length) return; redoS.push(W.data.slice()); W.data.set(undoS.pop()); refresh(true); });
  $("#redo").addEventListener("click", () => { if (!redoS.length) return; undoS.push(W.data.slice()); W.data.set(redoS.pop()); refresh(true); });
  $("#clear").addEventListener("click", () => { if (!count(W)) return; commit(); W.data.fill(0); ZM.sfx("stone", 0.5, 0.7); refresh(true); });
  addEventListener("keydown", (e) => { if (!(e.ctrlKey || e.metaKey) || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return; if (e.key === "z" || e.key === "я") { e.preventDefault(); $("#undo").click(); } if (e.key === "y" || e.key === "н") { e.preventDefault(); $("#redo").click(); } });
  $("#size").addEventListener("change", (e) => { const n = +e.target.value; const w = mkWorld(n, n, n); for (let y = 0; y < Math.min(n, W.sy); y++) for (let z = 0; z < Math.min(n, W.sz); z++) for (let x = 0; x < Math.min(n, W.sx); x++) setB(w, x, y, z, getB(W, x, y, z)); loadWorld(w, { name: curName, desc: curDesc }); });
  $("#pal").addEventListener("click", (e) => { const b = e.target.closest("[data-id]"); if (!b) return; cur = +b.dataset.id; if (tool !== "place") $('.stu-tools [data-tool="place"]').click(); drawPal(); blockSnd(cur, 0.35); });
  $("#palQ").addEventListener("input", drawPal);
  $("#slice").addEventListener("input", (e) => { slice = +e.target.value; $("#sliceV").textContent = slice >= W.sy ? "все" : "до " + slice; refresh(true); });
  $("#presets").innerHTML = `<span>Готовые:</span>` + PRESETS.map((p) => `<button type="button" data-p="${p.id}">${esc(p.name)}</button>`).join("");
  $("#presets").addEventListener("click", (e) => { const b = e.target.closest("[data-p]"); if (!b) return; const p = PRESETS.find((q) => q.id === b.dataset.p); loadWorld(p.make(), { name: p.name, desc: p.desc, author: "ZitraksMode" }); drawSnd(); });

  // печать
  $("#bPrint").addEventListener("click", () => {
    if (!eng) return; if (pr.on) { pr.stop(true); return; }
    const w = view(); if (!count(w)) { say("Печатать нечего: чертёж пустой", true); return; }
    hover = null; $("#stuPrint").hidden = false; $("#bPrint").innerHTML = "<span>■</span>Стоп"; snd("out", 0.7); snd("activate", 0.25, 1.3);
    pr.start(w, () => { $("#stuPrint").hidden = true; $("#bPrint").innerHTML = "<span>▶</span>Печать"; snd("in", 0.7); snd("deactivate", 0.2, 1.4); ZM.sfx("levelup", 0.35); grant("first_print"); say("Печать завершена"); refresh(true); });
  });
  $("#prStop").addEventListener("click", () => { pr.stop(); $("#stuPrint").hidden = true; $("#bPrint").innerHTML = "<span>▶</span>Печать"; snd("in", 0.6); refresh(true); });
  $("#prSpeed").addEventListener("input", (e) => { if (pr) pr.speed = +e.target.value; });
  // файлы и ссылки
  const curText = () => ZLP.encode(W, { name: curName, desc: curDesc, author: curAuthor || undefined });
  $("#bSave").addEventListener("click", () => { if (!count(W)) return say("Сначала поставь хоть один блок", true); ZLP.file(curText(), curName); drawSnd(); grant("first_scan"); say("Чертёж .zlp сохранён"); });
  $("#bLink").addEventListener("click", () => { if (!count(W)) return say("Сначала поставь хоть один блок", true); const l = ZLP.link(curText()); ZM.copy(l).then(() => say(`Ссылка скопирована (${Math.ceil(l.length / 1024)} КБ). Кто откроет — увидит этот чертёж`)); drawSnd(); grant("first_scan"); });
  $("#bOpen").addEventListener("change", (e) => { const f = e.target.files[0]; if (!f) return; f.text().then((t) => { openText(t, true) && location.hash !== "#studio" && document.getElementById("studio").scrollIntoView({ behavior: "smooth" }); }); e.target.value = ""; });
  // перетаскивание .zlp на страницу
  let dragN = 0; const drop = $("#stuDrop");
  addEventListener("dragenter", (e) => { if (![...(e.dataTransfer.types || [])].includes("Files")) return; dragN++; drop.classList.add("on"); });
  addEventListener("dragleave", () => { if (--dragN <= 0) { dragN = 0; drop.classList.remove("on"); } });
  addEventListener("dragover", (e) => e.preventDefault());
  addEventListener("drop", (e) => { e.preventDefault(); dragN = 0; drop.classList.remove("on"); const f = e.dataTransfer.files[0]; if (!f) return; f.text().then((t) => { if (openText(t, true)) document.getElementById("studio").scrollIntoView({ behavior: "smooth" }); }); });

  /* ================= IV. АНАТОМИЯ ================= */
  const SEG = {
    magic: ["Сигнатура", "Первая строка всегда ZLP1. По ней принтер понимает, что перед ним чертёж, а не случайный текст."],
    name: ["Название", "Как чертёж будет подписан в списке."], author: ["Автор", "Ник того, кто сохранил."], size: ["Размер", "Ширина × высота × глубина рабочей области в блоках."],
    pal: ["Палитра", "Все разные блоки чертежа по одному разу. Дальше в данных стоят только их номера: 1, 2, 3…"], cnt: ["Блоков", "Сколько всего блоков придётся поставить. Столько же нужно материалов."],
    time: ["Время", "Когда чертёж сохранили."], desc: ["Описание", "Пара слов от автора."], data: ["Данные", "Слои снизу вверх, змейкой. Пары «сколько подряд → номер из палитры», 0 значит воздух. Так 1000 блоков воздуха занимают два байта, а не тысячу."],
  };
  function zlpView() {
    const text = curText(), lines = text.split("\n"), h = JSON.parse(lines[1]);
    const J = (k, v, seg) => `<span class="zs" data-seg="${seg}">"${k}":${esc(JSON.stringify(v))}</span>`;
    const parts = [`<span class="zs" data-seg="magic">ZLP1</span>`, "{" + [`"v":1`, J("n", h.n, "name"), J("a", h.a, "author"), J("s", h.s, "size"), J("p", h.p, "pal"), J("c", h.c, "cnt"), J("t", h.t, "time")].concat(h.d ? [J("d", h.d, "desc")] : []).join(",") + "}"];
    const d = lines[2] || "";
    parts.push(`<span class="zs data" data-seg="data">${esc(d.length > 600 ? d.slice(0, 600) + "…" : d)}</span>`);
    $("#zlFile").innerHTML = parts.join("\n");
    $("#zlpQ").textContent = `${new Blob([text]).size} байт`;
    // расшифровка первых пар
    const rle = d ? b64.dec(d) : new Uint8Array(0), pairs = [];
    for (let i = 0; i + 1 < rle.length && pairs.length < 8; i += 2) pairs.push(`<i>${rle[i]}×</i>${rle[i + 1] ? esc((B[KEY[h.p[rle[i + 1] - 1].replace("minecraft:", "")]] || { name: h.p[rle[i + 1] - 1] }).name) : "воздух"}`);
    $("#zlLeg").innerHTML = Object.entries(SEG).filter(([k]) => k !== "desc" || h.d).map(([k, [t, x]]) => `<div class="zl-i" data-seg="${k}"><b>${t}</b><span>${x}</span></div>`).join("") + `<div class="zl-rle"><b>Начало данных по-человечески</b>${pairs.join(" · ") || "пусто"}</div>`;
  }
  const hl = (seg) => { $$("[data-seg]").forEach((el) => el.classList.toggle("hl", !!seg && el.dataset.seg === seg)); };
  $("#zlFile").addEventListener("pointerover", (e) => { const s = e.target.closest("[data-seg]"); hl(s && s.dataset.seg); });
  $("#zlLeg").addEventListener("pointerover", (e) => { const s = e.target.closest("[data-seg]"); hl(s && s.dataset.seg); });
  $("#zlFile").addEventListener("pointerleave", () => hl(null)); $("#zlLeg").addEventListener("pointerleave", () => hl(null));

  /* ================= V. БАРАХОЛКА =================
     Хранилище: этот браузер (p13.forum). Всё, что уходит наружу, — файл или ссылка с чертежом внутри.
     FORUM — единая точка доступа: чтобы подключить общий сервер, достаточно заменить list/add/remove/like. */
  const FORUM = {
    seeds: PRESETS.map((p) => ({ id: "zm-" + p.id, title: p.name, desc: p.desc, author: "ZitraksMode", official: true, ts: new Date(p.ts).getTime(), likes: p.likes, preset: p })),
    list() { return this.seeds.concat(S.get("p13.forum", [])); },
    add(post) { const a = S.get("p13.forum", []); a.unshift(post); S.set("p13.forum", a.slice(0, 60)); },
    remove(id) { S.set("p13.forum", S.get("p13.forum", []).filter((p) => p.id !== id)); },
  };
  let mkF = "all";
  const thumbs = {};
  let thumbEng = null, thumbQ = [], thumbBusy = false, thumbReady = false;
  if (GL_OK) {
    thumbEng = VX.create($("#thumb3d"), { preserve: true, antialias: true, onReady: () => { thumbReady = true; pump(); } });
    if (thumbEng) { thumbEng.env.fade = false; thumbEng.env.fog = [400, 600]; thumbEng.cam.fov = 40; thumbEng.cam.pitch = 0.55; thumbEng.cam.yaw = 0.75; thumbEng.clear = [0, 0, 0, 0]; }
  }
  function thumbOf(w) {
    if (!thumbEng) return "";
    thumbEng.setWorld(w); thumbEng.setLines(frameLines(w).slice(-8).map((l) => (l[9] = 0.35, l)));
    thumbEng.cam.target = [w.sx / 2, w.sy * 0.42, w.sz / 2]; thumbEng.cam.dist = Math.max(w.sx, w.sy, w.sz) * 2.25;
    thumbEng.render(); return thumbEng.snapshot(192);
  }
  function pump() {
    if (!thumbReady || thumbBusy) return; thumbBusy = true;
    const step = () => { const job = thumbQ.shift(); if (!job) { thumbBusy = false; return; } thumbs[job.id] = thumbOf(job.w); const img = document.querySelector(`[data-thumb="${job.id}"]`); if (img) img.src = thumbs[job.id]; setTimeout(step, 16); };
    step();
  }
  const postWorld = (p) => (p.preset ? p.preset.make() : ZLP.decode(p.zlp).w);
  const postText = (p) => (p.preset ? ZLP.encode(p.preset.make(), { name: p.title, desc: p.desc, author: p.author, t: p.ts }) : p.zlp);
  function renderMk() {
    const favs = S.get("p13.fav", []), liked = S.get("p13.likes", []), me = ZM.profile.me();
    const q = ($("#mkQ2").value || "").trim().toLowerCase(), sort = $("#mkSort").value;
    let list = FORUM.list().map((p) => { let w = null; try { w = postWorld(p); } catch (e) {} return { p, w, n: w ? count(w) : 0, l: (p.likes || 0) + (liked.includes(p.id) ? 1 : 0) }; }).filter((x) => x.w);
    if (mkF === "mine") list = list.filter((x) => !x.p.official);
    if (mkF === "fav") list = list.filter((x) => favs.includes(x.p.id));
    if (q) list = list.filter((x) => (x.p.title + " " + x.p.desc + " " + x.p.author).toLowerCase().includes(q));
    list.sort((a, b) => sort === "top" ? b.l - a.l : sort === "big" ? b.n - a.n : b.p.ts - a.p.ts);
    $("#mkQ").textContent = `${FORUM.list().length} ${plural(FORUM.list().length, "чертёж", "чертежа", "чертежей")}`;
    $("#mk").innerHTML = list.length ? list.map(({ p, w, n, l }) => {
      if (!thumbs[p.id] && p.thumb) thumbs[p.id] = p.thumb;
      if (!thumbs[p.id] && !thumbQ.some((j) => j.id === p.id)) thumbQ.push({ id: p.id, w });
      const av = p.official ? T("printer_iso") : ZM.profile.avatarUrl(p.avatar);
      return `<article class="mk-card ${p.official ? "off" : "own"}" data-id="${p.id}">
        <div class="mk-th"><img data-thumb="${p.id}" src="${thumbs[p.id] || ""}" alt=""><span class="mk-sz">${w.sx}×${w.sy}×${w.sz}</span>${p.official ? '<span class="mk-badge">ZitraksMode</span>' : ""}</div>
        <div class="mk-b"><h3>${esc(p.title)}</h3><p>${esc(p.desc || "")}</p>
          <div class="mk-meta"><img src="${av}" alt=""><span>${esc(p.author)}</span><em>${new Date(p.ts).toLocaleDateString("ru-RU")}</em><em>${n} бл.</em></div>
          <div class="mk-act"><button type="button" data-a="open">Открыть</button><button type="button" data-a="dl" title="Скачать .zlp">.zlp</button><button type="button" data-a="link" title="Скопировать ссылку">⧉</button>
          <button type="button" data-a="like" class="${liked.includes(p.id) ? "on" : ""}" title="Нравится">♥ ${l}</button><button type="button" data-a="fav" class="${favs.includes(p.id) ? "on" : ""}" title="В избранное">★</button>${!p.official && p.author === me.nick ? '<button type="button" data-a="del" title="Удалить">✕</button>' : ""}</div>
        </div></article>`;
    }).join("") : `<div class="mk-empty">${mkF === "mine" ? "Своих чертежей пока нет. Построй что-нибудь в студии и жми «На барахолку»." : mkF === "fav" ? "В избранном пусто. Жми ★ на любом чертеже." : "Ничего не нашлось."}</div>`;
    pump();
  }
  $$(".mk-tabs button").forEach((b) => b.addEventListener("click", () => { mkF = b.dataset.f; $$(".mk-tabs button").forEach((x) => x.classList.toggle("on", x === b)); renderMk(); }));
  $("#mkQ2").addEventListener("input", renderMk); $("#mkSort").addEventListener("change", renderMk);
  $("#mk").addEventListener("click", (e) => {
    const b = e.target.closest("[data-a]"), card = e.target.closest(".mk-card"); if (!b || !card) return;
    const p = FORUM.list().find((x) => x.id === card.dataset.id); if (!p) return;
    const a = b.dataset.a;
    if (a === "open") { openText(postText(p), !p.official); document.getElementById("studio").scrollIntoView({ behavior: "smooth" }); }
    if (a === "dl") { ZLP.file(postText(p), p.title); drawSnd(); }
    if (a === "link") { ZM.copy(ZLP.link(postText(p))).then(() => say("Ссылка на чертёж скопирована")); }
    if (a === "like") { const l = S.get("p13.likes", []), i = l.indexOf(p.id); i < 0 ? l.push(p.id) : l.splice(i, 1); S.set("p13.likes", l); ZM.sfx("orb", 0.35, 1.5); renderMk(); }
    if (a === "fav") { const f = S.get("p13.fav", []), i = f.indexOf(p.id); i < 0 ? f.push(p.id) : f.splice(i, 1); S.set("p13.fav", f); ZM.sfx("click", 0.4, 1.3); renderMk(); }
    if (a === "del") { FORUM.remove(p.id); delete thumbs[p.id]; ZM.sfx("stone", 0.4, 0.8); renderMk(); }
  });
  // публикация: маленькое окно
  $("#bPub").addEventListener("click", () => {
    if (!count(W)) return say("Сначала поставь хоть один блок", true);
    const md = document.createElement("div"); md.className = "p3-md";
    md.innerHTML = `<form class="p3-md-box"><b>На барахолку</b><label>Название<input name="t" maxlength="40" required value="${esc(curName === "Без названия" ? "" : curName)}"></label><label>Пара слов<textarea name="d" maxlength="160" rows="3">${esc(curDesc)}</textarea></label><div class="p3-md-a"><button type="button" class="p3-btn2 sm" data-x>Отмена</button><button class="p3-btn sm" type="submit"><span>↑</span>Выложить</button></div></form>`;
    document.body.appendChild(md); md.querySelector("input").focus();
    md.addEventListener("click", (e) => { if (e.target === md || e.target.closest("[data-x]")) md.remove(); });
    md.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault(); const f = new FormData(e.target), me = ZM.profile.me();
      curName = String(f.get("t")).trim() || "Без названия"; curDesc = String(f.get("d")).trim();
      const id = "u" + Date.now().toString(36), text = ZLP.encode(W, { name: curName, desc: curDesc, author: me.nick });
      FORUM.add({ id, title: curName, desc: curDesc, author: me.nick, avatar: me.avatar, ts: Date.now(), likes: 0, zlp: text, thumb: thumbEng ? thumbOf(W) : "" });
      md.remove(); grant("publish"); ZM.sfx("levelup", 0.35, 1.2); say("Выложено на барахолку");
      mkF = "mine"; $$(".mk-tabs button").forEach((x) => x.classList.toggle("on", x.dataset.f === "mine")); renderMk(); zlpView();
      document.getElementById("market").scrollIntoView({ behavior: "smooth" });
    });
  });

  /* ================= VII. ИСТОРИЯ ================= */
  $("#timeline").innerHTML = P.history.map((h) => `<div class="tl-i" style="--c:${h.c}"><span class="tl-d">${h.date}</span>${h.ver ? `<span class="tl-v">v${h.ver}</span>` : `<span class="tl-v new">новый пункт</span>`}<b>${esc(h.t)}</b><p>${esc(h.d)}</p></div>`).join("");

  /* ================= ФИНАЛ ================= */
  const nav = ZM.pointNav(13);
  $("#finNav").innerHTML = [nav.prev && `<a href="${U(nav.prev.href)}">← №${pad2(nav.prev.n)} ${esc(nav.prev.title)}</a>`, `<a href="${U("index.html")}">На главную</a>`, nav.next && `<a href="${U(nav.next.href)}">№${pad2(nav.next.n)} ${esc(nav.next.title)} →</a>`].filter(Boolean).join("");
  $("#finPrint").addEventListener("click", () => {
    const f = $("#finPrint"); if (f.classList.contains("run")) return;
    f.classList.remove("done"); void f.offsetWidth; f.classList.add("run"); snd("out", 0.6);
    let k = 0; const tm = setInterval(() => { if (++k % 2) ZM.sfx("stone", 0.25, 1.2 + Math.random() * 0.3); }, 160);
    setTimeout(() => { clearInterval(tm); f.classList.remove("run"); f.classList.add("done"); snd("in", 0.6); ZM.sfx("levelup", 0.3); $("#finP").textContent = "Готово. Ещё раз?"; }, 2600);
  });

  /* ================= главный цикл ================= */
  let last = performance.now();
  const heroVis = { v: true }, stuVis = { v: false };
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((es) => (heroVis.v = es[0].isIntersecting)).observe($("#hero"));
    new IntersectionObserver((es) => (stuVis.v = es[0].isIntersecting)).observe($("#stu"));
  }
  (function loop(t) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (t - last) / 1000); last = t; if (document.hidden) return;
    if (heroEng && heroVis.v) {
      if (heroSpin) heroEng.cam.yaw += dt * 0.25;
      if (heroPr.on) heroPr.tick(dt); else if (heroWait > 0) { heroWait -= dt; if (heroWait <= 0) heroPr.next(); }
      const pc = heroPr.total ? Math.min(1, heroPr.k / heroPr.total) : 1;
      $("#heroBar").style.width = pc * 100 + "%"; $("#heroTxt").textContent = heroPr.on ? `слой ${heroPr.layer()}/${heroPr.maxY} · ${Math.floor(heroPr.k)}/${heroPr.total}` : "готово";
      heroEng.render();
    }
    if (eng && stuVis.v) {
      if (pr.on) { pr.tick(dt); $("#prTxt").textContent = `слой ${pr.layer()}/${pr.maxY} · ${Math.floor(pr.k)}/${pr.total} блоков`; $("#prBar").style.width = (pr.k / pr.total) * 100 + "%"; }
      if (eng.dirty || pr.on) eng.render();
    }
  })(last);

  /* ================= старт ================= */
  const start = () => {
    const m = /#zlp=([\w-]+)/.exec(location.hash);
    if (m) { if (openText(m[1], true)) setTimeout(() => document.getElementById("studio").scrollIntoView(), 300); history.replaceState(null, "", location.pathname + location.search + "#studio"); }
    else loadWorld(PRESETS[0].make(), { name: PRESETS[0].name, desc: PRESETS[0].desc, author: "ZitraksMode" });
    drawPal(); renderMk();
  };
  if (atlasImg.complete) start(); else atlasImg.onload = start;
  addEventListener("hashchange", () => { const m = /#zlp=([\w-]+)/.exec(location.hash); if (!m) return; if (openText(m[1], true)) document.getElementById("studio").scrollIntoView(); history.replaceState(null, "", location.pathname + location.search + "#studio"); });
  ZM.p13 = { grant, ZLP, W: () => W, printer: () => pr };
  ZM.reveal();
})();
