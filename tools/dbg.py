#!/usr/bin/env python3
"""Replay one scenario with the logging driver: dbg.py ENGINE_SRC NODES opponent:colour:opening OUTFILE"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run
src, nodes, scen, out = sys.argv[1:5]
var = sys.argv[5] if len(sys.argv) > 5 else None
r = run.play(os.path.join(os.path.dirname(os.path.abspath(__file__)), "dbg_engine.py"), run.parse_games(scen), limit_ms=600000,
             env_extra={"ENGINE_SRC": os.path.abspath(src), "NODES": nodes} | ({"VAR": var} if var is not None else {}))
open(out, "w").write(r["stderr"])
