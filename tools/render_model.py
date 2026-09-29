"""Рендер любой модели из data/*.js в PNG (иконки, превью).
python3 tools/render_model.py data/p05_models.js "ZM.P05M.villager" assets/textures/p5/models/ rx ry out.png [size]"""
import asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parent.parent
js, expr, base, RX, RY, OUT = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), float(sys.argv[5]), Path(sys.argv[6])
SIZE = int(sys.argv[7]) if len(sys.argv) > 7 else 128
tex = js.replace("_models.js", "_tex.js")
HTML = f"""<!doctype html><html><body style="margin:0;background:transparent"><div id="s" style="width:512px;height:512px"></div>
<script src="{js}"></script><script src="{tex}"></script><script src="shared/model3d.js"></script><script src="shared/gl3d.js"></script>
<script>const g = ZMGL.build({expr}, "{base}", {{unit: 14, persp: 99999}});
g.el.style.cssText = "width:512px;height:512px;display:block"; document.getElementById("s").appendChild(g.el);
g.setRot([["x",{RX}],["y",{RY}]]); setTimeout(() => {{ g.setRot([["x",{RX}],["y",{RY}+0.001]]); document.title = "ok"; }}, 700);</script></body></html>"""
async def run():
    tmp = ROOT / "_render.html"; tmp.write_text(HTML, encoding="utf-8")
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
    im = Image.open(OUT).convert("RGBA"); im = im.crop(im.getbbox()); w, h = im.size; s = max(w, h)
    sq = Image.new("RGBA", (s, s)); sq.paste(im, ((s - w) // 2, (s - h) // 2))
    sq.resize((SIZE, SIZE), Image.LANCZOS).save(OUT); print("ok", OUT)
asyncio.run(run())
