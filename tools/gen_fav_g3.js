/* Фавиконки гостя В: розовое сердце 16×16 → 32 и 64. */
const zlib = require('zlib');
const fs = require('fs');
function crc32(buf) {
  let c, table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c; }
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
function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = rgba(x, y);
      const o = y * (w * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const HEART = [
  '................',
  '.rrrr.....rrrr..',
  'rRRRrr...rRRRrr.',
  'rRRRRrr.rrRRRRr.',
  'rRRRRRrrrrRRRRr.',
  'rRRRRRRRRRRRRRr.',
  'rRRRRRRRRRRRRRr.',
  '.rRRRRRRRRRRRr..',
  '..rRRRRRRRRRr...',
  '...rRRRRRRRr....',
  '....rRRRRRr.....',
  '.....rRRRr......',
  '......rRr.......',
  '.......r........',
  '................',
  '................',
];
const COL = { r: [232, 59, 90, 255], R: [255, 125, 149, 255] };
const px16 = (x, y) => { const c = HEART[y][x]; return c === '.' ? [0, 0, 0, 0] : COL[c]; };
fs.writeFileSync('assets/favicons/g3-32.png', png(32, 32, (x, y) => px16(x >> 1, y >> 1)));
fs.writeFileSync('assets/favicons/g3-64.png', png(64, 64, (x, y) => px16(x >> 2, y >> 2)));
console.log('favicons g3 OK');
