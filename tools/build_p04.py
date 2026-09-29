"""
№04 · Шлем шахтёра: подготовка ассетов.

  1. Качает ванильные текстуры 1.19.2 (стена шахты, руды, стадии разрушения, шлемы для сравнения, звуки копания).
  2. Собирает 3D-модель шлема (data/p04_models.js): коробка брони головы 10×10×10 из текстуры слоя брони + фонарь спереди.
     Если в mod-src/textures/miner_helmet/ лежат свои текстуры (miner_layer_1.png, miner_helmet.png, lamp.png),
     берутся они; иначе временно золотой шлем и лампа (флаг placeholder).
  3. Кладёт текстуры модели в data/p04_tex.js (data: URI), чтобы WebGL работал и при открытии файлом.

Запуск: python3 tools/build_p04.py
"""
import base64, json, shutil, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "mod-src"
OUT = ROOT / "assets" / "textures" / "p4"
SND = ROOT / "assets" / "sounds" / "p04"
MC = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19.2/assets/minecraft/"


import sys; sys.path.insert(0, str(Path(__file__).parent)); from vanilla import base as _vb
BASE = _vb()   # полная база ванильных текстур 1.19.2 (assets/vanilla/vanilla-1.19.2.zip)


def fetch(rel, dest):
    dest = Path(dest)
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    if (BASE / rel).exists():                       # сначала берём из локальной базы
        shutil.copy(BASE / rel, dest)
        return dest
    req = urllib.request.Request(MC + rel, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        dest.write_bytes(r.read())
    return dest


ORES = ["coal", "iron", "copper", "gold", "redstone", "lapis", "diamond", "emerald"]
BLOCKS = ["stone", "deepslate", "tuff", "granite", "diorite", "andesite", "gravel", "dirt", "grass_block_side", "bedrock",
          "cobblestone", "cobbled_deepslate", "redstone_lamp_on", "glowstone", "torch", "soul_torch", "redstone_torch",
          "glow_lichen", "sea_lantern", "jack_o_lantern", "lava_still", "crafting_table_front", "crafting_table_top"] + \
         [f"{o}_ore" for o in ORES] + [f"deepslate_{o}_ore" for o in ORES] + [f"destroy_stage_{i}" for i in range(10)]
ITEMS = ["golden_helmet", "leather_helmet", "chainmail_helmet", "iron_helmet", "diamond_helmet", "netherite_helmet",
         "turtle_helmet", "coal", "raw_iron", "raw_copper", "raw_gold", "redstone", "lapis_lazuli", "diamond", "emerald",
         "gold_ingot", "iron_ingot", "lantern", "glowstone_dust", "iron_pickaxe", "diamond_pickaxe", "netherite_pickaxe"]
SOUNDS = [("dig/stone1", "dig1"), ("dig/stone2", "dig2"), ("dig/stone3", "dig3"), ("dig/stone4", "dig4"),
          ("step/stone1", "hit1"), ("step/stone2", "hit2"), ("step/stone3", "hit3"),
          ("random/pop", "pop"), ("item/armor/equip_gold1", "equip1"), ("item/armor/equip_gold2", "equip2"),
          ("random/click", "click"), ("random/orb", "orb"), ("random/levelup", "levelup"), ("random/anvil_use", "anvil"),
          ("random/fizz", "fizz"), ("block/enchantment_table/enchant1", "enchant1"), ("block/lantern/place1", "lantern")]


def vanilla():
    V = OUT / "vanilla"
    for b in BLOCKS:
        try: fetch(f"textures/block/{b}.png", V / f"{b}.png")
        except Exception as e: print("skip block", b, e)
    for i in ITEMS:
        try: fetch(f"textures/item/{i}.png", V / f"item_{i}.png")
        except Exception as e: print("skip item", i, e)
    fetch("textures/models/armor/gold_layer_1.png", V / "gold_layer_1.png")
    leather(V)
    fetch("textures/gui/icons.png", V / "icons.png")
    for e in ["night_vision", "haste"]:
        fetch(f"textures/mob_effect/{e}.png", V / f"effect_{e}.png")
    fetch("textures/item/enchanted_book.png", V / "item_enchanted_book.png")
    fetch("textures/block/anvil_top.png", V / "anvil_top.png")
    fetch("textures/gui/container/crafting_table.png", V / "crafting_table_gui.png")
    for rel, name in SOUNDS:
        try: fetch(f"sounds/{rel}.ogg", SND / f"{name}.ogg")
        except Exception as e: print("skip sound", rel, e)
    # mp3 для Safari
    try:
        import imageio_ffmpeg, subprocess
        ff = imageio_ffmpeg.get_ffmpeg_exe()
        for f in SND.glob("*.ogg"):
            m = f.with_suffix(".mp3")
            if not m.exists():
                subprocess.run([ff, "-y", "-loglevel", "error", "-i", str(f), "-b:a", "128k", str(m)], check=True)
    except Exception as e:
        print("mp3 skip", e)


def leather(V):
    """Кожаная броня в файлах серая: игра красит её цветом по умолчанию #A06540. Красим так же и кладём оверлей сверху."""
    from PIL import Image
    fetch("textures/item/leather_helmet_overlay.png", V / "_leather_overlay.png")
    (V / "item_leather_helmet.png").unlink(missing_ok=True)       # всегда с чистого серого файла, иначе покрасим дважды
    fetch("textures/item/leather_helmet.png", V / "item_leather_helmet.png")
    base = Image.open(V / "item_leather_helmet.png").convert("RGBA")
    px = base.load()
    for y in range(base.height):
        for x in range(base.width):
            r, g, b, a = px[x, y]
            px[x, y] = (r * 0xA0 // 255, g * 0x65 // 255, b * 0x40 // 255, a)
    base.alpha_composite(Image.open(V / "_leather_overlay.png").convert("RGBA"))
    base.save(V / "item_leather_helmet.png")
    (V / "_leather_overlay.png").unlink()


def model():
    """Модель каски: mod-src/models/miner_helmet/miner_helmet.json (Blockbench) + texture_*.png.
    Если модели нет, временная коробка золотого шлема с лампой."""
    own = SRC / "textures" / "miner_helmet"
    M = OUT / "models"; M.mkdir(parents=True, exist_ok=True)
    src = SRC / "models" / "miner_helmet" / "miner_helmet.json"
    if src.exists():
        raw = json.loads(src.read_text(encoding="utf-8"))
        tex = {k: v.split("/")[-1] for k, v in raw["textures"].items() if k != "particle"}
        for name in set(tex.values()):
            shutil.copy(own / f"{name}.png", M / f"{name}.png")
        mdl = {"textures": tex, "elements": raw["elements"]}
        info = {"own": sorted(set(tex.values())), "placeholder": False}
        # иконка предмета (miner_helmet.png) рендерится из этой модели: tools/render_p04_icon.py
    else:
        shutil.copy(OUT / "vanilla/gold_layer_1.png", M / "miner_layer_1.png")
        shutil.copy(OUT / "vanilla/redstone_lamp_on.png", M / "lamp.png")
        shutil.copy(OUT / "vanilla/item_golden_helmet.png", M / "miner_helmet.png")
        head = {"from": [3, 3, 3], "to": [13, 13, 13], "faces": {
            "up": {"uv": [2, 0, 4, 4], "texture": "#0"}, "down": {"uv": [4, 0, 6, 4], "texture": "#0"},
            "west": {"uv": [0, 4, 2, 8], "texture": "#0"}, "north": {"uv": [2, 4, 4, 8], "texture": "#0"},
            "east": {"uv": [4, 4, 6, 8], "texture": "#0"}, "south": {"uv": [6, 4, 8, 8], "texture": "#0"}}}
        lamp = {"from": [6.4, 9.2, 1.6], "to": [9.6, 12.2, 3], "faces": {k: {"uv": [3, 3, 13, 13], "texture": "#1"} for k in ["up", "down", "west", "north", "east", "south"]}}
        mdl = {"textures": {"0": "miner_layer_1", "1": "lamp"}, "elements": [head, lamp]}
        info = {"own": [], "placeholder": True}
    (ROOT / "data/p04_models.js").write_text("/* Сгенерировано tools/build_p04.py, руками не править */\nwindow.ZM = window.ZM || {};\nZM.P04M = "
                                             + json.dumps({"helmet": mdl, "info": info}, ensure_ascii=False) + ";\n", encoding="utf-8")
    write_inline()
    return info


def write_inline():
    M = OUT / "models"
    out = {f.relative_to(ROOT / "assets").as_posix(): "data:image/png;base64," + base64.b64encode(f.read_bytes()).decode() for f in sorted(M.glob("*.png"))}
    (ROOT / "data/p04_tex.js").write_text("/* Сгенерировано tools/build_p04.py: текстуры 3D-модели для WebGL, руками не править */\n"
                                          "window.ZM_TEX_INLINE = Object.assign(window.ZM_TEX_INLINE || {}, " + json.dumps(out) + ");\n", encoding="utf-8")


if __name__ == "__main__":
    vanilla()
    print("ok", model())
