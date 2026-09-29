/* №12 · Катана: данные страницы (из Java-кода, advancements и рецепта мода) */
window.ZM = window.ZM || {};
ZM.P12 = {
  item: { id: "zitraksmode:katana", name: "Катана", stack: 1 },
  recipe: {
    pattern: ["  I", "HI ", "SH "],
    key: {
      I: { icon: "iron_ingot", name: "Железный слиток", id: "minecraft:iron_ingot" },
      H: { icon: "shield_item", name: "Щит", id: "minecraft:shield" },
      S: { icon: "iron_sword", name: "Железный меч", id: "minecraft:iron_sword" },
    },
  },
  // KatanaItem.ULTIMATE_DURABILITY_COST, VerticalSlashEntity
  ult: { cost: 67, dmg: 25, dist: 35, distLvl: 5, up: 10, upLvl: 2, halfW: 1.5, bulge: 3.5, thick: 1.1, speed: 4.5, chargeTicks: 20, dropChance: 0.5, hardMax: 40 },
  anims: [
    { k: "idle", n: "Стойка", t: "крутится всегда, 1,5 с по кругу" },
    { k: "diagonal_left", n: "Диагональ слева", t: "комбо ЛКМ" },
    { k: "diagonal_right", n: "Диагональ справа", t: "комбо ЛКМ" },
    { k: "swing_horizontal", n: "Горизонтальный", t: "комбо ЛКМ" },
    { k: "parry", n: "Парирование", t: "ПКМ" },
    { k: "ultimate_charge", n: "Замах", t: "Shift + ПКМ, замирает на последнем кадре" },
    { k: "ultimate_release", n: "Мировой разрез", t: "отпустить после 1 с" },
  ],
  advancements: [
    { key: "craft_katana", title: "Путь Клинка", color: "7", frame: "task", xp: 5, icon: "katana_icon", hidden: true, chat: true,
      desc: "Скрафти катану. Начало пути самурая.", how: "Получи катану в инвентарь: крафт или креатив" },
    { key: "use_ultimate", title: "Секретная Техника", color: "b", frame: "task", xp: 10, icon: "iron_sword", hidden: true, chat: true,
      desc: "Примени ультимативную атаку катаны. Мировой разрез.", how: "Shift + ПКМ, держать секунду, отпустить" },
    { key: "successful_parry", title: "Sekiro: Shadows Die Twice", color: "a", frame: "task", xp: 10, icon: "shield_item", hidden: true, chat: true,
      desc: "Успешно спарируй что угодно.", how: "Поймай удар, стрелу или взрыв в окно парирования" },
    { key: "deflect_arrow_kill", title: "Отражённая Смерть", color: "c", bold: true, frame: "challenge", xp: 50, icon: "arrow", hidden: true, chat: true,
      desc: "Убей скелета его собственной отражённой стрелой.", how: "Добей скелета ответным уроном от парированной стрелы" },
  ],
  // WorldSlashEnchantment / MiningIndustryEnchantment: категория KATANA, слот MAINHAND, RARE, книги можно, в столе и луте есть
  enchants: [
    { key: "world_slash", name: "Мировой разрез", max: 5, rarity: "Редкое", cost: (l) => [10 + (l - 1) * 10, 10 + (l - 1) * 10 + 30],
      text: "Ульта летит дальше и режет выше: +5 блоков дальности и +2 высоты за уровень. На V дуга проходит 60 блоков и поднимается на 20." },
    { key: "mining_industry", name: "Mining Industry", max: 1, rarity: "Редкое", cost: () => [15, 40],
      text: "Превращает ульту в шахтёрский инструмент: руды падают всегда и с опытом, мусор исчезает без следа." },
  ],
  rules: [
    ["katana_icon", "Не копает", "ЛКМ по блоку отменяется: катана режет мобов, а не землю. Для земли есть ульта."],
    ["iron_sword", "Комбо без повторов", "Каждый взмах берёт случайную из трёх анимаций, но никогда ту же, что была только что."],
    ["crit", "Удар = звук и волна", "Попал по мобу: вылетает волна разреза и играет один из трёх звуков клинка."],
    ["shield_item", "ПКМ: парирование", "Открывает окно. В него ловятся стрелы, удары мобов и взрывы. Урон отменяется, атакующий получает столько же."],
    ["lava_bucket", "Что не парируется", "Падение, огонь, лава, утопление, голод: у такого урона нет атакующего и это не снаряд и не взрыв."],
    ["netherite_pickaxe", "Перезарядка ульты", "После разреза нужно подождать, пока ульта перезарядится. Таймер виден в HUD справа снизу."],
  ],
  history: [
    { ver: "20.04.2026", date: "20.04.2026", tag: "новый пункт", icon: "katana_icon", c: "#a77bff", title: "Катана",
      text: "Катана с анимациями GeckoLib: стойка, три удара комбо, парирование и ульта «Мировой разрез», которая режет землю на 35 блоков вперёд." },
    { ver: "1.1.0", date: "18.07.2026", tag: "энчант-апдейт", icon: "enchanted_book", c: "#55ffff", title: "Зачарования катаны",
      text: "«Мировой разрез» I–V делает ульту длиннее и выше, Mining Industry превращает её в шахтёрский инструмент." },
  ],
};
