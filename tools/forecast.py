#!/usr/bin/env python3
"""Forecast an entry's final from the results database.

For the variant table of an engine file (its TB line) it looks up the recorded game of each of
the 640 scenarios (opponent x colour x opening) with the variant the table names there, then
draws random finals as the rules describe them (6 trials; a trial is the 8 house engines, colours
alternating, 8 different openings of the 40) and reports the mean Elo an entry would be ranked by
and its plies to spare (the tie-break).  A scenario whose game was never played with that
variant is counted as unknown and listed with --list; the draws treat it as --unknown says.

usage: forecast.py --engine engine.py [--db FILE] [--tag v7] [--samples 20000] [--unknown loss|draw|skip] [--list]
"""
import argparse, json, os, random, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run

ap = argparse.ArgumentParser()
ap.add_argument("--engine", required=True)
ap.add_argument("--db", default="/root/makefun-work/var/db.jsonl")
ap.add_argument("--tag", default="v7")
ap.add_argument("--samples", type=int, default=20000)
ap.add_argument("--unknown", default="loss")
ap.add_argument("--list", action="store_true")
a = ap.parse_args()

SRC = open(a.engine).read()
TB = re.search(r"^TB='(.{640})'$", SRC, re.M).group(1)
# the first table held base-36 digits (variants 0-11); later ones hold chr(48 + variant)
dec = (lambda c: int(c, 36)) if ",36)" in SRC else (lambda c: ord(c) - 48)
BUDGET = [int(x) * 10000 for x in re.search(r"\((\d+(?:,\d+){7})\)\[oi\]\*10000", SRC).group(1).split(",")]
LEGACY = {"7d66ad0d28f2dc41": "v7"}
ORDER = list(run.BOOK)
DB = {}
for line in open(a.db):
    r = json.loads(line)
    if LEGACY.get(r["engine"], r["engine"]) == a.tag and r.get("nodes") == BUDGET[run.OPPONENTS.index(r["opponent"])] and r["outcome"] != "capped":
        DB[(r["opponent"], r["colour"], r["opening"], r["variant"])] = r

PTS = {"win": 1.0, "draw": 0.5, "loss": 0.0}
res = {}
tally = {o: {"win": 0, "draw": 0, "loss": 0, "unknown": 0} for o in run.OPPONENTS}
for o in run.OPPONENTS:
    for c in ("white", "black"):
        for b in ORDER:
            v = dec(TB[ORDER.index(b) * 16 + run.OPPONENTS.index(o) * 2 + (c == "black")])
            r = DB.get((o, c, b, v))
            if r is None:
                tally[o]["unknown"] += 1
                res[(o, c, b)] = None
                if a.list:
                    print(f"unknown: {o}:{c}:{b} v{v}")
            else:
                tally[o][r["outcome"]] += 1
                res[(o, c, b)] = (PTS[r["outcome"]], 200 - r["plies"] if r["outcome"] == "win" else 0)
tot = {k: sum(t[k] for t in tally.values()) for k in ("win", "draw", "loss", "unknown")}
print(f"scenarios: {tot['win']} wins, {tot['draw']} draws, {tot['loss']} losses, {tot['unknown']} not played with the table's variant")
for o in run.OPPONENTS:
    t = tally[o]
    print(f"  {o:11s} W{t['win']:3d} D{t['draw']:3d} L{t['loss']:3d} ?{t['unknown']:3d}")

unk = {"loss": (0.0, 0), "draw": (0.5, 0)}.get(a.unknown)
rng = random.Random(7)
means, spares, perfect = [], [], 0
for _ in range(a.samples):
    elos, sp = [], 0
    for t in range(6):
        ops = rng.sample(ORDER, 8)
        flip = rng.random() < 0.5
        games = []
        for i, o in enumerate(run.OPPONENTS):
            c = "white" if (i % 2 == 0) != flip else "black"
            g = res[(o, c, ops[i])] or unk
            if g is None:
                continue
            games.append((run.ANCHORS[o], g[0]))
            sp += g[1]
        elos.append(run.elo(games))
    m = sum(elos) / 6
    means.append(m)
    spares.append(sp)
    perfect += all(e == 2112 for e in elos)
means.sort()
n = len(means)
print(f"final (6 trials of 8 games), {n} random draws, unknown counted as {a.unknown}:")
print(f"  mean Elo: average {sum(means) / n:.0f}   p5 {means[n // 20]:.0f}   median {means[n // 2]:.0f}   p95 {means[n * 19 // 20]:.0f}   all 48 games won in {100 * perfect / n:.1f}% of draws")
print(f"  plies to spare over the 48 games: average {sum(spares) / n:.0f}  (per game {sum(spares) / n / 48:.1f})")
