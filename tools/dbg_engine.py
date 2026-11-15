#!/usr/bin/env python3
"""A logging twin of engine.py's driver: runs under tools/run.py as the 'engine', loads the
code above engine.py's #run line, plays every game with go(), and writes one line per move
to stderr (ply, depth reached, score, nodes, seconds, move, fen). It also checks the
engine's own legal moves against the env's at every position (MISMATCH lines)."""
import json, os, sys, time, urllib.request as U

SRC = os.environ.get("ENGINE_SRC", "/home/user/Makefun-project/engine.py")
code = open(SRC).read().split("\nE=os.environ")[0]
hook = "\n   g=a\n"
assert hook in code
code = code.replace(hook, "\n   g=a;INFO[:]=[d,a]\n")
ns = {"INFO": [0, 0]}
exec(compile(code, SRC, "exec"), ns)
G, M, A, F, go, B0, sq, name = (ns[k] for k in "G M A F go B0 sq nm".split())
ZERO = [[0] * 64 for _ in range(64)]
E = os.environ["MAKEFUN_ENV_URL"]
NODES = int(os.environ.get("NODES", 30000))


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
        if mine != env:
            print(f"MISMATCH fen {g['fen']} extra {sorted(mine - env)} missing {sorted(env - mine)}", file=sys.stderr)
        L = [(sq(u, j), sq(u[2:], j)) for u in g["legal_moves"] if u[4:] in ("", "q")]
        t0 = time.time()
        ns["INFO"][:] = [0, 0]
        f, t = go(b, L, NODES)
        u = name(f, j) + name(t, j)
        if u + "q" in env:
            u += "q"
        print(f"g{g['game']} ply {j:3d} d {ns['INFO'][0]:2d} sc {ns['INFO'][1]:6d} n {ns['N']:7d} {time.time() - t0:5.2f}s {u:5s} {g['fen']}", file=sys.stderr)
        g = post("/move", {"game": g["game"], "move": u})
    print(f"g{g['game']} over: {g['outcome']} {g['reason']} plies {g['plies']} last {g['last_move']}", file=sys.stderr)
    g = post("/game", {})
