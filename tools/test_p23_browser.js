/* Optional end-to-end smoke test for №23. Run with a local HTTP server on port 8080.
   Install Playwright + its Chromium browser first; PLAYWRIGHT_MODULE can point to
   a separately installed copy without adding dependencies to this static site. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.MAX_BASE_URL || 'http://127.0.0.1:8080';
const url = base.replace(/\/$/, '') + '/pages/23-max/index.html';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, acceptDownloads: true });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(url);
      await page.locator('#heroDraft').fill('Привет, как дела?');
      assert.match(await page.locator('#heroAfter').innerText(), /Салам/);
      await page.locator('#heroDraft').press('Enter');
      assert.equal(await page.locator('#mxStage.focused[aria-modal=true]').count(), 1);
      await page.locator('.mx-modal.reg [data-x=save]').click();
      assert.equal(await page.locator('.mx-input').inputValue(), 'Привет, как дела?');
      await page.locator('#mxClose').click();
      await page.locator('[data-q=favorite]').click();
      await page.locator('.mx-input').fill('Заметка для себя');
      await page.locator('.mx-send').click();
      await page.locator('#mxClose').click();
      await page.locator('[data-q=chat]').click();
      await page.locator('.mx-send').click();
      assert.match(await page.locator('.mx-msg.own .mx-txt').last().innerText(), /Салам/);
      await page.locator('#mxClose').click();
      await page.locator('[data-q=gift]').click();
      await page.locator('.mx-gbtn [data-g="1"]').last().click();
      await page.locator('#mxClose').click();
      const choose = page.waitForEvent('filechooser');
      await page.locator('[data-q=file]').click();
      await (await choose).setFiles({ name: 'max-test.txt', mimeType: 'text/plain', buffer: Buffer.from('MAX browser test') });
      await page.locator('.mx-send').click();
      await page.waitForFunction(() => document.querySelector('.mx-status')?.textContent.includes('сохранён в браузере'));
      assert.equal(await page.locator('#mxQuestCount').innerText(), '5 / 5');
      await page.reload();
      await page.locator('#heroLaunch').click();
      await page.locator('.mx-row[aria-label="Избранное"]').click();
      const download = page.waitForEvent('download');
      await page.locator('.mx-fdl').last().click();
      assert.equal((await download).suggestedFilename(), 'max-test.txt');
      await page.locator('#mxClose').click();
      await page.locator('#mxNotesToggle').click();
      assert.equal(await page.locator('#notesBox details[open]').count(), 15);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`MAX browser test: ${width}px, 5/5 routes, persistent file, 15 notes, no errors`);
    }
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
