/* №13 · 3D-принтер — всё по коду мода.
   GUI — копия Printer3DScreen (420×256, шрифт Minecraft, те же координаты и цвета) на canvas.
   Печать — порядок Printer3DBlockEntity.sortPlacements, 1 блок/тик, чары Заебись/Нахуя?/Барыга.
   Сканер — PrinterRecipeScanner (лимиты PrinterRecipeLimits). Файлы .zlp — настоящий gzip NBT как у PrinterRecipeFileStorage. */
(function () {
  const { $, $$, esc, store: S } = ZM;
  const U = ZM.url, P = ZM.P13, AT = ZM.VOX_ATLAS, VX = window.ZMVox, BUILT = ZM.P13_BUILT;
  const B = AT.blocks, KEY = {}; B.forEach((b, i) => { if (b) KEY[b.key] = i; });
  const T = (n) => U(`assets/textures/p13/${n}.png`);
  const pad2 = (n) => String(n).padStart(2, "0");
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; };
  const MC = { 0: "#000", 1: "#0000AA", 2: "#00AA00", 3: "#00AAAA", 4: "#AA0000", 5: "#AA00AA", 6: "#FFAA00", 7: "#AAAAAA", 8: "#555555", 9: "#5555FF", a: "#55FF55", b: "#55FFFF", c: "#FF5555", d: "#FF55FF", e: "#FFFF55", f: "#FFFFFF" };
  const GL_OK = VX && VX.supported();
  const fmt = (s, ...a) => { let i = 0; return s.replace(/%[sd]/g, () => a[i++]); };
  const mcHtml = (s) => { let out = "", col = "f"; String(s).split(/(§[0-9a-fr])/).forEach((p) => { if (/^§/.test(p)) col = p[1] === "r" ? "f" : p[1]; else if (p) out += `<span style="color:${MC[col]}">${esc(p)}</span>`; }); return out; };

  ZM.topbar({ crumb: "№13 · 3D-принтер", ...ZM.pointNav(13) });
  if (!GL_OK) document.documentElement.classList.add("nogl");

  /* ---------------- звук ---------------- */
  const sndPool = {};
  function snd(name, vol = 0.5, rate = 1) {
    if (!ZM.sfx.on()) return;
    const url = U(`assets/sounds/p13/${name}.ogg`);
    try { const a = (sndPool[url] || (sndPool[url] = new Audio(url))).cloneNode(); a.volume = Math.min(1, vol * 0.45); a.playbackRate = rate; a.preservesPitch = false; a.play().catch(() => {}); ZM.lastSound = performance.now(); } catch (e) {}
  }
  const drawSnd = () => snd("drawmap" + (1 + ((Math.random() * 3) | 0)), 0.8, 0.95 + Math.random() * 0.1);
  const soundKind = (k) => /planks|log|wood|bookshelf|crafting|stem|pumpkin|melon|jack|door|trapdoor|sign|barrel|chest|composter|ladder|button/.test(k) ? "wood" : /leaves|wool|carpet|bed|hay|wart|grass|dirt|sand|gravel|soul|banner/.test(k) ? "cloth" : /glass|pane|lantern|sea_lantern|glowstone/.test(k) ? "glass" : "stone";
  const blockSnd = (id, vol = 0.5) => { const k = (B[id] && B[id].key) || ""; const kind = soundKind(k); ZM.sfx(kind === "glass" ? "stone" : kind, vol, (kind === "glass" ? 1.5 : 0.9) + Math.random() * 0.2); };

  let toastTm = 0;
  function say(t, bad) { const el = $("#p3toast"); el.innerHTML = /§/.test(t) ? mcHtml(t) : esc(t); el.className = "p3-toast on" + (bad ? " bad" : ""); clearTimeout(toastTm); toastTm = setTimeout(() => el.classList.remove("on"), 2800); }
  // строка «чата» под окном принтера (как сообщения мода в игре)
  function chat(t) {
    const log = $("#guiLog"), row = document.createElement("div"); row.className = "gl-row"; row.innerHTML = mcHtml(t);
    log.appendChild(row); while (log.children.length > 4) log.firstChild.remove();
    setTimeout(() => row.classList.add("old"), 9000);
  }

  /* ================= иконки ================= */
  const atlasImg = new Image();
  atlasImg.onload = () => { // иконки из атласа готовы: перерисовать всё, где стояла «missing texture»
    for (const k in imgCache) if (imgCache[k].src === missingUri) delete imgCache[k];
    try { G.dirty = true; drawPal(); } catch (e) {}
    document.querySelectorAll("img[data-it]").forEach((im) => (im.src = itemSrc(im.dataset.it)));
  };
  atlasImg.src = AT.uri;
  const iconCache = {};
  // изометрическая иконка блока: честная форма из коробок (ступеньки, двери, таблички, кнопки…), грани с нужным куском текстуры
  let shadedAtlas = null;
  function shadeAtlas() {
    if (shadedAtlas) return shadedAtlas;
    shadedAtlas = [0, 0.22, 0.42].map((d) => {
      if (!d) return atlasImg;
      const c = document.createElement("canvas"); c.width = atlasImg.naturalWidth; c.height = atlasImg.naturalHeight; const g = c.getContext("2d");
      g.drawImage(atlasImg, 0, 0); g.globalCompositeOperation = "source-atop"; g.fillStyle = `rgba(0,0,0,${d})`; g.fillRect(0, 0, c.width, c.height); return c;
    });
    return shadedAtlas;
  }
  function isoIcon(id, s = 32) {
    const key = id + ":" + s; if (iconCache[key]) return iconCache[key];
    const b = B[id]; if (!b || !atlasImg.complete || !atlasImg.naturalWidth) return "";
    let boxes = b.bx;
    if (!boxes) { const t6 = b.t6 || (b.t ? [b.t[0], b.t[2], b.t[1], b.t[1], b.t[1], b.t[1]] : null); if (!t6) return ""; boxes = [[0, 0, 0, 16, 16, 16, ...t6, 0]]; }
    // размер рамки: мелкие штуки (кнопка, рычаг, фонарь) чуть увеличиваем и центрируем, чтобы их было видно
    let lo = [16, 16, 16], hi = [0, 0, 0]; boxes.forEach((q) => { for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], q[i]); hi[i] = Math.max(hi[i], q[i + 3]); } });
    const ext = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]), zoom = ext < 12 ? Math.min(2.2, 12 / ext) : 1;
    const cx = (lo[0] + hi[0]) / 32, cy = (lo[1] + hi[1]) / 32, cz = (lo[2] + hi[2]) / 32;
    const c = document.createElement("canvas"); c.width = c.height = s; const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    const cols = AT.size / AT.tile, t = AT.tile, SA = shadeAtlas();
    const pr = (x, y, z) => { if (zoom !== 1) { x = 0.5 + (x - cx) * zoom; y = 0.5 + (y - cy) * zoom; z = 0.5 + (z - cz) * zoom; } return [s / 2 + (x - z) * s / 2, (s / 4) * (x + z) + (1 - y) * s / 2]; };
    // грань: P0 + u·A + v·B (u,v в пикселях тайла 0..t); кусок текстуры [u0,v0,u1,v1] в 1/16
    const face = (tile, P0, P1, P2, r, fullUV, shade) => {
      if (tile == null || tile < 0 || r[2] - r[0] <= 0 || r[3] - r[1] <= 0) return;
      const A = [(P1[0] - P0[0]) / t, (P1[1] - P0[1]) / t], Bv = [(P2[0] - P0[0]) / t, (P2[1] - P0[1]) / t];
      g.setTransform(A[0], A[1], Bv[0], Bv[1], P0[0], P0[1]);
      const k = t / 16, du = r[0] * k, dv = r[1] * k, dw = (r[2] - r[0]) * k, dh = (r[3] - r[1]) * k, sx = (tile % cols) * t, sy = ((tile / cols) | 0) * t;
      const e = 0.04; // крошечный нахлёст, чтобы не было щелей между гранями
      if (fullUV) g.drawImage(SA[shade], sx, sy, t, t, du - e, dv - e, dw + 2 * e, dh + 2 * e);
      else g.drawImage(SA[shade], sx + du, sy + dv, Math.max(0.01, dw), Math.max(0.01, dh), du - e, dv - e, dw + 2 * e, dh + 2 * e);
    };
    const sorted = boxes.slice().sort((p, q) => (p[0] + p[3] + p[1] + p[4] + p[2] + p[5]) - (q[0] + q[3] + q[1] + q[4] + q[2] + q[5]));
    for (const q of sorted) {
      const [x0, y0, z0, x1, y1, z1] = q.slice(0, 6).map((v) => v / 16), full = !!q[12];
      const X0 = q[0], Y0 = q[1], Z0 = q[2], X1 = q[3], Y1 = q[4], Z1 = q[5];
      face(q[6], pr(0, y1, 0), pr(1, y1, 0), pr(0, y1, 1), [X0, Z0, X1, Z1], full, 0);
      face(q[9], pr(0, 1, z1), pr(1, 1, z1), pr(0, 0, z1), [X0, 16 - Y1, X1, 16 - Y0], full, 1);
      face(q[11], pr(x1, 1, 1), pr(x1, 1, 0), pr(x1, 0, 1), [16 - Z1, 16 - Y1, 16 - Z0, 16 - Y0], full, 2);
    }
    return (iconCache[key] = c.toDataURL());
  }
  // картинка предмета для canvas-GUI и HTML: сначала настоящие иконки, потом изометрия из атласа, иначе «missing texture»
  const HAVE_ICON = new Set(["anvil", "azalea_leaves", "barrel", "birch_pressure_plate", "black_bed", "black_carpet", "black_concrete", "black_stained_glass", "blackstone_stairs", "bone_block", "book", "bookshelf", "brewing_stand", "brown_carpet", "calcite", "campfire", "cauldron", "chest", "cobblestone", "composter", "crafting_table", "crimson_sign", "dark_oak_button", "dark_oak_door", "dark_oak_sign", "dead_bush", "deepslate_brick_stairs", "diamond", "dirt", "enchanted_book", "enchanting_table", "end_rod", "ender_button", "ender_chest", "ender_door", "ender_trapdoor", "flower_pot", "flowering_azalea_leaves", "glass", "glass_pane", "glowstone", "grass_block", "gray_carpet", "gray_concrete", "heavy_weighted_pressure_plate", "iron_bars", "iron_ingot", "ladder", "lantern", "lever", "light_gray_bed", "light_gray_carpet", "light_gray_concrete", "lightning_rod", "mangrove_sign", "oak_planks", "oak_sapling", "obsidian", "obsidian_dildo", "pink_tulip", "piston", "polished_blackstone_button", "purple_concrete", "quartz_block", "quartz_bricks", "quartz_pillar", "quartz_slab", "red_tulip", "redstone", "reinforced_ender_glass", "sea_lantern", "skeleton_skull", "smoker", "smooth_quartz", "smooth_quartz_slab", "smooth_quartz_stairs", "soul_lantern", "spruce_button", "spruce_door", "spruce_sapling", "spruce_sign", "spruce_slab", "spruce_stairs", "spruce_trapdoor", "stone", "stone_button", "stone_dildo", "string", "stripped_dark_oak_wood", "stripped_spruce_wood", "tripwire_hook", "white_banner", "white_carpet", "white_concrete", "white_wool", "wither_skeleton_skull"]);
  const imgCache = {};
  let missingUri = null;
  function missing() {
    if (missingUri) return missingUri;
    const c = document.createElement("canvas"); c.width = c.height = 16; const g = c.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, 16, 16); g.fillStyle = "#f800f8"; g.fillRect(0, 0, 8, 8); g.fillRect(8, 8, 8, 8);
    return (missingUri = c.toDataURL());
  }
  function itemSrc(id) {
    const name = String(id).replace(/^minecraft:/, "");
    if (id === "zitraksmode:printer_3d") return T("printer_iso");
    const nm = name.replace(/^zitraksmode:/, ""); if (HAVE_ICON.has(nm)) return T("i/" + nm);
    const k = KEY[name] ?? KEY[id];
    if (k) { const u = isoIcon(k, 32); if (u) return u; }
    const st = B.find((b) => b && b.key && b.key.split("[")[0] === (id.includes(":") ? id : "minecraft:" + id));
    if (st) { const u = isoIcon(st.id, 32); if (u) return u; }
    return missing();
  }
  function itemImg(id) {
    if (imgCache[id]) return imgCache[id];
    const im = new Image(); im.onload = () => (G.dirty = true); im.src = itemSrc(id); return (imgCache[id] = im);
  }
  const RU = Object.assign({}, P.mats, P.names, { printer_3d: "3D Принтер" });
  B.forEach((b) => { if (b && b.key && !b.key.includes("[")) { const n = b.key.replace(/^minecraft:/, ""); if (!RU[n]) RU[n] = b.name; } else if (b && b.key) { const n = b.key.split("[")[0].replace(/^(minecraft|zitraksmode):/, ""); if (!RU[n]) RU[n] = b.name; } });
  const itemName = (id) => RU[String(id).replace(/^(minecraft|zitraksmode):/, "")] || String(id).replace(/^minecraft:/, "");
  const maxStack = (id) => (/_bed$|potion|bucket$|_boat$|minecart/.test(id) ? 1 : /sign$|banner$|ender_pearl|egg$|snowball/.test(id) ? 16 : 64);

  /* ================= мир и чертежи ================= */
  const mkWorld = (sx, sy, sz) => ({ sx, sy, sz, data: new Uint16Array(sx * sy * sz) });
  const idx = (w, x, y, z) => x + z * w.sx + y * w.sx * w.sz;
  const setB = (w, x, y, z, k) => { if (x < 0 || y < 0 || z < 0 || x >= w.sx || y >= w.sy || z >= w.sz) return; w.data[idx(w, x, y, z)] = typeof k === "number" ? k : KEY[k] || 0; };
  const getB = (w, x, y, z) => (x < 0 || y < 0 || z < 0 || x >= w.sx || y >= w.sy || z >= w.sz ? 0 : w.data[idx(w, x, y, z)]);
  const count = (w) => { let n = 0; for (const v of w.data) if (v) n++; return n; };
  const box = (w, x0, y0, z0, x1, y1, z1, k, hollow) => { for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { if (hollow && x > x0 && x < x1 && z > z0 && z < z1) continue; setB(w, x, y, z, k); } };

  // блок-состояние -> id в атласе (точное совпадение, потом по имени блока), иначе камень
  // Палитра хранит состояния ванильных НЕкубических блоков вместе с facing/half/shape.
  // В .zlp порядок свойств может отличаться от порядка в атласе: сравниваем пары, а не строки.
  const properties = (st) => Object.fromEntries((/\[([^\]]+)\]/.exec(st)?.[1] || "").split(",").filter(Boolean).map((pair) => pair.trim().split("=")));
  const canonical = (st) => {
    const base = st.split("[")[0], p = properties(st), keys = Object.keys(p).sort();
    return base + (keys.length ? "[" + keys.map((k) => `${k}=${p[k]}`).join(",") + "]" : "");
  };
  const stateIndex = {}, variants = {};
  B.forEach((b, i) => {
    if (!b || !b.key) return;
    stateIndex[b.key] = i; stateIndex[canonical(b.key)] = i;
    const base = b.key.split("[")[0];
    if (!(base in stateIndex)) stateIndex[base] = i;
    (variants[base] ||= []).push({ i, p: properties(b.key) });
  });
  function stateToVox(st) {
    if (stateIndex[st] || stateIndex[canonical(st)]) return stateIndex[st] || stateIndex[canonical(st)];
    const base = st.split("[")[0], short = base.replace(/^minecraft:/, "");
    if (short === "grass_block" && /snowy=true/.test(st)) return KEY.snowy_grass;
    // Если состояние отличается несущественным свойством (waterlogged, powered),
    // сохраняем ориентацию/половину/форму, а не берём первую форму по имени блока.
    const want = properties(st), choices = variants[base];
    if (choices && Object.keys(want).length) {
      const weight = { facing: 6, half: 6, shape: 5, part: 5, type: 5, axis: 5, open: 4, hanging: 4, face: 4, east: 3, north: 3, south: 3, west: 3 };
      const best = choices.map(({ i, p }) => ({ i, score: Object.entries(want).reduce((s, [k, v]) => s + (p[k] === v ? (weight[k] || 1) : p[k] == null ? 0 : -(weight[k] || 1)), 0) }))
        .sort((a, b) => b.score - a.score)[0];
      if (best && best.score > 0) return best.i;
    }
    return stateIndex[base] || KEY[short] || 0;
  }
  ZM.p13StateIndex = stateToVox; // консольная проверка соответствия сложных block states моделям
  // id атласа -> настоящая строка состояния для чертежа
  function voxToState(id) {
    const k = B[id].key;
    if (k === "snowy_grass") return "minecraft:grass_block[snowy=true]";
    if (/_log$|basalt|crimson_stem|hay_block/.test(k)) return "minecraft:" + k + "[axis=y]";
    return k.includes(":") ? k : "minecraft:" + k;
  }
  const stateItem = (st) => {
    let b = st.split("[")[0]; const short = b.replace(/^minecraft:/, "");
    if (short.endsWith("_wall_sign")) return b.replace("_wall_sign", "_sign");
    if (short.endsWith("_wall_banner")) return b.replace("_wall_banner", "_banner");
    if (short.endsWith("_wall_skull")) return b.replace("_wall_skull", "_skull");
    if (/^(water|lava|powder_snow)_cauldron$/.test(short)) return "minecraft:cauldron";
    if (short === "tripwire") return "minecraft:string";
    if (short.startsWith("potted_")) return "minecraft:" + short.replace("potted_", "");
    return b;
  };

  // встроенный чертёж -> размещения относительно принтера (+1,0,+1), уже отсортированы как в моде
  const builtinCells = (key) => { const r = BUILT.recipes[key]; return r.cells.map((c) => [c[0] + 1, c[1], c[2] + 1, r.vox[c[3]], r.palette[c[3]]]); };
  const priority = (st) => {
    const m = /\[(.*)\]/.exec(st), p = {}; if (m) m[1].split(",").forEach((kv) => { const [a, b] = kv.split("="); p[a] = b; });
    const id = st.split("[")[0];
    if (p.half === "upper" || p.half === "lower") return p.half === "upper" ? 100 : 20;
    if (p.part) return p.part === "head" ? 100 : 20;
    if (p.type === "left" || p.type === "right") return 25;
    if (p.face || p.hanging) return 50;
    if (/button|wall_sign/.test(id)) return 50;
    if (/sign/.test(id)) return 45;
    if (/carpet|tripwire/.test(id)) return 60;
    if (/lantern|end_rod/.test(id)) return 55;
    if (/flower_pot|potted_/.test(id)) return 70;
    return 0;
  };
  // свой чертёж (PlayerStoredPrinterRecipe) -> размещения: от позиции принтера, сортировка как в моде
  const customCells = (r) => r.placements.map((q) => [q[0], q[1], q[2], stateToVox(r.palette[q[3]]) || KEY.stone, r.palette[q[3]]])
    .sort((a, b) => priority(a[4]) - priority(b[4]) || a[1] - b[1] || a[0] - b[0] || a[2] - b[2]);
  // мир под размещения + принтер в (0,0,0)
  function worldOf(cells, pad = 1) {
    let mx = 0, my = 0, mz = 0; for (const c of cells) { mx = Math.max(mx, c[0]); my = Math.max(my, c[1]); mz = Math.max(mz, c[2]); }
    const w = mkWorld(mx + 1 + pad, my + 1, mz + 1 + pad);
    w.data[0] = BUILT.printer;
    for (const c of cells) w.data[idx(w, c[0], c[1], c[2])] = c[3];
    return w;
  }

  /* ================= NBT + gzip: настоящий .zlp =================
     root {fileType:"zitraksmode_printer_recipe", formatVersion:1, exportedAt:long, recipe:{recipeId, displayName, sizeX..Z, createdAt:long,
     palette:[string], placements:[{x,y,z,paletteIndex}], materials:[{item,count}]}} → NbtIo.writeCompressed */
  const NBT = {
    write(root) {
      const out = []; let buf = new Uint8Array(1 << 16), dv = new DataView(buf.buffer), n = 0;
      const need = (k) => { if (n + k <= buf.length) return; let nb = new Uint8Array(Math.max(buf.length * 2, n + k)); nb.set(buf); buf = nb; dv = new DataView(buf.buffer); };
      const u8 = (v) => { need(1); buf[n++] = v; }, i16 = (v) => { need(2); dv.setInt16(n, v); n += 2; }, i32 = (v) => { need(4); dv.setInt32(n, v); n += 4; };
      const i64 = (v) => { need(8); dv.setBigInt64(n, BigInt(Math.round(v))); n += 8; };
      const str = (s) => { const b = new TextEncoder().encode(s); i16(b.length); need(b.length); buf.set(b, n); n += b.length; };
      const typeOf = (v) => (v && v.$t) || (typeof v === "string" ? 8 : Array.isArray(v) ? 9 : typeof v === "object" ? 10 : 3);
      const payload = (t, v) => {
        if (t === 8) str(v); else if (t === 3) i32(v.$t ? v.v : v); else if (t === 4) i64(v.v);
        else if (t === 9) { const et = v.length ? typeOf(v[0]) : 0; u8(et); i32(v.length); v.forEach((e) => payload(et, e)); }
        else if (t === 10) { for (const k in v) { const x = v[k], tt = typeOf(x); u8(tt); str(k); payload(tt, x); } u8(0); }
      };
      u8(10); str(""); payload(10, root); return buf.slice(0, n);
    },
    read(bytes) {
      const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); let n = 0;
      const str = () => { const l = dv.getUint16(n); n += 2; const s = new TextDecoder().decode(bytes.subarray(n, n + l)); n += l; return s; };
      const pay = (t) => {
        switch (t) {
          case 1: return dv.getInt8(n++); case 2: n += 2; return dv.getInt16(n - 2); case 3: n += 4; return dv.getInt32(n - 4);
          case 4: n += 8; return Number(dv.getBigInt64(n - 8)); case 5: n += 4; return dv.getFloat32(n - 4); case 6: n += 8; return dv.getFloat64(n - 8);
          case 7: { const l = dv.getInt32(n); n += 4; const a = bytes.slice(n, n + l); n += l; return a; }
          case 8: return str();
          case 9: { const et = dv.getInt8(n++), l = dv.getInt32(n); n += 4; const a = []; for (let i = 0; i < l; i++) a.push(pay(et)); return a; }
          case 10: { const o = {}; for (;;) { const tt = dv.getInt8(n++); if (!tt) break; const k = str(); o[k] = pay(tt); } return o; }
          case 11: { const l = dv.getInt32(n); n += 4; const a = []; for (let i = 0; i < l; i++) { a.push(dv.getInt32(n)); n += 4; } return a; }
          case 12: { const l = dv.getInt32(n); n += 4; const a = []; for (let i = 0; i < l; i++) { a.push(Number(dv.getBigInt64(n))); n += 8; } return a; }
        }
        throw new Error("битый NBT");
      };
      const t = dv.getInt8(n++); if (t !== 10) throw new Error("это не NBT"); str(); return pay(10);
    },
  };
  const gz = async (bytes, dir) => {
    if (!window.CompressionStream) throw new Error("браузер не умеет gzip (нужен свежий Chrome/Firefox/Safari)");
    const s = new Blob([bytes]).stream().pipeThrough(dir ? new DecompressionStream("gzip") : new CompressionStream("gzip"));
    return new Uint8Array(await new Response(s).arrayBuffer());
  };
  const L = (v) => ({ $t: 4, v });
  const b64 = { enc(bytes) { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }, dec(str) { const s = atob(str), b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; } };
  const LIM = { vol: 200000, blocks: 50000, lib: 20, name: 48 };
  const ZLP = {
    tree(r, at = Date.now()) {
      return { fileType: "zitraksmode_printer_recipe", formatVersion: 1, exportedAt: L(at), recipe: {
        recipeId: r.recipeId, displayName: r.displayName, sizeX: r.sizeX, sizeY: r.sizeY, sizeZ: r.sizeZ, createdAt: L(r.createdAt || at),
        palette: r.palette.slice(), placements: r.placements.map((q) => ({ x: q[0], y: q[1], z: q[2], paletteIndex: q[3] })),
        materials: Object.entries(r.materials).map(([item, c]) => ({ item, count: c })) } };
    },
    async bytes(r) { return gz(NBT.write(ZLP.tree(r))); },
    async parse(bytes) {
      let raw = bytes; if (bytes[0] === 0x1f && bytes[1] === 0x8b) raw = await gz(bytes, true);
      const root = NBT.read(raw), t = root.recipe && typeof root.recipe === "object" ? root.recipe : root;
      const r = { recipeId: t.recipeId, displayName: t.displayName, sizeX: t.sizeX, sizeY: t.sizeY, sizeZ: t.sizeZ, createdAt: t.createdAt || Date.now(),
        palette: t.palette || [], placements: (t.placements || []).map((q) => [q.x, q.y, q.z, q.paletteIndex]), materials: {} };
      (t.materials || []).forEach((m) => { if (m.item && m.count > 0) r.materials[m.item] = m.count; });
      // PlayerStoredPrinterRecipe.isValid()
      if (!r.recipeId || !r.displayName || !(r.sizeX > 0 && r.sizeY > 0 && r.sizeZ > 0) || r.sizeX * r.sizeY * r.sizeZ > LIM.vol || r.placements.length > LIM.blocks
        || (!r.palette.length && r.placements.length) || r.placements.some((q) => q[3] < 0 || q[3] >= r.palette.length)) throw new Error("Файл рецепта повреждён");
      return { r, root };
    },
    fileName(r) {
      const san = (s) => String(s || "").trim().replace(/\s+/g, "_").replace(/[^\p{L}\p{Nd}_\-]+/gu, "");
      const dn = san(r.displayName) || san(r.recipeId) || "printer_recipe", id = san(r.recipeId);
      return (id ? dn + "_" + id : dn) + ".zlp";
    },
    async download(r) {
      const bytes = await ZLP.bytes(r), a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" })); a.download = ZLP.fileName(r);
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      return a.download;
    },
    async link(r) { return location.href.split("#")[0] + "#zlp=" + b64.enc(await ZLP.bytes(r)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); },
    fromLink(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return b64.dec(s); },
  };
  ZM.ZLP = ZLP;

  /* ================= ачивки (advancements/14_3dprint) ================= */
  const ADV = P.advancements, AK = "p13.adv";
  let got = S.get(AK, []).filter((k) => ADV.some((a) => a.key === k)), advSel = null;
  const advIc = (a) => (a.icon === "printer_iso" ? T("printer_iso") : T("i/" + a.icon));
  const titleH = (a) => `<span style="color:${MC[a.color] || "#fff"}">${esc(a.title)}</span>`;
  function grant(key) {
    if (got.includes(key)) return; const a = ADV.find((x) => x.key === key); if (!a) return;
    const i = ADV.indexOf(a); if (i > 0 && !got.includes(ADV[i - 1].key)) { grant(ADV[i - 1].key); } // цепочка: родитель раньше ребёнка
    got.push(key); S.set(AK, got); advSel = key;
    ZM.toast({ iconHtml: `<img src="${advIc(a)}" alt="" style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated">`, title: titleH(a), frame: a.frame });
    if (a.chat) chat(`${ZM.profile.me().nick} получил достижение §a[${a.title}]`);
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
      : `<div class="big"><span class="adv-frame task locked"></span><span class="q">?</span></div><div class="txt"><div class="tt">Скрыто</div><div class="dd">Все ачивки скрыты, как в игре. Начни с крафта принтера.</div></div>`;
    $("#advList").innerHTML = ADV.map((x) => got.includes(x.key)
      ? `<button type="button" class="adv-row has" data-k="${x.key}"><span class="fr"><span class="adv-frame ${x.frame}"></span>${icon(x, 26)}</span><span><span class="t">${titleH(x)}</span><span class="d">${esc(x.desc)}</span></span><em>+${x.xp} XP</em></button>`
      : `<div class="adv-row locked"><span class="fr"><span class="adv-frame task locked"></span><span class="q">?</span></span><span><span class="t">???</span><span class="d">скрытое достижение: откроется, когда получишь</span></span></div>`).join("");
    const done = vis.length;
    $("#advBar").style.width = (done / ADV.length) * 100 + "%";
    $("#advTxt").textContent = `${done} / ${ADV.length} · ${vis.reduce((s, x) => s + x.xp, 0)} XP`;
    $("#stGot").textContent = `${done}/${ADV.length}`;
  }
  $("#advQ").textContent = ADV.length + " " + plural(ADV.length, "ачивка", "ачивки", "ачивок") + " · " + ADV.reduce((s, a) => s + a.xp, 0) + " XP";
  const pickAdv = (e) => { const n = e.target.closest("[data-k]"); if (!n) return; advSel = n.dataset.k; renderAdv(); };
  $("#advChain").addEventListener("click", pickAdv); $("#advList").addEventListener("click", pickAdv);
  $("#advReset").addEventListener("click", () => { got = []; S.set(AK, got); advSel = null; renderAdv(); });
  renderAdv();

  /* ================= фон: сетка + плоттер ================= */
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
        const Pp = (a, b, c) => iso(x + a, y + b, z + c, s, ox, oy);
        const e = [[0, 0, 0, 1, 0, 0], [1, 0, 0, 1, 0, 1], [1, 0, 1, 0, 0, 1], [0, 0, 1, 0, 0, 0], [0, h, 0, 1, h, 0], [1, h, 0, 1, h, 1], [1, h, 1, 0, h, 1], [0, h, 1, 0, h, 0], [0, 0, 0, 0, h, 0], [1, 0, 0, 1, h, 0], [1, 0, 1, 1, h, 1], [0, 0, 1, 0, h, 1]];
        for (const q of e) segs.push([...Pp(q[0], q[1], q[2]), ...Pp(q[3], q[4], q[5])]);
      }
      const a = iso(0, 0, 3.6, s, ox, oy), b = iso(3, 0, 3.6, s, ox, oy);
      return { segs, dim: [a, b, (3 * 16) + "px"], p: 0, fade: 1 };
    }
    for (let i = 0; i < 3; i++) jobs.push(newJob());
    let last = performance.now();
    function frame(t) {
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, (t - last) / 1000); last = t; if (document.hidden) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      const off = ((t - t0) / 1000 * 4) % 24;
      g.lineWidth = 1;
      g.strokeStyle = "rgba(0,162,232,.06)"; g.beginPath();
      for (let x = -off; x < W; x += 24) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); } for (let y = -off; y < H; y += 24) { g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); } g.stroke();
      g.strokeStyle = "rgba(0,162,232,.13)"; g.beginPath();
      for (let x = -off; x < W; x += 120) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); } for (let y = -off; y < H; y += 120) { g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); } g.stroke();
      for (const j of jobs) {
        j.p += dt * 7; const n = j.segs.length;
        if (j.p > n + 6) j.fade -= dt * 0.5;
        g.globalAlpha = Math.max(0, j.fade) * 0.5; g.strokeStyle = "#1fb4f0"; g.lineWidth = 1.2; g.beginPath();
        let pen = null;
        for (let i = 0; i < Math.min(n, j.p); i++) { const s = j.segs[i], f = Math.min(1, j.p - i); g.moveTo(s[0], s[1]); const x = s[0] + (s[2] - s[0]) * f, y = s[1] + (s[3] - s[1]) * f; g.lineTo(x, y); if (f < 1) pen = [x, y]; }
        g.stroke();
        if (pen) { g.fillStyle = "#ff3a40"; g.beginPath(); g.arc(pen[0], pen[1], 2.4, 0, 7); g.fill(); g.fillStyle = "rgba(237,28,36,.28)"; g.beginPath(); g.arc(pen[0], pen[1], 7, 0, 7); g.fill(); }
        if (j.p > n) { const [a, b, lbl] = j.dim; g.strokeStyle = "rgba(0,162,232,.55)"; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.fillStyle = "rgba(150,215,245,.65)"; g.font = "10px JetBrains Mono, monospace"; g.fillText(lbl, (a[0] + b[0]) / 2 + 4, (a[1] + b[1]) / 2 + 12); }
        g.globalAlpha = 1;
      }
      jobs = jobs.filter((j) => j.fade > 0); while (jobs.length < (W < 700 ? 2 : 4)) jobs.push(newJob());
    }
    requestAnimationFrame(frame);
    const cr = $("#cross"), ct = $("#crossTxt");
    addEventListener("pointermove", (e) => { if (e.pointerType !== "mouse") return; cr.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; ct.textContent = `X ${String(Math.round(e.clientX / 16)).padStart(3, "0")} · Y ${String(Math.round((e.clientY + scrollY) / 16)).padStart(4, "0")}`; cr.classList.add("on"); }, { passive: true });
    document.addEventListener("pointerleave", () => cr.classList.remove("on"));
  })();

  /* ================= печать в 3D: общий движок для hero и рабочей зоны =================
     Принтер стоит в (0,0,0). Блоки появляются строго в порядке мода; от красного глазка принтера к ставящемуся блоку идёт луч. */
  function printer(eng, opt = {}) {
    const st = { on: false, k: 0, rate: 20, total: 0, lastSnd: 0, w: null, cells: [], done: null, onBlock: null };
    st.show = (w, cells, ghost) => { // голограмма (превью до печати)
      st.on = false; st.w = w; st.cells = cells; eng.world = w; eng.rebuild(false); eng.drawBlocks = Infinity; eng.ghost = ghost ? 0.42 : 1; eng.setBoxes([]);
      eng.setLines(boundsLines(w, cells, ghost).concat(opt.lines ? opt.lines(w) : []));
    };
    st.start = (w, cells, done) => {
      st.w = w; st.cells = cells; eng.world = w; eng.ghost = 1;
      eng.rebuild(true, [[0, 0, 0]].concat(cells.map((c) => [c[0], c[1], c[2]])));
      st.total = eng.order.length - 1; st.k = 0; st.on = true; st.done = done; eng.drawBlocks = 1;
      eng.setLines(opt.lines ? opt.lines(w) : []);
    };
    st.stop = (finish) => { const was = st.on; st.on = false; eng.drawBlocks = Infinity; eng.setBoxes([]); if (st.w) { eng.world = st.w; eng.rebuild(false); } if (finish && was && st.done) st.done(); };
    st.tick = (dt) => {
      if (!st.on) return;
      const before = Math.floor(st.k); st.k = Math.min(st.total, st.k + dt * st.rate); const now = Math.floor(st.k);
      eng.drawBlocks = 1 + now;
      if (now > before) {
        if (opt.sound && performance.now() - st.lastSnd > 90) { st.lastSnd = performance.now(); const o = eng.order[now]; o && blockSnd(getB(st.w, o[0], o[1], o[2]), 0.26); }
        st.onBlock && st.onBlock(now - 1);
      }
      const o = eng.order[Math.min(st.total, now + 1)] || eng.order[st.total] || [0, 0, 0];
      const pulse = 0.55 + 0.45 * Math.sin(performance.now() / 60);
      eng.setBoxes([
        { min: [o[0] - 0.02, o[1] - 0.02, o[2] - 0.02], max: [o[0] + 1.02, o[1] + 1.02, o[2] + 1.02], c: [0.93, 0.11, 0.14, 0.22 * pulse], flat: 1 },
        { min: [0.38, 0.38, -0.02], max: [0.62, 0.62, 1.02], c: [1, 0.2, 0.22, 0.5 * pulse], flat: 1 },
      ]);
      const L = opt.lines ? opt.lines(st.w) : [];
      L.push([0.5, 0.75, 0.5, o[0] + 0.5, o[1] + 0.5, o[2] + 0.5, 1, 0.25, 0.28, 0.9]);
      L.push([0.5, 0.75, 0.5, o[0] + 0.5, o[1] + 1, o[2] + 0.5, 1, 0.5, 0.5, 0.35]);
      eng.setLines(L);
      if (st.k >= st.total) { st.on = false; eng.drawBlocks = Infinity; eng.setBoxes([]); eng.setLines(opt.lines ? opt.lines(st.w) : []); eng.world = st.w; eng.rebuild(false); st.done && st.done(); }
    };
    st.pct = () => (st.total ? Math.floor((st.k / st.total) * 100) : 0);
    st.layer = () => { const o = eng.order[Math.min(st.total, Math.floor(st.k) + 1)]; return o ? o[1] + 1 : 0; };
    return st;
  }
  // зелёная рамка превью как в Printer3DRenderer (AREA 0,1,0 · 0.45); без чертежа — зона 5×5 от (1,1)
  function boundsLines(w, cells, on = true) {
    let x0 = 1, z0 = 1, x1 = 6, z1 = 6, y1 = 1;
    if (cells && cells.length) { x0 = z0 = 1e9; x1 = z1 = y1 = 0; for (const c of cells) { x0 = Math.min(x0, c[0]); z0 = Math.min(z0, c[2]); x1 = Math.max(x1, c[0] + 1); z1 = Math.max(z1, c[2] + 1); y1 = Math.max(y1, c[1] + 1); } }
    const a = on ? 0.55 : 0.4, c = [0, 1, 0, a];
    const e = [[x0, 0, z0, x1, 0, z0], [x1, 0, z0, x1, 0, z1], [x1, 0, z1, x0, 0, z1], [x0, 0, z1, x0, 0, z0], [x0, y1, z0, x1, y1, z0], [x1, y1, z0, x1, y1, z1], [x1, y1, z1, x0, y1, z1], [x0, y1, z1, x0, y1, z0], [x0, 0, z0, x0, y1, z0], [x1, 0, z0, x1, y1, z0], [x1, 0, z1, x1, y1, z1], [x0, 0, z1, x0, y1, z1]];
    return e.map((q) => [...q, ...c]);
  }
  // сетка «земли» вокруг
  function floorLines(w, step = 1) {
    const L = [], c = [0.0, 0.64, 0.91];
    for (let i = 0; i <= w.sx; i += step) L.push([i, 0.002, 0, i, 0.002, w.sz, ...c, i % 4 ? 0.07 : 0.16]);
    for (let i = 0; i <= w.sz; i += step) L.push([0, 0.002, i, w.sx, 0.002, i, ...c, i % 4 ? 0.07 : 0.16]);
    return L;
  }
  function orbit(cv, eng, o = {}) {
    const onTap = o.onTap || ((o.tap || o.hover || o.rot) ? o : null), min = o.min ?? 6, max = o.max ?? 60;
    let drag = null, pinch = null; const pts = new Map();
    cv.addEventListener("contextmenu", (e) => e.preventDefault());
    cv.addEventListener("pointerdown", (e) => { pts.set(e.pointerId, [e.clientX, e.clientY]); try { cv.setPointerCapture(e.pointerId); } catch (er) {} if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), dist: eng.cam.dist }; drag = null; return; } drag = { x: e.clientX, y: e.clientY, yaw: eng.cam.yaw, pitch: eng.cam.pitch, moved: false, e }; onTap && onTap.down && onTap.down(); });
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
  const frameCam = (eng, w, k = 1.7) => { eng.cam.target = [w.sx / 2, Math.min(w.sy * 0.4, 5), w.sz / 2]; eng.cam.dist = Math.max(8, Math.max(w.sx, w.sy * 1.2, w.sz) * k); };

  /* ================= HERO: принтер сам печатает встроенные чертежи ================= */
  let heroEng = null, heroPr = null, heroI = 0, heroWait = 0;
  const HERO = [["hammer", 1], ["prison", 3], ["dima_house", 9]];
  if (GL_OK) {
    heroEng = VX.create($("#hero3d"), { scale: 1 });
    if (heroEng) {
      heroEng.env.fade = true; heroEng.env.fog = [60, 110]; heroEng.cam.fov = 42; heroEng.cam.pitch = 0.5; heroEng.cam.yaw = 0.75;
      heroPr = printer(heroEng, { lines: (w) => floorLines(w) });
      heroPr.next = () => {
        const [key, sp] = HERO[heroI++ % HERO.length], b = P.builtin.find((x) => x.key === key), cells = builtinCells(key), w = worldOf(cells, 1);
        frameCam(heroEng, w, key === "hammer" ? 2.3 : 1.55);
        $("#heroName").textContent = b.name; heroPr.sp = sp;
        const bx = boundsOf(cells); $(".p3-dims .dx").textContent = "X " + bx[0]; $(".p3-dims .dy").textContent = "Y " + bx[1]; $(".p3-dims .dz").textContent = "Z " + bx[2];
        heroPr.rate = 20 * sp; heroPr.start(w, cells, () => { heroWait = 2.4; });
      };
      heroPr.next();
      orbit($("#hero3d"), heroEng, { min: 8, max: 90 });
    }
  }
  function boundsOf(cells) { let a = [1e9, 1e9, 1e9], b = [0, 0, 0]; for (const c of cells) for (let i = 0; i < 3; i++) { a[i] = Math.min(a[i], c[i]); b[i] = Math.max(b[i], c[i]); } return [b[0] - a[0] + 1, b[1] - a[1] + 1, b[2] - a[2] + 1]; }

  /* ================= I. БЛОК ================= */
  (function block() {
    $("#blkLead").textContent = P.block.lead;
    $("#blkDl").innerHTML = P.block.dl.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
    const tex = T("printer_3d"); $("#blkTex").src = tex;
    $("#blkCube").innerHTML = ["f", "b", "l", "r", "u", "d"].map((f) => `<i class="bf ${f}" style="background-image:url(${tex})"></i>`).join("") + `<i class="blk-led" aria-hidden="true"></i>`;
    const cube = $("#blkCube"), sc = $("#blkScene"); let rx = -22, ry = 35, drag = null, spin = true, last = performance.now();
    const apply = () => (cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`);
    sc.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, rx, ry }; spin = false; try { sc.setPointerCapture(e.pointerId); } catch (er) {} });
    sc.addEventListener("pointermove", (e) => { if (!drag) return; ry = drag.ry + (e.clientX - drag.x) * 0.5; rx = Math.max(-80, Math.min(80, drag.rx - (e.clientY - drag.y) * 0.5)); apply(); });
    sc.addEventListener("pointerup", () => { drag = null; setTimeout(() => (spin = true), 1800); });
    sc.addEventListener("contextmenu", (e) => e.preventDefault());
    (function loop(t) { requestAnimationFrame(loop); const dt = (t - last) / 1000; last = t; if (spin && !drag) { ry += dt * 18; apply(); } })(last);
    // крафт: IRI / PCP / ODO
    const R = P.recipe, cells = R.pattern.join("").split("");
    $("#crGrid").innerHTML = cells.map((ch) => { const id = R.key[ch]; return `<span class="cr-slot" data-tip="${esc(P.names[id])}" data-tip-sub="minecraft:${id}"><img src="${T("i/" + id)}" alt="${esc(P.names[id])}"></span>`; }).join("");
    $("#crRes img").src = T("printer_iso");
    let inv = S.get("p13.inv", 0);
    const drawInv = () => { $("#inv13").innerHTML = Array.from({ length: 9 }, (_, i) => i === 0 && inv ? `<span class="slot13 has" data-tip="3D Принтер" data-tip-sub="zitraksmode:printer_3d"><img src="${T("printer_iso")}" alt="3D-принтер">${inv > 1 ? `<b>${inv}</b>` : ""}</span>` : `<span class="slot13"></span>`).join(""); };
    const take = (n) => { inv = Math.min(64, inv + n); S.set("p13.inv", inv); drawInv(); grant("craft_printer"); };
    $("#crRes").addEventListener("click", () => { take(1); ZM.sfx("pop", 0.5, 1.2); $("#crRes").classList.remove("got"); void $("#crRes").offsetWidth; $("#crRes").classList.add("got"); });
    $("#creativeTake").addEventListener("click", () => { take(1); ZM.sfx("pop", 0.5, 1.4); });
    $("#crCopy").addEventListener("click", () => { ZM.copy("3D Принтер (zitraksmode:printer_3d)\nЖ К Ж   Ж — железный слиток, К — красная пыль\nП С П   П — поршень, С — сундук\nО А О   О — обсидиан, А — алмаз").then(() => say("Рецепт скопирован")); ZM.sfx("click", 0.4, 1.3); });
    drawInv();
  })();

  /* ================= II. GUI принтера (Printer3DScreen) =================
     Рисуется в натуральных координатах 420×256 (внутри ×2 для полупиксельного юникода), масштабируется «пиксельно». */
  const FONT = ZM.MCFONT, fontImg = new Image(); fontImg.onload = () => (G.dirty = true); fontImg.src = FONT.uri;
  const tinted = {};
  function tint(col) {
    if (tinted[col]) return tinted[col];
    if (!fontImg.complete || !fontImg.width) return null;
    const c = document.createElement("canvas"); c.width = fontImg.width; c.height = fontImg.height; const g = c.getContext("2d");
    g.drawImage(fontImg, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
    return (tinted[col] = c);
  }
  const glyph = (ch) => FONT.g[ch] || FONT.g["?"];
  const textW = (s) => { let w = 0; for (const ch of s) w += glyph(ch)[5]; return Math.ceil(w - 1); };
  const shadowOf = (hex) => { const n = parseInt(hex.slice(1), 16); const r = ((n >> 16) & 255) >> 2, gg = ((n >> 8) & 255) >> 2, b = (n & 255) >> 2; return `rgb(${r},${gg},${b})`; };
  function text(g, s, x, y, col = "#ffffff", shadow = false) {
    s = String(s);
    if (shadow) text(g, s, x + 1, y + 1, shadowOf(col), false);
    const img = tint(col); if (!img) return;
    let cx = x;
    for (const ch of s) {
      const [gx, gy, gw, gh, sc, adv] = glyph(ch);
      if (ch !== " ") g.drawImage(img, gx, gy, gw, gh, cx, y, gw / sc, gh / sc);
      cx += adv;
    }
  }
  const textC = (g, s, cx, y, col, sh = true) => text(g, s, Math.round(cx - textW(s) / 2), y, col, sh);
  const shorten = (s, n) => (s.length <= n ? s : s.slice(0, Math.max(0, n - 1)) + "…");
  const fill = (g, x0, y0, x1, y1, col) => { g.fillStyle = col; g.fillRect(x0, y0, x1 - x0, y1 - y0); };

  const BUILTIN = P.builtin;
  const DEF_INV = [["cobblestone", 64], ["stone", 64], ["obsidian", 64], ["obsidian", 64], ["obsidian", 64], ["obsidian", 64], ["iron_bars", 16], ["blackstone_stairs", 8], ["lightning_rod", 4],
    ["sea_lantern", 8], ["black_bed", 1], ["flower_pot", 4], ["spruce_sapling", 4], ["oak_planks", 64], ["white_wool", 32], ["glass", 16]];
  const st0 = S.get("p13.st", null);
  const G = {
    dirty: true, mode: "print", dlg: null, sel: null, custScroll: 0, matScroll: 0, invRow: 0, mx: -1, my: -1, focus: null, shareScroll: 0, impScroll: 0,
    storage: new Array(540).fill(null), inv: new Array(36).fill(null), lib: [], folder: [], ench: { zaebis: 0, nahuya: 0, baryga: 0 }, game: "survival", next: 1,
    bargain: null, printing: false, pct: 0, scan: { name: "", x: "12", y: "12", z: "12" }, rename: "",
  };
  if (st0) {
    (st0.storage || []).forEach(([i, id, n]) => (G.storage[i] = { id, n })); (st0.inv || []).forEach(([i, id, n]) => (G.inv[i] = { id, n }));
    G.lib = st0.lib || []; G.folder = st0.folder || []; Object.assign(G.ench, st0.ench || {}); G.game = st0.game || "survival"; G.next = st0.next || 1; G.sel = st0.sel || null;
  } else DEF_INV.forEach(([id, n], i) => (G.inv[i < 27 ? i + 9 : i - 27] = { id: "minecraft:" + id, n }));
  function save() {
    const pack = (a) => a.map((s, i) => s && [i, s.id, s.n]).filter(Boolean);
    try { S.set("p13.st", { storage: pack(G.storage), inv: pack(G.inv), lib: G.lib, folder: G.folder.slice(-12), ench: G.ench, game: G.game, next: G.next, sel: G.sel }); } catch (e) { say("Хранилище браузера забито: часть чертежей не сохранится", true); }
  }
  // склад
  const countIn = (arr, id) => arr.reduce((s, x) => s + (x && x.id === id ? x.n : 0), 0);
  function insert(arr, id, n) {
    const mx = maxStack(id);
    for (const s of arr) if (n > 0 && s && s.id === id && s.n < mx) { const k = Math.min(mx - s.n, n); s.n += k; n -= k; }
    for (let i = 0; i < arr.length && n > 0; i++) if (!arr[i]) { const k = Math.min(mx, n); arr[i] = { id, n: k }; n -= k; }
    return n; // сколько не влезло
  }
  function take(arr, id, n) { for (let i = arr.length - 1; i >= 0 && n > 0; i--) { const s = arr[i]; if (s && s.id === id) { const k = Math.min(s.n, n); s.n -= k; n -= k; if (!s.n) arr[i] = null; } } return n; }

  // выбранный чертёж
  const selBuiltin = () => (G.sel && G.sel.t === "b" ? BUILTIN.find((b) => b.key === G.sel.k) : null);
  const selCustom = () => (G.sel && G.sel.t === "c" ? G.lib.find((r) => r.recipeId === G.sel.k) : null);
  function materials() {
    const b = selBuiltin(); if (b) return b.cost.map(([id, n]) => ["minecraft:" + id, n]);
    const c = selCustom(); if (c) return Object.entries(c.materials);
    return null;
  }
  // Барыга: скидка max(1, round(n*p)), платить минимум 1
  const discounted = (id, n) => (G.bargain && G.bargain.id === id ? Math.max(1, n - Math.max(1, Math.round(n * (G.bargain.pct / 100)))) : n);
  function reroll() {
    const lv = G.ench.baryga, m = materials(); G.bargain = null; if (!lv || !m) return;
    const th = lv === 1 ? 20 : 10, el = m.filter(([, n]) => n > th); if (!el.length) return;
    G.bargain = { id: el[(Math.random() * el.length) | 0][0], pct: lv === 1 ? 5 : 10 };
  }
  const effective = () => (materials() || []).map(([id, n]) => [id, discounted(id, n)]);
  const enough = () => effective().every(([id, n]) => countIn(G.storage, id) >= n);
  const cellsOfSel = () => { const b = selBuiltin(); if (b) return builtinCells(b.key); const c = selCustom(); return c ? customCells(c) : null; };
  const selTitle = () => { const b = selBuiltin(); if (b) return b.name; const c = selCustom(); return c ? c.displayName : "3D Принтер"; };
  const rate = () => (G.ench.zaebis ? 10 : 20) * (G.ench.nahuya ? 2 : 1); // блоков в секунду: тик 1/20 с, Заебись — раз в 2 тика, Нахуя? — по 2 за раз

  function select(sel) {
    if (G.printing) return;
    G.sel = sel; G.matScroll = 0; reroll(); save(); G.dirty = true;
    ZM.sfx("click", 0.45, 1.2);
    stageShow();
  }
  function autofill() {
    const m = effective(); if (!m.length) return;
    let moved = 0;
    for (const [id, n] of m) {
      const need = n - countIn(G.storage, id); if (need <= 0) continue;
      if (G.game === "creative") { insert(G.storage, id, need); moved += need; continue; }
      const can = Math.min(need, countIn(G.inv, id)); if (!can) continue;
      const left = insert(G.storage, id, can); take(G.inv, id, can - left); moved += can - left;
    }
    if (moved) { ZM.sfx("equip", 0.5, 1.1); ZM.sfx("chest_close", 0.25, 1.4); } else ZM.sfx("click", 0.3, 0.7);
    save(); G.dirty = true;
  }
  function give() {
    const m = effective(); if (!m.length) { say("Сначала выбери чертёж в принтере", true); return; }
    let over = 0;
    for (const [id, n] of m) { const need = n - countIn(G.storage, id) - countIn(G.inv, id); if (need > 0) over += insert(G.inv, id, need); }
    ZM.sfx("pop", 0.5, 0.9); save(); G.dirty = true;
    chat(over ? "§cИнвентарь полон, часть не влезла" : "§7[Сервер: выдано всё, что нужно для «" + shorten(selTitle(), 28) + "»]");
  }
  function startPrint() {
    if (G.printing) return; const cells = cellsOfSel(); if (!cells || !cells.length) return;
    if (!enough()) { ZM.sfx("click", 0.35, 0.6); chat("§7(не хватает материалов — принтер молча не стартует, красные цифры справа)"); return; }
    for (const [id, n] of effective()) take(G.storage, id, n); // всё списывается сразу
    G.printing = true; G.pct = 0; G.printKey = G.sel && G.sel.t === "b" ? G.sel.k : null; save(); G.dirty = true;
    snd("out", 0.6); snd("activate", 0.22, 1.3);
    stagePrint(cells);
  }
  function printDone() {
    G.printing = false; G.pct = 100; G.dirty = true; snd("in", 0.6); snd("deactivate", 0.2, 1.4); ZM.sfx("levelup", 0.3);
    const b = G.printKey && BUILTIN.find((x) => x.key === G.printKey); if (b) grant(b.adv);
    say("Печать завершена"); G.printKey = null; stageShow(true);
  }
  // свои чертежи
  function addRecipe(r, from) {
    if (G.lib.length >= LIM.lib) { chat("§c" + P.msgs.full); ZM.sfx("anvil", 0.25); return false; }
    r = JSON.parse(JSON.stringify(r)); if (G.lib.some((x) => x.recipeId === r.recipeId)) r.recipeId = "player_scan_" + G.next++;
    G.lib.push(r); save(); G.dirty = true; return r;
  }
  async function exportSel() {
    const r = selCustom(); if (!r) { chat("§cНет выбранного кастомного рецепта для экспорта"); return; }
    try {
      const name = await ZLP.download(r);
      if (!G.folder.some((f) => f.file === name)) G.folder.push({ file: name, r: JSON.parse(JSON.stringify(r)) }); save();
      chat("§aРецепт экспортирован: §e" + name); drawSnd(); zlpShow(r);
    } catch (e) { chat("§cОшибка экспорта: " + e.message); }
  }
  function deleteSel() { const r = selCustom(); if (!r) return; G.lib = G.lib.filter((x) => x !== r); G.sel = null; G.bargain = null; save(); G.dirty = true; chat("§eРецепт удалён"); ZM.sfx("stone", 0.4, 0.8); stageShow(); }
  function importFile(f) { const r = addRecipe(f.r); if (r) { select({ t: "c", k: r.recipeId }); G.dlg = null; syncInput(); drawSnd(); zlpShow(r); } }

  // игроки онлайн для «Поделиться»
  const ONLINE = ["Kolyan228", "Zhmyh_TV", "Barsik_Pro", "Alex", "Steve", "Nagibator3000", "Vovan"];
  function shareTo(name) {
    const r = selCustom(); if (!r) return;
    const full = name === "Nagibator3000"; // у него уже 20 рецептов
    G.dlg = null; syncInput(); G.dirty = true;
    if (full) { chat("§cУ игрока уже максимум рецептов"); ZM.sfx("anvil", 0.2); return; }
    chat("§a" + fmt(P.msgs.shareOut, r.displayName, name)); ZM.sfx("orb", 0.4, 1.4);
  }

  /* ---------- рисование ---------- */
  const gcv = $("#guiCv"), gg = gcv.getContext("2d"), Q = 2; gcv.width = 420 * Q; gcv.height = 256 * Q;
  const steve = new Image(); steve.onload = () => (G.dirty = true); steve.src = U("assets/textures/mc/steve.png");
  const inR = (x, y, w, h) => G.mx >= x && G.mx < x + w && G.my >= y && G.my < y + h;
  let hit = [], tip = null;
  const btn = (x, y, w, h, label, kind, act, opt = {}) => {
    const hov = inR(x, y, w, h) && !opt.off;
    const C = { fancy: ["#333377", "#5555AA"], auto: ["#227722", "#33AA33"], icon: ["#404060", "#6A6A9A"], print: ["#884400", "#CC8800"] }[kind];
    let bg = hov ? C[1] : C[0]; if (kind === "print" && G.printing) bg = "#00AA00";
    fill(gg, x, y, x + w, y + h, bg);
    if (kind === "print" && G.printing) fill(gg, x + 2, y + h - 3, x + 2 + Math.floor((w - 4) * (G.pct / 100)), y + h - 1, "#00FF00");
    textC(gg, label, x + w / 2, y + (kind === "print" ? 5 : 4), "#FFFFFF");
    if (!opt.off) hit.push({ x, y, w, h, act, tip: opt.tip });
  };
  function item(stack, x, y) {
    if (!stack) return;
    const im = itemImg(stack.id); if (im.complete && im.naturalWidth) { gg.imageSmoothingEnabled = im.naturalWidth > 32; gg.drawImage(im, x, y, 16, 16); gg.imageSmoothingEnabled = false; }
    if (stack.n > 1) { const s = String(stack.n); text(gg, s, x + 19 - 2 - textW(s), y + 6 + 3, "#FFFFFF", true); }
  }
  const slotHover = (x, y) => { if (inR(x, y, 16, 16)) fill(gg, x, y, x + 16, y + 16, "rgba(255,255,255,.5)"); };
  function editBox(x, y, w, h, val, key, ph) {
    fill(gg, x - 1, y - 1, x + w + 1, y + h + 1, G.focus === key ? "#FFFFFF" : "#A0A0A0"); fill(gg, x, y, x + w, y + h, "#000000");
    const show = val || (G.focus === key ? "" : ph || "");
    text(gg, shorten(show, Math.floor((w - 8) / 5.5)), x + 4, y + (h - 8) / 2, val ? "#E0E0E0" : "#707070", true);
    if (G.focus === key && Math.floor(performance.now() / 300) % 2) text(gg, "_", x + 4 + textW(val) + 1, y + (h - 8) / 2, "#E0E0E0", true);
    hit.push({ x, y, w, h, act: () => focusBox(key, x, y, w, h) });
  }
  function overlay(x, y, w, h, bg) { fill(gg, x, y, x + w, y + h, bg); fill(gg, x, y, x + w, y + 1, "#5A5A5A"); fill(gg, x, y + h - 1, x + w, y + h, "#5A5A5A"); fill(gg, x, y, x + 1, y + h, "#5A5A5A"); fill(gg, x + w - 1, y, x + w, y + h, "#5A5A5A"); }
  function mcTooltip(lines, mx, my) {
    const w = Math.max(...lines.map((l) => textW(l[0]))) + 0, h = lines.length * 10 - 2 + (lines.length > 1 ? 2 : 0);
    let x = mx + 12, y = my - 12; if (x + w + 4 > 420) x = mx - 16 - w; if (y + h + 4 > 256) y = 256 - h - 4; if (y < 4) y = 4;
    fill(gg, x - 3, y - 4, x + w + 3, y - 3, "rgba(16,0,16,.94)"); fill(gg, x - 3, y + h + 3, x + w + 3, y + h + 4, "rgba(16,0,16,.94)");
    fill(gg, x - 3, y - 3, x + w + 3, y + h + 3, "rgba(16,0,16,.94)"); fill(gg, x - 4, y - 3, x - 3, y + h + 3, "rgba(16,0,16,.94)"); fill(gg, x + w + 3, y - 3, x + w + 4, y + h + 3, "rgba(16,0,16,.94)");
    const gr = gg.createLinearGradient(0, y - 3, 0, y + h + 3); gr.addColorStop(0, "rgba(80,0,255,.31)"); gr.addColorStop(1, "rgba(40,0,127,.31)");
    gg.fillStyle = gr; gg.fillRect(x - 3, y - 2, 1, h + 4); gg.fillRect(x + w + 2, y - 2, 1, h + 4); gg.fillRect(x - 3, y - 3, w + 6, 1); gg.fillRect(x - 3, y + h + 2, w + 6, 1);
    lines.forEach(([s, c], i) => text(gg, s, x, y + i * 10 + (i ? 2 : 0), c || "#FFFFFF", true));
  }
  const stackTip = (s) => [[itemName(s.id), "#FFFFFF"], [s.id.includes(":") ? s.id : "minecraft:" + s.id, "#555555"]];

  function renderGui() {
    const g = gg; hit = []; tip = null;
    g.setTransform(Q, 0, 0, Q, 0, 0); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 420, 256);
    if (G.mode === "scan") return renderScan();
    fill(g, 0, 0, 420, 256, "#141414");
    fill(g, 0, 0, 420, 2, "#000"); fill(g, 0, 254, 420, 256, "#000"); fill(g, 0, 0, 2, 256, "#000"); fill(g, 418, 0, 420, 256, "#000");
    fill(g, 6, 22, 94, 150, "#232323"); fill(g, 98, 22, 266, 126, "#1F1F1F"); fill(g, 286, 22, 414, 152, "#232323");
    const modal = !!G.dlg;
    // склад принтера 9×5 (листается строками: 540 слотов = 60 строк)
    for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) {
      const x = 104 + c * 18, y = 30 + r * 18, i = (G.invRow + r) * 9 + c; fill(g, x, y, x + 16, y + 16, "#353535");
      item(G.storage[i], x, y);
      if (!modal) { slotHover(x, y); hit.push({ x, y, w: 16, h: 16, act: () => moveStack(G.storage, i, G.inv), stack: G.storage[i] }); }
    }
    // полоса прокрутки склада
    fill(g, 268, 30, 270, 118, "#1E1E1E"); const th = Math.max(8, Math.floor(88 * 5 / 60)), tr = 88 - th; fill(g, 268, 30 + Math.floor(tr * G.invRow / 55), 270, 30 + Math.floor(tr * G.invRow / 55) + th, "#AAAAAA");
    // инвентарь игрока (фона у слотов в моде нет)
    for (let i = 0; i < 36; i++) {
      const x = 8 + (i % 9) * 18, y = i < 27 ? 154 + Math.floor(i / 9) * 18 : 212, k = i < 27 ? i + 9 : i - 27;
      fill(g, x - 1, y - 1, x + 17, y + 17, "#181818");
      item(G.inv[k], x, y);
      if (!modal) { slotHover(x, y); hit.push({ x, y, w: 16, h: 16, act: () => moveStack(G.inv, k, G.storage), stack: G.inv[k] }); }
    }
    // заголовки
    text(g, selTitle(), 100, 8, "#FFFFFF"); text(g, "Рецепты", 16, 8, "#D0D0D0"); text(g, "Материалы", 308, 8, "#D0D0D0");
    // встроенные
    BUILTIN.forEach((b, i) => btn(8, 24 + i * 20, 82, 16, b.btn, "fancy", () => select({ t: "b", k: b.key }), { off: modal }));
    // «Мои»
    text(g, "Мои", 10, 86, "#DADADA");
    const showImp = G.lib.length < 10, total = G.lib.length + (showImp ? 1 : 0), vis = Math.min(3, total), maxS = Math.max(0, total - 3);
    G.custScroll = Math.min(G.custScroll, maxS);
    for (let i = 0; i < vis; i++) {
      const k = G.custScroll + i, x1 = 8, y1 = 98 + i * 18, hov = !modal && G.mx >= x1 && G.mx <= 88 && G.my >= y1 && G.my <= y1 + 16;
      if (k < G.lib.length) {
        const r = G.lib[k], on = G.sel && G.sel.t === "c" && G.sel.k === r.recipeId;
        fill(g, x1, y1, 88, y1 + 16, on ? "#4E6FD1" : hov ? "#474781" : "#313131"); text(g, shorten(r.displayName, 11), x1 + 3, y1 + 4, "#FFFFFF");
        if (!modal) hit.push({ x: x1, y: y1, w: 80, h: 16, act: () => select({ t: "c", k: r.recipeId }), tip: r.displayName.length > 11 ? r.displayName : null });
      } else {
        fill(g, x1, y1, 88, y1 + 16, hov ? "#575757" : "#3B3B3B"); textC(g, "+", 48, y1 + 4, "#FFFFFF");
        if (!modal) hit.push({ x: x1, y: y1, w: 80, h: 16, act: () => openDlg("import"), tip: "Импортировать рецепт из файла" });
      }
    }
    if (total > 3) { const bh = 52; fill(g, 90, 98, 92, 98 + bh, "#1E1E1E"); const t = Math.max(8, Math.floor(bh * 3 / total)), tv = Math.max(1, bh - t); const ty = 98 + (maxS ? Math.floor(tv * G.custScroll / maxS) : 0); fill(g, 90, ty, 92, ty + t, "#AAAAAA"); }
    // материалы
    const m = materials();
    if (m) {
      const list = m.slice().sort((a, b) => b[1] - a[1]), mS = Math.max(0, list.length - 8); G.matScroll = Math.min(G.matScroll, mS);
      for (let i = G.matScroll, yo = 0; i < list.length && i < G.matScroll + 8; i++, yo += 14) {
        const [id, need] = list[i], dn = discounted(id, need), have = countIn(G.storage, id), ix = 296, iy = 32 + yo;
        item({ id, n: 1 }, ix, iy); if (inR(ix, iy, 16, 16) && !modal) tip = stackTip({ id });
        const hp = have + "/", tx = 316, ty = 33 + yo; text(g, hp, tx, ty, have >= dn ? "#55FF55" : "#FF5555"); let nx = tx + textW(hp) + 1;
        if (dn !== need) { const o = String(need); text(g, o, nx, ty, "#FF5555"); const ow = textW(o); fill(g, nx, ty + 3, nx + ow, ty + 4, "#FF5555"); text(g, " " + dn, nx + ow + 2, ty, "#55FF55"); }
        else text(g, String(need), nx, ty, "#FFFFFF");
      }
      if (list.length > 8) { fill(g, 402, 32, 404, 140, "#1E1E1E"); const t = Math.max(8, Math.floor(108 * 8 / list.length)); const ty = 32 + (mS ? Math.floor((108 - t) * G.matScroll / mS) : 0); fill(g, 402, ty, 404, ty + t, "#AAAAAA"); }
    }
    if (G.bargain) text(g, shorten(`Скидка ${G.bargain.pct}%: ${itemName(G.bargain.id)}`, 17), 292, 140, "#55FF55");
    // кнопки
    btn(100, 126, 80, 16, "Авто", "auto", autofill, { off: modal });
    btn(314, 230, 90, 18, "▶ Печать", "print", startPrint, { off: modal });
    if (G.printing) textC(g, `Печать: ${G.pct}%`, 210, 236, "#00FF66");
    if (!modal) btn(366, 6, 44, 16, "Скан", "fancy", () => { G.mode = "scan"; G.dirty = true; ZM.sfx("click", 0.4); });
    if (selCustom()) {
      btn(226, 8, 16, 16, "⇩", "icon", exportSel, { off: modal, tip: "Экспортировать рецепт в файл" });
      btn(246, 8, 16, 16, "✖", "icon", deleteSel, { off: modal, tip: "Удалить рецепт" });
      btn(266, 8, 16, 16, "✎", "icon", () => { G.rename = selCustom().displayName; openDlg("rename"); }, { off: modal, tip: "Переименовать рецепт" });
      btn(286, 8, 16, 16, "↗", "icon", () => openDlg("share"), { off: modal, tip: "Поделиться рецептом" });
    }
    // диалоги
    if (G.dlg === "rename") {
      overlay(132, 86, 176, 66, "rgba(16,16,16,.93)"); text(g, "Переименовать", 144, 96, "#FFFFFF");
      editBox(150, 106, 130, 16, G.rename, "rename");
      btn(150, 128, 56, 18, "OK", "fancy", confirmRename); btn(224, 128, 70, 18, "Отмена", "fancy", () => { G.dlg = null; syncInput(); G.dirty = true; });
    }
    if (G.dlg === "share") {
      overlay(112, 36, 196, 154, "rgba(16,16,16,.93)"); text(g, "Поделиться рецептом", 124, 46, "#FFFFFF"); text(g, "Выбери игрока:", 124, 60, "#D0D0D0");
      const me = ZM.profile.me().nick, pl = ONLINE.filter((n) => n !== me), ms = Math.max(0, pl.length - 6); G.shareScroll = Math.min(G.shareScroll, ms);
      for (let i = 0; i < Math.min(6, pl.length); i++) {
        const n = pl[G.shareScroll + i], x1 = 122, y1 = 74 + i * 16, hov = G.mx >= x1 && G.mx <= 296 && G.my >= y1 && G.my < y1 + 14;
        fill(g, x1, y1, 296, y1 + 14, hov ? "#3C3C68" : "#2A2A2A");
        if (steve.complete && steve.naturalWidth) { g.drawImage(steve, 8, 8, 8, 8, x1 + 3, y1 + 1, 12, 12); g.drawImage(steve, 40, 8, 8, 8, x1 + 3, y1 + 1, 12, 12); }
        text(g, n, x1 + 22, y1 + 3, "#FFFFFF"); hit.push({ x: x1, y: y1, w: 174, h: 14, act: () => shareTo(n) });
      }
      if (pl.length > 6) { fill(g, 298, 74, 300, 170, "#1E1E1E"); const t = Math.floor(96 * 6 / pl.length); const ty = 74 + (ms ? Math.floor((96 - t) * G.shareScroll / ms) : 0); fill(g, 298, ty, 300, ty + t, "#AAAAAA"); }
      btn(168, 172, 84, 18, "Закрыть", "fancy", () => { G.dlg = null; G.dirty = true; });
    }
    if (G.dlg === "import") {
      overlay(102, 34, 208, 154, "rgba(16,16,16,.93)"); text(g, "Импорт рецепта", 114, 44, "#FFFFFF");
      text(g, shorten("Папка: ./zitraksmode/printer_exports", 34), 114, 58, "#AAAAAA"); text(g, "Выбери файл:", 114, 70, "#D0D0D0");
      const F = G.folder, ms = Math.max(0, F.length - 5); G.impScroll = Math.min(G.impScroll, ms);
      if (!F.length) text(g, "Нет файлов экспорта", 114, 90, "#888888");
      for (let i = 0; i < Math.min(5, F.length); i++) {
        const f = F[G.impScroll + i], x1 = 112, y1 = 84 + i * 16, hov = G.mx >= x1 && G.mx <= 300 && G.my >= y1 && G.my < y1 + 14, r = f.r;
        fill(g, x1, y1, 300, y1 + 14, hov ? "#3C3C68" : "#2A2A2A");
        text(g, shorten(`${r.displayName} [${r.sizeX}x${r.sizeY}x${r.sizeZ}]`, 30), x1 + 4, y1 + 3, "#FFFFFF");
        hit.push({ x: x1, y: y1, w: 188, h: 14, act: () => importFile(f), tip: f.file });
      }
      btn(160, 170, 96, 18, "Закрыть", "fancy", () => { G.dlg = null; G.dirty = true; });
    }
    // тултипы
    if (!tip) { for (let i = hit.length - 1; i >= 0; i--) { const h = hit[i]; if (inR(h.x, h.y, h.w, h.h)) { if (h.stack) tip = stackTip(h.stack); else if (h.tip) tip = [[h.tip, "#FFFFFF"]]; break; } } }
    if (tip) mcTooltip(tip, G.mx, G.my);
  }
  function renderScan() {
    const g = gg, gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(16,16,16,.75)"); gr.addColorStop(1, "rgba(16,16,16,.82)"); g.fillStyle = gr; g.fillRect(0, 0, 420, 256);
    const x = 104, y = 28; overlay(x, y, 226, 164, "rgba(17,17,17,.93)");
    text(g, "Сканер области", x + 12, y + 10, "#FFFFFF"); text(g, "Имя:", x + 12, y + 28, "#CFCFCF");
    editBox(118, 68, 198, 14, G.scan.name, "name", "Название");
    text(g, "Размеры от принтера", x + 12, y + 62, "#AAAAAA");
    textC(g, "X", x + 38, y + 80, "#FFFFFF"); textC(g, "Y", x + 99, y + 80, "#FFFFFF"); textC(g, "Z", x + 160, y + 80, "#FFFFFF");
    editBox(120, 120, 44, 14, G.scan.x, "x"); editBox(181, 120, 44, 14, G.scan.y, "y"); editBox(242, 120, 44, 14, G.scan.z, "z");
    text(g, "1,1,1 = первый блок рабочей зоны", x + 12, y + 116, "#8FD98F"); text(g, "слева-спереди от принтера", x + 12, y + 128, "#8FD98F");
    btn(120, 164, 166, 16, "Сканировать", "fancy", () => doScan(G.scan.name, +G.scan.x, +G.scan.y, +G.scan.z));
    btn(366, 6, 44, 16, "Назад", "fancy", () => { G.mode = "print"; G.focus = null; syncInput(); G.dirty = true; ZM.sfx("click", 0.4); });
  }
  function moveStack(from, i, to) {
    const s = from[i]; if (!s) return;
    const left = insert(to, s.id, s.n); if (left === s.n) { ZM.sfx("click", 0.3, 0.6); return; }
    if (left) s.n = left; else from[i] = null;
    ZM.sfx("pop", 0.3, 1.6); save(); G.dirty = true;
  }
  function openDlg(d) { G.dlg = d; G.shareScroll = G.impScroll = 0; G.dirty = true; ZM.sfx("click", 0.4); if (d === "rename") { const r = selCustom(); focusBox("rename", 150, 106, 130, 16); } }
  function confirmRename() {
    const r = selCustom(), n = G.rename.trim(); if (!r) return;
    if (!n) { chat("§cВведите название рецепта"); return; }
    r.displayName = n.slice(0, LIM.name); save(); G.dlg = null; G.focus = null; syncInput(); G.dirty = true;
    chat(`§aРецепт переименован в "${r.displayName}"`); ZM.sfx("orb", 0.3, 1.6); zlpShow(r);
  }

  /* ---------- ввод ---------- */
  const inp = $("#guiInput");
  function focusBox(key, x, y, w, h) {
    G.focus = key; const vals = { name: G.scan.name, x: G.scan.x, y: G.scan.y, z: G.scan.z, rename: G.rename };
    inp.hidden = false; inp.value = vals[key] || ""; inp.maxLength = key.length === 1 ? 4 : 48; inp.inputMode = key.length === 1 ? "numeric" : "text";
    Object.assign(inp.style, { left: (x / 420) * 100 + "%", top: (y / 256) * 100 + "%", width: (w / 420) * 100 + "%", height: (h / 256) * 100 + "%" });
    inp.focus({ preventScroll: true }); G.dirty = true;
  }
  function syncInput() { if (!G.focus) { inp.hidden = true; inp.blur(); } }
  inp.addEventListener("input", () => {
    let v = inp.value; if (G.focus && G.focus.length === 1) { v = v.replace(/\D/g, "").slice(0, 4); inp.value = v; }
    if (G.focus === "rename") G.rename = v; else if (G.focus) G.scan[G.focus] = v; G.dirty = true;
  });
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { if (G.focus === "rename") confirmRename(); else if (G.mode === "scan") doScan(G.scan.name, +G.scan.x, +G.scan.y, +G.scan.z); }
    if (e.key === "Escape") { G.focus = null; syncInput(); G.dirty = true; }
    if (e.key === "Tab" && G.mode === "scan") { e.preventDefault(); const ord = ["name", "x", "y", "z"], n = ord[(ord.indexOf(G.focus) + 1) % 4]; const R = { name: [118, 68, 198, 14], x: [120, 120, 44, 14], y: [181, 120, 44, 14], z: [242, 120, 44, 14] }[n]; focusBox(n, ...R); }
  });
  inp.addEventListener("blur", () => setTimeout(() => { if (document.activeElement !== inp) { G.focus = null; inp.hidden = true; G.dirty = true; } }, 120));
  let guiRot = false; // на телефоне в полноэкранном режиме окно повёрнуто на 90° (альбомная раскладка)
  const toNative = (e) => { const r = gcv.getBoundingClientRect(); return guiRot ? [((e.clientY - r.top) / r.height) * 420, ((r.right - e.clientX) / r.width) * 256] : [((e.clientX - r.left) / r.width) * 420, ((e.clientY - r.top) / r.height) * 256]; };
  gcv.addEventListener("pointermove", (e) => { [G.mx, G.my] = toNative(e); G.dirty = true; });
  gcv.addEventListener("pointerleave", () => { G.mx = G.my = -1; G.dirty = true; });
  gcv.addEventListener("click", (e) => {
    [G.mx, G.my] = toNative(e); renderGui();
    for (let i = hit.length - 1; i >= 0; i--) { const h = hit[i]; if (inR(h.x, h.y, h.w, h.h)) { if (!/^(name|x|y|z|rename)$/.test(G.focus || "") || true) { if (!h.act.toString().includes("focusBox")) { G.focus = null; syncInput(); } } h.act(); G.dirty = true; return; } }
    G.focus = null; syncInput(); G.dirty = true;
  });
  gcv.addEventListener("wheel", (e) => {
    const [x, y] = toNative(e), d = e.deltaY > 0 ? 1 : -1; let used = true;
    if (G.dlg === "share") G.shareScroll = Math.max(0, G.shareScroll + d);
    else if (G.dlg === "import") G.impScroll = Math.max(0, G.impScroll + d);
    else if (x >= 6 && x < 94 && y >= 96 && y < 152) G.custScroll = Math.max(0, G.custScroll + d);
    else if (x >= 286 && x < 414 && y >= 22 && y < 152) G.matScroll = Math.max(0, G.matScroll + d);
    else if (x >= 98 && x < 272 && y >= 22 && y < 126) G.invRow = Math.max(0, Math.min(55, G.invRow + d));
    else used = false;
    if (used && G.mode === "print") { e.preventDefault(); G.dirty = true; }
  }, { passive: false });
  // масштаб окна: целые шаги на ПК, на телефоне — во всю ширину с прокруткой
  function fitGui() {
    const wrap = $("#guiWrap"), box = $("#guiBox"), W = wrap.clientWidth, mob = innerWidth < 700;
    if (wrap.classList.contains("full")) {
      const vw = innerWidth, vh = innerHeight; guiRot = vh > vw;
      const k = guiRot ? Math.min((vh - 24) / 420, (vw - 56) / 256) : Math.min((vw - 24) / 420, (vh - 24) / 256);
      box.style.width = 420 * k + "px"; box.style.height = 256 * k + "px"; box.style.transform = `translate(-50%,-50%)${guiRot ? " rotate(90deg)" : ""}`; wrap.classList.remove("pan"); return;
    }
    guiRot = false; box.style.transform = "";
    let k = mob ? Math.max(W / 420, 1.45) : Math.min(3, Math.max(1, Math.floor((W / 420) * 2) / 2));
    box.style.width = 420 * k + "px"; box.style.height = 256 * k + "px"; wrap.classList.toggle("pan", 420 * k > W + 1);
  }
  addEventListener("resize", fitGui); fitGui();
  const guiPh = document.createComment("gui");
  const guiFull = (on) => {
    const w = $("#guiWrap");
    if (on && !w.classList.contains("full")) { w.replaceWith(guiPh); document.body.appendChild(w); }
    if (!on && guiPh.parentNode) guiPh.replaceWith(w);
    w.classList.toggle("full", on); document.documentElement.classList.toggle("gui-lock", on);
    G.focus = null; syncInput(); fitGui(); G.dirty = true; ZM.sfx(on ? "chest_open" : "chest_close", 0.35);
  };
  $("#guiFull").addEventListener("click", () => guiFull(true)); $("#guiX").addEventListener("click", () => guiFull(false));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && $("#guiWrap").classList.contains("full")) guiFull(false); });
  // режим, /give, чары
  $$(".gui-mode button").forEach((b) => { b.classList.toggle("on", b.dataset.mode === G.game); b.addEventListener("click", () => { G.game = b.dataset.mode; $$(".gui-mode button").forEach((x) => x.classList.toggle("on", x === b)); save(); }); });
  $("#giveBtn").addEventListener("click", give);
  function drawEnch() {
    const E = P.ench;
    $("#guiEnch").innerHTML = `<span class="ge-h">Чары на принтере:</span>` + E.map((e) => {
      const v = G.ench[e.key], lab = e.key === "baryga" ? (v ? `${e.name} ${v === 1 ? "I" : "II"}` : e.name) : e.name;
      return `<button type="button" class="ge ${v ? "on" : ""} ${e.curse ? "curse" : ""}" data-e="${e.key}" style="--c:${e.color}" title="${esc(e.d)}">${esc(lab)}</button>`;
    }).join("") + `<span class="ge-r" id="geRate"></span>`;
    $("#geRate").textContent = `${rate()} блоков/с`;
    $("#wzRate").innerHTML = rateHtml();
  }
  $("#guiEnch").addEventListener("click", (e) => {
    const b = e.target.closest("[data-e]"); if (!b || G.printing) return; const k = b.dataset.e;
    G.ench[k] = k === "baryga" ? (G.ench[k] + 1) % 3 : G.ench[k] ? 0 : 1;
    if (k === "baryga") reroll();
    ZM.sfx(G.ench[k] ? "enchant" : "click", 0.4); save(); drawEnch(); G.dirty = true; if (pr) pr.rate = rate() * showSpeed;
  });
  const rateHtml = () => {
    const c = cellsOfSel(), n = c ? c.length : 0, r = rate();
    return `<b>${r}</b> блоков/с${G.ench.zaebis && G.ench.nahuya ? " · Заебись и Нахуя? гасят друг друга" : G.ench.zaebis ? " · Заебись: блок раз в 2 тика" : G.ench.nahuya ? " · Нахуя?: 2 блока за тик" : " · 1 блок за тик"}` +
      (n ? `<br>этот чертёж в игре: <b>${(n / r).toFixed(1).replace(".", ",")} с</b> на ${n} ${plural(n, "блок", "блока", "блоков")}` : "");
  };

  /* ================= рабочая зона: голограмма → печать ================= */
  let wzEng = null, pr = null, showSpeed = 1, ordT = 0;
  if (GL_OK) {
    wzEng = VX.create($("#wz3d"), { scale: 1 });
    if (wzEng) {
      wzEng.env.fade = true; wzEng.env.fog = [50, 100]; wzEng.cam.fov = 45; wzEng.cam.pitch = 0.62; wzEng.cam.yaw = 0.8;
      pr = printer(wzEng, { sound: true, lines: (w) => floorLines(w) });
      orbit($("#wz3d"), wzEng, { min: 5, max: 90 });
    }
  }
  function stageShow(built) {
    if (!pr) return;
    const cells = cellsOfSel();
    const hint = $("#wzHint");
    $("#wzHud").hidden = !built; if (built) { $("#wzPct").textContent = "Печать: 100%"; $("#wzBar").style.width = "100%"; $("#wzTxt").textContent = "готово · можно ломать, в игре"; }
    if (!cells) { const w = mkWorld(7, 1, 7); w.data[0] = BUILT.printer; frameCam(wzEng, w, 1.9); pr.show(w, [], true); hint.textContent = "выбери чертёж в окне принтера: здесь появится голограмма"; hint.hidden = false; $("#wzOrd").innerHTML = ""; }
    else { const w = worldOf(cells, 1); frameCam(wzEng, w, 1.5); pr.show(w, cells, !built); hint.textContent = built ? "напечатано" : "голограмма: так встанет постройка"; hint.hidden = !!built && false; orderList(cells, 0); }
    $("#wzRate").innerHTML = rateHtml();
  }
  function stagePrint(cells) {
    if (!pr) { // без WebGL — просто считаем проценты
      let k = 0; const n = cells.length, iv = setInterval(() => { k = Math.min(n, k + rate() * showSpeed / 10); G.pct = Math.floor((k / n) * 100); G.dirty = true; if (k >= n) { clearInterval(iv); printDone(); } }, 100); return;
    }
    const w = worldOf(cells, 1); frameCam(wzEng, w, 1.5);
    pr.rate = rate() * showSpeed; pr.start(w, cells, printDone);
    $("#wzHint").hidden = true; $("#wzHud").hidden = false;
  }
  function orderList(cells, k) {
    const PR = { 100: "верх", 20: "низ", 25: "двойной", 45: "табличка", 50: "на стене", 55: "фонарь", 60: "ковёр", 70: "горшок" };
    $("#wzOrd").innerHTML = cells.slice(k, k + 7).map((c, i) => { const p = priority(c[4]); return `<li class="${i ? "" : "now"}"><img src="${itemSrc(stateItem(c[4]))}" data-it="${esc(stateItem(c[4]))}" alt=""><span>${esc(itemName(stateItem(c[4])))}</span><em>${c[0]},${c[1]},${c[2]}${p ? " · " + PR[p] : ""}</em></li>`; }).join("") || `<li class="now"><span>всё на месте</span></li>`;
  }
  $("#wzSpeed").addEventListener("click", (e) => {
    const b = e.target.closest("[data-s]"); if (!b) return; showSpeed = +b.dataset.s;
    $$("#wzSpeed button").forEach((x) => x.classList.toggle("on", x === b)); if (pr) pr.rate = rate() * showSpeed;
  });

  /* ================= III. встроенные чертежи ================= */
  let thumbEng = null; const thumbs = {};
  function thumbOf(cells, cb) {
    if (!GL_OK) return cb(null);
    const go = () => {
      const w = worldOf(cells, 0); thumbEng.world = w; thumbEng.rebuild(false); thumbEng.ghost = 1; thumbEng.cam.yaw = 0.78; thumbEng.cam.pitch = 0.5;
      // кадр по описанной сфере постройки: влезает целиком при любом повороте, без обрезанных голов и башен
      const lo = [0, 0, 0], hi = [1, 1, 1]; cells.forEach((c) => { for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], c[i]); hi[i] = Math.max(hi[i], c[i] + 1); } }); // с принтером в углу
      const b = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], r = 0.5 * Math.hypot(b[0], b[1], b[2]);
      thumbEng.cam.target = [lo[0] + b[0] / 2, lo[1] + b[1] / 2, lo[2] + b[2] / 2]; thumbEng.cam.dist = Math.max(4, (r / Math.sin((thumbEng.cam.fov * Math.PI) / 360)) * 0.97);
      thumbEng.render(); cb(thumbEng.snapshot(448));
    };
    if (!thumbEng) { thumbEng = VX.create($("#thumb3d"), { preserve: true, onReady: () => { thumbEng.ready = true; (thumbEng.q || []).forEach((f) => f()); thumbEng.q = []; } }); if (!thumbEng) return cb(null); thumbEng.env.fade = false; thumbEng.cam.fov = 38; thumbEng.q = []; }
    if (thumbEng.ready) go(); else thumbEng.q.push(go);
  }
  (function built() {
    $("#btGrid").innerHTML = BUILTIN.map((b, i) => {
      const cells = builtinCells(b.key), dim = boundsOf(cells), a = ADV.find((x) => x.key === b.adv), tot = b.cost.reduce((s, c) => s + c[1], 0);
      return `<article class="bt reveal" data-k="${b.key}" style="--d:${i * 90}ms">
        <div class="bt-pic"><img alt="${esc(b.name)}" data-th="${b.key}"><span class="bt-n">0${i + 1}</span><span class="bt-dim">${dim.join("×")}</span></div>
        <div class="bt-b">
          <div class="bt-h"><h3>${esc(b.name)}</h3><span class="bt-btn">кнопка «${esc(b.btn)}»</span></div>
          <div class="bt-stats"><div><b>${fmtN(cells.length)}</b><span>${plural(cells.length, "блок", "блока", "блоков")}</span></div><div><b>${b.layers}</b><span>${plural(b.layers, "слой", "слоя", "слоёв")}</span></div><div><b>${(cells.length / 20).toFixed(1).replace(".", ",")} с</b><span>печать</span></div></div>
          <ul class="bt-cost">${b.cost.map(([id, n]) => `<li data-tip="${esc(itemName(id))}" data-tip-sub="minecraft:${id}"><img src="${itemSrc("minecraft:" + id)}" data-it="${esc("minecraft:" + id)}" alt=""><b>${fmtN(n)}</b></li>`).join("")}</ul>
          <p class="bt-note">${esc(b.note)}</p>
          <div class="bt-f"><span class="bt-adv">${got.includes(b.adv) ? titleH(a) : "??? · скрытая ачивка"}</span><button type="button" class="p3-btn sm" data-go="${b.key}">В принтер</button></div>
        </div></article>`;
    }).join("");
    BUILTIN.forEach((b) => thumbOf(builtinCells(b.key), (u) => { const im = $(`[data-th="${b.key}"]`); if (u) im.src = u; else im.src = T("printer_iso"); }));
    $("#btGrid").addEventListener("click", (e) => { const g = e.target.closest("[data-go]"); if (!g) return; select({ t: "b", k: g.dataset.go }); $("#gui").scrollIntoView({ behavior: "smooth", block: "center" }); });
  })();
  function fmtN(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

  /* ================= общий цикл ================= */
  const vis = new Map();
  const io = new IntersectionObserver((es) => es.forEach((e) => vis.set(e.target, e.isIntersecting)), { rootMargin: "120px" });
  ["#hero3d", "#wz3d", "#guiCv", "#stu3d"].forEach((s) => $(s) && io.observe($(s)));
  const seen = (s) => vis.get($(s)) !== false;
  let lastT = performance.now(), guiT = 0;
  function loop(t) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (t - lastT) / 1000); lastT = t; if (document.hidden) return;
    if (heroEng) {
      if (heroPr.on) heroPr.tick(dt); else if (heroWait > 0 && (heroWait -= dt) <= 0) heroPr.next();
      if (!heroPr.on) { heroEng.cam.yaw += dt * 0.12; heroEng.dirty = true; }
      $("#heroBar").style.width = (heroPr.on ? heroPr.pct() : 100) + "%";
      $("#heroTxt").textContent = heroPr.on ? `${heroPr.pct()}% · слой ${heroPr.layer()} · ×${heroPr.sp}` : "готово";
      if (seen("#hero3d") && heroEng.dirty !== false) heroEng.render();
    }
    if (pr) {
      if (pr.on) {
        pr.tick(dt); G.pct = Math.min(99, pr.pct()); G.dirty = true;
        $("#wzPct").textContent = `Печать: ${G.pct}%`; $("#wzBar").style.width = G.pct + "%";
        $("#wzTxt").textContent = `блок ${Math.floor(pr.k)} из ${pr.total} · слой ${pr.layer()}`;
        if (t - ordT > 120) { ordT = t; orderList(pr.cells, Math.floor(pr.k)); }
      } else if (!pr.drag && wzEng.ghost < 1) { wzEng.cam.yaw += dt * 0.08; wzEng.dirty = true; }
      if (seen("#wz3d") && wzEng.dirty) wzEng.render();
    }
    if (stuTick) stuTick(dt);
    if (seen("#guiCv") && (G.dirty || G.focus || G.printing) && t - guiT > 30) { guiT = t; G.dirty = false; renderGui(); }
  }
  let stuTick = null;
  drawEnch();

  /* ================= IV. сканер: рабочая зона со стройкой ================= */
  const STU = { N: 12, w: null, disp: null, tool: "place", cur: KEY.stone || 1, undo: [], redo: [], slice: 99, hover: null, eng: null, loaded: null };
  const SZ = $("#size"); if (!SZ.querySelector('[value="24"]')) SZ.insertAdjacentHTML("beforeend", `<option value="24">24³</option>`);
  const PAL = []; { const seenN = new Set(); B.forEach((b, i) => { if (!b || !i || !b.name || i === BUILT.printer || b.water) return; if (seenN.has(b.name)) return; seenN.add(b.name); PAL.push(i); }); }
  function stuWorld(N, keep) {
    const w = mkWorld(N + 2, N, N + 2); w.data[0] = BUILT.printer;
    if (keep) for (let y = 0; y < Math.min(N, keep.sy); y++) for (let z = 0; z < Math.min(w.sz, keep.sz); z++) for (let x = 0; x < Math.min(w.sx, keep.sx); x++) { const v = getB(keep, x, y, z); if (v && !(x === 0 && y === 0 && z === 0)) setB(w, x, y, z, v); }
    return w;
  }
  STU.w = stuWorld(STU.N);
  const saved = S.get("p13.stu", null);
  if (saved && saved.N) { STU.N = saved.N; STU.w = stuWorld(STU.N); saved.c.forEach(([x, y, z, st]) => setB(STU.w, x, y, z, stateToVox(st))); SZ.value = STU.N; }
  else { // стартовая стройка: маленький домик
    const w = STU.w; box(w, 2, 0, 2, 6, 0, 6, "oak_planks"); box(w, 2, 1, 2, 6, 3, 6, "cobblestone", true); box(w, 2, 4, 2, 6, 4, 6, "oak_planks");
    setB(w, 4, 1, 2, 0); setB(w, 4, 2, 2, 0); setB(w, 2, 2, 4, KEY.glass || 0); setB(w, 6, 2, 4, KEY.glass || 0);
  }
  let stuSaveT = 0;
  function stuSave() { clearTimeout(stuSaveT); stuSaveT = setTimeout(() => { const c = []; const w = STU.w; for (let y = 0; y < w.sy; y++) for (let z = 0; z < w.sz; z++) for (let x = 0; x < w.sx; x++) { const v = getB(w, x, y, z); if (v && (x || y || z)) c.push([x, y, z, voxToState(v)]); } try { S.set("p13.stu", { N: STU.N, c }); } catch (e) {} }, 400); }
  function stuRefresh() {
    const w = STU.w; let d = w;
    if (STU.slice < w.sy) { d = mkWorld(w.sx, w.sy, w.sz); for (let i = 0; i < w.data.length; i++) if (Math.floor(i / (w.sx * w.sz)) < STU.slice) d.data[i] = w.data[i]; }
    STU.disp = d;
    if (STU.eng) { STU.eng.world = d; STU.eng.rebuild(false); stuLines(); }
    stuBom(); stuSave();
  }
  function stuLines() {
    const N = STU.N, w = STU.w, X = Math.max(1, +$("#scX").value || 0), Y = Math.max(1, +$("#scY").value || 0), Z = Math.max(1, +$("#scZ").value || 0);
    const L = floorLines(w);
    const zone = boundsLines(null, [[1, 0, 1], [Math.min(X, N + 1), Math.min(Y, N) - 1, Math.min(Z, N + 1)]]);
    zone.forEach((s) => { s[6] = 0.33; s[7] = 1; s[8] = 0.4; s[9] = 0.8; });
    STU.eng.setLines(L.concat(zone));
    if (STU.slice < w.sy) { const y = STU.slice; STU.eng.setLines(L.concat(zone, [[0, y, 0, w.sx, y, 0, 1, 0.8, 0.2, 0.7], [w.sx, y, 0, w.sx, y, w.sz, 1, 0.8, 0.2, 0.7], [w.sx, y, w.sz, 0, y, w.sz, 1, 0.8, 0.2, 0.7], [0, y, w.sz, 0, y, 0, 1, 0.8, 0.2, 0.7]])); }
  }
  function stuSet(list) { // list: [[x,y,z,v]]
    const w = STU.w, rec = [];
    for (const [x, y, z, v] of list) { if (x < 1 || z < 1 || x >= w.sx || z >= w.sz || y < 0 || y >= w.sy) continue; const o = getB(w, x, y, z); if (o === v) continue; rec.push([x, y, z, o, v]); setB(w, x, y, z, v); }
    if (!rec.length) return false; STU.undo.push(rec); if (STU.undo.length > 200) STU.undo.shift(); STU.redo = []; stuRefresh(); return true;
  }
  function stuUndo(r) { const a = r ? STU.redo : STU.undo, b = r ? STU.undo : STU.redo, rec = a.pop(); if (!rec) return; for (const [x, y, z, o, v] of rec) setB(STU.w, x, y, z, r ? v : o); b.push(rec); stuRefresh(); ZM.sfx("click", 0.3, r ? 1.3 : 0.9); }
  $("#undo").addEventListener("click", () => stuUndo(false)); $("#redo").addEventListener("click", () => stuUndo(true));
  $("#clear").addEventListener("click", () => { const l = []; const w = STU.w; for (let y = 0; y < w.sy; y++) for (let z = 1; z < w.sz; z++) for (let x = 1; x < w.sx; x++) if (getB(w, x, y, z)) l.push([x, y, z, 0]); if (stuSet(l)) ZM.sfx("stone", 0.5, 0.7); });
  addEventListener("keydown", (e) => { if (e.target.closest && e.target.closest("input,textarea,select")) return; if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") { if (!STU.hoverIn) return; e.preventDefault(); stuUndo(e.shiftKey); } if ((e.ctrlKey || e.metaKey) && e.code === "KeyY" && STU.hoverIn) { e.preventDefault(); stuUndo(true); } });
  SZ.addEventListener("change", () => { STU.N = +SZ.value; STU.w = stuWorld(STU.N, STU.w); STU.undo = []; STU.redo = []; $("#slice").max = STU.N; STU.slice = 99; $("#slice").value = STU.N; $("#sliceV").textContent = "все"; ["scX", "scY", "scZ"].forEach((id) => ($("#" + id).value = STU.N)); stuFrame(); stuRefresh(); stuLim(); });
  $$("[data-tool]").forEach((b) => b.addEventListener("click", () => { STU.tool = b.dataset.tool; $$("[data-tool]").forEach((x) => x.classList.toggle("on", x === b)); }));
  $("#slice").addEventListener("input", (e) => { const v = +e.target.value; STU.slice = v >= STU.N ? 99 : v; $("#sliceV").textContent = STU.slice === 99 ? "все" : "≤ " + v; stuRefresh(); });
  // палитра
  function drawPal() {
    const q = $("#palQ").value.trim().toLowerCase();
    const list = PAL.filter((i) => !q || B[i].name.toLowerCase().includes(q) || String(B[i].key).includes(q)).slice(0, 160);
    $("#pal").innerHTML = list.map((i) => `<button type="button" class="pl ${i === STU.cur ? "on" : ""}" data-v="${i}" data-tip="${esc(B[i].name)}" data-tip-sub="${esc(voxToState(i).replace(/\[.*/, ""))}"><img src="${isoIcon(i, 32) || missing()}" alt="${esc(B[i].name)}"></button>`).join("") || `<p class="pl-none">ничего</p>`;
    $("#palCur").innerHTML = `<img src="${isoIcon(STU.cur, 32) || missing()}" alt=""><span>${esc(B[STU.cur].name)}</span><em>${esc(voxToState(STU.cur))}</em>`;
  }
  $("#palQ").addEventListener("input", drawPal);
  $("#pal").addEventListener("click", (e) => { const b = e.target.closest("[data-v]"); if (!b) return; STU.cur = +b.dataset.v; drawPal(); ZM.sfx("click", 0.3, 1.5); if (STU.tool !== "place") $('[data-tool="place"]').click(); });
  // спецификация
  function scanCells(X, Y, Z, w = STU.w) {
    const out = []; for (let y = 0; y < Y; y++) for (let x = 1; x <= X; x++) for (let z = 1; z <= Z; z++) { const v = getB(w, x, y, z); if (v) out.push([x, y, z, v]); }
    return out;
  }
  function matsOf(states) { const m = {}; for (const st of states) { if (/half=upper|part=head/.test(st) && !/slab|stairs/.test(st)) continue; const it = stateItem(st); m[it] = (m[it] || 0) + 1; } return m; }
  function stuBom() {
    const X = +$("#scX").value || STU.N, Y = +$("#scY").value || STU.N, Z = +$("#scZ").value || STU.N;
    const cells = scanCells(X, Y, Z), m = Object.entries(matsOf(cells.map((c) => voxToState(c[3])))).sort((a, b) => b[1] - a[1]);
    $("#bom").innerHTML = `<div class="bom-h"><b>Попадёт в чертёж</b><span>${fmtN(cells.length)} ${plural(cells.length, "блок", "блока", "блоков")} · ${m.length} ${plural(m.length, "материал", "материала", "материалов")}</span></div><ul>` +
      m.slice(0, 40).map(([id, n]) => `<li data-tip="${esc(itemName(id))}" data-tip-sub="${esc(id)}"><img src="${itemSrc(id)}" data-it="${esc(id)}" alt=""><b>${n}</b></li>`).join("") + (m.length > 40 ? `<li class="more">+${m.length - 40}</li>` : "") + `</ul>`;
    $("#stuQ").textContent = `${STU.N}×${STU.N}×${STU.N}`;
    stuLim(cells.length);
  }
  function stuLim(n) {
    const X = +$("#scX").value || 0, Y = +$("#scY").value || 0, Z = +$("#scZ").value || 0, v = X * Y * Z;
    if (n == null) n = scanCells(X, Y, Z).length;
    const bar = (a, b, l) => `<div class="lm ${a > b ? "over" : ""}"><span>${l}</span><i><em style="width:${Math.min(100, (a / b) * 100)}%"></em></i><b>${fmtN(a)} / ${fmtN(b)}</b></div>`;
    $("#scLim").innerHTML = bar(v, LIM.vol, "объём скана") + bar(n, LIM.blocks, "блоков в чертеже") + bar(G.lib.length, LIM.lib, "чертежей в принтере");
  }
  ["scX", "scY", "scZ"].forEach((id) => $("#" + id).addEventListener("input", (e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4); if (STU.eng) stuLines(); stuBom(); }));
  // скан — PrinterRecipeScanner
  function doScan(name, X, Y, Z) {
    name = String(name || "").trim();
    if (!name) { chat("§cВведите название рецепта"); ZM.sfx("click", 0.3, 0.6); return null; }
    if (!(X > 0 && Y > 0 && Z > 0)) { chat("§cРазмеры должны быть больше нуля"); return null; }
    if (X * Y * Z > LIM.vol) { chat("§c" + P.msgs.scanBig); ZM.sfx("anvil", 0.2); return null; }
    const cells = scanCells(X, Y, Z);
    if (!cells.length) { chat("§c" + P.msgs.scanEmpty); return null; }
    if (cells.length > LIM.blocks) { chat("§c" + P.msgs.scanMany); return null; }
    if (G.lib.length >= LIM.lib) { chat("§c" + P.msgs.full); ZM.sfx("anvil", 0.2); return null; }
    const pal = [], pi = {}, states = [];
    const placements = cells.map(([x, y, z, v]) => { const st = voxToState(v); states.push(st); if (!(st in pi)) { pi[st] = pal.length; pal.push(st); } return [x, y, z, pi[st]]; });
    const r = { recipeId: "player_scan_" + G.next++, displayName: name.slice(0, LIM.name), sizeX: X, sizeY: Y, sizeZ: Z, createdAt: Date.now(), palette: pal, placements, materials: matsOf(states) };
    const ok = addRecipe(r); if (!ok) return null;
    chat("§a" + fmt(P.msgs.scanOk, ok.displayName, placements.length)); drawSnd(); snd("in", 0.4, 1.3);
    G.mode = "print"; G.focus = null; syncInput(); select({ t: "c", k: ok.recipeId }); zlpShow(ok); stuLim(); say(`«${ok.displayName}» в принтере`);
    return ok;
  }
  $("#scGo").addEventListener("click", () => { doScan($("#scName").value, +$("#scX").value, +$("#scY").value, +$("#scZ").value); });
  $("#scName").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#scGo").click(); });
  // загрузка чертежа в зону
  function loadRecipe(cells, label) {
    let mx = 0, my = 0, mz = 0; for (const c of cells) { mx = Math.max(mx, c[0]); my = Math.max(my, c[1] + 1); mz = Math.max(mz, c[2]); }
    const need = Math.max(mx, my, mz), N = [8, 12, 16, 24].find((n) => n >= need) || 24;
    STU.N = N; SZ.value = N; STU.w = stuWorld(N); for (const c of cells) setB(STU.w, c[0], c[1], c[2], c[3]);
    STU.undo = []; STU.redo = []; STU.slice = 99; $("#slice").max = N; $("#slice").value = N; $("#sliceV").textContent = "все";
    $("#scX").value = Math.min(N, mx); $("#scY").value = Math.min(N, my); $("#scZ").value = Math.min(N, mz); if (label) $("#scName").value = label;
    stuFrame(); stuRefresh();
  }
  const PRE = BUILTIN.map((b) => ({ n: b.name, k: b.key, cells: () => builtinCells(b.key) }));
  $("#presets").innerHTML = `<span class="pr-h">Загрузить в зону:</span>` + PRE.map((p, i) => `<button type="button" class="pr-b" data-p="${i}">${esc(p.n)}</button>`).join("") + `<button type="button" class="pr-b" data-p="file">.zlp с диска</button>`;
  $("#presets").addEventListener("click", (e) => { const b = e.target.closest("[data-p]"); if (!b) return; if (b.dataset.p === "file") { zlpPick("studio"); return; } const p = PRE[+b.dataset.p]; loadRecipe(p.cells(), p.n); drawSnd(); ZM.sfx("stone", 0.4); });
  // 3D и мышь
  function stuFrame() { if (!STU.eng) return; const w = STU.w; STU.eng.cam.target = [w.sx / 2, Math.min(3, w.sy / 3), w.sz / 2]; STU.eng.cam.dist = w.sx * 1.75; }
  if (GL_OK) {
    const cv = $("#stu3d"), E = (STU.eng = VX.create(cv, { scale: 1 }));
    if (E) {
      E.env.fade = true; E.env.fog = [60, 120]; E.cam.fov = 45; E.cam.pitch = 0.7; E.cam.yaw = 0.75; stuFrame();
      const target = (e, place) => {
        const r = cv.getBoundingClientRect(), h = E.pick(e.clientX - r.left, e.clientY - r.top); if (!h) return null;
        if (!place) return h.ground ? null : [h.x, h.y, h.z];
        return h.ground ? [h.x, 0, h.z] : [h.x + h.n[0], h.y + h.n[1], h.z + h.n[2]];
      };
      const act = (e, btnNo) => {
        let tool = btnNo === 2 || e.shiftKey ? "break" : btnNo === 1 || e.altKey ? "pick" : STU.tool;
        if (tool === "pick") { const t = target(e, false); if (t) { const v = getB(STU.w, ...t); if (v && v !== BUILT.printer) { STU.cur = v; drawPal(); ZM.sfx("click", 0.3, 1.6); } } return; }
        if (tool === "break") { const t = target(e, false); if (t && !(t[0] === 0 && t[2] === 0 && t[1] === 0)) { const v = getB(STU.w, ...t); if (stuSet([[...t, 0]])) blockSnd(v, 0.5); } return; }
        const t = target(e, true); if (t && t[1] < STU.slice && stuSet([[...t, STU.cur]])) blockSnd(STU.cur, 0.5);
      };
      let downBtn = 0;
      cv.addEventListener("pointerdown", (e) => { downBtn = e.button; });
      orbit(cv, E, {
        min: 5, max: 90,
        tap: (e) => act(e, downBtn),
        hover: (e) => { if (e.pointerType !== "mouse") return; const t = target(e, STU.tool === "place" && !e.shiftKey); STU.hover = t; E.setBoxes(t ? [{ min: [t[0] - 0.005, t[1] - 0.005, t[2] - 0.005], max: [t[0] + 1.005, t[1] + 1.005, t[2] + 1.005], c: STU.tool === "break" || e.shiftKey ? [1, 0.25, 0.25, 0.28] : [0.3, 0.8, 1, 0.22], flat: 1 }] : []); },
      });
      cv.addEventListener("pointerenter", () => (STU.hoverIn = true)); cv.addEventListener("pointerleave", () => { STU.hoverIn = false; E.setBoxes([]); });
      cv.addEventListener("auxclick", (e) => e.preventDefault()); cv.addEventListener("mousedown", (e) => { if (e.button === 1) e.preventDefault(); });
      stuTick = () => { if (seen("#stu3d") && E.dirty) E.render(); };
      // перетаскивание .zlp
      const view = $("#stuView");
      view.addEventListener("dragover", (e) => { e.preventDefault(); view.classList.add("drop"); });
      view.addEventListener("dragleave", () => view.classList.remove("drop"));
      view.addEventListener("drop", (e) => { e.preventDefault(); view.classList.remove("drop"); const f = e.dataTransfer.files[0]; if (f) readZlp(f, "studio"); });
    }
  }
  drawPal(); stuRefresh();

  /* ================= V. .zlp ================= */
  const k$ = (n, fb = "stone") => KEY[n] || KEY[fb] || 1;
  function recipeFromCells(cells, name, id) {
    const pal = [], pi = {}, st = [];
    const placements = cells.map(([x, y, z, v, s]) => { s = s || voxToState(v); st.push(s); if (!(s in pi)) { pi[s] = pal.length; pal.push(s); } return [x, y, z, pi[s]]; });
    const b = boundsOf(cells.map((c) => [c[0], c[1], c[2]]));
    let mx = 0, my = 0, mz = 0; cells.forEach((c) => { mx = Math.max(mx, c[0]); my = Math.max(my, c[1] + 1); mz = Math.max(mz, c[2]); });
    return { recipeId: id || "player_scan_" + Math.floor(Math.random() * 90 + 10), displayName: name, sizeX: mx || b[0], sizeY: my || b[1], sizeZ: mz || b[2], createdAt: Date.now(), palette: pal, placements, materials: matsOf(st) };
  }
  let zlCur = null;
  const TAG = { 3: "Int", 4: "Long", 8: "String", 9: "List", 10: "Compound" };
  function nbtHtml(k, v, depth) {
    const t = v && v.$t ? v.$t : typeof v === "string" ? 8 : Array.isArray(v) ? 9 : typeof v === "object" ? 10 : 3;
    const key = k != null ? `<span class="nk">${esc(k)}</span>` : "";
    if (t === 10 || t === 9) {
      const ent = t === 10 ? Object.entries(v) : v.map((x, i) => [i, x]), lim = t === 9 && ent.length > 8 ? 6 : ent.length;
      const kids = ent.slice(0, lim).map(([kk, x]) => nbtHtml(t === 9 ? null : kk, x, depth + 1)).join("") + (lim < ent.length ? `<div class="nl more">… ещё ${fmtN(ent.length - lim)}</div>` : "");
      return `<details class="nd" ${depth < 2 ? "open" : ""}><summary><span class="nt t${t}">${TAG[t]}</span>${key}<span class="nc">${t === 9 ? ent.length + " " + plural(ent.length, "элемент", "элемента", "элементов") : ent.length + " " + plural(ent.length, "поле", "поля", "полей")}</span></summary>${kids}</details>`;
    }
    const val = t === 4 ? `${v.v}L <i>${new Date(v.v).toLocaleString("ru-RU")}</i>` : t === 8 ? `"${esc(v)}"` : String(v);
    return `<div class="nl"><span class="nt t${t}">${TAG[t]}</span>${key}<span class="nv">${val}</span></div>`;
  }
  async function zlpShow(r) {
    zlCur = r;
    const tree = ZLP.tree(r); let size = 0;
    try { size = (await ZLP.bytes(r)).length; } catch (e) {}
    $("#zlpQ").textContent = size ? fmtN(size) + " " + plural(size, "байт", "байта", "байт") + " gzip" : "gzip NBT";
    $("#zlPath").innerHTML = `<span>.minecraft/</span><span>zitraksmode/</span><span>printer_exports/</span><b>${esc(ZLP.fileName(r))}</b>`;
    $("#zlTree").innerHTML = nbtHtml(null, tree, 0);
    const n = r.placements.length, m = Object.keys(r.materials).length;
    $("#zlCur").innerHTML = `<img alt="" id="zlTh"><div><b>${esc(r.displayName)}</b><span>${esc(r.recipeId)}</span><em>${r.sizeX}×${r.sizeY}×${r.sizeZ} · ${fmtN(n)} ${plural(n, "блок", "блока", "блоков")} · ${m} ${plural(m, "материал", "материала", "материалов")} · палитра ${r.palette.length}</em></div>`;
    thumbOf(customCells(r), (u) => { const im = $("#zlTh"); if (im) im.src = u || T("printer_iso"); });
  }
  $("#zlSteps").innerHTML = [
    ["⇩", "В игре", "выбери свой чертёж в «Мои» и жми ⇩: файл упадёт в папку игры <code>zitraksmode/printer_exports</code>"],
    ["+", "Обратно", "положи чужой .zlp в ту же папку, в принтере жми «+» и выбери его из списка"],
    ["↗", "Отсюда", "скачанный здесь файл кидаешь туда же: игра его примет как свой"],
  ].map(([i, t, d]) => `<div class="zs"><b>${i}</b><div><span>${t}</span><p>${d}</p></div></div>`).join("");
  $("#zlDl").addEventListener("click", async () => { if (!zlCur) return; try { const f = await ZLP.download(zlCur); say("Скачан " + f); drawSnd(); } catch (e) { say(e.message, true); } });
  $("#zlLink").addEventListener("click", async () => { if (!zlCur) return; try { const l = await ZLP.link(zlCur); if (l.length > 60000) { say("Чертёж слишком большой для ссылки, кидай файлом", true); return; } await ZM.copy(l); say("Ссылка скопирована: откроет этот чертёж"); ZM.sfx("orb", 0.3, 1.5); } catch (e) { say(e.message, true); } });
  let pickMode = "view";
  function zlpPick(mode) { pickMode = mode; $("#zlpFile").value = ""; $("#zlpFile").click(); }
  $("#zlOpen").addEventListener("click", () => zlpPick("view"));
  $("#zlpFile").addEventListener("change", (e) => { const f = e.target.files[0]; if (f) readZlp(f, pickMode); });
  async function readZlp(f, mode) {
    try {
      const { r } = await ZLP.parse(new Uint8Array(await f.arrayBuffer()));
      const file = f.name || ZLP.fileName(r);
      G.folder = G.folder.filter((x) => x.file !== file); G.folder.push({ file, r }); save(); G.dirty = true;
      zlpShow(r); drawSnd();
      if (mode === "studio") loadRecipe(customCells(r).map((c) => [c[0], c[1], c[2], c[3]]), r.displayName);
      if (mode === "gui") { importFile({ file, r }); return; }
      say(`«${r.displayName}» в папке экспорта: в принтере жми «+»`);
    } catch (e) { say(e.message || "Файл рецепта повреждён", true); chat("§cФайл рецепта повреждён"); }
  }
  (async function fromHash() {
    const m = /[#&]zlp=([\w-]+)/.exec(location.hash); if (!m) return;
    try { const { r } = await ZLP.parse(ZLP.fromLink(m[1])); const file = ZLP.fileName(r); if (!G.folder.some((x) => x.file === file)) G.folder.push({ file, r }); save(); zlpShow(r); say(`Чертёж по ссылке: «${r.displayName}». Он в папке — жми «+» в принтере`); setTimeout(() => $("#gui").scrollIntoView({ behavior: "smooth", block: "center" }), 600); }
    catch (e) { say("Ссылка на чертёж битая", true); }
  })();

  /* ================= VI. сервер ================= */
  (function mp() {
    const me = () => ZM.profile.me().nick;
    $("#mp13").innerHTML = `
      <div class="mp-c"><h3>Один принтер — один человек</h3><p>Пока кто-то внутри, второй не откроет. Выйдет — заходи.</p>
        <div class="mp-chat" id="mpC1"></div><button type="button" class="p3-btn2 sm" id="mpTry">ПКМ по занятому принтеру</button></div>
      <div class="mp-c"><h3>Поделиться чертежом</h3><p>Кнопка ↗ в принтере: выбираешь игрока онлайн, чертёж падает ему в «Мои». Места нет — не дойдёт.</p>
        <div class="mp-two"><div><small>твой чат</small><div class="mp-chat" id="mpC2"></div></div><div><small>чат Kolyan228</small><div class="mp-chat" id="mpC3"></div></div></div>
        <button type="button" class="p3-btn2 sm" id="mpShare">Кинуть чертёж</button></div>
      <div class="mp-c"><h3>/scanbuild</h3><p>Скан без GUI, от принтера под прицелом. Для операторов (уровень 2), каждый размер от 1 до 100.</p>
        <label class="mp-cmd"><span>/</span><input id="mpCmd" value="scanbuild Домик 8 6 8" spellcheck="false" autocomplete="off" enterkeyhint="send"><button type="button" class="mp-run" id="mpRun" aria-label="Выполнить">⏎</button></label><div class="mp-chat" id="mpC4"></div></div>
      <div class="mp-c"><h3>Сломал — всё с собой</h3><p>Принтер падает с содержимым: склад на 540 слотов и выбранный чертёж остаются внутри предмета. Переставил — продолжил.</p>
        <div class="mp-drop"><img src="${T("printer_iso")}" alt=""><span>BlockEntityTag<br><b>Items: 540 слотов</b></span></div></div>`;
    const put = (id, t) => { const c = $(id), r = document.createElement("div"); r.innerHTML = mcHtml(t); c.appendChild(r); while (c.children.length > 3) c.firstChild.remove(); };
    $("#mpTry").addEventListener("click", () => { put("#mpC1", fmt(P.msgs.busy, "Kolyan228")); ZM.sfx("click", 0.3, 0.7); });
    $("#mpShare").addEventListener("click", () => {
      const r = selCustom() || G.lib[0]; if (!r) { put("#mpC2", "§cНет выбранного кастомного рецепта"); return; }
      put("#mpC2", "§a" + fmt(P.msgs.shareOut, r.displayName, "Kolyan228")); setTimeout(() => { put("#mpC3", fmt(P.msgs.shareIn, me(), r.displayName)); ZM.sfx("orb", 0.3, 1.3); }, 350);
    });
    $("#mpRun").addEventListener("click", (e) => { e.preventDefault(); $("#mpCmd").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" })); });
    $("#mpCmd").addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return; const a = $("#mpCmd").value.trim().replace(/^\//, "").split(/\s+/);
      if (a[0] !== "scanbuild") { put("#mpC4", "§cНеизвестная команда"); return; }
      const nums = a.slice(-3).map(Number), name = a.slice(1, -3).join(" ");
      if (a.length < 5 || nums.some((n) => !Number.isInteger(n))) { put("#mpC4", "§c/scanbuild <name> <width> <height> <depth>"); return; }
      const bad = nums.find((n) => n < 1 || n > 100); if (bad != null) { put("#mpC4", `§cЧисло должно быть не больше 100 и не меньше 1, найдено ${bad}`); return; }
      const r = doScan(name, nums[0], nums[1], nums[2]); put("#mpC4", r ? "§a" + fmt(P.msgs.scanOk, r.displayName, r.placements.length) : "§cНе вышло: смотри сообщение под окном принтера");
    });
    put("#mpC4", "§7Enter или ⏎ — выполнить. Сканирует стройку из блока «Сканер»");
    put("#mpC1", "§e" + "Kolyan228 зашёл в 3D-принтер"); put("#mpC1", "§7<Kolyan228> я тут надолго, не лезь");
    put("#mpC2", "§7выбери свой чертёж в «Мои» и кидай"); put("#mpC3", "§7<Kolyan228> кинь чё-нить построить");
  })();

  /* ================= VII. чары ================= */
  (function ench() {
    const E = P.ench;
    $("#enGrid").innerHTML = E.map((e, i) => `<article class="en reveal ${e.curse ? "curse" : ""}" style="--c:${e.color};--d:${i * 90}ms">
      <div class="en-top"><img src="${T("i/enchanted_book")}" alt=""><div><h3>${esc(e.name)}</h3><span>${esc(e.rar)} · ур. ${esc(e.lvl)}</span></div></div>
      <p>${esc(e.d)}</p>
      <div class="en-st">${e.stat.speed ? `<div><span>скорость печати</span><b>×${String(e.stat.speed).replace(".", ",")}</b></div>` : ""}${e.stat.hard ? `<div><span>прочность постройки</span><b>×${String(e.stat.hard).replace(".", ",")}</b></div>` : ""}${e.stat.disc ? `<div><span>скидка</span><b>5% / 10%</b></div>` : ""}<div><span>цена в столе</span><b>${esc(e.cost)}</b></div></div>
      <button type="button" class="en-put" data-e="${e.key}">${G.ench[e.key] ? "снять с принтера" : "повесить на принтер"}</button></article>`).join("");
    $("#enGrid").addEventListener("click", (e) => { const b = e.target.closest("[data-e]"); if (!b) return; const k = b.dataset.e; G.ench[k] = G.ench[k] ? 0 : k === "baryga" ? 2 : 1; if (k === "baryga") reroll(); save(); drawEnch(); ench.sync(); calc(); G.dirty = true; ZM.sfx(G.ench[k] ? "enchant" : "click", 0.4); if (pr) pr.rate = rate() * showSpeed; });
    ench.sync = () => $$(".en-put").forEach((b) => (b.textContent = G.ench[b.dataset.e] ? "снять с принтера" : "повесить на принтер"));
    let cr = "dima_house", lv = 2;
    function calc() {
      const opts = BUILTIN.map((b) => [b.key, b.name]).concat(G.lib.map((r) => ["c:" + r.recipeId, r.displayName]));
      if (!opts.some((o) => o[0] === cr)) cr = opts[0][0];
      const mats = cr.startsWith("c:") ? Object.entries(G.lib.find((r) => "c:" + r.recipeId === cr).materials) : BUILTIN.find((b) => b.key === cr).cost.map(([id, n]) => ["minecraft:" + id, n]);
      const th = lv === 1 ? 20 : 10, p = lv === 1 ? 0.05 : 0.1, el = mats.filter(([, n]) => n > th);
      const rows = mats.slice().sort((a, b) => b[1] - a[1]).map(([id, n]) => { const ok = n > th, save = ok ? n - Math.max(1, n - Math.max(1, Math.round(n * p))) : 0; return `<tr class="${ok ? "" : "no"}"><td><img src="${itemSrc(id)}" data-it="${esc(id)}" alt="">${esc(itemName(id))}</td><td>${fmtN(n)}</td><td>${ok ? "−" + save : "—"}</td><td>${ok ? Math.round((1 / el.length) * 100) + "%" : "0%"}</td></tr>`; }).join("");
      const avg = el.length ? el.reduce((s, [, n]) => s + (n - Math.max(1, n - Math.max(1, Math.round(n * p)))), 0) / el.length : 0;
      $("#enCalc").innerHTML = `<div class="ec-h"><b>Калькулятор Барыги</b><select id="ecR">${opts.map(([k, n]) => `<option value="${esc(k)}" ${k === cr ? "selected" : ""}>${esc(n)}</option>`).join("")}</select><div class="ec-lv"><button type="button" data-lv="1" class="${lv === 1 ? "on" : ""}">I</button><button type="button" data-lv="2" class="${lv === 2 ? "on" : ""}">II</button></div></div>
        <p class="ec-p">Скидка выпадает на <b>один</b> случайный материал, которого нужно больше ${th}, и перекидывается каждый раз, когда жмёшь чертёж. ${el.length ? `Кандидатов: ${el.length}, в среднем экономишь <b>${avg.toFixed(1).replace(".", ",")}</b> ${plural(Math.round(avg), "блок", "блока", "блоков")}.` : "Здесь скидке не на что упасть."}</p>
        <div class="ec-t"><table><thead><tr><th>материал</th><th>надо</th><th>скидка</th><th>шанс</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    $("#enCalc").addEventListener("change", (e) => { if (e.target.id === "ecR") { cr = e.target.value; calc(); } });
    $("#enCalc").addEventListener("click", (e) => { const b = e.target.closest("[data-lv]"); if (b) { lv = +b.dataset.lv; calc(); } });
    calc(); window.__p13calc = calc;
  })();

  /* ================= VIII. барахолка ================= */
  (function market() {
    const W = (fn) => { const c = []; fn((x, y, z, n) => c.push([x, y, z, typeof n === "number" ? n : k$(n)])); return c; };
    const EX = [
      { id: "ex_pyr", h: "zombie", n: "Пирамида", by: "Zhmyh_TV", likes: 214, d: "2026-07-21", g: () => W((p) => { for (let y = 0; y < 5; y++) for (let x = y; x < 9 - y; x++) for (let z = y; z < 9 - z * 0 - y; z++) p(x + 1, y, z + 1, y === 4 ? "gold_block" : "sandstone"); }) },
      { id: "ex_tow", h: "alex", n: "Башня лучника", by: "Barsik_Pro", likes: 167, d: "2026-08-02", g: () => W((p) => { for (let y = 0; y < 9; y++) for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) { const edge = x === 0 || z === 0 || x === 4 || z === 4; if (y < 7 && edge && !(y > 1 && y < 5 && (x === 2 || z === 2) && y % 2)) p(x + 1, y, z + 1, "cobblestone"); if (y === 7) p(x + 1, y, z + 1, "spruce_planks"); if (y === 8 && edge && (x + z) % 2 === 0) p(x + 1, y, z + 1, "cobblestone"); } }) },
      { id: "ex_bri", h: "steve", n: "Мостик", by: "Kolyan228", likes: 98, d: "2026-08-15", g: () => W((p) => { for (let x = 0; x < 13; x++) { const h = Math.round(2 - Math.abs(x - 6) / 3); for (let z = 0; z < 3; z++) p(x + 1, h, z + 1, "oak_planks"); p(x + 1, h + 1, 1, "oak_log"); p(x + 1, h + 1, 3, "oak_log"); if (x === 0 || x === 12) for (let y = 0; y < h; y++) { p(x + 1, y, 1, "stone_bricks"); p(x + 1, y, 3, "stone_bricks"); } } }) },
      { id: "ex_bun", h: "husk", n: "Бункер на случай ТНТ", by: "Vovan", likes: 131, d: "2026-09-03", g: () => W((p) => { for (let y = 0; y < 5; y++) for (let x = 0; x < 7; x++) for (let z = 0; z < 7; z++) { const e = x === 0 || z === 0 || x === 6 || z === 6 || y === 0 || y === 4; if (e) p(x + 1, y, z + 1, y === 2 && (x === 3 || z === 3) ? "glass" : "obsidian"); } p(4, 1, 1, 0); p(4, 2, 1, 0); p(4, 1, 4, "crafting_table"); }).filter((c) => c[3]) },
      { id: "ex_crp", h: "creeper", n: "Крипер в полный рост", by: "Alex", likes: 305, d: "2026-09-18", g: () => W((p) => { const L = (x, y, z) => ((x * 7 + y * 5 + z * 3) % 3 ? "lime_concrete" : "green_concrete");
        for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) for (const z of [0, 1, 4, 5]) p(x + 1, y, z + 1, L(x, y, z));
        for (let y = 3; y < 9; y++) for (let x = 0; x < 4; x++) for (let z = 2; z < 4; z++) p(x + 1, y, z + 1, L(x, y, z));
        const face = { "11,0": 1, "11,3": 1, "10,1": 1, "10,2": 1, "9,1": 1, "9,2": 1, "8,0": 1, "8,3": 1 };
        for (let y = 9; y < 13; y++) for (let x = 0; x < 4; x++) for (let z = 1; z < 5; z++) p(x + 1, y, z + 1, z === 1 && face[y + "," + x] ? "black_concrete" : L(x, y, z)); }) },
      { id: "ex_hut", h: "drowned", n: "Лесной домик", by: "Lesnik_Petrovich", likes: 142, d: "2026-08-24", g: () => W((p) => {
        for (let x = 0; x < 7; x++) for (let z = 0; z < 6; z++) p(x + 1, 0, z + 1, "cobblestone");
        for (let y = 1; y < 4; y++) for (let x = 0; x < 7; x++) for (let z = 0; z < 6; z++) {
          const cx = x === 0 || x === 6, cz = z === 0 || z === 5; if (!cx && !cz) continue;
          if (x === 3 && z === 0 && y < 3) continue; // дверной проём
          p(x + 1, y, z + 1, cx && cz ? "oak_log" : y === 2 && (x === 1 || x === 5 || z === 2 || z === 3) ? "glass" : "oak_planks");
        }
        for (let s2 = 0; s2 < 3; s2++) for (let x = -1 + s2; x < 8 - s2; x++) for (let z = -1; z < 7; z++) p(x + 1, 4 + s2, z + 1, s2 === 2 ? "spruce_log" : "spruce_planks");
        p(2, 1, 5, "crafting_table"); p(6, 1, 5, "bookshelf"); p(6, 2, 5, "bookshelf"); p(2, 1, 2, "furnace");
      }).filter((c) => c[0] > 0 && c[2] > 0) },
      { id: "ex_rui", h: "wither", n: "Руины портала", by: "NetherBoy", likes: 88, d: "2026-09-10", g: () => W((p) => {
        const R = (x, z) => ((x * 13 + z * 7 + x * z) % 7);
        for (let x = 0; x < 8; x++) for (let z = 0; z < 6; z++) { const r = R(x, z), edge = x === 0 || z === 0 || x === 7 || z === 5; if (edge && r > 4) continue; p(x + 1, 0, z + 1, r === 0 ? "netherrack" : r < 3 ? "stone_bricks" : r < 5 ? "mossy_cobblestone" : "cobblestone"); }
        for (let y = 1; y < 6; y++) for (let x = 2; x < 6; x++) { if (!(y === 1 || y === 5 || x === 2 || x === 5)) continue; if (x === 5 && y === 5) continue; p(x + 1, y, 3, (x * 3 + y) % 4 ? "obsidian" : "crying_obsidian"); }
        p(7, 1, 2, "obsidian"); p(2, 1, 5, "crying_obsidian"); p(1, 1, 2, "gold_block"); p(7, 1, 5, "netherrack"); p(7, 2, 5, "netherrack"); p(8, 1, 4, "mossy_cobblestone");
      }) },
      { id: "ex_bea", h: "steve", n: "Маяк на районе", by: "Mayachok", likes: 176, d: "2026-07-30", g: () => W((p) => {
        for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) p(x + 1, 0, z + 1, (x + z) % 2 ? "iron_block" : "quartz_block");
        for (let x = 1; x < 4; x++) for (let z = 1; z < 4; z++) p(x + 1, 1, z + 1, x === 2 && z === 2 ? "diamond_block" : "gold_block");
        for (let y = 2; y < 9; y++) p(3, y, 3, "glass"); p(3, 9, 3, "sea_lantern");
        for (const [x, z] of [[0, 0], [4, 0], [0, 4], [4, 4]]) { p(x + 1, 1, z + 1, "stone_bricks"); p(x + 1, 2, z + 1, "sea_lantern"); }
      }) },
      { id: "ex_leet", h: "skeleton", n: "1337 из Цифроблоков", by: "xX_Nagibator_Xx", likes: 1337, d: "2026-09-26", g: () => W((p) => {
        const F = { 1: ["010", "110", "010", "010", "111"], 3: ["111", "001", "011", "001", "111"], 7: ["111", "001", "010", "010", "010"] }, NM = { 1: "one", 3: "three", 7: "seven" };
        [1, 3, 3, 7].forEach((d, i) => F[d].forEach((row, r) => [...row].forEach((ch, c) => { if (ch === "1") p(1 + i * 4 + c, 5 - r, 2, "zitraksmode:" + NM[d]); })));
        for (let x = 0; x < 15; x++) { p(x + 1, 0, 2, "black_concrete"); p(x + 1, 0, 1, "black_concrete"); }
      }) },
    ];
    const MK = "p13.mk", FAV = "p13.fav";
    let mine = S.get(MK, []), fav = S.get(FAV, []), f = "all";
    $("#mkQ").textContent = "";
    const cellsOf = (x) => (x.g ? x.g() : customCells(x.r).map((c) => [c[0], c[1], c[2], c[3]]));
    const recOf = (x) => (x.r ? x.r : recipeFromCells(x.g(), x.n, "player_scan_" + (100 + EX.indexOf(x))));
    function draw() {
      const q = $("#mkQ2").value.trim().toLowerCase(), sort = $("#mkSort").value;
      let list = [...mine.map((m) => ({ ...m, mine: 1 })), ...EX];
      if (f === "mine") list = list.filter((x) => x.mine); if (f === "fav") list = list.filter((x) => fav.includes(x.id));
      if (q) list = list.filter((x) => (x.n + " " + x.by).toLowerCase().includes(q));
      list.forEach((x) => { if (!x._c) { const c = cellsOf(x); x._n = c.length; x._d = boundsOf(c); } });
      list.sort(sort === "top" ? (a, b) => (b.likes || 0) - (a.likes || 0) : sort === "big" ? (a, b) => b._n - a._n : (a, b) => String(b.d).localeCompare(String(a.d)));
      $("#mkQ").textContent = `${mine.length + EX.length} ${plural(mine.length + EX.length, "чертёж", "чертежа", "чертежей")}`;
      $("#mk").innerHTML = list.map((x, i) => `<article class="mk-c${i === 0 && !q && f === "all" ? " top" : ""}" data-id="${esc(x.id)}">
        <div class="mk-pic"><img alt="${esc(x.n)}" data-mk="${esc(x.id)}">${x.mine ? `<span class="mk-tag me">мой</span>` : i === 0 && !q && f === "all" ? `<span class="mk-tag hot">${sort === "top" ? "топ барахолки" : sort === "big" ? "самый большой" : "свежак"}</span>` : ""}<span class="mk-dim">${x._d.join("×")}</span></div>
        <div class="mk-b"><h3>${esc(x.n)}</h3>
          <div class="mk-by"><i class="mk-head" style="background-image:url('${T("heads/" + (x.h || "steve"))}')"></i><b>${esc(x.by)}</b><time>${String(x.d).split("-").reverse().join(".")}</time></div>
          <div class="mk-st"><span><b>${fmtN(x._n)}</b> ${plural(x._n, "блок", "блока", "блоков")}</span><span><b>${(x._n / 20).toFixed(1).replace(".", ",")} с</b> печать</span></div>
          <div class="mk-a"><button type="button" class="mk-fav ${fav.includes(x.id) ? "on" : ""}" data-a="fav" title="В избранное">★ ${fmtN((x.likes || 0) + (fav.includes(x.id) ? 1 : 0))}</button><button type="button" class="mk-go" data-a="stu">В сканер</button><button type="button" class="mk-ic" data-a="dl" title="Скачать .zlp" aria-label="Скачать .zlp">⇩</button><button type="button" class="mk-ic" data-a="lnk" title="Скопировать ссылку" aria-label="Скопировать ссылку">⧉</button>${x.mine ? `<button type="button" class="mk-ic" data-a="del" title="Убрать" aria-label="Убрать">✖</button>` : ""}</div></div></article>`).join("") || `<p class="mk-none">Пусто. ${f === "mine" ? "Построй что-нибудь в сканере и жми «Выложить»." : ""}</p>`;
      list.forEach((x) => { if (x._th) { const im = $(`[data-mk="${x.id}"]`); if (im) im.src = x._th; } else thumbOf(cellsOf(x), (u) => { x._th = u || T("printer_iso"); const im = $(`[data-mk="${x.id}"]`); if (im) im.src = x._th; }); });
      market.all = list;
    }
    $("#mk").addEventListener("click", async (e) => {
      const b = e.target.closest("[data-a]"); if (!b) return; const id = b.closest("[data-id]").dataset.id, x = [...mine, ...EX].find((y) => y.id === id); if (!x) return;
      const a = b.dataset.a;
      if (a === "fav") { fav = fav.includes(id) ? fav.filter((y) => y !== id) : fav.concat(id); S.set(FAV, fav); ZM.sfx("orb", 0.25, 1.6); draw(); }
      if (a === "stu") { loadRecipe(cellsOf(x), x.n); $("#stu").scrollIntoView({ behavior: "smooth", block: "center" }); drawSnd(); }
      if (a === "dl") { try { const r = recOf(x), n = await ZLP.download(r); zlpShow(r); say("Скачан " + n); drawSnd(); } catch (er) { say(er.message, true); } }
      if (a === "lnk") { try { const l = await ZLP.link(recOf(x)); await ZM.copy(l); say("Ссылка скопирована"); } catch (er) { say(er.message, true); } }
      if (a === "del") { mine = mine.filter((y) => y.id !== id); S.set(MK, mine); draw(); }
    });
    $("#bPub").addEventListener("click", () => {
      const X = +$("#scX").value || STU.N, Y = +$("#scY").value || STU.N, Z = +$("#scZ").value || STU.N, cells = scanCells(X, Y, Z);
      if (!cells.length) { say(P.msgs.scanEmpty, true); return; }
      const name = $("#scName").value.trim() || "Без названия", r = recipeFromCells(cells, name, "player_scan_" + G.next++);
      const it = { id: "my_" + Date.now().toString(36), n: name, by: ZM.profile.me().nick, likes: 0, d: new Date().toISOString().slice(0, 10), r };
      mine.unshift(it); try { S.set(MK, mine.slice(0, 12)); } catch (er) { say("Места в браузере не хватило", true); }
      f = "mine"; $$(".mk-tabs [data-f]").forEach((t) => t.classList.toggle("on", t.dataset.f === f)); draw(); drawSnd(); say(`«${name}» на барахолке`);
      $("#market").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $$(".mk-tabs [data-f]").forEach((t) => t.addEventListener("click", () => { f = t.dataset.f; $$(".mk-tabs [data-f]").forEach((x) => x.classList.toggle("on", x === t)); draw(); }));
    $("#mkQ2").addEventListener("input", draw); $("#mkSort").addEventListener("change", draw);
    draw();
  })();

  /* ================= X. история, финал ================= */
  $("#timeline").innerHTML = P.history.map((h, i) => `<div class="tl13-i" style="--c:${h.c}"><div class="tl13-dot"><i></i></div><div class="tl13-b"><div class="tl13-top">${h.ver ? `<span class="tl13-v">v${esc(h.ver)}</span>` : `<span class="tl13-v">релиз</span>`}<span class="tl13-d">${esc(h.date)}</span></div><b>${esc(h.t)}</b><p>${esc(h.d)}</p></div></div>`).join("");
  const nav = ZM.pointNav(13);
  $("#finNav").innerHTML = [nav.prev && `<a href="${U(nav.prev.href)}">← №${pad2(nav.prev.n)} ${esc(nav.prev.title)}</a>`, `<a href="${U("index.html")}">Все пункты</a>`,
    nav.next && `<a href="${U(nav.next.href)}">№${pad2(nav.next.n)} ${esc(nav.next.title)} →</a>`].filter(Boolean).join("");
  (function fin() {
    const b = $("#finPrint"), t = $("#finTxt"), p = $("#finP"); let run = 0;
    const LINES = ["Жми — допечатаю.", "Ещё раз? Материалы же не бесконечные.", "Хватит, склад пустой.", "Ладно, из креатива."];
    let n = 0;
    b.addEventListener("click", () => {
      if (run) return; run = 1; b.classList.add("run"); snd("out", 0.5); let k = 0;
      const iv = setInterval(() => { k = Math.min(100, k + 4); t.textContent = t.dataset.x = `Печать: ${k}%`; b.style.setProperty("--p", k + "%"); if (k % 20 === 0) blockSnd(KEY.stone, 0.25); if (k >= 100) { clearInterval(iv); run = 0; b.classList.remove("run"); snd("in", 0.5); p.textContent = LINES[Math.min(LINES.length - 1, ++n)]; } }, 50);
    });
  })();

  // старт
  if (G.sel && !cellsOfSel()) G.sel = null;
  reroll(); stageShow(); zlpShow(selCustom() || G.lib[0] || recipeFromCells(builtinCells("hammer").map((c) => [c[0], c[1], c[2], c[3], c[4]]), "Пенис", "player_scan_1"));
  $$(".gui-mode button").forEach((b) => b.classList.toggle("on", b.dataset.mode === G.game));
  G.dirty = true; requestAnimationFrame(loop);
  ZM.reveal && ZM.reveal();
})();
