/* Два экрана Сандевистана: 01 — вечный забег (декоративная петля нейро-кэша),
 * 02 — натурный стенд замедления времени. Числа честные, из physics.js:
 * разгон 100 тиков, откат 100, ход ×2, шлейф −4/тик после выключения,
 * нагрузка +0.2/тик, заморозка AABB ±20 блока с сохранением импульса и фитиля.
 * Вьюпорт адаптивный: на узких экранах логическая ширина меньше, мир крупнее. */
(()=>{'use strict';
 const $=s=>document.querySelector(s);
 const IMG={};const pic=p=>(IMG[p]||(IMG[p]=Object.assign(new Image(),{src:p})));
 const TEX={steve:'../../assets/textures/hub/av/steve.png',zombie:'../../assets/textures/hub/av/zombie.png',creeper:'../../assets/textures/hub/av/creeper.png',anvil:'../../assets/textures/mc/van/block_anvil.png',sand:'../../assets/textures/mc/p2/block_sand.png',tnt:'../../assets/textures/mc/van/block_tnt_side.png',arrow:'../../assets/textures/mc/van/item_arrow.png'};
 for(const k in TEX)pic(TEX[k]);
 const fmt=n=>Number(n).toLocaleString('ru-RU',{minimumFractionDigits:1,maximumFractionDigits:1});
 /* канвас с devicePixelRatio и живой логической шириной: pick() смотрит clientWidth */
 function setupCanvas(cv,lh,pick,onResize){const g=cv.getContext&&cv.getContext('2d');if(!g)return null;
  const S={lw:pick(),lh};let k=1;
  const resize=()=>{const nlw=pick();if(nlw!==S.lw){S.lw=nlw;onResize&&onResize(nlw);}
   const d=Math.min(devicePixelRatio||1,2);const cw=cv.clientWidth||S.lw;k=cw/S.lw*d;
   cv.width=Math.max(2,Math.round(S.lw*k));cv.height=Math.max(2,Math.round(S.lh*k));};
  resize();if(window.ResizeObserver)new ResizeObserver(resize).observe(cv);else addEventListener('resize',resize);
  return{g,begin(){g.setTransform(k,0,0,k,0,0);g.imageSmoothingEnabled=false;},get w(){return S.lw;},h:lh};}
 const face=(g,p,x,y,s)=>{const f=pic(p);if(f.complete&&f.naturalWidth)g.drawImage(f,x,y,s,s);else{g.fillStyle='#89adb4';g.fillRect(x,y,s,s);}};

 /* ── фигурка персонажа: ноги-руки анимируются фазой pose (0..1) ── */
 function figure(g,x,y,pose,o={}){const{tint=null,alpha=1,boost=false,face:fc=TEX.steve,lean=0,arms='run'}=o;
  g.save();g.translate(x,y);g.globalAlpha=alpha;if(lean)g.transform(1,0,-lean,1,0,0);
  const ph=Math.sin(pose*Math.PI*2),ph2=Math.sin(pose*Math.PI*2+Math.PI);
  const cT=tint||'#2b3348',cL=tint||'#1d2434';
  g.fillStyle=cL;g.fillRect(-6+ph*4,-13,5,13);g.fillRect(1+ph2*4,-13,5,13);      // ноги
  g.fillStyle=cT;g.fillRect(-7,-30,14,18);                                        // корпус
  if(!tint&&boost){g.fillStyle='#39e9da';g.fillRect(-3,-27,6,9);}                 // имплант светится
  g.fillStyle=cL;
  if(arms==='run'){g.fillRect(-10+ph2*3,-29,4,14);}                               // рука
  else if(arms==='zombie'){g.fillRect(-10,-27,16,4);}                             // руки вперёд
  else{g.fillRect(-10,-29,4,14);g.fillRect(6,-29,4,14);}
  if(tint){g.fillStyle=tint;g.fillRect(-8,-47,16,16);}else face(g,fc,-8,-47,16); // голова
  g.restore();}
 /* крипер и зомби: пиксельные тельца с настоящими лицами */
 function creeperFig(g,x,y,o={}){const{tint=null,alpha=1,swell=0,frozen=false}=o;const s=1+swell*.22;
  g.save();g.translate(x,y);g.scale(s,s);g.globalAlpha=alpha;
  g.fillStyle=tint||'#388e3c';g.fillRect(-7,-16,14,16);g.fillStyle=tint||'#2c6e30';g.fillRect(-7,-6,3,6);g.fillRect(4,-6,3,6);
  if(tint)g.fillRect(-8,-31,16,16);else face(g,TEX.creeper,-8,-31,16);
  if(frozen){g.fillStyle='rgba(57,233,218,.4)';g.fillRect(-9,-33,18,33);}
  g.restore();}
 function zombieFig(g,x,y,o={}){const{tint=null,alpha=1,frozen=false}=o;
  g.save();g.translate(x,y);g.globalAlpha=alpha;
  g.fillStyle=tint||'#2c6e74';g.fillRect(-7,-30,14,18);g.fillStyle=tint||'#232a4d';g.fillRect(-6,-13,5,13);g.fillRect(1,-13,5,13);
  g.fillStyle=tint||'#2c6e74';g.fillRect(-11,-27,17,4);
  if(tint)g.fillRect(-8,-47,16,16);else face(g,TEX.zombie,-8,-47,16);
  if(frozen){g.fillStyle='rgba(57,233,218,.35)';g.fillRect(-11,-47,22,47);}
  g.restore();}
 function anvilFig(g,x,y,s=1.5,frozen=false){const f=pic(TEX.anvil);g.save();g.translate(x,y);g.scale(s/16,s/16);
  if(f.complete&&f.naturalWidth){const p=g.createPattern(f,'repeat');if(p){g.fillStyle=p;}else g.fillStyle='#4a4a52';}else g.fillStyle='#4a4a52';
  g.beginPath();g.moveTo(0,-22);g.lineTo(16,-22);g.lineTo(16,-14);g.lineTo(11,-14);g.lineTo(10,-10);g.lineTo(13,-10);g.lineTo(13,-4);g.lineTo(15,0);g.lineTo(1,0);g.lineTo(3,-4);g.lineTo(3,-10);g.lineTo(6,-10);g.lineTo(5,-14);g.lineTo(0,-14);g.closePath();g.fill();
  g.strokeStyle='#14161f';g.lineWidth=1.5;g.stroke();
  if(frozen){g.fillStyle='rgba(57,233,218,.35)';g.fillRect(-1,-24,18,25);}
  g.restore();}
 function blockFig(g,p,x,y,s,frozen,blink){const f=pic(p);g.save();g.translate(x,y);
  if(blink&&!frozen){g.fillStyle='#fff';g.fillRect(0,0,s*.22,s);}
  if(f.complete&&f.naturalWidth)g.drawImage(f,0,0,s,s);else{g.fillStyle='#8a7a5a';g.fillRect(0,0,s,s);}
  if(frozen){g.fillStyle='rgba(57,233,218,.35)';g.fillRect(-1,-1,s+2,s+2);}
  g.restore();}
 function arrowFig(g,x,y,ang,frozen){const f=pic(TEX.arrow);g.save();g.translate(x,y);g.rotate(ang);
  if(f.complete&&f.naturalWidth)g.drawImage(f,-11,-5.5,22,11);
  if(frozen){g.strokeStyle='#39e9da';g.lineWidth=1.5;g.strokeRect(-12,-7,24,14);}
  g.restore();}
 const RGB=a=>`rgb(${Math.round(a*255)},255,${Math.round((1-a)*255)})`; // шлейф как в оригинале: сине→жёлтый

 /* ══════════════════ 01 · ВЕЧНЫЙ ЗАБЕГ ══════════════════ */
 (()=>{const cv=$('#runner2d');if(!cv)return;
  const pick=()=>{const cw=cv.clientWidth||960;return cw<560?640:cw<820?820:960;};
  const C=setupCanvas(cv,300,pick);if(!C)return;const{g,begin,h}=C;
  const GROUND=246,SPEED=2.6,BOOST=5.2;
  let seen=true;if(window.IntersectionObserver)new IntersectionObserver(e=>seen=e[0].isIntersecting,{rootMargin:'120px'}).observe(cv);
  const R={phase:'run',t:0,lap:1,wx:0,py:0,vy:0,pose:0,trail:[],events:[],objs:[],pops:[],dust:[],flash:0};
  const stars=Array.from({length:46},(_,i)=>({fx:((i*173)%1000)/1000,y:(i*97)%150+8,tw:(i*37)%100}));
  const pop=(x,y,txt,c='#eef638')=>R.pops.push({x,y,txt,c,life:46});
  const dust=(x,y,n,c='#9adfe4')=>{for(let i=0;i<n;i++)R.dust.push({x,y,vx:(Math.random()-.5)*4,vy:-Math.random()*3.4,life:26+Math.random()*18,c});};
  function planLap(w){R.events=[];const pool=['hurdle','gap','dummy','creeper','anvil','arrow'],used=new Set(),n=2+(Math.random()*2|0);
   for(let i=0;i<n;i++){const k=pool[Math.random()*pool.length|0];if(used.has(k))continue;used.add(k);
    R.events.push({k,wx:R.wx+w*.36+Math.random()*w*.86,done:false});}}
  planLap(C.w);
  const jump=()=>{if(R.py===0)R.vy=-6.4;};
  function explode(x,y){dust(x,y,22,'#ffb35a');dust(x,y,10,'#f54d62');pop(x,y-30,'БУМ','#f54d62');ZM.sfx('anvil',.45);ZM.sfx('stone',.5);R.flash=.6;}
  function tick(){const w=C.w,PX=w*.26;R.t++;const boost=R.phase==='boost';const sp=boost?BOOST:SPEED;R.wx+=sp;R.pose=(R.pose+(boost?.17:.1))%1;
   if(R.py>0||R.vy!==0){R.vy+=.5;R.py-=R.vy;if(R.py<=0){R.py=0;R.vy=0;dust(PX,GROUND,4,'#57707a');}}
   if(boost)R.trail.push({wx:R.wx,py:R.py,pose:R.pose});else R.trail.splice(0,4);
   if(R.trail.length>100)R.trail.splice(0,R.trail.length-100);
   if(R.flash>0)R.flash-=.06;
   /* фазы: честные длины */
   if(R.phase==='run'&&R.t>=40){R.phase='boost';R.t=0;R.flash=1;P29Sound.play('activate');pop(PX,GROUND-70,'SANDEVISTAN','#39e9da');}
   else if(R.phase==='boost'&&R.t>=100){R.phase='cool';R.t=0;P29Sound.play('deactivate');}
   else if(R.phase==='cool'&&R.t>=100){R.phase='run';R.t=0;R.lap++;planLap(w);pop(PX,GROUND-70,'ЦИКЛ '+R.lap+' · НОВАЯ ТРАССА','#eef638');}
   /* препятствия текущего цикла */
   for(const ev of R.events){if(ev.done)continue;const sx=ev.wx-R.wx+PX;
    if(sx>w+60)continue;
    if(!ev.spawned){ev.spawned=true;
     if(ev.k==='hurdle')ev.o={y:0};
     if(ev.k==='gap')ev.o={};
     if(ev.k==='dummy')ev.o={y:0,hp:1};
     if(ev.k==='creeper')ev.o={y:0,fuse:-1,frozen:false};
     if(ev.k==='anvil')ev.o={h:8,vy:0,landed:false};
     if(ev.k==='arrow')ev.o={ax:w+50};
    }
    const o=ev.o;
    if(ev.k==='hurdle'){if(sx-PX<52&&R.py===0)jump();}
    if(ev.k==='gap'){const gx=ev.wx-R.wx+PX;if(gx-PX<60&&gx-PX>10&&R.py===0)jump();}
    if(ev.k==='dummy'&&sx-PX<34){ev.done=true;ZM.sfx('hit',.6,.8);pop(sx,GROUND-58,boost?'CRIT ×10':'×1',boost?'#f54d62':'#9adfe4');
     R.objs.push({k:'dummy',x:sx,y:0,vx:7,vy:-4,rot:0,life:40});}
    if(ev.k==='creeper'){
     if(boost&&sx-PX<170&&!o.frozen){o.frozen=true;}
     if(!boost&&o.frozen){o.frozen=false;o.fuse=30;}
     if(!o.frozen&&o.fuse<0&&sx-PX<120)o.fuse=30;
     if(o.fuse>=0){o.fuse--;if(o.fuse<=0){ev.done=true;explode(sx,GROUND-14);}}}
    if(ev.k==='anvil'){
     if(!boost&&!o.landed){o.vy=(o.vy||0)+.34;o.h=Math.max(0,o.h-o.vy);
      if(o.h===0){o.landed=true;ZM.sfx('anvil',.5);ZM.sfx('stone',.6);dust(sx,GROUND,10,'#8b9aa6');}}}
    if(ev.k==='arrow'){if(!boost)o.ax-=3.4;if(o.ax<-60)ev.done=true;}
    if(sx<-80)ev.done=true;
   }
   for(const o of R.objs){o.x+=o.vx;o.y+=o.vy;o.vy+=.3;o.rot+=.3;o.life--;}
   R.objs=R.objs.filter(o=>o.life>0);
   for(const p of R.pops){p.y-=.7;p.life--;}R.pops=R.pops.filter(p=>p.life>0);
   for(const d of R.dust){d.x+=d.vx;d.y+=d.vy;d.vy+=.18;d.life--;}R.dust=R.dust.filter(d=>d.life>0);
   hud();
  }
  function hud(){$('#runPhase').textContent=R.phase==='boost'?'РАЗГОН ×2':R.phase==='cool'?'ОТКАТ':'БЕГ';
   $('#runTime').textContent=R.phase==='boost'?(R.t/20).toFixed(1)+' / 5.0 с':'0.0 / 5.0 с';
   $('#runCool').textContent=R.phase==='cool'?(R.t/20).toFixed(1)+' / 5.0 с':'—';
   $('#runTrail').textContent=R.trail.length+' / 100';
   $('#runLap').textContent=R.lap;}
  function draw(){const w=C.w,PX=w*.26;begin();
   const boost=R.phase==='boost';
   const sky=g.createLinearGradient(0,0,0,GROUND);sky.addColorStop(0,'#050a12');sky.addColorStop(1,boost?'#0b2530':'#0a141d');g.fillStyle=sky;g.fillRect(0,0,w,GROUND);
   for(const s of stars){g.globalAlpha=.35+.4*Math.abs(Math.sin((R.t+s.tw)*.02));g.fillStyle='#bfe9ef';g.fillRect(s.fx*w,s.y,2,2);}g.globalAlpha=1;
   g.fillStyle='#d9f7e9';g.beginPath();g.arc(w*.82,58,26,0,7);g.fill();g.fillStyle='#0a141d';g.beginPath();g.arc(w*.82+10,50,22,0,7);g.fill();
   /* два слоя города с параллаксом */
   for(let layer=0;layer<2;layer++){const par=R.wx*(layer?.42:.16)%220;g.fillStyle=layer?'#101f2b':'#0b1620';
    for(let i=-1;i<7;i++){const bx=i*220-par;const bh=60+((i*53+layer*31)%5)*26;
     g.fillRect(bx,GROUND-bh-(layer?26:70),120+(i*29)%60,bh+(layer?26:70));
     if(layer){g.fillStyle='#eef63822';for(let wy=0;wy<bh-20;wy+=26)for(let wx=0;wx<3;wx++)if((i*7+wy+wx)%3===0)g.fillRect(bx+14+wx*32,GROUND-bh+8-(layer?26:70)+wy,6,8);g.fillStyle='#101f2b';}}}
   g.fillStyle='#08111a';g.fillRect(0,GROUND,w,h-GROUND);
   g.strokeStyle=boost?'#39e9da66':'#1f4b55';g.lineWidth=2;g.beginPath();g.moveTo(0,GROUND);g.lineTo(w,GROUND);g.stroke();
   g.strokeStyle='#123039';g.lineWidth=1;for(let i=0;i<21;i++){const x=((i*(w/20)-(R.wx%48))%w+w)%w;g.beginPath();g.moveTo(x,GROUND);g.lineTo(x-26,h);g.stroke();}
   if(boost){g.strokeStyle='#39e9da2e';for(let i=0;i<9;i++){const y=30+((i*67+R.t*9)%230);const len=60+(i*37)%120;const x=w-((R.t*26+i*211)%(w+140));g.beginPath();g.moveTo(x,y);g.lineTo(x+len,y);g.stroke();}}
   /* дыры-гэпы закрашиваем фоном */
   for(const ev of R.events)if(ev.k==='gap'&&ev.spawned){const gx=ev.wx-R.wx+PX;if(gx>-90&&gx<w+90){g.fillStyle='#04070c';g.fillRect(gx,GROUND,70,h-GROUND);g.strokeStyle='#39e9da55';g.strokeRect(gx+.5,GROUND+.5,69,h-GROUND);}}
   /* шлейф: каждое послесвечение — копия позы, тон сине→жёлтый */
   for(let i=0;i<R.trail.length;i++){const s=R.trail[i],a=(i+1)/R.trail.length,x=PX-(R.wx-s.wx);
    if(x>-40)figure(g,x,GROUND-s.py,s.pose,{tint:RGB(a),alpha:a*.5,boost:true,lean:.12});}
   /* препятствия */
   for(const ev of R.events){if(!ev.spawned||ev.done&&ev.k!=='anvil')continue;const sx=ev.wx-R.wx+PX;if(sx<-80||sx>w+80)continue;const o=ev.o;
    if(ev.k==='hurdle'){g.fillStyle='#2a3d46';g.fillRect(sx-9,GROUND-26,18,26);g.fillStyle='#3c565f';g.fillRect(sx-9,GROUND-26,18,5);g.strokeStyle='#14161f';g.strokeRect(sx-9.5,GROUND-26.5,19,26);}
    if(ev.k==='dummy')zombieFig(g,sx,GROUND,{frozen:R.phase==='boost'});
    if(ev.k==='creeper')creeperFig(g,sx,GROUND,{frozen:!!o.frozen,swell:o.fuse>=0?(30-o.fuse)/30*.8:0});
    if(ev.k==='anvil')anvilFig(g,sx,GROUND-o.h*40,1.5,R.phase==='boost'&&!o.landed);
    if(ev.k==='arrow')arrowFig(g,o.ax,196,Math.PI*.75,R.phase==='boost');
   }
   for(const o of R.objs){if(o.k==='dummy'){g.save();g.translate(o.x,GROUND+o.y);g.rotate(o.rot);zombieFig(g,0,0,{});g.restore();}}
   /* сам бегун */
   figure(g,PX,GROUND-R.py,R.pose,{boost,lean:boost?.14:0});
   if(boost){g.strokeStyle='#39e9da88';g.lineWidth=2;g.strokeRect(PX-14,GROUND-R.py-50,28,52);}
   for(const d of R.dust){g.globalAlpha=Math.min(1,d.life/26);g.fillStyle=d.c;g.fillRect(d.x,d.y,3,3);}g.globalAlpha=1;
   g.font='800 13px Cyber,monospace';g.textAlign='center';
   for(const p of R.pops){g.globalAlpha=Math.min(1,p.life/20);g.fillStyle='#000';g.fillText(p.txt,p.x+1,p.y+1);g.fillStyle=p.c;g.fillText(p.txt,p.x,p.y);}g.globalAlpha=1;
   if(R.flash>0){g.fillStyle=`rgba(57,233,218,${R.flash*.16})`;g.fillRect(0,0,w,h);}
  }
  let acc=0,last=performance.now();
  setInterval(()=>{const now=performance.now();if(document.hidden||!seen){last=now;return;}acc+=Math.min(250,now-last);last=now;let n=Math.floor(acc/50);if(!n)return;acc-=n*50;while(n--)tick();},25);
  (function raf(){requestAnimationFrame(raf);if(!document.hidden&&seen)draw();})();
 })();

 /* ══════════════════ 02 · СТЕНД ЗАМЕДЛЕНИЯ ══════════════════ */
 (()=>{const cv=$('#slow2d');if(!cv)return;
  const V={u:24,fw:40};
  const apply=lw=>{if(lw>=860){V.u=24;V.fw=40;}else if(lw>=600){V.u=24;V.fw=31;}else{V.u=20;V.fw=28;}};
  const pick=()=>{const cw=cv.clientWidth||960;return cw<560?560:cw<820?760:960;};
  const C=setupCanvas(cv,360,pick,apply);if(!C)return;const{g,begin,h}=C;
  const GY=312;
  let seen=false;if(window.IntersectionObserver)new IntersectionObserver(e=>seen=e[0].isIntersecting).observe(cv);else seen=true;
  const S={px:12,php:20,dir:0,t:0,boost:0,cool:0,load:0,crit:0,dead:0,hurt:0,shake:0,trail:[],ents:[],pops:[],parts:[],marks:[],peer:false,hover:false,drag:null};
  window.P29SLOW={get hover(){return S.hover;}};
  const X=x=>x*V.u+V.u/2;
  const pop=(x,y,txt,c='#eef638')=>S.pops.push({x,y,txt,c,life:50});
  const parts=(x,y,n,c)=>{for(let i=0;i<n;i++)S.parts.push({x,y,vx:(Math.random()-.5)*7,vy:-Math.random()*5,life:24+Math.random()*20,c});};
  const heartsEl=$('#slowHearts');
  function buildHearts(){heartsEl.innerHTML='';for(let i=0;i<10;i++){const el=document.createElement('i');heartsEl.appendChild(el);}}
  buildHearts();
  function reset(msg){S.ents=[];S.marks=[];S.pops=[];S.parts=[];S.load=0;S.php=20;S.boost=0;S.cool=0;S.crit=0;S.dead=0;S.peer=false;
   const pb=$('[data-spawn="peer"]');if(pb)pb.setAttribute('aria-pressed','false');
   if(msg)pop(X(S.px),GY-120,msg,'#39e9da');}
  function damage(n,silent){if(S.dead||S.crit)return;S.php=Math.max(0,S.php-n);S.hurt=8;
   if(!silent){pop(X(S.px),GY-66,'−'+n,'#f54d62');ZM.sfx('hit',.55,.9);}
   if(S.php<=0){S.dead=100;pop(X(S.px),GY-90,'СУБЪЕКТ ПОГИБ','#f54d62');ZM.sfx('anvil',.5,.6);}}
  function explode(x,y,radius,maxD){parts(x,y,26,'#ffb35a');parts(x,y,12,'#f54d62');S.marks.push({x,y:0,life:200});S.shake=10;ZM.sfx('anvil',.45);ZM.sfx('stone',.5);
   const d=Math.abs(x/V.u-.5-S.px);if(d<radius)damage(Math.max(1,Math.round(max*(1-d/radius))));
   pop(x,y-36,'БУМ','#f54d62');}
  function toggleV(){if(S.dead||S.crit)return;
   if(S.boost){S.boost=0;S.cool=100;P29Sound.play('deactivate');}
   else if(S.cool>0){pop(X(S.px),GY-84,'ОТКАТ '+fmt(S.cool/20)+' с','#eef638');ZM.sfx('click',.6,.7);}
   else{S.boost=100;P29Sound.play('activate');pop(X(S.px),GY-84,'SANDEVISTAN ×2','#39e9da');}}
  /* управление */
  $('#slowV').addEventListener('click',toggleV);
  $('#slowReset').addEventListener('click',()=>reset('СТЕНД СБРОШЕН'));
  const setDir=d=>{S.dir=d;};
  for(const[id,d]of[['#padL',-1],['#padR',1]]){const b=$(id);if(!b)continue;
   b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);setDir(d);});
   for(const n of['pointerup','pointercancel','lostpointercapture'])b.addEventListener(n,()=>{if(S.dir===d)setDir(0);});}
  cv.addEventListener('pointerenter',()=>S.hover=true);cv.addEventListener('pointerleave',()=>S.hover=false);
  cv.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;const r=cv.getBoundingClientRect();S.drag=(e.clientX-r.left)/r.width*V.fw;setDir(Math.sign(S.drag-S.px)||0);cv.setPointerCapture(e.pointerId);});
  cv.addEventListener('pointermove',e=>{if(S.drag==null)return;const r=cv.getBoundingClientRect();S.drag=(e.clientX-r.left)/r.width*V.fw;setDir(Math.abs(S.drag-S.px)>.4?Math.sign(S.drag-S.px):0);});
  for(const n of['pointerup','pointercancel'])cv.addEventListener(n,()=>{S.drag=null;setDir(0);});
  const keys=new Set(),editable=e=>e.target.closest('input,select,textarea,[contenteditable]');
  document.addEventListener('keydown',e=>{if(!seen||editable(e))return;
   if(e.code==='ArrowLeft'||e.code==='ArrowRight'){e.preventDefault();keys.add(e.code);setDir(e.code==='ArrowRight'?1:-1);}
   if(e.code==='KeyV'&&S.hover&&!e.repeat){e.preventDefault();toggleV();}});
  document.addEventListener('keyup',e=>{keys.delete(e.code);if(!keys.size&&S.drag==null)setDir(0);else if(keys.size)setDir(keys.has('ArrowRight')?1:-1);});
  /* кнопки сущностей */
  document.querySelectorAll('[data-spawn]').forEach(b=>b.addEventListener('click',()=>{
   if(S.ents.length>14){pop(X(S.px),GY-84,'СЛИШКОМ МНОГО СУЩНОСТЕЙ','#eef638');return;}
   const k=b.dataset.spawn,x=S.px,FW=V.fw;
   if(k==='peer'){if(S.peer){S.ents=S.ents.filter(e=>e.kind!=='peer');S.peer=false;b.setAttribute('aria-pressed','false');return;}
    S.ents.push({kind:'peer',x:x<FW/2?FW-3:3,y:0,vx:.3,freeze:0,blind:0});S.peer=true;b.setAttribute('aria-pressed','true');ZM.sfx('equip',.5);return;}
   if(k==='anvil'||k==='sand')S.ents.push({kind:k,x:Math.min(FW-1,Math.max(1,x+(-4+Math.random()*8))),y:12,vy:0,freeze:0,blind:0,landed:0,life:999});
   if(k==='arrow')S.ents.push({kind:'arrow',x:1.2,y:1.55,vx:.6,vy:-.01,freeze:0,blind:0,life:999});
   if(k==='tnt'){S.ents.push({kind:'tnt',x:Math.min(FW-1,Math.max(1,x+(-6+Math.random()*12))),y:0,fuse:80,freeze:0,blind:0,life:999});ZM.sfx('click',.5,.6);}
   if(k==='creeper'||k==='zombie'){const side=x<FW/2?FW-2:2;S.ents.push({kind:k,x:side,y:0,vx:0,fuse:-1,freeze:0,blind:0,wv:0,life:999});ZM.sfx(k==='zombie'?'cloth':'pop',.4,k==='creeper'?.7:1);}
  }));
  function tick(){S.t++;const w=C.w;
   if(S.dead){if(!--S.dead)reset('НОВЫЙ СУБЪЕКТ');hud();return;}
   if(S.crit){S.crit--;
    if(S.crit===0){reset('КИБЕРПСИХОЗ · СТЕНД ПЕРЕЗАПУЩЕН');}
    hud();return;}
   const boost=S.boost>0,FW=V.fw;
   /* субъект: скорость 0.21585 блока/тик, в разгоне ×2 */
   if(!S.dead){S.px=Math.min(FW-.6,Math.max(.6,S.px+.21585*(boost?2:1)*S.dir));
    if(boost){S.trail.push({x:S.px,pose:(S.t*.2)%1});S.load=Math.min(100,S.load+.2);
     if(S.load>=100){S.crit=50;S.boost=0;S.cool=0;P29Sound.play('psychosis');ZM.sfx('anvil',.5,.55);}}
    else S.trail.splice(0,4);
    if(S.trail.length>100)S.trail.splice(0,S.trail.length-100);}
   if(boost&&!--S.boost<=0){S.cool=100;P29Sound.play('deactivate');}
   if(S.cool>0)S.cool--;
   if(S.hurt>0)S.hurt--;if(S.shake>0)S.shake--;
   /* сущности: заморозка честная — AABB ±20.3, импульс и фитиль сохраняются */
   for(const e of S.ents){
    const inside=Math.abs(e.x-S.px)<=20.3;
    const canFreeze=boost&&inside&&e.kind!=='peer';
    if(canFreeze){if(!e.frozen){e.frozen=true;e.svx=e.vx;e.sfuse=e.fuse;}}
    else if(e.frozen){e.frozen=false;e.vx=e.svx??e.vx;if(e.fuse>=0)e.fuse=e.sfuse??e.fuse;
     if(e.kind==='creeper'||e.kind==='zombie'){e.blind=60;e.wv=(Math.random()<.5?-1:1)*.09;}}
    if(e.frozen)continue;
    if(e.blind>0){e.blind--;if(e.kind==='creeper'||e.kind==='zombie')e.x=Math.min(FW-1,Math.max(1,e.x+e.wv));continue;}
    if(e.kind==='anvil'||e.kind==='sand'){e.vy=Math.min(3.9,e.vy+.08);e.y-=e.vy;
     if(!e.hit&&Math.abs(e.x-S.px)<.75&&e.y<2.2&&e.y>0){e.hit=true;damage(e.kind==='anvil'?8:4);}
     if(e.y<=0){e.y=0;if(!e.landed){e.landed=1;ZM.sfx(e.kind==='anvil'?'anvil':'cloth',.5,e.kind==='anvil'?.8:.7);ZM.sfx('stone',.4);parts(X(e.x),GY,8,'#8b9aa6');if(--e.life<0)e.dead=true;}else if(--e.life<160)e.dead=true;}}
    if(e.kind==='arrow'){e.x+=e.vx;e.vy+=.0015;e.y-=e.vy;
     if(!e.stick&&Math.abs(e.x-S.px)<.55&&Math.abs(e.y-1.5)<1.1){damage(3);e.stick=true;e.dead=true;}
     if(e.x>FW+1||e.y<=0)e.dead=true;}
    if(e.kind==='tnt'){e.fuse--;if(e.fuse<=0){e.dead=true;explode(X(e.x),GY-V.u/2,4,24);}}
    if(e.kind==='creeper'){const d=S.px-e.x;e.x+=Math.sign(d)*.23;
     if(e.fuse<0&&Math.abs(d)<2.5){e.fuse=30;ZM.sfx('pop',.5,.55);}
     if(e.fuse>=0){e.fuse--;if(e.fuse<=0){e.dead=true;explode(X(e.x),GY-V.u*.6,3,20);}}}
    if(e.kind==='zombie'){const d=S.px-e.x;e.x+=Math.sign(d)*.23;
     if(Math.abs(d)<1.35&&S.t%20===0){damage(3);S.px=Math.min(FW-.6,Math.max(.6,S.px+Math.sign(-d)*.8));}}
    if(e.kind==='peer'){e.x+=e.vx;if(e.x>FW-2||e.x<2)e.vx=-e.vx;}
   }
   S.ents=S.ents.filter(e=>!e.dead);
   for(const p of S.pops){p.y-=.8;p.life--;}S.pops=S.pops.filter(p=>p.life>0);
   for(const p of S.parts){p.x+=p.vx;p.y+=p.vy;p.vy+=.22;p.life--;}S.parts=S.parts.filter(p=>p.life>0);
   for(const m of S.marks)m.life--;S.marks=S.marks.filter(m=>m.life>0);
   hud();
  }
  function hud(){const vb=$('#slowV');if(vb){vb.classList.toggle('active',S.boost>0);vb.classList.toggle('ready',S.boost===0&&S.cool===0&&!S.crit&&!S.dead);}
   const hs=heartsEl.children;
   for(let i=0;i<10;i++){const v=S.php-i*2;hs[i].className=v>=2?'full':v>=1?'half':'empty';}
   $('#slowTimer').textContent=S.boost?(S.boost/20).toFixed(1)+' / 5.0 с':S.cool?'ОТКАТ':S.crit?'ПСИХОЗ':'ГОТОВ';
   $('#slowCool').textContent=S.cool?fmt(S.cool/20)+' с':'—';
   $('#slowTrail').textContent=S.trail.length+' / 100';
   $('#slowLoad').textContent=Math.round(S.load)+'%';
   $('#slowTicks').textContent=S.t+' т';}
  function draw(){const w=C.w,u=V.u;begin();
   g.save();if(S.shake>0)g.translate((Math.random()-.5)*S.shake,(Math.random()-.5)*S.shake);
   const boost=S.boost>0;
   const sky=g.createLinearGradient(0,0,0,GY);sky.addColorStop(0,'#050a12');sky.addColorStop(1,'#081521');g.fillStyle=sky;g.fillRect(0,0,w,GY);
   for(let i=0;i<26;i++){g.globalAlpha=.3;g.fillStyle='#bfe9ef';g.fillRect((i*167)%w,(i*71)%140+10,2,2);}g.globalAlpha=1;
   g.fillStyle='#08111a';g.fillRect(0,GY,w,h-GY);
   g.strokeStyle='#1f4b55';g.lineWidth=2;g.beginPath();g.moveTo(0,GY);g.lineTo(w,GY);g.stroke();
   g.strokeStyle='#0f2830';g.lineWidth=1;for(let i=0;i<=V.fw;i++){g.beginPath();g.moveTo(i*u+.5,GY);g.lineTo(i*u+.5,h);g.stroke();}
   g.fillStyle='#31555f';g.font='9px monospace';g.textAlign='left';
   for(let i=0;i<V.fw;i+=5)g.fillText(i,(i*u+3)|0,GY+12);
   /* зона заморозки ±20.3 блока — как в моде, AABB */
   if(boost){const zl=Math.max(0,(S.px-20.3)*u),zr=Math.min(w,(S.px+20.3)*u);
    g.fillStyle='rgba(57,233,218,.045)';g.fillRect(zl,0,zr-zl,GY);
    g.setLineDash([7,6]);g.strokeStyle='#39e9dabb';g.lineWidth=2;
    g.beginPath();g.moveTo(zl,0);g.lineTo(zl,GY);g.moveTo(zr,0);g.lineTo(zr,GY);g.stroke();g.setLineDash([]);
    g.fillStyle='#39e9da';g.font='800 10px Cyber,monospace';g.textAlign='center';
    if(zl>30)g.fillText('−20',zl,16);if(zr<w-30)g.fillText('+20',zr,16);}
   for(const m of S.marks){g.globalAlpha=Math.min(1,m.life/200)*.5;g.fillStyle='#04070c';g.beginPath();g.ellipse(m.x,GY+3,u*1.1,u*.3,0,0,7);g.fill();}g.globalAlpha=1;
   /* шлейф субъекта */
   for(let i=0;i<S.trail.length;i++){const s=S.trail[i],a=(i+1)/S.trail.length;
    figure(g,X(s.x),GY,s.pose,{tint:RGB(a),alpha:a*.5,boost:true,lean:.1});}
   /* сущности */
   for(const e of S.ents){const x=X(e.x),y=GY-e.y*u;
    if(e.kind==='anvil')anvilFig(g,x,GY-e.y*u,u*1.5,e.frozen);
    if(e.kind==='sand')blockFig(g,TEX.sand,x-u/2,GY-e.y*u-u,u,e.frozen,false);
    if(e.kind==='tnt')blockFig(g,TEX.tnt,x-u/2,GY-u,u,e.frozen,e.fuse<30&&Math.floor(S.t/4)%2===0);
    if(e.kind==='arrow')arrowFig(g,x,GY-e.y*u,Math.atan2(-e.vy,e.vx)-Math.PI/4,e.frozen);
    if(e.kind==='creeper')creeperFig(g,x,GY,{frozen:e.frozen,swell:e.fuse>=0?(30-e.fuse)/30*.9:0});
    if(e.kind==='zombie')zombieFig(g,x,GY,{frozen:e.frozen});
    if(e.kind==='peer'){figure(g,x,GY,(S.t*.12)%1,{boost:true,face:TEX.steve});
     g.strokeStyle='#39e9dabb';g.strokeRect(x-u*.55,GY-50,u*1.1,52);
     g.fillStyle='#39e9da';g.font='800 9px Cyber,monospace';g.textAlign='center';g.fillText('PEER · SANDEVISTAN',x,GY-58);
     if(boost){g.fillStyle='rgba(57,233,218,.12)';g.fillRect(x-u*.67,GY-52,u*1.34,54);}}
    if(e.frozen&&e.kind!=='peer'){g.fillStyle='#39e9da';g.font='800 9px Cyber,monospace';g.textAlign='center';g.fillText('FROZEN',x,GY+14);}
    if(e.blind>0&&(e.kind==='zombie'||e.kind==='creeper')){g.fillStyle='#c9d34a';g.font='9px monospace';g.textAlign='center';g.fillText('blind '+e.blind,x,GY+14);}
   }
   /* субъект */
   if(!S.dead)figure(g,X(S.px),GY,(S.t*(boost?.2:.11))%1,{boost,lean:boost?.12:0});
   if(S.hurt>0){g.fillStyle=`rgba(245,77,98,${S.hurt/8*.35})`;g.fillRect(0,0,w,h);}
   for(const p of S.parts){g.globalAlpha=Math.min(1,p.life/24);g.fillStyle=p.c;g.fillRect(p.x,p.y,4,4);}g.globalAlpha=1;
   g.font='800 13px Cyber,monospace';g.textAlign='center';
   for(const p of S.pops){g.globalAlpha=Math.min(1,p.life/20);g.fillStyle='#000';g.fillText(p.txt,p.x+1,p.y+1);g.fillStyle=p.c;g.fillText(p.txt,p.x,p.y);}g.globalAlpha=1;
   g.restore();
   if(boost){g.fillStyle='rgba(57,233,218,.05)';g.fillRect(0,0,w,h);g.strokeStyle='#39e9da55';g.strokeRect(1,1,w-2,h-2);}
   if(S.crit){g.fillStyle=`rgba(169,0,35,${.25+.15*Math.sin(S.t*.6)})`;g.fillRect(0,0,w,h);
    g.fillStyle='#ff586d';g.font='800 34px Cyber,monospace';g.textAlign='center';g.fillText('КИБЕРПСИХОЗ',w/2,150);
    g.font='11px monospace';g.fillText('критическая фаза — стенд перезапустится',w/2,172);}
   if(S.dead){g.fillStyle='rgba(4,7,12,.72)';g.fillRect(0,0,w,h);
    g.fillStyle='#f54d62';g.font='800 30px Cyber,monospace';g.textAlign='center';g.fillText('СУБЪЕКТ ПОГИБ',w/2,160);
    g.fillStyle='#9cb9ba';g.font='11px monospace';g.fillText('имплант исчез вместе с носителем — новый субъект на подходе',w/2,184);}
  }
  let acc=0,last=performance.now();
  setInterval(()=>{const now=performance.now();if(document.hidden||!seen){last=now;return;}acc+=Math.min(250,now-last);last=now;let n=Math.floor(acc/50);if(!n)return;acc-=n*50;while(n--)tick();},25);
  (function raf(){requestAnimationFrame(raf);if(!document.hidden&&seen)draw();})();
 })();
})();
