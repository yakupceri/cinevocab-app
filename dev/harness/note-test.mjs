// Video üstünde kelimeye not: kelimeyi tut → "+ Not" → yaz → Enter. Not cihazdaki bankaya yazılır, sitenin klavye kısayolları tetiklenmez,
// popup'ın kelime listesinde görünür ve orada düzenlenir. Çıktı: dev/out/box/not-*.png
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url)), OUT = join(HERE, "..", "out", "box");
mkdirSync(OUT, { recursive: true });
const PORT = 8828, BASE = `http://127.0.0.1:${PORT}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const srv = spawn("python3", [join(HERE, "serve.py"), "--port", String(PORT)], { stdio: "ignore" });
const b = await chromium.launch({ channel: "chromium", headless: true });
const problems = [], ok = (c, m) => { console.log((c ? "  ✔ " : "  ✘ ") + m); if (!c) problems.push(m); };
const bank = (p) => p.evaluate(() => new Promise((r) => chrome.storage.local.get("bank", (x) => r((x.bank || {})["es>en"] || []))));
try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(BASE + "/popup.html")).ok) break; } catch (e) {} await wait(150); }
  const ctx = await b.newContext({ viewport: { width: 1100, height: 560 }, deviceScaleFactor: 2 });
  let p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
  await p.addInitScript(() => { window.__keys = []; document.addEventListener("keydown", (e) => window.__keys.push(e.key)); });   // "sitenin kısayol dinleyicisi"
  await p.goto(`${BASE}/__video.html?scene=on&line=0&kf=1`); await wait(2200);
  const chip = p.locator(".chip").filter({ hasText: "amor" }).first();
  ok(await p.locator("button.nb").count() === 0, "kelime tutulmadan not düğmesi yok");
  await chip.click(); await wait(500);
  ok(await p.locator("button.nb").count() === 1, "kelime tutulunca başlıkta '+ Not' çıkar");
  await p.locator("button.nb").click(); await wait(300);
  const inp = p.locator(".note input");
  ok(await inp.isVisible() && (await inp.getAttribute("placeholder")).includes("amor"), "not kutusu açıldı, hangi kelime için olduğu yazıyor");
  await p.screenshot({ path: join(OUT, "not-yaziyor.png"), clip: { x: 0, y: 0, width: 1100, height: 560 } });
  await inp.pressSequentially("k f ünlü sahne"); await wait(100);
  ok((await p.evaluate(() => window.__keys.length)) === 0, "yazarken tuşlar sayfaya sızmadı (k, f, boşluk kısayolları tetiklenmez)");
  await wait(13000);
  ok(await inp.isVisible(), "yazarken kutu kendiliğinden kapanmadı (12 sn sonra hâlâ açık)");
  await inp.press("Enter"); await wait(400);
  const it = (await bank(p)).find((x) => x.w === "amor");
  ok(it && it.n === "k f ünlü sahne", "not cihazdaki kelimeye yazıldı: " + JSON.stringify(it && it.n));
  ok(!(await inp.isVisible()), "kaydedince not kutusu kapandı");
  await p.locator("button.nb").click(); await wait(300);
  ok((await inp.inputValue()) === "k f ünlü sahne", "tekrar açınca eski not geliyor");
  await inp.press("Escape"); await wait(200);
  ok(!(await inp.isVisible()) && (await bank(p)).find((x) => x.w === "amor").n === "k f ünlü sahne", "Esc vazgeçer, not değişmez");
  await chip.click(); await wait(400);
  ok(await p.locator("button.nb").count() === 0 && !(await bank(p)).some((x) => x.w === "amor"), "kelime bırakılınca not düğmesi ve kelime gider");
  ok(errs.length === 0, "sayfa hatası yok" + (errs.length ? ": " + errs.join(" | ") : ""));
  await p.close();
  // popup: hesapsız kelime listesinde not satırı
  p = await ctx.newPage(); await p.setViewportSize({ width: 380, height: 584 }); const e2 = []; p.on("pageerror", (e) => e2.push(String(e)));
  await p.goto(`${BASE}/popup.html?scene=bank&ui=tr&tab=yt`); await wait(600);
  await p.locator("#tabs [data-tab=words]").click(); await wait(400);
  const first = p.locator(".wl li").first();
  ok((await first.locator("button.nt").innerText()) === "+ Not", "popup: notu olmayan kelimede '+ Not'");
  await first.locator("button.nt").click(); await p.locator(".nt-in").fill("kendi notum"); await p.locator(".nt-in").press("Enter"); await wait(400);
  ok((await p.locator(".wl li").first().locator("button.nt").innerText()) === "kendi notum", "popup: not kaydedildi ve listede görünüyor");
  await p.screenshot({ path: join(OUT, "not-popup.png") });
  ok(e2.length === 0, "popup sayfa hatası yok" + (e2.length ? ": " + e2.join(" | ") : ""));
} finally { await b.close(); srv.kill(); }
console.log(problems.length ? "SORUN:\n" + problems.join("\n") : "hepsi geçti");
process.exit(problems.length ? 1 : 0);
