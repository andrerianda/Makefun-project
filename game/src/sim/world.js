// Geometry queries against the map's boxes: body collision, ray casts and hitboxes. No allocation per call:
// results come back in the module's one `hit` record.
import { MOVE } from '../config.js';
import { boxes, CELL, COLS, ROWS } from './map.js';

const LIMIT_X = (COLS / 2) * CELL - 0.5, LIMIT_Z = (ROWS / 2) * CELL - 0.5;

/** The last ray's result: the box struck and the struck face's normal. */
export const hit = { box: null, nx: 0, ny: 0, nz: 0 };

/** Slab test of a ray against one box; returns the entry distance or -1, and leaves the face in `hit`. */
function rayBox(ox, oy, oz, dx, dy, dz, b, maxT) {
  let t0 = 0, t1 = maxT, axis = 0, sign = 0;
  for (let i = 0; i < 3; i++) {
    const o = i === 0 ? ox : i === 1 ? oy : oz, d = i === 0 ? dx : i === 1 ? dy : dz;
    const lo = i === 0 ? b.x0 : i === 1 ? b.y0 : b.z0, hi = i === 0 ? b.x1 : i === 1 ? b.y1 : b.z1;
    if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return -1; continue; }
    let a = (lo - o) / d, c = (hi - o) / d, s = -1;
    if (a > c) { const k = a; a = c; c = k; s = 1; }
    if (a > t0) { t0 = a; axis = i; sign = s; }
    if (c < t1) t1 = c;
    if (t0 > t1) return -1;
  }
  hit.nx = axis === 0 ? sign : 0; hit.ny = axis === 1 ? sign : 0; hit.nz = axis === 2 ? sign : 0;
  return t0;
}

/** Nearest solid along a ray within maxT (or maxT when clear). `skip` ignores one box, for a bullet leaving cover. */
export function rayWorld(ox, oy, oz, dx, dy, dz, maxT, skip = null) {
  let best = maxT, found = null, nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (b === skip) continue;
    const t = rayBox(ox, oy, oz, dx, dy, dz, b, best);
    if (t >= 0 && t < best) { best = t; found = b; nx = hit.nx; ny = hit.ny; nz = hit.nz; }
  }
  if (dy < 0) { // the ground plane
    const t = -oy / dy;
    if (t >= 0 && t < best) { best = t; found = null; nx = 0; ny = 1; nz = 0; }
  }
  hit.box = found; hit.nx = nx; hit.ny = ny; hit.nz = nz;
  return best;
}

/** True when nothing solid lies between two points. */
export function sightClear(x0, y0, z0, x1, y1, z1) {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) return true;
  return rayWorld(x0, y0, z0, dx / len, dy / len, dz / len, len) >= len - 1e-4;
}

/** The first box a standing volume (feet at x,y,z; half-width r; height h) overlaps, or null. */
function overlap(x, y, z, r, h) {
  r -= 1e-4; // pushed out to a face is not inside it
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (x + r > b.x0 && x - r < b.x1 && z + r > b.z0 && z - r < b.z1 && y < b.y1 - 1e-4 && y + h > b.y0) return b;
  }
  return null;
}

/** The unit vector along a view (yaw 0 faces north, -z), written into the shared `ahead` record. */
export const ahead = { x: 0, y: 0, z: 0 };
export function look(yaw, pitch) {
  const cp = Math.cos(pitch);
  ahead.x = -Math.sin(yaw) * cp; ahead.y = Math.sin(pitch); ahead.z = -Math.cos(yaw) * cp;
  return ahead;
}

export const bodyHeight = (a) => MOVE.standH + (MOVE.duckH - MOVE.standH) * a.duck;
export const eyeHeight = (a) => MOVE.standEye + (MOVE.duckEye - MOVE.standEye) * a.duck;

/** Move a body by its velocity for dt, one axis at a time, sliding along whatever it meets. */
export function moveBody(a, dt) {
  const r = MOVE.radius, h = bodyHeight(a);
  let b;
  a.x += a.vx * dt;
  if ((b = overlap(a.x, a.y, a.z, r, h))) { a.x = a.vx > 0 ? b.x0 - r : b.x1 + r; a.vx = 0; }
  a.z += a.vz * dt;
  if ((b = overlap(a.x, a.y, a.z, r, h))) { a.z = a.vz > 0 ? b.z0 - r : b.z1 + r; a.vz = 0; }
  a.y += a.vy * dt;
  a.ground = false;
  if ((b = overlap(a.x, a.y, a.z, r, h))) {
    if (a.vy <= 0) { a.y = b.y1; a.ground = true; } else a.y = b.y0 - h;
    a.vy = 0;
  }
  if (a.y <= 0) { a.y = 0; a.vy = 0; a.ground = true; }
  a.x = Math.max(-LIMIT_X, Math.min(LIMIT_X, a.x));
  a.z = Math.max(-LIMIT_Z, Math.min(LIMIT_Z, a.z));
}

// A body's three hitboxes, as fractions of its height: legs, torso, head (the head is the last 0.3 m).
const ZONE = { t: 0, zone: 0 };
const part = { x0: 0, y0: 0, z0: 0, x1: 0, y1: 0, z1: 0 };
function rayPart(ox, oy, oz, dx, dy, dz, a, lo, hi, half, maxT) {
  part.x0 = a.x - half; part.x1 = a.x + half; part.z0 = a.z - half; part.z1 = a.z + half;
  part.y0 = a.y + lo; part.y1 = a.y + hi;
  return rayBox(ox, oy, oz, dx, dy, dz, part, maxT);
}

/** Where a ray meets a body: returns {t, zone} with zone 0 head, 1 torso, 2 legs, or null. */
export function rayActor(a, ox, oy, oz, dx, dy, dz, maxT) {
  const h = bodyHeight(a), waist = h * 0.47, neck = h - 0.3;
  let best = -1, zone = 0, t;
  if ((t = rayPart(ox, oy, oz, dx, dy, dz, a, neck, h, 0.16, maxT)) >= 0) { best = t; zone = 0; }
  if ((t = rayPart(ox, oy, oz, dx, dy, dz, a, waist, neck, 0.27, maxT)) >= 0 && (best < 0 || t < best)) { best = t; zone = 1; }
  if ((t = rayPart(ox, oy, oz, dx, dy, dz, a, 0, waist, 0.22, maxT)) >= 0 && (best < 0 || t < best)) { best = t; zone = 2; }
  if (best < 0) return null;
  ZONE.t = best; ZONE.zone = zone;
  return ZONE;
}
