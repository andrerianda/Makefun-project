#!/bin/bash
# Unattended loop for this machine: sample quicker wins with the fast simulator for a few hours,
# then replay the new simulator bests with the real Python engine, and again.  Everything is
# resumable from the results database, so the loop can be killed and started at any time.
# usage: nightshift.sh [hours of sampling per cycle, default 4] [engine source, default the repository's engine.py]
H=${1:-4}
E=${2:-/home/user/Makefun-project/engine.py}
cd /root/makefun-work
while [ ! -e var/nightshift.stop ]; do
  python3 tools/autoplan.py --fast --jobs 4 --worst 40 --hours "$H" --log logs/autoplan-fast.log >> logs/autoplan-fast.out 2>&1
  [ -e var/nightshift.stop ] && break
  python3 tools/confirm.py --engine "$E" --jobs 4 >> logs/confirm-loop.txt 2>&1
  echo "$(date -u +'%m-%d %H:%M') cycle done" >> logs/nightshift.log
done
