// Dev tool: run the bot match forward until a condition holds, then screenshot the real frame.
// usage: node scene.mjs <out.jpg> <seed> <maxSeconds> "<js predicate on (s, a)>" [w h] ["<js to run before the shot>"]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [out, seed, maxS, pred, w = '1280', h = '720', pre = ''] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.goto(`${process.env.BASE || 'http://localhost:8124'}/?sharp=1&watch=1&seed=${seed}`, { waitUntil: 'load' });
await page.waitForTimeout(2000);
const found = await page.evaluate(([maxS, pred, pre]) => {
  const g = window.campanile, s = g.state, test = new Function('s', 'a', `return (${pred});`);
  for (let t = 0; t < maxS; t += 1 / 60) { g.skip(1 / 60); if (test(s, s.actors[s.viewId])) { g.hold = true; if (pre) new Function('s', 'a', pre)(s, s.actors[s.viewId]); return { time: s.time, round: s.match.round, phase: s.match.phase, view: s.viewId }; } }
  return null;
}, [+maxS, pred, pre]);
await page.waitForTimeout(1500);
await page.screenshot({ path: out, type: 'jpeg', quality: 84, timeout: 180000 });
console.log(JSON.stringify({ found, logs: logs.slice(0, 8) }));
await browser.close();
