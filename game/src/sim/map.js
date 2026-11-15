// Porto Vesper: the one map, drawn as text so its lanes read at a glance. One character is a 2 m cell.
// North is up. The Wardens start in the Customs Yard (T), the Smugglers on the Low Road (R). Three lanes
// run north: Net Row to the Fish Market (site A), Bell Lane through the gate under the campanile, and
// the Quay to the Boathouse (site B). Each lane is a chicane, never a straight shooting gallery: a house
// juts in from one side, then the other. Two offset alleys, Cooper's Cut and the Chandlery, link the lanes.
//   # house   K campanile   a archway   . paving   ~ sea   w low wall
//   c crate   C crate stack   b barrels   p planter   s market stall   f fountain   h hull on stocks
//   v handcart   t cafe table   n fishing nets   k sacks
const ROWS_TEXT = [
  '########################################',
  '###..........#..TTTTTTTT..#....h.....###',
  '###.s..s.....a..TTTTTTTT..a........C.###',
  '###..........a............a..........###',
  '###.s...AA..c######..######k..BB..n..###',
  '###.....AA...#..p......p..#...BB.....###',
  '###.f...AA..v#.t........t.#...BB..h..###',
  '###..........a.....KK.....a..........###',
  '###.c........a.....KK.....a..c.....c.###',
  '###....s..C..#..........v.#..C..##...###',
  '###.s..s.....#..w......w..#..........###',
  '####aa#############aa############aa#####',
  '###....###########....##########....w~~~',
  '###..c.###########..c.##########...nw~~~',
  '###....#############..##########....w~~~',
  '#####..###########....############..w~~~',
  '###.......c...........##########..v.w~~~',
  '###..............C....##########....w~~~',
  '###....###########....##########....w~~~',
  '###....###########.......c..........w~~~',
  '###.b..###########...C.........n....w~~~',
  '###..#############..############....w~~~',
  '###....###########....##########.c..w~~~',
  '###....###########....##########....w~~~',
  '###.................................####',
  '###...v.....#..RRRRRRRR..#......k...####',
  '###.........#..RRRRRRRR..#..........####',
  '########################################',
];

export const CELL = 2;
export const COLS = ROWS_TEXT[0].length;
export const ROWS = ROWS_TEXT.length;
export const cellX = (c) => (c - COLS / 2 + 0.5) * CELL;
export const cellZ = (r) => (r - ROWS / 2 + 0.5) * CELL;
export const colOf = (x) => Math.floor(x / CELL + COLS / 2);
export const rowOf = (z) => Math.floor(z / CELL + ROWS / 2);
export const tile = (c, r) => (c < 0 || r < 0 || c >= COLS || r >= ROWS ? '#' : ROWS_TEXT[r][c]);

// Solid props by their map letter: footprint (m), height (m), whether a bullet can punch through.
const PROPS = {
  c: { kind: 'crate', w: 1.3, h: 1.3, soft: true },
  C: { kind: 'stack', w: 1.5, h: 2.5, soft: true },
  b: { kind: 'barrel', w: 1.2, h: 1.1, soft: true },
  w: { kind: 'low', w: 2, h: 1.1, soft: false },
  p: { kind: 'planter', w: 1.5, h: 0.8, soft: false },
  s: { kind: 'stall', w: 1.7, h: 1, soft: true },
  f: { kind: 'basin', w: 1.9, h: 0.7, soft: false },
  h: { kind: 'hull', w: 1.8, h: 1.5, soft: true },
  v: { kind: 'cart', w: 1.5, h: 1.3, soft: true },
  t: { kind: 'table', w: 1, h: 0.8, soft: true },
  n: { kind: 'nets', w: 1.4, h: 1, soft: true },
  k: { kind: 'sacks', w: 1.3, h: 0.9, soft: true },
};

/** Every solid as an axis-aligned box; the collision, the bullets and the level mesh all read this list. */
export const boxes = [];
/** 1 where a body may stand: the nav grid. */
export const walk = new Uint8Array(COLS * ROWS);
export const SPAWN = [[], []]; // [attackers' cells, defenders' cells] as {x, z}
export const SITES = { A: { name: 'Fish Market', cells: [], x: 0, z: 0 }, B: { name: 'Boathouse', cells: [], x: 0, z: 0 } };
const ROOF = { c0: 27, r0: 1, c1: 36, r1: 10, y: 5.6 }; // the Boathouse is the one roofed room

export const hash = (c, r) => ((c * 73856093) ^ (r * 19349663)) >>> 0;
const box = (x0, y0, z0, x1, y1, z1, kind, soft, style = 0) => boxes.push({ x0, y0, z0, x1, y1, z1, kind, soft, style });

