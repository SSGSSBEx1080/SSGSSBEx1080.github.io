#!/usr/bin/env python3
"""Сборка ассетов для страницы №03 «Снайперки».

  python3 tools/build_p03.py

Что делает:
  1. Раскладывает текстуры снайперок из mod-src/textures/snipers/<tier>_sniper/ в assets/textures/p3/models/<tier>/.
     Если у тира нет своих мелких текстур, они временно перекрашиваются из железной (флаг placeholder в data/p03_models.js).
  2. Рендерит инвентарные иконки снайперок и пули из Blockbench-моделей (софт-растеризатор, как в игре: верх 100%, бока 80/60%).
  3. Качает ванильные текстуры/звуки 1.19.2 (мобы, блоки, предметы) и собирает спрайты мобов «анфас».
  4. Пишет data/p03_models.js (модели + пути текстур) для 3D-просмотрщика на странице.
"""
import json, math, shutil, urllib.request, colorsys
from pathlib import Path
from PIL import Image, ImageDraw

import build_data as BD   # iso_box

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "mod-src"
OUT = ROOT / "assets" / "textures" / "p3"
MCURL = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19.2/assets/minecraft/"
TIERS = ["iron", "golden", "diamond", "netherite"]


def fetch(rel, dest):
    dest = Path(dest)
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(MCURL + rel, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        dest.write_bytes(r.read())
    return dest


# ---------------------------------------------------------------- текстуры тиров
TEX_KEYS = ["iron_sniper"] + ["texture"] + [f"texture{i:02d}" for i in range(1, 13)]


def recolor(im, palette):
    """Перекраска серых пикселей железной текстуры в палитру тира (по яркости). Цветные/чёрные пиксели не трогаем."""
    im = im.convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if s > 0.18 or l < 0.16:
                continue
            t = min(1, max(0, (l - 0.16) / 0.84))
            i = t * (len(palette) - 1)
            i0 = int(i); i1 = min(len(palette) - 1, i0 + 1); f = i - i0
            c = [int(palette[i0][k] * (1 - f) + palette[i1][k] * f) for k in range(3)]
            px[x, y] = (*c, a)
    return im


PAL = {
    "golden": [(0x6a, 0x3c, 0x00), (0xb2, 0x6f, 0x0b), (0xe8, 0xb9, 0x20), (0xfd, 0xf5, 0x5f), (0xff, 0xff, 0xb5)],
    "netherite": [(0x1c, 0x17, 0x18), (0x31, 0x29, 0x2b), (0x4a, 0x41, 0x43), (0x6a, 0x5f, 0x62), (0x92, 0x86, 0x88)],
}


def build_textures():
    info = {}
    iron = SRC / "textures/snipers/iron_sniper"
    for t in TIERS:
        d = OUT / "models" / t
        d.mkdir(parents=True, exist_ok=True)
        src = SRC / f"textures/snipers/{t}_sniper"
        own = []
        for k in TEX_KEYS:
            cand = [src / f"{k}.png"]
            if k == "iron_sniper":
                cand = [src / f"{t}_sniper.png", src / "gold_sniper.png", src / "iron_sniper.png"]
            got = next((c for c in cand if c.exists()), None)
            if got:
                shutil.copy(got, d / f"{k}.png"); own.append(k)
            else:
                recolor(Image.open(iron / f"{k}.png"), PAL[t]).save(d / f"{k}.png")
        info[t] = {"own": own, "placeholder": len(own) < len(TEX_KEYS)}
    # пуля
    b = OUT / "models" / "bullet"; b.mkdir(parents=True, exist_ok=True)
    for i in (1, 2, 3):
        shutil.copy(SRC / f"textures/snipers/bullet/texture_bullet{i}.png", b / f"texture_bullet{i}.png")
    shutil.copy(SRC / "textures/snipers/bullet/bullet_item.png", OUT / "bullet_item.png")
    shutil.copy(SRC / "textures/gui/sniper_scope.png", OUT / "sniper_scope.png")
    return info


# ---------------------------------------------------------------- софт-растеризатор Blockbench-модели
def rot_axis(p, axis, ang, origin):
    if not ang:
        return p
    a = math.radians(ang)
    c, s = math.cos(a), math.sin(a)
    x, y, z = (p[i] - origin[i] for i in range(3))
    if axis == "x":
        y, z = y * c - z * s, y * s + z * c
    elif axis == "y":
        x, z = x * c + z * s, -x * s + z * c
    else:
        x, y = x * c - y * s, x * s + y * c
    return (x + origin[0], y + origin[1], z + origin[2])


def face_quads(e):
    """Углы граней в порядке TL, TR, BR, BL — так, как на них ложатся uv (u1,v1)->(u2,v2) в Minecraft."""
    x0, y0, z0 = e["from"]; x1, y1, z1 = e["to"]
    F = {
        "north": [(x1, y1, z0), (x0, y1, z0), (x0, y0, z0), (x1, y0, z0)],
        "south": [(x0, y1, z1), (x1, y1, z1), (x1, y0, z1), (x0, y0, z1)],
        "west":  [(x0, y1, z0), (x0, y1, z1), (x0, y0, z1), (x0, y0, z0)],
        "east":  [(x1, y1, z1), (x1, y1, z0), (x1, y0, z0), (x1, y0, z1)],
        "up":    [(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)],
        "down":  [(x0, y0, z1), (x1, y0, z1), (x1, y0, z0), (x0, y0, z0)],
    }
    r = e.get("rotation") or {}
    out = {}
    for k, pts in F.items():
        if k in e["faces"]:
            out[k] = [rot_axis(p, r.get("axis", "y"), r.get("angle", 0), r.get("origin", [8, 8, 8])) for p in pts]
    return out


SHADE = {"up": 1.0, "down": 0.5, "north": 0.8, "south": 0.8, "east": 0.6, "west": 0.6}


def homography(src, dst):
    """Коэффициенты PERSPECTIVE для PIL: отображение dst(выход) -> src(вход)."""
    import numpy as np
    A, B = [], []
    for (x, y), (u, v) in zip(dst, src):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); B.append(v)
    return list(np.linalg.solve(np.array(A, float), np.array(B, float)))


