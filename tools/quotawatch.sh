#!/bin/bash
# Poll the account's entry quota for tiny-chess-01 and end as soon as an entry can be sent.
# Every sixth poll it also reads the competition record and ends if the environment, generator or
# scorer build is no longer the one the results database was made with.
# usage: quotawatch.sh [minutes to watch, default 115] [seconds between polls, default 300]
# exit 0: can_submit is true; exit 3: still closed when the watch time ran out; exit 4: a build changed.
# The API key is read from ~/.makefun/env and never printed.
set -u
. ~/.makefun/env
END=$(( $(date +%s) + ${1:-115} * 60 ))
EVERY=${2:-300}
LOG=/root/makefun-work/logs/quotawatch.log
WANT="env_sha256=c9ec5fd733c0243262e66a4562cbf1a9de08028d925c4c6bdbc0dec8c7a90ca8 generator_sha256=6d1010231173de81549b4857ebbb81ec515f2a71683762c99dcca458b3bca261 scorer_sha256=10e864ee63a534b81f79fa86ac4026f803a484c7a3958cf4598518ef5585976e"
last=""
n=0
while :; do
  j=$(curl -sS -m 30 -H "x-api-key: $MAKEFUN_API_KEY" https://make.fun/api/competitions/tiny-chess-01/quota 2>/dev/null || true)
  s=$(printf '%s' "$j" | python3 -c 'import json,sys
try:
    d=json.load(sys.stdin); print("can_submit=%s made=%s kept=%s day_left=%s total_left=%s entries_left=%s" % (d.get("can_submit"), d.get("entries_made"), d.get("entries_kept"), d.get("day",{}).get("left"), d.get("total",{}).get("left"), d.get("entries_left")))
except Exception as e:
    print("unreadable answer")' 2>/dev/null)
  if [ "$s" != "$last" ]; then echo "$(date -u +'%m-%d %H:%M') $s" | tee -a "$LOG"; last="$s"; fi
  case "$s" in can_submit=True*) echo "QUOTA OPEN"; exit 0;; esac
  if [ $(( n % 6 )) -eq 0 ]; then
    got=$(curl -sS -m 60 https://make.fun/api/competitions/tiny-chess-01 2>/dev/null | python3 -c 'import re,sys
t=sys.stdin.read()
print(" ".join("%s=%s" % (k, (re.findall(r"\"%s\"\s*:\s*\"([0-9a-f]{64})\"" % k, t) or ["?"])[0]) for k in ("env_sha256","generator_sha256","scorer_sha256")))' 2>/dev/null)
    case "$got" in
      "$WANT") ;;
      *\?*|"") ;;   # the record could not be read this time: try again at the next round
      *) echo "$(date -u +'%m-%d %H:%M') BUILD CHANGED: $got" | tee -a "$LOG"; exit 4;;
    esac
  fi
  n=$(( n + 1 ))
  [ "$(date +%s)" -ge "$END" ] && { echo "$(date -u +'%m-%d %H:%M') still closed"; exit 3; }
  sleep "$EVERY"
done
