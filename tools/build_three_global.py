#!/usr/bin/env python3
"""Собирает classic-скрипт three.js (window.THREE) вместо ES-модулей.

Зачем: Chrome блокирует ES-модули из file:// (origin 'null' -> CORS),
поэтому 3D на 8 страницах не работал при открытии с диска.
three.core.js + three.module.js склеиваются в один IIFE:
  - core отдаёт свой namespace через внутренний IIFE;
  - module получает нужные имена из core деструктуризацией.

Запуск: python3 tools/build_three_global.py
Результат: shared/vendor/three/three.global.js
"""
import re
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
VEND = ROOT / "shared" / "vendor" / "three"
CORE = VEND / "three.core.js"
MOD = VEND / "three.module.js"
OUT = VEND / "three.global.js"

EXPORT_RE = re.compile(r"^export \{([^}]*)\}(?: from '[^']*')?;", re.M | re.S)


def names(block: str):
    out = []
    for m in EXPORT_RE.finditer(block):
        out.extend(x.strip() for x in m.group(1).split(",") if x.strip())
    return out


def main():
    core = CORE.read_text(encoding="utf8")
    mod = MOD.read_text(encoding="utf8")

    # --- core: убираем export-блок, получаем namespace ---
    core_exports = names(core)
    core_body = EXPORT_RE.sub("", core)

    # --- module: убираем import из core и оба export-блока ---
    imp_m = re.search(r"^import \{([^}]*)\} from '\./three\.core\.js';", mod, re.M | re.S)
    imported = [x.strip() for x in imp_m.group(1).split(",") if x.strip()]

    mod_blocks = list(EXPORT_RE.finditer(mod))
    assert len(mod_blocks) == 2, f"ожидалось 2 export-блока, найдено {len(mod_blocks)}"
    reexport = [x.strip() for x in mod_blocks[0].group(1).split(",") if x.strip()]
    final = [x.strip() for x in mod_blocks[1].group(1).split(",") if x.strip()]

    mod_body = EXPORT_RE.sub("", mod)
    mod_body = re.sub(r"^import \{[^}]*\} from '\./three\.core\.js';", "", mod_body, flags=re.M | re.S)

    # имена, которые module использует из core
    needed = sorted(set(imported))

    # проверяем, что локальные декларации module не перебивают импортируемые
    local = set(re.findall(r"^(?:const|let|var|function|class|async function)\s+([A-Za-z_$][\w$]*)", mod_body, re.M))
    clash = local & set(needed)
    assert not clash, f"конфликт имён в module: {sorted(clash)}"

    core_ns = ", ".join(f"{n}: {n}" for n in sorted(set(core_exports)))
    mod_ns = ", ".join(f"{n}: {n}" for n in final)
    destr = ", ".join(needed)
    out = f"""/* three.js r180 — classic-сборка для file://.
 * Сгенерировано tools/build_three_global.py из three.core.js + three.module.js.
 * ES-модули Chrome не грузит с диска (CORS, origin 'null'); эта сборка
 * кладёт полный namespace в window.THREE и работает и из file://, и по http.
 * Лицензия three.js: MIT (см. LICENSE рядом).
 */
(function (global) {{
  'use strict';

  var __CORE = (function () {{
{core_body}
    return {{
{core_ns}
    }};
  }})();

  var __MOD = (function () {{
    var __c = __CORE;
    var {{ {destr} }} = __c;
{mod_body}
    return {{
{mod_ns}
    }};
  }})();

  var THREE = {{}};
  for (var k in __CORE) {{ if (Object.prototype.hasOwnProperty.call(__CORE, k)) THREE[k] = __CORE[k]; }}
  for (var k2 in __MOD) {{ if (Object.prototype.hasOwnProperty.call(__MOD, k2)) THREE[k2] = __MOD[k2]; }}
  global.THREE = THREE;
}})(typeof window !== 'undefined' ? window : this);
"""
    OUT.write_text(out, encoding="utf8")
    print(f"записан {OUT.relative_to(ROOT)}  ({OUT.stat().st_size/1024:.0f} КБ)")
    print(f"core: {len(set(core_exports))} имён, module: {len(final)} имён, импортировано из core: {len(needed)}")
    print(f"reexport из core: {len(reexport)}")


if __name__ == "__main__":
    main()
