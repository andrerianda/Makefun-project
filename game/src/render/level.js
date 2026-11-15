// The town as meshes, built once from the same boxes the simulation collides with. Faces are merged per
// material into a few draw calls, and every vertex carries baked ambient light: at load the builder casts rays
// from each vertex against the map and darkens corners, wall feet and the undersides of things.
import * as THREE from 'three';
import { PALETTE } from '../config.js';
import { boxes, COLS, ROWS, CELL, cellX, cellZ, tile, zoneAt } from '../sim/map.js';
import { rayWorld } from '../sim/world.js';
import { label } from './textures.js';

const REACH = 2.4, RING = [[1, 0], [0, 1], [-1, 0], [0, -1], [0.7, 0.7], [-0.7, 0.7], [-0.7, -0.7], [0.7, -0.7]];
const baked = new Map();

/** Ambient light reaching a surface point, 0.4 (deep corner) to 1 (open): eight rays fanned around the normal. */
function bake(x, y, z, nx, ny, nz) {
  const key = `${Math.round(x * 4)},${Math.round(y * 4)},${Math.round(z * 4)},${nx}${ny}${nz}`;
  let light = baked.get(key);
  if (light !== undefined) return light;
  const up = ny !== 0, tx = up ? 1 : -nz, tz = up ? 0 : nx, by = up ? 0 : 1, bz = up ? 1 : 0;
  const ox = x + nx * 0.06, oy = y + ny * 0.06, oz = z + nz * 0.06;
  let shade = 0;
  for (const [u, v] of RING) {
    const t = rayWorld(ox, oy, oz, nx * 0.5 + tx * u * 0.87, ny * 0.5 + by * v * 0.87, nz * 0.5 + (tz * u + bz * v) * 0.87, REACH);
    if (t < REACH) shade += 1 - t / REACH;
  }
  light = 1 - 0.52 * shade / RING.length;
  baked.set(key, light);
  return light;
}

/** Faces gathered for one material, then turned into a single mesh. */
class Batch {
  constructor(material) { this.material = material; this.p = []; this.n = []; this.uv = []; this.c = []; this.i = []; }

  /** A rectangle from corner o along unit axes u and v (u x v must be the outward normal), cut into ~1.3 m
   *  squares so the baked light has vertices to live on. `tile` is metres per texture repeat. */
  face(o, u, v, lu, lv, n, tint, tile, lit = true, keep = null) {
    const nu = lit ? Math.max(1, Math.round(lu / 1.3)) : 1, nv = lit ? Math.max(1, Math.round(lv / 1.3)) : 1;
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      if (keep && !keep(o[0] + u[0] * (i + 0.5) * lu / nu + n[0], o[1] + v[1] * (j + 0.5) * lv / nv, o[2] + u[2] * (i + 0.5) * lu / nu + n[2])) continue;
      const base = this.p.length / 3;
      for (let k = 0; k < 4; k++) {
        const a = (i + (k === 1 || k === 2 ? 1 : 0)) * lu / nu, b = (j + (k > 1 ? 1 : 0)) * lv / nv;
        const x = o[0] + u[0] * a + v[0] * b, y = o[1] + u[1] * a + v[1] * b, z = o[2] + u[2] * a + v[2] * b;
        const l = lit ? bake(x, y, z, n[0], n[1], n[2]) : 1;
        this.p.push(x, y, z); this.n.push(n[0], n[1], n[2]); this.uv.push(a / tile, b / tile); this.c.push(tint.r * l, tint.g * l, tint.b * l);
      }
      this.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  /** The four sides of a box (and its top, into `topBatch`). */
  box(b, tint, tile, topBatch = this, topTint = tint, topTile = tile, keep = null) {
    const w = b.x1 - b.x0, d = b.z1 - b.z0, h = b.y1 - b.y0;
    this.face([b.x1, b.y0, b.z1], [0, 0, -1], [0, 1, 0], d, h, [1, 0, 0], tint, tile, true, keep);
    this.face([b.x0, b.y0, b.z0], [0, 0, 1], [0, 1, 0], d, h, [-1, 0, 0], tint, tile, true, keep);
    this.face([b.x0, b.y0, b.z1], [1, 0, 0], [0, 1, 0], w, h, [0, 0, 1], tint, tile, true, keep);
    this.face([b.x1, b.y0, b.z0], [-1, 0, 0], [0, 1, 0], w, h, [0, 0, -1], tint, tile, true, keep);
    topBatch.face([b.x0, b.y1, b.z1], [1, 0, 0], [0, 0, -1], w, d, [0, 1, 0], topTint, topTile, b.y1 < 4);
    if (b.y0 > 0.5) this.face([b.x0, b.y0, b.z0], [1, 0, 0], [0, 0, 1], w, d, [0, -1, 0], tint, tile);
  }

  /** A flat decal with its own UV rectangle: a window, a door, a sign. `r` is the wall's right-hand axis. */
  decal(x, y, z, r, n, w, h, u0, v0, u1, v1) {
    const base = this.p.length / 3, hw = w / 2;
    for (const [sx, sy, tu, tv] of [[-1, 0, u0, v0], [1, 0, u1, v0], [1, 1, u1, v1], [-1, 1, u0, v1]]) {
      this.p.push(x + r[0] * sx * hw + n[0] * 0.04, y + sy * h, z + r[2] * sx * hw + n[2] * 0.04);
      this.n.push(n[0], 0, n[2]); this.uv.push(tu, tv); this.c.push(1, 1, 1);
    }
    this.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  mesh() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.i);
    const m = new THREE.Mesh(g, this.material);
    m.castShadow = m.receiveShadow = true;
    return m;
  }
}

