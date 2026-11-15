// The heads-up display: reads the state every frame and writes to the DOM only what changed.
import { NADES, ROUND, SIDES, WEAPONS } from '../config.js';
import { ATT, drain, sideOf, sideOfTeam } from '../sim/state.js';
import { zoneAt } from '../sim/map.js';
import { inaccuracy } from '../sim/weapons.js';
import { weaponOf } from '../sim/loadout.js';
import { canPlant, canDouse } from '../sim/keg.js';
import { shopOpen } from '../sim/economy.js';
import { createRadar } from './radar.js';
import { createShop, createBoard } from './panels.js';

const $ = (q) => document.querySelector(q);
const REASONS = { wiped: 'the other crew is down', time: 'the clock ran out', doused: 'the keg is doused', blast: 'the keg went up' };
const clockText = (t) => `${Math.floor(Math.max(0, t) / 60)}:${String(Math.floor(Math.max(0, t) % 60)).padStart(2, '0')}`;

export function createHud(state) {
  const el = {};
  for (const id of ['phase', 'time', 'roundNo', 'clock', 'zone', 'radio', 'feed', 'cross', 'hitmark', 'from', 'prompt', 'bar', 'banner', 'watching', 'hp', 'hpBar', 'ap', 'apBar', 'cash', 'kegTag', 'gun', 'mag', 'res', 'ammo', 'slots', 'pain', 'blind', 'scope', 'menu', 'menuLine', 'deploy']) el[id] = $(`#${id}`);
  const sides = [0, 1].map((t) => {
    const root = $(`#side${t}`), pips = root.querySelector('.pips');
    pips.innerHTML = '<i></i>'.repeat(5);
    return { root, name: root.querySelector('.name'), score: root.querySelector('.score'), pips: [...pips.children] };
  });
  const radar = createRadar($('#radar canvas')), shop = createShop($('#shop')), board = createBoard($('#board'));
  const slotEls = [...el.slots.children], last = new Map();
  let cursor = state.events.seq, hitT = 0, painT = 0, fromT = 0, fromX = 0, fromZ = 0, bannerEnd = 0, recap = '';

  /** Write text (or a style value) only when it differs from what is on screen. */
  const put = (node, value, prop = 'textContent') => { const key = node.id + prop; if (last.get(key) !== value) { last.set(key, value); if (prop === 'textContent') node.textContent = value; else node.style[prop] = value; } };
  const line = (list, html, cls, keep) => {
    const li = document.createElement('li');
    li.innerHTML = html; li.className = cls;
    list.appendChild(li);
    while (list.children.length > keep) list.firstChild.remove();
    setTimeout(() => { li.style.opacity = 0; setTimeout(() => li.remove(), 700); }, 7000);
  };
  const banner = (e, title, sub, seconds = 3.5) => { el.banner.firstElementChild.textContent = title; el.banner.lastElementChild.textContent = sub; el.banner.style.opacity = 1; last.set('banneropacity', '1'); bannerEnd = e.t + seconds; };
  const named = (a) => `<em class="s${sideOf(state, a)}">${a.name}</em>`;

  function onEvent(e, st) {
    const view = st.viewId, me = st.actors[view];
    if (e.type === 'kill') {
      const killer = e.a >= 0 ? st.actors[e.a] : null, how = WEAPONS[e.s] ? WEAPONS[e.s].name : e.s === 'keg' ? 'the keg' : 'Crackler';
      if (e.b === 0) recap = killer ? `${killer.name} got you with ${how} · ${Math.ceil(killer.hp)} hp left · ` : '';
      line(el.feed, `${killer ? named(killer) : ''}<i>${how}${e.n & 1 ? ' &middot; head' : ''}${e.n & 2 ? ' &middot; through cover' : ''}</i>${named(st.actors[e.b])}`, e.a === view || e.b === view ? 'mine' : '', 5);
    } else if (e.type === 'radio' && st.actors[e.a].team === me.team) line(el.radio, `${named(st.actors[e.a])} ${e.s}`, '', 4);
    else if (e.type === 'hurt' && e.b === view && e.a !== view) { hitT = 0.18; el.hitmark.className = e.s === 'head' ? 'head' : ''; }
    else if (e.type === 'hurt' && e.a === view) {
      painT = Math.min(1, painT + e.n / 60);
      if (e.b >= 0) { fromT = 1.2; fromX = st.actors[e.b].x; fromZ = st.actors[e.b].z; } // remember where it came from
    }
    else if (e.type === 'planted') banner(e, 'THE KEG IS LIT', `${e.s === 'A' ? 'Fish Market' : 'Boathouse'}: ${ROUND.fuse} seconds on the fuse`);
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
      cursor = drain(st, cursor, (e) => onEvent(e, st));
      const m = st.match, a = st.actors[st.viewId], w = weaponOf(a), lit = m.phase === 'planted';
      for (let t = 0; t < 2; t++) { // your crew on the left, in the colours of the side it plays this half
        const side = SIDES[sideOfTeam(st, t)];
        if (last.get(`side${t}`) !== side) { last.set(`side${t}`, side); sides[t].name.textContent = side.name.toUpperCase(); sides[t].root.style.color = side.color; }
        if (last.get(`score${t}`) !== m.score[t]) { last.set(`score${t}`, m.score[t]); sides[t].score.textContent = m.score[t]; }
        let alive = 0;
        for (const o of st.actors) if (o.team === t && o.alive) alive++;
        if (last.get(`pips${t}`) !== alive) { last.set(`pips${t}`, alive); sides[t].pips.forEach((p, i) => { p.className = i < alive ? 'up' : ''; }); }
      }
      put(el.time, clockText(m.t));
      put(el.phase, m.phase === 'freeze' ? 'BUY TIME' : lit ? 'KEG LIT' : m.phase === 'live' ? (sideOfTeam(st, a.team) === ATT ? 'ATTACK' : 'DEFEND') : 'ROUND OVER');
      put(el.clock, lit ? 'lit' : '', 'className');
      put(el.roundNo, `ROUND ${m.round} / ${ROUND.max}`);
      put(el.zone, zoneAt(a.x, a.z));
      put(el.hp, String(Math.ceil(a.hp))); put(el.hpBar, `${a.hp}%`, 'width');
      put(el.ap, `${Math.ceil(a.armor)}${a.helmet ? '+C' : ''}`); put(el.apBar, `${a.armor}%`, 'width');
      put(el.cash, `$${a.money}`);
      put(el.kegTag, a.hasKeg ? 'block' : 'none', 'display');
      put(el.gun, a.slot === 3 ? NADES[a.nadeSel].name.toUpperCase() : `${w.name.toUpperCase()}${a.reload > 0 ? ' · RELOADING' : ''}`);
      put(el.mag, a.slot === 3 ? String(a.nades[a.nadeSel]) : w.mag ? String(a.mag[a.slot]) : '-');
      put(el.res, a.slot === 3 || !w.mag ? '' : `/ ${a.res[a.slot]}`);
      put(el.ammo, w && w.mag && a.mag[a.slot] <= w.mag * 0.25 ? 'low' : '', 'className');
      const nadeCount = a.nades[0] + a.nades[1] + a.nades[2];
      const names = [a.slots[0] ? WEAPONS[a.slots[0]].name : 'no rifle', WEAPONS[a.slots[1]].name, 'Blade', `Nades ${nadeCount}`];
      slotEls.forEach((s, i) => { put(s, `${i + 1} ${names[i]}`); put(s, i === a.slot ? 'on' : (i === 0 && !a.slots[0]) || (i === 3 && !nadeCount) ? 'none' : '', 'className'); });

      // The crosshair is the firing cone: it opens when you run, jump or hold the trigger.
      const gap = `${(4 + inaccuracy(a, w) * 420).toFixed(1)}px`;
      if (last.get('gap') !== gap) { last.set('gap', gap); el.cross.style.setProperty('--gap', gap); }
      put(el.cross, a.alive && !a.scoped ? 'block' : 'none', 'display');
      put(el.scope, a.alive && a.scoped ? 'block' : 'none', 'display');
      hitT = Math.max(0, hitT - dt); painT = Math.max(0, painT - dt * 1.5);
      put(el.hitmark, hitT > 0 ? '1' : '0', 'opacity');
      put(el.pain, painT.toFixed(2), 'opacity');
      // An arc on the ring around the crosshair points at whoever just hit you.
      fromT = Math.max(0, fromT - dt);
      put(el.from, Math.min(1, fromT * 2).toFixed(1), 'opacity');
      if (fromT > 0) put(el.from, `rotate(${(a.yaw - Math.atan2(a.x - fromX, a.z - fromZ)).toFixed(2)}rad)`, 'transform');
      put(el.blind, Math.min(1, a.blind / 1.2).toFixed(2), 'opacity');
      if (st.time > bannerEnd) put(el.banner, '0', 'opacity');

      // One prompt at a time: the keg first, then the shop, then who you are watching.
      const me = st.actors[0], need = a.kit ? ROUND.douseKitTime : ROUND.douseTime;
      let prompt = '', progress = -1;
      if (a.use > 0) { prompt = a.hasKeg ? 'Lighting the keg' : 'Dousing the keg'; progress = a.use / (a.hasKeg ? ROUND.plantTime : need); }
      else if (a.alive && canPlant(st, a)) prompt = 'Hold E to light the keg here';
      else if (a.alive && canDouse(st, a)) prompt = `Hold E to douse the keg (${need} s)`;
      else if (a === me && me.human && shopOpen(st, me) && !shop.open) prompt = 'B opens the Chandler\'s Counter';
      put(el.prompt, prompt ? 'block' : 'none', 'display');
      put(el.prompt.firstElementChild, prompt);
      put(el.bar, progress >= 0 ? 'block' : 'none', 'display');
      el.bar.firstElementChild.style.width = `${Math.min(100, progress * 100)}%`;
      put(el.watching, me.alive ? '' : `${recap}${a !== me ? `WATCHING ${a.name.toUpperCase()}` : ''}`);
      radar.draw(st);
      shop.update(st); board.update(st);
    },
  };
}
