/* =====================================================================
   №06 · Лабубу-система: все цифры взяты из Java-кода мода
   (LabubuType / LabubuRarity / LabubuLootTable / LabubuCaseScreen /
   LabubuAuraHandler), выжимка в mod-src/java/p06/MECHANICS.md.
   Названия фигурок: ИМЕНА ПРАВИТЬ ТУТ (поле name), больше нигде.
   ===================================================================== */
window.ZM = window.ZM || {};
ZM.P06 = {
  id: "zitraksmode:labubu_box",
  date: "31.12.2025",

  /* LabubuRarity: вес в луте, цвет тултипа, цвета слота рулетки (фон / рамка) */
  rarities: [
    { key: "COMMON",    ru: "ОБЫЧНАЯ",     weight: 40, mc: "#FFFFFF", bg: "#343434", border: "#E0E0E0", next: "UNCOMMON" },
    { key: "UNCOMMON",  ru: "НЕОБЫЧНАЯ",   weight: 30, mc: "#55FF55", bg: "#1C4B1C", border: "#55FF55", next: "RARE" },
    { key: "RARE",      ru: "РЕДКАЯ",      weight: 15, mc: "#5555FF", bg: "#1B2E66", border: "#5599FF", next: "EPIC" },
    { key: "EPIC",      ru: "ЭПИЧЕСКАЯ",   weight: 10, mc: "#FF55FF", bg: "#4B1D66", border: "#FF55FF", next: "LEGENDARY" },
    { key: "LEGENDARY", ru: "ЛЕГЕНДАРНАЯ", weight: 5,  mc: "#FFFF55", bg: "#6C5512", border: "#FFD54A", next: null },
  ],

  /* LabubuType: 26 фигурок. r = радиус ауры (куб вокруг игрока), по умолчанию 6 */
  types: [
    { key: "red",         rar: "COMMON",    name: "Красный Лабубу",       aura: "+1 к урону",                        tag: "урон" },
    { key: "blue",        rar: "COMMON",    name: "Синий Лабубу",         aura: "прыжок выше",                       tag: "прыжок" },
    { key: "yellow",      rar: "COMMON",    name: "Желтый Лабубу",        aura: "+7% к скорости",                    tag: "скорость" },
    { key: "white",       rar: "COMMON",    name: "Белый Лабубу",         aura: "−6% входящего урона",               tag: "защита" },
    { key: "black",       rar: "COMMON",    name: "Черный Лабубу",        aura: "+5% к урону",                       tag: "урон" },
    { key: "green",       rar: "COMMON",    name: "Зеленый Лабубу",       aura: "лечит раз в 5 секунд",              tag: "лечение" },
    { key: "purple",      rar: "UNCOMMON",  name: "Фиолетовый Лабубу",    aura: "+10% к скорости копания",           tag: "копание" },
    { key: "black_white", rar: "UNCOMMON",  name: "Черно-белый Лабубу",   aura: "+5% урона и −6% входящего",         tag: "баланс" },
    { key: "striped",     rar: "UNCOMMON",  name: "Полосатый Лабубу",     aura: "ночью бьёт, днём держит",           tag: "день/ночь" },
    { key: "kazakh",      rar: "RARE",      name: "Казахский Лабубу",     aura: "×2 по лошадям, лошади Скорость II",  tag: "лошади" },
    { key: "ukrainian",   rar: "RARE",      name: "Украинский Лабубу",    aura: "×2 по свиньям, сало быстрее",       tag: "свиньи" },
    { key: "japanese",    rar: "RARE",      name: "Японский Лабубу",      aura: "двойной улов, Удача II",            tag: "рыбалка" },
    { key: "top_hat",     rar: "RARE",      name: "Лабубу в цилиндре",    aura: "шлем держит на 75% лучше",          tag: "шлем" },
    { key: "faseless",    rar: "RARE",      name: "Безликий Лабубу",      aura: "свои снаряды быстрее, чужие вязнут", tag: "снаряды" },
    { key: "russian",     rar: "EPIC",      name: "Российский Лабубу",       aura: "+50% урона и пьяная камера",        tag: "урон" },
    { key: "neon",        rar: "EPIC",      name: "Сломанный Лабубу",     aura: "ночное зрение",                     tag: "зрение" },
    { key: "litvin",      rar: "EPIC",      name: "Литвин Лабубу",        aura: "в присяде +75% урона",              tag: "присяд" },
    { key: "anonymous",   rar: "EPIC",      name: "Лабубу-анонимус",     aura: "невидимость, мобы теряют цель",     tag: "стелс", r: 3 },
    { key: "demon",       rar: "EPIC",      name: "Демон Лабубу",         aura: "огнестойкость и поджог мобов",      tag: "огонь" },
    { key: "angel",       rar: "EPIC",      name: "Ангел Лабубу",         aura: "спасает от смерти",                 tag: "жизнь" },
    { key: "galactic",    rar: "LEGENDARY", name: "Галактический Лабубу", aura: "вихрь из предметов, мобы отлетают", tag: "гравитация" },
    { key: "rainbow",     rar: "LEGENDARY", name: "Радужный Лабубу",      aura: "животные влюбляются",               tag: "любовь" },
    { key: "golden",      rar: "LEGENDARY", name: "Золотой Лабубу",       aura: "яблоки и морковь → золотые",        tag: "золото" },
    { key: "buddha",      rar: "LEGENDARY", name: "Будда Лабубу",         aura: "в радиусе нельзя бить и ломать",    tag: "мир", r: 8 },
    { key: "booba",       rar: "LEGENDARY", name: "ЛаBOOBA",              aura: "ведро раз в 10 секунд",             tag: "18+" },
    { key: "anime",       rar: "LEGENDARY", name: "Аниме Лабубу",         aura: "5 случайных баффов каждые 5 с",     tag: "рандом" },
  ],

  /* Рулетка LabubuCaseScreen */
  caseScreen: {
    slots: 140, winner: 95, spinTicks: 100, fastTicks: 70, fastShare: 0.9, revealTicks: 20,
    revealScale: [2.4, 10], slotW: 78, slotH: 104, step: 86, sound: "case_battle", volume: 2.25,
  },

  /* Ачивки: mod-src/advancements/p06/*.json (цепочка идёт от корня мода) */
  advancements: [
    { key: "craft_box",      title: "Коробка с сюрпризом", color: "f",      frame: "task",      xp: 5,   hidden: true,  icon: "box",
      desc: "Ты скрафтил Лабубу-бокс. Открой и посмотри чё тебе выпало.", how: "Получить Лабубу-бокс в инвентарь.", trigger: "box" },
    { key: "open_box",       title: "Рулетка судьбы",      color: "f",      frame: "task",      xp: 5,   hidden: true,  icon: "chest",
      desc: "Ты открыл бокс. Твой первый Лабубу", how: "Получить любую фигурку (тег labubu_all).", trigger: "any" },
    { key: "common_drop",    title: "Просто Лабубу",       color: "f",      frame: "task",      xp: 5,   hidden: true,  icon: "red",
      desc: "Обычный, необычный или редкий. Начало коллекции положено.", how: "Получить обычную, необычную или редкую фигурку.", trigger: "common_rare" },
    { key: "epic_drop",      title: "Эпическая удача",     color: "a",      frame: "goal",      xp: 15,  hidden: true,  icon: "russian", bold: true,
      desc: "Тебе выпал Эпик! Вот это уже нормалдаки", how: "Получить эпическую фигурку.", trigger: "epic" },
    { key: "legendary_drop", title: "ЛЕГЕНДА!",            color: "5",      frame: "challenge", xp: 30,  hidden: true,  icon: "galactic", bold: true,
      desc: "Легендарный Лабубу в твоих руках! Вот это нихуя себе!", how: "Получить легендарную фигурку.", trigger: "legendary" },
    { key: "anime_drop",     title: "АНИМЕ-СТИЛЬ",         color: "6",      frame: "challenge", xp: 50,  hidden: true,  icon: "anime", bold: true,
      desc: "Аниме Лабубу! Это уже пиздец!", how: "Получить именно Аниме Лабубу.", trigger: "anime" },
    { key: "collector",      title: "ПОЛНАЯ КОЛЛЕКЦИЯ",    color: "b",      frame: "challenge", xp: 100, hidden: false, icon: "anime", bold: true,
      desc: "Подбери каждую уникальную фигурку хотя бы раз. Прогресс сохраняется навсегда.", how: "Все 26 фигурок хотя бы раз побывали в инвентаре (26 критериев).", trigger: "all" },
  ],

  history: [
    { date: "31.12.2025", ver: "pre-alpha", tag: "новогодний релиз", title: "Лабубу-система", text: "Лабубу-бокс, рулетка на 140 слотов и 26 фигурок пяти редкостей. Фигурку можно поставить блоком на стол." },
    { date: "17.06.2026", ver: "1.0.2", tag: "LABUBU AURA SYSTEM", title: "Фигурки ожили", text: "У каждой фигурки появилась своя аура в радиусе 6 блоков. Одинаковые фигурки складываются: чем больше стоит рядом, тем сильнее." },
    { date: "25.06.2026", ver: "1.0.3", tag: "фикс", title: "Будда", text: "Исправлена аура Будда Лабубу: зона мира радиусом 8 блоков, которую пробивает только Коран." },
    { date: "02.07.2026", ver: "1.0.5", tag: "фикс", title: "Аниме и Российский", text: "Исправлены ауры Аниме Лабубу (случайные баффы) и Российского Лабубу (пьяная камера)." },
    { date: "13.09.2026", ver: "1.2.0", tag: "финальный апдейт", title: "Фьюжн", text: "Девять фигурок одной редкости в верстаке сплавляются в одну фигурку следующей редкости. Лишние обычные наконец-то при деле." },
  ],
};
