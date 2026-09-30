/* =====================================================================
   ZitraksMode Wiki · shared/core.js
   Общие утилиты для всех страниц. Без сборщиков и модулей, поэтому
   сайт работает и при открытии файла двойным кликом, и на хостинге.
   ===================================================================== */
(function () {
  const ZM = (window.ZM = window.ZM || {});

  /* Путь до корня сайта: <html data-root="../../"> */
  ZM.root = document.documentElement.dataset.root || "";
  ZM.url = (p) => ZM.root + p;

  ZM.$ = (s, r = document) => r.querySelector(s);
  ZM.$$ = (s, r = document) => [...r.querySelectorAll(s)];
  ZM.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- localStorage с неймспейсом ---------- */
  ZM.store = {
    get(k, d) { try { const v = localStorage.getItem("zm:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("zm:" + k, JSON.stringify(v)); dispatchEvent(new CustomEvent("zm:change", { detail: { key: k } })); } catch (e) {} },
  };

  /* ---------- Профили: весь прогресс сайта (ключи zm:*) принадлежит активному профилю ----------
     Мета лежит отдельно (zmp:*), чтобы не попадать в сохранения. Смена профиля: текущие zm:* уходят
     в снимок zmp:snap:<id>, потом из снимка выбранного профиля возвращаются его ключи. */
  const LS = (() => { try { const k = "zmp:t"; localStorage.setItem(k, 1); localStorage.removeItem(k); return localStorage; } catch (e) { return null; } })();
  const AV_MOD = { one: "assets/textures/block/one_inv.png", tnt_helmet: "assets/textures/item/tnt_helmet.png", sniper: "assets/textures/p3/icons/iron_sniper.png",
    labubu: "assets/textures/p6/icons/red.png", ender: "assets/textures/p7/iso/ender_safe.png", mih: "assets/textures/p8/made_in_heaven.png",
    casted: "assets/textures/p10/casted_face.png", miner: "assets/textures/p4/models/miner_helmet.png", printer: "assets/textures/p13/printer_iso.png" };
  const AV_MOB = ["steve", "alex", "zombie", "skeleton", "wither_skeleton", "creeper", "enderman", "blaze", "pig", "villager", "witch", "iron_golem", "piglin", "adun"];
  const zmKeys = () => { const r = []; if (!LS) return r; for (let i = 0; i < LS.length; i++) { const k = LS.key(i); if (k && k.startsWith("zm:")) r.push(k); } return r; };
  const meta = () => { try { return JSON.parse(LS.getItem("zmp:profiles")) || null; } catch (e) { return null; } };
  const setMeta = (m) => { try { LS.setItem("zmp:profiles", JSON.stringify(m)); } catch (e) {} };
  const rid = () => "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  function ensure() {
    let m = meta();
    if (!m || !m.list || !m.list.length) { const id = rid(); m = { active: id, list: [{ id, nick: "Игрок", avatar: "steve", created: Date.now() }] }; setMeta(m); }
    return m;
  }
  const utf8b64 = (str) => { const b = new TextEncoder().encode(str); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
  const b64utf8 = (b64) => { const s = atob(b64), b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return new TextDecoder().decode(b); };
  ZM.profile = {
    ok: !!LS, AV_MOB, AV_MOD,
    avatarUrl(av) { av = av || "steve"; return av.startsWith("data:") ? av : AV_MOD[av] ? ZM.url(AV_MOD[av]) : ZM.url(`assets/textures/hub/av/${av}.png`); },
    list() { return LS ? ensure().list : [{ id: "x", nick: "Игрок", avatar: "steve", created: Date.now() }]; },
    me() { if (!LS) return this.list()[0]; const m = ensure(); return m.list.find((p) => p.id === m.active) || m.list[0]; },
    update(patch) { if (!LS) return; const m = ensure(), p = m.list.find((x) => x.id === m.active); Object.assign(p, patch); setMeta(m); ZM.profile.refresh(); },
    snapshot() { const d = {}; for (const k of zmKeys()) d[k.slice(3)] = LS.getItem(k); return d; },
    restore(d) { for (const k of zmKeys()) LS.removeItem(k); for (const k in d || {}) try { LS.setItem("zm:" + k, d[k]); } catch (e) {} },
    create(nick, avatar) {
      const m = ensure(); try { LS.setItem("zmp:snap:" + m.active, JSON.stringify(this.snapshot())); } catch (e) {}
      const id = rid(); m.list.push({ id, nick: (nick || "Игрок").slice(0, 16), avatar: avatar || AV_MOB[m.list.length % AV_MOB.length], created: Date.now() }); m.active = id; setMeta(m);
      this.restore({}); return id;
    },
    switchTo(id) {
      const m = ensure(); if (id === m.active || !m.list.some((p) => p.id === id)) return;
      try { LS.setItem("zmp:snap:" + m.active, JSON.stringify(this.snapshot())); } catch (e) {}
      let d = {}; try { d = JSON.parse(LS.getItem("zmp:snap:" + id)) || {}; } catch (e) {}
      this.restore(d); LS.removeItem("zmp:snap:" + id); m.active = id; setMeta(m);
    },
    remove(id) {
      const m = ensure(); if (m.list.length < 2) return false;
      if (id === m.active) this.switchTo(m.list.find((p) => p.id !== id).id);
      const m2 = ensure(); m2.list = m2.list.filter((p) => p.id !== id); setMeta(m2); LS.removeItem("zmp:snap:" + id); return true;
    },
    exportCode() { const p = this.me(); return "ZM1." + utf8b64(JSON.stringify({ v: 1, p: { nick: p.nick, avatar: p.avatar, created: p.created }, d: this.snapshot() })); },
    parse(code) { code = String(code || "").trim(); if (code.startsWith("{")) return JSON.parse(code); if (!code.startsWith("ZM1.")) throw new Error("не похоже на сохранение"); return JSON.parse(b64utf8(code.slice(4))); },
    importCode(code, asNew) {
      const o = this.parse(code); if (!o || !o.d) throw new Error("пустое сохранение");
      if (asNew) this.create(o.p && o.p.nick, o.p && o.p.avatar);
      this.restore(o.d); if (o.p) this.update({ nick: o.p.nick || this.me().nick, avatar: o.p.avatar || this.me().avatar });
      return o;
    },
    download() {
      const p = this.me(), blob = new Blob([JSON.stringify({ v: 1, p: { nick: p.nick, avatar: p.avatar, created: p.created }, d: this.snapshot() }, null, 1)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `zitraksmode-${p.nick.replace(/[^\wа-яё-]+/gi, "_")}.zmsave`; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    },
    // сколько ачивок получено по всем пунктам (без данных страниц: просто длины массивов pNN.adv)
    gotCount() { let n = 0; for (const k of zmKeys()) if (/^zm:p\d\d\.adv$/.test(k)) try { n += (JSON.parse(LS.getItem(k)) || []).length; } catch (e) {} return n; },
    refresh() {
      const me = this.me();
      document.querySelectorAll(".zm-me").forEach((el) => { el.querySelector("img").src = this.avatarUrl(me.avatar); el.querySelector(".zm-me-n").textContent = me.nick; el.querySelector("b").textContent = "★ " + this.gotCount(); });
    },
  };

  /* Единый маршрут по пункту и ссылка на ту же ветку главного дерева.
     Число/прогресс читаются из того же zm:pNN.adv, что использует страница. */
  document.addEventListener("DOMContentLoaded", () => {
    const m = /\/pages\/(\d\d)-/.exec(location.pathname), n = m && +m[1];
    if (!n || !ZM.POINTS) return;
    const pt = ZM.POINTS.find((p) => p.n === n), branch = ZM.HUB_ADV?.find((p) => p.n === n), adv = ZM["P" + m[1]]?.advancements;
    const main = document.querySelector("main"), target = document.querySelector("#adv") || document.querySelector("#tree");
    if (!main || !pt || !target || !adv || !branch) return;
    const store = `p${m[1]}.adv`, treeUrl = ZM.url(`index.html#tree/${n}`);
    const board = target.querySelector(".adv-board");
    const panel = document.createElement("div"); panel.className = "zm-branch-sync";
    panel.innerHTML = `<div class="zm-branch-mark"><img src="${ZM.url(pt.icon)}" alt=""></div><div class="zm-branch-copy"><strong>Ветка №${m[1]} · ${ZM.esc(pt.title)}</strong><span>Тот же прогресс, что в общем древе. Достижения сохраняются в активном профиле.</span></div><b class="zm-branch-count" aria-live="polite"></b><a href="${treeUrl}">Открыть в главном древе ↗</a>`;
    if (board) target.insertBefore(panel, board); else target.appendChild(panel);
    const map = document.createElement("div"); map.className = "zm-branch-map"; map.setAttribute("aria-label", "Ветка достижений пункта в главном древе");
    panel.appendChild(map);
    const refresh = () => {
      const got = new Set(ZM.store.get(store, []));
      panel.querySelector(".zm-branch-count").textContent = `${branch.adv.filter((a) => got.has(a.key)).length} / ${branch.adv.length}`;
      map.innerHTML = `<span class="zm-branch-root" title="Корень ветки ${ZM.esc(pt.title)}"><img src="${ZM.url(pt.icon)}" alt=""></span>` + branch.adv.map((a) => {
        const has = got.has(a.key), show = has || !a.hidden, parent = branch.adv.find((p) => p.key === a.parent);
        return `<span class="zm-branch-edge ${has ? "on" : ""}" aria-hidden="true"></span><button type="button" data-adv-key="${ZM.esc(a.key)}" class="zm-branch-node ${has ? "has" : "locked"} ${a.frame}" title="${show ? ZM.esc(a.t.replace(/§[kr]/g, "")) : "Скрытое достижение"}${parent ? ` · после ${got.has(parent.key) ? ZM.esc(parent.t) : "???"}` : ""}" aria-label="${show ? ZM.esc(a.t.replace(/§[kr]/g, "")) : "Скрытое достижение"}${has ? ", получено" : ", не получено"}"><span class="adv-frame ${show ? a.frame : "task"}${has ? "" : " locked"}"></span>${show ? `<img src="${ZM.url(a.icon)}" alt="">` : "<b>?</b>"}</button>`;
      }).join("");
    };
    map.addEventListener("click", (e) => {
      const node = e.target.closest("[data-adv-key]"); if (!node) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      const own = target.querySelector(`[data-k="${node.dataset.advKey}"]`); if (own) own.click();
    });
    let knownProgress = JSON.stringify(ZM.store.get(store, []));
    refresh();
    addEventListener("zm:change", (e) => {
      if (e.detail?.key === store) { knownProgress = JSON.stringify(ZM.store.get(store, [])); refresh(); }
    });
    addEventListener("pageshow", (e) => {
      // Возврат из главного дерева после смены профиля: старые страницы держат
      // ачивки в памяти и иначе перезапишут прогресс нового профиля.
      const current = JSON.stringify(ZM.store.get(store, []));
      if (e.persisted && n < 14 && current !== knownProgress) { location.reload(); return; }
      knownProgress = current; refresh();
    });
    addEventListener("storage", (e) => {
      if (e.key === `zm:${store}` || (e.key === "zmp:profiles" && n < 14)) {
        // Для №01–13 перечитываем собственный массив got внутри app.js.
        if (n < 14) { location.reload(); return; }
        knownProgress = JSON.stringify(ZM.store.get(store, [])); refresh();
      }
    });

    // Маршрут вместо ещё одной стены вступительного текста. Ведёт прямо к опытам.
    const sections = [...main.children].filter((el) => el.tagName === "SECTION" && el.id && el.querySelector("h2") && !/^(hist|history|finale)$/.test(el.id));
    if (sections.length > 2) {
      const first = main.querySelector("section"), route = document.createElement("nav");
      route.className = "zm-route"; route.setAttribute("aria-label", "Маршрут по пункту");
      route.innerHTML = `<div class="zm-route-intro"><span>ПУТЕВОДИТЕЛЬ / №${m[1]}</span><b>Выбери, что попробовать</b></div><div class="zm-route-links">${sections.map((sec, i) => `<a href="#${encodeURIComponent(sec.id)}"><small>${String(i + 1).padStart(2, "0")}</small>${ZM.esc(sec.querySelector("h2").textContent.trim())}<span aria-hidden="true">↗</span></a>`).join("")}</div>`;
      if (first) first.after(route);
    }
    main.querySelectorAll("section > p").forEach((p) => {
      if (p.textContent.length > 240 && !p.closest(".hero, .ml-hero, .gz-hero") && !p.classList.contains("fin-q")) p.classList.add("zm-story");
    });
  });

  /* ---------- Текст с § форматированием ---------- */
  ZM.mcText = (t) => {
    if (!t) return "";
    const cls = [t.color ? "mc-" + t.color : "", t.bold ? "mc-bold" : ""].join(" ").trim();
    return cls ? `<span class="${cls}">${ZM.esc(t.text)}</span>` : ZM.esc(t.text);
  };

  /* ---------- 3D-куб ---------- */
  ZM.cube = (texture, size) => {
    const el = document.createElement("div");
    el.className = "mc-cube";
    if (size) el.style.setProperty("--s", size + "px");
    const url = ZM.url(texture);
    el.innerHTML = ["s", "n", "e", "w", "u", "d"].map((f) => `<div class="f ${f}" style="background-image:url('${url}')"></div>`).join("");
    return el;
  };

  /* ---------- Тост достижения в стиле Minecraft ---------- */
  let box;
  const queue = [];
  let busy = false;
  ZM.toast = ({ icon, iconHtml, title, frame = "task", head }) => {
    queue.push({ icon, iconHtml, title, frame, head });
    if (!busy) next();
    // лента «недавно получено» для профиля на главной
    try {
      const txt = String(title || "").replace(/<[^>]*>/g, "").trim(), ic = /src="([^"]+)"/.exec(iconHtml || "") || (icon ? [0, icon] : null);
      const abs = ic ? new URL(ic[1], location.href).href : "", rootAbs = new URL(ZM.url("") || "./", location.href).href;
      const feed = ZM.store.get("hub.feed", []); feed.unshift({ t: txt, f: frame, i: abs.startsWith(rootAbs) ? abs.slice(rootAbs.length) : "", p: (/№(\d+)/.exec(document.querySelector(".zm-crumb")?.textContent || "") || [])[1] | 0, ts: Date.now() });
      ZM.store.set("hub.feed", feed.slice(0, 30));
      setTimeout(() => ZM.profile.refresh(), 400);
    } catch (e) {}
  };
  function next() {
    const t = queue.shift();
    if (!t) { busy = false; return; }
    busy = true;
    if (!box) { box = document.createElement("div"); box.className = "mc-toasts"; box.setAttribute("aria-live", "polite"); document.body.appendChild(box); }
    const el = document.createElement("div");
    el.className = "mc-toast " + t.frame;
    const head = t.head || (t.frame === "challenge" ? "Испытание завершено!" : t.frame === "goal" ? "Цель достигнута!" : "Достижение получено!");
    el.innerHTML = `<div class="mt-ico">${t.iconHtml || (t.icon ? `<img class="pixel" src="${ZM.url(t.icon)}" alt="">` : "")}</div>
      <div><div class="mt-head">${head}</div><div class="mt-title">${t.title}</div></div>`;
    box.appendChild(el);
    // звук тоста как в игре; фанфары испытания, только если страница сама не сыграла свой звук
    { const t0 = performance.now(); setTimeout(() => { if (ZM.sfx) { if (t.frame === "challenge" && ZM.lastSound < t0 - 60) ZM.sfx("challenge", 0.7); else ZM.sfx("toast_in", 0.6); } }, 40); }
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("show")));
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => { el.remove(); next(); }, 500); }, 3200);
  }

  /* ---------- Иконка предмета как в инвентаре ----------
     ванильный предмет -> плоская текстура, блок мода -> изометрическая иконка */
  ZM.itemIcon = (id, size = 32) => {
    if (!id) return "";
    const [ns, name] = id.split(":");
    if (ns === "minecraft") return `<img class="pixel" src="${ZM.url("assets/textures/mc/" + name + ".png")}" alt="" style="width:${size}px;height:${size}px">`;
    // блок мода -> заранее отрендеренная изометрическая иконка (tools/build_data.py -> *_inv.png)
    return `<img src="${ZM.url("assets/textures/block/" + name + "_inv.png")}" alt="" style="width:${size}px;height:${size}px">`;
  };

  /* ---------- Тултипы как в игре: data-tip="Название" data-tip-sub="zitraksmode:one" ---------- */
  let tipEl;
  document.addEventListener("pointerover", (e) => {
    const t = e.target.closest && e.target.closest("[data-tip]");
    if (!t || e.pointerType === "touch") { if (tipEl) tipEl.style.opacity = 0; return; }
    if (!tipEl) { tipEl = document.createElement("div"); tipEl.className = "mc-tip"; document.body.appendChild(tipEl); }
    tipEl.innerHTML = ZM.esc(t.dataset.tip) + (t.dataset.tipInfo ? `<i>${ZM.esc(t.dataset.tipInfo)}</i>` : "") + (t.dataset.tipSub ? `<small>${ZM.esc(t.dataset.tipSub)}</small>` : "");
    tipEl.style.opacity = 1;
  });
  document.addEventListener("pointermove", (e) => {
    if (!tipEl || tipEl.style.opacity === "0") return;
    const x = Math.min(e.clientX + 14, innerWidth - tipEl.offsetWidth - 6);
    tipEl.style.left = x + "px"; tipEl.style.top = e.clientY - tipEl.offsetHeight - 10 + "px";
  }, { passive: true });

  /* ---------- Копирование в буфер (с запасным вариантом без HTTPS) ---------- */
  ZM.copy = (text) => {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(() => fallback());
    fallback();
    function fallback() { const ta = document.createElement("textarea"); ta.value = text; ta.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) {} ta.remove(); }
    return Promise.resolve();
  };

  /* ---------- Появление при скролле ---------- */
  ZM.reveal = (sel = ".reveal") => {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
    ZM.$$(sel).forEach((el) => io.observe(el));
  };

  /* ---------- Верхняя панель (одинаковая на всех страницах) ---------- */
  ZM.topbar = ({ crumb = "", prev, next } = {}) => {
    const bar = document.createElement("header");
    bar.className = "zm-topbar";
    const link = (p, label, arrowFirst) => p ? `<a href="${ZM.url(p.href)}" title="${ZM.esc(p.title)}">${arrowFirst ? "←" : ""} <span>№${String(p.n).padStart(2, "0")}</span> ${arrowFirst ? "" : "→"}</a>` : `<a class="off">${label}</a>`;
    const me = ZM.profile.me();
    bar.innerHTML = `<a class="zm-home" href="${ZM.url("index.html")}"><i>←</i> <span class="zm-full">ZITRAKSMODE</span><span class="zm-short">ZM</span></a><span class="zm-sep">/</span><span class="zm-crumb">${crumb}</span>
      <nav class="zm-nav">${link(prev, "←", true)}${link(next, "→", false)}</nav>
      <a class="zm-me" href="${ZM.url("index.html#profile")}" title="Профиль: прогресс и сохранения"><img src="${ZM.profile.avatarUrl(me.avatar)}" alt=""><span class="zm-me-n">${ZM.esc(me.nick)}</span><b>★ ${ZM.profile.gotCount()}</b></a>`;
    document.body.prepend(bar);
    // главная показывает «Продолжить»: запоминаем, где был игрок
    const m = /№(\d+)/.exec(crumb); if (m) { const seen = ZM.store.get("hub.seen", []); if (!seen.includes(+m[1])) { seen.push(+m[1]); ZM.store.set("hub.seen", seen); } }
    if (m) ZM.store.set("hub.last", { n: +m[1], href: location.pathname.split("/pages/")[1] ? "pages/" + location.pathname.split("/pages/")[1] : "", t: Date.now() });
  };

  /* =====================================================================
     Базовые звуки Minecraft для всех страниц: ZM.sfx("click") и т.п.
     Файлы: assets/sounds/mc/ (ванильные 1.19.2, ogg + mp3 для Safari).
     Громкость общая: SFX_VOLUME. Страница со своей кнопкой звука
     подключает её через ZM.sfx.bind(() => sndOn); иначе core сам
     рисует маленькую кнопку звука (ключ zm:sfx).
     ===================================================================== */
  const SFX_VOLUME = 0.4;
  const SFX_LIB = {
    click: ["click"], pop: ["pop"], orb: ["orb"], levelup: ["levelup"],
    stone: ["stone1", "stone2", "stone3", "stone4"],            // ломание/установка камня
    hit: ["step1", "step2", "step3", "step4", "step5", "step6"],  // удары по блоку во время копания
    cloth: ["cloth1", "cloth2", "cloth3", "cloth4"],            // шерсть / плюш
    wood: ["wood1", "wood2", "wood3", "wood4"],
    page: ["page1", "page2", "page3"],
    equip: ["equip1", "equip2", "equip3", "equip4", "equip5", "equip6"],
    chest_open: ["chest_open"], chest_close: ["chest_close"],
    toast_in: ["toast_in"], toast_out: ["toast_out"], challenge: ["challenge"],
    anvil: ["anvil"], enchant: ["enchant"],
    cave: ["cave1", "cave2", "cave3", "cave4", "cave5", "cave6", "cave7", "cave8", "cave9", "cave10"],
  };
  const SFX_EXT = (() => { try { return new Audio().canPlayType("audio/ogg; codecs=vorbis") ? "ogg" : "mp3"; } catch (e) { return "mp3"; } })();
  let sfxGetter = null, sfxOwn = ZM.store.get("sfx", true);
  const sfxPool = {};
  // время последнего звука страницы: общий «клик» не накладывается на её собственные звуки
  ZM.lastSound = 0;
  try {
    const op = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { ZM.lastSound = performance.now(); return op.apply(this, arguments); };
  } catch (e) {}
  const sfxOn = () => (sfxGetter ? !!sfxGetter() : sfxOwn);
  ZM.sfx = function (name, vol = 1, rate = 1) {
    if (!sfxOn()) return null;
    const list = SFX_LIB[name]; if (!list) return null;
    const url = ZM.url(`assets/sounds/mc/${list[(Math.random() * list.length) | 0]}.${SFX_EXT}`);
    try {
      const a = (sfxPool[url] || (sfxPool[url] = new Audio(url))).cloneNode();
      a.volume = Math.max(0, Math.min(1, vol * SFX_VOLUME)); a.playbackRate = rate;
      a.preservesPitch = a.mozPreservesPitch = a.webkitPreservesPitch = false;
      a.play().catch(() => {});
      return a;
    } catch (e) { return null; }
  };
  ZM.sfx.bind = (fn) => { sfxGetter = fn; const b = document.querySelector(".zm-sfx"); if (b) b.remove(); };
  ZM.sfx.on = sfxOn;

  // общий «клик» интерфейса: кнопки, вкладки, переключатели (если страница сама ничего не проиграла)
  const SFX_SEL = 'button,[role="tab"],[role="radio"],[role="switch"],summary,select,label>input[type="checkbox"],a[href^="#"],.zm-nav a';
  document.addEventListener("click", (e) => {
    const el = e.target.closest && e.target.closest(SFX_SEL);
    if (!el || el.closest("[data-nosfx]") || el.disabled) return;
    const t0 = performance.now();
    setTimeout(() => { if (ZM.lastSound < t0 - 30) ZM.sfx("click", 0.35); }, 0);
  });

  // фоновая атмосфера: редкие звуки пещеры, тихо, после первого касания страницы
  ZM.sfx.ambient = ({ names = "cave", min = 40, max = 90, vol = 0.22 } = {}) => {
    let started = false, tm = 0;
    const plan = () => { clearTimeout(tm); tm = setTimeout(() => { if (!document.hidden) ZM.sfx(names, vol, 0.9 + Math.random() * 0.2); plan(); }, (min + Math.random() * (max - min)) * 1000); };
    const go = () => { if (started) return; started = true; tm = setTimeout(() => { if (!document.hidden) ZM.sfx(names, vol); plan(); }, 6000 + Math.random() * 6000); };
    addEventListener("pointerdown", go, { once: true, capture: true });
    addEventListener("keydown", go, { once: true, capture: true });
  };

  // своя кнопка звука, если страница не подключила свою
  document.addEventListener("DOMContentLoaded", () => setTimeout(() => {
    if (sfxGetter || document.querySelector(".zm-sfx")) return;
    const b = document.createElement("button");
    b.type = "button"; b.className = "zm-sfx"; b.dataset.nosfx = "";
    const sync = () => { b.setAttribute("aria-pressed", String(sfxOwn)); b.title = sfxOwn ? "Звук включён" : "Звук выключен"; b.innerHTML = `<i></i><span>${sfxOwn ? "звук" : "без звука"}</span>`; };
    b.onclick = () => { sfxOwn = !sfxOwn; ZM.store.set("sfx", sfxOwn); sync(); ZM.sfx("click", 0.5); };
    sync(); document.body.appendChild(b);
  }, 0));
})();
