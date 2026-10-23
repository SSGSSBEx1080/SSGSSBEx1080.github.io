/* A top-down playable illustration of the real suction cone. No WebGL dependency:
   devices without GPU still get aiming, acceleration, filtering, crops and storage. */
(() => {
  'use strict';
  const app=window.P26APP,cv=document.querySelector('#floorCanvas'),g=cv.getContext('2d');if(!app||!g)return;
  const {state:S,items,byId,icon}=app, $=s=>document.querySelector(s), reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const images={};for(const item of items){const im=new Image();im.src=icon(item.id);images[item.id]=im;}
  const machine=new Image();machine.src=icon('vacuum_icon');
  let w=900,h=450,u=30,ox=450,oy=385,angle=0,scene='mine',loose=[],crops=[],seen=false,last=0,ticks=0,serial=0,collected=0,burst=[];
  function resize(){const r=cv.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.5);w=r.width;h=r.height;u=Math.min(w/21,(h-35)/11.5);ox=w*.5;oy=h*.87;cv.width=Math.round(w*d);cv.height=Math.round(h*d);g.setTransform(d,0,0,d,0,0);}
  new ResizeObserver(resize).observe(cv);new IntersectionObserver(es=>seen=es[0].isIntersecting,{rootMargin:'60px'}).observe(cv);resize();
  const mine=['diamond','coal','raw_iron','raw_gold','emerald','stone','cobblestone','bread','stick','feather'];
  const warehouse=['chest','oak_log','iron_ingot','redstone','hopper','bread','wheat','apple','stone','feather','diamond','anvil'];
  function drop(id,x,z){loose.push({key:serial++,id,x,z,vx:0,vz:0,pull:0,phase:Math.random()*6.28,rot:(Math.random()-.5)*.5});}
  function spawn(n=14){const pool=scene==='mine'?mine:scene==='farm'?['carrot','potato','wheat','bread']:warehouse;for(let i=0;i<n&&loose.length<64;i++){const x=(Math.random()-.5)*15,z=2+Math.random()*7.4;drop(pool[i%pool.length],x,z);}if(!loose.some(x=>Math.hypot(x.x,x.z)<4&&app.matches(byId(x.id))))drop('diamond',.2,2.8);refresh();}
  function selectRoom(key){app.stop();scene=key;loose=[];crops=[];collected=0;burst=[];angle=0;
    document.querySelectorAll('[data-room]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.room===scene)));
    $('#roomName').textContent={mine:'ПОСЛЕ ШАХТЫ',warehouse:'ВЕСЬ СКЛАД',farm:'НА ФЕРМЕ'}[scene];$('#regrow').hidden=scene!=='farm';
    if(scene==='farm'){for(let z=0;z<3;z++)for(let x=0;x<4;x++)crops.push({x:(x-1.5)*1.8,z:3.7+z*2.1,ripe:true});for(let i=0;i<5;i++)drop(['carrot','potato','wheat','bread','feather'][i],(i-2)*2,2+Math.abs(i-2));app.log('На ферме нужен режим «Еда». Наведи на зрелую пшеницу: после сбора останется росток.');}
    else{spawn(22);app.log(scene==='mine'?'После шахты остались и руда, и булыжник. Фильтр решает, что забрать.':'Здесь всё вперемешку. Выбери, что действительно нужно.');}
    refresh();
  }
  function inside(x,z){const d=Math.hypot(x,z);return d>0&&d<=app.range()&&(Math.sin(angle)*x+Math.cos(angle)*z)/d>=Math.cos(.30+S.power*.025);}
  function refresh(){
    const remaining=loose.length+crops.filter(x=>x.ripe).length;$('#roomRemaining').textContent='На полу: '+remaining;
    const matched=loose.filter(x=>app.matches(byId(x.id))).length+(S.mode==='food'?crops.filter(x=>x.ripe).length:0);
    const complete=collected>0&&matched===0;$('#roomEmpty').hidden=!complete;
    if(complete){$('#roomEmpty strong').textContent=remaining?'Нужное — внутри.':'Чисто.';$('#roomEmpty span').textContent=remaining?'Остальное осталось на полу. Можно сменить фильтр.':'Всё, что лежало, теперь у тебя.';}
  }
  function update(){
    if(document.hidden||!seen)return;ticks++;
    if(S.active&&S.mode==='food'&&ticks%10===0){let harvested=0;for(const crop of crops){if(crop.ripe&&inside(crop.x,crop.z)&&harvested<32){crop.ripe=false;drop('wheat',crop.x,crop.z);harvested++;}}if(harvested){app.log('Зрелая пшеница срезана. Растение осталось на месте и снова молодое.');refresh();}}
    let changed=false;
    for(let i=loose.length-1;i>=0;i--){const x=loose[i],d=Math.hypot(x.x,x.z),selected=app.matches(byId(x.id));
      if(S.active&&selected&&inside(x.x,x.z)){
        if(d<=1.8){const n=app.insert(x.id,1);if(n){loose.splice(i,1);collected++;changed=true;if(!reduced.matches)for(let k=0;k<4;k++)burst.push({x:ox,y:oy-15,vx:(Math.random()-.5)*3,vy:-Math.random()*3-1,life:14});app.log(byId(x.id).name+' — внутри. '+S.caught+' предметов в этом экземпляре.');continue;}else{app.log('Нет места. Забери содержимое или установи сундук.');}}
        x.pull++;const accel=.015+S.power*.006+Math.min(.34,x.pull*.006),speed=Math.min(accel,d*.30);
        x.vx=x.vx*.5-x.x/d*speed;x.vz=x.vz*.5-x.z/d*speed;
      }else{x.vx*=.65;x.vz*=.65;}
      x.x+=x.vx;x.z+=x.vz;
    }
    if(changed)refresh();
  }
  function aim(e){const r=cv.getBoundingClientRect(),x=(e.clientX-r.left-ox)/u,z=(oy-(e.clientY-r.top))/u;angle=Math.atan2(x,z);}
  let pointer=null;
  cv.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointer=e.pointerId;aim(e);cv.setPointerCapture(e.pointerId);cv.classList.add('engaged');app.hold(true,'floor');});
  cv.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||pointer===e.pointerId)aim(e);});
  function release(){pointer=null;cv.classList.remove('engaged');app.hold(false,'floor');}
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>cv.addEventListener(ev,release));
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  cv.addEventListener('wheel',e=>{e.preventDefault();app.setPower(S.power+(e.deltaY<0?1:-1));},{passive:false});
  cv.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight',' '].includes(e.key)){e.preventDefault();if(e.key===' ')app.hold(true,'floor-key');else angle+=e.key==='ArrowLeft'?-.14:.14;}});
  cv.addEventListener('keyup',e=>{if(e.key===' '){e.preventDefault();app.hold(false,'floor-key');}});cv.addEventListener('blur',()=>{release();app.hold(false,'floor-key');});
  document.querySelectorAll('[data-room]').forEach(b=>b.addEventListener('click',()=>selectRoom(b.dataset.room)));
  $('#spawnBtn').addEventListener('click',()=>{spawn();app.log('Новая россыпь. Старое содержимое пылесоса никуда не делось.');});
  $('#scatterAgain').addEventListener('click',()=>{collected=0;spawn(14);});
  $('#regrow').addEventListener('click',()=>{crops.forEach(x=>x.ripe=true);collected=0;refresh();app.log('Демонстрация: грядка снова выросла. В Minecraft растения растут своим ходом.');});
  function sprite(id,x,y,size,rotation=0,alpha=1){const image=images[id];if(!image||!image.complete||!image.naturalWidth)return;g.save();g.translate(x,y);g.rotate(rotation);g.globalAlpha=alpha;g.imageSmoothingEnabled=false;g.drawImage(image,-size/2,-size/2,size,size);g.restore();}
  function draw(t){
    requestAnimationFrame(draw);if(t-last<40)return;last=t;if(!seen||document.hidden)return;
    g.clearRect(0,0,w,h);g.fillStyle=scene==='farm'?'#d0d7b8':'#e6e5d5';g.fillRect(0,0,w,h);
    const tile=Math.max(35,u*1.9);g.strokeStyle=scene==='farm'?'#b5c3a1':'#d4d7c4';g.lineWidth=1;
    for(let x=ox%tile;x<w;x+=tile){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}
    for(let y=oy%tile;y<h;y+=tile){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
    // Small wear marks belong to the floor, not to the collectable item count.
    g.fillStyle=scene==='farm'?'#b5c39e':'#c9cebb';for(let i=0;i<38;i++){const x=(i*137.8+41)%w,y=(i*63.4+37)%h;g.fillRect(x,y,2+(i%3),2);}
    for(const c of crops){const x=ox+c.x*u,y=oy-c.z*u;g.fillStyle='#9c9871';g.fillRect(x-u*.7,y-u*.65,u*1.4,u*1.3);g.fillStyle='#b8af7c';g.fillRect(x-u*.6,y-u*.55,u*1.2,2);if(c.ripe)sprite('wheat',x,y,Math.min(39,u*1.5));else{g.strokeStyle='#78966a';g.lineWidth=2;g.beginPath();g.moveTo(x,y+6);g.lineTo(x,y-4);g.moveTo(x,y);g.lineTo(x-5,y-3);g.moveTo(x,y+2);g.lineTo(x+5,y-1);g.stroke();}}
    // True cone angle and true range, projected onto this small tabletop.
    const a=.30+S.power*.025,r=app.range()*u;
    g.save();g.translate(ox,oy);g.rotate(angle);g.beginPath();g.moveTo(0,0);g.arc(0,0,r,-Math.PI/2-a,-Math.PI/2+a);g.closePath();g.fillStyle=S.active?'#c1814e20':'#9aaa8d16';g.fill();g.strokeStyle=S.active?'#b67a4a8a':'#9daa8c60';g.lineWidth=1;g.setLineDash([6,7]);g.stroke();g.setLineDash([]);
    if(S.active&&!reduced.matches){g.strokeStyle='#c2966670';for(let i=0;i<5;i++){const z=((t*.06+i*37)%r),width=Math.tan(a)*z*.8;g.beginPath();g.moveTo(-width,-z);g.quadraticCurveTo(0,-z+12,width,-z);g.stroke();}}
    g.restore();
    for(const x of loose){const selected=app.matches(byId(x.id)),px=ox+x.x*u,py=oy-x.z*u,size=Math.min(w<600?30:39,u*1.55),bob=reduced.matches?0:Math.sin(t*.002+x.phase)*1.8;
      g.fillStyle=selected?'#58704a26':'#58704a14';g.beginPath();g.ellipse(px,py+size*.35,size*.37,size*.11,0,0,Math.PI*2);g.fill();
      sprite(x.id,px,py+bob,size,x.rot+(S.active&&inside(x.x,x.z)&&selected&&!reduced.matches?t*.003:0),selected?1:.5);
    }
    // The original item icon is the nozzle/player marker, not a made-up vacuum image.
    g.save();g.translate(ox,oy);g.rotate(angle);g.fillStyle='#5368462a';g.beginPath();g.ellipse(1,14,42,11,0,0,Math.PI*2);g.fill();if(machine.complete&&machine.naturalWidth){g.imageSmoothingEnabled=false;g.drawImage(machine,-42,-30,84,84);}else{g.fillStyle='#4a7575';g.fillRect(-18,-17,36,39);}g.restore();
    const aimX=ox+Math.sin(angle)*Math.min(r,100),aimY=oy-Math.cos(angle)*Math.min(r,100);g.strokeStyle='#71886e';g.lineWidth=1;g.beginPath();g.moveTo(aimX-4,aimY);g.lineTo(aimX+4,aimY);g.moveTo(aimX,aimY-4);g.lineTo(aimX,aimY+4);g.stroke();
    for(let i=burst.length-1;i>=0;i--){const p=burst[i];p.x+=p.vx;p.y+=p.vy;p.life--;g.globalAlpha=p.life/14;g.fillStyle='#c28a59';g.fillRect(p.x,p.y,3,3);if(p.life<=0)burst.splice(i,1);}g.globalAlpha=1;
    g.font='9px monospace';g.textAlign='center';g.fillStyle='#7b8c70';g.fillText(S.active?'ПОТОК ВКЛЮЧЁН':'НАВЕДИ И ЗАЖМИ',ox,h-13);
  }
  window.P26FLOOR={spawn,refresh,selectRoom,get items(){return loose;},get crops(){return crops;},get angle(){return angle;}};
  setInterval(update,50);selectRoom('mine');requestAnimationFrame(draw);
})();
