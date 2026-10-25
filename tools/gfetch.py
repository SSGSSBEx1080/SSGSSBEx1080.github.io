"""python3 tools/gfetch.py <outdir> <name1> <name2> ... — ищет файлы по имени в папках java-пакета на Drive и качает."""
import sys, subprocess, re
from pathlib import Path
DIRS = ["1oIJS607-4ZCrM1q4qXsZQESfQm0RXzFl", "1uAKIf3G5xSg6k9WPvo5vUo_EyESpx_rV", "1Sdb2XE02cNY0XKxREDQn9rl9kHDrZks_", "18BBzdowJZeQUtA9lUexdvfE6k3QxJXeV", "13kZ81fAmLv9TLLQEYA1LGP6pFcAsXFOU",
        "1YUC7ZpASrP9SYxb4NHPMSb7opXhoMRdC", "10Nx8XzQKC6we2CUQvEVyf59-prWlnmfz", "1uGcut5dvZCOM8jArW81M49_lpUv1FUuY", "1O_FNF6r0gJ3nOUUS8z3euxx1-mJStNhl", "10BNK_UuuNNyyNbVR9e-Dbds2hQvDxhKv",
        "13YidLpf4xJdj8sC4fNT8ZMqQ1iMf9n0c", "11ndFMaf0o8u62XMABx_hz1WaFtHtiB7q", "1TVDVOyS-2A9K-SKQF98TDSOQWFbG_vpS"]
T = Path(__file__).parent
cache = T.parent / "mod-src" / ".index.txt"
if not cache.exists():
    lines = []
    for d in DIRS: lines += subprocess.run([sys.executable, str(T / "gdrive.py"), "ls", d], capture_output=True, text=True).stdout.splitlines()
    cache.write_text("\n".join(lines))
idx = {}
for l in cache.read_text().splitlines():
    p = l.split(None, 2)
    if len(p) == 3 and p[0] == "file": idx[p[2]] = p[1]
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
for n in sys.argv[2:]:
    if n not in idx: print("NOT FOUND", n); continue
    subprocess.run([sys.executable, str(T / "gdrive.py"), "get", idx[n], str(out / n)], capture_output=True); print("ok", n)
