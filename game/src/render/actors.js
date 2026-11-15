// The ten bodies, posed from the simulation each frame. Every body owns two rigs from the model kit, a
// smuggler's and a warden's: a crew changes sides at half-time and wears the kit of the side it plays.
import * as THREE from 'three';
import { SIDES } from '../config.js';
import { sideOf } from '../sim/state.js';
import { label } from './textures.js';

const HIP = 0.95, MODELS = ['smuggler', 'warden'];

export function buildActors(scene, state, tex, kit) {
  const cloth = new THREE.MeshLambertMaterial({ vertexColors: true });
  const rigs = state.actors.map((a) => MODELS.map((model, side) => {
    const b = kit.build(model, cloth);
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.star, color: '#ffd9a0', blending: THREE.AdditiveBlending, depthWrite: false }));
    flash.scale.setScalar(0.7);
    b.tip.add(flash);
    const map = label(a.name, SIDES[side].color, 64, '700');
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map, depthTest: false, transparent: true, opacity: 0.9 }));
    tag.position.y = 2.2; tag.scale.set(0.22 * map.userData.aspect, 0.22, 1);
    b.root.add(tag);
    b.root.visible = false;
    scene.add(b.root);
    return { b, flash, tag, stride: 0, fall: 0 };
  }));

  /** Legs for a stride and a crouch: a thigh swings from the hip, the shin folds back behind it. */
  const leg = (thigh, shin, swing, lift, duck) => {
    thigh.rotation.x = swing + duck * 1.1;
    shin.rotation.x = -(0.15 + lift) - duck * 1.9;
  };

  return {
    /** Where a body's muzzle is in the world, for tracers that start at the gun. */
    muzzle(a, out) {
      const sin = Math.sin(a.yaw), cos = Math.cos(a.yaw);
      return out.set(a.x - sin * 0.9 + cos * 0.13, a.y + 1.32 - a.duck * 0.42, a.z - cos * 0.9 - sin * 0.13);
    },
    update(st, alpha, dt) {
      const view = st.actors[st.viewId];
      for (const a of st.actors) {
        const side = sideOf(st, a), f = rigs[a.id][side], b = f.b, r = b.root;
        rigs[a.id][1 - side].b.root.visible = false;
        r.visible = (a.alive || a.deadT < 6) && !(a.id === st.viewId && a.alive);
        if (!r.visible) continue;
        f.fall = a.alive ? 0 : Math.min(1, f.fall + dt * 3); // the dead tip over backwards and lie there
        r.position.set(a.px + (a.x - a.px) * alpha, a.py + (a.y - a.py) * alpha + f.fall * 0.16, a.pz + (a.z - a.pz) * alpha);
        r.rotation.set(f.fall * 1.45, a.yaw, 0, 'YXZ');
        const speed = Math.hypot(a.vx, a.vz), gait = a.alive ? Math.min(1, speed / 4) : 0, d = a.duck * (1 - f.fall);
        f.stride += speed * dt * 1.9;
        const s = Math.sin(f.stride) * gait;
        b.hips.position.y = HIP - d * 0.42 + Math.abs(Math.cos(f.stride)) * 0.025 * gait;
        leg(b.legL, b.shinL, s * 0.75, Math.max(0, -s) * 0.9, d);
        leg(b.legR, b.shinR, -s * 0.75, Math.max(0, s) * 0.9, d * 0.8);
        // The upper body leans into a run, follows the aim up and down, and holds the weapon at the shoulder.
        b.torso.rotation.set(a.alive ? a.pitch * 0.4 - gait * 0.12 - d * 0.25 : 0.2, s * 0.08, 0);
        b.head.rotation.x = a.alive ? a.pitch * 0.35 : -0.4;
        const loading = a.reload > 0 ? 0.5 : 0, slack = f.fall * 0.6;
        b.armR.rotation.set(0.4 - slack, 0, -0.28); b.foreR.rotation.x = 1.3 - slack;
        b.armL.rotation.set(0.95 - loading - slack, 0, 0.5); b.foreL.rotation.x = 0.75 + loading - slack;
        if (b.keg) b.keg.visible = a.hasKeg;
        f.flash.visible = a.alive && a.sinceShot < 0.045;
        f.flash.material.rotation = a.shots * 1.3;
        f.tag.visible = a.alive && a.team === view.team && Math.hypot(a.x - view.x, a.z - view.z) > 3;
      }
    },
  };
}
