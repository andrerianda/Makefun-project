// Dev tool: unused imports, exports nobody imports, palette/config keys nobody reads.
import fs from 'node:fs'; import path from 'node:path';
const root = (process.env.REPO || '/home/user/Makefun-project') + '/game/src';
const files = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); } })(root);
const text = Object.fromEntries(files.map((f) => [f, fs.readFileSync(f, 'utf8')]));
const all = Object.values(text).join('\n');
for (const f of files) {
  const s = text[f], rel = path.relative(root, f);
  for (const m of s.matchAll(/import\s+\{([^}]+)\}\s+from/g)) for (const n of m[1].split(',').map((x) => x.trim().split(' as ').pop()).filter(Boolean)) {
    if ((s.match(new RegExp(`\\b${n}\\b`, 'g')) || []).length < 2) console.log(`unused import ${n} in ${rel}`);
  }
  for (const m of s.matchAll(/export\s+(?:const|function|class|let)\s+([A-Za-z_$][\w$]*)/g)) {
    const n = m[1], uses = (all.match(new RegExp(`\\b${n}\\b`, 'g')) || []).length, own = (s.match(new RegExp(`\\b${n}\\b`, 'g')) || []).length;
    if (uses === own && own < 2) console.log(`export never used: ${n} in ${rel}`);
    else if (uses === own) console.log(`export used only in its own file: ${n} in ${rel}`);
  }
  for (const m of s.matchAll(/export\s+const\s+([A-Za-z_$][\w$]*)(?:\s*,\s*([A-Za-z_$][\w$]*))*\s*=/g)) { /* multi-declarations handled below */ }
}
const cfg = text[root + '/config.js'];
for (const blk of ['MOVE', 'ROUND', 'ECON', 'PALETTE']) {
  const body = cfg.slice(cfg.indexOf(`export const ${blk} = {`)); const end = body.indexOf('\n};');
  for (const m of body.slice(0, end).matchAll(/\b([a-zA-Z]+):/g)) { const k = m[1]; if (!new RegExp(`(?:${blk}|P|M|R|E)\\.${k}\\b`).test(all)) console.log(`config ${blk}.${k} never read`); }
}
