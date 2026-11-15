// The camera and the frame. Reads the simulation, never writes it: the world is drawn from interpolated
// positions between the last two fixed steps, then the weapon is drawn on top.
import * as THREE from 'three';
import { WEAPONS } from '../config.js';
import { drain } from '../sim/state.js';
import { eyeHeight } from '../sim/world.js';
import { makeTextures } from './textures.js';
import { buildLevel } from './level.js';
import { buildSky } from './sky.js';
import { buildActors } from './actors.js';
import { buildEffects } from './effects.js';
import { buildViewmodel } from './viewmodel.js';

const FOV = 74;

export function createView(host, state) {
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
  buildLevel(scene, tex);
  const actors = buildActors(scene, state, tex), effects = buildEffects(scene, tex, actors, camera), gun = buildViewmodel(tex);
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
      camera.position.set(a.px + (a.x - a.px) * alpha, a.py + (a.y - a.py) * alpha + (a.alive ? eyeHeight(a) : 0.35), a.pz + (a.z - a.pz) * alpha);
      camera.rotation.set(a.pitch + a.punchP * 0.6 + Math.sin(st.time * 47) * jitter, a.yaw + a.punchY * 0.6 + Math.cos(st.time * 53) * jitter, a.alive ? 0 : 0.5);
      actors.update(st, alpha, dt);
      effects.update(st, dt);
      renderer.clear();
      renderer.render(scene, camera);
      if (a.alive && !a.scoped) {
        gun.update(a, dt, aspect);
        renderer.clearDepth();
        renderer.render(gun.scene, gun.camera);
      }
    },
  };
}
