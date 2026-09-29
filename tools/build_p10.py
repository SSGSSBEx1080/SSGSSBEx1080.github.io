"""№10 · Кастрация криперов + Супер-TNT: сборка ассетов.

python3 tools/build_p10.py            текстуры, спрайты, модели, звуки
python3 tools/build_p10.py --icons    + изометрические иконки (нужен playwright)

Источники:
  mod-src/textures/p10/*.png     текстуры мода как прислали (cooled_creeper_eggs = жареные яйца)
  mod-src/textures/super_tnt/super_tnt_net.png   развёртка блока Супер-TNT (block/super_tnt)
  mod-src/models/p10/*.json      модели Blockbench: яйца, статуя (низ + верх), Супер-TNT
  ванильная база 1.19.2          предметы, GUI, мобы, частицы
"""
import asyncio, base64, json, shutil, subprocess, sys, urllib.request
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from vanilla import base
import mc_icon

OUT = ROOT / "assets" / "textures" / "p10"; SND = ROOT / "assets" / "sounds" / "p10"
MOD, ISO, MOB = OUT / "mod", OUT / "iso", OUT / "mob"
SRC = ROOT / "mod-src" / "textures" / "p10"; MSRC = ROOT / "mod-src" / "models" / "p10"
V = base() / "textures"

TEX = {"creeper": "entity/creeper/creeper", "creeper_armor": "entity/creeper/creeper_armor", "shears": "item/shears",
       "gunpowder": "item/gunpowder", "tnt_side": "block/tnt_side", "tnt_top": "block/tnt_top", "tnt_bottom": "block/tnt_bottom",
       "grass_side": "block/grass_block_side", "creeper_head": "item/creeper_banner_pattern", "iron_block": "block/iron_block",
       "white_concrete": "block/white_concrete", "lime_concrete": "block/lime_concrete", "explosion": "particle/explosion_0",
       "flint_and_steel": "item/flint_and_steel", "fire_charge": "item/fire_charge", "minecart": "item/minecart",
       "tnt_minecart": "item/tnt_minecart", "rail": "block/rail", "iron_pickaxe": "item/iron_pickaxe", "wooden_pickaxe": "item/wooden_pickaxe",
       "coal": "item/coal", "redstone_torch": "block/redstone_torch", "redstone": "item/redstone", "lever": "block/lever",
       "dispenser_front": "block/dispenser_front", "arrow": "item/arrow", "dirt": "block/dirt", "stone": "block/stone",
       "deepslate": "block/deepslate", "sand": "block/sand", "bedrock": "block/bedrock", "gravel": "block/gravel",
       "oak_log": "block/oak_log", "coal_ore": "block/coal_ore", "iron_ore": "block/iron_ore", "glint": "misc/enchanted_item_glint",
       "nausea": "mob_effect/nausea", "lava": "block/lava_still", "water_raw": "block/water_still", "bucket": "item/water_bucket",
       "cobblestone": "block/cobblestone", "oak_planks": "block/oak_planks", "rotten_flesh": "item/rotten_flesh", "cooked_beef": "item/cooked_beef",
       "egg": "item/egg", "clock": "item/clock_00", "lightning_rod": "block/lightning_rod", "campfire": "item/campfire",
       "furnace_front_on": "block/furnace_front_on", "smoker_front_on": "block/smoker_front_on", "blaze_powder": "item/blaze_powder"}
for i in range(16): TEX[f"explosion_{i}"] = f"particle/explosion_{i}"


def vt(p): return Image.open(V / f"{p}.png").convert("RGBA")


def tint(im, c):
    a = np.array(im).astype(int)
    for i in range(3): a[..., i] = a[..., i] * c[i] // 255
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def front(s, legs=True):
    """фронтальный спрайт крипера 8×26: голова 8, тело 12, ноги 6"""
    c = Image.new("RGBA", (8, 26))
    c.paste(s.crop((8, 8, 16, 16)), (0, 0)); c.paste(s.crop((20, 20, 28, 32)), (0, 8))
    c.paste(s.crop((4, 20, 8, 26)), (0, 20)); c.paste(s.crop((4, 20, 8, 26)), (4, 20))
    return c


