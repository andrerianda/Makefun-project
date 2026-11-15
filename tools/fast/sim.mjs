#!/usr/bin/env node
// Fast offline simulator for the variant search.
//
// engine.py decides by node counts alone, so the game it plays in a scenario is a pure function of
// the scenario and the variant.  This file is a transcription of engine.py's search and driver into
// JavaScript, decision for decision (same move order, same pruning, same tables, same node counts),
// run in one Node process together with the kit's own house engines, which are taken from the kit's
// program/env/server.mjs as they are.  A game that takes the Python engine half a minute is played
// here in a second or two, and a game can be cut the moment it can no longer beat a given ply cap.
//
// Nothing here goes into the entry: a result found with it is only a candidate, and every table
// entry is replayed with the real main.py against the real environment before it is used.
//
// Worker protocol: one JSON object per input line
//   {"id": 1, "opponent": "depth-2", "colour": "white", "opening": "italian-game", "variant": 3, "cap": 0}
// and one JSON line back with outcome, reason, plies, moves; "cap" > 0 ends the game as "capped" as
// soon as a win in fewer than cap plies is impossible.
//
// usage: node sim.mjs            (reads jobs on stdin)
//   KIT=<kit dir> NOISE=<noise.json> override the defaults.
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline';

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = process.env.KIT || '/root/makefun-work/tiny-chess-01-kit';
const NOISE = JSON.parse(readFileSync(process.env.NOISE || join(HERE, 'noise.json'), 'utf8'));
const GEN = process.env.SIM_GEN_DIR || '/root/makefun-work/var/fast';

// ---- the house side: the kit's own code, up to (not including) its HTTP match server ----------
const serverSrc = readFileSync(join(KIT, 'program/env/server.mjs'), 'utf8');
const cut = serverSrc.indexOf('\n// src/server/match.ts');
if (cut < 0) throw new Error('server.mjs: the match.ts marker is missing');
const houseText = serverSrc.slice(0, cut) + '\nexport { Game, gameEnding, fastAlphabetaMove, moveUci, opponentById, BOOK, OPPONENTS };\n';
const houseFile = join(GEN, 'house-' + createHash('sha256').update(houseText).digest('hex').slice(0, 16) + '.mjs');
if (!existsSync(houseFile)) {
  mkdirSync(GEN, { recursive: true });
  const tmp = houseFile + '.' + process.pid;
  writeFileSync(tmp, houseText);
  renameSync(tmp, houseFile);
}
const House = await import(pathToFileURL(houseFile).href);

// ---- our engine, transcribed from engine.py ---------------------------------------------------
const I = 30000, BIG = 1 << 30, KB = 1 << 24;
function Y(D, n) {
  const out = [];
  for (let i = 0; i < 64; i++) {
    const rays = [];
    for (const [x, z] of D) {
      const y = [];
      for (let k = 1; k < n; k++) {
        const a = (i >> 3) + k * x, c = (i & 7) + k * z;
        if (0 <= a && a < 8 && 8 > c && c >= 0) y.push(a * 8 + c);
      }
      if (y.length) rays.push(y);
    }
    out.push(rays);
  }
  return out;
}
const O4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const X4 = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const KN = [];
for (const x of [-2, -1, 1, 2]) for (const z of [-2, -1, 1, 2]) if (x * x !== z * z) KN.push([x, z]);
const R = [0, 0, Y(KN, 2), Y(X4, 8), Y(O4, 8), Y(O4.concat(X4), 8), Y(O4.concat(X4), 2)];
R.push(R[4]);
const PC = [];
for (let i = 0; i < 64; i++) PC.push([i + 7, i + 9].filter((t) => t < 64 && Math.abs(t % 8 - i % 8) === 1));
const AL = [];
for (let k = 0; k < 64; k++) {
  const m = new Uint8Array(64);
  for (const y of R[5][k]) for (const t of y) m[t] = 1;
  AL.push(m);
}
const T = new Uint8Array(256);
[0, 9, 10, 11, 12, 13, 14, 15, 0, 1, 2, 3, 4, 5, 6, 7, 32].forEach((v, i) => { T[i] = v; });
const V = [1, 1, 3, 3, 5, 9, 10, 5];
const MATV = [0, 1, 3, 3, 5, 9, 0, 5];
const PHV = [0, 0, 1, 1, 2, 4, 0, 2];
const B0 = Uint8Array.from([7, 2, 3, 5, 6, 3, 2, 7, 1, 1, 1, 1, 1, 1, 1, 1].concat(new Array(32).fill(0), [9, 9, 9, 9, 9, 9, 9, 9, 15, 10, 11, 13, 14, 11, 10, 15]));
const ABORT = new Error('search stopped');   // stands for every exception engine.py's bare except swallows

