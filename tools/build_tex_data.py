#!/usr/bin/env python3
"""Собирает data:URI-пакет текстур для WebGL-страниц.

Зачем: из file:// картинка, подставленная в WebGL-текстуру, считается
кросс-доменной -> texImage2D падает с "cross-origin data". Рабочий
способ (его же использует p25) — грузить текстуру как data: URI.

Скрипт собирает один файл data/tex_data.js:
    window.ZM_TEX = { '<ключ>': 'data:image/png;base64,...' };
Ключи — пути относительно assets/textures/ и без расширения. Страницы
берут текстуру через
    ZM.tex('p28/medusa.png')  ->  data URI, иначе обычный путь.

Список текстур НЕ выписывается руками: скрипт сам обходит код
WebGL-страниц, вылавливает все литералы путей к картинкам и берёт их
в пакет. Динамические пути (нумерованные стадии разрушения и т.п.)
перечислены в EXTRA.

Запуск: python3 tools/build_tex_data.py [файл1 ...]
"""
import base64
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TEX = ROOT / "assets" / "textures"
OUT = ROOT / "data" / "tex_data.js"

# страницы, где есть WebGL и которым нужен пакет
WEBGL_PAGES = [
    "24-scooter", "26-vacuum", "27-chigur", "28-medusa",
    "29-sandevistan", "g2-kroliki", "g3-blizost", "g4-nina",
]

# динамические пути, которых нет в коде литералом
EXTRA = [
    # g4: трещины разрушения блока (10 состояний)
    "mc/destroy_stage_0.png", "mc/destroy_stage_1.png", "mc/destroy_stage_2.png",
    "mc/destroy_stage_3.png", "mc/destroy_stage_4.png", "mc/destroy_stage_5.png",
    "mc/destroy_stage_6.png", "mc/destroy_stage_7.png", "mc/destroy_stage_8.png",
    "mc/destroy_stage_9.png",
    # g4: куст земляники (3 стадии)
    "mc/van/sweet_berry_bush_stage0.png", "mc/van/sweet_berry_bush_stage1.png",
    "mc/van/sweet_berry_bush_stage2.png",
    # p27: текстуры предметов по item-ID из p27_items.js
    "p27/chigur_shotgun.png", "p27/chigur_coin.png",
    "p27/coin_face.png", "p27/coin_back.png",
    # p24: зарядная станция (собирается из блоков)
    "p24/station/cobblestone.png", "p24/station/iron_bars.png",
    "p24/station/iron_block.png", "p24/station/lantern.png",
    "p24/station/light_gray_concrete.png", "p24/station/oak_planks.png",
    "p24/station/oak_sign.png", "p24/station/polished_andesite.png",
    "p24/station/polished_diorite.png", "p24/station/stone_bricks.png",
    "p24/station/tuff.png",
]

# литералы путей в коде: ищем всё, что похоже на путь к картинке
PATH_RE = re.compile(
    r"['\"`]\s*((?:\.\./\.\./)?assets/textures/[A-Za-z0-9_./-]*"
    r"(?:\$\{[^}]*\})?[A-Za-z0-9_./-]*\.(?:png|jpg|jpeg))\s*['\"`]"
)
# относительные литералы вида 'mc/van/purpur_block.png' — склеиваются с префиксом
REL_RE = re.compile(
    r"['\"`]((?:mc|p\d+|guest|hub)/[A-Za-z0-9_./-]*\.(?:png|jpg|jpeg))['\"`]"
)
# «хвост» пути: всё, что идёт после assets/textures/ и заканчивается на _ или /
TAIL_RE = re.compile(r"assets/textures/([A-Za-z0-9_./-]*[_/])['\"]")


def key_of(rel: str) -> str:
    """Ключ в карте: путь без расширения относительно assets/textures/."""
    r = rel.replace("\\", "/")
    if r.startswith("assets/textures/"):
        r = r[len("assets/textures/"):]
    r = re.sub(r"^(?:\.\./)+", "", r)
    return re.sub(r"\.(?:png|jpg|jpeg)$", "", r)


# строки, где картинка реально уходит в WebGL (загрузчик текстур)
WEBGL_LINE = re.compile(
    r"ZM\.tex\s*\(|loadAsync\s*\(|\.load\s*\(|texOf2?\s*\(|new\s+T\.TextureLoader"
    r"|new\s+THREE\.TextureLoader|TextureLoader\s*\("
)
# литералы путей в строке
LIT_RE = re.compile(
    r"['\"`]((?:\.\./\.\./)?assets/textures/[A-Za-z0-9_./-]*"
    r"(?:\$\{[^}]*\})?[A-Za-z0-9_./-]*\.(?:png|jpg|jpeg))['\"`]"
)
# относительные литералы вида 'mc/van/purpur_block.png' — склеиваются с префиксом
REL_RE = re.compile(
    r"['\"`]((?:mc|p\d+|guest|hub)/[A-Za-z0-9_./-]*\.(?:png|jpg|jpeg))['\"`]"
)
# «хвост» пути: всё, что идёт после assets/textures/ и заканчивается на _ или /
TAIL_RE = re.compile(r"assets/textures/([A-Za-z0-9_./-]*[_/])['\"]")


