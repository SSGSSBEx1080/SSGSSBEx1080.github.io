/* №24 · Playable block-world test track. Locally bundled Three.js (MIT).
   World meshes and materials are procedural; the scooter itself is reconstructed
   from the exact source Bedrock geometry + scooters.png texture atlas. */
import * as T from '../../shared/vendor/three/three.module.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const noise = (x, z, seed = 0) => { const v = Math.sin(x * 127.1 + z * 311.7 + seed * 57.3) * 43758.5453; return v - Math.floor(v); };
const texture = (base, seed, kind = 'plain') => {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 16;
  const g = canvas.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 16, 16);
  for (let y = 0; y < 16; y += 2) for (let x = 0; x < 16; x += 2) {
    const n = noise(x, y, seed);
    g.fillStyle = n > .79 ? '#ffffff1f' : n < .21 ? '#00000020' : 'transparent'; g.fillRect(x, y, 2, 2);
  }
  if (kind === 'brick') { g.strokeStyle = '#21273399'; g.lineWidth = 1; for (let y = 0; y <= 16; y += 8) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(16, y + .5); g.stroke(); } }
  if (kind === 'grass') { g.fillStyle = '#a1c969'; for (let x = 0; x < 16; x += 4) if (noise(x, 4, seed) > .45) g.fillRect(x, 3, 2, 2); }
  const result = new T.CanvasTexture(canvas); result.magFilter = T.NearestFilter; result.minFilter = T.NearestFilter; result.colorSpace = T.SRGBColorSpace; return result;
};
const material = (base, seed, kind, extra = {}) => new T.MeshLambertMaterial({ map: texture(base, seed, kind), ...extra });
const COLORS = {
  grass: material('#679645', 1, 'grass'), grassSide: material('#6c6841', 2, 'grass'),
  dirt: material('#816248', 3, 'brick'), road: material('#5e666a', 4, 'brick'),
  roadTop: material('#777e80', 5, 'plain'), stone: material('#82929b', 6, 'brick'),
  obsidian: material('#242038', 7, 'brick'), leaves: material('#447e47', 8, 'grass'),
  trunk: material('#735343', 9, 'brick'), hay: material('#c6a64b', 10, 'grass'),
  honey: material('#ce9332', 11, 'plain'), water: material('#55a8c0', 12, 'plain', { transparent: true, opacity: .82 }),
  slime: material('#6eb85f', 13, 'plain'), glow: new T.MeshBasicMaterial({ color: 0xd7f839 }),
  white: new T.MeshBasicMaterial({ color: 0xf1ebbf }), charge: new T.MeshBasicMaterial({ color: 0x83f5e8 })
};
const blockGeo = new T.BoxGeometry(1, 1, 1);
function box(parent, x, y, z, w, h, d, mat) {
  const mesh = new T.Mesh(blockGeo, mat); mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function label(text, color = '#edffb1') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d'); g.fillStyle = '#12251ef0'; g.fillRect(0, 0, 256, 64);
  g.strokeStyle = color; g.lineWidth = 3; g.strokeRect(2, 2, 252, 60);
  g.fillStyle = color; g.font = 'bold 24px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 32);
  const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
  return new T.Mesh(new T.PlaneGeometry(4.2, 1.05), new T.MeshBasicMaterial({ map: tx, transparent: true, side: T.DoubleSide }));
}
function sourceScooter(geo, atlasUrl) {
  const root = new T.Group(), groups = {};
  const atlas = new T.TextureLoader().load(atlasUrl);
  atlas.colorSpace = T.SRGBColorSpace; atlas.magFilter = T.NearestFilter; atlas.minFilter = T.NearestFilter;
  atlas.wrapS = atlas.wrapT = T.ClampToEdgeWrapping;
  const mat = new T.MeshLambertMaterial({ map: atlas, transparent: true, alphaTest: .4, side: T.DoubleSide });
  const piv = a => new T.Vector3(-(a || [0, 0, 0])[0], (a || [0, 0, 0])[1], (a || [0, 0, 0])[2]);
  // Blockbench box UV as used by shared/geo3d.js, with y inversion for Three.js.
  function cuboidUV(size, at) {
    const [w, h, d] = size.map(v => Math.floor(v + 1e-6)), [u, v] = at;
    const faces = {
      east: [u, v + d, u + d, v + d + h], north: [u + d, v + d, u + d + w, v + d + h],
      west: [u + d + w, v + d, u + 2 * d + w, v + d + h], south: [u + 2 * d + w, v + d, u + 2 * d + 2 * w, v + d + h],
      up: [u + d, v, u + d + w, v + d], down: [u + d + w, v + d, u + d + 2 * w, v]
    };
    const g = new T.BoxGeometry(...size);
    // Three's box faces: +X, -X, +Y, -Y, +Z, -Z.
    const order = ['east', 'west', 'up', 'down', 'south', 'north'], uv = g.getAttribute('uv');
    order.forEach((face, i) => {
      const [a, b, c, d2] = faces[face];
      const pts = [[a, b], [c, b], [a, d2], [c, d2]];
      pts.forEach(([px, py], j) => uv.setXY(i * 4 + j, px / geo.tw, 1 - py / geo.th));
    });
    uv.needsUpdate = true; return g;
  }
  for (const bone of geo.bones) {
    const part = groups[bone.name] = new T.Group(), bp = piv(bone.pivot);
    const parent = groups[bone.parent]; part.position.copy(bp).sub(parent ? piv(geo.bones.find(b => b.name === bone.parent)?.pivot) : new T.Vector3());
    (parent || root).add(part);
    for (const c of bone.cubes || []) {
      const cp = piv(c.pivot || bone.pivot), center = new T.Vector3(-(c.origin[0] + c.size[0] / 2), c.origin[1] + c.size[1] / 2, c.origin[2] + c.size[2] / 2);
      const pivotGroup = new T.Group(); pivotGroup.position.copy(cp).sub(bp); part.add(pivotGroup);
      if (c.rotation) pivotGroup.rotation.set(-c.rotation[0] * Math.PI / 180, -c.rotation[1] * Math.PI / 180, c.rotation[2] * Math.PI / 180, 'ZYX');
      const mesh = new T.Mesh(cuboidUV(c.size, c.uv), mat); mesh.position.copy(center).sub(cp);
      mesh.castShadow = true; pivotGroup.add(mesh);
    }
  }
  // Geometry has its ground plane at y=0; scale 1 model pixel = .095 blocks.
  root.scale.setScalar(.095);
  return { root, front: groups.front_wheel, rear: groups.rear_wheel };
}
function rider() {
  const p = new T.Group();
  const skin = material('#d5a176', 22, 'plain'), shirt = material('#4a96b0', 23, 'plain'), pants = material('#3b507d', 24, 'plain'), hair = material('#483830', 25, 'plain');
  box(p, 0, 1.46, 0, .42, .43, .4, skin); box(p, 0, 1.69, -.015, .44, .13, .42, hair);
  box(p, 0, 1.0, 0, .43, .55, .29, shirt);
  box(p, -.3, 1.0, 0, .15, .52, .2, shirt); box(p, .3, 1.0, 0, .15, .52, .2, shirt);
  box(p, -.12, .47, .03, .16, .55, .21, pants); box(p, .12, .47, .03, .16, .55, .21, pants);
  return p;
}