let N = 0, LIM = 0, HH = null, K = null, WW = null, NM = false, HS = new Set(), J = 0, XS = 1, NZ = null, LN = 0;
const TT = new Map();

const keyOf = (b) => String.fromCharCode.apply(null, b);

function A(b, k) {
  for (const y of R[4][k]) {
    for (let j = 0; j < y.length; j++) {
      const t = y[j], q = b[t];
      if (q & 15) {
        if (q === 12 || q === 13 || q === 15 || (q === 14 && j === 0)) return 1;
        break;
      }
    }
  }
  for (const y of R[3][k]) {
    for (let j = 0; j < y.length; j++) {
      const t = y[j], q = b[t];
      if (q & 15) {
        if (q === 11 || q === 13 || (j === 0 && (q === 14 || (q === 9 && t > k)))) return 1;
        break;
      }
    }
  }
  for (const y of R[2][k]) if (b[y[0]] === 10) return 1;
  return 0;
}

// A move is kept as score * 4096 + from * 64 + to: numeric order is engine.py's order of (score, from, to).
function G(b, H) {
  const L = [];
  for (let f = 0; f < 64; f++) {
    const p = b[f];
    if (p < 1 || p > 7) continue;
    if (p < 2) {
      for (const t of PC[f]) {
        const q = b[t];
        if (q > 8) L.push((BIG + 100 * V[q & 7] - 1) * 4096 + f * 64 + t);
      }
      const t = f + 8;
      if (!(b[t] & 15)) {
        if (t > 55) L.push((BIG + 800) * 4096 + f * 64 + t);
        else {
          L.push(H[f][t] * 4096 + f * 64 + t);
          if (f < 16 && !(b[t + 8] & 15)) L.push(H[f][t + 8] * 4096 + f * 64 + t + 8);
        }
      }
    } else {
      const h = H[f];
      for (const y of R[p][f]) {
        for (const t of y) {
          const q = b[t];
          if (q & 15) {
            if (q & 8) L.push((BIG + 100 * V[q & 7] - V[p]) * 4096 + f * 64 + t);
            break;
          }
          L.push(h[t] * 4096 + f * 64 + t);
        }
      }
      if (p === 6) {
        for (const [r, d] of [[0, -1], [7, 1]]) {
          if (b[r] === 7 && !(b[f + d] & 15)) {
            let clear = true;
            for (let x = Math.min(f, r) + 1; x < Math.max(f, r); x++) if (b[x] & 15) { clear = false; break; }
            if (clear && !(A(b, f) || A(b, f + d))) L.push(f * 64 + f + 2 * d);
          }
        }
      }
    }
  }
  return L;
}

function C(b) {
  const L = [];
  for (let f = 0; f < 64; f++) {
    const p = b[f];
    if (p < 1 || p > 7) continue;
    if (p < 2) {
      for (const t of PC[f]) {
        const q = b[t];
        if (q > 8) {
          if (q === 14) return null;
          L.push((100 * V[q & 7] - 1) * 4096 + f * 64 + t);
        }
      }
      if (f > 47 && !(b[f + 8] & 15)) L.push(800 * 4096 + f * 64 + f + 8);
    } else {
      for (const y of R[p][f]) {
        for (const t of y) {
          const q = b[t];
          if (q & 15) {
            if (q & 8) {
              if (q === 14) return null;
              L.push((100 * V[q & 7] - V[p]) * 4096 + f * 64 + t);
            }
            break;
          }
        }
      }
    }
  }
  return L;
}

function M(b, f, t, o = 5) {
  const n = b.slice();
  let p = n[f];
  n[f] = 0;
  if (p < 2) {
    if (t > 55) p = o;
    if (b[t] === 32) n[t - 8] = 0;
    if (t - f === 16) n[f + 8] = 16;
  }
  if (p === 6) {
    if (Math.abs(t - f) === 2) { n[t > f ? 7 : 0] = 0; n[(f + t) >> 1] = 4; }
    for (let i = 0; i < 64; i++) if (n[i] === 7) n[i] = 4;
  }
  n[t] = p === 7 ? 4 : p;
  return n;
}

function F(n) {
  const out = new Uint8Array(64);
  for (let i = 0; i < 64; i++) out[i] = T[n[63 - i]];
  return out;
}

