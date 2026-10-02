/* Общее древо достижений для главной: node tools/build_hub.js -> data/hub_adv.js
   Берёт ачивки из data/pNN_*.js (тексты как на страницах) и родителей из mod-src/advancements/*.json.
   Иконки: перебор путей, как их ищет каждая страница, берётся первый существующий файл. */
const fs = require("fs"), path = require("path");
const R = path.join(__dirname, "..");
global.window = global; global.ZM = {};
// Load advancement definitions, not multi-megabyte model/texture datasets.
const DATA = { 1: "p01_numbers", 2: "p02_tnt", 3: "p03_snipers", 4: "p04_miner", 5: "p05_adun", 6: "p06_labubu", 7: "p07_ender", 8: "p08_mih", 9: "p09_dildo", 10: "p10_creeper", 11: "p11_jbl", 12: "p12_katana", 13: "p13_printer" };
for (let n = 1; n <= 27; n++) {
  const f = DATA[n] || `p${n}_adv`;
  eval(fs.readFileSync(path.join(R, "data", f + ".js"), "utf8"));
}
eval(fs.readFileSync(path.join(R, "shared/points.js"), "utf8"));
// Ветка №22 утверждена пользователем: сохранять редакционные тексты при пересборке хаба.
eval(fs.readFileSync(path.join(R, "data/hub_adv.js"), "utf8"));
const preserved22 = ZM.HUB_ADV.find((p) => p.n === 22);

