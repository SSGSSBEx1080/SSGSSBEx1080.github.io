/* Pure 20-TPS demonstration model. Constants, NBT semantics, wave tests, timers
 * and multipliers are ported from the supplied MedusaItem/Orb/PetrificationManager.
 * Terrain and specimen placement are illustrations, not a Minecraft world. */
(function(root){
 'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)), caps=[32,64,128,256,512];
 const delayTicks=n=>clamp(2+Math.round((clamp(Number(n)||2,2,1200)-2)/2)*2,2,1200);
 const playerDuration=(xp=0,armor=0,toughness=0)=>Math.max(160,Math.round(900*(1-Math.min(.8,Math.min(.7,Math.max(0,xp)*.0125)+Math.min(.3,Math.max(0,armor)*.009+Math.max(0,toughness)*.006)))));
 const mobDuration=hp=>Math.max(300,1200-Math.floor(Math.max(1,hp)/20)*20);
 const toolFactor=kind=>({wood:2.5,gold:2.5,stone:4,iron:6,diamond:10,netherite:14})[kind]??.15;
 const damage=(raw,kind,armor=0,toughness=0)=>{const before=raw*toolFactor(kind), effective=clamp(armor-before/(2+toughness/4),armor*.2,20);return before*(1-effective/25);};
 const copy=x=>JSON.parse(JSON.stringify(x));
 const keys={discovery:'01_medusa_discovery',countdown:'02_countdown',wave:'03_green_wave',science:'04_science_radius',limit:'05_limit_512'};
 function sample(id,kind,name,x,z,extra={}){return Object.assign({id,kind,name,x,z,y:0,anchorX:x,anchorZ:z,height:kind==='player'?1.8:1.95,maxHP:20,hp:9,xp:0,armor:0,toughness:0,alive:true,endAt:0,stone:false,vy:0,walk:0,lockWalk:0,beneficial:2400,harmful:900,suspended:0,cured:false},extra);}
 function fresh(){return{version:1,time:0,item:{owned:false,charged:true,radius:8,delay:60,science:0,armed:false,deadline:0},orb:null,waves:[],log:[],playerDiamonds:2,entities:[
  sample('owner','player','Игрок · владелец',-7,0,{xp:20}),
  sample('mob','mob','Зомби',4,-2,{maxHP:20,hp:7}),
  sample('villager','zombieVillager','Зомби-житель',9,3,{hp:5}),
  sample('far','player','Игрок за стеной',15,-3,{xp:40,armor:20,toughness:8})
 ]};}
 class Model{
  constructor(saved){this.events=[];this.state=fresh();
   // Pausing the browser pauses this single-player stand's game clock. An armed
   // absolute deadline is restored as-is; reload/pickup never restarts it.
   if(saved?.version===1&&Number.isFinite(saved.time)&&saved.time>=0&&Array.isArray(saved.entities)&&saved.entities.length===4&&saved.item){
    try{const s=copy(saved);if(new Set(s.entities.map(e=>e.id)).size!==4||s.entities.some(e=>!['owner','mob','villager','far'].includes(e.id)||!Number.isFinite(e.x)||!Number.isFinite(e.hp)))throw Error('bad specimen');
     s.item.science=clamp(Math.trunc(Number(s.item.science)||0),0,4);s.item.radius=clamp(Math.trunc(Number(s.item.radius)||8),2,caps[s.item.science]);s.item.delay=delayTicks(s.item.delay);
     s.item.deadline=Number.isFinite(s.item.deadline)?s.item.deadline:0;s.log=Array.isArray(s.log)?s.log.slice(-8):[];s.waves=Array.isArray(s.waves)?s.waves.filter(w=>Number.isFinite(w.start)&&Number.isFinite(w.radius)&&Array.isArray(w.candidates)&&Array.isArray(w.hit)):[];
     if(s.orb&&(!Number.isFinite(s.orb.x)||!Number.isFinite(s.orb.vy)))s.orb=null;this.state=s;
    }catch(_){}
   }
  }
  get owner(){return this.state.entities.find(e=>e.id==='owner');}
  emit(type,data={}){this.events.push({type,...data});}
  drain(){const out=this.events;this.events=[];return out;}
  log(text){this.state.log.push({t:this.state.time,text});this.state.log=this.state.log.slice(-8);this.emit('log',{text});}
  award(name){this.emit('adv',{key:keys[name]});}
  take(){const s=this.state;if(s.item.owned||s.orb)return false;s.item.owned=true;this.award('discovery');this.log('Медуза в руке. Заряд готов.');return true;}
  configure(radius,delay){const s=this.state;if(s.orb)return false;s.item.radius=clamp(Math.round(Number(radius)||2),2,caps[s.item.science]);s.item.delay=delayTicks(delay);return true;}
  science(level){const s=this.state;if(s.item.armed||s.orb)return false;s.item.science=clamp(Math.round(level),0,4);s.item.radius=Math.min(s.item.radius,caps[s.item.science]);return true;}
  canAct(){return this.state.item.owned&&!this.owner.stone&&this.owner.alive;}
  arm(){const s=this.state;if(!this.canAct()||!s.item.charged||s.item.armed)return false;s.item.armed=true;s.item.deadline=s.time+s.item.delay;this.award('countdown');this.log('Отсчёт запущен в руке. Подбор и бросок не изменят срок.');return true;}
  throw(usedTicks,pitch=22){
   const s=this.state,item=s.item;if(!this.canAct()||usedTicks<3)return false;
   const power=Math.min(1,usedTicks/20),speed=.45+power*1.85,a=clamp(pitch,0,70)*Math.PI/180;
   const deadline=item.armed?item.deadline:s.time+item.delay;
   s.orb={x:this.owner.x,y:this.owner.y+1.52,z:this.owner.z,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,vz:0,age:0,ground:false,spin:Math.random()<.5?1:-1,charged:item.charged,deadline,radius:item.radius,science:item.science,spent:false,lastEntity:'',cooldown:0};
   item.owned=false;item.armed=false;item.deadline=0;this.emit('throw');this.log(item.charged?'Медуза брошена. Срок активации сохранён.':'Разряженная Медуза брошена: волны не будет.');return true;
  }
  pickup(){
   const s=this.state,o=s.orb;if(!o||this.owner.stone||!this.owner.alive||o.age<10||o.vx*o.vx+o.vy*o.vy+o.vz*o.vz>.18)return false;
   this.owner.x=o.x;this.owner.z=o.z;this.owner.anchorX=o.x;this.owner.anchorZ=o.z;
   Object.assign(s.item,{owned:true,charged:o.charged,radius:o.radius,science:o.science,armed:o.charged,deadline:o.charged?o.deadline:0});
   s.orb=null;this.emit('pickup');this.log(s.item.armed?'Медуза подобрана. Старый отсчёт продолжается.':'Разряженная Медуза подобрана.');return true;
  }
  recharge(){const s=this.state,i=s.item;if(!this.canAct()||i.charged||s.playerDiamonds<1||this.owner.xp<1)return false;
   i.charged=true;i.armed=false;i.deadline=0;s.playerDiamonds--;this.owner.xp--;this.emit('recharge');this.log('Заряд восстановлен. Потрачены один алмаз и один уровень; настройки и чары сохранены.');return true;
  }
  pulse(center,radius){const s=this.state,w={x:center.x,y:center.y,z:center.z,radius,start:s.time,hit:[],candidates:s.entities.filter(e=>e.alive&&Math.abs(e.x-center.x)<=radius&&Math.abs(e.y-center.y)<=radius&&Math.abs(e.z-center.z)<=radius).map(e=>e.id),done:false};
   s.waves.push(w);this.award('wave');if(radius>32)this.award('science');if(radius>=512)this.award('limit');this.emit('wave',{radius});this.log('Зелёная сфера: '+radius+' блоков, 1,6 блока за тик.');return w;
  }
  petrify(e){const s=this.state,d=e.kind==='player'?playerDuration(e.xp,e.armor,e.toughness):mobDuration(e.maxHP),end=s.time+d;
   if(e.stone){e.endAt=Math.max(e.endAt,end);return;}
   e.endAt=end;e.stone=true;e.vy=Math.min(0,e.vy||0);e.lockWalk=e.walk;e.suspended=e.beneficial;e.beneficial=0;e.harmful=0;this.emit('petrify',{id:e.id,duration:d});this.log(e.name+': окаменение на '+(d/20).toFixed(2).replace(/0$/,'')+' с.');
  }
  release(e){e.stone=false;e.endAt=0;e.beneficial=e.suspended;e.suspended=0;
   if(e.kind==='zombieVillager'){e.kind='villager';e.name='Житель · излечен';e.cured=true;}
   this.emit('release',{id:e.id});this.log(e.name+': окаменение завершено.');
  }
  hit(id,kind,raw=4){const e=this.state.entities.find(x=>x.id===id);if(!e?.alive||!e.stone)return false;
   if(['fire','lava','drown','freeze','starve','hot_floor'].includes(kind)){this.emit('immune',{id});return 0;}
   const amount=damage(raw,kind,e.armor,e.toughness);e.hp=Math.max(0,e.hp-amount);if(e.hp===0){e.alive=false;e.stone=false;e.endAt=0;}
   this.emit('hit',{id,amount});return amount;
  }
  bounce(o,nx,ny,nz,floor){
   const speed=Math.hypot(o.vx,o.vy,o.vz);if(speed<.1){o.vx=o.vy=o.vz=0;return;}
   let dot=o.vx*nx+o.vy*ny+o.vz*nz;if(dot>=0){nx=-nx;ny=-ny;nz=-nz;dot=-dot;}
   const k=floor?(o.charged ? .52 : .38):(o.charged ? .74 : .60);
   o.vx=(o.vx-2*dot*nx)*k;o.vy=(o.vy-2*dot*ny)*k;o.vz=(o.vz-2*dot*nz)*k;
   if(floor){o.vx*=.96;o.vy=Math.abs(o.vy);o.vz*=.96;}else o.vy*=.98;
   if(Math.hypot(o.vx,o.vy,o.vz)<.1)o.vx=o.vy=o.vz=0;
   o.spin*=-1;this.emit('bounce');
  }
  orbTick(){const o=this.state.orb;if(!o)return;o.age++;if(o.cooldown>0)o.cooldown--;
   // ThrowableItemProjectile's 0.99 drag/gravity, followed by Orb's air update.
   const prev={x:o.x,y:o.y,z:o.z};o.x+=o.vx;o.y+=o.vy;o.z+=o.vz;
   if(o.y<=.05){o.y=.051;
    if(o.spent){o.vx=o.vy=o.vz=0;o.ground=true;}
    else if(o.vy<0){this.bounce(o,0,1,0,true);o.ground=o.vy===0;}
   }
   // A small illustrative stone wall: the wave itself does not collide with it.
   if((prev.x-2)*(o.x-2)<0&&Math.abs(o.z)<3.5&&o.y<2.7){o.x=2+(prev.x<2?-.061:.061);if(o.spent)o.vx=o.vy=o.vz=0;else this.bounce(o,prev.x<2?-1:1,0,0,false);}
   for(const e of this.state.entities){if(e.id==='owner'||!e.alive||(o.lastEntity===e.id&&o.cooldown>0))continue;
    const dx=o.x-e.x,dy=o.y-(e.y+e.height*.5),dz=o.z-e.z,n=Math.hypot(dx,dy,dz);
    if(n<.65&&n>.00001){if(o.spent)o.vx=o.vy=o.vz=0;else this.bounce(o,dx/n,dy/n,dz/n,false);o.lastEntity=e.id;o.cooldown=5;}
   }
   if(o.ground){const h=Math.hypot(o.vx,o.vz);if(h>.045){o.vx*=.88;o.vz*=.88;}else o.vx=o.vz=0;o.vy=0;}
   else{o.vx*=.99;o.vz*=.99;o.vy=o.vy*.99-.075;o.vx*=.992;o.vy*=.992;o.vz*=.992;
    if(o.age>2&&o.vx*o.vx+o.vy*o.vy+o.vz*o.vz>.04){const n=Math.hypot(o.vx,o.vz);if(n>.00001){const x=o.vx,z=o.vz;o.vx+=-z/n*.0035*o.spin;o.vz+=x/n*.0035*o.spin;}}
   }
   if(o.charged&&this.state.time>=o.deadline){this.pulse(o,o.radius);o.charged=false;o.spent=true;o.deadline=0;o.vx=o.vy=o.vz=0;o.ground=false;this.state.item.charged=false;this.emit('discharge');}
  }
  tick(n=1){for(let step=0;step<n;step++){
   const s=this.state;s.time++;
   if(s.item.owned&&s.item.armed&&s.time>=s.item.deadline){this.pulse({x:this.owner.x,y:this.owner.y,z:this.owner.z},s.item.radius);s.item.charged=false;s.item.armed=false;s.item.deadline=0;this.emit('discharge');}
   this.orbTick();
   // Do not erase the last visual until the next tick: render the final shell once.
   s.waves=s.waves.filter(w=>!w.done);
   for(const w of s.waves){const r=Math.min(w.radius,(s.time-w.start+1)*1.6);w.current=r;
    for(const e of s.entities){if(!e.alive||!w.candidates.includes(e.id)||w.hit.includes(e.id))continue;
     if((e.x-w.x)**2+(e.y+e.height*.5-w.y)**2+(e.z-w.z)**2<=r*r){w.hit.push(e.id);this.petrify(e);}}
    if(r>=w.radius)w.done=true;
   }
   for(const e of s.entities){if(!e.alive)continue;
    if(e.stone){if(s.time>=e.endAt){this.release(e);continue;}
     e.vy=e.inWater?-.42:Math.max(-.8,e.vy-.08);e.y=Math.max(0,e.y+e.vy);if(e.y===0)e.vy=0;
     e.harmful=0;if(s.time%20===0){e.hp=Math.min(e.maxHP,e.hp+e.maxHP*.15);this.emit('heal',{id:e.id});}
    }else{e.walk+=.1;e.beneficial=Math.max(0,e.beneficial-1);e.harmful=Math.max(0,e.harmful-1);}
   }
  }}
  remaining(){const i=this.state.item,o=this.state.orb;return o?.charged?Math.max(0,o.deadline-this.state.time):i.armed?Math.max(0,i.deadline-this.state.time):0;}
  snapshot(){return copy(this.state);}
 }
 const api={Model,caps,delayTicks,playerDuration,mobDuration,toolFactor,damage,keys,fresh};
 if(typeof module==='object'&&module.exports)module.exports=api;root.P28Core=api;
})(typeof window!=='undefined'?window:globalThis);
