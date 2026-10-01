/* Regression for №24's faithful NBT diorama. Run after starting a static server:
   PLAYWRIGHT_MODULE=/path/to/playwright node tools/test_p24_station.js */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=path.resolve(__dirname,'..');
const ctx={ZM:{}};ctx.window=ctx;
vm.runInNewContext(fs.readFileSync(path.join(repo,'data/p24_station.js'),'utf8'),ctx);
const station=ctx.ZM.P24ST;
assert.equal(station.blocks.length,198);
assert.equal(station.signs.length,2);
assert.equal(station.signs.map(s=>s.lines.filter(Boolean).join(' ')).join('|'),'БЕНЗИНА НЕТ!|БЕНЗИНА НЕТ!');
const name=b=>station.palette[b[3]].name.split(':')[1];
assert.equal(station.blocks.filter(b=>name(b)==='charging_port').length,3);
assert.deepEqual([...new Set(station.blocks.filter(b=>name(b).endsWith('_stairs')).map(b=>station.palette[b[3]].props.facing))].sort(),['east','north','south','west']);
assert.equal(station.blocks.filter(b=>name(b)==='lantern'&&station.palette[b[3]].props.hanging==='true').length,1);
for(const face of ['front','side','top','bottom'])assert.ok(fs.readFileSync(path.join(repo,'assets/textures/p24','charging_port_'+face+'.png')).equals(fs.readFileSync(path.join(repo,'mod-src/textures/block','charging_port_'+face+'.png'))));
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 for(const width of [375,1440]){const p=await browser.newPage({viewport:{width,height:860}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>r.status()>=400&&errors.push(`${r.status()} ${r.url()}`));
  await p.goto((process.env.SCOOTER_BASE_URL||'http://127.0.0.1:8765')+'/pages/24-scooter/',{waitUntil:'networkidle'});
  await p.addStyleTag({content:'html{scroll-behavior:auto!important}'});
  assert.deepEqual(await p.evaluate(()=>[P24Station.count,P24Station.blocks,P24Station.signs]),[3,198,2]);
  await p.locator('#station3d').scrollIntoViewIfNeeded();
  await p.locator('[data-port="2"]').click();assert.match(await p.locator('#portIndex').innerText(),/03 ИЗ 03/);
  await p.locator('#stationSign').click();assert.match(await p.locator('#stationFocus').innerText(),/БЕНЗИНА НЕТ/);
  await p.locator('#stationLamp').click();assert.match(await p.locator('#stationFocus').innerText(),/ПОДВЕСНОЙ ФОНАРЬ/);
  await p.locator('#stationReset').click();assert.match(await p.locator('#stationFocus').innerText(),/198 БЛОКОВ/);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
  await p.close();
 }
 console.log('Station: exact NBT states, sign text, hanging lantern, source textures, 3D and mobile OK');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
