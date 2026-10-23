/* Г-Н · 3D-сцены на three.js.
 * 1) НОЖ: воксельная сборка — каждый непрозрачный пиксель оригинальной
 *    текстуры nina_knife.png превращается в куб, получается объёмный
 *    пиксельный нож. Крути мышью, в покое он дрейфует сам.
 * 2) ПКМ-СТЕНД: овца и бык собраны из ванильной геометрии sheep/cow geo
 *    с настоящими текстурами (у овцы — шкура + шерсть sheep_fur, которая
 *    срезается при стрижке; у быка — рога и перекраска в медь/лысый).
 *    Куст ягод и дуб-бревно с реальными текстурами блока. Состояниями
 *    управляет app.js через событие 'g4rcm' — механики и прочность
 *    ножа честные и числятся в app.js, тут только картинка. */
import * as T from '../../shared/vendor/three/three.module.js';
import { MODELS } from '../../shared/entity_models.js';

const DPR = Math.min(devicePixelRatio || 1, 1.5);
const webgl2 = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } })();

/* орбита: тяни мышью/пальцем; отпустил — камера медленно дрейфует сама */
function orbit(cv, yaw0, pitch0) {
  let yaw = yaw0, pitch = pitch0, drag = null, idleAt = 0;
  cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; idleAt = performance.now(); try { cv.setPointerCapture(e.pointerId); } catch (_) { } });
  cv.addEventListener('pointermove', e => {
    if (!drag) return; idleAt = performance.now();
    yaw = drag.yaw + (e.clientX - drag.x) * .008;
    pitch = Math.max(.08, Math.min(1.2, drag.pitch + (e.clientY - drag.y) * .005));
  });
  for (const n of ['pointerup', 'pointercancel', 'lostpointercapture']) cv.addEventListener(n, () => (drag = null));
  return { step(dt) { if (performance.now() - idleAt > 2200 && !drag) yaw += dt * .4; return { yaw, pitch }; } };
}

/* цикл кадров: рисуем только когда канвас на экране */
function looper(cv, tick) {
  let seen = false, last = 0;
  new IntersectionObserver(es => (seen = es[0].isIntersecting), { rootMargin: '80px' }).observe(cv);
  (function frame(t) {
    requestAnimationFrame(frame);
    if (!seen || document.hidden || !cv.clientWidth) return;
    const dt = Math.min(.05, (t - last) / 1000) || .016; last = t;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * DPR) || cv.height !== Math.round(h * DPR)) { cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR); }
    tick(dt, t / 1000, w, h);
  })(0);
}

function fit(cv, renderer, camera) {
  const w = cv.clientWidth, h = cv.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}

/* =====================================================================
 * 1. НОЖ: воксельная модель из текстуры предмета
 * ===================================================================== */
try {
  const fig = document.querySelector('#knifeArt'), cv = document.querySelector('#knife3d');
  if (!fig || !cv) throw Error('нет места под сцену');
  if (!webgl2) throw Error('WebGL2 недоступен');
  const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(DPR);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(30, 1, .1, 120);
  const ob = orbit(cv, .62, .34);

  scene.add(new T.HemisphereLight(0xfff1e2, 0x30121a, 1.6));
  const key = new T.DirectionalLight(0xffffff, 1.15); key.position.set(3, 4, 3); scene.add(key);
  const rim = new T.DirectionalLight(0xe0576b, .55); rim.position.set(-3.5, 1.4, -2.6); scene.add(rim);

  const tex = new Image();
  tex.crossOrigin = 'anonymous';
  tex.onload = () => {
    try {
      const S = 16, c = document.createElement('canvas'); c.width = c.height = S;
      const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      g.drawImage(tex, 0, 0, S, S);
      const data = g.getImageData(0, 0, S, S).data, cubes = [];
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const i = (y * S + x) * 4;
        if (data[i + 3] < 70) continue;
        cubes.push({ x: x - S / 2 + .5, y: S / 2 - y - .5, h: (data[i] << 16) | (data[i + 1] << 8) | data[i + 2] });
      }
      if (!cubes.length) throw Error('пустая текстура');
      const inst = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1.5), new T.MeshLambertMaterial({}), cubes.length);
      const m = new T.Matrix4(), col = new T.Color();
      cubes.forEach((q, i) => { m.setPosition(q.x, q.y, 0); inst.setMatrixAt(i, m); inst.setColorAt(i, col.setHex(q.h)); });
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.rotation.z = -.12;
      scene.add(inst);
      fig.classList.add('ready');
    } catch (e) { /* остаётся плоская текстура-заглушка */ }
  };
  tex.src = '../../assets/textures/guest/nina_knife.png';

  looper(cv, (dt, t, w, h) => {
    fit(cv, renderer, camera);
    const { yaw, pitch } = ob.step(dt);
    const dist = 31;
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist + 1.5, Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  });
} catch (e) { /* нож остаётся картинкой из мода */ }

