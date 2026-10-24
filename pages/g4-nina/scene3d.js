/* Г-Н · 3D-сцены на three.js.
 * 1) НОЖ — только плоская текстура из мода (2D, одна текстура):
 *    по требованию автора объёмная воксельная модель убрана.
 * 2) ПКМ-СТЕНД: овца и бык собраны из ванильной геометрии sheep/cow geo
 *    с настоящими текстурами. Шерсть овцы — как в ява-модели SheepModel:
 *    тело inflate 1.375, голова 1.0 с открытым лицом, на ногах — короткие
 *    шерстяные «штанишки» 4×6×4 (низ ног открыт). У быка рога и морда
 *    не перекрашиваются при стрижке — отдельный материал без тонировки.
 *    КУСТ ЯГОД — как в игре: крест из двух плоскостей с настоящими
 *    текстурами sweet_berry_bush_stage, стоит НА БЛОКЕ СНЕГА; после сбора
 *    показывает стадию 1 (в ваниле собранный куст отрастает с неё).
 *    БРЕВНО — полноразмерный блок: кора по бокам, спилы по торцам;
 *    после ПКМ — отёсанное бревно с настоящими текстурами.
 * 3) ШАХТА: соляная руда объёмным блоком, трещины — подлинные
 *    destroy_stage_0..9 на накладном кубе. Состояниями управляет app.js
 *    ('g4rcm' / 'g4mine') — механики честные, тут только картинка. */
import * as T from '../../shared/vendor/three/three.module.js';
import { MODELS } from '../../shared/entity_models.js';

const DPR = Math.min(devicePixelRatio || 1, 1.5);
const webgl2 = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } })();

