#!/bin/bash
# Poll the account's entry quota for tiny-chess-01 and end as soon as an entry can be sent.
# usage: quotawatch.sh [minutes to watch, default 115] [seconds between polls, default 300]
# exit 0: can_submit is true; exit 3: still closed when the watch time ran out.
# The API key is read from ~/.makefun/env and never printed.
set -u
. ~/.makefun/env
END=$(( $(date +%s) + ${1:-115} * 60 ))
EVERY=${2:-300}
LOG=/root/makefun-work/logs/quotawatch.log
last=""
while :; do
  j=$(curl -sS -m 30 -H "x-api-key: $MAKEFUN_API_KEY" https://make.fun/api/competitions/tiny-chess-01/quota 2>/dev/null || true)
  s=$(printf '%s' "$j" | python3 -c 'import json,sys
try:
    d=json.load(sys.stdin); print("can_submit=%s made=%s kept=%s day_left=%s total_left=%s entries_left=%s" % (d.get("can_submit"), d.get("entries_made"), d.get("entries_kept"), d.get("day",{}).get("left"), d.get("total",{}).get("left"), d.get("entries_left")))
except Exception as e:
    print("unreadable answer")' 2>/dev/null)
  if [ "$s" != "$last" ]; then echo "$(date -u +'%m-%d %H:%M') $s" | tee -a "$LOG"; last="$s"; fi
  case "$s" in can_submit=True*) echo "QUOTA OPEN"; exit 0;; esac
  [ "$(date +%s)" -ge "$END" ] && { echo "$(date -u +'%m-%d %H:%M') still closed"; exit 3; }
  sleep "$EVERY"
done
