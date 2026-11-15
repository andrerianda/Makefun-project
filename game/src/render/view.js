// The camera and the frame. Reads the simulation, never writes it: the world is drawn from interpolated
// positions between the last two fixed steps, then the weapon is drawn on top.
import * as THREE from 'three';
import { WEAPONS } from '../config.js';
import { drain, sideOf, overShoulder } from '../sim/state.js';
import { eyeHeight, rayWorld } from '../sim/world.js';
import { makeTextures } from './textures.js';
import { buildLevel } from './level.js';
import { buildSky } from './sky.js';
import { buildActors } from './actors.js';
import { buildEffects } from './effects.js';
import { buildViewmodel } from './viewmodel.js';

const FOV = 74, BACK = 2.7, SIDE = 0.6; // third person: the camera sits this far behind and beside the eye

export function createView(host, state, kit) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.autoClear = false;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(FOV, 1, 0.08, 900);
  camera.rotation.order = 'YXZ';
  const tex = makeTextures();
  buildSky(scene);
  const town = buildLevel(scene, tex, kit);
  const actors = buildActors(scene, state, tex, kit), effects = buildEffects(scene, tex, actors, camera, kit), gun = buildViewmodel(tex, kit);
  let cursor = state.events.seq, fov = FOV, shake = 0, aspect = 1;

  const resize = () => {
    const w = host.clientWidth || window.innerWidth, h = host.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    aspect = w / h;
  };
  window.addEventListener('resize', resize);
  resize();

  return {
    canvas: renderer.domElement,
    /** Draw one frame; `alpha` is how far the clock is between the last simulation step and the next. */
    frame(st, alpha, dt) {
      const a = st.actors[st.viewId];
      cursor = drain(st, cursor, (e) => {
        effects.event(e, st);
        if ((e.type === 'boom' && e.n === 0) || e.type === 'kegBoom') shake = Math.max(shake, 2.5 / (1 + Math.hypot(e.x - a.x, e.z - a.z) * 0.15));
        if (e.type === 'hurt' && e.a === st.viewId) shake = Math.max(shake, 0.25);
      }, 0.15);
      shake = Math.max(0, shake - dt * 3);
      const w = a.slot === 3 ? null : WEAPONS[a.slots[a.slot]];
      fov += ((a.scoped && w && w.scopeFov ? w.scopeFov : FOV) - fov) * Math.min(1, dt * 14);
      camera.fov = fov; camera.aspect = aspect; camera.updateProjectionMatrix();
      const jitter = shake * 0.02;
      const ex = a.px + (a.x - a.px) * alpha, ey = a.py + (a.y - a.py) * alpha + (a.alive ? eyeHeight(a) : 0.35), ez = a.pz + (a.z - a.pz) * alpha;
      const third = overShoulder(st);
      camera.position.set(ex, ey, ez);
      camera.rotation.set(a.pitch + a.punchP * 0.6 + Math.sin(st.time * 47) * jitter, a.yaw + a.punchY * 0.6 + Math.cos(st.time * 53) * jitter, a.alive ? 0 : 0.5);
      if (third) {
        // Over the shoulder: back along the aim until a wall is in the way, then turned to look at the point
        // the muzzle is on, so the crosshair still marks where the round lands.
        const cp = Math.cos(a.pitch), dx = -Math.sin(a.yaw) * cp, dy = Math.sin(a.pitch), dz = -Math.cos(a.yaw) * cp;
        const ox = Math.cos(a.yaw) * SIDE - dx * BACK, oy = 0.3 - dy * BACK, oz = -Math.sin(a.yaw) * SIDE - dz * BACK, len = Math.hypot(ox, oy, oz);
        const k = Math.max(0.1, rayWorld(ex, ey, ez, ox / len, oy / len, oz / len, len + 0.3) - 0.3) / len, aim = Math.max(4, rayWorld(ex, ey, ez, dx, dy, dz, 80));
        camera.position.set(ex + ox * k, ey + oy * k, ez + oz * k);
        camera.lookAt(ex + dx * aim, ey + dy * aim, ez + dz * aim);
      }
      actors.update(st, alpha, dt);
      effects.update(st, dt);
      town(st.time);
      renderer.clear();
      renderer.render(scene, camera);
      if (a.alive && !a.scoped && !third) {
        gun.update(a, sideOf(st, a), dt, aspect);
        renderer.clearDepth();
        renderer.render(gun.scene, gun.camera);
      }
    },
  };
}
