/* Общий набор для страниц №14+: ZM.kit — тост, чат в стиле игры, звуки страницы, ачивки-ветка, крафт, история, финал. */
(function () {
  const { $, esc } = ZM, U = ZM.url;
  const MC = { 0: "#000", 1: "#0000AA", 2: "#00AA00", 3: "#00AAAA", 4: "#AA0000", 5: "#AA00AA", 6: "#FFAA00", 7: "#AAAAAA", 8: "#555555", 9: "#5555FF", a: "#55FF55", b: "#55FFFF", c: "#FF5555", d: "#FF55FF", e: "#FFFF55", f: "#FFFFFF" };
  const mcHtml = (s) => { let out = "", col = "f", bold = false; String(s).split(/(§[0-9a-flr])/).forEach((p) => { if (/^§/.test(p)) { if (p[1] === "l") bold = true; else { col = p[1] === "r" ? "f" : p[1]; if (p[1] === "r") bold = false; } } else if (p) out += `<span style="color:${MC[col]}${bold ? ";font-weight:700" : ""}">${esc(p)}</span>`; }); return out; };
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; };
  const pad2 = (n) => String(n).padStart(2, "0");
  let tt = 0;
  function say(t, bad) { let el = $(".k-toast"); if (!el) { el = document.createElement("div"); el.className = "k-toast"; el.setAttribute("role", "status"); document.body.appendChild(el); } el.innerHTML = /§/.test(t) ? mcHtml(t) : esc(t); el.className = "k-toast on" + (bad ? " bad" : ""); clearTimeout(tt); tt = setTimeout(() => el.classList.remove("on"), 2600); }
  function chat(sel, t, max = 4) { const log = typeof sel === "string" ? $(sel) : sel; if (!log) return; const r = document.createElement("div"); r.innerHTML = mcHtml(t); log.appendChild(r); while (log.children.length > max) log.firstChild.remove(); setTimeout(() => r.classList.add("old"), 9000); }
  // звуки страницы (assets/sounds/pNN/*.ogg)
  function sounds(dir) {
    const pool = {};
    return function (name, vol = 0.5, rate = 1) {
      if (!ZM.sfx.on()) return null;
      const url = U(`assets/sounds/${dir}/${name}.ogg`);
      try { const a = (pool[url] || (pool[url] = new Audio(url))).cloneNode(); a.volume = Math.min(1, vol * 0.5); a.playbackRate = rate; a.preservesPitch = false; a.play().catch(() => {}); ZM.lastSound = performance.now(); return a; } catch (e) { return null; }
    };
  }
  /* ветка ачивок: list [{key,title,color,frame,xp,icon,desc,how,chat}] — цепочка по порядку, скрыты до получения */
  function adv({ list, store, icon, onGrant, chatSel, intro }) {
    let got = ZM.store.get(store, []).filter((k) => list.some((a) => a.key === k)), sel = null;
    const titleH = (a) => `<span style="color:${MC[a.color] || "#fff"}${a.bold ? ";font-weight:700" : ""}">${esc(a.title)}</span>`;
    const FR = { task: "Достижение", goal: "Цель", challenge: "Испытание" };
    const ic = (a, px) => `<span class="ic" style="width:${px}px;height:${px}px"><img src="${icon(a)}" alt=""></span>`;
    function render(pulse) {
      const vis = list.filter((a) => got.includes(a.key)), hid = list.length - vis.length;
      if (!sel || !vis.some((a) => a.key === sel)) sel = vis.length ? vis[vis.length - 1].key : null;
      let h = vis.map((a, i) => (i ? `<div class="adv-link on"></div>` : "") + `<button type="button" class="adv-node ${pulse === a.key ? "pulse" : ""} ${sel === a.key ? "sel" : ""}" data-k="${a.key}" aria-label="${esc(a.title)}"><span class="adv-frame ${a.frame}"></span>${ic(a, 30)}</button>`).join("");
      if (hid) h += vis.length ? `<div class="adv-link"></div><div class="adv-more">+${hid} скрыто</div>` : `<div class="adv-node"><span class="adv-frame task locked"></span><span class="q">?</span></div><div class="adv-link"></div><div class="adv-more">+${hid} скрыто</div>`;
      $("#advChain").innerHTML = h;
      const a = list.find((x) => x.key === sel);
      $("#advDetail").innerHTML = a
        ? `<div class="big"><span class="adv-frame ${a.frame}"></span>${ic(a, 38)}</div><div class="txt"><div class="tt">${titleH(a)}</div><div class="dd">${esc(a.desc)}</div>${a.how ? `<div class="cc">${esc(a.how)}</div>` : ""}</div><div class="meta"><span>${FR[a.frame] || ""}</span><span>+${a.xp} XP</span></div>`
        : `<div class="big"><span class="adv-frame task locked"></span><span class="q">?</span></div><div class="txt"><div class="tt">Скрыто</div><div class="dd">${esc(intro || "Все ачивки скрыты, как в игре.")}</div></div>`;
      $("#advList").innerHTML = list.map((x) => got.includes(x.key)
        ? `<button type="button" class="adv-row has" data-k="${x.key}"><span class="fr"><span class="adv-frame ${x.frame}"></span>${ic(x, 26)}</span><span><span class="t">${titleH(x)}</span><span class="d">${esc(x.desc)}</span></span><em>+${x.xp} XP</em></button>`
        : `<div class="adv-row locked"><span class="fr"><span class="adv-frame task locked"></span><span class="q">?</span></span><span><span class="t">???</span><span class="d">скрытое достижение: откроется, когда получишь</span></span></div>`).join("");
      $("#advBar").style.width = (vis.length / list.length) * 100 + "%";
      $("#advTxt").textContent = `${vis.length} / ${list.length} · ${vis.reduce((s, x) => s + x.xp, 0)} XP`;
      const g = $("#stGot"); if (g) g.textContent = `${vis.length}/${list.length}`;
    }
    function grant(key) {
      if (got.includes(key)) return false; const a = list.find((x) => x.key === key); if (!a) return false;
      const i = list.indexOf(a); if (i > 0 && !got.includes(list[i - 1].key) && !a.free) grant(list[i - 1].key);
      got.push(key); ZM.store.set(store, got); sel = key;
      ZM.toast({ iconHtml: `<img src="${icon(a)}" alt="" style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated">`, title: titleH(a), frame: a.frame });
      if (chatSel && a.chat !== false) chat(chatSel, `${ZM.profile.me().nick} ${a.frame === "challenge" ? "завершил испытание" : a.frame === "goal" ? "достиг цели" : "получил достижение"} §a[${a.title}]`);
      render(key); onGrant && onGrant(a); return true;
    }
    const q = $("#advQ"); if (q) q.textContent = `${list.length} ${plural(list.length, "ачивка", "ачивки", "ачивок")} · ${list.reduce((s, a) => s + a.xp, 0)} XP`;
    const pick = (e) => { const n = e.target.closest("[data-k]"); if (!n) return; sel = n.dataset.k; render(); };
    $("#advChain").addEventListener("click", pick); $("#advList").addEventListener("click", pick);
    $("#advReset").addEventListener("click", () => { got = []; ZM.store.set(store, got); sel = null; render(); });
    render();
    return { grant, has: (k) => got.includes(k), render };
  }
  // окно крафта: pattern ["ABA",...], key {A:{src,name,id}}, result {src,name,id}
  function craft(el, { pattern, key, result, count, onTake }) {
    const cells = pattern.map((r) => r.padEnd(3, " ")).join("").split("");
    el.innerHTML = `<div class="k-craft"><div class="ct">Верстак</div><div class="cb"><div class="cg">${cells.map((c) => { const k = key[c]; return k ? `<span class="k-slot" data-tip="${esc(k.name)}" data-tip-sub="${esc(k.id)}"><img src="${k.src}" alt="${esc(k.name)}"></span>` : `<span class="k-slot"></span>`; }).join("")}</div><div class="ca"></div><button type="button" class="k-slot cr" data-tip="${esc(result.name)}" data-tip-sub="${esc(result.id)}" aria-label="Забрать: ${esc(result.name)}"><img src="${result.src}" alt="">${count > 1 ? `<b>${count}</b>` : ""}</button></div></div>`;
    const r = el.querySelector(".cr");
    r.addEventListener("click", () => { r.classList.remove("got"); void r.offsetWidth; r.classList.add("got"); ZM.sfx("pop", 0.5, 1.2); onTake && onTake(); });
  }
  function timeline(el, items) { el.style.setProperty("--n", items.length); el.innerHTML = items.map((h) => `<div style="--c:${h.c || ""}"><div class="d"><i></i></div><div class="b"><span class="v">${h.ver ? "v" + esc(h.ver) : "релиз"}</span><span class="dt">${esc(h.date)}</span><b>${esc(h.t)}</b><p>${esc(h.d)}</p></div></div>`).join(""); }
  function finNav(n, el) { const nav = ZM.pointNav(n); el.innerHTML = [nav.prev && `<a href="${U(nav.prev.href)}">← №${pad2(nav.prev.n)} ${esc(nav.prev.title)}</a>`, `<a href="${U("index.html")}">Все пункты</a>`, nav.next && `<a href="${U(nav.next.href)}">№${pad2(nav.next.n)} ${esc(nav.next.title)} →</a>`].filter(Boolean).join(""); }
  function dl(el, rows) { el.innerHTML = rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join(""); }
  // вращение мышью/пальцем для canvas-моделей
  function spinner(el, st = { ry: 20, rx: 0 }, lim = 60) {
    let drag = null; st.last = -1e9;
    el.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, ry: st.ry, rx: st.rx }; try { el.setPointerCapture(e.pointerId); } catch (_) {} });
    el.addEventListener("pointermove", (e) => { if (!drag) return; st.ry = drag.ry + (e.clientX - drag.x) * 0.6; st.rx = Math.max(-lim, Math.min(lim, drag.rx + (e.clientY - drag.y) * 0.4)); st.last = performance.now(); });
    const up = () => (drag = null); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    st.idle = () => !drag && performance.now() - st.last > 1500;
    return st;
  }
  ZM.kit = { MC, mcHtml, plural, pad2, say, chat, sounds, adv, craft, timeline, finNav, dl, spinner };
})();
