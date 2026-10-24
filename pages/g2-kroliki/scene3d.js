/* Г-К · Кролики в 3D — фабрика сцен на three.js.
 * Кролики собраны из ванильной геометрии rabbit.geo (боксы с UV как
 * в игре) и окрашены классическими текстурами rabbit_brown /
 * rabbit_white (64×32). Две сцены из одного конструктора:
 *   1) hero #hop3d — ночной портрет пары (крути мышью);
 *   2) СТЕНД #simCanvas — сам симулятор размножения теперь тоже 3D:
 *      поле 16×9, изгородь, подписи фаз поверх канваса. Без WebGL
 *      стенд откатывается на прежний 2D-рисунок.
 * Состояние S приходит из app.js через window.__g2sim3d(S) на каждом
 * кадре — механики (прыжки, сердца, «паровозик» 0.45, отлёт на 2
 * блока, XRot 180°, детёныш) остаются в app.js, тут только картинка. */
import * as T from '../../shared/vendor/three/three.module.js';
import { MODELS } from '../../shared/entity_models.js';

const DPR = Math.min(devicePixelRatio || 1, 1.5);
const webgl2 = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } })();

/* ---- ванильный кролик из geo-боксов с UV ---- */
const [TW, TH] = MODELS.rabbit.tex;
const loader = new T.TextureLoader();
function boxUV(geo, uv, size) {
  const [w, h, d] = size, [u, v] = uv;
  const rect = {
    east: [u, v + d, u + d, v + d + h], north: [u + d, v + d, u + d + w, v + d + h],
    west: [u + d + w, v, u + 2 * d + w, v + d + h], south: [u + 2 * d + w, v + d, u + 2 * d + 2 * w, v + d + h],
    up: [u + d, v, u + d + w, v + d], down: [u + d + w, v, u + 2 * d + w, v + d],
  };
  const order = ['east', 'west', 'up', 'down', 'south', 'north'];   /* +x,-x,+y,-y,+z,-z */
  const uvA = geo.attributes.uv;
  for (let f = 0; f < 6; f++) {
    const r = rect[order[f]];
    for (let i = f * 4; i < f * 4 + 4; i++)
      uvA.setXY(i, (r[0] + uvA.getX(i) * (r[2] - r[0])) / TW, 1 - (r[3] - uvA.getY(i) * (r[3] - r[1])) / TH);
  }
}
function rabbitOf(texPath) {
  const tex = loader.load(texPath);
  tex.colorSpace = T.SRGBColorSpace; tex.magFilter = T.NearestFilter; tex.minFilter = T.NearestMipmapNearestFilter;
  const mat = new T.MeshLambertMaterial({ map: tex, alphaTest: .4 });
  const root = new T.Group(), bones = {};
  for (const b of MODELS.rabbit.bones) {
    const g = new T.Group();
    g.position.set(b.p[0] / 16, b.p[1] / 16, b.p[2] / 16);
    if (b.r) g.rotation.set(-b.r[0] * Math.PI / 180, -b.r[1] * Math.PI / 180, -b.r[2] * Math.PI / 180);
    for (const c of b.c) {
      const geo = new T.BoxGeometry(c.s[0] / 16, c.s[1] / 16, c.s[2] / 16);
      if (c.uv) boxUV(geo, c.uv, c.s);
      const m = new T.Mesh(geo, mat);
      m.position.set((c.o[0] + c.s[0] / 2 - b.p[0]) / 16, (c.o[1] + c.s[1] / 2 - b.p[1]) / 16, (c.o[2] + c.s[2] / 2 - b.p[2]) / 16);
      g.add(m);
    }
    root.add(g); bones[b.n] = g;
  }
  root.rotation.y = Math.PI;   /* geo смотрит в −Z, разворачиваем к камере */
  return { root, bones, mat };
}

/* сердце: пиксельный спрайт (общая текстура) */
const heartTex = (() => {
  const HEART = ['.HH.HH.', 'HHHHHHH', 'HHHHHHH', '.HHHHH.', '..HHH..', '...H...'];
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.shadowColor = '#ff5b7a'; g.shadowBlur = 7;
  HEART.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'H') { g.fillStyle = (y < 2 && x > 1 && x < 5) ? '#ff9cc0' : '#f0568c'; g.fillRect(x * 6 + 3, y * 6 + 6, 6, 6); } }));
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.magFilter = T.NearestFilter; return t;
})();

/* =====================================================================
 * фабрика сцены. Опции: night, fence, carrot, capEl, yaw, pitch, dist.
 * Возвращает контроллер { S (сеттер), tick(t) }.
 * ===================================================================== */
