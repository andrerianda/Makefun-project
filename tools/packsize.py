#!/usr/bin/env python3
"""Estimate the size makefun compress would give a source: the makefun-compress/v1 stub
(#coding:l1 + exec(lzma.decompress('...'.encode('l1')))) around an LZMA-alone stream
(lc=3 lp=0 pb=0, 4 KiB dictionary), with the stream's bytes escaped inside the literal."""
import lzma, sys

def packed(data):
    best = None
    for lc in (3,):
        raw = lzma.compress(data, format=lzma.FORMAT_ALONE, filters=[{"id": lzma.FILTER_LZMA1, "dict_size": 4096, "lc": lc, "lp": 0, "pb": 0, "preset": 9 | lzma.PRESET_EXTREME}])
        esc = sum(2 if c in (0, 10, 13, 39, 92) else 1 for c in raw)
        n = len("#coding:l1\nimport lzma;exec(lzma.decompress('") + esc + len("'.encode('l1')))\n")
        best = n if best is None else min(best, n)
    return best, len(raw)

for p in sys.argv[1:]:
    d = open(p, "rb").read()
    n, raw = packed(d)
    print(f"{p}: source {len(d)} -> est packed {n} (lzma {raw})  budget left {4096 - n}")