const MC = { 0: "#000000", 1: "#0000AA", 2: "#00AA00", 3: "#00AAAA", 4: "#AA0000", 5: "#AA00AA", 6: "#FFAA00", 7: "#AAAAAA", 8: "#555555", 9: "#5555FF", a: "#55FF55", b: "#55FFFF", c: "#FF5555", d: "#FF55FF", e: "#FFFF55", f: "#FFFFFF" };
const has = (p) => !!p && fs.existsSync(path.join(R, p));
const first = (...c) => c.find(has) || null;
// §-строка -> { text, color, bold }; §k..§r оставляем как маркер для «шифра»
function sect(s, def = "f") {
  if (s && typeof s === "object") return { text: s.obfuscated ? "§k" + s.text + "§r" : s.text, color: MC[s.color && s.color.length === 1 ? s.color : def] || (s.color && s.color.startsWith("#") ? s.color : MC[def]), bold: !!s.bold };
  s = String(s || ""); let color = null, bold = false;
  const m = s.match(/^((?:§[0-9a-fl])+)/); if (m) { for (const c of m[1].match(/§./g)) { if (c[1] === "l") bold = true; else color = MC[c[1]]; } s = s.slice(m[1].length); }
  s = s.replace(/§([0-9a-flmnor])/g, (x, c) => (c === "k" || c === "r" ? x : ""));
  return { text: s, color: color || MC[def], bold };
}
const ICON = {
  1: (a) => first(`assets/textures/block/${a.icon}_inv.png`),
  2: (a) => { const [ns, n] = a.icon.includes(":") ? a.icon.split(":") : ["minecraft", a.icon];
    return first(`assets/textures/mc/p2/iso/${n}.png`, ns !== "minecraft" && `assets/textures/item/${n}.png`, `assets/textures/mc/p2/block_${n}.png`, `assets/textures/mc/p2/item_${n}.png`, `assets/textures/item/${n}.png`); },
  3: (a) => { const [ns, n] = a.icon.includes(":") ? a.icon.split(":") : ["minecraft", a.icon];
    return n === "bullet" ? first("assets/textures/p3/icons/bullet_3d.png", "assets/textures/p3/bullet_item.png") : first(`assets/textures/p3/icons/${n}.png`, `assets/textures/p3/vanilla/item_${n}.png`, `assets/textures/p3/vanilla/block_${n}.png`); },
  4: () => "assets/textures/p4/models/miner_helmet.png",
  5: (a) => first(a.icon || "", "assets/textures/p5/icons/adun_egg.png"),
  6: (a) => first(`assets/textures/p6/icons/${a.icon}.png`),
  7: (a) => { const s = a.icon, T = (n) => `assets/textures/p7/${n}.png`;
    return first(s.startsWith("iso:") ? T("iso/" + s.slice(4)) : s.startsWith("v:") ? T("v/" + s.slice(2)) : s.startsWith("item:") ? T("mod/" + s.slice(5)) : s.includes(":") ? T("v/" + s) : T("iso/" + s)); },
  8: (a) => first(`assets/textures/p8/${a.icon}.png`),
  9: (a) => first(`assets/textures/p9/${a.icon.includes("/") ? a.icon : "v/" + a.icon}.png`),
  10: (a) => first(`assets/textures/p10/${a.icon}.png`),
  11: (a) => first(`assets/textures/p11/${a.icon}.png`, `assets/textures/p11/iso/${a.icon}.png`),
  12: (a) => first(`assets/textures/p12/${({ katana: "katana_icon", shield: "shield_item" })[a.icon] || a.icon}.png`, `assets/textures/p12/iso/${a.icon}.png`),
  13: (a) => first(`assets/textures/p13/${a.icon}.png`, `assets/textures/p13/v/${a.icon}.png`, `assets/textures/p13/i/${a.icon}.png`, `assets/textures/p13/printer_iso.png`),
  14: (a) => first(`assets/textures/p14/i/${a.icon}.png`, `assets/textures/p14/${a.icon}.png`),
  15: (a) => first(`assets/textures/p15/i/${a.icon}.png`, `assets/textures/p15/${a.icon}.png`),
  16: (a) => first(`assets/textures/p16/i/${a.icon}.png`, `assets/textures/p16/${a.icon}.png`),
  17: (a) => first(`assets/textures/p17/i/${a.icon}.png`),
  18: (a) => first(`assets/textures/p18/i/${a.icon}.png`),
  19: (a) => first(`assets/textures/p19/i/${a.icon}.png`),
  20: (a) => first(`assets/textures/p20/i/${a.icon}.png`),
  21: (a) => first(`assets/textures/p21/i/${a.icon}.png`),
  22: (a) => first(`assets/textures/p22/i/${a.icon}.png`),
  23: (a) => first(`assets/textures/p23/i/${a.icon}.png`, `assets/textures/p23/${a.icon}.svg`),
  24: (a) => first(({ scooter: "assets/textures/p24/scooter_item.png", station: "assets/textures/mc/p2/item_redstone.png", speed: "assets/textures/p3/vanilla/item_barrier.png" })[a.icon], `assets/textures/p24/${a.icon}.svg`),
  25: (a) => first(`assets/textures/p25/i/${a.icon}.png`),
  26: (a) => first(`assets/textures/p26/${a.icon}.png`, `assets/textures/p26/v/${a.icon}.png`),
  27: (a) => first(`assets/textures/p27/${a.icon}.png`),
};
const DIRS = { 23: "23_max", 24: "24_scooter", 26: "26_vacuum", 27: "27_chigur", 1: "01_numbers", 2: "02_tnt_armor", 3: "03_sniper", 4: "04_miner", 5: "05_adun", 6: "p06", 7: "p07", 8: "p08", 9: "09_dildo", 10: "10_creeper", 11: "11_jbl", 12: "12_katana" };
const out = [], warn = [];
for (let n = 1; n <= 27; n++) {
  if (n === 22 && preserved22) { out.push(preserved22); continue; }
  const P = ZM["P" + String(n).padStart(2, "0")], pt = ZM.POINTS.find((p) => p.n === n);
  const dir = DIRS[n] && path.join(R, "mod-src/advancements", DIRS[n]);
  const par = {};
  if (dir) for (const f of fs.readdirSync(dir)) { const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8").replace(/^\uFEFF/, "")); par[f.replace(".json", "")] = (j.parent || "").split("/").pop().replace("zitraksmode:", ""); }
  const list = P.advancements.filter((a) => n > 12 || par[a.key] !== undefined || n === 4).map((a, i) => {
    const t = sect(a.redacted ? { text: "????????", obfuscated: true, color: "5" } : a.title, a.color || "f");
    if (a.color && MC[a.color]) t.color = MC[a.color]; if (a.bold) t.bold = true;
    const d = sect(a.desc ?? a.description ?? (a.redacted ? { text: "Секрет", obfuscated: true } : ""), "7");
    const icon = ICON[n](a); if (!icon) warn.push(n + ":" + a.key + " " + a.icon);
    return { key: a.key, t: t.text, c: t.color, b: t.bold, d: d.text, icon, frame: a.frame || "task", xp: a.xp || 0, parent: n > 12 ? (a.parent === undefined ? (par[a.key] ? (par[a.key] === "root" ? null : par[a.key]) : (i ? P.advancements[i - 1].key : null)) : a.parent) : par[a.key] === "root" ? null : par[a.key] || null, hidden: a.hidden !== false };
  });
  // порядок: по цепочке от корня
  const byP = {}; list.forEach((a) => (byP[a.parent || ""] = byP[a.parent || ""] || []).push(a));
  const ord = []; const walk = (k) => (byP[k] || []).forEach((a) => { ord.push(a); walk(a.key); }); walk("");
  list.forEach((a) => !ord.includes(a) && ord.push(a));
  out.push({ n, title: pt.title, page: pt.page, tone: pt.tone, icon: pt.icon, store: `p${String(n).padStart(2, "0")}.adv`, adv: ord });
}
const root = { key: "root", t: "ZitraksMode", d: "Добро пожаловать в ZitraksMode!", bg: "assets/textures/hub/dynamic_bg.png", icon: "assets/textures/block/one_inv.png", frame: "task", xp: 0 };
fs.writeFileSync(path.join(R, "data/hub_adv.js"), "/* сгенерировано tools/build_hub.js: общее древо достижений мода */\nwindow.ZM = window.ZM || {};\nZM.HUB_ROOT = " + JSON.stringify(root) + ";\nZM.HUB_ADV = " + JSON.stringify(out, null, 0).replace(/\},\{"n"/g, '},\n{"n"') + ";\n");
console.log(out.map((p) => `${p.n}:${p.adv.length}`).join(" "), "total", out.reduce((s, p) => s + p.adv.length, 0), "xp", out.reduce((s, p) => s + p.adv.reduce((q, a) => q + a.xp, 0), 0));
if (warn.length) console.log("NO ICON", warn);
