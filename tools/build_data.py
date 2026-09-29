#!/usr/bin/env python3
"""
Сборщик данных ZitraksMode Wiki.

Читает файлы мода из папки mod-src/ (структура как в resources мода)
и генерирует JS-файлы в /data, которые страницы подключают через <script>.

    mod-src/
      advancements/01_numbers/*.json   ачивки
      recipes/*.json                   рецепты
      textures/block/*.png             текстуры
      HISTORY.md                       история версий

Использование:
    python3 tools/build_data.py            # взять из ./mod-src
    python3 tools/build_data.py --src X    # или из другой папки такой же структуры
"""
import argparse, json, re, shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
TEX = ROOT / "assets" / "textures" / "block"
MC = ROOT / "assets" / "textures" / "mc"

MC_COLORS = {"0": "black", "1": "dark_blue", "2": "dark_green", "3": "dark_aqua", "4": "dark_red",
             "5": "dark_purple", "6": "gold", "7": "gray", "8": "dark_gray", "9": "blue", "a": "green",
             "b": "aqua", "c": "red", "d": "light_purple", "e": "yellow", "f": "white"}

# Ачивки, текст и условие которых на сайте НЕ раскрываются (считаются, но показываются как «???»)
REDACTED_ADV = {"secret_1488"}

# Русские названия ванильных предметов, которые встречаются в рецептах
VANILLA_NAMES = {"minecraft:coal": "Уголь", "minecraft:quartz": "Кварц незера"}


def mc_format(s: str) -> dict:
    """'§5§lБЛОК НОЛЬ' -> {'text': 'БЛОК НОЛЬ', 'color': 'dark_purple', 'bold': True}"""
    color, bold, obf = None, False, False
    for code in re.findall(r"§(.)", s):
        c = code.lower()
        if c in MC_COLORS: color = MC_COLORS[c]
        elif c == "l": bold = True
        elif c == "k": obf = True
        elif c == "r": color, bold = None, False
    return {"text": re.sub(r"§.", "", s).strip(), "color": color, "bold": bold, "obfuscated": obf}


def read_json(p: Path):
    return json.loads(p.read_text(encoding="utf-8-sig"))


def parse_recipe(p: Path):
    r = read_json(p)
    if r.get("type") != "minecraft:crafting_shaped":
        return {"type": r.get("type"), "raw": r}
    pattern = [row.ljust(3) for row in r["pattern"]]
    key = {k: v["item"] for k, v in r["key"].items()}
    grid = [key.get(ch) if ch != " " else None for row in pattern for ch in row]
    return {"type": "shaped", "grid": grid, "result": r["result"]["item"], "count": r["result"].get("count", 1)}


def condition_text(adv, names):
    """Человеческое описание критерия ачивки."""
    out = []
    for c in adv.get("criteria", {}).values():
        t = c.get("trigger")
        if t == "minecraft:inventory_changed":
            items = [i for g in c.get("conditions", {}).get("items", []) for i in g.get("items", [])]
            out.append("Получить в инвентарь: " + ", ".join(f"«{names.get(i, i)}»" for i in items))
        else:
            out.append(f"Особый триггер мода ({t})")
    return "; ".join(out)