/* орбита: тяни мышью/пальцем; отпустил — камера медленно дрейфует сама */
function orbit(cv, yaw0, pitch0) {
  let yaw = yaw0, pitch = pitch0, drag = null, idleAt = 0;
  cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', e => { if (e.button !== 0) return; drag = { x: e.clientX, y: e.clientY, yaw, pitch }; idleAt = performance.now(); try { cv.setPointerCapture(e.pointerId); } catch (_) { } });
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
 * 1. ПКМ-СТЕНД: овца · бык · куст ягод · дуб-бревно
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
  function animalOf(model, texPath, tint = 0xffffff, inflate = 0, untint) {
    const [TW, TH] = model.tex;
    const mat = new T.MeshLambertMaterial({ map: texOf(texPath), color: tint, alphaTest: .4 });
    /* рога/морда быка — свой материал без тонировки, чтобы медь/лысый красили только шкуру */
    const plain = untint ? new T.MeshLambertMaterial({ map: mat.map }) : null;
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
        const m = new T.Mesh(geo, untint && untint(c) ? plain : mat);
        m.position.set((c.o[0] + c.s[0] / 2 - b.p[0]) / 16, (c.o[1] + c.s[1] / 2 - b.p[1]) / 16, (c.o[2] + c.s[2] / 2 - b.p[2]) / 16);
        const inf = c.inf !== undefined ? c.inf : inflate;
        if (inf) m.scale.set((c.s[0] + 2 * inf) / c.s[0], (c.s[1] + 2 * inf) / c.s[1], (c.s[2] + 2 * inf) / c.s[2]);
        m.userData.base = [m.scale.x, m.scale.y, m.scale.z];
        g.add(m); meshes.push(m);
      }
      root.add(g); bones[b.n] = g;
    }
    root.rotation.y = Math.PI;   /* geo смотрит в −Z — разворачиваем лицом к камере */
    return { root, bones, mat, meshes };
  }

  /* ОВЦА: шкура + слой шерсти точно как в ява SheepModel —
   * тело inflate 1.375, голова inflate 1.0 (в sheep_fur лицо открыто),
   * на ногах короткие «штанишки» 4×6×4 с inflate 0.5 — низ ног голый. */
  const sheepSkin = animalOf(MODELS.sheep, '../../assets/textures/mc/entity/sheep/sheep.png');
  const SHEEP_WOOL = {
    tex: [64, 32], bones: [
      { n: 'body', p: [0, 19, 2], r: [90, 0, 0], c: [{ s: [8, 16, 6], o: [-4, 13, -5], uv: [28, 8], inf: 1.375 }] },
      { n: 'head', p: [0, 18, -8], c: [{ s: [6, 6, 8], o: [-3, 16, -14], uv: [0, 0], inf: 1.0 }] },
      { n: 'leg0', p: [-3, 12, 7], c: [{ s: [4, 6, 4], o: [-5, 6, 5], uv: [0, 16], inf: .5 }] },
      { n: 'leg1', p: [3, 12, 7], c: [{ s: [4, 6, 4], o: [1, 6, 5], uv: [0, 16], inf: .5 }] },
      { n: 'leg2', p: [-3, 12, -5], c: [{ s: [4, 6, 4], o: [-5, 6, -7], uv: [0, 16], inf: .5 }] },
      { n: 'leg3', p: [3, 12, -5], c: [{ s: [4, 6, 4], o: [1, 6, -7], uv: [0, 16], inf: .5 }] },
    ],
  };
  const sheepWool = animalOf(SHEEP_WOOL, '../../assets/textures/mc/entity/sheep/sheep_fur.png');
  const sheepG = new T.Group(); sheepG.add(sheepSkin.root, sheepWool.root); scene.add(sheepG);
  const woolMeshes = sheepWool.meshes;

  /* БЫК: ванильная корова; медь/лысый красят шкуру, рога [1×3×1] остаются природными */
  const bull = animalOf(MODELS.cow, '../../assets/textures/mc/entity/cow/cow.png', 0xffffff, 0, (c) => c.s[0] === 1 && c.s[1] === 3 && c.s[2] === 1);
  const bullG = new T.Group(); bullG.add(bull.root); scene.add(bullG);
  const bullMat = bull.mat;

  /* КУСТ ЯГОД — как в игре: крест из двух плоскостей со стадийными
   * текстурами, стоит на настоящем блоке снега. Собран → стадия 1. */
  const berG = new T.Group();
  const snowMat = new T.MeshLambertMaterial({ map: texOf('../../assets/textures/p25/i/snow_block.png') });
  const snowBlock = new T.Mesh(new T.BoxGeometry(1, 1, 1), snowMat);
  snowBlock.position.y = .5; berG.add(snowBlock);
  const bushTex = (st) => texOf(`../../assets/textures/mc/van/sweet_berry_bush_stage${st}.png`);
  const bushMat = new T.MeshLambertMaterial({ map: bushTex(3), alphaTest: .5, side: T.DoubleSide });
  const bushCross = new T.Group();
  for (const a of [Math.PI / 4, -Math.PI / 4]) {
    const q = new T.Mesh(new T.PlaneGeometry(1, 1), bushMat);
    q.rotation.y = a; q.position.y = 1.5;
    bushCross.add(q);
  }
  berG.add(bushCross);
  scene.add(berG);

  /* ДУБ-БРЕВНО: полноразмерный блок — кора по бокам, спилы по торцам */
  const logG = new T.Group();
  const barkMat = new T.MeshLambertMaterial({ map: texOf('../../assets/textures/mc/p2/block_oak_log.png') });
  const topMat = new T.MeshLambertMaterial({ map: texOf('../../assets/textures/mc/p2/block_oak_log_top.png') });
  const stripMat = new T.MeshLambertMaterial({ map: texOf('../../assets/textures/guest/stripped_oak_log.png') });
  const stripTop = new T.MeshLambertMaterial({ map: texOf('../../assets/textures/mc/van/stripped_oak_log_top.png') });
  const logMesh = new T.Mesh(new T.BoxGeometry(1, 1, 1), [barkMat, barkMat, topMat, topMat, barkMat, barkMat]);
  logMesh.position.y = .5; logMesh.rotation.y = .5;
  logG.add(logMesh);
  scene.add(logG);

  /* --- состояния: прячем/показываем с плавным масштабом --- */
  const tweens = [];
  const tw = (obj) => { obj.userData.tw = { v: obj.scale.x, vt: obj.scale.x }; tweens.push(obj.userData.tw); return obj.userData.tw; };
  woolMeshes.forEach(m => tw(m));

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
    /* ягоды собраны: куст отрастает со стадии 1, как в ваниле */
    bushMat.map = bushTex(d.berries ? 1 : 3); bushMat.needsUpdate = true;
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
    /* живость: головы кивают, куст дышит, бревно покачивается */
    if (cur === 'sheep') { sheepSkin.bones.head.rotation.x = Math.sin(t * 1.7) * .07; sheepWool.bones.head.rotation.x = sheepSkin.bones.head.rotation.x; }
    if (cur === 'bull') bull.bones.head.rotation.x = Math.sin(t * 1.3) * .06;
    if (cur === 'berries') { bushCross.rotation.z = Math.sin(t * 1.6) * .045; bushCross.rotation.x = Math.cos(t * 1.1) * .03; }
    if (cur === 'log') logMesh.rotation.y = .5 + Math.sin(t * .9) * .06;
    if (pokeT > 0) { pokeT -= dt; if (groups[cur]) groups[cur].position.y = Math.sin(pokeT * 12) * .06 * pokeT; }
    else if (groups[cur]) groups[cur].position.y = 0;

    const { yaw, pitch } = ob.step(dt);
    const dist = 4.6;
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, 1.05 + Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(0, 1.0, 0);
    renderer.render(scene, camera);
  });
} catch (e) { /* стенд остаётся на плоских иконках */ }