const lit = (map, extra) => new THREE.MeshLambertMaterial({ map, vertexColors: true, ...extra });
const colour = (hex) => new THREE.Color(hex);
const hash = (a, b) => ((Math.round(a * 7) * 73856093) ^ (Math.round(b * 7) * 19349663)) >>> 0;
const WHITE = colour('#ffffff');

/** Shuttered windows and the odd door on every house face that looks onto a street. */
function dressWall(trim, b) {
  const sides = [[b.x1, 0, 1, 0, [0, 0, -1], [1, 0, 0]], [b.x0, 0, -1, 0, [0, 0, 1], [-1, 0, 0]], [b.z1, 1, 0, 1, [1, 0, 0], [0, 0, 1]], [b.z0, 1, 0, -1, [-1, 0, 0], [0, 0, -1]]];
  for (const [edge, alongX, nx, nz, r, n] of sides) {
    const lo = alongX ? b.x0 : b.z0, hi = alongX ? b.x1 : b.z1;
    for (let s = lo + 1.2; s < hi - 0.5; s += 2.4) {
      const x = alongX ? s : edge, z = alongX ? edge : s;
      if (tile(Math.floor((x + nx) / CELL + COLS / 2), Math.floor((z + nz) / CELL + ROWS / 2)) === '#') continue;
      const k = hash(x, z), cell = k % 6, u = (cell % 4) / 4, v = cell < 4 ? 0.5 : 0;
      trim.decal(x, 3.1, z, r, n, 1.5, 1.7, u, v, u + 0.25, v + 0.5);
      if (b.y1 > 7.6) trim.decal(x, 5.7, z, r, n, 1.5, 1.7, ((k >> 4) % 4) / 4, 0.5, ((k >> 4) % 4) / 4 + 0.25, 1);
      if (k % 5 === 0) trim.decal(x, 0, z, r, n, 1.5, 2.3, 0.5 + ((k >> 7) % 2) / 4, 0, 0.75 + ((k >> 7) % 2) / 4, 0.5);
    }
  }
}