def humanoid(tex, slim=False):
    """стоящий гуманоид анфас 16×32"""
    s = vt(tex); c = Image.new("RGBA", (16, 32)); ov = s.height == 64
    h = s.crop((8, 8, 16, 16))
    if ov: h.alpha_composite(s.crop((40, 8, 48, 16)))
    c.paste(h, (4, 0)); b = s.crop((20, 20, 28, 32))
    if ov: b.alpha_composite(s.crop((20, 36, 28, 48)))
    c.paste(b, (4, 8))
    if slim:
        a = s.crop((42, 20, 44, 32)); c.paste(a, (1, 8)); c.paste(a, (13, 8))
        l = s.crop((2, 20, 4, 32)); c.paste(l, (5, 20)); c.paste(l, (9, 20))
    else:
        a = s.crop((44, 20, 48, 32)); c.paste(a, (0, 8)); c.paste(a.transpose(Image.FLIP_LEFT_RIGHT), (12, 8))
        l = s.crop((4, 20, 8, 32)); c.paste(l, (4, 20)); c.paste(l.transpose(Image.FLIP_LEFT_RIGHT), (8, 20))
    return c


def build_tex():
    for d in (OUT, MOD, ISO, MOB): d.mkdir(parents=True, exist_ok=True)
    for k, p in TEX.items():
        src = V / f"{p}.png"
        if not src.exists(): print("нет", p); continue
        im = Image.open(src).convert("RGBA")
        if im.height > im.width and not p.startswith("entity") and not p.startswith("gui"): im = im.crop((0, 0, im.width, im.width))
        im.save(OUT / f"{k}.png")
    tint(vt("block/water_still").crop((0, 0, 16, 16)), (0x3F, 0x76, 0xE4)).save(OUT / "water.png")
    tint(vt("block/grass_block_top"), (0x7C, 0xBD, 0x6B)).save(OUT / "grass_top.png")
    tint(vt("block/oak_leaves"), (0x59, 0xAE, 0x30)).save(OUT / "leaves.png")
    # трава сбоку: подкрашенный оверлей поверх грязи, как в игре
    gs = vt("block/grass_block_side"); gs.alpha_composite(tint(vt("block/grass_block_side_overlay"), (0x7C, 0xBD, 0x6B))); gs.save(OUT / "grass_side.png")
    # яйцо призыва крипера: основа #0DA70B + крапины #000000
    egg = tint(vt("item/spawn_egg"), (0x0D, 0xA7, 0x0B)); egg.alpha_composite(tint(vt("item/spawn_egg_overlay"), (0, 0, 0))); egg.save(OUT / "creeper_spawn_egg.png")
    # GUI печи и коптильни: окно, огонь, стрелка
    for g in ("furnace", "smoker"):
        im = vt(f"gui/container/{g}"); im.crop((0, 0, 176, 80)).save(OUT / f"gui_{g}.png")
        im.crop((176, 0, 190, 14)).save(OUT / "gui_flame.png"); im.crop((176, 14, 200, 31)).save(OUT / "gui_arrow.png")
    vt("gui/container/crafting_table").crop((0, 0, 176, 80)).save(OUT / "gui_craft.png")
    ic = vt("gui/icons")
    ic.crop((16, 27, 25, 36)).save(OUT / "food_bg.png"); ic.crop((52, 27, 61, 36)).save(OUT / "food_full.png"); ic.crop((61, 27, 70, 36)).save(OUT / "food_half.png")
    ic.crop((16, 0, 25, 9)).save(OUT / "heart_bg.png"); ic.crop((52, 0, 61, 9)).save(OUT / "heart_full.png")
    # текстуры мода
    for src, dst in (("casted_creeper", "casted_creeper"), ("creeper_eggs", "creeper_eggs"), ("cooled_creeper_eggs", "cooked_creeper_eggs"), ("super_tnt_minecart", "super_tnt_minecart"), ("knife", "knife")):
        Image.open(SRC / f"{src}.png").convert("RGBA").save(MOD / f"{dst}.png")
    Image.open(ROOT / "mod-src/textures/super_tnt/super_tnt_net.png").convert("RGBA").save(MOD / "super_tnt.png")
    # спрайты криперов
    s, cs, ar = vt("entity/creeper/creeper"), Image.open(SRC / "casted_creeper.png").convert("RGBA"), vt("entity/creeper/creeper_armor")
    front(s).save(OUT / "creeper_front.png"); front(cs).save(OUT / "casted_front.png")
    s.crop((8, 8, 16, 16)).save(OUT / "creeper_face.png"); cs.crop((8, 8, 16, 16)).save(OUT / "casted_face.png")
    front(ar).save(OUT / "aura_front.png")
    for d, im in (("normal", s), ("casted", cs), ("armor", ar)):
        (OUT / "ent" / d).mkdir(parents=True, exist_ok=True); im.save(OUT / "ent" / d / "skin.png")
    for i in range(10): vt(f"block/destroy_stage_{i}").save(OUT / f"destroy_{i}.png")
    # мобы под молнии (стоя, анфас)
    for k, t, sl in (("steve", "entity/steve", False), ("zombie", "entity/zombie/zombie", False), ("skeleton", "entity/skeleton/skeleton", True)):
        humanoid(t, sl).save(MOB / f"{k}.png")
    front(s).save(MOB / "creeper.png"); front(cs).save(MOB / "casted.png")
    print("tex ok")


