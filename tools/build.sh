#!/bin/bash
# First pass of the variant table: for every scenario, try variants until one wins.
# Resumable: every finished game is in var/db.jsonl and is not played again.
E=${1:-/root/makefun-work/logs/engine_v7b.py}
cd /root/makefun-work
python3 tools/varsearch.py --engine $E --opps depth-2,depth-3,depth-4 --variants 0-3 --jobs 4 >> logs/build.txt 2>&1
python3 tools/varsearch.py --engine $E --opps nodes-2M,nodes-1M --variants 0-7 --jobs 4 >> logs/build.txt 2>&1
python3 tools/varsearch.py --engine $E --opps nodes-500k,nodes-250k,nodes-100k --variants 0-7 --jobs 4 >> logs/build.txt 2>&1
echo BUILD-DONE >> logs/build.txt
