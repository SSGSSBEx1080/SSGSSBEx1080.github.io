#!/usr/bin/env python3
"""Guest-branch asset generator: pixel icons (hand matrices), salt-trail white
line recolor, favicons. Plain zlib/struct PNG codec, no deps."""
import struct, zlib, os

ROOT = os.path.join(os.path.dirname(__file__), "..")
GUEST = os.path.join(ROOT, "assets", "textures", "guest")

# ---------- PNG codec (8-bit truecolor + alpha only) ----------
def read_png(path):
    d = open(path, "rb").read()
    assert d[:8] == b"\x89PNG\r\n\x1a\n"
    pos, w, h, bd, ct, idat = 8, 0, 0, 0, 0, b""
    while pos < len(d):
        ln, typ = struct.unpack(">I4s", d[pos:pos+8]); pos += 8
        data = d[pos:pos+ln]; pos += ln + 4
        if typ == b"IHDR":
            w, h, bd, ct = struct.unpack(">IIBB", data[:10])
        elif typ == b"IDAT":
            idat += data
        elif typ == b"IEND":
            break
    assert bd == 8 and ct == 6, f"{path}: bitdepth {bd} colortype {ct}"
    raw = zlib.decompress(idat)
    stride = w * 4
    out = []
    prev = bytearray(stride)
    p = 0
    for y in range(h):
        f = raw[p]; p += 1
        line = bytearray(raw[p:p+stride]); p += stride
        if f == 1:
            for i in range(4, stride): line[i] = (line[i] + line[i-4]) & 255
        elif f == 2:
            for i in range(stride): line[i] = (line[i] + prev[i]) & 255
        elif f == 3:
            for i in range(stride):
                a = line[i-4] if i >= 4 else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif f == 4:
            for i in range(stride):
                a = line[i-4] if i >= 4 else 0
                b = prev[i]
                c = prev[i-4] if i >= 4 else 0
                pa, pb, pc = abs(b-c), abs(a-c), abs(a+b-2*c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        out.append(line)
        prev = line
    return w, h, out

def write_png(path, w, h, rows):
    raw = b""
    for line in rows:
        raw += b"\x00" + bytes(line)
    def chunk(t, data):
        c = t + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    open(path, "wb").write(png)

def from_matrix(rows, pal):
    h = len(rows); w = len(rows[0])
    assert all(len(r) == w for r in rows), "matrix width mismatch"
    out = []
    for r in rows:
        line = bytearray()
        for ch in r:
            if ch == ".":
                line += b"\x00\x00\x00\x00"
            else:
                line += bytes(pal[ch]) + b"\xff"
        out.append(line)
    return w, h, out

def nearest(w, h, rows, nw, nh):
    out = []
    for y in range(nh):
        sy = min(h - 1, y * h // nh); line = bytearray()
        for x in range(nw):
            sx = min(w - 1, x * w // nw)
            line += rows[sy][sx*4:sx*4+4]
        out.append(line)
    return nw, nh, out

# ---------- 1. salt_trail line0_white from line0_lit ----------
lw, lh, lrows = read_png(os.path.join(GUEST, "salt_trail", "salt_redstone_dust_line0_lit.png"))
wrows = []
for line in lrows:
    nl = bytearray()
    for i in range(0, len(line), 4):
        r, g, b, a = line[i], line[i+1], line[i+2], line[i+3]
        lum = (r + g + b) // 3
        # lit trail is warm orange -> map luminance onto a white/silver ramp
        v = min(255, 120 + lum // 2)
        nl += bytes((v, v, v, a))
    wrows.append(nl)
write_png(os.path.join(GUEST, "salt_trail", "salt_redstone_dust_line0_white.png"), lw, lh, wrows)

# ---------- 2. pixel icon matrices ----------
RABBIT = [
    "................",
    "....ff....ff....",
    "...fppf..fppf...",
    "...fppf..fppf...",
    "...fppf..fppf...",
    "...ffffffffff...",
    "..ffffffffffff..",
    ".ffffffffffffff.",
    ".ffffffffffffff.",
    ".fffdffffffdfff.",
    ".ffffffffffffff.",
    "..fffffnnfffff..",
    "..fffwwwwwwfff..",
    "...ffwwwwwwff...",
    "....ffffffff....",
    "................",
]
RABBIT_PAL = {"f": (181, 137, 99), "p": (242, 182, 193), "d": (43, 32, 25), "n": (235, 141, 141), "w": (240, 230, 214)}

BEETROOT = [
    "................",
    ".....ll..ll.....",
    "....llllllll....",
    "....lLllllLl....",
    ".....llllll.....",
    "......rrrr......",
    "....rrrrrrrr....",
    "...rrrRrrrRrr...",
    "...rrrrrrrrrr...",
    "...rRrrrrrRrr...",
    "....rrrrrrrr....",
    "....rrrrrrrr....",
    ".....rrrrrr.....",
    ".....rr.rr......",
    "......r.r.......",
    "................",
]
BEETROOT_PAL = {"l": (95, 168, 74), "L": (58, 117, 47), "r": (150, 61, 79), "R": (105, 38, 53)}

CHICKEN = [
    "................",
    "................",
    ".....ccccc......",
    "....ccccccc.....",
    "...ccccccccc....",
    "..cccCcccccccc..",
    "..ccCccccccccc..",
    "..cccccccccccc..",
    "..cccccccccCc...",
    "...ccccccccCc...",
    "...ccccccccc....",
    "....ccccccc.....",
    "....cc...cc.....",
    "....y.....y.....",
    "...yy....yy.....",
    "................",
]
CHICKEN_PAL = {"c": (239, 163, 146), "C": (206, 121, 105), "y": (232, 200, 106)}

SHEEP = [
    "................",
    "................",
    "..wwwwwwwwwwww..",
    ".wwwwwwwwwwwwww.",
    ".wwwffffffffwww.",
    ".wwffffffffffww.",
    ".wwffffffffffww.",
    ".wwfdffffffdfww.",
    ".wwffffffffffww.",
    ".wwffffnnffffww.",
    ".wwfffwwwwfffww.",
    ".wwwwwwwwwwwwww.",
    "..wwwwwwwwwwww..",
    "................",
    "................",
    "................",
]
SHEEP_PAL = {"w": (238, 238, 238), "f": (222, 186, 143), "d": (43, 32, 25), "n": (235, 141, 141)}

for name, mx, pal in (("rabbit", RABBIT, RABBIT_PAL), ("beetroot", BEETROOT, BEETROOT_PAL),
                      ("chicken", CHICKEN, CHICKEN_PAL), ("sheep", SHEEP, SHEEP_PAL)):
    w, h, rows = from_matrix(mx, pal)
    write_png(os.path.join(GUEST, name + ".png"), w, h, rows)

# ---------- 3. favicons g1..g4 ----------
FAV = os.path.join(ROOT, "assets", "favicons")
# g1: sausage (source 256 -> downscale nearest)
w, h, rows = read_png(os.path.join(GUEST, "gost_doctorskaya_sausage.png"))
for size in (32, 64):
    nw, nh, nrs = nearest(w, h, rows, size, size)
    write_png(os.path.join(FAV, f"g1-{size}.png"), nw, nh, nrs)
# g2: rabbit
w, h, rows = read_png(os.path.join(GUEST, "rabbit.png"))
for size in (32, 64):
    nw, nh, nrs = nearest(w, h, rows, size, size)
    write_png(os.path.join(FAV, f"g2-{size}.png"), nw, nh, nrs)
# g4: knife (source 64)
w, h, rows = read_png(os.path.join(GUEST, "nina_knife.png"))
for size in (32, 64):
    nw, nh, nrs = nearest(w, h, rows, size, size)
    write_png(os.path.join(FAV, f"g4-{size}.png"), nw, nh, nrs)
# g3: Mister V placeholder — dark tile with silver "B"-style void + dashed frame
V = [
    "................",
    ".dddddddddddddd.",
    ".d............d.",
    ".d.dddddddddd.d.",
    ".d.d........d.d.",
    ".d.d.######..d.d.",
    ".d.d.##..##..d.d.",
    ".d.d......##..d.d",
    ".d.d.....##...d.d",
    ".d.d....##....d.d",
    ".d.d..........d.d",
    ".d.d.#########d.d",
    ".d.d..........d.d",
    ".d.dddddddddddd..",
    ".d............d.",
    ".dddddddddddddd.",
]
V = [r.ljust(16, ".")[:16] for r in V]
V_PAL = {"d": (122, 140, 150), "#": (176, 190, 198)}
w, h, rows = from_matrix(V, V_PAL)
for size in (32, 64):
    nw, nh, nrs = nearest(w, h, rows, size, size)
    write_png(os.path.join(FAV, f"g3-{size}.png"), nw, nh, nrs)

print("guest assets done")
