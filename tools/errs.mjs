// Dev tool: load the game and print console/page errors. usage: node errs.mjs [query]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
await page.goto((process.env.BASE || 'http://localhost:8124') + '/' + (process.argv[2] || '?sharp=1&watch=1&seed=3'), { waitUntil: 'load' });
await page.waitForTimeout(+(process.env.WAIT || 3000));
console.log(logs.slice(0, 12).join('\n') || 'no errors');
await browser.close();
