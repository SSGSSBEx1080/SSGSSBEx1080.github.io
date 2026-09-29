"""№12 · Катана: сборка ассетов.

python3 tools/build_p12.py            текстуры, модель GeckoLib, звуки, шрифт иероглифов
python3 tools/build_p12.py --icons    + изометрические иконки блоков (нужен playwright)

Источники:
  mod-src/textures/p12/katana.png          текстура модели (32×32 uv, нарисована в 2048×2048, белый фон = пусто)
  mod-src/models/p12/katana.geo.json       модель GeckoLib (катана + две руки)
  mod-src/models/p12/katana.animation.json 7 анимаций
  mod-src/sounds/all/katana/*.ogg          звуки мода
  ванильная база 1.19.2                    мобы, блоки, частицы, щит
Картинок-генераций нет: фон страницы рисуется кодом.
"""
import asyncio, base64, json, shutil, sys, urllib.request, re
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from vanilla import base
import mc_icon

OUT = ROOT / "assets" / "textures" / "p12"; SND = ROOT / "assets" / "sounds" / "p12"; ISO = OUT / "iso"
SRC = ROOT / "mod-src" / "textures" / "p12"; MSRC = ROOT / "mod-src" / "models" / "p12"
V = base() / "textures"
GH = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19.2/assets/minecraft/sounds/"

TEX = {"iron_ingot": "item/iron_ingot", "iron_sword": "item/iron_sword", "arrow": "item/arrow", "netherite_pickaxe": "item/netherite_pickaxe",
       "raw_iron": "item/raw_iron", "raw_gold": "item/raw_gold", "diamond": "item/diamond", "coal": "item/coal", "emerald": "item/emerald",
       "enchanted_book": "item/enchanted_book", "bone": "item/bone", "rotten_flesh": "item/rotten_flesh", "gunpowder": "item/gunpowder", "lava_bucket": "item/lava_bucket", "bow": "item/bow", "bow_pull": "item/bow_pulling_2", "flint": "item/flint", "feather": "item/feather",
       "skeleton": "entity/skeleton/skeleton", "zombie": "entity/zombie/zombie", "creeper": "entity/creeper/creeper", "steve": "entity/steve",
       "iron_golem": "entity/iron_golem/iron_golem", "shield_tex": "entity/shield_base_nopattern", "xp_orb": "entity/experience_orb",
       "arrow_ent": "entity/projectiles/arrow", "crit": "particle/critical_hit", "ench_hit": "particle/enchanted_hit", "icons": "gui/icons",
       "stone_b": "block/stone", "dirt_b": "block/dirt", "grass_side": "block/grass_block_side", "grass_top": "block/grass_block_top",
       "cobble_b": "block/cobblestone", "deepslate_b": "block/deepslate", "coal_ore": "block/coal_ore", "iron_ore": "block/iron_ore",
       "gold_ore": "block/gold_ore", "diamond_ore": "block/diamond_ore", "emerald_ore": "block/emerald_ore", "debris": "block/ancient_debris_side",
       "obsidian": "block/obsidian", "bedrock": "block/bedrock", "oak_log": "block/oak_log", "oak_leaves": "block/oak_leaves",
       "barrel_b": "block/barrel_side", "spawner_b": "block/spawner", "gravel": "block/gravel", "glass": "block/glass",
       "dark_oak_planks": "block/dark_oak_planks", "black_wool": "block/black_wool", "crimson_planks": "block/crimson_planks"}
for i in range(8): TEX[f"sweep_{i}"] = f"particle/sweep_{i}"
for i in range(16): TEX[f"exp_{i}"] = f"particle/explosion_{i}"
ICONS = ["cobblestone", "dirt", "stone", "ancient_debris", "spawner", "barrel", "furnace", "enchanting_table", "obsidian", "bedrock", "oak_log",
         "coal_ore", "iron_ore", "diamond_ore", "gold_ore", "jukebox", "grass_block", "deepslate", "cobbled_deepslate", "gravel", "anvil"]

