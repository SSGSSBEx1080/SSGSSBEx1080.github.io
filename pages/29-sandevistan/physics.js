/* Pure 20-TPS stand. SandevistanCapability's FLOAT operations/order are preserved,
 * including queued reductions, the 6000-tick recovery clock and critical latch.
 * Arena movement/combat are illustrative, not a full Minecraft implementation. */
(function(root){'use strict';
 const F=Math.fround,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),copy=x=>JSON.parse(JSON.stringify(x));
 const keys={brewed:'01_brewed',obtained:'02_obtained',activated:'03_activated',injected:'04_injected',kill:'05_kill',death:'06_death'};
 function fresh(){return{version:1,t:0,alive:true,hp:20,chest:'netherite',inCity:true,doses:3,ritualReady:false,binding:false,vanishing:false,
  accelerating:false,accelerationTicks:0,psychosis:0,psychosisActive:false,psychosisTicks:0,cooldown:0,inCutscene:false,cutsceneTicks:0,tolerance:1,ticksSinceLastUse:0,psychosisToReduce:0,nausea:0,using:null,buffTail:0,
  player:{x:0,y:0,z:2,yaw:180,walk:0},trail:[],peerTrail:[],inputs:{x:0,z:0},log:[],targetHP:20,hurtLock:0,lastHitAt:-100,
  targets:[{id:'mob',kind:'mob',name:'Зомби',x:0,y:0,z:-.6,vx:.025,vz:0,freeze:0,blind:0,alive:true},{id:'peer',kind:'player',name:'Второй игрок',x:7,y:0,z:-6,vx:0,vz:.02,freeze:0,blind:0,alive:true,active:0},{id:'corner',kind:'mob',name:'Угол области',x:19,y:0,z:21,vx:0,vz:0,freeze:0,blind:0,alive:true}],tnt:null,arrow:null};}
 class Model{
  constructor(saved){this.state=fresh();this.events=[];if(saved?.version===1&&Number.isSafeInteger(saved.t)&&saved.t>=0&&saved.player&&Array.isArray(saved.targets)){try{const s=copy(saved);if(!Number.isFinite(s.psychosis)||!Number.isFinite(s.player.x)||s.targets.length!==3)throw Error('invalid');s.trail=Array.isArray(s.trail)?s.trail.slice(-100):[];s.peerTrail=Array.isArray(s.peerTrail)?s.peerTrail.slice(-100):[];s.log=Array.isArray(s.log)?s.log.slice(-8):[];s.inputs={x:0,z:0};this.state=s;}catch(_){}}}
  emit(type,data={}){this.events.push({type,...data});}
  drain(){const e=this.events;this.events=[];return e;}
  log(text){this.state.log.push({t:this.state.t,text});this.state.log=this.state.log.slice(-8);this.emit('log',{text});}
  award(k){this.emit('adv',{key:keys[k]});}
  brew({potion='strong_regeneration',type='potion',eye=true,bottles=3}={}){if(type!=='potion'||potion!=='strong_regeneration'||!eye)return false;const n=clamp(Math.trunc(bottles),1,3);this.state.doses+=n;this.award('brewed');this.log('Регенерация II + Око Энда: '+n+' дозы.');return true;}
  requestInstall(){const s=this.state;if(!s.alive||s.inCutscene||s.chest==='sandevistan'||!s.inCity||s.chest!=='netherite'||s.doses<2)return false;s.ritualReady=true;this.award('brewed');this.log('Иммуносупрессант в обеих руках. Проверка условий — раз в 20 тиков.');return true;}
  toggle(){const s=this.state;if(!s.alive||s.chest!=='sandevistan'||s.psychosisActive||s.inCutscene)return false;
   if(s.accelerating){s.accelerating=false;s.cooldown=100;this.emit('sound',{name:'deactivate'});this.log('Ускорение отключено вручную. Откат — 5 секунд.');return true;}
   if(s.cooldown!==0||s.psychosis>=100)return false;s.accelerating=true;s.accelerationTicks=0;s.ticksSinceLastUse=0;this.award('activated');this.emit('sound',{name:'activate'});this.log('Sandevistan ACTIVE. Скорость V / Спешка IV / Сила III.');return true;
  }
  inject(){const s=this.state;if(!s.alive||s.chest!=='sandevistan'||s.accelerating||s.doses<1||s.using)return false;s.using={kind:'inject',remaining:32,total:32};this.log('Инъекция: 32 тика.');return true;}
  food(){const s=this.state;if(!s.alive||s.using||s.inCutscene)return false;s.using={kind:'food',remaining:32,total:32};return true;}
  cancelUse(){this.state.using=null;}
  finishUse(){const s=this.state,u=s.using;s.using=null;if(u.kind==='food'){this.emit('food');this.log('Использование еды завершено.');return;}
   s.doses=Math.max(0,s.doses-1);
   if(s.chest==='sandevistan'&&!s.accelerating){
    const amount=s.psychosisActive?0:F(50*s.tolerance);
    if(!s.psychosisActive){s.psychosisToReduce=F(s.psychosisToReduce+amount);s.tolerance=Math.max(0,F(s.tolerance-F(.05)));}
    s.nausea=40;this.award('injected');this.emit('sound',{name:'injection'});this.log(amount?'Доза: −'+amount.toFixed(1)+' пункта, по 1 за тик.':'Критическая фаза уже запущена. Новая доза её не отменяет.');
   }else this.log('Доза потрачена без эффекта: ускорение уже активно.');
  }
  movement(x,z){this.state.inputs={x:clamp(Number(x)||0,-1,1),z:clamp(Number(z)||0,-1,1)};}
  attack(){const s=this.state,m=s.targets[0],d=Math.hypot(m.x-s.player.x,m.z-s.player.z);if(!s.alive||s.inCutscene||!m.alive||d>3.3)return false;
   if(s.accelerating)s.hurtLock=0;if(s.hurtLock>0)return false;
   // Standard unarmed stand: native target i-frames are removed, not the weapon's
   // own attack recovery. Strength III adds 9; no armor/enchantments on this dummy.
   const recovery=Math.min(1,(s.t-s.lastHitAt)/5),damage=(1+(s.buffTail>0?9:0))*(.2+.8*recovery*recovery);s.lastHitAt=s.t;s.hurtLock=10;s.targetHP=Math.max(0,s.targetHP-damage);this.emit('hit',{damage});
   if(s.targetHP<=0){m.alive=false;if(s.accelerating)this.award('kill');this.log('Манекен побеждён'+(s.accelerating?' во время ускорения.':'.'));}return true;
  }
  resetTarget(){const s=this.state;s.targetHP=20;s.targets[0].alive=true;s.targets[0].x=s.player.x;s.targets[0].z=s.player.z-2.6;}
  ignite(){const s=this.state;if(!s.alive||s.inCutscene)return false;s.tnt={id:'tnt',kind:'tnt',name:'ТНТ',x:s.player.x+3,y:0,z:s.player.z-3,vx:0,vz:0,freeze:0,blind:0,fuse:80,alive:true};return true;}
  shoot(){const s=this.state;if(!s.alive||s.inCutscene)return false;s.arrow={id:'arrow',kind:'arrow',name:'Стрела',x:s.player.x-8,y:1.4,z:s.player.z-2,vx:.6,vz:0,freeze:0,blind:0,alive:true};return true;}
  peer(){this.state.targets[1].active=100;}
  die(){const s=this.state;if(!s.alive)return;s.alive=false;s.hp=0;s.chest='empty';s.using=null;this.award('death');this.emit('death');this.log('Имплант удалён. Киберпсихоз завершился гибелью субъекта.');}
  inside(e){const p=this.state.player,half=e.kind==='tnt'?.49:e.kind==='arrow'?.25:.3,height=e.kind==='tnt'?.98:e.kind==='arrow'?.5:1.95;return e.x+half>p.x-20.3&&e.x-half<p.x+20.3&&e.y+height>p.y-20&&e.y<p.y+21.8&&e.z+half>p.z-20.3&&e.z-half<p.z+20.3;}
  freeze(e){if(e.freeze===0){e.saved={vx:e.vx,vz:e.vz,fuse:e.fuse};e.poseTick=this.state.t;this.emit('freeze',{id:e.id});}e.freeze=3;}
  tick(n=1){for(let step=0;step<n;step++){
   const s=this.state;s.t++;if(!s.alive){s.trail.splice(0,4);s.peerTrail.splice(0,4);for(const e of [...s.targets,...(s.tnt?[s.tnt]:[]),...(s.arrow?[s.arrow]:[])]){if(e.freeze>0)e.freeze--;else if(e.alive){e.x+=e.vx;e.z+=e.vz;if(e.kind==='tnt')e.fuse--;}}continue;}const was=s.accelerating;
   if(s.nausea>0)s.nausea--;
   if(s.using){if(s.accelerating&&s.using.remaining>1)s.using.remaining=1;s.using.remaining--;if(s.using.remaining<=0)this.finishUse();}
   s.ticksSinceLastUse++;if(s.ticksSinceLastUse%6000===0)s.tolerance=Math.min(1,F(s.tolerance+F(.05)));
   if(s.inCutscene){s.cutsceneTicks++;if(s.cutsceneTicks>100){s.inCutscene=false;s.cutsceneTicks=0;}}
   if(s.cooldown>0)s.cooldown--;if(s.buffTail>0)s.buffTail--;if(s.hurtLock>0)s.hurtLock--;
   if(s.psychosisToReduce>0){const amount=Math.min(s.psychosisToReduce,1);s.psychosis=Math.max(0,F(s.psychosis-amount));s.psychosisToReduce=F(s.psychosisToReduce-amount);}
   if(s.accelerating){s.accelerationTicks++;s.psychosis=F(s.psychosis+F(.2));if(s.psychosis>=100){s.psychosis=100;s.accelerating=false;s.psychosisActive=true;s.psychosisTicks=0;this.emit('sound',{name:'psychosis'});this.log('CRITICAL: CYBERPSYCHOSIS. Новая инъекция уже не поможет.');}else if(s.accelerationTicks>=100){s.accelerating=false;s.cooldown=100;}}
   if(s.psychosisActive)s.psychosisTicks++;
   if(was&&!s.accelerating&&!s.psychosisActive){this.emit('sound',{name:'deactivate'});this.log('Пять секунд истекли. Откат — 100 тиков.');}
   if(s.inCutscene){const t=s.cutsceneTicks;if(t<40)s.player.y+=.05;else if(t>=90)s.player.y=Math.max(0,s.player.y-.2);
    if(t===1)this.emit('ritualStart');if(t===99){s.chest='sandevistan';this.award('obtained');this.emit('installed');this.log('Имплант установлен в слот нагрудника.');}}
   if(s.chest==='sandevistan'&&!s.binding){s.binding=true;s.vanishing=true;}
   if(s.psychosisActive){const p=Math.min(1,s.psychosisTicks/200);if(Math.random()<.1+p*.9){s.player.x=clamp(s.player.x+(Math.random()-.5)*(.5+p*2.5),-25,25);s.player.z=clamp(s.player.z+(Math.random()-.5)*(.5+p*2.5),-25,25);}
    if(s.psychosisTicks%5===0){const r=2+p*13,d=5+p*45;for(const e of s.targets){if(e.alive&&Math.abs(e.x-s.player.x)<=r+.3&&Math.abs(e.z-s.player.z)<=r+.3){if(e.id==='mob'){s.targetHP=Math.max(0,s.targetHP-d);if(!s.targetHP)e.alive=false;}}}this.emit('psychosisBurst',{radius:r,damage:d});}
    if(s.psychosisTicks%10===0)s.hp=Math.max(0,s.hp-(1+p*4));if(s.psychosisTicks>=200||s.hp<=0)this.die();
   }
   const moving=s.alive&&!s.inCutscene&&!s.psychosisActive;if(s.accelerating)s.buffTail=2;
   let vx=0,vz=0;if(moving){const length=Math.hypot(s.inputs.x,s.inputs.z),speed=.21585*(s.buffTail?2:1);if(length){vx=s.inputs.x/length*speed;vz=s.inputs.z/length*speed;s.player.x=clamp(s.player.x+vx,-24,24);s.player.z=clamp(s.player.z+vz,-24,24);s.player.yaw=Math.atan2(-vx,vz)*180/Math.PI;}s.player.walk++;}
   s.player.speed=Math.hypot(vx,vz);
   const entities=[...s.targets,...(s.tnt?[s.tnt]:[]),...(s.arrow?[s.arrow]:[])];
   for(const e of entities){if(!e.alive)continue;if(e.active>0)e.active--;if(e.blind>0)e.blind--;
    if(!e.freeze){e.x+=e.vx;e.z+=e.vz;if(e.kind==='tnt'){e.fuse--;if(e.fuse<=0){e.alive=false;this.emit('tnt');}}if(e.x>24||e.x<-24)e.vx=-e.vx;if(e.z>20||e.z<-20)e.vz=-e.vz;}
    if(s.accelerating&&this.inside(e)&&!(e.kind==='player'&&e.active>0))this.freeze(e);
    if(e.freeze>0){e.freeze--;if(e.kind==='tnt')e.fuse=e.saved?.fuse??e.fuse;if(e.freeze===0){e.blind=e.kind==='mob'||e.kind==='player'?60:0;this.emit('unfreeze',{id:e.id});}}
   }
   const peer=s.targets[1];if(peer.active>0){s.peerTrail.push({x:peer.x,y:peer.y,z:peer.z-.6,yaw:0,swing:s.t*.3,amount:.06,tick:s.t});if(s.peerTrail.length>100)s.peerTrail.shift();}else s.peerTrail.splice(0,4);
   if(s.accelerating){const r=s.player.yaw*Math.PI/180;s.trail.push({x:s.player.x+Math.sin(r)*.6,y:s.player.y,z:s.player.z-Math.cos(r)*.6,yaw:s.player.yaw,swing:s.t*.3,amount:Math.min(1,Math.hypot(vx,vz)*3),tick:s.t});if(s.trail.length>100)s.trail.shift();}else s.trail.splice(0,4);
   if(s.t%20===0&&!s.inCutscene&&s.ritualReady&&s.chest==='netherite'&&s.inCity&&s.doses>=2){s.doses-=2;s.ritualReady=false;s.inCutscene=true;s.cutsceneTicks=0;this.log('Город Энда, незеритовый нагрудник, две дозы: ритуал начался.');}
  }}
  snapshot(){return copy(this.state);}
 }
 const api={Model,fresh,keys};if(typeof module==='object'&&module.exports)module.exports=api;root.P29Core=api;
})(typeof window!=='undefined'?window:globalThis);
