// Keyboard and mouse. Each fixed step, `apply` copies what is held into the player's cmd, the same record a
// bot's brain fills in, so the simulation never knows which it is driving.
import { SHOP_KEYS } from './ui/panels.js';

const SENSITIVITY = 0.0023;
const ORDERS = { z: 'A', x: 'B', g: 'me' }; // radio calls: hit or stack a site, fall in on me

export function createInput(canvas, state, hud) {
  const held = new Set();
  let yaw = 0, pitch = 0, fire = false, tap = false, alt = false, jump = false, slot = -1, nade = -1, round = -1;
  const me = () => state.actors[0];
  const locked = () => document.pointerLockElement === canvas;

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Tab') { e.preventDefault(); hud.board.show(true); return; }
    if (e.repeat || !locked()) return;
    held.add(e.code);
    const a = me(), key = e.key.toLowerCase();
    if (e.code === 'KeyB') hud.shop.toggle(state);
    else if (hud.shop.open && SHOP_KEYS.includes(key)) a.cmd.buy = hud.shop.pick(key);
    else if (e.code === 'Space') jump = true;
    else if (e.code === 'KeyV') state.third = !state.third;
    else if (ORDERS[key]) a.cmd.order = ORDERS[key];
    else if (key >= '1' && key <= '3') slot = +key - 1;
    else if (key === '4') { // each press steps to the next kind of grenade you carry
      for (let i = 1; i <= 3; i++) { const n = (Math.max(0, a.nadeSel) + (a.slot === 3 ? i : 0)) % 3; if (a.nades[n] > 0) { nade = n; slot = 3; break; } }
    }
  });
  document.addEventListener('keyup', (e) => { held.delete(e.code); if (e.code === 'Tab') hud.board.show(false); });
  document.addEventListener('mousemove', (e) => {
    if (!locked()) return;
    const k = SENSITIVITY * (me().scoped ? 0.35 : 1);
    yaw -= e.movementX * k;
    pitch = Math.max(-1.5, Math.min(1.5, pitch - e.movementY * k));
  });
  document.addEventListener('mousedown', (e) => { if (locked()) { if (e.button === 0) fire = tap = true; else if (e.button === 2) alt = true; } });
  document.addEventListener('mouseup', (e) => { if (e.button === 0) fire = false; else if (e.button === 2) alt = false; });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('wheel', (e) => { if (locked()) slot = (me().slot + (e.deltaY > 0 ? 1 : 2)) % 3; });

  return {
    locked,
    lock: () => canvas.requestPointerLock(),
    /** Fill the player's cmd for the next simulation step. */
    apply() {
      const a = me(), c = a.cmd;
      if (!a.human) return;
      if (round !== state.match.round) { round = state.match.round; yaw = a.yaw; pitch = 0; } // face the way you spawned
      c.yaw = yaw; c.pitch = pitch;
      c.mx = (held.has('KeyD') ? 1 : 0) - (held.has('KeyA') ? 1 : 0);
      c.mz = (held.has('KeyW') ? 1 : 0) - (held.has('KeyS') ? 1 : 0);
      c.duck = held.has('ControlLeft') || held.has('KeyC');
      c.walk = held.has('ShiftLeft');
      c.reload = held.has('KeyR'); c.use = held.has('KeyE');
      c.fire = (fire || tap) && !hud.shop.open; c.alt = alt; // a click shorter than one step still counts
      tap = false;
      c.jump = jump; c.slot = slot; c.nade = nade;
      jump = false; slot = -1; nade = -1;
    },
  };
}