# ---------------------------------------------------------------- модели
def load(n): return json.loads((MSRC / f"{n}.json").read_text())


def retex(els, key, dy=0):
    out = []
    for e in json.loads(json.dumps(els)):
        e["faces"] = {fn: {**f, "texture": "#" + key} for fn, f in e["faces"].items() if f.get("texture") != "#missing"}
        if dy: e["from"][1] += dy; e["to"][1] += dy
        e.pop("name", None)
        if "rotation" in e and e["rotation"].get("angle", 0) == 0: e.pop("rotation")
        out.append(e)
    return out


def models():
    eggs = load("creeper_eggs")["elements"]
    return {
        "creeper_eggs": {"elements": retex(eggs, "mod/creeper_eggs")},
        "cooked_creeper_eggs": {"elements": retex(load("cooked_creeper_eggs")["elements"], "mod/cooked_creeper_eggs")},
        "charged_creeper_eggs": {"elements": retex(load("charged_creeper_eggs")["elements"], "mod/creeper_eggs")},
        "creeper_statue": {"elements": retex(load("creeper_statue")["elements"], "mod/creeper_eggs") + retex(load("creeper_statue_top")["elements"], "mod/creeper_eggs", 16)},
        "super_tnt": {"elements": retex(load("super_tnt")["elements"], "mod/super_tnt")},
        # сущность: текстура «skin» берётся из папки ent/normal | ent/casted, заряд — ent/armor (раздут на 2 px, как в игре)
        "creeper_entity": creeper_entity("skin"),
        "creeper_aura": creeper_entity("skin", 2),
    }


# ---------------------------------------------------------------- крипер как сущность (ModelPart → элементы)
def ebox(f, t, u0, v0, w, h, d, key, tw=64, th=32, inf=0):
    """коробка сущности: развёртка как у ModelPart.Cube (перед = north), uv в 1/16 текстуры"""
    U = lambda u: u * 16 / tw; V = lambda v: v * 16 / th
    r = lambda a, b, c, e: [U(a), V(b), U(c), V(e)]
    fr = [f[i] - inf for i in range(3)]; to = [t[i] + inf for i in range(3)]
    return {"from": fr, "to": to, "faces": {
        "up": {"uv": r(u0 + d, v0, u0 + d + w, v0 + d), "texture": "#" + key},
        "down": {"uv": r(u0 + d + w, v0 + d, u0 + d + 2 * w, v0), "texture": "#" + key},
        "north": {"uv": r(u0 + d, v0 + d, u0 + d + w, v0 + d + h), "texture": "#" + key},
        "south": {"uv": r(u0 + 2 * d + w, v0 + d, u0 + 2 * d + 2 * w, v0 + d + h), "texture": "#" + key},
        "west": {"uv": r(u0 + d + w, v0 + d, u0 + 2 * d + w, v0 + d + h), "texture": "#" + key},
        "east": {"uv": r(u0, v0 + d, u0 + d, v0 + d + h), "texture": "#" + key}}}


def creeper_entity(key, inf=0):
    return {"elements": [
        ebox([4, 18, 4], [12, 26, 12], 0, 0, 8, 8, 8, key, inf=inf),       # голова
        ebox([4, 6, 6], [12, 18, 10], 16, 16, 8, 12, 4, key, inf=inf),     # тело
        ebox([4, 0, 2], [8, 6, 6], 0, 16, 4, 6, 4, key, inf=inf), ebox([8, 0, 2], [12, 6, 6], 0, 16, 4, 6, 4, key, inf=inf),
        ebox([4, 0, 10], [8, 6, 14], 0, 16, 4, 6, 4, key, inf=inf), ebox([8, 0, 10], [12, 6, 14], 0, 16, 4, 6, 4, key, inf=inf)]}


def with_tex(m):
    keys = sorted({f["texture"][1:] for e in m["elements"] for f in e["faces"].values()})
    return {"textures": {k: k for k in keys}, "elements": m["elements"]}


def write_models():
    out = {k: with_tex(m) for k, m in models().items()}
    (ROOT / "data" / "p10_models.js").write_text("/* Сгенерировано tools/build_p10.py, руками не править */\nwindow.ZM = window.ZM || {};\nZM.P10M = "
                                                 + json.dumps(out, ensure_ascii=False) + ";\n", encoding="utf-8")
    inl = {}
    keys = sorted({k for m in out.values() for k in m["textures"]} - {"skin"}) + ["ent/normal/skin", "ent/casted/skin", "ent/armor/skin"]
    for k in keys:
        p = OUT / f"{k}.png"; inl[p.relative_to(ROOT / "assets").as_posix()] = "data:image/png;base64," + base64.b64encode(p.read_bytes()).decode()
    (ROOT / "data" / "p10_tex.js").write_text("/* Сгенерировано tools/build_p10.py: текстуры 3D-моделей для WebGL (file://) */\n"
                                              "window.ZM_TEX_INLINE = Object.assign(window.ZM_TEX_INLINE || {}, " + json.dumps(inl) + ");\n", encoding="utf-8")
    print("models ok", list(out))


