"""Build individual, local PNG tab icons from the site's existing point assets.

Run: python3 tools/build_favicons.py
Only Pillow is required; ImageMagick renders the two checked-in SVG icons.
The 32px and 64px variants stay pixel-crisp on regular and HiDPI tabs.
"""
from __future__ import annotations

import io
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "assets/favicons"
SIZES = (32, 64)


def points():
    text = (ROOT / "shared/points.js").read_text(encoding="utf8")
    result = []
    for number, fields in re.findall(r"\{\s*n:\s*(\d+),([^\n}]+)\}", text):
        def field(key):
            m = re.search(rf"\b{key}:\s*\"([^\"]+)\"", fields)
            return m.group(1) if m else None
        if field("page"):
            result.append((int(number), field("page"), field("icon"), field("tone")))
    assert len(result) == 24 and all(icon for _, _, icon, _ in result), "Expected 24 point icons"
    return result


def read_icon(source: Path):
    if source.suffix.lower() == ".svg":
        out = subprocess.run(
            ["magick", "-background", "none", str(source), "-resize", "128x128", "PNG32:-"],
            check=True, capture_output=True,
        ).stdout
        return Image.open(io.BytesIO(out)).convert("RGBA")
    return Image.open(source).convert("RGBA")


def tab_icon(src: Image.Image, size: int, accent: str):
    color = tuple(bytes.fromhex(accent.lstrip("#"))[:3]) if accent else (119, 252, 0)
    icon = src.copy()
    # Trim transparent padding so thin objects (a katana or scroll) remain visible.
    bbox = icon.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if bbox:
        icon = icon.crop(bbox)
    available = size - max(5, size // 8)
    resample = Image.Resampling.NEAREST if max(icon.size) <= 256 else Image.Resampling.LANCZOS
    icon.thumbnail((available, available), resample)
    surface = Image.new("RGBA", (size, size), (22, 25, 30, 255))
    draw = ImageDraw.Draw(surface)
    # A shared dark frame makes the 24 individual mod items legible on light tabs.
    draw.rectangle((0, 0, size - 1, size - 1), outline=color + (255,), width=max(1, size // 32))
    surface.alpha_composite(icon, ((size - icon.width) // 2, (size - icon.height) // 2))
    return surface


def home_icon(size: int):
    # Pixel Z rather than a shrunk full-page logo: readable at browser-tab size.
    small = Image.new("RGBA", (16, 16), (20, 25, 30, 255))
    draw = ImageDraw.Draw(small)
    blue, lime = (56, 151, 255, 255), (171, 247, 99, 255)
    draw.rectangle((1, 1, 14, 14), outline=blue)
    draw.rectangle((3, 3, 12, 5), fill=blue)
    for y in range(6, 11):
        x = 12 - (y - 5) * 2
        draw.rectangle((x, y, x + 2, y), fill=lime)
    draw.rectangle((3, 11, 12, 13), fill=lime)
    return small.resize((size, size), Image.Resampling.NEAREST)


def set_links(page: Path, stem: str, relative: str):
    text = page.read_text(encoding="utf8")
    # Re-running the generator must not duplicate <link rel="icon"> entries.
    text = re.sub(r'<link\s+rel=["\']icon["\'][^>]*>\s*', "", text)
    links = "".join(
        f'<link rel="icon" type="image/png" sizes="{n}x{n}" href="{relative}{stem}-{n}.png">\n'
        for n in SIZES
    )
    marker = '<link rel="stylesheet"'
    assert marker in text, f"Missing stylesheet marker in {page}"
    text = text.replace(marker, links + marker, 1)
    page.write_text(text, encoding="utf8")


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        home_icon(size).save(DEST / f"home-{size}.png", optimize=True)
    set_links(ROOT / "index.html", "home", "assets/favicons/")
    for number, page, icon_path, tone in points():
        stem = f"p{number:02}"
        # The graphical MAX logo is much clearer in a tab than its 1024px item art.
        if number == 23:
            icon_path = "assets/textures/p23/max.svg"
        source = ROOT / icon_path
        assert source.is_file(), source
        image = read_icon(source)
        for size in SIZES:
            tab_icon(image, size, tone).save(DEST / f"{stem}-{size}.png", optimize=True)
        set_links(ROOT / page, stem, "../../assets/favicons/")
    print("Favicons: 25 pages × 32px and 64px; 50 local PNG assets")


if __name__ == "__main__":
    main()