function makeScene(cv, o) {
  const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(DPR);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(40, 1, .1, 90);
  const night = !!o.night;

  scene.add(new T.HemisphereLight(night ? 0xd9f0c8 : 0xeaf6dd, night ? 0x0e1a10 : 0x2a1e12, night ? 1.35 : 1.55));
  const moon = new T.DirectionalLight(night ? 0xcfe8ff : 0xfff3d8, night ? 1.0 : 1.15); moon.position.set(-4, 6, 3); scene.add(moon);
  const warm = new T.PointLight(0xffa03a, night ? 1.5 : .9, 8); warm.position.set(0, 1.0, .6); scene.add(warm);

  /* поле 16×9 как в app.js */
  const FW = 16, FH = 9, OX = FW / 2, OZ = FH / 2;
  const floor = new T.Mesh(new T.CircleGeometry(11.4, 56), new T.MeshLambertMaterial({ color: night ? 0x0f1d14 : 0x274a2b }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.02; scene.add(floor);
  const tileA = new T.MeshLambertMaterial({ color: night ? 0x16281a : 0x2f5733 }), tileB = new T.MeshLambertMaterial({ color: night ? 0x132317 : 0x2a4e2e });
  for (let x = 0; x < FW; x++) for (let z = 0; z < FH; z++) {
    const t = new T.Mesh(new T.PlaneGeometry(1, 1), (x + z) % 2 ? tileA : tileB);
    t.rotation.x = -Math.PI / 2; t.position.set(x + .5 - OX, 0, z + .5 - OZ); scene.add(t);
  }
  /* травинки */
  const grassMat = new T.MeshLambertMaterial({ color: night ? 0x3f7a3a : 0x4f9448 }), grassMat2 = new T.MeshLambertMaterial({ color: night ? 0x4c8a44 : 0x5aa352 });
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const tufts = [];
  for (let i = 0; i < (o.fence ? 64 : 46); i++) {
    const x = o.fence ? rnd() * FW - OX : 0, z = 0;
    const a = rnd() * Math.PI * 2, r = .6 + rnd() * 8.6;
    const tuft = new T.Group();
    for (let b = 0; b < 3; b++) {
      const blade = new T.Mesh(new T.BoxGeometry(.022, .12 + rnd() * .09, .022), b % 2 ? grassMat : grassMat2);
      blade.position.set((rnd() - .5) * .09, .06 + rnd() * .03, (rnd() - .5) * .09);
      blade.rotation.z = (rnd() - .5) * .5; tuft.add(blade);
    }
    if (o.fence) tuft.position.set(x + .5, 0, rnd() * FH - OZ);
    else tuft.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    scene.add(tuft); tufts.push(tuft);
  }
  /* изгородь по периметру — границы поля стенда */
  if (o.fence) {
    const post = new T.MeshLambertMaterial({ color: 0x7a5a34 }), rail = new T.MeshLambertMaterial({ color: 0x8a6a40 });
    const mkPost = (x, z) => { const p = new T.Mesh(new T.BoxGeometry(.12, .55, .12), post); p.position.set(x, .27, z); scene.add(p); };
    for (let x = 0; x <= FW; x += 2) { mkPost(x - OX, -OZ); mkPost(x - OX, OZ); }
    for (let z = 0; z <= FH; z += 2) { mkPost(-OX, z - OZ); mkPost(OX, z - OZ); }
    for (const [zz] of [[-OZ], [OZ]]) { const r = new T.Mesh(new T.BoxGeometry(FW, .07, .07), rail); r.position.set(0, .42, zz); scene.add(r); }
    for (const xx of [[-OX], [OX]]) { const r = new T.Mesh(new T.BoxGeometry(.07, .07, FH), rail); r.position.set(xx[0], .42, 0); scene.add(r); }
  }
  /* морковка в центре — приманка пары */
  let carrot = null;
  if (o.carrot) {
    carrot = new T.Group();
    carrot.add(new T.Mesh(new T.BoxGeometry(.14, .34, .14), new T.MeshLambertMaterial({ color: 0xe07820 })));
    const top = new T.Mesh(new T.BoxGeometry(.16, .12, .16), new T.MeshLambertMaterial({ color: 0x3f8f3a })); top.position.y = .22; carrot.add(top);
    carrot.position.set(0, .08, 0); carrot.rotation.z = 1.35; scene.add(carrot);
  }

  const A = rabbitOf('../../assets/textures/mc/entity/rabbit/rabbit_brown.png');
  const B = rabbitOf('../../assets/textures/mc/entity/rabbit/rabbit_white.png');
  const BABY = rabbitOf('../../assets/textures/mc/entity/rabbit/rabbit_brown.png');
  const wrap = (inner) => { const g = new T.Group(); g.add(inner.root); scene.add(g); return g; };
  const gA = wrap(A), gB = wrap(B), gBaby = wrap(BABY);
  gBaby.visible = false;

  const hearts = [];
  const spawnHeart = (x, z) => {
    const s = new T.Sprite(new T.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
    s.position.set(x + (Math.random() - .5) * .5, .9, z + (Math.random() - .5) * .3);
    s.scale.setScalar(.16 + Math.random() * .1); s.userData = { t: 0 };
    scene.add(s); hearts.push(s); if (hearts.length > 24) { const old = hearts.shift(); scene.remove(old); }
  };

  /* орбита: тяни мышью, в покое камера сама медленно кружит */
  let yaw = o.yaw, pitch = o.pitch, drag = null, idleAt = 0;
  cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; idleAt = performance.now(); try { cv.setPointerCapture(e.pointerId); } catch (_) { } });
  cv.addEventListener('pointermove', e => {
    if (!drag) return; idleAt = performance.now();
    yaw = drag.yaw + (e.clientX - drag.x) * .006;
    pitch = Math.max(.18, Math.min(1.35, drag.pitch + (e.clientY - drag.y) * .005));
  });
  for (const n of ['pointerup', 'pointercancel', 'lostpointercapture']) cv.addEventListener(n, () => (drag = null));

  const camTarget = new T.Vector3(0, .42, 0);
  const facing = (dx, dz) => Math.atan2(-dx, -dz);   /* модель смотрит в −Z */
  const fx = (r) => r.x - OX, fz = (r) => r.z - OZ;
  let S = null, lastHeartAt = 0, flinchB = 0, seen = false, last = 0;
  new IntersectionObserver(es => (seen = es[0].isIntersecting), { rootMargin: '70px' }).observe(cv);

  const cap = o.capEl;
  function caption(S, tt) {
    if (!cap) return;
    let txt = '';
    if (S) {
      const lone = (S.a.love !== S.b.love) ? (S.a.love ? S.a : S.b) : null;
      if (S.phase === 'idle' && lone) txt = 'ПОИСК ПАРТНЁРА · РАДИУС 3 БЛ.';
      else if (S.phase === 'idle' && S.a.love && S.b.love) {
        const d = Math.hypot(S.a.x - S.b.x, S.a.z - S.b.z);
        if (d > 3) txt = 'ИДУТ НАВСТРЕЧУ · ' + d.toFixed(1) + ' БЛ.';
        else txt = 'ОБА В ЛЮБВИ';
      } else if (S.phase === 'train') txt = 'ПАРОВОЗИК · ДИСТАНЦИЯ 0.45';
      else if (S.phase === 'stun') txt = 'ОТЛЁТ ЗАДНЕГО · 2 БЛОКА · XROT 180°';
      else if (S.phase === 'grow') txt = 'ДЕТЁНЫШ РАСТЁТ · ' + S.growT + '/36';
      else if (S.phase === 'done') txt = 'ДЕТЁНЫШ ГОТОВ';
      if (S.baby && S.phase !== 'grow' && S.phase === 'done') txt += ' · ПОКОЛЕНИЕ +' ;
    }
    if (cap.textContent !== txt) cap.textContent = txt;
  }

  function tick(t) {
    const dt = Math.min(.05, (t - last) / 1000) || .016; last = t;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * DPR) || cv.height !== Math.round(h * DPR)) { cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR); }
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();

    const tt = t / 1000;
    const hopOf = (r, hopFlag) => (S && S.phase === 'idle' && hopFlag ? Math.abs(Math.sin(S.t * .35)) * .16 : 0);
    const breathe = Math.sin(tt * 2.4) * .012;

    if (S) {
      gA.position.set(fx(S.a), hopOf(S.a, S.hopA) + (S.phase === 'idle' ? 0 : .02 + breathe), fz(S.a));
      gA.rotation.y = Math.PI + (S.phase === 'train' ? facing(S.fwd.x, S.fwd.z) : facing(S.a.dir >= 0 ? 1 : -1, 0) + Math.sin(tt * .6) * .12);
      gB.position.set(fx(S.b), hopOf(S.b, S.hopB), fz(S.b));
      gB.rotation.y = Math.PI + (S.phase === 'train' ? facing(S.fwd.x, S.fwd.z) : facing(S.b.dir >= 0 ? 1 : -1, 0) + Math.sin(tt * .5 + 2) * .12);
      /* XRot 180° — кролик Б на спине */
      B.root.rotation.x = S.b.up ? Math.PI : 0;
      B.root.position.y = S.b.up ? .58 : 0;
      if (S.phase === 'stun' && flinchB <= 0 && S.stunT < 2) flinchB = .4;
      gBaby.visible = !!S.baby;
      if (S.baby) {
        BABY.root.scale.setScalar(.38 + (S.phase === 'grow' ? (S.growT / 36) * .5 : 0));
        gBaby.position.set(fx(S.baby), Math.abs(Math.sin(tt * 6)) * .07, fz(S.baby));
        gBaby.rotation.y = Math.PI + facing(S.baby.dir >= 0 ? 1 : -1, 0) + Math.sin(tt * .9) * .3;
      }
      if (t - lastHeartAt > 340) {
        lastHeartAt = t;
        if (S.a.love && S.phase !== 'stun') spawnHeart(fx(S.a), fz(S.a));
        if (S.b.love && !S.b.up && S.phase !== 'stun') spawnHeart(fx(S.b), fz(S.b));
      }
      caption(S, tt);
    }
    if (flinchB > 0) { flinchB -= dt; gB.position.y += Math.max(0, flinchB - .2) * .9; }
    if (carrot) carrot.rotation.y += dt * .6;
    tufts.forEach((tf, i) => (tf.rotation.z = Math.sin(tt * 1.6 + i) * .06));

    /* живость: уши и головы */
    const ear = (rb, k) => { rb.bones.earLeft.rotation.x = Math.sin(tt * 3.1 + k) * .1; rb.bones.earRight.rotation.x = Math.sin(tt * 2.7 + k + 1) * .12; };
    ear(A, 0); ear(B, 2); ear(BABY, 4);
    A.bones.head.rotation.x = Math.sin(tt * 1.3) * .07;
    BABY.bones.head.rotation.x = Math.sin(tt * 2.1) * .12;
    if (S && !S.b.up) B.bones.head.rotation.x = Math.sin(tt * 1.1 + 1) * .07;

    for (let i = hearts.length - 1; i >= 0; i--) {
      const s = hearts[i]; s.userData.t += dt;
      s.position.y += dt * .55; s.material.opacity = Math.max(0, 1 - s.userData.t / 1.6);
      if (s.userData.t > 1.6) { scene.remove(s); hearts.splice(i, 1); }
    }

    if (performance.now() - idleAt > 2600 && !drag) yaw += dt * .12;
    if (S) {
      const tx = (fx(S.a) + fx(S.b)) / 2, tz = (fz(S.a) + fz(S.b)) / 2;
      camTarget.x += (tx - camTarget.x) * Math.min(1, dt * 3);
      camTarget.z += (tz - camTarget.z) * Math.min(1, dt * 3);
    }
    const dist = o.dist || Math.max(6.5, 13.5 / (camera.aspect || 1.4));
    camera.position.set(camTarget.x + Math.sin(yaw) * Math.cos(pitch) * dist, .6 + Math.sin(pitch) * dist, camTarget.z + Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(camTarget.x, .42, camTarget.z);
    renderer.render(scene, camera);
  }
  return { set S(v) { S = v; }, tick };
}

