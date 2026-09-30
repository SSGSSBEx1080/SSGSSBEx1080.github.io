/* =====================================================================
   ZitraksMode Wiki · shared/voxel.js — маленький воксельный движок на WebGL1
   Мир из блоков как в игре: атлас ванильных текстур (data/voxel_atlas.js),
   мягкие тени по углам (AO), мипмапы по тайлам (без швов), туман,
   прозрачная вода, листва и стекло с вырезом, светящиеся блоки.
   Используют: главная (панорама), №13 3D-принтер (студия чертежей).
   ZMVox.create(canvas, {atlas}) -> движок; мир: {sx,sy,sz,data:Uint8Array}
   индекс блока: x + z*sx + y*sx*sz
   ===================================================================== */
(function () {
  const V = (window.ZMVox = {});

  /* ---------------- матрицы ---------------- */
  const M4 = {
    persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2), r = new Float32Array(16); r[0] = t / asp; r[5] = t; r[10] = (f + n) / (n - f); r[11] = -1; r[14] = (2 * f * n) / (n - f); return r; },
    look(e, c, u) {
      let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2], l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
      let xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx; l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
      const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
      return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]);
    },
    mul(a, b) { const r = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; r[i * 4 + j] = s; } return r; },
    inv(m) {
      const r = new Float32Array(16), [a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15] = m;
      const b0 = a0 * a5 - a1 * a4, b1 = a0 * a6 - a2 * a4, b2 = a0 * a7 - a3 * a4, b3 = a1 * a6 - a2 * a5, b4 = a1 * a7 - a3 * a5, b5 = a2 * a7 - a3 * a6;
      const b6 = a8 * a13 - a9 * a12, b7 = a8 * a14 - a10 * a12, b8 = a8 * a15 - a11 * a12, b9 = a9 * a14 - a10 * a13, b10 = a9 * a15 - a11 * a13, b11 = a10 * a15 - a11 * a14;
      const d = 1 / (b0 * b11 - b1 * b10 + b2 * b9 + b3 * b8 - b4 * b7 + b5 * b6);
      r[0] = (a5 * b11 - a6 * b10 + a7 * b9) * d; r[1] = (a2 * b10 - a1 * b11 - a3 * b9) * d; r[2] = (a13 * b5 - a14 * b4 + a15 * b3) * d; r[3] = (a10 * b4 - a9 * b5 - a11 * b3) * d;
      r[4] = (a6 * b8 - a4 * b11 - a7 * b7) * d; r[5] = (a0 * b11 - a2 * b8 + a3 * b7) * d; r[6] = (a14 * b2 - a12 * b5 - a15 * b1) * d; r[7] = (a8 * b5 - a10 * b2 + a11 * b1) * d;
      r[8] = (a4 * b10 - a5 * b8 + a7 * b6) * d; r[9] = (a1 * b8 - a0 * b10 - a3 * b6) * d; r[10] = (a12 * b4 - a13 * b2 + a15 * b0) * d; r[11] = (a9 * b2 - a8 * b4 - a11 * b0) * d;
      r[12] = (a5 * b7 - a4 * b9 - a6 * b6) * d; r[13] = (a0 * b9 - a1 * b7 + a2 * b6) * d; r[14] = (a13 * b1 - a12 * b3 - a14 * b0) * d; r[15] = (a8 * b3 - a9 * b1 + a10 * b0) * d;
      return r;
    },
  };
  V.M4 = M4;

  /* ---------------- грани куба: начало, ось U, ось V (вниз по текстуре), нормаль, яркость ---------------- */
  const FACES = [
    { o: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], n: [0, 1, 0], s: 1.0, t: 0 },   // верх
    { o: [0, 0, 1], u: [1, 0, 0], v: [0, 0, -1], n: [0, -1, 0], s: 0.5, t: 2 }, // низ
    { o: [1, 1, 0], u: [-1, 0, 0], v: [0, -1, 0], n: [0, 0, -1], s: 0.8, t: 1 }, // север
    { o: [0, 1, 1], u: [1, 0, 0], v: [0, -1, 0], n: [0, 0, 1], s: 0.8, t: 1 },  // юг
    { o: [0, 1, 0], u: [0, 0, 1], v: [0, -1, 0], n: [-1, 0, 0], s: 0.6, t: 1 }, // запад
    { o: [1, 1, 1], u: [0, 0, -1], v: [0, -1, 0], n: [1, 0, 0], s: 0.6, t: 1 }, // восток
  ];
  const AO = [0.5, 0.68, 0.84, 1];

  const VS = `attribute vec3 p;attribute vec2 uv;attribute vec2 l;uniform mat4 M;uniform vec3 C;varying vec2 vU;varying vec2 vL;varying float vD;
void main(){vU=uv;vL=l;vD=distance(p,C);gl_Position=M*vec4(p,1.);}`;
  const FS = `precision mediump float;uniform sampler2D T;uniform vec3 K;uniform vec3 F;uniform vec2 G;uniform float A;uniform float W;uniform float H;varying vec2 vU;varying vec2 vL;varying float vD;
void main(){vec4 c=texture2D(T,vU);if(c.a<.5&&W<.5)discard;vec3 lit=mix(K*vL.x,vec3(max(vL.x,.92)),vL.y);vec3 col=c.rgb*lit;
float f=smoothstep(G.x,G.y,vD);float a=(W>.5?.74:1.)*(A>.5?1.-f:1.);col=A>.5?col:mix(col,F,f);a*=H;gl_FragColor=vec4(col*a,a);}`;
  const VS2 = `attribute vec3 p;attribute vec4 c;uniform mat4 M;varying vec4 vC;void main(){vC=c;gl_Position=M*vec4(p,1.);}`;
  const FS2 = `precision mediump float;varying vec4 vC;void main(){gl_FragColor=vec4(vC.rgb*vC.a,vC.a);}`;

  function prog(gl, vs, fs) {
    const mk = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}, a = {};
    for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) { const n = gl.getActiveUniform(p, i).name; u[n] = gl.getUniformLocation(p, n); }
    for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); i++) { const n = gl.getActiveAttrib(p, i).name; a[n] = gl.getAttribLocation(p, n); }
    return { p, u, a };
  }

  /* мипмапы по тайлам: каждый тайл уменьшается отдельно, поэтому соседние текстуры не протекают */
  function uploadAtlas(gl, img, tile, smooth = false) {
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    let src = document.createElement("canvas"); src.width = src.height = img.width;
    const first = src.getContext("2d"); first.imageSmoothingEnabled = smooth; first.drawImage(img, 0, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    let size = img.width, t = tile, lvl = 0;
    while (size > 1) {
      const ns = size >> 1, nt = t >> 1, c = document.createElement("canvas"); c.width = c.height = ns;
      const g = c.getContext("2d"); g.imageSmoothingEnabled = smooth;
      if (smooth) g.imageSmoothingQuality = "high";
      if (nt >= 1) { const n = size / t; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) g.drawImage(src, x * t, y * t, t, t, x * nt, y * nt, nt, nt); }
      else g.drawImage(src, 0, 0, ns, ns);
      gl.texImage2D(gl.TEXTURE_2D, ++lvl, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); src = c; size = ns; t = nt;
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, smooth ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST_MIPMAP_NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (smooth) {
      const an = gl.getExtension("EXT_texture_filter_anisotropic") || gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
      if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(4, gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    }
    return tex;
  }

  V.supported = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl") || c.getContext("experimental-webgl")); } catch (e) { return false; } };

  V.create = function (canvas, opt = {}) {
    const AT = opt.atlas || (window.ZM && ZM.VOX_ATLAS);
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: opt.antialias !== false, preserveDrawingBuffer: !!opt.preserve });
    if (!gl || !AT) return null;
    const P = prog(gl, VS, FS), P2 = prog(gl, VS2, FS2);
    const B = AT.blocks, cols = AT.size / AT.tile, eps = 0.02 / AT.size;
    let tex = null;
    const img = new Image(); img.onload = () => { tex = uploadAtlas(gl, img, AT.tile, opt.smoothAtlas === true); E.dirty = true; opt.onReady && opt.onReady(E); }; img.src = AT.uri;
    const bufO = gl.createBuffer(), bufW = gl.createBuffer(), bufL = gl.createBuffer(), bufX = gl.createBuffer();
    let nO = 0, nW = 0, nL = 0, nX = 0;

    const E = {
      gl, canvas, world: null, dirty: true,
      cam: { target: [0, 0, 0], yaw: 0.6, pitch: 0.5, dist: 20, fov: 60, eye: null },
      env: { tint: [1, 1, 1], fog: [60, 110], fade: true, fogColor: [0.6, 0.75, 1] },
      scale: opt.scale || 1, clear: [0, 0, 0, 0], ghost: 1, // ghost<1: голограмма (прозрачная постройка, как превью в №13)
      order: [], blockEnd: [], drawBlocks: Infinity, // для печати: сколько блоков по порядку показать
      proj: null, view: null, eyePos: [0, 0, 0],
      solid(id) { const b = id && B[id]; return !!b && !b.cut && !b.water && !b.bx; },
      setWorld(w) { this.world = w; this.rebuild(); },
      get(x, y, z) { const w = this.world; if (!w || x < 0 || y < 0 || z < 0 || x >= w.sx || y >= w.sy || z >= w.sz) return 0; return w.data[x + z * w.sx + y * w.sx * w.sz]; },
      /* сборка сетки. layered: грани «верха» не прячутся (нужно для послойной печати), блоки идут змейкой по слоям */
      /* seq: свой порядок печати [[x,y,z],...] (№13: как в моде — приоритет, Y, X, Z) */
      rebuild(layered, seq) {
        const w = this.world; if (!w) return;
        const O = [], Wt = [], order = [], ends = [];
        const get = (x, y, z) => this.get(x, y, z), solid = (x, y, z) => this.solid(get(x, y, z));
        const emit = (arr, x, y, z, f, t, light, emit_, water, topLow) => {
          const tu = (t % cols) * AT.tile / AT.size, tv = ((t / cols) | 0) * AT.tile / AT.size, ts = AT.tile / AT.size;
          const cs = [];
          for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
            let px = x + f.o[0] + a * f.u[0] + b * f.v[0], py = y + f.o[1] + a * f.u[1] + b * f.v[1], pz = z + f.o[2] + a * f.u[2] + b * f.v[2];
            if (topLow && py > y + 0.5) py = y + 0.875;
            let ao = 3;
            if (!water && !emit_) {
              const su = a ? 1 : -1, sv = b ? 1 : -1;
              const nx = x + f.n[0], ny = y + f.n[1], nz = z + f.n[2];
              const s1 = solid(nx + f.u[0] * su, ny + f.u[1] * su, nz + f.u[2] * su) ? 1 : 0;
              const s2 = solid(nx + f.v[0] * sv, ny + f.v[1] * sv, nz + f.v[2] * sv) ? 1 : 0;
              const c = solid(nx + f.u[0] * su + f.v[0] * sv, ny + f.u[1] * su + f.v[1] * sv, nz + f.u[2] * su + f.v[2] * sv) ? 1 : 0;
              ao = s1 && s2 ? 0 : 3 - (s1 + s2 + c);
            }
            cs.push([px, py, pz, tu + (a ? ts - eps : eps), tv + (b ? ts - eps : eps), light * AO[ao], emit_, ao]);
          }
          const flip = cs[0][7] + cs[2][7] < cs[1][7] + cs[3][7];
          const idx = flip ? [1, 2, 3, 1, 3, 0] : [0, 1, 2, 0, 2, 3];
          for (const i of idx) { const c = cs[i]; arr.push(c[0], c[1], c[2], c[3], c[4], c[5], c[6]); }
        };
        /* блок с формой: коробки в 1/16 [x0,y0,z0,x1,y1,z1, тайлы верх,низ,С,Ю,З,В, full-uv] */
        const emitBox = (x, y, z, bx, glow) => {
          const lo = [bx[0] / 16, bx[1] / 16, bx[2] / 16], hi = [bx[3] / 16, bx[4] / 16, bx[5] / 16], fullUV = bx[12];
          for (let fi = 0; fi < 6; fi++) {
            const t = bx[6 + fi]; if (t < 0) continue;
            const f = FACES[fi], na = f.n[0] ? 0 : f.n[1] ? 1 : 2, edge = f.n[na] > 0 ? hi[na] : lo[na];
            if (!layered && (edge === 0 || edge === 1)) { const nb = get(x + f.n[0], y + f.n[1], z + f.n[2]); if (this.solid(nb)) continue; }
            const tu = (t % cols) * AT.tile / AT.size, tv = ((t / cols) | 0) * AT.tile / AT.size, ts = AT.tile / AT.size;
            const ua = f.u[0] ? 0 : f.u[1] ? 1 : 2, va = f.v[0] ? 0 : f.v[1] ? 1 : 2, cs = [];
            for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
              const q = [0, 1, 2].map((i) => lo[i] + (f.o[i] + a * f.u[i] + b * f.v[i]) * (hi[i] - lo[i]));
              let su = fullUV ? a : f.u[ua] > 0 ? q[ua] : 1 - q[ua], sv = fullUV ? b : f.v[va] > 0 ? q[va] : 1 - q[va];
              const fuv = bx[13] && bx[13][fi]; // явный uv грани из ванильной модели [u0,v0,u1,v1] в пикселях 0..16
              if (fuv) { su = (fuv[0] + a * (fuv[2] - fuv[0])) / 16; sv = (fuv[1] + b * (fuv[3] - fuv[1])) / 16; }
              su = Math.min(1, Math.max(0, su)); sv = Math.min(1, Math.max(0, sv));
              cs.push([x + q[0], y + q[1], z + q[2], tu + eps + su * (ts - 2 * eps), tv + eps + sv * (ts - 2 * eps), f.s, glow]);
            }
            for (const i of [0, 1, 2, 0, 2, 3]) { const c = cs[i]; O.push(c[0], c[1], c[2], c[3], c[4], c[5], c[6]); }
          }
        };
        const doBlock = (x, y, z) => {
          const id = get(x, y, z); if (!id) return false; const b = B[id]; if (!b) return false;
          if (b.bx) { for (const bx of b.bx) emitBox(x, y, z, bx, b.glow ? 1 : 0); return true; }
          const water = !!b.water, cut = !!b.cut, glow = b.glow ? 1 : 0;
          for (let fi = 0; fi < 6; fi++) {
            const f = FACES[fi], nb = get(x + f.n[0], y + f.n[1], z + f.n[2]), nbB = nb && B[nb];
            let show;
            if (water) show = !nb || (nbB && (nbB.cut) && nb !== id) || (fi === 0 && nb !== id);
            else if (!nb) show = true;
            else if (nbB.water || nbB.bx) show = true;
            else if (nbB.cut) show = !(cut && nb === id && b.key === "glass");
            else show = false;
            if (layered && fi === 0 && !water) show = true;
            if (!show) continue;
            if (water && fi !== 0 && nb === id) continue;
            emit(water ? Wt : O, x, y, z, f, b.t6 ? b.t6[fi] : b.t[f.t], f.s, glow, water, water && B[get(x, y + 1, z)] !== b);
          }
          return true;
        };
        if (layered && seq) {
          for (const [x, y, z] of seq) if (doBlock(x, y, z)) { order.push([x, y, z]); ends.push(O.length / 7); }
        } else if (layered) {
          for (let y = 0; y < w.sy; y++) for (let zi = 0; zi < w.sz; zi++) {
            const z = y % 2 ? w.sz - 1 - zi : zi;
            for (let xi = 0; xi < w.sx; xi++) { const x = (zi + y) % 2 ? w.sx - 1 - xi : xi; if (doBlock(x, y, z)) { order.push([x, y, z]); ends.push(O.length / 7); } }
          }
        } else for (let y = 0; y < w.sy; y++) for (let z = 0; z < w.sz; z++) for (let x = 0; x < w.sx; x++) doBlock(x, y, z);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufO); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(O), gl.STATIC_DRAW); nO = O.length / 7;
        gl.bindBuffer(gl.ARRAY_BUFFER, bufW); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(Wt), gl.STATIC_DRAW); nW = Wt.length / 7;
        this.order = order; this.blockEnd = ends; this.layered = !!layered; this.dirty = true;
      },
      /* служебные линии: [x,y,z, x,y,z, r,g,b,a] сегменты */
      setLines(segs) { const a = []; for (const s of segs) a.push(s[0], s[1], s[2], s[6], s[7], s[8], s[9], s[3], s[4], s[5], s[6], s[7], s[8], s[9]); gl.bindBuffer(gl.ARRAY_BUFFER, bufL); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a), gl.DYNAMIC_DRAW); nL = a.length / 7; this.dirty = true; },
      /* цветные кубы: {min:[..], max:[..], c:[r,g,b,a]} — сопло принтера, призрак курсора */
      setBoxes(list) {
        const a = [];
        for (const bx of list) {
          const [x0, y0, z0] = bx.min, [x1, y1, z1] = bx.max, c = bx.c;
          for (const f of FACES) {
            const k = bx.flat ? 1 : f.s, P = (u, v) => [0, 1, 2].map((i) => { const o = f.o[i] + u * f.u[i] + v * f.v[i]; return (i === 0 ? x0 : i === 1 ? y0 : z0) + o * ((i === 0 ? x1 - x0 : i === 1 ? y1 - y0 : z1 - z0)); });
            const q = [P(0, 0), P(1, 0), P(1, 1), P(0, 0), P(1, 1), P(0, 1)];
            for (const p of q) a.push(p[0], p[1], p[2], c[0] * k, c[1] * k, c[2] * k, c[3]);
          }
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, bufX); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(a), gl.DYNAMIC_DRAW); nX = a.length / 7; this.dirty = true;
      },
      resize() {
        const r = canvas.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1) * this.scale;
        const W = Math.max(1, Math.round(r.width * d)), H = Math.max(1, Math.round(r.height * d));
        if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; this.dirty = true; }
      },
      matrices() {
        const c = this.cam, asp = canvas.width / canvas.height;
        let eye, tgt;
        if (c.eye) { eye = c.eye; tgt = [eye[0] + Math.sin(c.yaw) * Math.cos(c.pitch), eye[1] + Math.sin(c.pitch), eye[2] + Math.cos(c.yaw) * Math.cos(c.pitch)]; }
        else { tgt = c.target; eye = [tgt[0] + c.dist * Math.cos(c.pitch) * Math.sin(c.yaw), tgt[1] + c.dist * Math.sin(c.pitch), tgt[2] + c.dist * Math.cos(c.pitch) * Math.cos(c.yaw)]; }
        this.eyePos = eye;
        this.proj = M4.persp((c.fov * Math.PI) / 180, asp, 0.1, 600); this.view = M4.look(eye, tgt, [0, 1, 0]);
        this.mvp = M4.mul(this.proj, this.view);
      },
      render() {
        this.resize(); this.matrices();
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(...this.clear); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        const e = this.env;
        if (tex) {
          gl.useProgram(P.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.uniformMatrix4fv(P.u.M, false, this.mvp); gl.uniform3fv(P.u.C, this.eyePos); gl.uniform1i(P.u.T, 0);
          gl.uniform3fv(P.u.K, e.tint); gl.uniform3fv(P.u.F, e.fogColor); gl.uniform2fv(P.u.G, e.fog); gl.uniform1f(P.u.A, e.fade ? 1 : 0); gl.uniform1f(P.u.H, this.ghost);
          const bind = (buf) => { gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(P.a.p); gl.vertexAttribPointer(P.a.p, 3, gl.FLOAT, false, 28, 0); gl.enableVertexAttribArray(P.a.uv); gl.vertexAttribPointer(P.a.uv, 2, gl.FLOAT, false, 28, 12); gl.enableVertexAttribArray(P.a.l); gl.vertexAttribPointer(P.a.l, 2, gl.FLOAT, false, 28, 20); };
          let cnt = nO;
          if (this.layered && this.drawBlocks < this.blockEnd.length) cnt = this.drawBlocks <= 0 ? 0 : this.blockEnd[Math.floor(this.drawBlocks) - 1] || 0;
          if (cnt) { bind(bufO); gl.uniform1f(P.u.W, 0); gl.drawArrays(gl.TRIANGLES, 0, cnt); }
          if (nW && !(this.layered && this.drawBlocks < this.blockEnd.length)) { bind(bufW); gl.uniform1f(P.u.W, 1); gl.depthMask(false); gl.drawArrays(gl.TRIANGLES, 0, nW); gl.depthMask(true); }
        }
        if (nL || nX) {
          gl.useProgram(P2.p); gl.uniformMatrix4fv(P2.u.M, false, this.mvp);
          const bind2 = (buf) => { gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(P2.a.p); gl.vertexAttribPointer(P2.a.p, 3, gl.FLOAT, false, 28, 0); gl.enableVertexAttribArray(P2.a.c); gl.vertexAttribPointer(P2.a.c, 4, gl.FLOAT, false, 28, 12); };
          if (nL) { bind2(bufL); gl.depthMask(false); gl.drawArrays(gl.LINES, 0, nL); gl.depthMask(true); }
          if (nX) { bind2(bufX); gl.depthMask(false); gl.drawArrays(gl.TRIANGLES, 0, nX); gl.depthMask(true); }
        }
        this.dirty = false;
      },
      /* луч из точки экрана (px,py в CSS-пикселях канваса) */
      ray(px, py) {
        const r = canvas.getBoundingClientRect(); this.matrices();
        const nx = (px / r.width) * 2 - 1, ny = 1 - (py / r.height) * 2, inv = M4.inv(this.mvp);
        const un = (z) => { const x = inv[0] * nx + inv[4] * ny + inv[8] * z + inv[12], y = inv[1] * nx + inv[5] * ny + inv[9] * z + inv[13], zz = inv[2] * nx + inv[6] * ny + inv[10] * z + inv[14], w = inv[3] * nx + inv[7] * ny + inv[11] * z + inv[15]; return [x / w, y / w, zz / w]; };
        const a = un(-1), b = un(1), d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...d);
        return { o: a, d: d.map((v) => v / l) };
      },
      /* DDA по сетке: первый блок на луче + грань, в которую вошли; иначе пол y=0 */
      pick(px, py) {
        const w = this.world; if (!w) return null;
        const { o, d } = this.ray(px, py);
        // вход в коробку мира
        let t0 = 0, t1 = 1e9;
        const lo = [0, 0, 0], hi = [w.sx, w.sy, w.sz];
        for (let i = 0; i < 3; i++) {
          if (Math.abs(d[i]) < 1e-9) { if (o[i] < lo[i] || o[i] > hi[i]) return this.ground(o, d); continue; }
          let a = (lo[i] - o[i]) / d[i], b = (hi[i] - o[i]) / d[i]; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b);
        }
        if (t0 > t1) return this.ground(o, d);
        const p = o.map((v, i) => v + d[i] * (t0 + 1e-4));
        let c = p.map((v, i) => Math.min(hi[i] - 1, Math.max(0, Math.floor(v))));
        const st = d.map((v) => (v > 0 ? 1 : -1)), tD = d.map((v) => Math.abs(1 / (v || 1e-9)));
        let tM = c.map((v, i) => ((d[i] > 0 ? v + 1 - p[i] : p[i] - v) * tD[i]));
        let n = [0, 0, 0];
        if (t0 > 0) { const i = [0, 1, 2].reduce((m, i) => { const a = (lo[i] - o[i]) / d[i], b = (hi[i] - o[i]) / d[i]; return Math.abs(Math.min(a, b) - t0) < 1e-6 ? i : m; }, 1); n[i] = -st[i]; }
        for (let k = 0; k < 256; k++) {
          if (c[0] < 0 || c[1] < 0 || c[2] < 0 || c[0] >= w.sx || c[1] >= w.sy || c[2] >= w.sz) break;
          if (this.get(c[0], c[1], c[2])) return { x: c[0], y: c[1], z: c[2], n };
          const i = tM[0] < tM[1] ? (tM[0] < tM[2] ? 0 : 2) : tM[1] < tM[2] ? 1 : 2;
          c = c.slice(); c[i] += st[i]; tM[i] += tD[i]; n = [0, 0, 0]; n[i] = -st[i];
        }
        return this.ground(o, d);
      },
      ground(o, d) {
        const w = this.world; if (d[1] >= 0) return null;
        const t = -o[1] / d[1], x = Math.floor(o[0] + d[0] * t), z = Math.floor(o[2] + d[2] * t);
        if (x < 0 || z < 0 || x >= w.sx || z >= w.sz) return null;
        return { ground: true, x, y: -1, z, n: [0, 1, 0] };
      },
      /* снимок в PNG (для превью чертежей) */
      snapshot(size = 160) {
        const c = document.createElement("canvas"); c.width = c.height = size;
        c.getContext("2d").drawImage(canvas, (canvas.width - Math.min(canvas.width, canvas.height)) / 2, (canvas.height - Math.min(canvas.width, canvas.height)) / 2, Math.min(canvas.width, canvas.height), Math.min(canvas.width, canvas.height), 0, 0, size, size);
        return c.toDataURL("image/png");
      },
      destroy() { const l = gl.getExtension("WEBGL_lose_context"); l && l.loseContext(); },
    };
    E.byKey = {}; B.forEach((b, i) => { if (b) E.byKey[b.key] = i; });
    return E;
  };

  /* ---------------- шум для генерации миров ---------------- */
  V.rng = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
  V.noise2 = (seed) => {
    const P = new Uint8Array(512), r = V.rng(seed); const p = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255];
    const g = (h, x, y) => ((h & 1 ? x : -x) + (h & 2 ? y : -y));
    const fd = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const n = (x, y) => { const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y); const u = fd(x), v = fd(y), a = P[X] + Y, b = P[X + 1] + Y;
      return (1 - v) * ((1 - u) * g(P[a], x, y) + u * g(P[b], x - 1, y)) + v * ((1 - u) * g(P[a + 1], x, y - 1) + u * g(P[b + 1], x - 1, y - 1)); };
    return (x, y, oct = 4) => { let s = 0, a = 1, f = 1, m = 0; for (let i = 0; i < oct; i++) { s += n(x * f, y * f) * a; m += a; a *= 0.5; f *= 2; } return s / m; };
  };
})();
