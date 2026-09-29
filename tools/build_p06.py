#!/usr/bin/env python3
"""Сборка ассетов для страницы №06 «Лабубу-система».

  python3 tools/build_p06.py            # модели + текстуры + звуки
  python3 tools/build_p06.py --icons    # плюс иконки фигурок (нужен playwright)

Что делает:
  1. Берёт 27 Blockbench-моделей из mod-src/models/labubu/ (бокс + 26 фигурок).
     Грани с "#missing" и ссылки на несуществующие текстуры рисуются ванильной
     «missing texture» (фиолетово-чёрная шахматка), как в игре.
  2. Текстуры фигурок из mod-src/textures/labubu/ (там фото-текстуры до 1280 px)
     обрезает до области, которую реально используют грани (uv пересчитываются),
     и ужимает эту область до 768 px максимум (обычно остаётся родное разрешение) в WebP -> assets/textures/p6/tex/.
     Текстуры бокса (16/64 px) копирует как есть в PNG.
  3. Пишет data/p06_models.js (ZM.P06M) и data/p06_tex.js (data: URI, чтобы
     WebGL работал и при открытии сайта файлом).
  4. Копирует звуки кейса в assets/sounds/p06/ (+ mp3 для Safari).
  5. --icons: рендерит иконки фигурок (256 px) в assets/textures/p6/icons/.
"""
import base64, io, json, shutil, subprocess, sys
from pathlib import Path
from PIL import Image
sys.path.insert(0, str(Path(__file__).parent))
from vanilla import base as vanilla_base

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "mod-src"
MOD = SRC / "models" / "labubu"
TEXSRC = SRC / "textures" / "labubu"
BOXSRC = SRC / "textures" / "labubu_box"
OUT = ROOT / "assets" / "textures" / "p6"
SND = ROOT / "assets" / "sounds" / "p06"
PIXEL = {"tex/labooba/jenny", "tex/labooba/weqw"}   # скрины/скины из майна: чёткие пиксели (nearest), без сглаживания
MAXS = 768      # длинная сторона ОБРЕЗАННОЙ области текстуры (родное разрешение, если меньше)

TYPES = ["red", "blue", "yellow", "white", "black", "green", "purple", "black_white", "striped",
         "kazakh", "ukrainian", "japanese", "top_hat", "faseless", "russian", "neon", "litvin",
         "anonymous", "demon", "angel", "galactic", "rainbow", "golden", "buddha", "booba", "anime"]


def missing_tex():
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 255))
    for y in range(16):
        for x in range(16):
            if (x < 8) != (y < 8):
                im.putpixel((x, y), (248, 0, 248, 255))
    return im


def conv_model(path, used):
    raw = json.loads(path.read_text(encoding="utf-8"))
    tex = {}
    for k, v in raw.get("textures", {}).items():
        if k == "particle":
            continue
        rel = v.split(":")[-1].replace("item/", "")
        if rel.startswith("labubu_box/"):
            key = "box/" + rel.split("/")[-1]
            src = BOXSRC / (rel.split("/")[-1] + ".png")
        else:
            key = "tex/" + rel
            src = TEXSRC / (rel + ".png")
        if not src.exists():
            print("  нет текстуры:", rel, "->", path.name, "(будет missing)")
            key = "missing"
        tex[k] = key
        used[key] = src
    tex["missing"] = "missing"
    els = []
    for e in raw["elements"]:
        faces = {}
        for n, f in (e.get("faces") or {}).items():
            t = (f.get("texture") or "").replace("#", "")
            if t not in tex:
                t = "missing"
            g = {"uv": f.get("uv", [0, 0, 16, 16]), "texture": "#" + t}
            if f.get("rotation"):
                g["rotation"] = f["rotation"]
            faces[n] = g
        el = {"from": e["from"], "to": e["to"], "faces": faces}
        if e.get("rotation") and e["rotation"].get("angle"):
            el["rotation"] = e["rotation"]
        els.append(el)
    return {"textures": tex, "elements": els}


