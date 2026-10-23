/* Генератор 16×16 пиксель-арт иконок (ваниль-стиль) для реальных ачивок 00_guest.
 * PNG пишется вручную: IHDR + IDAT(zlib) + IEND, фильтр 0. */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let c, table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  c = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png16(px) {
  // px: массив 16×16 [r,g,b,a]
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(16, 0); ihdr.writeUInt32BE(16, 4);
  ihdr[8] = 8; ihdr[9] = 6; // глубина 8, RGBA
  const raw = Buffer.alloc(16 * (16 * 4 + 1));
  for (let y = 0; y < 16; y++) {
    raw[y * (16 * 4 + 1)] = 0;
    for (let x = 0; x < 16; x++) {
      const [r, g, b, a] = px[y * 16 + x];
      const o = y * (16 * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}
const T = [0, 0, 0, 0];
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 255];
const shade = (c, k) => [Math.max(0, Math.min(255, c[0] * k | 0)), Math.max(0, Math.min(255, c[1] * k | 0)), Math.max(0, Math.min(255, c[2] * k | 0)), 255];
function grid() { return Array.from({ length: 256 }, () => T.slice()); }
function put(px, x, y, c) { if (x >= 0 && x < 16 && y >= 0 && y < 16) px[y * 16 + x] = c; }
function rect(px, x0, y0, w, h, c) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(px, x, y, c); }
// ЛКГ с фиксированным зерном — одинаковый результат при каждом запуске
let seed = 20261023;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

const out = {};

/* ---- item_barrier: красный крест в квадрате ---- */
{
  const px = grid(), red = hex('#e02a2a'), dk = hex('#9c1414');
  for (let i = 0; i < 16; i++) { put(px, i, 0, red); put(px, i, 15, red); put(px, 0, i, red); put(px, 15, i, red); }
  for (let i = 2; i < 14; i++) { put(px, i, i, i % 3 ? red : dk); put(px, 15 - i, i, i % 3 ? red : dk); }
  put(px, 13, 2, dk); put(px, 2, 13, dk); put(px, 14, 1, dk); put(px, 1, 14, dk);
  out['item_barrier.png'] = px;
}
/* ---- block_oak_sapling ---- */
{
  const px = grid(), st = hex('#6d4a2a'), stD = hex('#4e3520'), l1 = hex('#3d7a24'), l2 = hex('#4f9c2c'), l3 = hex('#66b83a');
  rect(px, 7, 9, 2, 5, st); put(px, 7, 13, stD);
  const blob = (cx, cy, r, c) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 1) put(px, cx + x, cy + y, c); };
  blob(5, 6, 3, l1); blob(10, 6, 3, l1); blob(8, 4, 3, l2); blob(6, 3, 2, l3); blob(10, 4, 2, l2); blob(8, 7, 2, l2);
  put(px, 4, 5, l3); put(px, 11, 5, l3); put(px, 8, 2, l3);
  out['block_oak_sapling.png'] = px;
}
/* ---- block_jungle_sapling ---- */
{
  const px = grid(), st = hex('#5b4126'), l1 = hex('#1d7a30'), l2 = hex('#2a9c3e'), l3 = hex('#4fc45c'), vn = hex('#8fce4e');
  rect(px, 7, 8, 2, 6, st);
  const blob = (cx, cy, r, c) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 1) put(px, cx + x, cy + y, c); };
  blob(4, 5, 3, l1); blob(11, 5, 3, l1); blob(8, 3, 3, l2); blob(6, 2, 2, l3); blob(10, 2, 2, l3); blob(8, 6, 2, l2);
  put(px, 3, 4, l3); put(px, 12, 4, l3); put(px, 6, 8, vn); put(px, 10, 9, vn); put(px, 8, 1, l3);
  out['block_jungle_sapling.png'] = px;
}
/* ---- item_golden_apple ---- */
{
  const px = grid(), g1 = hex('#f6d33c'), g2 = hex('#dba319'), g3 = hex('#a86f0e'), hi = hex('#fff29a'), st = hex('#6d4a2a'), lf = hex('#4f9c2c');
  const apple = [
    '................', '.......ss.......', '......ss.ll.....', '.....s...ll.....',
    '...gggggggggg...', '..gGGggggggggg..', '.gGGggggggggggg.', '.gGgggggggggggg.',
    '.gggggggggggggg.', '.ggggggggggggdg.', '.gggggggggggdd..', '..gggggggggddd..',
    '..dgggggggddd...', '...ddgggdddd....', '....dddddd......', '................'];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const ch = apple[y][x];
    if (ch === 'g') put(px, x, y, g1);
    else if (ch === 'G') put(px, x, y, hi);
    else if (ch === 'd') put(px, x, y, x > 10 ? g3 : g2);
    else if (ch === 's') put(px, x, y, st);
    else if (ch === 'l') put(px, x, y, lf);
  }
  out['item_golden_apple.png'] = px;
}
/* ---- item_clock ---- */
{
  const px = grid(), ring = hex('#e6b422'), ringD = hex('#a97b12'), face = hex('#aee0f2'), faceD = hex('#7fb8d8'), hand = hex('#f2e3ae'), cn = hex('#5a4a20');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.hypot(x - 7.5, y - 7.5);
    if (d > 7.6) continue;
    if (d > 6.2) put(px, x, y, (x + y) % 5 ? ring : ringD);
    else put(px, x, y, y > 9 ? faceD : face);
  }
  for (let i = 0; i < 5; i++) put(px, 7 + i, 7 - i, hand); // стрелка
  put(px, 7, 7, cn); put(px, 8, 7, cn); put(px, 7, 8, cn);
  out['item_clock.png'] = px;
}
/* ---- item_ender_eye ---- */
{
  const px = grid(), rim = hex('#25401f'), body = hex('#5e9c48'), lite = hex('#89c26a'), slit = hex('#101010'), hi = hex('#d9eeb9');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.hypot(x - 7.5, y - 7.5);
    if (d > 7.6) continue;
    if (d > 6.4) put(px, x, y, rim);
    else put(px, x, y, (x + y) % 4 === 0 ? lite : body);
  }
  rect(px, 7, 3, 2, 10, slit); // вертикальный зрачок-щель
  put(px, 5, 5, hi); put(px, 6, 4, hi); put(px, 5, 4, hi);
  out['item_ender_eye.png'] = px;
}
/* ---- block_netherrack ---- */
{
  const px = grid(), base = hex('#72312a'), d1 = hex('#4f1d17'), l1 = hex('#8c4438'), d2 = hex('#5f2b23');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const r = rnd();
    put(px, x, y, r < .18 ? d1 : r < .38 ? d2 : r < .62 ? base : r < .85 ? l1 : base);
  }
  out['block_netherrack.png'] = px;
}
/* ---- item_water_bucket ---- */
{
  const px = grid(), ir = hex('#c6c6cf'), irD = hex('#8f8f9c'), irL = hex('#e9e9f2'), wat = hex('#3d5fd0'), watL = hex('#6f8ef0'), watD = hex('#2a3f9e');
  rect(px, 3, 5, 10, 1, ir); // обод
  put(px, 3, 5, irD); put(px, 12, 5, irD);
  rect(px, 4, 6, 8, 1, wat); rect(px, 5, 6, 3, 1, watL); put(px, 10, 6, watD); // вода
  for (let y = 7; y < 14; y++) {
    const inset = 1 + Math.floor((y - 7) / 3);
    for (let x = 3 + inset; x <= 12 - inset; x++) put(px, x, y, x === 3 + inset ? irD : x === 12 - inset ? irL : (y < 9 ? watD : irD));
  }
  rect(px, 5, 7, 6, 2, wat); rect(px, 6, 7, 3, 1, watL); // вода видна сверху
  // ручка
  for (let i = 0; i < 4; i++) { put(px, 4 + i, 4 - i > 1 ? 4 - i : 2, ir); put(px, 11 - i, 4 - i > 1 ? 4 - i : 2, ir); }
  out['item_water_bucket.png'] = px;
}

const dir = path.join('assets', 'textures', 'mc', 'p2');
fs.mkdirSync(dir, { recursive: true });
for (const [name, px] of Object.entries(out)) {
  fs.writeFileSync(path.join(dir, name), png16(px));
  console.log('OK', name);
}
