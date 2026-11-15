#!/usr/bin/env python3
"""Check that an entry plays the games its variant table was chosen for.

usage: verify_table.py --entry main.py --engine engine.py [--sample N] [--trials] [--jobs 4]
It reads the TB string from engine.py and the variant search database, then
  --trials   plays the kit's three practice instances with the entry, each as one process
             (6 games in a row, as a trial runs), and compares every game with the database;
  --sample N plays N scenarios drawn at random (fixed seed) as single games and compares.
A mismatch means the entry does not reproduce the recorded game."""
import argparse, hashlib, json, os, random, re, sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run

ap = argparse.ArgumentParser()
ap.add_argument("--entry", required=True)
ap.add_argument("--engine", required=True)
ap.add_argument("--db", default="/root/makefun-work/var/db.jsonl")
ap.add_argument("--tag", default=os.environ.get("ENGINE_TAG", "v7"), help="label of the engine's search and evaluation; results are valid for one label")
ap.add_argument("--sample", type=int, default=0)
ap.add_argument("--trials", action="store_true")
ap.add_argument("--full8", action="store_true", help="with --trials: play all 8 games of each practice instance")
ap.add_argument("--jobs", type=int, default=4)
a = ap.parse_args()

SRC = open(a.engine).read()
TB = re.search(r"^TB='([0-9a-z]{640})'$", SRC, re.M).group(1)
TB_RE = re.compile(r"^TB=.*$", re.M)
LN_RE = re.compile(r"\((\d+(?:,\d+){7})\)\[oi\]\*10000")
BUDGET = [int(x) * 10000 for x in LN_RE.search(SRC).group(1).split(",")]
EHASH = a.tag
LEGACY = {"7d66ad0d28f2dc41": "v7"}
ORDER = list(run.BOOK)
DB = {}
for line in open(a.db):
    r = json.loads(line)
    if LEGACY.get(r["engine"], r["engine"]) == EHASH and r.get("nodes") == BUDGET[run.OPPONENTS.index(r["opponent"])]:
        DB[(r["opponent"], r["colour"], r["opening"], r["variant"])] = r


def expected(s):
    v = int(TB[ORDER.index(s[2]) * 16 + run.OPPONENTS.index(s[0]) * 2 + (s[1] == "black")], 36)
    return v, DB.get(s + (v,))


def compare(s, g):
    v, e = expected(s)
    if e is None:
        return f"{s} v{v}: played {g['outcome']} in {g['plies']} plies (no database record)"
    ok = e["moves"] == " ".join(g["moves"])
    return f"{'ok  ' if ok else 'DIFF'} {s[0]:11s} {s[1]:5s} {s[2]:26s} v{v} expected {e['outcome']} {e['plies']} got {g['outcome']} {g['plies']}"


bad = 0
if a.trials:
    def trial(t):
        ref = json.load(open(os.path.join(run.KIT, f"practice/trial-{t}/reference/gauntlet.json")))
        games = [(g["opponent"], g["colour"], g["opening"]["id"]) for g in ref["games"]]
        if a.full8:
            # the practice instance holds 6 games; add the two strongest opponents on fresh openings
            games += [("nodes-1M", "white" if t % 2 == 0 else "black", ORDER[(7 * t + 3) % 40]), ("nodes-2M", "black" if t % 2 == 0 else "white", ORDER[(7 * t + 11) % 40])]
        r = run.play(a.entry, games, limit_ms=600000)
        lines = [compare(s, g) for s, g in zip(games, r["games"])]
        return t, r, lines
    with ThreadPoolExecutor(min(3, a.jobs)) as ex:
        for t, r, lines in ex.map(trial, range(3)):
            w = sum(g["outcome"] == "win" for g in r["games"])
            spare = sum(200 - g["plies"] for g in r["games"] if g["outcome"] == "win")
            print(f"== practice trial {t}: elo {r['elo']} wins {w}/{len(r['games'])} spare {spare} wall {r['wall']:.0f}s think max {r['think_max']}ms exit {r['code']}")
            for ln in lines:
                print("  " + ln)
                bad += ln.startswith("DIFF")
if a.sample:
    rng = random.Random(12345)
    scen = [(o, c, b) for o in run.OPPONENTS for b in ORDER for c in ("white", "black")]
    pick = rng.sample(scen, a.sample)
    def one(s):
        r = run.play(a.entry, [s], limit_ms=600000)
        return compare(s, r["games"][0])
    with ThreadPoolExecutor(a.jobs) as ex:
        for ln in ex.map(one, pick):
            print(ln, flush=True)
            bad += ln.startswith("DIFF")
print("mismatches:", bad)
sys.exit(1 if bad else 0)
