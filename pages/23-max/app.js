/* №23 · Мессенджер MAX. Логика из кода мода:
   MaxMessengerItem — стак 1, ПКМ открывает MaxMessengerScreen (только клиент). giveIfMissing при входе: метка MaxMessengerGranted в PERSISTED_NBT
     (переживает смерть), если MAX уже где-то в инвентаре — только ставит метку, иначе слот 9 → любое место → под ноги.
   MaxMessengerSavedData — всё на сервере: профили, сообщения, вложения, подарки. sendText/Attachment/Gift и editMessage гонят текст через MaxAntiCensor.
     Счётчик SentMessages++ на текст, файл и подарок (пересылка не считается); ровно на 100 → 23_max/max_100_messages.
     delete: только своё; скрывается у отправителя, у получателя «Сообщение удалено» (сырой текст остаётся, пока не скрыт у обоих — только в «Избранном»).
     forward: берёт getRawText() источника без проверки deleted, без антицензуры, без счётчика; копирует тип, вложение и id подарка.
     edit: только своё, только TEXT, не удалённое. Подарок: эскроу сразу, ✓ — в инвентарь (лишнее под ноги), ✕ — возврат (офлайн — при следующем входе).
     CompletedTrades у обоих, ачивка max_5_trades на ==5 (отправителю — только если он в сети в этот момент). RejectedTrades у того, кто жмёт ✕, ==5 → max_5_rejects.
   MaxMessengerScreen — цвета и подписи экрана, контекстное меню (Изменить/Удалить/Ответить/Переслать), поиск ↑↓, аватарки кодом, подарок до 4 слотов,
     файлы drag&drop, превью 160×120, аватарка 192→64 пока base64 < 30000. Хранилище 500 МБ, чанки 30 КБ. */
