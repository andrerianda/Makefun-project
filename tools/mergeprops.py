# Dev tool (not part of the entry).
# Merge the artists' group files into game/assets/props.txt: each model in a group file replaces the model of the
# same name (with its comment lines); models nobody remodelled stay as they are. Usage: python3 mergeprops.py g1 g2 ...
import re, sys
PROPS = '/home/user/Makefun-project/game/assets/props.txt'
def blocks(text):
    """Split kit text into (header, [(name, block_text)]); a block starts at the comment lines just above its '@'."""
    lines = text.split('\n'); out = []; header = []; cur = None; pending = []
    for line in lines:
        if line.startswith('@ '):
            if cur: out.append(cur)
            cur = [line.split()[1], pending + [line]]; pending = []
        elif line.startswith('#') or not line.strip():
            if cur is None: header.append(line)
            else: pending.append(line)
        else:
            if cur is None: header.append(line)
            else: cur[1] += pending + [line]; pending = []
    if cur: out.append(cur)
    clean = lambda b: '\n'.join(b).strip('\n')
    # comments right above the next model belong to it, so trailing comment lines of a block are dropped here
    return '\n'.join(header).rstrip('\n'), [(n, clean(b)) for n, b in out]
header, base = blocks(open(PROPS).read())
order = [n for n, _ in base]; models = dict(base)
for g in sys.argv[1:]:
    _, new = blocks(open(f'/root/makefun/props/{g}.txt').read())
    for n, b in new:
        if n not in models: order.append(n)
        models[n] = b
# drop the old "placeholders" banner if every placeholder has been replaced
header = header.replace('\n# Placeholders for the props still being modelled (same names, simple shapes).', '')
body = '\n\n'.join(re.sub(r'\n# Placeholders for the props still being modelled \(same names, simple shapes\)\.', '', models[n]) for n in order)
open(PROPS, 'w').write(header + '\n\n' + body + '\n')
print(len(order), 'models:', ' '.join(order))
