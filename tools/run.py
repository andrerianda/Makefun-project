#!/usr/bin/env python3
"""Local runner for tiny-chess-01: plays an engine against the kit's own env server.

It starts the kit's env (program/env/server.mjs, the house engines) as a plain
process on a free port, runs the engine against it exactly as a trial does
(python3 -P -s main.py with MAKEFUN_ENV_URL / MAKEFUN_PROMPT_FILE set), then
reads the env's exported state and rates it with the scorer's own formula.

usage:
  run.py --engine FILE --games SPEC [--py EXE] [--limit-ms N] [--quiet] [--json FILE]

SPEC is "trial0" / "trial1" / "trial2" (a practice instance, 6 games),
"trial0x8" (all 8 games of the instance) or a comma list of
"opponent:colour:opening" (e.g. nodes-2M:white:italian-game).
"""
import hashlib, argparse
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import time

KIT = os.environ.get("KIT", "/root/makefun-work/tiny-chess-01-kit")
SERVER = os.path.join(KIT, "program/env/server.mjs")
ANCHORS = {"depth-2": 855, "depth-3": 1073, "depth-4": 1199, "nodes-100k": 1392,
           "nodes-250k": 1497, "nodes-500k": 1596, "nodes-1M": 1667, "nodes-2M": 1712}
OPPONENTS = list(ANCHORS)


def book():
    """The 40 openings, read from the env's own source."""
    src = open(SERVER, encoding="utf8").read()
    out = {}
    for m in re.finditer(r'line\("([^"]+)", "([^"]+)", "([^"]+)"\)', src):
        out[m.group(1)] = {"id": m.group(1), "name": m.group(2), "moves": m.group(3).split(" ")}
    assert len(out) == 40, len(out)
    return out


BOOK = book()


def elo(points_by_game, floor=0, cap=2112):
    """The scorer's performanceRating: games is a list of (anchor, points)."""
    if not points_by_game:
        return floor
    scored = sum(p for _, p in points_by_game)

    def surplus(r):
        return sum(1 / (1 + 10 ** (-(r - a) / 400)) for a, _ in points_by_game) - scored

    if surplus(floor) >= 0:
        return floor
    if surplus(cap) <= 0:
        return cap
    lo, hi = floor, cap
    for _ in range(100):
        mid = (lo + hi) / 2
        if surplus(mid) < 0:
            lo = mid
        else:
            hi = mid
    return min(cap, max(floor, round((lo + hi) / 2)))


# Every recorded game holds for one build of the environment (its house engines): refuse any other.
ENV_SHA256 = os.environ.get("ENV_SHA256", "958770ada08d79a7d0a9b1b963750a720dc576b3018c0f89fab4d399e3af9ffb")
_got = hashlib.sha256(open(SERVER, "rb").read()).hexdigest()
if _got != ENV_SHA256:
    raise SystemExit(f"{SERVER} has sha256 {_got}, not the build the results database was made with ({ENV_SHA256}): "
                     "the house engines may play differently; re-check the table before going on (ENV_SHA256=... overrides)")


def parse_games(spec):
    m = re.fullmatch(r"trial(\d)(x8)?", spec)
    if m:
        ref = json.load(open(os.path.join(KIT, f"practice/trial-{m.group(1)}/reference/gauntlet.json")))
        games = [(g["opponent"], g["colour"], g["opening"]["id"]) for g in ref["games"]]
        return games if m.group(2) else games[:6]
    games = []
    for part in spec.split(","):
        opp, colour, opening = part.split(":")
        assert opp in ANCHORS and colour in ("white", "black") and opening in BOOK, part
        games.append((opp, colour, opening))
    return games


