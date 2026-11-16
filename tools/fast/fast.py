#!/usr/bin/env python3
"""Driver for the fast simulator (sim.mjs): checks it against recorded games and uses it to look
for quicker wins.

  fast.py check   [--count N] [--opps a,b] [--seed S] [--jobs 4] [--all]
      replay recorded games (any outcome; the records hold whole games) and compare every move.
      A single differing move means the transcription is wrong somewhere: do not use it until fixed.

  fast.py improve [--opps a,b] [--variants 0-78] [--rounds N] [--worst N] [--scenarios o:c:b,...] [--jobs 4] [--hours H]
      as tools/improve.py: every round plays one untried variant on each chosen scenario, cut at the
      scenario's best win so far (a real cut here: the game stops when it can no longer win sooner).
      Results go to the same database with host "js"; they are candidates until the real entry has
      replayed them (tools/verify_table.py).

Workers are persistent `node sim.mjs` processes, one game at a time each.
"""
import argparse, json, os, queue, random, subprocess, sys, threading, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import run

ap = argparse.ArgumentParser()
ap.add_argument("mode", choices=["check", "improve"])
ap.add_argument("--db", default="/root/makefun-work/var/db.jsonl")
ap.add_argument("--tag", default="v7")
ap.add_argument("--opps", default=",".join(run.OPPONENTS))
ap.add_argument("--jobs", type=int, default=4)
ap.add_argument("--count", type=int, default=40)
ap.add_argument("--seed", type=int, default=1)
ap.add_argument("--all", action="store_true")
ap.add_argument("--max-plies", type=int, default=200, help="check: only recorded games of at most this many plies")
ap.add_argument("--variants", default="0-78")
ap.add_argument("--rounds", type=int, default=99)
ap.add_argument("--worst", type=int, default=0)
ap.add_argument("--scenarios", default="")
ap.add_argument("--hours", type=float, default=99.0)
ap.add_argument("--order", default="mix", help="which untried variant comes next: asc, desc, or mix (cycle through the king-distance weights 8, 5, 3, ...)")
ap.add_argument("--node", default=os.environ.get("NODE_BIN", "node"))
a = ap.parse_args()

BUDGET = [150000] * 5 + [250000] * 3
LEGACY = {"7d66ad0d28f2dc41": "v7"}
opps = a.opps.split(",")


def rows():
    for line in open(a.db):
        r = json.loads(line)
        if LEGACY.get(r["engine"], r["engine"]) == a.tag and r.get("nodes") == BUDGET[run.OPPONENTS.index(r["opponent"])]:
            yield r


class Pool:
    """N persistent simulator processes; map() sends jobs and yields (job, answer) as they finish."""

    def __init__(self, n):
        self.procs = [subprocess.Popen([a.node, os.path.join(HERE, "sim.mjs")], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1) for _ in range(n)]

    def map(self, jobs):
        todo, done = queue.Queue(), queue.Queue()
        for j in jobs:
            todo.put(j)

        def work(p):
            while True:
                try:
                    j = todo.get_nowait()
                except queue.Empty:
                    return
                p.stdin.write(json.dumps(j) + "\n")
                p.stdin.flush()
                line = p.stdout.readline()
                done.put((j, json.loads(line) if line else {"error": "the simulator process ended"}))

        ts = [threading.Thread(target=work, args=(p,), daemon=True) for p in self.procs]
        for t in ts:
            t.start()
        for _ in range(len(jobs)):
            yield done.get()

    def close(self):
        for p in self.procs:
            p.stdin.close()
            p.wait(timeout=30)


