/* =====================================================================
   №08 · Made in Heaven — данные из кода мода (MadeInHeavenItem,
   MadeInHeavenHandler, ModEnchantments) и json-файлов ачивок/рецепта.
   Механика целиком: mod-src/java/p08/MECHANICS.md
   ===================================================================== */
window.ZM = window.ZM || {};
ZM.P08 = {
  id: "zitraksmode:made_in_heaven",
  name: "Made in Heaven",
  tooltip: ["Фрагмент самого времени", "ПКМ чтобы ускорить время", "Во время действия отражает снаряды", "Одноразовый предмет"],
  enchantability: 15,

  /* тайминги в тиках (20 тиков = 1 секунда) */
  T: { total: 940, reset: 720, shake: 520, shakeLen: 200, lasers: 500, weatherFrom: 0.8, weatherEvery: 30 },
  reflectRadius: 4.5,

  /* скорость игрока по прогрессу p = тик / 720 */
  speed: [[0.3, 2.5], [0.6, 3.5], [0.85, 5], [1, 8]],

  /* сообщения из кода (цвета как в игре) */
  msg: {
    on: "Made in Heaven активирован...",
    busy: "Made in Heaven уже активирован! Подождите завершения...",
    dead: "Made in Heaven отменён: пользователь умер.",
    reset: "⚡ СБРОС ВСЕЛЕННОЙ ⚡",
    buff: "✨ Получен эффект вселенной: ",
  },

  recipe: { p: ["DDD", "DCD", "DDD"], key: { D: { id: "diamond_block", name: "Алмазный блок", icon: "iso_diamond_block" }, C: { id: "clock", name: "Часы", icon: "clock" } } },

  /* 12 эффектов вселенной: 2400 тиков (2 минуты), уровень II; иконки: effects.png по порядку */
  effects: [
    { id: "regeneration", name: "Регенерация", c: "#cd5cab" },
    { id: "damage_resistance", name: "Сопротивление", c: "#99453a" },
    { id: "fire_resistance", name: "Огнестойкость", c: "#e49a3a" },
    { id: "water_breathing", name: "Подводное дыхание", c: "#2e5299" },
    { id: "night_vision", name: "Ночное зрение", c: "#1f1fa1" },
    { id: "health_boost", name: "Прилив здоровья", c: "#f87d23" },
    { id: "absorption", name: "Поглощение", c: "#2552a5" },
    { id: "saturation", name: "Насыщение", c: "#f82423" },
    { id: "luck", name: "Удача", c: "#339900" },
    { id: "slow_falling", name: "Плавное падение", c: "#f7f8e0" },
    { id: "hero_of_the_village", name: "Герой деревни", c: "#44ff44" },
    { id: "dolphins_grace", name: "Грация дельфина", c: "#88a3be" },
  ],

  /* зачарования (пришли позже самого предмета) */
  ench: {
    // ENCHANT_NAMES: названия из lang-файла
    yobyr: { key: "yobyr_mamok", name: "Ёбырь мамок", c: "#ff7ab6" },
    labubu: { key: "hochu_labubu", name: "Хочу Лабубу", c: "#ffd34d" },
    ver: "1.1.0", verName: "Энчант-апдейт", date: "18.07.2026",
    // из YobyrMamokEnchantment / HochuLabubuEnchantment (одинаковые параметры)
    rarity: "Редкое", maxLevel: 1, minCost: 12, maxCost: 35, books: true, discoverable: true, treasure: false,
  },
  /* радиусы сброса: [100%, максимум] */
  radius: { none: [8, 20], one: [2, 5], both: [4, 10] },
  /* таблицы замены */
  yobyrTable: { hentai: 80, rest: ["end_rod", "black_wool", "orange_wool", "quartz", "poppy", "red_tulip", "rose_bush", "cactus", "lapis"] },
  labubuTable: [["stone", 35], ["gold_block", 20], ["box", 20], ["poppy", 7], ["cactus", 7], ["lapis", 7], ["figure", 4]],
  labubuExtra: 10,
  names: {
    end_rod: "Стержень Энда", black_wool: "Чёрная шерсть", orange_wool: "Оранжевая шерсть", quartz: "Кварцевый блок", poppy: "Мак",
    red_tulip: "Красный тюльпан", rose_bush: "Розовый куст", cactus: "Кактус", lapis: "Лазуритовый блок", stone: "Камень",
    gold_block: "Золотой блок", box: "Коробка Лабубу", figure: "Лабубу", hentai: "Хентай-блок",
    grass_top: "Блок дёрна", dirt: "Земля", sand: "Песок", gravel: "Гравий", water: "Вода", oak_planks: "Дубовые доски", oak_log: "Дубовое бревно",
    oak_leaves: "Дубовая листва", cobblestone: "Булыжник", bookshelf: "Книжная полка", crafting_table: "Верстак", glass: "Стекло",
    oak_door: "Дубовая дверь", torch: "Факел", dandelion: "Одуванчик", oxeye_daisy: "Нивяник", white_bed: "Белая кровать", bedrock: "Бедрок",
  },

  /* JoJo, часть 6 «Stone Ocean»: 14 слов из дневника DIO (они же описание ачивки craft_mih) */
  words: [
    ["螺旋階段", "Rasen Kaidan", "Спиральная лестница"],
    ["カブト虫", "Kabutomushi", "Жук-носорог"],
    ["廃墟の街", "Haikyo no Machi", "Город-руины"],
    ["イチジクのタルト", "Ichijiku no Taruto", "Фиговый тарт"],
    ["カブト虫", "Kabutomushi", "Жук-носорог"],
    ["ドロローサへの道", "Dororōsa e no Michi", "Путь на Виа Долороза"],
    ["カブト虫", "Kabutomushi", "Жук-носорог"],
    ["特異点", "Tokuiten", "Особая точка"],
    ["ジョット", "Jotto", "Джотто"],
    ["天使", "Tenshi", "Ангел"],
    ["紫陽花", "Ajisai", "Гортензия"],
    ["カブト虫", "Kabutomushi", "Жук-носорог"],
    ["特異点", "Tokuiten", "Особая точка"],
    ["秘密の皇帝", "Himitsu no Kōtei", "Тайный император"],
  ],
  /* параметры стенда, как в карточках JoJo */
  stand: {
    name: "Made in Heaven", kana: "メイド・イン・ヘブン", user: "Энрико Пуччи",
    stats: [["Разрушительная сила", "B"], ["Скорость", "∞"], ["Дальность", "A"], ["Прочность", "A"], ["Точность", "C"], ["Потенциал", "A"]],
  },
  quotes: {
    primes: "Простые числа одиноки: делятся только на единицу и на себя. Они придают мне сил.",
    fate: "Знать свою судьбу и принять её. Это и есть счастье.",
  },

  advancements: [
    { key: "craft_mih", title: "Рецепт из дневника DIO.", color: "f", frame: "task", xp: 10, icon: "made_in_heaven", hidden: true, chat: true,
      desc: "Rasen Kaidan… Kabutomushi! Haikyo no Machi! Ichijiku no Taruto! Kabutomushi… Dororōsa e no Michi! Kabutomushi! Tokuiten! Jotto! Tenshi! Ajisai! Kabutomushi! Tokuiten! Himitsu no Kōtei!",
      how: "Скрафтить Made in Heaven." },
    { key: "activate_mih", title: "Время ускоряет свой ход...", color: "b", frame: "task", xp: 15, icon: "clock", hidden: true, chat: true,
      desc: "Активация прошла успешна, вы почти достигли рая... Пуччи доволен...",
      how: "Нажать ПКМ с Made in Heaven в руке." },
    { key: "universe_reset", title: "РЕСЕТ ВСЕЛЕННОЙ", color: "6", bold: true, frame: "challenge", xp: 50, icon: "nether_star", hidden: true, chat: true,
      desc: "To be continued...",
      how: "Дожить до 720-го тика после активации." },
  ],

  history: [
    { ver: "18.02.2026", date: "18.02.2026", tag: "новый пункт", title: "Made in Heaven", text: "Предмет, который разгоняет время до сброса вселенной. Одна активация на мир, отражение снарядов, эффект вселенной." },
    { ver: "1.0.3", date: "25.06.2026", tag: "исправление", title: "Made in Heaven починен", text: "Вошёл в пачку исправлений вместе с Супер-ТНТ, JBL-колонкой, тетрадью смерти и аурой Будды Лабубу." },
    { ver: "1.1.0", date: "18.07.2026", tag: "Энчант-апдейт", title: "Зачарования сброса", text: "«Ёбырь мамок» и «Хочу Лабубу»: радиус сброса меньше, зато вместо случайных блоков свой набор." },
  ],
};
