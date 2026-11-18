#!/usr/bin/env python3
# Create, inspect or terminate the rented GPU pod. Keys and tokens stay in /root/.config/marazul/.
import base64, json, os, secrets, sys, urllib.request
CFG = '/root/.config/marazul'
KEY = open(CFG + '/runpod.key').read().strip()
W = os.environ.get('MARAZUL_GPU_CFG', CFG + '/gpu-worker.json')
NAME = os.environ.get('MARAZUL_POD_NAME', 'marazul-bake')

def gql(query, variables=None):
    body = json.dumps({'query': query, 'variables': variables or {}}).encode()
    req = urllib.request.Request('https://api.runpod.io/graphql', data=body, headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + KEY})
    return json.loads(urllib.request.urlopen(req, timeout=60).read())

def create(gpu):
    token = secrets.token_hex(24)
    worker = base64.b64encode(open('/opt/marazul-tools/gpu_worker.py', 'rb').read()).decode()
    q = '''mutation($input: PodFindAndDeployOnDemandInput) { podFindAndDeployOnDemand(input: $input) { id imageName machineId costPerHr } }'''
    inp = {
        'cloudType': 'ALL', 'gpuCount': 1, 'volumeInGb': 0, 'containerDiskInGb': 30, 'minVcpuCount': int(os.environ.get('MIN_VCPU','2')), 'minMemoryInGb': int(os.environ.get('MIN_MEM','8')),
        'gpuTypeId': gpu, 'name': NAME, 'imageName': 'runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04',
        'dockerArgs': 'python3 -c "import os,base64;exec(base64.b64decode(os.environ[\'WORKER_B64\']))"',
        'ports': '8000/http',
        'env': [{'key': 'WORKER_B64', 'value': worker}, {'key': 'WORKER_TOKEN', 'value': token}, {'key': 'RP_KEY', 'value': KEY},
                {'key': 'SLOTS', 'value': os.environ.get('SLOTS', '4')}, {'key': 'IDLE_MIN', 'value': os.environ.get('IDLE_MIN', '30')}, {'key': 'MAX_HOURS', 'value': os.environ.get('MAX_HOURS', '8')}],
    }
    pod = None
    for cloud in os.environ.get('CLOUD', 'COMMUNITY,ALL').split(','):
        inp['cloudType'] = cloud
        d = gql(q, {'input': inp})
        pod = (d.get('data') or {}).get('podFindAndDeployOnDemand')
        if pod:
            break
        print('create failed on', cloud, ':', json.dumps(d)[:300])
    if not pod:
        sys.exit(1)
    cfg = {'pod_id': pod['id'], 'url': 'https://%s-8000.proxy.runpod.net' % pod['id'], 'token': token, 'gpu': gpu, 'cost_per_hr': pod.get('costPerHr')}
    fd = os.open(W, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    os.write(fd, json.dumps(cfg).encode()); os.close(fd)
    print('created pod', pod['id'], 'gpu', gpu, 'cost/hr', pod.get('costPerHr'))

def status():
    d = gql('query { myself { clientBalance currentSpendPerHr pods { id name desiredStatus costPerHr runtime { uptimeInSeconds } } } }')
    m = (d.get('data') or {}).get('myself') or {}
    print('balance %.2f spend/hr %s' % (m.get('clientBalance') or 0, m.get('currentSpendPerHr')))
    for p in m.get('pods') or []:
        print(' pod', p['id'], p['name'], p['desiredStatus'], 'cost/hr', p.get('costPerHr'), 'uptime_s', (p.get('runtime') or {}).get('uptimeInSeconds'))

def terminate():
    d = gql('query { myself { pods { id name } } }')
    for p in ((d.get('data') or {}).get('myself') or {}).get('pods') or []:
        if p['name'] == NAME:
            print('terminating', p['id'], json.dumps(gql('mutation { podTerminate(input: {podId: "%s"}) }' % p['id']))[:200])
    if os.path.exists(W):
        os.remove(W)

def health():
    cfg = json.load(open(W))
    req = urllib.request.Request(cfg['url'] + '/health', headers={'X-Token': cfg['token'], 'User-Agent': 'curl/8.5.0', 'Accept': '*/*'})
    print(urllib.request.urlopen(req, timeout=40).read().decode()[:2500])

cmd = sys.argv[1] if len(sys.argv) > 1 else 'status'
{'create': lambda: create(sys.argv[2] if len(sys.argv) > 2 else 'NVIDIA GeForce RTX 3090'), 'status': status, 'terminate': terminate, 'health': health}[cmd]()