def iso_icon(tex_path: Path, out_path: Path, size=128):
    """Рендер блока как в инвентаре Minecraft: изометрия, верх 100%, лево 80%, право 60% яркости.
    Рисуем в 4 раза крупнее с NEAREST (чтобы пиксели не мылились) и уменьшаем с LANCZOS."""
    tex = Image.open(tex_path).convert("RGBA")
    n = tex.width
    S = size * 4
    k = S / 128
    P = lambda x, y: (x * k, y * k)
    T, R, B, L = P(64, 4), P(122, 33), P(64, 62), P(6, 33)
    Bd, Ld, Rd = P(64, 124), P(6, 95), P(122, 95)
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))

    def face(origin, ex_end, ey_end, bright):
        ox, oy = origin
        ex = ((ex_end[0] - ox) / n, (ex_end[1] - oy) / n)
        ey = ((ey_end[0] - ox) / n, (ey_end[1] - oy) / n)
        # обратная матрица для Image.transform (dest -> source)
        det = ex[0] * ey[1] - ey[0] * ex[1]
        a, b = ey[1] / det, -ey[0] / det
        d, e = -ex[1] / det, ex[0] / det
        c, f = -(a * ox + b * oy), -(d * ox + e * oy)
        t = tex
        rgb = Image.eval(t.convert("RGB"), lambda v: int(v * bright))
        t = Image.merge("RGBA", (*rgb.split(), t.split()[3]))
        warped = t.transform((S, S), Image.AFFINE, (a, b, c, d, e, f), resample=Image.NEAREST)
        mask = Image.new("L", (S, S), 0)
        from PIL import ImageDraw
        pts = [origin, ex_end, (ex_end[0] + ey_end[0] - ox, ex_end[1] + ey_end[1] - oy), ey_end]
        ImageDraw.Draw(mask).polygon(pts, fill=255)
        out.paste(warped, (0, 0), mask)

    face(L, B, Ld, 0.80)   # левая (юг)
    face(B, R, Bd, 0.60)   # правая (восток)
    face(L, T, B, 1.00)    # верх
    out.resize((size, size), Image.LANCZOS).save(out_path)


def build_numbers(src: Path):
    order = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "zero"]
    digit = {k: i for i, k in enumerate(["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"])}
    NAMES = {"one": "Единица", "two": "Двойка", "three": "Тройка", "four": "Четвёрка", "five": "Пятёрка",
             "six": "Шестёрка", "seven": "Семёрка", "eight": "Восьмёрка", "nine": "Девятка", "zero": "Ноль"}
    names = dict(VANILLA_NAMES, **{f"zitraksmode:{k}": v for k, v in NAMES.items()})
    TEX.mkdir(parents=True, exist_ok=True)
    adv_dir = src / "advancements" / "01_numbers"

    blocks = []
    for key in order:
        png = src / "textures" / "block" / f"{key}.png"
        if png.exists():
            shutil.copy(png, TEX / f"{key}.png")
            iso_icon(png, TEX / f"{key}_inv.png")
        recipe_p = src / "recipes" / f"{key}.json"
        blocks.append({
            "id": key, "digit": digit[key], "name": NAMES[key], "registry": f"zitraksmode:{key}",
            "texture": f"assets/textures/block/{key}.png",
            "recipe": parse_recipe(recipe_p) if recipe_p.exists() else None,
        })

    advs = []
    for p in sorted(adv_dir.glob("*.json")):
        a = read_json(p)
        d = a["display"]
        aid = f"zitraksmode:01_numbers/{p.stem}"
        icon = d.get("icon", {}).get("item", "")
        entry = {"id": aid, "key": p.stem, "parent": a.get("parent"), "frame": d.get("frame", "task"),
                 "hidden": d.get("hidden", False), "xp": a.get("rewards", {}).get("experience", 0),
                 "icon": icon.split(":")[-1]}
        if p.stem in REDACTED_ADV:
            entry["redacted"] = True
        else:
            entry.update(title=mc_format(d["title"]), description=mc_format(d["description"]),
                         condition=condition_text(a, names))
        advs.append(entry)

    # сортировка по цепочке parent: root -> one -> two ... -> zero -> (дети zero)
    by_parent = {}
    for a in advs: by_parent.setdefault(a["parent"], []).append(a)
    ordered, stack = [], ["zitraksmode:root"]
    while stack:
        cur = stack.pop(0)
        for ch in by_parent.get(cur, []):
            ordered.append(ch); stack.append(ch["id"])

    props = {"material": "STONE", "sound": "STONE", "hardness": 2.9, "resistance": 3.4,
             "requiresTool": False, "stack": 64, "light": 0,
             "source": "ModBlocks.registerNumberBlock(): strength(2.9f, 3.4f), Material.STONE, SoundType.STONE"}

    out = {"point": 1, "title": "Цифроблоки", "added": "26.10.2025", "blocks": blocks,
           "advancements": ordered, "names": names, "props": props}
    write_js("p01_numbers.js", "P01", out)
    print(f"[numbers] блоков: {len(blocks)}, рецептов: {sum(1 for b in blocks if b['recipe'])}, ачивок: {len(ordered)}")


