#!/bin/bash
# Detached guard for the entry quota of tiny-chess-01.  It polls the quota and, the moment an entry
# can be sent, sends the standby package named in var/ready.json -- once -- and ends.  The owner
# gave standing permission to send verified packages; nothing else happens here (no final pick,
# no claim).  It runs outside the session's task list so that it keeps going while the session is idle.
#
# usage: autosubmit.sh [seconds between polls, default 120]
# files: logs/autosubmit.log      one line per change of the quota answer, and the outcome of a send
#        var/submitted.json       written after a successful send (commit, bundle, time, CLI output file)
#        var/autosubmit.failed    written when three sends in a row were refused although the quota was open
#        var/autosubmit.stop      create it to end the guard
# The API key is read from ~/.makefun/env and never printed.
set -u
set -a; . ~/.makefun/env; set +a
W=/root/makefun-work
K=$W/kit15/tiny-chess-01-kit
LOG=$W/logs/autosubmit.log
EVERY=${1:-120}
say() { echo "$(date -u +'%m-%d %H:%M:%S') $*" >> "$LOG"; }
last=""
tries=0
say "guard started (poll every ${EVERY}s)"
while [ ! -e $W/var/autosubmit.stop ]; do
  j=$(curl -sS -m 30 -H "x-api-key: $MAKEFUN_API_KEY" https://make.fun/api/competitions/tiny-chess-01/quota 2>/dev/null || true)
  s=$(printf '%s' "$j" | python3 -c 'import json,sys
try:
    d=json.load(sys.stdin); print("can_submit=%s made=%s kept=%s day_left=%s total_left=%s" % (d.get("can_submit"), d.get("entries_made"), d.get("entries_kept"), d.get("day",{}).get("left"), d.get("total",{}).get("left")))
except Exception:
    print("unreadable answer")' 2>/dev/null)
  if [ "$s" != "$last" ]; then say "$s"; last="$s"; fi
  case "$s" in can_submit=True*)
    r=$(python3 -c 'import json,os,sys
try:
    d=json.load(open("/root/makefun-work/var/ready.json"))
    assert len(d["commit"])==40 and os.path.isfile(d["bundle"])
    print(d["commit"]); print(d["bundle"]); print(d["title"])
except Exception as e:
    sys.exit(1)') || { say "quota open but var/ready.json is not usable right now"; sleep 20; continue; }
    commit=$(printf '%s\n' "$r" | sed -n 1p); bundle=$(printf '%s\n' "$r" | sed -n 2p); title=$(printf '%s\n' "$r" | sed -n 3p)
    out=$W/logs/submit-$(date -u +%m%d-%H%M%S).txt
    say "quota open: sending commit $commit with $bundle"
    (cd $K && node cli/makefun.mjs submit --competition tiny-chess-01 --repo-url https://github.com/andrerianda/Makefun-project \
       --commit "$commit" --title "$title" --bundle "$bundle") > "$out" 2>&1
    rc=$?
    if [ $rc -eq 0 ]; then
      python3 -c 'import json,sys,time
json.dump({"commit":sys.argv[1],"bundle":sys.argv[2],"title":sys.argv[3],"sent_utc":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"cli_output":sys.argv[4]},open("/root/makefun-work/var/submitted.json","w"))' "$commit" "$bundle" "$title" "$out"
      say "SENT (exit 0), CLI output in $out"
      exit 0
    fi
    tries=$((tries + 1))
    say "send refused (exit $rc, try $tries), see $out: $(tail -n 2 "$out" | tr '\n' ' ' | cut -c1-240)"
    if [ $tries -ge 3 ]; then echo "$out" > $W/var/autosubmit.failed; say "three refusals: guard ends, the session decides"; exit 5; fi
    ;;
  esac
  sleep "$EVERY"
done
say "guard stopped by var/autosubmit.stop"
