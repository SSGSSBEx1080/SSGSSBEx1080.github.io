/* =====================================================================
   №04 · Стена шахты за страницей (ZMMine).
   Страница = вертикальный столб мира: верх документа Y 70, низ Y −64,
   1 ряд плиток = 1 блок. Руды раскиданы по настоящим кривым генерации 1.19,
   свет как в игре: источник 15 и минус 1 за каждый блок (манхэттен),
   яркость по кривой lightmap f/(4−3f). Стену можно копать мышкой.
   ===================================================================== */
(function () {
  const TOP_Y = 70, BOTTOM_Y = -64, ROWS = TOP_Y - BOTTOM_Y + 1;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // детерминированный хеш -> [0,1)
  function hash(x, y, s = 0) {
    let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  // сглаженный value-noise для пещер и пятен гранита/туфа
  function noise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  // плотность руды на высоте y по записям генерации
  function density(ore, y) {
    let d = 0;
    for (const [kind, lo, hi, count] of ore.gen) {
      if (y < lo || y > hi) continue;
      const span = hi - lo;
      if (kind === "uni") d += count / span;
      else { const mid = (lo + hi) / 2, half = span / 2; d += (count / half) * (1 - Math.abs(y - mid) / half); }
    }
    return d;
  }

  const HARD = { dirt: 0.5, grass_block_side: 0.6, gravel: 0.6, stone: 1.5, granite: 1.5, diorite: 1.5, andesite: 1.5, tuff: 1.5, deepslate: 3, ore: 3, deepslate_ore: 4.5, bedrock: Infinity };

  class ZMMine {
    constructor(cv, opt) {
      this.cv = cv; this.c = cv.getContext("2d");
      this.o = opt; this.tex = opt.tex; this.D = opt.data;
      this.lampOn = true; this.f3 = false; this.level = opt.level || 15;
      this.tool = { speed: 6 };
      this.mined = new Set(opt.mined || []);
      this.px = innerWidth * 0.7; this.py = innerHeight * 0.45; this.hasPtr = false;
      this.dig = null; this.parts = []; this.lavaSrc = [];
      this.dirty = true;
      this.oreMax = {};
      for (const ore of this.D.ores) { let m = 0; for (let y = BOTTOM_Y; y <= 320; y++) m = Math.max(m, density(ore, y)); this.oreMax[ore.k] = m; }
      this.resize();
      addEventListener("resize", () => this.resize());
      addEventListener("scroll", () => { this.dirty = true; this.emitDepth(); }, { passive: true });
      new ResizeObserver(() => this.resize()).observe(document.body);
      const loop = (t) => { requestAnimationFrame(loop); this.frame(t); };
      requestAnimationFrame(loop);
    }

    /* ---------- геометрия: страница <-> мир ---------- */
    resize() {
      const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
      this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr);
      this.cv.style.width = W + "px"; this.cv.style.height = H + "px";
      this.dpr = dpr; this.W = W; this.H = H;
      const doc = document.documentElement.scrollHeight;
      this.tile = Math.round(clamp(doc / ROWS, 30, 80));   // целое число пикселей, иначе между плитками видны швы
      this.dirty = true; this.emitDepth();
    }
    rowOfPage(py) { return Math.floor(py / this.tile); }
    yOfRow(r) { return TOP_Y - r; }
    pageYOfY(y) { return (TOP_Y - y) * this.tile; }
    depthAtView() { return clamp(this.yOfRow(this.rowOfPage(scrollY + this.H * 0.5)), BOTTOM_Y, TOP_Y); }
    emitDepth() { const y = this.depthAtView(); if (y !== this._lastY) { this._lastY = y; this.o.onDepth && this.o.onDepth(y); } }

    /* ---------- генерация блока ---------- */
    block(col, row) {
      const y = this.yOfRow(row);
      if (y > 64) return { k: "sky", y };
      if (this.mined.has(col + "," + row)) return { k: "air", y, base: this.baseStone(col, row, y) };
      if (y <= BOTTOM_Y + 4 && hash(col, row, 9) < (BOTTOM_Y + 5 - y) / 5) return { k: "bedrock", y };
      if (y === 64) return { k: "grass_block_side", y };
      if (y >= 60) return { k: y >= 62 || hash(col, row, 3) < 0.6 ? "dirt" : "stone", y };
      const base = this.baseStone(col, row, y);
      // пещеры: чем глубже, тем чаще. Ниже −54 в пустотах лава
      const cave = noise(col / 7, row / 4.5, 21) + (y < 0 ? 0.08 : 0);
      if (cave > 0.8 && y < 50) return { k: y <= -54 ? "lava" : "cave", y, base };
      // пятна
      const blob = noise(col / 5, row / 4, 7);
      if (blob > 0.78) return { k: y < 0 ? "tuff" : ["granite", "diorite", "andesite"][Math.floor(noise(col / 9, row / 9, 5) * 3) % 3], y };
      if (blob < 0.06 && y > 0) return { k: "gravel", y };
      // руды: жилы 2×2 ячейками, вид руды по плотности генерации на этой высоте
      const cx = Math.floor(col / 2), cy = Math.floor(row / 2);
      if (hash(cx, cy, 11) < 0.075) {
        const weights = this.D.ores.filter((o) => o.k !== "emerald").map((o) => [o, density(o, y)]);
        const sum = weights.reduce((s, w) => s + w[1], 0);
        if (sum > 0 && hash(col, row, 13) < 0.62) {
          let r = hash(cx, cy, 12) * sum;
          for (const [o, w] of weights) { r -= w; if (r <= 0) return { k: "ore", ore: o, deep: base === "deepslate", y }; }
        }
      }
      return { k: base, y };
    }
    baseStone(col, row, y) { return y <= -8 ? "deepslate" : y >= 0 ? "stone" : hash(col, row, 4) < (-y) / 8 ? "deepslate" : "stone"; }
    texOf(b) {
      const T = this.tex;
      if (b.k === "ore") return T[(b.deep ? "deepslate_" : "") + b.ore.k + "_ore"];
      if (b.k === "air" || b.k === "cave") return T[b.base];
      if (b.k === "lava") return T.lava;
      return T[b.k];
    }
    hardness(b) { return b.k === "ore" ? HARD[b.deep ? "deepslate_ore" : "ore"] : HARD[b.k] != null ? HARD[b.k] : 1.5; }

    /* ---------- свет ---------- */
    lampTile() {
      return { c: Math.floor(this.px / this.tile), r: this.rowOfPage(scrollY + this.py) };
    }
    lightAt(col, row, y, L) {
      // каска снята или разряжена: светят только небо и лава
      const sky = y >= 60 ? clamp(15 - (64 - y) * 3, 0, 15) : 0;
      const d = Math.abs(col - L.c) + Math.abs(row - L.r);
      let l = Math.max(sky, this.lampOn ? this.level - d : 0, 0);
      // лава тоже источник света 15, как в игре
      for (const q of this.lavaSrc) { const v = 15 - Math.abs(col - q[0]) - Math.abs(row - q[1]); if (v > l) l = v; }
      return l;
    }
    static bright(l) { const f = l / 15; return f / (4 - 3 * f); }

    /* ---------- копание ---------- */
    tileAt(clientX, clientY) { const c = Math.floor(clientX / this.tile), r = this.rowOfPage(scrollY + clientY); return { c, r, b: this.block(c, r) }; }
    startDig(clientX, clientY) {
      const t = this.tileAt(clientX, clientY);
      if (["sky", "air", "cave", "lava"].includes(t.b.k)) return false;
      const need = this.hardness(t.b) * 1.5 / this.tool.speed;
      this.dig = { c: t.c, r: t.r, b: t.b, need, t: 0, hitT: 0 };
      this.dirty = true;
      return true;
    }
    moveDig(clientX, clientY) {
      if (!this.dig) return;
      const t = this.tileAt(clientX, clientY);
      if (t.c !== this.dig.c || t.r !== this.dig.r) { this.dig = null; this.startDig(clientX, clientY); }
    }
    stopDig() { this.dig = null; this.dirty = true; }
    stepDig(dt) {
      const d = this.dig; if (!d) return;
      d.t += dt; d.hitT += dt;
      if (d.hitT > 0.22) { d.hitT = 0; this.o.onHit && this.o.onHit(d.b); }
      this.dirty = true;
      if (d.t >= d.need) {
        this.mined.add(d.c + "," + d.r);
        this.burst(d.c, d.r, d.b);
        this.o.onBreak && this.o.onBreak(d.b, d.c + "," + d.r);
        this.dig = null;
      }
    }
    burst(c, r, b) {
      const img = this.texOf(b), x0 = (c + 0.5) * this.tile, y0 = (r + 0.5) * this.tile;
      for (let i = 0; i < 14; i++) {
        this.parts.push({ x: x0, y: y0, vx: (Math.random() - 0.5) * 240, vy: -Math.random() * 220 - 40, t: 0, life: 0.5 + Math.random() * 0.3,
          sx: Math.floor(Math.random() * 12), sy: Math.floor(Math.random() * 12), img });
      }
    }

    /* ---------- кадр ---------- */
    frame(now) {
      const dt = this._t ? Math.min(0.05, (now - this._t) / 1000) : 0.016; this._t = now;
      if (this.dig) this.stepDig(dt);
      if (this.parts.length) this.dirty = true;
      if (this.tex.lavaFrames) { const f = Math.floor(now / 100) % this.tex.lavaFrames; if (f !== this._lf) { this._lf = f; this.dirty = true; } }
      if (!this.dirty) return;
      this.dirty = false;
      this.draw(dt);
    }
    draw(dt) {
      const c = this.c, dpr = this.dpr, S = this.tile;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.imageSmoothingEnabled = false;
      c.fillStyle = "#050403"; c.fillRect(0, 0, this.W, this.H);
      const r0 = this.rowOfPage(scrollY), r1 = this.rowOfPage(scrollY + this.H);
      const cols = Math.ceil(this.W / S);
      const L = this.lampTile();
      const off = scrollY % S;
      // источники-лава в пределах 15 блоков от экрана
      this.lavaSrc = [];
      if (this.yOfRow(r1 + 15) <= -54) {
        for (let r = Math.max(r0 - 15, 0); r <= r1 + 15; r++) {
          if (this.yOfRow(r) > -54) continue;
          for (let col = -2; col <= cols + 2; col++) if (this.block(col, r).k === "lava") this.lavaSrc.push([col, r]);
        }
      }
      if (this.f3) { c.font = `${Math.round(S * 0.34)}px Tiny5, monospace`; c.textAlign = "center"; c.textBaseline = "middle"; }
      for (let r = r0; r <= r1; r++) {
        const sy = r * S - scrollY;
        for (let col = 0; col <= cols; col++) {
          const b = this.block(col, r), sx = col * S;
          if (b.k === "sky") {   // ночное небо над поверхностью
            c.fillStyle = "#070b16"; c.fillRect(sx, sy, S + 1, S + 1);
            if (hash(col, r, 31) < 0.06) { c.fillStyle = "rgba(255,255,255,.7)"; c.fillRect(sx + hash(col, r, 32) * S, sy + hash(col, r, 33) * S, 2, 2); }
            continue;
          }
          const img = this.texOf(b);
          if (img) {
            if (b.k === "lava") c.drawImage(img, 0, (this._lf || 0) * 16, 16, 16, sx, sy, S, S);
            else c.drawImage(img, sx, sy, S, S);
          }
          const lvl = b.k === "lava" ? 15 : this.lightAt(col, r, b.y, L);
          let a = 1 - Math.max(this.nv ? 0.72 : 0.045, ZMMine.bright(lvl));   // ночное зрение с каски почти всё высвечивает
          if (b.k === "air" || b.k === "cave") a = 1 - (1 - a) * 0.32;   // вырытое и пещеры = глубина, темнее
          if (a > 0.004) { c.fillStyle = `rgba(4,3,2,${a})`; c.fillRect(sx, sy, S, S); }
          if (b.k === "air" || b.k === "cave") { c.strokeStyle = "rgba(0,0,0,.5)"; c.lineWidth = 2; c.strokeRect(sx + 1, sy + 1, S - 2, S - 2); }
          if (this.f3 && b.k !== "lava") {
            c.fillStyle = lvl === 0 ? "rgba(255,70,70,.95)" : `rgba(255,236,160,${0.35 + lvl / 25})`;
            c.fillText(lvl === 0 ? "×" : String(lvl), sx + S / 2, sy + S / 2 + 1);
          }
        }
      }
      // трещины на копаемом блоке (ванильные стадии разрушения 0..9)
      const d = this.dig;
      if (d) {
        const st = clamp(Math.floor((d.t / d.need) * 10), 0, 9), img = this.tex.destroy[st];
        const sx = d.c * S, sy = d.r * S - scrollY;
        if (img) c.drawImage(img, sx, sy, S, S);
        c.strokeStyle = "rgba(0,0,0,.8)"; c.lineWidth = 2; c.strokeRect(sx + 1, sy + 1, S - 2, S - 2);
      } else if (this.hasPtr && this.hoverOk) {   // рамка выделения, как в игре
        const col = Math.floor(this.px / S), r = this.rowOfPage(scrollY + this.py), b = this.block(col, r);
        if (!["sky", "air", "cave", "lava"].includes(b.k)) { c.strokeStyle = "rgba(0,0,0,.75)"; c.lineWidth = 2; c.strokeRect(col * S + 1, r * S - scrollY + 1, S - 2, S - 2); }
      }
      // осколки
      this.parts = this.parts.filter((p) => (p.t += dt) < p.life);
      for (const p of this.parts) {
        p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        const z = S * 0.14;
        if (p.img) c.drawImage(p.img, p.sx, p.sy, 3, 3, p.x - z / 2, p.y - scrollY - z / 2, z, z);
      }
    }
  }
  ZMMine.density = density;
  ZMMine.TOP_Y = TOP_Y; ZMMine.BOTTOM_Y = BOTTOM_Y;
  window.ZMMine = ZMMine;
})();
