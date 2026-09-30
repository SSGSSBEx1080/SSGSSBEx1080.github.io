/* №21 · Махорага: ачивки (advancements/21_mahoraga). Цепочка: find_outpost → summon_mahoraga → kill_mahoraga → killed_by_mahoraga */
window.ZM = window.ZM || {};
ZM.P21 = { advancements: [
  { key: "find_outpost", title: "Следы божества", bold: true, color: "f", frame: "challenge", xp: 100, icon: "ender_eye", desc: "Найдите заброшенный аванпост Махораги", how: "Подойди к аванпосту ближе чем на 6 блоков. Считается от угла постройки, с которого её ставили. На странице: дойди до аванпоста по оку Края на карте." },
  { key: "summon_mahoraga", title: "With this treasure i summon...", bold: true, color: "f", frame: "goal", xp: 50, icon: "mahoraga_scroll", desc: "Призовите Махорагу с помощью свитка", how: "Дождись конца ритуала: Махорага должен упасть на землю. Отменённый ритуал не считается. На странице: досмотри ритуал или доведи свиток до призыва." },
  { key: "kill_mahoraga", title: "Адаптация сломана", bold: true, color: "f", frame: "challenge", xp: 200, icon: "mahoraga_scroll", desc: "Убейте Махорагу (достаточно нанести хоть 1 урон)", how: "Выдаётся хозяину и каждому игроку, который хоть раз его ранил. На странице: пройди обе фазы в симуляторе адаптации." },
  { key: "killed_by_mahoraga", title: "Колесо перемололо", color: "7", frame: "task", xp: 10, icon: "player_head", desc: "Умрите от руки Махораги", how: "Погибни от его удара. Хозяину это тоже доступно: лазер задевает всех на линии. На странице: встань под лазер второй фазы." }
] };
