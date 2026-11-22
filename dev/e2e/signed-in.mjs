// Giriş yapmış kullanıcı: Practice sekmesinde sunucu quiz'i + "Cümle alıştırması" girişi; cihazdaki kelimelerle boşluk doldurma açılıyor mu.
// Sunucu cevapları sahte (ağ yok). Çıktı: rapor + dev/out/e2e/g*.png
import { chromium } from "playwright";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = resolve(HERE, "..", "..", "extension"), OUT = resolve(HERE, "..", "out", "e2e");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (c, m) => console.log((c ? "  ✔ " : "  ✖ HATA: ") + m) || (c ? 0 : (process.exitCode = 1));
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "cv-e2e-")), {
  channel: "chromium", headless: true, viewport: { width: 380, height: 584 }, locale: "en-US",
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--host-resolver-rules=MAP cinevocab.up.railway.app 127.0.0.1"],
});
await ctx.route("https://cinevocab.up.railway.app/**", (r) => r.fulfill({ status: 404, contentType: "application/json", headers: cors, body: "{}" }));
const home = { username: "demo", avatar: "D", level: 3, streak: 4, words: 120, wins: 2, mastered: 10, new: 5, due: 6, pair: "es>en", pair_words: 120, xp_into: 40, xp_level: 100, xp_today: 20, starred: [],
  recent: [{ w: "a", t: "a1" }, { w: "b", t: "b1" }, { w: "c", t: "c1" }, { w: "d", t: "d1" }, { w: "e", t: "e1" }] };
await ctx.route("https://cinevocab.up.railway.app/api/ext/home*", (r) => r.fulfill({ status: 200, contentType: "application/json", headers: cors, body: JSON.stringify(home) }));
const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent("serviceworker", { timeout: 15000 }));
const extId = new URL(sw.url()).host;
for (const p of ctx.pages()) if (p.url().includes("welcome")) await p.close();

const day = await sw.evaluate(() => CVSrs.dayOf());
const L = "Lo más importante en la vida es tener amor propio", T = "The most important thing in life is to have self-love.";
const bank = { "es>en": [
  { w: "propio", t: "own", ts: 9, s: L, st: T, box: 1, due: day - 1, right: 1, wrong: 0 },
  { w: "amor", t: "love", ts: 8 }, { w: "vida", t: "life", ts: 7 }, { w: "mundo", t: "world", ts: 6 }, { w: "feliz", t: "happy", ts: 5 },
] };
await sw.evaluate((b) => chrome.storage.local.set({ src: "es", dst: "en", enabled: true, key: "test-key-not-real", bank: b }), bank);
await sleep(400);

const popup = await ctx.newPage();
await popup.goto(`chrome-extension://${extId}/popup.html`); await sleep(800);
await popup.locator('#tabs button[data-tab="practice"]').click(); await sleep(500);
const vp = popup.locator("#v-practice");
const t1 = (await vp.innerText()).replace(/\s+/g, " ");
console.log("Giriş yapmış Practice:", t1);
await popup.screenshot({ path: join(OUT, "g1-signed-practice.png") });
ok(/Quick round/.test(t1), "sunucu quiz'i (Quick round) hâlâ duruyor");
ok(/Sentence practice/.test(t1), "'Sentence practice' girişi görünüyor");
await vp.locator("button.opt2:has-text('Sentence practice')").click(); await sleep(500);
const t2 = (await vp.innerText()).replace(/\s+/g, " ");
console.log("Yerel başlangıç:", t2);
ok(/READY TO REVIEW\s*\d/i.test(t2), "cihazdaki alıştırma başlangıç ekranı açıldı");
ok(await vp.locator("button.link:has-text('Back')").count() === 1, "giriş yapmışa 'Back' bağlantısı var");
await popup.screenshot({ path: join(OUT, "g2-signed-local-start.png") });
await vp.locator("button.btn.p").click(); await sleep(500);
const cloze = await vp.locator(".cl").count();
ok(cloze === 1, "ilk soru boşluk doldurma (cümleli)");
await popup.screenshot({ path: join(OUT, "g3-signed-cloze.png") });
await vp.locator("button.btn.sm").click(); await sleep(400);   // ✕ ile çık
await vp.locator("button.link:has-text('Back')").click(); await sleep(400);
ok(/Quick round/.test((await vp.innerText()).replace(/\s+/g, " ")), "'Back' ile sunucu quiz ana ekranına dönüldü");
await ctx.close();
