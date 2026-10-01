/* №26 regression: PLAYWRIGHT_MODULE=/tmp/p26test/node_modules/playwright PLAYWRIGHT_BROWSERS_PATH=/tmp/p26browsers node tools/test_p26.js */
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765';
for(const [src,asset] of [['mod-src/textures/item/vacuum.png','assets/textures/p26/vacuum.png'],['mod-src/textures/item/vacuum_icon.png','assets/textures/p26/vacuum_icon.png'],['mod-src/textures/gui/vacuum_gui.png','assets/textures/p26/vacuum_gui.png']])assert.ok(fs.readFileSync(path.join(root,src)).equals(fs.readFileSync(path.join(root,asset))),`original asset: ${asset}`);
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 for(const width of [1440,768,375]){
  const p=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1});const errors=[];
  p.on('pageerror',e=>errors.push('JS '+e.message));p.on('response',r=>r.status()>=400&&errors.push(r.status()+' '+r.url()));
  await p.goto(base+'/pages/26-vacuum/',{waitUntil:'networkidle'});
  await p.waitForFunction(()=>window.P26APP&&window.P26CHAMBER,{timeout:16000});
  await p.waitForTimeout(1000);
  const state=await p.evaluate(()=>({model:!!window.P26CHAMBER?.model.fan,particles:P26CHAMBER.count,range:P26APP.range(),branch:!!document.querySelector('.zm-branch-sync'),source:ZM.P26G.geo.bones.length,anim:Object.keys(ZM.P26G.anim),overflow:document.documentElement.scrollWidth-innerWidth,hero:document.querySelector('#heroVisual').classList.contains('model-ready')}));
  assert.equal(state.model,true);assert.equal(state.source,6);assert.equal(state.hero,true);assert.equal(state.branch,true);assert.ok(state.particles>=20);assert.deepEqual(state.anim,['idle','suck']);assert.ok(state.overflow<=1,`overflow ${width}px: ${state.overflow}`);
  if(width===1440){
   await p.screenshot({path:'/home/user/wiki/.cache/p26-hero.png'});
   await p.locator('#lab').scrollIntoViewIfNeeded();await p.waitForTimeout(400);
   await p.screenshot({path:'/home/user/wiki/.cache/p26-lab.png'});
   assert.deepEqual(await p.evaluate(()=>{const m=P26APP.state.mode;P26APP.state.mode='blocks';const a=P26APP.matches(P26APP.byId('dropper'));P26APP.state.mode='misc';const b=P26APP.matches(P26APP.byId('wheat')),c=P26APP.matches(P26APP.byId('dropper'));P26APP.state.mode=m;return[a,b,c]}),[false,true,true]);
   await p.locator('#soundOn').uncheck();await p.locator('#powerRange').fill('10');await p.locator('#suckBtn').click();
   await p.waitForTimeout(2600);
   assert.ok(await p.evaluate(()=>P26APP.state.caught)>=0);
   await p.locator('#spawnBtn').click();await p.locator('[data-mode="food"]').click();
   await p.locator('#harvestBtn').click();assert.match(await p.locator('#farmMessage').textContent(),/Срезано 12/);
   assert.equal(await p.locator('.crop.sprout').count(),12);
   await p.locator('#autoRecipe').click();assert.equal(await p.locator('#craftBtn').getAttribute('aria-disabled'),'false');
   await p.locator('#craftBtn').click();assert.ok((await p.evaluate(()=>ZM.store.get('p26.adv',[]))).includes('crafted'));
   await p.locator('[data-level="3"]').click();assert.ok((await p.evaluate(()=>ZM.store.get('p26.adv',[]))).includes('airuhan_3'));assert.equal(await p.evaluate(()=>P26APP.range()),25);
   for(let i=0;i<15;i++)await p.locator('#upgradeBtn').click();assert.equal(await p.locator('#capacityBig').textContent(),'177');assert.equal(await p.locator('#upgradeBtn').isDisabled(),true);
   await p.locator('#rowRange').fill('17');assert.match(await p.locator('#vaultRows').textContent(),/18–20/);
   await p.locator('#rowRange').fill('0');await p.evaluate(()=>P26APP.insert('diamond',65));assert.equal(await p.locator('.slot img').count()>=2,true);
   await p.locator('[data-specimen="B"]').click();assert.equal(await p.locator('#capacityBig').textContent(),'027');assert.equal(await p.locator('.slot img').count(),0);
   await p.evaluate(()=>P26APP.insert('bread',3));assert.equal(await p.locator('.slot img').count(),1);
   await p.locator('[data-specimen="A"]').click();assert.equal(await p.locator('#capacityBig').textContent(),'177');assert.ok((await p.locator('.slot img').count())>=2);
   await p.locator('[data-specimen="B"]').click();assert.equal(await p.locator('.slot img').count(),1);
   await p.locator('[data-specimen="A"]').click();assert.equal(await p.locator('#capacityBig').textContent(),'177');
   await p.locator('#transferBtn').click();await p.waitForTimeout(450);assert.ok(parseInt(await p.locator('#playerItems').textContent())>=65);
   await p.locator('#suckBtn').click();await p.evaluate(()=>{P26APP.state.maxSecs=59.97;P26APP.state.mode='food';P26APP.state.power=10;});await p.waitForTimeout(220);
   assert.ok((await p.evaluate(()=>ZM.store.get('p26.adv',[]))).includes('max_power_60s'));
   await p.locator('#storage').scrollIntoViewIfNeeded();await p.screenshot({path:'/home/user/wiki/.cache/p26-storage.png'});
   assert.equal(await p.locator('.zm-branch-count').textContent(),'3 / 3');
  }
  if(width===375)await p.screenshot({path:'/home/user/wiki/.cache/p26-mobile.png',fullPage:true});
  assert.deepEqual(errors,[],`${width}: ${errors.join('\n')}`);await p.close();console.log(`№26 ${width}px: WebGL source model, branch, assets, responsive OK`);
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
