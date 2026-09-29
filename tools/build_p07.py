"""Сборка ассетов пункта №07 · Эндер-система.

python3 tools/build_p07.py            текстуры, модели, звуки
python3 tools/build_p07.py --icons    + перерисовать изометрические иконки (нужен playwright)

Источники:
  mod-src/textures/ender/*.png   текстуры мода (как есть, без апскейла)
  ванильная база 1.19.2          (tools/vanilla.py) GUI, предметы, модели блоков
  звуки                          ванильные ogg с GitHub (InventivetalentDev/minecraft-assets 1.19.2)
"""
import asyncio, base64, json, shutil, subprocess, sys, urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).parent))
from vanilla import base as _vb
import mc_icon

VB = _vb()
SRC = ROOT / "mod-src" / "textures" / "ender"
OUT = ROOT / "assets" / "textures" / "p7"
MOD, VAN, ISO = OUT / "mod", OUT / "v", OUT / "iso"
SND = ROOT / "assets" / "sounds" / "p07"

# ---------------------------------------------------------------- текстуры
VAN_TEX = {
    # предметы (плоские)
    "ender_eye": "item/ender_eye", "ender_pearl": "item/ender_pearl", "blaze_powder": "item/blaze_powder",
    "iron_door": "item/iron_door", "raw_iron": "item/raw_iron", "iron_ingot": "item/iron_ingot",
    "raw_gold": "item/raw_gold", "gold_ingot": "item/gold_ingot", "beef": "item/beef", "cooked_beef": "item/cooked_beef",
    "porkchop": "item/porkchop", "cooked_porkchop": "item/cooked_porkchop", "potato": "item/potato", "baked_potato": "item/baked_potato",
    "kelp": "item/kelp", "dried_kelp": "item/dried_kelp", "clay_ball": "item/clay_ball", "brick": "item/brick",
    "charcoal": "item/charcoal", "green_dye": "item/green_dye", "netherite_scrap": "item/netherite_scrap", "coal": "item/coal",
    "diamond": "item/diamond", "netherite_ingot": "item/netherite_ingot", "totem_of_undying": "item/totem_of_undying",
    "elytra": "item/elytra", "golden_apple": "item/golden_apple", "emerald": "item/emerald", "diamond_sword": "item/diamond_sword",
    "netherite_pickaxe": "item/netherite_pickaxe", "diamond_pickaxe": "item/diamond_pickaxe", "iron_pickaxe": "item/iron_pickaxe",
    "stone_pickaxe": "item/stone_pickaxe", "wooden_pickaxe": "item/wooden_pickaxe", "golden_pickaxe": "item/golden_pickaxe",
    "enchanted_book": "item/enchanted_book", "shulker_shell": "item/shulker_shell", "experience_bottle": "item/experience_bottle",
    "nether_star": "item/nether_star", "beacon_item": "block/beacon", "tnt_side": "block/tnt_side",
    # блоки / окружение
    "obsidian": "block/obsidian", "end_stone": "block/end_stone", "end_stone_bricks": "block/end_stone_bricks",
    "purpur_block": "block/purpur_block", "crying_obsidian": "block/crying_obsidian",
    "end_portal": "entity/end_portal", "end_sky": "environment/end_sky",
    "steve": "entity/steve", "alex": "entity/alex", "glass": "block/glass",
    "redstone_dust": "block/redstone_dust_line0", "arrow": "item/arrow", "rotten_flesh": "item/rotten_flesh", "lever": "block/lever", "cobblestone": "block/cobblestone",
    "barrier": "item/barrier", "dirt": "block/dirt", "white_concrete": "block/white_concrete", "fire_charge": "item/fire_charge", "end_crystal": "item/end_crystal", "red_bed_t": "block/red_wool",
}
for i in range(10):
    VAN_TEX[f"destroy_{i}"] = f"block/destroy_stage_{i}"


def vt(path):
    return Image.open(VB / "textures" / f"{path}.png").convert("RGBA")


