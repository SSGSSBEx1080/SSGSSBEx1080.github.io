/* =====================================================================
   №11 · JBL-колонка
   Поведение из кода мода: JBLSpeakerItem (NBT, подсказка, ачивка 300 тиков на 100%),
   JBLSpeakerScreen (библиотека, сортировка, двойной клик 250 мс, кнопки, перемотка),
   JBLSpeakerHUD (плашка 140×35, бегущая строка: 60 кадров ждёт, потом 1 px раз в 20 кадров),
   JBLSpeakerNetwork (загрузка кусками, синхронизация, звук всем, кто видит игрока).
   Данные: data/p11_jbl.js, треки и басы: data/p11_tracks.js
   ===================================================================== */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = ZM.esc, U = ZM.url, S = ZM.store, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (n) => Math.floor(Math.random() * n), pick = (a) => a[rnd(a.length)];
  const P = ZM.P11, TR = ZM.P11T, M = ZM.P11M;
  const T = (n) => U(`assets/textures/p11/${n}.png`);
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MC = { 7: "#aaaaaa", 8: "#555555", a: "#55ff55", b: "#55ffff", e: "#ffff55", f: "#ffffff" };
  const VS = "\uFE0E";   // символы как текст, не эмодзи
  const fmtDur = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); };
  const fmtDate = (ms) => { const d = new Date(ms); return String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + d.getFullYear(); };
  const me = () => (ZM.profile ? ZM.profile.me() : { nick: "Игрок", avatar: "steve" });

  ZM.topbar({ crumb: "№11 · JBL-колонка", ...ZM.pointNav(11) });

  /* ================= звук ================= */
  const MASTER = 0.45, MUSIC = 0.8;
  const CORE = ["equip", "toast_in", "challenge", "page", "chest_open"];
  let sndOn = S.get("p11.snd", true);
  const pool = {};
  function play(name, vol = 1, rate = 1) {
    if (!sndOn) return;
    if (CORE.includes(name)) { ZM.sfx(name, vol, rate); return; }
    const url = U(`assets/sounds/p11/${name}.ogg`);
    try { const a = (pool[url] || (pool[url] = new Audio(url))).cloneNode(); a.volume = clamp(vol * MASTER, 0, 1); a.playbackRate = rate; a.preservesPitch = false; a.play().catch(() => {}); } catch (e) {}
  }
  const note = (inst, n) => play(inst, 0.8, Math.pow(2, (n - 12) / 12));   // нота 0..24, как у нотного блока
  const bSnd = $("#sndBtn");
  const syncSnd = () => { bSnd.setAttribute("aria-pressed", sndOn); bSnd.classList.toggle("on", sndOn); au.muted = !sndOn; };
  bSnd.onclick = () => { sndOn = !sndOn; S.set("p11.snd", sndOn); syncSnd(); if (sndOn) play("click", 0.6); };
  ZM.sfx.bind(() => sndOn);

  /* ================= чат ================= */
  function chat(html, life = 6500) {
    const el = $("#chat"), p = document.createElement("p"); p.innerHTML = html; el.appendChild(p);
    while (el.children.length > 5) el.firstChild.remove();
    setTimeout(() => p.classList.add("old"), life); setTimeout(() => p.remove(), life + 1200);
  }

  /* ================= ачивки ================= */
  const ADV = P.advancements;
  let got = S.get("p11.adv", []).filter((k) => ADV.some((a) => a.key === k));
  let advSel = null, renderTree = () => {};
  const titleH = (a) => `<span style="color:${MC[a.color]}">${esc(a.title)}</span>`;
  function grant(key) {
    const a = ADV.find((x) => x.key === key);
    if (!a || got.includes(key)) return;
    got.push(key); S.set("p11.adv", got);
    ZM.toast({ iconHtml: `<img src="${T(a.icon)}" alt="" style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated">`, title: titleH(a), frame: a.frame });
    if (a.chat) chat(`${esc(me().nick)} получил достижение <span style="color:#55ff55">[${esc(a.title)}]</span>`);
    advSel = key; renderTree(key);
  }

  /* ================= инвентарь: сколько колонок у игрока ================= */
  const inv = Object.assign({ jbl: 0 }, S.get("p11.inv", {}));
  const saveInv = () => S.set("p11.inv", inv);
  function giveJbl(from) {
    inv.jbl = Math.min(9, inv.jbl + 1); saveInv();
    play("pop", 0.5, 1.2); invRender(true); hudHotbar();
    grant("craft_jbl_speaker");   // inventory_changed: колонка появилась в инвентаре
    if (from) chat(from);
  }

  /* ================= библиотека ================= */
  // встроенные треки + свои (метаданные в localStorage, сами файлы в IndexedDB этого браузера)
  const BASE_T = TR.tracks.map((t) => ({ trackId: t.id, title: t.title, author: t.author, likes: t.likes, createdAt: new Date(t.created + "T12:00:00").getTime(), durationMs: t.durationMs, builtin: true }));
  let ovr = S.get("p11.ovr", {});            // встроенные: {id: {title, liked, deleted}}
  let user = S.get("p11.user", []);           // свои: [{trackId,title,author,likes,liked,createdAt,durationMs}]
  const blobs = {};                           // id -> objectURL
  const env = {};                             // id -> {bass: Uint8Array, loud: Uint8Array}
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  for (const [k, v] of Object.entries(TR.env)) env[k] = { bass: b64(v.bass), loud: b64(v.loud) };

  function library() {
    const list = [];
    for (const t of BASE_T) { const o = ovr[t.trackId] || {}; if (o.deleted) continue; list.push({ ...t, title: o.title || t.title, likes: t.likes + (o.liked ? 1 : 0), liked: !!o.liked }); }
    for (const t of user) if (blobs[t.trackId]) list.push({ ...t, likes: t.likes + (t.liked ? 1 : 0) });
    // как в JBLSpeakerScreen: лайки ↓, потом новее ↓, потом по алфавиту
    return list.sort((a, b) => b.likes - a.likes || b.createdAt - a.createdAt || a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
  }
  const findT = (id) => library().find((t) => t.trackId === id);

  const idb = {
    db: null,
    open() { return new Promise((res) => { try { const r = indexedDB.open("zm-p11-jbl", 1); r.onupgradeneeded = () => r.result.createObjectStore("files"); r.onsuccess = () => { this.db = r.result; res(true); }; r.onerror = () => res(false); } catch (e) { res(false); } }); },
    tx(mode) { return this.db.transaction("files", mode).objectStore("files"); },
    put(id, blob) { return new Promise((res) => { if (!this.db) return res(false); try { const r = this.tx("readwrite").put(blob, id); r.onsuccess = () => res(true); r.onerror = () => res(false); } catch (e) { res(false); } }); },
    get(id) { return new Promise((res) => { if (!this.db) return res(null); try { const r = this.tx("readonly").get(id); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); } catch (e) { res(null); } }); },
    del(id) { try { this.db && this.tx("readwrite").delete(id); } catch (e) {} },
    clear() { try { this.db && this.tx("readwrite").clear(); } catch (e) {} },
  };

  /* ================= воспроизведение ================= */
  const au = $("#au");
  const st = { trackId: "", title: "", author: "", playing: false, paused: false, dur: 0, startTick: 0, posMs: 0 };   // как NBT предмета
  let vol = clamp(S.get("p11.vol", 1), 0, 1);
  const srcOf = (t) => (t.builtin ? U(`assets/sounds/p11/${t.trackId}.ogg`) : blobs[t.trackId]);
  const setAuVol = () => { au.volume = clamp(vol * MUSIC, 0, 1); };
  let tick = 72000 + rnd(24000);   // игровое время (тики), для PlaybackStartGameTime

  function startTrack(t) {
    if (!t) return;
    const src = srcOf(t); if (!src) return;
    if (st.trackId !== t.trackId || !au.src) { au.src = src; }
    au.currentTime = 0; setAuVol();
    Object.assign(st, { trackId: t.trackId, title: t.title, author: t.author, playing: true, paused: false, dur: t.durationMs, startTick: tick, posMs: 0 });
    au.play().catch(() => {});
    if (!env[t.trackId] && !t.builtin) analyse(t.trackId);
    netSelect(t);
    nbtBump(["Playing", "Paused", "CurrentTrackId", "CurrentTrackTitle", "CurrentTrackAuthor", "PlaybackStartGameTime", "PlaybackDurationMs", "PlaybackPositionMs"]);
    refreshAll();
  }
  function setPaused(p) {
    if (!st.playing) return;
    st.paused = p; st.posMs = Math.round(au.currentTime * 1000);
    if (p) au.pause(); else au.play().catch(() => {});
    nbtBump(["Paused", "PlaybackPositionMs"]); refreshAll();
  }
  function seekTo(ms) {
    if (!st.playing) return;
    au.currentTime = ms / 1000; st.posMs = ms; nbtBump(["PlaybackPositionMs"]);
  }
  function stopAll() {
    au.pause(); Object.assign(st, { playing: false, paused: false }); nbtBump(["Playing", "Paused"]); refreshAll();
  }
  au.addEventListener("ended", () => { stopAll(); });
  au.addEventListener("loadedmetadata", () => { if (isFinite(au.duration) && au.duration > 0) st.dur = Math.round(au.duration * 1000); });

  // басы сейчас: по огибающей трека (20 значений в секунду, как тики)
  const lvl = { bass: 0, loud: 0 };
  function levels() {
    let b = 0, l = 0;
    const e = env[st.trackId];
    if (st.playing && !st.paused && e) {
      const i = Math.floor(au.currentTime * 20);
      b = (e.bass[i] || 0) / 255; l = (e.loud[i] || 0) / 255;
      b *= 0.35 + 0.65 * vol; l *= 0.35 + 0.65 * vol;
    }
    lvl.bass = b > lvl.bass ? b : lvl.bass * 0.86;
    lvl.loud = l > lvl.loud ? l : lvl.loud * 0.9;
    return lvl;
  }
  // свои файлы: огибающую считаем сами из декодированного звука
  async function analyse(id) {
    try {
      const url = blobs[id]; if (!url) return;
      const buf = await (await fetch(url)).arrayBuffer();
      const AC = window.AudioContext || window.webkitAudioContext; const ac = new AC();
      const ab = await ac.decodeAudioData(buf); ac.close && ac.close();
      const sr = ab.sampleRate, ch = ab.getChannelData(0), hop = Math.floor(sr / 20), n = Math.floor(ch.length / hop);
      const bass = new Float32Array(n), loud = new Float32Array(n); let lp = 0; const a = 1 - Math.exp(-2 * Math.PI * 150 / sr);
      for (let i = 0; i < n; i++) { let sb = 0, sl = 0; for (let j = i * hop; j < (i + 1) * hop; j += 2) { const x = ch[j]; lp += a * (x - lp); sb += lp * lp; sl += x * x; } bass[i] = Math.sqrt(sb / (hop / 2)); loud[i] = Math.sqrt(sl / (hop / 2)); }
      const norm = (arr) => { const s = Array.from(arr).sort((x, y) => x - y), p = s[Math.floor(s.length * 0.98)] || 1; return Uint8Array.from(arr, (v) => Math.min(255, (v / p) * 255)); };
      env[id] = { bass: norm(bass), loud: norm(loud) };
    } catch (e) { /* без басов: просто играет */ }
  }

  /* ================= I · экран плеера ================= */
  let sel = S.get("p11.sel", "") || "";
  let status = "";
  let lastClickId = "", lastClickTime = 0;
  let dragSeek = false, pendingSeek = -1;
  const setStatus = (s) => { status = s; $("#scrStatus").textContent = s; };

  function listRender() {
    const lib = library(), box = $("#scrList");
    if (sel && !lib.some((t) => t.trackId === sel)) sel = "";
    box.innerHTML = lib.length ? lib.map((t) => {
      const on = t.trackId === sel, pl = st.playing && t.trackId === st.trackId;
      return `<div class="tr ${on ? "sel" : ""} ${pl ? "playing" : ""}" data-id="${esc(t.trackId)}" role="option" aria-selected="${on}">
        <span class="nt">♫</span>
        <span class="tx"><div class="tt1">${esc(t.title)}</div><div class="tt2"><span class="b">${esc(t.author)}</span><span class="d">  •  </span><span class="g">${fmtDur(t.durationMs)}</span><span class="d">  •  </span><span class="e">❤${VS} ${t.likes}</span><span class="d">  •  </span><span class="g">${fmtDate(t.createdAt)}</span></div></span>
        ${on ? `<span class="acts"><button type="button" data-a="like" class="${t.liked ? "liked" : ""}" data-tip="Лайкнуть" data-nosfx>❤${VS}</button><button type="button" data-a="rename" data-tip="Переименовать" data-nosfx>✎${VS}</button><button type="button" data-a="share" data-tip="Поделиться игроку" data-nosfx>↗${VS}</button><button type="button" data-a="delete" data-tip="Удалить трек" data-nosfx>✖${VS}</button></span>` : ""}
      </div>`;
    }).join("") : `<div class="scr-empty">Библиотека пустая.<br>Перетащи сюда .ogg или .mp3.</div>`;
    $("#stLib").textContent = lib.length;
    $("#stLib").nextElementSibling.textContent = plural(lib.length, "трек", "трека", "треков") + " в библиотеке";
    $("#netLib").textContent = "библиотека: " + lib.length;
  }
  function barRender() {
    const on = st.playing;
    $("#scrNow").textContent = on ? st.title : "Ничего не играет";
    $("#scrNow").classList.toggle("on", on);
    const pb = $("#bPlay"), playingNow = on && !st.paused;
    pb.textContent = (playingNow ? "⏸" : "▶") + VS; pb.dataset.tip = playingNow ? "Пауза" : "Играть";
    $("#heroPlayT").textContent = playingNow ? "Пауза" : on ? "Дальше" : "Врубить";
    $(".jb-btn .ic").textContent = (playingNow ? "⏸" : "▶") + VS;
  }
  function seekRender() {
    const dur = st.playing ? st.dur : 0, pos = dragSeek && pendingSeek >= 0 ? pendingSeek : st.playing ? au.currentTime * 1000 : 0;
    const w = dur > 0 ? clamp(pos / dur, 0, 1) : 0;
    $("#seekFill").style.width = w * 100 + "%"; $("#seekKnob").style.left = w * 100 + "%";
    $("#tCur").textContent = fmtDur(pos); $("#tDur").textContent = fmtDur(dur);
  }

  function playTrack(t) {
    if (!t) { setStatus("Выбери трек"); return; }
    startTrack(t); setStatus("Играет: " + t.title);
  }
  const selected = () => findT(sel);
  function togglePlayPause() { if (st.playing) setPaused(!st.paused); else playTrack(selected()); }
  function neighbor(d) {
    const lib = library(); if (!lib.length) return null;
    if (!st.trackId || !st.playing && !st.trackId) return selected() || lib[0];
    const i = lib.findIndex((t) => t.trackId === st.trackId);
    return i < 0 ? lib[0] : lib[(i + d + lib.length) % lib.length];
  }
  function stepTrack(d) { const t = neighbor(d); if (t) { playTrack(t); sel = t.trackId; listRender(); } }

  $("#scrList").addEventListener("click", (e) => {
    const act = e.target.closest("[data-a]");
    if (act) { play("click", 0.5); doAction(act.dataset.a); return; }
    const row = e.target.closest(".tr"); if (!row) return;
    const id = row.dataset.id, now = Date.now();
    const dbl = id === lastClickId && now - lastClickTime <= 250;   // DOUBLE_CLICK_MS
    lastClickId = id; lastClickTime = now;
    if (sel !== id) { sel = id; S.set("p11.sel", sel); listRender(); play("click", 0.3, 1.4); }
    if (dbl) playTrack(findT(id));
  });
  $("#scrRef").addEventListener("click", () => { play("click", 0.5); setStatus("Обновление..."); netLog("c2s", "RequestSpeakerLibrary"); setTimeout(() => { netLog("s2c", `SyncSpeakerLibrary · ${library().length} ${plural(library().length, "трек", "трека", "треков")}`); listRender(); }, 350); });
  $("#bPlay").addEventListener("click", () => { play("click", 0.5); togglePlayPause(); });
  $("#bPrev").addEventListener("click", () => { play("click", 0.5); stepTrack(-1); });
  $("#bNext").addEventListener("click", () => { play("click", 0.5); stepTrack(1); });
  $("#heroPlay").addEventListener("click", () => { play("click", 0.5); if (st.playing) setPaused(!st.paused); else { const t = selected() || library()[0]; if (t) { sel = t.trackId; playTrack(t); listRender(); } } });

  // перемотка ползунком (только когда что-то играет)
  const seekEl = $("#seek");
  const seekMs = (x) => { const r = seekEl.getBoundingClientRect(); return Math.round(clamp((x - r.left) / r.width, 0, 1) * st.dur); };
  seekEl.addEventListener("pointerdown", (e) => { if (!st.playing) return; dragSeek = true; seekEl.setPointerCapture(e.pointerId); pendingSeek = seekMs(e.clientX); setStatus("Перемотка: " + fmtDur(pendingSeek)); });
  seekEl.addEventListener("pointermove", (e) => { if (!dragSeek) return; pendingSeek = seekMs(e.clientX); setStatus("Перемотка: " + fmtDur(pendingSeek)); });
  const seekUp = () => { if (!dragSeek) return; dragSeek = false; if (pendingSeek >= 0) { seekTo(pendingSeek); netLog("c2s", "SeekSpeaker · " + fmtDur(pendingSeek)); } pendingSeek = -1; };
  seekEl.addEventListener("pointerup", seekUp); seekEl.addEventListener("pointercancel", seekUp);

  // действия с выбранным треком
  function doAction(a) {
    const t = selected(); if (!t) return;
    if (a === "like") {
      if (t.builtin) { ovr[t.trackId] = { ...(ovr[t.trackId] || {}), liked: !t.liked }; S.set("p11.ovr", ovr); }
      else { const u = user.find((x) => x.trackId === t.trackId); u.liked = !u.liked; S.set("p11.user", user); }
      netLog("c2s", "LikeTrack · " + t.title); play(t.liked ? "click" : "orb", 0.4, 1.6); listRender();
    } else if (a === "rename") renameModal(t);
    else if (a === "share") shareModal(t);
    else if (a === "delete") {
      if (t.builtin) { ovr[t.trackId] = { ...(ovr[t.trackId] || {}), deleted: true }; S.set("p11.ovr", ovr); }
      else { user = user.filter((x) => x.trackId !== t.trackId); S.set("p11.user", user); idb.del(t.trackId); }
      if (st.trackId === t.trackId && st.playing) stopAll();
      netLog("c2s", "DeleteTrack · " + t.title); sel = ""; listRender();
    }
  }
  const md = $("#md"), mdBox = $("#mdBox");
  const closeMd = () => { md.hidden = true; mdBox.innerHTML = ""; };
  md.addEventListener("click", (e) => { if (e.target === md || e.target.closest("[data-x]")) { play("click", 0.4); closeMd(); } });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !md.hidden) closeMd(); });
  function renameModal(t) {
    mdBox.innerHTML = `<h3>Переименовать</h3><p>${esc(t.title)}</p><input id="rnIn" maxlength="64" value="${esc(t.title)}"><div class="md11-row"><button type="button" class="mcbtn" id="rnOk" data-nosfx>Готово</button><button type="button" class="mcbtn" data-x data-nosfx>Отмена</button></div>`;
    md.hidden = false; const i = $("#rnIn"); i.focus(); i.select();
    const ok = () => {
      const v = i.value.trim(); if (!v) return;
      if (t.builtin) { ovr[t.trackId] = { ...(ovr[t.trackId] || {}), title: v }; S.set("p11.ovr", ovr); }
      else { user.find((x) => x.trackId === t.trackId).title = v; S.set("p11.user", user); }
      if (st.trackId === t.trackId) { st.title = v; nbtBump(["CurrentTrackTitle"]); }
      play("click", 0.5); closeMd(); listRender(); barRender();
    };
    $("#rnOk").onclick = ok; i.onkeydown = (e) => { if (e.key === "Enter") ok(); };
  }
  function shareModal(t) {
    const others = (ZM.profile ? ZM.profile.list().filter((p) => p.id !== me().id).map((p) => ({ n: p.nick, av: ZM.profile.avatarUrl(p.avatar) })) : []);
    const AV = { Alex: "alex", Steve: "steve", Zitraks: "creeper", "Житель": "villager", "Нотч": "steve" };
    const list = others.concat(P.online.filter((n) => n !== me().nick).map((n) => ({ n, av: U(`assets/textures/hub/av/${AV[n] || "steve"}.png`) })));
    mdBox.innerHTML = `<h3>Поделиться игроку</h3><p>${esc(t.title)}</p><div class="pl-list">${list.map((p) => `<button type="button" data-nick="${esc(p.n)}" data-nosfx><img src="${p.av}" alt="">${esc(p.n)}<small>онлайн</small></button>`).join("")}</div><div class="md11-row"><button type="button" class="mcbtn" data-x data-nosfx>Отмена</button></div>`;
    md.hidden = false;
    mdBox.querySelector(".pl-list").onclick = (e) => {
      const b = e.target.closest("[data-nick]"); if (!b) return;
      play("orb", 0.4, 1.3); closeMd(); setStatus("Отправлено: " + b.dataset.nick);
      chat(`<span style="color:#55ffff">♫</span> Трек <span style="color:#ffff55">«${esc(t.title)}»</span> отправлен игроку ${esc(b.dataset.nick)}`);
    };
  }
  $("#libReset").addEventListener("click", () => {
    if (!confirm("Вернуть библиотеку как была? Свои загруженные треки удалятся из этого браузера, лайки и названия сбросятся.")) return;
    ovr = {}; user = []; S.set("p11.ovr", ovr); S.set("p11.user", user); idb.clear();
    for (const k in blobs) { URL.revokeObjectURL(blobs[k]); delete blobs[k]; }
    if (st.playing && !BASE_T.some((t) => t.trackId === st.trackId)) stopAll();
    sel = ""; setStatus(""); listRender();
  });

  // загрузка своих файлов: перетаскиванием в окно или кнопкой
  async function uploadFiles(files) {
    files = [...files]; if (!files.length) return;
    setStatus("Импорт...");
    let ok = 0, last = "";
    for (const f of files) {
      if (!/\.(ogg|mp3)$/i.test(f.name)) { last = "Пропущен: " + f.name + " (нужен .ogg или .mp3)"; continue; }
      const id = "u" + Date.now().toString(36) + rnd(1e6).toString(36);
      const url = URL.createObjectURL(f);
      const dur = await new Promise((res) => { const a = new Audio(); a.preload = "metadata"; a.onloadedmetadata = () => res(isFinite(a.duration) ? Math.round(a.duration * 1000) : 0); a.onerror = () => res(-1); a.src = url; });
      if (dur < 0) { URL.revokeObjectURL(url); last = "Не читается: " + f.name; continue; }
      await netUpload(f.name, f.size);
      blobs[id] = url; await idb.put(id, f);
      const title = f.name.replace(/\.(ogg|mp3)$/i, "");
      user.push({ trackId: id, title, author: me().nick, likes: 0, liked: false, createdAt: Date.now(), durationMs: dur });
      S.set("p11.user", user); ok++; last = "Загружено: " + title; sel = id; analyse(id);
    }
    setStatus(ok > 1 ? `Загружено треков: ${ok}` : last); listRender();
    if (ok) play("levelup", 0.3, 1.6);
  }
  const scr = $("#scr"); let dragN = 0;
  scr.addEventListener("dragenter", (e) => { e.preventDefault(); dragN++; scr.classList.add("drag"); });
  scr.addEventListener("dragover", (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; });
  scr.addEventListener("dragleave", () => { if (--dragN <= 0) { dragN = 0; scr.classList.remove("drag"); } });
  scr.addEventListener("drop", (e) => { e.preventDefault(); dragN = 0; scr.classList.remove("drag"); uploadFiles(e.dataTransfer.files); });
  addEventListener("dragover", (e) => e.preventDefault()); addEventListener("drop", (e) => e.preventDefault());
  $("#filePick").addEventListener("change", (e) => { uploadFiles(e.target.files); e.target.value = ""; });

  /* ================= подсказка предмета (appendHoverText) ================= */
  function ttHtml() {
    const c = (k, t) => `<div style="color:${MC[k]}">${esc(t)}</div>`;
    let h = `<div class="n">${esc(P.item.name)}</div>`;
    if (st.playing) { h += st.paused ? c("e", "⏸" + VS + " На паузе") : c("a", "▶" + VS + " Играет"); if (st.title) h += c(7, "♫ " + st.title); }
    else { h += c(7, "⏹" + VS + " Остановлено") + c("e", "ПКМ → Открыть плеер"); }
    return h + c(7, `Громкость: ${Math.floor(vol * 100)}%`);
  }
  const ttRender = () => { const h = ttHtml(); if (h !== ttRender.h) { ttRender.h = h; $("#heroTT").innerHTML = h; } };

  /* ================= 3D-модель ================= */
  function view3d(box, opt = {}) {
    let v = null, rot = { x: opt.rx ?? -16, y: opt.ry ?? 30 }, drag = null, last = 0, vis = true, bounce = 0;
    const iso = () => { box.innerHTML = `<img src="${T("iso/jbl_speaker")}" alt="" style="width:70%;height:70%;object-fit:contain;margin:15% auto;display:block">`; v = null; };
    function build() {
      box.innerHTML = ""; if (v && v.destroy) v.destroy(); v = null;
      if (!(window.ZMGL && ZMGL.supported())) return iso();
      const model = M.jbl_speaker, bb = ZMModel3D.bbox(model), r = box.getBoundingClientRect();
      const unit = Math.min(r.width || 300, r.height || 300) * (opt.fill || 0.6) / Math.max(...bb.size, 8);
      v = ZMGL.build(model, U("assets/textures/p11/"), { unit, persp: 1400, onFail: iso });
      if (!v) return;
      v.el.style.cssText = "width:100%;height:100%;display:block"; box.appendChild(v.el); apply();
    }
    const apply = () => v && v.setRot([["x", rot.x + bounce * 4], ["y", rot.y], ["z", bounce * 2 * Math.sin(performance.now() / 60)]]);
    box.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, rx: rot.x, ry: rot.y, m: false }; box.setPointerCapture(e.pointerId); });
    box.addEventListener("pointermove", (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.m = true; rot.y = drag.ry + dx * 0.5; rot.x = clamp(drag.rx - dy * 0.4, -80, 80); last = performance.now(); apply(); });
    const up = () => { if (drag && !drag.m && opt.onTap) opt.onTap(); drag = null; };
    box.addEventListener("pointerup", up); box.addEventListener("pointercancel", () => { drag = null; });
    box.addEventListener("contextmenu", (e) => e.preventDefault());
    new IntersectionObserver((es) => { vis = es[0].isIntersecting; }).observe(box);
    return { build, kick() { bounce = 1; }, tick(dt, now) {
      if (!v || !vis) return; bounce *= Math.pow(0.02, dt);
      if (!drag) { if (now - last > 1500 && !reduce) rot.y += dt * (opt.spin ?? 18); rot.x += ((opt.rx ?? -16) - rot.x) * Math.min(1, dt * (now - last > 1500 ? 1.5 : 0)); }
      apply();
    } };
  }
  const viewers = [];
  let noteI = 0;
  const hero3d = view3d($("#hero3d"), { fill: 0.74, rx: -14, ry: 30, onTap: () => { const n = [0, 5, 7, 12, 10, 7][noteI++ % 6]; note("bass", n + 6); note("bd", 12); hero3d.kick(); ringKick(1); } });
  viewers.push(hero3d);
  viewers.push(view3d($("#item3d"), { fill: 0.7, rx: -20, ry: 210, spin: 14 }));

  /* ================= кольца и эквалайзер в hero ================= */
  const rc = $("#rings"), rg = rc.getContext("2d"); const rings = [];
  const ringKick = (p) => rings.push({ r: 0.18, a: 0.9 * p });
  const eqEl = $("#eq"), EQN = innerWidth < 640 ? 28 : 56;
  eqEl.innerHTML = "<i></i>".repeat(EQN); const eqBars = $$("i", eqEl), eqV = new Float32Array(EQN);
  let prevBass = 0;
  function heroFx(dt, now) {
    const L = levels();
    document.documentElement.style.setProperty("--bass", L.bass.toFixed(3));
    document.documentElement.style.setProperty("--loud", L.loud.toFixed(3));
    if (L.bass - prevBass > 0.12 && L.bass > 0.45) ringKick(L.bass);
    prevBass = L.bass;
    const w = rc.clientWidth, h = rc.clientHeight; if (!w) return;
    if (rc.width !== w) { rc.width = w; rc.height = h; }
    rg.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.48, R = Math.min(w, h) / 2;
    for (let i = 1; i <= 4; i++) { rg.strokeStyle = `rgba(120,170,255,${0.05 + L.loud * 0.05})`; rg.lineWidth = 1; rg.beginPath(); rg.arc(cx, cy, R * (0.3 + i * 0.16), 0, 7); rg.stroke(); }
    for (const r of rings) { r.r += dt * 0.55; r.a *= Math.pow(0.18, dt); rg.strokeStyle = `rgba(255,120,60,${r.a})`; rg.lineWidth = 3 + r.a * 6; rg.beginPath(); rg.arc(cx, cy, R * r.r, 0, 7); rg.stroke(); }
    while (rings.length && rings[0].a < 0.02) rings.shift();
    for (let i = 0; i < EQN; i++) {
      const f = i / EQN, target = st.playing && !st.paused ? clamp(L.bass * Math.pow(1 - f, 0.7) * 0.9 + L.loud * (0.25 + 0.5 * Math.abs(Math.sin(i * 1.7 + now / 260))) * (0.4 + f * 0.6), 0.03, 1) : 0.03 + 0.02 * Math.sin(i * 0.6 + now / 700);
      eqV[i] += (target - eqV[i]) * Math.min(1, dt * 14);
      eqBars[i].style.transform = `scaleY(${(eqV[i] * 25).toFixed(2)})`;
    }
  }

  /* ================= II · в руке: хотбар, HUD, соседи ================= */
  const view = $("#gameView"), hudc = $("#hudc"), hctx = hudc.getContext("2d");
  const HB_ITEMS = [null, "iso/note_block", "iso/jukebox", "disc_pigstep", "disc_cat", null, null, "disc_otherside", null];
  let hbSel = S.get("p11.hbSel", 0), offJbl = S.get("p11.off", false);
  let gs = 3, hudR = 3;
  function gsCalc() {
    const w = view.clientWidth || 800; gs = clamp(w / 480, 1.1, 3.2); view.style.setProperty("--gs", gs);
    hudR = Math.ceil(gs * Math.min(2, devicePixelRatio || 1));
    if (hudc.width !== 140 * hudR) { hudc.width = 140 * hudR; hudc.height = 35 * hudR; }
  }
  const slotItem = (i) => (i === 0 ? (inv.jbl > 0 && !offJbl ? "iso/jbl_speaker" : null) : HB_ITEMS[i]);
  function hudHotbar() {
    const hb = $("#hbar");
    hb.innerHTML = Array.from({ length: 9 }, (_, i) => { const it = slotItem(i); return `<span class="sl" data-i="${i}" style="left:calc(${3 + i * 20}px*var(--gs))">${it ? `<img src="${T(it)}" alt="">` : ""}</span>`; }).join("")
      + `<span class="sel" style="left:calc(${-1 + hbSel * 20}px*var(--gs))"></span>`
      + `<span class="off" data-tip="Вторая рука" data-tip-info="F: поменять руки">${offJbl && inv.jbl > 0 ? `<img src="${T("iso/jbl_speaker")}" alt="">` : ""}</span>`;
    const empty = $("#gameEmpty");
    empty.hidden = inv.jbl > 0;
    empty.innerHTML = `Колонки нет в инвентаре.<br><a href="#craft">Скрафти</a> или возьми из креатива.`;
  }
  const holding = () => inv.jbl > 0 && (offJbl || hbSel === 0);
  $("#hbar").addEventListener("click", (e) => {
    if (e.target.closest(".off")) { swapHands(); return; }
    const s = e.target.closest(".sl"); if (!s) return; hbSel = +s.dataset.i; S.set("p11.hbSel", hbSel); hudHotbar();
  });
  function swapHands() { if (!inv.jbl) return; offJbl = !offJbl; S.set("p11.off", offJbl); play("equip", 0.4); hudHotbar(); }
  view.addEventListener("wheel", (e) => { e.preventDefault(); hbSel = (hbSel + (e.deltaY > 0 ? 1 : 8)) % 9; S.set("p11.hbSel", hbSel); hudHotbar(); }, { passive: false });
  let gameVis = false; new IntersectionObserver((es) => { gameVis = es[0].isIntersecting; }, { threshold: 0.3 }).observe(view);
  addEventListener("keydown", (e) => {
    if (!gameVis || /INPUT|TEXTAREA/.test(document.activeElement.tagName) || !md.hidden) return;
    if (/^[1-9]$/.test(e.key)) { hbSel = +e.key - 1; S.set("p11.hbSel", hbSel); hudHotbar(); }
    if (e.key === "f" || e.key === "F" || e.key === "а" || e.key === "А") swapHands();
  });

  // HUD: 1:1 с JBLSpeakerHUD.render
  const hud = { name: "", off: 0, delay: 0, cnt: 0 };
  const FONT = (px) => `${px}px ${getComputedStyle(document.body).getPropertyValue("--f-pixel") || "monospace"}`;
  let fontStr = "";
  function hudFrame() {
    const show = holding() && st.playing;   // isHudVisible() || isPlaying(stack)
    hudc.style.visibility = show ? "visible" : "hidden";
    if (!show) { hud.off = 0; hud.delay = 0; hud.cnt = 0; hud.name = ""; return; }
    if (!fontStr) fontStr = FONT(8);
    const g = hctx, R = hudR; g.setTransform(R, 0, 0, R, 0, 0); g.clearRect(0, 0, 140, 35);
    g.imageSmoothingEnabled = false; g.font = fontStr; g.textBaseline = "top";
    const txt = (s, x, y, c) => { g.fillStyle = "rgba(0,0,0,.35)"; g.fillText(s, x + 1, y + 1); g.fillStyle = c; g.fillText(s, x, y); };
    const W = 140, H = 35;
    g.fillStyle = "rgba(0,0,0,0.667)"; g.fillRect(0, 0, W, H);                    // 0xAA000000
    g.fillStyle = "#00ff00"; g.fillRect(0, 0, W, 1); g.fillRect(0, H - 1, W, 1); g.fillRect(0, 0, 1, H); g.fillRect(W - 1, 0, 1, H);
    txt("♫", 4, 4, Math.floor(Date.now() / 500) % 2 === 0 ? "#00ff00" : "#00ffaa");
    const vt = Math.floor(vol * 100) + "%", tw = g.measureText(vt).width;
    txt(vt, W - tw - 4, 4, "#00ff00");
    const name = (st.title || "").replace(".ogg", "");
    if (name !== hud.name) { hud.name = name; hud.off = 0; hud.delay = 0; hud.cnt = 0; }
    const ax = 16, ay = 4, aw = W - 20 - tw - 8, nw = g.measureText(name).width;
    if (nw <= aw) { txt(name, ax, ay, "#fff"); hud.off = 0; hud.delay = 0; hud.cnt = 0; }
    else if (hud.delay < 60) { hud.delay++; g.save(); g.beginPath(); g.rect(ax, 0, aw, H); g.clip(); txt(name, ax, ay, "#fff"); g.restore(); }   // SCROLL_DELAY_FRAMES
    else {
      g.save(); g.beginPath(); g.rect(ax, ay, aw, 10); g.clip();
      txt(name, ax - hud.off, ay, "#fff");
      if (hud.off > 20) txt(name, ax - hud.off + nw + 30, ay, "#fff");         // бесшовный повтор
      g.restore();
      if (++hud.cnt >= 20) { hud.cnt = 0; hud.off += 1; }                       // SCROLL_TICK_DELAY
      if (hud.off > nw + 30) hud.off = 0;
    }
    const bx = 4, by = 20, bw = W - 8, bh = 8;
    g.fillStyle = "#222222"; g.fillRect(bx, by, bw, bh);
    const fw = Math.floor(bw * vol);
    if (fw > 0) { g.fillStyle = vol > 0.66 ? "#00ff00" : vol > 0.33 ? "#ffff00" : "#ff0000"; g.fillRect(bx, by, fw, bh); }
    g.fillStyle = "#00ff00"; g.fillRect(bx, by, bw, 1); g.fillRect(bx, by + bh - 1, bw, 1); g.fillRect(bx, by, 1, bh); g.fillRect(bx + bw - 1, by, 1, bh);
  }

  // громкость
  const volEl = $("#vol");
  function volRender() {
    volEl.value = Math.round(vol * 100); $("#volT").textContent = Math.floor(vol * 100) + "%";
    $("#volQ").innerHTML = `Полоска в HUD: <span style="color:#ff5555">красная</span> до 33%, <span style="color:#ffff55">жёлтая</span> до 66%, <span style="color:#55ff55">зелёная</span> выше. По умолчанию 100%.`;
  }
  volEl.addEventListener("input", () => { vol = +volEl.value / 100; S.set("p11.vol", vol); setAuVol(); volRender(); nbtBump(["Volume"]); if (Math.random() < 0.3) note("hat", Math.round(vol * 24)); });

  // «Максимальная громкость!»: 300 тиков подряд (inventoryTick, пока колонка в инвентаре)
  let fvTicks = 0;
  function fvTick() {
    const active = st.playing && !st.paused;
    if (inv.jbl > 0 && active && vol >= 1) {
      fvTicks++;
      if (fvTicks >= 300) { grant("jbl_full_volume"); fvTicks = 0; }
    } else fvTicks = 0;
  }
  function fvRender() {
    $("#fvBar").style.width = (fvTicks / 300) * 100 + "%"; $("#fvT").textContent = `${fvTicks} / 300`;
    const why = !inv.jbl ? "Колонки нет в инвентаре: счётчик стоит." : !st.playing ? "Ничего не играет." : st.paused ? "Пауза: счётчик сброшен." : vol < 1 ? "Громкость ниже 100%: счётчик сброшен." : `Идёт отсчёт: ещё ${((300 - fvTicks) / 20).toFixed(1).replace(".", ",")} с.`;
    const h = why + " В руке держать не обязательно, хватит и инвентаря. Любая пауза или меньше 100% обнуляет отсчёт.";
    if (h !== fvRender.h) { fvRender.h = h; $("#fvP").textContent = h; }
  }

  // соседи: жители реагируют на громкость (это шутка страницы, не механика мода)
  const vface = T("villager_face");
  $("#nbRow").innerHTML = [0, 1, 2].map(() => `<span style="background-image:url('${vface}')"></span>`).join("");
  let nbT = 0;
  function nbRender(dt) {
    const loudNow = st.playing && !st.paused ? vol : 0, mad = loudNow > 0.66, hmm = loudNow > 0.1;
    $$("#nbRow span").forEach((s, i) => { s.classList.toggle("mad", mad && (i < 2 || loudNow >= 1)); s.style.filter = hmm ? "" : "brightness(.45)"; });
    const q = !hmm ? "спят" : mad ? (loudNow >= 1 ? "в ярости" : "злятся") : "ворочаются";
    if ($("#nbQ").textContent !== q) $("#nbQ").textContent = q;
    if (mad && gameVis && (nbT -= dt) <= 0) { nbT = 4 + Math.random() * 4; play(pick(["villager_no", "villager_hmm", "villager_haggle", "villager_hmm2"]), 0.5 * vol, 0.9 + Math.random() * 0.25); }
  }

  // частицы в сцене: ноты у колонки, злые жители у колодца
  const fx = $("#gameFx"), fg = fx.getContext("2d"); const parts = [];
  const noteImg = new Image(); noteImg.src = T("note"); const angryImg = new Image(); angryImg.src = T("angry");
  const heldImg = new Image(); heldImg.src = T("iso/jbl_speaker");
  const tinted = {};
  function noteSprite(n) {   // цвет ноты как у NoteParticle: f = нота/24
    if (tinted[n]) return tinted[n];
    if (!noteImg.complete || !noteImg.naturalWidth) return null;
    const f = n / 24, c = document.createElement("canvas"); c.width = c.height = 8; const g = c.getContext("2d");
    const col = [0, 1 / 3, 2 / 3].map((o) => Math.round(Math.max(0, Math.sin((f + o) * Math.PI * 2) * 0.65 + 0.35) * 255));
    g.drawImage(noteImg, 0, 0, 8, 8); g.globalCompositeOperation = "multiply"; g.fillStyle = `rgb(${col})`; g.fillRect(0, 0, 8, 8);
    g.globalCompositeOperation = "destination-in"; g.drawImage(noteImg, 0, 0, 8, 8);
    return (tinted[n] = c);
  }
  let spawnT = 0;
  function sceneFx(dt, now) {
    const w = fx.clientWidth, h = fx.clientHeight; if (!w) return;
    const R = Math.min(2, devicePixelRatio || 1);
    if (fx.width !== Math.round(w * R)) { fx.width = Math.round(w * R); fx.height = Math.round(h * R); }
    fg.setTransform(R, 0, 0, R, 0, 0); fg.clearRect(0, 0, w, h); fg.imageSmoothingEnabled = false;
    const L = lvl, active = st.playing && !st.paused;
    // колонка в руке (вид от первого лица)
    if (inv.jbl > 0 && holding()) {
      const sz = h * 0.42, bob = active ? L.bass * sz * 0.06 : Math.sin(now / 900) * 2;
      const x = offJbl ? w * 0.06 : w - sz * 1.05, y = h - sz * 0.92 + bob;
      if (heldImg.complete) { fg.save(); fg.translate(x + sz / 2, y + sz / 2); fg.rotate((offJbl ? 1 : -1) * 0.12); fg.drawImage(heldImg, -sz / 2, -sz / 2, sz, sz); fg.restore(); }
      if (active && holding() && (spawnT -= dt * (0.6 + L.bass * 3)) <= 0) {
        spawnT = 0.35; parts.push({ k: "n", x: x + sz * (0.3 + Math.random() * 0.4), y: y + sz * 0.2, vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 40, life: 1.6, n: rnd(25) });
      }
    }
    if (active && vol > 0.66 && Math.random() < dt * 2.2 * vol) parts.push({ k: "a", x: w * (0.5 + Math.random() * 0.25), y: h * (0.46 + Math.random() * 0.06), vx: 0, vy: -12, life: 1.2 });
    for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
    const ps = Math.max(12, gs * 8);
    for (const p of parts) {
      fg.globalAlpha = clamp(p.life, 0, 1);
      if (p.k === "n") { const s = noteSprite(p.n); if (s) fg.drawImage(s, p.x, p.y, ps, ps); }
      else if (angryImg.complete) fg.drawImage(angryImg, p.x, p.y, ps * 1.2, ps * 1.2);
    }
    fg.globalAlpha = 1;
  }

  /* ================= III · колонка: грани, NBT ================= */
  $("#faces").innerHTML = [["face_front", "перёд и зад"], ["face_speaker", "динамик"], ["face_speaker2", "динамик"], ["face_top", "кнопки"], ["face_bottom", "низ"]]
    .map(([k, n]) => `<div><img src="${T(k)}" alt="">${n}</div>`).join("");
  $("#nbtLeg").innerHTML = P.nbt.map(([k, d]) => `<div><b>${k}</b>${esc(d)}</div>`).join("");
  const nbtChg = {};
  const nbtBump = (keys) => { const t = performance.now(); keys.forEach((k) => (nbtChg[k] = t)); };
  function snbt() {
    const now = performance.now(), cls = (k) => (now - (nbtChg[k] || -1e9) < 1200 ? " chg" : "");
    const s = (v) => `<span class="s">"${esc(v)}"</span>`, n = (v, suf) => `<span class="n">${v}${suf}</span>`, b = (v) => `<span class="b">${v ? "1b" : "0b"}</span>`;
    const rows = [["Playing", b(st.playing)], ["Paused", b(st.paused)], ["CurrentTrackId", s(st.trackId)], ["CurrentTrackTitle", s(st.title)], ["CurrentTrackAuthor", s(st.author)],
      ["Volume", n(vol.toFixed(2).replace(/0$/, "").replace(/\.$/, ".0"), "f")], ["PlaybackStartGameTime", n(st.startTick, "L")], ["PlaybackDurationMs", n(st.dur, "L")], ["PlaybackPositionMs", n(st.posMs, "L")]];
    return `<span class="p">{</span><span class="k">id</span>: ${s(P.item.id)}, <span class="k">Count</span>: ${n(1, "b")}, <span class="k">tag</span>: <span class="p">{</span>\n`
      + rows.map(([k, v]) => `  <span class="${cls(k).trim()}"><span class="k">${k}</span>: ${v}</span>`).join(",\n") + `\n<span class="p">}}</span>`;
  }
  let nbtVis = false; new IntersectionObserver((es) => { nbtVis = es[0].isIntersecting; }).observe($("#snbt"));
  const nbtRender = () => { if (!nbtVis) return; const h = snbt(); if (h !== nbtRender.h) { nbtRender.h = h; $("#snbt").innerHTML = h; } };
  $("#ruGrid").innerHTML = P.rules.map(([ic, t, p]) => `<div class="ru11"><img src="${T(ic)}" alt=""><b>${esc(t)}</b><p>${esc(p)}</p></div>`).join("");

  /* ================= IV · сеть ================= */
  const netBox = $("#netBox"), fly = $("#netFly"), log = $("#netLog");
  $("#netMe").src = ZM.profile ? ZM.profile.avatarUrl(me().avatar) : U("assets/textures/hub/av/steve.png");
  $("#netMeN").textContent = me().nick;
  const t0 = performance.now();
  function netLog(dir, text) {
    const s = ((performance.now() - t0) / 1000).toFixed(1).padStart(6, " ");
    const p = document.createElement("p"); p.innerHTML = `<span class="t">${s}</span><span class="${dir}">${dir === "c2s" ? "→ сервер" : dir === "s2c" ? "← клиенту" : "✓"}</span> ${esc(text)}`;
    log.appendChild(p); while (log.children.length > 60) log.firstChild.remove(); log.scrollTop = log.scrollHeight;
  }
  const POS = { me: [15, 50], srv: [50, 50], a: [85, 20], b: [85, 50], c: [85, 80] };
  let netVis = false; new IntersectionObserver((es) => { netVis = es[0].isIntersecting; }).observe(netBox);
  function flyOne(from, to, cls, ms, html) {
    return new Promise((res) => {
      if (!netVis || reduce) return setTimeout(res, 40);
      const el = document.createElement(html ? "img" : "i"); if (html) el.src = html; else el.className = cls; fly.appendChild(el);
      const [x1, y1] = POS[from], [x2, y2] = POS[to], t1 = performance.now();
      (function step(t) { const k = Math.min(1, (t - t1) / ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        el.style.left = x1 + (x2 - x1) * e + "%"; el.style.top = y1 + (y2 - y1) * e - Math.sin(k * Math.PI) * 8 + "%";
        if (k < 1) requestAnimationFrame(step); else { el.remove(); res(); } })(t1);
    });
  }
  const hot = (sel2, on) => $$(sel2, netBox).forEach((n) => n.classList.toggle("hot", on));
  let netQ = Promise.resolve();
  function netUpload(name, size) {
    const chunks = clamp(Math.ceil(size / 262144), 3, 14);
    const job = async () => {
      hot(".nn.me", true);
      netLog("c2s", `UploadTrackStart · ${name} · ${(size / 1048576).toFixed(2).replace(".", ",")} МБ`);
      await flyOne("me", "srv", "", 380);
      for (let i = 1; i <= chunks; i++) { if (i === 1 || i === chunks || i % 3 === 0) netLog("c2s", `UploadTrackChunk · ${i}/${chunks}`); await flyOne("me", "srv", "", 260); }
      netLog("c2s", "UploadTrackFinish"); hot(".nn.srv", true);
      await flyOne("me", "srv", "", 300);
      netLog("ok", "трек в библиотеке сервера");
      netLog("s2c", "SyncSpeakerLibrary"); await flyOne("srv", "me", "s2c", 420);
      hot(".nn", false);
    };
    netQ = netQ.then(job); return netQ;
  }
  function netSelect(t) {
    netQ = netQ.then(async () => {
      hot(".nn.me", true); netLog("c2s", "SelectTrack · " + t.title);
      await flyOne("me", "srv", "", 380); hot(".nn.srv", true);
      netLog("s2c", "звук всем, кто видит игрока: Alex, Житель (Steve далеко)");
      hot(".nn.pl:not(.far)", true);
      const n = T("note");
      await Promise.all([flyOne("srv", "a", "s2c", 520, n), flyOne("srv", "b", "s2c", 520, n), flyOne("srv", "me", "s2c", 520, n)]);
      setTimeout(() => hot(".nn", false), 700);
    });
  }
  $("#netRun").addEventListener("click", () => { play("click", 0.5); netUpload("деревенский_бас.ogg", 3.4 * 1048576); });

  /* ================= V · крафт ================= */
  const R = P.recipe;
  let cyc = 0;
  function craftRender() {
    const cells = R.pattern.join("").split("");
    const btn = R.key.E.cycle[cyc % R.key.E.cycle.length];
    $("#craftGrid").innerHTML = `<span class="ttl">Создание</span>` + cells.map((ch, i) => {
      const k = R.key[ch], icon = ch === "E" ? `iso/${btn[0]}_button` : k.icon, name = ch === "E" ? btn[1] : k.name, sub = ch === "E" ? "#" + k.tag : k.id;
      return `<span class="c11" style="left:${(30 + (i % 3) * 18) / 176 * 100}%;top:${(17 + Math.floor(i / 3) * 18) / 80 * 100}%"><img class="${k.px ? "px" : ""}" src="${T(icon)}" alt="" data-tip="${esc(name)}" data-tip-sub="${esc(sub)}"${ch === "E" ? ' data-tip-info="любая кнопка из тега"' : ""}></span>`;
    }).join("") + `<span class="c11 res" id="craftRes" style="left:${124 / 176 * 100}%;top:${35 / 80 * 100}%" data-tip="${esc(P.item.name)}" data-tip-sub="${P.item.id}" data-tip-info="клик: забрать"><img src="${T("iso/jbl_speaker")}" alt=""></span>`;
  }
  $("#craftGrid").addEventListener("click", (e) => { if (!e.target.closest("#craftRes")) return; giveJbl(); });
  $("#creativeTake").addEventListener("click", () => giveJbl());
  function invRender(bump) {
    const s = $("#invSlot"); s.classList.toggle("zero", !inv.jbl); $("#invN").textContent = inv.jbl > 1 ? inv.jbl : "";
    if (bump) { s.classList.remove("bump"); void s.offsetWidth; s.classList.add("bump"); }
    $("#craftMsg").innerHTML = inv.jbl ? `Колонок в инвентаре: <b style="color:#fff">${inv.jbl}</b>. Стак 1, так что каждая занимает свой слот. Иди в раздел <a href="#hud" style="color:#55ff55">«В руке»</a>: там HUD и отсчёт до ачивки.`
      : `Клик по результату справа забирает колонку. Материалы считаем, что есть: это не выживание.`;
  }

  /* ================= VI · достижения ================= */
  $("#advBoard").style.setProperty("--tile", `url("${new URL(T("blue_wool"), location.href).href}")`);
  const FRAME_RU = { task: "обычная", goal: "цель", challenge: "испытание" };
  renderTree = function (pulse) {
    const vis = ADV.filter((a) => got.includes(a.key) || !a.hidden), hidden = ADV.length - vis.length;
    if (!advSel || !vis.some((a) => a.key === advSel)) advSel = vis.length ? vis[vis.length - 1].key : null;
    const icon = (a, px) => `<span class="ic" style="width:${px}px;height:${px}px"><img src="${T(a.icon)}" alt=""></span>`;
    let html = vis.map((a, i) => (i ? `<div class="adv-link on"></div>` : "") + `<button type="button" class="adv-node ${pulse === a.key ? "pulse" : ""} ${advSel === a.key ? "sel" : ""}" data-k="${a.key}" aria-label="${esc(a.title)}"><span class="adv-frame ${a.frame}"></span>${icon(a, 32)}</button>`).join("");
    if (hidden) html += vis.length ? `<div class="adv-link"></div><div class="adv-more">+${hidden} скрыто</div>` : `<div class="adv-node"><span class="adv-frame task locked"></span><span class="q">?</span></div><div class="adv-link"></div><div class="adv-more">+${hidden} скрыто</div>`;
    $("#advChain").innerHTML = html;
    const a = ADV.find((x) => x.key === advSel);
    $("#advDetail").innerHTML = a
      ? `<div class="big"><span class="adv-frame ${a.frame}"></span>${icon(a, 38)}</div><div class="txt"><div class="tt">${titleH(a)}</div><div class="dd">${esc(a.desc)}</div><div class="cc">${esc(a.how)}</div></div><div class="meta"><span>${FRAME_RU[a.frame]}</span>${a.xp ? `<span>+${a.xp} XP</span>` : ""}</div>`
      : `<div class="big"><span class="adv-frame task locked"></span><span class="q">?</span></div><div class="txt"><div class="tt">Скрыто</div><div class="dd">Обе ачивки скрыты. Крафти и включай погромче.</div></div>`;
    $("#advList").innerHTML = ADV.map((x) => got.includes(x.key)
      ? `<button type="button" class="adv-row has" data-k="${x.key}"><span class="fr"><span class="adv-frame ${x.frame}"></span>${icon(x, 26)}</span><span><span class="t">${titleH(x)}</span><span class="d">${esc(x.desc)}</span></span></button>`
      : `<div class="adv-row locked mystery"><span class="fr"><span class="adv-frame task locked"></span><span class="q">?</span></span><span><span class="t">???</span><span class="d">скрытое достижение: откроется, когда получишь</span></span></div>`).join("");
    const done = ADV.filter((x) => got.includes(x.key)), xp = done.reduce((s, x) => s + x.xp, 0), xpAll = ADV.reduce((s, x) => s + x.xp, 0);
    $("#advBar").style.width = (done.length / ADV.length) * 100 + "%";
    $("#advTxt").textContent = `${done.length} / ${ADV.length} · ${xp}/${xpAll} XP`;
    $("#stGot").textContent = `${done.length}/${ADV.length}`;
  };
  $("#advQ").textContent = ADV.length + " " + plural(ADV.length, "ачивка", "ачивки", "ачивок");
  const pickAdv = (e) => { const n = e.target.closest("[data-k]"); if (!n) return; advSel = n.dataset.k; renderTree(); };
  $("#advChain").addEventListener("click", pickAdv); $("#advList").addEventListener("click", pickAdv);
  $("#advReset").addEventListener("click", () => { got = []; S.set("p11.adv", got); advSel = null; renderTree(); });

  /* ================= VII · история ================= */
  $("#timeline").innerHTML = P.history.map((h) => `<div class="tl11" style="--c:${h.c}"><img src="${T(h.icon)}" alt=""><div>
    <div class="tl11-top"><span class="tl11-v">${h.ver === h.date ? esc(h.date) : "v" + esc(h.ver)}</span>${h.ver !== h.date ? `<span class="tl11-d">${esc(h.date)}</span>` : ""}<span class="tl11-t">${esc(h.tag)}</span></div><b>${esc(h.title)}</b><p>${esc(h.text)}</p></div></div>`).join("");

  /* ================= финал ================= */
  const nav = ZM.pointNav(11);
  $("#finNav").innerHTML = [nav.prev && `<a href="${U(nav.prev.href)}">← №${String(nav.prev.n).padStart(2, "0")} ${esc(nav.prev.title)}</a>`,
    `<a href="${U("index.html")}">Все пункты</a>`,
    nav.next && `<a href="${U(nav.next.href)}">№${String(nav.next.n).padStart(2, "0")} ${esc(nav.next.title)} →</a>`].filter(Boolean).join("");
  let finN = 0;
  $("#finSp").addEventListener("click", () => {
    const b = $("#finSp"); b.classList.remove("hit"); void b.offsetWidth; b.classList.add("hit");
    note("bass", [0, 0, 7, 5][finN % 4] + 3); note("bd", 10); finN++;
    if (!reduce) { document.body.classList.remove("shake"); void document.body.offsetWidth; document.body.classList.add("shake"); setTimeout(() => document.body.classList.remove("shake"), 460); }
    lvl.bass = 1; ringKick(1);
    if (finN % 5 === 0) { play("villager_no", 0.6); chat(`<span style="color:#aaa">&lt;Житель&gt;</span> Хмм! Хмм!!`); }
  });

  /* ================= мини-плеер ================= */
  let scrVis = true; new IntersectionObserver((es) => { scrVis = es[0].isIntersecting; }).observe($("#scr"));
  $("#miniPlay").addEventListener("click", () => { play("click", 0.5); togglePlayPause(); });
  function miniRender() {
    const show = st.playing && !scrVis; $("#mini").hidden = !show;
    if (show) { const t = (st.paused ? "⏸ " : "♫ ") + st.title; if ($("#miniT").textContent !== t) $("#miniT").textContent = t; const b = (st.paused ? "▶" : "⏸") + VS; if ($("#miniPlay").textContent !== b) $("#miniPlay").textContent = b; }
  }

  /* ================= общий цикл ================= */
  function refreshAll() { listRender(); barRender(); ttRender(); }
  let last = performance.now(), acc = 0;
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    acc += dt * 20; let n = Math.floor(acc); acc -= n;
    for (let i = 0; i < n; i++) { tick++; fvTick(); }
    heroFx(dt, now); hudFrame(); sceneFx(dt, now); nbRender(dt);
    seekRender(); ttRender(); fvRender(); miniRender();
    if (n) nbtRender();
    viewers.forEach((v) => v.tick(dt, now));
    requestAnimationFrame(loop);
  }
  addEventListener("resize", () => { gsCalc(); });
  setInterval(() => { cyc++; craftRender(); }, 1000);   // тег в слоте: предметы сменяются раз в секунду

  // старт
  syncSnd(); gsCalc(); hudHotbar(); volRender(); craftRender(); invRender(); renderTree(); refreshAll();
  netLog("ok", "канал zitraksmode:jbl_speaker_channel, протокол 1");
  idb.open().then(async () => {
    for (const t of user.slice()) { const b = await idb.get(t.trackId); if (b) blobs[t.trackId] = URL.createObjectURL(b); }
    const lost = user.filter((t) => !blobs[t.trackId]).length;
    if (lost) { user = user.filter((t) => blobs[t.trackId]); S.set("p11.user", user); }
    listRender();
  });
  requestAnimationFrame(() => viewers.forEach((v) => v.build()));
  ZM.reveal();
  requestAnimationFrame(loop);
  ZM.p11 = { st, grant, giveJbl, playTrack, library, setPaused, inv, uploadFiles, get vol() { return vol; }, set vol(v) { vol = v; setAuVol(); volRender(); }, fv: () => fvTicks };
})();