function D(b, f, t, w, o) {
  const p = b[f], q = b[t], x = w[p];
  let d = x[t] - x[f];
  if (q > 8) {
    if (q < 16) d += o[q - 8][63 - t];
    else if (p < 2) d += o[1][71 - t];
  }
  if (p < 2 && t > 55) d += w[5][t] - x[t];
  if (p === 6 && Math.abs(t - f) === 2) d += w[4][(f + t) >> 1] - w[4][t > f ? 7 : 0];
  return d;
}

const DESC = (x, y) => y - x;

function Q(b, s, a, B, w, o) {
  N += 1;
  if (s >= B) return s;
  if (s > a) a = s;
  const L = C(b);
  if (L === null) return I;
  L.sort(DESC);
  for (let n = 0; n < L.length; n++) {
    const ft = L[n] % 4096, f = ft >> 6, t = ft & 63;
    if (V[b[f]] > V[b[t] & 7] && A(b, t)) continue;
    const d = D(b, f, t, w, o);
    if (s + d + 150 <= a) continue;
    const v = -Q(F(M(b, f, t)), -s - d, -B, -a, o, w);
    if (v > a) {
      if (v >= B) return v;
      a = v;
    }
  }
  return a;
}

function S(b, s, d, a, B, P) {
  N += 1;
  if (N > LIM) throw ABORT;
  const key = keyOf(b);
  if (HS.has(key)) return 20 * (P % 2 * 2 - 1);
  if (P + J > 199) {
    let m = 0;
    for (let i = 0; i < 64; i++) {
      const q = b[i];
      if (q & 15) m += MATV[q & 7] * (1 - (q >> 3) * 2);
    }
    return (m > 4 ? 9000 : 0) - (m < -4 ? 9000 : 0);
  }
  const e = TT.get(key);
  let m0 = -1;
  if (e !== undefined) {
    m0 = e[3];
    if (e[0] >= d && (e[2] === 0 || (e[2] === 1 && e[1] >= B) || (e[2] === 2 && e[1] <= a))) return e[1];
  }
  const k = b.indexOf(6);
  if (k < 0) throw ABORT;                      // engine.py: b.index(6) raises, the bare except ends the search
  const c = A(b, k), w = WW[P & 1], o = WW[(P & 1) ^ 1];
  if (c) d += 1;
  if (d <= 0) return Q(b, s, a, B, w, o);
  let u = false, lm = 99;
  if (!c) {
    if (d < 3) {
      if (s - 150 * d >= B) return s;
      u = s + 150 * d <= a;
      lm = 5 + 6 * d;
    } else if (s >= B && NM) {
      const v = -S(F(b), -s, d - 3 - Math.floor(d / 4), -B, 1 - B, P + 1);
      if (v >= B) return v;
    }
    if (d > 3 && m0 < 0) d -= 1;
  }
  let best = -I, bm = -1, i = 0;
  const a0 = a, h = HH[P & 1], al = AL[k];
  HS.add(key);
  // engine.py's generator MV: the stored move first, then (generated only when asked for, so after the
  // stored move's subtree has changed the history table) the sorted rest without it.
  let list = null, idx = 0, first = m0 >= 0;
  for (;;) {
    let ft;
    if (first) { ft = m0; first = false; } else {
      if (list === null) { list = G(b, h); list.sort(DESC); }
      ft = -1;
      while (idx < list.length) {
        let c2 = list[idx++] % 4096;
        if (c2 < 0) c2 += 4096;
        if (c2 !== m0) { ft = c2; break; }
      }
      if (ft < 0) break;
    }
    const f = ft >> 6, t = ft & 63;
    const x = b[t] > 8 || (b[f] < 2 && t > 55);
    if (i && !x && (u || i > lm)) continue;
    const n = M(b, f, t);
    if ((c || f === k || al[f]) && A(n, f === k ? t : k)) continue;
    const nb = F(n), ns = -s - D(b, f, t, w, o);
    let v;
    if (i === 0) v = -S(nb, ns, d - 1, -B, -a, P + 1);
    else {
      const r = (d > 2 && !x && !c) ? (i > 3 ? 1 : 0) + (i > 9 ? 1 : 0) : 0;
      v = -S(nb, ns, d - 1 - r, -a - 1, -a, P + 1);
      if (r && v > a) v = -S(nb, ns, d - 1, -a - 1, -a, P + 1);
      if (a < v && v < B) v = -S(nb, ns, d - 1, -B, -a, P + 1);
    }
    i += 1;
    if (v > best) {
      best = v; bm = ft;
      if (v > a) {
        a = v;
        if (a >= B) {
          if (!x) {
            h[f][t] += d * d;
            const z = K[P];
            if (z !== bm) {
              if (z !== undefined) h[z >> 6][z & 63] -= KB;
              K[P] = bm;
              h[f][t] += KB;
            }
          }
          break;
        }
      }
    }
  }
  HS.delete(key);
  if (i === 0) return c ? P - 20000 : 0;
  TT.set(key, [d, best, best <= a0 ? 2 : best >= B ? 1 : 0, bm]);
  return best;
}

