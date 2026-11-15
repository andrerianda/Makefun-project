#!/usr/bin/env python3
"""Search, scenario by scenario, for the engine variant that wins.

A scenario is (opponent, colour, opening): 8 x 2 x 40 = 640 of them.  The engine picks its
variant (a seed for its evaluation noise) from its TB string, one hex digit per scenario.
The house engines are deterministic and so is ours, so a game played here is the game the
server will play: this tool plays variants against the kit's own env until one wins, and
keeps every result in a JSONL database keyed by the engine source's hash.

usage:
  varsearch.py --engine engine.py --opps nodes-1M,nodes-2M [--variants 0-15] [--jobs 4]
               [--openings a,b | --limit N] [--colours white,black] [--db FILE] [--stop-on win|never]
  varsearch.py --engine engine.py --table        # print the TB string the database gives
"""
import argparse, hashlib, json, os, re, sys, tempfile, time
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run

ap = argparse.ArgumentParser()
ap.add_argument("--engine", required=True)
ap.add_argument("--opps", default=",".join(run.OPPONENTS))
ap.add_argument("--openings")
ap.add_argument("--limit", type=int)
ap.add_argument("--colours", default="white,black")
ap.add_argument("--variants", default="0-15")
ap.add_argument("--jobs", type=int, default=4)
ap.add_argument("--db", default="/root/makefun-work/var/db.jsonl")
ap.add_argument("--stop-on", default="win")
ap.add_argument("--table", action="store_true")
ap.add_argument("--stats", action="store_true")
a = ap.parse_args()

SRC = open(a.engine).read()
TB_RE = re.compile(r"^TB=.*$", re.M)
assert len(TB_RE.findall(SRC)) == 1, "engine has no single TB= line"
LN_RE = re.compile(r"\((\d+(?:,\d+){7})\)\[oi\]\*10000")
assert len(LN_RE.findall(SRC)) == 1, "engine has no single per-opponent budget tuple"
BUDGET = [int(x) * 10000 for x in LN_RE.search(SRC).group(1).split(",")]
# the hash leaves out the variant table and the budget tuple: a result holds for its own budget
EHASH = hashlib.sha256(LN_RE.sub("()[oi]*10000", TB_RE.sub("TB=", SRC)).encode()).hexdigest()[:16]
BOOK_ORDER = list(run.BOOK)
os.makedirs(os.path.dirname(a.db), exist_ok=True)


def load():
    out = {}
    if os.path.exists(a.db):
        for line in open(a.db):
            r = json.loads(line)
            if r["engine"] == EHASH and r.get("nodes") == BUDGET[run.OPPONENTS.index(r["opponent"])]:
                out[(r["opponent"], r["colour"], r["opening"], r["variant"])] = r
    return out


def scen_index(o, c, b):
    return BOOK_ORDER.index(b) * 16 + run.OPPONENTS.index(o) * 2 + (c == "black")


def rank(r):
    """Lower is better: a win (quicker first), then a draw, then a loss."""
    return (0, r["plies"]) if r["outcome"] == "win" else (1, 0) if r["outcome"] == "draw" else (2, 0)


DB = load()
if a.table or a.stats:
    tb = ["0"] * 640
    cover = {}
    for (o, c, b, v), r in DB.items():
        k = (o, c, b)
        if k not in cover or rank(r) < rank(cover[k]):
            cover[k] = r
    for (o, c, b), r in cover.items():
        tb[scen_index(o, c, b)] = "0123456789abcdefghijklmnopqrstuvwxyz"[r["variant"]]
    if a.table:
        print("".join(tb))
    for o in run.OPPONENTS:
        rs = [r for (oo, c, b), r in cover.items() if oo == o]
        w = sum(r["outcome"] == "win" for r in rs)
        d = sum(r["outcome"] == "draw" for r in rs)
        spare = sum(200 - r["plies"] for r in rs if r["outcome"] == "win")
        tmax = max((r["think_sum"] for r in rs), default=0)
        print(f"# {o:11s} scenarios {len(rs):3d}/80  win {w} draw {d} loss {len(rs) - w - d}  spare/win {spare / max(1, w):.0f}  longest game think {tmax / 1000:.0f}s", file=sys.stderr)
    sys.exit(0)

lo, hi = (int(x) for x in a.variants.split("-"))
ids = a.openings.split(",") if a.openings else BOOK_ORDER
scen = [(o, c, b) for o in a.opps.split(",") for b in ids for c in a.colours.split(",")]
if a.limit:
    scen = scen[: a.limit]
tmpdir = tempfile.mkdtemp(prefix="var-")
files = {}
for v in range(lo, hi + 1):
    p = os.path.join(tmpdir, f"engine_v{v}.py")
    open(p, "w").write(TB_RE.sub("TB='%s'*640" % "0123456789abcdefghijklmnopqrstuvwxyz"[v], SRC))
    files[v] = p


def work(s):
    """Try the variants in order on one scenario; stop at the first win."""
    done = []
    for v in range(lo, hi + 1):
        key = s + (v,)
        r = DB.get(key)
        if r is None:
            t0 = time.time()
            res = run.play(files[v], [s], limit_ms=600000)
            g = res["games"][0]
            r = {"engine": EHASH, "opponent": s[0], "colour": s[1], "opening": s[2], "variant": v, "nodes": BUDGET[run.OPPONENTS.index(s[0])], "outcome": g["outcome"],
                 "reason": g["reason"], "plies": g["plies"], "think_sum": round(res["think_avg"] * res["moves"]),
                 "think_max": res["think_max"], "moves": " ".join(g["moves"]), "wall": round(time.time() - t0, 1), "code": res["code"]}
            with open(a.db, "a") as fh:
                fh.write(json.dumps(r) + "\n")
        done.append(r)
        if a.stop_on == "win" and r["outcome"] == "win":
            break
    return s, done


t0 = time.time()
with ThreadPoolExecutor(a.jobs) as ex:
    futs = [ex.submit(work, s) for s in scen]
    n = 0
    for fu in as_completed(futs):
        s, done = fu.result()
        n += 1
        best = min(done, key=rank)
        print(f"[{n}/{len(scen)} {time.time() - t0:.0f}s] {s[0]:11s} {s[1]:5s} {s[2]:26s} tried {len(done):2d}  best v{best['variant']} {best['outcome']} {best['reason']} plies {best['plies']}", flush=True)
