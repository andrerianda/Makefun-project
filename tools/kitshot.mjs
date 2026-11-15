// Dev tool: screenshot the kit preview. usage: node kitshot.mjs <out.jpg> "<query>" [w h]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [out, query, w = '1100', h = '520'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
await page.goto('http://localhost:8127' + (process.env.REPO || '/home/user/Makefun-project') + '/tools/preview.html?repo=' + (process.env.REPO || '/home/user/Makefun-project') + '&' + query, { waitUntil: 'load' });
await page.waitForFunction('window.done === true', null, { timeout: 20000 }).catch(() => logs.push('timeout'));
await page.screenshot({ path: out, type: 'jpeg', quality: 85 });
console.log(JSON.stringify({ out, logs: logs.slice(0, 6) }));
await browser.close();