const PM1 = [0, 0, 2, 6, 14, 28, 50, 0], PM2 = [0, -14, 6, 18, 20, 10, 0, 0], PM3 = [0, 0, 2, 8, 8, 4, 0, 0];
const PM4 = [0, 0, 0, 6, 14, 26, 44, 0], PM5 = [0, 12, 5, 0, 0, 0, 0, 0];
const PG1 = [0, 2, 6, 14, 28, 50, 80, 0], PG2 = [0, 6, 12, 24, 44, 72, 110, 0];
const KM = [18, 26, 8, -6, -6, 8, 26, 18];

function mk(b, ph) {
  const W = [0, 0, 0, 0, 0, 0, 0, 0];
  const k = b.indexOf(6), e = b.indexOf(14);
  if (k < 0 || e < 0) throw ABORT;
  for (let p = 1; p < 7; p++) {
    const Wp = new Array(64);
    for (let i = 0; i < 64; i++) {
      const r = i >> 3, f = i & 7, z = Math.min(f, 7 - f), c = z + Math.min(r, 7 - r);
      const d = (7 - Math.max(Math.abs(r - (e >> 3)), Math.abs(f - (e & 7)))) * XS;
      let m, g;
      if (p === 1) {
        let u = 1;
        for (let j = 0; j < 64; j++) if ((j >> 3) > r && Math.abs((j & 7) - f) < 2 && b[j] === 9) { u = 0; break; }
        const sh = (k < 8 && Math.abs(f - k % 8) < 2 && k % 8 !== 3 && k % 8 !== 4) ? 1 : 0;
        m = 100 + PM1[r] + (z > 2 ? PM2[r] : 0) + (z === 2 ? PM3[r] : 0) + u * PM4[r] + sh * PM5[r];
        g = 120 + PG1[r] + u * PG2[r];
      } else if (p === 2) { m = 298 + 7 * c + 3 * d; g = 278 + 7 * c + d; }
      else if (p === 3) { m = 325 + 4 * c + 2 * d; g = 310 + 4 * c + d; }
      else if (p === 4) {
        let open = 1;
        for (let j = f; j < 64; j += 8) if (b[j] === 1) { open = 0; break; }
        m = 500 + (r === 6 ? 18 : 0) + (z > 2 ? 4 : 0) + 2 * d + 12 * open;
        g = 530 + (r === 6 ? 8 : 0) + d;
      } else if (p === 5) { m = 944 + 2 * c + 5 * d; g = 938 + 4 * c + 2 * d; }
      else { m = (r === 0 ? KM[f] : 0) - (r > 0 ? 25 : 0) - 10 * r; g = 9 * c - 28 + 3 * d; }
      Wp[i] = Math.floor((m * ph + g * (24 - ph)) / 24) + NZ[p * 64 + i];
    }
    W[p] = Wp;
  }
  W[7] = W[4];
  return W;
}

// L: the legal moves as from * 64 + to, in the environment's order (changed in place, as in engine.py).
function go(b, L, lim) {
  N = 0; LIM = lim;
  HH = [0, 1].map(() => Array.from({ length: 64 }, () => new Array(64).fill(0)));
  K = [];
  if (TT.size > 2e5) TT.clear();
  let phs = 0;
  for (let i = 0; i < 64; i++) if (b[i] < 16) phs += PHV[b[i] & 7];
  const ph = Math.min(24, phs);
  NM = ph > 2;
  const w = mk(b, ph), o = mk(F(b), ph);
  WW = [w, o];
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (p & 15) s += p < 8 ? w[p][i] : -o[p - 8][63 - i];
  }
  let best = L[0];
  HS.add(keyOf(b));
  if (L.length < 2) return best;
  try {
    let g = 0;
    for (let d = 1; d < 64; d++) {
      let lo = -I, hi = I;
      if (d > 3) { lo = g - 35; hi = g + 35; }
      let a;
      for (;;) {
        a = lo;
        for (let i = 0; i < L.length; i++) {
          const ft = L[i], f = ft >> 6, t = ft & 63;
          const nb = F(M(b, f, t)), ns = -s - D(b, f, t, w, o);
          let v;
          if (i === 0) v = -S(nb, ns, d - 1, -hi, -a, 1);
          else {
            v = -S(nb, ns, d - 1, -a - 1, -a, 1);
            if (v > a) v = -S(nb, ns, d - 1, -hi, -a, 1);
          }
          if (v > a) {
            a = v; best = ft;
            if (a >= hi) break;
          }
        }
        L.splice(L.indexOf(best), 1);
        L.unshift(best);
        if (lo < a && a < hi) break;
        lo = -I; hi = I;
      }
      g = a;
      if (Math.abs(a) > 19000) break;
    }
  } catch (err) {
    if (err !== ABORT && !(err instanceof RangeError)) throw err;   // a JavaScript bug must not pass for a search result
  }
  return best;
}