function create({ canvas, getState, onCollision, onCheckpoint }) {
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' }); }
  catch (err) { console.warn('Block world unavailable; keeping 2D track', err); return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
  renderer.outputColorSpace = T.SRGBColorSpace;
  // The site must run on budget phones / software WebGL too. A contact shadow
  // is cheaper than rendering a second shadow pass over the entire voxel map.
  renderer.shadowMap.enabled = false;
  const scene = new T.Scene(); scene.background = new T.Color('#a8d9ec'); scene.fog = new T.Fog('#a8d9ec', 44, 112);
  const camera = new T.PerspectiveCamera(62, 1, .1, 200);
  scene.add(new T.HemisphereLight('#e4f3ff', '#5b6552', 2.1));
  const sun = new T.DirectionalLight('#fff4c8', 2.25); sun.position.set(-28, 55, -38);
  sun.castShadow = false; sun.shadow.mapSize.set(512, 512);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -40;
  sun.shadow.camera.right = sun.shadow.camera.top = 40;
  sun.shadow.normalBias = .04; scene.add(sun);
  const terrain = new T.Group(); scene.add(terrain);
  const decorations = new T.Group(); scene.add(decorations);
  const road = new T.Group(); scene.add(road);
  const player = new T.Group(); scene.add(player);
  const contactShadow = new T.Mesh(new T.CircleGeometry(1.35, 16),
    new T.MeshBasicMaterial({ color: '#22272c', transparent: true, opacity: .35, depthWrite: false, side: T.DoubleSide }));
  contactShadow.rotation.x = -Math.PI / 2; scene.add(contactShadow);
  const scooter = sourceScooter(window.ZM.P24G, '../../assets/textures/p24/scooters.png'); player.add(scooter.root);
  const crew = new T.Group(); player.add(crew);
  const avatar = [0, 1, 2, 3, 4].map((_, i) => {
    const p = rider(); p.scale.setScalar(i > 2 ? .62 : .72);
    p.position.set(i % 2 ? .26 : -.26, .48, -.82 + i * .58);
    crew.add(p); return p;
  });
  // Use instancing for the hundreds of Minecraft-style voxel columns.
  const worldTiles = [], roadTiles = [], dummy = new T.Object3D();
  const ground = new T.InstancedMesh(blockGeo,
    [COLORS.grassSide, COLORS.grassSide, COLORS.grass, COLORS.dirt, COLORS.grassSide, COLORS.grassSide], 34 * 70);
  ground.receiveShadow = true; terrain.add(ground);
  const roadMesh = new T.InstancedMesh(blockGeo,
    [COLORS.road, COLORS.road, COLORS.roadTop, COLORS.road, COLORS.road, COLORS.road], 6 * 70);
  roadMesh.receiveShadow = true; road.add(roadMesh);
  for (let z = -98; z < 42; z += 2) for (let x = -34; x < 34; x += 2) {
    const rough = Math.floor(noise(x / 2, z / 2, 50) * 3) * .36;
    if (Math.abs(x) < 6) roadTiles.push({ x, z });
    else worldTiles.push({ x, z, rough });
  }
  const PATH = {
    asphalt: COLORS.roadTop, water: COLORS.water, honey: COLORS.honey,
    hay: COLORS.hay, slime: COLORS.slime
  };
  const markers = [];
  const stations = [], obstacle = [];
  function tree(x, z, tall = 0) {
    const g = new T.Group(); g.position.set(x, 0, z); decorations.add(g);
    const h = 2.5 + tall; box(g, 0, h / 2, 0, .65, h, .65, COLORS.trunk);
    box(g, 0, h + .45, 0, 2.2, 1.5, 2.2, COLORS.leaves);
    box(g, 0, h + 1.3, 0, 1.4, .7, 1.4, COLORS.leaves);
    markers.push({ object: g, x, z, lift: 0 });
  }
  for (let z = -92; z <= 38; z += 10) {
    tree(-13 - Math.floor(noise(2, z) * 10), z + Math.floor(noise(3, z) * 5), noise(4, z));
    if (z % 20 === 8 || noise(z, 8) > .3) tree(14 + Math.floor(noise(5, z) * 10), z + 4, noise(6, z));
  }
  const finish = [-16, -52, -86];
  finish.forEach((z, i) => {
    const gate = new T.Group(); decorations.add(gate);
    box(gate, -6.7, 1.75, 0, .45, 3.5, .45, COLORS.stone);
    box(gate, 6.7, 1.75, 0, .45, 3.5, .45, COLORS.stone);
    box(gate, 0, 3.55, 0, 13.85, .33, .4, COLORS.glow);
    const name = label(`CHECKPOINT 0${i + 1}`); name.position.set(0, 2.75, 0); gate.add(name);
    gate.position.z = z; markers.push({ object: gate, x: 0, z, lift: 0 });
  });
  function wall(x, z, kind, size = 1) {
    const g = new T.Group(); g.position.set(x, 0, z); decorations.add(g);
    const mat = kind === 'obsidian' ? COLORS.obsidian : kind === 'slime' ? COLORS.slime : COLORS.stone;
    for (let y = 0; y < (kind === 'stone' ? 2 : 3); y++) for (let dx = -size; dx <= size; dx++)
      box(g, dx * 1.2, y * 1.2 + .6, 0, 1.19, 1.19, 1.2, mat);
    markers.push({ object: g, x, z, lift: 0 }); obstacle.push({ x, z, kind, width: size * 1.2 + .8 });
  }
  wall(0, -32, 'stone', 1); wall(5, -62, 'slime', 0); wall(-4, -78, 'obsidian', 1);
  // Physical charging station: park within 2 X/Z blocks and stop moving.
  const charger = new T.Group(); charger.position.set(8, 0, 14); decorations.add(charger);
  box(charger, 0, .55, 0, 2.4, 1.1, 2.4, COLORS.obsidian);
  const column = box(charger, 0, 2.15, 0, 1.2, 2.2, 1.2, COLORS.charge);
  box(charger, 0, 3.42, 0, 1.8, .4, 1.8, COLORS.stone);
  const sign = label('CHARGE 1% / S', '#85f5ed'); sign.position.set(-1.5, 3.05, 0); sign.rotation.y = -.3; charger.add(sign);
  const point = new T.PointLight('#80fff1', 3.2, 10); point.position.set(0, 3, 0); charger.add(point);
  markers.push({ object: charger, x: 8, z: 14, lift: 0 }); stations.push(charger);
  // Painted stripe + blocky caution chevrons make the route navigable.
  for (let z = -94; z <= 36; z += 10) {
    const dash = box(road, 0, .09, z, .22, .035, 4, COLORS.white);
    markers.push({ object: dash, x: 0, z, lift: .09 });
  }
  const skyGroup = new T.Group(); scene.add(skyGroup);
  for (let i = 0; i < 6; i++) {
    const cx = -48 + i * 19, cz = -65 - i * 18, cloud = new T.Group();
    cloud.position.set(cx, 22 + i % 3 * 3, cz);
    for (let j = -1; j <= 1; j++) box(cloud, j * 2, j === 0 ? .45 : 0, 0, 3, 1.25, 2, new T.MeshBasicMaterial({ color: 0xeef9f4 }));
    skyGroup.add(cloud);
  }
  const loc = { x: 0, z: 28, heading: 0, nearPort: false, checkpoint: 0, grade: '', surface: '', mode: 'chase', cooldown: 0 };
  function height(z, grade = loc.grade) { return (grade === 'down' ? .085 : grade === 'up' ? -.085 : 0) * (z - 28); }
  function rebuild(grade, surface) {
    loc.grade = grade; loc.surface = surface;
    let i = 0;
    for (const p of worldTiles) {
      const y = height(p.z) + p.rough;
      dummy.position.set(p.x, y - 1, p.z); dummy.scale.set(2, 2.2, 2); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); ground.setMatrixAt(i++, dummy.matrix);
    }
    ground.count = i; ground.instanceMatrix.needsUpdate = true;
    i = 0;
    for (const p of roadTiles) {
      dummy.position.set(p.x, height(p.z) + .08, p.z); dummy.scale.set(2, .16, 2); dummy.updateMatrix(); roadMesh.setMatrixAt(i++, dummy.matrix);
    }
    roadMesh.count = i; roadMesh.instanceMatrix.needsUpdate = true;
    // Change the actual lane material, not just an HTML background tint.
    const faces = roadMesh.material.slice(); faces[2] = PATH[surface]; roadMesh.material = faces;
    for (const mark of markers) mark.object.position.y = height(mark.z) + mark.lift;
  }
  rebuild('flat', 'asphalt');
  // Lightweight block particles at the rear wheel, pooled rather than created
  // every frame. They animate even when movement is updated at 20 ticks/s.
  const dust = Array.from({ length: 14 }, (_, i) => {
    const p = box(scene, 0, -99, 0, .11, .11, .11, i % 2 ? COLORS.dirt : COLORS.stone);
    return { mesh: p, life: 0, age: 0, vx: 0, vy: 0, vz: 0 };
  });
  function park() { loc.x = 8; loc.z = 16; loc.heading = 0; loc.cooldown = .6; }
  function reset() { loc.x = 0; loc.z = 28; loc.heading = 0; loc.checkpoint = 0; loc.cooldown = .5; }
  function tick(state, dt = .05) {
    if (state.grade !== loc.grade || state.surface !== loc.surface) rebuild(state.grade, state.surface);
    loc.cooldown = Math.max(0, loc.cooldown - dt);
    if (state.owned) {
      const speed = state.speed * .5 * (dt / .05); // original MOVE_SCALE=.5 per 20-tick step
      const load = clamp((state.passengers - 1) * .14, 0, .56);
      const steer = Number(!!state.keys.right) - Number(!!state.keys.left);
      // Mass slows turning; no pivot while stopped, except minimal parking turn.
      loc.heading += steer * (Math.abs(speed) > .01 ? .045 : .014) * (1 - load * .45) * Math.sign(state.speed || 1);
      loc.x += Math.sin(loc.heading) * speed;
      loc.z -= Math.cos(loc.heading) * speed;
      if (Math.abs(loc.x) > 30 || loc.z < -94 || loc.z > 39) {
        loc.x = clamp(loc.x, -30, 30); loc.z = clamp(loc.z, -94, 39);
        state.speed *= -.18;
        if (!loc.cooldown) { loc.cooldown = 1; onCollision({ kind: 'border', speed: Math.abs(state.speed * 72) }); }
      }
      if (!loc.cooldown) for (const o of obstacle) {
        if (Math.abs(loc.x - o.x) < o.width + .35 && Math.abs(loc.z - o.z) < 1.1) {
          const impactSpeed = Math.abs(state.speed * 72);
          if (o.kind === 'slime') { loc.heading += Math.PI; loc.z += 2; }
          else { loc.z += speed > 0 ? 1.4 : -1.4; state.speed *= .22; }
          loc.cooldown = 1.1;
          onCollision({ kind: o.kind, speed: impactSpeed }); break;
        }
      }
      const reached = finish.findIndex((z, i) => loc.z < z && loc.checkpoint === i);
      if (reached >= 0) { loc.checkpoint = reached + 1; onCheckpoint(reached + 1); }
    }
    player.position.set(loc.x, height(loc.z) + .12, loc.z);
    contactShadow.position.set(loc.x, height(loc.z) + .175, loc.z);
    contactShadow.visible = state.owned;
    player.rotation.y = -loc.heading;
    avatar.forEach((p, i) => { p.visible = state.owned && state.passengers > i && loc.mode === 'chase'; });
    scooter.root.visible = loc.mode === 'chase';
    loc.nearPort = Math.abs(loc.x - 8) <= 2 && Math.abs(loc.z - 14) <= 2;
    return { x: loc.x, z: loc.z, nearPort: loc.nearPort, heading: loc.heading, checkpoint: loc.checkpoint };
  }
  let last = 0, frame = 0, visible = true;
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { threshold: .01 });
  observer.observe(canvas);
  function render(now) {
    requestAnimationFrame(render);
    // GPU work while scrolled away is wasteful; 30 fps is enough for a voxel
    // world on phones and avoids starving input, scroll and the other WebGL hero.
    if (document.hidden || !visible || now - last < 32) return;
    const dt = Math.min(.06, (now - last) / 1000 || .033); last = now;
    const state = getState();
    {
      const rect = canvas.getBoundingClientRect(), w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
      if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
        renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      }
      const heading = loc.heading, fx = Math.sin(heading), fz = -Math.cos(heading);
      const look = new T.Vector3(loc.x + fx * (loc.mode === 'first' ? 13 : 4), height(loc.z) + (loc.mode === 'first' ? 1.8 : 1.4), loc.z + fz * (loc.mode === 'first' ? 13 : 4));
      const desired = loc.mode === 'first'
        ? new T.Vector3(loc.x, height(loc.z) + 1.73, loc.z)
        : new T.Vector3(loc.x - fx * 8, height(loc.z) + 5.1, loc.z - fz * 8);
      camera.position.lerp(desired, Math.min(1, dt * (loc.mode === 'first' ? 14 : 5)));
      camera.lookAt(look);
      if (state.owned && Math.abs(state.speed) > .05 && loc.mode === 'chase') {
        scooter.front.rotation.x += state.speed * dt * 4;
        scooter.rear.rotation.x += state.speed * dt * 4;
        scooter.root.position.y = Math.sin(now * .021) * .012;
        if (++frame % 3 === 0) {
          const p = dust.find(x => x.life <= 0);
          if (p) { p.mesh.position.set(loc.x - fx * 1.28, height(loc.z) + .25, loc.z - fz * 1.28); p.life = .42;
            p.vx = (noise(now, 1) - .5) * 1.5; p.vz = (noise(1, now) - .5) * 1.5; p.vy = .45; p.mesh.visible = true; }
        }
      }
      for (const p of dust) {
        if (p.life <= 0) { p.mesh.visible = false; continue; }
        p.life -= dt; p.mesh.position.x += p.vx * dt; p.mesh.position.y += p.vy * dt; p.mesh.position.z += p.vz * dt;
        p.mesh.scale.setScalar(clamp(p.life * .35, .01, .2));
      }
      column.scale.y = 2.2 + Math.sin(now * .004) * .16;
      point.intensity = 2.5 + Math.sin(now * .004) * .7;
      renderer.render(scene, camera);
    }
  }
  requestAnimationFrame(render);
  return {
    tick, park, reset, get location() { return { ...loc }; },
    setCameraMode(mode) { loc.mode = mode === 'first' ? 'first' : 'chase'; },
    get cameraMode() { return loc.mode; },
    supported: true
  };
}
window.ZMScooterWorld = { create };
window.dispatchEvent(new Event('scooterworldready'));
