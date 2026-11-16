#!/usr/bin/env python3
"""Fault-injection test of the entry's HTTP handling.

A small proxy sits between the engine and the kit's environment.  At a chosen request number it
  lost_request  closes the connection before the environment sees the request,
  lost_answer   lets the environment act on the request and then closes without answering,
  truncated     lets the environment act and sends only half of its answer,
  http500       answers 500 without passing the request on.
The engine must end the trial with exactly the games of the undisturbed run (the final replays
every trial and compares the exported state byte for byte), except for http500 on a move, where
the position is searched again and only "every game still played to its end" is required.

The engine is run from a copy whose node budgets are cut to a few hundred nodes, so a run takes
about a second; the driver code under test is the entry's own.

usage: faulttest.py --engine engine.py [--kinds lost_request,lost_answer,truncated,http500] [--step 1] [--jobs 4]
"""
import argparse, json, os, re, shutil, signal, subprocess, sys, tempfile, threading, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run

ap = argparse.ArgumentParser()
ap.add_argument("--engine", required=True)
ap.add_argument("--kinds", default="lost_request,lost_answer,truncated,http500")
ap.add_argument("--step", type=int, default=1, help="test every step-th request number")
ap.add_argument("--jobs", type=int, default=4)
a = ap.parse_args()

GAMES = [("depth-2", "white", "london-system"), ("depth-3", "black", "french-winawer"), ("depth-4", "white", "ruy-lopez-morphy")]
SRC = open(a.engine).read()
BUD = re.compile(r"\((\d+(?:,\d+){7})\)\[oi\]\*10000")
assert len(BUD.findall(SRC)) == 1, "budget tuple not found"
WORK = tempfile.mkdtemp(prefix="fault-", dir="/root/makefun-work/var")
ENGINE = os.path.join(WORK, "engine_small.py")
open(ENGINE, "w").write(BUD.sub(lambda m: "(%s)[oi]*20" % m.group(1), SRC))


def trial(tag, kind=None, at=0):
    tmp = os.path.join(WORK, tag)
    data, state = os.path.join(tmp, "data"), os.path.join(tmp, "state")
    os.makedirs(data)
    json.dump({"schema": "tiny-chess-01/gauntlet/v1", "house_seed": "e5" * 32, "max_plies": 200, "adjudication_margin": 5, "move_limit_ms": 600000,
               "games": [{"game": i + 1, "opponent": o, "colour": c, "opening": run.BOOK[b]} for i, (o, c, b) in enumerate(GAMES)]},
              open(os.path.join(data, "gauntlet.json"), "w"))
    server = subprocess.Popen(["node", run.SERVER], env=dict(os.environ, MAKEFUN_STATE_DIR=state, MAKEFUN_ENV_DATA_DIR=data, MAKEFUN_ENV_PORT="0"),
                              stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    ready = os.path.join(state, "ready")
    t0 = time.time()
    while not os.path.exists(ready):
        assert server.poll() is None and time.time() - t0 < 30, "env not ready"
        time.sleep(0.02)
    up = "http://127.0.0.1:%d" % json.load(open(ready))["port"]
    seen = {"n": 0, "hit": None}

    class H(BaseHTTPRequestHandler):
        def log_message(self, *x):
            pass

        def do_POST(self):
            body = self.rfile.read(int(self.headers.get("content-length", 0)))
            seen["n"] += 1
            n = seen["n"]
            fault = kind if n == at else None
            if fault:
                seen["hit"] = self.path
            if fault == "lost_request":
                self.close_connection = True
                return
            if fault == "http500":
                self.send_response(500)
                self.send_header("content-length", "0")
                self.end_headers()
                return
            try:
                r = urllib.request.urlopen(urllib.request.Request(up + self.path, body, {"content-type": "application/json"}))
                status, out = r.status, r.read()
            except urllib.error.HTTPError as e:
                status, out = e.code, e.read()
            if fault == "lost_answer":
                self.close_connection = True
                return
            self.send_response(status)
            self.send_header("content-type", "application/json")
            self.send_header("content-length", str(len(out)))
            self.end_headers()
            if fault == "truncated":
                self.wfile.write(out[: len(out) // 2])
                self.wfile.flush()
                self.close_connection = True
                self.connection.shutdown(2)
                return
            self.wfile.write(out)

    proxy = ThreadingHTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=proxy.serve_forever, daemon=True).start()
    env = {k: v for k, v in os.environ.items() if k != "NODES"}
    env.update(MAKEFUN_ENV_URL="http://127.0.0.1:%d" % proxy.server_address[1], MAKEFUN_PROMPT_FILE=os.devnull, MAKEFUN_TRIAL_SEED="0")
    try:
        p = subprocess.run(["python3", "-P", "-s", ENGINE], env=env, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=300)
        code, err = p.returncode, p.stderr.decode(errors="replace").strip().splitlines()[-1:]
    except subprocess.TimeoutExpired:
        code, err = -9, ["timeout"]
    proxy.shutdown()
    server.send_signal(signal.SIGTERM)
    server.wait(timeout=20)
    st = json.load(open(os.path.join(state, "export/state.json")))
    shutil.rmtree(tmp, ignore_errors=True)
    return {"code": code, "err": err, "state": json.dumps(st, sort_keys=True), "requests": seen["n"], "hit": seen["hit"],
            "summary": [(g["outcome"], g["reason"], len(g["moves"])) for g in st["games"]]}


base = trial("base")
print("undisturbed:", base["summary"], "exit", base["code"], "requests", base["requests"], flush=True)
assert base["code"] == 0 and all(s[1] not in ("abandoned", "unplayed", "time") for s in base["summary"])
bad = 0
for kind in a.kinds.split(","):
    jobs = list(range(1, base["requests"] + 1, a.step))
    same = played = 0
    with ThreadPoolExecutor(a.jobs) as ex:
        for n, r in zip(jobs, ex.map(lambda n: trial(f"{kind}-{n}", kind, n), jobs)):
            whole = r["code"] == 0 and all(s[1] not in ("abandoned", "unplayed", "time") for s in r["summary"])
            ident = r["state"] == base["state"]
            same += ident
            played += whole
            ok = ident if kind != "http500" else whole
            if not ok:
                bad += 1
                print(f"  FAIL {kind} at request {n} ({r['hit']}): exit {r['code']} {r['err']} {r['summary']}", flush=True)
    print(f"{kind}: {len(jobs)} runs, identical to the undisturbed trial in {same}, every game played to its end in {played}", flush=True)
shutil.rmtree(WORK, ignore_errors=True)
print("failures:", bad)
sys.exit(1 if bad else 0)
