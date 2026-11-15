// What a bot knows: who it can see (a view cone, walls, smoke, a flash in its eyes) and what it can hear.
import { sightClear, eyeHeight, bodyHeight } from './world.js';
import { smokeBetween } from './grenades.js';

const CONE = Math.cos(1.05), FAR = 75; // a 120 degree field of view

/** True when body a sees body b: in range, in the cone (or right on top of it), no wall or smoke between. */
export function canSee(state, a, b) {
  if (a.blind > 0.35) return false;
  const ex = a.x, ey = a.y + eyeHeight(a), ez = a.z, dx = b.x - ex, dz = b.z - ez, d = Math.hypot(dx, dz);
  if (d > FAR) return false;
  if (d > 2.5 && (-Math.sin(a.yaw) * dx - Math.cos(a.yaw) * dz) / d < CONE) return false;
  const h = bodyHeight(b), head = b.y + h - 0.12, chest = b.y + h * 0.6;
  if (!sightClear(ex, ey, ez, b.x, head, b.z) && !sightClear(ex, ey, ez, b.x, chest, b.z)) return false;
  return !smokeBetween(state, ex, ey, ez, b.x, chest, b.z);
}

/** The nearest noise newer than `since` in this body's earshot, not made by its own crew. */
export function hear(state, a, since) {
  let best = null, bestD = Infinity;
  for (const s of state.sounds) {
    if (s.t <= since || s.team === a.team) continue;
    const d = Math.hypot(s.x - a.x, s.z - a.z);
    if (d < s.radius && d < bestD) { best = s; bestD = d; }
  }
  return best;
}
