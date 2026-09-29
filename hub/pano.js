/* Главная: живая панорама как на титульном экране игры.
   Мир генерируется кодом на лету (shared/voxel.js + ванильные текстуры), камера медленно крутится.
   Тема меняет мир: закат и ночь — верхний мир, незер — лавовое море и багровый лес, энд — острова и обсидиановые столбы. */
(function () {
  const ZM = window.ZM, VX = window.ZMVox;
  const cv = document.getElementById("tsWorld");
  if (!cv || !VX || !VX.supported()) { ZM.pano = { theme() {} }; return; }
  let ready = false;
  const eng = VX.create(cv, { scale: 0.85, onReady: () => { ready = true; } });
  if (!eng) { ZM.pano = { theme() {} }; return; }
  const K = eng.byKey, SX = 136, SY = 64, SZ = 136;

  function world(kind, seed) {
    const data = new Uint8Array(SX * SY * SZ), r = VX.rng(seed), n = VX.noise2(seed), n2 = VX.noise2(seed + 17), n3 = VX.noise2(seed + 91);
    const I = (x, y, z) => x + z * SX + y * SX * SZ;
    const set = (x, y, z, id) => { if (x >= 0 && y >= 0 && z >= 0 && x < SX && y < SY && z < SZ) data[I(x, y, z)] = id; };
    const get = (x, y, z) => (x >= 0 && y >= 0 && z >= 0 && x < SX && y < SY && z < SZ ? data[I(x, y, z)] : 0);
    const H = new Int16Array(SX * SZ);
    const cx = SX / 2, cz = SZ / 2;
    if (kind === "over") {
      const SEA = 20;
      for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
        const d = Math.hypot(x - cx, z - cz);
        let h = 22 + n(x / 46, z / 46, 4) * 16 + Math.max(0, n2(x / 70, z / 70, 3)) * 34 * Math.min(1, d / 40);
        h += (1 - Math.abs(n3(x / 30, z / 30, 2))) * 5 - 2.5;
        if (d < 10) h = h * 0.4 + 26 * 0.6; // холм под камерой
        h = Math.max(4, Math.min(SY - 12, Math.round(h))); H[x + z * SX] = h;
        const snow = h > 44 + n3(x / 9, z / 9) * 4, beach = h <= SEA + 1;
        for (let y = 0; y <= h; y++) {
          let id = K.stone;
          if (y === h) id = beach ? K.sand : snow ? K.snowy_grass : K.grass_block;
          else if (y > h - 4) id = beach ? K.sand : K.dirt;
          else { const q = r(); if (q < 0.012) id = K.coal_ore; else if (q < 0.018) id = K.iron_ore; else if (q < 0.03) id = K.gravel; }
          if (y < 3 && r() < 0.5) id = K.deepslate;
          set(x, y, z, id);
        }
        for (let y = h + 1; y <= SEA; y++) set(x, y, z, K.water);
      }
      // деревья
      const trees = [];
      for (let k = 0; k < 1400; k++) {
        const x = 3 + ((r() * (SX - 6)) | 0), z = 3 + ((r() * (SZ - 6)) | 0), h = H[x + z * SX];
        if (get(x, h, z) !== K.grass_block && get(x, h, z) !== K.snowy_grass) continue;
        if (Math.hypot(x - cx, z - cz) < 6) continue;
        const dens = n3(x / 24 + 50, z / 24) + 0.15; if (r() > dens * 1.6) continue;
        if (trees.some((t) => Math.abs(t[0] - x) < 4 && Math.abs(t[1] - z) < 4)) continue;
        trees.push([x, z]);
        const hi = h > 36 || get(x, h, z) === K.snowy_grass, kind2 = hi ? "spruce" : r() < 0.25 ? "birch" : "oak";
        const th = kind2 === "spruce" ? 6 + ((r() * 3) | 0) : 4 + ((r() * 3) | 0);
        const log = kind2 === "spruce" ? K.spruce_log : kind2 === "birch" ? K.birch_log : K.oak_log, lv = kind2 === "spruce" ? K.spruce_leaves : kind2 === "birch" ? K.birch_leaves : K.oak_leaves;
        set(x, h, z, K.dirt);
        for (let y = 1; y <= th; y++) set(x, h + y, z, log);
        if (kind2 === "spruce") {
          for (let y = 2; y <= th + 1; y++) { const rad = y === th + 1 ? 0 : ((th - y) % 2 ? 1 : 2) * (y > th - 2 ? 0.6 : 1); for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (Math.abs(dx) + Math.abs(dz) <= rad * 1.3 && !(dx === 0 && dz === 0 && y <= th)) if (!get(x + dx, h + y, z + dz)) set(x + dx, h + y, z + dz, lv); }
          set(x, h + th + 1, z, lv); set(x, h + th + 2, z, lv);
        } else {
          for (let y = th - 2; y <= th + 1; y++) { const rad = y >= th ? 1 : 2; for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) { if (Math.abs(dx) === rad && Math.abs(dz) === rad && (y >= th || r() < 0.5)) continue; if (!get(x + dx, h + y, z + dz)) set(x + dx, h + y, z + dz, lv); } }
        }
      }
    } else if (kind === "nether") {
      const SEA = 14;
      for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
        const d = Math.hypot(x - cx, z - cz);
        let h = 18 + n(x / 34, z / 34, 4) * 18 + Math.pow(Math.max(0, n2(x / 50, z / 50, 3)), 1.2) * 40 * Math.min(1, d / 34);
        if (d < 9) h = h * 0.35 + 24 * 0.65;
        h = Math.max(3, Math.min(SY - 6, Math.round(h))); H[x + z * SX] = h;
        const forest = n3(x / 26, z / 26) > 0.12;
        for (let y = 0; y <= h; y++) {
          let id = K.netherrack; const q = r();
          if (y === h && forest && h > SEA + 1) id = K.crimson_nylium;
          else if (y >= h - 1 && h <= SEA + 3 && n2(x / 11, z / 11) > 0.1) id = K.soul_sand;
          else if (q < 0.004) id = K.glowstone;
          set(x, y, z, id);
        }
        for (let y = h + 1; y <= SEA; y++) set(x, y, z, K.lava);
      }
      for (let k = 0; k < 900; k++) { // багровые грибы
        const x = 3 + ((r() * (SX - 6)) | 0), z = 3 + ((r() * (SZ - 6)) | 0), h = H[x + z * SX];
        if (get(x, h, z) !== K.crimson_nylium || Math.hypot(x - cx, z - cz) < 6 || r() < 0.6) continue;
        const th = 5 + ((r() * 5) | 0);
        for (let y = 1; y <= th; y++) set(x, h + y, z, K.crimson_stem);
        for (let y = th - 2; y <= th + 1; y++) { const rad = y === th + 1 ? 1 : 2; for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) { if (y < th + 1 && Math.abs(dx) < 2 && Math.abs(dz) < 2 && y < th) continue; if (!get(x + dx, h + y, z + dz)) set(x + dx, h + y, z + dz, r() < 0.07 ? K.shroomlight : K.nether_wart_block); } }
      }
      for (let k = 0; k < 26; k++) { // базальтовые столбы со светокамнем
        const x = (r() * SX) | 0, z = (r() * SZ) | 0; if (Math.hypot(x - cx, z - cz) < 14) continue;
        const h = H[x + z * SX], th = 8 + ((r() * 20) | 0);
        for (let y = 1; y <= th; y++) for (let dx = 0; dx < 2; dx++) for (let dz = 0; dz < 2; dz++) if (r() < 0.93) set(x + dx, h + y, z + dz, K.basalt);
        for (let dx = -1; dx < 3; dx++) for (let dz = -1; dz < 3; dz++) if (r() < 0.5) set(x + dx, h + th + 1, z + dz, K.glowstone);
      }
    } else { // энд
      for (let z = 0; z < SZ; z++) for (let x = 0; x < SX; x++) {
        const d = Math.hypot(x - cx, z - cz) / 46 + n(x / 20, z / 20, 3) * 0.25;
        if (d < 1) { const top = 26 + Math.round((1 - d) * 3 + n2(x / 14, z / 14) * 2), bot = 26 - Math.round(Math.pow(1 - d, 0.7) * 16); for (let y = bot; y <= top; y++) set(x, y, z, K.end_stone); H[x + z * SX] = top; }
      }
      for (let k = 0; k < 10; k++) { // обсидиановые столбы по кругу
        const a = (k / 10) * Math.PI * 2 + 0.3, R = 30, x0 = Math.round(cx + Math.cos(a) * R), z0 = Math.round(cz + Math.sin(a) * R), rad = 2 + (k % 3), th = 22 + ((k * 7) % 5) * 5;
        const base = H[x0 + z0 * SX] || 26;
        for (let y = base - 3; y <= base + th; y++) for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) if (dx * dx + dz * dz <= rad * rad + 1) set(x0 + dx, y, z0 + dz, K.obsidian);
        set(x0, base + th + 1, z0, K.crying_obsidian);
      }
      for (let k = 0; k < 16; k++) { // дальние острова
        const a = r() * 6.283, R = 50 + r() * 16, x0 = cx + Math.cos(a) * R, z0 = cz + Math.sin(a) * R, y0 = 18 + r() * 22, rad = 3 + r() * 5;
        for (let dx = -8; dx <= 8; dx++) for (let dz = -8; dz <= 8; dz++) for (let dy = -6; dy <= 2; dy++) { const q = Math.hypot(dx, dz * 1.1) / rad + (dy < 0 ? -dy / 5 : dy / 1.5) * 0.6 + n(dx / 4 + k * 9, dz / 4) * 0.3; if (q < 1) set(Math.round(x0 + dx), Math.round(y0 + dy), Math.round(z0 + dz), K.end_stone); }
        if (r() < 0.45) { const tx = Math.round(x0), tz = Math.round(z0), ty = Math.round(y0 + 2), th = 4 + ((r() * 7) | 0); for (let y = 1; y <= th; y++) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (Math.abs(dx) + Math.abs(dz) < 2 || y === th) set(tx + dx, ty + y, tz + dz, K.purpur_block); }
      }
    }
    // высота камеры: чуть выше рельефа в центре
    let top = 0; for (let z = cz - 6; z <= cz + 6; z++) for (let x = cx - 6; x <= cx + 6; x++) for (let y = SY - 1; y > 0; y--) if (get(x, y, z)) { top = Math.max(top, y); break; }
    return { sx: SX, sy: SY, sz: SZ, data, eyeY: top + (kind === "end" ? 14 : 12) };
  }

  const THEME = {
    sunset: { kind: "over", seed: 1337, tint: [1.06, 0.9, 0.78], fog: [34, 64] },
    night: { kind: "over", seed: 1337, tint: [0.34, 0.42, 0.66], fog: [30, 62] },
    nether: { kind: "nether", seed: 666, tint: [1, 0.72, 0.6], fog: [22, 58] },
    end: { kind: "end", seed: 1488 + 1, tint: [0.78, 0.7, 0.92], fog: [36, 66] },
  };
  const cache = {};
  let cur = null, yaw = 0.8, last = performance.now(), mx = 0, my = 0, sx = 0, sy = 0, vis = true, motion = true, started = false;
  function theme(t) {
    const T = THEME[t] || THEME.sunset;
    const key = T.kind + T.seed;
    if (!cache[key]) cache[key] = world(T.kind, T.seed);
    if (cur !== key) { eng.setWorld(cache[key]); cur = key; }
    eng.env.tint = T.tint; eng.env.fog = T.fog; eng.env.fade = true;
    eng.cam.eye = [SX / 2, cache[key].eyeY, SZ / 2]; eng.cam.fov = 70;
    motion = !document.documentElement.classList.contains("no-motion");
    eng.dirty = true; if (!started) { started = true; requestAnimationFrame(loop); }
  }
  addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  if ("IntersectionObserver" in window) new IntersectionObserver((es) => { vis = es[0].isIntersecting; }).observe(cv);
  function loop(t) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (t - last) / 1000); last = t;
    if (!vis || document.hidden) return;
    if (motion) { yaw += dt * 0.035; sx += (mx - sx) * Math.min(1, dt * 3); sy += (my - sy) * Math.min(1, dt * 3); }
    else if (!eng.dirty) return;
    eng.cam.yaw = yaw - sx * 0.25; eng.cam.pitch = -0.06 - sy * 0.12;
    eng.render();
    if (ready) cv.classList.add("on");
  }
  ZM.pano = { theme, engine: eng };
})();
