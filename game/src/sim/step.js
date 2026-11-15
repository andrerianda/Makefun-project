// One fixed step of the whole simulation, systems in a fixed order. Nothing in here touches the DOM or three.js.
import { createState } from './state.js';
import { makeCoach, stepCoach, order } from './coach.js';
import { makeBrain, thinkBot } from './bots.js';
import { crowd, stepMovement } from './movement.js';
import { stepWeapon } from './weapons.js';
import { stepNades } from './grenades.js';
import { stepKeg } from './keg.js';
import { stepDrops } from './loadout.js';
import { buy } from './economy.js';
import { startMatch, stepRound } from './round.js';

/** A new match, ready to step. `watch` lets a bot play the player's body (attract mode); `level` is how
 *  sharp the bots are: 0 recruits, 1 regulars, 2 veterans. */
export function createGame(seed, watch, level = 1) {
  const state = createState(seed, watch);
  state.coach[0] = makeCoach(0); state.coach[1] = makeCoach(1);
  for (const a of state.actors) if (!a.human) makeBrain(a, state.rng, level);
  startMatch(state);
  return state;
}

/** Once the player is down, the camera rides with a living team-mate. */
function followTheLiving(state) {
  const me = state.actors[0], view = state.actors[state.viewId];
  if (view.alive || me.deadT < 1.5) return;
  const mate = state.actors.find((a) => a.alive && a.team === me.team);
  if (mate) state.viewId = mate.id;
}

export function stepGame(state, dt) {
  state.tick++; state.time += dt;
  for (const c of state.coach) stepCoach(state, c, dt);
  crowd(state);
  for (let i = 0, n = state.actors.length; i < n; i++) {
    const a = state.actors[state.tick & 1 ? n - 1 - i : i]; // take turns going first: neither crew wins every same-tick duel
    if (!a.alive) { a.deadT += dt; a.px = a.x; a.py = a.y; a.pz = a.z; continue; }
    if (a.bot) thinkBot(state, a, dt);
    if (a.cmd.buy) { buy(state, a, a.cmd.buy); a.cmd.buy = null; }
    if (a.cmd.order) { order(state, state.coach[a.team], a, a.cmd.order); a.cmd.order = ''; }
    stepMovement(state, a, dt);
    stepWeapon(state, a, dt);
  }
  stepNades(state, dt);
  stepKeg(state, dt);
  stepDrops(state);
  stepRound(state, dt);
  followTheLiving(state);
}