def render_model(model, texdir, out, size=128, yaw=0, pitch=0, roll=0, pad=0.08, ss=4):
    import numpy as np
    textures = {}
    for k, v in model["textures"].items():
        name = v.split("/")[-1]
        p = Path(texdir) / f"{name}.png"
        if p.exists():
            textures["#" + k] = Image.open(p).convert("RGBA")

    def R(p):
        x, y, z = p[0] - 8, p[1] - 8, p[2] - 8
        for ax, a in (("z", roll), ("y", yaw), ("x", pitch)):
            a = math.radians(a); c, s = math.cos(a), math.sin(a)
            if ax == "x": y, z = y * c - z * s, y * s + z * c
            elif ax == "y": x, z = x * c + z * s, -x * s + z * c
            else: x, y = x * c - y * s, x * s + y * c
        return (x, y, z)

    faces = []
    for e in model["elements"]:
        for k, pts in face_quads(e).items():
            f = e["faces"][k]
            if f.get("texture") not in textures:
                continue
            P = [R(p) for p in pts]
            # нормаль к зрителю (+z)
            ax_, ay_ = P[1][0] - P[0][0], P[1][1] - P[0][1]
            bx_, by_ = P[3][0] - P[0][0], P[3][1] - P[0][1]
            nz = ax_ * by_ - ay_ * bx_
            if nz >= -1e-6:   # экранная ориентация (y вверх): видимые грани идут по часовой -> nz < 0
                continue
            faces.append((sum(p[2] for p in P) / 4, P, f, k))
    if not faces:
        return
    xs = [p[0] for _, P, _, _ in faces for p in P]; ys = [p[1] for _, P, _, _ in faces for p in P]
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    S = size * ss
    k = S * (1 - 2 * pad) / max(w, h)
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    scr = lambda p: (S / 2 + (p[0] - cx) * k, S / 2 - (p[1] - cy) * k)
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    for _, P, f, name in sorted(faces, key=lambda t: t[0]):
        tex = textures[f["texture"]]
        tw, th = tex.size
        u1, v1, u2, v2 = f["uv"]
        src = [(u1 * tw / 16, v1 * th / 16), (u2 * tw / 16, v1 * th / 16), (u2 * tw / 16, v2 * th / 16), (u1 * tw / 16, v2 * th / 16)]
        rot = f.get("rotation", 0) // 90
        src = src[rot:] + src[:rot] if rot else src
        dst = [scr(p) for p in P]
        # вырожденные uv (0 px) -> берём 1 пиксель
        if abs(src[0][0] - src[1][0]) < 1e-6 and abs(src[0][1] - src[3][1]) < 1e-6:
            continue
        try:
            co = homography(src, dst)
        except Exception:
            continue
        sh = SHADE[name]
        t2 = tex if sh == 1 else Image.merge("RGBA", (*Image.eval(tex.convert("RGB"), lambda v, sh=sh: int(v * sh)).split(), tex.split()[3]))
        warped = t2.transform((S, S), Image.PERSPECTIVE, co, resample=Image.NEAREST)
        mask = Image.new("L", (S, S), 0)
        ImageDraw.Draw(mask).polygon(dst, fill=255)
        a = Image.composite(warped, Image.new("RGBA", (S, S), (0, 0, 0, 0)), mask)
        img.alpha_composite(a)
    img.resize((size, size), Image.LANCZOS).save(out)


