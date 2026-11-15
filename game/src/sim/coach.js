// The team's plan. Each round a coach picks a play, gives every bot a post and a job, and changes them as the
// round unfolds: the hit on a site, a rotation when one side lights up, the hold or the retake after a plant.
import { ROUND } from '../config.js';
import { ATT, TEAM_SIZE, emit, sideOfTeam, countAlive } from './state.js';
import { HOLDS, STAGE, SMOKES, SITES, zoneAt } from './map.js';

const OTHER = { A: 'B', B: 'A' };
const ZONE_SITE = { 'Fish Market': 'A', 'Net Row': 'A', "Cooper's Cut": 'A', Boathouse: 'B', Quay: 'B', Chandlery: 'B' };
// Where each of the five waits before the hit, per play: the 'main' door, 'mid' lane, a 'lurk' alley, a 'decoy' at the other site.
const PLAYS = {
  default: ['main', 'main', 'mid', 'lurk', 'decoy'],
  split: ['main', 'main', 'main', 'mid', 'mid'],
  fake: ['main', 'main', 'main', 'decoy', 'decoy'],
  rush: ['main', 'main', 'main', 'main', 'main'],
};
const SETUPS = { standard: 'AAMBB', stackA: 'AAAMB', stackB: 'ABBMB', mid: 'AMMBB' };

// A stack at a door stands in a loose wedge, not on one cobble.
const WEDGE = [[0, 0], [1.4, 0.9], [-1.4, 0.9], [0.7, 2.2], [-0.7, 2.2]];
const makeJob = () => ({ x: 0, z: 0, wx: 0, wz: 0, hold: false, quiet: false, nade: -1, nx: 0, nz: 0, site: 'M' });

export function makeCoach(team) {
  const jobs = [];
  for (let i = 0; i < TEAM_SIZE; i++) jobs.push(makeJob());
  return { team, side: ATT, play: 'default', site: 'A', hitAt: 0, go: false, lit: false, jobs, threat: { A: 0, B: 0 }, rotated: false, saidT: -9, said: '', think: 0, douser: -1, fetcher: -1, px: 0, pz: 0, lastSite: 'B' };
}

function post(j, p, hold, site) {
  j.x = p.x; j.z = p.z; j.wx = p.wx === undefined ? p.x : p.wx; j.wz = p.wz === undefined ? p.z : p.wz;
  j.hold = hold; j.site = site; j.nade = -1; j.quiet = false;
}

const holdSite = (c, site) => c.jobs.forEach((j, i) => post(j, HOLDS[site][i % HOLDS[site].length], true, site));

/** A line on the team radio, at most one every few seconds and never the same call twice running, so the feed stays readable. */
function radio(state, c, a, text, force = false) {
  if (!a || (!force && (state.time - c.saidT < 3 || text === c.said))) return;
  c.saidT = state.time; c.said = text;
  emit(state, 'radio', a.id, -1, a.x, a.y, a.z, 0, text);
}
const announce = (state, c, text) => radio(state, c, state.actors.find((a) => a.team === c.team && a.alive && a.bot), text, true);

/** Send the team into the site: every bot takes a post inside, two smoke the rotations and one flashes the site first. */
function hit(state, c) {
  c.go = true;
  const holds = HOLDS[c.site], smokes = SMOKES[c.site], site = SITES[c.site];
  c.jobs.forEach((j, i) => {
    post(j, holds[i % holds.length], true, c.site);
    if (i > 2) { j.nade = 2; j.nx = smokes[i >> 2].x; j.nz = smokes[i >> 2].z; }
    else if (i === 1) { j.nade = 1; j.nx = site.x; j.nz = site.z; }
  });
  announce(state, c, `Hit ${SITES[c.site].name} now, smokes out`);
}

/** Choose the site to hit and the cobble on it where the keg goes down. */
function target(state, c, site) {
  const cell = state.rng.pick(SITES[site].cells);
  c.site = site; c.px = cell.x; c.pz = cell.z;
}

function planAttack(state, c) {
  const rng = state.rng, poor = state.actors.filter((a) => a.team === c.team).reduce((s, a) => s + a.money, 0) / TEAM_SIZE < 1800;
  c.site = rng.chance(0.65) ? OTHER[c.lastSite] : c.lastSite;
  c.lastSite = c.site;
  target(state, c, c.site);
  const roll = rng.next();
  c.play = poor ? (roll < 0.6 ? 'rush' : 'split') : roll < 0.4 ? 'default' : roll < 0.65 ? 'split' : roll < 0.85 ? 'fake' : 'rush';
  c.hitAt = c.play === 'rush' ? 0 : c.play === 'split' ? rng.range(12, 18) : rng.range(22, 32);
  const stage = STAGE[c.site], other = STAGE[OTHER[c.site]];
  PLAYS[c.play].forEach((role, i) => {
    const j = c.jobs[i];
    post(j, role === 'main' ? stage.main : role === 'mid' ? STAGE.mid : role === 'lurk' ? stage.lurk : other.main, false, c.site);
    j.x += WEDGE[i][0]; j.z += WEDGE[i][1];
    j.quiet = role === 'lurk' || role === 'mid';
  });
  const line = { default: `Default, then we hit ${SITES[c.site].name}`, split: `Split ${SITES[c.site].name} through Bell Square`, fake: `Fake ${SITES[OTHER[c.site]].name}, hit ${SITES[c.site].name}`, rush: `Rush ${SITES[c.site].name}, go go go` };
  announce(state, c, line[c.play]);
}

