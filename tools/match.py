#!/usr/bin/env python3
"""Play an engine against house opponents on many scenarios in parallel.

usage: match.py --engine FILE --opps nodes-100k,nodes-500k [--openings K | --ids a,b]
                [--colours white,black] [--nodes N] [--jobs 4] [--tag NAME] [--py EXE]
Each scenario (opponent, colour, opening) is one game on its own env process.  Prints a
line per game as it finishes, then W/D/L and points per opponent.  Results are appended
to logs/match-<tag>.jsonl."""
import argparse, json, os, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run

ap = argparse.ArgumentParser()
ap.add_argument("--engine", required=True)
ap.add_argument("--opps", default="nodes-250k")
ap.add_argument("--openings", type=int, default=8)
ap.add_argument("--offset", type=int, default=0)
ap.add_argument("--ids")
ap.add_argument("--colours", default="white,black")
ap.add_argument("--nodes", type=int)
ap.add_argument("--jobs", type=int, default=4)
ap.add_argument("--tag", default="x")
ap.add_argument("--py", default="python3")
ap.add_argument("--env", action="append", default=[])
a = ap.parse_args()

ids = a.ids.split(",") if a.ids else list(run.BOOK)[a.offset::max(1, 40 // a.openings)][: a.openings]
scen = [(o, c, b) for o in a.opps.split(",") for b in ids for c in a.colours.split(",")]
extra = dict(e.split("=", 1) for e in a.env)
if a.nodes:
    extra["NODES"] = str(a.nodes)


def one(s):
    t0 = time.time()
    r = run.play(a.engine, [s], py=a.py, limit_ms=600000, env_extra=extra)
    g = r["games"][0]
    g.update(wall=time.time() - t0, think_avg=r["think_avg"], think_max=r["think_max"], code=r["code"], err=r["stderr"][-300:] if r["code"] else "")
    return g


out = os.path.join("/root/makefun-work/logs", f"match-{a.tag}.jsonl")
res = []
t0 = time.time()
with ThreadPoolExecutor(a.jobs) as ex:
    futs = [ex.submit(one, s) for s in scen]
    for fu in as_completed(futs):
        g = fu.result()
        res.append(g)
        print(f"{g['opponent']:11s} {g['colour']:5s} {g['opening']:26s} {g['outcome']:4s} {g['reason']:20s} plies {g['plies']:3d} "
              f"think {g['think_avg']:.0f}/{g['think_max']}ms wall {g['wall']:.0f}s {g['err']}", flush=True)
        with open(out, "a") as fh:
            fh.write(json.dumps({k: v for k, v in g.items() if k != "moves"} | {"engine": a.engine, "nodes": a.nodes, "moves": " ".join(g["moves"])}) + "\n")
print(f"--- {a.tag}: {len(res)} games in {time.time() - t0:.0f}s")
tot = 0
for o in a.opps.split(","):
    gs = [g for g in res if g["opponent"] == o]
    w = sum(g["outcome"] == "win" for g in gs)
    d = sum(g["outcome"] == "draw" for g in gs)
    pts = w + d / 2
    tot += pts
    spare = sum(200 - g["plies"] for g in gs if g["outcome"] == "win")
    print(f"{o:11s} W{w} D{d} L{len(gs) - w - d}  {pts}/{len(gs)}  spare/win {spare / max(1, w):.0f}")
print(f"total {tot}/{len(res)}")
