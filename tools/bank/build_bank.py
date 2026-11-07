"""Đóng gói ngân hàng câu hỏi -> content/questions/bank.js + assets/bank/*.jpg

python -I build_bank.py <questions.json> <map_dir> <img_dir> <project_root>
"""
import sys, os, re, json, html, shutil, glob

src, map_dir, img_dir, root = sys.argv[1:5]
Q = json.load(open(src, encoding="utf-8"))
M = {}
for f in sorted(glob.glob(os.path.join(map_dir, "map_*.json"))):
    try:
        for e in json.load(open(f, encoding="utf-8")):
            M[e["n"]] = e
    except Exception as ex:
        print("skip", f, ex)

out_img = os.path.join(root, "assets", "bank")
os.makedirs(out_img, exist_ok=True)

URL = re.compile(r"(https?://[^\s<]+)")
END = re.compile(r"[.?!:;)\]]$")

def fmt(t):
    t = html.escape(t, quote=False)
    return URL.sub(lambda m: f'<a href="{m.group(1)}" target="_blank" rel="noopener">{m.group(1)}</a>', t)

def blocks_html(parts):
    """Gộp các dòng bị ngắt (wrap) thành đoạn, ảnh thành <img>."""
    paras, out = [], []
    for b in parts:
        if "img" in b:
            paras.append(("img", b["img"]))
            continue
        t = b["p"].strip()
        if not t:
            continue
        if paras and paras[-1][0] == "p":
            prev = paras[-1][1]
            starts_new = re.match(r"^([A-H]\.|\d+\.|[-•●]|Note:|NOTE:|Reference|Explanation|Solution:|Box \d|Step \d|Incorrect|Correct)", t)
            if not END.search(prev) and len(prev) > 50 and not starts_new:
                paras[-1] = ("p", prev + " " + t)
                continue
        paras.append(("p", t))
    for kind, v in paras:
        if kind == "img":
            shutil.copyfile(os.path.join(img_dir, v), os.path.join(out_img, v))
            out.append(f'<img src="assets/bank/{v}" alt="Hình minh họa" loading="lazy">')
        else:
            out.append(f"<p>{fmt(v)}</p>")
    return "".join(out)

items, missing = [], 0
for r in Q:
    n = r["n"]
    m = M.get(n)
    if not m:
        missing += 1
    t = r["type"]
    if t == "other":
        t = "hotspot"
    it = {
        "id": f"D{n:03d}", "n": n, "src": "bank", "type": t,
        "q": blocks_html(r["body"]),
        "explain": blocks_html(r["explain"]),
    }
    if m:
        it["mod"] = m["mod"]
        it["status"] = m.get("status", "ok")
        if m.get("vi"): it["vi"] = m["vi"]
        if m.get("note"): it["note"] = m["note"]
        if m.get("source"): it["source"] = m["source"]
        if m.get("verified"): it["verified"] = True
    if t in ("mcq", "yesno") and r["options"]:
        letters = [o[0] for o in r["options"]]
        it["options"] = [fmt(o[1]) for o in r["options"]]
        it["answer"] = [letters.index(l) for l in r["answerLetters"] if l in letters]
    else:
        it["answerHtml"] = blocks_html(r["answerParts"])
    items.append(it)

js = "/* Ngân hàng câu hỏi luyện thi (trích từ PDF của người dùng, chỉ dùng cá nhân). Sinh tự động bởi build_bank.py */\n"
js += "AZ.addQuestions(" + json.dumps(items, ensure_ascii=False, separators=(",", ":")) + ");\n"
os.makedirs(os.path.join(root, "content", "questions"), exist_ok=True)
open(os.path.join(root, "content", "questions", "bank.js"), "w", encoding="utf-8").write(js)
from collections import Counter
print("questions", len(items), "mapped", len(items) - missing, "unmapped", missing)
print(Counter(i["type"] for i in items), Counter(i.get("status", "-") for i in items))
print("bank.js KB", round(len(js.encode("utf-8")) / 1024))