function planDefence(state, c) {
  const roll = state.rng.next(), setup = roll < 0.55 ? 'standard' : roll < 0.7 ? 'stackA' : roll < 0.85 ? 'stackB' : 'mid';
  const used = { A: 0, B: 0, M: 0 };
  c.jobs.forEach((j, i) => { const s = SETUPS[setup][i]; post(j, HOLDS[s][used[s]++ % HOLDS[s].length], true, s); });
  announce(state, c, setup === 'standard' ? 'Two Market, two Boathouse, one Bell Square' : setup === 'mid' ? 'Two on Bell Square, hold the gate' : `Stacking ${SITES[setup === 'stackA' ? 'A' : 'B'].name} this round`);
}

export function planRound(state, c) {
  c.side = sideOfTeam(state, c.team);
  c.go = false; c.lit = false; c.rotated = false; c.douser = -1; c.fetcher = -1; c.threat.A = 0; c.threat.B = 0; c.saidT = -9;
  if (c.side === ATT) planAttack(state, c); else planDefence(state, c);
}

/** A bot saw an enemy: tell the team, and count it towards the site that lane leads to. */
export function report(state, a, enemy) {
  const c = state.coach[a.team], zone = zoneAt(enemy.x, enemy.z), site = ZONE_SITE[zone];
  if (site) c.threat[site] += enemy.hasKeg ? 2.5 : 1;
  radio(state, c, a, enemy.hasKeg ? `Keg carrier, ${zone}` : `Contact ${zone}`);
}

/** The player's call on the radio: the crew hits (or stacks) a site, or falls in on the caller. */
export function order(state, c, a, call) {
  if (state.keg.state === 'planted') return;
  if (call !== 'me' && c.side === ATT) { target(state, c, call); hit(state, c); return; }
  if (call !== 'me') holdSite(c, call);
  else c.jobs.forEach((j, i) => { post(j, a, false, j.site); j.x += WEDGE[i][0]; j.z += WEDGE[i][1]; });
  radio(state, c, a, call === 'me' ? 'On me' : `Everyone ${SITES[call].name}`, true);
}

function nearestBot(state, c, x, z, preferKit) {
  let best = null, bestD = Infinity;
  for (const a of state.actors) {
    if (!a.alive || a.team !== c.team || !a.bot) continue;
    const d = Math.hypot(a.x - x, a.z - z) - (preferKit && a.kit ? 8 : 0);
    if (d < bestD) { best = a; bestD = d; }
  }
  return best;
}

export function stepCoach(state, c, dt) {
  c.think -= dt;
  if (c.think > 0) return;
  c.think = 0.25;
  const m = state.match, k = state.keg;
  c.threat.A *= 0.96; c.threat.B *= 0.96;
  if (m.phase !== 'live' && m.phase !== 'planted') return;
  if (c.side === ATT) {
    if (!c.go && (ROUND.live - m.t >= c.hitAt || m.t < 50 || countAlive(state, c.team) <= 3)) hit(state, c);
    if (k.state === 'dropped') { // someone fetch the keg
      const a = nearestBot(state, c, k.x, k.z, false);
      if (a) { c.fetcher = a.id; post(c.jobs[a.id % TEAM_SIZE], k, true, c.site); radio(state, c, a, `Keg is down at ${zoneAt(k.x, k.z)}, I have it`); }
    } else if (c.fetcher >= 0 && k.state === 'carried') { // picked up: back to the plan
      post(c.jobs[c.fetcher % TEAM_SIZE], HOLDS[c.site][0], true, c.site); c.fetcher = -1;
    } else if (k.state === 'planted' && !c.lit) { // hold the site until the fuse runs out
      c.lit = true; c.site = k.site;
      holdSite(c, k.site);
      announce(state, c, `Keg is lit, hold ${SITES[k.site].name}`);
    }
    return;
  }
  if (k.state === 'planted') { // retake: one douses, the rest cover the doors
    if (!c.lit) {
      c.lit = true;
      holdSite(c, k.site);
      announce(state, c, `They lit it at ${SITES[k.site].name}, retake`);
    }
    const a = nearestBot(state, c, k.x, k.z, true);
    if (a && !state.actors[c.douser]?.alive) { c.douser = a.id; post(c.jobs[a.id % TEAM_SIZE], k, true, k.site); radio(state, c, a, 'Dousing, watch my back'); }
    return;
  }
  const lead = c.threat.A - c.threat.B;
  if (!c.rotated && Math.abs(lead) > 1) { // one side is loud: the middle and one far defender come over
    const hot = lead > 0 ? 'A' : 'B';
    let moved = 0, slot = 2;
    for (const j of c.jobs) if (j.site !== hot && (j.site === 'M' || moved++ === 0)) post(j, HOLDS[hot][slot++ % HOLDS[hot].length], true, hot);
    c.rotated = true;
    announce(state, c, `Rotating ${SITES[hot].name}`);
  }
}
