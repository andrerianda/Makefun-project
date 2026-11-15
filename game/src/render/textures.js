// Every surface in Porto Vesper is painted here, on canvases, when the game loads: no image files.
// Wall and ground textures are near-white so a building's own colour and the baked light can tint them.
import * as THREE from 'three';
import { PALETTE } from '../config.js';
import { makeRng } from '../sim/rng.js';

function paint(w, h, draw, repeat = true) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d'), w, h, makeRng(w * 31 + h));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
const grey = (v, a = 1) => `rgba(${v},${v},${v},${a})`;

/** Fine grain over a whole canvas: `n` translucent specks between two brightnesses. */
function speckle(g, w, h, rng, n, lo, hi, size = 2) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = grey(lo + rng.int(hi - lo), 0.25);
    g.fillRect(rng.int(w), rng.int(h), 1 + rng.int(size), 1 + rng.int(size));
  }
}

/** A grid of stones or boards, each its own tone, with dark seams; `stagger` offsets alternate rows like masonry. */
function blocks(g, w, h, rng, cols, rows, lo, hi, seam, stagger, round = 0) {
  g.fillStyle = grey(seam); g.fillRect(0, 0, w, h);
  const bw = w / cols, bh = h / rows;
  for (let r = 0; r < rows; r++) for (let c = -1; c < cols; c++) {
    const v = lo + rng.int(hi - lo), x = (c + (stagger && r % 2 ? 0.5 : 0)) * bw + 1.5, y = r * bh + 1.5;
    g.fillStyle = `rgb(${v + rng.int(10)},${v},${v - rng.int(8)})`;
    g.beginPath(); g.roundRect(x, y, bw - 3, bh - 3, round); g.fill();
  }
}

