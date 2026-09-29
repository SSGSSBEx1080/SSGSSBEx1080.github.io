/* =====================================================================
   №02 · Полигон: срез мира из блоков Minecraft, по которому бьёт взрыв ТНТ-брони.
   Canvas 2D, ванильные текстуры 16x16. Земля, камень с рудами, коренная порода,
   дерево и домик генерируются заново кнопкой «новый мир».
   Использование:
     const w = new ZM.TntWorld(canvas, { url, wearer, smoke, worn(), autoAttack(), onZombieHit(), onKill(byBlast), ...формулы });
     w.hit()                       игрок бьёт зомби мечом
     w.hurtPlayer(dmg, gain)       по носителю прилетел урон (показ чисел)
     w.detonate({radius, breaks:"all"|"soft"|"none", overkill}, windupSec, onBoom)
   ===================================================================== */
(function () {
  "use strict";
  const T = ["air", "grass_block_side", "dirt", "stone", "coal_ore", "iron_ore", "gold_ore", "redstone_ore", "diamond_ore", "copper_ore",
    "gravel", "bedrock", "oak_log", "leaves", "oak_planks", "glass", "cobblestone", "obsidian", "deepslate", "andesite", "granite", "sand"];
  const ID = Object.fromEntries(T.map((n, i) => [n, i]));
  // взрывоустойчивость блоков (ванилла): выше MAX_RESISTANCE_TO_BREAK=100 взрыв брони не ломает
  const RESIST = { bedrock: 3600000, obsidian: 1200, deepslate: 6, stone: 6, cobblestone: 6, andesite: 6, granite: 6, coal_ore: 3, iron_ore: 3, gold_ore: 3,
    redstone_ore: 3, diamond_ore: 3, copper_ore: 3, oak_log: 2, oak_planks: 3, dirt: 0.5, grass_block_side: 0.6, gravel: 0.6, sand: 0.5, glass: 0.3, leaves: 0.2 };
  // «мягкие» блоки для Миротворца I (isSoftBlock): земля, песок, листва, гравий, трава + всё с прочностью ≤1 и стойкостью ≤2.5 (стекло)
  const SOFT_N = ["dirt", "grass_block_side", "sand", "gravel", "leaves", "glass"];
  const STRUCT = new Set(["leaves", "oak_log", "oak_planks", "glass", "obsidian"].map((n) => ID[n]));
  const SOFT = new Set(SOFT_N.map((n) => ID[n]));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => Math.floor(rnd(a, b + 1));

  class TntWorld {
    constructor(canvas, opt) {
      this.cv = canvas; this.cx = canvas.getContext("2d"); this.o = opt;
      this.tex = {}; this.ready = false; this.visible = false;
      this.parts = []; this.debris = []; this.texts = []; this.lava = []; this.smoke = []; this.gameTime = 0; this.flashT = 0;
      this.phase = "idle"; this.shake = 0;
      const names = [...T.slice(1), "grass_top", "zombie", "pig"];
      let left = names.length;
      names.forEach((n) => { const im = new Image(); im.onload = () => { if (--left === 0) { this.ready = true; this.resize(true); } }; im.src = opt.url(n); this.tex[n] = im; });
      this.smokeTex = new Image(); this.smokeTex.src = opt.smoke;
      this.wear = {}; ["base", "head", "chest", "legs", "feet", "full"].forEach((k) => { const im = new Image(); im.src = opt.wearer(k); this.wear[k] = im; });
      new ResizeObserver(() => this.resize()).observe(canvas);
      this.last = performance.now();
      const loop = (t) => { const dt = Math.min(0.05, (t - this.last) / 1000); this.last = t; if (this.visible && this.ready) { this.step(dt); this.draw(); } requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }

    /* ---------- размеры и генерация ---------- */
    resize(force) {
      const r = this.cv.getBoundingClientRect();
      if (!r.width) return;
      const dpr = Math.min(2, devicePixelRatio || 1);
      const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
      if (!force && Math.abs(w - this.cv.width) < 4 && Math.abs(h - this.cv.height) < 4) return;
      this.cv.width = w; this.cv.height = h;
      this.rows = r.width < 600 ? 15 : 17;
      this.B = h / this.rows;
      this.cols = Math.ceil(w / this.B);
      if (this.ready) this.regen();
    }
    regen() {
      const { rows, cols } = this;
      this.g = new Uint8Array(rows * cols);      // что стоит сейчас
      this.bg = new Uint8Array(rows * cols);     // что было (для тёмной «стенки» в воронке)
      this.cxc = Math.floor(cols / 2);
      const base = Math.round(rows * 0.44);
      const ph = rnd(0, 6), amp = rnd(0.6, 1.4);
      this.top = [];
      for (let c = 0; c < cols; c++) {
        const d = Math.abs(c - this.cxc);
        let t = base + (d < 5 ? 0 : Math.round(Math.sin(c * 0.45 + ph) * amp + Math.sin(c * 0.17 + ph * 2) * amp));
        this.top[c] = t;
        for (let y = t; y < rows; y++) {
          let b = y === t ? "grass_block_side" : y <= t + ri(2, 3) ? "dirt" : y > rows * 0.8 ? "deepslate" : "stone";
          if (y >= rows - 1 || (y === rows - 2 && Math.random() < 0.5)) b = "bedrock";
          this.set(c, y, b);
        }
      }
      // руды и вкрапления
      const vein = (name, n, yMin, yMax, size) => {
        for (let i = 0; i < n; i++) {
          let c = ri(0, cols - 1), y = ri(Math.round(rows * yMin), Math.round(rows * yMax));
          for (let k = 0; k < size; k++) {
            const cur = this.get(c, y);
            if (cur === ID.stone || cur === ID.deepslate) this.set(c, y, name);
            c += ri(-1, 1); y += ri(-1, 1);
          }
        }
      };
      const area = cols / 30;
      vein("andesite", 3 * area, 0.55, 0.85, 6); vein("granite", 2 * area, 0.55, 0.85, 6); vein("gravel", 2 * area, 0.55, 0.8, 5);
      vein("coal_ore", 5 * area, 0.55, 0.8, 4); vein("copper_ore", 2 * area, 0.6, 0.8, 3); vein("iron_ore", 4 * area, 0.6, 0.9, 3);
      vein("gold_ore", 1.5 * area, 0.75, 0.92, 2); vein("redstone_ore", 2 * area, 0.8, 0.94, 3); vein("diamond_ore", 1 * area, 0.85, 0.95, 2);
      // дерево слева
      const tree = (c) => {
        const t = this.top[c], h = ri(4, 5);
        for (let i = 1; i <= h; i++) this.set(c, t - i, "oak_log");
        for (let dy = -2; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) {
          if (Math.abs(dx) + Math.abs(dy) > 3 || (dx === 0 && dy > -1)) continue;
          if (dy === -2 && Math.abs(dx) === 2) continue;
          if (!this.get(c + dx, t - h + dy)) this.set(c + dx, t - h + dy, "leaves");
        }
      };
      tree(this.cxc - ri(5, 7));
      if (cols > 30) tree(ri(2, 4));
      // домик справа: пол из булыжника, стены из досок с брёвнами по углам, окно, крыша
      const hx = this.cxc + ri(5, 6), hw = ri(5, 6), ht = this.top[hx];
      for (let x = hx; x < hx + hw; x++) { this.top[x] = ht; for (let y = ht; y < ht + 1; y++) this.set(x, y, "cobblestone"); }
      for (let y = ht - 1; y >= ht - 3; y--) for (let x = hx; x < hx + hw; x++) {
        const edge = x === hx || x === hx + hw - 1;
        this.set(x, y, edge ? "oak_log" : y === ht - 2 && (x === hx + 2) ? "glass" : "oak_planks");
      }
      for (let x = hx - 1; x <= hx + hw; x++) this.set(x, ht - 4, "oak_planks");
      for (let x = hx + 1; x < hx + hw - 1; x++) this.set(x, ht - 5, "oak_planks");
      // обсидиановый столб: показывает, что его взрыв не берёт
      if (cols > 34) { const oc = hx + hw + 3; if (oc < cols - 1) for (let i = 1; i <= 3; i++) this.set(oc, this.top[oc] - i, "obsidian"); }
      this.bg.set(this.g);
      this.player = { x: this.cxc + 0.5, feet: this.top[this.cxc], vy: 0, flash: 0 };
      this.spawnZombie(true);
      this.spawnPig();
      this.paintTerrain();
    }
    get(c, y) { return c < 0 || y < 0 || c >= this.cols || y >= this.rows ? 0 : this.g[y * this.cols + c]; }
    set(c, y, n) { if (c >= 0 && y >= 0 && c < this.cols && y < this.rows) this.g[y * this.cols + c] = typeof n === "number" ? n : ID[n]; }
    // для мобов: только «земля», постройки и листва не считаются опорой (иначе зомби залезает на крышу)
    mobGround(x, fromY) { const c = Math.floor(x); for (let y = Math.max(0, Math.floor(fromY)); y < this.rows; y++) { const b = this.get(c, y); if (b && !STRUCT.has(b)) return y; } return this.rows; }
    groundBelow(x, fromY) { const c = Math.floor(x); for (let y = Math.max(0, Math.floor(fromY)); y < this.rows; y++) if (this.get(c, y) && this.get(c, y) !== ID.leaves) return y; return this.rows; }

    spawnZombie(first) {
      const side = first ? 1 : Math.random() < 0.5 ? -1 : 1;
      const x = this.cxc + 0.5 + side * rnd(3, 4.5);
      this.zombie = { x, feet: this.top[Math.floor(x)], vx: 0, vy: 0, hp: 20, hurt: 0, dead: false, rot: 0, respawn: 0, dir: -side };
    }

    /* ---------- отрисовка террейна в отдельный canvas (только когда меняется) ---------- */
    paintTerrain() {
      const { rows, cols, B } = this;
      if (!this.tc) this.tc = document.createElement("canvas");
      this.tc.width = this.cv.width; this.tc.height = this.cv.height;
      const c = this.tc.getContext("2d");
      c.imageSmoothingEnabled = false;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const id = this.g[y * cols + x], was = this.bg[y * cols + x];
        const px = Math.floor(x * B), py = Math.floor(y * B), s = Math.ceil(B) + 1;
        if (!id) {
          // выбитый блок под землёй: тёмная «задняя стенка», как в пещере
          if (was && was !== ID.leaves && was !== ID.glass && y >= this.origTop(x)) { c.drawImage(this.tex[T[was]], px, py, s, s); c.fillStyle = "rgba(8,4,3,.72)"; c.fillRect(px, py, s, s); }
          continue;
        }
        c.drawImage(this.tex[T[id]], px, py, s, s);
        // глубже = темнее
        const depth = Math.max(0, y - this.top[x]);
        const shade = Math.min(0.55, depth * 0.045);
        if (shade) { c.fillStyle = `rgba(0,0,0,${shade})`; c.fillRect(px, py, s, s); }
      }
    }
    origTop(x) { for (let y = 0; y < this.rows; y++) { const b = this.bg[y * this.cols + x]; if (b && b !== ID.leaves && b !== ID.oak_log && b !== ID.oak_planks && b !== ID.glass && b !== ID.obsidian) return y; } return this.rows; }

    // мирная свинья: пасётся слева от носителя. Нужна, чтобы видеть разницу Миротворца II и III
    spawnPig() {
      const x = this.cxc + 0.5 - rnd(3.2, 4.2);
      this.pig = { x, home: x, feet: this.top[Math.floor(x)], vx: 0, vy: 0, hp: 10, hurt: 0, dead: false, fly: false, respawn: 0, dir: 1, walk: 0, target: x };
    }
    /* ---------- удары ---------- */
    // игрок бьёт зомби мечом (заряд от этого НЕ копится, так в коде мода)
    hit() {
      const z = this.zombie;
      if (z.dead || this.phase !== "idle") return 0;
      const dmg = ri(4, 7);
      this.damageZombie(dmg, Math.sign(z.x - this.player.x) * 5, -4);
      return dmg;
    }
    damageZombie(dmg, vx, vy, byBlast) {
      const z = this.zombie;
      z.hp -= dmg; z.hurt = 0.3; z.vx = vx; z.vy = vy;
      this.texts.push({ x: z.x, y: z.feet - 2.1, t: 0, s: "-" + Math.round(dmg), c: "#ff5555" });
      if (z.hp <= 0) {
        z.dead = true; z.respawn = byBlast ? 2.2 : 1.4; z.fly = !!byBlast;
        if (!byBlast) this.smokeAt(z.x, z.feet - 1, 5);
        this.o.onKill && this.o.onKill(!!byBlast);
      }
    }
    damagePig(dmg, vx, vy) {
      const m = this.pig;
      m.hp -= dmg; m.hurt = 0.3; m.vx = vx; m.vy = vy;
      this.texts.push({ x: m.x, y: m.feet - 1.3, t: 0, s: "-" + Math.round(dmg), c: "#ff9ab0" });
      if (m.hp <= 0) { m.dead = true; m.fly = true; m.respawn = 2.2; m.rot = 0; }
    }
    // по носителю прилетает урон: в моде именно это копит энергию (onLivingHurt)
    hurtPlayer(dmg, gain) {
      const pl = this.player;
      pl.hurt = 0.35;
      this.texts.push({ x: pl.x - 0.2, y: pl.feet - 2.2, t: 0, s: "-" + dmg + "♥", c: "#ff5555" });
      if (gain) this.texts.push({ x: pl.x + 0.6, y: pl.feet - 1.4, t: -0.12, s: "+" + (+gain.toFixed(1)) + "⚡", c: "#ffcc33" });
      if (gain >= 15) for (let i = 0; i < gain / 5; i++) this.dust(pl.x + rnd(-0.3, 0.3), pl.feet - 1 + rnd(-0.5, 0.5), 0.6, rnd(-1, 1), rnd(-1, 0));
    }
    zombieAt(clientX, clientY) {
      const r = this.cv.getBoundingClientRect(), k = this.cv.width / r.width;
      const x = ((clientX - r.left) * k) / this.B, y = ((clientY - r.top) * k) / this.B;
      const z = this.zombie;
      return !z.dead && Math.abs(x - z.x) < 1.1 && y > z.feet - 2.4 && y < z.feet + 0.4;
    }
    dust(x, y, life, vx = 0, vy = 0, big) { this.parts.push({ x, y, vx, vy, t: 0, d: life, s: big ? 0.2 : 0.13, back: false }); }
    smokeAt(x, y, n) { for (let i = 0; i < n; i++) this.smoke.push({ x: x + rnd(-0.5, 0.5), y: y + rnd(-0.6, 0.4), vx: rnd(-0.6, 0.6), vy: rnd(-1.2, -0.4), t: 0, d: rnd(0.6, 1.1), s: rnd(0.6, 1.1) }); }

    /* ---------- детонация: 40 тиков частиц, потом взрыв ---------- */
    detonate(p, windup, onBoom) {
      if (this.phase !== "idle") return false;
      this.phase = "windup"; this.wt = 0; this.wmax = windup; this.tick = -1; this.blast = p; this.onBoom = onBoom;
      return true;
    }
    // частицы разгона, как spawnChargingParticles(): круг у ног (0–10 тиков), спираль вверх (5–30), опускающаяся пентаграмма (30–40)
    chargeTick(t) {
      const pl = this.player, x = pl.x, feet = pl.feet, D = 40, prog = t / D, SQ = 0.28; // SQ: наклон «камеры», горизонтальный круг виден эллипсом
      const put = (px, pz, py) => this.parts.push({ x: px, y: py + pz * SQ, vx: 0, vy: 0, t: 0, d: 0.45, s: 0.13, back: pz < 0 });
      if (t < 10) { const r = 1 + prog * 0.5; for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; put(x + Math.cos(a) * r, Math.sin(a) * r, feet - 0.1); } }
      if (t >= 5 && t <= 30) {
        const h = 1.8 + 1, cy = feet - h * prog;
        for (let i = 0; i < 10; i++) { const a = (this.gameTime * 0.2 + i * 0.6) % (2 * Math.PI); put(x + Math.cos(a) * 1.5, Math.sin(a) * 1.5, cy - 0.1 * i); }
      }
      if (t >= 30) {
        const pp = (t - 30) / (D - 30), H = 4, y = feet - (H - H * pp), R = 2;
        if (y < feet + 0.5) for (let i = 0; i < 5; i++) {
          const a = ((-90 + i * 144) * Math.PI) / 180, b = ((-90 + ((i + 2) % 5) * 144) * Math.PI) / 180;
          const ax = Math.cos(a) * R, az = Math.sin(a) * R, bx = Math.cos(b) * R, bz = Math.sin(b) * R;
          put(x + ax, az, y);
          for (let j = 1; j <= 5; j++) { const s = j / 6; put(x + ax + (bx - ax) * s, az + (bz - az) * s, y); }
        }
      }
    }
    boom() {
      const p = this.blast, pl = this.player, R = p.radius;
      const cx = Math.floor(pl.x), cy = Math.round(pl.feet) - 1;   // player.blockPosition(): блок, в котором стоят ноги
      let broken = 0;
      if (p.breaks !== "none") {
        const r = Math.ceil(R);
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > R * R) continue;              // шар радиуса R (в срезе круг)
          const x = cx + dx, y = cy + dy, id = this.get(x, y);
          if (!id) continue;
          if (RESIST[T[id]] > this.o.maxResistance) continue;   // обсидиан, бедрок
          if (p.breaks === "soft" && !SOFT.has(id)) continue;   // Миротворец I
          this.set(x, y, 0); broken++;
          if (Math.random() < 0.6) {
            const a = Math.atan2(dy, dx || 0.01), sp = rnd(5, 11) * (1.15 - Math.hypot(dx, dy) / (R + 1));
            this.debris.push({ x: x + 0.5, y: y + 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rnd(4, 9), rot: 0, vr: rnd(-12, 12), s: rnd(0.3, 0.55), id, t: 0 });
          }
        }
        if (broken) this.paintTerrain();
      }
      // урон и отбрасывание по формуле executeExplosion()
      const dr = R * this.o.damageRadiusMul;
      // shouldDamageTarget(): при Миротворце III урон только враждебным мобам и боссам
      const blastMob = (m, hostile, apply) => {
        if (!m || m.dead) return null;
        const dx = m.x - pl.x, dy = m.feet - pl.feet, dist = Math.hypot(dx, dy);
        if (dist > dr) return { dmg: 0, out: true };
        if (p.hostileOnly && !hostile) { this.texts.push({ x: m.x, y: m.feet - 1.4, t: 0, s: "♥ цела", c: "#7dff9a" }); return { dmg: 0, spared: true }; }
        const I = 1 - dist / dr;
        const dmg = p.overkill ? this.o.overkillDamage * I : (this.o.baseDamage + R * this.o.radiusDamageMul) * I;
        const kb = R * this.o.knockbackMul * I * 20, n = dist || 1;   // блоков/тик → блоков/с
        apply(dmg, Math.max(-30, Math.min(30, (dx / n) * kb)), Math.min(-4, (dy / n) * kb - 6));
        return { dmg, killed: m.hp <= 0 };
      };
      const hitInfo = blastMob(this.zombie, true, (d, vx, vy) => this.damageZombie(d, vx, vy, true));
      const pigInfo = blastMob(this.pig, false, (d, vx, vy) => this.damagePig(d, vx, vy));
      // эффекты взрыва из кода: 30 красной пыли, вспышка, 10 лавы, кольцо дыма (72 направления)
      const ey = pl.feet - 1.26;
      for (let i = 0; i < 30; i++) this.dust(pl.x + rnd(-0.5, 0.5), ey + rnd(-0.5, 0.5), rnd(0.6, 1.2), rnd(-4, 4), rnd(-4, 3), true);
      this.flashT = 0.35;
      for (let i = 0; i < 10; i++) this.lava.push({ x: pl.x + rnd(-0.5, 0.5), y: pl.feet - 0.5, vx: rnd(-3, 3), vy: rnd(-9, -4), t: 0, d: rnd(1, 1.8) });
      for (let a = 0; a < 360; a += 5) {
        const r = (a * Math.PI) / 180;
        this.smoke.push({ x: pl.x, y: pl.feet - 0.5 + Math.sin(r) * 0.15, vx: Math.cos(r) * 6, vy: -rnd(0.3, 1.2), t: -rnd(0, 0.1), d: rnd(1.2, 2), s: rnd(0.7, 1.2), drag: true });
      }
      this.shake = 0.45 + R * 0.04;
      this.phase = "idle";
      this.onBoom && this.onBoom({ broken, radius: R, hit: hitInfo, pig: pigInfo });
    }

    /* ---------- физика ---------- */
    step(dt) {
      const G = 30;
      this.gameTime += dt * 20;
      if (this.phase === "windup") {
        this.wt += dt;
        const ticks = Math.min(40, Math.floor((this.wt / this.wmax) * 40));
        while (this.tick < ticks) { this.tick++; this.chargeTick(this.tick); }
        this.player.flash = this.wt / this.wmax;
        this.shake = Math.max(this.shake, this.player.flash * 0.12);
        if (this.wt >= this.wmax) { this.player.flash = 0; this.boom(); }
      }
      this.parts = this.parts.filter((p) => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9; return p.t < p.d; });
      this.lava = this.lava.filter((l) => { l.t += dt; l.vy += G * 0.6 * dt; l.x += l.vx * dt; l.y += l.vy * dt; if (l.t % 0.06 < dt) this.smoke.push({ x: l.x, y: l.y, vx: 0, vy: -0.6, t: 0, d: 0.5, s: 0.25 }); return l.t < l.d && l.y < this.rows; });
      this.smoke = this.smoke.filter((s) => { s.t += dt; if (s.t < 0) return true; s.x += s.vx * dt; s.y += s.vy * dt; if (s.drag) s.vx *= Math.pow(0.08, dt); return s.t < s.d; });
      this.debris = this.debris.filter((d) => { d.t += dt; d.vy += G * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt; return d.y < this.rows + 2 && d.t < 3; });
      this.texts = this.texts.filter((t) => (t.t += dt) < 1);
      if (this.flashT > 0) this.flashT -= dt;
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 1.2);
      const pl = this.player;
      pl.hurt = Math.max(0, (pl.hurt || 0) - dt);
      // носитель: после взрыва скорость обнуляется (NEEDS_VELOCITY_RESET), но в воронку он падает
      const g = this.mobGround(pl.x, pl.feet - 0.01);
      if (g > pl.feet + 0.01) { pl.vy += G * dt; pl.feet = Math.min(g, pl.feet + pl.vy * dt); if (pl.feet >= g) pl.vy = 0; } else pl.vy = 0;
      // свинья: бродит у своего места, отлетает от взрыва
      const pg = this.pig;
      if (pg) {
        if (pg.dead && !pg.fly) { pg.respawn -= dt; if (pg.respawn <= 0) this.spawnPig(); }
        else if (pg.fly) { pg.x += pg.vx * dt; pg.vy += G * dt; pg.feet += pg.vy * dt; pg.rot += dt * 10 * Math.sign(pg.vx || 1); pg.respawn -= dt; if (pg.respawn <= 0) { pg.fly = false; this.spawnPig(); } }
        else {
          pg.hurt = Math.max(0, pg.hurt - dt);
          pg.walk -= dt;
          if (pg.walk <= 0) { pg.walk = rnd(1.5, 3.5); pg.target = Math.random() < 0.4 ? pg.x : pg.home + rnd(-1.5, 1.2); }
          if (Math.abs(pg.vx) < 0.5 && Math.abs(pg.target - pg.x) > 0.05) { const s = Math.sign(pg.target - pg.x); pg.x += s * Math.min(Math.abs(pg.target - pg.x), 0.8 * dt); pg.dir = s; }
          pg.x += pg.vx * dt; pg.vx *= Math.pow(0.02, dt);
          pg.x = Math.max(1, Math.min(this.cols - 1, pg.x));
          const g2 = this.mobGround(pg.x, pg.feet - 0.9);
          pg.vy += G * dt; pg.feet += pg.vy * dt;
          if (pg.feet >= g2) { pg.feet = g2; pg.vy = 0; }
          if (pg.feet > this.rows + 2) { pg.dead = true; pg.respawn = 1; }
        }
      }
      // зомби: подходит вплотную и бьёт носителя раз в секунду (это и копит заряд)
      const z = this.zombie;
      if (z.dead && !z.fly) { z.respawn -= dt; if (z.respawn <= 0) this.spawnZombie(); return; }
      if (z.fly) { z.x += z.vx * dt; z.vy += G * dt; z.feet += z.vy * dt; z.rot += dt * 12 * Math.sign(z.vx || 1); z.respawn -= dt; if (z.respawn <= 0) { z.fly = false; this.spawnZombie(); } return; }
      z.hurt = Math.max(0, z.hurt - dt);
      const side = Math.sign(z.x - pl.x) || 1, want = pl.x + side * 0.95;
      if (Math.abs(z.vx) < 0.5 && Math.abs(z.x - want) > 0.05) z.x += Math.sign(want - z.x) * Math.min(Math.abs(want - z.x), 1.2 * dt);
      z.x += z.vx * dt; z.vx *= Math.pow(0.02, dt);
      z.x = Math.max(1, Math.min(this.cols - 1, z.x));
      const zg = this.mobGround(z.x, z.feet - 1.2);
      z.vy += G * dt; z.feet += z.vy * dt;
      if (z.feet >= zg) { z.feet = zg; z.vy = 0; }
      if (z.feet > this.rows + 2) { z.dead = true; z.respawn = 1; }
      z.dir = Math.sign(pl.x - z.x) || 1;
      z.cd = (z.cd || 0) - dt; z.swing = Math.max(0, (z.swing || 0) - dt);
      if (this.o.autoAttack() && this.phase === "idle" && z.cd <= 0 && Math.abs(z.x - pl.x) < 1.25 && Math.abs(z.feet - pl.feet) < 1.2 && z.hurt <= 0) {
        z.cd = 1; z.swing = 0.25;
        this.o.onZombieHit && this.o.onZombieHit();
      }
    }

    /** Красный силуэт спрайта (вспышка урона, как в игре), кешируется */
    red(img) {
      this._red = this._red || new Map();
      if (!this._red.has(img)) {
        const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height;
        const t = cv.getContext("2d"); t.drawImage(img, 0, 0); t.globalCompositeOperation = "source-in"; t.fillStyle = "#ff1a1a"; t.fillRect(0, 0, cv.width, cv.height);
        this._red.set(img, cv);
      }
      return this._red.get(img);
    }
    drawFigure(c, img, x, feet, flip, B) {
      // спрайты фигур 80x144: 16x32 «пикселей» модели в масштабе 4 + поля 8 (под раздутую броню)
      const k = 0.9 * B / 16;            // игрок 1.8 блока
      const w = 20 * k * 4 / 4, h = 36 * k;
      c.save(); c.translate(x * B, feet * B); if (flip) c.scale(-1, 1);
      c.drawImage(img, -w / 2, -34 * k, w, h);
      c.restore();
    }
    draw() {
      const c = this.cx, { B } = this, W = this.cv.width, H = this.cv.height;
      c.save();
      if (this.shake > 0) c.translate(rnd(-1, 1) * this.shake * B * 0.5, rnd(-1, 1) * this.shake * B * 0.4);
      const sky = c.createLinearGradient(0, 0, 0, H * 0.5);
      sky.addColorStop(0, "#0a0b14"); sky.addColorStop(1, "#3a1a10");
      c.fillStyle = sky; c.fillRect(-B, -B, W + 2 * B, H + 2 * B);
      c.drawImage(this.tc, 0, 0);
      c.imageSmoothingEnabled = false;
      const pl = this.player;
      // частицы «за» носителем (задняя половина круга/спирали)
      const drawDust = (back) => this.parts.forEach((p) => {
        if (!!p.back !== back) return;
        const k = p.t / p.d, s = p.s * B * (1 - k * 0.4);
        c.fillStyle = back ? `rgba(150,0,0,${0.85 - k * 0.5})` : `rgba(${230 + Math.random() * 25 | 0},${20 + k * 30 | 0},20,${1 - k * 0.5})`;
        c.fillRect(p.x * B - s / 2, p.y * B - s / 2, s, s);
      });
      drawDust(true);
      // свинья (спрайт 25x15 «пикселей», 16 px = 1 блок, масштаб 0.9)
      const pg = this.pig;
      if (pg && (!pg.dead || pg.fly)) {
        const w = 25 / 16 * 0.9 * B, h = 15 / 16 * 0.9 * B;
        c.save(); c.translate(pg.x * B, (pg.feet - h / B / 2) * B);
        if (pg.fly) c.rotate(pg.rot);
        c.scale(pg.dir < 0 ? -1 : 1, 1);
        c.drawImage(this.tex.pig, -w / 2, -h / 2, w, h);
        if (pg.hurt > 0) { c.globalAlpha = 0.55; c.drawImage(this.red(this.tex.pig), -w / 2, -h / 2, w, h); }
        c.restore();
        if (!pg.dead && pg.hp < 10) { const bw = B * 0.9, x0 = pg.x * B - bw / 2, y0 = (pg.feet - 1.25) * B; c.fillStyle = "rgba(0,0,0,.6)"; c.fillRect(x0 - 1, y0 - 1, bw + 2, B * 0.12 + 2); c.fillStyle = "#ff7a9a"; c.fillRect(x0, y0, (bw * Math.max(0, pg.hp)) / 10, B * 0.12); }
      }
      // зомби
      const z = this.zombie;
      if (!z.dead || z.fly) {
        c.save();
        c.translate(z.x * B, (z.feet - 0.9) * B);
        if (z.fly) c.rotate(z.rot);
        c.scale(z.dir < 0 ? -1 : 1, 1);
        if (z.swing > 0) c.rotate(-0.12);
        c.drawImage(this.tex.zombie, -0.45 * B, -0.9 * B, 0.9 * B, 1.8 * B);
        if (z.hurt > 0) { c.globalAlpha = 0.55; c.drawImage(this.red(this.tex.zombie), -0.45 * B, -0.9 * B, 0.9 * B, 1.8 * B); }
        c.restore();
        if (!z.dead) {
          const w = B * 1.1, x0 = z.x * B - w / 2, y0 = (z.feet - 2.15) * B;
          c.fillStyle = "rgba(0,0,0,.6)"; c.fillRect(x0 - 1, y0 - 1, w + 2, B * 0.14 + 2);
          c.fillStyle = "#ff3b30"; c.fillRect(x0, y0, (w * Math.max(0, z.hp)) / 20, B * 0.14);
        }
      }
      // носитель: Стив + надетые слои ТНТ-брони (tnt_layer_1/2.png)
      const glow = this.o.charge ? this.o.charge() : 0, worn = this.o.worn();
      c.save();
      if (glow > 0) { c.shadowColor = `rgba(255,40,20,${0.25 + glow * 0.6})`; c.shadowBlur = B * glow * 0.9; }
      const flip = z.x < pl.x;
      this.drawFigure(c, this.wear.base, pl.x, pl.feet, flip, B);
      c.shadowBlur = 0;
      ["legs", "feet", "chest", "head"].forEach((k) => { const i = { head: 0, chest: 1, legs: 2, feet: 3 }[k]; if (worn[i]) this.drawFigure(c, this.wear[k], pl.x, pl.feet, flip, B); });
      c.restore();
      if (pl.hurt > 0 || (pl.flash > 0 && Math.floor(pl.flash * 14) % 2 === 0)) {
        c.save(); c.globalAlpha = pl.hurt > 0 ? 0.55 : 0.5; c.globalCompositeOperation = pl.hurt > 0 ? "source-over" : "lighter";
        const k = 0.9 * B / 16;
        c.fillStyle = pl.hurt > 0 ? "#ff2020" : "#ffffff";
        // вспышка поверх силуэта: рисуем фигуру в оффскрин и заливаем
        if (!this.tint) this.tint = document.createElement("canvas");
        const tc = this.tint; tc.width = 80; tc.height = 144; const t = tc.getContext("2d");
        t.clearRect(0, 0, 80, 144); t.drawImage(this.wear.full, 0, 0); t.globalCompositeOperation = "source-in"; t.fillStyle = c.fillStyle; t.fillRect(0, 0, 80, 144);
        this.drawFigure(c, tc, pl.x, pl.feet, flip, B);
        c.restore();
      }
      // обломки блоков
      this.debris.forEach((d) => { c.save(); c.translate(d.x * B, d.y * B); c.rotate(d.rot); const s = d.s * B; c.drawImage(this.tex[T[d.id]], -s / 2, -s / 2, s, s); c.restore(); });
      drawDust(false);
      // лава и дым
      this.lava.forEach((l) => { c.fillStyle = `rgba(255,${140 + Math.random() * 80 | 0},20,${1 - l.t / l.d})`; c.fillRect(l.x * B - B * 0.08, l.y * B - B * 0.08, B * 0.16, B * 0.16); });
      this.smoke.forEach((s) => {
        if (s.t < 0) return;
        const k = s.t / s.d, sz = s.s * B * (0.6 + k * 0.8);
        c.globalAlpha = 0.75 * (1 - k);
        c.drawImage(this.smokeTex, s.x * B - sz / 2, s.y * B - sz / 2, sz, sz);
        c.globalAlpha = 1;
      });
      if (this.flashT > 0) {
        const k = this.flashT / 0.35, r = B * (2 + (1 - k) * 3);
        const g = c.createRadialGradient(pl.x * B, (pl.feet - 1.2) * B, 0, pl.x * B, (pl.feet - 1.2) * B, r);
        g.addColorStop(0, `rgba(255,255,255,${k})`); g.addColorStop(1, "rgba(255,255,255,0)");
        c.fillStyle = g; c.fillRect(pl.x * B - r, (pl.feet - 1.2) * B - r, 2 * r, 2 * r);
      }
      // всплывающие числа
      c.font = `${Math.round(B * 0.5)}px Tiny5, monospace`; c.textAlign = "center";
      this.texts.forEach((t) => { if (t.t < 0) return; c.globalAlpha = 1 - t.t; c.fillStyle = "#200"; c.fillText(t.s, t.x * B + 2, (t.y - t.t) * B + 2); c.fillStyle = t.c; c.fillText(t.s, t.x * B, (t.y - t.t) * B); c.globalAlpha = 1; });
      c.restore();
    }
  }
  window.ZM = window.ZM || {};
  ZM.TntWorld = TntWorld;
})();
