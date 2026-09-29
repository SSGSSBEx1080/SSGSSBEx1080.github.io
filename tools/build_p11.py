"""№11 · JBL-колонка: сборка ассетов.

python3 tools/build_p11.py            текстуры, модель, треки, огибающие басов
python3 tools/build_p11.py --icons    + изометрические иконки (нужен playwright)

Источники:
  mod-src/textures/p11/jbl_column.png     текстура модели (item/jbl_column), 1408×768
  mod-src/models/p11/jbl_speaker_model.json  модель Blockbench
  mod-src/brand/p11_scene_src.png          сгенерированная сцена деревни (фон HUD)
  ванильная база 1.19.2                    предметы, блоки, пластинки
"""
import asyncio, base64, json, shutil, subprocess, sys, urllib.request
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from vanilla import base
import mc_icon

OUT = ROOT / "assets" / "textures" / "p11"; SND = ROOT / "assets" / "sounds" / "p11"; ISO = OUT / "iso"
SRC = ROOT / "mod-src" / "textures" / "p11"; MSRC = ROOT / "mod-src" / "models" / "p11"
V = base() / "textures"
GH = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19.2/assets/minecraft/sounds/"

TEX = {"note_block": "block/note_block", "iron_ingot": "item/iron_ingot", "redstone": "item/redstone", "bamboo": "item/bamboo",
       "note": "particle/note", "jukebox_top": "block/jukebox_top", "jukebox_side": "block/jukebox_side", "stone": "block/stone",
       "blue_wool": "block/blue_wool", "black_wool": "block/black_wool", "gray_concrete": "block/gray_concrete",
       "barrier": "item/barrier", "name_tag": "item/name_tag", "writable_book": "item/writable_book", "ender_pearl": "item/ender_pearl",
       "villager": "entity/villager/villager", "oak_planks": "block/oak_planks", "angry": "particle/angry", "heart": "particle/heart"}
DISCS = ["pigstep", "otherside", "cat", "mellohi", "13", "11", "chirp", "far", "mall", "stal", "strad", "ward", "wait", "blocks", "5"]
for d in DISCS: TEX["disc_" + d] = f"item/music_disc_{d}"
BUTTONS = ["stone", "polished_blackstone", "oak", "spruce", "birch", "jungle", "acacia", "dark_oak", "mangrove", "crimson", "warped"]

# встроенные треки: ванильные пластинки (кто «загрузил» — ники игроков сервера)
TRACKS = [
    {"id": "pigstep", "title": "Lena Raine - Pigstep", "author": "Zitraks", "likes": 67, "created": "2026-03-14", "q": 2},
    {"id": "otherside", "title": "Lena Raine - otherside", "author": "Alex", "likes": 41, "created": "2026-03-20", "q": 2},
    {"id": "cat", "title": "C418 - cat", "author": "Steve", "likes": 41, "created": "2026-03-16", "q": None},
    {"id": "mellohi", "title": "C418 - mellohi", "author": "Житель", "likes": 13, "created": "2026-04-01", "q": None},
]


def vt(p): return Image.open(V / f"{p}.png").convert("RGBA")


def ff():
    import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()


def build_tex():
    for d in (OUT, ISO): d.mkdir(parents=True, exist_ok=True)
    for k, p in TEX.items():
        im = vt(p)
        if im.height > im.width and k not in ("villager",): im = im.crop((0, 0, im.width, im.width))
        im.save(OUT / f"{k}.png")
    src = Image.open(SRC / "jbl_column.png").convert("RGB")
    # текстура модели: сглаживаемая .webp (это не пиксель-арт 16×16, а рисунок 1408×768)
    src.resize((1024, 558), Image.LANCZOS).save(OUT / "jbl_column.webp", quality=90, method=6)
    # грани для страницы (координаты = uv модели × 88 / × 48)
    faces = {"face_front": (597, 259, 836, 504), "face_speaker": (120, 259, 354, 504), "face_speaker2": (355, 259, 584, 504),
             "face_top": (598, 0, 826, 256), "face_bottom": (598, 502, 826, 750)}
    for k, b in faces.items(): src.crop(b).save(OUT / f"{k}.png")
    # сетка ткани для фона: кусок решётки с передней грани
    src.crop((610, 270, 680, 330)).save(OUT / "grille.png")
    sc = Image.open(ROOT / "mod-src" / "brand" / "p11_scene_src.png").convert("RGB")
    sc.resize((1600, int(1600 * sc.height / sc.width)), Image.LANCZOS).save(OUT / "scene.jpg", quality=84)
    # голова жителя для «соседей»
    v = vt("entity/villager/villager"); h = v.crop((8, 8, 16, 18)); h.save(OUT / "villager_face.png")
    w = vt("gui/widgets")
    w.crop((0, 0, 182, 22)).save(OUT / "gui_hotbar.png"); w.crop((0, 22, 24, 46)).save(OUT / "gui_sel.png"); w.crop((24, 22, 53, 46)).save(OUT / "gui_offhand.png")
    shutil.copy(ROOT / "assets" / "textures" / "p10" / "gui_craft.png", OUT / "gui_craft.png")
    print("tex ok")


