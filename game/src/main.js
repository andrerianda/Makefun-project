// CAMPANILE: a 5v5 round-based tactical shooter in a harbour town (index.html opens with a map of the source).
// The loop below steps the simulation at a fixed 60 Hz and draws between steps, interpolating the last two.
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
const state = createGame(Number(query.get('seed')) || (Date.now() & 0xffff) + 1, watch, Number(query.get('level') ?? 1) || 0);
const view = createView(document.getElementById('game'), state, await loadKit(['assets/kit.txt', 'assets/props.txt', 'assets/land.txt']), query.has('sharp'));
const hud = createHud(state), audio = createAudio(state), input = createInput(view.canvas, state, hud);
const INTRO = document.getElementById('menuLine').textContent;

// For the console and the screenshot script: skip ahead, or stop the clock.
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
  if (running()) { hud.menu(null); return; }
  hud.shop.toggle(state, false); // a pause never leaves the counter open under the card
  if (m.phase === 'final') hud.menu(m.champion < 0 ? `A draw, ${m.score[0]} all.` : `${m.champion ? 'The other crew takes' : 'Your crew takes'} Porto Vesper, ${m.score[0]} to ${m.score[1]}.`, 'Play again');
  else { const begun = m.round > 1 || m.phase !== 'freeze'; hud.menu(begun ? 'Paused. The match waits for you.' : INTRO, begun ? 'Click to resume' : 'Click to deploy'); }
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
