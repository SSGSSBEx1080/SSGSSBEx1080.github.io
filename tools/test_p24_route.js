/* №24 · 2D mass + slope test. Start a static server, then run with Playwright.
   SCOOTER_BASE_URL=http://127.0.0.1:8765 PLAYWRIGHT_MODULE=/path/to/playwright node tools/test_p24_route.js */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = (process.env.SCOOTER_BASE_URL || 'http://127.0.0.1:8765').replace(/\/$/, '') + '/pages/24-scooter/index.html';
(async () => {
 const browser = await chromium.launch({headless: true, args:['--no-sandbox']});
 try {
   const page = await browser.newPage(), errors = [];
   page.on('pageerror', e => errors.push(e.message)); await page.goto(url);
   await page.locator('#getScooter').click();
   await page.locator('[data-grade="flat"]').click(); await page.locator('#cruise').click();
   await page.waitForTimeout(3200); const lightFlat = +(await page.locator('#speed').innerText());
   assert.ok(lightFlat > 10 && lightFlat <= 80, `Flat, one rider: ${lightFlat}`);
   await page.locator('#rideReset').click();
   for (let i=0;i<4;i++) await page.locator('#addRider').click();
   assert.equal(await page.locator('#totalMass').innerText(), '34.0'); // 1 scooter + 1 player + 4×8 iron golems
   await page.locator('#cruise').click(); await page.waitForTimeout(3200);
   const heavyFlat = +(await page.locator('#speed').innerText());
   assert.ok(heavyFlat > 0 && heavyFlat < lightFlat, `Heavy flat ${heavyFlat} should move, but slower than light ${lightFlat}`);
   await page.locator('#rideReset').click(); await page.locator('[data-grade="up"]').click();
   await page.locator('#cruise').click(); await page.waitForTimeout(3200);
   const heavyUp = +(await page.locator('#speed').innerText());
   assert.ok(heavyUp < heavyFlat, `Heavy uphill ${heavyUp} must trail heavy flat ${heavyFlat} (four golems may stall)`);
   await page.locator('#rideReset').click(); await page.locator('[data-grade="down"]').click();
   await page.locator('#cruise').click(); await page.waitForFunction(() => +document.querySelector('#speed').textContent >= 100, null, {timeout:20000});
   assert.match(await page.locator('#advTxt').innerText(), /2 \/ 3/);
   await page.reload(); assert.match(await page.locator('#advTxt').innerText(), /2 \/ 3/, 'Achievements must survive reload');
   assert.deepEqual(errors, []);
   console.log(`Mass/terrain/achievements: light flat ${lightFlat}, heavy flat ${heavyFlat}, 100+ downhill, saved: OK`);
 } finally { await browser.close(); }
})().catch(e=>{ console.error(e); process.exitCode=1; });
