/* A tiny illustrated road. All motion, riders and instruments observe P24TRIP;
   there is no canned 'speed demo' disconnected from the vehicle. */
(() => {
  'use strict';
  const cv=document.querySelector('#roadCanvas'), g=cv.getContext('2d');
  const trip=window.P24TRIP;if(!g||!trip)return;
  const {state:s,types}=trip, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const scooter=new Image();scooter.src='../../assets/textures/p24/scooter_side.png';
  const faces={};
  for(const name of ['steve','iron_golem','villager','pig','zombie','enderman']) {const i=new Image();i.src='../../assets/textures/hub/av/'+name+'.png';faces[name]=i;}
  let w=900,h=380,visible=false,last=0;
  new IntersectionObserver(es=>visible=es[0].isIntersecting,{rootMargin:'80px'}).observe(cv);
  function size(){const r=cv.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.5);w=r.width;h=r.height;cv.width=Math.round(w*d);cv.height=Math.round(h*d);g.setTransform(d,0,0,d,0,0);}
  new ResizeObserver(size).observe(cv);size();
  function polygon(points,color){g.fillStyle=color;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();}
  function mountain(base,amp,color,offset){const pts=[[-40,h]];for(let x=-40;x<w+50;x+=30)pts.push([x,base-Math.round((Math.sin((x+offset)*.009)+Math.sin((x+offset)*.021)*.35)*amp/9)*9]);pts.push([w+50,h]);polygon(pts,color);}
  function tree(x,y,scale){g.fillStyle='#6f7d6a';g.fillRect(x-3*scale,y-12*scale,6*scale,24*scale);g.fillStyle='#869780';g.fillRect(x-20*scale,y-47*scale,40*scale,27*scale);g.fillRect(x-13*scale,y-57*scale,26*scale,12*scale);g.fillStyle='#a0ac8d';g.fillRect(x-20*scale,y-47*scale,30*scale,9*scale);}
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
    g.clearRect(0,0,w,h);g.fillStyle='#d8e5e0';g.fillRect(0,0,w,h);
    g.fillStyle='#f6edcc';g.beginPath();g.arc(w*.73,78,32,0,Math.PI*2);g.fill();
    for(let i=0;i<4;i++){const x=((i*260-motion*.06)%(w+220)+(w+220))%(w+220)-100;g.fillStyle='#f4f1e3';g.fillRect(x,55+i%2*35,99,13);g.fillRect(x+20,44+i%2*35,43,11);}
    mountain(h*.49,27,'#c2d0bc',motion*.08);mountain(h*.61,22,'#a4b79b',motion*.2);
    const grade=s.slope==='climb'?-.13:s.slope==='descent'?.13:0;
    const groundY=x=>h*.81+(x-w*.4)*grade;
    polygon([[0,groundY(0)-15],[w,groundY(w)-15],[w,h],[0,h]],'#a5ad8c');
    for(let i=0;i<10;i++){const x=((i*170-motion*.45)%(w+220)+(w+220))%(w+220)-100;tree(x,groundY(x)-24,.55+(i%3)*.18);}
    polygon([[0,groundY(0)],[w,groundY(w)],[w,groundY(w)+58],[0,groundY(0)+58]],s.surface==='honey'?'#a78945':s.surface==='hay'?'#bba45d':s.surface==='water'?'#7caaad':'#7a827c');
    g.strokeStyle='#d2ccac';g.lineWidth=3;g.beginPath();g.moveTo(0,groundY(0)+3);g.lineTo(w,groundY(w)+3);g.stroke();
    g.strokeStyle=s.surface==='water'?'#c5e3db':'#e4dfc9';g.lineWidth=2;g.setLineDash([26,33]);g.lineDashOffset=-motion%59;g.beginPath();g.moveTo(0,groundY(0)+38);g.lineTo(w,groundY(w)+38);g.stroke();g.setLineDash([]);
    for(let i=0;i<4;i++){const x=((i*340-motion)%(w+340)+(w+340))%(w+340)-100;const y=groundY(x)-4;g.fillStyle='#dedccc';g.fillRect(x,y-26,5,32);g.fillStyle='#bd6240';g.fillRect(x,y-24,5,7);}
    const sw=Math.min(246,w*.53),sh=sw*364/556,x=w<650?w*.29:w*.37,y=groundY(x)+4+s.lane*14;
    g.save();g.translate(x,y);g.rotate(Math.atan(grade));
    g.fillStyle='#26382c26';g.beginPath();g.ellipse(0,-4,sw*.55,8,0,0,Math.PI*2);g.fill();
    const u=sw/246;
    s.riders.forEach((id,i)=>{if(!id)return;rider(id,-sw*.36+i*sw*.11,-18*u, (id==='iron_golem'?1.13:.9)*u,false);});
    rider('player',sw*.16,-18*u,u,true);
    if(scooter.complete&&scooter.naturalWidth){g.imageSmoothingEnabled=true;g.drawImage(scooter,-sw/2,-sh,sw,sh);}else{g.fillStyle='#34444b';g.fillRect(-sw/2,-22,sw,9);g.fillRect(sw*.3,-sh,7,sh);}
    g.restore();
    if(s.speed*72>65&&!reduced.matches){g.strokeStyle='#f1edda99';g.lineWidth=2;for(let i=0;i<4;i++){const x=w*.16-((t*.11+i*71)%100),y=h*.53+i*17;g.beginPath();g.moveTo(x,y);g.lineTo(x+26+(s.speed*72-65)*.2,y);g.stroke();}}
    if(s.charging){g.fillStyle='#d4dfb3';g.font='bold 24px monospace';g.fillText('ϟ',x+sw*.5,y-60);}
  }
  requestAnimationFrame(draw);
})();
