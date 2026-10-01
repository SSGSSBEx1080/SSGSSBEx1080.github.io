/* =====================================================================
   ZMGeo: WebGL-рендер моделей GeckoLib / Bedrock (.geo.json) с анимациями (.animation.json).
   Координаты как у Blockbench: x зеркалится (origin.x → -(x+size)), повороты [-x,-y,z], порядок ZYX.
   Box-UV, mirror, повороты кубов и костей, иерархия parent, позиция/поворот из ключевых кадров (линейно).
   Текстура должна быть data: URI (file:// + WebGL иначе падает на CORS).
   ===================================================================== */
(function () {
  const D2R = Math.PI / 180;
  // --- мини-матрицы 4×4, column-major как в WebGL ---
  const M = {
    id: () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
    t: (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1],
    s: (k) => [k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1],
    rx(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; },
    ry(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; },
    rz(a) { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; },
    // Blockbench: Euler 'ZYX' → Rz·Ry·Rx, углы в градусах, x и y с минусом
    euler(r) { return M.mul(M.rz(r[2] * D2R), M.mul(M.ry(-r[1] * D2R), M.rx(-r[0] * D2R))); },
    persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; },
    look(e, c, u) {
      const z = norm([e[0] - c[0], e[1] - c[1], e[2] - c[2]]), x = norm(cross(u, z)), y = cross(z, x);
      return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1];
    },
    ap(m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; },
  };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

  // Box-UV граней (как Blockbench): [u1,v1,u2,v2] в пикселях текстуры
  function boxUV(u, v, w, h, d) {
    return { east: [u, v + d, u + d, v + d + h], north: [u + d, v + d, u + d + w, v + d + h], west: [u + d + w, v + d, u + 2 * d + w, v + d + h],
      south: [u + 2 * d + w, v + d, u + 2 * d + 2 * w, v + d + h], up: [u + d, v, u + d + w, v + d], down: [u + d + w, v + d, u + d + 2 * w, v] };
  }
  // 4 угла грани: верх-лево, верх-право, низ-право, низ-лево (как смотрит зритель снаружи)
  function faceQuads(a, b) {
    const [x0, y0, z0] = a, [x1, y1, z1] = b;
    return { east: [[x1, y1, z1], [x1, y1, z0], [x1, y0, z0], [x1, y0, z1]], west: [[x0, y1, z0], [x0, y1, z1], [x0, y0, z1], [x0, y0, z0]],
      north: [[x1, y1, z0], [x0, y1, z0], [x0, y0, z0], [x1, y0, z0]], south: [[x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1]],
      up: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], down: [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]] };
  }
  const SH = { up: 1, down: 0.5, north: 0.8, south: 0.8, east: 0.62, west: 0.62 };

  function sample(keys, t) {
    if (!keys || !keys.length) return null;
    if (typeof keys[0][1] === "number") keys = keys.map(([t, v]) => [t, [v, v, v]]);
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) { const [t0, a] = keys[i - 1], [t1, b] = keys[i], k = (t - t0) / (t1 - t0 || 1); return [0, 1, 2].map((j) => a[j] + (b[j] - a[j]) * k); }
    }
    return keys[keys.length - 1][1];
  }

  function supported() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl") || c.getContext("experimental-webgl")); } catch (e) { return false; } }

  function create(canvas, opt) {
    const gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: false, preserveDrawingBuffer: !!opt.keep });
    if (!gl) return null;
    const geo = opt.geo, TW = geo.tw, TH = geo.th, hide = new Set(opt.hide || []);
    const vs = `attribute vec3 p;attribute vec2 uv;attribute float sh;uniform mat4 mvp;varying vec2 v;varying float s;void main(){v=uv;s=sh;gl_Position=mvp*vec4(p,1.);}`;
    const fs = `precision mediump float;uniform sampler2D tx;uniform float lit;uniform vec3 tint;varying vec2 v;varying float s;void main(){vec4 c=texture2D(tx,v);if(c.a<.45)discard;gl_FragColor=vec4(c.rgb*mix(1.,s,lit)*tint,1.);}`;
    const sh = (t, src) => { const o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); return o; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
    const L = { p: gl.getAttribLocation(pr, "p"), uv: gl.getAttribLocation(pr, "uv"), sh: gl.getAttribLocation(pr, "sh"), mvp: gl.getUniformLocation(pr, "mvp"), lit: gl.getUniformLocation(pr, "lit"), tint: gl.getUniformLocation(pr, "tint") };

    // box UV как в GeckoLib/Blockbench: размеры для развёртки округляются вниз
    // кости: базовые данные + геометрия в координатах кости (с учётом поворота куба)
    const bones = {};
    for (const b of geo.bones) {
      const piv = [-(b.pivot || [0, 0, 0])[0], (b.pivot || [0, 0, 0])[1], (b.pivot || [0, 0, 0])[2]];
      const pos = [], uvs = [], shd = [], idx = [];
      for (const c of b.cubes || []) {
        const [ox, oy, oz] = c.origin, [sx, sy, sz] = c.size, inf = c.inflate || 0;
        const a = [-(ox + sx) - inf, oy - inf, oz - inf], bb = [-ox + inf, oy + sy + inf, oz + sz + inf];
        let cm = M.id();
        if (c.rotation) { const cp = [-(c.pivot || [0, 0, 0])[0], (c.pivot || [0, 0, 0])[1], (c.pivot || [0, 0, 0])[2]]; cm = M.mul(M.t(cp[0], cp[1], cp[2]), M.mul(M.euler(c.rotation), M.t(-cp[0], -cp[1], -cp[2]))); }
        // per-face UV (Blockbench «per-face»): {north:{uv:[u,v],uv_size:[w,h]},...}; отсутствующая грань не рисуется
        const PF = Array.isArray(c.uv) ? null : c.uv || {};
        const Q = faceQuads(a, bb), U = PF ? null : boxUV(c.uv[0], c.uv[1], Math.floor(sx + 1e-6), Math.floor(sy + 1e-6), Math.floor(sz + 1e-6)), mir = c.mirror ?? b.mirror;
        for (const f of Object.keys(Q)) {
          let face = f;
          if (PF && !PF[f]) continue;
          let [u1, v1, u2, v2] = PF ? [PF[f].uv[0], PF[f].uv[1], PF[f].uv[0] + PF[f].uv_size[0], PF[f].uv[1] + PF[f].uv_size[1]] : U[face];
          if (PF) {} else if (mir) { if (f === "east") [u1, v1, u2, v2] = U.west; else if (f === "west") [u1, v1, u2, v2] = U.east; [u1, u2] = [u2, u1]; }
          const q = Q[f].map((p) => M.ap(cm, p)), base = pos.length / 3;
          const cu = [[u1, v1], [u2, v1], [u2, v2], [u1, v2]];
          q.forEach((p, i) => { pos.push(...p); uvs.push(cu[i][0] / TW, cu[i][1] / TH); shd.push(SH[f]); });
          idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
        }
      }
      const buf = (arr, T) => { const o = gl.createBuffer(); gl.bindBuffer(T === "i" ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER, o); gl.bufferData(T === "i" ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER, T === "i" ? new Uint16Array(arr) : new Float32Array(arr), gl.STATIC_DRAW); return o; };
      bones[b.name] = { name: b.name, parent: b.parent, piv, rot: b.rotation || [0, 0, 0], n: idx.length, bp: buf(pos), bu: buf(uvs), bs: buf(shd), bi: buf(idx, "i"), local: pos };
    }

    const tex = gl.createTexture(); let ready = false;
    const img = new Image();
    img.onload = () => { gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, opt.nearest ? gl.NEAREST : gl.LINEAR);
      // mip: большие рисованные текстуры (2048) — мипмапы + анизотропия, чтобы вдали не рябило и вблизи не мылилось
      const pot = (n) => (n & (n - 1)) === 0;
      if (opt.mip && pot(img.width) && pot(img.height)) {
        gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        const an = gl.getExtension("EXT_texture_filter_anisotropic") || gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
        if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); ready = true; api.render(); };
    img.src = opt.tex;
    const setTex = (uri) => { if (img.src !== uri) { ready = ready && true; img.src = uri; } };

    // --- анимации: idle крутится всегда, действие поверх (как два контроллера GeckoLib) ---
    const AN = opt.anim || {};
    const st = { idle: opt.idle || null, idleT: 0, act: null, actT: 0, onEnd: null, speed: 1 };
    function pose(name, T) {
      const a = AN[name]; if (!a) return {};
      let t = T;
      if (a.loop === true) t = T % a.len; else t = Math.min(T, a.len);
      const o = {};
      for (const [bn, ch] of Object.entries(a.bones)) o[bn] = { r: sample(ch.rotation, t), p: sample(ch.position, t), s: ch.scale ? sample(ch.scale, t) : null };
      return o;
    }
    const cam = Object.assign({ yaw: 30, pitch: 10, dist: 60, target: [0, 8, 0], fov: 40, up: [0, 1, 0] }, opt.cam || {});
    let extra = M.id();   // доп. поворот всей модели (вращение мышью)
    function boneMats() {
      const pi = st.idle ? pose(st.idle, st.idleT) : {}, pa = st.act ? pose(st.act, st.actT) : {};
      const out = {};
      const get = (n) => {
        if (out[n]) return out[n]; const b = bones[n]; if (!b) return M.id();
        // exclusive: пока идёт действие, idle не подмешивается (как STOP контроллера движения в GeckoLib)
        const an = (opt.exclusive && st.act ? pa[n] : pa[n] || pi[n]) || {}; let r = an.r ? [b.rot[0] + an.r[0], b.rot[1] + an.r[1], b.rot[2] + an.r[2]] : b.rot;
        const ov = api.over[n]; if (ov) { r = r.slice(); if (ov.rx != null) r[0] = ov.rx; if (ov.ry != null) r[1] = ov.ry; if (ov.rz != null) r[2] = ov.rz; }
        const p = an.p ? [-an.p[0], an.p[1], an.p[2]] : [0, 0, 0];
        const sc = an.s ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => (i === 0 ? an.s[0] : i === 5 ? an.s[1] : i === 10 ? an.s[2] : i === 15 ? 1 : 0)) : null;
        let m = M.mul(M.t(b.piv[0] + p[0], b.piv[1] + p[1], b.piv[2] + p[2]), M.mul(sc ? M.mul(M.euler(r), sc) : M.euler(r), M.t(-b.piv[0], -b.piv[1], -b.piv[2])));
        if (b.parent) m = M.mul(get(b.parent), m);
        return (out[n] = m);
      };
      for (const n in bones) get(n);
      return out;
    }
    function viewProj() {
      const w = canvas.width, h = canvas.height;
      const y = cam.yaw * D2R, p = cam.pitch * D2R, t = cam.target;
      const eye = cam.eye || [t[0] + Math.sin(y) * Math.cos(p) * cam.dist, t[1] + Math.sin(p) * cam.dist, t[2] + Math.cos(y) * Math.cos(p) * cam.dist];
      return M.mul(M.persp(cam.fov * D2R, w / h, 0.5, 2000), M.look(eye, t, cam.up));
    }
    const api = {
      bones, cam, st, over: {},
      resize() { const r = canvas.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d)); if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; } },
      setExtra(m) { extra = m; },
      M,
      play(name, onEnd) { st.act = name; st.actT = 0; st.onEnd = onEnd || null; },
      stop() { st.act = null; },
      hide(n, on) { on ? hide.add(n) : hide.delete(n); },
      setTex,   // сменить текстуру на лету (варианты моба)
      tick(dt) {
        st.idleT += dt * st.speed;
        if (st.act) { st.actT += dt * st.speed; const a = AN[st.act]; if (a && a.loop === false && st.actT >= a.len) { const cb = st.onEnd; st.act = null; st.onEnd = null; cb && cb(); } }
      },
      // мировые координаты точки кости (для частиц/следа клинка)
      point(bone, p) { const m = M.mul(extra, boneMats()[bone]); return M.ap(m, p); },
      project(bone, p) { const w = api.point(bone, p), vp = viewProj(); const x = vp[0] * w[0] + vp[4] * w[1] + vp[8] * w[2] + vp[12], y = vp[1] * w[0] + vp[5] * w[1] + vp[9] * w[2] + vp[13], ww = vp[3] * w[0] + vp[7] * w[1] + vp[11] * w[2] + vp[15]; return [(x / ww * 0.5 + 0.5) * canvas.clientWidth, (0.5 - y / ww * 0.5) * canvas.clientHeight]; },
      render() {
        api.resize();
        gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        if (!ready) return;
        gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.useProgram(pr);
        gl.uniform1f(L.lit, opt.lit ?? 1); const tn = opt.tint || [1, 1, 1]; gl.uniform3f(L.tint, tn[0], tn[1], tn[2]);
        const vp = viewProj(), bm = boneMats();
        for (const b of Object.values(bones)) {
          if (hide.has(b.name) || !b.n) continue;
          gl.uniformMatrix4fv(L.mvp, false, new Float32Array(M.mul(vp, M.mul(extra, bm[b.name]))));
          gl.bindBuffer(gl.ARRAY_BUFFER, b.bp); gl.enableVertexAttribArray(L.p); gl.vertexAttribPointer(L.p, 3, gl.FLOAT, false, 0, 0);
          gl.bindBuffer(gl.ARRAY_BUFFER, b.bu); gl.enableVertexAttribArray(L.uv); gl.vertexAttribPointer(L.uv, 2, gl.FLOAT, false, 0, 0);
          gl.bindBuffer(gl.ARRAY_BUFFER, b.bs); gl.enableVertexAttribArray(L.sh); gl.vertexAttribPointer(L.sh, 1, gl.FLOAT, false, 0, 0);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.bi); gl.drawElements(gl.TRIANGLES, b.n, gl.UNSIGNED_SHORT, 0);
        }
      },
      // габариты кости в её покое (для центровки)
      bbox(names) {
        const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9], bm = boneMats();
        for (const n of names) { const b = bones[n]; for (let i = 0; i < b.local.length; i += 3) { const p = M.ap(bm[n], [b.local[i], b.local[i + 1], b.local[i + 2]]); for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); } } }
        return { mn, mx, c: mn.map((v, i) => (v + mx[i]) / 2), size: mx.map((v, i) => v - mn[i]) };
      },
    };
    return api;
  }
  window.ZMGeo = { create, supported, M };
})();
