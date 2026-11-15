// Dev tool: measure how well kit models fill their collision boxes (see fit.html).
// usage: [CLIP=2] node fit.mjs "cart=1.5x1.3,fountain=1.9x0.7+0.5x1.9" [extra.txt ...]     (needs: node serve.mjs / 8127)
// CLIP is the height (model space) below which the silhouettes are measured.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const repo = process.env.REPO || '/home/user/Makefun-project';
const [spec, ...extra] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
const logs = [];
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
await page.goto(`http://localhost:8127${repo}/tools/fit.html?repo=${repo}&m=${encodeURIComponent(spec)}&extra=${extra.join(',')}&clip=${process.env.CLIP || 2}`, { waitUntil: 'load' });
await page.waitForFunction('window.done === true', null, { timeout: 30000 }).catch(() => logs.push('timeout'));
const result = await page.evaluate(() => window.result);
for (const [name, r] of Object.entries(result || {})) console.log(name.padEnd(12), JSON.stringify(r));
if (logs.length) console.log(logs.join('\n'));
await browser.close();
