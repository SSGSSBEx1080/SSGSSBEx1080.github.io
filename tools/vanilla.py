"""Ванильная база Minecraft 1.19.2 (ВСЕ текстуры + модели блоков/предметов из client.jar).
Хранится одним архивом assets/vanilla/vanilla-1.19.2.zip (5591 файл в одном, чтобы не раздувать проект).
base() -> папка с распакованной базой: если лежит распакованная assets/vanilla/1.19.2/ — берём её,
иначе один раз распаковываем архив во временную папку системы (в проект ничего не пишется)."""
import tempfile, zipfile
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
ZIP = ROOT / "assets" / "vanilla" / "vanilla-1.19.2.zip"


def base():
    d = ROOT / "assets" / "vanilla" / "1.19.2"
    if d.exists():
        return d
    t = Path(tempfile.gettempdir()) / "zm-vanilla-1.19.2"
    if not (t / "textures").exists():
        if not ZIP.exists():
            raise SystemExit("нет assets/vanilla/vanilla-1.19.2.zip: запусти python3 tools/get_vanilla.py")
        zipfile.ZipFile(ZIP).extractall(t)
    return t
