/* Decorative Night City layer. It never changes the capability, timings, RNG or
 * game outcomes. One burst per real activation; no sustained flashing. */
(()=>{'use strict';const hero=document.querySelector('.sandy-hero'),canvas=document.querySelector('#cityRain'),g=canvas.getContext('2d'),arena=document.querySelector('#arena'),pulse=document.querySelector('#systemPulse');let w=1000,h=850,seen=false,last=0,first=0;
 const drops=Array.from({length:60},(_,i)=>({x:(i*719%997)/997,y:(i*449%953)/953,s:.4+(i%7)/10}));
 const resize=()=>{w=hero.clientWidth;h=hero.clientHeight;const d=Math.min(devicePixelRatio||1,1.3);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);g.setTransform(d,0,0,d,0,0);};new ResizeObserver(resize).observe(hero);new IntersectionObserver(e=>seen=e[0].isIntersecting).observe(hero);resize();
 hero.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||!P29.motion)return;const r=hero.getBoundingClientRect();hero.style.setProperty('--city-x',(e.clientX/r.width-.5)*-9+'px');hero.style.setProperty('--city-y',((e.clientY-r.top)/r.height-.5)*-6+'px');});
 let timer=0;function event(e){if(e.type==='sound'&&e.name==='activate')burst('fx-activate','SANDEVISTAN // ACTIVE',850);else if(e.type==='installed')burst('fx-installed','NEURAL LINK ESTABLISHED',1000);else if(e.type==='death')burst('fx-failure','SIGNAL LOST',1400);else if(e.type==='hit'&&P29.motion){arena.classList.add('fx-hit');setTimeout(()=>arena.classList.remove('fx-hit'),180);}}
 function burst(name,text,time){clearTimeout(timer);arena.classList.remove('fx-activate','fx-installed','fx-failure');pulse.textContent=text;if(!P29.motion)return;void arena.offsetWidth;arena.classList.add(name);timer=setTimeout(()=>arena.classList.remove(name),time);}
 function frame(t){requestAnimationFrame(frame);if(!seen||document.hidden||!P29.motion||t-last<40)return;const dt=Math.min(80,t-last||40);last=t;first=first||t;g.clearRect(0,0,w,h);g.lineWidth=.7;
  for(let i=0;i<(w<600?25:60);i++){const p=drops[i];p.y+=dt*.00017*p.s;if(p.y>1.1)p.y=-.1;const x=p.x*w,y=p.y*h;g.strokeStyle=i%5?'#70e7e03d':'#d9ed5470';g.beginPath();g.moveTo(x,y);g.lineTo(x-6*p.s,y+16*p.s);g.stroke();}
 }requestAnimationFrame(frame);window.P29FX={event,get motion(){return P29.motion;},kind:'decorative-night-city',ready:true};
})();
