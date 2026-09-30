/* №19 · Тетрадь смерти: ачивки (advancements/19_death). Порядок цепочки как в моде: black_book → craft_death_note → five_kills → craft_death_note_requiem → all_kill_methods */
window.ZM = window.ZM || {};
ZM.P19 = { advancements: [
  { key: "black_book", title: "Инструмент судьбы", color: "f", frame: "challenge", xp: 0, icon: "death_note", desc: "Держите в руках книгу и чёрный материал", how: "Положи в верстак книгу с пером и любой чёрный материал. Награда — рецепт Тетради." },
  { key: "craft_death_note", title: "Синигами одобряет", color: "f", frame: "goal", xp: 50, icon: "death_note", desc: "Создайте Тетрадь смерти", how: "Забери Тетрадь из верстака." },
  { key: "five_kills", title: "Серийный убийца", color: "f", frame: "challenge", xp: 0, icon: "nether_star", desc: "Совершите 5 убийств с помощью одной Тетради смерти", how: "Пять казней одной обычной Тетрадью. Награда — рецепт Реквиема." },
  { key: "craft_death_note_requiem", title: "Абсолютная сила", color: "f", frame: "challenge", xp: 100, icon: "death_note_requiem", desc: "Создайте Тетрадь смерти Реквием", how: "Скрафти Реквием из Тетради, на счету которой 5 убийств." },
  { key: "all_kill_methods", title: "Мастер казни", color: "c", bold: true, frame: "challenge", xp: 100, icon: "wither_head", desc: "Испробуй все 6 способов убийства из Тетради.", how: "Реквием: казнь, наковальня, лава, падение, молния и взрыв — хотя бы по разу." }
] };
