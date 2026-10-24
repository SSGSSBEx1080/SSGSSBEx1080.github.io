/* Both items use the complete native geometry/UVs. Back faces are real cube faces,
 * including the zero-thickness trigger guard, not CSS planes with hidden backs. */
const gunHost=document.querySelector('#weaponModel'),coinHost=document.querySelector('#coinDisc');
const source=ZM.P27ITEMS;
let gunView=null,coinView=null,pitch=10,yaw=70,drag=null,coinStart=0,coinToss=false;
function fallback(host,url,alt){host.innerHTML='';const image=new Image();image.src=url;image.alt=alt;image.className='native-item-fallback';host.append(image);host.dataset.renderer='image';}
(async () => {
 const buildItem = window.P27_ITEM_MODEL.buildItem;
 const makeItemView = window.P27_ITEM_MODEL.makeItemView;
try{
 const item=await buildItem(source.shotgun),canvas=document.createElement('canvas');gunHost.innerHTML='';canvas.setAttribute('aria-label','Оригинальная модель дробовика: все текстурированные грани');gunHost.append(canvas);gunView=makeItemView(canvas,item);item.group.rotation.z=Math.PI;gunHost.dataset.renderer='webgl';
 const pose=()=>gunView.setAngles(-yaw,pitch);
 gunHost.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,pitch,yaw};gunHost.focus({preventScroll:true});gunHost.setPointerCapture(e.pointerId);});
 gunHost.addEventListener('pointermove',e=>{if(!drag)return;yaw=drag.yaw+(e.clientX-drag.x)*.6;pitch=Math.max(-80,Math.min(80,drag.pitch-(e.clientY-drag.y)*.3));pose();});
 for(const name of['pointerup','pointercancel','lostpointercapture'])gunHost.addEventListener(name,()=>drag=null);
 gunHost.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home'){pitch=10;yaw=70;}else if(e.key==='ArrowLeft')yaw-=12;else if(e.key==='ArrowRight')yaw+=12;else pitch=Math.max(-80,Math.min(80,pitch+(e.key==='ArrowUp'?-8:8)));pose();});
 document.querySelector('#weaponModelReset').addEventListener('click',()=>{pitch=10;yaw=70;pose();});new ResizeObserver(pose).observe(gunHost);pose();
 window.P27ItemViewer={model:source.shotgun,view:gunView,get angles(){return[pitch,yaw];},get stats(){return{renderer:'webgl',faces:item.faces,materials:[...item.textures.keys()],planarGuard:true,roll:180};}};
}catch(error){fallback(gunHost,'../../assets/textures/p27/shotgun_side.png?v=p29','Модель дробовика из оригинального JSON');document.querySelector('#weaponModelReset').hidden=true;window.P27ItemViewer={model:source.shotgun,angles:[10,70],stats:{renderer:'image'}};console.warn('Gun model snapshot fallback:',error.message);}
try{
 const item=await buildItem(source.coin),canvas=document.createElement('canvas');coinHost.innerHTML='';canvas.id='coinModel';canvas.setAttribute('aria-label','Оригинальная объёмная модель монеты с двумя сторонами и ребром');coinHost.append(canvas);coinView=makeItemView(canvas,item);coinView.setAngles(180,7);coinHost.dataset.renderer='webgl';
 const update=()=>{const tossing=coinHost.classList.contains('tossing');if(tossing&&!coinToss)coinStart=performance.now();coinToss=tossing;};
 new MutationObserver(update).observe(coinHost,{attributes:true,attributeFilter:['class']});update();
 window.P27CoinViewer={view:coinView,source:source.coin,get stats(){return{renderer:'webgl',faces:item.faces.length,nativeThickness:(source.coin.elements[0].to[2]-source.coin.elements[0].from[2])/16,atlas:false};}};
}catch(error){fallback(coinHost,'../../assets/textures/p27/coin_model_heads.png','Оригинальная текстурированная модель монеты');new MutationObserver(()=>{coinHost.querySelector('img').src='../../assets/textures/p27/coin_model_'+(coinHost.classList.contains('tails-up')?'tails':'heads')+'.png';}).observe(coinHost,{attributes:true,attributeFilter:['class']});window.P27CoinViewer={stats:{renderer:'image',atlas:false}};console.warn('Coin model snapshot fallback:',error.message);}

})();
let last=0;
function frame(now){requestAnimationFrame(frame);if(document.hidden||now-last<40)return;last=now;
 if(gunView){const r=gunHost.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)gunView.render();}
 if(coinView&&!document.querySelector('#coinOverlay').hidden){const p=coinToss?Math.min(1,(now-coinStart)/2000):1,result=!!window.P27SCENE?.state.coinResult;
  coinView.item.group.rotation.y=coinToss?Math.PI*8*p+(result?0:Math.PI)*p:coinHost.classList.contains('tails-up')?Math.PI:0;
  coinView.item.group.rotation.x=coinToss?Math.sin(p*Math.PI)*.45:0;coinView.render();
 }
}
requestAnimationFrame(frame);
// Tooling renders the same meshes for static views and unsupported GPU browsers.
window.P27NativeItems={buildItem:window.P27_ITEM_MODEL.buildItem,makeItemView:window.P27_ITEM_MODEL.makeItemView};