# ---------------------------------------------------------------- мобы анфас
def compose(tex, parts, w, h):
    t = Image.open(tex).convert("RGBA")
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for (u, v, pw, ph, x, y, *fl) in parts:
        c = t.crop((u, v, u + pw, v + ph))
        if fl and fl[0]:
            c = c.transpose(Image.FLIP_LEFT_RIGHT)
        out.alpha_composite(c, (x, y))
    return out


def build_mobs():
    M = OUT / "mobs"; M.mkdir(parents=True, exist_ok=True)
    V = OUT / "vanilla"; V.mkdir(parents=True, exist_ok=True)
    z = fetch("textures/entity/zombie/zombie.png", V / "zombie.png")
    sk = fetch("textures/entity/skeleton/skeleton.png", V / "skeleton.png")
    cr = fetch("textures/entity/creeper/creeper.png", V / "creeper.png")
    en = fetch("textures/entity/enderman/enderman.png", V / "enderman.png")
    ene = fetch("textures/entity/enderman/enderman_eyes.png", V / "enderman_eyes.png")
    ig = fetch("textures/entity/iron_golem/iron_golem.png", V / "iron_golem.png")
    # зомби 16x32 (руки вытянуты к зрителю: видны торцы кистей 4x4)
    # у зомби (в отличие от игрока) левые рука и нога — зеркальные копии правых, низ текстуры пустой
    zm = compose(z, [(4, 20, 4, 12, 4, 20), (4, 20, 4, 12, 8, 20, 1), (20, 20, 8, 12, 4, 8), (8, 8, 8, 8, 4, 0), (40, 8, 8, 8, 4, 0),
                     (44, 20, 4, 12, 0, 8), (44, 20, 4, 12, 12, 8, 1)], 16, 32)
    zm.save(M / "zombie.png")
    compose(sk, [(2, 18, 2, 12, 5, 20), (2, 18, 2, 12, 9, 20, 1), (20, 20, 8, 12, 4, 8), (42, 18, 2, 12, 2, 8), (42, 18, 2, 12, 12, 8, 1),
                 (8, 8, 8, 8, 4, 0), (40, 8, 8, 8, 4, 0)], 16, 32).save(M / "skeleton.png")
    compose(cr, [(4, 20, 4, 6, 4, 20), (4, 20, 4, 6, 8, 20, 1), (20, 20, 8, 12, 4, 8), (8, 8, 8, 8, 4, 0)], 16, 26).save(M / "creeper.png")
    em = compose(en, [(58, 2, 2, 30, 5, 20), (58, 2, 2, 30, 9, 20, 1), (36, 20, 8, 12, 4, 8), (58, 2, 2, 30, 2, 8), (58, 2, 2, 30, 12, 8, 1),
                      (8, 8, 8, 8, 4, 0)], 16, 50)
    eyes = compose(ene, [(8, 8, 8, 8, 4, 0)], 16, 50)
    em.alpha_composite(eyes); em.save(M / "enderman.png")
    compose(ig, [(42, 5, 6, 16, 5, 27), (65, 5, 6, 16, 15, 27, 1), (11, 51, 18, 12, 4, 10), (6, 76, 9, 5, 8, 22),
                 (66, 27, 4, 30, 0, 10), (66, 64, 4, 30, 22, 10), (8, 8, 8, 10, 9, 0), (26, 2, 2, 4, 12, 6)], 26, 43).save(M / "iron_golem.png")


