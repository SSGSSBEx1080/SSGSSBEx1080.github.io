/* =====================================================================
   №03 · Снайперки. Все числа из кода мода:
   SniperItem, BulletEntity, BulletItem, SniperUltimateAbility, SniperAimingOverlay,
   ModToolTiers, NimbleFingers/DoublePenetration/HowHePiercedMe, SniperLongShotTrigger,
   рецепты mod-src/recipes/03_snipers. Заметки: mod-src/java/p03/MECHANICS.md
   ===================================================================== */
window.ZM = window.ZM || {};
ZM.P03 = {
  added: "04.11.2025",

  /* SniperItem: DAMAGE_* и COOLDOWN_* (тики); ModToolTiers: uses/enchantability/repair.
     Прочность в use() не тратится -> снайперки вечные. */
  tiers: [
    { id: "iron",      item: "zitraksmode:iron_sniper",      name: "Железная Снайперка",   short: "Железная",  dmg: 20,  cd: 40, uses: 500,  ench: 15, repair: "minecraft:iron_ingot",      color: "#d8d8d8", glow: "#9fb4c4" },
    { id: "golden",    item: "zitraksmode:golden_sniper",    name: "Золотая Снайперка",    short: "Золотая",   dmg: 35,  cd: 30, uses: 300,  ench: 22, repair: "minecraft:gold_ingot",      color: "#fdf55f", glow: "#f2b21c" },
    { id: "diamond",   item: "zitraksmode:diamond_sniper",   name: "Алмазная Снайперка",   short: "Алмазная",  dmg: 45,  cd: 50, uses: 1800, ench: 10, repair: "minecraft:diamond",         color: "#4aedd9", glow: "#1fc7b0" },
    { id: "netherite", item: "zitraksmode:netherite_sniper", name: "Незеритовая Снайперка", short: "Незеритовая", dmg: 100, cd: 60, uses: 2200, ench: 15, repair: "minecraft:netherite_ingot", color: "#b9a3b1", glow: "#8a5cf6", ult: true },
  ],

  bullet: {
    item: "zitraksmode:bullet", name: "Пуля",
    speed: 8,            // BULLET_SPEED, блоков за тик
    lifeTicks: 100,      // tickCount > 100 -> discard
    gravity: false, spread: 0, pickup: false,
    baseDamageItem: 4,   // BulletItem.setBaseDamage(4) — перетирается уроном снайперки
  },

  scope: { fov: 30, normalFov: 70, texture: "sniper_scope.png", hideHud: true, sound: "zoom.wav (AWP, CS:GO)", volume: 0.5 },
  shot: { sound: "awp_01.wav (AWP, CS:GO)", volume: 4.0, pitch: 0.8 },

  // Блоки, которые не пробивает «Как он меня прошил?» (canShootThrough) и пуля (canPierceThrough)
  noPierce: ["minecraft:bedrock", "minecraft:barrier", "minecraft:reinforced_deepslate", "minecraft:end_portal_frame", "minecraft:obsidian", "minecraft:crying_obsidian"],

  ult: {
    tier: "netherite", key: "R", ammo: 64, range: 200, dmgMul: 4, fire: 8, knockback: 1.2, lift: 0.12, cd: 600,
    beamRadius: 0.2, hitboxInflate: 0.45, blockStep: 0.3, particleStep: 0.24,
    breaks: "все блоки на линии, кроме бедрока, без дропа",
    particles: ["END_ROD", "ELECTRIC_SPARK", "SOUL_FIRE_FLAME", "DRAGON_BREATH"],
  },

  enchantments: [
    { id: "zitraksmode:nimble_fingers", key: "nimble", name: "Умелые пальчики", max: 3, rarity: "UNCOMMON", rarityRu: "необычное",
      cost: [[8, 33], [16, 41], [24, 49]], mult: [1, 0.95, 0.9, 0.85],
      text: "Быстрее перезарядка: −5% за уровень. Работает и на ульту незеритовой." },
    { id: "zitraksmode:double_penetration", key: "double", name: "Двойное проникновение", max: 1, rarity: "RARE", rarityRu: "редкое",
      cost: [[15, 40]], split: 0.6, delay: 2,
      text: "Две пули вместо одной, каждая 60% урона, вторая через 2 тика. Итого 120%." },
    { id: "zitraksmode:how_he_pierced_me", key: "pierce", name: "Как он меня прошил?", max: 1, rarity: "RARE", rarityRu: "редкое",
      cost: [[12, 35]],
      text: "Если на линии прицела первым стоит блок и перед ним нет цели, пуля появляется сразу за этим блоком. Один блок, не больше." },
  ],

  recipes: {
    "zitraksmode:iron_sniper":      { grid: [null, "minecraft:spyglass", null, "minecraft:iron_block", "minecraft:iron_block", "minecraft:iron_block", null, "zitraksmode:bullet", "minecraft:iron_ingot"], count: 1 },
    "zitraksmode:golden_sniper":    { grid: ["minecraft:gold_block", "minecraft:gold_block", "minecraft:gold_block", "minecraft:gold_block", "zitraksmode:iron_sniper", "minecraft:gold_block", "minecraft:gold_block", "minecraft:gold_block", "minecraft:gold_block"], count: 1 },
    "zitraksmode:diamond_sniper":   { grid: ["minecraft:diamond_block", "minecraft:diamond_block", "minecraft:diamond_block", "minecraft:diamond_block", "zitraksmode:golden_sniper", "minecraft:diamond_block", "minecraft:diamond_block", "minecraft:diamond_block", "minecraft:diamond_block"], count: 1 },
    "zitraksmode:netherite_sniper": { grid: ["minecraft:netherite_block", "minecraft:netherite_block", "minecraft:netherite_block", "zitraksmode:iron_sniper", "zitraksmode:golden_sniper", "zitraksmode:diamond_sniper", "minecraft:obsidian", "minecraft:nether_star", "minecraft:end_crystal"], count: 1 },
    "zitraksmode:bullet":           { grid: ["minecraft:iron_nugget", null, null, null, "minecraft:gunpowder", null, null, null, "minecraft:iron_ingot"], count: 1 },
  },

  names: {
    "zitraksmode:iron_sniper": "Железная Снайперка", "zitraksmode:golden_sniper": "Золотая Снайперка", "zitraksmode:diamond_sniper": "Алмазная Снайперка",
    "zitraksmode:netherite_sniper": "Незеритовая Снайперка", "zitraksmode:bullet": "Пуля",
    "minecraft:spyglass": "Подзорная труба", "minecraft:iron_block": "Железный блок", "minecraft:gold_block": "Золотой блок", "minecraft:diamond_block": "Алмазный блок",
    "minecraft:netherite_block": "Незеритовый блок", "minecraft:iron_ingot": "Железный слиток", "minecraft:iron_nugget": "Железный самородок", "minecraft:gunpowder": "Порох",
    "minecraft:obsidian": "Обсидиан", "minecraft:nether_star": "Звезда Незера", "minecraft:end_crystal": "Кристалл Края", "minecraft:gold_ingot": "Золотой слиток",
    "minecraft:diamond": "Алмаз", "minecraft:netherite_ingot": "Незеритовый слиток", "minecraft:bedrock": "Бедрок", "minecraft:stone": "Камень", "minecraft:barrier": "Барьер",
    "minecraft:target": "Мишень", "minecraft:reinforced_deepslate": "Укреплённый глубинный сланец", "minecraft:end_portal_frame": "Рамка портала Края", "minecraft:crying_obsidian": "Плачущий обсидиан",
  },

  /* Мобы полигона: ХП ванильные (1.19.2). Эндермен уворачивается от любых снарядов (Enderman.hurt: IndirectEntityDamageSource -> телепорт),
     поэтому пуля (DamageSource.arrow) его не берёт, а ульта (playerAttack) берёт. */
  mobs: {
    zombie:     { name: "Зомби",        hp: 20,  w: 0.6, h: 1.95, sprite: "zombie" },
    skeleton:   { name: "Скелет",       hp: 20,  w: 0.6, h: 1.99, sprite: "skeleton" },
    creeper:    { name: "Крипер",       hp: 20,  w: 0.6, h: 1.7,  sprite: "creeper" },
    enderman:   { name: "Эндермен",     hp: 40,  w: 0.6, h: 2.9,  sprite: "enderman", dodge: true },
    iron_golem: { name: "Железный голем", hp: 100, w: 1.4, h: 2.7, sprite: "iron_golem" },
  },
  // Сравнение «сколько выстрелов на моба» (ванильные ХП)
  bosses: [
    { name: "Зомби", hp: 20 }, { name: "Железный голем", hp: 100 }, { name: "Эндер-дракон", hp: 200 }, { name: "Иссушитель", hp: 300 }, { name: "Хранитель", hp: 500 },
  ],

  // Ветка из advancements/03_sniper/*.json: одна цепочка, всё скрытое
  advancements: [
    { key: "bullet", frame: "task", icon: "zitraksmode:bullet", xp: 5, trigger: "minecraft:inventory_changed",
      title: "§fПатрончик", description: "§7Начало пути снайпера. 1 оставь для себя.", how: "Получи пулю: забери её из верстака или нажми «+64» в тире." },
    { key: "iron_sniper", frame: "task", icon: "zitraksmode:iron_sniper", xp: 10, trigger: "minecraft:inventory_changed",
      title: "§fНачало пути снайпера.", description: "§7Первая винтовка. Хуйнёшь с ноускопа — +999 aura", how: "Забери железную снайперку из верстака в разделе «Крафт»." },
    { key: "golden_sniper", frame: "goal", icon: "zitraksmode:golden_sniper", xp: 15, trigger: "minecraft:inventory_changed",
      title: "§eЗолотая лихорадка", description: "§7Сука богатый эль пачо, звони если чо", how: "Забери золотую снайперку из верстака." },
    { key: "diamond_sniper", frame: "goal", icon: "zitraksmode:diamond_sniper", xp: 20, trigger: "minecraft:inventory_changed",
      title: "§bГлаз-Алмаз", description: "§7Самый крутой алмазный ебака. Или же нет...", how: "Забери алмазную снайперку из верстака." },
    { key: "netherite_sniper", frame: "challenge", icon: "zitraksmode:netherite_sniper", xp: 30, trigger: "minecraft:inventory_changed",
      title: "§5§lНЕЗЕРИТОВЫЙ КОШМАР", description: "§7Вершина инженерной мысли. Огонь из ада в твоих руках. Сильнейшее существующее оружие.", how: "Забери незеритовую снайперку из верстака." },
    { key: "long_shot", frame: "challenge", icon: "minecraft:target", xp: 50, trigger: "zitraksmode:sniper_long_shot",
      title: "§6§lКОРОЛЬ СНАЙПЕРОВ", description: "§7В дальнем снайперском краю, был рождён однажды я, 100 раз стрельну - 100 попаду...", how: "Убей моба со снайперкой в руке с 100+ блоков. В тире это голем на 130 м." },
  ],

  history: [
    { date: "04.11.2025", ver: "pre-alpha", title: "Первый выстрел", text: "Сразу вся линейка: железная, золотая, алмазная и незеритовая снайперки, пуля и ульта незеритовой на R. Анимацию ульты отложили на потом." },
    { date: "15.06.2026", ver: "v1.0.1", title: "Патч после альфы", text: "После первого закрытого альфа-показа пофиксили отображение траектории полёта пули." },
    { date: "18.07.2026", ver: "v1.1.0", title: "Энчант-апдейт", text: "Снайперки получили свои зачарования: «Умелые пальчики», «Двойное проникновение» и «Как он меня прошил?»." },
  ],
};
