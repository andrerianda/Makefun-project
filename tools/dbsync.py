#!/usr/bin/env python3
"""Two-way merge of the result database with the rented machine's.

usage: dbsync.py <pod url> <token>
Lines the pod has and we lack are appended here; lines we have and the pod lacks are sent to
it and appended there (append only on both sides, so running searches are never disturbed)."""
import json, sys, time, urllib.request

url, tok = sys.argv[1], sys.argv[2]
LOCAL = "/root/makefun-work/var/db.jsonl"


def key(r):
    return (r["engine"], r["opponent"], r["colour"], r["opening"], r["variant"], r.get("nodes"))


def lines(text):
    out = {}
    for ln in text.splitlines():
        ln = ln.strip()
        if ln:
            try:
                out[key(json.loads(ln))] = ln
            except Exception:
                pass
    return out


mine = lines(open(LOCAL).read())
UA = {"user-agent": "curl/8.5.0"}
theirs = lines(urllib.request.urlopen(urllib.request.Request(f"{url}/file?token={tok}&path=var/db.jsonl", headers=UA), timeout=120).read().decode())
new_here = [ln for k, ln in theirs.items() if k not in mine]
new_there = [ln for k, ln in mine.items() if k not in theirs]
if new_here:
    with open(LOCAL, "a") as fh:
        fh.write("\n".join(new_here) + "\n")
if new_there:
    name = f"var/extra-{int(time.time())}.jsonl"
    urllib.request.urlopen(urllib.request.Request(f"{url}/put?token={tok}&path={name}", ("\n".join(new_there) + "\n").encode(), UA), timeout=120).read()
    urllib.request.urlopen(urllib.request.Request(f"{url}/exec?token={tok}", f"cat {name} >> var/db.jsonl".encode(), UA), timeout=60).read()
print(f"pod has {len(theirs)} results, local had {len(mine)}: +{len(new_here)} here, +{len(new_there)} sent to the pod")
