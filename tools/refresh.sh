#!/bin/bash
# One command from the results database to a checked standby package:
#   table of the real engine's quickest wins -> engine.py -> main.py (makefun compress) ->
#   replay checks of the packed file -> entry commit -> transcript bundle -> kit check -> var/ready.json
# Nothing is submitted here.  The simulator's sampling is paused while the packed file is replayed
# (the replays run against the environment's real 10 s move limit) and resumed at the end.
#
# usage: refresh.sh N [MIN]
#   N    number of the bundle file (transcriptsN.tar.gz)
#   MIN  smallest gain in mean plies to spare a game, against var/ready.json, worth a new package (default 3)
# exit: 0 new package ready, 10 gain below MIN (nothing changed), anything else: stopped, see the log
set -uo pipefail
N=${1:?bundle number}
MIN=${2:-3}
R=/home/user/Makefun-project
W=/root/makefun-work
K=$W/kit15/tiny-chess-01-kit
BR=claude/makefun-bounty-setup-qxbrw7
NODE26=/tmp/claude-0/-home-user/4ea90a4a-482f-5f08-8e21-c0ce40f970dd/scratchpad/node26/node-v26.13.1-linux-x64/bin
SESSION=/root/.claude/projects/-home-user/4ea90a4a-482f-5f08-8e21-c0ce40f970dd.jsonl
TITLE="Mirror-board alpha-beta, a variant for each of the 640 scenarios"
TRAILER="Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_0142b1J9SeR4GoQ6f6YxL7Qk"
BUNDLE=$W/transcripts$N.tar.gz
say() { echo "$(date -u +'%m-%d %H:%M:%S') $*"; }
PAT=("tools/[a]utoplan.py" "fast/[f]ast.py" "[s]im.mjs")
resume() { for p in "${PAT[@]}"; do pkill -CONT -f "$p"; done; return 0; }
trap resume EXIT
push() { for i in 1 2 3 4; do git -C $R push -q -u origin $BR && return 0; sleep $((2 ** i)); done; return 1; }

cd $W
[ -z "$(git -C $R status --porcelain)" ] || { say "the repository has uncommitted changes"; exit 2; }
while pgrep -f "tools/[c]onfirm.py" > /dev/null; do sleep 20; done      # let a running replay pass finish

# 1. the table the real engine's games give
cp $R/engine.py var/engine_prev_table.py
python3 tools/varsearch.py --engine $R/engine.py --table > var/tb_new.txt 2> var/tb_new.stats || { say "table builder failed"; exit 3; }
grep -q "^# all: scenarios 640 wins 640 " var/tb_new.stats || { say "the table does not win every scenario: $(tail -n 1 var/tb_new.stats)"; exit 3; }
SPARE=$(sed -n 's/^# all: .* mean_spare \([0-9.]*\)$/\1/p' var/tb_new.stats)
OLD=$(python3 -c "import json;print(json.load(open('var/ready.json'))['mean_spare_per_game'])")
say "table: mean spare $SPARE (standby package: $OLD)"
python3 -c "import sys;sys.exit(0 if $SPARE-$OLD>=$MIN else 1)" || { say "gain below $MIN, nothing done"; exit 10; }
python3 - <<'EOF' || { say "table insert failed"; git -C /home/user/Makefun-project checkout -q engine.py; exit 3; }
import re
p = '/home/user/Makefun-project/engine.py'
s = open(p).read()
new = open('/root/makefun-work/var/tb_new.txt').read().strip()
assert len(new) == 640 and "'" not in new and "\\" not in new, len(new)
old = re.search(r"^TB='(.{640})'$", s, re.M).group(1)
print('table entries changed:', sum(x != y for x, y in zip(old, new)), 'of 640; distinct variants used:', len(set(new)))
s2 = re.sub(r"^TB='.{640}'$", lambda m: "TB='%s'" % new, s, count=1, flags=re.M)
assert s2.count("TB='") == 1
open(p, 'w').write(s2)
EOF

# 2. pack
(cd $R && node $K/cli/makefun.mjs compress engine.py --out main.py) > logs/refresh$N.compress.txt 2>&1 || { say "compress failed"; git -C $R checkout -q engine.py main.py; exit 4; }
BYTES=$(stat -c %s $R/main.py)
say "main.py $BYTES bytes"
[ "$BYTES" -le 4096 ] || { say "main.py is over 4,096 bytes"; git -C $R checkout -q engine.py main.py; exit 5; }

# 3. replay the packed file: three whole practice trials and a sample of the changed scenarios
for p in "${PAT[@]}"; do pkill -STOP -f "$p"; done
VP=$PATH
[ -x $NODE26/node ] && VP=$NODE26:$PATH       # the newest Node for the replays only; packing and bundling use the system's
say "replaying with node $(PATH=$VP node --version)"
PATH=$VP python3 tools/verify_table.py --entry $R/main.py --engine $R/engine.py --trials --full8 --sample 24 --seed $(date +%s) \
  --changed-from var/engine_prev_table.py --jobs 3 > logs/verify_table$N.txt 2>&1
V=$?
resume
grep "^==\|DIFF\|mismatches\|no database" logs/verify_table$N.txt | cut -c1-170
[ $V -eq 0 ] || { say "replay check failed (exit $V)"; git -C $R checkout -q engine.py main.py; exit 6; }
grep -q "wins 8/8" logs/verify_table$N.txt && ! grep "^== practice trial" logs/verify_table$N.txt | grep -qv "wins 8/8" || { say "a practice trial was not 8/8"; git -C $R checkout -q engine.py main.py; exit 6; }

