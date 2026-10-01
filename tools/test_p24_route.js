/* Source mass/terrain physics regression for the rebuilt Night Route. */
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=(process.env.SCOOTER_BASE_URL||'http://127.0.0.1:8765').replace(/\/$/,'')+'/pages/24-scooter/index.html';
(async()=>{const b=await chromium.launch({headless:true,args:['--no-sandbox']});try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);
 await p.locator('#takeScooter').click();await p.locator('#drive').click();await p.waitForTimeout(3200);
 const light=+(await p.locator('#hudSpeed').innerText());assert.ok(light>10&&light<=80,`Flat light speed ${light}`);
 await p.locator('#resetTrip').click();for(let i=0;i<4;i++)await p.locator('#addPassenger').click();
 assert.equal(await p.locator('#hudMass').innerText(),'34.0');await p.locator('#drive').click();await p.waitForTimeout(3200);
 const heavy=+(await p.locator('#hudSpeed').innerText());assert.ok(heavy>0&&heavy<light,`Heavy flat ${heavy} vs ${light}`);
 await p.locator('#resetTrip').click();await p.locator('[data-slope=climb]').click();await p.locator('#drive').click();await p.waitForTimeout(3200);
 const uphill=+(await p.locator('#hudSpeed').innerText());assert.ok(uphill<heavy,`Uphill ${uphill} vs ${heavy}`);
 await p.locator('#resetTrip').click();await p.locator('[data-slope=descent]').click();await p.locator('#drive').click();
 await p.waitForFunction(()=>+document.querySelector('#hudSpeed').textContent>=100,null,{timeout:20000});
 assert.match(await p.locator('#advTxt').innerText(),/2 \/ 3/);
 await p.reload();assert.match(await p.locator('#advTxt').innerText(),/2 \/ 3/);
 assert.deepEqual(errors,[]);console.log(`Terrain/mass physics: flat ${light}, heavy ${heavy}, uphill ${uphill}, downhill 100+, achievements saved: OK`);
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