def play(engine, games, py="python3", limit_ms=10000, env_extra=None, timeout=None, keep=False, max_plies=200):
    """Play `games` [(opponent, colour, opening)] and return the result records."""
    tmp = tempfile.mkdtemp(prefix="tc-")
    try:
        data, state = os.path.join(tmp, "data"), os.path.join(tmp, "state")
        os.makedirs(data)
        gauntlet = {
            "schema": "tiny-chess-01/gauntlet/v1",
            "house_seed": "e56bc4f9fbec70672010a01cd7d0f8077a629c3f4bba25aa6067a6d701800c25",
            "max_plies": max_plies, "adjudication_margin": 5, "move_limit_ms": limit_ms,
            "games": [{"game": i + 1, "opponent": o, "colour": c, "opening": BOOK[b]}
                      for i, (o, c, b) in enumerate(games)],
        }
        json.dump(gauntlet, open(os.path.join(data, "gauntlet.json"), "w"))
        prompt = os.path.join(tmp, "prompt.txt")
        open(prompt, "w").write("local run\n")
        senv = dict(os.environ, MAKEFUN_STATE_DIR=state, MAKEFUN_ENV_DATA_DIR=data, MAKEFUN_ENV_PORT="0")
        server = subprocess.Popen(["node", SERVER], env=senv, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        ready = os.path.join(state, "ready")
        t0 = time.time()
        while not os.path.exists(ready):
            if server.poll() is not None:
                raise RuntimeError("env died: " + server.stderr.read().decode())
            if time.time() - t0 > 20:
                raise RuntimeError("env not ready")
            time.sleep(0.02)
        port = json.load(open(ready))["port"]
        eenv = {k: v for k, v in os.environ.items() if k != "NODES"}   # a stray NODES must not change a recorded game
        eenv.update(MAKEFUN_ENV_URL=f"http://127.0.0.1:{port}", MAKEFUN_PROMPT_FILE=prompt, MAKEFUN_TRIAL_SEED="0" * 64)
        eenv.update(env_extra or {})
        t1 = time.time()
        cmd = [py, "-P", "-s", engine] if "pypy" not in py else [py, engine]
        try:
            proc = subprocess.run(cmd, env=eenv, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=timeout)
            err = proc.stderr.decode(errors="replace")
            code = proc.returncode
        except subprocess.TimeoutExpired as e:
            err, code = (e.stderr or b"").decode(errors="replace") + "\nTIMEOUT", -9
        wall = time.time() - t1
        server.send_signal(signal.SIGTERM)
        server.wait(timeout=20)
        st = json.load(open(os.path.join(state, "export/state.json")))
        calls = [json.loads(l) for l in open(os.path.join(state, "calls.ndjson"))]
        think = [c["think_ms"] for c in calls if c.get("think_ms") is not None]
        house = sum(c["ms"] for c in calls)
        recs = []
        for g, (o, c, b) in zip(st["games"], games):
            pts = {"win": 1, "draw": 0.5, "loss": 0}[g["outcome"]]
            recs.append({"opponent": o, "colour": c, "opening": b, "outcome": g["outcome"], "reason": g["reason"],
                         "plies": len(g["moves"]), "points": pts, "moves": g["moves"]})
        return {"games": recs, "elo": elo([(ANCHORS[r["opponent"]], r["points"]) for r in recs]),
                "wall": wall, "house_ms": house, "think_max": max(think, default=0),
                "think_avg": sum(think) / max(1, len(think)), "moves": len(think), "code": code, "stderr": err}
    finally:
        if not keep:
            shutil.rmtree(tmp, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", required=True)
    ap.add_argument("--games", default="trial0")
    ap.add_argument("--py", default="python3")
    ap.add_argument("--limit-ms", type=int, default=10000)
    ap.add_argument("--json")
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args()
    r = play(a.engine, parse_games(a.games), py=a.py, limit_ms=a.limit_ms)
    for g in r["games"]:
        spare = 200 - g["plies"] if g["outcome"] == "win" else 0
        print(f"{g['opponent']:11s} {g['colour']:5s} {g['opening']:26s} {g['outcome']:4s} {g['reason']:22s} plies {g['plies']:3d} spare {spare}")
    w = sum(g["outcome"] == "win" for g in r["games"])
    d = sum(g["outcome"] == "draw" for g in r["games"])
    print(f"elo {r['elo']}  W{w} D{d} L{len(r['games']) - w - d}  wall {r['wall']:.0f}s house {r['house_ms'] / 1000:.0f}s "
          f"think avg {r['think_avg']:.0f}ms max {r['think_max']}ms over {r['moves']} moves  exit {r['code']}")
    if r["code"] != 0 and not a.quiet:
        print(r["stderr"][-3000:], file=sys.stderr)
    if a.json:
        json.dump(r, open(a.json, "w"))


if __name__ == "__main__":
    main()
