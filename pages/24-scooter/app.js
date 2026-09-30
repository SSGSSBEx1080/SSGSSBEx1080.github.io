/* №24 · самокат: модель — оригинальная Bedrock geometry, атлас — scooters.png;
   кинематика локальная учебная аппроксимация констант ScooterEntity, не серверный код. */
(function(){
const {$}=ZM,K=ZM.kit,U=ZM.url,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
ZM.topbar({crumb:"№24 · Электросамокат",...ZM.pointNav(24)});K.finNav(24,$("#finNav"));
const adv=K.adv({list:ZM.P24.advancements,store:"p24.adv",icon:a=>U(`assets/textures/p24/${a.icon}.svg`),intro:"Три скрытых достижения: самокат, зарядный порт и отметка 100 на HUD."});
const cv=$("#hero3d");
if(window.ZMGeo&&ZMGeo.supported()){
 try{const g=ZMGeo.create(cv,{geo:ZM.P24G,tex:U("assets/textures/p24/scooters.png"),nearest:true,lit:.62});const bb=g.bbox(Object.keys(g.bones)),s=K.spinner(cv,{ry:-32,rx:0},35);Object.assign(g.cam,{target:[bb.c[0],bb.c[1],bb.c[2]],dist:Math.max(...bb.size)*2.1,yaw:37,pitch:18,fov:37});let t=0;
 const draw=(now)=>{const dt=Math.min(.05,(now-t)/1000||0);t=now;if(!document.hidden){if(s.idle()&&!matchMedia('(prefers-reduced-motion: reduce)').matches)s.ry+=dt*10;g.cam.yaw=s.ry+70;g.cam.pitch=18+s.rx*.4;g.tick(dt);g.render()}requestAnimationFrame(draw)};requestAnimationFrame(draw);
 }catch(e){cv.hidden=true;$("#modelFallback").hidden=false;console.warn("Scooter 3D fallback",e)}
}else{cv.hidden=true;$("#modelFallback").hidden=false}
const state={owned:false,port:false,charging:false,speed:0,charge:1000000,health:500,passengers:1,grade:"flat",keys:{go:false,brake:false},meters:0,offset:0};
const log=text=>$("#rideLog").textContent=text;
const present=()=>{
 $("#speed").textContent=String(Math.round(Math.abs(state.speed)*72)).padStart(3,"0");
 const pct=state.charge/10000;$("#chargeN").textContent=`${Math.round(pct)}%`;$("#chargeBar").style.width=pct+"%";
 $("#healthN").textContent=`${state.health} / 500`;$("#healthBar").style.width=state.health/5+"%";
 $("#needle").style.left=clamp(Math.abs(state.speed)*72/500*100,0,99)+"%";
 $("#lines").style.backgroundPositionX=-(state.offset%100)+"px";
 $("#roadLabel").textContent={flat:"РОВНАЯ · ОГРАНИЧЕНИЕ 80",down:"СПУСК · БЕЗ ЛИМИТА 80",up:"ПОДЪЁМ · ГРАВИТАЦИЯ"}[state.grade];
 $("#portLed").textContent=state.charging&&state.port&&state.owned&&Math.abs(state.speed)<.08?"● CHARGING":"○ OFFLINE";
 $("#portLed").classList.toggle("on",state.charging&&state.port&&state.owned&&Math.abs(state.speed)<.08);
};
function step(){
 if(!state.owned){present();return}
 const s=state,heavy=clamp((s.passengers-1)*.14,0,1),down=s.grade==="down"?.85:0,up=s.grade==="up"?.55:0,boost=1+s.passengers*.08+heavy*.55;
 const accel=.032*(1-.55*heavy)*(down?1+.7*down*boost*(1+.85*heavy):up?(1-.3*up)*(1-.65*heavy):1);
 let target=s.speed;
 if(s.keys.go&&s.charge>0)target+=accel+(down?.032*.55*down*boost*(1+.85*heavy):0);
 else if(s.keys.brake)target-=s.speed>.03?.085*(1-.45*heavy):accel*1.15;
 else if(down)target=s.speed*(.965+(.992+.006*heavy-.965)*down)+.032*.75*down*boost*(1+.85*heavy);
 else target=s.speed*(up?.965+(.94-.06*heavy-.965)*up:.965);
 if(Math.abs(target)<.005)target=0;
 s.speed=clamp(s.speed+(target-s.speed)*(.34-.16*heavy),-18/72,down?500/72:80/72);
 const moved=Math.abs(s.speed)*.5; // источник: MOVE_SCALE = .5 и 72 единицы HUD на 1 скорость
 if(s.charge>0&&moved>.001){s.charge=Math.max(0,s.charge-moved*(1000000/15000)*(up?1.2:1));s.meters+=moved}
 if(s.port&&s.charging&&Math.abs(s.speed)<.08)s.charge=Math.min(1000000,s.charge+500); // 1%/sec × 20 ticks
 s.offset+=Math.abs(s.speed)*19;
 if(s.speed*72>=99.5)adv.grant("speed_100");present();
}
let prev=performance.now(),acc=0;
function loop(now){const dt=Math.min(.08,(now-prev)/1000);prev=now;if(!document.hidden){acc=Math.min(.15,acc+dt);while(acc>=.05){step();acc-=.05}}requestAnimationFrame(loop)}requestAnimationFrame(loop);
function owned(on){state.owned=on;state.keys.go=false;state.keys.brake=false;$("#getScooter").disabled=on;$("#go").disabled=!on;$("#brake").disabled=!on;$("#horn").disabled=!on;$("#pack").disabled=!on;}
$("#getScooter").addEventListener("click",()=>{owned(true);adv.grant("scooter_craft");log("Самокат на трассе. Удерживай газ, затем переключи склон на спуск.");});
$("#getPort").addEventListener("click",()=>{state.port=true;$("#getPort").disabled=true;$("#charge").disabled=false;adv.grant("find_station");log("Зарядный порт получен. Остановись рядом и подключи зарядку.");});
$("#charge").addEventListener("click",()=>{state.charging=!state.charging;$("#charge").textContent=state.charging?"Отключить порт":"Подключить зарядку";log(state.charging?"Зарядка начнётся при полной остановке. Скорость ≤ 0,08 внутренних единиц.":"Порт отключён.");present();});
$("#pack").addEventListener("click",()=>{if(Math.abs(state.speed)>.08){log("Пока самокат движется, сложить его нельзя. Притормози.");return}owned(false);log(`Водитель слез. Самокат сложен в предмет. Заряд ${Math.round(state.charge/10000)}% и прочность ${state.health}/500 сохраняются.`)});
$("#grade").addEventListener("change",e=>{state.grade=e.target.value;log({flat:"На ровной дороге лимит HUD — 80 км/ч.",down:"Крутой спуск: лимит 80 снимается, масса усиливает разгон.",up:"На подъёме скорость и запас хода падают."}[state.grade]);present()});
$("#pax").addEventListener("input",e=>{state.passengers=+e.target.value;$("#paxN").textContent=`${state.passengers} / 5`;log(`На самокате ${state.passengers} ${state.passengers===1?"человек":state.passengers<5?"человека":"человек"}. Масса влияет на разгон и инерцию.`)});
$("#horn").addEventListener("click",()=>{log("Бип-бип! Водитель нажал ПКМ по самокату.");ZM.sfx("click",.35)});
for(const [id,key] of [["#go","go"],["#brake","brake"]]){
 const b=$(id),on=e=>{if(b.disabled)return;e.preventDefault();state.keys[key]=true;b.classList.add("pressed");try{b.setPointerCapture(e.pointerId)}catch{}},off=()=>{state.keys[key]=false;b.classList.remove("pressed")};b.addEventListener("pointerdown",on);for(const ev of ["pointerup","pointercancel","lostpointercapture"])b.addEventListener(ev,off);
}
const keyOf=e=>({KeyW:"go",ArrowUp:"go",KeyS:"brake",ArrowDown:"brake"})[e.code];
addEventListener("keydown",e=>{if(!state.owned||e.target.matches("input:not([type=range]),select,textarea,[contenteditable=true]")||(e.target.matches("input[type=range]")&&e.code.startsWith("Arrow")))return;const k=keyOf(e);if(k){e.preventDefault();state.keys[k]=true;$(k==="go"?"#go":"#brake").classList.add("pressed")}});
addEventListener("keyup",e=>{const k=keyOf(e);if(k){state.keys[k]=false;$(k==="go"?"#go":"#brake").classList.remove("pressed")}});
addEventListener("blur",()=>{state.keys.go=false;state.keys.brake=false;$("#go").classList.remove("pressed");$("#brake").classList.remove("pressed")});
present();
})();
