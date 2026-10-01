/* End-to-end route completion: all three real 3D arches and profile record.
   Run after starting tools/serve.py 8080, with PLAYWRIGHT_MODULE set. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = (process.env.SCOOTER_BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '') + '/pages/24-scooter/index.html';
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    await page.locator('#scene.world-ready').waitFor({ timeout: 20000 });
    await page.locator('#gameHotbar [data-slot="1"]').click();
    await page.locator('#grade').selectOption('down');
    await page.locator('#surfaceList [data-surface=slime]').click();
    await page.keyboard.down('w');
    await page.waitForFunction(() => document.querySelector('#worldProgress').textContent.startsWith('3 / 3'), null, { timeout: 25000 });
    await page.keyboard.up('w');
    const best = await page.locator('#bestValue').textContent();
    assert.match(best, /^\d\d:\d\d\.\d$/);
    assert.notEqual(best, '00:00.0');
    assert.match(await page.locator('#worldQuest').textContent(), /МАРШРУТ ПРОЙДЕН/);
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('zm:p24.adv'))), ['scooter_craft', 'speed_100']);
    await page.locator('#worldReset').click();
    assert.equal(await page.locator('#timerValue').textContent(), '00:00.0');
    assert.equal(await page.locator('#bestValue').textContent(), best);
    await page.reload();
    await page.locator('#scene.world-ready').waitFor({ timeout: 20000 });
    assert.equal(await page.locator('#bestValue').textContent(), best, 'best survives reload in the same profile');
    assert.deepEqual(errors, []);
    console.log(`Scooter route: all 3 3D arches, time ${best}, speed achievement, reset and saved profile record: OK`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
