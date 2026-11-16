#!/bin/bash
# Unattended cycle for this machine (successor of nightshift.sh):
#   1. sample quicker wins with the fast simulator for H hours (autoplan.py --fast),
#   2. replay the new simulator bests with the real Python engine (confirm.py),
#   3. if the confirmed table gained at least MIN plies a game on the standby package, build and
#      check a new standby package (refresh.sh auto).  Nothing is submitted here.
# Everything is resumable from the results database.  Stop: touch var/cycle.stop (ends after the current step).
# usage: cycle.sh [H=3] [MIN=4] [first step: sample|confirm]
H=${1:-3}
MIN=${2:-4}
F=${3:-sample}
E=/home/user/Makefun-project/engine.py
cd /root/makefun-work
while [ ! -e var/cycle.stop ]; do
  if [ "$F" != confirm ]; then
    python3 tools/autoplan.py --fast --jobs 4 --worst 40 --hours "$H" --log logs/autoplan-fast.log >> logs/autoplan-fast.out 2>&1
    [ -e var/cycle.stop ] && break
  fi
  F=sample
  python3 tools/confirm.py --engine "$E" --jobs 4 >> logs/confirm-loop.txt 2>&1
  [ -e var/cycle.stop ] && break
  bash tools/refresh.sh auto "$MIN" >> logs/refresh-auto.log 2>&1
  echo "$(date -u +'%m-%d %H:%M') cycle done, refresh exit $?" >> logs/cycle.log
done
