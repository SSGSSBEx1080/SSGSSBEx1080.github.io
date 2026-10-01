/* Optional end-to-end smoke test for №24 with a local server on port 8080.
   PLAYWRIGHT_MODULE may point to a separate installation. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = (process.env.SCOOTER_BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '') + '/pages/24-scooter/index.html';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
      await page.goto(url);
      assert.ok(await page.locator('.sc-rider img').evaluate(img => img.complete && img.naturalWidth > 500));
      assert.ok(await page.locator('#adv').evaluate(el => el.compareDocumentPosition(document.querySelector('#garage')) & Node.DOCUMENT_POSITION_PRECEDING));
      await page.locator('#getScooter').click();
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('zm:p24.adv'))), ['scooter_craft']);
      await page.locator('#surfaceList [data-surface=honey]').click();
      assert.equal(await page.locator('#surfaceTag').textContent(), 'ПОКРЫТИЕ / МЁД');
      assert.equal(await page.locator('#surfaceList [data-surface=honey]').getAttribute('aria-pressed'), 'true');
      await page.locator('#surfaceList [data-surface=slime]').click();
      await page.locator('#grade').selectOption('down');
      await page.locator('#track h2').click();
      await page.keyboard.down('w');
      await page.waitForFunction(() => Number(document.querySelector('#speed').textContent) >= 101, { timeout: 15000 });
      await page.keyboard.up('w');
      assert.ok((await page.locator('#speed').textContent()).trim() !== '000');
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('zm:p24.adv'))), ['scooter_craft', 'speed_100']);
      await page.locator('#testWall').click();
      assert.match(await page.locator('#collisionNote').textContent(), /СЛИЗЬ: отскок/);
      assert.equal(await page.locator('#getScooter').isDisabled(), true);
      await page.locator('#testObsidian').click();
      assert.match(await page.locator('#collisionNote').textContent(), /разрушен/);
      assert.equal(await page.locator('#healthN').textContent(), '0 / 500');
      await page.locator('#getScooter').click();
      assert.equal(await page.locator('#healthN').textContent(), '500 / 500');
      await page.locator('#grade').selectOption('flat');
      await page.locator('#surfaceList [data-surface=asphalt]').click();
      await page.locator('#quickRide').click();
      assert.ok(Number((await page.locator('#meters').textContent()).replace(/\D/g, '')) >= 1500);
      assert.equal(await page.locator('#chargeN').textContent(), '90%');
      await page.locator('#getPort').click();
      assert.match(await page.locator('#advTxt').textContent(), /^3 \/ 3/);
      await page.locator('#charge').click();
      await page.waitForFunction(() => Number(document.querySelector('#chargeN').textContent.replace('%', '')) >= 91, { timeout: 6000 });
      await page.locator('#pack').click();
      assert.match(await page.locator('#rideLog').textContent(), /БЕЗ пассажиров/);
      await page.locator('#pax').evaluate(el => { el.value = '0'; el.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.locator('#pack').click();
      assert.match(await page.locator('#rideLog').textContent(), /предмет хранит заряд/);
      assert.equal(await page.locator('#getScooter').isEnabled(), true);
      assert.equal(await page.locator('#go').isDisabled(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`Scooter browser test: ${width}px, original model, 5 surfaces, collisions, 3/3 awards, charging, fold, no overflow/errors`);
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
