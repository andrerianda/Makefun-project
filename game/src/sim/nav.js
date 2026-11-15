// Path finding on the map's cell grid: A* with a binary heap, then string-pulling so bots cut corners like people.
// Every buffer is allocated once; a search allocates nothing.
import { COLS, ROWS, walk, cellX, cellZ, colOf, rowOf } from './map.js';

const N = COLS * ROWS, MAX_POINTS = 64, BODY = 0.42;
const g = new Float32Array(N), f = new Float32Array(N), parent = new Int16Array(N), seen = new Uint16Array(N);
const heap = new Int16Array(N), chain = new Int16Array(N), toll = new Float32Array(N);
let run = 0, heapN = 0;

// Hugging a wall costs extra, so routes keep to the middle of a lane.
for (let i = 0; i < N; i++) {
  const c = i % COLS, r = (i / COLS) | 0;
  let tight = 0;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (!open(c + dc, r + dr)) tight = 1;
  toll[i] = 1 + tight * 0.6;
}

function open(c, r) { return c >= 0 && r >= 0 && c < COLS && r < ROWS && walk[r * COLS + c] === 1; }
const openAt = (x, z) => open(colOf(x), rowOf(z));

function push(i) {
  let k = heapN++;
  while (k > 0) {
    const up = (k - 1) >> 1;
    if (f[heap[up]] <= f[i]) break;
    heap[k] = heap[up]; k = up;
  }
  heap[k] = i;
}
function pop() {
  const top = heap[0], last = heap[--heapN];
  let k = 0;
  for (;;) {
    let child = k * 2 + 1;
    if (child >= heapN) break;
    if (child + 1 < heapN && f[heap[child + 1]] < f[heap[child]]) child++;
    if (f[last] <= f[heap[child]]) break;
    heap[k] = heap[child]; k = child;
  }
  heap[k] = last;
  return top;
}

/** The walkable cell nearest a point (a goal may sit on a crate's cell). */
function snap(x, z) {
  const c0 = colOf(x), r0 = rowOf(z);
  for (let ring = 0; ring < 4; ring++) {
    for (let dr = -ring; dr <= ring; dr++) for (let dc = -ring; dc <= ring; dc++) {
      if (Math.max(Math.abs(dc), Math.abs(dr)) === ring && open(c0 + dc, r0 + dr)) return (r0 + dr) * COLS + c0 + dc;
    }
  }
  return -1;
}

/** True when a body can walk the straight line between two points without clipping a corner. */
function lineOpen(x0, z0, x1, z1) {
  const len = Math.hypot(x1 - x0, z1 - z0), steps = Math.ceil(len / 0.4);
  for (let s = 0; s <= steps; s++) {
    const k = steps ? s / steps : 0, x = x0 + (x1 - x0) * k, z = z0 + (z1 - z0) * k;
    if (!openAt(x - BODY, z - BODY) || !openAt(x + BODY, z - BODY) || !openAt(x - BODY, z + BODY) || !openAt(x + BODY, z + BODY)) return false;
  }
  return true;
}

export const makePath = () => ({ n: 0, i: 0, x: new Float32Array(MAX_POINTS), z: new Float32Array(MAX_POINTS) });

/** Fill `path` with waypoints from one point to another; false when there is no way. */
export function findPath(path, x0, z0, x1, z1) {
  path.n = 0; path.i = 0;
  const start = snap(x0, z0), goal = snap(x1, z1);
  if (start < 0 || goal < 0) return false;
  const gc = goal % COLS, gr = (goal / COLS) | 0;
  run = (run + 1) & 0xffff;
  if (run === 0) { seen.fill(0); run = 1; }
  heapN = 0; g[start] = 0; f[start] = 0; parent[start] = -1; seen[start] = run; push(start);
  let found = false;
  while (heapN > 0) {
    const cur = pop();
    if (cur === goal) { found = true; break; }
    const c = cur % COLS, r = (cur / COLS) | 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if ((!dc && !dr) || !open(c + dc, r + dr)) continue;
      if (dc && dr && (!open(c + dc, r) || !open(c, r + dr))) continue; // no squeezing past a corner
      const nb = (r + dr) * COLS + c + dc, cost = g[cur] + (dc && dr ? 1.414 : 1) * toll[nb];
      if (seen[nb] === run && cost >= g[nb]) continue;
      const ax = Math.abs(c + dc - gc), az = Math.abs(r + dr - gr);
      g[nb] = cost; f[nb] = cost + Math.max(ax, az) + 0.414 * Math.min(ax, az); parent[nb] = cur; seen[nb] = run; push(nb);
    }
  }
  if (!found) return false;
  let len = 0;
  for (let i = goal; i >= 0; i = parent[i]) chain[len++] = i;
  // String-pull: keep a cell only where the straight line from the last kept point would clip something.
  let ax = x0, az = z0;
  for (let k = len - 2; k >= 1 && path.n < MAX_POINTS - 1; k--) {
    const next = chain[k - 1];
    if (lineOpen(ax, az, cellX(next % COLS), cellZ((next / COLS) | 0))) continue;
    ax = cellX(chain[k] % COLS); az = cellZ((chain[k] / COLS) | 0);
    path.x[path.n] = ax; path.z[path.n++] = az;
  }
  const exact = openAt(x1, z1);
  path.x[path.n] = exact ? x1 : cellX(gc); path.z[path.n++] = exact ? z1 : cellZ(gr);
  return true;
}
