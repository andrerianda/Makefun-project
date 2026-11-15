// The weapon in your hands: the kit's first-person models in a scene of their own, drawn over the world so
// they never poke through a wall, and animated from the simulation's numbers (speed, recoil, reload, swap).
import * as THREE from 'three';
import { NADES, WEAPONS } from '../config.js';

export function buildViewmodel(tex, kit) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(64, 1, 0.01, 5);
  const key = new THREE.DirectionalLight('#ffe2b8', 2.8);
  key.position.set(-0.7, 1.3, 0.8);
  const metal = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.15, roughness: 0.6 });
  const rig = new THREE.Group(), guns = {};
  // A side's hands, smuggler's or warden's, are one bone per hold: R<weapon> and L<weapon>.
  const hands = [0, 1].map((side) => kit.build(`fp_hand${side}`, metal, false));
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.star, blending: THREE.AdditiveBlending, depthTest: false, transparent: true }));
  scene.add(rig, key, new THREE.HemisphereLight('#fff4e6', '#7f86b0', 2.2));
  let held = '', R, L, bob = 0, lastYaw = 0, sway = 0;

  return {
    scene, camera,
    update(a, side, dt, aspect) {
      const id = a.slots[a.slot] || NADES[a.nadeSel].id, w = WEAPONS[id] || WEAPONS.knife, b = guns[id] ||= kit.build(`fp_${id}`, metal, false);
      if (held !== id + side) { // a new weapon, or new sleeves at half-time: this side's hands take hold of it
        rig.clear(); rig.add(b.root);
        if (R) R.removeFromParent();
        if (L) L.removeFromParent();
        b.grip.add(R = hands[side]['R' + id]);
        if (L = hands[side]['L' + id]) b.fore.add(L);
        b.tip.add(flash);
        held = id + side;
      }
      camera.aspect = aspect; camera.updateProjectionMatrix();
      // Bob with the stride, lag behind the mouse, kick with a shot and work the action, roll over for a reload.
      const speed = Math.min(1, Math.hypot(a.vx, a.vz) / 6);
      bob += dt * (4 + speed * 9);
      sway += (Math.max(-0.05, Math.min(0.05, (a.yaw - lastYaw) * 0.6)) - sway) * Math.min(1, dt * 9);
      lastYaw = a.yaw;
      const kick = Math.max(0, 1 - a.sinceShot / 0.12) * (0.4 + 9 * (w.kickP || 0)), cycle = Math.min(1, a.cool * w.rpm / 60);
      const load = a.reload > 0 ? Math.sin((1 - a.reload / w.reload) * Math.PI) : 0, roll = Math.min(1, load * 3), drop = Math.max(0, load * 2 - 1) * 0.4;
      const swap = Math.min(1, a.swap / 0.4);
      rig.position.set(Math.min(0.2, aspect * 0.14) + Math.sin(bob) * 0.006 * speed + sway, Math.abs(Math.cos(bob)) * 0.008 * speed - 0.18 - a.duck * 0.015 - roll * 0.04 - swap * 0.3, kick * 0.06 - 0.6);
      rig.rotation.set(0.01 + kick * 0.05 + a.punchP * 0.5 + roll * 0.1 - swap * 0.9, sway * 2 + 0.1 + roll * 0.08, -0.08 - roll * 0.6);
      if (b.act) b.act.position.copy(b.thru.position).multiplyScalar(Math.sin(Math.PI * cycle * cycle));
      if (b.clip) { b.clip.position.y = -drop; L.position.copy(b.mag.position).multiplyScalar(roll).y -= drop; }
      flash.visible = a.sinceShot < 0.04;
      flash.scale.setScalar(0.34 + (a.shots % 3) * 0.06);
      flash.material.rotation = a.shots * 2.1;
    },
  };
}