SOUNDS = {"click": "random/click", "pop": "random/pop", "levelup": "random/levelup", "orb": "random/orb", "bow": "random/bow",
          "bowhit": "random/bowhit1", "fuse": "random/fuse", "explode1": "random/explode1", "explode2": "random/explode2",
          "sweep1": "entity/player/attack/sweep1", "sweep2": "entity/player/attack/sweep2", "sweep3": "entity/player/attack/sweep3",
          "strong": "entity/player/attack/strong1", "nodamage": "entity/player/attack/weak1", "crit": "entity/player/attack/crit1",
          "hit1": "damage/hit1", "hit2": "damage/hit2", "fallbig": "damage/fallbig",
          "skel_say": "mob/skeleton/say1", "skel_hurt": "mob/skeleton/hurt1", "skel_hurt2": "mob/skeleton/hurt2", "skel_death": "mob/skeleton/death",
          "zomb_say": "mob/zombie/say1", "zomb_hurt": "mob/zombie/hurt1", "zomb_death": "mob/zombie/death",
          "creep_hurt": "mob/creeper/say1", "creep_death": "mob/creeper/death", "golem_hit": "mob/irongolem/hit1",
          "stone1": "dig/stone1", "stone2": "dig/stone2", "stone3": "dig/stone3", "gravel1": "dig/gravel1", "grass1": "dig/grass1", "wood1": "dig/wood1",
          "glass1": "random/glass1", "anvil": "random/anvil_land", "shield": "item/shield/block1", "chest": "random/chestopen"}
KSND = ["charge", "charged_slash", "equip", "parry_1", "parry_2", "parry_3", "slash_1", "slash_2", "slash_3"]


def vt(p): return Image.open(V / f"{p}.png").convert("RGBA")


def get(url, ua="Mozilla/5.0"):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": ua}), timeout=60).read()