# ---------------------------------------------------------------- иконки
VAN_ICONS = ["tnt", "furnace_on", "smoker_on", "crafting_table", "rail"]


def stage(m):
    st = mc_icon.STAGE; st.mkdir(exist_ok=True); m = with_tex(m); tx = {}
    for k in m["textures"]:
        kk = k.replace("/", "__"); shutil.copy(OUT / f"{k}.png", st / f"{kk}.png"); tx[kk] = kk
    for e in m["elements"]:
        for f in e["faces"].values(): f["texture"] = f["texture"].replace("/", "__")
    return {"textures": tx, "elements": m["elements"]}


async def render_icons():
    from playwright.async_api import async_playwright
    M = models()
    jobs = [(n, (lambda n=n: mc_icon.build(n)), "ref") for n in VAN_ICONS if n != "rail"]
    jobs += [(k, (lambda k=k: stage(M[k])), "ref" if k == "super_tnt" else "fit") for k in M if not k.startswith("creeper_ent") and k != "creeper_aura"]
    tmp = ROOT / "_icon.html"; tmp.write_text(mc_icon.HTML)
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
                im = im.crop(box).resize((128, 128), Image.LANCZOS)
                if n == "charged_creeper_eggs": im = glint(im)
                im.save(o); print("icon", n)
            await b.close()
    finally:
        tmp.unlink(missing_ok=True); shutil.rmtree(mc_icon.STAGE, ignore_errors=True)


def glint(im):
    """свечение чар: фиолетовая текстура glint поверх по альфе (статичный кадр)"""
    g = vt("misc/enchanted_item_glint").resize((128, 128), Image.NEAREST).rotate(-20)
    a = np.array(im).astype(float); gl = np.array(g).astype(float)[..., :3] / 255 * np.array([0.5, 0.25, 0.8]) * 255
    m = (a[..., 3:4] / 255)
    a[..., :3] = np.clip(a[..., :3] + gl * 0.5 * m, 0, 255)
    return Image.fromarray(a.astype(np.uint8), "RGBA")


# ---------------------------------------------------------------- звуки
GH = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19.2/assets/minecraft/sounds/"
SOUNDS = {"hiss": "random/fuse", "creeper1": "mob/creeper/say1", "creeper2": "mob/creeper/say2", "creeper3": "mob/creeper/say3",
          "creeper_death": "mob/creeper/death", "shear": "mob/sheep/shear", "explode": "random/explode1", "explode2": "random/explode2",
          "explode3": "random/explode3", "explode4": "random/explode4", "pop": "random/pop",
          "thunder1": "ambient/weather/thunder1", "thunder2": "ambient/weather/thunder2", "thunder3": "ambient/weather/thunder3",
          "eat1": "random/eat1", "eat2": "random/eat2", "eat3": "random/eat3", "burp": "random/burp",
          "crackle1": "block/furnace/fire_crackle1", "crackle2": "block/furnace/fire_crackle2", "smoker1": "block/smoker/smoker1",
          "ignite": "fire/ignite", "grass1": "dig/grass1", "grass2": "dig/grass2", "minecart": "minecart/base", "bow": "random/bow",
          "stone_place": "dig/stone1", "lava": "liquid/lavapop", "splash": "random/splash"}


def build_snd():
    SND.mkdir(parents=True, exist_ok=True)
    try:
        import imageio_ffmpeg; ff = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception: ff = None
    for k, p in SOUNDS.items():
        o = SND / f"{k}.ogg"
        if not o.exists():
            try: o.write_bytes(urllib.request.urlopen(urllib.request.Request(GH + p + ".ogg", headers={"User-Agent": "Mozilla/5.0"}), timeout=30).read())
            except Exception as e: print("нет звука", p, e); continue
        m = SND / f"{k}.mp3"
        if ff and not m.exists(): subprocess.run([ff, "-loglevel", "error", "-y", "-i", str(o), "-b:a", "96k", str(m)], check=True)
    print("snd ok", len(SOUNDS), "mp3" if ff else "без mp3")


if __name__ == "__main__":
    build_tex(); write_models(); build_snd()
    if "--icons" in sys.argv: asyncio.run(render_icons())
