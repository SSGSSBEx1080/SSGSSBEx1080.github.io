# №03 Снайперки: механика из кода (SniperItem, BulletEntity, SniperUltimateAbility, SniperAimingOverlay, SniperLongShotTrigger)

## Выстрел (ПКМ)
- Нужна хотя бы 1 пуля (`BulletItem`) в инвентаре (в креативе не нужна). Нет пуль или идёт КД: звук DISPENSER_FAIL, выстрела нет.
- Урон пули: железная 20, золотая 35, алмазная 45, незеритовая 100.
- КД (тики): железная 40 (2 с), золотая 30 (1,5 с), алмазная 50 (2,5 с), незеритовая 60 (3 с).
- Скорость пули 8.0 (блоков/тик), без гравитации, без разброса (inaccuracy 0). Живёт 100 тиков → дальность ~800 блоков.
- Звук SNIPER_SHOT, громкость 4.0, pitch 0.8. Тратится 1 пуля.
- Пулю нельзя подобрать. При попадании в моба: урон bulletDamage (источник arrow), звук попадания стрелы.
- Прицел: пока ПКМ зажата (useDuration 72000, UseAnim NONE), FOV = 30, оверлей `textures/gui/sniper_scope.png` на весь экран, весь остальной HUD скрыт. Звуки SCOPE_IN / SCOPE_OUT (0.5).
- Прочность = tier.getUses(); чинится ремонтным материалом тира; зачаровываемость = tier.

## Зачарования
- `DOUBLE_PENETRATION` (двойное проникновение): 2 пули, каждая 60% урона, вторая через 2 тика (итого 120%).
- `HOW_HE_PIERCED_ME` («как он меня пробил»): если по линии взгляда (200 блоков) первым стоит блок, а живой цели до него нет,
  пуля спавнится СРАЗУ ЗА этим одним блоком. Не пробивает: бедрок, барьер, укреплённый глубинный сланец, рамку портала Энда, обсидиан, плачущий обсидиан.
- `NIMBLE_FINGERS` (ловкие пальцы): КД ×0.95 / ×0.90 / ×0.85 (I/II/III). Работает и на ульту.
- BulletEntity умеет remainingBlockPierce, но SniperItem его не выставляет (=0).

## Ульта (только незеритовая, клавиша R, пакет на сервер)
- Нужно 64 пули (в креативе нет). КД или меньше 64: DISPENSER_FAIL.
- Звук SNIPER_ULTIMATE_CHARGE (2.0), сразу луч, звук SNIPER_ULTIMATE_SHOT (6.0, pitch 0.7).
- Луч 200 блоков от глаз: ломает ВСЕ блоки на линии (шаг 0.3), кроме бедрока, без дропа (частицы ломания 2001).
- Урон 100 × 4 = 400 всем живым, чей хитбокс (+0.45) пересекает луч; поджог 8 с; отбрасывание 1.2 по взгляду, +0.12 вверх.
- Частицы: END_ROD + ELECTRIC_SPARK по оси, SOUL_FIRE_FLAME по бокам (r 0.2), DRAGON_BREATH сверху/снизу; на конце вспышка.
- КД 600 тиков (30 с) × Ловкие пальцы. Тратит 64 пули.

## Ачивка-триггер
- `zitraksmode:sniper_long_shot`: игрок убил живое существо на дистанции ≥ 100 блоков со снайперкой (тег `zitraksmode:snipers`) в главной руке.

## ModToolTiers (level, uses, speed, attackDamageBonus, enchantability, repair)
- SNIPER_IRON: 2, 500, 6.0, 15.0, 15, iron_ingot
- SNIPER_GOLD: 2, 300, 12.0, 18.0, 22, gold_ingot
- SNIPER_DIAMOND: 3, 1800, 8.0, 22.0, 10, diamond
- SNIPER_NETHERITE: 4, 2200, 9.0, 25.0, 15, netherite_ingot
- SniperItem extends Item (не TieredItem): attackDamageBonus в ближнем бою НЕ применяется, speed не используется. Прочность = uses.
  Замечание: в use() прочность НЕ тратится (нет hurtAndBreak) → снайперки фактически вечные.

## Зачарования (категория ModEnchantmentCategories.SNIPER, книги можно, в столе можно, не сокровище)
- NimbleFingers: UNCOMMON, max III, cost min 8/16/24, max +25.
- DoublePenetration: RARE, max I, cost 15–40.
- HowHePiercedMe: RARE, max I, cost 12–35.
- Несовместимостей нет (checkCompatibility не переопределён).

## Модель
- Одна модель на все 4 снайперки, отличаются текстуры (папка item/<tier>_sniper/). У алмазной главная текстура тоже называется iron_sniper.png.
- Звуки: SCOPE_IN / SCOPE_OUT / SNIPER_SHOT = 1 в 1 из CS:GO (AWP).