def katana_tex():
    """белый фон → прозрачный; 1024×1024 webp для WebGL (uv 32×32 → 32 px на единицу)"""
    im = Image.open(SRC / "katana.png").convert("RGB").resize((1024, 1024), Image.LANCZOS)
    a = np.asarray(im).astype(np.int16)
    white = (a.min(axis=2) > 232)
    rgba = np.dstack([a, np.where(white, 0, 255)]).astype(np.uint8)
    out = Image.fromarray(rgba, "RGBA"); out.save(OUT / "katana.webp", quality=92, method=6)
    # иконка предмета: меч с левого края текстуры (он и есть рисунок катаны), наклон 45° как у мечей в инвентаре
    full = Image.open(SRC / "katana.png").convert("RGB")
    fa = np.asarray(full).astype(np.int16); fw = fa.min(axis=2) > 232
    strip = np.dstack([fa, np.where(fw, 0, 255)]).astype(np.uint8)[:, :250]
    s = Image.fromarray(strip, "RGBA"); s = s.crop(s.getbbox())
    s = s.resize((int(s.width * 600 / s.height), 600), Image.LANCZOS)
    r = s.rotate(-45, expand=True, resample=Image.BICUBIC); r = r.crop(r.getbbox())
    side = max(r.size) + 20; c = Image.new("RGBA", (side, side)); c.paste(r, ((side - r.width) // 2, (side - r.height) // 2), r)
    c.resize((160, 160), Image.LANCZOS).save(OUT / "katana_icon.png")
    s.save(OUT / "katana_blade.png")
    return out


def build_tex():
    for d in (OUT, ISO): d.mkdir(parents=True, exist_ok=True)
    for k, p in TEX.items():
        im = vt(p)
        if im.height > im.width and k.endswith(("_b", "_ore", "debris", "obsidian", "bedrock", "log", "leaves", "gravel", "glass", "planks", "wool", "grass_side")):
            im = im.crop((0, 0, im.width, im.width))
        im.save(OUT / f"{k}.png")
    # листва серая в текстуре: красим как в равнинах
    lv = np.asarray(vt("block/oak_leaves")).astype(np.float32); lv[..., :3] *= np.array([0x77, 0xAB, 0x2F]) / 255
    Image.fromarray(lv.clip(0, 255).astype(np.uint8), "RGBA").save(OUT / "oak_leaves.png")
    gt = np.asarray(vt("block/grass_block_top")).astype(np.float32); gt[..., :3] *= np.array([0x91, 0xBD, 0x59]) / 255
    Image.fromarray(gt.clip(0, 255).astype(np.uint8), "RGBA").save(OUT / "grass_top.png")
    # трава сбоку: подложка + окрашенный оверлей
    gs = vt("block/grass_block_side"); ov = np.asarray(vt("block/grass_block_side_overlay")).astype(np.float32)
    ov[..., :3] *= np.array([0x91, 0xBD, 0x59]) / 255; gs.alpha_composite(Image.fromarray(ov.clip(0, 255).astype(np.uint8), "RGBA")); gs.save(OUT / "grass_side.png")
    # щит спереди (entity/shield: лицевая сторона 12×22 в (1,1))
    sh = vt("entity/shield_base_nopattern").crop((1, 1, 13, 23)); sh.save(OUT / "shield_front.png")
    shutil.copy(ROOT / "assets" / "textures" / "p10" / "gui_craft.png", OUT / "gui_craft.png")
    katana_tex()
    print("tex ok")


def write_data():
    geo = json.loads((MSRC / "katana.geo.json").read_text())["minecraft:geometry"][0]
    anim = json.loads((MSRC / "katana.animation.json").read_text())["animations"]
    g = {"tw": geo["description"]["texture_width"], "th": geo["description"]["texture_height"], "bones": geo["bones"]}
    A = {}
    for k, v in anim.items():
        loop = v.get("loop", False)
        A[k] = {"len": v.get("animation_length", 1), "loop": "hold" if loop == "hold_on_last_frame" else bool(loop), "bones": {}}
        for bn, bd in v["bones"].items():
            A[k]["bones"][bn] = {ch: sorted([[float(t), kf["vector"] if isinstance(kf, dict) else kf] for t, kf in bd[ch].items()]) for ch in ("rotation", "position") if ch in bd}
    (ROOT / "data" / "p12_geo.js").write_text("/* Сгенерировано tools/build_p12.py: модель и анимации GeckoLib катаны */\nwindow.ZM = window.ZM || {};\nZM.P12G = "
                                               + json.dumps({"geo": g, "anim": A}, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    p = OUT / "katana.webp"
    (ROOT / "data" / "p12_tex.js").write_text("/* Сгенерировано tools/build_p12.py: текстура катаны для WebGL (file://) */\nwindow.ZM = window.ZM || {};\nZM.P12TEX = "
                                               + json.dumps("data:image/webp;base64," + base64.b64encode(p.read_bytes()).decode()) + ";\n", encoding="utf-8")
    print("data ok")


def build_snd():
    SND.mkdir(parents=True, exist_ok=True)
    for k, p in SOUNDS.items():
        o = SND / f"{k}.ogg"
        if not o.exists(): o.write_bytes(get(GH + p + ".ogg"))
    for k in KSND: shutil.copy(ROOT / "mod-src" / "sounds" / "all" / "katana" / f"{k}.ogg", SND / f"k_{k}.ogg")
    print("snd ok")


def build_font():
    text = "刀型弾斬鍛誉史終世界侍影月桜道死忍居合一閃"
    ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    css = get("https://fonts.googleapis.com/css2?family=Yuji+Syuku&text=" + urllib.parse.quote(text), ua).decode()
    url = re.search(r"url\((https://[^)]+)\)", css).group(1)
    (ROOT / "assets" / "fonts" / "YujiSyuku-p12.woff2").write_bytes(get(url, ua))
    print("font ok")


async def render_icons():
    from playwright.async_api import async_playwright
    jobs = [(n, (lambda n=n: mc_icon.build(n)), "ref") for n in ICONS]
    tmp = ROOT / "_icon.html"; tmp.write_text(mc_icon.HTML)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--allow-file-access-from-files"])
            pg = await b.new_page(viewport={"width": 512, "height": 512}); await pg.goto(tmp.as_uri()); ref = None
            for n, fn, mode in [("barrel", lambda: mc_icon.build("barrel"), "ref")] + jobs:
                try: m = fn()
                except Exception as e: print("skip", n, e); continue
                await pg.evaluate("m => go(m)", m)
                o = ISO / f"{n}.png"
                await pg.screenshot(path=str(o), omit_background=True, clip={"x": 0, "y": 0, "width": 512, "height": 512})
                im = Image.open(o).convert("RGBA")
                if ref is None:
                    x0, y0, x1, y1 = im.getbbox(); c = ((x0 + x1) / 2, (y0 + y1) / 2); r = max(x1 - x0, y1 - y0) / 2 * 1.08
                    ref = tuple(int(v) for v in (c[0] - r, c[1] - r, c[0] + r, c[1] + r)); o.unlink(); continue
                im.crop(ref).resize((96, 96), Image.LANCZOS).save(o); print("icon", n)
            await b.close()
    finally:
        tmp.unlink(missing_ok=True); shutil.rmtree(mc_icon.STAGE, ignore_errors=True)


if __name__ == "__main__":
    import urllib.parse
    build_tex(); write_data(); build_snd(); build_font()
    if "--icons" in sys.argv: asyncio.run(render_icons())
