"""Сборка ассетов пункта №08 · Made in Heaven.

python3 tools/build_p08.py

Источники:
  mod-src/textures/mih/made_in_heaven_src.png   апскейл 1024×1024 → возвращаем родную сетку 64×64
  mod-src/sounds/all/madeinheaven/madeinheaven.ogg
  ванильная база 1.19.2 (tools/vanilla.py): небо, часы, эффекты, частицы, блоки
  ванильные звуки с GitHub (InventivetalentDev/minecraft-assets 1.19.2)
"""
import json, random, subprocess, sys, urllib.request
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).parent))
from vanilla import base as _vb

VB = _vb()
OUT = ROOT / "assets" / "textures" / "p8"
SND = ROOT / "assets" / "sounds" / "p08"
SRC = ROOT / "mod-src" / "textures" / "mih"


def vt(p):
    return Image.open(VB / "textures" / f"{p}.png").convert("RGBA")


def tint(im, rgb):
    a = np.array(im).astype(np.uint16)
    for i in range(3): a[..., i] = a[..., i] * rgb[i] // 255
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def iso(tex, S=128, top=None):
    """Изометрическая иконка блока как в инвентаре (верх 1.0, лево 0.8, право 0.6), без размытия."""
    t = np.array(tex.convert("RGBA")).astype(float); tp = np.array((top or tex).convert("RGBA")).astype(float)
    n = t.shape[0]; k = S / 128
    A, B, C, D = np.array([64, 2]) * k, np.array([122, 31]) * k, np.array([64, 60]) * k, np.array([6, 31]) * k
    E, F = np.array([6, 97]) * k, np.array([64, 126]) * k
    out = np.zeros((S, S, 4))
    ys, xs = np.mgrid[0:S, 0:S]; P = np.stack([xs + .5, ys + .5], -1)
    for o, du, dv, img, sh in ((A, B - A, D - A, tp, 1.0), (D, C - D, E - D, t, .8), (C, B - C, F - C, t, .6)):
        M = np.linalg.inv(np.array([du, dv]).T)
        uv = (P - o) @ M.T
        m = (uv[..., 0] >= 0) & (uv[..., 0] < 1) & (uv[..., 1] >= 0) & (uv[..., 1] < 1)
        ui = np.clip((uv[..., 0] * n).astype(int), 0, n - 1); vi = np.clip((uv[..., 1] * n).astype(int), 0, n - 1)
        px = img[vi, ui]; px[..., :3] *= sh
        out[m] = px[m]
    return Image.fromarray(out.clip(0, 255).astype(np.uint8), "RGBA")


def item_texture():
    """Апскейл 1024 → 64×64: клетка 16 px, берём медиану центра каждой клетки."""
    a = np.array(Image.open(SRC / "made_in_heaven_src.png").convert("RGBA")).astype(np.int32)
    n, c = 64, 16
    out = np.zeros((n, n, 4), np.uint8)
    for y in range(n):
        for x in range(n):
            cell = a[y * c + 4:y * c + 12, x * c + 4:x * c + 12].reshape(-1, 4)
            out[y, x] = np.median(cell, axis=0)
    out[..., 3] = np.where(out[..., 3] > 110, 255, 0)
    Image.fromarray(out, "RGBA").save(OUT / "made_in_heaven.png")
    # для крупного показа: исходник мельче сетки (цифры циферблата), поэтому ещё HD 512
    Image.open(SRC / "made_in_heaven_src.png").convert("RGBA").resize((512, 512), Image.LANCZOS).save(OUT / "made_in_heaven_hd.png", optimize=True)


