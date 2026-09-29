/* =====================================================================
   WebGL-рендер Java-моделей Blockbench (models/item/*.json).
   Та же геометрия и те же UV, что в model3d.js (CSS-версия), но вся модель
   рисуется одним canvas: пуля из 141 элемента больше не создаёт ~850 div
   с фильтрами, поэтому не лагает. Если WebGL нет, app.js берёт CSS-версию.
   Поворот задаётся как в CSS: [["x",-14],["y",30]] = rotateX(-14deg) rotateY(30deg).
   ===================================================================== */
(function () {
  const SHADE = { up: 1, down: 0.55, north: 0.82, south: 0.82, east: 0.66, west: 0.66 };
  const VS = `attribute vec3 p;attribute vec2 t;attribute float s;uniform mat3 R;uniform vec3 K;uniform vec2 O;varying vec2 vt;varying float vs;
    void main(){vec3 q=R*p;float w=(K.z-q.z)/K.z;gl_Position=vec4(q.x*K.x,-q.y*K.y,-q.z/4000.0,w);vt=t+O;vs=s;}`;
  // A=1: как раньше (непрозрачно); A=0: полупрозрачные текстуры (стекло) через premultiplied alpha
  const FS = `precision mediump float;uniform sampler2D T;uniform float A;uniform float L;varying vec2 vt;varying float vs;
    void main(){vec4 c=texture2D(T,vt);if(c.a<0.1&&A<1.5)discard;gl_FragColor=A>0.5?vec4(c.rgb*vs,1.0):vec4(c.rgb*vs*c.a*L,c.a*L);}`;
  const imgCache = {};
  // Текстуры берём из data/pXX_tex.js (data: URI, общий словарь ZM_TEX_INLINE с ключами от папки assets/):
  // так WebGL работает и при открытии сайта файлом (file://)
  const inline = (src) => { const T = window.ZM_TEX_INLINE, i = src.indexOf("assets/"); return T && i >= 0 ? T[src.slice(i + 7)] : null; };
  const loadImg = (src) => imgCache[src] || (imgCache[src] = new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = inline(src) || src; }));

  function mat(ops) {   // CSS: transform "A B C" -> p' = A(B(C(p)))
    let M = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    const mul = (A, B) => { const o = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]; return o; };
    for (const [ax, deg] of ops) {
      const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
      const X = ax === "x" ? [1, 0, 0, 0, c, -s, 0, s, c] : ax === "y" ? [c, 0, s, 0, 1, 0, -s, 0, c] : [c, -s, 0, s, c, 0, 0, 0, 1];
      M = mul(M, X);
    }
    // в шейдер column-major
    return new Float32Array([M[0], M[3], M[6], M[1], M[4], M[7], M[2], M[5], M[8]]);
  }

  function supported() {
    try { const c = document.createElement("canvas"); return !!(c.getContext("webgl") || c.getContext("experimental-webgl")); } catch (e) { return false; }
  }

  /** build(model, texBase, {unit, cls, persp}) -> { el, setTextures(base), setRot(ops), destroy() } */
  function build(model, texBase, opt = {}) {
    const M3 = window.ZMModel3D, unit = opt.unit || 10, persp = opt.persp || 1200;
    const bb = M3.bbox(model);
    const cv = document.createElement("canvas"); cv.className = "m3gl " + (opt.cls || "");
    const gl = cv.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: true }) || cv.getContext("experimental-webgl");
    if (!gl) return null;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);

    // геометрия, сгруппированная по текстурам
    const groups = {};
    const P = (p) => [(p[0] - bb.c[0]) * unit, -(p[1] - bb.c[1]) * unit, (p[2] - bb.c[2]) * unit];
    for (const e of model.elements) {
      const Q = M3.quads(e);
      for (const [name, f] of Object.entries(e.faces || {})) {
        if (!f || !f.uv || !Q[name]) continue;
        const pts = Q[name].map((p) => P(M3.rotAxis(p, e.rotation)));
        const [u1, v1, u2, v2] = f.uv;
        let uvs = [[u1, v1], [u2, v1], [u2, v2], [u1, v2]];
        const steps = ((f.rotation || 0) / 90) | 0;
        if (steps) uvs = uvs.map((_, i) => uvs[(i - steps + 4) % 4]);
        const key = model.textures[(f.texture || "").replace("#", "")] || "";
        const g = groups[key] || (groups[key] = []);
        for (const i of [0, 1, 2, 0, 2, 3]) g.push(...pts[i], uvs[i][0] / 16, uvs[i][1] / 16, SHADE[name]);
      }
    }
    const loc = { p: gl.getAttribLocation(pr, "p"), t: gl.getAttribLocation(pr, "t"), s: gl.getAttribLocation(pr, "s") };
    const uR = gl.getUniformLocation(pr, "R"), uK = gl.getUniformLocation(pr, "K");
    const draws = Object.entries(groups).map(([key, arr]) => {
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      return { key, buf, tex, n: arr.length / 6 };
    });
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE);   // без отсечения: у нижних граней UV зеркальные
    gl.uniform1f(gl.getUniformLocation(pr, "A"), opt.blend ? 0 : 1);
    if (opt.blend) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); }
    // additive: свечение (заряд крипера) — складываем цвет, альфу не копим; repeat: текстура тайлится (для прокрутки uv)
    const uA = gl.getUniformLocation(pr, "A");
    if (opt.additive) { gl.uniform1f(uA, 0); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false); }
    const uO = gl.getUniformLocation(pr, "O"), uL = gl.getUniformLocation(pr, "L");
    gl.uniform2f(uO, 0, 0); gl.uniform1f(uL, opt.light ?? 1);
    if (opt.repeat) for (const d of draws) { gl.bindTexture(gl.TEXTURE_2D, d.tex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); }

    let ops = [], dirty = true, W = 0, H = 0, alive = true;
    function size() {
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
      if (w !== cv.width || h !== cv.height) { cv.width = w; cv.height = h; dirty = true; }
      W = r.width; H = r.height;
    }
    function draw() {
      if (!alive) return;
      size(); if (!dirty || !W) return; dirty = false;
      gl.viewport(0, 0, cv.width, cv.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix3fv(uR, false, mat(ops));
      gl.uniform3f(uK, 2 / W, 2 / H, persp);
      const pass = () => { for (const d of draws) {
        gl.bindBuffer(gl.ARRAY_BUFFER, d.buf);
        gl.enableVertexAttribArray(loc.p); gl.vertexAttribPointer(loc.p, 3, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(loc.t); gl.vertexAttribPointer(loc.t, 2, gl.FLOAT, false, 24, 12);
        gl.enableVertexAttribArray(loc.s); gl.vertexAttribPointer(loc.s, 1, gl.FLOAT, false, 24, 20);
        gl.bindTexture(gl.TEXTURE_2D, d.tex); gl.drawArrays(gl.TRIANGLES, 0, d.n);
      } };
      if (opt.additive) {   // сначала только глубина ближней поверхности, потом свечение лишь на ней (как отсечение задних граней в игре)
        gl.colorMask(false, false, false, false); gl.depthMask(true); gl.uniform1f(uA, 2); pass();
        gl.colorMask(true, true, true, true); gl.depthMask(false); gl.uniform1f(uA, 0); pass();
      } else pass();
    }
    let texGen = 0;
    function setTextures(base) {
      const gen = ++texGen;
      Promise.all(draws.map((d) => loadImg(base + d.key + (/\.\w+$/.test(d.key) ? "" : ".png")))).then((imgs) => {
        if (gen !== texGen || !alive) return;
        try {
          imgs.forEach((im, i) => {
            if (!im) return; gl.bindTexture(gl.TEXTURE_2D, draws[i].tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
            // фото-текстуры (.webp, Лабубу) сглаживаем, пиксель-арт остаётся nearest
            if (/\.webp$/.test(draws[i].key)) for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR);
          });
        } catch (e) {   // браузер не дал текстуры в WebGL: переходим на CSS-версию
          alive = false; if (opt.onFail) opt.onFail(); return;
        }
        dirty = true; draw();
      });
    }
    setTextures(texBase);
    return {
      el: cv, bb, unit, gl: true,
      setTextures,
      setUV(u, v) { gl.uniform2f(uO, u, v); dirty = true; draw(); },
      setLight(l) { gl.uniform1f(uL, l); dirty = true; draw(); },
      setRot(o) { const s = JSON.stringify(o); if (s !== this._s) { this._s = s; ops = o; dirty = true; } draw(); },
      destroy() { alive = false; const ext = gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext(); },
    };
  }
  window.ZMGL = { build, supported };
})();
