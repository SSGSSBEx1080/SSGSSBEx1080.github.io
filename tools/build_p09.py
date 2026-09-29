"""Сборка ассетов пункта №09 · Дилдо-блоки.

python3 tools/build_p09.py            текстуры, модели, спрайты мобов, фон, звуки
python3 tools/build_p09.py --icons    + изометрические иконки (нужен playwright)

Источники:
  mod-src/textures/dildo/*.png      текстуры мода, как прислали (увеличенные картинки).
                                    Сетка 16×16 вычисляется, каждый тексель = медиана центра клетки
  mod-src/models/dildo/*.json       модель Blockbench (у всех 9 материалов одна геометрия)
  ванильная база 1.19.2             предметы, GUI, мобы, частицы
  звуки                             ванильные ogg (InventivetalentDev/minecraft-assets 1.19.2)
"""
import asyncio, base64, json, shutil, subprocess, sys, urllib.request
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).parent))
from vanilla import base as _vb
import mc_icon

VB = _vb()
SRC = ROOT / "mod-src" / "textures" / "dildo"
OUT = ROOT / "assets" / "textures" / "p9"
MOD, VAN, ISO, MOB = OUT / "mod", OUT / "v", OUT / "iso", OUT / "mob"
SND = ROOT / "assets" / "sounds" / "p09"

# файл -> (ключ, x0, y0, шаг_x, шаг_y): где начинается сетка и размер клетки в исходной картинке
GRID = {
    "stone.png":       ("stone", 1, 0, 20, 20),
    "14002130_xl.png": ("emerald", -7.0, -8.5, 42.07, 42.07),
    "diamondo.png":    ("diamond", 40.5, 42.5, 15.5, 15.5),   # скриншот блока в рамке: берём только сам блок
    "golden.png":      ("gold", 0, 0, 45, 45),
    "grass.png":       ("mud_top", 0, 0, 50, 793 / 16),
    "iron.png":        ("iron", 0, 0, 46, 46),
    "mud.png":         ("mud", 9.5, 39.5, 50, 50),
    "netherite.png":   ("netherite", 0, 0, 20, 20),
    "obsidian.png":    ("obsidian", 0, 0, 46, 46),
}


def quantize(path, x0, y0, sx, sy):
    a = np.array(Image.open(path).convert("RGB")).astype(int)
    h, w, _ = a.shape
    out = np.zeros((16, 16, 3), np.uint8)
    for j in range(16):
        for i in range(16):
            cx, cy = x0 + (i + 0.5) * sx, y0 + (j + 0.5) * sy
            r = max(1, int(min(sx, sy) * 0.22))
            xa, xb = int(np.clip(cx - r, 0, w - 1)), int(np.clip(cx + r, 1, w))
            ya, yb = int(np.clip(cy - r, 0, h - 1)), int(np.clip(cy + r, 1, h))
            out[j, i] = np.median(a[ya:yb, xa:xb].reshape(-1, 3), axis=0)
    return Image.fromarray(out, "RGB").convert("RGBA")


