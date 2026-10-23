/* Playable X/Z cross-section when WebGL is absent. The SAME P28 model drives it;
 * no separate canned timer, healing animation or achievement path. */
(()=>{'use strict';
 const host=document.querySelector('#worldViewport'),cv=document.querySelector('#world2d'),g=cv.getContext('2d');if(!g)return;
 const images={};for(const[name,url]of Object.entries({medusa:'../../assets/textures/p28/medusa.png',stone:'../../assets/textures/p28/petrified_stone.png',wave:'../../assets/textures/p28/medusa_wave.png',player:'../../assets/textures/hub/av/steve.png',mob:'../../assets/textures/hub/av/zombie.png',villager:'../../assets/textures/hub/av/villager.png',zombieVillager:'../../assets/textures/hub/av/zombie.png'})){const i=new Image();i.src=url;images[name]=i;}
 let width=800,height=480,unit=23,ox=330,oy=260,seen=false,last=0;
 const resize=()=>{width=host.clientWidth;height=host.clientHeight;const d=Math.min(devicePixelRatio||1,1.5);cv.width=Math.round(width*d);cv.height=Math.round(height*d);g.setTransform(d,0,0,d,0,0);unit=Math.min(width/32,height/18);ox=width*.43;oy=height*.55;};
 new ResizeObserver(resize).observe(host);new IntersectionObserver(e=>seen=e[0].isIntersecting,{rootMargin:'100px'}).observe(host);resize();
 const loaded=i=>i?.complete&&i.naturalWidth;
 cv.addEventListener('click',event=>{const r=cv.getBoundingClientRect(),x=event.clientX-r.left,y=event.clientY-r.top;let nearest=null,d=30;for(const e of P28.model.state.entities){const n=Math.hypot(x-(ox+e.x*unit),y-(oy+e.z*unit));if(e.alive&&n<d){nearest=e;d=n;}}if(nearest)P28.select(nearest.id);});
 function frame(now){requestAnimationFrame(frame);if(!seen||document.hidden||host.dataset.renderer==='three'||now-last<45)return;last=now;
  document.querySelector('#cameraReset').hidden=true;document.querySelector('#worldCaption').textContent='Сечение сферы · те же правила, без WebGL';
  const s=P28.model.state;g.clearRect(0,0,width,height);g.fillStyle='#14251b';g.fillRect(0,0,width,height);g.strokeStyle='#2e4430';g.lineWidth=1;
  for(let x=ox%unit;x<width;x+=unit){g.beginPath();g.moveTo(x,0);g.lineTo(x,height);g.stroke();}for(let y=oy%unit;y<height;y+=unit){g.beginPath();g.moveTo(0,y);g.lineTo(width,y);g.stroke();}
  g.fillStyle='#52614c';g.fillRect(ox+2*unit-4,oy-3.5*unit,8,7*unit);g.strokeStyle='#72836a';g.strokeRect(ox+2*unit-4,oy-3.5*unit,8,7*unit);
  for(const wave of s.waves){const r=Math.sqrt(Math.max(0,(wave.current||0)**2-wave.y**2))*unit,cx=ox+wave.x*unit,cy=oy+wave.z*unit;g.save();g.beginPath();g.arc(cx,cy,Math.max(.01,r),0,Math.PI*2);g.clip();g.globalAlpha=.45;if(loaded(images.wave))g.drawImage(images.wave,cx-r,cy-r,r*2,r*2);g.fillStyle='#7deebe44';g.fillRect(0,0,width,height);g.restore();g.strokeStyle='#a3f0be';g.lineWidth=2;g.beginPath();g.arc(cx,cy,r,0,Math.PI*2);g.stroke();}
  for(const e of s.entities){if(!e.alive)continue;const x=ox+e.x*unit,y=oy+e.z*unit;if(e.id===P28.selected){g.strokeStyle='#a7cf91';g.lineWidth=2;g.beginPath();g.ellipse(x,y,22,13,0,0,Math.PI*2);g.stroke();}g.fillStyle='#08180bcc';g.beginPath();g.ellipse(x,y+4,17,8,0,0,Math.PI*2);g.fill();g.imageSmoothingEnabled=false;
   if(e.stone&&loaded(images.stone))g.drawImage(images.stone,x-14,y-21,28,28);else if(loaded(images[e.kind]))g.drawImage(images[e.kind],x-14,y-21,28,28);
   g.font='8px sans-serif';g.textAlign='center';g.fillStyle=e.stone?'#c6cbb6':'#92b59b';g.fillText(e.name,x,y+24);
  }
  const o=s.orb,p=P28.model.owner;if((o||s.item.owned)&&loaded(images.medusa)){const x=o?o.x:p.x+.5,z=o?o.z:p.z,y=o?o.y:1.3;g.imageSmoothingEnabled=true;g.save();g.globalAlpha=(o&&!o.charged||!o&&!s.item.charged) ? .55 : 1;g.translate(ox+x*unit,oy+z*unit-y*unit*.4);g.drawImage(images.medusa,-12,-12,24,24);g.restore();}
 }
 requestAnimationFrame(frame);
})();
