#!/usr/bin/env python3
"""Look for quicker wins: for every scenario that already has a winning variant, try more
variants and keep the one that mates soonest (the plies left under the 200-ply cap are the
competition's tie-break).

A game that runs past the scenario's best win so far cannot improve it, so each game is
played with the env's ply cap set just under that best: it is cut there and recorded as
"capped" (tried, no use).  Rounds: each round plays one new variant on every scenario,
longest wins first, then the bests are read again.

usage: improve.py --engine engine.py [--opps a,b] [--variants 0-35] [--rounds N] [--jobs 4]
                  [--min-plies P] [--db FILE] [--hours H]
"""
import argparse, hashlib, json, os, re, sys, tempfile, time
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run

ap = argparse.ArgumentParser()
ap.add_argument("--engine", required=True)
ap.add_argument("--opps", default=",".join(run.OPPONENTS))
ap.add_argument("--variants", default="0-78")
ap.add_argument("--rounds", type=int, default=99)
ap.add_argument("--jobs", type=int, default=4)
ap.add_argument("--min-plies", type=int, default=0, help="leave scenarios already won in at most this many plies")
ap.add_argument("--hours", type=float, default=99.0)
ap.add_argument("--order", default="asc", help="asc: lowest untried variant first; desc: highest first (two machines can then share a scenario)")
ap.add_argument("--db", default="/root/makefun-work/var/db.jsonl")
ap.add_argument("--tag", default=os.environ.get("ENGINE_TAG", "v7"), help="label of the engine's search and evaluation; results are valid for one label")
a = ap.parse_args()

DIGITS = "".join(chr(48 + v) for v in range(79))  # one character per variant; 44 (a backslash) is never used
SRC = open(a.engine).read()
TB_RE = re.compile(r"^TB=.*$", re.M)
LN_RE = re.compile(r"\((\d+(?:,\d+){7})\)\[oi\]\*10000")
BUDGET = [int(x) * 10000 for x in LN_RE.search(SRC).group(1).split(",")]
EHASH = a.tag
LEGACY = {"7d66ad0d28f2dc41": "v7"}
lo, hi = (int(x) for x in a.variants.split("-"))
opps = a.opps.split(",")
tmpdir = tempfile.mkdtemp(prefix="var-")
files = {}
for v in [x for x in range(lo, hi + 1) if x != 44]:
    files[v] = os.path.join(tmpdir, f"engine_v{v}.py")
    open(files[v], "w").write(TB_RE.sub(lambda m: "TB='%s'*640" % DIGITS[v], SRC))


def load():
    best, tried = {}, {}
    for line in open(a.db):
        r = json.loads(line)
        if LEGACY.get(r["engine"], r["engine"]) != EHASH or r.get("nodes") != BUDGET[run.OPPONENTS.index(r["opponent"])]:
            continue
        k = (r["opponent"], r["colour"], r["opening"])
        tried.setdefault(k, set()).add(r["variant"])
        if r["outcome"] == "win" and (k not in best or r["plies"] < best[k]):
            best[k] = r["plies"]
    return best, tried


def one(k, v, cap):
    t0 = time.time()
    res = run.play(files[v], [k], limit_ms=600000, max_plies=cap)
    g = res["games"][0]
    if res["code"] != 0 or g["reason"] in ("abandoned", "unplayed"):
        return k, v, cap, None
    out = g["outcome"] if g["plies"] < cap else "capped"
    r = {"engine": EHASH, "opponent": k[0], "colour": k[1], "opening": k[2], "variant": v, "nodes": BUDGET[run.OPPONENTS.index(k[0])],
         "outcome": out, "reason": g["reason"] if out != "capped" else "capped", "plies": g["plies"], "cap": cap,
         "think_sum": round(res["think_avg"] * res["moves"]), "think_max": res["think_max"], "moves": " ".join(g["moves"]),
         "wall": round(time.time() - t0, 1), "code": res["code"], "host": os.environ.get("HOST_TAG", "local")}
    with open(a.db, "a") as fh:
        fh.write(json.dumps(r) + "\n")
    return k, v, cap, r


t_end = time.time() + a.hours * 3600
for rnd in range(a.rounds):
    best, tried = load()
    todo = []
    for k, p in sorted(best.items(), key=lambda kv: -kv[1]):
        if k[0] not in opps or p <= a.min_plies:
            continue
        nxt = [v for v in range(lo, hi + 1) if v != 44 and v not in tried.get(k, ())]
        if nxt:
            todo.append((k, nxt[0] if a.order == "asc" else nxt[-1], p))
    if not todo or time.time() > t_end:
        break
    t0 = time.time()
    gain = n = 0
    with ThreadPoolExecutor(a.jobs) as ex:
        futs = [ex.submit(one, k, v, cap) for k, v, cap in todo]
        for fu in as_completed(futs):
            k, v, cap, r = fu.result()
            n += 1
            if r and r["outcome"] == "win":
                gain += cap - r["plies"]
                print(f"  round {rnd} [{n}/{len(todo)}] {k[0]:11s} {k[1]:5s} {k[2]:26s} v{v}: {cap} -> {r['plies']} plies", flush=True)
            if time.time() > t_end:
                for f2 in futs:
                    f2.cancel()
    best2, _ = load()
    sel = [p for k, p in best2.items() if k[0] in opps]
    print(f"round {rnd}: {len(todo)} games in {time.time() - t0:.0f}s, plies gained {gain}, mean best {sum(sel) / max(1, len(sel)):.1f} over {len(sel)} scenarios", flush=True)
