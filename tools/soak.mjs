// Dev tool: play a whole bot match in the browser in jumps, drawing frames between, and report any error.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
await page.goto(`${process.env.BASE || 'http://localhost:8124'}/?sharp=1&watch=1&seed=${process.argv[2] || 7}`, { waitUntil: 'load' });
await page.waitForTimeout(2500);
let last = null;
for (let i = 0; i < 400; i++) {
  last = await page.evaluate((i) => {
    const g = window.campanile, s = g.state;
    g.skip(4); s.third = i % 3 === 0;
    if (i % 5 === 0) g.hud.board.show(i % 10 === 0);
    return { round: s.match.round, phase: s.match.phase, score: s.match.score.join('-'), t: Math.round(s.time), drops: s.drops.filter((d) => d.live).length };
  }, i);
  await page.waitForTimeout(250);
  if (last.phase === 'final' || logs.length > 4) break;
}
console.log(JSON.stringify({ last, logs: logs.slice(0, 6) }));
await browser.close();
