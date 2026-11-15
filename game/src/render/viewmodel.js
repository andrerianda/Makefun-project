// The weapon in your hands: small box models in their own scene, drawn over the world so they never poke
// through a wall, and animated from the simulation's numbers (speed, recoil, reload, swap).
import * as THREE from 'three';
import { TEAMS, WEAPONS } from '../config.js';

// Each model is a list of boxes: [material, width, height, depth, x, y, z, tilt]. The muzzle is at -z.
const MODELS = {
  rifle: { tip: -0.66, parts: [['steel', 0.07, 0.11, 0.42, 0, 0, -0.05], ['steel', 0.03, 0.03, 0.4, 0, 0.02, -0.45], ['wood', 0.076, 0.086, 0.27, 0, -0.005, -0.32], ['dark', 0.05, 0.2, 0.09, 0, -0.14, -0.03, 0.28], ['wood', 0.06, 0.1, 0.27, 0, -0.025, 0.29], ['dark', 0.045, 0.12, 0.06, 0, -0.1, 0.13, -0.3], ['steel', 0.014, 0.045, 0.014, 0, 0.076, -0.52], ['steel', 0.04, 0.03, 0.05, 0, 0.07, 0.08], ['accent', 0.078, 0.02, 0.05, 0, 0.04, -0.2]] },
  smg: { tip: -0.46, parts: [['steel', 0.068, 0.1, 0.34, 0, 0, -0.06], ['steel', 0.028, 0.028, 0.2, 0, 0.01, -0.33], ['dark', 0.045, 0.24, 0.06, 0, -0.16, -0.08], ['dark', 0.045, 0.12, 0.06, 0, -0.1, 0.1, -0.3], ['steel', 0.02, 0.03, 0.22, 0.03, 0.02, 0.22], ['accent', 0.072, 0.02, 0.05, 0, 0.04, -0.14]] },
  pistol: { tip: -0.26, parts: [['steel', 0.05, 0.065, 0.24, 0, 0.02, -0.12], ['dark', 0.045, 0.14, 0.065, 0, -0.07, -0.02, -0.25], ['steel', 0.012, 0.02, 0.012, 0, 0.062, -0.22], ['accent', 0.052, 0.014, 0.04, 0, 0.02, -0.05]] },
  shotgun: { tip: -0.7, parts: [['steel', 0.065, 0.09, 0.3, 0, 0, 0], ['steel', 0.034, 0.034, 0.5, 0, 0.022, -0.44], ['steel', 0.03, 0.03, 0.4, 0, -0.02, -0.4], ['wood', 0.07, 0.07, 0.2, 0, -0.022, -0.36], ['wood', 0.06, 0.1, 0.3, 0, -0.03, 0.29], ['accent', 0.068, 0.02, 0.05, 0, 0.035, 0.06]] },
  sniper: { tip: -0.86, parts: [['steel', 0.065, 0.1, 0.44, 0, 0, -0.04], ['steel', 0.026, 0.026, 0.6, 0, 0.012, -0.56], ['wood', 0.07, 0.09, 0.36, 0, -0.02, 0.3], ['dark', 0.06, 0.06, 0.3, 0, 0.1, -0.04], ['steel', 0.07, 0.07, 0.04, 0, 0.1, -0.2], ['dark', 0.045, 0.12, 0.06, 0, -0.1, 0.12, -0.3], ['accent', 0.068, 0.02, 0.05, 0, 0.03, -0.2]] },
  melee: { tip: 0, parts: [['blade', 0.012, 0.045, 0.24, 0, 0.02, -0.2], ['wood', 0.03, 0.04, 0.13, 0, 0.015, -0.02], ['steel', 0.05, 0.06, 0.015, 0, 0.02, -0.085]] },
  nade: { tip: 0, parts: [['accent', 0.075, 0.1, 0.075, 0, 0, -0.1], ['steel', 0.03, 0.035, 0.03, 0, 0.065, -0.1], ['dark', 0.078, 0.02, 0.078, 0, 0.01, -0.1]] },
};
const REST = new THREE.Vector3(0.2, -0.19, -0.48);