def build_ui():
    """Вырезает нужные куски из ванильных GUI-текстур Minecraft 1.19.2."""
    ui = MC / "ui"; ui.mkdir(parents=True, exist_ok=True)
    w = Image.open(MC / "advancement_widgets.png").convert("RGBA")
    for i, frame in enumerate(["task", "challenge", "goal"]):
        w.crop((i * 26, 128, i * 26 + 26, 154)).save(ui / f"frame_{frame}_done.png")
        w.crop((i * 26, 154, i * 26 + 26, 180)).save(ui / f"frame_{frame}_todo.png")
    t = Image.open(MC / "toasts.png").convert("RGBA")
    t.crop((0, 0, 160, 32)).save(ui / "toast.png")
    # компактный верстак: только сетка 3x3, стрелка и слот результата (128x66)
    Image.open(MC / "crafting_table.png").convert("RGBA").crop((24, 11, 152, 77)).save(ui / "crafting_compact.png")
    g = Image.open(MC / "crafting_table.png").convert("RGBA")
    top, bottom = g.crop((0, 0, 176, 76)), g.crop((0, 162, 176, 166))
    craft = Image.new("RGBA", (176, 80)); craft.paste(top, (0, 0)); craft.paste(bottom, (0, 76))
    craft.save(ui / "crafting.png")
    s = Image.open(MC / "steve.png").convert("RGBA")
    face = s.crop((8, 8, 16, 16)); face.alpha_composite(s.crop((40, 8, 48, 16)))
    face.resize((16, 16), Image.NEAREST).save(ui / "steve_face.png")
    print("[ui] спрайты вырезаны")


def build_history(src: Path):
    p = src / "HISTORY.md"
    if not p.exists(): return
    items = []
    for line in p.read_text(encoding="utf-8-sig").splitlines():
        m = re.match(r"-\s*(\d{2}\.\d{2}\.\d{4})\s*[–-]\s*(.+)", line.strip())
        if m:
            text = m.group(2).strip()
            ver = re.search(r"верси[ия]\s*(\d+\.\d+\.\d+)", text)
            items.append({"date": m.group(1), "text": text, "version": ver.group(1) if ver else None})
    write_js("history.js", "HISTORY", items)
    print(f"[history] {len(items)} записей")


# ============================================================================
#  №02 · ТНТ-броня
# ============================================================================
MC2 = MC / "p2"                       # ванильные текстуры для страницы №02 (скачаны из 1.19.2)
ISO = MC2 / "iso"


