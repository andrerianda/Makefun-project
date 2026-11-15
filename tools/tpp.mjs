// Dev tool: screenshot the third-person camera and try a radio order.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +(process.env.W || 960), height: +(process.env.H || 540) } });
const logs = [];
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
await page.goto((process.env.BASE || 'http://localhost:8124') + '/?sharp=1&watch=1&seed=5', { waitUntil: 'load' });
await page.waitForTimeout(2500);
const out = await page.evaluate(() => {
  const g = window.campanile, s = g.state;
  g.skip(9); s.third = true;
  s.actors[0].cmd.order = 'B'; g.skip(0.1);
  const c = s.coach[0];
  return { go: c.go, site: c.site, phase: s.match.phase, jobs: c.jobs.map((j) => j.site).join('') };
});
await page.waitForTimeout(1500);
await page.screenshot({ path: '/root/makefun/shots/tpp.jpg', type: 'jpeg', quality: 80 });
console.log(JSON.stringify({ out, logs }));
await browser.close();
