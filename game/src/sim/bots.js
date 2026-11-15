// A bot's own head: it looks and listens, walks its route to the post the coach gave it, checks the angle it was
// told to watch, and fights the way the gunplay rewards: stop, burst, sidestep, burst again.
import { ATT, DEF, TEAM_SIZE, sideOf } from './state.js';
import { canSee, hear } from './perception.js';
import { report } from './coach.js';
import { findPath, makePath } from './nav.js';
import { weaponOf } from './loadout.js';
import { canPlant, canDouse, douseTime } from './keg.js';
import { sightClear, eyeHeight, bodyHeight } from './world.js';

const TAU = Math.PI * 2;
const turnTo = (from, to, max) => {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU;
  return from + Math.max(-max, Math.min(max, d));
};
const yawTo = (a, x, z) => Math.atan2(a.x - x, a.z - z); // the yaw that faces a point (forward is -sin, -cos)

/** Both crews field the same ladder of five, weakest to sharpest, so a match is decided by play, not by the draw. */
export function makeBrain(a, rng, level) {
  a.skill = Math.min(1, 0.3 + 0.2 * level + 0.09 * (a.id % TEAM_SIZE));
  a.bot = {
    target: -1, react: 0, lost: 9, lx: 0, lz: 0, ex: 0, ey: 0, errT: 0,
    path: makePath(), gx: 1e9, gz: 0, repath: 0, checkT: 0, sx: 0, sz: 0,
    burst: 3, pause: 0, strafe: 0, strafeT: 0, heardT: -9, hx: 0, hz: 0, threw: false, settled: false, sway: rng.next() * TAU,
  };
}

/** Eyes and ears. A new face costs a reaction time before the trigger; a lost one is remembered for a while. */
function sense(state, a, b, dt) {
  b.react = Math.max(0, b.react - dt);
  if ((state.tick + a.id) % 3) return;
  let best = null, bestD = Infinity;
  for (const o of state.actors) {
    if (!o.alive || o.team === a.team || !canSee(state, a, o)) continue;
    const d = Math.hypot(o.x - a.x, o.z - a.z) - (o.id === b.target ? 5 : 0);
    if (d < bestD) { best = o; bestD = d; }
  }
  if (best) {
    if (best.id !== b.target || b.lost > 0.6) {
      // A bot already standing on its post with the angle covered is quicker on the trigger than one walking in.
      b.react = (0.14 + (1 - a.skill) * 0.3 + state.rng.next() * 0.1) * (b.settled ? 0.58 : 1);
      report(state, a, best);
    }
    b.target = best.id; b.lost = 0; b.lx = best.x; b.lz = best.z;
  } else if (b.target >= 0) {
    b.lost += dt * 3;
    if (b.lost > 3 || !state.actors[b.target].alive) b.target = -1;
  }
  const s = hear(state, a, b.heardT);
  if (s) { b.heardT = s.t; b.hx = s.x; b.hz = s.z; }
}

/** Walk towards a world point while looking wherever the view is: project the direction on the view axes. */
function walkTo(a, c, x, z) {
  const dx = x - a.x, dz = z - a.z, d = Math.hypot(dx, dz) || 1, sin = Math.sin(c.yaw), cos = Math.cos(c.yaw);
  c.mz = (-sin * dx - cos * dz) / d; c.mx = (cos * dx - sin * dz) / d;
}

/** Follow the path to the goal. Re-plans when the goal moved or time passed. */
function travel(state, a, b, c, dt) {
  const p = b.path;
  b.repath -= dt;
  if (b.repath <= 0 || p.n === 0 || Math.hypot(p.x[p.n - 1] - b.gx, p.z[p.n - 1] - b.gz) > 1.5) {
    findPath(p, a.x, a.z, b.gx, b.gz);
    b.repath = 1.6 + state.rng.next();
  }
  while (p.i < p.n - 1 && Math.hypot(p.x[p.i] - a.x, p.z[p.i] - a.z) < 0.8) p.i++;
  if (p.n) walkTo(a, c, p.x[p.i], p.z[p.i]);
  // Wedged on a corner or a team-mate: hop, sidestep and plan again.
  b.checkT -= dt;
  if (b.checkT <= 0) {
    if (Math.hypot(a.x - b.sx, a.z - b.sz) < 0.25 && state.match.phase !== 'freeze') { c.jump = true; c.mx = state.rng.chance(0.5) ? 1 : -1; b.repath = 0; }
    b.checkT = 0.7; b.sx = a.x; b.sz = a.z;
  }
}

