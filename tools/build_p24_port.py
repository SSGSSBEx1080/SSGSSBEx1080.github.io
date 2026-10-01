"""Fallback 16×16 charging-port surfaces made from actual vanilla Minecraft
1.19.2 iron/redstone textures. NOT an original ZitraksMode block texture:
the charging_port blockstate/model/PNG are absent from the supplied sources.
python3 tools/build_p24_port.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / 'assets/textures/mc/p2'
OUT = ROOT / 'assets/textures/p24'
iron = Image.open(BASE / 'block_iron_block.png').convert('RGB')
redstone = Image.open(BASE / 'block_redstone_block.png').convert('RGB')
assert iron.size == redstone.size == (16, 16)

side = iron.copy(); d = ImageDraw.Draw(side)
d.rectangle((0, 0, 15, 1), fill='#444d53')
d.rectangle((0, 14, 15, 15), fill='#444d53')
d.rectangle((1, 3, 14, 12), outline='#414a53', width=1)
d.rectangle((3, 5, 12, 10), fill='#1b343c')
d.rectangle((4, 6, 11, 9), fill='#215862')
d.rectangle((5, 7, 10, 8), fill='#76eddd')
for x in (2, 13):
    d.point((x, 2), fill='#1a2d30'); d.point((x, 13), fill='#1a2d30')
side.save(OUT / 'charging_port_side.png')

top = redstone.copy(); d = ImageDraw.Draw(top)
d.rectangle((0, 0, 15, 15), outline='#3a2225', width=2)
d.rectangle((3, 3, 12, 12), fill='#263841')
d.rectangle((4, 4, 11, 11), outline='#869ca1', width=1)
d.rectangle((6, 3, 9, 12), fill='#5ae2d0')
d.rectangle((3, 6, 12, 9), fill='#5ae2d0')
d.rectangle((6, 6, 9, 9), fill='#1a454a')
top.save(OUT / 'charging_port_top.png')
print('16x16 Minecraft port reconstruction generated from vanilla iron/redstone textures')