(function () {
  const { $, $$, esc } = ZM, K = ZM.kit, U = ZM.url;
  ZM.topbar({ crumb: "№23 · MAX", ...ZM.pointNav(23) });
  const I = (n) => U(`assets/textures/p23/i/${n}.png`);
  const snd = K.sounds("p23");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motion = () => !reduce && !document.documentElement.classList.contains("no-motion");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  let adv = null;
  const grant = (k) => adv && adv.grant(k);
  const hex = (c) => "#" + (c & 0xffffff).toString(16).padStart(6, "0");
  const ITEMS = { diamond: "Алмаз", emerald: "Изумруд", bread: "Хлеб", iron_ingot: "Железный слиток", gold_ingot: "Золотой слиток", apple: "Яблоко", cookie: "Печенье",
    golden_apple: "Золотое яблоко", ender_pearl: "Жемчуг Края", bucket: "Ведро", stick: "Палка", rotten_flesh: "Гнилая плоть", bone: "Кость", feather: "Перо",
    totem_of_undying: "Тотем бессмертия", name_tag: "Бирка", paper: "Бумага", book: "Книга", netherite_ingot: "Незеритовый слиток", string: "Нить", dirt: "Земля", tnt: "Динамит",
    cobblestone: "Булыжник", oak_log: "Дубовое бревно", crafting_table: "Верстак", writable_book: "Книга и перо", max_messenger: "MAX" };
  const fmtBytes = (b) => b >= 1048576 ? (b / 1048576).toFixed(1) + " МБ" : b >= 1024 ? (b / 1024).toFixed(1) + " КБ" : b + " Б";

  /* ================= антицензура: порт MaxAntiCensor.process ================= */
  const DICT = ZM.P23DICT, W = DICT.w, B = "[\\p{L}\\p{N}_]";
  const PH = DICT.ph.map(([k, v]) => [new RegExp(`(?<!${B})${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?!${B})`, "giu"), v, k]);
  const WORD = new RegExp(`(?<!${B})\\p{L}+(?!${B})`, "gu");
  const matchCase = (o, r) => {
    if (!o || !r) return r;
    const allUp = o.length > 1 && o === o.toUpperCase() && o !== o.toLowerCase();
    if (allUp) return r.toUpperCase();
    if (o[0] !== o[0].toLowerCase()) return r[0].toUpperCase() + r.slice(1);
    return r;
  };
  function censor(input) {
    let s = String(input || ""), m = Array.from(s, () => 0); const hits = [];
    const rep = (re, fn) => {
      let out = "", om = [], last = 0; re.lastIndex = 0; let x;
      while ((x = re.exec(s))) {
        const r = fn(x[0]); if (r === null) continue;
        out += s.slice(last, x.index); om = om.concat(m.slice(last, x.index)); out += r; om = om.concat(Array.from(r, () => 1)); last = x.index + x[0].length;
      }
      out += s.slice(last); om = om.concat(m.slice(last)); s = out; m = om;
    };
    for (const [re, v, k] of PH) rep(re, (w) => { hits.push(["фраза", w, matchCase(w, v)]); return matchCase(w, v); });
    rep(WORD, (w) => { const v = W[w.toLowerCase()]; if (v === undefined) return null; hits.push(["слово", w, matchCase(w, v)]); return matchCase(w, v); });
    return { text: s, mask: m, hits };
  }
  const censorHtml = (r) => { let h = "", cur = -1, buf = ""; const flush = () => { if (buf) h += cur ? `<mark>${esc(buf)}</mark>` : esc(buf); buf = ""; };
    Array.from(r.text).forEach((c, i) => { const k = r.mask[i] || 0; if (k !== cur) { flush(); cur = k; } buf += c; }); flush(); return h; };

  /* ================= аватарки: drawAvatarSquare и стоковые лица из экрана ================= */
  const STYLE = { stock_steve: ["steve", 0xFF6D4C41], stock_alex: ["alex", 0xFFBF6D32], stock_smile: ["smile", 0xFFF4C542], stock_cat: ["cat", 0xFFE88BC8, 0xFFFFFFFF], stock_skull: ["skull", 0xFF8A8F98], favorite_flag: ["favorite_flag", 0xFF2673F2, 0xFFFFFFFF] };
  const imgCache = {};
  function drawAva(cv, id, size, online, status) {
    cv.width = cv.height = size; const g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
    const f = (x1, y1, x2, y2, c) => { g.fillStyle = typeof c === "number" ? hex(c) : c; g.fillRect(Math.floor(x1), Math.floor(y1), Math.floor(x2) - Math.floor(x1), Math.floor(y2) - Math.floor(y1)); };
    const d = (a, b) => Math.trunc(a / b);
    f(0, 0, size, size, 0xFF2A3442); f(1, 1, size - 1, size - 1, 0xFF101722);
    const x = 2, y = 2, s = size - 4;
    if (id && id.startsWith("image:")) {
      f(2, 2, size - 2, size - 2, 0xFF1D2630);
      let im = imgCache[id]; if (!im) { im = imgCache[id] = new Image(); im.src = "data:image/png;base64," + id.slice(6); }
      const put = () => { g.imageSmoothingEnabled = true; g.drawImage(im, 2, 2, s, s); if (status) f(size - 6, size - 6, size - 2, size - 2, online ? 0xFF2ECC71 : 0xFF7B8794); };
      if (im.complete && im.naturalWidth) put(); else im.addEventListener("load", put, { once: true });
      return cv;
    }
    const st = STYLE[id] || ["smile", 0xFF5A6B7D]; f(x, y, x + s, y + s, st[1]);
    const face = {
      steve() { f(x + d(s, 5), y + d(s, 4), x + s - d(s, 5), y + s - d(s, 6), 0xFFD7A97B); f(x, y, x + s, y + d(s, 3), 0xFF4E342E); f(x, y + d(s, 3), x + d(s, 6), y + d(s * 3, 4), 0xFF4E342E); f(x + d(s * 5, 6), y + d(s, 3), x + s, y + d(s * 3, 4), 0xFF4E342E); f(x + d(s, 3), y + d(s, 2), x + d(s, 3) + 2, y + d(s, 2) + 2, 0xFF22313F); f(x + d(s * 2, 3) - 2, y + d(s, 2), x + d(s * 2, 3), y + d(s, 2) + 2, 0xFF22313F); },
      alex() { f(x + d(s, 5), y + d(s, 4), x + s - d(s, 5), y + s - d(s, 6), 0xFFE5B58A); f(x, y, x + s, y + d(s, 3), 0xFFCE7A31); f(x, y + d(s, 3), x + d(s, 5), y + s, 0xFFCE7A31); f(x + d(s * 4, 5), y + d(s, 3), x + s, y + d(s * 4, 5), 0xFFCE7A31); f(x + d(s, 3), y + d(s, 2), x + d(s, 3) + 2, y + d(s, 2) + 2, 0xFF2B2B2B); f(x + d(s * 2, 3) - 2, y + d(s, 2), x + d(s * 2, 3), y + d(s, 2) + 2, 0xFF2B2B2B); },
      smile() { f(x + d(s, 4), y + d(s, 3), x + d(s, 4) + 2, y + d(s, 3) + 2, 0xFF202020); f(x + d(s * 3, 4) - 2, y + d(s, 3), x + d(s * 3, 4), y + d(s, 3) + 2, 0xFF202020); f(x + d(s, 4), y + d(s * 2, 3), x + d(s * 3, 4), y + d(s * 2, 3) + 1, 0xFF5D4037); },
      cat() { const fg = st[2]; f(x + d(s, 4), y + d(s, 5), x + d(s, 2), y + d(s, 3), fg); f(x + d(s, 2), y + d(s, 5), x + d(s * 3, 4), y + d(s, 3), fg); f(x + d(s, 5), y + d(s, 3), x + d(s * 4, 5), y + d(s * 4, 5), 0xFFFFD1E8); f(x + d(s, 3), y + d(s, 2), x + d(s, 3) + 2, y + d(s, 2) + 2, 0xFF2A2A2A); f(x + d(s * 2, 3) - 2, y + d(s, 2), x + d(s * 2, 3), y + d(s, 2) + 2, 0xFF2A2A2A); },
      skull() { f(x + d(s, 5), y + d(s, 5), x + d(s * 4, 5), y + d(s * 4, 5), 0xFFDADDE2); f(x + d(s, 3), y + d(s, 3), x + d(s, 3) + 3, y + d(s, 3) + 3, 0xFF2B2F35); f(x + d(s * 2, 3) - 3, y + d(s, 3), x + d(s * 2, 3), y + d(s, 3) + 3, 0xFF2B2F35); },
      favorite_flag() { const px = x + d(s, 3), ty = y + d(s, 4), fg = 0xFFFFFFFF; f(px, ty, px + 2, y + d(s * 3, 4), fg); f(px + 2, ty, x + d(s * 3, 4), ty + 2, fg); f(px + 2, y + d(s, 2), x + d(s * 3, 4), y + d(s, 2) + 2, fg); f(x + d(s * 3, 4) - 2, ty, x + d(s * 3, 4), y + d(s, 2) + 2, fg); },
    };
    face[st[0]]();
    if (status) f(size - 6, size - 6, size - 2, size - 2, online ? 0xFF2ECC71 : 0xFF7B8794);
    return cv;
  }
  const ava = (id, size, online, status, cls = "") => { const c = document.createElement("canvas"); c.className = "mx-ava " + cls; drawAva(c, id, size, online, status); return c; };

  /* ================= HERO: иконка + уведомления ================= */
  (function hero() {
    const n = $("#heroNotif"), lines = [["Nagibator3000", "Салам"], ["Ksyusha_mc", "Иди нахуй, я строю"], ["Oleg_Pro", "Подарок"], ["Dimon", "Как хуй?"], ["Избранное", "заметки"]];
    let i = 0;
    const tick = () => { const [a, b] = lines[i++ % lines.length]; n.innerHTML = `<b>${esc(a)}</b><span>${esc(b)}</span><i>${i}</i>`; n.classList.remove("on"); void n.offsetWidth; n.classList.add("on"); };
    tick(); setInterval(() => { if (motion()) tick(); }, 3200);
    $("#heroIcon").addEventListener("click", () => { snd("pling", 0.5, 1.2); document.getElementById("app").scrollIntoView({ behavior: motion() ? "smooth" : "auto" }); });
    const tk = ["иди сюда → иди нахуй", "привет → салам", "люблю → ненавижу", "хорошо → плохо", "как дела → как хуй", "окей → хуй побрей", "спс → иди нахуй", "тут ↔ там", "рай ↔ ад", "правда ↔ ложь", "котлеты → ёжики", "пиво → вода", "мне → мне похуй", "я думаю → я знаю", "мне кажется → я уверен", "имба → говно"];
    $("#ticker").innerHTML = (tk.map((t) => `<span>${esc(t)}</span>`).join("<i>●</i>") + "<i>●</i>").repeat(2);
  })();

  /* ================= 01 выдача: giveIfMissing ================= */
  (function getSim() {
    const G = { tag: false, inv: Array(36).fill(null), ground: false, joined: false };
    const hb = $("#hotbar"), iv = $("#inv"), msg = $("#worldMsg");
    const slot = (it, i) => `<div class="mx-slot${i === 8 ? " s9" : ""}" data-i="${i}">${it ? `<img src="${I(it)}" alt="${esc(ITEMS[it] || it)}" title="${esc(ITEMS[it] || it)}">` : ""}${i < 9 ? `<em>${i + 1}</em>` : ""}</div>`;
    const draw = () => {
      hb.innerHTML = G.inv.slice(0, 9).map(slot).join(""); iv.innerHTML = G.inv.slice(9).map((it, k) => slot(it, k + 9)).join("");
      $("#dropItem").hidden = !G.ground;
      $("#gFlag").innerHTML = `ForgeData.PlayerPersisted.<b>MaxMessengerGranted</b> = <span class="${G.tag ? "on" : ""}">${G.tag ? "1b" : "нет"}</span>`;
    };
    const has = () => G.inv.includes("max_messenger");
    const say = (t) => { msg.textContent = t; msg.classList.remove("flash"); void msg.offsetWidth; msg.classList.add("flash"); };
    $("#gJoin").addEventListener("click", () => {
      G.joined = true; snd("click", 0.5);
      if (G.tag) return say("Метка уже стоит: MAX не выдаётся повторно"), draw();
      if (has()) { G.tag = true; draw(); return say("MAX уже в инвентаре: мод просто ставит метку"); }
      if (!G.inv[8]) { G.inv[8] = "max_messenger"; say("MAX лёг в 9-й слот"); }
      else { const e = G.inv.indexOf(null); if (e >= 0) { G.inv[e] = "max_messenger"; say(`9-й занят: MAX в слоте ${e + 1}`); } else { G.ground = true; say("Инвентарь полон: MAX выпал под ноги. Метка всё равно поставлена"); } }
      G.tag = true; snd("pop", 0.6); if (has()) grant("max_obtained"); draw();
    });
    $("#gDie").addEventListener("click", () => { if (!G.inv.some(Boolean)) return say("Нечего терять"); G.inv = Array(36).fill(null); G.ground = true; snd("no", 0.4); draw(); say("Всё выпало. Метка в PlayerPersisted пережила смерть: новый MAX не придёт"); });
    $("#gFill9").addEventListener("click", () => { if (!G.inv[8]) G.inv[8] = "dirt"; snd("click", 0.4); draw(); say("В 9-м слоте теперь земля"); });
    $("#gFill").addEventListener("click", () => { G.inv = G.inv.map((x, i) => x || pick(["dirt", "cobblestone", "oak_log", "bread", "stick", "bone", "string", "feather"])); snd("click", 0.4); draw(); say("Инвентарь забит под завязку"); });
    $("#gNew").addEventListener("click", () => { G.tag = false; G.inv = Array(36).fill(null); G.ground = false; snd("levelup", 0.3, 1.4); draw(); say("Новый персонаж: метки нет"); });
    $("#dropItem").addEventListener("click", () => { const e = G.inv.indexOf(null); if (e < 0) return say("Некуда подобрать"); G.inv[e] = "max_messenger"; G.ground = false; snd("pop", 0.6); grant("max_obtained"); draw(); say("Подобрал MAX с земли"); });
    draw();
    K.dl($("#getDl"), [
      ["Как получить", "сам при первом входе в мир; крафта нет"],
      ["Куда", "9-й слот → любой свободный → под ноги"],
      ["Повторно", "никогда: метка в <b>PlayerPersisted</b> переживает смерть"],
      ["Уже был", "если MAX лежит в инвентаре, второй не создаётся"],
      ["Стак", "1"],
      ["Вкладка", "креативная вкладка ZitraksMode"],
      ["Использование", "ПКМ открывает экран, без перезарядки, без траты"],
      ["Где живут данные", "на сервере, в <code>zitraksmode_max_messenger</code>: сам предмет пустой"],
    ]);
  })();

  /* ================= 02 СИМУЛЯТОР ================= */
  const KEY = "zm:p23.max";
  const now = Date.now(), H = 3600e3;
  const BOTS = [
    { id: "b1", name: "Nagibator3000", base: "Nagibator3000", desc: "", ava: "stock_skull", online: true },
    { id: "b2", name: "Ksyusha_mc", base: "Ksyusha_mc", desc: "строю замки, не пишите", ava: "stock_cat", online: true },
    { id: "b3", name: "Oleg_Pro", base: "OlegPro2009", desc: "", ava: "stock_alex", online: false },
    { id: "b4", name: "Dimon", base: "dimon_minecraft", desc: "продаю алмазы недорого", ava: "stock_smile", online: true },
  ];
  const seed = () => {
    const S = { me: { id: "me", base: (ZM.profile && ZM.profile.me().nick) || "Player", name: "", desc: "", ava: "stock_steve", show: "", reg: false, sent: 0, trades: 0, rejects: 0,
        inv: { diamond: 3, bread: 16, iron_ingot: 10, cobblestone: 64, oak_log: 20, apple: 5, ender_pearl: 4, gold_ingot: 6 } },
      users: BOTS.map((b) => Object.assign({ trades: 0 }, b)), msgs: [], gifts: {}, next: 1 };
    const add = (from, to, text, t, o = {}) => S.msgs.push(Object.assign({ id: S.next++, from, to, text, t, read: true, type: "TEXT" }, o));
    add("b1", "me", "Салам", now - 26 * H); add("b1", "me", "есть железо?", now - 26 * H + 60e3);
    add("b2", "me", "Иди нахуй, я строю", now - 25 * H);
    add("b2", "me", "координаты базы: 1250 64 -830", now - 25 * H + 30e3, { deleted: true, hr: false });
    add("b2", "me", "ой не туда", now - 25 * H + 40e3);
    add("b4", "me", "Стой сука, есть дело", now - 2 * H, { read: false }); add("b4", "me", "продаю алмазы, 1 алмаз = 3 железа", now - 2 * H + 20e3, { read: false });
    return S;
  };
  let S; try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
  if (!S || !S.me || !S.msgs || !S.me.inv) S = seed();
  const files = {}; // вложения этой сессии: id → File (для «↓»)
  const save = () => { try { const c = JSON.parse(JSON.stringify(S)); c.msgs.forEach((m) => { if (m.att) delete m.att.preview; }); localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} };
  const user = (id) => id === "me" ? S.me : S.users.find((u) => u.id === id);
  const dname = (u) => (u.name || u.base || "Player").slice(0, 24);
  const trim = (t, n) => (t = String(t || ""), t.length > n ? t.slice(0, n) + "…" : t);
  const mx = $("#mx");
  const V = { sel: null, reply: 0, edit: 0, fwd: 0, att: null, search: "", res: [], ri: -1, status: "", menu: null, modal: null, attachMenu: false, draft: "", giftSlots: [], stick: true };
  let statusT = 0;
  const status = (t) => { V.status = t; const el = $(".mx-status", mx); if (el) el.textContent = t; clearTimeout(statusT); statusT = setTimeout(() => { V.status = ""; const e2 = $(".mx-status", mx); if (e2) e2.textContent = ""; }, 3500); };
  const counters = () => {
    $("#cntMsg").textContent = S.me.sent; $("#cntBar").style.width = Math.min(100, S.me.sent) + "%";
    $("#cntTr").textContent = S.me.trades; $("#cntRj").textContent = S.me.rejects;
  };
  const conv = (a, b) => S.msgs.filter((m) => (m.from === a && m.to === b) || (m.from === b && m.to === a)).sort((x, y) => x.t - y.t);
  const visible = (m) => m.from === "me" ? !m.hs : !m.hr;
  const preview = (id) => {
    const c = conv("me", id).filter(visible); const m = c[c.length - 1]; if (!m) return "";
    if (m.deleted) return "Сообщение удалено";
    return m.type === "FILE" ? "Файл: " + (m.att ? m.att.name : "file.bin") : m.type === "GIFT" ? "Подарок" : m.text.replace(/\n/g, " ");
  };
  const unread = (id) => S.msgs.filter((m) => m.from === id && m.to === "me" && !m.read && visible(m)).length;

  /* --- «сервер» --- */
  const countSent = () => { S.me.sent++; if (S.me.sent === 100) grant("max_100_messages"); counters(); };
  function serverSend(from, to, text, o = {}) {
    const m = Object.assign({ id: S.next++, from, to, text: censor(text).text, t: Date.now(), read: from === to, type: "TEXT" }, o);
    if (o.raw) { m.text = text; delete m.raw; }
    S.msgs.push(m); if (from === "me" && !o.fwd) countSent(); save(); return m;
  }
  function botAct(to) {
    const b = user(to); if (!b || to === "me" || !b.online) return;
    setTimeout(() => { conv("me", to).forEach((m) => { if (m.from === "me") m.read = true; }); save(); render(); }, 900 + Math.random() * 700);
    if (Math.random() < 0.75) setTimeout(() => {
      const t = pick(["ок", "привет", "как дела", "я думаю да", "пока", "хз", "спс", "короче норм", "круто", "интересно", "подожди", "мне кажется это имба", "окей", "братан ты лучший", "погоди, я иду", "ну типа хорошо", "не знаю", "люблю этот сервер"]);
      serverSend(to, "me", t, { read: V.sel === to }); snd(V.sel === to ? "hat" : "pling", 0.45, 1.3); render();
    }, 2200 + Math.random() * 1800);
  }
  function giftRespond(g, accept, actor) {
    if (g.state !== "PENDING" && g.state !== "FAILED") return;
    if (!accept) {
      g.state = "REJECTED";
      if (g.from === "me") S.me.inv = addInv(S.me.inv, g.stacks);
      if (actor === "me") { S.me.rejects++; if (S.me.rejects === 5) grant("max_5_rejects"); status("Отклонено"); snd("no", 0.45); }
    } else {
      g.state = "ACCEPTED";
      if (g.to === "me") { S.me.inv = addInv(S.me.inv, g.stacks); snd("chest", 0.5); }
      [g.from, g.to].forEach((id) => { const u = user(id); u.trades = (u.trades || 0) + 1; if (id === "me" && u.trades === 5) grant("max_5_trades"); });
    }
    counters(); save(); render();
  }
  const addInv = (inv, stacks) => { inv = Object.assign({}, inv); stacks.forEach((s) => (inv[s.id] = (inv[s.id] || 0) + s.n)); return inv; };
  function botGift() {
    const b = pick(S.users.filter((u) => u.online)); const n = 1 + Math.floor(Math.random() * 4);
    const pool = [["diamond", 3], ["bread", 12], ["rotten_flesh", 20], ["dirt", 64], ["emerald", 5], ["cookie", 8], ["totem_of_undying", 1], ["golden_apple", 2], ["tnt", 4], ["bone", 10], ["netherite_ingot", 1], ["name_tag", 1]];
    const stacks = pool.sort(() => Math.random() - 0.5).slice(0, n).map(([id, c]) => ({ id, n: c }));
    const gid = "g" + S.next; S.gifts[gid] = { from: b.id, to: "me", stacks, state: "PENDING" };
    serverSend(b.id, "me", pick(["лови", "держи братан", "это тебе", "подарок, не благодари", "спс за вчера", ""]), { type: "GIFT", gift: gid, read: V.sel === b.id });
    snd("pling", 0.5, 1.1); status(`${dname(b)}: подарок`); render();
  }

  /* --- рендер экрана --- */
  function contacts() {
    const r = [{ id: "me", name: "Избранное", ava: "favorite_flag", prev: preview("me") || "заметки", un: 0, on: true, fav: true }];
    S.users.slice().sort((a, b) => dname(a).localeCompare(dname(b), "ru", { sensitivity: "base" })).forEach((u) =>
      r.push({ id: u.id, name: dname(u), ava: u.ava, prev: preview(u.id) || u.desc || "пусто", un: unread(u.id), on: u.online }));
    return r;
  }
  const time = (t) => new Date(t).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const dayLabel = (t) => { const d = new Date(t), n = new Date(); const y = new Date(n); y.setDate(n.getDate() - 1);
    return d.toDateString() === n.toDateString() ? "Сегодня" : d.toDateString() === y.toDateString() ? "Вчера" : d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }); };
  function render() {
    if (!S.me.reg && V.modal !== "crop") V.modal = V.modal === "picker" ? "picker" : "register";
    const keepScroll = $(".mx-msgs", mx); const oldTop = keepScroll ? keepScroll.scrollTop : 0, oldH = keepScroll ? keepScroll.scrollHeight - keepScroll.clientHeight : 0;
    const wasBottom = !keepScroll || oldH - oldTop < 30;
    const draft = $(".mx-input", mx) ? $(".mx-input", mx).value : V.draft; V.draft = draft;
    const focusIn = document.activeElement && document.activeElement.classList.contains("mx-input");
    const focusSearch = document.activeElement && document.activeElement.classList.contains("mx-search");
    mx.innerHTML = "";
    const side = document.createElement("div"); side.className = "mx-side";
    side.innerHTML = `<div class="mx-brand"><b>MAX</b><span>Чаты</span></div><div class="mx-contacts"></div>`;
    const cl = $(".mx-contacts", side);
    contacts().forEach((c) => {
      const row = document.createElement("button"); row.type = "button"; row.className = "mx-row" + (V.sel === c.id ? " on" : "") + (V.fwd ? " fwd" : "");
      row.appendChild(ava(c.ava, 40, c.on, true));
      row.insertAdjacentHTML("beforeend", `<span class="mx-row-t"><b>${esc(trim(c.name, 16))}</b><i class="${c.fav ? "fav" : ""}">${esc(trim(c.prev, 18))}</i></span>${c.un ? `<em>${c.un > 9 ? "9+" : c.un}</em>` : ""}`);
      row.addEventListener("click", () => openChat(c.id)); cl.appendChild(row);
    });
    const self = document.createElement("button"); self.type = "button"; self.className = "mx-self";
    self.appendChild(ava(S.me.ava, 40, true, true));
    self.insertAdjacentHTML("beforeend", `<span class="mx-row-t"><b>${esc(trim(dname(S.me), 12))}</b><i>${esc(trim(S.me.desc || "профиль", 14))}</i></span>`);
    self.addEventListener("click", () => { V.modal = "profile:me"; snd("click", 0.4); render(); });
    side.appendChild(self); mx.appendChild(side);

    const main = document.createElement("div"); main.className = "mx-main"; mx.appendChild(main);
    if (!V.sel) { main.innerHTML = `<div class="mx-empty">Выбери чат</div>`; }
    else {
      const fav = V.sel === "me", u = user(V.sel);
      const hd = document.createElement("div"); hd.className = "mx-head";
      const who = document.createElement("button"); who.type = "button"; who.className = "mx-who";
      who.appendChild(ava(fav ? "favorite_flag" : u.ava, 36, fav || u.online, true));
      const sub = fav ? "самому себе" : u.desc ? trim(u.desc, 28) : u.online ? "в сети" : "не в сети";
      who.insertAdjacentHTML("beforeend", `<span><b>${esc(fav ? "Избранное" : dname(u))}</b><i class="${fav ? "fav" : ""}">${esc(sub)}</i></span>`);
      who.addEventListener("click", () => { V.modal = "profile:" + V.sel; snd("click", 0.4); render(); });
      hd.appendChild(who);
      hd.insertAdjacentHTML("beforeend", `<div class="mx-sbox"><input class="mx-search" type="search" placeholder="Поиск..." value="${esc(V.search)}" aria-label="Поиск по чату"><span>${V.res.length ? `${V.ri + 1}/${V.res.length}` : ""}</span><button type="button" data-s="-1" aria-label="Выше">↑</button><button type="button" data-s="1" aria-label="Ниже">↓</button></div>`);
      main.appendChild(hd);
      const sb = $(".mx-search", hd);
      sb.addEventListener("input", () => { V.search = sb.value.toLowerCase(); doSearch(); render(); const s2 = $(".mx-search", mx); s2.focus(); s2.setSelectionRange(s2.value.length, s2.value.length); });
      sb.addEventListener("keydown", (e) => { if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); cycle(e.key === "ArrowUp" ? -1 : 1); } });
      $$("[data-s]", hd).forEach((b) => b.addEventListener("click", () => cycle(+b.dataset.s)));

      const ms = document.createElement("div"); ms.className = "mx-msgs"; main.appendChild(ms);
      let lastDay = "";
      conv("me", V.sel).filter(visible).forEach((m) => {
        const dl = dayLabel(m.t); if (dl !== lastDay) { lastDay = dl; ms.insertAdjacentHTML("beforeend", `<div class="mx-day">${esc(dl)}</div>`); }
        ms.appendChild(bubble(m));
      });
      ms.addEventListener("scroll", () => { const a = $(".mx-down", main); const far = ms.scrollHeight - ms.clientHeight - ms.scrollTop > 60; a.hidden = !far; });
      const down = document.createElement("button"); down.type = "button"; down.className = "mx-down"; down.hidden = true; down.textContent = "↓";
      down.addEventListener("click", () => (ms.scrollTop = ms.scrollHeight)); main.appendChild(down);

      const cp = document.createElement("div"); cp.className = "mx-comp" + (V.edit ? " edit" : "");
      let bar = "";
      if (V.edit) bar = `Режим редактирования`;
      else if (V.reply) { const r = S.msgs.find((x) => x.id === V.reply); bar = "Ответ: " + trim(r ? replyText(r) : "", 40); }
      else if (V.att) bar = "Файл: " + trim(V.att.name, 36) + " · " + fmtBytes(V.att.size);
      if (V.fwd) bar = "Пересылка: выбери чат слева";
      cp.innerHTML = (bar ? `<div class="mx-bar"><span>${esc(bar)}</span><button type="button" class="mx-bar-x" aria-label="Отмена">✕</button></div>` : "") +
        `<div class="mx-comp-row"><button type="button" class="mx-plus" aria-label="Вложение">+</button><textarea class="mx-input" rows="1" maxlength="4000" placeholder="Сообщение..." spellcheck="false"></textarea><button type="button" class="mx-send" aria-label="Отправить">➤</button></div>` +
        (V.attachMenu ? `<div class="mx-amenu"><button type="button" data-a="file">Файл</button><button type="button" data-a="gift">Подарок</button></div>` : "");
      main.appendChild(cp);
      const inp = $(".mx-input", cp); inp.value = draft; autoH(inp);
      inp.addEventListener("input", () => { V.draft = inp.value; autoH(inp); });
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } else if (e.key === "Escape") cancelBars(); });
      $(".mx-send", cp).addEventListener("click", send);
      $(".mx-plus", cp).addEventListener("click", () => { V.attachMenu = !V.attachMenu; snd("click", 0.4); render(); });
      const bx = $(".mx-bar-x", cp); if (bx) bx.addEventListener("click", cancelBars);
      $$("[data-a]", cp).forEach((b) => b.addEventListener("click", () => {
        V.attachMenu = false;
        if (b.dataset.a === "file") { status("Перетащи файл в окно игры"); fileIn.click(); }
        else { V.modal = "gift"; V.giftSlots = []; }
        render();
      }));
      if (focusIn) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
      if (focusSearch) { const s2 = $(".mx-search", mx); s2.focus(); }
      if (V.jump) { const el = $(`[data-id="${V.jump}"]`, ms); if (el) el.scrollIntoView({ block: "center" }); V.jump = 0; }
      else if (wasBottom || V.stick) ms.scrollTop = ms.scrollHeight; else ms.scrollTop = oldTop;
      V.stick = false;
    }
    const stl = document.createElement("div"); stl.className = "mx-status"; stl.textContent = V.status; mx.appendChild(stl);
    if (V.menu) mx.appendChild(menuEl());
    if (V.modal) mx.appendChild(modalEl());
    counters();
  }
  const setDraft = (v) => { V.draft = v; const i = $(".mx-input", mx); if (i) i.value = v; };
  const autoH = (t) => { t.style.height = "auto"; t.style.height = Math.min(120, t.scrollHeight) + "px"; };
  const replyText = (r) => r.deleted ? "Сообщение удалено" : r.type === "FILE" ? "Файл" : r.type === "GIFT" ? "Подарок" : r.text;
  function bubble(m) {
    const own = m.from === "me", w = document.createElement("div");
    w.className = "mx-msg" + (own ? " own" : "") + (m.deleted ? " del" : "") + (V.res[V.ri] === m.id ? " hit" : ""); w.dataset.id = m.id;
    const meta = time(m.t) + (m.edited ? " изм." : "") + (own ? (m.read ? " ✓✓" : " ✓") : "");
    let h = "";
    if (m.deleted) h = `<span class="mx-deleted">Сообщение удалено</span>`;
    else {
      if (m.fwd) h += `<div class="mx-fwd">Переслано${m.fwdName ? " от " + esc(trim(m.fwdName, 14)) : ""}</div>`;
      if (m.reply) { const r = S.msgs.find((x) => x.id === m.reply); h += `<div class="mx-rep">${esc(trim(r ? replyText(r) : "…", 24))}</div>`; }
      if (m.type === "FILE") {
        const a = m.att || { name: "file.bin", size: 0, kind: "OTHER" };
        h += `<div class="mx-ftype">${{ IMAGE: "Фото", VIDEO: "Видео", AUDIO: "Аудио" }[a.kind] || "Файл"}</div>`;
        if (a.kind === "IMAGE" && a.preview) h += `<img class="mx-prev" src="${a.preview}" alt="" width="${a.pw}" height="${a.ph}">`;
        h += `<div class="mx-fname">${esc(trim(a.name, 20))}</div><div class="mx-fsize">${fmtBytes(a.size)}</div>`;
        h += `<button type="button" class="mx-fdl" data-dl="${m.att && m.att.key || ""}" aria-label="Скачать">↓</button>`;
        if (m.text) h += `<div class="mx-txt">${esc(m.text)}</div>`;
      } else if (m.type === "GIFT") {
        const g = S.gifts[m.gift];
        h += `<div class="mx-ftype">Подарок</div>`;
        if (g) {
          h += `<div class="mx-gslots">${g.stacks.slice(0, 4).map((s) => `<span class="mx-gs"><img src="${I(s.id)}" alt="${esc(ITEMS[s.id] || s.id)}" title="${esc(ITEMS[s.id] || s.id)}">${s.n > 1 ? `<b>${s.n}</b>` : ""}</span>`).join("")}</div>`;
          h += `<div class="mx-gstate">${{ ACCEPTED: "Принято", REJECTED: "Отклонено", FAILED: "Ошибка" }[g.state] || "Ожидает"}</div>`;
          if (g.to === "me" && m.to === "me" && !m.fwd && (g.state === "PENDING" || g.state === "FAILED")) h += `<div class="mx-gbtn"><button type="button" data-g="1" aria-label="Принять">✓</button><button type="button" data-g="0" aria-label="Отклонить">✕</button></div>`;
        }
        if (m.text) h += `<div class="mx-txt">${esc(m.text)}</div>`;
      } else h += `<div class="mx-txt">${esc(m.text)}</div>`;
    }
    w.innerHTML = `<div class="mx-bub">${h}</div><div class="mx-meta">${esc(meta)}</div>`;
    const bub = $(".mx-bub", w);
    bub.addEventListener("contextmenu", (e) => { e.preventDefault(); openMenu(m, e); });
    let lp = 0; bub.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") lp = setTimeout(() => openMenu(m, e), 480); });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => bub.addEventListener(ev, () => clearTimeout(lp)));
    $$("[data-g]", w).forEach((b) => b.addEventListener("click", () => giftRespond(S.gifts[m.gift], b.dataset.g === "1", "me")));
    const dl = $(".mx-fdl", w); if (dl) dl.addEventListener("click", () => {
      const f = files[dl.dataset.dl]; snd("click", 0.4);
      if (!f) return status("Скачиваю файл..."), setTimeout(() => status("Ошибка: файл не найден на сервере"), 900);
      const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      status("Файл сохранён в Downloads/MAX");
    });
    const im = $(".mx-prev", w); if (im) im.addEventListener("click", () => { V.modal = "img:" + m.id; render(); });
    return w;
  }
  function openMenu(m, e) {
    const r = mx.getBoundingClientRect(); snd("click", 0.35);
    V.menu = { id: m.id, x: clamp(e.clientX - r.left, 6, r.width - 150), y: clamp(e.clientY - r.top, 6, r.height - 140) }; render();
  }
  function menuEl() {
    const m = S.msgs.find((x) => x.id === V.menu.id); const acts = ["REPLY", "FORWARD"];
    if (m.from === "me" && m.type === "TEXT" && !m.deleted) acts.unshift("EDIT", "DELETE"); else if (m.from === "me") acts.unshift("DELETE");
    const L = { DELETE: "Удалить", EDIT: "Изменить", REPLY: "Ответить", FORWARD: "Переслать" };
    const el = document.createElement("div"); el.className = "mx-menu"; el.style.left = V.menu.x + "px"; el.style.top = V.menu.y + "px";
    el.innerHTML = acts.map((a) => `<button type="button" data-m="${a}">${L[a]}</button>`).join("");
    $$("button", el).forEach((b) => b.addEventListener("click", (ev) => { ev.stopPropagation(); action(b.dataset.m, m); }));
    return el;
  }
  function action(a, m) {
    V.menu = null; snd("click", 0.45);
    if (a === "REPLY") { V.reply = m.id; V.edit = 0; V.fwd = 0; }
    if (a === "EDIT") { V.edit = m.id; V.reply = 0; setDraft(m.text); }
    if (a === "FORWARD") { V.fwd = m.id; status("Выбери чат слева для пересылки"); }
    if (a === "DELETE") {
      if (m.deleted || m.from !== "me") return render();
      const selfChat = m.from === m.to; m.deleted = true; m.hs = true; m.hr = selfChat; m.edited = false; if (selfChat) m.text = "";
      save(); status("Сообщение удалено");
    }
    render(); const inp = $(".mx-input", mx); if (inp && a !== "FORWARD") inp.focus();
  }
  function cancelBars() { if (V.edit) setDraft(""); V.reply = 0; V.edit = 0; V.fwd = 0; V.att = null; render(); }
  function openChat(id) {
    if (V.fwd) { // пересылка: сырой текст, тип, вложение и подарок копируются
      const src = S.msgs.find((x) => x.id === V.fwd); V.fwd = 0;
      if (src) { serverSend("me", id, src.text, { raw: true, fwd: true, fwdName: dname(user(src.from)), type: src.type, att: src.att ? Object.assign({}, src.att) : undefined, gift: src.gift }); status("Сообщение переслано"); snd("pop", 0.5); botAct(id); }
    }
    V.sel = id; V.search = ""; V.res = []; V.ri = -1; V.menu = null; V.stick = true;
    S.msgs.forEach((m) => { if (m.from === id && m.to === "me") m.read = true; }); save(); snd("click", 0.4); render();
  }
  function send() {
    const inp = $(".mx-input", mx); const raw = (inp ? inp.value : V.draft).replace(/\r/g, ""); const t = raw.trim();
    if (V.edit) {
      const m = S.msgs.find((x) => x.id === V.edit);
      if (t && m && !m.deleted && m.from === "me" && m.type === "TEXT") { m.text = censor(t).text.slice(0, 4000); m.edited = true; status("Сообщение изменено"); snd("pop", 0.4, 1.2); }
      V.edit = 0; setDraft(""); save(); render(); return;
    }
    if (V.att) {
      const a = V.att, rep = V.reply; V.att = null; V.reply = 0; setDraft("");
      upload(a, () => { serverSend("me", V.sel, t.slice(0, 4000), { type: "FILE", att: a, reply: rep }); status("Файл отправлен"); snd("pop", 0.5); render(); botAct(V.sel); });
      render(); return;
    }
    if (!t) return;
    serverSend("me", V.sel, raw.trim().slice(0, 4000), { reply: V.reply }); V.reply = 0; setDraft(""); snd("pop", 0.45, 1.1); render(); botAct(V.sel);
  }
  function doSearch() {
    V.res = []; V.ri = -1; if (!V.search || !V.sel) return;
    conv("me", V.sel).filter(visible).forEach((m) => { if (!m.deleted && m.type === "TEXT" && m.text.toLowerCase().includes(V.search)) V.res.push(m.id); });
    if (V.res.length) { V.ri = V.res.length - 1; V.jump = V.res[V.ri]; }
  }
  function cycle(d) { if (!V.res.length) return; V.ri = (V.ri + d + V.res.length) % V.res.length; V.jump = V.res[V.ri]; snd("click", 0.3); render(); }

  /* --- вложения --- */
  const kindOf = (name, mime) => { const n = name.toLowerCase(), m = (mime || "").toLowerCase();
    if (m.startsWith("image/") || /\.(png|jpe?g|bmp|gif|webp)$/.test(n)) return "IMAGE";
    if (m.startsWith("video/") || /\.(mp4|webm|mov|mkv|avi)$/.test(n)) return "VIDEO";
    if (m.startsWith("audio/") || /\.(mp3|ogg|wav|flac|m4a)$/.test(n)) return "AUDIO"; return "OTHER"; };
  function makePreview(file, cb) { // buildAttachmentPreviewBytes: вписать в 160×120
    if (kindOf(file.name, file.type) !== "IMAGE") return cb(null);
    const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => {
      const sc = Math.min(160 / im.width, 120 / im.height), w = Math.max(1, Math.round(im.width * sc)), h = Math.max(1, Math.round(im.height * sc));
      const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(im, 0, 0, w, h); cb({ url: c.toDataURL("image/png"), w, h });
    }; im.onerror = () => cb(null); im.src = fr.result; }; fr.readAsDataURL(file);
  }
  function takeFile(file) {
    if (!file) return; if (!file.size) return status("Пустой файл");
    status("Обрабатываю файл...");
    makePreview(file, (p) => {
      const key = "f" + Date.now(); files[key] = file;
      V.att = { key, name: file.name, size: file.size, kind: kindOf(file.name, file.type), preview: p && p.url, pw: p && p.w, ph: p && p.h };
      status("Файл прикреплён"); snd("paper", 0.5); render();
    });
  }
  const fileIn = document.createElement("input"); fileIn.type = "file"; fileIn.hidden = true; document.body.appendChild(fileIn);
  fileIn.addEventListener("change", () => { if (V.modal === "register" || V.modal === "profile-edit") avatarFile(fileIn.files[0]); else takeFile(fileIn.files[0]); fileIn.value = ""; });
  mx.addEventListener("dragover", (e) => { e.preventDefault(); mx.classList.add("drag"); });
  mx.addEventListener("dragleave", () => mx.classList.remove("drag"));
  mx.addEventListener("drop", (e) => { e.preventDefault(); mx.classList.remove("drag"); const f = e.dataTransfer.files[0]; if (!f) return;
    if (V.modal === "register" || V.modal === "profile-edit") avatarFile(f); else if (V.sel) takeFile(f); else status("Выбери чат"); });
  function upload(a, done) {
    const box = document.createElement("div"); box.className = "mx-xfer"; mx.appendChild(box);
    const chunks = Math.max(1, Math.ceil(a.size / (30 * 1024))); let i = 0; const step = Math.max(1, Math.ceil(chunks / 40));
    status("Файл отправляется...");
    const iv = setInterval(() => {
      i = Math.min(chunks, i + step); const p = Math.round(i / chunks * 100);
      box.innerHTML = `<b>Отправка файла</b><span>${p}%</span><i><em style="width:${p}%"></em></i><small>${esc(trim(a.name, 22))} · чанк ${i}/${chunks}</small>`;
      if (i >= chunks) { clearInterval(iv); box.classList.add("ok"); setTimeout(() => box.remove(), 900); done(); }
    }, 45);
  }

  /* --- модалки --- */
  function modalEl() {
    const wrap = document.createElement("div"); wrap.className = "mx-dim";
    const box = document.createElement("div"); box.className = "mx-modal"; wrap.appendChild(box);
    const kind = V.modal;
    if (kind === "register" || kind === "profile-edit") {
      const reg = kind === "register"; const F = V.form || (V.form = { name: S.me.name || S.me.base, desc: S.me.desc, ava: S.me.ava, show: S.me.show });
      box.classList.add("reg");
      box.innerHTML = `<div class="mx-mh"><b>${reg ? "Регистрация MAX" : "Профиль MAX"}</b><span>${reg ? "выбери аву и подпиши поля" : "измени профиль"}</span></div>
        <div class="mx-reg"><div class="mx-reg-l"><div class="mx-lbl">Аватарка</div><div class="mx-avapick"></div><div class="mx-lbl">Превью</div><div class="mx-avaprev"></div></div>
        <div class="mx-reg-r"><label class="mx-lbl" for="mxName">Ник</label><input id="mxName" class="mx-field" maxlength="24" value="${esc(F.name)}" placeholder="Впиши ник">
        <label class="mx-lbl" for="mxDesc">Описание</label><input id="mxDesc" class="mx-field" maxlength="120" value="${esc(F.desc)}">
        <div class="mx-lbl">Витрина</div><button type="button" class="mx-show"><span class="mx-slotbox">${F.show ? `<img src="${I(F.show)}" alt="">` : ""}</span><i>${esc(F.show ? ITEMS[F.show] : "нажми и выбери")}</i></button>
        <div class="mx-hint">кликни по слоту и выбери из инвентаря</div></div></div>
        <div class="mx-mf"><button type="button" class="mx-b ok" data-x="save">Сохранить</button>${reg ? "" : `<button type="button" class="mx-b" data-x="back">Назад</button>`}</div>`;
      const ap = $(".mx-avapick", box);
      ["stock_steve", "stock_alex", "stock_smile", "stock_cat", "stock_skull"].forEach((id) => { const b = document.createElement("button"); b.type = "button"; b.className = "mx-at" + (F.ava === id ? " on" : ""); b.appendChild(ava(id, 44, false, false)); b.setAttribute("aria-label", id); b.addEventListener("click", () => { F.ava = id; snd("click", 0.4); render(); }); ap.appendChild(b); });
      const up = document.createElement("button"); up.type = "button"; up.className = "mx-at up" + (F.ava.startsWith("image:") ? " on" : ""); up.innerHTML = F.ava.startsWith("image:") ? "" : "<b>+</b>"; if (F.ava.startsWith("image:")) up.appendChild(ava(F.ava, 44, false, false));
      up.insertAdjacentHTML("beforeend", "<small>с компа</small>"); up.addEventListener("click", () => { status("Перетащи PNG/JPG/BMP прямо в окно игры"); fileIn.accept = "image/*"; fileIn.click(); fileIn.accept = ""; }); ap.appendChild(up);
      $(".mx-avaprev", box).appendChild(ava(F.ava, 116, true, false));
      $("#mxName", box).addEventListener("input", (e) => (F.name = e.target.value));
      $("#mxDesc", box).addEventListener("input", (e) => (F.desc = e.target.value));
      $(".mx-show", box).addEventListener("click", () => { V.modal = "picker"; V.back = kind; render(); });
      box.querySelector('[data-x="save"]').addEventListener("click", () => {
        const norm = (v, n, fb) => { v = String(v || "").trim().replace(/\s+/g, " ").slice(0, n); return v || fb; };
        S.me.name = norm(F.name, 24, S.me.base); S.me.desc = norm(F.desc, 120, ""); S.me.ava = F.ava; S.me.show = F.show; S.me.reg = true; V.form = null; V.modal = null;
        save(); status("Профиль сохранён"); snd("levelup", 0.3, 1.6); if (!V.sel) V.sel = null; render();
      });
      const bk = box.querySelector('[data-x="back"]'); if (bk) bk.addEventListener("click", () => { V.form = null; V.modal = null; render(); });
    } else if (kind === "crop") {
      const C = V.crop; box.classList.add("crop");
      box.innerHTML = `<div class="mx-mh"><b>Обрезка аватарки</b><span>Колёсико — менять размер, мышью — двигать</span></div><div class="mx-crop"><img src="${C.url}" alt=""><i class="mx-cropbox"></i></div>
        <input type="range" class="mx-range" min="8" max="100" value="${C.s}" aria-label="Размер квадрата"><div class="mx-mf"><button type="button" class="mx-b ok" data-x="apply">Обрезать</button><button type="button" class="mx-b" data-x="cancel">Отмена</button></div>`;
      const area = $(".mx-crop", box), cb = $(".mx-cropbox", box), im = $("img", area);
      const place = () => { const r = im.getBoundingClientRect(), ar = area.getBoundingClientRect(); const side = Math.min(r.width, r.height) * C.s / 100;
        C.x = clamp(C.x, 0, r.width - side); C.y = clamp(C.y, 0, r.height - side);
        Object.assign(cb.style, { left: r.left - ar.left + C.x + "px", top: r.top - ar.top + C.y + "px", width: side + "px", height: side + "px" }); C.side = side; C.iw = r.width; };
      im.addEventListener("load", place); requestAnimationFrame(place);
      $(".mx-range", box).addEventListener("input", (e) => { C.s = +e.target.value; place(); });
      area.addEventListener("wheel", (e) => { e.preventDefault(); C.s = clamp(C.s - Math.sign(e.deltaY) * 5, 8, 100); $(".mx-range", box).value = C.s; place(); }, { passive: false });
      let dr = null;
      cb.addEventListener("pointerdown", (e) => { dr = { x: e.clientX, y: e.clientY, cx: C.x, cy: C.y }; try { cb.setPointerCapture(e.pointerId); } catch (_) {} });
      cb.addEventListener("pointermove", (e) => { if (!dr) return; C.x = dr.cx + e.clientX - dr.x; C.y = dr.cy + e.clientY - dr.y; place(); });
      cb.addEventListener("pointerup", () => (dr = null));
      box.querySelector('[data-x="apply"]').addEventListener("click", () => {
        const sc = C.img.width / C.iw; const sx = Math.round(C.x * sc), sy = Math.round(C.y * sc), ss = clamp(Math.round(C.side * sc), 8, Math.min(C.img.width - sx, C.img.height - sy));
        const id = encodeAvatar(C.img, sx, sy, ss).id;
        if (id) { V.form.ava = id; status("Аватарка обрезана, теперь сохрани профиль"); } else status("Подвинь квадрат и нажми Обрезать");
        V.modal = C.back; V.crop = null; render();
      });
      box.querySelector('[data-x="cancel"]').addEventListener("click", () => { V.modal = C.back; V.crop = null; status("Обрезка отменена"); render(); });
    } else if (kind === "picker") {
      box.innerHTML = `<div class="mx-mh"><b>Выбери трофей</b><span>кликни по слоту</span></div><div class="mx-pick"></div><div class="mx-mf"><button type="button" class="mx-b" data-x="clr">Очистить трофей</button><button type="button" class="mx-b" data-x="back">Назад</button></div>`;
      const pk = $(".mx-pick", box);
      Object.keys(S.me.inv).concat(["max_messenger", "diamond", "totem_of_undying", "netherite_ingot", "golden_apple", "writable_book"]).filter((v, i, a) => a.indexOf(v) === i).forEach((id) => {
        const b = document.createElement("button"); b.type = "button"; b.className = "mx-pslot"; b.title = ITEMS[id] || id; b.innerHTML = `<img src="${I(id)}" alt="${esc(ITEMS[id] || id)}">`;
        b.addEventListener("click", () => { V.form.show = id; V.modal = V.back; status("Трофей выбран"); snd("click", 0.4); render(); }); pk.appendChild(b);
      });
      box.querySelector('[data-x="clr"]').addEventListener("click", () => { V.form.show = ""; V.modal = V.back; status("Трофей очищен"); render(); });
      box.querySelector('[data-x="back"]').addEventListener("click", () => { V.modal = V.back; render(); });
    } else if (kind.startsWith("profile:")) {
      const id = kind.slice(8), p = user(id) || S.me, self = id === "me";
      box.classList.add("prof");
      box.innerHTML = `<div class="mx-mh"><b>Профиль</b><span>${self ? "это ты" : p.online ? "в сети" : "не в сети"}</span></div><div class="mx-pv"><div class="mx-pv-a"></div><div class="mx-pv-t">
        <div class="mx-lbl2">Ник</div><div>${esc(dname(p))}</div><div class="mx-lbl2">Логин</div><div>${esc(trim(p.base, 24))}</div><div class="mx-lbl2">Описание</div><div class="mx-pv-d">${esc(p.desc || "Описание пока пустое")}</div></div></div>
        <div class="mx-lbl2 pad">Витрина</div><div class="mx-pv-show"><span class="mx-slotbox">${p.show ? `<img src="${I(p.show)}" alt="">` : ""}</span>${esc(p.show ? ITEMS[p.show] : "Пусто")}</div>
        <div class="mx-lbl2 pad">UUID <span class="mx-uuid">${self ? "3f2a…c91e" : { b1: "9b1d…04aa", b2: "c7e0…5f12", b3: "12ab…e77d", b4: "e4f3…0b9c" }[id] || "…"}</span></div>
        <div class="mx-mf">${self ? `<button type="button" class="mx-b ok" data-x="edit">Изменить</button>` : ""}<button type="button" class="mx-b" data-x="back">Назад</button></div>`;
      $(".mx-pv-a", box).appendChild(ava(self ? S.me.ava : p.ava, 108, self || p.online, false));
      const ed = box.querySelector('[data-x="edit"]'); if (ed) ed.addEventListener("click", () => { V.modal = "profile-edit"; V.form = null; render(); });
      box.querySelector('[data-x="back"]').addEventListener("click", () => { V.modal = null; render(); });
    } else if (kind === "gift") {
      box.classList.add("gift");
      box.innerHTML = `<div class="mx-mh"><b>Отправить подарок</b><span>до 4 слотов · вещи уйдут на сервер сразу</span></div><div class="mx-g4"></div><div class="mx-ginv"></div>
        <div class="mx-mf"><button type="button" class="mx-b ok" data-x="send">Отправить</button><button type="button" class="mx-b no" data-x="cancel">Отмена</button></div>`;
      const g4 = $(".mx-g4", box), gi = $(".mx-ginv", box);
      for (let k = 0; k < 4; k++) { const s = V.giftSlots[k]; const b = document.createElement("button"); b.type = "button"; b.className = "mx-pslot big";
        b.innerHTML = s ? `<img src="${I(s.id)}" alt="${esc(ITEMS[s.id])}"><b>${s.n > 1 ? s.n : ""}</b>` : ""; b.addEventListener("click", () => { if (s) { V.giftSlots.splice(k, 1); snd("click", 0.3); render(); } }); g4.appendChild(b); }
      const left = Object.assign({}, S.me.inv); V.giftSlots.forEach((s) => (left[s.id] -= s.n));
      Object.entries(left).forEach(([id, n]) => { const b = document.createElement("button"); b.type = "button"; b.className = "mx-pslot" + (n <= 0 ? " off" : ""); b.title = ITEMS[id] || id;
        b.innerHTML = `<img src="${I(id)}" alt="${esc(ITEMS[id] || id)}"><b>${n > 1 ? n : ""}</b>`;
        b.addEventListener("click", () => { if (n <= 0) return; if (V.giftSlots.length >= 4) return status("Все 4 слота заняты"); V.giftSlots.push({ id, n }); snd("click", 0.4); render(); }); gi.appendChild(b); });
      box.querySelector('[data-x="send"]').addEventListener("click", () => {
        if (!V.giftSlots.length) return status("Пусто");
        const stacks = V.giftSlots.slice(); stacks.forEach((s) => { S.me.inv[s.id] -= s.n; if (S.me.inv[s.id] <= 0) delete S.me.inv[s.id]; });
        const gid = "g" + S.next, to = V.sel; S.gifts[gid] = { from: "me", to, stacks, state: "PENDING" };
        const t = (V.draft || "").trim(); setDraft(""); serverSend("me", to, t, { type: "GIFT", gift: gid, reply: V.reply }); V.reply = 0; V.modal = null; V.giftSlots = [];
        status("Подарок отправлен"); snd("echest", 0.4); render(); botAct(to);
        const b = user(to); if (to !== "me" && b.online) setTimeout(() => giftRespond(S.gifts[gid], Math.random() < 0.7, to), 3000);
      });
      box.querySelector('[data-x="cancel"]').addEventListener("click", () => { V.modal = null; render(); });
    } else if (kind.startsWith("img:")) {
      const m = S.msgs.find((x) => x.id === +kind.slice(4)); wrap.classList.add("img");
      box.innerHTML = `<img src="${m.att.preview}" alt=""><span>Клик мышкой — отмена</span>`;
      wrap.addEventListener("click", () => { V.modal = null; render(); });
    }
    return wrap;
  }
  function avatarFile(file) {
    if (!file) return; status("Обрабатываю аватарку...");
    const fr = new FileReader(); fr.onload = () => { const im = new Image();
      im.onload = () => { V.crop = { img: im, url: fr.result, x: 0, y: 0, s: 100, back: V.modal }; V.modal = "crop"; status("Подвинь квадрат и нажми Обрезать"); render(); };
      im.onerror = () => status("Не удалось прочитать картинку"); im.src = fr.result; }; fr.readAsDataURL(file);
  }
  function encodeAvatar(img, sx, sy, ss) { // buildImageAvatarId: 192, 160, 128, 96, 80, 64 — первый, где base64 < 30000
    const tries = [];
    for (const t of [192, 160, 128, 96, 80, 64]) {
      const c = document.createElement("canvas"); c.width = c.height = t; const g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(img, sx, sy, ss, ss, 0, 0, t, t);
      const b = c.toDataURL("image/png").split(",")[1]; tries.push([t, b.length]); if (b.length < 30000) return { id: "image:" + b, tries };
    }
    return { id: null, tries };
  }
  document.addEventListener("pointerdown", (e) => { if (V.menu && !e.target.closest(".mx-menu")) { V.menu = null; render(); } if (V.attachMenu && !e.target.closest(".mx-amenu,.mx-plus")) { V.attachMenu = false; render(); } });
  $("#botGift").addEventListener("click", () => { if (!S.me.reg) return K.say("Сначала зарегистрируйся в MAX", true); botGift(); });
  $("#spam").addEventListener("click", () => { if (!S.me.reg) return K.say("Сначала зарегистрируйся в MAX", true); const to = V.sel || "me"; for (let i = 0; i < 10; i++) serverSend("me", to, pick(["ок", "привет", "спс", "хз", "круто", "норм", "пока", "окей"])); snd("pop", 0.5); if (!V.sel) V.sel = to; V.stick = true; render(); });
  $("#mxReset").addEventListener("click", () => { S = seed(); V.sel = null; V.modal = null; V.form = null; save(); snd("no", 0.4); render(); });
  render();
  setInterval(() => { if (Math.random() < 0.35 && S.me.reg && document.visibilityState === "visible" && isVis(mx)) { const b = pick(S.users.filter((u) => u.online)); serverSend(b.id, "me", pick(["привет", "ты тут?", "го на спавн", "кто взорвал мой дом", "окей", "хорошо", "иди сюда"]), { read: V.sel === b.id }); snd("pling", 0.35, 1.2); render(); } }, 20000);
  function isVis(el) { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }

  /* ================= 03 АНТИЦЕНЗУРА: переводчик и словарь ================= */
  (function cz() {
    const inp = $("#czIn"), out = $("#czOut"), steps = $("#czSteps");
    const run = () => { const r = censor(inp.value); out.innerHTML = censorHtml(r) || "<span class=\"mx-small\">пусто</span>";
      steps.innerHTML = r.hits.length ? r.hits.map(([k, a, b]) => `<span><em>${k}</em>${esc(a)} → <b>${esc(b)}</b></span>`).join("") : `<span class="mx-small">ничего не заменено</span>`; };
    inp.addEventListener("input", run); run();
    const ex = ["Привет, как дела?", "Что делаешь?", "Я думаю, это хорошо", "Подожди ка секунду", "ОКЕЙ, ПОКА", "Не знаю, интересно?", "Мне кажется, тут лучше, чем там", "Мой брат построил дом", "Спасибо, спс, пж", "Люблю котлеты и пиво"];
    $("#czChips").innerHTML = ex.map((t) => `<button type="button">${esc(t)}</button>`).join("");
    $$("#czChips button").forEach((b) => b.addEventListener("click", () => { inp.value = b.textContent; run(); snd("click", 0.4); }));
    const T = DICT.total; $("#dictQ").textContent = `${T[0]} фраз · ${T[1]} словоформ`;
    const tabs = [["ph", "Фразы"], ["w", "Слова"], ["dead", "Мёртвые"]]; let tab = "ph";
    $("#czTabs").innerHTML = tabs.map(([k, n]) => `<button type="button" role="tab" data-t="${k}">${n}</button>`).join("");
    const list = () => {
      $$("#czTabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.t === tab));
      const q = $("#czFind").value.trim().toLowerCase();
      let rows = tab === "ph" ? DICT.ph : tab === "w" ? Object.entries(W) : DICT.dead.map((k) => [k, "никогда не сработает"]);
      if (q) rows = rows.filter(([a, b]) => a.includes(q) || b.includes(q));
      $("#czList").innerHTML = rows.slice(0, 400).map(([a, b], i) => `<div><span>${tab === "ph" ? `<i>${i + 1}</i>` : ""}${esc(a)}</span><b>${esc(b)}</b></div>`).join("") || `<p class="mx-small">ничего</p>`;
      $("#czNote").textContent = tab === "ph" ? "Фразы идут строго по порядку, и каждая следующая ищется уже в изменённом тексте." : tab === "w" ? "Слово ищется целиком, без учёта регистра. Формы склонений мод генерирует сам из корня и списка окончаний." : "Ключи с пробелом, дефисом или знаком вопроса лежат в словаре слов, а слова ищутся регуляркой \\p{L}+. Такой ключ не совпадёт никогда.";
    };
    $$("#czTabs button").forEach((b) => b.addEventListener("click", () => { tab = b.dataset.t; list(); snd("click", 0.3); }));
    $("#czFind").addEventListener("input", list); list();
    $("#czPipe").innerHTML = [
      ["1", "Фразы", "Все фразы по очереди, с границами слов. «подожди» стоит раньше «подожди ка», поэтому вторая фраза не срабатывает никогда: к её ходу текст уже «стой сука ка»."],
      ["2", "Слова", "Потом каждое слово целиком сверяется со словарём. Замены из первого шага тоже попадают под раздачу: «что делаешь» → «что хуй делаешь» → «что хуй сосёшь»."],
      ["3", "Регистр", "Капс остаётся капсом, заглавная — заглавной: «ПРИВЕТ» → «САЛАМ», «Хорошо» → «Плохо»."],
      ["4", "Первый победил", "Словарь заполняется через putIfAbsent: у «хорошая» сначала записалось «пиздатая» из прилагательных, поэтому точное «плохая» ниже уже не встанет."],
    ].map(([n, t, d]) => `<div class="mx-pipe-c"><i>${n}</i><b>${t}</b><p>${esc(d)}</p></div>`).join("");
  })();

  /* ================= 04 ПОДАРКИ: наглядный эскроу ================= */
  (function giftSim() {
    $("#gFlow").innerHTML = [["Отправка", "до 4 стаков из основного инвентаря, та же NBT", "i"], ["Эскроу", "вещи уже списаны и лежат на сервере", "e"], ["Ожидает", "получатель видит ✓ и ✕ прямо в пузыре", "p"],
      ["Принято", "всё в инвентарь получателя, лишнее под ноги, +1 сделка обоим", "a"], ["Отклонено", "возврат отправителю, +1 отказ тому, кто нажал ✕", "r"]]
      .map(([t, d, c]) => `<div class="mx-fl ${c}"><b>${t}</b><span>${d}</span></div>`).join("<i class=\"mx-fl-ar\">→</i>");
    const A = { diamond: 5, bread: 12, golden_apple: 2, tnt: 8, iron_ingot: 20 }, Bi = { stick: 3 };
    let esc_ = [], state = "none", online = true, deleted = false, pendingRefund = false;
    const inv = (el, who, items, click) => { el.innerHTML = `<h3>${who}</h3><div class="mx-ginv2">${Object.entries(items).filter(([, n]) => n > 0).map(([id, n]) => `<button type="button" class="mx-pslot" data-id="${id}" title="${esc(ITEMS[id])}"><img src="${I(id)}" alt="${esc(ITEMS[id])}"><b>${n > 1 ? n : ""}</b></button>`).join("") || "<span class=\"mx-small\">пусто</span>"}</div>`;
      if (click) $$("[data-id]", el).forEach((b) => b.addEventListener("click", () => click(b.dataset.id))); };
    let draft = [];
    const draw = () => {
      inv($("#gpA"), "Ты" + (online ? "" : " · не в сети"), A, state === "none" || state === "done" ? (id) => { if (draft.length >= 4) return note("Все 4 слота заняты"); if (draft.find((d) => d.id === id)) return; draft.push({ id, n: A[id] }); snd("click", 0.4); draw(); } : null);
      inv($("#gpB"), "Друг", Bi);
      const list = state === "none" || state === "done" ? draft : esc_;
      $("#escrowSlots").innerHTML = Array.from({ length: 4 }, (_, i) => { const s = list[i]; return `<span class="mx-pslot${state === "none" || state === "done" ? " ghost" : ""}">${s ? `<img src="${I(s.id)}" alt=""><b>${s.n > 1 ? s.n : ""}</b>` : ""}</span>`; }).join("");
      $("#escrowState").textContent = { none: draft.length ? "черновик" : "пусто", pending: deleted ? "Ожидает · сообщение удалено" : "Ожидает", done: "пусто" }[state];
      $("#escrow").className = "mx-escrow " + state + (deleted ? " dead" : "");
      $("#gOff").textContent = "Отправитель: " + (online ? "в сети" : "не в сети");
      $("#gAcc").disabled = $("#gRej").disabled = state !== "pending" || deleted; $("#gDel").disabled = state !== "pending" || deleted; $("#gSend").disabled = state === "pending" || !draft.length;
    };
    const note = (t) => { $("#gNote").textContent = t; };
    $("#gSend").addEventListener("click", () => { esc_ = draft; draft.forEach((d) => (A[d.id] -= d.n)); draft = []; state = "pending"; deleted = false; snd("echest", 0.45); note("Вещи списаны и лежат на сервере. Теперь решает друг."); draw(); });
    $("#gAcc").addEventListener("click", () => { esc_.forEach((d) => (Bi[d.id] = (Bi[d.id] || 0) + d.n)); esc_ = []; state = "done"; snd("chest", 0.5); note("Принято: вещи у друга. Обоим +1 к счётчику сделок" + (online ? "." : ", но ачивку на пятой сделке ты не получишь: в этот момент тебя не было в сети.")); draw(); });
    $("#gRej").addEventListener("click", () => { state = "done";
      if (online) { esc_.forEach((d) => (A[d.id] += d.n)); esc_ = []; note("Отклонено: всё вернулось тебе. Другу +1 к отказам."); snd("no", 0.45); }
      else { pendingRefund = esc_; esc_ = []; note("Отклонено, но тебя нет в сети. Возврат будет при входе отправителя."); snd("no", 0.45); }
      draw(); });
    $("#gOff").addEventListener("click", () => { online = !online; snd("click", 0.4);
      if (online && pendingRefund) { pendingRefund.forEach((d) => (A[d.id] += d.n)); pendingRefund = false; note("Ты зашёл в мир: отложенный возврат упал в инвентарь."); snd("pop", 0.5); }
      draw(); });
    $("#gDel").addEventListener("click", () => { deleted = true; snd("paper", 0.5); note("Сообщение с подарком удалено. У друга вместо пузыря «Сообщение удалено» без кнопок, а вещи так и висят в эскроу. Навсегда."); draw(); });
    draw();
  })();

  /* ================= 05 ФАЙЛЫ ================= */
  (function filesSim() {
    const dz = $("#dz"), inp = $("#dzIn");
    const show = (file) => {
      const kind = kindOf(file.name, file.type), chunks = Math.max(1, Math.ceil(file.size / 30720));
      $("#fxBubble").innerHTML = `<div class="mx-ftype">${{ IMAGE: "Фото", VIDEO: "Видео", AUDIO: "Аудио" }[kind] || "Файл"}</div><div class="mx-prevbox"></div><div class="mx-fname">${esc(trim(file.name, 20))}</div><div class="mx-fsize">${fmtBytes(file.size)}</div>`;
      makePreview(file, (p) => { if (p) $(".mx-prevbox").innerHTML = `<img src="${p.url}" width="${p.w}" height="${p.h}" alt="">`; });
      const n = Math.min(chunks, 120); $("#fxChunks").innerHTML = Array.from({ length: n }, () => "<i></i>").join("") + (chunks > n ? `<span>+${chunks - n}</span>` : "");
      let i = 0; const cs = $$("#fxChunks i"); snd("paper", 0.5);
      const iv = setInterval(() => { i++; const p = Math.min(100, Math.round(i / n * 100)); $("#fxBar").style.width = p + "%"; if (cs[i - 1]) cs[i - 1].classList.add("on");
        $("#fxT").textContent = `Отправка файла · ${p}% · ${chunks} чанк${chunks % 10 === 1 && chunks % 100 !== 11 ? "" : chunks % 10 >= 2 && chunks % 10 <= 4 && (chunks % 100 < 10 || chunks % 100 >= 20) ? "а" : "ов"} по 30 КБ`;
        if (i >= n) { clearInterval(iv); $("#fxT").textContent += " · Файл отправлен"; snd("pop", 0.5); } }, 30);
    };
    dz.addEventListener("click", (e) => { if (e.target !== inp) inp.click(); });
    inp.addEventListener("change", () => inp.files[0] && show(inp.files[0]));
    dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("on"); });
    dz.addEventListener("dragleave", () => dz.classList.remove("on"));
    dz.addEventListener("drop", (e) => { e.preventDefault(); dz.classList.remove("on"); if (e.dataTransfer.files[0]) show(e.dataTransfer.files[0]); });
    dz.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inp.click(); } });
    // хранилище 500 МБ: чистка самых старых по дате изменения
    let st = [["скрин_базы.png", 3], ["трек.ogg", 9], ["видос_с_криперами.mp4", 180], ["мод.jar", 40]], k = 1;
    const drawSt = (gone) => { const tot = st.reduce((s, x) => s + x[1], 0); const hue = ["#3c89ff", "#8a5cff", "#2ecc71", "#e0a030", "#e05a8a", "#35c6d8"];
      $("#stBar").innerHTML = st.map((x, i) => `<i style="width:${x[1] / 500 * 100}%;background:${hue[i % hue.length]}" title="${esc(x[0])} · ${x[1]} МБ"></i>`).join("");
      $("#stT").innerHTML = `${tot} / 500 МБ · файлов: ${st.length}` + (gone && gone.length ? `<br><span class="bad">удалены самые старые: ${gone.map(esc).join(", ")}</span>` : ""); };
    $("#stAdd").addEventListener("click", () => { st.push([`загрузка_${k++}.bin`, 120]); const gone = []; let tot = st.reduce((s, x) => s + x[1], 0);
      while (tot > 500) { const x = st.shift(); tot -= x[1]; gone.push(x[0]); } snd(gone.length ? "no" : "pop", 0.4); drawSt(gone); });
    $("#stClr").addEventListener("click", () => { st = []; drawSt(); snd("click", 0.4); });
    drawSt();
    K.dl($("#fileDl"), [
      ["Размер", "без ограничения, режется на чанки по 30 КБ"],
      ["Типы", "Фото, Видео, Аудио — по MIME или расширению, остальное «Файл»"],
      ["Превью", "только у картинок, вписано в 160×120"],
      ["Хранилище", "500 МБ на мир; при переполнении удаляются самые старые"],
      ["Где на сервере", "<code>world/zitraksmode/max_attachments/&lt;uuid&gt;.bin</code>"],
      ["Скачать «↓»", "в <code>~/Downloads/MAX</code>, а если папки Downloads нет — в <code>.minecraft/zitraksmode/max_downloads</code>"],
      ["Совпадение имён", "файл.png → файл (1).png → файл (2).png"],
      ["Запрещённые символы", "\\ / : * ? \" &lt; &gt; | меняются на _"],
    ]);
  })();

  /* ================= 06 ПРОФИЛЬ ================= */
  (function profile() {
    const box = $("#avas");
    [["stock_steve", "Стив", "#6D4C41"], ["stock_alex", "Алекс", "#BF6D32"], ["stock_smile", "Смайл", "#F4C542"], ["stock_cat", "Котик", "#E88BC8"], ["stock_skull", "Череп", "#8A8F98"], ["favorite_flag", "Избранное", "#2673F2"]].forEach(([id, n, c]) => {
      const d = document.createElement("figure"); d.className = "mx-avafig"; d.appendChild(ava(id, 120, true, id !== "favorite_flag"));
      const sm = document.createElement("div"); sm.className = "mx-avasm"; [20, 18, 58].forEach((s) => sm.appendChild(ava(id, s, true, s < 30)));
      d.appendChild(sm); d.insertAdjacentHTML("beforeend", `<figcaption><b>${n}</b><code>${id}</code><span style="background:${c}"></span></figcaption>`); box.appendChild(d);
    });
    const lad = $("#ladder");
    const drawLad = (img, name) => {
      const ss = Math.min(img.width, img.height), r = encodeAvatar(img, (img.width - ss) / 2, (img.height - ss) / 2, ss);
      lad.innerHTML = `<h3>Сжатие аватарки${name ? ": " + esc(trim(name, 24)) : ""}</h3><div class="mx-steps">` + [192, 160, 128, 96, 80, 64].map((t) => { const x = r.tries.find((q) => q[0] === t);
        const cls = !x ? "skip" : x[1] < 30000 ? "ok" : "bad"; return `<div class="${cls}"><b>${t}×${t}</b><span>${x ? x[1].toLocaleString("ru-RU") + " симв." : "не понадобилось"}</span><i><em style="width:${x ? Math.min(100, x[1] / 30000 * 100) : 0}%"></em></i></div>`; }).join("") +
        `</div><p class="mx-small">${r.id ? `Подошёл первый размер, где base64 короче 30 000 символов. Итоговая строка «image:…» уходит в профиль.` : `Даже 64×64 не влезло: аватарка молча не применится, останется прежняя.`}</p><label class="btn-ghost mx-ladbtn">своя картинка<input type="file" accept="image/*" hidden></label>`;
      $("input", lad).addEventListener("change", (e) => { const f = e.target.files[0]; if (!f) return; const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => drawLad(im, f.name); im.src = fr.result; }; fr.readAsDataURL(f); });
    };
    const demo = document.createElement("canvas"); demo.width = demo.height = 512; const g = demo.getContext("2d");
    for (let y = 0; y < 512; y += 4) for (let x = 0; x < 512; x += 4) { g.fillStyle = `hsl(${(x + y) / 3 + Math.random() * 60},70%,${35 + Math.random() * 35}%)`; g.fillRect(x, y, 4, 4); }
    drawLad(demo, "шумная картинка");
    K.dl($("#profDl"), [
      ["Ник", "до 24 символов; пустой — подставится логин"],
      ["Описание", "до 120 символов, переносы строк склеиваются в пробел"],
      ["Своя ава", "PNG/JPG/BMP перетаскиванием, обрезка квадратом, колёсико — размер"],
      ["Витрина", "один трофей из инвентаря; хранится только id предмета, сам предмет остаётся у тебя"],
      ["В шапке чата", "описание, а если его нет — «в сети» / «не в сети»"],
      ["Статус", "зелёный квадратик, если игрок сейчас на сервере"],
      ["Старые ID", "max_red, max_blue, max_purple, max_black, steve, alex сами переводятся в новые стоковые"],
      ["Антицензура", "на профиль не действует: ник и описание пишутся как есть"],
    ]);
  })();

  /* ================= 07 ТОНКОСТИ ================= */
  const NOTES = [
    ["Удалённое можно воскресить", "У получателя удалённое сообщение превращается в «Сообщение удалено», но сырой текст на сервере остаётся. «Переслать» в меню есть всегда и берёт именно сырой текст: перешли удалёнку себе в «Избранное» и прочитай. В симуляторе у Ksyusha_mc такое лежит."],
    ["Удалить — значит спрятать у себя", "Удаление прячет сообщение только у отправителя. Полностью текст стирается лишь в «Избранном», где отправитель и получатель — один человек."],
    ["Пересылка без цензуры и счётчика", "Пересланное не проходит антицензуру второй раз и не идёт в зачёт ста сообщений. Зато оно копирует вложение и даже id подарка."],
    ["Подарок, который нельзя принять", "Если переслать чужой подарок, у нового получателя будет пузырь с вещами и статусом, но без кнопок: подарок адресован не ему."],
    ["Удалённый подарок висит вечно", "Отправитель может удалить сообщение с подарком. У получателя пропадают ✓ и ✕, а вещи остаются в эскроу без единого способа их достать."],
    ["Сотое ровно", "Ачивка выдаётся при счётчике ровно 100. Считаются текст, файлы и подарки. Пустое сообщение без вложения не отправляется вообще."],
    ["Пятая сделка офлайн", "Сделка засчитывается и отправителю, но ачивку ему выдают, только если он в сети в момент принятия. Пропустил пятую — дальше счётчик уже 6, 7… и «Свети стеклом» не придёт."],
    ["Отказы считаются тому, кто отказал", "«Авито Скам» получает не тот, кому отказали, а тот, кто пять раз нажал ✕."],
    ["Только основной инвентарь", "Для подарка вещи ищутся в основных 36 слотах. Броня и вторая рука не в счёт. Предметы должны совпадать вместе с NBT: зачарованный меч за обычный не сойдёт."],
    ["Правка тоже цензурится", "«Изменить» доступно только для своих текстовых сообщений. Новый текст снова проходит антицензуру и получает пометку «изм.»."],
    ["Мёртвые записи словаря", "«не знаю», «ай-ай» и «интересно?» лежат в словаре слов, но слова ищутся регуляркой только из букв. Эти три замены не срабатывают никогда."],
    ["Потерял — не вернут", "Метка выдачи хранится в данных, переживающих смерть. Умер с MAX без keepInventory и не подобрал — новый не придёт, только из креатива."],
    ["Читают, когда открывают", "Две галочки ✓✓ ставятся, когда собеседник открывает чат. Сообщения в «Избранное» прочитаны сразу."],
    ["Поиск только по тексту", "Поиск в шапке ищет по сырому тексту текстовых сообщений, начинает с самого нижнего, ↑ и ↓ ходят по кругу. Файлы, подарки и удалённое не ищутся."],
    ["Все игроки сервера", "Список чатов — это все, кто хоть раз заходил на сервер, по алфавиту. Писать можно и тем, кто не в сети: сообщение просто подождёт."],
  ];
  $("#notesBox").innerHTML = NOTES.map(([t, d], i) => `<article class="mx-note"><header><span>${i + 1}</span><b>${esc(t)}</b></header><p>${esc(d)}</p><em>${time(now - (NOTES.length - i) * 7 * 60e3)} ✓✓</em></article>`).join("");

  /* ================= 08–09: ачивки, версии, финал ================= */
  adv = K.adv({ list: ZM.P23.advancements, store: "p23.adv", icon: (a) => I(a.icon), chatSel: "#log", intro: "Четыре скрытых: от первого входа до пятого отказа.", onGrant: () => setTimeout(got, 50) });
  const got = () => { $("#stGot").textContent = `${ZM.P23.advancements.filter((a) => adv.has(a.key)).length}/4`; };
  got(); setInterval(got, 1500);
  $("#advQ").textContent = "4 ачивки · 210 XP";
  K.timeline($("#tl"), [
    { date: "18.07.2026", ver: "1.1.1", t: "Мессенджер MAX", d: "Новый предмет в тот же день, что и Энчант-апдейт: личка, «Избранное», файлы, подарки, профили и антицензура на сервере.", c: "#3c6cff" },
    { date: "18.07.2026", ver: "1.1.1", t: "Ветка ачивок", d: "Четыре скрытых достижения: вход, сотое сообщение, пять сделок и пять отказов.", c: "#8a3dff" },
  ]);
  K.finNav(23, $("#finNav"));

  /* ================= фон: всплывающие пузыри ================= */
  (function bg() {
    const cv = $("#bg"), g = cv.getContext("2d"); let W_, H_, bs = [];
    const size = () => { W_ = cv.width = innerWidth; H_ = cv.height = innerHeight; bs = Array.from({ length: Math.round(W_ / 90) }, () => mk(true)); };
    const mk = (any) => ({ x: Math.random() * W_, y: any ? Math.random() * H_ : H_ + 40, w: 40 + Math.random() * 120, h: 18 + Math.random() * 16, v: 8 + Math.random() * 18, own: Math.random() < 0.5, a: 0.04 + Math.random() * 0.06 });
    addEventListener("resize", size); size();
    let last = performance.now();
    (function f(t) { requestAnimationFrame(f); const dt = Math.min(0.05, (t - last) / 1000); last = t; if (!motion() && bs.length && bs[0].drawn) return;
      g.clearRect(0, 0, W_, H_);
      bs.forEach((b, i) => { b.y -= b.v * dt; b.drawn = 1; if (b.y < -40) bs[i] = mk(false);
        g.globalAlpha = b.a; g.fillStyle = b.own ? "#2B6EE6" : "#283342"; g.fillRect(b.x, b.y, b.w, b.h); g.fillStyle = "#fff"; g.globalAlpha = b.a * 0.8;
        for (let k = 6; k < b.w - 10; k += 10 + ((k * 7) % 9)) g.fillRect(b.x + k, b.y + b.h / 2 - 1, 6, 2); });
      g.globalAlpha = 1; })(last);
  })();
})();
