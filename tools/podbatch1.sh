#!/bin/bash
# Experiment batch 1 on the rented machine: styles, conversion heuristics and node budgets,
# each on the same scenarios; then the first pass of the table so that no core idles.
cd /root/makefun-work
J=${JOBS:-8}
P=$(( J / 8 )); [ $P -lt 1 ] && P=1
B=logs/engine.py
X=tools/cand/engine_x.py
mkv(){ sed "s/^TB=.*/TB='$2'*640/" $1 > $3; }
mkv $B 0 logs/b0.py; mkv $B c logs/b12.py; mkv $B o logs/b24.py; mkv $X 0 logs/x0.py
W="--opps depth-2,depth-3,depth-4 --openings 10"
M="--opps nodes-100k,nodes-250k --openings 10"
: > logs/batch1.cmds
for f in b0 b12 b24; do
  echo "python3 tools/match.py --engine logs/$f.py $W --jobs 8 --tag ab-$f-weak" >> logs/batch1.cmds
  echo "python3 tools/match.py --engine logs/$f.py $M --jobs 8 --tag ab-$f-mid" >> logs/batch1.cmds
done
for e in 1 2 4 8 15; do
  echo "python3 tools/match.py --engine logs/x0.py $W --jobs 8 --env EXPT=$e --tag ab-x$e-weak" >> logs/batch1.cmds
  echo "python3 tools/match.py --engine logs/x0.py $M --jobs 8 --env EXPT=$e --tag ab-x$e-mid" >> logs/batch1.cmds
done
for n in 300000 500000; do
  echo "python3 tools/match.py --engine logs/b0.py $W --jobs 8 --nodes $n --tag ab-n$n-weak" >> logs/batch1.cmds
done
xargs -P $P -I{} bash -c "{} > /dev/null 2>&1" < logs/batch1.cmds
echo BATCH1-DONE >> logs/plan.log
bash tools/podplan.sh
