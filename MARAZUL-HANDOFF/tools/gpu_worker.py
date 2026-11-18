# GPU bake worker for a rented pod: runs commands sent by the build machine in a mirror of the
# repository's art/ directory and hands back the files they produce. Token-protected; terminates
# its own pod when idle so it never bills while unused.
import base64, io, json, os, subprocess, sys, tarfile, threading, time, urllib.request, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

TOKEN = os.environ.get('WORKER_TOKEN', '')
RP_KEY = os.environ.get('RP_KEY', '')
POD_ID = os.environ.get('RUNPOD_POD_ID', '')
IDLE_MIN = float(os.environ.get('IDLE_MIN', '30'))
MAX_HOURS = float(os.environ.get('MAX_HOURS', '8'))
START = time.time()
state = {'setup': 'starting', 'last_activity': time.time(), 'setup_log': ''}
jobs = {}
slots = threading.Semaphore(int(os.environ.get('SLOTS', '4')))

def sh(cmd, log):
    p = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    for line in p.stdout:
        log(line)
    return p.wait()

def setup():
    def log(line):
        state['setup_log'] = (state['setup_log'] + line)[-6000:]
    steps = [
        'for i in 1 2 3 4 5 6; do apt-get update -qq; DEBIAN_FRONTEND=noninteractive apt-get install -y -qq libxi6 libxxf86vm1 libxfixes3 libxrender1 libgl1 libxkbcommon0 libsm6 libegl1 curl ca-certificates zstd >/dev/null 2>&1 && ldconfig -p | grep -q libXrender.so.1 && break; echo apt retry $i; sleep 15; done; ldconfig -p | grep -q libXrender.so.1',
        'curl -LsSf https://astral.sh/uv/install.sh | sh',
        '/root/.local/bin/uv venv --python 3.13 /opt/marazul-blender',
        '/root/.local/bin/uv pip install --python /opt/marazul-blender/bin/python bpy==5.3.0 numpy pillow',
        'mkdir -p /tmp/marazul /jobs && nvidia-smi --query-gpu=name,memory.total --format=csv,noheader',
        "/opt/marazul-blender/bin/python -c \"import bpy; p=bpy.context.preferences.addons['cycles'].preferences; p.compute_device_type='OPTIX'; p.get_devices(); print('devices', [(d.name, d.type) for d in p.devices])\"",
    ]
    for i, s in enumerate(steps):
        state['setup'] = 'step %d/%d' % (i + 1, len(steps))
        log('$ ' + s[:120] + '\n')
        if sh(s, log) != 0:
            state['setup'] = 'failed at step %d' % (i + 1)
            return
    state['setup'] = 'ready'
    state['last_activity'] = time.time()

def run_job(job):
    with slots:
        # A client that stopped polling gave up (timed out or was killed): skip its queued job.
        if time.time() - job.get('last_poll', job['created']) > 90:
            job['status'] = 'done'; job['returncode'] = 125; job['ended'] = time.time()
            open(job['log'], 'w').write('worker: client stopped polling; job skipped\n')
            return
        job['status'] = 'running'; job['started'] = time.time()
        env = dict(os.environ, MARAZUL_GPU='1', PATH='/opt/marazul-blender/bin:' + os.environ.get('PATH', ''))
        try:
            with open(job['log'], 'w') as lf:
                p = subprocess.Popen(job['cmd'], cwd=job['work'], stdout=lf, stderr=subprocess.STDOUT, env=env)
                job['pid'] = p.pid
                try:
                    job['returncode'] = p.wait(timeout=job['timeout'])
                except subprocess.TimeoutExpired:
                    p.kill(); job['returncode'] = 124
        except Exception as e:
            job['returncode'] = 127
            open(job['log'], 'a').write('worker error: %r\n' % (e,))
        job['ended'] = time.time(); job['status'] = 'done'
        state['last_activity'] = time.time()

def result_tar(job):
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w:gz') as tar:
        for root, prefix in ((job['work'], 'repo'), ('/tmp/marazul', 'tmp')):
            for dp, dn, fn in os.walk(root):
                dn[:] = [d for d in dn if d not in ('__pycache__', '.git', 'node_modules')]
                for f in fn:
                    full = os.path.join(dp, f)
                    try:
                        if os.path.getmtime(full) >= job['started'] - 1 and not f.endswith('.pyc'):
                            tar.add(full, arcname=prefix + '/' + os.path.relpath(full, root))
                    except OSError:
                        pass
    return buf.getvalue()

