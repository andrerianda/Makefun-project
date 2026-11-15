// The match: freeze, live, lit, over. Who wins a round and why, the half-time swap, and the reset between rounds.
import { ECON, ROUND } from '../config.js';
import { ATT, DEF, TEAM_SIZE, emit, sideOf, countAlive } from './state.js';
import { SPAWN, STAGE } from './map.js';
import { payRound, botShop } from './economy.js';
import { giveKeg } from './keg.js';
import { resetLoadout } from './loadout.js';
import { planRound } from './coach.js';

const teamOnSide = (state, side) => (side === ATT ? state.match.attackers : 1 - state.match.attackers);

function spawn(state, a, index) {
  const side = sideOf(state, a), p = SPAWN[side][(index * 3 + state.match.round) % SPAWN[side].length];
  const fresh = !a.alive;
  a.alive = true; a.hp = 100; a.x = a.px = p.x; a.y = a.py = 0; a.z = a.pz = p.z; a.vx = a.vy = a.vz = 0;
  a.yaw = a.cmd.yaw = side === ATT ? Math.atan2(p.x - STAGE.mid.x, p.z - STAGE.mid.z) : Math.PI; a.pitch = a.cmd.pitch = 0; // face Bell Lane, or the square
  a.duck = 0; a.blind = 0; a.slow = 0; a.use = 0; a.hasKeg = false; a.ground = true; a.cmd.buy = null;
  if (side === ATT) a.kit = false;
  resetLoadout(a, fresh);
  if (a.bot) { a.bot.target = -1; a.bot.lost = 9; a.bot.path.n = 0; a.bot.gx = 1e9; a.bot.threw = false; a.bot.heardT = state.time; }
}

export function startRound(state) {
  const m = state.match;
  m.round++; m.phase = 'freeze'; m.t = ROUND.freeze; m.last = null;
  state.actors.forEach((a, i) => spawn(state, a, i % TEAM_SIZE));
  for (const n of state.nades) n.live = false;
  for (const d of state.drops) d.live = false;
  state.viewId = 0;
  // The keg goes to a bot on the attacking side; the player may take it over if it is dropped.
  const base = m.attackers * TEAM_SIZE;
  giveKeg(state, state.actors[base + 1 + state.rng.int(TEAM_SIZE - 1)]);
  state.keg.douser = -1; state.keg.site = '';
  for (const c of state.coach) planRound(state, c);
  for (const a of state.actors) if (a.bot) botShop(state, a);
  emit(state, 'round', -1, -1, 0, 0, 0, m.round, 'freeze');
}

export function startMatch(state) {
  const m = state.match;
  m.round = 0; m.score[0] = m.score[1] = 0; m.streak[0] = m.streak[1] = 0; m.attackers = 0; m.over = false; m.champion = -1;
  for (const a of state.actors) { a.alive = false; a.money = ECON.start; a.kills = a.deaths = a.plants = 0; }
  startRound(state);
}

/** Close the round: score it, pay both teams, and decide whether the match is over. */
function endRound(state, side, reason) {
  const m = state.match, team = teamOnSide(state, side);
  m.score[team]++;
  payRound(state, team, state.keg.state !== 'carried' && state.keg.state !== 'dropped');
  m.phase = 'over'; m.t = ROUND.post; m.last = { team, side, reason };
  if (m.score[team] >= ROUND.toWin || m.round >= ROUND.max) { m.over = true; m.champion = m.score[0] === m.score[1] ? -1 : m.score[0] > m.score[1] ? 0 : 1; }
  emit(state, 'round', -1, -1, 0, 0, 0, team, reason);
}

export function stepRound(state, dt) {
  const m = state.match, k = state.keg;
  if (m.phase === 'final') return;
  if (m.phase === 'freeze') {
    m.t -= dt;
    if (m.t <= 0) { m.phase = 'live'; m.t = ROUND.live; emit(state, 'round', -1, -1, 0, 0, 0, m.round, 'live'); }
  } else if (m.phase === 'live') {
    m.t -= dt;
    if (k.state === 'planted') { m.phase = 'planted'; m.t = k.fuse; }
    else if (countAlive(state, teamOnSide(state, ATT)) === 0) endRound(state, DEF, 'wiped');
    else if (countAlive(state, teamOnSide(state, DEF)) === 0) endRound(state, ATT, 'wiped');
    else if (m.t <= 0) endRound(state, DEF, 'time');
  } else if (m.phase === 'planted') { // a lit keg still wins it for dead Smugglers; only a douse stops it
    m.t = Math.max(0, k.fuse);
    if (k.state === 'doused') endRound(state, DEF, 'doused');
    else if (k.state === 'blown') endRound(state, ATT, 'blast');
    else if (countAlive(state, teamOnSide(state, DEF)) === 0) endRound(state, ATT, 'wiped');
  } else if (m.phase === 'over') {
    m.t -= dt;
    if (m.t > 0) return;
    if (m.over) { m.phase = 'final'; emit(state, 'round', -1, -1, 0, 0, 0, m.champion, 'final'); return; }
    if (m.round === ROUND.half) { // half time: swap sides, and everyone starts again from pistols
      m.attackers = 1 - m.attackers; m.streak[0] = m.streak[1] = 0;
      for (const a of state.actors) { a.alive = false; a.money = ECON.start; }
    }
    startRound(state);
  }
}
