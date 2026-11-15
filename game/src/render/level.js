// The town as meshes, built once from the same boxes the simulation collides with. Walls and ground are merged
// per material into a few draw calls, and every vertex carries baked ambient light: at load the builder casts
// rays from each vertex against the map and darkens corners, wall feet and the undersides of things. Street
// furniture comes from the model kit and is placed by rule: what stands on a cell, what hangs on a wall.
import * as THREE from 'three';
import { PALETTE } from '../config.js';
import { boxes, COLS, ROWS, CELL, cellX, cellZ, tile, zoneAt } from '../sim/map.js';
import { rayWorld } from '../sim/world.js';
import { label } from './textures.js';

const REACH = 2.4, RING = [[1, 0], [0, 1], [-1, 0], [0, -1], [0.7, 0.7], [-0.7, 0.7], [-0.7, -0.7], [0.7, -0.7]];
const baked = new Map();

/** Ambient light reaching a surface point, 0.48 (deep corner) to 1 (open): eight rays fanned around the normal. */
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

  /** The four sides of a box, its top (into `topBatch`) and, when it hangs in the air, its underside. */
  box(b, tint, tile, topBatch = this, topTint = tint, topTile = tile, keep = null) {
    const w = b.x1 - b.x0, d = b.z1 - b.z0, h = b.y1 - b.y0;
    this.face([b.x1, b.y0, b.z1], [0, 0, -1], [0, 1, 0], d, h, [1, 0, 0], tint, tile, true, keep);
    this.face([b.x0, b.y0, b.z0], [0, 0, 1], [0, 1, 0], d, h, [-1, 0, 0], tint, tile, true, keep);
    this.face([b.x0, b.y0, b.z1], [1, 0, 0], [0, 1, 0], w, h, [0, 0, 1], tint, tile, true, keep);
    this.face([b.x1, b.y0, b.z0], [-1, 0, 0], [0, 1, 0], w, h, [0, 0, -1], tint, tile, true, keep);
    topBatch.face([b.x0, b.y1, b.z1], [1, 0, 0], [0, 0, -1], w, d, [0, 1, 0], topTint, topTile, b.y1 < 4);
    if (b.y0 > 0.5) this.face([b.x0, b.y0, b.z0], [1, 0, 0], [0, 0, 1], w, d, [0, -1, 0], tint, tile);
  }

  /** A flat decal with its own UV rectangle: a window, a door. `r` is the wall's right-hand axis. */
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
// What the kit draws for a solid the map lists, and what may lean against a house wall.
const STANDS = { barrel: 'barrels', stall: 'stall', basin: 'fountain', hull: 'hull', cart: 'cart', table: 'table', nets: 'nets', sacks: 'sacks', planter: 'cypress' };
const LEANS = ['pots', 'anchor', 'lobsterpots', 'pipe'];

