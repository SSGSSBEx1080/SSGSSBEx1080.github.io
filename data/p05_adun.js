/* =====================================================================
   №05 · Житель-Даун. Всё по коду: AdunVillager, AdunDeathHandler, AdunVillagerRenderer,
   biome modifier спавна, lang (mod-src/java/p05/MECHANICS.md).
   ===================================================================== */
window.ZM = window.ZM || {};
ZM.P05 = {
  id: "zitraksmode:adun_villager",
  name: "Житель-Даун",
  egg: "Яйцо призыва Жителя-Дауна",
  added: "08.11.2025",

  // Mob.createMobAttributes(): MAX_HEALTH 20, MOVEMENT_SPEED 0.5, FOLLOW_RANGE 32
  stats: { hp: 20, speed: 0.5, follow: 32, scale: 0.9375, profession: "нет", level: 1 },

  // registerGoals(): приоритет -> задача
  goals: [
    { p: 0, n: "Плавать", d: "не тонет, держится на воде" },
    { p: 1, n: "Торговать с игроком", d: "пока открыта лавка, стоит на месте" },
    { p: 2, n: "Бродить", d: "скорость 0.7 от своей" },
    { p: 3, n: "Смотреть на игрока", d: "если ты ближе 6 блоков" },
    { p: 4, n: "Смотреть по сторонам", d: "когда делать нечего" },
  ],

  // updateTrades(): XP 0, множитель цены 0 (цена не плавает)
  trades: [
    { buy: ["dirt", 52], sell: ["emerald", 1], max: 3 },
    { buy: ["emerald", 1], sell: ["dirt", 1], max: 999999 },
  ],

  // canSpawn + biome modifier
  spawn: { weight: 6, min: 1, max: 1, biomes: "весь верхний мир (#minecraft:is_overworld)", roll: 10, radius: 64,
    bypass: ["Яйцо призыва", "Команда /summon", "Раздатчик с яйцом", "Событие"] },

  /* Звуки из ModSounds + sounds.json (mod-src/java/sounds): файлы в assets/sounds/p05/adun/.
     Вариант выбирается случайно, как в игре. Если файла нет, играет запасной ванильный звук (fallback). */
  SOUNDS: {
    ambient: { n: "Фоновый", code: "ADUN_AMBIENT", files: ["adun/adun_ambient1.ogg", "adun/adun_ambient2.ogg", "adun/adun_ambient3.ogg"], fallback: ["vanilla/idle1", "vanilla/idle2", "vanilla/idle3"], when: "сам по себе, время от времени" },
    trade: { n: "Торговля", code: "ADUN_TRADE", files: ["adun/adun_trade1.ogg", "adun/adun_trade2.ogg"], fallback: ["vanilla/yes1", "vanilla/yes2"], when: "каждая сделка" },
    hurt: { n: "Больно", code: "ADUN_HURT", files: ["adun/adun_hurt1.ogg", "adun/adun_hurt2.ogg"], fallback: ["vanilla/hit1", "vanilla/hit2", "vanilla/hit3"], when: "получил урон" },
    death: { n: "Смерть", code: "ADUN_DEATH", files: ["adun/adun_death.ogg"], fallback: ["vanilla/death"], when: "умер" },
  },

  // mod-src/advancements/05_adun: все три скрытые (hidden), по 5 XP, цепочка find -> trade -> kill
  advancements: [
    { key: "find_adun", title: "Кто это?", desc: "Ебать Муся это ты? Нет это не Муся!", frame: "task", xp: 5, trigger: "find_adun",
      icon: "assets/textures/p5/icons/adun_egg.png", how: "ПКМ по Жителю-Дауну (minecraft:player_interacted_with_entity)" },
    { key: "trade_adun", title: "Даун ты Долбаёб?", desc: "Ты думал будет выгодно? Наебааал~", frame: "task", xp: 5, trigger: "trade_adun",
      icon: "assets/textures/p5/vanilla/emerald.png", how: "Любая сделка с ним (minecraft:villager_trade)" },
    { key: "kill_adun", title: "Тишина...", desc: "Стал тем кого презирал...", frame: "task", xp: 5, trigger: "kill_adun",
      icon: "assets/textures/p5/icons/adun_egg.png", how: "Убить его самому или снарядом (zitraksmode:kill_adun)" },
  ],
  killTrigger: "zitraksmode:kill_adun",

  history: [
    { date: "08.11.2025", ver: "pre-alpha", title: "Житель-Даун", text: "Житель без профессии, который продаёт землю за изумруды и ничему не учится. Своя текстура, свои звуки, своё яйцо призыва." },
  ],
};
