/* Local MAX contact regression. Run: node tools/test_p23_conversation.js */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../pages/23-max/conversation.js'),'utf8'),ctx);
const brain=ctx.window.ZMMaxConversation,mem={}, logs=[];
function say(id,text,other={}){const r=brain.reply({contact:{id,name:{b1:'Nagibator3000',b2:'Ksyusha_mc',b4:'Dimon'}[id]},me:{name:'Путник'},memory:mem[id],input:[{type:'TEXT',raw:text,...other}]});mem[id]=r.memory;logs.push([id,text,r.text]);return r;}
assert.match(say('b4','сколько стоит алмаз?').text,/три/);
assert.equal(say('b4','два').memory.quote.qty,2);
assert.match(say('b4','а 3?').text,/9 железа/);
assert.equal(mem.b4.quote.qty,3);
assert.equal(say('b4','не хочу покупать алмазы').memory.quote,null);
assert.equal(say('b4','не два, а три алмаза').memory.quote.qty,3);
for(const text of ['куплю -1 алмаз','куплю 0 алмазов','куплю 65 алмазов','куплю 2.5 алмаза']){
 const r=say('b4',text);assert.match(r.text,/от одного до 64/);assert.equal(r.memory.quote.qty,3);
}
assert.equal(say('b4','куплю пять алмазов').memory.quote.qty,5);
assert.match(say('b4','у меня 3 железа').text,/не хватит/);
assert.equal(say('b4','как дела?').memory.quote.qty,5);
assert.match(say('b2','Строю башню').text,/материал|камень/);
assert.match(say('b2','из камня').text,/башни.*камень/);
assert.match(say('b2','напомни, о чем говорили').text,/башня.*камень/);
assert.match(say('b1','напомни координаты').text,/ещё не присылал/);
assert.equal(say('b2','моя база: 100 64 -20').memory.coords,'100 64 -20');
assert.match(say('b2','напомни координаты').text,/100 64 -20/);
assert.match(say('b1','напомни координаты').text,/ещё не присылал/);
assert.match(say('b2','что тут?',{type:'FILE',filename:'castle.png'}).text,/не распознаю/);
assert.match(say('b1','это что?',{replyText:'есть железо?'}).text,/Ты отвечаешь.*железо/);
let r=brain.gift({contact:{id:'b4'},memory:mem.b4,stacks:[{id:'iron_ingot',n:10}],items:{iron_ingot:'Железо'}});assert.equal(r.accept,false);assert.equal(r.memory.quote.qty,5);
mem.b4=say('b4','куплю два алмаза').memory;
r=brain.gift({contact:{id:'b4'},memory:mem.b4,stacks:[{id:'iron_ingot',n:10}],items:{iron_ingot:'Железо'}});
assert.equal(r.accept,true);assert.deepEqual(JSON.parse(JSON.stringify(r.offer)),[{id:'diamond',n:2},{id:'iron_ingot',n:4}]);assert.equal(r.memory.quote,null);
console.log('Context, quantity, correction, negation, personal memory, honest file and escrow: OK');