if a.mode == "check":
    recs = [r for r in rows() if r["opponent"] in opps and r["reason"] != "time" and r["plies"] <= a.max_plies and "moves" in r and r.get("host") != "js"]
    random.Random(a.seed).shuffle(recs)
    if not a.all:
        recs = recs[: a.count]
    pool = Pool(a.jobs)
    t0 = time.time()
    bad = n = 0
    jobs = [{"id": i, "opponent": r["opponent"], "colour": r["colour"], "opening": r["opening"], "variant": r["variant"], "cap": 0} for i, r in enumerate(recs)]
    for j, out in pool.map(jobs):
        r = recs[j["id"]]
        n += 1
        if "error" in out:
            bad += 1
            print(f"ERROR {r['opponent']} {r['colour']} {r['opening']} v{r['variant']}: {out['error'][:300]}", flush=True)
            continue
        want, got = r["moves"].split(), out["moves"].split()
        same = want == got
        if not same:
            bad += 1
            k = next((i for i, (x, y) in enumerate(zip(want, got)) if x != y), min(len(want), len(got)))
            print(f"DIFF {r['opponent']:11s} {r['colour']:5s} {r['opening']:26s} v{r['variant']:<2d} first difference at ply {k}: recorded {want[k] if k < len(want) else '-'} simulated {got[k] if k < len(got) else '-'}"
                  f" (recorded {len(want)} plies, simulated {len(got)}; host {r.get('host', '?')})", flush=True)
        elif n <= 12 or n % 25 == 0:
            print(f"same {r['opponent']:11s} {r['colour']:5s} {r['opening']:26s} v{r['variant']:<2d} {out['outcome']} {out['plies']} plies in {out['ms'] / 1000:.1f}s ({out['our_nodes'] / 1e6:.1f}M of our nodes)", flush=True)
    pool.close()
    print(f"checked {n} recorded games in {time.time() - t0:.0f}s: {bad} differ")
    sys.exit(1 if bad else 0)

# ---- improve ------------------------------------------------------------------------------------
lo, hi = (int(x) for x in a.variants.split("-"))
MIX = [5, 3, 1, 6, 4, 2, 0]   # variant groups (v // 12) in the order "mix" visits them: weights 8, 5, 3, 8, 5, 3, 1
only = {tuple(x.split(":")) for x in a.scenarios.split(",")} if a.scenarios else None


def load():
    best, tried = {}, {}
    for r in rows():
        k = (r["opponent"], r["colour"], r["opening"])
        tried.setdefault(k, set()).add(r["variant"])
        if r["outcome"] == "win" and (k not in best or r["plies"] < best[k]):
            best[k] = r["plies"]
    return best, tried


pool = Pool(a.jobs)
t_end = time.time() + a.hours * 3600
for rnd in range(a.rounds):
    best, tried = load()
    todo = []
    for k, p in sorted(best.items(), key=lambda kv: -kv[1]):
        if (k not in only) if only else (k[0] not in opps):
            continue
        nxt = [v for v in range(lo, hi + 1) if v != 44 and v not in tried.get(k, ())]
        if nxt:
            todo.append((k, nxt[0] if a.order == "asc" else nxt[-1] if a.order == "desc" else min(nxt, key=lambda v: (v % 12, MIX.index(v // 12))), p))
    if a.worst:
        todo = todo[: a.worst]
    if not todo or time.time() > t_end:
        break
    t0 = time.time()
    gain = n = 0
    jobs = [{"id": i, "opponent": k[0], "colour": k[1], "opening": k[2], "variant": v, "cap": cap} for i, (k, v, cap) in enumerate(todo)]
    for j, out in pool.map(jobs):
        k, v, cap = todo[j["id"]]
        n += 1
        if "error" in out:
            print(f"  ERROR {k} v{v}: {out['error'][:200]}", flush=True)
            continue
        r = {"engine": a.tag, "opponent": k[0], "colour": k[1], "opening": k[2], "variant": v, "nodes": BUDGET[run.OPPONENTS.index(k[0])],
             "outcome": out["outcome"], "reason": out["reason"], "plies": out["plies"], "cap": cap, "moves": out["moves"],
             "wall": round(out["ms"] / 1000, 1), "code": 0, "host": "js", "scores": out.get("scores")}
        with open(a.db, "a") as fh:
            fh.write(json.dumps(r) + "\n")
        if out["outcome"] == "win" and out["plies"] < cap:
            gain += cap - out["plies"]
            print(f"  round {rnd} [{n}/{len(todo)}] {k[0]:11s} {k[1]:5s} {k[2]:26s} v{v}: {cap} -> {out['plies']} plies", flush=True)
    best2, _ = load()
    sel = [p for k, p in best2.items() if ((k in only) if only else (k[0] in opps))]
    print(f"round {rnd}: {len(todo)} games in {time.time() - t0:.0f}s, plies gained {gain}, mean best {sum(sel) / max(1, len(sel)):.1f} over {len(sel)} scenarios", flush=True)
pool.close()
