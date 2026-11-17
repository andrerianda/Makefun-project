#!/usr/bin/env python3
"""Runs as an 'engine' under tools/run.py: loads engine.py's code above its #run line,
then at every position it is served compares the engine's own legal moves with the env's
legal_moves list, and plays a mix of searched and seeded-random moves to reach varied
positions (castling, en passant, promotions, checks). Mismatches are printed to stderr."""
import json, os, random, sys, urllib.request as U

SRC = os.environ.get("ENGINE_SRC", "/home/user/Makefun-project/engine.py")
code = open(SRC).read().split("\nE=os.environ")[0]
ns = {}
exec(compile(code, SRC, "exec"), ns)
G, M, A, F, go, B0, sq, name = (ns[k] for k in "G M A F go B0 sq nm".split())
ZERO = [[0] * 64 for _ in range(64)]
E = os.environ["MAKEFUN_ENV_URL"]
rng = random.Random(int(os.environ.get("SEED", "1")))
bad = 0
seen = 0


def post(p, o):
    return json.load(U.urlopen(U.Request(E + p, json.dumps(o).encode(), {"content-type": "application/json"})))


g = post("/game", {})
while g["status"] != "done":
    while g["status"] == "your_move":
        b = B0
        hs = set()
        ms = g["moves"]
        j = len(ms)
        for i, u in enumerate(ms):
            hs.add(b)
            b = F(M(b, sq(u, i), sq(u[2:], i), "  nbrq".find(u[4:] or "q")))
        ns["HS"] = hs
        k = b.index(6)
        mine = set()
        for _, f, t in G(b, ZERO):
            n = M(b, f, t)
            if A(n, t if f == k else k):
                continue
            u = name(f, j) + name(t, j)
            if b[f] == 1 and t > 55:
                mine.update(u + c for c in "qrbn")
            else:
                mine.add(u)
        env = set(g["legal_moves"])
        seen += 1
        if mine != env:
            bad += 1
            print(f"MISMATCH fen {g['fen']} extra {sorted(mine - env)} missing {sorted(env - mine)}", file=sys.stderr)
        if rng.random() < 0.5:
            u = rng.choice(sorted(env))
        else:
            L = [(sq(u, j), sq(u[2:], j)) for u in g["legal_moves"] if u[4:] in ("", "q")]
            f, t = go(b, L, 300)
            u = name(f, j) + name(t, j)
            if u + "q" in env:
                u += "q"
        g = post("/move", {"game": g["game"], "move": u})
    g = post("/game", {})
print(f"positions {seen} mismatches {bad}", file=sys.stderr)
sys.exit(1 if bad else 0)
