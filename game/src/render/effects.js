// Everything that flashes, drifts or lingers: tracers, bullet marks, dust, smoke clouds, blasts and the keg.
// All of it comes from fixed pools made at load; a firefight allocates nothing.
import * as THREE from 'three';
import { NADES } from '../config.js';
import { overShoulder } from '../sim/state.js';

const TRACERS = 36, MARKS = 96, PUFFS = 48, CLOUD = 9, BLASTS = 4;
const NADE_TINT = ['#4c6b3a', '#e8e2d0', '#8fa3b0'];

export function buildEffects(scene, tex, actors, camera) {
  const pool = (n, make) => { const list = []; for (let i = 0; i < n; i++) { const o = make(i); o.visible = false; scene.add(o); list.push(o); } return list; };
  let tracerI = 0, markI = 0, puffI = 0, blastI = 0;
  const from = new THREE.Vector3(), to = new THREE.Vector3();

  const tracerMat = () => new THREE.MeshBasicMaterial({ color: '#ffe6ad', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const tracers = pool(TRACERS, () => new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), tracerMat()));
  const markGeo = new THREE.CircleGeometry(0.06, 8), markMat = new THREE.MeshBasicMaterial({ color: '#1a1512', transparent: true, opacity: 0.8, depthWrite: false });
  const marks = pool(MARKS, () => new THREE.Mesh(markGeo, markMat));
  const sprite = (blending) => new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.puff, transparent: true, depthWrite: false, blending }));
  const puffs = pool(PUFFS, () => sprite(THREE.NormalBlending));
  const blasts = pool(BLASTS, () => sprite(THREE.AdditiveBlending));
  const shells = pool(NADES.length * 4, (i) => new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshLambertMaterial({ color: NADE_TINT[i % 3] })));
  const clouds = [];
  const flare = new THREE.PointLight('#ffb060', 0, 22, 1.5);
  scene.add(flare);

  // The keg: a banded barrel with a fuse that glows faster as it burns.
  const keg = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.5, 12), new THREE.MeshLambertMaterial({ map: tex.wood, color: '#a06a34' }));
  barrel.position.y = 0.25; barrel.castShadow = true;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.07, 12), new THREE.MeshLambertMaterial({ color: '#2a2d30' }));
  band.position.y = 0.25;
  const spark = sprite(THREE.AdditiveBlending);
  spark.material.color.set('#ff7a3a'); spark.position.y = 0.62; spark.scale.setScalar(0.5);
  const ember = new THREE.PointLight('#ff6a30', 0, 9, 1.6);
  ember.position.y = 0.8;
  keg.add(barrel, band, spark, ember);
  keg.visible = false;
  scene.add(keg);
  let pulse = 0;

  const puff = (x, y, z, color, size, life) => {
    const p = puffs[puffI++ % PUFFS];
    p.visible = true; p.position.set(x, y, z); p.material.color.set(color);
    p.userData.t = 0; p.userData.life = life; p.userData.size = size;
  };
  const blast = (x, y, z, color, size, life) => {
    const b = blasts[blastI++ % BLASTS];
    b.visible = true; b.position.set(x, y, z); b.material.color.set(color);
    b.userData.t = 0; b.userData.life = life; b.userData.size = size;
    flare.position.set(x, y + 0.5, z); flare.intensity = size * 14;
  };

  return {
    /** Turn one simulation event into something to look at. */
    event(e, state) {
      if (e.type === 'tracer') {
        const a = state.actors[e.a], t = tracers[tracerI++ % TRACERS];
        to.set(e.x, e.y, e.z);
        // Your own tracer leaves the gun in your hands; everyone else's leaves their figure's muzzle.
        if (e.a === state.viewId && !overShoulder(state)) from.set(0.16, -0.13, -0.9).applyMatrix4(camera.matrixWorld); else actors.muzzle(a, from);
        const len = from.distanceTo(to);
        if (len < 1.5) return;
        t.visible = true; t.position.copy(from).lerp(to, 0.5); t.lookAt(to); t.scale.set(0.014, 0.014, len);
        t.userData.t = 0;
      } else if (e.type === 'impact') {
        const m = marks[markI++ % MARKS];
        m.visible = true; m.position.set(e.x + e.x2 * 0.02, e.y + e.y2 * 0.02, e.z + e.z2 * 0.02);
        to.set(e.x + e.x2, e.y + e.y2, e.z + e.z2); m.lookAt(to);
        puff(e.x + e.x2 * 0.1, e.y + e.y2 * 0.1, e.z + e.z2 * 0.1, e.n ? '#b8905a' : '#cfc2b0', 0.55, 0.4);
      } else if (e.type === 'hurt') puff(e.x, e.y + 1.2, e.z, '#e8dccb', 0.5, 0.25);
      else if (e.type === 'boom') {
        blast(e.x, e.y + 0.4, e.z, e.n ? '#ffffff' : '#ffb25a', e.n ? 7 : 9, e.n ? 0.18 : 0.32);
        if (!e.n) for (let i = 0; i < 6; i++) puff(e.x + Math.cos(i) * 1.2, e.y + 0.5, e.z + Math.sin(i) * 1.2, '#4a4038', 3.2, 1.1);
      } else if (e.type === 'kegBoom') {
        blast(e.x, 1.5, e.z, '#ffc070', 30, 0.7);
        for (let i = 0; i < 10; i++) puff(e.x + Math.cos(i * 0.63) * 3.5, 1 + (i % 3), e.z + Math.sin(i * 0.63) * 3.5, '#3a302a', 8, 2.2);
      } else if (e.type === 'beep') pulse = 1;
    },

    update(state, dt) {
      for (const t of tracers) if (t.visible) { t.userData.t += dt; t.material.opacity = 0.75 * (1 - t.userData.t / 0.07); if (t.userData.t > 0.07) t.visible = false; }
      for (const list of [puffs, blasts]) for (const p of list) {
        if (!p.visible) continue;
        const u = p.userData, k = (u.t += dt) / u.life;
        if (k >= 1) { p.visible = false; continue; }
        p.scale.setScalar(u.size * (0.35 + 0.65 * k)); p.material.opacity = (1 - k) * 0.8;
      }
      flare.intensity *= Math.max(0, 1 - dt * 9);

      // Grenades in the air, and a cluster of soft discs for each Seafog cloud (made the first time one bursts).
      state.nades.forEach((n, i) => {
        const shell = shells[i], smoking = n.live && n.cloud > 0;
        shell.visible = n.live && !smoking;
        if (shell.visible) { shell.position.set(n.x, n.y, n.z); shell.material.color.set(NADE_TINT[n.type]); }
        if (smoking && !clouds[i]) clouds[i] = pool(CLOUD, () => { const s = sprite(THREE.NormalBlending); s.material.color.set('#d5d9df'); return s; });
        if (!clouds[i]) return;
        const life = NADES[2].life, fade = smoking ? Math.min(1, (life - n.cloud) / 0.9, n.cloud / 2.5) : 0;
        clouds[i].forEach((s, j) => {
          s.visible = fade > 0;
          if (!s.visible) return;
          const a = j * 2.4 + state.time * 0.12, r = j ? 1.7 + (j % 3) * 0.5 : 0;
          s.position.set(n.x + Math.cos(a) * r, 1.5 + (j % 4) * 0.55 + Math.sin(state.time * 0.5 + j) * 0.12, n.z + Math.sin(a) * r);
          s.scale.setScalar(4.6 + (j % 3) * 0.7); s.material.opacity = fade * 0.92; s.material.rotation = a * 0.3;
        });
      });

      const k = state.keg;
      keg.visible = k.state === 'dropped' || k.state === 'planted' || k.state === 'doused';
      if (keg.visible) {
        keg.position.set(k.x, 0, k.z);
        pulse = Math.max(0, pulse - dt * 4);
        const lit = k.state === 'planted';
        spark.visible = lit; spark.scale.setScalar(0.35 + pulse * 0.6); ember.intensity = lit ? 2 + pulse * 16 : 0;
      }
    },
  };
}
