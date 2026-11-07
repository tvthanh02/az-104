"""Tách PDF câu hỏi AZ-104 thành JSON có cấu trúc + ảnh minh họa.

python -I parse.py <pdf> <out_json> <img_dir>
"""
import sys, re, json, os, html
import fitz

src, out_json, img_dir = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(img_dir, exist_ok=True)
doc = fitz.open(src)

def is_frame(r, pw):
    # Khung nền: ảnh có độ rộng pixel đúng 557/535 và nằm sát lề trái
    return (pw in (557, 535)) and ((abs(r.x0 - 20) < 3 and abs(r.width - 557) < 3) or (abs(r.x0 - 31) < 3 and abs(r.width - 535) < 3))

# ---- 1. Gom block text + ảnh theo thứ tự đọc ----
items = []
for pi in range(3, len(doc)):
    page = doc[pi]
    for b in page.get_text("blocks"):
        if b[6] != 0:
            continue
        t = b[4].replace("\t", " ").replace(" ", " ")
        lines = [l.strip() for l in t.split("\n")]
        lines = [l for l in lines if l and l not in ("Deep Dumps", "Deep", "Dumps")]
        if not lines:
            continue
        items.append(("t", pi, b[1], b[0], lines))
    seen = set()
    for im in page.get_images(full=True):
        for r in page.get_image_rects(im[0]):
            key = (round(r.x0), round(r.y0), round(r.width), round(r.height))
            if is_frame(r, im[2]) or r.width < 60 or r.height < 18 or key in seen:
                continue
            seen.add(key)
            items.append(("i", pi, r.y0, r.x0, r))
items.sort(key=lambda x: (x[1], x[2], x[3]))

# Bỏ ảnh nằm lọt trong ảnh khác (cùng trang)
def contained(a, b):
    return a.x0 >= b.x0 - 1 and a.y0 >= b.y0 - 1 and a.x1 <= b.x1 + 1 and a.y1 <= b.y1 + 1 and a != b
imgs_by_page = {}
for it in items:
    if it[0] == "i":
        imgs_by_page.setdefault(it[1], []).append(it[4])
items = [it for it in items if it[0] != "i" or not any(contained(it[4], o) for o in imgs_by_page[it[1]])]

# ---- 2. Tách câu ----
QRE = re.compile(r"^Question:\s*(\d+)$")
questions = []
cur = None
for it in items:
    if it[0] == "t":
        lines = it[4]
        m = QRE.match(lines[0])
        if m:
            cur = {"n": int(m.group(1)), "parts": {"q": [], "a": [], "e": []}, "state": "q"}
            questions.append(cur)
            lines = lines[1:]
            if not lines:
                continue
        if cur is None:
            continue
        joined = " ".join(lines)
        if cur["state"] == "q" and re.match(r"^Answer\s*:", joined):
            cur["state"] = "a"
            rest = re.sub(r"^Answer\s*:\s*", "", joined)
            if rest:
                cur["parts"]["a"].append(("t", rest))
            continue
        if cur["state"] in ("q", "a") and re.match(r"^Explanation\s*:", joined):
            cur["state"] = "e"
            rest = re.sub(r"^Explanation\s*:\s*", "", joined)
            if rest:
                cur["parts"]["e"].append(("t", rest))
            continue
        cur["parts"][cur["state"]].append(("t", joined))
    else:
        if cur is None:
            continue
        cur["parts"][cur["state"]].append(("i", it[1], it[4]))

# ---- 3. Xuất ảnh + chuẩn hóa ----
OPT = re.compile(r"^([A-H])\.\s*(.*)$")
counter = {}
def save_img(n, pi, rect):
    k = counter.get(n, 0) + 1
    counter[n] = k
    name = f"q{n:03d}_{k}.jpg"
    pix = doc[pi].get_pixmap(clip=rect, dpi=144)
    pix.save(os.path.join(img_dir, name), jpg_quality=82)
    return name

def to_html(parts, n, with_opts):
    out, opts, images = [], [], []
    pending_letter = None
    for p in parts:
        if p[0] == "i":
            name = save_img(n, p[1], p[2])
            images.append(name)
            out.append({"img": name})
            continue
        txt = p[1]
        if with_opts:
            if pending_letter:
                opts.append([pending_letter, txt]); pending_letter = None; continue
            m = OPT.match(txt)
            if m:
                if m.group(2):
                    opts.append([m.group(1), m.group(2)])
                else:
                    pending_letter = m.group(1)
                continue
        out.append({"p": txt})
    return out, opts, images

result = []
for q in questions:
    n = q["n"]
    body, opts, _ = to_html(q["parts"]["q"], n, True)
    ans, _, _ = to_html(q["parts"]["a"], n, False)
    exp, _, _ = to_html(q["parts"]["e"], n, False)
    text_q = " ".join(b.get("p", "") for b in body)
    ans_text = " ".join(b.get("p", "") for b in ans).strip()
    letters = []
    if opts and ans_text and re.fullmatch(r"[A-H](\s*[,&and ]*\s*[A-H])*", ans_text.replace(" ", "") or "x") is None:
        pass
    m = re.fullmatch(r"\s*([A-H](?:[\s,&]*(?:and\s+)?[A-H])*)\s*\.?\s*", ans_text)
    if m:
        letters = re.findall(r"[A-H]", m.group(1))
    if "HOTSPOT" in text_q:
        qtype = "hotspot"
    elif "DRAG DROP" in text_q:
        qtype = "dragdrop"
    elif opts and letters:
        qtype = "yesno" if [o[1] for o in opts][:2] == ["Yes", "No"] else "mcq"
    else:
        qtype = "other"
    result.append({
        "n": n, "type": qtype, "body": body, "options": opts,
        "answerLetters": letters, "answerParts": ans, "explain": exp,
        "case": bool(re.search(r"case study", text_q, re.I)),
    })

json.dump(result, open(out_json, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
from collections import Counter
print("questions", len(result), "unique n", len({r["n"] for r in result}))
print(Counter(r["type"] for r in result))
print("images", sum(counter.values()))
missing = sorted(set(range(1, max(r["n"] for r in result) + 1)) - {r["n"] for r in result})
print("missing numbers", missing[:30])
bad = [r["n"] for r in result if r["type"] == "other"]
print("other", len(bad), bad[:40])
