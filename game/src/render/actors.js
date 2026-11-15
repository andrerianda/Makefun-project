// The ten bodies: blocky figures in their crew's colours, posed from the simulation each frame.
import * as THREE from 'three';
import { TEAMS } from '../config.js';
import { label } from './textures.js';

const LOOKS = [
  { coat: '#6e4a33', legs: '#3a3440', accent: TEAMS[0].color },
  { coat: '#30466e', legs: '#262a36', accent: TEAMS[1].color },
];
const HIP = 0.86;

function figure(look, name) {
  const mat = (color) => new THREE.MeshLambertMaterial({ color });
  const coat = mat(look.coat), legs = mat(look.legs), accent = mat(look.accent), skin = mat('#d9a98a'), steel = mat('#23272c');
  const part = (parent, material, w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z); m.castShadow = true;
    parent.add(m);
    return m;
  };
  const root = new THREE.Group(), upper = new THREE.Group(), legL = new THREE.Group(), legR = new THREE.Group();
  upper.position.y = legL.position.y = legR.position.y = HIP;
  legL.position.x = -0.12; legR.position.x = 0.12;
  part(legL, legs, 0.18, HIP, 0.2, 0, -HIP / 2, 0); part(legR, legs, 0.18, HIP, 0.2, 0, -HIP / 2, 0);
  part(upper, coat, 0.48, 0.62, 0.27, 0, 0.31, 0);
  part(upper, accent, 0.5, 0.11, 0.29, 0, 0.6, 0); // scarf
  part(upper, skin, 0.25, 0.26, 0.25, 0, 0.8, 0);
  part(upper, accent, 0.29, 0.1, 0.33, 0, 0.95, -0.02); // cap
  for (const s of [-1, 1]) part(upper, coat, 0.13, 0.5, 0.13, s * 0.3, 0.42, -0.2).rotation.x = -1.25;
  part(upper, steel, 0.07, 0.1, 0.74, 0.1, 0.4, -0.5);
  const keg = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.36, 10), mat('#8a5a2e'));
  keg.position.set(0, 0.36, 0.24); keg.castShadow = true;
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#ffd9a0', blending: THREE.AdditiveBlending, depthWrite: false }));
  flash.position.set(0.1, 0.4, -0.95); flash.scale.setScalar(0.7);
  const tagMap = label(name, look.accent, 64, '700');
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagMap, depthTest: false, transparent: true, opacity: 0.9 }));
  tag.position.y = 2.15; tag.scale.set(0.22 * tagMap.userData.aspect, 0.22, 1);
  upper.add(keg, flash);
  root.add(upper, legL, legR, tag);
  return { root, upper, legL, legR, keg, flash, tag, stride: 0, fall: 0 };
}

export function buildActors(scene, state, tex) {
  const figures = state.actors.map((a) => {
    const f = figure(LOOKS[a.team], a.name);
    f.flash.material.map = tex.star;
    scene.add(f.root);
    return f;
  });

  return {
    /** Where a body's muzzle is in the world, for tracers that start at the gun. */
    muzzle(a, out) {
      const sin = Math.sin(a.yaw), cos = Math.cos(a.yaw);
      return out.set(a.x - sin * 0.85 + cos * 0.1, a.y + 1.27 - a.duck * 0.45, a.z - cos * 0.85 - sin * 0.1);
    },
    update(st, alpha, dt) {
      const view = st.actors[st.viewId];
      for (const a of st.actors) {
        const f = figures[a.id], r = f.root;
        r.visible = (a.alive || a.deadT < 6) && !(a.id === st.viewId && a.alive);
        if (!r.visible) continue;
        r.position.set(a.px + (a.x - a.px) * alpha, a.py + (a.y - a.py) * alpha, a.pz + (a.z - a.pz) * alpha);
        r.rotation.y = a.yaw;
        f.fall = a.alive ? 0 : Math.min(1, f.fall + dt * 3.2); // the dead tip over backwards and lie there
        r.rotation.x = f.fall * 1.45; r.position.y += f.fall * 0.14;
        const speed = Math.hypot(a.vx, a.vz), swing = a.alive ? Math.min(1, speed / 3.5) * 0.75 : 0;
        f.stride += speed * dt * 1.7;
        f.legL.rotation.x = Math.sin(f.stride) * swing - a.duck * 0.9; f.legR.rotation.x = -Math.sin(f.stride) * swing + a.duck * 0.5;
        f.upper.position.y = HIP - a.duck * 0.46; f.legL.position.y = f.legR.position.y = HIP - a.duck * 0.46;
        f.legL.scale.y = f.legR.scale.y = 1 - a.duck * 0.5;
        f.upper.rotation.x = a.alive ? a.pitch * 0.55 : 0;
        f.keg.visible = a.hasKeg;
        f.flash.visible = a.alive && a.sinceShot < 0.045;
        f.flash.material.rotation = a.shots * 1.3;
        f.tag.visible = a.alive && a.team === view.team && Math.hypot(a.x - view.x, a.z - view.z) > 3;
      }
    },
  };
}