/** Build Porto Vesper into `scene`. */
export function buildLevel(scene, tex, kit) {
  const P = PALETTE;
  const plaster = new Batch(lit(tex.plaster)), roof = new Batch(lit(tex.roof)), cobble = new Batch(lit(tex.cobble));
  const flag = new Batch(lit(tex.flag)), plank = new Batch(lit(tex.plank)), site = new Batch(lit(tex.site)), stone = new Batch(lit(tex.stone));
  const crate = new Batch(lit(tex.crate)), wood = new Batch(lit(tex.wood)), trim = new Batch(lit(tex.trim));
  const awning = new Batch(lit(tex.awning, { side: THREE.DoubleSide }));
  const stucco = P.stucco.map(colour), stoneTint = colour(P.stone), crateTint = colour(P.crate), plankTint = colour('#c79a6a'), woodTint = colour('#7a5334');
  const street = colour('#c2b2a2'), market = colour('#d9c8b0');
  const openAir = (x, y, z) => y > 5.9 || tile(Math.floor(x / CELL + COLS / 2), Math.floor(z / CELL + ROWS / 2)) !== '#';

  // Ground: one square per cell, its paving chosen by where it is.
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const t = tile(c, r);
    if (t === '#' || t === '~') continue;
    const x = cellX(c), z = cellZ(r), zone = zoneAt(x, z);
    const batch = t === 'A' || t === 'B' ? site : zone === 'Fish Market' ? flag : zone === 'Boathouse' ? plank : cobble;
    batch.face([x - 1, 0, z + 1], [1, 0, 0], [0, 0, -1], CELL, CELL, [0, 1, 0], batch === plank ? plankTint : batch === cobble ? street : market, batch === cobble ? 1.7 : batch === plank ? 1.4 : 3);
  }

  const basins = [], shrubs = [], barrels = [];
  for (const b of boxes) {
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    if (b.kind === 'wall') {
      plaster.box(b, stucco[b.style], 3, roof, WHITE, 2.4, openAir);
      roof.box({ x0: b.x0 - 0.28, x1: b.x1 + 0.28, z0: b.z0 - 0.28, z1: b.z1 + 0.28, y0: b.y1, y1: b.y1 + 0.24 }, WHITE, 2.4);
      dressWall(trim, b);
    } else if (b.kind === 'lintel') plaster.box(b, stucco[b.style], 3, roof, WHITE, 2.4);
    else if (b.kind === 'roof') {
      plank.box(b, plankTint, 1.4, roof, WHITE, 2.4);
      for (let x = b.x0 + 2; x < b.x1; x += 4) wood.box({ x0: x - 0.15, x1: x + 0.15, y0: b.y0 - 0.35, y1: b.y0, z0: b.z0, z1: b.z1 }, woodTint, 1);
    } else if (b.kind === 'crate' || b.kind === 'stack') crate.box(b, crateTint, 1.3);
    else if (b.kind === 'low' || b.kind === 'spout') stone.box(b, stoneTint, 1.6);
    else if (b.kind === 'planter') { stone.box(b, stoneTint, 1.6); shrubs.push(cx, b.y1, cz); }
    else if (b.kind === 'basin') { stone.box(b, stoneTint, 1.6); basins.push(cx, b.y1 - 0.08, cz); }
    else if (b.kind === 'barrel') barrels.push(cx, cz);
    else if (b.kind === 'hull') {
      wood.box({ x0: b.x0, x1: b.x1, z0: b.z0 + 0.3, z1: b.z1 - 0.3, y0: 0.5, y1: b.y1 }, plankTint, 1);
      for (const z of [b.z0 + 0.5, b.z1 - 0.7]) wood.box({ x0: b.x0 - 0.2, x1: b.x1 + 0.2, z0: z, z1: z + 0.2, y0: 0, y1: 0.5 }, woodTint, 1);
    } else if (b.kind === 'stall') { // a counter, four posts and a striped awning pitched towards the square
      crate.box(b, plankTint, 1.3);
      for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) wood.box({ x0: cx + dx - 0.05, x1: cx + dx + 0.05, z0: cz + dz - 0.05, z1: cz + dz + 0.05, y0: 0, y1: 2.5 }, woodTint, 1);
      awning.face([cx - 0.95, 2.75, cz + 0.95], [0.97, -0.24, 0], [0, 0, -1], 2.3, 1.9, [0.24, 0.97, 0], WHITE, 1.1, false);
    }
  }

  // The campanile: a pale shaft over Bell Square, an open belfry, a tiled spire. You can see it from every lane.
  const tx0 = cellX(19) - 1.06, tx1 = cellX(20) + 1.06, tz0 = cellZ(7) - 1.06, tz1 = cellZ(8) + 1.06, mid = (tx0 + tx1) / 2, midZ = (tz0 + tz1) / 2;
  plaster.box({ x0: tx0, x1: tx1, z0: tz0, z1: tz1, y0: 0, y1: 20 }, colour('#f0dcb8'), 3, stone, stoneTint, 1.6);
  for (const [dx, dz] of [[tx0, tz0], [tx1 - 0.6, tz0], [tx0, tz1 - 0.6], [tx1 - 0.6, tz1 - 0.6]]) plaster.box({ x0: dx, x1: dx + 0.6, z0: dz, z1: dz + 0.6, y0: 20, y1: 23.2 }, colour('#f0dcb8'), 3);
  roof.box({ x0: tx0 - 0.3, x1: tx1 + 0.3, z0: tz0 - 0.3, z1: tz1 + 0.3, y0: 23.2, y1: 23.6 }, WHITE, 2.4);
  for (const y of [0, 7.4, 13.4, 19.6]) stone.box({ x0: tx0 - 0.14, x1: tx1 + 0.14, z0: tz0 - 0.14, z1: tz1 + 0.14, y0: y, y1: y + (y ? 0.4 : 1.1) }, stoneTint, 1.6); // plinth and cornices
  for (const y of [3.4, 9.6]) for (const s of [1, -1]) { // lancet windows up the shaft
    trim.decal(mid, y, s > 0 ? tz1 : tz0, [s, 0, 0], [0, 0, s], 0.9, 2.3, 0.5, 0, 0.75, 0.5);
    trim.decal(s > 0 ? tx1 : tx0, y, midZ, [0, 0, -s], [s, 0, 0], 0.9, 2.3, 0.75, 0, 1, 0.5);
  }

  for (const batch of [plaster, roof, cobble, flag, plank, site, stone, crate, wood, trim, awning]) if (batch.i.length) scene.add(batch.mesh());

  const add = (geometry, material, x, y, z, shadow = true) => {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = shadow;
    scene.add(m);
    return m;
  };
  const tile4 = new THREE.MeshLambertMaterial({ map: tex.roof });
  add(new THREE.ConeGeometry(3.3, 4.2, 4), tile4, mid, 25.7, midZ).rotation.y = Math.PI / 4;
  add(new THREE.SphereGeometry(0.75, 12, 8), new THREE.MeshLambertMaterial({ color: '#5b4a2c' }), mid, 21.6, midZ);
  const dial = new THREE.MeshBasicMaterial({ map: label('XII', '#3a2c22', 64), transparent: true });
  for (const s of [1, -1]) { // a clock face north and south
    add(new THREE.CircleGeometry(1.35, 24), new THREE.MeshLambertMaterial({ color: '#f7efdc' }), mid, 16.5, s > 0 ? tz1 + 0.03 : tz0 - 0.03, false).rotation.y = s > 0 ? 0 : Math.PI;
    add(new THREE.PlaneGeometry(1.2, 0.5), dial, mid, 17.3, s > 0 ? tz1 + 0.05 : tz0 - 0.05, false).rotation.y = s > 0 ? 0 : Math.PI;
  }

  // Barrels and shrubs are small and many: one instanced mesh each.
  const place = new THREE.Object3D();
  const instanced = (geometry, material, count, each) => {
    const m = new THREE.InstancedMesh(geometry, material, count);
    for (let i = 0; i < count; i++) { each(i, place); place.updateMatrix(); m.setMatrixAt(i, place.matrix); }
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
  };
  instanced(new THREE.CylinderGeometry(0.31, 0.27, 1.1, 10), new THREE.MeshLambertMaterial({ map: tex.wood, color: '#9a6a3c' }), barrels.length / 2 * 3, (i, o) => {
    const k = (i / 3) | 0, a = (i % 3) * 2.1 + k;
    o.position.set(barrels[k * 2] + Math.cos(a) * 0.3, 0.55, barrels[k * 2 + 1] + Math.sin(a) * 0.3); o.scale.setScalar(1); o.rotation.set(0, a, 0);
  });
  instanced(new THREE.IcosahedronGeometry(0.5, 1), new THREE.MeshLambertMaterial({ color: P.leaf, flatShading: true }), shrubs.length, (i, o) => {
    const k = (i / 3) | 0, a = i * 2.4;
    o.position.set(shrubs[k * 3] + Math.cos(a) * 0.35, shrubs[k * 3 + 1] + 0.3 + (i % 3) * 0.12, shrubs[k * 3 + 2] + Math.sin(a) * 0.35); o.scale.set(1, 0.8 + (i % 3) * 0.2, 1); o.rotation.set(0, a, 0);
  });

  // Festoon lights strung across the lanes, and the Boathouse's hanging lamps (the only real point lights).
  const bulbs = [];
  const festoon = (x0, x1, z) => { for (let i = 0; i <= 10; i++) { const k = i / 10; bulbs.push(x0 + (x1 - x0) * k, 4.9 - Math.sin(k * Math.PI) * 0.7, z); } };
  for (const r of [13, 17, 21]) { festoon(cellX(18) - 1, cellX(21) + 1, cellZ(r)); festoon(cellX(3) - 1, cellX(6) + 1, cellZ(r + 1)); }
  for (const r of [3, 8]) festoon(cellX(14) - 1, cellX(25) + 1, cellZ(r));
  instanced(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe2a8', fog: false }), bulbs.length / 3, (i, o) => { o.position.set(bulbs[i * 3], bulbs[i * 3 + 1], bulbs[i * 3 + 2]); o.scale.setScalar(1); });
  const water = new THREE.MeshLambertMaterial({ color: '#5fa9b8' });
  for (let i = 0; i < basins.length; i += 3) add(new THREE.CircleGeometry(0.85, 16), water, basins[i], basins[i + 1], basins[i + 2], false).rotation.x = -Math.PI / 2;
  for (const [c, r] of [[29.5, 3], [34, 7.5], [19.5, 12.4]]) {
    const light = new THREE.PointLight('#ffc27a', 26, 15, 1.6);
    light.position.set(cellX(c), 4.1, cellZ(r));
    scene.add(light);
    add(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffe2b0' }), cellX(c), 4.3, cellZ(r), false);
  }

  // Painted site letters and street names, so the map explains itself.
  const sign = (text, c, r, y, yaw, height, color = 'rgba(250,240,220,0.9)') => {
    const map = label(text, color);
    const m = add(new THREE.PlaneGeometry(height * map.userData.aspect, height), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false }), cellX(c), y, cellZ(r), false);
    m.rotation.y = yaw;
  };
  sign('A', 2.52, 5, 3.2, Math.PI / 2, 2.6, 'rgba(242,162,58,0.95)'); sign('FISH MARKET', 2.52, 8, 4.6, Math.PI / 2, 0.7);
  sign('B', 36.48, 5, 3.2, -Math.PI / 2, 2.6, 'rgba(242,162,58,0.95)'); sign('BOATHOUSE', 36.48, 8, 4.4, -Math.PI / 2, 0.7);
  sign('BELL GATE', 19.5, 11.52, 3.4, 0, 0.6); sign('NET ROW', 2.52, 16, 3.4, Math.PI / 2, 0.6); sign('QUAY', 31.48, 15, 3.4, -Math.PI / 2, 0.6);
}
