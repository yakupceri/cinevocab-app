// Reklam v2 için GERÇEK arayüz görselleri üretir (dev/out/ad2/assets/*.png + coords.json):
//  - videonun üstündeki kutu: gerçek content.js, deneme ortamında (sahte chrome API, sahte "film" sahnesi)
//  - popup soruları: gerçek eklenti, gerçek Chromium, 3x çözünürlük
// Kullanım: cd dev && node harness/ad2-assets.mjs        -> İngilizce (es>en)  dev/out/ad2/assets
//           cd dev && node harness/ad2-assets.mjs tr     -> Türkçe (en>tr, Türkçe arayüz)  dev/out/ad2/assets-tr
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = resolve(HERE, "..", "..", "extension");
const TR = process.argv[2] === "tr";
const CFG = TR
  ? { dir: "assets-tr", locale: "tr-TR", ui: "tr", src: "en", dst: "tr", line: 3, kw: "lie", kwT: "yalan", ep: "YouTube · Dizi sahnesi",
      LINE: "You told me it was a lie.", TRN: "Bana bunun bir yalan olduğunu söyledin.", tline: 4, tkw: "believe",
      others: [["believe", "inanmak"], ["trust", "güvenmek"], ["truth", "gerçek"], ["secret", "sır"], ["promise", "söz"], ["future", "gelecek"]] }
  : { dir: "assets", locale: "en-US", ui: "en", src: "es", dst: "en", line: 0, kw: "propio", kwT: "own", ep: "Easy Spanish 344",
      LINE: "Lo más importante en la vida es tener amor propio", TRN: "The most important thing in life is to have self-love.", tline: 5, tkw: "creas",
      others: [["amor", "love"], ["importante", "important"], ["vida", "life"], ["mundo", "world"], ["feliz", "happy"], ["pregunta", "question"]] };
const PAIR = CFG.src + ">" + CFG.dst;
const OUT = resolve(HERE, "..", "out", "ad2", CFG.dir);
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
  await p.goto(`http://127.0.0.1:${PORT}/__video.html?scene=new&ui=${CFG.ui}&line=${CFG.line}&src=${CFG.src}&dst=${CFG.dst}&noask=1`); await sleep(500);
  await p.screenshot({ path: join(OUT, "stage.png") });
  await p.goto(`http://127.0.0.1:${PORT}/__video.html?scene=on&ui=${CFG.ui}&line=${CFG.line}&bs=1.8&kf=1&src=${CFG.src}&dst=${CFG.dst}`);
  await p.locator(".chip").first().waitFor(); await sleep(900);
  await p.mouse.move(980, 20); await sleep(900);
  await p.screenshot({ path: join(OUT, "chips.png") });
  coords.chips = {};
  for (const el of await p.locator(".chip").all()) { const w = await el.getAttribute("data-w"), bb = await el.boundingBox(); coords.chips[w] = bb; }
  await p.mouse.move(500, 520); await sleep(900); // fare kutunun üstünde: araç çubuğu, kesikli çerçeve ve tutamaçlar görünür
  await p.screenshot({ path: join(OUT, "chips-tools.png") });
  await p.mouse.move(980, 20); await sleep(500);
  await p.locator(`.chip[data-w="${CFG.kw}"]`).click(); await p.mouse.move(980, 20); await sleep(900);
  await p.screenshot({ path: join(OUT, "kept.png") });
  // YouTube kapağı için: üç kelimelik çeviri kutusu (ilk üç kelime, ortadaki ★ vurgulu)
  await p.goto(`http://127.0.0.1:${PORT}/__video.html?scene=on&ui=${CFG.ui}&line=${CFG.tline}&bs=1.8&kf=1&src=${CFG.src}&dst=${CFG.dst}`);
  await p.locator(".chip").first().waitFor(); await sleep(900);
  await p.locator(`.chip[data-w="${CFG.tkw}"]`).click(); await p.mouse.move(980, 20); await sleep(900);
  await p.screenshot({ path: join(OUT, "thumb-kept.png") });
  { const cs = await p.locator(".chip").all(), bb = [];
    for (const c of cs.slice(0, 3)) bb.push(await c.boundingBox());
    const kb = await p.locator(`.chip[data-w="${CFG.tkw}"]`).boundingBox();
    const x0 = bb[0].x - 16, x1 = bb[2].x + bb[2].width + 16, y0 = Math.min(...bb.map((b) => b.y)) - 7, y1 = Math.max(...bb.map((b) => b.y + b.height)) + 14;
    writeFileSync(join(OUT, "thumb.json"), JSON.stringify({ x: x0 * 2, y: y0 * 2, w: (x1 - x0) * 2, h: (y1 - y0) * 2, chip: { x: kb.x * 2, y: kb.y * 2, w: kb.width * 2, h: kb.height * 2 }, n: cs.length })); }
  coords.view = { w: 1000, h: 700 };
  await b.close();
}

