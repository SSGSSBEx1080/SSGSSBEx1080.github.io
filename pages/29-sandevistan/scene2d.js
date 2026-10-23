/* The same simulation, projected on X/Z, for devices without WebGL. Native
 * capture positions/colors/alpha remain intact; there is no fake separate demo. */
(()=>{'use strict';const cv=document.querySelector('#arena2d'),g=cv.getContext('2d'),host=document.querySelector('#arena');if(!g)return;
 const player=new Image(),zombie=new Image();player.src='../../assets/textures/hub/av/steve.png';zombie.src='../../assets/textures/hub/av/zombie.png';let w=800,h=475,u=16,seen=false,last=0;
 const size=()=>{w=host.clientWidth;h=host.clientHeight;const d=Math.min(devicePixelRatio||1,1.5);cv.width=Math.round(w*d);cv.height=Math.round(h*d);g.setTransform(d,0,0,d,0,0);u=Math.min(w/27,h/20);};new ResizeObserver(size).observe(host);new IntersectionObserver(e=>seen=e[0].isIntersecting,{rootMargin:'80px'}).observe(host);size();
 function person(x,y,face,tint=null,alpha=1){g.save();g.translate(x,y);g.globalAlpha=alpha;g.fillStyle=tint||'#287e93';g.fillRect(-7,-7,14,19);g.fillStyle=tint||'#394b8d';g.fillRect(-7,12,5,12);g.fillRect(2,12,5,12);g.fillStyle=tint||'#a78261';g.fillRect(-11,-5,4,17);g.fillRect(7,-5,4,17);if(!tint&&face.complete&&face.naturalWidth){g.imageSmoothingEnabled=false;g.drawImage(face,-9,-25,18,18);}else{g.fillStyle=tint||'#89adb4';g.fillRect(-9,-25,18,18);}g.restore();}
 function frame(t){requestAnimationFrame(frame);if(document.hidden||!seen||host.dataset.renderer==='three'||t-last<40)return;last=t;const s=P29.model.state,p=s.player,ox=w*.5-p.x*u,oy=h*.58-p.z*u;g.fillStyle='#07131e';g.fillRect(0,0,w,h);g.strokeStyle='#16434e';g.lineWidth=1;
  for(let x=ox%(u*2);x<w;x+=u*2){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}for(let y=oy%(u*2);y<h;y+=u*2){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
  if(s.accelerating){g.strokeStyle='#36e9c7';g.lineWidth=2;g.strokeRect(ox+(p.x-20.3)*u,oy+(p.z-20.3)*u,40.6*u,40.6*u);}
  if(P29.motion)for(const list of[s.trail,s.peerTrail||[]])for(let i=0;i<list.length;i++){const a=i/list.length,fade=s.accelerating&&list===s.trail||s.targets[1].active>0&&list===s.peerTrail?1:list.length/100;person(ox+list[i].x*u,oy+list[i].z*u,player,`rgb(${a*255},255,${(1-a)*255})`,a*.5*fade);}
  for(const e of s.targets){if(!e.alive)continue;const x=ox+e.x*u,y=oy+e.z*u;person(x,y,e.kind==='mob'?zombie:player);g.textAlign='center';g.font='11px monospace';g.fillStyle=e.freeze?'#3aebd0':'#7899a5';g.fillText(e.freeze?'FROZEN':e.name,x,y+44);}
  if(s.alive)person(ox+p.x*u,oy+p.z*u-p.y*u,player);
  if(s.tnt?.alive){g.fillStyle=s.tnt.freeze?'#3ac4b7':'#9c4157';g.fillRect(ox+s.tnt.x*u-10,oy+s.tnt.z*u-10,20,20);g.fillStyle='#d9dc9a';g.font='10px monospace';g.fillText('TNT',ox+s.tnt.x*u,oy+s.tnt.z*u);}
  if(s.arrow?.alive){g.strokeStyle=s.arrow.freeze?'#39e9da':'#d1c28f';g.beginPath();g.moveTo(ox+s.arrow.x*u-9,oy+s.arrow.z*u);g.lineTo(ox+s.arrow.x*u+9,oy+s.arrow.z*u);g.stroke();}
 }requestAnimationFrame(frame);
})();
