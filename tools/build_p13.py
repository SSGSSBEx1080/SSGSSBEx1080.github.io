"""№13 3D-принтер: временные пиксельные текстуры блока, нарисованные кодом (16×16),
и изометрическая иконка для хаба/инвентаря. Когда придут настоящие текстуры мода — просто
положить их в assets/textures/p13/ под этими же именами.
python3 tools/build_p13.py"""
from pathlib import Path
from PIL import Image, ImageDraw
import random

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "textures" / "p13"
OUT.mkdir(parents=True, exist_ok=True)
rnd = random.Random(13)

IRON = [(206, 211, 216), (186, 192, 198), (168, 174, 181), (224, 228, 232)]
DARK = [(46, 52, 60), (38, 43, 50), (56, 62, 71)]
CY = (53, 208, 255)


def noise_fill(d, box, pal):
    x0, y0, x1, y1 = box
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            d.point((x, y), rnd.choice(pal))


def frame(im):
    d = ImageDraw.Draw(im)
    noise_fill(d, (0, 0, 15, 15), IRON)
    for i in range(16):  # скос рамки
        d.point((i, 0), (236, 239, 242)); d.point((0, i), (230, 233, 236))
        d.point((i, 15), (120, 126, 134)); d.point((15, i), (132, 138, 146))
    for p in [(1, 1), (14, 1), (1, 14), (14, 14)]:  # винты
        d.point(p, (90, 96, 104))
    return d


def front():
    im = Image.new("RGBA", (16, 16)); d = frame(im)
    noise_fill(d, (2, 2, 13, 11), DARK)  # камера печати
    for x in range(2, 14): d.point((x, 2), (70, 78, 88))
    # стекло с бликом
    for i in range(3):
        d.point((3 + i, 3), (120, 170, 190)); d.point((3, 3 + i), (120, 170, 190))
    # портал X и каретка с соплом
    d.line((3, 5, 12, 5), (150, 156, 164)); d.rectangle((7, 4, 8, 6), (230, 120, 30)); d.point((7, 7), (255, 200, 60)); d.point((8, 7), (255, 170, 40))
    # напечатанная деталь на столе
    d.rectangle((6, 9, 9, 10), CY); d.line((6, 9, 9, 9), (150, 235, 255))
    d.line((3, 11, 12, 11), (110, 116, 124))  # стол
    # панель: экран и кнопка
    noise_fill(d, (2, 12, 13, 13), [(70, 76, 84), (64, 70, 78)])
    d.rectangle((3, 12, 7, 13), (10, 40, 55)); d.line((4, 12, 6, 12), CY); d.point((4, 13), (30, 120, 150))
    d.point((11, 12), (80, 255, 120)); d.point((12, 13), (255, 80, 80))
    return im


def side():
    im = Image.new("RGBA", (16, 16)); d = frame(im)
    for y in (4, 6, 8, 10):  # вентиляция
        d.line((4, y, 11, y), (70, 76, 84)); d.line((4, y + 1, 11, y + 1), (150, 156, 164))
    d.rectangle((12, 12, 13, 13), (40, 44, 50)); d.point((12, 12), CY)  # разъём
    return im


def top():
    im = Image.new("RGBA", (16, 16)); d = frame(im)
    noise_fill(d, (3, 3, 12, 12), DARK)
    d.ellipse((5, 5, 10, 10), (90, 60, 30)); d.ellipse((6, 6, 9, 9), CY)  # катушка филамента
    d.point((7, 7), (20, 30, 40)); d.point((8, 8), (20, 30, 40))
    return im


def bottom():
    im = Image.new("RGBA", (16, 16)); d = frame(im)
    for p in [(2, 2), (13, 2), (2, 13), (13, 13)]: d.rectangle((p[0] - 1, p[1] - 1, p[0], p[1]), (30, 30, 34))
    return im


tex = {"printer_front": front(), "printer_side": side(), "printer_top": top(), "printer_bottom": bottom()}
for k, im in tex.items():
    im.save(OUT / f"{k}.png")


def iso(size=64):
    """изометрия как в инвентаре: верх + лицо слева + бок справа"""
    S = 16; k = 4  # апскейл до аффинного преобразования
    big = {n: tex[n].resize((S * k, S * k), Image.NEAREST) for n in tex}
    W = size * 4
    canvas = Image.new("RGBA", (W, W))
    import math
    c = W / 2; e = W * 0.43; h = e * 0.5
    def quad(img, pts, shade):
        # аффинно: (0,0)->pts[0], (1,0)->pts[1], (0,1)->pts[3]
        (x0, y0), (x1, y1), _, (x3, y3) = pts
        n = img.width
        a, b = (x1 - x0) / n, (x3 - x0) / n; d_, e_ = (y1 - y0) / n, (y3 - y0) / n
        det = a * e_ - b * d_
        inv = (e_ / det, -b / det, (b * y0 - e_ * x0) / det, -d_ / det, a / det, (d_ * x0 - a * y0) / det)
        src = img.point(lambda v: v * shade) if shade != 1 else img
        r, g, bb, al = src.convert("RGBA").split(); src = Image.merge("RGBA", (r.point(lambda v: int(v * shade)), g.point(lambda v: int(v * shade)), bb.point(lambda v: int(v * shade)), al))
        t = src.transform((W, W), Image.AFFINE, inv, Image.NEAREST)
        canvas.alpha_composite(t)
    top_c = (c, c - e * 0.98)
    T = [(c, c - e), (c + e * 0.87, c - e * 0.5), (c, c), (c - e * 0.87, c - e * 0.5)]
    quad(big["printer_top"], [T[3], T[0], T[1], T[2]], 1.0)
    L = [(c - e * 0.87, c - e * 0.5), (c, c), (c, c + e), (c - e * 0.87, c + e * 0.5)]
    quad(big["printer_front"], L, 0.82)
    R = [(c, c), (c + e * 0.87, c - e * 0.5), (c + e * 0.87, c + e * 0.5), (c, c + e)]
    quad(big["printer_side"], R, 0.62)
    return canvas.resize((size, size), Image.LANCZOS)


iso(64).save(OUT / "printer_iso.png")
print("ok", list(tex))
