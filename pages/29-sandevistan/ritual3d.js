/* №29 · Ритуал установки Сандевистана — 3D-катсцена «фулл фокус».
 *
 * КОРАБЛЬ ЭНДА — не «по мотивам», а НАСТОЯЩАЯ структура из файлов игры:
 * data/minecraft/structure/end_city/ship.nbt (13×24×29 блоков, 929 блоков
 * без воздуха): пурпур и пурпуровые пилон/ступени/плиты, обсидиан, кирпичи
 * эндерняка, магентовое стекло, 6 энд-родов, лестница в трюм, 2 сундука,
 * варочная стойка с двумя склянками и голова дракона на носу.
 * Ступени повторяют ванильные модели blockstates/purpur_stairs.json
 * (базовая плита + половина/квадранты, повороты по facing/half/shape),
 * варочная стойка — модель block/brewing_stand.json, сундук — раскладка
 * entity/chest/normal.png (крышка 14×5×14, корпус 14×10×14), голова
 * дракона — сборка по текстуре entity/enderdragon/dragon.png.
 *
 * СУБЪЕКТ — гуманоид со скином Стива (конструктор p2/p24/g3), незеритовый
 * сет — слои брони с ванильными текстурами, имплант — оригинальная модель
 * мода (7 кубов из geo-файла, текстура sandevistan_armor).
 *
 * КАМЕРА-РЕЖИССЁР: каждый план — сплайн Катмулла-Рома, движение по нему
 * со сглаживанием (smoothstep), переходы между планами — через
 * экспоненциальное демпфирование, поэтому пролёты РОВНЫЕ: ни рывков,
 * ни скачков при смене бита. Хореография бьётся по битам театра app.js
 * (armor → void → syr → finale → done): сет брони в одну строку →
 * надевается → настоящий корабль поднимается из бездны под субъектом →
 * по шприцу в каждую руку → канал 100 тиков → имплант на 99-м заменяет
 * нагрудник → удар ауры, пролёт за спину с видом на голову дракона.
 * Механики остаются в app.js, здесь только картинка. */

import * as T from '../../shared/vendor/three/three.module.js';

