/* Гостевые ветки общего древа: стенд-цели Б, В и П (у К ветки нет —
 * его страница про «NO AI», ачивки там были бы ложью).
 * Формат совместим с ZM.HUB_ADV (n/title/page/tone/icon/store/adv),
 * плюс гостевые поля: id, letter, guest и mc-код цвета для kit.adv. */
window.ZM = window.ZM || {};
ZM.GUEST_ADV = [
  {
    id: "g1", guest: true, letter: "Б", n: 101,
    title: "Докторская колбаса", page: "pages/g1-kolbasa/index.html",
    tone: "#ff6257", icon: "assets/textures/guest/gost_doctorskaya_sausage.png", store: "g1.adv",
    adv: [
      { key: "bite", t: "Первый кусок", c: "#FFD76E", b: false, mc: "e", frame: "task", xp: 5, parent: null, hidden: true,
        icon: "assets/textures/guest/gost_doctorskaya_sausage.png",
        d: "Съесть кусок докторской на стенде голода", how: "Кнопка «Съесть кусок» в разделе «Паспорт ГОСТ»." },
      { key: "full", t: "Полный желудок", c: "#9FE08A", b: false, mc: "a", frame: "goal", xp: 10, parent: "bite", hidden: true,
        icon: "assets/textures/p22/i/h_full.png",
        d: "Поднять шкалу голода до 20 из 20", how: "Два куска подряд — и шкала полна." },
      { key: "deal", t: "Сделка века", c: "#7FE3DB", b: false, mc: "b", frame: "task", xp: 10, parent: "full", hidden: true,
        icon: "assets/textures/mc/p2/item_emerald.png",
        d: "Выменять колбасу за изумруд у профессионального жителя", how: "Торговый стенд: выбери профессию и нажми «Купить колбасу»." },
      { key: "regular", t: "Свой человек", c: "#FFAA00", b: false, mc: "6", frame: "goal", xp: 15, parent: "deal", hidden: true,
        icon: "assets/textures/p22/i/emerald.png",
        d: "Исчерпать все 16 покупок одного жителя", how: "Растрать весь лимит сделок — житель уйдёт на пополнение." },
      { key: "taster", t: "Дегустатор", c: "#FF5555", b: false, mc: "c", frame: "challenge", xp: 20, parent: "regular", hidden: true,
        icon: "assets/textures/p26/v/carrot.png",
        d: "Изучить предложения всех пятнадцати профессий стенда", how: "Пощёлкай по каждой кнопке в сетке профессий — включая безработного и нищего." },
    ],
  },
  {
    id: "g3", guest: true, letter: "В", n: 103,
    title: "Пункт Мистера В", page: "pages/g3-rezerv/index.html",
    tone: "#9db4c4", icon: "assets/textures/mc/p2/block_deepslate.png", store: "g3.adv",
    adv: [
      { key: "seek", t: "Прогнать все каналы", c: "#AAAAAA", b: false, mc: "7", frame: "task", xp: 5, parent: null, hidden: true,
        icon: "assets/textures/mc/p2/block_deepslate.png",
        d: "Перебрать тюнером все семь каналов резерва", how: "Крути ручку тюнера, пока не побываешь на каждом канале." },
      { key: "nosignal", t: "НЕТ СИГНАЛА", c: "#55FFFF", b: true, mc: "b", frame: "challenge", xp: 15, parent: "seek", hidden: true,
        icon: "assets/textures/mc/p2/block_deepslate.png",
        d: "Досмотреть до синего экрана. Сигнала так и нет", how: "Седьмой канал. Да, и там тоже ничего." },
    ],
  },
  {
    id: "g4", guest: true, letter: "П", n: 104,
    title: "Соль, нож и редиска", page: "pages/g4-nina/index.html",
    tone: "#e0576b", icon: "assets/textures/guest/nina_knife.png", store: "g4.adv",
    adv: [
      { key: "backstab", t: "Подлый удар", c: "#FF5555", b: false, mc: "c", frame: "task", xp: 5, parent: null, hidden: true,
        icon: "assets/textures/guest/nina_knife.png",
        d: "Попасть ножом точно в спину: множитель ×2", how: "Стенд «Откуда бьёшь»: поверни цель спиной к себе и бей." },
      { key: "copperbull", t: "Медный бык", c: "#FFAA00", b: false, mc: "6", frame: "goal", xp: 10, parent: "backstab", hidden: true,
        icon: "assets/textures/p22/cow_bull_copper.png",
        d: "Стрижкой получить медного быка — как в ветке №22", how: "Подойди к обычному быку с ножом: шанс 50/50." },
      { key: "fuse", t: "Бикфордов шнур", c: "#55FFFF", b: false, mc: "b", frame: "task", xp: 10, parent: "copperbull", hidden: true,
        icon: "assets/textures/guest/salt.png",
        d: "Сжечь солевой фитиль из десяти и более солей", how: "Нарисуй на стенде дорожку хотя бы из 10 солей и подожги от рычага." },
      { key: "harvest", t: "Урожай", c: "#9FE08A", b: false, mc: "a", frame: "goal", xp: 10, parent: "fuse", hidden: true,
        icon: "assets/textures/guest/radish.png",
        d: "Собрать спелую редиску с грядки", how: "Гони случайные тики до стадии 7 и собери урожай." },
      { key: "lunch", t: "Обед подан", c: "#FF55FF", b: false, mc: "d", frame: "challenge", xp: 15, parent: "harvest", hidden: true,
        icon: "assets/textures/guest/borscht.png",
        d: "Сварить и забрать борщ из верстака", how: "Собери рецепт 3×3 и нажми «Забрать»." },
    ],
  },
];
