#!/usr/bin/env python3
"""Replay, with the real Python engine against the real environment, the wins the fast simulator
found, so that the variant table is only ever built from games the entry itself has played.

For every scenario whose quickest recorded win comes from the simulator (host "js") it plays that
variant with engine.py through tools/run.py and appends the game to the database as an ordinary
record.  The simulator's record must match it move for move; a difference is reported loudly (it
would mean the transcription in tools/fast/sim.mjs is wrong) and the real game is what counts.

usage: confirm.py --engine engine.py [--jobs 4] [--opps a,b] [--limit N] [--db FILE]
Then build the table with: varsearch.py --engine engine.py --table --confirmed
"""
import argparse, json, os, re, sys, tempfile, time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run

ap = argparse.ArgumentParser()
ap.add_argument("--engine", required=True)
ap.add_argument("--db", default="/root/makefun-work/var/db.jsonl")
ap.add_argument("--tag", default="v7")
ap.add_argument("--opps", default=",".join(run.OPPONENTS))
ap.add_argument("--jobs", type=int, default=4)
ap.add_argument("--limit", type=int, default=0)
a = ap.parse_args()

SRC = open(a.engine).read()
TB_RE = re.compile(r"^TB=.*$", re.M)
BUDGET = [int(x) * 10000 for x in re.search(r"\((\d+(?:,\d+){7})\)\[oi\]\*10000", SRC).group(1).split(",")]
LEGACY = {"7d66ad0d28f2dc41": "v7"}
real, sim = {}, {}
for line in open(a.db):
    r = json.loads(line)
    if LEGACY.get(r["engine"], r["engine"]) != a.tag or r.get("nodes") != BUDGET[run.OPPONENTS.index(r["opponent"])]:
        continue
    k = (r["opponent"], r["colour"], r["opening"])
    (sim if r.get("host") == "js" else real).setdefault(k, {})[r["variant"]] = r

todo = []
for k, vs in sim.items():
    if k[0] not in a.opps.split(","):
        continue
    wins = sorted((r["plies"], v) for v, r in vs.items() if r["outcome"] == "win")
    have = min((r["plies"] for r in real.get(k, {}).values() if r["outcome"] == "win"), default=999)
    for plies, v in wins:
        if plies >= have:
            break
        if v not in real.get(k, {}):      # the quickest simulator win not replayed yet
            todo.append((have - plies, k, v, vs[v]))
            break
todo.sort(key=lambda t: -t[0])
if a.limit:
    todo = todo[: a.limit]
print(f"simulator wins to replay with the real engine: {len(todo)}", flush=True)
tmp = tempfile.mkdtemp(prefix="cfm-")


def one(item):
    gain, k, v, js = item
    f = os.path.join(tmp, f"engine_v{v}.py")
    if not os.path.exists(f):
        open(f, "w").write(TB_RE.sub(lambda m: "TB='%s'*640" % chr(48 + v), SRC))
    t0 = time.time()
    res = run.play(f, [k], limit_ms=600000)
    g = res["games"][0]
    if res["code"] != 0 or g["reason"] in ("abandoned", "unplayed", "time"):
        return f"NOT PLAYED {k} v{v}: exit {res['code']} {g['reason']}", False
    r = {"engine": a.tag, "opponent": k[0], "colour": k[1], "opening": k[2], "variant": v, "nodes": BUDGET[run.OPPONENTS.index(k[0])],
         "outcome": g["outcome"], "reason": g["reason"], "plies": g["plies"], "think_sum": round(res["think_avg"] * res["moves"]),
         "think_max": res["think_max"], "moves": " ".join(g["moves"]), "wall": round(time.time() - t0, 1), "code": res["code"],
         "host": os.environ.get("HOST_TAG", "local"), "confirms": "js"}
    with open(a.db, "a") as fh:
        fh.write(json.dumps(r) + "\n")
    same = r["moves"] == js["moves"]
    return (f"{'same' if same else 'MISMATCH'} {k[0]:11s} {k[1]:5s} {k[2]:26s} v{v:<2d} simulator {js['outcome']} {js['plies']}  real {g['outcome']} {g['plies']}"
            f"  (was {js['plies'] + gain if gain < 900 else 'none'})"), same


bad = 0
with ThreadPoolExecutor(a.jobs) as ex:
    for line, same in ex.map(one, todo):
        print(line, flush=True)
        bad += not same
print(f"replayed {len(todo)}; not matching the simulator: {bad}")
sys.exit(1 if bad else 0)
