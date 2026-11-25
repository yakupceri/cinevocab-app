// Logo yerleşimi ekran görüntüleri: eklenti simgeleri, popup başlığı, welcome, site başlığı (koyu ve açık), favicon yanıtı.
// Çıktı: dev/out/logo/*.png. Site için dev/site-harness/serve.py kendisi başlatılır (sahte veri, gerçek hesap yok).
//   cd dev && node harness/logo-shots.mjs
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const OUT = join(HERE, "..", "out", "logo");
mkdirSync(OUT, { recursive: true });
const PORT = 8817, BASE = `http://127.0.0.1:${PORT}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const srv = spawn("python3", [join(HERE, "..", "site-harness", "serve.py"), "--port", String(PORT)], { stdio: "ignore" });
const b = await chromium.launch({ channel: "chromium", headless: true });
const problems = [];
try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(BASE + "/")).ok) break; } catch (e) {} await wait(150); }

  // 1) eklenti simgeleri: gerçek boyut ve 8 kat büyütme, açık ve koyu araç çubuğu zemininde
  const data = (n) => "data:image/png;base64," + readFileSync(join(ROOT, "extension", "icons", `icon${n}.png`)).toString("base64");
  const row = (bg) => `<div style="background:${bg};padding:22px;display:flex;gap:26px;align-items:flex-end">` +
    [16, 32, 48, 128].map((n) => `<img src="${data(n)}" width="${n}" height="${n}">`).join("") +
    [16, 32].map((n) => `<img src="${data(n)}" width="${n * 8}" height="${n * 8}" style="image-rendering:pixelated">`).join("") + "</div>";
  let p = await b.newPage({ viewport: { width: 900, height: 660 }, deviceScaleFactor: 1 });
  await p.setContent(`<body style="margin:0">${row("#F1F3F4")}${row("#202124")}</body>`);
  await p.screenshot({ path: join(OUT, "simgeler.png") });
  await p.close();

  // 2) popup başlığı (popup yalnızca koyu) ve welcome (koyu, açık)
  for (const [name, file, vp, clip, schemes] of [
    ["popup", "popup.html", { width: 380, height: 584 }, { x: 0, y: 0, width: 380, height: 64 }, ["dark"]],
    ["welcome", "welcome.html", { width: 900, height: 420 }, { x: 0, y: 0, width: 900, height: 260 }, ["dark", "light"]],
  ]) for (const cs of schemes) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, colorScheme: cs });
    await ctx.addInitScript(() => {          // chrome.* yok: yalnızca başlık çizimi görülsün diye en küçük sahte
      const noop = () => {}; const st = { get: (k, cb) => { if (typeof cb === "function") cb({}); return Promise.resolve({}); }, set: (o, cb) => { if (cb) cb(); return Promise.resolve(); }, remove: noop };
      window.chrome = { storage: { local: st, sync: st, onChanged: { addListener: noop } }, runtime: { sendMessage: (m, cb) => { if (typeof cb === "function") cb({}); return Promise.resolve({}); }, onMessage: { addListener: noop }, getURL: (u) => u, getManifest: () => ({ version: "0" }), lastError: null },
        i18n: { getMessage: (k) => k, getUILanguage: () => "tr" }, tabs: { query: (q, cb) => { if (cb) cb([]); return Promise.resolve([]); }, create: noop }, permissions: { contains: (q, cb) => cb && cb(false) } };
    });
    p = await ctx.newPage();
    await p.goto(pathToFileURL(join(ROOT, "extension", file)).href);
    await wait(500);
    await p.screenshot({ path: join(OUT, `${name}.${cs}.png`), clip });
    await ctx.close();
  }

  // 3) site başlığı (açılış sayfası ve hesap), koyu ve açık, masaüstü ve telefon
  for (const theme of ["dark", "light"]) for (const [vpName, vp] of [["desktop", { width: 1280, height: 800 }], ["mobile", { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2 });
    await ctx.addInitScript((th) => { try { localStorage.setItem("cv-theme", th); localStorage.setItem("cv-lang", "tr"); } catch (e) {} }, theme);
    p = await ctx.newPage();
    p.on("requestfailed", (r) => problems.push(`${theme}: istek başarısız ${r.url()}`));
    p.on("response", (r) => { if (r.status() >= 400 && r.url().startsWith(BASE)) problems.push(`${theme}: ${r.status()} ${r.url()}`); });
    await p.goto(BASE + "/");
    await p.locator(".brand").first().waitFor();
    await wait(400);
    const got = await p.evaluate(() => { const i = document.querySelector(".brand i"); const s = getComputedStyle(i); return { bg: s.backgroundImage, w: i.offsetWidth, h: i.offsetHeight, theme: document.documentElement.dataset.theme || "" }; });
    console.log("site", theme, vpName, JSON.stringify(got));
    await p.screenshot({ path: join(OUT, `site-baslik.${vpName}.${theme}.png`), clip: { x: 0, y: 0, width: vp.width, height: 90 } });
    await ctx.close();
  }

  // 4) favicon ve simge dosyaları sunuluyor mu
  for (const u of ["/static/icons/favicon.svg", "/static/icons/favicon-32.png", "/static/icons/isaret.svg", "/static/icons/isaret-acik.svg", "/static/icons/apple-touch-icon.png", "/static/icons/icon-192.png", "/static/icons/icon-512.png", "/static/icons/icon-maskable-512.png"]) {
    const r = await fetch(BASE + u);
    console.log(r.status, r.headers.get("content-type"), u);
    if (!r.ok) problems.push(`${r.status} ${u}`);
  }
  // site simgeleri yan yana (maskeli olan daire maskesiyle)
  const sd = (f) => "data:image/png;base64," + readFileSync(join(ROOT, "static", "icons", f)).toString("base64");
  p = await b.newPage({ viewport: { width: 900, height: 250 }, deviceScaleFactor: 1 });
  await p.setContent(`<body style="margin:0;background:#888;padding:25px;display:flex;gap:25px;align-items:center">
    <img src="${sd("icon-192.png")}" width="192"><img src="${sd("apple-touch-icon.png")}" width="180" style="border-radius:40px">
    <img src="${sd("icon-maskable-512.png")}" width="192" style="border-radius:50%"><img src="${sd("icon-maskable-512.png")}" width="192" style="border-radius:28%"></body>`);
  await p.screenshot({ path: join(OUT, "site-simgeler.png") });
} finally {
  await b.close();
  srv.kill();
}
if (problems.length) { console.log("SORUN:\n" + [...new Set(problems)].join("\n")); process.exit(1); }
console.log("tamam:", OUT);
