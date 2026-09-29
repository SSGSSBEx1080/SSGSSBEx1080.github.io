/* =====================================================================
   №04 · Каска Шахтёра. Цифры из ModArmorMaterials.MINER, MinerHelmetItem,
   PeresvetEnchantment, рецепта и advancements/04_miner (mod-src/java/p04/MECHANICS.md).
   ===================================================================== */
window.ZM = window.ZM || {};
ZM.P04 = {
  id: "zitraksmode:miner_helmet",
  name: "Каска Шахтёра",
  added: "07.11.2025",

  // ModArmorMaterials.MINER: защита 4, твёрдость 2, зачарование 18, ремонт золотом.
  // Прочность 900 (из MinerHelmetItem: «При прочности 900», иконка ачивки Damage:890). Прочность = батарейка
  armor: { defense: 4, toughness: 2.0, durability: 900, enchantability: 18, knockback: 0, repair: "gold_ingot", sound: "Надевание золотой брони" },

  // ванильные шлемы 1.19.2 для сравнения (+ ТНТ-шлем с №02)
  helmets: [
    { id: "miner", name: "Каска Шахтёра", icon: "p4:miner_helmet", defense: 4, toughness: 2, durability: 900, enchantability: 18, me: true },
    { id: "netherite", name: "Незеритовый", icon: "item_netherite_helmet", defense: 3, toughness: 3, durability: 407, enchantability: 15 },
    { id: "diamond", name: "Алмазный", icon: "item_diamond_helmet", defense: 3, toughness: 2, durability: 363, enchantability: 10 },
    { id: "tnt", name: "ТНТ-шлем №02", icon: "tnt", defense: 3, toughness: 0.5, durability: 275, enchantability: 12 },
    { id: "turtle", name: "Черепаший", icon: "item_turtle_helmet", defense: 2, toughness: 0, durability: 275, enchantability: 9 },
    { id: "iron", name: "Железный", icon: "item_iron_helmet", defense: 2, toughness: 0, durability: 165, enchantability: 9 },
    { id: "chainmail", name: "Кольчужный", icon: "item_chainmail_helmet", defense: 2, toughness: 0, durability: 165, enchantability: 12 },
    { id: "golden", name: "Золотой", icon: "item_golden_helmet", defense: 2, toughness: 0, durability: 77, enchantability: 25 },
    { id: "leather", name: "Кожаный", icon: "item_leather_helmet", defense: 1, toughness: 0, durability: 55, enchantability: 15 },
  ],

  // Невидимый minecraft:light уровня 15 у глаз игрока (MinerHelmetItem.onArmorTick)
  LAMP_LEVEL: 15,
  lights: [
    { n: "Каска Шахтёра", ic: "p4:miner_helmet", lvl: 15, me: true },
    { n: "Светокамень", ic: "glowstone", lvl: 15 },
    { n: "Фонарь", ic: "item_lantern", lvl: 15 },
    { n: "Морской фонарь", ic: "sea_lantern", lvl: 15 },
    { n: "Светильник Джека", ic: "jack_o_lantern", lvl: 15 },
    { n: "Факел", ic: "torch", lvl: 14 },
    { n: "Факел душ", ic: "soul_torch", lvl: 10 },
    { n: "Редстоун-факел", ic: "redstone_torch", lvl: 7 },
    { n: "Светящийся лишайник", ic: "glow_lichen", lvl: 7 },
  ],

  // Генерация руд 1.18+ (Y, число попыток на чанк). tri = треугольник (пик посередине), uni = равномерно
  ores: [
    { k: "coal", n: "Уголь", drop: "coal", col: "#3a3a3a", gen: [["uni", 136, 320, 30], ["tri", 0, 192, 20]] },
    { k: "copper", n: "Медь", drop: "raw_copper", col: "#e0835a", gen: [["tri", -16, 112, 16]] },
    { k: "iron", n: "Железо", drop: "raw_iron", col: "#d8af93", gen: [["tri", 80, 384, 90], ["tri", -24, 56, 10], ["uni", -64, 72, 10]] },
    { k: "lapis", n: "Лазурит", drop: "lapis_lazuli", col: "#2d5fd6", gen: [["tri", -32, 32, 2], ["uni", -64, 64, 4]] },
    { k: "gold", n: "Золото", drop: "raw_gold", col: "#f5d33a", gen: [["tri", -64, 32, 4], ["uni", -64, -48, 0.5]] },
    { k: "redstone", n: "Редстоун", drop: "redstone", col: "#e01b1b", gen: [["uni", -64, 15, 4], ["tri", -96, -32, 8]] },
    { k: "diamond", n: "Алмазы", drop: "diamond", col: "#4ee2d6", gen: [["tri", -144, 16, 7], ["tri", -144, 16, 2]] },
    { k: "emerald", n: "Изумруды", drop: "emerald", col: "#17dd62", gen: [["tri", -16, 480, 100]], note: "только в горах" },
  ],

  // батарейка: −1 прочности каждые drain тиков; эффекты по уровню Пересвета (0 = без чар)
  DURABILITY: 900,
  peresvet: [
    { lvl: 0, drain: 40, minutes: 30, haste: 1 },
    { lvl: 1, drain: 60, minutes: 45, haste: 1, cost: [10, 35] },
    { lvl: 2, drain: 80, minutes: 60, haste: 2, cost: [20, 45] },
    { lvl: 3, drain: 160, minutes: 120, haste: 3, cost: [30, 55] },
  ],

  // recipes/04_miner/miner_helmet.json: фонарь над золотым шлемом
  recipe: { grid: [null, "lantern", null, null, "golden_helmet", null, null, null, null], result: "miner_helmet" },

  // advancements/04_miner (родитель root на сайте не показываем, ветка начинается с первой)
  advancements: [
    { key: "craft_helmet", frame: "task", xp: 5, title: "§fЛучше чем факел.", description: "§7Разгрузка вагона с углём неграми ночью в шахте.",
      how: "Забрать каску из верстака" },
    { key: "drained_helmet", frame: "goal", xp: 15, title: "§a§lСвет погас", description: "§7Ты проносил его до полного истощения. Подземелье поглотило твой свет. Тебе пиздец если не съебёшься.",
      how: "Разрядить каску до нуля" },
  ],

  history: [
    { date: "07.11.2025", ver: "pre-alpha", title: "Спуск в шахту", text: "Каска Шахтёра: фонарь, ночное зрение и спешка, пока не сядет батарейка. Защита 4, на единицу больше незеритового шлема." },
    { date: "18.07.2026", ver: "v1.1.0", title: "Энчант-апдейт", text: "Пересвет I–III: каска держит заряд до 2 часов и даёт спешку до III." },
  ],
};
