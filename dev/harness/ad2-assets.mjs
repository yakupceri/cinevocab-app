// Reklam v2 için GERÇEK arayüz görselleri üretir (dev/out/ad2/assets/*.png + coords.json):
//  - videonun üstündeki kutu: gerçek content.js, deneme ortamında (sahte chrome API, sahte "film" sahnesi)
//  - popup soruları: gerçek eklenti, gerçek Chromium, 3x çözünürlük
// Kullanım: cd dev && node harness/ad2-assets.mjs
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = resolve(HERE, "..", "..", "extension");
const OUT = resolve(HERE, "..", "out", "ad2", "assets");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 8830;
const srv = spawn("python3", [join(HERE, "serve.py"), "--port", String(PORT)], { stdio: "ignore", env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } });
await sleep(1200);
const coords = {};

// ---- A. video kutusu ----
{
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 2, colorScheme: "dark" });
  const p = await c.newPage();
  await p.goto(`http://127.0.0.1:${PORT}/__video.html?scene=new&ui=en&line=0`); await sleep(500);
  await p.screenshot({ path: join(OUT, "stage.png") });
  await p.goto(`http://127.0.0.1:${PORT}/__video.html?scene=on&ui=en&line=0&bs=1.8&kf=1`);
  await p.locator(".chip").first().waitFor(); await sleep(900);
  await p.mouse.move(980, 20); await sleep(900);
  await p.screenshot({ path: join(OUT, "chips.png") });
  coords.chips = {};
  for (const el of await p.locator(".chip").all()) { const w = await el.getAttribute("data-w"), bb = await el.boundingBox(); coords.chips[w] = bb; }
  await p.mouse.move(500, 520); await sleep(900); // fare kutunun üstünde: araç çubuğu, kesikli çerçeve ve tutamaçlar görünür
  await p.screenshot({ path: join(OUT, "chips-tools.png") });
  await p.mouse.move(980, 20); await sleep(500);
  await p.locator('.chip[data-w="propio"]').click(); await p.mouse.move(980, 20); await sleep(900);
  await p.screenshot({ path: join(OUT, "kept.png") });
  coords.view = { w: 1000, h: 700 };
  await b.close();
}

// ---- B. popup (gerçek eklenti) ----
{
  const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "cv-ad2-")), {
    channel: "chromium", headless: true, viewport: { width: 380, height: 584 }, deviceScaleFactor: 3, locale: "en-US", colorScheme: "dark",
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--host-resolver-rules=MAP cinevocab.up.railway.app 127.0.0.1"],
  });
  await ctx.route("https://cinevocab.up.railway.app/**", (r) => r.fulfill({ status: 401, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: '{"detail":"yok"}' }));
  const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent("serviceworker", { timeout: 15000 }));
  const extId = new URL(sw.url()).host;
  for (const pg of ctx.pages()) if (pg.url().includes("welcome")) await pg.close();
  const day = await sw.evaluate(() => CVSrs.dayOf());
  const LINE = "Lo más importante en la vida es tener amor propio", TRN = "The most important thing in life is to have self-love.";
  const mk = (box, due) => ({ "es>en": [
    { w: "propio", t: "own", ts: 9, ep: "Easy Spanish 344", vt: 42, s: LINE, st: TRN, box, due, right: box, wrong: 0 },
    { w: "amor", t: "love", ts: 8, box: 3, due: day + 20 }, { w: "importante", t: "important", ts: 7, box: 3, due: day + 20 },
    { w: "vida", t: "life", ts: 6, box: 3, due: day + 20 }, { w: "mundo", t: "world", ts: 5, box: 3, due: day + 20 }, { w: "feliz", t: "happy", ts: 4, box: 3, due: day + 20 },
  ] });
  const open = async (bank, tabName) => {
    await sw.evaluate((b) => chrome.storage.local.set({ src: "es", dst: "en", enabled: true, bank: b, reviewDays: [] }), bank); await sleep(300);
    const pg = await ctx.newPage(); await pg.goto(`chrome-extension://${extId}/popup.html`); await sleep(600);
    await pg.locator(`#tabs button[data-tab="${tabName}"]`).click(); await sleep(400);
    return pg;
  };
  const shot = (pg, name) => pg.screenshot({ path: join(OUT, name) });
  // 1. kutu: boşluk doldurma, şıklı
  let pg = await open(mk(1, day - 1), "practice");
  await shot(pg, "p-start.png");
  await pg.locator("#v-practice button.btn.p").click(); await sleep(500);
  await shot(pg, "p-cloze.png");
  coords.opts = await pg.locator("#v-practice .ans").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { t: e.textContent, x: r.x, y: r.y, w: r.width, h: r.height }; }));
  await pg.locator('#v-practice .ans:text-is("propio")').click(); await sleep(260);
  await shot(pg, "p-cloze-ok.png");
  await pg.close();
  // 2. kutu: yazarak, doğru -> öğrenildi anı
  pg = await open(mk(2, day), "practice");
  await pg.locator("#v-practice button.btn.p").click(); await sleep(500);
  await shot(pg, "p-type.png");
  await pg.locator("#v-practice input").fill("propio"); await pg.locator("#v-practice button.btn.p").click(); await sleep(1500); // animasyon bitsin; hareketi reklamda biz veriyoruz
  await shot(pg, "p-learned.png");
  await pg.close();
  // 3. kelimeler sekmesi (cihazdaki liste)
  const W7 = [["propio", "own"], ["amor", "love"], ["importante", "important"], ["vida", "life"], ["mundo", "world"], ["feliz", "happy"], ["pregunta", "question"]];
  const wb = { "es>en": W7.map(([w, t], i) => ({ w, t, ts: 20 - i, ep: "YouTube · Easy Spanish 344", vt: 42 - i * 4, s: i === 0 ? LINE : undefined })) };
  pg = await open(wb, "words"); await sleep(300);
  await shot(pg, "p-words.png"); await pg.close();
  // 4. seri: 5 gün üst üste çalışılmış, öğrenilen/öğrenilen/yeni karışık
  await sw.evaluate(([b, d]) => chrome.storage.local.set({ src: "es", dst: "en", enabled: true, bank: b, reviewDays: [d - 4, d - 3, d - 2, d - 1, d] }),
    [{ "es>en": [
      { w: "propio", t: "own", ts: 9, box: 4, due: day + 12 }, { w: "amor", t: "love", ts: 8, box: 3, due: day + 7 }, { w: "importante", t: "important", ts: 7, box: 3, due: day + 6 },
      { w: "vida", t: "life", ts: 6, box: 2, due: day + 2 }, { w: "mundo", t: "world", ts: 5, box: 1, due: day }, { w: "feliz", t: "happy", ts: 4 }, { w: "pregunta", t: "question", ts: 3 },
    ] }, day]);
  await sleep(300);
  pg = await ctx.newPage(); await pg.goto(`chrome-extension://${extId}/popup.html`); await sleep(600);
  await pg.locator('#tabs button[data-tab="practice"]').click(); await sleep(500);
  await shot(pg, "p-start-streak.png"); await pg.close();
  await ctx.close();
}
writeFileSync(join(OUT, "coords.json"), JSON.stringify(coords, null, 1));
srv.kill();
console.log("hazır:", OUT);
