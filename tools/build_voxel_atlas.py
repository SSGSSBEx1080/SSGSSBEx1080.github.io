"""Атлас блоков для воксельного движка (shared/voxel.js): главная-панорама и студия 3D-принтера.
Берёт ванильные текстуры 1.19.2 (tools/vanilla.py) + цифроблоки мода, красит траву/листву как в равнинах,
пишет data/voxel_atlas.js (data URI, чтобы WebGL работал и с file://).
Запуск: python3 tools/build_voxel_atlas.py"""
import base64, io, json, sys
from pathlib import Path
from PIL import Image, ImageChops

sys.path.insert(0, str(Path(__file__).parent))
import vanilla

ROOT = Path(__file__).resolve().parent.parent
B = Path(vanilla.base()) / "textures" / "block"
T = 16
GRASS, FOLIAGE, WATER = (145, 189, 89), (119, 171, 47), (63, 118, 228)
SPRUCE, BIRCH = (97, 153, 97), (128, 167, 85)

tiles, index = [], {}


def load(name):
    im = Image.open(B / f"{name}.png").convert("RGBA")
    if im.height > im.width:  # анимированные: первый кадр
        im = im.crop((0, 0, im.width, im.width))
    return im.resize((T, T), Image.NEAREST) if im.width != T else im


def tint(im, rgb):
    r, g, b, a = im.split()
    col = Image.new("RGB", im.size, rgb)
    rgbim = ImageChops.multiply(Image.merge("RGB", (r, g, b)), col)
    return Image.merge("RGBA", (*rgbim.split(), a))


def tile(key, im):
    if key in index:
        return index[key]
    index[key] = len(tiles)
    tiles.append(im)
    return index[key]


def T_(name, rgb=None):
    im = load(name)
    return tile(name + (str(rgb) if rgb else ""), tint(im, rgb) if rgb else im)


# 0 — белый тексель для служебных кубов (сопло, рамки)
tile("_white", Image.new("RGBA", (T, T), (255, 255, 255, 255)))
side = load("grass_block_side").copy()
side.alpha_composite(tint(load("grass_block_side_overlay"), GRASS))
t_grass_side = tile("grass_side", side)

# блоки: id -> [top, side, bottom], флаги
BLOCKS = [None]  # 0 = воздух
def add(key, name, top, sid=None, bot=None, **fl):
    sid = top if sid is None else sid
    bot = top if bot is None else bot
    BLOCKS.append(dict(key=key, name=name, t=[top, sid, bot], **fl))
    return len(BLOCKS) - 1