def model():
    m = json.loads((MSRC / "jbl_speaker_model.json").read_text())
    tex = {"0": "jbl_column.webp"}
    els = []
    for e in m["elements"]:
        f2 = {}
        for n, f in e["faces"].items():
            g = dict(f); g["texture"] = "#0"; f2[n] = g
        els.append({"from": e["from"], "to": e["to"], "rotation": e.get("rotation"), "faces": f2})
    return {"textures": tex, "elements": els}


def write_models():
    m = model()
    (ROOT / "data" / "p11_models.js").write_text("/* Сгенерировано tools/build_p11.py, руками не править */\nwindow.ZM = window.ZM || {};\nZM.P11M = "
                                                + json.dumps({"jbl_speaker": m}, ensure_ascii=False) + ";\n", encoding="utf-8")
    p = OUT / "jbl_column.webp"
    inl = {p.relative_to(ROOT / "assets").as_posix(): "data:image/webp;base64," + base64.b64encode(p.read_bytes()).decode()}
    (ROOT / "data" / "p11_tex.js").write_text("/* Сгенерировано tools/build_p11.py: текстура 3D-модели для WebGL (file://) */\n"
                                              "window.ZM_TEX_INLINE = Object.assign(window.ZM_TEX_INLINE || {}, " + json.dumps(inl) + ");\n", encoding="utf-8")
    print("model ok")


SOUNDS = {"click": "random/click", "pop": "random/pop", "levelup": "random/levelup", "orb": "random/orb",
          "bass": "note/bass", "bd": "note/bd", "harp": "note/harp", "hat": "note/hat", "snare": "note/snare", "pling": "note/pling",
          "bell": "note/bell", "didgeridoo": "note/didgeridoo", "villager_no": "mob/villager/no1", "villager_hmm": "mob/villager/idle1",
          "villager_hmm2": "mob/villager/idle2", "villager_haggle": "mob/villager/haggle1", "villager_yes": "mob/villager/yes1"}


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=60).read()


