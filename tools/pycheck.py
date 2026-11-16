#!/usr/bin/env python3
"""Replay recorded games with another Python interpreter and compare the moves.

The engine decides by node counts alone, so any interpreter that runs the same Python code must
play the same games; this checks it on games from the results database and reports the speed.

usage: pycheck.py --engine engine.py --py pypy3 [--opps depth-2,nodes-100k] [--count 4] [--max-plies 80] [--seed 1] [--jobs 1]
"""
import argparse, json, os, random, re, sys, tempfile, time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run

ap = argparse.ArgumentParser()
ap.add_argument("--engine", required=True)
ap.add_argument("--py", default="pypy3")
ap.add_argument("--opps", default=",".join(run.OPPONENTS))
ap.add_argument("--count", type=int, default=4)
ap.add_argument("--max-plies", type=int, default=90, help="only recorded wins of at most this many plies (quick to replay)")
ap.add_argument("--seed", type=int, default=1)
ap.add_argument("--jobs", type=int, default=1)
ap.add_argument("--db", default="/root/makefun-work/var/db.jsonl")
ap.add_argument("--tag", default="v7")
a = ap.parse_args()

SRC = open(a.engine).read()
TB_RE = re.compile(r"^TB=.*$", re.M)
BUDGET = [int(x) * 10000 for x in re.search(r"\((\d+(?:,\d+){7})\)\[oi\]\*10000", SRC).group(1).split(",")]
LEGACY = {"7d66ad0d28f2dc41": "v7"}
recs = []
for line in open(a.db):
    r = json.loads(line)
    if LEGACY.get(r["engine"], r["engine"]) == a.tag and r.get("nodes") == BUDGET[run.OPPONENTS.index(r["opponent"])] \
            and r["outcome"] == "win" and r["plies"] <= a.max_plies and r["opponent"] in a.opps.split(","):
        recs.append(r)
random.Random(a.seed).shuffle(recs)
recs = recs[: a.count]
tmp = tempfile.mkdtemp(prefix="pyc-")


def one(r):
    f = os.path.join(tmp, f"engine_v{r['variant']}.py")
    if not os.path.exists(f):
        open(f, "w").write(TB_RE.sub(lambda m: "TB='%s'*640" % chr(48 + r["variant"]), SRC))
    t0 = time.time()
    res = run.play(f, [(r["opponent"], r["colour"], r["opening"])], py=a.py, limit_ms=600000)
    g = res["games"][0]
    same = " ".join(g["moves"]) == r["moves"]
    think = round(res["think_avg"] * res["moves"])
    return (f"{'same' if same else 'DIFF'} {r['opponent']:11s} {r['colour']:5s} {r['opening']:24s} v{r['variant']:<2d} recorded {r['outcome']} {r['plies']}"
            f" replay {g['outcome']} {g['plies']} exit {res['code']}  our think {think / 1000:.1f}s (recorded {r.get('think_sum', 0) / 1000:.1f}s on {r.get('host', '?')})  wall {time.time() - t0:.0f}s"), same


bad = 0
with ThreadPoolExecutor(a.jobs) as ex:
    for line, same in ex.map(one, recs):
        print(line, flush=True)
        bad += not same
print("games that differ:", bad)
sys.exit(1 if bad else 0)
