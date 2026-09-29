/* =====================================================================
   №09 · Дилдо-блоки. Все цифры из кода мода:
   DildoBlock, DildoMaterial, DildoBlockItem, DildoSeatEntity, DildoBlockEntity,
   DildoEnchantmentHandler, MorichekEnchantment, BedWarsEnchantment, рецепты *_dildo.json.
   Механика подробно: mod-src/java/p09/MECHANICS.md
   ===================================================================== */
window.ZM = window.ZM || {};
ZM.P09 = {
  // DildoMaterial: hardness / explosionResistance / requiresCorrectToolForDrops, getBedWarsDrop, рецепт " Q "," Q ","QQQ"
  mats: [
    { k: "mud",       name: "Дилдо из грязи",     short: "Грязь",    color: "#9a6b3f", hard: 0.5, res: 0.5,  tool: false,
      drop: { icon: "iso/dirt", name: "Земля", c: "f" }, craft: { icon: "dirt", name: "Земля", n: 5, per: 1, unit: "земли" } },
    { k: "stone",     name: "Дилдо из камня",     short: "Камень",   color: "#9a9a9a", hard: 1.5, res: 6,    tool: true,
      drop: { icon: "iso/stone", name: "Камень", c: "f" }, craft: { icon: "stone", name: "Камень", n: 5, per: 1, unit: "камня" } },
    { k: "iron",      name: "Дилдо из железа",    short: "Железо",   color: "#e6e6e6", hard: 5,   res: 6,    tool: true,
      drop: { icon: "iron_ingot", name: "Железный слиток", c: "f" }, craft: { icon: "iron_block", name: "Железный блок", n: 5, per: 9, unit: "слитков" } },
    { k: "gold",      name: "Дилдо из золота",    short: "Золото",   color: "#ffd83d", hard: 3,   res: 6,    tool: true,
      drop: { icon: "gold_ingot", name: "Золотой слиток", c: "6" }, craft: { icon: "gold_block", name: "Золотой блок", n: 5, per: 9, unit: "слитков" } },
    { k: "diamond",   name: "Дилдо из алмаза",    short: "Алмаз",    color: "#4ee6e0", hard: 5,   res: 6,    tool: true,
      drop: { icon: "diamond", name: "Алмаз", c: "b" }, craft: { icon: "diamond_block", name: "Алмазный блок", n: 5, per: 9, unit: "алмазов" } },
    { k: "emerald",   name: "Дилдо из изумруда",  short: "Изумруд",  color: "#3ddc62", hard: 5,   res: 6,    tool: true,
      drop: { icon: "emerald", name: "Изумруд", c: "a" }, craft: { icon: "emerald_block", name: "Изумрудный блок", n: 5, per: 9, unit: "изумрудов" } },
    { k: "obsidian",  name: "Дилдо из обсидиана", short: "Обсидиан", color: "#6b4fb3", hard: 50,  res: 1200, tool: true,
      drop: { icon: "iso/obsidian", name: "Обсидиан", c: "5" }, craft: { icon: "obsidian", name: "Обсидиан", n: 5, per: 1, unit: "обсидиана" } },
    { k: "netherite", name: "Дилдо из незерита",  short: "Незерит",  color: "#8a7a78", hard: 50,  res: 1200, tool: true,
      drop: { icon: "netherite_ingot", name: "Незеритовый слиток", c: "8" }, craft: null, gazan: true },
    { k: "tnt",       name: "Дилдо из TNT",       short: "TNT",      color: "#e8453c", hard: 0,   res: 0,    tool: false,
      drop: { icon: "gunpowder", name: "Порох", c: "7" }, craft: { icon: "tnt", name: "TNT", n: 5, per: 5, unit: "пороха", extra: "+ 20 песка" } },
  ],
  // ванильные блоки для сравнения прочности
  vanilla: [["Земля", 0.5, 0.5], ["Камень", 1.5, 6], ["Железный блок", 5, 6], ["Обсидиан", 50, 1200], ["Бедрок", -1, 3600000]],

  // кто сидит: DildoSeatEntity.getProductionSpeedMultiplier + forceNearbyMobToSit
  sitters: [   // чем опаснее моб, тем быстрее генератор
    { k: "steve",    name: "Игрок",       kind: "player",  mult: 1.0, note: "садится сам по ПКМ" },
    { k: "zombie",   name: "Зомби",       kind: "enemy",   mult: 1.2 },
    { k: "skeleton", name: "Скелет",      kind: "enemy",   mult: 1.2 },
    { k: "creeper",  name: "Крипер",      kind: "enemy",   mult: 1.2 },
    { k: "enderman", name: "Эндермен",    kind: "enemy",   mult: 1.2, note: "по коду Enemy, хоть и не нападает первым" },
    { k: "villager", name: "Житель",      kind: "mob",     mult: 1.1, note: "не Animal и не Enemy" },
    { k: "cow",      name: "Корова",      kind: "animal",  mult: 1.0 },
    { k: "pig",      name: "Свинья",      kind: "animal",  mult: 1.0 },
    { k: "sheep",    name: "Овца",        kind: "animal",  mult: 1.0 },
  ],
  kinds: { player: "игрок", enemy: "враждебный", mob: "нейтральный", animal: "мирный" },

  T: { buff: 100, long: 200, scream: 60, genMin: 1200, genMax: 1600, particle: 2, seatScan: 5 },

  // зачарования: MorichekEnchantment / BedWarsEnchantment, lang ru_ru
  ench: [
    { k: "morichek", name: "И теперь я моричёк...", rarity: "RARE", rarityRu: "Редкое", weight: 2, max: 1, min: 12, maxc: 32, icon: "fishing_rod",
      what: "Посидел 5 секунд: Сопротивление I, Удача V и клюёт почти сразу." },
    { k: "bed_wars", name: "БЭД Варс", rarity: "UNCOMMON", rarityRu: "Необычное", weight: 5, max: 1, min: 8, maxc: 25, icon: "diamond",
      what: "Посидел 5 секунд: блок начинает сам выдавать ресурс своего материала." },
  ],
  enchantability: 10,

  // ванильная таблица gameplay/fishing (1.19.2): вес + качество × удача
  fishing: {
    groups: [
      { k: "fish", name: "Рыба", weight: 85, quality: -1, c: "#5fb8ff",
        items: [["cod", "Сырая треска", 60], ["salmon", "Сырой лосось", 25], ["tropical_fish", "Тропическая рыба", 2], ["pufferfish", "Иглобрюх", 13]] },
      { k: "junk", name: "Хлам", weight: 10, quality: -2, c: "#9a8f7a",
        items: [["lily_pad", "Кувшинка", 17], ["leather_boots", "Кожаные ботинки", 10], ["leather", "Кожа", 10], ["bone", "Кость", 10], ["potion", "Бутылка воды", 10],
          ["string", "Нить", 5], ["fishing_rod", "Удочка", 2], ["bowl", "Миска", 10], ["stick", "Палка", 5], ["ink_sac", "Чернильный мешок ×10", 1], ["tripwire_hook", "Натяжной крюк", 10], ["rotten_flesh", "Гнилая плоть", 10]] },
      { k: "treasure", name: "Сокровище", weight: 5, quality: 2, c: "#ffd84a",
        items: [["name_tag", "Бирка", 1], ["saddle", "Седло", 1], ["bow", "Лук (зачарован)", 1], ["fishing_rod", "Удочка (зачарована)", 1], ["enchanted_book", "Зачарованная книга", 1], ["nautilus_shell", "Раковина наутилуса", 1]] },
    ],
    luckV: 5,
  },

  // достижения 09_dildo: одна ветка от zitraksmode:root, все скрытые
  advancements: [
    { key: "gay_master", title: "ГЕЙ-МАСТЕР", color: "b", bold: true, frame: "challenge", hidden: true, chat: true, xp: 100, icon: "iso/netherite_dildo",
      desc: "Собери все 9 видов дилдаков. Прогресс сохраняется навсегда. Как и титул...", how: "Забери из «Магазина» все девять дилдо, включая незеритовый." },
    { key: "craft_mud", title: "Noob dildo", color: "f", bold: false, frame: "task", hidden: true, chat: true, xp: 5, icon: "iso/mud_dildo",
      desc: "Скрафти свой первый дилдак из грязи.", how: "Забери дилдо из грязи из окна крафта в «Магазине»." },
    { key: "craft_stone", title: "Каменный стояк", color: "f", bold: false, frame: "task", hidden: true, chat: true, xp: 5, icon: "iso/stone_dildo",
      desc: "Скрафти каменный дилдак. В каменном веке было весело.", how: "Забери каменный дилдо из окна крафта." },
    { key: "craft_iron", title: "Железная елда", color: "f", bold: false, frame: "task", hidden: true, chat: true, xp: 5, icon: "iso/iron_dildo",
      desc: "Великий учёный, Никола Тесла, очень устал, опустился в кресло...", how: "Забери железный дилдо из окна крафта." },
    { key: "craft_gold", title: "Золотой стандарт", color: "f", bold: false, frame: "task", hidden: true, chat: true, xp: 5, icon: "iso/gold_dildo",
      desc: "Скрафти золотой дилдак. Развлечение для богатых игроков. 15см.", how: "Забери золотой дилдо из окна крафта." },
    { key: "craft_diamond", title: "Pro dildo", color: "f", bold: false, frame: "task", hidden: true, chat: true, xp: 5, icon: "iso/diamond_dildo",
      desc: "Алмазный наконечник для сверления очка.", how: "Забери алмазный дилдо из окна крафта." },
    { key: "craft_emerald", title: "Мечта Жителя", color: "a", bold: true, frame: "goal", hidden: true, chat: true, xp: 25, icon: "iso/emerald_dildo",
      desc: "Кто знает, но ходят слухи что жители готовы отдаться в рабство, и отдать всё своё имущество ради этого артефакта...", how: "Забери изумрудный дилдо из окна крафта." },
    { key: "craft_obsidian", title: "Разрыв очка из Обсидиана", color: "f", bold: false, frame: "goal", hidden: true, chat: true, xp: 5, icon: "iso/obsidian_dildo",
      desc: "На какой сам сядешь, а на какой мать посадишь? Легенды гласят им пользовался сам Эндер-дракон, и Дмитрий Скрынник.", how: "Забери обсидиановый дилдо из окна крафта." },
    { key: "craft_tnt", title: "Опасная штучка.", color: "a", bold: true, frame: "goal", hidden: true, chat: true, xp: 25, icon: "iso/tnt_dildo",
      desc: "Только не сри редстоуном, И ЕСЛИ ПОСТАВИЛ, НЕ ЛОМАЙ! Я ПРЕДУПРЕДИЛ!", how: "Забери TNT-дилдо из окна крафта." },
    { key: "craft_netherite", title: "НЕЗЕРИТОВЫЙ МОНУМЕНТ", color: "5", bold: true, frame: "challenge", hidden: true, chat: true, xp: 50, icon: "iso/netherite_dildo",
      desc: "ДОКАЗАТЕЛЬСТВО ТОГО ЧТО ТЫ МОЖЕШЬ ДЕЛАТЬ ВСЁ ЧТО ТЫ ЗАХОЧЕШЬ.", how: "Рецепта нет: забери незеритовый дилдо, который выпал с Газана." },
    { key: "gay_chair", title: "ГЕЙмерзкое кресло", color: "d", bold: false, frame: "task", hidden: true, chat: false, xp: 10, icon: "iso/end_rod",
      desc: "Когда пики точёные, а когда хуи дрочёные.", how: "Сядь на дилдо в «Посадке» сам и просиди 10 секунд." },
    { key: "joker_trap", title: "Ловушка Джокушкера", color: "c", bold: true, frame: "task", hidden: true, chat: true, xp: 15, icon: "iso/tnt",
      desc: "Кто сука это сделал!?", how: "Сломай TNT-дилдо своими руками: кнопка «Сломать» в «Посадке». Взрыв не считается." },
  ],

  history: [
    { ver: "21.02.2026", date: "21.02.2026", tag: "новый пункт", icon: "iso/stone_dildo", c: "#ff5ad8",
      title: "Дилдо-блоки", text: "Девять материалов от грязи до незерита. На любой можно сесть, а свободный сам ловит ближайшего моба." },
    { ver: "07.05.2026", date: "07.05.2026", tag: "пункт №19", icon: "iso/netherite_dildo", c: "#8a7a78",
      title: "Незерит только с Газана", text: "У незеритового дилдо нет рецепта. Он выпадает с Газана 67." },
    { ver: "1.1.0", date: "18.07.2026", tag: "энчант-апдейт", icon: "enchanted_book", c: "#b37bff",
      title: "Две чары для дилдаков", text: "«И теперь я моричёк...» для рыбалки и «БЭД Варс» для генератора ресурсов. Сломанный блок выпадает со всеми чарами." },
  ],
};
