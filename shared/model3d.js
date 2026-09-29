/* =====================================================================
   CSS-3D рендер Java-моделей Blockbench (формат models/item/*.json).
   Каждая грань — div 100×100 с куском текстуры, уложенный matrix3d прямо
   в свои 4 угла (с учётом rotation элемента и uv/rotation грани).
   Модель одна на все 4 снайперки: меняется только папка с текстурами.
   ===================================================================== */
(function () {
  const SHADE = { up: 1, down: 0.55, north: 0.82, south: 0.82, east: 0.66, west: 0.66 };

  function rotAxis(p, r) {
    if (!r || !r.angle) return p;
    const a = r.angle * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), o = r.origin || [8, 8, 8];
    let x = p[0] - o[0], y = p[1] - o[1], z = p[2] - o[2];
    if (r.axis === "x") [y, z] = [y * c - z * s, y * s + z * c];
    else if (r.axis === "y") [x, z] = [x * c + z * s, -x * s + z * c];
    else[x, y] = [x * c - y * s, x * s + y * c];
    return [x + o[0], y + o[1], z + o[2]];
  }
  function quads(e) {
    const [x0, y0, z0] = e.from, [x1, y1, z1] = e.to;
    return {
      north: [[x1, y1, z0], [x0, y1, z0], [x0, y0, z0], [x1, y0, z0]],
      south: [[x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1]],
      west: [[x0, y1, z0], [x0, y1, z1], [x0, y0, z1], [x0, y0, z0]],
      east: [[x1, y1, z1], [x1, y1, z0], [x1, y0, z0], [x1, y0, z1]],
      up: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]],
      down: [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]],
    };
  }
  function bbox(model) {
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (const e of model.elements) for (const q of Object.values(quads(e))) for (const p0 of q) {
      const p = rotAxis(p0, e.rotation); for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], p[i]); mx[i] = Math.max(mx[i], p[i]); }
    }
    return { mn, mx, c: mn.map((v, i) => (v + mx[i]) / 2), size: mx.map((v, i) => v - mn[i]) };
  }

  /**
   * build(model, texBase, opt) -> { el, rig, setTextures(base) }
   * opt.unit — пикселей на 1/16 блока; opt.cls — класс корня
   */
  function build(model, texBase, opt = {}) {
    const unit = opt.unit || 10;
    const bb = bbox(model);
    const root = document.createElement("div"); root.className = "m3d " + (opt.cls || "");
    const rig = document.createElement("div"); rig.className = "m3d-rig"; root.appendChild(rig);
    const faces = [];
    const P = (p) => [(p[0] - bb.c[0]) * unit, -(p[1] - bb.c[1]) * unit, (p[2] - bb.c[2]) * unit];
    for (const e of model.elements) {
      const Q = quads(e);
      for (const [name, f] of Object.entries(e.faces || {})) {
        if (!f || !f.uv || !Q[name]) continue;
        const pts = Q[name].map((p) => P(rotAxis(p, e.rotation)));
        let [u1, v1, u2, v2] = f.uv;
        let uvs = [[u1, v1], [u2, v1], [u2, v2], [u1, v2]];
        const steps = ((f.rotation || 0) / 90) | 0;
        if (steps) uvs = uvs.map((_, i) => uvs[(i - steps + 4) % 4]);
        const umin = Math.min(u1, u2), umax = Math.max(u1, u2), vmin = Math.min(v1, v2), vmax = Math.max(v1, v2);
        const find = (u, v) => uvs.findIndex((q) => Math.abs(q[0] - u) < 1e-6 && Math.abs(q[1] - v) < 1e-6);
        let io = find(umin, vmin), ix = find(umax, vmin), iy = find(umin, vmax);
        if (io < 0 || ix < 0 || iy < 0) { io = 0; ix = 1; iy = 3; }
        const O = pts[io], X = pts[ix], Y = pts[iy];
        const ax = [(X[0] - O[0]) / 100, (X[1] - O[1]) / 100, (X[2] - O[2]) / 100];
        const ay = [(Y[0] - O[0]) / 100, (Y[1] - O[1]) / 100, (Y[2] - O[2]) / 100];
        let nz = [ax[1] * ay[2] - ax[2] * ay[1], ax[2] * ay[0] - ax[0] * ay[2], ax[0] * ay[1] - ax[1] * ay[0]];
        const nl = Math.hypot(...nz) || 1; nz = nz.map((v) => v / nl);
        const d = document.createElement("i");
        d.className = "m3d-f";
        const du = Math.max(umax - umin, 0.02), dv = Math.max(vmax - vmin, 0.02);
        const bw = 100 * 16 / du, bh = 100 * 16 / dv;
        d.style.backgroundSize = `${bw}px ${bh}px`;
        d.style.backgroundPosition = `${-umin / 16 * bw}px ${-vmin / 16 * bh}px`;
        d.style.transform = `matrix3d(${ax[0]},${ax[1]},${ax[2]},0,${ay[0]},${ay[1]},${ay[2]},0,${nz[0]},${nz[1]},${nz[2]},0,${O[0]},${O[1]},${O[2]},1)`;
        d.style.filter = `brightness(${SHADE[name]})`;
        d.dataset.tex = (model.textures[(f.texture || "").replace("#", "")] || "");
        rig.appendChild(d); faces.push(d);
      }
    }
    function setTextures(base) {
      for (const d of faces) d.style.backgroundImage = `url(${base}${d.dataset.tex}${/\.\w+$/.test(d.dataset.tex) ? "" : ".png"})`;
    }
    setTextures(texBase);
    root.style.setProperty("--mw", bb.size[0] * unit + "px");
    root.style.setProperty("--mh", bb.size[1] * unit + "px");
    return { el: root, rig, setTextures, bb, unit };
  }

  window.ZMModel3D = { build, bbox, quads, rotAxis };
})();
