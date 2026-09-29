"""Аватарки профиля (лица мобов 8×8 из ванильных текстур + лицо Жителя-Дауна) -> assets/textures/hub/av/*.png (64×64, без размытия)."""
from pathlib import Path
from PIL import Image
import sys
sys.path.insert(0, str(Path(__file__).parent))
from vanilla import base
R = Path(__file__).resolve().parent.parent
OUT = R / "assets/textures/hub/av"; OUT.mkdir(parents=True, exist_ok=True)
V = base() / "textures/entity"
# имя: (файл, лицо (x,y,w,h), слой сверху (x,y) или None)
FACES = {
    "steve": (V / "steve.png", (8, 8, 8, 8), (40, 8)), "alex": (V / "alex.png", (8, 8, 8, 8), (40, 8)),
    "zombie": (V / "zombie/zombie.png", (8, 8, 8, 8), (40, 8)), "skeleton": (V / "skeleton/skeleton.png", (8, 8, 8, 8), None),
    "wither_skeleton": (V / "skeleton/wither_skeleton.png", (8, 8, 8, 8), None), "creeper": (V / "creeper/creeper.png", (8, 8, 8, 8), None),
    "enderman": (V / "enderman/enderman.png", (8, 8, 8, 8), None), "blaze": (V / "blaze.png", (8, 8, 8, 8), None),
    "pig": (V / "pig/pig.png", (8, 8, 8, 8), None), "villager": (V / "villager/villager.png", (8, 8, 8, 10), None),
    "witch": (V / "witch.png", (8, 8, 8, 10), None), "iron_golem": (V / "iron_golem/iron_golem.png", (8, 8, 8, 10), None),
    "piglin": (V / "piglin/piglin.png", (8, 8, 10, 8), None), "adun": (R / "mod-src/textures/adun_villager/adun_villager.png", (8, 8, 8, 10), None),
}
for k, (f, (x, y, w, h), hat) in FACES.items():
    im = Image.open(f).convert("RGBA"); sc = 1
    face = im.crop((x * sc, y * sc, (x + w) * sc, (y + h) * sc))
    if k == "enderman":
        eyes = Image.open(V / "enderman/enderman_eyes.png").convert("RGBA").crop((x, y, x + w, y + h)); face.alpha_composite(eyes)
    if hat: face.alpha_composite(im.crop((hat[0] * sc, hat[1] * sc, (hat[0] + w) * sc, (hat[1] + h) * sc)))
    s = max(w, h); sq = Image.new("RGBA", (s, s), (0, 0, 0, 0)); sq.paste(face, ((s - w) // 2, (s - h) // 2))
    sq.resize((64, 64), Image.NEAREST).save(OUT / f"{k}.png")
print("av", len(FACES))
