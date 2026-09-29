"""Скачивает официальный client.jar Minecraft 1.19.2 у Mojang и складывает ВСЕ ванильные текстуры и модели блоков/предметов
в один архив assets/vanilla/vanilla-1.19.2.zip (textures/..., models/...). Скрипты берут оттуда нужное через tools/vanilla.py.
Запуск: python3 tools/get_vanilla.py"""
import io, json, urllib.request, zipfile
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
ZIP = ROOT / "assets" / "vanilla" / "vanilla-1.19.2.zip"
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=60).read()
man = json.loads(get("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json"))
ver = json.loads(get(next(v["url"] for v in man["versions"] if v["id"] == "1.19.2")))
jar = zipfile.ZipFile(io.BytesIO(get(ver["downloads"]["client"]["url"])))
ZIP.parent.mkdir(parents=True, exist_ok=True)
n = 0
with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for name in jar.namelist():
        if name.startswith(("assets/minecraft/textures/", "assets/minecraft/models/")) and not name.endswith("/"):
            z.writestr(name[len("assets/minecraft/"):], jar.read(name)); n += 1
print("файлов (текстуры + модели):", n, "->", ZIP)
