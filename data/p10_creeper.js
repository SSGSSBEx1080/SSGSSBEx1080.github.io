/* =====================================================================
   №10 · Кастрация криперов + Супер-TNT
   Механика из кода мода: mod-src/java/p10/MECHANICS.md
   Ванильные числа 1.19.2: Creeper, PrimedTnt, MinecartTNT, Explosion, LightningBolt.
   ===================================================================== */
window.ZM = window.ZM || {};
ZM.P10 = {
  // ванильный Creeper 1.19.2
  patient: [
    ["20", "здоровье", "10 сердец"],
    ["3", "сила взрыва", "заряженный ×2 = 6"],
    ["30", "тиков фитиль", "1,5 секунды"],
    ["0,25", "скорость", "атрибут movement_speed"],
    ["0–2", "пороха с дропа", "Добыча добавляет"],
    ["1,7", "рост", "блока"],
  ],
  // до / после (CreeperCastrationHandler + mixin рендера)
  compare: [
    ["Лицо", "обычное", "в ахуе (своя текстура)"],
    ["Взрыв", "сила 3, заряженный 6", "никогда"],
    ["Шипение", "за 1,5 с до взрыва", "нет: SwellGoal удалён"],
    ["Порох", "0–2 при смерти", "0–2 при смерти"],
    ["Повторно", "—", "нельзя: метка IsCasted"],
  ],
  items: {
    creeper_eggs: { name: "Яйца Крипера", id: "zitraksmode:creeper_eggs", food: 2, satMod: 0.3, stack: 64, color: "#ffffff",
      note: "Сырые. 20% шанс Тошноты на 10 секунд.", eff: { p: 0.2, sec: 10 } },
    cooked_creeper_eggs: { name: "Жареные Яйца Крипера", id: "zitraksmode:cooked_creeper_eggs", food: 8, satMod: 0.8, stack: 64, color: "#ffffff",
      note: "Как стейк: 4 окорочка и 12,8 насыщения. Без побочек." },
    charged_creeper_eggs: { name: "Заряженные Яйца Крипера", id: "zitraksmode:charged_creeper_eggs", food: 0, stack: 64, color: "#55ffff", rare: true,
      note: "Редкие, светятся как зачарованные. Не едятся, зато из них собирается Супер-TNT." },
    creeper_statue: { name: "Статуя Крипера", id: "zitraksmode:creeper_statue", stack: 64, color: "#ffffff", note: "Высотой в два блока, смотрит туда, куда ставишь." },
    super_tnt: { name: "Супер-TNT", id: "zitraksmode:super_tnt", stack: 64, color: "#ffffff", note: "Сила 20 против 4 у обычного. Сушит воду, зовёт молнии." },
    super_tnt_minecart: { name: "Вагонетка с Супер-TNT", id: "zitraksmode:super_tnt_minecart", stack: 1, color: "#ffffff", note: "Ставится на рельсы. Чем быстрее едет, тем сильнее рвёт." },
  },
  cook: { furnace: 200, smoker: 100, xp: 0.35 },
  tnt: { fuse: 80, power: 20, vanilla: 4, dry: 20, bolts: 10, boltGap: 3, boltR: 15, chainMin: 10, chainMax: 29 },
  ignite: [
    ["flint_and_steel", "Огниво", "ПКМ по блоку. Прочность −1"],
    ["fire_charge", "Огненный шар", "Тоже ПКМ, заряд тратится"],
    ["redstone_torch", "Редстоун", "Любой сигнал: рычаг, кнопка, факел"],
    ["lava", "Огонь или лава рядом", "Даже при установке рядом с ними"],
    ["arrow", "Горящий снаряд", "Стрела с огнём попала, и всё"],
    ["dispenser_front", "Раздатчик", "Выстреливает уже зажжённым"],
    ["explosion_3", "Чужой взрыв", "Цепной фитиль 0,5–1,5 с"],
  ],
  rules: [
    ["mod/knife", "Чем резать", "Ножницы или нож. ПКМ по криперу, инструмент теряет 1 прочности."],
    ["casted_face", "Один раз", "После операции на крипере метка IsCasted. Второй раз резать нечего."],
    ["iso/creeper_eggs", "Что выпадает", "1–2 яйца. С заряженного выпадают заряженные, и за это отдельная ачивка."],
    ["creeper_face", "Больше не взорвётся", "Мозг, отвечающий за взрыв, удалён вместе с яйцами. Шипеть и раздуваться он уже не будет."],
    ["iso/creeper_statue", "Статуя без кирки", "Сломал рукой или не той киркой: вместо статуи 9 сырых яиц."],
    ["iso/super_tnt", "Супер-TNT не дропается", "Ломается мгновенно, но чужой взрыв его просто поджигает, а не выбивает."],
    ["water", "Воды не будет", "После взрыва вся вода и лава в радиусе 20 исчезают. Блоки с водой внутри тоже."],
    ["mod/super_tnt_minecart", "В вагонетке молнии бьют всех", "Блок бережёт того, кто поджёг. Вагонетке плевать, достанется и тебе."],
  ],
  advancements: [
    { key: "castrate_creeper", title: "Чик, и больше не мужик.", color: "a", frame: "task", xp: 5, icon: "creeper_spawn_egg", hidden: true, chat: true,
      desc: "Кастрируй обычного крипера. Он больше не взорвётся.", how: "Операционная: ножницы по обычному криперу" },
    { key: "eat_creeper_eggs", title: "Много белка", color: "a", frame: "task", xp: 5, icon: "iso/creeper_eggs", hidden: true, chat: true,
      desc: "Съешь сырые яйца крипера. На вкус как §k?????§r", how: "Раздел «Яйца»: съесть сырые" },
    { key: "castrate_charged_creeper", title: "Очень опасная затея окупается.", color: "b", frame: "goal", xp: 20, icon: "iso/charged_creeper_eggs", hidden: true, chat: true,
      desc: "Каким свирепым не был бык, на банке пишется «Тушенка». Кастрируй заряженного крипера.", how: "Операционная: сначала молния, потом ножницы" },
    { key: "cook_creeper_eggs", title: "Жареные яйца", color: "a", frame: "task", xp: 5, icon: "iso/cooked_creeper_eggs", hidden: true, chat: true,
      desc: "Приготовь яйца крипера в печи, попечи, подрочи, посоли, подожди, поеби, вскибиди.", how: "Печь или коптильня: забрать результат" },
    { key: "place_creeper_statue", title: "Памятник охуевшему криперу", color: "b", frame: "goal", xp: 20, icon: "iso/creeper_statue", hidden: true, chat: true,
      desc: "Скрафти и установи статую крипера. Можно пугать игроков тем что у тебя дома крипер домашний, ебать обосруться.", how: "Раздел «Статуя»: скрафтить из 9 яиц и поставить" },
    { key: "craft_super_tnt", title: "Супер-ТНТ", color: "c", bold: true, frame: "challenge", xp: 50, icon: "iso/super_tnt", hidden: true, chat: true,
      desc: "Скрафти Супер-ТНТ. Мощнее не бывает. Опенгеймер в ахуе. Безопасная пиротехническая дистанция - 200 блоков. Смертельно.", how: "Верстак: 8 TNT вокруг заряженных яиц" },
    { key: "craft_super_tnt_minecart", title: "ТНТ-вагон. Фейк такси.", color: "c", bold: true, frame: "goal", xp: 25, icon: "mod/super_tnt_minecart", hidden: true, chat: true,
      desc: "Засунул Супер-ТНТ в вагонетку, всему РЖД пиздец. Ах этот запах вокзала.", how: "Раздел «Вагонетка»: Супер-TNT над вагонеткой" },
    { key: "activate_super_tnt", title: "Детонация", color: "c", bold: true, frame: "task", xp: 10, icon: "iso/tnt", hidden: true, chat: true,
      desc: "Котлеты в фарш обратно не провернёшь... Хуй не нос, назад не шмыгнешь...", how: "Полигон: поджечь Супер-TNT" },
  ],
  history: [
    { ver: "23.02.2026", date: "23.02.2026", tag: "новый пункт", icon: "casted_face", c: "#4caf50",
      title: "Кастрация криперов", text: "Ножницы или нож по криперу, и он больше никогда не взорвётся. Яйца сырые, жареные и заряженные, статуя крипера из девяти яиц и Супер-TNT силой 20 с осушкой и молниями." },
    { ver: "1.0.3", date: "25.06.2026", tag: "фикс", icon: "iso/super_tnt", c: "#ff8a70",
      title: "Исправление Супер-TNT", text: "Супер-TNT починен." },
    { ver: "1.1.0", date: "18.07.2026", tag: "энчант-апдейт", icon: "mod/super_tnt_minecart", c: "#b37bff",
      title: "Вагонетка с Супер-TNT", text: "Супер-TNT поехал по рельсам. Чем быстрее вагонетка, тем сильнее взрыв, а молнии после бьют всех подряд." },
  ],
};
