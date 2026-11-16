#!/bin/bash
# Guard for the rented machine: remove the pod when the balance runs low or the deadline passes,
# whatever else is going on.  usage: podwatch.sh <pod id> <deadline epoch seconds> [min balance]
source ~/.makefun/runpod.env
POD=$1; DEADLINE=$2; MINBAL=${3:-0.7}
while true; do
  BAL=$(curl -sS -m 30 -X POST "https://api.runpod.io/graphql" -H "Authorization: Bearer $RUNPOD_API_KEY" -H "content-type: application/json" -d '{"query":"query { myself { clientBalance } }"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['myself']['clientBalance'])" 2>/dev/null)
  NOW=$(date +%s)
  echo "$(date -u +%H:%M:%S) balance ${BAL:-?}" >> /root/makefun-work/logs/podwatch.log
  LOW=$(python3 -c "print(1 if '${BAL:-9}' not in ('','?') and float('${BAL:-9}') < $MINBAL else 0)" 2>/dev/null)
  if [ "$NOW" -ge "$DEADLINE" ] || [ "${LOW:-0}" = "1" ]; then
    CODE=$(curl -sS -m 60 -o /dev/null -w "%{http_code}" -X DELETE "https://rest.runpod.io/v1/pods/$POD" -H "Authorization: Bearer $RUNPOD_API_KEY")
    echo "$(date -u +%H:%M:%S) DELETE pod $POD -> $CODE" >> /root/makefun-work/logs/podwatch.log
    [ "$CODE" = "204" ] || [ "$CODE" = "200" ] || [ "$CODE" = "404" ] && exit 0
  fi
  sleep 120
done