export function buildViewmodel(tex) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(52, 1, 0.01, 5);
  scene.add(new THREE.HemisphereLight('#fff0dc', '#8a8cb8', 2.6));
  const key = new THREE.DirectionalLight('#ffd9a0', 3);
  key.position.set(-0.6, 1.2, 0.9);
  scene.add(key);
  const std = (color, metalness, roughness) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const mats = { steel: std('#454c54', 0.3, 0.42), dark: std('#25282c', 0.1, 0.65), wood: std('#9a673c', 0, 0.75), accent: std('#ffffff', 0.1, 0.6), blade: std('#d3dbe0', 0.5, 0.25), sleeve: std('#ffffff', 0, 0.9), glove: std('#3a3532', 0, 0.9) };
  const box = (parent, m, w, h, d, x, y, z, tilt = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats[m]);
    mesh.position.set(x, y, z); mesh.rotation.x = tilt;
    parent.add(mesh);
  };
  const rig = new THREE.Group(), guns = {};
  for (const kind in MODELS) {
    const g = guns[kind] = new THREE.Group();
    for (const p of MODELS[kind].parts) box(g, ...p);
    box(g, 'glove', 0.07, 0.075, 0.1, 0.005, -0.1, 0.12); box(g, 'sleeve', 0.08, 0.08, 0.4, 0.02, -0.2, 0.34, 0.45); // right hand
    if (kind !== 'pistol' && kind !== 'melee' && kind !== 'nade') { box(g, 'glove', 0.07, 0.06, 0.1, 0, -0.075, -0.3); box(g, 'sleeve', 0.075, 0.075, 0.34, -0.02, -0.2, -0.18, 0.85); } // left, under the fore-end
    g.visible = false;
    rig.add(g);
  }
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.star, blending: THREE.AdditiveBlending, depthTest: false, transparent: true }));
  rig.add(flash);
  scene.add(rig);
  let bob = 0, lastYaw = 0, lastPitch = 0, swayX = 0, swayY = 0;

  return {
    scene, camera,
    update(a, dt, aspect) {
      const id = a.slot === 3 ? null : a.slots[a.slot], w = id ? WEAPONS[id] : null, kind = w ? w.kind : 'nade';
      const shape = kind === 'smg' || kind === 'pistol' || kind === 'shotgun' || kind === 'sniper' || kind === 'melee' || kind === 'nade' ? kind : 'rifle';
      for (const k in guns) guns[k].visible = k === shape;
      mats.accent.color.set(w ? TEAMS[a.team].color : ['#4c6b3a', '#e8e2d0', '#8fa3b0'][Math.max(0, a.nadeSel)]);
      mats.sleeve.color.set(a.team ? '#30466e' : '#6e4a33');
      mats.wood.color.set(id === 'tramont' ? '#3d4349' : '#9a673c');
      camera.aspect = aspect; camera.updateProjectionMatrix();
      // Bob with the stride, lag behind the mouse, kick with the shot, dip for a reload, rise on a swap.
      const speed = Math.min(1, Math.hypot(a.vx, a.vz) / 6);
      bob += dt * (4 + speed * 9);
      const dy = a.yaw - lastYaw, dp = a.pitch - lastPitch;
      lastYaw = a.yaw; lastPitch = a.pitch;
      swayX += (Math.max(-0.05, Math.min(0.05, dy * 0.6)) - swayX) * Math.min(1, dt * 9);
      swayY += (Math.max(-0.05, Math.min(0.05, dp * 0.6)) - swayY) * Math.min(1, dt * 9);
      const kick = Math.max(0, 1 - a.sinceShot / 0.11), load = w && a.reload > 0 ? Math.sin((1 - a.reload / w.reload) * Math.PI) : 0, swap = Math.min(1, a.swap / 0.4);
      rig.position.set(REST.x + Math.sin(bob) * 0.006 * speed + swayX, REST.y + Math.abs(Math.cos(bob)) * 0.008 * speed - a.duck * 0.015 - load * 0.17 - swap * 0.3 - swayY, REST.z + kick * 0.05);
      rig.rotation.set(kick * 0.07 + a.punchP * 0.5 - load * 0.75, swayX * 2 + 0.05, load * 0.35 - 0.04);
      flash.visible = !!w && w.kind !== 'melee' && a.sinceShot < 0.04;
      flash.position.set(0, 0.02, MODELS[shape].tip - 0.08);
      flash.scale.setScalar(0.34 + (a.shots % 3) * 0.06);
      flash.material.rotation = a.shots * 2.1;
    },
  };
}