def iso_box(tex, box, out_path, size=128, tex_side=None, tint=None, scale=1.0):
    """Изометрическая иконка произвольного бокса (кнопка, нажимная плита, блок).
    box = (x0, y0, z0, x1, y1, z1) в пикселях модели 0..16, как в JSON-моделях Minecraft.
    Проекция та же, что у iso_icon(): верх 100%, левая грань 80%, правая 60% яркости."""
    from PIL import ImageDraw
    top_t = Image.open(tex).convert("RGBA")
    side_t = Image.open(tex_side).convert("RGBA") if tex_side else top_t
    if tint:
        def tt(im):
            r, g, b, a = im.split()
            col = Image.new("RGB", im.size, tint)
            return Image.merge("RGBA", (*Image.blend(im.convert("RGB"), col, 0.35).split(), a))
        top_t, side_t = tt(top_t), tt(side_t)
    S = size * 4
    k = S / 128 * scale
    x0, y0, z0, x1, y1, z1 = box
    ax, az, ay = (58 / 16, 29 / 16), (58 / 16, -29 / 16), (0, 62 / 16)

    def scr(x, y, z):
        return (x * ax[0] + z * az[0] + (16 - y) * ay[0], x * ax[1] + z * az[1] + (16 - y) * ay[1])
    # центр бокса -> центр картинки
    cx, cy = scr((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    off = (S / 2 - cx * k, S / 2 - cy * k)
    P = lambda x, y, z: (scr(x, y, z)[0] * k + off[0], scr(x, y, z)[1] * k + off[1])
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))

    def face(t, crop, o, e1, e2, bright):
        t = t.crop(crop)
        rgb = Image.eval(t.convert("RGB"), lambda v: int(v * bright))
        t = Image.merge("RGBA", (*rgb.split(), t.split()[3]))
        w, h = t.size
        ex = ((e1[0] - o[0]) / w, (e1[1] - o[1]) / w)
        ey = ((e2[0] - o[0]) / h, (e2[1] - o[1]) / h)
        det = ex[0] * ey[1] - ey[0] * ex[1]
        if abs(det) < 1e-9: return
        a, b = ey[1] / det, -ey[0] / det
        d, e = -ex[1] / det, ex[0] / det
        c, f = -(a * o[0] + b * o[1]), -(d * o[0] + e * o[1])
        warped = t.transform((S, S), Image.AFFINE, (a, b, c, d, e, f), resample=Image.NEAREST)
        mask = Image.new("L", (S, S), 0)
        ImageDraw.Draw(mask).polygon([o, e1, (e1[0] + e2[0] - o[0], e1[1] + e2[1] - o[1]), e2], fill=255)
        out.paste(warped, (0, 0), mask)

    n = top_t.width / 16
    uv = lambda u0, v0, u1, v1: tuple(int(round(q * n)) for q in (u0, v0, u1, v1))
    # левая грань (z = z0), правая (x = x1), верх (y = y1)
    face(side_t, uv(x0, 16 - y1, x1, 16 - y0), P(x0, y1, z0), P(x1, y1, z0), P(x0, y0, z0), 0.80)
    face(side_t, uv(z0, 16 - y1, z1, 16 - y0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z0), 0.60)
    face(top_t, uv(x0, z0, x1, z1), P(x0, y1, z0), P(x1, y1, z0), P(x0, y1, z1), 1.00)
    out.resize((size, size), Image.LANCZOS).save(out_path)


