// Money: what a round pays, what a kill pays, and the buy counter (for the player's menu and the bots alike).
import { ECON, GEAR, NADES, ROUND, WEAPONS } from '../config.js';
import { ATT, DEF, TEAM_SIZE, emit, sideOf, sideOfTeam } from './state.js';
import { SPAWN } from './map.js';
import { giveWeapon } from './loadout.js';

const pay = (a, n) => { a.money = Math.max(0, Math.min(ECON.cap, a.money + n)); };

export function rewardKill(killer, cause) {
  pay(killer, WEAPONS[cause] ? WEAPONS[cause].reward : 300);
}

/** End-of-round pay: winners take the win bonus; losers a bonus that grows with their losing streak. */
export function payRound(state, winnerTeam, planted) {
  const m = state.match;
  for (let team = 0; team < 2; team++) {
    const won = team === winnerTeam;
    m.streak[team] = won ? 0 : m.streak[team] + 1;
    let sum = won ? ECON.win : Math.min(ECON.loseMax, ECON.lose + ECON.loseStep * (m.streak[team] - 1));
    if (!won && planted && sideOfTeam(state, team) === ATT) sum += ECON.plantLoss;
    for (const a of state.actors) if (a.team === team) pay(a, sum);
  }
}

/** The price of a shop item, or -1 when this body may not have it (a Douse Kit is the defenders'). */
export function priceOf(state, a, item) {
  if (WEAPONS[item]) return WEAPONS[item].price;
  if (item === 'kit') return sideOf(state, a) === DEF ? GEAR.kit.price : -1;
  if (GEAR[item]) return GEAR[item].price;
  const n = NADES.find((g) => g.id === item);
  return n ? n.price : -1;
}

/** Buying is open in the freeze and the first seconds of a round, near your own spawn. */
export function shopOpen(state, a) {
  const m = state.match;
  if (!a.alive || !(m.phase === 'freeze' || (m.phase === 'live' && ROUND.live - m.t < ROUND.buyWindow))) return false;
  const home = SPAWN[sideOf(state, a)][0];
  return Math.hypot(a.x - home.x, a.z - home.z) < 16;
}

/** Try to buy one item; returns true when the money changed hands. */
export function buy(state, a, item) {
  const price = priceOf(state, a, item);
  if (price < 0 || price > a.money || !shopOpen(state, a)) return false;
  if (WEAPONS[item]) {
    if (a.slots[WEAPONS[item].slot] === item) return false;
    giveWeapon(a, item); a.slot = WEAPONS[item].slot; a.swap = 0.4; a.reload = 0;
  } else if (item === 'jerkin' || item === 'cap') {
    if (a.armor >= 100 && (item === 'jerkin' || a.helmet)) return false;
    a.armor = 100; if (item === 'cap') a.helmet = true;
  } else if (item === 'kit') {
    if (a.kit) return false;
    a.kit = true;
  } else {
    const i = NADES.findIndex((g) => g.id === item);
    if (a.nades[i] >= NADES[i].max) return false;
    a.nades[i]++; if (a.nadeSel < 0) a.nadeSel = i;
  }
  pay(a, -price);
  emit(state, 'buy', a.id, -1, a.x, a.y, a.z, price, item);
  return true;
}

/** A bot's shopping for the round: armour or grenades on a pistol round, a full buy when it can afford one,
 *  a force buy on a losing streak, and otherwise it saves. */
export function botShop(state, a) {
  const m = state.match, side = sideOf(state, a), pistols = m.round === 1 || m.round === ROUND.half + 1;
  let want = [];
  if (pistols) want = a.id % TEAM_SIZE % 2 ? ['jerkin'] : ['glare', 'seafog', 'crackler'];
  else if (a.slots[0] || a.money >= 3700) want = [a.slots[0] ? '' : side === ATT ? 'corsa' : 'tramont', 'cap', 'jerkin', side === DEF ? 'kit' : '', 'seafog', 'glare', 'crackler'];
  else if (a.money >= 2000 && m.streak[a.team] >= 2) want = [a.id % TEAM_SIZE % 2 ? 'cicada' : 'brine', 'jerkin', 'glare']; // a force buy to break the streak
  for (const item of want) if (item) buy(state, a, item); // otherwise: save for a full buy next round
}
