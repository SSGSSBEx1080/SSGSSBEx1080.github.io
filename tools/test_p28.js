/* Canonical rules from the supplied Java, without a browser or dependencies. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const C=require('../pages/28-medusa/physics.js'),model=()=>new C.Model();
assert.deepEqual(C.caps,[32,64,128,256,512]);
for(const[n,out]of[[0,2],[2,2],[3,4],[19,20],[1201,1200]])assert.equal(C.delayTicks(n),out);
assert.equal(C.playerDuration(0),900);assert.equal(C.playerDuration(56,20,12),180);assert.equal(C.playerDuration(40,20,8),245);assert.equal(C.playerDuration(100,100,100),180,'80% cap makes the actual lower bound 9 s, not 8 s');
for(const[hp,t]of[[1,1200],[20,1180],[300,900],[500,700],[900,300],[1000,300]])assert.equal(C.mobDuration(hp),t);
for(const[k,v]of Object.entries({wood:2.5,gold:2.5,stone:4,iron:6,diamond:10,netherite:14,other:.15,mob:.15}))assert.equal(C.toolFactor(k),v);
assert.equal(C.damage(4,'diamond'),40);assert.ok(Math.abs(C.damage(4,'diamond',20,12)-20.8)<1e-8);
let m=model();assert.equal(m.state.item.charged,true);assert.equal(m.state.item.radius,8);assert.equal(m.state.item.delay,60);assert.equal(m.arm(),false);m.take();m.configure(99,3);assert.equal(m.state.item.radius,32);assert.equal(m.state.item.delay,4);
for(let i=0;i<=4;i++){m.science(i);m.configure(999,60);assert.equal(m.state.item.radius,C.caps[i]);}
// An armed deadline is independent of settings, throwing, save/load and pickup.
m=model();m.take();m.arm();const deadline=m.state.item.deadline;m.configure(12,1200);assert.equal(m.state.item.deadline,deadline);m.tick(20);assert.equal(m.throw(2),false);assert.equal(m.throw(20),true);assert.equal(m.state.orb.deadline,deadline);assert.equal(m.remaining(),40);
m=new C.Model(m.snapshot());assert.equal(m.state.orb.deadline,deadline);Object.assign(m.state.orb,{age:10,vx:0,vy:0,vz:0,y:.051});assert.equal(m.pickup(),true);assert.equal(m.state.item.deadline,deadline);m.tick(40);assert.equal(m.state.item.charged,false);assert.equal(m.owner.stone,true);assert.equal(m.arm(),false);assert.equal(m.throw(20),false);
// End/restore, exact recharge cost and preservation of item properties.
const originalEnd=m.owner.endAt;m.tick(originalEnd-m.state.time);assert.equal(m.owner.stone,false);assert.equal(m.owner.hp,20);const settings=[m.state.item.radius,m.state.item.delay,m.state.item.science];const xp=m.owner.xp,diamonds=m.state.playerDiamonds;assert.equal(m.recharge(),true);assert.equal(m.owner.xp,xp-1);assert.equal(m.state.playerDiamonds,diamonds-1);assert.deepEqual([m.state.item.radius,m.state.item.delay,m.state.item.science],settings);assert.equal(m.state.item.armed,false);assert.equal(m.recharge(),false,'Do not charge an already charged item');
// Ordinary throw does not award the hand-started countdown achievement.
m=model();m.take();m.drain();m.configure(8,2);m.throw(3);m.tick(3);const awarded=m.drain().filter(e=>e.type==='adv').map(e=>e.key);assert.ok(awarded.includes(C.keys.wave));assert.ok(!awarded.includes(C.keys.countdown));assert.equal(m.state.orb.charged,false);assert.equal(m.state.orb.spent,true);assert.equal(m.state.orb.deadline,0);assert.ok(m.state.orb,'Detonation must leave the physical item behind');
const oldY=m.state.orb.y;m.tick(10);assert.ok(m.state.orb.y<=oldY,'An air detonation must fall, not hang');
// The source allows an empty throw, with weak bounces and no wave.
m=model();m.take();m.state.item.charged=false;m.throw(20);m.tick(100);assert.equal(m.state.waves.length,0);assert.equal(m.state.orb.charged,false);assert.ok(!m.drain().some(e=>e.type==='wave'));
// Same radius growth, sphere (not cylinder), walls ignored, owner affected.
m=model();m.take();m.science(4);m.configure(512,2);m.arm();m.tick(2);assert.equal(m.state.waves[0].current,1.6);assert.ok(m.owner.stone);m.tick(15);assert.equal(m.state.waves[0].hit.length,4,'Owner and all three samples, including the player behind the wall, are affected');m.tick(303);assert.ok(Math.abs(m.state.waves[0].current-510.4)<1e-8);m.tick();assert.equal(m.state.waves[0].current,512);assert.equal(m.state.waves[0].done,true);m.tick();assert.equal(m.state.waves.length,0);
const allAwards=m.drain().filter(e=>e.type==='adv').map(e=>e.key);assert.ok(allAwards.includes(C.keys.science));assert.ok(allAwards.includes(C.keys.limit));assert.ok(m.state.entities.every(e=>e.stone||e.kind==='player'&&!e.stone),'All eligible living candidates were reached, including behind the wall');
m=model();m.state.entities[1].y=30;m.pulse({x:4,y:0,z:-2},8);m.tick(20);assert.equal(m.state.entities[1].stone,false,'Vertical distance is part of the sphere test');
m=model();m.state.entities[1].x=100;m.pulse({x:0,y:0,z:0},32);m.state.entities[1].x=0;m.tick(30);assert.equal(m.state.entities[1].stone,false,'Candidates are captured in the maximum AABB at wave creation');
// 15%-max-health healing, suspended good effects, deleted bad effects and cure.
m=model();const patient=m.state.entities[2];patient.hp=1;m.petrify(patient);const suspended=patient.suspended;assert.equal(patient.harmful,0);m.tick(20);assert.equal(patient.hp,4);assert.equal(patient.suspended,suspended);m.tick(patient.endAt-m.state.time);assert.equal(patient.kind,'villager');assert.equal(patient.cured,true);assert.equal(patient.hp,20);assert.equal(patient.beneficial,suspended);assert.equal(patient.harmful,0);
// Repeated petrification uses max(endAt, newEndAt), never additive durations.
m=model();m.owner.xp=0;m.petrify(m.owner);const end=m.owner.endAt;m.owner.xp=56;m.owner.armor=20;m.owner.toughness=12;m.tick(100);m.petrify(m.owner);assert.equal(m.owner.endAt,end);m.tick(750);m.petrify(m.owner);assert.equal(m.owner.endAt,m.state.time+180);
m=model();m.owner.y=10;m.petrify(m.owner);m.tick();assert.equal(m.owner.y,9.92);assert.equal(m.hit('owner','lava'),0);assert.equal(m.hit('owner','fire'),0);m.owner.inWater=true;m.tick();assert.equal(m.owner.vy,-.42);
// Resource provenance and advancement metadata are taken from the actual mod.
const hashes={'assets/textures/p28/medusa.png':'97754a371d520dffd4ed1b4d38c80007','assets/textures/p28/medusa_wave.png':'60e78004768d535bec74b96d38a19f9f','assets/textures/p28/petrified_stone.png':'c4fdee3910c0158e772cb00d75add839','mod-src/models/item/medusa.json':'afe8c41bfd48ca7916228c82e17ccd39'};
for(const[p,hash]of Object.entries(hashes))assert.equal(crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex'),hash,p);
const ctx={};ctx.window=ctx;vm.runInNewContext(fs.readFileSync('data/p28_adv.js','utf8'),ctx);vm.runInNewContext(fs.readFileSync('data/p28_audio.js','utf8'),ctx);assert.equal(ctx.ZM.P28.advancements.length,5);let total=0;
for(const a of ctx.ZM.P28.advancements){const j=JSON.parse(fs.readFileSync('mod-src/advancements/28_medusa/'+a.key+'.json'));assert.equal(a.title,j.display.title.text);assert.equal(a.desc,j.display.description.text);assert.equal(a.frame,j.display.frame);assert.equal(a.icon,j.display.icon.item.split(':')[1]);assert.equal(a.xp,j.rewards.experience);assert.equal(a.free,true);assert.ok(fs.existsSync('assets/textures/p28/i/'+a.icon+'.png'));total+=a.xp;}
assert.equal(total,175);for(const event of Object.values(ctx.ZM.P28Audio))for(const clip of event.clips)for(const ext of ['ogg','mp3'])assert.ok(fs.statSync('assets/sounds/p28/'+clip.name+'.'+ext).size>1000);
console.log('Medusa: native settings/caps, absolute NBT deadline, throw/pickup/recharge, 512 sphere timing/candidates, stone/heal/effects/cure/damage, source resources and 5 native advancements: OK');
