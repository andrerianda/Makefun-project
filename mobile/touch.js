// Touch controls for trying CAMPANILE on a phone. This is a test harness outside game/: it is not part of the
// entry. It leaves the game untouched and speaks its language instead: a virtual stick sends W/A/S/D key events,
// a drag on the right half sends mouse movement, and the buttons send the same keys and clicks a desktop does.
// Pointer lock does not exist on phones, so it is stood in for: "locked" simply means "playing".

const canvas = () => document.querySelector('#game canvas');
let playing = false;
Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => (playing ? canvas() : null) });
const setPlaying = (on) => { playing = on; document.dispatchEvent(new Event('pointerlockchange')); };
HTMLCanvasElement.prototype.requestPointerLock = () => setPlaying(true);
document.exitPointerLock = () => setPlaying(false);

const key = (type, code, k = '') => document.dispatchEvent(new KeyboardEvent(type, { code, key: k, bubbles: true }));
const tapKey = (code, k) => { key('keydown', code, k); key('keyup', code, k); };
const mouse = (type, button, dx = 0, dy = 0) => {
  const e = new MouseEvent(type, { button, bubbles: true });
  Object.defineProperty(e, 'movementX', { value: dx });
  Object.defineProperty(e, 'movementY', { value: dy });
  document.dispatchEvent(e);
};

const style = document.createElement('style');
style.textContent = `
  #touch { position: fixed; inset: 0; z-index: 1; touch-action: none; user-select: none; -webkit-user-select: none; }
  #hud { z-index: 2; } /* the HUD lets touches through, except its panels: the buy counter's rows stay tappable */
  #touch .pad { position: absolute; left: 40px; bottom: 150px; width: 190px; height: 190px; border-radius: 50%; border: 2px solid rgba(244,234,216,.35); background: rgba(22,24,38,.3); }
  #touch .nub { position: absolute; left: 60px; top: 60px; width: 70px; height: 70px; border-radius: 50%; background: rgba(244,234,216,.55); }
  #touch button { position: absolute; font: 800 15px 'Trebuchet MS', sans-serif; letter-spacing: .06em; color: #f4ead8; background: rgba(22,24,38,.62); border: 2px solid rgba(244,234,216,.4); border-radius: 12px; min-width: 76px; height: 60px; padding: 0 10px; }
  #touch button.on { background: #f2a23a; color: #1a1c2c; }
  #touch .fire { right: 60px; bottom: 190px; width: 120px; height: 120px; border-radius: 50%; border-color: #f2a23a; font-size: 18px; }
`;
document.head.appendChild(style);

const root = document.createElement('div');
root.id = 'touch';
root.innerHTML = '<div class="pad"><div class="nub"></div></div>';
document.body.appendChild(root);

/** A button: `hold` ones act while pressed, `toggle` ones latch, the rest fire once per tap. */
function button(label, css, down, up, mode = 'tap') {
  const b = document.createElement('button');
  b.textContent = label; b.style.cssText = css;
  let on = false;
  b.addEventListener('touchstart', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (mode === 'toggle') { on = !on; b.classList.toggle('on', on); (on ? down : up)(); } else { b.classList.add('on'); down(); }
  }, { passive: false });
  b.addEventListener('touchend', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (mode !== 'toggle') { b.classList.remove('on'); if (up) up(); }
  }, { passive: false });
  root.appendChild(b);
}
const hold = (code) => [() => key('keydown', code), () => key('keyup', code)];

button('FIRE', '', () => mouse('mousedown', 0), () => mouse('mouseup', 0));
root.lastChild.className = 'fire';
button('SCOPE', 'right:200px;bottom:150px', () => mouse('mousedown', 2), () => mouse('mouseup', 2));
button('RELOAD', 'right:200px;bottom:225px', ...hold('KeyR'));
button('JUMP', 'right:60px;bottom:330px', () => tapKey('Space', ' '));
button('CROUCH', 'right:150px;bottom:330px', ...hold('ControlLeft'), 'toggle');
button('WALK', 'right:250px;bottom:330px', ...hold('ShiftLeft'), 'toggle');
button('USE', 'right:300px;bottom:150px', ...hold('KeyE'));
button('BUY', 'right:60px;top:76px', () => tapKey('KeyB', 'b'));
button('SCORE', 'right:150px;top:76px', ...hold('Tab'));
button('PAUSE', 'right:250px;top:76px', () => setPlaying(false));
button('CAM', 'right:350px;top:76px', () => tapKey('KeyV', 'v'));
// Radio orders: the crew to site A, to site B, or on me.
button('GO A', 'right:250px;top:138px', () => tapKey('KeyZ', 'z'));
button('GO B', 'right:150px;top:138px', () => tapKey('KeyX', 'x'));
button('ON ME', 'right:60px;top:138px', () => tapKey('KeyG', 'g'));
['1', '2', '3', '4'].forEach((n, i) => button(n, `left:${350 + i * 86}px;bottom:20px`, () => tapKey(`Digit${n}`, n)));

// The buy counter's rows answer a tap with the key printed on them.
document.addEventListener('click', (e) => {
  const row = e.target.closest ? e.target.closest('#shopRows .row') : null;
  if (row) { const k = row.querySelector('kbd').textContent.toLowerCase(); tapKey(`Key${k.toUpperCase()}`, k); }
});

// The stick: where the thumb sits relative to the pad's centre decides which of W, A, S, D are down.
const pad = root.querySelector('.pad'), nub = root.querySelector('.nub');
const KEYS = ['KeyW', 'KeyS', 'KeyA', 'KeyD'], down = [false, false, false, false];
let stickId = null, lookId = null, lookX = 0, lookY = 0;
function stick(x, y) {
  const r = pad.getBoundingClientRect(), dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
  const len = Math.hypot(dx, dy) || 1, k = Math.min(1, len / 60), dead = len < 16;
  nub.style.transform = `translate(${dx / len * k * 60}px, ${dy / len * k * 60}px)`;
  const want = [!dead && dy / len < -0.38, !dead && dy / len > 0.38, !dead && dx / len < -0.38, !dead && dx / len > 0.38];
  want.forEach((w, i) => { if (w !== down[i]) { down[i] = w; key(w ? 'keydown' : 'keyup', KEYS[i]); } });
}
function release() {
  nub.style.transform = '';
  down.forEach((d, i) => { if (d) { down[i] = false; key('keyup', KEYS[i]); } });
}

root.addEventListener('touchstart', (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (stickId === null && t.clientX < window.innerWidth * 0.4 && t.clientY > window.innerHeight * 0.35) { stickId = t.identifier; stick(t.clientX, t.clientY); }
    else if (lookId === null) { lookId = t.identifier; lookX = t.clientX; lookY = t.clientY; }
  }
}, { passive: false });
root.addEventListener('touchmove', (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === stickId) stick(t.clientX, t.clientY);
    else if (t.identifier === lookId) { mouse('mousemove', 0, (t.clientX - lookX) * 2.2, (t.clientY - lookY) * 2.2); lookX = t.clientX; lookY = t.clientY; }
  }
}, { passive: false });
const end = (e) => {
  for (const t of e.changedTouches) {
    if (t.identifier === stickId) { stickId = null; release(); } else if (t.identifier === lookId) lookId = null;
  }
};
root.addEventListener('touchend', end);
root.addEventListener('touchcancel', end);

// The controls only make sense while playing; the menu underneath must stay tappable when paused.
document.addEventListener('pointerlockchange', () => { root.style.display = playing ? 'block' : 'none'; if (!playing) release(); });
root.style.display = 'none';