const sq = (u, j) => {
  const x = u.charCodeAt(0) - 97 + 8 * (u.charCodeAt(1) - 48) - 8;
  return j & 1 ? 63 - x : x;
};
const nm = (i, j) => {
  if (j & 1) i = 63 - i;
  return 'abcdefgh'[i % 8] + String((i >> 3) + 1);
};
const BUDGET = [15, 15, 15, 15, 15, 25, 25, 25].map((x) => x * 10000);
const STYLE = [1, 3, 3, 5, 5, 8, 8];
const OPP = House.OPPONENTS.map((o) => o.id);

function newGame(variant, oi) {
  TT.clear();
  XS = STYLE[Math.floor(variant / 12)];
  NZ = NOISE[String(variant)];
  if (!NZ || XS === undefined) throw new Error('no noise table for variant ' + variant);
  LN = Number(process.env.NODES || BUDGET[oi]);
}

function ourMove(ms, legal) {
  let b = B0;
  HS = new Set();
  const j = ms.length;
  J = j;
  for (let i = 0; i < j; i++) {
    const u = ms[i];
    HS.add(keyOf(b));
    b = F(M(b, sq(u, i), sq(u.slice(2), i), '  nbrq'.indexOf(u.slice(4) || 'q')));
  }
  const L = legal.filter((u) => u.length === 4 || u[4] === 'q').map((u) => sq(u, j) * 64 + sq(u.slice(2), j));
  const ft = go(b, L, j < 110 ? LN : Math.floor(LN / 3));
  let u = nm(ft >> 6, j) + nm(ft & 63, j);
  if (legal.includes(u + 'q')) u += 'q';
  return u;
}

// ---- one game, as the environment's match server runs it ---------------------------------------
const BOOK = new Map(House.BOOK.map((l) => [l.id, l]));

function playGame(job) {
  const o = House.opponentById(job.opponent);
  const opening = BOOK.get(job.opening);
  if (!o || !opening) throw new Error('unknown opponent or opening: ' + JSON.stringify(job));
  const g = new House.Game();
  for (const m of opening.moves) if (!g.play(m)) throw new Error('opening move not legal: ' + m);
  const entrySide = job.colour === 'white' ? 0 : 1;
  let ending = House.gameEnding(g);
  const house = () => {
    const m = House.moveUci(House.fastAlphabetaMove(g.position, { depth: o.depth, nodes: o.nodes }, g.hashes));
    if (!g.play(m)) throw new Error('the house played an illegal move: ' + m);
    ending = House.gameEnding(g);
  };
  if (ending === null && g.position.side !== entrySide) house();
  newGame(job.variant, OPP.indexOf(job.opponent));
  const cap = job.cap || 0;
  let ourNodes = 0;
  while (ending === null) {
    // a win in fewer than cap plies needs our mating move to be ply cap-1 at the latest
    if (cap && g.moves.length >= cap - 1) {
      return { outcome: 'capped', reason: 'capped', plies: g.moves.length, cap, moves: g.moves.join(' '), our_nodes: ourNodes };
    }
    const legal = g.position.legalMoves().map(House.moveUci);
    const u = ourMove(g.moves, legal);
    ourNodes += N;
    if (!g.play(u)) throw new Error('our move is not legal: ' + u);
    ending = House.gameEnding(g);
    if (ending === null) house();
  }
  const pts = ending.result === '1/2-1/2' ? 0.5 : ((ending.result === '1-0') === (job.colour === 'white') ? 1 : 0);
  return { outcome: pts === 1 ? 'win' : pts === 0 ? 'loss' : 'draw', reason: ending.reason, plies: g.moves.length, moves: g.moves.join(' '), our_nodes: ourNodes };
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of rl) {
  if (!line.trim()) continue;
  const job = JSON.parse(line);
  const t0 = Date.now();
  let out;
  try {
    out = playGame(job);
  } catch (err) {
    out = { error: String(err && err.stack || err) };
  }
  process.stdout.write(JSON.stringify({ id: job.id, opponent: job.opponent, colour: job.colour, opening: job.opening, variant: job.variant, ...out, ms: Date.now() - t0 }) + '\n');
}