/** Build Porto Vesper into `scene`. Returns `update(time)` for the few things that move. */
export function buildLevel(scene, tex, kit) {
  const P = PALETTE;
  const plaster = new Batch(lit(tex.plaster)), roof = new Batch(lit(tex.roof)), cobble = new Batch(lit(tex.cobble));
  const flag = new Batch(lit(tex.flag)), plank = new Batch(lit(tex.plank)), site = new Batch(lit(tex.site)), stone = new Batch(lit(tex.stone));
  const crate = new Batch(lit(tex.crate)), wood = new Batch(lit(tex.wood)), trim = new Batch(lit(tex.trim));
  const stucco = P.stucco.map(colour), stoneTint = colour(P.stone), crateTint = colour(P.crate), plankTint = colour('#c79a6a'), woodTint = colour('#7a5334');
  const street = colour('#c2b2a2'), market = colour('#d9c8b0');
  const openAir = (x, y, z) => y > 5.9 || tile(Math.floor(x / CELL + COLS / 2), Math.floor(z / CELL + ROWS / 2)) !== '#';
  const paint = new THREE.MeshLambertMaterial({ vertexColors: true }), glow = new THREE.MeshBasicMaterial({ color: '#ffe2b0', fog: false });
  /** Stand a kit model in the world. */
  const prop = (name, x, y, z, yaw = 0) => {
    const b = kit.build(name, paint);
    b.root.position.set(x, y, z); b.root.rotation.y = yaw;
    if (b.glow) b.glow.children[0].material = glow;
    scene.add(b.root);
    return b.root;
  };

  // Painted site letters and street names, so the map explains itself: text, cell, height up the wall,
  // quarter turns, letter height. Windows keep clear of them.
  const SIGNS = [['A', 2.52, 5, 3.2, 1, 2.6], ['FISH MARKET', 2.52, 8, 4.6, 1, 0.7], ['B', 36.48, 5, 3.2, -1, 2.6], ['BOATHOUSE', 36.48, 8, 4.4, -1, 0.7],
    ['BELL GATE', 19.5, 11.52, 3.4, 0, 0.6], ['NET ROW', 2.52, 17, 3.4, 1, 0.6], ['QUAY', 31.48, 17, 3.4, -1, 0.6]];
  const signed = (x, z) => SIGNS.some((s) => Math.hypot(x - cellX(s[1]), z - cellZ(s[2])) < 1 + s[5] * s[0].length * 0.35);

  // Ground: one square per cell, its paving chosen by where it is; a lamp where a lane meets a wall.
  let lamps = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const t = tile(c, r);
    if (t === '#' || t === '~') continue;
    const x = cellX(c), z = cellZ(r), zone = zoneAt(x, z);
    const batch = t === 'A' || t === 'B' ? site : zone === 'Fish Market' ? flag : zone === 'Boathouse' ? plank : cobble;
    batch.face([x - 1, 0, z + 1], [1, 0, 0], [0, 0, -1], CELL, CELL, [0, 1, 0], batch === plank ? plankTint : batch === cobble ? street : market, batch === cobble ? 1.7 : batch === plank ? 1.4 : 3);
    const west = tile(c - 1, r) === '#', east = tile(c + 1, r) === '#';
    if (t === '.' && (west || east) && hash(c, r) % 13 === 0) {
      prop('lamp', x + (west ? -0.92 : 0.92), 0, z, west ? 0 : Math.PI);
      if (lamps++ < 4) { const l = new THREE.PointLight('#ffc27a', 22, 13, 1.6); l.position.set(x, 3, z); scene.add(l); }
    }
  }

  for (const b of boxes) {
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, k = hash(cx, cz);
    if (b.kind === 'wall') {
      plaster.box(b, stucco[b.style], 3, roof, WHITE, 2.4, openAir);
      roof.box({ x0: b.x0 - 0.28, x1: b.x1 + 0.28, z0: b.z0 - 0.28, z1: b.z1 + 0.28, y0: b.y1, y1: b.y1 + 0.24 }, WHITE, 2.4);
      if (k % 2) prop('chimney', cx + 0.4, b.y1 + 0.2, cz - 0.3);
      // Each face that looks onto a street gets shuttered windows, the odd door under an awning, a balcony,
      // washing, and things leaning at its foot.
      for (const [edge, alongX, r, n] of [[b.x1, 0, [0, 0, -1], [1, 0, 0]], [b.x0, 0, [0, 0, 1], [-1, 0, 0]], [b.z1, 1, [1, 0, 0], [0, 0, 1]], [b.z0, 1, [-1, 0, 0], [0, 0, -1]]]) {
        const lo = alongX ? b.x0 : b.z0, hi = alongX ? b.x1 : b.z1, yaw = Math.atan2(n[0], n[2]);
        for (let s = lo + 1.2; s < hi - 0.5; s += 2.4) {
          const x = alongX ? s : edge, z = alongX ? edge : s, q = hash(x, z), cell = q % 6, u = (cell % 4) / 4, v = cell < 4 ? 0.5 : 0;
          if (!openAir(x + n[0], 0, z + n[2]) || signed(x, z)) continue;
          trim.decal(x, 3.1, z, r, n, 1.5, 1.7, u, v, u + 0.25, v + 0.5);
          if (b.y1 > 7.6) {
            trim.decal(x, 5.7, z, r, n, 1.5, 1.7, ((q >>> 4) % 4) / 4, 0.5, ((q >>> 4) % 4) / 4 + 0.25, 1);
            if (q % 3 === 0) prop('balcony', x, 5.6, z, yaw);
          }
          if (q % 5 === 0) { trim.decal(x, 0, z, r, n, 1.5, 2.3, 0.5 + ((q >>> 7) % 2) / 4, 0, 0.75 + ((q >>> 7) % 2) / 4, 0.5); prop('awning', x, 0, z, yaw); }
          else if (q % 7 === 2) prop(LEANS[(q >>> 3) % 4], x, 0, z, yaw);
          else if (q % 11 === 5) prop('washing', x, 0, z, yaw);
        }
      }
    } else if (b.kind === 'lintel') plaster.box(b, stucco[b.style], 3, roof, WHITE, 2.4);
    else if (b.kind === 'roof') {
      plank.box(b, plankTint, 1.4, roof, WHITE, 2.4);
      for (let x = b.x0 + 2; x < b.x1; x += 4) wood.box({ x0: x - 0.15, x1: x + 0.15, y0: b.y0 - 0.35, y1: b.y0, z0: b.z0, z1: b.z1 }, woodTint, 1);
    } else if (b.kind === 'crate' || b.kind === 'stack') crate.box(b, crateTint, 1.3);
    else if (b.kind === 'low') stone.box(b, stoneTint, 1.6);
    else if (STANDS[b.kind]) {
      if (b.kind === 'planter') stone.box(b, stoneTint, 1.6);
      prop(STANDS[b.kind], cx, b.kind === 'planter' ? b.y1 : 0, cz, (k % 4) * Math.PI / 2);
    }
  }

  // The campanile: a pale shaft over Bell Square, an open belfry with its bell, a tiled spire. Every lane sees it.
  const tx0 = cellX(19) - 1.06, tx1 = cellX(20) + 1.06, tz0 = cellZ(7) - 1.06, tz1 = cellZ(8) + 1.06, mid = (tx0 + tx1) / 2, midZ = (tz0 + tz1) / 2;
  plaster.box({ x0: tx0, x1: tx1, z0: tz0, z1: tz1, y0: 0, y1: 20 }, colour('#f0dcb8'), 3, stone, stoneTint, 1.6);
  for (const [dx, dz] of [[tx0, tz0], [tx1 - 0.6, tz0], [tx0, tz1 - 0.6], [tx1 - 0.6, tz1 - 0.6]]) plaster.box({ x0: dx, x1: dx + 0.6, z0: dz, z1: dz + 0.6, y0: 20, y1: 23.2 }, colour('#f0dcb8'), 3);
  roof.box({ x0: tx0 - 0.3, x1: tx1 + 0.3, z0: tz0 - 0.3, z1: tz1 + 0.3, y0: 23.2, y1: 23.6 }, WHITE, 2.4);
  for (const y of [0, 7.4, 13.4, 19.6]) stone.box({ x0: tx0 - 0.14, x1: tx1 + 0.14, z0: tz0 - 0.14, z1: tz1 + 0.14, y0: y, y1: y + (y ? 0.4 : 1.1) }, stoneTint, 1.6); // plinth and cornices
  for (const y of [3.4, 9.6]) for (const s of [1, -1]) { // lancet windows up the shaft
    trim.decal(mid, y, s > 0 ? tz1 : tz0, [s, 0, 0], [0, 0, s], 0.9, 2.3, 0.5, 0, 0.75, 0.5);
    trim.decal(s > 0 ? tx1 : tx0, y, midZ, [0, 0, -s], [s, 0, 0], 0.9, 2.3, 0.75, 0, 1, 0.5);
  }
  prop('bell', mid, 20.6, midZ);

  for (const batch of [plaster, roof, cobble, flag, plank, site, stone, crate, wood, trim]) if (batch.i.length) scene.add(batch.mesh());

  const add = (geometry, material, x, y, z) => {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  add(new THREE.ConeGeometry(3.3, 4.2, 4), new THREE.MeshLambertMaterial({ map: tex.roof }), mid, 25.7, midZ).rotation.y = Math.PI / 4;
  const dial = new THREE.MeshBasicMaterial({ map: label('XII', '#3a2c22', 64), transparent: true });
  for (const s of [1, -1]) { // a clock face north and south
    add(new THREE.CircleGeometry(1.35, 24), new THREE.MeshLambertMaterial({ color: '#f7efdc' }), mid, 16.5, s > 0 ? tz1 + 0.03 : tz0 - 0.03).rotation.y = s > 0 ? 0 : Math.PI;
    add(new THREE.PlaneGeometry(1.2, 0.5), dial, mid, 17.3, s > 0 ? tz1 + 0.05 : tz0 - 0.05).rotation.y = s > 0 ? 0 : Math.PI;
  }

  // Festoon bulbs and pennants strung across the lanes; the Boathouse's hanging lamps.
  const bulbs = [];
  const festoon = (x0, x1, z) => {
    for (let i = 0; i <= 10; i++) { const k = i / 10; bulbs.push(x0 + (x1 - x0) * k, 4.9 - Math.sin(k * Math.PI) * 0.7, z); }
    for (let x = x0 + 2; x < x1; x += 4) prop('bunting', x, 5.5, z + 1);
  };
  for (const r of [13, 17, 22]) { festoon(cellX(18) - 1, cellX(21) + 1, cellZ(r)); festoon(cellX(3) - 1, cellX(6) + 1, cellZ(r + 1)); }
  for (const r of [3, 8]) festoon(cellX(14) - 1, cellX(25) + 1, cellZ(r));
  const string = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 8, 6), glow, bulbs.length / 3), spot = new THREE.Object3D();
  for (let i = 0; i < bulbs.length; i += 3) { spot.position.set(bulbs[i], bulbs[i + 1], bulbs[i + 2]); spot.updateMatrix(); string.setMatrixAt(i / 3, spot.matrix); }
  scene.add(string);
  for (const [c, r] of [[29.5, 3], [34, 7.5], [19.5, 12.4]]) {
    const light = new THREE.PointLight('#ffc27a', 26, 15, 1.6);
    light.position.set(cellX(c), 4.1, cellZ(r));
    scene.add(light);
    add(new THREE.SphereGeometry(0.16, 10, 8), glow, cellX(c), 4.3, cellZ(r));
  }

  // The quay: mooring posts on the sea wall, boats riding at anchor.
  for (let r = 12; r < 24; r += 3) prop('bollard', cellX(36), 1.1, cellZ(r));
  const afloat = [prop('boat', cellX(38.4), 0, cellZ(13.5), 0.3), prop('rowboat', cellX(37.9), 0, cellZ(18.5), 1.3), prop('boat', cellX(39.3), 0, cellZ(22), -0.5)];

  for (const [text, c, r, y, turn, height] of SIGNS) {
    const map = label(text, height > 1 ? 'rgba(242,162,58,0.95)' : 'rgba(250,240,220,0.9)');
    add(new THREE.PlaneGeometry(height * map.userData.aspect, height), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false }), cellX(c), y, cellZ(r)).rotation.y = turn * Math.PI / 2;
  }

  return (time) => afloat.forEach((boat, i) => { boat.position.y = -0.82 + Math.sin(time * 0.9 + i * 2) * 0.07; boat.rotation.z = Math.sin(time * 0.7 + i) * 0.05; });
}
