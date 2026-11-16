// Every sound is synthesised with Web Audio by layering two bricks: gliding tones, and noise through a filter.
// Distance dulls a sound, bearing pans it, a house in the way muffles it, and a reverb rings it off the walls.
import { WEAPONS } from './config.js';
import { drain } from './sim/state.js';
import { zoneAt } from './sim/map.js';
import { rayWorld } from './sim/collision.js';

// Per weapon kind: [loudness, body s, body Hz]
const GUNS = { pistol: [0.3, 0.1, 2600], smg: [0.24, 0.07, 3300], rifle: [0.4, 0.14, 1900], shotgun: [0.5, 0.26, 1100], sniper: [0.6, 0.4, 900] };
const rnd = (a, b) => a + Math.random() * (b - a);

/** The synth on an audio context; returns frame(state, cursor) -> cursor. */
function createSynth(ctx) {
  const sr = ctx.sampleRate, hiss = ctx.createBuffer(1, sr * 2, sr), ir = ctx.createBuffer(2, sr * 1.7, sr);
  const out = ctx.createDynamicsCompressor(), verb = ctx.createConvolver(), bed = ctx.createGain(), wash = ctx.createBufferSource(), tone = ctx.createBiquadFilter();
  const voice = window.speechSynthesis; // absent in some browsers: then the radio is only a click
  let live = 0, next = 2, st, me, who, now, spot, near, pan, cut, wet;

  hiss.getChannelData(0).forEach((_, i, d) => { d[i] = rnd(-1, 1); });
  for (let c = 0; c < 2; c++) ir.getChannelData(c).forEach((_, i, d) => { d[i] = 0.7 * (d[i - 1] || 0) + 0.3 * rnd(-1, 1) * (1 - i / d.length) ** 5; }); // the reverb: dull noise dying away
  // One compressor on the master: gunfire pushes the town down and nothing clips.
  verb.buffer = ir; out.threshold.value = -32; verb.connect(out).connect(ctx.destination);
  // The town is one looped band of noise: its level is the sea's swell, its colour the wind.
  wash.buffer = hiss; wash.loop = true; bed.gain.value = 0; wash.connect(tone).connect(bed).connect(out); wash.start();

  const flat = () => { spot = null; near = 1; pan = 0; cut = 2e4; wet = 0.05; }; // in the head, not in the street
  const open = () => {
    const f = ctx.createBiquadFilter(), p = ctx.createStereoPanner(), w = ctx.createGain();
    f.frequency.value = cut; p.pan.value = pan; w.gain.value = wet;
    f.connect(p).connect(w).connect(verb); p.connect(out);
    return { f, p, w, n: 0 };
  };
  /** One layer: a wave, or noise through a '...pass' filter; hz glides to `to`; attack a, decay dur, delay dl. */
  const L = (kind, g, dur, hz, to = hz, dl = 0, a = 0.002) => {
    if (live > near * 100) return; // a busy mix admits only near sounds
    const noisy = kind.endsWith('pass'), src = ctx[noisy ? 'createBufferSource' : 'createOscillator'](), f = noisy ? ctx.createBiquadFilter() : src;
    const v = ctx.createGain(), s = spot || (spot = open()), t = now + dl + rnd(0, 0.008); // scattered: volleys never stack
    if (noisy) { src.buffer = hiss; src.loop = true; src.connect(f); }
    f.type = kind; f.frequency.value = hz; f.frequency.setTargetAtTime(to, t, dur / 3);
    v.gain.value = 0; v.gain.setTargetAtTime(g * near, t, a / 3); v.gain.setTargetAtTime(0, t + a, dur / 6);
    f.connect(v).connect(s.f); s.n++; live++;
    src.onended = () => { v.disconnect(); live--; if (!--s.n) { s.p.disconnect(); s.w.disconnect(); } };
    src.start(t, Math.random()); src.stop(t + dur);
  };
  const note = (hz, dl = 0, g = 0.15, dur = 0.3) => L('triangle', g, dur, hz, hz, dl);
  const air = (g, dur, hz, to) => L('bandpass', g, dur, hz, to, 0, dur / 3);
  const knock = (g, hz, dl = 0) => { // a falling tone and a puff of noise: low thuds, high clicks
    const dur = 0.03 + 12 / hz;
    L(hz > 500 ? 'square' : 'sine', g, dur, hz, hz / 2, dl); L('bandpass', g, dur, hz * 4, hz * 4, dl);
  };
  const bell = (hz, g, dl = 0) => [0.5, 1, 1.2, 1.5, 2, 2.7].forEach((r, i) => L('sine', g / ++i, 5 / i + 0.6, hz * r, hz * r, dl));
  /** A crack, a closing body of noise, a thump and a rolling tail: guns, grenades, the keg. */
  const blast = (g, dur, hz) => {
    const j = rnd(0.9, 1.1);
    L('highpass', g, 0.015, 6000); L('lowpass', g * j, dur, hz * j, hz * 0.3);
    L('triangle', g * 1.2, dur, hz * j / 8, hz / 30); L('lowpass', g * 0.3, dur * 3 + 0.3, hz * 0.6, 150);
  };

  const on = {
    shot: (e) => blast(...GUNS[WEAPONS[e.s].kind]),
    swing: () => air(0.16, 0.2, 900, 4200),
    empty: () => knock(0.05, 1900),
    reload: () => [0.1, 0.5, 0.8, 0.9].forEach((k, i) => knock(0.07, 700 + i * 250, k * (who.reload || 2))), // mag out, mag in, bolt
    swap: () => knock(0.05, 900),
    step: (e) => zoneAt(e.x, e.z) === 'Boathouse' ? knock(0.08, rnd(120, 170)) : L('bandpass', 0.2, 0.06, rnd(1500, 2400)),
    jump: () => air(0.12, 0.1, 500, 1400),
    land: () => knock(0.2, 110),
    impact: (e) => knock(0.06, e.n ? rnd(300, 420) : rnd(1500, 2500)),
    hurt(e) {
      if (who === me) { knock(0.3, 120); note(3100, 0, 0.04, 0.9); }
      else if (e.b === me.id) { flat(); note(1150, 0, 0.15, 0.05); if (e.s === 'head') note(3450, 0, 0.15, 0.2); }
    },
    kill() { if (who === me) { flat(); note(660); note(990, 0.1); } },
    throw: () => air(0.1, 0.2, 700, 2500),
    clink: () => note(rnd(2100, 2600), 0, 0.1, 0.07),
    boom(e) { if (e.n) { blast(0.6, 0.15, 6000); flat(); note(3500, 0, me.blind / 20, 4); } else blast(0.9, 0.8, 900); },
    smoke: () => air(0.12, 1.8, 4000, 7000),
    beep: (e) => L('square', 0.3, 0.06, e.n < 10 ? 1650 : 1250),
    planting: () => air(0.07, 1.6, 6000, 9000),
    planted() { flat(); L('sawtooth', 0.2, 0.5, 440, 660); },
    dousing: () => air(0.16, 1.5, 1500, 900),
    doused() { L('bandpass', 0.5, 0.5, 3000, 500); air(0.25, 1.6, 6000, 9000); },
    kegBoom: () => blast(1.4, 2.4, 700),
    radio(e) { // a click, then the browser's own voice reads the call out, pitched per speaker
      if (who.team !== me.team) return;
      flat(); L('bandpass', 0.16, 0.09, 2600); note(1500, 0.1, 0.1, 0.05);
      if (voice && !voice.speaking) voice.speak(Object.assign(new SpeechSynthesisUtterance(e.s), { rate: 1.15, pitch: 0.6 + who.id % 5 / 5, volume: 0.8 }));
    },
    buy() { if (who === me) { note(2100); note(3300, 0.07); } },
    round(e) {
      flat();
      if (e.s === 'live') bell(196, 0.24);
      else if (e.s !== 'freeze') for (let i = 0; i < 3; i++) note(440 * (1 + i / 4) ** (e.n ? -1 : 1), i / 7);
    },
    gull() { for (let i = rnd(1, 5); i > 0; i--) L('triangle', 0.3, 0.3, rnd(1700, 2100), 1100, i / 3, 0.08); },
    chime: () => bell(330, 0.3),
  };

  function play(e) {
    who = st.actors[e.a];
    const p = e.x || e.z ? e : who || me, dx = p.x - me.x, dz = p.z - me.z, d = Math.hypot(dx, dz) + 0.01;
    const k = rayWorld(me.x, 1.6, me.z, dx / d, 0, dz / d, d) < d - 0.6 ? 0.5 : 1; // a house in the way halves it
    spot = null; near = k / (1 + d * d / 250); pan = (Math.cos(me.yaw) * dx - Math.sin(me.yaw) * dz) / (d + 1);
    cut = k * k * 16000 / (1 + d / 25); wet = 0.8 + d / 30;
    on[e.type]?.(e);
  }

  return (state, cursor) => {
    st = state; me = st.actors[st.viewId]; now = ctx.currentTime;
    if (now > next) { // now and then: the sea swells, the wind shifts, a gull or a far bell
      next = now + rnd(3, 8); bed.gain.setTargetAtTime(rnd(0.02, 0.1), now, 1.5); tone.frequency.setTargetAtTime(rnd(400, 1400), now, 2.5);
      if (Math.random() < 0.4) play({ type: Math.random() < 0.1 ? 'chime' : 'gull', a: -1, x: rnd(50, 90), z: rnd(-50, 50) });
    }
    return drain(st, cursor, play, 0.2);
  };
}

/** The game's sound: start() on the first click, then update(st) every frame. */
export function createAudio(state) {
  let ctx, frame, cursor = state.events.seq;
  document.addEventListener('visibilitychange', () => ctx && ctx[document.hidden ? 'suspend' : 'resume']()); // a hidden tab goes quiet
  return {
    start() { if (ctx) ctx.resume(); else frame = createSynth(ctx = new AudioContext()); },
    update(st) { cursor = ctx && ctx.state === 'running' ? frame(st, cursor) : st.events.seq; },
  };
}