def main():
    used = {}
    models = {"box": conv_model(MOD / "labubu_box.json", used)}
    for t in TYPES:
        models[t] = conv_model(MOD / f"labubu_figurine_{t}.json", used)
    used["missing"] = None
    # ванильный сундук (иконка ачивки «Рулетка судьбы»): модель из entity/chest/normal.png, uv 64px -> /4
    q = lambda u0, v0, u1, v1: [u0 / 4, v0 / 4, u1 / 4, v1 / 4]
    def cube(fr, to, n, s, w, e, u, d):
        return {"from": fr, "to": to, "faces": {k: {"uv": v, "texture": "#c"} for k, v in
                zip(["north", "south", "west", "east", "up", "down"], [n, s, w, e, u, d])}}
    models["chest"] = {"textures": {"c": "chest.png"}, "elements": [
        cube([1, 0, 1], [15, 10, 15], q(42, 33, 56, 43), q(14, 33, 28, 43), q(0, 33, 14, 43), q(28, 33, 42, 43), q(28, 19, 42, 33), q(28, 19, 42, 33)),
        cube([1, 9, 1], [15, 14, 15], q(42, 14, 56, 19), q(14, 14, 28, 19), q(0, 14, 14, 19), q(28, 14, 42, 19), q(28, 0, 42, 14), q(14, 0, 28, 14)),
        cube([7, 7, 15], [9, 11, 16], q(4, 1, 6, 5), q(1, 1, 3, 5), q(0, 1, 1, 5), q(3, 1, 4, 5), q(1, 0, 3, 1), q(3, 0, 5, 1)),
    ]}
    shutil.copy(vanilla_base() / "textures/entity/chest/normal.png", OUT / "chest.png")

    # какая часть каждой фото-текстуры реально используется гранями (uv 0..16) -> обрезаем до неё
    bbox = {}
    for k, m in models.items():
        if k == "chest":
            continue
        for e in m["elements"]:
            for f in e["faces"].values():
                key = m["textures"].get(f["texture"][1:])
                if not key or not key.startswith("tex/"):
                    continue
                u0, v0, u1, v1 = f["uv"]
                b = bbox.setdefault(key, [16, 16, 0, 0])
                b[0] = min(b[0], u0, u1); b[1] = min(b[1], v0, v1); b[2] = max(b[2], u0, u1); b[3] = max(b[3], v0, v1)
    remap = {}

    inline = {}
    for old in [*(OUT / "tex").glob("**/*.webp"), *(OUT / "tex").glob("**/*.png")]:
        old.unlink()
    (OUT).mkdir(parents=True, exist_ok=True)
    for key, src in sorted(used.items()):
        if key == "missing":
            im, ext = missing_tex(), "png"
        elif key.startswith("box/"):
            im, ext = Image.open(src).convert("RGBA"), "png"
        else:
            im = Image.open(src).convert("RGBA")
            b = bbox.get(key)
            if b and b[2] > b[0] and b[3] > b[1]:
                W, H = im.size
                x0 = max(0, int(b[0] / 16 * W) - 2); y0 = max(0, int(b[1] / 16 * H) - 2)
                x1 = min(W, -int(-b[2] / 16 * W) + 2); y1 = min(H, -int(-b[3] / 16 * H) + 2)
                im = im.crop((x0, y0, x1, y1))
                remap[key] = (x0 / W * 16, y0 / H * 16, (x1 - x0) / W * 16, (y1 - y0) / H * 16)
            s = MAXS / max(im.size)
            if s < 1:
                im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
            ext = "webp"
            # плоская графика (радуга и т.п.: мало цветов) и пиксельные скины -> PNG + nearest, иначе сглаживание мылит края
            cols = sorted(c for c, _ in (im.getcolors(1 << 16) or [(1, 0)] * 99999))[::-1]
            if key in PIXEL or sum(cols[:24]) >= 0.97 * im.width * im.height:
                ext = "png"
        dst = OUT / f"{key}.{ext}"
        dst.parent.mkdir(parents=True, exist_ok=True)
        if ext == "webp":
            im.save(dst, "WEBP", quality=90, method=6)
        else:
            im.save(dst, "PNG", optimize=True)
        inline[dst.relative_to(ROOT / "assets").as_posix()] = f"data:image/{ext};base64," + base64.b64encode(dst.read_bytes()).decode()
    # пересчёт uv под обрезанные текстуры
    for k, m in models.items():
        if k == "chest":
            continue
        for e in m["elements"]:
            for f in e["faces"].values():
                r = remap.get(m["textures"].get(f["texture"][1:]))
                if r:
                    ox, oy, sw, sh = r
                    u0, v0, u1, v1 = f["uv"]
                    f["uv"] = [round((u0 - ox) * 16 / sw, 4), round((v0 - oy) * 16 / sh, 4),
                               round((u1 - ox) * 16 / sw, 4), round((v1 - oy) * 16 / sh, 4)]
    # у бокса и missing пиксель-арт (nearest), у фигурок фото-текстуры (linear): ext в модели
    for k, m in models.items():
        if k != "chest":
            m["textures"] = {t: v + (".png" if not v.startswith("tex/") or (OUT / f"{v}.png").exists() else ".webp") for t, v in m["textures"].items()}
    inline["textures/p6/chest.png"] = "data:image/png;base64," + base64.b64encode((OUT / "chest.png").read_bytes()).decode()
    # частицы из игры: сердечко (радужный/ЛаBOOBA), glint = happy_villager (награда из кейса)
    for n in ["heart", "glint"]:
        shutil.copy(vanilla_base() / f"textures/particle/{n}.png", OUT / f"p_{n}.png")
    shutil.copy(vanilla_base() / "textures/block/pink_wool.png", OUT / "pink_wool.png")   # фон ветки ачивок

    (ROOT / "data/p06_models.js").write_text("/* Сгенерировано tools/build_p06.py, руками не править */\nwindow.ZM = window.ZM || {};\nZM.P06M = "
                                             + json.dumps(models, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    (ROOT / "data/p06_tex.js").write_text("/* Сгенерировано tools/build_p06.py: текстуры 3D-моделей для WebGL, руками не править */\n"
                                          "window.ZM_TEX_INLINE = Object.assign(window.ZM_TEX_INLINE || {}, " + json.dumps(inline) + ");\n", encoding="utf-8")
    print("текстур:", len(inline), "· p06_tex.js", round((ROOT / "data/p06_tex.js").stat().st_size / 1024), "KB",
          "· p06_models.js", round((ROOT / "data/p06_models.js").stat().st_size / 1024), "KB")

    # звуки
    SND.mkdir(parents=True, exist_ok=True)
    for name in ["case_battle"]:
        f = SRC / "sounds" / "all" / f"{name}.ogg"
        if f.exists():
            shutil.copy(f, SND / f.name)
    for n in ["orb", "levelup", "click", "pop"]:   # ванильные, уже скачаны для №05
        shutil.copy(ROOT / f"assets/sounds/p05/vanilla/{n}.ogg", SND / f"{n}.ogg")
    try:
        import imageio_ffmpeg
        ff = imageio_ffmpeg.get_ffmpeg_exe()
        for f in SND.glob("*.ogg"):
            m = f.with_suffix(".mp3")
            if not m.exists():
                subprocess.run([ff, "-y", "-loglevel", "error", "-i", str(f), "-b:a", "128k", str(m)], check=True)
    except Exception as e:
        print("mp3 skip", e)

    if "--icons" in sys.argv:
        ic = OUT / "icons"; ic.mkdir(parents=True, exist_ok=True)
        for k in ["box", "chest"] + TYPES:
            subprocess.run([sys.executable, str(ROOT / "tools/render_model.py"), "data/p06_models.js", f"ZM.P06M.{k}",
                            "assets/textures/p6/", "-16" if k not in ("box", "chest") else "-30", "30" if k != "box" else "22", str(ic / f"{k}.png"), "256"],
                           cwd=ROOT, check=True)


if __name__ == "__main__":
    main()
