// Dev tool (not part of the entry): open a URL in headless Chromium, wait, optionally run JS, save a screenshot.
// usage: node shot.mjs <url> <out.png|jpg> [waitMs=3000] [evalJs] [width=1280] [height=720]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [url, out, waitMs = '3000', evalJs = '', w = '1280', h = '720'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${(e.stack || '').split('\n').slice(0, 4).join('\n')}`));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(+waitMs);
let result = null;
if (evalJs) { try { result = await page.evaluate(evalJs); } catch (e) { logs.push(`[eval] ${e.message}`); } }
await page.screenshot({ path: out, type: out.endsWith('.png') ? 'png' : 'jpeg', ...(out.endsWith('.png') ? {} : { quality: 86 }) });
console.log(JSON.stringify({ out, result, logs: logs.slice(0, 25) }, null, 1));
await browser.close();
