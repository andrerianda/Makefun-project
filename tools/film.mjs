// Dev tool (not part of the entry): film the game frame by frame. The page's clock is replaced by a virtual one
// that advances 1/30 s per rendered frame, so the film is smooth however slowly software rendering draws.
// usage: node film.mjs <outDir> <seed> <startSeconds> <seconds> [w h]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [outDir, seed, startS, seconds, w = '960', h = '540'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const logs = [];
page.on('pageerror', (e) => logs.push(e.message));
await page.addInitScript(() => {
  const raf = window.requestAnimationFrame.bind(window);
  let vt = 0, pending = null;
  performance.now = () => vt;
  window.requestAnimationFrame = (cb) => { pending = cb; return 0; };
  window.__tick = () => new Promise((res) => raf(() => { vt += 1000 / 30; const c = pending; pending = null; if (c) c(vt); raf(() => res()); }));
});
await page.goto(`${process.env.BASE || 'http://localhost:8124'}/?sharp=1&watch=1&seed=${seed}`, { waitUntil: 'load' });
await page.waitForTimeout(2500);
await page.evaluate((s) => window.campanile.skip(s), +startS);
const frames = Math.round(+seconds * 30), t0 = Date.now();
for (let i = 0; i < frames; i++) {
  await page.evaluate(() => window.__tick());
  await page.screenshot({ path: `${outDir}/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 82 });
  if (i % 150 === 0) console.log(`frame ${i}/${frames} at ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
const end = await page.evaluate(() => { const s = window.campanile.state; return { time: s.time, round: s.match.round, phase: s.match.phase, score: s.match.score.join('-') }; });
console.log(JSON.stringify({ frames, end, logs: logs.slice(0, 5) }));
await browser.close();
