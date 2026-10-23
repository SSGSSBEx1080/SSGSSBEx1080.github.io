/* Г-Н · 3D-сцены на three.js.
 * 1) НОЖ: воксельная сборка — каждый непрозрачный пиксель оригинальной
 *    текстуры nina_knife.png превращается в куб, получается объёмный
 *    пиксельный нож. Крути мышью, в покое он дрейфует сам.
 * 2) ПКМ-СТЕНД: объёмные овца, бык, куст ягод и дуб-бревно. Модель живёт
 *    в 3D: остриженная овца теряет шерсть, бык перекрашивается в медь
 *    или лысеет, куст отдаёт ягоды, с бревна снимается кора. Состояниями
 *    управляет app.js через событие 'g4rcm' — механики и прочность
 *    ножа честные и числятся там же, тут только картинка. */
import * as T from '../../shared/vendor/three/three.module.js';

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
    pitch = Math.max(.06, Math.min(1.25, drag.pitch + (e.clientY - drag.y) * .005));
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

  /* каждый непрозрачный пиксель 16×16 → цветной куб */
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
  const ob = orbit(cv, -.55, .38);

  scene.add(new T.HemisphereLight(0xfff0dd, 0x2a141a, 1.55));
  const key = new T.DirectionalLight(0xffffff, 1.05); key.position.set(2.2, 3.4, 2.8); scene.add(key);
  const rose = new T.DirectionalLight(0xe0576b, .4); rose.position.set(-2.6, 1.1, -2.2); scene.add(rose);

  /* подиум: низкополигональная ступень */
  const floor = new T.Mesh(new T.CylinderGeometry(1.62, 1.78, .16, 10), new T.MeshLambertMaterial({ color: 0x241319 }));
  floor.position.y = -.08; scene.add(floor);
  const rim = new T.Mesh(new T.TorusGeometry(1.63, .018, 6, 40), new T.MeshLambertMaterial({ color: 0xe0576b }));
  rim.rotation.x = Math.PI / 2; rim.position.y = .005; scene.add(rim);

  const box = (w, h, d, color, x, y, z) => {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshLambertMaterial({ color }));
    m.position.set(x, y, z); return m;
  };

  /* --- ОВЦА: шерсть + розово-песочная морда; стрижка снимает шерсть --- */
  const sheepG = new T.Group();
  const wool = [box(.8, .82, 1.14, 0xe4e4e4, 0, .98, 0), box(.94, .62, 1.02, 0xdcdcdc, .02, 1.02, -.04), box(.68, .9, .98, 0xdedede, -.04, .93, .03)];
  const skinBody = box(.62, .58, .96, 0xe8b2a6, 0, .9, 0); skinBody.scale.setScalar(.001);
  const headG = new T.Group(); headG.position.set(0, 1.22, .48);
  headG.add(box(.4, .42, .48, 0xe4e4e4, 0, 0, 0));
  headG.add(box(.32, .34, .06, 0xd0b080, 0, -.02, .25));           /* морда */
  headG.add(box(.05, .05, .05, 0x20140c, -.09, .06, .24));          /* глаза */
  headG.add(box(.05, .05, .05, 0x20140c, .09, .06, .24));
  const earL = box(.16, .1, .12, 0xd0b080, -.27, .05, 0), earR = box(.16, .1, .12, 0xd0b080, .27, .05, 0);
  headG.add(earL, earR);
  const legsS = [[-.26, -.4], [.26, -.4], [-.26, .4], [.26, .4]].map(([x, z]) => box(.15, .62, .15, 0xd8d3c8, x, .31, z));
  sheepG.add(...wool, skinBody, headG, ...legsS);
  scene.add(sheepG);

  /* --- БЫК: тёмная шерсть, рога, красные глаза; медь/лысый --- */
  const bullG = new T.Group();
  const bullMat = new T.MeshLambertMaterial({ color: 0x403020 });
  const bullBody = new T.Mesh(new T.BoxGeometry(.78, .74, 1.32), bullMat); bullBody.position.set(0, .98, 0);
  const bullHead = new T.Group(); bullHead.position.set(0, 1.18, .62);
  const bh = new T.Mesh(new T.BoxGeometry(.5, .46, .44), bullMat); bullHead.add(bh);
  bullHead.add(box(.36, .2, .07, 0x6a5238, 0, -.1, .24));           /* морда */
  bullHead.add(box(.06, .06, .06, 0xf00000, -.13, .07, .22));       /* глаза */
  bullHead.add(box(.06, .06, .06, 0xf00000, .13, .07, .22));
  const hornL = box(.09, .3, .09, 0xb8b8b8, -.26, .3, 0), hornR = box(.09, .3, .09, 0xb8b8b8, .26, .3, 0);
  hornL.rotation.z = .45; hornR.rotation.z = -.45; bullHead.add(hornL, hornR);
  const tail = box(.06, .52, .06, 0x33251a, 0, 1.12, -.68); tail.rotation.x = .35;
  const legsB = [[-.26, -.48], [.26, -.48], [-.26, .48], [.26, .48]].map(([x, z]) => box(.17, .62, .17, 0x33251a, x, .31, z));
  bullG.add(bullBody, bullHead, tail, ...legsB);
  scene.add(bullG);

  /* --- КУСТ ЯГОД: зелёные кубы + красные ягоды --- */
  const berG = new T.Group();
  berG.add(box(.92, .74, .92, 0x2e5b2e, 0, .5, 0), box(.6, .5, .6, 0x3a6e34, .18, .86, -.1), box(.5, .44, .5, 0x33612f, -.24, .82, .14));
  const berries = [];
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    const b = box(.11, .11, .11, 0xc62828, Math.cos(a) * .5, .35 + (i % 4) * .19, Math.sin(a) * .5);
    berries.push(b); berG.add(b);
  }
  scene.add(berG);

  /* --- ДУБ-БРЕВНО: текстуры блока, кора снимается как топором --- */
  const logG = new T.Group();
  const loader = new T.TextureLoader();
  const texOf = (p) => { const t = loader.load(p); t.colorSpace = T.SRGBColorSpace; t.magFilter = T.NearestFilter; t.minFilter = T.NearestMipmapNearestFilter; return t; };
  const barkMat = new T.MeshLambertMaterial({ map: texOf('../../assets/textures/mc/p2/block_oak_log.png') });
  const topMat = new T.MeshLambertMaterial({ map: texOf('../../assets/textures/mc/p2/block_oak_log_top.png') });
  const stripMat = new T.MeshLambertMaterial({ map: texOf('../../assets/textures/guest/stripped_oak_log.png') });
  const stripTop = new T.MeshLambertMaterial({ color: 0xb09050 });
  const logMesh = new T.Mesh(new T.BoxGeometry(.86, .86, 1.4), [barkMat, barkMat, topMat, topMat, barkMat, barkMat]);
  logMesh.position.y = .43; logMesh.rotation.y = .5;
  logG.add(logMesh);
  scene.add(logG);

  /* --- состояния: прячем/показываем с плавным масштабом --- */
  const tweens = [];   /* {obj, v: текущий, vt: цель} */
  const tw = (obj) => { obj.userData.tw = { v: obj.scale.x, vt: obj.scale.x }; tweens.push(obj.userData.tw); obj.userData.twRef = obj; return obj.userData.tw; };
  wool.forEach(w => { w.userData.isWool = true; tw(w); });
  skinBody.userData.isSkin = true; tw(skinBody);
  berries.forEach(b => { b.userData.isBerry = true; tw(b); });

  const groups = { sheep: sheepG, bull: bullG, berries: berG, log: logG };
  let cur = 'sheep', lastDur = 500;
  const apply = (d) => {
    if (!d) return;
    if (groups[d.t]) cur = d.t;
    for (const k in groups) groups[k].visible = (k === cur);
    /* овца */
    for (const w of wool) w.userData.tw.vt = d.sheep ? .001 : 1;
    skinBody.userData.tw.vt = d.sheep ? 1 : .001;
    /* бык: normal → тёмная шерсть, copper → медь, bald → розовая кожа */
    bullMat.color.setHex(d.bull === 'copper' ? 0xa06040 : d.bull === 'bald' ? 0xd09090 : 0x403020);
    /* ягоды собраны */
    for (const b of berries) b.userData.tw.vt = d.berries ? .001 : 1;
    /* кора снята */
    logMesh.material = d.log ? [stripMat, stripMat, stripTop, stripTop, stripMat, stripMat] : [barkMat, barkMat, topMat, topMat, barkMat, barkMat];
    if (d.dur !== undefined && d.dur < lastDur) poke();
    if (d.dur !== undefined) lastDur = d.dur;
  };
  let pokeT = 0;
  const poke = () => (pokeT = .5);
  addEventListener('g4rcm', (e) => apply(e.detail));
  if (window.__G4RCM) apply(window.__G4RCM);
  else apply({ t: 'sheep', sheep: false, bull: 'normal', berries: false, log: false });

  host.classList.add('ready3d');
  looper(cv, (dt, t, w, h) => {
    fit(cv, renderer, camera);
    for (const u of tweens) u.v += (u.vt - u.v) * Math.min(1, dt * 9);
    for (const o of [...wool, skinBody, ...berries]) { const s = Math.max(.001, o.userData.tw.v); o.scale.setScalar(s); }
    /* живость: головы кивают, хвост и уши покачиваются, куст дышит */
    const g = cur;
    if (g === 'sheep') { headG.rotation.x = Math.sin(t * 1.7) * .06; earL.rotation.z = Math.sin(t * 2.3) * .12; earR.rotation.z = -Math.sin(t * 2.1) * .12; }
    if (g === 'bull') { bullHead.rotation.x = Math.sin(t * 1.3) * .05; tail.rotation.z = Math.sin(t * 2.6) * .3; }
    if (g === 'berries') { const s = 1 + Math.sin(t * 2.2) * .02; berG.scale.set(s, 1 / s, s); }
    if (g === 'log') logMesh.rotation.y = .5 + Math.sin(t * .9) * .06;
    if (pokeT > 0) { pokeT -= dt; groups[g] && (groups[g].position.y = Math.sin(pokeT * 12) * .05 * pokeT); }
    else if (groups[g]) groups[g].position.y = 0;

    const { yaw, pitch } = ob.step(dt);
    const dist = 3.6;
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, .95 + Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(0, .9, 0);
    renderer.render(scene, camera);
  });
} catch (e) { /* стенд остаётся на плоских иконках */ }