const stage = document.querySelector('#ritualStage'), cv = document.querySelector('#ritual3d');
try {
  if (!stage || !cv) throw Error('нет сцены');
  if (!document.createElement('canvas').getContext('webgl2')) throw Error('WebGL2 недоступен');
  const DPR = Math.min(devicePixelRatio || 1, 1.5);
  const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(DPR);
  const scene = new T.Scene();
  scene.fog = new T.FogExp2(0x05070d, .02);
  const camera = new T.PerspectiveCamera(42, 1, .1, 160);

  /* ================= СВЕТ =================
   * холод Энда + тёплый прожектор на субъекта (физические единицы three.js) */
  scene.add(new T.HemisphereLight(0xcfd8ff, 0x1a0e26, 2.5));
  const key = new T.DirectionalLight(0xffffff, 2.1); key.position.set(3, 6, 4); scene.add(key);
  const rim = new T.DirectionalLight(0x7a5cff, 1.25); rim.position.set(-4, 3, -5); scene.add(rim);
  const fill = new T.DirectionalLight(0x39e9da, .45); fill.position.set(-2, -3, 6); scene.add(fill);
  const auraLight = new T.PointLight(0x39e9da, 0, 16); auraLight.position.set(0, 2.2, .8); scene.add(auraLight);

  const loader = new T.TextureLoader();
  const texOf = (p) => { const t = loader.load(p); t.colorSpace = T.SRGBColorSpace; t.magFilter = T.NearestFilter; t.minFilter = T.NearestMipmapNearestFilter; return t; };
  const A = '../../assets/textures/';

  /* =================================================================
   * ПИСАТЕЛЬ ГЕОМЕТРИИ: квадраты с UV в пикселях текстуры.
   * Один буфер на материал → один Mesh на текстуру в конце сборки.
   * ================================================================= */
  const Buf = () => ({ pos: [], norm: [], uv: [], idx: [], n: 0 });
  /* p0..p3 — вершины против часовой (наружу), r = [u0,v0,u1,v1] в пикселях
   * текстуры tw×th (v сверху); rot — взять UV повёрнутыми на 90° */
  const pushQuad = (b, p0, p1, p2, p3, nx, ny, nz, r, tw, th, rot) => {
    const base = b.n;
    b.pos.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], p3[0], p3[1], p3[2]);
    for (let i = 0; i < 4; i++) b.norm.push(nx, ny, nz);
    const uv = rot
      ? [[r[1], r[0]], [r[3], r[0]], [r[3], r[2]], [r[1], r[2]]]
      : [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];
    for (const [u, v] of uv) b.uv.push(u / tw, 1 - v / th);
    b.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    b.n += 4;
  };
  /* коробка x0..x1 (в мировых единицах); faces — UV-прямоугольники граней
   * {px,nx,py,ny,pz,nz:[u0,v0,u1,v1]} в пикселях текстуры tw×th; *Rot —
   * повернуть UV грани на 90° */
  const addBox = (b, x0, y0, z0, x1, y1, z1, faces, tw, th) => {
    const F = faces || {};
    if (F.px) pushQuad(b, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], 1, 0, 0, F.px, tw, th, F.pxRot);
    if (F.nx) pushQuad(b, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], -1, 0, 0, F.nx, tw, th, F.nxRot);
    if (F.py) pushQuad(b, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], 0, 1, 0, F.py, tw, th, F.pyRot);
    if (F.ny) pushQuad(b, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], 0, -1, 0, F.ny, tw, th, F.nyRot);
    if (F.pz) pushQuad(b, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], 0, 0, 1, F.pz, tw, th, F.pzRot);
    if (F.nz) pushQuad(b, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], 0, 0, -1, F.nz, tw, th, F.nzRot);
  };
  /* вся текстура на каждую грань */
  const tile = (tw, th) => ({ px: [0, 0, tw, th], nx: [0, 0, tw, th], py: [0, 0, tw, th], ny: [0, 0, tw, th], pz: [0, 0, tw, th], nz: [0, 0, tw, th] });
  /* развёртка коробки как у ModelPart: (u,v) — левый верх угла, w×h×d */
  const unw = (u, v, w, h, d) => ({
    px: [u, v + d, u + d, v + d + h], nx: [u + d + w, v + d, u + 2 * d + w, v + d + h],
    py: [u + d, v, u + d + w, v + d], ny: [u + d + w, v, u + d + 2 * w, v + d],
    pz: [u + 2 * d + w, v + d, u + 2 * d + 2 * w, v + d + h], nz: [u + d, v + d, u + d + w, v + d + h],
  });

  /* =================================================================
   * МАТЕРИАЛЫ КОРАБЛЯ (все текстуры — ванильные, из ассетов игры)
   * ================================================================= */
  const MAT = {
    purpur: new T.MeshLambertMaterial({ map: texOf(A + 'mc/van/purpur_block.png') }),
    pillar: new T.MeshLambertMaterial({ map: texOf(A + 'mc/van/purpur_pillar.png') }),
    pillartop: new T.MeshLambertMaterial({ map: texOf(A + 'mc/van/purpur_pillar_top.png') }),
    obsidian: new T.MeshLambertMaterial({ map: texOf(A + 'mc/van/obsidian.png') }),
    bricks: new T.MeshLambertMaterial({ map: texOf(A + 'mc/van/end_stone_bricks.png') }),
    glass: new T.MeshLambertMaterial({ map: texOf(A + 'mc/van/magenta_stained_glass.png'), transparent: true, opacity: .6, depthWrite: false }),
    ladder: new T.MeshLambertMaterial({ map: texOf(A + 'mc/van/ladder.png'), alphaTest: .5, side: T.DoubleSide }),
    rod: new T.MeshBasicMaterial({ map: texOf(A + 'mc/van/end_rod.png') }),
    chest: new T.MeshLambertMaterial({ map: texOf(A + 'mc/van/chest_normal.png') }),
    brew: new T.MeshLambertMaterial({ map: texOf(A + 'mc/van/brewing_stand.png') }),
    brewbase: new T.MeshLambertMaterial({ map: texOf(A + 'mc/van/brewing_stand_base.png') }),
    dragon: new T.MeshLambertMaterial({ map: texOf(A + 'mc/dragon.png') }),
  };
  const TX = { purpur: 16, pillar: 16, pillartop: 16, obsidian: 16, bricks: 16, glass: 16, ladder: 16, rod: 16, chest: 64, brew: 16, brewbase: 16, dragon: 256 };
  const bufs = {}; for (const k in TX) bufs[k] = Buf();

  /* =================================================================
   * БЛОКИ: кубы, пилоны, ступени (ванильная таблица), плиты, лестница,
   * стекло, энд-род, сундук, варочная стойка, голова дракона.
   * Координаты блока (x,y,z) структуры → мир: (x-6, y-10, z-14),
   * палуба = y структуры 10 → мировой ноль.
   * ================================================================= */
  const OX = -6, OY = -10, OZ = -14;
  const bc = (x, y, z) => [x + OX, y + OY, z + OZ];   /* центр блока */
  const px = (x, v) => x + OX - .5 + v / 16;          /* пиксель блока → мир */

  const putCube = (x, y, z, key) => {
    const [cx, cy, cz] = bc(x, y, z);
    addBox(bufs[key], cx - .5, cy - .5, cz - .5, cx + .5, cy + .5, cz + .5, tile(TX[key], TX[key]), TX[key], TX[key]);
  };
  /* пурпуровый пилон: ось решает, где торец (pillartop) и какие грани повёрнуты */
  const putPillar = (x, y, z, axis) => {
    const [cx, cy, cz] = bc(x, y, z), s = TX.pillar, t = tile(16, 16);
    const top = tile(16, 16);
    let faces;
    if (axis === 'y') faces = { px: t.px, nx: t.nx, pz: t.pz, nz: t.nz, py: top.py, ny: top.ny };
    else if (axis === 'x') faces = { px: top.px, nx: top.nx, pz: t.pz, pzRot: 1, nz: t.nz, nzRot: 1, py: t.py, pyRot: 1, ny: t.ny, nyRot: 1 };
    else faces = { pz: top.pz, nz: top.nz, px: t.px, pxRot: 1, nx: t.nx, nxRot: 1, py: t.py, ny: t.ny };
    addBox(bufs.pillar, cx - .5, cy - .5, cz - .5, cx + .5, cy + .5, cz + .5, faces, 16, 16);
    if (axis === 'x' || axis === 'z') {
      /* торцы пилона лежат в буфере pillartop */
      addBox(bufs.pillartop, cx - .5, cy - .5, cz - .5, cx + .5, cy + .5, cz + .5,
        axis === 'x' ? { px: top.px, nx: top.nx } : { pz: top.pz, nz: top.nz }, 16, 16);
    }
  };
  /* ступени — строгая ванильная геометрия (blockstates/purpur_stairs.json):
   *   straight      = плита + половина к facing
   *   outer_left    = плита + квадрант (facing ∩ left)
   *   outer_right   = плита + квадрант (facing ∩ right)
   *   inner_left    = плита + половина rot270(facing) + квадрант (facing ∩ right)
   *   inner_right   = плита + половина facing + квадрант (rot90(facing) ∩ opposite)
   * half=top — зеркало по Y. Правые/левые направления: E→S, S→W, W→N, N→E. */
  const RIGHT = { east: 'south', south: 'west', west: 'north', north: 'east' };
  const LEFT = { east: 'north', north: 'west', west: 'south', south: 'east' };
  const ROT90 = { east: 'south', south: 'west', west: 'north', north: 'east' };
  const ROT270 = { east: 'north', north: 'west', west: 'south', south: 'east' };
  const OPP = { east: 'west', west: 'east', north: 'south', south: 'north' };
  const HALF = { east: [8, 16, 0, 16], south: [0, 16, 8, 16], west: [0, 8, 0, 16], north: [0, 16, 0, 8] };
  const quadOf = (a, b) => {
    const x0 = a === 'east' ? 8 : 0, x1 = a === 'east' ? 16 : 8;
    const z0 = b === 'south' ? 8 : 0, z1 = b === 'south' ? 16 : 8;
    return [x0, x1, z0, z1];
  };
  const stairBoxes = (shape, facing) => {
    if (shape === 'straight') return [HALF[facing]];
    if (shape === 'outer_left') { const q = quadOf(facing, LEFT[facing]); return [[q[0], q[1], q[2], q[3]]]; }
    if (shape === 'outer_right') { const q = quadOf(facing, RIGHT[facing]); return [[q[0], q[1], q[2], q[3]]]; }
    if (shape === 'inner_left') { const q = quadOf(facing, RIGHT[facing]); return [HALF[ROT270[facing]], [q[0], q[1], q[2], q[3]]]; }
    const q = quadOf(ROT90[facing], OPP[facing]);
    return [HALF[facing], [q[0], q[1], q[2], q[3]]];   /* inner_right */
  };
  const putStairs = (x, y, z, half, shape, facing) => {
    /* плита: у bottom — снизу (0..8), у top — сверху (8..16); шаг — над/под ней */
    const b0 = half === 'top' ? 8 : 0, b1 = half === 'top' ? 16 : 8;
    const s0 = half === 'top' ? 0 : 8, s1 = half === 'top' ? 8 : 16;
    addBox(bufs.purpur, px(x, 0), px(y, b0), px(z, 0), px(x, 16), px(y, b1), px(z, 16), tile(16, 16), 16, 16);
    for (const [x0, x1, z0, z1] of stairBoxes(shape, facing))
      addBox(bufs.purpur, px(x, x0), px(y, s0), px(z, z0), px(x, x1), px(y, s1), px(z, z1), tile(16, 16), 16, 16);
  };
  const putSlab = (x, y, z, type) => {
    const y0 = type === 'top' ? 8 : 0, y1 = type === 'top' ? 16 : 8;
    addBox(bufs.purpur, px(x, 0), px(y, y0), px(z, 0), px(x, 16), px(y, y1), px(z, 16), tile(16, 16), 16, 16);
  };
  /* лестница-конструктор: плоскость 16×16 у стены (facing=юг → у северной грани) */
  const putLadder = (x, y, z, facing) => {
    const zp = facing === 'south' ? .8 : 15.2;
    const zz = px(z, zp);
    if (facing === 'south' || facing === 'north')
      pushQuad(bufs.ladder, [px(x, 0), px(y, 0), zz], [px(x, 16), px(y, 0), zz], [px(x, 16), px(y, 16), zz], [px(x, 0), px(y, 16), zz], 0, 0, 1, [0, 0, 16, 16], 16, 16);
    else {
      const xx = px(x, facing === 'east' ? 15.2 : .8);
      pushQuad(bufs.ladder, [xx, px(y, 0), px(z, 0)], [xx, px(y, 0), px(z, 16)], [xx, px(y, 16), px(z, 16)], [xx, px(y, 16), px(z, 0)], 1, 0, 0, [0, 0, 16, 16], 16, 16);
    }
  };
  /* энд-род: vanilla end_rod.json — база 8×2×8 + стержень 2×14×2;
   * facing up/down — вертикально, south — горизонтально к югу */
  const putRod = (x, y, z, facing) => {
    const b = bufs.rod;
    const rodUV = { px: [7, 0, 9, 16], nx: [7, 0, 9, 16], py: [7, 0, 9, 2], ny: [7, 0, 9, 2], pz: [7, 0, 9, 16], nz: [7, 0, 9, 16] };
    const baseUV = { px: [4, 4, 12, 12], nx: [4, 4, 12, 12], py: [4, 4, 12, 12], ny: [4, 4, 12, 12], pz: [4, 4, 12, 12], nz: [4, 4, 12, 12] };
    if (facing === 'up' || facing === 'down') {
      addBox(b, px(x, 4), px(y, 0), px(z, 4), px(x, 12), px(y, 2), px(z, 12), baseUV, 16, 16);
      addBox(b, px(x, 7), px(y, 2), px(z, 7), px(x, 9), px(y, 16), px(z, 9), rodUV, 16, 16);
    } else {
      const dir = facing === 'south' ? 1 : -1;   /* стержень тянется к югу (+z) или северу */
      const zb0 = dir > 0 ? 0 : 14, zb1 = dir > 0 ? 2 : 16;
      const zr0 = dir > 0 ? 2 : 0, zr1 = dir > 0 ? 16 : 14;
      addBox(b, px(x, 4), px(y, 4), px(z, zb0), px(x, 12), px(y, 12), px(z, zb1), baseUV, 16, 16);
      addBox(b, px(x, 7), px(y, 7), px(z, zr0), px(x, 9), px(y, 9), px(z, zr1), rodUV, 16, 16);
    }
  };
  /* сундук: корпус 14×10×14 + крышка 14×5×14, раскладка entity/chest/normal.png
   * (лицевая грань — южная, у сундуков в трюме facing=south); защёлка — тёмная
   * коробочка на лицевой грани */
  const matLatch = new T.MeshLambertMaterial({ color: 0x241a10 });
  const chestUV = (u, v, w, h, d) => ({
    px: [u, v + d, u + d, v + d + h], nx: [u + d + w, v + d, u + 2 * d + w, v + d + h],
    py: [u + d, v, u + d + w, v + d], ny: [u + d + w, v, u + d + 2 * w, v + d],
    pz: [u + d, v + d, u + d + w, v + d + h],          /* юг = лицевая, как «north» развёртки */
    nz: [u + 2 * d + w, v + d, u + 2 * d + 2 * w, v + d + h],
  });
  const putChest = (x, y, z, facing) => {
    const b = bufs.chest, south = facing !== 'north';
    const zA = px(z, 1), zB = px(z, 15);
    addBox(b, px(x, 1), px(y, 0), Math.min(zA, zB), px(x, 15), px(y, 10), Math.max(zA, zB), chestUV(0, 19, 14, 10, 14), 64, 64);
    addBox(b, px(x, 1), px(y, 10), Math.min(zA, zB), px(x, 15), px(y, 14.6), Math.max(zA, zB), chestUV(0, 0, 14, 5, 14), 64, 64);
    /* защёлка на лицевой грани */
    const latch = new T.Mesh(new T.BoxGeometry(.19, .22, .05), matLatch);
    latch.position.set(x + OX, y + OY + .77, z + OZ + (south ? .44 : -.44));
    if (south) latch.rotation.y = 0; else latch.rotation.y = Math.PI;
    bufs.__latch = bufs.__latch || { meshes: [] };
    bufs.__latch.meshes.push(latch);
  };
  /* варочная стойка: модель block/brewing_stand.json — стержень 2×14×2
   * и три рычага-основания; склянки (has_bottle_0/2) — полупрозрачные кубики */
  const putBrewing = (x, y, z) => {
    const b = bufs.brew;
    const rodUV = { px: [7, 1, 9, 15], nx: [7, 1, 9, 15], py: [7, 0, 9, 2], ny: [7, 0, 9, 2], pz: [7, 1, 9, 15], nz: [7, 1, 9, 15] };
    addBox(b, px(x, 7), px(y, 0), px(z, 7), px(x, 9), px(y, 14), px(z, 9), rodUV, 16, 16);
    const armUV = tile(16, 16);
    addBox(bufs.brewbase, px(x, 9), px(y, 0), px(z, 5), px(x, 15), px(y, 2), px(z, 11), armUV, 16, 16);
    addBox(bufs.brewbase, px(x, 1), px(y, 0), px(z, 1), px(x, 7), px(y, 2), px(z, 7), armUV, 16, 16);
    addBox(bufs.brewbase, px(x, 1), px(y, 0), px(z, 9), px(x, 7), px(y, 2), px(z, 15), armUV, 16, 16);
  };
  /* голова дракона на носу: сборка по текстуре entity/enderdragon/dragon.png
   * (черепушка 6×6×6 + верхняя челюсть + нижняя + рога + глаза), смотрит на север */
  const putDragonHead = (x, y, z) => {
    const b = bufs.dragon, cx = x + OX, cy = y + OY, cz = z + OZ;
    const P = (v) => v / 16;   /* локальные пиксели → блоки */
    /* череп */
    addBox(b, cx - P(3), cy - P(3), cz - P(3), cx + P(3), cy + P(3), cz + P(3), unw(0, 0, 6, 6, 6), 256, 256);
    /* верхняя челюсть — вперёд на север */
    addBox(b, cx - P(2.5), cy - P(1.6), cz - P(8), cx + P(2.5), cy + P(1.4), cz - P(3), unw(24, 0, 5, 3, 5), 256, 256);
    /* нижняя челюсть — приоткрыта */
    addBox(b, cx - P(2.2), cy - P(3.3), cz - P(7.4), cx + P(2.2), cy - P(1.9), cz - P(3), unw(0, 14, 4.4, 1.4, 4.4), 256, 256);
    /* надбровные рога */
    addBox(b, cx - P(2.6), cy + P(2.6), cz + P(.5), cx - P(1.2), cy + P(5.2), cz + P(1.8), unw(38, 0, 1.4, 2.6, 1.3), 256, 256);
    addBox(b, cx + P(1.2), cy + P(2.6), cz + P(.5), cx + P(2.6), cy + P(5.2), cz + P(1.8), unw(38, 0, 1.4, 2.6, 1.3), 256, 256);
  };
  const matEye = new T.MeshBasicMaterial({ color: 0xd36bff });
  const putDragonEyes = (x, y, z) => {
    const cx = x + OX, cy = y + OY, cz = z + OZ;
    const g = new T.BoxGeometry(.13, .1, .05);
    for (const sx of [-1, 1]) {
      const m = new T.Mesh(g, matEye);
      m.position.set(cx + sx * .13, cy + .1, cz - .2);
      bufs.__eye = bufs.__eye || { meshes: [] };
      bufs.__eye.meshes.push(m);
    }
  };

  /* =================================================================
   * ДАННЫЕ КОРАБЛЯ — выгружено из ship.nbt (end_city), слои Y снизу вверх,
   * каждая строка — X 0..12, символы — Z 0..28 ('.' = воздух, буква =
   * индекс палитры в base64). Палитра — точные состояния блоков.
   * ================================================================= */
    const PAL = [
    { n: 'purpur_pillar', p: { axis: 'z' } },
    { n: 'purpur_block' },
    { n: 'obsidian' },
    { n: 'purpur_pillar', p: { axis: 'y' } },
    { n: 'end_stone_bricks' },
    { n: 'magenta_stained_glass' },
    { n: 'air' },
    { n: 'purpur_stairs', p: { half: 'top', shape: 'straight', facing: 'east' } },
    { n: 'purpur_stairs', p: { half: 'top', shape: 'straight', facing: 'west' } },
    { n: 'purpur_stairs', p: { half: 'bottom', shape: 'straight', facing: 'south' } },
    { n: 'purpur_stairs', p: { half: 'top', shape: 'straight', facing: 'north' } },
    { n: 'purpur_stairs', p: { half: 'top', shape: 'outer_left', facing: 'south' } },
    { n: 'purpur_stairs', p: { half: 'bottom', shape: 'straight', facing: 'east' } },
    { n: 'purpur_stairs', p: { half: 'top', shape: 'outer_left', facing: 'east' } },
    { n: 'purpur_stairs', p: { half: 'bottom', shape: 'straight', facing: 'north' } },
    { n: 'purpur_stairs', p: { half: 'top', shape: 'outer_right', facing: 'south' } },
    { n: 'purpur_stairs', p: { half: 'bottom', shape: 'straight', facing: 'west' } },
    { n: 'purpur_stairs', p: { half: 'top', shape: 'outer_left', facing: 'north' } },
    { n: 'end_rod', p: { facing: 'up' } },
    { n: 'end_rod', p: { facing: 'south' } },
    { n: 'purpur_stairs', p: { half: 'bottom', shape: 'inner_left', facing: 'south' } },
    { n: 'ladder', p: { facing: 'south' } },
    { n: 'purpur_stairs', p: { half: 'bottom', shape: 'inner_right', facing: 'south' } },
    { n: 'purpur_stairs', p: { half: 'top', shape: 'outer_right', facing: 'east' } },
    { n: 'purpur_stairs', p: { half: 'top', shape: 'outer_right', facing: 'north' } },
    { n: 'purpur_stairs', p: { half: 'top', shape: 'straight', facing: 'south' } },
    { n: 'purpur_stairs', p: { half: 'top', shape: 'outer_right', facing: 'west' } },
    { n: 'purpur_stairs', p: { half: 'bottom', shape: 'inner_left', facing: 'west' } },
    { n: 'purpur_stairs', p: { half: 'bottom', shape: 'outer_right', facing: 'east' } },
    { n: 'purpur_stairs', p: { half: 'bottom', shape: 'inner_right', facing: 'east' } },
    { n: 'purpur_stairs', p: { half: 'bottom', shape: 'outer_left', facing: 'west' } },
    { n: 'purpur_slab', p: { type: 'top' } },
    { n: 'purpur_stairs', p: { half: 'top', shape: 'outer_left', facing: 'west' } },
    { n: 'chest', p: { facing: 'south', type: 'single' } },
    { n: 'structure_block', p: { mode: 'data' } },
    { n: 'brewing_stand', p: { has_bottle_0: 'true', has_bottle_1: 'false', has_bottle_2: 'true' } },
    { n: 'dragon_wall_head', p: { facing: 'north' } },
  ];
  /* слои Y (0 — киль, 10 — палуба, 23 — топ мачты): строки = X 0..12, символы = Z 0..28 */
  const LAYERS = {
    0: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGAAAAAAAAAAAAAGGGGG',  /* центральная линия */
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
    1: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGHGGGHGGGHGGGGGGG',
      'GGGGGGGGGGGGBBBBBBBBBBBBBGGGG',
      'GGGGGGGGAAAABBBBBBBBBBBAAGGGG',  /* центральная линия */
      'GGGGGGGGGGGGBBBBBBBBBBBBBGGGG',
      'GGGGGGGGGGGGGIGGGIGGGIGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
    2: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGHGGGHGGGHGGGHGGG',
      'GGGGGGGGGGBBBBBBBBBBBBBBBBGGG',
      'GGGGGGGGBBBBCCCCCCCCCCCCCBGGG',
      'GGGGGGAAAAAAAADAAAAAAAAAAAGGG',  /* центральная линия */
      'GGGGGGGGBBBBCCCCCCCCCCCCCBGGG',
      'GGGGGGGGGGBBBBBBBBBBBBBBBBGGG',
      'GGGGGGGGGGGGGIGGGIGGGIGGGIGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
    3: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGHGGGHGGGHGGGHGGG',
      'GGGGGGGGGGBBBBBBBBBBBBBBBBGGG',
      'GGGGGGGGBBGGGGGGGGGGGGGGGBGGG',
      'GGGGGGGBBGGGGGGGGGGGGGGGGBGGG',
      'GGGGGAABBGGGGGDGGGGGGGGGGBGGG',  /* центральная линия */
      'GGGGGGGBBGGGGGGGGGGGGGGGGBGGG',
      'GGGGGGGGBBGGGGGJBBBBBBBBBBGGG',
      'GGGGGGGGGGBBBBBBBBBBBBBBBBGGG',
      'GGGGGGGGGGGGGIGGGIGGGIGGGIGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
    4: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGBBBBBBBBBBBBBBBKGG',
      'GGGGGGGGGBBGGGGGGGGGGGGGGBGGG',
      'GGGGGGGBBGGGGGGGGGGGGGGGGBGGG',
      'GGGGGGBhGGGGGGGGGGGGGGGGGBGGG',
      'GGGGGBBGiGGGGGDGGGGGGGGGGBKGG',  /* центральная линия */
      'GGGGGGBhGGGGGGGGGGGGGGGGGBGGG',
      'GGGGGGGBBGGGGGGGGGGJBBBBBBGGG',
      'GGGGGGGGGBBGGGGGGGGJBBBBBBGGG',
      'GGGGGGGGGGGBBBBBBBBBBBBBBBKGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
    5: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGHGGHGGGLHMHHMHNG',
      'GGGGGGGGGGGBBBBBBBBBBBBBBBBKG',
      'GGGGGGGGGBBGGGGGGGGGBBBBBBBOG',
      'GGGGGGGBBGGGGGGGGGGGBBBBBBBKG',
      'GGGGGGBiGGGGGGGGGGGGBBBBBBBKG',
      'GGGGAABiGGGGGGDGGGGGBBBBBBBOG',  /* центральная линия */
      'GGGGGGBiGGGGGGGGGGGGBBBBBBBKG',
      'GGGGGGGBBGGGGGGGGGGGJBBBBBBKG',
      'GGGGGGGGGBBGGGGGGGGGJBBBBBBKG',
      'GGGGGGGGGGGBBBBBBBBBBBBBBBBKG',
      'GGGGGGGGGGGGGIGGIGGGPIQIIQIRG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
    6: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGSG',
      'GGGGGGGGGGGBBGBBGBBBBDEEEEDGG',
      'GGGGGGGGGBBGGGGGGGGBBBGGGGEGG',
      'GGGGGGGBBGGGGGGGGGGBOGGGGGEGG',
      'GGGGGGBGGGGGGGGGGGGBOGGGGGEGG',
      'GGGAABTGGGGGGGDGGGGBBBGGGDDGG',  /* центральная линия */
      'GGGGGGBGGGGGGGGGGGGBBBGGGGEGG',
      'GGGGGGGBBGGGGGGGGGGGGGGGGGEiG',
      'GGGGGGGGGBBGGGGGGGGGGGGGGGEGG',
      'GGGGGGGGGGGBBGBBGBBBBDEEEEDGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGSG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
    7: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGBBBBBBBBBBBDEFFEDGG',
      'GGGGGGGGBBBBBBBBBBBBBBGGGGEGG',
      'GGGGGGBBBBBBBBBBBBBOGGGGGGFGG',
      'GGGGGBBBBBBBBBBBBBBOGGGGGGEGG',
      'GAAAABBBBBBBAFDBBBBBBBGGGjDGG',  /* центральная линия */
      'GGGGGBBBBBBBBBBBBBBBBBGGGGEGG',
      'GGGGGGBBBBBBBBBBBBBGGGGGGGFGG',
      'GGGGGGGGBBBBBBBBBBBGGGGGGGEGG',
      'GGGGGGGGGGBBBBBBBBBBBDEFFEDGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
    8: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGBMMBMMBMMBBDEEEEDGG',
      'GGGGGGGGBMUGGGGGGGGGGBGGGGEGG',
      'GGGGGGBMUGGGGGGGGGGGGGGGGGEGG',
      'GGGGGBGGGGGGGGGGGGGGGGGGGGEGG',
      'kOGGBGGGGGAAOGDVGGGGGBGGGGDGG',  /* центральная линия */
      'GGGGGBGGGGGGGGGGGGGGGBGGGGEGG',
      'GGGGGGBQWGGGGGGGGGGJBKGGGGEGG',
      'GGGGGGGGBQWGGGGGGGGJBKGGGGEGG',
      'GGGGGGGGGGBQQBQQBQQBBDEEEEDGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
    9: [
      'GGGGGGGGGGGGGGGGGGGXHMMHHMMHY',
      'GGGGGGGGGGGGGGGGGGGZBBBBBBBBK',
      'GGGGGGGGGGSGGGGGGGGZBBBBBBBBO',
      'GGGGGGGGGGGGGGGGGGGZBBBBBBBBO',
      'GGGGGGGGGGGGGGGGGGGGGBBBBBBBK',
      'GGGGGGGGGGGGGGGGGGGGGBBBBBBBK',
      'GGGGSGGGAAOGGGDVGGGGBBBBBBBBO',  /* центральная линия */
      'GGGGGGGGGGGGGGGGGGGGBBBBBBBBK',
      'GGGGGGGGGGGGGGGGGGGGJBBBBBBBK',
      'GGGGGGGGGGGGGGGGGGGGJBBBBBBBO',
      'GGGGGGGGGGSGGGGGGGGGBBBBBBBBO',
      'GGGGGGGGGGGGGGGGGGGZBBBBBBBBK',
      'GGGGGGGGGGGGGGGGGGGPIQQIIQQIa',
    ],
    10: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGBMMMMMMBG',
      'GGGGGGGGGGGGGGGGGGGGJGGGGGGOG',
      'GGGGGGGGGGGGGGGGGGGGBbGGGGGOG',
      'GGGGGGGGGGGGGGGGGGGGGJDGGGcBG',
      'GGGGGGGGGGGGGGGGGGGGGJGGGGJOG',
      'GGGGGGAAOGGGGGDVGGGGBdGGGGJOG',  /* центральная линия */
      'GGGGGGGGGGGGGGGGGGGGBGGGGGJOG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGeBG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGOG',
      'GGGGGGGGGGGGGGGGGGGGBGGGGGGOG',
      'GGGGGGGGGGGGGGGGGGGGBQQQQQQBG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
    11: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGiG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGAAOGGGGGGGDVGGGGGGGGGGGGG',  /* центральная линия */
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
    12: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GfAAOGGGGGGGGGDVGGGGGGGGGGGGG',  /* центральная линия */
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
    13: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGDVGGGGGGGGGGGGG',  /* центральная линия */
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
    14: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGDVGGGGGGGGGGGGG',  /* центральная линия */
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
    15: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGDVGGGGGGGGGGGGG',  /* центральная линия */
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
    16: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGDVGGGGGGGGGGGGG',  /* центральная линия */
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
    17: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGDVGGGGGGGGGGGGG',  /* центральная линия */
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
    18: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGDVGGGGGGGGGGGGG',  /* центральная линия */
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
    19: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGDVGGGGGGGGGGGGG',  /* центральная линия */
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
    20: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGfffGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGDVGGGGGGGGGGGGG',  /* центральная линия */
      'GGGGGGGGGGGGGfffGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
    21: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGLHHHNGGGGGGGGGGGG',
      'GGGGGGGGGGGGZGGGKGGGGGGGGGGGG',
      'GGGGGGGGGGGGZGDVKGGGGGGGGGGGG',  /* центральная линия */
      'GGGGGGGGGGGGZGGGKGGGGGGGGGGGG',
      'GGGGGGGGGGGGgIIIRGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
    22: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGDGGGGGGGGGGGGGG',  /* центральная линия */
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
    23: [
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGBGGGGGGGGGGGGGG',  /* центральная линия */
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    ],
  };

  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const DISPATCH = {
    purpur_block: (x, y, z) => putCube(x, y, z, 'purpur'),
    obsidian: (x, y, z) => putCube(x, y, z, 'obsidian'),
    end_stone_bricks: (x, y, z) => putCube(x, y, z, 'bricks'),
    magenta_stained_glass: (x, y, z) => putCube(x, y, z, 'glass'),
    purpur_pillar: (x, y, z, p) => putPillar(x, y, z, p.axis || 'y'),
    purpur_stairs: (x, y, z, p) => putStairs(x, y, z, p.half, p.shape, p.facing),
    purpur_slab: (x, y, z, p) => putSlab(x, y, z, p.type),
    ladder: (x, y, z, p) => putLadder(x, y, z, p.facing),
    end_rod: (x, y, z, p) => putRod(x, y, z, p.facing),
    chest: (x, y, z, p) => putChest(x, y, z, p.facing),
    brewing_stand: (x, y, z) => putBrewing(x, y, z),
    dragon_wall_head: (x, y, z) => { putDragonHead(x, y, z); putDragonEyes(x, y, z); },
  };
  let shipBlocks = 0;
  for (const yStr in LAYERS) {
    const y = +yStr, rows = LAYERS[yStr];
    for (let x = 0; x < rows.length; x++) {
      const row = rows[x];
      for (let z = 0; z < row.length; z++) {
        const ch = row[z];
        if (ch === '.') continue;
        const st = PAL[B64.indexOf(ch)];
        if (!st || st.n === 'structure_block' || st.n === 'air') continue;
        const fn = DISPATCH[st.n];
        if (fn) { fn(x, y, z, st.p || {}); shipBlocks++; }
      }
    }
  }
  /* склянки варочной стойки (has_bottle_0 и has_bottle_2) — на двух рычагах */
  {
    const bottleMat = new T.MeshLambertMaterial({ color: 0x8fd8cf, transparent: true, opacity: .8 });
    const bg = new T.BoxGeometry(.13, .19, .13);
    const bxp = 6, byp = 7, bzp = 25;                       /* блок варочной стойки */
    for (const [lx, lz] of [[12, 8], [4, 12]]) {            /* центры рычагов в пикселях блока */
      const m = new T.Mesh(bg, bottleMat);
      m.position.set(bxp + OX - .5 + lx / 16, byp + OY + .19, bzp + OZ - .5 + lz / 16);
      bufs.__bottles = bufs.__bottles || { meshes: [] };
      bufs.__bottles.meshes.push(m);
    }
  }

  /* ================= СБОРКА КОРАБЛЯ ================= */
  const shipG = new T.Group(); scene.add(shipG);            /* корень: покачивание */
  const hullG = new T.Group(); shipG.add(hullG);            /* корпус: подъём из бездны */
  for (const k in bufs) {
    const b = bufs[k];
    if (b.meshes) { for (const m of b.meshes) hullG.add(m); continue; }
    if (!b.n) continue;
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(b.pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(b.norm, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(b.uv, 2));
    g.setIndex(b.idx);
    const mesh = new T.Mesh(g, MAT[k]);
    if (k === 'glass' || k === 'ladder') mesh.renderOrder = 2;
    hullG.add(mesh);
  }
  hullG.position.y = -26;    /* до ритуала корабль ждёт в бездне под субъектом */

  /* =================================================================
   * СУБЪЕКТ — конструктор Стива (как в p2/p24/g3), стоит у мачты.
   * Смотрит на нос (север), спиной к корме — имплант виден с камеры.
   * ================================================================= */
  const defs = [{ name: 'body', size: [8, 12, 4], origin: [-4, 12, -2], pivot: [0, 0, 0], uv: [16, 16] }, { name: 'head', size: [8, 8, 8], origin: [-4, 0, -4], pivot: [0, 24, 0], uv: [0, 0] },
  { name: 'rightArm', size: [4, 12, 4], origin: [-2, -11, -2], pivot: [-6, 23, 0], uv: [40, 16] }, { name: 'leftArm', size: [4, 12, 4], origin: [-2, -11, -2], pivot: [6, 23, 0], uv: [32, 48] },
  { name: 'rightLeg', size: [4, 12, 4], origin: [-2, -12, -2], pivot: [-2, 12, 0], uv: [0, 16] }, { name: 'leftLeg', size: [4, 12, 4], origin: [-2, -12, -2], pivot: [2, 12, 0], uv: [16, 48] }];
  const order = ['east', 'west', 'up', 'down', 'south', 'north'];
  function geometry(d, TW, TH) {
    const [w, h, z] = d.size, [u, v] = d.uv;
    const rect = { east: [u, v + z, u + z, v + z + h], north: [u + z, v + z, u + z + w, v + z + h], west: [u + z + w, v, u + 2 * z + w, v + z + h], south: [u + 2 * z + w, v + z, u + 2 * z + 2 * w, v + z + h], up: [u + z, v, u + z + w, v + d.size[2]], down: [u + z + w, v, u + z + 2 * w, v + d.size[2]] };
    rect.up = [u + z, v, u + z + w, v + z]; rect.down = [u + z + w, v, u + z + 2 * w, v + z];
    const g = new T.BoxGeometry(w / 16, h / 16, z / 16), uv = g.attributes.uv;
    for (let f = 0; f < 6; f++) { const r = rect[order[f]]; for (let i = f * 4; i < f * 4 + 4; i++)uv.setXY(i, (r[0] + uv.getX(i) * (r[2] - r[0])) / TW, 1 - (r[3] - uv.getY(i) * (r[3] - r[1])) / TH); }
    g.translate(...d.origin.map((x, i) => (x + d.size[i] / 2) / 16)); return g;
  }
  const player = new T.Group(); player.position.set(.3, 0, 1.05); shipG.add(player);
  const skinMat = new T.MeshLambertMaterial({ map: texOf(A + 'mc/p2/entity_steve.png'), alphaTest: .2 });
  const parts = {}, partDefs = {};
  for (const d of defs) {
    const pivot = new T.Group(); pivot.position.set(...d.pivot.map(x => x / 16));
    pivot.add(new T.Mesh(geometry(d, 64, 64), skinMat));
    player.add(pivot); parts[d.name] = pivot; partDefs[d.name] = d;
  }

  /* ---- незеритовый сет: слои брони с настоящими текстурами ---- */
  const layer1 = new T.MeshLambertMaterial({ map: texOf(A + 'mc/van/netherite_layer_1.png'), alphaTest: .35, transparent: true });
  const layer2 = new T.MeshLambertMaterial({ map: texOf(A + 'mc/van/netherite_layer_2.png'), alphaTest: .35, transparent: true });
  const armorPart = (name, mat, inf, uv) => {
    const base = partDefs[name];
    const g = geometry({ size: base.size, origin: base.origin, uv }, 64, 32);
    const m = new T.Mesh(g, mat);
    m.scale.setScalar((base.size[0] + 2 * inf) / base.size[0]);
    return m;
  };
  const armorMeshes = {
    helmet: armorPart('head', layer1, 1.0, [0, 0]),
    chest: armorPart('body', layer1, 1.05, [16, 16]),
    leggingsBody: armorPart('body', layer2, .75, [16, 16]),
    leggingsLegs: armorPart('rightLeg', layer2, .75, [0, 16]),
    boots: armorPart('leftLeg', layer1, .95, [0, 16]),
  };
  armorMeshes.leggingsLegs2 = armorMeshes.leggingsLegs.clone(); armorMeshes.boots2 = armorMeshes.boots.clone();
  const attach = { helmet: 'head', chest: 'body', leggingsBody: 'body', leggingsLegs: 'rightLeg', leggingsLegs2: 'leftLeg', boots: 'rightLeg', boots2: 'leftLeg' };
  for (const k in armorMeshes) { armorMeshes[k].visible = false; parts[attach[k]].add(armorMeshes[k]); }

  /* ---- имплант: оригинальная модель мода (7 кубов), на спине ---- */
  const implantG = new T.Group();
  const impMat = new T.MeshLambertMaterial({ map: texOf(A + 'p29/sandevistan_armor.png'), alphaTest: .1 });
  const IMP_CUBES = [
    [[-0.7, 16, 1.5], [1.4, 7, 0.5], [12, 8]],
    [[-0.4, 23, 1.7], [0.8, 1.25, 0.3], [8, 6]],
    [[-0.6, 23.8, 1.8], [1.2, 0.55, 0.2], [10, 6]],
    [[-0.25, 15, 1.6], [0.5, 1, 0.3], [10, 6]],
    [[-1, 18.5, 1.7], [2, 0.7, 0.3], [2, 1]],
    [[-1, 21.2, 1.7], [2, 0.8, 0.3], [2, 1]],
    [[-1, 16.475, 1.7], [2, 0.7, 0.3], [1, 0]],
  ];
  const spineBone = new T.Group();
  spineBone.position.set(0, 19.5 / 16, 2 / 16);
  spineBone.rotation.y = Math.PI;
  for (const [o, sz, uv] of IMP_CUBES) {
    const [w, h, dd] = sz, [u, v] = uv;
    const g = new T.BoxGeometry(w / 16, h / 16, dd / 16);
    const rect = { east: [u, v + dd, u + dd, v + dd + h], north: [u + dd, v + dd, u + dd + w, v + dd + h], west: [u + dd + w, v, u + 2 * dd + w, v + dd + h], south: [u + 2 * dd + w, v + dd, u + 2 * dd + 2 * w, v + dd + h], up: [u + dd, v, u + dd + w, v + dd], down: [u + dd + w, v, u + dd + 2 * w, v + dd] };
    const uvA = g.attributes.uv;
    for (let f = 0; f < 6; f++) { const r = rect[order[f]]; for (let i = f * 4; i < f * 4 + 4; i++)uvA.setXY(i, (r[0] + uvA.getX(i) * (r[2] - r[0])) / 16, 1 - (r[3] - uvA.getY(i) * (r[3] - r[1])) / 16); }
    const m = new T.Mesh(g, impMat);
    m.position.set(-(o[0] + w / 2) / 16, (o[1] + h / 2) / 16, (o[2] + dd / 2) / 16);
    m.position.sub(new T.Vector3(0, 19.5 / 16, 2 / 16));
    spineBone.add(m);
  }
  implantG.add(spineBone);
  parts.body.add(implantG);
  implantG.visible = false;

  /* ---- сет брони в одну строку (перед субъектом, к носу) ---- */
  const itemPlane = (tex, w) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, w), new T.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: .1, side: T.DoubleSide }));
    return m;
  };
  const armorRowG = new T.Group();
  armorRowG.position.set(0, 1.55, -1.15); player.add(armorRowG);
  const rowDefs = [
    ['helmet', 'mc/van/item_netherite_helmet.png'],
    ['chest', 'mc/van/item_netherite_chestplate.png'],
    ['leggings', 'mc/van/item_netherite_leggings.png'],
    ['boots', 'mc/van/item_netherite_boots.png'],
  ];
  const rowItems = rowDefs.map(([k, p], i) => {
    const m = itemPlane(texOf(A + p), .62);
    m.position.x = (i - 1.5) * .78; m.userData.k = k; m.userData.x0 = m.position.x;
    armorRowG.add(m); return m;
  });

  /* ---- шприцы: по одному в каждую руку, прилетают сбоку ---- */
  const syrTex = texOf(A + 'p29/immunosuppressant.png');
  const syrL = itemPlane(syrTex, .5), syrR = itemPlane(syrTex, .5);
  syrL.position.set(0, -.62, .0); syrL.rotation.y = Math.PI / 2; parts.leftArm.add(syrL);
  syrR.position.set(0, -.62, .0); syrR.rotation.y = Math.PI / 2; parts.rightArm.add(syrR);
  syrL.visible = syrR.visible = false;

  /* =================================================================
   * ЭФФЕКТЫ: аура-кольца, ударные волны, лучи, искры, канал-луч,
   * звёзды бездны.
   * ================================================================= */
  const auraG = new T.Group(); player.add(auraG); auraG.position.y = 1.0;
  const ringMat = new T.MeshBasicMaterial({ color: 0x39e9da, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
  const auraRing = new T.Mesh(new T.TorusGeometry(1.15, .035, 8, 64), ringMat);
  auraRing.rotation.x = Math.PI / 2; auraG.add(auraRing);
  const burstRings = [];
  for (let i = 0; i < 3; i++) {
    const r = new T.Mesh(new T.TorusGeometry(1, .05, 8, 64), new T.MeshBasicMaterial({ color: i ? 0xeef638 : 0x39e9da, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    r.rotation.x = Math.PI / 2; r.userData.t = -1 - i * .18; auraG.add(r); burstRings.push(r);
  }
  const rays = [];
  for (let i = 0; i < 14; i++) {
    const rm = new T.Mesh(new T.PlaneGeometry(.09, 5.2), new T.MeshBasicMaterial({ color: i % 3 ? 0x39e9da : 0xeef638, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    const a = i / 14 * Math.PI * 2;
    rm.position.set(Math.cos(a) * 2.1, 2.2, Math.sin(a) * 2.1);
    rm.lookAt(0, .2, 0); rm.userData.a = a;
    auraG.add(rm); rays.push(rm);
  }
  /* канал нейро-связи: тонкий столб света над субъектом */
  const beam = new T.Mesh(
    new T.CylinderGeometry(.1, .16, 26, 12, 1, true),
    new T.MeshBasicMaterial({ color: 0x39e9da, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
  beam.position.set(0, 13, 0); player.add(beam);
  /* искры: спрайты с canvas-текстурой */
  const sparkTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(16, 16, 1, 16, 16, 15);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(.35, '#39e9dabb'); gr.addColorStop(1, '#39e9da00');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  })();
  const sparks = [];
  const spawnSpark = (col) => {
    const s = new T.Sprite(new T.SpriteMaterial({ map: sparkTex, color: col || 0xffffff, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    const a = Math.random() * Math.PI * 2, r = .3 + Math.random() * 1.1;
    s.position.set(Math.cos(a) * r, .2 + Math.random() * 2.4, Math.sin(a) * r);
    s.scale.setScalar(.06 + Math.random() * .1);
    s.userData = { vy: .5 + Math.random() * .9, t: 0 };
    player.add(s); sparks.push(s);
    if (sparks.length > 90) { const old = sparks.shift(); player.remove(old); }
  };
  /* звёзды бездны — фоновые точки Энда */
  const starTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 24;
    const g = c.getContext('2d'); g.fillStyle = '#fff';
    g.fillRect(10, 4, 4, 16); g.fillRect(4, 10, 16, 4);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  })();
  const starSprites = [];
  for (let i = 0; i < 130; i++) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: starTex, color: 0xcfd8ff, transparent: true, opacity: .25 + Math.random() * .5, depthWrite: false }));
    s.position.set((Math.random() - .5) * 52, -14 + Math.random() * 34, (Math.random() - .5) * 52);
    s.scale.setScalar(.1 + Math.random() * .22);
    s.userData.ph = Math.random() * Math.PI * 2;
    scene.add(s); starSprites.push(s);
  }

  /* =================================================================
   * КАМЕРА-РЕЖИССЁР. План = сплайн Катмулла-Рома для позиции и для
   * взгляда; движение по плану — smoothstep, смена планов —
   * экспоненциальное демпфирование (никаких скачков).
   * ================================================================= */
  const ease = (x) => x < 0 ? 0 : x > 1 ? 1 : 1 - Math.pow(1 - x, 3);
  const smooth = (t) => t * t * (3 - 2 * t);
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  const spline = (pts) => new T.CatmullRomCurve3(pts, false, 'centripetal', .5);
  const SX = .3, SZ = 1.05;    /* субъект (у мачты) */
  const camPos = V3(SX + 7, 2.1, SZ + 7), camLook = V3(SX, 1.25, SZ);
  let fovCur = 42, yaw = .65, pitch = .28;

  /* планы-сплайны по битам (позиции в мире; корабль: нос −Z, корма +Z) */
  const SHOTS = {
    armor: {
      dur: 4.4,
      path: spline([V3(SX + 2.4, 2.05, SZ + 2.8), V3(SX + 3.6, 2.6, SZ + 4.6), V3(SX + 5.0, 2.1, SZ + 6.8)]),
      look: spline([V3(SX, 1.75, SZ - .1), V3(SX, 1.5, SZ), V3(SX, 1.1, SZ + .2)]),
      fov: 40,
    },
    void: {
      dur: 4.55,
      path: spline([
        V3(SX + 1.2, 5.2, SZ + 1.2),      /* сверху: корабль ещё в бездне */
        V3(SX + 6.8, 2.0, SZ + 5.0),      /* правый борт: корпус идёт вверх */
        V3(SX + 8.6, 1.1, SZ - 3.5),      /* низкий проход вдоль борта */
        V3(SX + 5.2, .2, SZ - 11.5),      /* под носом, взгляд вверх */
        V3(SX - 1.8, 1.8, SZ - 16.5),     /* огибаем нос — голова дракона */
        V3(SX - 6.8, 3.9, SZ - 12.0),     /* левый борт, широкий план */
      ]),
      look: spline([V3(SX, 1.4, SZ), V3(SX + .5, .2, SZ - 7), V3(0, -1.7, -14), V3(SX, 1.2, SZ - 1), V3(SX, 1.4, SZ)]),
      fov: 47,
    },
    syr: {
      dur: 4.4,
      path: spline([V3(SX + 1.9, 2.3, SZ + 2.5), V3(SX + 1.15, 1.75, SZ + 1.75)]),
      look: spline([V3(SX, 1.35, SZ - .15), V3(SX, 1.15, SZ + .05)]),
      fov: 38,
    },
    installed: {
      dur: 2.6,
      path: spline([V3(SX + .85, 2.55, SZ + 3.3), V3(SX + .6, 2.2, SZ + 2.75)]),
      look: spline([V3(SX, 1.5, SZ), V3(0, .3, -14)]),
      fov: 36,
    },
  };
  let finaleA0 = null;   /* азимут старта орбиты финала — для непрерывности */

  /* текущий план бита: возвращает {p, l, f} */
  const tmpP = new T.Vector3(), tmpL = new T.Vector3();
  function shotFor(beat, bt, installed, installedT, sec) {
    if (beat === 'armor' && SHOTS.armor) {
      const u = smooth(Math.min(1, bt / SHOTS.armor.dur));
      return { p: SHOTS.armor.path.getPoint(u), l: SHOTS.armor.look.getPoint(u), f: 40 };
    }
    if (beat === 'void') {
      const u = smooth(Math.min(1, bt / SHOTS.void.dur));
      return { p: SHOTS.void.path.getPoint(u), l: SHOTS.void.look.getPoint(u), f: 47 };
    }
    if (beat === 'syr') {
      const u = smooth(Math.min(1, bt / SHOTS.syr.dur));
      return { p: SHOTS.syr.path.getPoint(u), l: SHOTS.syr.look.getPoint(u), f: 38 };
    }
    if (installed) {
      const t = installedT;
      if (t < 2.3) {
        const u = smooth(Math.min(1, t / SHOTS.installed.dur));
        return { p: SHOTS.installed.path.getPoint(u), l: SHOTS.installed.look.getPoint(u), f: 36 };
      }
      /* после удара — медленный отход в орбиту покоя */
      const k = smooth(Math.min(1, (t - 2.3) / 2.4));
      const a = 2.62 + sec * .045, r = 8.8;
      const wide = V3(SX + Math.sin(a) * r, 3.4, SZ + Math.cos(a) * r);
      const close = SHOTS.installed.path.getPoint(1);
      return { p: close.clone().lerp(wide, k), l: V3(SX, 1.5 - k * .4, SZ).lerp(V3(0, .5, -10), k * .55), f: 36 + k * 8 };
    }
    if (beat === 'finale') {
      const a0 = finaleA0 === null ? 0 : finaleA0;
      const a = a0 + bt * .5, r = 5.8 - Math.min(bt, 6) * .2;
      return { p: V3(SX + Math.sin(a) * r, 2.45 - Math.min(bt, 6) * .12, SZ + Math.cos(a) * r), l: V3(SX, 1.3, SZ), f: 44 };
    }
    /* idle / done: орбита покоя (плюс драг пользователя) */
    const a = yaw + sec * .05, r = beat === 'done' ? 8.8 : 7.2;
    return {
      p: V3(SX + Math.sin(a) * Math.cos(pitch) * r, (beat === 'done' ? 3.1 : 2.1) + Math.sin(pitch) * 4.2, SZ + Math.cos(a) * Math.cos(pitch) * r),
      l: V3(SX, 1.25, SZ), f: 42,
    };
  }

  /* =================================================================
   * ХОРЕОГРАФИЯ. Состояния битов, надевание брони, подъём корабля,
   * шприцы, канал, установка.
   * ================================================================= */
  let beat = 'idle', beatT = 0, installed = false, installedAt = 0, equipped = { helmet: 0, chest: 0, leggings: 0, boots: 0 };
  let syrIn = 0, converge = 0, chestDissolve = 0, camBehind = 0, riseX = 0, deckArrived = false, nowSec = 0;

  const setEquip = (k, v) => {
    equipped[k] = v;
    const on = v > 0;
    if (k === 'helmet') armorMeshes.helmet.visible = on;
    if (k === 'chest') armorMeshes.chest.visible = on;
    if (k === 'leggings') { armorMeshes.leggingsBody.visible = armorMeshes.leggingsLegs.visible = armorMeshes.leggingsLegs2.visible = on; }
    if (k === 'boots') { armorMeshes.boots.visible = armorMeshes.boots2.visible = on; }
  };

  const flashImplant = () => {
    installed = true;
    armorMeshes.chest.visible = false;
    implantG.visible = true;
    implantG.scale.setScalar(.01);
    burstRings.forEach(r => r.userData.t = 0);
    rays.forEach(r => r.userData.on = 1);
    auraLight.intensity = 9;
    for (let i = 0; i < 40; i++) spawnSpark(i % 2 ? 0x39e9da : 0xeef638);
  };
  const resetScene = () => {
    installed = false; chestDissolve = 0; converge = 0; camBehind = 0; syrIn = 0; riseX = 0; deckArrived = false;
    finaleA0 = null; installedAt = 0;
    implantG.visible = false; implantG.scale.setScalar(1);
    for (const k in equipped) setEquip(k, 0);
    armorRowG.visible = true;
    rowItems.forEach(m => { m.visible = true; m.scale.setScalar(1); m.material.opacity = 1; m.position.set(m.userData.x0, 0, 0); });
    syrL.visible = syrR.visible = false;
    burstRings.forEach(r => { r.userData.t = -1; r.material.opacity = 0; });
    rays.forEach(r => { r.userData.on = 0; r.material.opacity = 0; });
    auraRing.material.opacity = 0;
    auraLight.intensity = 0;
    beam.material.opacity = 0;
    hullG.position.y = -26;
    hullG.rotation.set(0, 0, 0);
  };

  /* события модели app.js (механики — там) */
  window.P29 && (window.P29.scene = {
    event(e) {
      if (e.type === 'installed') { flashImplant(); installedAt = nowSec; }
      if (e.type === 'ritualStart') { resetScene(); }
    },
  });
  window.__ritualDebug = () => ({ cam: [camera.position.x, camera.position.y, camera.position.z], look: [camLook.x, camLook.y, camLook.z], hull: hullG.position.y, riseX, beat, installed, iT: installed ? nowSec - installedAt : -1, fov: camera.fov });

  /* орбита доступна в покое и в финале; в катсцене камера сама */
  cv.addEventListener('pointerdown', e => { if (beat === 'idle' || beat === 'done') { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; try { cv.setPointerCapture(e.pointerId); } catch (_) { } } });
  cv.addEventListener('pointermove', e => { if (drag) { yaw = drag.yaw + (e.clientX - drag.x) * .007; pitch = Math.max(.05, Math.min(1.1, drag.pitch + (e.clientY - drag.y) * .004)); } });
  for (const n of ['pointerup', 'pointercancel', 'lostpointercapture']) cv.addEventListener(n, () => (drag = null));
  let drag = null;

  let seen = false, last = 0;
  new IntersectionObserver(es => seen = es[0].isIntersecting, { rootMargin: '70px' }).observe(cv);

  stage.classList.add('ready3d');
  (function frame(t) {
    requestAnimationFrame(frame);
    if (!seen || document.hidden || !cv.clientWidth) return;
    const dt = Math.min(.05, (t - last) / 1000) || .016; last = t;
    const sec = t / 1000; nowSec = sec;
    /* какой сейчас бит театра */
    const b = stage.dataset.beat || 'idle';
    if (b !== beat) { beat = b; beatT = sec; finaleA0 = null; }
    const bt = sec - beatT;
    const P29 = window.P29, st = P29 && P29.model ? P29.model.state : null;

    /* — armor: сет в одну строку → предметы по очереди прилетают на субъект — */
    if (beat === 'armor') {
      armorRowG.rotation.y = Math.sin(sec * 1.1) * .1;
      rowItems.forEach((m, i) => { if (!m.visible) return; m.position.y = Math.sin(sec * 2 + i) * .05; });
      const orderK = ['helmet', 'chest', 'leggings', 'boots'];
      orderK.forEach((k, i) => {
        const t0 = .55 + i * .8, x = ease((bt - t0) / .65);
        if (x > 0) {
          const m = rowItems[i];
          m.position.x = m.userData.x0 * (1 - x);
          m.position.z = x * 1.15;                    /* от ряда (у носа) — в тело субъекта */
          m.scale.setScalar(1 - x * .85); m.material.opacity = 1 - x;
          if (x >= 1 && !equipped[k]) { m.visible = false; setEquip(k, 1); auraLight.intensity = Math.max(auraLight.intensity, 2.2); }
        }
      });
    }

    /* — void: настоящий корабль поднимается из бездны, субъект на палубе — */
    if (beat === 'void') {
      riseX = ease(Math.min(1, bt / 3.6));
      const stream = riseX > .05 && riseX < 1 ? riseX : 0;
      starSprites.forEach(s => s.position.y -= dt * 2.6 * stream);
      if (riseX >= 1 && !deckArrived) {
        deckArrived = true;
        for (let i = 0; i < 22; i++) spawnSpark(i % 2 ? 0x39e9da : 0xb9a6ff);
      }
    } else if (beat === 'syr' || beat === 'finale' || beat === 'done') {
      riseX = 1;   /* после бездны корабль остаётся на палубе */
    }
    const bob = riseX >= 1 ? Math.sin(sec * .5) * .06 : 0;
    const hullTarget = riseX >= 1 ? 0 : -26 * (1 - riseX);
    hullG.position.y += (hullTarget - hullG.position.y) * Math.min(1, dt * 5);
    shipG.position.y = bob;
    shipG.rotation.z = riseX >= 1 ? Math.sin(sec * .5) * .012 : 0;
    shipG.rotation.x = riseX >= 1 ? Math.cos(sec * .37) * .008 : 0;

    /* — syr: по шприцу в каждую руку, медленно — */
    if (beat === 'syr') syrIn = Math.min(1, syrIn + dt / 1.6);
    const armRaise = -1.95 * syrIn;
    parts.leftArm.rotation.x += (armRaise - parts.leftArm.rotation.x) * Math.min(1, dt * 4);
    parts.rightArm.rotation.x += (armRaise - parts.rightArm.rotation.x) * Math.min(1, dt * 4);
    syrL.visible = syrR.visible = syrIn > .35;

    /* — finale: канал 100 тиков, имплант на 99-м — */
    if (st && st.inCutscene && st.cutsceneTicks !== undefined) {
      converge = Math.min(1, st.cutsceneTicks / 99);
      const n = Math.random() < converge * .9 ? 2 : 1;
      for (let i = 0; i < n; i++) spawnSpark(0x39e9da);
    }
    beam.material.opacity += ((st && st.inCutscene ? converge * .3 : 0) - beam.material.opacity) * Math.min(1, dt * 4);
    beam.rotation.y = sec * .8;
    if (installed && chestDissolve < 1) chestDissolve = Math.min(1, chestDissolve + dt * 1.4);
    if (installed) {
      implantG.scale.setScalar(Math.min(1, implantG.scale.x + dt * 2.2));
      camBehind = Math.min(1, camBehind + dt * .5);
      auraLight.intensity += ((2.7 + Math.sin(sec * 6) * 1.0) - auraLight.intensity) * Math.min(1, dt * 3);
      if (Math.random() < .35) spawnSpark(Math.random() < .5 ? 0x39e9da : 0xeef638);
    }
    /* если имплант уже стоял при загрузке — сразу эпический кадр */
    if (!installed && st && st.chest === 'sandevistan' && (beat === 'idle' || beat === 'done') && bt > .1 && !implantG.visible && syrIn === 0 && !equipped.chest) {
      setEquip('helmet', 1); setEquip('leggings', 1); setEquip('boots', 1);
      armorRowG.visible = false; riseX = 1; deckArrived = true; hullG.position.y = 0; flashImplant(); installedAt = nowSec - 3;
    }

    /* дыхание, звёзды, искры */
    parts.body.scale.y = 1 + Math.sin(sec * 1.8) * .012;
    starSprites.forEach(s => { s.material.opacity = .22 + .3 * (0.5 + 0.5 * Math.sin(sec * 1.7 + s.userData.ph)); });
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i]; s.userData.t += dt;
      s.position.y += s.userData.vy * dt;
      s.material.opacity = Math.max(0, 1 - s.userData.t / 1.3);
      if (s.userData.t > 1.3) { player.remove(s); sparks.splice(i, 1); }
    }
    /* аура */
    auraRing.material.opacity += ((installed ? .5 + Math.sin(sec * 5) * .2 : converge * .35) - auraRing.material.opacity) * Math.min(1, dt * 4);
    auraRing.scale.setScalar(1 + Math.sin(sec * 2.2) * .05 + converge * .25);
    auraRing.rotation.z = sec * .6;
    burstRings.forEach(r => {
      if (r.userData.t >= 0 && r.userData.t < 1.2) {
        r.userData.t += dt * 1.1;
        const x = r.userData.t / 1.2;
        r.scale.setScalar(.4 + x * 3.2); r.material.opacity = .85 * (1 - x);
      } else r.material.opacity = 0;
    });
    rays.forEach((r, i) => {
      const target = installed ? .16 + .1 * Math.sin(sec * 3 + i) : 0;
      r.material.opacity += (target - r.material.opacity) * Math.min(1, dt * 3);
      const a = r.userData.a + sec * .25;
      r.position.set(Math.cos(a) * 2.1, 2.2, Math.sin(a) * 2.1);
    });

    /* — КАМЕРА: план бита → демпфированное следование (ровные пролёты) — */
    const installedT = installed ? Math.max(0, nowSec - installedAt) : 0;
    const shot = shotFor(beat, bt, installed, installedT, sec);
    const kP = 1 - Math.exp(-dt * 4.2), kL = 1 - Math.exp(-dt * 4.6);
    tmpP.copy(shot.p); tmpL.copy(shot.l);
    camPos.lerp(tmpP, kP);
    camLook.lerp(tmpL, kL);
    camera.position.copy(camPos); camera.lookAt(camLook);
    fovCur += (shot.f - fovCur) * Math.min(1, dt * 2.2);
    if (Math.abs(camera.fov - fovCur) > .01) { camera.fov = fovCur; camera.updateProjectionMatrix(); }

    /* аза финала стартует с текущего азимута камеры — без скачка */
    if (beat === 'finale' && finaleA0 === null)
      finaleA0 = Math.atan2(camPos.x - SX, camPos.z - SZ);

    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * DPR) || cv.height !== Math.round(h * DPR)) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    renderer.render(scene, camera);
  })(0);
} catch (e) { /* ритуал остаётся на DOM-хореографии */ console.warn('Ритуал 3D недоступен:', e && e.message); }