function fight(state, a, b, c, w, tgt, dt) {
  const rng = state.rng, dx = tgt.x - a.x, dz = tgt.z - a.z, dist = Math.hypot(dx, dz), th = bodyHeight(tgt);
  // Good shots go for the head; the rest aim centre mass. Each has a wandering error that skill shrinks.
  const aimY = tgt.y + (a.skill > 0.6 ? th - 0.16 : th * 0.66) - (a.y + eyeHeight(a));
  b.errT -= dt;
  if (b.errT <= 0) { const amp = 0.008 + (1 - a.skill) * 0.03; b.errT = 0.3; b.ex = rng.range(-amp, amp); b.ey = rng.range(-amp, amp) * 0.6; }
  const comp = 0.45 + 0.5 * a.skill, trueYaw = yawTo(a, tgt.x, tgt.z), truePitch = Math.atan2(aimY, dist);
  const speed = (5 + 9 * a.skill) * dt;
  c.yaw = turnTo(a.yaw, trueYaw + b.ex - a.punchY * comp, speed);
  c.pitch = turnTo(a.pitch, truePitch + b.ey - a.punchP * comp, speed);
  const onTarget = Math.abs(turnTo(0, trueYaw - a.yaw, 9)) < Math.max(0.02, 0.4 / dist) && Math.abs(truePitch - a.pitch) < 0.12;
  const near = dist < 7;
  if (!w) { c.slot = a.slots[0] && a.mag[0] + a.res[0] ? 0 : 1; return; } // a grenade in hand: draw a gun
  if (a.mag[a.slot] === 0) c.reload = true;
  else if (b.react <= 0 && onTarget) {
    if (b.pause > 0) b.pause -= dt;
    else {
      c.fire = w.auto || !a.held;
      if (a.shots >= b.burst) { // let the recoil settle: taps at range, a spray up close
        b.pause = near ? 0.08 : rng.range(0.22, 0.42);
        b.burst = near ? 30 : dist > 22 ? 2 + rng.int(2) : 4 + rng.int(4);
      }
    }
  }
  // Footwork: stand (and maybe crouch) to shoot, then a short sidestep so the reply misses. Up close, never stop.
  b.strafeT -= dt;
  if (b.strafeT <= 0) {
    const stepping = b.strafe === 0 || near;
    b.strafe = stepping ? (rng.chance(0.5) ? 1 : -1) : 0;
    b.strafeT = b.strafe ? rng.range(0.2, near ? 0.7 : 0.4) : rng.range(0.5, 1.1);
  }
  c.mx = b.strafe;
  c.duck = b.strafe === 0 && !near && a.shots > 2 && a.skill > 0.45;
}

/** Throw the grenade the coach asked for once the lob is on: select it, aim the arc, let go. */
function lob(state, a, b, c, j, dt) {
  const d = Math.hypot(j.nx - a.x, j.nz - a.z), ey = a.y + eyeHeight(a);
  if (b.threw || a.nades[j.nade] <= 0 || d < 5 || d > 15 || !sightClear(a.x, ey, a.z, j.nx, 1.8, j.nz)) return false;
  c.nade = j.nade; c.slot = 3; c.mx = 0; c.mz = 0;
  const yaw = yawTo(a, j.nx, j.nz), pitch = 0.5 * Math.asin(Math.min(1, 19.6 * d / 340)) + 0.05;
  c.yaw = turnTo(a.yaw, yaw, 8 * dt); c.pitch = turnTo(a.pitch, pitch, 6 * dt);
  if (a.slot === 3 && a.swap <= 0 && Math.abs(turnTo(0, yaw - a.yaw, 9)) < 0.05 && Math.abs(pitch - a.pitch) < 0.05) { c.fire = !a.held; b.threw = c.fire; }
  return true;
}

