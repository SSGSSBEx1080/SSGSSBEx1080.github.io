/* Browser regression for the 2026-10-22 scoped rework: ONLY #23/#24/#26/#27.
 * Start tools/serve.py, then:
 *   PLAYWRIGHT_MODULE=/path/to/playwright node tools/test_reworked_pages.js
 * Optional: TEST_BASE_URL, CHROMIUM_PATH, SPARTICUZ_MODULE, TEST_SCREENSHOTS.
 * Screenshots are never written to the repository by default.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = (process.env.TEST_BASE_URL || 'http://127.0.0.1:8765').replace(/\/$/, '');
const shots = process.env.TEST_SCREENSHOTS;
const points = (process.env.TEST_POINTS || '23,24,26,27,mobile').split(',');
if (shots) fs.mkdirSync(shots, { recursive:true });

(async () => {
  const options = { headless:true, args:['--no-sandbox', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
  if (process.env.CHROMIUM_PATH) options.executablePath = process.env.CHROMIUM_PATH;
  if (process.env.SPARTICUZ_MODULE) {
    const bundled = (await import(process.env.SPARTICUZ_MODULE)).default;
    options.executablePath = await bundled.executablePath(); options.args = bundled.args.filter(arg => arg !== '--single-process');
  }
  const browser = await chromium.launch(options);
  // One context/page also works with the serverless Chromium single-process build.
  const context = await browser.newContext({ viewport:{width:1440,height:1000}, hasTouch:true });
  const p = await context.newPage(), errors = [];
  p.setDefaultTimeout(12000);
  p.setDefaultNavigationTimeout(45000); // Source 3D assets can compile slowly in software-rendered CI.
  p.on('pageerror', error => errors.push(error.message));
  p.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  const go = async slug => {
    await p.goto(`${base}/pages/${slug}/`, { waitUntil:'networkidle' });
    await p.addStyleTag({ content:'html{scroll-behavior:auto!important}' });
  };
  const shot = async name => { if (shots) await p.screenshot({path:path.join(shots, name + '.png'), timeout:45000, animations:'disabled'}); };
  const store = key => p.evaluate(key => ZM.store.get(key, []), key);
  const max = () => p.evaluate(() => JSON.parse(localStorage.getItem('zm:p23.max')));
  const selectChat = name => p.locator('.mx-row').filter({hasText:name}).click();
  const submit = async text => { await p.locator('.mx-input').fill(text); await p.locator('.mx-send').click(); };
  const send = async (id, text) => {
    const count = (await max()).msgs.filter(m => m.from === id).length;
    await submit(text);
    await p.waitForFunction(({id,count}) => JSON.parse(localStorage.getItem('zm:p23.max')).msgs.filter(m => m.from === id).length > count, {id,count});
    return (await max()).msgs.filter(m => m.from === id).at(-1).text;
  };
  const waitPhase = phase => p.waitForFunction(phase => P27SCENE.state.phase === phase, phase, { timeout:17000 });
  const act = action => p.locator(`[data-act="${action}"]`).click();
  const setHidden = hidden => p.evaluate(hidden => {
    if (hidden) Object.defineProperty(document, 'hidden', { configurable:true, get:() => true });
    else delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
  try {
    if (points.includes('23')) {
    // #23 — actual messenger + contextual contacts. All text still goes through AntiCensor.
    await go('23-max');
    await p.locator('#mxName').fill('Путник'); await p.locator('#mxDesc').fill('Не трогать мои алмазы.');
    await p.locator('[data-x="save"]').click();
    const inventory = (await max()).me.inv;
    await selectChat('Dimon');
    const beforeBatch = (await max()).msgs.filter(m => m.from === 'b4').length;
    await submit('Привет'); await submit('Куплю'); await submit('2 алмаза');
    await p.waitForFunction(count => JSON.parse(localStorage.getItem('zm:p23.max')).msgs.filter(m => m.from === 'b4').length > count, beforeBatch);
    await p.waitForTimeout(400);
    assert.equal((await max()).msgs.filter(m => m.from === 'b4').length, beforeBatch + 1, 'Rapid messages must produce one contextual answer');
    assert.equal((await max()).talk.b4.quote.qty, 2);
    assert.deepEqual((await max()).me.inv, inventory, 'A text agreement must not move inventory');
    assert.match(await send('b4', 'а три?'), /9 железа/);
    await send('b4', 'не хочу покупать'); assert.equal((await max()).talk.b4.quote, null);
    await send('b4', 'Куплю 2 алмаза');
    await p.locator('.mx-plus').click(); await p.locator('[data-a="gift"]').click();
    await p.locator('.mx-ginv button[title="Железный слиток"]').click();
    await p.locator('[data-x="send"]').click();
    assert.equal((await max()).me.inv.iron_ingot, undefined, 'Escrow removes the payment immediately');
    assert.equal((await max()).me.inv.diamond, 3, 'Diamonds must wait for an incoming offer');
    await p.waitForFunction(() => Object.values(JSON.parse(localStorage.getItem('zm:p23.max')).gifts).some(g => g.from === 'b4' && g.to === 'me' && g.state === 'PENDING'));
    assert.equal((await max()).me.inv.diamond, 3);
    await p.locator('.mx-gbtn [data-g="1"]').last().click();
    assert.equal((await max()).me.inv.diamond, 5);
    assert.equal((await max()).me.inv.iron_ingot, 4, 'Overpayment returns as real change');
    assert.equal((await max()).me.trades, 2, 'Two source-style gifts, not an invented atomic trade');
    await selectChat('Ksyusha_mc');
    await send('b2', 'Строю башню'); await send('b2', 'из камня');
    assert.equal((await max()).talk.b2.build, 'башня'); assert.equal((await max()).talk.b2.material, 'камень');
    await send('b2', 'моя база: 100 64 -20');
    assert.match(await send('b2', 'напомни координаты'), /100 64 -20/);
    await p.locator('.mx-who').click();
    assert.equal(await p.locator('.mx-modal.prof').getAttribute('role'), 'dialog');
    assert.match(await p.locator('.mx-profile-body h3').innerText(), /Ksyusha_mc/);
    await shot('max-profile-desktop'); await p.keyboard.press('Escape');
    assert.equal(await p.locator('.mx-modal.prof').count(), 0);
    const chooser = p.waitForEvent('filechooser');
    await p.locator('.mx-plus').click(); await p.locator('[data-a="file"]').click();
    await (await chooser).setFiles({name:'castle.txt', mimeType:'text/plain', buffer:Buffer.from('A file is not a picture the bot has seen.')});
    const fileCount = (await max()).msgs.filter(m => m.from === 'b2').length;
    await p.locator('.mx-send').click();
    await p.waitForFunction(count => JSON.parse(localStorage.getItem('zm:p23.max')).msgs.filter(m => m.from === 'b2').length > count, fileCount);
    assert.match((await max()).msgs.filter(m => m.from === 'b2').at(-1).text, /castle.txt.*не распознаю/);
    await selectChat('Nagibator3000');
    assert.match(await send('b1', 'напомни координаты'), /ещё не присылал/);
    await selectChat('Oleg_Pro'); const offlineCount = (await max()).msgs.filter(m => m.from === 'b3').length;
    await submit('Ты тут?'); await p.waitForTimeout(2600);
    assert.equal((await max()).msgs.filter(m => m.from === 'b3').length, offlineCount, 'Offline Oleg must not answer');
    assert.equal((await max()).msgs.filter(m => m.to === 'b3').at(-1).read, false);
    // Existing editing / raw forwarding / deleting / counters still use their original paths.
    await selectChat('Избранное'); await submit('привет');
    let own = (await max()).msgs.at(-1); assert.match(own.text, /салам/i);
    await p.locator(`.mx-msg[data-id="${own.id}"] .mx-bub`).click({button:'right'});
    await p.locator('[data-m="EDIT"]').click(); await submit('Хорошо');
    own = (await max()).msgs.find(m => m.id === own.id); assert.equal(own.edited, true); assert.match(own.text, /плохо/i);
    const sentBeforeForward = (await max()).me.sent;
    await p.locator(`.mx-msg[data-id="${own.id}"] .mx-bub`).click({button:'right'});
    await p.locator('[data-m="FORWARD"]').click(); await selectChat('Oleg_Pro');
    assert.equal((await max()).msgs.at(-1).text, own.text); assert.equal((await max()).me.sent, sentBeforeForward);
    await selectChat('Избранное');
    await p.locator(`.mx-msg[data-id="${own.id}"] .mx-bub`).click({button:'right'});
    await p.locator('[data-m="DELETE"]').click();
    assert.equal((await max()).msgs.find(m => m.id === own.id).deleted, true);
    for (let i=0;i<10;i++) await p.locator('#spam').click();
    assert.ok((await store('p23.adv')).includes('max_100_messages'));
    for (const accept of [true,true,true,false,false,false,false,false]) {
      await p.locator('#botGift').click();
      const state = await max(), incoming = state.msgs.at(-1); await selectChat(state.users.find(u => u.id === incoming.from).name);
      await p.locator(`.mx-msg[data-id="${incoming.id}"] [data-g="${accept?1:0}"]`).click();
    }
    assert.ok((await store('p23.adv')).includes('max_5_trades')); assert.ok((await store('p23.adv')).includes('max_5_rejects'));
    await p.locator('.mx-self').click(); await p.locator('[data-x="edit"]').click();
    await p.locator('#mxName').fill('Двадцать четыре символа — предел'); await p.locator('#mxDesc').fill('Профиль без выдуманных рангов.');
    await p.locator('.mx-show').click(); await p.locator('.mx-modal .mx-pslot[title="Алмаз"]').click();
    const uploadAvatar = p.waitForEvent('filechooser'); await p.locator('.mx-at.up').click();
    await (await uploadAvatar).setFiles(path.join(__dirname, '../assets/favicons/p26-64.png'));
    await p.waitForSelector('.mx-modal.crop'); await p.locator('[data-x="apply"]').click(); await p.locator('[data-x="save"]').click();
    assert.ok((await max()).me.name.length <= 24); assert.equal((await max()).me.show, 'diamond'); assert.ok((await max()).me.ava.startsWith('image:'));
    await p.reload({waitUntil:'networkidle'}); assert.ok((await max()).me.ava.startsWith('image:')); assert.equal((await max()).talk.b2.coords, '100 64 -20');
    await selectChat('Dimon'); await submit('Куплю 2 алмаза'); await p.locator('#mxReset').click(); await p.waitForTimeout(2700);
    assert.equal((await max()).msgs.length, 7, 'Reset must cancel old replies');
    console.log('#23: batched context, memory, quantities/negation, escrow/change, files, offline, profile/crop, edit/forward/delete and achievements OK');

    }
    if (points.includes('24')) {
    // #24 — a single trip drives the road, HUD, passengers and charger.
    await go('24-scooter'); await p.waitForFunction(() => window.P24TRIP && window.P24Station);
    assert.deepEqual(await p.evaluate(() => [P24Station.count,P24Station.blocks,P24Station.signs]), [3,198,2]);
    await p.locator('#takeScooter').click();
    for (let i=0;i<4;i++) await p.locator('[data-board]').first().click();
    assert.equal(await p.locator('[data-board]').count(), 0); assert.equal(await p.locator('#hudMass').innerText(), '34.0');
    assert.match(await p.locator('#crewHint').innerText(), /четыре пассажира/);
    await p.locator('[data-seat="0"]').selectOption('chicken'); assert.equal(await p.locator('#hudMass').innerText(), '26.2');
    await p.locator('[data-seat="0"]').selectOption('iron_golem');
    await p.locator('[data-slope="descent"]').click(); await p.locator('#drive').click();
    await p.waitForFunction(() => P24TRIP.state.speed * 72 >= 100, null, {timeout:16000});
    assert.ok((await store('p24.adv')).includes('speed_100'));
    await p.locator('#coast').click(); const coast = await p.evaluate(() => P24TRIP.state.speed);
    await p.waitForTimeout(1000); assert.ok(await p.evaluate(v => P24TRIP.state.speed > v, coast), 'Loaded scooter coasts faster downhill');
    await shot('scooter-loaded');
    assert.equal(await p.locator('#chargeHere').isDisabled(), true);
    // A short real ride barely drains 0.1%; use a half-empty fixture to measure 1%/s.
    await p.evaluate(() => P24TRIP.state.charge=450000);
    await p.locator('#skipRoute').click(); assert.equal(await p.locator('#chargeHere').isEnabled(), true);
    const life = await p.evaluate(() => P24TRIP.state.durability);
    await p.locator('#chargeHere').click();
    const startCharge = await p.evaluate(() => ({charge:P24TRIP.state.charge,tick:P24TRIP.state.tick}));
    await p.waitForTimeout(1200); await p.locator('#chargeHere').click();
    const endCharge = await p.evaluate(() => ({charge:P24TRIP.state.charge,tick:P24TRIP.state.tick}));
    assert.ok(endCharge.charge-startCharge.charge>=8000);
    assert.ok(Math.abs((endCharge.charge-startCharge.charge)-(endCharge.tick-startCharge.tick)*500)<=1500, '500 charge per 50ms tick');
    assert.equal(await p.evaluate(() => P24TRIP.state.durability), life, 'Charging is not repair');
    await p.locator('[data-port="2"]').click(); assert.equal(await p.locator('#portIndex').innerText(), '03');
    await p.locator('#stationSign').click(); assert.match(await p.locator('#stationFocus').innerText(), /БЕНЗИНА НЕТ/);
    await p.locator('#stationLamp').click(); assert.match(await p.locator('#stationFocus').innerText(), /ФОНАРЬ/);
    await p.locator('#stationReset').click(); await p.locator('#takePort').click(); assert.equal((await store('p24.adv')).length, 3);
    await p.locator('#resetTrip').click(); await p.locator('[data-slope="level"]').click();
    await p.locator('[data-surface="water"]').click(); await p.waitForTimeout(600);
    assert.ok(await p.evaluate(() => P24TRIP.state.durability <= 498));
    await p.locator('[data-surface="road"]').click(); await p.locator('#roadCanvas').scrollIntoViewIfNeeded(); await p.waitForTimeout(100); await p.locator('#roadCanvas').focus();
    await p.keyboard.down('w'); await p.waitForTimeout(600); await p.keyboard.up('w');
    assert.ok(await p.evaluate(() => P24TRIP.state.speed > 0)); assert.equal(await p.evaluate(() => P24TRIP.state.gas), false);
    await p.locator('#drive').click(); await p.waitForTimeout(6500);
    assert.ok(await p.evaluate(() => P24TRIP.state.speed*72 <= 80.01), 'Flat cap remains 80');
    await p.evaluate(() => window.dispatchEvent(new Event('blur'))); assert.equal(await p.evaluate(() => P24TRIP.state.running || P24TRIP.state.gas), false);
    console.log('#24: exact NBT station, 4 seats/mass, downhill/coast, HUD/achievements, port proximity/rate, no repair, water, keyboard/blur and flat cap OK');

    }
    if (points.includes('26')) {
    await go('26-vacuum');
    // #26 — old saved lab format survives; A and B are independent items.
    await p.evaluate(() => localStorage.setItem('zm:p26.lab', JSON.stringify({power:7,mode:'misc',custom:'wheat',history:['wheat'],upgrades:2,enchant:1,inventory:[{id:'diamond',n:65}],caught:65,playerCount:4,crafted:true})));
    await go('26-vacuum'); await p.waitForFunction(() => window.P26APP && window.P26FLOOR);
    assert.equal(await p.evaluate(() => P26APP.capacity()),47); assert.equal(await p.evaluate(() => P26APP.state.inventory[0].n),65);
    await p.locator('[data-specimen="B"]').click(); assert.equal(await p.evaluate(() => P26APP.capacity()),27); assert.equal(await p.evaluate(() => P26APP.state.inventory.length),0);
    await p.locator('[data-mode="ores"]').click(); await p.locator('#powerRange').fill('10');
    await p.locator('#cleanup').scrollIntoViewIfNeeded();
    await p.evaluate(() => { P26FLOOR.items.length=0; P26FLOOR.items.push({key:9000,id:'diamond',x:0,z:4,vx:0,vz:0,pull:0,phase:0,rot:0},{key:9001,id:'bread',x:0,z:4,vx:0,vz:0,pull:0,phase:0,rot:0}); });
    await p.locator('#latchBtn').click(); await p.waitForFunction(() => P26APP.state.caught > 0);
    assert.equal(await p.evaluate(() => P26FLOOR.items.some(x => x.id==='bread')), true, 'Food must stay on floor in ORES');
    await p.locator('#latchBtn').click(); assert.equal(await p.evaluate(() => P26APP.state.maxSecs),0);
    assert.deepEqual(await p.evaluate(() => {const old=P26APP.state.mode; P26APP.state.mode='blocks';const block=P26APP.matches(P26APP.byId('dropper')); P26APP.state.mode='misc';const wheat=P26APP.matches(P26APP.byId('wheat')),machine=P26APP.matches(P26APP.byId('dropper')); P26APP.state.mode=old;return [block,wheat,machine];}),[false,true,true]);
    await p.locator('[data-mode="custom"]').click(); await p.locator('#customSearch').fill('minecraft:wheat'); await p.locator('#customSearch').press('Enter');
    assert.equal(await p.evaluate(() => P26APP.state.custom),'wheat'); assert.equal(await p.evaluate(() => P26APP.state.history[0]),'wheat');
    await p.locator('[data-mode="food"]').click(); await p.locator('[data-room="farm"]').click();
    await p.locator('#latchBtn').click(); await p.waitForFunction(() => P26FLOOR.crops.some(c => !c.ripe)); await p.locator('#latchBtn').click();
    assert.ok(await p.evaluate(() => P26FLOOR.crops.some(c => c.ripe)), 'Only crops inside the actual cone are harvested');
    await p.locator('#regrow').click(); assert.equal(await p.evaluate(() => P26FLOOR.crops.every(c => c.ripe)),true);
    await p.locator('#floorCanvas').focus(); await p.keyboard.down(' '); await p.waitForTimeout(250); assert.equal(await p.evaluate(() => P26APP.state.active),true); await p.keyboard.up(' ');
    assert.equal(await p.evaluate(() => P26APP.state.active),false);
    await p.locator('#suckBtn').focus(); await p.keyboard.down(' ');
    assert.equal(await p.evaluate(() => P26APP.state.active),true);
    await p.locator('#latchBtn').focus(); await p.keyboard.up(' ');
    assert.equal(await p.evaluate(() => P26APP.state.active),false,'Changing focus must release the keyboard hold');
    await p.locator('#latchBtn').click(); await p.waitForTimeout(650); assert.ok(await p.evaluate(() => P26APP.state.maxSecs>.3));
    await p.locator('#powerRange').fill('9'); assert.equal(await p.evaluate(() => P26APP.state.maxSecs),0); await p.locator('#powerRange').fill('10');
    await p.evaluate(() => P26APP.state.maxSecs=59.9); await p.waitForFunction(() => ZM.store.get('p26.adv',[]).includes('max_power_60s')); await p.locator('#latchBtn').click();
    await p.locator('[data-level="3"]').click(); assert.equal(await p.evaluate(() => P26APP.range()),25);
    await p.locator('#autoRecipe').click(); assert.equal(await p.locator('#craftBtn').getAttribute('aria-disabled'),'false'); await p.locator('#craftBtn').click();
    for(let i=0;i<15;i++) await p.locator('#upgradeBtn').click(); assert.equal(await p.evaluate(() => P26APP.capacity()),177); assert.equal(await p.locator('#upgradeBtn').isDisabled(),true);
    const beforeBook = await p.evaluate(() => P26APP.state.inventory.length); await p.evaluate(() => P26APP.insert('enchanted_book',2));
    assert.equal(await p.evaluate(() => P26APP.state.inventory.length),beforeBook+2,'Unstackable books use two slots');
    await p.evaluate(() => P26APP.insert('diamond',65)); assert.ok(await p.evaluate(() => P26APP.state.inventory.filter(x=>x.id==='diamond').length>=2));
    await p.locator('#rowRange').fill('17'); assert.match(await p.locator('#vaultRows').innerText(),/154–177/);
    const bSlots=await p.evaluate(() => P26APP.state.inventory.length);
    await p.locator('[data-specimen="A"]').click(); assert.equal(await p.evaluate(() => P26APP.capacity()),47); assert.equal(await p.evaluate(() => P26APP.state.inventory[0].n),65);
    await p.locator('#transferBtn').click(); await p.waitForFunction(() => !P26APP.state.inventory.length); assert.equal(await p.evaluate(() => P26APP.state.playerCount),69);
    await p.locator('[data-specimen="B"]').click(); assert.equal(await p.evaluate(() => P26APP.state.inventory.length),bSlots);
    await p.reload({waitUntil:'networkidle'}); assert.equal(await p.evaluate(() => P26APP.capacity()),177); assert.equal(await p.evaluate(() => P26APP.state.inventory.length),bSlots); assert.equal((await store('p26.adv')).length,3);
    await p.locator('#cleanup').scrollIntoViewIfNeeded(); await p.locator('#latchBtn').click(); await setHidden(true); assert.equal(await p.evaluate(() => P26APP.state.active),false); await setHidden(false);
    await shot('vacuum-play'); console.log('#26: live cone/filter/crops, keyboard, continuous timer/reset, source stack sizes, recipe/enchant/capacity, A/B migration, transfer and persistence OK');

    }
    if (points.includes('27')) {
    // #27 — deterministic tests of BOTH unbiased-coin outcomes; production uses crypto.
    await go('27-chigur'); assert.equal((await store('p27.adv')).length,0);
    await act('approach'); await waitPhase('close'); assert.ok((await store('p27.adv')).includes('first_meeting'));
    await act('dismiss'); assert.equal(await p.evaluate(() => P27SCENE.state.phase),'dismissed'); assert.equal(await p.locator('#character').evaluate(e=>e.classList.contains('gone')),false);
    await act('talk'); await act('question'); await p.waitForTimeout(500); await setHidden(true);
    const frozen=await p.locator('#sceneProgress').getAttribute('style'); await p.waitForTimeout(1200); assert.equal(await p.locator('#sceneProgress').getAttribute('style'),frozen); await setHidden(false);
    await waitPhase('huntDelay'); assert.equal(await p.evaluate(() => P27SCENE.state.distance),26); assert.equal(await p.evaluate(() => P27SCENE.state.aggression),0);
    await waitPhase('hunt'); await act('sleep'); await waitPhase('ended'); assert.equal(await p.evaluate(() => P27SCENE.state.dead),true); assert.ok((await store('p27.adv')).includes('night_visit'));
    await p.locator('#sceneReset').click(); await act('approach'); await waitPhase('close');
    for(let i=0;i<3;i++){await act('silent'); if(i<2)await act('talk');}
    assert.equal(await p.evaluate(() => P27SCENE.state.aggression),100); assert.equal(await p.evaluate(() => P27SCENE.state.phase),'hunt');
    assert.equal(await p.evaluate(() => P27SCENE.state.distance),4.5,'Silence does not invent the first-speech retreat');
    await p.locator('[data-episode="witness"]').click(); await waitPhase('witnessChoice');
    for(let i=0;i<3;i++){await act('refuse'); await waitPhase(i===2?'ended':'witnessChoice');}
    assert.equal(await p.evaluate(() => P27SCENE.state.refusals),3); assert.equal(await p.evaluate(() => P27SCENE.state.dead),false);
    await p.locator('[data-episode="witness"]').click(); await waitPhase('witnessChoice'); await act('tell'); await waitPhase('targetDelay');
    assert.equal(await p.locator('#witnessSelf').evaluate(e=>e.classList.contains('dead')),true); assert.equal(await p.locator('#witnessTarget').evaluate(e=>e.classList.contains('dead')),false);
    await waitPhase('ended'); assert.equal(await p.locator('#witnessTarget').evaluate(e=>e.classList.contains('dead')),true);
    await p.evaluate(() => Object.defineProperty(crypto,'getRandomValues',{ configurable:true, value:array=>{array[0]=0;return array;} }));
    await p.locator('[data-episode="coin"]').click(); await waitPhase('coinChoice'); await act('heads');
    assert.equal(await p.evaluate(() => P27SCENE.state.coinUsed),true); await waitPhase('coinReward'); assert.equal((await store('p27.adv')).includes('coin_luck'),false);
    await waitPhase('ended'); assert.ok((await store('p27.adv')).includes('coin_luck')); assert.equal(await p.evaluate(() => P27SCENE.state.dead),false);
    await p.locator('[data-episode="coin"]').click(); await waitPhase('coinChoice'); await act('tails'); await waitPhase('coinLoss');
    await waitPhase('coinExecution'); assert.match(await p.locator('#sceneLine').innerText(), /восемь тиков/);
    await waitPhase('ended'); assert.equal(await p.evaluate(() => P27SCENE.state.dead),true);
    await p.locator('[data-episode="coin"]').click(); await p.waitForTimeout(350); await p.locator('#sceneReset').click(); await p.waitForTimeout(1100); assert.equal(await p.evaluate(() => P27SCENE.state.phase),'far','Reset cancels old scenes');
    assert.equal((await store('p27.adv')).includes('hunter'),false);
    await p.locator('#unlockWeapon').click(); assert.ok((await store('p27.adv')).includes('hunter'));
    await p.locator('#distance').fill('14'); await p.locator('#fireBtn').click(); assert.equal(await p.evaluate(() => P27SCENE.gun.hp),80); assert.match(await p.locator('#weaponFeedback').innerText(),/Мимо/);
    await p.waitForTimeout(450); await p.locator('#distance').fill('2'); await p.locator('#fireBtn').click(); assert.equal(await p.evaluate(() => P27SCENE.gun.hp),13);
    await p.waitForTimeout(450); await p.locator('#fireBtn').click(); assert.equal(await p.evaluate(() => P27SCENE.gun.hp),0);
    for(let i=0;i<3;i++){await p.waitForTimeout(450);await p.locator('#fireBtn').click();}
    assert.equal(await p.evaluate(() => P27SCENE.gun.ammo),0); assert.equal(await p.evaluate(() => P27SCENE.gun.life),294); assert.equal(await p.locator('#fireBtn').isDisabled(),true);
    await p.waitForFunction(() => P27SCENE.gun.reload===0,null,{timeout:12000}); assert.equal(await p.evaluate(() => P27SCENE.gun.ammo),6);
    await p.locator('#repairBtn').click(); assert.equal(await p.evaluate(() => P27SCENE.gun.life),300); await p.locator('#resetTarget').click(); assert.equal(await p.evaluate(() => P27SCENE.gun.hp),80);
    await shot('chigur-range'); assert.equal((await store('p27.adv')).length,5);
    console.log('#27: meeting/polite/3 silences, 5s freeze + 6s retreat, visibility pause/reset, bed, witness refusals/executions, both coin outcomes/timings and real trophy range/reload/repair OK');

    }
    if (points.includes('mobile')) {
    // Mobile/tablet + reduced motion. Interactions remain available, not just artwork.
    await p.emulateMedia({reducedMotion:'reduce'});
    for(const width of [375,768]){
      await p.setViewportSize({width,height:844});
      for(const slug of ['24-scooter','26-vacuum','27-chigur','23-max']){
        await go(slug);
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth<=innerWidth+1),`${slug} ${width}: no horizontal overflow`);
        assert.equal(await p.evaluate(() => [...document.images].filter(i=>i.complete&&!i.naturalWidth).length),0);
        if(slug==='23-max'){
          if(await p.locator('#mxName').count())await p.locator('[data-x="save"]').click();
          await selectChat('Ksyusha_mc');await p.locator('.mx-who').click();await p.waitForTimeout(100);
          assert.ok(await p.locator('.mx-modal.prof').evaluate(e=>e.getBoundingClientRect().top>=56));
        }
        if(slug==='26-vacuum'){
          await p.locator('#cleanup').scrollIntoViewIfNeeded(); const r=await p.locator('#floorCanvas').boundingBox();
          await p.touchscreen.tap(r.x+r.width*.5,r.y+r.height*.4); assert.equal(await p.evaluate(() => P26APP.state.active),false,'Touch release must stop the floor');
        }
        if(width===375)await shot(`mobile-${slug}`);
      }
    }
    // A genuine WebGL failure: no source model renderer, but useful fallback and demos.
    await p.addInitScript(() => {
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type,...args){return /^(webgl2?|experimental-webgl)$/.test(type)?null:get.call(this,type,...args);};
    });
    for(const slug of ['24-scooter','26-vacuum','27-chigur']){
      await go(slug);
      assert.ok(await p.evaluate(() => [...document.images].every(i=>!i.complete||i.naturalWidth>0)));
      if(slug==='24-scooter'){
        assert.equal(await p.locator('.station-fail').isVisible(),true);
        assert.equal(await p.locator('#station3d').isVisible(),false);
        await p.locator('#stationView').scrollIntoViewIfNeeded();
        await p.waitForFunction(() => {const image=document.querySelector('.station-still');return image.complete && image.naturalWidth>0;});
        assert.equal(await p.locator('.station-tools').isVisible(),false);
        await p.locator('#takeScooter').click();assert.equal(await p.evaluate(() => P24TRIP.state.owned),true);
      }
      if(slug==='26-vacuum'){assert.ok(await p.evaluate(() => !!window.P26FLOOR));await p.locator('#cleanup').scrollIntoViewIfNeeded();await p.locator('#latchBtn').click();assert.equal(await p.evaluate(() => P26APP.state.active),true);}
      if(slug==='27-chigur'){await act('approach');await waitPhase('close');assert.equal(await p.locator('#character').evaluate(e=>e.classList.contains('model-ready')),false);}
    }
    console.log('Mobile: 375/768 layouts, touch, reduced motion and usable no-WebGL fallbacks OK');
    }
    assert.deepEqual(errors, [], errors.join('\n'));
    console.log('Selected checks passed; no HTTP/JS errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
