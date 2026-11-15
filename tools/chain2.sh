#!/bin/bash
# After the first pass: (1) scenarios still without a win get the remaining variants,
# (2) rounds of quicker-win sampling, cheapest opponents first.  Resumable (the database).
E=${1:-/root/makefun-work/logs/engine_v7b.py}
cd /root/makefun-work
while ! grep -q BUILD-DONE logs/build.txt 2>/dev/null; do sleep 20; done
python3 tools/varsearch.py --engine $E --variants 0-35 --jobs 4 >> logs/build2.txt 2>&1
echo COVER-DONE >> logs/build2.txt
for round in 1 2 3 4 5 6 7 8 9 10 11 12; do
  python3 tools/improve.py --engine $E --opps depth-2,depth-3,depth-4 --rounds 2 --jobs 4 >> logs/improve.txt 2>&1
  python3 tools/improve.py --engine $E --opps nodes-100k,nodes-250k --rounds 1 --jobs 4 >> logs/improve.txt 2>&1
  python3 tools/improve.py --engine $E --opps nodes-500k,nodes-1M,nodes-2M --rounds 1 --jobs 4 >> logs/improve.txt 2>&1
done
echo IMPROVE-DONE >> logs/improve.txt
