"""Gộp kết quả xác minh (verify_out.json) vào tools/bank/data/map_*.json.

python -I tools/bank/merge_verify.py <verify_out.json> tools/bank/data
"""
import sys, json, glob, os

src, data_dir = sys.argv[1], sys.argv[2]
V = {e["n"]: e for e in json.load(open(src, encoding="utf-8"))}
changed = []
for f in sorted(glob.glob(os.path.join(data_dir, "map_*.json"))):
    rows = json.load(open(f, encoding="utf-8"))
    for e in rows:
        v = V.get(e["n"])
        if not v:
            continue
        old = e.get("status")
        for k in ("mod", "status", "vi", "note", "source", "verified"):
            if k in v and v[k] not in (None, ""):
                e[k] = v[k]
        if e.get("status") == "ok":
            e.pop("note", None)
        if old != e.get("status"):
            changed.append(f'{e["n"]}: {old} -> {e["status"]}')
    json.dump(rows, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("merged", len(V), "status changes", len(changed))
print("\n".join(changed))
