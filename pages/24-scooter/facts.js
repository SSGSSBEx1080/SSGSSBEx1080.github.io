/* №24 · Шесть мини-опытов, синхронизированных с существующим треком и 3D-станцией. */
(() => {
  const $=s=>document.querySelector(s);
  const n=v=>Number(v).toLocaleString('ru-RU');
  const modeText={level:'Ровно: предел 80 на HUD.',climb:'Подъём: тяжёлый экипаж теряет разгон.',descent:'Спуск: ограничение 80 снимается.'};
  function road(mode){$('#factRoad').dataset.slope=mode;$('#factRoadText').textContent=modeText[mode];document.querySelectorAll('[data-rf-slope]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rfSlope===mode)));}
  document.querySelectorAll('[data-rf-slope]').forEach(b=>b.addEventListener('click',()=>{$(`[data-slope="${b.dataset.rfSlope}"]`).click();road(b.dataset.rfSlope)}));road('level');
  const crew=()=>{const riders=document.querySelectorAll('#roster .es-rider').length,count=riders+1;$('#factCrewPeople').textContent='● '.repeat(count);$('#factCrewText').textContent=`${count} из 5 мест занято · масса ${$('#hudMass').textContent}.`;$('#factAddRider').disabled=count>=5;};
  $('#factAddRider').onclick=()=>{$('#addPassenger').click();crew();};new MutationObserver(crew).observe($('#roster'),{childList:true,subtree:true});crew();
  function distance(){const d=+$('#factMileage').value,remaining=Math.max(0,Math.round((1-d/15000)*100));$('#factMileageBattery').textContent=remaining+'%';$('#factMileageFill').style.width=remaining+'%';$('#factMileageText').textContent=`${n(d)} / 15 000 блоков · ${remaining}% осталось.`;}
  $('#factMileage').addEventListener('input',distance);distance();
  let charge=40,timer=null;function drawCharge(){$('#factCharge').textContent=charge+'%';$('#factChargeFill').style.width=charge+'%';$('#factChargeText').textContent=timer?`Заряжается: ${charge}% · +1% за секунду.`:`Демонстрация: ${charge}% заряда.`;$('#factChargeBtn').textContent=charge>=100?'ПОВТОРИТЬ ОПЫТ':timer?'ОСТАНОВИТЬ':'ПОДКЛЮЧИТЬ';}
  $('#factChargeBtn').onclick=()=>{if(timer){clearInterval(timer);timer=null;drawCharge();return;}if(charge>=100)charge=40;timer=setInterval(()=>{if(document.hidden)return;charge=Math.min(100,charge+1);if(charge>=100){clearInterval(timer);timer=null;}drawCharge();},1000);drawCharge();};drawCharge();
  $('#factShowSign').onclick=()=>{$('#stationSign').click();$('#station').scrollIntoView({behavior:'smooth'});$('#factSignText').textContent='Нашёл: надпись «БЕНЗИНА НЕТ!» на оригинальной станции.';};
  $('#factSprint').onclick=()=>{$('[data-slope="descent"]').click();road('descent');if(!$('#takeScooter').disabled)$('#takeScooter').click();$('#factSprintText').textContent='Спуск готов. Нажми «Ехать» и наблюдай за HUD.';$('#experiment').scrollIntoView({behavior:'smooth'});};
})();