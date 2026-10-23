/* 23 October resource/design regression. Same optional browser env as the full suite. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const options={headless:true,args:['--no-sandbox']};
 if(process.env.SPARTICUZ_MODULE){const c=(await import(process.env.SPARTICUZ_MODULE)).default;options.executablePath=await c.executablePath();options.args=c.args.filter(x=>x!=='--single-process');}
 if(process.env.CHROMIUM_PATH)options.executablePath=process.env.CHROMIUM_PATH;
 const browser=await chromium.launch(options),ctx=await browser.newContext({viewport:{width:1440,height:1000}}),p=await ctx.newPage(),errors=[];
 p.setDefaultTimeout(20000);p.setDefaultNavigationTimeout(45000);
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 const base=(process.env.TEST_BASE_URL||'http://127.0.0.1:8765').replace(/\/$/,'');
 const go=async slug=>{await p.goto(base+'/pages/'+slug+'/',{waitUntil:'networkidle'});await p.addStyleTag({content:'html{scroll-behavior:auto!important}'});await p.evaluate(()=>document.fonts.ready);};
 const shot=async name=>{if(process.env.TEST_SCREENSHOTS){fs.mkdirSync(process.env.TEST_SCREENSHOTS,{recursive:true});await p.screenshot({path:path.join(process.env.TEST_SCREENSHOTS,name+'.png'),timeout:45000,animations:'disabled'});}};
 const data=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('zm:p23.max')));
 try{
  for(const width of [1440,768,375]){
   await p.setViewportSize({width,height:width===1440?1000:844});
   for(const [slug,title]of[['24-scooter','ЭЛЕКТРОСАМОКАТ'],['26-vacuum','ПЫЛЕСОС'],['27-chigur','АНТОНЧИГУР']]){
    await go(slug);assert.equal((await p.locator('h1').innerText()).replace(/\s/g,''),title);
    assert.equal(await p.locator('.zm-route').count(),0,'No guide inserted above the content');
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),slug+' horizontal overflow at '+width);
    if(slug==='24-scooter')assert.ok(await p.evaluate(()=>getComputedStyle(document.body).backgroundColor==='rgb(9, 15, 19)'));
    if(width!==768)await shot(slug+'-'+width);
   }
  }
  await p.setViewportSize({width:1440,height:1000});await go('24-scooter');
  await p.waitForFunction(()=>window.P24Station?.signMounts?.length===2);
  const signs=await p.evaluate(()=>P24Station.signMounts);
  for(const sign of signs){assert.equal(sign.facing,'east');assert.equal(sign.attachment,-7/16);assert.ok(Math.abs(sign.center[0]-(-2.9375))<1e-7);assert.ok(Math.abs(sign.normal[0]-1)<1e-7);}
  await p.locator('#stationView').scrollIntoViewIfNeeded();await p.locator('#stationSign').click();await p.waitForTimeout(1100);await shot('station-sign');
  // Same source structure, photographed after correcting its mounts and night palette.
  if(process.env.UPDATE_STATION_PREVIEW){await p.locator('#stationReset').click();await p.waitForTimeout(1100);await p.addStyleTag({content:'.station-tools,#stationFocus{visibility:hidden!important}#station3d{outline:none!important}'});await p.locator('#station3d').screenshot({path:'assets/textures/p24/station_preview.png',timeout:45000});}
  await go('23-max');
  assert.deepEqual((await data()).users.map(x=>x.name),['5opka','Готка','Диор Армани','Чеченцы','Мама']);
  assert.equal(await p.locator('.mx-profile-shelf button').count(),5);
  for(const id of ['b1','b2','b3','b4','b5']){
   await p.locator(`[data-contact="${id}"]`).click();await p.waitForTimeout(650);
   const card=await p.locator('.mx-modal.prof').boundingBox();assert.ok(card.width>=360&&card.width<=510,'A full profile, not a collapsed grid column');
   assert.equal(await p.locator('.mx-modal.prof').getAttribute('role'),'dialog');
   assert.equal(await p.locator('.mx-profile-face canvas').count(),1);
   if(id==='b2')await shot('max-goth-profile');
   await p.keyboard.press('Escape');
  }
  await p.locator('#mxName').fill('Игрок');await p.locator('[data-x="save"]').click();
  for(const [id,name,text]of[['b1','5opka','42, братуха'],['b2','Готка','Как проходит стрим?'],['b3','Диор Армани','Когда второй трек?'],['b4','Чеченцы','Давай перемирие'],['b5','Мама','Я уже поел']]){
   await p.locator('.mx-row').filter({hasText:name}).click();const count=(await data()).msgs.filter(m=>m.from===id).length;
   await p.locator('.mx-input').fill(text);await p.locator('.mx-send').click();
   await p.waitForFunction(({id,count})=>JSON.parse(localStorage.getItem('zm:p23.max')).msgs.filter(m=>m.from===id).length>count,{id,count});
   assert.ok((await data()).talk[id].character,'Persona engine is active for '+name);
   await p.locator('.mx-open-profile').click();assert.match(await p.locator('.mx-profile-body h3').innerText(),new RegExp(name));await p.keyboard.press('Escape');
  }
  await p.setViewportSize({width:375,height:844});await p.locator('[data-contact="b2"]').click();await p.waitForTimeout(650);await shot('max-profile-mobile');
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.keyboard.press('Escape');
  const memory=(await data()).talk.b5;assert.equal(memory.character.flags.ate,true);await p.reload({waitUntil:'networkidle'});assert.equal((await data()).talk.b5.character.flags.ate,true);
  await p.setViewportSize({width:1440,height:1000});await go('27-chigur');
  await p.locator('[data-clip="speech_1"]').click();await p.waitForFunction(()=>P27Audio.state.active>0);
  const energy=await p.evaluate(async()=>{let peak=0;const a=new Float32Array(P27Audio.analyser.fftSize);for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,80));P27Audio.analyser.getFloatTimeDomainData(a);peak=Math.max(peak,[...a].reduce((n,x)=>n+x*x,0));}return peak;});
  assert.ok(energy>0,'The audio graph must output actual non-silent PCM, not only change a button');
  for(const clip of ['speech_1','speech_2','speech_3','speech_4','speech_5','speech_6','shot','reload','coin','airgun','step','vanish']){
   const signal=await p.evaluate(async name=>{const b=await P27Audio.load(name),samples=b.getChannelData(0);let peak=0;for(let i=0;i<samples.length;i++)peak=Math.max(peak,Math.abs(samples[i]));return{duration:b.duration,peak};},clip);
   assert.ok(signal.duration>.05&&signal.peak>.001,clip+' decodes to the original audible samples');
  }
  await p.locator('#soundToggle').click();assert.equal(await p.evaluate(()=>P27Audio.enabled),false);assert.equal(await p.evaluate(()=>P27Audio.state.active),0);
  await p.locator('#soundToggle').click();
  await p.locator('#weaponModel').scrollIntoViewIfNeeded();await p.locator('#weaponModel').focus();await p.keyboard.press('ArrowRight');assert.equal(await p.evaluate(()=>P27ItemViewer.angles[1]),82);
  await p.locator('#weaponModelReset').click();assert.equal(await p.evaluate(()=>P27ItemViewer.angles[1]),70);await shot('original-item-model');
  await p.locator('#unlockWeapon').click();assert.ok(await p.locator('#shotgunArt').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m11<0),'The illustrated muzzle must face the target to its right');
  await p.locator('#encounter').scrollIntoViewIfNeeded();await p.locator('[data-act="approach"]').click();await p.waitForFunction(()=>P27SCENE.state.phase==='close');
  assert.equal((await p.locator('h1').innerText()).replace(/\s/g,''),'АНТОНЧИГУР','Scene state must never replace the point title');
  assert.deepEqual(await p.evaluate(()=>P27Audio.state.errors),[]);
  // Safari-like codec support: use the converted original MP3, not silent failure.
  await p.addInitScript(()=>{const can=HTMLMediaElement.prototype.canPlayType;HTMLMediaElement.prototype.canPlayType=function(type){return type.includes('ogg')?'':can.call(this,type);};});
  await go('27-chigur');await p.locator('[data-episode="coin"]').click();await p.waitForFunction(()=>P27SCENE.state.phase==='coinSpeech',null,{timeout:18000});await p.waitForFunction(()=>P27Audio.state.last==='speech_2'&&P27Audio.state.active>0);assert.deepEqual(await p.evaluate(()=>P27Audio.state.errors),[]);
  assert.deepEqual(errors,[],errors.join('\n'));
  console.log('Revision browser: named heroes/no guide at 1440/768/375, physical sign mounts, 5 visible profiles + real replies, native item model, 12 audible buffers, mute and delayed MP3 scene playback: OK');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
