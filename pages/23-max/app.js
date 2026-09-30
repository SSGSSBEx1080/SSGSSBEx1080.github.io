/* №23 — механики из MaxMessengerSavedData, MaxAntiCensor, MaxAttachmentStorage.
   Демо на странице: локальное состояние; не Minecraft-сервер и не полный словарь антицензора. */
(function () {
  const { $, esc } = ZM, K = ZM.kit;
  ZM.topbar({ crumb: "№23 · Мессенджер MAX", ...ZM.pointNav(23) });
  K.finNav(23, $("#finNav"));
  const icon = a => ZM.url(`assets/textures/p23/${a.icon}.svg`);
  const adv = K.adv({ list: ZM.P23.advancements, store: "p23.adv", icon, intro: "Четыре скрытых достижения MAX. Начни с получения предмета." });
  let opened = false, sent = 0, trades = 0, rejects = 0, gift = false;
  const status = text => $("#deskStatus").textContent = text;
  const stat = () => { $("#sentStat").textContent = `${sent} / 100`; $("#tradeStat").textContent = `${trades} / 5`; $("#rejectStat").textContent = `${rejects} / 5`; };
  function post(sender, text, kind) {
    const el = document.createElement("div"); el.className = "mx-msg" + (sender === "Вы" ? " mine" : "");
    el.innerHTML = `<small>${esc(sender)}${kind ? ` · ${esc(kind)}` : ""}</small><p>${esc(text)}</p><em>только в демонстрации</em>`;
    $("#thread").append(el); $("#thread").scrollTop = $("#thread").scrollHeight;
  }
  // Выдержка из MaxAntiCensor.java: порядок фразы → слова и сохранение регистра.
  // Не заявляем тождественность неполному клиентскому словарю всему словарю сервера.
  const phrases = [["подойди сюда", "подойди нахуй"], ["иди сюда", "иди нахуй"], ["добрый день", "салам пидорасы"], ["до свидания", "пиздуй нахуй"], ["привет", "салам"], ["пока", "пиздуй"]];
  const caseOf = (src, replacement) => src.length > 1 && src === src.toLocaleUpperCase("ru") ? replacement.toLocaleUpperCase("ru") : src[0] === src[0].toLocaleUpperCase("ru") ? replacement[0].toLocaleUpperCase("ru") + replacement.slice(1) : replacement;
  const safeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  function filter(text) {
    for (const [from, to] of phrases) text = text.replace(new RegExp(`(?<![\\p{L}])${safeRe(from)}(?![\\p{L}])`, "giu"), m => caseOf(m, to));
    return text;
  }
  function sample() { $("#after").textContent = filter($("#before").value) || "—"; }
  $("#before").addEventListener("input", sample); sample();
  function countMessage() { sent++; if (sent === 100) adv.grant("max_100_messages"); stat(); }
  $("#openMax").addEventListener("click", () => {
    if (!opened) { opened = true; $(".mx-empty")?.remove(); post("Система", "MAX открыт. Тестовые сообщения не попадут в игру.", "демо");
      for (const id of ["#message", "#send", "#sendGift", "#fastMessages"]) $(id).disabled = false;
      adv.grant("max_obtained"); status("MAX открыт. Напиши сообщение или отправь тестовый подарок."); }
    $("#message").focus();
  });
  $("#chatForm").addEventListener("submit", e => { e.preventDefault(); if (!opened) return;
    const t = $("#message").value.trim(); if (!t) return;
    post("Вы", filter(t)); countMessage(); $("#message").value = "";
    status("Текст обработан демонстрационной выдержкой из MaxAntiCensor и записан только в локальный чат.");
  });
  $("#fastMessages").addEventListener("click", () => { if (!opened) return;
    const n = Math.max(0, 99 - sent); sent += n; stat();
    post("Система", `Пропущено ${n} тестовых сообщений. Отправь следующее сам — на отметке 100 появится достижение.`, "ускоренное демо");
    status("Это ускорение только для прототипа. В Minecraft каждое из 100 сообщений нужно отправить самому.");
  });
  $("#sendGift").addEventListener("click", () => { if (!opened || gift) { if (gift) status("Сначала прими или отклони текущий подарок."); return; }
    gift = true; countMessage(); post("Вы", "Алмаз передан в хранилище до решения получателя.", "подарок");
    $("#giftPanel").hidden = false; $("#sendGift").disabled = true;
    status("Подарок ожидает ответа. Кнопки ниже имитируют решение получателя Игрока Икс.");
  });
  function answer(yes) {
    if (!gift) return; gift = false; $("#giftPanel").hidden = true; $("#sendGift").disabled = false;
    if (yes) { trades++; if (trades === 5) adv.grant("max_5_trades"); post("Игрок Икс", "Подарок принят. Алмаз попал в инвентарь получателя.", "сделка"); }
    else { rejects++; if (rejects === 5) adv.grant("max_5_rejects"); post("Игрок Икс", "Подарок отклонён. Алмаз возвращается отправителю.", "отказ"); }
    stat(); status(yes ? "Засчитана сделка получателю; отправителю она зачтётся в игре, если он онлайн." : "Засчитан отказ получателю. Если отправитель офлайн, возврат предмета ждёт его входа.");
  }
  $("#acceptGift").addEventListener("click", () => answer(true)); $("#rejectGift").addEventListener("click", () => answer(false));
})();
