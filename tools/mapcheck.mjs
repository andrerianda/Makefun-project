// Dev tool: validate the map: every tactical point stands on a walkable cell and is reachable, travel times,
// sight lines from each hold to the choke it watches.
const root = (process.env.REPO || '/home/user/Makefun-project') + '/game/src/';
const map = await import(root + 'sim/map.js');
const { findPath, makePath } = await import(root + 'sim/nav.js');
const { sightClear } = await import(root + 'sim/world.js');
const { walk, COLS, ROWS, colOf, rowOf, SPAWN, SITES, HOLDS, STAGE, SMOKES, boxes, tile } = map;
const p = makePath();
const dist = (a, b) => { if (!findPath(p, a.x, a.z, b.x, b.z)) return -1; let d = 0, x = a.x, z = a.z; for (let i = 0; i < p.n; i++) { d += Math.hypot(p.x[i] - x, p.z[i] - z); x = p.x[i]; z = p.z[i]; } return d; };
const ok = (pt) => walk[rowOf(pt.z) * COLS + colOf(pt.x)] === 1;
let bad = 0;
const check = (name, pt) => { if (!ok(pt)) { bad++; console.log('NOT WALKABLE', name, 'cell', colOf(pt.x), rowOf(pt.z), JSON.stringify(tile(colOf(pt.x), rowOf(pt.z)))); } };
for (const k of ['A', 'B', 'M']) HOLDS[k].forEach((h, i) => { check(`HOLD ${k}${i}`, h); const see = sightClear(h.x, 1.5, h.z, h.wx, 1.2, h.wz); if (!see) console.log(`  hold ${k}${i} cannot see its watch point (may be intended cover)`); });
for (const k of ['A', 'B']) { check(`STAGE ${k}.main`, STAGE[k].main); check(`STAGE ${k}.lurk`, STAGE[k].lurk); }
check('STAGE mid', STAGE.mid);
for (const k of ['A', 'B']) SMOKES[k].forEach((s, i) => check(`SMOKE ${k}${i}`, s));
const att = SPAWN[0][3], def = SPAWN[1][3];
const secs = (d) => (d / 5.6).toFixed(1) + 's';
console.log('boxes', boxes.length, '| walkable cells', walk.reduce((a, b) => a + b, 0));
for (const k of ['A', 'B']) console.log(`site ${k}: attackers ${secs(dist(att, SITES[k]))} (main stage ${secs(dist(att, STAGE[k].main))}), defenders ${secs(dist(def, SITES[k]))}`);
console.log('mid stage: attackers', secs(dist(att, STAGE.mid)), '| defenders to M hold', secs(dist(def, HOLDS.M[0])), '| A<->B rotate (defender hold to hold)', secs(dist(HOLDS.A[0], HOLDS.B[0])));
// unreachable walkable cells from the attackers' spawn
let lost = 0;
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (walk[r * COLS + c] && dist(att, { x: map.cellX(c), z: map.cellZ(r) }) < 0) lost++;
console.log('unreachable walkable cells:', lost, '| problems:', bad);