/* текстуры для шахты (свой загрузчик — вне области первой сцены) */
const texOf2 = (p) => { const t = new T.TextureLoader().load(p); t.colorSpace = T.SRGBColorSpace; t.magFilter = T.NearestFilter; t.minFilter = T.NearestMipmapNearestFilter; return t; };


/* =====================================================================
 * 2. ШАХТА: соляная руда — объёмный блок с настоящими трещинами
 * ===================================================================== */
try {
  const btn = document.querySelector('#mineBlock'), cv = document.querySelector('#mine3d');
  if (!btn || !cv) throw Error('нет места под шахту');
  if (!webgl2) throw Error('WebGL2 недоступен');
  const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(DPR);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(30, 1, .1, 30);
  scene.add(new T.HemisphereLight(0xfff4e2, 0x241319, 1.45));
  const key = new T.DirectionalLight(0xffffff, .95); key.position.set(2.4, 3.4, 2.2); scene.add(key);
  const back = new T.DirectionalLight(0xe0576b, .3); back.position.set(-2.4, 1.4, -2.4); scene.add(back);

  const G = new T.Group(); scene.add(G);
  /* руда: блок соли в камне — текстура блока из мода на все грани */
  const ore = new T.Mesh(new T.BoxGeometry(1, 1, 1),
    new T.MeshLambertMaterial({ map: texOf2('../../assets/textures/guest/salt_ore.png') }));
  G.add(ore);
  /* под ним — каменный постамент, как жила в глубине */
  const bed = new T.Mesh(new T.BoxGeometry(1.24, .3, 1.24),
    new T.MeshLambertMaterial({ map: texOf2('../../assets/textures/mc/stone.png') }));
  bed.position.y = -.62; G.add(bed);

  /* трещины: подлинные destroy_stage_0..9 на чуть увеличенном кубе */
  const crackTex = Array.from({ length: 10 }, (_, i) => texOf2(`../../assets/textures/mc/destroy_stage_${i}.png`));
  const crackMat = new T.MeshBasicMaterial({ map: crackTex[0], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const cracks = new T.Mesh(new T.BoxGeometry(1.004, 1.004, 1.004), crackMat);
  cracks.visible = false; G.add(cracks);

  let stage = 0;
  addEventListener('g4mine', (e) => {
    stage = e.detail && e.detail.stage || 0;
    const show = stage > 0.15;
    cracks.visible = show;
    if (show) crackMat.map = crackTex[Math.min(9, Math.floor(stage))];
  });

  btn.classList.add('ready3d');
  looper(cv, (dt, t, w, h) => {
    fit(cv, renderer, camera);
    /* лёгкое «дыхание» жилы: медленный поворот, не мешает прицеливанию */
    G.rotation.y = Math.sin(t * .34) * .3;
    G.position.y = Math.sin(t * .8) * .018;
    camera.position.set(1.9, 1.55, 2.7);
    camera.lookAt(0, -.06, 0);
    renderer.render(scene, camera);
  });
} catch (e) { /* шахта остаётся на плоской текстуре с 2D-трещинами */ }
