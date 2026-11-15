// The objective: one Smuggler carries the powder keg, plants it on a site, and the Wardens must douse the fuse.
import { ECON, ROUND } from '../config.js';
import { ATT, DEF, emit, noise, sideOf } from './state.js';
import { siteAt } from './map.js';
import { hurt } from './damage.js';

export function giveKeg(state, a) {
  const k = state.keg;
  k.state = 'carried'; k.carrier = a.id; a.hasKeg = true;
}

function dropKeg(state, a) {
  const k = state.keg;
  a.hasKeg = false; k.state = 'dropped'; k.carrier = -1; k.x = a.x; k.y = 0; k.z = a.z;
}

/** True when this body may start (or keep) planting: it holds the keg, stands on a site, and the round is live. */
export const canPlant = (state, a) => a.hasKeg && a.ground && state.match.phase === 'live' && siteAt(a.x, a.z) !== null;
/** True when this body may douse: a defender within reach of the planted keg. */
export const canDouse = (state, a) => state.keg.state === 'planted' && sideOf(state, a) === DEF && a.ground &&
  Math.hypot(a.x - state.keg.x, a.z - state.keg.z) < 1.4 && (state.keg.douser < 0 || state.keg.douser === a.id);

/** Seconds a douse takes this body: a Douse Kit halves it. */
export const douseTime = (a) => (a.kit ? ROUND.douseKitTime : ROUND.douseTime);

export function stepKeg(state, dt) {
  const k = state.keg;
  if (k.state === 'carried') {
    const a = state.actors[k.carrier];
    if (!a.alive) { dropKeg(state, a); return; }
    k.x = a.x; k.y = a.y; k.z = a.z;
    if (a.cmd.use && canPlant(state, a)) {
      if (a.use === 0) { emit(state, 'planting', a.id, -1, a.x, a.y, a.z); noise(state, a.x, a.z, 14, a.team, 'plant'); }
      a.use += dt;
      if (a.use >= ROUND.plantTime) {
        a.use = 0; a.hasKeg = false; a.plants++; a.money = Math.min(ECON.cap, a.money + ECON.plantSelf);
        k.state = 'planted'; k.carrier = -1; k.fuse = ROUND.fuse; k.beep = 0; k.site = siteAt(a.x, a.z); k.douser = -1;
        emit(state, 'planted', a.id, -1, k.x, k.y, k.z, 0, k.site);
        noise(state, k.x, k.z, 200, a.team, 'plant');
      }
    } else a.use = 0;
  } else if (k.state === 'dropped') {
    for (const a of state.actors) {
      if (a.alive && sideOf(state, a) === ATT && Math.hypot(a.x - k.x, a.z - k.z) < 1.2) {
        giveKeg(state, a); break;
      }
    }
  } else if (k.state === 'planted') {
    k.fuse -= dt; k.beep -= dt;
    if (k.beep <= 0) { // the fuse ticks faster as it burns down
      k.beep = Math.max(0.14, Math.min(1, k.fuse / 14));
      emit(state, 'beep', -1, -1, k.x, k.y, k.z, k.fuse);
    }
    let douser = -1;
    for (const a of state.actors) {
      if (!a.alive || !a.cmd.use || !canDouse(state, a)) { if (sideOf(state, a) === DEF) a.use = 0; continue; }
      if (douser >= 0) continue;
      douser = a.id;
      if (a.use === 0) { emit(state, 'dousing', a.id, -1, k.x, k.y, k.z); noise(state, k.x, k.z, 16, a.team, 'douse'); }
      a.use += dt;
      if (a.use >= douseTime(a)) {
        a.use = 0; a.money = Math.min(ECON.cap, a.money + ECON.douseSelf); k.state = 'doused';
        emit(state, 'doused', a.id, -1, k.x, k.y, k.z);
      }
    }
    k.douser = douser;
    if (k.state === 'planted' && k.fuse <= 0) {
      k.state = 'blown';
      emit(state, 'kegBoom', -1, -1, k.x, k.y, k.z);
      for (const a of state.actors) {
        const d = Math.hypot(a.x - k.x, a.z - k.z);
        if (a.alive && d < ROUND.kegBlast) hurt(state, a, -1, ROUND.kegDamage * (1 - d / ROUND.kegBlast), 'keg');
      }
    }
  }
}
