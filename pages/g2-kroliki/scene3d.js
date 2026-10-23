/* Г-К · Ночная поляна с кроликами в 3D — теперь по-настоящему.
 * Кролики собраны из ванильной геометрии rabbit.geo (боксы с UV как в игре)
 * и окрашены классическими текстурами rabbit_brown / rabbit_white (64×32).
 * Сцена — живой портрет стенда: получает состояние S из app.js через
 * window.__g2sim3d(S) на каждом кадре и повторяет механику из
 * RabbitRecoilHandler.java: прыжки, сердца, поза «паровозик» на 0.45 блока,
 * тряска заднего ±0.06 через тик, отлёт ровно на 2 блока, XRot 180°
 * (кролик Б лежит на спине), детёныш и его рост. Крути мышью. */
import * as T from '../../shared/vendor/three/three.module.js';
import { MODELS } from '../../shared/entity_models.js';

const fig = document.querySelector('#hopArt'), cv = document.querySelector('#hop3d');
try {
  if (!fig || !cv) throw Error('нет места под сцену');
  if (!document.createElement('canvas').getContext('webgl2')) throw Error('WebGL2 недоступен');
  const DPR = Math.min(devicePixelRatio || 1, 1.5);
  const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(DPR);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(40, 1, .1, 80);

  /* свет: холодная луна + тёплая точка между кроликами */
  scene.add(new T.HemisphereLight(0xd9f0c8, 0x0e1a10, 1.35));
  const moon = new T.DirectionalLight(0xcfe8ff, 1.0); moon.position.set(-4, 6, 3); scene.add(moon);
  const warm = new T.PointLight(0xffa03a, 1.5, 8); warm.position.set(0, 1.0, .6); scene.add(warm);

  /* поляна: тёмный диск + шахматка 16×9 как в стенде + травинки */
  const FW = 16, FH = 9, OX = FW / 2, OZ = FH / 2;   /* поле 16×9 блоков, как в app.js */
  const floor = new T.Mesh(new T.CircleGeometry(10.2, 56), new T.MeshLambertMaterial({ color: 0x0f1d14 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.02; scene.add(floor);
  const tileA = new T.MeshLambertMaterial({ color: 0x16281a }), tileB = new T.MeshLambertMaterial({ color: 0x132317 });
  for (let x = 0; x < FW; x++) for (let z = 0; z < FH; z++) {
    const t = new T.Mesh(new T.PlaneGeometry(1, 1), (x + z) % 2 ? tileA : tileB);
    t.rotation.x = -Math.PI / 2; t.position.set(x + .5 - OX, 0, z + .5 - OZ); scene.add(t);
  }
  const grassMat = new T.MeshLambertMaterial({ color: 0x3f7a3a }), grassMat2 = new T.MeshLambertMaterial({ color: 0x4c8a44 });
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2, r = .6 + rnd() * 8.6;
    const tuft = new T.Group();
    for (let b = 0; b < 3; b++) {
      const blade = new T.Mesh(new T.BoxGeometry(.022, .12 + rnd() * .09, .022), b % 2 ? grassMat : grassMat2);
      blade.position.set((rnd() - .5) * .09, .06 + rnd() * .03, (rnd() - .5) * .09);
      blade.rotation.z = (rnd() - .5) * .5; tuft.add(blade);
    }
    tuft.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); scene.add(tuft);
  }
  /* морковка между кроликами */
  const carrot = new T.Group();
  carrot.add(new T.Mesh(new T.BoxGeometry(.14, .34, .14), new T.MeshLambertMaterial({ color: 0xe07820 })));
  const top = new T.Mesh(new T.BoxGeometry(.16, .12, .16), new T.MeshLambertMaterial({ color: 0x3f8f3a })); top.position.y = .22; carrot.add(top);
  carrot.position.set(0, .08, 0); carrot.rotation.z = 1.35; scene.add(carrot);

  /* ---- ванильный кролик из geo-боксов с UV ---- */
  const [TW, TH] = MODELS.rabbit.tex;
  function boxUV(geo, uv, size) {
    const [w, h, d] = size, [u, v] = uv;
    const rect = {
      east: [u, v + d, u + d, v + d + h], north: [u + d, v + d, u + d + w, v + d + h],
      west: [u + d + w, v + d, u + 2 * d + w, v + d + h], south: [u + 2 * d + w, v + d, u + 2 * d + 2 * w, v + d + h],
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
  const loader = new T.TextureLoader();
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
  const wrap = (inner) => { const g = new T.Group(); g.add(inner.root); scene.add(g); return g; };
  const A = rabbitOf('../../assets/textures/mc/entity/rabbit/rabbit_brown.png');
  const B = rabbitOf('../../assets/textures/mc/entity/rabbit/rabbit_white.png');
  const BABY = rabbitOf('../../assets/textures/mc/entity/rabbit/rabbit_brown.png');
  const gA = wrap(A), gB = wrap(B), gBaby = wrap(BABY);
  gBaby.visible = false;

  /* сердца: пиксельный спрайт */
  const HEART = ['.HH.HH.', 'HHHHHHH', 'HHHHHHH', '.HHHHH.', '..HHH..', '...H...'];
  const heartTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 48;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.shadowColor = '#ff5b7a'; g.shadowBlur = 7;
    HEART.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'H') { g.fillStyle = (y < 2 && x > 1 && x < 5) ? '#ff9cc0' : '#f0568c'; g.fillRect(x * 6 + 3, y * 6 + 6, 6, 6); } }));
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.magFilter = T.NearestFilter; return t;
  })();
  const hearts = [];
  const spawnHeart = (x, z) => {
    const s = new T.Sprite(new T.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
    s.position.set(x + (Math.random() - .5) * .5, .9, z + (Math.random() - .5) * .3);
    s.scale.setScalar(.16 + Math.random() * .1); s.userData = { t: 0 };
    scene.add(s); hearts.push(s); if (hearts.length > 24) { const o = hearts.shift(); scene.remove(o); }
  };

  /* ---- состояние из app.js ---- */
  let S = null, lastHeartAt = 0, flinchB = 0;
  const camTarget = new T.Vector3(0, .42, 0);
  window.__g2sim3d = (st) => (S = st);
  const facing = (dx, dz) => Math.atan2(-dx, -dz);   /* модель смотрит в −Z */
  const fx = (r) => r.x - OX, fz = (r) => r.z - OZ;

  /* орбита: тяни мышью, в покое камера сама медленно кружит */
  let yaw = .55, pitch = .52, drag = null, idleAt = 0;
  cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; idleAt = performance.now(); try { cv.setPointerCapture(e.pointerId); } catch (_) { } });
  cv.addEventListener('pointermove', e => {
    if (!drag) return; idleAt = performance.now();
    yaw = drag.yaw + (e.clientX - drag.x) * .006;
    pitch = Math.max(.18, Math.min(1.25, drag.pitch + (e.clientY - drag.y) * .005));
  });
  for (const n of ['pointerup', 'pointercancel', 'lostpointercapture']) cv.addEventListener(n, () => (drag = null));

  let seen = false, last = 0;
  new IntersectionObserver(es => (seen = es[0].isIntersecting), { rootMargin: '70px' }).observe(cv);
  (function frame(t) {
    requestAnimationFrame(frame);
    if (!seen || document.hidden || !cv.clientWidth) return;
    const dt = Math.min(.05, (t - last) / 1000) || .016; last = t;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * DPR) || cv.height !== Math.round(h * DPR)) { cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR); }
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();

    const tt = t / 1000;
    const hopOf = (r, hopFlag) => (S && S.phase === 'idle' && hopFlag ? Math.abs(Math.sin(S.t * .35)) * .16 : 0);
    const breathe = Math.sin(tt * 2.4) * .012;

    if (S) {
      /* кролик А */
      gA.position.set(fx(S.a), hopOf(S.a, S.hopA) + (S.phase === 'idle' ? 0 : .02 + breathe), fz(S.a));
      gA.rotation.y = Math.PI + (S.phase === 'train' ? facing(S.fwd.x, S.fwd.z) : facing(S.a.dir >= 0 ? 1 : -1, 0) + Math.sin(tt * .6) * .12);
      /* кролик Б */
      gB.position.set(fx(S.b), hopOf(S.b, S.hopB), fz(S.b));
      let by = Math.PI + (S.phase === 'train' ? facing(S.fwd.x, S.fwd.z) : facing(S.b.dir >= 0 ? 1 : -1, 0) + Math.sin(tt * .5 + 2) * .12);
      gB.rotation.y = by;
      /* XRot 180° — кролик Б на спине; переворот на внутреннем root с подъёмом */
      B.root.rotation.x = S.b.up ? Math.PI : 0;
      B.root.position.y = S.b.up ? .58 : 0;
      if (S.phase === 'stun' && flinchB <= 0 && S.stunT < 2) flinchB = .4;  /* момент отлёта */
      /* детёныш */
      gBaby.visible = !!S.baby;
      if (S.baby) {
        const grow = S.phase === 'grow' ? .38 + (S.growT / 36) * .5 : .38;
        BABY.root.scale.setScalar(.38 + (S.phase === 'grow' ? (S.growT / 36) * .5 : 0));   /* рост детёныша */
        gBaby.position.set(fx(S.baby), Math.abs(Math.sin(tt * 6)) * .07, fz(S.baby));
        gBaby.rotation.y = Math.PI + facing(S.baby.dir >= 0 ? 1 : -1, 0) + Math.sin(tt * .9) * .3;
      }
      /* сердца над влюблёнными */
      if (t - lastHeartAt > 340) {
        lastHeartAt = t;
        if (S.a.love && S.phase !== 'stun') spawnHeart(fx(S.a), fz(S.a));
        if (S.b.love && !S.b.up && S.phase !== 'stun') spawnHeart(fx(S.b), fz(S.b));
      }
      /* морковка чуть светится в фазе ожидания */
      carrot.rotation.y += dt * .6;
    }
    if (flinchB > 0) { flinchB -= dt; gB.position.y += Math.max(0, flinchB - .2) * .9; }

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
    /* камера ведёт пару: цель — середина между кроликами, дистанция по ширине */
    if (S) {
      const tx = (fx(S.a) + fx(S.b)) / 2, tz = (fz(S.a) + fz(S.b)) / 2;
      camTarget.x += (tx - camTarget.x) * Math.min(1, dt * 3);
      camTarget.z += (tz - camTarget.z) * Math.min(1, dt * 3);
    }
    const dist = Math.max(6.5, 13.5 / (camera.aspect || 1.4));
    camera.position.set(camTarget.x + Math.sin(yaw) * Math.cos(pitch) * dist, .6 + Math.sin(pitch) * dist, camTarget.z + Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(camTarget.x, .42, camTarget.z);
    renderer.render(scene, camera);
    if (!fig.classList.contains('ready')) fig.classList.add('ready');
  })(0);
} catch (e) { /* без WebGL остаётся статичная картика */ }
