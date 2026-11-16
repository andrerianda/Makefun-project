#!/usr/bin/env python3
"""Worker for a rented CPU machine: sets up the kit and our tools there, runs the variant
searches on all its cores and serves the results over HTTP so the main machine can fetch them.

It needs only Python 3 (stdlib) to start; everything else (Node for the env, the repository,
the kit) is fetched by its own setup step, whose log it serves, so a failed setup is visible.

Environment:
  TOKEN        shared secret every request must carry (?token=...)
  REPO_SHA     commit of the repository to check out
  ENV_SHA256   expected sha256 of the kit's program/env/server.mjs (the house engines)
  MAX_HOURS    stop working and (if the platform gave this pod a key) remove the pod after this long
  JOBS         parallel games (default: the number of CPUs)
  PLAN         shell script (relative to /root/makefun-work) run after setup, default tools/podplan.sh

HTTP (port 8000), all with ?token=:
  GET  /status              json: uptime, load, database lines, running jobs, setup state
  GET  /file?path=REL       a file under /root/makefun-work
  GET  /tail?path=REL&n=N   its last N lines
  POST /put?path=REL        write the body to that file
  POST /exec                run the body as a shell command in the background (log: logs/exec-K.log)
"""
import hashlib, json, os, subprocess, sys, threading, time, urllib.parse, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

W = "/root/makefun-work"
TOKEN = os.environ.get("TOKEN", "")
T0 = time.time()
STATE = {"setup": "starting", "execs": 0}
NODE_VER = os.environ.get("NODE_VER", "v22.23.4")
REPO = "https://github.com/andrerianda/Makefun-project"


def sh(cmd, log):
    """Run a shell command, appending its output to a log; returns the exit code."""
    with open(log, "a") as fh:
        fh.write(f"\n$ {cmd}\n")
        fh.flush()
        return subprocess.call(["bash", "-c", cmd], stdout=fh, stderr=subprocess.STDOUT)


def setup():
    os.makedirs(f"{W}/logs", exist_ok=True)
    os.makedirs(f"{W}/var", exist_ok=True)
    log = f"{W}/logs/setup.log"
    jobs = os.environ.get("JOBS") or str(os.cpu_count() or 4)
    steps = [
        f"cd /root && curl -fsSL https://nodejs.org/dist/{NODE_VER}/node-{NODE_VER}-linux-x64.tar.xz | tar -xJ && ln -sf /root/node-{NODE_VER}-linux-x64/bin/node /usr/local/bin/node && node --version",
        f"cd /root && rm -rf repo && git clone -q {REPO} repo && cd repo && git checkout -q {os.environ.get('REPO_SHA', 'HEAD')} && git log --oneline -1",
        f"cd {W} && curl -fsSL https://make.fun/c/tiny-chess-01/kit | tar xz && ls tiny-chess-01-kit | head -3",
        f"cd {W} && cp -r /root/repo/tools/. tools/ 2>/dev/null || (mkdir -p tools && cp -r /root/repo/tools/. tools/); cp /root/repo/engine.py logs/engine.py; [ -s var/db.jsonl ] || cp tools/var/db.jsonl var/db.jsonl; wc -l var/db.jsonl; python3 --version; nproc",
    ]
    for i, c in enumerate(steps):
        STATE["setup"] = f"step {i + 1}/{len(steps)}"
        if sh(c, log) != 0:
            STATE["setup"] = f"FAILED at step {i + 1}"
            return
    want = os.environ.get("ENV_SHA256")
    got = hashlib.sha256(open(f"{W}/tiny-chess-01-kit/program/env/server.mjs", "rb").read()).hexdigest()
    if want and want != got:
        STATE["setup"] = f"FAILED: env sha256 {got} is not the expected one"
        return
    STATE["setup"] = "done"
    plan = os.environ.get("PLAN", "tools/podplan.sh")
    subprocess.Popen(["bash", "-c", f"cd {W} && JOBS={jobs} HOST_TAG=pod nohup bash {plan} >> logs/plan.log 2>&1"])


def watchdog():
    """After MAX_HOURS: stop the jobs; remove the pod if the platform gave us the means."""
    limit = float(os.environ.get("MAX_HOURS", "7")) * 3600
    while time.time() - T0 < limit:
        time.sleep(30)
    STATE["setup"] = "time limit reached: jobs stopped"
    subprocess.call(["bash", "-c", "pkill -f tools/ ; pkill -f server.mjs ; pkill -f engine_v"])
    key, pod = os.environ.get("RUNPOD_API_KEY"), os.environ.get("RUNPOD_POD_ID")
    if key and pod:
        q = json.dumps({"query": 'mutation { podTerminate(input: {podId: "%s"}) }' % pod}).encode()
        try:
            urllib.request.urlopen(urllib.request.Request("https://api.runpod.io/graphql", q, {"content-type": "application/json", "Authorization": "Bearer " + key}), timeout=30)
        except Exception as e:
            STATE["setup"] += f"; self-removal failed: {e}"


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def reply(self, code, body, ctype="text/plain"):
        if isinstance(body, str):
            body = body.encode()
        self.send_response(code)
        self.send_header("content-type", ctype)
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def path_of(self, q):
        p = os.path.realpath(os.path.join(W, q.get("path", [""])[0]))
        return p if p.startswith(W + "/") else None

    def handle_any(self, post):
        u = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(u.query)
        if not TOKEN or q.get("token", [""])[0] != TOKEN:
            return self.reply(403, "no")
        body = self.rfile.read(int(self.headers.get("content-length") or 0)) if post else b""
        if u.path == "/status":
            db = f"{W}/var/db.jsonl"
            n = sum(1 for _ in open(db)) if os.path.exists(db) else 0
            ps = subprocess.run(["bash", "-c", "pgrep -fc 'engine_v[0-9]' ; pgrep -fa 'tools/(varsearch|improve)' | cut -c1-150"], capture_output=True, text=True).stdout
            return self.reply(200, json.dumps({"uptime_s": round(time.time() - T0), "load": os.getloadavg(), "cpus": os.cpu_count(), "db_lines": n, "setup": STATE["setup"], "jobs": ps, "has_pod_key": bool(os.environ.get("RUNPOD_API_KEY")), "pod": os.environ.get("RUNPOD_POD_ID")}), "application/json")
        p = self.path_of(q)
        if u.path == "/file" and p and os.path.exists(p):
            return self.reply(200, open(p, "rb").read(), "application/octet-stream")
        if u.path == "/tail" and p and os.path.exists(p):
            n = int(q.get("n", ["40"])[0])
            return self.reply(200, "".join(open(p, errors="replace").readlines()[-n:]))
        if post and u.path == "/put" and p:
            os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, "wb").write(body)
            return self.reply(200, f"wrote {len(body)} bytes")
        if post and u.path == "/exec":
            STATE["execs"] += 1
            log = f"{W}/logs/exec-{STATE['execs']}.log"
            subprocess.Popen(["bash", "-c", f"cd {W} && ( {body.decode()} ) >> {log} 2>&1"])
            return self.reply(200, f"started, log logs/exec-{STATE['execs']}.log")
        return self.reply(404, "not found")

    def do_GET(self):
        self.handle_any(False)

    def do_POST(self):
        self.handle_any(True)


if __name__ == "__main__":
    if not os.environ.get("SKIP_SETUP"):
        threading.Thread(target=setup, daemon=True).start()
        threading.Thread(target=watchdog, daemon=True).start()
    ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT", "8000"))), H).serve_forever()
