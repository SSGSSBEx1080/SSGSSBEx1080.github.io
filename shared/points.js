/* =====================================================================
   Реестр пунктов мода. Один источник правды для хаба и навигации.
   confirmed:true  -> номер подтверждён (по коду или HISTORY.md)
   confirmed:false -> номер предположен по HISTORY.md, нужно уточнить
   page            -> путь к готовой странице (null = ещё не сделана)
   ===================================================================== */
window.ZM = window.ZM || {};
ZM.POINTS = [
  { n: 1,  title: "Цифроблоки",            date: "26.10.2025", confirmed: true,  page: "pages/01-number-blocks/index.html", icon: "assets/textures/block/one.png", tone: "#ffffff" },
  { n: 2,  title: "ТНТ-броня",             date: "30.10.2025", confirmed: true,  page: "pages/02-tnt-armor/index.html", icon: "assets/textures/item/tnt_chestplate.png", tone: "#ff3b30" },
  { n: 3,  title: "Снайперки",             date: "04.11.2025", confirmed: true,  page: "pages/03-snipers/index.html", icon: "assets/textures/p3/icons/iron_sniper.png", tone: "#7dff8a" },
  { n: 4,  title: "Каска Шахтёра",         date: "07.11.2025", confirmed: false, page: "pages/04-miner-helmet/index.html", icon: "assets/textures/p4/models/miner_helmet.png", tone: "#ffcc33" },
  { n: 5,  title: "Житель-Даун",           date: "08.11.2025", confirmed: false, page: "pages/05-adun-villager/index.html", icon: "assets/textures/p5/icons/adun_egg.png", tone: "#17dd62" },
  { n: 6,  title: "Лабубу-система",        date: "31.12.2025", confirmed: true,  page: "pages/06-labubu/index.html", icon: "assets/textures/p6/icons/red.png", tone: "#ff7ab6" },
  { n: 7,  title: "Эндер-система",         date: "15.02.2026", confirmed: true,  page: "pages/07-ender/index.html", icon: "assets/textures/p7/iso/ender_safe.png", tone: "#8a4dff" },
  { n: 8,  title: "Made in Heaven",        date: "18.02.2026", confirmed: true,  page: "pages/08-mih/index.html", icon: "assets/textures/p8/made_in_heaven.png", tone: "#f5f0d0" },
  { n: 9,  title: "Дилдо-блоки",           date: "21.02.2026", confirmed: true,  page: "pages/09-dildo/index.html", icon: "assets/textures/p9/iso/stone_dildo.png", tone: "#e86bd0" },
  { n: 10, title: "Кастрация криперов",    date: "23.02.2026", confirmed: true, page: "pages/10-creeper/index.html", icon: "assets/textures/p10/creeper_face.png", tone: "#4caf50" },
  { n: 11, title: "JBL-колонка",           date: "14.03.2026", confirmed: true, page: "pages/11-jbl/index.html", tone: "#ff6a00", icon: "assets/textures/p11/iso/jbl_speaker.png" },
  { n: 12, title: "Катана",                date: "20.04.2026", confirmed: true, page: "pages/12-katana/index.html", tone: "#a77bff", icon: "assets/textures/p12/katana_icon.png" },
  { n: 13, title: "3D-принтер",            date: "26.04.2026", confirmed: true,  page: "pages/13-printer/index.html", tone: "#35d0ff", icon: "assets/textures/p13/printer_iso.png" },
  { n: 14, title: "Акваланг",              date: "22.04.2026", confirmed: true,  page: "pages/14-aqualung/index.html", tone: "#ffc90e", icon: "assets/textures/p14/aqualung.png" },
  { n: 15, title: "Хентай-блок",           date: "30.04.2026", confirmed: true,  page: "pages/15-hentai/index.html", tone: "#ff9000", icon: "assets/textures/p15/hentai_block.png" },
  { n: 16, title: "Картины",               date: "30.04.2026", confirmed: true,  page: "pages/16-paintings/index.html", tone: "#d9a55b", icon: "assets/textures/p16/icon.png" },
  { n: 17, title: "Коран",                 date: "30.04.2026", confirmed: true, page: "pages/17-koran/index.html", tone: "#d8b25a", icon: "assets/textures/p17/i/koran.png" },
  { n: 18, title: "Стальной шар Джайро",   date: "02.05.2026", confirmed: true, page: "pages/18-steel-ball/index.html", tone: "#9ae66e", icon: "assets/textures/p18/i/steel_ball.png" },
  { n: 19, title: "Тетрадь смерти",        date: "05.05.2026", confirmed: true, page: "pages/19-death-note/index.html", tone: "#b00020", icon: "assets/textures/p19/i/death_note.png" },
  { n: 20, title: "Газан 67",              date: "07.05.2026", confirmed: true, page: "pages/20-gazan/index.html", icon: "assets/textures/p20/i/gazan_spawn_egg.png", tone: "#ffd700" },
  { n: 21, title: "Махорага",              date: "16.05.2026", confirmed: true, page: null, tone: "#e8e2cf" },
  { n: 22, title: "Дойка быка и разорителя", date: "18.05.2026", confirmed: true, page: null, tone: "#f2f2f2" },
  { n: 23, title: "Мессенджер MAX",        date: "18.07.2026", confirmed: true, page: null, tone: "#6c5cff" },
  { n: 24, title: "Электросамокат",        date: "28.07.2026", confirmed: true, page: null, tone: "#00e0a0" },
  { n: 25, title: "Плащи Логии",           date: "04.08.2026", confirmed: true, page: null, tone: "#ff8800" },
  { n: 26, title: "Пылесос",               date: "07.08.2026", confirmed: true,  page: null, tone: "#6ec8ff" },
  { n: 27, title: "???",                   date: "",           confirmed: false, page: null, tone: "#666" },
  { n: 28, title: "Медуза",                date: "17.08.2026", confirmed: true,  page: null, tone: "#7dff9a" },
  { n: 29, title: "Секретный пункт",       date: "05.09.2026", confirmed: true, page: null, tone: "#aa00aa" },
];
ZM.GUEST_POINTS = [
  { title: "Колбаса ГОСТ «Докторская»", from: "от бабушки Вали" },
  { title: "Соль, редис, борщ и нож",   from: "от прабабушки Нины" },
  { title: "Антон Чигур",               from: "гостевой пункт" },
];
ZM.pointNav = (n) => {
  const done = ZM.POINTS.filter((p) => p.page);
  const i = done.findIndex((p) => p.n === n);
  const map = (p) => p && { n: p.n, title: p.title, href: p.page };
  return { prev: map(done[i - 1]), next: map(done[i + 1]) };
};