(function build() {
  const taken = new Uint8Array(COLS * ROWS);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = tile(c, r);
      const x = cellX(c), z = cellZ(r), h = CELL / 2;
      if (t === '#' || t === 'K') {
        if (taken[r * COLS + c]) continue;
        // Greedy rectangles, capped so a long terrace breaks into houses of different height and colour.
        const k = hash(c, r), maxW = 2 + (k % 4), maxD = 2 + ((k >> 3) % 4);
        let w = 1, d = 1;
        while (w < maxW && tile(c + w, r) === t && !taken[r * COLS + c + w]) w++;
        grow: while (d < maxD && r + d < ROWS) {
          for (let i = 0; i < w; i++) if (tile(c + i, r + d) !== t || taken[(r + d) * COLS + c + i]) break grow;
          d++;
        }
        for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) taken[(r + j) * COLS + c + i] = 1;
        if (t === 'K') box(x - h, 0, z - h, x - h + w * CELL, 20, z - h + d * CELL, 'tower', false); // the campanile's shaft
        else box(x - h, 0, z - h, x - h + w * CELL, 6 + ((k >> 6) % 7) * 0.6, z - h + d * CELL, 'wall', false, k % 6);
        continue;
      }
      if (t === '~') continue;
      const prop = PROPS[t];
      if (prop) {
        const p = prop.w / 2;
        box(x - p, 0, z - p, x + p, prop.h, z + p, prop.kind, prop.soft, hash(c, r) % 4);
        if (prop.kind === 'basin') box(x - 0.25, 0, z - 0.25, x + 0.25, 1.9, z + 0.25, 'spout', false);
        continue;
      }
      walk[r * COLS + c] = 1;
      if (t === 'a') box(x - h, 2.7, z - h, x + h, 6, z + h, 'lintel', false, hash(c, r) % 6);
      else if (t === 'R') SPAWN[0].push({ x, z });
      else if (t === 'T') SPAWN[1].push({ x, z });
      else if (t === 'A' || t === 'B') SITES[t].cells.push({ x, z });
    }
  }
  box(cellX(ROOF.c0) - 1, ROOF.y, cellZ(ROOF.r0) - 1, cellX(ROOF.c1) + 1, ROOF.y + 0.4, cellZ(ROOF.r1) + 1, 'roof', false);
  for (const s of [SITES.A, SITES.B]) {
    for (const p of s.cells) { s.x += p.x / s.cells.length; s.z += p.z / s.cells.length; }
  }
})();

/** 'A', 'B' or null: the plant zone under a point (the lettered cells). */
export function siteAt(x, z) {
  const t = tile(colOf(x), rowOf(z));
  return t === 'A' || t === 'B' ? t : null;
}

// Callouts: the first rectangle (in cells, inclusive) that holds a point names it.
const ZONES = [
  ['Fish Market', 3, 1, 13, 10], ['Boathouse', 26, 1, 36, 10], ['Customs Yard', 14, 1, 25, 3], ['Bell Square', 14, 4, 25, 10],
  ["Cooper's Cut", 7, 16, 17, 17], ['Chandlery', 22, 19, 31, 20], ['Net Row', 3, 11, 6, 23], ['Bell Lane', 18, 11, 21, 23],
  ['Quay', 32, 11, 36, 23], ['Low Road', 3, 24, 36, 26],
];
export function zoneAt(x, z) {
  const c = colOf(x), r = rowOf(z);
  for (const q of ZONES) if (c >= q[1] && c <= q[3] && r >= q[2] && r <= q[4]) return q[0];
  return 'Porto Vesper';
}

// Tactical points, in cells (a whole number is a cell's centre; fractions allowed), turned into metres below.
const at = (c, r) => ({ x: cellX(c), z: cellZ(r) });
const hold = (c, r, wc, wr) => ({ x: cellX(c), z: cellZ(r), wx: cellX(wc), wz: cellZ(wr) });
/** Where a defender (or a post-plant attacker) stands, and the choke it watches. */
export const HOLDS = {
  A: [hold(11, 8.4, 4.5, 11), hold(5.2, 2.6, 13, 7.5), hold(11.4, 4.2, 4.5, 11), hold(3.2, 6.3, 13, 7.5)],
  B: [hold(28.4, 8.6, 33.5, 11), hold(35.6, 3, 26, 7.5), hold(28, 4.8, 33.5, 11), hold(35.6, 8.4, 26, 7.5)],
  M: [hold(15.4, 9, 19.5, 11), hold(23.2, 9, 19.5, 11), hold(17, 5.6, 19.5, 11)],
};
/** Where attackers gather before a hit: the main door, a lurk alley, and the middle of Bell Lane. */
export const STAGE = {
  A: { main: at(4.4, 13.2), lurk: at(12, 15.6) },
  B: { main: at(33.5, 13.2), lurk: at(27, 18.6) },
  mid: at(20, 12.4),
};
/** Smoke targets that cut the defenders' rotations into each site. */
export const SMOKES = { A: [at(12.2, 2.5), at(12.2, 7.5)], B: [at(26.8, 2.5), at(26.8, 7.5)] };
