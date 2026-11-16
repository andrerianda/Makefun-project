#!/usr/bin/env python3
"""Do the variant groups differ?  A variant is a noise seed plus the king-distance weight XS
(1, 3, 3, 5, 5, 8, 8 for v//12); the sampling so far has mostly seen XS 1.  This plays the same
random scenarios to their end (no cut) with three seeds from each XS level in the fast simulator
and prints win rate and win length per level.  The games also go into the results database as
simulator records (candidates only).

usage: groupexp.py [--per-opp 5] [--seed 7] [--jobs 4]
"""
import argparse, json, os, queue, random, subprocess, sys, threading, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import run

ap = argparse.ArgumentParser()
ap.add_argument("--per-opp", type=int, default=5)
ap.add_argument("--seed", type=int, default=7)
ap.add_argument("--jobs", type=int, default=4)
ap.add_argument("--variants", default="0,1,2,12,13,14,36,37,38,60,61,62")
ap.add_argument("--db", default="/root/makefun-work/var/db.jsonl")
ap.add_argument("--out", default="/root/makefun-work/var/groupexp.jsonl")
a = ap.parse_args()
BUDGET = [150000] * 5 + [250000] * 3
XS = (1, 3, 3, 5, 5, 8, 8)
rng = random.Random(a.seed)
scen = [(o, rng.choice(("white", "black")), b) for o in run.OPPONENTS for b in rng.sample(list(run.BOOK), a.per_opp)]
vs = [int(x) for x in a.variants.split(",")]
jobs = [{"id": i, "opponent": o, "colour": c, "opening": b, "variant": v, "cap": 0} for i, (v, (o, c, b)) in enumerate((v, s) for s in scen for v in vs)]
todo, lock, res = queue.Queue(), threading.Lock(), []
for j in jobs:
    todo.put(j)


def work():
    p = subprocess.Popen(["node", os.path.join(HERE, "fast", "sim.mjs")], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1)
    while True:
        try:
            j = todo.get_nowait()
        except queue.Empty:
            break
        p.stdin.write(json.dumps(j) + "\n")
        p.stdin.flush()
        out = json.loads(p.stdout.readline())
        if "error" in out:
            print("ERROR", j, out["error"][:200], flush=True)
            continue
        r = {"engine": "v7", "opponent": j["opponent"], "colour": j["colour"], "opening": j["opening"], "variant": j["variant"],
             "nodes": BUDGET[run.OPPONENTS.index(j["opponent"])], "outcome": out["outcome"], "reason": out["reason"], "plies": out["plies"],
             "cap": 0, "moves": out["moves"], "wall": round(out["ms"] / 1000, 1), "code": 0, "host": "js", "scores": out.get("scores")}
        with lock:
            res.append(r)
            for f in (a.db, a.out):
                with open(f, "a") as fh:
                    fh.write(json.dumps(r) + "\n")
    p.stdin.close()


t0 = time.time()
ts = [threading.Thread(target=work) for _ in range(a.jobs)]
for t in ts:
    t.start()
for t in ts:
    t.join()
print(f"{len(res)} games in {time.time() - t0:.0f}s")
for name, opps in (("depth-2..nodes-250k", run.OPPONENTS[:5]), ("nodes-500k..2M", run.OPPONENTS[5:]), ("all", run.OPPONENTS)):
    for x in sorted(set(XS)):
        g = [r for r in res if r["opponent"] in opps and XS[r["variant"] // 12] == x]
        w = sorted(r["plies"] for r in g if r["outcome"] == "win")
        d = sum(r["outcome"] == "draw" for r in g)
        if g:
            print(f"{name:20s} XS {x}: games {len(g):3d}  win {100 * len(w) / len(g):3.0f}%  draw {100 * d / len(g):3.0f}%  win plies mean {sum(w) / max(1, len(w)):5.1f}"
                  f"  quartiles {w[len(w) // 4] if w else '-'}/{w[len(w) // 2] if w else '-'}/{w[3 * len(w) // 4] if w else '-'}  quickest {w[0] if w else '-'}")
# per scenario: the quickest win of each level's three seeds
best = {}
for r in res:
    if r["outcome"] == "win":
        k = (r["opponent"], r["colour"], r["opening"], XS[r["variant"] // 12])
        best[k] = min(best.get(k, 999), r["plies"])
for x in sorted(set(XS)):
    b = [best.get((o, c, bk, x), None) for (o, c, bk) in scen]
    got = [p for p in b if p is not None]
    print(f"best of 3 seeds, XS {x}: scenarios with a win {len(got)}/{len(scen)}, mean quickest win {sum(got) / max(1, len(got)):.1f}")
