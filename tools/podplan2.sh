#!/bin/bash
# The rented machine's work list (78-variant engine): finish the first pass, then rounds of
# quicker-win sampling in the ratio that pays best per CPU second (3 weak : 2 middle : 1 strong).
E=/root/makefun-work/logs/engine.py
J=${JOBS:-8}
cd /root/makefun-work
python3 tools/varsearch.py --engine $E --variants 0-11 --jobs $J >> logs/build.txt 2>&1
python3 tools/varsearch.py --engine $E --variants 0-78 --jobs $J >> logs/build2.txt 2>&1
echo COVER-DONE >> logs/plan.log
for c in $(seq 1 99); do
  python3 tools/improve.py --engine $E --opps depth-2,depth-3,depth-4 --rounds 3 --jobs $J >> logs/improve.txt 2>&1
  python3 tools/improve.py --engine $E --opps nodes-100k,nodes-250k --rounds 2 --jobs $J >> logs/improve.txt 2>&1
  python3 tools/improve.py --engine $E --opps nodes-500k,nodes-1M,nodes-2M --rounds 1 --jobs $J >> logs/improve.txt 2>&1
  echo "CYCLE $c done $(date -u +%H:%M)" >> logs/plan.log
done
