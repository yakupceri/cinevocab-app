// Ziyaret betiği (static/visit.js) gerçek tarayıcıda: 5 sn'den önce kapanan sayfa saymaz, kalan bir kez sayar, dokununca bir kez yükseltir,
// gizli sekme ve otomasyon tarayıcısı saymaz. /api/visit istekleri yolda yakalanıp sayılır (sunucuya gitmez).
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = 8829, BASE = `http://127.0.0.1:${PORT}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const srv = spawn("python3", [join(HERE, "serve.py"), "--port", String(PORT)], { stdio: "ignore" });
const b = await chromium.launch({ channel: "chromium", headless: true });
const problems = [], ok = (c, m) => { console.log((c ? "  ✔ " : "  ✘ ") + m); if (!c) problems.push(m); };
async function open(path, { human = true, hidden = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: 1100, height: 700 }, serviceWorkers: "block" });
  if (human) await ctx.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }));   // Playwright varsayılanı true
  if (hidden) await ctx.addInitScript(() => { Object.defineProperty(document, "visibilityState", { get: () => window.__vis || "hidden", configurable: true }); });
  const hits = [];
  await ctx.route("**/api/visit", (r) => { hits.push(JSON.parse(r.request().postData() || "{}")); r.fulfill({ status: 204, body: "" }); });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(BASE + path); await p.locator(".brand").first().waitFor();
  return { ctx, p, hits, errs };
}
try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(BASE + "/")).ok) break; } catch (e) {} await wait(150); }
  let s = await open("/?src=ph");
  await wait(3000); ok(s.hits.length === 0, "3 sn'de henüz istek yok");
  await s.p.close(); await wait(3500); ok(s.hits.length === 0, "5 sn dolmadan kapanan sayfa sayılmadı");
  await s.ctx.close();

  s = await open("/?src=ph");
  await wait(5800);
  ok(s.hits.length === 1 && s.hits[0].a === false && s.hits[0].p === "/" && s.hits[0].s === "ph", "5 sn kalan sayfa bir kez sayıldı (dokunmadan, kaynak etiketiyle): " + JSON.stringify(s.hits[0]));
  await s.p.mouse.move(300, 300); await s.p.mouse.down(); await s.p.mouse.up(); await wait(400);
  ok(s.hits.length === 2 && s.hits[1].a === true, "ilk dokunuşta bir kez 'dokundu' olarak yükseltildi");
  await s.p.keyboard.press("Tab"); await s.p.mouse.wheel(0, 300); await wait(500);
  ok(s.hits.length === 2, "sonraki dokunuşlar yeni istek göndermez");
  await s.p.goto(BASE + "/match"); await s.p.locator(".brand").first().waitFor(); await wait(6000);
  ok(s.hits.length === 2, "aynı sekmede başka sayfaya geçince yeniden sayılmaz");
  ok(s.errs.length === 0, "sayfa hatası yok" + (s.errs.length ? ": " + s.errs.join(" | ") : ""));
  await s.ctx.close();

  s = await open("/match");
  await s.p.mouse.move(200, 200); await s.p.mouse.down(); await s.p.mouse.up(); await wait(5800);
  ok(s.hits.length === 1 && s.hits[0].a === true && s.hits[0].p === "/match", "5 sn'den önce dokunan kişi tek istekle 'dokundu' sayılır");
  await s.ctx.close();

  s = await open("/", { hidden: true });
  await wait(6500); ok(s.hits.length === 0, "hiç görünür olmayan (arka plan) sekme sayılmadı");
  await s.p.evaluate(() => { window.__vis = "visible"; document.dispatchEvent(new Event("visibilitychange")); });
  await wait(3000); ok(s.hits.length === 0, "görünür olunca süre baştan işler (3 sn'de yok)");
  await wait(2800); ok(s.hits.length === 1, "görünür 5 sn tamamlanınca sayıldı");
  await s.ctx.close();

  s = await open("/", { human: false });
  await wait(6500); ok(s.hits.length === 0, "otomasyonla sürülen tarayıcı (navigator.webdriver) sayılmadı");
  await s.ctx.close();

  for (const path of ["/account", "/game", "/daily", "/explore"]) { s = await open(path); await wait(5800); ok(s.hits.length === 1, path + " sayfasında da betik çalışıyor"); await s.ctx.close(); }
} finally { await b.close(); srv.kill(); }
console.log(problems.length ? "SORUN:\n" + problems.join("\n") : "hepsi geçti");
process.exit(problems.length ? 1 : 0);
