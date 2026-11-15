// Dev tool: park the camera at map cells and save a screenshot of each. usage: node tour.mjs name:c:r:yaw:pitch ...
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const W = +(process.env.W || 960), H = +(process.env.H || 540), Q = process.env.QUERY || '?sharp=1&watch=1&seed=3';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto((process.env.BASE || 'http://localhost:8124') + '/' + Q, { waitUntil: 'load' });
await page.waitForTimeout(2500);
for (const spec of process.argv.slice(2)) {
  const [name, c, r, yaw, pitch = '0'] = spec.split(':');
  await page.evaluate(([c, r, yaw, pitch]) => {
    const s = window.campanile.state, a = s.actors[0];
    a.bot = null; s.viewId = 0; a.alive = true; a.hp = 100;
    a.x = a.px = (c - 20 + 0.5) * 2; a.z = a.pz = (r - 14 + 0.5) * 2; a.y = a.py = 0; a.vx = a.vz = 0;
    a.cmd.yaw = a.yaw = yaw; a.cmd.pitch = a.pitch = pitch; a.cmd.mx = a.cmd.mz = 0; a.cmd.fire = false;
  }, [+c, +r, +yaw, +pitch]);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `/root/makefun/shots/${name}.jpg`, type: 'jpeg', quality: 80 });
}
console.log(JSON.stringify({ logs: logs.slice(0, 10) }));
await browser.close();
