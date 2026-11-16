// Hits checked against bodies: each has three hitboxes, legs, torso and head, and a ray reports which it met.
// damage.js turns that zone into the multiplier: the head takes the most. One shared record: no allocation per shot.
import { rayBox, bodyHeight } from './collision.js';

// The boxes as fractions of a body's height; the head is the last 0.3 m.
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
