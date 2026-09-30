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
assert.equal(HUB_ADV.length, live.length, 'Every live point must have a branch in the hub');
for (const p of live) {
  const branch = HUB_ADV.find(b => b.n === p.n);
  assert.ok(branch, `Missing branch for #${p.n}`);
  assert.equal(branch.page, p.page);
  assert.equal(branch.store, `p${String(p.n).padStart(2, '0')}.adv`);
  assert.ok(fs.existsSync(path.join(root, p.page)), `Missing page: ${p.page}`);
  assert.ok(fs.existsSync(path.join(root, p.icon)), `Missing point icon: ${p.icon}`);
  const html = fs.readFileSync(path.join(root, p.page), 'utf8');
  assert.match(html, /data\/hub_adv\.js/, `Page #${p.n} must load the shared branch`);
  assert.match(html, /shared\/core\.js/, `Page #${p.n} must load progress sync`);
  assert.ok(html.includes(p.n === 1 ? 'id="tree"' : 'id="adv"'), `Missing achievement anchor on #${p.n}`);
  const keys = new Set(branch.adv.map(a => a.key));
  assert.equal(keys.size, branch.adv.length, `Duplicate advancement in #${p.n}`);
  for (const a of branch.adv) {
    assert.ok(a.icon && fs.existsSync(path.join(root, a.icon)), `Missing icon for #${p.n}:${a.key}`);
    assert.ok(!a.parent || keys.has(a.parent), `Missing parent for #${p.n}:${a.key}`);
  }
}
assert.equal(POINTS.find(p => p.n === 22).page, 'pages/22-milk/index.html');
assert.equal(HUB_ADV.find(p => p.n === 22).adv.length, 6);
for (const name of ['head', 'hat']) {
  const faces = P20M.gazan.elements.find(e => e.name === name).faces;
  assert.ok(faces.east.uv[0] > faces.east.uv[2], `East face of ${name} must be mirrored`);
  assert.ok(faces.west.uv[0] > faces.west.uv[2], `West face of ${name} must be mirrored`);
}
console.log(`${live.length} pages, ${HUB_ADV.reduce((s, b) => s + b.adv.length, 0)} advancements, Gazan side UVs: OK`);
