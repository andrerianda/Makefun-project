// The weapon in your hands: the kit's first-person models in a scene of their own, drawn over the world so
// they never poke through a wall, and animated from the simulation's numbers (speed, recoil, reload, swap).
import * as THREE from 'three';
import { NADES, WEAPONS } from '../config.js';

const REST = new THREE.Vector3(0.19, -0.2, -0.5);

export function buildViewmodel(tex, kit) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(52, 1, 0.01, 5);
  scene.add(new THREE.HemisphereLight('#fff0dc', '#8a8cb8', 2.4));
  const key = new THREE.DirectionalLight('#ffd9a0', 2.6);
  key.position.set(-0.6, 1.2, 0.9);
  scene.add(key);
  const metal = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.25, roughness: 0.55 });
  const rig = new THREE.Group(), guns = {};
  for (const id of [...Object.keys(WEAPONS), ...NADES.map((n) => n.id)]) {
    const b = guns[id] = kit.build(`fp_${id}`, metal, false);
    b.root.visible = false;
    rig.add(b.root);
  }
  const hands = [0, 1].map((side) => kit.build(`fp_hand${side}`, metal, false)); // a smuggler's and a warden's
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.star, blending: THREE.AdditiveBlending, depthTest: false, transparent: true }));
  scene.add(rig);
  let held = '', bob = 0, lastYaw = 0, lastPitch = 0, swayX = 0, swayY = 0;

  return {
    scene, camera,
    update(a, side, dt, aspect) {
      const id = a.slot === 3 ? NADES[a.nadeSel].id : a.slots[a.slot], w = WEAPONS[id], b = guns[id];
      if (held !== id + side) { // a new weapon, or new sleeves at half-time: show it and move the hands onto it
        for (const k in guns) guns[k].root.visible = k === id;
        for (const h of hands) { h.handR.removeFromParent(); h.handL.removeFromParent(); }
        b.grip.add(hands[side].handR);
        if (b.fore) b.fore.add(hands[side].handL);
        b.tip.add(flash);
        held = id + side;
      }
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
      if (b.mag) b.mag.rotation.x = load * 0.9; // the magazine swings out as the weapon dips
      flash.visible = !!w && w.kind !== 'melee' && a.sinceShot < 0.04;
      flash.scale.setScalar(0.34 + (a.shots % 3) * 0.06);
      flash.material.rotation = a.shots * 2.1;
    },
  };
}
