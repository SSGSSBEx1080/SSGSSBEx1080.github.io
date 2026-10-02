/* Smoke/regression for recently redesigned points. PLAYWRIGHT_MODULE=/tmp/p26test/node_modules/playwright PLAYWRIGHT_BROWSERS_PATH=/tmp/p26browsers node tools/test_recent_facts.js */
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const hub=await browser.newPage({viewport:{width:1440,height:850}}),hubErrors=[];
  hub.on('pageerror',e=>hubErrors.push(e.message));await hub.goto(base+'/index.html#points',{waitUntil:'networkidle'});
  await hub.waitForSelector('#pGrid .pc-26');
  assert.equal(await hub.locator('#pGrid .pc-26').getAttribute('href'),'pages/26-vacuum/index.html');
  assert.equal(await hub.locator('#pGrid .pc-26 img').evaluate(x=>x.naturalWidth>0),true);
  await hub.locator('#ptFilter [data-f="live"]').click();assert.equal(await hub.locator('#pGrid .pc-26').count(),1);
  assert.deepEqual(hubErrors,[]);console.log('Hub: №26 visible in #points and in the “Готовые” filter');await hub.close();
  const pages=[['23-max',23],['24-scooter',24],['25-cloaks',25],['26-vacuum',26]];
  for(const [slug,n] of pages)for(const width of [1440,375]){
   const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1});const errors=[];
   page.on('pageerror',e=>errors.push('JS '+e.message));page.on('response',r=>r.status()>=400&&errors.push(`${r.status()} ${r.url()}`));
   await page.goto(`${base}/pages/${slug}/`,{waitUntil:'networkidle',timeout:30000});await page.waitForTimeout(600);
   const count=n===24?await page.locator('.rf').count():n===26?await page.locator('.vf-card').count():n===23?await page.locator('.mx-fact-entry').count():await page.locator('.lg-fact').count();
   assert.ok(count>=5,`point ${n}: only ${count} facts`);
   if(n===23){await page.locator('[data-fact="2"]').click();await page.locator('[data-fact-action]').click();assert.match(await page.locator('.mx-fact-bubble').innerText(),/салам/);assert.ok(await page.locator('.mx-fact-portrait img').evaluate(x=>x.naturalWidth>0));}
   if(n===24){await page.locator('[data-rf-slope="descent"]').click();assert.match(await page.locator('#factRoadText').innerText(),/ограничение 80 снимается/);assert.equal(await page.locator('[data-slope="descent"]').getAttribute('aria-pressed'),'true');await page.locator('#factMileage').fill('7500');assert.match(await page.locator('#factMileageBattery').innerText(),/50%/);await page.locator('#factAddRider').click();assert.match(await page.locator('#factCrewText').innerText(),/2 из 5/);await page.locator('#factChargeBtn').click();await page.waitForTimeout(1150);assert.equal(await page.locator('#factCharge').innerText(),'41%');await page.locator('#factChargeBtn').click();}
   if(n===25){await page.locator('[data-lg-fact="2"]').click();assert.match(await page.locator('.lg-fact.ice .lg-fact-output').innerText(),/Ледяная капсула/);assert.ok(await page.locator('.lg-fact.ice img').evaluate(x=>x.naturalWidth>0));}
   if(n===26){await page.locator('#soundOn').uncheck();await page.locator('#factAddChest').click();assert.equal(await page.locator('#factCapacity').innerText(),'37');await page.locator('[data-fact-specimen="B"]').click();assert.equal(await page.locator('#factCapacity').innerText(),'27');await page.locator('[data-fact-wheat="misc"]').click();assert.match(await page.locator('#factWheatResult').innerText(),/пшеница тоже/);await page.locator('#factBlast').click();assert.match(await page.locator('#factBlastResult').innerText(),/Воздухан/);if(width===1440){await page.locator('#implosionBtn').click();await page.waitForTimeout(2300);assert.match(await page.locator('#outroStatus').innerText(),/Всё на месте/);}}
   assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('button,a')].filter(e=>e.getBoundingClientRect().width>0&&/[↗↘]/.test(e.textContent)).map(e=>e.textContent.trim()).slice(0,5)),[],`arrows on point ${n}`);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=2,`${n} ${width}px overflow ${overflow}`);
   assert.deepEqual(errors,[],`page ${n} ${width}: ${errors.join('; ')}`);
   if(width===1440){await page.locator('#notes, #details').first().scrollIntoViewIfNeeded();await page.screenshot({path:`/tmp/facts-${n}.png`});}
   if(width===375){await page.locator('#notes, #details').first().scrollIntoViewIfNeeded();await page.screenshot({path:`/tmp/facts-${n}-mobile.png`});}
   console.log(`№${n}: ${count} facts, interactive and ${width}px OK`);await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});