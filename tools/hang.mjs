// Dev tool: does the frame loop keep running after a skip and hold?
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
await page.goto('http://localhost:8124/?sharp=1&watch=1&seed=5', { waitUntil: 'load' });
await page.waitForTimeout(2000);
const t0 = Date.now();
const r = await page.evaluate(() => {
  const g = window.campanile, s = g.state; let n = 0;
  for (let t = 0; t < 80; t += 1 / 60) { g.skip(1 / 60); n++; if (s.match.phase === 'planted' && s.actors[s.viewId].alive) { g.hold = true; break; } }
  window.frames = 0; const tick = () => { window.frames++; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  return { steps: n, phase: s.match.phase, time: s.time };
});
console.log('skip took', Date.now() - t0, 'ms', JSON.stringify(r));
await page.waitForTimeout(4000);
console.log('frames in 4s:', await page.evaluate(() => window.frames), logs.join('\n'));
await browser.close();
