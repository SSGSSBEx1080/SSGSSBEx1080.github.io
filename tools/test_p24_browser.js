/* Optional end-to-end smoke test for №24 with a local server on port 8080.
   PLAYWRIGHT_MODULE may point to a separate installation. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = (process.env.SCOOTER_BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '') + '/pages/24-scooter/index.html';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    for (const width of [1440, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
      await page.goto(url);
      await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
      await page.locator('#scene.world-ready').waitFor({ timeout: 20000 });
      assert.ok(await page.locator('.sc-rider img').evaluate(img => img.complete && img.naturalWidth > 500));
      assert.ok(await page.locator('#adv').evaluate(el => el.compareDocumentPosition(document.querySelector('#garage')) & Node.DOCUMENT_POSITION_PRECEDING));
      assert.equal(await page.locator('#gameHotbar button').count(), 9);
      const hotbarFits = await page.locator('#gameHotbar').evaluate(el => {
        const end = el.querySelector('[data-slot="9"]').getBoundingClientRect().right;
        return end <= el.getBoundingClientRect().right;
      });
      assert.ok(hotbarFits, `all nine slots should be visible at ${width}px`);
      assert.equal(await page.locator('#miniMap').count(), 1);
      assert.ok(await page.locator('#gameHotbar [data-slot="1"] img').evaluate(img => img.src.endsWith('/scooter_item.png') && img.complete && img.naturalWidth === 1024));
      assert.ok(await page.locator('.sc-port-display .sc-port-cube .face').count() === 6);
      await page.locator('#gameHotbar [data-slot="1"]').click();
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('zm:p24.adv'))), ['scooter_craft']);
      assert.equal(await page.locator('#getScooter').isDisabled(), true);
      await page.locator('#worldCam').click();
      assert.equal(await page.locator('#worldCrosshair').isVisible(), true);
      await page.locator('#gameHotbar [data-slot="9"]').click();
      assert.equal(await page.locator('#worldCrosshair').isVisible(), false);
      if (width === 1440) {
        await page.locator('#track h2').click();
        await page.keyboard.down('w');
        await page.waitForFunction(() => Number(document.querySelector('#worldProgress').textContent.charAt(0)) >= 1, null, { timeout: 18000 });
        assert.match(await page.locator('#worldCoords').textContent(), /XYZ/);
        assert.match(await page.locator('#timerValue').textContent(), /00:/);
        await page.waitForFunction(() => Number(document.querySelector('#healthN').textContent.split(' / ')[0]) < 500, null, { timeout: 12000 });
        await page.keyboard.up('w');
        assert.match(await page.locator('#collisionNote').textContent(), /КАМЕНЬ/);
      } else {
        const button = page.locator('#touchGo');
        await button.scrollIntoViewIfNeeded();
        const r = await button.boundingBox();
        await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
        await page.mouse.down();
        await page.waitForFunction(() => Number(document.querySelector('#worldCoords').textContent.split('·')[1]) < 26, null, { timeout: 9000 });
        await page.mouse.up();
      }
      await page.locator('#worldReset').click();
      assert.match(await page.locator('#worldCoords').textContent(), /0 · 28/);
      await page.keyboard.press('5');
      assert.equal(await page.locator('#surfaceTag').textContent(), 'ПОД КОЛЁСАМИ / МЁД');
      assert.equal(await page.locator('#surfaceList [data-surface=honey]').getAttribute('aria-pressed'), 'true');
      await page.locator('#gameHotbar [data-slot="4"]').click();
      const beforeWater = Number((await page.locator('#healthN').textContent()).split(' / ')[0]);
      await page.waitForFunction(old => Number(document.querySelector('#healthN').textContent.split(' / ')[0]) < old, beforeWater, { timeout: 10000 });
      await page.locator('#surfaceList [data-surface=slime]').click();
      await page.locator('#grade').selectOption('down');
      await page.locator('#grade').focus();
      await page.keyboard.down('w');
      await page.waitForFunction(() => Number(document.querySelector('#speed').textContent) > 3, null, { timeout: 7000 });
      await page.keyboard.up('w');
      await page.keyboard.press('g');
      assert.equal(await page.locator('#worldGrade').getAttribute('data-grade'), 'up');
      await page.keyboard.press('g'); await page.keyboard.press('g');
      assert.equal(await page.locator('#worldGrade').getAttribute('data-grade'), 'down');
      await page.locator('#worldReset').click();
      await page.locator('#track h2').click();
      await page.keyboard.down('w');
      await page.waitForFunction(() => Number(document.querySelector('#speed').textContent) >= 101, { timeout: 15000 });
      await page.keyboard.up('w');
      assert.ok((await page.locator('#speed').textContent()).trim() !== '000');
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('zm:p24.adv'))), ['scooter_craft', 'speed_100']);
      await page.locator('#testWall').click();
      assert.match(await page.locator('#collisionNote').textContent(), /СЛИЗЬ: отскок/);
      assert.equal(await page.locator('#getScooter').isDisabled(), true);
      await page.locator('#worldReset').click();
      await page.locator('#track h2').click();
      await page.keyboard.down('w');
      // Trigger the instant lab action in the same frame as the speed reading:
      // steering and collisions continue while the page is being scrolled.
      await page.waitForFunction(() => {
        if (Number(document.querySelector('#speed').textContent) < 85) return false;
        document.querySelector('#testObsidian').click(); return true;
      }, null, { timeout: 15000 });
      await page.keyboard.up('w');
      assert.match(await page.locator('#collisionNote').textContent(), /разрушен/);
      assert.equal(await page.locator('#healthN').textContent(), '0 / 500');
      await page.locator('#getScooter').click();
      assert.equal(await page.locator('#healthN').textContent(), '500 / 500');
      await page.locator('#grade').selectOption('flat');
      await page.locator('#surfaceList [data-surface=asphalt]').click();
      await page.locator('#quickRide').click();
      assert.match(await page.locator('#worldDistance').textContent(), /РАДИУСЕ/);
      assert.ok(Number((await page.locator('#meters').textContent()).replace(/\D/g, '')) >= 1500);
      assert.equal(await page.locator('#chargeN').textContent(), '90%');
      if (width === 1440) {
        // The 16px textured charging block can actually be clicked in 3D.
        await page.locator('#scene').scrollIntoViewIfNeeded();
        await page.waitForTimeout(1050); // allow the following camera to reach the parked scooter
        const canvas = await page.locator('#ride3d').boundingBox();
        await page.mouse.click(canvas.x + canvas.width * .595, canvas.y + canvas.height * .615);
        await page.waitForFunction(() => document.querySelector('#getPort').disabled, null, { timeout: 4000 });
      } else await page.locator('#getPort').click();
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
      console.log(`Scooter browser test: ${width}px, 3D block world, steering/touch, checkpoints, collisions, 5 surfaces, 3/3 awards, charge/fold, no errors`);
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
