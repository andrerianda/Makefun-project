// Dev tool: how many meshes and triangles the level builds.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
page.on('pageerror', (e) => console.log('pageerror: ' + e.message));
await page.goto('http://localhost:8124/?sharp=1&watch=1&seed=5', { waitUntil: 'load' });
await page.waitForTimeout(1500);
const out = await page.evaluate(async () => {
  const THREE = await import('three'), { loadKit } = await import('/src/render/kit.js'), { makeTextures } = await import('/src/render/textures.js'), { buildLevel } = await import('/src/render/level.js');
  const scene = new THREE.Scene(), kit = await loadKit(['assets/kit.txt', 'assets/props.txt', 'assets/land.txt']);
  const t0 = performance.now();
  buildLevel(scene, makeTextures(), kit);
  let meshes = 0, tris = 0, lights = 0, points = 0; const big = [];
  scene.traverse((o) => { if (o.isMesh) { meshes++; const g = o.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); tris += n; if (n > 20000) big.push(Math.round(n)); } else if (o.isLight) lights++; else if (o.isPoints) points++; });
  return { meshes, tris: Math.round(tris), lights, points, big, buildMs: Math.round(performance.now() - t0) };
});
console.log(JSON.stringify(out));
await browser.close();
