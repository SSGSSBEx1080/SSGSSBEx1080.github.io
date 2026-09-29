# №05 · Житель-Даун — механика по коду

Lang: `entity.zitraksmode.adun_villager.none` = «Житель-Даун», `item.zitraksmode.adun_villager_spawn_egg` = «Яйцо призыва Жителя-Дауна».

## AdunVillager extends Villager
- Атрибуты: здоровье 20, скорость 0.5, дальность слежения 32.
- setPersistenceRequired(): не исчезает.
- Всегда без профессии и 1 уровня: в конструкторе, в setVillagerData и каждый тик в customServerAiStep.
- Задачи ИИ: 0 плавать, 1 торговать с игроком, 2 бродить (0.7), 3 смотреть на игрока (6 блоков), 4 смотреть по сторонам.
- Звуки: ADUN_AMBIENT (фоновый), ADUN_TRADE (торговля, notifyTrade + getNotifyTradeSound), ADUN_HURT, ADUN_DEATH.
- Трейды (updateTrades):
  1. 52 земли → 1 изумруд, maxUses 3, XP 0, множитель цены 0.
  2. 1 изумруд → 1 земля, maxUses 999999, XP 0, множитель 0.
- rewardTradeXp пустой: опыта за сделки нет. canBreed false, любовь сбрасывается каждый тик,
  золотое яблоко и золотая морковь игнорируются. canBeSeenAsEnemy false.
- Рендер: ванильная VillagerModel, текстура textures/entity/adun_villager.png, масштаб 0.9375, слой предмета в скрещенных руках.

## Спавн
- canSpawn: яйцо, команда, раздатчик, событие: всегда можно.
  Естественный: 1 шанс из 10, затем Mob.checkMobSpawnRules, затем в коробке ±64 блока вокруг не должно быть другого Жителя-Дауна.
- biome modifier (data/p05/adun_spawn.json): все биомы верхнего мира, weight 6, по 1.

## Ачивка
- AdunDeathHandler: при смерти Жителя-Дауна от игрока (или снаряда игрока) срабатывает триггер KILL_ADUN.
  json ачивки пока не прислан.
