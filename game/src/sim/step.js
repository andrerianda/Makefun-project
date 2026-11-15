// One fixed step of the whole simulation, systems in a fixed order. Nothing in here knows about the screen.
import { createState } from './state.js';
import { makeCoach, stepCoach } from './coach.js';
import { makeBrain, thinkBot } from './bots.js';
import { crowd, stepMovement } from './movement.js';
import { stepWeapon } from './weapons.js';
import { stepNades } from './grenades.js';
import { stepKeg } from './keg.js';
import { buy } from './economy.js';
import { startMatch, stepRound } from './round.js';

/** A new match, ready to step. `watch` lets a bot play the player's body (attract mode). */
export function createGame(seed, watch) {
  const state = createState(seed, watch);
  state.coach[0] = makeCoach(0); state.coach[1] = makeCoach(1);
  for (const a of state.actors) if (!a.human) makeBrain(a, state.rng);
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
  for (const a of state.actors) {
    if (!a.alive) { a.deadT += dt; a.px = a.x; a.py = a.y; a.pz = a.z; continue; }
    if (a.bot) thinkBot(state, a, dt);
    if (a.cmd.buy) { buy(state, a, a.cmd.buy); a.cmd.buy = null; }
    stepMovement(state, a, dt);
    stepWeapon(state, a, dt);
  }
  stepNades(state, dt);
  stepKeg(state, dt);
  stepRound(state, dt);
  followTheLiving(state);
}