/* =====================================================================
 * сцена 1: ночной портрет на hero
 * ===================================================================== */
const scenes = [];
try {
  const fig = document.querySelector('#hopArt'), cv = document.querySelector('#hop3d');
  if (!fig || !cv) throw Error('нет hero-сцены');
  if (!webgl2) throw Error('WebGL2 недоступен');
  const hero = makeScene(cv, { night: true, carrot: true, yaw: .55, pitch: .52, dist: 6.2 });
  scenes.push({ inst: hero, fig });
  fig.classList.add('ready');
} catch (e) { /* hero остаётся на статичной картинке */ }

/* =====================================================================
 * сцена 2: сам стенд #simCanvas — 3D вместо 2D-пикселей
 * ===================================================================== */
try {
  const old = document.querySelector('#simCanvas');
  if (!old) throw Error('нет сим-канваса');
  if (!webgl2) throw Error('WebGL2 недоступен');
  /* у старого канваса уже занят 2D-контекст: ставим рядом свой, тот прячем */
  const cv2 = document.createElement('canvas');
  cv2.id = 'sim3dCanvas';
  cv2.setAttribute('aria-label', 'Стенд размножения кроликов в 3D: два кролика, сердца, паровозик и детёныш. Перетащи, чтобы повернуть');
  old.insertAdjacentElement('afterend', cv2);
  old.classList.add('g2-sim-2d-off');
  const stand = makeScene(cv2, { night: false, fence: true, yaw: .0, pitch: .95, dist: 14.5 });
  /* подписи фаз поверх канваса */
  const host = old.parentElement || cv2;
  const cap = document.createElement('div');
  cap.className = 'sim3d-cap';
  host.appendChild(cap);
  scenes.push({ inst: stand, cap });
} catch (e) { /* стенд остаётся на 2D-рисунке */ }

/* общий приём состояния S из app.js + общий цикл кадров */
let seenAny = false;
new IntersectionObserver(es => (seenAny = es[0].isIntersecting), { rootMargin: '80px' }).observe(document.body);
window.__g2sim3d = (st) => { for (const s of scenes) s.inst.S = st; };
(function frame(t) {
  requestAnimationFrame(frame);
  if (!scenes.length || document.hidden) return;
  for (const s of scenes) s.inst.tick(t);
})(0);