def terminate(reason):
    print('terminating pod:', reason, flush=True)
    q = json.dumps({'query': 'mutation { podTerminate(input: {podId: "%s"}) }' % POD_ID}).encode()
    for _ in range(5):
        try:
            req = urllib.request.Request('https://api.runpod.io/graphql', data=q, headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + RP_KEY})
            urllib.request.urlopen(req, timeout=30).read(); return
        except Exception as e:
            print('terminate failed', e, flush=True); time.sleep(20)

def watchdog():
    while True:
        time.sleep(30)
        busy = any(j['status'] in ('queued', 'running') for j in jobs.values())
        if busy:
            state['last_activity'] = time.time()
        idle = time.time() - state['last_activity']
        if not POD_ID or not RP_KEY:
            continue
        if time.time() - START > MAX_HOURS * 3600:
            terminate('max lifetime'); time.sleep(600)
        elif not busy and idle > IDLE_MIN * 60:
            terminate('idle %.0f min' % (idle / 60)); time.sleep(600)

class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass
    def send(self, code, body, ctype='application/json'):
        if isinstance(body, (dict, list)):
            body = json.dumps(body).encode()
        self.send_response(code); self.send_header('Content-Type', ctype); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
    def ok(self):
        if TOKEN and self.headers.get('X-Token') == TOKEN:
            return True
        self.send(403, {'error': 'forbidden'}); return False
    def do_GET(self):
        if not self.ok():
            return
        u = urlparse(self.path); parts = [p for p in u.path.split('/') if p]
        if parts == ['health']:
            return self.send(200, {'setup': state['setup'], 'setup_log': state['setup_log'][-1500:], 'uptime_s': int(time.time() - START), 'idle_s': int(time.time() - state['last_activity']), 'idle_limit_min': IDLE_MIN, 'jobs': {k: v['status'] for k, v in jobs.items()}})
        if len(parts) >= 2 and parts[0] == 'job' and parts[1] in jobs:
            job = jobs[parts[1]]
            job['last_poll'] = time.time()
            if len(parts) == 2:
                off = int(parse_qs(u.query).get('offset', ['0'])[0])
                try:
                    with open(job['log'], 'rb') as f:
                        f.seek(off); chunk = f.read(200000)
                except OSError:
                    chunk = b''
                return self.send(200, {'status': job['status'], 'returncode': job.get('returncode'), 'log': chunk.decode('utf-8', 'replace'), 'next_offset': off + len(chunk), 'elapsed': round((job.get('ended') or time.time()) - job.get('started', job['created']), 1)})
            if parts[2] == 'result':
                if job['status'] != 'done':
                    return self.send(409, {'error': 'not done'})
                state['last_activity'] = time.time()
                return self.send(200, result_tar(job), 'application/gzip')
        self.send(404, {'error': 'not found'})
    def do_POST(self):
        if not self.ok():
            return
        u = urlparse(self.path)
        if u.path != '/run':
            return self.send(404, {'error': 'not found'})
        if state['setup'] != 'ready':
            return self.send(503, {'error': 'setting up', 'setup': state['setup']})
        q = parse_qs(u.query)
        cmd = json.loads(base64.urlsafe_b64decode(q['cmd'][0]).decode())
        body = self.rfile.read(int(self.headers.get('Content-Length', '0')))
        jid = uuid.uuid4().hex[:12]; work = '/jobs/%s/work' % jid; os.makedirs(work)
        if body:
            with tarfile.open(fileobj=io.BytesIO(body), mode='r:gz') as tar:
                tar.extractall(work, filter='data')
        job = {'id': jid, 'cmd': cmd, 'work': work, 'log': '/jobs/%s/log.txt' % jid, 'status': 'queued', 'created': time.time(), 'timeout': float(q.get('timeout', ['3600'])[0])}
        jobs[jid] = job; state['last_activity'] = time.time()
        threading.Thread(target=run_job, args=(job,), daemon=True).start()
        self.send(200, {'id': jid})

threading.Thread(target=setup, daemon=True).start()
threading.Thread(target=watchdog, daemon=True).start()
ThreadingHTTPServer(('0.0.0.0', 8000), H).serve_forever()
