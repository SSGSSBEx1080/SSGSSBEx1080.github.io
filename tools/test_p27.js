/* PLAYWRIGHT_MODULE=/tmp/p27test/node_modules/playwright node tools/test_p27.js */
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const hub=await browser.newPage();const hubErr=[];hub.on('pageerror',e=>hubErr.push(e.message));await hub.goto(base+'/index.html#points',{waitUntil:'networkidle'});
    assert.equal(await hub.locator('#pGrid .pc-27').getAttribute('href'),'pages/27-chigur/index.html');
    assert.ok(await hub.locator('#pGrid .pc-27 img').evaluate(img=>img.naturalWidth>0));
    await hub.locator('#ptFilter [data-f="live"]').click();assert.equal(await hub.locator('#pGrid .pc-27').count(),1);
    assert.deepEqual(hubErr,[]);console.log('Hub: №27 in points and Готовые');await hub.close();
    for(const width of [1440,375]){
      const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});const errors=[];
      page.on('pageerror',e=>errors.push('JS '+e.message));page.on('response',r=>r.status()>=400&&errors.push(`${r.status()} ${r.url()}`));
      await page.goto(base+'/pages/27-chigur/',{waitUntil:'networkidle'});await page.waitForTimeout(400);
      assert.equal(await page.locator('.fact').count(),6);assert.equal(await page.locator('#advList .adv-row').count(),5);
      assert.ok(await page.locator('.dialogue-portrait img').evaluate(x=>x.naturalWidth>0));
      await page.locator('#meetBtn').click();assert.ok((await page.evaluate(()=>ZM.store.get('p27.adv',[]))).includes('first_meeting'));
      await page.locator('[data-choice="0"]').click();assert.ok((await page.evaluate(()=>ZM.store.get('p27.adv',[]))).includes('dialogue_mistake'));
      await page.locator('#sleepBtn').click();assert.match(await page.locator('#sleepResult').innerText(),/ломает кровать/);
      assert.ok((await page.evaluate(()=>ZM.store.get('p27.adv',[]))).includes('night_visit'));
      for(let i=0;i<3;i++)await page.locator('#refuseBtn').click();assert.match(await page.locator('#witnessResult').innerText(),/Третий отказ/);
      await page.locator('#distance').fill('10');assert.equal(await page.locator('#damageValue').innerText(),'7');await page.locator('#distance').fill('2');assert.equal(await page.locator('#damageValue').innerText(),'67');
      await page.locator('#fireBtn').click();await page.waitForTimeout(500);await page.locator('#fireBtn').click();assert.equal(await page.locator('#targetHP').innerText(),'0 / 80');
      assert.ok((await page.evaluate(()=>ZM.store.get('p27.adv',[]))).includes('hunter'));
      await page.locator('[data-fact="anger"]').click();assert.equal(await page.locator('#factAnger').innerText(),'34 / 100');
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=2,`overflow ${width}: ${overflow}`);
      assert.deepEqual(errors,[],errors.join('; '));
      await page.locator('#top').scrollIntoViewIfNeeded();await page.screenshot({path:`/tmp/p27-hero-${width}.png`});
      await page.locator('#facts').scrollIntoViewIfNeeded();await page.screenshot({path:`/tmp/p27-facts-${width}.png`});
      console.log(`№27 ${width}px: models, 6 facts, 5 achievements, branches and weapon OK; overflow ${overflow}`);
      if(width===1440){await page.locator('#coin').scrollIntoViewIfNeeded();await page.locator('#standBtn').click();await page.waitForTimeout(10500);assert.equal(await page.locator('[data-side="heads"]').isEnabled(),true);await page.locator('[data-side="heads"]').click();await page.waitForTimeout(2200);assert.match(await page.locator('#coinResult').innerText(),/Угадал|Не угадал/);console.log('Coin: 10s stillness and 50/50 choice OK');}
      await page.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
