/* №20 · Газан: ачивки (advancements/20_gazan). Цепочка: blocks_67 → craft_egg → gazan_summon → trade_gazan → kill_gazan */
window.ZM = window.ZM || {};
ZM.P20 = { advancements: [
  { key: "blocks_67", title: "Числа судьбы", color: "f", frame: "task", xp: 0, icon: "six_iso", desc: "Найдите блоки 6 и 7", how: "Держи в инвентаре оба цифроблока: 6 и 7. Награда — рецепт яйца." },
  { key: "craft_egg", title: "Яйцо Газана", color: "f", frame: "task", xp: 10, icon: "gazan_spawn_egg", desc: "Скрафти яйцо призыва известного музыкального исполнителя.", how: "6 и 7 в любые клетки верстака." },
  { key: "gazan_summon", title: "Вот он - создатель хайпа", color: "f", frame: "challenge", xp: 150, icon: "gazan_spawn_egg", desc: "Призовите Газана в этот мир в котором не осталось ничего кроме боли и страданий...", how: "Засчитывается, когда кликаешь по Газану ПКМ." },
  { key: "trade_gazan", title: "Сделка века", color: "f", frame: "task", xp: 15, icon: "emerald", desc: "Поторгуйся с Газаном. (Он тебя наебал)", how: "Заверши любую сделку в его окне торговли." },
  { key: "kill_gazan", title: "Конец хайпа", color: "f", frame: "goal", xp: 25, icon: "redstone", desc: "Убей Газана. Медиа-похороны.", how: "Добей Газана на арене." }
] };
