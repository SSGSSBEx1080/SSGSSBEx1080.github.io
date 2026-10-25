#!/usr/bin/env python3
"""Переводит 3D-сцены с ES-модулей на classic-скрипты (window.THREE).

Причина: Chrome не грузит ES-модули из file:// (origin 'null' -> CORS),
а требование проекта — сайт работает с диска, включая 3D.

Что делает:
  * pages/*/scene3d.js и прочие *.js с `import ... from '.../three.module.js'`
    получают строку `const THREE = window.THREE;` вместо import;
  * `import { MODELS } from '../../shared/entity_models.js'` ->
    `const MODELS = window.ZM_MODELS;`;
  * в index.html: <script type="module" src="..."> -> <script src="...">,
    и перед ними подключается three.global.js;
  * shared/entity_models.js: export const MODELS -> window.ZM_MODELS (плюс
    остаётся export-форма для модульных потребителей).

Запуск: python3 tools/de_module.py
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
THREE_GLOBAL = "../../shared/vendor/three/three.global.js"

# страницы, где 3D был на ES-модулях
PAGES = ["24-scooter", "26-vacuum", "27-chigur", "28-medusa",
         "29-sandevistan", "g2-kroliki", "g3-blizost", "g4-nina"]


def convert_js(path: pathlib.Path):
    src = path.read_text(encoding="utf8")
    orig = src
    out = []

    for line in src.split("\n"):
        s = line.strip()
        # import * as THREE from '.../three.module.js';
        m = re.match(r"^import\s+\*\s+as\s+(\w+)\s+from\s+['\"][^'\"]*three\.module\.js['\"];?$", s)
        if m:
            out.append(f"const {m.group(1)} = window.THREE;")
            continue
        # import { MODELS } from '.../entity_models.js';
        m = re.match(r"^import\s*\{\s*(\w+)\s*\}\s*from\s+['\"][^'\"]*entity_models\.js['\"];?$", s)
        if m:
            out.append(f"const {m.group(1)} = window.ZM_MODELS;")
            continue
        # import { X, Y } from './local.js';  -> window.P27_ITEM_MODEL.*
        m = re.match(r"^import\s*\{([^}]*)\}\s*from\s+['\"]\./([\w-]+)\.js['\"];?$", s)
        if m:
            names = [x.strip() for x in m.group(1).split(",") if x.strip()]
            for name in names:
                out.append(f"const {name} = window.P27_ITEM_MODEL.{name};")
            continue
        out.append(line)

    src = "\n".join(out)
    if src != orig:
        path.write_text(src, encoding="utf8")
        return True
    return False


def convert_html(path: pathlib.Path, three_rel: str):
    src = path.read_text(encoding="utf8")
    orig = src
    # убрать type="module" у scene-скриптов
    src = re.sub(r'<script type="module" src="([^"]+)"></script>',
                 r'<script src="\1"></script>', src)
    # перед первым таким скриптом (или в конце блока) подключить three.global.js
    if "three.global.js" not in src:
        m = re.search(r'<script src="([^"]*scene3d\.js[^"]*)"></script>', src)
        if not m:
            m = re.search(r'<script src="([^"]*item\.js[^"]*)"></script>', src)
        if not m:
            m = re.search(r'<script src="([^"]*station3d\.js[^"]*)"></script>', src)
        if not m:
            m = re.search(r'<script src="([^"]*ritual3d\.js[^"]*)"></script>', src)
        if not m:
            m = re.search(r'<script src="([^"]*chamber3d\.js[^"]*)"></script>', src)
        if m:
            tag = f'<script src="{three_rel}"></script>'
            src = src[:m.start()] + tag + src[m.start():]
    if src != orig:
        path.write_text(src, encoding="utf8")
        return True
    return False


def main():
    changed = []
    for page in PAGES:
        d = ROOT / "pages" / page
        # 1. HTML
        html = d / "index.html"
        if html.exists():
            # глубина до shared/ = ../../ для pages/<page>
            rel = "../../shared/vendor/three/three.global.js"
            if convert_html(html, rel):
                changed.append(str(html.relative_to(ROOT)))
        # 2. JS-файлы страницы
        for js in sorted(d.glob("*.js")):
            if convert_js(js):
                changed.append(str(js.relative_to(ROOT)))

    # 3. shared/entity_models.js -> window.ZM_MODELS
    em = ROOT / "shared" / "entity_models.js"
    src = em.read_text(encoding="utf8")
    if "export const MODELS" in src and "window.ZM_MODELS" not in src:
        src = src.replace(
            "export const MODELS = {",
            "const MODELS = {",
            1)
        # добавить присваивание в глобал в конце файла
        src += "\nwindow.ZM_MODELS = MODELS;\n"
        em.write_text(src, encoding="utf8")
        changed.append(str(em.relative_to(ROOT)))

    # 4. pages/27-chigur/item-model.js: экспорты -> window.P27_ITEM_MODEL
    im = ROOT / "pages" / "27-chigur" / "item-model.js"
    src = im.read_text(encoding="utf8")
    if "export { THREE };" in src or "export async function" in src:
        src = src.replace("export { THREE };", "")
        src = re.sub(r"^export\s+(async\s+)?(function|const|let|class)\s+", r"\1\2 ", src, flags=re.M)
        src += "\nwindow.P27_ITEM_MODEL = { faceUV, elementMatrix, buildItem, makeItemView };\n"
        im.write_text(src, encoding="utf8")
        changed.append(str(im.relative_to(ROOT)))

    # 5. файлы, которые раньше подтягивал модульный граф, — подключаем явно
    EXTRA = {
        "27-chigur": [("item-model.js", "item.js")],   # перед item.js
        "g2-kroliki": [("../../shared/entity_models.js", "scene3d.js")],
        "g4-nina": [("../../shared/entity_models.js", "scene3d.js")],
    }
    for page, pairs in EXTRA.items():
        html = ROOT / "pages" / page / "index.html"
        src = html.read_text(encoding="utf8")
        orig = src
        for extra, before in pairs:
            if extra in src:
                continue
            tag = f'<script src="{extra}"></script>'
            idx = src.find(before)
            if idx == -1:
                # ставим в конец блока скриптов
                idx = src.rfind("</body>")
                src = src[:idx] + tag + "\n" + src[idx:]
            else:
                # перед скриптом, который зависит
                start = src.rfind("<script", 0, idx)
                src = src[:start] + tag + src[start:]
        if src != orig:
            html.write_text(src, encoding="utf8")
            changed.append(str(html.relative_to(ROOT)))

    for c in changed:
        print("изменён:", c)
    print("итого:", len(changed))


if __name__ == "__main__":
    main()
