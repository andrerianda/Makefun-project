// Dev tool: frame rate and renderer stats in the headless browser. usage: node perf.mjs [third]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const logs = [];
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
await page.goto('http://localhost:8124/?sharp=1&watch=1&seed=5', { waitUntil: 'load' });
await page.waitForTimeout(2500);
await page.evaluate((third) => { const g = window.campanile; g.skip(9); g.state.third = !!third; window.frames = 0; const tick = () => { window.frames++; requestAnimationFrame(tick); }; requestAnimationFrame(tick); }, process.argv[2]);
await page.waitForTimeout(6000);
console.log('frames in 6s:', await page.evaluate(() => window.frames), logs.join(' '));
await browser.close();
