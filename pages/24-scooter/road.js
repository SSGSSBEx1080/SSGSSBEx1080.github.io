/* A tiny illustrated road. All motion, riders and instruments observe P24TRIP;
   there is no canned 'speed demo' disconnected from the vehicle.
   The scenery is drawn from the real 16x16 Minecraft textures (1:1, no blur). */
(() => {
  'use strict';
  const cv=document.querySelector('#roadCanvas'), g=cv.getContext('2d');
  const trip=window.P24TRIP;if(!g||!trip)return;
  const {state:s,types}=trip, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const scooter=new Image();scooter.src='../../assets/textures/p24/scooter_side.png';
  const faces={};
  for(const name of ['steve','iron_golem','villager','pig','zombie','enderman']) {const i=new Image();i.src='../../assets/textures/hub/av/'+name+'.png';faces[name]=i;}
  /* ванильные текстуры мира: ровно те, что лежат в игре */
  const VAN='../../assets/textures/mc/van/';
  const tex={};
  const load=(key,file,fw,fh)=>{const i=new Image();i.onload=()=>pats();i.src=VAN+file;tex[key]={img:i,w:fw||16,h:fh||16};};
  load('grass','block_grass_block_top_tint.png');
  load('grassSide','block_grass_block_side.png');
  load('dirt','block_dirt.png');
  load('log','block_oak_log.png');
  load('logTop','block_oak_log_top.png');
  load('leaves','block_oak_leaves_tint.png');
  load('stone','block_cobblestone.png');
  load('hay','block_hay_block_top.png');
  load('honey','block_honey_block_top.png');
  load('water','block_water_still_tint.png',16,16);
  let w=900,h=380,visible=false,last=0;
  new IntersectionObserver(es=>visible=es[0].isIntersecting,{rootMargin:'80px'}).observe(cv);
  function size(){const r=cv.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.5);w=r.width;h=r.height;cv.width=Math.round(w*d);cv.height=Math.round(h*d);g.setTransform(d,0,0,d,0,0);}
  new ResizeObserver(size).observe(cv);size();
  function polygon(points,color){g.fillStyle=color;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();}
  /* Тайл-текстура: рисуем блок 16x16 без растяжения мыла — как в игре */
  const T=16;
  function pattern(t,fallback,base){
    const c=document.createElement('canvas');c.width=c.height=T;const x=c.getContext('2d');x.imageSmoothingEnabled=false;
    if(base){x.fillStyle=base;x.fillRect(0,0,T,T);}
    if(t&&t.img.complete&&t.img.naturalWidth){x.drawImage(t.img,0,0,t.w,t.h,0,0,T,T);}
    else if(fallback&&!base){x.fillStyle=fallback;x.fillRect(0,0,T,T);}
    else if(!t&&!fallback&&!base)return null;
    return x.createPattern(c,'repeat');
  }
  let pat={};
  function pats(){
    pat={grass:pattern(tex.grass,'#3b6247'),dirt:pattern(tex.dirt,'#6b4f34'),stone:pattern(tex.stone,'#4a4a4a'),
      hay:pattern(tex.hay,'#b9a24f'),honey:pattern(tex.honey,'#d99b2b'),water:pattern(tex.water,'#3b6ea5','#2a4f8a'),
      side:pattern(tex.grassSide,'#6b4f34'),log:pattern(tex.log,'#4a3a25'),leaves:pattern(tex.leaves,'#3b6247')};
  }
  pats();
  function mountain(base,amp,color,offset){const pts=[[-40,h]];for(let x=-40;x<w+50;x+=30)pts.push([x,base-Math.round((Math.sin((x+offset)*.009)+Math.sin((x+offset)*.021)*.35)*amp/9)*9]);pts.push([w+50,h]);polygon(pts,color);}
  function cloud(x,y,s){
    g.fillStyle='#cfe0e0';g.beginPath();
    g.ellipse(x,y,34*s,15*s,0,0,Math.PI*2);g.ellipse(x+26*s,y-9*s,24*s,13*s,0,0,Math.PI*2);g.ellipse(x-24*s,y-5*s,20*s,11*s,0,0,Math.PI*2);g.fill();
    g.fillStyle='#e8f2f0';g.beginPath();g.ellipse(x+6*s,y-6*s,26*s,10*s,0,0,Math.PI*2);g.fill();
  }
  /* Дерево из настоящих текстур: ствол oak_log, крона oak_leaves */
  function tree(x,y,scale){
    const B=Math.max(9,Math.round(16*scale));           /* один блок в сцене */
    const th=Math.round(B*2.2),tw=Math.max(6,Math.round(B*.8));
    g.imageSmoothingEnabled=false;
    /* ствол — блок дубового бревна */
    if(tex.log.img.complete&&tex.log.img.naturalWidth)g.drawImage(tex.log.img,0,0,16,16,x-tw/2,y-th,tw,th);
    else{g.fillStyle='#4a3a25';g.fillRect(x-tw/2,y-th,tw,th);}
    /* крона — блоки листвы, как в игре: плотная «шапка» с тёмной подложкой */
    const leaf=(lx,ly)=>{
      g.fillStyle='#2f5136';g.fillRect(lx,ly,B,B);
      if(tex.leaves.img.complete&&tex.leaves.img.naturalWidth)g.drawImage(tex.leaves.img,0,0,16,16,lx,ly,B,B);
    };
    const top=y-th;
    const rows=[[[-1,0],[0,0],[1,0]],[[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1]],[[-1,-2],[0,-2],[1,-2]]];
    rows.forEach((row,ri)=>row.forEach(([dx,dy])=>{
      const lx=Math.round(x+dx*B-B/2),ly=Math.round(top+dy*B-B*0.2);
      leaf(lx,ly);
    }));
    /* солнечный блик на кроне */
    g.fillStyle='#9cc86b40';g.fillRect(Math.round(x-B*1.5),Math.round(top-B*2.2),Math.round(B),Math.round(B*.3));
  }
  function rider(id,x,y,scale,driver){
    const face=id==='player'?'steve':types[id]?.[3], img=faces[face];
    const palette=id==='iron_golem'?['#c2c1af','#e0d9c1']:id==='zombie'?['#548777','#435b75']:id==='pig'?['#b77e75','#d5a798']:['#53758a','#7fa2b1'];
    g.save();g.translate(x,y);g.scale(scale,scale);
    g.fillStyle=palette[0];g.fillRect(-8,-47,6,28);g.fillRect(3,-47,6,28);
    g.fillStyle=palette[1];g.fillRect(-13,-83,26,37);
    if(driver){g.fillRect(6,-82,36,7);g.fillStyle='#c49d80';g.fillRect(36,-82,9,7);}else{g.fillRect(-19,-80,7,34);g.fillRect(12,-80,7,34);}
    if(img&&img.complete&&img.naturalWidth){g.imageSmoothingEnabled=false;g.drawImage(img,-15,-112,30,30);}else{g.fillStyle='#d8d6bb';g.fillRect(-15,-112,30,30);g.fillStyle='#536250';g.font='bold 10px monospace';g.textAlign='center';g.fillText(({ravager:'Р',cow:'К',wolf:'В',chicken:'Ц'})[id]||'?',0,-92);}
    g.restore();
  }
  function draw(t){
    requestAnimationFrame(draw);if(t-last<40)return;last=t;if(!visible||document.hidden)return;
    const motion=reduced.matches?0:s.distance*7;
    g.clearRect(0,0,w,h);
    /* небо */
    const sky=g.createLinearGradient(0,0,0,h*.72);
    sky.addColorStop(0,'#0d2733');sky.addColorStop(.55,'#1d4a4e');sky.addColorStop(1,'#2c6257');
    g.fillStyle=sky;g.fillRect(0,0,w,h);
    g.fillStyle='#dbeaa6';g.beginPath();g.arc(w*.73,74,30,0,Math.PI*2);g.fill();
    g.fillStyle='#e9f5c6';g.beginPath();g.arc(w*.73,74,22,0,Math.PI*2);g.fill();
    for(let i=0;i<5;i++){const x=((i*300-motion*.05)%(w+320)+(w+320))%(w+320)-160;cloud(x,52+i%2*30,.8+(i%3)*.22);}
    mountain(h*.49,27,'#1c393b',motion*.08);mountain(h*.61,22,'#244b47',motion*.2);
    const grade=s.slope==='climb'?-.13:s.slope==='descent'?.13:0;
    const groundY=x=>h*.81+(x-w*.4)*grade;
    /* земля: дёрн сверху, земля под ним */
    /* земля */
    g.save();
    g.beginPath();g.moveTo(0,groundY(0)-18);g.lineTo(w,groundY(w)-18);g.lineTo(w,h);g.lineTo(0,h);g.closePath();
    g.fillStyle=pat.dirt||'#6b4f34';g.fill();g.globalAlpha=.22;g.fillStyle='#12202a';g.fill();g.globalAlpha=1;g.restore();
    /* обочина: дёрн сверху, как блок травы сбоку */
    g.save();
    g.beginPath();g.moveTo(0,groundY(0)-18);g.lineTo(w,groundY(w)-18);g.lineTo(w,groundY(w)-2);g.lineTo(0,groundY(0)-2);g.closePath();
    g.fillStyle=pat.side||'#3b6247';g.fill();g.restore();
    for(let i=0;i<10;i++){const x=((i*170-motion*.45)%(w+220)+(w+220))%(w+220)-100;tree(x,groundY(x)-18,.55+(i%3)*.18);}
    /* полотно дороги — текстура покрытия */
    const surf=s.surface==='honey'?pat.honey:s.surface==='hay'?pat.hay:s.surface==='water'?pat.water:pat.stone;
    g.save();
    g.beginPath();g.moveTo(0,groundY(0)-2);g.lineTo(w,groundY(w)-2);g.lineTo(w,groundY(w)+44);g.lineTo(0,groundY(0)+44);g.closePath();
    g.fillStyle=surf||'#35464a';g.fill();
    g.globalAlpha=.12;g.fillStyle='#0a1418';g.fill();g.globalAlpha=1;g.restore();
    /* кромка травы */
    g.strokeStyle='#a4c18b';g.lineWidth=2;g.beginPath();g.moveTo(0,groundY(0)-3);g.lineTo(w,groundY(w)-3);g.stroke();
    g.strokeStyle=s.surface==='water'?'#c5e3db':'#c1dfab';g.lineWidth=2;g.setLineDash([20,26]);g.lineDashOffset=-motion%46;g.beginPath();g.moveTo(0,groundY(0)+30);g.lineTo(w,groundY(w)+30);g.stroke();g.setLineDash([]);
    /* кустики вдоль обочины */
    for(let i=0;i<4;i++){const x=((i*340-motion)%(w+340)+(w+340))%(w+340)-100;const y=groundY(x)-2;g.imageSmoothingEnabled=false;
      g.fillStyle='#2c4a33';g.fillRect(x,y-18,16,18);
      if(tex.leaves.img.complete&&tex.leaves.img.naturalWidth)g.drawImage(tex.leaves.img,0,0,16,16,x,y-18,16,18);}
    const sw=Math.min(246,w*.53),sh=sw*364/556,x=w<650?w*.29:w*.37,y=groundY(x)+4+s.lane*14;
    g.save();g.translate(x,y);g.rotate(Math.atan(grade));
    g.fillStyle='#26382c26';g.beginPath();g.ellipse(0,-4,sw*.55,8,0,0,Math.PI*2);g.fill();
    const u=sw/246;
    s.riders.forEach((id,i)=>{if(!id)return;rider(id,-sw*.36+i*sw*.11,-18*u,(id==='iron_golem'?1.13:.9)*u,false);});
    rider('player',sw*.16,-18*u,u,true);
    if(scooter.complete&&scooter.naturalWidth){g.imageSmoothingEnabled=true;g.drawImage(scooter,-sw/2,-sh,sw,sh);}else{g.fillStyle='#34444b';g.fillRect(-sw/2,-22,sw,9);g.fillRect(sw*.3,-sh,7,sh);}
    g.restore();
    if(s.speed*72>65&&!reduced.matches){g.strokeStyle='#f1edda99';g.lineWidth=2;for(let i=0;i<4;i++){const x=w*.16-((t*.11+i*71)%100),y=h*.53+i*17;g.beginPath();g.moveTo(x,y);g.lineTo(x+26+(s.speed*72-65)*.2,y);g.stroke();}}
    if(s.charging){g.fillStyle='#d4dfb3';g.font='bold 24px monospace';g.fillText('ϟ',x+sw*.5,y-60);}
  }
  requestAnimationFrame(draw);
})();