VAN_TEX = {
    # ресурсы генератора БЭД Варс и ингредиенты
    "dirt": "block/dirt", "stone_b": "block/stone", "iron_ingot": "item/iron_ingot", "gold_ingot": "item/gold_ingot",
    "diamond": "item/diamond", "emerald": "item/emerald", "obsidian_b": "block/obsidian", "netherite_ingot": "item/netherite_ingot",
    "gunpowder": "item/gunpowder", "tnt_side": "block/tnt_side", "tnt_top": "block/tnt_top", "tnt_bottom": "block/tnt_bottom",
    "sand": "block/sand", "netherite_scrap": "item/netherite_scrap",
    # рыбалка: удочка, поплавок, улов (ванильная таблица fishing)
    "fishing_rod": "item/fishing_rod", "fishing_rod_cast": "item/fishing_rod_cast", "fishing_hook": "entity/fishing_hook",
    "cod": "item/cod", "salmon": "item/salmon", "tropical_fish": "item/tropical_fish", "pufferfish": "item/pufferfish",
    "bow": "item/bow", "enchanted_book": "item/enchanted_book", "name_tag": "item/name_tag", "nautilus_shell": "item/nautilus_shell",
    "saddle": "item/saddle", "lily_pad": "block/lily_pad", "bowl": "item/bowl", "leather": "item/leather", "leather_boots": "item/leather_boots",
    "rotten_flesh": "item/rotten_flesh", "stick": "item/stick", "string": "item/string", "potion": "item/potion", "bone": "item/bone",
    "ink_sac": "item/ink_sac", "tripwire_hook": "block/tripwire_hook", "book": "item/book",
    # эффекты, частицы
    "eff_resistance": "mob_effect/resistance", "eff_luck": "mob_effect/luck",
    "drip_fall": "particle/drip_fall", "drip_hang": "particle/drip_hang", "drip_land": "particle/drip_land", "generic_0": "particle/generic_0",
    "lapis": "item/lapis_lazuli", "experience_bottle": "item/experience_bottle", "gold_nugget": "item/gold_nugget",
    "wooden_pickaxe": "item/wooden_pickaxe", "stone_pickaxe": "item/stone_pickaxe", "iron_pickaxe": "item/iron_pickaxe",
    "diamond_pickaxe": "item/diamond_pickaxe", "netherite_pickaxe": "item/netherite_pickaxe", "honeycomb": "item/honeycomb",
    "bedrock": "block/bedrock", "end_stone": "block/end_stone", "white_wool": "block/white_wool",
    "pink_wool": "block/pink_wool", "oak_planks": "block/oak_planks", "honey_block": "block/honey_block_side",
    "water": "block/water_still", "flint_and_steel": "item/flint_and_steel",
}
for i in range(16):
    VAN_TEX[f"explosion_{i}"] = f"particle/explosion_{i}"


def vt(path):
    return Image.open(VB / "textures" / f"{path}.png").convert("RGBA")


def build_textures():
    for d in (MOD, VAN, ISO, MOB): d.mkdir(parents=True, exist_ok=True)
    for f, (k, x0, y0, sx, sy) in GRID.items():
        quantize(SRC / f, x0, y0, sx, sy).save(MOD / f"{k}.png")
    for k, p in VAN_TEX.items():
        im = vt(p)
        if p == "block/water_still": im = im.crop((0, 0, 16, 16))
        im.save(VAN / f"{k}.png")
    # вода и кувшинка в игре подкрашены биомом (равнины: вода #3F76E4, листья #48B518)
    def tint(im, c):
        a = np.array(im).astype(int); a[..., 0] = a[..., 0] * c[0] // 255; a[..., 1] = a[..., 1] * c[1] // 255; a[..., 2] = a[..., 2] * c[2] // 255
        return Image.fromarray(a.astype(np.uint8), "RGBA")
    tint(vt("block/water_still").crop((0, 0, 16, 16)), (0x3F, 0x76, 0xE4)).save(VAN / "water.png")
    tint(vt("block/lily_pad"), (0x20, 0x80, 0x30)).save(VAN / "lily_pad.png")
    # частицы из кода: FALLING_LAVA (drip_fall, цвет 1.0/0.2857/0.0833) и CRIMSON_SPORE (generic, 0.9/0.1/0.1)
    tint(vt("particle/drip_fall"), (255, 73, 21)).save(VAN / "p_lava.png")
    tint(vt("particle/generic_0"), (230, 26, 26)).save(VAN / "p_spore.png")
    # GUI
    vt("gui/container/crafting_table").crop((0, 0, 176, 80)).save(VAN / "gui_craft.png")
    et = vt("gui/container/enchanting_table")
    et.crop((0, 0, 176, 83)).save(VAN / "gui_ench.png")
    et.crop((0, 166, 108, 185)).save(VAN / "gui_ench_slot.png")      # строка доступна
    et.crop((0, 185, 108, 204)).save(VAN / "gui_ench_slot_off.png")  # недоступна
    et.crop((0, 204, 108, 223)).save(VAN / "gui_ench_slot_hl.png")   # подсветка
    for i in range(3):
        et.crop((16 * i, 223, 16 * i + 16, 239)).save(VAN / f"gui_ench_lvl{i + 1}.png")
        et.crop((16 * i, 239, 16 * i + 16, 255)).save(VAN / f"gui_ench_lvl{i + 1}_off.png")
    # иконки hud (сердца) и слот хотбара
    ic = vt("gui/icons")
    ic.crop((16, 0, 25, 9)).save(VAN / "heart_bg.png"); ic.crop((52, 0, 61, 9)).save(VAN / "heart_full.png")
    print("textures ok")


