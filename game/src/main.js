// CAMPANILE: a 5v5 round-based tactical shooter in a pastel harbour town, on three.js.
//
// How the code is laid out (one job per module):
//   config.js        every number: movement, rounds, economy, the armoury, the palette
//   sim/             the game itself, no DOM and no three.js: it runs headless in Node
//     state.js         the one state object, its event ring and noises
//     map.js           Porto Vesper as text: lanes, sites, posts, smoke targets
//     world.js         collision, ray casts, hitboxes      movement.js  acceleration, crouch, jump
//     weapons.js       cone, recoil, wall-bangs            damage.js    zones and armour
//     grenades.js      frag, flash, smoke                  keg.js       plant and douse
//     economy.js       pay and the buy counter             round.js     phases, wins, half-time
//     coach.js         team plays and rotations            bots.js      one bot's eyes, ears and trigger
//     nav.js           A* and string-pulling               step.js      one fixed step, systems in order
//   render/          draws the state: baked level, sky, actors, effects, the weapon in hand; kit.js reads the models
//   ui/              HUD, radar, buy counter, scoreboard   audio.js   synthesised sound   input.js  keys to cmd
//
// The loop below steps the simulation at a fixed 60 Hz and renders as fast as the display asks,
// interpolating between the last two steps.
import { TICK } from './config.js';
import { createGame, stepGame } from './sim/step.js';
import { startMatch } from './sim/round.js';
import { loadKit } from './render/kit.js';
import { createView } from './render/view.js';
import { createHud } from './ui/hud.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';

const query = new URLSearchParams(location.search);
const watch = query.has('watch'); // attract mode: a bot plays your body and the match runs by itself
const state = createGame(Number(query.get('seed')) || (Date.now() & 0xffff) + 1, watch, Number(query.get('level') ?? 1));
const view = createView(document.getElementById('game'), state, await loadKit(['assets/kit.txt', 'assets/props.txt']), query.has('sharp'));
const hud = createHud(state), audio = createAudio(state), input = createInput(view.canvas, state, hud);
const INTRO = document.getElementById('menuLine').textContent;

// For the screenshot script and for tinkering in the console: the live state and HUD, a way to skip ahead,
// and a switch that stops the clock so a frame can be looked at.
const dev = window.campanile = { state, hud, hold: false, skip(seconds) { for (let i = 0; i < seconds / TICK; i++) stepGame(state, TICK); } };

let last = performance.now(), debt = 0, encore = 0;
const running = () => !dev.hold && (watch || input.locked());

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const live = running();
  if (live) {
    debt += dt;
    while (debt >= TICK) { input.apply(); stepGame(state, TICK); debt -= TICK; }
  }
  // A stopped clock stops the effects too, so a paused frame stays exactly as it was.
  view.frame(state, live ? debt / TICK : 1, live ? dt : 0);
  hud.update(state, live ? dt : 0);
  // The match is decided: hand the mouse back so the result card can offer another, or (watching) start one.
  if (state.match.phase === 'final') {
    if (!watch) { if (input.locked()) document.exitPointerLock(); } else if ((encore += dt) > 8) { encore = 0; startMatch(state); }
  }
  audio.update(state);
  requestAnimationFrame(frame);
}

function menu() {
  const m = state.match;
  if (running()) hud.menu(null);
  else if (m.phase === 'final') hud.menu(m.champion < 0 ? `A draw, ${m.score[0]} all.` : `${m.champion ? 'The other crew takes' : 'Your crew takes'} Porto Vesper, ${m.score[0]} to ${m.score[1]}.`, 'Play again');
  else hud.menu(m.round > 1 || m.phase !== 'freeze' ? 'Paused. The match waits for you.' : INTRO, m.round > 1 ? 'Click to resume' : 'Click to deploy');
}

document.getElementById('deploy').addEventListener('click', () => {
  if (state.match.phase === 'final') startMatch(state);
  audio.start();
  input.lock();
});
document.addEventListener('pointerlockchange', menu);
window.addEventListener('click', () => { if (watch) audio.start(); });
menu();
requestAnimationFrame(frame);
