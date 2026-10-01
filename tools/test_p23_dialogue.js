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
assert.equal(answer('removed_bot', 'Привет'), null);
console.log('MAX dialogue: 5 characters, 11 topic cases, context, six-turn flow, fallback, no obsolete bot: OK');
