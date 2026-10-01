/* Static checks for the shared advancement tree, pages and model UVs.
   Run: node tools/test_site.js */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const ctx = {}; ctx.window = ctx;
for (const f of ['shared/points.js', 'data/hub_adv.js', 'data/p20_models.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
}
const { POINTS, HUB_ADV, P20M } = ctx.ZM;
const live = POINTS.filter(p => p.page);
function checkFavicons(html, stem, prefix) {
  for (const size of [32, 64]) {
    const name = `${stem}-${size}.png`, file = path.join(root, 'assets/favicons', name);
    assert.ok(html.includes(`rel="icon" type="image/png" sizes="${size}x${size}" href="${prefix}${name}"`), `${stem}: missing ${size}px tab icon link`);
    assert.ok(fs.existsSync(file), `${stem}: icon missing on disk`);
    const png = fs.readFileSync(file);
    assert.equal(png.subarray(1, 4).toString(), 'PNG', `${name}: PNG signature`);
    assert.equal(png.readUInt32BE(16), size, `${name}: width`);
    assert.equal(png.readUInt32BE(20), size, `${name}: height`);
  }
}
checkFavicons(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), 'home', 'assets/favicons/');
assert.equal(HUB_ADV.length, live.length, 'Every live point must have a branch in the hub');
for (const p of live) {
  const branch = HUB_ADV.find(b => b.n === p.n);
  assert.ok(branch, `Missing branch for #${p.n}`);
  assert.equal(branch.page, p.page);
  assert.equal(branch.store, `p${String(p.n).padStart(2, '0')}.adv`);
  assert.ok(fs.existsSync(path.join(root, p.page)), `Missing page: ${p.page}`);
  assert.ok(fs.existsSync(path.join(root, p.icon)), `Missing point icon: ${p.icon}`);
  const html = fs.readFileSync(path.join(root, p.page), 'utf8');
  checkFavicons(html, `p${String(p.n).padStart(2, '0')}`, '../../assets/favicons/');
  assert.match(html, /data\/hub_adv\.js/, `Page #${p.n} must load the shared branch`);
  assert.match(html, /shared\/core\.js/, `Page #${p.n} must load progress sync`);
  const anchor = p.n === 1 ? 'id="tree"' : 'id="adv"';
  const treeAt = html.indexOf(`<section class="${p.n === 1 ? 'block-sec' : (p.n === 6 ? 'lb-sec' : 'sec')}" ${anchor}`);
  assert.ok(treeAt >= 0, `Missing achievement section on #${p.n}`);
  const endAt = html.indexOf(p.n === 1 ? '<footer class="page-foot"' : 'id="finale"', treeAt);
  assert.ok(endAt > treeAt, `Achievements must be at the bottom on #${p.n}`);
  // Restored latest #22/#23 and newly published #25 keep their version history after achievements.
  if (![22, 23, 25].includes(p.n)) assert.ok(!/<section\b[^>]*id="(?!finale)[^"]+"/.test(html.slice(treeAt + 12, endAt)), `Another section follows achievements on #${p.n}`);
  assert.equal((html.match(/id="advChain"/g) || []).length, 1, `Exactly one interactive achievement board on #${p.n}`);
  const keys = new Set(branch.adv.map(a => a.key));
  assert.equal(keys.size, branch.adv.length, `Duplicate advancement in #${p.n}`);
  for (const a of branch.adv) {
    assert.ok(a.icon && fs.existsSync(path.join(root, a.icon)), `Missing icon for #${p.n}:${a.key}`);
    assert.ok(!a.parent || keys.has(a.parent), `Missing parent for #${p.n}:${a.key}`);
  }
}
assert.equal(POINTS.find(p => p.n === 22).page, 'pages/22-milk/index.html');
assert.equal(HUB_ADV.find(p => p.n === 22).adv.length, 6);
assert.equal(POINTS.find(p => p.n === 23).page, 'pages/23-max/index.html');
assert.equal(HUB_ADV.find(p => p.n === 23).adv.length, 4);
const maxHtml = fs.readFileSync(path.join(root, 'pages/23-max/index.html'), 'utf8');
const maxApp = fs.readFileSync(path.join(root, 'pages/23-max/app.js'), 'utf8');
assert.match(maxApp, /ZM\.reveal\(\)/, 'Restored MAX sections must be revealed');
// Restored latest published #23, not the unrelated five-contact experiment.
for (const id of ['heroIcon', 'heroNotif', 'iconWrap', 'advChain']) {
  assert.ok(maxHtml.includes(`id="${id}"`), `Restored MAX control ${id} missing`);
}
for (const name of ['Nagibator3000', 'Ksyusha_mc', 'Oleg_Pro', 'Dimon']) {
  assert.ok(maxApp.includes(name), `Restored MAX contact ${name} missing`);
}
assert.match(maxApp, /const BOTS =/, 'Latest messenger contacts missing');
assert.match(maxApp, /botAct\(V\.sel\)/, 'Messenger replies must remain interactive');
assert.doesNotMatch(maxHtml, /dialogue\.js/, 'Do not swap in the different MAX redesign');
assert.equal(POINTS.find(p => p.n === 25).page, 'pages/25-cloaks/index.html');
assert.equal(HUB_ADV.find(p => p.n === 25).adv.length, 7);
assert.equal(POINTS.find(p => p.n === 24).page, 'pages/24-scooter/index.html');
assert.equal(HUB_ADV.find(p => p.n === 24).adv.length, 3);
assert.equal(POINTS.find(p => p.n === 24).icon, 'assets/textures/p24/scooter_item.png');
assert.equal(HUB_ADV.find(p => p.n === 24).adv.map(a => a.icon).join('|'), [
  'assets/textures/p24/scooter_item.png',
  'assets/textures/mc/p2/item_redstone.png',
  'assets/textures/p3/vanilla/item_barrier.png'
].join('|'), 'Bottom and home advancement icons must follow the real in-game items');
const scooterHtml = fs.readFileSync(path.join(root, 'pages/24-scooter/index.html'), 'utf8');
assert.match(scooterHtml, /id="rideCanvas"/, '2D simulator canvas must exist');
assert.doesNotMatch(scooterHtml, /ride3d\.js|hero3d|worldCam/, 'Rejected 3D track must not be loaded');
for (const id of ['stationGrid', 'stationMap', 'crewRows', 'getScooter', 'cruise', 'go', 'brake', 'stationCharge', 'getPort', 'quickTrip']) {
  assert.ok(scooterHtml.includes(`id="${id}"`), `Scooter interactive control ${id} missing`);
}
vm.runInNewContext(fs.readFileSync(path.join(root, 'data/p24_station.js'), 'utf8'), ctx);
const station = ctx.ZM.P24ST;
assert.equal(String(station.size), '10,6,11', 'Station plan must use real NBT dimensions');
assert.equal(station.blocks.filter(([x,y,z,i]) => station.palette[i] === 'zitraksmode:charging_port').map(([x,y,z]) => `${x},${y},${z}`).join('|'),
  '2,1,3|2,1,5|2,1,7', 'All 3 source station ports must be present');
