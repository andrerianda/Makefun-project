#!/usr/bin/env python3
"""Analyse a position with engine.py's search (the code above its #run line).

usage: an.py [--src engine.py] [--nodes N] (--fen "FEN" | --moves "e2e4 e7e5 ...")
Prints, per finished depth, the score, nodes, time and the principal variation read
from the table, then the chosen move."""
import argparse, os, sys, time

ap = argparse.ArgumentParser()
ap.add_argument("--src", default="/home/user/Makefun-project/engine.py")
ap.add_argument("--nodes", type=int, default=30000)
ap.add_argument("--fen")
ap.add_argument("--moves", default="")
a = ap.parse_args()
code = open(a.src).read().split("\nE=os.environ")[0]
ns = {}
hook = "\n   g=a\n"
assert hook in code
code = code.replace(hook, "\n   g=a;print('depth',d,'score',a,'nodes',N,'best',best)\n")
exec(compile(code, a.src, "exec"), ns)
G, M, A, F, go, B0, sq, name = (ns[k] for k in "G M A F go B0 sq nm".split())
ZERO = [[0] * 64 for _ in range(64)]


def from_fen(fen):
    parts = fen.split()
    rows = parts[0].split("/")
    brd = [0] * 64
    for r, row in enumerate(rows):
        f = 0
        for ch in row:
            if ch.isdigit():
                f += int(ch)
            else:
                code = " pnbrqk".index(ch.lower())
                brd[(7 - r) * 8 + f] = code + (0 if ch.isupper() else 8)
                f += 1
    cast = parts[2]
    for ch, s in (("K", 7), ("Q", 0), ("k", 63), ("q", 56)):
        if ch in cast:
            brd[s] = 7 if ch.isupper() else 15
    if parts[3] != "-":
        e = ord(parts[3][0]) - 97 + 8 * (int(parts[3][1]) - 1)
        brd[e] = 32 if parts[1] == "w" else 16  # capturable by the side to move
    b = bytes(brd)
    j = 0
    if parts[1] == "b":
        # white's view -> black's: swap colours and turn (the ep marker must end as 32)
        b = bytes(bytes(x if x in (0, 16) else (x + 8 if x < 8 else x - 8) for x in b)[::-1])
        b = bytes(32 if x == 16 else x for x in b)
        j = 1
    return b, j


if a.fen:
    b, j = from_fen(a.fen)
    hs = set()
else:
    b, hs, j = B0, set(), 0
    for u in a.moves.split():
        hs.add(b)
        b = F(M(b, sq(u, j), sq(u[2:], j), "  nbrq".find(u[4:] or "q")))
        j += 1
ns["HS"] = hs
k = b.index(6)
L = []
for _, f, t in G(b, ZERO):
    n = M(b, f, t)
    if not A(n, t if f == k else k):
        L.append((f, t))
print("legal", len(L), "in check", A(b, k))
t0 = time.time()
ns["LOG"] = 1
f, t = go(b, L, a.nodes)
dt = time.time() - t0
print(f"best {name(f, j)}{name(t, j)}  nodes {ns['N']}  {dt:.2f}s  {ns['N'] / max(dt, 1e-9):.0f} nps  tt {len(ns['TT'])}")
# principal variation from the table
pv, bb, jj = [], b, j
m = (f, t)
for _ in range(12):
    pv.append(name(m[0], jj) + name(m[1], jj))
    bb = F(M(bb, m[0], m[1]))
    jj += 1
    e = ns["TT"].get(bb)
    if not e or not e[3]:
        break
    m = e[3]
print("pv", " ".join(pv))
