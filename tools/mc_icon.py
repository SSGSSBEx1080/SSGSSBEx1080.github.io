"""Иконки блоков как в инвентаре Minecraft, из НАСТОЯЩИХ ванильных моделей 1.19.2.
Берёт models/block/<имя>.json из ванильной базы (tools/vanilla.py), раскрывает parent и #переменные текстур,
считает uv по умолчанию, режет анимированные текстуры до первого кадра и рендерит в поворот gui [30, 225, 0] (в осях этого рендера: x −30, y 135).

python3 tools/mc_icon.py <папка_вывода> stonecutter grindstone command_block ...   (нужен playwright)
"""
import asyncio, json, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).parent)); from vanilla import base as _vb
BASE = _vb()
STAGE = ROOT / "_iconsrc"


def load(name):
    name = name.replace("minecraft:", "")
    if "/" not in name: name = "block/" + name
    return json.loads((BASE / "models" / f"{name}.json").read_text())


def resolve(name):
    chain, m = [], load(name)
    while True:
        chain.append(m)
        if "parent" not in m or m["parent"].replace("minecraft:", "") in ("block/block", "builtin/generated", "item/generated"): break
        m = load(m["parent"])
    tex, els = {}, None
    for m in reversed(chain):
        tex.update(m.get("textures", {}))
        if "elements" in m: els = m["elements"]
    def val(k, d=0):
        v = tex.get(k)
        while v and v.startswith("#") and d < 10: v = tex.get(v[1:]); d += 1
        return v
    return els, val


def default_uv(face, f, t):
    x0, y0, z0 = f; x1, y1, z1 = t
    return {"down": [x0, 16 - z1, x1, 16 - z0], "up": [x0, z0, x1, z1], "north": [16 - x1, 16 - y1, 16 - x0, 16 - y0],
            "south": [x0, 16 - y1, x1, 16 - y0], "west": [z0, 16 - y1, z1, 16 - y0], "east": [16 - z1, 16 - y1, 16 - z0, 16 - y0]}[face]


def build(name):
    els, val = resolve(name)
    STAGE.mkdir(exist_ok=True)
    textures, out = {}, []
    for e in els:
        faces = {}
        for fn, f in e["faces"].items():
            path = val(f["texture"][1:])
            if not path: continue
            key = path.replace("minecraft:", "").replace("/", "__")
            if key not in textures:
                im = Image.open(BASE / "textures" / (path.replace("minecraft:", "") + ".png")).convert("RGBA")
                if im.height > im.width: im = im.crop((0, 0, im.width, im.width))   # анимация: первый кадр
                im.save(STAGE / f"{key}.png"); textures[key] = key
            faces[fn] = {"uv": f.get("uv") or default_uv(fn, e["from"], e["to"]), "texture": "#" + key}
            if "rotation" in f: faces[fn]["rotation"] = f["rotation"]
        el = {"from": e["from"], "to": e["to"], "faces": faces}
        if "rotation" in e: el["rotation"] = e["rotation"]
        out.append(el)
    return {"textures": textures, "elements": out}


HTML = """<!doctype html><html><body style="margin:0;background:transparent"><div id="s" style="width:512px;height:512px"></div>
<script src="shared/model3d.js"></script><script src="shared/gl3d.js"></script>
<script>window.go = (m) => new Promise((res) => { const s = document.getElementById("s"); s.innerHTML = "";
 const g = ZMGL.build(m, "_iconsrc/", {unit: 16, persp: 99999}); g.el.style.cssText = "width:512px;height:512px;display:block"; s.appendChild(g.el);
 g.setRot([["x", -30], ["y", 135]]); setTimeout(() => { g.setRot([["x", -30], ["y", 135.001]]); setTimeout(res, 300); }, 500); });</script></body></html>"""


async def run(outdir, names):
    from playwright.async_api import async_playwright
    tmp = ROOT / "_icon.html"; tmp.write_text(HTML)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--allow-file-access-from-files"])
            pg = await b.new_page(viewport={"width": 512, "height": 512})
            await pg.goto(tmp.as_uri())
            ref = None   # рамка полного блока: по ней режутся все, чтобы низкие блоки остались низкими
            for n in ["barrel"] + names:
                await pg.evaluate("m => go(m)", build(n))
                o = outdir / f"{n}.png"
                await pg.screenshot(path=str(o), omit_background=True, clip={"x": 0, "y": 0, "width": 512, "height": 512})
                im = Image.open(o).convert("RGBA")
                if ref is None:
                    x0, y0, x1, y1 = im.getbbox(); c = ((x0 + x1) / 2, (y0 + y1) / 2); r = max(x1 - x0, y1 - y0) / 2 * 1.08
                    ref = tuple(int(v) for v in (c[0] - r, c[1] - r, c[0] + r, c[1] + r))
                    if n == "barrel" and "barrel" not in names: o.unlink(); continue
                im.crop(ref).resize((128, 128), Image.LANCZOS).save(o); print("ok", o.name)
            await b.close()
    finally:
        tmp.unlink(missing_ok=True)
        import shutil; shutil.rmtree(STAGE, ignore_errors=True)


if __name__ == "__main__":
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    asyncio.run(run(out, sys.argv[2:]))