assert.equal(station.blocks.length, 198, 'Preserve every non-air template block');
assert.ok(fs.existsSync(path.join(root, 'mod-src/structures/scooter_station.nbt')));
assert.match(fs.readFileSync(path.join(root, 'pages/24-scooter/app.js'), 'utf8'), /mass - 1\) \/ 24/, 'Simulator must use source mass formula');
assert.match(fs.readFileSync(path.join(root, 'mod-src/java/p24/ScooterMassHelper.java'), 'utf8'), /IRON_GOLEM\) return 8\.0D/, 'Authentic mass helper missing');
// The original Google Drive mod resources, not re-created art, must power №24.
for (const name of ['charging_port_front.png', 'charging_port_side.png',
  'charging_port_top.png', 'charging_port_bottom.png']) {
  assert.ok(fs.readFileSync(path.join(root, 'assets/textures/p24', name)).equals(
    fs.readFileSync(path.join(root, 'mod-src/textures/block', name))), `${name} must match the original mod PNG byte for byte`);
}
for (const [name, runtime] of [['scooter.png', 'scooter_item.png'], ['charging_port.png', 'charging_port_item.png']]) {
  assert.ok(fs.readFileSync(path.join(root, 'assets/textures/p24', runtime)).equals(
    fs.readFileSync(path.join(root, 'mod-src/textures/item', name))), `${runtime} must be the game item, not a redraw`);
}
const portModel = JSON.parse(fs.readFileSync(path.join(root, 'mod-src/models/block/charging_port.json')));
assert.equal(portModel.parent, 'minecraft:block/orientable');
for (const face of ['front', 'side', 'top', 'bottom'])
  assert.equal(portModel.textures[face], `zitraksmode:block/charging_port_${face}`);
