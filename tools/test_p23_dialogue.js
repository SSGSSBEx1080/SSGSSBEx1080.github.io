/* The five MAX personas respond to actual user topics, not random lines. */
const assert = require('node:assert/strict');
const { answer } = require('../pages/23-max/dialogue.js');
const cases = [
  ['p5', 'Тебе действительно 42 года?', /42.*стар|стар.*42/i],
  ['p5', 'Что думаешь о самокате?', /самокат/i],
  ['pd', 'Когда выйдет второй трек?', /фтар|втор|адин/i],
  ['pd', 'Как звучит припев?', /дикс.*кокс/i],
  ['pc', 'Давай заключим перемирие', /мир|рейд/i],
  ['pc', 'Как вы нашли мою базу?', /баз|координат/i],
  ['pv', 'Как проходит стрим?', /стрим|эфир/i],
  ['pv', 'Почему такой костюм?', /костюм|пропорци|бубсы/i],
  ['pm', 'Что на ужин?', /суп|ужин|котлет/i],
  ['pm', 'Помоги с домашкой', /домаш|урок|предмет/i],
  ['pm', 'Мне грустно и тревожно', /слушаю|расскажи|важнее/i],
];
for (const [id, input, expected] of cases) {
  const result = answer(id, input);
  assert.match(result.text, expected, `${id} on ${input}`);
  assert.equal(result.memory.turns, 1);
}
for (const id of ['p5', 'pd', 'pc', 'pv', 'pm']) {
  let memory = {}, old = '';
  for (const text of ['Привет', 'Как дела?', 'Что ты думаешь о портале в Незер?', 'Почему?', 'Спасибо', 'Пока']) {
    const result = answer(id, text, memory);
    assert.ok(result.text.length >= 20, `${id}: no generic empty response`);
    assert.notEqual(result.text, old, `${id}: identical consecutive responses`);
    memory = result.memory; old = result.text;
  }
  assert.equal(memory.turns, 6);
  if (id === 'p5') assert.ok(/42/.test(old) && /стар/i.test(old));
}
assert.match(answer('pm', 'Да', answer('pm', 'Что на ужин?').memory).text, /суп|ужин/i);
assert.match(answer('pc', 'Нет', answer('pc', 'Давай мир').memory).text, /мир|pvp|арен/i);
const semantic = [
  ['pm', 'Я уже поел', /поел|посуду|ужин/i, 'ate'],
  ['pm', 'Я не голоден, не хочу есть', /не заставлю|сейчас не ешь/i, 'noFood'],
  ['pm', 'Я сделал домашку', /молодец|умница/i, 'doneHomework'],
  ['pm', 'Я не сделал уроки', /помогу|разберем/i, 'lateHomework'],
  ['pd', 'Я еще не слушал твою песню', /не слушал|не слышал/i, 'notHeard'],
  ['pd', 'Я уже послушал трек', /паслушал|даслушал/i, 'heard'],
  ['pd', 'Мне не нравится твой трек', /не зашло|не панравил/i, 'critic'],
  ['pc', 'У меня нет алмазов', /алмаз|нашел/i, 'noDiamonds'],
  ['pc', 'Перемирие отменяется', /перемир|мир/i, 'endPeace'],
  ['pv', 'На стриме не работает микрофон', /лагает|микрофон|не видно/i, 'streamProblem'],
  ['pv', 'Не хочу смотреть стрим', /не хочешь|стрим не навязываю/i, 'noStream'],
  ['p5', 'А ты?', /42.*стар|стар.*42/i, 'andYou'],
];
for (const [id, input, expected, topic] of semantic) {
  const result = answer(id, input);
  assert.equal(result.topic, topic, `${id}: wrong intent on ${input}`);
  assert.match(result.text, expected, `${id}: contradicts ${input}`);
}
let peace = answer('pc', 'Давай перемирие');
assert.equal(peace.memory.flags.truce, true);
assert.match(answer('pc', 'Что с моей базой?', peace.memory).text, /договорились|не тронем/i);
assert.match(answer('pc', 'Почему?', peace.memory).text, /перемирие|ремонт/i);
assert.equal(answer('pc', 'Нет', peace.memory).memory.flags.truce, false);
peace = answer('pc', 'Перемирие отменяется', peace.memory);
assert.equal(peace.memory.flags.truce, false);
let homework = answer('pm', 'Я сделал уроки');
assert.match(answer('pm', 'Что с домашкой?', homework.memory).text, /уже сказал|сделал уроки/i);
let song = answer('pd', 'Я уже послушал трек');
assert.match(answer('pd', 'Как твоя музыка?', song.memory).text, /отзыв|паслушал/i);
let stream = answer('pv', 'Не хочу смотреть стрим');
assert.match(answer('pv', 'Что на стриме?', stream.memory).text, /не хочешь|не зову/i);
assert.equal(answer('removed_bot', 'Привет'), null);
console.log('MAX dialogue: 5 characters, 23 semantic cases, contradiction memory, six-turn flow, fallback, no obsolete bot: OK');
