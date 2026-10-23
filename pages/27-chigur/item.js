/* The trophy's original Java/Blockbench item model, not the entity's bone or
 * a stretched item atlas. GUI icons use the same supplied model and texture. */
(() => {
  'use strict';
  const mount=document.querySelector('#weaponModel');if(!mount||!window.ZMModel3D||!ZM.P27ITEMS)return;
  const model=structuredClone(ZM.P27ITEMS.shotgun);model.textures={0:'chigur_shotgun'};
  let view=null,drag=null,rx=10,ry=70;
  function transform(){if(view)view.rig.style.transform=`rotateX(${rx}deg) rotateY(${ry}deg)`;}
  function rebuild(){
    mount.innerHTML='';view=ZMModel3D.build(model,'../../assets/textures/p27/',{unit:Math.min(18,mount.clientWidth/27)});
    mount.append(view.el);transform();
  }
  new ResizeObserver(rebuild).observe(mount);rebuild();
  mount.addEventListener('pointerdown',event=>{drag={x:event.clientX,y:event.clientY,rx,ry};mount.setPointerCapture(event.pointerId);});
  mount.addEventListener('pointermove',event=>{if(!drag)return;ry=drag.ry+(event.clientX-drag.x)*.6;rx=Math.max(-60,Math.min(60,drag.rx-(event.clientY-drag.y)*.3));transform();});
  const release=()=>drag=null;mount.addEventListener('pointerup',release);mount.addEventListener('pointercancel',release);mount.addEventListener('lostpointercapture',release);
  mount.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;event.preventDefault();
    if(event.key==='Home'){rx=10;ry=70;}else if(event.key==='ArrowLeft')ry-=12;else if(event.key==='ArrowRight')ry+=12;else rx=Math.max(-60,Math.min(60,rx+(event.key==='ArrowUp'?-8:8)));transform();
  });
  document.querySelector('#weaponModelReset').addEventListener('click',()=>{rx=10;ry=70;transform();});
  window.P27ItemViewer={model,get angles(){return[rx,ry];}};
})();