def build_vanilla():
    V = OUT / "vanilla"
    for n in ["target_side", "target_top", "stone", "obsidian", "bedrock", "grass_block_top", "grass_block_side", "dirt", "oak_log",
              "oak_leaves", "iron_block", "gold_block", "diamond_block", "netherite_block", "stone_bricks", "cobblestone", "gravel",
              "deepslate", "hay_block_side", "hay_block_top", "fire_0", "soul_fire_0", "crafting_table_front", "crafting_table_top", "crafting_table_side"]:
        try:
            fetch(f"textures/block/{n}.png", V / f"{n}.png")
        except Exception as ex:
            print("skip", n, ex)
    for n in ["spyglass", "iron_ingot", "iron_nugget", "gunpowder", "nether_star", "end_crystal", "enchanted_book", "book", "gold_ingot",
              "diamond", "netherite_ingot", "lapis_lazuli", "experience_bottle"]:
        fetch(f"textures/item/{n}.png", V / f"item_{n}.png")
    for n in ["end_rod", "spark_0", "spark_3", "spark_6", "soul_fire_flame", "flame", "dragon_breath_0", "dragon_breath_2", "big_smoke_0",
              "critical_hit", "damage", "glint"]:
        try:
            fetch(f"textures/particle/{n}.png", V / f"particle_{n}.png")
        except Exception as ex:
            print("skip particle", n, ex)
    fetch("textures/gui/icons.png", V / "icons.png")
    fetch("textures/gui/widgets.png", V / "widgets.png")
    fetch("textures/gui/container/crafting_table.png", V / "crafting_table_gui.png")
    fetch("textures/gui/container/enchanting_table.png", V / "enchanting_table_gui.png")
    # звуки: отказ раздатчика и попадание стрелы
    S = ROOT / "assets" / "sounds" / "p03"; S.mkdir(parents=True, exist_ok=True)
    raw = SRC / "sounds" / "vanilla"
    for rel, n in [("sounds/random/click.ogg", "dispenser_fail"), ("sounds/random/bowhit1.ogg", "bowhit1"), ("sounds/random/bowhit2.ogg", "bowhit2"),
                   ("sounds/random/bowhit3.ogg", "bowhit3"), ("sounds/random/bowhit4.ogg", "bowhit4"), ("sounds/mob/endermen/portal.ogg", "ender_portal"),
                   ("sounds/random/successful_hit.ogg", "hit_player"), ("sounds/mob/irongolem/hit1.ogg", "golem_hit"), ("sounds/mob/zombie/hurt1.ogg", "zombie_hurt"),
                   ("sounds/random/break.ogg", "break"), ("sounds/dig/stone1.ogg", "stone_break"), ("sounds/random/levelup.ogg", "levelup"),
                   ("sounds/random/orb.ogg", "orb")]:
        try:
            p = fetch(rel, raw / Path(rel).name.replace(".ogg", f"_{n}.ogg"))
            to_web(p, S / n)
        except Exception as ex:
            print("skip sound", rel, ex)


