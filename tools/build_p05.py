"""
№05 · Житель-Даун: подготовка ассетов.

  1. Текстура жителя: mod-src/textures/adun_villager/adun_villager.png (своя), иначе временно
     ванильный житель равнин (villager.png + type/plains.png).
  2. 3D-модель жителя = ванильная VillagerModel 1.19.2, переписанная в формат Blockbench (data/p05_models.js).
  3. Яйцо призыва: mod-src/models/adun_egg/*.json + mod-src/textures/adun_egg/texture1..7.png.
  4. Ванильные звуки жителя как запасные, пока нет своих (assets/sounds/p05/vanilla/).
     Свои звуки класть в assets/sounds/p05/adun/ (имена в data/p05_adun.js -> SOUNDS).
  5. Текстуры моделей в data/p05_tex.js (data: URI), чтобы WebGL работал и при открытии файлом.

Запуск: python3 tools/build_p05.py
"""
import base64, json, shutil, urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "mod-src"
import sys; sys.path.insert(0, str(Path(__file__).parent)); from vanilla import base as _vb
BASE = _vb()
OUT = ROOT / "assets" / "textures" / "p5"
SND = ROOT / "assets" / "sounds" / "p05"
MCURL = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19.2/assets/minecraft/"


def fetch(rel, dest):
    dest = Path(dest)
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    if (BASE / rel).exists():
        shutil.copy(BASE / rel, dest); return dest
    req = urllib.request.Request(MCURL + rel, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        dest.write_bytes(r.read())
    return dest


# ---------- ванильная VillagerModel -> элементы Blockbench ----------
T = 64  # размер текстуры жителя


def box(name, u, v, x, y, z, w, h, d, inflate=0.0, mirror=False, rot=None):
    """Коробка из координат модели Minecraft (y вниз, перёд = −z) в элемент Blockbench (y вверх, центр 8)."""
    k = 16 / T
    f = lambda a, b, c, e: [a * k, b * k, c * k, e * k]
    faces = {
        "north": f(u + d, v + d, u + d + w, v + d + h),
        "south": f(u + 2 * d + w, v + d, u + 2 * d + 2 * w, v + d + h),
        "east": f(u + d + w, v + d, u + 2 * d + w, v + d + h),
        "west": f(u, v + d, u + d, v + d + h),
        # верх (причёска) повёрнут на 180°, как в игре: иначе полоска с макушки уезжает на лоб
        "up": f(u + d + w, v + d, u + d, v),
        "down": f(u + d + w, v + d, u + d + 2 * w, v),
    }
    if mirror:
        faces = {n: [c[2], c[1], c[0], c[3]] for n, c in faces.items()}
        faces["east"], faces["west"] = faces["west"], faces["east"]
    x0, x1 = x - inflate, x + w + inflate
    y0, y1 = y - inflate, y + h + inflate
    z0, z1 = z - inflate, z + d + inflate
    el = {"name": name, "from": [x0 + 8, 24 - y1, z0 + 8], "to": [x1 + 8, 24 - y0, z1 + 8],
          "faces": {n: {"uv": c, "texture": "#0"} for n, c in faces.items()}}
    if rot:
        el["rotation"] = rot
    return el


def villager_model():
    arms_rot = {"angle": 43, "axis": "x", "origin": [8, 24 - 3, -1 + 8]}   # руки скрещены: xRot −0.75 рад
    els = [
        box("head", 0, 0, -4, -10, -4, 8, 10, 8),
        box("hat", 32, 0, -4, -10, -4, 8, 10, 8, inflate=0.51),
        box("nose", 24, 0, -1, -3, -6, 2, 4, 2),
        box("body", 16, 20, -4, 0, -3, 8, 12, 6),
        box("jacket", 0, 38, -4, 0, -3, 8, 18, 6, inflate=0.5),
        box("arm_r", 44, 22, -8, 1, -3, 4, 8, 4, rot=arms_rot),
        box("arm_l", 44, 22, 4, 1, -3, 4, 8, 4, mirror=True, rot=arms_rot),
        box("arms_mid", 40, 38, -4, 5, -3, 8, 4, 4, rot=arms_rot),
        box("leg_r", 0, 22, -4, 12, -2, 4, 12, 4),
        box("leg_l", 0, 22, 0, 12, -2, 4, 12, 4, mirror=True),
    ]
    return {"textures": {"0": "adun_villager"}, "elements": els}


def villager_texture():
    M = OUT / "models"; M.mkdir(parents=True, exist_ok=True)
    own = SRC / "textures" / "adun_villager" / "adun_villager.png"
    if own.exists():
        shutil.copy(own, M / "adun_villager.png"); return False
    base = Image.open(fetch("textures/entity/villager/villager.png", OUT / "vanilla/villager.png")).convert("RGBA")
    plains = Image.open(fetch("textures/entity/villager/type/plains.png", OUT / "vanilla/villager_plains.png")).convert("RGBA")
    base.alpha_composite(plains)
    base.save(M / "adun_villager.png")
    return True


def egg():
    E = OUT / "egg"; E.mkdir(parents=True, exist_ok=True)
    src = next((SRC / "models" / "adun_egg").glob("*.json"))
    raw = json.loads(src.read_text(encoding="utf-8"))
    tex = {k: v.split("/")[-1] for k, v in raw["textures"].items() if k != "particle"}
    for n in set(tex.values()):
        shutil.copy(SRC / "textures" / "adun_egg" / f"{n}.png", E / f"{n}.png")
    return {"textures": tex, "elements": raw["elements"]}


VANILLA = ["gui/container/villager2.png", "item/emerald.png", "item/iron_sword.png", "item/wooden_sword.png", "item/golden_apple.png",
           "item/golden_carrot.png", "block/dirt.png", "block/grass_block_side.png", "block/grass_block_top.png",
           "block/coarse_dirt.png", "block/podzol_top.png", "block/farmland.png", "block/dirt_path_top.png", "block/composter_side.png", "item/cauldron.png", "item/brewing_stand.png", "item/bell.png", "item/name_tag.png", "item/rotten_flesh.png",
           "block/lectern_front.png", "block/lectern_top.png", "block/oak_planks.png", "block/stone.png", "block/cobblestone.png", "block/dispenser_front.png",
           "block/command_block_front.png", "gui/icons.png", "particle/angry.png", "particle/glint.png",
           "block/barrel_side.png", "block/smoker_front.png", "block/blast_furnace_front.png", "block/cartography_table_top.png", "block/fletching_table_top.png",
           "block/smithing_table_front.png", "block/loom_front.png", "block/stonecutter_saw.png", "block/grindstone_side.png", "block/cauldron_side.png", "block/brewing_stand.png"]
SOUNDS = [("mob/villager/idle1", "idle1"), ("mob/villager/idle2", "idle2"), ("mob/villager/idle3", "idle3"),
          ("mob/villager/hit1", "hit1"), ("mob/villager/hit2", "hit2"), ("mob/villager/hit3", "hit3"),
          ("mob/villager/death", "death"), ("mob/villager/yes1", "yes1"), ("mob/villager/yes2", "yes2"),
          ("mob/villager/no1", "no1"), ("mob/villager/haggle1", "haggle1"),
          ("random/pop", "pop"), ("random/click", "click"), ("random/orb", "orb"), ("random/levelup", "levelup"),
          ("dig/gravel1", "dirt1"), ("dig/gravel2", "dirt2"), ("damage/hit1", "punch"), ("mob/zombie/say1", "zombie"), ("entity/player/attack/strong1", "strong")]


def main():
    V = OUT / "vanilla"
    for rel in VANILLA:
        try: fetch("textures/" + rel, V / rel.split("/")[-1])
        except Exception as e: print("skip", rel, e)
    for rel, name in SOUNDS:
        try: fetch(f"sounds/{rel}.ogg", SND / "vanilla" / f"{name}.ogg")
        except Exception as e: print("skip sound", rel, e)
    try:  # mp3 для Safari
        import imageio_ffmpeg, subprocess
        ff = imageio_ffmpeg.get_ffmpeg_exe()
        for f in SND.rglob("*.ogg"):
            m = f.with_suffix(".mp3")
            if not m.exists():
                subprocess.run([ff, "-y", "-loglevel", "error", "-i", str(f), "-b:a", "128k", str(m)], check=True)
    except Exception as e:
        print("mp3 skip", e)
    # иконки блоков как в инвентаре (изометрия)
    import sys; sys.path.insert(0, str(Path(__file__).parent))
    from build_data import iso_box
    ISO = OUT / "iso"; ISO.mkdir(parents=True, exist_ok=True)
    iso_box(V / "dirt.png", (0, 0, 0, 16, 16, 16), ISO / "dirt.png")
    iso_box(V / "lectern_top.png", (0, 0, 0, 16, 16, 16), ISO / "lectern.png", tex_side=V / "lectern_front.png")
    ph = villager_texture()
    data = {"villager": villager_model(), "egg": egg(), "info": {"placeholder": ph}}
    (ROOT / "data/p05_models.js").write_text("/* Сгенерировано tools/build_p05.py, руками не править */\nwindow.ZM = window.ZM || {};\nZM.P05M = "
                                             + json.dumps(data, ensure_ascii=False) + ";\n", encoding="utf-8")
    out = {}
    for d in ["models", "egg"]:
        for f in sorted((OUT / d).glob("*.png")):
            out[f.relative_to(ROOT / "assets").as_posix()] = "data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
    (ROOT / "data/p05_tex.js").write_text("/* Сгенерировано tools/build_p05.py: текстуры 3D-моделей для WebGL, руками не править */\n"
                                          "window.ZM_TEX_INLINE = Object.assign(window.ZM_TEX_INLINE || {}, " + json.dumps(out) + ");\n", encoding="utf-8")
    print("ok, placeholder texture:", ph)


if __name__ == "__main__":
    main()
