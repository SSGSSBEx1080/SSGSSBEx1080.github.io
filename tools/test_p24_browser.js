/* Live 2D simulator + source station + connected branches in every page.
   Run with a static server and Playwright. Set SCOOTER_BASE_URL / PLAYWRIGHT_MODULE if needed. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
 const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
 const page = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
 const errs = []; page.on('pageerror', e => errs.push(e.message));
 const root = (process.env.SCOOTER_BASE_URL || 'http://127.0.0.1:8765').replace(/\/$/, '');
 try {
  await page.goto(`${root}/pages/24-scooter/index.html`); await page.waitForSelector('#stationGrid .cell');
  assert.equal(await page.locator('#stationGrid .cell').count(), 110);
  assert.equal(await page.locator('#stationGrid button.port').count(), 3);
  assert.equal(await page.locator('.zm-branch-map [data-adv-key]').count(), 3);
  await page.locator('#getScooter').click();
  assert.match(await page.locator('#advTxt').innerText(), /1 \/ 3/);
  await page.locator('#addRider').click();
  await page.locator('#crewRows select').selectOption('iron_golem');
  assert.equal(await page.locator('#totalMass').innerText(), '10.0');
  await page.locator('[data-grade="down"]').click();
  await page.locator('#cruise').click();
  await page.waitForFunction(() => Number(document.querySelector('#speed').textContent) >= 100, { timeout: 18000 });
  assert.match(await page.locator('#advTxt').innerText(), /2 \/ 3/);
  await page.locator('#cruise').click();
  await page.locator('#quickTrip').click();
  assert.equal(await page.locator('#stationCharge').isEnabled(), true);
  await page.locator('#stationCharge').click();
  const charge1 = Number((await page.locator('#stationChargeN').innerText()).replace('%',''));
  await page.waitForTimeout(1500);
  const charge2 = Number((await page.locator('#stationChargeN').innerText()).replace('%',''));
  assert.ok(charge2 > charge1, `Charging did not increase: ${charge1} -> ${charge2}`);
  await page.locator('#getPort').click();
  assert.match(await page.locator('#advTxt').innerText(), /3 \/ 3/);
  await page.locator('[data-layer="4"]').click();
  assert.equal(await page.locator('#stationGrid .cell').count(), 110);
  await page.locator('[data-layer="1"]').click();
  await page.locator('#stationGrid button.port').nth(2).click();
  assert.match(await page.locator('#portLabel').innerText(), /03 ИЗ 03/);
  if (process.env.SCOOTER_SCREENSHOT_DIR) await page.screenshot({path:process.env.SCOOTER_SCREENSHOT_DIR + '/p24-desktop.png',fullPage:true});
  const branchLink = await page.locator('#adv .zm-branch-sync a').getAttribute('href');
  assert.match(branchLink, /#tree\/24$/);
  await page.goto(root + '/index.html#tree/24');
  await page.waitForSelector('#twTabs .on');
  assert.equal(await page.locator('#twTabs .on').getAttribute('data-tab-n'), '24');
  assert.match(await page.locator('#twPTxt').innerText(), /3 \/ 3/);
  assert.equal(await page.locator('#twChain [data-k]').count(), 3);
  // Runtime test across all 24 pages, not just presence of static markup.
  const paths = await page.evaluate(() => ZM.POINTS.filter(p => p.page).map(p => p.page));
  for (const path of paths) {
    await page.goto(root + '/' + path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(80);
    const n=+path.match(/pages\/(\d\d)-/)[1];
    const panel=page.locator('#adv .zm-branch-sync, #tree .zm-branch-sync');
    assert.equal(await panel.count(),1, `Branch missing: ${path}`);
    assert.ok((await panel.locator('.zm-branch-node').count()) >= 1, `Nodes missing: ${path}`);
    const link = await panel.locator('a').getAttribute('href');
    assert.match(link, new RegExp(`#tree/${n}$`));
    const box = await panel.boundingBox(); assert.ok(box && box.width > 200 && box.height > 80, `Branch not visible: ${path}`);
  }
  await page.setViewportSize({width:375,height:812});
  await page.goto(root + '/pages/24-scooter/index.html');
  await page.waitForSelector('#stationGrid .cell');
  const size = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  assert.ok(size[0] <= size[1] + 1, `Horizontal overflow ${size}`);
  if (process.env.SCOOTER_SCREENSHOT_DIR) await page.screenshot({path:process.env.SCOOTER_SCREENSHOT_DIR + '/p24-mobile.png',fullPage:true});
  assert.equal(errs.length, 0, errs.join('\n'));
  console.log('2D ride, actual masses, 3 NBT ports, charging, 24 live branches, deep link, mobile width: OK');
 } finally { await b.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
