/* =====================================================================
   №01 · ЦИФРОБЛОКИ · app.js
   ===================================================================== */
(function () {
  /* ╔══════════════════════════════════════════════════════════════════╗
     ║  СЕКРЕТНЫЙ КОД. Поменял число здесь, и поменялось всё остальное  ║
     ║  (выдача ачивки в «Собери число», название ачивки, подсказки).   ║
     ╚══════════════════════════════════════════════════════════════════╝ */
  const SECRET_CODE = "1337";
  /* ══════════════════════════════════════════════════════════════════ */

  const { $, $$, esc, store, mcText } = ZM;
  const D = ZM.P01;
  const P = D.props;
  const byId = Object.fromEntries(D.blocks.map((b) => [b.id, b]));
  const advByKey = Object.fromEntries(D.advancements.map((a) => [a.key, a]));
  const DIGIT_ID = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  const nameOf = (id) => D.names[id] || D.names["zitraksmode:" + id] || id;
  const FRAME_RU = { task: "обычная", goal: "цель", challenge: "испытание" };

  /* ---------------- прогресс ---------------- */
  let got = new Set(store.get("p01.adv", []));
  let inv = store.get("p01.inv", {});
  const save = () => { store.set("p01.adv", [...got]); store.set("p01.inv", inv); };

  ZM.topbar({ crumb: "№01 · Цифроблоки", ...ZM.pointNav(1) });

  /* =====================================================================
     1. ФОН: чёрно-белый водопад цифр
     ===================================================================== */
  const rain = (() => {
    const cv = $("#rain"), cx = cv.getContext("2d");
    let W, H, cols, drops, speed, fs, mouse = { x: -999, y: -999 }, focus = null, last = 0;
    function resize() {
      W = cv.width = innerWidth; H = cv.height = innerHeight;
      fs = W < 600 ? 14 : 18;
      cols = Math.ceil(W / fs);
      drops = Array.from({ length: cols }, () => Math.random() * -H / fs);
      speed = Array.from({ length: cols }, () => 0.35 + Math.random() * 0.75);
      cx.fillStyle = "#000"; cx.fillRect(0, 0, W, H);
    }
    function frame(t) {
      requestAnimationFrame(frame);
      if (t - last < 33) return;
      last = t;
      cx.fillStyle = "rgba(0,0,0,0.085)";
      cx.fillRect(0, 0, W, H);
      cx.font = `700 ${fs}px "JetBrains Mono", monospace`;
      cx.textAlign = "center";
      for (let i = 0; i < cols; i++) {
        const x = i * fs + fs / 2, y = drops[i] * fs;
        const ch = focus != null && Math.random() < 0.55 ? focus : (Math.random() * 10) | 0;
        const d = Math.hypot(x - mouse.x, y - mouse.y);
        const near = d < 140 ? 1 - d / 140 : 0;
        cx.fillStyle = `rgba(255,255,255,${Math.min(1, 0.35 + near * 0.9 + (Math.random() < 0.02 ? 0.6 : 0))})`;
        cx.fillText(ch, x, y);
        drops[i] += speed[i] * (1 + near * 1.5);
        if (y > H && Math.random() > 0.975) drops[i] = Math.random() * -20;
      }
    }
    addEventListener("resize", resize);
    addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    document.addEventListener("pointerleave", () => { mouse.x = mouse.y = -999; });
    resize();
    requestAnimationFrame(frame);
    return { focus: (d) => (focus = d) };
  })();

  /* =====================================================================
     2. Ванильные текстуры: трещины и кирки
     ===================================================================== */
  const MC = (n) => ZM.url(`assets/textures/mc/${n}.png`);
  const CRACKS = Array.from({ length: 10 }, (_, i) => `url('${MC("destroy_stage_" + i)}')`);
  CRACKS.forEach((u) => { const i = new Image(); i.src = u.slice(5, -2); }); // прогреваем кэш

  const TOOLS = [
    { id: "hand", name: "Рука", speed: 1, icon: MC("ui/steve_face") },
    { id: "wood", name: "Деревянная", speed: 2, icon: MC("wooden_pickaxe") },
    { id: "stone", name: "Каменная", speed: 4, icon: MC("stone_pickaxe") },
    { id: "iron", name: "Железная", speed: 6, icon: MC("iron_pickaxe") },
    { id: "diamond", name: "Алмазная", speed: 8, icon: MC("diamond_pickaxe") },
    { id: "netherite", name: "Незеритовая", speed: 9, icon: MC("netherite_pickaxe") },
    { id: "gold", name: "Золотая", speed: 12, icon: MC("golden_pickaxe") },
  ];
  // Формула Minecraft: урон за тик = скорость / прочность / 30 (для блоков без requiresCorrectToolForDrops)
  const breakTicks = (speed) => Math.max(1, Math.ceil((P.hardness * 30) / speed - 1e-9));
  let tool = TOOLS.find((t) => t.id === store.get("p01.tool", "iron")) || TOOLS[3];

  function renderTools() {
    $("#tools").innerHTML = TOOLS.map((t) => `<button type="button" role="radio" aria-checked="${t === tool}" data-t="${t.id}" data-tip="${t.id === "hand" ? "Рука" : t.name + " кирка"}" data-tip-info="${(breakTicks(t.speed) / 20).toFixed(2)} с на блок">
      <img class="pixel" src="${t.icon}" alt="">${t.name}</button>`).join("");
    const ticks = breakTicks(tool.speed);
    $("#toolTime").innerHTML = `Сломать: <b>${(ticks / 20).toFixed(2)} с</b> · ${ticks} тиков`;
  }
  $("#tools").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    tool = TOOLS.find((t) => t.id === b.dataset.t); store.set("p01.tool", tool.id); renderTools(); ZM.sfx("equip", 0.6);
  });
  renderTools();

  /* =====================================================================
     3. HERO
     ===================================================================== */
  const heroRow = $("#heroRow");
  const heroSize = () => { const v = Math.max(20, Math.min(58, (innerWidth - 40) / 19)); heroRow.style.setProperty("--hs", v + "px"); return v; };
  DIGIT_ID.forEach((id, i) => { const c = ZM.cube(byId[id].texture, heroSize()); c.style.setProperty("--i", i); heroRow.appendChild(c); });
  addEventListener("resize", () => { const s = heroSize(); $$(".mc-cube", heroRow).forEach((c) => c.style.setProperty("--s", s + "px")); });

  /* =====================================================================
     4. Рецепты: общие помощники
     ===================================================================== */
  const recipeCounts = (r) => {
    const c = {};
    r.grid.forEach((id) => { if (id) c[id] = (c[id] || 0) + 1; });
    return c;
  };
  const slotTip = (id) => `data-tip="${esc(nameOf(id))}" data-tip-sub="${esc(id)}"`;

  /* =====================================================================
     5. КАРТОЧКИ
     ===================================================================== */
  const grid = $("#cardGrid");

  function cardAdv(b) {
    const a = advByKey[b.id]; if (!a) return "";
    const has = got.has(a.key);
    // как в игре: пока не получил, ачивка скрыта целиком
    if (!has) return `<div class="b-adv locked" data-adv="${a.key}">
        <div class="ico"><span class="adv-frame task locked"></span><span class="q">?</span></div>
        <div><div class="t">???</div><div class="d">Скрыта, пока не получишь</div></div>
        <span class="xp">??? XP<em>нет</em></span>
      </div>`;
    return `<div class="b-adv has" data-adv="${a.key}" title="Рамка: ${FRAME_RU[a.frame]}">
        <div class="ico"><span class="adv-frame ${a.frame} ${has ? "" : "locked"}"></span><span class="ic">${ZM.itemIcon(b.registry, 28)}</span></div>
        <div><div class="t">${mcText(a.title)}</div><div class="d">${mcText(a.description)}</div></div>
        <span class="xp">+${a.xp} XP<em>${has ? "✓ есть" : "нет"}</em></span>
      </div>`;
  }
  // Компактный верстак на обороте: ванильная текстура 128×66 (внутренность слотов сетки: x,y = 6+18·n, 16px; ячейка результата: внутренность 96,20, 24px, центр 108,32), слоты в процентах, чтобы тянулся под ширину карточки
  function cardCraft(b) {
    const r = b.recipe; if (!r || r.type !== "shaped") return "";
    const pct = (x, y, w, h) => `left:${(x / 128) * 100}%;top:${(y / 66) * 100}%;width:${(w / 128) * 100}%;height:${(h / 66) * 100}%`;
    return `<div class="b-craft" aria-label="Рецепт крафта">
        ${r.grid.map((id, i) => id ? `<span class="s" style="${pct(6 + (i % 3) * 18, 6 + Math.floor(i / 3) * 18, 16, 16)}" ${slotTip(id)}>${ZM.itemIcon(id, 64)}</span>` : "").join("")}
        <span class="s res" style="${pct(98, 22, 20, 20)}" ${slotTip(r.result)}>${ZM.itemIcon(r.result, 64)}</span>
      </div>`;
  }

  D.blocks.forEach((b, i) => {
    const card = document.createElement("article");
    const a = advByKey[b.id];
    card.className = "card reveal" + (a && got.has(a.key) ? " got" : "");
    card.dataset.id = b.id;
    card.style.transitionDelay = (i % 5) * 60 + "ms";
    card.innerHTML = `
      <div class="card-shadow"></div>
      <div class="card-inner">
        <div class="face front">
          <div class="f-ghost">${b.digit}</div>
          <div class="f-top"><span class="num">№${String(i + 1).padStart(2, "0")}</span><span>${b.registry}</span></div>
          <span class="f-got">АЧИВКА ✓</span>
          <div class="f-stage">
            <div class="f-floor"></div>
            <div class="spin"></div>
            <svg class="mine-ring" viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="46"/><circle class="fg" cx="50" cy="50" r="46" pathLength="1"/></svg>
          </div>
          <div class="f-bot">
            <div class="f-name">${esc(b.name)}</div>
            <div class="f-hint"><span>⇆ свайп: оборот</span><span>⛏ зажми блок</span></div>
          </div>
        </div>
        <div class="face back">
          <div class="b-head">${ZM.itemIcon(b.registry, 44)}<div><h3>${esc(b.name)}</h3><small>цифроблок · стак ${P.stack}</small></div><span class="b-num">${b.digit}</span></div>
          <dl class="stats">
            <div><dt>Прочность</dt><dd>${P.hardness}</dd></div>
            <div><dt>Взрыв</dt><dd>${P.resistance}</dd></div>
            <div><dt>Рукой</dt><dd>${(breakTicks(1) / 20).toFixed(2)}с</dd></div>
          </dl>
          <div class="b-sec"><span>Крафт</span><em>${b.id === "zero" ? "9 цифр" : Object.entries(recipeCounts(b.recipe)).map(([id, n]) => n + "× " + (id.endsWith("coal") ? "уголь" : "кварц")).join(" · ")}</em></div>
          ${cardCraft(b)}
          <div class="b-sec"><span>Ачивка</span></div>
          ${cardAdv(b)}
          <button class="give" type="button" data-give="/give @p ${b.registry} 64"><code>/give @p ${b.registry} 64</code><span>копировать</span></button>
        </div>
      </div>`;
    const cube = ZM.cube(b.texture);
    cube.style.setProperty("--tex", `url('${ZM.url(b.texture)}')`);
    $$(".f", cube).forEach((f) => (f.style.backgroundImage = ""));
    $(".spin", card).appendChild(cube);
    grid.appendChild(card);
    setupCard(card, b);
  });

  /* ---------- физика переворота ---------- */
  function setupCard(card, b) {
    const inner = $(".card-inner", card), shadow = $(".card-shadow", card);
    const st = { angle: 0, vel: 0, target: 0, tiltX: 0, hx: 0, hy: 0, raf: 0, face: false };
    let drag = null, mineT = null, lastMove = 0;

    const facing = (a) => ((Math.round(a / 180) % 2) + 2) % 2 === 1; // true = оборот
    const render = () => {
      const a = st.angle;
      inner.style.transform = `rotateX(${st.tiltX + st.hx}deg) rotateY(${a + st.hy}deg) scale(${1 + Math.min(Math.abs(st.vel) / 3000, 0.06)})`;
      inner.style.setProperty("--g", 50 + Math.sin((a * Math.PI) / 180) * 60 + "%");
      shadow.style.setProperty("--sx", Math.max(0.35, Math.abs(Math.cos((a * Math.PI) / 180))));
      const f = facing(a);
      if (f !== st.face) { st.face = f; const now = performance.now(); if (now - (st.fT || 0) > 140) { st.fT = now; ZM.sfx("page", 0.7, 0.9 + Math.random() * 0.25); } }
      card.classList.toggle("flipped", f);
    };
    const spring = () => {
      cancelAnimationFrame(st.raf);
      let prev = performance.now();
      const step = (now) => {
        const dt = Math.min(0.032, (now - prev) / 1000); prev = now;
        st.vel += (190 * (st.target - st.angle) - 17 * st.vel) * dt;
        st.angle += st.vel * dt;
        st.tiltX += (0 - st.tiltX) * 0.15;
        render();
        if (Math.abs(st.target - st.angle) > 0.05 || Math.abs(st.vel) > 0.5 || Math.abs(st.tiltX) > 0.05) st.raf = requestAnimationFrame(step);
        else { st.angle = st.target; st.vel = 0; st.tiltX = 0; st.raf = 0; render(); }
      };
      st.raf = requestAnimationFrame(step);
    };
    const flip = (dir) => { st.target = Math.round(st.angle / 180) * 180 + 180 * dir; st.vel += dir * 200; spring(); };

    inner.addEventListener("pointerdown", (e) => {
      // кнопки и интерактив на обороте не должны переворачивать карточку
      if (e.button !== 0 || e.target.closest("button, a, [data-tip]")) return;
      inner.setPointerCapture(e.pointerId);
      cancelAnimationFrame(st.raf);
      drag = { x: e.clientX, y: e.clientY, a0: st.angle, mode: "pending", lx: e.clientX, lt: performance.now(), v: 0 };
      if (e.target.closest(".mc-cube") && !facing(st.target)) {
        mineT = setTimeout(() => { if (drag && drag.mode === "pending") { drag.mode = "mine"; startMining(card, b); } }, 180);
      }
    });
    inner.addEventListener("pointermove", (e) => {
      if (!drag) {
        if (e.pointerType === "mouse") {
          const r = card.getBoundingClientRect();
          st.hx = ((e.clientY - r.top) / r.height - 0.5) * -10;
          st.hy = ((e.clientX - r.left) / r.width - 0.5) * 12;
          if (!st.raf) render();
        }
        return;
      }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (drag.mode === "pending" && Math.hypot(dx, dy) > 8) {
        clearTimeout(mineT);
        if (Math.abs(dx) > Math.abs(dy)) { drag.mode = "drag"; card.classList.add("dragging"); }
        else { drag = null; return; }
      }
      if (drag.mode === "mine" && Math.hypot(dx, dy) > 24) { stopMining(card); drag.mode = "dead"; }
      if (drag.mode !== "drag") return;
      const now = performance.now();
      drag.v = ((e.clientX - drag.lx) / Math.max(1, now - drag.lt)) * 0.55 * 1000;
      drag.lx = e.clientX; drag.lt = now;
      st.angle = drag.a0 + dx * 0.55;
      st.tiltX = Math.max(-14, Math.min(14, -dy * 0.06));
      st.vel = drag.v;
      render();
      lastMove = now;
    });
    const end = (e) => {
      if (!drag) return;
      clearTimeout(mineT);
      card.classList.remove("dragging");
      if (drag.mode === "drag") {
        const v = performance.now() - lastMove > 90 ? 0 : drag.v;
        let t = Math.round((st.angle + v * 0.18) / 180) * 180;
        st.target = Math.max(drag.a0 - 180, Math.min(drag.a0 + 180, t));
        spring();
      } else if (drag.mode === "pending") {
        const r = card.getBoundingClientRect();
        flip(e.clientX < r.left + r.width / 2 ? -1 : 1);
      } else if (drag.mode === "mine") stopMining(card);
      drag = null;
    };
    inner.addEventListener("pointerup", end);
    inner.addEventListener("pointercancel", end);
    card.addEventListener("pointerenter", () => rain.focus(b.digit));
    card.addEventListener("pointerleave", () => { rain.focus(null); st.hx = 0; st.hy = 0; if (!drag) spring(); });
    inner.tabIndex = 0;
    inner.setAttribute("role", "button");
    inner.setAttribute("aria-label", b.name + ": перевернуть карточку");
    inner.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target === inner) { e.preventDefault(); flip(1); } });
  }

  /* ---------- /give в буфер ---------- */
  grid.addEventListener("click", (e) => {
    const g = e.target.closest(".give"); if (!g) return;
    e.stopPropagation();
    ZM.copy(g.dataset.give);
    g.classList.add("ok"); $("span", g).textContent = "скопировано ✓";
    setTimeout(() => { g.classList.remove("ok"); $("span", g).textContent = "копировать"; }, 1400);
  });

  /* ---------- добыча ---------- */
  const mining = new WeakMap();
  function startMining(card, b) {
    const cube = $(".mc-cube", card), ring = $(".mine-ring .fg", card);
    const total = (breakTicks(tool.speed) / 20) * 1000, t0 = performance.now();
    card.classList.add("mining");
    let lastPt = 0, lastHit = 0;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / total);
      cube.style.setProperty("--crack", CRACKS[Math.min(9, Math.floor(p * 10))]);
      ring.style.strokeDashoffset = 1 - p;
      if (now - lastPt > 110) { lastPt = now; particles(card, 2, 0.5); }
      if (now - lastHit > 200) { lastHit = now; ZM.sfx("hit", 0.5, 0.5); }   // как в игре: звук удара раз в 4 тика, pitch 0.5
      if (p >= 1) { finishMining(card, b); return; }
      mining.set(card, requestAnimationFrame(step));
    };
    mining.set(card, requestAnimationFrame(step));
  }
  function stopMining(card) {
    cancelAnimationFrame(mining.get(card));
    card.classList.remove("mining");
    $(".mc-cube", card).style.removeProperty("--crack");
    $(".mine-ring .fg", card).style.strokeDashoffset = 1;
  }
  function finishMining(card, b) {
    stopMining(card);
    ZM.sfx("stone", 1, 0.8);   // block.stone.break, pitch 0.8
    particles(card, 18, 1);
    card.classList.add("popped");
    flyToHotbar($(".f-stage", card).getBoundingClientRect(), b, true);
    setTimeout(() => card.classList.remove("popped"), 700);
  }
  function particles(card, n, power) {
    const stage = $(".f-stage", card);
    const cols = ["#ffffff", "#e9e9e9", "#111111", "#5a5a5a", "#bdbdbd"];
    for (let i = 0; i < n; i++) {
      const s = document.createElement("i");
      s.className = "pt";
      const ang = Math.random() * Math.PI * 2, dist = (30 + Math.random() * 70) * power;
      s.style.cssText = `--c:${cols[(Math.random() * cols.length) | 0]};--sz:${3 + Math.random() * 5}px;--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist + 40 * power}px;--r:${Math.random() * 360}deg`;
      stage.appendChild(s);
      setTimeout(() => s.remove(), 750);
    }
  }
  function flyToHotbar(from, b, bounce) {
    const hb = $("#hotbar");
    hb.classList.add("show");
    const slot = $(`.slot[data-id="${b.id}"]`, hb);
    const drop = document.createElement("div");
    drop.className = "drop";
    drop.appendChild(ZM.cube(b.texture));
    document.body.appendChild(drop);
    const x0 = from.left + from.width / 2 - 13, y0 = from.top + from.height / 2 - 13;
    drop.style.left = x0 + "px"; drop.style.top = y0 + "px";
    // хотбар выезжает 0.5 с, поэтому координаты слота берём в конце пути
    setTimeout(() => {
      const to = slot.getBoundingClientRect();
      const dx = to.left + to.width / 2 - 13 - x0, dy = to.top + to.height / 2 - 13 - y0;
      const frames = bounce
        ? [{ transform: "translate(0,0) scale(.4)" }, { transform: "translate(0,50px) scale(1.2)", offset: 0.25 }, { transform: "translate(0,38px) scale(1.2)", offset: 0.35 }, { transform: "translate(0,50px) scale(1.2)", offset: 0.45 }, { transform: `translate(${dx}px,${dy}px) scale(.9)` }]
        : [{ transform: "translate(0,0) scale(1.3)" }, { transform: `translate(${dx}px,${dy}px) scale(.9)` }];
      drop.animate(frames, { duration: bounce ? 1100 : 700, easing: "cubic-bezier(.5,0,.3,1)" }).onfinish = () => {
        drop.remove();
        ZM.sfx("pop", 0.5, 1.4 + Math.random() * 0.8);   // подбор предмета
        inv[b.id] = Math.min(64, (inv[b.id] || 0) + 1);
        renderHotbar(b.id);
        grant(b.id);
        save();
      };
    }, 30);
  }

  /* ---------- хотбар ---------- */
  function renderHotbar(bump) {
    const hb = $("#hotbar");
    if (!hb.children.length) hb.innerHTML = D.blocks.map((b) => `<div class="slot" data-id="${b.id}" ${slotTip(b.registry)}>${ZM.itemIcon(b.registry, 30)}<b></b></div>`).join("");
    D.blocks.forEach((b) => {
      const s = $(`.slot[data-id="${b.id}"]`, hb), n = inv[b.id] || 0;
      s.classList.toggle("has", n > 0);
      $("b", s).textContent = n > 1 ? n : "";
    });
    if (bump) { const s = $(`.slot[data-id="${bump}"]`, hb); s.classList.remove("bump"); void s.offsetWidth; s.classList.add("bump"); }
    if (Object.values(inv).some((n) => n > 0)) hb.classList.add("show");
  }

  /* =====================================================================
     6. КРАФТЫ: верстак из ванильной текстуры
     ===================================================================== */
  const gui = $("#craftGui"), tabs = $("#craftTabs"), info = $("#craftInfo");
  let craftSel = store.get("p01.craft", "one");
  tabs.innerHTML = D.blocks.map((b) => `<button type="button" role="tab" data-id="${b.id}" aria-selected="${b.id === craftSel}" data-tip="${esc(b.name)}">${ZM.itemIcon(b.registry, 30)}</button>`).join("");
  tabs.addEventListener("click", (e) => { const t = e.target.closest("button"); if (!t) return; craftSel = t.dataset.id; store.set("p01.craft", craftSel); renderCraft(); });

  function renderCraft() {
    $$("button", tabs).forEach((t) => t.setAttribute("aria-selected", t.dataset.id === craftSel));
    const b = byId[craftSel], r = b.recipe;
    const gs = parseFloat(getComputedStyle(gui).getPropertyValue("--gs")) || 3;
    const pos = (x, y) => `left:${x * gs}px;top:${y * gs}px`;
    const isz = Math.round(16 * gs);
    gui.innerHTML = `<span class="ttl">Верстак</span>` +
      r.grid.map((id, i) => `<div class="cs" style="${pos(30 + (i % 3) * 18, 17 + Math.floor(i / 3) * 18)};--i:${i}" ${id ? slotTip(id) : ""}>${id ? `<span>${ZM.itemIcon(id, isz)}</span>` : ""}</div>`).join("") +
      `<div class="cs res" style="${pos(124, 35)};--i:10" data-tip="${esc(b.name)}" data-tip-info="Нажми, чтобы забрать" data-tip-sub="${b.registry}"><span>${ZM.itemIcon(r.result, isz)}</span></div>`;
    const counts = recipeCounts(r);
    info.innerHTML = `<h3>${esc(b.name)}</h3><div class="reg">${b.registry} · верстак 3×3 · выход ${r.count} шт.</div>
      <ul>${Object.entries(counts).map(([id, n]) => `<li>${ZM.itemIcon(id, 28)} ${esc(nameOf(id))}<b>×${n}</b></li>`).join("")}</ul>
      <div class="hint">${b.id === "zero"
        ? "Нужны все девять цифр, каждая на своём месте: 1 2 3 / 4 5 6 / 7 8 9, как на кнопочном телефоне. Поэтому за ноль дают испытание."
        : "Уголь выкладывает форму цифры, кварц заполняет фон. Рецепт с формой: ингредиенты нельзя сдвигать или отражать."}</div>`;
  }
  gui.addEventListener("click", (e) => {
    const r = e.target.closest(".res"); if (!r) return;
    flyToHotbar(r.getBoundingClientRect(), byId[craftSel], false);
  });
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(renderCraft, 150); });

  /* =====================================================================
     7. ДОСТИЖЕНИЯ
     ===================================================================== */
  function advIcon(a, size) {
    return `<span class="ic">${ZM.itemIcon("zitraksmode:" + a.icon, size)}</span>`;
  }
  const SECRET_KEY = (D.advancements.find((a) => a.redacted) || {}).key;
  const advTitle = (a) => (a.redacted ? `Секретный код ${SECRET_CODE}` : mcText(a.title));
  const advDesc = (a) => (a.redacted ? "Ты нашёл код." : mcText(a.description));

  function grant(key) {
    const a = advByKey[key];
    if (!a || got.has(key)) return;
    got.add(key);
    save();
    ZM.toast({ iconHtml: ZM.itemIcon("zitraksmode:" + a.icon, 32), title: advTitle(a), frame: a.frame });
    const card = $(`.card[data-id="${key}"]`);
    if (card) {
      card.classList.add("got");
      const old = $("[data-adv]", card);
      if (old) old.outerHTML = cardAdv(byId[key]);
    }
    advSel = key;
    renderAdv(key);
    renderStats();
  }

  $("#tree .adv-board").style.setProperty("--tile", `url("${new URL(MC("stone"), location.href).href}")`);
  let advSel = null;
  // Как в Майнкрафте: в дереве и списке только полученные ачивки, остальные не видны вообще
  function renderAdv(pulse) {
    const list = D.advancements;
    const open = list.filter((a) => got.has(a.key));
    const hidden = list.length - open.length;
    if (!advSel || !got.has(advSel)) advSel = open.length ? open[open.length - 1].key : null;

    $("#advChain").innerHTML = open.length
      ? open.map((a, i) => (i ? `<div class="adv-link on"></div>` : "") + `
        <button type="button" class="adv-node ${pulse === a.key ? "pulse" : ""} ${advSel === a.key ? "sel" : ""}" data-k="${a.key}" aria-label="${esc(a.redacted ? advTitle(a) : a.title.text)}">
          <span class="adv-frame ${a.frame}"></span>${advIcon(a, 30)}
        </button>`).join("") + (hidden ? `<div class="adv-link"></div><div class="adv-more">+${hidden} скрыто</div>` : "")
      : `<div class="adv-empty">Тут пусто. Ачивки появляются, только когда получишь их.<br>Добудь цифроблок (зажми на карточке) или скрафть его.</div>`;

    const a = advByKey[advSel];
    if (!a) {
      $("#advDetail").innerHTML = `<div class="big"><span class="adv-frame task locked"></span><span class="q">?</span></div>
        <div class="txt"><div class="tt">???</div><div class="dd">Ни одной ачивки пока нет</div><div class="cc">В ветке ${list.length} ачивок, все скрыты</div></div>`;
    } else {
      const parentAdv = advByKey[a.parent.split("/").pop()];
      const parent = parentAdv && got.has(parentAdv.key) ? parentAdv.title?.text : parentAdv ? "???" : null;
      $("#advDetail").innerHTML = `
      <div class="big"><span class="adv-frame ${a.frame}"></span>${advIcon(a, 34)}</div>
      <div class="txt"><div class="tt">${advTitle(a)}</div><div class="dd">${advDesc(a)}</div>
        <div class="cc">${a.redacted ? `Ввести ${SECRET_CODE} в «Собери число»` : esc(a.condition)}${parent ? ` · после «${esc(parent)}»` : " · первая в ветке"}</div></div>
      <div class="meta"><span class="st ok">ПОЛУЧЕНА</span>
        <span>Рамка: ${FRAME_RU[a.frame]}${a.frame === "challenge" ? " (фиолетовая)" : ""}</span><span><b>+${a.xp} XP</b></span></div>`;
    }

    $("#advList").innerHTML = open.map((a) => `<button type="button" class="adv-row has ${a.redacted ? "secret" : ""}" data-k="${a.key}">
        <span class="fr"><span class="adv-frame ${a.frame}"></span>${advIcon(a, 24)}</span>
        <span><span class="t">${advTitle(a)}</span><br><span class="d">${advDesc(a)}</span></span>
        <span class="x">✓ получена<br>+${a.xp} XP</span></button>`).join("")
      + (hidden ? `<div class="adv-row locked"><span class="fr"><span class="adv-frame task locked"></span><span class="q">?</span></span>
        <span><span class="t">??? × ${hidden}</span><br><span class="d">Скрыты, пока не получишь</span></span></div>` : "");

    const n = open.length;
    $("#advBar").style.width = (n / list.length) * 100 + "%";
    $("#advTxt").textContent = `${n} / ${list.length}`;
  }
  const pickAdv = (e) => { const n = e.target.closest("[data-k]"); if (!n) return; advSel = n.dataset.k; renderAdv(); };
  $("#advChain").addEventListener("click", pickAdv);
  $("#advList").addEventListener("click", (e) => { pickAdv(e); $("#tree .adv-board").scrollIntoView({ behavior: "smooth", block: "center" }); });
  $("#advReset").addEventListener("click", () => {
    got = new Set(); inv = {}; save();
    $$(".card").forEach((c) => { c.classList.remove("got"); const o = $("[data-adv]", c); if (o) o.outerHTML = cardAdv(byId[c.dataset.id]); });
    advSel = null; renderAdv(); renderHotbar(); renderStats();
    $("#hotbar").classList.remove("show");
  });

  function renderStats() {
    $("#stAdv").textContent = D.advancements.length;
    $("#stXp").textContent = D.advancements.reduce((s, a) => s + a.xp, 0);
    $("#stGot").textContent = `${got.size}/${D.advancements.length}`;
  }

  /* =====================================================================
     8. КОНСТРУКТОР ЧИСЕЛ
     ===================================================================== */
  const EGGS = {
    "67": "Six seven 🤷 Газан одобряет", "69": "Nice.", "52": "Питер, привет", "228": "Статья, а не число",
"777": "Джекпот", "0": "0 импакта", "42": "Ответ на главный вопрос",
    "2025": "Год, когда появились цифроблоки", "26102025": "День рождения цифроблоков",
  };
  const input = $("#bInput"), wall = $("#bWall"), note = $("#bNote");
  const plural = (n, a, b, c) => (n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);
  let bt;
  let lastLen = null;
  function build() {
    const v = input.value.replace(/\D/g, "").slice(0, 12);
    if (lastLen != null && v.length !== lastLen) ZM.sfx("stone", v.length > lastLen ? 0.8 : 0.6, v.length > lastLen ? 0.8 : 0.7);   // поставил / сломал блок
    lastLen = v.length;
    if (input.value !== v) input.value = v;
    wall.innerHTML = "";
    [...v].forEach((d, i) => {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.style.setProperty("--i", i);
      cell.appendChild(ZM.cube(byId[DIGIT_ID[+d]].texture));
      wall.appendChild(cell);
    });
    note.textContent = v ? EGGS[v] || `${v.length} ${plural(v.length, "блок", "блока", "блоков")}` : "Введи число";
    if (v === SECRET_CODE && SECRET_KEY) {
      note.textContent = got.has(SECRET_KEY) ? "Код уже найден" : "Секретный код!";
      grant(SECRET_KEY);
    }
  }
  input.addEventListener("input", () => { clearTimeout(bt); bt = setTimeout(build, 160); });
  $("#bStage").addEventListener("pointermove", (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    wall.style.transform = `rotateX(${((e.clientY - r.top) / r.height - 0.5) * -24}deg) rotateY(${((e.clientX - r.left) / r.width - 0.5) * 40}deg)`;
  });
  $("#bStage").addEventListener("pointerleave", () => (wall.style.transform = "rotateX(-8deg) rotateY(-14deg)"));
  wall.style.transform = "rotateX(-8deg) rotateY(-14deg)";

  /* ---------------- футер ---------------- */
  const nav = ZM.pointNav(1);
  $("#pfNav").innerHTML = `<a href="${ZM.url("index.html")}">← Все пункты</a>` + (nav.next ? `<a href="${ZM.url(nav.next.href)}">№${String(nav.next.n).padStart(2, "0")} ${esc(nav.next.title)} →</a>` : "");

  /* ---------------- старт ---------------- */
  build();
  renderCraft();
  renderAdv();
  renderHotbar();
  renderStats();
  ZM.reveal();
  new IntersectionObserver((es, o) => es.forEach((e) => { if (e.isIntersecting) { build(); o.disconnect(); } }), { threshold: 0.4 }).observe($("#bStage"));
  /* ---------- атмосфера: редкие звуки пещеры, тихо, не мешают ---------- */
  ZM.sfx.ambient({ min: 35, max: 80, vol: 0.25 });
})();
