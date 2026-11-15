// The whole game state lives in the one object createState returns. Systems read and write it; the renderer,
// the HUD and the audio only read it and drain its event ring.
import { CREWS, ECON } from '../config.js';
import { makeRng } from './rng.js';

export const ATT = 0, DEF = 1; // a side: attacking or defending this half
export const TEAM_SIZE = 5;
export const DROPS = 8; // rifles that can lie on the ground at once
const EVENTS = 256, SOUNDS = 32, NADE_POOL = 12;

function makeActor(id) {
  const team = id < TEAM_SIZE ? 0 : 1;
  return {
    id, team, name: CREWS[team][id % TEAM_SIZE], human: false, skill: 0.5,
    alive: false, hp: 0, armor: 0, helmet: false, kit: false, money: ECON.start,
    x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, ground: true, duck: 0,
    slots: [null, 'sparrow', 'knife'], mag: [0, 0, 0], res: [0, 0, 0], slot: 1, nades: [0, 0, 0], nadeSel: -1,
    cool: 0, reload: 0, swap: 0, shots: 0, sinceShot: 9, bloom: 0, punchP: 0, punchY: 0, held: false, altHeld: false, scoped: false,
    blind: 0, slow: 0, stride: 0, hasKeg: false, use: 0, deadT: 0,
    kills: 0, deaths: 0, plants: 0, hurtBy: -1,
    // What this body wants to do this tick: the keyboard and mouse fill it for the player, a brain for a bot.
    cmd: { mx: 0, mz: 0, yaw: 0, pitch: 0, jump: false, duck: false, walk: false, fire: false, alt: false, reload: false, use: false, slot: -1, nade: -1, buy: null, order: '' },
    bot: null,
  };
}

/** A fresh match. `seed` fixes every dice roll; `watch` hands the player's body to a bot (attract mode). */
export function createState(seed = 1, watch = false) {
  const actors = [];
  for (let i = 0; i < TEAM_SIZE * 2; i++) actors.push(makeActor(i));
  actors[0].human = !watch;
  if (watch) actors[0].name = 'Fenn';
  const list = [];
  for (let i = 0; i < EVENTS; i++) list.push({ type: '', t: 0, a: -1, b: -1, x: 0, y: 0, z: 0, x2: 0, y2: 0, z2: 0, n: 0, s: '' });
  const sounds = [];
  for (let i = 0; i < SOUNDS; i++) sounds.push({ x: 0, z: 0, radius: 0, team: -1, t: -9, kind: '' });
  const nades = [];
  for (let i = 0; i < NADE_POOL; i++) nades.push({ live: false, type: 0, owner: -1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, fuse: 0, cloud: 0, rest: false });
  const drops = []; // rifles the dead let fall, for anyone without one to take
  for (let i = 0; i < DROPS; i++) drops.push({ live: false, id: '', x: 0, z: 0, mag: 0, res: 0 });
  return {
    tick: 0, time: 0, rng: makeRng(seed), actors, viewId: 0, third: false, nades, // whose eyes, and from over the shoulder or not
    match: { round: 0, score: [0, 0], attackers: 0, phase: 'freeze', t: 0, streak: [0, 0], over: false, champion: -1, last: null },
    keg: { state: 'carried', carrier: -1, x: 0, y: 0, z: 0, fuse: 0, site: '', douser: -1, beep: 0 },
    coach: [null, null],
    events: { list, seq: 0 }, sounds, soundSeq: 0, drops, dropSeq: 0,
  };
}

/** Which side (ATT or DEF) a team plays this half. */
export const sideOfTeam = (state, team) => (team === state.match.attackers ? ATT : DEF);
export const sideOf = (state, a) => sideOfTeam(state, a.team);

/** True while the camera sits over the shoulder: the player asked for it, and the body is up and not on a scope. */
export const overShoulder = (state) => { const a = state.actors[state.viewId]; return state.third && a.alive && !a.scoped; };

/** Record something that happened; the view layers drain these, the simulation never waits on them. */
export function emit(state, type, a = -1, b = -1, x = 0, y = 0, z = 0, n = 0, s = '', x2 = 0, y2 = 0, z2 = 0) {
  const e = state.events.list[state.events.seq++ & (EVENTS - 1)];
  e.type = type; e.t = state.time; e.a = a; e.b = b; e.x = x; e.y = y; e.z = z; e.n = n; e.s = s; e.x2 = x2; e.y2 = y2; e.z2 = z2;
}

/** A noise bots can hear: where, how far it carries, and whose it is. */
export function noise(state, x, z, radius, team, kind) {
  const s = state.sounds[state.soundSeq++ & (SOUNDS - 1)];
  s.x = x; s.z = z; s.radius = radius; s.team = team; s.t = state.time; s.kind = kind;
}

/** Visit every event from a cursor to now; returns the new cursor. `fresh` skips anything older than that many
 *  seconds, so a view that fell behind (a hidden tab) does not replay stale flashes and bangs. */
export function drain(state, cursor, visit, fresh = Infinity) {
  const ev = state.events;
  for (let i = Math.max(cursor, ev.seq - EVENTS); i < ev.seq; i++) {
    const e = ev.list[i & (EVENTS - 1)];
    if (state.time - e.t <= fresh) visit(e);
  }
  return ev.seq;
}

export const countAlive = (state, team) => {
  let n = 0;
  for (const a of state.actors) if (a.alive && a.team === team) n++;
  return n;
};