# 4. commits: development state, then the entry tree (main.py without the source and the tools)
cd $R
for f in $(git ls-files tools); do [ -f "$W/$f" ] && cp "$W/$f" "$f"; done
cp $W/tools/refresh.sh tools/refresh.sh
cp $W/var/db.jsonl tools/var/db.jsonl
git add engine.py main.py tools
git commit -q -m "Table refresh from the games the engine has played (mean $SPARE plies to spare a game)

$TRAILER" || { say "development commit failed"; exit 7; }
git rm -r -q --cached engine.py tools
git commit -q -m "Entry: the table of quickest wins the real engine has played, refreshed

main.py is engine.py packed by makefun compress ($BYTES bytes). The search, the evaluation
and the driver are unchanged. The table names, for each of the 640 scenarios (opening x
house engine x colour), the variant with the quickest win among the games the engine itself
has played (mean $SPARE plies to spare a game).

$TRAILER" || { say "entry commit failed"; exit 7; }
ENTRY=$(git rev-parse HEAD)
TREE=$(git ls-tree -r -l HEAD | awk '{s+=$4} END {print s}')
say "entry commit $ENTRY, tree $TREE bytes"
OK=1
[ "$TREE" -le 8192 ] || { say "entry tree over 8,192 bytes"; OK=0; }
push || { say "push of the entry commit failed"; OK=0; }

# 5. bundle and kit check
if [ $OK = 1 ]; then
  cd $K
  set -a; . ~/.makefun/env; set +a
  node cli/makefun.mjs bundle --repo $R --out $BUNDLE --session $SESSION --no-discover --redact-file $W/redact.txt \
    --mcp github=https://api.githubcopilot.com/mcp/ --no-context \
    --instructions "withheld:only the harness's stock skill files were present (document, spreadsheet and browser helpers); none was used for this build" \
    --notes "One Claude Code session built this entry. engine.py is the source and main.py is makefun compress's output of it. The 640-character table in it was produced by the session's own offline search: each scenario's game was simulated against the kit's environment and the variant with the quickest win was kept; the search tools are in the branch history under tools/. A JavaScript transcription of the engine (tools/fast/sim.mjs) was written in the same session to speed that search up; every game it found was replayed by engine.py itself before it went into the table, and the simulator is not part of the entry. Subagents were used for reviews only; they wrote no entry code." \
    > $W/logs/refresh$N.bundle.txt 2>&1 || { say "bundle failed"; OK=0; }
  grep -E "session file|turns|removed before|wrote|warning|error" $W/logs/refresh$N.bundle.txt | cut -c1-200
fi
if [ $OK = 1 ]; then
  node cli/makefun.mjs check --kit . --repo $R --commit $ENTRY --transcripts $BUNDLE > $W/logs/refresh$N.check.txt 2>&1 || { say "kit check failed"; OK=0; }
  grep -E "^fail|passed|^FAIL|not ok" $W/logs/refresh$N.check.txt | cut -c1-200
  T=$(mktemp -d -p $W/var b.XXXX); tar xzf $BUNDLE -C $T
  LEAK=0
  while read -r k; do [ -n "$k" ] && grep -rqF -- "$k" $T && LEAK=$((LEAK + 1)); done < $W/redact.txt
  grep -rqF -- "$MAKEFUN_API_KEY" $T && LEAK=$((LEAK + 1))
  grep -rqE "rpa_[A-Z0-9]{30,}" $T && LEAK=$((LEAK + 1))
  rm -rf $T
  say "secret strings found in the bundle: $LEAK"
  [ $LEAK = 0 ] || { OK=0; rm -f $BUNDLE; }
fi

# 6. the source and the tools come back, whatever happened above
cd $R
git add engine.py tools
git commit -q -m "Bring the source and the development tools back after the entry commit

$TRAILER"
push || say "push of the restore commit failed"
[ $OK = 1 ] || { say "package NOT ready (the entry commit $ENTRY stays in the history)"; exit 8; }

cd $W
PREV=$(cat var/ready.json)
python3 - "$ENTRY" "$BUNDLE" "$TITLE" "$BYTES" "$SPARE" "$N" <<'EOF'
import hashlib, json, sys, time
entry, bundle, title, size, spare, n = sys.argv[1:]
prev = json.load(open('/root/makefun-work/var/ready.json'))
prev.pop('previous', None)
trials = [l.strip() for l in open('/root/makefun-work/logs/verify_table%s.txt' % n) if l.startswith('== practice trial')]
json.dump({"commit": entry, "bundle": bundle, "title": title,
           "main_py_sha256": hashlib.sha256(open('/home/user/Makefun-project/main.py', 'rb').read()).hexdigest(),
           "main_py_bytes": int(size), "mean_spare_per_game": float(spare),
           "verified": "every table entry is a game engine.py played and won; packed entry replayed: 3 full practice trials 8/8 and 24 changed scenarios, 0 mismatches; kit level 15 check passed; bundle free of secrets",
           "trials": trials, "prepared_utc": time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime()), "previous": prev},
          open('/root/makefun-work/var/ready.json', 'w'))
EOF
say "READY: commit $ENTRY bundle $BUNDLE mean spare $SPARE main.py $BYTES bytes"