def build_tnt(src: Path):
    ITEM = ROOT / "assets" / "textures" / "item"; ITEM.mkdir(parents=True, exist_ok=True)
    ENT = ROOT / "assets" / "textures" / "entity"; ENT.mkdir(parents=True, exist_ok=True)
    ISO.mkdir(parents=True, exist_ok=True)
    it = src / "textures" / "item"
    for n in ["tnt_helmet", "tnt_chestplate", "tnt_leggings", "tnt_boots"]:
        shutil.copy(it / f"{n}.png", ITEM / f"{n}.png")
    # ремкомплект: в моде 1024x1024. На сайт: 640 для витрины и 64 для иконок
    kit = Image.open(it / "tnt_repair_kit.png").convert("RGBA")
    kit.resize((640, 640), Image.LANCZOS).save(ITEM / "tnt_repair_kit.webp", quality=88)
    kit.resize((64, 64), Image.LANCZOS).save(ITEM / "tnt_repair_kit.png")

    # житель-подрывник: базовый житель + тип «равнины» + профессия (512x512, в 8 раз крупнее ванили)
    base = Image.open(MC2 / "entity_villager_villager.png").convert("RGBA").resize((512, 512), Image.NEAREST)
    base.alpha_composite(Image.open(MC2 / "entity_villager_type_plains.png").convert("RGBA").resize((512, 512), Image.NEAREST))
    prof = Image.open(src / "textures" / "entity" / "villager" / "profession" / "demolitionist.png").convert("RGBA")
    base.alpha_composite(prof.resize((512, 512), Image.LANCZOS))
    base.save(ENT / "demolitionist_full.png")
    shutil.copy(src / "textures" / "entity" / "villager" / "profession" / "demolitionist.png", ENT / "demolitionist.png")

    # полоска заряда: оригинал = полная; пустую делаем из неё (сегменты тёмные, рамки те же)
    bar = Image.open(src / "textures" / "gui" / "tnt_charge_bar.png").convert("RGBA")
    ui = MC / "ui"
    bar.save(ui / "charge_full.png")
    px = bar.load(); empty = bar.copy(); pe = empty.load()
    for y in range(bar.height):
        for x in range(bar.width):
            r, g, b, a = px[x, y]
            if r > 120: pe[x, y] = (58, 8, 10, a)
    empty.save(ui / "charge_empty.png")

    # спрайты из gui/icons.png и gui/container/villager2.png
    ic = Image.open(MC2 / "gui_icons.png").convert("RGBA")
    for name, box in {"armor_empty": (16, 9, 25, 18), "armor_half": (25, 9, 34, 18), "armor_full": (34, 9, 43, 18),
                      "heart_bg": (16, 0, 25, 9), "heart_full": (52, 0, 61, 9), "heart_half": (61, 0, 70, 9),
                      "xp_empty": (0, 64, 182, 69), "xp_full": (0, 69, 182, 74)}.items():
        ic.crop(box).save(ui / f"{name}.png")
    v2 = Image.open(MC2 / "gui_container_villager2.png").convert("RGBA")
    for name, box in {"trade_arrow": (15, 171, 25, 180), "trade_off": (25, 171, 35, 180),
                      "vxp_empty": (0, 186, 102, 191), "vxp_full": (0, 191, 102, 196)}.items():
        v2.crop(box).save(ui / f"{name}.png")
    # взрыв: 16 кадров particle/explosion_N -> один спрайт-лист 16x1
    frames = [Image.open(MC2 / f"particle_explosion_{i}.png").convert("RGBA") for i in range(16)]
    sheet = Image.new("RGBA", (16 * 16, 16))
    for i, f in enumerate(frames): sheet.paste(f.resize((16, 16), Image.NEAREST), (i * 16, 0))
    sheet.save(ui / "explosion_sheet.png")

    # изометрические иконки блоков и «плоских» блоков (кнопки/плиты), как в инвентаре
    B = lambda n: MC2 / f"block_{n}.png"
    # Супер-ТНТ: развёртка 1024x854 (крест из граней ~248x274). Снимаем 16x16 по центрам «пикселей»
    import numpy as np
    net = np.array(Image.open(src / "textures" / "super_tnt" / "super_tnt_net.png").convert("RGB"))
    def net_face(x0, y0, w=248, h=274):
        out = np.zeros((16, 16, 3), np.uint8)
        for j in range(16):
            for i in range(16):
                cx, cy = int(x0 + (i + .5) * w / 16), int(y0 + (j + .5) * h / 16)
                out[j, i] = np.median(net[cy - 3:cy + 4, cx - 3:cx + 4].reshape(-1, 3), 0)
        return Image.fromarray(out)
    net_face(280, 33).save(MC2 / "block_super_tnt_top.png")
    net_face(280, 307).save(MC2 / "block_super_tnt_side.png")
    net_face(280, 581, h=272).save(MC2 / "block_super_tnt_bottom.png")
    iso_box(B("tnt_top"), (0, 0, 0, 16, 16, 16), ISO / "tnt.png", tex_side=B("tnt_side"))
    iso_box(B("super_tnt_top"), (0, 0, 0, 16, 16, 16), ISO / "super_tnt.png", tex_side=B("super_tnt_side"))  # грани вырезаны из развёртки (mod-src/textures/super_tnt)
    iso_box(B("sand"), (0, 0, 0, 16, 16, 16), ISO / "sand.png")
    iso_box(B("redstone_block"), (0, 0, 0, 16, 16, 16), ISO / "redstone_block.png")
    mats = {"oak": "oak_planks", "spruce": "spruce_planks", "birch": "birch_planks", "jungle": "jungle_planks",
            "acacia": "acacia_planks", "dark_oak": "dark_oak_planks", "mangrove": "mangrove_planks", "stone": "stone",
            "polished_blackstone": "polished_blackstone", "crimson": "crimson_planks", "warped": "warped_planks"}
    for k, t in mats.items():
        iso_box(B(t), (5, 6, 6, 11, 10, 10), ISO / f"{k}_button.png", scale=1.9)          # button_inventory
        iso_box(B(t), (1, 0, 1, 15, 1, 15), ISO / f"{k}_pressure_plate.png", scale=1.0)   # pressure_plate_up
    iso_box(B("gold_block"), (1, 0, 1, 15, 1, 15), ISO / "light_weighted_pressure_plate.png")
    iso_box(B("iron_block"), (1, 0, 1, 15, 1, 15), ISO / "heavy_weighted_pressure_plate.png")


    # полигон для симулятора взрыва: текстуры блоков (листва и верх травы в ванили серые, красим как в равнинах)
    TER = MC2 / "terrain"; TER.mkdir(exist_ok=True)
    def tint(name, rgb, out):
        im = Image.open(MC2 / f"block_{name}.png").convert("RGBA")
        r, g, b, a = im.split()
        l = im.convert("L")
        col = Image.merge("RGB", [l.point(lambda v, c=c: v * c // 255) for c in rgb])
        Image.merge("RGBA", (*col.split(), a)).save(TER / f"{out}.png")
    tint("grass_block_top", (145, 189, 89), "grass_top")
    tint("oak_leaves", (119, 171, 47), "leaves")
    for n in ["grass_block_side", "dirt", "stone", "coal_ore", "iron_ore", "gold_ore", "redstone_ore", "diamond_ore", "copper_ore", "gravel",
              "bedrock", "oak_log", "oak_log_top", "oak_planks", "glass", "deepslate", "obsidian", "cobblestone", "andesite", "granite", "sand"]:
        Image.open(MC2 / f"block_{n}.png").convert("RGBA").crop((0, 0, 16, 16)).save(TER / f"{n}.png")
    # зомби-манекен (вид спереди 16x32) из entity/zombie/zombie.png, раскладка как у игрока 64x64
    z = Image.open(MC2 / "entity_zombie_zombie.png").convert("RGBA")
    zs = Image.new("RGBA", (16, 32))
    zs.paste(z.crop((8, 8, 16, 16)), (4, 0))
    zs.paste(z.crop((20, 20, 28, 32)), (4, 8))
    zs.paste(z.crop((44, 20, 48, 32)), (0, 8)); zs.paste(z.crop((44, 20, 48, 32)).transpose(Image.FLIP_LEFT_RIGHT), (12, 8))
    zs.paste(z.crop((4, 20, 8, 32)), (4, 20)); zs.paste(z.crop((4, 20, 8, 32)).transpose(Image.FLIP_LEFT_RIGHT), (8, 20))
    zs.save(TER / "zombie.png")
    # свинья сбоку (entity/pig/pig.png 64x32): голова 8x8x8 (0,0), тело 10x16x8 (28,8) лежит, ноги 4x6x4 (0,16), пятак 4x3x1 (16,16)
    pg = Image.open(MC2 / "entity_pig.png").convert("RGBA")
    ps = Image.new("RGBA", (25, 15))
    body = pg.crop((28, 16, 36, 32)).rotate(90, expand=True)          # бок тела 8x16 -> 16x8
    for lx in (1, 11): ps.paste(pg.crop((0, 20, 4, 26)), (lx, 9))       # ноги
    ps.paste(body, (0, 2))
    ps.paste(pg.crop((0, 8, 8, 16)), (16, 0))                           # бок головы
    ps.paste(pg.crop((16, 17, 17, 20)), (24, 4))                         # пятак
    ps.save(TER / "pig.png")

    # носитель ТНТ-брони: Стив спереди + слои брони мода (textures/models/armor/tnt_layer_1/2.png).
    # Рисуем в 4x с «раздувом» как у ArmorModel: layer_1 +1 px с каждой стороны, layer_2 +0.5 px.
    AL = src / "textures" / "armor_layers"
    steve = Image.open(MC2 / "entity_steve.png").convert("RGBA")
    L1 = Image.open(AL / "tnt_layer_1.png").convert("RGBA"); L2 = Image.open(AL / "tnt_layer_2.png").convert("RGBA")
    K, OX, OY = 4, 8, 8                      # масштаб и поля (под раздув)
    # части тела спереди: (u, v, w, h) на текстуре, (x, y) на фигуре 16x32, зеркалить?
    PARTS = {"head": [((8, 8, 8, 8), (4, 0), False)],
             "body": [((20, 20, 8, 12), (4, 8), False)],
             "arms": [((44, 20, 4, 12), (0, 8), False), ((44, 20, 4, 12), (12, 8), True)],
             "legs": [((4, 20, 4, 12), (4, 20), False), ((4, 20, 4, 12), (8, 20), True)]}
    def paint(canvas, tex, parts, infl):
        for key in parts:
            for (u, v, w, h), (x, y), mir in PARTS[key]:
                c = tex.crop((u, v, u + w, v + h))
                if mir: c = c.transpose(Image.FLIP_LEFT_RIGHT)
                W, H = round((w + 2 * infl) * K), round((h + 2 * infl) * K)
                c = c.resize((W, H), Image.NEAREST)
                canvas.alpha_composite(c, (round(OX + (x - infl) * K), round(OY + (y - infl) * K)))
    size = (16 * K + 2 * OX, 32 * K + 2 * OY)
    base = Image.new("RGBA", size); paint(base, steve, ["legs", "body", "arms", "head"], 0); base.save(TER / "wearer_base.png")
    layers = {"head": (L1, ["head"], 1.0), "chest": (L1, ["body", "arms"], 1.0), "legs": (L2, ["body", "legs"], 0.5), "feet": (L1, ["legs"], 1.0)}
    full = base.copy()
    for k in ["legs", "feet", "chest", "head"]:
        tex, parts, infl = layers[k]
        im = Image.new("RGBA", size); paint(im, tex, parts, infl); im.save(TER / f"wearer_{k}.png")
        full.alpha_composite(im)
    full.save(TER / "wearer.png")

    # рецепты
    rdir = src / "recipes" / "02_tnt"
    recipes = {}
    for p in sorted(rdir.glob("*.json")):
        r = read_json(p)
        if r.get("type") == "minecraft:smithing":
            recipes[p.stem] = {"type": "smithing", "base": r["base"]["item"], "addition": r["addition"]["item"], "result": r["result"]["item"]}
        else:
            recipes[p.stem] = parse_recipe(p)
    write_js("p02_recipes.js", "P02R", recipes)

    # звук: Crimson Moon с 3.5 секунды, mp3 + ogg. Сам бабах в нём примерно через 2 с
    snd_src = src / "sounds" / "crimson_moon_source.mp3"
    SND = ROOT / "assets" / "sounds"; SND.mkdir(parents=True, exist_ok=True)
    try:
        import imageio_ffmpeg, subprocess
        ff = imageio_ffmpeg.get_ffmpeg_exe()
        for ext, codec in (("mp3", ["-c:a", "libmp3lame", "-b:a", "128k"]), ("ogg", ["-c:a", "libvorbis", "-q:a", "5"])):
            subprocess.run([ff, "-y", "-loglevel", "error", "-ss", "3.5", "-i", str(snd_src), "-af", "afade=t=in:d=0.05,afade=t=out:st=5.4:d=0.5", *codec, str(SND / f"crimson_moon.{ext}")], check=True)
        # ванильные звуки ТНТ для финала: шипение фитиля + взрыв (sounds/random/fuse.ogg, explode1..4.ogg)
        van = src / "sounds" / "vanilla"
        for n in ["fuse", "explode1", "explode2", "explode3", "explode4"]:
            for ext, codec in (("mp3", ["-c:a", "libmp3lame", "-b:a", "128k"]), ("ogg", ["-c:a", "libvorbis", "-q:a", "5"])):
                subprocess.run([ff, "-y", "-loglevel", "error", "-i", str(van / f"{n}.ogg"), *codec, str(SND / f"tnt_{n}.{ext}")], check=True)
        print("[tnt] звук нарезан")
    except Exception as e:
        print("[tnt] звук пропущен (нет ffmpeg):", e)
    print(f"[tnt] рецептов: {len(recipes)}, иконок: {len(list(ISO.glob('*.png')))}")


def write_js(name, var, obj):
    DATA.mkdir(exist_ok=True)
    body = json.dumps(obj, ensure_ascii=False, indent=1)
    (DATA / name).write_text(f"/* Сгенерировано tools/build_data.py, руками не править */\nwindow.ZM = window.ZM || {{}};\nZM.{var} = {body};\n", encoding="utf-8")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=str(ROOT / "mod-src"))
    src = Path(ap.parse_args().src)
    build_ui()
    build_numbers(src)
    build_history(src)
    build_tnt(src)
