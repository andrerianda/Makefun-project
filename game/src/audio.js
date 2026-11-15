// Every sound is synthesised with Web Audio when it is needed: noise bursts for guns and blasts, tones for
// the fuse, the bell and the radio. Distance and bearing to the listener set the volume and the pan.
import { WEAPONS } from './config.js';
import { drain } from './sim/state.js';

// Per weapon kind: [noise length s, filter Hz, thump Hz, loudness]
const GUNS = { pistol: [0.09, 2600, 150, 0.5], smg: [0.07, 3200, 170, 0.42], rifle: [0.13, 1900, 95, 0.7], shotgun: [0.24, 1200, 70, 0.9], sniper: [0.34, 1000, 55, 1] };

export function createAudio(state) {
  let ctx = null, master = null, hiss = null, cursor = state.events.seq;

  const start = () => {
    if (ctx) { ctx.resume(); return; }
    ctx = new AudioContext();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    hiss = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = hiss.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  };
  /** A gain node with a decay envelope, panned and routed to the master. */
  const voice = (gain, dur, pan) => {
    const g = ctx.createGain(), p = ctx.createStereoPanner(), t = ctx.currentTime;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    p.pan.value = pan; g.connect(p); p.connect(master);
    return g;
  };
  const noise = (gain, dur, hz, pan, type = 'lowpass') => {
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter();
    src.buffer = hiss; src.loop = true; f.type = type; f.frequency.value = hz;
    src.connect(f); f.connect(voice(gain, dur, pan));
    src.start(ctx.currentTime, Math.random()); src.stop(ctx.currentTime + dur);
  };
  const tone = (gain, dur, hz, pan, wave = 'sine', slide = hz) => {
    const o = ctx.createOscillator(), t = ctx.currentTime;
    o.type = wave; o.frequency.setValueAtTime(hz, t); o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    o.connect(voice(gain, dur, pan));
    o.start(t); o.stop(t + dur);
  };
  /** The campanile: a struck bell, three partials with a long tail. It rings the round in. */
  const bell = (gain) => { tone(gain, 2.6, 220, 0); tone(gain * 0.6, 1.9, 554, 0); tone(gain * 0.35, 1.2, 880, 0); };

  function play(e, st) {
    const me = st.actors[st.viewId], mine = e.a === st.viewId;
    const dx = e.x - me.x, dz = e.z - me.z, d = Math.hypot(dx, dz);
    const near = mine ? 1 : 1 / (1 + d * d / 220), pan = mine || d < 0.5 ? 0 : (Math.cos(me.yaw) * dx - Math.sin(me.yaw) * dz) / d * 0.8;
    switch (e.type) {
      case 'shot': { const k = GUNS[WEAPONS[e.s].kind]; noise(k[3] * near, k[0], k[1], pan); tone(k[3] * near, k[0] * 0.8, k[2] * 2, pan, 'triangle', k[2] * 0.5); break; }
      case 'swing': noise(0.2 * near, 0.08, 5000, pan, 'highpass'); break;
      case 'empty': tone(0.2 * near, 0.03, 1900, pan, 'square'); break;
      case 'reload': case 'swap': tone(0.16 * near, 0.04, 900, pan, 'square'); tone(0.12 * near, 0.05, 520, pan, 'square'); break;
      case 'step': noise(0.22 * near, 0.07, mine ? 420 : 600, pan); break;
      case 'land': case 'jump': noise(0.3 * near, 0.1, 300, pan); break;
      case 'impact': noise(0.25 * near, 0.05, e.n ? 900 : 2400, pan, 'bandpass'); break;
      case 'hurt': if (mine) tone(0.45, 0.14, 130, 0, 'sawtooth', 60); else if (e.b === st.viewId) tone(0.25, 0.05, e.s === 'head' ? 1700 : 1100, 0, 'triangle'); break;
      case 'kill': if (mine) tone(0.3, 0.22, 660, 0, 'triangle', 990); break;
      case 'throw': noise(0.2 * near, 0.12, 1500, pan, 'bandpass'); break;
      case 'clink': tone(0.2 * near, 0.05, 2300, pan, 'triangle'); break;
      case 'boom': if (e.n) { noise(0.8 * near, 0.25, 6000, pan, 'highpass'); tone(0.35 * near, 1.6, 3400, pan); } else { noise(1.3 * near, 0.7, 500, pan); tone(1 * near, 0.5, 80, pan, 'sine', 30); } break;
      case 'smoke': noise(0.4 * near, 1.4, 4200, pan, 'highpass'); break;
      case 'beep': tone(0.5 * near + 0.05, 0.07, 1250, pan, 'square'); break;
      case 'planted': tone(0.4, 0.5, 440, 0, 'sawtooth', 660); break;
      case 'doused': noise(0.5, 0.6, 3000, 0, 'highpass'); tone(0.3, 0.4, 520, 0, 'triangle', 780); break;
      case 'kegBoom': noise(1.6, 1.8, 320, 0); tone(1.2, 1.2, 60, 0, 'sine', 24); break;
      case 'radio': if (st.actors[e.a].team === me.team) tone(0.1, 0.05, 1500, 0, 'square'); break;
      case 'buy': if (mine) { tone(0.2, 0.07, 1300, 0, 'triangle'); tone(0.16, 0.12, 1750, 0, 'triangle'); } break;
      case 'round': if (e.s === 'live') bell(0.35); else if (e.s !== 'freeze') tone(0.3, 0.7, st.actors[0].team === e.n ? 523 : 330, 0, 'triangle', st.actors[0].team === e.n ? 784 : 220); break;
    }
  }

  return {
    start,
    update(st) { cursor = drain(st, cursor, (e) => { if (ctx && ctx.state === 'running') play(e, st); }, 0.2); },
  };
}
