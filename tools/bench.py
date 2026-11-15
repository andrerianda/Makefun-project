#!/usr/bin/env python3
"""Time-to-depth benchmark for engine.py's search on a fixed set of positions.

usage: bench.py [--src engine.py] [--nodes N] [--set small|all]
For every position it runs go() with the node limit and records the nodes spent when each
depth finished; it prints the per-depth totals over the positions that reached that depth,
the depth each reached, and the wall time. Positions: book openings (after their 8 plies)
and middlegame/endgame FENs taken from logged games."""
import argparse, re, sys, time

ap = argparse.ArgumentParser()
ap.add_argument("--src", default="/home/user/Makefun-project/engine.py")
ap.add_argument("--nodes", type=int, default=150000)
ap.add_argument("--set", default="small")
a = ap.parse_args()
code = open(a.src).read().split("\nE=os.environ")[0]
hook = "\n   g=a\n"
assert hook in code
code = code.replace(hook, "\n   g=a;DEPTHS.append((d,N,a,best,TIME()))\n")
ns = {"DEPTHS": [], "TIME": time.process_time}
exec(compile(code, a.src, "exec"), ns)
G, M, A, F, go, B0, sq, name = (ns[k] for k in "G M A F go B0 sq nm".split())
ZERO = [[0] * 64 for _ in range(64)]

SERVER = "/root/makefun-work/tiny-chess-01-kit/program/env/server.mjs"
BOOK = [m.group(3).split(" ") for m in re.finditer(r'line\("([^"]+)", "([^"]+)", "([^"]+)"\)', open(SERVER).read())]
FENS = [
    "r2q1rk1/1Q2bp1p/p5p1/1p1p1P2/nP2p1P1/8/P1PBBP1P/3R1RK1 b - - 1 20",
    "r4rk1/1Q3p1p/p7/1p1p1Pq1/1Pn1p2b/2B5/P1P1BP1P/3R1R1K b - - 4 25",
    "3r1rk1/5p1p/p2n4/1p1Q1Pq1/1P2p2b/2B5/P1P1BP1P/3R2RK b - - 2 27",
    "r1bq1rk1/pp2bppp/2n1pn2/3p4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 w - - 0 9",
    "2r2rk1/pp1bqppp/2n1pn2/3p4/3P1B2/2PBPN2/PP1N1PPP/R2Q1RK1 b - - 0 11",
    "r3k2r/pp1n1ppp/2p1pn2/q7/1b1P4/2N1PN2/PPQ2PPP/R1B1KB1R w KQkq - 0 9",
    "8/5pk1/6p1/3R3p/2r4P/6P1/5PK1/8 w - - 0 40",
    "8/2k5/1p1p4/p1pPp3/P1P1P3/1P1K4/8/8 w - - 0 50",
    "4r1k1/1p3pp1/p1n4p/2pp4/8/1PP1P1P1/P2R1PKP/3N4 b - - 0 28",
    "r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10",
]


def from_fen(fen):
    parts = fen.split()
    brd = [0] * 64
    for r, row in enumerate(parts[0].split("/")):
        f = 0
        for ch in row:
            if ch.isdigit():
                f += int(ch)
            else:
                brd[(7 - r) * 8 + f] = " pnbrqk".index(ch.lower()) + (0 if ch.isupper() else 8)
                f += 1
    for ch, s in (("K", 7), ("Q", 0), ("k", 63), ("q", 56)):
        if ch in parts[2]:
            brd[s] = 7 if ch.isupper() else 15
    b = bytes(brd)
    if parts[1] == "b":
        b = bytes(bytes(x if x == 0 else (x + 8 if x < 8 else x - 8) for x in b)[::-1])
    return b


positions = []
picks = BOOK[::4] if a.set == "small" else BOOK
for line in picks:
    b = B0
    for j, u in enumerate(line):
        b = F(M(b, sq(u, j), sq(u[2:], j)))
    positions.append(b)
positions += [from_fen(f) for f in (FENS if a.set != "small" else FENS[:6])]

per_depth = {}
per_time = {}
reached = []
t0 = time.process_time()
tot_nodes = 0
for b in positions:
    ns["HS"] = set()
    k = b.index(6)
    L = [(f, t) for _, f, t in G(b, ZERO) if not A(M(b, f, t), t if f == k else k)]
    ns["DEPTHS"].clear()
    tpos = time.process_time()
    go(b, L, a.nodes)
    tot_nodes += ns["N"]
    for d, n, sc, best, tm in ns["DEPTHS"]:
        per_depth.setdefault(d, []).append(n)
        per_time.setdefault(d, []).append(tm - tpos)
    reached.append(ns["DEPTHS"][-1][0] if ns["DEPTHS"] else 0)
dt = time.process_time() - t0
print(f"positions {len(positions)}  time {dt:.1f}s  nps {tot_nodes / dt:.0f}  depth reached: min {min(reached)} avg {sum(reached) / len(reached):.2f} max {max(reached)}")
full = [d for d in sorted(per_depth) if len(per_depth[d]) == len(positions)]
print("nodes to finish depth (all positions):", "  ".join(f"d{d}:{sum(per_depth[d])}" for d in full))
print("cpu seconds to finish depth (all positions):", "  ".join(f"d{d}:{sum(per_time[d]):.2f}" for d in full))
print("reached:", reached)
