/* MAX's local demo contacts. No network, generated lore, inventory access or LLM.
 * Intents use the submitted text; the existing server still applies AntiCensor
 * to every displayed message. Memory belongs to a CONTACT, not the open chat.
 * Only a real, accepted escrow gift can fulfill Dimon's negotiated offer. */
(() => {
  'use strict';
  const normalize = value => String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
  const words = value => normalize(value).match(/[\p{L}\p{N}_]+/gu) || [];
  const exact = (text, list) => words(text).some(word => list.includes(word));
  const numberWords = { один:1, одна:1, одну:1, одного:1, два:2, две:2, двух:2, пару:2, пара:2, три:3, трех:3, четыре:4, четырех:4, пять:5, пяти:5, шесть:6, шести:6, семь:7, семи:7, восемь:8, восьми:8, девять:9, десять:10, десяток:10 };
  function quantity(text) {
    const found = normalize(text).match(/(?<![\p{L}\d])-?\d+/u);
    if (found) return Number(found[0]);
    for (const word of words(text)) if (Object.hasOwn(numberWords, word)) return numberWords[word];
    return null;
  }
  const diamonds = n => n + ' ' + (n % 100 >= 11 && n % 100 <= 14 ? 'алмазов' : n % 10 === 1 ? 'алмаз' : n % 10 >= 2 && n % 10 <= 4 ? 'алмаза' : 'алмазов');
  function memory(previous) {
    const m = Object.assign({ version:1, turn:0, topic:'', build:'', material:'', coords:'', awaiting:'', lastInput:'', lastReply:'', repeat:0, quote:null }, previous?.version === 1 ? previous : {});
    m.turn = Number.isFinite(m.turn) ? m.turn + 1 : 1;
    if (m.quote && (!Number.isInteger(m.quote.qty) || m.quote.qty < 1 || m.quote.qty > 64)) m.quote = null;
    return m;
  }
  function reply({ contact, me, memory:previous, input = [] }) {
    const m = memory(previous), id = contact.id;
    const pick = choices => choices[(m.turn - 1) % choices.length];
    const inputs = input.filter(message => !message.deleted && message.type !== 'GIFT');
    if (!inputs.length) return { text:'', memory:m };
    const raw = inputs.map(message => String(message.raw ?? message.text ?? '')).join('. ').slice(-8000);
    let text = normalize(raw);
    const last = inputs[inputs.length - 1];
    const quoted = normalize(last.replyText);
    const finish = answer => {
      m.repeat = text === m.lastInput ? m.repeat + 1 : 0;
      if (m.repeat > 0 && answer === m.lastReply) answer = 'Всё так же: ' + answer;
      m.lastInput = text; m.lastReply = answer;
      return { text:answer, memory:m };
    };
    const file = inputs.find(message => message.type === 'FILE');
    if (file) return finish(`${id === 'b2' ? 'Вложение дошло' : 'Файл получил'}: «${String(file.filename || 'без имени').slice(0, 90)}». Здесь я не распознаю содержимое файлов. ${id === 'b2' ? 'Если это постройка — опиши её словами.' : 'Напиши текстом, что нужно обсудить.'}`);
    if (last.forwarded && !text) return finish('Пересылка дошла. Что ты хотел по ней спросить?');
    // A correction supersedes, rather than combines with, the negated quantity.
    if (/не\s/.test(text)) {
      const correction = text.match(/(?:,\s*а\s+|но\s+)(?:хочу\s+|возьму\s+|куплю\s+)?(.+)$/);
      if (correction) text = correction[1];
    }
    if (/как (?:меня|мой ник)|(?:помнишь|знаешь).*(?:мой ник|меня зовут)/.test(text)) return finish(`Ты ${String(me.name || me.base || 'Player').slice(0, 24)}. Это имя из твоего профиля MAX.`);
    if (/кто ты|как тебя зовут|твой ник|твое имя/.test(text)) return finish(`${contact.name || contact.base}. ${contact.desc || (id === 'b4' ? 'Продаю алмазы: один за три железа.' : 'Мы в MAX.')} ${id === 'b4' ? 'Алмаз стоит три железа.' : ''}`.trim());
    const coordinates = raw.match(/(?:^|[^\d])(-?\d{1,7})[\s,;]+(-?\d{1,4})[\s,;]+(-?\d{1,7})(?!\d)/);
    if (/коорд|где (?:моя|наша) база|где я/.test(text) || (coordinates && /база|точк|запомни/.test(text)) || /^\s*-?\d+\s+-?\d+\s+-?\d+\s*$/.test(raw)) {
      if (coordinates && last.forwarded) return finish('В пересылке точка ' + coordinates.slice(1, 4).join(' ') + '. Это цитата: не стану записывать её как твою базу без уточнения.');
      if (coordinates && !/не\s+(?:запомин|сохраня)/.test(text)) {
        m.coords = coordinates.slice(1, 4).join(' '); m.topic = 'coords';
        return finish(`Запомнил твою точку: ${m.coords}. Потом можешь спросить «напомни координаты».`);
      }
      if (/мои|мою|моя|наши|напомни|помнишь|где я/.test(text)) return finish(m.coords ? `Ты оставлял координаты: ${m.coords}.` : 'Ты ещё не присылал мне свои координаты. Напиши три числа: X Y Z.');
      return finish(id === 'b2' ? 'Чужие и удалённые координаты я не пересказываю. Свою точку можешь прислать тремя числами — запомню.' : 'Своих координат я не присылал. Придумывать точку не буду.');
    }
    if (/забудь|очисти.*(?:память|коорд)/.test(text)) {
      m.coords = ''; m.build = ''; m.material = ''; m.quote = null; m.topic = ''; m.awaiting = ''; m.character = null;
      return finish('Наши договорённости и запомненную точку забыл. Сообщения и вещи от этого не удаляются.');
    }
    const character = window.ZMMaxDialogue;
    const characterReply = () => {
      const answer=character.answer(contact.persona,raw,m.character||{});
      m.character=answer.memory;return finish(answer.text);
    };
    if(contact.persona && character){
      const topic=character.topicFor(raw,contact.persona,m.character?.lastTopic);
      if(new Set(['age','music','lyrics','second','notHeard','heard','critic','food','ate','noFood','homework','doneHomework','lateHomework','wifi','stream','noStream','streamProblem','outfit','peace','endPeace','raid','support','sorry','compliment','insult','andYou']).has(topic))return characterReply();
    }
    if (/не\s+(?:хоч\p{L}*|буд\p{L}*|надо|нуж\p{L}*|покуп\p{L}*|беру|брать|меня\p{L}*)|отмен\p{L}*|передум\p{L}*/u.test(text)) {
      if (m.quote) {
        m.quote = null; m.awaiting = ''; m.topic = '';
        return finish('Договорённость отменена. Ничего не списываю; уже отправленные подарки — отдельные предложения в чате.');
      }
      return finish(id === 'b2' ? 'Тогда не настаиваю. Хочешь сменить материал или вообще другую постройку?' : 'Не настаиваю. Сообщение само по себе вещи не отправляет.');
    }
    // This describes existing MAX actions, not imaginary commands or benefits.
    if (/как|можно|почему|зачем|где|что (?:за|такое)/.test(text)) {
      if (/подар|переда|отправ.*(?:вещ|предмет)|обмен/.test(text) && !/алмаз.*(?:цен|стоит)|купл/.test(text)) return finish('В MAX вещи отправляют через «+» → подарок, до четырёх стаков. Они лежат в эскроу до решения получателя. Отклонённое возвращается; текст в чате не является переводом.');
      if (/профил|аватар|витрин|никнейм|сменить ник/.test(text)) return finish('Нажми на свой профиль слева: ник до 24 символов, описание до 120, стандартная или загруженная аватарка и один предмет на витрине. Витрина не даёт бонусов.');
      if (/файл|картинк|скрин|видео/.test(text)) return finish('Файл прикрепляют через «+» или перетаскивают в окно. Вложение пересылается отдельно от подписи. Я могу подтвердить получение, но не рассмотреть его за тебя.');
      if (/антиценз|исказ|ругат|матер|замен.*слов|(?:не то|другое).*(?:пиш|отправ)/.test(text)) return finish('Это антицензура MAX: сервер заменяет слова при отправке. Я понимаю твою исходную фразу, но наши видимые сообщения всё равно проходят через неё. Отключателя в моде нет.');
      if (/получ.*(?:макс|max)|(?:макс|max).*(?:получ|скрафт|рецепт)/.test(text)) return finish('MAX выдаётся при первом входе: сначала девятый слот, потом свободный. Если места нет — выпадет рядом. Метка выдачи переживает смерть, поэтому повторно предмет не приходит.');
      if (/пересла|удален|удалён/.test(text)) return finish('Пересылка использует сохранённое тело сообщения и не прогоняет его через антицензуру второй раз. Удалить сообщение и стереть все его пересылки — не одно и то же.');
    }
    const diamond = /алмаз|diamond/.test(text);
    const buying = /купл|купит|покуп|возьм|беру|давай|хочу|нужн/.test(text);
    const shortQuantity = /^(?:а\s+)?(?:\d+|один|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять|пару)[?!.,\s]*$/.test(text);
    const quotedPrice = /алмаз/.test(quoted) && /желез/.test(quoted);
    const tradeFollowup = (m.quote || m.awaiting === 'quantity') && (shortQuantity || /сколько|цена|почем|плачу|желез|дорог|дешев|торг|скидк|помнишь|напомни/.test(text) || exact(text, ['да','ага','ок','окей','согласен','согласна']));
    if (id === 'b4' && (diamond || tradeFollowup || (quotedPrice && /сколько|цена|почем/.test(text)))) {
      if (/дешев|скидк|торг|дорог/.test(text)) return finish('Курс тот же: один алмаз за три железа. Текстом цену не меняем.');
      if (m.quote && /желез/.test(text) && !diamond && !buying) {
        const paid = quantity(text);
        return finish(paid !== null && paid < m.quote.qty * 3 ? `За ${diamonds(m.quote.qty)} нужно ${m.quote.qty * 3} железа; ${paid} не хватит. Можем уменьшить количество.` : `Для нашей договорённости нужно ${m.quote.qty * 3} железа. Отправь через подарок; лишнее железо верну сдачей отдельным подарком с алмазами.`);
      }
      if (/какой|зачем|что (?:за|это)|откуда/.test(text) && !buying) return finish('Речь об обычных алмазах. Цена — три железных слитка за один. Никаких особых свойств у них нет.');
      if (buying || (diamond && quantity(text) !== null) || ((m.quote || m.awaiting === 'quantity') && shortQuantity)) {
        const qty = quantity(text) ?? m.quote?.qty ?? 1;
        if (!Number.isInteger(qty) || qty < 1 || qty > 64 || /\d+[.,]\d+/.test(text)) return finish('Укажи от одного до 64 алмазов. Ноль, отрицательные количества и дроби не подходят.');
        m.quote = { qty }; m.topic = 'trade'; m.awaiting = 'payment';
        return finish(`${diamonds(qty)} — ${qty * 3} железа. Шли железо через «+» → подарок, а я после принятия отправлю алмазы в ответ. Пока это только договорённость, не списание вещей.`);
      }
      if (m.quote && exact(text, ['да', 'согласен', 'согласна', 'ок', 'окей', 'ага'])) return finish(`Жду подарок: ${m.quote.qty * 3} железа за ${diamonds(m.quote.qty)}. Одного «да» недостаточно: кнопка отправки вещей отдельная.`);
      if (!m.quote) { m.topic = 'trade'; m.awaiting = 'quantity'; }
      return finish(m.quote ? `Договорились о ${diamonds(m.quote.qty)} за ${m.quote.qty * 3} железа. Можно изменить количество или отменить. Ничего ещё не списано.` : 'Один алмаз — три железа. Сколько хочешь купить?');
    }
    if (diamond && id !== 'b4') return finish(id === 'b2' ? 'За алмазами лучше к клану «Чеченцы»: он сам написал свой курс в чате. Я больше по стройке.' : 'Алмазы продаёт Клан «Чеченцы». Я не буду обещать чужие вещи.');
    const buildMatch = text.match(/замок|башн\p{L}*|ферм\p{L}*|мост\p{L}*|дом\p{L}*/u);
    const materialMatch = text.match(/булыжник\p{L}*|камен\p{L}*|камн\p{L}*|дуб\p{L}*|дерев\p{L}*|кирпич\p{L}*|стекл\p{L}*|земл\p{L}*/u);
    const building = /стро|построй|постро|совет|материал/.test(text) || !!buildMatch || (m.topic === 'build' && !!materialMatch);
    if (building) {
      m.topic = 'build';
      if (buildMatch && !/твой|твоя|ты стро/.test(text)) {
        const part = buildMatch[0]; m.build = part.startsWith('башн') ? 'башня' : part.startsWith('ферм') ? 'ферма' : part.startsWith('дом') ? 'дом' : part.startsWith('мост') ? 'мост' : 'замок';
      }
      if (materialMatch) {
        const part = materialMatch[0]; m.material = /камен|камн/.test(part) ? 'камень' : /дуб/.test(part) ? 'дуб' : /дерев/.test(part) ? 'дерево' : /кирпич/.test(part) ? 'кирпич' : /стекл/.test(part) ? 'стекло' : /земл/.test(part) ? 'земля' : 'булыжник';
      }
      if (id !== 'b2') return finish(id === 'b4' ? 'По постройкам спроси Готку. Если нужны алмазы — скажи количество.' : 'Готка строит замки. С планом постройки она поможет лучше меня.');
      if (/что (?:ты )?стро|чем занима/.test(text)) { m.awaiting = 'build'; return finish('Замки строю. А ты что задумал: дом, башню или что-то другое?'); }
      if (!m.build) { m.awaiting = 'build'; return finish('Сначала определимся с постройкой. Что планируешь: дом, башню, замок, мост или ферму?'); }
      if (!m.material) { m.awaiting = 'material'; return finish(`Так, ${m.build}. Из чего строим — камень, дуб, кирпич? Можно ответить одним материалом, постройку я помню.`); }
      m.awaiting = '';
      const tips = { башня:'Сделай основание шире верхушки и оставь место лестнице, прежде чем поднимать стены.', дом:'Сначала разметь комнаты и окна. Иначе придётся пробивать готовые стены.', замок:'Начни с контура стен и ворот. Башни удобнее привязать к уже понятному периметру.', мост:'Сначала наметь два берега и ширину прохода, потом добавляй опоры.', ферма:'Сначала проверь место под посадки, воду и проходы. Красоту можно навести после.' };
      return finish(`Для ${({башня:'башни',дом:'дома',замок:'замка',мост:'моста',ферма:'фермы'})[m.build]} берём ${m.material}. ${tips[m.build]} ${m.material === 'земля' ? 'Земля годится для разметки; постоянные стены лучше потом заменить.' : ''}`.trim());
    }
    if (/помнишь|напомни|о чем|про что/.test(text)) {
      if (m.topic === 'build' && m.build) return finish(`Обсуждали твою постройку: ${m.build}${m.material ? ', материал — ' + m.material : '. Материал ты ещё не выбрал'}.`);
      if (m.quote) return finish(`У нас было ${diamonds(m.quote.qty)} за ${m.quote.qty * 3} железа. Само сообщение ничего не отправляет.`);
      if (m.coords) return finish('Ты оставлял точку ' + m.coords + '.');
      return finish('Пока не о чем напоминать. Давай сначала договоримся, что обсуждаем.');
    }
    if (/желез/.test(text)) return finish(id === 'b1' ? 'Да, железо нужно. Если решишь поделиться — отправь именно подарок, не просто название слитка. За это я не обещал алмазы.' : id === 'b4' ? 'Один алмаз стоит три железа. Скажи, сколько алмазов нужно, и договоримся до отправки вещей.' : 'Что именно про железо: нужно найти, подарить или купить за него алмазы у клана «Чеченцы»?');
    if(contact.persona && character)return characterReply();
    if (/спасибо|благодар|спс/.test(text)) return finish(id === 'b2' ? 'Если план пригодился — строй. Только вход не забудь.' : 'Обращайся. Вещи, если что, проверяй в карточках подарков.');
    if (exact(text, ['пока', 'до свидания', 'увидимся', 'ушел', 'ушла'])) return finish(id === 'b2' ? 'Увидимся. Я к стройке.' : 'Увидимся. Договорённости в переписке остаются.');
    if (/как (?:дела|ты|сам|сама)|что нового/.test(text)) return finish(id === 'b2' ? 'Строю, как и написано в профиле. Ты со стройкой пришёл или просто поболтать?' : id === 'b4' ? 'Торгую. Курс не поменялся: алмаз за три железа. А ты с чем?' : 'На месте. Железо всё ещё пригодится. Ты как?');
    if (id === 'b4' && !m.quote && exact(text, ['привет','салам','ку','здарова'])) { m.topic = 'trade'; m.awaiting = 'quantity'; }
    if (exact(text, ['привет', 'салам', 'здравствуй', 'здравствуйте', 'ку', 'здарова', 'дарова', 'хай'])) return finish(id === 'b2' ? pick(['Привет. Я по стройке, но слушаю. Что задумал?', 'На связи. Если про постройку — расскажи, что строишь.']) : id === 'b4' ? 'На связи. Алмазы по три железа; можешь сразу назвать количество.' : pick(['Салам. Чем занят?', 'На связи. Железо нашлось или с другим вопросом?']));
    if (exact(text, ['да', 'ага', 'ок', 'окей', 'нет', 'неа', 'понятно'])) {
      if (m.awaiting === 'build') return finish('Нужно название постройки, а не просто согласие. Дом, башня, замок — что выбираешь?');
      if (m.awaiting === 'material') return finish(`Постройку помню: ${m.build}. Осталось назвать материал.`);
      return finish('Понял. Если это ответ на конкретное сообщение, можешь выделить его и нажать «Ответить».');
    }
    if (quoted) {
      if (/желез/.test(quoted)) return finish('Ты отвечаешь на сообщение про железо. Уточни: количество, подарок или цена?');
      if (/стро|замок|башн/.test(quoted)) return finish('Ты отвечаешь на сообщение о постройке. Что нужно уточнить: форму, материал или план?');
      return finish('Вижу, на какое сообщение ты отвечаешь. Но что именно в нём нужно уточнить?');
    }
    return finish(id === 'b2' ? pick(['Не поняла вопрос. Если про стройку — назови постройку и материал.', 'Сформулируй чуть точнее. Я могу обсудить твою постройку или действия MAX.']) : id === 'b4' ? 'Не понял предложение. По алмазам назови количество; по MAX — спроси конкретное действие.' : pick(['Не уловил, о чём ты. Это про железо, подарок или сам MAX?', 'Скажи конкретнее, без угадайки. Что ты хотел обсудить?']));
  }
  function gift({ contact, memory:previous, stacks, items }) {
    const m = memory(previous), list = stacks.map(stack => `${stack.n} × ${items[stack.id] || stack.id}`).join(', ');
    const finish = (accept, text, offer = []) => ({ accept, text, offer, memory:m });
    if (contact.id === 'b4' && m.quote) {
      const iron = stacks.filter(stack => stack.id === 'iron_ingot').reduce((sum, stack) => sum + stack.n, 0), cost = m.quote.qty * 3;
      if (stacks.some(stack => stack.id !== 'iron_ingot')) return finish(false, 'Для этой договорённости нужно только железо. Смешанный подарок отклонил: все вещи возвращаются.');
      if (iron < cost) return finish(false, `За ${diamonds(m.quote.qty)} нужно ${cost} железа. В подарке ${iron}; отклонил, железо возвращается.`);
      const offer = [{ id:'diamond', n:m.quote.qty }];
      if (iron - cost > 192) return finish(false, 'Слишком много сдачи для четырёх слотов. Железо вернул целиком; отправь ближе к договорённой сумме.');
      for (let change = iron - cost; change > 0; change -= 64) offer.push({ id:'iron_ingot', n:Math.min(64, change) });
      const qty = m.quote.qty; m.quote = null; m.awaiting = ''; m.topic = '';
      return finish(true, `Получил ${iron} железа. Отправил ${diamonds(qty)}${iron > cost ? ' и сдачу ' + (iron - cost) + ' железа' : ''} отдельным подарком. Прими его кнопкой ✓ — до этого вещи не в твоём инвентаре.`, offer);
    }
    if (contact.id === 'b4' && stacks.some(stack => stack.id === 'iron_ingot')) return finish(false, 'Железо вернул: сначала скажи, сколько алмазов хочешь купить. Иначе непонятно, это подарок или оплата.');
    if (contact.id === 'b2' && stacks.every(stack => stack.id === 'rotten_flesh' || stack.id === 'dirt')) return finish(false, `Для стройки мне это не нужно: ${list}. Отклонила, предметы вернулись.`);
    return finish(true, contact.id === 'b2' ? `Приняла: ${list}. За подарок ничего взамен не обещала — спасибо за помощь.` : `Принял: ${list}. Это подарок, не оплата неоговорённой сделки.`);
  }
  window.ZMMaxConversation = Object.freeze({ reply, gift, quantity });
})();