def envelope(path, fps=20):
    """басы по кадрам 1/20 с (как тики): низкие частоты 30–160 Гц, 0..255"""
    raw = subprocess.run([ff(), "-loglevel", "error", "-i", str(path), "-ac", "1", "-ar", "8000", "-f", "s16le", "-"], capture_output=True, check=True).stdout
    a = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
    hop = 8000 // fps; n = len(a) // hop; win = 1024; out_b, out_l = [], []
    w = np.hanning(win)
    for i in range(n):
        s = a[max(0, i * hop - win // 2): max(0, i * hop - win // 2) + win]
        if len(s) < win: s = np.pad(s, (0, win - len(s)))
        sp = np.abs(np.fft.rfft(s * w)); fr = np.fft.rfftfreq(win, 1 / 8000)
        out_b.append(sp[(fr > 30) & (fr < 160)].mean()); out_l.append(np.sqrt((s ** 2).mean()))
    b, l = np.array(out_b), np.array(out_l)
    b = np.clip(b / (np.percentile(b, 98) + 1e-9), 0, 1); l = np.clip(l / (np.percentile(l, 98) + 1e-9), 0, 1)
    enc = lambda x: base64.b64encode((x * 255).astype(np.uint8).tobytes()).decode()
    return enc(b), enc(l), len(a) / 8000


def build_snd():
    SND.mkdir(parents=True, exist_ok=True)
    for k, p in SOUNDS.items():
        o = SND / f"{k}.ogg"
        if not o.exists(): o.write_bytes(get(GH + p + ".ogg"))
    env = {}
    for t in TRACKS:
        o = SND / f"{t['id']}.ogg"
        if not o.exists():
            tmp = SND / f"_{t['id']}.ogg"; tmp.write_bytes(get(GH + f"records/{t['id']}.ogg"))
            if t["q"] is None: tmp.rename(o)
            else:
                subprocess.run([ff(), "-loglevel", "error", "-y", "-i", str(tmp), "-ac", "1", "-c:a", "libvorbis", "-q:a", str(t["q"]), str(o)], check=True); tmp.unlink()
        b, l, dur = envelope(o)
        env[t["id"]] = {"bass": b, "loud": l, "dur": round(dur * 1000)}
    tr = [dict({k: v for k, v in t.items() if k != "q"}, durationMs=env[t["id"]]["dur"]) for t in TRACKS]
    (ROOT / "data" / "p11_tracks.js").write_text("/* Сгенерировано tools/build_p11.py: встроенные треки и басы по тикам (base64, 0..255) */\nwindow.ZM = window.ZM || {};\nZM.P11T = "
                                                 + json.dumps({"tracks": tr, "env": {k: {"bass": v["bass"], "loud": v["loud"]} for k, v in env.items()}}, ensure_ascii=False) + ";\n", encoding="utf-8")
    print("snd ok", {k: v["dur"] for k, v in env.items()})


def stage(m):
    st = mc_icon.STAGE; st.mkdir(exist_ok=True)
    Image.open(OUT / "jbl_column.webp").convert("RGBA").save(st / "jbl_column.png")
    m = json.loads(json.dumps(m)); m["textures"] = {"jbl_column": "jbl_column"}
    for e in m["elements"]:
        for f in e["faces"].values(): f["texture"] = "#jbl_column"
    return m


async def render_icons():
    from playwright.async_api import async_playwright
    jobs = [("note_block", lambda: mc_icon.build("note_block"), "ref"), ("jukebox", lambda: mc_icon.build("jukebox"), "ref")]
    jobs += [(f"{b}_button", (lambda b=b: mc_icon.build(f"{b}_button_inventory")), "ref") for b in BUTTONS]
    jobs += [("jbl_speaker", lambda: stage(model()), "fit")]
    tmp = ROOT / "_icon.html"; tmp.write_text(mc_icon.HTML.replace('"x", -30], ["y", 135]', '"x", -30], ["y", 135]'))
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--allow-file-access-from-files"])
            pg = await b.new_page(viewport={"width": 512, "height": 512}); await pg.goto(tmp.as_uri()); ref = None
            for n, fn, mode in [("barrel", lambda: mc_icon.build("barrel"), "ref")] + jobs:
                await pg.evaluate("m => go(m)", fn())
                o = ISO / f"{n}.png"
                await pg.screenshot(path=str(o), omit_background=True, clip={"x": 0, "y": 0, "width": 512, "height": 512})
                im = Image.open(o).convert("RGBA")
                if ref is None:
                    x0, y0, x1, y1 = im.getbbox(); c = ((x0 + x1) / 2, (y0 + y1) / 2); r = max(x1 - x0, y1 - y0) / 2 * 1.08
                    ref = tuple(int(v) for v in (c[0] - r, c[1] - r, c[0] + r, c[1] + r)); o.unlink(); continue
                if mode == "fit":
                    x0, y0, x1, y1 = im.getbbox(); c = ((x0 + x1) / 2, (y0 + y1) / 2); r = max(x1 - x0, y1 - y0) / 2 * 1.1
                    box = tuple(int(v) for v in (c[0] - r, c[1] - r, c[0] + r, c[1] + r))
                else: box = ref
                im.crop(box).resize((128, 128), Image.LANCZOS).save(o); print("icon", n)
            await b.close()
    finally:
        tmp.unlink(missing_ok=True); shutil.rmtree(mc_icon.STAGE, ignore_errors=True)


if __name__ == "__main__":
    build_tex(); write_models(); build_snd()
    if "--icons" in sys.argv: asyncio.run(render_icons())
