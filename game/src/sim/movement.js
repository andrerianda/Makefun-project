// How a body moves: acceleration towards a wish direction, friction, air control, crouch, jump and footsteps.
// A player and a bot go through the same function; only their cmd differs.
import { MOVE } from '../config.js';
import { emit, noise } from './state.js';
import { moveBody } from './collision.js';
import { weaponOf } from './loadout.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** The top speed a body may reach now: its weapon's weight, its stance, a scope and a fresh wound all cut it. */
function speedLimit(a) {
  const w = weaponOf(a);
  let v = MOVE.speed * (w ? w.speed : 1);
  if (a.duck > 0.5) v *= MOVE.duckMul; else if (a.cmd.walk) v *= MOVE.walkMul;
  if (a.scoped) v *= 0.5;
  if (a.slow > 0) v *= MOVE.tagSlow;
  return v;
}

/** Bodies do not share a spot: two that overlap push each other apart, so a stack at a door fans out. */
export function crowd(state) {
  const list = state.actors;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    if (!a.alive || !b.alive || d > 0.8 || Math.abs(a.y - b.y) > 1.5) continue;
    const k = (0.8 - d) * 6 / (d || 1), px = d ? dx * k : 0.5, pz = d ? dz * k : 0;
    a.vx -= px; a.vz -= pz; b.vx += px; b.vz += pz;
  }
}

export function stepMovement(state, a, dt) {
  const c = a.cmd, wasGround = a.ground;
  a.px = a.x; a.py = a.y; a.pz = a.z;
  a.yaw = c.yaw; a.pitch = clamp(c.pitch, -1.5, 1.5);
  a.duck = clamp(a.duck + clamp((c.duck ? 1 : 0) - a.duck, -MOVE.duckRate * dt, MOVE.duckRate * dt), 0, 1);
  a.slow = Math.max(0, a.slow - dt);
  a.blind = Math.max(0, a.blind - dt);

  // The wish direction in the world: yaw 0 looks north (-z), mx strafes right, mz walks forward.
  const sin = Math.sin(a.yaw), cos = Math.cos(a.yaw);
  let wx = -sin * c.mz + cos * c.mx, wz = -cos * c.mz - sin * c.mx;
  const wl = Math.hypot(wx, wz);
  const rooted = state.match.phase === 'freeze' || a.use > 0; // buy time, or hands on the keg
  if (wl > 1e-6 && !rooted) { wx /= wl; wz /= wl; } else { wx = 0; wz = 0; }
  let wish = wx || wz ? speedLimit(a) : 0;

  if (a.ground) {
    const speed = Math.hypot(a.vx, a.vz);
    if (speed > 1e-4) { // friction bites harder near a standstill, so releasing the keys stops you dead
      const keep = Math.max(0, speed - Math.max(speed, MOVE.stopSpeed) * MOVE.friction * dt) / speed;
      a.vx *= keep; a.vz *= keep;
    }
    if (c.jump && !rooted) { a.vy = MOVE.jump; a.ground = false; emit(state, 'jump', a.id, -1, a.x, a.y, a.z); }
  } else wish = Math.min(wish, MOVE.airCap); // a little steering in the air, no speed gained
  const add = wish - (a.vx * wx + a.vz * wz);
  if (add > 0) { const k = Math.min((wasGround ? MOVE.accel : MOVE.airAccel) * dt, add); a.vx += wx * k; a.vz += wz * k; }
  a.vy -= MOVE.gravity * dt; // grounded too: it settles back each step
  moveBody(a, dt);

  const speed = Math.hypot(a.vx, a.vz);
  if (a.ground && !wasGround) { emit(state, 'land', a.id, -1, a.x, a.y, a.z); noise(state, a.x, a.z, 12, a.team, 'step'); }
  // Running is loud: a step every 2.4 m that enemies hear 15 m away. Walking and crouching are silent.
  if (a.ground && speed > MOVE.speed * 0.6) {
    a.stride += speed * dt;
    if (a.stride > 2.4) { a.stride = 0; emit(state, 'step', a.id, -1, a.x, a.y, a.z); noise(state, a.x, a.z, 15, a.team, 'step'); }
  }
}