export function makeTextures() {
  const P = PALETTE;
  return {
    plaster: paint(256, 256, (g, w, h, rng) => {
      g.fillStyle = '#f3efe8'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, rng, 2600, 200, 255, 3);
      for (let i = 0; i < 14; i++) { // trowel streaks and old damp
        g.fillStyle = grey(150, 0.05 + rng.next() * 0.06);
        g.fillRect(rng.int(w), rng.int(h), 30 + rng.int(120), 2 + rng.int(5));
      }
    }),
    roof: paint(256, 256, (g, w, h, rng) => {
      g.fillStyle = '#5c2416'; g.fillRect(0, 0, w, h);
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { // rows of half-round tiles
        const x = c * 32 + (r % 2) * 16, y = r * 32, v = rng.int(30);
        const grad = g.createLinearGradient(x, 0, x + 32, 0);
        grad.addColorStop(0, `rgb(${120 + v},${52 + v / 2},36)`); grad.addColorStop(0.5, `rgb(${205 + v},${104 + v},70)`); grad.addColorStop(1, `rgb(${110 + v},${46},32)`);
        g.fillStyle = grad; g.fillRect(x + 1, y + 1, 30, 30); g.fillRect(x + 1 - 256, y + 1, 30, 30);
      }
    }),
    cobble: paint(256, 256, (g, w, h, rng) => { blocks(g, w, h, rng, 8, 8, 150, 215, 70, true, 9); speckle(g, w, h, rng, 900, 90, 200); }),
    flag: paint(256, 256, (g, w, h, rng) => { blocks(g, w, h, rng, 3, 4, 185, 235, 95, true, 2); speckle(g, w, h, rng, 1200, 150, 240); }),
    plank: paint(256, 256, (g, w, h, rng) => {
      blocks(g, w, h, rng, 6, 1, 150, 215, 60, false);
      for (let i = 0; i < 90; i++) { g.fillStyle = grey(60, 0.12); g.fillRect(rng.int(w), rng.int(h), 1, 20 + rng.int(60)); }
    }),
    site: paint(256, 256, (g, w, h, rng) => { // the plant zone: flags with a painted saffron hatch
      blocks(g, w, h, rng, 3, 4, 185, 235, 95, true, 2);
      g.strokeStyle = 'rgba(242,162,58,0.85)'; g.lineWidth = 12;
      for (let i = -256; i < 512; i += 64) { g.beginPath(); g.moveTo(i, 256); g.lineTo(i + 256, 0); g.stroke(); }
    }),
    stone: paint(256, 256, (g, w, h, rng) => { blocks(g, w, h, rng, 3, 5, 170, 225, 80, true, 3); speckle(g, w, h, rng, 1500, 120, 230); }),
    crate: paint(256, 256, (g, w, h, rng) => {
      blocks(g, w, h, rng, 1, 6, 175, 225, 70, false);
      g.strokeStyle = grey(95); g.lineWidth = 22; g.strokeRect(11, 11, w - 22, h - 22);
      g.lineWidth = 16; g.beginPath(); g.moveTo(20, 236); g.lineTo(236, 20); g.stroke();
      g.fillStyle = 'rgba(40,30,20,0.75)'; g.font = 'bold 34px ui-monospace, monospace'; g.fillText('PV-07', 70, 150);
    }),
    wood: paint(128, 128, (g, w, h, rng) => {
      g.fillStyle = '#d9d2c8'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) { g.fillStyle = grey(90, 0.14); g.fillRect(0, rng.int(h), w, 1 + rng.int(2)); }
    }),
    awning: paint(128, 64, (g, w, h) => {
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f4ead8' : P.roof; g.fillRect(i * 16, 0, 16, h); }
    }),
    // Six shuttered windows (three lit from inside) and two doors in one 4 x 2 atlas.
    trim: paint(512, 256, (g, w, h, rng) => {
      for (let i = 0; i < 8; i++) {
        const x = (i % 4) * 128, y = (i >> 2) * 128, shutter = P.shutter[i % 4];
        g.fillStyle = '#efe6d6'; g.fillRect(x, y, 128, 128);
        if (i < 6) {
          g.fillStyle = i % 2 ? '#ffd27a' : '#232a3a'; g.fillRect(x + 40, y + 14, 48, 92);
          if (i % 2) { g.fillStyle = 'rgba(255,240,200,0.7)'; g.fillRect(x + 46, y + 20, 14, 80); }
          g.fillStyle = shutter;
          g.fillRect(x + 8, y + 12, 30, 96); g.fillRect(x + 90, y + 12, 30, 96);
          g.fillStyle = 'rgba(0,0,0,0.28)';
          for (let s = 0; s < 11; s++) { g.fillRect(x + 10, y + 16 + s * 8.5, 26, 2); g.fillRect(x + 92, y + 16 + s * 8.5, 26, 2); }
          g.fillStyle = '#b9ac98'; g.fillRect(x + 4, y + 108, 120, 10);
        } else {
          g.fillStyle = shutter; g.beginPath(); g.roundRect(x + 26, y + 6, 76, 122, [38, 38, 0, 0]); g.fill();
          g.fillStyle = 'rgba(0,0,0,0.3)';
          for (let s = 0; s < 5; s++) g.fillRect(x + 32 + s * 14, y + 30, 3, 98);
          g.fillStyle = '#d6b25a'; g.beginPath(); g.arc(x + 90, y + 76, 4, 0, 7); g.fill();
        }
      }
      speckle(g, w, h, rng, 600, 120, 220);
    }, false),
    // Soft discs for sprites: smoke and dust (alpha), and a glow for flashes and lamps.
    puff: paint(64, 64, (g) => {
      const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)'); grad.addColorStop(0.6, 'rgba(255,255,255,0.4)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    }, false),
    star: paint(64, 64, (g) => { // a muzzle flash: a hot core with four spikes
      g.translate(32, 32);
      const grad = g.createRadialGradient(0, 0, 1, 0, 0, 30);
      grad.addColorStop(0, 'rgba(255,250,220,1)'); grad.addColorStop(0.3, 'rgba(255,190,90,0.8)'); grad.addColorStop(1, 'rgba(255,120,30,0)');
      g.fillStyle = grad;
      for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 4); g.beginPath(); g.ellipse(0, 0, 30, 7, 0, 0, 7); g.fill(); }
    }, false),
  };
}

/** Painted lettering for a wall or a name tag: text on a transparent canvas. */
export function label(text, color, size = 96, weight = '800') {
  const font = `${weight} ${size}px 'Trebuchet MS', 'Segoe UI', sans-serif`;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font;
  const w = Math.ceil(probe.measureText(text).width) + 16;
  const tex = paint(w, size + 24, (g) => {
    g.font = font; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(text, 8, (size + 24) / 2 + 2);
  }, false);
  tex.userData.aspect = w / (size + 24);
  return tex;
}
