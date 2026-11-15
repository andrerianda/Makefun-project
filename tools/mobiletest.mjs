// Dev tool: drive the phone test page with touch events in an emulated landscape phone and report what the game did.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
await page.goto('http://localhost:8125/mobile/index.html?seed=5', { waitUntil: 'load' });
await page.waitForTimeout(4000);
const snap = () => page.evaluate(() => { const s = window.campanile.state, a = s.actors[0]; return { phase: s.match.phase, x: +a.x.toFixed(2), z: +a.z.toFixed(2), yaw: +a.yaw.toFixed(3), pitch: +a.pitch.toFixed(3), mag: a.mag[a.slot], slot: a.slot, duck: +a.duck.toFixed(2), money: a.money, slots: a.slots.join(','), locked: !!document.pointerLockElement, menu: getComputedStyle(document.getElementById('menu')).display, touch: getComputedStyle(document.getElementById('touch')).display, shop: getComputedStyle(document.getElementById('shop')).display, inner: innerWidth + 'x' + innerHeight }; });
const out = {};
out.start = await snap();
await page.locator('#deploy').tap();
await page.waitForTimeout(600);
out.afterDeploy = await snap();
// Buy in the freeze: open the counter, tap the Jerkin row.
await page.locator('#touch button', { hasText: 'BUY' }).tap(); await page.waitForTimeout(700);
out.shopOpen = (await snap()).shop;
await page.locator('#shopRows .row[data-id="jerkin"]').tap(); await page.waitForTimeout(900);
out.afterBuy = await snap();
await page.locator('#touch button', { hasText: 'BUY' }).tap(); await page.waitForTimeout(400);
await page.evaluate(() => window.campanile.skip(7.5)); // past the freeze
const touch = (type, id, x, y) => page.evaluate(([type, id, x, y]) => {
  const el = document.getElementById('touch'), t = new Touch({ identifier: id, target: el, clientX: x, clientY: y });
  el.dispatchEvent(new TouchEvent(type, { changedTouches: [t], touches: type === 'touchend' ? [] : [t], bubbles: true, cancelable: true }));
}, [type, id, x, y]);
const padC = await page.evaluate(() => { const r = document.querySelector('#touch .pad').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
const before = await snap();
await touch('touchstart', 1, padC[0], padC[1]); await touch('touchmove', 1, padC[0], padC[1] - 70); // stick up = forward
await page.waitForTimeout(5000);
await touch('touchend', 1, padC[0], padC[1] - 70);
const moved = await snap();
out.forward = { dz: +(moved.z - before.z).toFixed(2), dx: +(moved.x - before.x).toFixed(2) };
await touch('touchstart', 2, 900, 300); await touch('touchmove', 2, 1000, 280); await touch('touchend', 2, 1000, 280); // look right and up a little
await page.waitForTimeout(800);
const looked = await snap();
out.look = { dyaw: +(looked.yaw - moved.yaw).toFixed(3), dpitch: +(looked.pitch - moved.pitch).toFixed(3) };
await page.locator('#touch button.fire').tap(); await page.waitForTimeout(900);
out.fire = { magBefore: looked.mag, magAfter: (await snap()).mag };
await page.locator('#touch button', { hasText: 'CROUCH' }).tap(); await page.waitForTimeout(2500);
out.crouch = (await snap()).duck;
await page.locator('#touch button', { hasText: '2' }).first().tap(); await page.waitForTimeout(1500);
out.slotAfter2 = (await snap()).slot;
await page.screenshot({ path: '/root/makefun/shots/mobile.jpg', type: 'jpeg', quality: 80 });
await page.locator('#touch button', { hasText: 'PAUSE' }).tap(); await page.waitForTimeout(600);
out.paused = await snap();
console.log(JSON.stringify({ out, logs: logs.slice(0, 8) }, null, 1));
await browser.close();
