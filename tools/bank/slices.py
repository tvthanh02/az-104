"""Tạo các file input gọn cho agent phân loại: slice_<k>.json"""
import json, sys, os
src, out_dir, k = sys.argv[1], sys.argv[2], int(sys.argv[3])
R = json.load(open(src, encoding="utf-8"))

def txt(parts):
    return " ".join(("[IMAGE]" if "img" in b else b["p"]) for b in parts)

rows = []
for r in R:
    rows.append({
        "n": r["n"], "type": r["type"],
        "question": txt(r["body"])[:2500],
        "options": [f"{l}. {t}" for l, t in r["options"]],
        "answer": ",".join(r["answerLetters"]) or txt(r["answerParts"]),
        "explanation": txt(r["explain"])[:1500],
    })
size = -(-len(rows) // k)
for i in range(k):
    part = rows[i * size:(i + 1) * size]
    json.dump(part, open(os.path.join(out_dir, f"slice_{i + 1}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(i + 1, part[0]["n"], "-", part[-1]["n"], len(part))
