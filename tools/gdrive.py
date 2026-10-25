"""Google Drive (публичная папка): python3 tools/gdrive.py ls <folder_id>  |  get <file_id> <out>"""
import sys, re, time, urllib.request, html
UA = {"User-Agent": "Mozilla/5.0"}
def fetch(url, tries=5):
    for i in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
        except Exception as e:
            if i == tries - 1: raise
            time.sleep(1.5 * (i + 1))
def ls(fid):
    t = fetch(f"https://drive.google.com/embeddedfolderview?id={fid}").decode("utf8", "replace")
    out = []
    for m in re.finditer(r'<div class="flip-entry" id="entry-([^"]+)".*?<div class="flip-entry-title">(.*?)</div>', t, re.S):
        eid, name = m.group(1), html.unescape(m.group(2))
        kind = "dir" if "folders/" + eid in t else "file"
        out.append((kind, eid, name))
    return out
if __name__ == "__main__":
    if sys.argv[1] == "ls":
        for k, i, n in ls(sys.argv[2]): print(k, i, n, sep="\t")
    elif sys.argv[1] == "get":
        d = fetch(f"https://drive.google.com/uc?export=download&id={sys.argv[2]}")
        if b"confirm=" in d[:5000] and b"<html" in d[:200].lower():
            m = re.search(rb'name="uuid" value="([^"]+)"', d)
            d = fetch(f"https://drive.usercontent.google.com/download?id={sys.argv[2]}&export=download&confirm=t" + (f"&uuid={m.group(1).decode()}" if m else ""))
        open(sys.argv[3], "wb").write(d); print(len(d), "bytes")
