"""Patch the generated printer atlas with exact blockstates missing from the mod export.

Keeps vanilla textures in a compact PNG atlas (no copied client jar in Git).
Run `python3 tools/get_vanilla.py` then `python3 tools/fix_p13_vox.py`.
The source builder for data/p13_vox.js is not in this repository, so this
post-build step is also regression-tested by tools/test_site.js.
"""
import base64
import copy
import io
import json
import zipfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data/p13_vox.js"
ZIP = ROOT / "assets/vanilla/vanilla-1.19.2.zip"
HEADER = "/* Сгенерировано tools/build_p13_vox.py: атлас №13 (база + формы из чертежей мода) и три встроенных чертежа PrinterRecipe. Руками не править */\nwindow.ZM = window.ZM || {};\n"


def parse():
    text = DATA.read_text(encoding="utf-8")
    assert text.startswith(HEADER)
    decoder = json.JSONDecoder()
    start = text.index("ZM.VOX_ATLAS = ") + len("ZM.VOX_ATLAS = ")
    atlas, _ = decoder.raw_decode(text[start:])
    start = text.index("ZM.P13_BUILT = ") + len("ZM.P13_BUILT = ")
    recipes, _ = decoder.raw_decode(text[start:])
    return atlas, recipes


def fix():
    atlas, builtin = parse()
    blocks = atlas["blocks"]
    by_key = {b["key"]: i for i, b in enumerate(blocks) if b}
    before = len(blocks)
    keys = sorted({s for r in builtin["recipes"].values() for s in r["palette"]})
    wire_tile = 196  # Atlas has 195 occupied tiles, starting at tile 1.
    if any(s.startswith("minecraft:tripwire[") and "=true" in s for s in keys):
        img = Image.open(io.BytesIO(base64.b64decode(atlas["uri"].split(",", 1)[1]))).convert("RGBA")
        with zipfile.ZipFile(ZIP) as z:
            wire = Image.open(io.BytesIO(z.read("textures/block/tripwire.png"))).convert("RGBA")
        assert wire.size == (16, 16)
        img.paste(wire, ((wire_tile % 16) * 16, (wire_tile // 16) * 16))
        buf = io.BytesIO()
        img.save(buf, "PNG", optimize=True, compress_level=9)
        atlas["uri"] = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")

    # The existing unconnected tripwire exported with zero geometry.
    default_wire = by_key.get("minecraft:tripwire[attached=false,disarmed=false,east=false,north=false,powered=false,south=false,west=false]")
    if default_wire is not None and not blocks[default_wire].get("bx"):
        blocks[default_wire]["bx"] = [[7.5, 1, 7.5, 8.5, 1.25, 8.5] + [wire_tile] * 6 + [1]]
        blocks[default_wire]["cut"] = 1

    for state in keys:
        if state in by_key:
            continue
        base = state.split("[")[0]
        if base == "minecraft:stripped_dark_oak_wood":
            b = copy.deepcopy(blocks[by_key["minecraft:stripped_dark_oak_wood[axis=x]"]])
        elif base in ("minecraft:dark_oak_door", "zitraksmode:ender_door"):
            half = "upper" if "half=upper" in state else "lower"
            tile = (163 if half == "upper" else 164) if base.startswith("minecraft:") else (191 if half == "upper" else 192)
            if "facing=east" in state:
                pos = [0, 0, 0, 3, 16, 16] if "hinge=left" in state else [13, 0, 0, 16, 16, 16]
            else:  # north-facing Ender door, right hinge
                pos = [0, 0, 0, 16, 16, 3]
            b = {"name": "Дверь · " + half, "bx": [pos + [tile] * 6 + [0]]}
        elif base == "minecraft:tripwire":
            box = lambda p: p + [wire_tile] * 6 + [1]
            shapes = [box([7.5, 1, 7.5, 8.5, 1.25, 8.5])]
            if "east=true" in state: shapes.append(box([8, 1, 7.5, 16, 1.25, 8.5]))
            if "west=true" in state: shapes.append(box([0, 1, 7.5, 8, 1.25, 8.5]))
            if "north=true" in state: shapes.append(box([7.5, 1, 0, 8.5, 1.25, 8]))
            if "south=true" in state: shapes.append(box([7.5, 1, 8, 8.5, 1.25, 16]))
            b = {"name": "Растяжка", "cut": 1, "bx": shapes}
        else:
            raise ValueError(f"Unknown fallback state: {state}")
        b["key"] = state
        b["id"] = len(blocks)
        by_key[state] = b["id"]
        blocks.append(b)
    for r in builtin["recipes"].values():
        r["vox"] = [by_key[state] for state in r["palette"]]
    assert len(blocks) < 256, "Renderer expects byte-sized palette indices"
    DATA.write_text(HEADER + "ZM.VOX_ATLAS = " + json.dumps(atlas, ensure_ascii=False, separators=(",", ":")) + ";\n"
                    + "ZM.P13_BUILT = " + json.dumps(builtin, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    print(f"Printer: {len(blocks) - before} new blockstate models; {len(blocks)} total, atlas {atlas['size']}px PNG")


if __name__ == "__main__":
    fix()
