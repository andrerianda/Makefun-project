// The heads-up display: reads the state every frame and writes to the DOM only what changed.
import { NADES, ROUND, SIDES, WEAPONS } from '../config.js';
import { ATT, drain, sideOf, sideOfTeam, countAlive } from '../sim/state.js';
import { SITES, zoneAt } from '../sim/map.js';
import { inaccuracy } from '../sim/weapons.js';
import { HEAD, WALLBANG } from '../sim/damage.js';
import { weaponOf } from '../sim/loadout.js';
import { canPlant, canDouse, douseTime } from '../sim/keg.js';
import { shopOpen } from '../sim/economy.js';
import { createRadar } from './radar.js';
import { createShop, createBoard } from './panels.js';

const $ = (q) => document.querySelector(q);
const REASONS = { wiped: 'the other crew is down', time: 'the clock ran out', doused: 'the keg is doused', blast: 'the keg went up' };
const clockText = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; // from whole seconds
const percent = (v) => `${v}%`, turn = (v) => `rotate(${v / 50}rad)`;
const roundText = (n) => `ROUND ${n} / ${ROUND.max}`;

export function createHud(state) {
  const el = {};
  for (const id of ['phase', 'time', 'roundNo', 'clock', 'zone', 'radio', 'feed', 'cross', 'hitmark', 'from', 'prompt', 'bar', 'banner', 'watching', 'hp', 'hpBar', 'ap', 'apBar', 'cash', 'kegTag', 'gun', 'mag', 'res', 'ammo', 'slots', 'pain', 'blind', 'scope', 'menu', 'menuLine', 'deploy']) el[id] = $(`#${id}`);
  const sides = [0, 1].map((t) => {
    const root = $(`#side${t}`), pips = root.querySelector('.pips');
    pips.innerHTML = '<i></i>'.repeat(5);
    return { root, name: root.querySelector('.name'), score: root.querySelector('.score'), pips: [...pips.children], side: null, alive: -1 };
  });
  const radar = createRadar($('#radar canvas')), shop = createShop($('#shop')), board = createBoard($('#board'));
  const slotEls = [...el.slots.children], shown = new Map();
  let cursor = state.events.seq, hitT = 0, painT = 0, fromT = 0, fromX = 0, fromZ = 0, bannerEnd = 0, recap = '', gap = 0;

  /** Write a node's text or class (or a style value) only when the value behind it changed; `text` formats it,
   *  so a number that did not move costs a comparison and no string. */
  const put = (node, value, prop = 'textContent', text) => {
    const seen = shown.get(node) || shown.set(node, {}).get(node);
    if (seen[prop] === value) return;
    seen[prop] = value;
    if (prop in node) node[prop] = text ? text(value) : value; else node.style[prop] = text ? text(value) : value;
  };
  const line = (list, html, cls, keep) => {
    const li = document.createElement('li');
    li.innerHTML = html; li.className = cls;
    list.appendChild(li);
    while (list.children.length > keep) list.firstChild.remove();
    setTimeout(() => { li.style.opacity = 0; setTimeout(() => li.remove(), 700); }, 7000);
  };
  const banner = (e, title, sub, seconds = 3.5) => { el.banner.firstElementChild.textContent = title; el.banner.lastElementChild.textContent = sub; put(el.banner, 1, 'opacity'); bannerEnd = e.t + seconds; };
  const watching = (id) => (id < 0 ? '' : id ? `${recap} · WATCHING ${state.actors[id].name.toUpperCase()}` : recap); // by id: no string per frame
  const named = (a) => `<em class="s${sideOf(state, a)}">${a.name}</em>`;

  function onEvent(e) {
    const st = state, view = st.viewId, me = st.actors[view];
    if (e.type === 'kill') {
      const killer = e.a >= 0 ? st.actors[e.a] : null, how = WEAPONS[e.s] ? WEAPONS[e.s].name : e.s === 'keg' ? 'the keg' : 'Crackler';
      if (e.b === 0) recap = killer ? `${killer.name} got you with ${how} · ${Math.ceil(killer.hp)} hp left` : '';
      line(el.feed, `${killer ? named(killer) : ''}<i>${how}${e.n & HEAD ? ' &middot; head' : ''}${e.n & WALLBANG ? ' &middot; through cover' : ''}</i>${named(st.actors[e.b])}`, e.a === view || e.b === view ? 'mine' : '', 5);
    } else if (e.type === 'radio' && st.actors[e.a].team === me.team) line(el.radio, `${named(st.actors[e.a])} ${e.s}`, '', 4);
    else if (e.type === 'hurt' && e.b === view && e.a !== view) { hitT = 0.18; el.hitmark.className = e.s === 'head' ? 'head' : ''; }
    else if (e.type === 'hurt' && e.a === view) {
      painT = Math.min(1, painT + e.n / 60);
      if (e.b >= 0) { fromT = 1.2; fromX = st.actors[e.b].x; fromZ = st.actors[e.b].z; } // remember where it came from
    }
    else if (e.type === 'planted') banner(e, 'THE KEG IS LIT', `${SITES[e.s].name}: ${ROUND.fuse} seconds on the fuse`);
    else if (e.type === 'round') {
      const m = st.match;
      if (e.s === 'freeze') banner(e, `ROUND ${m.round}`, sideOf(st, me) === ATT ? 'Light the keg at the Fish Market or the Boathouse' : 'Hold both sites; douse the keg if it is lit');
      else if (e.s === 'final') banner(e, m.champion < 0 ? 'A DRAW' : m.champion ? 'THE OTHER CREW TAKES PORTO VESPER' : 'YOUR CREW TAKES PORTO VESPER', `${m.score[0]} : ${m.score[1]}`, 60);
      else if (e.s !== 'live') banner(e, `${SIDES[sideOfTeam(st, e.n)].name.toUpperCase()} WIN THE ROUND`, REASONS[e.s], ROUND.post - 0.5);
    }
  }

  return {
    shop, board,
    /** Show the start, pause or end card (or hide it with null). */
    menu(text, button) {
      el.menu.style.display = text ? 'block' : 'none';
      if (text) { el.menuLine.textContent = text; el.deploy.textContent = button; }
    },
    update(st, dt) {
      cursor = drain(st, cursor, onEvent);
      const m = st.match, a = st.actors[st.viewId], w = weaponOf(a), lit = m.phase === 'planted';
      for (let t = 0; t < 2; t++) { // your crew on the left, in the colours of the side it plays this half
        const s = sides[t], side = SIDES[sideOfTeam(st, t)];
        if (s.side !== side) { s.side = side; s.name.textContent = side.name; s.root.style.color = side.color; }
        put(s.score, m.score[t]);
        const alive = countAlive(st, t);
        if (s.alive !== alive) { s.alive = alive; for (let i = 0; i < 5; i++) s.pips[i].className = i < alive ? 'up' : ''; }
      }
      put(el.time, Math.max(0, Math.floor(m.t)), 'textContent', clockText);
      put(el.phase, m.phase === 'freeze' ? 'BUY TIME' : lit ? 'KEG LIT' : m.phase === 'live' ? (sideOfTeam(st, a.team) === ATT ? 'ATTACK' : 'DEFEND') : 'ROUND OVER');
      put(el.clock, lit ? 'lit' : '', 'className');
      put(el.roundNo, m.round, 'textContent', roundText);
      put(el.zone, zoneAt(a.x, a.z));
      // The style sheet adds the units and labels around these bare numbers and names.
      put(el.hp, Math.ceil(a.hp)); put(el.hpBar, Math.ceil(a.hp), 'width', percent);
      put(el.ap, Math.ceil(a.armor)); put(el.ap, a.helmet ? 'cap' : '', 'className'); put(el.apBar, Math.ceil(a.armor), 'width', percent);
      put(el.cash, a.money);
      put(el.kegTag, a.hasKeg ? 'block' : 'none', 'display');
      put(el.gun, a.slot === 3 ? NADES[a.nadeSel].name : w.name); put(el.gun, a.reload > 0 ? 'busy' : '', 'className');
      put(el.mag, a.slot === 3 ? a.nades[a.nadeSel] : w.mag ? a.mag[a.slot] : '-');
      put(el.res, a.slot === 3 || !w.mag ? '' : a.res[a.slot]);
      put(el.ammo, w && w.mag && a.mag[a.slot] <= w.mag * 0.25 ? 'low' : '', 'className');
      const nadeCount = a.nades[0] + a.nades[1] + a.nades[2];
      put(slotEls[0], a.slots[0] ? WEAPONS[a.slots[0]].name : 'no rifle'); put(slotEls[1], WEAPONS[a.slots[1]].name); put(slotEls[3], nadeCount);
      for (let i = 0; i < 4; i++) put(slotEls[i], i === a.slot ? 'on' : (i === 0 && !a.slots[0]) || (i === 3 && !nadeCount) ? 'none' : '', 'className');

      // The crosshair is the firing cone: it opens when you run, jump or hold the trigger.
      const cone = Math.round(8 + inaccuracy(a, w) * 840) / 2;
      if (cone !== gap) { gap = cone; el.cross.style.setProperty('--gap', `${gap}px`); }
      put(el.cross, a.alive && !a.scoped ? 'block' : 'none', 'display');
      put(el.scope, a.alive && a.scoped ? 'block' : 'none', 'display');
      hitT = Math.max(0, hitT - dt); painT = Math.max(0, painT - dt * 1.5);
      put(el.hitmark, hitT > 0 ? 1 : 0, 'opacity');
      put(el.pain, Math.round(painT * 20) / 20, 'opacity');
      // An arc on the ring around the crosshair points at whoever just hit you.
      fromT = Math.max(0, fromT - dt);
      put(el.from, Math.min(1, Math.round(fromT * 10) / 5), 'opacity');
      if (fromT > 0) put(el.from, Math.round((a.yaw - Math.atan2(a.x - fromX, a.z - fromZ)) * 50), 'transform', turn);
      put(el.blind, Math.min(1, Math.round(a.blind * 16) / 20), 'opacity');
      if (st.time > bannerEnd) put(el.banner, 0, 'opacity');

      // One prompt at a time: the keg first, then the shop, then who you are watching.
      const me = st.actors[0];
      let prompt = '', progress = -1;
      if (a.use > 0) { prompt = a.hasKeg ? 'Lighting the keg' : 'Dousing the keg'; progress = a.use / (a.hasKeg ? ROUND.plantTime : douseTime(a)); }
      else if (a.alive && canPlant(st, a)) prompt = 'Hold E to light the keg here';
      else if (a.alive && canDouse(st, a)) prompt = 'Hold E to douse the keg';
      else if (a === me && me.human && shopOpen(st, me) && !shop.open) prompt = 'B opens the Chandler\'s Counter';
      put(el.prompt, prompt ? 'block' : 'none', 'display');
      put(el.prompt.firstElementChild, prompt);
      put(el.bar, progress >= 0 ? 'block' : 'none', 'display');
      put(el.bar.firstElementChild, Math.min(100, Math.round(progress * 100)), 'width', percent);
      put(el.watching, me.alive ? -1 : a.id, 'textContent', watching);
      radar.draw(st);
      shop.update(st); board.update(st);
    },
  };
}
