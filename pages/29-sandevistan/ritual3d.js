/* №29 · Ритуал установки Сандевистана — 3D-катсцена на three.js.
 * КОРАБЛЬ ЭНДА собран из настоящих блоков (пурпур, обсидиан, энд-роды)
 * с ванильными текстурами. СУБЪЕКТ — гуманоид со скином Стива (тот же
 * конструктор, что в p2/p24/g3). Незеритовый сет — слои брони с
 * настоящими текстурами netherite_layer_1/2. Имплант — оригинальная
 * модель мода (7 кубов из geo-файла, текстура sandevistan_armor).
 * Хореография бьётся по битам театра app.js (armor → void → syr →
 * finale → done): сет брони в одну строку → надевается → корабль
 * поднимается снизу → по шприцу в каждую руку → канал 100 тиков →
 * имплант на 99-м заменяет нагрудник → пролёт камеры за спину и
 * аура. Механики остаются в app.js, тут только картинка. */
import * as T from '../../shared/vendor/three/three.module.js';

const stage = document.querySelector('#ritualStage'), cv = document.querySelector('#ritual3d');
try {
  if (!stage || !cv) throw Error('нет сцены');
  if (!document.createElement('canvas').getContext('webgl2')) throw Error('WebGL2 недоступен');
  const DPR = Math.min(devicePixelRatio || 1, 1.5);
  const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(DPR);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(42, 1, .1, 120);

  /* ---- свет: холод Энда + тёплый прожектор на субъекта ---- */
  scene.add(new T.HemisphereLight(0xcfd8ff, 0x1a0e26, 1.05));
  const key = new T.DirectionalLight(0xffffff, .85); key.position.set(3, 6, 4); scene.add(key);
  const rim = new T.DirectionalLight(0x7a5cff, .5); rim.position.set(-4, 3, -5); scene.add(rim);
  const auraLight = new T.PointLight(0x39e9da, 0, 14); auraLight.position.set(0, 2.2, .8); scene.add(auraLight);

  const loader = new T.TextureLoader();
  const texOf = (p) => { const t = loader.load(p); t.colorSpace = T.SRGBColorSpace; t.magFilter = T.NearestFilter; t.minFilter = T.NearestMipmapNearestFilter; return t; };
  const A = '../../assets/textures/';

  /* ===================== КОРАБЛЬ ЭНДА =====================
   * Пурпуровый корпус с обсидиановой палубой, мачта-пилон с
   * энд-rodами и темened носом: силуэт галеры города Энда. */
  const shipG = new T.Group(); scene.add(shipG);
  const matPurpur = new T.MeshLambertMaterial({ map: texOf(A + 'mc/van/purpur_block.png') });
  const matPillar = new T.MeshLambertMaterial({ map: texOf(A + 'mc/van/purpur_pillar.png') });
  const matObs = new T.MeshLambertMaterial({ map: texOf(A + 'mc/van/obsidian.png') });
  const matRod = new T.MeshBasicMaterial({ map: texOf(A + 'mc/van/end_rod.png') });
  const matEye = new T.MeshBasicMaterial({ color: 0xd36bff });
  const block = (mat, x, y, z, w = 1, h = 1, d = 1) => {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); shipG.add(m); return m;
  };
  const DECK = 2;
  /* корпус: центральная секция + сужение к носу и корме */
  block(matPurpur, 0, 1, -.5, 3, 2, 7);
  block(matPurpur, 0, .8, -4, 2, 1.6, 1.4);          /* нос */
  block(matPurpur, 0, 1.1, -4.9, 1, 1.1, 1);
  block(matPurpur, 0, .8, 3.6, 2.6, 1.6, 1.2);       /* корма */
  block(matPurpur, 0, 2.5, 3.3, 3, 1, 1.9);          /* кормовая надстройка */
  block(matPurpur, 0, 3.3, 3.3, 3, .6, 1.9);
  block(matObs, 0, DECK + .02, -.5, 3, .16, 6.6);    /* обсидиановая палуба */
  block(matObs, 0, DECK + .02, 3.3, 2.6, .16, 1.7);
  /* бортовые обсидиановые кромки */
  block(matObs, -1.52, 1.6, -.5, .12, .3, 6.6); block(matObs, 1.52, 1.6, -.5, .12, .3, 6.6);
  /* мачта-пилон с перекладиной и энд-родами */
  block(matPillar, 0, DECK + 2, -1.6, 1, 4, 1);
  block(matPillar, 0, DECK + 3.6, -1.6, 3.4, 1, 1);
  const rod = (x, y, z, h = 1.1) => { const r = new T.Mesh(new T.BoxGeometry(.14, h, .14), matRod); r.position.set(x, y, z); shipG.add(r); return r; };
  rod(-1.62, DECK + 4.5, -1.6); rod(1.62, DECK + 4.5, -1.6); rod(0, DECK + 4.6, -1.6, 1.6);
  /* нос: тёмная «голова» с пурпуровыми глазами дракона */
  const headG = new T.Group(); headG.position.set(0, 1.9, -5.1); shipG.add(headG);
  const hm = (w, h, d, x, y, z, mat) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat || matObs); m.position.set(x, y, z); headG.add(m); return m; };
  hm(1.6, 1.5, 1.9, 0, 0, 0); hm(1.1, .8, 1, 0, -.25, -1.3);
  hm(.4, .4, .5, -.55, .8, .35, matPurpur); hm(.4, .4, .5, .55, .8, .35, matPurpur);
  hm(.16, .16, .1, -.5, .25, -.98, matEye); hm(.16, .16, .1, .5, .25, -.98, matEye);
  hm(.3, .9, .3, -.8, 1, .5, matPurpur); hm(.3, .9, .3, .8, 1, .5, matPurpur);
  shipG.position.y = -9.5;   /* до ритуала корабль ждёт в бездне */

  /* ===================== СУБЪЕКТ ===================== */
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
  const player = new T.Group(); player.position.set(0, DECK + .1, .4); player.rotation.y = Math.PI; shipG.add(player);
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
    m.scale.setScalar((base.size[0] + 2 * inf) / base.size[0]);   /* inflate по всем осям */
    return m;
  };
  /* UV слоёв брони (64×32): шлем (0,0), тело (16,16), руки (40,16), ноги (0,16) */
  const armorMeshes = {
    helmet: armorPart('head', layer1, 1.0, [0, 0]),
    chest: armorPart('body', layer1, 1.05, [16, 16]),
    leggingsBody: armorPart('body', layer2, .75, [16, 16]),
    leggingsLegs: armorPart('rightLeg', layer2, .75, [0, 16]),
    boots: armorPart('leftLeg', layer1, .95, [0, 16]),
  };
  /* зеркалим вторую ногу/руку, где нужно */
  armorMeshes.leggingsLegs2 = armorMeshes.leggingsLegs.clone(); armorMeshes.boots2 = armorMeshes.boots.clone();
  const attach = { helmet: 'head', chest: 'body', leggingsBody: 'body', leggingsLegs: 'rightLeg', leggingsLegs2: 'leftLeg', boots: 'rightLeg', boots2: 'leftLeg' };
  for (const k in armorMeshes) { armorMeshes[k].visible = false; parts[attach[k]].add(armorMeshes[k]); }

  /* ---- имплант: оригинальная модель мода (7 кубов, текстура 16×16).
   * Кость spine_implant: pivot [0,19.5,2], поворот 180° — на спине. ---- */
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

  /* ---- сет брони в одну строку (как на игроке) ---- */
  const itemPlane = (tex, w) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, w), new T.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: .1, side: T.DoubleSide }));
    return m;
  };
  const armorRowG = new T.Group();
  armorRowG.position.set(0, 1.55, 1.15); player.add(armorRowG);
  const rowDefs = [
    ['helmet', 'mc/van/item_netherite_helmet.png'],
    ['chest', 'mc/van/item_netherite_chestplate.png'],
    ['leggings', 'mc/van/item_netherite_leggings.png'],
    ['boots', 'mc/van/item_netherite_boots.png'],
  ];
  const rowItems = rowDefs.map(([k, p], i) => {
    const m = itemPlane(texOf(A + p), .62);
    m.position.x = (i - 1.5) * .78; m.userData.k = k;
    armorRowG.add(m); return m;
  });

  /* ---- шприцы: по одному в каждую руку ---- */
  const syrTex = texOf(A + 'p29/immunosuppressant.png');
  const syrL = itemPlane(syrTex, .5), syrR = itemPlane(syrTex, .5);
  syrL.position.set(0, -.62, .0); syrL.rotation.y = Math.PI / 2; parts.leftArm.add(syrL);
  syrR.position.set(0, -.62, .0); syrR.rotation.y = Math.PI / 2; parts.rightArm.add(syrR);
  syrL.visible = syrR.visible = false;

  /* ---- аура: кольца, лучи, искры (аниме-вспышка) ---- */
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
  for (let i = 0; i < 60; i++) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: starTex, color: 0xcfd8ff, transparent: true, opacity: .25 + Math.random() * .5, depthWrite: false }));
    s.position.set((Math.random() - .5) * 46, -8 + Math.random() * 26, (Math.random() - .5) * 46);
    s.scale.setScalar(.1 + Math.random() * .22);
    s.userData.ph = Math.random() * Math.PI * 2;
    scene.add(s); starSprites.push(s);
  }

  /* ===================== ХОРЕОГРАФИЯ ===================== */
  const ease = (x) => x < 0 ? 0 : x > 1 ? 1 : 1 - Math.pow(1 - x, 3);
  let beat = 'idle', beatT = 0, installed = false, equipped = { helmet: 0, chest: 0, leggings: 0, boots: 0 };
  let syrIn = 0, converge = 0, camBehind = 0, chestDissolve = 0;
  let camPos = new T.Vector3(0, 3.4, 11.5), camLook = new T.Vector3(0, 1.2, 0);
  let drag = null, yaw = .12, pitch = .3;

  const setEquip = (k, v) => {
    equipped[k] = v;
    const on = v > 0;
    if (k === 'helmet') armorMeshes.helmet.visible = on;
    if (k === 'chest') armorMeshes.chest.visible = on;
    if (k === 'leggings') { armorMeshes.leggingsBody.visible = armorMeshes.leggingsLegs.visible = armorMeshes.leggingsLegs2.visible = on; }
    if (k === 'boots') armorMeshes.boots.visible = armorMeshes.boots2.visible = on;
  };

  const flashImplant = () => {
    installed = true;
    armorMeshes.chest.visible = false;
    implantG.visible = true;
    implantG.scale.setScalar(.01);
    burstRings.forEach(r => r.userData.t = 0);
    rays.forEach(r => r.userData.on = 1);
    auraLight.intensity = 3;
    for (let i = 0; i < 40; i++) spawnSpark(i % 2 ? 0x39e9da : 0xeef638);
  };
  const resetScene = () => {
    installed = false; chestDissolve = 0; converge = 0; camBehind = 0; syrIn = 0;
    implantG.visible = false; implantG.scale.setScalar(1);
    for (const k in equipped) setEquip(k, 0);
    armorRowG.visible = true; rowItems.forEach(m => { m.visible = true; m.scale.setScalar(1); m.material.opacity = 1; });
    syrL.visible = syrR.visible = false;
    burstRings.forEach(r => { r.userData.t = -1; r.material.opacity = 0; });
    rays.forEach(r => { r.userData.on = 0; r.material.opacity = 0; });
    auraRing.material.opacity = 0;
    auraLight.intensity = 0;
    shipG.position.y = -9.5;
  };

  /* события модели app.js (механики — там) */
  window.P29 && (window.P29.scene = {
    event(e) {
      if (e.type === 'installed') flashImplant();
      if (e.type === 'ritualStart') { resetScene(); }
    },
  });

  /* орбита доступна в покое; в катсцене камера сама */
  cv.addEventListener('pointerdown', e => { if (beat === 'idle' || beat === 'done') { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; try { cv.setPointerCapture(e.pointerId); } catch (_) { } } });
  cv.addEventListener('pointermove', e => { if (drag) { yaw = drag.yaw + (e.clientX - drag.x) * .007; pitch = Math.max(.05, Math.min(1.1, drag.pitch + (e.clientY - drag.y) * .004)); } });
  for (const n of ['pointerup', 'pointercancel', 'lostpointercapture']) cv.addEventListener(n, () => (drag = null));

  let seen = false, last = 0;
  new IntersectionObserver(es => seen = es[0].isIntersecting, { rootMargin: '70px' }).observe(cv);

  stage.classList.add('ready3d');
  (function frame(t) {
    requestAnimationFrame(frame);
    if (!seen || document.hidden || !cv.clientWidth) return;
    const dt = Math.min(.05, (t - last) / 1000) || .016; last = t;
    const sec = t / 1000;
    /* какой сейчас бит театра */
    const b = stage.dataset.beat || 'idle';
    if (b !== beat) { beat = b; beatT = sec; }
    const bt = sec - beatT;
    const P29 = window.P29, st = P29 && P29.model ? P29.model.state : null;

    /* — armor: сет в одну строку → предметы по очереди прилетают на субъект — */
    if (beat === 'armor') {
      armorRowG.rotation.y = Math.sin(sec * 1.1) * .1;
      rowItems.forEach((m, i) => { if (!m.visible) return; m.position.y = Math.sin(sec * 2 + i) * .05; });
      const orderK = ['helmet', 'chest', 'leggings', 'boots'];
      orderK.forEach((k, i) => {
        const t0 = .8 + i * .85, x = ease((bt - t0) / .7);
        if (x > 0) {
          const m = rowItems[i];
          m.position.lerp(new T.Vector3(m.position.x * (1 - x), .0, -x * .8), 1);
          m.scale.setScalar(1 - x * .85); m.material.opacity = 1 - x;
          if (x >= 1 && !equipped[k]) { m.visible = false; setEquip(k, 1); auraLight.intensity = Math.max(auraLight.intensity, .7); }
        }
      });
    }
    /* — void: корабль поднимается снизу вверх, субъект на палубе — */
    if (beat === 'void') {
      const x = ease(bt / 3.2);
      shipG.position.y = -9.5 + x * 9.5;
      starSprites.forEach(s => s.position.y -= dt * 2.4 * x);
    } else if (beat !== 'idle' || installed) {
      shipG.position.y += (0 - shipG.position.y) * Math.min(1, dt * 2);
    }
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
    if (installed && chestDissolve < 1) chestDissolve = Math.min(1, chestDissolve + dt * 1.4);
    if (installed) {
      implantG.scale.setScalar(Math.min(1, implantG.scale.x + dt * 2.2));
      camBehind = Math.min(1, camBehind + dt * .5);
      auraLight.intensity += ((.9 + Math.sin(sec * 6) * .35) - auraLight.intensity) * Math.min(1, dt * 3);
      if (Math.random() < .35) spawnSpark(Math.random() < .5 ? 0x39e9da : 0xeef638);
    }
    /* если имплант уже стоял при загрузке — сразу эпический кадр */
    if (!installed && st && st.chest === 'sandevistan' && beat === 'idle' && bt > .1 && !implantG.visible && syrIn === 0 && !equipped.chest) {
      setEquip('helmet', 1); setEquip('leggings', 1); setEquip('boots', 1);
      armorRowG.visible = false; shipG.position.y = 0; flashImplant();
    }

    /* дыхание, дыхание палубы, звёзды */
    parts.body.scale.y = 1 + Math.sin(sec * 1.8) * .012;
    shipG.rotation.z = Math.sin(sec * .5) * .012;
    shipG.rotation.x = Math.cos(sec * .37) * .008;
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

    /* — камера — */
    let px, py, pz, lx, ly, lz;
    if (beat === 'armor') { px = 2.6; py = 2.5; pz = 5.2; lx = 0; ly = 1.35; lz = .6; }
    else if (beat === 'void') { const x = ease(bt / 3.2); px = 7.5; py = -6.5 + x * 8.5; pz = 8.5; lx = 0; ly = shipG.position.y + 1.4; lz = 0; }
    else if (beat === 'syr') { px = 1.1; py = 2.0; pz = 3.6; lx = 0; ly = 1.55; lz = .5; }
    else if (beat === 'finale' && !installed) { const a = .3 + bt * .12; px = Math.sin(a) * 5.4; py = 2.4; pz = Math.cos(a) * 5.4; lx = 0; ly = 1.5; lz = .4; }
    else if (installed) { /* пролёт за спину */
      const x = ease(camBehind);
      px = 0 + (1 - x) * 1.5; py = 2.6 - x * .55; pz = (1 - x) * 4.6 + x * -2.35; lx = 0; ly = 1.7 - x * .25; lz = .4 + x * 1.6;
    } else { const a = yaw + sec * .07; const r = 10.5; px = Math.sin(a) * Math.cos(pitch) * r; py = shipG.position.y + 2.2 + Math.sin(pitch) * 4.5; pz = Math.cos(a) * Math.cos(pitch) * r; lx = 0; ly = shipG.position.y + 1.5; lz = 0; }
    const k = Math.min(1, dt * (beat === 'void' ? 6 : 3.2));
    camPos.lerp(new T.Vector3(px, py, pz), k);
    camLook.lerp(new T.Vector3(lx, ly, lz), k);
    camera.position.copy(camPos); camera.lookAt(camLook);

    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * DPR) || cv.height !== Math.round(h * DPR)) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    renderer.render(scene, camera);
  })(0);
} catch (e) { /* ритуал остаётся на DOM-хореографии */ console.warn('Ритуал 3D недоступен:', e && e.message); }
