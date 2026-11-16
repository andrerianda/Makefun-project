#!/usr/bin/env python3
"""Estimate the wall time of final trials on the server for the table the database gives.

For every scenario's chosen game it counts our moves and their node budgets (a third after
game ply 110, as the engine does), converts nodes to server seconds, adds the house's thinking,
then draws random trials (8 opponents, colours alternating, 8 different openings) and reports
the distribution and the worst case against the 1,800 s limit.

Calibration: the second submission's practice trial (26.7 M nodes of ours, short games) took
281 s on the server; this model predicts about 300 s for it, so it errs on the safe side.

usage: trialtime.py --engine engine.py [--nps 100000] [--samples 200000]
"""
import argparse, hashlib, json, os, random, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run

ap = argparse.ArgumentParser()
ap.add_argument("--engine", required=True)
ap.add_argument("--db", default="/root/makefun-work/var/db.jsonl")
ap.add_argument("--tag", default="v7")
ap.add_argument("--nps", type=float, default=100000.0, help="our nodes per second on the server (measured about 110,000)")
ap.add_argument("--samples", type=int, default=200000)
a = ap.parse_args()

SRC = open(a.engine).read()
LN_RE = re.compile(r"\((\d+(?:,\d+){7})\)\[oi\]\*10000")
BUDGET = [int(x) * 10000 for x in LN_RE.search(SRC).group(1).split(",")]
LEGACY = {"7d66ad0d28f2dc41": "v7"}
HOUSE_S = {"depth-2": 0.01, "depth-3": 0.02, "depth-4": 0.04, "nodes-100k": 0.14, "nodes-250k": 0.33, "nodes-500k": 0.65, "nodes-1M": 1.3, "nodes-2M": 2.5}
ORDER = list(run.BOOK)

best = {}
for line in open(a.db):
    r = json.loads(line)
    if LEGACY.get(r["engine"], r["engine"]) != a.tag or r.get("nodes") != BUDGET[run.OPPONENTS.index(r["opponent"])] or r["outcome"] != "win":
        continue
    k = (r["opponent"], r["colour"], r["opening"])
    if k not in best or r["plies"] < best[k]["plies"]:
        best[k] = r


def game_seconds(r):
    o = r["opponent"]
    first = 8 if r["colour"] == "white" else 9
    ln = BUDGET[run.OPPONENTS.index(o)]
    nodes = sum(ln if j < 110 else ln // 3 for j in range(first, r["plies"], 2))
    house_moves = (r["plies"] - 8) - len(range(first, r["plies"], 2))
    return nodes / a.nps + house_moves * HOUSE_S[o]


T = {k: game_seconds(r) for k, r in best.items()}
missing = [(o, c, b) for o in run.OPPONENTS for c in ("white", "black") for b in ORDER if (o, c, b) not in T]
print(f"scenarios with a win: {len(T)}/640" + (f"  MISSING {len(missing)}" if missing else ""))
for o in run.OPPONENTS:
    ts = sorted(T[k] for k in T if k[0] == o)
    pl = [best[k]["plies"] for k in T if k[0] == o]
    print(f"  {o:11s} game seconds on the server: mean {sum(ts) / len(ts):6.1f}  max {ts[-1]:6.1f}   plies mean {sum(pl) / len(pl):5.1f}  spare/win {200 - sum(pl) / len(pl):5.1f}")
rng = random.Random(1)
tot = []
for _ in range(a.samples):
    ops = rng.sample(ORDER, 8)
    flip = rng.random() < 0.5
    s = 0.0
    for i, o in enumerate(run.OPPONENTS):
        c = "white" if (i % 2 == 0) != flip else "black"
        s += T.get((o, c, ops[i]), 400.0)
    tot.append(s)
tot.sort()
worst = max(sum(max(T.get((o, ("white" if (i % 2 == 0) != flip else "black"), b), 400.0) for b in ORDER) for i, o in enumerate(run.OPPONENTS)) for flip in (False, True))
n = len(tot)
print(f"trial wall seconds (startup about 5 s not included): mean {sum(tot) / n:.0f}  p50 {tot[n // 2]:.0f}  p99 {tot[int(n * .99)]:.0f}  p99.99 {tot[int(n * .9999)]:.0f}  max sampled {tot[-1]:.0f}  absolute worst case {worst:.0f}  (limit 1800)")
sp = sum(200 - best[k]["plies"] for k in T) / max(1, len(T))
print(f"mean plies to spare per game over all scenarios: {sp:.1f}  (per 8-game trial {8 * sp:.0f})")
