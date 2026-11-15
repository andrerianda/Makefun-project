// Wounds and deaths, whatever caused them: a bullet, a blade, a Crackler or the keg.
import { MOVE } from '../config.js';
import { emit, noise } from './state.js';
import { rewardKill } from './economy.js';
import { dropWeapon } from './loadout.js';

export const HEAD = 1, WALLBANG = 2; // kill flags, for the feed

/** Take hit points off a body; `cause` is a weapon id or 'crackler'/'keg'. */
export function hurt(state, victim, attackerId, dmg, cause, flags = 0) {
  if (!victim.alive || dmg <= 0) return;
  victim.hp -= dmg;
  victim.slow = MOVE.tagTime;
  emit(state, 'hurt', victim.id, attackerId, victim.x, victim.y, victim.z, dmg, flags & HEAD ? 'head' : 'body');
  if (victim.hp > 0) return;
  victim.hp = 0; victim.alive = false; victim.deaths++; victim.deadT = 0; victim.use = 0; victim.scoped = false;
  dropWeapon(state, victim);
  const killer = attackerId >= 0 ? state.actors[attackerId] : null;
  if (killer && killer.team !== victim.team) { killer.kills++; rewardKill(killer, cause); }
  emit(state, 'kill', attackerId, victim.id, victim.x, victim.y, victim.z, flags, cause);
  noise(state, victim.x, victim.z, 18, victim.team, 'death');
}

/** A bullet or blade on a body zone (0 head, 1 torso, 2 legs): range falloff, zone multiplier, then armour. */
export function strike(state, victim, attacker, w, id, zone, dist, scale, flags) {
  let dmg = w.dmg * Math.pow(w.falloff || 1, dist / 20) * scale * (zone === 0 ? w.head : zone === 2 ? 0.75 : 1);
  const armoured = zone === 0 ? victim.helmet : zone === 1 && victim.armor > 0;
  if (armoured) { // the jerkin soaks what the round cannot push through, and wears out doing it
    const through = dmg * w.armorPen;
    victim.armor = Math.max(0, victim.armor - (dmg - through) * 0.5);
    if (victim.armor === 0) victim.helmet = false;
    dmg = through;
  }
  hurt(state, victim, attacker.id, dmg, id, flags | (zone === 0 ? HEAD : 0));
}
