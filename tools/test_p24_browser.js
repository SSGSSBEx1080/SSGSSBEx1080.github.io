/* Browser regression: new Night Route, restored #22/#23, live branches across all points.
   Start a static server; set PLAYWRIGHT_MODULE and SCOOTER_BASE_URL as needed. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = (process.env.SCOOTER_BASE_URL || 'http://127.0.0.1:8765').replace(/\/$/, '');
(async()=>{
 const b=await chromium.launch({headless:true,args:['--no-sandbox']});
 const p=await b.newPage({viewport:{width:1440,height:900}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto(root+'/pages/24-scooter/index.html');
  assert.equal(await p.locator('#stationFacade .port').count(),3);
  assert.equal(await p.locator('#adv .zm-branch-node').count(),3);
  assert.equal(await p.locator('#journey').count(),1);
  assert.equal(await p.locator('#hero3d, #ride3d, #rideCanvas').count(),0);
  await p.locator('#takeScooter').click();
  assert.match(await p.locator('#advTxt').innerText(),/1 \/ 3/);
  await p.locator('#addPassenger').click();
  assert.equal(await p.locator('#hudMass').innerText(),'10.0');
  await p.locator('#roster input').fill('12'); await p.locator('#roster input').press('Tab');
  assert.equal(await p.locator('#hudMass').innerText(),'14.0');
  await p.locator('#roster input').fill('8'); await p.locator('#roster input').press('Tab');
  await p.locator('[data-slope=descent]').click(); await p.locator('#drive').click();
  await p.waitForFunction(()=>+document.querySelector('#hudSpeed').textContent>=100,null,{timeout:15000});
  assert.match(await p.locator('#advTxt').innerText(),/2 \/ 3/);
  await p.locator('#skipRoute').click(); assert.equal(await p.locator('#chargeHere').isEnabled(),true);
  await p.locator('#chargeHere').click();const before=Number((await p.locator('#terminalPct').innerText()).replace('%',''));
  await p.waitForTimeout(1600);const after=Number((await p.locator('#terminalPct').innerText()).replace('%',''));
  assert.ok(after>before,`Charging ${before} -> ${after}`);
  await p.locator('#stationFacade .port').last().click();assert.match(await p.locator('#portIndex').innerText(),/03 ИЗ 03/);
  await p.locator('#takePort').click();assert.match(await p.locator('#advTxt').innerText(),/3 \/ 3/);
  await p.locator('#adv .zm-branch-sync a').click();await p.waitForURL(/#tree\/24$/);
  assert.equal(await p.locator('#twTabs .on').getAttribute('data-tab-n'),'24');
  assert.match(await p.locator('#twPTxt').innerText(),/3 \/ 3/);
  const paths=await p.evaluate(()=>ZM.POINTS.filter(v=>v.page).map(v=>v.page));
  assert.equal(paths.length,25);
  for(const path of paths){
   await p.goto(root+'/'+path,{waitUntil:'domcontentloaded'});await p.waitForTimeout(70);
   const n=+path.match(/pages\/(\d\d)-/)[1];
   const panel=p.locator('#adv .zm-branch-sync, #tree .zm-branch-sync');
   assert.equal(await panel.count(),1,`No connected branch on ${path}`);
   assert.ok(await panel.locator('.zm-branch-node').count()>0,`No nodes on ${path}`);
   assert.match(await panel.locator('a').getAttribute('href'),new RegExp(`#tree/${n}$`));
  }
  // Ensure the two restored experiences, not the former local redesigns, are visible.
  await p.goto(root+'/pages/22-milk/index.html');assert.equal(await p.locator('#penView').count(),1);
  await p.goto(root+'/pages/23-max/index.html');assert.equal(await p.locator('#heroNotif').count(),1);
  assert.ok((await p.locator('#heroNotif').innerText()).length>0);
  await p.setViewportSize({width:375,height:812});await p.goto(root+'/pages/24-scooter/index.html');
  for(let i=0;i<4;i++)await p.locator('#addPassenger').click();
  assert.equal(await p.locator('#addPassenger').isDisabled(),true);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Night Route mobile horizontal overflow');
  if(process.env.SCOOTER_SCREENSHOT_DIR)await p.screenshot({path:process.env.SCOOTER_SCREENSHOT_DIR+'/night-route-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('Night Route + stations + 25 branches + restored #22/#23 + mobile: OK');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
