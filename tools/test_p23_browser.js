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
      await page.locator('#czIn').fill('Привет, как дела?');
      assert.match(await page.locator('#czOut').innerText(), /Салам/);
      assert.equal(await page.locator('.mx-hero .mx-term-chat').count(), 0);
      assert.ok(await page.locator('#heroIcon img').evaluate(img => img.complete && img.naturalWidth > 500));
      await page.locator('#czToChat').click();
      assert.equal(await page.locator('#mxStage.focused[aria-modal=true]').count(), 1);
      await page.locator('.mx-modal.reg [data-x=save]').click();
      assert.equal(await page.locator('.mx-input').inputValue(), 'Привет, как дела?');
      for (let n = 0; n < 5; n++) {
        const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('zm:p23.max')).inboxWave);
        if (progress >= 5) break;
        await page.locator('#mxStoryNext').click();
      }
      const scene = await page.evaluate(() => JSON.parse(localStorage.getItem('zm:p23.max')));
      assert.equal(scene.inboxWave, 5);
      assert.deepEqual(scene.users.map((u) => u.id), ['p5', 'pd', 'pc', 'pv', 'pm']);
      assert.deepEqual([...new Set(scene.msgs.filter((m) => m.scene === 'intro').map((m) => m.from))], ['p5', 'pd', 'pc', 'pv', 'pm']);
      assert.ok(scene.msgs.filter((m) => m.from === 'p5' && m.scene === 'intro').every((m) => /42/.test(m.text)));
      assert.ok(scene.msgs.some((m) => m.from === 'pd' && /АЙ ЛОВ ДИКС/.test(m.text)));
      assert.ok(scene.msgs.some((m) => m.from === 'pm' && m.deleted));
      for (const name of ['5opka', 'Диор Армани', 'Чеченцы', 'Няша Кавай', 'Мама']) {
        await page.locator(`.mx-row[aria-label^="${name}"]`).click();
        await page.locator('.mx-who').click();
        assert.equal(await page.locator('.mx-modal.persona canvas').count(), 1);
        assert.match(await page.locator('.mx-modal.persona h3').innerText(), new RegExp(name));
        await page.locator('.mx-modal.persona [data-x=back]').click();
      }
      await page.locator('.mx-row[aria-label^="Няша Кавай"]').click();
      await page.locator('.mx-input').fill('мне нравится твой стрим');
      await page.locator('.mx-send').click();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('zm:p23.max')).msgs.some((m) => m.from === 'pv' && m.scene === 'reply'));
      for (const [name, id, text, expected] of [
        ['5opka', 'p5', 'Сколько тебе лет?', /42.*стар|стар.*42/i],
        ['Диор Армани', 'pd', 'Как звучит припев?', /дикс.*кокс/i],
        ['Чеченцы', 'pc', 'Давай заключим перемирие', /мир|рейд/i],
        ['Мама', 'pm', 'Мне грустно и тревожно', /слушаю|расскажи|важнее/i],
      ]) {
        await page.locator(`.mx-row[aria-label^="${name}"]`).click();
        await page.locator('.mx-input').fill(text);
        await page.locator('.mx-send').click();
        await page.waitForFunction(id => JSON.parse(localStorage.getItem('zm:p23.max')).msgs.some(m => m.from === id && m.scene === 'reply'), id);
        const last = await page.evaluate(id => JSON.parse(localStorage.getItem('zm:p23.max')).msgs.filter(m => m.from === id && m.scene === 'reply').at(-1).text, id);
        assert.match(last, expected, `${id} must react to the topic`);
      }
      const memories = await page.evaluate(() => JSON.parse(localStorage.getItem('zm:p23.max')).dialogue);
      for (const id of ['p5', 'pd', 'pc', 'pv', 'pm']) assert.ok(memories[id]?.lastTopic);
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
      console.log(`MAX browser test: ${width}px, 5 characters/profiles, 5/5 routes, persistent file, 15 notes, no errors`);
    }
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