def to_web(src, base):
    import subprocess, imageio_ffmpeg
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    for ext, args in (("mp3", ["-b:a", "128k"]), ("ogg", ["-c:a", "libvorbis", "-q:a", "4"])):
        out = Path(f"{base}.{ext}")
        if not out.exists():
            subprocess.run([ff, "-loglevel", "error", "-y", "-i", str(src), *args, str(out)], check=True)


def build_icons(info):
    I = OUT / "icons"; I.mkdir(parents=True, exist_ok=True)
    sn = json.loads((SRC / "models/snipers/iron_sniper.json").read_text())
    bu = json.loads((SRC / "models/snipers/bullet.json").read_text())
    for t in TIERS:
        # как в инвентаре: снайперка по диагонали (gui: rotation z -40 и немного на себя)
        render_model(sn, OUT / "models" / t, I / f"{t}_sniper.png", size=128, yaw=188, pitch=-12, roll=-40, pad=0.02)
        render_model(sn, OUT / "models" / t, I / f"{t}_sniper_side.png", size=512, yaw=-18, pitch=14, roll=0, pad=0.02)
    render_model(bu, OUT / "models" / "bullet", I / "bullet_3d.png", size=256, yaw=-20, pitch=18, roll=0, pad=0.05)
    V = OUT / "vanilla"
    for b in ["iron_block", "gold_block", "diamond_block", "netherite_block", "obsidian", "stone", "bedrock", "target_side"]:
        top = V / (f"target_top.png" if b == "target_side" else f"{b}.png")
        BD.iso_box(top, (0, 0, 0, 16, 16, 16), I / f"{b}.png", tex_side=V / f"{b}.png")
    BD.iso_box(V / "crafting_table_top.png", (0, 0, 0, 16, 16, 16), I / "crafting_table.png", tex_side=V / "crafting_table_front.png")


def write_models(info):
    sn = json.loads((SRC / "models/snipers/iron_sniper.json").read_text())
    bu = json.loads((SRC / "models/snipers/bullet.json").read_text())
    slim = lambda m: {"textures": {k: v.split("/")[-1] for k, v in m["textures"].items() if k != "particle"},
                      "elements": [{"from": e["from"], "to": e["to"], "rotation": e.get("rotation"),
                                    "faces": {k: {"uv": f["uv"], "texture": f["texture"], **({"rotation": f["rotation"]} if f.get("rotation") else {})}
                                              for k, f in e["faces"].items()}} for e in m["elements"]]}
    data = {"sniper": slim(sn), "bullet": slim(bu), "tiers": info}
    js = "/* Сгенерировано tools/build_p03.py из mod-src/models/snipers (mod-src/models/snipers), руками не править */\n" \
         "window.ZM = window.ZM || {};\nZM.P03M = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
    (ROOT / "data" / "p03_models.js").write_text(js, encoding="utf-8")



def build_inline_tex():
    """Текстуры моделей в data/p03_tex.js (data: URI). Без этого WebGL в Chrome не может взять
    картинки при открытии сайта файлом (file://): браузер считает их чужими и не даёт в видеокарту."""
    import base64, json
    out = {}
    for f in sorted((OUT / "models").rglob("*.png")):
        out[f.relative_to(ROOT / "assets").as_posix()] = "data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
    (ROOT / "data/p03_tex.js").write_text("/* Сгенерировано tools/build_p03.py: текстуры 3D-моделей для WebGL, руками не править */\nwindow.ZM_TEX_INLINE = Object.assign(window.ZM_TEX_INLINE || {}, " + json.dumps(out) + ");\n", encoding="utf-8")

if __name__ == "__main__":
    info = build_textures()
    build_vanilla()
    build_mobs()
    build_icons(info)
    write_models(info)
    build_inline_tex()
    print("ok", {k: v["placeholder"] for k, v in info.items()})
