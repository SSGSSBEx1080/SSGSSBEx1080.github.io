"""Рендер иконки Каски Шахтёра из 3D-модели (data/p04_models.js) -> assets/textures/p4/models/miner_helmet.png.
Нужен playwright + chromium. Запуск: python3 tools/render_p04_icon.py [rx ry]"""
import asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parent.parent
RX, RY = (float(sys.argv[1]), float(sys.argv[2])) if len(sys.argv) > 2 else (-28, 145)
OUT = Path(sys.argv[3]) if len(sys.argv) > 3 else ROOT / "assets/textures/p4/models/miner_helmet.png"
HTML = f"""<!doctype html><html data-root="./"><body style="margin:0;background:transparent">
<div id="s" style="width:512px;height:512px"></div>
<script src="data/p04_models.js"></script><script src="data/p04_tex.js"></script>
<script src="shared/model3d.js"></script><script src="shared/gl3d.js"></script>
<script>
const g = ZMGL.build(ZM.P04M.helmet, "assets/textures/p4/models/", {{unit: 44, persp: 99999}});
g.el.style.cssText = "width:512px;height:512px;display:block";
document.getElementById("s").appendChild(g.el);
g.setRot([["x",{RX}],["y",{RY}]]);
setTimeout(() => {{ g.setRot([["x",{RX}],["y",{RY}+0.001]]); document.title = "ok"; }}, 600);
</script></body></html>"""
async def run():
    tmp = ROOT / "_icon.html"; tmp.write_text(HTML, encoding="utf-8")
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
            pg = await b.new_page(viewport={"width": 512, "height": 512})
            await pg.goto(tmp.as_uri()); await pg.wait_for_function("document.title==='ok'"); await pg.wait_for_timeout(900)
            await pg.screenshot(path=str(OUT), omit_background=True, clip={"x": 0, "y": 0, "width": 512, "height": 512})
            await b.close()
    finally:
        tmp.unlink()
    from PIL import Image
    im = Image.open(OUT).convert("RGBA"); bb = im.getbbox()
    im = im.crop(bb); w, h = im.size; s = max(w, h)
    sq = Image.new("RGBA", (s, s)); sq.paste(im, ((s - w) // 2, (s - h) // 2))
    sq.resize((128, 128), Image.NEAREST if s < 128 else Image.LANCZOS).save(OUT)
    print("icon", OUT, bb)
asyncio.run(run())
