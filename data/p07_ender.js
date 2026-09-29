/* =====================================================================
   №07 · Эндер-система. Источник: ModBlocks.java, Ender*Block(Entity).java,
   EnderSafeMenu, EnderFurnaceMenu, recipes/*.json (mod-src/recipes/07_ender),
   названия из lang (ru_ru).
   ===================================================================== */
window.ZM = window.ZM || {};
ZM.P07 = {
  /* strength(прочность, взрывоустойчивость) из ModBlocks */
  blocks: [
    { key: "reinforced_ender_glass", model: "glass", name: "Закалённое Эндер-стекло", short: "стекло", icon: "reinforced_ender_glass",
      hard: 25, res: 1200, sound: "стекло", material: "GLASS", tool: true, light: 0, blend: true,
      tags: ["прозрачное", "noOcclusion"],
      text: "Стекло, которое держит взрыв как обсидиан: взрывоустойчивость 1200. Прозрачное, свет пропускает, на слух звенит как обычное стекло. Добывается только правильным инструментом, иначе ничего не выпадет.",
      recipes: [{ id: "reinforced_ender_glass_horizontal", label: "горизонтально", p: ["OOO", "GGG", "OOO"] }, { id: "reinforced_ender_glass_vertical", label: "вертикально", p: ["OGO", "OGO", "OGO"] }] },
    { key: "ender_furnace", model: "furnace", modelOn: "furnace_on", name: "Эндер-печь", short: "печь", icon: "ender_furnace",
      hard: 26.75, res: 1200, sound: "камень", material: "STONE", tool: true, light: 13, owner: true,
      tags: ["хозяин", "свет 13 при работе"],
      text: "Печь, которая топится только эндер-жемчугом и оком Эндера. Око плавит 64 предмета, жемчуг 32, и за тик готовит целый предмет или половину. Открыть может только тот, кто поставил. Чужаку молния.",
      recipes: [{ id: "ender_furnace", p: ["OEO", "OFO", "OOO"] }] },
    { key: "ender_safe", model: "safe", name: "Эндер-сейф", short: "сейф", icon: "ender_safe",
      hard: 36.25, res: 600, sound: "камень", material: "STONE", tool: false, light: 0, owner: true,
      tags: ["хозяин", "54 слота", "поворачивается к игроку"],
      text: "Шесть рядов по девять слотов, как двойной сундук. Вещи лежат не в блоке, а у самого игрока, поэтому любой твой сейф открывает один и тот же инвентарь. Ставится лицом к тебе. Открыть может только хозяин, чужака бьёт молнией.",
      recipes: [{ id: "ender_safe", p: ["OEO", "OCO", "OOO"] }] },
    { key: "ender_door", model: "door", name: "Эндер-дверь", short: "дверь", icon: "item:ender_door",
      hard: 27.5, res: 1000, sound: "металл", material: "STONE", tool: true, light: 0, owner: true,
      tags: ["хозяин", "рукой", "свой редстоун"],
      text: "Открывается рукой, но только хозяином. Обычный редстоун её не трогает: слушает лишь эндер-кнопку и эндер-плиту того же хозяина, стоящие вплотную. Звук железной двери. При ломании выпадает одна дверь, верхняя половина второй не даёт.",
      recipes: [{ id: "ender_door", p: ["OEO", "ODO", "OOO"] }] },
    { key: "ender_trapdoor", model: "trapdoor", name: "Эндер-Люк", short: "люк", icon: "ender_trapdoor",
      hard: 27.5, res: 1000, sound: "металл", material: "STONE", tool: true, light: 0, owner: true,
      tags: ["хозяин", "рукой", "глух к редстоуну"],
      text: "Люк открывается только рукой и только хозяином. На редстоун не реагирует вообще: ни рычаг, ни кнопка, ни своя эндер-кнопка его не откроют. Хлопает как деревянный люк, потому что по материалу он камень, а не металл.",
      recipes: [{ id: "ender_trapdoor", p: ["OEO", "OTO", "OOO"] }] },
    { key: "ender_button", model: "button", name: "Эндер-кнопка", short: "кнопка", icon: "ender_button",
      hard: 25.25, res: 1000, sound: "камень", material: "STONE", tool: true, light: 0, owner: true,
      tags: ["хозяин", "сигнал 1 с", "ключ от двери"],
      text: "Каменная кнопка с хозяином: жмёт только он, чужой получает отказ. Держит сигнал секунду, как обычная каменная. Для Эндер-двери того же хозяина это единственный редстоун, который считается.",
      recipes: [{ id: "ender_button", p: ["OEO", "OBO", "OOO"] }] },
    { key: "ender_pressure_plate", model: "plate", name: "Эндер нажимная плита", short: "плита", icon: "ender_pressure_plate",
      hard: 25.25, res: 1000, sound: "камень", material: "METAL", tool: true, light: 0, owner: true,
      tags: ["хозяин", "только хозяин нажимает"],
      text: "Нажимается только ногами хозяина. Чужак, моб, стрела или выброшенный предмет плиту не продавят. Сигнал 15, зона проверки 2 на 2 блока с центром на плите. Вместе с Эндер-дверью получается проход, который пускает одного человека.",
      recipes: [{ id: "ender_pressure_plate", p: ["OEO", "OPO", "OOO"] }] },
  ],

  /* ингредиенты рецептов */
  ing: {
    O: { id: "obsidian", name: "Обсидиан", icon: "iso:obsidian" },
    G: { id: "glass", name: "Стекло", icon: "iso:glass" },
    E: { id: "ender_eye", name: "Око Эндера", icon: "v:ender_eye" },
    F: { id: "furnace", name: "Печь", icon: "iso:furnace" },
    C: { id: "ender_chest", name: "Эндер-сундук", icon: "iso:ender_chest" },
    D: { id: "iron_door", name: "Железная дверь", icon: "v:iron_door" },
    T: { id: "iron_trapdoor", name: "Железный люк", icon: "iso:iron_trapdoor" },
    B: { id: "stone_button", name: "Каменная кнопка", icon: "iso:stone_button" },
    P: { id: "stone_pressure_plate", name: "Каменная нажимная плита", icon: "iso:stone_pressure_plate" },
  },

  /* ванильные блоки для сравнения (прочность / взрывоустойчивость 1.19.2) */
  vanilla: [
    { name: "Стекло", icon: "iso:glass", hard: 0.3, res: 0.3 },
    { name: "Булыжник", icon: "iso:cobblestone", hard: 2, res: 6 },
    { name: "Железная дверь", icon: "v:iron_door", hard: 5, res: 5 },
    { name: "Эндер-сундук", icon: "iso:ender_chest", hard: 22.5, res: 600 },
    { name: "Обсидиан", icon: "iso:obsidian", hard: 50, res: 1200 },
  ],

  /* взрывы 1.19.2: мощность */
  blasts: [
    { name: "Огненный шар гаста", p: 1 }, { name: "Крипер", p: 3 }, { name: "ТНТ", p: 4 }, { name: "Кровать в Незере", p: 5 },
    { name: "Заряженный крипер", p: 6 }, { name: "Кристалл Энда", p: 6 }, { name: "Рождение визера", p: 7 },
  ],

  /* сообщения из кода (§c = красный) */
  msg: {
    safe: { text: "Пошёл нахуй!! Это не твой сейф!", color: "c", where: "chat" },
    furnace: { text: "Это не твоя печка! Пошёл нахуй отсюда!!!", color: "c", where: "chat" },
    door: { text: "Доступ запрещён! Ты не владелец этой двери.", color: "c", where: "bar" },
    trapdoor: { text: "Ты похож на пидораса! Тебя не звали уёбище!", color: "c", where: "bar" },
    button: { text: "Эта кнопка подчиняется только хозяину!", color: "f", where: "bar" },
  },

  /* эндер-печь: EnderFurnaceBlockEntity */
  fuel: {
    ender_eye: { name: "Око Эндера", smelts: 64, speed: 200 },
    ender_pearl: { name: "Эндер-жемчуг", smelts: 32, speed: 100 },
  },
  smelt: [
    { from: "raw_iron", to: "iron_ingot", a: "Сырое железо", b: "Железный слиток" },
    { from: "raw_gold", to: "gold_ingot", a: "Сырое золото", b: "Золотой слиток" },
    { from: "iso:sand", to: "iso:glass", a: "Песок", b: "Стекло" },
    { from: "iso:cobblestone", to: "iso:stone", a: "Булыжник", b: "Камень" },
    { from: "beef", to: "cooked_beef", a: "Сырая говядина", b: "Стейк" },
    { from: "porkchop", to: "cooked_porkchop", a: "Сырая свинина", b: "Жареная свинина" },
    { from: "potato", to: "baked_potato", a: "Картофель", b: "Печёный картофель" },
    { from: "iso:oak_log", to: "charcoal", a: "Дубовое бревно", b: "Древесный уголь" },
    { from: "iso:cactus", to: "green_dye", a: "Кактус", b: "Зелёный краситель" },
    { from: "clay_ball", to: "brick", a: "Глина", b: "Кирпич" },
    { from: "kelp", to: "dried_kelp", a: "Ламинария", b: "Сушёная ламинария" },
    { from: "iso:ancient_debris", to: "netherite_scrap", a: "Древние обломки", b: "Незеритовый лом" },
  ],

  /* Ачивки. Триггеры из кода: ENDER_INTRUDER_CAUGHT (хозяину), INTRUDER_FUCKED (взломщику).
     Порядок как в дереве: upgrades → intruder_caught → intruder_fucked. */
  advancements: [
    { key: "upgrades", trigger: "master", title: "ЭНДЕР-МАСТЕР", color: "b", bold: true, frame: "goal", xp: 50, hidden: true, chat: true, icon: "iso:ender_safe",
      desc: "Получи все 7 Эндер-предметов. Прогресс сохраняется навсегда.", how: "Все 7 блоков набора хотя бы раз побывали в инвентаре. На этой странице: забрать результат из каждого рецепта в «Семи замках»." },
    { key: "intruder_caught", trigger: "caught", title: "ВЗЛОМЩИК ПОЙМАН", color: "c", bold: true, frame: "goal", xp: 20, hidden: true, chat: true, icon: "iso:ender_safe",
      desc: "Кто-то сунулся в твою Эндер-систему. Молния попала в него.", how: "Чужак пытается открыть твой Эндер-сейф или Эндер-печь, пока ты в игре. Выдаётся хозяину." },
    { key: "intruder_fucked", trigger: "fucked", title: "Хуй тебе", color: "4", bold: true, frame: "task", xp: 0, hidden: true, chat: false, icon: "v:barrier",
      desc: "Хотел стащить предметы? - Получай, дурачина!", how: "Попытаться открыть чужой Эндер-сейф или Эндер-печь. Выдаётся тому, кто полез." },
  ],

  history: [
    { date: "15.02.2026", ver: "pre-alpha", tag: "релиз", title: "Эндер-система", text: "Блоки с хозяином: сейф с общим на все сейфы инвентарём, печь на эндер-топливе, дверь, люк, кнопка и плита, которые слушаются только того, кто их поставил. И стекло, которое не берёт взрыв." },
    { date: "04.08.2026", ver: "1.1.3", tag: "фикс", title: "Рецепт стекла", text: "Небольшие исправления рецепта Закалённого Эндер-стекла. Сейчас у него два рецепта: три стекла в ряд или столбиком, остальное обсидиан." },
  ],
};
