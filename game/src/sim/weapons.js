// The trigger: switching, reloading, the firing cadence, and the accuracy model that makes stopping to aim pay.
import { MOVE, SPRAY } from '../config.js';
import { emit, noise } from './state.js';
import { rayActor, rayWorld, eyeHeight, hit } from './world.js';
import { strike, WALLBANG } from './damage.js';
import { throwNade } from './grenades.js';
import { weaponOf } from './loadout.js';

/** The firing cone's half-angle now (radians). Standing still and crouched is tight; running, jumping and
 *  holding the trigger open it up. The HUD draws its crosshair gap from the same number. */
export function inaccuracy(a, w) {
  if (!w || w.kind === 'melee') return 0;
  const run = Math.min(1, Math.hypot(a.vx, a.vz) / (MOVE.speed * w.speed));
  let cone = (w.hip && !a.scoped ? w.hip : w.spread) + a.bloom;
  cone += w.move * Math.max(0, (run - 0.3) / 0.7); // under a third of top speed counts as standing: counter-strafe
  if (!a.ground) cone += w.air;
  return cone * (1 - 0.3 * a.duck);
}

function beginReload(state, a, w) {
  if (a.reload > 0 || !w.mag || a.mag[a.slot] >= w.mag || a.res[a.slot] <= 0) return;
  a.reload = w.reload; a.scoped = false;
  emit(state, 'reload', a.id, -1, a.x, a.y, a.z);
  noise(state, a.x, a.z, 9, a.team, 'reload');
}

/** One round down the barrel: aim point plus view punch plus a random point in the cone. One wall-bang allowed. */
function fireBullet(state, a, w, id, cone) {
  const rng = state.rng, ang = rng.next() * 6.2832, rad = cone * Math.sqrt(rng.next());
  const yaw = a.yaw + a.punchY + Math.cos(ang) * rad, pitch = a.pitch + a.punchP + Math.sin(ang) * rad;
  const cp = Math.cos(pitch), dx = -Math.sin(yaw) * cp, dy = Math.sin(pitch), dz = -Math.cos(yaw) * cp;
  let ox = a.x, oy = a.y + eyeHeight(a), oz = a.z, left = w.range, travelled = 0, scale = 1, flags = 0, skip = null;
  for (let leg = 0; leg < 2; leg++) {
    const wall = rayWorld(ox, oy, oz, dx, dy, dz, left, skip), box = hit.box, nx = hit.nx, ny = hit.ny, nz = hit.nz;
    let victim = null, vt = wall, zone = 1;
    for (const o of state.actors) {
      if (!o.alive || o.team === a.team) continue;
      const h = rayActor(o, ox, oy, oz, dx, dy, dz, vt);
      if (h && h.t < vt) { vt = h.t; zone = h.zone; victim = o; }
    }
    const ex = ox + dx * vt, ey = oy + dy * vt, ez = oz + dz * vt;
    emit(state, 'tracer', a.id, victim ? victim.id : -1, ex, ey, ez, leg);
    if (victim) { strike(state, victim, a, w, id, zone, travelled + vt, scale, flags); return; }
    if (wall >= left) return;
    emit(state, 'impact', -1, -1, ex, ey, ez, box && box.soft ? 1 : 0, '', nx, ny, nz);
    if (!box || !box.soft || w.pen < 0.2 || leg) return;
    // Wood and canvas do not stop a rifle round: carry on past the cover with part of the damage.
    scale *= 0.3 + 0.45 * w.pen; flags |= WALLBANG; skip = box;
    travelled += vt; left -= vt; ox = ex; oy = ey; oz = ez;
  }
}

function stab(state, a, w) {
  const cp = Math.cos(a.pitch), dx = -Math.sin(a.yaw) * cp, dy = Math.sin(a.pitch), dz = -Math.cos(a.yaw) * cp;
  const oy = a.y + eyeHeight(a), reach = rayWorld(a.x, oy, a.z, dx, dy, dz, w.range);
  for (const o of state.actors) {
    if (!o.alive || o.team === a.team) continue;
    const h = rayActor(o, a.x, oy, a.z, dx, dy, dz, reach);
    if (h) { strike(state, o, a, w, 'knife', h.zone, 0, 1, 0); return; }
  }
}

