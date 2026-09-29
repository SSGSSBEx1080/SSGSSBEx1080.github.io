/* =====================================================================
   №02 · ТНТ-броня — данные страницы.
   Этот файл пишется РУКАМИ (рецепты генерирует tools/build_data.py в p02_recipes.js).
   У каждой цифры есть комментарий, откуда она взята в коде мода.
   ===================================================================== */
window.ZM = window.ZM || {};
ZM.P02 = {
  point: 2,
  title: "ТНТ-броня",
  added: "30.10.2025",

  /* ╔════════════════════════════════════════════════════════════════╗
     ║  СПОСОБНОСТЬ. Всё из abilities/AbilitySystem.java               ║
     ╚════════════════════════════════════════════════════════════════╝ */
  ability: {
    key: "R",
    needsFullSet: true,       // hasFullTntArmor(): все 4 части
    // onLivingHurt(): энергия копится от ПОЛУЧЕННОГО урона (event.getAmount(), до брони)
    maxEnergy: 100,           // MAX_ENERGY
    energyMultiplier: 2.5,    // ENERGY_MULTIPLIER: прирост = урон × 2.5
    minGain: 2,               // MIN_ENERGY_GAIN
    maxGain: 35,              // MAX_ENERGY_GAIN
    delayTicks: 40,           // EXPLOSION_DELAY: 40 тиков = 2 с от нажатия до взрыва
    baseRadius: 5,            // BASE_EXPLOSION_RADIUS (было 3.0)
    bombardierPerLevel: 0.5,  // радиус += уровень × 0.5 с каждой части
    damageRadiusMul: 1.5,     // радиус урона = радиус × 1.5
    baseDamage: 15,           // урон = (15 + радиус × 1.5) × (1 − дистанция / радиус урона)
    radiusDamageMul: 1.5,
    overkillLevels: 10,       // Бомбардир суммарно ≥ 10 → урон 100 × интенсивность
    overkillDamage: 100,
    knockbackMul: 0.5,        // отбрасывание = радиус × 0.5 × интенсивность
    maxResistance: 100,       // MAX_RESISTANCE_TO_BREAK: прочнее (обсидиан, бедрок) не ломается
    armorWear: 0.10,          // после взрыва каждая часть теряет 10% макс. прочности
    segments: 10,             // делений в полоске (textures/gui/tnt_charge_bar.png)
    // Для полигона: урон разных источников (ванилла 1.19.2, сложность «Нормально»)
    sources: [
      { id: "zombie",  name: "Удар зомби",       dmg: 3,  icon: "rotten_flesh" },
      { id: "arrow",   name: "Стрела скелета",   dmg: 4,  icon: "arrow" },
      { id: "fall",    name: "Падение с 6 блоков", dmg: 3, icon: "feather" },
      { id: "creeper", name: "Взрыв крипера",    dmg: 22, icon: "gunpowder" },
    ],
  },

  /* Зачарования (ModEnchantments: "bombardier", "peacemaker"; категория TNT_ARMOR = только 4 части ТНТ-брони).
     Максимальный уровень в классах BombardierEnchantment/PeacemakerEnchantment не прислан: считаем III. */
  enchantments: {
    bombardier: {
      id: "zitraksmode:bombardier", name: "Бомбардир", maxLevel: 3, perPiece: true,
      short: "Увеличивает радиус взрыва: +0.5 блока за каждый уровень на каждой части. Уровни со всех частей складываются.",
    },
    peacemaker: {
      id: "zitraksmode:peacemaker", name: "Миротворец", maxLevel: 3, perPiece: false,
      short: "Работает наоборот: взрыв остаётся, но разрушений меньше. Учитывается САМЫЙ высокий уровень среди надетых частей.",
      levels: [
        { breaks: "soft", hostileOnly: false, text: "Ломаются только мягкие блоки: земля, трава, песок, гравий, листва, шерсть, стекло и всё, что ломается рукой мгновенно." },
        { breaks: "none", hostileOnly: false, text: "Блоки больше не ломаются вообще. Урон и отбрасывание остаются." },
        { breaks: "none", hostileOnly: true,  text: "Блоки целы, и урон получают только враждебные мобы и боссы (Иссушитель, Дракон). Игроки и животные в безопасности." },
      ],
    },
  },

  /* Ачивки пункта 2: 1:1 из advancements/02_tnt_armor/*.json (цепочка, порядок = parent).
     title/description хранятся с §-кодами, как в моде; сайт сам красит их по палитре Minecraft. */
  advancements: [
    {
      "key": "helmet",
      "id": "zitraksmode:02_tnt_armor/helmet",
      "parent": "zitraksmode:root",
      "trigger": "minecraft:inventory_changed",
      "frame": "task",
      "icon": "zm:tnt_helmet",
      "glint": false,
      "xp": 5,
      "hidden": true,
      "title": "§fGAP - Gay and Pidors",
      "description": "§7Первый элемент ТНТ-брони. Только не натягивай его на хуй.",
      "how": "Забрать ТНТ-шлем из верстака, надеть в «Комплекте» или купить у подрывника."
    },
    {
      "key": "chestplate",
      "id": "zitraksmode:02_tnt_armor/chestplate",
      "parent": "zitraksmode:02_tnt_armor/helmet",
      "trigger": "minecraft:inventory_changed",
      "frame": "task",
      "icon": "zm:tnt_chestplate",
      "glint": false,
      "xp": 5,
      "hidden": true,
      "title": "§fРуки-дезоляторы",
      "description": "§7Солдатик",
      "how": "Забрать ТНТ-нагрудник: верстак, комплект или подрывник."
    },
    {
      "key": "leggings",
      "id": "zitraksmode:02_tnt_armor/leggings",
      "parent": "zitraksmode:02_tnt_armor/chestplate",
      "trigger": "minecraft:inventory_changed",
      "frame": "task",
      "icon": "zm:tnt_leggings",
      "glint": false,
      "xp": 5,
      "hidden": true,
      "title": "§fНоги-детонаторы",
      "description": "§7За 40 гривен штаны блять.",
      "how": "Забрать ТНТ-поножи: верстак, комплект или подрывник."
    },
    {
      "key": "boots",
      "id": "zitraksmode:02_tnt_armor/boots",
      "parent": "zitraksmode:02_tnt_armor/leggings",
      "trigger": "minecraft:inventory_changed",
      "frame": "task",
      "icon": "zm:tnt_boots",
      "glint": false,
      "xp": 5,
      "hidden": true,
      "title": "§fДрил для пидрил",
      "description": "§7Дефолт асиксы с пойзона",
      "how": "Забрать ТНТ-ботинки: верстак, комплект или подрывник."
    },
    {
      "key": "full_set",
      "id": "zitraksmode:02_tnt_armor/full_set",
      "parent": "zitraksmode:02_tnt_armor/boots",
      "trigger": "minecraft:inventory_changed",
      "frame": "goal",
      "icon": "zm:tnt_chestplate",
      "glint": false,
      "xp": 15,
      "hidden": true,
      "title": "§a§lПОЛНЫЙ СЕТ",
      "description": "§7ТНТ-ARMOR, FULL SET!",
      "how": "Надеть все 4 части в «Комплекте»."
    },
    {
      "key": "ultimate_use",
      "id": "zitraksmode:02_tnt_armor/ultimate_use",
      "parent": "zitraksmode:02_tnt_armor/full_set",
      "trigger": "zitraksmode:tnt_ultimate",
      "frame": "task",
      "icon": "tnt",
      "glint": false,
      "xp": 10,
      "hidden": true,
      "title": "§fУЛЬТИМАТИВНЫЙ ВЗРЫВ",
      "description": "§7Исскуство - это взрыв! Всем в радиусе взрыва гарантированный пиздец, по крайней мере блокам.",
      "how": "Накопить заряд на полигоне и нажать R."
    },
    {
      "key": "repair_kit_craft",
      "id": "zitraksmode:02_tnt_armor/repair_kit_craft",
      "parent": "zitraksmode:02_tnt_armor/ultimate_use",
      "trigger": "minecraft:inventory_changed",
      "frame": "task",
      "icon": "zm:tnt_repair_kit",
      "glint": false,
      "xp": 10,
      "hidden": true,
      "title": "§a§lМАСТЕР-РЕМОНТНИК",
      "description": "§7Скрафти Ремонтный кит ТНТ. Теперь ты можешь чинить свою броню чтобы устроить просто полный пиздец разнос сервера.",
      "how": "Забрать ремкомплект из верстака или купить у подрывника."
    },
    {
      "key": "explosion_kill",
      "id": "zitraksmode:02_tnt_armor/explosion_kill",
      "parent": "zitraksmode:02_tnt_armor/repair_kit_craft",
      "trigger": "zitraksmode:tnt_explosion_kill",
      "frame": "goal",
      "icon": "gunpowder",
      "glint": false,
      "xp": 20,
      "hidden": true,
      "title": "§e§lKILLER QUEEN",
      "description": "§7Убей кого-то с помощью взрыва в ТНТ-броне. Низвёл до атомов.",
      "how": "Убить зомби взрывом брони на полигоне."
    },
    {
      "key": "bombardier_full",
      "id": "zitraksmode:02_tnt_armor/bombardier_full",
      "parent": "zitraksmode:02_tnt_armor/explosion_kill",
      "trigger": "zitraksmode:bombardier_set",
      "frame": "challenge",
      "icon": "zm:tnt_chestplate",
      "glint": true,
      "xp": 50,
      "hidden": true,
      "title": "§5§lБОМБАРДИР: МАКСИМУМ",
      "description": "§7Весь сет зачарован на Бомбардир III. Ты — бог хаоса. Еби всё нахуй!",
      "how": "Весь комплект надет и на всех частях Бомбардир III."
    }
  ],
  advancementSlots: 9,

  /* ModArmorMaterials.ZITRAKS:
     ("zitraksmode:tnt", 25, {2,5,6,3}, 12, ARMOR_EQUIP_IRON, 0.5f, 0.0f, Ingredient.of(Blocks.TNT))
     EquipmentSlot.getIndex(): FEET=0, LEGS=1, CHEST=2, HEAD=3
     HEALTH_PER_SLOT = {13, 15, 16, 11}; прочность = HEALTH_PER_SLOT[i] * 25 */
  material: {
    id: "zitraks", name: "zitraksmode:tnt", durabilityMultiplier: 25, enchantability: 12,
    toughness: 0.5, knockbackResistance: 0, equipSound: "item.armor.equip_iron", repair: "minecraft:tnt",
  },
  pieces: [
    { id: "tnt_helmet",     slot: "head",  name: "ТНТ-шлем",     defense: 3, durability: 11 * 25, iron: "minecraft:iron_helmet" },
    { id: "tnt_chestplate", slot: "chest", name: "ТНТ-нагрудник", defense: 6, durability: 16 * 25, iron: "minecraft:iron_chestplate" },
    { id: "tnt_leggings",   slot: "legs",  name: "ТНТ-поножи",    defense: 5, durability: 15 * 25, iron: "minecraft:iron_leggings" },
    { id: "tnt_boots",      slot: "feet",  name: "ТНТ-ботинки",   defense: 2, durability: 13 * 25, iron: "minecraft:iron_boots" },
  ],
  /* Ванильные материалы 1.19.2 для сравнения (ArmorMaterials.java) */
  compare: [
    { name: "Железная",  defense: [2, 5, 6, 2], mult: 15, toughness: 0,   enchantability: 9 },
    { name: "ТНТ",       defense: [2, 5, 6, 3], mult: 25, toughness: 0.5, enchantability: 12, ours: true },
    { name: "Алмазная",  defense: [3, 6, 8, 3], mult: 33, toughness: 2,   enchantability: 10 },
  ],

  /* DemolitionistTradeRegistration.onVillagerTrades()
     Формат: a = цена 1, b = цена 2 (необязательно), r = результат, uses = maxUses, xp = опыт жителю.
     [id, count] ; id без двоеточия = minecraft:, с "zm:" = предмет мода */
  levels: ["Новичок", "Ученик", "Подмастерье", "Эксперт", "Мастер"],
  levelXp: [0, 10, 70, 150, 250],   // ванильные пороги опыта жителя
  trades: [
    // УРОВЕНЬ 1
    { lvl: 1, a: ["sand", 10], b: ["emerald", 3], r: ["tnt", 4], uses: 16, xp: 2 },
    { lvl: 1, a: ["gunpowder", 12], r: ["emerald", 1], uses: 16, xp: 2 },
    { lvl: 1, a: ["redstone", 8], r: ["emerald", 1], uses: 16, xp: 2 },
    { lvl: 1, a: ["emerald", 3], r: ["flint_and_steel", 1], uses: 12, xp: 3 },
    // УРОВЕНЬ 2
    { lvl: 2, a: ["iron_ingot", 16], r: ["emerald", 1], uses: 12, xp: 5 },
    { lvl: 2, a: ["firework_rocket", 4], r: ["emerald", 1], uses: 12, xp: 5 },
    { lvl: 2, a: ["emerald", 5], r: ["tnt", 8], uses: 8, xp: 8 },
    { lvl: 2, a: ["emerald", 1], r: ["@button", 4], uses: 12, xp: 5, random: "Случайная кнопка из 11 видов" },
    { lvl: 2, a: ["emerald", 2], r: ["@plate", 2], uses: 12, xp: 5, random: "Случайная нажимная плита из 12 видов" },
    // УРОВЕНЬ 3
    { lvl: 3, a: ["redstone", 24], r: ["emerald", 2], uses: 12, xp: 10 },
    { lvl: 3, a: ["emerald", 1], r: ["lever", 4], uses: 12, xp: 8 },
    { lvl: 3, a: ["emerald", 2], r: ["redstone_torch", 4], uses: 12, xp: 8 },
    { lvl: 3, a: ["emerald", 4], r: ["redstone_block", 1], uses: 8, xp: 10 },
    { lvl: 3, a: ["emerald", 12], r: ["zm:tnt_repair_kit", 1], uses: 4, xp: 15 },
    // УРОВЕНЬ 4
    { lvl: 4, a: ["emerald", 32], r: ["zm:tnt_helmet", 1], uses: 2, xp: 25 },
    { lvl: 4, a: ["emerald", 32], r: ["zm:tnt_chestplate", 1], uses: 2, xp: 25 },
    { lvl: 4, a: ["emerald", 28], r: ["zm:tnt_leggings", 1], uses: 2, xp: 25 },
    { lvl: 4, a: ["emerald", 24], r: ["zm:tnt_boots", 1], uses: 2, xp: 25 },
    { lvl: 4, a: ["emerald", 10], r: ["@book1", 1], uses: 3, xp: 30, ench: "Бомбардир I" },
    { lvl: 4, a: ["emerald", 20], r: ["@book2", 1], uses: 3, xp: 30, ench: "Бомбардир II" },
    // УРОВЕНЬ 5
    { lvl: 5, a: ["emerald", 35], r: ["@book3", 1], uses: 3, xp: 30, ench: "Бомбардир III" },
    { lvl: 5, a: ["emerald", 45], b: ["tnt", 16], r: ["@armor", 1], uses: 1, xp: 40, random: "Случайный элемент ТНТ-брони", ench: "Бомбардир I или II" },
    { lvl: 5, a: ["emerald", 64], b: ["tnt", "1–5"], r: ["zm:super_tnt", 1], uses: 1, xp: 50, chance: 0.5, note: "Появляется с шансом 50%. Супер-ТНТ из пункта №10" },
  ],
  /* RandomButtonTrade / RandomPressurePlateTrade */
  buttons: ["oak", "spruce", "birch", "jungle", "acacia", "dark_oak", "mangrove", "stone", "polished_blackstone", "crimson", "warped"],
  plates: ["oak", "spruce", "birch", "jungle", "acacia", "dark_oak", "stone", "polished_blackstone", "heavy_weighted", "light_weighted", "crimson", "warped"],

  names: {
    "minecraft:tnt": "ТНТ", "minecraft:sand": "Песок", "minecraft:emerald": "Изумруд", "minecraft:gunpowder": "Порох",
    "minecraft:redstone": "Редстоун", "minecraft:flint_and_steel": "Огниво", "minecraft:iron_ingot": "Железный слиток",
    "minecraft:firework_rocket": "Фейерверк", "minecraft:lever": "Рычаг", "minecraft:redstone_torch": "Редстоун-факел",
    "minecraft:redstone_block": "Блок редстоуна", "minecraft:enchanted_book": "Зачарованная книга",
    "minecraft:iron_helmet": "Железный шлем", "minecraft:iron_chestplate": "Железный нагрудник",
    "minecraft:iron_leggings": "Железные поножи", "minecraft:iron_boots": "Железные ботинки",
    "zitraksmode:tnt_helmet": "ТНТ-шлем", "zitraksmode:tnt_chestplate": "ТНТ-нагрудник", "zitraksmode:tnt_leggings": "ТНТ-поножи",
    "zitraksmode:tnt_boots": "ТНТ-ботинки", "zitraksmode:tnt_repair_kit": "Ремонтный ТНТ-набор", "zitraksmode:super_tnt": "Супер-ТНТ",
  },

  /* HISTORY.md: всё, что касается пункта */
  history: [
    { date: "30.10.2025", ver: null,    text: "Появилась ТНТ-броня" },
    { date: "13.12.2025", ver: null,    text: "Зачарование «Бомбардир» и партиклы ТНТ-брони" },
    { date: "17.06.2026", ver: "1.0.2", text: "Ремонтный ТНТ-набор" },
    { date: "28.06.2026", ver: "1.0.4", text: "Житель-подрывник, улучшение ТНТ-брони" },
  ],
};
