// Dev tool: screenshot the scoped view. usage: node scope.mjs c r yaw
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [c = '34', r = '22', yaw = '0'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
await page.goto((process.env.BASE || 'http://localhost:8124') + '/?sharp=1&watch=1&seed=5', { waitUntil: 'load' });
await page.waitForTimeout(2500);
await page.evaluate(([c, r, yaw]) => {
  const g = window.campanile, s = g.state, a = s.actors[0];
  g.skip(8); a.bot = null; g.hold = false;
  a.x = a.px = (c - 20 + 0.5) * 2; a.z = a.pz = (r - 14 + 0.5) * 2; a.cmd.yaw = a.yaw = yaw; a.cmd.pitch = a.pitch = 0.02; a.cmd.mx = a.cmd.mz = 0; a.cmd.fire = false;
  a.slots[0] = 'meridian'; a.mag[0] = 5; a.res[0] = 15; a.slot = 0; a.scoped = true; a.swap = 0;
}, [+c, +r, +yaw]);
await page.waitForTimeout(1200);
await page.screenshot({ path: '/root/makefun/shots/scope.jpg', type: 'jpeg', quality: 80 });
console.log(JSON.stringify({ logs }));
await browser.close();
