// Dusk over the harbour: a gradient sky with streaks of lit cloud and the first stars, the sun low over the
// sea, the light and fog that go with it,
// the water, and a far shore so the town sits somewhere.
import * as THREE from 'three';
import { PALETTE } from '../config.js';

/** The direction to the sun: low in the east-south-east, so the lanes get long raking shadows. */
export const SUN = new THREE.Vector3(0.7, 0.4, 0.34).normalize();

const SKY_VERTEX = 'varying vec3 dir; void main() { dir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const SKY_FRAGMENT = `
  uniform vec3 sun, horizon, low, high, zenith, glow;
  varying vec3 dir;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    vec3 d = normalize(dir);
    float h = max(d.y, 0.0);
    vec3 c = mix(horizon, low, smoothstep(0.0, 0.14, h));
    c = mix(c, high, smoothstep(0.1, 0.45, h));
    c = mix(c, zenith, smoothstep(0.4, 1.0, h));
    float s = max(dot(d, sun), 0.0);
    // Long streaks of cloud, lit warm on the side that faces the sun; a few stars where the sky is darkest.
    vec2 p = d.xz / (h + 0.14) * vec2(1.1, 3.0);
    float cloud = smoothstep(0.5, 0.78, noise(p) * 0.6 + noise(p * 2.3) * 0.3 + noise(p * 5.1) * 0.15) * smoothstep(0.03, 0.22, h);
    c = mix(c, mix(zenith * 0.9, glow, 0.2 + 0.7 * s * s), cloud * 0.7);
    c += step(0.9988, hash(floor(d.xz / (h + 0.3) * 190.0))) * smoothstep(0.3, 0.75, h) * (1.0 - cloud) * 0.8;
    c += glow * (pow(s, 6.0) * 0.35 + pow(s, 60.0) * 0.5 + smoothstep(0.9997, 0.99985, s) * 2.0 * (1.0 - 0.7 * cloud));
    c *= 1.0 - 0.25 * smoothstep(0.0, -0.3, d.y);
    gl_FragColor = vec4(c, 1.0);
  }`;

export function buildSky(scene) {
  const P = PALETTE, col = (hex) => ({ value: new THREE.Color(hex) });
  scene.fog = new THREE.FogExp2(P.fog, 0.0062);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT,
    uniforms: { sun: { value: SUN }, horizon: col(P.sky[0]), low: col(P.sky[1]), high: col(P.sky[2]), zenith: col(P.sky[3]), glow: col(P.sun) },
  }));
  scene.add(dome);

  scene.add(new THREE.HemisphereLight('#ffd6b4', '#6a6c9c', 1.7));
  const sun = new THREE.DirectionalLight(P.sun, 2.9);
  sun.position.copy(SUN).multiplyScalar(90);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const cam = sun.shadow.camera;
  cam.left = -50; cam.right = 50; cam.top = 42; cam.bottom = -42; cam.near = 10; cam.far = 190;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05;
  scene.add(sun);

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshPhongMaterial({ color: P.sea, specular: '#ffcf9a', shininess: 50 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(300, -0.9, 0);
  scene.add(sea);

  // The far shore: a headland of dark cones north and south of the bay, and a lighthouse on a rock.
  const far = new THREE.MeshLambertMaterial({ color: '#4a4468' });
  for (let i = 0; i < 14; i++) {
    const a = -2.4 + i * 0.36, r = 230 + (i % 3) * 30;
    const hill = new THREE.Mesh(new THREE.ConeGeometry(60 + (i % 4) * 18, 26 + (i * 7) % 30, 7), far);
    hill.position.set(Math.sin(a) * r - 40, 6, Math.cos(a) * r * (i % 2 ? 1 : -1));
    scene.add(hill);
  }
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.2, 16, 10), new THREE.MeshLambertMaterial({ color: '#f1e6d4' }));
  tower.position.set(120, 7, -38);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff0c0', fog: false }));
  lamp.position.set(120, 16, -38);
  const rock = new THREE.Mesh(new THREE.ConeGeometry(11, 5, 7), far);
  rock.position.set(120, 0, -38);
  scene.add(tower, lamp, rock);
}
