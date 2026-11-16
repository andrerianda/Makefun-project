#!/usr/bin/env python3
"""Keep the quicker-win sampler busy on this machine, one round at a time, on the opponent
where a second of play currently gains the most plies.

A pull runs improve.py for one opponent on the scenarios with the longest wins so far (half of
its 80), reads the plies gained and the seconds the round took from its summary line and keeps a
moving average of plies per second for that opponent.  The next pull goes to the opponent with
the best average; an opponent not pulled for 16 pulls is pulled anyway, so no figure goes stale.
A ply gained counts the same wherever it is gained: a final trial meets every opponent once, on
one of its 80 scenarios, so the expected plies to spare are the sum of the opponents' means.

usage: autoplan.py [--fast | --engine engine.py] [--jobs 4] [--worst 40] [--stop FILE] [--log FILE]
It ends when the stop file exists or when no opponent has an untried variant left.
"""
import argparse, os, re, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run

ap = argparse.ArgumentParser()
ap.add_argument("--engine", default="/root/makefun-work/logs/engine_v9.py")
ap.add_argument("--jobs", type=int, default=4)
ap.add_argument("--worst", type=int, default=40)
ap.add_argument("--stop", default="/root/makefun-work/var/autoplan.stop")
ap.add_argument("--log", default="/root/makefun-work/logs/autoplan.log")
ap.add_argument("--hours", type=float, default=0, help="end after this many hours (checked between rounds; 0: no limit)")
ap.add_argument("--fast", action="store_true", help="sample with the fast simulator (tools/fast/fast.py improve) instead of the Python engine")
ap.add_argument("--prior", default="", help="starting plies per second, e.g. depth-2=0.4,nodes-100k=1.0 (others start untried)")
a = ap.parse_args()

HERE = os.path.dirname(os.path.abspath(__file__))
LINE = re.compile(r"round 0: (\d+) games in (\d+)s, plies gained (\d+), mean best ([\d.]+)")
est = {o: None for o in run.OPPONENTS}       # plies per second, moving average
for kv in filter(None, a.prior.split(",")):
    k, v = kv.split("=")
    est[k] = float(v)
last = {o: 0 for o in run.OPPONENTS}         # pull number of the opponent's last round
done = set()                                 # opponents with nothing left to try


def say(msg):
    with open(a.log, "a") as fh:
        fh.write(time.strftime("%m-%d %H:%M:%S ", time.gmtime()) + msg + "\n")


pull = 0
T_END = time.time() + a.hours * 3600 if a.hours else float("inf")
while not os.path.exists(a.stop) and len(done) < len(run.OPPONENTS) and time.time() < T_END:
    live = [o for o in run.OPPONENTS if o not in done]
    fresh = [o for o in live if est[o] is None]
    stale = [o for o in live if pull - last[o] >= 16]
    o = fresh[0] if fresh else stale[0] if stale else max(live, key=lambda x: est[x])
    t0 = time.time()
    tool = [os.path.join(HERE, "fast", "fast.py"), "improve"] if a.fast else [os.path.join(HERE, "improve.py"), "--engine", a.engine]
    cp = subprocess.run([sys.executable] + tool + ["--opps", o, "--rounds", "1", "--worst", str(a.worst), "--jobs", str(a.jobs)],
                        capture_output=True, text=True)
    out = cp.stdout
    m = LINE.search(out)
    if cp.returncode != 0:
        say(f"{o}: improve.py ended with code {cp.returncode}: {cp.stderr[-300:]!r}")
        time.sleep(60)
        continue
    pull += 1
    last[o] = pull
    if not m:
        if time.time() - t0 < 30:   # no round was played: every variant has been tried there
            done.add(o)
            say(f"{o}: nothing left to try")
        else:
            say(f"{o}: round without a summary line: {out[-200:]!r}")
        continue
    games, secs, gain, mean = int(m.group(1)), int(m.group(2)), int(m.group(3)), float(m.group(4))
    rate = gain / max(1, secs)
    est[o] = rate if est[o] is None else 0.5 * est[o] + 0.5 * rate
    say(f"pull {pull} {o}: {games} games in {secs}s, gained {gain} plies ({rate:.3f}/s), mean best {mean}; averages " +
        " ".join(f"{k.replace('nodes-', 'n').replace('depth-', 'd')}={'-' if v is None else format(v, '.2f')}" for k, v in est.items()))
say("stopped")
