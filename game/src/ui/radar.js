// The radar: the map from above, your crew, any enemy a team-mate can see right now, gunfire, smoke and the keg.
import { NADES, TEAMS } from '../config.js';
import { COLS, ROWS, CELL, tile, walk } from '../sim/map.js';
import { canSee } from '../sim/perception.js';

const S = 5.5; // pixels per cell

export function createRadar(canvas) {
  const g = canvas.getContext('2d'), base = document.createElement('canvas');
  base.width = canvas.width; base.height = canvas.height;
  const b = base.getContext('2d');
  // The static layer, painted once: lanes light, houses dark, the sea, and the two sites in saffron.
  b.fillStyle = '#1b1d30'; b.fillRect(0, 0, base.width, base.height);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const t = tile(c, r);
    b.fillStyle = t === '~' ? '#2c4f66' : t === 'A' || t === 'B' ? '#a8752f' : walk[r * COLS + c] ? '#5c5a70' : t === '#' ? '#1b1d30' : '#3a394c';
    b.fillRect(c * S, r * S, S + 0.5, S + 0.5);
  }
  b.fillStyle = '#f4ead8'; b.font = '800 13px sans-serif'; b.textAlign = 'center';
  b.fillText('A', 8.5 * S, 5.9 * S); b.fillText('B', 30.5 * S, 5.9 * S);
  const px = (x) => (x / CELL + COLS / 2) * S, pz = (z) => (z / CELL + ROWS / 2) * S;
  const spotted = new Uint8Array(10);
  let frame = 0;

  return {
    draw(state) {
      const me = state.actors[state.viewId];
      if (frame++ % 6 === 0) { // who is in sight of the crew, checked a few times a second
        spotted.fill(0);
        for (const e of state.actors) {
          if (!e.alive || e.team === me.team) continue;
          for (const a of state.actors) if (a.alive && a.team === me.team && canSee(state, a, e)) { spotted[e.id] = 1; break; }
        }
      }
      g.drawImage(base, 0, 0);
      for (const n of state.nades) {
        if (!n.live || n.cloud <= 0) continue;
        g.fillStyle = 'rgba(210,215,225,0.55)';
        g.beginPath(); g.arc(px(n.x), pz(n.z), NADES[2].radius / CELL * S, 0, 7); g.fill();
      }
      for (const s of state.sounds) { // enemy gunfire rings for a second
        const age = state.time - s.t;
        if (s.kind !== 'shot' || s.team === me.team || age > 1) continue;
        g.strokeStyle = `rgba(255,93,74,${1 - age})`; g.lineWidth = 1.5;
        g.beginPath(); g.arc(px(s.x), pz(s.z), 3 + age * 9, 0, 7); g.stroke();
      }
      const k = state.keg;
      if (k.state !== 'carried' || state.actors[k.carrier].team === me.team) {
        g.fillStyle = k.state === 'planted' && (state.time * 3 | 0) % 2 ? '#ff5d4a' : '#ffb340';
        g.fillRect(px(k.x) - 3, pz(k.z) - 3, 6, 6);
      }
      for (const a of state.actors) {
        if (!a.alive || (a.team !== me.team && !spotted[a.id])) continue;
        const x = px(a.x), z = pz(a.z);
        g.fillStyle = a.team === me.team ? TEAMS[a.team].color : '#ff5d4a';
        if (a === me) { // you: an arrow along your view
          g.save(); g.translate(x, z); g.rotate(-a.yaw);
          g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, -6); g.lineTo(4, 5); g.lineTo(0, 2.5); g.lineTo(-4, 5); g.fill();
          g.restore();
        } else { g.beginPath(); g.arc(x, z, 3, 0, 7); g.fill(); }
      }
    },
  };
}