# ---------------------------------------------------------------- спрайты мобов (вид спереди, сидя)
def mob_sprites():
    """Мобы на сиденье, вид спереди. Ноги у сидящих направлены на зрителя, поэтому от них видны только подошвы."""
    def face(im, x0, y0, x1, y1):
        return im.crop((x0, y0, x1, y1))

    def humanoid(tex, over=True, slim_arm=False, legw=4):
        s = vt(tex)
        W, H = 16, 8 + 12 + 4
        c = Image.new("RGBA", (W, H))
        head = face(s, 8, 8, 16, 16)
        if over and s.height == 64: head.alpha_composite(face(s, 40, 8, 48, 16))
        c.paste(head, (4, 0))
        body = face(s, 20, 20, 28, 32)
        if over and s.height == 64: body.alpha_composite(face(s, 20, 36, 28, 48))
        c.paste(body, (4, 8))
        if slim_arm:   # скелет: руки и ноги 2 px
            ra = face(s, 42, 18, 44, 30); c.paste(ra, (2, 8)); c.paste(ra.transpose(Image.FLIP_LEFT_RIGHT), (12, 8))
            sole = face(s, 4, 16, 6, 18).resize((2, 2))
            c.paste(sole, (5, 20)); c.paste(sole, (9, 20))
        else:
            ra = face(s, 44, 20, 48, 32)
            la = face(s, 36, 52, 40, 64) if s.height == 64 else None
            if la is None or not la.getbbox() or la.getextrema()[3][1] == 0: la = ra.transpose(Image.FLIP_LEFT_RIGHT)
            c.paste(ra, (0, 8)); c.paste(la, (12, 8))
            # подошвы ног (низ ноги 4×4), сидящий смотрит на нас коленями
            sole = face(s, 8, 16, 12, 20)
            lsole = face(s, 24, 48, 28, 52) if s.height == 64 else sole
            if lsole.getextrema()[3][1] == 0: lsole = sole
            c.paste(sole, (4, 20)); c.paste(lsole, (8, 20))
        return c

    def creeper():
        s = vt("entity/creeper/creeper"); c = Image.new("RGBA", (8, 22))
        c.paste(face(s, 8, 8, 16, 16), (0, 0)); c.paste(face(s, 20, 20, 28, 32), (0, 8))
        leg = face(s, 4, 20, 8, 22); c.paste(leg, (0, 20)); c.paste(leg, (4, 20))
        return c

    def quad(tex, head, body, leg, snout=None, fur=None):
        s = vt(tex)
        hw, hh = head[2] - head[0], head[3] - head[1]
        bw, bh = body[2] - body[0], body[3] - body[1]
        W = max(hw, bw) + 2; H = hh + bh // 2 + 6
        c = Image.new("RGBA", (W, H))
        bx = (W - bw) // 2; c.paste(face(s, *body), (bx, hh // 2))
        if fur:
            f = vt(fur); fb = face(f, *body).resize((bw + 2, bh + 2), Image.NEAREST); c.alpha_composite(fb, (bx - 1, hh // 2 - 1))
        lg = face(s, *leg)
        c.paste(lg, (bx, H - lg.height)); c.paste(lg, (bx + bw - lg.width, H - lg.height))
        hx = (W - hw) // 2; c.alpha_composite(face(s, *head), (hx, 0))
        if snout: sn = face(s, *snout); c.alpha_composite(sn, (hx + (hw - sn.width) // 2, hh - sn.height - 1))
        return c

    def villager():
        s = vt("entity/villager/villager"); t = vt("entity/villager/type/plains"); p = vt("entity/villager/profession/farmer")
        for o in (t, p): s.alpha_composite(o)
        c = Image.new("RGBA", (12, 26))
        c.paste(face(s, 8, 8, 16, 18), (2, 0))                         # голова 8×10
        c.alpha_composite(face(s, 26, 2, 28, 6), (5, 6))               # нос
        c.paste(face(s, 22, 26, 30, 38), (2, 10))                      # тело
        c.alpha_composite(face(s, 44, 42, 52, 46), (2, 13))            # скрещённые руки
        c.alpha_composite(face(s, 48, 26, 52, 30), (0, 13)); c.alpha_composite(face(s, 48, 26, 52, 30).transpose(Image.FLIP_LEFT_RIGHT), (8, 13))
        sole = face(s, 4, 16, 8, 20) if False else face(s, 8, 16, 12, 20)
        c.paste(sole, (2, 22)); c.paste(sole, (6, 22))
        return c

    def enderman():
        s = vt("entity/enderman/enderman"); c = Image.new("RGBA", (12, 34))
        c.paste(face(s, 8, 8, 16, 16), (2, 0)); c.paste(face(s, 32, 20, 40, 32), (2, 8))
        arm = face(s, 58, 2, 60, 32); c.paste(arm, (0, 8)); c.paste(arm, (10, 8))
        leg = face(s, 58, 2, 60, 6); c.paste(leg, (4, 20)); c.paste(leg, (6, 20))
        eyes = vt("entity/enderman/enderman_eyes").crop((8, 8, 16, 16)); c.alpha_composite(eyes, (2, 0))
        return c.crop((0, 0, 12, 22))

    S = {
        "steve": humanoid("entity/steve"), "zombie": humanoid("entity/zombie/zombie"),
        "skeleton": humanoid("entity/skeleton/skeleton", over=False, slim_arm=True), "creeper": creeper(),
        "enderman": enderman(), "villager": villager(),
        "cow": quad("entity/cow/cow", (6, 6, 14, 14), (28, 4, 40, 14), (4, 20, 8, 26)),
        "pig": quad("entity/pig/pig", (8, 8, 16, 16), (36, 8, 46, 16), (4, 20, 8, 24), snout=(17, 17, 21, 20)),
        "sheep": quad("entity/sheep/sheep", (8, 8, 14, 14), (34, 8, 42, 14), (4, 20, 8, 24), fur="entity/sheep/sheep_fur"),
    }
    for k, im in S.items(): im.save(MOB / f"{k}.png")
    # лица для кнопок выбора
    for k, (t, box, ov) in {"steve": ("entity/steve", (8, 8, 16, 16), True), "zombie": ("entity/zombie/zombie", (8, 8, 16, 16), True),
                            "skeleton": ("entity/skeleton/skeleton", (8, 8, 16, 16), False), "creeper": ("entity/creeper/creeper", (8, 8, 16, 16), False),
                            "enderman": ("entity/enderman/enderman", (8, 8, 16, 16), False), "cow": ("entity/cow/cow", (6, 6, 14, 14), False),
                            "pig": ("entity/pig/pig", (8, 8, 16, 16), False), "sheep": ("entity/sheep/sheep", (8, 8, 14, 14), False),
                            "villager": ("entity/villager/villager", (8, 8, 16, 18), False)}.items():
        s = vt(t); f = s.crop(box)
        if ov: f.alpha_composite(s.crop((box[0] + 32, box[1], box[2] + 32, box[3])))
        if k == "pig": f.alpha_composite(s.crop((17, 17, 21, 20)), (2, 4))
        if k == "villager": f.alpha_composite(s.crop((26, 2, 28, 6)), (3, 5))
        if k == "enderman": f.alpha_composite(vt("entity/enderman/enderman_eyes").crop((8, 8, 16, 16)))
        n = max(f.size); sq = Image.new("RGBA", (n, n)); sq.paste(f, ((n - f.width) // 2, (n - f.height) // 2)); sq.save(MOB / f"{k}_face.png")
    print("mobs ok", list(S))


# ---------------------------------------------------------------- модели
MATS = ["mud", "stone", "iron", "gold", "diamond", "emerald", "obsidian", "netherite", "tnt"]


def src_model():
    return json.loads((ROOT / "mod-src" / "models" / "dildo" / "netherite_dildo.json").read_text())


def mat_model(mat):
    """Одна геометрия (как netherite_dildo.json), текстуры по материалу. Грязь: верх трава, бока грязь. TNT: ванильный."""
    m = src_model(); els = json.loads(json.dumps(m["elements"]))
    if mat == "mud": tx = {"up": "mud_top", "down": "dirt", "side": "mud"}
    elif mat == "tnt": tx = {"up": "tnt_top", "down": "tnt_bottom", "side": "tnt_side"}
    else: tx = {"up": mat, "down": mat, "side": mat}
    for e in els:
        base = mat == "mud" and max(e["from"][1], e["to"][1]) < 5   # грязь: основание целиком земля, трава только на стволе
        for side, f in e["faces"].items():
            f["texture"] = "#" + ("dirt" if base else tx.get(side, tx["side"]))
    return {"elements": els}


def tex_path(key):
    if (MOD / f"{key}.png").exists(): return MOD / f"{key}.png"
    return VAN / f"{key}.png"


def with_textures(m, sub=False):
    keys = sorted({f["texture"][1:] for e in m["elements"] for f in e["faces"].values()})
    val = lambda k: (tex_path(k).parent.name + "/" + k) if sub else k
    return {"textures": {k: val(k) for k in keys}, "elements": m["elements"]}


def write_models():
    out = {k: with_textures(mat_model(k), True) for k in MATS}
    (ROOT / "data" / "p09_models.js").write_text(
        "/* Сгенерировано tools/build_p09.py, руками не править */\nwindow.ZM = window.ZM || {};\nZM.P09M = "
        + json.dumps(out, ensure_ascii=False) + ";\n", encoding="utf-8")
    keys = sorted({k for m in out.values() for k in m["textures"]})
    inl = {}
    for k in keys:
        p = tex_path(k); rel = p.relative_to(ROOT / "assets").as_posix()
        inl[rel] = "data:image/png;base64," + base64.b64encode(p.read_bytes()).decode()
    (ROOT / "data" / "p09_tex.js").write_text(
        "/* Сгенерировано tools/build_p09.py: текстуры 3D-моделей для WebGL (file://), руками не править */\n"
        "window.ZM_TEX_INLINE = Object.assign(window.ZM_TEX_INLINE || {}, " + json.dumps(inl) + ");\n", encoding="utf-8")
    print("models ok")


def build_bg():
    src = ROOT / "mod-src" / "brand" / "p9_bg_void_src.png"
    if not src.exists(): print("bg: исходник удалён, оставляю assets/textures/p9/bg_void.jpg"); return
    im = Image.open(ROOT / "mod-src" / "brand" / "p9_bg_void_src.png").convert("RGB")
    w = 1920; im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(OUT / "bg_void.jpg", quality=86, progressive=True, optimize=True)
    print("bg ok", im.size)


# ---------------------------------------------------------------- иконки
VAN_ICONS = ["dirt", "stone", "iron_block", "gold_block", "diamond_block", "emerald_block", "obsidian", "tnt", "enchanting_table", "bookshelf", "honey_block", "crafting_table", "end_rod"]


def custom_model(m):
    stage = mc_icon.STAGE; stage.mkdir(exist_ok=True)
    m = with_textures(m)
    for k in m["textures"]: shutil.copy(tex_path(k), stage / f"{k}.png")
    return m


async def render_icons():
    from playwright.async_api import async_playwright
    jobs = [(n, lambda n=n: mc_icon.build(n)) for n in VAN_ICONS]
    jobs += [(f"{k}_dildo", lambda k=k: custom_model(mat_model(k))) for k in MATS]
    tmp = ROOT / "_icon.html"
    tmp.write_text(mc_icon.HTML)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--allow-file-access-from-files"])
            pg = await b.new_page(viewport={"width": 512, "height": 512})
            await pg.goto(tmp.as_uri())
            ref = None
            for n, fn in [("barrel", lambda: mc_icon.build("barrel"))] + jobs:
                await pg.evaluate("m => go(m)", fn())
                o = ISO / f"{n}.png"
                await pg.screenshot(path=str(o), omit_background=True, clip={"x": 0, "y": 0, "width": 512, "height": 512})
                im = Image.open(o).convert("RGBA")
                if ref is None:
                    x0, y0, x1, y1 = im.getbbox(); c = ((x0 + x1) / 2, (y0 + y1) / 2); r = max(x1 - x0, y1 - y0) / 2 * 1.08
                    ref = tuple(int(v) for v in (c[0] - r, c[1] - r, c[0] + r, c[1] + r)); o.unlink(); continue
                im.crop(ref).resize((128, 128), Image.LANCZOS).save(o); print("icon", n)
            await b.close()
    finally:
        tmp.unlink(missing_ok=True); shutil.rmtree(mc_icon.STAGE, ignore_errors=True)


# ---------------------------------------------------------------- звуки
GH = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19.2/assets/minecraft/sounds/"
SOUNDS = {
    # SoundType.HONEY_BLOCK у всех дилдаков + HONEY_BLOCK_SLIDE при посадке
    "slide1": "block/honeyblock/slide1", "slide2": "block/honeyblock/slide2", "slide3": "block/honeyblock/slide3",
    "hbreak1": "block/honeyblock/break1", "hbreak2": "block/honeyblock/break2", "hbreak3": "block/honeyblock/break3",
    "hstep1": "block/honeyblock/step1", "hstep2": "block/honeyblock/step2", "hstep3": "block/honeyblock/step3",
    # ENDERMAN_SCREAM каждые 60 тиков после 200
    "scream1": "mob/endermen/scream1", "scream2": "mob/endermen/scream2", "scream3": "mob/endermen/scream3", "scream4": "mob/endermen/scream4",
    # рыбалка
    "cast": "random/bow", "splash": "random/splash", "retrieve1": "entity/bobber/retrieve1", "retrieve2": "entity/bobber/retrieve2",
    "throw": "entity/bobber/castfast",
    # взрыв, фитиль
    "fuse": "random/fuse", "explode1": "random/explode1", "explode2": "random/explode2", "explode3": "random/explode3",
    # стол зачарований, опыт
    "ench1": "block/enchantment_table/enchant1", "ench2": "block/enchantment_table/enchant2", "ench3": "block/enchantment_table/enchant3",
    # голоса сидящих
    "zombie": "mob/zombie/say1", "skeleton": "mob/skeleton/say1", "creeper": "mob/creeper/say1", "cow": "mob/cow/say1",
    "pig": "mob/pig/say1", "sheep": "mob/sheep/say1", "villager": "mob/villager/idle1", "enderman": "mob/endermen/idle1",
    "lava": "liquid/lavapop", "orb": "random/orb", "pop": "random/pop",
}


def build_sounds():
    SND.mkdir(parents=True, exist_ok=True)
    try:
        import imageio_ffmpeg; ff = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        ff = None
    for k, p in SOUNDS.items():
        o = SND / f"{k}.ogg"
        if not o.exists():
            req = urllib.request.Request(GH + p + ".ogg", headers={"User-Agent": "Mozilla/5.0"})
            o.write_bytes(urllib.request.urlopen(req, timeout=30).read())
        m = SND / f"{k}.mp3"
        if ff and not m.exists():
            subprocess.run([ff, "-loglevel", "error", "-y", "-i", str(o), "-b:a", "96k", str(m)], check=True)
    print("sounds ok", len(SOUNDS))


if __name__ == "__main__":
    build_textures(); mob_sprites(); write_models(); build_bg(); build_sounds()
    if "--icons" in sys.argv: asyncio.run(render_icons())
