#!/usr/bin/env python3
"""Build the faithful scooter-station scene data from the user's original 1.19.2 NBT.

Preserves block states (stairs facing/shape, wall connections, slab half, lantern
hanging, charging port facing) and the two sign block entities. No pip packages.
Run: python3 tools/build_p24_station.py
"""
import gzip
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = ROOT / "mod-src/structures/scooter_station.nbt"
dst = ROOT / "data/p24_station.js"
raw = memoryview(gzip.decompress(src.read_bytes()))
off = 0


def read(n):
    global off
    v = raw[off:off + n]
    if len(v) != n:
        raise ValueError("NBT truncated")
    off += n
    return v


def number(fmt):
    return struct.unpack(">" + fmt, read(struct.calcsize(fmt)))[0]


def string():
    return bytes(read(number("H"))).decode("utf-8")


def payload(kind):
    if kind == 1:
        return number("b")
    if kind == 2:
        return number("h")
    if kind == 3:
        return number("i")
    if kind == 4:
        return number("q")
    if kind == 5:
        return number("f")
    if kind == 6:
        return number("d")
    if kind == 7:
        return list(read(number("i")))
    if kind == 8:
        return string()
    if kind == 9:
        tag, count = number("B"), number("i")
        return [payload(tag) for _ in range(count)]
    if kind == 10:
        out = {}
        while (tag := number("B")) != 0:
            name = string()
            out[name] = payload(tag)
        return out
    if kind in (11, 12):
        fmt = "i" if kind == 11 else "q"
        return [number(fmt) for _ in range(number("i"))]
    raise ValueError(f"NBT tag {kind}")


assert number("B") == 10, "expected compound root"
string()  # anonymous root name
root = payload(10)
assert off == len(raw), "unexpected trailing NBT data"
assert root["size"] == [10, 6, 11]
palette = [
    {"name": p["Name"], "props": p.get("Properties", {})}
    for p in root["palette"]
]
blocks = []
signs = []
for b in root["blocks"]:
    state = b["state"]
    if palette[state]["name"] == "minecraft:air":
        continue
    pos = b["pos"]
    blocks.append([*pos, state])
    if "nbt" in b and "wall_sign" in palette[state]["name"]:
        n = b["nbt"]
        signs.append({
            "pos": pos,
            "lines": [json.loads(n.get(f"Text{i}", '{"text":""}')).get("text", "") for i in range(1, 5)],
        })
assert len(blocks) == 198 and len(signs) == 2
out = {"size": root["size"], "palette": palette, "blocks": blocks, "signs": signs}
dst.write_text("/* №24 · Исходный scooter_station.nbt, включая ВСЕ состояния блоков и текст табличек.\n"
               "   Пересборка: python3 tools/build_p24_station.py */\n"
               "window.ZM=window.ZM||{};ZM.P24ST="
               + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
print("Saved", dst.relative_to(ROOT), len(blocks), "non-air blocks,", len(signs), "signs")
