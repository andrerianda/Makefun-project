#!/bin/bash
# The rented machine's work list: finish the first pass of the variant table for the
# opponents the main machine has not reached, then sample for quicker wins, round after round.
E=/root/makefun-work/logs/engine.py
J=${JOBS:-8}
cd /root/makefun-work
python3 tools/varsearch.py --engine $E --opps nodes-1M,nodes-500k,nodes-250k,nodes-100k --variants 0-7 --jobs $J >> logs/build.txt 2>&1
python3 tools/varsearch.py --engine $E --variants 0-35 --jobs $J >> logs/build2.txt 2>&1
echo COVER-DONE >> logs/build2.txt
for round in $(seq 1 60); do
  python3 tools/improve.py --engine $E --opps depth-2,depth-3,depth-4 --rounds 1 --jobs $J >> logs/improve.txt 2>&1
  python3 tools/improve.py --engine $E --opps nodes-100k,nodes-250k --rounds 1 --jobs $J >> logs/improve.txt 2>&1
  python3 tools/improve.py --engine $E --opps nodes-500k,nodes-1M,nodes-2M --rounds 1 --jobs $J >> logs/improve.txt 2>&1
done
echo IMPROVE-DONE >> logs/improve.txt
