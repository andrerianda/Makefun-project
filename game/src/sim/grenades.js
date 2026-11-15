// Thrown gear: a Crackler bursts, a Glare blinds whoever is looking, a Seafog hangs a cloud that blocks sight.
import { MOVE, NADES } from '../config.js';
import { emit, noise } from './state.js';
import { rayWorld, sightClear, eyeHeight, hit } from './world.js';
import { hurt } from './damage.js';

const THROW = 17, CLOUD_Y = 1.4;

export function throwNade(state, a, type) {
  const n = state.nades.find((g) => !g.live);
  if (!n) return;
  const cp = Math.cos(a.pitch), dx = -Math.sin(a.yaw) * cp, dy = Math.sin(a.pitch), dz = -Math.cos(a.yaw) * cp;
  n.live = true; n.type = type; n.owner = a.id; n.fuse = NADES[type].fuse; n.cloud = 0; n.rest = false;
  n.x = a.x + dx * 0.5; n.y = a.y + eyeHeight(a) - 0.1 + dy * 0.5; n.z = a.z + dz * 0.5;
  n.vx = dx * THROW + a.vx * 0.5; n.vy = dy * THROW + 2.4; n.vz = dz * THROW + a.vz * 0.5;
  emit(state, 'throw', a.id, -1, n.x, n.y, n.z, type);
}

function burst(state, n) {
  const def = NADES[n.type], owner = state.actors[n.owner];
  if (n.type === 2) { // smoke: the shell stays where it stopped and becomes the cloud
    n.cloud = def.life; n.rest = true; n.vx = n.vy = n.vz = 0;
    emit(state, 'smoke', n.owner, -1, n.x, n.y, n.z, def.life);
    noise(state, n.x, n.z, 20, -1, 'nade');
    return;
  }
  n.live = false;
  emit(state, 'boom', n.owner, -1, n.x, n.y, n.z, n.type);
  noise(state, n.x, n.z, 60, -1, 'nade');
  for (const a of state.actors) {
    if (!a.alive) continue;
    const ey = a.y + eyeHeight(a), d = Math.hypot(a.x - n.x, ey - n.y, a.z - n.z);
    if (d > def.radius || !sightClear(n.x, n.y + 0.2, n.z, a.x, ey, a.z)) continue;
    if (n.type === 0) {
      const near = 1 - d / def.radius;
      hurt(state, a, n.owner, def.dmg * near * (a.armor > 0 ? 0.6 : 1), 'crackler');
    } else { // a flash blinds by how squarely you face it, and for half as long if a team-mate threw it
      const cp = Math.cos(a.pitch), facing = (-Math.sin(a.yaw) * cp * (n.x - a.x) + Math.sin(a.pitch) * (n.y - ey) - Math.cos(a.yaw) * cp * (n.z - a.z)) / (d || 1);
      const t = def.blind * (0.3 + 0.7 * Math.max(0, facing)) * (1 - 0.6 * d / def.radius) * (owner.team === a.team ? 0.5 : 1);
      a.blind = Math.max(a.blind, t);
    }
  }
}

export function stepNades(state, dt) {
  for (const n of state.nades) {
    if (!n.live) continue;
    if (n.cloud > 0) { n.cloud -= dt; if (n.cloud <= 0) n.live = false; continue; }
    if (!n.rest) {
      n.vy -= MOVE.gravity * dt;
      const speed = Math.hypot(n.vx, n.vy, n.vz), dist = speed * dt;
      if (speed > 1e-4 && rayWorld(n.x, n.y, n.z, n.vx / speed, n.vy / speed, n.vz / speed, dist + 0.06) < dist + 0.06) {
        // Bounce: reflect about the face and lose most of the speed; a slow shell on a floor comes to rest.
        const dot = n.vx * hit.nx + n.vy * hit.ny + n.vz * hit.nz;
        n.vx = (n.vx - 2 * dot * hit.nx) * 0.42; n.vy = (n.vy - 2 * dot * hit.ny) * 0.42; n.vz = (n.vz - 2 * dot * hit.nz) * 0.42;
        if (hit.ny > 0.5 && Math.hypot(n.vx, n.vy, n.vz) < 1.2) { n.rest = true; n.vx = n.vy = n.vz = 0; }
        else { emit(state, 'clink', -1, -1, n.x, n.y, n.z); noise(state, n.x, n.z, 10, -1, 'nade'); }
      } else { n.x += n.vx * dt; n.y += n.vy * dt; n.z += n.vz * dt; }
      if (n.y < 0.06) { n.y = 0.06; n.vy = Math.abs(n.vy) * 0.3; }
    }
    n.fuse -= dt;
    if (n.fuse <= 0) burst(state, n);
  }
}

/** True when a Seafog cloud lies across the line between two points: nobody sees through one. */
export function smokeBetween(state, x0, y0, z0, x1, y1, z1) {
  for (const n of state.nades) {
    if (!n.live || n.cloud <= 0) continue;
    const r = NADES[2].radius, dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, len2 = dx * dx + dy * dy + dz * dz;
    const k = Math.max(0, Math.min(1, ((n.x - x0) * dx + (n.y + CLOUD_Y - y0) * dy + (n.z - z0) * dz) / (len2 || 1)));
    if (Math.hypot(x0 + dx * k - n.x, y0 + dy * k - n.y - CLOUD_Y, z0 + dz * k - n.z) < r) return true;
  }
  return false;
}
