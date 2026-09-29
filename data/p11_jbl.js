/* №11 · JBL-колонка: данные страницы (из кода мода: JBLSpeakerItem, JBLSpeakerScreen, JBLSpeakerHUD, JBLSpeakerNetwork, JBLFullVolumeTrigger) */
window.ZM = window.ZM || {};
ZM.P11 = {
  item: { id: "zitraksmode:jbl_speaker", name: "JBL-колонка", screen: "JBL Колонка", stack: 1 },
  // рецепт: IRI / BSB / IEI, E = тег zitraksmode:jbl_buttons (любая кнопка)
  recipe: {
    pattern: ["IRI", "BSB", "IEI"],
    key: {
      I: { icon: "iron_ingot", name: "Железный слиток", id: "minecraft:iron_ingot", px: true },
      R: { icon: "redstone", name: "Редстоун", id: "minecraft:redstone", px: true },
      B: { icon: "bamboo", name: "Бамбук", id: "minecraft:bamboo", px: true },
      S: { icon: "iso/note_block", name: "Нотный блок", id: "minecraft:note_block" },
      E: { tag: "zitraksmode:jbl_buttons", name: "Любая кнопка", cycle: [
        ["stone", "Каменная кнопка"], ["polished_blackstone", "Кнопка из полированного чернокамня"], ["oak", "Дубовая кнопка"],
        ["spruce", "Еловая кнопка"], ["birch", "Берёзовая кнопка"], ["jungle", "Кнопка из тропического дерева"], ["acacia", "Акациевая кнопка"],
        ["dark_oak", "Кнопка из тёмного дуба"], ["mangrove", "Мангровая кнопка"], ["crimson", "Багровая кнопка"], ["warped", "Искажённая кнопка"]] },
    },
  },
  // NBT предмета, как его пишет JBLSpeakerItem
  nbt: [
    ["Playing", "играет ли колонка"], ["Paused", "на паузе"], ["CurrentTrackId", "id трека в библиотеке"], ["CurrentTrackTitle", "название"],
    ["CurrentTrackAuthor", "кто загрузил"], ["Volume", "громкость 0…1, по умолчанию 1"], ["PlaybackStartGameTime", "игровой тик старта"],
    ["PlaybackDurationMs", "длина трека, мс"], ["PlaybackPositionMs", "позиция, мс"],
  ],
  // пакеты: JBLSpeakerNetwork (канал zitraksmode:jbl_speaker_channel, протокол "1") + пакеты экрана
  packets: [
    ["UploadTrackStart", "c2s", "начало загрузки: имя и размер файла"],
    ["UploadTrackChunk", "c2s", "файл едет по кускам"],
    ["UploadTrackFinish", "c2s", "всё дошло, сервер кладёт трек в библиотеку"],
    ["RequestSpeakerLibrary", "c2s", "кнопка ⟳ и открытие плеера"],
    ["SyncSpeakerLibrary", "s2c", "сервер присылает список треков"],
    ["SelectTrack", "c2s", "двойной клик или ▶"],
    ["PauseSpeaker", "c2s", "пауза и снятие с паузы"],
    ["SeekSpeaker", "c2s", "перемотка ползунком"],
    ["LikeTrack", "c2s", "❤"], ["DeleteTrack", "c2s", "✖"],
  ],
  advancements: [
    { key: "craft_jbl_speaker", title: "JBL-звук", color: "a", frame: "task", xp: 5, icon: "iso/jbl_speaker", hidden: true, chat: true,
      desc: "Скрафти JBL-колонку. Деревенский звук раскачает даже городского. Соседям пизда!", how: "Получи колонку в инвентарь: крафт или креатив" },
    { key: "jbl_full_volume", title: "Максимальная громкость!", color: "b", frame: "task", xp: 10, icon: "iso/note_block", hidden: true, chat: true,
      desc: "Пизда басуха лупасит! Слушай трек на 100% громкости больше 15 секунд.", how: "300 тиков подряд: трек играет, не на паузе, громкость 100%, колонка в инвентаре" },
  ],
  rules: [
    ["iso/jbl_speaker", "ПКМ открывает плеер", "Колонка в руке, правая кнопка мыши, и открывается экран «JBL Колонка» со всей библиотекой сервера. Игра при этом не ставится на паузу."],
    ["disc_pigstep", "Свои треки", "Перетащи .ogg или .mp3 прямо в окно плеера. Файл уходит на сервер кусками и попадает в общую библиотеку."],
    ["heart", "Лайки решают", "Список отсортирован по лайкам, дальше по свежести, дальше по алфавиту. Чем больше ❤, тем выше трек."],
    ["writable_book", "Своё название", "✎ переименовывает трек, ↗ отправляет его конкретному игроку, ✖ удаляет из библиотеки."],
    ["note", "Слышно всем рядом", "Трек играет не только тебе: сервер рассылает звук всем, кто видит игрока с колонкой."],
    ["iso/note_block", "HUD громкости", "Пока колонка в руке и играет, внизу слева висит плашка: ♫, название бегущей строкой, процент и полоска громкости."],
  ],
  history: [
    { ver: "14.03.2026", date: "14.03.2026", tag: "новый пункт", icon: "iso/jbl_speaker", c: "#ff6a00", title: "JBL-колонка",
      text: "Колонка из железа, бамбука, редстоуна, нотного блока и кнопки. ПКМ открывает плеер, музыка играет всем вокруг." },
    { ver: "1.0.3", date: "25.06.2026", tag: "исправление", icon: "iso/note_block", c: "#55ffff", title: "Исправление JBL-колонки",
      text: "Вместе с Супер-TNT, Made in Heaven, тетрадью смерти и аурой Будды Лабубу." },
    { ver: "1.0.4", date: "28.06.2026", tag: "реворк", icon: "disc_pigstep", c: "#1db954", title: "Реворк JBL-колонки",
      text: "Колонка в том виде, что на этой странице: общая библиотека, загрузка своих .ogg и .mp3, лайки, переименование, отправка игроку, перемотка и HUD с громкостью." },
  ],
  // игроки «онлайн» для окна «Поделиться игроку»
  online: ["Alex", "Steve", "Zitraks", "Житель", "Нотч"],
};
