/* Г-В · Зона близости в 3D. Двое игроков внутри радиуса команды /sex:
 * модели собраны из ванильных боксов с UV скина игрока (тот же конструктор,
 * что у арены p29), поза навстречу друг другу, сердца всплывают и пульсируют
 * на 5 Гц — как OSC_HZ из IntimacyManager.java. Розовое кольцо на полу —
 * RADIUS=2 блока. Сцена иллюстрирует правила, механики числятся в app.js. */
import * as T from '../../shared/vendor/three/three.module.js';
const fig = document.querySelector('#loveArt'), cv = document.querySelector('#love3d');
try {
  if (!fig || !cv) throw Error('нет места под сцену');
  if (!document.createElement('canvas').getContext('webgl2')) throw Error('WebGL2 недоступен');
  const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(38, 1, .1, 60), target = new T.Vector3(0, 1, 0);

  /* свет: тёплый верх, маджента между игроками */
  scene.add(new T.HemisphereLight(0xffd9e8, 0x2a1220, 1.7));
  const glow = new T.PointLight(0xf0568c, 2.4, 9); glow.position.set(0, 1.35, 0); scene.add(glow);

  /* пол: тёмный диск, сетка и кольцо RADIUS=2 */
  const floor = new T.Mesh(new T.CircleGeometry(3.4, 48), new T.MeshLambertMaterial({ color: 0x170b12 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const ring = new T.LineLoop(new T.BufferGeometry().setFromPoints(
    Array.from({ length: 72 }, (_, i) => { const a = i / 72 * Math.PI * 2; return new T.Vector3(Math.cos(a) * 2, .014, Math.sin(a) * 2); })),
    new T.LineBasicMaterial({ color: 0xf0568c, transparent: true, opacity: .8 }));
  scene.add(ring);
  const grid = new T.GridHelper(6.8, 17, 0xf0568c, 0x452038);
  grid.material.transparent = true; grid.material.opacity = .2; grid.position.y = .006; scene.add(grid);

  /* ---- модель игрока: ванильные боксы + UV скина (как арена p29) ---- */
  const defs = [{ name: 'body', size: [8, 12, 4], origin: [-4, 12, -2], pivot: [0, 0, 0], uv: [16, 16] }, { name: 'head', size: [8, 8, 8], origin: [-4, 0, -4], pivot: [0, 24, 0], uv: [0, 0] },
  { name: 'rightArm', size: [4, 12, 4], origin: [-2, -11, -2], pivot: [-6, 23, 0], uv: [40, 16] }, { name: 'leftArm', size: [4, 12, 4], origin: [-2, -11, -2], pivot: [6, 23, 0], uv: [32, 48] },
  { name: 'rightLeg', size: [4, 12, 4], origin: [-2, -12, -2], pivot: [-2, 12, 0], uv: [0, 16] }, { name: 'leftLeg', size: [4, 12, 4], origin: [-2, -12, -2], pivot: [2, 12, 0], uv: [16, 48] }];
  const order = ['east', 'west', 'up', 'down', 'south', 'north'];
  function geometry(d) {
    const [w, h, z] = d.size, [u, v] = d.uv;
    const rect = { east: [u, v + z, u + z, v + z + h], north: [u + z, v + z, u + z + w, v + z + h], west: [u + z + w, v + z, u + 2 * z + w, v + z + h], south: [u + 2 * z + w, v + z, u + 2 * z + 2 * w, v + z + h], up: [u + z, v, u + z + w, v + z], down: [u + z + w, v + z, u + z + 2 * w, v] };
    const g = new T.BoxGeometry(w / 16, h / 16, z / 16), uv = g.attributes.uv;
    for (let f = 0; f < 6; f++) { const r = rect[order[f]]; for (let i = f * 4; i < f * 4 + 4; i++)uv.setXY(i, (r[0] + uv.getX(i) * (r[2] - r[0])) / 64, 1 - (r[3] - uv.getY(i) * (r[3] - r[1])) / 64); }
    g.translate(...d.origin.map((x, i) => (x + d.size[i] / 2) / 16)); return g;
  }
  const geos = defs.map(geometry);
  const defsSlim = defs.map(d => (d.name === 'rightArm' || d.name === 'leftArm') ? Object.assign({}, d, { size: [3, 12, 4] }) : d);   /* у Алекс руки тоньше */
  const loader = new T.TextureLoader();
  function skin(path, tint) {
    const t = loader.load(path);
    t.colorSpace = T.SRGBColorSpace; t.magFilter = T.NearestFilter; t.minFilter = T.NearestMipmapNearestFilter;
    return new T.MeshLambertMaterial({ map: t, alphaTest: .15, color: tint });
  }
  function humanoid(path, tint, slim) {
    const ds = slim ? defsSlim : defs, own = ds.map(geometry);
    const mat = skin(path, tint), root = new T.Group(), parts = [];
    for (let i = 0; i < ds.length; i++) { const pivot = new T.Group(); pivot.position.set(...ds[i].pivot.map(x => x / 16)); pivot.add(new T.Mesh(own[i], mat)); root.add(pivot); parts.push(pivot); }
    root.scale.setScalar(.92); scene.add(root); return { root, parts };
  }
  /* настоящая пара: Стив и Алекс, как на аватарке пункта */
  const A = humanoid('../../assets/textures/mc/p2/entity_steve.png', 0xffffff, false);
  const B = humanoid('../../assets/textures/mc/p2/entity_alex.png', 0xffffff, true);
  A.root.position.x = -.74; B.root.position.x = .74;
  /* тела лицом друг к другу и чуть к зрителю: модель смотрит в −Z,
   * Стив слева → лицом к +X, Алекс справа → лицом к −X */
  A.root.rotation.y = -Math.PI / 2 - .42; B.root.rotation.y = Math.PI / 2 + .42;
  /* поза «держатся за руки»: внутренние руки (правая Стива, левая Алекса)
   * вытянуты вперёд-вниз навстречу и сцеплены в середине, внешние свободно.
   * Знак важен: rotation.x = + поднимает руку ВПЕРЁД (−Z), минус — за спину. */
  A.parts[2].rotation.x = 1.02; A.parts[2].rotation.z = -.16;   /* правая Стива — внутренняя */
  B.parts[3].rotation.x = 1.02; B.parts[3].rotation.z = .16;    /* левая Алекса — внутренняя */
  A.parts[3].rotation.x = .1; A.parts[3].rotation.z = -.1;      /* внешние чуть от тела */
  B.parts[2].rotation.x = .1; B.parts[2].rotation.z = .1;
  /* головы: смотрят друг на друга, лёгкий наклон к партнёру */
  A.parts[1].rotation.y = -.16; A.parts[1].rotation.z = -.07;
  B.parts[1].rotation.y = .16; B.parts[1].rotation.z = .07;

  /* ---- сердца: спрайты с пиксельной текстурой, пульс 5 Гц (OSC_HZ) ---- */
  const HEART = ['.HH.HH.', 'HHHHHHH', 'HHHHHHH', '.HHHHH.', '..HHH..', '...H...'];
  const heartTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 48;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.shadowColor = '#ff5b8c'; g.shadowBlur = 7;
    HEART.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'H') { g.fillStyle = (y < 2 && x > 1 && x < 5) ? '#ff9cc0' : '#f0568c'; g.fillRect(x * 6 + 3, y * 6 + 6, 6, 6); } }));
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.magFilter = T.NearestFilter; return t;
  })();
  const hearts = [];
  const spawnHeart = () => {
    const s = new T.Sprite(new T.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
    s.position.set((Math.random() - .5) * .7, 1.15, (Math.random() - .5) * .3);
    s.scale.setScalar(.22 + Math.random() * .12); s.userData = { t: 0, base: s.scale.x };
    scene.add(s); hearts.push(s); if (hearts.length > 26) { scene.remove(hearts.shift()); }
  };

  /* ---- орбита камеры: тяни мышью/пальцем, в покое медленно кружит ---- */
  let yaw = .7, pitch = .3, dist = 4.7, drag = null, lastTouch = 0;
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; try { cv.setPointerCapture(e.pointerId); } catch (_) { } });
  cv.addEventListener('pointermove', e => {
    if (!drag) return; lastTouch = performance.now();
    yaw = drag.yaw + (e.clientX - drag.x) * .008; pitch = Math.max(.08, Math.min(1.1, drag.pitch + (e.clientY - drag.y) * .005));
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
    if (!drag && performance.now() - lastTouch > 2200) yaw += .0022;   /* ленивый облёт */
    camera.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * dist, target.y + Math.sin(pitch) * dist, target.z + Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(target);
    const sec = t / 1000;
    A.root.position.y = Math.sin(sec * 1.9) * .015; B.root.position.y = Math.sin(sec * 1.9 + 1.6) * .015;
    /* головы чуть кивают друг другу, сцепленные руки легко покачиваются */
    A.parts[1].rotation.y = -.16 + Math.sin(sec * .9) * .07; B.parts[1].rotation.y = .16 - Math.sin(sec * .9 + .4) * .07;
    A.parts[1].rotation.x = Math.sin(sec * 1.3) * .05; B.parts[1].rotation.x = Math.sin(sec * 1.3 + .9) * .05;
    A.parts[2].rotation.x = 1.02 + Math.sin(sec * 1.1) * .05; B.parts[3].rotation.x = 1.02 + Math.sin(sec * 1.1 + .5) * .05;
    if (t - heartAt > 380) { heartAt = t; spawnHeart(); }
    for (let i = hearts.length - 1; i >= 0; i--) {
      const s = hearts[i]; s.userData.t += .033;
      s.position.y += .0075; s.position.x += Math.sin(s.userData.t * 3 + i) * .0016;
      const pulse = 1 + .16 * Math.sin(s.userData.t * Math.PI * 2 * 5);   /* OSC_HZ = 5 */
      s.scale.setScalar(s.userData.base * pulse);
      s.material.opacity = Math.max(0, 1 - s.userData.t / 2.4);
      if (s.userData.t > 2.4) { scene.remove(s); hearts.splice(i, 1); }
    }
    glow.intensity = 2.1 + Math.sin(sec * Math.PI * 2 * 5) * .5;
    renderer.render(scene, camera);
  })(0);
  fig.classList.add('ready');
} catch (e) { fig && fig.classList.add('no3d'); console.warn('Близость показывает плоский вариант:', e.message); }
