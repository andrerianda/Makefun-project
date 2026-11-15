// What a body carries: slot 0 primary, 1 sidearm, 2 blade, 3 the selected grenade. And what it leaves behind.
import { WEAPONS } from '../config.js';
import { emit } from './state.js';

/** The weapon in hand, or null while a grenade is. */
export const weaponOf = (a) => (a.slot === 3 ? null : WEAPONS[a.slots[a.slot]]);

/** Put a weapon in its slot with a full magazine and reserve. */
export function giveWeapon(a, id) {
  const w = WEAPONS[id];
  a.slots[w.slot] = id; a.mag[w.slot] = w.mag || 0; a.res[w.slot] = w.reserve || 0;
}

/** Round start: the dead come back with a Sparrow and a blade; survivors keep their kit, topped up. */
export function resetLoadout(a, fresh) {
  if (fresh) { a.slots[0] = null; a.nades.fill(0); a.armor = 0; a.helmet = false; a.kit = false; giveWeapon(a, 'sparrow'); }
  for (let s = 0; s < 2; s++) if (a.slots[s]) giveWeapon(a, a.slots[s]);
  a.slot = a.slots[0] ? 0 : 1;
  a.nadeSel = a.nades.findIndex((n) => n > 0);
  a.cool = 0; a.reload = 0; a.swap = 0; a.shots = 0; a.bloom = 0; a.punchP = 0; a.punchY = 0; a.scoped = false; a.held = false;
}

/** A dying body's rifle falls where it stood, rounds and all; the oldest one on the ground makes room. */
export function dropWeapon(state, a) {
  if (!a.slots[0]) return;
  const d = state.drops[state.dropSeq++ % state.drops.length];
  d.live = true; d.id = a.slots[0]; d.x = a.x; d.z = a.z; d.mag = a.mag[0]; d.res = a.res[0];
  a.slots[0] = null; a.slot = 1;
}

/** Whoever walks over a fallen rifle with no rifle of their own takes it. */
export function stepDrops(state) {
  for (const d of state.drops) {
    if (!d.live) continue;
    for (const a of state.actors) {
      if (!a.alive || a.slots[0] || Math.hypot(a.x - d.x, a.z - d.z) > 1) continue;
      d.live = false; a.slots[0] = d.id; a.mag[0] = d.mag; a.res[0] = d.res; a.slot = 0; a.swap = 0.4; a.reload = 0;
      emit(state, 'pickup', a.id, -1, a.x, a.y, a.z);
      break;
    }
  }
}