// ---- B. popup (gerçek eklenti) ----
{
  const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "cv-ad2-")), {
    channel: "chromium", headless: true, viewport: { width: 380, height: 584 }, deviceScaleFactor: 3, locale: CFG.locale, colorScheme: "dark",
    args: [`--lang=${CFG.locale}`, `--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--host-resolver-rules=MAP cinevocab.up.railway.app 127.0.0.1"],
  });
  await ctx.route("https://cinevocab.up.railway.app/**", (r) => r.fulfill({ status: 401, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: '{"detail":"yok"}' }));
  const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent("serviceworker", { timeout: 15000 }));
  const extId = new URL(sw.url()).host;
  for (const pg of ctx.pages()) if (pg.url().includes("welcome")) await pg.close();
  const day = await sw.evaluate(() => CVSrs.dayOf());
  const LINE = CFG.LINE, TRN = CFG.TRN;
  const mk = (box, due) => ({ [PAIR]: [
    { w: CFG.kw, t: CFG.kwT, ts: 9, ep: CFG.ep, vt: 42, s: LINE, st: TRN, box, due, right: box, wrong: 0 },
    ...CFG.others.map(([w, t], i) => ({ w, t, ts: 8 - i, box: 3, due: day + 20 })),
  ] });
  const open = async (bank, tabName) => {
    await sw.evaluate(([b, c]) => chrome.storage.local.set({ src: c.src, dst: c.dst, enabled: true, bank: b, reviewDays: [] }), [bank, CFG]); await sleep(300);
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
  await pg.locator(`#v-practice .ans:text-is("${CFG.kw}")`).click(); await sleep(260);
  await shot(pg, "p-cloze-ok.png");
  await pg.close();
  // 2. kutu: yazarak, doğru -> öğrenildi anı
  pg = await open(mk(2, day), "practice");
  await pg.locator("#v-practice button.btn.p").click(); await sleep(500);
  await shot(pg, "p-type.png");
  await pg.locator("#v-practice input").fill(CFG.kw); await pg.locator("#v-practice button.btn.p").click(); await sleep(1500); // animasyon bitsin; hareketi reklamda biz veriyoruz
  await shot(pg, "p-learned.png");
  await pg.close();
  // 3. kelimeler sekmesi (cihazdaki liste)
  const W7 = [[CFG.kw, CFG.kwT], ...CFG.others];
  const wb = { [PAIR]: W7.map(([w, t], i) => ({ w, t, ts: 20 - i, ep: "YouTube · " + (TR ? "Dizi sahnesi" : "Easy Spanish 344"), vt: 42 - i * 4, s: i === 0 ? LINE : undefined })) };
  pg = await open(wb, "words"); await sleep(300);
  await shot(pg, "p-words.png"); await pg.close();
  // 4. seri: 5 gün üst üste çalışılmış, öğrenilen/öğrenilen/yeni karışık
  await sw.evaluate(([b, d, c]) => chrome.storage.local.set({ src: c.src, dst: c.dst, enabled: true, bank: b, reviewDays: [d - 4, d - 3, d - 2, d - 1, d] }),
    [{ [PAIR]: [[CFG.kw, CFG.kwT], ...CFG.others].map(([w, t], i) => ({ w, t, ts: 9 - i, ...[{ box: 4, due: day + 12 }, { box: 3, due: day + 7 }, { box: 3, due: day + 6 }, { box: 2, due: day + 2 }, { box: 1, due: day }, {}, {}][i] })) }, day, CFG]);
  await sleep(300);
  pg = await ctx.newPage(); await pg.goto(`chrome-extension://${extId}/popup.html`); await sleep(600);
  await pg.locator('#tabs button[data-tab="practice"]').click(); await sleep(500);
  await shot(pg, "p-start-streak.png"); await pg.close();
  await ctx.close();
}
writeFileSync(join(OUT, "coords.json"), JSON.stringify(coords, null, 1));
srv.kill();
console.log("hazır:", OUT);
