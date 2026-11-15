// The ten bodies, posed from the simulation each frame. Every body owns two rigs from the model kit, a
// smuggler's and a warden's: a crew changes sides at half-time and wears the kit of the side it plays.
import * as THREE from 'three';
import { NADES, SIDES } from '../config.js';
import { sideOf, overShoulder } from '../sim/state.js';
import { label } from './textures.js';

const MODELS = ['smuggler', 'warden'];

export function buildActors(scene, state, tex, kit) {
  const cloth = new THREE.MeshLambertMaterial({ vertexColors: true }), v = new THREE.Vector3();
  const rigs = state.actors.map((a) => {
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.star, color: '#ffd9a0', blending: THREE.AdditiveBlending, depthWrite: false }));
    return MODELS.map((model, side) => {
      const b = kit.build(model, cloth), map = label(a.name, SIDES[side].color, 64, '700');
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map, depthTest: false, transparent: true, opacity: 0.9 }));
      tag.position.y = 2.2; tag.scale.set(0.22 * map.userData.aspect, 0.22, 1);
      b.root.add(tag);
      b.gun.scale.setScalar(0.8); // the armoury is drawn long for first person
      scene.add(b.root);
      return { b, flash, tag, guns: {}, stride: 0, fall: 0 };
    });
  });

  /** A leg in a stride or a crouch: the thigh swings, the knee folds as the foot comes through. */
  const leg = (thigh, shin, phase, gait, lift, fold) => {
    thigh.rotation.x = Math.sin(phase) * 0.8 * gait + lift;
    shin.rotation.x = -0.12 - Math.max(0, Math.cos(phase)) * 1.3 * gait - fold;
  };
  /** A hand on a bone of the weapon: aim the arm at it, then bend the elbow to fit. */
  const reach = (b, arm, fore, at) => {
    b.torso.worldToLocal(at.getWorldPosition(v)).sub(arm.position);
    const bend = Math.acos(Math.min(1, v.length() / 0.6));
    arm.quaternion.setFromUnitVectors(arm.up, v.normalize().negate());
    arm.rotateX(-bend);
    fore.rotation.x = bend * 2;
  };

  return {
    /** Where a body's muzzle is in the world, for tracers that start at the gun. */
    muzzle: (a, out) => rigs[a.id][0].flash.getWorldPosition(out),
    update(st, alpha, dt) {
      const view = st.actors[st.viewId], unseen = overShoulder(st) ? -1 : st.viewId; // your own body shows only from behind it
      for (const a of st.actors) {
        const side = sideOf(st, a), f = rigs[a.id][side], b = f.b, r = b.root, id = a.slots[a.slot] || NADES[a.nadeSel].id;
        // A figure carries the model the player holds in first person, built when first needed.
        const g = f.guns[id] ||= kit.build(`fp_${id}`, cloth);
        if (g.root.parent !== b.gun) { b.gun.clear(); b.gun.add(g.root); g.root.position.copy(g.carry.position); g.tip.add(f.flash); }
        rigs[a.id][1 - side].b.root.visible = false;
        r.visible = (a.alive || a.deadT < 6) && !(a.id === unseen && a.alive);
        f.fall = a.alive ? 0 : Math.min(1, f.fall + dt * 3); // the dead tip over backwards and lie there
        r.position.set(a.px + (a.x - a.px) * alpha, a.py + (a.y - a.py) * alpha + f.fall * 0.16, a.pz + (a.z - a.pz) * alpha);
        r.rotation.set(f.fall * 1.45, a.yaw, 0, 'YXZ');
        const speed = Math.hypot(a.vx, a.vz), gait = a.alive ? Math.min(1, speed / 4) : 0, d = a.duck * (1 - f.fall);
        f.stride += speed * dt * 2.6;
        b.hips.position.y = 0.95 - d * 0.42 + Math.abs(Math.cos(f.stride)) * 0.03 * gait;
        leg(b.legL, b.shinL, f.stride, gait, d * 1.25 + f.fall * 0.3, d * 1.7 + f.fall * 0.7);
        leg(b.legR, b.shinR, f.stride + Math.PI, gait, d * 0.1, d * 1.55);
        // The torso stands side-on behind the weapon; the weapon follows the aim and the hands the weapon.
        b.torso.rotation.set(a.pitch * 0.4 - gait * 0.15 - d * 0.2, Math.sin(f.stride) * 0.1 * gait - 0.5, 0);
        b.head.rotation.set(a.pitch * 0.4 - 0.3, 0.5, -0.12, 'YXZ');
        b.gun.rotation.set(a.pitch * 0.6 + Math.max(0, 0.1 - a.sinceShot) + (a.reload > 0 ? 0.5 : 0), 0.58, 0, 'YXZ');
        if (g.root.visible = a.alive) {
          reach(b, b.armR, b.foreR, g.grip);
          reach(b, b.armL, b.foreL, a.reload > 0 && g.mag ? g.mag : g.fore);
        } else { b.armL.rotation.set(0, 0, -1.2); b.armR.rotation.set(0, 0, 0.9); } // arms flung wide
        if (b.keg) b.keg.visible = a.hasKeg;
        f.flash.visible = a.alive && a.sinceShot < 0.045;
        f.flash.material.rotation = a.shots * 1.3;
        f.tag.visible = a.alive && a.team === view.team && Math.hypot(a.x - view.x, a.z - view.z) > 3;
      }
    },
  };
}
