/* Source identity, native achievement icons and the five requested MAX profiles. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const ctx={};ctx.window=ctx;
for(const file of ['data/p27_adv.js','data/p27_geo.js','data/p27_items.js','data/hub_adv.js','pages/23-max/personas.js','pages/23-max/dialogue.js','pages/23-max/conversation.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),ctx);
const plain=x=>JSON.parse(JSON.stringify(x));
const originals={
 'mod-src/geo/p27_anton_chigur.geo.json':'29df6bf1e11942b0281899f639791175',
 'mod-src/animations/p27_anton_chigur.animation.json':'1db8a5c9e46ba735ab3c9d14e257278d',
 'assets/textures/p27/anton_chigur.png':'838cc27f73809b919a781863cf4d2414',
 'assets/textures/p27/chigur_shotgun.png':'7d54ad0499fc7ee144eaaff5b5311e27',
 'assets/textures/p27/chigur_coin.png':'6a4760e7ebef3f95cb8a1687f63e0813',
 'mod-src/models/item/chigur_shotgun.json':'4c7cf6fc121b4b6a873bcdbb479f0c18',
 'mod-src/models/item/chigur_coin.json':'6c5ca34343172fdf5ef4f6b6d6ac3d95'
};
for(const[path,hash]of Object.entries(originals))assert.equal(crypto.createHash('md5').update(fs.readFileSync(path)).digest('hex'),hash,path+' must match the supplied Drive original');
const sourceModel=JSON.parse(fs.readFileSync('mod-src/geo/p27_anton_chigur.geo.json'))['minecraft:geometry'][0];
assert.deepEqual(plain(ctx.ZM.P27G.geo.bones),sourceModel.bones,'Do not fix a raster illustration by corrupting the original entity bones');
assert.equal(ctx.ZM.P27G.geo.bones.find(b=>b.name==='shotgun').rotation[0],-93);
assert.equal(Object.keys(ctx.ZM.P27G.anim).length,9);
for(const type of ['shotgun','coin'])assert.deepEqual(plain(ctx.ZM.P27ITEMS[type]),JSON.parse(fs.readFileSync(`mod-src/models/item/chigur_${type}.json`)));
for(const a of ctx.ZM.P27.advancements){
 const source=JSON.parse(fs.readFileSync(`mod-src/advancements/27_chigur/${a.key}.json`));
 assert.equal(a.icon,source.display.icon.item.split(':')[1]);
 assert.equal(a.title,source.display.title);assert.equal(a.desc,source.display.description);
 assert.ok(fs.existsSync(`assets/textures/p27/i/${a.icon}.png`));
 assert.equal(ctx.ZM.HUB_ADV.find(x=>x.n===27).adv.find(x=>x.key===a.key).icon,`assets/textures/p27/i/${a.icon}.png`);
}
const hashes={airgun:'443eb0bc43169e6cde81193c157b9a78',shot:'443eb0bc43169e6cde81193c157b9a78',reload:'bb197c6de418bf54a97972c3993f8f9c',coin:'fe043f50a708dc030c7e046bd7ca5a49',vanish:'4c79fa0deefb2b6031215d082692a72b',step:'3a4a55a506837fad36ec691c0cfc9f64',speech_1:'93c296070df290e855e5c5853083a28a',speech_2:'50e44055b184dae1298093236ffa9993',speech_3:'8e7853b442769ba714b220ba17dbee1b',speech_4:'97a806fb3f2ce79309542bbf15e01f4a',speech_5:'b30d2df700d8665e666dd84bd2cd8418',speech_6:'60fc3ae8ddfdf5331a6f8959f07c5384'};
for(const [name,hash]of Object.entries(hashes)){
 const path=`assets/sounds/p27/chigur_${name}`;
 assert.equal(crypto.createHash('md5').update(fs.readFileSync(path+'.ogg')).digest('hex'),hash);
 assert.ok(fs.statSync(path+'.mp3').size>1000);
}
assert.equal(ctx.ZMMaxPersonas.length,5);
assert.deepEqual(plain(ctx.ZMMaxPersonas.map(x=>x.persona)),['p5','pv','pd','pc','pm']);
for(const p of ctx.ZMMaxPersonas){
 assert.ok(p.name.length<=24&&p.desc.length<=120&&p.ava.startsWith('image:'));
 assert.ok(p.ava.length<30000);const png=Buffer.from(p.ava.slice(6),'base64');assert.equal(png.readUInt32BE(16),64);assert.equal(png.readUInt32BE(20),64);
}
const brain=ctx.ZMMaxConversation;
const reply=(id,text,memory)=>brain.reply({contact:ctx.ZMMaxPersonas.find(x=>x.id===id),me:{name:'Игрок'},memory,input:[{type:'TEXT',raw:text}]});
assert.match(reply('b1','42, братуха').text,/42/);
assert.match(reply('b3','Когда выйдет второй трек?').text,/фтар|втор|адин/i);
let mom=reply('b5','Я уже поел');assert.equal(mom.memory.character.flags.ate,true);mom=reply('b5','Что на ужин?',mom.memory);assert.match(mom.text,/уже|поел/);
let clan=reply('b4','Давай перемирие');assert.equal(clan.memory.character.flags.truce,true);clan=reply('b4','Куплю 2 алмаза',clan.memory);assert.equal(clan.memory.quote.qty,2);
const gift=brain.gift({contact:ctx.ZMMaxPersonas.find(x=>x.id==='b4'),memory:clan.memory,stacks:[{id:'iron_ingot',n:10}],items:{iron_ingot:'Железо'}});
assert.equal(gift.accept,true);assert.deepEqual(plain(gift.offer),[{id:'diamond',n:2},{id:'iron_ingot',n:4}]);
const goth=reply('b2','моя база 100 64 -20');assert.equal(goth.memory.coords,'100 64 -20');assert.match(reply('b1','напомни координаты').text,/ещё не присылал/);
console.log('Original geometry/item models, 5 native advancement icons, all 12 original sounds + MP3, 5 MAX personas + context/escrow: OK');