function pull(state, a, w, id) {
  if (w.kind === 'melee') { a.cool = 60 / w.rpm; emit(state, 'swing', a.id); stab(state, a, w); return; }
  if (a.mag[a.slot] <= 0) {
    if (a.res[a.slot] > 0) beginReload(state, a, w); else { a.cool = 0.3; emit(state, 'empty', a.id, -1, a.x, a.y, a.z); }
    return;
  }
  a.mag[a.slot]--; a.cool += 60 / w.rpm; // the remainder carries: the rate holds
  const cone = inaccuracy(a, w);
  for (let i = 0; i < (w.pellets || 1); i++) fireBullet(state, a, w, id, cone);
  // Recoil: the first rounds climb hard, then the pattern walks sideways; bloom widens the cone while you hold.
  a.punchP += w.kickP * (a.shots < 9 ? 1 : 0.4);
  a.punchY += w.kickY * SPRAY[a.shots % SPRAY.length];
  a.shots++; a.sinceShot = 0;
  a.bloom = Math.min(a.bloom + w.bloom, w.bloom * 9);
  emit(state, 'shot', a.id, -1, a.x, a.y + eyeHeight(a), a.z, 0, id);
  noise(state, a.x, a.z, 48, a.team, 'shot');
}

export function stepWeapon(state, a, dt) {
  const c = a.cmd;
  if (a.cool > 0) a.cool -= dt;
  a.sinceShot += dt;
  if (a.sinceShot > 0.28) a.shots = 0; // let go of the trigger and the pattern starts over
  const ease = Math.min(1, 8 * dt);
  a.punchP -= a.punchP * ease; a.punchY -= a.punchY * ease;
  const cur = weaponOf(a);
  a.bloom = Math.max(0, a.bloom - (cur ? cur.bloomDecay || 0 : 0) * dt);

  if (c.nade >= 0 && a.nades[c.nade] > 0) a.nadeSel = c.nade;
  if (c.slot >= 0 && c.slot !== a.slot && (c.slot === 3 ? a.nadeSel >= 0 && a.nades[a.nadeSel] > 0 : a.slots[c.slot])) {
    a.slot = c.slot; a.swap = c.slot === 0 ? 0.5 : 0.32; a.reload = 0; a.scoped = false;
    emit(state, 'swap', a.id);
  }
  const trigger = c.fire && !a.held, holding = c.fire;
  a.held = c.fire;
  if (a.swap > 0) { a.swap -= dt; return; }
  if (state.match.phase === 'freeze' || a.use > 0) return;

  if (a.slot === 3) { // a grenade in hand: one press throws it, then back to a gun
    if (trigger && a.nades[a.nadeSel] > 0) {
      throwNade(state, a, a.nadeSel);
      a.nades[a.nadeSel]--;
      a.nadeSel = a.nades.findIndex((n) => n > 0);
      a.slot = a.slots[0] ? 0 : 1; a.swap = 0.45;
    }
    return;
  }
  const w = cur, id = a.slots[a.slot];
  if (a.reload > 0) {
    a.reload -= dt;
    if (a.reload <= 0) {
      const take = Math.min(w.mag - a.mag[a.slot], a.res[a.slot]);
      a.mag[a.slot] += take; a.res[a.slot] -= take; a.reload = 0;
    }
    return;
  }
  if (c.reload) beginReload(state, a, w);
  if (w.scopeFov && c.alt && !a.altHeld) a.scoped = !a.scoped;
  a.altHeld = c.alt;
  if ((w.auto ? holding : trigger) && a.cool < 1e-6) pull(state, a, w, id);
  else if (!holding && w.mag && a.mag[a.slot] === 0) beginReload(state, a, w);
}