def build_textures():
    for d in (MOD, VAN, ISO): d.mkdir(parents=True, exist_ok=True)
    for f in sorted(SRC.glob("*.png")):
        im = Image.open(f).convert("RGBA")
        if im.width != im.height:   # ender_door.png 25×38: в слоте игра рисует предмет квадратом, дополняем прозрачными полями
            n = max(im.size); sq = Image.new("RGBA", (n, n)); sq.paste(im, ((n - im.width) // 2, (n - im.height) // 2)); im = sq
        im.save(MOD / f.name)
    for k, p in VAN_TEX.items():
        im = vt(p)
        if im.height > im.width and not p.startswith(("entity", "environment")): im = im.crop((0, 0, im.width, im.width))
        im.save(VAN / f"{k}.png")
    # GUI: печь (верх 176×80 + пламя + стрелка), двойной сундук целиком (сейф + инвентарь игрока)
    fu = vt("gui/container/furnace")
    fu.crop((0, 0, 176, 80)).save(VAN / "gui_furnace.png")
    fu.crop((176, 0, 190, 14)).save(VAN / "gui_flame.png")
    fu.crop((176, 14, 200, 31)).save(VAN / "gui_arrow.png")
    vt("gui/container/generic_54").crop((0, 0, 176, 222)).save(VAN / "gui_safe.png")
    vt("gui/container/crafting_table").crop((0, 0, 176, 80)).save(VAN / "gui_craft.png")
    # головы игроков: лицо + слой шапки
    for n in ("steve", "alex"):
        s = vt(f"entity/{n}"); face = s.crop((8, 8, 16, 16)); face.alpha_composite(s.crop((40, 8, 48, 16)))
        face.save(VAN / f"{n}_face.png")
    cr = vt("entity/creeper/creeper"); cr.crop((8, 8, 16, 16)).save(VAN / "creeper_face.png")
    z = vt("entity/zombie/zombie"); zf = z.crop((8, 8, 16, 16)); zf.alpha_composite(z.crop((40, 8, 48, 16))); zf.save(VAN / "zombie_face.png")
    # сердечки из icons.png
    ic = vt("gui/icons")
    for n, x in (("heart_bg", 16), ("heart_full", 52), ("heart_half", 61), ("heart_fire_full", 52), ("heart_bg_flash", 25)):
        ic.crop((x, 0, x + 9, 9)).save(VAN / f"{n}.png")
    # дёрн с биомным тоном равнин (#91BD59): верх целиком, бок = земля + подкрашенный overlay
    GRASS = (0x91, 0xBD, 0x59)
    def tint(im):
        px = im.load()
        for y in range(im.height):
            for x in range(im.width):
                r, g, b, a = px[x, y]; px[x, y] = (r * GRASS[0] // 255, g * GRASS[1] // 255, b * GRASS[2] // 255, a)
        return im
    tint(vt("block/grass_block_top")).save(VAN / "grass_top.png")
    side = vt("block/grass_block_side"); side.alpha_composite(tint(vt("block/grass_block_side_overlay"))); side.save(VAN / "grass_side.png")
    print("textures ok")


# ---------------------------------------------------------------- модели (координаты Minecraft, 0..16)
def cube(frm, to, tex, uvs=None):
    """tex: dict сторона -> ключ текстуры; uvs: необязательные uv по сторонам."""
    faces = {}
    for side, key in tex.items():
        if key is None: continue
        f = {"texture": "#" + key, "uv": (uvs or {}).get(side) or mc_icon.default_uv(side, frm, to)}
        faces[side] = f
    return {"from": frm, "to": to, "faces": faces}


def six(t_side, t_up=None, t_down=None, front=None):
    d = {s: t_side for s in ("north", "south", "east", "west")}
    d["up"] = t_up or t_side; d["down"] = t_down or t_up or t_side
    if front: d["north"] = front
    return d


def models():
    M = {}
    M["glass"] = {"elements": [cube([0, 0, 0], [16, 16, 16], six("reinforced_ender_glass"))]}
    M["furnace"] = {"elements": [cube([0, 0, 0], [16, 16, 16], six("ender_furnace_side", "ender_furnace_top", front="ender_furnace_front"))]}
    M["furnace_on"] = {"elements": [cube([0, 0, 0], [16, 16, 16], six("ender_furnace_side", "ender_furnace_top", front="ender_furnace_front_on"))]}
    M["safe"] = {"elements": [cube([0, 0, 0], [16, 16, 16], six("ender_safe_side", "ender_safe_top", front="ender_safe_front"))]}
    # дверь: две половины толщиной 3, как ванильная template_door
    door = []
    for y0, t in ((0, "ender_door_bottom"), (16, "ender_door_top")):
        uv = {"north": [0, 0, 16, 16], "south": [16, 0, 0, 16], "east": [13, 0, 16, 16], "west": [0, 0, 3, 16],
              "up": [0, 13, 16, 16], "down": [0, 13, 16, 16]}
        sides = {"north": t, "south": t, "east": t, "west": t}
        if y0 == 0: sides["down"] = t
        else: sides["up"] = t
        door.append(cube([0, y0, 13], [16, y0 + 16, 16], sides, uv))
    M["door"] = {"elements": door}
    tuv = {s: [0, 16, 16, 13] for s in ("north", "south", "east", "west")}
    tuv["up"] = [0, 0, 16, 16]; tuv["down"] = [0, 16, 16, 0]
    M["trapdoor"] = {"elements": [cube([0, 0, 0], [16, 3, 16], six("ender_trapdoor"), tuv)]}
    # кнопка на боку белого бетона, плита на белом бетоне: так видно масштаб и есть контраст
    M["button"] = {"elements": [cube([0, 0, 0], [16, 16, 16], six("white_concrete")),
                                cube([5, 6, -2], [11, 10, 0], six("ender_button"))]}
    M["plate"] = {"elements": [cube([0, -16, 0], [16, 0, 16], six("white_concrete"), {f: [0, 0, 16, 16] for f in ("north", "south", "east", "west", "up", "down")}),
                               cube([1, 0, 1], [15, 1, 15], six("ender_pressure_plate"))]}
    # иконки инвентаря (для рендера)
    I = {
        "reinforced_ender_glass": M["glass"], "ender_furnace": M["furnace"], "ender_furnace_on": M["furnace_on"], "ender_safe": M["safe"],
        "ender_trapdoor": M["trapdoor"],
        "ender_button": {"elements": [cube([5, 6, 6], [11, 10, 10], six("ender_button"))]},
        "ender_pressure_plate": {"elements": [cube([1, 0, 1], [15, 1, 15], six("ender_pressure_plate"))]},
        # для сцен: кнопка на белом бетоне, плита на белом бетоне
        "ender_button_wc": M["button"], "ender_pressure_plate_wc": M["plate"],
    }
    return M, I


def tex_path(key):
    if (MOD / f"{key}.png").exists(): return MOD / f"{key}.png"
    return VAN / f"{key}.png"


def with_textures(m, sub=False):
    """sub=True: пути от assets/textures/p7/ (mod/… или v/…), как ждёт gl3d; иначе просто ключ (рендер иконок)."""
    keys = sorted({f["texture"][1:] for e in m["elements"] for f in e["faces"].values()})
    val = lambda k: (tex_path(k).parent.name + "/" + k) if sub else k
    return {"textures": {k: val(k) for k in keys}, "elements": m["elements"]}


def write_models():
    M, _ = models()
    out = {k: with_textures(v, True) for k, v in M.items()}
    (ROOT / "data" / "p07_models.js").write_text(
        "/* Сгенерировано tools/build_p07.py, руками не править */\nwindow.ZM = window.ZM || {};\nZM.P07M = "
        + json.dumps(out, ensure_ascii=False) + ";\n", encoding="utf-8")
    keys = sorted({k for m in out.values() for k in m["textures"]})   # ключи = имена файлов
    inl = {}
    for k in keys:
        p = tex_path(k); rel = p.relative_to(ROOT / "assets").as_posix()
        inl[rel] = "data:image/png;base64," + base64.b64encode(p.read_bytes()).decode()
    (ROOT / "data" / "p07_tex.js").write_text(
        "/* Сгенерировано tools/build_p07.py: текстуры 3D-моделей для WebGL (file://), руками не править */\n"
        "window.ZM_TEX_INLINE = Object.assign(window.ZM_TEX_INLINE || {}, " + json.dumps(inl) + ");\n", encoding="utf-8")
    print("models ok", list(out))


# ---------------------------------------------------------------- иконки
VAN_ICONS = ["obsidian", "glass", "furnace", "cobblestone", "stone", "sand", "oak_log", "cactus", "ancient_debris",
             "end_stone", "iron_block", "crying_obsidian", "tnt"]
VAN_ICON_MODELS = {"stone_button": "block/stone_button_inventory", "stone_pressure_plate": "block/stone_pressure_plate",
                   "iron_trapdoor": "block/iron_trapdoor_bottom"}


def ender_chest_model():
    """Эндер-сундук в инвентаре рисуется entity-рендером, json-модели нет: собираем из entity/chest/ender.png (64×64)."""
    stage = mc_icon.STAGE; stage.mkdir(exist_ok=True)
    vt("entity/chest/ender").save(stage / "ender_chest_e.png")
    k = "#ender_chest_e"
    s = 16 / 64 * 16 / 16   # uv в 0..16 для текстуры 64: делим пиксели на 4
    q = lambda x0, y0, x1, y1: [x0 / 4, y0 / 4, x1 / 4, y1 / 4]
    base = {"from": [1, 0, 1], "to": [15, 10, 15], "faces": {
        "north": {"uv": q(42, 33, 56, 43), "texture": k}, "south": {"uv": q(14, 33, 28, 43), "texture": k},
        "east": {"uv": q(0, 33, 14, 43), "texture": k}, "west": {"uv": q(28, 33, 42, 43), "texture": k},
        "down": {"uv": q(28, 19, 42, 33), "texture": k}}}
    lid = {"from": [1, 9, 1], "to": [15, 14, 15], "faces": {
        "north": {"uv": q(42, 14, 56, 19), "texture": k}, "south": {"uv": q(14, 14, 28, 19), "texture": k},
        "east": {"uv": q(0, 14, 14, 19), "texture": k}, "west": {"uv": q(28, 14, 42, 19), "texture": k},
        "up": {"uv": q(28, 0, 42, 14), "texture": k, "rotation": 180}}}
    lock = {"from": [7, 7, 0], "to": [9, 11, 1], "faces": {
        "north": {"uv": q(4, 1, 6, 5), "texture": k}, "south": {"uv": q(1, 1, 3, 5), "texture": k},
        "east": {"uv": q(0, 1, 1, 5), "texture": k}, "west": {"uv": q(3, 1, 4, 5), "texture": k},
        "up": {"uv": q(1, 0, 3, 1), "texture": k}, "down": {"uv": q(3, 0, 5, 1), "texture": k}}}
    return {"textures": {"ender_chest_e": "ender_chest_e"}, "elements": [base, lid, lock]}


def custom_model(m):
    """модель p07 -> модель для mc_icon (текстуры кладём в _iconsrc)."""
    stage = mc_icon.STAGE; stage.mkdir(exist_ok=True)
    m = with_textures(m)
    for k in m["textures"]: shutil.copy(tex_path(k), stage / f"{k}.png")
    return m


async def render_icons():
    from playwright.async_api import async_playwright
    _, I = models()
    jobs = [(n, lambda n=n: mc_icon.build(n)) for n in VAN_ICONS]
    jobs += [(n, lambda p=p: mc_icon.build(p)) for n, p in VAN_ICON_MODELS.items()]
    jobs += [("ender_chest", ender_chest_model)]
    jobs += [(n, lambda m=m: custom_model(m)) for n, m in I.items()]
    tmp = ROOT / "_icon.html"
    tmp.write_text(mc_icon.HTML.replace("{unit: 16, persp: 99999}", "{unit: 16, persp: 99999, blend: window.BLEND}"))
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--allow-file-access-from-files"])
            pg = await b.new_page(viewport={"width": 512, "height": 512})
            await pg.goto(tmp.as_uri())
            ref = None
            for n, fn in [("barrel", lambda: mc_icon.build("barrel"))] + jobs:
                await pg.evaluate("b => window.BLEND = b", n in ("reinforced_ender_glass", "glass"))
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
    "door_open1": "block/iron_door/open1", "door_open2": "block/iron_door/open2", "door_open3": "block/iron_door/open3",
    "door_close1": "block/iron_door/close1", "door_close2": "block/iron_door/close2", "door_close3": "block/iron_door/close3",
    "trap_open1": "block/wooden_trapdoor/open1", "trap_open2": "block/wooden_trapdoor/open2", "trap_open3": "block/wooden_trapdoor/open3",
    "trap_close1": "block/wooden_trapdoor/close1", "trap_close2": "block/wooden_trapdoor/close2",
    "thunder1": "ambient/weather/thunder1", "thunder2": "ambient/weather/thunder2", "thunder3": "ambient/weather/thunder3",
    "impact1": "random/explode1", "impact2": "random/explode2", "explode3": "random/explode3", "explode4": "random/explode4",
    "hurt1": "damage/hit1", "hurt2": "damage/hit2", "hurt3": "damage/hit3",
    "fire_hurt1": "entity/player/hurt/fire_hurt1", "fire_hurt2": "entity/player/hurt/fire_hurt2",
    "glass1": "random/glass1", "glass2": "random/glass2", "glass3": "random/glass3",
    "dig1": "dig/stone1", "dig2": "dig/stone2", "dig3": "dig/stone3", "dig4": "dig/stone4",
    "hit1": "step/stone1", "hit2": "step/stone2", "hit3": "step/stone3", "hit4": "step/stone4",
    "crackle1": "block/furnace/fire_crackle1", "crackle2": "block/furnace/fire_crackle2", "crackle3": "block/furnace/fire_crackle3",
    "click": "random/click", "wood_click": "random/wood_click",
    "portal": "portal/portal", "tp1": "mob/endermen/portal", "tp2": "mob/endermen/portal2",
    "echest_open": "block/enderchest/open", "echest_close": "block/enderchest/close",
    "eye_launch": "entity/endereye/endereye_launch1", "fizz": "random/fizz", "ignite": "fire/ignite",
    "stare": "mob/endermen/stare", "idle1": "mob/endermen/idle1", "bow": "random/bow",
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
        if ff and not m.exists():   # Safari не играет ogg
            subprocess.run([ff, "-loglevel", "error", "-y", "-i", str(o), "-b:a", "96k", str(m)], check=True)
    print("sounds ok", len(SOUNDS))


if __name__ == "__main__":
    build_textures(); write_models(); build_sounds()
    if "--icons" in sys.argv: asyncio.run(render_icons())