export function thinkBot(state, a, dt) {
  const b = a.bot, c = a.cmd, coach = state.coach[a.team], j = coach.jobs[a.id % TEAM_SIZE], k = state.keg;
  c.mx = 0; c.mz = 0; c.fire = false; c.use = false; c.jump = false; c.reload = false; c.duck = false; c.walk = false; c.alt = false; c.slot = -1; c.nade = -1;
  c.yaw = a.yaw; c.pitch = a.pitch;
  sense(state, a, b, dt);
  const w = weaponOf(a), tgt = b.target >= 0 && b.lost === 0 ? state.actors[b.target] : null, side = sideOf(state, a);
  if (a.slot !== 3 && !tgt) { // keep the best gun that still has rounds in hand
    const dry = a.slots[0] && a.mag[0] + a.res[0] === 0;
    if (a.slots[0] && !dry && a.slot !== 0) c.slot = 0; else if (dry && a.slot === 0) c.slot = 1;
  }

  // The objective outranks the post: the carrier plants, the chosen defender douses.
  let goalX = j.x, goalZ = j.z, task = '';
  if (side === ATT && a.hasKeg && coach.go) { goalX = coach.px; goalZ = coach.pz; task = canPlant(state, a) && Math.hypot(goalX - a.x, goalZ - a.z) < 2.2 ? 'plant' : ''; }
  else if (side === DEF && coach.douser === a.id && k.state === 'planted') { goalX = k.x; goalZ = k.z; task = canDouse(state, a) ? 'douse' : ''; }
  b.gx = goalX; b.gz = goalZ;

  if (tgt && a.blind < 0.35) {
    // Stick the douse when the fuse leaves no time for a duel; otherwise deal with the threat first.
    const left = douseTime(a) - a.use, mustDouse = task === 'douse' && (k.fuse < left + 1.5 || left < 1.5);
    if (mustDouse) c.use = true; else fight(state, a, b, c, w, tgt, dt);
    return;
  }
  if (task) { c.use = true; c.duck = true; c.yaw = turnTo(a.yaw, yawTo(a, j.wx, j.wz), 4 * dt); c.pitch = turnTo(a.pitch, 0, 3 * dt); return; }
  if (w && w.mag && a.reload <= 0 && a.mag[a.slot] < w.mag * 0.5 && a.res[a.slot] > 0) c.reload = true;
  if (j.nade >= 0 && coach.go && lob(state, a, b, c, j, dt)) return;

  // Where to look: a face just lost, a noise just heard, else the road ahead or the choke this post watches.
  let lookX = j.wx, lookZ = j.wz;
  const heard = state.time - b.heardT < 2.5 && Math.hypot(b.hx - a.x, b.hz - a.z) < 24;
  const left = Math.hypot(goalX - a.x, goalZ - a.z), arrived = left < (j.hold ? 0.9 : 1.8);
  if (b.target >= 0) { lookX = b.lx; lookZ = b.lz; }
  else if (heard) { lookX = b.hx; lookZ = b.hz; }
  else if (!arrived && b.path.n) { const i = Math.min(b.path.i + 1, b.path.n - 1); lookX = b.path.x[i]; lookZ = b.path.z[i]; }
  b.sway += dt;
  c.yaw = turnTo(a.yaw, yawTo(a, lookX, lookZ) + (arrived ? Math.sin(b.sway * 0.7) * 0.25 : 0), 6.5 * dt);
  c.pitch = turnTo(a.pitch, 0, 4 * dt);
  b.settled = arrived && j.hold;
  if (!arrived) {
    travel(state, a, b, c, dt);
    c.walk = j.quiet && !coach.go && left < 14; // creep the last metres of a lurk so nobody hears it
  } else {
    c.duck = j.hold && (a.id + state.match.round) % 3 === 0;
    b.sx = 1e9; // standing on a post is not being stuck
  }
}
