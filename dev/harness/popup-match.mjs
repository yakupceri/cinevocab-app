// Popup'taki kelime eşleştirme oyunu: cihazda tutulan 6 kelimeyle oynanır; az kelimede sitedeki oyun açılır. Çıktı: dev/out/popup/oyun-*.png
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, "..", "out", "popup");
mkdirSync(OUT, { recursive: true });
const PORT = 8826, BASE = `http://127.0.0.1:${PORT}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const srv = spawn("python3", [join(HERE, "serve.py"), "--port", String(PORT)], { stdio: "ignore" });
const b = await chromium.launch({ channel: "chromium", headless: true });
const problems = [], ok = (c, m) => { console.log((c ? "  ✔ " : "  ✘ ") + m); if (!c) problems.push(m); };
const open = async (scene) => {
  const ctx = await b.newContext({ viewport: { width: 380, height: 584 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.errs = [];
  p.on("pageerror", (e) => p.errs.push(String(e)));
  await p.addInitScript(() => { window.__opened = []; });
  await p.goto(`${BASE}/popup.html?scene=${scene}&ui=tr&tab=yt`); await wait(600);
  await p.evaluate(() => { const o = chrome.tabs.create; chrome.tabs.create = (x) => { window.__opened.push(x.url); }; });
  await p.locator("#tabs [data-tab=practice]").click(); await wait(500);
  return p;
};
const tiles = (p) => p.evaluate(() => [...document.querySelectorAll(".mg-tile")].map((e) => ({ pair: e.dataset.pair, side: e.dataset.side })));
const matchOne = async (p) => { const id = await p.evaluate(() => document.querySelector(".mg-tile").dataset.pair);
  await p.locator(`.mg-tile[data-pair="${id}"][data-side="src"]`).click(); await p.locator(`.mg-tile[data-pair="${id}"][data-side="dst"]`).click(); await wait(150); };
try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(BASE + "/popup.html")).ok) break; } catch (e) {} await wait(150); }
  let p = await open("bank");
  ok(await p.locator("#mgCard").count() === 1, "pratik sekmesinde oyun kartı var");
  await p.screenshot({ path: join(OUT, "oyun-kart.png") });
  await p.locator("#mgCard").click(); await p.locator(".mg-tile").first().waitFor({ timeout: 4000 }); await wait(350);
  let ts = await tiles(p); const cnt = {}; ts.forEach((t) => (cnt[t.pair] = (cnt[t.pair] || 0) + 1));
  ok(ts.length === 12 && Object.values(cnt).every((n) => n === 2), "6 kelimeyle 12 taş, her taşın eşi tahtada");
  await p.screenshot({ path: join(OUT, "oyun-tahta.png") });
  await matchOne(p); await matchOne(p);
  ok((await p.locator("#mgScore").innerText()) === "30" && (await p.locator("#mgCombo").innerText()) === "x2", "iki doğru: 10+20 = 30, kombo x2");
  ok((await tiles(p)).length === 8, "eşleşen taşlar tahtadan kalktı");
  const [pa, pb] = await p.evaluate(() => { const a = document.querySelector('.mg-tile[data-side="src"]'), o = [...document.querySelectorAll('.mg-tile[data-side="dst"]')].find((x) => x.dataset.pair !== a.dataset.pair); return [a.dataset.pair, o.dataset.pair]; });
  await p.locator(`.mg-tile[data-pair="${pa}"][data-side="src"]`).click(); await p.locator(`.mg-tile[data-pair="${pb}"][data-side="dst"]`).click(); await wait(150);   // tahta her dokunuşta yeniden çizilir
  ok((await p.locator("#mgCombo").innerText()) === "–" && (await p.locator("#mgScore").innerText()) === "30" && (await tiles(p)).length === 8, "yanlış eş: kombo sıfır, puan ve taşlar aynı");
  const bankBefore = await p.evaluate(() => new Promise((r) => chrome.storage.local.get(["bank", "reviewDays"], (x) => r(JSON.stringify(x)))));
  for (let i = 0; i < 4; i++) await matchOne(p);
  await p.locator(".big").waitFor({ timeout: 4000 }); await wait(300);
  ok((await p.locator(".big").innerText()) === "130", "hepsi eşleşince tur biter: 30 + 10+20+30+40 = 130");
  ok((await p.locator(".mg-miss").count()) === 2, "karıştırılan iki kelime sonuçta listelenir");
  ok(bankBefore === await p.evaluate(() => new Promise((r) => chrome.storage.local.get(["bank", "reviewDays"], (x) => r(JSON.stringify(x))))), "oyun tekrar kutularını ve seriyi değiştirmedi");
  ok((await p.evaluate(() => new Promise((r) => chrome.storage.local.get("matchBest", (x) => r(x.matchBest))))) === 130, "en iyi puan cihazda saklandı");
  await p.screenshot({ path: join(OUT, "oyun-sonuc.png") });
  const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(over <= 1 && p.errs.length === 0, "taşma ve sayfa hatası yok" + (p.errs.length ? ": " + p.errs.join(" | ") : ""));
  await p.context().close();
  // notu olan kelimeler: karıştırılanlar sonuç ekranında notuyla birlikte "bir daha bak" satırında görünür
  p = await open("bank");
  await p.evaluate(() => new Promise((r) => chrome.storage.local.get("bank", (x) => { const b = x.bank; b["es>en"].forEach((i) => { i.n = "nota: " + i.w; }); chrome.storage.local.set({ bank: b }, r); })));
  await p.locator("#mgCard").click(); await p.locator(".mg-tile").first().waitFor({ timeout: 4000 }); await wait(350);
  ok((await p.locator(".pn").count()) === 0, "oyun sırasında (tahtada) not görünmez, ipucu olmasın");
  await matchOne(p); await matchOne(p);
  const [qa, qb] = await p.evaluate(() => { const a = document.querySelector('.mg-tile[data-side="src"]'), o = [...document.querySelectorAll('.mg-tile[data-side="dst"]')].find((x) => x.dataset.pair !== a.dataset.pair); return [a.dataset.pair, o.dataset.pair]; });
  await p.locator(`.mg-tile[data-pair="${qa}"][data-side="src"]`).click(); await p.locator(`.mg-tile[data-pair="${qb}"][data-side="dst"]`).click(); await wait(150);
  for (let i = 0; i < 4; i++) await matchOne(p);
  await p.locator(".big").waitFor({ timeout: 4000 }); await wait(300);
  const rows = await p.evaluate(() => [...document.querySelectorAll(".mg-miss")].map((r) => ({ word: r.querySelector("b").textContent, label: (r.querySelector(".pn-l") || {}).textContent || "", note: (r.querySelector(".pn-t") || {}).textContent || "" })));
  ok(rows.length === 2 && rows.every((r) => r.label === "Notun" && r.note === "nota: " + r.word), "sonuç ekranında karıştırılan iki kelimenin notu etiketle görünür: " + JSON.stringify(rows));
  await p.screenshot({ path: join(OUT, "oyun-sonuc-not.png") });
  const over2 = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(over2 <= 1 && p.errs.length === 0, "notlu sonuç ekranında taşma ve sayfa hatası yok" + (p.errs.length ? ": " + p.errs.join(" | ") : ""));
  await p.context().close();
  p = await open("on");                                                      // hiç tutulan kelime yok
  await p.locator("#mgCard").click(); await wait(500);
  const opened = await p.evaluate(() => window.__opened);
  ok(opened.length === 1 && /\/match\?src=es&dst=en$/.test(opened[0]), "kelime azken sitedeki oyun açılır: " + opened[0]);
  ok(await p.locator(".mg-tile").count() === 0 && p.errs.length === 0, "popup'ta boş tahta açılmaz, hata yok");
  await p.context().close();
} finally { await b.close(); srv.kill(); }
console.log(problems.length ? "SORUN:\n" + problems.join("\n") : "hepsi geçti");
process.exit(problems.length ? 1 : 0);