def textures():
    OUT.mkdir(parents=True, exist_ok=True)
    item_texture()
    simple = {
        "sun": "environment/sun", "moon_phases": "environment/moon_phases", "clouds": "environment/clouds",
        "diamond_block": "block/diamond_block", "nether_star": "item/nether_star", "clock": "item/clock_00",
        "diamond": "item/diamond", "gold_ingot": "item/gold_ingot", "redstone": "item/redstone",
        "flash": "particle/flash", "arrow": "item/arrow", "fire_charge": "item/fire_charge", "snowball": "item/snowball",
        "trident": "item/trident", "oak_door": "item/oak_door", "torch": "block/torch", "poppy": "block/poppy",
        "dandelion": "block/dandelion", "oxeye_daisy": "block/oxeye_daisy", "oak_planks": "block/oak_planks",
        "oak_log": "block/oak_log", "oak_log_top": "block/oak_log_top", "cobblestone": "block/cobblestone", "stone": "block/stone",
        "dirt": "block/dirt", "sand": "block/sand", "gravel": "block/gravel", "glass": "block/glass", "bookshelf": "block/bookshelf",
        "crafting_table": "block/crafting_table_top", "white_bed": "item/white_bed" if (VB / "textures/item/white_bed.png").exists() else "block/white_wool",
        "end_rod": "block/end_rod", "black_wool": "block/black_wool", "orange_wool": "block/orange_wool", "quartz": "block/quartz_block_side",
        "red_tulip": "block/red_tulip", "rose_bush": "block/rose_bush_top", "cactus": "block/cactus_top", "lapis": "block/lapis_block",
        "gold_block": "block/gold_block", "bedrock": "block/bedrock", "enchanted_book": "item/enchanted_book",
        "steve_skin": "entity/steve", "sugar": "item/sugar", "totem": "item/totem_of_undying", "water_bucket": "item/water_bucket",
        "firework": "item/firework_rocket", "feather": "item/feather", "glowstone_dust": "item/glowstone_dust", "sunflower": "block/sunflower_front", "bell": "item/bell", "skeleton": "entity/skeleton/skeleton", "blaze": "entity/blaze", "bow": "item/bow",
    }
    for k, p in simple.items():
        im = vt(p)
        if im.height > im.width and p.startswith(("block", "item")): im = im.crop((0, 0, im.width, im.width))
        im.save(OUT / f"{k}.png")
    iso(vt("block/diamond_block")).save(OUT / "iso_diamond_block.png")
    iso(vt("block/stone")).save(OUT / "iso_stone.png")
    iso(vt("block/gold_block")).save(OUT / "iso_gold_block.png")
    vt("gui/container/crafting_table").crop((0, 0, 176, 80)).save(OUT / "gui_craft.png")
    w = vt("gui/widgets")
    w.crop((0, 0, 182, 22)).save(OUT / "hotbar.png"); w.crop((0, 22, 24, 46)).save(OUT / "hotbar_sel.png")
    # биомные цвета равнин
    tint(vt("block/grass_block_top"), (0x91, 0xBD, 0x59)).save(OUT / "grass_top.png")
    tint(vt("block/oak_leaves"), (0x77, 0xAB, 0x2F)).save(OUT / "oak_leaves.png")
    w = vt("block/water_still"); tint(w.crop((0, 0, 16, 16)), (0x3F, 0x76, 0xE4)).save(OUT / "water.png")
    # лица мобов для арены
    for n, p in (("skeleton_face", "entity/skeleton/skeleton"), ("blaze_face", "entity/blaze"), ("steve_face", "entity/steve")):
        s = vt(p); f = s.crop((8, 8, 16, 16))
        if n == "steve_face": f.alpha_composite(s.crop((40, 8, 48, 16)))
        f.save(OUT / f"{n}.png")
    # часы: 64 кадра в одну ленту (игра крутит их по времени суток)
    strip = Image.new("RGBA", (16 * 64, 16))
    for i in range(64): strip.paste(vt(f"item/clock_{i:02d}"), (16 * i, 0))
    strip.save(OUT / "clock_strip.png")
    # частицы END_ROD (glitter_0..7), FIREWORK (spark_0..7), ELECTRIC_SPARK (у 1.19 — glow? берём spark), в ленты
    for n, pre in (("p_endrod", "particle/glitter_"),):
        s = Image.new("RGBA", (8 * 8, 8))
        for i in range(8): s.paste(vt(f"{pre}{i}").resize((8, 8), Image.NEAREST), (8 * i, 0))
        s.save(OUT / f"{n}.png")
        # золотая версия для светлого фона
        g = np.array(s).astype(float); lum = g[..., :3].mean(-1, keepdims=True) / 255
        g[..., :3] = np.concatenate([lum * 255, lum * 205 + 20, lum * 110 + 10], -1)
        Image.fromarray(g.clip(0, 255).astype(np.uint8), "RGBA").save(OUT / f"{n}_gold.png")
    # иконки эффектов
    EFF = ["regeneration", "resistance", "fire_resistance", "water_breathing", "night_vision", "health_boost",
           "absorption", "saturation", "luck", "slow_falling", "hero_of_the_village", "dolphins_grace"]
    s = Image.new("RGBA", (18 * len(EFF), 18))
    for i, e in enumerate(EFF): s.paste(vt(f"mob_effect/{e}"), (18 * i, 0))
    s.save(OUT / "effects.png")
    # «реестр» для сброса без чар: случайные непрозрачные квадратные блоки ванили, атлас 16 px
    skip = ("destroy", "grass_block", "leaves", "_overlay", "debug", "structure", "command", "jigsaw", "barrier", "bedrock",
            "portal", "gateway", "_stage", "fire", "lava", "water", "redstone_dust", "tall", "sculk_shrieker", "spawner")
    names = []
    for f in sorted((VB / "textures" / "block").glob("*.png")):
        n = f.stem
        if any(k in n for k in skip): continue
        im = Image.open(f).convert("RGBA")
        if im.size != (16, 16): continue
        a = np.array(im)[..., 3]
        if a.min() < 255: continue
        rgb = np.array(im)[..., :3]
        if rgb.std() < 6 and abs(int(rgb[..., 0].mean()) - int(rgb[..., 1].mean())) < 4 and abs(int(rgb[..., 1].mean()) - int(rgb[..., 2].mean())) < 4 and "concrete" not in n and "quartz" not in n:
            continue   # серые «под тинт» (и пустые) пропускаем
        names.append(n)
    random.seed(8); pick = sorted(random.sample(names, min(150, len(names))))
    # сброс берёт блоки только из ванили и ZitraksMode: добавляем полные блоки мода
    MT = ROOT / "mod-src" / "textures"
    MOD = {f"zitraksmode:{d}": MT / "block" / f"{d}.png" for d in ("zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine")}
    MOD.update({"zitraksmode:ender_safe": MT / "ender" / "ender_safe_front.png", "zitraksmode:ender_furnace": MT / "ender" / "ender_furnace_front.png",
                "zitraksmode:reinforced_ender_glass": MT / "ender" / "reinforced_ender_glass.png", "zitraksmode:hentai_block": SRC / "hentai_block.png"})
    srcs = [VB / "textures" / "block" / f"{n}.png" for n in pick] + list(MOD.values())
    pick = pick + list(MOD.keys())
    at = Image.new("RGBA", (16 * 16, 16 * ((len(pick) + 15) // 16)))
    for i, f in enumerate(srcs):
        im = Image.open(f).convert("RGBA")
        if im.size != (16, 16): im = im.crop((0, 0, im.width, im.width)).resize((16, 16), Image.NEAREST)
        at.paste(im, (16 * (i % 16), 16 * (i // 16)))
    at.save(OUT / "registry.png")
    # маска облаков (environment/clouds.png): строки как биты, чтобы небо рисовалось и с file://
    ca = np.array(vt("environment/clouds"))[..., 3] > 128   # пустые клетки там с альфой 1
    import base64
    rows = base64.b64encode(np.packbits(ca.reshape(-1)).tobytes()).decode()
    (ROOT / "data" / "p08_registry.js").write_text(
        "/* Сгенерировано tools/build_p08.py.\n   P08REG: блоки атласа assets/textures/p8/registry.png (16 в ряд)\n   P08CLOUDS: карта облаков 256×256, биты построчно, base64 */\n"
        "window.ZM = window.ZM || {};\nZM.P08REG = " + json.dumps(pick) + ";\nZM.P08CLOUDS = " + json.dumps(rows) + ";\n", encoding="utf-8")
    # хентай-блок (пункт №15): текстура мода
    hb = Image.open(SRC / "hentai_block.png").convert("RGBA")
    hb.save(OUT / "hentai_block.png"); iso(hb).save(OUT / "iso_hentai_block.png")
    for f in OUT.glob("hentai_[0-9].png"): f.unlink()
    # фон рая (сгенерирован), в JPG
    bg = ROOT / "mod-src" / "brand" / "p8_bg_heaven_src.png"
    if bg.exists():
        Image.open(bg).convert("RGB").save(OUT / "bg_heaven.jpg", quality=90, optimize=True, progressive=True)
    print("textures ok", len(pick), "блоков в реестре")


GH = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19.2/assets/minecraft/sounds/"
SOUNDS = {
    "beacon_on": "block/beacon/activate", "beacon_off": "block/beacon/deactivate", "beacon_amb": "block/beacon/ambient",
    "shimmer": "block/amethyst/shimmer", "levelup": "random/levelup", "bow": "random/bow", "fireball": "mob/ghast/fireball4",
    "trident": "item/trident/throw1", "boom": "random/explode1", "thunder": "ambient/weather/thunder1", "rain": "ambient/weather/rain1",
    "totem": "item/totem/use_totem", "hit": "random/successful_hit", "sweep": "entity/player/attack/sweep1",
    "charge": "block/respawn_anchor/charge1", "enchant": "block/enchantment_table/enchant1", "death": "entity/player/hurt/fire_hurt1",
}


def sounds():
    SND.mkdir(parents=True, exist_ok=True)
    try:
        import imageio_ffmpeg; ff = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        ff = None
    files = dict(SOUNDS)
    for k, p in files.items():
        o = SND / f"{k}.ogg"
        if not o.exists():
            o.write_bytes(urllib.request.urlopen(GH + p + ".ogg", timeout=60).read())
    src = ROOT / "mod-src" / "sounds" / "all" / "madeinheaven" / "madeinheaven.ogg"
    (SND / "madeinheaven.ogg").write_bytes(src.read_bytes())
    if ff:
        for o in SND.glob("*.ogg"):
            m = o.with_suffix(".mp3")
            if not m.exists():
                subprocess.run([ff, "-loglevel", "error", "-y", "-i", str(o), "-b:a", "128k" if o.stem == "madeinheaven" else "96k", str(m)], check=True)
    print("sounds ok", len(list(SND.glob("*.ogg"))))


if __name__ == "__main__":
    textures()
    sounds()
