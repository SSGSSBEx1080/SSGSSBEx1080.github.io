/* PLAYWRIGHT_MODULE=/tmp/p15test/node_modules/playwright node tools/test_p15_facts.js */
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    for(const width of [1440,375]){
      const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('response',r=>r.status()>=400&&errors.push(`${r.status()} ${r.url()}`));
      await page.goto('http://127.0.0.1:8765/pages/15-hentai/',{waitUntil:'networkidle'});
      if(await page.locator('#gate').isVisible())await page.locator('#gateYes').click();
      assert.equal(await page.locator('#hbFactLab .hb-fact-card').count(),6);
      assert.equal(await page.locator('#fine').innerText().then(x=>/клиент|сервер/i.test(x)),false);
      await page.locator('#factRoll').click();assert.match(await page.locator('#factRollResult').innerText(),/Мемов|без мемов/);
      assert.equal(await page.locator('#factFaces .hb-fact-face').count(),6);
      await page.locator('#factPin').click();assert.equal(await page.locator('#factLockIcon').innerText(),'🔒');
      assert.equal(await page.locator('#factFaces .hb-fact-face b').count(),1);
      await page.locator('#factChance').click();assert.equal(await page.locator('#factChance').getAttribute('aria-pressed'),'true');
      assert.match(await page.locator('#factChanceResult').innerText(),/22,6%/);
      await page.locator('#factShuffle').click();assert.equal(await page.locator('#factSplitTiles .pron').count(),2);
      assert.equal(await page.locator('#factSplitTiles .hentai').count(),3);
      await page.locator('#factRemember').click();assert.match(await page.locator('#factRememberResult').innerText(),/Сохранённая грань вернулась/);
      await page.locator('#factLook').click();assert.match(await page.locator('#factLookResult').innerText(),/15 секунд/);
      assert.equal(await page.locator('#factLockIcon').innerText(),'🔒');
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
      assert.ok(overflow<=2,`horizontal overflow at ${width}: ${overflow}`);
      assert.deepEqual(errors,[]);
      await page.locator('#hbFactLab').scrollIntoViewIfNeeded();
      await page.screenshot({path:`/tmp/p15-facts-${width}.png`});
      console.log(`№15 ${width}px: six facts, mechanics, censored artwork, no JS/HTTP errors, overflow ${overflow}`);
      await page.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
