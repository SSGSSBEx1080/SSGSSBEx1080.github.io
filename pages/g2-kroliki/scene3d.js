/* Г-К · Двое на ночной поляне, 3D. Кролики собраны из боксов в пропорциях
 * ванильной модели (тело, голова, уши, лапы, хвост), А — бурый, Б — белый.
 * Морковка лежит между ними, сердечки всплывают, уши подрагивают.
 * Механика размножения — в 2D-стенде app.js, эта сцена — портрет пары. */
import * as T from '../../shared/vendor/three/three.module.js';
const fig = document.querySelector('#hopArt'), cv = document.querySelector('#hop3d');
try {
  if (!fig || !cv) throw Error('нет места под сцену');
  if (!document.createElement('canvas').getContext('webgl2')) throw Error('WebGL2 недоступен');
  const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(36, 1, .1, 50), target = new T.Vector3(0, .5, 0);

  scene.add(new T.HemisphereLight(0xd9f0c8, 0x0e1a10, 1.5));
  const moon = new T.DirectionalLight(0xcfe8ff, 1.1); moon.position.set(-3, 5, 2); scene.add(moon);
  const warm = new T.PointLight(0xffa03a, 1.6, 7); warm.position.set(0, 1.1, .8); scene.add(warm);

  /* поляна: тёмный диск + травинки-кластеры */
  const floor = new T.Mesh(new T.CircleGeometry(3, 40), new T.MeshLambertMaterial({ color: 0x11220f }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const grassMat = new T.MeshLambertMaterial({ color: 0x3f7a3a });
  const grassMat2 = new T.MeshLambertMaterial({ color: 0x4c8a44 });
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 42; i++) {
    const a = rnd() * Math.PI * 2, r = .5 + rnd() * 2.3;
    const tuft = new T.Group();
    for (let b = 0; b < 3; b++) {
      const blade = new T.Mesh(new T.BoxGeometry(.022, .12 + rnd() * .09, .022), b % 2 ? grassMat : grassMat2);
      blade.position.set((rnd() - .5) * .09, .06 + rnd() * .03, (rnd() - .5) * .09);
      blade.rotation.z = (rnd() - .5) * .5; tuft.add(blade);
    }
    tuft.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); scene.add(tuft);
  }

  /* ---- кролик из боксов: ванильные пропорции ---- */
  function rabbit(body, belly, earIn, leg) {
    const M = c => new T.MeshLambertMaterial({ color: c });
    const mBody = M(body), mBelly = M(belly), mEarIn = M(earIn), mLeg = M(leg), mWhite = M(0xf2efe6);
    const root = new T.Group(), box = (w, h, d, m, x, y, z, p) => {
      const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), m); mesh.position.set(x, y, z);
      const g = p || root; g.add(mesh); return mesh;
    };
    const trunk = new T.Group(); root.add(trunk);
    box(.42, .34, .62, mBody, 0, .34, 0, trunk);                 /* тело */
    box(.34, .12, .5, mBelly, 0, .2, .04, trunk);                /* брюшко */
    const head = new T.Group(); head.position.set(0, .52, -.34); root.add(head);
    box(.34, .3, .3, mBody, 0, 0, 0, head);                      /* голова */
    box(.05, .04, .05, mEarIn, 0, -.02, -.16, head);             /* нос */
    const earL = new T.Group(), earR = new T.Group();
    earL.position.set(-.09, .14, .02); earR.position.set(.09, .14, .02); head.add(earL, earR);
    box(.07, .3, .04, mBody, 0, .15, 0, earL); box(.045, .26, .02, mEarIn, 0, .16, .01, earL);
    box(.07, .3, .04, mBody, 0, .15, 0, earR); box(.045, .26, .02, mEarIn, 0, .16, .01, earR);
    earL.rotation.x = -.18; earR.rotation.x = -.18;
    const legs = [
      box(.11, .2, .11, mLeg, -.14, .1, -.2), box(.11, .2, .11, mLeg, .14, .1, -.2),
      box(.12, .2, .12, mLeg, -.13, .1, .22), box(.12, .2, .12, mLeg, .13, .1, .22)];
    box(.16, .16, .12, mWhite, 0, .4, .34);                      /* хвост */
    return { root, head, earL, earR, legs, trunk };
  }
  const A = rabbit(0x8a6244, 0xd9c9a8, 0xe8a0a0, 0x6e4f35);      /* бурый */
  const B = rabbit(0xe8e4d8, 0xf5f2ea, 0xf0b8b8, 0xd8d2c2);      /* белый */
  A.root.position.x = -.55; B.root.position.x = .55;
  A.root.rotation.y = Math.PI / 2.4; B.root.rotation.y = -Math.PI / 2.4;

  /* морковка между ними: оранжевый конус + зелень */
  const carrot = new T.Group();
  const root = new T.Mesh(new T.ConeGeometry(.07, .3, 5), new T.MeshLambertMaterial({ color: 0xff8c26 }));
  root.rotation.z = Math.PI / 2.1; root.rotation.y = .4; carrot.add(root);
  for (let i = 0; i < 3; i++) {
    const leaf = new T.Mesh(new T.BoxGeometry(.03, .16, .02), new T.MeshLambertMaterial({ color: 0x4c8a44 }));
    leaf.position.set(-.19, .05 + i * .02, 0); leaf.rotation.z = .7 + i * .25; carrot.add(leaf);
  }
  carrot.position.set(0, .07, .12); scene.add(carrot);

  /* сердечки над парой */
  const HEART = ['.HH.HH.', 'HHHHHHH', 'HHHHHHH', '.HHHHH.', '..HHH..', '...H...'];
  const heartTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 48;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.shadowColor = '#ff9cc0'; g.shadowBlur = 7;
    HEART.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'H') { g.fillStyle = y < 2 && x > 1 && x < 5 ? '#ffb7d0' : '#ff5b7a'; g.fillRect(x * 6 + 3, y * 6 + 6, 6, 6); } }));
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.magFilter = T.NearestFilter; return t;
  })();
  const hearts = [];
  const spawnHeart = () => {
    const s = new T.Sprite(new T.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
    s.position.set((Math.random() - .5) * .8, .6, (Math.random() - .5) * .4);
    s.scale.setScalar(.14 + Math.random() * .08); s.userData = { t: 0 };
    scene.add(s); hearts.push(s); if (hearts.length > 18) { scene.remove(hearts.shift()); }
  };

  /* орбита камеры */
  let yaw = .8, pitch = .34, dist = 3.6, drag = null, lastInput = 0;
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; try { cv.setPointerCapture(e.pointerId); } catch (_) { } });
  cv.addEventListener('pointermove', e => {
    if (!drag) return; lastInput = performance.now();
    yaw = drag.yaw + (e.clientX - drag.x) * .008; pitch = Math.max(.1, Math.min(1.05, drag.pitch + (e.clientY - drag.y) * .005));
  });
  for (const n of ['pointerup', 'pointercancel', 'lostpointercapture']) cv.addEventListener(n, () => drag = null);

  let seen = false, last = 0, heartAt = 0;
  new IntersectionObserver(es => seen = es[0].isIntersecting, { rootMargin: '60px' }).observe(cv);
  (function frame(t) {
    requestAnimationFrame(frame);
    if (!seen || document.hidden || t - last < 33) return; last = t;
    const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    const d = Math.min(devicePixelRatio || 1, 1.5);
    if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    if (!drag && performance.now() - lastInput > 2200) yaw += .002;    /* ленивый облёт */
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, target.y + Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(target);
    const sec = t / 1000;
    /* прыжки: каждый кролик подпрыгивает в своём ритме, уши прижаты в фазе */
    for (const [r, ph] of [[A, 0], [B, 1.9]]) {
      const hop = Math.abs(Math.sin(sec * 1.7 + ph));
      const air = hop > .86 ? (hop - .86) / .14 : 0;
      r.root.position.y = air * .16;
      r.root.rotation.x = air * -.22;
      r.earL.rotation.x = -.18 - air * .5; r.earR.rotation.x = -.18 - air * .5;
      r.earR.rotation.z = Math.sin(sec * 9 + ph) * .05;               /* ушко дрожит */
    }
    carrot.rotation.y = sec * .5;
    if (t - heartAt > 640) { heartAt = t; spawnHeart(); }
    for (let i = hearts.length - 1; i >= 0; i--) {
      const s = hearts[i]; s.userData.t += .033;
      s.position.y += .006; s.position.x += Math.sin(s.userData.t * 2.6 + i) * .0014;
      s.material.opacity = Math.max(0, 1 - s.userData.t / 2.2);
      if (s.userData.t > 2.2) { scene.remove(s); hearts.splice(i, 1); }
    }
    renderer.render(scene, camera);
  })(0);
  fig.classList.add('ready');
} catch (e) { fig && fig.classList.add('no3d'); console.warn('Поляна остаётся плоской:', e.message); }