/* =====================================================================
 * 2. ПКМ-СТЕНД: овца · бык · куст ягод · дуб-бревно
 * ===================================================================== */
try {
  const host = document.querySelector('#rcmScene'), cv = document.querySelector('#rcm3d');
  if (!host || !cv) throw Error('нет места под сцену');
  if (!webgl2) throw Error('WebGL2 недоступен');
  const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(DPR);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(34, 1, .1, 40);
  const ob = orbit(cv, -.55, .36);

  scene.add(new T.HemisphereLight(0xfff0dd, 0x2a141a, 1.5));
  const key = new T.DirectionalLight(0xffffff, 1.0); key.position.set(2.2, 3.6, 2.8); scene.add(key);
  const rose = new T.DirectionalLight(0xe0576b, .38); rose.position.set(-2.6, 1.1, -2.2); scene.add(rose);

  /* подиум: низкополигональная ступень */
  const floor = new T.Mesh(new T.CylinderGeometry(1.85, 2.0, .16, 12), new T.MeshLambertMaterial({ color: 0x241319 }));
  floor.position.y = -.08; scene.add(floor);
  const rimRing = new T.Mesh(new T.TorusGeometry(1.86, .018, 6, 44), new T.MeshLambertMaterial({ color: 0xe0576b }));
  rimRing.rotation.x = Math.PI / 2; rimRing.position.y = .005; scene.add(rimRing);

  const box = (w, h, d, color, x, y, z) => {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshLambertMaterial({ color }));
    m.position.set(x, y, z); return m;
  };

  /* ---- сборка сущности из ванильного geo: боксы + java-раскладка UV ---- */
  const loader = new T.TextureLoader();
  const texOf = (p) => { const t = loader.load(p); t.colorSpace = T.SRGBColorSpace; t.magFilter = T.NearestFilter; t.minFilter = T.NearestMipmapNearestFilter; return t; };
  function animalOf(model, texPath, tint = 0xffffff, inflate = 0) {
    const [TW, TH] = model.tex;
    const mat = new T.MeshLambertMaterial({ map: texOf(texPath), color: tint, alphaTest: .4 });
    const root = new T.Group(), bones = {}, meshes = [];
    for (const b of model.bones) {
      const g = new T.Group();
      g.position.set(b.p[0] / 16, b.p[1] / 16, b.p[2] / 16);
      if (b.r) g.rotation.set(-b.r[0] * Math.PI / 180, -b.r[1] * Math.PI / 180, -b.r[2] * Math.PI / 180);
      for (const c of b.c) {
        const geo = new T.BoxGeometry(c.s[0] / 16, c.s[1] / 16, c.s[2] / 16);
        if (c.uv) {
          const [w, h, d] = c.s, [u, v] = c.uv;
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
        const m = new T.Mesh(geo, mat);
        m.position.set((c.o[0] + c.s[0] / 2 - b.p[0]) / 16, (c.o[1] + c.s[1] / 2 - b.p[1]) / 16, (c.o[2] + c.s[2] / 2 - b.p[2]) / 16);
        if (inflate) m.scale.set((c.s[0] + 2 * inflate) / c.s[0], (c.s[1] + 2 * inflate) / c.s[1], (c.s[2] + 2 * inflate) / c.s[2]);
        m.userData.base = [m.scale.x, m.scale.y, m.scale.z];
        g.add(m); meshes.push(m);
      }
      root.add(g); bones[b.n] = g;
    }
    root.rotation.y = Math.PI;   /* geo смотрит в −Z — разворачиваем лицом к камере */
    return { root, bones, mat, meshes };
  }

  /* ОВЦА: шкура + отдельный слой шерсти (надув кубов), шерсть срезается */
  const sheepSkin = animalOf(MODELS.sheep, '../../assets/textures/mc/entity/sheep/sheep.png');
  const sheepWool = animalOf(MODELS.sheep, '../../assets/textures/mc/entity/sheep/sheep_fur.png', 0xffffff, .9);
  const sheepG = new T.Group(); sheepG.add(sheepSkin.root, sheepWool.root); scene.add(sheepG);
  const woolMeshes = sheepWool.meshes;

  /* БЫК: ванильная корова с рогами; медь/лысый — перекраска материала */
  const bull = animalOf(MODELS.cow, '../../assets/textures/mc/entity/cow/cow.png');
  const bullG = new T.Group(); bullG.add(bull.root); scene.add(bullG);
  const bullMat = bull.mat;

  /* КУСТ ЯГОД: зелёные кубы + красные ягоды */
  const berG = new T.Group();
  berG.add(box(.92, .74, .92, 0x2e5b2e, 0, .5, 0), box(.6, .5, .6, 0x3a6e34, .18, .86, -.1), box(.5, .44, .5, 0x33612f, -.24, .82, .14));
  const berries = [];
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    const b = box(.11, .11, .11, 0xc62828, Math.cos(a) * .5, .35 + (i % 4) * .19, Math.sin(a) * .5);
    berries.push(b); berG.add(b);
  }
  scene.add(berG);

  /* ДУБ-БРЕВНО: текстуры блока, кора снимается как топором */
  const logG = new T.Group();
  const barkMat = new T.MeshLambertMaterial({ map: texOf('../../assets/textures/mc/p2/block_oak_log.png') });
  const topMat = new T.MeshLambertMaterial({ map: texOf('../../assets/textures/mc/p2/block_oak_log_top.png') });
  const stripMat = new T.MeshLambertMaterial({ map: texOf('../../assets/textures/guest/stripped_oak_log.png') });
  const stripTop = new T.MeshLambertMaterial({ color: 0xb09050 });
  const logMesh = new T.Mesh(new T.BoxGeometry(.86, .86, 1.4), [barkMat, barkMat, topMat, topMat, barkMat, barkMat]);
  logMesh.position.y = .43; logMesh.rotation.y = .5;
  logG.add(logMesh);
  scene.add(logG);

  /* --- состояния: прячем/показываем с плавным масштабом --- */
  const tweens = [];
  const tw = (obj) => { obj.userData.tw = { v: obj.scale.x, vt: obj.scale.x }; tweens.push(obj.userData.tw); return obj.userData.tw; };
  woolMeshes.forEach(m => tw(m));
  berries.forEach(b => tw(b));

  const groups = { sheep: sheepG, bull: bullG, berries: berG, log: logG };
  let cur = 'sheep', lastDur = 500, pokeT = 0;
  const poke = () => (pokeT = .5);
  const apply = (d) => {
    if (!d) return;
    if (groups[d.t]) cur = d.t;
    for (const k in groups) groups[k].visible = (k === cur);
    /* овца: шерсть срезана → остаётся шкура */
    for (const u of tweens.slice(0, woolMeshes.length)) u.vt = d.sheep ? .001 : 1;
    /* бык: normal → корова, copper → медь, bald → розовая кожа */
    bullMat.color.setHex(d.bull === 'copper' ? 0xa06040 : d.bull === 'bald' ? 0xd09090 : 0xffffff);
    /* ягоды собраны */
    for (const b of berries) b.userData.tw.vt = d.berries ? .001 : 1;
    /* кора снята */
    logMesh.material = d.log ? [stripMat, stripMat, stripTop, stripTop, stripMat, stripMat] : [barkMat, barkMat, topMat, topMat, barkMat, barkMat];
    if (d.dur !== undefined && d.dur < lastDur) poke();
    if (d.dur !== undefined) lastDur = d.dur;
  };
  addEventListener('g4rcm', (e) => apply(e.detail));
  if (window.__G4RCM) apply(window.__G4RCM);
  else apply({ t: 'sheep', sheep: false, bull: 'normal', berries: false, log: false });

  host.classList.add('ready3d');
  looper(cv, (dt, t, w, h) => {
    fit(cv, renderer, camera);
    for (const u of tweens) u.v += (u.vt - u.v) * Math.min(1, dt * 9);
    for (const m of woolMeshes) { const v = Math.max(.001, m.userData.tw.v); m.scale.set(m.userData.base[0] * v, m.userData.base[1] * v, m.userData.base[2] * v); }
    for (const b of berries) b.scale.setScalar(Math.max(.001, b.userData.tw.v));
    /* живость: головы кивают, куст дышит, бревно покачивается */
    if (cur === 'sheep') sheepSkin.bones.head.rotation.x = Math.sin(t * 1.7) * .07;
    if (cur === 'bull') bull.bones.head.rotation.x = Math.sin(t * 1.3) * .06;
    if (cur === 'berries') { const s = 1 + Math.sin(t * 2.2) * .02; berG.scale.set(s, 1 / s, s); }
    if (cur === 'log') logMesh.rotation.y = .5 + Math.sin(t * .9) * .06;
    if (pokeT > 0) { pokeT -= dt; if (groups[cur]) groups[cur].position.y = Math.sin(pokeT * 12) * .06 * pokeT; }
    else if (groups[cur]) groups[cur].position.y = 0;

    const { yaw, pitch } = ob.step(dt);
    const dist = 4.35;
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, 1.0 + Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(0, .95, 0);
    renderer.render(scene, camera);
  });
} catch (e) { /* стенд остаётся на плоских иконках */ }