v = T_
add("grass_block", "Блок травы", v("grass_block_top", GRASS), t_grass_side, v("dirt"))
add("dirt", "Земля", v("dirt"))
add("stone", "Камень", v("stone"))
add("sand", "Песок", v("sand"))
add("water", "Вода", v("water_still", WATER), water=1)
add("oak_log", "Дубовое бревно", v("oak_log_top"), v("oak_log"))
add("oak_leaves", "Дубовая листва", v("oak_leaves", FOLIAGE), cut=1)
add("coal_ore", "Угольная руда", v("coal_ore"))
add("iron_ore", "Железная руда", v("iron_ore"))
add("gravel", "Гравий", v("gravel"))
add("snowy_grass", "Заснеженная трава", v("snow"), v("grass_block_snow"), v("dirt"))
add("spruce_log", "Еловое бревно", v("spruce_log_top"), v("spruce_log"))
add("spruce_leaves", "Еловая листва", v("spruce_leaves", SPRUCE), cut=1)
add("birch_log", "Берёзовое бревно", v("birch_log_top"), v("birch_log"))
add("birch_leaves", "Берёзовая листва", v("birch_leaves", BIRCH), cut=1)
add("netherrack", "Незерак", v("netherrack"))
add("soul_sand", "Песок душ", v("soul_sand"))
add("glowstone", "Светокамень", v("glowstone"), glow=1)
add("lava", "Лава", v("lava_still"), glow=1)
add("nether_wart_block", "Блок незерского нароста", v("nether_wart_block"))
add("crimson_nylium", "Багровый нилий", v("crimson_nylium"), v("crimson_nylium_side"), v("netherrack"))
add("crimson_stem", "Багровый стебель", v("crimson_stem_top"), v("crimson_stem"))
add("shroomlight", "Грибосвет", v("shroomlight"), glow=1)
add("end_stone", "Эндерняк", v("end_stone"))
add("obsidian", "Обсидиан", v("obsidian"))
add("purpur_block", "Пурпурный блок", v("purpur_block"))
add("basalt", "Базальт", v("basalt_top"), v("basalt_side"))
add("deepslate", "Глубинный сланец", v("deepslate_top"), v("deepslate"))
# палитра студии
PAL_START = len(BLOCKS)
for key, name, *faces in [
    ("oak_planks", "Дубовые доски", "oak_planks"), ("spruce_planks", "Еловые доски", "spruce_planks"), ("birch_planks", "Берёзовые доски", "birch_planks"),
    ("cobblestone", "Булыжник", "cobblestone"), ("mossy_cobblestone", "Замшелый булыжник", "mossy_cobblestone"), ("stone_bricks", "Каменные кирпичи", "stone_bricks"),
    ("bricks", "Кирпичи", "bricks"), ("smooth_stone", "Гладкий камень", "smooth_stone"), ("deepslate_bricks", "Глубинносланцевые кирпичи", "deepslate_bricks"),
    ("polished_blackstone_bricks", "Кирпичи из полированного чернита", "polished_blackstone_bricks"),
    ("sandstone", "Песчаник", "sandstone_top", "sandstone", "sandstone_bottom"), ("quartz_block", "Кварцевый блок", "quartz_block_top", "quartz_block_side", "quartz_block_bottom"),
    ("glass", "Стекло", "glass"), ("bookshelf", "Книжные полки", "oak_planks", "bookshelf"), ("crafting_table", "Верстак", "crafting_table_top", "crafting_table_front", "oak_planks"),
    ("furnace", "Печь", "furnace_top", "furnace_front", "furnace_top"), ("tnt", "Динамит", "tnt_top", "tnt_side", "tnt_bottom"),
    ("hay_block", "Сноп сена", "hay_block_top", "hay_block_side"), ("pumpkin", "Тыква", "pumpkin_top", "pumpkin_side"), ("jack_o_lantern", "Светильник Джека", "pumpkin_top", "jack_o_lantern"),
    ("melon", "Арбуз", "melon_top", "melon_side"), ("iron_block", "Железный блок", "iron_block"), ("gold_block", "Золотой блок", "gold_block"),
    ("diamond_block", "Алмазный блок", "diamond_block"), ("emerald_block", "Изумрудный блок", "emerald_block"), ("lapis_block", "Лазуритовый блок", "lapis_block"),
    ("redstone_block", "Блок красного камня", "redstone_block"), ("copper_block", "Медный блок", "copper_block"), ("amethyst_block", "Аметистовый блок", "amethyst_block"),
    ("sea_lantern", "Морской фонарь", "sea_lantern"), ("prismarine_bricks", "Призмариновые кирпичи", "prismarine_bricks"), ("packed_ice", "Плотный лёд", "packed_ice"),
    ("terracotta", "Терракота", "terracotta"), ("crying_obsidian", "Плачущий обсидиан", "crying_obsidian"),
    ("white_concrete", "Белый бетон", "white_concrete"), ("light_gray_concrete", "Светло-серый бетон", "light_gray_concrete"), ("gray_concrete", "Серый бетон", "gray_concrete"),
    ("black_concrete", "Чёрный бетон", "black_concrete"), ("red_concrete", "Красный бетон", "red_concrete"), ("orange_concrete", "Оранжевый бетон", "orange_concrete"),
    ("yellow_concrete", "Жёлтый бетон", "yellow_concrete"), ("lime_concrete", "Лаймовый бетон", "lime_concrete"), ("green_concrete", "Зелёный бетон", "green_concrete"),
    ("cyan_concrete", "Бирюзовый бетон", "cyan_concrete"), ("light_blue_concrete", "Голубой бетон", "light_blue_concrete"), ("blue_concrete", "Синий бетон", "blue_concrete"),
    ("purple_concrete", "Фиолетовый бетон", "purple_concrete"), ("magenta_concrete", "Пурпурный бетон", "magenta_concrete"), ("pink_concrete", "Розовый бетон", "pink_concrete"),
    ("brown_concrete", "Коричневый бетон", "brown_concrete"),
]:
    ids = [v(f) for f in faces]
    top = ids[0]; sid = ids[1] if len(ids) > 1 else top; bot = ids[2] if len(ids) > 2 else top
    fl = {}
    if key == "glass": fl["cut"] = 1
    if key in ("sea_lantern", "jack_o_lantern"): fl["glow"] = 1
    add(key, name, top, sid, bot, **fl)
# цифроблоки ZitraksMode
DIG = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]
for i, d in enumerate(DIG):
    im = Image.open(ROOT / "assets" / "textures" / "block" / f"{d}.png").convert("RGBA").resize((T, T), Image.LANCZOS)
    t = tile("zm_" + d, im)
    add("zitraksmode:" + d, f"Цифроблок {i}", t, zm=1)
# палитра студии: всё строительное + базовые природные
PALETTE = [i for i in range(1, len(BLOCKS)) if BLOCKS[i]["key"] not in ("water", "lava")]

cols = 16
rows = (len(tiles) + cols - 1) // cols
size = 256
while size // T * (size // T) < len(tiles):
    size *= 2
cols = size // T
atlas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
for i, im in enumerate(tiles):
    atlas.paste(im, ((i % cols) * T, (i // cols) * T))
buf = io.BytesIO(); atlas.save(buf, "PNG", optimize=True)
uri = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
for b in BLOCKS[1:]:
    b["id"] = BLOCKS.index(b)
out = ROOT / "data" / "voxel_atlas.js"
out.write_text("/* Сгенерировано tools/build_voxel_atlas.py: атлас блоков для shared/voxel.js, руками не править */\n"
               "window.ZM = window.ZM || {};\nZM.VOX_ATLAS = " + json.dumps(dict(uri=uri, size=size, tile=T, blocks=BLOCKS, palette=PALETTE), ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf8")
print("tiles", len(tiles), "blocks", len(BLOCKS) - 1, "atlas", size, "bytes", out.stat().st_size)