const scooterItemModel = JSON.parse(fs.readFileSync(path.join(root, 'mod-src/models/item/scooter.json')));
assert.equal(scooterItemModel.textures.layer0, 'zitraksmode:item/scooter');
assert.ok(fs.readFileSync(path.join(root, 'mod-src/textures/entity/scooters.png')).equals(
  fs.readFileSync(path.join(root, 'assets/textures/p24/scooters.png'))));
assert.equal(JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, 'mod-src/geo/scooter.geo.json')))),
  JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, 'mod-src/geo/p24_scooter.geo.json')))));
const scooterRender = fs.readFileSync(path.join(root, 'assets/textures/p24/scooter_side.png'));
assert.equal(scooterRender.subarray(1, 4).toString(), 'PNG', 'Source geometry render must be PNG');
assert.ok(scooterRender.readUInt32BE(16) >= 500, 'Scooter render must be crisp on desktop');
// Every builtin printer blueprint must retain the exact blockstate, not just
// the base block ID: hinges, wooden axes and tripwire connections matter.
vm.runInNewContext(fs.readFileSync(path.join(root, 'data/p13_vox.js'), 'utf8'), ctx);
const atlas = ctx.ZM.VOX_ATLAS, built = ctx.ZM.P13_BUILT;
assert.ok(atlas.blocks.length >= 237, 'Printer atlas must include shaped state variants');
for (const [name, recipe] of Object.entries(built.recipes)) {
  assert.equal(recipe.palette.length, recipe.vox.length, `${name}: palette-to-atlas length`);
  for (let i = 0; i < recipe.palette.length; i++) {
    assert.equal(atlas.blocks[recipe.vox[i]]?.key, recipe.palette[i], `${name}: ${recipe.palette[i]}`);
  }
}
for (const b of atlas.blocks.filter(b => b?.key?.startsWith('minecraft:tripwire'))) {
  assert.ok(b.bx?.length, `${b.key}: visible non-cubic geometry`);
}
// №22: latest published farm, herd, shears and ravager, without swapping designs.
const milk = fs.readFileSync(path.join(root, 'pages/22-milk/app.js'), 'utf8');
assert.match(milk, /function milkCow\(/);
assert.match(milk, /#penView/);
assert.match(milk, /nearest: true/);
assert.match(milk, /copper_bull/);
assert.doesNotMatch(milk, /herdUI\(/);
assert.match(fs.readFileSync(path.join(root, 'shared/geo3d.js'), 'utf8'), /const PF = Array\.isArray/, 'Original #25 per-face cloak UVs must work');
for (const name of ['head', 'hat']) {
  const faces = P20M.gazan.elements.find(e => e.name === name).faces;
  assert.ok(faces.east.uv[0] > faces.east.uv[2], `East face of ${name} must be mirrored`);
  assert.ok(faces.west.uv[0] > faces.west.uv[2], `West face of ${name} must be mirrored`);
}
console.log(`${live.length} pages, ${HUB_ADV.reduce((s, b) => s + b.adv.length, 0)} advancements, Gazan side UVs: OK`);
