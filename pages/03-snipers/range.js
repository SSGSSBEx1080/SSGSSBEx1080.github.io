/* =====================================================================
   №03 · Полигон от первого лица.
   Мир в блоках: игрок в (0, 0, 0), глаза на высоте 1.62, взгляд по +Z.
   Проекция угловая (как у камеры Minecraft при FOV 70 по вертикали), прицел FOV 30.
   Вся механика выстрела повторяет SniperItem / BulletEntity / SniperUltimateAbility:
     • выстрел в МОМЕНТ нажатия ПКМ, прицел — пока кнопка зажата (use -> startUsingItem);
     • КД или нет пуль -> звук отказа раздатчика, прицела нет;
     • пуля 8 блоков/тик, без гравитации и разброса, живёт 100 тиков;
     • «Как он меня прошил?»: пуля появляется сразу за первым блоком на линии (если до него нет цели);
     • «Двойное проникновение»: две пули по 60%, вторая через 2 тика;
     • ульта незеритовой: луч 200 блоков, ломает всё кроме бедрока, 400 урона, поджог 8 с.
   ===================================================================== */
(function () {
  const EYE = 1.62, TPS = 20, D2R = Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);

  class Range {
    constructor(canvas, opt) {
      this.cv = canvas;
      this.c = canvas.getContext("2d");
      this.o = opt;                    // { tex, data, mode: "hero"|"game", on: {...} }
      this.tex = opt.tex;
      this.P = opt.data;
      this.mode = opt.mode || "game";
      this.yaw = 0; this.pitch = 0; this.tYaw = 0; this.tPitch = 0;
      this.fov = 70; this.fovT = 70;
      this.bullets = []; this.parts = []; this.beams = []; this.floats = []; this.flashes = [];
      this.t = 0;
      this.scoped = false;
      this.state = opt.state;          // общий с app.js: tier, ench, ammo, cdUntil
      this.buildWorld();
      this.redCache = new Map();
      this.resize();
      new ResizeObserver(() => this.resize()).observe(canvas);
      if (this.mode === "game") this.bindInput();
      this.last = performance.now();
      const loop = (now) => { requestAnimationFrame(loop); this.frame(now); };
      requestAnimationFrame(loop);
    }

    /* ------------------------------------------------------------ мир */
    buildWorld() {
      this.blocks = new Map();
      const put = (x, y, z, t) => this.blocks.set(`${x},${y},${z}`, t);
      // каменная стена, за ней скелет — берётся только «Как он меня прошил?» или ультой
      for (let x = 1; x <= 5; x++) for (let y = 0; y < 3; y++) put(x, y, 38, "stone");
      // обсидиановая стена: её не пробивает ни пуля, ни зачарование. Только ульта
      for (let x = -4; x <= -2; x++) for (let y = 0; y < 3; y++) put(x, y, 86, "obsidian");
      // бедрок: не ломается даже ультой
      for (let y = 0; y < 4; y++) put(7, y, 100, "bedrock");
      // мишени (ванильный блок-мишень выдаёт сигнал редстоуна по точности)
      put(2, 0, 160, "hay_block"); put(2, 1, 160, "target");
      for (let y = 0; y < 3; y++) put(-11, y, 320, "stone_bricks"); put(-11, 3, 320, "target");
      this.spawns = [
        { k: "zombie", x: -4, z: 22 },
        { k: "skeleton", x: 3, z: 40 },
        { k: "creeper", x: -9, z: 55 },
        { k: "enderman", x: 12, z: 70 },
        { k: "zombie", x: -3, z: 88 },
        { k: "iron_golem", x: -10, z: 130 },
      ];
      this.mobs = this.spawns.map((s, i) => this.newMob(s, i));
      this.posts = [25, 50, 100, 150, 200, 300];
    }
    newMob(s, i) {
      const m = this.P.mobs[s.k];
      return { i, k: s.k, def: m, x: s.x, z: s.z, x0: s.x, z0: s.z, y: 0, hp: m.hp, hurt: 0, dead: 0, fire: 0, fireAcc: 0, vx: 0, vz: 0,
        wob: Math.random() * 10, face: 1, tp: 0 };
    }
    block(x, y, z) { return this.blocks.get(`${x},${y},${z}`); }

    /* ------------------------------------------------------------ размер / проекция */
    resize() {
      const r = this.cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.W = Math.max(1, Math.round(r.width * dpr)); this.H = Math.max(1, Math.round(r.height * dpr));
      this.cv.width = this.W; this.cv.height = this.H; this.dpr = dpr;
      this.groundTile = null;
    }
    get f() { return (this.H / 2) / Math.tan((this.fov / 2) * D2R); }
    dir(yaw = this.yaw, pitch = this.pitch) {
      return { x: Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: Math.cos(yaw) * Math.cos(pitch) };
    }
    // мир -> экран. Возвращает null, если точка позади
    proj(x, y, z, cam = this) {
      const f = cam.f ?? this.f;
      const cy = Math.cos(-cam.yaw), sy = Math.sin(-cam.yaw);
      let rx = x * cy + z * sy, rz = -x * sy + z * cy;           // поворот по yaw
      const ry = y - EYE;
      const cp = Math.cos(-cam.pitch), sp = Math.sin(-cam.pitch);
      const rz2 = rz * cp - ry * sp, ry2 = rz * sp + ry * cp;   // поворот по pitch
      if (rz2 < 0.05) return null;
      const s = f / rz2;
      return { x: (cam.cx ?? this.W / 2) + rx * s, y: (cam.cy ?? this.H / 2) - ry2 * s, s, d: rz2 };
    }

    /* ------------------------------------------------------------ ввод */
    bindInput() {
      const cv = this.cv;
      cv.addEventListener("contextmenu", (e) => e.preventDefault());
      let drag = null;
      // Как в игре: клик захватывает мышь (Pointer Lock), движение крутит камеру, Esc отпускает.
      // Если браузер/iframe не даёт захват, остаётся запасной режим «курсор = направление взгляда».
      this.locked = false; this.wantLock = !!cv.requestPointerLock;
      document.addEventListener("pointerlockchange", () => {
        this.locked = document.pointerLockElement === cv;
        if (!this.locked) this.release();
        this.emit("lock", this.locked);
      });
      document.addEventListener("pointerlockerror", () => { this.wantLock = false; this.emit("lock", false); });
      cv.addEventListener("pointermove", (e) => {
        const r = cv.getBoundingClientRect();
        if (this.locked) {
          const k = 0.0021 * (this.fov / 70);   // в прицеле чувствительность ниже, иначе на ×2.6 не попасть
          this.yaw = this.tYaw = clamp(this.yaw + e.movementX * k, -1.45, 1.45);
          this.pitch = this.tPitch = clamp(this.pitch - e.movementY * k, -1.2, 1.2);
          return;
        }
        if (e.pointerType === "mouse") {
          const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = ((e.clientY - r.top) / r.height) * 2 - 1;
          const k = this.scoped ? 0.55 : 1;   // в прицеле мышь «тяжелее», как на меньшем FOV
          this.tYaw = this.aYaw + clamp(nx, -1, 1) * 0.95 * k; this.tPitch = clamp(-ny * 0.32 * k + this.aPitch, -0.4, 0.45);
        } else if (drag) {
          const sens = (this.scoped ? 0.0016 : 0.0042);
          this.tYaw = clamp(this.tYaw - (e.clientX - drag.x) * sens, -1.2, 1.2);
          this.tPitch = clamp(this.tPitch + (e.clientY - drag.y) * sens, -0.4, 0.45);
          drag = { x: e.clientX, y: e.clientY };
        }
      });
      this.aYaw = 0; this.aPitch = 0;
      cv.addEventListener("pointerenter", () => { this.aYaw = 0; this.aPitch = 0; });
      cv.addEventListener("pointerdown", (e) => {
        if (e.pointerType !== "mouse") { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); return; }
        e.preventDefault();
        if (!this.locked && this.wantLock) { this.lock(); return; }   // первый клик только захватывает мышь
        if (e.button === 0 || e.button === 2) this.press();
      });
      const up = (e) => { if (e.pointerType !== "mouse") { drag = null; return; } this.release(); };
      cv.addEventListener("pointerup", up); cv.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse" && !this.locked) this.release(); });
    }

    lock() {
      if (!this.wantLock) return false;
      try {
        const r = this.cv.requestPointerLock({ unadjustedMovement: true });
        if (r && r.catch) r.catch(() => { try { const r2 = this.cv.requestPointerLock(); if (r2 && r2.catch) r2.catch(() => { this.wantLock = false; this.emit("lock", false); }); } catch (e) { this.wantLock = false; } });
      } catch (e) { this.wantLock = false; }
      return true;
    }

    /* ------------------------------------------------------------ SniperItem.use() */
    press() {
      const S = this.state, now = performance.now();
      this.holding = true;
      if (now < S.cdUntil || (S.ammo <= 0 && !S.creative)) {
        this.emit("sound", "dispenser_fail");
        this.emit("fail", now < S.cdUntil ? "cd" : "ammo");
        return;   // InteractionResultHolder.fail: startUsingItem не вызван -> прицела не будет
      }
      const tier = this.P.tiers[S.tier];
      const dmg = tier.dmg;
      const d = this.dir();
      const eye = { x: 0, y: EYE, z: 0 };
      let spawn = eye, pierced = null;
      if (S.ench.pierce) {
        const r = this.pierceSpawn(eye, d);
        spawn = r.pos; pierced = r.info;
      }
      const shotId = (this.shotN = (this.shotN || 0) + 1);
      if (S.ench.double) {
        const split = dmg * 0.6;
        this.fire(spawn, d, split, shotId, 1);
        setTimeout(() => this.fire(spawn, d, split, shotId, 2), 2 * 1000 / TPS);
      } else this.fire(spawn, d, dmg, shotId, 0);
      this.emit("sound", "sniper_shot");
      const mult = this.P.enchantments[0].mult[S.ench.nimble || 0];
      S.cdTicks = Math.max(1, Math.round(tier.cd * mult));
      S.cdStart = now; S.cdUntil = now + S.cdTicks * 50;
      if (!S.creative) S.ammo--;
      this.emit("shot", { tier: S.tier, dmg, pierced, double: !!S.ench.double });
      this.recoil = 1;
      this.flashes.push({ t: 0 });
      // прицел появляется ПОСЛЕ выстрела и держится, пока держишь кнопку
      this.setScope(true);
    }
    release() { this.holding = false; this.setScope(false); }
    setScope(v) {
      if (this.scoped === v) return;
      this.scoped = v; this.fovT = v ? this.P.scope.fov : this.P.scope.normalFov;
      this.fov = this.fovT;   // в моде FOV переключается мгновенно (options.fov().set)
      this.emit("sound", v ? "scope_in" : "scope_out");
      this.emit("scope", v);
    }

    // computePiercedSpawnPosition: первый блок на линии 200 блоков, живой цели до него быть не должно
    pierceSpawn(eye, d) {
      const hit = this.raycastBlocks(eye, d, 200);
      if (!hit) return { pos: eye, info: { ok: false, why: "нет блока на линии" } };
      const ent = this.firstMobOnRay(eye, d, hit.t, 1.0);
      if (ent) return { pos: eye, info: { ok: false, why: "цель перед блоком" } };
      if (this.P.noPierce.includes("minecraft:" + hit.type)) return { pos: eye, info: { ok: false, why: this.P.names["minecraft:" + hit.type] + " не пробивается", type: hit.type } };
      // выходим из блока шагами по 1/16 и ещё 0.08 вперёд
      let t = hit.t;
      for (let i = 0; i < 64; i++) { t += 0.0625; const p = this.at(eye, d, t); if (!(Math.floor(p.x) === hit.x && Math.floor(p.y) === hit.y && Math.floor(p.z) === hit.z)) break; }
      t += 0.08;
      return { pos: this.at(eye, d, t), info: { ok: true, type: hit.type, dist: t } };
    }
    at(o, d, t) { return { x: o.x + d.x * t, y: o.y + d.y * t, z: o.z + d.z * t }; }

    raycastBlocks(o, d, maxT) {
      // DDA по сетке блоков
      let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
      const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
      const tdx = sx ? Math.abs(1 / d.x) : Infinity, tdy = sy ? Math.abs(1 / d.y) : Infinity, tdz = sz ? Math.abs(1 / d.z) : Infinity;
      let tx = sx ? ((sx > 0 ? x + 1 - o.x : o.x - x) * tdx) : Infinity;
      let ty = sy ? ((sy > 0 ? y + 1 - o.y : o.y - y) * tdy) : Infinity;
      let tz = sz ? ((sz > 0 ? z + 1 - o.z : o.z - z) * tdz) : Infinity;
      let t = 0, face = null;
      for (let i = 0; i < 2000 && t <= maxT; i++) {
        const b = this.block(x, y, z);
        if (b) return { x, y, z, t, type: b, face };
        if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; face = "x"; }
        else if (ty < tz) { y += sy; t = ty; ty += tdy; face = "y"; }
        else { z += sz; t = tz; tz += tdz; face = "z"; }
        if (y < -1 || y > 12) return null;
      }
      return null;
    }
    mobBox(m, infl = 0) {
      const w = m.def.w / 2 + infl;
      return { x0: m.x - w, x1: m.x + w, y0: m.y - infl, y1: m.y + m.def.h + infl, z0: m.z - w, z1: m.z + w };
    }
    rayBox(o, d, b) {
      let t0 = -Infinity, t1 = Infinity;
      for (const [oa, da, a0, a1] of [[o.x, d.x, b.x0, b.x1], [o.y, d.y, b.y0, b.y1], [o.z, d.z, b.z0, b.z1]]) {
        if (Math.abs(da) < 1e-9) { if (oa < a0 || oa > a1) return null; continue; }
        let ta = (a0 - oa) / da, tb = (a1 - oa) / da; if (ta > tb) [ta, tb] = [tb, ta];
        t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return null;
      }
      return t1 < 0 ? null : Math.max(0, t0);
    }
    firstMobOnRay(o, d, maxT, infl = 0) {
      let best = null;
      for (const m of this.mobs) {
        if (m.dead) continue;
        const t = this.rayBox(o, d, this.mobBox(m, infl));
        if (t != null && t <= maxT && (!best || t < best.t)) best = { m, t };
      }
      return best;
    }

    fire(pos, d, dmg, shotId, n) {
      this.bullets.push({ x: pos.x, y: pos.y, z: pos.z, px: pos.x, py: pos.y, pz: pos.z, d, dmg, age: 0, shotId, n, start: { ...pos }, trail: [] });
    }

    /* ------------------------------------------------------------ ульта (SniperUltimateAbility.fire) */
    ultimate() {
      const S = this.state, now = performance.now(), U = this.P.ult;
      const tier = this.P.tiers[S.tier];
      if (!tier.ult) return false;
      if (now < S.cdUntil || (S.ammo < U.ammo && !S.creative)) { this.emit("sound", "dispenser_fail"); this.emit("fail", now < S.cdUntil ? "cd" : "ultammo"); return false; }
      const eye = { x: 0, y: EYE, z: 0 }, d = this.dir();
      // 1) блоки: шаг 0.3 на 200 блоков, всё кроме бедрока, без дропа
      const broken = [];
      for (let t = 0; t <= U.range; t += U.blockStep) {
        const p = this.at(eye, d, t), k = `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`;
        const b = this.blocks.get(k);
        if (b && b !== "bedrock") { this.blocks.delete(k); broken.push({ k, b, p }); this.breakFx(p, b); }
      }
      // 2) мобы: хитбокс +0.45 пересекает луч -> 400 урона (playerAttack: эндермен не уворачивается), поджог 8 с, толчок 1.2
      const dmg = tier.dmg * U.dmgMul, hits = [];
      for (const m of this.mobs) {
        if (m.dead) continue;
        const t = this.rayBox(eye, d, this.mobBox(m, U.hitboxInflate));
        if (t == null || t > U.range) continue;
        m.fire = U.fire * TPS; m.vx += d.x * U.knockback; m.vz += d.z * U.knockback;
        hits.push(this.damage(m, dmg, "ult", Math.hypot(m.x, m.z)));
      }
      this.beams.push({ d, t: 0, len: U.range });
      for (let t = 1; t < 90; t += 0.6) { const p = this.at(eye, d, t); this.parts.push({ ...p, vx: rnd(-.02, .02), vy: rnd(0, .03), vz: rnd(-.02, .02), life: rnd(.6, 1.6), age: 0, kind: Math.random() < .5 ? "soul" : "spark", sz: rnd(.08, .16) }); }
      this.emit("sound", "ult_shot");
      const mult = this.P.enchantments[0].mult[S.ench.nimble || 0];
      S.cdTicks = Math.max(1, Math.round(U.cd * mult)); S.cdStart = now; S.cdUntil = now + S.cdTicks * 50;
      if (!S.creative) S.ammo -= U.ammo;
      this.recoil = 2.4; this.shake = 1;
      this.emit("ult", { broken: broken.length, brokenTypes: [...new Set(broken.map((b) => b.b))], bedrock: this.countOnRay(eye, d, "bedrock"), hits });
      return true;
    }
    countOnRay(o, d, type) {
      const seen = new Set(); let n = 0;
      for (let t = 0; t <= 200; t += 0.3) { const p = this.at(o, d, t), k = `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`; if (!seen.has(k) && this.blocks.get(k) === type) { seen.add(k); n++; } }
      return n;
    }

    damage(m, dmg, src, dist) {
      // Эндермен: любой снаряд (IndirectEntityDamageSource) -> телепорт, урона нет
      if (src === "bullet" && m.def.dodge) {
        this.emit("sound", "ender_portal");
        for (let i = 0; i < 24; i++) this.parts.push({ x: m.x + rnd(-.4, .4), y: rnd(0, 2.8), z: m.z + rnd(-.4, .4), vx: rnd(-.05, .05), vy: rnd(-.02, .05), vz: rnd(-.05, .05), life: .9, age: 0, kind: "portal", sz: .12 });
        const nx = clamp(m.x0 + rnd(-6, 6), -14, 14), nz = m.z0 + rnd(-6, 6);
        m.x = nx; m.z = nz; m.tp = 1;
        return { mob: m.def.name, k: m.k, dodge: true, dist };
      }
      const before = m.hp;
      m.hp = Math.max(0, m.hp - dmg); m.hurt = 10;
      this.floats.push({ x: m.x, y: m.def.h + 0.4, z: m.z, txt: `−${Math.round(Math.min(dmg, before))}`, age: 0, col: src === "ult" ? "#9ef7ff" : "#ff5555" });
      const killed = m.hp <= 0;
      if (killed) { m.dead = 1; m.deadT = 0; }
      this.emit("sound", m.k === "iron_golem" ? "golem_hit" : "zombie_hurt");
      const r = { mob: m.def.name, k: m.k, dmg: Math.min(dmg, before), killed, dist, src, hp: m.hp };
      if (killed) this.emit("kill", r);
      return r;
    }
    breakFx(p, b) {
      for (let i = 0; i < 6; i++) this.parts.push({ x: Math.floor(p.x) + rnd(0, 1), y: Math.floor(p.y) + rnd(0, 1), z: Math.floor(p.z) + rnd(0, 1), vx: rnd(-.06, .06), vy: rnd(0, .1), vz: rnd(-.06, .06), g: 1, life: rnd(.5, .9), age: 0, kind: "chip", tex: b, sz: .14 });
    }
    targetSignal(hitPoint, bx, by, bz, face) {
      // TargetBlock: сила = 15 * (0.5 - max(|du|,|dv|)) / 0.5, минимум 1
      const fx = hitPoint.x - bx - 0.5, fy = hitPoint.y - by - 0.5, fz = hitPoint.z - bz - 0.5;
      const dd = face === "x" ? Math.max(Math.abs(fy), Math.abs(fz)) : face === "y" ? Math.max(Math.abs(fx), Math.abs(fz)) : Math.max(Math.abs(fx), Math.abs(fy));
      return Math.max(1, Math.ceil(15 * clamp((0.5 - dd) / 0.5, 0, 1)));
    }

    /* ------------------------------------------------------------ шаг симуляции */
    step(dt) {
      const ticks = dt * TPS;
      // мобы
      for (const m of this.mobs) {
        m.wob += dt;
        if (m.dead) {
          m.deadT += dt;
          if (m.deadT > 1 && !m.poofed) { m.poofed = 1; for (let i = 0; i < 14; i++) this.parts.push({ x: m.x + rnd(-.4, .4), y: rnd(0, 1.5), z: m.z + rnd(-.4, .4), vx: rnd(-.02, .02), vy: rnd(.02, .06), vz: rnd(-.02, .02), life: 1, age: 0, kind: "poof", sz: .3 }); }
          if (m.deadT > 3.2) Object.assign(m, this.newMob(this.spawns[m.i], m.i));
          continue;
        }
        if (m.hurt > 0) m.hurt -= ticks;
        if (m.tp > 0) m.tp -= dt * 2;
        // лёгкое брожение (голем и крипер почти стоят)
        const amp = m.k === "iron_golem" ? 0.6 : m.k === "creeper" ? 0.3 : m.k === "skeleton" ? 0.6 : m.i === 4 ? 0.4 : 1.4;
        const tx = m.x0 + Math.sin(m.wob * 0.35 + m.i) * amp;
        m.face = tx > m.x ? 1 : -1;
        if (!m.def.dodge || m.tp <= 0) m.x += (tx - m.x) * Math.min(1, dt * 0.8);
        // толчок
        m.x += m.vx * ticks; m.z += m.vz * ticks; m.vx *= Math.pow(0.6, ticks); m.vz *= Math.pow(0.6, ticks);
        // огонь: 1 урон в секунду
        if (m.fire > 0) {
          m.fire -= ticks; m.fireAcc += dt;
          if (m.fireAcc >= 1) { m.fireAcc -= 1; this.damage(m, 1, "fire", Math.hypot(m.x, m.z)); }
        }
      }
      // пули: 8 блоков/тик, подшаги по 0.25
      const sp = this.P.bullet.speed * ticks;
      for (const b of this.bullets) {
        b.age += ticks;
        if (b.age > this.P.bullet.lifeTicks) { b.dead = 1; continue; }
        const n = Math.max(1, Math.ceil(sp / 0.25)), st = sp / n;
        for (let i = 0; i < n && !b.dead; i++) {
          const o = { x: b.x, y: b.y, z: b.z };
          const mob = this.firstMobOnRay(o, b.d, st, 0.3);   // AbstractArrow: хитбокс сущности +0.3
          const blk = this.raycastBlocks(o, b.d, st);
          if (mob && (!blk || mob.t <= blk.t)) {
            const p = this.at(o, b.d, mob.t);
            b.x = p.x; b.y = p.y; b.z = p.z; b.dead = 1;
            const dist = Math.hypot(mob.m.x, mob.m.z);
            const r = this.damage(mob.m, b.dmg, "bullet", dist);
            if (!r.dodge) this.emit("sound", "bowhit");
            this.emit("hit", { ...r, flight: b.age / TPS, n: b.n, shotId: b.shotId });
            this.impact(p, "#ff4040");
          } else if (blk) {
            const p = this.at(o, b.d, blk.t);
            b.x = p.x; b.y = p.y; b.z = p.z; b.dead = 1;
            let sig = 0;
            if (blk.type === "target") sig = this.targetSignal(p, blk.x, blk.y, blk.z, blk.face || "z");
            this.emit("sound", "bowhit");
            this.emit("block", { type: blk.type, dist: Math.hypot(p.x, p.z), flight: b.age / TPS, signal: sig, n: b.n, shotId: b.shotId });
            if (sig) this.blocks.set(`${blk.x},${blk.y},${blk.z}`, "target"), (this.lit = this.lit || {}), (this.lit[`${blk.x},${blk.y},${blk.z}`] = { t: 1.2, sig });
            this.impact(p, "#ffd27a", blk.type);
          } else { b.x += b.d.x * st; b.y += b.d.y * st; b.z += b.d.z * st; }
        }
        b.trail.push({ x: b.x, y: b.y, z: b.z }); if (b.trail.length > 6) b.trail.shift();
        if (b.y < 0 && !b.dead) { b.dead = 1; this.impact({ x: b.x, y: 0, z: b.z }, "#9c8"); }
      }
      this.bullets = this.bullets.filter((b) => !b.dead || (b.fade = (b.fade || 0) + dt) < 0.12);
      // частицы
      for (const p of this.parts) { p.age += dt; p.x += p.vx * ticks; p.y += p.vy * ticks; p.z += p.vz * ticks; if (p.g) p.vy -= 0.04 * ticks; }
      this.parts = this.parts.filter((p) => p.age < p.life);
      this.floats.forEach((f) => (f.age += dt)); this.floats = this.floats.filter((f) => f.age < 1.2);
      this.beams.forEach((b) => (b.t += dt)); this.beams = this.beams.filter((b) => b.t < 1.6);
      this.flashes.forEach((f) => (f.t += dt)); this.flashes = this.flashes.filter((f) => f.t < 0.12);
      if (this.lit) for (const k in this.lit) { this.lit[k].t -= dt; if (this.lit[k].t <= 0) delete this.lit[k]; }
      this.recoil = Math.max(0, (this.recoil || 0) - dt * 5);
      this.shake = Math.max(0, (this.shake || 0) - dt * 2);
    }
    impact(p, col, tex) {
      for (let i = 0; i < 8; i++) this.parts.push({ x: p.x, y: p.y, z: p.z, vx: rnd(-.05, .05), vy: rnd(0, .08), vz: rnd(-.08, 0), g: 1, life: rnd(.3, .6), age: 0, kind: tex ? "chip" : "blood", tex, col, sz: .09 });
    }
    emit(ev, data) { const f = this.o.on && this.o.on[ev]; if (f) f(data); }

    /* ------------------------------------------------------------ кадр */
    frame(now) {
      const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.t += dt;
      if (this.mode === "hero") {
        const k = this.o.heroYaw ? this.o.heroYaw(this.t) : { yaw: Math.sin(this.t * 0.07) * 0.35, pitch: 0.02 };
        this.tYaw = k.yaw; this.tPitch = k.pitch;
      }
      const e = 1 - Math.pow(0.0005, dt);
      this.yaw += (this.tYaw - this.yaw) * e; this.pitch += (this.tPitch - this.pitch) * e;
      if (!this.visible) { this.step(dt); return; }
      this.step(dt);
      this.draw();
    }

    cam(over) {
      const sh = (this.shake || 0) * 0.01;
      return Object.assign({ yaw: this.yaw + rnd(-sh, sh), pitch: this.pitch + (this.recoil || 0) * 0.012 + rnd(-sh, sh), f: this.f, cx: this.W / 2, cy: this.H / 2 }, over || {});
    }

    draw() {
      const c = this.c, W = this.W, H = this.H;
      const cam = this.cam();
      this.render(c, cam, { w: W, h: H });
      if (this.mode === "hero" && this.o.lens) this.drawLens(c, cam);
      if (this.mode === "game") this.drawHud(c);
    }

    // линза в hero: второй рендер с FOV 30 вокруг курсора, обрезка по кругу, настоящий sniper_scope.png поверх
    drawLens(c, cam) {
      const L = this.o.lens(); if (!L) return;
      const R = L.r * this.dpr, px = L.x * this.dpr, py = L.y * this.dpr;
      const yaw = cam.yaw + Math.atan((px - this.W / 2) / cam.f), pitch = cam.pitch - Math.atan((py - this.H / 2) / cam.f);
      const f2 = (this.H / 2) / Math.tan(15 * D2R) * (L.zoom || 1);
      c.save();
      c.beginPath(); c.arc(px, py, R, 0, Math.PI * 2); c.clip();
      this.render(c, { yaw, pitch, f: f2, cx: px, cy: py }, { w: this.W, h: this.H, lens: true });
      c.restore();
      // рамка из текстуры прицела: круг текстуры ~290 px в радиусе
      const img = this.tex.scope; const k = R / 292;
      c.save();
      c.beginPath(); c.arc(px, py, R * 1.3, 0, Math.PI * 2); c.clip();
      c.globalAlpha = 0.92;
      c.drawImage(img, px - 540 * k, py - 358 * k * 289 / 310, 1080 * k, 720 * k * 289 / 310);
      const g = c.createRadialGradient(px, py, R * 1.05, px, py, R * 1.55);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(7,16,12,1)");
      c.globalCompositeOperation = "destination-out";
      const g2 = c.createRadialGradient(px, py, R * 1.06, px, py, R * 1.3); g2.addColorStop(0, "rgba(0,0,0,0)"); g2.addColorStop(1, "rgba(0,0,0,1)");
      c.fillStyle = g2; c.fillRect(px - R * 2, py - R * 2, R * 4, R * 4);
      c.restore();
    }

    /* ------------------------------------------------------------ рендер сцены */
    render(c, cam, vp) {
      const W = vp.w, H = vp.h;
      const f = cam.f;
      const horizon = cam.cy + Math.tan(cam.pitch) * f;
      // небо: сумерки, «ночное зрение»
      const sky = c.createLinearGradient(0, horizon - f * 0.9, 0, horizon);
      sky.addColorStop(0, "#04090d"); sky.addColorStop(0.55, "#0b1f22"); sky.addColorStop(1, "#27504a");
      c.fillStyle = sky; c.fillRect(0, 0, W, Math.max(0, horizon + 2));
      // звёзды
      c.fillStyle = "rgba(220,255,230,.8)";
      for (let i = 0; i < 90; i++) {
        const a = (i * 137.5 % 360) * D2R - Math.PI, e = 0.05 + (i * 71 % 100) / 100 * 0.7;
        const sx = cam.cx + Math.tan(clamp(a - cam.yaw, -1.4, 1.4)) * f, sy = horizon - Math.tan(e) * f;
        if (sx < 0 || sx > W || sy < 0) continue;
        const tw = 0.5 + 0.5 * Math.sin(this.t * 2 + i);
        c.globalAlpha = 0.25 + tw * 0.6; c.fillRect(sx, sy, (i % 3 ? 1 : 2) * this.dpr, (i % 3 ? 1 : 2) * this.dpr);
      }
      c.globalAlpha = 1;
      // луна (квадратная, как в игре)
      { const a = 0.55 - cam.yaw, sx = cam.cx + Math.tan(a) * f, sy = horizon - Math.tan(0.42) * f, s = f * 0.05;
        if (Math.abs(a) < 1.3) { c.fillStyle = "rgba(230,255,240,.12)"; c.fillRect(sx - s * 1.6, sy - s * 1.6, s * 3.2, s * 3.2); c.fillStyle = "#e8f5ea"; c.fillRect(sx - s / 2, sy - s / 2, s, s); c.fillStyle = "#c9d8cc"; c.fillRect(sx - s * .2, sy - s * .3, s * .22, s * .22); c.fillRect(sx + s * .1, sy + s * .05, s * .18, s * .18); } }
      // дальние холмы (параллакс по yaw, ступеньками)
      this.hills(c, cam, horizon, W, 0.09, "#10261f", 3.1, 0.6);
      this.hills(c, cam, horizon, W, 0.05, "#173a2c", 5.3, 1.3);
      // земля: «mode 7» полосы травы
      this.ground(c, cam, horizon, W, H);
      // объекты, дальние первыми
      const list = [];
      for (const [k, b] of this.blocks) { const [x, y, z] = k.split(",").map(Number); list.push({ z: Math.hypot(x + .5, z + .5), draw: () => this.drawBlock(c, cam, x, y, z, b) }); }
      for (const m of this.mobs) list.push({ z: Math.hypot(m.x, m.z), draw: () => this.drawMob(c, cam, m) });
      for (const d of this.posts) list.push({ z: d, draw: () => this.drawPost(c, cam, d) });
      list.sort((a, b) => b.z - a.z).forEach((o) => o.draw());
      // дымка у горизонта
      const fog = c.createLinearGradient(0, horizon - f * 0.04, 0, horizon + f * 0.16);
      fog.addColorStop(0, "rgba(39,80,74,0)"); fog.addColorStop(0.35, "rgba(39,80,74,.55)"); fog.addColorStop(1, "rgba(39,80,74,0)");
      c.fillStyle = fog; c.fillRect(0, horizon - f * 0.04, W, f * 0.2);
      this.drawFx(c, cam);
    }
    hills(c, cam, horizon, W, hMax, col, seed, par) {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, horizon + 1);
      const step = 6 * this.dpr;
      for (let x = 0; x <= W + step; x += step) {
        const a = Math.atan((x - cam.cx) / cam.f) + cam.yaw * par;
        const n = Math.sin(a * 3.1 + seed) * 0.5 + Math.sin(a * 7.3 + seed * 2) * 0.3 + Math.sin(a * 13.7 + seed) * 0.2;
        const h = (0.35 + 0.65 * (n * 0.5 + 0.5)) * hMax * cam.f;
        c.lineTo(x, Math.round((horizon - h) / (3 * this.dpr)) * 3 * this.dpr);
        c.lineTo(x + step, Math.round((horizon - h) / (3 * this.dpr)) * 3 * this.dpr);
      }
      c.lineTo(W, horizon + 1); c.closePath(); c.fill();
    }
    ground(c, cam, horizon, W, H) {
      const g = c.createLinearGradient(0, horizon, 0, H);
      g.addColorStop(0, "#1f3b2c"); g.addColorStop(1, "#2f5a2c");
      c.fillStyle = g; c.fillRect(0, horizon, W, H - horizon);
      if (!this.grassPat) { this.grassPat = c.createPattern(this.tex.grass, "repeat"); }
      const pat = this.grassPat;
      const rowH = Math.max(2, Math.round(2 * this.dpr));
      for (let y = Math.max(0, Math.floor(horizon) + 1); y < H; y += rowH) {
        const el = cam.pitch - Math.atan((y + rowH / 2 - cam.cy) / cam.f);
        if (el >= -0.0005) continue;
        const d = EYE / Math.tan(-el);
        if (d > 420) continue;
        const s = cam.f / d;                           // пикселей на блок у этой строки
        const k = s / 16;
        const x0 = cam.cx - d * Math.tan(cam.yaw) * s;
        const v = ((d % 1) + 1) % 1 * 16;
        pat.setTransform(new DOMMatrix().translate(x0, y - v * k).scale(k));
        c.fillStyle = pat;
        c.globalAlpha = clamp(1.25 - d / 140, 0.08, 1);
        c.fillRect(0, y, W, rowH);
      }
      c.globalAlpha = 1;
      // полосы дистанции на земле
      c.strokeStyle = "rgba(125,255,138,.14)"; c.lineWidth = this.dpr;
      for (const d of this.posts) {
        const a = this.proj(-40, 0, d, cam), b = this.proj(40, 0, d, cam);
        if (a && b) { c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
      }
      // тень-затемнение ближней земли
      const sh = c.createLinearGradient(0, H * 0.75, 0, H); sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,.35)");
      c.fillStyle = sh; c.fillRect(0, H * 0.75, W, H * 0.25);
    }
    drawBlock(c, cam, x, y, z, type) {
      const img = this.tex.blocks[type]; if (!img) return;
      const a = this.proj(x, y + 1, z, cam), b = this.proj(x + 1, y, z, cam);
      if (!a || !b) return;
      const w = b.x - a.x, h = b.y - a.y;
      if (w < 0.3 || a.x > this.W + 50 || b.x < -50) return;
      c.imageSmoothingEnabled = false;
      // боковая грань, если блок сбоку от взгляда
      const side = x + 0.5 < 0 ? x + 1 : x;
      const sa = this.proj(side, y + 1, z, cam), sb = this.proj(side, y + 1, z + 1, cam), sc = this.proj(side, y, z + 1, cam), sd = this.proj(side, y, z, cam);
      if (sa && sb && sc && sd && !this.block(x + (x + 0.5 < 0 ? 1 : -1), y, z)) {
        c.fillStyle = "rgba(0,0,0,.55)"; c.beginPath(); c.moveTo(sa.x, sa.y); c.lineTo(sb.x, sb.y); c.lineTo(sc.x, sc.y); c.lineTo(sd.x, sd.y); c.closePath(); c.fill();
      }
      // верх, если ниже глаз
      if (y + 1 < EYE && !this.block(x, y + 1, z)) {
        const t1 = this.proj(x, y + 1, z + 1, cam), t2 = this.proj(x + 1, y + 1, z + 1, cam);
        if (t1 && t2) { c.fillStyle = type === "target" ? "#b9a28c" : "rgba(160,170,160,.55)"; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, a.y); c.lineTo(t2.x, t2.y); c.lineTo(t1.x, t1.y); c.closePath(); c.fill(); }
      }
      c.drawImage(img, a.x, a.y, w + 0.5, h + 0.5);
      const lit = this.lit && this.lit[`${x},${y},${z}`];
      if (lit) { c.fillStyle = `rgba(255,40,30,${0.25 + 0.35 * Math.sin(this.t * 20) ** 2})`; c.fillRect(a.x, a.y, w, h); }
      const dist = Math.hypot(x + .5, z + .5);
      if (dist > 30) { c.fillStyle = `rgba(39,80,74,${clamp((dist - 30) / 300, 0, .6)})`; c.fillRect(a.x, a.y, w + .5, h + .5); }
    }
    drawPost(c, cam, d) {
      const x = 15;
      const a = this.proj(x, 2.6, d, cam), b = this.proj(x, 0, d, cam);
      if (!a || !b) return;
      const w = Math.max(1, 0.18 * a.s);
      c.fillStyle = "#4a3a24"; c.fillRect(a.x - w / 2, a.y, w, b.y - a.y);
      const fs = Math.max(8 * this.dpr, 0.9 * a.s);
      if (fs > 3) {
        c.fillStyle = "rgba(10,20,15,.8)"; c.fillRect(a.x - fs * 1.4, a.y - fs * 1.05, fs * 2.8, fs * 1.1);
        c.fillStyle = "#7dff8a"; c.font = `${Math.round(fs * 0.8)}px Tektur, monospace`; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText(d + " м", a.x, a.y - fs * 0.5);
      }
    }
    red(img) {
      if (!this.redCache.has(img)) {
        const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height;
        const t = cv.getContext("2d"); t.drawImage(img, 0, 0); t.globalCompositeOperation = "source-in"; t.fillStyle = "#ff1a1a"; t.fillRect(0, 0, cv.width, cv.height);
        this.redCache.set(img, cv);
      }
      return this.redCache.get(img);
    }
    drawMob(c, cam, m) {
      const img = this.tex.mobs[m.def.sprite]; if (!img) return;
      const top = this.proj(m.x, m.def.h, m.z, cam), bot = this.proj(m.x, 0, m.z, cam);
      if (!top || !bot) return;
      const h = bot.y - top.y, w = h * img.width / img.height;
      if (bot.x + w < 0 || bot.x - w > this.W) return;
      c.save();
      c.imageSmoothingEnabled = false;
      c.translate(bot.x, bot.y);
      if (m.dead) { c.rotate(Math.min(1, m.deadT * 2.2) * Math.PI / 2 * (m.i % 2 ? 1 : -1)); c.globalAlpha = m.deadT > 1 ? 0 : 1; }
      if (m.tp > 0) c.globalAlpha = 1 - m.tp;
      c.drawImage(img, -w / 2, -h, w, h);
      if (m.hurt > 0 || m.dead) { c.globalAlpha *= 0.55; c.drawImage(this.red(img), -w / 2, -h, w, h); c.globalAlpha = 1; }
      if (m.fire > 0 && this.tex.fire) {
        const fr = this.tex.fire, n = fr.height / fr.width, fi = Math.floor(this.t * 16) % n;
        c.globalAlpha = 0.9;
        c.drawImage(fr, 0, fi * fr.width, fr.width, fr.width, -w * 0.7, -h * 1.05, w * 1.4, h * 1.05);
      }
      c.restore();
      // полоска ХП, если ранен
      if (!m.dead && m.hp < m.def.hp) {
        const bw = Math.max(18 * this.dpr, w * 1.2), bh = Math.max(3, 3 * this.dpr), y = top.y - bh * 3;
        c.fillStyle = "rgba(0,0,0,.7)"; c.fillRect(bot.x - bw / 2 - 1, y - 1, bw + 2, bh + 2);
        c.fillStyle = m.hp / m.def.hp > 0.5 ? "#55ff55" : m.hp / m.def.hp > 0.25 ? "#ffff55" : "#ff5555"; c.fillRect(bot.x - bw / 2, y, bw * m.hp / m.def.hp, bh);
      }
    }
    drawFx(c, cam) {
      // пули: трассер (сама пуля ~0.2 блока, издалека не видна — рисуем светящийся след)
      for (const b of this.bullets) {
        const pts = b.trail.map((p) => this.proj(p.x, p.y, p.z, cam)).filter(Boolean);
        if (pts.length < 2) continue;
        c.strokeStyle = "rgba(255,230,160,.85)"; c.lineWidth = Math.max(1, 1.6 * this.dpr); c.lineCap = "round";
        c.beginPath(); c.moveTo(pts[0].x, pts[0].y); pts.forEach((p) => c.lineTo(p.x, p.y)); c.stroke();
        const h = pts[pts.length - 1]; c.fillStyle = "#fff6d0"; c.beginPath(); c.arc(h.x, h.y, Math.max(1.2, 0.12 * h.s), 0, Math.PI * 2); c.fill();
      }
      // луч ульты
      for (const bm of this.beams) {
        const k = 1 - bm.t / 1.6;
        const a = this.proj(bm.d.x * 1.2, EYE - 0.25 + bm.d.y * 1.2, bm.d.z * 1.2, cam), b = this.proj(bm.d.x * bm.len, EYE + bm.d.y * bm.len, bm.d.z * bm.len, cam);
        if (!a || !b) continue;
        c.save(); c.globalCompositeOperation = "lighter"; c.lineCap = "round";
        [[26, "rgba(138,92,246,"], [14, "rgba(80,220,255,"], [5, "rgba(230,255,255,"]].forEach(([wd, col]) => {
          c.strokeStyle = col + (0.5 * k) + ")"; c.lineWidth = wd * this.dpr * (0.6 + k * 0.6);
          c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
        });
        c.restore();
      }
      // частицы
      for (const p of this.parts) {
        const q = this.proj(p.x, p.y, p.z, cam); if (!q) continue;
        const s = Math.max(1, p.sz * q.s), k = 1 - p.age / p.life;
        if (p.kind === "chip" && p.tex && this.tex.blocks[p.tex]) { c.globalAlpha = k; c.drawImage(this.tex.blocks[p.tex], 4, 4, 4, 4, q.x - s / 2, q.y - s / 2, s, s); }
        else {
          c.globalAlpha = k;
          c.fillStyle = p.kind === "soul" ? "#6ff2ff" : p.kind === "spark" ? "#e8ffff" : p.kind === "portal" ? "#c77dff" : p.kind === "poof" ? "#d8d8d8" : p.kind === "blood" ? "#b3121b" : (p.col || "#fff");
          c.fillRect(q.x - s / 2, q.y - s / 2, s, s);
        }
      }
      c.globalAlpha = 1;
      // цифры урона
      for (const fl of this.floats) {
        const q = this.proj(fl.x, fl.y + fl.age * 0.8, fl.z, cam); if (!q) continue;
        c.globalAlpha = 1 - fl.age / 1.2; c.fillStyle = fl.col; c.font = `bold ${Math.round(14 * this.dpr)}px Tektur, monospace`; c.textAlign = "center";
        c.fillText(fl.txt, q.x, q.y);
      }
      c.globalAlpha = 1;
    }

    /* ------------------------------------------------------------ HUD как в игре */
    drawHud(c) {
      const W = this.W, H = this.H, S = this.state, d = this.dpr;
      // вспышка выстрела
      for (const f of this.flashes) { c.fillStyle = `rgba(255,240,200,${0.25 * (1 - f.t / 0.12)})`; c.fillRect(0, 0, W, H); }
      if (this.scoped) {
        // SniperAimingOverlay: sniper_scope.png растянут на весь экран, остальной HUD скрыт
        // Текстура 1080×720 из мода. Рисуем так, чтобы круг был ровным кругом по центру экрана,
        // а всё, что за краем текстуры, заливаем её же чёрным
        c.imageSmoothingEnabled = true;
        const R = H * 0.48, kx = R / 289, ky = R / 310, tw = 1080 * kx, th = 720 * ky, x0 = W / 2 - tw / 2, y0 = H / 2 - 358 * ky;
        c.fillStyle = "#000";
        c.fillRect(0, 0, W, Math.max(0, y0) + 1); c.fillRect(0, y0 + th - 1, W, H); c.fillRect(0, 0, Math.max(0, x0) + 1, H); c.fillRect(x0 + tw - 1, 0, W, H);
        c.drawImage(this.tex.scope, x0, y0, tw, th);
        return;
      }
      const g = Math.max(1, Math.min(Math.floor(W / 320), Math.floor(H / 240)));   // авто-масштаб GUI, как в игре
      // прицел-крестик
      c.imageSmoothingEnabled = false;
      c.globalCompositeOperation = "difference";
      c.drawImage(this.tex.icons, 0, 0, 15, 15, W / 2 - 7.5 * g, H / 2 - 7.5 * g, 15 * g, 15 * g);
      c.globalCompositeOperation = "source-over";
      // хотбар: слот 1 снайперка, слот 2 пули
      const hw = 182 * g, hx = W / 2 - hw / 2, hy = H - 22 * g - 2 * g;
      c.drawImage(this.tex.widgets, 0, 0, 182, 22, hx, hy, hw, 22 * g);
      c.drawImage(this.tex.widgets, 0, 22, 24, 24, hx - g, hy - g, 24 * g, 24 * g);
      const slot = (i) => ({ x: hx + (3 + i * 20) * g, y: hy + 3 * g, s: 16 * g });
      const s0 = slot(0), s1 = slot(1);
      c.imageSmoothingEnabled = true;
      c.drawImage(this.tex.icons_items[S.tier], s0.x, s0.y, s0.s, s0.s);
      c.drawImage(this.tex.bullet, s1.x, s1.y + s1.s / 2 - s1.s * 24 / 124 / 2 - g, s1.s, s1.s * 24 / 124 * 1.6);
      c.imageSmoothingEnabled = false;
      // КД: белая полупрозрачная заливка, уменьшается сверху вниз (ItemCooldowns)
      const now = performance.now();
      if (now < S.cdUntil) {
        const k = (S.cdUntil - now) / (S.cdTicks * 50);
        c.fillStyle = "rgba(255,255,255,.5)"; c.fillRect(s0.x, s0.y + s0.s * (1 - k), s0.s, s0.s * k);
      }
      // количество пуль
      const n = S.creative ? "∞" : String(S.ammo);
      c.font = `${9 * g}px Tiny5, monospace`; c.textAlign = "right"; c.textBaseline = "alphabetic";
      c.fillStyle = "#3f3f3f"; c.fillText(n, s1.x + s1.s + g * 2, s1.y + s1.s + g * 2);
      c.fillStyle = S.ammo > 0 || S.creative ? "#fff" : "#ff5555"; c.fillText(n, s1.x + s1.s + g, s1.y + s1.s + g);
      // дальномер (подсказка сайта, в игре его нет)
      const hit = this.aimInfo();
      if (hit) {
        c.font = `${8 * g}px Tektur, monospace`; c.textAlign = "left";
        const txt = `${hit.name} · ${hit.dist.toFixed(0)} м`;
        c.fillStyle = "rgba(0,0,0,.55)"; const tw = c.measureText(txt).width;
        c.fillRect(W / 2 + 12 * g, H / 2 + 6 * g, tw + 8 * g, 11 * g);
        c.fillStyle = "#7dff8a"; c.fillText(txt, W / 2 + 16 * g, H / 2 + 14.5 * g);
      }
    }
    aimInfo() {
      const eye = { x: 0, y: EYE, z: 0 }, d = this.dir();
      const blk = this.raycastBlocks(eye, d, 400);
      const mob = this.firstMobOnRay(eye, d, blk ? blk.t : 400, 0.3);
      if (mob) return { name: mob.m.def.name, dist: mob.t };
      if (blk) return { name: this.P.names["minecraft:" + blk.type] || (blk.type === "target" ? "Мишень" : blk.type === "hay_block" ? "Сено" : "Каменные кирпичи"), dist: blk.t };
      return null;
    }
    reset() { this.buildWorld(); this.bullets = []; this.parts = []; this.beams = []; this.floats = []; this.lit = {}; }
  }
  window.ZMRange = Range;
})();
