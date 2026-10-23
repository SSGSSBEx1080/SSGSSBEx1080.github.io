/* Build ONLY point 28 from the supplied native advancement JSONs. All other hub
 * branches are preserved byte-for-byte semantically, rather than rebuilt. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const R=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(R,p),'utf8'),c={};c.window=c;
const colors={black:'0',dark_blue:'1',dark_green:'2',dark_aqua:'3',dark_red:'4',dark_purple:'5',gold:'6',gray:'7',dark_gray:'8',blue:'9',green:'a',aqua:'b',red:'c',light_purple:'d',yellow:'e',white:'f'};
const how=['Получить Медузу в инвентарь.','Запустить отсчёт в руке: Shift + ПКМ.','Активировать сферу Медузы.','Активировать сферу радиусом больше 32 блоков.','Активировать сферу радиусом 512 блоков.'];
const files=fs.readdirSync(path.join(R,'mod-src/advancements/28_medusa')).filter(n=>n.endsWith('.json')).sort();
const list=files.map((name,i)=>{const j=JSON.parse(read('mod-src/advancements/28_medusa/'+name)),d=j.display;return{key:name.slice(0,-5),title:d.title.text||d.title,color:colors[d.title.color]||'f',bold:!!d.title.bold,frame:d.frame,icon:d.icon.item.split(':')[1],desc:d.description.text||d.description,xp:j.rewards?.experience||0,parent:j.parent.endsWith(':root')?null:j.parent.split('/').at(-1),hidden:d.hidden,free:true,how:how[i]};});
fs.writeFileSync(path.join(R,'data/p28_adv.js'),'/* Original Medusa advancements, item IDs, parents and XP; not invented wiki rewards. */\nwindow.ZM=window.ZM||{};ZM.P28={advancements:'+JSON.stringify(list)+'};\n');
vm.runInNewContext(read('shared/points.js'),c);vm.runInNewContext(read('data/hub_adv.js'),c);
const point=c.ZM.POINTS.find(p=>p.n===28),mc={0:'#000000',1:'#0000AA',2:'#00AA00',3:'#00AAAA',4:'#AA0000',5:'#AA00AA',6:'#FFAA00',7:'#AAAAAA',8:'#555555',9:'#5555FF',a:'#55FF55',b:'#55FFFF',c:'#FF5555',d:'#FF55FF',e:'#FFFF55',f:'#FFFFFF'};
const branch={n:28,title:point.title,page:'pages/28-medusa/index.html',tone:point.tone,icon:'assets/textures/p28/medusa.png',store:'p28.adv',adv:list.map(a=>({key:a.key,t:a.title,c:mc[a.color],b:a.bold,d:a.desc,icon:'assets/textures/p28/i/'+a.icon+'.png',frame:a.frame,xp:a.xp,parent:a.parent,hidden:a.hidden}))};
let text=read('data/hub_adv.js');const old=c.ZM.HUB_ADV.find(p=>p.n===28);
if(old)text=text.replace(JSON.stringify(old),JSON.stringify(branch));else{const end=text.lastIndexOf('];');if(end<0)throw Error('No hub array');text=text.slice(0,end)+',\n'+JSON.stringify(branch)+text.slice(end);}
fs.writeFileSync(path.join(R,'data/hub_adv.js'),text);
console.log('Built point 28:',list.length,'native advancements,',list.reduce((n,a)=>n+a.xp,0),'XP. Other hub branches preserved.');