def scan() -> set:
    """Обходит код WebGL-страниц и собирает пути к картинкам.

    Учитывает три формы:
      * абсолютный литерал  '../../assets/textures/p28/medusa.png'
      * относительный литерал 'mc/van/purpur_block.png' (к префиксу A)
      * склейка  '../../assets/textures/p24/charging_port_' + 'front.png'
        — для таких собираем «хвост» префикса и подставляем glob.

    Берём ВСЕ литералы из JS этих страниц, а не только из строк с
    загрузчиком: текстуры часто грузятся через собственные обёртки
    (texture(...), texOf(...), modTexture(...)), и такие вызовы стоят
    в другой строке, чем определение обёртки. Лишние текстуры в
    пакете не мешают, а пропущенные ломают 3D.
    """
    found = set()
    tails = set()
    for page in WEBGL_PAGES:
        d = ROOT / "pages" / page
        if not d.is_dir():
            continue
        for f in list(d.glob("*.js")):
            s = f.read_text(encoding="utf8", errors="ignore")
            for m in LIT_RE.finditer(s):
                found.add(m.group(1))
            for m in REL_RE.finditer(s):
                found.add(m.group(1))
            for m in TAIL_RE.finditer(s):
                tails.add(m.group(1))
    # хвосты: 'p24/station/' -> все файлы в этой папке,
    #          'p24/charging_port_' -> все файлы с таким началом
    for t in tails:
        base = TEX / t
        if base.is_dir():
            for p in base.glob("*"):
                if p.suffix.lower() in (".png", ".jpg", ".jpeg"):
                    found.add(str(p.relative_to(TEX)))
        else:
            # префикс: 'p24/charging_port_' -> все файлы, начинающиеся с него
            for p in TEX.glob(t.rstrip("/") + "*"):
                if p.suffix.lower() in (".png", ".jpg", ".jpeg"):
                    found.add(str(p.relative_to(TEX)))
    return found


def main():
    extra = list(sys.argv[1:])
    rels = set(EXTRA) | set(extra) | scan()

    entries = {}
    missing = []
    for rel in sorted(rels):
        rel = rel.replace("\\", "/")
        rel = re.sub(r"^(?:\.\./)+", "", rel)
        if rel.startswith("assets/textures/"):
            rel = rel[len("assets/textures/"):]
        if "${" in rel:
            continue
        p = TEX / rel
        if not p.exists():
            missing.append(rel)
            continue
        raw = p.read_bytes()
        mime = "image/jpeg" if p.suffix.lower() in (".jpg", ".jpeg") else "image/png"
        entries[key_of(rel)] = f"data:{mime};base64," + base64.b64encode(raw).decode("ascii")

    lines = []
    lines.append("/* Текстуры WebGL-страниц в data:URI — чтобы 3D работал из file://.")
    lines.append(" * Сгенерировано tools/build_tex_data.py. Не редактировать руками.")
    lines.append(" */")
    lines.append("window.ZM = window.ZM || {};")
    lines.append("window.ZM_TEX = {")
    for k in sorted(entries):
        lines.append(f'  "{k}": "{entries[k]}",')
    lines.append("};")
    lines.append("""/* Достаёт текстуру: сначала data:URI из пакета, иначе обычный путь. */
(function () {
  var MAP = window.ZM_TEX || {};
  window.ZM.tex = function (path) {
    if (!path) return path;
    var s = String(path).replace(/\\\\/g, "/");
    var i = s.indexOf("assets/textures/");
    if (i >= 0) s = s.slice(i + "assets/textures/".length);
    s = s.replace(/^\\.\\.\\//g, "").replace(/^\\.\\//g, "");
    s = s.replace(/\\.(png|jpg|jpeg)$/i, "");
    var hit = MAP[s];
    return hit || path;
  };
})();""")
    OUT.write_text("\n".join(lines) + "\n", encoding="utf8")
    size = OUT.stat().st_size / 1024
    print(f"записан {OUT.relative_to(ROOT)} ({size:.0f} КБ), текстур: {len(entries)}")
    if missing:
        print("НЕТ ФАЙЛА:", missing)


if __name__ == "__main__":
    main()
