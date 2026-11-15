#!/bin/bash
# run the movegen check over several seeds in parallel
for seed in ${SEEDS:-1 2 3 4}; do
SEED=$seed python3 - <<PY &
import sys,os
sys.path.insert(0,'/root/makefun-work/tools')
import run
ops=list(run.BOOK)
seed=int(os.environ['SEED'])
games=[]
for i,o in enumerate(run.OPPONENTS[:3]):
    for j,c in enumerate(('white','black')):
        games.append((o,c,ops[(seed*7+i*2+j)%40]))
r=run.play('/root/makefun-work/tools/movegen_check.py',games,limit_ms=600000,env_extra={'SEED':str(seed)})
print('seed',seed,'exit',r['code'],r['stderr'][-1500:])
PY
done
wait
